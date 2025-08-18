/* =========================================================
   UTILITÁRIOS
========================================================= */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
const off = (el, ev, fn, opts) => el && el.removeEventListener(ev, fn, opts);

const debounce = (fn, wait = 200) => {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};
const throttle = (fn, limit = 200) => {
  let inThrottle = false, lastArgs = null;
  return function wrapped(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) { wrapped.apply(this, lastArgs); lastArgs = null; }
      }, limit);
    } else lastArgs = args;
  };
};

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   SCROLL SUAVE + HIGHLIGHT DA NAVEGAÇÃO
========================================================= */
(function smoothNav() {
  const links = $$('nav a[href^="#"]');
  const scrollToId = (id) => {
    const target = document.querySelector(id);
    if (!target) return;
    const behavior = prefersReduced ? 'auto' : 'smooth';
    target.scrollIntoView({ behavior, block: 'start' });
    history.replaceState(null, '', id); // atualiza hash sem empurrar histórico
  };
  links.forEach(a => on(a, 'click', (e) => {
    e.preventDefault();
    scrollToId(a.getAttribute('href'));
  }));

  // Destaque do link ativo por seção visível
  const navMap = new Map(links.map(a => [a.getAttribute('href'), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = '#' + entry.target.id;
      const link = navMap.get(id);
      if (!link) return;
      if (entry.isIntersecting) link.classList.add('active');
      else link.classList.remove('active');
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });
  $$('.section[id]').forEach(sec => io.observe(sec));
})();

/* =========================================================
   BACK-TO-TOP INTELIGENTE (com fade + throttle)
========================================================= */
(function backToTop() {
  const btn = $('.back-to-top');
  if (!btn) return;
  const show = () => {
    btn.hidden = false;
    btn.classList.add('visible');
    btn.classList.remove('invisible');
  };
  const hide = () => {
    btn.classList.add('invisible');
    btn.classList.remove('visible');
    setTimeout(() => { if (btn.classList.contains('invisible')) btn.hidden = true; }, 400);
  };
  const onScroll = throttle(() => {
    window.scrollY > 600 ? show() : hide();
  }, 150);
  on(window, 'scroll', onScroll, { passive: true });
  on(btn, 'click', () => window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' }));
})();

/* =========================================================
   REVEAL DAS SEÇÕES & MICROINTERAÇÕES
========================================================= */
(function sectionReveal() {
  const sections = $$('.section');
  sections.forEach(sec => sec.style.setProperty('transform', 'translateY(24px) scale(0.995)'));
  sections.forEach(sec => sec.style.setProperty('opacity', '0'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.style.removeProperty('transform');
        el.style.removeProperty('opacity');
        el.style.transition = prefersReduced ? 'none' : 'transform .7s var(--easing), opacity .7s var(--easing), box-shadow .7s var(--easing)';
        io.unobserve(el);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });

  sections.forEach(sec => io.observe(sec));
})();

/* =========================================================
   RELÓGIO — HORÁRIO DE BRASÍLIA
========================================================= */
(function brasilClock() {
  const el = $('#clock');
  if (!el) return;
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const tick = () => { el.textContent = `${fmt.format(new Date())} — Brasília`; };
  tick();
  setInterval(tick, 1000);
})();

/* =========================================================
   TOASTS (feedback visual)
========================================================= */
const Toast = (() => {
  let wrap = null;
  const ensure = () => {
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.style.cssText = `
        position:fixed; right:16px; bottom:16px; z-index:9999; display:grid; gap:10px; max-width:min(90vw,480px);
      `;
      document.body.appendChild(wrap);
    }
  };
  const show = (msg, type = 'info', timeout = 2800) => {
    ensure();
    const card = document.createElement('div');
    card.setAttribute('role', 'status');
    card.style.cssText = `
      padding:12px 14px; border-radius:12px; color:#fff; 
      box-shadow:0 12px 28px rgba(0,0,0,.28); 
      font: 500 14px/1.45 var(--ff,system-ui);
      backdrop-filter:saturate(120%) blur(6px);
      border:1px solid var(--border,rgba(255,255,255,.08));
      opacity:0; transform: translateY(10px);
      transition: opacity .25s var(--easing, cubic-bezier(.22,1,.36,1)), transform .25s var(--easing, cubic-bezier(.22,1,.36,1));
    `;
    const palette = {
      success: 'linear-gradient(180deg,#1dd1a1,#10ac84)',
      error: 'linear-gradient(180deg,#ef476f,#d62839)',
      info: 'linear-gradient(180deg,#3a506b,#274c67)',
      warn: 'linear-gradient(180deg,#ffd166,#f4a261)'
    };
    card.style.background = palette[type] || palette.info;
    card.textContent = msg;
    wrap.appendChild(card);
    requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
    setTimeout(() => {
      card.style.opacity = '0'; card.style.transform = 'translateY(10px)';
      setTimeout(() => card.remove(), 250);
    }, timeout);
  };
  return { show };
})();

/* =========================================================
   SANITIZAÇÃO DE TEXTO BÁSICA (anti-XSS)
========================================================= */
const sanitize = (str) => String(str).replace(/[<>&"']/g, (c) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
}[c]));

