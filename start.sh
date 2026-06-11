#!/usr/bin/env bash
echo "🚀 IO Solver — iniciando backend FastAPI..."
echo ""
echo "📦 Frontend React (dev): cd frontend-react && npm run dev"
echo "🏗️  Frontend React (build): cd frontend-react && npm run build"
echo ""
cd "$(dirname "$0")/backend"
.venv/bin/uvicorn main:app --reload --port 8000
