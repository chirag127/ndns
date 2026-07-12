// ndns site — typed command-prompt signature + theme sync. No deps.
(() => {
  // Theme: honor stored choice, else system.
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem("ndns-theme");
    if (saved) root.setAttribute("data-theme", saved);
    else if (matchMedia("(prefers-color-scheme: light)").matches) {
      root.setAttribute("data-theme", "light");
    }
  } catch (_) {
    /* storage blocked — keep default */
  }

  const typed = document.getElementById("typed");
  const dataEl = document.getElementById("prompt-data");
  if (!typed || !dataEl) return;

  let cmds;
  try {
    cmds = JSON.parse(dataEl.textContent || "[]");
  } catch (_) {
    cmds = [];
  }
  if (!cmds.length) return;

  const strip = (s) => s.replace(/^ndns\s*/, "");

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    typed.textContent = strip(cmds[0]);
    return;
  }

  let ci = 0,
    chi = 0,
    deleting = false;
  const tick = () => {
    const full = strip(cmds[ci]);
    if (!deleting) {
      chi++;
      typed.textContent = full.slice(0, chi);
      if (chi >= full.length) {
        deleting = true;
        return setTimeout(tick, 1600);
      }
      return setTimeout(tick, 55 + Math.random() * 45);
    }
    chi--;
    typed.textContent = full.slice(0, chi);
    if (chi <= 0) {
      deleting = false;
      ci = (ci + 1) % cmds.length;
      return setTimeout(tick, 320);
    }
    return setTimeout(tick, 26);
  };
  setTimeout(tick, 500);
})();
