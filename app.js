/* ===========================================================
   Davante · DAW · Bienvenida a Kiro
   Lista de tareas con persistencia en localStorage
   HTML + CSS + JS puros
   =========================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "davante-daw-kiro-tasks";

  // --- Estado ---
  /** @type {{id:string, text:string, done:boolean}[]} */
  var tasks = [];
  var currentFilter = "all"; // "all" | "active" | "done"

  // --- Referencias al DOM ---
  var form = document.getElementById("task-form");
  var input = document.getElementById("task-input");
  var list = document.getElementById("task-list");
  var emptyState = document.getElementById("empty-state");
  var counter = document.getElementById("counter");
  var clearDoneBtn = document.getElementById("clear-done");
  var filterButtons = document.querySelectorAll(".filter");

  // --- Persistencia ---
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      // Validación defensiva: nos quedamos solo con entradas bien formadas.
      tasks = Array.isArray(parsed)
        ? parsed.filter(function (t) {
            return t && typeof t.text === "string";
          }).map(function (t) {
            return {
              id: typeof t.id === "string" ? t.id : makeId(),
              text: t.text,
              done: Boolean(t.done)
            };
          })
        : [];
    } catch (e) {
      // Si los datos están corruptos, empezamos de cero sin romper la app.
      tasks = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      // localStorage lleno o deshabilitado: la app sigue funcionando en memoria.
    }
  }

  function makeId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  // --- Operaciones sobre tareas ---
  function addTask(text) {
    var clean = text.trim();
    if (!clean) return;
    tasks.push({ id: makeId(), text: clean, done: false });
    save();
    render();
  }

  function toggleTask(id) {
    tasks = tasks.map(function (t) {
      return t.id === id ? { id: t.id, text: t.text, done: !t.done } : t;
    });
    save();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter(function (t) {
      return t.id !== id;
    });
    save();
    render();
  }

  function clearDone() {
    tasks = tasks.filter(function (t) {
      return !t.done;
    });
    save();
    render();
  }

  // --- Filtro ---
  function getVisibleTasks() {
    if (currentFilter === "active") {
      return tasks.filter(function (t) { return !t.done; });
    }
    if (currentFilter === "done") {
      return tasks.filter(function (t) { return t.done; });
    }
    return tasks;
  }

  // --- Render ---
  function render() {
    var visible = getVisibleTasks();

    // Reconstruimos la lista.
    list.innerHTML = "";

    visible.forEach(function (task) {
      var li = document.createElement("li");
      li.className = "task-item" + (task.done ? " done" : "");
      li.dataset.id = task.id;

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-check";
      checkbox.checked = task.done;
      checkbox.setAttribute("aria-label", "Marcar como hecha: " + task.text);

      var span = document.createElement("span");
      span.className = "task-text";
      span.textContent = task.text; // textContent evita inyección de HTML

      var del = document.createElement("button");
      del.type = "button";
      del.className = "task-del";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Borrar: " + task.text);

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(del);
      list.appendChild(li);
    });

    // Estado vacío.
    if (visible.length === 0) {
      emptyState.classList.add("show");
      if (tasks.length === 0) {
        emptyState.innerHTML = "NO HAY MISIONES TODAVÍA.<br />¡AÑADE LA PRIMERA!";
      } else {
        emptyState.innerHTML = "NADA EN ESTE FILTRO.";
      }
    } else {
      emptyState.classList.remove("show");
    }

    // Contador de pendientes.
    var pending = tasks.filter(function (t) { return !t.done; }).length;
    counter.textContent = pending + (pending === 1 ? " PENDIENTE" : " PENDIENTES");
  }

  // --- Eventos ---
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    addTask(input.value);
    input.value = "";
    input.focus();
  });

  // Delegación de eventos en la lista (toggle y borrar).
  list.addEventListener("click", function (e) {
    var item = e.target.closest(".task-item");
    if (!item) return;
    var id = item.dataset.id;

    if (e.target.classList.contains("task-del")) {
      deleteTask(id);
    } else if (e.target.classList.contains("task-check")) {
      toggleTask(id);
    }
  });

  clearDoneBtn.addEventListener("click", clearDone);

  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      currentFilter = btn.dataset.filter;
      filterButtons.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      render();
    });
  });

  // --- Arranque ---
  load();

  // Si es la primera visita (sin datos guardados), sembramos misiones de bienvenida.
  if (tasks.length === 0 && !localStorage.getItem(STORAGE_KEY)) {
    tasks = [
      { id: makeId(), text: "Instalar y abrir Kiro", done: true },
      { id: makeId(), text: "Crear mi primera webapp con Kiro Crew", done: false },
      { id: makeId(), text: "Publicarla en GitHub Pages", done: false }
    ];
    save();
  }

  render();
})();
