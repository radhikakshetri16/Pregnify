# Pregnify

A web-based pregnancy health management application.

## Technology Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Lucide React
- Backend: Python and Flask
- Database: SQLite

## Project Structure

```text
Pregnify/
├── frontend/
└── backend/
```

## Payment sandbox setup

Appointment checkout supports eSewa ePay v2. Configure the backend process with
the variables documented in `backend/.env.example` before starting Flask. In
sandbox mode, eSewa uses its published `EPAYTEST` UAT credential automatically;
production eSewa credentials must always be supplied through environment
variables and never frontend code.

The backend must be reachable at `BACKEND_PUBLIC_URL` because eSewa redirects
the browser to its verification callback. For local testing, keep the
frontend and backend hostnames consistent (use `127.0.0.1` for both) so the
HTTP-only login session cookie is sent correctly.

Run the payment tests from the backend directory:

```powershell
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```
