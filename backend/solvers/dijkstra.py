"""
Algoritmo de Dijkstra para la ruta más corta en un grafo con pesos no negativos.

Devuelve la ruta óptima, su distancia total, la tabla de etiquetas iteración por
iteración (nodo permanente elegido + distancias tentativas) y la posición de los
nodos para dibujar el grafo en el frontend.
"""
import heapq
import networkx as nx


def resolver_dijkstra(nodos, aristas, origen, destino, dirigido=False):
    """
    nodos: ["A","B",...]
    aristas: [{"from":"A","to":"B","peso":4}, ...]
    origen, destino: str
    dirigido: bool
    """
    if origen not in nodos or destino not in nodos:
        return {"error": "El origen y el destino deben existir en la lista de nodos."}
    for a in aristas:
        if a["peso"] < 0:
            return {"error": "Dijkstra requiere pesos no negativos."}

    G = nx.DiGraph() if dirigido else nx.Graph()
    G.add_nodes_from(nodos)
    for a in aristas:
        u, v, w = a["from"], a["to"], float(a["peso"])
        # Aristas paralelas: conservar la de menor peso (add_edge sobrescribiría)
        if G.has_edge(u, v):
            w = min(w, G[u][v]["weight"])
        G.add_edge(u, v, weight=w)

    # ── Dijkstra con cola de prioridad, registrando los pasos ────────────────
    dist = {n: float("inf") for n in nodos}
    prev = {n: None for n in nodos}
    dist[origen] = 0
    visitados = set()
    pq = [(0.0, origen)]
    pasos = []
    orden_permanentes = []

    while pq:
        d, u = heapq.heappop(pq)
        if u in visitados:
            continue
        visitados.add(u)
        orden_permanentes.append(u)

        # Snapshot de etiquetas tras fijar 'u' como permanente
        etiquetas = {
            n: (None if dist[n] == float("inf") else round(dist[n], 4))
            for n in nodos
        }
        vecinos_actualizados = []
        for v in G.neighbors(u):
            if v in visitados:
                continue
            w = G[u][v]["weight"]
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                prev[v] = u
                heapq.heappush(pq, (dist[v], v))
                vecinos_actualizados.append(f"{v}={round(dist[v], 2)}")

        detalle = f"Nodo permanente: {u} (distancia {round(d, 2)})."
        if vecinos_actualizados:
            detalle += " Se actualizan etiquetas tentativas: " + ", ".join(vecinos_actualizados) + "."
        else:
            detalle += " Sin actualizaciones de vecinos."
        pasos.append({
            "titulo": f"Iteración {len(orden_permanentes)}",
            "detalle": detalle,
            "etiquetas": etiquetas,
            "permanente": u,
        })

    # ── Reconstruir ruta ──────────────────────────────────────────────────────
    if dist[destino] == float("inf"):
        return {"error": f"No existe una ruta entre {origen} y {destino}."}

    ruta = []
    nodo = destino
    while nodo is not None:
        ruta.append(nodo)
        nodo = prev[nodo]
    ruta.reverse()

    # Aristas de la ruta (para resaltar en el grafo)
    aristas_ruta = [{"from": ruta[i], "to": ruta[i + 1]} for i in range(len(ruta) - 1)]

    # Layout del grafo (posiciones normalizadas 0..1) con spring layout determinista
    pos = nx.spring_layout(G, seed=42)
    posiciones = {n: {"x": round(float(p[0]), 4), "y": round(float(p[1]), 4)} for n, p in pos.items()}

    interpretacion = (
        f"La ruta más corta de {origen} a {destino} es {' → '.join(ruta)} "
        f"con una distancia total de {round(dist[destino], 4)}."
    )

    return {
        "ruta": ruta,
        "distancia": round(dist[destino], 4),
        "aristas_ruta": aristas_ruta,
        "distancias": {n: (None if dist[n] == float("inf") else round(dist[n], 4)) for n in nodos},
        "orden_permanentes": orden_permanentes,
        "posiciones": posiciones,
        "aristas": aristas,
        "dirigido": dirigido,
        "pasos": pasos,
        "interpretacion": interpretacion,
    }
