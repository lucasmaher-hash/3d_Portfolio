// Preview-only controls; the original scan remains unchanged.
(() => {
  const enabled = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
    || new URLSearchParams(location.search).has('sketch-tuner');
  if (!enabled) return;
  const panel = document.getElementById('sketch-tuner');
  const paper = document.querySelector('.paper--scan');
  if (!panel || !paper) return;
  const defaults = { darkness: 150, tint: 100, ink: '#34343a', paper: '#f6f5f0' };
  const fields = {
    darkness: document.getElementById('sketch-lines'),
    tint: document.getElementById('sketch-tint'),
    ink: document.getElementById('sketch-ink'),
    paper: document.getElementById('sketch-paper')
  };
  const storageKey = 'tomorrow-sketch-preview-v1';
  function apply() {
    const settings = {
      darkness: Number(fields.darkness.value), tint: Number(fields.tint.value),
      ink: fields.ink.value, paper: fields.paper.value
    };
    const color = settings.paper.slice(1).match(/../g).map(hex => parseInt(hex, 16));
    const mixed = color.map(channel => Math.round(255 + (channel - 255) * settings.tint / 100));
    paper.style.setProperty('--sketch-paper', `rgb(${mixed.join(', ')})`);
    document.getElementById('sketch-ink-strength').setAttribute('slope', settings.darkness / 100);
    document.getElementById('sketch-ink-color').setAttribute('flood-color', settings.ink);
    document.getElementById('sketch-lines-value').value = `${settings.darkness}%`;
    document.getElementById('sketch-tint-value').value = `${settings.tint}%`;
    document.getElementById('sketch-settings').value = JSON.stringify(settings, null, 2);
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch {}
  }
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch {}
  for (const [key, field] of Object.entries(fields)) {
    const value = saved?.[key];
    const valid = field.type === 'color' ? /^#[0-9a-f]{6}$/i.test(value)
      : typeof value === 'number' && Number.isFinite(value) && value >= Number(field.min) && value <= Number(field.max);
    field.value = valid ? value : defaults[key];
    field.addEventListener('input', apply);
  }
  document.getElementById('sketch-reset').addEventListener('click', () => {
    for (const [key, field] of Object.entries(fields)) field.value = defaults[key];
    apply();
  });
  panel.hidden = false;
  apply();
})();
