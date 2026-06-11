"""
Pruebas E2E: atraviesan la API HTTP completa (router → validación → solver).
Donde es posible, los resultados se cruzan contra scipy como oráculo independiente.
"""
import numpy as np
import pytest
from fastapi.testclient import TestClient
from scipy.optimize import linprog, linear_sum_assignment

from main import app

client = TestClient(app)


# ──────────────────────────────────────────────────────────────────────────────
# MÉTODO GRÁFICO
# ──────────────────────────────────────────────────────────────────────────────
class TestGrafico:
    def test_maximizacion_clasica(self):
        """Problema clásico de Taha: óptimo en (3, 1.5) con Z=21."""
        r = client.post("/grafico/resolver", json={
            "obj": [5, 4],
            "restricciones": [
                {"a": 6, "b": 4, "op": "<=", "rhs": 24},
                {"a": 1, "b": 2, "op": "<=", "rhs": 6},
            ],
            "tipo": "max",
        })
        assert r.status_code == 200
        res = r.json()
        assert res["optimo"]["x1"] == pytest.approx(3.0)
        assert res["optimo"]["x2"] == pytest.approx(1.5)
        assert res["optimo"]["z"] == pytest.approx(21.0)
        assert res["interpretacion"]  # criterio 6: siempre hay interpretación
        assert len(res["pasos"]) >= 3  # criterio 2: procedimiento visible

    def test_coincide_con_scipy(self):
        """El óptimo del método gráfico debe coincidir con scipy.linprog."""
        obj = [3, 5]
        restr = [
            {"a": 1, "b": 0, "op": "<=", "rhs": 4},
            {"a": 0, "b": 2, "op": "<=", "rhs": 12},
            {"a": 3, "b": 2, "op": "<=", "rhs": 18},
        ]
        r = client.post("/grafico/resolver", json={"obj": obj, "restricciones": restr, "tipo": "max"})
        res = r.json()

        sp = linprog(c=[-3, -5], A_ub=[[1, 0], [0, 2], [3, 2]], b_ub=[4, 12, 18], method="highs")
        assert res["optimo"]["z"] == pytest.approx(-sp.fun, abs=1e-6)

    def test_minimizacion_con_mayor_igual(self):
        """Minimización con restricciones >= (región no acotada por arriba)."""
        r = client.post("/grafico/resolver", json={
            "obj": [2, 3],
            "restricciones": [
                {"a": 1, "b": 1, "op": ">=", "rhs": 4},
                {"a": 3, "b": 1, "op": ">=", "rhs": 6},
            ],
            "tipo": "min",
        })
        res = r.json()
        sp = linprog(c=[2, 3], A_ub=[[-1, -1], [-3, -1]], b_ub=[-4, -6], method="highs")
        assert res["optimo"]["z"] == pytest.approx(sp.fun, abs=1e-6)

    def test_region_infactible(self):
        """Restricciones contradictorias → error claro, no crash."""
        r = client.post("/grafico/resolver", json={
            "obj": [1, 1],
            "restricciones": [
                {"a": 1, "b": 1, "op": "<=", "rhs": 1},
                {"a": 1, "b": 1, "op": ">=", "rhs": 10},
            ],
            "tipo": "max",
        })
        assert r.status_code == 200
        assert "error" in r.json()

    def test_validacion_rechaza_3_variables(self):
        """El método gráfico solo acepta exactamente 2 variables (Pydantic 422)."""
        r = client.post("/grafico/resolver", json={
            "obj": [1, 2, 3],
            "restricciones": [{"a": 1, "b": 1, "op": "<=", "rhs": 5}],
            "tipo": "max",
        })
        assert r.status_code == 422

    def test_validacion_rechaza_sin_restricciones(self):
        r = client.post("/grafico/resolver", json={"obj": [1, 2], "restricciones": [], "tipo": "max"})
        assert r.status_code == 422


