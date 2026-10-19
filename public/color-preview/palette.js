(() => {
  const key = 'portfolio-color-preview-v1';
  // Approximate colours sampled visually from Lucas's reference.
  const defaults = { bg: [74, 31, 77], accent: [250, 52, 39] };
  let palette = structuredClone(defaults);
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && ['bg', 'accent'].every(k => Array.isArray(saved[k]) && saved[k].length === 3 && saved[k].every((v, i) => Number.isFinite(v) && v >= 0 && v <= (i ? 100 : 360)))) palette = saved;
  } catch {}
  const color = k => `hsl(${palette[k][0]} ${palette[k][1]}% ${palette[k][2]}%)`;
  function hex(k) {
    const [h, s0, l0] = palette[k], s = s0 / 100, l = l0 / 100;
    const a = s * Math.min(l, 1 - l);
    return '#' + [0, 8, 4].map(n => {
      const t = (n + h / 30) % 12;
      return Math.round(255 * (l - a * Math.max(-1, Math.min(t - 3, 9 - t, 1)))).toString(16).padStart(2, '0');
    }).join('').toUpperCase();
  }
  function apply(doc = document) {
    const style = doc.documentElement.style;
    style.setProperty('--preview-bg', color('bg'));
    style.setProperty('--preview-accent', color('accent'));
    if (doc !== document) {
      style.setProperty('--bg-surface', color('bg'));
      style.setProperty('--accent-orange', color('accent'));
      style.setProperty('--surface', color('bg'));
      style.setProperty('--logo-color', color('accent'));
      style.setProperty('--logo-hover', `color-mix(in srgb, ${color('accent')}, black 25%)`);
    }
  }
  apply(); // Before first paint, including restored settings.
  document.addEventListener('DOMContentLoaded', () => {
    const control = document.createElement('details');
    control.className = 'palette';
    control.innerHTML = `<summary aria-label="Farben anpassen" title="Farben anpassen"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="11" stroke="currentColor" stroke-width="1.5"/><path d="M16 5v4M5 16h4M23 16h4M16 23v4M16 16l5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="16" r="2" fill="currentColor"/></svg></summary><div class="palette-panel"><h2>Farben anpassen</h2>${['bg', 'accent'].map(k => `<fieldset><legend><span class="palette-swatch" data-swatch="${k}"></span>${k === 'bg' ? 'Hintergrund' : 'Akzent'}<code data-hex="${k}"></code></legend>${['Farbton', 'Sättigung', 'Helligkeit'].map((label, i) => `<label for="palette-${k}-${i}">${label}<output for="palette-${k}-${i}"></output></label><input id="palette-${k}-${i}" type="range" min="0" max="${i ? 100 : 360}" step="1" data-color="${k}" data-channel="${i}">`).join('')}</fieldset>`).join('')}<button type="button">Zurücksetzen</button></div>`;
    document.body.append(control);
    const frames = [...document.querySelectorAll('#top-bar, .hero-blob')];
    function syncFrame(frame) {
      const doc = frame.contentDocument;
      if (!doc?.head) return;
      if (!doc.getElementById('palette-frame-style')) {
        const css = doc.createElement('style');
        css.id = 'palette-frame-style';
        css.textContent = `:root { --preview-dark: color-mix(in srgb, var(--bg-surface), black 22%); --preview-light: color-mix(in srgb, var(--bg-surface), white 58%); --shadow-soft: 4px 4px 8px var(--preview-dark), -4px -4px 8px var(--preview-light); --shadow-raised-sm: 5px 5px 12px var(--preview-dark), -5px -5px 12px var(--preview-light); --shadow-pressed: inset 5px 5px 10px var(--preview-dark), inset -5px -5px 10px var(--preview-light); --shadow-island: 5px 5px 12px var(--preview-dark); --island-light: -5px -5px 12px var(--preview-light); } .blob { filter: drop-shadow(29px 29px 27px var(--preview-dark)) drop-shadow(-21px -21px 20px var(--preview-light)); } @media(max-width:640px) { :root { --shadow-raised-sm: 3.25px 3.25px 7.8px var(--preview-dark), -3.25px -3.25px 7.8px var(--preview-light); --shadow-pressed: inset 3.25px 3.25px 6.5px var(--preview-dark), inset -3.25px -3.25px 6.5px var(--preview-light); } }`;
        doc.head.append(css);
      }
      apply(doc);
    }
    function render() {
      apply();
      control.querySelectorAll('input').forEach(input => {
        const k = input.dataset.color, i = Number(input.dataset.channel);
        input.value = palette[k][i];
        control.querySelector(`output[for="${input.id}"]`).textContent = `${input.value}${i ? '%' : '°'}`;
      });
      ['bg', 'accent'].forEach(k => {
        control.querySelector(`[data-hex="${k}"]`).textContent = hex(k);
        control.querySelector(`[data-swatch="${k}"]`).style.setProperty('--swatch', color(k));
      });
      frames.forEach(syncFrame);
    }
    frames.forEach(frame => frame.addEventListener('load', () => syncFrame(frame)));
    control.addEventListener('input', e => {
      if (!e.target.matches('input[type=range]')) return;
      palette[e.target.dataset.color][Number(e.target.dataset.channel)] = Number(e.target.value);
      render();
      try { localStorage.setItem(key, JSON.stringify(palette)); } catch {}
    });
    control.querySelector('button').addEventListener('click', () => {
      palette = structuredClone(defaults);
      try { localStorage.removeItem(key); } catch {}
      render();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && control.open) { control.open = false; control.querySelector('summary').focus(); }
    });
    render();
  });
})();
