def resolver_decisiones(
    alternativas: list[str],
    estados: list[str],
    matriz: list[list[float]],
    probabilidades: list[float] | None = None,
    alpha: float = 0.5,
    tipo: str = "max"  # "max" beneficio o "min" costo
) -> dict:
    """
    Teoría de decisiones bajo incertidumbre y riesgo.
    Criterios: Maximax/Minimax, Maximin/Minimin, Hurwicz, Laplace, Valor Esperado.
    """
    pasos = []
    na = len(alternativas)
    ne = len(estados)
    M = [[float(v) for v in row] for row in matriz]

    # Funciones auxiliares según tipo
    mejor = max if tipo == "max" else min
    peor  = min if tipo == "max" else max
    nombre_optimista  = "Maximax" if tipo == "max" else "Minimax"
    nombre_pesimista  = "Maximin" if tipo == "max" else "Minimin"

    resultados = {}

    # 1. Criterio Optimista (Maximax/Minimax)
    filas_mejor = [mejor(M[i]) for i in range(na)]
    idx_opt = filas_mejor.index(mejor(filas_mejor))
    resultados[nombre_optimista] = {
        "valores": filas_mejor,
        "decision": alternativas[idx_opt],
        "valor": filas_mejor[idx_opt]
    }
    pasos.append({
        "titulo": f"Criterio Optimista ({nombre_optimista})",
        "detalle": (
            f"Para cada alternativa tomar el {'mejor' if tipo=='max' else 'menor'} valor: "
            + ", ".join([f"{alternativas[i]}={filas_mejor[i]}" for i in range(na)])
            + f". Decisión: {alternativas[idx_opt]} ({filas_mejor[idx_opt]})"
        )
    })

    # 2. Criterio Pesimista (Maximin/Minimin)
    filas_peor = [peor(M[i]) for i in range(na)]
    idx_pes = filas_peor.index(mejor(filas_peor))
    resultados[nombre_pesimista] = {
        "valores": filas_peor,
        "decision": alternativas[idx_pes],
        "valor": filas_peor[idx_pes]
    }
    pasos.append({
        "titulo": f"Criterio Pesimista ({nombre_pesimista})",
        "detalle": (
            f"Para cada alternativa tomar el {'peor' if tipo=='max' else 'mayor'} valor: "
            + ", ".join([f"{alternativas[i]}={filas_peor[i]}" for i in range(na)])
            + f". Decisión: {alternativas[idx_pes]} ({filas_peor[idx_pes]})"
        )
    })

    # 3. Criterio de Hurwicz
    hurwicz_vals = [alpha * filas_mejor[i] + (1 - alpha) * filas_peor[i] for i in range(na)]
    idx_hur = hurwicz_vals.index(mejor(hurwicz_vals))
    resultados["Hurwicz"] = {
        "alpha": alpha,
        "valores": hurwicz_vals,
        "decision": alternativas[idx_hur],
        "valor": hurwicz_vals[idx_hur]
    }
    pasos.append({
        "titulo": f"Criterio de Hurwicz (α={alpha})",
        "detalle": (
            f"H = α·{nombre_optimista[4:].lower()} + (1-α)·{nombre_pesimista[4:].lower()}: "
            + ", ".join([f"{alternativas[i]}={hurwicz_vals[i]:.4f}" for i in range(na)])
            + f". Decisión: {alternativas[idx_hur]}"
        )
    })

    # 4. Criterio de Laplace (igual probabilidad)
    laplace_vals = [sum(M[i]) / ne for i in range(na)]
    idx_lap = laplace_vals.index(mejor(laplace_vals))
    resultados["Laplace"] = {
        "valores": laplace_vals,
        "decision": alternativas[idx_lap],
        "valor": laplace_vals[idx_lap]
    }
    pasos.append({
        "titulo": "Criterio de Laplace (igual probabilidad)",
        "detalle": (
            "Promedio de cada fila: "
            + ", ".join([f"{alternativas[i]}={laplace_vals[i]:.4f}" for i in range(na)])
            + f". Decisión: {alternativas[idx_lap]}"
        )
    })

    # 5. Valor Esperado (si hay probabilidades)
    if probabilidades and abs(sum(probabilidades) - 1.0) < 0.01:
        p = [float(x) for x in probabilidades]
        ve_vals = [sum(M[i][j] * p[j] for j in range(ne)) for i in range(na)]
        idx_ve = ve_vals.index(mejor(ve_vals))
        resultados["Valor Esperado"] = {
            "probabilidades": p,
            "valores": ve_vals,
            "decision": alternativas[idx_ve],
            "valor": ve_vals[idx_ve]
        }
        pasos.append({
            "titulo": "Valor Esperado (VE)",
            "detalle": (
                "VE = Σ P(j)·pago: "
                + ", ".join([f"{alternativas[i]}={ve_vals[i]:.4f}" for i in range(na)])
                + f". Decisión: {alternativas[idx_ve]}"
            )
        })

        # Valor esperado de información perfecta (VEIP)
        mejor_por_estado = [mejor(M[i][j] for i in range(na)) for j in range(ne)]
        vep = sum(mejor_por_estado[j] * p[j] for j in range(ne))
        veip = abs(vep - ve_vals[idx_ve])
        resultados["VEIP"] = {"VEP": round(vep, 4), "VEIP": round(veip, 4)}
        pasos.append({
            "titulo": "VEIP – Valor Esperado de Información Perfecta",
            "detalle": f"VEP = {vep:.4f}; VE* = {ve_vals[idx_ve]:.4f}; VEIP = {veip:.4f}"
        })

    # Consenso: criterio más frecuente
    decisiones_lista = [v["decision"] for v in resultados.values() if isinstance(v, dict) and "decision" in v]
    consenso = max(set(decisiones_lista), key=decisiones_lista.count)
    votos = decisiones_lista.count(consenso)

    interpretacion = (
        f"La alternativa más recomendada es '{consenso}' "
        f"(elegida por {votos} de {len(decisiones_lista)} criterios)."
    )

    return {
        "resultados": resultados,
        "pasos": pasos,
        "interpretacion": interpretacion,
        "consenso": consenso
    }
