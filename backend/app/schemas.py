# app/schemas.py
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

class JobCreate(BaseModel):
    id: str
    asset_id: str
    section_id: str
    department: Literal["ENG", "SNT", "TRD"]
    defect_code: str
    duration_mins: int = Field(gt=0)
    priority_score: float

class JobRead(JobCreate):
    model_config = ConfigDict(from_attributes=True)

class BlockRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    section_id: str
    start_time: datetime
    end_time: datetime
    department_list: list[str]
    is_bundled: bool
    is_conflict: bool

class ConflictResolveRequest(BaseModel):
    action: Literal["bundle", "reschedule", "override"]
    override_department: Optional[str] = None
    new_start_time: Optional[datetime] = None

class OptimizeScheduleRequest(BaseModel):
    corridor: str
    horizon: Literal["weekly", "monthly"] = "weekly"
    start_time: datetime | None = None

class BlockRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    section_id: str
    start_time: datetime
    end_time: datetime
    department_list: list[str]
    assigned_job_ids: list[str] = [] 
    is_bundled: bool
    is_conflict: bool