from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://preventhub:preventhub@postgres:5432/analytics_db",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
STRATIFICATION_DATABASE_URL = os.getenv(
    "STRATIFICATION_DATABASE_URL",
    "postgresql+psycopg2://preventhub:preventhub@postgres:5432/stratification_db",
)
stratification_engine = create_engine(STRATIFICATION_DATABASE_URL, pool_pre_ping=True)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
