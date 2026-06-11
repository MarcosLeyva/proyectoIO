from fastapi import APIRouter
from pydantic import BaseModel, field_validator
from typing import Literal
from solvers.grafico import resolver_grafico

router = APIRouter(prefix="/grafico", tags=["Método Gráfico"])

class Restriccion(BaseModel):
    a: float
    b: float
    op: Literal["<=", ">=", "="]
    rhs: float

class GraficoInput(BaseModel):
    obj: list[float]
    restricciones: list[Restriccion]
    tipo: Literal["max", "min"] = "max"

    @field_validator("obj")
    @classmethod
    def validar_obj(cls, v):
        if len(v) != 2:
            raise ValueError("El método gráfico requiere exactamente 2 variables.")
        return v

    @field_validator("restricciones")
    @classmethod
    def validar_restricciones(cls, v):
        if len(v) < 1:
            raise ValueError("Se requiere al menos una restricción.")
        return v

@router.post("/resolver")
def resolver(data: GraficoInput):
    return resolver_grafico(
        obj=data.obj,
        restricciones=[r.model_dump() for r in data.restricciones],
        tipo=data.tipo
    )
