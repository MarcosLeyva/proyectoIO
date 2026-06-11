from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from routers import grafico, simplex, transporte, hungaro, cpm, decisiones, sensibilidad, dijkstra

app = FastAPI(
    title="IO Solver API",
    description="API de técnicas de Investigación de Operaciones",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(grafico.router)
app.include_router(simplex.router)
app.include_router(transporte.router)
app.include_router(hungaro.router)
app.include_router(cpm.router)
app.include_router(decisiones.router)
app.include_router(sensibilidad.router)
app.include_router(dijkstra.router)

# Serve React build (frontend/dist) if it exists, otherwise fall back to legacy frontend
BASE = Path(__file__).parent.parent
DIST = BASE / "frontend" / "dist"
LEGACY = BASE / "frontend"

if DIST.exists() and (DIST / "index.html").exists():
    # Serve built React app
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/")
    def root():
        return FileResponse(DIST / "index.html")

    # Catch-all for React Router (SPA)
    @app.get("/{full_path:path}")
    def spa(full_path: str):
        index = DIST / "index.html"
        return FileResponse(index)

else:
    # Fallback: serve legacy HTML/CSS/JS frontend
    app.mount("/static", StaticFiles(directory=LEGACY), name="static")

    @app.get("/")
    def root():
        return FileResponse(LEGACY / "index.html")
