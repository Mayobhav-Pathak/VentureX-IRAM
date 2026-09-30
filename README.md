<div align="center">
  <img src="./assets/logo_full.svg" alt="Project Logo" />
  
# 🚆 IR-RAMS — Intelligent Railway Resource Allocation & Maintenance System
  
**Smart India Hackathon 2026 — Problem Statement SIH26027 · Ministry of Railways**
**Team VentureX**
  
🔗 **[IR-RAMS](https://venture-x-iram.vercel.app)** · 🔗 **[Feature Showcase Site](https://mayobhav-pathak.github.io/VentureX-IRAM)**
</div>


### Maintenance Possession Controller — AI-Powered Automatic Block Planning for Indian Railways

> **Disclaimer:** This is a student prototype built for Smart India Hackathon 2026. Any resemblance to real Indian Railways systems, internal tools, or personnel is a deliberate simulation for demonstration purposes only and does not represent an official or operational Railways system.

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Overview](#-overview)
- [Pilot Corridor](#️-pilot-corridor-delhiagra-saturated-section)
- [Key Features](#-key-features)
- [Architecture](#️-architecture)
- [Screenshots](#-screenshots)
- [Team](#-team)

---

## 📋 Problem Statement

Maintenance of Indian Railways' fixed infrastructure — Engineering (track), Signal & Telecommunication, and Traction Distribution — is currently planned independently by each department through a manual, decentralized block-demand process (BDMS). Defect and overdue-maintenance data lives separately in the **Track Management System (TMS)**, **Signalling Maintenance & Management System (SMMS)**, and **Traction Distribution Management System (TDMS)**, while the **Control Office Application (COA)** manages corridor block availability against the Train Time Table and goods-traffic forecast. Without integration, this leads to inefficient block utilization, poor cross-department coordination, and reduced availability of critical infrastructure for train operations.

## 🔎 Overview

**IR-RAMS** unifies maintenance, defect, and corridor-availability data into a single AI-driven scheduling engine that prioritizes, optimizes, and coordinates maintenance possessions across departments — over both a **7-Day Tactical** horizon (exact time slots) and a **30-Day Strategic** horizon (capacity rollups). It goes beyond simple scheduling to model the real operational and safety mechanics of block working: UP/DOWN line-level closures, traction-isolation earthing procedures, inter-departmental interlocking rules, live emergency preemption, and fully transparent, source-cited financial and uptime calculations.

Piloted on the **Delhi–Agra Saturated Corridor**, a 199.3 km, 160 km/h trunk section shared by Vande Bharat, Gatimaan Express, and heavy freight traffic — one of the most congested corridors on the Northern Railway network.

## 🗺️ Pilot Corridor: Delhi–Agra Saturated Section

| Section | Code | Chainage (KM) | Notes |
|---|---|---|---|
| New Delhi – Tughlakabad | NDLS → TKD | 0.0 – 17.5 | High passenger density, multi-line terminal chord with express priority |
| Tughlakabad – Faridabad | TKD → FDB | 17.5 – 37.8 | Major freight yard convergence, heavy container rake movements |
| Faridabad – Palwal | FDB → PWL | 37.8 – 60.2 | Quadruple-track bottleneck transitioning to double automatic section |
| Palwal – Kosi Kalan | PWL → KSV | 60.2 – 102.5 | Pilot site for the Emergency Rail Fracture Preemption Engine (KM 84.2) |
| Kosi Kalan – Mathura | KSV → MTJ | 102.5 – 149.8 | Junction connecting to West Central Railway (WCR) freight routes |
| Mathura – Agra Cantt | MTJ → AGC | 149.8 – 199.3 | 160 km/h semi-high-speed track shared by Vande Bharat & Gatimaan Express |

Zonal scope: **Northern Railway (NR)** with an inter-zonal handshake to **North Central Railway (NCR)** at the Mathura junction boundary.

## ✨ Key Features

### 1. Role-Based Controller Authentication
- Single sign-on styled login scoped to Section Controllers, Senior Divisional Engineers (Sr. DEN), and Traction Power Controllers (TPC).
- Session credentials constrain authorization to the specific saturated corridor (NDLS–AGC) and zonal boundary (NR/NCR).
- "IR-RAMS Secure Gateway" restricts approvals to verified domain-style accounts.

### 2. Dual-Horizon Planning — Tactical vs. Strategic
- **7-Day Tactical:** micro-level weekly train-path reservation with exact time slots (down to 15-minute granularity) per section **and per line (UP/DOWN)**, including associated speed cautions.
- **30-Day Strategic:** macro-level capacity-load rollup by week and section — capacity load %, per-department (ENG/SNT/TRD) hour split, and a demand classification (Optimal / Medium / High) — with drill-down into the exact underlying task list for any week.
- A per-section filter lets a controller isolate a single section's month-long plan or view the entire corridor at once.

### 3. Multi-Disciplinary Departmental Shadow-Bundling
- Models the three departments' distinct work types explicitly:
  - **ENG (Track):** turnout tamping, ballast cleaning machine (BCM) work, rail renewals & welding.
  - **SNT (Signals):** point-machine calibration, track circuits, axle counter maintenance.
  - **TRD (Traction):** 25kV OHE catenary adjustment, bracket replacement, neutral-section checks.
- Compatible cross-department jobs on the same location are automatically bundled ("shadowed") into a single shared possession window instead of separate closures, with the exact corridor downtime saved reported (e.g. 2.5 hours/week from a single bundled window).
- Visual bundling timeline shows the full safety sequence for a joint window, e.g.: `05:40 Earthing → 06:00 Civil Entry → 08:15 Clearance → 08:35 Re-power`.

### 4. Explainable Predictive Safety Analytics
- Every job receives a **composite risk score** blending a rule-based and an ML-based assessment:

  ```
  Risk Score = α · FMEA_Score + (1 − α) · ML_Inference_Score
  ```

  where the FMEA component accounts for structural track age and classification, and the ML component (XGBoost) computes dynamic factors such as axle-load tonnage and weather degradation.
- Every ML prediction is accompanied by **SHAP driver values** showing exactly which features pushed risk up or down (e.g. `defect severity code +13.65`, `traffic density km/day +6.73`, `days overdue +3.02`), surfaced in a **Block Inspector** panel per job.

### 5. Line-Level Modeling & G&SR/ACTM Safety Compliance
- Distinguishes the **UP and DOWN line** within each section rather than treating a section as one closable unit — a possession on one line correctly models **single-line, bi-directional working** on the other, retaining 60% of normal throughput instead of zero.
- **G&SR 3.51 (Boundary Lockout):** prevents simultaneous, unreviewed track occupancy across turnouts and boundary points shared between adjacent sections.
- **ACTM 2.14 (Traction Isolation):** any civil engineering work scheduled under energized 25kV OHE automatically requires a certified **20-minute de-energization and earthing buffer** before the civil gang can enter the track space — enforced automatically, not just scheduled around.
- A lingering **Temporary Speed Restriction (TSR) drag penalty** models the reduced-capacity period that persists after certain track work (e.g. ballast renewal) completes, rather than treating the asset as instantly restored.

### 6. Live Conflict Detection & Resolution
- Overlapping block demands between departments are flagged — not silently resolved — as a **Pending Review** item naming the competing departments, with a **Review & Resolve** action.
- Every resolution (bundle or reschedule) is written to a permanent, timestamped **Resolution Audit Log** (e.g. `MTJ-AGC (ENG, SNT) — Rescheduled +180m`).
- A **Reset Demo Conflict** control allows a fresh conflict to be triggered on demand for live walkthroughs.

### 7. Emergency Possession Injection & Live Re-Optimization
- A dedicated **Emergency Track Possession Injection** engine handles unscheduled events — broken rails, OHE wire snaps, track fractures — that supersede the existing schedule.
- Controllers specify the target section, kilometer chainage, line restriction (UP / DOWN / BOTH), active duration, and whether the OHE earthing buffer applies, then dispatch.
- The **Google OR-Tools CP-SAT** solver re-optimizes the affected schedule live, pre-empting lower-priority freight windows and rescheduling non-overlapping slots.
- Simulated impact reporting shows the downstream effect, e.g. "Preempts 2 upcoming freight paths (TKD Yard) and reroutes traffic onto Loop 2 with a 30 km/h TSR warning."

### 8. Quantitative Financial ROI
- Recovered line-capacity is converted into a rupee figure rather than left as an abstract hours-saved statistic, using Indian Railways' published wagon demurrage rate and a standard freight rake composition:

  ```
  Base demurrage = hours reclaimed/month × rakes/hour × wagons/rake × ₹150/wagon-hour
  + Crew detention avoidance = hours reclaimed/month × rakes/hour × ₹1,200/rake-hour
  ```

- Sourced from the **Ministry of Railways Compendium Rate** (₹150/wagon-hour base demurrage, 58-wagon BOXN rake) — shown as a full, auditable calculation, not a single unexplained number.

### 9. Full Mathematical Transparency — Live Audit Trail
- Every headline KPI — Possession Hours, Corridor Uptime, Financial Recovery, Pending Conflicts — has a **"Live Audit Trail & Derivation"** modal showing the exact step-by-step formula and inputs behind it, e.g.:

  ```
  Calculated Uptime = [1 − (Net Equivalent Closure + TSR Drag) / Total Section-Hours] × 100
  ```

  This is a deliberate design choice: in a safety-critical operational domain, no number should be presented to a controller without a traceable derivation.

### 10. Corridor Topology Visualization
- An interactive line-map sidebar renders the NDLS→AGC trunk as a connected topology (not a plain table) with per-section KM ranges, active-block counts, and contextual notes (e.g. freight yard convergence, quadruple-track bottlenecks).

## 🏗️ Architecture

```
   TMS  ──┐
   SMMS ──┼──►  Data Integration  ──►  Prioritization  ──►  Block Optimizer  ──►  Schedule
   TDMS ──┘        (Asset/Job          (Rule-based FMEA        (OR-Tools CP-SAT,       (Weekly / Monthly)
                     model)              + ML risk score          shadow bundling,             │
   COA  ───────────────────────►         + SHAP drivers)          G&SR/ACTM checks)             ▼
   (Block availability,                                                                  Conflict Arbitration
    Time Table, goods                                                                    & Resolution Audit
    forecast)                                                                                    │
                                                                                                   ▼
                                                                                          Emergency Preemption
                                                                                          (live re-optimization)
```

| Layer | Responsibility |
|---|---|
| **Authentication & Access** | Controller SSO with role-based permissions (Section Controller, Sr. DEN, TPC), zonal scoping (NR/NCR) |
| **Data Integration** | Normalizes TMS/SMMS/TDMS-style defect records and COA-style block availability into a single asset/job schema |
| **Prioritization Engine** | Composite FMEA + ML risk scoring with SHAP explainability per job |
| **Block Optimizer** | OR-Tools CP-SAT constraint solver: assigns block windows, bundles compatible cross-department work, enforces G&SR/ACTM safety rules |
| **Conflict Arbitration** | Detects genuine overlaps, surfaces them for human review, logs resolutions |
| **Schedule Service** | Serves weekly (tactical) and monthly (strategic) plans with rolling re-optimization |
| **Emergency Engine** | Live disruption injection and sub-second re-solve for unscheduled events |

## 📸 Screenshots
<img width="598" height="325" alt="Screenshot 2026-09-27 102521" src="https://github.com/user-attachments/assets/41718564-a7f3-4a15-a2e0-1d708aabb3a5" />
<img width="598" height="325" alt="Screenshot 2026-09-27 102624" src="https://github.com/user-attachments/assets/cf1e9864-c29f-4a8a-b23a-608ff9312313" />
<img width="598" height="325" alt="Screenshot 2026-09-27 102638" src="https://github.com/user-attachments/assets/c1dbd937-1aa3-418a-9666-2d59784abdcc" />
<img width="598" height="325" alt="Screenshot 2026-09-27 110405" src="https://github.com/user-attachments/assets/32afb550-ad97-4bc5-ae13-f797d0409a7f" />
<img width="598" height="325" alt="Screenshot 2026-09-27 102701" src="https://github.com/user-attachments/assets/18b9b698-c15c-40b9-bd72-01ac7f641ff9" />
<img width="598" height="325" alt="Screenshot 2026-09-27 102715" src="https://github.com/user-attachments/assets/31416a7c-4fd5-45c0-b0d9-ae41cb03a7c8" />
<img width="598" height="325" alt="Screenshot 2026-09-27 110418" src="https://github.com/user-attachments/assets/194d913f-eb4c-478f-9cf2-7d3f07679e9a" />
<img width="598" height="325" alt="Screenshot 2026-09-27 102812" src="https://github.com/user-attachments/assets/7262ab7b-4bcc-4cc5-aa39-e6e9ad2e589f" />
<img width="598" height="325" alt="Screenshot 2026-09-27 102826" src="https://github.com/user-attachments/assets/ea3f496c-002a-4d42-a14d-68e9cd2d9a80" />


## 🚀 Getting Started


**Backend**
```bash
cd backend/app
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

API documentation is available at `http://localhost:8000/docs`; the dashboard runs at `http://localhost:5173` (or your configured port).

## 👥 Team

Built by **Team VentureX** for **Smart India Hackathon 2026**, Problem Statement **SIH26027**, issued by the **Ministry of Railways**, Government of India.

Created by [Mayobhav Pathak](https://www.linkedin.com/in/mayobhav-pathak).
