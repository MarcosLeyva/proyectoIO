from copy import deepcopy
from collections import deque


def resolver_transporte(
    oferta: list[float],
    demanda: list[float],
    costos: list[list[float]]
) -> dict:
    """
    Problema de transporte: Vogel para la solución inicial, MODI para optimizar.

    La base se rastrea explícitamente como conjunto de celdas. Si Vogel produce
    una solución degenerada (< m+n-1 celdas básicas), se completa con celdas de
    asignación cero hasta formar un árbol de expansión — sin esto, MODI no puede
    calcular los multiplicadores u/v y se detendría antes de alcanzar el óptimo.
    """
    pasos = []
    oferta = [float(x) for x in oferta]
    demanda = [float(x) for x in demanda]
    C = [[float(x) for x in row] for row in costos]
    m, n = len(oferta), len(demanda)

    # ── Balanceo ──────────────────────────────────────────────────────────────
    total_oferta, total_demanda = sum(oferta), sum(demanda)
    balanceo = None
    if abs(total_oferta - total_demanda) > 1e-8:
        if total_oferta > total_demanda:
            demanda.append(total_oferta - total_demanda)
            for row in C:
                row.append(0.0)
            n += 1
            balanceo = (f"Demanda < Oferta: se agregó destino ficticio con demanda "
                        f"{total_oferta - total_demanda:.2f} y costos 0.")
        else:
            oferta.append(total_demanda - total_oferta)
            C.append([0.0] * n)
            m += 1
            balanceo = (f"Oferta < Demanda: se agregó origen ficticio con oferta "
                        f"{total_demanda - total_oferta:.2f} y costos 0.")
        pasos.append({"titulo": "Balanceo", "detalle": balanceo})

    INF = float("inf")

    # ── Método de Vogel (solución básica inicial) ─────────────────────────────
    asig = [[0.0] * n for _ in range(m)]
    basis = set()          # celdas básicas (incluye las de asignación 0)
    of, de = oferta[:], demanda[:]
    fila_activa = [True] * m
    col_activa = [True] * n

    def penalidad_fila(i):
        vals = sorted(C[i][j] for j in range(n) if col_activa[j])
        if not vals: return -1
        return vals[1] - vals[0] if len(vals) >= 2 else vals[0]

    def penalidad_col(j):
        vals = sorted(C[i][j] for i in range(m) if fila_activa[i])
        if not vals: return -1
        return vals[1] - vals[0] if len(vals) >= 2 else vals[0]

    while any(fila_activa) and any(col_activa):
        mejor_pen, es_fila, idx = -1, True, -1
        for i in range(m):
            if fila_activa[i]:
                p = penalidad_fila(i)
                if p > mejor_pen:
                    mejor_pen, es_fila, idx = p, True, i
        for j in range(n):
            if col_activa[j]:
                p = penalidad_col(j)
                if p > mejor_pen:
                    mejor_pen, es_fila, idx = p, False, j

        if idx == -1:
            break

        if es_fila:
            i = idx
            j = min((jj for jj in range(n) if col_activa[jj]), key=lambda jj: C[i][jj])
        else:
            j = idx
            i = min((ii for ii in range(m) if fila_activa[ii]), key=lambda ii: C[ii][j])

        cantidad = min(of[i], de[j])
        asig[i][j] += cantidad
        basis.add((i, j))
        of[i] -= cantidad
        de[j] -= cantidad

        # Cerrar solo una dimensión por iteración (manejo de degeneración):
        # si ambas quedan en 0, la otra se cierra en una iteración posterior
        # con una asignación de 0 que conserva la celda básica.
        if of[i] <= 1e-8 and any(col_activa[jj] and jj != j for jj in range(n)):
            fila_activa[i] = False
        if de[j] <= 1e-8:
            col_activa[j] = False
        elif of[i] <= 1e-8:
            fila_activa[i] = False
        if not any(fila_activa):
            break

    costo_inicial = sum(asig[i][j] * C[i][j] for i in range(m) for j in range(n))
    pasos.append({
        "titulo": "Solución inicial (Vogel)",
        "detalle": f"Costo inicial = {costo_inicial:.2f}. Celdas básicas: {len(basis)} de {m + n - 1} requeridas.",
        "asignacion": deepcopy(asig)
    })

    # ── Completar base degenerada hasta árbol de expansión ───────────────────
    # Grafo bipartito: nodos fila 0..m-1, nodos columna m..m+n-1.
    # La base debe ser un árbol con m+n-1 aristas (celdas).
    parent = list(range(m + n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra == rb:
            return False
        parent[ra] = rb
        return True

    for (i, j) in basis:
        union(i, m + j)

    if len(basis) < m + n - 1:
        # Agregar celdas de asignación 0 (las más baratas) que unan componentes
        candidatas = sorted(
            ((C[i][j], i, j) for i in range(m) for j in range(n) if (i, j) not in basis)
        )
        agregadas = []
        for _, i, j in candidatas:
            if len(basis) >= m + n - 1:
                break
            if union(i, m + j):
                basis.add((i, j))
                agregadas.append(f"({i+1},{j+1})")
        if agregadas:
            pasos.append({
                "titulo": "Corrección de degeneración",
                "detalle": ("Solución inicial degenerada: se agregaron celdas básicas con "
                            f"asignación 0 en {', '.join(agregadas)} para completar las "
                            f"{m + n - 1} celdas que requiere MODI.")
            })

    # ── MODI (transportation simplex sobre el árbol de la base) ──────────────
    def calcular_uv():
        u = [None] * m
        v = [None] * n
        u[0] = 0.0
        # BFS sobre el árbol de la base
        adj_fila = {i: [] for i in range(m)}
        adj_col = {j: [] for j in range(n)}
        for (i, j) in basis:
            adj_fila[i].append(j)
            adj_col[j].append(i)
        cola = deque([("R", 0)])
        while cola:
            tipo, k = cola.popleft()
            if tipo == "R":
                for j in adj_fila[k]:
                    if v[j] is None:
                        v[j] = C[k][j] - u[k]
                        cola.append(("C", j))
            else:
                for i in adj_col[k]:
                    if u[i] is None:
                        u[i] = C[i][k] - v[k]
                        cola.append(("R", i))
        return u, v

    def hallar_ciclo(pi, pj):
        """Camino en el árbol de la base desde fila pi hasta columna pj.
        Junto con la celda entrante (pi,pj) forma el único ciclo."""
        adj = {("R", i): [] for i in range(m)}
        adj.update({("C", j): [] for j in range(n)})
        for (i, j) in basis:
            adj[("R", i)].append(("C", j, (i, j)))
            adj[("C", j)].append(("R", i, (i, j)))

        # BFS de ("R", pi) a ("C", pj) registrando las celdas usadas
        inicio, fin = ("R", pi), ("C", pj)
        prev = {inicio: None}
        cola = deque([inicio])
        while cola:
            nodo = cola.popleft()
            if nodo == fin:
                break
            for vecino in adj[nodo]:
                nx = (vecino[0], vecino[1])
                if nx not in prev:
                    prev[nx] = (nodo, vecino[2])
                    cola.append(nx)
        if fin not in prev:
            return None

        celdas_camino = []
        nodo = fin
        while prev[nodo] is not None:
            anterior, celda = prev[nodo]
            celdas_camino.append(celda)
            nodo = anterior
        celdas_camino.reverse()
        # Ciclo: celda entrante (signo +) seguida del camino (alternando -, +, ...)
        return [(pi, pj)] + celdas_camino

    MAX_ITER = 200
    for it in range(MAX_ITER):
        u, v = calcular_uv()
        if None in u or None in v:
            # No debería ocurrir con la base completada, pero por seguridad
            break

        # Celda entrante: costo reducido más negativo
        mejor_delta, entrante = -1e-9, None
        for i in range(m):
            for j in range(n):
                if (i, j) not in basis:
                    delta = C[i][j] - u[i] - v[j]
                    if delta < mejor_delta:
                        mejor_delta, entrante = delta, (i, j)

        if entrante is None:
            pasos.append({
                "titulo": "Optimalidad alcanzada",
                "detalle": f"Todos los costos reducidos son ≥ 0 tras {it} iteración(es) de MODI."
            })
            break

        pi, pj = entrante
        ciclo = hallar_ciclo(pi, pj)
        if not ciclo:
            break

        # Posiciones impares del ciclo llevan signo − ; θ = mínima asignación en ellas
        menos = [ciclo[k] for k in range(1, len(ciclo), 2)]
        theta = min(asig[i][j] for (i, j) in menos)
        saliente = next((i, j) for (i, j) in menos if asig[i][j] == theta)

        for k, (i, j) in enumerate(ciclo):
            if k % 2 == 0:
                asig[i][j] += theta
            else:
                asig[i][j] -= theta
                if asig[i][j] < 1e-9:
                    asig[i][j] = 0.0

        basis.discard(saliente)
        basis.add(entrante)

        costo_it = sum(asig[i][j] * C[i][j] for i in range(m) for j in range(n))
        pasos.append({
            "titulo": f"MODI iteración {it + 1}",
            "detalle": (f"Entra celda ({pi+1},{pj+1}) con costo reducido {mejor_delta:.2f}; "
                        f"sale ({saliente[0]+1},{saliente[1]+1}) con θ = {theta:.2f}. "
                        f"Costo = {costo_it:.2f}"),
            "asignacion": deepcopy(asig)
        })

    costo_final = sum(asig[i][j] * C[i][j] for i in range(m) for j in range(n))
    pasos.append({
        "titulo": "Solución óptima",
        "detalle": f"Costo mínimo total = {costo_final:.2f}",
        "asignacion": deepcopy(asig)
    })

    interpretacion = (
        f"La distribución óptima tiene un costo mínimo de {costo_final:.2f}. "
        + ("Se usó un destino/origen ficticio para balancear el problema. " if balanceo else "")
        + "La asignación óptima se muestra en la tabla."
    )

    return {
        "asignacion": asig,
        "costo": round(costo_final, 4),
        "pasos": pasos,
        "interpretacion": interpretacion,
        "balanceo": balanceo,
        "m": m,
        "n": n
    }
