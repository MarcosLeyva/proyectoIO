from fastapi import APIRouter
from pydantic import BaseModel, field_validator
from typing import Literal
from solvers.simplex import resolver_simplex

router = APIRouter(prefix="/simplex", tags=["Simplex"])

class Restriccion(BaseModel):
    coefs: list[float]
    op: Literal["<=", ">=", "="]
    rhs: float

class SimplexInput(BaseModel):
    obj: list[float]
    restricciones: list[Restriccion]
    tipo: Literal["max", "min"] = "max"
    variables: list[str] | None = None

    @field_validator("restricciones")
    @classmethod
    def validar_restricciones(cls, v, info):
        if not v:
            raise ValueError("Se requiere al menos una restricción.")
        return v

@router.post("/resolver")
def resolver(data: SimplexInput):
    return resolver_simplex(
        obj=data.obj,
        restricciones=[r.model_dump() for r in data.restricciones],
        tipo=data.tipo,
        variables=data.variables
    )