/* =========================================================
   ROBÔ INTERATIVO COM "IA" PLUGÁVEL
========================================================= */
const AI = (() => {
  // CONFIG: aponte para seu backend seguro (Node/Cloudflare/Netlify) que guarda a chave da OpenAI.
  // Exemplo de endpoint: POST /api/chat { messages: [{role:'user',content:'...'}] }
  const ENDPOINT = '/api/chat'; // ajuste para o seu
  // Fallback local (respostas simples) se o endpoint não estiver disponível:
  const fallback = (q) => {
    q = q.toLowerCase();
    if (q.includes('olá') || q.includes('oi')) return 'Olá! Como posso ajudar no seu portfólio hoje?';
    if (q.includes('contato') || q.includes('email')) return 'Você pode me contatar pelo formulário da seção Contato. Respondo rápido!';
    if (q.includes('certificado')) return 'Meus certificados estão na seção “Certificados”, com links diretos.';
    if (q.includes('experiência') || q.includes('trabalho')) return 'Atuo na Paschoalotto como Operador de Cobrança. No portfólio, destaco habilidades e resultados.';
    if (q.includes('ads')) return 'Curso Análise e Desenvolvimento de Sistemas (ADS) na UNIMAR desde agosto de 2024.';
    if (q.includes('github') || q.includes('projeto')) return 'Dê uma olhada no meu GitHub (rodapé/contato). Tenho projetos em andamento e estudos práticos.';
    return 'Anotei sua pergunta! Posso te guiar pela página, falar de habilidades, certificados, contato e estudos.';
  };

  // Historico básico (pouca memória no front)
  const history = [{ role: 'system', content: 'Você é um assistente curto, educado e útil para um portfólio pessoal.' }];

  // Tipagem no balão (efeito)
  const typeIn = async (el, text, speed = 14) => {
    el.textContent = ''; // limpa antes
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      if (!prefersReduced) await new Promise(r => setTimeout(r, speed));
    }
  };

  const ask = async (question) => {
    const payload = { messages: [...history, { role: 'user', content: question }] };
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      // Espera-se { reply: "texto..." } do seu backend
      const reply = (data && data.reply) ? String(data.reply) : fallback(question);
      history.push({ role: 'assistant', content: reply });
      return reply;
    } catch (e) {
      return fallback(question);
    }
  };

  return { ask, typeIn };
})();

