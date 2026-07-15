# نظام أجير – Ajar Work Permit Management System

A full-stack Arabic RTL work-permit management system built with Flask (Python) backend and React/Vite frontend.

## Architecture

- **Backend**: Flask (Python) REST API — `python main.py` → port **8000**
- **Frontend**: React + Vite + Tailwind CSS (Arabic RTL) — `cd frontend && npm run dev` → port **5000**
- **Data**: In-memory store with seed data (no external database)
- **PDF generation**: reportlab + arabic-reshaper for official Ajeer permit PDFs

## How to Run

Two workflows run automatically:

| Workflow | Command | Port | Purpose |
|----------|---------|------|---------|
| **Backend** | `python main.py` | 8000 | Flask REST API |
| **Start application** | `cd frontend && npm run dev` | 5000 | Vite dev server (shown in preview) |

The Vite dev server proxies all `/api/*` requests to Flask on port 8000.

## Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| مدير النظام (Admin) | `admin` | `admin123` |
| مشرف (Manager) | `manager1` | `manager123` |
| مشغل (Operator) | `operator1` | `operator123` |

## API Endpoints

- `POST /api/auth/login` — Login
- `GET  /api/dashboard/stats` — Dashboard statistics
- `GET  /api/permits/` — List/filter permits
- `POST /api/permits/` — Create permit
- `GET  /api/permits/:id` — Get permit details
- `GET  /api/permits/:id/pdf` — Download permit PDF
- `GET  /api/permits/:id/qr` — Get permit QR code
- `GET|POST /api/workers/` — Workers CRUD
- `GET|POST /api/companies/` — Companies CRUD
- `GET|POST /api/users/` — Users CRUD (admin only)
- `GET  /api/logs/` — Activity logs
- `GET  /api/search/` — Global search

## Package Notes

- Python deps installed via `pip` into `.pythonlibs/`
- Frontend deps in `frontend/node_modules/`
- The `main.py` entry point creates a `server` module alias so all routes importing `server.*` resolve correctly

## User Preferences

- Arabic RTL interface throughout
- Professional, responsive, interactive design