# ──────────────────────────────────────────────────────────────────────────────
# SIMPLEX (GRAN M)
# ──────────────────────────────────────────────────────────────────────────────
class TestSimplex:
    def test_maximizacion_coincide_con_grafico(self):
        """Mismo problema por Simplex y Gráfico → mismo Z (consistencia interna)."""
        payload = {
            "obj": [5, 4],
            "restricciones": [
                {"coefs": [6, 4], "op": "<=", "rhs": 24},
                {"coefs": [1, 2], "op": "<=", "rhs": 6},
            ],
            "tipo": "max",
        }
        res = client.post("/simplex/resolver", json=payload).json()
        assert res["z"] == pytest.approx(21.0)
        assert res["solucion"]["x1"] == pytest.approx(3.0)
        assert res["solucion"]["x2"] == pytest.approx(1.5)
        assert len(res["pasos"]) >= 2  # al menos tableau inicial + final

    def test_3_variables_coincide_con_scipy(self):
        obj = [2, 3, 4]
        A = [[3, 2, 1], [2, 5, 3], [1, 1, 1]]
        b = [14, 14, 5]
        res = client.post("/simplex/resolver", json={
            "obj": obj,
            "restricciones": [{"coefs": row, "op": "<=", "rhs": rhs} for row, rhs in zip(A, b)],
            "tipo": "max",
        }).json()
        sp = linprog(c=[-v for v in obj], A_ub=A, b_ub=b, method="highs")
        assert res["z"] == pytest.approx(-sp.fun, abs=1e-5)

    def test_gran_m_minimizacion(self):
        """Min con >= requiere variables artificiales (Gran M)."""
        res = client.post("/simplex/resolver", json={
            "obj": [2, 3],
            "restricciones": [
                {"coefs": [1, 1], "op": ">=", "rhs": 4},
                {"coefs": [3, 1], "op": ">=", "rhs": 6},
            ],
            "tipo": "min",
        }).json()
        sp = linprog(c=[2, 3], A_ub=[[-1, -1], [-3, -1]], b_ub=[-4, -6], method="highs")
        assert res["z"] == pytest.approx(sp.fun, abs=1e-4)

    def test_restriccion_igualdad(self):
        """Restricción = exacta: x1+x2=10, max 3x1+2x2 con x1<=6 → x=(6,4), Z=26."""
        res = client.post("/simplex/resolver", json={
            "obj": [3, 2],
            "restricciones": [
                {"coefs": [1, 1], "op": "=", "rhs": 10},
                {"coefs": [1, 0], "op": "<=", "rhs": 6},
            ],
            "tipo": "max",
        }).json()
        assert res["z"] == pytest.approx(26.0, abs=1e-4)
        assert res["solucion"]["x1"] == pytest.approx(6.0, abs=1e-4)
        assert res["solucion"]["x2"] == pytest.approx(4.0, abs=1e-4)

    def test_no_acotado_detectado(self):
        """max x1+x2 con x1-x2<=1 → no acotado; debe reportar error, no colgarse."""
        res = client.post("/simplex/resolver", json={
            "obj": [1, 1],
            "restricciones": [{"coefs": [1, -1], "op": "<=", "rhs": 1}],
            "tipo": "max",
        }).json()
        assert "error" in res


# ──────────────────────────────────────────────────────────────────────────────
# TRANSPORTE (VOGEL + MODI)
# ──────────────────────────────────────────────────────────────────────────────
def costo_optimo_transporte_scipy(oferta, demanda, costos):
    """Oráculo: resuelve el problema de transporte como PL con scipy."""
    m, n = len(oferta), len(demanda)
    c = np.array(costos).flatten()
    A_eq, b_eq = [], []
    for i in range(m):  # filas: oferta
        row = np.zeros(m * n)
        row[i * n:(i + 1) * n] = 1
        A_eq.append(row); b_eq.append(oferta[i])
    for j in range(n):  # columnas: demanda
        row = np.zeros(m * n)
        row[j::n] = 1
        A_eq.append(row); b_eq.append(demanda[j])
    sp = linprog(c=c, A_eq=A_eq, b_eq=b_eq, method="highs")
    return sp.fun


