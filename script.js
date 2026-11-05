/* ==========================================================================
   Interactive Birthday Card — Vanilla JS template.
   No frameworks, no build step. Demo project.
   ========================================================================== */

(() => {
  "use strict";

  /* ---------- Консольные пасхалки ---------- */
  console.log(
    "%cИнтерактивная открытка на Vanilla JS 🎉",
    "color: #FFD700; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 0 #000;"
  );
  console.log("P.S. Без библиотек и сборки: HTML, CSS, Canvas и Web Audio.");
  console.log(
    "%cДемо-проект: смотрите, форкайте и адаптируйте под себя.",
    "color: #8c8c8c; font-style: italic;"
  );
  console.log(
    "%cАвтор шаблона: RoBiN19666",
    "color: #FFD700; font-size: 14px; font-weight: 700; text-shadow: 1px 1px 0 #000;"
  );
  console.log(
    "GitHub: https://github.com/RoBiN19666\nTelegram: https://t.me/robin19666\nЛицензия: MIT\nСделано с помощью инструмента DeepSeek."
  );

  /* ---------- Утилиты ---------- */
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const random = (min, max) => min + Math.random() * (max - min);

  /* ---------- Старт всегда с верхней точки ---------- */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  window.addEventListener(
    "load",
    () => {
      window.scrollTo(0, 0);
    },
    { once: true }
  );

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) window.scrollTo(0, 0);
  });

  /* ---------- Звуковой движок ---------- */
  const soundFiles = {
    wind: "sounds/wind.mp3",
    boot: "sounds/boot.mp3",
    typing: "sounds/typing.mp3",
    bookOpen: "sounds/book-open.mp3",
    pen: "sounds/pen.mp3",
    bookClose: "sounds/book-close.mp3",
    crtOff: "sounds/crt-off.mp3",
    purr: "sounds/purr.mp3"
  };

  const soundCache = new Map();

  function preloadSounds() {
    // Для вступления нужны только эти звуки, остальные подгружаем в простое.
    ["wind", "boot", "typing"].forEach((name) => getSound(name));
  }

  function preloadDeferredSounds() {
    const load = () => ["bookOpen", "pen", "bookClose", "crtOff", "purr"].forEach((name) => getSound(name));

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(load, { timeout: 2000 });
    } else {
      window.setTimeout(load, 900);
    }
  }

  function getSound(name) {
    const file = soundFiles[name];
    if (!file) return null;

    if (!soundCache.has(name)) {
      try {
        const audio = new Audio(file);
        audio.preload = "auto";
        audio.load();
        soundCache.set(name, audio);
      } catch (error) {
        return null;
      }
    }

    return soundCache.get(name);
  }

  const soundLayers = new Map();
  const clampVolume = (value) => Math.min(1, Math.max(0, Number(value) || 0));

  function getLayer(name) {
    const audio = getSound(name);
    if (!audio) return null;

    if (!soundLayers.has(name)) {
      soundLayers.set(name, { audio, fadeTimer: null, stopTimer: null });
    }

    return soundLayers.get(name);
  }

  function cancelLayerFade(layer) {
    if (!layer || !layer.fadeTimer) return;
    window.clearInterval(layer.fadeTimer);
    layer.fadeTimer = null;
  }

  function fadeLayerTo(name, targetVolume, duration, done) {
    const layer = soundLayers.get(name);
    if (!layer) return;

    const { audio } = layer;
    const target = clampVolume(targetVolume);

    cancelLayerFade(layer);

    if (duration <= 0) {
      audio.volume = target;
      if (done) done();
      return;
    }

    const startVolume = audio.volume;
    const startedAt = performance.now();

    // setInterval, а не requestAnimationFrame: звук должен дозатухать
    // и останавливаться, даже если вкладка ушла в фон.
    layer.fadeTimer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      audio.volume = clampVolume(startVolume + (target - startVolume) * progress);

      if (progress >= 1) {
        cancelLayerFade(layer);
        if (done) done();
      }
    }, 40);
  }

  function setSoundVolume(name, volume, fadeMs = 0) {
    const layer = soundLayers.get(name);
    if (!layer || layer.audio.paused) return;
    fadeLayerTo(name, volume, fadeMs);
  }

  function playSound(name, options = {}) {
    const layer = getLayer(name);
    if (!layer) return Promise.resolve(false);

    const {
      volume = 1,
      loop = false,
      fadeIn = 0,
      fadeOutAfter = 0,
      fadeOutDuration = 700,
      crossfade = 700,
      stopOthers = true
    } = options;

    const { audio } = layer;

    if (layer.stopTimer) {
      window.clearTimeout(layer.stopTimer);
      layer.stopTimer = null;
    }

    cancelLayerFade(layer);

    if (stopOthers) {
      soundLayers.forEach((otherLayer, otherName) => {
        if (otherName === name || otherLayer.audio.paused) return;

        fadeLayerTo(otherName, 0, crossfade, () => {
          otherLayer.audio.pause();
          try {
            otherLayer.audio.currentTime = 0;
          } catch (error) {
            // ignore
          }
          otherLayer.audio.volume = 1;
        });
      });
    }

    audio.loop = Boolean(loop);
    audio.muted = false;
    audio._primeToken = null;
    audio.volume = fadeIn > 0 ? 0 : clampVolume(volume);

    try {
      audio.currentTime = 0;
    } catch (error) {
      // Некоторые браузеры не разрешают seek до загрузки метаданных.
    }

    let playPromise = null;

    try {
      playPromise = audio.play();
    } catch (error) {
      return Promise.resolve(false);
    }

    if (fadeIn > 0) fadeLayerTo(name, volume, fadeIn);

    if (fadeOutAfter > 0) {
      layer.stopTimer = window.setTimeout(() => {
        stopSound(name, fadeOutDuration);
      }, fadeOutAfter);
    }

    if (!playPromise || typeof playPromise.then !== "function") {
      return Promise.resolve(true);
    }

    return playPromise
      .then(() => true)
      .catch(() => {
        cancelLayerFade(layer);
        audio.volume = 1;
        return false;
      });
  }

  // «Разогрев» аудиоэлементов внутри жеста: iOS не даёт играть
  // отложенным звукам, если элемент ни разу не запускали вручную.
  function primeSound(name) {
    const sound = name === "lofi" ? audio : getSound(name);
    if (!sound) return;

    const token = Symbol("prime");
    sound._primeToken = token;
    sound.muted = true;

    let playPromise = null;
    try {
      playPromise = sound.play();
    } catch (error) {
      sound.muted = false;
      return;
    }

    const cleanup = () => {
      // Если звук уже запустил основной движок — не мешаем ему.
      if (sound._primeToken !== token) {
        sound.muted = false;
        return;
      }

      sound._primeToken = null;

      try {
        sound.pause();
        sound.currentTime = 0;
      } catch (error) {
        // ignore
      }
      sound.muted = false;
    };

    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(() => window.setTimeout(cleanup, 60)).catch(() => {
        if (sound._primeToken === token) sound._primeToken = null;
        sound.muted = false;
      });
    } else {
      window.setTimeout(cleanup, 60);
    }
  }

  function stopSound(name, fadeMs = 0) {
    const layer = soundLayers.get(name);
    if (!layer) return;

    if (layer.stopTimer) {
      window.clearTimeout(layer.stopTimer);
      layer.stopTimer = null;
    }

    const { audio } = layer;

    if (fadeMs > 0 && !audio.paused) {
      fadeLayerTo(name, 0, fadeMs, () => {
        audio.pause();
        try {
          audio.currentTime = 0;
        } catch (error) {
          // ignore
        }
        audio.volume = 1;
      });
      return;
    }

    cancelLayerFade(layer);
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch (error) {
      // ignore
    }
    audio.volume = 1;
  }

  /* ---------- Спираль Фибоначчи ---------- */
  function buildSpiral() {
    const path = $("#spiralPath");
    const glow = $("#spiralGlow");
    const tip = $("#spiralTip");

    if (!path || !glow || !tip) return;

    const phi = (1 + Math.sqrt(5)) / 2;
    const b = Math.log(phi) / (Math.PI / 2);
    const maxTheta = Math.PI * 4.18;
    const startRadius = 2.8;
    const maxRadius = startRadius * Math.exp(b * maxTheta);
    const scale = 264 / maxRadius;
    const points = [];

    for (let theta = 0; theta <= maxTheta; theta += 0.032) {
      const radius = startRadius * Math.exp(b * theta) * scale;
      const angle = theta - Math.PI / 2;
      points.push([
        (300 + Math.cos(angle) * radius).toFixed(2),
        (300 + Math.sin(angle) * radius).toFixed(2)
      ]);
    }

    const d = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");

    path.setAttribute("d", d);
    glow.setAttribute("d", d);

    const lastPoint = points[points.length - 1];
    tip.setAttribute("cx", lastPoint[0]);
    tip.setAttribute("cy", lastPoint[1]);
  }

  /* ---------- Фоновые золотые частицы ---------- */
  let ambientStarted = false;

  function startAmbientParticles() {
    if (ambientStarted) return;
    ambientStarted = true;

    const ambientCanvas = $("#ambientCanvas");
    if (!ambientCanvas) return;

    const context = ambientCanvas.getContext("2d");
    if (!context) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelRatio = 1;
    let specks = [];
    let frameId = null;
    let lastTime = 0;
    let isRunning = false;

    const colors = ["#FFD700", "#D4AF37", "#FFF0B8", "#B89124"];
    const glowSprite = document.createElement("canvas");
    glowSprite.width = 32;
    glowSprite.height = 32;

    const spriteContext = glowSprite.getContext("2d");
    if (spriteContext) {
      const glow = spriteContext.createRadialGradient(16, 16, 0, 16, 16, 16);
      glow.addColorStop(0, "rgba(255, 244, 190, 1)");
      glow.addColorStop(0.18, "rgba(255, 215, 0, 0.9)");
      glow.addColorStop(0.5, "rgba(255, 215, 0, 0.28)");
      glow.addColorStop(1, "rgba(255, 215, 0, 0)");
      spriteContext.fillStyle = glow;
      spriteContext.fillRect(0, 0, 32, 32);
    }

    function createSpecks() {
      const amount = width < 768 ? 20 : 34;
      specks = Array.from({ length: amount }, () => ({
        x: random(0, width),
        y: random(0, height),
        radius: random(0.7, 2.1),
        speed: random(0.07, 0.28),
        drift: random(-0.08, 0.08),
        alpha: random(0.12, 0.42),
        phase: random(0, Math.PI * 2),
        phaseSpeed: random(0.0006, 0.0016),
        color: colors[Math.floor(Math.random() * colors.length)]
      }));
    }

    function resize() {
      if (!context) return;

      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      ambientCanvas.width = Math.round(width * pixelRatio);
      ambientCanvas.height = Math.round(height * pixelRatio);
      ambientCanvas.style.width = `${width}px`;
      ambientCanvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      createSpecks();
      draw(performance.now(), 0);
    }

    function draw(now, delta = 1) {
      if (!context) return;

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      for (const speck of specks) {
        if (!prefersReducedMotion && delta > 0) {
          speck.y -= speck.speed * delta;
          speck.x += speck.drift * delta;
          speck.phase += speck.phaseSpeed * 16.67 * delta;

          if (speck.y < -8) {
            speck.y = height + 8;
            speck.x = random(0, width);
          }

          if (speck.x < -8) speck.x = width + 8;
          if (speck.x > width + 8) speck.x = -8;
        }

        const twinkle = 0.62 + Math.sin(now * 0.0011 + speck.phase) * 0.38;
        const glowSize = speck.radius * 7;

        context.globalAlpha = speck.alpha * twinkle;
        context.drawImage(
          glowSprite,
          speck.x - glowSize / 2,
          speck.y - glowSize / 2,
          glowSize,
          glowSize
        );

        context.globalAlpha = Math.min(1, speck.alpha * twinkle + 0.18);
        context.fillStyle = speck.color;
        context.beginPath();
        context.arc(speck.x, speck.y, Math.max(0.45, speck.radius * 0.42), 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
    }

    function frame(now) {
      if (document.hidden) {
        isRunning = false;
        frameId = null;
        return;
      }

      const delta = Math.min(2.5, Math.max(0.2, (now - lastTime) / 16.667 || 1));

      if (now - lastTime >= 30) {
        draw(now, delta);
        lastTime = now;
      }

      frameId = window.requestAnimationFrame(frame);
    }

    function start() {
      if (prefersReducedMotion || isRunning) return;
      isRunning = true;
      lastTime = performance.now();
      frameId = window.requestAnimationFrame(frame);
    }

    function stop() {
      isRunning = false;
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = null;
    }

    resize();
    start();

    window.addEventListener("resize", resize, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });
  }

  /* ---------- Telegram-прелоадер ---------- */
  const telegramPreloader = $("#telegramPreloader");
  const soundPromptHint = $("#soundPromptHint");
  let preloaderDone = false;
  let preloaderStarted = false;
  let audioUnlockArmed = false;
  let audioUnlockHandler = null;
  let audioUnlockedByGesture = false;
  let bootSoundStarted = false;

  function startBootSound(force = false) {
    if (bootSoundStarted) {
      const layer = soundLayers.get("boot");
      if (!force || (layer && !layer.audio.paused)) return;
    }

    bootSoundStarted = true;
    playSound("boot", { volume: 0.62, fadeIn: 1200, crossfade: 900 });
  }

  function beginPreloader() {
    if (preloaderStarted) return;
    preloaderStarted = true;

    if (telegramPreloader) telegramPreloader.classList.remove("is-waiting");

    if (prefersReducedMotion) {
      window.setTimeout(finishPreloader, 120);
      return;
    }

    // Включение компьютера начинается чуть раньше вылета самолётика.
    window.setTimeout(startBootSound, 1000);
    window.setTimeout(finishPreloader, 1850);
  }

  function finishPreloader() {
    if (preloaderDone) return;
    preloaderDone = true;

    if (telegramPreloader) {
      telegramPreloader.classList.add("is-leaving");
      window.setTimeout(() => {
        telegramPreloader.hidden = true;
      }, 650);
    }

    runBoot();
  }

  function unlockAudioOnGesture() {
    audioUnlockedByGesture = true;
    if (soundPromptHint) soundPromptHint.hidden = true;

    if (document.body.classList.contains("is-ready")) {
      startLofi(userVolume, 900);
      return;
    }

    if (!preloaderDone) {
      // Сначала разогреваем отложенные звуки и только потом запускаем ветер:
      // на мобильных последний play() забирает аудиофокус, и ветер должен быть последним.
      ["boot", "typing", "lofi"].forEach(primeSound);
      playSound("wind", { volume: 0.55, fadeIn: 300 });

      if (telegramPreloader) telegramPreloader.classList.remove("is-waiting");
      beginPreloader();
      return;
    }

    if (!bootFinished) {
      startBootSound(true);

      if (!bootSequenceDone && !prefersReducedMotion) {
        playSound("typing", { volume: 0.4, fadeIn: 200, stopOthers: false });
        setSoundVolume("boot", 0.3, 500);
      }

      primeSound("lofi");
      return;
    }

    startLofi(userVolume, 900);
  }

  function armAudioUnlock() {
    if (audioUnlockArmed) return;
    audioUnlockArmed = true;

    const unlock = () => {
      if (!audioUnlockArmed) return;
      disarmAudioUnlock();
      unlockAudioOnGesture();
    };

    audioUnlockHandler = unlock;
    // click — самый надёжный жест для мобильных: pointerdown/touchstart
    // на части Android-WebView не дают права на play().
    document.addEventListener("click", unlock, { once: true, capture: true });
    document.addEventListener("keydown", unlock, { once: true, capture: true });
  }

  function disarmAudioUnlock() {
    if (!audioUnlockArmed) return;
    audioUnlockArmed = false;

    if (audioUnlockHandler) {
      document.removeEventListener("click", audioUnlockHandler, true);
      document.removeEventListener("keydown", audioUnlockHandler, true);
      audioUnlockHandler = null;
    }
  }

  function startPreloader() {
    if (!telegramPreloader) {
      preloaderDone = true;
      runBoot();
      return;
    }

    // Слушатель первого жеста ставим сразу — иначе очень ранний клик
    // может прийти до того, как браузер успеет отклонить автоплей.
    armAudioUnlock();

    // Самолётик ждёт на старте, пока не станет ясно, разрешён ли звук.
    const started = playSound("wind", { volume: 0.55, fadeIn: 400 });

    const handleStart = (ok) => {
      if (ok) {
        disarmAudioUnlock();
        beginPreloader();
        return;
      }

      // Автоплей заблокирован: держим самолётик и ждём первого жеста.
      if (preloaderStarted || audioUnlockedByGesture) return;

      if (soundPromptHint) soundPromptHint.hidden = false;
      if (telegramPreloader) telegramPreloader.classList.add("is-waiting");
    };

    if (started && typeof started.then === "function") {
      started.then(handleStart);
    } else {
      handleStart(true);
    }
  }

  /* ---------- Экран загрузки ---------- */
  const boot = $("#boot");
  const terminalOutput = $("#terminalOutput");

  let bootFinished = false;
  let bootSequenceDone = false;
  let bootTimer = null;
  let activeInlineCaret = null;

  const bootLines = [
    {
      prompt: true,
      text: "npm install happy-birthday",
      tone: "command",
      speed: 34,
      before: 320
    },
    {
      text: " ",
      tone: "muted",
      speed: 0,
      before: 70
    },
    {
      prefix: "[OK]",
      prefixTone: "ok",
      text: "Пакет успешно установлен",
      speed: 13,
      before: 80
    },
    {
      prefix: "[WARN]",
      prefixTone: "warn",
      text: "Обнаружен фронтенд-проект. Включаем режим экзамена.",
      tone: "warn",
      speed: 11,
      before: 80
    }
  ];

  function makeLine(config, fullText) {
    const line = document.createElement("div");
    line.className = "terminal__line";
    if (config.tone) line.classList.add(`terminal__line--${config.tone}`);

    if (config.prompt) {
      const prompt = document.createElement("span");
      prompt.className = "terminal__prompt-inline";
      prompt.textContent = ">";
      line.append(prompt);
    }

    if (config.prefix) {
      const prefix = document.createElement("span");
      prefix.className = `terminal__prefix terminal__prefix--${config.prefixTone || "ok"}`;
      prefix.textContent = config.prefix;
      line.append(prefix);
    }

    const content = document.createElement("span");
    content.textContent = fullText;
    line.append(content);
    return line;
  }

  function renderLineImmediately(config) {
    if (!terminalOutput) return;
    terminalOutput.append(makeLine(config, config.text));
  }

  async function typeLine(config) {
    if (!terminalOutput) return;

    if (activeInlineCaret) {
      activeInlineCaret.remove();
      activeInlineCaret = null;
    }

    const line = document.createElement("div");
    line.className = "terminal__line";
    if (config.tone) line.classList.add(`terminal__line--${config.tone}`);

    if (config.prompt) {
      const prompt = document.createElement("span");
      prompt.className = "terminal__prompt-inline";
      prompt.textContent = ">";
      line.append(prompt);
    }

    if (config.prefix) {
      const prefix = document.createElement("span");
      prefix.className = `terminal__prefix terminal__prefix--${config.prefixTone || "ok"}`;
      prefix.textContent = config.prefix;
      line.append(prefix);
    }

    const content = document.createElement("span");
    line.append(content);

    activeInlineCaret = document.createElement("span");
    activeInlineCaret.className = "terminal__inline-caret";
    activeInlineCaret.setAttribute("aria-hidden", "true");
    line.append(activeInlineCaret);

    terminalOutput.append(line);

    if (config.before) await sleep(config.before);

    const characters = Array.from(config.text);

    for (let index = 0; index < characters.length; index += 1) {
      content.textContent += characters[index];

      if (config.speed > 0) {
        await sleep(config.speed + (Math.random() < 0.12 ? 22 : 0));
      }
    }
  }

  function initReveals() {
    // Hero виден сразу после загрузки: не ждём IntersectionObserver на первом экране.
    $$(".hero .reveal").forEach((item) => item.classList.add("is-visible"));

    const items = $$(".reveal:not(.is-visible)");

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -3% 0px" }
    );

    items.forEach((item) => observer.observe(item));
  }

  function finishBoot() {
    if (bootFinished) return;
    bootFinished = true;

    if (bootTimer) window.clearTimeout(bootTimer);
    if (boot) boot.classList.add("is-leaving");

    document.body.classList.remove("is-booting");
    document.body.classList.add("is-ready");
    setPageInert(false);
    initReveals();
    startAmbientParticles();
    updateScrollUI();

    // Boot-звук уходит, lo-fi приходит ему на смену сразу после консоли.
    stopSound("typing", 240);
    stopSound("boot", 1400);
    startLofi(userVolume, 1600);
    preloadDeferredSounds();

    window.setTimeout(() => {
      const terminal = $(".terminal");
      if (terminal) terminal.classList.remove("is-typing");
      if (boot) boot.hidden = true;
    }, 850);
  }

  function completeBootSequence() {
    if (bootSequenceDone) return;
    bootSequenceDone = true;

    const terminal = $(".terminal");
    if (terminal) terminal.classList.remove("is-typing");

    stopSound("typing", 300);
    setSoundVolume("boot", 0.62, 500);

    if (prefersReducedMotion) {
      // Даём boot-звуку коротко проявиться, даже если анимации отключены.
      bootTimer = window.setTimeout(finishBoot, 1300);
      return;
    }

    bootTimer = window.setTimeout(finishBoot, 1650);
  }

  async function runBoot() {
    if (!boot || !terminalOutput) {
      document.body.classList.remove("is-booting");
      document.body.classList.add("is-ready");
      setPageInert(false);
      initReveals();
      startAmbientParticles();
      return;
    }

    // Boot — «подложка». Печать идёт поверх неё, а сам boot лишь приглушается.
    const terminal = $(".terminal");
    if (terminal) terminal.classList.add("is-typing");
    startBootSound(true);

    if (prefersReducedMotion) {
      bootLines.forEach(renderLineImmediately);
      completeBootSequence();
      return;
    }

    playSound("typing", { volume: 0.4, fadeIn: 320, stopOthers: false });
    setSoundVolume("boot", 0.3, 600);

    for (const line of bootLines) {
      await typeLine(line);
      if (line.speed > 0) await sleep(240);
    }

    if (activeInlineCaret) {
      activeInlineCaret.remove();
      activeInlineCaret = null;
    }
    completeBootSequence();
  }

  /* ---------- Скролл: прогресс и шапка ---------- */
  const header = $("#siteHeader");
  const progress = $("#scrollProgress");
  let scrollTicking = false;

  function updateScrollUI() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, scrollTop / scrollable));

    if (progress) progress.style.transform = `scaleX(${ratio})`;
    if (header) header.classList.toggle("is-scrolled", scrollTop > 24);
  }

  window.addEventListener(
    "scroll",
    () => {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(() => {
        updateScrollUI();
        scrollTicking = false;
      });
    },
    { passive: true }
  );

  window.addEventListener("resize", updateScrollUI, { passive: true });

  /* ---------- Золотое свечение за курсором ---------- */
  if (hasFinePointer && !prefersReducedMotion) {
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight * 0.4;
    let pointerFrame = null;

    document.addEventListener(
      "pointermove",
      (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;

        if (pointerFrame) return;
        pointerFrame = window.requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--mx", `${pointerX}px`);
          document.documentElement.style.setProperty("--my", `${pointerY}px`);
          pointerFrame = null;
        });
      },
      { passive: true }
    );
  }

  /* ---------- Canvas: конфетти ---------- */
  const canvas = $("#confetti");
  const context = canvas ? canvas.getContext("2d") : null;

  let canvasWidth = window.innerWidth;
  let canvasHeight = window.innerHeight;
  let pixelRatio = 1;
  let particles = [];
  let animationFrame = null;
  let previousTime = 0;

  const confettiColors = ["#FFD700", "#D4AF37", "#8C6A1C", "#FFF0B8", "#111114", "#05070D"];

  function resizeCanvas() {
    if (!canvas || !context) return;

    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = Math.round(canvasWidth * pixelRatio);
    canvas.height = Math.round(canvasHeight * pixelRatio);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function createParticle(x, y, options = {}) {
    const angle = options.angle ?? random(0, Math.PI * 2);
    const speed = options.speed ?? random(2.8, 12.5);
    const life = random(1.45, 2.9);
    const shapeRoll = Math.random();
    const shape = shapeRoll < 0.68 ? "rect" : shapeRoll < 0.93 ? "circle" : "spark";
    const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];

    return {
      x: x + random(-24, 24),
      y: y + random(-18, 18),
      vx: Math.cos(angle) * speed * random(0.55, 1.12),
      vy: Math.sin(angle) * speed * random(0.55, 1.12) - random(0, 2.4),
      width: shape === "spark" ? random(1, 2) : random(3.4, 8.5),
      height: shape === "spark" ? random(7, 15) : random(5, 13),
      color,
      shape,
      rotation: random(0, Math.PI * 2),
      rotationSpeed: random(-0.24, 0.24),
      life,
      maxLife: life,
      gravity: random(0.09, 0.17),
      drag: random(0.982, 0.992),
      wobble: random(0, Math.PI * 2),
      wobbleSpeed: random(0.08, 0.2)
    };
  }

  function burstConfetti(x = window.innerWidth / 2, y = window.innerHeight / 2, amount = 140) {
    if (!canvas || !context) return;

    const count = prefersReducedMotion ? Math.min(30, amount) : amount;

    for (let index = 0; index < count; index += 1) {
      particles.push(
        createParticle(x, y, {
          angle: random(0, Math.PI * 2),
          speed: random(3.2, 14.5)
        })
      );
    }

    if (!animationFrame) {
      previousTime = performance.now();
      animationFrame = window.requestAnimationFrame(animateConfetti);
    }
  }

  function burstWindParticles(x, y, amount = 110) {
    if (!canvas || !context) return;

    const count = prefersReducedMotion ? Math.min(24, amount) : amount;

    for (let index = 0; index < count; index += 1) {
      const particle = createParticle(x, y, {
        angle: Math.PI,
        speed: random(7, 17)
      });

      // Ветер уносит осколки кнопки влево, за пределы экрана.
      particle.vx = -random(8, 24);
      particle.vy = random(-5, 5);
      particle.gravity = random(0.003, 0.018);
      particle.drag = 0.997;
      particle.width = random(1.5, 5.5);
      particle.height = random(2.5, 9);
      particle.life = random(1.8, 3.2);
      particle.maxLife = particle.life;
      particles.push(particle);
    }

    if (!animationFrame) {
      previousTime = performance.now();
      animationFrame = window.requestAnimationFrame(animateConfetti);
    }
  }

  function drawParticle(particle, alpha) {
    if (!context) return;

    context.save();
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation);
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;

    if (particle.shape === "circle") {
      context.beginPath();
      context.arc(0, 0, particle.width * 0.65, 0, Math.PI * 2);
      context.fill();
    } else if (particle.shape === "spark") {
      context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
      context.globalAlpha = alpha * 0.45;
      context.fillStyle = "#FFD700";
      context.fillRect(-particle.width * 1.5, -particle.height / 2, particle.width * 3, particle.height);
    } else if (particle.shape === "triangle") {
      context.beginPath();
      context.moveTo(0, -particle.height / 2);
      context.lineTo(particle.width / 2, particle.height / 2);
      context.lineTo(-particle.width / 2, particle.height / 2);
      context.closePath();
      context.fill();
    } else {
      context.fillRect(
        -particle.width / 2,
        -particle.height / 2,
        particle.width,
        particle.height
      );

      if (particle.color === "#111114" || particle.color === "#05070D") {
        context.globalAlpha = alpha * 0.34;
        context.strokeStyle = "#D4AF37";
        context.lineWidth = 0.7;
        context.strokeRect(
          -particle.width / 2,
          -particle.height / 2,
          particle.width,
          particle.height
        );
      }
    }

    context.restore();
  }

  function animateConfetti(time) {
    if (!context) return;

    const delta = Math.min(2.2, Math.max(0.35, (time - previousTime) / 16.6667));
    previousTime = time;
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    particles = particles.filter((particle) => {
      particle.life -= 0.016 * delta;
      if (particle.life <= 0) return false;

      particle.vx *= Math.pow(particle.drag, delta);
      particle.vy = particle.vy * Math.pow(particle.drag, delta) + particle.gravity * delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.rotation += particle.rotationSpeed * delta;
      particle.wobble += particle.wobbleSpeed * delta;
      particle.x += Math.sin(particle.wobble) * 0.18 * delta;

      const fade = Math.min(1, particle.life / 0.55);
      drawParticle(particle, fade);
      return true;
    });

    if (particles.length > 0) {
      animationFrame = window.requestAnimationFrame(animateConfetti);
    } else {
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      animationFrame = null;
    }
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas, { passive: true });

  /* ---------- Кнопка «Погнали» ---------- */
  const startExam = $("#startExam");
  const examSection = $("#exam");

  if (startExam && examSection) {
    startExam.addEventListener("click", () => {
      // Пользователь уже взаимодействует — заранее разблокируем мурчание.
      primeSound("purr");

      const rect = startExam.getBoundingClientRect();
      burstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 46);

      window.setTimeout(() => {
        examSection.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start"
        });
      }, 80);
    });
  }

  /* ---------- Запушить баги ---------- */
  const examCard = $("#examCard");
  const releaseBugs = $("#releaseBugs");
  const examQuote = $("#examQuote");
  const examSub = $("#examSub");
  const bugCount = $("#bugCount");
  const bugStatusText = $("#bugStatusText");

  let bugsReleased = false;

  function releaseTheBugs() {
    hideNotPressMeme();
    burstConfetti(window.innerWidth / 2, window.innerHeight * 0.5, 165);

    window.setTimeout(() => {
      burstConfetti(window.innerWidth * 0.24, window.innerHeight * 0.42, 46);
      burstConfetti(window.innerWidth * 0.76, window.innerHeight * 0.58, 46);
    }, 170);

    if (bugsReleased || !examCard || !examQuote) return;

    bugsReleased = true;
    examCard.classList.add("is-switching");

    window.setTimeout(() => {
      examQuote.innerHTML = "Багов у нас нет. <em>У нас только фичи</em>";
      examCard.classList.remove("is-switching");
      examCard.classList.add("is-clean");

      if (examSub) examSub.textContent = "0 ошибок · production-ready · деплой прошёл.";
      if (bugCount) bugCount.textContent = "0";
      if (bugStatusText) bugStatusText.textContent = "stable";

      if (releaseBugs) {
        const label = releaseBugs.querySelector("span");
        if (label) label.textContent = "Ещё раз";
        releaseBugs.setAttribute("aria-label", "Запушить баги ещё раз");
      }

      if (!disintegrateNotPress({ onDone: revealContinueButton, showMeme: false })) {
        revealContinueButton();
      }
    }, 230);
  }

  if (releaseBugs) releaseBugs.addEventListener("click", releaseTheBugs);

  /* ---------- Кнопка «Не нажимать» ---------- */
  const notPress = $("#notPress");
  const evadeRunner = $("#evadeRunner");
  const evadeSlot = $("#evadeSlot");
  const continueAfterFail = $("#continueAfterFail");
  const notPressMeme = $("#notPressMeme");
  let notPressMemeSuppressed = false;

  let evadeArmed = false;
  let runX = 0;
  let runY = 0;
  let lastEvade = 0;
  let notPressModalTimer = null;
  let notPressGone = false;

  function revealContinueButton() {
    if (!continueAfterFail) {
      if (releaseBugs) releaseBugs.focus({ preventScroll: true });
      return;
    }

    continueAfterFail.hidden = false;
    window.requestAnimationFrame(() => {
      continueAfterFail.classList.add("is-visible");
    });

    window.setTimeout(() => {
      continueAfterFail.focus({ preventScroll: true });
    }, 460);
  }

  function showNotPressMeme() {
    if (!notPressMeme || notPressMemeSuppressed) return;
    if (notPressMeme.classList.contains("is-visible")) return;

    notPressMeme.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(() => {
      notPressMeme.classList.add("is-visible");
    });
  }

  function hideNotPressMeme() {
    if (!notPressMeme) return;

    notPressMemeSuppressed = true;
    notPressMeme.classList.remove("is-visible");
    notPressMeme.setAttribute("aria-hidden", "true");
  }

  function spawnMatrixParticles(x, y, amount = 2) {
    if (!canvas || !context) return;

    const colors = ["#FFD700", "#D4AF37", "#FFF0B8", "#f7f4ec", "#111114"];

    for (let index = 0; index < amount; index += 1) {
      const life = random(1.2, 2.3);

      particles.push({
        x: x + random(-4, 4),
        y: y + random(-6, 6),
        vx: -random(0.2, 1.9),
        vy: random(-0.9, 0.5),
        width: random(1, 3.6),
        height: random(2, 9),
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() < 0.55 ? "triangle" : "rect",
        rotation: random(0, Math.PI * 2),
        rotationSpeed: random(-0.06, 0.06),
        life,
        maxLife: life,
        gravity: random(-0.008, 0.01),
        drag: random(0.992, 0.999),
        wobble: random(0, Math.PI * 2),
        wobbleSpeed: random(0.04, 0.1)
      });
    }

    if (!animationFrame) {
      previousTime = performance.now();
      animationFrame = window.requestAnimationFrame(animateConfetti);
    }
  }

  function disintegrateNotPress({ onDone, showMeme = true } = {}) {
    if (!notPress || notPress.hidden || notPressGone) return false;

    notPressGone = true;
    evadeArmed = false;

    const rect = notPress.getBoundingClientRect();
    const duration = 2200;
    const columns = 28;
    const edgeJitter = [0, -2.5, 1.5, -1, 2.5, -1.5, 1, 0];
    let nextColumn = columns - 1;
    let memeShown = false;
    const startedAt = performance.now();

    notPress.classList.add("is-disintegrating");

    const finish = () => {
      notPress.hidden = true;
      notPress.style.clipPath = "";
      if (evadeRunner) evadeRunner.hidden = true;
      if (showMeme) showNotPressMeme();

      if (onDone) {
        onDone();
      } else if (releaseBugs) {
        releaseBugs.focus({ preventScroll: true });
      }
    };

    const frame = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const edge = Math.max(0, Math.min(100, 100 - progress * 100));

      // Матричное растворение справа налево: рваный фронт, а не ровная полоса.
      const points = ["0% 0%", `${edge}% 0%`];
      for (let index = 1; index < edgeJitter.length; index += 1) {
        const y = (index / edgeJitter.length) * 100;
        const x = Math.max(0, Math.min(100, edge + edgeJitter[index]));
        points.push(`${x}% ${y}%`);
      }
      points.push(`${edge}% 100%`, "0% 100%");
      notPress.style.clipPath = `polygon(${points.join(", ")})`;

      const targetColumn = Math.floor((1 - progress) * (columns - 1));
      while (nextColumn >= targetColumn && nextColumn >= 0) {
        const x = rect.left + ((nextColumn + 0.5) / columns) * rect.width;
        for (let row = 0; row < 3; row += 1) {
          spawnMatrixParticles(x, rect.top + random(6, rect.height - 6), 2);
        }
        nextColumn -= 1;
      }

      if (showMeme && !memeShown && progress > 0.52) {
        memeShown = true;
        showNotPressMeme();
      }

      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        finish();
      }
    };

    window.requestAnimationFrame(frame);
    return true;
  }

  function jumpAway(pointerX, pointerY) {
    if (!notPress || !evadeRunner || !examCard) return;

    const now = performance.now();
    if (now - lastEvade < 280) return;
    lastEvade = now;

    const buttonRect = notPress.getBoundingClientRect();
    const cardRect = examCard.getBoundingClientRect();
    const baseLeft = buttonRect.left - runX;
    const baseTop = buttonRect.top - runY;
    const padding = 14;

    const minX = cardRect.left + padding - baseLeft;
    const maxX = cardRect.right - padding - buttonRect.width - baseLeft;
    const minY = cardRect.top + padding - baseTop;
    const maxY = cardRect.bottom - padding - buttonRect.height - baseTop;

    if (maxX <= minX && maxY <= minY) return;

    let bestX = runX;
    let bestY = runY;
    let bestDistance = -1;

    for (let attempt = 0; attempt < 14; attempt += 1) {
      const nextX = maxX > minX ? random(minX, maxX) : runX;
      const nextY = maxY > minY ? random(minY, maxY) : runY;
      const centerX = baseLeft + buttonRect.width / 2 + nextX;
      const centerY = baseTop + buttonRect.height / 2 + nextY;
      const distance = Math.hypot(centerX - pointerX, centerY - pointerY);

      if (distance > bestDistance) {
        bestDistance = distance;
        bestX = nextX;
        bestY = nextY;
      }
    }

    runX = bestX;
    runY = bestY;

    evadeRunner.style.setProperty("--run-x", `${runX}px`);
    evadeRunner.style.setProperty("--run-y", `${runY}px`);
    evadeRunner.style.setProperty("--run-tilt", `${random(-9, 9).toFixed(1)}deg`);
  }

  function armTheButton() {
    if (!notPress) return;

    // Кнопка больше не убегает: только один оборот и ошибка 403.
    evadeArmed = false;
    notPress.classList.remove("is-spinning");
    // Перезапуск CSS-анимации на случай повторного клика.
    void notPress.offsetWidth;
    notPress.classList.add("is-spinning");

    window.setTimeout(() => {
      if (notPress) notPress.classList.remove("is-spinning");
    }, 900);
  }

  function dissolveNotPress() {
    disintegrateNotPress();
  }

  if (notPress) {
    notPress.addEventListener("click", () => {
      armTheButton();

      if (notPressModalTimer) window.clearTimeout(notPressModalTimer);

      // Даём кнопке сделать полный оборот до того, как откроется ошибка.
      notPressModalTimer = window.setTimeout(() => {
        // Дальше кнопкой управляет уже сценарий ошибки, а не побег.
        evadeArmed = false;

        openModal({
          kicker: "403 / ACCESS DENIED",
          title: "Ошибка 403",
          text: "Ну вот, опять все сломалось. Слишком много поздравлений. Подожди немного!",
          announce: "Ошибка 403: Ну вот, опять все сломалось. Слишком много поздравлений. Подожди немного!",
          action: "Поняла, жду",
          fine: "Попробуй позже. Или не пробуй — результат тот же.",
          icon: warningIcon(),
          tone: "error",
          onClose: dissolveNotPress
        });
      }, 520);
    });

    notPress.addEventListener("animationend", () => {
      notPress.classList.remove("is-spinning");
    });
  }

  if (examCard) {
    examCard.addEventListener(
      "pointermove",
      (event) => {
        if (!evadeArmed || !notPress || event.pointerType !== "mouse") return;
        if (document.body.classList.contains("is-modal-open")) return;

        const rect = notPress.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);

        if (distance < 120) jumpAway(event.clientX, event.clientY);
      },
      { passive: true }
    );

    // На тач-экранах кнопка тоже немного паникует после первого нажатия.
    if (evadeSlot && window.matchMedia("(hover: none)").matches) {
      evadeSlot.addEventListener("pointerdown", (event) => {
        if (!evadeArmed) return;
        jumpAway(event.clientX, event.clientY);
      });
    }
  }

  if (continueAfterFail) {
    continueAfterFail.addEventListener("click", () => {
      const sincere = $("#sincere");
      if (!sincere) return;

      sincere.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start"
      });
    });
  }

  /* ---------- Котик на слове «мурррчания» ---------- */
  const purrWord = $("#purrWord");
  let purrTimer = null;
  let purrLeaveTimer = null;

  function startPurringSound(loop) {
    duckLofi();

    const result = loop
      ? playSound("purr", {
          volume: 0.55,
          loop: true,
          fadeIn: 250,
          crossfade: 400
        })
      : playSound("purr", {
          volume: 0.6,
          fadeIn: 180,
          fadeOutAfter: 10000,
          fadeOutDuration: 800,
          crossfade: 400
        });

    if (result && typeof result.then === "function") {
      result.then((ok) => {
        if (!ok) unduckLofi();
      });
    }
  }

  function stopPurringSound(fadeMs = 350) {
    stopSound("purr", fadeMs);
    unduckLofi();
  }

  function fadeOutPurrVisual() {
    if (!purrWord || !purrWord.classList.contains("is-purring")) return;

    purrWord.classList.add("is-leaving");

    if (purrLeaveTimer) window.clearTimeout(purrLeaveTimer);
    purrLeaveTimer = window.setTimeout(() => {
      purrLeaveTimer = null;
      purrWord.classList.remove("is-purring", "is-leaving");
    }, 900);
  }

  function startPurring({ loopSound = true, visualMs = 0 } = {}) {
    if (!purrWord) return;

    if (purrTimer) {
      window.clearTimeout(purrTimer);
      purrTimer = null;
    }

    if (purrLeaveTimer) {
      window.clearTimeout(purrLeaveTimer);
      purrLeaveTimer = null;
    }

    purrWord.classList.remove("is-leaving");
    purrWord.classList.add("is-purring");
    startPurringSound(loopSound);

    if (visualMs > 0) {
      purrTimer = window.setTimeout(() => {
        purrTimer = null;
        stopPurring();
      }, visualMs);
    }
  }

  function stopPurring() {
    if (!purrWord) return;

    if (purrTimer) {
      window.clearTimeout(purrTimer);
      purrTimer = null;
    }

    stopPurringSound();
    fadeOutPurrVisual();
  }

  if (purrWord) {
    purrWord.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") startPurring({ loopSound: true });
    });

    purrWord.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") stopPurring();
    });

    purrWord.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType === "mouse") return;
        event.preventDefault();
        startPurring({ loopSound: false, visualMs: 10000 });
      },
      { passive: false }
    );

    purrWord.addEventListener("focus", () => {
      if (purrWord.matches(":focus-visible")) startPurring({ loopSound: true });
    });

    purrWord.addEventListener("blur", stopPurring);

    purrWord.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();

      if (purrWord.classList.contains("is-purring")) {
        stopPurring();
      } else {
        startPurring({ loopSound: false, visualMs: 10000 });
      }
    });
  }

  /* ---------- Музыка ---------- */
  const audio = $("#bgMusic");
  const musicPlayer = $("#musicPlayer");
  const musicToggle = $("#musicToggle");
  const musicState = $("#musicState");
  const musicVolume = $("#musicVolume");
  const musicVolumeValue = $("#musicVolumeValue");

  const LOFI_VOLUME = 0.5;
  let musicBusy = false;
  let fadeTimer = null;
  let lofiDucked = false;
  let userVolume = LOFI_VOLUME;

  function syncVolumeUI() {
    const percent = Math.round(userVolume * 100);
    if (musicVolume) {
      musicVolume.value = String(percent);
      musicVolume.style.setProperty("--vol", `${percent}%`);
    }
    if (musicVolumeValue) musicVolumeValue.textContent = `${percent}%`;
  }

  function setUserVolume(percent) {
    const next = Number(percent);
    if (!Number.isFinite(next)) return;

    userVolume = Math.min(1, Math.max(0, next / 100));
    syncVolumeUI();

    if (!audio || audio.paused) return;
    fadeMusic(lofiDucked ? userVolume * 0.6 : userVolume, 120);
  }

  function setMusicUI(isPlaying) {
    if (!musicToggle) return;
    if (musicPlayer) musicPlayer.classList.toggle("is-playing", isPlaying);
    musicToggle.classList.toggle("is-playing", isPlaying);
    musicToggle.setAttribute("aria-pressed", String(isPlaying));
    musicToggle.setAttribute(
      "aria-label",
      isPlaying ? "Выключить фоновую музыку" : "Включить фоновую музыку"
    );
    if (musicState) musicState.textContent = isPlaying ? "играет" : "включить";
  }

  function fadeMusic(targetVolume, duration, done) {
    if (!audio) return;

    if (fadeTimer) window.clearInterval(fadeTimer);

    const startVolume = audio.volume;
    const startedAt = performance.now();

    fadeTimer = window.setInterval(() => {
      const progressValue = Math.min(1, (performance.now() - startedAt) / duration);
      audio.volume = Math.min(1, Math.max(0, startVolume + (targetVolume - startVolume) * progressValue));

      if (progressValue >= 1) {
        window.clearInterval(fadeTimer);
        fadeTimer = null;
        if (done) done();
      }
    }, 40);
  }

  function duckLofi() {
    if (!audio || audio.paused) return;
    lofiDucked = true;
    fadeMusic(Math.max(0, userVolume * 0.6), 320);
  }

  function unduckLofi() {
    if (!audio || audio.paused || !lofiDucked) return;
    lofiDucked = false;
    fadeMusic(userVolume, 550);
  }

  if (musicVolume) {
    syncVolumeUI();
    musicVolume.addEventListener("input", (event) => setUserVolume(event.target.value));
  }

  let lofiRetryArmed = false;

  function armLofiRetry() {
    if (lofiRetryArmed) return;
    lofiRetryArmed = true;

    const retry = () => {
      lofiRetryArmed = false;
      document.removeEventListener("click", retry, true);
      document.removeEventListener("keydown", retry, true);
      startLofi(userVolume, 900);
    };

    document.addEventListener("click", retry, { once: true, capture: true });
    document.addEventListener("keydown", retry, { once: true, capture: true });
  }

  async function startLofi(targetVolume = userVolume, duration = 1400) {
    if (!audio || musicBusy) return;
    musicBusy = true;

    const volume = lofiDucked ? userVolume * 0.6 : targetVolume;

    try {
      if (!audio.paused) {
        setMusicUI(true);
        fadeMusic(volume, duration);
        return;
      }

      if (audio.ended) {
        try {
          audio.currentTime = 0;
        } catch (error) {
          // ignore
        }
      }

      audio.muted = false;
      audio._primeToken = null;
      audio.volume = 0;
      await audio.play();
      setMusicUI(true);
      fadeMusic(volume, duration);
    } catch (error) {
      setMusicUI(false);

      // Автоплей могли заблокировать — включим музыку на первом жесте.
      if (error && error.name === "NotAllowedError") {
        armLofiRetry();
        return;
      }

      showToast("Файл sounds/lofi.mp3 не найден. Положи трек в папку sounds — и музыка заиграет.");
    } finally {
      musicBusy = false;
    }
  }

  function stopLofi(duration = 650) {
    if (!audio) return;
    lofiDucked = false;

    if (audio.paused) {
      setMusicUI(false);
      return;
    }

    fadeMusic(0, duration, () => {
      audio.pause();
      audio.volume = userVolume;
      setMusicUI(false);
    });
  }

  async function toggleMusic() {
    if (!audio || musicBusy) return;

    if (!audio.paused) {
      stopLofi(420);
      return;
    }

    await startLofi(userVolume, 900);
  }

  if (musicToggle) musicToggle.addEventListener("click", toggleMusic);

  if (audio) {
    // Lo-fi зациклена до открытия зачётки — дальше её останавливает openTheGradebook().
    audio.loop = true;
    audio.addEventListener("ended", () => {
      setMusicUI(false);
      audio.volume = userVolume;
      try {
        audio.currentTime = 0;
      } catch (error) {
        // ignore
      }
    });
  }

  /* ---------- Тост ---------- */
  const toast = $("#toast");
  const toastText = $("#toastText");
  let toastTimer = null;

  function showToast(message, duration = 4600) {
    if (!toast || !toastText) return;

    toastText.textContent = message;
    toast.classList.add("is-visible");

    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, duration);
  }

  /* ---------- Модальное окно ---------- */
  const modal = $("#modal");
  const modalDialog = $(".modal__dialog");
  const modalIcon = $("#modalIcon");
  const modalKicker = $("#modalKicker");
  const modalTitle = $("#modalTitle");
  const modalText = $("#modalText");
  const modalAction = $("#modalAction");
  const modalFine = $("#modalFine");
  const modalScore = $("#modalScore");
  const modalScoreValue = $("#modalScoreValue");

  const pageRegions = $$("header, main, .music");

  let modalOpen = false;
  let modalCloseTimer = null;
  let lastFocused = null;
  let modalOnClose = null;

  function setPageInert(isInert) {
    pageRegions.forEach((region) => {
      if (isInert) {
        region.setAttribute("inert", "");
      } else {
        region.removeAttribute("inert");
      }
    });
  }

  function warningIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M10.2 4.3 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.8 4.3a2 2 0 0 0-3.6 0Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M12 9v4.5M12 16.7v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;
  }

  function successIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }

  function openModal(config) {
    if (!modal) return;

    if (modalCloseTimer) {
      window.clearTimeout(modalCloseTimer);
      modalCloseTimer = null;
    }

    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalOnClose = typeof config.onClose === "function" ? config.onClose : null;

    if (modalDialog) {
      modalDialog.setAttribute(
        "aria-label",
        config.announce || `${config.title || ""}. ${config.text || ""}`.trim()
      );
    }

    if (modalKicker) modalKicker.textContent = config.kicker || "";
    if (modalTitle) modalTitle.textContent = config.title || "";
    if (modalText) modalText.textContent = config.text || "";
    if (modalAction) modalAction.textContent = config.action || "Закрыть";
    if (modalFine) modalFine.textContent = config.fine || "";

    if (modalScoreValue) modalScoreValue.textContent = config.score || "5";
    modal.classList.toggle("has-score", Boolean(config.score));

    if (modalIcon) {
      modalIcon.className = "modal__icon";
      if (config.tone === "error") modalIcon.classList.add("modal__icon--error");
      modalIcon.innerHTML = config.icon || successIcon();
    }

    if (modalScore) modalScore.setAttribute("aria-hidden", String(!config.score));

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-modal-open");
    setPageInert(true);
    modalOpen = true;

    window.requestAnimationFrame(() => {
      modal.classList.add("is-open");
      window.setTimeout(() => {
        if (!modalOpen) return;
        if (modalAction) {
          modalAction.focus({ preventScroll: true });
        } else {
          modal.focus({ preventScroll: true });
        }
      }, 110);
    });

    if (config.confetti) {
      window.setTimeout(() => {
        burstConfetti(window.innerWidth / 2, window.innerHeight * 0.38, 130);
      }, 240);
    }
  }

  function closeModal() {
    if (!modal || !modalOpen) return;

    modalOpen = false;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-modal-open");
    setPageInert(false);

    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }

    modalCloseTimer = window.setTimeout(() => {
      if (!modalOpen) modal.hidden = true;
    }, 340);

    const onClose = modalOnClose;
    modalOnClose = null;
    if (onClose) {
      window.setTimeout(onClose, 400);
    }
  }

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close]")) closeModal();
    });

    document.addEventListener("keydown", (event) => {
      if (!modalOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = $$(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        modal
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* ---------- Зачетная книжка ---------- */
  const gradebook = $("#gradebook");
  const gradebookFront = $("#gradebookFront");
  const gradebookBack = $("#gradebookBack");
  const openGradebook = $("#openGradebook");
  const passGradebook = $("#passGradebook");
  const failGradebook = $("#failGradebook");
  const gradebookFailRunner = $("#gradebookFailRunner");
  const gradebookTaunts = $("#gradebookTaunts");
  const gradebookStatus = $("#gradebookStatus");

  let gradebookOpened = false;
  let gradebookPassed = false;
  let gradebookClosing = false;
  let failGone = false;
  let failAttempts = 0;
  let failX = 0;
  let failY = 0;
  let lastFailEvade = 0;

  const failMessages = ["Не сегодня", "Мимо!", "Ай-ай-ай", "Не судьба"];

  function showGradebookTaunt(message) {
    if (!gradebook || !gradebookTaunts || !failGradebook) return;

    const cardRect = gradebook.getBoundingClientRect();
    const buttonRect = failGradebook.getBoundingClientRect();
    const x = Math.min(
      Math.max(buttonRect.left + buttonRect.width / 2 - cardRect.left, 44),
      cardRect.width - 44
    );
    const y = Math.min(Math.max(buttonRect.top - cardRect.top - 8, 34), cardRect.height - 28);

    const taunt = document.createElement("span");
    taunt.className = "gradebook__taunt";
    taunt.textContent = message;
    taunt.style.left = `${x}px`;
    taunt.style.top = `${y}px`;
    gradebookTaunts.append(taunt);

    window.setTimeout(() => taunt.remove(), 1100);
  }

  function openTheGradebook() {
    if (!gradebook || gradebookOpened) return;

    gradebookOpened = true;
    stopLofi(650);
    playSound("bookOpen", {
      volume: 0.82,
      fadeIn: 120,
      crossfade: 500
    });
    gradebook.classList.add("is-open");
    document.body.classList.add("is-gradebook-open");

    if (openGradebook) {
      openGradebook.setAttribute("aria-expanded", "true");
    }

    window.setTimeout(() => {
      gradebook.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start"
      });
    }, 80);

    window.setTimeout(() => {
      if (gradebookFront) {
        gradebookFront.inert = true;
        gradebookFront.setAttribute("aria-hidden", "true");
      }

      if (gradebookBack) {
        gradebookBack.inert = false;
        gradebookBack.removeAttribute("inert");
        gradebookBack.setAttribute("aria-hidden", "false");
      }

      if (passGradebook) passGradebook.focus({ preventScroll: true });
    }, 620);
  }

  function closeTheGradebook() {
    if (!gradebook || !gradebookOpened || gradebookClosing) return;
    gradebookClosing = true;

    playSound("bookClose", {
      volume: 0.85,
      fadeIn: 120,
      crossfade: 450
    });

    gradebook.classList.add("is-closing", "is-closed");
    gradebook.classList.remove("is-open");

    if (gradebookFront) {
      gradebookFront.inert = false;
      gradebookFront.removeAttribute("aria-hidden");
    }

    if (gradebookBack) {
      gradebookBack.inert = true;
      gradebookBack.setAttribute("aria-hidden", "true");
    }

    if (openGradebook) {
      openGradebook.setAttribute("aria-expanded", "false");
      openGradebook.disabled = true;
    }

    window.setTimeout(() => {
      gradebook.classList.remove("is-closing");
    }, 1100);
  }

  function setTheGrade() {
    if (!gradebook || gradebookPassed) return;

    gradebookPassed = true;
    gradebook.classList.add("is-passed");

    // Закрытие и CRT сработают позже, без жеста — заранее разблокируем их.
    ["bookClose", "crtOff"].forEach(primeSound);

    playSound("pen", {
      volume: 0.72,
      fadeIn: 180,
      crossfade: 500
    });

    if (passGradebook) passGradebook.disabled = true;
    if (failGradebook) failGradebook.disabled = true;
    if (gradebookStatus) {
      gradebookStatus.textContent = "Зачет поставлен. Подпись получена.";
    }

    const writingDuration = prefersReducedMotion ? 300 : 3000;
    const finaleDelay = prefersReducedMotion ? 1600 : 5200;

    // Подпись дописана — закрываем зачетку и только потом уходим в финал.
    window.setTimeout(() => {
      stopSound("pen", 320);
      closeTheGradebook();
    }, writingDuration);

    window.setTimeout(startFinale, finaleDelay);
  }

  function attemptFail(pointerX, pointerY) {
    if (!gradebook || !failGradebook || !gradebookFailRunner || !gradebookOpened) return;
    if (gradebookPassed || failGone) return;

    const now = performance.now();
    if (now - lastFailEvade < 300) return;
    lastFailEvade = now;

    failAttempts += 1;

    if (failAttempts >= 5) {
      failGone = true;
      showGradebookTaunt("Пока 👋");
      failGradebook.disabled = true;
      gradebookFailRunner.classList.add("is-gone");

      if (gradebookStatus) {
        gradebookStatus.textContent = "Незачет не поставился. Судьба.";
      }
      return;
    }

    showGradebookTaunt(failMessages[failAttempts - 1]);

    const buttonRect = failGradebook.getBoundingClientRect();
    const paperRect = $(".gradebook__paper")?.getBoundingClientRect();
    if (!paperRect) return;

    const baseLeft = buttonRect.left - failX;
    const baseTop = buttonRect.top - failY;
    const padding = 16;
    const minX = paperRect.left + padding - baseLeft;
    const maxX = paperRect.right - padding - buttonRect.width - baseLeft;
    const minY = paperRect.top + padding - baseTop;
    const maxY = paperRect.bottom - padding - buttonRect.height - baseTop;

    let bestX = failX;
    let bestY = failY;
    let bestDistance = -1;

    for (let attempt = 0; attempt < 16; attempt += 1) {
      const nextX = maxX > minX ? random(minX, maxX) : failX;
      const nextY = maxY > minY ? random(minY, maxY) : failY;
      const centerX = baseLeft + buttonRect.width / 2 + nextX;
      const centerY = baseTop + buttonRect.height / 2 + nextY;
      const distance = Math.hypot(centerX - pointerX, centerY - pointerY);

      if (distance > bestDistance) {
        bestDistance = distance;
        bestX = nextX;
        bestY = nextY;
      }
    }

    failX = bestX;
    failY = bestY;

    gradebookFailRunner.style.setProperty("--fail-x", `${failX}px`);
    gradebookFailRunner.style.setProperty("--fail-y", `${failY}px`);
    gradebookFailRunner.style.setProperty("--fail-tilt", `${random(-9, 9).toFixed(1)}deg`);
  }

  if (openGradebook) {
    openGradebook.addEventListener("click", openTheGradebook);
  }

  if (passGradebook) {
    passGradebook.addEventListener("click", setTheGrade);
  }

  if (failGradebook) {
    failGradebook.addEventListener("pointerenter", (event) => {
      attemptFail(event.clientX, event.clientY);
    });

    failGradebook.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType === "touch" || event.pointerType === "pen") {
          event.preventDefault();
          attemptFail(event.clientX, event.clientY);
        }
      },
      { passive: false }
    );

    failGradebook.addEventListener("click", (event) => {
      if (event.detail === 0) {
        event.preventDefault();
        const rect = failGradebook.getBoundingClientRect();
        attemptFail(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    });
  }

  if (gradebook) {
    gradebook.addEventListener(
      "pointermove",
      (event) => {
        if (!gradebookOpened || gradebookPassed || failGone || !failGradebook) return;
        if (event.pointerType !== "mouse") return;

        const rect = failGradebook.getBoundingClientRect();
        const distance = Math.hypot(
          event.clientX - (rect.left + rect.width / 2),
          event.clientY - (rect.top + rect.height / 2)
        );

        if (distance < 108) attemptFail(event.clientX, event.clientY);
      },
      { passive: true }
    );
  }

  const finalSection = $("#finish");
  if (finalSection && "IntersectionObserver" in window) {
    const finalSectionObserver = new IntersectionObserver(
      (entries) => {
        document.body.classList.toggle("is-final-section", entries[0].isIntersecting);
      },
      { threshold: 0.16 }
    );

    finalSectionObserver.observe(finalSection);
  }

  /* ---------- Финальная сцена ---------- */
  const finale = $("#finale");
  const finaleOutput = $("#finaleOutput");

  let finaleStarted = false;

  const finaleLines = [
    { prompt: true, text: "sudo systemctl stop birthday-party.service", tone: "command", speed: 17 },
    { prefix: "[OK]", text: "Сервис празднования остановлен.", tone: "ok", speed: 9, before: 180 },
    { prompt: true, text: 'echo "С днём рождения!"', tone: "command", speed: 16, before: 190 },
    { text: "С днём рождения!", tone: "output", speed: 12, before: 120 },
    { prompt: true, text: "shutdown -h now", tone: "command", speed: 16, before: 200 },
    { prefix: "[OK]", text: "Завершение работы...", tone: "ok", speed: 9, before: 120 }
  ];

  function makeFinaleLine(config, fullText) {
    const line = document.createElement("div");
    line.className = "finale__line";
    if (config.tone) line.classList.add(`finale__line--${config.tone}`);

    if (config.prompt) {
      const prompt = document.createElement("span");
      prompt.className = "finale__prefix";
      prompt.textContent = ">";
      line.append(prompt);
    }

    if (config.prefix) {
      const prefix = document.createElement("span");
      prefix.className = "finale__prefix";
      prefix.textContent = config.prefix;
      line.append(prefix);
    }

    const content = document.createElement("span");
    content.textContent = fullText;
    line.append(content);
    return line;
  }

  async function typeFinaleLine(config) {
    if (!finaleOutput) return;

    if (config.before) await sleep(config.before);

    const line = makeFinaleLine(config, "");
    const content = line.lastElementChild;
    finaleOutput.append(line);

    const characters = Array.from(config.text);
    for (const character of characters) {
      content.textContent += character;
      await sleep(config.speed + (Math.random() < 0.1 ? 12 : 0));
    }
  }

  async function playFinale() {
    playSound("typing", { volume: 0.46, fadeIn: 300 });

    for (const line of finaleLines) {
      await typeFinaleLine(line);
      await sleep(180);
    }

    stopSound("typing", 260);
    await sleep(500);

    if (finale) {
      finale.classList.add("is-shutting-down");
      playSound("crtOff", {
        volume: 0.9,
        fadeIn: 0,
        fadeOutAfter: 1600,
        fadeOutDuration: 900
      });
    }

    window.setTimeout(() => {
      if (!finale) return;
      finale.classList.add("is-off");
      const quote = $("#finaleQuote");
      if (quote) quote.focus?.({ preventScroll: true });

      // Даём прочитать фразу, плавно гасим её в темноте и сразу закрываем вкладку.
      window.setTimeout(() => {
        if (finale) finale.classList.add("is-fading-out");
      }, 6000);

      window.setTimeout(() => {
        try {
          window.close();
        } catch (error) {
          // Браузер может запретить закрытие вкладки — это ожидаемо.
        }
      }, 7800);
    }, 820);
  }

  function startFinale() {
    if (!finale || finaleStarted) return;
    finaleStarted = true;

    document.body.classList.add("is-finale");
    setPageInert(true);
    stopLofi(800);

    finale.hidden = false;
    finale.setAttribute("aria-hidden", "false");

    window.requestAnimationFrame(() => {
      finale.classList.add("is-active");
      finale.focus({ preventScroll: true });
    });

    window.setTimeout(playFinale, 700);
  }

  /* ---------- Старт ---------- */
  preloadSounds();
  buildSpiral();
  updateScrollUI();
  setPageInert(true);
  startPreloader();
})();
