# backend/app/uptime_service.py
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class JobTSRFields(BaseModel):
    model_config = ConfigDict(extra="forbid")
    post_block_tsr_speed_kmph: Optional[int] = Field(default=None, gt=0)
    tsr_duration_hours: Optional[float] = Field(default=None, gt=0)


def _get_value(item: Any, key: str, default: Any = None) -> Any:
    if isinstance(item, dict):
        return item.get(key, default)
    return getattr(item, key, default)


def merge_intervals(intervals: list[tuple[float, float]]) -> list[tuple[float, float]]:
    if not intervals:
        return []
    intervals.sort()
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        previous_start, previous_end = merged[-1]
        if start <= previous_end:
            merged[-1] = (previous_start, max(previous_end, end))
        else:
            merged.append((start, end))
    return merged


def interval_duration(intervals: list[tuple[float, float]]) -> float:
    return sum(end - start for start, end in merge_intervals(intervals))


def calculate_corridor_uptime(
    horizon_hours: float,
    blocks: list[Any],
    sections: list[Any],
) -> dict[str, float]:
    if horizon_hours <= 0:
        raise ValueError("horizon_hours must be greater than zero")
    if not sections:
        raise ValueError("sections must not be empty")

    section_ids = {
        _get_value(section, "section_id", _get_value(section, "id"))
        for section in sections
    }
    section_ids.discard(None)

    closure_by_line: dict[tuple[str, str], list[tuple[float, float]]] = {
        (section_id, line): [] for section_id in section_ids for line in ("UP", "DOWN")
    }
    tsr_by_line: dict[tuple[str, str], list[tuple[float, float]]] = {
        (section_id, line): [] for section_id in section_ids for line in ("UP", "DOWN")
    }

    for block in blocks:
        section_id = _get_value(block, "section_id")
        if section_id not in section_ids:
            continue

        start = float(_get_value(block, "start_hour", 0.0))
        end = float(_get_value(block, "end_hour", start))
        start = max(0.0, min(start, horizon_hours))
        end = max(start, min(end, horizon_hours))
        if end <= start:
            continue

        raw_line = _get_value(block, "line", "BOTH")
        line_str = raw_line.value if hasattr(raw_line, "value") else str(raw_line)
        closed_lines = ("UP", "DOWN") if line_str == "BOTH" else (line_str,)
        for closed_line in closed_lines:
            if closed_line in ("UP", "DOWN"):
                closure_by_line[(section_id, closed_line)].append((start, end))

        tsr_duration = float(_get_value(block, "tsr_duration_hours", 0.0) or 0.0)
        tsr_speed = _get_value(block, "post_block_tsr_speed_kmph")
        if tsr_duration > 0 and tsr_speed is not None:
            tsr_start = end
            tsr_end = min(horizon_hours, end + tsr_duration)
            for affected_line in closed_lines:
                if affected_line in ("UP", "DOWN") and tsr_end > tsr_start:
                    tsr_by_line[(section_id, affected_line)].append((tsr_start, tsr_end))

    total_capacity_hours = len(section_ids) * horizon_hours
    equivalent_closure_hours = 0.0
    tsr_impact_hours = 0.0

    for section_id in section_ids:
        up_closures = merge_intervals(closure_by_line[(section_id, "UP")])
        down_closures = merge_intervals(closure_by_line[(section_id, "DOWN")])

        boundaries = {0.0, horizon_hours}
        for start, end in up_closures + down_closures:
            boundaries.update((start, end))
        ordered_boundaries = sorted(boundaries)

        for start, end in zip(ordered_boundaries, ordered_boundaries[1:]):
            midpoint = (start + end) / 2
            up_closed = any(a <= midpoint < b for a, b in up_closures)
            down_closed = any(a <= midpoint < b for a, b in down_closures)
            if up_closed and down_closed:
                retention = 0.0
            elif up_closed or down_closed:
                # Single-line working retains 60% corridor capacity
                retention = 0.60
            else:
                retention = 1.0
            equivalent_closure_hours += (1.0 - retention) * (end - start)

        for line in ("UP", "DOWN"):
            line_closures = closure_by_line[(section_id, line)]
            line_tsrs = tsr_by_line[(section_id, line)]
            for start, end in merge_intervals(line_tsrs):
                boundaries = {start, end}
                for closure_start, closure_end in line_closures:
                    if start < closure_end and closure_start < end:
                        boundaries.update((max(start, closure_start), min(end, closure_end)))
                ordered = sorted(boundaries)
                for interval_start, interval_end in zip(ordered, ordered[1:]):
                    midpoint = (interval_start + interval_end) / 2
                    line_is_closed = any(a <= midpoint < b for a, b in line_closures)
                    if not line_is_closed:
                        # Active TSR carries a 15% line slowdown penalty
                        tsr_impact_hours += 0.15 * (interval_end - interval_start)

    uptime_pct = max(
        0.0,
        min(
            100.0,
            (1.0 - (equivalent_closure_hours + tsr_impact_hours) / total_capacity_hours) * 100.0,
        ),
    )

    return {
        "corridor_uptime_pct": round(uptime_pct, 2),
        "total_equivalent_closure_hours": round(equivalent_closure_hours, 4),
        "tsr_impact_hours": round(tsr_impact_hours, 4),
    }