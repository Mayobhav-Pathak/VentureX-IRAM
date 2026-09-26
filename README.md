<div align="center">
  <img src="./assets/logo.svg" alt="Project Logo" />
  
  # Maintenance Possession Controller
  
  AI-powered block planning for maximizing asset availability on Indian Railways
  
<a href="https://venture-x-iram.vercel.app"><img alt="Static Badge" src="https://img.shields.io/badge/Live_Demo-IRAM-%23F37021?style=flat&labelColor=%231061A8">
</a>

  
</div>

### AI-Powered Automatic Block Planning for Indian Railways
**Smart India Hackathon 2026 — Problem Statement SIH26027 · Ministry of Railways**

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#️-architecture)
- [Tech Stack](#️-tech-stack)
- [API Reference](#-api-reference)
- [Data Model](#️-data-model-core-entities)
- [Getting Started](#-getting-started)
- [Screenshots](#-screenshots)
- [Acknowledgments](#-acknowledgments)

---

## 📋 Problem Statement

Maintenance of Indian Railways' fixed infrastructure — Engineering, Traction Distribution, and Signal & Telecommunication — is currently planned independently by each department through a manual, decentralized block-demand process. Maintenance data such as defects and overdue tasks lives separately in the **Track Management System (TMS)**, **Signalling Maintenance & Management System (SMMS)**, and **Traction Distribution Management System (TDMS)**, while the **Control Office Application (COA)** manages corridor block availability against the Train Time Table and goods-traffic forecast. Without integration and coordinated scheduling, this leads to inefficient block utilization, poor cross-department coordination, and reduced availability of critical infrastructure for train operations.

## 🔎 Overview

**Maintenance Possession Controller** addresses this by unifying maintenance, defect, and corridor-availability data into a single AI-driven scheduling engine that prioritizes, optimizes, and coordinates maintenance blocks (possessions) across departments — over both weekly (tactical) and monthly (strategic) planning horizons.

The current build is piloted on the **Delhi–Agra Saturated Corridor**, covering six sections: New Delhi–Tughlakabad, Tughlakabad–Faridabad, Faridabad–Palwal, Palwal–Kosi Kalan, Kosi Kalan–Mathura, and Mathura–Agra Cantt.

## ✨ Key Features

### 🔗 Unified Data Integration
- A canonical asset/job data model bridging TMS, SMMS, and TDMS defect records with COA's block-availability, Time Table, and goods-forecast data.
- Section-level asset tracking (track segment, kilometer marker, owning department).

### 🎯 Explainable Prioritization
- **Dual scoring** on every maintenance job: a transparent rule-based FMEA/criticality score alongside a machine-learning risk score.
- A **"Why was this prioritized?"** panel showing a SHAP-style driver breakdown (e.g. Defect Severity Code, Days Overdue, Traffic Density, Monsoon Exposure) — so every ranking is auditable, not a black box.

### 📅 Optimized, Multi-Department Scheduling
- A constraint-based block optimizer that fits maintenance jobs into available traffic windows per section.
- **Cross-department bundling** — compatible jobs from different departments (e.g. Engineering + Traction Distribution) share a single possession window, with a computed time-savings figure versus scheduling them separately.
- **Conflict detection & resolution** — overlapping block demands between departments are flagged rather than silently resolved, with a dedicated resolution workflow.

### 🗓️ Multi-Horizon Planning
- **7-Day Tactical view** — exact block time slots per section, on a rolling weekly basis.
- **30-Day Strategic view** — coarse, week-level possession-hour and backlog-index rollups per section, with drill-down into the underlying jobs.

### 📊 Impact Dashboard
- Live KPIs — total possession hours, overdue-backlog cleared, corridor uptime, and pending conflicts — each shown against a pre-optimization baseline for a direct before/after comparison.
- Per-department (Engineering / Signal & Telecommunication / Traction Distribution) breakdown toggle.

## 🏗️ Architecture

```
  TMS  ──┐
  SMMS ──┼──►  Data Integration  ──►  Prioritization  ──►  Block Optimizer  ──►  Schedule
  TDMS ──┘        (Asset/Job          (Rule-based FMEA        (Constraint-based,      (Weekly / Monthly)
                    model)              + ML risk score          multi-dept bundling)         │
  COA  ───────────────────────►         + SHAP drivers)          + conflict detection)         ▼
  (Block availability,                                                                  Conflict Resolution
   Time Table, goods                                                                       Workflow
   forecast)
```

| Layer | Responsibility |
|---|---|
| **Data Integration** | Normalizes defect/maintenance records from TMS, SMMS, TDMS and corridor availability from COA into a single asset/job schema |
| **Prioritization Engine** | Scores every pending job for criticality, urgency, and impact on asset availability (rule-based FMEA + ML risk score with explainability) |
| **Block Optimizer** | Assigns jobs to block windows, bundles compatible cross-department work, and surfaces scheduling conflicts |
| **Schedule Service** | Serves weekly (tactical) and monthly (strategic) plans, with rolling re-optimization as new jobs arrive |

## 🛠️ Tech Stack

> Update this section if your actual implementation differs — this reflects the stack implied by the current build.

- **Backend:** Python, FastAPI (two OpenAPI-documented services: `Railway System API` and `Railway Maintenance Service`)
- **ML / Prioritization:** gradient-boosted model (e.g. XGBoost) for the risk score, SHAP for per-job driver explainability
- **Optimization:** constraint-based scheduling (e.g. OR-Tools CP-SAT) for block assignment, bundling, and conflict detection
- **Frontend:** React, Tailwind CSS
- **Data:** relational database (e.g. PostgreSQL) for asset/job/block/conflict records

## 📡 API Reference

### Railway System API
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/assets/` | Register a new infrastructure asset |
| `GET` | `/assets/{asset_id}` | Retrieve asset details |
| `GET` | `/api/jobs/{job_id}/prioritization` | Get the FMEA + ML risk score and driver breakdown for a job |

### Railway Maintenance Service
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/jobs` | Create a maintenance job (defect / overdue task) |
| `GET` | `/jobs` | List maintenance jobs |
| `POST` | `/schedule/optimize` | Run the block optimizer for a corridor and horizon |
| `GET` | `/schedule` | Retrieve the current weekly or monthly schedule |
| `GET` | `/conflicts` | List pending block conflicts |
| `POST` | `/conflicts/{id}/resolve` | Resolve a flagged block conflict |

## 🗃️ Data Model (core entities)

- **Asset** — a track segment, OHE section, or signal panel; keyed by corridor section, kilometer marker, and owning department.
- **Job** — a maintenance/defect task against an asset (source system, defect severity code, days overdue, traffic density, required duration, computed priority score).
- **Block** — a scheduled possession window (section, start/end time, department(s), bundled-job list, computed time savings if bundled).
- **Conflict** — an unresolved overlap between two or more departments' block demands on the same section and window.

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

Once running, API documentation is available at `http://localhost:8000/docs`, and the dashboard at `http://localhost:5173` (or your configured port).

## 📸 Screenshots

<img width="598" height="325" alt="image" src="https://github.com/user-attachments/assets/cf87e2fc-2e80-47f9-a27f-dfbd6ad8644f" />
<img width="598" height="325" alt="image" src="https://github.com/user-attachments/assets/dfa9ef71-3e18-4b1b-a091-67f331dd279e" />
<img width="598" height="325" alt="image" src="https://github.com/user-attachments/assets/01daba98-70c5-49de-aef5-b26a8677b4a9" />
<img width="598" height="325" alt="image" src="https://github.com/user-attachments/assets/68b86121-7ce2-426b-a524-88f3bc64f98c" />



## 🙏 Acknowledgments

Built for **Smart India Hackathon 2026**, Problem Statement **SIH26027**, issued by the **Ministry of Railways**, Government of India.

