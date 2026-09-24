/*
 * Hero showreel: start as soon as possible, silently, everywhere.
 *
 * Browsers only allow autoplay when the video is muted. The HTML attribute is
 * not always honoured on its own, so the `muted` property is set again here,
 * play() is called explicitly, and if the browser still refuses (e.g. iOS Low
 * Power Mode) playback starts on the first tap, key press or scroll.
 * The sound button then turns sound on: a user click, so browsers allow it.
 *
 * Every button names the action it will take ("Activer le son", "Pause"), and
 * "Regarder le showreel" restarts the reel with sound, full screen when the
 * browser allows it.
 */
function showreel() {
  const video = document.getElementById("hero-video");
  const controls = document.getElementById("reel-controls");
  const soundBtn = document.getElementById("sound-toggle");
  const pauseBtn = document.getElementById("pause-toggle");
  const watchBtn = document.getElementById("watch-reel");
  if (!video) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const autoplay = !reduceMotion && !saveData;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("webkit-playsinline", "");

  if (!autoplay) {
    video.removeAttribute("autoplay");
    video.preload = "metadata";
  }

  const play = () => {
    const p = video.play();
    return p && typeof p.catch === "function" ? p : Promise.resolve();
  };

  const gestures = ["pointerdown", "touchstart", "keydown", "scroll"];
  const resumeOnGesture = () => {
    const resume = () => {
      gestures.forEach((e) => window.removeEventListener(e, resume));
      play().catch(() => {});
    };
    gestures.forEach((e) => window.addEventListener(e, resume, { passive: true }));
  };

  let wanted = autoplay; // should the reel be playing when visible?
  if (autoplay) play().catch(resumeOnGesture);

  // Pause off-screen and in background tabs; resume when back.
  let onScreen = true;
  const sync = () => {
    if (wanted && onScreen && !document.hidden) play().catch(() => {});
    else video.pause();
  };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    }).observe(video);
  }
  document.addEventListener("visibilitychange", sync);

  // Button labels follow the state they would change.
  const setLabel = (btn, text) => {
    const label = btn && btn.querySelector(".btn__label");
    if (label) label.textContent = text;
  };
  const showSound = () => {
    if (!soundBtn) return;
    soundBtn.dataset.state = video.muted ? "off" : "on";
    setLabel(soundBtn, video.muted ? "Activer le son" : "Couper le son");
  };
  const showPause = () => {
    if (!pauseBtn) return;
    pauseBtn.dataset.state = wanted ? "playing" : "paused";
    setLabel(pauseBtn, wanted ? "Pause" : "Lecture");
  };
  showSound();
  showPause();
  video.addEventListener("volumechange", showSound);

  // The controls are visible from the start (no JS needed to show them) and
  // only go if no file can be played at all; the poster then stays up.
  // A single <source> failing is not enough: the browser falls back to the
  // next one (e.g. 1080p missing → 720p), so only the last one counts.
  const hideControls = () => { if (controls) controls.hidden = true; };
  video.addEventListener("error", hideControls);
  const lastSource = video.querySelector("source:last-of-type");
  if (lastSource) lastSource.addEventListener("error", hideControls);

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      const on = video.muted; // toggling → sound on if it was muted
      video.muted = !on;
      showSound();
      if (on) {
        wanted = true;
        showPause();
        play().catch(() => {});
      }
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      wanted = !wanted;
      showPause();
      sync();
    });
  }

  // Full screen is a bonus: phones and some embeds refuse it, and the reel
  // then simply restarts with sound where it is.
  const enterFullscreen = () => {
    const request = video.requestFullscreen || video.webkitRequestFullscreen;
    if (request) {
      video.controls = true;
      Promise.resolve(request.call(video)).catch(() => { video.controls = false; });
    } else if (video.webkitEnterFullscreen) {
      try { video.webkitEnterFullscreen(); } catch (e) { /* iOS refused */ }
    }
  };
  const leaveFullscreen = () => {
    if ((document.fullscreenElement || document.webkitFullscreenElement) === video) return;
    video.controls = false;
    wanted = !video.paused; // the native controls may have paused it
    showPause();
    showSound();
  };
  document.addEventListener("fullscreenchange", leaveFullscreen);
  document.addEventListener("webkitfullscreenchange", leaveFullscreen);
  video.addEventListener("webkitendfullscreen", leaveFullscreen);

  if (watchBtn) {
    watchBtn.addEventListener("click", () => {
      video.currentTime = 0;
      video.muted = false;
      wanted = true;
      showSound();
      showPause();
      play().catch(() => {});
      enterFullscreen();
    });
  }
}

/*
 * Copy the email address. mailto: links do nothing for visitors without a
 * mail app, so the address is also one click away from the clipboard.
 */
function copyEmail() {
  const btn = document.getElementById("copy-email");
  const email = document.getElementById("contact-email");
  const status = document.getElementById("copy-status");
  if (!btn || !email) return;

  const label = btn.querySelector(".btn__label");
  const idle = label.textContent;
  let timer;
  const say = (text, message) => {
    label.textContent = text;
    if (status) status.textContent = message;
    clearTimeout(timer);
    timer = setTimeout(() => {
      label.textContent = idle;
      if (status) status.textContent = "";
    }, 2500);
  };
  const selectAddress = () => {
    const range = document.createRange();
    range.selectNodeContents(email);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    say("Adresse sélectionnée", "Adresse sélectionnée, copiez-la avec Ctrl+C ou Cmd+C.");
  };

  btn.hidden = false;
  btn.addEventListener("click", () => {
    const address = email.textContent.trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(address).then(
        () => say("Adresse copiée", "Adresse copiée."),
        selectAddress
      );
    } else {
      selectAddress();
    }
  });
}

function init() {
  showreel();
  copyEmail();
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

// Run once the page is fully parsed, however this script got loaded
// (deferred, async, or injected by a host that wraps the page).
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
