import os
from typing import Optional
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Campaign, CampaignStatus, TargetingRule
from schemas import ActiveCampaignQuery, CampaignCreate, CampaignRead, TargetingRuleCreate, TargetingRuleRead

app = FastAPI(title="campaign-service", version="1.0.0")


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)


@app.post("/", response_model=CampaignRead, status_code=status.HTTP_201_CREATED)
def create_campaign(payload: CampaignCreate, db: Session = Depends(get_db)):
    campaign = Campaign(name=payload.name, status=CampaignStatus.DRAFT)
    db.add(campaign)
    try:
        db.commit()
        db.refresh(campaign)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not create campaign: {exc}")
    return campaign


@app.get("/", response_model=list[CampaignRead])
def list_campaigns(
    status_filter: Optional[CampaignStatus] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Campaign).order_by(Campaign.id.desc())
    if status_filter is not None:
        query = query.filter(Campaign.status == status_filter)
    return query.all()


@app.get("/health")
def health():
    return {"status": "ok", "service": "campaign-service", "port": int(os.getenv("SERVICE_PORT", "8001"))}


@app.get("/active", response_model=list[CampaignRead])
def list_active_campaigns(
    age: Optional[int] = None,
    region: Optional[str] = None,
    milieu: Optional[str] = None,
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db),
):
    campaigns = (
        db.query(Campaign)
        .filter(Campaign.status == CampaignStatus.ACTIVE)
        .order_by(Campaign.id.desc())
        .all()
    )

    if age is None or region is None or milieu is None or risk_level is None:
        return campaigns

    query = ActiveCampaignQuery(age=age, region=region, milieu=milieu, risk_level=risk_level)
    matched_campaigns = []
    for campaign in campaigns:
        if any(
            rule.min_age <= query.age <= rule.max_age
            and rule.region == query.region
            and rule.milieu == query.milieu
            and rule.risk_level == query.risk_level
            for rule in campaign.rules
        ):
            matched_campaigns.append(campaign)
    return matched_campaigns


@app.get("/{campaign_id}", response_model=CampaignRead)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@app.post("/{campaign_id}/rules", response_model=TargetingRuleRead, status_code=status.HTTP_201_CREATED)
def add_rule(campaign_id: int, payload: TargetingRuleCreate, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    rule = TargetingRule(
        campaign_id=campaign_id,
        min_age=payload.min_age,
        max_age=payload.max_age,
        region=payload.region,
        milieu=payload.milieu,
        risk_level=payload.risk_level,
    )
    db.add(rule)
    try:
        db.commit()
        db.refresh(rule)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not add targeting rule: {exc}")
    return rule


@app.post("/{campaign_id}/launch", response_model=CampaignRead)
def launch_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = CampaignStatus.ACTIVE
    try:
        db.commit()
        db.refresh(campaign)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not launch campaign: {exc}")
    return campaign
