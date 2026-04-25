import enum
from sqlalchemy import Column, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class CampaignStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    status = Column(Enum(CampaignStatus), nullable=False, default=CampaignStatus.DRAFT)

    rules = relationship("TargetingRule", back_populates="campaign", cascade="all, delete-orphan")


class TargetingRule(Base):
    __tablename__ = "targeting_rules"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    min_age = Column(Integer, nullable=False)
    max_age = Column(Integer, nullable=False)
    region = Column(String(120), nullable=False)
    milieu = Column(String(50), nullable=False)
    risk_level = Column(String(50), nullable=False)

    campaign = relationship("Campaign", back_populates="rules")
