import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone

from confluent_kafka import Consumer, Producer
from confluent_kafka.admin import AdminClient, NewTopic
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import CommunicationPreference, MessageTemplate
from schemas import (
    AudienceGeneratedEvent,
    CommunicationPreferenceRead,
    CommunicationPreferenceUpsert,
    MessageTemplateRead,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("communication-service")

app = FastAPI(title="communication-service", version="1.0.0")

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
AUDIENCE_TOPIC = os.getenv("AUDIENCE_TOPIC", "audience.generated")
MESSAGE_SENT_TOPIC = os.getenv("MESSAGE_SENT_TOPIC", "message.sent")
CONSUMER_GROUP = os.getenv("KAFKA_CONSUMER_GROUP", "communication-service-group")

producer = Producer({"bootstrap.servers": KAFKA_BOOTSTRAP})
admin_client = AdminClient({"bootstrap.servers": KAFKA_BOOTSTRAP})
DEFAULT_TEMPLATES = [
    {
        "name": "vaccination_reminder",
        "content": "Protect your health with your recommended prevention appointment.",
    },
    {
        "name": "screening_follow_up",
        "content": "A screening opportunity is available for your age and risk profile.",
    },
    {
        "name": "healthy_lifestyle_prompt",
        "content": "Small prevention steps today can improve long-term community health.",
    },
]
consumer = Consumer(
    {
        "bootstrap.servers": KAFKA_BOOTSTRAP,
        "group.id": CONSUMER_GROUP,
        "auto.offset.reset": "earliest",
    }
)

consumer_task: asyncio.Task | None = None
stop_event = asyncio.Event()


def _ensure_topics(max_attempts: int = 20, delay_seconds: int = 2) -> None:
    for attempt in range(1, max_attempts + 1):
        try:
            existing_topics = admin_client.list_topics(timeout=10).topics
            topics_to_create = []
            for topic_name in [AUDIENCE_TOPIC, MESSAGE_SENT_TOPIC]:
                if topic_name not in existing_topics:
                    topics_to_create.append(NewTopic(topic_name, num_partitions=1, replication_factor=1))

            if topics_to_create:
                futures = admin_client.create_topics(topics_to_create)
                for topic_name, future in futures.items():
                    try:
                        future.result()
                        logger.info("Created Kafka topic: %s", topic_name)
                    except Exception as exc:
                        if "TOPIC_ALREADY_EXISTS" not in str(exc):
                            raise
            return
        except Exception:
            if attempt == max_attempts:
                raise
            logger.warning("Kafka topics not ready yet for communication-service (attempt %s/%s)", attempt, max_attempts)
            time.sleep(delay_seconds)


def _delivery_report(err, msg):
    if err is not None:
        logger.error("Kafka delivery failed: %s", err)


def _poll_once():
    return consumer.poll(1.0)


def _send_messages(event: AudienceGeneratedEvent) -> None:
    for patient_id in event.patient_ids:
        logger.info("Sending Moroccan validated message to patient %s", patient_id)
        payload = {
            "patient_id": patient_id,
            "campaign_id": event.campaign_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        producer.produce(
            MESSAGE_SENT_TOPIC,
            value=json.dumps(payload).encode("utf-8"),
            callback=_delivery_report,
        )
        producer.poll(0)
    producer.flush(5)


async def _consume_loop():
    consumer.subscribe([AUDIENCE_TOPIC])
    logger.info("Subscribed to topic: %s", AUDIENCE_TOPIC)
    while not stop_event.is_set():
        msg = await asyncio.to_thread(_poll_once)
        if msg is None:
            continue
        if msg.error():
            logger.error("Kafka consume error: %s", msg.error())
            continue

        try:
            payload = json.loads(msg.value().decode("utf-8"))
            event = AudienceGeneratedEvent(**payload)
            await asyncio.to_thread(_send_messages, event)
        except Exception:
            logger.exception("Failed processing audience.generated event")


@app.on_event("startup")
async def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_topics()
    db = next(get_db())
    try:
        if db.query(MessageTemplate.id).count() == 0:
            db.add_all([MessageTemplate(**template) for template in DEFAULT_TEMPLATES])
            db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to seed communication templates")
        raise
    finally:
        db.close()
    global consumer_task
    consumer_task = asyncio.create_task(_consume_loop())


@app.on_event("shutdown")
async def shutdown_event() -> None:
    stop_event.set()
    if consumer_task is not None:
        await consumer_task
    consumer.close()
    producer.flush(5)


@app.get("/health")
def health():
    return {"status": "ok", "service": "communication-service"}


@app.get("/templates", response_model=list[MessageTemplateRead])
def list_templates(db: Session = Depends(get_db)):
    return db.query(MessageTemplate).order_by(MessageTemplate.id.asc()).all()


@app.get("/preferences/{patient_id}", response_model=CommunicationPreferenceRead)
def get_preference(patient_id: int, db: Session = Depends(get_db)):
    preference = (
        db.query(CommunicationPreference)
        .filter(CommunicationPreference.patient_id == patient_id)
        .first()
    )
    if preference is None:
        preference = CommunicationPreference(patient_id=patient_id, channel="SMS")
        db.add(preference)
        db.commit()
        db.refresh(preference)
    return preference


@app.put("/preferences/{patient_id}", response_model=CommunicationPreferenceRead)
def upsert_preference(
    patient_id: int,
    payload: CommunicationPreferenceUpsert,
    db: Session = Depends(get_db),
):
    preference = (
        db.query(CommunicationPreference)
        .filter(CommunicationPreference.patient_id == patient_id)
        .first()
    )
    if preference is None:
        preference = CommunicationPreference(patient_id=patient_id, channel=payload.channel)
        db.add(preference)
    else:
        preference.channel = payload.channel

    try:
        db.commit()
        db.refresh(preference)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not save communication preference: {exc}")
    return preference
