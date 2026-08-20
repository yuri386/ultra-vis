(() => {
  'use strict';
  if (window.__ultraVisMotion) return;
  window.__ultraVisMotion = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const style = document.createElement('style');
  style.textContent = `html{scroll-behavior:smooth;scroll-padding-top:24px;overscroll-behavior-y:none}@media(prefers-reduced-motion:no-preference){.uv-reveal{opacity:0;transform:translate3d(0,36px,0);transition:opacity .76s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1);will-change:opacity,transform}.uv-reveal.is-visible{opacity:1;transform:none;will-change:auto}}.ultra-ai-photo-edit{position:absolute;z-index:3;left:18px;top:17px;min-height:35px;padding:0 12px;border:1px solid rgba(29,29,31,.14);border-radius:999px;background:rgba(255,255,255,.82);color:#0071e3;font:650 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}.ultra-ai-chat .ultra-ai-messages{padding-top:65px}`;
  document.head.append(style);
  const interactive = target => target?.closest('input,textarea,select,button,[contenteditable="true"],.ultra-ai-messages,.ultra-ai-chat,.vis-workspace');
  if (!reduce.matches && matchMedia('(pointer:fine)').matches) addEventListener('wheel', event => { if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || interactive(event.target)) return; event.preventDefault(); scrollBy({ top:event.deltaY*.78, behavior:'auto' }); }, {passive:false});
  if (reduce.matches || !('IntersectionObserver' in window)) return;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.08,rootMargin:'0px 0px -7% 0px'});
  [...document.querySelectorAll('main > section,main > article,.ultra-minimal-links,.ultra-feature-gallery,.footer,.ultra-footer')].forEach((target,index)=>{target.classList.add('uv-reveal');target.style.transitionDelay=`${Math.min(index%5,3)*45}ms`;observer.observe(target)});
})();
