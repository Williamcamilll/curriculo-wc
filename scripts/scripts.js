/* scripts.js — WCC • robusto + IA local (sem vazar chave) */
/* eslint-disable no-console */
(() => {
  'use strict';

  /* =========================================================
     HELPERS
  ========================================================= */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
  const throttle = (fn, limit = 200) => {
    let inThrottle = false, lastArgs = null;
    return function wrap(...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
          if (lastArgs) { wrap.apply(this, lastArgs); lastArgs = null; }
        }, limit);
      } else lastArgs = args;
    };
  };
  const prefersReduced = (() => {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return false; }
  })();
  const safeStorage = (() => {
    try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return localStorage; }
    catch { return { getItem: () => null, setItem: () => {}, removeItem: () => {} }; }
  })();
  const sanitize = (s) => String(s).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));

  /* =========================================================
     TOASTS
  ========================================================= */
  const Toast = (() => {
    let wrap = null;
    const ensure = () => {
      if (wrap) return;
      wrap = document.createElement('div');
      wrap.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;display:grid;gap:10px;max-width:min(90vw,480px)';
      wrap.setAttribute('aria-live','polite');
      document.body.appendChild(wrap);
    };
    const palette = {
      success:'linear-gradient(180deg,#16a34a,#15803d)',
      error:'linear-gradient(180deg,#ef4444,#b91c1c)',
      info:'linear-gradient(180deg,#334155,#0f172a)',
      warn:'linear-gradient(180deg,#f59e0b,#d97706)'
    };
    const show = (msg, type='info', t=2600) => {
      ensure();
      const el = document.createElement('div');
      el.role = 'status';
      el.style.cssText = `
        padding:12px 14px;border-radius:12px;color:#fff;background:${palette[type]||palette.info};
        box-shadow:0 12px 28px rgba(0,0,0,.28);border:1px solid var(--line,#1e2936);
        font:500 14px/1.45 var(--ff,system-ui);backdrop-filter:saturate(120%) blur(6px);
        opacity:0;transform:translateY(10px);transition:opacity .2s ease,transform .2s ease;
      `;
      el.textContent = String(msg);
      wrap.appendChild(el);
      requestAnimationFrame(()=>{ el.style.opacity='1'; el.style.transform='translateY(0)'; });
      setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(10px)'; setTimeout(()=>el.remove(),220); }, t);
    };
    return { show };
  })();

  /* =========================================================
     NAVEGAÇÃO SUAVE + LINK ATIVO
  ========================================================= */
  const initNav = () => {
    const links = $$('nav a[href^="#"]');
    if (!links.length) return;

    const scrollToId = (id) => {
      const tgt = document.querySelector(id);
      if (!tgt) return;
      const behavior = prefersReduced ? 'auto' : 'smooth';
      try { tgt.scrollIntoView({ behavior, block: 'start' }); } catch { location.hash = id; }
      try { history.replaceState(null, '', id); } catch {}
    };

    links.forEach(a => on(a,'click',(e)=>{ e.preventDefault(); scrollToId(a.getAttribute('href')); }));

    const map = new Map(links.map(a => [a.getAttribute('href'), a]));
    const setActive = (id) => map.forEach((lnk, href)=> lnk.classList.toggle('active', href===id));

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(en=>{
          const id = '#' + en.target.id;
          if (en.isIntersecting && map.has(id)) setActive(id);
        });
      }, {rootMargin:'-45% 0px -50% 0px', threshold:0.01});
      $$('.section[id]').forEach(s=>io.observe(s));
    } else {
      const secs = $$('.section[id]');
      const handler = throttle(()=>{
        let cur=null, y = scrollY + innerHeight*0.35;
        secs.forEach(s=>{ const top = s.getBoundingClientRect().top + scrollY; if (top<=y) cur=s.id; });
        if (cur) setActive('#'+cur);
      },150);
      on(window,'scroll',handler,{passive:true}); handler();
    }
  };

  /* =========================================================
     BACK TO TOP
  ========================================================= */
  const initBackToTop = () => {
    const btn = $('.back-to-top'); if (!btn) return;
    const show = ()=>{ btn.hidden=false; btn.classList.add('visible'); btn.classList.remove('invisible'); };
    const hide = ()=>{ btn.classList.add('invisible'); btn.classList.remove('visible'); setTimeout(()=>{ if(btn.classList.contains('invisible')) btn.hidden=true; },300); };
    const onScroll = throttle(()=>{ scrollY>600?show():hide(); }, 120);
    on(window,'scroll',onScroll,{passive:true});
    on(btn,'click',()=>window.scrollTo({top:0,behavior:prefersReduced?'auto':'smooth'}));
  };

  /* =========================================================
     SECTION REVEAL
  ========================================================= */
  const initReveal = () => {
    const sections = $$('.section'); if (!sections.length) return;
    sections.forEach(s=>{ s.style.opacity='0'; s.style.transform='translateY(18px)'; s.style.transition = prefersReduced?'none':'opacity .5s var(--easing), transform .5s var(--easing)'; });
    if (!('IntersectionObserver' in window)) { sections.forEach(s=>{ s.style.opacity='1'; s.style.transform='none'; }); return; }
    const io = new IntersectionObserver((entries)=> entries.forEach(en=>{ if(en.isIntersecting){ const el=en.target; el.style.opacity='1'; el.style.transform='none'; io.unobserve(el);} }), {threshold:0.12, rootMargin:'0px 0px -6% 0px'});
    sections.forEach(s=>io.observe(s));
  };

  /* =========================================================
     CLOCK — America/Sao_Paulo
  ========================================================= */
  const initClock = () => {
    const el = $('#clock'); if (!el) return;
    let fmt; try { fmt = new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',second:'2-digit'}); } catch { fmt = { format:(d)=>d.toLocaleTimeString('pt-BR') }; }
    const tick = ()=>{ try { el.textContent = `${fmt.format(new Date())} — Brasília`; } catch {} };
    tick(); setInterval(tick,1000);
  };

  /* =========================================================
     THEME SWITCH (Auto/Dark/Light/Contrast)
  ========================================================= */
  const initTheme = () => {
    const THEMES = ['auto','dark','light','contrast'];
    const KEY='wcc-theme'; const html = document.documentElement;
    const get = ()=> safeStorage.getItem(KEY)||'auto';
    const set = (v)=> safeStorage.setItem(KEY,v);
    const apply = (m)=>{ html.classList.remove('theme-dark','theme-light','theme-contrast','auto-theme'); html.classList.add(m==='dark'?'theme-dark':m==='light'?'theme-light':m==='contrast'?'theme-contrast':'auto-theme'); };

    const mountBtn = () => {
      const btn = document.createElement('button');
      btn.type='button'; btn.title='Alternar tema'; btn.setAttribute('aria-label','Alternar tema');
      btn.style.cssText = `
        position:fixed;left:16px;bottom:16px;z-index:1000;padding:10px 12px;border-radius:999px;color:#fff;
        background:linear-gradient(180deg,var(--accent,#0ea5e9),var(--accent-2,#0284c7));border:1px solid var(--line,#1e2936);
        cursor:pointer;font:600 14px/1 var(--ff,system-ui);box-shadow:0 10px 22px rgba(0,0,0,.18);
      `;
      const icon=document.createElement('span'); const label=document.createElement('span'); label.style.marginLeft='6px';
      const face=()=>{ const m=get(); icon.textContent=m==='dark'?'🌙':m==='light'?'☀️':m==='contrast'?'⚡':'🖥️'; label.textContent=m; };
      btn.append(icon,label); document.body.appendChild(btn);
      on(btn,'click',()=>{ const i=THEMES.indexOf(get()); const n=THEMES[(i+1)%THEMES.length]; set(n); apply(n); face(); Toast.show(`Tema: ${n}`,'info'); });
      face();
    };

    apply(get());
    if (document.readyState==='loading') on(document,'DOMContentLoaded',mountBtn,{once:true}); else mountBtn();
  };

  /* =========================================================
     FORMS (Contato & Feedback) — JSON para Formspree
  ========================================================= */
  const initForms = () => {
    const attach = (cfg) => {
      const form=$(cfg.formSel), statusEl=$(cfg.statusSel); if(!form||!statusEl) return;
      const btn=form.querySelector('button[type="submit"]'); const hp = cfg.honeypotSel ? form.querySelector(cfg.honeypotSel) : null;

      const setStatus=(m,ok=true)=>{ statusEl.textContent=m; statusEl.style.color = ok ? 'var(--accent-2,#22d3ee)' : '#ef4444'; };
      const toJSON=(f)=>{ const o={}; new FormData(f).forEach((v,k)=>{o[k]=v}); return o; };

      on(form,'submit', async (e)=>{
        e.preventDefault();
        if (hp && hp.value) { setStatus('Falha na validação.', false); Toast.show('Falha na validação.','error'); return; }
        if (!form.checkValidity()) { form.reportValidity?.(); setStatus('Verifique os campos obrigatórios.', false); Toast.show('Campos obrigatórios faltando.','warn'); return; }

        const label = btn?btn.textContent:''; if(btn){btn.disabled=true; btn.textContent='Enviando...'}; setStatus('Enviando...',true);
        try{
          const payload=toJSON(form); payload.formName = cfg.formName;
          const res = await fetch(cfg.endpoint,{method:'POST', headers:{'Accept':'application/json','Content-Type':'application/json'}, body:JSON.stringify(payload)});
          if(!res.ok) throw new Error('HTTP '+res.status);
          setStatus(cfg.successMsg,true); Toast.show(cfg.toastSuccess,'success'); form.reset();
        }catch(err){ console.warn('Form:',err); setStatus(cfg.errorMsg,false); Toast.show(cfg.toastError,'error'); }
        finally{ if(btn){btn.disabled=false; btn.textContent=label||'Enviar';} }
      });
    };

    // Contato
    attach({
      formSel:'#contact-form', statusSel:'#form-status', honeypotSel:'#company',
      endpoint:'https://formspree.io/f/mqazravp', formName:'Contato',
      successMsg:'Obrigado pela sua mensagem!', errorMsg:'Ops! Algo deu errado, tente novamente.',
      toastSuccess:'Mensagem enviada. Retorno em breve.', toastError:'Não consegui enviar sua mensagem.'
    });
    // Feedback
    attach({
      formSel:'#feedback-form', statusSel:'#feedback-status', honeypotSel:'#website',
      endpoint:'https://formspree.io/f/mqazravp', formName:'Feedback',
      successMsg:'Obrigado pelo seu feedback!', errorMsg:'Ops! Algo deu errado, tente novamente.',
      toastSuccess:'Feedback recebido. Valeu!', toastError:'Não consegui enviar seu feedback.'
    });
  };

  /* =========================================================
     IA LOCAL + EXTERNA (opcional) PARA O ROBÔ
  ========================================================= */
  // 1) Conhecimento local: seu texto original do site
  const KB = [
    {
      tag: 'sobre',
      title: 'Sobre Mim',
      text: [
        'Tenho 21 anos e atualmente sou estudante de Análise e Desenvolvimento de Sistemas (ADS) na UNIMAR.',
        'Iniciei minha trajetória acadêmica com o curso de Marketing Digital, mas tranquei temporariamente para focar em ADS.',
        'Quero integrar ADS e Marketing Digital para criar soluções completas e eficientes para o ambiente online.',
        'Sou apaixonado por tecnologia, análise de dados e estratégias digitais que transformam negócios.'
      ].join(' ')
    },
    {
      tag: 'educacao',
      title: 'Educação',
      text: [
        'UNIMAR - Universidade de Marília.',
        'Técnologo em Marketing Digital (EaD) – trancado. Foco: economia, gestão de pessoas e estratégias online.',
        'Análise e Desenvolvimento de Sistemas (ADS) – iniciado em agosto de 2024, duração de 2 anos e meio.',
        'Foco: desenvolvimento de software, bancos de dados e tecnologias emergentes.'
      ].join(' ')
    },
    {
      tag: 'experiencia',
      title: 'Experiência',
      text: [
        'Paschoalotto - Operador de Cobrança (Call Center). Início: 09/01/2025.',
        'Atividades: atendimento e cobrança de clientes, negociação de dívidas, esclarecimento de dúvidas, foco em qualidade e resolução de pendências.',
        'Status: atuando atualmente.'
      ].join(' ')
    },
    {
      tag: 'habilidades',
      title: 'Habilidades',
      text: [
        'Gestao pessoas, atendimente ao cliente, Análise de Dados, Organização, Proatividade.'
      ].join(' ')
    },
    {
      tag: 'certificados',
      title: 'Certificados',
      text: [
        'Comunicação para o Mercado de Trabalho - M1.2024.',
        '2° CONFESTDEV MARÍLIA 2024 (Google Developer Groups).',
        'Inteligência Emocional - M1.2024.',
        'Finanças Pessoais - M1.2024.',
        'Aperfeiçoamento Pedagógico em Informática - M1.2024.'
      ].join(' ')
    },
    {
      tag: 'contato',
      title: 'Contato',
      text: [
        'Telefone: (14) 99118-5465.',
        'Formulário de contato disponível na seção Contato.',
        'LinkedIn e GitHub nas redes sociais do rodapé.'
      ].join(' ')
    }
  ];

  // 2) Busca simples por relevância (tokenização leve)
  const rankKB = (q) => {
    const query = q.toLowerCase();
    const words = query.split(/[\s,.;!?/\\-]+/).filter(Boolean);
    const score = (txt) => words.reduce((acc,w)=> acc + (txt.includes(w)?1:0), 0);
    const ranked = KB.map(k => ({...k, s: score((k.title+' '+k.text).toLowerCase())}))
                     .sort((a,b)=> b.s - a.s);
    return ranked[0]; // melhor trecho
  };

  // 3) Geração local de resposta com base na KB
  const localAnswer = (q) => {
    const best = rankKB(q) || KB[0];
    // Respostas de atalho por intenção
    const t = q.toLowerCase();
    if (/(telefone|whats|contato|email|e-mail)/.test(t)) {
      return 'Você pode me contatar pela seção **Contato** do site. Telefone: (14) 99118-5465. Também respondo pelo formulário; deixei LinkedIn e GitHub nas redes.';
    }
    if (/(certificado|curso|evento|confestdev|emocional|finan)/.test(t)) {
      return 'Tenho alguns certificados: Comunicação para o Mercado de Trabalho, ConfestDev Marília 2024 (GDG), Inteligência Emocional e Finanças Pessoais — todos linkados na seção **Certificados**.';
    }
    if (/(experi|trabalho|emprego|call center|paschoalotto)/.test(t)) {
      return 'Atuo na Paschoalotto como Operador de Cobrança desde 09/01/2025 — foco em atendimento, negociação e qualidade na resolução de pendências.';
    }
    if (/(habilidade|skill|compet|ponto forte)/.test(t)) {
      return 'Minhas habilidades incluem: Gestão de Pessoas, Atendimento ao Cliente, Análise de Dados, Organização e Proatividade.';
    }
    if (/(ads|sistemas|faculdade|unimar|estudo)/.test(t)) {
      return 'Sou estudante de ADS na UNIMAR (desde ago/2024). Tranquei Marketing Digital para focar em tecnologia e pretendo integrar as duas áreas.';
    }
    if (/(sobre|quem é|quem é você)/.test(t)) {
      return 'Tenho 21 anos, apaixonado por tecnologia e estratégias digitais. Busco integrar ADS e Marketing para soluções completas e úteis de verdade.';
    }

    // fallback: trechinho do melhor tópico + CTA suave
    return `Posso te contar sobre **${best.title}**: ${best.text} \n\nSe quiser, pergunte algo como “quais são suas habilidades?” ou “quais certificados você tem?”.`;
  };

  // 4) Cliente de IA externa (opcional) — via backend seguro
  const askExternalAI = async (question, history = []) => {
    const ENDPOINT = '/api/chat'; // implemente no seu backend
    const controller = new AbortController();
    const t = setTimeout(()=>controller.abort('timeout'), 12000);
    try {
      const res = await fetch(ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages:[...history, {role:'user', content: question}] }),
        signal: controller.signal
      });
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      return (data && data.reply) ? String(data.reply) : null;
    } catch (e) {
      clearTimeout(t);
      return null;
    }
  };

  /* =========================================================
     CHAT DO ROBÔ
  ========================================================= */
  const initRobot = () => {
    const robotBtn = $('#robot');
    const chatBox  = $('#robot-chat');
    const userInput = $('#user-input');
    const robotMsg  = $('#robot-message');
    const sendBtn   = $('#send-button');
    if (!robotBtn || !chatBox || !userInput || !robotMsg || !sendBtn) return;

    const KEY = 'wcc-chat-open';
    const history = [{ role:'system', content:'Você é um assistente curto, direto e educado para um portfólio pessoal.' }];

    const typeIn = async (el, text, speed=12) => {
      el.innerHTML = ''; // permite **negrito** em localAnswer
      const s = String(text);
      for (let i=0;i<s.length;i++){
        el.innerHTML += s[i];
        if (!prefersReduced) await new Promise(r=>setTimeout(r, speed));
      }
    };

    const setOpen = (open) => {
      if (open) {
        chatBox.classList.add('active');
        robotBtn.setAttribute('aria-expanded','true');
        robotBtn.classList.add('smiling');
        try { sessionStorage.setItem(KEY,'1'); } catch {}
      } else {
        chatBox.classList.remove('active');
        robotBtn.setAttribute('aria-expanded','false');
        robotBtn.classList.remove('smiling');
        try { sessionStorage.setItem(KEY,'0'); } catch {}
      }
    };

    // abrir / fechar
    on(robotBtn,'click',()=>{
      const open = chatBox.classList.contains('active');
      setOpen(!open);
      if (!open) userInput.focus();
    });
    on(document,'keydown',(e)=>{ if (e.key==='Escape' && chatBox.classList.contains('active')) setOpen(false); });
    try { if (sessionStorage.getItem(KEY)==='1') setOpen(true); } catch {}

    // Mensagem de boas-vindas contextual
    const welcome = () => {
      const lines = [
        'Oi! Eu sou o assistente do William 👋',
        'Posso falar sobre **Sobre**, **Educação**, **Experiência**, **Habilidades**, **Certificados** e **Contato**.',
        'Pergunte, por exemplo: “quais são suas habilidades?” ou “como entro em contato?”'
      ];
      typeIn(robotMsg, lines.join('\n'), 6);
    };
    welcome();

    const doSend = async () => {
      const raw = (userInput.value||'').trim();
      if (!raw) return;
      const question = sanitize(raw);
      userInput.value = '';
      robotBtn.classList.add('smiling');
      await typeIn(robotMsg, 'Digitando...', 8);

      // 1) tenta IA externa
      let reply = await askExternalAI(question, history);

      // 2) se falhar, usa IA local com seu texto
      if (!reply) reply = localAnswer(question);

      history.push({ role:'user', content: question }, { role:'assistant', content: reply });
      await typeIn(robotMsg, reply, 10);
      robotBtn.classList.remove('smiling');
    };

    on(sendBtn,'click',(e)=>{ e.preventDefault(); doSend(); });
    on(userInput,'keydown',(e)=>{ if (e.key==='Enter'){ e.preventDefault(); doSend(); } });
  };

  /* =========================================================
     QoL
  ========================================================= */
  const initQoL = () => {
    // foco visível para teclado
    on(document,'mousedown',()=>document.documentElement.classList.add('using-mouse'));
    on(document,'keydown',(e)=>{ if (e.key==='Tab') document.documentElement.classList.remove('using-mouse'); });

    // imagens: alt/lazy por padrão
    $$('img').forEach(img=>{
      if(!img.getAttribute('alt')) img.setAttribute('alt','Imagem');
      if(!img.getAttribute('loading')) img.setAttribute('loading','lazy');
    });
  };

  /* =========================================================
     BOOT
  ========================================================= */
  const boot = () => {
    try { initNav(); }      catch(e){ console.warn(e); }
    try { initBackToTop(); }catch(e){ console.warn(e); }
    try { initReveal(); }   catch(e){ console.warn(e); }
    try { initClock(); }    catch(e){ console.warn(e); }
    try { initTheme(); }    catch(e){ console.warn(e); }
    try { initForms(); }    catch(e){ console.warn(e); }
    try { initRobot(); }    catch(e){ console.warn(e); }
    try { initQoL(); }      catch(e){ console.warn(e); }
  };
  if (document.readyState==='loading') on(document,'DOMContentLoaded',boot,{once:true}); else boot();

})();
