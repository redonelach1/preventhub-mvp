from pydantic import BaseModel


class RawMessageEvent(BaseModel):
    patient_id: int
    campaign_id: int
    timestamp: str


class RawEngagementEvent(BaseModel):
    patient_id: int
    campaign_id: int
    action: str
    timestamp: str


class RoiResponse(BaseModel):
    campaign_id: int
    total_messages: int
    total_bookings: int
    conversion_rate: float


class RegionalCoverageRow(BaseModel):
    region: str
    total_messages: int
    total_bookings: int
    conversion_rate: float


class RegionalCoverageResponse(BaseModel):
    campaign_id: int
    regions: list[RegionalCoverageRow]