(function robotChat() {
  const robotBtn = $('#robot');
  const chatBox = $('#robot-chat');
  const userInput = $('#user-input');
  const robotMessage = $('#robot-message');
  const sendButton = $('#send-button');
  if (!robotBtn || !chatBox || !userInput || !robotMessage || !sendButton) return;

  // abre/fecha
  on(robotBtn, 'click', () => {
    const expanded = robotBtn.getAttribute('aria-expanded') === 'true';
    robotBtn.setAttribute('aria-expanded', String(!expanded));
    chatBox.classList.toggle('active');
    robotBtn.classList.toggle('smiling');
    if (chatBox.classList.contains('active')) userInput.focus();
  });

  // fecha com Esc
  on(document, 'keydown', (e) => {
    if (e.key === 'Escape' && chatBox.classList.contains('active')) {
      chatBox.classList.remove('active');
      robotBtn.setAttribute('aria-expanded', 'false');
      robotBtn.classList.remove('smiling');
      robotMessage.textContent = 'Até mais! 😉';
    }
  });

  // submit por Enter e pelo botão
  const doSend = async () => {
    const raw = userInput.value.trim();
    if (!raw) return;
    const question = sanitize(raw);
    userInput.value = '';
    robotBtn.classList.add('smiling');
    // indicador de digitando
    await AI.typeIn(robotMessage, 'Digitando...', 8);
    const reply = await AI.ask(question);
    await AI.typeIn(robotMessage, reply, 10);
    robotBtn.classList.remove('smiling');
  };

  on(sendButton, 'click', (e) => { e.preventDefault(); doSend(); });
  on(userInput, 'keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doSend(); }
  });
})();

/* =========================================================
   FORMULÁRIOS (Contato & Feedback) com validação forte
   - Honeypot
   - Desabilita botão durante envio
   - Toast de sucesso/erro
   - Integração Formspree (use endpoints distintos se quiser separar)
========================================================= */
(function forms() {
  const attach = (cfg) => {
    const form = $(cfg.formSel);
    const statusEl = $(cfg.statusSel);
    if (!form || !statusEl) return;

    const btn = form.querySelector('button[type="submit"]');
    const hp = form.querySelector(cfg.honeypotSel); // honeypot

    const setStatus = (msg, ok = true) => {
      statusEl.textContent = msg;
      statusEl.style.color = ok ? 'var(--brand, #1dd1a1)' : '#e25555';
    };

    const formToJSON = (formEl) => {
      const data = {};
      new FormData(formEl).forEach((v, k) => { data[k] = v; });
      return data;
    };

    on(form, 'submit', async (e) => {
      e.preventDefault();
      // honeypot
      if (hp && hp.value) {
        setStatus('Falha na validação.', false);
        Toast.show('Falha na validação.', 'error');
        return;
      }
      if (!form.checkValidity()) {
        form.reportValidity?.();
        setStatus('Verifique os campos obrigatórios.', false);
        Toast.show('Verifique os campos obrigatórios.', 'warn');
        return;
      }
      // feedback instantâneo
      btn && (btn.disabled = true);
      btn && (btn.textContent = 'Enviando...');
      setStatus('Enviando...', true);

      try {
        const payload = formToJSON(form);
        // Formspree aceita JSON também:
        const res = await fetch(cfg.endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        setStatus(cfg.successMsg, true);
        Toast.show(cfg.toastSuccess || 'Enviado com sucesso!', 'success');
        form.reset();
      } catch (err) {
        setStatus(cfg.errorMsg, false);
        Toast.show(cfg.toastError || 'Erro ao enviar.', 'error');
      } finally {
        btn && (btn.disabled = false);
        btn && (btn.textContent = cfg.buttonLabel || 'Enviar');
      }
    });
  };

  // CONTATO
  attach({
    formSel: '#contact-form',
    statusSel: '#form-status',
    honeypotSel: '#company',
    endpoint: 'https://formspree.io/f/mqazravp', // mantenha/ajuste o seu
    successMsg: 'Obrigado pela sua mensagem!',
    errorMsg: 'Ops! Algo deu errado, tente novamente.',
    toastSuccess: 'Mensagem enviada. Retornarei em breve!',
    toastError: 'Não foi possível enviar. Tente mais tarde.',
    buttonLabel: 'Enviar'
  });

  // FEEDBACK
  attach({
    formSel: '#feedback-form',
    statusSel: '#feedback-status',
    honeypotSel: '#website',
    endpoint: 'https://formspree.io/f/mqazravp', // recomendo criar um endpoint separado para diferenciar
    successMsg: 'Obrigado pelo seu feedback!',
    errorMsg: 'Ops! Algo deu errado, tente novamente.',
    toastSuccess: 'Feedback recebido. Valeu!',
    toastError: 'Não foi possível enviar o feedback.',
    buttonLabel: 'Enviar Feedback'
  });
})();

/* =========================================================
   TEMA (Dark/Light/Alto Contraste) — injeta um toggle
   Mantém preferência em localStorage
========================================================= */
(function themeSwitch() {
  const THEMES = ['auto', 'dark', 'light', 'contrast'];
  const key = 'wcc-theme';
  const get = () => localStorage.getItem(key) || 'auto';
  const set = (v) => localStorage.setItem(key, v);

  // aplica classes no <html>
  const apply = (mode) => {
    const html = document.documentElement;
    html.classList.remove('theme-dark', 'theme-light', 'theme-contrast', 'auto-theme');
    switch (mode) {
      case 'dark': html.classList.add('theme-dark'); break;
      case 'light': html.classList.add('theme-light'); break;
      case 'contrast': html.classList.add('theme-contrast'); break;
      default: html.classList.add('auto-theme');
    }
  };

  // botão flutuante
  const mount = () => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = 'Alternar tema';
    btn.setAttribute('aria-label', 'Alternar tema');
    btn.style.cssText = `
      position: fixed; left: 16px; bottom: 16px; z-index: 1000;
      padding: 10px 12px; border-radius: 999px; color:#fff;
      background: linear-gradient(180deg, var(--brand,#1dd1a1), var(--brand-strong,#10ac84));
      border: none; cursor: pointer; font: 600 14px/1 var(--ff,system-ui);
      box-shadow: 0 10px 22px rgba(0,0,0,.28);
    `;
    const icon = document.createElement('span');
    const label = document.createElement('span');
    label.style.marginLeft = '6px';
    const updateFace = () => {
      const mode = get();
      icon.textContent = mode === 'dark' ? '🌙' : mode === 'light' ? '☀️' : mode === 'contrast' ? '⚡' : '🖥️';
      label.textContent = mode;
    };
    btn.append(icon, label);
    document.body.appendChild(btn);

    on(btn, 'click', () => {
      const current = get();
      const idx = THEMES.indexOf(current);
      const next = THEMES[(idx + 1) % THEMES.length];
      set(next); apply(next); updateFace();
      Toast.show(`Tema: ${next}`, 'info');
    });

    updateFace();
  };

  apply(get());
  on(window, 'DOMContentLoaded', mount);
})();

