import numpy as np
from typing import Literal

M_BIG = 1e6  # Penalización Gran M

def resolver_simplex(
    obj: list[float],
    restricciones: list[dict],  # [{coefs: [a1,a2,...], op: "<="|">="|"=", rhs: float}]
    tipo: Literal["max", "min"],
    variables: list[str] | None = None
) -> dict:
    """
    Simplex con Gran M. Soporta <=, >= y =.
    Devuelve solución óptima + todas las tablas intermedias.
    """
    n_orig = len(obj)
    m = len(restricciones)
    pasos = []

    if variables is None:
        variables = [f"x{i+1}" for i in range(n_orig)]

    # Convertir a maximización
    c_orig = [float(x) for x in obj]
    if tipo == "min":
        c_obj = [-x for x in c_orig]
    else:
        c_obj = c_orig[:]

    # Construir columnas: variables orig + holguras/exceso + artificiales
    # Primero determinamos cuántas holguras y artificiales necesitamos
    cols_names = list(variables)  # n_orig columnas
    c_full = c_obj[:]             # coeficientes en función objetivo

    # Una holgura/exceso por restricción
    for i in range(m):
        cols_names.append(f"s{i+1}")
        c_full.append(0.0)

    # Artificiales: solo para >= y =
    art_indices = []
    for i, r in enumerate(restricciones):
        if r["op"] in [">=", "="]:
            art_indices.append(len(cols_names))
            cols_names.append(f"a{i+1}")
            c_full.append(-M_BIG)  # penalizar

    n_total = len(cols_names)

    # Construir tableau (m filas, n_total+1 columnas)
    T = np.zeros((m, n_total + 1))
    basis = []

    art_ptr = 0
    for i, r in enumerate(restricciones):
        # Variables originales
        for j in range(n_orig):
            T[i, j] = float(r["coefs"][j]) if j < len(r["coefs"]) else 0.0
        rhs = float(r["rhs"])
        T[i, -1] = rhs

        if r["op"] == "<=":
            T[i, n_orig + i] = 1.0   # holgura +1
            basis.append(n_orig + i)
        elif r["op"] == ">=":
            T[i, n_orig + i] = -1.0  # exceso -1
            art_col = art_indices[art_ptr]; art_ptr += 1
            T[i, art_col] = 1.0       # artificial
            basis.append(art_col)
        else:  # ==
            # no holgura, solo artificial
            art_col = art_indices[art_ptr]; art_ptr += 1
            T[i, art_col] = 1.0
            basis.append(art_col)

    c_arr = np.array(c_full, dtype=float)

    def z_row():
        zr = np.zeros(n_total + 1)
        for j in range(n_total):
            zr[j] = np.dot(c_arr[basis], T[:, j]) - c_arr[j]
        zr[-1] = np.dot(c_arr[basis], T[:, -1])
        return zr

    def snapshot(iteracion, zr):
        base_names = []
        for b in basis:
            base_names.append(cols_names[b])
        return {
            "iteracion": iteracion,
            "base": base_names,
            "tableau": [[round(float(v), 4) for v in T[i]] for i in range(m)],
            "z_row": [round(float(v), 4) for v in zr],
        }

    MAX_ITER = 100
    for it in range(MAX_ITER):
        zr = z_row()
        pasos.append(snapshot(it, zr))

        rc = zr[:n_total]
        if np.all(rc >= -1e-8):
            break

        pivot_col = int(np.argmin(rc))

        ratios = np.full(m, np.inf)
        for i in range(m):
            if T[i, pivot_col] > 1e-8:
                ratios[i] = T[i, -1] / T[i, pivot_col]

        if np.all(ratios == np.inf):
            return {"error": "Solución no acotada (unbounded)."}

        pivot_row = int(np.argmin(ratios))
        basis[pivot_row] = pivot_col

        T[pivot_row] /= T[pivot_row, pivot_col]
        for i in range(m):
            if i != pivot_row:
                T[i] -= T[i, pivot_col] * T[pivot_row]

    # Extraer solución
    solucion = {variables[j]: 0.0 for j in range(n_orig)}
    for i, b in enumerate(basis):
        if b < n_orig:
            solucion[variables[b]] = round(float(T[i, -1]), 6)

    # Verificar artificiales en base con valor > 0 → infeasible
    for i, b in enumerate(basis):
        if b in art_indices and abs(T[i, -1]) > 1e-6:
            return {"error": "El problema no tiene solución factible."}

    z_val = round(float(np.dot(c_arr[basis], T[:, -1])), 6)
    if tipo == "min":
        z_val = -z_val

    interpretacion = (
        f"Solución {'óptima máxima' if tipo == 'max' else 'óptima mínima'}: "
        + ", ".join([f"{k} = {v}" for k, v in solucion.items()])
        + f". Valor de Z = {z_val}."
    )

    return {
        "solucion": solucion,
        "z": z_val,
        "tipo": tipo,
        "iteraciones": len(pasos) - 1,
        "pasos": pasos,
        "interpretacion": interpretacion
    }
