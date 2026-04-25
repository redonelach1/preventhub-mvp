import json
import logging
import os
import time
from datetime import datetime, timezone

from confluent_kafka import Producer
from confluent_kafka.admin import AdminClient, NewTopic
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import EngagementAction, TrackingEvent
from schemas import QuickTrackRequest, TrackingEventCreate, TrackingEventRead

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("engagement-service")

app = FastAPI(title="engagement-service", version="1.0.0")

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
USER_ENGAGED_TOPIC = os.getenv("USER_ENGAGED_TOPIC", "user.engaged")
producer = Producer({"bootstrap.servers": KAFKA_BOOTSTRAP})
admin_client = AdminClient({"bootstrap.servers": KAFKA_BOOTSTRAP})


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    for attempt in range(1, 21):
        try:
            existing_topics = admin_client.list_topics(timeout=10).topics
            if USER_ENGAGED_TOPIC not in existing_topics:
                futures = admin_client.create_topics([NewTopic(USER_ENGAGED_TOPIC, num_partitions=1, replication_factor=1)])
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
            logger.warning("Kafka topic not ready yet for engagement-service (attempt %s/20)", attempt)
            time.sleep(2)


def _delivery_report(err, msg):
    if err is not None:
        logger.error("Kafka delivery failed: %s", err)


def _publish_user_engaged(event: TrackingEventCreate) -> None:
    payload = {
        "patient_id": event.patient_id,
        "campaign_id": event.campaign_id,
        "action": event.action.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    producer.produce(
        USER_ENGAGED_TOPIC,
        value=json.dumps(payload).encode("utf-8"),
        callback=_delivery_report,
    )
    producer.poll(0)
    producer.flush(5)


@app.post("/track", response_model=TrackingEventRead, status_code=status.HTTP_201_CREATED)
def track_event(payload: TrackingEventCreate, db: Session = Depends(get_db)):
    record = TrackingEvent(
        patient_id=payload.patient_id,
        campaign_id=payload.campaign_id,
        action=payload.action,
    )
    db.add(record)
    try:
        db.commit()
        db.refresh(record)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not persist tracking event: {exc}")

    try:
        _publish_user_engaged(payload)
    except Exception as exc:
        logger.exception("Failed publishing user.engaged")
        raise HTTPException(status_code=500, detail=f"Event persisted but Kafka publish failed: {exc}")

    return record


@app.post("/track/click", response_model=TrackingEventRead, status_code=status.HTTP_201_CREATED)
def track_click(payload: QuickTrackRequest, db: Session = Depends(get_db)):
    return track_event(
        TrackingEventCreate(
            patient_id=payload.patient_id,
            campaign_id=payload.campaign_id,
            action=EngagementAction.clicked,
        ),
        db,
    )


@app.post("/track/adherence", response_model=TrackingEventRead, status_code=status.HTTP_201_CREATED)
def track_adherence(payload: QuickTrackRequest, db: Session = Depends(get_db)):
    return track_event(
        TrackingEventCreate(
            patient_id=payload.patient_id,
            campaign_id=payload.campaign_id,
            action=EngagementAction.booked,
        ),
        db,
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "engagement-service"}