class TestTransporte:
    def test_balanceado_coincide_con_scipy(self):
        oferta, demanda = [30, 40, 50], [20, 30, 10, 60]
        costos = [[2, 3, 1, 4], [5, 4, 8, 1], [5, 6, 8, 2]]
        res = client.post("/transporte/resolver",
                          json={"oferta": oferta, "demanda": demanda, "costos": costos}).json()
        esperado = costo_optimo_transporte_scipy(oferta, demanda, costos)
        assert res["costo"] == pytest.approx(esperado, abs=1e-4)

    def test_asignacion_respeta_oferta_y_demanda(self):
        """La asignación devuelta debe sumar exactamente oferta por fila y demanda por columna."""
        oferta, demanda = [120, 80], [150, 70, 80]
        costos = [[4, 8, 1], [7, 2, 3]]
        res = client.post("/transporte/resolver",
                          json={"oferta": oferta, "demanda": demanda, "costos": costos}).json()
        asig = np.array(res["asignacion"])
        # Tras balanceo automático puede haber fila/columna ficticia extra
        for i, o in enumerate(oferta):
            assert asig[i, :].sum() == pytest.approx(o, abs=1e-6) or asig[i, :len(demanda)].sum() <= o + 1e-6
        for j, d in enumerate(demanda):
            assert asig[:len(oferta), j].sum() == pytest.approx(d, abs=1e-6) or asig[:, j].sum() == pytest.approx(d, abs=1e-6)

    def test_desbalanceado_se_balancea(self):
        """Oferta 200 ≠ Demanda 190: debe balancear y avisar."""
        res = client.post("/transporte/resolver", json={
            "oferta": [70, 40, 90],
            "demanda": [80, 60, 50],
            "costos": [[2, 7, 4], [3, 3, 1], [5, 4, 7]],
        }).json()
        assert res["balanceo"] is not None
        esperado = costo_optimo_transporte_scipy(
            [70, 40, 90], [80, 60, 50, 10], [[2, 7, 4, 0], [3, 3, 1, 0], [5, 4, 7, 0]])
        assert res["costo"] == pytest.approx(esperado, abs=1e-4)

    def test_validacion_dimensiones_incorrectas(self):
        """Matriz 2×2 con 3 destinos → 422 de Pydantic."""
        r = client.post("/transporte/resolver", json={
            "oferta": [10, 20],
            "demanda": [5, 10, 15],
            "costos": [[1, 2], [3, 4]],
        })
        assert r.status_code == 422


# ──────────────────────────────────────────────────────────────────────────────
# ASIGNACIÓN (HÚNGARO)
# ──────────────────────────────────────────────────────────────────────────────
class TestHungaro:
    def test_minimizacion_coincide_con_scipy(self):
        costos = [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]]
        res = client.post("/hungaro/resolver", json={"costos": costos, "tipo": "min"}).json()
        rows, cols = linear_sum_assignment(np.array(costos))
        esperado = np.array(costos)[rows, cols].sum()
        assert res["costo_total"] == pytest.approx(esperado)  # = 13

    def test_asignacion_es_permutacion_valida(self):
        """Cada agente exactamente a una tarea, sin repetir tareas."""
        costos = [[15, 18, 21, 12], [9, 16, 17, 14], [12, 14, 18, 13], [7, 9, 11, 8]]
        res = client.post("/hungaro/resolver", json={"costos": costos, "tipo": "min"}).json()
        agentes = [a for a, _ in res["asignacion"]]
        tareas = [t for _, t in res["asignacion"]]
        assert sorted(agentes) == [0, 1, 2, 3]
        assert sorted(tareas) == [0, 1, 2, 3]

    def test_maximizacion_coincide_con_scipy(self):
        costos = [[9, 3, 6], [5, 9, 4], [8, 7, 9]]
        res = client.post("/hungaro/resolver", json={"costos": costos, "tipo": "max"}).json()
        rows, cols = linear_sum_assignment(np.array(costos), maximize=True)
        esperado = np.array(costos)[rows, cols].sum()
        assert res["costo_total"] == pytest.approx(esperado)

    def test_validacion_matriz_no_cuadrada(self):
        r = client.post("/hungaro/resolver", json={"costos": [[1, 2, 3], [4, 5, 6]], "tipo": "min"})
        assert r.status_code == 422

    def test_fuzz_contra_scipy(self):
        """Regresión: el matching codicioso fallaba (cuelgues y subóptimos) en
        matrices adversarias; 60 instancias aleatorias deben coincidir con scipy."""
        import random
        rng = random.Random(42)
        for k in range(60):
            n = rng.randint(2, 6)
            costos = [[rng.randint(1, 50) for _ in range(n)] for _ in range(n)]
            tipo = "min" if k % 2 == 0 else "max"
            res = client.post("/hungaro/resolver", json={"costos": costos, "tipo": tipo}).json()
            M = np.array(costos)
            ri, ci = linear_sum_assignment(M if tipo == "min" else -M)
            assert res["costo_total"] == pytest.approx(M[ri, ci].sum()), f"caso {k}: {costos}"
            assert len(res["asignacion"]) == n


