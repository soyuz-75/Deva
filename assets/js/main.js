/*
 * Background showreel: make it start as soon as possible, everywhere.
 *
 * Browsers only allow autoplay when the video is muted. Setting the `muted`
 * attribute in HTML is not always enough (some browsers and frameworks only
 * read the *property*), so we set it again here, call play() explicitly,
 * and fall back to starting on the first user interaction if the browser
 * still refuses (e.g. iOS Low Power Mode).
 */
(function heroVideo() {
  const video = document.getElementById("hero-video");
  if (!video) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  if (reduceMotion || saveData) {
    // Keep the poster only; don't download the loop at all.
    video.removeAttribute("autoplay");
    video.preload = "none";
    return;
  }

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("webkit-playsinline", "");

  const reveal = () => video.classList.add("is-playing");
  video.addEventListener("playing", reveal, { once: true });

  const tryPlay = () => {
    const p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        // Autoplay blocked: start on the first gesture anywhere on the page.
        const resume = () => {
          video.play().catch(() => {});
          ["pointerdown", "touchstart", "keydown", "scroll"].forEach((e) =>
            window.removeEventListener(e, resume)
          );
        };
        ["pointerdown", "touchstart", "keydown", "scroll"].forEach((e) =>
          window.addEventListener(e, resume, { once: true, passive: true })
        );
      });
    }
  };

  // Play as soon as there is enough data; also try immediately.
  if (video.readyState >= 2) tryPlay();
  else video.addEventListener("loadeddata", tryPlay, { once: true });
  tryPlay();

  // Pause when off-screen / tab hidden to save battery, resume when back.
  let visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden) tryPlay();
      else video.pause();
    }).observe(video);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) video.pause();
    else if (visible) tryPlay();
  });
})();

/* Full showreel (with sound) in a fullscreen dialog. */
(function reelPlayer() {
  const dialog = document.getElementById("reel");
  if (!dialog) return;
  const player = dialog.querySelector("video");
  const hero = document.getElementById("hero-video");

  document.querySelectorAll("[data-open-reel]").forEach((btn) =>
    btn.addEventListener("click", () => {
      dialog.showModal();
      if (hero) hero.pause();
      player.play().catch(() => {});
    })
  );

  const close = () => dialog.close();
  dialog.querySelector("[data-close-reel]").addEventListener("click", close);
  dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });
  dialog.addEventListener("close", () => {
    player.pause();
    if (hero) hero.play().catch(() => {});
  });
})();

document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});
