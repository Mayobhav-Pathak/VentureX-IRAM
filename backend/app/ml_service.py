# backend/app/ml_service.py
import numpy as np
import pandas as pd
import shap
import xgboost as xgb

# Set seed so dummy training weights don't drift on every server reload
np.random.seed(42)

FEATURE_COLUMNS = [
    "defect_severity_code",
    "days_overdue",
    "asset_failure_history",
    "traffic_density_km_day",
    "speed_restriction_active",
    "monsoon_exposure",
    "is_trunk_line",
]

# Generate synthetic baseline dataset to fit tree structures
X_dummy = pd.DataFrame(
    {
        "defect_severity_code": np.random.randint(1, 6, 200),
        "days_overdue": np.random.randint(0, 90, 200),
        "asset_failure_history": np.random.randint(0, 10, 200),
        "traffic_density_km_day": np.random.uniform(10.0, 95.0, 200),
        "speed_restriction_active": np.random.choice([0, 1], 200),
        "monsoon_exposure": np.random.choice([0, 1], 200),
        "is_trunk_line": np.random.choice([0, 1], 200),
    }
)
y_dummy = (
    X_dummy["defect_severity_code"] * 12.0
    + X_dummy["days_overdue"] * 0.4
    + X_dummy["traffic_density_km_day"] * 0.25
    + np.random.normal(0, 5, 200)
).clip(0, 100)

xgb_model = xgb.XGBRegressor(
    n_estimators=40,
    max_depth=3,
    learning_rate=0.1,
    random_state=42,
)
xgb_model.fit(X_dummy, y_dummy)

explainer = shap.TreeExplainer(xgb_model)