# ──────────────────────────────────────────────────────────────────────────────
# CPM / PERT
# ──────────────────────────────────────────────────────────────────────────────
class TestCpm:
    ACTIVIDADES = [
        {"id": "A", "nombre": "A", "predecesoras": [], "duracion": 3},
        {"id": "B", "nombre": "B", "predecesoras": ["A"], "duracion": 4},
        {"id": "C", "nombre": "C", "predecesoras": ["A"], "duracion": 2},
        {"id": "D", "nombre": "D", "predecesoras": ["B", "C"], "duracion": 5},
    ]

    def test_duracion_y_ruta_critica(self):
        """A→B→D = 3+4+5 = 12 (camino más largo)."""
        res = client.post("/cpm/resolver", json={"actividades": self.ACTIVIDADES, "modo": "cpm"}).json()
        assert res["duracion_proyecto"] == pytest.approx(12.0)
        assert res["ruta_critica"] == ["A", "B", "D"]

    def test_holguras_correctas(self):
        """C tiene holgura 2 (LS-ES = 5-3); las críticas tienen holgura 0."""
        res = client.post("/cpm/resolver", json={"actividades": self.ACTIVIDADES, "modo": "cpm"}).json()
        por_id = {n["id"]: n for n in res["nodos"]}
        assert por_id["C"]["holgura"] == pytest.approx(2.0)
        for nodo in res["nodos"]:
            if nodo["critica"]:
                assert nodo["holgura"] == pytest.approx(0.0)
            assert nodo["EF"] == pytest.approx(nodo["ES"] + nodo["duracion"])
            assert nodo["LF"] == pytest.approx(nodo["LS"] + nodo["duracion"])

    def test_pert_duracion_esperada(self):
        """PERT: te = (o + 4m + p)/6. Con o=2,m=5,p=8 → te=5; varianza=((8-2)/6)²=1."""
        res = client.post("/cpm/resolver", json={
            "actividades": [
                {"id": "A", "nombre": "A", "predecesoras": [], "optimista": 2, "probable": 5, "pesimista": 8},
                {"id": "B", "nombre": "B", "predecesoras": ["A"], "optimista": 1, "probable": 3, "pesimista": 11},
            ],
            "modo": "pert",
        }).json()
        # te_A = (2+20+8)/6 = 5; te_B = (1+12+11)/6 = 4 → proyecto = 9
        assert res["duracion_proyecto"] == pytest.approx(9.0)
        # varianza proyecto = 1 + ((11-1)/6)² = 1 + 2.7778 = 3.7778
        assert res["varianza_proyecto"] == pytest.approx(1 + (10 / 6) ** 2, abs=1e-4)

    def test_ciclo_detectado(self):
        """Grafo con ciclo A→B→A debe reportar error."""
        res = client.post("/cpm/resolver", json={
            "actividades": [
                {"id": "A", "nombre": "A", "predecesoras": ["B"], "duracion": 1},
                {"id": "B", "nombre": "B", "predecesoras": ["A"], "duracion": 1},
            ],
            "modo": "cpm",
        }).json()
        assert "error" in res


