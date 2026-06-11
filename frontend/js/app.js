import * as Grafico    from "/static/modules/grafico.js";
import * as Simplex    from "/static/modules/simplex.js";
import * as Transporte from "/static/modules/transporte.js";
import * as Hungaro    from "/static/modules/hungaro.js";
import * as Cpm        from "/static/modules/cpm.js";
import * as Decisiones from "/static/modules/decisiones.js";

const MODULES = {
  grafico:    { mod: Grafico,    title: "Método Gráfico",        sub: "Programación Lineal — 2 variables" },
  simplex:    { mod: Simplex,    title: "Simplex (Gran M)",       sub: "Programación Lineal — n variables" },
  transporte: { mod: Transporte, title: "Problema de Transporte", sub: "Método de Vogel + MODI" },
  hungaro:    { mod: Hungaro,    title: "Problema de Asignación", sub: "Método Húngaro" },
  cpm:        { mod: Cpm,        title: "CPM / PERT",             sub: "Ruta crítica y análisis de proyectos" },
  decisiones: { mod: Decisiones, title: "Teoría de Decisiones",   sub: "Criterios bajo incertidumbre y riesgo" },
};

let currentTab = null;
const content = document.getElementById("main-content");

function navigate(tab) {
  if (tab === currentTab) return;

  // Fade out
  content.style.opacity = "0";
  content.style.transform = "translateY(4px)";

  setTimeout(() => {
    try {
      currentTab = tab;

      // Update sidebar
      document.querySelectorAll(".nav-item[data-tab]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tab);
      });

      // Update topbar
      const { title, sub, mod } = MODULES[tab];
      document.getElementById("page-title").textContent = title;
      document.getElementById("page-sub").textContent   = sub;

      // Render module
      content.innerHTML = mod.render();

      try {
        mod.init();
      } catch (e) {
        console.error(`Error en init() de ${tab}:`, e);
        content.innerHTML += `<div class="alert-error" style="margin-top:12px;">
          Error al inicializar el módulo: ${e.message}
        </div>`;
      }
    } catch (e) {
      console.error(`Error al renderizar ${tab}:`, e);
    } finally {
      // Siempre mostrar el contenido, haya o no error
      content.style.opacity = "1";
      content.style.transform = "none";
    }
  }, 140);
}

// Smooth transitions via CSS
content.style.transition = "opacity 0.18s ease, transform 0.18s ease";

document.querySelectorAll(".nav-item[data-tab]").forEach(btn => {
  btn.addEventListener("click", () => navigate(btn.dataset.tab));
});

navigate("grafico");
