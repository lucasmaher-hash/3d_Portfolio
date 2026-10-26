// Connect the actual element edges, including on resized or scrolled phones.
(() => {
  const graphs = {
    reschedule: [['task-dragged', 'task-arrived'], ['undo', 'task-restored']],
    live: [['live-switch', 'live-card'], ['live-card', 'island-compact'], ['island-compact', 'island-expanded']]
  };
  document.querySelectorAll('[data-wireflow]').forEach((band, index) => {
    const track = band.querySelector('.wireflow-track'), svg = band.querySelector('.wireflow-connectors');
    let scheduled = false;
    function draw() {
      scheduled = false;
      const origin = track.getBoundingClientRect();
      if (!origin.width || !origin.height) return;
      svg.setAttribute('viewBox', `0 0 ${origin.width} ${origin.height}`);
      const marker = `wireflow-tip-${index}`;
      svg.innerHTML = `<defs><marker id="${marker}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1 7 4 1 7" fill="none" stroke="currentColor" stroke-width="1.95" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;
      for (const [from, to] of graphs[band.dataset.wireflow]) {
        const source = band.querySelector(`[data-flow-anchor="${from}"]`), destination = band.querySelector(`[data-flow-anchor="${to}"]`);
        if (!source || !destination) continue;
        const a = source.getBoundingClientRect(), b = destination.getBoundingClientRect();
        const x1 = a.right - origin.left + 2, y1 = a.top + a.height / 2 - origin.top;
        const x2 = b.left - origin.left - 3, y2 = b.top + b.height / 2 - origin.top;
        const reach = Math.max(8, Math.min(100, (x2 - x1) * .58));
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${x1} ${y1} C${x1 + reach} ${y1}, ${x2 - reach} ${y2}, ${x2} ${y2}`);
        path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '1.95'); path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('marker-end', `url(#${marker})`); svg.appendChild(path);
      }
    }
    function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(draw); } }
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(schedule); observer.observe(track);
      band.querySelectorAll('.wireflow-phone').forEach(phone => observer.observe(phone));
    }
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('message', event => { if (event.data?.type === 'lang-change') schedule(); });
    document.fonts?.ready.then(schedule); schedule();
  });
})();
