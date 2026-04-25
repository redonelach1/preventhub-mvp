from pydantic import BaseModel, ConfigDict, Field
from models import EngagementAction


class TrackingEventCreate(BaseModel):
    patient_id: int = Field(..., gt=0)
    campaign_id: int = Field(..., gt=0)
    action: EngagementAction


class TrackingEventRead(BaseModel):
    id: int
    patient_id: int
    campaign_id: int
    action: EngagementAction

    model_config = ConfigDict(from_attributes=True)


class QuickTrackRequest(BaseModel):
    patient_id: int = Field(..., gt=0)
    campaign_id: int = Field(..., gt=0)
