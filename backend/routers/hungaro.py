from fastapi import APIRouter
from pydantic import BaseModel, field_validator
from typing import Literal
from solvers.hungaro import resolver_hungaro

router = APIRouter(prefix="/hungaro", tags=["Asignación"])

class HungaroInput(BaseModel):
    costos: list[list[float]]
    tipo: Literal["min", "max"] = "min"

    @field_validator("costos")
    @classmethod
    def validar_cuadrada(cls, v):
        n = len(v)
        if n == 0:
            raise ValueError("La matriz no puede estar vacía.")
        for row in v:
            if len(row) != n:
                raise ValueError("La matriz debe ser cuadrada (n×n).")
        return v

@router.post("/resolver")
def resolver(data: HungaroInput):
    return resolver_hungaro(costos=data.costos, tipo=data.tipo)
