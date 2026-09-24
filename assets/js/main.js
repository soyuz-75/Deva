/*
 * Hero showreel: start as soon as possible, silently, everywhere.
 *
 * Browsers only allow autoplay when the video is muted. The HTML attribute is
 * not always honoured on its own, so the `muted` property is set again here,
 * play() is called explicitly, and if the browser still refuses (e.g. iOS Low
 * Power Mode) playback starts on the first tap, key press or scroll.
 * The "Son" button then turns sound on — a user click, so browsers allow it.
 */
(function showreel() {
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

  // If the file can't be played at all, the poster (CSS background) stays up.
  video.addEventListener("error", () => { if (soundBtn) soundBtn.hidden = true; }, true);

  if (soundBtn) {
    soundBtn.hidden = false;
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
})();

document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});
