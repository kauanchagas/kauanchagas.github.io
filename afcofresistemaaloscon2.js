
(() => {
  'use strict';
  if (window.CofreSistema) return;

  const CDN = 'https://cdn.jsdelivr.net/gh/kauanchagas/kauanchagas.github.io@master/';
  const ESTE = document.currentScript && document.currentScript.src;
  function comNucleo(fn) {
    if (window.CofreNucleo) { fn(window.CofreNucleo); return; }
    let s = document.querySelector('script[data-cofre-nucleo]');
    if (!s) {
      s = document.createElement('script');
      s.src = (ESTE ? ESTE.replace(/[^\/]*$/, '') : CDN) + 'afcofrenucleoaloscon.js';
      s.dataset.cofreNucleo = '1';
      document.head.appendChild(s);
    }
    s.addEventListener('load', () => { if (window.CofreNucleo) fn(window.CofreNucleo); });
  }
  const quandoPronto = fn => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn());
  window.CofreSistema = { carregando: true };
  quandoPronto(() => comNucleo(iniciar));

  function iniciar(N) {
    const {
      CFG, esc, normal, limparNick, chaveNick, juntarE, espera, interpretarPeriodo, partirPoliciais,
      motivoPorId, motivoDoTexto, cargoPorNome, partesSubgrupo, faixaPositiva, regraMedalhas, semPorcentagem,
      secoesContabil, grupoPorTopico, apiConfigurada, postarNoTopico, medirImagem, modeloPostagem, gerarBBCode, linkRccsystem
    } = N;

    // Chamada ao Apps Script. Em conflito, o erro traz o registro atual para o cartão se corrigir sozinho.
    async function api(acao, dados) {
      if (!apiConfigurada()) throw new Error('o sistema ainda não está ligado ao Apps Script');
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);
      let resp;
      try {
        resp = await fetch(CFG.API, { method: 'POST', body: JSON.stringify(Object.assign({ acao, token: CFG.TOKEN }, dados || {})), signal: ctrl.signal });
      } catch (e) {
        throw new Error(e.name === 'AbortError' ? 'o servidor demorou demais para responder' : 'falha de conexão com o servidor');
      } finally {
        clearTimeout(timer);
      }
      let j;
      try { j = await resp.json(); } catch (_) { throw new Error('o servidor devolveu uma resposta inválida'); }
      if (!j || !j.ok) {
        const e = new Error((j && j.erro) || 'o servidor recusou a operação');
        if (j && j.registro) e.registro = j.registro;
        throw e;
      }
      return j;
    }

    /* ==================================================================
       ONDE ESTAMOS
       ================================================================== */
    function topicoAtual() {
      let m = location.pathname.match(/^\/t(\d+)(?:p\d+)?-/);
      if (m) return +m[1];
      m = location.search.match(/[?&]t=(\d+)/);
      if (m) return +m[1];
      const a = document.querySelector('a[href*="mode=reply"][href*="t="]');
      if (a) { m = (a.getAttribute('href') || '').match(/[?&;]t=(\d+)/); if (m) return +m[1]; }
      const can = document.querySelector('link[rel="canonical"]');
      if (can) { m = (can.getAttribute('href') || '').match(/\/t(\d+)/); if (m) return +m[1]; }
      return 0;
    }
    // Número da página do tópico (vai para a coluna PÁGINA(S) da contabilidade).
    function paginaAtual(t) {
      const marcada = [...document.querySelectorAll('.pagination strong, .pagination .current, .pagination b')]
        .map(x => parseInt(x.textContent, 10)).filter(n => n > 0);
      if (marcada.length) return marcada[0];
      const off = (location.pathname.match(/^\/t\d+p(\d+)-/) || [])[1] || (location.search.match(/[?&]start=(\d+)/) || [])[1];
      const atual = off ? +off : 0;
      if (!atual) return 1;
      const offs = [atual];
      const re = new RegExp('/t' + t + 'p(\\d+)-');
      document.querySelectorAll('a[href]').forEach(a => { const m = (a.getAttribute('href') || '').match(re); if (m && +m[1]) offs.push(+m[1]); });
      const mdc = (a, b) => (b ? mdc(b, a % b) : a);
      return Math.round(atual / offs.reduce(mdc)) + 1;
    }
    function usuarioAtual() {
      const u = window._userdata;
      if (!u || String(u.session_logged_in) !== '1') return '';
      const nome = limparNick(u.username || '');
      return /^(anonymous|visitante|convidado)$/i.test(nome) ? '' : nome;
    }
    function postsDaPagina() {
      const out = [], vistos = new Set();
      document.querySelectorAll('[id^="p"]').forEach(el => {
        if (!/^p\d{3,}$/.test(el.id) || vistos.has(el.id)) return;
        if (!el.classList.contains('post') && !el.querySelector('.postbody')) return;
        const content = el.querySelector('.postbody .content') || el.querySelector('.content') || el.querySelector('.postbody');
        if (!content) return;
        vistos.add(el.id);
        out.push({ id: el.id.slice(1), el, content });
      });
      return out;
    }

    const TOPICO = topicoAtual();
    const ALVO = grupoPorTopico(TOPICO);
    window.CofreSistema = { ativo: false };
    if (!ALVO) return;
    const GRUPO = ALVO.grupo;
    const USUARIO = usuarioAtual();
    const PAGINA = paginaAtual(TOPICO);

    /* ==================================================================
       UTILITÁRIOS
       ================================================================== */
    const AMP = String.fromCharCode(38);
    const VAZIO = '-';
    const reduzido = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const sinal = n => (n > 0 ? '+' : '') + n;
    const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
    const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const dois = n => String(n).padStart(2, '0');
    function dataDecisao(v) {
      if (!v) return '';
      const d = /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v) : null;
      if (!d || isNaN(d)) return String(v);
      return `${dois(d.getDate())} ${MESES_CURTOS[d.getMonth()]}. ${d.getFullYear()} - ${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}`;
    }
    const linkPostagem = id => (document.getElementById('p' + id) ? '#p' + id : `/viewtopic?p=${id}#${id}`);
    const avatar = nick => CFG.AVATAR.replace('{nick}', encodeURIComponent(nick));
    // texto de um elemento juntando os pedaços com espaço (evita "Nick10 PONTOS" grudado)
    function textoDoElemento(el) {
      const partes = [];
      (function coletar(n) {
        if (n.nodeType === 3) { partes.push(n.nodeValue); return; }
        if (n.nodeType !== 1 || /^(script|style)$/i.test(n.nodeName)) return;
        for (let c = n.firstChild; c; c = c.nextSibling) coletar(c);
        if (/^(td|th|div|p|li|br|tr|table)$/i.test(n.nodeName)) partes.push(' ');
      })(el);
      return partes.join(' ');
    }
    // minúsculas e sem acento, mantendo o tamanho (as posições batem com o texto original)
    const semAcentoChar = ch => ch.normalize('NFD').charAt(0);
    const minusculo = s => Array.from(String(s || '')).map(ch => semAcentoChar(ch.toLowerCase())).join('');

    /* ---------- leitura da matriz de POLICIAIS CANCELADOS ---------- */
    function lerAjustes(texto) {
      const out = [];
      String(texto || '').split(/\r?\n/).forEach(linha => {
        const t = linha.trim();
        if (!t || t.charAt(0) === '[') return;
        const m = t.match(/^(.+?) - (cancelado|corrigido para (.+?)) - (.*)$/);
        if (!m) return;
        if (m[2] === 'cancelado') { out.push({ nick: m[1], tipo: 'cancelado', motivo: m[4] }); return; }
        let novoNick = '', medalhas = null, r;
        if ((r = m[3].match(/^(-?\d+) medalhas$/))) medalhas = +r[1];
        else if ((r = m[3].match(/^(.+?) com (-?\d+) medalhas$/))) { novoNick = r[1]; medalhas = +r[2]; }
        else novoNick = m[3];
        out.push({ nick: m[1], tipo: 'corrigido', novoNick, medalhas, motivo: m[4] });
      });
      return out;
    }
    function aprovacaoAnterior(texto) {
      const l = String(texto || '').split(/\r?\n/).reverse().find(x => x.indexOf('[Aprovação anterior] ') === 0);
      if (!l) return null;
      const p = l.slice(21).split(' · ');
      return { quando: p[0] || '', auditor: p[1] || '' };
    }
    // Quem recebe e quanto, depois dos ajustes gravados.
    function lancamentos(reg) {
      const aj = lerAjustes(reg.cancelados);
      const out = [];
      partirPoliciais(reg.policiais).forEach(n => {
        const a = aj.find(x => chaveNick(x.nick) === chaveNick(n));
        if (a && a.tipo === 'cancelado') return;
        out.push({ nick: a && a.novoNick ? a.novoNick : n, valor: a && a.medalhas != null ? a.medalhas : reg.numero, original: n });
      });
      return out;
    }
    function gruposPorValor(lista) {
      const mapa = new Map();
      lista.forEach(x => { if (!mapa.has(x.valor)) mapa.set(x.valor, []); mapa.get(x.valor).push(x.nick); });
      return [...mapa.entries()].map(([valor, nicks]) => ({ valor, nicks }));
    }

    /* ---------- o que a postagem mostra (para conferir com a planilha) ---------- */
    function lerPostagem(content) {
      const rotulos = {
        responsavel: 'responsavel', 'grupo de tarefas': 'grupo', 'cargo referente': 'cargo', 'subgrupo referente': 'cargo',
        'periodo de referencia': 'periodo', 'numero de medalhas': 'numero', motivo: 'motivo'
      };
      const out = {};
      content.querySelectorAll('td').forEach(td => {
        if (td.querySelector('td')) return;
        const t = normal(td.textContent);
        const abaixo = () => {
          const tr = td.parentElement && td.parentElement.nextElementSibling;
          const v = tr && tr.querySelector('td');
          return v ? v.textContent.replace(/\s+/g, ' ').trim() : '';
        };
        if (rotulos[t] && out[rotulos[t]] == null) out[rotulos[t]] = abaixo();
        else if (/^policiais(\s|$)/.test(t) && !out.policiais) {
          let tab = td.closest('table');
          let prox = tab && tab.nextElementSibling;
          while (prox && prox.tagName !== 'TABLE') prox = prox.nextElementSibling;
          out.policiais = prox ? [...prox.querySelectorAll('td')].filter(x => !x.querySelector('td')).map(x => limparNick(x.textContent)).filter(Boolean) : [];
        }
      });
      if (out.numero != null) {
        const m = String(out.numero).replace(/\s+/g, '').match(/^([+-]?)(\d+)/);
        out.numero = m ? Number(m[1] + m[2]) : null;
      }
      return out;
    }
    function divergencias(reg, post) {
      const d = [];
      if (!post || !post.policiais) return d;
      const a = partirPoliciais(reg.policiais).map(chaveNick), b = post.policiais.map(chaveNick);
      const falta = partirPoliciais(reg.policiais).filter(n => !b.includes(chaveNick(n)));
      const sobra = post.policiais.filter(n => !a.includes(chaveNick(n)));
      if (falta.length || sobra.length) {
        d.push('Policiais diferentes da planilha' + (sobra.length ? `: a postagem tem ${juntarE(sobra)} a mais` : '') +
          (falta.length ? `${sobra.length ? ' e' : ':'} não mostra ${juntarE(falta)}` : '') + '.');
      }
      if (post.periodo && normal(post.periodo) !== normal(reg.periodo)) d.push(`Período na postagem: ${post.periodo}. Na planilha: ${reg.periodo}.`);
      if (post.numero != null && post.numero !== Number(reg.numero)) d.push(`Medalhas na postagem: ${sinal(post.numero)}. Na planilha: ${sinal(reg.numero)}.`);
      const cargoReg = String(reg.cargo || '').replace(/\s*\([^)]*\)\s*$/, '');
      if (post.cargo && normal(post.cargo) !== normal(cargoReg)) d.push(`Cargo na postagem: ${post.cargo}. Na planilha: ${cargoReg}.`);
      return d;
    }

    /* ==================================================================
       ÍCONES (Lucide, ISC)
       ================================================================== */
    const svg = (miolo, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${miolo}</svg>`;
    const ICONE = {
      usuario: svg('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
      mensagem: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
      calendario: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
      relogio: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
      ok: svg('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
      nao: svg('<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>'),
      proibido: svg('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>'),
      lupa: svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
      externo: svg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
      check: svg('<path d="M20 6 9 17l-5-5"/>'),
      x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
      lapis: svg('<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
      alerta: svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>'),
      info: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
      desfazer: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
      girar: svg('<path d="M21 12a9 9 0 1 1-6.219-8.56"/>', ' class="gira"'),
      elo: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
      seta: svg('<path d="m6 9 6 6 6-6"/>'),
      escudo: svg('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
      tabela: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>'),
      enviar: svg('<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>'),
      usuarios: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>')
    };

    /* ==================================================================
       ESTILO
       ================================================================== */
    function temaDaPagina(el) {
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        const m = c && c.match(/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+))?/);
        if (!m || (m[4] !== undefined && +m[4] < 0.5)) continue;
        const lum = (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255;
        return lum < 0.45 ? 'escuro' : 'claro';
      }
      return 'claro';
    }
    function carregarFontes() {
      if ([...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some(l => /Poppins/.test(l.href) && /Barlow\+Condensed/.test(l.href))) return;
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700' + AMP + 'family=Poppins:wght@400;500;600;700;800' + AMP + 'display=swap';
      document.head.appendChild(l);
    }

    const CSS_BASE = `
:host{all:initial;display:block}
*,*::before,*::after{box-sizing:border-box}
svg{width:18px;height:18px;flex:none;display:block}
.gira{animation:gira .9s linear infinite}
@keyframes gira{to{transform:rotate(360deg)}}
@keyframes surge{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation-duration:1ms!important;animation-iteration-count:1!important;transition:none!important}}
button{font:inherit}
.btn{appearance:none;border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 18px;border-radius:10px;
  font-weight:600;font-size:14px;line-height:1;color:#fff;text-decoration:none;white-space:nowrap;transition:transform .15s ease,box-shadow .15s ease,filter .15s ease,opacity .15s}
.btn svg{width:16px;height:16px}
.btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.06);box-shadow:0 8px 18px -10px rgba(0,0,0,.55)}
.btn:active:not(:disabled){transform:translateY(0)}
:focus-visible{outline:3px solid rgba(101,176,38,.55);outline-offset:2px}
:focus:not(:focus-visible){outline:none}
a:not(.btn){color:var(--verde-forte);font-weight:600;text-decoration:none;border-radius:3px}
a:not(.btn):hover{text-decoration:underline;text-underline-offset:2px}
.ver{appearance:none;border:0;background:none;padding:0;margin:0;cursor:pointer;color:var(--verde-forte);font-weight:600;font-size:13px;line-height:inherit;
  display:inline-flex;align-items:center;gap:4px;border-radius:4px;vertical-align:baseline}
