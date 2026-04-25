import asyncio
import json
import logging
import os
import time

from confluent_kafka import Consumer
from confluent_kafka.admin import AdminClient, NewTopic
from fastapi import Depends, FastAPI
from sqlalchemy import bindparam, func, text
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, get_db, stratification_engine
from models import RawEngagement, RawMessage
from schemas import (
    RawEngagementEvent,
    RawMessageEvent,
    RegionalCoverageResponse,
    RegionalCoverageRow,
    RoiResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("analytics-service")

app = FastAPI(title="analytics-service", version="1.0.0")

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
MESSAGE_SENT_TOPIC = os.getenv("MESSAGE_SENT_TOPIC", "message.sent")
USER_ENGAGED_TOPIC = os.getenv("USER_ENGAGED_TOPIC", "user.engaged")
CONSUMER_GROUP = os.getenv("KAFKA_CONSUMER_GROUP", "analytics-service-group")

consumer = Consumer(
    {
        "bootstrap.servers": KAFKA_BOOTSTRAP,
        "group.id": CONSUMER_GROUP,
        "auto.offset.reset": "earliest",
    }
)
admin_client = AdminClient({"bootstrap.servers": KAFKA_BOOTSTRAP})

consumer_task: asyncio.Task | None = None
stop_event = asyncio.Event()


def _poll_once():
    return consumer.poll(1.0)


def _persist_message(payload: dict) -> None:
    event = RawMessageEvent(**payload)
    db = SessionLocal()
    try:
        db.add(RawMessage(patient_id=event.patient_id, campaign_id=event.campaign_id))
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to persist RawMessage")
    finally:
        db.close()


def _persist_engagement(payload: dict) -> None:
    event = RawEngagementEvent(**payload)
    db = SessionLocal()
    try:
        db.add(
            RawEngagement(
                patient_id=event.patient_id,
                campaign_id=event.campaign_id,
                action=event.action,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to persist RawEngagement")
    finally:
        db.close()


async def _consume_loop():
    consumer.subscribe([MESSAGE_SENT_TOPIC, USER_ENGAGED_TOPIC])
    logger.info("Subscribed to topics: %s, %s", MESSAGE_SENT_TOPIC, USER_ENGAGED_TOPIC)

    while not stop_event.is_set():
        msg = await asyncio.to_thread(_poll_once)
        if msg is None:
            continue
        if msg.error():
            logger.error("Kafka consume error: %s", msg.error())
            continue

        topic = msg.topic()
        try:
            payload = json.loads(msg.value().decode("utf-8"))
            if topic == MESSAGE_SENT_TOPIC:
                await asyncio.to_thread(_persist_message, payload)
            elif topic == USER_ENGAGED_TOPIC:
                await asyncio.to_thread(_persist_engagement, payload)
        except Exception:
            logger.exception("Failed processing incoming event")


@app.on_event("startup")
async def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    for attempt in range(1, 21):
        try:
            existing_topics = admin_client.list_topics(timeout=10).topics
            topics_to_create = []
            for topic_name in [MESSAGE_SENT_TOPIC, USER_ENGAGED_TOPIC]:
                if topic_name not in existing_topics:
                    topics_to_create.append(NewTopic(topic_name, num_partitions=1, replication_factor=1))
            if topics_to_create:
                futures = admin_client.create_topics(topics_to_create)
                for _, future in futures.items():
                    try:
                        future.result()
                    except Exception as exc:
                        if "TOPIC_ALREADY_EXISTS" not in str(exc):
                            raise
            break
        except Exception:
            if attempt == 20:
                raise
            logger.warning("Kafka topics not ready yet for analytics-service (attempt %s/20)", attempt)
            time.sleep(2)
    global consumer_task
    consumer_task = asyncio.create_task(_consume_loop())


@app.on_event("shutdown")
async def shutdown_event() -> None:
    stop_event.set()
    if consumer_task is not None:
        await consumer_task
    consumer.close()


@app.get("/roi/{campaign_id}", response_model=RoiResponse)
def get_roi(campaign_id: int, db: Session = Depends(get_db)):
    total_messages = (
        db.query(func.count(RawMessage.id))
        .filter(RawMessage.campaign_id == campaign_id)
        .scalar()
        or 0
    )
    total_bookings = (
        db.query(func.count(RawEngagement.id))
        .filter(
            RawEngagement.campaign_id == campaign_id,
            RawEngagement.action == "booked",
        )
        .scalar()
        or 0
    )

    conversion_rate = (float(total_bookings) / float(total_messages) * 100.0) if total_messages else 0.0

    return RoiResponse(
        campaign_id=campaign_id,
        total_messages=int(total_messages),
        total_bookings=int(total_bookings),
        conversion_rate=round(conversion_rate, 2),
    )


@app.get("/coverage/regional", response_model=RegionalCoverageResponse)
def get_regional_coverage(campaign_id: int, db: Session = Depends(get_db)):
    raw_message_rows = (
        db.query(RawMessage.patient_id)
        .filter(RawMessage.campaign_id == campaign_id)
        .all()
    )
    raw_booking_rows = (
        db.query(RawEngagement.patient_id)
        .filter(
            RawEngagement.campaign_id == campaign_id,
            RawEngagement.action == "booked",
        )
        .all()
    )

    message_patient_ids = [row.patient_id for row in raw_message_rows]
    booking_patient_ids = [row.patient_id for row in raw_booking_rows]
    if not message_patient_ids:
        return RegionalCoverageResponse(campaign_id=campaign_id, regions=[])

    region_query = (
        text(
            """
            SELECT region, COUNT(*) AS total
            FROM patients
            WHERE id IN :patient_ids
            GROUP BY region
            ORDER BY total DESC, region ASC
            """
        )
        .bindparams(bindparam("patient_ids", expanding=True))
    )

    message_regions = {}
    booking_regions = {}
    with stratification_engine.connect() as conn:
        for row in conn.execute(region_query, {"patient_ids": message_patient_ids}):
            message_regions[row.region] = int(row.total)
        if booking_patient_ids:
            for row in conn.execute(region_query, {"patient_ids": booking_patient_ids}):
                booking_regions[row.region] = int(row.total)

    region_names = sorted(message_regions.keys())
    rows = []
    for region_name in region_names:
        total_messages = message_regions.get(region_name, 0)
        total_bookings = booking_regions.get(region_name, 0)
        conversion_rate = (float(total_bookings) / float(total_messages) * 100.0) if total_messages else 0.0
        rows.append(
            RegionalCoverageRow(
                region=region_name,
                total_messages=total_messages,
                total_bookings=total_bookings,
                conversion_rate=round(conversion_rate, 2),
            )
        )

    return RegionalCoverageResponse(campaign_id=campaign_id, regions=rows)


@app.get("/health")
def health():
    return {"status": "ok", "service": "analytics-service"}
