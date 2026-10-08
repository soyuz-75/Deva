/*
 * Hero showreel: start as soon as possible, silently, on every browser.
 *
 * - Quality: 1080p on wide screens, 720p on phones, 480p on data saver or a slow
 *   connection. The <video> starts on the 720p <source>; we only swap it when
 *   another size fits better (the <source media> attribute is not honoured by
 *   every browser, so we choose in JS). If a file fails, we step down a size.
 * - Autoplay is only allowed when muted, so the video is muted and `playsinline`
 *   (iOS). When a browser still refuses (iOS Low Power Mode, "never auto-play"
 *   settings, some in-app browsers), the Play button is shown and a tap anywhere
 *   starts it.
 * - The Pause/Play button is always available, and the reel pauses off-screen
 *   and in background tabs. Sound is turned on with the Sound button.
 */
function showreel() {
  const video = document.getElementById("hero-video");
  if (!video) return { setOnScreen() {} };
  const soundBtn = document.getElementById("sound-toggle");
  const playBtn = document.getElementById("play-toggle");

  const conn = navigator.connection || {};
  const saveData = !!conn.saveData;
  const slow = /(^|-)(2g|3g)$/.test(conn.effectiveType || "");
  // Always try to play: the reel is muted and silent, and it has a Pause button.
  // Data saver / slow connections only get the lighter 480p file.
  const autoplay = true;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("x5-playsinline", "");

  // Pick a size, then a list of smaller ones to fall back to.
  const ladder = ["1080", "720", "480"].filter((q) => video.getAttribute("data-src-" + q));
  let first = saveData || slow ? "480" : window.innerWidth >= 1000 ? "1080" : "720";
  if (!ladder.includes(first)) first = ladder.includes("720") ? "720" : ladder[0];
  const queue = ladder.slice(ladder.indexOf(first));
  const swapTo = (q) => {
    video.src = video.getAttribute("data-src-" + q);
    video.load();
  };
  let userPaused = !autoplay;
  let onScreen = true;

  const play = () => {
    const p = video.play();
    return p && typeof p.catch === "function" ? p : Promise.resolve();
  };
  // Autoplay blocked: Safari and every iPhone browser (all WebKit) will still loop an
  // MP4 silently when it is shown as an <img>. Other browsers fail to decode it and
  // the picture is removed, so this only ever adds motion.
  let still = null;
  const dropStill = () => { if (still) { still.remove(); still = null; } };
  const showStill = () => {
    if (still || !video.getAttribute("data-src-480")) return;
    still = document.createElement("img");
    still.className = "hero__still";
    still.alt = "";
    still.setAttribute("aria-hidden", "true");
    still.addEventListener("error", dropStill);
    still.src = video.getAttribute("data-src-480");
    video.insertAdjacentElement("afterend", still);
  };
  video.addEventListener("playing", dropStill);
  const gestures = ["pointerdown", "touchend", "keydown", "click"];
  const resumeOnGesture = () => {
    showStill();
    const resume = () => {
      gestures.forEach((e) => window.removeEventListener(e, resume, true));
      if (!userPaused) sync();
    };
    gestures.forEach((e) => window.addEventListener(e, resume, true));
  };
  const sync = () => {
    if (!userPaused && onScreen && !document.hidden) play().catch(resumeOnGesture);
    else video.pause();
  };

  if (first !== "720") {
    queue.shift();
    swapTo(first);
  } else {
    queue.shift();
  }
  if (!autoplay) {
    video.removeAttribute("autoplay");
    video.preload = "metadata";
  }

  // Safari refuses video from servers that don't answer HTTP Range requests, and
  // some hosts don't. As a last resort, download the small file ourselves and
  // play it from memory (works everywhere, no Range needed).
  let blobTried = false;
  const blobFallback = () => {
    if (blobTried || !window.fetch || !window.URL || !URL.createObjectURL) return false;
    blobTried = true;
    const q = video.getAttribute("data-src-480") ? "480" : "720";
    fetch(video.getAttribute("data-src-" + q))
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then((b) => {
        const type = b.type && b.type.indexOf("video/") === 0 ? b.type : "video/mp4";
        video.src = URL.createObjectURL(new Blob([b], { type }));
        video.load();
        sync();
      })
      .catch(fail);
    return true;
  };

  // If a file can't be played (missing, unsupported), try the blob route once,
  // then the next size down.
  const fail = () => {
    if (blobFallback()) return;
    if (queue.length) {
      swapTo(queue.shift());
      sync();
    } else {
      // Nothing can play inline: offer the file itself in its own tab.
      const link = document.getElementById("reel-fallback");
      if (link) link.hidden = false;
    }
  };
  video.addEventListener("error", fail);
  const lastSource = video.querySelector("source:last-of-type");
  if (lastSource) lastSource.addEventListener("error", () => { if (!video.currentSrc || video.networkState === 3) fail(); });

  const label = () => {
    if (!playBtn) return;
    const playing = !video.paused;
    playBtn.textContent = playing ? "Pause" : "Play";
    playBtn.setAttribute("aria-pressed", String(!playing));
  };
  ["play", "playing", "pause", "ended"].forEach((e) => video.addEventListener(e, label));
  label();

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      userPaused = !video.paused; // playing → pause; paused → play
      if (userPaused) video.pause();
      else play().catch(() => {});
      label();
    });
  }

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      const on = video.muted; // toggling → sound on if it was muted
      video.muted = !on;
      soundBtn.textContent = on ? "Sound — on" : "Sound — off";
      soundBtn.setAttribute("aria-pressed", String(on));
      if (on && video.paused) {
        userPaused = false;
        play().catch(() => {});
      }
    });
  }

  document.addEventListener("visibilitychange", sync);
  if (autoplay) sync();

  // Watchdog: if nothing has started after a few seconds on a normal connection
  // (Safari without Range support tends to hang instead of erroring), use the blob route.
  if (autoplay && !slow) {
    setTimeout(() => {
      if (!userPaused && onScreen && !document.hidden && video.readyState < 3 && video.currentTime === 0) blobFallback();
    }, 7000);
  }
  return {
    setOnScreen(v) {
      onScreen = v;
      sync();
    },
  };
}