.ver:hover{text-decoration:underline;text-underline-offset:2px}
.ver svg{width:16px;height:16px;transition:transform .2s}
.ver[aria-expanded="true"] svg{transform:rotate(180deg)}
.btn:disabled{cursor:not-allowed;opacity:.5}
.btn-aprovar{background:linear-gradient(180deg,#22a55a,#15803d)}
.btn-negar{background:linear-gradient(180deg,#e5484d,#c22a2f)}
.btn-cancelar{background:linear-gradient(180deg,#52606d,#334155)}
.btn-rcc{background:linear-gradient(180deg,#4f6bed,#3a50c9)}
.btn-fisc{background:transparent;color:var(--verde-forte);box-shadow:inset 0 0 0 1.5px var(--verde-borda)}
.btn-fisc:hover:not(:disabled){box-shadow:inset 0 0 0 1.5px var(--verde-forte),0 8px 18px -12px rgba(0,0,0,.4)}
.btn-sec{background:var(--sec-fundo);color:var(--forte);box-shadow:inset 0 0 0 1px var(--linha)}
.badge{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:999px;font-weight:600;font-size:13px;white-space:nowrap}
.badge svg{width:15px;height:15px}
.badge[data-s="pendente"]{background:var(--b-pend-f);color:var(--b-pend-t)}
.badge[data-s="aprovado"]{background:var(--b-apr-f);color:var(--b-apr-t)}
.badge[data-s="negado"]{background:var(--b-neg-f);color:var(--b-neg-t)}
.badge[data-s="cancelado"],.badge[data-s="outro"]{background:var(--b-can-f);color:var(--b-can-t)}
.chip{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:4px 6px 4px 4px;border-radius:999px;background:var(--chip-f);box-shadow:inset 0 0 0 1px var(--linha);
  font-size:13px;font-weight:500;color:var(--forte);max-width:100%}
.chip img{width:28px;height:28px;border-radius:50%;object-fit:cover;object-position:center 12%;background:var(--sec-fundo);flex:none}
.chip .nick{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pill{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.pill svg{width:13px;height:13px}
.pill-ok{background:var(--p-ok-f);color:var(--p-ok-t)}
.pill-can{background:var(--p-can-f);color:var(--p-can-t)}
.pill-cor{background:var(--p-cor-f);color:var(--p-cor-t)}
`;
    const VARS_CLARO = `--fundo:#fff;--borda:#22a447;--texto:#334155;--forte:#0f172a;--suave:#64748b;--icone:#64748b;--linha:#e2e8f0;--sec-fundo:#f1f5f9;
  --verde-forte:#15803d;--verde-borda:rgba(21,128,61,.45);--chip-f:#f8fafc;
  --b-pend-f:#fef3c7;--b-pend-t:#92400e;--b-apr-f:#dcfce7;--b-apr-t:#166534;--b-neg-f:#fee2e2;--b-neg-t:#991b1b;--b-can-f:#e2e8f0;--b-can-t:#334155;
  --p-ok-f:#dcfce7;--p-ok-t:#166534;--p-can-f:#fee2e2;--p-can-t:#b91c1c;--p-cor-f:#fef3c7;--p-cor-t:#92400e;
  --ok:#16a34a;--aviso:#d97706;--erro:#dc2626;--azul:#2563eb;--painel:#f8fafc`;
    const VARS_ESCURO = `--fundo:#0f1912;--borda:#2f8f46;--texto:#c9d8cc;--forte:#f0f7f1;--suave:#93a897;--icone:#86a08b;--linha:rgba(255,255,255,.09);--sec-fundo:rgba(255,255,255,.06);
  --verde-forte:#7fd38f;--verde-borda:rgba(127,211,143,.4);--chip-f:rgba(255,255,255,.04);
  --b-pend-f:rgba(251,191,36,.16);--b-pend-t:#fcd34d;--b-apr-f:rgba(74,222,128,.15);--b-apr-t:#86efac;--b-neg-f:rgba(248,113,113,.16);--b-neg-t:#fca5a5;--b-can-f:rgba(148,163,184,.18);--b-can-t:#cbd5e1;
  --p-ok-f:rgba(74,222,128,.15);--p-ok-t:#86efac;--p-can-f:rgba(248,113,113,.16);--p-can-t:#fca5a5;--p-cor-f:rgba(251,191,36,.16);--p-cor-t:#fcd34d;
  --ok:#4ade80;--aviso:#fbbf24;--erro:#f87171;--azul:#93c5fd;--painel:rgba(255,255,255,.035)`;

    const CSS_CARTAO = CSS_BASE + `
.cartao{${VARS_CLARO};position:relative;overflow:hidden;margin:18px 0 8px;padding:20px 24px;border:1px solid var(--borda);border-radius:16px;background:var(--fundo);
  color:var(--texto);font-family:Poppins,'Segoe UI',system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.45;text-align:left;
  box-shadow:0 1px 2px rgba(15,23,42,.04);animation:surge .35s ease both}
.cartao[data-tema="escuro"]{${VARS_ESCURO};box-shadow:0 18px 30px -24px rgba(0,0,0,.8)}
.cabeca{position:relative}
.brasao{position:absolute;right:2px;top:min(50%,100px);width:150px;height:150px;transform:translateY(-50%);object-fit:contain;opacity:.95;pointer-events:none;
  filter:drop-shadow(0 10px 18px rgba(21,128,61,.25))}
.brasao-aura{position:absolute;right:-84px;top:min(50%,100px);width:320px;height:320px;transform:translateY(-50%);border-radius:50%;pointer-events:none;
  background:radial-gradient(closest-side,rgba(34,164,71,.16),rgba(34,164,71,0))}
.miolo{position:relative;z-index:1;display:grid;gap:11px;padding-right:190px}
.linha{display:flex;align-items:center;gap:10px;min-width:0;flex-wrap:wrap}
.linha > svg{color:var(--icone)}
.rot{font-weight:600;color:var(--forte)}
.val{color:var(--suave);min-width:0;overflow-wrap:anywhere}
.nota{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--suave)}
.nota svg{width:16px;height:16px;margin-top:2px;color:var(--icone)}
.acoes{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
.ajustes{display:flex;flex-wrap:wrap;gap:8px}
.grade{display:flex;flex-wrap:wrap;gap:8px;padding-top:2px}
.fisc{position:relative;z-index:1;margin-top:16px;padding:14px 16px;border-radius:12px;background:var(--painel);box-shadow:inset 0 0 0 1px var(--linha);display:grid;gap:10px;animation:surge .3s ease both}
.cartao[data-tema="escuro"] .fisc{background:#162019}
.fisc-topo{display:flex;align-items:center;gap:8px;font-weight:700;color:var(--forte);font-size:13px;letter-spacing:.08em;text-transform:uppercase}
.fisc-topo small{font-weight:500;letter-spacing:0;text-transform:none;color:var(--suave)}
.fisc-topo .refazer{margin-left:auto}
.item{display:grid;grid-template-columns:20px 1fr;gap:10px;align-items:start}
.item > svg{margin-top:1px}
.item[data-t="ok"] > svg{color:var(--ok)}
.item[data-t="aviso"] > svg{color:var(--aviso)}
.item[data-t="erro"] > svg{color:var(--erro)}
.item[data-t="info"] > svg{color:var(--azul)}
.item b{color:var(--forte);font-weight:600}
.item p{margin:2px 0 0;color:var(--suave);font-size:13px}
.item ul{margin:4px 0 0;padding-left:18px;color:var(--suave);font-size:13px}
.carregando{display:flex;align-items:center;gap:10px;color:var(--suave);font-size:13px}
@media (max-width:640px){
  .cartao{padding:18px}
  .brasao{width:110px;height:110px;right:-36px;top:0;transform:none;opacity:.16}
  .brasao-aura{display:none}
  .miolo{padding-right:0}
  .acoes .btn{flex:1 1 140px}
}`;

    const CSS_MODAL = CSS_BASE + `
.fundo{${VARS_ESCURO};position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:20px;
  background:rgba(4,10,6,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:Poppins,'Segoe UI',system-ui,sans-serif;
  color:var(--texto);font-size:14px;line-height:1.5;animation:surge .2s ease both}
.fundo[data-tema="claro"]{${VARS_CLARO};background:rgba(15,23,42,.45)}
.caixa{position:relative;width:100%;max-width:680px;max-height:calc(100vh - 40px);display:flex;flex-direction:column;border-radius:20px;background:var(--fundo);
  box-shadow:0 30px 80px -20px rgba(0,0,0,.7),inset 0 0 0 1px var(--linha);overflow:hidden;animation:surge .25s ease both;outline:none}
.caixa:focus,.caixa:focus-visible{outline:none}
.fundo[data-tema="escuro"] .caixa{background:linear-gradient(180deg,#132217,#0d1610 60%);box-shadow:0 30px 80px -20px rgba(0,0,0,.8),inset 0 0 0 1px rgba(101,176,38,.22)}
.topo{display:flex;gap:16px;align-items:center;padding:22px 64px 16px 26px;border-bottom:1px solid var(--linha)}
.topo img{width:54px;height:54px;object-fit:contain;flex:none}
.kicker{margin:0;font-size:11px;font-weight:700;letter-spacing:.18em;color:var(--verde-forte)}
.titulo{margin:2px 0 0;font-family:'Barlow Condensed',Poppins,sans-serif;font-size:28px;font-weight:700;line-height:1.05;text-transform:uppercase;letter-spacing:.02em;color:var(--forte)}
.sub{margin:4px 0 0;font-size:13px;color:var(--suave)}
.fechar{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;border:0;cursor:pointer;display:grid;place-items:center;background:var(--sec-fundo);color:var(--forte);transition:transform .2s,background .2s}
.fechar:hover{transform:rotate(90deg)}
.fechar svg{width:18px;height:18px}
.corpo{padding:18px 26px;overflow:auto;display:grid;gap:16px}
.rodape{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;padding:16px 26px 22px;border-top:1px solid var(--linha)}
.rodape .dica{margin-right:auto;align-self:center;font-size:12.5px;color:var(--suave)}
.secao{font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--suave);text-transform:uppercase;margin:0 0 8px}
.grade{display:flex;flex-wrap:wrap;gap:8px}
.chip{cursor:pointer;border:0;font:inherit;transition:box-shadow .15s,transform .15s}
.chip:hover{transform:translateY(-1px)}
.chip[aria-pressed="true"]{box-shadow:inset 0 0 0 2px var(--verde-forte)}
.chip[data-e="cancelado"] .nick{text-decoration:line-through;opacity:.7}
/* policial destacado pela fiscalização: contorno e fundo na cor do problema */
.chip[data-flag],.leg{--fc:245,158,11}
.chip[data-flag="rcc"],.leg[data-flag="rcc"]{--fc:239,68,68}
.chip[data-flag="porc"],.leg[data-flag="porc"]{--fc:59,130,246}
.chip[data-flag]{background:rgba(var(--fc),.14);box-shadow:inset 0 0 0 2px rgba(var(--fc),.9)}
.fundo[data-tema="escuro"] .chip[data-flag]{background:rgba(var(--fc),.22)}
.chip[data-flag][aria-pressed="true"]{box-shadow:inset 0 0 0 2px rgb(var(--fc)),0 0 0 3px rgba(var(--fc),.35)}
.chip .marca{display:grid;place-items:center;flex:none;margin-left:-2px;color:rgb(var(--fc))}
.chip .marca svg{width:15px;height:15px}
.legenda{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.leg{display:inline-flex;align-items:center;height:22px;padding:0 10px;border-radius:999px;font-size:11.5px;font-weight:600;color:var(--forte);
  background:rgba(var(--fc),.14);box-shadow:inset 0 0 0 1.5px rgba(var(--fc),.9)}
.sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.editor{padding:16px;border-radius:14px;background:var(--painel);box-shadow:inset 0 0 0 1px var(--linha);display:grid;gap:12px;animation:surge .2s ease both}
.editor-topo{display:flex;align-items:center;gap:10px}
.editor-topo img{width:36px;height:36px;border-radius:50%;object-fit:cover;object-position:center 12%;background:var(--sec-fundo)}
.editor-topo b{color:var(--forte);font-size:15px}
.seg{display:inline-flex;padding:4px;border-radius:12px;background:var(--sec-fundo);gap:4px;flex-wrap:wrap}
.seg button{border:0;cursor:pointer;height:34px;padding:0 14px;border-radius:9px;background:transparent;color:var(--suave);font-weight:600;font-size:13px;display:inline-flex;align-items:center;gap:6px}
.seg button svg{width:15px;height:15px}
.seg button[aria-pressed="true"]{background:var(--fundo);color:var(--forte);box-shadow:0 1px 3px rgba(0,0,0,.25)}
.campos{display:grid;grid-template-columns:1fr 1fr;gap:10px}
label.campo{display:grid;gap:6px;font-size:12px;font-weight:600;color:var(--suave)}
.campo input,.campo textarea{width:100%;border:0;border-radius:10px;padding:10px 12px;font:inherit;font-size:14px;color:var(--forte);background:var(--fundo);
  box-shadow:inset 0 0 0 1px var(--linha);outline:none;transition:box-shadow .15s}
.fundo[data-tema="escuro"] .campo input,.fundo[data-tema="escuro"] .campo textarea{background:rgba(0,0,0,.25)}
.campo input:focus,.campo textarea:focus{box-shadow:inset 0 0 0 2px var(--verde-forte)}
.campo textarea{min-height:96px;resize:vertical}
.campo .ajuda{font-weight:500;font-size:12px}
.campo[data-erro="1"] input,.campo[data-erro="1"] textarea{box-shadow:inset 0 0 0 2px var(--erro)}
.sugestoes{display:flex;flex-wrap:wrap;gap:6px}
.sugestoes button{border:0;cursor:pointer;padding:6px 12px;border-radius:999px;font-size:12.5px;font-weight:500;background:var(--sec-fundo);color:var(--texto)}
.sugestoes button:hover:not(:disabled){color:var(--forte);box-shadow:inset 0 0 0 1px var(--verde-borda)}
.sugestoes button:disabled{opacity:.5;cursor:default}
.campo textarea[readonly],.campo input[readonly]{opacity:.7}
.caixa-info{display:grid;grid-template-columns:20px 1fr;gap:10px;padding:12px 14px;border-radius:12px;font-size:13px;background:var(--painel);box-shadow:inset 0 0 0 1px var(--linha)}
.caixa-info b{color:var(--forte)}
.caixa-info[data-t="aviso"]{box-shadow:inset 0 0 0 1px rgba(245,158,11,.4)}
.caixa-info[data-t="aviso"] > svg{color:var(--aviso)}
.caixa-info[data-t="erro"]{box-shadow:inset 0 0 0 1px rgba(239,68,68,.45)}
.caixa-info[data-t="erro"] > svg{color:var(--erro)}
.caixa-info[data-t="ok"] > svg{color:var(--ok)}
.caixa-info[data-t="info"] > svg{color:var(--azul)}
.caixa-info ul{margin:4px 0 0;padding-left:18px}
.caixa-info p{margin:2px 0 0}
.marcar{display:flex;gap:8px;align-items:flex-start;margin-top:8px;font-size:13px;color:var(--forte);cursor:pointer}
.marcar input{margin:2px 0 0;width:16px;height:16px;accent-color:#16a34a}
.resumo{display:flex;flex-wrap:wrap;gap:8px;font-size:13px}
.resumo span{padding:4px 10px;border-radius:8px;background:var(--sec-fundo);color:var(--texto)}
.resumo b{color:var(--forte)}
.links{display:grid;gap:10px}
.link-rcc{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:var(--painel);box-shadow:inset 0 0 0 1px var(--linha)}
.link-rcc div{min-width:0;flex:1}
.link-rcc b{color:var(--forte)}
.link-rcc p{margin:2px 0 0;font-size:12.5px;color:var(--suave);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.passos{display:grid;gap:8px;font-size:13.5px}
.passo{display:flex;gap:10px;align-items:center;color:var(--suave)}
.passo[data-e="ok"]{color:var(--forte)}
.passo[data-e="ok"] svg{color:var(--ok)}
.passo[data-e="erro"] svg{color:var(--erro)}
.passo[data-e="atual"]{color:var(--forte)}
.toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483646;padding:10px 16px;border-radius:12px;background:#0f1912;color:#e9f5ec;
  box-shadow:0 12px 30px -12px rgba(0,0,0,.6),inset 0 0 0 1px rgba(101,176,38,.3);font:500 13.5px Poppins,system-ui,sans-serif;animation:surge .25s ease both;max-width:calc(100vw - 32px)}
.toast[data-t="erro"]{box-shadow:0 12px 30px -12px rgba(0,0,0,.6),inset 0 0 0 1px rgba(239,68,68,.5)}
@media (max-width:640px){
  .fundo{padding:0;align-items:flex-end}
  .caixa{max-height:94vh;border-radius:20px 20px 0 0}
  .topo,.corpo,.rodape{padding-left:18px;padding-right:18px}
  .topo{padding-right:58px}
  .campos{grid-template-columns:1fr}
  .rodape .btn{flex:1 1 140px}
  .rodape .dica{flex-basis:100%}
}`;

    /* ==================================================================
       ESTADO
       ================================================================== */
    const ESTADO = {
      posts: new Map(),          // id -> { id, el, content, registro, ui, fisc, aberto }
      relacionados: {},          // registros ligados por cancelamento
      permissao: { af: false },
      tema: 'claro'
    };
    const ehAF = () => !!(ESTADO.permissao && ESTADO.permissao.af);
    const registroDe = id => (ESTADO.posts.get(id) || {}).registro || ESTADO.relacionados[id] || null;
    const interno = reg => !!motivoDoTexto(reg.motivo).interno;
    // Correção gerada por um cancelamento: aponta para um original que está Cancelado.
    function originalDaCorrecao(reg) {
      if (!reg || !reg.referencia || motivoDoTexto(reg.motivo).id !== 'correcao') return null;
      const ids = String(reg.referencia).split(/[^\d]+/).filter(Boolean);
      for (const id of ids) {
        const o = registroDe(id);
        if (o && o.status === 'cancelado' && String(o.referencia || '').split(/[^\d]+/).includes(reg.id)) return o;
      }
      return ids.length ? { id: ids[0], desconhecido: true } : null;
    }
    function cargoDoRegistro(reg) {
      const m = motivoDoTexto(reg.motivo);
      if (m.interno) return null;
      return cargoPorNome(GRUPO, reg.cargo) || (m.cargo ? cargoPorNome(GRUPO, m.cargo) : null);
    }

    /* ==================================================================
       CARTÃO DE STATUS
       ================================================================== */
    const ROTULO_STATUS = { pendente: 'Pendente', aprovado: 'Aprovado', negado: 'Negado', cancelado: 'Cancelado' };
    const ICONE_STATUS = { pendente: ICONE.relogio, aprovado: ICONE.ok, negado: ICONE.nao, cancelado: ICONE.proibido, outro: ICONE.info };
    const badge = reg => `<span class="badge" data-s="${esc(reg.status)}">${ICONE_STATUS[reg.status] || ICONE.info}${esc(ROTULO_STATUS[reg.status] || reg.statusTexto || 'Status')}</span>`;

    function montarCartao(p) {
      const host = document.createElement('div');
      host.className = 'af-cofre-sistema';
      host.dataset.id = p.id;
      host.style.cssText = 'display:block;clear:both;margin:0;padding:0;border:0;background:none;max-width:100%';
      p.content.insertAdjacentElement('afterend', host);
      const raiz = host.attachShadow({ mode: 'open' });
      raiz.innerHTML = `<style>${CSS_CARTAO}</style><section class="cartao" aria-label="Status da postagem no cofre"></section>`;
      const cartao = raiz.querySelector('.cartao');
      cartao.addEventListener('click', e => acaoDoCartao(p.id, e));
      return { host, raiz, cartao };
    }

    function chipPolicial(nick, estado, extra = '') {
      const pill = estado === 'cancelado' ? `<span class="pill pill-can">${ICONE.x}Cancelado</span>`
        : estado === 'corrigido' ? `<span class="pill pill-cor">${ICONE.lapis}Corrigido</span>`
          : `<span class="pill pill-ok">${ICONE.check}Aprovado</span>`;
      return `<span class="chip"${extra}><img src="${esc(avatar(nick))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"><span class="nick">${esc(nick)}</span>${pill}</span>`;
    }

    function renderCartao(id) {
      const st = ESTADO.posts.get(id);
      if (!st || !st.registro) return;
      const reg = st.registro, c = st.ui.cartao;
      c.dataset.tema = ESTADO.tema;
      c.dataset.status = reg.status;
      const decidido = reg.status !== 'pendente';
      const linhas = [];
      linhas.push(`<div class="linha"><span class="rot">Status:</span> ${badge(reg)}</div>`);
      linhas.push(`<div class="linha">${ICONE.usuario}<span class="rot">Usuário responsável:</span> <span class="val">${decidido && reg.auditor ? esc(reg.auditor) : VAZIO}</span></div>`);
      linhas.push(`<div class="linha">${ICONE.mensagem}<span class="rot">Motivo:</span> <span class="val">${decidido && reg.decisao ? esc(reg.decisao) : VAZIO}</span></div>`);
      linhas.push(`<div class="linha">${ICONE.calendario}<span class="rot">Data da decisão:</span> <span class="val">${decidido && reg.atualizacao ? esc(dataDecisao(reg.atualizacao)) : VAZIO}</span></div>`);

      // ajustes feitos na aprovação
      const ajustes = reg.status === 'aprovado' || reg.status === 'cancelado' ? lerAjustes(reg.cancelados) : [];
      if (ajustes.length && reg.status === 'aprovado') {
        const todos = partirPoliciais(reg.policiais);
        const aprovados = todos.length - ajustes.filter(a => a.tipo === 'cancelado').length;
        const resumo = [plural(aprovados, 'aprovado', 'aprovados')];
        const nCan = ajustes.filter(a => a.tipo === 'cancelado').length, nCor = ajustes.filter(a => a.tipo === 'corrigido').length;
        if (nCan) resumo.push(plural(nCan, 'cancelado', 'cancelados'));
        if (nCor) resumo.push(plural(nCor, 'corrigido', 'corrigidos'));
        linhas.push(`<div class="linha">${ICONE.usuarios}<span class="rot">Policiais:</span> <span class="val">${esc(resumo.join(' · '))}</span>
          <button type="button" class="ver" data-acao="ver" aria-expanded="${st.aberto ? 'true' : 'false'}">${st.aberto ? 'ocultar' : 'ver detalhes'}${ICONE.seta}</button></div>`);
        if (st.aberto) {
          const chips = todos.map(n => {
            const a = ajustes.find(x => chaveNick(x.nick) === chaveNick(n));
            const titulo = a ? (a.tipo === 'cancelado' ? `Cancelado: ${a.motivo}` : `Corrigido${a.novoNick ? ' para ' + a.novoNick : ''}${a.medalhas != null ? ' com ' + sinal(a.medalhas) + ' medalhas' : ''}: ${a.motivo}`) : 'Aprovado';
            return chipPolicial(a && a.novoNick ? a.novoNick : n, a ? a.tipo : 'aprovado', ` title="${esc(titulo)}"`);
          }).join('');
          linhas.push(`<div class="grade">${chips}</div>`);
        }
      }

      // cancelamento: postagem original e correção
      if (reg.status === 'cancelado' && reg.referencia) {
        const ids = String(reg.referencia).split(/[^\d]+/).filter(Boolean);
        const partes = ids.map(x => {
          const r = registroDe(x);
          const situacao = r ? (r.status === 'pendente' ? 'aguardando a Auditoria' : r.status === 'aprovado' ? 'aprovada' : r.status === 'negado' ? 'negada' : r.statusTexto) : 'no fim do tópico';
          return `<a href="${esc(linkPostagem(x))}">correção ${esc(x)}</a> (${esc(situacao)})`;
        });
        const ant = aprovacaoAnterior(reg.cancelados);
        linhas.push(`<div class="nota">${ICONE.elo}<span>Medalhas canceladas: ${partes.join(', ')}.${ant ? ` Aprovação anterior por ${esc(ant.auditor)} em ${esc(ant.quando)}.` : ''}</span></div>`);
      }
      const original = originalDaCorrecao(reg);
      if (original) {
        linhas.push(`<div class="nota">${ICONE.elo}<span>Correção do cancelamento da <a href="${esc(linkPostagem(original.id))}">postagem ${esc(original.id)}</a>.${reg.status === 'pendente' ? ' Se for negada, a postagem original volta a ficar aprovada.' : ''}</span></div>`);
      }

      // botões
      if (ehAF() && USUARIO) {
        const b = [];
        if (reg.status === 'pendente') {
          b.push(`<button type="button" class="btn btn-aprovar" data-acao="aprovar">${ICONE.check}Aprovar</button>`);
          b.push(`<button type="button" class="btn btn-negar" data-acao="negar">${ICONE.x}Negar</button>`);
          if (!original) b.push(`<button type="button" class="btn btn-fisc" data-acao="fiscalizar">${st.fisc && st.fisc.estado === 'carregando' ? ICONE.girar : ICONE.lupa}${st.fisc && st.fisc.estado === 'pronto' ? 'Fiscalizado' : 'Fiscalizar'}</button>`);
        } else if (reg.status === 'aprovado') {
          b.push(`<button type="button" class="btn btn-cancelar" data-acao="cancelar">${ICONE.proibido}Cancelar</button>`);
          b.push(`<button type="button" class="btn btn-rcc" data-acao="rcc">${ICONE.externo}Postar no RCCSystem</button>`);
        }
        if (b.length) linhas.push(`<div class="acoes">${b.join('')}</div>`);
      } else if (USUARIO && ESTADO.permissao && ESTADO.permissao.erro) {
        linhas.push(`<div class="nota">${ICONE.info}<span>Botões da Auditoria indisponíveis agora: ${esc(ESTADO.permissao.erro)}.</span></div>`);
      }
      const painel = st.fisc && reg.status === 'pendente' && ehAF() ? htmlFiscalizacao(st) : '';

      c.innerHTML = `<div class="cabeca"><div class="brasao-aura"></div><img class="brasao" src="${esc(CFG.BRASAO_AF)}" alt="" aria-hidden="true"><div class="miolo">${linhas.join('\n')}</div></div>${painel}`;
    }

    function acaoDoCartao(id, e) {
      const b = e.target.closest('[data-acao]');
      if (!b) return;
      const acao = b.dataset.acao;
      if (acao === 'ver') { const st = ESTADO.posts.get(id); st.aberto = !st.aberto; renderCartao(id); return; }
      if (acao === 'aprovar') abrirAprovacao(id);
      else if (acao === 'negar') abrirNegacao(id);
      else if (acao === 'fiscalizar' || acao === 'refazer') fiscalizar(id, true);
      else if (acao === 'cancelar') abrirCancelamento(id);
      else if (acao === 'rcc') abrirRcc(id);
    }

    /* ==================================================================
       FISCALIZAÇÃO
       ================================================================== */
    const MESES_TODOS = {
      jan: 0, janeiro: 0, fev: 1, fevereiro: 1, feb: 1, mar: 2, marco: 2, abr: 3, abril: 3, apr: 3, mai: 4, maio: 4, may: 4, jun: 5, junho: 5,
      jul: 6, julho: 6, ago: 7, agosto: 7, aug: 7, set: 8, setembro: 8, sep: 8, sept: 8, out: 9, outubro: 9, oct: 9, nov: 10, novembro: 10,
      dez: 11, dezembro: 11, dec: 11
    };
    // Todas as datas de um texto: "28/06/2026", "28 Jun 2026", "28 de junho de 2026", "11 out. 2026", "1 Out.2026", "11 Out" (ano do vizinho).
    function extrairDatas(texto) {
      const t = minusculo(texto);
      const achados = [];
      let m;
      const rxNum = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/g;
      while ((m = rxNum.exec(t))) {
        const d = +m[1], mes = +m[2], y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
        if (d >= 1 && d <= 31 && mes >= 1 && mes <= 12) achados.push({ i: m.index, d, m: mes - 1, y });
      }
      // "01/10 a 15/10": dia e mês sem ano (o ano vem da data vizinha ou do ano atual)
      const rxCurta = /(^|[^\d\/.])(\d{1,2})\/(\d{1,2})(?![\d\/])/g;
      while ((m = rxCurta.exec(t))) {
        const d = +m[2], mes = +m[3];
        if (d >= 1 && d <= 31 && mes >= 1 && mes <= 12) achados.push({ i: m.index + m[1].length, d, m: mes - 1, y: null });
      }
      const rxExt = /(\d{1,2})\s*(?:de\s+)?([a-z]{3,9})\.?\s*(?:de\s+)?(\d{4})?/g;
      while ((m = rxExt.exec(t))) {
        const mes = MESES_TODOS[m[2]];
        const d = +m[1];
        if (mes === undefined || d < 1 || d > 31) continue;
        achados.push({ i: m.index, d, m: mes, y: m[3] ? +m[3] : null });
      }
      achados.sort((a, b) => a.i - b.i);
      achados.forEach((x, i) => {
        if (x.y) return;
        const prox = achados.slice(i + 1).find(o => o.y) || achados.slice(0, i).reverse().find(o => o.y);
        x.y = prox ? prox.y : new Date().getFullYear();
      });
      return achados;
    }
    // Mês escrito por extenso ("SETEMBRO DE 2026") vale para porcentagens mensais.
    function mesesPorExtenso(texto) {
      const t = minusculo(texto), out = [];
      const re = /(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(\d{4})/g;
      let m;
      while ((m = re.exec(t))) out.push({ m: MESES_TODOS[m[1]], y: +m[2] });
      return out;
    }
    const mesmaData = (a, d) => a.d === d.getDate() && a.m === d.getMonth() && a.y === d.getFullYear();
    function contemPeriodo(texto, per) {
      const ds = extrairDatas(texto);
      if (ds.some(x => mesmaData(x, per.ini)) && ds.some(x => mesmaData(x, per.fim))) return 'exato';
      const mensal = per.ini.getDate() === 1 && per.fim.getDate() === new Date(per.fim.getFullYear(), per.fim.getMonth() + 1, 0).getDate() && per.ini.getMonth() === per.fim.getMonth();
      if (mensal && mesesPorExtenso(texto).some(x => x.m === per.ini.getMonth() && x.y === per.ini.getFullYear())) return 'exato';
      // um dia de diferença no fim (ex.: 01 a 16 em vez de 01 a 15)
      if (ds.some(x => mesmaData(x, per.ini)) && ds.some(x => x.m === per.fim.getMonth() && x.y === per.fim.getFullYear() && Math.abs(x.d - per.fim.getDate()) === 1)) return 'aproximado';
      return '';
    }

    // Classifica cada nick pela seção (positivos, negativos, casos especiais) em que ele aparece no texto.
    function classificarTexto(texto, nicks, vocab) {
      const t1 = minusculo(texto);
      const t2 = t1.replace(/[^a-z0-9]/g, ' ');
      const marcas = [];
      vocab.filter(v => v.uso !== 'planilha').forEach(v => {
        const partes = v.expressao.split(' ').filter(Boolean).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        if (!partes.length) return;
        const re = new RegExp(partes.join(' +'), 'g');
        let m;
        while ((m = re.exec(t2))) marcas.push({ i: m.index, fim: m.index + m[0].length, tipo: v.tipo });
      });
      marcas.sort((a, b) => a.i - b.i || (b.fim - b.i) - (a.fim - a.i));
      const validas = [];
      let ate = -1;
      marcas.forEach(x => { if (x.i >= ate) { validas.push(x); ate = x.fim; } });
      const tipoEm = idx => { let tp = null; for (const x of validas) { if (x.i < idx) tp = x.tipo; else break; } return tp; };
      const alnum = ch => /[a-z0-9]/.test(ch || '');
      const out = {};
      nicks.forEach(n => {
        const k = minusculo(limparNick(n));
        const tipos = new Set();
        if (k) {
          let i = 0;
          while ((i = t1.indexOf(k, i)) !== -1) {
            const okA = !alnum(k.charAt(0)) || !alnum(t1.charAt(i - 1));
            const okD = !alnum(k.charAt(k.length - 1)) || !alnum(t1.charAt(i + k.length));
            if (okA && okD) tipos.add(tipoEm(i) || 'sem-secao');
            i += k.length;
          }
        }
        out[chaveNick(n)] = [...tipos];
      });
      return out;
    }

    async function lerDoc(url) {
      const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return new DOMParser().parseFromString(await r.text(), 'text/html');
    }
    // Procura, nas últimas páginas do tópico de porcentagem, a mensagem do período.
    async function porcentagemTopico(link, per) {
      let url;
      try { url = new URL(link, location.origin); } catch (_) { return { erro: 'o link do tópico de porcentagem é inválido' }; }
      if (url.origin !== location.origin) return { erro: 'o tópico de porcentagem precisa ser deste fórum' };
      const m = url.pathname.match(/^\/t(\d+)(?:p\d+)?-(.*)$/);
      if (!m) return { erro: 'o link do tópico de porcentagem é inválido' };
      const [, tid, slug] = m;
      let doc0;
      try { doc0 = await lerDoc(`/t${tid}-${slug}`); } catch (e) { return { erro: 'não consegui abrir o tópico de porcentagem (' + e.message + ')' }; }
      const offs = new Set([0]);
      const re = new RegExp('/t' + tid + 'p(\\d+)-');
      doc0.querySelectorAll('a[href]').forEach(a => { const x = (a.getAttribute('href') || '').match(re); if (x) offs.add(+x[1]); });
      const fila = [...offs].sort((a, b) => b - a).slice(0, 6);
      let aproximado = null;
      for (const off of fila) {
        let doc;
        try { doc = off ? await lerDoc(`/t${tid}p${off}-${slug}`) : doc0; } catch (_) { continue; }
        const conteudos = [...doc.querySelectorAll('div.post .content, .postbody .content, .post .content')].filter((x, i, a) => a.indexOf(x) === i).reverse();
        for (const el of conteudos) {
          const texto = textoDoElemento(el);
          const r = contemPeriodo(texto, per);
          const ancora = el.closest('[id^="p"]');
          const onde = `/t${tid}${off ? 'p' + off : ''}-${slug}${ancora ? '#' + ancora.id.slice(1) : ''}`;
          if (r === 'exato') return { texto, link: onde };
          if (r === 'aproximado' && !aproximado) aproximado = { texto, link: onde, aproximado: true };
        }
      }
      return aproximado || { erro: 'periodo', link: url.pathname };
    }

    function avaliarTeto(reg, cargo, historico) {
      const per = interpretarPeriodo(reg.periodo);
      const inicio = new Date(CFG.TETO_INICIO + 'T00:00:00');
      if (!per) return { estado: 'sem-periodo' };
      if (per.ini < inicio) return { estado: 'antes' };
      if (!cargo) return { estado: 'sem-cargo' };
      const teto = faixaPositiva(cargo)[1];
      const excedidos = [], cruzados = [];
      partirPoliciais(reg.policiais).forEach(n => {
        const lista = (historico && historico[chaveNick(n)]) || [];
        const contidos = lista.filter(x => x.contido);
        const ja = contidos.reduce((s, x) => s + Number(x.valor || 0), 0);
        const pode = Math.max(0, teto - ja);
        if (contidos.length && Number(reg.numero) > pode) excedidos.push({ nick: n, ja, pode, teto, itens: contidos });
        lista.filter(x => !x.contido).forEach(x => cruzados.push({ nick: n, item: x }));
      });
      return { estado: 'ok', teto, excedidos, cruzados };
    }

    function periodoCombina(tipo, per) {
      const fimMes = new Date(per.fim.getFullYear(), per.fim.getMonth() + 1, 0).getDate();
      const dias = Math.round((per.fim - per.ini) / 864e5) + 1;
      if (tipo === 'semanal') return per.ini.getDay() === 0 && dias === 7;
      if (tipo === 'quinzenal') {
        const mesmo = per.ini.getMonth() === per.fim.getMonth();
        return mesmo && ((per.ini.getDate() === 1 && per.fim.getDate() === 15) || (per.ini.getDate() === 16 && per.fim.getDate() === fimMes));
      }
      if (tipo === 'mensal') return per.ini.getMonth() === per.fim.getMonth() && per.ini.getDate() === 1 && per.fim.getDate() === fimMes;
      return true;
    }
    function incongruencias(reg) {
      const lista = [];
      const mot = motivoDoTexto(reg.motivo);
      if (!mot.id) lista.push('O motivo não segue o padrão do formulário.');
      const cargo = cargoDoRegistro(reg);
      const periodico = mot.id === 'meta' || mot.id === 'nao-meta';
      if (periodico && !mot.interno && !cargo) lista.push(`O cargo "${reg.cargo}" não existe na hierarquia de ${GRUPO.nome}.`);
      const v = Number(reg.numero), abs = Math.abs(v);
      const regra = mot.id ? regraMedalhas({ grupo: GRUPO, motivo: mot.id, cargo, interno: !!mot.interno }) : null;
      if (regra && regra.bloqueio) lista.push(regra.bloqueio);
      else if (regra && !regra.pendente) {
        if (regra.sinal && Math.sign(v) !== regra.sinal) lista.push(`O número (${sinal(v)}) deveria ser ${regra.sinal > 0 ? 'positivo' : 'negativo'}.`);
        if (regra.fixo && abs !== regra.fixo) lista.push(`O valor previsto é ${regra.sinal < 0 ? '-' : ''}${regra.fixo}; a postagem tem ${sinal(v)}.`);
        if (!regra.fixo && regra.min && abs < regra.min) lista.push(`Abaixo do mínimo: ${abs} medalhas, o mínimo é ${regra.min}.`);
        if (!regra.fixo && regra.max && abs > regra.max) lista.push(`Acima do limite: ${abs} medalhas, o limite é ${regra.max}.`);
        if (!regra.fixo && !regra.max && abs > CFG.ALERTA_VALOR_ALTO) lista.push(`Valor muito alto (${abs} medalhas por policial). Confira.`);
      }
      const per = interpretarPeriodo(reg.periodo);
      if (!per) lista.push('O período de referência não foi entendido.');
      else {
        if (periodico && !mot.interno && cargo && !periodoCombina(cargo.periodo, per)) lista.push(`O período ${reg.periodo} não é ${cargo.periodo === 'semanal' ? 'uma semana (domingo a sábado)' : cargo.periodo === 'quinzenal' ? 'uma quinzena (1 a 15 ou 16 ao fim do mês)' : 'um mês inteiro'}, que é o período de ${cargo.nome}.`);
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        if (periodico && per.fim >= hoje) lista.push('O período ainda não terminou.');
        if ((hoje - per.fim) / 864e5 > CFG.JANELA_PERIODOS_DIAS) lista.push(`O período terminou há mais de ${CFG.JANELA_PERIODOS_DIAS} dias.`);
      }
      const vistos = new Set(), repetidos = [];
      partirPoliciais(reg.policiais).forEach(n => { const k = chaveNick(n); if (vistos.has(k)) repetidos.push(n); vistos.add(k); });
      if (repetidos.length) lista.push(`Policiais repetidos: ${juntarE(repetidos)}.`);
      return lista;
    }

    async function fiscalizar(id, mostrar) {
      const st = ESTADO.posts.get(id);
      if (!st || !st.registro) return null;
      if (st.fisc && st.fisc.estado === 'carregando') return st.fisc.promessa;
      const reg = st.registro;
      st.fisc = { estado: 'carregando' };
      if (mostrar !== false) renderCartao(id);
      st.fisc.promessa = (async () => {
        const mot = motivoDoTexto(reg.motivo);
        const cargo = cargoDoRegistro(reg);
        const nicks = partirPoliciais(reg.policiais);
        // A porcentagem só vale para meta e não cumprimento de efetivas; sem cargo, o servidor nem procura a fonte
        // (assim a aba "Fontes de porcentagem" não ganha linhas de expulsão, correção ou subgrupo).
        const comPorcentagem = (mot.id === 'meta' || mot.id === 'nao-meta') && !mot.interno && !ALVO.interno;
        const r = await api('fiscalizar', {
          grupo: GRUPO.nome, id, usuario: USUARIO, sigla: GRUPO.id,
          cargo: comPorcentagem ? (cargo ? cargo.nome : reg.cargo) : '', semPorcentagem: semPorcentagem(GRUPO, cargo || reg.cargo)
        });
        const res = { quando: new Date(), flags: new Map(), itens: [] };
        const marcar = (nick, tipo, texto) => { const k = chaveNick(nick); if (!res.flags.has(k)) res.flags.set(k, []); res.flags.get(k).push({ tipo, texto }); };

        // a) RCCSystem
        const problemas = [];
        let falhou = 0;
        (r.rcc || []).forEach(x => {
          if (x.falha) { falhou++; return; }
          if (!x.encontrado) { problemas.push(`${x.consulta}: não existe no RCCSystem`); marcar(x.consulta, 'rcc', 'Não existe no RCCSystem'); return; }
          if (!x.ativo) { problemas.push(`${x.nick}: ${x.status} no RCCSystem`); marcar(x.consulta, 'rcc', `Inativo no RCCSystem (${x.status})`); return; }
          if (x.naListagem === false) { problemas.push(`${x.nick}: fora da listagem de gratificações`); marcar(x.consulta, 'rcc', 'Fora da listagem de gratificações'); }
        });
        const ativos = (r.rcc || []).filter(x => x.encontrado && x.ativo).length;
        res.itens.push({
          t: problemas.length ? 'erro' : falhou ? 'aviso' : 'ok', titulo: 'RCCSystem',
          texto: `${ativos} de ${nicks.length} ativos.` + (falhou ? ` ${plural(falhou, 'não foi conferido', 'não foram conferidos')} (o RCCSystem não respondeu).` : '') + (r.erroListagem ? ` Listagem de gratificações indisponível: ${r.erroListagem}.` : ''),
          lista: problemas
        });

        // b) porcentagem
        const esperado = mot.id === 'meta' ? 'pos' : mot.id === 'nao-meta' ? 'neg' : '';
        const fonte = r.fonte || {};
        const per = interpretarPeriodo(reg.periodo);
        if (!esperado || mot.interno) res.itens.push({ t: 'info', titulo: 'Porcentagem', texto: 'Não se aplica a este motivo.' });
        else if (fonte.tipo === 'nenhuma') res.itens.push({ t: 'info', titulo: 'Porcentagem', texto: `${cargo ? cargo.nome : reg.cargo} não tem porcentagem publicada.` });
        else if (fonte.tipo === 'pendente') res.itens.push({ t: 'aviso', titulo: 'Porcentagem', texto: `A fonte da porcentagem de ${cargo ? cargo.nome : reg.cargo} ainda não foi cadastrada. Preencha a aba "Fontes de porcentagem" da planilha de registros${fonte.linha ? ` (linha ${fonte.linha})` : ''}.` });
        else if (fonte.tipo === 'erro') res.itens.push({ t: 'aviso', titulo: 'Porcentagem', texto: `Não deu para ler a fonte: ${fonte.erro}.` });
        else if (fonte.tipo === 'topico' || fonte.tipo === 'planilha') {
          let mapa = null, onde = '', aviso = '';
          if (fonte.tipo === 'planilha') {
            const pr = fonte.resultado || {};
            if (pr.erro) aviso = pr.erro;
            else { mapa = pr.mapa || {}; onde = fonte.link; }
          } else if (per) {
            const pt = await porcentagemTopico(fonte.link, per);
            if (pt.erro) aviso = pt.erro === 'periodo' ? `o período ${reg.periodo} não aparece nas últimas páginas do tópico` : pt.erro;
            else { mapa = classificarTexto(pt.texto, nicks, r.vocabulario || []); onde = pt.link; if (pt.aproximado) aviso = 'a porcentagem encontrada tem um dia de diferença no período'; }
          }
          if (mapa) {
            const fora = [];
            nicks.forEach(n => {
              const tipos = mapa[chaveNick(n)] || [];
              if (tipos.includes(esperado)) return;
              const onde2 = !tipos.length ? 'não aparece na porcentagem' : tipos.includes('esp') ? 'está em caso especial' : tipos.includes('neg') ? 'está como negativo' : tipos.includes('pos') ? 'está como positivo' : 'aparece fora das seções';
              fora.push(`${n}: ${onde2}`);
              marcar(n, 'porc', `Porcentagem: ${onde2}`);
            });
            res.itens.push({
              t: fora.length ? 'aviso' : aviso ? 'aviso' : 'ok', titulo: 'Porcentagem',
              texto: (fora.length ? `${plural(fora.length, 'policial não está', 'policiais não estão')} como ${esperado === 'pos' ? 'positivos' : 'negativos'}.` : `Todos aparecem como ${esperado === 'pos' ? 'positivos' : 'negativos'}.`) + (aviso ? ` Atenção: ${aviso}.` : ''),
              lista: fora, link: onde
            });
          } else res.itens.push({ t: 'aviso', titulo: 'Porcentagem', texto: `Não deu para conferir: ${aviso || 'fonte indisponível'}.`, link: fonte.tipo === 'topico' ? fonte.link : '' });
        }

        // c) teto do período
        if (mot.id === 'meta' && !mot.interno) {
          const tt = avaliarTeto(reg, cargo, r.historico);
          if (tt.estado === 'antes') res.itens.push({ t: 'info', titulo: 'Teto do período', texto: `Conferido a partir de ${CFG.TETO_INICIO.split('-').reverse().join('/')}.` });
          else if (tt.estado === 'ok') {
            const lista = tt.excedidos.map(x => {
              marcar(x.nick, 'teto', `Teto: já recebeu ${x.ja} no período, pode receber até ${x.pode}`);
              return `${x.nick}: já recebeu ${x.ja} neste período (${x.itens.map(i => `${sinal(i.valor)} em ${i.periodo}${i.status === 'pendente' ? ', pendente' : ''}`).join('; ')}); pode receber até ${x.pode}`;
            });
            const info = tt.cruzados.map(x => `${x.nick}: ${sinal(x.item.valor)} em ${x.item.periodo} (${x.item.cargo}), período que cruza este`);
            res.itens.push({
              t: lista.length ? 'erro' : 'ok', titulo: 'Teto do período',
              texto: lista.length ? `${plural(lista.length, 'policial passa', 'policiais passam')} do teto de ${tt.teto} de ${cargo.nome}.` : `Ninguém passa do teto de ${tt.teto}.`,
              lista: lista.concat(info)
            });
          }
        }

        // d) incongruências e postagem x planilha
        const inc = incongruencias(reg);
        const div = divergencias(reg, lerPostagem(st.content));
        partirPoliciais(reg.policiais).forEach((n, i, a) => { if (a.findIndex(x => chaveNick(x) === chaveNick(n)) !== i) marcar(n, 'dup', 'Repetido na postagem'); });
        res.itens.push({ t: inc.length ? 'aviso' : 'ok', titulo: 'Regras do cofre', texto: inc.length ? 'Confira os pontos abaixo.' : 'Número, período e cargo dentro das regras.', lista: inc });
        if (div.length) res.itens.push({ t: 'erro', titulo: 'Postagem diferente da planilha', texto: 'A postagem foi editada depois de registrada. A aprovação usa o que está na planilha.', lista: div });
        res.divergencias = div;
        return res;
      })();
      try {
        st.fisc.resultado = await st.fisc.promessa;
        st.fisc.estado = 'pronto';
        destacarNaPostagem(st);
      } catch (e) {
        st.fisc.estado = 'erro';
        st.fisc.erro = e.message;
      }
      if (mostrar !== false) renderCartao(id);
      return st.fisc.resultado || null;
    }

    function htmlFiscalizacao(st) {
      const f = st.fisc;
      if (f.estado === 'carregando') return `<div class="fisc"><div class="carregando">${ICONE.girar}Fiscalizando: RCCSystem, porcentagem, teto e regras...</div></div>`;
      if (f.estado === 'erro') return `<div class="fisc"><div class="item" data-t="erro">${ICONE.alerta}<div><b>Não deu para fiscalizar</b><p>${esc(f.erro)}</p></div></div></div>`;
      const r = f.resultado;
      const icone = t => (t === 'ok' ? ICONE.ok : t === 'erro' ? ICONE.nao : t === 'info' ? ICONE.info : ICONE.alerta);
      const itens = r.itens.map(i => `<div class="item" data-t="${i.t}">${icone(i.t)}<div><b>${esc(i.titulo)}</b> <p>${esc(i.texto)}${i.link ? ` <a href="${esc(i.link)}" target="_blank" rel="noopener">abrir fonte</a>` : ''}</p>${i.lista && i.lista.length ? ` <ul>${i.lista.map(x => `<li>${esc(x)}</li>`).join(' ')}</ul>` : ''}</div></div>`).join('\n');
      return `<div class="fisc"><div class="fisc-topo">${ICONE.escudo}Fiscalização <small>${esc(dois(r.quando.getHours()) + ':' + dois(r.quando.getMinutes()))}</small><button type="button" class="ver refazer" data-acao="refazer">${ICONE.desfazer}refazer</button></div>${itens}</div>`;
    }

    // Problemas da fiscalização, do mais grave ao mais leve, com a cor de cada um (r,g,b).
    const ORDEM_FLAGS = ['rcc', 'teto', 'dup', 'porc'];
    const NOME_FLAG = { rcc: 'RCCSystem', teto: 'Teto', dup: 'Repetido', porc: 'Porcentagem' };
    const COR_FLAG = { rcc: '239,68,68', teto: '245,158,11', dup: '245,158,11', porc: '59,130,246' };
    const tipoMaisGrave = f => (f && f.length ? ORDEM_FLAGS.find(t => f.some(x => x.tipo === t)) || f[0].tipo : '');

    // Marca na própria postagem os policiais com problema: contorno e fundo na cor (só na tela, nada é salvo).
    function destacarNaPostagem(st) {
      st.content.querySelectorAll('[data-af-destaque]').forEach(td => {
        td.style.boxShadow = td.dataset.afSombra || '';
        td.style.backgroundColor = td.dataset.afFundo || '';
        td.removeAttribute('data-af-destaque');
        td.removeAttribute('data-af-sombra');
        td.removeAttribute('data-af-fundo');
        td.removeAttribute('title');
      });
      const flags = st.fisc && st.fisc.resultado ? st.fisc.resultado.flags : null;
      if (!flags || !flags.size) return;
      st.content.querySelectorAll('td').forEach(td => {
        if (td.querySelector('td')) return;
        const f = flags.get(chaveNick(td.textContent));
        if (!f) return;
        const cor = COR_FLAG[tipoMaisGrave(f)] || COR_FLAG.teto;
        td.dataset.afDestaque = '1';
        td.dataset.afSombra = td.style.boxShadow || '';
        td.dataset.afFundo = td.style.backgroundColor || '';
        td.style.boxShadow = `inset 0 0 0 2px rgb(${cor})`;
        td.style.backgroundColor = `rgba(${cor},.16)`;
        td.title = f.map(x => x.texto).join(' · ');
      });
    }

    /* ==================================================================
       MODAIS
       ================================================================== */
    let modalAtual = null;
    function abrirModal({ kicker, titulo, sub, corpo, rodape, aoMontar, largura }) {
      fecharModal();
      const host = document.createElement('div');
      host.className = 'af-cofre-modal';
      document.body.appendChild(host);
      const raiz = host.attachShadow({ mode: 'open' });
      raiz.innerHTML = `<style>${CSS_MODAL}</style>
        <div class="fundo" data-tema="${ESTADO.tema}">
          <div class="caixa" role="dialog" aria-modal="true" aria-labelledby="m-titulo" tabindex="-1"${largura ? ` style="max-width:${largura}px"` : ''}>
            <button type="button" class="fechar" data-fechar aria-label="Fechar">${ICONE.x}</button>
            <header class="topo"><img src="${esc(CFG.BRASAO_AF)}" alt=""><div><p class="kicker">${esc(kicker)}</p><h2 class="titulo" id="m-titulo">${esc(titulo)}</h2>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div></header>
            <div class="corpo">${corpo || ''}</div>
            <footer class="rodape">${rodape || ''}</footer>
          </div>
        </div>`;
      const fundo = raiz.querySelector('.fundo');
      const m = { host, raiz, fundo, travado: false };
      modalAtual = m;
      fundo.addEventListener('click', e => {
        if (m.travado) return;
        if (e.target === fundo || e.target.closest('[data-fechar]')) fecharModal();
      });
      m.teclas = e => {
        if (e.key === 'Escape' && !m.travado) fecharModal();
        if (e.key === 'Tab') prenderFoco(raiz, e);
      };
      document.addEventListener('keydown', m.teclas);
      m.antesFoco = document.activeElement;
      document.documentElement.style.overflow = 'hidden';
      if (aoMontar) aoMontar(raiz, m);
      // O foco vai para o campo principal (quando há) ou para a própria janela, sem anel no botão de fechar.
      setTimeout(() => { const alvo = raiz.querySelector('[autofocus]') || raiz.querySelector('.caixa'); if (alvo) alvo.focus({ preventScroll: true }); }, 30);
      return m;
    }
    function prenderFoco(raiz, e) {
      const foc = [...raiz.querySelectorAll('button:not(:disabled),input,textarea,a[href]')].filter(x => x.offsetParent !== null);
      if (!foc.length) return;
      const i = foc.indexOf(raiz.activeElement);
      if (i === -1) { e.preventDefault(); (e.shiftKey ? foc[foc.length - 1] : foc[0]).focus(); }
      else if (e.shiftKey && i === 0) { e.preventDefault(); foc[foc.length - 1].focus(); }
      else if (!e.shiftKey && i === foc.length - 1) { e.preventDefault(); foc[0].focus(); }
    }
    function fecharModal() {
      if (!modalAtual) return;
      const m = modalAtual;
      modalAtual = null;
      document.removeEventListener('keydown', m.teclas);
      document.documentElement.style.overflow = '';
      m.host.remove();
      if (m.antesFoco && m.antesFoco.focus) try { m.antesFoco.focus({ preventScroll: true }); } catch (_) { /* nada */ }
    }
    function toast(msg, tipo, ms = 3200) {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const raiz = host.attachShadow({ mode: 'open' });
      raiz.innerHTML = `<style>${CSS_MODAL}</style><div class="toast" role="status" data-t="${tipo || 'ok'}">${esc(msg)}</div>`;
      setTimeout(() => host.remove(), ms);
    }
    const subDoRegistro = reg => {
      const partes = [GRUPO.nome, String(reg.cargo || '').replace(/\s*\([^)]*\)\s*$/, ''), reg.periodo, `${sinal(reg.numero)} ${ALVO.interno ? 'temporárias' : 'efetivas'}`];
      return partes.filter(Boolean).join(' · ');
    };
    const caixaInfo = (t, icone, html) => `<div class="caixa-info" data-t="${t}">${icone}<div>${html}</div></div>\n`;
    const tituloMotivo = reg => { const m = motivoPorId(motivoDoTexto(reg.motivo).id); return m ? m.rotulo : 'Postagem do cofre'; };

    /* ---------- aprovar ---------- */
    function abrirAprovacao(id) {
      const st = ESTADO.posts.get(id);
      const reg = st.registro;
      const correcao = !!originalDaCorrecao(reg);
      const mot = motivoDoTexto(reg.motivo);
      const A = {
        id, reg, correcao, sel: -1, semContab: false, enviando: false, previa: { estado: 'carregando' }, verif: new Map(),
        policiais: partirPoliciais(reg.policiais).map(n => ({ nick: n, estado: 'aprovado', novoNick: '', medalhas: '', motivo: '' }))
      };
      // No tópico das temporárias (inclusive as correções) o lançamento vai na coluna do subgrupo.
      const temporarias = !!(ALVO.interno || mot.interno);
      const subgrupoDoRegistro = () => (GRUPO.subgrupos || []).find(s => normal(partesSubgrupo(s).nome) === normal(reg.cargo) || normal(s) === normal(reg.cargo)) || reg.cargo;
      const secoes = secoesContabil(GRUPO, temporarias ? subgrupoDoRegistro() : (cargoDoRegistro(reg) || reg.cargo), temporarias);
      const m = abrirModal({
        kicker: correcao ? 'APROVAR CORREÇÃO' : 'APROVAR POSTAGEM',
        titulo: tituloMotivo(reg),
        sub: subDoRegistro(reg),
        corpo: '<div data-avisos></div><div data-policiais></div><div data-editor></div><div data-resumo></div><div data-previa></div>',
        rodape: `<span class="dica" data-dica></span><button type="button" class="btn btn-sec" data-fechar>Voltar</button><button type="button" class="btn btn-aprovar" data-confirmar>${ICONE.check}Aprovar</button>`,
        aoMontar: raiz => {
          raiz.querySelector('[data-confirmar]').addEventListener('click', () => confirmar());
          raiz.querySelector('[data-policiais]').addEventListener('click', e => {
            const b = e.target.closest('[data-i]');
            if (b && !A.correcao) { A.sel = A.sel === +b.dataset.i ? -1 : +b.dataset.i; desenhar(); }
            if (e.target.closest('[data-cancelar-destacados]')) cancelarDestacados();
            if (e.target.closest('[data-fiscalizar]')) { fiscalizar(id).then(() => { desenhar(); }); desenhar(); }
          });
        }
      });
      const R = sel => m.raiz.querySelector(sel);

      const ajustes = () => A.policiais.filter(p => p.estado !== 'aprovado').map(p => p.estado === 'cancelado'
        ? { nick: p.nick, tipo: 'cancelado', motivo: p.motivo.trim() }
        : { nick: p.nick, tipo: 'corrigido', novoNick: p.novoNick.trim(), medalhas: p.medalhas === '' ? null : Math.sign(reg.numero) * Math.abs(parseInt(p.medalhas, 10) || 0), motivo: p.motivo.trim() });
      function problemas() {
        const out = [];
        if (!A.policiais.some(p => p.estado !== 'cancelado')) out.push('todos');
        A.policiais.forEach(p => {
          if (p.estado === 'aprovado') return;
          if (p.motivo.trim().length < 3) out.push(`Falta o motivo de ${p.nick}.`);
          if (p.estado === 'corrigido') {
            const nn = limparNick(p.novoNick), med = p.medalhas === '' ? null : parseInt(p.medalhas, 10);
            if (!nn && (med == null || isNaN(med))) out.push(`Diga o que muda em ${p.nick}.`);
            if (med != null && (isNaN(med) || med <= 0)) out.push(`Número de medalhas inválido para ${p.nick}.`);
            if (nn && A.policiais.some(o => o !== p && chaveNick(o.nick) === chaveNick(nn))) out.push(`${nn} já está na postagem.`);
            const v = nn ? A.verif.get(chaveNick(nn)) : null;
            if (v && v.estado === 'nao') out.push(`${nn} não existe no RCCSystem.`);
          }
        });
        return out;
      }
      const flags = () => (st.fisc && st.fisc.resultado ? st.fisc.resultado.flags : new Map());

      function desenhar() {
        // avisos
        const av = [];
        if (A.correcao) av.push(caixaInfo('info', ICONE.info, '<b>Correção de um cancelamento.</b><p>É aprovada por inteiro e entra em OUTROS na contabilidade. A postagem original continua cancelada.</p>'));
        const fr = st.fisc && st.fisc.resultado;
        if (fr && fr.divergencias && fr.divergencias.length) av.push(caixaInfo('erro', ICONE.alerta, `<b>A postagem foi editada depois de registrada.</b> <p>A aprovação usa o que está na planilha.</p> <ul>${fr.divergencias.map(x => `<li>${esc(x)}</li>`).join(' ')}</ul>`));
        R('[data-avisos]').innerHTML = av.join('');

        // policiais
        const fl = flags();
        const chips = A.policiais.map((p, i) => {
          const f = fl.get(chaveNick(p.nick)) || [];
          const nome = p.estado === 'corrigido' && p.novoNick.trim() ? p.novoNick.trim() : p.nick;
          const pill = p.estado === 'cancelado' ? `<span class="pill pill-can">${ICONE.x}Cancelado</span>` : p.estado === 'corrigido' ? `<span class="pill pill-cor">${ICONE.lapis}${p.medalhas !== '' ? sinal(Math.sign(reg.numero) * Math.abs(parseInt(p.medalhas, 10) || 0)) : 'Corrigido'}</span>` : `<span class="pill pill-ok">${ICONE.check}Aprovado</span>`;
          const titulo = f.map(x => x.texto).join(' · ');
          // Enquanto o auditor não cancela nem corrige, o policial com problema fica com contorno e fundo na cor do problema.
          const flag = p.estado === 'aprovado' ? tipoMaisGrave(f) : '';
          return `<button type="button" class="chip" data-i="${i}" data-e="${p.estado}"${flag ? ` data-flag="${flag}"` : ''} aria-pressed="${A.sel === i}"${titulo ? ` title="${esc(titulo)}"` : ''}${A.correcao ? ' disabled' : ''}>
            <img src="${esc(avatar(nome))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">
            ${flag ? `<span class="marca" aria-hidden="true">${ICONE.alerta}</span>` : ''}<span class="nick">${esc(nome)}</span>${pill}${flag ? `<span class="sr"> (alerta: ${esc(titulo)})</span>` : ''}</button>`;
        }).join('');
        const destacados = A.policiais.filter(p => p.estado === 'aprovado' && fl.has(chaveNick(p.nick)));
        let fiscHtml = '';
        if (!A.correcao) {
          if (st.fisc && st.fisc.estado === 'carregando') fiscHtml = `<div class="caixa-info" data-t="info">${ICONE.girar}<div>Fiscalizando os policiais...</div></div>`;
          else if (!st.fisc || st.fisc.estado === 'erro') fiscHtml = caixaInfo('aviso', ICONE.lupa, `<b>${st.fisc ? 'A fiscalização falhou.' : 'Ainda não fiscalizado.'}</b> <button type="button" class="ver" data-fiscalizar>fiscalizar agora</button>`);
          else if (destacados.length) {
            const tipos = destacados.map(p => tipoMaisGrave(fl.get(chaveNick(p.nick))));
            const legenda = ORDEM_FLAGS.filter(t => tipos.includes(t)).map(t => `<span class="leg" data-flag="${t}">${NOME_FLAG[t]}</span>`).join(' ');
            fiscHtml = caixaInfo('aviso', ICONE.alerta, `<b>${plural(destacados.length, 'policial destacado', 'policiais destacados')} pela fiscalização.</b><p>Toque em um policial para ver o motivo ou <button type="button" class="ver" data-cancelar-destacados>cancelar os destacados</button>.</p><div class="legenda">${legenda}</div>`);
          }
        }
        R('[data-policiais]').innerHTML = `<p class="secao">Policiais · ${A.policiais.length}${A.correcao ? '' : ' · toque para cancelar ou corrigir'}</p><div class="grade">${chips}</div>${fiscHtml ? '<div style="margin-top:12px">' + fiscHtml + '</div>' : ''}`;

        desenharEditor();
        desenharResumo();
      }

      function desenharEditor() {
        const caixa = R('[data-editor]');
        const p = A.policiais[A.sel];
        if (!p) { caixa.innerHTML = ''; return; }
        const f = flags().get(chaveNick(p.nick)) || [];
        const v = p.novoNick.trim() ? A.verif.get(chaveNick(p.novoNick)) : null;
        const ajudaNick = !v ? 'Deixe vazio se o nick estiver certo.' : v.estado === 'carregando' ? 'Conferindo no RCCSystem...' : v.estado === 'nao' ? 'Não existe no RCCSystem.' : v.estado === 'inativo' ? `Existe, mas está ${v.status} no RCCSystem.` : v.estado === 'ok' ? 'Ativo no RCCSystem.' : 'Não deu para conferir agora.';
        caixa.innerHTML = `<div class="editor">
          <div class="editor-topo"><img src="${esc(avatar(p.nick))}" alt="" referrerpolicy="no-referrer"><div><b>${esc(p.nick)}</b>${f.length ? `<p class="sub" style="margin:0">${esc(f.map(x => x.texto).join(' · '))}</p>` : ''}</div></div>
          <div class="seg" role="group" aria-label="Situação de ${esc(p.nick)}">
            <button type="button" data-estado="aprovado" aria-pressed="${p.estado === 'aprovado'}">${ICONE.check}Aprovar</button>
            <button type="button" data-estado="cancelado" aria-pressed="${p.estado === 'cancelado'}">${ICONE.x}Cancelar</button>
            <button type="button" data-estado="corrigido" aria-pressed="${p.estado === 'corrigido'}">${ICONE.lapis}Corrigir</button>
          </div>
          ${p.estado === 'corrigido' ? `<div class="campos">
            <label class="campo">Nick correto<input type="text" data-campo="novoNick" value="${esc(p.novoNick)}" placeholder="${esc(p.nick)}" autocomplete="off" spellcheck="false"><span class="ajuda">${esc(ajudaNick)}</span></label>
            <label class="campo">Medalhas (${reg.numero > 0 ? 'positivas' : 'negativas'})<input type="number" min="1" max="9999" inputmode="numeric" data-campo="medalhas" value="${esc(p.medalhas)}" placeholder="${Math.abs(reg.numero)}"><span class="ajuda">Deixe vazio para manter ${Math.abs(reg.numero)}.</span></label>
          </div>` : ''}
          ${p.estado !== 'aprovado' ? `<label class="campo"${p.motivo.trim().length < 3 ? ' data-erro="1"' : ''}>Motivo ${p.estado === 'cancelado' ? 'do cancelamento' : 'da correção'}<input type="text" data-campo="motivo" value="${esc(p.motivo)}" maxlength="300" placeholder="${p.estado === 'cancelado' ? 'Ex.: inativo no RCCSystem' : 'Ex.: nick digitado errado'}"></label>
          <div class="sugestoes">${(p.estado === 'cancelado' ? sugestoesCancelamento(f) : ['Nick digitado errado', 'Teto do período', 'Valor fora da regra do cargo']).map(s => `<button type="button" data-sugestao="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
        </div>`;
        caixa.querySelectorAll('[data-estado]').forEach(b => b.addEventListener('click', () => {
          p.estado = b.dataset.estado;
          if (p.estado === 'cancelado' && !p.motivo && f.length) p.motivo = f[0].texto.replace(/^Porcentagem: /, 'Na porcentagem, ').replace(/^Teto: /, 'Teto: ');
          desenhar();
          agendarPrevia();
          const alvo = caixa.querySelector(p.estado === 'corrigido' ? '[data-campo="novoNick"]' : '[data-campo="motivo"]');
          if (alvo) alvo.focus();
        }));
        caixa.querySelectorAll('[data-campo]').forEach(inp => inp.addEventListener('input', () => {
          p[inp.dataset.campo] = inp.dataset.campo === 'medalhas' ? inp.value.replace(/\D/g, '').slice(0, 4) : inp.value;
          if (inp.dataset.campo === 'motivo') inp.closest('.campo').toggleAttribute('data-erro', p.motivo.trim().length < 3);
          atualizarChip(A.sel);
          desenharResumo();
          if (inp.dataset.campo !== 'motivo') agendarPrevia();
        }));
        const campoNick = caixa.querySelector('[data-campo="novoNick"]');
        if (campoNick) campoNick.addEventListener('change', () => conferirNick(p.novoNick));
        caixa.querySelectorAll('[data-sugestao]').forEach(b => b.addEventListener('click', () => {
          p.motivo = b.dataset.sugestao;
          const inp = caixa.querySelector('[data-campo="motivo"]');
          inp.value = p.motivo;
          inp.closest('.campo').removeAttribute('data-erro');
          desenharResumo();
        }));
      }
      function atualizarChip(i) {
        const p = A.policiais[i], chip = R(`[data-i="${i}"]`);
        if (!chip || !p) return;
        const nome = p.estado === 'corrigido' && p.novoNick.trim() ? p.novoNick.trim() : p.nick;
        chip.querySelector('.nick').textContent = nome;
        if (p.estado === 'corrigido') chip.querySelector('.pill').lastChild.textContent = p.medalhas !== '' ? sinal(Math.sign(reg.numero) * Math.abs(parseInt(p.medalhas, 10) || 0)) : 'Corrigido';
      }
      function sugestoesCancelamento(f) {
        const base = ['Inativo no RCCSystem', 'Não consta como positivo na porcentagem', 'Teto do período atingido', 'Não pertence ao cargo'];
        const daFisc = f.map(x => x.texto);
        return [...new Set(daFisc.concat(base))].slice(0, 5);
      }
      async function conferirNick(nick) {
        const nn = limparNick(nick);
        if (!nn) return;
        const k = chaveNick(nn);
        if (A.verif.has(k) && A.verif.get(k).estado !== 'falha') return;
        A.verif.set(k, { estado: 'carregando' });
        desenharEditor();
        try {
          const r = await api('verificar', { nicks: [nn] });
          const x = (r.resultados || [])[0] || {};
          A.verif.set(k, x.falha ? { estado: 'falha' } : !x.encontrado ? { estado: 'nao' } : x.ativo ? { estado: 'ok' } : { estado: 'inativo', status: x.status });
        } catch (_) {
          A.verif.set(k, { estado: 'falha' });
        }
        if (modalAtual === m) { desenharEditor(); desenharResumo(); }
      }
      function cancelarDestacados() {
        const fl = flags();
        A.policiais.forEach(p => {
          const f = fl.get(chaveNick(p.nick));
          if (f && p.estado === 'aprovado') { p.estado = 'cancelado'; p.motivo = f.map(x => x.texto).join('; ').slice(0, 290); }
        });
        A.sel = -1;
        desenhar();
        agendarPrevia();
      }

      function desenharResumo() {
        const apr = A.policiais.filter(p => p.estado !== 'cancelado');
        const can = A.policiais.length - apr.length, cor = A.policiais.filter(p => p.estado === 'corrigido').length;
        const total = apr.reduce((s, p) => s + (p.estado === 'corrigido' && p.medalhas !== '' ? Math.sign(reg.numero) * Math.abs(parseInt(p.medalhas, 10) || 0) : Number(reg.numero)), 0);
        R('[data-resumo]').innerHTML = `<div class="resumo"><span><b>${apr.length}</b> ${apr.length === 1 ? 'aprovado' : 'aprovados'}</span>${can ? `<span><b>${can}</b> ${can === 1 ? 'cancelado' : 'cancelados'}</span>` : ''}${cor ? `<span><b>${cor}</b> ${cor === 1 ? 'corrigido' : 'corrigidos'}</span>` : ''}<span>Total <b>${sinal(total)}</b> medalhas</span></div>`;
        desenharPrevia();
        const probs = problemas();
        const todos = probs.includes('todos');
        const botao = R('[data-confirmar]');
        const previaOk = A.previa.estado === 'ok' || (A.previa.estado === 'erro' && A.semContab);
        botao.disabled = A.enviando || !!probs.length || !previaOk;
        botao.innerHTML = A.enviando ? `${ICONE.girar}Aprovando...` : `${ICONE.check}Aprovar ${apr.length === A.policiais.length ? '' : apr.length + ' de ' + A.policiais.length}`.trim();
        R('[data-dica]').textContent = todos ? 'Todos foram cancelados: use Negar para recusar a postagem.' : probs[0] || (A.previa.estado === 'carregando' ? 'Conferindo a contabilidade...' : A.previa.estado === 'erro' && !A.semContab ? 'Resolva a contabilidade ou marque para lançar à mão.' : '');
        if (todos && !R('[data-negar]')) {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'btn btn-negar'; b.dataset.negar = '1';
          b.innerHTML = `${ICONE.x}Negar postagem`;
          b.addEventListener('click', () => abrirNegacao(id, A.policiais.map(p => `${p.nick}: ${p.motivo}`).join('; ')));
          botao.insertAdjacentElement('beforebegin', b);
        } else if (!todos && R('[data-negar]')) R('[data-negar]').remove();
      }

      function desenharPrevia() {
        const caixa = R('[data-previa]');
        const pv = A.previa;
        if (pv.estado === 'carregando') { caixa.innerHTML = `<div class="caixa-info" data-t="info">${ICONE.girar}<div><b>Contabilidade</b><p>Procurando onde lançar...</p></div></div>`; return; }
        if (pv.estado === 'parado') { caixa.innerHTML = ''; return; }
        if (pv.estado === 'erro') {
          caixa.innerHTML = caixaInfo('erro', ICONE.tabela, `<b>A contabilidade não foi encontrada.</b><p>${esc(pv.erro)}</p>
            <label class="marcar"><input type="checkbox" data-sem${A.semContab ? ' checked' : ''}><span>Aprovar mesmo assim e lançar na contabilidade à mão.</span></label>`);
          caixa.querySelector('[data-sem]').addEventListener('change', e => { A.semContab = e.target.checked; desenharResumo(); });
          return;
        }
        const c = pv.dados;
        if (c.pulou) { caixa.innerHTML = caixaInfo('info', ICONE.tabela, `<b>Contabilidade</b><p>${esc(c.texto)}</p>`); return; }
        const linhas = c.linhas.map(l => `<li>${esc(l.rotulo)}: ${l.positivas ? '+' + l.positivas + ' positivas' : ''}${l.positivas && l.negativas ? ', ' : ''}${l.negativas ? l.negativas + ' negativas' : ''}${l.nova ? ' (linha nova)' : ''}</li>`).join('');
        caixa.innerHTML = caixaInfo(c.aproximado || c.secaoAproximada ? 'aviso' : 'ok', ICONE.tabela, `<b>Contabilidade:</b> ${esc(c.aba)} › ${esc(c.mes)} › ${esc(c.secao)}${c.periodo ? ' › ' + esc(c.periodo) : ''}${c.pagina ? ' · página ' + c.pagina : ''}
          ${c.secaoAproximada ? `<p>Neste mês a seção está escrita "${esc(c.secao)}" na planilha; o lançamento vai nela.</p>` : ''}
          ${c.aproximado ? `<p>O período da postagem (${esc(reg.periodo)}) não existe igual na planilha; vai para ${esc(c.periodo || c.secao)}.</p>` : ''}<ul>${linhas}</ul>`);
      }

      let timerPrevia = null, seqPrevia = 0;
      function agendarPrevia() {
        clearTimeout(timerPrevia);
        if (problemas().includes('todos')) { A.previa = { estado: 'parado' }; desenharResumo(); return; }
        A.previa = { estado: 'carregando' };
        desenharResumo();
        timerPrevia = setTimeout(async () => {
          const minha = ++seqPrevia;
          try {
            const r = await api('previa', dadosAprovacao());
            if (minha !== seqPrevia || modalAtual !== m) return;
            A.previa = { estado: 'ok', dados: r.contabilidade };
          } catch (e) {
            if (minha !== seqPrevia || modalAtual !== m) return;
            A.previa = { estado: 'erro', erro: e.message };
          }
          desenharResumo();
        }, 450);
      }
      const dadosAprovacao = () => ({
        grupo: GRUPO.nome, id, usuario: USUARIO, pagina: PAGINA, temporarias: ALVO.interno, secoes,
        ajustes: A.correcao ? [] : ajustes().filter(a => a.tipo === 'cancelado' || a.novoNick || a.medalhas != null)
      });

      async function confirmar() {
        if (A.enviando) return;
        A.enviando = true;
        m.travado = true;
        desenharResumo();
        try {
          const r = await api('aprovar', Object.assign(dadosAprovacao(), { esperado: { policiais: reg.policiais }, semContabilidade: A.semContab && A.previa.estado === 'erro' }));
          atualizarRegistro(r.registro);
          m.travado = false;
          mostrarAprovado(r);
        } catch (e) {
          A.enviando = false;
          m.travado = false;
          desenharResumo();
          erroDecisao(id, e);
        }
      }
      function mostrarAprovado(r) {
        const reg2 = r.registro;
        R('.kicker').textContent = 'POSTAGEM APROVADA';
        const c = r.contabilidade;
        const contab = !c ? caixaInfo('aviso', ICONE.tabela, '<b>Contabilidade não lançada.</b><p>Lance na planilha de contabilidade à mão.</p>')
          : c.pulou ? caixaInfo('info', ICONE.tabela, `<b>Contabilidade</b><p>${esc(c.texto)}</p>`)
            : caixaInfo('ok', ICONE.tabela, `<b>Lançado na contabilidade:</b> ${esc(c.aba)} › ${esc(c.mes)} › ${esc(c.secao)}${c.periodo ? ' › ' + esc(c.periodo) : ''}.`);
        R('.corpo').innerHTML = caixaInfo('ok', ICONE.ok, `<b>Aprovada por ${esc(reg2.auditor)}.</b><p>${esc(plural(r.lancamentos.length, 'policial', 'policiais'))} · ${esc(reg2.decisao)}.</p>`) + contab +
          `<div><p class="secao">Requerimento no RCCSystem</p>${htmlLinksRcc(reg2)}</div>`;
        R('.rodape').innerHTML = '<button type="button" class="btn btn-sec" data-fechar>Fechar</button>';
      }

      desenhar();
      agendarPrevia();
      if (!A.correcao && (!st.fisc || st.fisc.estado === 'erro')) fiscalizar(id).then(() => { if (modalAtual === m && !A.enviando) desenhar(); });
    }

    /* ---------- negar ---------- */
    function abrirNegacao(id, motivoSugerido) {
      const st = ESTADO.posts.get(id);
      const reg = st.registro;
      const original = originalDaCorrecao(reg);
      const sugestoes = original
        ? ['O cancelamento não procede', 'Correção com dados errados', 'Postagem de correção duplicada']
        : ['Período de referência incorreto', 'Policiais inativos no RCCSystem', 'Postagem duplicada', 'Número de medalhas fora da regra', 'Policiais fora da porcentagem do cargo'];
      let enviando = false;
      const m = abrirModal({
        kicker: original ? 'NEGAR CORREÇÃO' : 'NEGAR POSTAGEM', titulo: tituloMotivo(reg), sub: subDoRegistro(reg),
        corpo: (original ? caixaInfo('info', ICONE.info, `<b>Ao negar, a postagem ${esc(original.id)} volta a ficar aprovada.</b><p>As medalhas dela continuam valendo.</p>`) : '') +
          `<label class="campo">Motivo da negação<textarea data-motivo maxlength="500" placeholder="Explique o motivo para o responsável pela postagem." autofocus>${esc(motivoSugerido || '')}</textarea><span class="ajuda" data-conta></span></label>
          <div class="sugestoes">${sugestoes.map(s => `<button type="button" data-sugestao="${esc(s)}">${esc(s)}</button>`).join('')}</div>`,
        rodape: `<span class="dica" data-dica></span><button type="button" class="btn btn-sec" data-fechar>Voltar</button><button type="button" class="btn btn-negar" data-confirmar>${ICONE.x}Negar postagem</button>`
      });
      const R = sel => m.raiz.querySelector(sel);
      const txt = R('[data-motivo]');
      const atualizar = () => {
        const ok = txt.value.trim().length >= 5;
        R('[data-confirmar]').disabled = !ok || enviando;
        R('[data-conta]').textContent = `${txt.value.trim().length}/500`;
        R('[data-dica]').textContent = ok ? '' : 'Escreva o motivo (pelo menos 5 letras).';
      };
      txt.addEventListener('input', atualizar);
      m.raiz.querySelectorAll('[data-sugestao]').forEach(b => b.addEventListener('click', () => { txt.value = b.dataset.sugestao; atualizar(); txt.focus(); }));
      R('[data-confirmar]').addEventListener('click', async () => {
        if (enviando) return;
        enviando = true; m.travado = true;
        R('[data-confirmar]').innerHTML = `${ICONE.girar}Negando...`;
        atualizar();
        try {
          const r = await api('negar', { grupo: GRUPO.nome, id, usuario: USUARIO, motivo: txt.value.trim() });
          if (r.restaurado) atualizarRegistro(r.restaurado);
          atualizarRegistro(r.registro);
          m.travado = false;
          fecharModal();
          toast(r.restaurado ? `Negada. A postagem ${r.restaurado.id} voltou a ficar aprovada.` : 'Postagem negada.');
        } catch (e) {
          enviando = false; m.travado = false;
          R('[data-confirmar]').innerHTML = `${ICONE.x}Negar postagem`;
          atualizar();
          erroDecisao(id, e);
        }
      });
      atualizar();
    }

    /* ---------- cancelar (publica a correção) ---------- */
    const CHAVE_CANCELAMENTOS = 'af-cofre:cancelamentos-pendentes';
    const lerFila = () => { try { const l = JSON.parse(localStorage.getItem(CHAVE_CANCELAMENTOS) || '[]'); return Array.isArray(l) ? l : []; } catch (_) { return []; } };
    const salvarFila = l => { try { if (l.length) localStorage.setItem(CHAVE_CANCELAMENTOS, JSON.stringify(l)); else localStorage.removeItem(CHAVE_CANCELAMENTOS); } catch (_) { /* sem armazenamento */ } };

    function abrirCancelamento(id) {
      const st = ESTADO.posts.get(id);
      const reg = st.registro;
      const grupos = gruposPorValor(lancamentos(reg));
      const mot = motivoDoTexto(reg.motivo);
      let enviando = false;
      const previa = grupos.map(g => `<li><b>${sinal(-g.valor)}</b> para ${esc(juntarE(g.nicks))}</li>`).join(' ');
      const m = abrirModal({
        kicker: 'CANCELAR MEDALHAS', titulo: tituloMotivo(reg), sub: subDoRegistro(reg),
        corpo: caixaInfo('aviso', ICONE.alerta, `<b>${grupos.length > 1 ? `Serão publicadas ${grupos.length} postagens` : 'Será publicada uma postagem'} de correção neste tópico:</b> <ul>${previa}</ul>
            <p>A correção fica pendente. Se for aprovada, entra em OUTROS na contabilidade. Se for negada, esta postagem volta a ficar aprovada.</p>`) +
          `<label class="campo">Motivo do cancelamento<textarea data-motivo maxlength="500" placeholder="Ex.: medalhas lançadas em duplicidade." autofocus></textarea><span class="ajuda" data-conta></span></label>
          <div class="sugestoes">${['Medalhas lançadas em duplicidade', 'Postagem aprovada por engano', 'Período de referência incorreto', 'Policial não cumpriu a meta'].map(s => `<button type="button" data-sugestao="${esc(s)}">${esc(s)}</button>`).join('')}</div>
          <div class="passos" data-passos hidden></div>`,
        rodape: `<span class="dica" data-dica></span><button type="button" class="btn btn-sec" data-fechar>Voltar</button><button type="button" class="btn btn-cancelar" data-confirmar>${ICONE.enviar}Publicar correção</button>`
      });
      const R = sel => m.raiz.querySelector(sel);
      const txt = R('[data-motivo]');
      const atualizar = () => {
        const ok = txt.value.trim().length >= 5;
        R('[data-confirmar]').disabled = !ok || enviando;
        R('[data-conta]').textContent = `${txt.value.trim().length}/500`;
        R('[data-dica]').textContent = ok ? '' : 'Escreva o motivo (pelo menos 5 letras).';
      };
      txt.addEventListener('input', atualizar);
      m.raiz.querySelectorAll('[data-sugestao]').forEach(b => b.addEventListener('click', () => { txt.value = b.dataset.sugestao + '.'; atualizar(); txt.focus(); }));
      const passos = (lista) => {
        const el = R('[data-passos]');
        el.hidden = false;
        el.innerHTML = lista.map(p => `<div class="passo" data-e="${p.e}">${p.e === 'ok' ? ICONE.ok : p.e === 'erro' ? ICONE.nao : p.e === 'atual' ? ICONE.girar : ICONE.relogio}<span>${esc(p.t)}</span></div>`).join('\n');
      };
      const travarCampos = sim => {
        txt.readOnly = sim;
        m.raiz.querySelectorAll('[data-sugestao]').forEach(b => { b.disabled = sim; });
      };
      R('[data-confirmar]').addEventListener('click', async () => {
        if (enviando) return;
        enviando = true; m.travado = true;
        travarCampos(true);
        atualizar();
        const motivo = txt.value.trim();
        const etapas = grupos.map((g, i) => ({ t: `Publicar a correção ${grupos.length > 1 ? (i + 1) + ' ' : ''}(${sinal(-g.valor)})`, e: 'espera' }));
        etapas.push({ t: 'Atualizar a planilha', e: 'espera' });
        const publicadas = [];
        try {
          await Promise.race([Promise.all([medirImagem(GRUPO.brasao), medirImagem(CFG.BRASAO_AF)]), espera(6000)]);
          for (let i = 0; i < grupos.length; i++) {
            etapas[i].e = 'atual'; passos(etapas);
            const g = grupos[i];
            const modelo = modeloPostagem({
              grupo: GRUPO, motivo: 'correcao', interno: !!mot.interno, cargo: reg.cargo, subgrupo: reg.cargo, periodo: reg.periodo,
              numero: -g.valor, policiais: g.nicks, responsavel: USUARIO, temporarias: ALVO.interno
            });
            const post = await postarNoTopico(TOPICO, gerarBBCode(modelo), [reg.periodo, g.nicks[0], USUARIO]);
            if (!post.id) throw new Error('a correção foi publicada, mas o fórum não devolveu o número da mensagem. Confira o fim do tópico.');
            publicadas.push({ id: post.id, url: post.url, policiais: g.nicks.join(' / '), numero: -g.valor, cargo: reg.cargo, periodo: reg.periodo, motivo: 'Correção de medalhas distribuídas.', responsavel: USUARIO });
            etapas[i].e = 'ok'; passos(etapas);
          }
          etapas[grupos.length].e = 'atual'; passos(etapas);
          const pedido = { grupo: GRUPO.nome, id, usuario: USUARIO, motivo, correcoes: publicadas };
          salvarFila(lerFila().concat([Object.assign({ quando: Date.now() }, pedido)]));
          const r = await api('cancelar', pedido);
          salvarFila(lerFila().filter(x => !(x.id === id && x.grupo === GRUPO.nome)));
          (r.correcoes || []).forEach(x => { ESTADO.relacionados[x.id] = x; });
          atualizarRegistro(r.original);
          etapas[grupos.length].e = 'ok';
          m.travado = false;
          const varias = publicadas.length > 1;
          const links = publicadas.map(x => `<a href="${esc(linkPostagem(x.id))}">${esc(x.id)}</a>`).join(', ');
          R('.kicker').textContent = 'CORREÇÃO PUBLICADA';
          R('.corpo').innerHTML = caixaInfo('ok', ICONE.ok, `<b>Medalhas canceladas por ${esc(USUARIO)}.</b> <p>Motivo: ${esc(motivo)}</p> <p>${varias ? 'As correções' : 'A correção'} ${links} ${varias ? 'aguardam' : 'aguarda'} a Auditoria no fim do tópico. Se for negada, esta postagem volta a ficar aprovada.</p>`) +
            '<div class="passos" data-passos></div>';
          passos(etapas);
          R('.rodape').innerHTML = `${publicadas[0] && publicadas[0].url ? `<a class="btn btn-sec" href="${esc(publicadas[0].url)}">${ICONE.externo}Ver a correção</a>` : ''}<button type="button" class="btn btn-aprovar" data-fechar>Pronto</button>`;
        } catch (e) {
          enviando = false; m.travado = false;
          const i = etapas.findIndex(x => x.e === 'atual');
          if (i >= 0) etapas[i].e = 'erro';
          passos(etapas);
          if (publicadas.length) {
            R('[data-dica]').textContent = '';
            R('.rodape').innerHTML = `<span class="dica">${esc('A correção já está no tópico. Falta registrar na planilha: ' + e.message)}</span><button type="button" class="btn btn-cancelar" data-retentar>${ICONE.desfazer}Registrar de novo</button>`;
            R('[data-retentar]').addEventListener('click', () => reenviarCancelamentos(true).then(ok => { if (ok) fecharModal(); }));
          } else {
            travarCampos(false);
            atualizar();
            erroDecisao(id, e);
          }
        }
      });
      atualizar();
    }

    // Cancelamentos cuja correção foi publicada mas a planilha não respondeu.
    async function reenviarCancelamentos(avisar) {
      const fila = lerFila().filter(x => x.grupo === GRUPO.nome);
      if (!fila.length) return true;
      let ok = true;
      for (const pedido of fila) {
        try {
          const r = await api('cancelar', Object.assign({}, pedido, { usuario: USUARIO || pedido.usuario }));
          (r.correcoes || []).forEach(x => { ESTADO.relacionados[x.id] = x; });
          if (ESTADO.posts.has(pedido.id)) atualizarRegistro(r.original);
          salvarFila(lerFila().filter(x => x !== pedido && !(x.id === pedido.id && x.grupo === pedido.grupo)));
        } catch (e) {
          if (/já foi cancelada/.test(e.message)) salvarFila(lerFila().filter(x => !(x.id === pedido.id && x.grupo === pedido.grupo)));
          else ok = false;
        }
      }
      if (avisar) toast(ok ? 'Cancelamento registrado na planilha.' : 'A planilha ainda não respondeu. Tente de novo em instantes.', ok ? 'ok' : 'erro');
      return ok;
    }

    /* ---------- RCCSystem ---------- */
    function linksRcc(reg) {
      return gruposPorValor(lancamentos(reg)).map(g => ({
        valor: g.valor, nicks: g.nicks,
        url: linkRccsystem({ temporarias: ALVO.interno, nick: USUARIO, grupo: GRUPO, periodo: reg.periodo, alvos: g.nicks, medalhas: g.valor, motivo: reg.motivo })
      }));
    }
    function htmlLinksRcc(reg) {
      return `<div class="links">${linksRcc(reg).map(l => `<div class="link-rcc"><div><b>${sinal(l.valor)} ${ALVO.interno ? 'temporárias' : 'efetivas'} · ${plural(l.nicks.length, 'policial', 'policiais')}</b><p>${esc(l.nicks.join(', '))}</p></div>
        <a class="btn btn-rcc" href="${esc(l.url)}" target="_blank" rel="noopener">${ICONE.externo}Abrir</a></div>`).join('')}</div>`;
    }
    function abrirRcc(id) {
      const reg = ESTADO.posts.get(id).registro;
      const ls = linksRcc(reg);
      if (ls.length === 1) { window.open(ls[0].url, '_blank', 'noopener'); return; }
      abrirModal({
        kicker: 'PREENCHER NO RCCSYSTEM', titulo: tituloMotivo(reg), sub: subDoRegistro(reg),
        corpo: caixaInfo('info', ICONE.info, '<b>Os policiais têm números diferentes de medalhas.</b><p>O RCCSystem pede um requerimento para cada número.</p>') + htmlLinksRcc(reg),
        rodape: '<button type="button" class="btn btn-sec" data-fechar>Fechar</button>'
      });
    }

    /* ---------- respostas do servidor ---------- */
    function atualizarRegistro(reg) {
      if (!reg || !reg.id) return;
      const st = ESTADO.posts.get(reg.id);
      if (st) {
        st.registro = reg;
        if (reg.status !== 'pendente') {
          st.fisc = null;
          destacarNaPostagem(st);
        }
        renderCartao(reg.id);
      } else ESTADO.relacionados[reg.id] = reg;
      // cartões ligados (original <-> correção) mostram o andamento
      ESTADO.posts.forEach((outro, oid) => { if (oid !== reg.id && String(outro.registro && outro.registro.referencia || '').split(/[^\d]+/).includes(reg.id)) renderCartao(oid); });
    }
    function erroDecisao(id, e) {
      // Conflito: alguém mudou a postagem antes; o cartão se corrige e o modal fecha.
      if (e && e.registro) { atualizarRegistro(e.registro); fecharModal(); }
      toast((e && e.message ? e.message.charAt(0).toUpperCase() + e.message.slice(1) : 'Não deu certo.'), 'erro', 6000);
    }

    /* ==================================================================
       INÍCIO
       ================================================================== */
    async function carregar() {
      const posts = postsDaPagina();
      if (!posts.length) return;
      let r = null;
      for (let tentativa = 0; tentativa < 2 && !r; tentativa++) {
        try {
          r = await api('consultar', { grupo: GRUPO.nome, ids: posts.map(p => p.id), usuario: USUARIO });
        } catch (e) {
          if (tentativa) { console.warn('[AF] cofre: o sistema de atualização não respondeu:', e.message); return; }
          await espera(2000);
        }
      }
      ESTADO.permissao = r.permissao || { af: false };
      ESTADO.relacionados = r.relacionados || {};
      const registrados = posts.filter(p => r.registros && r.registros[p.id]);
      if (!registrados.length) return;
      carregarFontes();
      ESTADO.tema = temaDaPagina(registrados[0].content);
      registrados.forEach(p => {
        const st = { id: p.id, el: p.el, content: p.content, registro: r.registros[p.id], fisc: null, aberto: false };
        st.ui = montarCartao(p);
        ESTADO.posts.set(p.id, st);
      });
      ESTADO.posts.forEach((_, id) => renderCartao(id));
      if (ehAF() && lerFila().some(x => x.grupo === GRUPO.nome)) reenviarCancelamentos(true);
    }

    window.CofreSistema = {
      ativo: true, ESTADO, GRUPO, ALVO, TOPICO, PAGINA, USUARIO,
      lerPostagem, divergencias, lerAjustes, lancamentos, gruposPorValor, linksRcc, extrairDatas, contemPeriodo, classificarTexto,
      avaliarTeto, incongruencias, periodoCombina, fiscalizar, renderCartao, atualizarRegistro, paginaAtual, topicoAtual, textoDoElemento,
      carregado: carregar()
    };
  }
})();