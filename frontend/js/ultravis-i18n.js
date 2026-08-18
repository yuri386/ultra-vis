(() => {
  'use strict';
  const key = 'ultravis-language';
  const cookie = 'ultravis_language';
  const supported = new Set(['en', 'ru', 'kk']);
  const clean = value => supported.has(String(value || '').toLowerCase()) ? String(value).toLowerCase() : '';
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const readCookie = name => document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1) || '';
  let language = clean(new URLSearchParams(location.search).get('lang')) || clean(localStorage.getItem(key)) || clean(readCookie(cookie)) || 'en';

  // These are exact interface labels. Personal notes, uploaded work and the
  // body of a lecture are never altered by the browser's language switcher.
  const rows = [
    ['Ultra VIS', 'Ultra VIS', 'Ultra VIS'], ['Vision', 'Видение', 'Бағдар'], ['Signals', 'Сигналы', 'Белгілер'], ['Path', 'Путь', 'Жол'], ['SkillLand profile', 'Профиль SkillLand', 'SkillLand профилі'], ['Sign out', 'Выйти', 'Шығу'],
    ['CAREER INTELLIGENCE, MADE PERSONAL', 'КАРЬЕРНЫЙ ИНТЕЛЛЕКТ, СОЗДАННЫЙ ПОД ТЕБЯ', 'СІЗГЕ АРНАЛҒАН МАНСАПТЫҚ ИНТЕЛЛЕКТ'], ['Your future, in clear view.', 'Твоё будущее — в ясном фокусе.', 'Болашағыңыз — айқын көріністе.'], ['Explore your path', 'Открой свой путь', 'Жолыңызды ашыңыз'], ['Open SkillLand profile', 'Открыть профиль SkillLand', 'SkillLand профилін ашу'],
    ['ONE PROFILE. A SHARPER DIRECTION.', 'ОДИН ПРОФИЛЬ. БОЛЕЕ ТОЧНОЕ НАПРАВЛЕНИЕ.', 'БІР ПРОФИЛЬ. НАҚТЫРАҚ БАҒЫТ.'], ['Everything that makes you you, now working together.', 'Всё, что делает тебя тобой, теперь работает вместе.', 'Сізді сіз ететіннің бәрі енді бірге жұмыс істейді.'],
    ['CAREER NAVIGATOR', 'КАРЬЕРНЫЙ НАВИГАТОР', 'МАНСАПТЫҚ НАВИГАТОР'], ['INTERACTIVE EXPERIENCE', 'ИНТЕРАКТИВНЫЙ ОПЫТ', 'ИНТЕРАКТИВТІ ТӘЖІРИБЕ'], ['PERSONAL RECOMMENDATIONS', 'ПЕРСОНАЛЬНЫЕ РЕКОМЕНДАЦИИ', 'ЖЕКЕ ҰСЫНЫСТАР'], ['Open navigator', 'Открыть навигатор', 'Навигаторды ашу'], ['Start a moment', 'Начать шаг', 'Қадамды бастау'], ['See profile signal', 'Открыть сигнал профиля', 'Профиль белгісін көру'],
    ['Continue in SkillLand', 'Продолжить в SkillLand', 'SkillLand ішінде жалғастыру'], ['Your learning assistant', 'Твой помощник в обучении', 'Оқудағы көмекшіңіз'], ['Minimize', 'Свернуть', 'Жинау'], ['Ask Ultra VIS AI', 'Спросите Ultra VIS AI', 'Ultra VIS AI-дан сұраңыз'], ['Message for Ultra VIS AI', 'Сообщение для Ultra VIS AI', 'Ultra VIS AI-ға хабарлама'], ['Send', 'Отправить', 'Жіберу'],
    ['Ultra VIS — your personal learning space connected to SkillLand.', 'Ultra VIS — личное пространство обучения, связанное со SkillLand.', 'Ultra VIS — SkillLand-пен байланысқан жеке оқу кеңістігі.'], ['Continue your path.', 'Продолжить свой путь.', 'Жолыңызды жалғастырыңыз.'], ['Sign in with SkillLand', 'Войти через SkillLand', 'SkillLand арқылы кіру'], ['SkillLand session has ended. Sign in again.', 'Сессия SkillLand завершилась. Войдите ещё раз.', 'SkillLand сеансы аяқталды. Қайта кіріңіз.'], ['Could not prepare the Ultra VIS profile. Try again.', 'Не удалось подготовить профиль Ultra VIS. Попробуйте ещё раз.', 'Ultra VIS профилін дайындау мүмкін болмады. Қайталап көріңіз.'],
    ['Learn. Save. Move forward.', 'Учись. Сохраняй. Двигайся дальше.', 'Үйрен. Сақта. Алға жылжы.'], ['Read lectures. Without the noise.', 'Читайте лекции. Без шума.', 'Дәрістерді оқыңыз. Артық нәрсесіз.'], ['Learn. At your own pace.', 'Обучайтесь. В своём темпе.', 'Өз қарқыныңызбен оқыңыз.'], ['Write tasks. For one clear day.', 'Пишите задачи. На один ясный день.', 'Тапсырмалар жазыңыз. Бір анық күнге.'], ['Use AI. As a personal agent.', 'Используйте ИИ. Как личного агента.', 'AI-ды жеке агент ретінде қолданыңыз.'],
    ['Read lectures.', 'Читайте лекции.', 'Дәрістерді оқыңыз.'], ['Without the noise.', 'Без шума.', 'Артық нәрсесіз.'], ['Learn.', 'Обучайтесь.', 'Үйреніңіз.'], ['At your own pace.', 'В своём темпе.', 'Өз қарқыныңызбен.'], ['Write tasks.', 'Пишите задачи.', 'Тапсырмалар жазыңыз.'], ['For one clear day.', 'На один ясный день.', 'Бір анық күнге.'], ['Use AI.', 'Используйте ИИ.', 'AI-ды қолданыңыз.'], ['Use', 'Используйте', 'Қолданыңыз'], ['AI', 'ИИ', 'AI'], ['As a personal agent.', 'Как личного агента.', 'Жеке агент ретінде.'],
    ['Lectures', 'Лекции', 'Дәрістер'], ['Direction', 'Направление', 'Бағыт'], ['Test', 'Тест', 'Тест'], ['My day', 'Мой день', 'Менің күнім'], ['Notes', 'Заметки', 'Жазбалар'], ['Practice', 'Практика', 'Тәжірибе'], ['Ideas', 'Идеи', 'Идеялар'], ['Appearance', 'Оформление', 'Көрініс'],
    ['Library', 'Библиотека', 'Кітапхана'], ['Lectures that matter.', 'Лекции, в которых есть смысл.', 'Маңызы бар дәрістер.'], ['Search by topic', 'Поиск по теме', 'Тақырып бойынша іздеу'], ['All topics', 'Все темы', 'Барлық тақырып'], ['Open', 'Открыть', 'Ашу'], ['Save', 'Сохранить', 'Сақтау'], ['Saved', 'Сохранено', 'Сақталған'], ['Completed', 'Завершено', 'Аяқталған'], ['New lecture', 'Новая лекция', 'Жаңа дәріс'],
    ['Each topic is a detailed material with an example, a mini-practice and your saved place.', 'Каждая тема — отдельный подробный материал с примером, мини-практикой и сохранением твоего места.', 'Әр тақырып мысалмен, шағын тәжірибемен және сақталған орныңызбен берілген жеке толық материал.'], ['minutes', 'минут', 'минут'], ['minutes ·', 'минут ·', 'минут ·'], ['studied', 'изучено', 'оқылды'],
    ['Back', 'Назад', 'Артқа'], ['Next', 'Дальше', 'Келесі'], ['Continue', 'Продолжить', 'Жалғастыру'], ['Finish material', 'Завершить материал', 'Материалды аяқтау'], ['Run', 'Запустить', 'Іске қосу'], ['Explain', 'Объяснить', 'Түсіндіру'], ['Need a hint', 'Нужна подсказка', 'Нұсқау керек'], ['Send for review', 'Отправить на проверку', 'Тексеруге жіберу'],
    ['Personal library', 'Личная библиотека', 'Жеке кітапхана'], ['Notes without losing a thought.', 'Заметки без потери мысли.', 'Ойыңызды жоғалтпай жазбалар.'], ['Note title', 'Название заметки', 'Жазба атауы'], ['Start writing...', 'Начни писать...', 'Жаза бастаңыз...'], ['No notes yet. Create the first one.', 'Пока нет заметок. Создай первую.', 'Әзірше жазба жоқ. Алғашқысын жасаңыз.'], ['Delete', 'Удалить', 'Жою'],
    ['Everything you need for one focused day.', 'Всё нужное для одного сфокусированного дня.', 'Бір шоғырланған күнге қажеттінің бәрі.'], ['Add task', 'Добавить задачу', 'Тапсырма қосу'], ['Task title', 'Название задачи', 'Тапсырма атауы'], ['No tasks yet. Add the first one.', 'Задач пока нет. Добавь первую.', 'Әзірше тапсырма жоқ. Алғашқысын қосыңыз.'], ['Today', 'Сегодня', 'Бүгін'], ['Your path', 'Твой путь', 'Сіздің жолыңыз'], ['Update goal', 'Обновить цель', 'Мақсатты жаңарту'], ['Knowledge', 'Знания', 'Білім'], ['Strong', 'Сильные', 'Күшті'], ['Now', 'Сейчас', 'Қазір'], ['Attention', 'Внимание', 'Назар'], ['Good day,', 'Добрый день,', 'Қайырлы күн,'], ['Start', 'Начать', 'Бастау'], ['Check yourself', 'Проверить себя', 'Өзіңізді тексеріңіз'],
    ['Interactive guide', 'Интерактивный ориентир', 'Интерактивті бағыттаушы'], ['Question', 'Вопрос', 'Сұрақ'], ['This is not an exam. There is no wrong choice here — only a more precise next step.', 'Это не экзамен. Здесь нет неверного выбора — только более точный следующий шаг.', 'Бұл емтихан емес. Мұнда қате таңдау жоқ — тек келесі нақты қадам бар.'],
    ['Direction', 'Направление', 'Бағыт'], ['Find an environment where you will open up.', 'Найди среду, в которой раскроешься.', 'Өзіңізді аша алатын ортаны табыңыз.'], ['Search educational institution', 'Поиск учебного заведения', 'Оқу орнын іздеу'], ['Compare', 'Сравнить', 'Салыстыру'], ['In comparison', 'В сравнении', 'Салыстыруда'], ['More details', 'Подробнее', 'Толығырақ'], ['Reviews', 'Отзывы', 'Пікірлер'], ['Your short review', 'Твой краткий отзыв', 'Қысқа пікіріңіз'], ['Rating', 'Оценка', 'Баға'], ['Send review', 'Отправить', 'Жіберу'], ['No reviews yet.', 'Пока нет отзывов.', 'Әзірше пікірлер жоқ.'],
    ['Open Ultra VIS AI', 'Открыть Ultra VIS AI', 'Ultra VIS AI-ды ашу'], ['Close chat', 'Закрыть чат', 'Чатты жабу'], ['Send message', 'Отправить сообщение', 'Хабарлама жіберу'], ['Conversation with Ultra VIS AI', 'Диалог с Ultra VIS AI', 'Ultra VIS AI-пен диалог'], ['Ultra VIS AI is processing your request', 'Ultra VIS AI обрабатывает запрос', 'Ultra VIS AI сұрауыңызды өңдеп жатыр'], ['Could not complete the request. Try again.', 'Не удалось выполнить запрос. Попробуй ещё раз.', 'Сұрауды орындау мүмкін болмады. Қайталап көріңіз.'],
    ['Ultra VIS capabilities', 'Возможности Ultra VIS', 'Ultra VIS мүмкіндіктері'], ['Ultra VIS sections', 'Разделы Ultra VIS', 'Ultra VIS бөлімдері'], ['How Ultra VIS works', 'Как работает Ultra VIS', 'Ultra VIS қалай жұмыс істейді'], ['Go to Ultra VIS home', 'На главную Ultra VIS', 'Ultra VIS басты бетіне'], ['Close Ultra VIS', 'Закрыть Ultra VIS', 'Ultra VIS жабу'], ['Gallery controls', 'Управление галереей', 'Галереяны басқару'], ['Gallery slides', 'Слайды галереи', 'Галерея слайдтары'], ['Pause auto-scroll', 'Поставить прокрутку на паузу', 'Автоайналдыруды кідірту'], ['Resume auto-scroll', 'Продолжить автопрокрутку', 'Автоайналдыруды жалғастыру'],
    ['Lectures. Open material, save it and continue from where you stopped.', 'Лекции. Открой материал, сохрани его и продолжи с того места, где остановился.', 'Дәрістер. Материалды ашыңыз, сақтаңыз және тоқтаған жеріңізден жалғастырыңыз.'], ['Ultra VIS AI. Ask it to open what you need, find a lecture or build the next step.', 'Ultra VIS AI. Попроси открыть нужное, найти лекцию или собрать следующий шаг.', 'Ultra VIS AI. Қажетті бөлімді ашуды, дәрісті табуды не келесі қадамды құруды сұраңыз.'], ['My day. Notes and goals are saved separately in your SkillLand account.', 'Мой день. Заметки и цели сохраняются отдельно в твоём аккаунте SkillLand.', 'Менің күнім. Жазбалар мен мақсаттар SkillLand аккаунтыңызда жеке сақталады.'],
    ['Return to SkillLand', 'Вернуться в SkillLand', 'SkillLand-ке оралу'], ['Return to SkillLand ↗', 'Вернуться в SkillLand ↗', 'SkillLand-ке оралу ↗'], ['Ultra VIS is powered by your SkillLand profile.', 'Ultra VIS работает на основе твоего профиля SkillLand.', 'Ultra VIS сіздің SkillLand профиліңіз негізінде жұмыс істейді.']
  ];
  const lookup = new Map();
  rows.forEach(([en, ru, kk]) => [en, ru, kk].forEach(source => lookup.set(normalize(source), { en, ru, kk })));
  const translate = value => {
    const raw = String(value || '');
    const match = lookup.get(normalize(raw));
    if (!match) return value;
    return `${raw.match(/^\s*/)?.[0] || ''}${match[language]}${raw.match(/\s*$/)?.[0] || ''}`;
  };

  function translateTree(root = document) {
    const target = root.nodeType === Node.TEXT_NODE ? root.parentElement : root;
    if (!target) return;
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, { acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|PRE)$/i.test(parent.tagName) || parent.closest('[data-ultravis-no-translate]')) return NodeFilter.FILTER_REJECT;
      return lookup.has(normalize(node.nodeValue)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }});
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { node.nodeValue = translate(node.nodeValue); });
    const elements = target.matches?.('*') ? [target, ...target.querySelectorAll('*')] : [...target.querySelectorAll?.('*') || []];
    elements.forEach(element => ['placeholder', 'title', 'aria-label'].forEach(name => {
      const value = element.getAttribute?.(name);
      if (value && lookup.has(normalize(value))) element.setAttribute(name, translate(value));
    }));
  }
  function addLanguageToLinks(root = document) {
    (root.querySelectorAll?.('a[href]') || []).forEach(link => {
      const raw = link.getAttribute('href');
      if (!raw || raw.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(raw)) return;
      try { const url = new URL(raw, location.href); if (url.origin !== location.origin && url.hostname !== 'skillland-platform-yuri386.onrender.com') return; url.searchParams.set('lang', language); link.href = url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : url.toString(); } catch {}
    });
  }
  function installControl() {
    if (document.querySelector('.ultravis-language-select')) return;
    const select = document.createElement('select');
    select.className = 'ultravis-language-select'; select.setAttribute('aria-label', 'Language');
    select.innerHTML = '<option value="en">EN</option><option value="ru">РУ</option><option value="kk">ҚАЗ</option>'; select.value = language;
    select.addEventListener('change', () => { language = clean(select.value) || 'en'; localStorage.setItem(key, language); document.cookie = `${cookie}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`; const url = new URL(location.href); url.searchParams.set('lang', language); location.assign(url.toString()); });
    (document.querySelector('.ultra-product-bar') || document.querySelector('.topbar') || document.body).appendChild(select);
    const style = document.createElement('style');
    style.textContent = '.ultravis-language-select{margin-left:auto;min-width:48px;height:30px;padding:0 4px;border:0;border-radius:8px;background:transparent;color:inherit;font:500 11px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",Arial,sans-serif;cursor:pointer;outline:0}.ultravis-language-select option{color:#111;background:#fff}.ultra-product-bar .ultravis-language-select{margin-left:auto;margin-right:8px}.topbar .ultravis-language-select{margin-left:12px}@media(max-width:640px){.ultravis-language-select{min-width:43px;font-size:10px}}'; document.head.appendChild(style);
  }
  function apply() { document.documentElement.lang = language; document.documentElement.dataset.ultravisLanguage = language; translateTree(); addLanguageToLinks(); }
  window.UltraVisLanguage = { get: () => language, translate, apply };
  apply(); installControl();
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) { translateTree(node); if (node.nodeType === Node.ELEMENT_NODE) addLanguageToLinks(node); } }))).observe(document.documentElement, { childList: true, subtree: true });
})();
