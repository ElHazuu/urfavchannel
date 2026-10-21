/* Isolated underwater daylight wallpaper: never changes the site's navigation logic. */
(() => {
  "use strict";
  try {
    const main = document.getElementById("mainWebsite");
    if (!main) return;
    const style = document.createElement("style");
    style.textContent = `
      #ckUnderwaterLive { position:fixed; inset:0; width:100%; height:100%; object-fit:cover; object-position:center;
        pointer-events:none; z-index:0; display:none; filter:brightness(.82) saturate(.96); }
      #mainWebsite[data-wallpaper="underwater"][data-theme="light"] #ckUnderwaterLive { display:block; }
      #mainWebsite[data-wallpaper="underwater"][data-theme="light"] .welcomeSection {
        background:linear-gradient(90deg,rgba(4,41,65,.48),rgba(6,46,66,.08)) !important;
      }
      #mainWebsite[data-wallpaper="underwater"][data-theme="light"] .underseaBackdrop::before,
      #mainWebsite[data-wallpaper="underwater"][data-theme="light"] .underseaBackdrop::after { opacity:.08; }
      #mainWebsite[data-wallpaper="underwater"][data-theme="light"][data-season="christmas"] #ckUnderwaterLive { display:none; }
      @media (prefers-reduced-motion:reduce) { #ckUnderwaterLive { display:none!important; } }
    `;
    document.head.append(style);
    const video = document.createElement("video");
    video.id = "ckUnderwaterLive";
    video.src = "10862-226635319.mp4";
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-hidden", "true");
    video.setAttribute("playsinline", "");
    main.prepend(video);
    const START = 0, END = 4;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    function sync() {
      const active = main.dataset.wallpaper === "underwater" &&
        main.dataset.theme === "light" && main.dataset.season !== "christmas" &&
        !document.hidden && !reduce.matches;
      if (!active) { video.pause(); return; }
      if (video.readyState >= 1 && video.currentTime >= END) video.currentTime = START;
      if (video.paused) video.play().catch(() => {});
    }
    video.addEventListener("timeupdate", () => { if (video.currentTime >= END) video.currentTime = START; });
    video.addEventListener("loadedmetadata", sync);
    document.addEventListener("visibilitychange", sync);
    reduce.addEventListener?.("change", sync);
    new MutationObserver(sync).observe(main, { attributes:true, attributeFilter:["data-wallpaper","data-theme","data-season"] });
    sync();
  } catch (error) { console.warn("Underwater video disabled:", error); }
})();
