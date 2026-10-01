# AI-Powered Mock Interview Evaluation System

A full-stack web application that simulates real-world mock interviews and evaluates candidates
using text, voice, and video-based analysis. Only **structured insights** (scores and metrics) are
stored - never raw audio, images, or video.

## Features

### Candidate
- Select a **category** (Software Engineer, Data Scientist, Data Analyst, Database Administrator, Frontend Developer, DevOps Engineer) and an **experience level** (Fresher / Mid-Level / Senior).
- Interview engine automatically serves **5 theory questions** (Easy/Medium/Hard mix) plus **1-2 programming questions**.
- Per question capture:
  - **Written answer** (text)
  - **Voice recording** - analyzed locally for tone, pace, hesitation and pauses
  - **Video capture** - analyzed locally for attention, engagement and malpractice signals
- Structured report with correctness, confidence, behavior scores, overall rating, strengths,
  weaknesses and a Hire / Improve / Reject recommendation.

### Admin
- Secure login (JWT, role-based access).
- Create and manage categories.
- Upload and manage the question bank, tagged by category, difficulty and type.
- View and analyze candidate reports plus aggregate analytics.

## Evaluation

| Dimension | How it works |
|-----------|--------------|
| Correctness | `USER_LLM_*` OpenAI-compatible LLM when configured, otherwise an offline semantic/keyword evaluator (token cosine similarity + keyword coverage + code signals). |
| Confidence | Text clarity/structure/completeness heuristics combined with voice metrics (speech ratio, pauses, pace, pitch variance). |
| Behavior | Attention, engagement and malpractice scores derived from webcam sampling (face presence/centering, tab switches, window blur) - computed in the browser. |
| Report | Weighted aggregation (Correctness 50%, Confidence 25%, Behavior 25%) with grade, strengths, weaknesses and recommendation. |

### Privacy constraint
Video frames are drawn to a tiny canvas and immediately discarded. Voice is analyzed in the browser
with the Web Audio API. **Only numeric metrics/flags are sent to the server and stored in MongoDB.**

## Tech stack

- **Frontend**: React + TypeScript + Vite, React Router, Recharts.
- **Backend**: Node.js + Express + Mongoose (MongoDB).
- **Database**: MongoDB Atlas (or an embedded in-memory MongoDB for local development when
  `MONGODB_URI` is not set).

## Getting started

```bash
# Install backend dependencies
npm install --prefix backend

# Install frontend dependencies
npm install --prefix frontend

# (Optional) configure the database and LLM evaluator
cp backend/.env.example backend/.env

# Seed categories, the question bank and the admin account
npm run seed --prefix backend

# Start both services (frontend on http://localhost:5173, backend on http://localhost:3001)
./start.sh
```

Open `http://localhost:5173`. The Vite dev server reverse-proxies `/api` to the backend.

### Default admin credentials

```
Email:    admin@example.com
Password: admin123
```

Candidates can self-register from the login page.

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | Backend port (default `3001`). |
| `MONGODB_URI` | MongoDB Atlas connection string. When empty, an embedded in-memory MongoDB is used for local development. |
| `JWT_SECRET` | Secret used to sign auth tokens. |
| `SEED_ADMIN_*` | Admin account created during seeding. |
| `USER_LLM_API_KEY` | Optional. Your own OpenAI-compatible key to enable LLM evaluation. |
| `USER_LLM_BASE_URL` | Optional. Base URL of the OpenAI-compatible endpoint. |
| `USER_LLM_MODEL` | Optional. Model name used for evaluation. |

If `USER_LLM_API_KEY` is empty, the system automatically uses the offline evaluator, so the app
works out of the box.

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a candidate. |
| `POST` | `/api/auth/login` | Login (candidate or admin). |
| `GET` | `/api/categories` | List active categories. |
| `POST` | `/api/interviews` | Start an interview and generate the question set. |
| `POST` | `/api/interviews/:id/answers` | Submit and evaluate an answer. |
| `POST` | `/api/interviews/:id/complete` | Finish and generate the report. |
| `GET` | `/api/admin/stats` | Aggregate analytics. |
| `GET/POST/PUT/DELETE` | `/api/admin/categories` | Manage categories. |
| `GET/POST/PUT/DELETE` | `/api/admin/questions` | Manage the question bank. |
| `GET` | `/api/admin/reports` | List candidate reports. |

## Data stored

- Users (candidates/admins)
- Categories
- Questions (with expected answer, keywords, tags)
- Interview sessions (question snapshots, answers, metrics, report)

**Not stored:** video, images, raw audio.
