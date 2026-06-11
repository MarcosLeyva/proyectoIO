import numpy as np
from itertools import combinations
from typing import Literal

def resolver_grafico(
    obj: list[float],          # [c1, c2]
    restricciones: list[dict], # [{a:, b:, op: "<="|">="|"=", rhs:}]
    tipo: Literal["max", "min"]
) -> dict:
    """
    Resuelve PL de 2 variables por método gráfico.
    Devuelve vértices de la región factible, punto óptimo y pasos.
    """
    pasos = []
    c1, c2 = obj

    # Construir matrices A, b, sentidos
    A, b_vec, ops = [], [], []
    for r in restricciones:
        A.append([r["a"], r["b"]])
        b_vec.append(r["rhs"])
        ops.append(r["op"])

    # Convertir todo a <= para análisis (>= → multiplicar por -1)
    A_leq, b_leq = [], []
    for i, op in enumerate(ops):
        if op == "<=":
            A_leq.append(A[i])
            b_leq.append(b_vec[i])
        elif op == ">=":
            A_leq.append([-A[i][0], -A[i][1]])
            b_leq.append(-b_vec[i])
        else:  # ==
            A_leq.append(A[i])
            b_leq.append(b_vec[i])
            A_leq.append([-A[i][0], -A[i][1]])
            b_leq.append(-b_vec[i])

    # Agregar restricciones de no negatividad
    A_leq.append([-1, 0])
    b_leq.append(0)
    A_leq.append([0, -1])
    b_leq.append(0)

    A_np = np.array(A_leq, dtype=float)
    b_np = np.array(b_leq, dtype=float)

    pasos.append({
        "titulo": "Identificar restricciones",
        "detalle": f"Se tienen {len(restricciones)} restricciones más no negatividad (x₁≥0, x₂≥0)."
    })

    # Hallar todos los puntos de intersección entre pares de rectas
    vertices_candidatos = []
    n = len(A_np)
    for i, j in combinations(range(n), 2):
        A_pair = np.array([A_np[i], A_np[j]])
        b_pair = np.array([b_np[i], b_np[j]])
        try:
            if abs(np.linalg.det(A_pair)) < 1e-10:
                continue
            punto = np.linalg.solve(A_pair, b_pair)
            vertices_candidatos.append(punto)
        except np.linalg.LinAlgError:
            continue

    pasos.append({
        "titulo": "Hallar intersecciones",
        "detalle": f"Se encontraron {len(vertices_candidatos)} intersecciones entre pares de rectas."
    })

    # Filtrar puntos factibles
    vertices_factibles = []
    for p in vertices_candidatos:
        if np.all(A_np @ p <= b_np + 1e-8):
            vertices_factibles.append(p)

    if not vertices_factibles:
        return {"error": "La región factible está vacía. Revisa las restricciones."}

    pasos.append({
        "titulo": "Filtrar región factible",
        "detalle": f"{len(vertices_factibles)} vértice(s) pertenecen a la región factible."
    })

    # Evaluar función objetivo en cada vértice
    evaluaciones = []
    for p in vertices_factibles:
        z = c1 * p[0] + c2 * p[1]
        evaluaciones.append({"x1": round(float(p[0]), 6), "x2": round(float(p[1]), 6), "z": round(float(z), 6)})

    pasos.append({
        "titulo": "Evaluar función objetivo",
        "detalle": "Z = " + " + ".join([f"{c}·x{i+1}" for i, c in enumerate([c1, c2])]) +
                   " evaluada en cada vértice: " +
                   ", ".join([f"({e['x1']},{e['x2']})→{e['z']}" for e in evaluaciones])
    })

    # Elegir óptimo
    if tipo == "max":
        optimo = max(evaluaciones, key=lambda e: e["z"])
    else:
        optimo = min(evaluaciones, key=lambda e: e["z"])

    interpretacion = (
        f"La solución {'óptima' if tipo == 'max' else 'mínima'} se alcanza en "
        f"x₁ = {optimo['x1']}, x₂ = {optimo['x2']} "
        f"con un valor {'máximo' if tipo == 'max' else 'mínimo'} de Z = {optimo['z']}."
    )

    pasos.append({
        "titulo": f"Seleccionar {'máximo' if tipo == 'max' else 'mínimo'}",
        "detalle": interpretacion
    })

    return {
        "vertices": evaluaciones,
        "optimo": optimo,
        "tipo": tipo,
        "pasos": pasos,
        "interpretacion": interpretacion,
        # Datos para graficar rectas
        "rectas": [
            {"a": r["a"], "b": r["b"], "op": r["op"], "rhs": r["rhs"]}
            for r in restricciones
        ]
    }
