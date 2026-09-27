# backend/app/safety_rules.py
from datetime import datetime
from typing import Any


def _value(item: Any, key: str, default: Any = None) -> Any:
    if isinstance(item, dict):
        return item.get(key, default)
    return getattr(item, key, default)


def _as_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value)


def _window_bounds(proposed_window: Any) -> tuple[datetime, datetime]:
    start = _as_datetime(_value(proposed_window, "work_start", _value(proposed_window, "start_time")))
    end = _as_datetime(_value(proposed_window, "work_end", _value(proposed_window, "end_time")))
    if start is None or end is None or end <= start:
        raise ValueError("proposed_window must contain a valid start and end")
    return start, end


def validate_gsr_rules(
    candidate_job: Any,
    proposed_window: Any,
    existing_blocks: list[Any],
) -> list[dict]:
    """
    Validates candidate possession requests against Indian Railways G&SR and ACTM standards:
    - G&SR 3.51: Station boundary simultaneous possession lockout.
    - ACTM 2.14: Civil / mechanized track work under 25kV OHE requires confirmed TRD isolation.
    """
    conflicts = []
    candidate_section = _value(candidate_job, "section_id")
    candidate_start, candidate_end = _window_bounds(proposed_window)
    candidate_start_station = _value(candidate_job, "start_station")
    candidate_end_station = _value(candidate_job, "end_station")

    for block in existing_blocks:
        if not _value(block, "is_active", True):
            continue
        block_start = _as_datetime(_value(block, "work_start", _value(block, "start_time")))
        block_end = _as_datetime(_value(block, "work_end", _value(block, "end_time")))
        if block_start is None or block_end is None:
            continue

        overlaps = candidate_start < block_end and block_start < candidate_end
        if not overlaps:
            continue

        shared_boundary = _value(block, "start_station") in (
            candidate_start_station,
            candidate_end_station,
        ) or _value(block, "end_station") in (
            candidate_start_station,
            candidate_end_station,
        )
        same_section = _value(block, "section_id") == candidate_section

        if shared_boundary or (
            same_section
            and candidate_start == block_start
            and candidate_end == block_end
            and candidate_start_station is None
            and candidate_end_station is None
        ):
            conflicts.append(
                {
                    "rule": "G&SR 3.51",
                    "type": "STATION_BOUNDARY_LOCKOUT",
                    "severity": "CRITICAL",
                    "msg": "Simultaneous possession active at shared boundary station interlocking.",
                }
            )
            break

    if _value(candidate_job, "requires_traction_isolation", False):
        buffer_mins = int(_value(candidate_job, "isolation_buffer_mins", 20) or 20)
        trd_confirmed = any(
            _value(block, "is_active", True)
            and _value(block, "department") == "TRD"
            and _value(block, "section_id") == candidate_section
            and _as_datetime(_value(block, "work_start", _value(block, "start_time"))) == candidate_start
            and _as_datetime(_value(block, "work_end", _value(block, "end_time"))) == candidate_end
            and _value(block, "has_isolation_buffer", False)
            and _as_datetime(_value(block, "isolation_start")) is not None
            and (candidate_start - _as_datetime(_value(block, "isolation_start"))).total_seconds() >= buffer_mins * 60
            for block in existing_blocks
        )
        if not trd_confirmed:
            conflicts.append(
                {
                    "rule": "ACTM 2.14",
                    "type": "MISSING_TRD_POWER_BLOCK",
                    "severity": "FATAL",
                    "msg": "Civil work scheduled under OHE without confirmed TRD de-energization permit.",
                }
            )

    return conflicts