# ──────────────────────────────────────────────────────────────────────────────
# TEORÍA DE DECISIONES
# ──────────────────────────────────────────────────────────────────────────────
class TestDecisiones:
    MATRIZ = [[200, 100, -50], [150, 150, 0], [100, 100, 100]]
    ALTS = ["A1", "A2", "A3"]
    ESTADOS = ["E1", "E2", "E3"]

    def base_payload(self, **extra):
        return {"alternativas": self.ALTS, "estados": self.ESTADOS,
                "matriz": self.MATRIZ, "tipo": "max", **extra}

    def test_criterios_calculados_a_mano(self):
        res = client.post("/decisiones/resolver", json=self.base_payload(alpha=0.5)).json()
        r = res["resultados"]
        # Maximax: mejores por fila = [200,150,100] → A1 con 200
        assert r["Maximax"]["decision"] == "A1"
        assert r["Maximax"]["valor"] == 200
        # Maximin: peores por fila = [-50,0,100] → A3 con 100
        assert r["Maximin"]["decision"] == "A3"
        assert r["Maximin"]["valor"] == 100
        # Hurwicz α=0.5: [75, 75, 100] → A3
        assert r["Hurwicz"]["decision"] == "A3"
        assert r["Hurwicz"]["valor"] == pytest.approx(100.0)
        # Laplace: promedios [83.33, 100, 100]
        assert r["Laplace"]["valor"] == pytest.approx(100.0)

    def test_valor_esperado_y_veip(self):
        """Con p=[0.3,0.5,0.2]: VE = [100, 120, 100] → A2. VEIP = VEP - VE*."""
        res = client.post("/decisiones/resolver",
                          json=self.base_payload(probabilidades=[0.3, 0.5, 0.2], alpha=0.5)).json()
        r = res["resultados"]
        assert r["Valor Esperado"]["decision"] == "A2"
        assert r["Valor Esperado"]["valor"] == pytest.approx(120.0)
        # VEP = 0.3·200 + 0.5·150 + 0.2·100 = 155 → VEIP = 155 - 120 = 35
        assert r["VEIP"]["VEP"] == pytest.approx(155.0)
        assert r["VEIP"]["VEIP"] == pytest.approx(35.0)

    def test_validacion_alpha_fuera_de_rango(self):
        r = client.post("/decisiones/resolver", json=self.base_payload(alpha=1.5))
        assert r.status_code == 422

    def test_validacion_matriz_mal_dimensionada(self):
        r = client.post("/decisiones/resolver", json={
            "alternativas": ["A1", "A2"], "estados": ["E1", "E2", "E3"],
            "matriz": [[1, 2], [3, 4]], "tipo": "max",
        })
        assert r.status_code == 422


