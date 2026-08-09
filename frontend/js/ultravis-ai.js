(() => {
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

  const russian = document.documentElement.lang === 'ru';
  const labels = russian
    ? { ai: 'ULTRA VIS AI', thinking: 'Ultra VIS AI обрабатывает запрос', open: 'Открыть', error: 'Не удалось выполнить запрос. Попробуй ещё раз.' }
    : { ai: 'ULTRA VIS AI', thinking: 'Ultra VIS AI is working on it', open: 'Open', error: 'The request could not be completed. Try again.' };
  const api = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || labels.error);
    return body;
  };
  const expand = () => { dock.classList.add('is-expanded'); toggle.setAttribute('aria-expanded', 'true'); setTimeout(() => input.focus(), 240); };
  const collapse = () => { dock.classList.remove('is-expanded'); toggle.setAttribute('aria-expanded', 'false'); input.value = ''; };
  const closeChat = () => { document.body.classList.remove('ultra-ai-chat-open'); collapse(); };
  const openView = (view, id) => {
    const route = view === 'lecture' ? 'lectures' : view === 'college' ? 'colleges' : view;
    const params = new URLSearchParams({ view: route });
    if (id && view === 'lecture') params.set('lecture', id);
    if (id && view === 'college') params.set('college', id);
    location.href = `/dashboard?${params.toString()}`;
  };
  const append = (role, copy, result = {}) => {
    const message = document.createElement('article');
    message.className = `ultra-ai-message ${role}`;
    if (role === 'assistant') {
      const label = document.createElement('span');
      label.className = 'ai-label';
      label.textContent = labels.ai;
      message.appendChild(label);
    }
    const text = document.createElement('p');
    text.textContent = copy;
    message.appendChild(text);
    if (Array.isArray(result.suggestions) && result.suggestions.length) {
      const suggestionList = document.createElement('div');
      suggestionList.className = 'ultra-ai-suggestions';
      result.suggestions.forEach(item => {
        const button = document.createElement('button');
        const title = document.createElement('strong');
        const meta = document.createElement('small');
        button.type = 'button';
        button.className = 'ultra-ai-suggestion';
        title.textContent = item.title;
        meta.textContent = item.meta || '';
        button.append(title, meta);
        button.addEventListener('click', () => openView(item.view, item.id));
        suggestionList.appendChild(button);
      });
      message.appendChild(suggestionList);
    }
    if (result.action?.view) {
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'ultra-ai-action';
      action.textContent = result.action.label || labels.open;
      action.addEventListener('click', () => openView(result.action.view));
      message.appendChild(action);
    }
    messages.appendChild(message);
    messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
  };
  const thinking = () => {
    const item = document.createElement('div');
    const dot = document.createElement('i');
    const text = document.createElement('span');
    item.className = 'ultra-ai-thinking';
    text.textContent = labels.thinking;
    item.append(dot, text);
    messages.appendChild(item);
    messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
    return item;
  };

  toggle.addEventListener('click', () => dock.classList.contains('is-expanded') && !input.value ? collapse() : expand());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!dock.classList.contains('is-expanded')) return expand();
    const message = input.value.trim();
    if (!message) return input.focus();
    document.body.classList.add('ultra-ai-chat-open');
    append('user', message);
    input.value = '';
    send.disabled = true;
    const loader = thinking();
    try {
      const result = await api('/api/assistant', { method: 'POST', body: JSON.stringify({ message }) });
      loader.remove();
      append('assistant', result.reply, result);
    } catch (error) {
      loader.remove();
      append('assistant', error.message || labels.error);
    } finally {
      send.disabled = false;
      input.focus();
    }
  });
  close.addEventListener('click', closeChat);
  backdrop.addEventListener('click', closeChat);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('ultra-ai-chat-open')) closeChat();
  });
})();
