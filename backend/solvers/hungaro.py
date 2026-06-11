import numpy as np

EPS = 1e-9


def resolver_hungaro(costos: list[list[float]], tipo: str = "min") -> dict:
    """
    Método Húngaro para el problema de asignación n×n.
    Soporta minimización y maximización.
    Devuelve asignación óptima y pasos detallados.
    """
    pasos = []
    C = np.array(costos, dtype=float)
    n = C.shape[0]

    # Si no es cuadrada, rellenar con ceros
    if C.shape[0] != C.shape[1]:
        size = max(C.shape)
        C_sq = np.zeros((size, size))
        C_sq[:C.shape[0], :C.shape[1]] = C
        C = C_sq
        n = size
        pasos.append({"titulo": "Matriz cuadrada", "detalle": f"Matriz rellenada a {n}×{n} con ceros."})

    # Maximización → convertir a minimización
    if tipo == "max":
        C = np.max(C) - C
        pasos.append({"titulo": "Conversión para maximización", "detalle": "Se restó cada elemento del valor máximo para convertir a minimización."})

    pasos.append({"titulo": "Matriz original", "matriz": C.tolist()})

    # Paso 1: Restar mínimo de cada fila
    C1 = C.copy()
    for i in range(n):
        C1[i] -= C1[i].min()
    pasos.append({"titulo": "Paso 1 – Restar mínimo de cada fila", "matriz": C1.tolist()})

    # Paso 2: Restar mínimo de cada columna
    for j in range(n):
        C1[:, j] -= C1[:, j].min()
    pasos.append({"titulo": "Paso 2 – Restar mínimo de cada columna", "matriz": C1.tolist()})

    def es_cero(v):
        return abs(v) < EPS

    def matching_maximo(mat):
        """Matching máximo fila→columna sobre los ceros (algoritmo de Kuhn)."""
        col_of_row = [-1] * n
        row_of_col = [-1] * n

        def aumentar(i, visitadas):
            for j in range(n):
                if es_cero(mat[i, j]) and not visitadas[j]:
                    visitadas[j] = True
                    if row_of_col[j] == -1 or aumentar(row_of_col[j], visitadas):
                        col_of_row[i] = j
                        row_of_col[j] = i
                        return True
            return False

        for i in range(n):
            aumentar(i, [False] * n)
        return col_of_row, row_of_col

    def cubrir_ceros(mat):
        """
        Cubrimiento mínimo de ceros (teorema de König) a partir del matching máximo:
        se marcan las filas sin asignar y se alternan ceros / aristas del matching.
        Líneas = filas no marcadas + columnas marcadas.
        """
        col_of_row, row_of_col = matching_maximo(mat)

        marked_rows = set(i for i in range(n) if col_of_row[i] == -1)
        marked_cols = set()
        frontera = list(marked_rows)
        while frontera:
            nueva = []
            for i in frontera:
                for j in range(n):
                    if es_cero(mat[i, j]) and j not in marked_cols:
                        marked_cols.add(j)
                        r = row_of_col[j]
                        if r != -1 and r not in marked_rows:
                            marked_rows.add(r)
                            nueva.append(r)
            frontera = nueva

        lines_rows = set(range(n)) - marked_rows
        lines_cols = marked_cols
        return lines_rows, lines_cols, col_of_row

    iteration = 0
    MAX_ITER = 200
    col_of_row = [-1] * n
    while iteration < MAX_ITER:
        lines_rows, lines_cols, col_of_row = cubrir_ceros(C1)
        total_lines = len(lines_rows) + len(lines_cols)

        pasos.append({
            "titulo": f"Iteración {iteration+1} – Cubrir ceros",
            "detalle": f"Líneas usadas: {total_lines} (necesitamos {n}). Filas: {sorted(r+1 for r in lines_rows)}, Cols: {sorted(c+1 for c in lines_cols)}",
            "matriz": C1.tolist()
        })

        if total_lines >= n:
            break

        # Encontrar mínimo no cubierto
        min_val = None
        for i in range(n):
            for j in range(n):
                if i not in lines_rows and j not in lines_cols:
                    if min_val is None or C1[i, j] < min_val:
                        min_val = C1[i, j]
        if min_val is None or min_val < EPS:
            break

        # Restar de no cubiertos, sumar a doblemente cubiertos
        for i in range(n):
            for j in range(n):
                if i not in lines_rows and j not in lines_cols:
                    C1[i, j] -= min_val
                elif i in lines_rows and j in lines_cols:
                    C1[i, j] += min_val

        pasos.append({
            "titulo": f"Iteración {iteration+1} – Ajuste (min={min_val:.4f})",
            "matriz": C1.tolist()
        })
        iteration += 1

    # Asignación final: matching máximo sobre la matriz reducida
    col_of_row, _ = matching_maximo(C1)
    asignacion = [(i, col_of_row[i]) for i in range(n) if col_of_row[i] != -1]

    costo_total = sum(costos[i][j] for i, j in asignacion if i < len(costos) and j < len(costos[0]))

    pasos.append({
        "titulo": "Asignación óptima",
        "detalle": ", ".join([f"Agente {i+1} → Tarea {j+1}" for i, j in asignacion])
    })

    interpretacion = (
        f"Asignación {'de costo mínimo' if tipo == 'min' else 'de beneficio máximo'}: "
        + ", ".join([f"Agente {i+1} → Tarea {j+1}" for i, j in asignacion])
        + f". Costo/Beneficio total = {costo_total:.4f}."
    )

    return {
        "asignacion": asignacion,
        "costo_total": round(costo_total, 4),
        "tipo": tipo,
        "pasos": pasos,
        "interpretacion": interpretacion
    }
