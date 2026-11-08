/* =====================================================================
   [AF] COFRE DE MEDALHAS · SISTEMA DE ATUALIZAÇÃO
   Roda no tópico do cofre de cada grupo de tarefas. Cada postagem que
   está registrada na planilha ganha um cartão de status (para todos).
   Membros da Auditoria Fiscal veem os botões: Aprovar, Negar,
   Fiscalizar, Cancelar e o preenchimento automático do RCCSystem.
   Usa o núcleo (afcofrenucleoaloscon.js): hierarquia, motivos e o BBCode.
   ===================================================================== */
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
      secoesContabil, grupoPorTopico, apiConfigurada, postarNoTopico, medirImagem, modeloPostagem, gerarBBCode, linkRccsystem,
      grupoPorId, imagemBB, limparBB, TEMA_AF, MESES, RODAPE_CAIXA
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
       CONFERÊNCIA DAS NEGATIVAS (a fiscalização sinaliza em roxo, o auditor decide)
       1) Negativa com o período inteiro antes da data de carreira do policial.
       2) Não cumprimento de meta de quem foi expulso por não cumprimento de meta
          logo depois do período (a expulsão já pune).
       Os tópicos de requerimentos podem ser trocados no núcleo, sem mexer aqui:
       GRUPOS[].requerimentos ou CFG.TOPICOS_REQUERIMENTOS = { SIGLA: número }.
       ================================================================== */
    const REQUERIMENTOS_PADRAO = {
      INS: 31847, TRE: 39250, SUP: 37886, PROF: 32243, EFE: 38026,
      AF: 38326, CRH: 36603, SRP: 33022, ROND: 39792, ECE: 34152, CFO: 36730, CEM: 39791
    };
    const NEGATIVAS = Object.assign({
      // Quantos dias depois do fim do período a expulsão por meta é procurada.
      EXPULSAO_JANELA_DIAS: 7
    }, CFG.CONFERENCIA_NEGATIVAS || {});
    const topicoRequerimentos = g => +((g && g.requerimentos) || (CFG.TOPICOS_REQUERIMENTOS || {})[g && g.id] || REQUERIMENTOS_PADRAO[g && g.id] || 0);

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
      usuarios: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
      carimbo: svg('<path d="M5 22h14"/><path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z"/><path d="M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-3-3c-1.66 0-3 1-3 3s1 2 1 3.5V13"/>')
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
.btn-carimbo{background:linear-gradient(180deg,#22a55a,#15803d)}
.btn-carimbo[data-pronto]{animation:chamar 1.5s ease-out 3}
@keyframes chamar{0%{box-shadow:0 0 0 0 rgba(34,165,90,.55)}100%{box-shadow:0 0 0 14px rgba(34,165,90,0)}}
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
  --ok:#16a34a;--aviso:#d97706;--erro:#dc2626;--azul:#2563eb;--roxo:#7c3aed;--painel:#f8fafc`;
    const VARS_ESCURO = `--fundo:#0f1912;--borda:#2f8f46;--texto:#c9d8cc;--forte:#f0f7f1;--suave:#93a897;--icone:#86a08b;--linha:rgba(255,255,255,.09);--sec-fundo:rgba(255,255,255,.06);
  --verde-forte:#7fd38f;--verde-borda:rgba(127,211,143,.4);--chip-f:rgba(255,255,255,.04);
  --b-pend-f:rgba(251,191,36,.16);--b-pend-t:#fcd34d;--b-apr-f:rgba(74,222,128,.15);--b-apr-t:#86efac;--b-neg-f:rgba(248,113,113,.16);--b-neg-t:#fca5a5;--b-can-f:rgba(148,163,184,.18);--b-can-t:#cbd5e1;
  --p-ok-f:rgba(74,222,128,.15);--p-ok-t:#86efac;--p-can-f:rgba(248,113,113,.16);--p-can-t:#fca5a5;--p-cor-f:rgba(251,191,36,.16);--p-cor-t:#fcd34d;
  --ok:#4ade80;--aviso:#fbbf24;--erro:#f87171;--azul:#93c5fd;--roxo:#a78bfa;--painel:rgba(255,255,255,.035)`;

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
.item[data-t="roxo"] > svg{color:var(--roxo)}
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

    // Painel da Auditoria no topo do tópico (só membros da AF): saudação, situação e o botão do carimbo.
    // Em espaço estreito (pela largura do próprio painel, ou da tela nos navegadores antigos) ele empilha.
    const PAINEL_ESTREITO = `
  .painel{flex-direction:column;align-items:stretch;gap:14px;padding:14px 14px 16px}
  .direita{display:contents}
  .brasao{position:absolute;top:10px;right:10px;width:44px;height:44px;opacity:.9}
  .pessoa{padding-right:44px;gap:12px}
  .boneco{width:64px;height:76px}
  .kicker-mais{display:none}
  .ola{font-size:17px}
  .btn-carimbo{width:100%}`;
    const CSS_PAINEL = CSS_BASE + `
.moldura{container-type:inline-size;container-name:painel}
.painel{${VARS_CLARO};position:relative;overflow:hidden;display:flex;align-items:center;gap:18px;margin:0 0 16px;padding:16px 20px;
  border:1px solid var(--borda);border-radius:16px;background:var(--fundo);color:var(--texto);
  font-family:Poppins,'Segoe UI',system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.45;text-align:left;
  box-shadow:0 1px 2px rgba(15,23,42,.04);animation:surge .35s ease both}
.painel[data-tema="escuro"]{${VARS_ESCURO};box-shadow:0 18px 30px -24px rgba(0,0,0,.8)}
.aura{position:absolute;right:-70px;top:-90px;width:280px;height:280px;border-radius:50%;pointer-events:none;
  background:radial-gradient(closest-side,rgba(34,164,71,.16),rgba(34,164,71,0))}
.pessoa{position:relative;z-index:1;display:flex;align-items:center;gap:16px;flex:1;min-width:0}
.boneco{flex:none;width:76px;height:88px;border-radius:14px;display:flex;align-items:flex-start;justify-content:center;overflow:hidden;
  background:linear-gradient(180deg,rgba(34,164,71,.06),rgba(34,164,71,.2));box-shadow:inset 0 0 0 1px var(--verde-borda)}
.boneco img{width:64px;height:110px;flex:none;margin-top:4px;image-rendering:pixelated}
.texto{min-width:0}
.kicker{margin:0;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--verde-forte)}
.ola{margin:3px 0 0;font-size:19px;font-weight:600;line-height:1.3;color:var(--forte);overflow-wrap:anywhere}
.ola .cargo{color:var(--verde-forte)}
.ola b{font-weight:800}
.info{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:7px;font-size:12.5px;color:var(--suave)}
.info .item{display:inline-flex;align-items:center;gap:6px}
.info svg{width:15px;height:15px;color:var(--icone)}
.info [data-t="aviso"]{color:var(--forte)}
.info [data-t="aviso"] svg{color:var(--aviso)}
.info [data-t="ok"] svg{color:var(--ok)}
.info [data-t="erro"] svg{color:var(--erro)}
.direita{position:relative;z-index:1;align-self:flex-start;display:flex;align-items:center;gap:14px;flex:none}
.brasao{width:64px;height:64px;object-fit:contain;flex:none;pointer-events:none;filter:drop-shadow(0 8px 14px rgba(21,128,61,.25))}
@media (max-width:640px){${PAINEL_ESTREITO}}
@container painel (max-width:760px){${PAINEL_ESTREITO}}`;

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
/* negativa que não deveria valer (carreira depois do período ou expulsão por meta): roxo */
.chip[data-flag="carreira"],.chip[data-flag="expulso"],.leg[data-flag="carreira"],.leg[data-flag="expulso"]{--fc:124,58,237}
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
.toast{display:flex;align-items:center;gap:12px}
.toast-acao{appearance:none;border:0;cursor:pointer;flex:none;padding:7px 12px;border-radius:8px;background:linear-gradient(180deg,#22a55a,#15803d);color:#fff;
  font:600 13px Poppins,system-ui,sans-serif;white-space:nowrap}
.toast-acao:hover{filter:brightness(1.08)}
/* carimbo de atualização */
.resumo span[data-t="ok"]{background:var(--b-apr-f);color:var(--b-apr-t)}
.resumo span[data-t="neg"]{background:var(--b-neg-f);color:var(--b-neg-t)}
.resumo span[data-t="can"]{background:var(--b-can-f);color:var(--b-can-t)}
.resumo span[data-t] b{color:inherit}
.pilha{display:grid;gap:16px}
.nota-resumo{margin:8px 0 0;font-size:12.5px;color:var(--suave)}
.vitrine{padding:22px 12px 16px;border-radius:14px;background:#eef1f4;box-shadow:inset 0 0 0 1px var(--linha);overflow-x:auto}
.vitrine[data-tema="escuro"]{background:#16191d}
.vitrine img{max-width:none;display:inline-block}
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
    // Painel da Auditoria e carimbo de atualização (situação do tópico vinda da planilha)
    const CARIMBO = {
      ui: null, estado: 'parado', dados: null, erro: '', quando: 0, pendentes: null, desvio: 0, versao: 0, sujo: false,
      promessa: null, timer: null, avisado: false, avisoAdiado: false, pulsar: false
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

    /* ---------- conferência das negativas ---------- */
    const dataCurta = d => `${dois(d.getDate())} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
    const dataDeIso = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    // Negativa que passa pela conferência da data de carreira (as correções e as temporárias não).
    function negativaConferida(reg) {
      const mot = motivoDoTexto(reg.motivo);
      return Number(reg.numero) < 0 && !!mot.id && mot.id !== 'correcao' && !mot.interno && !ALVO.interno;
    }
    const metaNegativa = reg => { const mot = motivoDoTexto(reg.motivo); return mot.id === 'nao-meta' && !mot.interno && !ALVO.interno; };

    /* ---------- tópicos de requerimentos (mesma origem, como na Escala de Dados de Pesquisa) ---------- */
    const REQ = { leitor: null, topicos: new Map() };
    const leitor = () => REQ.leitor || (REQ.leitor = criarLeitor());
    async function buscarHtml(url) {
      let ultimo = null;
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 30000);
        try {
          const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store', signal: ctl.signal });
          clearTimeout(timer);
          if (r.status === 404) { const e = new Error('página não encontrada'); e.status = 404; throw e; }
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return await r.text();
        } catch (e) {
          clearTimeout(timer);
          ultimo = e;
          if (e.status === 404) throw e;
          await espera(600 * (tentativa + 1));
        }
      }
      throw ultimo || new Error('falha ao ler ' + url);
    }
    const docDoHtml = html => new DOMParser().parseFromString(html, 'text/html');
    const urlPaginaReq = (T, off) => '/t' + T.tid + (off ? 'p' + off : '') + '-' + (T.slug || '');
    function montarPaginaReq(T, off, doc) {
      const { N: LN, D: LD } = leitor();
      const url = urlPaginaReq(T, off);
      const mensagens = LD.mensagensDaPagina(doc, { urlBase: url }).filter(m => !(off && T.primeira && m.id === T.primeira));
      const h = LN.hoje();
      let ant = null;
      mensagens.forEach(m => {
        if (m.dia == null) {
          const t = LN.primeiraData(m.linhas.map(LN.tirarMarcas).join(' '));
          m.dia = t != null && t <= h + 1 && t > LN.dia(2015, 0, 1) ? t : ant;
        }
        if (m.dia != null) ant = m.dia;
      });
      const dias = mensagens.map(m => m.dia).filter(x => x != null);
      return { off, url, mensagens, primeiro: dias.length ? Math.min(...dias) : null, ultimo: dias.length ? Math.max(...dias) : null };
    }
    function abrirTopicoReq(tid) {
      if (REQ.topicos.has(tid)) return REQ.topicos.get(tid);
      const p = (async () => {
        const { D: LD } = leitor();
        const doc = docDoHtml(await buscarHtml('/t' + tid + '-'));
        const pg = LD.paginacao(doc, tid);
        const T = { tid, slug: pg.slug, offsets: pg.offsets, paginas: new Map() };
        const p0 = montarPaginaReq(T, 0, doc);
        T.primeira = p0.mensagens[0] ? p0.mensagens[0].id : '';
        T.paginas.set(0, Promise.resolve(p0));
        return T;
      })();
      REQ.topicos.set(tid, p);
      p.catch(() => REQ.topicos.delete(tid));
      return p;
    }
    function paginaReq(T, off) {
      if (T.paginas.has(off)) return T.paginas.get(off);
      const p = buscarHtml(urlPaginaReq(T, off)).then(html => montarPaginaReq(T, off, docDoHtml(html)));
      T.paginas.set(off, p);
      p.catch(() => T.paginas.delete(off));
      return p;
    }
    // Primeira página com mensagens a partir do dia alvo (busca binária pelas datas).
    async function primeiraPaginaReq(T, alvo) {
      let lo = 0, hi = T.offsets.length - 1, resp = hi;
      while (lo <= hi) {
        const meio = (lo + hi) >> 1;
        const pg = await paginaReq(T, T.offsets[meio]);
        if (pg.ultimo == null) { resp = Math.min(resp, meio); hi = meio - 1; continue; }
        if (pg.ultimo >= alvo) { resp = meio; hi = meio - 1; } else lo = meio + 1;
      }
      return resp;
    }
    // Mensagens postadas entre os dias de e ate (dias da Escala: dias desde 01/01/1970).
    async function mensagensEntre(tid, de, ate) {
      const T = await abrirTopicoReq(tid);
      const i0 = await primeiraPaginaReq(T, de);
      const lidas = [];
      for (let i = i0; i < T.offsets.length; i += 3) {
        const pgs = await Promise.all(T.offsets.slice(i, i + 3).map(off => paginaReq(T, off)));
        pgs.forEach(pg => lidas.push(pg));
        if (pgs.some(pg => pg.primeiro != null && pg.primeiro > ate)) break;
      }
      const mensagens = [], vistos = new Set();
      lidas.forEach(pg => pg.mensagens.forEach(m => {
        if (vistos.has(m.id)) return;
        vistos.add(m.id);
        if (m.dia != null && m.dia >= de && m.dia <= ate) mensagens.push(m);
      }));
      // Os tópicos apagam ou arquivam as mensagens antigas: a 2ª mensagem diz desde quando há registros.
      const p0 = await paginaReq(T, 0);
      const segunda = p0.mensagens[1] || (T.offsets.length > 1 ? (await paginaReq(T, T.offsets[1])).mensagens[0] : null);
      return { T, mensagens, inicioTopico: segunda && segunda.dia != null ? segunda.dia : null };
    }

    // Cartões com o rótulo numa linha e o valor nas seguintes ("NICKNAME" / "Fulano" / "Beltrano"),
    // como os da Auditoria e do ECE, viram "Nickname: Fulano / Beltrano", como os requerimentos de texto.
    const ROTULOS_CARTAO = /^(nicknames?|nickname\(s\)|nicks?|nick\(s\)|membros?|membro\(s\)|policia(?:l|is)|policial\(is\)|cargo|cargo atual|novo cargo|motivos?|motivo\(s\)|permissao|data|quantidade de dias|dias|provas?|prova\(s\)|nickname atual|novo nickname|migrando para o|observacao|observacoes)$/;
    function linhasDeCartao(linhas) {
      const { N: LN } = leitor();
      const rotulo = l => {
        const t = LN.tirarMarcas(l);
        return t && t.length <= 30 && !/[:a-z]/.test(LN.semAcento(t)) && ROTULOS_CARTAO.test(LN.norm(t)) ? t : '';
      };
      const out = [];
      for (let i = 0; i < linhas.length; i++) {
        const r = rotulo(linhas[i]);
        if (!r) { out.push(linhas[i]); continue; }
        const valores = [];
        let j = i + 1;
        for (; j < linhas.length && linhas[j] !== '{{hr}}' && !rotulo(linhas[j]); j++) {
          const v = LN.tirarMarcas(linhas[j]).replace(/^\s*(?:\u2192|>)\s*$/, '');
          if (v) valores.push(v);
        }
        if (!valores.length) { out.push(linhas[i]); continue; }
        const nick = /^(nick|membro|policia)/.test(LN.norm(r));
        out.push(r.charAt(0) + r.slice(1).toLowerCase() + ': ' + valores.join(nick ? ' / ' : ' '));
        i = j - 1;
      }
      return out;
    }

    // Motivo de não cumprimento de meta, escrito de vários jeitos: "Não cumpriu com sua meta 2x em sequência",
    // "Não cumprimento da meta em duas semanas seguidas", "Abandono de Dever, reincidência em não cumprimento
    // da meta semanal", "Negativou duas vezes ao mês", "Não cumpriu as obrigações semanais".
    function motivoDeMeta(texto) {
      const t = leitor().N.norm(texto);
      if (/\bmetas?\b|negativ/.test(t)) return true;
      return /\bcumpri/.test(t) && /semana|semanal|consecutiv|seguid|sequencia|reincid|obrigac/.test(t) && !/prazo|capacitac|graduac|aula|curso/.test(t);
    }
    // Expulsões dos policiais no tópico de requerimentos do grupo, nos dias depois do fim do período.
    async function expulsoesDepois(reg, nicks) {
      const tid = topicoRequerimentos(GRUPO);
      if (!tid) return { estado: 'sem-topico' };
      const per = interpretarPeriodo(reg.periodo);
      if (!per) return { estado: 'sem-periodo' };
      const { N: LN } = leitor();
      const fim = LN.dia(per.fim.getFullYear(), per.fim.getMonth(), per.fim.getDate());
      const de = fim + 1, ate = fim + Math.max(1, Number(NEGATIVAS.EXPULSAO_JANELA_DIAS) || 7);
      const hoje = LN.hoje();
      const base = { tid, de, ate, deTexto: LN.fmtDia(de), ateTexto: LN.fmtDia(ate) };
      if (hoje < de) return Object.assign({ estado: 'cedo' }, base);
      // Lê uma semana a mais para pegar o cancelamento de uma expulsão postado depois.
      const lido = await mensagensEntre(tid, de, Math.min(hoje, ate + 7));
      const eventos = [];
      lido.mensagens.forEach(m => {
        const msg = Object.assign({}, m, { linhas: linhasDeCartao(m.linhas || []), citacoes: (m.citacoes || []).map(linhasDeCartao) });
        LN.eventosDaMensagem(msg).forEach(e => { e.msg = msg; eventos.push(e); });
      });
      LN.marcarCancelamentos(eventos);
      const raiz = LN.apelidos(eventos);
      const alvos = new Map(nicks.map(n => [raiz(LN.chaveNick(n)), n]));
      const porNick = new Map();
      eventos.forEach(e => {
        if (!e.chave || e.dia == null || e.dia < de || e.dia > ate) return;
        if (!['expulsao', 'fiscalizacao', 'exoneracao'].includes(e.tipo)) return;
        const nick = alvos.get(raiz(e.chave));
        if (!nick) return;
        // Na fiscalização (uma pessoa por linha) o motivo está na linha do policial.
        const linha = e.fiscalizacao ? (e.msg.linhas.find(l => LN.citaNick(l, e.nick)) || '') : '';
        const motivo = LN.tirarMarcas(linha || e.motivo || '') || LN.tirarMarcas((e.msg.linhas || []).join(' ')).slice(0, 300);
        const item = { nick, dia: e.dia, data: new Date(LN.partes(e.dia).a, LN.partes(e.dia).m, LN.partes(e.dia).d), post: e.post, url: e.url, motivo, meta: motivoDeMeta(motivo), cancelado: !!e.cancelado };
        const ant = porNick.get(LN.chaveNick(nick));
        const peso = x => (x.cancelado ? 0 : x.meta ? 2 : 1);
        if (!ant || peso(item) > peso(ant)) porNick.set(LN.chaveNick(nick), item);
      });
      return Object.assign({ estado: 'ok', porNick, parcial: hoje < ate, inicioTopico: lido.inicioTopico, antigo: lido.inicioTopico != null && lido.inicioTopico > de }, base);
    }

    // Data de carreira (negativas): a carreira começou depois do fim do período, então a negativa não vale.
    // Só sinaliza (roxo); quem cancela é o auditor.
    function itemCarreira(car, per, marcar) {
      const titulo = 'Data de carreira';
      if (!per) return { t: 'aviso', titulo, texto: 'O período de referência não foi entendido, então a data de carreira não foi conferida.' };
      if (!car) return { t: 'aviso', titulo, texto: 'O Apps Script ainda não devolve a data de carreira. Publique a versão nova da implantação.' };
      const lista = car.lista || [];
      if (!lista.some(x => x.inicio) && car.erro) return { t: 'aviso', titulo, texto: `Não deu para conferir: ${car.erro}.` };
      const depois = [], durante = [], sem = [];
      lista.forEach(x => {
        const ini = dataDeIso(x.inicio);
        if (!ini) { if (x.encontrado !== false) sem.push(x.consulta); return; }
        const quando = dataCurta(ini) + (x.exata ? '' : ' (calculada pelo tempo de carreira)');
        if (ini > per.fim) {
          depois.push(`${x.consulta}: carreira iniciada em ${quando}, depois do período`);
          marcar(x.consulta, 'carreira', `Carreira iniciada em ${quando}, depois do período`);
        } else if (ini > per.ini) {
          durante.push(`${x.consulta}: carreira iniciada em ${quando}, no meio do período`);
          marcar(x.consulta, 'parcial', `Carreira iniciada em ${quando}, no meio do período`);
        }
      });
      const extra = (sem.length ? ` ${juntarE(sem)} ${sem.length === 1 ? 'ficou' : 'ficaram'} sem conferir.` : '') + (car.erro ? ` ${car.erro.charAt(0).toUpperCase() + car.erro.slice(1)}.` : '');
      if (depois.length) {
        return {
          t: 'roxo', titulo, lista: depois.concat(durante),
          texto: `${plural(depois.length, 'policial começou', 'policiais começaram')} a carreira depois do período: confira, a negativa não deveria valer para ${depois.length === 1 ? 'ele' : 'eles'}.` + extra
        };
      }
      if (durante.length) return { t: 'aviso', titulo, lista: durante, texto: `${plural(durante.length, 'policial começou', 'policiais começaram')} a carreira durante o período.` + extra };
      return { t: extra ? 'aviso' : 'ok', titulo, texto: 'Todos já estavam na carreira durante o período.' + extra };
    }

    // Não cumprimento de meta: quem foi expulso por não cumprimento de meta logo depois do período já é punido
    // pela expulsão. Só sinaliza (roxo); quem cancela é o auditor.
    function itemExpulsao(ex, marcar) {
      const titulo = 'Expulsão por meta';
      if (!ex || ex.estado === 'erro') return { t: 'aviso', titulo, texto: `Não deu para ler o tópico de requerimentos de ${GRUPO.nome}: ${(ex && ex.erro) || 'erro desconhecido'}.` };
      if (ex.estado === 'sem-topico') return { t: 'info', titulo, texto: `${GRUPO.nome} não tem tópico de requerimentos cadastrado, então as expulsões não foram conferidas.` };
      if (ex.estado === 'sem-periodo') return { t: 'aviso', titulo, texto: 'O período de referência não foi entendido, então as expulsões não foram conferidas.' };
      const topico = `/t${ex.tid}-`;
      const janela = `de ${ex.deTexto} a ${ex.ateTexto}`;
      if (ex.estado === 'cedo') return { t: 'info', titulo, texto: `As expulsões são procuradas ${janela}, nos requerimentos de ${GRUPO.nome}. Essa semana ainda não começou.`, link: topico };
      const meta = [], outros = [], cancelados = [];
      let link = '';
      ex.porNick.forEach(x => {
        const motivo = x.motivo.length > 150 ? x.motivo.slice(0, 147).trim() + '...' : x.motivo;
        if (x.cancelado) { cancelados.push(`${x.nick}: a expulsão de ${dataCurta(x.data)} foi cancelada`); return; }
        if (x.meta) {
          meta.push(`${x.nick}: expulso em ${dataCurta(x.data)} (${motivo})`);
          marcar(x.nick, 'expulso', `Expulso por não cumprimento de meta em ${dataCurta(x.data)}`);
          if (!link) link = x.url;
        } else outros.push(`${x.nick}: expulso em ${dataCurta(x.data)} por outro motivo (${motivo}), a negativa continua valendo`);
      });
      const notas = [];
      if (ex.antigo) notas.push(`o tópico de requerimentos só tem mensagens desde ${leitor().N.fmtDia(ex.inicioTopico)}`);
      if (ex.parcial) notas.push('a semana depois do período ainda não terminou, fiscalize de novo depois');
      const nota = notas.length ? ` Atenção: ${notas.join('; ')}.` : '';
      if (meta.length) {
        return {
          t: 'roxo', titulo, lista: meta.concat(outros, cancelados), link: link || topico,
          texto: `${plural(meta.length, 'policial foi expulso', 'policiais foram expulsos')} por não cumprimento de meta ${janela}: confira, a negativa de meta não deveria valer para ${meta.length === 1 ? 'ele' : 'eles'}.` + nota
        };
      }
      return { t: notas.length ? 'aviso' : outros.length ? 'info' : 'ok', titulo, lista: outros.concat(cancelados), link: topico, texto: `Ninguém foi expulso por não cumprimento de meta ${janela}.` + nota };
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
        // Negativas: a data de carreira vem do servidor (Atlas) e as expulsões do tópico de requerimentos do grupo.
        const negativa = negativaConferida(reg), porMeta = metaNegativa(reg);
        const pExpulsoes = porMeta ? expulsoesDepois(reg, nicks).catch(e => ({ estado: 'erro', erro: e.message })) : null;
        const r = await api('fiscalizar', {
          grupo: GRUPO.nome, id, usuario: USUARIO, sigla: GRUPO.id, carreira: negativa,
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

        // e) data de carreira e f) expulsão por meta (negativas), no alto do relatório
        const primeiros = [];
        if (negativa) primeiros.push(itemCarreira(r.carreira, per, marcar));
        if (pExpulsoes) primeiros.push(itemExpulsao(await pExpulsoes, marcar));
        res.itens.unshift(...primeiros);
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
      if (f.estado === 'carregando') {
        const partes = ['RCCSystem'];
        if (negativaConferida(st.registro)) partes.push('data de carreira');
        if (metaNegativa(st.registro)) partes.push('expulsões');
        partes.push('porcentagem', 'teto', 'regras');
        return `<div class="fisc"><div class="carregando">${ICONE.girar}Fiscalizando: ${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}...</div></div>`;
      }
      if (f.estado === 'erro') return `<div class="fisc"><div class="item" data-t="erro">${ICONE.alerta}<div><b>Não deu para fiscalizar</b><p>${esc(f.erro)}</p></div></div></div>`;
      const r = f.resultado;
      const icone = t => (t === 'ok' ? ICONE.ok : t === 'erro' ? ICONE.nao : t === 'info' ? ICONE.info : t === 'roxo' ? ICONE.proibido : ICONE.alerta);
      const itens = r.itens.map(i => `<div class="item" data-t="${i.t}">${icone(i.t)}<div><b>${esc(i.titulo)}</b> <p>${esc(i.texto)}${i.link ? ` <a href="${esc(i.link)}" target="_blank" rel="noopener">abrir fonte</a>` : ''}</p>${i.lista && i.lista.length ? ` <ul>${i.lista.map(x => `<li>${esc(x)}</li>`).join(' ')}</ul>` : ''}</div></div>`).join('\n');
      return `<div class="fisc"><div class="fisc-topo">${ICONE.escudo}Fiscalização <small>${esc(dois(r.quando.getHours()) + ':' + dois(r.quando.getMinutes()))}</small><button type="button" class="ver refazer" data-acao="refazer">${ICONE.desfazer}refazer</button></div>${itens}</div>`;
    }

    // Problemas da fiscalização, do mais grave ao mais leve, com a cor de cada um (r,g,b).
    // Roxo: a negativa não deveria valer (carreira depois do período ou expulsão por meta). O auditor confere e cancela.
    const ORDEM_FLAGS = ['carreira', 'expulso', 'rcc', 'teto', 'dup', 'parcial', 'porc'];
    const NOME_FLAG = { carreira: 'Antes da carreira', expulso: 'Expulso por meta', rcc: 'RCCSystem', teto: 'Teto', dup: 'Repetido', parcial: 'Carreira no período', porc: 'Porcentagem' };
    const COR_FLAG = { carreira: '124,58,237', expulso: '124,58,237', rcc: '239,68,68', teto: '245,158,11', dup: '245,158,11', parcial: '245,158,11', porc: '59,130,246' };
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
      // Só as etiquetas da seção POLICIAIS (o responsável pode ter o mesmo nick de um policial).
      const rotulo = [...st.content.querySelectorAll('td')].find(td => !td.querySelector('td') && /^policiais(\s|$)/.test(normal(td.textContent)));
      let secao = rotulo && rotulo.closest('table');
      secao = secao && secao.nextElementSibling;
      while (secao && secao.tagName !== 'TABLE') secao = secao.nextElementSibling;
      (secao || st.content).querySelectorAll('td').forEach(td => {
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
      // Aviso de "tópico sem pendentes" que chegou com um modal aberto aparece agora.
      if (CARIMBO.avisoAdiado) { CARIMBO.avisoAdiado = false; setTimeout(mostrarAvisoPronto, 350); }
    }
    // acao: { texto, fn } põe um botão no aviso. Avisos ao mesmo tempo ficam um embaixo do outro.
    const TOASTS = [];
    function toast(msg, tipo, ms = 3200, acao) {
      const host = document.createElement('div');
      host.className = 'af-cofre-toast';
      document.body.appendChild(host);
      const raiz = host.attachShadow({ mode: 'open' });
      raiz.innerHTML = `<style>${CSS_MODAL}</style><div class="toast" role="status" data-t="${tipo || 'ok'}"><span>${esc(msg)}</span>${acao ? `<button type="button" class="toast-acao">${esc(acao.texto)}</button>` : ''}</div>`;
      const caixa = raiz.querySelector('.toast');
      const abaixo = TOASTS.reduce((m, t) => Math.max(m, t.getBoundingClientRect().bottom), 0);
      if (abaixo) caixa.style.top = Math.round(abaixo + 8) + 'px';
      TOASTS.push(caixa);
      const tirar = () => { host.remove(); const i = TOASTS.indexOf(caixa); if (i >= 0) TOASTS.splice(i, 1); };
      if (acao) raiz.querySelector('.toast-acao').addEventListener('click', () => { tirar(); acao.fn(); });
      setTimeout(tirar, ms);
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
            if (e.target.closest('[data-fiscalizar]')) { fiscalizar(id).then(() => { if (modalAtual === m && !A.enviando) desenhar(); }); desenhar(); }
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
          if (p.estado === 'cancelado' && !p.motivo && f.length) {
            // o sinal roxo (carreira ou expulsão por meta) vira o motivo do cancelamento
            const roxo = f.find(x => x.tipo === 'carreira' || x.tipo === 'expulso');
            p.motivo = (roxo || f[0]).texto.replace(/^Porcentagem: /, 'Na porcentagem, ').replace(/^Teto: /, 'Teto: ');
          }
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
          if (!f || p.estado !== 'aprovado') return;
          const roxo = f.filter(x => x.tipo === 'carreira' || x.tipo === 'expulso');
          p.estado = 'cancelado';
          p.motivo = (roxo.length ? roxo : f).map(x => x.texto).join('; ').slice(0, 290);
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
          mudouPendentes((r.correcoes || []).length); // as correções ficam pendentes neste tópico
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
          mudouPendentes(0); // a situação do tópico é conferida de novo na planilha
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
      const antes = st && st.registro ? st.registro.status : (ESTADO.relacionados[reg.id] || {}).status;
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
      // o painel da Auditoria conta as pendentes do tópico
      if (antes === 'pendente' && reg.status !== 'pendente') mudouPendentes(-1);
      else if (antes && antes !== 'pendente' && reg.status === 'pendente') mudouPendentes(1);
    }
    function erroDecisao(id, e) {
      // Conflito: alguém mudou a postagem antes; o cartão se corrige e o modal fecha.
      if (e && e.registro) { atualizarRegistro(e.registro); fecharModal(); }
      toast((e && e.message ? e.message.charAt(0).toUpperCase() + e.message.slice(1) : 'Não deu certo.'), 'erro', 6000);
    }

    /* ==================================================================
       PAINEL DA AUDITORIA E CARIMBO DE ATUALIZAÇÃO
       Só para membros da Auditoria Fiscal. O painel fica no topo do tópico:
       saudação com o cargo e o avatar, a situação do tópico e, no canto
       superior direito, o botão do carimbo e o brasão. O carimbo é uma
       mensagem no tópico que marca até onde ele foi atualizado.
       ================================================================== */
    const FUSO = 'America/Sao_Paulo';
    const CAIXA_BRASAO_CARIMBO = 96;
    const CHAVE_CARIMBOS = 'af-cofre:carimbos-pendentes';
    const frase = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    // Avatar de corpo inteiro (o mesmo endereço da cabeça, sem o headonly)
    const avatarCorpo = nick => CFG.AVATAR.replace(/([?&])headonly=1(&|$)/, (_, a, b) => (b ? a : '')).replace('{nick}', encodeURIComponent(nick));
    const subgruposDoGrupo = () => (GRUPO.subgrupos || []).map(s => partesSubgrupo(s).nome);
    const brasaoCarimbo = () => (grupoPorId('AF') || {}).brasao || CFG.BRASAO_AF;

    // Cargo na Auditoria a partir das tarefas do RCCSystem (A.AF, VL.AF...), com o nome da hierarquia do núcleo.
    function cargoNaAF(tarefas) {
      const af = grupoPorId('AF');
      if (!af || !Array.isArray(tarefas)) return '';
      let maior = -1;
      tarefas.forEach(t => {
        const i = af.cargos.findIndex(cg => normal(cg.sigla) === normal(t));
        if (i > maior) maior = i;
      });
      return maior >= 0 ? af.cargos[maior].nome : '';
    }

    // Data e hora no horário de Brasília, qualquer que seja o fuso do computador.
    function partesData(d) {
      try {
        const p = {};
        new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
          .formatToParts(d).forEach(x => { p[x.type] = x.value; });
        return { d: +p.day, m: +p.month - 1, y: +p.year, h: +p.hour % 24, mi: +p.minute, s: +p.second };
      } catch (_) {
        return { d: d.getDate(), m: d.getMonth(), y: d.getFullYear(), h: d.getHours(), mi: d.getMinutes(), s: d.getSeconds() };
      }
    }
    function dataCarimbo(d) {
      const p = partesData(d);
      return { data: `${dois(p.d)} ${MESES[p.m]} ${p.y}`, hora: `${dois(p.h)}:${dois(p.mi)}:${dois(p.s)}` };
    }
    function quandoCurto(iso) {
      const d = iso ? new Date(iso) : null;
      if (!d || isNaN(d)) return '';
      const p = partesData(d);
      return `${dois(p.d)} ${MESES[p.m]} ${p.y} às ${dois(p.h)}:${dois(p.mi)}`;
    }
    // Relógio do servidor, se o do computador estiver muito errado.
    const agoraServidor = () => new Date(Date.now() + (Math.abs(CARIMBO.desvio) > 120000 ? CARIMBO.desvio : 0));

    /* ---------- BBCode do carimbo (mesmo jeito das postagens do cofre) ---------- */
    const bb0 = (margem = '0') => `border:none!important;border-collapse:separate;border-spacing:0;width:100%;margin:${margem}`;
    const BB0 = bb0();
    const BBA = 'border:none!important;border-collapse:separate;border-spacing:0;width:auto;margin:0';
    const TR0 = 'border:none!important';
    const FONTE = 'font-family:Poppins,sans-serif';
    const bbT = (estilo, miolo, extra = '') => `[table style="${estilo}"${extra}]${miolo}[/table]`;
    const bbR = (miolo, estilo) => `[tr style="${TR0}${estilo ? ';' + estilo : ''}"]${miolo}[/tr]`;
    const bbD = (estilo, miolo) => `[td style="${/text-align/.test(estilo) ? estilo : estilo + ';text-align:left'}"]${miolo}[/td]`;

    function modeloCarimbo({ quando, resumo, pendentes }) {
      const dt = dataCarimbo(quando);
      const cargo = cargoNaAF(ESTADO.permissao.tarefas);
      return {
        tema: TEMA_AF,
        brasao: brasaoCarimbo(),
        kicker: ALVO.interno ? 'COFRE DE MEDALHAS TEMPORÁRIAS' : 'COFRE DE MEDALHAS',
        titulo: 'Carimbo de Atualização',
        sub: `${GRUPO.nome} · tópico atualizado até esta mensagem`,
        auditor: limparBB(USUARIO),
        cargo: limparBB(cargo ? `${cargo} da Auditoria Fiscal` : 'Auditoria Fiscal'),
        avatar: avatar(USUARIO),
        data: dt.data,
        hora: dt.hora,
        resumo: resumo || null,
        pendentes: pendentes == null ? null : pendentes
      };
    }

    function gerarCarimbo(m) {
      const t = m.tema;
      const br = imagemBB(m.brasao, CAIXA_BRASAO_CARIMBO);
      const sobe = Math.round(br.h * .42);
      const rotulo = txt => bbD(`border:none!important;padding:0;${FONTE};text-align:left;color:${t.destaque};font-size:11px;font-weight:700;line-height:16px;letter-spacing:.14em`, txt);

      // título com o selo de conferido logo depois do texto (acompanha a última palavra quando o título quebra);
      // brasão no canto superior direito, saindo um pouco do cartão
      const selo = bbT(`border:none!important;border-collapse:separate;border-spacing:0;display:inline-table;width:auto;margin:0 0 0 10px;vertical-align:-3px`,
        bbR(bbD(`border:none!important;box-sizing:content-box;width:24px;height:24px;padding:0;border-radius:999px;background:${t.destaque};box-shadow:0 0 0 4px ${t.brilho};${FONTE};text-align:center;vertical-align:middle;color:${t.fundo};font-size:14px;font-weight:800;line-height:24px`, '✓')));
      const titulo = bbT(BB0.replace('margin:0', 'margin:3px 0 0'), bbR(
        bbD(`border:none!important;padding:0;${FONTE};text-align:left;vertical-align:middle;color:#FFFFFF;font-size:22px;font-weight:800;line-height:30px;letter-spacing:-.01em`, m.titulo + selo)));
      const cabecalho = bbT(BB0, bbR(
        bbD(`border:none!important;padding:18px 8px 0 22px;vertical-align:top;${FONTE};text-align:left`,
          bbT(BB0,
            bbR(bbD(`border:none!important;padding:0;${FONTE};text-align:left;color:${t.destaque};font-size:11px;font-weight:700;line-height:16px;letter-spacing:.18em`, m.kicker)) +
            bbR(bbD('border:none!important;padding:0;text-align:left', titulo)) +
            bbR(bbD(`border:none!important;padding:5px 0 0;${FONTE};text-align:left;color:${t.suave};font-size:13px;font-weight:500;line-height:19px`, m.sub)))) +
        bbD(`border:none!important;box-sizing:content-box;width:${br.w}px;padding:0 20px 0 0;vertical-align:top`,
          bbT(`${BBA.replace('margin:0', `margin:-${sobe}px 0 0`)};position:relative`,
            bbR(bbD(`border:none!important;box-sizing:content-box;width:${br.w}px;padding:0;line-height:0`, br.bb))))));

      // responsável (cabeça do avatar num círculo, nick e cargo) e a data
      const foto = bbT(BBA, bbR(bbD(`border:none!important;box-sizing:content-box;width:64px;height:64px;padding:0;border-radius:999px;background:${t.chip};box-shadow:inset 0 0 0 2px ${t.linha};text-align:center;vertical-align:bottom;line-height:0`, `[img]${m.avatar}[/img]`)));
      const pessoa = bbT(BBA, bbR(
        bbD('border:none!important;box-sizing:content-box;width:64px;padding:0 14px 0 0;vertical-align:middle;text-align:left;line-height:0', foto) +
        bbD(`border:none!important;padding:0;vertical-align:middle;${FONTE};text-align:left`, bbT(BB0,
          bbR(rotulo('RESPONSÁVEL')) +
          bbR(bbD(`border:none!important;padding:2px 0 0;${FONTE};text-align:left;color:#FFFFFF;font-size:17px;font-weight:700;line-height:23px;overflow-wrap:anywhere`, m.auditor)) +
          bbR(bbD(`border:none!important;padding:1px 0 0;${FONTE};text-align:left;color:${t.suave};font-size:12.5px;font-weight:500;line-height:18px`, m.cargo))))));
      const quando = bbT(BBA,
        bbR(rotulo('DATA E HORÁRIO')) +
        bbR(bbD(`border:none!important;padding:2px 0 0;${FONTE};text-align:left;color:#FFFFFF;font-size:17px;font-weight:700;line-height:23px;white-space:nowrap`, m.data)) +
        bbR(bbD(`border:none!important;padding:1px 0 0;${FONTE};text-align:left;color:${t.suave};font-size:13px;font-weight:600;line-height:18px;letter-spacing:.04em;white-space:nowrap`, m.hora)));
      const dados = bbT(`${BB0};border-top:1px solid ${t.linha}!important`, bbR(
        bbD('border:none!important;flex:1 1 250px;min-width:0;padding:16px 0 0;vertical-align:middle;text-align:left', pessoa) +
        bbD('border:none!important;flex:0 1 auto;min-width:0;padding:16px 0 0;vertical-align:middle;text-align:left', quando),
        'display:flex;flex-wrap:wrap;align-items:center;column-gap:28px;row-gap:4px'));

      // o que foi decidido desde o carimbo anterior
      let resumo = '';
      if (m.resumo || m.pendentes != null) {
        const r = m.resumo || {};
        const chip = (txt, cor, fundo, anel) => bbD(`border:none!important;padding:5px 12px;border-radius:999px;background:${fundo};box-shadow:inset 0 0 0 1px ${anel};${FONTE};text-align:center;color:${cor};font-size:13px;font-weight:600;line-height:18px;white-space:nowrap`, txt);
        const chips = [];
        if (r.aprovadas) chips.push(chip(`${r.aprovadas} ${r.aprovadas === 1 ? 'aprovada' : 'aprovadas'}`, '#86EFAC', 'rgba(74,222,128,.12)', 'rgba(74,222,128,.35)'));
        if (r.negadas) chips.push(chip(`${r.negadas} ${r.negadas === 1 ? 'negada' : 'negadas'}`, '#FCA5A5', 'rgba(248,113,113,.12)', 'rgba(248,113,113,.35)'));
        if (r.canceladas) chips.push(chip(`${r.canceladas} ${r.canceladas === 1 ? 'cancelada' : 'canceladas'}`, 'rgba(255,255,255,.82)', 'rgba(255,255,255,.07)', 'rgba(255,255,255,.2)'));
        if (m.pendentes) chips.push(chip(`${m.pendentes} ${m.pendentes === 1 ? 'pendente' : 'pendentes'}`, '#FCD34D', 'rgba(251,191,36,.12)', 'rgba(251,191,36,.38)'));
        if (!chips.length) chips.push(chip('Nenhuma decisão nova', t.suave, t.chip, t.linha));
        resumo = bbT(bb0('18px 0 0'), bbR(rotulo('NESTA ATUALIZAÇÃO'))) + bbT(bb0('8px 0 0'), bbR(chips.join(''), 'display:flex;flex-wrap:wrap;gap:6px'));
      }

      const af = imagemBB(CFG.BRASAO_AF, RODAPE_CAIXA);
      const rodape = bbT(`${bb0('18px 0 0')};border-top:1px solid ${t.linha}!important`, bbR(
        bbD(`border:none!important;box-sizing:content-box;width:${af.w}px;padding:14px 8px 0 0;vertical-align:middle;text-align:left;line-height:0`, af.bb) +
        bbD(`border:none!important;padding:14px 0 0 4px;vertical-align:middle;${FONTE};text-align:left;color:${t.suave};font-size:10px;font-weight:700;line-height:14px;letter-spacing:.22em`, 'AUDITORIA FISCAL')));

      const cartao = bbT(`border:none!important;border-collapse:separate;border-spacing:0;width:100%;margin:0;border-radius:16px;border:2px solid ${t.borda}!important;box-shadow:inset 0 70px 60px -60px ${t.brilho},0 18px 30px -20px rgba(0,0,0,.55)`,
        bbR(bbD('border:none!important;padding:0', cabecalho)) +
        bbR(bbD('border:none!important;padding:14px 22px 20px', dados + resumo + rodape)),
        ` bgcolor="${t.fundo}"`);
      return bbT(`border:none!important;border-collapse:separate;border-spacing:0;width:100%;max-width:620px;margin:0 auto;${FONTE}`, bbR(bbD(`border:none!important;padding:${sobe + 2}px 0 0`, cartao)));
    }

    // O carimbo desenhado no modal como o fórum desenha (só as marcações que ele usa).
    function bbParaHtml(bb) {
      return String(bb)
        .replace(/\[table style="([^"]*)"(?: bgcolor="([^"]*)")?\]/g, (_, s, bg) => `<table style="${s}"${bg ? ` bgcolor="${bg}"` : ''}>`)
        .replace(/\[\/table\]/g, '</table>')
        .replace(/\[tr style="([^"]*)"\]/g, '<tr style="$1">').replace(/\[\/tr\]/g, '</tr>')
        .replace(/\[td style="([^"]*)"\]/g, '<td style="$1">').replace(/\[\/td\]/g, '</td>')
        .replace(/\[img\((\d+)px,(\d+)px\)\]([^[]*)\[\/img\]/g, '<img src="$3" width="$1" height="$2" style="width:$1px;height:$2px" alt="">')
        .replace(/\[img\]([^[]*)\[\/img\]/g, '<img src="$1" alt="" referrerpolicy="no-referrer">');
    }

    /* ---------- painel ---------- */
    function montarPainel(primeiro) {
      if (CARIMBO.ui || !primeiro) return;
      const host = document.createElement('div');
      host.className = 'af-cofre-painel';
      host.style.cssText = 'display:block;clear:both;margin:0;padding:0;border:0;background:none;max-width:100%';
      primeiro.el.insertAdjacentElement('beforebegin', host);
      const raiz = host.attachShadow({ mode: 'open' });
      raiz.innerHTML = `<style>${CSS_PAINEL}</style><div class="moldura"><section class="painel" aria-label="Painel da Auditoria Fiscal"></section></div>`;
      const painel = raiz.querySelector('.painel');
      painel.addEventListener('click', e => { if (e.target.closest('[data-acao="carimbo"]')) abrirCarimbo(); });
      CARIMBO.ui = { host, raiz, painel };
      renderPainel();
    }

    // Pendentes do tópico (planilha + decisões desta página); sem a planilha, só as desta página.
    function pendentesAgora() {
      if (CARIMBO.estado === 'ok' && CARIMBO.pendentes != null) return Math.max(0, CARIMBO.pendentes);
      if (CARIMBO.estado === 'carregando') return null;
      let n = 0;
      ESTADO.posts.forEach(st => { if (st.registro && st.registro.status === 'pendente') n++; });
      return n;
    }

    function renderPainel() {
      const ui = CARIMBO.ui;
      if (!ui) return;
      const p = ui.painel;
      p.dataset.tema = ESTADO.tema;
      const cargo = cargoNaAF(ESTADO.permissao.tarefas);
      const pend = pendentesAgora();
      const daPlanilha = CARIMBO.estado === 'ok';
      const info = [];
      if (pend == null) info.push(`<span class="item">${ICONE.girar}Conferindo o tópico...</span>`);
      else if (pend) info.push(`<span class="item" data-t="aviso">${ICONE.relogio}${plural(pend, 'postagem pendente', 'postagens pendentes')} ${daPlanilha ? 'no tópico' : 'nesta página'}</span>`);
      else info.push(`<span class="item" data-t="ok">${ICONE.ok}Nenhuma pendente ${daPlanilha ? 'no tópico' : 'nesta página'}</span>`);
      const ult = CARIMBO.dados && CARIMBO.dados.ultimo;
      if (daPlanilha) info.push(`<span class="item">${ICONE.carimbo}${ult ? `Último carimbo: ${esc(quandoCurto(ult.data))}${ult.auditor ? ' por ' + esc(ult.auditor) : ''}` : 'Nenhum carimbo neste tópico ainda'}</span>`);
      else if (CARIMBO.estado === 'erro') info.push(`<span class="item" data-t="erro">${ICONE.alerta}A planilha não respondeu agora</span>`);
      if (!ui.montado) {
        // o esqueleto é montado uma vez; depois só o texto muda (o avatar e o botão não piscam)
        p.innerHTML = `<div class="aura" aria-hidden="true"></div>
          <div class="pessoa">
            <div class="boneco"><img src="${esc(avatarCorpo(USUARIO))}" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"></div>
            <div class="texto">
              <p class="kicker">Auditoria Fiscal<span class="kicker-mais"> · ${ALVO.interno ? 'cofre de medalhas temporárias' : 'cofre de medalhas'}</span></p>
              <p class="ola" data-ola></p>
              <div class="info" data-info aria-live="polite"></div>
            </div>
          </div>
          <div class="direita">
            <button type="button" class="btn btn-carimbo" data-acao="carimbo">${ICONE.carimbo}Postar carimbo de atualização</button>
            <img class="brasao" src="${esc(CFG.BRASAO_AF)}" alt="" aria-hidden="true">
          </div>`;
        ui.montado = true;
      }
      p.querySelector('[data-ola]').innerHTML = `Olá, ${cargo ? `<span class="cargo">${esc(cargo)}</span> ` : ''}<b>${esc(USUARIO)}</b>`;
      p.querySelector('[data-info]').innerHTML = info.join('');
      if (CARIMBO.pulsar) {
        // o botão chama a atenção quando o tópico fica sem pendentes
        CARIMBO.pulsar = false;
        const b = p.querySelector('[data-acao="carimbo"]');
        b.removeAttribute('data-pronto');
        void b.offsetWidth;
        b.setAttribute('data-pronto', '');
      }
    }

    // Situação do tópico na planilha: pendentes, último carimbo e decisões desde ele.
    function carregarSituacao(silencioso) {
      if (CARIMBO.promessa) return CARIMBO.promessa;
      if (!silencioso && CARIMBO.estado !== 'ok') CARIMBO.estado = 'carregando';
      renderPainel();
      const enviado = Date.now(), versao = CARIMBO.versao;
      CARIMBO.promessa = api('carimbo', { fase: 'previa', grupo: GRUPO.nome, topico: TOPICO, interno: ALVO.interno, subgrupos: subgruposDoGrupo(), usuario: USUARIO })
        .then(r => {
          const antes = pendentesAgora();
          CARIMBO.dados = r;
          CARIMBO.estado = 'ok';
          CARIMBO.erro = '';
          CARIMBO.quando = Date.now();
          const t = Date.parse(r.agora);
          if (t) CARIMBO.desvio = t - (enviado + Date.now()) / 2;
          if (versao === CARIMBO.versao) {
            CARIMBO.pendentes = Number(r.totalPendentes) || 0;
            CARIMBO.sujo = false;
            if (antes > 0 && CARIMBO.pendentes === 0) avisarTopicoPronto();
            if (CARIMBO.pendentes > 0) CARIMBO.avisado = false;
          } else {
            // houve decisão durante a conferência: mantém a conta local e confere de novo
            if (CARIMBO.pendentes == null) CARIMBO.pendentes = Number(r.totalPendentes) || 0;
            agendarConferencia(800);
          }
          return r;
        })
        .catch(e => {
          if (CARIMBO.estado !== 'ok') CARIMBO.estado = 'erro';
          CARIMBO.erro = e.message;
          throw e;
        })
        .finally(() => {
          CARIMBO.promessa = null;
          renderPainel();
        });
      return CARIMBO.promessa;
    }

    // Uma decisão mudou o número de pendentes: o painel muda na hora e confere na planilha logo depois.
    function mudouPendentes(delta) {
      if (!CARIMBO.ui) return;
      CARIMBO.versao++;
      CARIMBO.sujo = true; // o resumo da planilha ficou para trás até a próxima conferência
      if (CARIMBO.estado === 'ok' && CARIMBO.pendentes != null) CARIMBO.pendentes = Math.max(0, CARIMBO.pendentes + delta);
      renderPainel();
      const n = pendentesAgora();
      if (n === 0 && delta < 0) avisarTopicoPronto();
      if (n > 0) CARIMBO.avisado = false;
      agendarConferencia(2500);
    }
    function agendarConferencia(ms) {
      clearTimeout(CARIMBO.timer);
      CARIMBO.timer = setTimeout(() => { carregarSituacao(true).catch(() => { /* fica o que já está no painel */ }); }, ms);
    }
    // Confere agora (o modal do carimbo e a postagem usam os números mais recentes).
    async function conferirAgora() {
      clearTimeout(CARIMBO.timer);
      for (let i = 0; i < 3; i++) {
        try { await carregarSituacao(CARIMBO.estado === 'ok'); } catch (_) { return; }
        if (!CARIMBO.sujo) return;
      }
    }
    function avisarTopicoPronto() {
      if (CARIMBO.avisado) return;
      CARIMBO.avisado = true;
      CARIMBO.pulsar = true;
      renderPainel();
      if (modalAtual) CARIMBO.avisoAdiado = true;
      else mostrarAvisoPronto();
    }
    function mostrarAvisoPronto() {
      if (modalAtual || !CARIMBO.ui) return;
      toast(`Nenhuma postagem pendente ${CARIMBO.estado === 'ok' ? 'neste tópico' : 'nesta página'}.`, 'ok', 9000, { texto: 'Postar carimbo', fn: abrirCarimbo });
    }

    /* ---------- fila dos carimbos publicados que a planilha não registrou ---------- */
    const lerFilaCarimbos = () => { try { const l = JSON.parse(localStorage.getItem(CHAVE_CARIMBOS) || '[]'); return Array.isArray(l) ? l : []; } catch (_) { return []; } };
    const salvarFilaCarimbos = l => { try { if (l.length) localStorage.setItem(CHAVE_CARIMBOS, JSON.stringify(l.slice(-20))); else localStorage.removeItem(CHAVE_CARIMBOS); } catch (_) { /* sem armazenamento */ } };
    const tirarDaFilaCarimbos = pedido => salvarFilaCarimbos(lerFilaCarimbos().filter(x => x.quando !== pedido.quando));

    function carimboRegistrado(r, topico) {
      if (String(topico) !== String(TOPICO) || !r || !r.carimbo) return;
      CARIMBO.dados = Object.assign({}, CARIMBO.dados || {}, {
        ultimo: { data: r.carimbo.data, auditor: r.carimbo.auditor, mensagem: r.carimbo.mensagem },
        resumo: { aprovadas: 0, negadas: 0, canceladas: 0 }
      });
      if (r.totalPendentes != null) CARIMBO.pendentes = Number(r.totalPendentes) || 0;
      CARIMBO.estado = 'ok';
      CARIMBO.quando = Date.now();
      renderPainel();
    }

    async function reenviarCarimbos(avisar) {
      const fila = lerFilaCarimbos().filter(x => x.grupo === GRUPO.nome);
      if (!fila.length) return true;
      let ok = true;
      for (const pedido of fila) {
        try {
          // registra em nome de quem publicou o carimbo
          const r = await api('carimbo', Object.assign({}, pedido, { fase: 'registrar', usuario: pedido.usuario || USUARIO }));
          tirarDaFilaCarimbos(pedido);
          carimboRegistrado(r, pedido.topico);
        } catch (e) {
          if (/só membros da Auditoria Fiscal/.test(e.message)) tirarDaFilaCarimbos(pedido);
          else ok = false;
        }
      }
      if (avisar) toast(ok ? 'Carimbo de atualização registrado na planilha.' : 'A planilha ainda não respondeu. Tente de novo em instantes.', ok ? 'ok' : 'erro');
      return ok;
    }

    /* ---------- modal do carimbo ---------- */
    function abrirCarimbo() {
      if (!ehAF() || !USUARIO) return;
      const C = { enviando: false, semResumo: false };
      const m = abrirModal({
        kicker: 'CARIMBO DE ATUALIZAÇÃO',
        titulo: GRUPO.nome,
        sub: ALVO.interno ? 'Cofre de medalhas temporárias' : 'Cofre de medalhas efetivas',
        corpo: '<div class="pilha" data-situacao></div><div data-vitrine></div>',
        rodape: `<span class="dica" data-dica></span><button type="button" class="btn btn-sec" data-fechar>Voltar</button><button type="button" class="btn btn-carimbo" data-confirmar>${ICONE.carimbo}Postar carimbo</button>`,
        aoMontar: raiz => raiz.querySelector('[data-confirmar]').addEventListener('click', () => confirmar())
      });
      const R = sel => m.raiz.querySelector(sel);
      const aberto = () => modalAtual === m && !C.enviando && !C.publicado;
      // postagem decidida nesta página depois da última conferência
      const decididaAqui = id => { const r = registroDe(String(id)); return !!(r && r.status !== 'pendente'); };
      const comResumo = () => !!CARIMBO.dados && !C.semResumo;
      const modeloAtual = quando => modeloCarimbo({ quando, resumo: comResumo() ? CARIMBO.dados.resumo : null, pendentes: comResumo() ? pendentesAgora() : null });

      function desenhar() {
        const d = CARIMBO.dados;
        const partes = [];
        if ((!d || C.atualizando) && CARIMBO.estado !== 'erro') {
          partes.push(`<div class="caixa-info" data-t="info">${ICONE.girar}<div><b>Conferindo o tópico</b><p>Postagens pendentes e decisões desde o último carimbo...</p></div></div>`);
        } else if (!d) {
          partes.push(caixaInfo('erro', ICONE.alerta, `<b>Não deu para conferir o tópico na planilha.</b><p>${esc(frase(CARIMBO.erro || 'o servidor não respondeu'))}.</p>
            <label class="marcar"><input type="checkbox" data-sem${C.semResumo ? ' checked' : ''}><span>Postar o carimbo mesmo assim, sem o resumo das decisões.</span></label>`));
        } else {
          const total = pendentesAgora() || 0;
          if (total) {
            const lista = (d.pendentes || []).filter(x => !decididaAqui(x.id));
            const itens = lista.slice(0, 6).map(x => `<li><a href="${esc(linkPostagem(x.id))}">${esc(x.responsavel || 'Postagem')}</a> · ${esc(String(x.cargo || '').replace(/\s*\([^)]*\)\s*$/, ''))}${x.periodo ? ' · ' + esc(x.periodo) : ''}</li>`).join(' ');
            const resto = total - Math.min(6, lista.length);
            partes.push(caixaInfo('aviso', ICONE.alerta, `<b>${plural(total, 'postagem ainda está pendente', 'postagens ainda estão pendentes')} neste tópico.</b><p>O carimbo marca o tópico como atualizado. Se puder, decida as pendentes antes.</p>${itens ? `<ul>${itens}</ul>` : ''}${resto > 0 ? `<p>E mais ${resto}.</p>` : ''}`));
          } else partes.push(caixaInfo('ok', ICONE.ok, '<b>Nenhuma postagem pendente neste tópico.</b><p>Tudo pronto para o carimbo.</p>'));
          const r = d.resumo || {};
          const desde = d.ultimo
            ? `Decisões desde o último carimbo, em ${esc(quandoCurto(d.ultimo.data))}${d.ultimo.auditor ? ' por ' + esc(d.ultimo.auditor) : ''}.`
            : 'Primeiro carimbo deste tópico: decisões desde o início do sistema.';
          partes.push(`<div><p class="secao">Nesta atualização</p><div class="resumo">
            <span data-t="ok"><b>${r.aprovadas || 0}</b> ${r.aprovadas === 1 ? 'aprovada' : 'aprovadas'}</span>
            <span data-t="neg"><b>${r.negadas || 0}</b> ${r.negadas === 1 ? 'negada' : 'negadas'}</span>
            <span data-t="can"><b>${r.canceladas || 0}</b> ${r.canceladas === 1 ? 'cancelada' : 'canceladas'}</span></div>
            <p class="nota-resumo">${desde}</p></div>`);
        }
        R('[data-situacao]').innerHTML = partes.join('');
        const sem = R('[data-sem]');
        if (sem) sem.addEventListener('change', e => { C.semResumo = e.target.checked; desenhar(); });
        desenharVitrine();
        atualizarBotao();
      }
      function desenharVitrine() {
        const v = R('[data-vitrine]');
        C.hora = null;
        if ((!CARIMBO.dados || C.atualizando) && !C.semResumo) { v.innerHTML = ''; return; }
        const modelo = modeloAtual(agoraServidor());
        v.innerHTML = `<p class="secao">Como fica no tópico</p><div class="vitrine" data-tema="${ESTADO.tema}">${bbParaHtml(gerarCarimbo(modelo))}</div>`;
        // o relógio da prévia anda sozinho (a postagem usa a hora do envio)
        const folhas = [...v.querySelectorAll('td')].filter(td => !td.querySelector('td'));
        C.hora = { data: folhas.find(td => td.textContent === modelo.data), hora: folhas.find(td => td.textContent === modelo.hora) };
      }
      function andarRelogio() {
        if (!C.hora || !C.hora.hora) return;
        const dt = dataCarimbo(agoraServidor());
        C.hora.hora.textContent = dt.hora;
        if (C.hora.data) C.hora.data.textContent = dt.data;
      }
      function atualizarBotao() {
        const b = R('[data-confirmar]');
        if (!b) return;
        const pronto = (!!CARIMBO.dados && !C.atualizando) || C.semResumo;
        b.disabled = C.enviando || !pronto;
        b.innerHTML = C.enviando ? `${ICONE.girar}Postando...` : `${ICONE.carimbo}Postar carimbo`;
        R('[data-dica]').textContent = C.enviando ? 'Publicando no tópico...' : pronto ? '' : CARIMBO.estado === 'erro' ? 'Marque a opção acima para postar sem o resumo.' : 'Conferindo o tópico...';
      }

      async function confirmar() {
        if (C.enviando) return;
        C.enviando = true;
        m.travado = true;
        atualizarBotao();
        let post, modelo;
        try {
          // brasões medidos (a postagem leva o tamanho proporcional) e a conferência mais recente
          await Promise.race([Promise.all([medirImagem(brasaoCarimbo()), medirImagem(CFG.BRASAO_AF)]), espera(6000)]);
          if (CARIMBO.sujo || CARIMBO.promessa) await Promise.race([conferirAgora(), espera(10000)]);
          modelo = modeloAtual(agoraServidor());
          post = await postarNoTopico(TOPICO, gerarCarimbo(modelo), ['Carimbo de Atualização', USUARIO, modelo.hora]);
        } catch (e) {
          C.enviando = false;
          m.travado = false;
          atualizarBotao();
          toast(frase(e.message || 'não deu para publicar o carimbo'), 'erro', 7000);
          return;
        }
        C.publicado = post;
        const pedido = {
          quando: Date.now(), grupo: GRUPO.nome, topico: TOPICO, interno: ALVO.interno, subgrupos: subgruposDoGrupo(),
          usuario: USUARIO, mensagem: post.id || '', link: post.url || ''
        };
        salvarFilaCarimbos(lerFilaCarimbos().concat([pedido]));
        let erroRegistro = '';
        try {
          const r = await api('carimbo', Object.assign({ fase: 'registrar' }, pedido));
          tirarDaFilaCarimbos(pedido);
          carimboRegistrado(r, TOPICO);
        } catch (e) {
          erroRegistro = e.message;
        }
        C.enviando = false;
        m.travado = false;
        if (modalAtual === m) mostrarPublicado(post, modelo, erroRegistro);
        else toast(erroRegistro ? 'Carimbo publicado. A planilha registra depois.' : 'Carimbo de atualização publicado.', erroRegistro ? 'erro' : 'ok');
      }

      function mostrarPublicado(post, modelo, erroRegistro) {
        R('.kicker').textContent = 'CARIMBO PUBLICADO';
        const partes = [caixaInfo('ok', ICONE.ok, `<b>Carimbo publicado por ${esc(USUARIO)}.</b><p>${esc(modelo.data)} às ${esc(modelo.hora)}.</p>`)];
        if (!post.url) partes.push(caixaInfo('aviso', ICONE.alerta, '<b>O fórum não devolveu o link da mensagem.</b><p>Confira o carimbo no fim do tópico.</p>'));
        if (erroRegistro) partes.push(`<div data-aviso-registro>${caixaInfo('aviso', ICONE.tabela, `<b>O carimbo está no tópico, mas a planilha não respondeu.</b><p>${esc(frase(erroRegistro))}. Ele é registrado sozinho na próxima vez que você abrir o tópico.</p>`)}</div>`);
        partes.push(`<div class="vitrine" data-tema="${ESTADO.tema}">${bbParaHtml(gerarCarimbo(modelo))}</div>`);
        R('.corpo').innerHTML = partes.join('');
        R('.rodape').innerHTML = `${erroRegistro ? `<button type="button" class="btn btn-sec" data-retentar>${ICONE.desfazer}Registrar de novo</button>` : ''}${post.url ? `<a class="btn btn-sec" href="${esc(post.url)}">${ICONE.externo}Ver carimbo</a>` : ''}<button type="button" class="btn btn-aprovar" data-fechar>Pronto</button>`;
        const re = R('[data-retentar]');
        if (re) re.addEventListener('click', () => reenviarCarimbos(true).then(ok => { if (ok && modalAtual === m) { re.remove(); const a = R('[data-aviso-registro]'); if (a) a.remove(); } }));
      }

      desenhar();
      // brasões medidos: o desenho do carimbo fica com a proporção certa
      Promise.all([medirImagem(brasaoCarimbo()), medirImagem(CFG.BRASAO_AF)]).then(() => { if (aberto()) desenharVitrine(); });
      // relógio da prévia
      const relogio = setInterval(() => { if (modalAtual !== m) { clearInterval(relogio); return; } if (aberto()) andarRelogio(); }, 1000);
      // conferência recente (até 20 s e sem decisões depois dela) abre na hora; senão confere de novo
      if (CARIMBO.estado !== 'ok' || CARIMBO.sujo || Date.now() - CARIMBO.quando > 20000 || CARIMBO.promessa) {
        C.atualizando = true;
        desenhar();
        conferirAgora().then(() => { C.atualizando = false; if (aberto()) desenhar(); });
      }
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
      const auditor = ehAF() && !!USUARIO;
      if (!registrados.length && !auditor) return;
      carregarFontes();
      ESTADO.tema = temaDaPagina((registrados[0] || posts[0]).content);
      registrados.forEach(p => {
        const st = { id: p.id, el: p.el, content: p.content, registro: r.registros[p.id], fisc: null, aberto: false };
        st.ui = montarCartao(p);
        ESTADO.posts.set(p.id, st);
      });
      ESTADO.posts.forEach((_, id) => renderCartao(id));
      if (auditor) {
        // painel da Auditoria no topo da página, com a situação do tópico
        montarPainel(posts[0]);
        carregarSituacao().catch(() => { /* o painel mostra que a planilha não respondeu */ });
        medirImagem(brasaoCarimbo());
        medirImagem(CFG.BRASAO_AF);
        if (lerFilaCarimbos().some(x => x.grupo === GRUPO.nome)) reenviarCarimbos(true).then(ok => { if (ok) carregarSituacao(true).catch(() => null); });
      }
      if (ehAF() && lerFila().some(x => x.grupo === GRUPO.nome)) reenviarCancelamentos(true);
    }

    window.CofreSistema = {
      ativo: true, ESTADO, CARIMBO, GRUPO, ALVO, TOPICO, PAGINA, USUARIO,
      lerPostagem, divergencias, lerAjustes, lancamentos, gruposPorValor, linksRcc, extrairDatas, contemPeriodo, classificarTexto,
      avaliarTeto, incongruencias, periodoCombina, fiscalizar, renderCartao, atualizarRegistro, paginaAtual, topicoAtual, textoDoElemento,
      cargoNaAF, modeloCarimbo, gerarCarimbo, bbParaHtml, dataCarimbo, abrirCarimbo, carregarSituacao,
      leitor, linhasDeCartao, motivoDeMeta, expulsoesDepois, mensagensEntre, itemCarreira, itemExpulsao, topicoRequerimentos,
      carregado: carregar()
    };
  }

  /* <leitor-requerimentos> */
  /* Gerado por ferramentas/leitor.py a partir da Escala de Dados de Pesquisa (nucleo.js e dom.js):
     leitura das mensagens dos tópicos de requerimentos. Não edite aqui. */
  function criarLeitor() {
    const LeitorNucleo = (function () {
      'use strict';

      /* ---------------------------------------------------------------
         TEXTO
         --------------------------------------------------------------- */
      const semAcento = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const norm = s => semAcento(s).toLowerCase().replace(/[\s\u00a0]+/g, ' ').trim();
      const maiusc = s => semAcento(s).toUpperCase().replace(/[\s\u00a0]+/g, ' ').trim();
      // Minúsculas e sem acento, com o mesmo comprimento (as posições batem com o texto original).
      const baixo = s => String(s == null ? '' : s)
        .replace(/[A-Z]/g, c => c.toLowerCase())
        .replace(/[^\x00-\x7f]/g, ch => {
          const l = ch.toLowerCase();
          const n = (l.length === 1 ? l : ch).normalize('NFD').charAt(0);
          return n || ch;
        });
      const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tirarMarcas = s => String(s == null ? '' : s).replace(/\{\{[^}]*\}\}/g, ' ').replace(/\s+/g, ' ').trim();
      const INVISIVEIS = /[\u200b-\u200d\u2060\ufeff]/g;
      // Chave do nick: o nick do Habbo não tem espaço nem aspas, então "' own" e " own" são o mesmo.
      const chaveNick = n => String(n == null ? '' : n).replace(INVISIVEIS, '').replace(/[\s'"`´‘’“”]+/g, '').toLowerCase();

      /* ---------------------------------------------------------------
         DATAS
         --------------------------------------------------------------- */
      const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const MES_TOKEN = {
        jan: 0, janeiro: 0, january: 0, fev: 1, fevereiro: 1, feb: 1, february: 1, mar: 2, marco: 2, march: 2,
        abr: 3, abril: 3, apr: 3, april: 3, mai: 4, maio: 4, may: 4, jun: 5, junho: 5, june: 5, jul: 6, julho: 6, july: 6,
        ago: 7, agosto: 7, aug: 7, august: 7, set: 8, setembro: 8, sep: 8, sept: 8, september: 8,
        out: 9, outubro: 9, oct: 9, october: 9, nov: 10, novembro: 10, november: 10, dez: 11, dezembro: 11, dec: 11, december: 11
      };
      const DIA_MS = 864e5;
      function dia(a, m, d) {
        const t = Date.UTC(a, m, d), x = new Date(t);
        if (x.getUTCFullYear() !== a || x.getUTCMonth() !== m || x.getUTCDate() !== d) return null;
        return Math.round(t / DIA_MS);
      }
      const diaLivre = (a, m, d) => Math.round(Date.UTC(a, m, d) / DIA_MS);
      function partes(n) {
        const x = new Date(n * DIA_MS);
        return { a: x.getUTCFullYear(), m: x.getUTCMonth(), d: x.getUTCDate(), sem: x.getUTCDay() };
      }
      const dd = v => String(v).padStart(2, '0');
      const fmtDia = n => { if (n == null) return ''; const p = partes(n); return dd(p.d) + ' ' + MESES[p.m] + ' ' + p.a; };
      const fmtCurto = n => { const p = partes(n); return dd(p.d) + ' ' + MESES[p.m]; };
      function fmtFaixa(a, b) {
        const pa = partes(a), pb = partes(b);
        return pa.m === pb.m && pa.a === pb.a ? dd(pa.d) + ' a ' + dd(pb.d) + ' ' + MESES[pb.m] : fmtCurto(a) + ' a ' + fmtCurto(b);
      }
      const fmtFaixaLonga = (a, b) => fmtDia(a) + ' a ' + fmtDia(b);

      let hojeFixo = null;
      function hoje(fuso) {
        if (hojeFixo != null) return hojeFixo;
        try {
          const p = new Intl.DateTimeFormat('en-CA', { timeZone: fuso || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
          const v = t => +p.find(x => x.type === t).value;
          return dia(v('year'), v('month') - 1, v('day'));
        } catch (_) {
          const d = new Date();
          return dia(d.getFullYear(), d.getMonth(), d.getDate());
        }
      }

      // Todas as datas de um texto, na ordem em que aparecem.
      // Aceita 26/10/2026, 26.10.26, 26/10, 26 Out 2026, 26Out2026, 26 de outubro de 2026, 26 out. 2026, 26 Out,
      // Out 26, 2026 e, com opc.relativo, "Hoje" e "Ontem".
      function datasDoTexto(texto, opc) {
        opc = opc || {};
        const t = baixo(texto);
        const achados = [];
        const ocupado = (i, f) => achados.some(x => i < x.fim && f > x.i);
        const add = (i, f, d, m, a) => {
          if (!(d >= 1 && d <= 31 && m >= 0 && m <= 11) || ocupado(i, f)) return;
          achados.push({ i, fim: f, d, m, a });
        };
        let r;
        const reNum = /(^|[^\d])(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})(?!\d)/g;
        while ((r = reNum.exec(t))) {
          const i = r.index + r[1].length;
          add(i, reNum.lastIndex, +r[2], +r[3] - 1, r[4].length === 2 ? 2000 + +r[4] : +r[4]);
        }
        const reIso = /(^|[^\d])(\d{4})-(\d{2})-(\d{2})(?!\d)/g;
        while ((r = reIso.exec(t))) add(r.index + r[1].length, reIso.lastIndex, +r[4], +r[3] - 1, +r[2]);
        const reMDA = /(^|[^a-z])([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})(?!\d)/g;
        while ((r = reMDA.exec(t))) {
          const mes = MES_TOKEN[r[2]];
          if (mes === undefined) continue;
          add(r.index + r[1].length, reMDA.lastIndex, +r[3], mes, +r[4]);
        }
        const reExt = /(^|[^\d])(\d{1,2})\s*(?:de\s+)?([a-z]{3,9})(?![a-z])\.?,?\s*(?:de\s+)?(\d{4})?(?!\d)/g;
        while ((r = reExt.exec(t))) {
          const mes = MES_TOKEN[r[3]];
          if (mes === undefined) { reExt.lastIndex = r.index + r[1].length + 1; continue; }
          const i = r.index + r[1].length;
          let f = reExt.lastIndex;
          if (!r[4]) f = i + r[0].length - r[1].length - (r[0].length - r[0].replace(/[\s.,]+$/, '').length);
          add(i, f, +r[2], mes, r[4] ? +r[4] : null);
        }
        const reCurta = /(^|[^\d\/.\-])(\d{1,2})\/(\d{1,2})(?![\d\/])/g;
        while ((r = reCurta.exec(t))) {
          const i = r.index + r[1].length;
          add(i, reCurta.lastIndex, +r[2], +r[3] - 1, null);
        }
        if (opc.relativo) {
          const reRel = /(^|[^a-z])(hoje|ontem|today|yesterday|ha \d+ (?:segundos?|minutos?|horas?)|\d+ (?:minutes?|hours?) ago)(?![a-z])/g;
          const h = opc.hoje != null ? opc.hoje : hoje();
          while ((r = reRel.exec(t))) {
            const n = /^(ontem|yesterday)$/.test(r[2]) ? h - 1 : h;
            const p = partes(n);
            add(r.index + r[1].length, reRel.lastIndex, p.d, p.m, p.a);
          }
        }
        achados.sort((x, y) => x.i - y.i);
        // ano dos que vieram sem: do vizinho com ano (o seguinte primeiro); vira o ano quando o mês volta
        achados.forEach((x, k) => {
          if (x.a != null) return;
          const prox = achados.slice(k + 1).find(o => o.a != null);
          const ant = achados.slice(0, k).reverse().find(o => o.a != null);
          if (prox) x.a = x.m > prox.m ? prox.a - 1 : prox.a;
          else if (ant) x.a = x.m < ant.m ? ant.a + 1 : ant.a;
          else x.a = opc.anoBase || partes(opc.hoje != null ? opc.hoje : hoje()).a;
        });
        return achados.map(x => ({ i: x.i, fim: x.fim, dia: dia(x.a, x.m, x.d) })).filter(x => x.dia != null);
      }
      const primeiraData = (texto, opc) => { const d = datasDoTexto(texto, opc); return d.length ? d[0].dia : null; };

      // Pares de datas ligados por "a", "até", "ao" ou hífen: "04 Jan 2026 até 10 Jan 2026", "[08 Ago 2026 a 06 Nov 2026]".
      // opc.palavra exige "a", "até" ou "ao" entre as datas (a listagem usa hífen entre entrada e cargo).
      function periodosDoTexto(texto, opc) {
        opc = opc || {};
        const t = baixo(texto);
        const ds = datasDoTexto(texto, opc);
        const out = [];
        const sep = '[\\s\\-\\u2013\\u2014\\[\\]\\(\\)\\{\\}|:,.*]*';
        const reMeio = opc.palavra ? new RegExp('^' + sep + '(?:a|ate|ao|to)' + sep + '$') : new RegExp('^' + sep + '(?:(?:a|ate|ao|to)' + sep + ')?$');
        for (let k = 0; k + 1 < ds.length; k++) {
          const x = ds[k], y = ds[k + 1];
          const meio = t.slice(x.fim, y.i);
          if (meio.length > 24 || !reMeio.test(meio)) continue;
          if (!opc.palavra && !/[a-z\-\u2013\u2014]/.test(meio)) continue;
          if (y.dia < x.dia) continue;
          out.push({ ini: x.dia, fim: y.dia, i: x.i });
        }
        return out;
      }

      /* ---------------------------------------------------------------
         SEMANAS (domingo a sábado; a semana fica no mês que tem mais dias dela,
         que é o mês da quarta-feira). Vale para qualquer ano.
         --------------------------------------------------------------- */
      function semanasDoMes(a, m) {
        const ini = diaLivre(a, m, 1), fim = diaLivre(a, m + 1, 1) - 1;
        let s = ini - partes(ini).sem;
        if (s + 3 < ini) s += 7;
        const out = [];
        for (; s + 3 <= fim; s += 7) out.push({ n: out.length + 1, ini: s, fim: s + 6, rotulo: fmtFaixa(s, s + 6) });
        return out;
      }
      function limitesDoMes(a, m) { return { ini: diaLivre(a, m, 1), fim: diaLivre(a, m + 1, 1) - 1 }; }
      const domingoDe = n => n - partes(n).sem;

      /* ---------------------------------------------------------------
         NICKS
         --------------------------------------------------------------- */
      const BALAS = /^[\s•·●▪▸►»‣⁃*>|]+/;
      function limparNick(n) {
        let s = tirarMarcas(n).replace(INVISIVEIS, '').trim();
        s = s.replace(BALAS, '').trim();
        const m = /^["'“”‘’]+(.+?)["'“”‘’]+$/.exec(s);
        if (m) s = m[1].trim();
        return s;
      }
      // Nick do Habbo: sem espaço, até ~25 caracteres, com ao menos uma letra ou número.
      // Nick só de números (ex.: 91001) vale com 3 dígitos ou mais; numa linha sem rótulo, exige uma letra.
      const pareceData = s => { const m = /^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-]\d{2,4})?$/.exec(s); return !!m && +m[1] >= 1 && +m[1] <= 31 && +m[2] >= 1 && +m[2] <= 12; };
      const pareceNick = s => !!s && s.length >= 2 && s.length <= 25 && !/\s/.test(s) && /[a-z0-9]/i.test(s) && !/^\d{1,2}$/.test(s) && !/^https?:/i.test(s) && !pareceData(s);
      const pareceNickSolto = s => pareceNick(s) && /[a-z]/i.test(s);
      // Nick com espaço existe ("x :LUcas123: x", ": Leandra :", "- Mendes", "Shadow !"). Vale quando o valor
      // inteiro é um nick só e não parece uma frase (duas palavras comuns em minúsculas).
      function pareceNickComEspaco(s) {
        if (!s || s.length < 3 || s.length > 25 || !/\s/.test(s) || !/[a-z0-9]/i.test(s)) return false;
        const tokens = s.split(/\s+/);
        if (tokens.length > 4) return false;
        return tokens.filter(t => /^[a-zà-ÿ]{3,}$/.test(t)).length < 2;
      }
      const pareceNickLivre = s => pareceNick(s) || pareceNickComEspaco(s);
      // "nick - 16 Out 2026", "nick 11 Out 2026", "nick (16/10/2026)": tira a data do fim.
      function tirarDataDoFim(s) {
        s = String(s || '');
        const ds = datasDoTexto(s);
        if (!ds.length) return s;
        const d = ds[ds.length - 1];
        if (s.slice(d.fim).replace(/[\s)\].,;|]+/g, '')) return s;
        return s.slice(0, d.i).replace(/[\s\-\u2013\u2014(\[|:,]+$/, '').trim();
      }

      // "A / B / C". Devolve { nicks, avisos }.
      function partirNicks(valor) {
        const avisos = [];
        let v = tirarMarcas(valor).replace(INVISIVEIS, '');
        v = v.replace(/\s+[\u2013\u2014-]\s+(membro|instrutor|supervisor|treinador|professor|ministro|lider|vice).*$/i, '');
        let pedacos = v.split(/\s*\/\s*/);
        if (pedacos.length === 1 && /,\s+\S/.test(v)) {
          const porVirgula = v.split(/,\s+/).map(limparNick);
          if (porVirgula.length > 1 && porVirgula.every(pareceNick)) { pedacos = porVirgula; avisos.push('nicks separados por vírgula'); }
        }
        const out = [];
        pedacos.forEach(b => {
          let s = limparNick(b).replace(/\s*\((?:interin[oa]|ministr[oa]|vice|lider|l[ií]der)[^)]*\)\s*$/i, '').trim();
          if (!s) return;
          if (/\s/.test(s)) {
            const semData = tirarDataDoFim(s);
            if (semData !== s && pareceNickLivre(semData)) { out.push(semData); return; }
            const porE = s.split(/\s+e\s+/i).map(limparNick);
            if (porE.length > 1 && porE.every(pareceNick)) { porE.forEach(p => out.push(p)); return; }
            const primeiro = s.split(/\s+/)[0];
            if (pareceNick(primeiro) && /^\s*[(\[\-\u2013\u2014]/.test(s.slice(primeiro.length))) { out.push(primeiro); return; }
            const tokens = s.split(/\s+/).map(limparNick);
            if (tokens.length > 1 && tokens.length <= 8 && tokens.every(t => pareceNick(t) && t.length >= 3)) { tokens.forEach(p => out.push(p)); avisos.push('nicks separados por espaço'); return; }
            if (pareceNickComEspaco(s)) { out.push(s); return; }
            avisos.push('não entendi o nick "' + s + '"');
            return;
          }
          out.push(s);
        });
        const vistos = new Set(), unicos = [];
        out.forEach(n => { const k = chaveNick(n); if (!vistos.has(k)) { vistos.add(k); unicos.push(n); } else avisos.push(n + ' repetido na mesma mensagem'); });
        return { nicks: unicos, avisos };
      }

      /* ---------------------------------------------------------------
         REQUERIMENTOS: tipo, nicks, dias, datas e cargos de um bloco da mensagem
         --------------------------------------------------------------- */
      const TIPOS = [
        { id: 'retorno', grupo: 'licenca', re: /\bRETORNO\b/ },
        { id: 'prolongamento', grupo: 'licenca', re: /\bPROLONGAMENTO\b|\bPRORROGACAO\b/ },
        { id: 'licenca', grupo: 'licenca', re: /\bLICENCA\b|\bRESERVA\b|\bAFASTAMENTO\b/ },
        { id: 'reintegracao', grupo: 'entrada', re: /\bREINTEGRACAO\b|\bREINTEGRAD[OA]S?\b/ },
        { id: 'admissao', grupo: 'entrada', re: /\bADMISSAO\b|\bADMISSOES\b|\bADMITID[OA]S?\b/ },
        { id: 'entrada', grupo: 'entrada', re: /\bENTRADAS?\b/ },
        { id: 'expulsao', grupo: 'saida', re: /\bEXPULSAO\b|\bEXPULSOES\b|\bEXPULS[OA]S?\b/ },
        { id: 'exoneracao', grupo: 'saida', re: /\bEXONERACAO\b|\bEXONERAD[OA]S?\b/ },
        { id: 'fiscalizacao', grupo: 'saida', re: /\bFISCALIZACAO\b|\bFISCALIZACOES\b|\bSUPERVISAO DE LISTAGEM\b/ },
        { id: 'saida', grupo: 'saida', re: /\bSAIDAS?\b|\bDESLIGAMENTO\b/ },
        { id: 'transferencia', grupo: 'conta', re: /\bTRANSFERENCIA\b|\bTROCA DE NICK\b|\bALTERACAO DE NICK\b/ },
        { id: 'mudanca', grupo: 'cargo', re: /\bPROMOCAO\b|\bREBAIXAMENTO\b|\bMUDANCA DE CARGO\b/ },
        { id: 'atualizacao', grupo: 'outro', re: /\bATUALIZACAO\b|\bATUALIZADA\b|\bATUALIZADO\b/ },
        { id: 'outro', grupo: 'outro', re: /\bMIGRACAO\b|\bADVERTENCIA\b|\bOBSERVACAO\b|\bGRADUACAO\b|\bCAPACITACAO\b|\bREALOCACAO\b|\bMUDANCA DE CONSELHO\b|\bAPROVACAO\b|\bCARTA\b/ }
      ];
      const TIPO_POR_ID = {};
      TIPOS.forEach(t => { TIPO_POR_ID[t.id] = t; });
      const NOME_TIPO = {
        retorno: 'Retorno de licença', prolongamento: 'Prolongamento de licença', licenca: 'Licença', reintegracao: 'Reintegração',
        admissao: 'Admissão', entrada: 'Entrada', expulsao: 'Expulsão', exoneracao: 'Exoneração', fiscalizacao: 'Fiscalização',
        saida: 'Saída', transferencia: 'Transferência de conta', mudanca: 'Promoção ou rebaixamento', atualizacao: 'Atualização da listagem',
        outro: 'Outro requerimento', desconhecido: 'Sem tipo reconhecido', nota: 'Nota ou cancelamento'
      };

      // Linha de título: curta, quase toda em maiúsculas e com uma palavra de tipo.
      function tituloDaLinha(linha, livre) {
        const limpa = tirarMarcas(linha).replace(/[|•·]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!limpa || limpa.length > (livre ? 44 : 72)) return null;
        const letras = limpa.replace(/[^A-Za-zÀ-ÿ]/g, '');
        if (letras.length < 4) return null;
        if (!livre) {
          const mai = letras.replace(/[^A-ZÀ-Þ]/g, '').length;
          if (mai / letras.length < 0.85) return null;
        }
        // Sem as maiúsculas, a linha tem que começar pela palavra do tipo ("[SUP] Atualização realizada!",
        // "Retorno de Licença"); assim "Cancelar expulsão do fulano" não vira uma expulsão.
        let u = maiusc(limpa);
        if (livre) {
          const palavras = u.replace(/^\[[^\]]*\]\s*/, '').split(' ');
          if (!TIPOS.some(t => t.re.test(palavras[0]))) return null;
          u = palavras.slice(0, 4).join(' ');
        }
        const tipos = TIPOS.filter(t => t.re.test(u)).map(t => t.id);
        return tipos.length ? { texto: limpa, tipos } : null;
      }
      function escolherTipo(lista) {
        if (!lista.length) return null;
        for (const t of TIPOS) if (lista.includes(t.id)) return t.id;
        return null;
      }

      // Campos "Rótulo: valor" e linhas com ícone (formulário dos Professores).
      const ICONES = [
        ['nick', /(^|\s)(ph-user|fa-user|ti-user|bi-person)(\s|$)/],
        ['duracao', /(^|\s)(ph-clock-countdown|ph-hourglass\S*|fa-hourglass\S*|fa-clock|ph-timer)(\s|$)/],
        ['data', /(^|\s)(ph-calendar-blank|ph-calendar|fa-calendar|fa-calendar-alt|fa-calendar-day|ti-calendar)(\s|$)/],
        ['permissao', /(^|\s)(ph-key|fa-key)(\s|$)/],
        ['motivo', /(^|\s)(ph-chat-dots|fa-comment\S*)(\s|$)/],
        ['cargo', /(^|\s)(ti-id-badge-2|ti-id-badge|ph-identification-badge|fa-user-tie|fa-id-badge)(\s|$)/],
        ['corpo', /(^|\s)(ph-buildings)(\s|$)/],
        ['movimento', /(^|\s)(ph-arrows-left-right)(\s|$)/]
      ];
      function iconeDaLinha(linha) {
        const m = /^\s*\{\{i:([^}]*)\}\}\s*(.*)$/.exec(linha);
        if (!m) return null;
        const cls = ' ' + m[1] + ' ';
        for (const [nome, re] of ICONES) if (re.test(cls)) return { nome, valor: tirarMarcas(m[2]) };
        return null;
      }
      // "{{i:ph-user}} Lellex {{i:ph-calendar-blank}} 11 Out 2026" vira duas linhas, uma por ícone.
      function expandirIcones(linhas) {
        const out = [];
        linhas.forEach(l => {
          const partes = String(l).split(/(?=\{\{i:)/).map(x => x.trim()).filter(Boolean);
          if (partes.filter(x => /^\{\{i:/.test(x)).length > 1) partes.forEach(x => out.push(x)); else out.push(l);
        });
        return out;
      }
      function camposDe(linhas) {
        const campos = [];
        for (let k = 0; k < linhas.length; k++) {
          const ic = iconeDaLinha(linhas[k]);
          if (ic) { campos.push({ rotulo: '@' + ic.nome, valor: ic.valor, k }); continue; }
          const l = tirarMarcas(linhas[k]).replace(BALAS, '').replace(/^[☐-☒✓✔✅❎]\s*/, '');
          const m = /^([A-Za-zÀ-ÿ][^:|]{0,68}?)\s*:\s*(.*)$/.exec(l);
          if (!m || /https?$/i.test(m[1]) || /\d{1,2}$/.test(m[1])) continue;
          let valor = m[2].trim();
          if (!valor && k + 1 < linhas.length && !/:\s*/.test(tirarMarcas(linhas[k + 1])) && !tituloDaLinha(linhas[k + 1])) valor = tirarMarcas(linhas[k + 1]);
          campos.push({ rotulo: norm(m[1]).replace(/\((s|a|o|es)\)/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim(), original: m[1], valor, k });
        }
        return campos;
      }
      const rotuloDeNick = r => !/graduador|aplicador|responsavel|autor|advertido|antig|novo nick|a ser alterad|nova conta/.test(r) &&
        (/^(nick|nicks|nickname|nicknames)\b/.test(r) || /^(membro|membros|policial|policiais|militar|militares)\b/.test(r) || /\bnick(name)?s?\b/.test(r));
      const achar = (campos, teste) => campos.find(c => teste(c.rotulo));
      const numeroDe = s => { const m = /(\d{1,3})/.exec(String(s || '')); return m ? +m[1] : null; };

      // Cargos que aparecem antes do nick ("Instrutor Housn", "Estagiário :Guest", "{Ministro} Evange").
      const CARGO_PALAVRAS = 'vice[- ]?lider(?:es|a)?|lider(?:es|a)?|ministr[oa]s?|conselheir[oa]s?|consultor(?:es|a)?|estagiari[oa]s?|graduador(?:es|a)?|mentor(?:es|a)?|professor(?:es|a)?|coordenador(?:es|a)?|fiscalizador(?:es|a)?|tutor(?:es|a)?|supervisor(?:es|a)?|capacitador(?:es|a)?|avaliador(?:es|a)?|instrutor(?:es|a)?|treinador(?:es|a)?|aplicador(?:es|a)?|membros?|policial|policiais';
      const RE_CARGO_INICIO = new RegExp('^(?:' + CARGO_PALAVRAS + ')(?:\\([ao]\\))?(?:\\s+de\\s+nivel\\s+\\d)?\\s+');
      const RE_CARGO_LINHA = new RegExp('^(?:' + CARGO_PALAVRAS + ')(?:\\([ao]\\))?(?=$|[\\s(:{\\[|,.\\-])');

      // FISCALIZAÇÃO (Instrutores) e SUPERVISÃO DE LISTAGEM (Treinadores): uma pessoa por linha, com a ação.
      //   "Instrutor Housn - Deserção [Expulsão] comprovação."
      //   "{TRE.1} anna42866 - 08 Set 2026 - 29 Set 2026 - {5 ou mais dias offline} - Evidência | Expulsão"
      // Expulsão, remoção e desligamento são saídas; rebaixamento não.
      const RE_ACAO_SAIDA = /expuls|remov|deslig|exclu|retirad|exonera/;
      const RE_ACAO_REBAIXA = /rebaix/;
      function remocoesDoBloco(linhas) {
        const out = [];
        linhas.forEach(bruta => {
          let l = tirarMarcas(bruta);
          if (!l || tituloDaLinha(bruta)) return;
          if (/^(responsavel|data e hora|data|obs|observ)/.test(norm(l))) return;
          let acao = '';
          const colchete = [];
          l.replace(/\[([^\]]{3,40})\]/g, (x, y) => { colchete.push(y); return x; });
          const c = colchete.find(x => RE_ACAO_SAIDA.test(norm(x)) || RE_ACAO_REBAIXA.test(norm(x)));
          if (c) acao = c;
          else if (/\|/.test(l)) acao = l.split('|').pop().trim();
          const na = norm(acao);
          const tipo = RE_ACAO_SAIDA.test(na) ? 'saida' : RE_ACAO_REBAIXA.test(na) ? 'rebaixamento' : '';
          if (!tipo) return;
          let cargo = '';
          const tag = /^\{([^}]{1,30})\}\s*/.exec(l);
          if (tag) { cargo = tag[1]; l = l.slice(tag[0].length); }
          const mc = RE_CARGO_INICIO.exec(semAcento(l).toLowerCase());
          if (mc) { cargo = cargo || l.slice(0, mc[0].length).trim(); l = l.slice(mc[0].length); }
          const partes = l.split(/\s[-\u2013\u2014]\s/);
          let nick = '';
          for (let j = 1; j <= partes.length; j++) {
            const cand = limparNick(partes.slice(0, j).join(' - '));
            if (pareceNickLivre(cand)) { nick = cand; break; }
            if (cand.length > 25) break;
          }
          if (nick) out.push({ nick, tipo, acao: acao.trim(), cargo });
        });
        return out;
      }

      // Promoções em lista (Escola de Formação de Executivos):
      //   "PROFESSOR > MENTOR", "(Men.EFE):medal:", "* nick", ..., "ESTAGIÁRIO > MINISTRO", "* nick"
      const RE_DE_PARA = /^([A-Za-zÀ-ÿ() ]{3,40}?)\s*(?:>|›|→)\s*([A-Za-zÀ-ÿ() ]{3,40})$/;
      function promocoesEmLista(linhas) {
        const out = [];
        let atual = null;
        linhas.forEach(bruta => {
          const l = tirarMarcas(bruta);
          if (!l) return;
          const m = RE_DE_PARA.exec(l);
          if (m && RE_CARGO_LINHA.test(norm(m[1])) && RE_CARGO_LINHA.test(norm(m[2]))) { atual = { de: m[1].trim(), para: m[2].trim() }; return; }
          if (!atual || /^\(/.test(l)) return;
          // "* nick" ou "• nick"; o hífen só é marcador com espaço depois ("-Chronos-" é nick)
          const n = limparNick(l.replace(/^(?:[*•·]\s*|-\s+)/, ''));
          if (pareceNickLivre(n)) out.push({ nick: n, de: atual.de, para: atual.para });
        });
        return out;
      }

      // Lista de nicks com marcador logo depois do título ("• Nick" ou "• Nick - 16 Out 2026"), um por linha.
      function nicksEmLista(linhas, inicio) {
        const lista = [];
        for (let k = inicio; k < linhas.length; k++) {
          const bruto = tirarMarcas(linhas[k]);
          if (!bruto) continue;
          if (!/^[•·●▪▸►»‣⁃*]/.test(bruto)) { if (lista.length) break; continue; }
          const n = tirarDataDoFim(limparNick(bruto));
          if (pareceNickLivre(n)) lista.push(n); else if (lista.length) break;
        }
        return lista;
      }

      // Texto do bloco sem marcas nem pontuação: a citação de um requerimento tem a mesma assinatura do original.
      const assinaturaDe = linhas => norm(linhas.map(tirarMarcas).filter(Boolean).join(' ')).replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 300);
      // Devolve o tipo e os dados de um bloco (as linhas de uma parte da mensagem).
      function analisarBloco(linhasDoBloco, opc) {
        opc = opc || {};
        const linhas = expandirIcones(linhasDoBloco);
        const avisos = [];
        const titulos = [];
        linhas.forEach((l, k) => { const t = tituloDaLinha(l); if (t) titulos.push(Object.assign({ k }, t)); });
        let tipos = [].concat(...titulos.map(t => t.tipos));
        if (!tipos.length) {
          linhas.slice(0, 4).forEach((l, k) => { const t = tituloDaLinha(l, true); if (t) { titulos.push(Object.assign({ k }, t)); tipos = tipos.concat(t.tipos); } });
        }
        let tipo = escolherTipo(tipos) || 'desconhecido';
        // Prolongamento e retorno vêm com "LICENÇA" no título; o título manda.
        const titulo = titulos.length ? titulos[0].texto : '';
        const campos = camposDe(linhas);
        const r = { tipo, grupo: TIPO_POR_ID[tipo] ? TIPO_POR_ID[tipo].grupo : 'outro', titulo, nicks: [], dias: null, periodo: null, data: null, cargo: '', cargoAtual: '', cargoNovo: '', motivo: '', nickAntigo: '', nickNovo: '', avisos, campos, porNick: {}, assinatura: assinaturaDe(linhas) };
        const opcData = { anoBase: opc.anoBase, hoje: opc.hoje };
        const addNick = (n, dados) => { const k = chaveNick(n); if (!r.nicks.some(x => chaveNick(x) === k)) r.nicks.push(n); if (dados) r.porNick[k] = Object.assign(r.porNick[k] || {}, dados); };
        // promoções em lista, sem título de requerimento
        if (tipo === 'desconhecido') {
          const promos = promocoesEmLista(linhas);
          if (promos.length) {
            r.tipo = 'mudanca'; r.grupo = 'cargo'; r.direcao = 'promocao';
            r.titulo = promos.map(x => x.de + ' > ' + x.para).filter((x, i, a) => a.indexOf(x) === i).join(', ');
            promos.forEach(x => addNick(x.nick, { cargoAtual: x.de, cargoNovo: x.para, cargo: x.de }));
            return r;
          }
        }
        // fiscalização e supervisão de listagem: uma pessoa por linha
        if (tipo === 'fiscalizacao') {
          const rem = remocoesDoBloco(linhas);
          if (rem.length) {
            r.remocoes = rem;
            r.fiscalizacao = true;
            rem.filter(x => x.tipo === 'saida').forEach(x => addNick(x.nick, { cargo: x.cargo, motivo: x.acao }));
            if (!r.nicks.length) avisos.push('a fiscalização não tem expulsão nem remoção da listagem');
            return r;
          }
        }
        // nicks
        let campoNick = achar(campos, rotuloDeNick) || achar(campos, x => x === '@nick');
        if (tipo === 'transferencia') {
          const antigo = achar(campos, x => /antig|atual/.test(x) && /nick|conta/.test(x));
          const novo = achar(campos, x => /novo|nova|alterad/.test(x) && /nick|conta/.test(x));
          if (antigo) r.nickAntigo = partirNicks(antigo.valor).nicks[0] || '';
          if (novo) r.nickNovo = partirNicks(novo.valor).nicks[0] || '';
          const ic = achar(campos, x => x === '@nick');
          if ((!r.nickAntigo || !r.nickNovo) && ic && /[›>]/.test(ic.valor)) {
            const [a, b] = ic.valor.split(/\s*[›>]\s*/);
            r.nickAntigo = limparNick(a); r.nickNovo = limparNick(b);
          }
          if (r.nickAntigo) r.nicks = [r.nickAntigo];
        } else {
          if (!campoNick && ['entrada', 'saida', 'licenca', 'cargo'].includes(r.grupo)) {
            const inicio = titulos.length && titulos[0].k < 3 ? titulos[0].k + 1 : 0;
            const lista = nicksEmLista(linhas, inicio);
            if (lista.length) lista.forEach(n => addNick(n));
            else {
              // Sem rótulo: a primeira linha que é só uma lista de nicks (depois do título).
              for (let k = inicio; k < linhas.length; k++) {
                const l = tirarMarcas(linhas[k]);
                if (!l || l.length > 160 || tituloDaLinha(linhas[k]) || /:/.test(l) || datasDoTexto(l).length || /\b\d+\s*dias?\b/i.test(l)) continue;
                const crus = l.split(/\s*\/\s*/).map(limparNick);
                if (crus.length && crus.every(pareceNickSolto)) { campoNick = { rotulo: '@linha', valor: l, k }; break; }
              }
            }
          }
          if (campoNick) {
            const p = partirNicks(campoNick.valor);
            p.nicks.filter(pareceNickLivre).forEach(n => addNick(n));
            p.avisos.forEach(a => avisos.push(a));
            p.nicks.filter(n => !pareceNickLivre(n)).forEach(n => avisos.push('não parece um nick: "' + n + '"'));
          }
        }
        // dias e período
        const campoDias = achar(campos, x => /\bdias?\b/.test(x) || /duracao|quantidade/.test(x)) || achar(campos, x => x === '@duracao');
        if (campoDias) r.dias = numeroDe(campoDias.valor);
        const campoPer = achar(campos, x => /^periodo/.test(x) || /^termino|^fim\b|^retorno previsto/.test(x));
        if (campoPer) {
          const per = periodosDoTexto(campoPer.valor, Object.assign({ palavra: false }, opcData))[0];
          if (per) r.periodo = per;
          else if (r.dias == null) r.dias = /\bdias?\b/i.test(campoPer.valor) ? numeroDe(campoPer.valor) : null;
          if (!per && /^termino|^fim\b/.test(campoPer.rotulo)) { const f = primeiraData(campoPer.valor, opcData); if (f != null) r.termino = f; }
        }
        if (r.dias == null && (r.grupo === 'licenca')) {
          for (const c of campos) { const m = /\b(\d{1,3})\s*dias?\b/i.exec(c.valor); if (m) { r.dias = +m[1]; break; } }
          if (r.dias == null) for (const l of linhas) { const t = tirarMarcas(l); if (t.length < 60) { const m = /^\s*(\d{1,3})\s*dias?\b/i.exec(t); if (m) { r.dias = +m[1]; break; } } }
        }
        if (r.dias == null && r.periodo) r.dias = r.periodo.fim - r.periodo.ini;
        // data informada no próprio requerimento
        const campoData = achar(campos, x => /^data\b/.test(x)) || achar(campos, x => x === '@data');
        if (campoData) r.data = primeiraData(campoData.valor, opcData);
        // cargos e motivo
        const cAtual = achar(campos, x => /cargo atual|cargo anterior|antigo cargo|^de$/.test(x));
        const cNovo = achar(campos, x => /novo cargo|cargo novo|cargo alcancado|^para$/.test(x));
        const cSimples = achar(campos, x => /^(seu )?cargo\b/.test(x) && !/atual|novo|anterior|alcancado/.test(x)) || achar(campos, x => x === '@cargo');
        if (cAtual) r.cargoAtual = cAtual.valor;
        if (cNovo) r.cargoNovo = cNovo.valor;
        if (cSimples) {
          if (/[›>]/.test(cSimples.valor)) { const [a, b] = cSimples.valor.split(/\s*[›>]\s*/); r.cargoAtual = r.cargoAtual || a; r.cargoNovo = r.cargoNovo || b; }
          else r.cargo = cSimples.valor;
        }
        if (!r.cargo) r.cargo = r.cargoAtual;
        const cMot = achar(campos, x => /^motivo/.test(x)) || achar(campos, x => x === '@motivo');
        if (cMot) r.motivo = cMot.valor;
        if (r.grupo === 'saida' && /fiscaliza/i.test(semAcento(r.motivo))) r.fiscalizacao = true;
        if (r.tipo === 'mudanca') {
          const u = maiusc(r.titulo);
          r.direcao = /REBAIXAMENTO/.test(u) && !/PROMOCAO/.test(u) ? 'rebaixamento' : /PROMOCAO/.test(u) && !/REBAIXAMENTO/.test(u) ? 'promocao' : '';
        }
        if (r.tipo === 'desconhecido') avisos.push('tipo de requerimento não reconhecido');
        else if ((r.grupo === 'entrada' || r.grupo === 'saida' || r.grupo === 'licenca') && !r.nicks.length) avisos.push('não achei o nick');
        if (r.tipo === 'licenca' && r.dias == null && !r.periodo) avisos.push('licença sem a quantidade de dias');
        return r;
      }

      // Divide as linhas de uma mensagem em blocos: pelo [hr] e, nos modelos com título no topo,
      // quando aparece um segundo título de requerimento.
      function blocosDaMensagem(linhas) {
        const partes = [[]];
        linhas.forEach(l => { if (l === '{{hr}}') partes.push([]); else partes[partes.length - 1].push(l); });
        const out = [];
        partes.filter(p => p.some(l => tirarMarcas(l))).forEach(p => {
          const tit = [];
          p.forEach((l, k) => { const t = tituloDaLinha(l); if (t && escolherTipo(t.tipos) !== 'outro') tit.push(k); });
          if (tit.length > 1 && tit[0] <= 2) {
            tit.forEach((k, j) => out.push(p.slice(k, j + 1 < tit.length ? tit[j + 1] : p.length)));
            if (tit[0] > 0 && p.slice(0, tit[0]).some(l => tirarMarcas(l))) out[out.length - tit.length] = p.slice(0, tit[1]);
          } else out.push(p);
        });
        return out;
      }

      const RE_CANCELA = /\b(cancelad[oa]s?|cancelament\w*|cancelo|cancelar|cancela|desconsider\w*|anulad[oa]s?|anular|invalidad[oa]s?|equivoc\w*|indeferid[oa]s?|revogad[oa]s?|sem efeito|postad[oa] errad[oa]|postei errad\w*|postagem errada|erro na postagem|duplicad[oa]s?|retificad[oa]s?|retificacao)\b/;
      // O texto cita o nick (sem pegar pedaço de outra palavra).
      function citaNick(texto, nick) {
        const t = norm(texto), n = norm(nick);
        if (!n) return false;
        const alfa = c => !!c && /[a-z0-9]/.test(c);
        for (let i = t.indexOf(n); i !== -1; i = t.indexOf(n, i + 1)) {
          if ((!alfa(t[i - 1]) || !alfa(n[0])) && (!alfa(t[i + n.length]) || !alfa(n[n.length - 1]))) return true;
        }
        return false;
      }

      /* ---------------------------------------------------------------
         MENSAGENS -> EVENTOS
         msg = { id, dia, url, autor, linhas, citacoes: [linhas], riscados: [texto], editado }
         --------------------------------------------------------------- */
      function eventosDaMensagem(msg, opc) {
        opc = opc || {};
        const eventos = [];
        const proprio = (msg.linhas || []).filter(l => tirarMarcas(l) && l !== '{{hr}}');
        const textoProprio = norm(proprio.map(tirarMarcas).join(' '));
        const cancela = RE_CANCELA.test(textoProprio);
        const riscados = new Set((msg.riscados || []).map(chaveNick));
        const opcBloco = { anoBase: msg.dia != null ? partes(msg.dia).a : undefined, hoje: opc.hoje };
        const blocos = blocosDaMensagem(msg.linhas || []);
        let reqs = blocos.map(b => analisarBloco(b, opcBloco));
        // Requerimentos citados nesta mensagem (para achar o original que ela cancela).
        const citados = [];
        (msg.citacoes || []).forEach(c => blocosDaMensagem(c).forEach(b => { const r = analisarBloco(b, opcBloco); if (r.tipo !== 'desconhecido' && r.nicks.length) citados.push(r); }));
        // Cancelamento: cita o requerimento e diz que foi cancelado ("Expulsão do tieck cancelada",
        // "Requerimento cancelado! ... REF: 1764032"). O título solto do texto não vira requerimento.
        const ehCancelamento = cancela && textoProprio.length <= 600 && (citados.length > 0 || !reqs.some(r => r.nicks.length));
        if (ehCancelamento) reqs = reqs.filter(r => r.nicks.length && !citados.length);
        const reconhecidos = reqs.filter(r => r.tipo !== 'desconhecido');
        if (!reconhecidos.length) {
          const ref = /\bref(?:erencia)?\s*[:#.\-\s]*p?(\d{5,9})\b/.exec(textoProprio);
          eventos.push({
            id: msg.id + ':0', post: msg.id, dia: msg.dia, url: msg.url, autor: msg.autor, tipo: ehCancelamento || citados.length ? 'nota' : 'desconhecido',
            grupo: 'outro', nick: '', chave: '', titulo: '', cancela: ehCancelamento, citados, ref: ref ? ref[1] : '', textoNorm: textoProprio.slice(0, 600),
            avisos: [], linhasResumo: proprio.slice(0, 6).map(tirarMarcas)
          });
          return eventos;
        }
        reqs.forEach((r, k) => {
          if (r.tipo === 'desconhecido' && reconhecidos.length) return;
          const base = {
            post: msg.id, dia: msg.dia, url: msg.url, autor: msg.autor, tipo: r.tipo, grupo: r.grupo, titulo: r.titulo,
            dias: r.dias, periodo: r.periodo, termino: r.termino || null, dataCampo: r.data, cargo: r.cargo, cargoAtual: r.cargoAtual, cargoNovo: r.cargoNovo,
            motivo: r.motivo, direcao: r.direcao || '', fiscalizacao: !!r.fiscalizacao, nickAntigo: r.nickAntigo, nickNovo: r.nickNovo, assinatura: r.assinatura,
            cancela: false, citados, editado: !!msg.editado, temCitacao: !!(msg.citacoes && msg.citacoes.length), avisos: r.avisos.slice()
          };
          if (r.data != null && msg.dia != null && Math.abs(r.data - msg.dia) > 1 && (r.grupo === 'entrada' || r.grupo === 'saida')) {
            base.avisos.push('a data escrita (' + fmtDia(r.data) + ') é diferente da data da mensagem');
          }
          if (!r.nicks.length) { eventos.push(Object.assign({ id: msg.id + ':' + k, nick: '', chave: '' }, base)); return; }
          r.nicks.forEach((n, j) => {
            const pn = r.porNick && r.porNick[chaveNick(n)];
            const ev = Object.assign({ id: msg.id + ':' + k + ':' + j, nick: n, chave: chaveNick(n) }, base, { avisos: base.avisos.slice() });
            if (pn) ['cargo', 'cargoAtual', 'cargoNovo', 'motivo'].forEach(c => { if (pn[c]) ev[c] = pn[c]; });
            if (riscados.has(ev.chave)) ev.riscado = true;
            eventos.push(ev);
          });
        });
        return eventos;
      }

      // Marca como cancelado o requerimento que uma mensagem de cancelamento cita (ou indica pelo REF).
      // Só os nicks citados no texto do cancelamento, quando ele cita algum ("Expulsão do tieck cancelada").
      function marcarCancelamentos(eventos) {
        const raiz = apelidos(eventos);
        const alvos = eventos.filter(e => e.chave && e.tipo !== 'nota' && e.tipo !== 'desconhecido' && e.dia != null);
        eventos.forEach(e => { delete e.cancelado; });
        eventos.filter(n => n.tipo === 'nota' && n.cancela).forEach(n => {
          const marca = (alvo, como) => { if (!alvo.cancelado) alvo.cancelado = { post: n.post, url: n.url, dia: n.dia, como }; };
          const nomeados = c => { const ns = c.nicks.filter(x => citaNick(n.textoNorm || '', x)); return ns.length ? ns : c.nicks; };
          if (n.ref) {
            const doPost = alvos.filter(e => String(e.post) === n.ref);
            if (doPost.length) {
              const noTexto = doPost.filter(e => citaNick(n.textoNorm || '', e.nick));
              (noTexto.length ? noTexto : doPost).forEach(e => marca(e, 'ref'));
              return;
            }
          }
          (n.citados || []).forEach(c => {
            const grupo = (TIPO_POR_ID[c.tipo] || {}).grupo;
            nomeados(c).forEach(nick => {
              const k = raiz(chaveNick(nick));
              const cands = alvos.filter(e => raiz(e.chave) === k && e.post !== n.post && e.dia <= n.dia && n.dia - e.dia <= 45 && (e.tipo === c.tipo || e.grupo === grupo)).sort(ordemEv);
              // o original citado (mesmo texto) vale mais que o mais recente: o pedido repetido com outra permissão continua
              const iguais = cands.filter(e => e.assinatura && e.assinatura === c.assinatura);
              const alvo = (iguais.length ? iguais : cands).pop();
              if (alvo) marca(alvo, 'citacao');
            });
          });
          // sem citação nem REF: o nick citado no texto e um requerimento dele de até 7 dias antes
          if (!(n.citados || []).length && !n.ref) {
            const porNick = new Map();
            alvos.filter(e => e.dia <= n.dia && n.dia - e.dia <= 7 && e.post !== n.post && citaNick(n.textoNorm || '', e.nick)).sort(ordemEv).forEach(e => porNick.set(raiz(e.chave), e));
            porNick.forEach(e => marca(e, 'texto'));
          }
        });
        return eventos;
      }

      /* ---------------------------------------------------------------
         ENTRADAS E SAÍDAS: repetidos, citações, cancelamentos e conferência na listagem
         --------------------------------------------------------------- */
      // Liga os nicks de transferências de conta (o nick novo responde pelo antigo e vice-versa).
      function apelidos(eventos) {
        const pai = new Map();
        const raiz = k => { while (pai.has(k) && pai.get(k) !== k) k = pai.get(k); return k; };
        eventos.filter(e => e.tipo === 'transferencia' && e.nickAntigo && e.nickNovo).forEach(e => {
          const a = raiz(chaveNick(e.nickAntigo)), b = raiz(chaveNick(e.nickNovo));
          if (a !== b) pai.set(a, b);
        });
        return k => raiz(k);
      }
      const ordemEv = (a, b) => (a.dia - b.dia) || (String(a.post).localeCompare(String(b.post), undefined, { numeric: true })) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
      return {
        semAcento, norm, maiusc, baixo, tirarMarcas, chaveNick, limparNick, pareceNick, partirNicks,
        dia, partes, fmtDia, hoje, datasDoTexto, primeiraData, periodosDoTexto,
        TIPOS, tituloDaLinha, camposDe, analisarBloco, blocosDaMensagem, eventosDaMensagem,
        apelidos, marcarCancelamentos, citaNick
      };
    })();
    const LeitorDom = (function (N) {
      'use strict';

      const BLOCO = new Set(['div', 'p', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'center', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'pre', 'section', 'article', 'header', 'footer', 'form', 'fieldset', 'details', 'summary', 'figure', 'figcaption', 'nav', 'aside', 'main', 'caption', 'address']);
      const IGNORAR = new Set(['script', 'style', 'noscript', 'template', 'iframe', 'object', 'embed', 'svg', 'video', 'audio', 'canvas', 'select', 'option', 'textarea', 'button', 'input', 'head', 'title', 'meta', 'link']);
      const classes = el => (el && typeof el.className === 'string' ? el.className : (el && el.getAttribute && el.getAttribute('class')) || '');
      const temClasse = (el, re) => re.test(' ' + classes(el) + ' ');
      const ehCitacao = el => el.tagName === 'BLOCKQUOTE' || temClasse(el, /\s(quote|quotecontent|quote_content|citacao|citation)\s/i);
      const ehRiscado = el => /^(S|STRIKE|DEL)$/.test(el.tagName) || /line-through/i.test(el.getAttribute('style') || '');
      const ehIcone = el => /^(I|SPAN|EM)$/.test(el.tagName) && !el.textContent.trim() && temClasse(el, /\s(ph|ph-fill|ph-bold|fa|fas|far|fab|fal|fa-solid|fa-regular|ti|bi|material-icons|ion|icon)[\s-]/i);
      const ehSpoiler = el => el.tagName === 'DETAILS' || temClasse(el, /\s(spoiler|spoiler_wrap|spoilerbox)\s/i);
      const limpar = s => String(s || '').replace(/[\s\u00a0]+/g, ' ').trim();

      function partesDoSpoiler(el) {
        if (el.tagName === 'DETAILS') {
          const s = [...el.children].find(f => f.tagName === 'SUMMARY');
          return { titulo: s ? s.textContent : '', conteudo: [...el.childNodes].filter(n => n !== s) };
        }
        const filhos = [...el.children];
        const tit = filhos.find(f => f.tagName === 'DT' || /title|titulo|cabec|head|toggle/i.test(classes(f)));
        const cont = filhos.find(f => f !== tit && (f.tagName === 'DD' || /content|conteudo|body|hidden|closed/i.test(classes(f))));
        if (!tit && !cont) return null;
        return { titulo: tit ? tit.textContent : '', conteudo: cont ? [cont] : filhos.filter(f => f !== tit) };
      }

      // Com opc.estilos (página montada num quadro), quem decide as quebras é o layout de verdade: elementos em
      // bloco (block, flex, grid, list-item, tabela...) quebram a linha e os em linha-bloco (inline-block,
      // inline-flex...) ganham um espaço em volta. Sem isso, textos de elementos vizinhos grudam
      // ("Lynsk" + "Administração", "-:Lisboa" + "09 fev. 2024").
      const BLOCO_CSS = /^(block|flex|grid|list-item|table|table-row|table-row-group|table-header-group|table-footer-group|table-caption|flow-root|none)$/;
      const ESPACO_CSS = /^(inline-block|inline-flex|inline-grid|inline-table)$/;
      function leitorDeEstilo(raiz, opc) {
        if (!opc.estilos) return null;
        const doc = raiz && raiz.ownerDocument;
        const win = doc && doc.defaultView;
        if (!win || typeof win.getComputedStyle !== 'function') return null;
        return el => { try { return win.getComputedStyle(el).display || ''; } catch (_) { return ''; } };
      }

      // Linhas de texto de um elemento. Células de uma linha de tabela viram "a | b"; <hr> vira {{hr}};
      // ícones viram {{i:classes}}; spoilers viram {{spoiler:Título}} ... {{/spoiler}}.
      function linhasDoElemento(raiz, opc) {
        opc = opc || {};
        const linhas = [];
        let buf = '';
        const exibicao = leitorDeEstilo(raiz, opc);
        const fechar = () => { const t = buf.replace(/[\s\u00a0]+/g, ' ').trim(); buf = ''; if (t) linhas.push(t); };
        function andar(n) {
          if (n.nodeType === 3) { buf += n.nodeValue; return; }
          if (n.nodeType !== 1) return;
          const tag = n.tagName.toLowerCase();
          if (IGNORAR.has(tag)) return;
          if (opc.pularCitacoes && ehCitacao(n)) { fechar(); return; }
          if (tag === 'br') { fechar(); return; }
          if (tag === 'hr') { fechar(); linhas.push('{{hr}}'); return; }
          if (tag === 'img') { buf += ' '; return; }
          if (ehIcone(n)) { buf += ' {{i:' + limpar(classes(n)) + '}} '; return; }
          if (ehSpoiler(n)) {
            const sp = partesDoSpoiler(n);
            if (sp) {
              fechar();
              linhas.push('{{spoiler:' + limpar(sp.titulo).replace(/^spoiler\s*:?\s*/i, '').replace(/[{}]/g, '') + '}}');
              sp.conteudo.forEach(andar);
              fechar();
              linhas.push('{{/spoiler}}');
              return;
            }
          }
          const disp = exibicao ? exibicao(n) : '';
          if (tag === 'td' || tag === 'th' || disp === 'table-cell') {
            if (buf.trim()) buf += ' | ';
            for (let c = n.firstChild; c; c = c.nextSibling) andar(c);
            buf += ' ';
            return;
          }
          if (tag === 'cite' && opc.semCite) return;
          const bloco = disp ? BLOCO_CSS.test(disp) : BLOCO.has(tag);
          const espaco = !bloco && !!disp && ESPACO_CSS.test(disp);
          if (bloco) fechar(); else if (espaco) buf += ' ';
          for (let c = n.firstChild; c; c = c.nextSibling) andar(c);
          if (bloco) fechar(); else if (espaco) buf += ' ';
        }
        andar(raiz);
        fechar();
        return linhas
          .map(l => l.replace(/^(\s*\|\s*)+|(\s*\|\s*)+$/g, '').replace(/(\s*\|\s*){2,}/g, ' | ').trim())
          .filter(l => l && !/^\|?$/.test(l));
      }

      /* ---------- caminho e endereço ---------- */
      function caminhoDe(href, origem) {
        try {
          const base = origem || (typeof location !== 'undefined' ? location.origin : 'https://www.policiarcc.com');
          const u = new URL(href, base);
          return u.origin === base ? u.pathname + u.search : '';
        } catch (_) { return ''; }
      }

      /* ---------- paginação de um tópico ---------- */
      function paginacao(doc, tid, origem) {
        const re = new RegExp('^/t' + tid + '(?:p(\\d+))?-([^?#]*)');
        const offs = new Set([0]);
        let slug = '';
        doc.querySelectorAll('a[href]').forEach(a => {
          const c = caminhoDe(a.getAttribute('href'), origem);
          const m = re.exec(c);
          if (!m) return;
          if (m[1]) offs.add(+m[1]);
          if (!slug && m[2]) slug = m[2];
        });
        const lista = [...offs].sort((a, b) => a - b);
        const passo = lista.find(x => x > 0) || 0;
        const ultimo = lista[lista.length - 1];
        const offsets = [];
        if (passo) for (let o = 0; o <= ultimo; o += passo) offsets.push(o);
        else offsets.push(0);
        return { passo, ultimo, offsets, slug };
      }

      /* ---------- mensagens de uma página de tópico ---------- */
      const SEL_CONTEUDO = '.postbody .content, .post .content, .post-content, .post-entry, .postbody-content, .message-content';
      const SEL_DATA = 'time, .author, .topic-date, .post-date, .postdate, .post-time, .date, .postdetails, .post-head, .posthead, .post-info, .postinfo, .post-meta, .post-header, [class*="date"], [class*="time"]';
      const SEL_FORA = '.content, .postprofile, .post-profile, .profile, [class*="profile"], .signature_div, .sig-content, .signature, [class*="signature"], .post-footer, .postfoot, .post-buttons, .profile-icons';
      const RE_NAO_DATA = /(inscri|registr|desde|entrou|idade|aniversari|nascimento|ultima visita|last visit|joined|member since)\W{0,12}$/;

      const dentroDe = (el, alvo) => !!alvo && (el === alvo || alvo.contains(el));
      function dataEmTexto(texto, opc) {
        const t = N.baixo(texto);
        const ds = N.datasDoTexto(texto, { relativo: true, hoje: opc && opc.hoje });
        for (const d of ds) {
          if (RE_NAO_DATA.test(t.slice(Math.max(0, d.i - 40), d.i))) continue;
          return { dia: d.dia, texto: limpar(String(texto).slice(d.i, d.fim + 8)) };
        }
        return null;
      }
      function isoParaDia(iso) {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
        return m ? N.dia(+m[1], +m[2] - 1, +m[3]) : null;
      }
      function dataDaMensagem(raiz, conteudo, opc) {
        const tm = [...raiz.querySelectorAll('time[datetime]')].find(x => !dentroDe(x, conteudo));
        if (tm) { const d = isoParaDia(tm.getAttribute('datetime')); if (d != null) return { dia: d, texto: limpar(tm.textContent) || tm.getAttribute('datetime') }; }
        const fora = [...raiz.querySelectorAll(SEL_FORA)].filter(x => !dentroDe(x, conteudo) && !x.contains(conteudo));
        const cands = [...raiz.querySelectorAll(SEL_DATA)].filter(el => !dentroDe(el, conteudo) && !el.contains(conteudo) && !fora.some(f => f.contains(el)));
        for (const el of cands) { const r = dataEmTexto(el.textContent, opc); if (r) return r; }
        const clone = raiz.cloneNode(true);
        clone.querySelectorAll(SEL_FORA).forEach(x => { if (!x.querySelector('.content')) x.remove(); });
        clone.querySelectorAll('.content').forEach(x => x.remove());
        return dataEmTexto(clone.textContent, opc);
      }
      function idDaMensagem(raiz, conteudo) {
        for (let el = conteudo; el && el.nodeType === 1; el = el.parentElement) {
          const m = /^p(\d+)$/.exec(el.id || '');
          if (m) return m[1];
        }
        const q = raiz.querySelector('a[href*="mode=quote"], a[href*="mode=editpost"]');
        if (q) { const m = /[?&]p=(\d+)/.exec(q.getAttribute('href')); if (m) return m[1]; }
        const a = raiz.querySelector('a[name]');
        if (a && /^\d+$/.test(a.getAttribute('name'))) return a.getAttribute('name');
        const l = raiz.querySelector('a[href*="#"]');
        if (l) { const m = /#(\d{3,})$/.exec(l.getAttribute('href')); if (m) return m[1]; }
        return '';
      }
      function raizDaMensagem(conteudo) {
        for (let el = conteudo.parentElement; el && el.nodeType === 1; el = el.parentElement) {
          if (/^p\d+$/.test(el.id || '')) return el;
          if (temClasse(el, /\s(post|postrow|post-container)\s/)) return el;
        }
        return conteudo.parentElement || conteudo;
      }

      function mensagensDaPagina(doc, opc) {
        opc = opc || {};
        let conteudos = [...doc.querySelectorAll(SEL_CONTEUDO)];
        conteudos = conteudos.filter((c, i) => !conteudos.some((o, j) => j !== i && o !== c && o.contains(c)));
        if (!conteudos.length) conteudos = [...doc.querySelectorAll('.postbody')];
        const vistos = new Set();
        const out = [];
        conteudos.forEach(c => {
          const raiz = raizDaMensagem(c);
          const id = idDaMensagem(raiz, c);
          if (!id || vistos.has(id)) return;
          vistos.add(id);
          const data = dataDaMensagem(raiz, c, opc);
          const autorEl = raiz.querySelector('.postprofile a[href^="/u"], .author a[href^="/u"], [class*="username"] a[href^="/u"], a[href^="/u"]');
          const citacoes = [...c.querySelectorAll('blockquote, .quote, .quotecontent, .quote_content')].filter((q, i, arr) => !arr.some(o => o !== q && o.contains(q)))
            .map(q => linhasDoElemento(q, { semCite: true }));
          const riscados = [];
          [...c.querySelectorAll('s, strike, del, [style*="line-through"]')].forEach(r => N.partirNicks(r.textContent).nicks.forEach(n => riscados.push(n)));
          const textoFora = (() => { const cl = raiz.cloneNode(true); cl.querySelectorAll('.content').forEach(x => x.remove()); return N.norm(cl.textContent); })();
          out.push({
            id, dia: data ? data.dia : null, dataTexto: data ? data.texto : '', autor: autorEl ? limpar(autorEl.textContent) : '',
            url: (opc.urlBase || '') + '#' + id, linhas: linhasDoElemento(c, { pularCitacoes: true }), citacoes, riscados,
            editado: /editado pela ultima vez|ultima edicao|last edited|editado por|edited by/.test(textoFora)
          });
        });
        return out;
      }

      /* ---------- listagem: tópico (primeira mensagem) e páginas HTML ---------- */
      // Endereços de páginas HTML (/hNNN-) e iframes citados num documento.
      function paginasCitadas(doc, origem) {
        const out = new Set();
        doc.querySelectorAll('iframe[src], a[href]').forEach(el => {
          const c = caminhoDe(el.getAttribute('src') || el.getAttribute('href'), origem);
          if (/^\/h\d+-/.test(c)) out.add(c.replace(/[?#].*$/, ''));
        });
        return [...out];
      }

      return { linhasDoElemento, paginacao, mensagensDaPagina, dataDaMensagem, dataEmTexto, caminhoDe, paginasCitadas, ehCitacao };
    })(LeitorNucleo);
    return { N: LeitorNucleo, D: LeitorDom };
  }
  /* </leitor-requerimentos> */
})();
