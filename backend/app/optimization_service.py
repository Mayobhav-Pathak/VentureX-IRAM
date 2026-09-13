# app/optimization_service.py
from ortools.sat.python import cp_model

def solve_schedule(jobs: list[dict], blocks: list[dict]) -> list[dict]:
    model = cp_model.CpModel()
    assignments = {}

    # Create variables for valid job-block combinations
    for job_index, job in enumerate(jobs):
        for block_index, block in enumerate(blocks):
            if (
                job["section_id"] == block["section_id"]
                and job["duration_mins"] <= block["duration_mins"]
            ):
                assignments[job_index, block_index] = model.NewBoolVar(
                    f"assign_{job_index}_{block_index}"
                )

    # Constraint 1: A job can be assigned to at most one block
    for job_index in range(len(jobs)):
        model.AddAtMostOne(
            assignments[job_index, block_index]
            for block_index in range(len(blocks))
            if (job_index, block_index) in assignments
        )

    # Constraint 2: Only one job per department per block
    departments = ("ENGINEERING", "S_AND_T", "TRD")
    for block_index in range(len(blocks)):
        for department in departments:
            model.AddAtMostOne(
                assignments[job_index, block_index]
                for job_index, job in enumerate(jobs)
                if (
                    (job_index, block_index) in assignments
                    and job["department"] == department
                )
            )

    # Objective: Maximize total priority score
    objective_terms = [
        int(round(jobs[job_index]["priority_score"] * 1000)) * variable
        for (job_index, block_index), variable in assignments.items()
    ]
    model.Maximize(sum(objective_terms))

    # Solve the model
    solver = cp_model.CpSolver()
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return []

    # Extract and return the schedule
    return [
        {
            "job_id": jobs[job_index]["job_id"],
            "block_id": blocks[block_index]["block_id"],
            "section_id": jobs[job_index]["section_id"],
            "department": jobs[job_index]["department"],
            "duration_mins": jobs[job_index]["duration_mins"],
            "priority_score": jobs[job_index]["priority_score"],
        }
        for (job_index, block_index), variable in assignments.items()
        if solver.Value(variable) == 1
    ]