# backend/app/solver.py
from datetime import datetime
from ortools.sat.python import cp_model

def minutes_between(start: datetime, end: datetime) -> int:
    return int((end - start).total_seconds() // 60)

def lines_conflict(first_line: str, second_line: str) -> bool:
    return (
        first_line == "BOTH"
        or second_line == "BOTH"
        or first_line == second_line
    )

def block_supports_job(job: dict, block: dict) -> bool:
    if job["section_id"] != block["section_id"]:
        return False
    if not lines_conflict(job.get("line", "BOTH"), block.get("line", "BOTH")):
        return False

    work_start = block["work_start"]
    work_end = block["work_end"]

    if isinstance(work_start, str):
        work_start = datetime.fromisoformat(work_start)
    if isinstance(work_end, str):
        work_end = datetime.fromisoformat(work_end)

    if minutes_between(work_start, work_end) < job["duration_mins"]:
        return False

    if not job.get("requires_traction_isolation", False):
        return True

    isolation_start = block.get("isolation_start")
    if isinstance(isolation_start, str):
        isolation_start = datetime.fromisoformat(isolation_start)

    required_buffer = job.get("isolation_buffer_mins", 20)

    return (
        block.get("has_isolation_buffer", False)
        and isolation_start is not None
        and minutes_between(isolation_start, work_start) >= required_buffer
    )

def blocks_overlap(first_block: dict, second_block: dict) -> bool:
    first_start = first_block.get("isolation_start") or first_block["work_start"]
    second_start = second_block.get("isolation_start") or second_block["work_start"]
    first_end = first_block["work_end"]
    second_end = second_block["work_end"]

    if isinstance(first_start, str):
        first_start = datetime.fromisoformat(first_start)
    if isinstance(second_start, str):
        second_start = datetime.fromisoformat(second_start)
    if isinstance(first_end, str):
        first_end = datetime.fromisoformat(first_end)
    if isinstance(second_end, str):
        second_end = datetime.fromisoformat(second_end)

    return first_start < second_end and second_start < first_end

def run_cpsat_schedule_optimization(jobs: list[dict], blocks: list[dict]) -> list[dict]:
    model = cp_model.CpModel()
    assignments: dict[tuple[int, int], cp_model.IntVar] = {}

    # Variable definition: can job j be executed in block b?
    for job_index, job in enumerate(jobs):
        for block_index, block in enumerate(blocks):
            if block_supports_job(job, block):
                assignments[job_index, block_index] = model.NewBoolVar(
                    f"assign_{job_index}_{block_index}"
                )

    # Constraint 1: Each job assigned at most once
    for job_index in range(len(jobs)):
        model.Add(
            sum(
                var
                for (j_idx, _), var in assignments.items()
                if j_idx == job_index
            ) <= 1
        )

    # Constraint 2: Department capacity per block (at most 1 active crew per dept)
    for block_index in range(len(blocks)):
        for department in ("ENG", "SNT", "TRD"):
            model.Add(
                sum(
                    var
                    for (j_idx, b_idx), var in assignments.items()
                    if b_idx == block_index and jobs[j_idx]["department"] == department
                ) <= 1
            )

    # Constraint 3: Spatial and Directional Mutex (UP vs DOWN lines)
    for (j1_idx, b1_idx), assign1 in assignments.items():
        for (j2_idx, b2_idx), assign2 in assignments.items():
            if (j1_idx, b1_idx) >= (j2_idx, b2_idx) or b1_idx == b2_idx:
                continue

            j1, j2 = jobs[j1_idx], jobs[j2_idx]
            b1, b2 = blocks[b1_idx], blocks[b2_idx]

            same_sec = j1["section_id"] == j2["section_id"]
            line_clash = lines_conflict(j1.get("line", "BOTH"), j2.get("line", "BOTH"))

            if same_sec and line_clash and blocks_overlap(b1, b2):
                model.Add(assign1 + assign2 <= 1)

    # Objective: Maximize total prioritized asset burndown
    objective_terms = [
        int(round(float(jobs[j_idx].get("priority_score", 50.0)) * 1000)) * var
        for (j_idx, _), var in assignments.items()
    ]
    model.Maximize(sum(objective_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5.0
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return []

    scheduled = []
    for (j_idx, b_idx), var in assignments.items():
        if solver.Value(var) != 1:
            continue

        job = jobs[j_idx]
        block = blocks[b_idx]
        iso_start = block.get("isolation_start")
        w_start = block["work_start"]
        w_end = block["work_end"]

        scheduled.append({
            "job_id": job["job_id"],
            "block_id": block["block_id"],
            "section_id": job["section_id"],
            "department": job["department"],
            "line": job.get("line", "BOTH"),
            "work_start": w_start,
            "work_end": w_end,
            "isolation_start": iso_start if job.get("requires_traction_isolation", False) else None,
            "requires_traction_isolation": job.get("requires_traction_isolation", False),
            "total_duration_mins": (
                job["duration_mins"] + job.get("isolation_buffer_mins", 20)
                if job.get("requires_traction_isolation", False)
                else job["duration_mins"]
            ),
        })

    return scheduled