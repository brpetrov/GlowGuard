(() => {
  const OVERLAY_ID = "glowguard-overlay";
  if (document.getElementById(OVERLAY_ID)) return;

  const el = document.createElement("div");
  el.id = OVERLAY_ID;
  el.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;pointer-events:none;" +
    "background:rgba(0,0,0,0.10);transition:opacity 0.3s ease;";
  (document.documentElement || document.body).appendChild(el);
})();
