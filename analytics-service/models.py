from sqlalchemy import Column, Integer, String

from database import Base


class RawMessage(Base):
    __tablename__ = "raw_messages"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, nullable=False, index=True)
    campaign_id = Column(Integer, nullable=False, index=True)


class RawEngagement(Base):
    __tablename__ = "raw_engagements"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, nullable=False, index=True)
    campaign_id = Column(Integer, nullable=False, index=True)
    action = Column(String(50), nullable=False)