/*
 * Selected works: every title is a normal YouTube link (it still works with
 * JavaScript off, or with a middle-click / ctrl-click). A plain click plays the
 * video in place, under its title, and loads the player only then so the page
 * stays light. Opening one closes any other; clicking the title again closes it.
 */
function works() {
  const links = document.querySelectorAll(".film a[data-video]");
  if (!links.length) return;

  const close = (link) => {
    const li = link.closest(".film");
    const box = li.querySelector(".film__player");
    if (box) box.remove();
    link.setAttribute("aria-expanded", "false");
  };

  links.forEach((link) => {
    link.setAttribute("aria-expanded", "false");
    link.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      const wasOpen = link.getAttribute("aria-expanded") === "true";
      links.forEach((l) => { if (l.getAttribute("aria-expanded") === "true") close(l); });
      if (wasOpen) return;

      const box = document.createElement("div");
      box.className = "film__player";
      const iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube-nocookie.com/embed/" + link.dataset.video + "?autoplay=1&rel=0&playsinline=1";
      iframe.title = link.textContent;
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "plain-btn film__close";
      closeBtn.textContent = "close";
      closeBtn.addEventListener("click", () => { close(link); link.focus(); });
      box.append(iframe, closeBtn);
      link.after(box);
      link.setAttribute("aria-expanded", "true");
    });
  });
}

function init() {
  const reel = showreel();
  const video = document.getElementById("hero-video");
  if (video && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => reel.setOnScreen(entry.isIntersecting)).observe(video);
  }
  works();
}

// Run once the page is fully parsed, however this script got loaded
// (deferred, async, or injected by a host that wraps the page).
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
