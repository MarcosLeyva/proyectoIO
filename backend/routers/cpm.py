from fastapi import APIRouter
from pydantic import BaseModel
from typing import Literal
from solvers.cpm import resolver_cpm

router = APIRouter(prefix="/cpm", tags=["CPM/PERT"])

class Actividad(BaseModel):
    id: str
    nombre: str
    predecesoras: list[str] = []
    duracion: float | None = None
    optimista: float | None = None
    probable: float | None = None
    pesimista: float | None = None

class CpmInput(BaseModel):
    actividades: list[Actividad]
    modo: Literal["cpm", "pert"] = "cpm"

@router.post("/resolver")
def resolver(data: CpmInput):
    return resolver_cpm(
        actividades=[a.model_dump() for a in data.actividades],
        modo=data.modo
    )
