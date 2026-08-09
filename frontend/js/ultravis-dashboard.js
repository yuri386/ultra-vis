(() => {
  const workspace = document.getElementById('workspace');
  const hero = document.getElementById('hero');
  const state = { lectures: [], colleges: [], notes: [], tasks: [], session: null };
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
  const api = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    if (!response.ok) throw new Error('Не удалось загрузить данные.');
    return response.json();
  };
  const go = view => { history.pushState({}, '', `/dashboard?view=${view}`); render(view); };
  const currentView = () => new URLSearchParams(location.search).get('view') || 'home';
  const card = (icon, title, text, view, label = 'Открыть') => `<button class="module-card" data-view="${view}"><span class="module-icon">${icon}</span><strong>${title}</strong><small>${text}</small><b>${label} &rarr;</b></button>`;
  const setTitle = (eyebrow, title, text) => `<div class="section-heading"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p>${text}</p></div>`;

  async function render(view = currentView()) {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('is-active', item.dataset.view === view));
    hero.hidden = view !== 'home';
    workspace.className = `vis-workspace view-${view}`;
    try {
      if (view === 'home') return renderHome();
      if (view === 'lectures') return renderLectures();
      if (view === 'colleges') return renderColleges();
      if (view === 'notes') return renderNotes();
      if (view === 'day') return renderDay();
      if (view === 'quiz') return renderQuiz();
      if (view === 'games') return renderGames();
      if (view === 'profile') return renderProfile();
      return renderHome();
    } catch (error) {
      workspace.innerHTML = `${setTitle('ULTRA VIS', 'Не удалось открыть раздел', 'Проверь подключение и попробуй ещё раз.')}<button class="button button-primary" data-view="home">На главную</button>`;
    }
  }

  function renderHome() {
    workspace.innerHTML = `${setTitle('ТВОЁ ПРОСТРАНСТВО', 'Продолжай с того, что важно сегодня.', 'Весь исходный функционал UltraWise теперь собран в одной понятной оболочке.')}
      <div class="module-grid">${card('📚','Лекции','Каталог материалов с поиском и сохранением.','lectures','Смотреть')}${card('🎓','Профориентация','Сравни учебные заведения и сохрани интересные.','colleges','Выбрать')}${card('✓','Мой день','Собери личный список задач на сегодня.','day','Планировать')}${card('✦','Тест направления','Небольшой интерактивный ориентир для старта.','quiz','Пройти')}${card('📝','Заметки','Конспекты сохраняются в твоём аккаунте.','notes','Открыть')}${card('🎮','Практика','Лёгкая игра на фокус и скорость реакции.','games','Играть')}</div>`;
  }

  async function renderLectures() {
    if (!state.lectures.length) state.lectures = (await api('/api/content/lectures')).data;
    const draw = list => { workspace.innerHTML = `${setTitle('БАЗА ЗНАНИЙ','Лекции и материалы','Ищи по теме, сохраняй нужное и возвращайся к ним в удобный момент.')}<div class="catalog-tools"><input id="lectureSearch" placeholder="Поиск лекций"><select id="lectureCategory"><option value="">Все темы</option>${[...new Set(state.lectures.map(item => item.category))].map(item => `<option>${esc(item)}</option>`).join('')}</select></div><div class="content-grid">${list.map(item => `<article class="content-card"><img src="${item.image}" alt=""><div><span>${esc(item.category)} · ${esc(item.level)}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><small>${item.duration} мин · ${esc(item.author)}</small><div class="card-actions"><button data-open-lecture="${item.id}">Открыть</button><button class="icon-button" data-save-lecture="${item.id}" aria-label="Сохранить">${item.saved ? '★' : '☆'}</button></div></div></article>`).join('')}</div>`; bindLectureFilters(); };
    draw(state.lectures);
    window.drawLectures = draw;
  }
  function bindLectureFilters() {
    const filter = () => { const term = document.getElementById('lectureSearch').value.toLowerCase(); const cat = document.getElementById('lectureCategory').value; window.drawLectures(state.lectures.filter(item => (!cat || item.category === cat) && `${item.title} ${item.description}`.toLowerCase().includes(term))); };
    document.getElementById('lectureSearch').oninput = filter; document.getElementById('lectureCategory').onchange = filter;
  }
  async function renderLecture(id) {
    const item = (await api(`/api/content/lectures/${id}`)).data;
    workspace.innerHTML = `<button class="back-link" data-view="lectures">&larr; Все лекции</button><article class="lesson-detail"><img src="${item.image}" alt=""><div><span>${esc(item.category)} · ${esc(item.level)}</span><h2>${esc(item.title)}</h2><p>${esc(item.description)}</p><p class="lesson-copy">${esc(item.content)}</p><p class="muted">${item.duration} минут · ${esc(item.author)}</p><button class="button button-primary" data-save-lecture="${item.id}">${item.saved ? 'Убрать из сохранённых' : 'Сохранить лекцию'}</button></div></article>`;
  }

  async function renderColleges() {
    if (!state.colleges.length) state.colleges = (await api('/api/content/colleges')).data;
    const draw = list => { workspace.innerHTML = `${setTitle('ПРОФОРИЕНТАЦИЯ','Найди среду, где ты раскроешься.','Сравни программы, города и направления. Сохраняй то, что хочешь изучить дальше.')}<div class="catalog-tools"><input id="collegeSearch" placeholder="Поиск учебного заведения"></div><div class="content-grid college-grid">${list.map(item => `<article class="content-card"><img src="${item.image}" alt=""><div><span>${esc(item.city)} · ${esc(item.type)}</span><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><small>★ ${item.rating} · ${esc(item.specialties)}</small><div class="card-actions"><button data-open-college="${item.id}">Подробнее</button><button class="icon-button" data-favorite-college="${item.id}" aria-label="В избранное">${item.favorite ? '♥' : '♡'}</button></div></div></article>`).join('')}</div>`; document.getElementById('collegeSearch').oninput = event => draw(state.colleges.filter(item => `${item.name} ${item.city} ${item.specialties}`.toLowerCase().includes(event.target.value.toLowerCase()))); };
    draw(state.colleges);
  }
  async function renderCollege(id) {
    const item = (await api(`/api/content/colleges/${id}`)).data;
    workspace.innerHTML = `<button class="back-link" data-view="colleges">&larr; Все заведения</button><article class="lesson-detail"><img src="${item.image}" alt=""><div><span>${esc(item.city)} · ${esc(item.type)}</span><h2>${esc(item.name)}</h2><p>${esc(item.description)}</p><p class="lesson-copy"><b>Направления:</b> ${esc(item.specialties)}</p><p class="muted">Рейтинг сообщества: ★ ${item.rating}</p><button class="button button-primary" data-favorite-college="${item.id}">Сохранить в избранное</button></div></article>`;
  }

  async function renderNotes() {
    state.notes = (await api('/api/content/notes')).data;
    workspace.innerHTML = `${setTitle('ЛИЧНАЯ БИБЛИОТЕКА','Заметки','Новые заметки сохраняются в твоём аккаунте Ultra VIS.')}<form class="note-form" id="newNote"><input name="title" placeholder="Название заметки" required><textarea name="body" placeholder="Начни писать..." required></textarea><button class="button button-primary">Сохранить</button></form><div class="notes-grid">${state.notes.map(item => `<article class="note-card"><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p><small>${esc(item.updated_at)}</small><button data-delete-note="${item.id}">Удалить</button></article>`).join('') || '<p class="empty-copy">Пока нет заметок. Создай первую.</p>'}</div>`;
    document.getElementById('newNote').onsubmit = async event => { event.preventDefault(); const form = new FormData(event.target); await api('/api/content/notes', { method:'POST', body: JSON.stringify({title:form.get('title'), body:form.get('body')}) }); renderNotes(); };
  }

  async function renderDay() {
    state.tasks = (await api('/api/content/tasks')).data;
    workspace.innerHTML = `${setTitle('МОЙ ДЕНЬ','Собери день вокруг одной цели.','Добавь задачу, отметь прогресс и не теряй темп.')}<form class="task-form" id="newTask"><input name="title" placeholder="Например: посмотреть лекцию по Python" required><button class="button button-primary">Добавить</button></form><div class="task-list">${state.tasks.map(item => `<label class="task-item"><input type="checkbox" data-task="${item.id}" ${item.completed ? 'checked':''}><span>${esc(item.title)}</span><button type="button" data-delete-task="${item.id}">&times;</button></label>`).join('') || '<p class="empty-copy">Сегодня пока нет задач.</p>'}</div>`;
    document.getElementById('newTask').onsubmit = async event => { event.preventDefault(); const title = new FormData(event.target).get('title'); await api('/api/content/tasks', { method:'POST', body: JSON.stringify({ title }) }); renderDay(); };
  }
  function renderQuiz() { workspace.innerHTML = `${setTitle('ИНТЕРАКТИВНЫЙ ОРИЕНТИР','Что тебе интереснее сейчас?','Это не экзамен, а быстрый способ выбрать следующий раздел.')}<div class="quiz-card"><h3>Выбери задачу, от которой тебе становится интересно.</h3><div class="choice-row"><button data-quiz="tech">Создавать цифровые продукты</button><button data-quiz="science">Понимать, как устроен мир</button><button data-quiz="people">Работать с идеями и людьми</button></div><p id="quizResult"></p></div>`; }
  function renderGames() { workspace.innerHTML = `${setTitle('ПРАКТИКА','Поймай фокус','Нажми на кнопку, когда будешь готов. Счётчик покажет, как быстро ты среагировал.')}<div class="quiz-card"><button class="button button-primary" id="focusStart">Начать</button><p id="focusResult">Одна короткая игра для перезагрузки между занятиями.</p></div>`; document.getElementById('focusStart').onclick = () => { const started = performance.now(); const button = document.getElementById('focusStart'); button.textContent = 'Нажми сейчас!'; button.onclick = () => { document.getElementById('focusResult').textContent = `Твоя реакция: ${Math.round(performance.now()-started)} мс.`; button.textContent='Ещё раз'; button.onclick = null; }; }; }
  async function renderProfile() { state.session = (await api('/api/auth/session')).user; workspace.innerHTML = `${setTitle('ПРОФИЛЬ SKILLLAND','${esc(state.session.name || state.session.email)}','Этот профиль создан через SkillLand и доступен только тебе.')}<div class="profile-summary"><span class="profile-orb">${esc((state.session.name || 'S').slice(0,1))}</span><div><h3>${esc(state.session.name || 'SkillLand user')}</h3><p>${esc(state.session.email)}</p><a href="https://skillland-platform-yuri386.onrender.com/profile.html">Открыть профиль SkillLand &nearr;</a></div></div>`; }

  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-view],[data-open-lecture],[data-save-lecture],[data-open-college],[data-favorite-college],[data-delete-note],[data-task],[data-delete-task],[data-quiz]'); if (!target) return;
    if (target.dataset.view) return go(target.dataset.view);
    if (target.dataset.openLecture) return renderLecture(target.dataset.openLecture);
    if (target.dataset.openCollege) return renderCollege(target.dataset.openCollege);
    if (target.dataset.saveLecture) { const result = await api(`/api/content/lectures/${target.dataset.saveLecture}/save`, {method:'POST'}); state.lectures = []; return renderLectures(); }
    if (target.dataset.favoriteCollege) { await api(`/api/content/colleges/${target.dataset.favoriteCollege}/favorite`, {method:'POST'}); state.colleges=[]; return renderColleges(); }
    if (target.dataset.deleteNote) { await api(`/api/content/notes/${target.dataset.deleteNote}`, {method:'DELETE'}); return renderNotes(); }
    if (target.dataset.task) { await api(`/api/content/tasks/${target.dataset.task}`, {method:'PATCH',body:JSON.stringify({completed:target.checked})}); return; }
    if (target.dataset.deleteTask) { await api(`/api/content/tasks/${target.dataset.deleteTask}`, {method:'DELETE'}); return renderDay(); }
    if (target.dataset.quiz) document.getElementById('quizResult').textContent = ({tech:'Попробуй лекции по JavaScript и Python, а затем сохрани ITMO или МФТИ в избранное.',science:'Начни с физики или биологии и посмотри технические университеты.',people:'Открой экономику, языки или философию и собери личный план на день.'}[target.dataset.quiz]);
  });
  window.addEventListener('popstate', () => render());
  render();
})();
