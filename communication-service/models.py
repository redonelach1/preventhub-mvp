from sqlalchemy import Column, Integer, String

from database import Base


class MessageTemplate(Base):
    __tablename__ = "message_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    content = Column(String(2000), nullable=False)


class CommunicationPreference(Base):
    __tablename__ = "communication_preferences"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, nullable=False, unique=True, index=True)
    channel = Column(String(50), nullable=False)
