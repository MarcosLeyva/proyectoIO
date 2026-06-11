from fastapi import APIRouter
from pydantic import BaseModel, field_validator
from solvers.transporte import resolver_transporte

router = APIRouter(prefix="/transporte", tags=["Transporte"])

class TransporteInput(BaseModel):
    oferta: list[float]
    demanda: list[float]
    costos: list[list[float]]

    @field_validator("costos")
    @classmethod
    def validar_costos(cls, v, info):
        data = info.data
        m = len(data.get("oferta", []))
        n = len(data.get("demanda", []))
        if len(v) != m:
            raise ValueError(f"La matriz de costos debe tener {m} filas (una por origen).")
        for row in v:
            if len(row) != n:
                raise ValueError(f"Cada fila de costos debe tener {n} columnas (una por destino).")
        return v

@router.post("/resolver")
def resolver(data: TransporteInput):
    return resolver_transporte(
        oferta=data.oferta,
        demanda=data.demanda,
        costos=data.costos
    )
