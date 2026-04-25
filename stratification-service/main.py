import json
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import List

import numpy as np
from confluent_kafka import Producer
from confluent_kafka.admin import AdminClient, NewTopic
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import insert
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, get_db
from models import Patient
from schemas import StratifyRequest, StratifyResponse

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
AUDIENCE_TOPIC = os.getenv("AUDIENCE_TOPIC", "audience.generated")
producer = Producer({"bootstrap.servers": KAFKA_BOOTSTRAP})
admin_client = AdminClient({"bootstrap.servers": KAFKA_BOOTSTRAP})

REGIONS = [
    "Casablanca-Settat",
    "Rabat-Salé-Kénitra",
    "Marrakech-Safi",
    "Fès-Meknès",
    "Tanger-Tétouan-Al Hoceima",
    "Souss-Massa",
    "Béni Mellal-Khénifra",
    "L'Oriental",
    "Drâa-Tafilalet",
    "Guelmim-Oued Noun",
    "Laâyoune-Sakia El Hamra",
    "Dakhla-Oued Ed-Dahab",
]
REGION_WEIGHTS = [0.20, 0.14, 0.13, 0.12, 0.10, 0.08, 0.07, 0.07, 0.04, 0.02, 0.02, 0.01]
AGE_GROUPS = [(0, 14), (15, 24), (25, 59), (60, 90)]
AGE_GROUP_WEIGHTS = [0.26, 0.16, 0.46, 0.12]
MILIEUX = ["Urbain", "Rural"]
MILIEU_WEIGHTS = [0.63, 0.37]
RISK_LEVELS = ["Low", "Medium", "High"]
RISK_LEVEL_WEIGHTS = [0.70, 0.20, 0.10]
PATIENT_SEED_COUNT = 5000

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stratification-service")


def _seed_patients_if_needed() -> None:
    db = SessionLocal()
    try:
        existing = db.query(Patient.id).first()
        if existing is not None:
            logger.info("Patient seed skipped because records already exist")
            return

        rng = np.random.default_rng(42)
        chosen_groups = rng.choice(len(AGE_GROUPS), size=PATIENT_SEED_COUNT, p=AGE_GROUP_WEIGHTS)
        ages = [
            int(rng.integers(AGE_GROUPS[group_index][0], AGE_GROUPS[group_index][1] + 1))
            for group_index in chosen_groups
        ]

        patients = [
            {
                "age": ages[index],
                "region": region,
                "milieu": milieu,
                "risk_level": risk_level,
            }
            for index, (region, milieu, risk_level) in enumerate(
                zip(
                    rng.choice(REGIONS, size=PATIENT_SEED_COUNT, p=REGION_WEIGHTS),
                    rng.choice(MILIEUX, size=PATIENT_SEED_COUNT, p=MILIEU_WEIGHTS),
                    rng.choice(RISK_LEVELS, size=PATIENT_SEED_COUNT, p=RISK_LEVEL_WEIGHTS),
                )
            )
        ]

        db.execute(insert(Patient), patients)
        db.commit()
        logger.info("Seeded %s Moroccan patients", PATIENT_SEED_COUNT)
    except Exception:
        db.rollback()
        logger.exception("Failed to seed Moroccan patients")
        raise
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    for attempt in range(1, 21):
        try:
            existing_topics = admin_client.list_topics(timeout=10).topics
            if AUDIENCE_TOPIC not in existing_topics:
                futures = admin_client.create_topics([NewTopic(AUDIENCE_TOPIC, num_partitions=1, replication_factor=1)])
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
            logger.warning("Kafka topic not ready yet for stratification-service (attempt %s/20)", attempt)
            time.sleep(2)
    _seed_patients_if_needed()
    yield


app = FastAPI(title="stratification-service", version="1.0.0", lifespan=lifespan)


def _delivery_report(err, msg):
    if err is not None:
        logger.error("Kafka delivery failed: %s", err)


def _publish_audience(campaign_id: int, patient_ids: List[int]) -> None:
    payload = {"campaign_id": campaign_id, "patient_ids": patient_ids}
    producer.produce(
        AUDIENCE_TOPIC,
        value=json.dumps(payload).encode("utf-8"),
        callback=_delivery_report,
    )
    producer.poll(0)
    producer.flush(5)


@app.post("/stratify/{campaign_id}", response_model=StratifyResponse)
def stratify(campaign_id: int, payload: StratifyRequest, db: Session = Depends(get_db)):
    filters = [
        and_(
            Patient.age >= rule.min_age,
            Patient.age <= rule.max_age,
            Patient.region == rule.region,
            Patient.milieu == rule.milieu,
            Patient.risk_level == rule.risk_level,
        )
        for rule in payload.rules
    ]

    matches = db.query(Patient).filter(or_(*filters)).all()
    patient_ids = [patient.id for patient in matches]

    try:
        _publish_audience(campaign_id, patient_ids)
    except Exception as exc:
        logger.exception("Failed publishing audience event")
        raise HTTPException(status_code=500, detail=f"Failed to publish audience event: {exc}")

    return StratifyResponse(
        campaign_id=campaign_id,
        patient_ids=patient_ids,
        matched_count=len(patient_ids),
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "stratification-service"}
