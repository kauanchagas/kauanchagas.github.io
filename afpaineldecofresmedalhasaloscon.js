(() => {
  'use strict';

  /* ==================================================================
     CONFIGURAÇÃO
     ================================================================== */
  const CFG = {
    // URL do App da Web do Apps Script (termina em /exec)
    API: 'https://script.google.com/macros/s/AKfycbwZbTfKDpkIk4hbsEV-uqbDGu7rv7iQy3RjTUyYa-Xr6xIW61AatMoXRaG0TPTiTljD0g/exec',
    // Grupos do fórum que veem o painel. A edição é só de quem está na listagem da Auditoria Fiscal.
    // Sem endereço, o painel procura o grupo pelo nome na página de grupos do fórum (/groups).
    GRUPOS: [
      { nome: 'Auditoria Fiscal', endereco: '/g154-auditoria-fiscal' },
      { nome: 'Corregedoria', endereco: '/g9-corregedoria' },
      { nome: 'Corregedoria Suplente', endereco: '/g633-corregedoria-suplente' },
      { nome: 'Procuradoria Militar de Justiça', endereco: '/g721-procuradoria-militar-de-justica' },
      { nome: 'Grupamento de Ações Táticas Especiais', endereco: '' },
      { nome: 'Ministério da Defesa', endereco: '/g22-ministerio-da-defesa' },
      { nome: 'Supremacia', endereco: '/g47-supremacia' }
    ],
    // Por quantos minutos o navegador guarda a conferência dos grupos
    ACESSO_MINUTOS: 30,
    // false: qualquer pessoa conectada ao fórum vê os cofres (sem conferir os grupos acima)
    VERIFICAR_GRUPOS: true,
    // De quantos em quantos segundos o painel se atualiza sozinho
    ATUALIZAR_SEGUNDOS: 300
  };

  /* ------------------------------------------------------------------
     Daqui para baixo não há configuração.
     ------------------------------------------------------------------ */

  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const ABAS = [
    { id: 'geral', rotulo: 'Visão geral', icone: 'fa-chart-column' },
    { id: 'companhias', rotulo: 'Companhias', icone: 'fa-shield-halved', categoria: 'Companhias' },
    { id: 'subcompanhias', rotulo: 'Subcompanhias', icone: 'fa-layer-group', categoria: 'Subcompanhias' },
    { id: 'orgaos', rotulo: 'Órgãos', icone: 'fa-building-columns', categoria: 'Órgãos' },
    { id: 'direcao', rotulo: 'Backup e virada', icone: 'fa-box-archive', admin: true }
  ];
  const SUBABAS = [
    { id: 'cofre', rotulo: 'Cofre do mês', icone: 'fa-vault' },
    { id: 'sub', rotulo: 'Subgrupos', icone: 'fa-sitemap' },
    { id: 'pesq', rotulo: 'Dados de Pesquisa', icone: 'fa-magnifying-glass-chart' },
    { id: 'balanco', rotulo: 'Balanço anual', icone: 'fa-chart-column' }
  ];
  // Cada planilha é uma categoria de grupos, com a sua aba no painel.
  const CATEGORIAS = [
    { cat: 'Companhias', aba: 'companhias', um: 'Companhia', varios: 'companhias', icone: 'fa-shield-halved', planilha: 'companhias' },
    { cat: 'Subcompanhias', aba: 'subcompanhias', um: 'Subcompanhia', varios: 'subcompanhias', icone: 'fa-layer-group', planilha: 'subcompanhias' },
    { cat: 'Órgãos', aba: 'orgaos', um: 'Órgão', varios: 'órgãos', icone: 'fa-building-columns', planilha: 'orgaos' }
  ];
  const daCategoria = cat => CATEGORIAS.find(x => x.cat === cat) || CATEGORIAS[0];
  const TIPO_SECAO = { s: 'Semanal', q: 'Quinzenal', m: 'Mensal', o: 'Ocorrências' };
  const ICONE_SECAO = { s: 'fa-calendar-week', q: 'fa-calendar-days', m: 'fa-user-group', o: 'fa-gavel' };
  const SEMANA_PESQ = [
    { k: 'pos', rotulo: 'Positivos', icone: 'fa-arrow-trend-up' },
    { k: 'neg', rotulo: 'Negativos', icone: 'fa-arrow-trend-down' },
    { k: 'ce', rotulo: 'Casos especiais', icone: 'fa-user-clock' },
    { k: 'ent', rotulo: 'Entradas', icone: 'fa-right-to-bracket' },
    { k: 'sai', rotulo: 'Saídas', icone: 'fa-right-from-bracket' }
  ];
  const CHAVE_TEMA = 'af-cofre:tema';
  const CHAVE_ABA = 'af-cofres:aba';
  const CHAVE_ACESSO = 'af-cofres:acesso:';
  // Versão do Code.gs que esta página espera (a página avisa quando o App da Web está atrás).
  const VERSAO_PLANILHA = '1.1.0';
  const versaoAntes = (a, b) => {
    const x = String(a || '0').split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0);
    return false;
  };

  /* ==================================================================
     UTILITÁRIOS
     ================================================================== */
  const AMP = String.fromCharCode(38);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => AMP + '#' + ch.charCodeAt(0) + ';');
  const semAcento = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normal = s => semAcento(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const limparNome = s => String(s == null ? '' : s).normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  const chaveNick = s => limparNome(s).toLowerCase();
  const dois = n => String(n).padStart(2, '0');
  const plural = (n, um, varios) => `${fmt(n)} ${n === 1 ? um : varios}`;
  const juntar = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
  const frase = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const decodificarHtml = s => { const t = document.createElement('textarea'); t.innerHTML = String(s || ''); return t.value; };
  const NF = new Intl.NumberFormat('pt-BR');
  const fmt = v => (v == null || v === '' || isNaN(v) ? '-' : NF.format(v));
  const soma = l => l.reduce((a, b) => a + (b || 0), 0);
  const temValor = v => v !== null && v !== undefined && v !== '';
  const midiaClaro = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  const midiaReduzido = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const movimentoReduzido = () => !!(midiaReduzido && midiaReduzido.matches);
  const $ = id => document.getElementById(id);

  // Só reescreve o conteúdo quando ele muda (evita repetir animações e trabalho à toa).
  function definirHtml(no, html) {
    if (no.__html === html) return false;
    no.__html = html;
    no.innerHTML = html;
    return true;
  }
  function reanimar(no, classe) {
    if (!no) return;
    no.classList.remove(classe);
    void no.offsetWidth;
    no.classList.add(classe);
    no.addEventListener('animationend', () => no.classList.remove(classe), { once: true });
  }
  function lerLocal(k) { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } }
  function gravarLocal(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* sem armazenamento */ } }
  function lerJson(k) { try { return JSON.parse(lerLocal(k) || 'null'); } catch (_) { return null; } }
  function gravarJson(k, v) { gravarLocal(k, JSON.stringify(v)); }

  /* ---------- datas (texto AAAA-MM-DD, contas em UTC) ---------- */
  const partes = s => { const p = String(s || '').split('-').map(Number); return { y: p[0], m: p[1], d: p[2] || 1 }; };
  const utc = s => { const p = partes(s); return Date.UTC(p.y, p.m - 1, p.d); };
  const isoDe = ms => new Date(ms).toISOString().slice(0, 10);
  const br = s => { if (!s) return ''; const p = partes(s); return `${dois(p.d)} ${MESES_ABREV[p.m - 1]} ${p.y}`; };
  const brCurto = s => { const p = partes(s); return `${dois(p.d)} ${MESES_ABREV[p.m - 1]}`; };
  const intervaloCurto = (a, b) => { const x = partes(a), y = partes(b); return x.m === y.m ? `${dois(x.d)} a ${dois(y.d)} ${MESES_ABREV[y.m - 1]}` : `${brCurto(a)} a ${brCurto(b)}`; };
  const hoje = () => (S.dados && S.dados.hoje) || isoDe(Date.now() - 3 * 36e5);
  const dentro = (d, a, b) => !!a && !!b && a <= d && d <= b;
  // "2026-10-24 09:30" vira "24 Out 2026, 09:30"
  const brHora = s => { const m = /^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d)/.exec(String(s || '')); return m ? `${br(m[1])}, ${m[2]}` : String(s || ''); };

  /* ==================================================================
     PLANILHA (Apps Script)
     ================================================================== */
  const apiConfigurada = () => !!window.COFRES_AF_TRANSPORTE || /^https:\/\/script\.google(usercontent)?\.com\//.test(CFG.API);
  const transporte = window.COFRES_AF_TRANSPORTE || {
    async get(params) {
      const r = await fetch(CFG.API + '?' + new URLSearchParams(params).toString(), { cache: 'no-store', redirect: 'follow' });
      return r.json();
    },
    async post(corpo) {
      const r = await fetch(CFG.API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(corpo), redirect: 'follow' });
      return r.json();
    }
  };
  async function api(metodo, dados, segundos) {
    let r;
    try {
      r = await Promise.race([
        transporte[metodo](dados),
        new Promise((_, falhar) => setTimeout(() => falhar(new Error('tempo')), (segundos || 40) * 1000))
      ]);
    } catch (_) {
      throw new Error('A planilha não respondeu. Verifique a conexão e tente de novo.');
    }
    if (!r || r.ok !== true) throw new Error((r && r.erro) || 'Resposta inesperada da planilha.');
    return r;
  }

  /* ==================================================================
     FÓRUM: sessão e grupos
     ================================================================== */
  const nickValido = n => !!n && !/^(anonymous|visitante|convidado)$/i.test(n);
  async function obterUsuario() {
    if (typeof window.COFRES_AF_SESSAO === 'function') return window.COFRES_AF_SESSAO();
    const ud = window._userdata;
    if (ud && typeof ud === 'object' && 'session_logged_in' in ud) {
      if (+ud.session_logged_in !== 1) return null;
      const nome = limparNome(decodificarHtml(ud.username));
      return nickValido(nome) ? { nick: nome, id: String(ud.user_id || '') } : null;
    }
    const html = await (await fetch('/forum', { credentials: 'same-origin', cache: 'no-store' })).text();
    const logado = html.match(/_userdata\["session_logged_in"\]\s*=\s*(\d)/);
    if (logado && logado[1] !== '1') return null;
    const m = html.match(/_userdata\["username"\]\s*=\s*"((?:[^"\\]|\\.)*)"/);
    if (!m) throw new Error('sessão ilegível');
    let nome = '';
    try { nome = JSON.parse('"' + m[1] + '"'); } catch (_) { nome = m[1].replace(/\\(.)/g, '$1'); }
    nome = limparNome(decodificarHtml(nome));
    const id = (html.match(/_userdata\["user_id"\]\s*=\s*(-?\d+)/) || [])[1] || '';
    return nickValido(nome) ? { nick: nome, id } : null;
  }

  // Partes da página do fórum que não são a lista de membros (topo, menus, rodapé, barra do Forumeiros).
  const FORA_DA_LISTA = 'header, nav, footer, aside, #page-header, #page-footer, .headerbar, .navbar, #navbar, #fa_toolbar, #fa_right, #fa_toolbar_hidden, #chatbox, .chatbox';
  const caminhoDe = href => {
    try { const u = new URL(href, location.origin); return u.origin === location.origin ? u.pathname + u.search : ''; } catch (_) { return ''; }
  };
  const idGrupo = c => { const m = /^\/g(\d+)(?:p\d+)?-/.exec(c) || /^\/groupcp\?g=(\d+)/.exec(c); return m ? m[1] : ''; };
  async function lerPagina(caminho) {
    const r = await fetch(caminho, { credentials: 'same-origin', cache: 'no-store' });
    if (!r.ok) throw new Error('página ' + r.status);
    return new DOMParser().parseFromString(await r.text(), 'text/html');
  }
  // Quantas vezes o perfil da pessoa aparece fora do topo, dos menus e do rodapé.
  function marcasDoUsuario(doc, u) {
    doc.querySelectorAll(FORA_DA_LISTA).forEach(n => n.remove());
    let n = 0;
    doc.querySelectorAll('a[href]').forEach(a => {
      const m = /^\/u(\d+)(?:[-/?#]|$)/.exec(caminhoDe(a.getAttribute('href')));
      if (!m) return;
      if (u.id ? m[1] === String(u.id) : chaveNick(a.textContent) === chaveNick(u.nick)) n++;
    });
    return n;
  }
  async function membroDoGrupo(caminho, u, base) {
    const id = idGrupo(caminho), vistas = new Set(), fila = [caminho];
    while (fila.length && vistas.size < 30) {
      const atual = fila.shift();
      if (vistas.has(atual)) continue;
      vistas.add(atual);
      const doc = await lerPagina(atual);
      const paginas = [...doc.querySelectorAll('a[href]')].map(a => caminhoDe(a.getAttribute('href')))
        .filter(c => c && idGrupo(c) === id && (/^\/g\d+p\d+-/.test(c) || /[?&]start=\d+/.test(c)));
      if (marcasDoUsuario(doc, u) > base) return true;
      paginas.forEach(c => { if (!vistas.has(c) && !fila.includes(c)) fila.push(c); });
    }
    return false;
  }
  // Nome do grupo sem as palavras de ligação: "Ações Táticas Especiais" acha "Ações Táticas e Especiais".
  const chaveGrupo = s => normal(s).split(' ').filter(p => !/^(de|da|do|das|dos|e)$/.test(p)).join(' ');
  function acharGrupo(doc, nome) {
    const alvo = chaveGrupo(nome), links = [...doc.querySelectorAll('a[href]')].filter(x => idGrupo(caminhoDe(x.getAttribute('href'))));
    const a = links.find(x => chaveGrupo(x.textContent) === alvo) || links.find(x => chaveGrupo(x.textContent).indexOf(alvo) >= 0);
    return a ? caminhoDe(a.getAttribute('href')) : '';
  }
  /** Grupos (de CFG.GRUPOS) em que a pessoa está. Para no primeiro encontrado. */
  async function verificarAcesso(u) {
    if (typeof window.COFRES_AF_ACESSO === 'function') return window.COFRES_AF_ACESSO(u);
    const chave = CHAVE_ACESSO + (u.id || chaveNick(u.nick)), salvo = lerJson(chave);
    if (salvo && salvo.ate > Date.now() && Array.isArray(salvo.grupos)) return salvo.grupos;
    let base = 0, lista = null, falhas = 0, tentativas = 0;
    try { base = marcasDoUsuario(await lerPagina('/faq'), u); } catch (_) { base = 0; }
    const achados = [];
    for (const g of CFG.GRUPOS) {
      let caminho = g.endereco || '';
      if (!caminho) {
        if (!lista) { try { lista = await lerPagina('/groups'); } catch (_) { lista = null; } }
        caminho = lista ? acharGrupo(lista, g.nome) : '';
      }
      if (!caminho) continue;
      tentativas++;
      try {
        if (await membroDoGrupo(caminho, u, base)) { achados.push(g.nome); break; }
      } catch (_) { falhas++; }
    }
    if (tentativas && falhas === tentativas) throw new Error('grupos ilegíveis');
    gravarJson(chave, { ate: Date.now() + (achados.length ? CFG.ACESSO_MINUTOS : 2) * 60000, grupos: achados });
    return achados;
  }

  /* ==================================================================
     ESTADO
     ================================================================== */
  const S = {
    sessao: 'verificando', usuario: null, acesso: 'verificando', grupos: [],
    dados: null, erro: '', carregando: false, seq: 0, atualizadoEm: 0,
    ano: 0, mes: 0, aba: 'geral', abaUrl: false, sub: 'cofre', grupo: { Companhias: '', Subcompanhias: '', 'Órgãos': '' },
    editando: false, mudancas: new Map(), senha: '', busca: '', tabelas: {}, animada: '',
    aoFecharModal: null, acoesModal: [], focoAntes: null, renderPendente: false, ocupado: false
  };
  const el = {
    tema: $('tema'), usuario: $('usuario'), usuarioAvatar: $('usuario-avatar'), usuarioIcone: $('usuario-icone'),
    usuarioRotulo: $('usuario-rotulo'), usuarioNome: $('usuario-nome'), avisos: $('avisos'), navegacao: $('navegacao'),
    abas: $('abas'), ano: $('ano'), mes: $('mes'), atualizar: $('atualizar'), conteudo: $('conteudo'), modal: $('modal'),
    toasts: $('toasts'), dica: $('dica-grafico'), nicks: $('lista-nicks'), anoRodape: $('ano-rodape'), barra: $('barra')
  };

  const voce = () => (S.dados && S.dados.voce) || { editor: false, admin: false, naListagem: false };
  const ehEditor = () => !!voce().editor;
  const ehAdmin = () => !!voce().admin;
  const podeVer = () => S.acesso === 'ok' || !!voce().naListagem;
  const grupos = () => (S.dados ? S.dados.grupos : []);
  const grupoPorId = id => grupos().find(g => g.id === id) || null;
  const doMes = (g, m) => (g && g.meses[(m || S.mes) - 1]) || null;
  const editavel = g => !!g && !!S.dados && ehEditor() && !!(S.dados.planilhas[g.planilha] && S.dados.planilhas[g.planilha].editavel);

  /* ---------- números de um grupo no mês ---------- */
  function resumoMes(g, m) {
    const mm = doMes(g, m) || {};
    const c = mm.cofre, s = mm.sub;
    const pos = c ? (c.tot && temValor(c.tot[1]) ? c.tot[1] : c.soma[0]) : null;
    const neg = c ? (c.tot && temValor(c.tot[2]) ? c.tot[2] : c.soma[1]) : null;
    const temp = s ? (s.tot && temValor(s.tot[1]) ? s.tot[1] : s.soma) : null;
    const lancado = !!(c && c.sec.some(x => x.l.some(l => temValor(l[4]) || temValor(l[5])))) || !!(s && s.l.length);
    return { pos, neg, temp, lancado, aud: c && c.aud ? c.aud.v : '', alertas: mm.alertas || [] };
  }
  const somaGrupos = (lista, m, k) => soma(lista.map(g => resumoMes(g, m)[k]));
  // Último mês com algum lançamento (até o mês de hoje no ano atual).
  function mesInicial() {
    const d = S.dados, h = partes(hoje());
    const limite = d.ano === h.y ? h.m : d.ano < h.y ? 12 : 1;
    for (let m = limite; m >= 1; m--) if (d.grupos.some(g => resumoMes(g, m).lancado)) return m;
    return limite;
  }

  /* ---------- pedaços de HTML ---------- */
  const iniciais = nome => semAcento(nome).split(/\s+/).filter(w => w.length > 2).map(w => w[0]).join('').slice(0, 4).toUpperCase();
  function emblema(g, grande) {
    const sigla = esc(g.id || iniciais(g.nome));
    return g.emblema
      ? `<img class="emblema${grande ? ' emblema-g' : ''}" src="${esc(g.emblema)}" alt="" loading="lazy" data-sigla="${sigla}">`
      : `<span class="emblema-falta${grande ? ' emblema-g' : ''}" aria-hidden="true">${sigla}</span>`;
  }
  const urlCabeca = nick => 'https://www.habbo.com.br/habbo-imaging/avatarimage?' +
    new URLSearchParams({ user: nick, direction: '2', head_direction: '3', headonly: '1', size: 'm' }).toString();
  // Com mais de um nick na célula ("Fulano / Ciclano"), a cabeça é a do primeiro.
  const primeiroNick = nick => limparNome(String(nick || '').split('/')[0]);
  const cabeca = (nick, pequena) => { const n = primeiroNick(nick); return `<span class="cabeca${pequena ? ' cabeca-p' : ''}" aria-hidden="true"><i class="fa-solid fa-user"></i>${n ? `<img src="${esc(urlCabeca(n))}" alt="" loading="lazy">` : ''}</span>`; };
  const cartao = (html, extra) => `<section class="cartao${extra ? ' ' + extra : ''}">${html}</section>`;
  const vazio = (icone, titulo, texto, acao) => `<div class="vazio"><span class="vazio-icone"><i class="fa-solid ${icone}" aria-hidden="true"></i></span><p class="vazio-titulo">${esc(titulo)}</p>${texto ? `<p class="vazio-texto">${esc(texto)}</p>` : ''}${acao || ''}</div>`;
  const secao = (icone, titulo, extra) => `<h3 class="secao"><span class="secao-num"><i class="fa-solid ${icone}" aria-hidden="true"></i></span>${titulo}<span class="secao-linha"></span>${extra || ''}</h3>`;
  const botaoFechar = () => '<button type="button" class="fechar" data-acao="fechar" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>';
  function aviso(tipo, icone, titulo, texto, acao) {
    return `<div class="aviso aviso-${tipo}"><i class="fa-solid ${icone}" aria-hidden="true"></i><p class="min-w-0 flex-1"><span class="font-semibold">${esc(titulo)}</span> <span class="opacity-80">${esc(texto)}</span></p>${acao || ''}</div>`;
  }
  const num = (v, classe) => `<span class="num${v === 0 || !temValor(v) ? ' zero' : ''}${classe ? ' ' + classe : ''}">${fmt(v)}</span>`;
  const mesNome = m => MESES[m - 1];

  /* ==================================================================
     TOPO: usuário, avisos, abas, ano e mês
     ================================================================== */
  function renderUsuario() {
    const s = S.sessao, v = voce();
    el.usuario.dataset.estado = s === 'ok' ? (S.acesso === 'negado' && !v.naListagem ? 'aviso' : 'ok') : s === 'deslogado' ? 'erro' : s === 'erro' ? 'aviso' : '';
    el.usuarioRotulo.textContent = s !== 'ok' ? 'Sessão do fórum' : v.cargo ? v.cargo : S.grupos.length ? S.grupos[0] : 'Conectado como';
    el.usuarioNome.textContent = s === 'ok' ? S.usuario.nick : s === 'deslogado' ? 'Não conectado' : s === 'erro' ? 'Não confirmada' : 'Verificando...';
    const comFoto = s === 'ok';
    if (comFoto && el.usuarioAvatar.dataset.nick !== S.usuario.nick) {
      el.usuarioAvatar.dataset.nick = S.usuario.nick;
      el.usuarioAvatar.src = urlCabeca(S.usuario.nick);
    }
    el.usuarioAvatar.hidden = !comFoto || el.usuarioAvatar.dataset.falhou === '1';
    el.usuarioIcone.hidden = !el.usuarioAvatar.hidden;
  }

  function renderAvisos() {
    const itens = [], d = S.dados;
    if (!apiConfigurada()) itens.push(aviso('aviso', 'fa-plug-circle-xmark', 'O painel ainda não está ligado às planilhas.', 'Cole a URL do App da Web em CFG.API.'));
    if (S.erro && d && podeVer()) itens.push(aviso('aviso', 'fa-cloud', 'Não foi possível atualizar o painel.', S.erro, '<button type="button" class="btn-mini" data-acao="recarregar"><i class="fa-solid fa-rotate"></i>Tentar de novo</button>'));
    if (d && podeVer()) {
      if (ehEditor() && d.listagem && !d.listagem.ok) itens.push(aviso('aviso', 'fa-address-book', 'Não foi possível ler a listagem de membros.', frase(d.listagem.erro) || ''));
      if (ehEditor() && versaoAntes(d.versao, VERSAO_PLANILHA)) itens.push(aviso('aviso', 'fa-code-branch', `O App da Web está na versão ${d.versao || 'anterior'}, e esta página é da ${VERSAO_PLANILHA}.`, 'Publique o código novo em Implantar > Gerenciar implantações > Editar > Nova versão.'));
      if (d.somenteLeitura) itens.push(aviso('info', 'fa-box-archive', `${d.ano} está no backup.`, 'Os números deste ano ficam só para consulta.'));
      if (ehEditor() && d.avisos && d.avisos.length) d.avisos.forEach(t => itens.push(aviso('aviso', 'fa-triangle-exclamation', 'Planilha:', t)));
    }
    definirHtml(el.avisos, itens.join(''));
    el.avisos.hidden = !itens.length;
  }

  const abasVisiveis = () => ABAS.filter(a => !a.admin || ehAdmin());
  function renderAbas() {
    const vis = abasVisiveis();
    if (!vis.some(a => a.id === S.aba)) S.aba = 'geral';
    definirHtml(el.abas, vis.map(a => {
      const sel = a.id === S.aba;
      return `<button type="button" role="tab" class="aba" id="aba-${a.id}" data-aba="${a.id}" aria-selected="${sel}" aria-controls="conteudo" tabindex="${sel ? 0 : -1}"><i class="fa-solid ${a.icone}" aria-hidden="true"></i><span>${a.rotulo}</span></button>`;
    }).join(''));
    ajustarAbas();
  }
  function ajustarAbas() {
    el.abas.classList.remove('compacta');
    if (el.abas.scrollWidth > el.abas.clientWidth + 1) el.abas.classList.add('compacta');
    const atual = el.abas.querySelector('[aria-selected="true"]');
    if (atual && el.abas.scrollWidth > el.abas.clientWidth) {
      const r = atual.getBoundingClientRect(), c = el.abas.getBoundingClientRect();
      if (r.left < c.left || r.right > c.right) el.abas.scrollLeft += r.left - c.left - (c.width - r.width) / 2;
    }
  }
  function renderSeletores() {
    const d = S.dados;
    el.navegacao.hidden = !(d && podeVer() && apiConfigurada());
    if (!d) return;
    definirHtml(el.ano, d.anos.map(a => `<option value="${a.ano}">${a.ano}${a.fonte === 'backup' ? ' (backup)' : ''}</option>`).join(''));
    el.ano.value = String(S.ano || d.ano);
    el.ano.disabled = S.carregando || d.anos.length < 2;
    definirHtml(el.mes, MESES.map((n, i) => `<option value="${i + 1}">${n}</option>`).join(''));
    el.mes.value = String(S.mes);
    el.mes.disabled = S.carregando;
    el.atualizar.disabled = S.carregando;
    el.atualizar.classList.toggle('girando', S.carregando);
  }

  /* ==================================================================
     CONTEÚDO
     ================================================================== */
  const PAINEIS = {};
  function esqueleto() {
    return cartao(`<div class="space-y-4" aria-busy="true" aria-label="Carregando">
      <div class="esqueleto h-3 w-24"></div><div class="esqueleto h-9 w-64 max-w-full"></div>
      <div class="kpis"><div class="esqueleto h-28"></div><div class="esqueleto h-28"></div><div class="esqueleto h-28"></div><div class="esqueleto h-28"></div></div>
      <div class="esqueleto h-56"></div>
    </div>`);
  }
  function telaSemAcesso() {
    if (S.sessao === 'deslogado') return cartao(vazio('fa-right-to-bracket', 'Entre no fórum para ver os cofres', 'O painel é de quem faz parte da Auditoria Fiscal e dos grupos de leitura.', '<a href="/login" class="btn-pri mt-2"><i class="fa-solid fa-right-to-bracket"></i>Entrar</a>'));
    if (S.sessao === 'erro') return cartao(vazio('fa-circle-exclamation', 'Não foi possível confirmar sua sessão no fórum', 'Recarregue a página para tentar de novo.', '<button type="button" class="btn-pri mt-2" data-acao="recarregar-tudo"><i class="fa-solid fa-rotate"></i>Tentar de novo</button>'));
    if (S.acesso === 'erro') return cartao(vazio('fa-users-viewfinder', 'Não foi possível conferir seus grupos no fórum', 'Recarregue a página para tentar de novo.', '<button type="button" class="btn-pri mt-2" data-acao="recarregar-tudo"><i class="fa-solid fa-rotate"></i>Tentar de novo</button>'));
    const lista = `<div class="grupos-acesso">${CFG.GRUPOS.map(g => `<span>${esc(g.nome)}</span>`).join('')}</div>`;
    return cartao(`<div class="vazio"><span class="vazio-icone"><i class="fa-solid fa-lock" aria-hidden="true"></i></span>
      <p class="vazio-titulo">Painel restrito</p>
      <p class="vazio-texto">Os cofres de medalhas ficam visíveis para estes grupos do fórum:</p>${lista}</div>`);
  }
  function renderConteudo() {
    let html;
    if (!apiConfigurada()) html = cartao(vazio('fa-plug-circle-xmark', 'Painel desligado', 'Cole a URL do App da Web em CFG.API para carregar os cofres.'));
    else if (S.sessao === 'verificando') html = esqueleto();
    else if (S.sessao !== 'ok') html = telaSemAcesso();
    else if (S.acesso === 'verificando' && !voce().naListagem) html = esqueleto();
    else if (!podeVer()) html = S.dados || (S.erro && !S.carregando) ? telaSemAcesso() : esqueleto();
    else if (!S.dados) {
      html = S.erro && !S.carregando
        ? cartao(vazio('fa-cloud', 'Não foi possível carregar os cofres', S.erro, '<button type="button" class="btn-pri mt-2" data-acao="recarregar"><i class="fa-solid fa-rotate"></i>Tentar de novo</button>'))
        : esqueleto();
    } else html = PAINEIS[S.aba]();
    const nova = S.animada !== S.aba + ':' + (S.aba === 'geral' ? '' : S.grupo[catDaAba()] || '');
    if (definirHtml(el.conteudo, html) && nova && S.dados) {
      S.animada = S.aba + ':' + (S.aba === 'geral' ? '' : S.grupo[catDaAba()] || '');
      reanimar(el.conteudo.firstElementChild, 'entra');
    }
    el.conteudo.setAttribute('role', 'tabpanel');
    el.conteudo.setAttribute('aria-labelledby', 'aba-' + S.aba);
    aplicarBusca();
    renderBarraGravar();
  }
  function renderTudo() {
    renderUsuario();
    renderAvisos();
    if (S.dados && podeVer()) renderAbas();
    renderSeletores();
    renderConteudo();
  }
  const podeRedesenhar = () => {
    const a = document.activeElement;
    return !(a && el.conteudo.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
  };
  const catDaAba = () => (ABAS.find(a => a.id === S.aba) || {}).categoria || '';

  /* ==================================================================
     GRÁFICOS (barras do balanço e faíscas)
     ================================================================== */
  function passoBonito(x) {
    if (!(x > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  const compacto = v => (Math.abs(v) >= 1000 ? NF.format(Math.round(v / 100) / 10) + ' mil' : NF.format(v));
  /**
   * Balanço mês a mês: positivas para cima e negativas para baixo, na mesma escala.
   * linhas: [{ m, pos, neg, temp }]. Clicar numa coluna escolhe o mês.
   */
  function graficoBalanco(id, titulo, linhas, comTemp) {
    const H = 210;
    const maxP = Math.max(0, ...linhas.map(x => x.pos || 0)), maxN = Math.max(0, ...linhas.map(x => Math.abs(x.neg || 0)));
    if (!maxP && !maxN) {
      return `<figure class="grafico"><figcaption class="grafico-cab"><span class="text-[13.5px] font-semibold text-texto">${esc(titulo)}</span></figcaption>
        <div class="rounded-2xl border border-dashed border-realce/10 px-4 py-10 text-center text-[13px] text-musgo">Sem medalhas lançadas neste ano.</div></figure>`;
    }
    const total = maxP + maxN || 1, passo = passoBonito(total / 4);
    const topoP = Math.ceil(maxP / passo) * passo, topoN = Math.ceil(maxN / passo) * passo, faixa = (topoP + topoN) || passo;
    const hP = Math.round(H * topoP / faixa), hN = H - hP, px = v => Math.round(Math.abs(v || 0) * H / faixa);
    const marcas = [];
    for (let v = passo; v <= topoP + 1e-9; v += passo) marcas.push({ v, y: hP - px(v) });
    for (let v = passo; v <= topoN + 1e-9; v += passo) marcas.push({ v: -v, y: hP + px(v) });
    const tabela = !!S.tabelas[id];
    const col = x => {
      const atual = x.m === S.mes;
      const rot = `${mesNome(x.m)}: ${fmt(x.pos || 0)} positivas, ${fmt(x.neg || 0)} negativas${comTemp ? `, ${fmt(x.temp || 0)} temporárias` : ''}`;
      return `<div class="gcol" role="button" tabindex="0" data-acao="escolher-mes" data-mes="${x.m}" data-dica="${esc(JSON.stringify({ m: x.m, pos: x.pos, neg: x.neg, temp: comTemp ? x.temp : null }))}" aria-label="${esc(rot)}"${atual ? ' aria-current="true"' : ''}>
        <div class="gcol-pos" style="height:${hP}px">${x.pos ? `<span style="height:${Math.max(2, px(x.pos))}px"></span>` : ''}</div>
        <div class="gcol-neg" style="height:${hN}px">${x.neg ? `<span style="height:${Math.max(2, px(x.neg))}px"></span>` : ''}</div>
        <div class="gcol-mes">${MESES_ABREV[x.m - 1]}</div></div>`;
    };
    const grafico = `<div class="grafico-area" style="height:${H + 28}px">
        <div class="grafico-escala" style="height:${H}px">${marcas.map(t => `<span style="top:${t.y}px">${compacto(t.v)}</span>`).join('')}<span style="top:${hP}px">0</span></div>
        ${marcas.map(t => `<div class="grafico-grade" style="top:${t.y}px"></div>`).join('')}
        <div class="grafico-base" style="top:${hP}px"></div>
        ${linhas.map(col).join('')}
      </div>`;
    const tab = `<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Mês</th><th class="d">Positivas</th><th class="d">Negativas</th>${comTemp ? '<th class="d">Temporárias</th>' : ''}</tr></thead>
      <tbody>${linhas.map(x => `<tr${x.m === S.mes ? ' class="bg-realce/[0.03]"' : ''}><td>${mesNome(x.m)}</td><td class="d">${num(x.pos)}</td><td class="d">${num(x.neg)}</td>${comTemp ? `<td class="d">${num(x.temp)}</td>` : ''}</tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="d">${fmt(soma(linhas.map(x => x.pos)))}</td><td class="d">${fmt(soma(linhas.map(x => x.neg)))}</td>${comTemp ? `<td class="d">${fmt(soma(linhas.map(x => x.temp)))}</td>` : ''}</tr></tfoot></table></div>`;
    return `<figure class="grafico">
      <figcaption class="grafico-cab">
        <span class="text-[13.5px] font-semibold text-texto">${esc(titulo)}</span>
        <span class="flex flex-wrap items-center gap-3">
          <span class="legenda"><span><i class="marca" style="background:var(--serie-pos)"></i>Positivas</span><span><i class="marca" style="background:var(--serie-neg)"></i>Negativas</span></span>
          <button type="button" class="btn-mini" data-acao="alternar-tabela" data-tabela="${esc(id)}" aria-pressed="${tabela}"><i class="fa-solid fa-table"></i>Tabela</button>
        </span>
      </figcaption>
      ${tabela ? tab : grafico}
    </figure>`;
  }
  function faisca(valores, atual, serie) {
    const max = Math.max(1, ...valores.map(v => Math.abs(v || 0)));
    return `<div class="faisca" data-serie="${serie}" aria-hidden="true">${valores.map((v, i) => `<span class="${i + 1 === atual ? 'atual' : ''}" style="height:${Math.max(7, Math.round(Math.abs(v || 0) / max * 100))}%"></span>`).join('')}</div>`;
  }
  function delta(atual, antes, maiorEhBom, rotuloAntes) {
    if (!temValor(antes) || !temValor(atual) || antes === 0) return rotuloAntes ? `<span>sem comparação com ${esc(rotuloAntes)}</span>` : '';
    const d = atual - antes;
    if (d === 0) return `<span class="delta"><i class="fa-solid fa-equals"></i>igual a ${esc(rotuloAntes)}</span>`;
    const p = Math.round(Math.abs(d / antes) * 100), subiu = Math.abs(atual) > Math.abs(antes);
    const bom = maiorEhBom ? subiu : !subiu;
    return `<span class="delta" data-bom="${bom ? 'sim' : 'nao'}"><i class="fa-solid ${subiu ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>${p}%</span><span>em relação a ${esc(rotuloAntes)}</span>`;
  }
  function kpi(rotulo, marca, valor, rodape, extra) {
    return `<div class="kpi"><p class="kpi-rotulo">${marca ? `<i class="kpi-marca" style="background:${marca}"></i>` : ''}${esc(rotulo)}</p>
      <p class="kpi-valor">${valor}</p>${rodape ? `<p class="kpi-rodape">${rodape}</p>` : ''}${extra || ''}</div>`;
  }

  /* ==================================================================
     VISÃO GERAL
     ================================================================== */
  PAINEIS.geral = () => {
    const d = S.dados, m = S.mes, todos = d.grupos, ant = m > 1 ? m - 1 : 0, h = partes(hoje());
    const andamento = d.ano === h.y && m === h.m ? '<span class="inline-flex items-center gap-1.5"><i class="fa-regular fa-clock text-[10px]"></i>Mês em andamento</span>' : '';
    const comparar = (atual, antes, bom) => andamento || (ant ? delta(atual, antes, bom, MESES[ant - 1].toLowerCase()) : '');
    const serie = k => Array.from({ length: 12 }, (_, i) => somaGrupos(todos, i + 1, k));
    const pos = serie('pos'), neg = serie('neg'), temp = serie('temp');
    const lancados = todos.filter(g => resumoMes(g, m).lancado), faltam = todos.filter(g => !resumoMes(g, m).lancado);
    const kpis = `<div class="kpis">
      ${kpi('Positivas nos cofres', 'var(--serie-pos)', fmt(pos[m - 1]), comparar(pos[m - 1], pos[ant - 1], true), faisca(pos, m, 'pos'))}
      ${kpi('Negativas nos cofres', 'var(--serie-neg)', fmt(neg[m - 1]), comparar(neg[m - 1], neg[ant - 1], false), faisca(neg, m, 'neg'))}
      ${kpi('Temporárias dos subgrupos', '', fmt(temp[m - 1]), comparar(temp[m - 1], temp[ant - 1], true), faisca(temp, m, 'pos'))}
      ${kpi('Cofres com lançamento', '', `${lancados.length}<span class="text-[17px] font-medium text-musgo"> de ${todos.length}</span>`,
        faltam.length ? `<span class="truncate">Sem lançamento: ${esc(juntar(faltam.map(g => g.id)))}</span>` : '<span>Todos os grupos lançaram o mês.</span>')}
    </div>`;
    const linhas = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, pos: pos[i], neg: neg[i], temp: temp[i] }));
    const tabelaCat = cat => {
      const lista = todos.filter(g => g.categoria === cat), comTemp = lista.some(g => g.abas.sub);
      if (!lista.length) return '';
      const maxP = Math.max(1, ...lista.map(g => resumoMes(g, m).pos || 0)), maxN = Math.max(1, ...lista.map(g => Math.abs(resumoMes(g, m).neg || 0)));
      return cartao(`${secao(daCategoria(cat).icone, cat, `<span class="contador">${esc(mesNome(m))} de ${d.ano}</span>`)}
        <div class="tabela-caixa"><table class="tabela"><thead><tr><th>Grupo</th><th class="hidden lg:table-cell">Auditor responsável</th><th class="d">Positivas</th><th class="d">Negativas</th>${comTemp ? '<th class="d hidden md:table-cell">Temporárias</th>' : ''}<th class="hidden md:table-cell">Situação</th></tr></thead><tbody>
        ${lista.map(g => {
          const r = resumoMes(g, m);
          const pend = ehEditor() && r.alertas.length ? `<span class="selo selo-aviso ml-1.5" title="${esc(r.alertas.join(' | '))}"><i class="fa-solid fa-triangle-exclamation"></i>${r.alertas.length}</span>` : '';
          return `<tr class="clicavel" tabindex="0" data-acao="abrir-grupo" data-grupo="${g.id}">
            <td class="!whitespace-normal"><span class="flex items-center gap-3">${emblema(g)}<span class="min-w-0"><span class="block max-w-[260px] font-semibold leading-snug text-texto">${esc(g.nome)}</span><span class="block text-[11.5px] text-musgo">${esc(g.id)}${r.lancado ? '' : '<span class="md:hidden"> · sem lançamento</span>'}</span></span></span></td>
            <td class="hidden lg:table-cell">${r.aud ? `<span class="pessoa">${cabeca(r.aud, true)}<span class="max-w-[150px] truncate">${esc(r.aud)}</span></span>` : '<span class="text-musgo/70">-</span>'}</td>
            <td class="d"><span class="inline-flex items-center justify-end gap-2.5"><span class="hidden h-1.5 w-16 overflow-hidden rounded-full bg-realce/[0.06] sm:block"><span class="block h-full rounded-full" style="width:${Math.round((r.pos || 0) / maxP * 100)}%;background:var(--serie-pos)"></span></span>${num(r.pos)}</span></td>
            <td class="d"><span class="inline-flex items-center justify-end gap-2.5"><span class="hidden h-1.5 w-16 overflow-hidden rounded-full bg-realce/[0.06] sm:block"><span class="block h-full rounded-full" style="width:${Math.round(Math.abs(r.neg || 0) / maxN * 100)}%;background:var(--serie-neg)"></span></span>${num(r.neg)}</span></td>
            ${comTemp ? `<td class="d hidden md:table-cell">${g.abas.sub ? num(r.temp) : '<span class="text-musgo/50">-</span>'}</td>` : ''}
            <td class="hidden md:table-cell">${r.lancado ? '<span class="selo selo-ok"><i class="fa-solid fa-check"></i>Lançado</span>' : '<span class="selo selo-vazio"><i class="fa-regular fa-clock"></i>Sem lançamento</span>'}${pend}</td>
          </tr>`;
        }).join('')}
        </tbody></table></div>`, 'mt-5');
    };
    return `${cartao(`<p class="kicker">Visão geral</p>
        <h2 class="painel-titulo">${esc(mesNome(m))} de ${d.ano}</h2>
        <p class="painel-sub">${plural(todos.length, 'grupo', 'grupos')} nos cofres: ${juntar(CATEGORIAS.map(x => [x, todos.filter(g => g.categoria === x.cat).length]).filter(x => x[1]).map(([x, n]) => plural(n, x.um.toLowerCase(), x.varios)))}.</p>
        <div class="mt-6">${kpis}</div>
        <div class="mt-7">${graficoBalanco('geral', `Balanço de ${d.ano} nos cofres`, linhas, true)}</div>`)}
      ${CATEGORIAS.map(x => tabelaCat(x.cat)).join('')}`;
  };

  /* ==================================================================
     GRUPO: cofre, subgrupos, dados de pesquisa e balanço
     ================================================================== */
  function grupoAtual() {
    const cat = catDaAba(), lista = grupos().filter(g => g.categoria === cat);
    let g = lista.find(x => x.id === S.grupo[cat]);
    if (!g) { g = lista[0] || null; if (g) S.grupo[cat] = g.id; }
    return { g, lista };
  }
  const subabasDe = g => SUBABAS.filter(s => (s.id !== 'sub' || g.abas.sub) && (s.id !== 'pesq' || g.temPesquisa));
  function painelGrupo() {
    const { g, lista } = grupoAtual();
    if (!g) return cartao(vazio('fa-folder-open', 'Nenhum grupo nesta planilha', 'As abas do ano não foram encontradas.'));
    const m = S.mes, r = resumoMes(g, m), mm = doMes(g, m), subs = subabasDe(g);
    if (!subs.some(s => s.id === S.sub)) S.sub = 'cofre';
    const chips = `<div class="chips-grupos" role="group" aria-label="Grupos">${lista.map(x => {
      const rx = resumoMes(x, m);
      return `<button type="button" class="chip-grupo" style="--cor:${esc(x.cor)}" data-acao="abrir-grupo" data-grupo="${x.id}" aria-pressed="${x.id === g.id}">${emblema(x)}<span>${esc(x.id)}<small>${rx.lancado ? `${fmt(rx.pos)} · ${fmt(rx.neg)}` : 'sem lançamento'}</small></span></button>`;
    }).join('')}</div>`;
    const pl = S.dados.planilhas[g.planilha] || {}, aba = g.abas[S.sub === 'balanco' ? 'cofre' : S.sub] || g.abas.cofre;
    const link = pl.url && aba ? `<a class="btn-mini" href="${esc(pl.url + '#gid=' + aba.gid)}" target="_blank" rel="noopener"><i class="fa-solid fa-table"></i>Abrir na planilha</a>` : '';
    const podeEditar = editavel(g) && S.sub !== 'balanco' && (S.sub !== 'pesq' || !!g.abas.pesq);
    const btnEditar = podeEditar ? `<button type="button" class="btn-mini" data-acao="editar" aria-pressed="${S.editando}"><i class="fa-solid ${S.editando ? 'fa-check' : 'fa-pen-to-square'}"></i>${S.editando ? 'Concluir edição' : 'Editar'}</button>` : '';
    const leitura = !editavel(g) && ehEditor() ? '<span class="selo selo-ler"><i class="fa-solid fa-lock"></i>Só leitura</span>' : '';
    const audCofre = mm && mm.cofre && mm.cofre.aud;
    const audHtml = S.editando && S.sub === 'cofre' && audCofre && editavel(g)
      ? `<span class="inline-flex items-center gap-2">Auditor responsável <span class="w-[180px]">${campoEd(g, 'cofre', audCofre.r, mm.cofre.c, audCofre.v, { rotulo: `${g.id} · ${mesNome(m)} · Auditor responsável`, lista: 'lista-nicks' })}</span></span>`
      : r.aud ? `<span class="pessoa">Auditor responsável ${cabeca(r.aud, true)}<b>${esc(r.aud)}</b></span>` : '<span>Sem auditor responsável no mês</span>';
    const minis = `<div class="mt-5 grid gap-3" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      ${miniKpi('Positivas', fmt(r.pos), 'fa-arrow-trend-up')}
      ${miniKpi('Negativas', fmt(r.neg), 'fa-arrow-trend-down')}
      ${g.abas.sub ? miniKpi('Temporárias', fmt(r.temp), 'fa-medal') : ''}
      ${g.abas.sub ? miniKpi('Positivas com temporárias', fmt((r.pos || 0) + (r.temp || 0)), 'fa-plus') : ''}
    </div>`;
    let corpo;
    if (S.sub === 'cofre') corpo = telaCofre(g, mm);
    else if (S.sub === 'sub') corpo = telaSubgrupos(g, mm);
    else if (S.sub === 'pesq') corpo = telaPesquisa(g, mm);
    else corpo = telaBalanco(g);
    const pontos = S.sub === 'balanco' ? (g.alertasAno || []) : r.alertas;
    const quando = S.sub === 'balanco' ? `no balanço de ${S.dados.ano}` : `em ${esc(mesNome(m).toLowerCase())}`;
    const conferir = ehEditor() && pontos.length ? `<details class="conferir"><summary><i class="fa-solid fa-triangle-exclamation"></i>${plural(pontos.length, 'ponto para conferir', 'pontos para conferir')} na planilha ${quando}<i class="fa-solid fa-chevron-down ml-auto text-[10px]"></i></summary><ul>${pontos.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details>` : '';
    return `${chips}${cartao(`<div class="grupo-topo" style="--cor:${esc(g.cor)}">
        ${emblema(g, true)}
        <div class="min-w-0 flex-1">
          <p class="kicker">${esc(daCategoria(g.categoria).um)} · ${esc(mesNome(m))} de ${S.dados.ano}</p>
          <h2 class="grupo-nome">${esc(g.nome)}</h2>
          <div class="grupo-meta">${audHtml}${leitura}</div>
        </div>
        <div class="flex flex-wrap items-center gap-2">${link}${btnEditar}</div>
      </div>
      ${minis}
      <div class="subabas" role="tablist" aria-label="Partes do cofre" style="--cor:${esc(g.cor)}">${subs.map(s => `<button type="button" role="tab" class="subaba" data-acao="subaba" data-sub="${s.id}" aria-selected="${s.id === S.sub}"><i class="fa-solid ${s.icone}" aria-hidden="true"></i>${s.rotulo}</button>`).join('')}</div>
      <div class="mt-5">${corpo}</div>${conferir}`)}`;
  }
  PAINEIS.companhias = painelGrupo;
  PAINEIS.subcompanhias = painelGrupo;
  PAINEIS.orgaos = painelGrupo;
  function miniKpi(rotulo, valor, icone) {
    return `<div class="mini"><p class="mini-rotulo"><i class="fa-solid ${icone}" aria-hidden="true"></i>${esc(rotulo)}</p><p class="mini-valor">${valor}</p></div>`;
  }

  /* ---------- campos de edição ---------- */
  const chaveEd = (g, tipo, r, c) => `${g.id}|${tipo}|${r}|${c}`;
  function campoEd(g, tipo, r, c, antes, op) {
    const k = chaveEd(g, tipo, r, c), mud = S.mudancas.get(k), base = antes == null ? '' : String(antes);
    const valor = mud ? mud.valor : base;
    return `<input class="ed-campo${op.num ? ' d' : ''}${mud ? ' mudou' : ''}" data-ed="${esc(k)}" data-antes="${esc(base)}" data-tipo-campo="${op.campo || (op.num ? 'num' : 'txt')}" value="${esc(valor)}" aria-label="${esc(op.rotulo)}"${op.num ? ' inputmode="numeric"' : ''}${op.lista ? ` list="${op.lista}"` : ''} autocomplete="off" spellcheck="false"${op.placeholder ? ` placeholder="${esc(op.placeholder)}"` : ''}>`;
  }
  const emEdicao = g => S.editando && editavel(g);

  /* ---------- cofre do mês ---------- */
  const ehPeriodo = t => /^\d\s*[ªºa°]?\s*(semana|quinzena)$/.test(normal(t));
  const cabColunas = primeira => `<div class="clinha cab"><span>${primeira}</span><span class="d"><span class="sm:hidden">Pos.</span><span class="hidden sm:inline">Positivas</span></span><span class="d"><span class="sm:hidden">Neg.</span><span class="hidden sm:inline">Negativas</span></span><span class="d"><span class="sm:hidden">Pág.</span><span class="hidden sm:inline">Páginas</span></span></div>`;
  const setas = (p, n, classe) => `<span class="${classe}"><span title="Positivas"><i class="fa-solid fa-caret-up seta seta-pos"></i> ${fmt(p)}</span><span title="Negativas"><i class="fa-solid fa-caret-down seta seta-neg"></i> ${fmt(n)}</span></span>`;
  const periodoTexto = (l, atual) => `<span class="periodo-nome block sm:inline">${esc(frase(String(l[1] || '').toLowerCase()))}</span>${l[2] ? ` <span class="periodo-datas block sm:inline">${intervaloCurto(l[2], l[3])}</span>` : ''}${atual ? ' <span class="agora-tag">agora</span>' : ''}`;
  function telaCofre(g, mm) {
    const c = mm && mm.cofre;
    if (!c) return vazio('fa-vault', 'Sem o cofre deste mês', 'A aba do cofre não tem este mês.');
    const ed = emEdicao(g), h = hoje(), m = mm.m;
    const blocos = c.sec.map(s => {
      const sp = soma(s.l.map(l => l[4])), sn = soma(s.l.map(l => l[5]));
      const rot = (l, campo) => `${g.id} · ${mesNome(m)} · ${s.n} · ${l[1] || 'linha ' + (l[0] + 1)} · ${campo}`;
      const valores = (l, linha) => ed
        ? `<span>${campoEd(g, 'cofre', linha, c.c + 1, l ? l[4] : '', { num: true, rotulo: rot(l || [linha, 'nova linha'], 'Positivas') })}</span>
           <span>${campoEd(g, 'cofre', linha, c.c + 2, l ? l[5] : '', { num: true, campo: 'neg', rotulo: rot(l || [linha, 'nova linha'], 'Negativas') })}</span>
           <span>${campoEd(g, 'cofre', linha, c.c + 3, l ? l[6] : '', { campo: 'pag', rotulo: rot(l || [linha, 'nova linha'], 'Páginas'), placeholder: 'pág.' })}</span>`
        : `<span class="d">${num(l[4])}</span><span class="d">${num(l[5])}</span><span class="pag" title="${esc(l[6] ? 'Páginas ' + l[6] : '')}">${esc(l[6] || '')}</span>`;
      const nomeCampo = s.t === 'o' ? 'Ocorrência' : 'Nick';
      const linhaNome = (l, r) => {
        if (ed) return `<span>${campoEd(g, 'cofre', r, c.c, l ? l[1] : '', { rotulo: `${g.id} · ${mesNome(m)} · ${s.n} · ${nomeCampo}`, lista: s.t === 'o' ? 'lista-ocorrencias' : 'lista-nicks', placeholder: nomeCampo })}</span>`;
        if (s.t === 'o') return `<span class="min-w-0 truncate font-medium text-nevoa">${esc(l[1] || 'Sem descrição')}</span>`;
        return l[1] ? `<span class="nick">${cabeca(l[1], true)}<span>${esc(l[1])}</span></span>` : `<span class="nick sem-nick">${cabeca('', true)}<span>Sem nick</span></span>`;
      };
      let linhas = '';
      if (s.nicks) {
        // Semana ou quinzena com os nicks embaixo: cada período é um subtítulo com a soma dele, e os nicks seguem.
        const itens = s.l.map(l => ({ r: l[0], l })).concat(ed ? s.v.map(r => ({ r, l: null })) : []).sort((a, b) => a.r - b.r);
        const periodos = [];
        itens.forEach(x => {
          if (x.l && ehPeriodo(x.l[1])) periodos.push({ p: x.l, itens: [] });
          else { if (!periodos.length) periodos.push({ p: null, itens: [] }); periodos[periodos.length - 1].itens.push(x); }
        });
        linhas = `<div class="periodos">${periodos.map(pr => {
          const p = pr.p, atual = !!p && dentro(h, p[2], p[3]), nicks = pr.itens.filter(x => x.l);
          const cab = p ? `<div class="periodo-cab${atual ? ' atual' : ''}"><span class="min-w-0">${periodoTexto(p, atual)}</span><span class="periodo-qtd">${plural(nicks.filter(x => x.l[1]).length, 'nick', 'nicks')}</span>${setas(soma([p[4]].concat(nicks.map(x => x.l[4]))), soma([p[5]].concat(nicks.map(x => x.l[5]))), 'periodo-soma')}</div>` : '';
          const corpo = pr.itens.map(x => `<div class="clinha${x.l ? '' : ' vaga'}">${linhaNome(x.l, x.r)}${valores(x.l, x.r)}</div>`).join('')
            || `<div class="clinha vaga"><span>${ed ? 'Sem linha livre neste período' : 'Sem nicks lançados'}</span><span></span><span></span><span></span></div>`;
          return `<div class="periodo">${cab}${cabColunas('Nick')}${corpo}</div>`;
        }).join('')}</div>`;
      } else if (s.t === 's' || s.t === 'q') {
        linhas = s.l.map(l => {
          const atual = dentro(h, l[2], l[3]);
          return `<div class="clinha${atual ? ' atual' : ''}"><span class="min-w-0 sm:truncate">${periodoTexto(l, atual)}</span>${valores(l, l[0])}</div>`;
        }).join('');
      } else {
        linhas = s.l.map(l => `<div class="clinha">${linhaNome(l, l[0])}${valores(l, l[0])}</div>`).join('');
        if (ed) linhas += s.v.map(r => `<div class="clinha vaga">${linhaNome(null, r)}${valores(null, r)}</div>`).join('');
        if (s.t === 'o' && s.l.length && !ed) {
          const tipos = new Map();
          s.l.forEach(l => {
            const k = normal(l[1]) || 'outro', t = tipos.get(k) || { nome: limparNome(l[1]) || 'Outro', n: 0, v: 0 };
            t.n++; t.v += (l[4] || 0) + (l[5] || 0); tipos.set(k, t);
          });
          linhas = `<div class="ocorrencias">${[...tipos.values()].map(t => `<span class="ocorrencia">${esc(t.nome)} <b>${t.n}</b><span class="text-musgo">${fmt(t.v)}</span></span>`).join('')}</div>` + linhas;
        }
      }
      if (!linhas) linhas = `<div class="clinha vaga"><span>${ed ? 'Sem linha livre nesta seção' : 'Sem lançamentos'}</span><span></span><span></span><span></span></div>`;
      const largo = s.t === 'o' || ((s.t === 'm' || s.nicks) && s.l.length + (ed ? s.v.length : 0) > 6);
      return `<section class="bloco${largo ? ' bloco-largo' : ''}">
        <header class="bloco-cab"><span class="bloco-icone"><i class="fa-solid ${ICONE_SECAO[s.t]}" aria-hidden="true"></i></span>
          <span class="min-w-0"><span class="bloco-titulo block truncate">${esc(s.n)}</span><span class="bloco-tipo">${TIPO_SECAO[s.t]}</span></span>
          ${setas(sp, sn, 'bloco-soma')}</header>
        ${s.nicks ? '' : cabColunas(s.t === 'o' ? 'Ocorrência' : s.t === 'm' ? 'Nick' : 'Período')}
        ${linhas}
      </section>`;
    }).join('');
    const tot = c.tot ? `<div class="total-mes"><span class="text-musgo">Total do mês</span><span>Positivas <b>${fmt(c.tot[1])}</b></span><span>Negativas <b>${fmt(c.tot[2])}</b></span></div>` : '';
    return `<div class="cofre-grade">${blocos}</div>${tot}`;
  }

  /* ---------- subgrupos ---------- */
  function telaSubgrupos(g, mm) {
    const s = mm && mm.sub;
    if (!s) return vazio('fa-sitemap', 'Sem os subgrupos deste mês', 'A aba de subgrupos não tem este mês.');
    const ed = emEdicao(g), m = mm.m;
    const somas = s.col.map((_, i) => soma(s.l.map(l => l[2][i])));
    const rot = (l, campo) => `${g.id} · Subgrupos · ${mesNome(m)} · ${(l && l[1]) || 'nova linha'} · ${campo}`;
    const linha = (l, r) => {
      const tot = l ? soma(l[2]) : 0;
      const filtro = l ? ` data-busca="${esc(normal(l[1]))}"` : '';
      if (ed) {
        return `<tr${filtro}><td class="min-w-[170px]">${campoEd(g, 'sub', r, s.c, l ? l[1] : '', { rotulo: rot(l, 'Nick'), lista: 'lista-nicks', placeholder: 'Nick' })}</td>
          ${s.col.map((col, i) => `<td class="w-[84px]">${campoEd(g, 'sub', r, s.c + 1 + i, l ? l[2][i] : '', { num: true, rotulo: rot(l, col) })}</td>`).join('')}
          <td class="d">${l ? fmt(tot) : ''}</td>
          <td class="w-[110px]">${s.pc >= 0 ? campoEd(g, 'sub', r, s.pc, l ? l[3] : '', { campo: 'pag', rotulo: rot(l, 'Páginas'), placeholder: 'pág.' }) : ''}</td></tr>`;
      }
      return `<tr${filtro}><td><span class="nick">${cabeca(l[1], true)}<span class="max-w-[220px]">${esc(l[1])}</span></span></td>
        ${l[2].map(v => `<td class="d">${num(v)}</td>`).join('')}<td class="d font-semibold text-texto">${fmt(tot)}</td><td class="text-right text-[12px] text-musgo">${esc(l[3] || '')}</td></tr>`;
    };
    const corpo = s.l.map(l => linha(l, l[0])).join('') + (ed ? s.v.map(r => linha(null, r)).join('') : '');
    return `<div class="mb-4 flex flex-wrap items-center gap-3">
        <label class="busca min-w-[220px] flex-1"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" data-campo="busca" placeholder="Procurar nick" value="${esc(S.busca)}" aria-label="Procurar nick"></label>
        <span class="medalha-t"><i class="fa-solid fa-medal"></i>${fmt(s.tot ? s.tot[1] : s.soma)} temporárias</span>
        <span class="text-[12px] text-musgo">${plural(s.l.length, 'nick', 'nicks')}</span>
      </div>
      <div class="tabela-caixa"><table class="tabela min-w-[640px]">
        <thead><tr><th>Nick</th>${s.col.map(c => `<th class="d">${esc(c)}</th>`).join('')}<th class="d">Total</th><th class="d">Páginas</th></tr></thead>
        <tbody>${corpo || `<tr><td colspan="${s.col.length + 3}" class="py-8 text-center text-musgo">${ed ? 'Sem linha livre neste mês.' : 'Sem lançamentos neste mês.'}</td></tr>`}</tbody>
        <tfoot><tr><td>Total</td>${somas.map(v => `<td class="d">${fmt(v)}</td>`).join('')}<td class="d">${fmt(s.tot ? s.tot[1] : s.soma)}</td><td></td></tr></tfoot>
      </table></div>
      <p data-sem-resultado class="py-6 text-center text-[13px] text-musgo" hidden>Nenhum nick encontrado.</p>`;
  }
  function aplicarBusca() {
    const q = normal(S.busca);
    const linhas = el.conteudo.querySelectorAll('tr[data-busca]');
    let vis = 0;
    linhas.forEach(tr => { const ok = !q || tr.dataset.busca.indexOf(q) >= 0; tr.hidden = !ok; if (ok) vis++; });
    const aviso = el.conteudo.querySelector('[data-sem-resultado]');
    if (aviso) aviso.hidden = !(q && linhas.length && !vis);
  }

  /* ---------- dados de pesquisa ---------- */
  function telaPesquisa(g, mm) {
    if (!g.abas.pesq) {
      const acao = editavel(g) ? '<button type="button" class="btn-pri mt-2" data-acao="criar-pesquisa"><i class="fa-solid fa-plus"></i>Criar a tabela</button>' : '';
      return vazio('fa-magnifying-glass-chart', 'Ainda sem a tabela de Dados de Pesquisa', 'A tabela fica na planilha das companhias, numa aba ao lado das abas desta companhia.', acao);
    }
    const p = mm && mm.pesq;
    if (!p) return vazio('fa-magnifying-glass-chart', 'Sem os dados deste mês', 'A aba de Dados de Pesquisa não tem este mês.');
    const ed = emEdicao(g), m = mm.m, n = mm.sem.length, h = hoje(), cofre = resumoMes(g, m);
    const semanas = [0, 1, 2, 3, 4].map(i => mm.sem[i] || null);
    const rot = (linha, i) => `${g.id} · Dados de Pesquisa · ${mesNome(m)} · ${linha} · ${i + 1}ª semana`;
    const cabSem = `<th>Semana</th>${semanas.map((x, i) => `<th class="c${x && dentro(h, x[0], x[1]) ? ' text-af-300' : ''}">${i + 1}ª<span class="block text-[10px] font-medium normal-case tracking-normal text-musgo/80">${x ? intervaloCurto(x[0], x[1]) : 'fora do mês'}</span></th>`).join('')}<th class="d">Total</th>`;
    const celula = (r, i, v, rotulo) => {
      if (!semanas[i]) return '<td class="c inativa">-</td>';
      return ed ? `<td class="w-[86px]">${campoEd(g, 'pesq', r, p.c + 1 + i, v, { num: true, rotulo })}</td>` : `<td class="c">${num(v)}</td>`;
    };
    const totais = {};
    SEMANA_PESQ.forEach(x => { totais[x.k] = soma((p.val[x.k] || []).slice(0, n)); });
    const totAulas = soma(p.aulas.map(a => soma(a[2].slice(0, n))));
    const kpis = `<div class="pesq-kpis">${SEMANA_PESQ.map(x => miniKpi(x.rotulo, fmt(totais[x.k]), x.icone)).join('')}${miniKpi('Aulas aplicadas', fmt(totAulas), 'fa-chalkboard-user')}</div>`;
    const semanal = `<section class="bloco mt-5"><header class="bloco-cab"><span class="bloco-icone"><i class="fa-solid fa-calendar-week"></i></span><span class="bloco-titulo">Desempenho semanal</span></header>
      <div class="tabela-caixa !mx-0 !px-0"><table class="tabela min-w-[640px]"><thead><tr>${cabSem}</tr></thead><tbody>
      ${SEMANA_PESQ.map(x => `<tr><td class="font-medium text-texto"><i class="fa-solid ${x.icone} mr-2 w-4 text-center text-[11px] text-af-400"></i>${x.rotulo}</td>${semanas.map((_, i) => celula(p.lin[x.k], i, (p.val[x.k] || [])[i], rot(x.rotulo, i))).join('')}<td class="d font-semibold text-texto">${fmt(totais[x.k])}</td></tr>`).join('')}
      </tbody></table></div></section>`;
    const btnAulas = editavel(g) ? '<button type="button" class="btn-mini ml-auto" data-acao="editar-aulas"><i class="fa-solid fa-list-check"></i>Trocar aulas</button>' : '';
    const aulas = `<section class="bloco mt-4"><header class="bloco-cab"><span class="bloco-icone"><i class="fa-solid fa-chalkboard-user"></i></span><span class="bloco-titulo">Aulas aplicadas</span><span class="bloco-tipo">${plural(p.aulas.length, 'aula', 'aulas')}</span>${btnAulas}</header>
      <div class="tabela-caixa !mx-0 !px-0"><table class="tabela min-w-[640px]"><thead><tr>${cabSem.replace('<th>Semana</th>', '<th>Aula</th>')}</tr></thead><tbody>
      ${p.aulas.length ? p.aulas.map(a => `<tr><td class="font-medium text-texto">${esc(a[1])}</td>${semanas.map((_, i) => celula(a[0], i, a[2][i], rot(a[1], i))).join('')}<td class="d font-semibold text-texto">${fmt(soma(a[2].slice(0, n)))}</td></tr>`).join('') : `<tr><td colspan="7" class="py-6 text-center text-musgo">Nenhuma aula na tabela.</td></tr>`}
      </tbody><tfoot><tr><td>Total de aulas</td>${semanas.map((x, i) => `<td class="c">${x ? fmt(soma(p.aulas.map(a => a[2][i]))) : '-'}</td>`).join('')}<td class="d">${fmt(totAulas)}</td></tr></tfoot></table></div></section>`;
    const tituloMin = frase(limparNome(p.titMin || g.ministerio || 'Ministério').toLowerCase());
    const listaPessoas = (titulo, icone, linhas, comCargo, tipo) => {
      const visiveis = ed ? linhas : linhas.filter(l => l[1]);
      const corpo = visiveis.map(l => {
        const dias = comCargo ? l[3] : l[2];
        if (ed) {
          return `<div class="grid items-center gap-2 border-b border-realce/[0.05] px-4 py-2 last:border-b-0" style="grid-template-columns:minmax(0,1fr)${comCargo ? ' minmax(0,.8fr)' : ''} 76px">
            ${campoEd(g, 'pesq', l[0], p.c, l[1], { rotulo: `${g.id} · ${titulo} · ${mesNome(m)} · Nick`, lista: 'lista-nicks', placeholder: 'Nick' })}
            ${comCargo ? campoEd(g, 'pesq', l[0], p.c + 1, l[2], { rotulo: `${g.id} · ${titulo} · ${mesNome(m)} · Cargo`, placeholder: 'Cargo' }) : ''}
            ${campoEd(g, 'pesq', l[0], p.c + (comCargo ? 2 : 1), dias, { num: true, campo: 'dias', rotulo: `${g.id} · ${titulo} · ${mesNome(m)} · Dias ativos`, placeholder: 'dias' })}</div>`;
        }
        return `<div class="flex items-center gap-3 border-b border-realce/[0.05] px-4 py-2.5 text-[13px] last:border-b-0">
          <span class="nick min-w-0 flex-1">${cabeca(l[1], true)}<span>${esc(l[1])}</span>${comCargo && l[2] ? `<span class="shrink-0 rounded-md bg-realce/[0.05] px-1.5 py-0.5 text-[11px] font-semibold text-musgo">${esc(l[2])}</span>` : ''}</span>
          <span class="dias"><span class="dias-barra"><span style="width:${Math.min(100, Math.round((dias || 0) / 31 * 100))}%"></span></span><span class="w-[52px] text-right text-[12px] tabular-nums text-musgo">${temValor(dias) ? plural(dias, 'dia', 'dias') : '-'}</span></span></div>`;
      }).join('');
      return `<section class="bloco"><header class="bloco-cab"><span class="bloco-icone"><i class="fa-solid ${icone}"></i></span><span class="bloco-titulo">${esc(titulo)}</span><span class="bloco-tipo">${plural(linhas.filter(l => l[1]).length, 'nick', 'nicks')} · dias ativos no mês</span></header>
        ${corpo || '<div class="px-4 py-6 text-center text-[13px] text-musgo">Ninguém lançado.</div>'}</section>`;
    };
    const pessoas = `<div class="mt-4 grid gap-4 md:grid-cols-2">${listaPessoas(tituloMin, 'fa-landmark', p.min, false, 'min')}${listaPessoas('Liderança', 'fa-crown', p.lid, true, 'lid')}</div>`;
    const medalhas = `<section class="bloco mt-4"><header class="bloco-cab"><span class="bloco-icone"><i class="fa-solid fa-medal"></i></span><span class="bloco-titulo">Medalhas do mês</span></header>
      <div class="tabela-caixa !mx-0 !px-0"><table class="tabela"><thead><tr><th></th><th class="d">Positivas</th><th class="d">Negativas</th></tr></thead><tbody>
        <tr><td>Cofre da companhia</td><td class="d">${num(cofre.pos)}</td><td class="d">${num(cofre.neg)}</td></tr>
        <tr><td>Subgrupos (temporárias)</td><td class="d">${g.abas.sub ? num(cofre.temp) : '-'}</td><td class="d">-</td></tr>
      </tbody><tfoot><tr><td>Total</td><td class="d">${fmt((cofre.pos || 0) + (cofre.temp || 0))}</td><td class="d">${fmt(cofre.neg)}</td></tr></tfoot></table></div></section>`;
    const aud = p.aud ? (ed
      ? `<div class="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] text-musgo">Responsável pelos dados <span class="w-[200px]">${campoEd(g, 'pesq', p.aud.r, p.c, p.aud.v, { rotulo: `${g.id} · Dados de Pesquisa · ${mesNome(m)} · Responsável`, lista: 'lista-nicks' })}</span></div>`
      : p.aud.v ? `<p class="mb-4 flex items-center gap-2 text-[12.5px] text-musgo">Responsável pelos dados ${cabeca(p.aud.v, true)}<b class="font-semibold text-texto">${esc(p.aud.v)}</b></p>` : '') : '';
    return `${aud}${kpis}${semanal}${aulas}${pessoas}${medalhas}`;
  }

  /* ---------- balanço anual ---------- */
  function telaBalanco(g) {
    const linhas = Array.from({ length: 12 }, (_, i) => { const r = resumoMes(g, i + 1); return { m: i + 1, pos: r.pos, neg: r.neg, temp: r.temp }; });
    const tp = soma(linhas.map(x => x.pos)), tn = soma(linhas.map(x => x.neg)), tt = soma(linhas.map(x => x.temp));
    const meses = linhas.filter(x => resumoMes(g, x.m).lancado).length;
    return `<div class="mb-5 grid gap-3" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
        ${miniKpi(`Positivas em ${S.dados.ano}`, fmt(tp), 'fa-arrow-trend-up')}${miniKpi(`Negativas em ${S.dados.ano}`, fmt(tn), 'fa-arrow-trend-down')}
        ${g.abas.sub ? miniKpi(`Temporárias em ${S.dados.ano}`, fmt(tt), 'fa-medal') : ''}${miniKpi('Meses lançados', `${meses}<span class="text-[15px] font-medium text-musgo"> de 12</span>`, 'fa-calendar-check')}
      </div>${graficoBalanco('grupo-' + g.id, `Balanço de ${g.id} em ${S.dados.ano}`, linhas, !!g.abas.sub)}`;
  }

  /* ==================================================================
     BACKUP E VIRADA DO ANO (secretário, vice e diretor)
     ================================================================== */
  const NOME_PLANILHA = {};
  CATEGORIAS.forEach(x => { NOME_PLANILHA[x.planilha] = x.cat; });
  const iconePlanilha = k => (CATEGORIAS.find(x => x.planilha === k) || CATEGORIAS[0]).icone;
  PAINEIS.direcao = () => {
    const v = S.dados.virada;
    if (!v) return cartao(vazio('fa-lock', 'Só para a direção', 'O backup e a virada do ano são de Secretário(a), Vice-Diretor(a)-Geral e Diretor(a)-Geral.'));
    const blocos = Object.keys(NOME_PLANILHA).map(k => {
      const p = v.planilhas[k];
      if (!p) return '';
      const b = p.backup, fim = p.ultimaSemana ? p.ultimaSemana[1] : '';
      const cedo = !!fim && hoje() <= fim && !p.parcial;
      return `<section class="bloco">
        <header class="bloco-cab"><span class="bloco-icone"><i class="fa-solid ${iconePlanilha(k)}"></i></span>
          <span class="min-w-0 flex-1"><span class="bloco-titulo block">${NOME_PLANILHA[k]}</span><span class="bloco-tipo block truncate">${esc(p.nome)}</span></span>
          <span class="selo selo-vazio"><i class="fa-regular fa-calendar"></i>${p.ano || '-'}</span>
          ${p.url ? `<a class="btn-mini" href="${esc(p.url)}" target="_blank" rel="noopener"><i class="fa-solid fa-table"></i>Abrir</a>` : ''}</header>
        <div class="grid gap-3 p-4 md:grid-cols-2">
          <div class="etapa" data-feita="${b ? 'sim' : 'nao'}">
            <div class="flex items-start gap-3"><span class="etapa-num">${b ? '<i class="fa-solid fa-check text-[12px]"></i>' : '1'}</span><div class="min-w-0">
              <p class="text-[14px] font-semibold text-texto">Backup de ${p.ano}</p>
              <p class="mt-1 text-[12.5px] leading-relaxed text-musgo">${b ? `Feito em ${esc(brHora(b.em))} por ${esc(b.por)}.` : 'Cópia do arquivo inteiro, na mesma pasta da planilha.'}</p>
              ${b && b.url ? `<a class="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-af-300 hover:underline" href="${esc(b.url)}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>${esc(b.nome || 'Abrir a cópia')}</a>` : ''}
            </div></div>
            <div class="mt-4"><button type="button" class="btn-sec" data-acao="backup" data-planilha="${k}"${p.parcial ? ' disabled' : ''}><i class="fa-solid fa-box-archive"></i>${b ? 'Fazer outro backup' : 'Fazer o backup'}</button></div>
          </div>
          <div class="etapa">
            <div class="flex items-start gap-3"><span class="etapa-num">2</span><div class="min-w-0">
              <p class="text-[14px] font-semibold text-texto">Virada para ${p.proximo}</p>
              <p class="mt-1 text-[12.5px] leading-relaxed text-musgo">Nas mesmas abas e com o mesmo link: o nome passa de [${p.ano}] para [${p.proximo}], as semanas seguem o calendário de ${p.proximo} e os lançamentos são zerados.</p>
              ${p.parcial ? `<p class="mt-2 text-[12.5px] font-semibold" style="color:var(--tom-aviso)"><i class="fa-solid fa-circle-exclamation mr-1"></i>A virada começou e não terminou: ${plural(p.feitas, 'aba pronta', 'abas prontas')}, ${plural(p.abas, 'falta', 'faltam')}.</p>` : ''}
              ${cedo ? `<p class="mt-2 text-[12.5px] text-musgo"><i class="fa-regular fa-calendar mr-1"></i>A última semana de ${p.ano} vai até ${br(fim)}.</p>` : ''}
            </div></div>
            <div class="mt-4"><button type="button" class="btn-perigo" data-acao="virar" data-planilha="${k}"${!b && !p.parcial ? ' disabled' : ''}><i class="fa-solid fa-forward"></i>${p.parcial ? 'Continuar a virada' : `Virar para ${p.proximo}`}</button>${!b && !p.parcial ? '<p class="dica">Primeiro o backup.</p>' : ''}</div>
          </div>
        </div>
      </section>`;
    }).join('');
    const semSenha = v.senha ? '' : `<div class="mt-5">${aviso('aviso', 'fa-key', 'Falta a senha de edição.', 'Crie SENHA_EDICAO nas propriedades do script: o backup e a virada pedem a senha.')}</div>`;
    return cartao(`<p class="kicker">Direção da Auditoria Fiscal</p><h2 class="painel-titulo">Backup e virada do ano</h2>
      <p class="painel-sub">Cada planilha passa pelas duas etapas. O ano que terminou continua no painel, lido do backup, só para consulta.</p>${semSenha}
      <div class="mt-6 space-y-4">${blocos}</div>`);
  };

  async function fazerBackup(k) {
    const p = S.dados.virada.planilhas[k];
    const senha = await pedirSenha({ titulo: `Backup de ${NOME_PLANILHA[k]}`, texto: `O arquivo de ${p.ano} é copiado inteiro para um arquivo novo, na mesma pasta.`, botao: 'Fazer o backup', icone: 'fa-box-archive', sempre: true });
    if (senha === null) return;
    abrirEspera('Fazendo o backup', 'A cópia do arquivo leva alguns segundos.');
    try {
      const r = await api('post', { acao: 'backup', nick: S.usuario.nick, senha, planilha: k }, 180);
      S.senha = senha;
      S.dados.virada = r.virada;
      fecharModal();
      renderTudo();
      abrirModal({ tipo: 'sucesso', titulo: 'Backup feito', corpo: `<p>${esc(r.mensagem)}</p>`, acoes: [{ rotulo: 'Fechar', classe: 'btn-pri', acao: fecharModal }] });
    } catch (e) {
      if (/senha/i.test(e.message)) S.senha = '';
      fecharModal();
      mostrarErro('Backup não feito', e.message);
    }
  }

  function abrirVirada(k) {
    const p = S.dados.virada.planilhas[k];
    abrirDialogo(`<form id="form-virada" data-planilha="${k}" novalidate>
      <div class="dialogo-cabeca"><span class="bloco-icone"><i class="fa-solid fa-forward"></i></span><div class="min-w-0"><p class="kicker">${NOME_PLANILHA[k]}</p><h3 class="mt-1 font-titulo text-[26px] font-bold uppercase leading-none text-texto">Virar para ${p.proximo}</h3></div>${botaoFechar()}</div>
      <div class="dialogo-corpo">
        <ul class="space-y-2 text-[13px] leading-relaxed text-nevoa/85">
          <li class="flex gap-2.5"><i class="fa-solid fa-link mt-1 w-4 text-center text-[11px] text-af-400"></i><span>As abas continuam as mesmas, com o mesmo link: só o ano do nome muda para [${p.proximo}].</span></li>
          <li class="flex gap-2.5"><i class="fa-solid fa-calendar-week mt-1 w-4 text-center text-[11px] text-af-400"></i><span>Cada mês ganha as semanas e as datas de ${p.proximo}, e os totais são refeitos.</span></li>
          <li class="flex gap-2.5"><i class="fa-solid fa-eraser mt-1 w-4 text-center text-[11px] text-af-400"></i><span>Auditores, nicks e números lançados em ${p.ano} são apagados. ${p.ano} continua no painel pelo backup.</span></li>
        </ul>
        <div><label class="rotulo" for="virada-confirma"><i class="fa-solid fa-keyboard"></i>Para confirmar, digite <b class="font-semibold text-texto">ZERAR ${p.ano}</b></label>
          <input id="virada-confirma" name="confirmacao" class="campo" autocomplete="off" spellcheck="false" data-foco></div>
        <div><label class="rotulo" for="virada-senha"><i class="fa-solid fa-key"></i>Senha de edição</label>
          <input id="virada-senha" name="senha" type="password" class="campo" value="${esc(S.senha)}" autocomplete="off"></div>
        <p class="msg erro" data-erro hidden></p>
        <div data-progresso hidden><div class="flex items-center justify-between text-[12.5px]"><span data-progresso-texto class="text-musgo">Preparando...</span><span data-progresso-num class="font-semibold tabular-nums text-texto"></span></div><div class="progresso"><span style="width:0%"></span></div></div>
      </div>
      <div class="dialogo-rodape"><button type="button" class="btn-sec" data-acao="fechar">Cancelar</button><button type="submit" class="btn-perigo"><i class="fa-solid fa-forward"></i>Virar para ${p.proximo}</button></div>
    </form>`, { foco: '#virada-confirma' });
  }

  async function enviarVirada(form) {
    const k = form.dataset.planilha, p = S.dados.virada.planilhas[k];
    const conf = form.elements.confirmacao.value.trim(), senha = form.elements.senha.value.trim(), erro = form.querySelector('[data-erro]');
    const falhar = (msg, campo) => { erro.textContent = msg; erro.hidden = false; if (campo) { campo.classList.add('invalido'); campo.focus(); } };
    erro.hidden = true;
    form.querySelectorAll('.invalido').forEach(x => x.classList.remove('invalido'));
    if (conf.toUpperCase() !== 'ZERAR ' + p.ano) return falhar(`Digite ZERAR ${p.ano} para confirmar.`, form.elements.confirmacao);
    if (!senha) return falhar('Informe a senha de edição.', form.elements.senha);
    const prog = form.querySelector('[data-progresso]'), barra = prog.querySelector('.progresso > span');
    const total = Math.max(1, p.abas), botoes = form.querySelectorAll('button');
    let feitas = 0, r;
    botoes.forEach(b => { b.disabled = true; });
    prog.hidden = false;
    S.ocupado = true;
    try {
      do {
        r = await api('post', { acao: 'virarAno', nick: S.usuario.nick, senha, planilha: k, de: p.ano, confirmacao: conf }, 340);
        S.senha = senha;
        feitas += r.prontas || 0;
        barra.style.width = Math.min(100, Math.round(feitas / total * 100)) + '%';
        prog.querySelector('[data-progresso-texto]').textContent = r.continuar ? 'Virando as abas...' : 'Concluído';
        prog.querySelector('[data-progresso-num]').textContent = `${Math.min(feitas, total)} de ${total}`;
      } while (r.continuar);
      S.ocupado = false;
      fecharModal();
      abrirModal({ tipo: 'sucesso', titulo: `${NOME_PLANILHA[k]} em ${r.para}`, corpo: `<p>${esc(r.mensagem)}</p>`, acoes: [{ rotulo: 'Fechar', classe: 'btn-pri', acao: fecharModal }] });
      await carregar({ ano: 0, forcar: true });
    } catch (e) {
      S.ocupado = false;
      if (/senha/i.test(e.message)) S.senha = '';
      botoes.forEach(b => { b.disabled = false; });
      falhar(e.message);
      carregar({ silencioso: true, forcar: true });
    }
  }

  /* ==================================================================
     EDIÇÃO
     ================================================================== */
  function validarMudanca(x) {
    const v = String(x.valor || '').trim();
    if (!v) return '';
    if (x.campo === 'num' || x.campo === 'neg' || x.campo === 'dias') {
      if (!/^[+-]?\d+$/.test(v.replace(/\s+/g, ''))) return 'Use um número inteiro.';
      if (x.campo === 'dias' && (+v < 0 || +v > 31)) return 'Dias ativos vão de 0 a 31.';
    }
    if (x.campo === 'pag' && (v.length > 30 || !/^[0-9][0-9\s/,.\-e]*$/i.test(v))) return 'Use números separados por barra (ex.: 72/73).';
    return '';
  }
  function digitar(campo) {
    const k = campo.dataset.ed, [gid, tipo, r, c] = k.split('|'), antes = campo.dataset.antes, v = campo.value;
    if (v.trim() === antes.trim()) S.mudancas.delete(k);
    else S.mudancas.set(k, { k, grupo: gid, tipo, r: +r, c: +c, antes, valor: v.trim(), campo: campo.dataset.tipoCampo, rotulo: campo.getAttribute('aria-label') });
    campo.classList.toggle('mudou', S.mudancas.has(k));
    campo.classList.remove('invalido');
    renderBarraGravar();
  }
  function renderBarraGravar() {
    const n = S.mudancas.size;
    definirHtml(el.barra, n ? `<div class="barra-gravar">
      <p class="flex items-center gap-2.5 text-[13px] text-nevoa"><i class="fa-solid fa-pen text-[12px]" style="color:var(--tom-aviso)"></i><span><b class="font-semibold text-texto">${plural(n, 'alteração', 'alterações')}</b> ainda não ${n === 1 ? 'gravada' : 'gravadas'}</span></p>
      <div class="flex flex-wrap gap-2"><button type="button" class="btn-link" data-acao="ver-mudancas"><i class="fa-solid fa-list"></i>Ver</button><button type="button" class="btn-sec" data-acao="descartar"><i class="fa-solid fa-rotate-left"></i>Descartar</button><button type="button" class="btn-pri" data-acao="gravar"><i class="fa-solid fa-floppy-disk"></i>Gravar</button></div>
    </div>` : '');
  }
  function verMudancas() {
    const lista = [...S.mudancas.values()];
    abrirDialogo(`<div class="dialogo-cabeca"><span class="bloco-icone"><i class="fa-solid fa-list"></i></span><div><p class="kicker">Antes de gravar</p><h3 class="mt-1 font-titulo text-[26px] font-bold uppercase leading-none text-texto">${plural(lista.length, 'alteração', 'alterações')}</h3></div>${botaoFechar()}</div>
      <div class="dialogo-corpo !space-y-0">${lista.map(x => `<div class="mudanca"><span class="min-w-0 flex-1 text-musgo">${esc(x.rotulo)}</span><span class="text-musgo line-through">${esc(x.antes || 'vazio')}</span><i class="fa-solid fa-arrow-right text-[10px] text-musgo"></i><b class="font-semibold text-texto">${esc(x.valor || 'vazio')}</b></div>`).join('')}</div>
      <div class="dialogo-rodape"><button type="button" class="btn-sec" data-acao="fechar">Fechar</button><button type="button" class="btn-pri" data-acao="gravar"><i class="fa-solid fa-floppy-disk"></i>Gravar</button></div>`);
  }
  async function gravar() {
    const lista = [...S.mudancas.values()];
    if (!lista.length) return;
    const ruins = lista.filter(x => validarMudanca(x));
    if (ruins.length) {
      fecharModal();
      ruins.forEach(x => { const c = el.conteudo.querySelector(`[data-ed="${CSS.escape(x.k)}"]`); if (c) c.classList.add('invalido'); });
      mostrarErro('Confira os campos marcados', `${ruins[0].rotulo}: ${validarMudanca(ruins[0])}`);
      return;
    }
    const senha = await pedirSenha({ titulo: 'Gravar alterações', texto: `${plural(lista.length, 'alteração', 'alterações')} na planilha de ${S.dados.ano}.`, botao: 'Gravar', icone: 'fa-floppy-disk' });
    if (senha === null) return;
    const lotes = new Map();
    lista.forEach(x => { const k = x.grupo + '|' + x.tipo; if (!lotes.has(k)) lotes.set(k, []); lotes.get(k).push(x); });
    abrirEspera('Gravando', plural(lista.length, 'alteração', 'alterações'));
    let gravadas = 0;
    try {
      for (const [k, itens] of lotes) {
        const [grupo, tipo] = k.split('|');
        const r = await api('post', { acao: 'salvar', nick: S.usuario.nick, senha, ano: S.dados.ano, grupo, tipo, mudancas: itens.map(x => ({ r: x.r, c: x.c, antes: x.antes, valor: x.valor })) });
        S.senha = senha;
        trocarGrupo(r.grupo);
        itens.forEach(x => S.mudancas.delete(x.k));
        gravadas += itens.length;
      }
      fecharModal();
      renderTudo();
      toast(plural(gravadas, 'alteração gravada', 'alterações gravadas') + '.');
    } catch (e) {
      if (/senha/i.test(e.message)) S.senha = '';
      fecharModal();
      renderTudo();
      mostrarErro(gravadas ? `${plural(gravadas, 'alteração gravada', 'alterações gravadas')}, as outras não` : 'Nada foi gravado', e.message);
    }
  }
  function trocarGrupo(g) {
    if (!g || !S.dados) return;
    const i = S.dados.grupos.findIndex(x => x.id === g.id);
    if (i >= 0) S.dados.grupos[i] = g; else S.dados.grupos.push(g);
    indexarNicks();
  }
  async function descartar() {
    if (S.mudancas.size && !(await confirmar('Descartar as alterações?', `${plural(S.mudancas.size, 'alteração', 'alterações')} ainda não ${S.mudancas.size === 1 ? 'foi gravada' : 'foram gravadas'}.`, 'Descartar'))) return false;
    S.mudancas.clear();
    renderTudo();
    return true;
  }

  /* ---------- aulas dos Dados de Pesquisa ---------- */
  function abrirAulas(g) {
    const mm = g.meses.find(x => x.pesq), p = mm && mm.pesq;
    if (!p) return;
    S.aulasEd = { grupo: g.id, lista: p.aulas.map(a => ({ r: a[0], nome: a[1] })) };
    desenharAulas();
  }
  function desenharAulas() {
    const a = S.aulasEd, g = grupoPorId(a.grupo);
    abrirDialogo(`<form id="form-aulas" novalidate>
      <div class="dialogo-cabeca"><span class="bloco-icone"><i class="fa-solid fa-chalkboard-user"></i></span><div class="min-w-0"><p class="kicker">${esc(g.nome)}</p><h3 class="mt-1 font-titulo text-[26px] font-bold uppercase leading-none text-texto">Aulas aplicadas</h3></div>${botaoFechar()}</div>
      <div class="dialogo-corpo">
        <p class="text-[12.5px] leading-relaxed text-musgo">A lista vale para todos os meses de ${S.dados.ano}. Os números já lançados acompanham cada aula.</p>
        <div class="space-y-2" data-aulas>${a.lista.map((x, i) => `<div class="aula-linha"><input class="campo !py-2.5" name="aula" data-i="${i}" value="${esc(x.nome)}" maxlength="40" aria-label="Nome da aula ${i + 1}" autocomplete="off"${x.r == null ? ' data-nova="1"' : ''}><button type="button" class="btn-mini !h-10" data-acao="aula-remover" data-i="${i}" aria-label="Tirar ${esc(x.nome || 'aula')}"><i class="fa-solid fa-trash-can"></i></button></div>`).join('') || '<p class="text-[13px] text-musgo">Nenhuma aula.</p>'}</div>
        <button type="button" class="btn-sec" data-acao="aula-adicionar"><i class="fa-solid fa-plus"></i>Adicionar aula</button>
        ${S.dados.edicao.senha ? `<div><label class="rotulo" for="aulas-senha"><i class="fa-solid fa-key"></i>Senha de edição</label><input id="aulas-senha" name="senha" type="password" class="campo" value="${esc(S.senha)}" autocomplete="off"></div>` : ''}
        <p class="msg erro" data-erro hidden></p>
      </div>
      <div class="dialogo-rodape"><button type="button" class="btn-sec" data-acao="fechar">Cancelar</button><button type="submit" class="btn-pri"><i class="fa-solid fa-floppy-disk"></i>Gravar aulas</button></div>
    </form>`, { aoFechar: () => { S.aulasEd = null; } });
  }
  function lerAulasDoForm() {
    const f = $('form-aulas');
    if (!f || !S.aulasEd) return;
    f.querySelectorAll('input[name="aula"]').forEach(inp => { S.aulasEd.lista[+inp.dataset.i].nome = inp.value; });
    S.aulasSenha = f.elements.senha ? f.elements.senha.value : '';
  }
  async function enviarAulas(form) {
    lerAulasDoForm();
    const a = S.aulasEd, erro = form.querySelector('[data-erro]');
    const lista = a.lista.map(x => ({ r: x.r, nome: limparNome(x.nome) }));
    const falhar = msg => { erro.textContent = msg; erro.hidden = false; };
    if (lista.some(x => !x.nome)) return falhar('Dê um nome para cada aula.');
    const vistos = new Set();
    for (const x of lista) { const k = normal(x.nome); if (vistos.has(k)) return falhar(`A aula ${x.nome} aparece duas vezes.`); vistos.add(k); }
    const senha = form.elements.senha ? form.elements.senha.value.trim() : '';
    if (S.dados.edicao.senha && !senha) return falhar('Informe a senha de edição.');
    form.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      const r = await api('post', { acao: 'aulas', nick: S.usuario.nick, senha, ano: S.dados.ano, grupo: a.grupo, aulas: lista });
      S.senha = senha;
      trocarGrupo(r.grupo);
      fecharModal();
      renderTudo();
      toast('Aulas atualizadas.');
    } catch (e) {
      if (/senha/i.test(e.message)) S.senha = '';
      form.querySelectorAll('button').forEach(b => { b.disabled = false; });
      falhar(e.message);
    }
  }
  async function criarPesquisa(g) {
    const senha = await pedirSenha({ titulo: 'Criar a tabela', texto: `Dados de Pesquisa de ${g.nome} em ${S.dados.ano}, numa aba nova da planilha das companhias.`, botao: 'Criar', icone: 'fa-plus' });
    if (senha === null) return;
    abrirEspera('Criando a tabela', 'A aba nova é montada com as semanas de cada mês.');
    try {
      const r = await api('post', { acao: 'criarPesquisa', nick: S.usuario.nick, senha, ano: S.dados.ano, grupo: g.id }, 120);
      S.senha = senha;
      trocarGrupo(r.grupo);
      fecharModal();
      renderTudo();
      toast(r.mensagem);
    } catch (e) {
      if (/senha/i.test(e.message)) S.senha = '';
      fecharModal();
      mostrarErro('Tabela não criada', e.message);
    }
  }
  function indexarNicks() {
    const nomes = new Set();
    grupos().forEach(g => g.meses.forEach(mm => {
      if (mm.cofre) mm.cofre.sec.forEach(s => { if (s.t === 'm' || s.nicks) s.l.forEach(l => l[1] && !ehPeriodo(l[1]) && nomes.add(l[1])); });
      if (mm.sub) mm.sub.l.forEach(l => l[1] && nomes.add(l[1]));
      if (mm.cofre && mm.cofre.aud && mm.cofre.aud.v) nomes.add(mm.cofre.aud.v);
      if (mm.pesq) { mm.pesq.min.forEach(l => l[1] && nomes.add(l[1])); mm.pesq.lid.forEach(l => l[1] && nomes.add(l[1])); }
    }));
    definirHtml(el.nicks, [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(n => `<option value="${esc(n)}"></option>`).join(''));
  }

  /* ==================================================================
     MODAIS E TOASTS
     ================================================================== */
  function abrirBase(html, op) {
    S.focoAntes = document.activeElement;
    S.aoFecharModal = (op && op.aoFechar) || null;
    el.modal.innerHTML = html;
    el.modal.hidden = false;
    document.body.classList.add('overflow-hidden');
    const alvo = (op && op.foco && el.modal.querySelector(op.foco)) || el.modal.querySelector('[data-foco]') || el.modal.querySelector('button, input');
    if (alvo) setTimeout(() => alvo.focus({ preventScroll: true }), 30);
  }
  function abrirDialogo(html, op) { abrirBase(`<div class="dialogo">${html}</div>`, op); }
  function abrirModal({ tipo, titulo, corpo, acoes, aoFechar }) {
    S.acoesModal = acoes;
    const icone = tipo === 'sucesso' ? 'fa-check' : tipo === 'erro' ? 'fa-xmark' : 'fa-question';
    abrirBase(`<div class="modal-caixa">
      <div class="modal-icone ${tipo}"><i class="fa-solid ${icone}"></i></div>
      <h3 class="mt-4 font-titulo text-[28px] font-bold uppercase leading-none tracking-[.03em] text-texto">${esc(titulo)}</h3>
      <div class="mt-3 space-y-3 text-sm leading-relaxed text-nevoa/80">${corpo}</div>
      <div class="mt-6 grid grid-cols-1 gap-2.5 sm:auto-cols-fr sm:grid-flow-col">${acoes.map((a, i) => `<button type="button" class="${a.classe || 'btn-sec'}" data-modal-acao="${i}">${a.icone ? `<i class="fa-solid ${a.icone}"></i>` : ''}<span>${esc(a.rotulo)}</span></button>`).join('')}</div>
    </div>`, { aoFechar });
  }
  function abrirEspera(titulo, texto) {
    S.acoesModal = [];
    abrirBase(`<div class="modal-caixa" aria-busy="true"><div class="modal-icone pergunta"><i class="fa-solid fa-spinner fa-spin"></i></div>
      <h3 class="mt-4 font-titulo text-[26px] font-bold uppercase leading-none text-texto">${esc(titulo)}</h3><p class="mt-3 text-sm text-musgo">${esc(texto)}</p></div>`);
    S.esperando = true;
  }
  function fecharModal() {
    if (el.modal.hidden) return;
    el.modal.hidden = true;
    el.modal.innerHTML = '';
    S.esperando = false;
    document.body.classList.remove('overflow-hidden');
    const f = S.aoFecharModal;
    S.aoFecharModal = null;
    S.acoesModal = [];
    if (f) f();
    if (S.focoAntes && document.contains(S.focoAntes)) S.focoAntes.focus({ preventScroll: true });
    if (S.renderPendente && podeRedesenhar()) { S.renderPendente = false; renderTudo(); }
  }
  function mostrarErro(titulo, texto) {
    abrirModal({ tipo: 'erro', titulo, corpo: `<p>${esc(texto)}</p>`, acoes: [{ rotulo: 'Fechar', classe: 'btn-pri', acao: fecharModal }] });
  }
  function confirmar(titulo, texto, rotuloSim) {
    return new Promise(res => abrirModal({
      tipo: 'pergunta', titulo, corpo: `<p>${esc(texto)}</p>`,
      aoFechar: () => res(false),
      acoes: [
        { rotulo: 'Cancelar', classe: 'btn-sec', acao: () => { S.aoFecharModal = null; fecharModal(); res(false); } },
        { rotulo: rotuloSim, classe: 'btn-pri', acao: () => { S.aoFecharModal = null; fecharModal(); res(true); } }
      ]
    }));
  }
  /**
   * Senha de edição: pergunta uma vez por visita (o backup e a virada sempre confirmam).
   * Devolve a senha, '' quando a planilha não usa senha, ou null se a pessoa desistir.
   */
  function pedirSenha(op) {
    const precisa = op.sempre || (S.dados.edicao.senha && !S.senha);
    if (!precisa) return Promise.resolve(S.senha || '');
    return new Promise(res => {
      S.senhaPendente = res;
      abrirDialogo(`<form id="form-senha" novalidate>
        <div class="dialogo-cabeca"><span class="bloco-icone"><i class="fa-solid ${op.icone || 'fa-key'}"></i></span><div class="min-w-0"><h3 class="font-titulo text-[26px] font-bold uppercase leading-none text-texto">${esc(op.titulo)}</h3><p class="mt-1.5 text-[12.5px] text-musgo">${esc(op.texto)}</p></div>${botaoFechar()}</div>
        <div class="dialogo-corpo"><div><label class="rotulo" for="senha-edicao"><i class="fa-solid fa-key"></i>Senha de edição</label>
          <input id="senha-edicao" name="senha" type="password" class="campo" value="${esc(S.senha)}" autocomplete="off" data-foco><p class="msg erro" data-erro hidden></p></div></div>
        <div class="dialogo-rodape"><button type="button" class="btn-sec" data-acao="fechar">Cancelar</button><button type="submit" class="btn-pri"><i class="fa-solid ${op.icone || 'fa-check'}"></i>${esc(op.botao)}</button></div>
      </form>`, { aoFechar: () => { const f = S.senhaPendente; S.senhaPendente = null; if (f) f(null); } });
    });
  }
  function enviarSenha(form) {
    const senha = form.elements.senha.value.trim(), erro = form.querySelector('[data-erro]');
    if (!senha) { erro.textContent = 'Informe a senha de edição.'; erro.hidden = false; form.elements.senha.classList.add('invalido'); form.elements.senha.focus(); return; }
    const f = S.senhaPendente;
    S.senhaPendente = null;
    S.aoFecharModal = null;
    fecharModal();
    if (f) f(senha);
  }
  function prenderFoco(e) {
    const focaveis = [...el.modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(x => !x.closest('[hidden]'));
    if (!focaveis.length) return;
    const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  }
  function toast(msg, tipo) {
    const n = document.createElement('div');
    n.className = 'toast';
    n.innerHTML = `<i class="fa-solid ${tipo === 'erro' ? 'fa-circle-exclamation text-red-500' : 'fa-circle-check text-af-400'}"></i><span>${esc(msg)}</span>`;
    el.toasts.appendChild(n);
    while (el.toasts.children.length > 3) el.toasts.firstElementChild.remove();
    setTimeout(() => { n.classList.add('saindo'); setTimeout(() => n.remove(), 260); }, 2800);
  }

  /* ---------- dica do gráfico ---------- */
  function mostrarDica(col) {
    let d;
    try { d = JSON.parse(col.dataset.dica); } catch (_) { return; }
    const linha = (cor, rot, v) => `<p class="dica-linha"><i style="background:${cor}"></i><b>${fmt(v || 0)}</b><span>${rot}</span></p>`;
    el.dica.innerHTML = `<p class="mb-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-musgo">${esc(mesNome(d.m))} de ${S.dados.ano}</p>
      ${linha('var(--serie-pos)', 'positivas', d.pos)}${linha('var(--serie-neg)', 'negativas', d.neg)}${d.temp != null ? linha('#D9A404', 'temporárias', d.temp) : ''}`;
    el.dica.hidden = false;
    const r = col.getBoundingClientRect(), w = el.dica.offsetWidth, h = el.dica.offsetHeight;
    let x = r.left + r.width / 2 - w / 2 + window.scrollX, y = r.top + window.scrollY - h - 8;
    x = Math.max(window.scrollX + 8, Math.min(x, window.scrollX + document.documentElement.clientWidth - w - 8));
    if (y < window.scrollY + 8) y = r.bottom + window.scrollY + 8;
    el.dica.style.left = x + 'px';
    el.dica.style.top = y + 'px';
  }
  function esconderDica() { el.dica.hidden = true; }

  /* ---------- tema claro e escuro ---------- */
  function temaSalvo() { const t = lerLocal(CHAVE_TEMA); return t === 'claro' || t === 'escuro' ? t : ''; }
  const temaAtual = () => (document.documentElement.classList.contains('dark') ? 'escuro' : 'claro');
  function pintarBotaoTema() {
    const txt = temaAtual() === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro';
    el.tema.setAttribute('aria-label', txt);
    el.tema.title = txt;
  }
  function aplicarTema(tema, origem) {
    if (tema !== 'claro' && tema !== 'escuro') return;
    if (tema === temaAtual()) { pintarBotaoTema(); return; }
    const raiz = document.documentElement;
    const trocar = () => { raiz.classList.toggle('dark', tema === 'escuro'); pintarBotaoTema(); };
    if (!origem || movimentoReduzido() || typeof document.startViewTransition !== 'function') { trocar(); return; }
    const r = origem.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const raio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    try {
      const vt = document.startViewTransition(trocar);
      vt.ready.then(() => raiz.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
        { duration: 520, easing: 'cubic-bezier(.3, .7, .2, 1)', pseudoElement: '::view-transition-new(root)' }
      )).catch(() => {});
    } catch (_) { trocar(); }
  }
  function alternarTema() {
    const novo = temaAtual() === 'escuro' ? 'claro' : 'escuro';
    gravarLocal(CHAVE_TEMA, novo);
    aplicarTema(novo, el.tema);
  }

  /* ==================================================================
     NAVEGAÇÃO E EVENTOS
     ================================================================== */
  function gravarUrl() {
    const p = new URLSearchParams(location.search);
    p.set('aba', S.aba);
    const cat = catDaAba();
    if (cat && S.grupo[cat]) p.set('grupo', S.grupo[cat]); else p.delete('grupo');
    if (S.mes) p.set('mes', String(S.mes)); else p.delete('mes');
    if (S.dados && S.dados.anos && S.dados.anos[0] && S.ano !== S.dados.anos[0].ano) p.set('ano', String(S.ano)); else p.delete('ano');
    const q = p.toString();
    try { history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (_) { /* página sem histórico */ }
  }
  function lerUrl() {
    const p = new URLSearchParams(location.search), aba = p.get('aba'), salva = lerLocal(CHAVE_ABA);
    if (ABAS.some(a => a.id === aba)) { S.aba = aba; S.abaUrl = true; } else if (ABAS.some(a => a.id === salva)) S.aba = salva;
    const g = (p.get('grupo') || '').toUpperCase();
    if (g) S.grupoUrl = g;
    const m = parseInt(p.get('mes'), 10);
    if (m >= 1 && m <= 12) S.mesUrl = m;
    const ano = parseInt(p.get('ano'), 10);
    if (ano > 2000 && ano < 2100) S.ano = ano;
  }
  function irPara(aba) {
    if (!abasVisiveis().some(a => a.id === aba)) return;
    S.aba = aba;
    gravarLocal(CHAVE_ABA, aba);
    S.sub = S.sub || 'cofre';
    renderTudo();
    gravarUrl();
  }
  function abrirGrupo(id) {
    const g = grupoPorId(id);
    if (!g) return;
    S.aba = daCategoria(g.categoria).aba;
    S.grupo[g.categoria] = g.id;
    S.busca = '';
    gravarLocal(CHAVE_ABA, S.aba);
    renderTudo();
    gravarUrl();
  }
  function navegarAbas(e) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const vis = abasVisiveis(), i = vis.findIndex(a => a.id === S.aba);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? vis.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + vis.length) % vis.length;
    e.preventDefault();
    irPara(vis[j].id);
    const b = $('aba-' + vis[j].id);
    if (b) b.focus();
  }
  async function aoClicar(e) {
    const m = e.target.closest('[data-modal-acao]');
    if (m && el.modal.contains(m)) { const a = S.acoesModal[+m.dataset.modalAcao]; if (a && a.acao) a.acao(); return; }
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const acao = b.dataset.acao;
    if (acao === 'fechar') { fecharModal(); return; }
    if (S.ocupado) return;
    if (acao === 'recarregar') carregar({ forcar: true });
    else if (acao === 'recarregar-tudo') location.reload();
    else if (acao === 'abrir-grupo') abrirGrupo(b.dataset.grupo);
    else if (acao === 'subaba') { S.sub = b.dataset.sub; S.busca = ''; renderConteudo(); }
    else if (acao === 'editar') {
      if (S.editando && S.mudancas.size && !(await descartar())) return;
      S.editando = !S.editando;
      renderTudo();
    } else if (acao === 'alternar-tabela') { S.tabelas[b.dataset.tabela] = !S.tabelas[b.dataset.tabela]; esconderDica(); renderConteudo(); }
    else if (acao === 'escolher-mes') { S.mes = +b.dataset.mes; esconderDica(); renderTudo(); gravarUrl(); }
    else if (acao === 'criar-pesquisa') { const g = grupoAtual().g; if (g) criarPesquisa(g); }
    else if (acao === 'editar-aulas') { const g = grupoAtual().g; if (g) abrirAulas(g); }
    else if (acao === 'aula-remover') { lerAulasDoForm(); S.aulasEd.lista.splice(+b.dataset.i, 1); desenharAulas(); }
    else if (acao === 'aula-adicionar') {
      lerAulasDoForm();
      S.aulasEd.lista.push({ r: null, nome: '' });
      desenharAulas();
      const campos = el.modal.querySelectorAll('input[name="aula"]');
      if (campos.length) campos[campos.length - 1].focus();
    }
    else if (acao === 'backup') fazerBackup(b.dataset.planilha);
    else if (acao === 'virar') abrirVirada(b.dataset.planilha);
    else if (acao === 'descartar') descartar();
    else if (acao === 'gravar') gravar();
    else if (acao === 'ver-mudancas') verMudancas();
  }

  function ligarEventos() {
    el.tema.addEventListener('click', alternarTema);
    el.abas.addEventListener('click', e => { const b = e.target.closest('[data-aba]'); if (b) irPara(b.dataset.aba); });
    el.abas.addEventListener('keydown', navegarAbas);
    let espera = 0;
    window.addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(ajustarAbas, 120); esconderDica(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarAbas);
    el.mes.addEventListener('change', () => { const m = +el.mes.value; if (m && m !== S.mes) { S.mes = m; renderTudo(); gravarUrl(); } });
    el.ano.addEventListener('change', async () => {
      const ano = +el.ano.value;
      if (!ano || ano === S.ano) return;
      if (S.mudancas.size && !(await descartar())) { el.ano.value = String(S.ano); return; }
      S.editando = false;
      S.ano = ano;
      carregar({ ano, manterMes: true });
      gravarUrl();
    });
    el.atualizar.addEventListener('click', () => { if (!S.carregando) carregar({ forcar: true }); });
    document.addEventListener('click', aoClicar);
    el.conteudo.addEventListener('input', e => {
      const c = e.target;
      if (c.dataset.ed) digitar(c);
      else if (c.dataset.campo === 'busca') { S.busca = c.value; aplicarBusca(); }
    });
    el.conteudo.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-acao], .gcol')) { e.preventDefault(); e.target.click(); }
      if (e.key === 'Enter' && e.target.dataset && e.target.dataset.ed && S.mudancas.size) { e.preventDefault(); gravar(); }
    });
    el.conteudo.addEventListener('pointerover', e => { const c = e.target.closest('.gcol'); if (c) mostrarDica(c); });
    el.conteudo.addEventListener('pointerout', e => { const c = e.target.closest('.gcol'); if (c && !c.contains(e.relatedTarget)) esconderDica(); });
    el.conteudo.addEventListener('focusin', e => { const c = e.target.closest('.gcol'); if (c) mostrarDica(c); });
    el.conteudo.addEventListener('focusout', e => {
      if (e.target.closest('.gcol')) esconderDica();
      setTimeout(() => { if (S.renderPendente && podeRedesenhar() && el.modal.hidden) { S.renderPendente = false; renderTudo(); } }, 0);
    });
    el.modal.addEventListener('click', e => { if (e.target === el.modal && !S.esperando && !S.ocupado) fecharModal(); });
    el.modal.addEventListener('submit', e => {
      e.preventDefault();
      if (e.target.id === 'form-senha') enviarSenha(e.target);
      else if (e.target.id === 'form-virada') enviarVirada(e.target);
      else if (e.target.id === 'form-aulas') enviarAulas(e.target);
    });
    el.modal.addEventListener('input', e => { if (e.target.classList.contains('invalido')) e.target.classList.remove('invalido'); });
    document.addEventListener('keydown', e => {
      if (el.modal.hidden) return;
      if (e.key === 'Escape' && !S.esperando && !S.ocupado) { e.preventDefault(); fecharModal(); }
      else if (e.key === 'Tab') prenderFoco(e);
    });
    // Imagens que não carregam: emblema vira a sigla e a cabeça vira o ícone.
    document.addEventListener('error', e => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (img === el.usuarioAvatar) { img.dataset.falhou = '1'; renderUsuario(); return; }
      if (img.classList.contains('emblema')) {
        const s = document.createElement('span');
        s.className = 'emblema-falta' + (img.classList.contains('emblema-g') ? ' emblema-g' : '');
        s.textContent = img.dataset.sigla || '';
        img.replaceWith(s);
      } else if (img.parentElement && img.parentElement.classList.contains('cabeca')) img.remove();
    }, true);
    window.addEventListener('beforeunload', e => { if (S.mudancas.size || S.ocupado) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && S.dados && Date.now() - S.atualizadoEm > 120000) carregar({ silencioso: true }); });
    if (midiaClaro) {
      const seguirSistema = e => { if (!temaSalvo()) aplicarTema(e.matches ? 'claro' : 'escuro'); };
      if (midiaClaro.addEventListener) midiaClaro.addEventListener('change', seguirSistema);
      else if (midiaClaro.addListener) midiaClaro.addListener(seguirSistema);
    }
  }

  /* ==================================================================
     CARREGAMENTO E INÍCIO
     ================================================================== */
  async function carregar(op) {
    op = op || {};
    if (!apiConfigurada()) { renderTudo(); return; }
    // Com alterações por gravar, a atualização automática espera.
    if (op.silencioso && (S.mudancas.size || S.editando || S.ocupado)) return;
    const seq = ++S.seq;
    S.carregando = true;
    if (!op.silencioso) { S.erro = ''; renderSeletores(); }
    let erro = '';
    try {
      const params = {}, ano = op.ano !== undefined ? op.ano : S.ano;
      if (ano) params.ano = String(ano);
      if (S.usuario) params.nick = S.usuario.nick;
      if (op.forcar) params.forcar = '1';
      const r = await api('get', params);
      if (seq !== S.seq) return;
      const outroAno = !S.dados || S.dados.ano !== r.ano;
      S.dados = r;
      S.ano = r.ano;
      if (S.mesUrl) { S.mes = S.mesUrl; S.mesUrl = 0; } else if (!S.mes || (outroAno && !op.manterMes)) S.mes = mesInicial();
      if (S.grupoUrl) {
        const g = grupoPorId(S.grupoUrl);
        if (g) { S.grupo[g.categoria] = g.id; if (!S.abaUrl || catDaAba() !== g.categoria) S.aba = daCategoria(g.categoria).aba; }
        S.grupoUrl = '';
      }
      if (r.somenteLeitura) S.editando = false;
      S.atualizadoEm = Date.now();
      indexarNicks();
    } catch (e) {
      erro = e.message;
    }
    if (seq !== S.seq) return;
    S.carregando = false;
    S.erro = erro;
    if (podeRedesenhar() && el.modal.hidden) renderTudo();
    else { S.renderPendente = true; renderUsuario(); renderAvisos(); renderSeletores(); }
  }

  async function carregarSessao() {
    try {
      const u = await Promise.race([obterUsuario(), new Promise((_, falhar) => setTimeout(() => falhar(new Error('tempo')), 8000))]);
      S.usuario = u;
      S.sessao = u ? 'ok' : 'deslogado';
    } catch (_) {
      S.usuario = null;
      S.sessao = 'erro';
    }
  }
  async function conferirAcesso() {
    if (!CFG.VERIFICAR_GRUPOS) { S.grupos = []; S.acesso = 'ok'; return; }
    try {
      const g = await Promise.race([verificarAcesso(S.usuario), new Promise((_, falhar) => setTimeout(() => falhar(new Error('tempo')), 30000))]);
      S.grupos = Array.isArray(g) ? g : [];
      S.acesso = S.grupos.length ? 'ok' : 'negado';
    } catch (_) {
      S.grupos = [];
      S.acesso = 'erro';
    }
  }

  async function iniciar() {
    el.anoRodape.textContent = new Date().getFullYear();
    pintarBotaoTema();
    lerUrl();
    ligarEventos();
    renderTudo();
    await carregarSessao();
    renderTudo();
    if (S.sessao !== 'ok') return;
    await Promise.all([conferirAcesso().then(() => { if (!S.carregando || S.dados) renderTudo(); }), carregar()]);
    renderTudo();
    setInterval(() => { if (!document.hidden && el.modal.hidden && !S.carregando && S.dados && podeVer()) carregar({ silencioso: true }); }, CFG.ATUALIZAR_SEGUNDOS * 1000);
  }

  // Exposto para testes e para depuração pelo console.
  window.COFRES_AF = {
    CFG, S,
    recarregar: () => carregar({ forcar: true }),
    renderizar: () => renderTudo(),
    async reiniciar() {
      fecharModal();
      Object.assign(S, { dados: null, erro: '', editando: false, senha: '', busca: '', tabelas: {}, animada: '', sessao: 'verificando', acesso: 'verificando', grupos: [], ano: 0, mes: 0, ocupado: false });
      S.mudancas.clear();
      el.usuarioAvatar.dataset.falhou = '';
      renderTudo();
      await carregarSessao();
      renderTudo();
      if (S.sessao !== 'ok') return;
      await Promise.all([conferirAcesso(), carregar()]);
      renderTudo();
    }
  };

  iniciar();
})();