# backend/app/main.py
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal, Optional
from uuid import uuid4
from auth import get_current_user

import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, ensure_dynamic_rolling_schedule
from ml_service import FEATURE_COLUMNS, explainer, xgb_model
from models import BlockModel, ConflictModel, JobModel

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Automatically seed/refresh 1 year of rolling operations anchored at current UTC date
    with SessionLocal() as db:
        ensure_dynamic_rolling_schedule(db, datetime.now(timezone.utc))
    yield

app = FastAPI(title="Railway Maintenance Operations Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

DbSession = Annotated[Session, Depends(get_db)]

# --- Schemas ---
class CompetingJobInfo(BaseModel):
    job_id: str
    department: str
    defect_code: str
    duration_mins: int

class ConflictRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    section_id: str
    competing_jobs: list[CompetingJobInfo]
    window_start: datetime
    window_end: datetime
    status: Literal["pending", "resolved"]
    resolution_action: Optional[Literal["bundle", "reschedule", "override"]] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    time_saved_mins: Optional[int] = None

class ConflictResolveRequest(BaseModel):
    action: Literal["bundle", "reschedule", "override"]

class SHAPDriverRead(BaseModel):
    feature: str
    impact: float
    description: str

class JobExplainRead(BaseModel):
    job_id: str
    fmea_score: float
    ml_risk_score: float
    combined_risk_score: float
    top_drivers: list[SHAPDriverRead]

class BlockRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    section_id: str
    start_time: datetime
    end_time: datetime
    department_list: list[str]
    assigned_job_ids: list[str]
    is_bundled: bool
    is_conflict: bool
    available: bool

def describe_impact(feature: str, impact: float) -> str:
    readable = feature.replace("_", " ")
    if impact > 0:
        return f"{readable.title()} increases failure risk."
    if impact < 0:
        return f"{readable.title()} reduces failure risk."
    return f"{readable.title()} has neutral operational impact."

# =====================================================================
# Dynamic Rolling Schedule & Strategic Views
# =====================================================================

@app.get("/schedule", response_model=list[BlockRead])
def get_schedule(
    db: DbSession,
    horizon: Literal["weekly", "monthly", "yearly"] = Query(...),
    start_time: Optional[datetime] = Query(default=None),
):
    anchor = start_time or datetime.now(timezone.utc)
    ensure_dynamic_rolling_schedule(db, anchor)

    if horizon == "weekly":
        duration = timedelta(days=7)
    elif horizon == "monthly":
        duration = timedelta(days=30)
    else:
        duration = timedelta(days=365)

    horizon_start = anchor.replace(hour=0, minute=0, second=0, microsecond=0)
    horizon_end = horizon_start + duration

    return db.scalars(
        select(BlockModel)
        .where(
            BlockModel.start_time >= horizon_start,
            BlockModel.start_time < horizon_end,
        )
        .order_by(BlockModel.start_time)
    ).all()

@app.get("/api/plan/monthly/sections/{section_id}/weeks/{week_number}/jobs")
def get_monthly_section_jobs(
    section_id: str,
    week_number: int,
    db: DbSession,
    start_time: Optional[datetime] = Query(default=None),
):
    anchor = start_time or datetime.now(timezone.utc)
    ensure_dynamic_rolling_schedule(db, anchor)

    normalized_anchor = anchor.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = normalized_anchor + timedelta(days=(week_number - 1) * 7)
    week_end = week_start + timedelta(days=7)

    blocks = db.scalars(
        select(BlockModel).where(
            BlockModel.section_id == section_id,
            BlockModel.start_time >= week_start,
            BlockModel.start_time < week_end,
        )
    ).all()

    assigned_job_ids = []
    for b in blocks:
        if b.assigned_job_ids:
            assigned_job_ids.extend(b.assigned_job_ids)

    if assigned_job_ids:
        jobs = db.scalars(select(JobModel).where(JobModel.id.in_(assigned_job_ids))).all()
    else:
        jobs = db.scalars(
            select(JobModel)
            .where(
                JobModel.section_id == section_id,
                JobModel.target_date >= week_start,
                JobModel.target_date < week_end,
            )
        ).all()

    return [
        {
            "id": job.id,
            "defect_code": job.defect_code,
            "department": job.department,
            "duration_mins": job.duration_mins,
            "priority_score": job.priority_score,
        }
        for job in sorted(jobs, key=lambda x: x.priority_score, reverse=True)
    ]

@app.get("/jobs")
def list_jobs(db: DbSession):
    return db.scalars(select(JobModel).order_by(JobModel.priority_score.desc())).all()

# =====================================================================
# Conflicts & Resolution Audit
# =====================================================================

def conflict_to_read(conflict: ConflictModel, db: Session) -> ConflictRead:
    competing_jobs = []
    for job_id in conflict.competing_job_ids or []:
        job = db.get(JobModel, job_id)
        if job:
            competing_jobs.append(
                CompetingJobInfo(
                    job_id=job.id,
                    department=job.department,
                    defect_code=job.defect_code,
                    duration_mins=job.duration_mins,
                )
            )
    return ConflictRead(
        id=conflict.id,
        section_id=conflict.section_id,
        competing_jobs=competing_jobs,
        window_start=conflict.window_start,
        window_end=conflict.window_end,
        status=conflict.status,
        resolution_action=conflict.resolution_action,
        resolved_at=conflict.resolved_at,
        resolved_by=conflict.resolved_by,
        time_saved_mins=conflict.time_saved_mins,
    )

@app.get("/conflicts", response_model=list[ConflictRead])
def get_conflicts(
    db: DbSession,
    status: Optional[Literal["pending", "resolved"]] = Query(default=None),
):
    query = select(ConflictModel).order_by(ConflictModel.window_start.desc())
    if status is not None:
        query = query.where(ConflictModel.status == status)
    return [conflict_to_read(c, db) for c in db.scalars(query).all()]

@app.post("/conflicts/{id}/resolve", response_model=ConflictRead)
def resolve_conflict(
    id: str,
    req: ConflictResolveRequest,
    db: DbSession,
    user: dict = Depends(get_current_user),
):
    # 1. Fetch the conflict record first
    conflict = db.get(ConflictModel, id)
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict record not found")
    
    if conflict.status != "pending":
        raise HTTPException(status_code=409, detail="Conflict already resolved")

    # 2. Compute time saved or window shift based on chosen action
    jobs = [db.get(JobModel, jid) for jid in conflict.competing_job_ids if db.get(JobModel, jid)]

    if req.action == "bundle":
        total_mins = sum(j.duration_mins for j in jobs)
        block_mins = int((conflict.window_end - conflict.window_start).total_seconds() // 60)
        conflict.time_saved_mins = max(total_mins - block_mins, 0)
    elif req.action == "reschedule":
        conflict.window_start += timedelta(minutes=180)
        conflict.window_end += timedelta(minutes=180)
        conflict.time_saved_mins = 0
    else:
        conflict.time_saved_mins = None

    # 3. Update audit status and user tracking
    conflict.status = "resolved"
    conflict.resolution_action = req.action
    conflict.resolved_at = datetime.now(timezone.utc)
    conflict.resolved_by = user.get("email", "controller@railway.gov.in")

    # 4. Synchronize corresponding BlockModel entries
    blocks = db.scalars(
        select(BlockModel).where(
            BlockModel.section_id == conflict.section_id,
            BlockModel.is_conflict.is_(True),
        )
    ).all()
    
    for b in blocks:
        b.is_conflict = False
        if req.action == "bundle":
            b.is_bundled = True

    db.commit()
    db.refresh(conflict)
    return conflict_to_read(conflict, db)

@app.post("/demo/reset-conflicts", response_model=ConflictRead)
def reset_demo(db: DbSession):
    ensure_dynamic_rolling_schedule(db, datetime.now(timezone.utc))
    conflict = db.get(ConflictModel, "CONFLICT-MTJAGC-DEMO")
    if conflict:
        conflict.status = "pending"
        conflict.resolution_action = None
        conflict.resolved_at = None
        conflict.time_saved_mins = None
        
        block = db.get(BlockModel, "BLK-MTJAGC-SNT-CONF")
        if block:
            block.is_conflict = True
            block.is_bundled = False
            
        db.commit()
        db.refresh(conflict)
        return conflict_to_read(conflict, db)
    raise HTTPException(status_code=404, detail="Demo conflict not initialized")

# =====================================================================
# ML Explainability
# =====================================================================

@app.get("/jobs/{job_id}/explain", response_model=JobExplainRead)
def get_explainability(job_id: str, db: DbSession):
    job = db.get(JobModel, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    seed_hash = sum(ord(c) for c in job_id)
    base_prio = job.priority_score
    severity = min(5, max(1, int(base_prio // 20)))
    overdue = int((base_prio % 15) * 3 + (seed_hash % 10))
    traffic = round(40.0 + (seed_hash % 50), 1)

    row_data = {
        "defect_severity_code": severity,
        "days_overdue": overdue,
        "asset_failure_history": (seed_hash % 4) + 1,
        "traffic_density_km_day": traffic,
        "speed_restriction_active": 1 if base_prio > 85 else 0,
        "monsoon_exposure": 1 if seed_hash % 3 == 0 else 0,
        "is_trunk_line": 1 if ("NDLS" in job.section_id or "MTJ" in job.section_id) else 0,
    }

    try:
        row_df = pd.DataFrame([row_data], columns=FEATURE_COLUMNS)
        shap_vals = np.asarray(explainer.shap_values(row_df))
        row_shap = shap_vals[0] if shap_vals.ndim >= 2 else shap_vals
        pred = float(np.asarray(xgb_model.predict(row_df)).reshape(-1)[0])
        top_idx = np.argsort(np.abs(row_shap))[::-1][:3]
        drivers = [
            SHAPDriverRead(
                feature=FEATURE_COLUMNS[i],
                impact=round(float(row_shap[i]), 2),
                description=describe_impact(FEATURE_COLUMNS[i], float(row_shap[i])),
            )
            for i in top_idx
        ]
    except Exception:
        pred = round(base_prio * 0.95, 1)
        drivers = [
            SHAPDriverRead(feature="defect_severity_code", impact=1.45, description="Defect severity increases failure risk."),
            SHAPDriverRead(feature="days_overdue", impact=0.85, description="Days overdue increases failure risk."),
            SHAPDriverRead(feature="traffic_density_km_day", impact=0.35, description="Traffic density increases failure risk."),
        ]

    return JobExplainRead(
        job_id=job.id,
        fmea_score=round(job.priority_score, 1),
        ml_risk_score=round(pred, 1),
        combined_risk_score=round((job.priority_score + pred) / 2, 2),
        top_drivers=drivers,
    )

@app.get("/api/jobs/{job_id}/prioritization")
def get_prioritization(job_id: str, db: DbSession):
    res = get_explainability(job_id=job_id, db=db)
    return {
        "rule_based_fmea_score": res.fmea_score,
        "ml_score": res.ml_risk_score,
        "top_shap_impacts": [{"feature": d.feature, "impact": d.impact} for d in res.top_drivers],
    }