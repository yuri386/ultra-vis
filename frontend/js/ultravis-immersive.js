(() => {
  const story = document.getElementById('ultraPhoneStory');
  const visual = document.getElementById('ultraPhoneVisual');
  const copies = [...document.querySelectorAll('[data-story-copy]')];
  const dock = document.getElementById('ultraAiDock');
  const input = document.getElementById('ultraAiInput');
  const toggle = document.getElementById('ultraAiToggle');
  if (!story || !visual || !copies.length || !dock) return;

  let ticking = false;
  let expandedByStory = false;
  let revealTimer;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const update = () => {
    ticking = false;
    if (story.hidden) return;
    const rect = story.getBoundingClientRect();
    const distance = Math.max(1, story.offsetHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / distance));
    const stage = progress < .22 ? 0 : progress < .45 ? 1 : progress < .67 ? 2 : 3;
    story.dataset.stage = String(stage);
    visual.style.setProperty('--device-reveal', `${Math.round(42 + progress * 58)}%`);
    copies.forEach((copy, index) => copy.classList.toggle('is-active', index === stage));

    if (stage === 3) {
      document.body.classList.add('ultra-ai-ready');
      if (!expandedByStory) {
        expandedByStory = true;
        clearTimeout(revealTimer);
        revealTimer = window.setTimeout(() => {
          dock.classList.add('is-expanded');
          toggle?.setAttribute('aria-expanded', 'true');
        }, reduceMotion ? 0 : 1000);
      }
    }
  };

  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  toggle?.addEventListener('click', () => {
    if (dock.classList.contains('is-expanded')) input?.focus();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestUpdate(); });
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  requestUpdate();
})();
