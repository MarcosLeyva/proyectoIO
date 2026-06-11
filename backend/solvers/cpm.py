import networkx as nx

def resolver_cpm(actividades: list[dict], modo: str = "cpm") -> dict:
    """
    CPM y PERT.
    Actividades: [{id, nombre, predecesoras: [], duracion}]  para CPM
                 [{id, nombre, predecesoras: [], optimista, probable, pesimista}] para PERT
    """
    pasos = []

    # Calcular duración esperada PERT o usar CPM
    for act in actividades:
        if modo == "pert":
            o = float(act.get("optimista", 0))
            m = float(act.get("probable", 0))
            p = float(act.get("pesimista", 0))
            act["duracion"] = (o + 4 * m + p) / 6
            act["varianza"] = ((p - o) / 6) ** 2
        else:
            act["duracion"] = float(act.get("duracion", 0))
            act["varianza"] = 0.0

    pasos.append({
        "titulo": f"Modo: {'PERT' if modo == 'pert' else 'CPM'}",
        "detalle": "Duraciones calculadas: " + ", ".join(
            [f"{a['id']}={a['duracion']:.2f}" for a in actividades]
        )
    })

    # Construir grafo dirigido
    G = nx.DiGraph()
    id_set = {a["id"] for a in actividades}
    for act in actividades:
        G.add_node(act["id"], **act)
        for pred in act.get("predecesoras", []):
            if pred in id_set:
                G.add_edge(pred, act["id"])

    if not nx.is_directed_acyclic_graph(G):
        return {"error": "El grafo de actividades contiene ciclos. Revisa las predecesoras."}

    orden = list(nx.topological_sort(G))

    # Paso hacia adelante (Early Start / Early Finish)
    ES = {n: 0.0 for n in G.nodes}
    EF = {}
    for node in orden:
        dur = G.nodes[node]["duracion"]
        predecessors = list(G.predecessors(node))
        if predecessors:
            ES[node] = max(EF[p] for p in predecessors)
        EF[node] = ES[node] + dur

    duracion_proyecto = max(EF.values())

    pasos.append({
        "titulo": "Paso hacia adelante (ES/EF)",
        "detalle": "; ".join([f"{n}: ES={ES[n]:.2f}, EF={EF[n]:.2f}" for n in orden])
    })

    # Paso hacia atrás (Late Start / Late Finish)
    LF = {n: duracion_proyecto for n in G.nodes}
    LS = {}
    for node in reversed(orden):
        dur = G.nodes[node]["duracion"]
        successors = list(G.successors(node))
        if successors:
            LF[node] = min(LS[s] for s in successors)
        LS[node] = LF[node] - dur

    pasos.append({
        "titulo": "Paso hacia atrás (LS/LF)",
        "detalle": "; ".join([f"{n}: LS={LS[n]:.2f}, LF={LF[n]:.2f}" for n in orden])
    })

    # Holguras y ruta crítica
    holguras = {n: round(LS[n] - ES[n], 4) for n in orden}
    ruta_critica = [n for n in orden if abs(holguras[n]) < 1e-8]

    pasos.append({
        "titulo": "Holguras",
        "detalle": "; ".join([f"{n}={holguras[n]:.2f}" for n in orden])
    })

    # Varianza del proyecto (PERT)
    varianza_proyecto = sum(G.nodes[n].get("varianza", 0.0) for n in ruta_critica)
    desv_proyecto = varianza_proyecto ** 0.5 if varianza_proyecto > 0 else 0

    # Aristas del grafo para visualización
    edges = [{"from": u, "to": v} for u, v in G.edges()]

    nodos_info = []
    for node in orden:
        a = G.nodes[node]
        nodos_info.append({
            "id": node,
            "nombre": a.get("nombre", node),
            "duracion": round(a["duracion"], 4),
            "ES": round(ES[node], 4),
            "EF": round(EF[node], 4),
            "LS": round(LS[node], 4),
            "LF": round(LF[node], 4),
            "holgura": holguras[node],
            "critica": node in ruta_critica
        })

    interpretacion = (
        f"Duración total del proyecto: {duracion_proyecto:.2f} unidades de tiempo. "
        f"Ruta crítica: {' → '.join(ruta_critica)}. "
        + (f"Desviación estándar del proyecto (PERT): {desv_proyecto:.4f}." if modo == "pert" else "")
    )

    return {
        "nodos": nodos_info,
        "edges": edges,
        "ruta_critica": ruta_critica,
        "duracion_proyecto": round(duracion_proyecto, 4),
        "varianza_proyecto": round(varianza_proyecto, 6),
        "desv_proyecto": round(desv_proyecto, 6),
        "modo": modo,
        "pasos": pasos,
        "interpretacion": interpretacion
    }
