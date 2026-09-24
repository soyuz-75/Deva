/*
 * Hero showreel: start as soon as possible, silently, everywhere.
 *
 * Browsers only allow autoplay when the video is muted. The HTML attribute is
 * not always honoured on its own, so the `muted` property is set again here,
 * play() is called explicitly, and if the browser still refuses (e.g. iOS Low
 * Power Mode) playback starts on the first tap, key press or scroll.
 * The "Son" button then turns sound on — a user click, so browsers allow it.
 */
function showreel() {
  const video = document.getElementById("hero-video");
  const soundBtn = document.getElementById("sound-toggle");
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

  // The sound button is visible from the start (no JS needed to show it) and
  // only goes if no file can be played at all; the poster then stays up.
  // A single <source> failing is not enough: the browser falls back to the
  // next one (e.g. 1080p missing → 720p), so only the last one counts.
  const hideSound = () => { if (soundBtn) soundBtn.hidden = true; };
  video.addEventListener("error", hideSound);
  const lastSource = video.querySelector("source:last-of-type");
  if (lastSource) lastSource.addEventListener("error", hideSound);

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      const on = video.muted; // toggling → sound on if it was muted
      video.muted = !on;
      soundBtn.textContent = on ? "Son — on" : "Son — off";
      soundBtn.setAttribute("aria-pressed", String(on));
      if (on) {
        wanted = true;
        play().catch(() => {});
      }
    });
  }
}

function init() {
  showreel();
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

// Run once the page is fully parsed, however this script got loaded
// (deferred, async, or injected by a host that wraps the page).
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