# ──────────────────────────────────────────────────────────────────────────────
# ANÁLISIS DE SENSIBILIDAD
# ──────────────────────────────────────────────────────────────────────────────
class TestSensibilidad:
    def test_precios_sombra_problema_clasico(self):
        """Problema de Taha: precios sombra conocidos = 0.75 y 0.5."""
        r = client.post("/sensibilidad/resolver", json={
            "obj": [5, 4],
            "restricciones": [
                {"coefs": [6, 4], "op": "<=", "rhs": 24},
                {"coefs": [1, 2], "op": "<=", "rhs": 6},
            ],
            "tipo": "max",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["z"] == pytest.approx(21.0)
        precios = [c["precio_sombra"] for c in d["restricciones"]]
        assert precios[0] == pytest.approx(0.75, abs=1e-3)
        assert precios[1] == pytest.approx(0.5, abs=1e-3)
        # Ambas restricciones activas (sin holgura)
        assert all(c["activa"] for c in d["restricciones"])

    def test_recurso_abundante_tiene_holgura(self):
        """Una restricción no vinculante debe tener holgura > 0 y precio sombra ~0."""
        r = client.post("/sensibilidad/resolver", json={
            "obj": [3, 2],
            "restricciones": [
                {"coefs": [1, 1], "op": "<=", "rhs": 4},
                {"coefs": [1, 0], "op": "<=", "rhs": 100},  # holgada
            ],
            "tipo": "max",
        }).json()
        abundante = r["restricciones"][1]
        assert abundante["holgura"] > 0
        assert abundante["precio_sombra"] == pytest.approx(0.0, abs=1e-6)
        assert not abundante["activa"]

    def test_validacion_sin_restricciones(self):
        r = client.post("/sensibilidad/resolver", json={"obj": [1, 1], "restricciones": [], "tipo": "max"})
        assert r.status_code == 422


# ──────────────────────────────────────────────────────────────────────────────
# DIJKSTRA — RUTA MÁS CORTA
# ──────────────────────────────────────────────────────────────────────────────
class TestDijkstra:
    GRAFO = {
        "nodos": ["A", "B", "C", "D", "E"],
        "aristas": [
            {"from": "A", "to": "B", "peso": 4}, {"from": "A", "to": "C", "peso": 2},
            {"from": "C", "to": "B", "peso": 1}, {"from": "B", "to": "D", "peso": 5},
            {"from": "C", "to": "D", "peso": 8}, {"from": "D", "to": "E", "peso": 3},
        ],
        "origen": "A", "destino": "E", "dirigido": False,
    }

    def test_ruta_y_distancia(self):
        """A→C→B→D→E = 2+1+5+3 = 11."""
        r = client.post("/dijkstra/resolver", json=self.GRAFO)
        assert r.status_code == 200
        d = r.json()
        assert d["distancia"] == pytest.approx(11.0)
        assert d["ruta"] == ["A", "C", "B", "D", "E"]
        assert len(d["pasos"]) == 5  # un paso por nodo permanente

    def test_coincide_con_networkx(self):
        """La distancia debe coincidir con nx.dijkstra_path_length (oráculo)."""
        import networkx as nx
        G = nx.Graph()
        for a in self.GRAFO["aristas"]:
            G.add_edge(a["from"], a["to"], weight=a["peso"])
        esperado = nx.dijkstra_path_length(G, "A", "E")
        d = client.post("/dijkstra/resolver", json=self.GRAFO).json()
        assert d["distancia"] == pytest.approx(esperado)

    def test_peso_negativo_rechazado(self):
        bad = {**self.GRAFO, "aristas": [{"from": "A", "to": "B", "peso": -1}]}
        d = client.post("/dijkstra/resolver", json=bad).json()
        assert "error" in d

    def test_sin_ruta(self):
        """Nodo aislado → no hay ruta."""
        g = {
            "nodos": ["A", "B", "C"],
            "aristas": [{"from": "A", "to": "B", "peso": 3}],
            "origen": "A", "destino": "C", "dirigido": False,
        }
        d = client.post("/dijkstra/resolver", json=g).json()
        assert "error" in d

    def test_validacion_un_solo_nodo(self):
        r = client.post("/dijkstra/resolver", json={
            "nodos": ["A"], "aristas": [{"from": "A", "to": "A", "peso": 1}],
            "origen": "A", "destino": "A",
        })
        assert r.status_code == 422

    def test_arista_duplicada_usa_el_menor_peso(self):
        """Regresión: si el usuario captura la misma arista dos veces, debe
        ganar la de menor peso (add_edge de networkx sobrescribía con la última)."""
        r = client.post("/dijkstra/resolver", json={
            "nodos": ["A", "B"],
            "aristas": [{"from": "A", "to": "B", "peso": 3},
                        {"from": "A", "to": "B", "peso": 9}],
            "origen": "A", "destino": "B", "dirigido": False,
        }).json()
        assert r["distancia"] == pytest.approx(3.0)
