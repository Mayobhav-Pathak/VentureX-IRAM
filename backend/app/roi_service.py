# backend/app/roi_service.py
from pydantic import BaseModel, ConfigDict, Field


class ROIInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hours_saved_per_month: float = Field(ge=0)
    avg_rakes_impacted_per_hour: float = Field(default=2.0, ge=0)
    wagons_per_rake: int = Field(default=58, gt=0)
    demurrage_rate_per_wagon_hour: float = Field(default=150.0, ge=0)


class ROIBreakdown(BaseModel):
    base_demurrage_saved_inr: float
    crew_idle_savings_inr: float
    total_financial_savings_inr: float
    formatted_inr: str
    derivation_formula: str
    official_citation: str


def format_inr(value: float) -> str:
    rounded = int(round(value))
    sign = "-" if rounded < 0 else ""
    digits = str(abs(rounded))

    if len(digits) <= 3:
        formatted = digits
    else:
        last_three = digits[-3:]
        leading = digits[:-3]
        groups = []
        while len(leading) > 2:
            groups.insert(0, leading[-2:])
            leading = leading[:-2]
        if leading:
            groups.insert(0, leading)
        formatted = ",".join(groups + [last_three])

    return f"{sign}₹{formatted} / month"


def calculate_financial_roi(inputs: ROIInput) -> ROIBreakdown:
    # 58-wagon BOXN rake demurrage detention calculation
    base_demurrage = (
        inputs.hours_saved_per_month
        * inputs.avg_rakes_impacted_per_hour
        * inputs.wagons_per_rake
        * inputs.demurrage_rate_per_wagon_hour
    )
    # Crew idle detention avoidance (Loco Pilot, Assistant Loco Pilot, Guard)
    crew_idle_savings = (
        inputs.hours_saved_per_month
        * inputs.avg_rakes_impacted_per_hour
        * 1200.0
    )
    total_savings = base_demurrage + crew_idle_savings

    return ROIBreakdown(
        base_demurrage_saved_inr=round(base_demurrage, 2),
        crew_idle_savings_inr=round(crew_idle_savings, 2),
        total_financial_savings_inr=round(total_savings, 2),
        formatted_inr=format_inr(total_savings),
        derivation_formula=(
            f"Base demurrage: {inputs.hours_saved_per_month:g} hours/month × "
            f"{inputs.avg_rakes_impacted_per_hour:g} rakes/hour × "
            f"{inputs.wagons_per_rake} wagons/rake × "
            f"₹{inputs.demurrage_rate_per_wagon_hour:g}/wagon-hour = "
            f"₹{base_demurrage:,.2f}; crew detention avoidance: "
            f"{inputs.hours_saved_per_month:g} hours/month × "
            f"{inputs.avg_rakes_impacted_per_hour:g} rakes/hour × "
            f"₹1,200/rake-hour = ₹{crew_idle_savings:,.2f}; total = "
            f"₹{total_savings:,.2f} per month."
        ),
        official_citation=(
            "Ministry of Railways Compendium Rate: ₹150/wagon/hour base "
            "demurrage (58-wagon BOXN rake)."
        ),
    )