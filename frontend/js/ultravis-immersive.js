(() => {
  const story = document.getElementById('ultraPhoneStory');
  const visual = document.getElementById('ultraPhoneVisual');
  const copies = [...document.querySelectorAll('[data-story-copy]')];
  const dock = document.getElementById('ultraAiDock');
  const input = document.getElementById('ultraAiInput');
  const toggle = document.getElementById('ultraAiToggle');
  const gallery = document.getElementById('ultraFeatureGallery');
  const galleryTrack = document.getElementById('ultraGalleryTrack');
  const galleryCount = document.getElementById('ultraGalleryCount');
  const galleryPause = document.getElementById('ultraGalleryPause');
  const galleryDots = [...document.querySelectorAll('[data-gallery-index]')];
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
    const reveal = progress < .67 ? 43 : 43 + ((progress - .67) / .33) * 57;
    visual.style.setProperty('--device-reveal', `${Math.round(Math.min(100, reveal))}%`);
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

  if (gallery && galleryTrack && galleryCount && galleryPause && galleryDots.length) {
    let galleryIndex = 0;
    let galleryPaused = false;
    let galleryTimer;
    const isMobileGallery = () => window.matchMedia('(max-width: 620px)').matches;
    const drawGallery = () => {
      const normalized = (galleryIndex + galleryDots.length) % galleryDots.length;
      galleryIndex = normalized;
      galleryTrack.style.transform = isMobileGallery ? `translateX(-${normalized * 100}%)` : '';
      galleryCount.textContent = `${String(normalized + 1).padStart(2, '0')} / ${String(galleryDots.length).padStart(2, '0')}`;
      galleryDots.forEach((dot, index) => dot.setAttribute('aria-selected', String(index === normalized)));
    };
    const stopTimer = () => { window.clearInterval(galleryTimer); galleryTimer = undefined; };
    const startTimer = () => {
      stopTimer();
      if (!galleryPaused && isMobileGallery) galleryTimer = window.setInterval(() => { galleryIndex += 1; drawGallery(); }, 4000);
    };
    galleryDots.forEach(dot => dot.addEventListener('click', () => { galleryIndex = Number(dot.dataset.galleryIndex || 0); drawGallery(); startTimer(); }));
    galleryPause.addEventListener('click', () => {
      galleryPaused = !galleryPaused;
      galleryPause.classList.toggle('is-paused', galleryPaused);
      galleryPause.textContent = galleryPaused ? '▶' : 'Ⅱ';
      galleryPause.setAttribute('aria-label', galleryPaused ? 'Продолжить автопрокрутку' : 'Поставить прокрутку на паузу');
      startTimer();
    });
    window.addEventListener('resize', () => { drawGallery(); startTimer(); }, { passive: true });
    drawGallery();
    startTimer();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestUpdate(); });
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  requestUpdate();
})();
