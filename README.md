# VIMS - Vendor Invoice Management System

## Project Info

VIMS is a multi-tenant SaaS application for vendor invoice management, built for Horizon Industrial Parks.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Django, Django REST Framework, PostgreSQL

## Development Setup

### Prerequisites

- Node.js 18+ (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Python 3.11+
- PostgreSQL

### Frontend Setup

```sh
# Navigate to Frontend directory
cd Frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Backend Setup

```sh
# Navigate to NewBackend directory
cd NewBackend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

The backend API will be available at `http://localhost:8000`

## Project Structure

- `Frontend/` - React frontend application
- `NewBackend/` - Django backend API
- `Server-Knowledge/` - Project documentation and specs
