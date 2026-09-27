# backend/app/database.py
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session
from models import Base, Asset, JobModel, BlockModel, ConflictModel, TrackLine

load_dotenv()

# Read strictly from Supabase environment variable
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is missing. Set your Supabase pooler URI.")

# Optimized connection pool settings for Supabase Transaction/Session pooler (Port 6543)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=300,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

SECTIONS = [
    {"id": "NDLS-TKD", "name": "New Delhi - Tuglakabad", "start_km": 0.0, "end_km": 17.5},
    {"id": "TKD-FDB", "name": "Tuglakabad - Faridabad", "start_km": 17.5, "end_km": 37.8},
    {"id": "FDB-PWL", "name": "Faridabad - Palwal", "start_km": 37.8, "end_km": 60.2},
    {"id": "PWL-KSV", "name": "Palwal - Kosi Kalan", "start_km": 60.2, "end_km": 102.5},
    {"id": "KSV-MTJ", "name": "Kosi Kalan - Mathura", "start_km": 102.5, "end_km": 149.8},
    {"id": "MTJ-AGC", "name": "Mathura - Agra Cantt", "start_km": 149.8, "end_km": 199.3},
]

TASK_TEMPLATES = [
    ("ENG", "Turnout tamping & ballast packing", 150, 88.5, True),
    ("ENG", "Ultrasonic rail flaw testing & clamp fix", 120, 92.0, False),
    ("ENG", "Thermit weld inspection & rail profiling", 135, 84.0, False),
    ("ENG", "Switch expansion joint maintenance", 120, 86.5, True),
    ("SNT", "Digital axle counter calibration & reset", 90, 83.0, False),
    ("SNT", "Point machine overhaul & detector check", 120, 89.0, False),
    ("SNT", "Relay interlocking contact diagnostic", 90, 91.5, False),
    ("SNT", "Track circuit impedance bond reset", 90, 80.5, False),
    ("TRD", "Overhead contact wire height & stagger tuning", 120, 85.0, True),
    ("TRD", "Neutral section insulator renewal", 90, 87.5, True),
    ("TRD", "Substation transformer thermography patrol", 90, 79.5, False),
    ("TRD", "Section isolator contact overhaul", 120, 82.0, True),
]

