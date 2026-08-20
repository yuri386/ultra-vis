(() => {
  const dock = document.getElementById('ultraAiDock');
  const form = document.getElementById('ultraAiForm');
  const toggle = document.getElementById('ultraAiToggle');
  const input = document.getElementById('ultraAiInput');
  const mic = document.getElementById('ultraAiMic');
  const send = form?.querySelector('.ultra-ai-send');
  const chat = document.getElementById('ultraAiChat');
  const messages = document.getElementById('ultraAiMessages');
  const close = document.getElementById('ultraAiClose');
  const backdrop = document.getElementById('ultraAiBackdrop');
  if (!dock || !form || !toggle || !input || !mic || !send || !chat || !messages || !close || !backdrop) return;

  const language = document.documentElement.lang === 'kk' ? 'kk' : document.documentElement.lang === 'en' ? 'en' : 'ru';
  const labels = {ru:{ai:'ULTRA VIS AI',thinking:'Ultra VIS AI думает',open:'Открыть',edit:'Редактировать фото AI',error:'Не удалось выполнить запрос. Попробуй ещё раз.',listen:'Говорите — я слушаю.',unsupported:'Голосовой ввод недоступен в этом браузере. Можно написать сообщение текстом.'},en:{ai:'ULTRA VIS AI',thinking:'Ultra VIS AI is thinking',open:'Open',edit:'Edit photo AI',error:'The request could not be completed. Try again.',listen:'Speak — I am listening.',unsupported:'Voice input is not available in this browser. You can type instead.'},kk:{ai:'ULTRA VIS AI',thinking:'Ultra VIS AI ойланып жатыр',open:'Ашу',edit:'AI фото өңдеу',error:'Сұрауды орындай алмадым. Қайта көріңіз.',listen:'Сөйлеңіз — тыңдап тұрмын.',unsupported:'Бұл браузерде дауыспен енгізу қолжетімсіз. Хабарламаны жаза аласыз.'}}[language];
  let recognition = null;
  let voiceMode = false;
  const api = async (url, options = {}) => {
    const response = await fetch(url, { cache:'no-store', credentials:'same-origin', headers:{'Cache-Control':'no-store','Content-Type':'application/json',...(options.headers || {})},...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || labels.error);
    return body;
  };
  const languageTag = () => language === 'kk' ? 'kk-KZ' : language === 'en' ? 'en-US' : 'ru-RU';
  const scroll = () => requestAnimationFrame(() => messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' }));
  const type = (target, value, after = scroll) => {
    const text = String(value || ''); target.textContent = '';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || text.length < 2) { target.textContent = text; after(); return Promise.resolve(); }
    const step = Math.max(1, Math.ceil(text.length / 190)); let at = 0;
    return new Promise(resolve => { const tick = () => { at = Math.min(text.length, at + step); target.textContent = text.slice(0, at); after(); at < text.length ? setTimeout(tick, 9) : resolve(); }; tick(); });
  };
  const sync = () => form.classList.toggle('has-text', Boolean(input.value.trim()));
  const expand = () => { dock.classList.add('is-expanded'); toggle.setAttribute('aria-expanded', 'true'); setTimeout(() => input.focus(), 220); };
  const collapse = () => { dock.classList.remove('is-expanded'); toggle.setAttribute('aria-expanded', 'false'); input.value = ''; sync(); };
  const stopRecognition = () => { if (recognition) { try { recognition.stop(); } catch {} recognition = null; } mic.classList.remove('is-listening'); };
  const removeVoiceUI = () => { voiceMode = false; stopRecognition(); document.body.classList.remove('ultra-ai-voice-open'); document.querySelector('.ultra-ai-voice-stage')?.remove(); document.querySelector('.ultra-ai-voice-close')?.remove(); };
  const closeChat = () => { removeVoiceUI(); document.body.classList.remove('ultra-ai-chat-open'); collapse(); };
  const openPhotoEdit = () => {
    const returnTo = `${location.origin}${location.pathname}${location.search}${location.hash}`;
    location.assign(`https://skillland-platform-yuri386.onrender.com/ai-photo-edit.html?lang=${encodeURIComponent(language)}&return=${encodeURIComponent(returnTo)}`);
  };
  const addPhotoEditButton = () => {
    if (chat.querySelector('.ultra-ai-photo-edit')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ultra-ai-photo-edit';
    button.textContent = labels.edit;
    button.addEventListener('click', openPhotoEdit);
    chat.appendChild(button);
  };
  const openView = (view, id) => {
    if (view === 'profile') { location.href = 'https://skillland-platform-yuri386.onrender.com/profile.html'; return; }
    const route = view === 'lecture' ? 'lectures' : view === 'college' ? 'colleges' : view;
    const params = new URLSearchParams({ view: route });
    if (id && view === 'lecture') params.set('lecture', id);
    if (id && view === 'college') params.set('college', id);
    location.href = `/dashboard?${params.toString()}`;
  };
  const append = (role, copy, result = {}) => {
    const message = document.createElement('article'); message.className = `ultra-ai-message ${role}`;
    if (role === 'assistant') { const label = document.createElement('span'); label.className = 'ai-label'; label.textContent = labels.ai; message.appendChild(label); }
    const text = document.createElement('p'); message.appendChild(text); messages.appendChild(message);
    if (role === 'assistant') type(text, copy); else text.textContent = copy;
    if (Array.isArray(result.suggestions) && result.suggestions.length) {
      const list = document.createElement('div'); list.className = 'ultra-ai-suggestions';
      result.suggestions.forEach(item => { const button = document.createElement('button'); const title = document.createElement('strong'); const meta = document.createElement('small'); button.type='button';button.className='ultra-ai-suggestion';title.textContent=item.title;meta.textContent=item.meta||'';button.append(title,meta);button.addEventListener('click',()=>openView(item.view,item.id));list.appendChild(button); });
      message.appendChild(list);
    }
    if (result.action?.view) { const action = document.createElement('button'); action.type='button';action.className='ultra-ai-action';action.textContent=result.action.label||labels.open;action.addEventListener('click',()=>openView(result.action.view));message.appendChild(action); }
    scroll(); return message;
  };
  const thinking = () => { const item=document.createElement('div');item.className='ultra-ai-thinking';item.setAttribute('aria-label',labels.thinking);messages.appendChild(item);scroll();return item; };
  const requestAI = message => api('/api/assistant',{method:'POST',body:JSON.stringify({message})});
  function startDictation() {
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if (!Recognition) { append('assistant',labels.unsupported); return; }
    if (recognition) { stopRecognition(); sync(); return; }
    let finalText=''; const item=new Recognition();recognition=item;item.lang=languageTag();item.interimResults=true;item.continuous=true;
    item.onstart=()=>mic.classList.add('is-listening');
    item.onresult=event=>{let interim='';for(let i=event.resultIndex;i<event.results.length;i+=1){const text=event.results[i][0].transcript;if(event.results[i].isFinal)finalText+=text+' ';else interim+=text;}input.value=(finalText+interim).trim();sync();};
    item.onerror=stopRecognition;item.onend=()=>{if(recognition===item)recognition=null;mic.classList.remove('is-listening');sync();};
    try{item.start();}catch{stopRecognition();}
  }
  async function askVoice(text, answer, prompt, dot) {
    prompt.textContent=text;answer.textContent='';dot.hidden=false;
    try { const result=await requestAI(text); dot.hidden=true; await type(answer,result.reply,()=>{}); }
    catch(error) { dot.hidden=true; await type(answer,error.message||labels.error,()=>{}); }
  }
  function startVoiceMode() {
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if (!Recognition) { append('assistant',labels.unsupported); return; }
    voiceMode=true;document.body.classList.add('ultra-ai-voice-open');
    const stage=document.createElement('section');stage.className='ultra-ai-voice-stage';stage.innerHTML='<div><i class="ultra-ai-voice-dot"></i><p></p><p></p></div>';const dot=stage.querySelector('i'),prompt=stage.querySelector('p:first-of-type'),answer=stage.querySelector('p:last-of-type');prompt.textContent=labels.listen;
    const closer=document.createElement('button');closer.className='ultra-ai-voice-close';closer.type='button';closer.textContent='×';closer.setAttribute('aria-label','Close voice mode');closer.addEventListener('click',()=>{removeVoiceUI();expand();});document.body.append(stage,closer);
    let finalText='';const item=new Recognition();recognition=item;item.lang=languageTag();item.interimResults=true;item.continuous=false;
    item.onresult=event=>{let interim='';for(let i=event.resultIndex;i<event.results.length;i+=1){const text=event.results[i][0].transcript;if(event.results[i].isFinal)finalText+=text+' ';else interim+=text;}prompt.textContent=(finalText+interim).trim()||labels.listen;};
    item.onerror=()=>{if(voiceMode)prompt.textContent=labels.unsupported;};item.onend=()=>{if(recognition===item)recognition=null;if(voiceMode&&finalText.trim())askVoice(finalText.trim(),answer,prompt,dot);};try{item.start();}catch{prompt.textContent=labels.unsupported;}
  }
  toggle.addEventListener('click',()=>dock.classList.contains('is-expanded')&&!input.value?collapse():expand());
  addPhotoEditButton();
  mic.addEventListener('click',startDictation);input.addEventListener('input',sync);
  form.addEventListener('submit',async event=>{event.preventDefault();if(!dock.classList.contains('is-expanded')){expand();return;}const message=input.value.trim();if(!message){startVoiceMode();return;}document.body.classList.add('ultra-ai-chat-open');append('user',message);input.value='';sync();send.disabled=true;const loader=thinking();try{const result=await requestAI(message);loader.remove();append('assistant',result.reply,result);}catch(error){loader.remove();append('assistant',error.message||labels.error);}finally{send.disabled=false;input.focus();}});
  close.addEventListener('click',closeChat);backdrop.addEventListener('click',closeChat);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&(document.body.classList.contains('ultra-ai-chat-open')||voiceMode))closeChat();});
})();
