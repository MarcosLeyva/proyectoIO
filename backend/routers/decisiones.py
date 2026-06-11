from fastapi import APIRouter
from pydantic import BaseModel, field_validator
from typing import Literal
from solvers.decisiones import resolver_decisiones

router = APIRouter(prefix="/decisiones", tags=["Teoría de Decisiones"])

class DecisionesInput(BaseModel):
    alternativas: list[str]
    estados: list[str]
    matriz: list[list[float]]
    probabilidades: list[float] | None = None
    alpha: float = 0.5
    tipo: Literal["max", "min"] = "max"

    @field_validator("matriz")
    @classmethod
    def validar_matriz(cls, v, info):
        data = info.data
        na = len(data.get("alternativas", []))
        ne = len(data.get("estados", []))
        if len(v) != na:
            raise ValueError(f"La matriz debe tener {na} filas (una por alternativa).")
        for row in v:
            if len(row) != ne:
                raise ValueError(f"Cada fila debe tener {ne} columnas (una por estado).")
        return v

    @field_validator("alpha")
    @classmethod
    def validar_alpha(cls, v):
        if not 0 <= v <= 1:
            raise ValueError("Alpha debe estar entre 0 y 1.")
        return v

@router.post("/resolver")
def resolver(data: DecisionesInput):
    return resolver_decisiones(
        alternativas=data.alternativas,
        estados=data.estados,
        matriz=data.matriz,
        probabilidades=data.probabilidades,
        alpha=data.alpha,
        tipo=data.tipo
    )
