(() => {
  'use strict';
  if (window.__ultraVisLiquidAI) return;
  window.__ultraVisLiquidAI = true;

  const dock = document.getElementById('ultraAiDock');
  const form = document.getElementById('ultraAiForm');
  const input = document.getElementById('ultraAiInput');
  const mic = document.getElementById('ultraAiMic');
  const chat = document.getElementById('ultraAiChat');
  const messages = document.getElementById('ultraAiMessages');
  const close = document.getElementById('ultraAiClose');
  if (!dock || !form || !input || !mic || !chat || !messages || !close) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const language = () => document.documentElement.lang === 'kk' ? 'kk-KZ' : document.documentElement.lang === 'en' ? 'en-US' : 'ru-RU';
  const unsupported = () => document.documentElement.lang === 'en'
    ? 'Voice input is not available in this browser. You can type your message instead.'
    : document.documentElement.lang === 'kk'
      ? 'Бұл браузерде дауыспен енгізу қолжетімсіз. Хабарламаны жаза аласыз.'
      : 'Голосовой ввод недоступен в этом браузере. Можно написать сообщение текстом.';

  const style = document.createElement('style');
  style.textContent = `
    body.ultra-ai-chat-open .ultra-ai-backdrop{background:rgba(0,0,0,.42)!important;backdrop-filter:blur(13px) saturate(112%)!important;-webkit-backdrop-filter:blur(13px) saturate(112%)!important}
    .ultra-ai-chat{z-index:126!important;width:min(414px,calc(100vw - 26px))!important;height:min(604px,calc(100dvh - 26px))!important;bottom:calc(50% - min(604px,calc(100dvh - 26px))/2)!important;border:1px solid rgba(168,168,168,.19)!important;border-radius:34px!important;background:linear-gradient(180deg,rgba(17,17,17,.36),rgba(8,8,8,.6) 48%,rgba(3,3,3,.91))!important;color:#fff!important;box-shadow:0 34px 100px rgba(0,0,0,.42)!important;backdrop-filter:blur(4px) saturate(122%)!important;-webkit-backdrop-filter:blur(4px) saturate(122%)!important}
    .ultra-ai-chat::after{content:"";position:absolute;z-index:-1;inset:auto 0 0;height:48%;pointer-events:none;background:linear-gradient(180deg,transparent,rgba(0,0,0,.7))}.ultra-ai-chat-head{display:none!important}.ultra-ai-close{right:18px!important;top:18px!important;width:46px!important;height:46px!important;border:1px solid rgba(255,255,255,.15)!important;background:rgba(7,7,7,.18)!important;color:#fff!important;font-size:30px!important;backdrop-filter:blur(3px)!important;-webkit-backdrop-filter:blur(3px)!important}
    .ultra-liquid-expand{position:absolute;z-index:7;left:18px;top:18px;width:46px;height:46px;border:1px solid rgba(255,255,255,.15);border-radius:50%;background:rgba(7,7,7,.18);color:#fff;font:400 24px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}.ultra-ai-chat.ultra-liquid-expanded{width:min(760px,calc(100vw - 24px))!important;height:min(880px,calc(100dvh - 24px))!important;bottom:calc(50% - min(880px,calc(100dvh - 24px))/2)!important}
    .ultra-ai-messages{padding:78px 34px 112px!important;color:#fff!important}.ultra-ai-message.assistant{color:#fff!important}.ultra-ai-message.assistant .ai-label{color:rgba(255,255,255,.52)!important}.ultra-ai-message.user{border:1px solid rgba(255,255,255,.12)!important;background:rgba(8,8,8,.3)!important;box-shadow:none!important}
    .ultra-ai-dock{z-index:128!important;bottom:max(28px,calc(50% - min(604px,calc(100dvh - 26px))/2 + 14px))!important}.ultra-ai-dock.is-expanded{width:min(382px,calc(100vw - 56px))!important}.ultra-ai-composer{border:1px solid rgba(168,168,168,.19)!important;background:rgba(7,7,7,.18)!important;box-shadow:0 8px 22px rgba(0,0,0,.12)!important;backdrop-filter:blur(2.8px) saturate(160%)!important;-webkit-backdrop-filter:blur(2.8px) saturate(160%)!important}.ultra-ai-toggle,.ultra-ai-composer input,.ultra-ai-mic{color:#fff!important}.ultra-ai-composer input::placeholder{color:rgba(255,255,255,.56)!important}.ultra-ai-send{background:rgba(255,255,255,.94)!important;color:#111!important}.ultra-ai-waves i{background:#111!important}
    .ultra-liquid-opening{opacity:.02!important;transform:translate(-50%,-72px) scale(.84)!important;filter:blur(9px)!important}.ultra-liquid-opening.ultra-liquid-composer-in{opacity:.98!important;transform:translate(-50%,-18px) scale(.94)!important;filter:blur(1px)!important}.ultra-liquid-opening.ultra-liquid-center{transform:translate(-50%,0) scale(1)!important;filter:none!important}.ultra-liquid-opening.ultra-liquid-bottom{transform:translate(-50%,22px) scale(.985)!important}.ultra-liquid-opening.ultra-liquid-ready{transform:translate(-50%,0) scale(1)!important}.ultra-liquid-opening + *{}
    .ultra-liquid-voice{position:absolute;z-index:14;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.04)}.ultra-liquid-voice-orb{width:clamp(104px,22vw,152px);height:clamp(104px,22vw,152px);border-radius:50%;background:#fff;animation:ultraLiquidVoiceBreathe 1.35s ease-in-out infinite}.ultra-liquid-voice-close{position:absolute;bottom:20px;left:50%;width:48px;height:48px;border:0;border-radius:50%;background:rgba(255,255,255,.96);color:#111;font:300 31px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;transform:translateX(-50%)}body.ultra-liquid-voice-open .ultra-ai-messages,body.ultra-liquid-voice-open .ultra-ai-close,body.ultra-liquid-voice-open .ultra-liquid-expand,body.ultra-liquid-voice-open .ultra-ai-dock{opacity:0!important;pointer-events:none!important;transform:translateY(30px)!important}@keyframes ultraLiquidVoiceBreathe{0%,100%{transform:scale(.9);opacity:.78}50%{transform:scale(1.06);opacity:1}}
    @media(max-width:520px){.ultra-ai-chat{width:100%!important;height:94dvh!important;bottom:0!important;border-radius:34px 34px 0 0!important}.ultra-ai-dock{bottom:max(20px,env(safe-area-inset-bottom))!important}.ultra-ai-dock.is-expanded{width:calc(100vw - 40px)!important}.ultra-ai-chat.ultra-liquid-expanded{height:100dvh!important}.ultra-liquid-opening.ultra-liquid-bottom{transform:translate(-50%,12px) scale(.99)!important}}
    @media(prefers-reduced-motion:reduce){.ultra-liquid-opening,.ultra-liquid-opening.ultra-liquid-composer-in,.ultra-liquid-opening.ultra-liquid-center,.ultra-liquid-opening.ultra-liquid-bottom,.ultra-liquid-opening.ultra-liquid-ready{opacity:1!important;transform:translate(-50%,0) scale(1)!important;filter:none!important}.ultra-liquid-voice-orb{animation:none!important}}
  `;
  document.head.append(style);

  close.textContent = '×';
  close.setAttribute('aria-label', 'Close chat');
  const expand = document.createElement('button');
  expand.className = 'ultra-liquid-expand';
  expand.type = 'button';
  expand.textContent = '↗';
  expand.setAttribute('aria-label', 'Expand chat');
  expand.addEventListener('click', () => chat.classList.toggle('ultra-liquid-expanded'));
  chat.append(expand);

  const addAssistant = text => {
    const item = document.createElement('article');
    item.className = 'ultra-ai-message assistant';
    const copy = document.createElement('p');
    copy.textContent = text;
    item.append(copy);
    messages.append(item);
    requestAnimationFrame(() => messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' }));
  };
  const sync = value => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); };

  function voice() {
    if (chat.querySelector('.ultra-liquid-voice')) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { addAssistant(unsupported()); return; }
    document.body.classList.add('ultra-liquid-voice-open');
    const stage = document.createElement('section');
    stage.className = 'ultra-liquid-voice';
    const orb = document.createElement('i');
    orb.className = 'ultra-liquid-voice-orb';
    const finishButton = document.createElement('button');
    finishButton.className = 'ultra-liquid-voice-close';
    finishButton.type = 'button';
    finishButton.textContent = '×';
    finishButton.setAttribute('aria-label', 'Finish voice input');
    stage.append(orb, finishButton);
    chat.append(stage);
    let finalText = '';
    let active = true;
    const recognition = new Recognition();
    recognition.lang = language();
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = event => {
      let allFinal = finalText;
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const part = event.results[index][0].transcript;
        if (event.results[index].isFinal) allFinal += `${part} `;
        else interim += part;
      }
      finalText = allFinal;
      stage.dataset.transcript = `${allFinal}${interim}`.trim();
    };
    const finish = () => {
      if (!active) return;
      active = false;
      try { recognition.stop(); } catch {}
      const value = (stage.dataset.transcript || finalText).trim();
      stage.remove();
      document.body.classList.remove('ultra-liquid-voice-open');
      if (value) sync(value);
      dock.classList.add('is-expanded');
      window.setTimeout(() => input.focus({ preventScroll: true }), 40);
    };
    finishButton.addEventListener('click', finish);
    try { recognition.start(); } catch { finish(); }
  }

  document.addEventListener('click', event => {
    if (event.target !== mic && !mic.contains(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    voice();
  }, true);
  document.addEventListener('submit', event => {
    if (event.target !== form || input.value.trim() || !dock.classList.contains('is-expanded')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    voice();
  }, true);

  let wasOpen = false;
  const watch = () => {
    const open = document.body.classList.contains('ultra-ai-chat-open');
    if (open && !wasOpen && !reduce.matches) {
      chat.classList.remove('ultra-liquid-composer-in', 'ultra-liquid-center', 'ultra-liquid-bottom', 'ultra-liquid-ready');
      chat.classList.add('ultra-liquid-opening');
      requestAnimationFrame(() => chat.classList.add('ultra-liquid-composer-in'));
      setTimeout(() => chat.classList.add('ultra-liquid-center'), 500);
      setTimeout(() => chat.classList.add('ultra-liquid-bottom'), 1000);
      setTimeout(() => { chat.classList.add('ultra-liquid-ready'); input.focus({ preventScroll: true }); setTimeout(() => chat.classList.remove('ultra-liquid-opening', 'ultra-liquid-composer-in', 'ultra-liquid-center', 'ultra-liquid-bottom', 'ultra-liquid-ready'), 250); }, 1500);
    }
    wasOpen = open;
  };
  new MutationObserver(watch).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  watch();
})();
