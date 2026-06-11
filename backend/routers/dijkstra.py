from fastapi import APIRouter
from pydantic import BaseModel, field_validator
from solvers.dijkstra import resolver_dijkstra

router = APIRouter(prefix="/dijkstra", tags=["Ruta más corta"])

class DijkstraInput(BaseModel):
    nodos: list[str]
    aristas: list[dict]
    origen: str
    destino: str
    dirigido: bool = False

    @field_validator("nodos")
    @classmethod
    def min_nodos(cls, v):
        if len(v) < 2:
            raise ValueError("Se requieren al menos 2 nodos.")
        return v

    @field_validator("aristas")
    @classmethod
    def min_aristas(cls, v):
        if not v:
            raise ValueError("Se requiere al menos una arista.")
        for a in v:
            if "from" not in a or "to" not in a or "peso" not in a:
                raise ValueError("Cada arista necesita 'from', 'to' y 'peso'.")
        return v

@router.post("/resolver")
def resolver(data: DijkstraInput):
    return resolver_dijkstra(
        nodos=data.nodos,
        aristas=data.aristas,
        origen=data.origen,
        destino=data.destino,
        dirigido=data.dirigido,
    )
