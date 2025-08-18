/* scripts.js — WCC | robusto, acessível e sem bugs aparentes */
/* eslint-disable no-console */
(() => {
  'use strict';

  /* =========================================================
     Helpers utilitários (seguros)
  ========================================================= */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
  const off = (el, ev, fn, opts) => el && el.removeEventListener(ev, fn, opts);

  const debounce = (fn, wait = 200) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };

  const throttle = (fn, limit = 200) => {
    let inThrottle = false;
    let lastArgs = null;
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

  const prefersReduced = (() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return false; }
  })();

  const safeStorage = (() => {
    try {
      const ls = window.localStorage;
      const testKey = '__wcc_test__';
      ls.setItem(testKey, '1'); ls.removeItem(testKey);
      return ls;
    } catch { return { getItem: () => null, setItem: () => {}, removeItem: () => {} }; }
  })();

  const sanitize = (str) =>
    String(str).replace(/[<>&"']/g, (c) => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;', "'":'&#39;' }[c]));

  /* =========================================================
     TOASTS acessíveis
  ========================================================= */
  const Toast = (() => {
    let wrap = null;
    const ensure = () => {
      if (wrap) return;
      wrap = document.createElement('div');
      wrap.setAttribute('aria-live', 'polite');
      wrap.style.cssText = `
        position:fixed; right:16px; bottom:16px; z-index:9999;
        display:grid; gap:10px; max-width:min(90vw,480px)
      `;
      document.body.appendChild(wrap);
    };
    const palette = {
      success: 'linear-gradient(180deg,#16a34a,#15803d)',
      error:   'linear-gradient(180deg,#ef4444,#b91c1c)',
      info:    'linear-gradient(180deg,#334155,#0f172a)',
      warn:    'linear-gradient(180deg,#f59e0b,#d97706)'
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
        border:1px solid var(--line,#1e2936);
        background:${palette[type] || palette.info};
        opacity:0; transform: translateY(10px);
        transition: opacity .2s ease, transform .2s ease;
      `;
      card.textContent = String(msg);
      wrap.appendChild(card);
      requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
      setTimeout(() => {
        card.style.opacity = '0'; card.style.transform = 'translateY(10px)';
        setTimeout(() => card.remove(), 220);
      }, timeout);
    };
    return { show };
  })();

  /* =========================================================
     Scroll suave + destaque do link ativo
  ========================================================= */
  const initSmoothNav = () => {
    const navLinks = $$('nav a[href^="#"]');
    if (!navLinks.length) return;

    const scrollToId = (id) => {
      const target = document.querySelector(id);
      if (!target) return;
      const behavior = prefersReduced ? 'auto' : 'smooth';
      try { target.scrollIntoView({ behavior, block: 'start' }); }
      catch { location.hash = id; } // fallback
      // atualiza hash sem empurrar histórico
      try { history.replaceState(null, '', id); } catch {}
    };

    navLinks.forEach((a) => {
      on(a, 'click', (e) => {
        const href = a.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        e.preventDefault();
        scrollToId(href);
      });
    });

    // Destaque seção ativa
    const map = new Map(navLinks.map(a => [a.getAttribute('href'), a]));
    const setActive = (id) => {
      map.forEach((link, key) => {
        if (key === id) link.classList.add('active');
        else link.classList.remove('active');
      });
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const id = '#' + entry.target.id;
          if (!map.has(id)) return;
          if (entry.isIntersecting) setActive(id);
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0.01 });

      $$('.section[id]').forEach(sec => io.observe(sec));
    } else {
      // Fallback: por scroll
      const sections = $$('.section[id]');
      const handler = throttle(() => {
        let current = null;
        const pos = window.scrollY + window.innerHeight * 0.35;
        sections.forEach((s) => {
          const r = s.getBoundingClientRect();
          const top = r.top + window.scrollY;
          if (top <= pos) current = s.id;
        });
        if (current) setActive('#' + current);
      }, 150);
      on(window, 'scroll', handler, { passive: true });
      handler();
    }
  };

  /* =========================================================
     Back-to-top (visível/invisível sem piscar)
  ========================================================= */
  const initBackToTop = () => {
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
      setTimeout(() => { if (btn.classList.contains('invisible')) btn.hidden = true; }, 300);
    };

    const onScroll = throttle(() => {
      window.scrollY > 600 ? show() : hide();
    }, 120);

    on(window, 'scroll', onScroll, { passive: true });
    on(btn, 'click', () => window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' }));
  };

  /* =========================================================
     Reveal suave das sections (sem inline bagunçado)
  ========================================================= */
  const initSectionReveal = () => {
    const sections = $$('.section');
    if (!sections.length) return;

    // estado inicial via style — sem depender do CSS global
    sections.forEach((sec) => {
      sec.style.opacity = '0';
      sec.style.transform = 'translateY(18px)';
      sec.style.transition = prefersReduced ? 'none' : 'opacity .5s var(--easing), transform .5s var(--easing), box-shadow .5s var(--easing)';
    });

    if (!('IntersectionObserver' in window)) {
      // fallback: revela tudo
      sections.forEach((sec) => { sec.style.opacity = '1'; sec.style.transform = 'none'; });
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.style.opacity = '1';
        el.style.transform = 'none';
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    sections.forEach((sec) => io.observe(sec));
  };

  /* =========================================================
     Relógio — America/Sao_Paulo
  ========================================================= */
  const initClock = () => {
    const el = $('#clock');
    if (!el) return;

    let fmt;
    try {
      fmt = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch {
      fmt = { format: (d) => d.toLocaleTimeString('pt-BR') };
    }

    const tick = () => {
      try { el.textContent = `${fmt.format(new Date())} — Brasília`; }
      catch { el.textContent = ''; }
    };
    tick();
    setInterval(tick, 1000);
  };

  /* =========================================================
     Theme Switch (auto/dark/light/contrast) com persistência
  ========================================================= */
  const initThemeSwitch = () => {
    const THEMES = ['auto', 'dark', 'light', 'contrast'];
    const KEY = 'wcc-theme';
    const html = document.documentElement;

    const get = () => safeStorage.getItem(KEY) || 'auto';
    const set = (v) => safeStorage.setItem(KEY, v);

    const apply = (mode) => {
      html.classList.remove('theme-dark', 'theme-light', 'theme-contrast', 'auto-theme');
      switch (mode) {
        case 'dark': html.classList.add('theme-dark'); break;
        case 'light': html.classList.add('theme-light'); break;
        case 'contrast': html.classList.add('theme-contrast'); break;
        default: html.classList.add('auto-theme');
      }
    };

    const mountBtn = () => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.title = 'Alternar tema';
      btn.setAttribute('aria-label', 'Alternar tema');
      btn.style.cssText = `
        position: fixed; left: 16px; bottom: 16px; z-index: 1000;
        padding: 10px 12px; border-radius: 999px; color:#fff;
        background: linear-gradient(180deg, var(--accent,#0ea5e9), var(--accent-2,#0284c7));
        border: 1px solid var(--line,#1e2936); cursor: pointer;
        font: 600 14px/1 var(--ff,system-ui);
        box-shadow: 0 10px 22px rgba(0,0,0,.18);
      `;
      const icon = document.createElement('span');
      const label = document.createElement('span'); label.style.marginLeft = '6px';

      const updateFace = () => {
        const mode = get();
        icon.textContent = mode === 'dark' ? '🌙' :
                           mode === 'light' ? '☀️' :
                           mode === 'contrast' ? '⚡' : '🖥️';
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
    // monta depois do DOM completo
    if (document.readyState === 'loading') {
      on(document, 'DOMContentLoaded', mountBtn, { once: true });
    } else {
      mountBtn();
    }
  };

  /* =========================================================
     Formulários (Contato & Feedback) — robustos
  ========================================================= */
  const initForms = () => {
    const attach = (cfg) => {
      const form = $(cfg.formSel);
      const statusEl = $(cfg.statusSel);
      if (!form || !statusEl) return;

      const btn = form.querySelector('button[type="submit"]');
      const hp = cfg.honeypotSel ? form.querySelector(cfg.honeypotSel) : null;

      const setStatus = (msg, ok = true) => {
        statusEl.textContent = msg;
        statusEl.style.color = ok ? 'var(--accent-2,#22d3ee)' : '#ef4444';
      };

      const formToJSON = (formEl) => {
        const data = {};
        new FormData(formEl).forEach((v, k) => { data[k] = v; });
        return data;
      };

      on(form, 'submit', async (e) => {
        e.preventDefault();

        // Honeypot
        if (hp && hp.value) {
          setStatus('Falha na validação.', false);
          Toast.show('Falha na validação.', 'error');
          return;
        }

        if (!form.checkValidity()) {
          form.reportValidity?.();
          setStatus('Verifique os campos obrigatórios.', false);
          Toast.show('Campos obrigatórios faltando.', 'warn');
          return;
        }

        // Envio
        const originalLabel = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
        setStatus('Enviando...', true);

        try {
          // Envie como JSON (Formspree aceita quando Accept: application/json)
          const payload = formToJSON(form);
          // dica: inclua um campo para diferenciar formulários no mesmo endpoint
          if (!payload.formName) payload.formName = cfg.formName || 'Contato';

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
          console.warn('Form error:', err);
          setStatus(cfg.errorMsg, false);
          Toast.show(cfg.toastError || 'Erro ao enviar.', 'error');
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = originalLabel || 'Enviar'; }
        }
      });
    };

    // Contato
    attach({
      formSel: '#contact-form',
      statusSel: '#form-status',
      honeypotSel: '#company',
      endpoint: 'https://formspree.io/f/mqazravp', // use endpoints distintos se quiser separar contato/feedback
      formName: 'Contato',
      successMsg: 'Obrigado pela sua mensagem!',
      errorMsg: 'Ops! Algo deu errado, tente novamente.',
      toastSuccess: 'Mensagem enviada. Retorno em breve.',
      toastError: 'Não consegui enviar sua mensagem.'
    });

    // Feedback
    attach({
      formSel: '#feedback-form',
      statusSel: '#feedback-status',
      honeypotSel: '#website',
      endpoint: 'https://formspree.io/f/mqazravp',
      formName: 'Feedback',
      successMsg: 'Obrigado pelo seu feedback!',
      errorMsg: 'Ops! Algo deu errado, tente novamente.',
      toastSuccess: 'Feedback recebido. Valeu!',
      toastError: 'Não consegui enviar seu feedback.'
    });
  };

  /* =========================================================
     Chat do Robô com IA plugável (sem expor chave)
  ========================================================= */
  const initRobot = () => {
    const robotBtn = $('#robot');
    const chatBox  = $('#robot-chat');
    const userInput = $('#user-input');
    const robotMsg  = $('#robot-message');
    const sendBtn   = $('#send-button');

    if (!robotBtn || !chatBox || !userInput || !robotMsg || !sendBtn) return;

    const KEY = 'wcc-chat-open';
    const ENDPOINT = '/api/chat'; // troque para o seu backend que chama a OpenAI
    const controllerTimeout = (ms = 12000) => {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort('timeout'), ms);
      return { ctrl, done: () => clearTimeout(id) };
    };

    const history = [
      { role: 'system', content: 'Você é um assistente curto, educado e útil para um portfólio pessoal.' }
    ];

    const typeIn = async (el, text, speed = 12) => {
      el.textContent = '';
      const s = String(text);
      for (let i = 0; i < s.length; i++) {
        el.textContent += s[i];
        if (!prefersReduced) await new Promise(r => setTimeout(r, speed));
      }
    };

    const fallback = (q) => {
      const t = q.toLowerCase();
      if (t.includes('olá') || t.includes('oi')) return 'Olá! Posso te guiar pela página — quer ver habilidades, certificados ou falar comigo pelo formulário?';
      if (t.includes('contato')) return 'Use a seção Contato. Assim que possível eu retorno!';
      if (t.includes('certificado')) return 'Meus certificados estão na seção “Certificados”, com links diretos.';
      if (t.includes('experi') || t.includes('trabalho')) return 'Atualmente atuo na Paschoalotto como Operador de Cobrança.';
      if (t.includes('ads')) return 'Curso ADS na UNIMAR desde agosto/2024.';
      if (t.includes('github')) return 'Dá uma olhada no meu GitHub — link nas redes.';
      return 'Anotei sua pergunta! Posso comentar formação, experiência, certificados e formas de contato.';
    };

    const ask = async (question) => {
      // chama seu backend seguro; nunca coloque chave no front
      const payload = { messages: [...history, { role: 'user', content: question }] };
      const { ctrl, done } = controllerTimeout(12000);
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal
        });
        done();
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const reply = (data && data.reply) ? String(data.reply) : fallback(question);
        history.push({ role: 'assistant', content: reply });
        return reply;
      } catch (e) {
        done();
        return fallback(question);
      }
    };

    // abrir/fechar
    const setOpen = (open) => {
      if (open) {
        chatBox.classList.add('active');
        robotBtn.setAttribute('aria-expanded', 'true');
        robotBtn.classList.add('smiling');
        try { sessionStorage.setItem(KEY, '1'); } catch {}
      } else {
        chatBox.classList.remove('active');
        robotBtn.setAttribute('aria-expanded', 'false');
        robotBtn.classList.remove('smiling');
        try { sessionStorage.setItem(KEY, '0'); } catch {}
      }
    };

    on(robotBtn, 'click', () => {
      const open = chatBox.classList.contains('active');
      setOpen(!open);
      if (!open) userInput.focus();
    });

    on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && chatBox.classList.contains('active')) setOpen(false);
    });

    // restaura estado
    try {
      if (sessionStorage.getItem(KEY) === '1') setOpen(true);
    } catch {}

    const doSend = async () => {
      const raw = (userInput.value || '').trim();
      if (!raw) return;
      const question = sanitize(raw);
      userInput.value = '';
      robotBtn.classList.add('smiling');
      await typeIn(robotMsg, 'Digitando...', 8);
      const reply = await ask(question);
      await typeIn(robotMsg, reply, 10);
      robotBtn.classList.remove('smiling');
    };

    on(sendBtn, 'click', (e) => { e.preventDefault(); doSend(); });
    on(userInput, 'keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doSend(); }
    });
  };

  /* =========================================================
     QoL e Acessibilidade extra
  ========================================================= */
  const initQoL = () => {
    // classe para diferenciar mouse/teclado (foco visível)
    let usingMouse = false;
    on(document, 'mousedown', () => { usingMouse = true; document.documentElement.classList.add('using-mouse'); });
    on(document, 'keydown', (e) => { if (e.key === 'Tab') { usingMouse = false; document.documentElement.classList.remove('using-mouse'); } });

    // imagens sem alt -> alt genérico; sem loading -> lazy
    $$('img').forEach((img) => {
      if (!img.getAttribute('alt')) img.setAttribute('alt', 'Imagem');
      if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
      // largura/altura ajudam a evitar layout shift
      if (!img.width || !img.height) {
        // não força width/height se já definido via CSS; apenas sugere
      }
    });
  };

  /* =========================================================
     Bootstrap (carrega tudo na ordem correta)
  ========================================================= */
  const boot = () => {
    try { initSmoothNav(); }      catch (e) { console.warn('smoothNav', e); }
    try { initBackToTop(); }      catch (e) { console.warn('backToTop', e); }
    try { initSectionReveal(); }  catch (e) { console.warn('sectionReveal', e); }
    try { initClock(); }          catch (e) { console.warn('clock', e); }
    try { initThemeSwitch(); }    catch (e) { console.warn('theme', e); }
    try { initForms(); }          catch (e) { console.warn('forms', e); }
    try { initRobot(); }          catch (e) { console.warn('robot', e); }
    try { initQoL(); }            catch (e) { console.warn('qol', e); }
  };

  if (document.readyState === 'loading') {
    on(document, 'DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
