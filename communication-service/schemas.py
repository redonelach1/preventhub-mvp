from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class AudienceGeneratedEvent(BaseModel):
    campaign_id: int
    patient_ids: list[int] = Field(default_factory=list)


class MessageSentEvent(BaseModel):
    patient_id: int
    campaign_id: int
    timestamp: str


ChannelName = Literal["Email", "SMS", "Push"]


class MessageTemplateRead(BaseModel):
    id: int
    name: str
    content: str

    model_config = ConfigDict(from_attributes=True)


class CommunicationPreferenceUpsert(BaseModel):
    channel: ChannelName


class CommunicationPreferenceRead(BaseModel):
    patient_id: int
    channel: ChannelName

    model_config = ConfigDict(from_attributes=True)
