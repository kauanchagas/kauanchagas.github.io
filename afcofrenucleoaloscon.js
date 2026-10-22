/* =====================================================================
   [AF] COFRE DE MEDALHAS · NÚCLEO
   Configuração e funções usadas pelo formulário (afcofredemedalhas.js)
   e pelo sistema de atualização do tópico (afcofresistema.js).
   Hierarquia, motivos e endereços ficam só aqui.
   ===================================================================== */
(() => {
  'use strict';
  if (window.CofreNucleo) return;

  /* ==================================================================
     CONFIGURAÇÃO GERAL
     ================================================================== */
  const CFG = {
    // URL do App da Web do Apps Script (termina em /exec)
    API: 'https://script.google.com/macros/s/AKfycbzfmRN-hriiVNQT5xtYwudv8hpzXnMpcfDCoS1P29rpVcC8vfJxXqjyjXhtMvlUY1XL/exec',
    // Precisa ser igual ao TOKEN do Apps Script
    TOKEN: 'cofre-af-2026',
    // Brasão da Auditoria Fiscal (rodapé da postagem)
    BRASAO_AF: 'https://i.imgur.com/4hxJJig.png',
    // Quantos dias para trás aparecem na lista de períodos de meta
    JANELA_PERIODOS_DIAS: 120,
    // 'grupo': a postagem usa a cor do brasão do grupo · 'af': sempre o verde da Auditoria Fiscal
    TEMA_DA_POSTAGEM: 'grupo',
    // Limite por postagem de subgrupo (grupo interno)
    LIMITE_SUBGRUPO: { Companhias: 20, Subcompanhias: 10 },
    // Motivos que só aceitam este valor (sempre negativo)
    MEDALHAS_FIXAS: { rebaixamento: 50, saida: 50, expulsao: 100 },

    /* ---------- sistema de atualização (cartões e botões no tópico do cofre) ---------- */
    // A partir desta data a fiscalização confere o teto do período (antes não há registros).
    TETO_INICIO: '2026-11-01',
    // Página de gratificações do RCCSystem usada no botão de preenchimento automático
    RCCSYSTEM: 'https://system.policercc.com.br/requerimentos/gratificacoes-gerais',
    // Acima deste valor (em medalhas, por policial) a fiscalização pede conferência em motivos sem limite
    ALERTA_VALOR_ALTO: 200,
    // Cabeça do avatar mostrada nos modais ({nick} é trocado pelo nickname)
    AVATAR: 'https://www.habbo.com.br/habbo-imaging/avatarimage?user={nick}&headonly=1&size=m&direction=2&head_direction=3&gesture=sml',
    // Grupos e cargos sem porcentagem: a fiscalização não procura porcentagem para eles.
    // A aba Fontes da planilha de registros pode mudar isso sem mexer no código.
    SEM_PORCENTAGEM: {
      grupos: ['AF', 'RAIO', 'GATE', 'COR', 'GTI'],
      cargos: ['Vice-líder', 'Líder', 'Presidente', 'Diretor-Geral', 'Vice-Diretor']
    }
  };

  /* ==================================================================
     HIERARQUIA DOS GRUPOS DE TAREFAS
     Para mudar a hierarquia, edite as linhas c(...) de cada grupo:
       c('Nome do cargo', 'Sigla', periodicidade, positivas, negativas, 'SEÇÃO NA CONTABILIDADE')
       periodicidade: 'semanal' | 'quinzenal' | 'mensal'
       positivas: limite por cumprimento de meta, ou [mínimo, máximo]
       negativas: valor exato por não cumprimento de meta (sem valor ou 0 = não há)
       seção na contabilidade: só quando o nome da seção na planilha de contabilidade
         não for o plural do cargo (ex.: Membro da Corregedoria fica em CORREGEDORES)
     A sigla serve só de referência: a postagem e a planilha usam o nome.
     Outros campos do grupo:
       topico / topicoInterno: tópicos do cofre e do grupo interno (temporárias)
       subgrupos: lista do grupo interno, no formato 'Nome (SIGLA)'
       cor: '#hex' fixa a cor do grupo (sem ela, a cor é lida do brasão)
       corPostagem: '#hex' cor só da postagem, quando for diferente da cor do formulário
       reserva: cor usada se o brasão não puder ser lido
     ================================================================== */
  const c = (nome, sigla, periodo, positivas, negativas, contabil) => ({ nome, sigla, periodo, positivas, negativas: negativas || 0, contabil: contabil || '' });

  const GRUPOS = [
    /* ----------------------------- COMPANHIAS ----------------------------- */
    {
      id: 'INS', nome: 'Instrutores', categoria: 'Companhias',
      topico: 36742, topicoInterno: 36763,
      brasao: 'https://i.imgur.com/e77NfOO.png', reserva: '#3B6FE0',
      subgrupos: ['Departamento de Aplicação (DA)', 'Setor de Segurança (SS)', 'Setor de Relações Comunicativas (SRC)'],
      cargos: [
        c('Instrutor', 'INS', 'semanal', [5, 15], 10),
        c('Avaliador', 'Av.INS', 'semanal', 15, 15),
        c('Capacitador', 'Cap.INS', 'quinzenal', 25, 25),
        c('Estagiário', 'Est.INS', 'semanal', 15, 15),
        c('Ministro', 'Min.INS', 'semanal', 15, 15),
        c('Vice-líder', 'VL.INS', 'mensal', 65),
        c('Líder', 'L.INS', 'mensal', 65)
      ]
    },
    {
      id: 'TRE', nome: 'Treinadores', categoria: 'Companhias',
      topico: 36743, topicoInterno: 36764,
      brasao: 'https://i.imgur.com/xZYaP9V.png', reserva: '#E5484D',
      subgrupos: ['Conselho Penal dos Treinadores (CPT)', 'Comitê de Intendência (CDI)', 'Comitê de Marketing (CMT)'],
      cargos: [
        c('Treinador Nível I', 'TRE.1', 'semanal', 10, 10),
        c('Treinador Nível II', 'TRE.2', 'semanal', 10, 10),
        c('Treinador Nível III', 'TRE.3', 'quinzenal', 20, 20),
        c('Graduador', 'Grad.TRE', 'quinzenal', 25, 25),
        c('Estagiário', 'Est.TRE', 'semanal', 15, 15),
        c('Ministro', 'Min.TRE', 'semanal', 15, 15),
        c('Vice-líder', 'VL.TRE', 'mensal', 65),
        c('Líder', 'L.TRE', 'mensal', 65)
      ]
    },
    {
      id: 'SUP', nome: 'Supervisores', categoria: 'Companhias',
      topico: 36744, topicoInterno: 36765,
      brasao: 'https://i.imgur.com/QQakws9.png', reserva: '#2FBF71',
      subgrupos: ['Departamento de Aplicação (DA)', 'Divisão de Investigação e Segurança (DIS)', 'Departamento de Comunicação e Interatividade (DCI)'],
      cargos: [
        c('Supervisor', 'SUP', 'semanal', 10, 10),
        c('Tutor', 'Tut.SUP', 'semanal', 15, 15),
        c('Fiscalizador', 'Fisc.SUP', 'semanal', 15, 15),
        c('Graduador', 'Grad.SUP', 'quinzenal', 25, 25),
        c('Estagiário', 'Est.SUP', 'semanal', 15, 15),
        c('Ministro', 'Min.SUP', 'semanal', 15, 15),
        c('Vice-líder', 'VL.SUP', 'mensal', 65),
        c('Líder', 'L.SUP', 'mensal', 65)
      ]
    },
    {
      id: 'PROF', nome: 'Professores', categoria: 'Companhias',
      topico: 36745, topicoInterno: 36766,
      brasao: 'https://i.imgur.com/FkuzGeD.png', reserva: '#9B6BF2',
      subgrupos: ['Serviço de Proteção dos Professores (SPP)', 'Departamento de Aplicação (DA)', 'Comissão de Desenvolvimento Cultural (CDC)'],
      cargos: [
        c('Professor', 'PROF', 'semanal', 10, 10),
        c('Coordenador', 'Coord.PROF', 'semanal', 10, 10),
        c('Graduador', 'Grad.PROF', 'quinzenal', 25, 25),
        c('Estagiário', 'Est.PROF', 'semanal', 15, 15),
        c('Conselheiro', 'Cons.PROF', 'semanal', 15, 15),
        c('Vice-líder', 'VL.PROF', 'mensal', 65),
        c('Líder', 'L.PROF', 'mensal', 65)
      ]
    },
    {
      id: 'EFE', nome: 'Escola de Formação de Executivos', categoria: 'Companhias',
      topico: 36746, topicoInterno: 36767,
      brasao: 'https://i.imgur.com/bZ6v2Yd.png', reserva: '#38BDF8',
      subgrupos: ['Departamento de Repressão a Infrações (DRI)', 'Departamento de Aplicação (DA)'],
      cargos: [
        c('Professor', 'EFE', 'semanal', 10, 10),
        c('Mentor', 'Men.EFE', 'semanal', 15, 15),
        c('Graduador', 'Grad.EFE', 'quinzenal', 25, 25),
        c('Estagiário', 'Est.EFE', 'semanal', 15, 15),
        c('Ministro', 'Min.EFE', 'semanal', 15, 15),
        c('Vice-líder', 'VL.EFE', 'mensal', 65),
        c('Líder', 'L.EFE', 'mensal', 65)
      ]
    },

    /* ---------------------------- SUBCOMPANHIAS ---------------------------- */
    {
      id: 'CFO', nome: 'Centro de Formação de Oficiais', categoria: 'Subcompanhias',
      topico: 36751,
      brasao: 'https://i.imgur.com/nAvj7Ke.png', reserva: '#F2A33A',
      cargos: [
        c('Professor', 'P.CFO', 'quinzenal', 20),
        c('Avaliador', 'Av.CFO', 'semanal', 10),
        c('Fiscalizador', 'Fisc.CFO', 'quinzenal', 20),
        c('Estagiário', 'Est.CFO', 'semanal', 10),
        c('Conselheiro', 'Cons.CFO', 'semanal', 10),
        c('Vice-Líder', 'VL.CFO', 'mensal', 40),
        c('Líder', 'L.CFO', 'mensal', 40)
      ]
    },
    {
      id: 'CRH', nome: 'Centro de Recursos Humanos', categoria: 'Subcompanhias',
      topico: 36747,
      brasao: 'https://i.imgur.com/nV6qVoo.png', reserva: '#14B8A6',
      cargos: [
        c('Membro', 'M.CRH', 'mensal', 40),
        c('Fiscal', 'F.CRH', 'mensal', 40),
        c('Vice-Líder', 'VL.CRH', 'mensal', 40),
        c('Líder', 'L.CRH', 'mensal', 40)
      ]
    },
    {
      id: 'SRP', nome: 'Setor de Relações Públicas', categoria: 'Subcompanhias',
      topico: 36750,
      brasao: 'https://i.imgur.com/P9decp0.png', cor: '#3F3F46', reserva: '#3F3F46',
      cargos: [
        c('Auxiliar', 'Aux.SRP', 'mensal', 25, 25),
        c('Assistente', 'Ass.SRP', 'mensal', 35, 35),
        c('Vice-Líder', 'VL.SRP', 'mensal', 40),
        c('Líder', 'L.SRP', 'mensal', 40)
      ]
    },
    {
      id: 'AF', nome: 'Auditoria Fiscal', categoria: 'Subcompanhias',
      topico: 36755,
      brasao: 'https://i.imgur.com/I2EnXaw.png', cor: '#1A560C', reserva: '#1A560C',
      cargos: [
        c('Auditor', 'A.AF', 'mensal', 30, 30),
        c('Agente Supervisor', 'AS.AF', 'mensal', 30, 30),
        c('Secretário', 'S.AF', 'mensal', 40, 40),
        c('Vice-Diretor', 'VL.AF', 'mensal', 40),
        c('Diretor-Geral', 'L.AF', 'mensal', 40)
      ]
    },
    {
      id: 'ECE', nome: 'Esquadrão do Corpo Executivo', categoria: 'Subcompanhias',
      topico: 36753,
      brasao: 'https://i.imgur.com/UpnkYJM.png', reserva: '#DC2626',
      cargos: [
        c('Instrutor', 'Ins.ECE', 'quinzenal', 15, 15),
        c('Superintendente', 'Supe.ECE', 'quinzenal', 20, 20),
        c('Coordenador', 'Coord.ECE', 'mensal', 45)
      ]
    },
    {
      id: 'DC', nome: 'Departamento de Comunicação', categoria: 'Subcompanhias',
      topico: 36754, topicoInterno: 40036,
      brasao: 'https://i.imgur.com/jq6syb2.png', cor: '#FFFFFF', corPostagem: '#9CA3AF', reserva: '#FFFFFF',
      cargos: [
        c('Analista', 'A.DC', 'mensal', 40),
        c('Supervisor', 'Sup.DC', 'mensal', 40),
        c('Gerente', 'Ger.DC', 'mensal', 45),
        c('Diretor', 'Dir.DC', 'mensal', 45),
        c('Vice-Líder', 'VL.DC', 'mensal', 50),
        c('Líder', 'L.DC', 'mensal', 50)
      ]
    },
    {
      id: 'ROND', nome: 'Organizadores de Rondas', categoria: 'Subcompanhias',
      topico: 36748, topicoInterno: 36769,
      brasao: 'https://i.imgur.com/1m9tmmR.png', reserva: '#EAB308',
      subgrupos: ['Repartição de Inteligência e Proteção (RIP)', 'Departamento de Aplicação (DA)'],
      cargos: [
        c('Organizador de Rondas', 'ROND', 'semanal', 10, 10, 'RONDEIROS'),
        c('Tutor', 'Tut.ROND', 'semanal', 10, 10),
        c('Graduador', 'Grad.ROND', 'quinzenal', 20, 20),
        c('Estagiário', 'Est.ROND', 'semanal', 10, 10),
        c('Ministro', 'Min.ROND', 'semanal', 10, 10),
        c('Vice-líder', 'VL.ROND', 'mensal', 40),
        c('Líder', 'L.ROND', 'mensal', 40)
      ]
    },
    {
      id: 'CEM', nome: 'Centro de Elitização Militar', categoria: 'Subcompanhias',
      topico: 36752,
      brasao: 'https://i.imgur.com/OLohJFK.png', reserva: '#94A3B8',
      cargos: [
        c('Membro', 'M.CEM', 'semanal', 10, 10),
        c('Assistente', 'Ass.CEM', 'semanal', 10, 10),
        c('Diretor', 'Dir.CEM', 'semanal', 10, 10),
        c('Vice-líder', 'VL.CEM', 'mensal', 40),
        c('Líder', 'L.CEM', 'mensal', 40)
      ]
    },

    /* -------------------------------- ÓRGÃOS -------------------------------- */
    {
      id: 'COG', nome: 'Corpo de Oficiais Generais', categoria: 'Órgãos',
      topico: 36761,
      brasao: 'https://i.imgur.com/LVYETAw.png', reserva: '#D4AF37',
      cargos: [
        c('Membro', 'M.COG', 'quinzenal', 10),
        c('Ministro', 'Min.COG', 'quinzenal', 10),
        c('Vice-Presidente', 'VP.COG', 'quinzenal', 10),
        c('Presidente', 'Pres.COG', 'quinzenal', 10)
      ]
    },
    {
      id: 'COR', nome: 'Corregedoria', categoria: 'Órgãos',
      topico: 36757,
      brasao: 'https://i.imgur.com/1XDbOSt.png', cor: '#000000', reserva: '#000000',
      cargos: [
        c('Membro', 'COR', 'mensal', 30, 0, 'CORREGEDORES'),
        c('Presidente', 'Pres.COR', 'mensal', 30)
      ]
    },
    {
      id: 'DIR', nome: 'Diretoria do Corpo Executivo', categoria: 'Órgãos',
      topico: 36762,
      brasao: 'https://i.imgur.com/ZKBddNH.png', reserva: '#5FD500',
      cargos: [
        c('Membro', 'DIR', 'quinzenal', 20, 0, 'DIRETORES'),
        c('Secretário', 'S.DIR', 'quinzenal', 20),
        c('Vice-Presidente', 'VP.DIR', 'mensal', 30),
        c('Presidente', 'Pres.DIR', 'mensal', 30)
      ]
    },
    {
      id: 'GATE', nome: 'Grupamento de Ações Táticas Especiais', categoria: 'Órgãos',
      topico: 36759,
      brasao: 'https://i.imgur.com/J7HA5LG.png', reserva: '#B91C1C',
      cargos: [
        c('Instrutor', 'GATE', 'mensal', 30),
        c('Coordenador', 'Coord.GATE', 'mensal', 30, 0, 'COORDENAÇÃO')
      ]
    },
    {
      id: 'RAIO', nome: 'Repartição de Ações Interventivas e Ostensivas', categoria: 'Órgãos',
      topico: 36760,
      brasao: 'https://i.imgur.com/dGf72ta.png', reserva: '#C62828',
      cargos: [
        c('Agente', 'RAIO', 'quinzenal', 15),
        c('Comandante', 'Cmdt.RAIO', 'quinzenal', 15, 0, 'COMANDO'),
        c('Diretor', 'Dir.RAIO', 'quinzenal', 15)
      ]
    },
    {
      id: 'PMJ', nome: 'Procuradoria Militar de Justiça', categoria: 'Órgãos',
      topico: 36758,
      brasao: 'https://i.imgur.com/wiUHcLt.png', cor: '#737373', reserva: '#737373',
      cargos: [
        c('Procurador', 'PMJ', 'mensal', 30),
        c('Vice-Procurador-Geral', 'VPG.PMJ', 'mensal', 30),
        c('Procurador-Geral', 'PG.PMJ', 'mensal', 30)
      ]
    },
    {
      id: 'GTI', nome: 'Gabinete de Tecnologia e Inovação', categoria: 'Órgãos',
      topico: 39832,
      brasao: 'https://i.imgur.com/EyBP2ll.png', reserva: '#06B6D4',
      cargos: [
        c('Analista', 'A.GTI', 'mensal', 100, 20),
        c('Coordenador', 'Coord.GTI', 'mensal', 30),
        c('Vice-Diretor', 'VL.GTI', 'mensal', 40, 0, 'VICE-DIREÇÃO'),
        c('Diretor', 'L.GTI', 'mensal', 40, 0, 'DIREÇÃO')
      ]
    }
  ];

  /* ==================================================================
     MOTIVOS
       restrito: bloqueia oficiais do Corpo Militar e portadores de EI/EA
       subgrupo: disponível na postagem de subgrupo
       grupos: só aparece para esses grupos
     ================================================================== */
  const MOTIVOS = [
    { id: 'meta', rotulo: 'Cumprimento de meta', icone: 'fa-circle-check', tom: 'pos', periodico: true, subgrupo: true },
    { id: 'nao-meta', rotulo: 'Não cumprimento de meta', icone: 'fa-circle-xmark', tom: 'neg', periodico: true },
    { id: 'rebaixamento', rotulo: 'Rebaixamento', icone: 'fa-angles-down', tom: 'neg', restrito: true },
    { id: 'expulsao', rotulo: 'Expulsão', icone: 'fa-user-xmark', tom: 'neg', restrito: true },
    { id: 'saida', rotulo: 'Saída precoce', icone: 'fa-door-open', tom: 'neg' },
    { id: 'infracao', rotulo: 'Infração', icone: 'fa-triangle-exclamation', tom: 'neg' },
    { id: 'correcao', rotulo: 'Correção de medalhas', icone: 'fa-pen-to-square', tom: 'neu', subgrupo: true },
    { id: 'funcao-extra', rotulo: 'Função extra', icone: 'fa-star', tom: 'extra', grupos: ['DC'] }
  ];

  /* ------------------------------------------------------------------
     Daqui para baixo não há configuração.
     ------------------------------------------------------------------ */

  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const POR_PERIODO = { semanal: 'por semana', quinzenal: 'por quinzena', mensal: 'por mês' };
  const TEMA_AF = {
    borda: '#1A560C', fundo: '#162612', destaque: '#65B026', brilho: 'rgba(101,176,38,.22)',
    linha: 'rgba(101,176,38,.22)', faixa: 'rgba(101,176,38,.08)', chip: 'rgba(101,176,38,.10)', suave: 'rgba(255,255,255,.58)',
    pos: '#4ADE80', neg: '#F87171'
  };
  const COR_VAZIO = '#6F8574';
  const CHAVE_COR = 'af-cofre:cor:v1:';
  const CHAVE_DIM = 'af-cofre:dim:v1:';
  // Caixa (largura e altura máximas) dos brasões da postagem
  const BRASAO_CAIXA = 112;
  const RODAPE_CAIXA = 22;

  /* ==================================================================
     UTILITÁRIOS
     ================================================================== */
  const AMP = String.fromCharCode(38);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => AMP + '#' + ch.charCodeAt(0) + ';');
  const semAcento = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normal = s => semAcento(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const limparNick = s => String(s == null ? '' : s).normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ').trim();
  const chaveNick = s => limparNick(s).toLowerCase();
  const limparBB = s => String(s == null ? '' : s).replace(/\[/g, '(').replace(/\]/g, ')').replace(/[<>]/g, '').replace(/[\r\n]+/g, ' ');
  const dois = n => String(n).padStart(2, '0');
  const maiuscula = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const juntarE = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
  const decodificarHtml = s => { const t = document.createElement('textarea'); t.innerHTML = String(s || ''); return t.value; };
  const espera = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- cores ---------- */
  function hexRgb(hex) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function rgbHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hslHex(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = n => { const k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return rgbHex(f(0) * 255, f(8) * 255, f(4) * 255);
  }
  function luminancia(hex) {
    const [r, g, b] = hexRgb(hex).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * r + .7152 * g + .0722 * b;
  }
  function rgba(hex, a) { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; }
  // Tema escuro: clareia só o necessário para ler sobre fundo escuro, sem perder o tom.
  function corLegivel(hex, alvo = .28) {
    const [h, s0, l0] = rgbHsl(...hexRgb(hex));
    if (s0 < .12) return hslHex(0, 0, .55 + l0 * .45); // preto, cinzas e branco mantêm a ordem de claridade
    const s = Math.max(s0, .45);
    let l = l0, out = hslHex(h, s, l);
    for (let i = 0; i < 100 && luminancia(out) < alvo && l < .9; i++) { l += .01; out = hslHex(h, s, l); }
    return out;
  }
  // Tema claro: escurece só o necessário para ler sobre fundo branco.
  function corLegivelClaro(hex, alvo = .18) {
    const [h, s0, l0] = rgbHsl(...hexRgb(hex));
    if (s0 < .12) return hslHex(0, 0, .1 + l0 * .36);
    const s = Math.max(s0, .5);
    let l = Math.min(l0, .55), out = hslHex(h, s, l);
    for (let i = 0; i < 100 && luminancia(out) > alvo && l > .08; i++) { l -= .01; out = hslHex(h, s, l); }
    return out;
  }

  /* ---------- datas ---------- */
  const dia = (y, m, d) => new Date(y, m, d);
  const hoje0 = () => { const h = new Date(); return dia(h.getFullYear(), h.getMonth(), h.getDate()); };
  const somaDias = (d, n) => dia(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const ultimoDia = (y, m) => new Date(y, m + 1, 0).getDate();
  const fmtData = d => `${dois(d.getDate())} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
  const fmtPeriodo = (a, b) => (b && +b !== +a ? `${fmtData(a)} a ${fmtData(b)}` : fmtData(a));
  const nomeMes = d => maiuscula(MESES_LONGOS[d.getMonth()]) + ' de ' + d.getFullYear();

  // Semanas de domingo a sábado, quinzenas 1 a 15 e 16 ao fim, meses inteiros.
  function gerarPeriodos(tipo, ref = hoje0(), janela = CFG.JANELA_PERIODOS_DIAS) {
    const limite = somaDias(ref, -janela), lista = [];
    if (tipo === 'semanal') {
      let ini = somaDias(ref, -ref.getDay());
      for (let i = 0; i < 400; i++) {
        const fim = somaDias(ini, 6);
        if (fim < limite) break;
        lista.push({ ini, fim });
        ini = somaDias(ini, -7);
      }
    } else if (tipo === 'quinzenal') {
      let y = ref.getFullYear(), m = ref.getMonth(), segunda = ref.getDate() > 15;
      for (let i = 0; i < 400; i++) {
        const ini = segunda ? dia(y, m, 16) : dia(y, m, 1);
        const fim = segunda ? dia(y, m, ultimoDia(y, m)) : dia(y, m, 15);
        if (fim < limite) break;
        lista.push({ ini, fim });
        if (segunda) segunda = false;
        else { segunda = true; m--; if (m < 0) { m = 11; y--; } }
      }
    } else {
      let y = ref.getFullYear(), m = ref.getMonth();
      for (let i = 0; i < 400; i++) {
        const ini = dia(y, m, 1), fim = dia(y, m, ultimoDia(y, m));
        if (fim < limite) break;
        lista.push({ ini, fim });
        m--; if (m < 0) { m = 11; y--; }
      }
    }
    return lista.map(p => Object.assign(p, { texto: fmtPeriodo(p.ini, p.fim), emAndamento: p.fim >= ref }));
  }

  function indiceMes(txt) {
    const t = normal(txt).replace(/\.$/, '');
    for (let i = 0; i < 12; i++) {
      if (t === normal(MESES[i]) || t === normal(MESES_LONGOS[i])) return i;
    }
    return -1;
  }
  function interpretarData(txt) {
    const s = normal(txt);
    let d, m, y, r;
    if ((r = s.match(/^(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4})$/))) { d = +r[1]; m = +r[2] - 1; y = +r[3]; }
    else if ((r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { y = +r[1]; m = +r[2] - 1; d = +r[3]; }
    else if ((r = s.match(/^(\d{1,2})(?: de)? ([a-z]{3,9})\.?(?: de)? (\d{4})$/))) { d = +r[1]; m = indiceMes(r[2]); y = +r[3]; }
    else return null;
    if (m < 0 || m > 11 || y < 2000 || y > 2100 || d < 1 || d > ultimoDia(y, m)) return null;
    return dia(y, m, d);
  }
  // Aceita "01 Jan 2026", "01 Jan 2026 a 15 Jan 2026", "01/01/2026 a 15/01/2026"... e devolve sempre no padrão.
  function interpretarPeriodo(txt) {
    const s = String(txt == null ? '' : txt).replace(/[\u2012-\u2015]/g, '-').replace(/\s+/g, ' ').trim();
    if (!s) return null;
    const partes = s.split(/\s+(?:a|ate|até|-)\s+/i);
    if (partes.length > 2) return null;
    const ini = interpretarData(partes[0]);
    if (!ini) return null;
    if (partes.length === 1) return { ini, fim: ini, texto: fmtData(ini) };
    const fim = interpretarData(partes[1]);
    if (!fim || fim < ini) return null;
    return { ini, fim, texto: fmtPeriodo(ini, fim) };
  }

  /* ---------- nicknames ---------- */
  // Separa por barra ou quebra de linha, guardando a posição de cada nick no texto.
  function tokens(texto) {
    const out = [], re = /[^\/\n\r]+/g;
    let m;
    while ((m = re.exec(texto))) {
      const bruto = m[0], nick = bruto.trim();
      if (!nick) continue;
      const ini = m.index + (bruto.length - bruto.replace(/^\s+/, '').length);
      out.push({ nick, ini, fim: ini + nick.length, chave: chaveNick(nick) });
    }
    return out;
  }

  /* ==================================================================
     GRUPOS, CARGOS E MOTIVOS
     ================================================================== */
  const temSubgrupos = g => !!(g && g.subgrupos && g.subgrupos.length && g.topicoInterno);
  const faixaPositiva = cg => (Array.isArray(cg.positivas) ? cg.positivas : [1, cg.positivas]);
  const limiteSubgrupo = g => CFG.LIMITE_SUBGRUPO[g.categoria] || 10;
  const apiConfigurada = () => /^https:\/\//i.test(CFG.API) && !/COLE_AQUI/i.test(CFG.API);
  // Cor lida de cada brasão (preenchida por corDoBrasao)
  const cores = new Map();
  const corGrupo = g => (g && (g.cor || cores.get(g.id) || g.reserva)) || '#65B026';
  // 'Setor de Segurança (SS)' vira { nome: 'Setor de Segurança', sigla: 'SS' }
  function partesSubgrupo(s) {
    const txt = String(s || '').trim(), m = txt.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
    return m ? { nome: m[1].trim(), sigla: m[2].trim() } : { nome: txt, sigla: '' };
  }
  const chaveBusca = s => normal(s).replace(/[^a-z0-9]+/g, ' ').trim();
  const motivoPorId = id => MOTIVOS.find(m => m.id === id) || null;
  const grupoPorId = id => GRUPOS.find(g => g.id === id) || null;
  function grupoPorNome(nome) {
    const k = chaveBusca(nome);
    return k ? GRUPOS.find(g => chaveBusca(g.nome) === k || chaveBusca(g.id) === k) || null : null;
  }
  // Tópico do cofre -> { grupo, interno }. interno: tópico das medalhas temporárias.
  function grupoPorTopico(t) {
    const n = Number(t);
    const g = n ? GRUPOS.find(x => x.topico === n || x.topicoInterno === n) : null;
    return g ? { grupo: g, interno: g.topicoInterno === n } : null;
  }
  function cargoPorNome(g, nome) {
    if (!g) return null;
    const k = chaveBusca(String(nome || '').replace(/\s*\([^)]*\)\s*$/, '')), ks = chaveBusca(nome);
    return g.cargos.find(cg => chaveBusca(cg.nome) === k || chaveBusca(cg.sigla) === ks) || null;
  }
  function subgrupoPorNome(g, nome) {
    if (!g || !g.subgrupos) return '';
    const k = chaveBusca(String(nome || '').replace(/\s*\([^)]*\)\s*$/, '')), ks = chaveBusca(nome);
    return g.subgrupos.find(s => {
      const p = partesSubgrupo(s);
      return chaveBusca(p.nome) === k || chaveBusca(s) === ks || (p.sigla && chaveBusca(p.sigla) === k);
    }) || '';
  }
  // "Fulano / ,youiz / Tony," vira ['Fulano', ',youiz', 'Tony,']
  const partirPoliciais = txt => String(txt == null ? '' : txt).split(/\s*[\/\n\r]+\s*/).map(limparNick).filter(Boolean);

  // Lê o motivo gravado na planilha e devolve o id do motivo e o cargo ou subgrupo citado.
  function motivoDoTexto(texto) {
    const t = String(texto || '').replace(/\s+/g, ' ').trim();
    let r;
    if ((r = t.match(/^Cumprimento de suas obriga\S* no subgrupo (.+?)\.?$/i))) return { id: 'meta', interno: true, subgrupo: r[1] };
    if ((r = t.match(/^N\S+ cumprimento de suas obriga\S* como (.+?)\.?$/i))) return { id: 'nao-meta', cargo: r[1] };
    if ((r = t.match(/^Cumprimento de suas obriga\S* como (.+?)\.?$/i))) return { id: 'meta', cargo: r[1] };
    const k = chaveBusca(t);
    if (/^cumprimento de funcao extra/.test(k)) return { id: 'funcao-extra' };
    if (/^rebaixamento/.test(k)) return { id: 'rebaixamento' };
    if (/^expulsao/.test(k)) return { id: 'expulsao' };
    if (/^saida precoce/.test(k)) return { id: 'saida' };
    if (/^infracao/.test(k)) return { id: 'infracao' };
    if (/^correcao/.test(k)) return { id: 'correcao' };
    return { id: '' };
  }

  // Texto do motivo, igual ao que o formulário escreve na postagem.
  function textoMotivo({ motivo, cargo, subgrupo, interno }) {
    const m = motivoPorId(motivo);
    if (!m) return '';
    const nomeCargo = cargo ? (cargo.nome || String(cargo)) : '';
    switch (m.id) {
      case 'meta': return interno ? `Cumprimento de suas obrigações no subgrupo ${partesSubgrupo(subgrupo).nome}.` : `Cumprimento de suas obrigações como ${nomeCargo}.`;
      case 'nao-meta': return `Não cumprimento de suas obrigações como ${nomeCargo}.`;
      case 'rebaixamento': return 'Rebaixamento no grupo de tarefas.';
      case 'expulsao': return 'Expulsão do grupo de tarefas.';
      case 'saida': return 'Saída precoce do grupo de tarefas.';
      case 'infracao': return 'Infração cometida no grupo de tarefas.';
      case 'correcao': return 'Correção de medalhas distribuídas.';
      case 'funcao-extra': return 'Cumprimento de função extra no Departamento de Comunicação.';
      default: return '';
    }
  }

  /* ==================================================================
     REGRAS DO NÚMERO DE MEDALHAS
     ================================================================== */
  function regraMedalhas({ grupo, motivo, cargo, interno }) {
    const m = motivoPorId(motivo);
    if (!m) return null;
    if (m.id === 'meta') {
      if (interno) {
        if (!grupo) return { sinal: 1, pendente: true };
        const lim = limiteSubgrupo(grupo);
        return { sinal: 1, min: 1, max: lim, dica: `Até ${lim} medalhas temporárias.`, erroMax: `O limite por subgrupo é de ${lim} medalhas.` };
      }
      if (!cargo) return { sinal: 1, pendente: true, dica: 'Escolha o cargo para ver o limite.' };
      const [mn, mx] = faixaPositiva(cargo), por = POR_PERIODO[cargo.periodo] || '';
      return {
        sinal: 1, min: mn, max: mx,
        dica: mn > 1 ? `Entre ${mn} e ${mx} medalhas ${por}.` : `Até ${mx} medalhas ${por}.`,
        erroMin: `O mínimo para ${cargo.nome} é de ${mn} medalhas.`,
        erroMax: `O limite para ${cargo.nome} é de ${mx} medalhas.`
      };
    }
    if (m.id === 'nao-meta') {
      if (!cargo) return { sinal: -1, pendente: true, dica: 'Escolha o cargo para ver o valor.' };
      if (!cargo.negativas) return { sinal: -1, bloqueio: `${cargo.nome} não tem medalhas negativas previstas por não cumprimento de meta.` };
      return { sinal: -1, fixo: cargo.negativas, dica: `Valor fixo do cargo, ${POR_PERIODO[cargo.periodo] || ''}.` };
    }
    const fixo = CFG.MEDALHAS_FIXAS[m.id];
    if (fixo) return { sinal: -1, fixo, dica: `Valor fixo para ${m.rotulo.toLowerCase()}.` };
    if (m.id === 'correcao') return { sinal: 0, min: 1, dica: 'Toque no sinal para alternar entre positivas e negativas.' };
    if (m.id === 'funcao-extra') return { sinal: 1, min: 1, dica: 'Sem limite de medalhas.' };
    return { sinal: -1, min: 1, dica: 'Quantidade de medalhas negativas.' };
  }

  // Grupo ou cargo que não publica porcentagem (vale como padrão da aba Fontes).
  function semPorcentagem(grupo, cargo) {
    const sp = CFG.SEM_PORCENTAGEM || {};
    if (grupo && (sp.grupos || []).includes(grupo.id)) return true;
    const k = chaveBusca(cargo ? (cargo.nome || cargo) : '');
    return !!k && (sp.cargos || []).some(x => chaveBusca(x) === k);
  }

  // Nomes possíveis da seção na planilha de contabilidade, do mais específico ao mais geral.
  function secoesContabil(grupo, alvo, interno) {
    if (interno) {
      const p = partesSubgrupo(alvo);
      return [p.sigla, p.nome].filter(Boolean);
    }
    const cg = typeof alvo === 'string' ? (cargoPorNome(grupo, alvo) || { nome: alvo }) : alvo;
    return cg ? [cg.contabil, cg.nome, cg.sigla].filter(Boolean) : [];
  }

  /* ==================================================================
     APPS SCRIPT
     ================================================================== */
  async function api(acao, dados = {}) {
    if (!apiConfigurada()) throw new Error('o formulário ainda não está ligado ao Apps Script');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    let resp;
    try {
      resp = await fetch(CFG.API, { method: 'POST', body: JSON.stringify(Object.assign({ acao, token: CFG.TOKEN }, dados)), signal: ctrl.signal });
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'o servidor demorou demais para responder' : 'falha de conexão com o servidor');
    } finally {
      clearTimeout(timer);
    }
    let j;
    try { j = await resp.json(); } catch (_) { throw new Error('o servidor devolveu uma resposta inválida'); }
    if (!j || !j.ok) throw new Error((j && j.erro) || 'o servidor recusou a operação');
    return j;
  }

  /* ==================================================================
     FÓRUM
     ================================================================== */
  async function obterUsuario() {
    const html = await (await fetch('/forum', { credentials: 'same-origin', cache: 'no-store' })).text();
    const logado = html.match(/_userdata\["session_logged_in"\]\s*=\s*(\d)/);
    if (logado && logado[1] !== '1') return null;
    const m = html.match(/_userdata\["username"\]\s*=\s*"((?:[^"\\]|\\.)*)"/);
    if (!m) throw new Error('sessão ilegível');
    let nome = '';
    try { nome = JSON.parse('"' + m[1] + '"'); } catch (_) { nome = m[1].replace(/\\(.)/g, '$1'); }
    nome = decodificarHtml(nome).trim();
    return nome && !/^(anonymous|visitante|convidado)$/i.test(nome) ? nome : null;
  }

  // Procura no HTML devolvido pelo fórum o link da mensagem nova (deste tópico).
  function extrairPostagem(html, t) {
    const achados = [];
    const re = /href=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(String(html || '')))) {
      const url = decodificarHtml(m[1]);
      const doTopico = new RegExp('/t' + t + '(?:p\\d+)?-|[?;\\x26]t=' + t + '(?:[^0-9]|$)').test(url);
      let id = null;
      const ancora = url.match(/#p?(\d{4,})$/);
      const param = url.match(/viewtopic\?(?:[^#]*[?;\x26])?p=(\d{4,})/i);
      if (ancora && doTopico) id = ancora[1];
      else if (param) id = param[1];
      if (id) achados.push({ id, url });
    }
    if (!achados.length) {
      const r = String(html || '').match(new RegExp('url=([^"\'>\\s]*(?:/t' + t + '(?:p\\d+)?-|t=' + t + ')[^"\'>\\s#]*#(\\d{4,}))', 'i'));
      if (r) achados.push({ id: r[2], url: decodificarHtml(r[1]) });
    }
    if (!achados.length) return null;
    achados.sort((a, b) => Number(b.id) - Number(a.id));
    return achados[0];
  }

  // Lê a última página do tópico e acha a mensagem pelos dados postados.
  async function localizarPostagem(t, marcadores) {
    const ler = async url => new DOMParser().parseFromString(await (await fetch(url, { credentials: 'same-origin', cache: 'no-store' })).text(), 'text/html');
    const primeira = await ler(`/t${t}-`);
    let maior = 0;
    const rePag = new RegExp('/t' + t + 'p(\\d+)-');
    primeira.querySelectorAll('a[href]').forEach(a => { const m = (a.getAttribute('href') || '').match(rePag); if (m) maior = Math.max(maior, Number(m[1])); });
    const pagina = maior ? await ler(`/t${t}p${maior}-`) : primeira;
    const base = maior ? `/t${t}p${maior}-` : `/t${t}-`;
    const alvos = marcadores.filter(Boolean).map(chaveNick);
    let achado = 0;
    pagina.querySelectorAll('[id]').forEach(n => {
      if (!/^p\d+$/.test(n.id)) return;
      const txt = chaveNick((n.textContent || '').replace(/\s+/g, ' '));
      if (alvos.every(a => txt.includes(a))) achado = Math.max(achado, Number(n.id.slice(1)));
    });
    return achado ? { id: String(achado), url: `${base}#${achado}` } : null;
  }

  async function postarNoTopico(t, mensagem, marcadores) {
    let r1;
    try {
      r1 = await fetch('/post?' + new URLSearchParams({ t: String(t), mode: 'reply' }).toString(), { credentials: 'same-origin', cache: 'no-store' });
    } catch (_) {
      throw new Error('Não foi possível abrir o tópico do cofre. Confira sua conexão.');
    }
    const doc = new DOMParser().parseFromString(await r1.text(), 'text/html');
    const form = [...doc.forms].find(f => f.querySelector('textarea[name="message"]'));
    if (!form) throw new Error('O fórum não abriu o formulário de resposta. Confira se você pode responder no tópico do cofre.');
    const fd = new FormData();
    form.querySelectorAll('input[type="hidden"][name]').forEach(i => fd.append(i.name, i.value));
    fd.set('message', mensagem);
    fd.set('mode', 'reply');
    fd.set('t', String(t));
    fd.set('post', '1');

    let r2;
    try {
      r2 = await fetch('/post', { method: 'POST', body: fd, credentials: 'same-origin' });
    } catch (_) {
      throw new Error('A conexão caiu durante a postagem. Confira o tópico antes de tentar de novo.');
    }
    const html = await r2.text();
    if (!r2.ok) throw new Error(`O fórum respondeu ${r2.status}. Confira o tópico antes de tentar de novo.`);

    const achado = extrairPostagem(html, t);
    if (achado) return achado;

    const sucesso = (r2.redirected && /\/t\d+|viewtopic/.test(r2.url)) || /sucesso|successfully/i.test(html) || /http-equiv=["']?refresh[^>]*(viewtopic|\/t\d+)/i.test(html);
    if (sucesso) {
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        if (tentativa) await espera(1500);
        const loc = await localizarPostagem(t, marcadores).catch(() => null);
        if (loc) return loc;
      }
      return { id: '', url: r2.redirected ? r2.url : '' };
    }

    const caixa = new DOMParser().parseFromString(html, 'text/html').querySelector('.errorwrap, .errorbox, .box-error, .error, #message-box .content');
    const msg = caixa ? caixa.textContent.replace(/\s+/g, ' ').trim().slice(0, 180) : '';
    if (/flood/i.test(msg) || /antiflood/i.test(html)) throw new Error('O fórum pediu um intervalo entre postagens. Aguarde alguns segundos e tente de novo.');
    throw new Error((msg ? msg + (/[.!?]$/.test(msg) ? ' ' : '. ') : '') + 'Não deu para confirmar a postagem. Confira o tópico antes de tentar de novo.');
  }

  /* ==================================================================
     TAMANHO DOS BRASÕES
     O fórum respeita a largura e a altura do [img(Lpx,Apx)]; por isso a postagem
     leva o tamanho proporcional ao arquivo real, medido aqui no navegador.
     ================================================================== */
  const DIMENSOES = new Map(), MEDINDO = new Map();
  function dimensaoSalva(url) {
    try {
      const m = (localStorage.getItem(CHAVE_DIM + url) || '').match(/^(\d+)x(\d+)$/);
      return m ? { w: +m[1], h: +m[2] } : null;
    } catch (_) { return null; }
  }
  function dimensao(url) {
    if (!DIMENSOES.has(url)) { const d = dimensaoSalva(url); if (d) DIMENSOES.set(url, d); }
    return DIMENSOES.get(url) || null;
  }
  function medirImagem(url, limite = 8000) {
    if (!url) return Promise.resolve(null);
    if (MEDINDO.has(url)) return MEDINDO.get(url);
    const p = new Promise(res => {
      const img = new Image();
      const fim = v => { clearTimeout(t); img.onload = img.onerror = null; res(v); };
      const t = setTimeout(() => fim(null), limite);
      img.onload = () => fim(img.naturalWidth > 0 && img.naturalHeight > 0 ? { w: img.naturalWidth, h: img.naturalHeight } : null);
      img.onerror = () => fim(null);
      img.decoding = 'async';
      img.src = url;
    }).then(d => {
      if (d) {
        DIMENSOES.set(url, d);
        try { localStorage.setItem(CHAVE_DIM + url, d.w + 'x' + d.h); } catch (_) { /* sem armazenamento */ }
      } else MEDINDO.delete(url); // tenta de novo na próxima vez
      return d || dimensao(url);
    });
    MEDINDO.set(url, p);
    return p;
  }
  const medirBrasoes = () => [CFG.BRASAO_AF, ...GRUPOS.map(g => g.brasao)].forEach(u => { medirImagem(u); });

  // Cabe a imagem numa caixa de lado "caixa", mantendo a proporção do arquivo.
  function imagemBB(url, caixa) {
    const d = dimensao(url);
    let w = caixa, h = caixa;
    if (d) {
      const k = Math.min(caixa / d.w, caixa / d.h);
      w = Math.max(1, Math.round(d.w * k));
      h = Math.max(1, Math.round(d.h * k));
    }
    return { w, h, bb: `[img(${w}px,${h}px)]${url}[/img]` };
  }

  /* ==================================================================
     POSTAGEM (BBCode)
     ================================================================== */
  function temaPostagem(g) {
    if (!g || CFG.TEMA_DA_POSTAGEM === 'af' || g.id === 'AF') return TEMA_AF;
    const base = g.corPostagem || corGrupo(g);
    const [h, s, l] = rgbHsl(...hexRgb(base));
    if (s < .12) {
      // preto e cinzas: o cartão assume o próprio tom (preto, cinza escuro, cinza), limitado para o texto branco seguir legível
      const lf = Math.min(Math.max(l, .04), .42), claro = lf > .2;
      const destaque = hslHex(h, s, Math.min(.95, .8 + lf * .36));
      return {
        borda: hslHex(h, s, lf + .12), fundo: hslHex(h, s, lf), destaque,
        brilho: rgba(destaque, .12), linha: rgba(destaque, claro ? .3 : .22), faixa: rgba(destaque, claro ? .1 : .08), chip: rgba(destaque, claro ? .14 : .1),
        suave: claro ? 'rgba(255,255,255,.82)' : 'rgba(255,255,255,.58)',
        pos: claro ? '#86EFAC' : '#4ADE80', neg: claro ? '#FECACA' : '#F87171'
      };
    }
    const destaque = corLegivel(base, .27);
    return {
      borda: hslHex(h, Math.min(Math.max(s, .4), .78), .22),
      fundo: hslHex(h, Math.min(s, .42) * .9, .095),
      destaque,
      brilho: rgba(destaque, .22),
      linha: rgba(destaque, .22),
      faixa: rgba(destaque, .08),
      chip: rgba(destaque, .1),
      suave: 'rgba(255,255,255,.58)',
      pos: '#4ADE80', neg: '#F87171'
    };
  }

  // Dados da postagem prontos para o BBCode. cargo pode ser o objeto do cargo ou só o nome.
  function modeloPostagem({ grupo, motivo, interno, cargo, subgrupo, periodo, numero, policiais, responsavel, temporarias }) {
    const m = motivoPorId(motivo);
    const cargoTxt = interno ? partesSubgrupo(subgrupo).nome : (cargo ? (cargo.nome || String(cargo)) : '');
    return {
      tema: temaPostagem(grupo),
      brasao: (grupo && grupo.brasao) || CFG.BRASAO_AF,
      kicker: temporarias ? 'COFRE DE MEDALHAS TEMPORÁRIAS' : 'COFRE DE MEDALHAS',
      titulo: m ? m.rotulo : '',
      responsavel: limparBB(responsavel),
      grupo: grupo ? grupo.nome : '',
      rotuloCargo: interno ? 'SUBGRUPO REFERENTE' : 'CARGO REFERENTE',
      cargo: limparBB(cargoTxt),
      periodo: periodo || '',
      numero: numero == null ? null : numero,
      natureza: temporarias ? 'temporárias' : 'efetivas',
      policiais: (policiais || []).map(limparBB),
      motivoTexto: limparBB(textoMotivo({ motivo, cargo, subgrupo, interno }))
    };
  }

  // O fórum centraliza o texto das células, desenha linha em cada [tr] e mede as células com
  // box-sizing:border-box; por isso tudo vai explícito.
  const bb0 = (margem = '0') => `border:none!important;border-collapse:separate;border-spacing:0;width:100%;margin:${margem}`;
  const BB0 = bb0();
  const TR0 = 'border:none!important';
  const FONTE = 'font-family:Poppins,sans-serif';
  const bbT = (estilo, miolo, extra = '') => `[table style="${estilo}"${extra}]${miolo}[/table]`;
  const bbR = (miolo, estilo) => `[tr style="${TR0}${estilo ? ';' + estilo : ''}"]${miolo}[/tr]`;
  const bbD = (estilo, miolo) => `[td style="${/text-align/.test(estilo) ? estilo : estilo + ';text-align:left'}"]${miolo}[/td]`;
  const bbRotulo = (txt, t) => bbD(`border:none!important;padding:0;${FONTE};text-align:left;color:${t.destaque};font-size:11px;font-weight:700;line-height:16px;letter-spacing:.14em`, txt);
  const bbCelula = (rot, val, t) => bbD(`border:none!important;flex:1 1 160px;min-width:0;padding:0 0 12px;vertical-align:top;text-align:left;${FONTE}`,
    bbT(BB0, bbR(bbRotulo(rot, t)) + bbR(bbD(`border:none!important;padding:3px 0 0;${FONTE};text-align:left;color:#FFFFFF;font-size:15px;font-weight:600;line-height:22px`, val))));
  const bbLinha = celulas => bbT(BB0, bbR(celulas.join(''), 'display:flex;flex-wrap:wrap;column-gap:20px'));

  function gerarBBCode(m) {
    const t = m.tema;
    const br = imagemBB(m.brasao, BRASAO_CAIXA);
    const sobe = Math.round(br.h * .43);
    const cabecalho = bbT(BB0, bbR(
      bbD(`border:none!important;box-sizing:content-box;width:${br.w}px;padding:0 0 0 18px;vertical-align:top`,
        bbT(`border:none!important;border-collapse:separate;border-spacing:0;width:auto;margin:-${sobe}px 0 0;position:relative`,
          bbR(bbD(`border:none!important;box-sizing:content-box;width:${br.w}px;padding:0;line-height:0`, br.bb)))) +
      bbD(`border:none!important;padding:18px 20px 0 14px;vertical-align:top;${FONTE};text-align:left`,
        bbT(BB0,
          bbR(bbD(`border:none!important;padding:0;${FONTE};text-align:left;color:${t.destaque};font-size:11px;font-weight:700;line-height:16px;letter-spacing:.18em`, m.kicker)) +
          bbR(bbD(`border:none!important;padding:2px 0 0;${FONTE};text-align:left;color:#FFFFFF;font-size:21px;font-weight:800;line-height:27px;letter-spacing:-.01em`, m.titulo))))));

    const campos = bbT(`${BB0};border-top:1px solid ${t.linha}!important`, bbR(bbD('border:none!important;padding:16px 0 0',
      bbLinha([bbCelula('RESPONSÁVEL', m.responsavel, t), bbCelula('GRUPO DE TAREFAS', m.grupo, t)]) +
      bbLinha([bbCelula(m.rotuloCargo, m.cargo, t), bbCelula('PERÍODO DE REFERÊNCIA', m.periodo, t)]))));

    const n = m.numero;
    const corNum = n == null ? COR_VAZIO : n > 0 ? t.pos : t.neg;
    const numTxt = n == null ? '0' : (n > 0 ? '+' : '-') + Math.abs(n);
    const medalhas = bbT(`${bb0('4px 0 0')};border-radius:12px;background:${t.faixa};box-shadow:inset 0 0 0 1px ${t.linha}`,
      bbR(bbD(`border:none!important;padding:12px 16px;text-align:left;${FONTE}`,
        bbT(BB0,
          bbR(bbRotulo('NÚMERO DE MEDALHAS', t)) +
          bbR(
            bbD(`border:none!important;padding:2px 0 0;${FONTE};text-align:left;color:${corNum};font-size:28px;font-weight:800;line-height:34px;letter-spacing:-.01em;white-space:nowrap`, numTxt) +
            bbD(`border:none!important;padding:0 0 5px;${FONTE};text-align:left;color:${t.suave};font-size:13px;font-weight:600;line-height:18px`, `medalhas ${m.natureza}`),
            'display:flex;flex-wrap:wrap;align-items:flex-end;column-gap:8px')))));

    const total = m.policiais.length;
    const chips = total
      ? m.policiais.map(p => bbD(`border:none!important;padding:5px 12px;border-radius:999px;background:${t.chip};box-shadow:inset 0 0 0 1px ${t.linha};${FONTE};text-align:center;color:#FFFFFF;font-size:13px;font-weight:600;line-height:18px;white-space:nowrap`, p)).join('')
      : bbD(`border:none!important;padding:4px 0;${FONTE};text-align:left;color:${COR_VAZIO};font-size:13px`, 'Nenhum policial informado');
    const policiais = bbT(bb0('18px 0 0'), bbR(bbRotulo(`POLICIAIS · ${total}`, t))) +
      bbT(bb0('8px 0 0'), bbR(chips, 'display:flex;flex-wrap:wrap;gap:6px'));

    const motivoBloco = bbT(`${bb0('20px 0 0')};box-shadow:inset 3px 0 0 ${t.destaque}`, bbR(bbD(`border:none!important;padding:2px 0 2px 16px;text-align:left;${FONTE}`,
      bbT(BB0, bbR(bbRotulo('MOTIVO', t)) + bbR(bbD(`border:none!important;padding:3px 0 0;${FONTE};color:#FFFFFF;font-size:15px;line-height:25px;text-align:justify;hyphens:auto;-webkit-hyphens:auto`, m.motivoTexto))))));

    const af = imagemBB(CFG.BRASAO_AF, RODAPE_CAIXA);
    const rodape = bbT(`${bb0('20px 0 0')};border-top:1px solid ${t.linha}!important`, bbR(
      bbD(`border:none!important;box-sizing:content-box;width:${af.w}px;padding:14px 8px 0 0;vertical-align:middle;text-align:left;line-height:0`, af.bb) +
      bbD(`border:none!important;padding:14px 0 0 4px;vertical-align:middle;${FONTE};text-align:left;color:${t.suave};font-size:10px;font-weight:700;line-height:14px;letter-spacing:.22em`, 'AUDITORIA FISCAL')));

    const cartao = bbT(`border:none!important;border-collapse:separate;border-spacing:0;width:100%;margin:0;border-radius:16px;border:2px solid ${t.borda}!important;box-shadow:inset 0 70px 60px -60px ${t.brilho},0 18px 30px -20px rgba(0,0,0,.55)`,
      bbR(bbD('border:none!important;padding:0', cabecalho)) +
      bbR(bbD('border:none!important;padding:14px 22px 22px', campos + medalhas + policiais + motivoBloco + rodape)),
      ` bgcolor="${t.fundo}"`);

    return bbT(`border:none!important;border-collapse:separate;border-spacing:0;width:100%;max-width:620px;margin:0 auto;${FONTE}`, bbR(bbD(`border:none!important;padding:${sobe + 2}px 0 0`, cartao)));
  }

  /* ==================================================================
     COR DOS BRASÕES
     ================================================================== */
  async function corDoBrasao(url) {
    try { const c0 = localStorage.getItem(CHAVE_COR + url); if (c0) return c0; } catch (_) { /* sem armazenamento */ }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((ok, falha) => { img.onload = ok; img.onerror = falha; img.src = url; });
    const N = 56, cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, N, N);
    const px = ctx.getImageData(0, 0, N, N).data;
    const bins = Array.from({ length: 24 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = (y * N + x) * 4;
        if (px[i + 3] < 160) continue;
        const r = px[i], g = px[i + 1], b = px[i + 2];
        const [h, s, l] = rgbHsl(r, g, b);
        if (s < .25 || l < .12 || l > .88) continue;
        const dx = (x + .5) / N - .5, dy = (y + .5) / N - .5;
        const centro = Math.max(0, 1 - Math.hypot(dx, dy) / .62);
        let w = s * (.4 + .6 * centro) * (1 - Math.abs(l - .5));
        if (h >= 38 / 360 && h <= 58 / 360) w *= .7; // moldura dourada pesa menos
        const k = Math.floor(h * 24) % 24;
        bins[k].w += w; bins[k].r += r * w; bins[k].g += g * w; bins[k].b += b * w;
      }
    }
    let melhor = -1, maior = 0;
    for (let k = 0; k < 24; k++) {
      const v = bins[k].w + .5 * (bins[(k + 23) % 24].w + bins[(k + 1) % 24].w);
      if (v > maior) { maior = v; melhor = k; }
    }
    if (melhor < 0) throw new Error('sem cor');
    let W = 0, R = 0, G = 0, B = 0;
    [melhor - 1, melhor, melhor + 1].forEach(k => { const x = bins[(k + 24) % 24]; W += x.w; R += x.r; G += x.g; B += x.b; });
    const hex = rgbHex(R / W, G / W, B / W);
    try { localStorage.setItem(CHAVE_COR + url, hex); } catch (_) { /* sem armazenamento */ }
    return hex;
  }

  /* ==================================================================
     RCCSYSTEM
     ================================================================== */
  const VERSAO = 2;

  // "dos Instrutores", "da Escola de Formação de Executivos", "do Departamento de Comunicação"
  function deGrupo(g) {
    const nome = g ? g.nome : '';
    const primeira = chaveBusca(nome).split(' ')[0] || '';
    const femininas = ['escola', 'auditoria', 'companhia', 'subcompanhia', 'reparticao', 'divisao', 'equipe', 'diretoria', 'procuradoria', 'corregedoria', 'academia'];
    if (femininas.includes(primeira)) return 'da ' + nome;
    if (/(es|os)$/.test(primeira)) return 'dos ' + nome;
    return 'do ' + nome;
  }

  // Link que abre o requerimento de gratificação do RCCSystem já preenchido.
  // alvos: nicknames separados por barra (o RCCSystem aceita "/").
  function linkRccsystem({ temporarias, nick, grupo, periodo, alvos, medalhas, motivo }) {
    const p = new URLSearchParams();
    p.set('form', temporarias ? 'grat_temporaria' : 'grat_efetiva_grupos');
    if (nick) p.set('nick', nick);
    if (!temporarias && grupo) p.set('companyUnit', grupo.nome || grupo);
    if (periodo) p.set('period', periodo);
    if (alvos && alvos.length) p.set('targets', alvos.join('/'));
    if (medalhas != null) p.set('medals', String(medalhas));
    if (motivo) {
      // Nas temporárias o RCCSystem não pede o grupo, então ele vai no motivo.
      let txt = motivo;
      if (temporarias && grupo && /no subgrupo/i.test(txt) && txt.indexOf(grupo.nome) === -1) txt = txt.replace(/\.?\s*$/, ' ' + deGrupo(grupo) + '.');
      p.set('reason', txt);
    }
    return CFG.RCCSYSTEM + '?' + p.toString();
  }

  window.CofreNucleo = {
    versao: VERSAO,
    CFG, GRUPOS, MOTIVOS, MESES, MESES_LONGOS, POR_PERIODO, TEMA_AF, COR_VAZIO, BRASAO_CAIXA, RODAPE_CAIXA,
    esc, semAcento, normal, limparNick, chaveNick, limparBB, dois, maiuscula, juntarE, decodificarHtml, espera, chaveBusca,
    hexRgb, rgbHex, rgbHsl, hslHex, luminancia, rgba, corLegivel, corLegivelClaro,
    dia, hoje0, somaDias, ultimoDia, fmtData, fmtPeriodo, nomeMes, gerarPeriodos, indiceMes, interpretarData, interpretarPeriodo,
    tokens, partirPoliciais,
    temSubgrupos, faixaPositiva, limiteSubgrupo, apiConfigurada, cores, corGrupo, partesSubgrupo,
    motivoPorId, grupoPorId, grupoPorNome, grupoPorTopico, cargoPorNome, subgrupoPorNome, motivoDoTexto, textoMotivo, regraMedalhas,
    semPorcentagem, secoesContabil,
    api, obterUsuario, extrairPostagem, localizarPostagem, postarNoTopico,
    dimensao, medirImagem, medirBrasoes, imagemBB, temaPostagem, modeloPostagem, gerarBBCode, corDoBrasao,
    linkRccsystem
  };
})();
