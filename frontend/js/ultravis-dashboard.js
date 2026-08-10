(() => {
  const workspace = document.getElementById('workspace');
  const hero = document.getElementById('hero');
  const phoneStory = document.getElementById('ultraPhoneStory');
  const skillLandUrl = 'https://skillland-platform-yuri386.onrender.com';
  const state = { lectures: [], colleges: [], notes: [], tasks: [], session: null, learning: null, home: null, compare: new Set(), storageScope: 'uv:guest' };
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const api = async (url, options = {}) => {
    const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Не удалось получить данные. Попробуй ещё раз.');
    return body;
  };
  const currentView = () => new URLSearchParams(location.search).get('view') || 'home';
  const accountStorageKey = key => `${state.storageScope}:${key}`;
  async function establishAccountScope() {
    const sessionData = await api('/api/auth/session');
    state.session = sessionData.user;
    const identity = String(sessionData.user?.sub || sessionData.user?.id || sessionData.user?.email || 'guest');
    state.storageScope = `uv:${identity}`;
    document.documentElement.dataset.visTheme = localStorage.getItem(accountStorageKey('theme')) || 'dark';
  }
  const go = view => { history.pushState({}, '', `/dashboard?view=${view}`); render(view); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openLecture = (id, block = '') => { history.pushState({}, '', `/dashboard?view=lectures&lecture=${id}${block ? `&block=${encodeURIComponent(block)}` : ''}`); renderLecture(id, block); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openReview = id => { history.pushState({}, '', `/dashboard?view=review&review=${id}`); renderReview(id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const setTitle = (eyebrow, title, text) => `<div class="section-heading"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p>${text}</p></div>`;
  const empty = text => `<p class="empty-copy">${escapeHTML(text)}</p>`;
  const progressLabel = value => value >= 100 ? 'Завершено' : value > 0 ? `${value}% изучено` : 'Новая лекция';
  const progressState = value => value >= 100 ? 'done' : value > 0 ? 'active' : 'new';

  async function render(view = currentView()) {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('is-active', item.dataset.view === view));
    const isHome = view === 'home';
    hero.hidden = !isHome;
    if (phoneStory) phoneStory.hidden = !isHome;
    document.body.classList.toggle('ultra-is-subview', !isHome);
    workspace.className = `vis-workspace view-${view}`;
    try {
      if (view === 'home') return renderHome();
      if (view === 'lectures') { const params = new URLSearchParams(location.search); const lectureId = params.get('lecture'); return lectureId ? renderLecture(lectureId, params.get('block') || '') : renderLectures(); }
      if (view === 'colleges') { const collegeId = new URLSearchParams(location.search).get('college'); return collegeId ? renderCollege(collegeId) : renderColleges(); }
      if (view === 'notes') return renderNotes();
      if (view === 'day') return renderDay();
      if (view === 'quiz') return renderQuiz();
      if (view === 'games') return renderGames();
      if (view === 'profile') return renderProfile();
      if (view === 'admin') return renderAdmin();
      if (view === 'quotes') return renderQuotes();
      if (view === 'themes') return renderThemes();
      if (view === 'review') return renderReview(new URLSearchParams(location.search).get('review'));
      return renderHome();
    } catch (error) {
      workspace.innerHTML = `${setTitle('ULTRA VIS', 'Раздел временно недоступен', error.message)}<button class="button button-primary" data-view="home">На главную</button>`;
    }
  }

  async function getLearning() {
    state.learning = (await api('/api/content/learning-profile')).data;
    return state.learning;
  }

  async function getHome() {
    state.home = (await api('/api/content/home')).data;
    return state.home;
  }

  async function renderHome() {
    const [home, sessionData] = await Promise.all([getHome(), state.session ? Promise.resolve({ user: state.session }) : api('/api/auth/session')]);
    state.session = sessionData.user;
    const name = String(state.session?.name || state.session?.email || 'друг').split(/\s|@/)[0];
    const action = home.next_action;
    const actionButton = action.type === 'review'
      ? `<button class="button button-primary" data-open-review="${action.review_id}">Начать</button>`
      : `<button class="button button-primary" data-open-lecture="${action.lecture_id}" data-open-block="${escapeHTML(action.block_key || '')}">Продолжить</button>`;
    const today = home.today.length
      ? home.today.map(item => `<button class="home-row" data-open-review="${item.review_id}"><span>${escapeHTML(item.title)}</span><small>${item.estimated_minutes} мин</small></button>`).join('')
      : `<button class="home-row" data-open-lecture="${action.lecture_id}" data-open-block="${escapeHTML(action.block_key || '')}"><span>Проверить себя</span><small>2 мин</small></button>`;
    const path = home.goal.items.map(item => `<button class="path-row" data-open-lecture="${item.concept_id === 'javascript.async.await' ? 11 : 3}" data-open-block="${item.concept_id === 'javascript.async.await' ? 'intro' : ''}"><span>${escapeHTML(item.title)}</span><small>${item.mastery ? `${item.mastery}%` : 'впереди'}</small></button>`).join('');
    workspace.innerHTML = `<section class="ultra-learning-home"><p class="home-greeting">Добрый день, ${escapeHTML(name)}</p><section class="home-focus"><p>Продолжить</p><h2>${escapeHTML(action.title)}</h2><div class="home-meta"><span>${action.estimated_minutes} мин</span><span>${escapeHTML(action.reason)}</span></div>${actionButton}</section><section class="home-list"><p>Сегодня</p>${today}</section><section class="home-list home-path"><div class="home-list-head"><p>Твой путь</p><small>${home.goal.progress}%</small></div><h3>${escapeHTML(home.goal.title)}</h3><form class="goal-line" id="goalForm"><input name="title" value="${escapeHTML(home.goal.title)}" aria-label="Учебная цель"><button>Обновить цель</button></form>${path}</section><section class="home-knowledge"><p>Знания</p><div><span>Сильные</span><b>${escapeHTML(home.knowledge.strong.join(' · ') || 'Появятся после практики')}</b></div><div><span>Сейчас</span><b>${escapeHTML(home.knowledge.developing)}</b></div><div><span>Внимание</span><b>${escapeHTML(home.knowledge.attention)}</b></div></section></section>`;
    document.getElementById('goalForm')?.addEventListener('submit', async event => { event.preventDefault(); const title = new FormData(event.target).get('title'); await api('/api/content/goals', { method: 'POST', body: JSON.stringify({ title }) }); state.home = null; renderHome(); });
  }

  async function renderLectures() {
    if (!state.lectures.length) state.lectures = (await api('/api/content/lectures')).data;
    const categories = [...new Set(state.lectures.map(item => item.category))];
    const draw = list => {
      workspace.innerHTML = `${setTitle('БИБЛИОТЕКА', 'Лекции, в которых есть смысл.', 'Каждая тема — отдельный подробный материал с примером, мини-практикой и сохранением твоего места.')}<div class="catalog-tools"><input id="lectureSearch" autocomplete="off" placeholder="Поиск по теме"><select id="lectureCategory"><option value="">Все темы</option>${categories.map(item => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`).join('')}</select></div><div class="content-grid lecture-grid">${list.map(item => `<article class="content-card lecture-card"><img src="${escapeHTML(item.image)}" alt=""><div><div class="content-topline"><span>${escapeHTML(item.category)}</span><span class="progress-state ${progressState(item.progress)}">${progressLabel(item.progress)}</span></div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p><small>${item.duration} минут · ${escapeHTML(item.author)}</small><div class="card-actions"><button data-open-lecture="${item.id}">Открыть</button><button class="save-text ${item.saved ? 'is-saved' : ''}" data-save-lecture="${item.id}">${item.saved ? 'Сохранено' : 'Сохранить'}</button></div></div></article>`).join('')}</div>`;
      const search = document.getElementById('lectureSearch');
      const category = document.getElementById('lectureCategory');
      const filter = () => {
        const term = search.value.trim().toLowerCase();
        draw(state.lectures.filter(item => (!category.value || item.category === category.value) && `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(term)));
        document.getElementById('lectureSearch').value = term;
        document.getElementById('lectureCategory').value = category.value;
      };
      search.addEventListener('input', filter); category.addEventListener('change', filter);
    };
    draw(state.lectures);
  }

  function lineBreaks(text) { return escapeHTML(text || '').split('\n').map(line => `<p>${line}</p>`).join(''); }

  function blockButton(item, block, label = 'Дальше') {
    return `<button class="story-next" data-complete-block="${item.id}" data-block-key="${escapeHTML(block.block_key)}">${label}<span>↘</span></button>`;
  }

  function learningBlockMarkup(item, block) {
    const payload = block.payload || {};
    const heading = block.title ? `<h3>${escapeHTML(block.title)}</h3>` : '';
    const copy = block.body ? `<div class="story-copy">${lineBreaks(block.body)}</div>` : '';
    if (block.type === 'code') {
      return `<section class="learning-block learning-code" id="block-${escapeHTML(block.block_key)}">${heading}${copy}<textarea class="lesson-code-editor" data-code-block="${escapeHTML(block.block_key)}" spellcheck="false">${escapeHTML(payload.code || '')}</textarea><div class="code-actions"><button data-run-code="${escapeHTML(block.block_key)}">Запустить</button><button data-lesson-ai="${escapeHTML(block.block_key)}" data-ai-prompt="Объясни этот код проще и по шагам">Объяснить</button></div><pre class="code-output" data-code-output="${escapeHTML(block.block_key)}" aria-live="polite"></pre>${blockButton(item, block)}</section>`;
    }
    if (block.type === 'interactive') {
      const steps = Array.isArray(payload.steps) ? payload.steps : [];
      return `<section class="learning-block learning-interactive" id="block-${escapeHTML(block.block_key)}">${heading}${copy}<ol class="story-steps">${steps.map((step, index) => `<li><b>${String(index + 1).padStart(2, '0')}</b><span>${escapeHTML(step)}</span></li>`).join('')}</ol>${blockButton(item, block, 'Понял ход мысли')}</section>`;
    }
    if (block.type === 'question') {
      const answers = Array.isArray(payload.answers) ? payload.answers : [];
      return `<section class="learning-block learning-question" id="block-${escapeHTML(block.block_key)}">${heading}${copy}<div class="question-choices" data-question="${escapeHTML(block.block_key)}">${answers.map((answer, index) => `<button data-answer-block="${item.id}" data-block-key="${escapeHTML(block.block_key)}" data-answer-index="${index}">${escapeHTML(answer)}</button>`).join('')}</div><p class="block-feedback" data-block-feedback="${escapeHTML(block.block_key)}" aria-live="polite"></p></section>`;
    }
    if (block.type === 'practice') {
      return `<section class="learning-block learning-practice" id="block-${escapeHTML(block.block_key)}">${heading}${copy}<textarea class="practice-input" data-practice-input="${escapeHTML(block.block_key)}" placeholder="Напиши свой вариант — коротко и по существу"></textarea><div class="practice-actions"><button class="story-next" data-practice-block="${item.id}" data-block-key="${escapeHTML(block.block_key)}">Отправить на проверку <span>↘</span></button><button class="text-action" data-lesson-ai="${escapeHTML(block.block_key)}" data-ai-prompt="Помоги начать практику, но не давай готовый ответ">Нужна подсказка</button></div><p class="block-feedback" data-block-feedback="${escapeHTML(block.block_key)}" aria-live="polite"></p></section>`;
    }
    const accent = block.type === 'key_idea' ? ' learning-key-idea' : block.type === 'summary' ? ' learning-summary' : '';
    return `<section class="learning-block${accent}" id="block-${escapeHTML(block.block_key)}">${heading}${copy}${blockButton(item, block, block.type === 'summary' ? 'Завершить материал' : 'Продолжить')}</section>`;
  }

  async function renderLecture(id, requestedBlock = '') {
    const item = (await api(`/api/content/lectures/${id}`)).data;
    const blocks = item.blocks?.length ? item.blocks : [{ block_key: 'reading', type: 'text', title: '', body: item.content, payload: {} }];
    workspace.innerHTML = `<article class="learning-reading"><button class="back-link" data-view="lectures">← Лекции</button><header class="learning-header"><p>${escapeHTML(item.category)} · ${escapeHTML(item.level)}</p><h2>${escapeHTML(item.title)}</h2><div><span>${item.duration} мин</span><span>${Math.round(item.progress)}% пройдено</span><button class="text-action" data-save-lecture="${item.id}">${item.saved ? 'Сохранено' : 'Сохранить'}</button></div></header><div class="learning-note">Прогресс — это место, где ты остановился. Понимание появляется только после проверки и практики.</div><article class="learning-story">${blocks.map(block => learningBlockMarkup(item, block)).join('')}</article></article>`;
    const target = requestedBlock || item.session?.current_block_key;
    if (target) setTimeout(() => document.getElementById(`block-${target}`)?.scrollIntoView({ behavior: requestedBlock ? 'smooth' : 'auto', block: 'start' }), 60);
  }

  async function renderReview(id) {
    const reviews = (await api('/api/content/reviews/today')).data;
    const review = reviews.find(item => Number(item.id) === Number(id)) || reviews[0];
    if (!review) return go('home');
    workspace.innerHTML = `<section class="clean-review"><button class="back-link" data-view="home">← Назад</button><p>Повторение</p><h2>Вспоминаешь<br>${escapeHTML(review.name)}?</h2><span>Скажи честно — так путь останется точным.</span><div><button data-submit-review="${review.id}" data-remembered="true">Помню уверенно</button><button data-submit-review="${review.id}" data-remembered="false">Нужно освежить</button></div></section>`;
  }

  async function renderColleges() {
    if (!state.colleges.length) state.colleges = (await api('/api/content/colleges')).data;
    const draw = list => {
      const chosen = state.colleges.filter(item => state.compare.has(item.id));
      workspace.innerHTML = `${setTitle('НАПРАВЛЕНИЕ', 'Найди среду, в которой раскроешься.', 'Сравни программы, города и специальности. Сохрани варианты, которые подходят твоему учебному маршруту.')}<div class="catalog-tools"><input id="collegeSearch" placeholder="Поиск учебного заведения"></div>${chosen.length ? `<section class="comparison-panel"><span>Сравнение</span>${chosen.map(item => `<strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.city)} · рейтинг ${item.rating}</small>`).join('')}</section>` : ''}<div class="content-grid college-grid">${list.map(item => `<article class="content-card"><img src="${escapeHTML(item.image)}" alt=""><div><span>${escapeHTML(item.city)} · ${escapeHTML(item.type)}</span><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.description)}</p><small>Рейтинг ${item.rating} · ${escapeHTML(item.specialties)}</small><div class="card-actions"><button data-open-college="${item.id}">Подробнее</button><button class="save-text ${state.compare.has(item.id) ? 'is-saved' : ''}" data-compare-college="${item.id}">${state.compare.has(item.id) ? 'В сравнении' : 'Сравнить'}</button></div></div></article>`).join('')}</div>`;
      const search = document.getElementById('collegeSearch');
      search.addEventListener('input', () => draw(state.colleges.filter(item => `${item.name} ${item.city} ${item.specialties}`.toLowerCase().includes(search.value.toLowerCase()))));
    };
    draw(state.colleges);
  }

  async function renderCollege(id) {
    const [collegeData, reviewsData] = await Promise.all([api(`/api/content/colleges/${id}`), api(`/api/content/colleges/${id}/reviews`)]);
    const item = collegeData.data, reviews = reviewsData.data;
    workspace.innerHTML = `<button class="back-link" data-view="colleges">← Все учебные заведения</button><article class="lesson-detail"><img src="${escapeHTML(item.image)}" alt=""><div><span>${escapeHTML(item.city)} · ${escapeHTML(item.type)}</span><h2>${escapeHTML(item.name)}</h2><p>${escapeHTML(item.description)}</p><p class="lesson-copy"><b>Направления:</b> ${escapeHTML(item.specialties)}</p><p class="muted">Рейтинг сообщества: ${item.rating}</p><button class="button button-primary" data-favorite-college="${item.id}">Сохранить вариант</button></div></article><section class="review-section"><h3>Отзывы</h3><form id="reviewForm" class="task-form"><input name="body" placeholder="Твой краткий отзыв" required><select name="rating"><option value="5">Оценка: 5</option><option value="4">Оценка: 4</option><option value="3">Оценка: 3</option></select><button class="button button-primary">Отправить</button></form>${reviews.map(review => `<article class="note-card"><b>Оценка ${review.rating}</b><p>${escapeHTML(review.body)}</p></article>`).join('') || empty('Пока нет отзывов.')}</section>`;
    document.getElementById('reviewForm').addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.target); await api(`/api/content/colleges/${id}/reviews`, { method: 'POST', body: JSON.stringify({ body: form.get('body'), rating: form.get('rating') }) }); renderCollege(id); });
  }

  async function renderNotes() {
    state.notes = (await api('/api/content/notes')).data;
    workspace.innerHTML = `${setTitle('ЛИЧНАЯ БИБЛИОТЕКА', 'Заметки без потери мысли.', 'Конспекты сохраняются в твоём аккаунте Ultra VIS.')}<form class="note-form" id="newNote"><input name="title" placeholder="Название заметки" required><textarea name="body" placeholder="Начни писать..." required></textarea><button class="button button-primary">Сохранить</button></form><div class="notes-grid">${state.notes.map(item => `<article class="note-card"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p><small>${escapeHTML(item.updated_at)}</small><button data-delete-note="${item.id}">Удалить</button></article>`).join('') || empty('Пока нет заметок. Создай первую.')}</div>`;
    document.getElementById('newNote').addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.target); await api('/api/content/notes', { method: 'POST', body: JSON.stringify({ title: form.get('title'), body: form.get('body') }) }); renderNotes(); });
  }

  async function renderDay() {
    state.tasks = (await api('/api/content/tasks')).data;
    workspace.innerHTML = `${setTitle('МОЙ ДЕНЬ', 'Собери день вокруг одной цели.', 'Добавь действие, отметь результат и не теряй темп.')}<form class="task-form" id="newTask"><input name="title" placeholder="Например: завершить лекцию по Python" required><button class="button button-primary">Добавить</button></form><div class="task-list">${state.tasks.map(item => `<label class="task-item"><input type="checkbox" data-task="${item.id}" ${item.completed ? 'checked' : ''}><span>${escapeHTML(item.title)}</span><button type="button" aria-label="Удалить задачу" data-delete-task="${item.id}">×</button></label>`).join('') || empty('Сегодня пока нет задач.')}</div>`;
    document.getElementById('newTask').addEventListener('submit', async event => { event.preventDefault(); const title = new FormData(event.target).get('title'); await api('/api/content/tasks', { method: 'POST', body: JSON.stringify({ title }) }); renderDay(); });
  }

  const quizQuestions = [
    { text: 'Когда появляется новая задача, что тебе хочется сделать первым?', answers: [['Разобрать её на шаги и собрать решение', 'technology'], ['Найти закономерность и проверить гипотезу', 'science'], ['Понять, для кого это важно, и обсудить идею', 'people']] },
    { text: 'Какой результат даёт тебе больше энергии?', answers: [['Рабочий сайт, программа или прототип', 'technology'], ['Точный вывод после исследования', 'science'], ['Ясная презентация и решение команды', 'people']] },
    { text: 'Как тебе удобнее учиться?', answers: [['Сразу собирать и тестировать на практике', 'technology'], ['Наблюдать, измерять и сравнивать факты', 'science'], ['Читать, спорить и объяснять другим', 'people']] },
    { text: 'Какой следующий шаг звучит ближе?', answers: [['Создать цифровой продукт', 'technology'], ['Исследовать, как устроен мир', 'science'], ['Работать с идеями и людьми', 'people']] }
  ];

  function renderQuiz() {
    workspace.innerHTML = `<section class="clean-quiz"><button class="back-link" data-view="home">← Назад</button><p class="eyebrow">ИНТЕРАКТИВНЫЙ ОРИЕНТИР</p><div class="quiz-step" id="quizStep">Вопрос 1 из ${quizQuestions.length}</div><h2 id="quizQuestion"></h2><div class="quiz-options" id="quizOptions"></div><p class="quiz-note">Это не экзамен. Здесь нет неверного выбора — только более точный следующий шаг.</p></section>`;
    let index = 0, answers = {};
    const type = text => new Promise(resolve => {
      const target = document.getElementById('quizQuestion'); target.textContent = ''; let position = 0;
      const timer = setInterval(() => { target.textContent += text[position] || ''; position += 1; if (position > text.length) { clearInterval(timer); resolve(); } }, 17);
    });
    const draw = async () => {
      const item = quizQuestions[index];
      document.getElementById('quizStep').textContent = `Вопрос ${index + 1} из ${quizQuestions.length}`;
      document.getElementById('quizOptions').innerHTML = '';
      await type(item.text);
      const options = document.getElementById('quizOptions');
      item.answers.forEach(([label, value], optionIndex) => {
        const button = document.createElement('button'); button.type = 'button'; button.style.animationDelay = `${optionIndex * 70}ms`; button.textContent = label;
        button.addEventListener('click', async () => { answers[`q${index + 1}`] = value; index += 1; if (index < quizQuestions.length) draw(); else finish(); }); options.appendChild(button);
      });
    };
    const finish = async () => {
      const result = (await api('/api/content/quiz', { method: 'POST', body: JSON.stringify({ answers }) })).data;
      workspace.innerHTML = `<section class="clean-quiz quiz-result"><button class="back-link" data-view="home">← На главную</button><p class="eyebrow">ТВОЙ ОРИЕНТИР</p><h2>${result.primary === 'technology' ? 'Создавать и собирать.' : result.primary === 'science' ? 'Исследовать и понимать.' : 'Объяснять и объединять.'}</h2><p class="quiz-analysis">${escapeHTML(result.summary)}</p><div class="quiz-actions"><button class="button button-primary" data-view="lectures">Открыть подходящие лекции</button><a class="quiet-link" href="${skillLandUrl}/search.html">Найти людей в SkillLand</a></div><p class="quiz-note">Вывод сохранён в профиле SkillLand и будет помогать с выбором следующих материалов.</p></section>`;
    };
    draw();
  }

  function renderGames() {
    workspace.innerHTML = `${setTitle('ПРАКТИКА', 'Верни фокус за одну минуту.', 'Нажми старт, дождись сигнала и проверь свою реакцию.')}<section class="focus-practice"><button class="button button-primary" id="focusStart">Начать</button><p id="focusResult">Короткая пауза между занятиями без лишних отвлечений.</p></section>`;
    const button = document.getElementById('focusStart');
    const start = () => { button.disabled = true; button.textContent = 'Готовься'; document.getElementById('focusResult').textContent = 'Сигнал появится через несколько секунд.'; const delay = 1600 + Math.random() * 2200; setTimeout(() => { const started = performance.now(); button.disabled = false; button.textContent = 'Нажми сейчас'; button.onclick = () => { document.getElementById('focusResult').textContent = `Твоя реакция: ${Math.round(performance.now() - started)} мс.`; button.textContent = 'Ещё раз'; button.onclick = start; }; }, delay); };
    button.onclick = start;
  }

  async function renderProfile() {
    const [sessionData, achievementsData, learning] = await Promise.all([api('/api/auth/session'), api('/api/content/achievements'), getLearning()]);
    state.session = sessionData.user;
    const isEmployer = learning.role === 'employer';
    const connectionCopy = isEmployer
      ? 'Твоя учебная аналитика помогает понимать, какие направления и навыки развивают кандидаты на SkillLand.'
      : 'Твой учебный путь помогает работодателям и наставникам SkillLand увидеть направление, которое ты развиваешь — без открытия личных контактов.';
    const current = learning.current ? `<button class="profile-current" data-open-lecture="${learning.current.id}"><span>Сейчас изучаешь</span><strong>${escapeHTML(learning.current.title)}</strong><small>${learning.current.progress}% пройдено · продолжить</small></button>` : `<button class="profile-current" data-view="lectures"><span>Следующий шаг</span><strong>Выбери первую лекцию</strong><small>Открой библиотеку и собери свой путь.</small></button>`;
    workspace.innerHTML = `${setTitle('ПРОФИЛЬ SKILLLAND', escapeHTML(state.session.name || state.session.email), 'Один профиль для обучения, выбора направления и связей с людьми на SkillLand.')}<section class="profile-summary"><span class="profile-orb">${escapeHTML((state.session.name || 'S').slice(0, 1))}</span><div><h3>${escapeHTML(state.session.name || 'Пользователь SkillLand')}</h3><p>${escapeHTML(state.session.email)}</p><a href="${skillLandUrl}/profile.html">Открыть профиль SkillLand ↗</a></div></section><section class="profile-learning"><div class="learning-overview"><div><span>Завершено</span><strong>${learning.completed}</strong><small>из ${learning.total} лекций</small></div><div><span>В работе</span><strong>${learning.started}</strong><small>открытых материалов</small></div><div><span>Результат</span><strong>${learning.completion_rate}%</strong><small>текущий темп</small></div></div>${current}<div class="connection-bridge"><p class="eyebrow">SKILLLAND · СВЯЗЬ</p><h3>${isEmployer ? 'Учебный сигнал кандидатов' : 'Учёба, которая становится видимой'}</h3><p>${connectionCopy}</p><a href="${skillLandUrl}/search.html">${isEmployer ? 'Открыть поиск кандидатов' : 'Открыть поиск работодателей'} →</a></div></section><section class="achievement-section"><h3>Достижения</h3><div class="notes-grid">${achievementsData.data.map(item => `<article class="note-card"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p></article>`).join('') || empty('Первое достижение появится после открытия лекции.')}</div></section>${learning.quiz ? `<section class="quiz-profile-result"><p class="eyebrow">ВЫВОД ТЕСТА</p><p>${escapeHTML(learning.quiz.summary)}</p><button data-view="quiz">Пройти тест ещё раз</button></section>` : `<button class="quiz-profile-result" data-view="quiz"><p class="eyebrow">ВЫБОР НАПРАВЛЕНИЯ</p><p>Пройди короткий тест — его вывод появится здесь и в профиле SkillLand.</p></button>`}${(await api('/api/content/admin/status')).isAdmin ? '<p><button class="quiet-button" data-view="admin">Управление контентом</button></p>' : ''}`;
  }

  async function renderAdmin() {
    const lectures = (await api('/api/content/lectures')).data;
    workspace.innerHTML = `${setTitle('УПРАВЛЕНИЕ', 'Контент Ultra VIS', 'Добавляй или удаляй материалы. Для новых лекций укажи понятное описание и полный текст.')}<form id="adminLecture" class="note-form"><input name="title" placeholder="Название лекции" required><input name="category" placeholder="Категория" required><textarea name="description" placeholder="Краткое описание"></textarea><textarea name="content" placeholder="Полный текст лекции"></textarea><button class="button button-primary">Добавить лекцию</button></form><div class="notes-grid">${lectures.map(item => `<article class="note-card"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.category)}</p><button data-delete-admin-lecture="${item.id}">Удалить</button></article>`).join('')}</div>`;
    document.getElementById('adminLecture').addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.target); await api('/api/content/admin/lectures', { method: 'POST', body: JSON.stringify({ title: form.get('title'), category: form.get('category'), description: form.get('description'), content: form.get('content') }) }); state.lectures = []; renderAdmin(); });
  }

  function renderQuotes() {
    const quotes = [['Учиться — значит замечать связь между тем, что уже знаешь, и тем, что ещё умеешь узнать.', 'Ultra VIS'], ['Маленький понятный шаг сильнее большого обещания на потом.', 'SkillLand'], ['Хороший вопрос делает путь короче.', 'Ultra VIS']];
    workspace.innerHTML = `${setTitle('ИДЕИ', 'Мысли, которые остаются с тобой.', 'Сохрани нужную фразу и возвращайся к ней позже.')}<div class="notes-grid">${quotes.map(([text, author], index) => `<article class="note-card"><h3>${escapeHTML(text)}</h3><p>${escapeHTML(author)}</p><button data-like-quote="${index}">${localStorage.getItem(accountStorageKey(`quote-${index}`)) === '1' ? 'Сохранено' : 'Сохранить'}</button></article>`).join('')}</div>`;
  }

  function renderThemes() {
    const themes = [['light', 'Светлая'], ['dark', 'Тёмная'], ['oled', 'OLED'], ['business-light', 'Деловая светлая'], ['business-dark', 'Деловая тёмная'], ['cyberpunk-light', 'Акцентная светлая'], ['cyberpunk-dark', 'Акцентная тёмная'], ['gray', 'Серая'], ['colorful', 'Цветная'], ['classic', 'Классическая'], ['apple', 'Чистая'], ['book', 'Для чтения']];
    workspace.innerHTML = `${setTitle('ОФОРМЛЕНИЕ', 'Выбери рабочее состояние.', 'Все темы исходного UltraWise сохранены и приведены к одной спокойной системе.')}<div class="theme-grid">${themes.map(([id, label]) => `<button class="theme-option ${document.documentElement.dataset.visTheme === id ? 'is-selected' : ''}" data-theme="${id}"><span>${escapeHTML(label)}</span><small>${id === 'book' ? 'Больше воздуха для чтения' : id.includes('dark') || id === 'oled' ? 'Тёмный режим' : 'Светлый режим'}</small></button>`).join('')}</div>`;
  }

  document.addEventListener('click', async event => {
    const target = event.target.closest('button,[data-open-lecture],[data-open-college]');
    if (!target) return;
    if (target.dataset.view) return go(target.dataset.view);
    if (target.dataset.openLecture) return openLecture(target.dataset.openLecture, target.dataset.openBlock || '');
    if (target.dataset.openReview) return openReview(target.dataset.openReview);
    if (target.dataset.openCollege) return renderCollege(target.dataset.openCollege);
    if (target.dataset.completeBlock) {
      await api(`/api/content/lectures/${target.dataset.completeBlock}/blocks/${target.dataset.blockKey}/complete`, { method: 'POST', body: JSON.stringify({}) });
      state.home = null; state.learning = null;
      const next = target.closest('.learning-block')?.nextElementSibling;
      if (next) return next.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return renderLecture(target.dataset.completeBlock);
    }
    if (target.dataset.answerBlock) {
      const result = await api(`/api/content/lectures/${target.dataset.answerBlock}/blocks/${target.dataset.blockKey}/answer`, { method: 'POST', body: JSON.stringify({ answer: Number(target.dataset.answerIndex) }) });
      const feedback = document.querySelector(`[data-block-feedback="${CSS.escape(target.dataset.blockKey)}"]`);
      target.closest('.question-choices')?.querySelectorAll('button').forEach(button => button.disabled = true);
      target.classList.add(result.data.correct ? 'is-correct' : 'is-incorrect');
      if (feedback) feedback.textContent = result.data.correct ? 'Верно. Этот шаг укрепил понимание.' : 'Почти. Вернись к объяснению и попробуй применить идею в практике.';
      state.home = null; state.learning = null;
      return;
    }
    if (target.dataset.practiceBlock) {
      const key = target.dataset.blockKey;
      const answer = document.querySelector(`[data-practice-input="${CSS.escape(key)}"]`)?.value || '';
      const feedback = document.querySelector(`[data-block-feedback="${CSS.escape(key)}"]`);
      try {
        await api(`/api/content/lectures/${target.dataset.practiceBlock}/blocks/${key}/practice`, { method: 'POST', body: JSON.stringify({ answer }) });
        if (feedback) feedback.textContent = 'Практика сохранена. Это добавило доказательство к твоему пониманию.';
        state.home = null; state.learning = null;
      } catch (error) { if (feedback) feedback.textContent = error.message; }
      return;
    }
    if (target.dataset.submitReview) {
      await api(`/api/content/reviews/${target.dataset.submitReview}/answer`, { method: 'POST', body: JSON.stringify({ remembered: target.dataset.remembered === 'true' }) });
      state.home = null; state.learning = null; return go('home');
    }
    if (target.dataset.runCode) {
      const key = target.dataset.runCode;
      const code = document.querySelector(`[data-code-block="${CSS.escape(key)}"]`)?.value || '';
      const output = document.querySelector(`[data-code-output="${CSS.escape(key)}"]`);
      if (output) output.textContent = /console\.log\(['"]([^'"]+)/.test(code) ? code.match(/console\.log\(['"]([^'"]+)/)?.[1] || 'Готово.' : 'Код подготовлен. Проверь логику шага и объясни её своими словами.';
      return;
    }
    if (target.dataset.lessonAi) {
      document.dispatchEvent(new CustomEvent('ultra-vis-ai-request', { detail: { message: target.dataset.aiPrompt || 'Объясни этот шаг проще.', context: { lecture_id: new URLSearchParams(location.search).get('lecture'), block_key: target.dataset.lessonAi } } }));
      return;
    }
    if (target.dataset.saveLecture) { await api(`/api/content/lectures/${target.dataset.saveLecture}/save`, { method: 'POST' }); state.lectures = []; return currentView() === 'lectures' ? renderLectures() : renderLecture(target.dataset.saveLecture); }
    if (target.dataset.favoriteCollege) { await api(`/api/content/colleges/${target.dataset.favoriteCollege}/favorite`, { method: 'POST' }); state.colleges = []; return currentView() === 'colleges' ? renderColleges() : renderCollege(target.dataset.favoriteCollege); }
    if (target.dataset.compareCollege) { const id = Number(target.dataset.compareCollege); state.compare.has(id) ? state.compare.delete(id) : state.compare.add(id); return renderColleges(); }
    if (target.dataset.deleteNote) { await api(`/api/content/notes/${target.dataset.deleteNote}`, { method: 'DELETE' }); return renderNotes(); }
    if (target.dataset.deleteTask) { await api(`/api/content/tasks/${target.dataset.deleteTask}`, { method: 'DELETE' }); return renderDay(); }
    if (target.dataset.likeQuote !== undefined) { const key = accountStorageKey(`quote-${target.dataset.likeQuote}`); localStorage.setItem(key, localStorage.getItem(key) === '1' ? '0' : '1'); return renderQuotes(); }
    if (target.dataset.theme) { document.documentElement.dataset.visTheme = target.dataset.theme; localStorage.setItem(accountStorageKey('theme'), target.dataset.theme); return renderThemes(); }
    if (target.dataset.deleteAdminLecture) { await api(`/api/content/admin/lectures/${target.dataset.deleteAdminLecture}`, { method: 'DELETE' }); state.lectures = []; return renderAdmin(); }
  });

  document.addEventListener('change', async event => {
    if (!event.target.dataset.task) return;
    await api(`/api/content/tasks/${event.target.dataset.task}`, { method: 'PATCH', body: JSON.stringify({ completed: event.target.checked }) });
  });

  function setupUltraAi() {
    const dock = document.getElementById('ultraAiDock');
    const form = document.getElementById('ultraAiForm');
    const toggle = document.getElementById('ultraAiToggle');
    const input = document.getElementById('ultraAiInput');
    const send = form?.querySelector('.ultra-ai-send');
    const chat = document.getElementById('ultraAiChat');
    const messages = document.getElementById('ultraAiMessages');
    const close = document.getElementById('ultraAiClose');
    const backdrop = document.getElementById('ultraAiBackdrop');
    if (!dock || !form || !toggle || !input || !send || !chat || !messages || !close || !backdrop) return;

    const expand = () => { dock.classList.add('is-expanded'); toggle.setAttribute('aria-expanded', 'true'); setTimeout(() => input.focus(), 240); };
    const collapse = () => { dock.classList.remove('is-expanded'); toggle.setAttribute('aria-expanded', 'false'); input.value = ''; };
    const closeChat = () => { document.body.classList.remove('ultra-ai-chat-open'); collapse(); };
    const append = (role, copy, result = {}) => {
      const message = document.createElement('article'); message.className = `ultra-ai-message ${role}`;
      if (role === 'assistant') { const label = document.createElement('span'); label.className = 'ai-label'; label.textContent = 'ULTRA VIS AI'; message.appendChild(label); }
      const text = document.createElement('p'); text.textContent = copy; message.appendChild(text);
      if (Array.isArray(result.suggestions) && result.suggestions.length) {
        const suggestionList = document.createElement('div'); suggestionList.className = 'ultra-ai-suggestions';
        result.suggestions.forEach(item => {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'ultra-ai-suggestion';
          button.innerHTML = `<strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.meta || '')}</small>`;
          button.addEventListener('click', () => { if (item.view === 'lecture') renderLecture(item.id); if (item.view === 'college') renderCollege(item.id); });
          suggestionList.appendChild(button);
        }); message.appendChild(suggestionList);
      }
      if (result.action?.view) {
        const action = document.createElement('button'); action.type = 'button'; action.className = 'ultra-ai-action'; action.textContent = result.action.label || 'Открыть'; action.addEventListener('click', () => go(result.action.view)); message.appendChild(action);
      }
      messages.appendChild(message); messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' }); return message;
    };
    const thinking = () => { const item = document.createElement('div'); item.className = 'ultra-ai-thinking'; item.innerHTML = '<i></i><span>Ultra VIS AI обрабатывает запрос</span>'; messages.appendChild(item); messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' }); return item; };
    const sendMessage = async (message, context = {}) => {
      if (!message) return input.focus();
      expand(); document.body.classList.add('ultra-ai-chat-open'); append('user', message); input.value = ''; send.disabled = true; const loader = thinking();
      try {
        const result = await api('/api/assistant', { method: 'POST', body: JSON.stringify({ message, context }) });
        loader.remove(); append('assistant', result.reply, result);
      } catch (error) { loader.remove(); append('assistant', error.message || 'Не удалось выполнить запрос. Попробуй ещё раз.'); }
      finally { send.disabled = false; input.focus(); }
    };

    toggle.addEventListener('click', () => dock.classList.contains('is-expanded') && !input.value ? collapse() : expand());
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!dock.classList.contains('is-expanded')) return expand();
      return sendMessage(input.value.trim());
    });
    document.addEventListener('ultra-vis-ai-request', event => sendMessage(event.detail?.message || '', event.detail?.context || {}));
    close.addEventListener('click', closeChat); backdrop.addEventListener('click', closeChat);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.body.classList.contains('ultra-ai-chat-open')) closeChat(); });
  }

  setupUltraAi();
  document.getElementById('logoutButton')?.addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/'; });
  window.addEventListener('popstate', () => render(currentView()));
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  establishAccountScope().catch(() => { document.documentElement.dataset.visTheme = 'dark'; }).finally(() => render());
})();