/* =========================================================
   MELHORIAS DE ACESSIBILIDADE
   - Foco visível ao navegar por Tab
   - Evita salto de foco ao abrir/fechar o chat
========================================================= */
(function a11y() {
  let mouseNav = false;
  on(document, 'mousedown', () => { mouseNav = true; });
  on(document, 'keydown', (e) => {
    if (e.key === 'Tab') mouseNav = false;
    document.documentElement.classList.toggle('using-mouse', mouseNav);
  });
})();

/* =========================================================
   QUALIDADE DE VIDA
   - Corrige imagens sociais sem alt => define alt genérico
   - Lazy load para imagens sem atributo
========================================================= */
(function imagesQoL() {
  $$('img:not([alt])').forEach(img => img.setAttribute('alt', 'Imagem'));
  $$('img:not([loading])').forEach(img => img.setAttribute('loading', 'lazy'));
})();

/* =========================================================
   EXTRA: GUARDA ESTADO DO CHAT NO SESSIONSTORAGE
========================================================= */
(function chatState() {
  const chatBox = $('#robot-chat');
  const robotBtn = $('#robot');
  const KEY = 'wcc-chat-open';

  if (!chatBox || !robotBtn) return;

  // restaura estado
  const wasOpen = sessionStorage.getItem(KEY) === '1';
  if (wasOpen) {
    chatBox.classList.add('active');
    robotBtn.setAttribute('aria-expanded', 'true');
    robotBtn.classList.add('smiling');
  }

  const save = () => sessionStorage.setItem(KEY, chatBox.classList.contains('active') ? '1' : '0');

  on(robotBtn, 'click', save);
  on(document, 'keydown', (e) => { if (e.key === 'Escape') save(); });
})();

