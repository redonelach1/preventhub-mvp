from sqlalchemy import Column, Integer, String

from database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    age = Column(Integer, nullable=False)
    region = Column(String(120), nullable=False)
    milieu = Column(String(50), nullable=False)
    risk_level = Column(String(50), nullable=False)
