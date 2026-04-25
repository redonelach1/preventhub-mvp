from typing import List, Literal
from pydantic import BaseModel, Field, field_validator

RegionName = Literal[
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
MilieuName = Literal["Urbain", "Rural"]
RiskLevelName = Literal["Low", "Medium", "High"]


class TargetingRuleInput(BaseModel):
    min_age: int = Field(..., ge=0, le=120)
    max_age: int = Field(..., ge=0, le=120)
    region: RegionName
    milieu: MilieuName
    risk_level: RiskLevelName

    @field_validator("max_age")
    @classmethod
    def validate_age_range(cls, value: int, info):
        min_age = info.data.get("min_age")
        if min_age is not None and value < min_age:
            raise ValueError("max_age must be greater than or equal to min_age")
        return value


class StratifyRequest(BaseModel):
    rules: List[TargetingRuleInput] = Field(..., min_length=1)


class StratifyResponse(BaseModel):
    campaign_id: int
    patient_ids: List[int]
    matched_count: int
