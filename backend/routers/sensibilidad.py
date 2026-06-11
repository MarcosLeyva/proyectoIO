from fastapi import APIRouter
from pydantic import BaseModel, field_validator
from typing import Literal
from solvers.sensibilidad import analizar_sensibilidad

router = APIRouter(prefix="/sensibilidad", tags=["Análisis de Sensibilidad"])

class Restriccion(BaseModel):
    coefs: list[float]
    op: Literal["<=", ">=", "="]
    rhs: float

class SensibilidadInput(BaseModel):
    obj: list[float]
    restricciones: list[Restriccion]
    tipo: Literal["max", "min"] = "max"

    @field_validator("restricciones")
    @classmethod
    def no_vacio(cls, v):
        if not v:
            raise ValueError("Se requiere al menos una restricción.")
        return v

@router.post("/resolver")
def resolver(data: SensibilidadInput):
    return analizar_sensibilidad(
        obj=data.obj,
        restricciones=[r.model_dump() for r in data.restricciones],
        tipo=data.tipo,
    )
