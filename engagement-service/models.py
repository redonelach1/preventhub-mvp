import enum
from sqlalchemy import Column, Enum, Integer, String

from database import Base


class EngagementAction(str, enum.Enum):
    clicked = "clicked"
    booked = "booked"


class TrackingEvent(Base):
    __tablename__ = "tracking_events"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, nullable=False, index=True)
    campaign_id = Column(Integer, nullable=False, index=True)
    action = Column(Enum(EngagementAction), nullable=False)