def ensure_dynamic_rolling_schedule(db: Session, anchor_date: datetime):
    """
    Populates dynamic rolling maintenance windows across 52 weeks
    with distinct weekly loads, realistic durations, week-qualified IDs,
    UP/DOWN line assignments, and OHE isolation buffer metadata.
    """
    normalized_anchor = anchor_date.replace(hour=0, minute=0, second=0, microsecond=0)

    # Check if this anchor's initial week already exists
    existing = db.scalars(
        select(BlockModel).where(
            BlockModel.start_time >= normalized_anchor,
            BlockModel.start_time < normalized_anchor + timedelta(days=7)
        )
    ).first()

    if existing is not None:
        return  # Schedule is already seeded

    # 1. Seed Corridor Assets with Line Direction & Traction Isolation
    for sec in SECTIONS:
        for dept in ["ENG", "SNT", "TRD"]:
            for km_step in range(1, 5):
                km = round(sec["start_km"] + km_step * ((sec["end_km"] - sec["start_km"]) / 5.0), 1)
                assigned_line = TrackLine.UP if km_step % 2 != 0 else TrackLine.DOWN
                needs_iso = dept == "TRD" or (dept == "ENG" and km_step % 2 == 1)

                asset_id = f"{dept}-{sec['id'].replace('-', '')}-KM{km}-{assigned_line.value}"
                if not db.get(Asset, asset_id):
                    db.add(Asset(
                        id=asset_id,
                        section_id=sec["id"],
                        department=dept,
                        km_marker=km,
                        last_maintained=normalized_anchor - timedelta(days=30 + km_step * 10),
                        failure_history_count=km_step % 3,
                        line=assigned_line,
                        requires_traction_isolation=needs_iso,
                        isolation_buffer_mins=20 if needs_iso else 0
                    ))

    # 2. Seed Rolling Jobs and Scheduled Possession Blocks
    for week in range(52):
        week_start = normalized_anchor + timedelta(days=week * 7)
        for s_idx, sec in enumerate(SECTIONS):
            # Unique activity distribution per week
            week_mod_trigger = (
                (week + s_idx) % 2 == 0 if week % 4 == 0 else
                (week * 2 + s_idx) % 3 == 0 if week % 4 == 1 else
                (week + s_idx * 2) % 3 == 0 if week % 4 == 2 else
                (week + s_idx) % 4 == 0
            )
            num_blocks = 2 if week_mod_trigger else 1

            for b_idx in range(num_blocks):
                day_offset = (s_idx * 2 + b_idx * 3 + week) % 6
                start_hour = 0 if b_idx == 0 else 11
                block_start = week_start + timedelta(days=day_offset, hours=start_hour, minutes=30)

                # Alternate UP vs DOWN line scheduling
                assigned_line = TrackLine.UP if (week + s_idx + b_idx) % 2 == 0 else TrackLine.DOWN

                # Unique task template selection per week & section
                t_idx1 = (week * 5 + s_idx * 3 + b_idx * 2) % len(TASK_TEMPLATES)
                dept1, title1, base_dur1, prio1, needs_iso1 = TASK_TEMPLATES[t_idx1]

                # Realistic duration variance per section and week
                dur_var = ((s_idx + week + b_idx) % 3) * 15
                dur1 = max(90, base_dur1 - 15 + dur_var)
                block_end = block_start + timedelta(minutes=dur1)

                # Unique chainage KM marker within section
                km_span = sec["end_km"] - sec["start_km"]
                km_offset = round(((week * 7.3 + s_idx * 3.1 + b_idx * 4.2) % km_span), 1)
                actual_km = round(sec["start_km"] + max(1.2, km_offset), 1)

                # Week-qualified unique ID and descriptive defect code
                block_id = f"BLK-{sec['id'].replace('-', '')}-W{week+1:02d}-{b_idx+1}-{assigned_line.value}"
                job1_id = f"JOB-{dept1}-W{week+1:02d}-{sec['id'].replace('-', '')}-KM{actual_km}-{assigned_line.value}"
                defect_title = f"{dept1}-W{week+1:02d} | {title1} (KM {actual_km}) [{assigned_line.value}]"

                db.merge(JobModel(
                    id=job1_id,
                    asset_id=f"{dept1}-{sec['id'].replace('-', '')}-KM{actual_km}-{assigned_line.value}",
                    section_id=sec["id"],
                    department=dept1,
                    defect_code=defect_title,
                    duration_mins=dur1,
                    priority_score=round(prio1 + ((week * 2 + s_idx) % 5) * 1.4, 1),
                    target_date=block_start,
                    assigned_block_id=block_id,
                    line=assigned_line,
                    requires_traction_isolation=needs_iso1,
                    isolation_buffer_mins=20 if needs_iso1 else 0
                ))

                assigned_jobs = [job1_id]
                depts = [dept1]
                is_bundled = False
                has_iso = needs_iso1

                # Coordinated multi-department bundling variation
                if (week % 2 == 0 and b_idx == 0 and s_idx % 2 == 0) or (week % 3 == 0 and b_idx == 1):
                    t_idx2 = (t_idx1 + 4) % len(TASK_TEMPLATES)
                    dept2, title2, dur2, prio2, needs_iso2 = TASK_TEMPLATES[t_idx2]
                    job2_id = f"JOB-{dept2}-W{week+1:02d}-{sec['id'].replace('-', '')}-KM{actual_km}-{assigned_line.value}"

                    db.merge(JobModel(
                        id=job2_id,
                        asset_id=f"{dept2}-{sec['id'].replace('-', '')}-KM{actual_km}-{assigned_line.value}",
                        section_id=sec["id"],
                        department=dept2,
                        defect_code=f"{dept2}-W{week+1:02d} | {title2} (KM {actual_km}) [{assigned_line.value}]",
                        duration_mins=dur2,
                        priority_score=round(prio2 + 1.2, 1),
                        target_date=block_start,
                        assigned_block_id=block_id,
                        line=assigned_line,
                        requires_traction_isolation=needs_iso2,
                        isolation_buffer_mins=20 if needs_iso2 else 0
                    ))
                    assigned_jobs.append(job2_id)
                    depts.append(dept2)
                    is_bundled = True
                    has_iso = has_iso or needs_iso2

                db.merge(BlockModel(
                    id=block_id,
                    section_id=sec["id"],
                    start_time=block_start,
                    end_time=block_end,
                    department_list=sorted(depts),
                    assigned_job_ids=assigned_jobs,
                    is_bundled=is_bundled,
                    is_conflict=False,
                    available=True,
                    line=assigned_line,
                    has_isolation_buffer=has_iso,
                    isolation_start=block_start - timedelta(minutes=20) if has_iso else None
                ))

    # 3. Overlap Conflict Record on MTJ-AGC (UP Line Demonstration)
    conflict_start = normalized_anchor + timedelta(days=2, hours=1, minutes=0)
    conflict_end = conflict_start + timedelta(minutes=180)

    c_job_eng = "JOB-ENG-W01-MTJAGC-KM172.4-UP-CONF"
    c_job_snt = "JOB-SNT-W01-MTJAGC-KM172.4-UP-CONF"

    db.merge(JobModel(
        id=c_job_eng,
        asset_id="ENG-MTJAGC-KM172.4-UP",
        section_id="MTJ-AGC",
        department="ENG",
        defect_code="ENG-W01 | Turnout Geometry & Crossing Renewal (KM 172.4) [UP]",
        duration_mins=180,
        priority_score=94.5,
        target_date=conflict_start,
        assigned_block_id="BLK-MTJAGC-ENG-UP-CONF",
        line=TrackLine.UP,
        requires_traction_isolation=True,
        isolation_buffer_mins=20
    ))
    db.merge(JobModel(
        id=c_job_snt,
        asset_id="SNT-MTJAGC-KM172.4-UP",
        section_id="MTJ-AGC",
        department="SNT",
        defect_code="SNT-W01 | Point Machine Detector Recalibration (KM 172.4) [UP]",
        duration_mins=180,
        priority_score=92.0,
        target_date=conflict_start,
        assigned_block_id="BLK-MTJAGC-SNT-UP-CONF",
        line=TrackLine.UP,
        requires_traction_isolation=False,
        isolation_buffer_mins=0
    ))
    db.merge(BlockModel(
        id="BLK-MTJAGC-ENG-UP-CONF",
        section_id="MTJ-AGC",
        start_time=conflict_start,
        end_time=conflict_end,
        department_list=["ENG"],
        assigned_job_ids=[c_job_eng],
        is_bundled=False,
        is_conflict=False,
        available=True,
        line=TrackLine.UP,
        has_isolation_buffer=True,
        isolation_start=conflict_start - timedelta(minutes=20)
    ))
    db.merge(BlockModel(
        id="BLK-MTJAGC-SNT-UP-CONF",
        section_id="MTJ-AGC",
        start_time=conflict_start,
        end_time=conflict_end,
        department_list=["SNT"],
        assigned_job_ids=[c_job_snt],
        is_bundled=False,
        is_conflict=True,
        available=True,
        line=TrackLine.UP,
        has_isolation_buffer=False,
        isolation_start=None
    ))
    db.merge(ConflictModel(
        id="CONFLICT-MTJAGC-DEMO",
        section_id="MTJ-AGC",
        competing_job_ids=[c_job_eng, c_job_snt],
        window_start=conflict_start,
        window_end=conflict_end,
        status="pending",
        resolution_action=None,
        resolved_at=None,
        resolved_by=None,
        time_saved_mins=None
    ))

    db.commit()