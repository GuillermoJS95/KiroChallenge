/* ============================================================
   Las Crónicas de Davante — motor del cortometraje
   Reproduce escenas + subtítulos por tiempo y música generada
   con Web Audio API (sin archivos externos). Vanilla JS.
   ============================================================ */

(function () {
  "use strict";

  /* ------------------ Guion por tiempo (ms) ------------------
     scene: índice de la <section data-scene>
     sub:   texto del subtítulo (null = sin subtítulo)
  ------------------------------------------------------------ */
  var TIMELINE = [
    { t: 0,     scene: 0, sub: null },
    { t: 1800,  scene: 0, sub: "Hace mucho, en el reino de Davante..." },
    { t: 5200,  scene: 0, sub: "...donde la magia se escribe en runas de código." },

    { t: 9000,  scene: 1, sub: "Al amanecer despierta la gran academia." },
    { t: 12800, scene: 1, sub: "La Orden de los Arcanos del Desarrollo — la clase de DAW." },

    { t: 16800, scene: 2, sub: "Entre sus muros flota un antiguo espíritu guía..." },
    { t: 20600, scene: 2, sub: "Su nombre es Kiro. Y ha elegido a una nueva generación." },

    { t: 24600, scene: 3, sub: "Abre el grimorio: cada línea, un hechizo que cobra vida." },
    { t: 28600, scene: 3, sub: "Especificas tu deseo... y la obra se construye sola." },

    { t: 32600, scene: 4, sub: "Y entonces, la academia entera se enciende de poder." },
    { t: 36600, scene: 4, sub: null },

    { t: 39200, scene: 5, sub: null }
  ];

  var DURATION = 46000; // ms totales del corto

  /* ------------------ Referencias ------------------ */
  var film = document.getElementById("film");
  var scenes = document.querySelectorAll(".scene");
  var subtitleEl = document.getElementById("subtitle");
  var poster = document.getElementById("poster");
  var playBtn = document.getElementById("play-btn");
  var controls = document.getElementById("controls");
  var replayBtn = document.getElementById("replay-btn");
  var muteBtn = document.getElementById("mute-btn");
  var trackFill = document.getElementById("track-fill");

  var startTime = 0;
  var rafId = null;
  var lastScene = -1;
  var lastSubIndex = -1;
  var playing = false;

  /* ============================================================
     MÚSICA — ambiente de fantasía con Web Audio API
     Pad de acordes + arpegio de arpa + nota grave. Sin archivos.
     ============================================================ */
  var audio = {
    ctx: null, master: null, muted: false, timers: [], started: false
  };

  function initAudio() {
    if (audio.ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.0;
    audio.master.connect(audio.ctx.destination);
  }

  // Nota puntual (arpa/pad)
  function playNote(freq, startAt, dur, type, peak) {
    var ctx = audio.ctx;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;

    var a = 0.06, r = dur * 0.6;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peak || 0.14, startAt + a);
    gain.gain.exponentialRampToValueAtTime(0.0008, startAt + dur);

    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.05);
  }

  // Frecuencias (Hz) de algunas notas
  var N = {
    A2: 110.00, C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00,
    A3: 220.00, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
    G4: 392.00, A4: 440.00, C5: 523.25, D5: 587.33, E5: 659.25
  };

  // Progresión de acordes (pad) que se repite; crea el "aire" épico/melancólico
  var CHORDS = [
    [N.A2, N.C4, N.E4],   // Am
    [N.F4, N.A3, N.C4],   // F
    [N.C3, N.E4, N.G4],   // C
    [N.G3, N.D4, N.G4]    // G
  ];
  // Arpegio de arpa superpuesto
  var ARP = [N.A4, N.C5, N.E5, N.C5, N.D5, N.A4, N.E5, N.G4];

  function scheduleMusic() {
    if (!audio.ctx) return;
    var ctx = audio.ctx;
    var base = ctx.currentTime + 0.1;
    var chordDur = 3.2;        // duración de cada acorde
    var totalSec = DURATION / 1000;
    var tPos = 0;
    var ci = 0, ai = 0;

    while (tPos < totalSec) {
      var when = base + tPos;
      // Pad (acorde sostenido)
      var chord = CHORDS[ci % CHORDS.length];
      chord.forEach(function (f) {
        playNote(f, when, chordDur, "sine", 0.10);
      });
      // Nota grave de refuerzo
      playNote(chord[0] / 2, when, chordDur, "triangle", 0.08);

      // Arpegio de arpa (4 notas por acorde)
      for (var k = 0; k < 4; k++) {
        playNote(ARP[ai % ARP.length], when + k * (chordDur / 4), chordDur / 4 + 0.3, "triangle", 0.07);
        ai++;
      }

      tPos += chordDur;
      ci++;
    }
  }

  function startMusic() {
    initAudio();
    if (!audio.ctx) return;
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    // Fundido de entrada del volumen general
    var now = audio.ctx.currentTime;
    audio.master.gain.cancelScheduledValues(now);
    audio.master.gain.setValueAtTime(0.0001, now);
    audio.master.gain.exponentialRampToValueAtTime(audio.muted ? 0.0001 : 0.9, now + 2);
    scheduleMusic();
    audio.started = true;
  }

  function stopMusic() {
    if (!audio.ctx) return;
    var now = audio.ctx.currentTime;
    audio.master.gain.cancelScheduledValues(now);
    audio.master.gain.setValueAtTime(audio.master.gain.value, now);
    audio.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    // Nuevo contexto en el próximo play para reprogramar limpio
    setTimeout(function () {
      if (audio.ctx) { audio.ctx.close(); audio.ctx = null; audio.started = false; }
    }, 700);
  }

  function toggleMute() {
    audio.muted = !audio.muted;
    muteBtn.textContent = audio.muted ? "✕" : "♪";
    muteBtn.classList.toggle("off", audio.muted);
    if (audio.ctx) {
      var now = audio.ctx.currentTime;
      audio.master.gain.cancelScheduledValues(now);
      audio.master.gain.linearRampToValueAtTime(audio.muted ? 0.0001 : 0.9, now + 0.2);
    }
  }

  /* ============================================================
     REPRODUCCIÓN VISUAL
     ============================================================ */
  function setScene(idx) {
    if (idx === lastScene) return;
    lastScene = idx;
    for (var i = 0; i < scenes.length; i++) {
      scenes[i].classList.toggle("is-on", Number(scenes[i].dataset.scene) === idx);
    }
  }

  function setSubtitle(text) {
    if (text === null) {
      subtitleEl.classList.remove("show");
      return;
    }
    subtitleEl.textContent = text;
    subtitleEl.classList.add("show");
  }

  function tick() {
    var now = performance.now();
    var elapsed = now - startTime;

    // Progreso
    var pct = Math.min(100, (elapsed / DURATION) * 100);
    trackFill.style.width = pct + "%";

    // Encontrar el último evento cuyo tiempo ya pasó
    var activeIdx = 0;
    for (var i = 0; i < TIMELINE.length; i++) {
      if (elapsed >= TIMELINE[i].t) activeIdx = i;
      else break;
    }
    if (activeIdx !== lastSubIndex) {
      lastSubIndex = activeIdx;
      setScene(TIMELINE[activeIdx].scene);
      setSubtitle(TIMELINE[activeIdx].sub);
    }

    if (elapsed >= DURATION) {
      finish();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  function finish() {
    playing = false;
    cancelAnimationFrame(rafId);
    setScene(5);
    setSubtitle(null);
    trackFill.style.width = "100%";
    stopMusic();
  }

  function play() {
    poster.classList.add("hide");
    controls.hidden = false;
    playing = true;
    lastScene = -1;
    lastSubIndex = -1;
    startTime = performance.now();
    startMusic();
    rafId = requestAnimationFrame(tick);
  }

  function replay() {
    if (rafId) cancelAnimationFrame(rafId);
    stopMusic();
    // pequeño respiro para cerrar el contexto anterior
    setTimeout(play, 120);
  }

  /* ------------------ Eventos ------------------ */
  playBtn.addEventListener("click", play);
  replayBtn.addEventListener("click", replay);
  muteBtn.addEventListener("click", toggleMute);

  // Teclas útiles: espacio = play/replay, M = mute
  document.addEventListener("keydown", function (e) {
    if (e.code === "Space") { e.preventDefault(); playing ? replay() : play(); }
    if (e.key === "m" || e.key === "M") toggleMute();
  });

  // Escena inicial visible tras el póster
  setScene(0);
})();
