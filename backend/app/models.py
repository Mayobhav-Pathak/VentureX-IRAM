# backend/app/models.py
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String, Enum as SAEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class TrackLine(str, PyEnum):
    UP = "UP"
    DOWN = "DOWN"
    BOTH = "BOTH"

class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    section_id: Mapped[str] = mapped_column(String, index=True)
    department: Mapped[str] = mapped_column(String, index=True)  # ENG, SNT, TRD
    km_marker: Mapped[float] = mapped_column(Float)
    last_maintained: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    failure_history_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # New Operational Fields
    line: Mapped[TrackLine] = mapped_column(SAEnum(TrackLine), default=TrackLine.BOTH)
    requires_traction_isolation: Mapped[bool] = mapped_column(Boolean, default=False)
    isolation_buffer_mins: Mapped[int] = mapped_column(Integer, default=20)

class JobModel(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    asset_id: Mapped[str] = mapped_column(String, index=True)
    section_id: Mapped[str] = mapped_column(String, index=True)
    department: Mapped[str] = mapped_column(String, index=True)
    defect_code: Mapped[str] = mapped_column(String)
    duration_mins: Mapped[int] = mapped_column(Integer, default=120)
    priority_score: Mapped[float] = mapped_column(Float, default=70.0)
    target_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    assigned_block_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    post_block_tsr_speed_kmph: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tsr_duration_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # New Operational Fields
    line: Mapped[TrackLine] = mapped_column(SAEnum(TrackLine), default=TrackLine.BOTH)
    requires_traction_isolation: Mapped[bool] = mapped_column(Boolean, default=False)
    isolation_buffer_mins: Mapped[int] = mapped_column(Integer, default=20)

class BlockModel(Base):
    __tablename__ = "blocks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    section_id: Mapped[str] = mapped_column(String, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    department_list: Mapped[list[str]] = mapped_column(JSON, default=list)
    assigned_job_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_bundled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_conflict: Mapped[bool] = mapped_column(Boolean, default=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    post_block_tsr_speed_kmph: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tsr_duration_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_legacy_plan: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # New Operational Fields
    line: Mapped[TrackLine] = mapped_column(SAEnum(TrackLine), default=TrackLine.BOTH)
    has_isolation_buffer: Mapped[bool] = mapped_column(Boolean, default=False)
    isolation_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

class ConflictModel(Base):
    __tablename__ = "maintenance_conflicts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    section_id: Mapped[str] = mapped_column(String, index=True)
    competing_job_ids: Mapped[list[str]] = mapped_column(JSON)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    resolution_action: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    time_saved_mins: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)