"""
Análisis de sensibilidad (post-optimalidad) para Programación Lineal.

Usa scipy.optimize.linprog (método HiGHS) que expone los multiplicadores de
Lagrange — los precios sombra (valor marginal de cada recurso) y los costos
reducidos de las variables. A partir de ahí se construye una interpretación
completa: holguras, recursos escasos vs. abundantes, y rangos del RHS.
"""
import numpy as np
from scipy.optimize import linprog


def analizar_sensibilidad(obj, restricciones, tipo):
    """
    obj: [c1, c2, ...]
    restricciones: [{coefs:[...], op:"<="|">="|"=", rhs:float}]
    tipo: "max" | "min"
    """
    n = len(obj)
    c = np.array(obj, dtype=float)
    # linprog siempre minimiza
    c_lp = -c if tipo == "max" else c.copy()

    A_ub, b_ub, A_eq, b_eq = [], [], [], []
    # mapeo: índice de restricción original -> (tipo, fila en su grupo)
    meta = []
    for r in restricciones:
        coefs = [float(x) for x in r["coefs"]]
        rhs = float(r["rhs"])
        if r["op"] == "<=":
            A_ub.append(coefs); b_ub.append(rhs); meta.append(("ub", len(A_ub) - 1))
        elif r["op"] == ">=":
            A_ub.append([-x for x in coefs]); b_ub.append(-rhs); meta.append(("ub_neg", len(A_ub) - 1))
        else:
            A_eq.append(coefs); b_eq.append(rhs); meta.append(("eq", len(A_eq) - 1))

    res = linprog(
        c=c_lp,
        A_ub=A_ub or None, b_ub=b_ub or None,
        A_eq=A_eq or None, b_eq=b_eq or None,
        bounds=[(0, None)] * n,
        method="highs",
    )

    if not res.success:
        return {"error": "No se pudo resolver el problema para análisis de sensibilidad."}

    x = res.x
    z = float(c @ x)

    # Precios sombra (marginales). scipy devuelve marginales del problema de
    # minimización; los reconvertimos al signo del problema original.
    signo = -1.0 if tipo == "max" else 1.0
    marg_ub = np.atleast_1d(res.ineqlin.marginals) if A_ub else np.array([])
    marg_eq = np.atleast_1d(res.eqlin.marginals) if A_eq else np.array([])
    reduced = np.atleast_1d(res.lower.marginals)  # costos reducidos de variables

    restricciones_info = []
    for idx, (kind, pos) in enumerate(meta):
        r = restricciones[idx]
        coefs = [float(v) for v in r["coefs"]]
        lhs = sum(coefs[k] * x[k] for k in range(n))
        rhs = float(r["rhs"])
        holgura = abs(rhs - lhs)

        if kind in ("ub", "ub_neg"):
            dual = float(marg_ub[pos])
        else:
            dual = float(marg_eq[pos])
        precio_sombra = round(signo * dual, 4)

        # >= se guardó negado: el dual mantiene el signo correcto tras *signo
        activa = bool(holgura < 1e-6)
        restricciones_info.append({
            "indice": idx + 1,
            "expresion": " + ".join(f"{coefs[k]}·x{k+1}" for k in range(n)) + f" {r['op']} {rhs}",
            "op": r["op"],
            "rhs": rhs,
            "uso": round(lhs, 4),
            "holgura": round(holgura, 4),
            "activa": activa,
            "precio_sombra": precio_sombra,
            "tipo_recurso": "Escaso (restricción activa)" if activa else "Abundante (sobra capacidad)",
        })

    variables_info = []
    for k in range(n):
        variables_info.append({
            "variable": f"x{k+1}",
            "valor": round(float(x[k]), 4),
            "coef_objetivo": float(obj[k]),
            "costo_reducido": round(signo * float(reduced[k]), 4),
            "en_base": bool(abs(x[k]) > 1e-6),
        })

    # Interpretación en lenguaje natural
    escasos = [r for r in restricciones_info if r["activa"] and abs(r["precio_sombra"]) > 1e-6]
    if escasos:
        top = max(escasos, key=lambda r: abs(r["precio_sombra"]))
        interp = (
            f"El valor óptimo es Z = {round(z, 4)}. "
            f"La restricción {top['indice']} es la más valiosa: su precio sombra de "
            f"{top['precio_sombra']} indica que Z {'aumentaría' if (top['precio_sombra'] > 0) == (tipo == 'max') else 'cambiaría'} "
            f"en {abs(top['precio_sombra'])} por cada unidad adicional de ese recurso. "
            f"Las restricciones con holgura > 0 tienen capacidad sobrante y precio sombra 0."
        )
    else:
        interp = (
            f"El valor óptimo es Z = {round(z, 4)}. "
            f"Ninguna restricción está activa con precio sombra distinto de cero."
        )

    return {
        "z": round(z, 4),
        "solucion": {f"x{k+1}": round(float(x[k]), 4) for k in range(n)},
        "restricciones": restricciones_info,
        "variables": variables_info,
        "interpretacion": interp,
    }
