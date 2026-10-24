(() => {
  'use strict';

  /* ==================================================================
     CONFIGURAÇÃO
     ================================================================== */
  const CFG = {
    // URL do App da Web do Apps Script (termina em /exec)
    API: 'https://script.google.com/macros/s/AKfycbzV6MknKcsOl9VJGkK00UiELTs3FIQcBIAosf53qMX5hA1oynJzBTGiwssv6to6H2Dwzg/exec',
    // De quantos em quantos segundos o painel se atualiza sozinho
    ATUALIZAR_SEGUNDOS: 120,
    // Termo de compromisso dos registros
    TERMO: 'Declaro que as informações deste registro são verdadeiras e que estou ciente de que declarações falsas sujeitam o declarante às sanções previstas nas normas da Auditoria Fiscal.',
    // Banner do relatório mensal em BBCode
    BANNER: 'https://i.imgur.com/dw33NA3.png'
  };

  /* ------------------------------------------------------------------
     Daqui para baixo não há configuração.
     ------------------------------------------------------------------ */

  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const TIPOS = ['Semanal', 'Quinzenal', 'Mensal', 'Subgrupos', 'Pesquisa'];
  const TIPO = {
    Semanal: { nome: 'Cofre semanal', curto: 'Semanal', icone: 'fa-calendar-week' },
    Quinzenal: { nome: 'Cofre quinzenal', curto: 'Quinzenal', icone: 'fa-calendar-days' },
    Mensal: { nome: 'Cofre mensal', curto: 'Mensal', icone: 'fa-calendar' },
    Subgrupos: { nome: 'Cofre de subgrupos', curto: 'Subgrupos', icone: 'fa-sitemap' },
    Pesquisa: { nome: 'Dados de pesquisa', curto: 'Dados de pesquisa', icone: 'fa-magnifying-glass-chart' },
    Interpretacao: { nome: 'Interpretação de dados', curto: 'Interpretação', icone: 'fa-chart-pie' }
  };
  const GRUPOS = ['Companhias', 'Subcompanhias', 'Órgãos'];
  const PERIODO = { S1: '1ª semana', S2: '2ª semana', S3: '3ª semana', S4: '4ª semana', S5: '5ª semana', Q1: '1ª quinzena', Q2: '2ª quinzena', 'Mês': 'Mês inteiro' };
  const STATUS = {
    C: { icone: 'fa-check', A: 'Concluída', S: 'Realizada', legenda: 'Concluída' },
    J: { icone: 'fa-file-lines', A: 'Justificada', S: 'Justificada', legenda: 'Justificada' },
    P: { icone: 'fa-hourglass-half', A: 'Aguardando registro', S: 'Aguardando registro', legenda: 'Aguardando registro' },
    E: { icone: 'fa-clock', A: 'Em andamento', S: 'Em andamento', legenda: 'Período em andamento' },
    N: { icone: 'fa-xmark', A: 'Não realizada', S: 'Não realizada', legenda: 'Não realizada' },
    L: { icone: '', marca: 'CE', A: 'Caso especial (licença)', S: 'Caso especial', legenda: 'Caso especial (licença)' },
    A: { icone: 'fa-calendar', A: 'Agendada', S: 'Agendada', legenda: 'Agendada' }
  };
  const CASOS = {
    positivo: { titulo: 'Casos positivos', um: 'Caso positivo', icone: 'fa-arrow-trend-up', vazio: 'Ninguém atingiu a meta neste mês.' },
    negativo: { titulo: 'Casos negativos', um: 'Caso negativo', icone: 'fa-arrow-trend-down', vazio: 'Nenhum caso negativo neste mês.' },
    especial: { titulo: 'Casos especiais', um: 'Caso especial', icone: 'fa-user-clock', vazio: 'Nenhum caso especial neste mês.' }
  };
  const PAPEL = { A: 'Auditor', S: 'Agente supervisor' };
  const ABAS = [
    { id: 'minhas', rotulo: 'Minhas tarefas', icone: 'fa-list-check' },
    { id: 'quadro', rotulo: 'Quadro', icone: 'fa-table-cells' },
    { id: 'prazos', rotulo: 'Prazos', icone: 'fa-calendar-days' },
    { id: 'escalas', rotulo: 'Escalas', icone: 'fa-users' },
    { id: 'interpretacao', rotulo: 'Interpretação', icone: 'fa-chart-pie', mostrar: () => !!(S.dados && (S.dados.editor || todasTarefas().some(ehFuncao))) },
    { id: 'desempenho', rotulo: 'Desempenho', icone: 'fa-chart-simple' },
    { id: 'editar', rotulo: 'Editar escala', icone: 'fa-pen-to-square', editor: true }
  ];
  const CHAVE_TEMA = 'af-cofre:tema';
  const CHAVE_ABA = 'af-escalas:aba';
  const LIMITE_POSTAGEM = 63000;
  // Versão do Code.gs que esta página espera (a página avisa os editores quando a planilha está atrás).
  const VERSAO_PLANILHA = '2.2.0';

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
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const pct = x => (x == null ? '' : String(x).replace('.', ',') + '%');
  const minuscula = s => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const juntar = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
  const decodificarHtml = s => { const t = document.createElement('textarea'); t.innerHTML = String(s || ''); return t.value; };
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

  /* ---------- datas (texto AAAA-MM-DD, contas em UTC) ---------- */
  const partes = s => { const p = String(s || '').split('-').map(Number); return { y: p[0], m: p[1], d: p[2] || 1 }; };
  const utc = s => { const p = partes(s); return Date.UTC(p.y, p.m - 1, p.d); };
  const isoDe = ms => new Date(ms).toISOString().slice(0, 10);
  const somarDias = (s, n) => isoDe(utc(s) + n * 864e5);
  const diasEntre = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);
  const diaSemana = s => new Date(utc(s)).getUTCDay();
  const br = s => { if (!s) return ''; const p = partes(s); return `${dois(p.d)} ${MESES[p.m - 1]} ${p.y}`; };
  const brCurto = s => { const p = partes(s); return `${dois(p.d)} ${MESES[p.m - 1]}`; };
  const intervalo = (a, b) => `${br(a)} a ${br(b)}`;
  const intervaloCurto = (a, b) => { const x = partes(a), y = partes(b); return x.m === y.m ? `${dois(x.d)} a ${dois(y.d)} ${MESES[y.m - 1]}` : `${brCurto(a)} a ${brCurto(b)}`; };
  const hoje = () => (S.dados && S.dados.hoje) || isoDe(Date.now() - 3 * 36e5);

  function falta(prazo) {
    const n = diasEntre(hoje(), prazo);
    if (n < 0) return { texto: 'Prazo encerrado', nivel: '' };
    if (n === 0) return { texto: 'Vence hoje', nivel: 'alta' };
    if (n === 1) return { texto: 'Vence amanhã', nivel: 'alta' };
    return { texto: `Vence em ${n} dias`, nivel: n <= 3 ? 'media' : 'ok' };
  }

  /* ==================================================================
     PLANILHA (Apps Script)
     ================================================================== */
  const apiConfigurada = () => !!window.ESCALAS_AF_TRANSPORTE || /^https:\/\/script\.google(usercontent)?\.com\//.test(CFG.API);
  const transporte = window.ESCALAS_AF_TRANSPORTE || {
    async get(params) {
      const r = await fetch(CFG.API + '?' + new URLSearchParams(params).toString(), { cache: 'no-store', redirect: 'follow' });
      return r.json();
    },
    async post(corpo) {
      const r = await fetch(CFG.API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(corpo), redirect: 'follow' });
      return r.json();
    }
  };
  async function api(metodo, dados) {
    let r;
    try {
      r = await Promise.race([
        transporte[metodo](dados),
        new Promise((_, falhar) => setTimeout(() => falhar(new Error('tempo')), 30000))
      ]);
    } catch (_) {
      throw new Error('A planilha não respondeu. Verifique a conexão e tente de novo.');
    }
    if (!r || r.ok !== true) throw new Error((r && r.erro) || 'Resposta inesperada da planilha.');
    return r;
  }

  /* ==================================================================
     FÓRUM
     ================================================================== */
  const nickValido = n => !!n && !/^(anonymous|visitante|convidado)$/i.test(n);
  async function obterUsuario() {
    if (typeof window.ESCALAS_AF_SESSAO === 'function') return window.ESCALAS_AF_SESSAO();
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

  /* ==================================================================
     ESTADO
     ================================================================== */
  const S = {
    sessao: 'verificando', usuario: null,
    dados: null, erro: '', carregando: false, seq: 0, mes: '', atualizadoEm: 0,
    aba: '', abaUrl: false, abaSalva: false, animada: '', renderPendente: false,
    tipoQuadro: '', buscaQuadro: '', buscaEscala: '', versaoEscala: '',
    ed: null, senha: '', form: null, bb: '',
    aoFecharModal: null, acoesModal: [], focoAntes: null
  };
  const IDX = { orgs: new Map(), periodos: [], tarefas: new Map(), listagem: new Map() };
  const el = {
    tema: $('tema'), usuario: $('usuario'), usuarioAvatar: $('usuario-avatar'), usuarioIcone: $('usuario-icone'),
    usuarioRotulo: $('usuario-rotulo'), usuarioNome: $('usuario-nome'), avisos: $('avisos'), hoje: $('hoje'),
    abas: $('abas'), mes: $('mes'), conteudo: $('conteudo'), modal: $('modal'), toasts: $('toasts'), membros: $('membros'), ano: $('ano')
  };

  const todasTarefas = () => (S.dados ? S.dados.tarefas.concat(S.dados.anteriores ? S.dados.anteriores.tarefas : []) : []);
  function indexar() {
    const d = S.dados;
    IDX.orgs = new Map(d.cadastro.map(o => [normal(o.nome), o]));
    IDX.periodos = d.periodos.concat(d.anteriores ? d.anteriores.periodos : []);
    IDX.tarefas = new Map(todasTarefas().map(t => [t.chave, t]));
    IDX.listagem = new Map(((d.listagem && d.listagem.membros) || []).map(m => [chaveNick(m.nick), m]));
    definirHtml(el.membros, (d.membros || []).map(n => `<option value="${esc(n)}"></option>`).join(''));
  }
  const orgDe = nome => IDX.orgs.get(normal(nome)) || { nome, grupo: 'Companhias', sigla: '', emblema: '', link: '', linkPesquisa: '', tipos: [] };
  const eu = () => (S.usuario ? chaveNick(S.usuario.nick) : '');
  const sou = nick => !!nick && !!S.usuario && chaveNick(nick) === eu();
  const linkTopico = t => { if (ehFuncao(t)) return ''; const o = orgDe(t.org); return t.tipo === 'Pesquisa' ? o.linkPesquisa : o.link; };
  /* ---------- funções de interpretação de dados ---------- */
  const ehFuncao = t => !!t && t.tipo === 'Interpretacao' && !!t.funcao;
  const ehCofre = t => t.tipo !== 'Pesquisa' && t.tipo !== 'Interpretacao';
  const papelRotulo = (t, papel) => (ehFuncao(t) ? (papel === 'A' ? 'Responsável' : 'Fiscal') : PAPEL[papel]);
  const quemExecuta = t => (ehFuncao(t) ? 'responsável' : 'auditor');
  const tituloDe = t => (ehFuncao(t) ? t.funcao.titulo : t.org);
  const emblemaDe = (t, grande) => (ehFuncao(t)
    ? (t.funcao.org ? emblema(t.funcao.org, grande) : `<span class="funcao-icone${grande ? '' : ' h-7 w-7 text-[11px]'}" aria-hidden="true"><i class="fa-solid fa-chart-pie"></i></span>`)
    : emblema(t.org, grande));
  // Linha de período: o intervalo nos cofres e nos dados de pesquisa; o início (e a organização) nas funções.
  const periodoDe = t => (ehFuncao(t) ? `Início ${br(t.inicio)}${t.funcao.org ? ' · ' + esc(t.funcao.org) : ''}` : `${rotuloPeriodo(t)} · ${intervalo(t.inicio, t.fim)}`);
  // Em que lista do desempenho a pessoa conta (nas funções, pelo cargo na listagem).
  const contaEm = (t, pos) => (ehFuncao(t) ? (pos === 'A' ? t.contaA : t.contaS) || '' : pos);
  const ehAnterior = t => !!(S.dados && S.dados.anteriores && t.chave.indexOf(S.dados.anteriores.mes + '|') === 0);
  const listagemOk = () => !!(S.dados && S.dados.listagem && S.dados.listagem.ok);
  const naListagem = nick => IDX.listagem.get(chaveNick(nick)) || null;
  const foraDaListagem = nick => !!nick && listagemOk() && !naListagem(nick);
  // Licença da listagem que cobre parte do intervalo.
  const licencaEntre = (m, ini, fim) => (m && m.licenca && m.licenca.inicio <= fim && m.licenca.fim >= ini ? m.licenca : null);

  /* ---------- pedaços de HTML ---------- */
  const iconeSt = s => (STATUS[s].marca ? `<b class="ce" aria-hidden="true">${STATUS[s].marca}</b>` : `<i class="fa-solid ${STATUS[s].icone}" aria-hidden="true"></i>`);
  const st = (s, papel) => `<span class="st" data-s="${s}" title="${esc(STATUS[s][papel || 'A'])}">${iconeSt(s)}</span>`;
  const pilula = (s, papel) => `<span class="pilula" data-s="${s}">${iconeSt(s)}${esc(STATUS[s][papel || 'A'])}</span>`;
  const iniciais = nome => semAcento(nome).split(/\s+/).filter(w => w.length > 2).map(w => w[0]).join('').slice(0, 4).toUpperCase();
  function emblema(org, grande) {
    const o = typeof org === 'string' ? orgDe(org) : org;
    const sigla = esc(o.sigla || iniciais(o.nome));
    const tam = grande ? ' emblema-g' : '';
    return o.emblema
      ? `<img class="emblema${tam}" src="${esc(o.emblema)}" alt="" loading="lazy" data-sigla="${sigla}">`
      : `<span class="emblema-falta${tam}" aria-hidden="true">${sigla}</span>`;
  }
  const urlCabeca = nick => 'https://www.habbo.com.br/habbo-imaging/avatarimage?' +
    new URLSearchParams({ user: nick, direction: '2', head_direction: '3', headonly: '1', size: 'm' }).toString();
  const cabeca = (nick, grande) => `<span class="cabeca${grande ? ' cabeca-g' : ''}" aria-hidden="true"><i class="fa-solid fa-user"></i>${nick ? `<img src="${esc(urlCabeca(nick))}" alt="" loading="lazy">` : ''}</span>`;
  const cartao = (html, extra) => `<section class="cartao${extra ? ' ' + extra : ''}">${html}</section>`;
  const vazio = (icone, titulo, texto, acao) => `<div class="vazio"><span class="vazio-icone"><i class="fa-solid ${icone}" aria-hidden="true"></i></span><p class="vazio-titulo">${esc(titulo)}</p>${texto ? `<p class="vazio-texto">${esc(texto)}</p>` : ''}${acao || ''}</div>`;
  const secao = (icone, titulo, extra) => `<h3 class="secao"><span class="secao-num"><i class="fa-solid ${icone}" aria-hidden="true"></i></span>${titulo}<span class="secao-linha"></span>${extra || ''}</h3>`;
  const botaoFechar = () => '<button type="button" class="fechar" data-acao="fechar" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>';
  function aviso(tipo, icone, titulo, texto, acao) {
    return `<div class="aviso aviso-${tipo}"><i class="fa-solid ${icone}" aria-hidden="true"></i><p class="min-w-0 flex-1"><span class="font-semibold">${esc(titulo)}</span> <span class="opacity-80">${esc(texto)}</span></p>${acao || ''}</div>`;
  }
  const rotuloPeriodo = p => (p.periodo === 'Mês' ? 'Mês inteiro' : PERIODO[p.periodo] || p.periodo);

  /* ---------- limite de justificativas ---------- */
  const FAIXA = { Semanal: ['semanal', 'semanais'], Quinzenal: ['quinzenal', 'quinzenais'], Mensal: ['mensal', 'mensais'], Interpretacao: ['de interpretação de dados', 'de interpretação de dados'] };
  const FAIXA_CURTA = { Semanal: 'Semanais', Quinzenal: 'Quinzenais', Mensal: 'Mensais', Interpretacao: 'Interpretação' };
  const faixaDe = tipo => (tipo === 'Semanal' || tipo === 'Quinzenal' || tipo === 'Interpretacao' ? tipo : tipo === 'Pesquisa' ? ((S.dados && S.dados.config.pesquisaFrequencia) || 'Semanal') : 'Mensal');
  const limiteJus = faixa => { const l = S.dados && S.dados.config.limitesJustificativa; return l && l[faixa] != null ? l[faixa] : { Semanal: 2, Quinzenal: 1, Mensal: 1, Interpretacao: 1 }[faixa]; };
  const ateJustificar = prazo => { const n = S.dados && S.dados.config.antecedenciaJustificativa; return somarDias(prazo, -(n == null ? 1 : n)); };
  const mesDaTarefa = t => (ehAnterior(t) ? S.dados.anteriores.mesNome : S.dados.mesNome);

  /* ==================================================================
     TOPO: usuário, avisos, hoje, abas e mês
     ================================================================== */
  function renderUsuario() {
    const s = S.sessao;
    el.usuario.dataset.estado = s === 'ok' ? 'ok' : s === 'deslogado' ? 'erro' : s === 'erro' ? 'aviso' : '';
    const m = s === 'ok' && S.dados ? naListagem(S.usuario.nick) : null;
    el.usuarioRotulo.textContent = s === 'ok' ? (m && m.cargo ? m.cargo : 'Conectado como') : 'Sessão do fórum';
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
    const itens = [];
    if (!apiConfigurada()) itens.push(aviso('aviso', 'fa-plug-circle-xmark', 'O painel ainda não está ligado à planilha.', 'Cole a URL do App da Web em CFG.API.'));
    if (S.sessao === 'deslogado') itens.push(aviso('erro', 'fa-right-to-bracket', 'Você não está conectado ao fórum.', 'Entre na sua conta para registrar as suas tarefas.', '<a href="/login" class="btn-mini">Entrar</a>'));
    if (S.sessao === 'erro') itens.push(aviso('aviso', 'fa-circle-exclamation', 'Não foi possível confirmar sua sessão no fórum.', 'Recarregue a página para tentar de novo.'));
    if (S.erro && S.dados) itens.push(aviso('aviso', 'fa-cloud', 'Não foi possível atualizar o painel.', S.erro, '<button type="button" class="btn-mini" data-acao="recarregar"><i class="fa-solid fa-rotate"></i>Tentar de novo</button>'));
    if (S.dados && S.dados.editor && (S.dados.versao || '') < VERSAO_PLANILHA) itens.push(aviso('aviso', 'fa-code-branch', `O Apps Script está na versão ${S.dados.versao || 'anterior'}.`, `Cole o Code.gs da versão ${VERSAO_PLANILHA} e publique uma nova versão da implantação.`));
    definirHtml(el.avisos, itens.join(''));
    el.avisos.hidden = !itens.length;
  }

  function vencendoHoje() {
    const h = hoje(), papeis = [['C', 'prazoC', 'Cia/Subcia'], ['A', 'prazoA', 'Auditores'], ['S', 'prazoS', 'Agentes']];
    return papeis.map(([, campo, rotulo]) => {
      const nomes = [];
      IDX.periodos.forEach(p => {
        if (p[campo] !== h) return;
        const nome = p.tipo === 'Mensal' ? 'mensal' : p.tipo === 'Subgrupos' ? 'subgrupos' : PERIODO[p.periodo];
        if (!nomes.includes(nome)) nomes.push(nome);
      });
      return nomes.length ? `${rotulo}: ${juntar(nomes)}` : '';
    }).filter(Boolean).concat((() => {
      const n = todasTarefas().filter(t => ehFuncao(t) && (t.prazoA === h || t.prazoS === h)).length;
      return n ? [`Interpretação: ${plural(n, 'função', 'funções')}`] : [];
    })());
  }

  function renderHoje() {
    if (!S.dados) { el.hoje.hidden = true; return; }
    const h = hoje(), dow = diaSemana(h);
    const ini = S.dados.config.inicioSemana === 'Segunda' ? somarDias(h, -((dow + 6) % 7)) : somarDias(h, -dow);
    const vencem = vencendoHoje();
    const chips = vencem.length
      ? vencem.map(v => `<span class="vence"><i class="fa-solid fa-hourglass-half" aria-hidden="true"></i>${esc(v)}</span>`).join('')
      : '<span>nenhum</span>';
    definirHtml(el.hoje, `<div class="hoje">
      <span class="hoje-icone"><i class="fa-regular fa-calendar" aria-hidden="true"></i></span>
      <span>Hoje é <b>${DIAS[dow]}, ${br(h)}</b></span>
      <span class="hoje-sep"></span>
      <span>Semana de referência <b>${intervalo(ini, somarDias(ini, 6))}</b></span>
      <span class="hoje-sep"></span>
      <span class="flex flex-wrap items-center gap-2"><span>Prazos que vencem hoje</span>${chips}</span>
    </div>`);
    el.hoje.hidden = false;
  }

  const abasVisiveis = () => ABAS.filter(a => (!a.editor || (S.dados && S.dados.editor)) && (!a.mostrar || a.mostrar()));
  function renderAbas() {
    const vis = abasVisiveis();
    if (!vis.some(a => a.id === S.aba)) S.aba = 'quadro';
    const n = S.dados ? minhasTarefas().filter(x => x.aberta).length : 0;
    definirHtml(el.abas, vis.map(a => {
      const sel = a.id === S.aba;
      const selo = a.id === 'minhas' && n ? `<span class="aba-badge" title="${plural(n, 'tarefa para registrar', 'tarefas para registrar')}">${n}</span>` : '';
      return `<button type="button" role="tab" class="aba" id="aba-${a.id}" data-aba="${a.id}" aria-selected="${sel}" aria-controls="conteudo" tabindex="${sel ? 0 : -1}"><i class="fa-solid ${a.icone}" aria-hidden="true"></i><span>${a.rotulo}</span>${selo}</button>`;
    }).join(''));
    // No celular as abas rolam de lado: a aba atual fica sempre à vista.
    const atual = el.abas.querySelector('[aria-selected="true"]');
    if (atual && el.abas.scrollWidth > el.abas.clientWidth) {
      const r = atual.getBoundingClientRect(), c = el.abas.getBoundingClientRect();
      if (r.left < c.left || r.right > c.right) el.abas.scrollLeft += r.left - c.left - (c.width - r.width) / 2;
    }
  }

  function renderMes() {
    const meses = S.dados ? S.dados.meses : [];
    definirHtml(el.mes, meses.length ? meses.map(m => `<option value="${esc(m.mes)}">${esc(m.nome)}</option>`).join('') : '<option value="">Carregando...</option>');
    if (meses.length) el.mes.value = S.mes;
    el.mes.disabled = !meses.length || S.carregando;
  }

  /* ==================================================================
     CONTEÚDO
     ================================================================== */
  const PAINEIS = {};
  function esqueleto() {
    return cartao(`<div class="space-y-4" aria-busy="true" aria-label="Carregando">
      <div class="esqueleto h-3 w-24"></div><div class="esqueleto h-9 w-64 max-w-full"></div>
      <div class="grid gap-3 grid-cols-1 sm:grid-cols-3"><div class="esqueleto h-24"></div><div class="esqueleto h-24"></div><div class="esqueleto h-24"></div></div>
      <div class="esqueleto h-16"></div><div class="esqueleto h-16"></div><div class="esqueleto h-16"></div>
    </div>`);
  }
  function renderConteudo() {
    let html;
    if (!apiConfigurada()) html = cartao(vazio('fa-plug-circle-xmark', 'Painel desligado', 'Cole a URL do App da Web em CFG.API para carregar as escalas.'));
    else if (!S.dados || (S.carregando && S.dados.mes !== S.mes)) {
      html = S.erro && !S.carregando
        ? cartao(vazio('fa-cloud', 'Não foi possível carregar o painel', S.erro, '<button type="button" class="btn-pri mt-2" data-acao="recarregar"><i class="fa-solid fa-rotate"></i>Tentar de novo</button>'))
        : esqueleto();
    } else html = PAINEIS[S.aba]();
    const nova = S.animada !== S.aba;
    if (definirHtml(el.conteudo, html) && nova && S.dados) {
      S.animada = S.aba;
      reanimar(el.conteudo.firstElementChild, 'entra');
    }
    el.conteudo.setAttribute('role', 'tabpanel');
    el.conteudo.setAttribute('aria-labelledby', 'aba-' + S.aba);
    aplicarBuscas();
  }
  function renderTudo() {
    renderUsuario();
    renderAvisos();
    renderHoje();
    renderAbas();
    renderMes();
    renderConteudo();
  }
  const podeRedesenhar = () => {
    const a = document.activeElement;
    return !(a && el.conteudo.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
  };

  /* ==================================================================
     MINHAS TAREFAS
     ================================================================== */
  function itemDe(t, papel) {
    const A = papel === 'A', s = A ? t.sa : t.ss, prazo = A ? t.prazoA : t.prazoS, h = hoje();
    const faixa = faixaDe(t.tipo), max = limiteJus(faixa), usadas = (A ? t.jusA : t.jusS) || 0;
    // Sem a opção de justificar só porque as justificativas da faixa acabaram no mês.
    const semCota = 'PEA'.includes(s) && t.inicio <= h && h <= ateJustificar(prazo) && usadas >= max;
    return { t, papel, s, prazo, faixa, max, usadas, semCota, aberta: A ? t.abertaA : t.abertaS, justifica: A ? t.justificaA : t.justificaS };
  }
  function minhasTarefas() {
    if (!S.usuario) return [];
    const out = [];
    todasTarefas().forEach(t => {
      ['A', 'S'].forEach(p => {
        if (!sou(p === 'A' ? t.auditor : t.supervisor)) return;
        const x = itemDe(t, p);
        // Do mês anterior, só o que ainda está em aberto.
        if (ehAnterior(t) && !(x.aberta || x.justifica || x.s === 'P' || x.s === 'E')) return;
        out.push(x);
      });
    });
    return out;
  }

  function cartaoTarefa(x) {
    const t = x.t, A = x.papel === 'A';
    const f = falta(x.prazo), k = esc(t.chave);
    let info = '';
    if (!A) info += `<p class="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-musgo">${st(t.sa, 'A')}<span>${papelRotulo(t, 'A')} <b class="font-semibold text-nevoa">${esc(t.auditor || 'sem nome na escala')}</b>: ${esc(minuscula(STATUS[t.sa].A))}${t.dataA ? ' em ' + br(t.dataA) : ''}</span></p>`;
    if (!x.aberta && x.s === 'E') info += `<p class="mt-2 text-[12px] text-musgo"><i class="fa-solid fa-unlock mr-1.5 text-af-400"></i>Registro a partir de ${br(t.fim)}</p>`;
    if (!x.aberta && x.s === 'P' && !A) info += `<p class="mt-2 text-[12px] text-musgo"><i class="fa-solid fa-unlock mr-1.5 text-af-400"></i>Libera com o registro do ${quemExecuta(t)} ou em ${br(somarDias(t.prazoA, 1))}</p>`;
    if (x.semCota) info += `<p class="mt-2 text-[12px] text-musgo"><i class="fa-solid fa-ban mr-1.5"></i>Justificativas ${FAIXA[x.faixa][1]} de ${esc(mesDaTarefa(t))} esgotadas (${x.usadas} de ${x.max})</p>`;
    const acoes = [];
    const link = linkTopico(t);
    if (link) acoes.push(`<a class="btn-link" href="${esc(link)}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i>${t.tipo === 'Pesquisa' ? 'Abrir o tópico' : 'Abrir o cofre'}</a>`);
    if (x.justifica) acoes.push(`<button type="button" class="btn-sec" data-acao="justificar" data-chave="${k}" data-papel="${x.papel}"><i class="fa-solid fa-file-lines"></i>Justificar</button>`);
    if (x.aberta) acoes.push(`<button type="button" class="btn-pri" data-acao="registrar" data-chave="${k}" data-papel="${x.papel}"><i class="fa-solid fa-pen-to-square"></i>${A ? 'Registrar' : ehFuncao(t) ? 'Fiscalizar' : 'Supervisionar'}</button>`);
    return `<article class="tarefa" data-nivel="${f.nivel}">
      <div class="tarefa-corpo">
        ${emblemaDe(t, true)}
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2"><h4 class="tarefa-titulo">${esc(tituloDe(t))}</h4><span class="etiqueta"><i class="fa-solid ${TIPO[t.tipo].icone}"></i>${esc(TIPO[t.tipo].nome)}</span><span class="etiqueta etiqueta-papel">${papelRotulo(t, x.papel)}</span></div>
          <p class="mt-1 text-[13px] text-musgo">${periodoDe(t)}</p>
          ${info}
        </div>
        <div class="tarefa-prazo"><p class="text-[11px] font-semibold uppercase tracking-[.12em] text-musgo">Prazo</p><p class="tarefa-prazo-data">${br(x.prazo)}</p><p class="tarefa-prazo-falta">${f.texto}</p></div>
      </div>
      ${acoes.length ? `<div class="tarefa-rodape">${acoes.join('')}</div>` : ''}
    </article>`;
  }

  function itemLista(x) {
    const t = x.t, A = x.papel === 'A', data = A ? t.dataA : t.dataS;
    const quando = x.s === 'C' || x.s === 'J' ? `em ${br(data)}` : x.s === 'A' ? `começa em ${br(t.inicio)}` : `prazo ${br(x.prazo)}`;
    return `<li class="lista-item">
      ${emblemaDe(t)}
      <span class="min-w-0 flex-1"><b class="font-semibold text-texto">${esc(tituloDe(t))}</b><span class="text-musgo"> · ${esc(TIPO[t.tipo].curto)} · ${ehFuncao(t) ? 'até ' + br(t.prazoA) : rotuloPeriodo(t)} · ${papelRotulo(t, x.papel)}</span></span>
      <span class="text-[12px] text-musgo">${quando}</span>
      ${pilula(x.s, x.papel)}
    </li>`;
  }

  const kpi = (n, rotulo, icone, tom) => `<div class="kpi"${tom ? ` data-tom="${tom}"` : ''}><p class="kpi-valor">${n}</p><p class="kpi-rotulo"><i class="fa-solid ${icone}" aria-hidden="true"></i>${rotulo}</p></div>`;

  PAINEIS.minhas = function () {
    if (S.sessao === 'verificando') return esqueleto();
    if (S.sessao !== 'ok') {
      return cartao(vazio('fa-right-to-bracket', 'Entre no fórum para ver as suas tarefas', 'Com a sessão do fórum, o painel mostra o que você tem para registrar e os seus prazos.',
        '<div class="mt-2 flex flex-wrap justify-center gap-2"><a href="/login" class="btn-pri"><i class="fa-solid fa-right-to-bracket"></i>Entrar</a><button type="button" class="btn-sec" data-acao="ir" data-aba="quadro"><i class="fa-solid fa-table-cells"></i>Ver o quadro</button></div>'));
    }
    const itens = minhasTarefas(), nick = S.usuario.nick;
    const cab = `<div class="flex flex-wrap items-center gap-4">${cabeca(nick, true)}<div class="min-w-0 flex-1"><p class="kicker">${esc(S.dados.mesNome)}</p><h2 class="painel-titulo">Olá, ${esc(nick)}</h2>`;
    if (!itens.length) {
      return cartao(cab + '</div></div>' + vazio('fa-mug-hot', 'Você não está na escala deste mês', 'Quando o seu nick estiver na escala, as suas tarefas aparecem aqui.',
        '<button type="button" class="btn-sec mt-2" data-acao="ir" data-aba="escalas"><i class="fa-solid fa-users"></i>Ver a escala</button>'));
    }
    const g = { registrar: [], andamento: [], proximas: [], feitas: [], perdidas: [], especiais: [] };
    itens.forEach(x => {
      if (x.aberta) g.registrar.push(x);
      else if (x.s === 'C' || x.s === 'J') g.feitas.push(x);
      else if (x.s === 'N') g.perdidas.push(x);
      else if (x.s === 'L') g.especiais.push(x);
      else if (x.s === 'A') g.proximas.push(x);
      else g.andamento.push(x);
    });
    const porPrazo = (a, b) => (a.prazo < b.prazo ? -1 : a.prazo > b.prazo ? 1 : a.t.org.localeCompare(b.t.org));
    g.registrar.sort(porPrazo);
    g.andamento.sort(porPrazo);
    g.proximas.sort((a, b) => (a.t.inicio < b.t.inicio ? -1 : 1));
    g.feitas.sort((a, b) => ((a.papel === 'A' ? a.t.dataA : a.t.dataS) > (b.papel === 'A' ? b.t.dataA : b.t.dataS) ? -1 : 1));
    g.perdidas.sort((a, b) => (a.prazo > b.prazo ? -1 : 1));
    g.especiais.sort((a, b) => (a.prazo > b.prazo ? -1 : 1));
    const proxAbre = g.andamento.filter(x => x.s === 'E').map(x => x.t.fim).sort()[0];
    // Justificativas usadas no mês, por função e faixa (só as faixas em que a pessoa está escalada).
    const doMes = itens.filter(x => !ehAnterior(x.t)), papeisMes = ['A', 'S'].filter(p => doMes.some(x => x.papel === p));
    // A função só aparece no rótulo quando a mesma faixa existe nas duas (ex.: responsável e fiscal de funções).
    const cotas = ['Semanal', 'Quinzenal', 'Mensal', 'Interpretacao'].flatMap(f => papeisMes.filter(p => doMes.some(x => x.papel === p && x.faixa === f)).map((p, i, l) => {
      const usadas = doMes.filter(x => x.papel === p && x.faixa === f && x.s === 'J').length, max = limiteJus(f);
      const qual = l.length > 1 ? ` (${f === 'Interpretacao' ? (p === 'A' ? 'responsável' : 'fiscal') : minuscula(PAPEL[p])})` : '';
      return `<span class="cota${usadas >= max ? ' cheia' : ''}">${FAIXA_CURTA[f]}${qual} <b>${usadas}/${max}</b></span>`;
    }));
    const linhaCotas = cotas.length ? `<div class="cotas"><span class="mr-1"><i class="fa-solid fa-file-lines mr-1.5"></i>Justificativas em ${esc(S.dados.mesNome)}</span>${cotas.join('')}</div>` : '';
    const tranquilo = `<div class="tranquilo"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>Nada para registrar agora.${proxAbre ? ` O próximo registro abre em <b class="font-semibold text-texto">${br(proxAbre)}</b>.` : ''}</span></div>`;
    const lista = l => `<ul class="lista">${l.map(itemLista).join('')}</ul>`;
    const cont = n => `<span class="contador">${n}</span>`;

    return cartao(`${cab}</div></div>
      <div class="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        ${kpi(g.registrar.length, 'Para registrar', 'fa-pen-to-square', g.registrar.length ? 'aviso' : '')}
        ${kpi(g.andamento.length, 'Em andamento', 'fa-clock')}
        ${kpi(g.feitas.length, 'Feitas', 'fa-check', g.feitas.length ? 'pos' : '')}
        ${kpi(g.perdidas.length, 'Não realizadas', 'fa-xmark', g.perdidas.length ? 'neg' : '')}
      </div>
      ${linhaCotas}
      <section class="mt-8">${secao('fa-pen-to-square', 'Para registrar agora', cont(g.registrar.length))}
        ${g.registrar.length ? `<div class="space-y-3">${g.registrar.map(cartaoTarefa).join('')}</div>` : tranquilo}
      </section>
      ${g.andamento.length ? `<section class="mt-8">${secao('fa-clock', 'Em andamento', cont(g.andamento.length))}<div class="space-y-3">${g.andamento.map(cartaoTarefa).join('')}</div></section>` : ''}
      ${g.proximas.length ? `<section class="mt-8">${secao('fa-calendar', 'Próximas', cont(g.proximas.length))}${lista(g.proximas)}</section>` : ''}
      ${g.feitas.length ? `<section class="mt-8">${secao('fa-check', 'Feitas', cont(g.feitas.length))}${lista(g.feitas)}</section>` : ''}
      ${g.perdidas.length ? `<section class="mt-8">${secao('fa-xmark', 'Não realizadas', cont(g.perdidas.length))}${lista(g.perdidas)}</section>` : ''}
      ${g.especiais.length ? `<section class="mt-8">${secao('fa-user-clock', 'Casos especiais', cont(g.especiais.length))}${lista(g.especiais)}</section>` : ''}`);
  };

  /* ==================================================================
     QUADRO
     ================================================================== */
  function legenda() {
    const itens = ['C', 'J', 'P', 'E', 'N', 'L', 'A'].map(s => `<span class="legenda-item">${st(s)}${STATUS[s].legenda}</span>`).join('');
    return `<div class="legenda">
      <div class="legenda-anatomia"><span class="par" aria-hidden="true"><span class="meia" data-s="C">${iconeSt('C')}</span><span class="meia" data-s="P">${iconeSt('P')}</span></span><span class="max-w-[250px]">Em cada quadro, <b>auditor</b> à esquerda e <b>agente supervisor</b> à direita.</span></div>
      <div class="legenda-itens">${itens}</div>
    </div>`;
  }

  function par(t) {
    const titulo = `Auditor ${t.auditor || 'sem nome'}: ${minuscula(STATUS[t.sa].A)}. Agente supervisor ${t.supervisor || 'sem nome'}: ${minuscula(STATUS[t.ss].S)}.`;
    const minha = sou(t.auditor) || sou(t.supervisor);
    return `<button type="button" class="par${minha ? ' minha' : ''}" data-acao="detalhe" data-chave="${esc(t.chave)}" title="${esc(titulo)}" aria-label="${esc(t.org + ', ' + rotuloPeriodo(t) + '. ' + titulo)}"><span class="meia" data-s="${t.sa}">${iconeSt(t.sa)}</span><span class="meia" data-s="${t.ss}">${iconeSt(t.ss)}</span></button>`;
  }

  PAINEIS.quadro = function () {
    const d = S.dados, h = hoje();
    const tipos = TIPOS.filter(tp => d.tarefas.some(t => t.tipo === tp));
    if (!tipos.length) return cartao(vazio('fa-table-cells', 'Sem tarefas neste mês', 'O quadro aparece quando houver escala e calendário para o mês.'));
    if (!tipos.includes(S.tipoQuadro)) S.tipoQuadro = tipos[0];
    const tipo = S.tipoQuadro;
    const periodos = d.periodos.filter(p => p.tipo === tipo);
    const linhas = new Map();
    d.tarefas.filter(t => t.tipo === tipo).forEach(t => {
      const k = normal(t.org);
      if (!linhas.has(k)) linhas.set(k, { org: t.org, grupo: t.grupo, t: {} });
      linhas.get(k).t[t.periodo] = t;
    });
    const ordem = d.cadastro.map(o => normal(o.nome));
    const pos = l => { const i = ordem.indexOf(normal(l.org)); return i < 0 ? 999 : i; };
    const grupoDe = l => orgDe(l.org).grupo || l.grupo;
    const lista = [...linhas.values()].sort((a, b) => (GRUPOS.indexOf(grupoDe(a)) - GRUPOS.indexOf(grupoDe(b))) || (pos(a) - pos(b)));
    const comNomes = periodos.length <= 2;
    let corpo = '', grupoAtual = '';
    lista.forEach(l => {
      const o = orgDe(l.org), g = grupoDe(l);
      if (g !== grupoAtual) {
        grupoAtual = g;
        corpo += `<tr class="linha-grupo"><td colspan="${periodos.length + 1}">${esc(g)}</td></tr>`;
      }
      const nicks = Object.values(l.t).flatMap(t => [t.auditor, t.supervisor]);
      const busca = normal([o.nome, o.sigla].concat(nicks).join(' '));
      const celulas = periodos.map(p => {
        const t = l.t[p.periodo], agora = p.inicio <= h && h <= p.fim;
        const nomes = t && comNomes ? `<span class="celula-nomes">${esc(t.auditor || 'sem auditor')} · ${esc(t.supervisor || 'sem agente')}</span>` : '';
        return `<td class="celula${agora ? ' agora' : ''}">${t ? par(t) + nomes : '<span class="text-musgo/50">·</span>'}</td>`;
      }).join('');
      corpo += `<tr data-busca="${esc(busca)}"><th scope="row" class="col-org"><span class="org" title="${esc(o.nome)}">${emblema(o)}<span class="org-nome${o.sigla ? ' hidden sm:block' : ''}">${esc(o.nome)}</span>${o.sigla ? `<span class="org-sigla">${esc(o.sigla)}</span>` : ''}</span></th>${celulas}</tr>`;
    });
    const cabecas = periodos.map(p => {
      const agora = p.inicio <= h && h <= p.fim;
      return `<th scope="col"${agora ? ' class="agora"' : ''}>${rotuloPeriodo(p)}<small>${intervaloCurto(p.inicio, p.fim)}</small>${agora ? '<span class="agora-tag">AGORA</span>' : ''}</th>`;
    }).join('');
    return cartao(`
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div><p class="kicker">Quadro</p><h2 class="painel-titulo">${esc(d.mesNome)}</h2></div>
        <label class="busca w-full sm:w-72"><span class="sr-only">Buscar</span><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" data-campo="busca-quadro" placeholder="Buscar organização ou nick" value="${esc(S.buscaQuadro)}" autocomplete="off" spellcheck="false"></label>
      </div>
      <div class="filtros mt-5" role="group" aria-label="Tipo de tarefa">${tipos.map(tp => `<button type="button" class="filtro" data-acao="tipo" data-tipo="${tp}" aria-pressed="${tp === tipo}"><i class="fa-solid ${TIPO[tp].icone}" aria-hidden="true"></i>${TIPO[tp].curto}</button>`).join('')}</div>
      ${legenda()}
      <div class="quadro"><table>
        <thead><tr><th scope="col" class="col-org">Organização</th>${cabecas}</tr></thead>
        <tbody data-busca-em="quadro">${corpo}</tbody>
      </table></div>
      <p class="vazio-texto mx-auto mt-6 text-center" data-sem-resultado="quadro" hidden>Nenhuma organização ou nick encontrado.</p>`);
  };

  // Filtra as linhas sem redesenhar (o campo de busca não perde o foco).
  function aplicarBuscas() {
    const q = normal(S.buscaQuadro);
    const corpo = el.conteudo.querySelector('[data-busca-em="quadro"]');
    if (corpo) {
      let grupo = null, vis = 0, total = 0;
      const fechar = () => { if (grupo) grupo.hidden = !vis; };
      [...corpo.rows].forEach(tr => {
        if (tr.classList.contains('linha-grupo')) { fechar(); grupo = tr; vis = 0; return; }
        const ok = !q || tr.dataset.busca.includes(q);
        tr.hidden = !ok;
        if (ok) { vis++; total++; }
      });
      fechar();
      const nada = el.conteudo.querySelector('[data-sem-resultado="quadro"]');
      if (nada) nada.hidden = total > 0;
    }
    const qe = normal(S.buscaEscala);
    const grupos = el.conteudo.querySelectorAll('[data-busca-grupo]');
    if (grupos.length) {
      let total = 0;
      grupos.forEach(g => {
        let vis = 0;
        g.querySelectorAll('[data-busca]').forEach(c => { const ok = !qe || c.dataset.busca.includes(qe); c.hidden = !ok; if (ok) vis++; });
        g.hidden = !vis;
        total += vis;
      });
      const nada = el.conteudo.querySelector('[data-sem-resultado="escala"]');
      if (nada) nada.hidden = total > 0;
    }
  }

  /* ---------- detalhe de uma tarefa ---------- */
  function acoesDe(t, papel) {
    const x = itemDe(t, papel), k = esc(t.chave), out = [];
    if (!sou(papel === 'A' ? t.auditor : t.supervisor) || S.sessao !== 'ok') return '';
    if (x.aberta) out.push(`<button type="button" class="btn-pri" data-acao="registrar" data-chave="${k}" data-papel="${papel}"><i class="fa-solid fa-pen-to-square"></i>${papel === 'A' ? 'Registrar' : 'Supervisionar'}</button>`);
    if (x.justifica) out.push(`<button type="button" class="btn-sec" data-acao="justificar" data-chave="${k}" data-papel="${papel}"><i class="fa-solid fa-file-lines"></i>Justificar</button>`);
    return out.length ? `<div class="mt-3 flex flex-wrap gap-2">${out.join('')}</div>` : '';
  }

  function abrirDetalhe(chave) {
    const t = IDX.tarefas.get(chave);
    if (!t) return;
    const bloco = papel => {
      const A = papel === 'A', nick = A ? t.auditor : t.supervisor, s = A ? t.sa : t.ss, data = A ? t.dataA : t.dataS, prazo = A ? t.prazoA : t.prazoS;
      const quando = s === 'C' || s === 'J' ? `${STATUS[s][papel]} em ${br(data)}` : s === 'A' ? `Começa em ${br(t.inicio)}` : `Prazo: ${br(prazo)}`;
      const extra = !A && t.prazoOk != null ? `<p class="mt-2.5 text-[12px] text-musgo"><i class="fa-solid ${t.prazoOk ? 'fa-circle-check text-af-400' : 'fa-circle-exclamation text-amber-500'} mr-1.5"></i>Postagem das medalhas ${t.prazoOk ? 'dentro do prazo' : 'fora do prazo'}</p>` : '';
      return `<div class="papel-bloco">
        <p class="text-[11px] font-semibold uppercase tracking-[.14em] text-musgo">${papelRotulo(t, papel)}</p>
        <div class="mt-2.5 flex items-center gap-3">${cabeca(nick)}<div class="min-w-0 flex-1"><p class="truncate text-[14px] font-semibold text-texto">${esc(nick || 'Sem nome na escala')}</p><p class="text-[12px] text-musgo">${esc(quando)}</p></div></div>
        <div class="mt-3">${pilula(s, papel)}</div>${extra}${acoesDe(t, papel)}
      </div>`;
    };
    const prazos = [ehCofre(t) && t.prazoC ? ['Cia/Subcia', t.prazoC] : null, [papelRotulo(t, 'A'), t.prazoA], [papelRotulo(t, 'S'), t.prazoS]].filter(Boolean);
    const link = linkTopico(t), F = ehFuncao(t);
    const descricao = F && t.funcao.descricao ? `<p class="text-[13.5px] leading-relaxed text-nevoa">${esc(t.funcao.descricao)}</p>` : '';
    const edicao = F && S.dados.editor && !ehAnterior(t) ? `<div class="flex flex-wrap gap-2"><button type="button" class="btn-sec" data-acao="editar-funcao" data-chave="${esc(t.chave)}"><i class="fa-solid fa-pen"></i>Editar função</button><button type="button" class="btn-sec" data-acao="cancelar-funcao" data-chave="${esc(t.chave)}"><i class="fa-solid fa-ban"></i>Cancelar função</button></div>` : '';
    abrirDialogo(`
      <div class="dialogo-cabeca">${emblemaDe(t, true)}<div class="min-w-0"><p class="kicker">${esc(TIPO[t.tipo].nome)}</p><h3 class="mt-1 text-[19px] font-semibold leading-tight text-texto">${esc(tituloDe(t))}</h3><p class="mt-1 text-[13px] text-musgo">${periodoDe(t)}</p></div>${botaoFechar()}</div>
      <div class="dialogo-corpo">
        ${descricao}
        <div class="grid gap-3 grid-cols-1 sm:grid-cols-2">${bloco('A')}${bloco('S')}</div>
        <div>${secao('fa-hourglass-half', 'Prazos')}<div class="grid grid-cols-1 gap-3 ${prazos.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}">${prazos.map(([r, dt]) => `<div class="papel-bloco py-3"><p class="text-[11px] font-semibold uppercase tracking-[.12em] text-musgo">${r}</p><p class="data-prazo mt-1">${br(dt)}${dt === hoje() ? '<span class="data-hoje">hoje</span>' : ''}</p><p class="data-dia">${DIAS[diaSemana(dt)]}</p></div>`).join('')}</div></div>
        ${link ? `<a class="btn-sec w-full" href="${esc(link)}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i>${t.tipo === 'Pesquisa' ? 'Abrir o tópico' : 'Abrir o cofre'}</a>` : ''}
        ${edicao}
      </div>`);
  }

  /* ==================================================================
     PRAZOS
     ================================================================== */
  const FASE = { futuro: 'Próximo', agora: 'Em andamento', prazos: 'Prazos correndo', fim: 'Encerrado' };
  function linhaPrazo(p, cia) {
    const h = hoje();
    const fase = h < p.inicio ? 'futuro' : h <= p.fim ? 'agora' : h <= p.prazoS ? 'prazos' : 'fim';
    const cel = (rotulo, data) => `<div><span class="rotulo-mobile">${rotulo}</span><p class="data-prazo">${br(data)}${data === h ? '<span class="data-hoje">hoje</span>' : ''}</p><p class="data-dia">${DIAS[diaSemana(data)]}</p></div>`;
    return `<div class="prazo-linha ${cia ? 'grade-3' : 'grade-2'}" data-fase="${fase}">
      <div class="periodo"><div class="flex flex-wrap items-center gap-2"><p class="text-[14px] font-semibold text-texto">${rotuloPeriodo(p)}</p><span class="fase" data-fase="${fase}">${FASE[fase]}</span></div><p class="mt-0.5 text-[13px] text-musgo">${intervalo(p.inicio, p.fim)}</p></div>
      ${cia ? cel('Cia/Subcia', p.prazoC) : ''}${cel('Auditor', p.prazoA)}${cel('Agente supervisor', p.prazoS)}
    </div>`;
  }
  function blocosPrazo(periodos, mesNome) {
    const defs = [
      { tipos: ['Semanal'], titulo: 'Cofres semanais', icone: 'fa-calendar-week', cia: true },
      { tipos: ['Quinzenal'], titulo: 'Cofres quinzenais', icone: 'fa-calendar-days', cia: true },
      { tipos: ['Mensal', 'Subgrupos'], titulo: 'Cofres mensais e de subgrupos', icone: 'fa-calendar', cia: true },
      { tipos: ['Pesquisa'], titulo: 'Dados de pesquisa', icone: 'fa-magnifying-glass-chart', cia: false }
    ];
    return defs.map(def => {
      const tipo = def.tipos.find(tp => periodos.some(p => p.tipo === tp));
      if (!tipo) return '';
      const lista = periodos.filter(p => p.tipo === tipo);
      const cols = `<div class="prazo-cols ${def.cia ? 'grade-3' : 'grade-2'}"><span>Período de referência</span>${def.cia ? '<span>Cia/Subcia</span>' : ''}<span>Auditor</span><span>Agente supervisor</span></div>`;
      return `<section class="bloco">
        <div class="bloco-cabeca"><span class="bloco-icone"><i class="fa-solid ${def.icone}" aria-hidden="true"></i></span><div class="min-w-0 flex-1"><h3 class="text-[14.5px] font-semibold text-texto">${def.titulo}</h3><p class="text-[12px] text-musgo">${esc(mesNome)} · ${plural(lista.length, 'período', 'períodos')}</p></div></div>
        ${cols}${lista.map(p => linhaPrazo(p, def.cia)).join('')}
      </section>`;
    }).join('');
  }
  function blocoFuncoes(lista, mesNome) {
    if (!lista.length) return '';
    const h = hoje();
    const cel = (rotulo, data) => `<div><span class="rotulo-mobile">${rotulo}</span><p class="data-prazo">${br(data)}${data === h ? '<span class="data-hoje">hoje</span>' : ''}</p><p class="data-dia">${DIAS[diaSemana(data)]}</p></div>`;
    const linhas = lista.slice().sort((a, b) => (a.prazoA < b.prazoA ? -1 : a.prazoA > b.prazoA ? 1 : 0)).map(t => {
      const fase = h < t.inicio ? 'futuro' : h <= t.prazoA ? 'agora' : h <= t.prazoS ? 'prazos' : 'fim';
      return `<div class="prazo-linha grade-2" data-fase="${fase}">
        <div class="periodo"><div class="flex flex-wrap items-center gap-2"><p class="text-[14px] font-semibold text-texto">${esc(t.funcao.titulo)}</p><span class="fase" data-fase="${fase}">${FASE[fase]}</span></div><p class="mt-0.5 text-[13px] text-musgo">${periodoDe(t)}</p></div>
        ${cel('Responsável', t.prazoA)}${cel('Fiscal', t.prazoS)}
      </div>`;
    }).join('');
    return `<section class="bloco">
      <div class="bloco-cabeca"><span class="bloco-icone"><i class="fa-solid fa-chart-pie" aria-hidden="true"></i></span><div class="min-w-0 flex-1"><h3 class="text-[14.5px] font-semibold text-texto">Interpretação de dados</h3><p class="text-[12px] text-musgo">${esc(mesNome)} · ${plural(lista.length, 'função', 'funções')}</p></div></div>
      <div class="prazo-cols grade-2"><span>Função</span><span>Responsável</span><span>Fiscal</span></div>${linhas}
    </section>`;
  }

  PAINEIS.prazos = function () {
    const d = S.dados;
    if (!d.periodos.length) return cartao(vazio('fa-calendar-days', 'Sem calendário neste mês', 'Os períodos aparecem quando o calendário do mês for gerado na planilha.'));
    const ant = d.anteriores && d.anteriores.periodos.length
      ? `<div class="mt-6 space-y-4"><p class="text-[13px] font-semibold text-texto"><i class="fa-solid fa-clock-rotate-left mr-2 text-af-400"></i>Ainda correm prazos de ${esc(d.anteriores.mesNome)}</p>${blocosPrazo(d.anteriores.periodos, d.anteriores.mesNome)}</div>` : '';
    return cartao(`
      <div><p class="kicker">Prazos</p><h2 class="painel-titulo">Períodos de referência</h2><p class="painel-sub">${esc(d.mesNome)}</p></div>
      ${ant}
      <div class="mt-6 space-y-4">${blocosPrazo(d.periodos, d.mesNome)}${blocoFuncoes(d.tarefas.filter(ehFuncao), d.mesNome)}</div>`);
  };

  /* ==================================================================
     ESCALAS
     ================================================================== */
  const chaveLinha = (org, tipo) => normal(org) + '|' + tipo;
  function mapaVersao(v) {
    const m = new Map();
    (v ? v.linhas : []).forEach(l => m.set(chaveLinha(l.org, l.tipo), l));
    return m;
  }
  const versoesPublicadas = () => { const e = S.dados.escalas; return [e.vigente].concat(e.futuras).filter(Boolean); };
  function porGrupo(fnLinhas) {
    // Organizações do cadastro, na ordem da planilha, separadas por grupo.
    return GRUPOS.map(g => ({ grupo: g, orgs: S.dados.cadastro.filter(o => o.grupo === g).map(o => ({ o, linhas: fnLinhas(o) })).filter(x => x.linhas.length) }))
      .filter(x => x.orgs.length);
  }

  PAINEIS.escalas = function () {
    const d = S.dados, vers = versoesPublicadas();
    if (!vers.length) return cartao(vazio('fa-users', 'Nenhuma escala publicada', d.editor ? 'Publique a primeira escala na aba Editar escala.' : 'A escala aparece aqui assim que for publicada.'));
    const v = vers.find(x => x.vigencia === S.versaoEscala) || vers[0];
    const atual = d.escalas.vigente, comparar = atual && v !== atual ? mapaVersao(atual) : null;
    const mapa = mapaVersao(v);
    const seletor = vers.length > 1 ? `<div class="filtros mt-5" role="group" aria-label="Escala">${vers.map(x => `<button type="button" class="filtro" data-acao="versao" data-vigencia="${x.vigencia}" aria-pressed="${x === v}"><i class="fa-solid ${x === atual ? 'fa-circle-check' : 'fa-calendar-plus'}" aria-hidden="true"></i>${x === atual ? 'Em vigor' : 'A partir de ' + br(x.vigencia)}</button>`).join('')}</div>` : '';
    const nick = (n, antes) => {
      const mudou = comparar && chaveNick(n) !== chaveNick(antes);
      const cls = 'nick' + (sou(n) ? ' eu' : '') + (!n ? ' vazio' : '') + (mudou ? ' mudou' : '');
      const fora = d.editor && foraDaListagem(n) ? '<i class="fa-solid fa-user-slash fora-lista" title="Fora da listagem de membros" aria-label="Fora da listagem de membros"></i>' : '';
      return `<span class="${cls}"${mudou ? ` title="${esc('Antes: ' + (antes || 'sem nome'))}"` : ''}>${mudou ? '<i class="fa-solid fa-arrow-right-arrow-left mr-1.5 text-[10px]"></i>' : ''}${esc(n || 'sem nome')}${fora}</span>`;
    };
    const grupos = porGrupo(o => o.tipos.map(tp => mapa.get(chaveLinha(o.nome, tp))).filter(Boolean));
    const html = grupos.map(g => `<section class="mt-7" data-busca-grupo>
      ${secao('fa-shield-halved', esc(g.grupo), `<span class="contador">${plural(g.orgs.length, 'organização', 'organizações')}</span>`)}
      <div class="grid gap-3 grid-cols-1 lg:grid-cols-2">${g.orgs.map(({ o, linhas }) => {
        const busca = normal([o.nome, o.sigla].concat(linhas.flatMap(l => [l.auditor, l.supervisor])).join(' '));
        return `<article class="org-cartao" data-busca="${esc(busca)}">
          <div class="org-cartao-cabeca">${emblema(o)}<div class="min-w-0"><p class="truncate text-[14px] font-semibold text-texto">${esc(o.nome)}</p><p class="text-[11.5px] text-musgo">${esc(o.sigla || o.grupo)}</p></div></div>
          <div class="escala-linha escala-cab"><span>Tipo</span><span>Auditor</span><span>Agente supervisor</span></div>
          ${linhas.map(l => { const a = comparar && comparar.get(chaveLinha(l.org, l.tipo)); return `<div class="escala-linha"><span class="flex min-w-0 items-center gap-2 text-[12.5px] font-medium text-musgo"><i class="fa-solid ${TIPO[l.tipo].icone} w-4 shrink-0 text-center text-af-400" aria-hidden="true"></i><span class="leading-tight">${esc(TIPO[l.tipo].curto)}</span></span>${nick(l.auditor, a ? a.auditor : l.auditor)}${nick(l.supervisor, a ? a.supervisor : l.supervisor)}</div>`; }).join('')}
        </article>`;
      }).join('')}</div>
    </section>`).join('');
    const avisos = d.editor && d.avisos.length ? `<div class="mt-5">${aviso('aviso', 'fa-triangle-exclamation', 'Pontos de atenção na escala:', d.avisos.join(' '))}</div>` : '';
    const sobre = v === atual ? `Em vigor desde ${br(v.vigencia)}` : `Vale a partir de ${br(v.vigencia)}`;
    return cartao(`
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div><p class="kicker">Escalas</p><h2 class="painel-titulo">${v === atual ? 'Escala em vigor' : 'Próxima escala'}</h2><p class="painel-sub">${sobre}${v.por === 'Importação' ? ' · importada da escala antiga' : v.por ? ` · publicada por ${esc(v.por)}` : ''}</p></div>
        <label class="busca w-full sm:w-72"><span class="sr-only">Buscar</span><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" data-campo="busca-escala" placeholder="Buscar organização ou nick" value="${esc(S.buscaEscala)}" autocomplete="off" spellcheck="false"></label>
      </div>
      ${seletor}${avisos}${html}
      <p class="vazio-texto mx-auto mt-6 text-center" data-sem-resultado="escala" hidden>Nenhuma organização ou nick encontrado.</p>`);
  };

  /* ==================================================================
     DESEMPENHO
     ================================================================== */
  const metaDe = () => (S.dados && S.dados.desempenho && S.dados.desempenho.meta) || 50;
  const tomDe = x => (x == null ? '' : x >= 90 ? '' : x >= metaDe() ? 'aviso' : 'neg');
  const contadas = x => x.concluidas + x.justificadas + x.naoConcluidas + (x.especiais || 0);
  function resumoPct(x) {
    const partesTxt = [`${x.concluidas} de ${contadas(x)} contadas`];
    if (x.justificadas) partesTxt.push(plural(x.justificadas, 'justificada', 'justificadas'));
    if (x.especiais) partesTxt.push(plural(x.especiais, 'caso especial', 'casos especiais'));
    if (x.emAberto) partesTxt.push(`${x.emAberto} em aberto`);
    return partesTxt.join(' · ');
  }
  function kpiPct(rotulo, x, icone) {
    const w = x.porcentagem == null ? 0 : x.porcentagem;
    return `<div class="kpi">
      <p class="kpi-rotulo mt-0"><i class="fa-solid ${icone}" aria-hidden="true"></i>${rotulo}</p>
      <p class="kpi-valor mt-2 text-[42px]">${x.porcentagem == null ? '<span class="text-musgo">sem base</span>' : pct(x.porcentagem)}</p>
      <span class="barra mt-3" data-tom="${tomDe(x.porcentagem)}"><span style="width:${w}%"></span></span>
      <p class="mt-2.5 text-[12px] text-musgo">${resumoPct(x)}</p>
    </div>`;
  }
  const textoPct = p => (p.porcentagem != null ? pct(p.porcentagem) : 'em aberto');
  const papelDe = papel => (papel === 'A' ? 'auditores' : 'agentes');
  const porNick = (a, b) => a.p.nick.localeCompare(b.p.nick, 'pt-BR', { sensitivity: 'base' }) || a.papel.localeCompare(b.papel);

  // Cada pessoa do mês com a função em que foi avaliada, separada por caso.
  function casosDo(de) {
    const todos = de.auditores.pessoas.map(p => ({ p, papel: 'A' })).concat(de.agentes.pessoas.map(p => ({ p, papel: 'S' })));
    const por = c => todos.filter(x => x.p.caso === c).sort(porNick);
    return {
      todos,
      positivo: por('positivo').sort((a, b) => b.p.medalhas - a.p.medalhas || porNick(a, b)),
      negativo: por('negativo'), especial: por('especial'), aberto: por('aberto'), sem: por('sem')
    };
  }
  const periodoLicenca = l => (partes(l.inicio).y === partes(l.fim).y ? intervaloCurto(l.inicio, l.fim) : intervalo(l.inicio, l.fim));
  // Por que a pessoa é caso especial: licença no mês, RL ou período marcado como caso especial (CE).
  function motivosEspecial(p, comCE) {
    const out = [];
    if (p.licenca) out.push(`Licença ${periodoLicenca(p.licenca)}`);
    if (p.rl) out.push('RL');
    if (comCE !== false && p.especiais) out.push(plural(p.especiais, 'período em CE', 'períodos em CE'));
    return out;
  }
  function medalhaDe(p) {
    if (p.caso === 'positivo') return `<span class="medalha"><i class="fa-solid fa-medal" aria-hidden="true"></i>+${p.medalhas}</span>`;
    if (p.caso === 'negativo') return `<span class="medalha neg"><i class="fa-solid fa-medal" aria-hidden="true"></i>${p.medalhas}</span>`;
    if (p.caso === 'especial') return '<span class="medalha esp"><i class="fa-solid fa-medal" aria-hidden="true"></i>0</span>';
    return '<span class="medalha zero"><i class="fa-solid fa-medal" aria-hidden="true"></i>0</span>';
  }
  const cargoDe = p => (p.naListagem ? p.cargo : listagemOk() ? 'Fora da listagem de membros' : '');
  const PAPEL_LISTAGEM = { A: 'auditor', S: 'agente' };
  // Função em que a pessoa foi avaliada e, quando o cargo na listagem é outro, o cargo.
  function funcaoDe(p, papel) {
    const m = naListagem(p.nick), extra = m ? (m.papel !== PAPEL_LISTAGEM[papel] ? m.cargo : '') : listagemOk() ? 'fora da listagem' : '';
    return `<span class="funcao"><i class="fa-solid ${papel === 'A' ? 'fa-user-shield' : 'fa-binoculars'}" aria-hidden="true"></i>${PAPEL[papel]}${extra ? ' · ' + esc(extra) : ''}</span>`;
  }
  function celulaPessoa(p, papel) {
    const motivos = p.caso === 'especial' ? motivosEspecial(p).map(m => `<span class="motivo-esp">${esc(m)}</span>`).join('') : '';
    return `<span class="flex items-center gap-2.5">${cabeca(p.nick)}<span class="min-w-0"><span class="block font-semibold ${sou(p.nick) ? 'text-af-300' : 'text-texto'}">${esc(p.nick)}</span><span class="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-musgo">${funcaoDe(p, papel)}${motivos}</span></span></span>`;
  }
  const cabecaCaso = (caso, n) => `<h3 class="secao caso-cab" data-caso="${caso}"><span class="secao-num"><i class="fa-solid ${CASOS[caso].icone}" aria-hidden="true"></i></span>${CASOS[caso].titulo}<span class="secao-linha"></span><span class="contador">${plural(n, 'pessoa', 'pessoas')}</span></h3>`;

  function tabelaCaso(caso, itens) {
    if (!itens.length) return `<section class="mt-9">${cabecaCaso(caso, 0)}<p class="rounded-2xl border border-dashed border-realce/10 px-4 py-4 text-[13px] text-musgo">${CASOS[caso].vazio}</p></section>`;
    const comCE = itens.some(x => x.p.especiais), comAberto = itens.some(x => x.p.emAberto);
    const linhas = itens.map(({ p, papel }) => `<tr data-acao="pessoa" data-nick="${esc(p.nick)}" data-papel="${papel}" tabindex="0">
      <td>${celulaPessoa(p, papel)}</td>
      <td class="num">${p.escalado}</td><td class="num">${p.concluidas}</td><td class="num">${p.justificadas}</td><td class="num">${p.naoConcluidas}</td>${comCE ? `<td class="num">${p.especiais}</td>` : ''}${comAberto ? `<td class="num">${p.emAberto}</td>` : ''}
      <td><span class="aproveitamento"><span class="barra" data-tom="${tomDe(p.porcentagem)}"><span style="width:${p.porcentagem || 0}%"></span></span><span class="w-[64px] text-right text-[12.5px] font-semibold text-texto">${textoPct(p)}</span></span></td>
      <td class="num">${medalhaDe(p)}</td>
    </tr>`).join('');
    return `<section class="mt-9">${cabecaCaso(caso, itens.length)}
      <div class="tabela-caixa"><table class="tabela">
        <thead><tr><th>Policial</th><th class="num">Escalado</th><th class="num">Concluídas</th><th class="num">Justificadas</th><th class="num">Não concluídas</th>${comCE ? '<th class="num" title="Períodos em caso especial">CE</th>' : ''}${comAberto ? '<th class="num">Em aberto</th>' : ''}<th>Aproveitamento</th><th class="num">Medalhas</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table></div>
    </section>`;
  }

  function listaNicks(titulo, icone, itens) {
    if (!itens.length) return '';
    const chips = itens.map(({ p, papel }) => `<button type="button" class="nick-chip" data-acao="pessoa" data-nick="${esc(p.nick)}" data-papel="${papel}">${cabeca(p.nick)}<span class="font-semibold text-texto">${esc(p.nick)}</span><span class="text-[11px] text-musgo">${PAPEL[papel]}</span></button>`).join('');
    return `<section class="mt-9">${secao(icone, titulo, `<span class="contador">${plural(itens.length, 'pessoa', 'pessoas')}</span>`)}<div class="flex flex-wrap gap-2">${chips}</div></section>`;
  }

  function distribuicao(c) {
    const bloco = (titulo, papel) => {
      const m = new Map();
      c.positivo.concat(c.negativo).filter(x => x.papel === papel).forEach(({ p }) => { if (!m.has(p.medalhas)) m.set(p.medalhas, []); m.get(p.medalhas).push(p.nick); });
      if (!m.size) return '';
      const grupos = [...m.entries()].sort((a, b) => b[0] - a[0]);
      const linha = ([n, nicks]) => {
        const lista = nicks.join(' / ');
        return `<div class="distribuicao"><span class="medalha${n < 0 ? ' neg' : ''}"><i class="fa-solid fa-medal" aria-hidden="true"></i>${n > 0 ? '+' + n : n}</span><span class="min-w-0 flex-1 text-[13px] text-nevoa">${esc(lista)}</span><button type="button" class="btn-mini" data-acao="copiar" data-texto="${esc(lista)}" title="Copiar os nicks"><i class="fa-regular fa-copy"></i>Copiar</button></div>`;
      };
      const parte = (rotulo, l) => (l.length ? `<div class="dist-parte"><p class="dist-titulo">${rotulo}</p>${l.map(linha).join('')}</div>` : '');
      return `<div class="papel-bloco"><p class="mb-3 text-[12px] font-semibold uppercase tracking-[.14em] text-texto">${titulo}</p>${parte('Cumprimento de meta', grupos.filter(g => g[0] > 0))}${parte('Não cumprimento de meta', grupos.filter(g => g[0] < 0))}</div>`;
    };
    const blocos = bloco('Auditores', 'A') + bloco('Agentes supervisores', 'S');
    return blocos ? `<section class="mt-9">${secao('fa-medal', 'Distribuição de medalhas')}<div class="grid gap-3 grid-cols-1 lg:grid-cols-2">${blocos}</div></section>` : '';
  }

  PAINEIS.desempenho = function () {
    const d = S.dados, de = d.desempenho;
    if (!de || !de.total.escalado) return cartao(vazio('fa-chart-simple', 'Sem tarefas neste mês', 'O desempenho aparece quando houver tarefas escaladas no mês.'));
    const c = casosDo(de);
    const estado = de.final
      ? '<span class="pilula" data-s="C"><i class="fa-solid fa-flag-checkered"></i>Mês fechado</span>'
      : `<span class="pilula" data-s="P"><i class="fa-solid fa-hourglass-half"></i>Parcial: ${plural(de.total.emAberto, 'tarefa em aberto', 'tarefas em aberto')}</span>`;
    const botao = d.editor ? '<button type="button" class="btn-pri" data-acao="relatorio"><i class="fa-solid fa-code"></i>Gerar BBCode do relatório</button>' : '';
    const semListagem = de.listagem ? '' : `<div class="mt-5">${aviso('aviso', 'fa-address-book', 'Listagem de membros indisponível.', 'Licenças e RL ficaram de fora desta classificação.')}</div>`;
    const kpiCaso = caso => `<div class="caso-kpi" data-caso="${caso}"><p class="caso-kpi-valor">${c[caso].length}</p><p class="kpi-rotulo"><i class="fa-solid ${CASOS[caso].icone}" aria-hidden="true"></i>${c[caso].length === 1 ? CASOS[caso].um : CASOS[caso].titulo}</p></div>`;
    return cartao(`
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div><p class="kicker">Desempenho</p><h2 class="painel-titulo">${esc(d.mesNome)}</h2><p class="painel-sub">${plural(de.total.escalado, 'tarefa escalada', 'tarefas escaladas')} entre auditores e agentes supervisores · meta de ${de.meta}%</p></div>
        <div class="flex flex-wrap items-center gap-2.5">${estado}${botao}</div>
      </div>
      ${semListagem}
      <div class="mt-6 grid gap-3 grid-cols-1 md:grid-cols-3">
        ${kpiPct('Auditoria Fiscal', de.total, 'fa-scale-balanced')}
        ${kpiPct('Auditores', de.auditores.geral, 'fa-user-shield')}
        ${kpiPct('Agentes supervisores', de.agentes.geral, 'fa-binoculars')}
      </div>
      <div class="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-3">${kpiCaso('positivo')}${kpiCaso('negativo')}${kpiCaso('especial')}</div>
      ${tabelaCaso('positivo', c.positivo)}
      ${tabelaCaso('negativo', c.negativo)}
      ${tabelaCaso('especial', c.especial)}
      ${listaNicks('Aguardando o fim dos prazos', 'fa-hourglass-half', c.aberto)}
      ${listaNicks('Sem escala no mês', 'fa-user-minus', c.sem)}
      ${distribuicao(c)}`);
  };

  const SITUACAO_CASO = { positivo: ['C', 'Caso positivo'], negativo: ['N', 'Caso negativo'], especial: ['L', 'Caso especial'], aberto: ['P', 'Aguardando o fim dos prazos'], sem: ['A', 'Sem escala no mês'] };
  function abrirPessoa(nick, papel) {
    const d = S.dados, A = papel === 'A';
    const p = d.desempenho[papelDe(papel)].pessoas.find(x => chaveNick(x.nick) === chaveNick(nick));
    if (!p) return;
    const k = chaveNick(nick), comoA = t => chaveNick(t.auditor) === k && contaEm(t, 'A') === papel, comoS = t => chaveNick(t.supervisor) === k && contaEm(t, 'S') === papel;
    const lista = d.tarefas.filter(t => comoA(t) || comoS(t));
    const [sCaso, rotuloCaso] = SITUACAO_CASO[p.caso] || SITUACAO_CASO.sem;
    const motivos = p.caso === 'especial' ? motivosEspecial(p).map(m => `<span class="motivo-esp">${esc(m)}</span>`).join('') : '';
    const sub = [cargoDe(p), d.mesNome].filter(Boolean).join(' · ');
    const kpis = [kpi(p.escalado, 'Escalado', 'fa-list'), kpi(p.concluidas, A ? 'Concluídas' : 'Realizadas', 'fa-check', 'pos'), kpi(p.justificadas, 'Justificadas', 'fa-file-lines'),
      kpi(p.naoConcluidas, 'Não realizadas', 'fa-xmark', p.naoConcluidas ? 'neg' : '')].concat(p.especiais ? [kpi(p.especiais, 'Casos especiais', 'fa-user-clock')] : []);
    abrirDialogo(`
      <div class="dialogo-cabeca">${cabeca(nick, true)}<div class="min-w-0"><p class="kicker">${PAPEL[papel]}</p><h3 class="mt-1 truncate text-[19px] font-semibold leading-tight text-texto">${esc(p.nick)}</h3><p class="mt-1 text-[13px] text-musgo">${esc(sub)}</p></div>${botaoFechar()}</div>
      <div class="dialogo-corpo">
        <div class="flex flex-wrap items-center gap-2"><span class="pilula" data-s="${sCaso}">${iconeSt(sCaso)}${esc(rotuloCaso)}</span>${motivos}</div>
        ${p.escalado ? `<div class="grid grid-cols-2 gap-3 ${kpis.length > 4 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}">${kpis.join('')}</div>
        <div class="flex flex-wrap items-center gap-3"><span class="aproveitamento flex-1"><span class="barra" data-tom="${tomDe(p.porcentagem)}"><span style="width:${p.porcentagem || 0}%"></span></span><span class="text-[13px] font-semibold text-texto">${textoPct(p)}</span></span>${medalhaDe(p)}</div>
        <ul class="lista">${lista.map(t => itemLista(itemDe(t, comoA(t) ? 'A' : 'S'))).join('')}</ul>` : vazio('fa-calendar-xmark', 'Sem escala neste mês', 'Não há tarefas com este nick no mês.')}
      </div>`);
  }

  /* ==================================================================
     EDITAR ESCALA
     ================================================================== */
  function proximoDomingo() {
    const h = hoje(), dow = diaSemana(h);
    return dow === 0 ? h : somarDias(h, 7 - dow);
  }
  function opcoesVigencia() {
    const h = hoje(), dom = proximoDomingo(), e = S.dados.escalas, ops = [];
    ops.push({ valor: dom, rotulo: dom === h ? 'Hoje (domingo)' : 'Próximo domingo', sub: br(dom) });
    e.futuras.forEach(f => { if (f.vigencia !== dom) ops.push({ valor: f.vigencia, rotulo: 'Escala já publicada', sub: 'a partir de ' + br(f.vigencia) }); });
    if (e.vigente && e.vigente.vigencia < h) ops.push({ valor: e.vigente.vigencia, rotulo: 'Corrigir a escala em vigor', sub: 'desde ' + br(e.vigente.vigencia) });
    ops.push({ valor: 'outra', rotulo: 'Outra data', sub: 'escolher no calendário' });
    return ops;
  }
  function garantirEdicao() {
    if (!S.ed) S.ed = { escolha: proximoDomingo(), outra: '', valores: {} };
    const ops = opcoesVigencia().map(o => o.valor);
    if (!ops.includes(S.ed.escolha)) S.ed.escolha = ops[0];
  }
  const vigenciaEd = () => (S.ed.escolha === 'outra' ? S.ed.outra : S.ed.escolha);
  function baseEm(data) {
    let b = null;
    versoesPublicadas().forEach(v => { if (data && v.vigencia <= data) b = v; });
    return b;
  }
  function linhasEditor() {
    const out = [];
    porGrupo(o => o.tipos).forEach(g => g.orgs.forEach(({ o }) => o.tipos.forEach(tipo => out.push({ k: chaveLinha(o.nome, tipo), org: o.nome, tipo, grupo: g.grupo }))));
    return out;
  }
  const vazioLinha = { auditor: '', supervisor: '' };
  const valorEd = (k, base) => S.ed.valores[k] || base || vazioLinha;
  function alteracoes() {
    if (!S.ed || !S.dados) return [];
    const base = mapaVersao(baseEm(vigenciaEd())), out = [];
    linhasEditor().forEach(l => {
      const b = base.get(l.k) || vazioLinha, v = valorEd(l.k, b);
      ['auditor', 'supervisor'].forEach(campo => {
        if (chaveNick(v[campo]) !== chaveNick(b[campo])) out.push({ org: l.org, tipo: l.tipo, campo, antes: b[campo] || '', depois: limparNome(v[campo]) });
      });
    });
    return out;
  }

  PAINEIS.editar = function () {
    const d = S.dados;
    if (!d.editor) return cartao(vazio('fa-lock', 'Edição restrita', 'Só Secretário(a), Vice-Diretor(a)-Geral e Diretor(a)-Geral editam a escala.'));
    garantirEdicao();
    const vig = vigenciaEd(), base = baseEm(vig), mapa = mapaVersao(base), ops = opcoesVigencia();
    const sobre = !vig ? 'Escolha a data em que a escala passa a valer.'
      : base ? `Partindo da escala ${base === d.escalas.vigente ? 'em vigor' : 'publicada'} desde ${br(base.vigencia)}.` : 'Ainda não há escala publicada para esta data.';
    const campo = (l, b, v, nome, rotulo) => {
      const mudou = chaveNick(v[nome]) !== chaveNick(b[nome]);
      const fora = foraDaListagem(limparNome(v[nome]));
      return `<label class="block min-w-0"><span class="rotulo-mobile">${rotulo}</span><input class="ed-campo${mudou ? ' mudou' : ''}" data-k="${esc(l.k)}" data-papel="${nome}" list="membros" value="${esc(v[nome])}" placeholder="${rotulo}" autocomplete="off" spellcheck="false" maxlength="60" aria-label="${esc(rotulo + ' de ' + l.org + ', ' + TIPO[l.tipo].curto)}"><span class="ed-antes" data-antes="${esc(l.k)}|${nome}"${mudou ? '' : ' hidden'}>antes: ${esc(b[nome] || 'vazio')}</span><span class="ed-fora" data-fora="${esc(l.k)}|${nome}"${fora ? '' : ' hidden'}><i class="fa-solid fa-user-slash mr-1" aria-hidden="true"></i>fora da listagem de membros</span></label>`;
    };
    const grupos = porGrupo(o => o.tipos).map(g => `<section class="mt-6">
      <p class="mb-2.5 text-[10.5px] font-bold uppercase tracking-[.2em] text-musgo">${esc(g.grupo)}</p>
      <div class="grid gap-3 grid-cols-1 xl:grid-cols-2">${g.orgs.map(({ o }) => `<div class="ed-org">
        <div class="mb-2 flex items-center gap-3">${emblema(o)}<p class="min-w-0 truncate text-[14px] font-semibold text-texto">${esc(o.nome)}</p>${o.sigla ? `<span class="org-sigla">${esc(o.sigla)}</span>` : ''}</div>
        <div class="ed-cols"><span>Tipo</span><span>Auditor</span><span>Agente supervisor</span></div>
        ${o.tipos.map(tipo => { const l = { k: chaveLinha(o.nome, tipo), org: o.nome, tipo }; const b = mapa.get(l.k) || vazioLinha, v = valorEd(l.k, b); return `<div class="ed-linha"><span class="ed-tipo"><i class="fa-solid ${TIPO[tipo].icone}" aria-hidden="true"></i>${esc(TIPO[tipo].curto)}</span>${campo(l, b, v, 'auditor', 'Auditor')}${campo(l, b, v, 'supervisor', 'Agente supervisor')}</div>`; }).join('')}
      </div>`).join('')}</div>
    </section>`).join('');
    const avisos = d.avisos.length ? `<div class="mt-5">${aviso('aviso', 'fa-triangle-exclamation', 'Pontos de atenção na escala em vigor:', d.avisos.join(' '))}</div>` : '';
    const desligada = d.edicaoLiberada ? '' : `<div class="mt-5">${aviso('aviso', 'fa-lock', 'Publicação desligada.', 'Preencha SENHA_EDICAO na aba [DC] Configurações da planilha para publicar por aqui.')}</div>`;
    return cartao(`
      <div><p class="kicker">Edição</p><h2 class="painel-titulo">Editar escala</h2><p class="painel-sub" id="ed-sobre">${esc(sobre)}</p></div>
      ${desligada}${avisos}
      <section class="mt-7">${secao('fa-calendar-check', 'Vale a partir de')}
        <div class="ed-opcoes" role="radiogroup" aria-label="Vale a partir de">${ops.map(o => `<label class="ed-opcao"><input type="radio" name="vigencia" value="${o.valor}" class="sr-only"${o.valor === S.ed.escolha ? ' checked' : ''}><b>${o.rotulo}</b><span>${o.sub}</span></label>`).join('')}</div>
        <div class="mt-3 max-w-[240px]"${S.ed.escolha === 'outra' ? '' : ' hidden'}><input type="date" class="campo" data-campo="vigencia-outra" min="${hoje()}" value="${esc(S.ed.outra)}" aria-label="Data em que a escala passa a valer"></div>
      </section>
      <section class="mt-7">${secao('fa-right-left', 'Trocar um nome em toda a escala')}
        <div class="grid gap-3 grid-cols-1 sm:grid-cols-[1fr_1fr_auto]">
          <input class="campo py-2.5" data-campo="troca-de" list="membros" placeholder="Nick atual" autocomplete="off" spellcheck="false" aria-label="Nick atual">
          <input class="campo py-2.5" data-campo="troca-para" list="membros" placeholder="Novo nick" autocomplete="off" spellcheck="false" aria-label="Novo nick">
          <button type="button" class="btn-sec" data-acao="trocar"><i class="fa-solid fa-right-left"></i>Trocar</button>
        </div>
      </section>
      <section class="mt-7">${secao('fa-users', 'Escala')}${grupos}</section>
      <div class="barra-publicar" id="ed-barra">${barraPublicar()}</div>`);
  };

  function barraPublicar() {
    const n = alteracoes().length, liberada = S.dados.edicaoLiberada;
    return `<p class="text-[13px] text-musgo"><i class="fa-solid ${n ? 'fa-pen' : 'fa-circle-check'} mr-2 ${n ? 'text-amber-500' : 'text-af-400'}"></i>${n ? `<b class="font-semibold text-texto">${plural(n, 'alteração', 'alterações')}</b> para publicar` : 'Nenhuma alteração'}</p>
      <div class="flex flex-wrap gap-2"><button type="button" class="btn-sec" data-acao="descartar"${n ? '' : ' disabled'}><i class="fa-solid fa-rotate-left"></i>Descartar</button><button type="button" class="btn-pri" data-acao="publicar"${n && liberada ? '' : ' disabled'}><i class="fa-solid fa-paper-plane"></i>Revisar e publicar</button></div>`;
  }

  function digitarEdicao(input) {
    const k = input.dataset.k, papel = input.dataset.papel;
    const base = mapaVersao(baseEm(vigenciaEd())).get(k) || vazioLinha;
    const atual = Object.assign({}, valorEd(k, base));
    atual[papel] = input.value;
    S.ed.valores[k] = atual;
    const mudou = chaveNick(atual[papel]) !== chaveNick(base[papel]);
    input.classList.toggle('mudou', mudou);
    const antes = el.conteudo.querySelector(`[data-antes="${CSS.escape(k + '|' + papel)}"]`);
    if (antes) antes.hidden = !mudou;
    const fora = el.conteudo.querySelector(`[data-fora="${CSS.escape(k + '|' + papel)}"]`);
    if (fora) fora.hidden = !foraDaListagem(limparNome(input.value));
    const barra = $('ed-barra');
    if (barra) definirHtml(barra, barraPublicar());
  }

  function trocarNome() {
    const de = limparNome((el.conteudo.querySelector('[data-campo="troca-de"]') || {}).value);
    const para = limparNome((el.conteudo.querySelector('[data-campo="troca-para"]') || {}).value);
    if (!de) { toast('Informe o nick atual.', 'erro'); return; }
    const base = mapaVersao(baseEm(vigenciaEd()));
    let n = 0;
    linhasEditor().forEach(l => {
      const v = Object.assign({}, valorEd(l.k, base.get(l.k)));
      let mexeu = false;
      ['auditor', 'supervisor'].forEach(c => { if (chaveNick(v[c]) === chaveNick(de)) { v[c] = para; mexeu = true; n++; } });
      if (mexeu) S.ed.valores[l.k] = v;
    });
    toast(n ? `${plural(n, 'troca feita', 'trocas feitas')}.` : 'Nenhuma linha com esse nick.', n ? '' : 'erro');
    if (n) renderConteudo();
  }

  async function descartarEdicao() {
    const ok = await confirmar('Descartar alterações', 'As alterações feitas nesta escala serão perdidas.', 'Descartar');
    if (!ok) return;
    S.ed.valores = {};
    renderConteudo();
  }

  function abrirPublicar() {
    const muds = alteracoes(), vig = vigenciaEd();
    if (!muds.length) return;
    if (!vig) { toast('Escolha a data em que a escala passa a valer.', 'erro'); return; }
    const correcao = S.dados.escalas.vigente && vig === S.dados.escalas.vigente.vigencia && vig < hoje();
    if (vig < hoje() && !correcao) { toast('A escala precisa valer a partir de hoje.', 'erro'); return; }
    const lista = muds.slice(0, 40).map(m => `<li class="mudanca"><b class="font-semibold text-texto">${esc(m.org)}</b><span class="text-musgo">${esc(TIPO[m.tipo].curto)} · ${m.campo === 'auditor' ? 'Auditor' : 'Agente supervisor'}</span><span class="w-full text-[12.5px]"><span class="text-musgo line-through">${esc(m.antes || 'vazio')}</span><i class="fa-solid fa-arrow-right mx-2 text-[10px] text-musgo"></i><b class="font-semibold text-af-300">${esc(m.depois || 'vazio')}</b></span></li>`).join('');
    const mais = muds.length > 40 ? `<p class="text-[12px] text-musgo">e mais ${muds.length - 40}.</p>` : '';
    abrirDialogo(`
      <div class="dialogo-cabeca"><span class="vazio-icone h-11 w-11 text-base"><i class="fa-solid fa-paper-plane"></i></span><div class="min-w-0"><p class="kicker">${correcao ? 'Correção' : 'Nova escala'}</p><h3 class="mt-1 text-[19px] font-semibold leading-tight text-texto">${correcao ? 'Corrigir a escala em vigor' : 'Publicar escala'}</h3><p class="mt-1 text-[13px] text-musgo">${correcao ? 'Em vigor desde' : 'Vale a partir de'} ${br(vig)} · ${plural(muds.length, 'alteração', 'alterações')}</p></div>${botaoFechar()}</div>
      <form id="form-publicar" class="dialogo-corpo" novalidate autocomplete="off">
        <div><ul class="lista px-4">${lista}</ul>${mais}</div>
        <div><label class="rotulo" for="senha-edicao"><i class="fa-solid fa-key"></i>Senha de edição</label><input id="senha-edicao" name="senha" type="password" class="campo" value="${esc(S.senha)}" autocomplete="off" data-foco><p class="msg erro" data-erro="geral" hidden></p></div>
        <div class="grid gap-2.5 grid-cols-1 sm:grid-cols-2"><button type="button" class="btn-sec h-14" data-acao="fechar">Cancelar</button><button type="submit" class="btn-enviar mt-0"><i class="fa-solid fa-paper-plane"></i><span>Publicar</span></button></div>
      </form>`, { foco: '#senha-edicao' });
  }

  async function enviarPublicacao(form) {
    if (form.dataset.enviando) return;
    const senha = form.elements.senha.value.trim(), erro = form.querySelector('[data-erro="geral"]');
    if (!senha) { mostrarMsg(erro, 'Informe a senha de edição.'); form.elements.senha.classList.add('invalido'); form.elements.senha.focus(); return; }
    const vig = vigenciaEd(), base = mapaVersao(baseEm(vig));
    const linhas = linhasEditor().map(l => { const v = valorEd(l.k, base.get(l.k)); return { org: l.org, tipo: l.tipo, auditor: limparNome(v.auditor), supervisor: limparNome(v.supervisor) }; });
    form.dataset.enviando = '1';
    estadoBotao(form, true, 'Publicando...');
    try {
      const r = await api('post', { acao: 'publicarEscala', nick: S.usuario.nick, senha, vigencia: vig, linhas });
      S.senha = senha;
      S.ed = null;
      fecharModal();
      abrirModal({
        tipo: 'sucesso', titulo: r.mensagem.replace(/\.$/, ''),
        corpo: `<p>${plural(r.alteracoes, 'alteração', 'alterações')}, valendo a partir de <strong class="text-texto">${br(r.vigencia)}</strong>.</p>`,
        acoes: [{ rotulo: 'Ver a escala', classe: 'btn-sec', icone: 'fa-users', acao: () => { fecharModal(); S.versaoEscala = r.vigencia; irPara('escalas'); } }, { rotulo: 'Fechar', classe: 'btn-pri', acao: fecharModal }]
      });
      carregar({ silencioso: true });
    } catch (e) {
      delete form.dataset.enviando;
      estadoBotao(form, false, 'Publicar');
      mostrarMsg(erro, e.message);
      if (/senha/i.test(e.message)) { form.elements.senha.classList.add('invalido'); form.elements.senha.select(); }
    }
  }

  /* ==================================================================
     INTERPRETAÇÃO DE DADOS
     ================================================================== */
  const porPrazoFuncao = (a, b) => (a.prazoA < b.prazoA ? -1 : a.prazoA > b.prazoA ? 1 : a.periodo.localeCompare(b.periodo, 'pt-BR', { numeric: true }));
  const dicaCargo = nick => { const n = limparNome(nick), m = n ? naListagem(n) : null; return m ? esc(m.cargo) : n && listagemOk() ? 'Fora da listagem de membros' : ''; };
  function pessoaFuncao(t, papel) {
    const A = papel === 'A', nick = A ? t.auditor : t.supervisor, s = A ? t.sa : t.ss, prazo = A ? t.prazoA : t.prazoS, m = naListagem(nick);
    return `<div class="funcao-pessoa">${cabeca(nick)}<div class="min-w-0 flex-1"><p class="text-[10.5px] font-semibold uppercase tracking-[.12em] text-musgo">${papelRotulo(t, papel)} · até ${br(prazo)}</p><p class="truncate text-[13.5px] font-semibold ${sou(nick) ? 'text-af-300' : 'text-texto'}">${esc(nick || 'sem nome')}</p>${m ? `<p class="truncate text-[11.5px] text-musgo">${esc(m.cargo)}</p>` : ''}</div>${pilula(s, papel)}</div>`;
  }
  function cartaoFuncao(t) {
    const f = t.funcao;
    return `<div class="funcao-cartao" role="button" tabindex="0" data-acao="detalhe" data-chave="${esc(t.chave)}">
      <div class="flex items-start gap-3">${emblemaDe(t, true)}<div class="min-w-0 flex-1"><p class="text-[11px] font-semibold uppercase tracking-[.12em] text-musgo">${esc(f.id)}${f.org ? ' · ' + esc(f.org) : ''} · início ${br(t.inicio)}</p><h3 class="mt-0.5 text-[15.5px] font-semibold leading-snug text-texto">${esc(f.titulo)}</h3>${f.descricao ? `<p class="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-musgo">${esc(f.descricao)}</p>` : ''}</div></div>
      <div class="mt-3.5 grid gap-2 grid-cols-1 md:grid-cols-2">${pessoaFuncao(t, 'A')}${pessoaFuncao(t, 'S')}</div>
    </div>`;
  }
  PAINEIS.interpretacao = function () {
    const d = S.dados, lista = d.tarefas.filter(ehFuncao).sort(porPrazoFuncao);
    const ant = d.anteriores ? d.anteriores.tarefas.filter(ehFuncao).sort(porPrazoFuncao) : [];
    const botao = d.editor ? '<button type="button" class="btn-pri" data-acao="nova-funcao"><i class="fa-solid fa-plus"></i>Nova função</button>' : '';
    const cab = `<div class="flex flex-wrap items-end justify-between gap-4"><div><p class="kicker">Interpretação de dados</p><h2 class="painel-titulo">${esc(d.mesNome)}</h2><p class="painel-sub">${plural(lista.length, 'função', 'funções')}</p></div>${botao}</div>`;
    const antes = ant.length ? `<section class="mt-7">${secao('fa-clock-rotate-left', `Ainda correm prazos de ${esc(d.anteriores.mesNome)}`)}<div class="space-y-3">${ant.map(cartaoFuncao).join('')}</div></section>` : '';
    const corpo = lista.length ? `<div class="mt-6 space-y-3">${lista.map(cartaoFuncao).join('')}</div>` : vazio('fa-chart-pie', 'Nenhuma função neste mês', '');
    return cartao(cab + antes + corpo);
  };

  function abrirFormFuncao(chave) {
    const d = S.dados, t = chave ? IDX.tarefas.get(chave) : null, f = ehFuncao(t) ? t.funcao : null;
    if (!d.editor || (chave && !f)) return;
    const h = hoje(), ini = f ? t.inicio : (S.mes > h.slice(0, 7) ? S.mes + '-01' : h);
    const orgs = ['<option value="">Sem organização</option>'].concat(d.cadastro.map(o => `<option value="${esc(o.nome)}"${f && normal(f.org) === normal(o.nome) ? ' selected' : ''}>${esc(o.nome)}</option>`)).join('');
    const data = (nome, rotulo, valor, icone) => `<div><label class="rotulo" for="f-${nome}"><i class="fa-solid ${icone}"></i>${rotulo}</label><input id="f-${nome}" name="${nome}" type="date" class="campo" value="${esc(valor || '')}"><p class="msg erro" data-erro="${nome}" hidden></p></div>`;
    const pessoa = (nome, rotulo, valor, icone) => `<div><label class="rotulo" for="f-${nome}"><i class="fa-solid ${icone}"></i>${rotulo}</label><input id="f-${nome}" name="${nome}" class="campo" list="membros" value="${esc(valor || '')}" maxlength="60" autocomplete="off" spellcheck="false"><p class="dica" data-cargo="${nome}">${dicaCargo(valor)}</p><p class="msg erro" data-erro="${nome}" hidden></p></div>`;
    S.formFuncao = { chave: f ? chave : '', fiscalManual: !!f };
    abrirDialogo(`
      <div class="dialogo-cabeca"><span class="funcao-icone" aria-hidden="true"><i class="fa-solid fa-chart-pie"></i></span><div class="min-w-0"><p class="kicker">Interpretação de dados</p><h3 class="mt-1 text-[19px] font-semibold leading-tight text-texto">${f ? 'Editar função' : 'Nova função'}</h3>${f ? `<p class="mt-1 text-[13px] text-musgo">${esc(f.id)} · ${esc(mesDaTarefa(t))}</p>` : ''}</div>${botaoFechar()}</div>
      <form id="form-funcao" class="dialogo-corpo" novalidate autocomplete="off">
        <section class="space-y-4">
          <div><label class="rotulo" for="f-titulo"><i class="fa-solid fa-chart-pie"></i>Função</label><input id="f-titulo" name="titulo" class="campo" maxlength="120" value="${esc(f ? f.titulo : '')}" placeholder="Ex.: interpretação dos dados de pesquisa de setembro"><p class="msg erro" data-erro="titulo" hidden></p></div>
          <div><label class="rotulo" for="f-desc-funcao"><i class="fa-solid fa-align-left"></i>Descrição <small>(opcional)</small></label><textarea id="f-desc-funcao" name="descricao" class="campo" maxlength="1000">${esc(f ? f.descricao : '')}</textarea></div>
          <div><label class="rotulo" for="f-org"><i class="fa-solid fa-shield-halved"></i>Organização <small>(opcional)</small></label><select id="f-org" name="org" class="campo">${orgs}</select></div>
        </section>
        <section class="grid gap-4 grid-cols-1 sm:grid-cols-3">${data('inicio', 'Início', ini, 'fa-play')}${data('prazo', 'Prazo do responsável', f ? t.prazoA : '', 'fa-hourglass-half')}${data('prazoFiscal', 'Prazo do fiscal', f ? t.prazoS : '', 'fa-hourglass-end')}</section>
        <section class="grid gap-4 grid-cols-1 sm:grid-cols-2">${pessoa('responsavel', 'Responsável', f ? f.responsavel : '', 'fa-user-pen')}${pessoa('fiscal', 'Fiscal', f ? f.fiscal : '', 'fa-user-check')}</section>
        <section class="space-y-3">
          <div><label class="rotulo" for="senha-funcao"><i class="fa-solid fa-key"></i>Senha de edição</label><input id="senha-funcao" name="senha" type="password" class="campo" value="${esc(S.senha)}" autocomplete="off"></div>
          <p class="msg erro" data-erro="geral" hidden></p>
          <div class="grid gap-2.5 grid-cols-1 sm:grid-cols-2"><button type="button" class="btn-sec h-12 rounded-xl" data-acao="fechar">Cancelar</button><button type="submit" class="btn-enviar"><i class="fa-solid ${f ? 'fa-floppy-disk' : 'fa-plus'}" aria-hidden="true"></i><span>${f ? 'Salvar alterações' : 'Criar função'}</span></button></div>
        </section>
      </form>`, { foco: '#f-titulo', aoFechar: () => { S.formFuncao = null; } });
  }

  // Prazo do fiscal sugerido a partir do prazo do responsável, até ser mexido à mão.
  function digitarFuncao(campo) {
    const form = campo.form, ff = S.formFuncao;
    if (!form || !ff) return;
    if (campo.name === 'responsavel' || campo.name === 'fiscal') {
      const dica = form.querySelector(`[data-cargo="${campo.name}"]`);
      if (dica) dica.innerHTML = dicaCargo(campo.value);
    } else if (campo.name === 'prazoFiscal') ff.fiscalManual = !!campo.value;
    else if (campo.name === 'prazo' && !ff.fiscalManual && /^\d{4}-\d{2}-\d{2}$/.test(campo.value)) {
      const n = S.dados.config.prazoFiscalInterpretacao;
      form.elements.prazoFiscal.value = somarDias(campo.value, n == null ? 2 : n);
    }
  }

  async function enviarFuncao(form) {
    const ff = S.formFuncao;
    if (!ff || form.dataset.enviando) return;
    const g = n => String(form.elements[n] ? form.elements[n].value : '').trim();
    const v = { titulo: g('titulo'), descricao: g('descricao'), org: g('org'), inicio: g('inicio'), prazo: g('prazo'), prazoFiscal: g('prazoFiscal'),
      responsavel: limparNome(g('responsavel')), fiscal: limparNome(g('fiscal')), senha: g('senha') };
    const e = {};
    if (v.titulo.length < 3) e.titulo = 'Dê um nome para a função (pelo menos 3 caracteres).';
    if (!v.inicio) e.inicio = 'Informe o início.';
    if (!v.prazo) e.prazo = 'Informe o prazo do responsável.';
    else if (v.inicio && v.prazo < v.inicio) e.prazo = 'O prazo não pode ser antes do início.';
    if (v.prazoFiscal && v.prazo && v.prazoFiscal < v.prazo) e.prazoFiscal = 'Não pode ser antes do prazo do responsável.';
    if (!v.responsavel) e.responsavel = 'Informe o responsável.';
    if (!v.fiscal) e.fiscal = 'Informe o fiscal.';
    else if (chaveNick(v.fiscal) === chaveNick(v.responsavel)) e.fiscal = 'O fiscal precisa ser outra pessoa.';
    if (!v.senha) e.geral = 'Informe a senha de edição.';
    form.querySelectorAll('[data-erro]').forEach(p => mostrarMsg(p, e[p.dataset.erro]));
    ['titulo', 'inicio', 'prazo', 'prazoFiscal', 'responsavel', 'fiscal', 'senha'].forEach(n => { if (form.elements[n]) form.elements[n].classList.toggle('invalido', !!e[n] || (n === 'senha' && !!e.geral)); });
    const primeiro = ['titulo', 'inicio', 'prazo', 'prazoFiscal', 'responsavel', 'fiscal'].find(n => e[n]) || (e.geral ? 'senha' : '');
    if (primeiro) { form.elements[primeiro].focus(); return; }
    const t = ff.chave ? IDX.tarefas.get(ff.chave) : null;
    const corpo = Object.assign({ acao: 'salvarFuncao', nick: S.usuario.nick }, v);
    if (t) Object.assign(corpo, { id: t.funcao.id, mes: t.chave.split('|')[0] });
    form.dataset.enviando = '1';
    estadoBotao(form, true, 'Salvando...');
    try {
      const r = await api('post', corpo);
      S.senha = v.senha;
      fecharModal();
      toast(r.mensagem);
      if (r.mes) S.mes = r.mes;
      S.aba = 'interpretacao';
      gravarLocal(CHAVE_ABA, S.aba);
      await carregar();
    } catch (err) {
      delete form.dataset.enviando;
      estadoBotao(form, false, t ? 'Salvar alterações' : 'Criar função');
      mostrarMsg(form.querySelector('[data-erro="geral"]'), err.message);
      if (/senha/i.test(err.message)) { form.elements.senha.classList.add('invalido'); form.elements.senha.select(); }
    }
  }

  function abrirCancelarFuncao(chave) {
    const t = IDX.tarefas.get(chave);
    if (!ehFuncao(t) || !S.dados.editor) return;
    S.formFuncao = { chave };
    abrirDialogo(`
      <div class="dialogo-cabeca"><span class="funcao-icone" aria-hidden="true"><i class="fa-solid fa-ban"></i></span><div class="min-w-0"><p class="kicker">Interpretação de dados</p><h3 class="mt-1 text-[19px] font-semibold leading-tight text-texto">Cancelar função</h3><p class="mt-1 text-[13px] text-musgo">${esc(t.funcao.id)} · ${esc(t.funcao.titulo)}</p></div>${botaoFechar()}</div>
      <form id="form-cancelar-funcao" class="dialogo-corpo" novalidate autocomplete="off">
        <p class="text-[13.5px] leading-relaxed text-nevoa">A função sai do mês e do desempenho de ${esc(t.auditor || 'ninguém')} e ${esc(t.supervisor || 'ninguém')}.</p>
        <div><label class="rotulo" for="senha-cancelar"><i class="fa-solid fa-key"></i>Senha de edição</label><input id="senha-cancelar" name="senha" type="password" class="campo" value="${esc(S.senha)}" autocomplete="off"><p class="msg erro" data-erro="geral" hidden></p></div>
        <div class="grid gap-2.5 grid-cols-1 sm:grid-cols-2"><button type="button" class="btn-sec h-12 rounded-xl" data-acao="fechar">Voltar</button><button type="submit" class="btn-enviar"><i class="fa-solid fa-ban" aria-hidden="true"></i><span>Cancelar função</span></button></div>
      </form>`, { foco: '#senha-cancelar', aoFechar: () => { S.formFuncao = null; } });
  }

  async function enviarCancelamento(form) {
    const ff = S.formFuncao, t = ff && IDX.tarefas.get(ff.chave);
    if (!t || form.dataset.enviando) return;
    const senha = form.elements.senha.value.trim(), erro = form.querySelector('[data-erro="geral"]');
    if (!senha) { mostrarMsg(erro, 'Informe a senha de edição.'); form.elements.senha.classList.add('invalido'); form.elements.senha.focus(); return; }
    form.dataset.enviando = '1';
    estadoBotao(form, true, 'Cancelando...');
    try {
      const r = await api('post', { acao: 'cancelarFuncao', nick: S.usuario.nick, senha, id: t.funcao.id, mes: t.chave.split('|')[0] });
      S.senha = senha;
      fecharModal();
      toast(r.mensagem);
      await carregar();
    } catch (err) {
      delete form.dataset.enviando;
      estadoBotao(form, false, 'Cancelar função');
      mostrarMsg(erro, err.message);
      if (/senha/i.test(err.message)) { form.elements.senha.classList.add('invalido'); form.elements.senha.select(); }
    }
  }

  /* ==================================================================
     FORMULÁRIO DE REGISTRO
     ================================================================== */
  const pergunta = (nome, texto, dica, alerta) => `<div class="pergunta" data-pergunta="${nome}">
      <p class="pergunta-texto" id="p-${nome}">${esc(texto)}${dica ? `<small>${esc(dica)}</small>` : ''}</p>
      <div class="segmento" role="radiogroup" aria-labelledby="p-${nome}" data-alerta="${alerta}" data-valor="">
        <span class="segmento-trilho" aria-hidden="true"></span>
        <label><input type="radio" name="${nome}" value="nao" class="sr-only"><span>Não</span></label>
        <label><input type="radio" name="${nome}" value="sim" class="sr-only"><span>Sim</span></label>
      </div>
    </div><p class="msg erro" data-erro="${nome}" hidden></p>`;

  function abrirFormulario(chave, papel, modo) {
    const t = IDX.tarefas.get(chave);
    if (!t || S.sessao !== 'ok') return;
    const x = itemDe(t, papel);
    if (!x.aberta && !x.justifica) return;
    const A = papel === 'A', realizada = A ? 'Concluída' : 'Realizada';
    const situacoes = (x.aberta ? [realizada] : []).concat(x.justifica ? ['Justificada'] : []);
    const situacao = modo === 'justificar' && x.justifica ? 'Justificada' : situacoes[0];
    S.form = { chave, papel, t };
    abrirDialogo(htmlFormulario(t, papel, situacoes, situacao), { aoFechar: () => { S.form = null; } });
    atualizarFormulario();
  }

  function htmlFormulario(t, papel, situacoes, situacao) {
    const A = papel === 'A', cofre = ehCofre(t), F = ehFuncao(t), h = hoje(), quem = quemExecuta(t);
    const sohJustifica = situacoes.length === 1 && situacao === 'Justificada';
    const titulo = sohJustifica ? 'Justificativa' : F ? (A ? 'Registro da função' : 'Registro da fiscalização')
      : A ? (cofre ? 'Registro da auditoria' : 'Registro dos dados de pesquisa') : 'Registro da supervisão';
    const escolha = situacoes.length > 1
      ? `<div class="grid gap-2 grid-cols-1 sm:grid-cols-2" role="radiogroup" aria-label="Situação">${situacoes.map(s => `<label class="motivo" data-tom="${s === 'Justificada' ? 'neu' : 'pos'}"><input type="radio" name="situacao" value="${s}" class="sr-only"${s === situacao ? ' checked' : ''}><i class="fa-solid ${s === 'Justificada' ? 'fa-file-lines' : 'fa-circle-check'}" aria-hidden="true"></i><span>${s === 'Justificada' ? 'Justificar' : s}</span></label>`).join('')}</div>`
      : `<input type="hidden" name="situacao" value="${situacao}">`;
    const contexto = !A ? `<div class="contexto">${st(t.sa, 'A')}<span>${papelRotulo(t, 'A')} <b>${esc(t.auditor || 'sem nome na escala')}</b>: ${esc(minuscula(STATUS[t.sa].A))}${t.dataA ? ' em ' + br(t.dataA) : ''}</span></div>` : '';
    const dowC = cofre && t.prazoC ? DIAS[diaSemana(t.prazoC)] : '';
    const supervisao = A ? '' : `
      ${cofre ? pergunta('prazo', 'O prazo de postagem das medalhas foi respeitado?', t.prazoC ? `Prazo da Cia/Subcia: ${br(t.prazoC)} (${dowC})` : '', 'nao') : ''}
      ${t.sa === 'C' ? pergunta('erro', `O ${quem} cometeu algum erro?`, '', 'sim') : ''}
      ${t.sa === 'N' ? pergunta('licenca', `O ${quem} estava de licença no período?`, dicaLicenca(t), '') : ''}
      <div data-bloco="descricao" hidden><label class="rotulo" for="f-descricao"><i class="fa-solid fa-triangle-exclamation"></i>Descrição do erro</label><textarea id="f-descricao" name="descricao" class="campo" maxlength="1500" placeholder="Explique o que o ${quem} deixou passar"></textarea><p class="msg erro" data-erro="descricao" hidden></p></div>
      <div data-bloco="punicao" hidden>${pergunta('punicao', `Houve punição ao ${quem}?`, t.sa === 'N' ? `O ${quem} não registrou dentro do prazo.` : '', '')}</div>
      <div data-bloco="links" class="grid gap-4 grid-cols-1 sm:grid-cols-2" hidden>
        <div><label class="rotulo" for="f-link-req"><i class="fa-solid fa-link"></i>Link do requerimento</label><input id="f-link-req" name="linkReq" type="url" class="campo" placeholder="https://" maxlength="500"><p class="msg erro" data-erro="linkReq" hidden></p></div>
        <div><label class="rotulo" for="f-link-mp"><i class="fa-solid fa-envelope"></i>Comprovação da MP</label><input id="f-link-mp" name="linkMp" type="url" class="campo" placeholder="https://" maxlength="500"><p class="msg erro" data-erro="linkMp" hidden></p></div>
      </div>`;
    return `
      <div class="dialogo-cabeca">${emblemaDe(t, true)}<div class="min-w-0"><p class="kicker">${esc(titulo)}</p><h3 class="mt-1 text-[19px] font-semibold leading-tight text-texto">${esc(tituloDe(t))}</h3><p class="mt-1 text-[13px] text-musgo">${esc(TIPO[t.tipo].nome)} · ${periodoDe(t)}</p></div>${botaoFechar()}</div>
      <form id="form-registro" class="dialogo-corpo" novalidate autocomplete="off">
        ${situacoes.length > 1 || contexto ? `<section class="space-y-3">${situacoes.length > 1 ? secao('fa-list-check', 'Situação') : ''}${escolha}${contexto}</section>` : escolha}
        <section data-bloco="realizada" class="space-y-4"${situacao === 'Justificada' ? ' hidden' : ''}>
          ${secao(A ? 'fa-circle-check' : 'fa-binoculars', F ? (A ? 'Função' : 'Fiscalização') : A ? (cofre ? 'Auditoria' : 'Dados de pesquisa') : 'Supervisão')}
          <div class="max-w-[260px]"><label class="rotulo" for="f-data"><i class="fa-solid fa-calendar-check"></i>${A ? 'Data da conclusão' : F ? 'Data da fiscalização' : 'Data da supervisão'}</label><input id="f-data" name="data" type="date" class="campo" min="${t.fim}" max="${h}" value="${h}"><p class="msg erro" data-erro="data" hidden></p></div>
          ${supervisao}
          <div><label class="rotulo" for="f-obs"><i class="fa-solid fa-comment"></i>Observação <small>(opcional)</small></label><textarea id="f-obs" name="observacao" class="campo" maxlength="1000" placeholder="Algo que a supervisão ou a direção deva saber"></textarea></div>
        </section>
        <section data-bloco="justificada" class="space-y-3"${situacao === 'Justificada' ? '' : ' hidden'}>
          ${secao('fa-file-lines', 'Justificativa')}
          <div class="contexto"><i class="fa-solid fa-circle-info text-musgo" aria-hidden="true"></i><span>${cotaJustificativa(t, papel)}</span></div>
          <div><label class="rotulo" for="f-motivo"><i class="fa-solid fa-pen"></i>Motivo</label><textarea id="f-motivo" name="motivo" class="campo" maxlength="1000" placeholder="Explique por que ${F ? 'a função' : 'a tarefa'} não pôde ser feita"></textarea><p class="dica">Pelo menos 10 caracteres.</p><p class="msg erro" data-erro="motivo" hidden></p></div>
        </section>
        <section class="space-y-3">
          <label class="termo" data-termo><input type="checkbox" name="termo" class="sr-only"><span class="termo-caixa" aria-hidden="true"><i class="fa-solid fa-check"></i></span><span>${esc(CFG.TERMO)}</span></label>
          <p class="msg erro" data-erro="termo" hidden></p>
          <p class="msg erro" data-erro="geral" hidden></p>
          <button type="submit" class="btn-enviar"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i><span>Enviar registro</span></button>
        </section>
      </form>`;
  }

  function cotaJustificativa(t, papel) {
    const x = itemDe(t, papel), r = FAIXA[x.faixa], mes = esc(mesDaTarefa(t));
    const qual = x.max === 1 ? `Única justificativa ${r[0]} de ${mes}` : `<b>${x.usadas + 1}ª de ${x.max}</b> justificativas ${r[1]} de ${mes}`;
    return `${qual} · envio até <b>${br(ateJustificar(x.prazo))}</b>`;
  }

  // O que a listagem de membros diz sobre o auditor no período da tarefa.
  function dicaLicenca(t) {
    const m = naListagem(t.auditor), l = licencaEntre(m, t.inicio, t.prazoA);
    if (l) return `Na listagem de membros: licença de ${br(l.inicio)} a ${br(l.fim)}.`;
    if (m && m.rl) return 'Na listagem de membros: RL marcado.';
    return '';
  }

  function valoresFormulario(form) {
    const fd = new FormData(form), g = n => String(fd.get(n) || '').trim();
    return { situacao: g('situacao'), data: g('data'), observacao: g('observacao'), motivo: g('motivo'), prazo: g('prazo'), erro: g('erro'),
      licenca: g('licenca'), descricao: g('descricao'), punicao: g('punicao'), linkReq: g('linkReq'), linkMp: g('linkMp'), termo: !!fd.get('termo') };
  }
  const mostrarBloco = (form, bloco, sim) => form.querySelectorAll(`[data-bloco="${bloco}"]`).forEach(b => { b.hidden = !sim; });

  function atualizarFormulario() {
    const f = S.form, form = $('form-registro');
    if (!f || !form) return;
    const v = valoresFormulario(form), realizada = v.situacao !== 'Justificada';
    mostrarBloco(form, 'realizada', realizada);
    mostrarBloco(form, 'justificada', !realizada);
    if (f.papel === 'S') {
      const pune = realizada && ((f.t.sa === 'N' && v.licenca === 'nao') || v.erro === 'sim');
      mostrarBloco(form, 'descricao', realizada && v.erro === 'sim');
      mostrarBloco(form, 'punicao', pune);
      mostrarBloco(form, 'links', pune && v.punicao === 'sim');
    }
    form.querySelectorAll('.segmento').forEach(sg => { const r = sg.querySelector('input:checked'); sg.dataset.valor = r ? r.value : ''; });
    form.querySelector('[type="submit"] span').textContent = realizada ? 'Enviar registro' : 'Enviar justificativa';
  }

  const urlValida = s => /^https?:\/\/[^\s"'<>]{3,}$/i.test(s);
  function validar(f, v) {
    const e = {}, t = f.t, A = f.papel === 'A';
    if (v.situacao === 'Justificada') {
      if (v.motivo.length < 10) e.motivo = 'Explique o motivo com pelo menos 10 caracteres.';
    } else {
      if (!v.data) e.data = 'Informe a data.';
      else if (v.data < t.fim || v.data > hoje()) e.data = `Use uma data entre ${br(t.fim)} e hoje.`;
      if (!A) {
        if (ehCofre(t) && !v.prazo) e.prazo = 'Responda se o prazo de postagem foi respeitado.';
        if (t.sa === 'C' && !v.erro) e.erro = `Responda se o ${quemExecuta(t)} cometeu algum erro.`;
        if (t.sa === 'C' && v.erro === 'sim' && v.descricao.length < 10) e.descricao = 'Descreva o erro com pelo menos 10 caracteres.';
        if (t.sa === 'N' && !v.licenca) e.licenca = `Responda se o ${quemExecuta(t)} estava de licença.`;
        const pune = (t.sa === 'N' && v.licenca === 'nao') || v.erro === 'sim';
        if (pune && !v.punicao) e.punicao = `Responda se houve punição ao ${quemExecuta(t)}.`;
        if (pune && v.punicao === 'sim') {
          if (!urlValida(v.linkReq)) e.linkReq = 'Cole o link completo da postagem do requerimento.';
          if (!urlValida(v.linkMp)) e.linkMp = 'Cole o link completo da comprovação.';
        }
      }
    }
    if (!v.termo) e.termo = 'Marque o termo de compromisso para enviar.';
    return e;
  }

  function mostrarMsg(p, texto) {
    if (!p) return;
    p.textContent = texto || '';
    p.hidden = !texto;
  }
  function mostrarErros(form, e) {
    form.querySelectorAll('[data-erro]').forEach(p => mostrarMsg(p, e[p.dataset.erro]));
    const marcar = { data: '#f-data', motivo: '#f-motivo', descricao: '#f-descricao', linkReq: '#f-link-req', linkMp: '#f-link-mp' };
    Object.entries(marcar).forEach(([k, sel]) => { const c = form.querySelector(sel); if (c) c.classList.toggle('invalido', !!e[k]); });
    ['prazo', 'erro', 'licenca', 'punicao'].forEach(k => { const c = form.querySelector(`[data-pergunta="${k}"]`); if (c) c.classList.toggle('invalido', !!e[k]); });
    const termo = form.querySelector('[data-termo]');
    if (termo) termo.classList.toggle('invalido', !!e.termo);
    const primeiro = ['data', 'prazo', 'erro', 'licenca', 'descricao', 'punicao', 'linkReq', 'linkMp', 'motivo', 'termo'].find(k => e[k]);
    if (primeiro) {
      const alvo = form.querySelector(marcar[primeiro] || `[name="${primeiro}"]`);
      if (alvo) alvo.focus({ preventScroll: false });
    }
  }
  function limparErroCampo(campo) {
    const form = campo.form;
    if (!form) return;
    const nome = campo.name, mapa = { data: 'data', motivo: 'motivo', descricao: 'descricao', linkReq: 'linkReq', linkMp: 'linkMp', prazo: 'prazo', erro: 'erro', licenca: 'licenca', punicao: 'punicao', termo: 'termo', senha: 'geral',
      titulo: 'titulo', inicio: 'inicio', prazoFiscal: 'prazoFiscal', responsavel: 'responsavel', fiscal: 'fiscal' };
    const k = mapa[nome];
    if (!k) return;
    mostrarMsg(form.querySelector(`[data-erro="${k}"]`), '');
    campo.classList.remove('invalido');
    const perg = campo.closest('.pergunta, [data-termo]');
    if (perg) perg.classList.remove('invalido');
  }
  function estadoBotao(form, enviando, texto) {
    const b = form.querySelector('[type="submit"]');
    if (!b) return;
    b.disabled = enviando;
    const i = b.querySelector('i');
    if (!b.dataset.icone) b.dataset.icone = i.className;
    i.className = enviando ? 'fa-solid fa-circle-notch fa-spin' : b.dataset.icone;
    b.querySelector('span').textContent = texto;
  }

  async function enviarFormulario(form) {
    const f = S.form;
    if (!f || form.dataset.enviando) return;
    const v = valoresFormulario(form), e = validar(f, v);
    mostrarErros(form, e);
    if (Object.keys(e).length) return;
    const t = f.t, A = f.papel === 'A';
    const corpo = { acao: 'registrar', papel: A ? 'Auditor' : 'Supervisor', chave: f.chave, nick: S.usuario.nick, usuarioId: S.usuario.id || '', termo: true };
    if (v.situacao === 'Justificada') Object.assign(corpo, { situacao: 'Justificada', observacao: v.motivo });
    else {
      Object.assign(corpo, { situacao: A ? 'Concluída' : 'Realizada', data: v.data, observacao: v.observacao });
      if (!A) {
        if (ehCofre(t)) corpo.prazoRespeitado = v.prazo === 'sim' ? 'Sim' : 'Não';
        if (t.sa === 'C') { corpo.erroAuditor = v.erro === 'sim' ? 'Sim' : 'Não'; if (v.erro === 'sim') corpo.descricaoErro = v.descricao; }
        if (t.sa === 'N') corpo.licencaAuditor = v.licenca === 'sim' ? 'Sim' : 'Não';
        if ((t.sa === 'N' && v.licenca === 'nao') || v.erro === 'sim') {
          corpo.punicao = v.punicao === 'sim' ? 'Sim' : 'Não';
          if (v.punicao === 'sim') { corpo.linkRequerimento = v.linkReq; corpo.linkMp = v.linkMp; }
        }
      }
    }
    form.dataset.enviando = '1';
    estadoBotao(form, true, 'Enviando...');
    try {
      const r = await api('post', corpo);
      substituirTarefa(r.tarefa);
      fecharModal();
      abrirModal({
        tipo: 'sucesso', titulo: v.situacao === 'Justificada' ? 'Justificativa enviada' : 'Registro enviado',
        corpo: `<p>${esc(r.mensagem)}</p>${r.tarefa && r.tarefa.sa === 'L' && !A ? `<p>O período do ${quemExecuta(t)} ficou como caso especial (CE).</p>` : ''}<p class="text-musgo">${esc(tituloDe(t))} · ${esc(TIPO[t.tipo].nome)}${ehFuncao(t) ? '' : ' · ' + rotuloPeriodo(t)}</p>`,
        acoes: [{ rotulo: 'Fechar', classe: 'btn-pri', acao: fecharModal }]
      });
      renderTudo();
      carregar({ silencioso: true });
    } catch (err) {
      delete form.dataset.enviando;
      estadoBotao(form, false, v.situacao === 'Justificada' ? 'Enviar justificativa' : 'Enviar registro');
      mostrarMsg(form.querySelector('[data-erro="geral"]'), err.message);
    }
  }

  function substituirTarefa(nova) {
    if (!nova || !S.dados) return;
    [S.dados.tarefas, S.dados.anteriores ? S.dados.anteriores.tarefas : []].forEach(l => {
      const i = l.findIndex(t => t.chave === nova.chave);
      if (i >= 0) l[i] = Object.assign({}, l[i], nova);
    });
    IDX.tarefas = new Map(todasTarefas().map(t => [t.chave, t]));
  }

  /* ==================================================================
     RELATÓRIO MENSAL EM BBCODE (modelo Folha)
     ================================================================== */
  const limparBB = s => String(s == null ? '' : s).replace(/\[/g, '(').replace(/\]/g, ')').replace(/[<>"]/g, '').replace(/[\r\n]+/g, ' ');

  function gerarRelatorio() {
    const G950 = '#03240F', G700 = '#0B5D33', G600 = '#13804A', E400 = '#34D399', HSUB = '#A9BBB0';
    const GOLD = '#D9A404', GOLD_S = '#C9A227', GOLD_L = '#F3CF5C', GOLD_D = '#8A6700', GOLD_BG = '#FFF6D8', GOLD_RG = 'rgba(217,164,4,.38)';
    const WHITE = '#FFFFFF', SPINE = '#F4F8F4', LINE = '#E6ECE6', SOFT = '#F7FAF7';
    const INK = '#10241A', TEXT = '#3A4A40', MUTED = '#6B7B71';
    const SKY = '#0369A1', ROSE = '#BE123C';
    const PF = 'font-family:Poppins,sans-serif', JUST = 'text-align:justify;hyphens:auto;-webkit-hyphens:auto';
    const NB = 'border:none!important', FLEX = 'display:flex;flex-wrap:wrap';
    const SPW = 210, BREAK = 560, PADX = 'clamp(16px,4.5vw,40px)';
    const SPINE_EMPTY = `width:${SPW}px;flex:0 0 max(0px,min(${SPW}px,calc((100% - ${BREAK}px) * 999)));max-width:max(0px,min(${SPW}px,calc((100% - ${BREAK}px) * 999)));box-sizing:border-box;padding:0;overflow:hidden`;
    const SPINE_HEAD = `width:${SPW}px;flex:0 0 min(100%,max(${SPW}px,calc((${BREAK}px - 100%) * 999)));box-sizing:border-box`;
    const MAIN = 'flex:1 1 300px;min-width:0;box-sizing:border-box';

    const cor = bg => (bg ? ` bgcolor="${bg}"` : '');
    const T = (style, inner, bg) => `[table style="${NB};border-spacing:0;${style}"${cor(bg)}]${inner}[/table]`;
    const Tab = (style, bg) => `[table style="${NB};border-spacing:0;${style}"${cor(bg)}]`;
    const R = (inner, style) => `[tr style="${NB}${style ? ';' + style : ''}"]${inner}[/tr]`;
    const Rab = style => `[tr style="${NB}${style ? ';' + style : ''}"]`;
    const D = (style, inner, bg) => `[td style="${NB};${style}"${cor(bg)}]${inner || ''}[/td]`;
    const Dab = (style, bg) => `[td style="${NB};${style}"${cor(bg)}]`;
    const b = x => `[b]${x}[/b]`;
    const c = (col, x) => `[color=${col}]${x}[/color]`;
    const fa = cls => `<i class="${cls}"></i>`;
    const txt = (style, inner, bg) => T('width:100%;margin:0', R(D(`padding:0;${PF};${style}`, inner, bg)));
    const bloco = (inner, pad) => T('width:100%;margin:0', R(D(`padding:${pad || '12px 0'}`, inner)));
    const quadrado = (texto, bg, fg) => T('width:26px;margin:0;border-radius:7px', R(D(`padding:0;height:22px;${PF};color:${fg};font-size:11px;font-weight:800;line-height:22px;text-align:center`, texto)), bg);
    const brilho = (lado, a) => [[50, -30], [110, -70], [170, -120]].map(([o, s], i) => `inset 0 ${lado === 'top' ? '' : '-'}${o}px 50px ${s}px rgba(16,185,129,${a[i]})`).join(',');
    function abrir(t1, t2, sub) {
      const banner = T('width:100%;margin:0;border-radius:16px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 24px 50px -26px rgba(16,185,129,.55)',
        R(D('padding:0;line-height:0;font-size:0;text-align:center', `[img]${CFG.BANNER}[/img]`)), G950);
      const estilo = `font-size:44px;font-size:clamp(30px,6vw,52px);font-weight:800;line-height:1.05;letter-spacing:-.035em;text-shadow:0 0 40px rgba(16,185,129,.35);text-align:left`;
      const titulo = T('width:100%;margin:0',
        R(D(`padding:34px ${PADX} 0;${PF};color:${WHITE};${estilo}`, t1))
        + R(D(`padding:0 ${PADX};${PF};color:${E400};${estilo}`, t2))
        + R(D(`padding:16px ${PADX} 0;${PF};color:${HSUB};font-size:16px;line-height:27px;text-align:left`, sub)));
      const folhaTopo = T('width:100%;margin:30px 0 0;border-radius:18px 18px 0 0;overflow:hidden', R(D(SPINE_EMPTY + ';height:8px', '', SPINE) + D(MAIN + ';height:8px;padding:0', '', WHITE), FLEX), WHITE);
      const tela = `box-shadow:${brilho('top', [0.2, 0.14, 0.08])},${brilho('bottom', [0.12, 0.08, 0.04])},inset 0 0 0 1px rgba(217,164,4,.45)`;
      return Tab(`width:100%;max-width:1000px;margin:0 auto;border-radius:28px;${PF};box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 30px 60px -30px rgba(3,36,15,.6)`, GOLD)
        + Rab() + Dab('padding:3px')
        + Tab('width:100%;margin:0;border-radius:25px', G950) + Rab() + Dab('padding:4px')
        + Tab(`width:100%;margin:0;border-radius:22px;${tela}`, G950)
        + Rab() + Dab('padding:10px clamp(8px,2.5vw,22px) 0;font-size:0;line-height:0;text-align:left')
        + banner + titulo + folhaTopo;
    }
    function fechar() {
      const folhaFim = T('width:100%;margin:0;border-radius:0 0 18px 18px;overflow:hidden;box-shadow:0 30px 50px -30px rgba(0,0,0,.7)', R(D(SPINE_EMPTY + ';height:8px', '', SPINE) + D(MAIN + ';height:8px;padding:0', '', WHITE), FLEX), WHITE);
      const rodape = T('width:100%;margin:0',
        R(D(`padding:26px 16px 0;${PF};color:${WHITE};font-size:15px;font-weight:700;line-height:22px;text-align:center`, 'Auditoria Fiscal'))
        + R(D(`padding:2px 16px 0;${PF};color:${HSUB};font-size:12px;line-height:18px;text-align:center`, 'Todos os direitos reservados à Auditoria Fiscal.'))
        + R(D(`padding:4px 16px 22px;${PF};color:${GOLD_L};font-size:12px;font-weight:600;line-height:18px;text-align:center`, fa('fas fa-code') + '  por Aloscon')));
      return folhaFim + rodape + '[/td][/tr][/table][/td][/tr][/table][/td][/tr][/table]';
    }
    function secaoAbre(num, rotulo, titulo, primeira) {
      const cabeca = D(`${SPINE_HEAD};padding:26px 22px 18px ${PADX};vertical-align:top;text-align:left`,
        T('width:100%;margin:0',
          R(D(`padding:0;${PF};font-size:44px;font-weight:800;line-height:1;letter-spacing:.03em;color:rgba(217,164,4,.08);-webkit-text-stroke:1.5px ${GOLD_S}`, num))
          + R(D(`padding:14px 0 0;${PF};color:${G600};font-size:13px;font-weight:600;line-height:18px`, rotulo))
          + R(D(`padding:2px 0 0;${PF};color:${INK};font-size:18px;font-weight:700;line-height:25px;letter-spacing:-.01em`, titulo))), SPINE);
      const linha = primeira ? '' : `;border-top:1px solid ${LINE}!important`;
      return Tab(`width:100%;margin:0${linha}`, WHITE) + Rab(FLEX) + cabeca
        + Dab(`${MAIN};padding:14px ${PADX} 14px 28px;padding-left:clamp(16px,4vw,30px);vertical-align:top;font-size:0;line-height:0`, WHITE);
    }
    const secaoFecha = () => '[/td][/tr][/table]';
    const paragrafo = texto => bloco(txt(`color:${TEXT};font-size:14px;line-height:24px;${JUST}`, texto));
    const nota = (rotulo, texto) => bloco(T(`width:100%;margin:0;box-shadow:inset 3px 0 0 ${GOLD}`, R(D(`padding:2px 0 2px 16px;${PF};color:${TEXT};font-size:14px;line-height:24px;${JUST}`, c(GOLD_D, b(rotulo)) + '  ' + texto))));
    const confere = itens => bloco(T('width:100%;margin:0', itens.filter(Boolean).map(t => R(D('width:34px;padding:5px 0 0;vertical-align:top', quadrado(fa('fas fa-check'), G700, WHITE))
      + D(`padding:5px 0 0;vertical-align:top;${PF};color:${TEXT};font-size:14px;line-height:24px;${JUST}`, t))).join('')), '8px 0');

    const de = S.dados.desempenho, mesNome = S.dados.mesNome, tot = de.total, casos = casosDo(de);
    const pctOu = x => (x.porcentagem == null ? 'sem base' : pct(x.porcentagem));
    const contadasTxt = x => `${x.concluidas} de ${contadas(x)} contadas`;
    const tile = (valor, rotulo, detalhe, cor) => D('flex:1 1 160px;min-width:0;box-sizing:border-box;padding:0;vertical-align:top',
      T(`width:100%;margin:0;border-radius:14px;box-shadow:inset 0 0 0 1px ${LINE}`,
        R(D(`padding:14px 16px 0;${PF};color:${cor || G700};font-size:30px;font-weight:800;line-height:34px;letter-spacing:-.02em;text-align:left`, valor))
        + R(D(`padding:4px 16px 0;${PF};color:${INK};font-size:13px;font-weight:700;line-height:18px;text-align:left`, rotulo))
        + R(D(`padding:2px 16px 14px;${PF};color:${MUTED};font-size:12px;line-height:18px;text-align:left`, detalhe)), SOFT));
    const linhaTiles = tiles => bloco(T('width:100%;margin:0', R(tiles.join(''), FLEX + ';row-gap:12px;column-gap:12px')));
    const tomPct = x => (x == null ? SKY : x >= 90 ? G700 : x >= de.meta ? GOLD_D : ROSE);
    const NBSP = String.fromCharCode(160), nb = t => t.replace(/ /g, NBSP);
    // Uma linha por pessoa, numa tabela por caso. Sem tabelas aninhadas por linha: o fórum aceita até 63 mil caracteres.
    const TOM_CASO = { positivo: GOLD_D, negativo: '#9F1239', especial: '#5B21B6' };
    function linhaCaso(x, ultima) {
      const p = x.p, itens = [PAPEL[x.papel], `${p.concluidas} de ${contadas(p)} ${contadas(p) === 1 ? 'concluída' : 'concluídas'}`];
      if (p.justificadas) itens.push(plural(p.justificadas, 'justificada', 'justificadas'));
      if (p.naoConcluidas) itens.push(`${p.naoConcluidas} não ${p.naoConcluidas === 1 ? 'concluída' : 'concluídas'}`);
      if (p.especiais) itens.push(plural(p.especiais, 'caso especial', 'casos especiais'));
      if (p.emAberto) itens.push(`${p.emAberto} em aberto`);
      if (p.caso === 'especial') motivosEspecial(p, false).forEach(m => itens.push(m));
      const borda = ultima ? '' : `;border-bottom:1px dashed ${LINE}!important`;
      const valor = fa('fas fa-medal') + ' ' + b(p.caso === 'positivo' ? '+' + p.medalhas : String(p.medalhas));
      return R(D(`padding:10px 12px 10px 0;${PF};color:${MUTED};font-size:13px;line-height:20px;text-align:left${borda}`,
          c(INK, b(limparBB(p.nick))) + '  ·  ' + itens.map(nb).join(' · '))
        + D(`padding:10px 0;${PF};font-size:13px;line-height:20px;text-align:right;white-space:nowrap${borda}`,
          c(p.caso === 'especial' ? TOM_CASO.especial : tomPct(p.porcentagem), b(textoPct(p))) + '   ' + c(TOM_CASO[p.caso], valor)));
    }
    const listaCaso = (itens, vazioTxt) => (itens.length
      ? bloco(T('width:100%;margin:0', itens.map((x, i, l) => linhaCaso(x, i === l.length - 1)).join('')), '6px 0')
      : paragrafo(vazioTxt));
    const nicks = l => l.map(x => limparBB(x.p.nick) + (l.some(y => y !== x && chaveNick(y.p.nick) === chaveNick(x.p.nick)) ? ` (${minuscula(PAPEL[x.papel])})` : '')).join(' / ');
    const qtd = (n, um, varios, cor) => `${c(cor, b(n))} ${n === 1 ? um : varios}`;
    const rotuloCaso = k => (casos[k].length === 1 ? CASOS[k].um : CASOS[k].titulo);
    const tetos = de.auditores.teto === de.agentes.teto
      ? `${de.auditores.teto} medalhas por cargo`
      : `${de.auditores.teto} medalhas para auditor e ${de.agentes.teto} para agente supervisor`;
    const negativas = de.auditores.negativas === de.agentes.negativas
      ? `${de.auditores.negativas} medalhas negativas`
      : `${de.auditores.negativas} medalhas negativas para auditor e ${de.agentes.negativas} para agente supervisor`;
    const resumo = [plural(tot.concluidas, 'concluída', 'concluídas'), plural(tot.justificadas, 'justificada', 'justificadas'), `${tot.naoConcluidas} não ${tot.naoConcluidas === 1 ? 'concluída' : 'concluídas'}`];
    if (tot.especiais) resumo.push(plural(tot.especiais, 'caso especial', 'casos especiais'));
    const linhas = [
      abrir('Desempenho Mensal', limparBB(mesNome), 'Resultado das escalas de cofres e de dados de pesquisa da Auditoria Fiscal: casos positivos, negativos e especiais de auditores e agentes supervisores.'),
      secaoAbre('01', 'Resultado', 'Visão geral', true),
      linhaTiles([tile(pctOu(tot), 'Auditoria Fiscal', contadasTxt(tot)), tile(pctOu(de.auditores.geral), 'Auditores', contadasTxt(de.auditores.geral)),
        tile(pctOu(de.agentes.geral), 'Agentes supervisores', contadasTxt(de.agentes.geral))]),
      linhaTiles([tile(String(casos.positivo.length), rotuloCaso('positivo'), `a partir de ${de.meta}%`, G700), tile(String(casos.negativo.length), rotuloCaso('negativo'), `abaixo de ${de.meta}%`, ROSE),
        tile(String(casos.especial.length), rotuloCaso('especial'), 'licença, RL ou CE', '#6D28D9')]),
      paragrafo(`Em ${minuscula(mesNome)} foram ${plural(tot.escalado, 'tarefa escalada', 'tarefas escaladas')} entre auditores e agentes supervisores: ${juntar(resumo)}${tot.emAberto ? `, além de ${tot.emAberto} ainda em aberto` : ''}. `
        + `Ficaram ${qtd(casos.positivo.length, 'caso positivo', 'casos positivos', G700)}, ${qtd(casos.negativo.length, 'caso negativo', 'casos negativos', ROSE)} e ${qtd(casos.especial.length, 'caso especial', 'casos especiais', '#6D28D9')}.`),
      de.final ? '' : nota('Parcial.', 'Este relatório foi gerado antes do fim de todos os prazos do mês.'),
      de.listagem ? '' : nota('Listagem.', 'A listagem de membros não pôde ser lida: licenças e RL ficaram de fora desta classificação.'),
      casos.aberto.length ? nota('Em aberto:', nicks(casos.aberto) + '.') : '',
      casos.sem.length ? nota('Sem escala no mês:', nicks(casos.sem) + '.') : '',
      secaoFecha(),
      secaoAbre('02', 'Cumprimento de meta', 'Casos positivos'), listaCaso(casos.positivo, 'Ninguém atingiu a meta neste mês.'), secaoFecha(),
      secaoAbre('03', 'Não cumprimento de meta', 'Casos negativos'), listaCaso(casos.negativo, 'Nenhum caso negativo neste mês.'), secaoFecha(),
      secaoAbre('04', 'Licença, RL ou CE', 'Casos especiais'), listaCaso(casos.especial, 'Nenhum caso especial neste mês.'), secaoFecha(),
      secaoAbre('05', 'Critérios', 'Como foi calculado'),
      confere([
        'Cada semana, quinzena ou mês escalado conta uma vez para o auditor e uma vez para o agente supervisor de cada organização.',
        de.interpretacao ? 'Funções de interpretação de dados contam uma vez para o responsável e uma vez para o fiscal, no cargo de cada um na listagem de membros (auditor ou agente supervisor).' : '',
        'Aproveitamento: tarefas concluídas divididas pelas tarefas escaladas. Justificadas, não concluídas e casos especiais descontam da mesma forma.',
        `Casos positivos: aproveitamento a partir de ${de.meta}%. Medalhas: o teto do cargo multiplicado pelo aproveitamento, com arredondamento (${tetos}).`,
        `Casos negativos: abaixo de ${de.meta}%, sem licença ou RL na listagem de membros: ${negativas} por não cumprimento de meta.`,
        `Casos especiais: abaixo de ${de.meta}% com licença no mês ou RL na listagem de membros, ou com período marcado como caso especial (CE) pelo agente supervisor. Não recebem medalhas.`
      ]),
      secaoFecha(),
      fechar()
    ];
    return linhas.filter(Boolean).join('\n') + '\n';
  }

  // Prévia: converte só as marcações usadas pelo próprio relatório.
  function bbParaHtml(bb) {
    return bb
      .replace(/\[table style="([^"]*)"(?: bgcolor="([^"]*)")?\]/g, (_, s, bg) => `<table style="${s}"${bg ? ` bgcolor="${bg}"` : ''}>`)
      .replace(/\[\/table\]/g, '</table>')
      .replace(/\[tr style="([^"]*)"\]/g, '<tr style="$1">').replace(/\[\/tr\]/g, '</tr>')
      .replace(/\[td style="([^"]*)"(?: bgcolor="([^"]*)")?\]/g, (_, s, bg) => `<td style="${s}"${bg ? ` bgcolor="${bg}"` : ''}>`)
      .replace(/\[\/td\]/g, '</td>')
      .replace(/\[img\]([^[]*)\[\/img\]/g, '<img src="$1" alt="">')
      .replace(/\[b\]/g, '<b>').replace(/\[\/b\]/g, '</b>')
      .replace(/\[color=([^\]]*)\]/g, '<span style="color:$1">').replace(/\[\/color\]/g, '</span>')
      .replace(/\n/g, '');
  }

  function abrirRelatorio() {
    const d = S.dados;
    S.bb = gerarRelatorio();
    const n = S.bb.length, grande = n > LIMITE_POSTAGEM;
    abrirDialogo(`
      <div class="dialogo-cabeca"><span class="vazio-icone h-11 w-11 shrink-0 text-base"><i class="fa-solid fa-code"></i></span><div class="min-w-0"><p class="kicker">Relatório em BBCode</p><h3 class="mt-1 text-[19px] font-semibold leading-tight text-texto">Desempenho de ${esc(d.mesNome)}</h3><p class="mt-1 text-[13px] text-musgo">${n.toLocaleString('pt-BR')} caracteres</p></div>${botaoFechar()}</div>
      <div class="dialogo-corpo">
        ${d.desempenho.final ? '' : aviso('aviso', 'fa-hourglass-half', 'Relatório parcial.', 'Ainda há tarefas em aberto neste mês.')}
        ${grande ? aviso('erro', 'fa-triangle-exclamation', 'Texto longo demais para uma postagem.', 'O fórum aceita até 63 mil caracteres por mensagem.') : ''}
        <div class="flex flex-wrap gap-2"><button type="button" class="btn-pri" data-acao="copiar-bb" data-foco><i class="fa-solid fa-copy"></i>Copiar BBCode</button><button type="button" class="btn-sec" data-acao="fechar">Fechar</button></div>
        <div class="previa">${bbParaHtml(S.bb)}</div>
      </div>`, { largo: true });
  }

  async function copiar(texto, msg) {
    let ok = false;
    try { await navigator.clipboard.writeText(texto); ok = true; } catch (_) {
      const t = document.createElement('textarea');
      t.value = texto;
      t.setAttribute('readonly', '');
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      try { ok = document.execCommand('copy'); } catch (__) { ok = false; }
      t.remove();
    }
    toast(ok ? msg || 'Copiado.' : 'Não foi possível copiar. Selecione e copie manualmente.', ok ? '' : 'erro');
  }

  /* ==================================================================
     MODAL E TOASTS
     ================================================================== */
  function abrirBase(html, op) {
    op = op || {};
    if (el.modal.hidden) S.focoAntes = document.activeElement;
    el.toasts.innerHTML = '';
    S.aoFecharModal = op.aoFechar || null;
    el.modal.innerHTML = html;
    el.modal.hidden = false;
    document.body.classList.add('overflow-hidden');
    const alvo = el.modal.querySelector(op.foco || '[data-foco]') || el.modal.querySelector('[data-modal-acao]:last-of-type') || el.modal.querySelector('.fechar');
    if (alvo) alvo.focus({ preventScroll: true });
  }
  function abrirDialogo(html, op) {
    abrirBase(`<div class="dialogo${op && op.largo ? ' dialogo-largo' : ''}">${html}</div>`, op);
  }
  function abrirModal({ tipo, titulo, corpo, acoes, aoFechar }) {
    S.acoesModal = acoes;
    const icone = tipo === 'sucesso' ? 'fa-check' : tipo === 'erro' ? 'fa-xmark' : 'fa-question';
    abrirBase(`<div class="modal-caixa">
      <div class="modal-icone ${tipo}"><i class="fa-solid ${icone}"></i></div>
      <h3 class="mt-4 font-titulo text-[28px] font-bold uppercase leading-none tracking-[.03em] text-texto">${esc(titulo)}</h3>
      <div class="mt-3 space-y-3 text-sm leading-relaxed text-nevoa/80">${corpo}</div>
      <div class="mt-6 grid gap-2.5 grid-cols-1 sm:auto-cols-fr sm:grid-flow-col">${acoes.map((a, i) => `<button type="button" class="${a.classe || 'btn-sec'}" data-modal-acao="${i}">${a.icone ? `<i class="fa-solid ${a.icone}"></i>` : ''}<span>${esc(a.rotulo)}</span></button>`).join('')}</div>
    </div>`, { aoFechar });
  }
  function fecharModal() {
    if (el.modal.hidden) return;
    el.modal.hidden = true;
    el.modal.innerHTML = '';
    document.body.classList.remove('overflow-hidden');
    const f = S.aoFecharModal;
    S.aoFecharModal = null;
    S.acoesModal = [];
    if (f) f();
    if (S.focoAntes && document.contains(S.focoAntes)) S.focoAntes.focus({ preventScroll: true });
    if (S.renderPendente && podeRedesenhar()) { S.renderPendente = false; renderTudo(); }
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
  function prenderFoco(e) {
    const focaveis = [...el.modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(x => !x.closest('[hidden]'));
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
    // Troca com um círculo que se abre a partir do botão.
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
     EVENTOS
     ================================================================== */
  function irPara(aba) {
    if (!abasVisiveis().some(a => a.id === aba)) return;
    S.aba = aba;
    gravarLocal(CHAVE_ABA, aba);
    renderAbas();
    renderConteudo();
  }
  function navegarAbas(e) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const botoes = [...el.abas.querySelectorAll('[data-aba]')];
    const i = botoes.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? botoes.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + botoes.length) % botoes.length;
    irPara(botoes[j].dataset.aba);
    const novo = el.abas.querySelector(`[data-aba="${botoes[j].dataset.aba}"]`);
    if (novo) novo.focus();
  }

  function aoClicar(e) {
    const m = e.target.closest('[data-modal-acao]');
    if (m && el.modal.contains(m)) { const a = S.acoesModal[+m.dataset.modalAcao]; if (a) a.acao(); return; }
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const d = b.dataset;
    switch (d.acao) {
      case 'fechar': fecharModal(); break;
      case 'recarregar': carregar(); break;
      case 'ir': irPara(d.aba); break;
      case 'detalhe': abrirDetalhe(d.chave); break;
      case 'registrar': abrirFormulario(d.chave, d.papel, 'registrar'); break;
      case 'justificar': abrirFormulario(d.chave, d.papel, 'justificar'); break;
      case 'tipo': S.tipoQuadro = d.tipo; renderConteudo(); break;
      case 'versao': S.versaoEscala = d.vigencia; renderConteudo(); break;
      case 'pessoa': abrirPessoa(d.nick, d.papel); break;
      case 'relatorio': abrirRelatorio(); break;
      case 'copiar-bb': copiar(S.bb, 'BBCode copiado.'); break;
      case 'copiar': copiar(d.texto, 'Nicks copiados.'); break;
      case 'trocar': trocarNome(); break;
      case 'descartar': descartarEdicao(); break;
      case 'publicar': abrirPublicar(); break;
      case 'nova-funcao': abrirFormFuncao(''); break;
      case 'editar-funcao': abrirFormFuncao(d.chave); break;
      case 'cancelar-funcao': abrirCancelarFuncao(d.chave); break;
      default: break;
    }
  }
  function aoDigitar(e) {
    const c = e.target;
    if (c.dataset.campo === 'busca-quadro') { S.buscaQuadro = c.value; aplicarBuscas(); }
    else if (c.dataset.campo === 'busca-escala') { S.buscaEscala = c.value; aplicarBuscas(); }
    else if (c.dataset.k && S.ed) digitarEdicao(c);
  }
  function aoMudar(e) {
    const c = e.target;
    if (c.name === 'vigencia' && S.ed) { S.ed.escolha = c.value; renderConteudo(); }
    else if (c.dataset.campo === 'vigencia-outra' && S.ed) { S.ed.outra = c.value; renderConteudo(); }
  }

  function ligarEventos() {
    el.tema.addEventListener('click', alternarTema);
    el.abas.addEventListener('click', e => { const b = e.target.closest('[data-aba]'); if (b) irPara(b.dataset.aba); });
    el.abas.addEventListener('keydown', navegarAbas);
    el.mes.addEventListener('change', () => { if (el.mes.value && el.mes.value !== S.mes) { S.mes = el.mes.value; carregar(); } });
    document.addEventListener('click', aoClicar);
    el.conteudo.addEventListener('input', aoDigitar);
    el.conteudo.addEventListener('change', aoMudar);
    el.conteudo.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-acao], .funcao-cartao')) { e.preventDefault(); e.target.click(); }
    });
    el.conteudo.addEventListener('focusout', () => setTimeout(() => { if (S.renderPendente && podeRedesenhar() && el.modal.hidden) { S.renderPendente = false; renderTudo(); } }, 0));
    el.modal.addEventListener('click', e => { if (e.target === el.modal) fecharModal(); });
    el.modal.addEventListener('change', e => { if (e.target.form && e.target.form.id === 'form-registro') { atualizarFormulario(); limparErroCampo(e.target); } });
    el.modal.addEventListener('input', e => { if (e.target.form) { limparErroCampo(e.target); if (e.target.form.id === 'form-funcao') digitarFuncao(e.target); } });
    el.modal.addEventListener('submit', e => {
      e.preventDefault();
      if (e.target.id === 'form-registro') enviarFormulario(e.target);
      else if (e.target.id === 'form-publicar') enviarPublicacao(e.target);
      else if (e.target.id === 'form-funcao') enviarFuncao(e.target);
      else if (e.target.id === 'form-cancelar-funcao') enviarCancelamento(e.target);
    });
    document.addEventListener('keydown', e => {
      if (el.modal.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); fecharModal(); }
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
    window.addEventListener('beforeunload', e => { if (alteracoes().length) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && S.dados && Date.now() - S.atualizadoEm > 60000) carregar({ silencioso: true }); });
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
    const seq = ++S.seq;
    S.carregando = true;
    if (!op.silencioso) { S.erro = ''; renderMes(); if (!S.dados || S.dados.mes !== S.mes) renderConteudo(); }
    let erro = '';
    try {
      const params = { mes: S.mes || '' };
      if (S.usuario) params.nick = S.usuario.nick;
      const r = await api('get', params);
      if (seq !== S.seq) return;
      S.dados = r;
      S.mes = r.mes;
      S.atualizadoEm = Date.now();
      indexar();
    } catch (e) {
      erro = e.message;
    }
    if (seq !== S.seq) return;
    S.carregando = false;
    S.erro = erro;
    if (podeRedesenhar() && (el.modal.hidden || !op.silencioso)) renderTudo();
    else { S.renderPendente = true; renderUsuario(); renderAvisos(); renderHoje(); renderAbas(); renderMes(); }
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

  // Abre em Minhas tarefas quando há algo para registrar; senão, na última aba usada.
  function escolherAbaInicial() {
    if (S.abaUrl) return;
    const minhas = minhasTarefas();
    if (minhas.some(x => x.aberta)) S.aba = 'minhas';
    else if (!S.abaSalva) S.aba = minhas.length ? 'minhas' : 'quadro';
  }

  function lerUrl() {
    const p = new URLSearchParams(location.search), daUrl = p.get('aba'), salva = lerLocal(CHAVE_ABA);
    if (ABAS.some(a => a.id === daUrl)) { S.aba = daUrl; S.abaUrl = true; }
    else if (ABAS.some(a => a.id === salva)) { S.aba = salva; S.abaSalva = true; }
    const mes = p.get('mes');
    if (/^\d{4}-\d{2}$/.test(mes || '')) S.mes = mes;
  }

  async function iniciar() {
    el.ano.textContent = new Date().getFullYear();
    pintarBotaoTema();
    lerUrl();
    if (!S.aba) S.aba = 'minhas';
    ligarEventos();
    renderTudo();
    await carregarSessao();
    renderUsuario();
    renderAvisos();
    await carregar();
    escolherAbaInicial();
    renderTudo();
    setInterval(() => { if (!document.hidden && el.modal.hidden && !S.carregando && S.dados) carregar({ silencioso: true }); }, CFG.ATUALIZAR_SEGUNDOS * 1000);
  }

  // Exposto para testes e para depuração pelo console.
  window.ESCALAS_AF = {
    CFG, S,
    recarregar: () => carregar(),
    async reiniciar() {
      fecharModal();
      Object.assign(S, { dados: null, erro: '', ed: null, senha: '', bb: '', aba: 'minhas', abaUrl: false, abaSalva: false, animada: '', buscaQuadro: '', buscaEscala: '', versaoEscala: '', tipoQuadro: '', mes: '' });
      el.usuarioAvatar.dataset.falhou = '';
      S.sessao = 'verificando';
      renderTudo();
      await carregarSessao();
      await carregar();
      escolherAbaInicial();
      renderTudo();
    },
    gerarRelatorio, bbParaHtml
  };

  iniciar();
})();