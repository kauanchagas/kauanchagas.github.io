(() => {
  'use strict';

  /* ==================================================================
     CONFIGURAÇÃO GERAL
     ================================================================== */
  const CFG = {
    API: 'https://script.google.com/macros/s/AKfycbxz8LEOHNNpDBeFep5Q5jd7Ryey2SSROdksvmKkZpxS1VgPWzYBmNgNAxDTNxsw4q9R/exec',
    TOKEN: 'cofre-af-2026',
    BRASAO_AF: 'https://i.imgur.com/4hxJJig.png',
    // Quantos dias para trás aparecem na lista de períodos de meta
    JANELA_PERIODOS_DIAS: 120,
    TEMA_DA_POSTAGEM: 'grupo',
    LIMITE_SUBGRUPO: { Companhias: 20, Subcompanhias: 10 },
    MEDALHAS_FIXAS: { rebaixamento: 50, saida: 50, expulsao: 100 }
  };

  /* ==================================================================
     HIERARQUIA DOS GRUPOS DE TAREFAS
     Para mudar a hierarquia, edite as linhas c(...) de cada grupo:
       c('Nome do cargo', 'Sigla', periodicidade, positivas, negativas)
       periodicidade: 'semanal' | 'quinzenal' | 'mensal'
       positivas: limite por cumprimento de meta, ou [mínimo, máximo]
       negativas: valor exato por não cumprimento de meta (sem valor = não há)
     A sigla serve só de referência: a postagem e a planilha usam o nome.
     Outros campos do grupo:
       topico / topicoInterno: tópicos do cofre e do grupo interno (temporárias)
       subgrupos: lista do grupo interno, no formato 'Nome (SIGLA)'
       cor: '#hex' fixa a cor do grupo (sem ela, a cor é lida do brasão)
       corPostagem: '#hex' cor só da postagem, quando for diferente da cor do formulário
       reserva: cor usada se o brasão não puder ser lido
     ================================================================== */
  const c = (nome, sigla, periodo, positivas, negativas) => ({ nome, sigla, periodo, positivas, negativas: negativas || 0 });

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
        c('Organizador de Rondas', 'ROND', 'semanal', 10, 10),
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
        c('Membro', 'COR', 'mensal', 30),
        c('Presidente', 'Pres.COR', 'mensal', 30)
      ]
    },
    {
      id: 'DIR', nome: 'Diretoria do Corpo Executivo', categoria: 'Órgãos',
      topico: 36762,
      brasao: 'https://i.imgur.com/ZKBddNH.png', reserva: '#5FD500',
      cargos: [
        c('Membro', 'DIR', 'quinzenal', 20),
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
        c('Coordenador', 'Coord.GATE', 'mensal', 30)
      ]
    },
    {
      id: 'RAIO', nome: 'Repartição de Ações Interventivas e Ostensivas', categoria: 'Órgãos',
      topico: 36760,
      brasao: 'https://i.imgur.com/dGf72ta.png', reserva: '#C62828',
      cargos: [
        c('Agente', 'RAIO', 'quinzenal', 15),
        c('Comandante', 'Cmdt.RAIO', 'quinzenal', 15),
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
        c('Vice-Diretor', 'VL.GTI', 'mensal', 40),
        c('Diretor', 'L.GTI', 'mensal', 40)
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
  const CHAVE_PENDENTES = 'af-cofre:pendentes';
  const CHAVE_COR = 'af-cofre:cor:v1:';
  const CHAVE_DIM = 'af-cofre:dim:v1:';
  const CHAVE_TEMA = 'af-cofre:tema';
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
  const decodificarHtml = s => { const t = document.createElement('textarea'); t.innerHTML = String(s || ''); return t.value; };
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const midiaClaro = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  const midiaReduzido = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const movimentoReduzido = () => !!(midiaReduzido && midiaReduzido.matches);

  // Só reescreve o conteúdo quando ele muda (evita repetir animações e trabalho à toa).
  function definirHtml(no, conteudo) {
    if (no.__html === conteudo) return false;
    no.__html = conteudo;
    no.innerHTML = conteudo;
    return true;
  }
  function reanimar(no, classe) {
    no.classList.remove(classe);
    void no.offsetWidth;
    no.classList.add(classe);
    no.addEventListener('animationend', () => no.classList.remove(classe), { once: true });
  }

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
     ESTADO
     ================================================================== */
  const S = {
    sessao: 'carregando', usuario: '',
    grupo: null, interno: false, motivo: null, cargo: null, subgrupo: '',
    periodo: '', numero: '', sinalCorrecao: 1,
    verif: new Map(), verifPend: new Set(), verifFalha: new Set(), verifErro: '', especializacoesOk: true,
    tocado: new Set(), cores: new Map(), enviando: false, ultimaAssinatura: '', aoFecharModal: null
  };

  const el = {};
  ['usuario', 'usuario-avatar', 'usuario-icone', 'usuario-rotulo', 'usuario-nome', 'tema', 'avisos', 'formulario', 'campos',
    'responsavel', 'responsavel-estado', 'responsavel-msg', 'sel-grupo', 'subgrupo', 'subgrupo-siglas', 'segmento',
    'motivos', 'texto-slot', 'icone-slot', 'sel-cargo', 'sel-subgrupo', 'numero-caixa', 'sinal', 'numero',
    'numero-cadeado', 'numero-dica', 'numero-msg', 'sel-periodo', 'periodo', 'periodo-msg', 'rotulo-policiais', 'contador',
    'hl-fundo', 'policiais', 'alertas', 'envio', 'anel-barra', 'anel-texto', 'envio-titulo', 'envio-sub', 'destino',
    'checklist', 'enviar', 'enviar-icone', 'enviar-texto', 'ano', 'modal', 'modal-icone', 'modal-titulo', 'modal-corpo',
    'modal-acoes', 'toasts']
    .forEach(id => { el[id.replace(/-([a-z])/g, (_, x) => x.toUpperCase())] = document.getElementById(id); });
  el.secoes = [...document.querySelectorAll('.secao[data-secao]')];

  const motivo = () => MOTIVOS.find(m => m.id === S.motivo) || null;
  const motivoRestrito = () => !!(motivo() && motivo().restrito);
  const temSubgrupos = g => !!(g && g.subgrupos && g.subgrupos.length && g.topicoInterno);
  const faixaPositiva = cg => (Array.isArray(cg.positivas) ? cg.positivas : [1, cg.positivas]);
  const limiteSubgrupo = g => CFG.LIMITE_SUBGRUPO[g.categoria] || 10;
  const apiConfigurada = () => /^https:\/\//i.test(CFG.API) && !/COLE_AQUI/i.test(CFG.API);
  const corGrupo = g => (g && (g.cor || S.cores.get(g.id) || g.reserva)) || '#65B026';
  const tonsGrupo = g => { const b = corGrupo(g); return { e: corLegivel(b), c: corLegivelClaro(b) }; };
  const varsTom = k => `--ce:${k.e};--cc:${k.c}`;
  // 'Setor de Segurança (SS)' vira { nome: 'Setor de Segurança', sigla: 'SS' }
  function partesSubgrupo(s) {
    const txt = String(s || '').trim(), m = txt.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
    return m ? { nome: m[1].trim(), sigla: m[2].trim() } : { nome: txt, sigla: '' };
  }

  function motivosDisponiveis() {
    if (!S.grupo) return MOTIVOS.filter(m => !m.grupos);
    if (S.interno) return MOTIVOS.filter(m => m.subgrupo);
    return MOTIVOS.filter(m => !m.grupos || m.grupos.includes(S.grupo.id));
  }
  const modoSlot = () => (S.interno ? 'subgrupo' : 'cargo');
  function destino() {
    if (!S.grupo) return null;
    const temporarias = !!(S.interno || S.motivo === 'funcao-extra');
    return { topico: temporarias ? S.grupo.topicoInterno : S.grupo.topico, temporarias };
  }
  const modoPeriodo = () => (!motivo() || (motivo().periodico && !S.interno) ? 'lista' : 'livre');

  function textoMotivo() {
    const m = motivo();
    if (!m) return '';
    const cargo = S.cargo ? S.cargo.nome : '';
    switch (m.id) {
      case 'meta': return S.interno ? `Cumprimento de suas obrigações no subgrupo ${partesSubgrupo(S.subgrupo).nome}.` : `Cumprimento de suas obrigações como ${cargo}.`;
      case 'nao-meta': return `Não cumprimento de suas obrigações como ${cargo}.`;
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
  function regraNumero() {
    const m = motivo();
    if (!m) return null;
    if (m.id === 'meta') {
      if (S.interno) {
        if (!S.grupo) return { sinal: 1, pendente: true };
        const lim = limiteSubgrupo(S.grupo);
        return { sinal: 1, min: 1, max: lim, dica: `Até ${lim} medalhas temporárias.`, erroMax: `O limite por subgrupo é de ${lim} medalhas.` };
      }
      if (!S.cargo) return { sinal: 1, pendente: true, dica: 'Escolha o cargo para ver o limite.' };
      const [mn, mx] = faixaPositiva(S.cargo), por = POR_PERIODO[S.cargo.periodo] || '';
      return {
        sinal: 1, min: mn, max: mx,
        dica: mn > 1 ? `Entre ${mn} e ${mx} medalhas ${por}.` : `Até ${mx} medalhas ${por}.`,
        erroMin: `O mínimo para ${S.cargo.nome} é de ${mn} medalhas.`,
        erroMax: `O limite para ${S.cargo.nome} é de ${mx} medalhas.`
      };
    }
    if (m.id === 'nao-meta') {
      if (!S.cargo) return { sinal: -1, pendente: true, dica: 'Escolha o cargo para ver o valor.' };
      if (!S.cargo.negativas) return { sinal: -1, bloqueio: `${S.cargo.nome} não tem medalhas negativas previstas por não cumprimento de meta.` };
      return { sinal: -1, fixo: S.cargo.negativas, dica: `Valor fixo do cargo, ${POR_PERIODO[S.cargo.periodo] || ''}.` };
    }
    const fixo = CFG.MEDALHAS_FIXAS[m.id];
    if (fixo) return { sinal: -1, fixo, dica: `Valor fixo para ${m.rotulo.toLowerCase()}.` };
    if (m.id === 'correcao') return { sinal: 0, min: 1, dica: 'Toque no sinal para alternar entre positivas e negativas.' };
    if (m.id === 'funcao-extra') return { sinal: 1, min: 1, dica: 'Sem limite de medalhas.' };
    return { sinal: -1, min: 1, dica: 'Quantidade de medalhas negativas.' };
  }

  function validarNumero() {
    const r = regraNumero();
    if (!r) return { ok: false, falta: true };
    if (r.bloqueio) return { ok: false, erro: r.bloqueio, tipo: 'bloqueio' };
    if (r.pendente) return { ok: false, falta: true };
    const sinal = r.sinal === 0 ? S.sinalCorrecao : r.sinal;
    if (r.fixo) return { ok: true, valor: sinal * r.fixo };
    if (!S.numero) return { ok: false, falta: true };
    const v = parseInt(S.numero, 10);
    if (!v) return { ok: false, tipo: 'zero', erro: 'Informe um número maior que zero.' };
    if (r.min && v < r.min) return { ok: false, tipo: 'min', erro: r.erroMin || `O mínimo é de ${r.min} medalhas.` };
    if (r.max && v > r.max) return { ok: false, tipo: 'max', erro: r.erroMax || `O limite é de ${r.max} medalhas.` };
    return { ok: true, valor: sinal * v };
  }
  // O erro aparece depois que o campo foi usado, ou na hora quando passa do limite.
  const erroNumeroVisivel = v => !!(v.erro && (S.tocado.has('numero') || v.tipo === 'bloqueio' || v.tipo === 'max'));

  /* ==================================================================
     VERIFICAÇÃO NO RCCSYSTEM (via Apps Script)
     ================================================================== */
  function estadoNick(k) {
    if (!k) return 'vazio';
    if (S.verifPend.has(k)) return 'verificando';
    const r = S.verif.get(k);
    if (r) {
      if (!r.encontrado) return 'inexistente';
      if (!r.ativo) return 'desativado';
      return 'ok';
    }
    if (S.verifFalha.has(k)) return 'falha';
    return 'verificando';
  }

  function tokensPoliciais() {
    const vistos = new Set(), restrito = motivoRestrito();
    return tokens(el.policiais.value).map(t => {
      const r = S.verif.get(t.chave);
      let estado, restricao = '';
      if (vistos.has(t.chave)) estado = 'duplicado';
      else {
        vistos.add(t.chave);
        estado = estadoNick(t.chave);
        if (estado === 'ok' && restrito) {
          if (r.oficialCM) { estado = 'restrito'; restricao = 'oficial do Corpo Militar'; }
          else if (r.especializacao) { estado = 'restrito'; restricao = 'Especialização ' + r.especializacao; }
          else if (!S.especializacoesOk) estado = 'sem-espec';
        }
      }
      return Object.assign(t, { estado, restricao, r });
    });
  }

  let verifTimer = null;
  function agendarVerificacao(atraso = 650) {
    clearTimeout(verifTimer);
    verifTimer = setTimeout(verificarNicks, atraso);
  }

  function nicksParaVerificar() {
    const mapa = new Map();
    tokens(el.policiais.value).forEach(t => mapa.set(t.chave, t.nick));
    const resp = limparNick(el.responsavel.value);
    if (resp) mapa.set(chaveNick(resp), resp);
    return mapa;
  }

  async function verificarNicks() {
    if (!apiConfigurada()) return;
    const mapa = nicksParaVerificar();
    const faltam = [...mapa.keys()].filter(k => !S.verif.has(k) && !S.verifPend.has(k) && !S.verifFalha.has(k));
    if (!faltam.length) return;
    faltam.forEach(k => S.verifPend.add(k));
    S.verifErro = '';
    atualizar();
    try {
      for (let i = 0; i < faltam.length; i += 60) {
        const lote = faltam.slice(i, i + 60);
        const r = await api('verificar', { nicks: lote.map(k => mapa.get(k)) });
        const res = r.resultados || [];
        lote.forEach((k, j) => {
          const x = res[j];
          if (x && !x.falha) S.verif.set(k, x);
          else S.verifFalha.add(k);
        });
        if (typeof r.especializacoesOk === 'boolean') S.especializacoesOk = r.especializacoesOk;
      }
    } catch (e) {
      S.verifErro = e.message;
      faltam.forEach(k => { if (!S.verif.has(k)) S.verifFalha.add(k); });
    } finally {
      faltam.forEach(k => S.verifPend.delete(k));
      atualizar();
    }
    const atuais = nicksParaVerificar();
    if ([...atuais.keys()].some(k => !S.verif.has(k) && !S.verifPend.has(k) && !S.verifFalha.has(k))) agendarVerificacao(80);
  }

  function reverificar() {
    if (!S.especializacoesOk) S.verif.clear();
    S.verifFalha.clear();
    S.verifErro = '';
    S.especializacoesOk = true;
    agendarVerificacao(0);
    atualizar();
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

  /* ---------- registros que não chegaram à planilha ---------- */
  function lerPendentes() {
    try { const l = JSON.parse(localStorage.getItem(CHAVE_PENDENTES) || '[]'); return Array.isArray(l) ? l : []; } catch (_) { return []; }
  }
  function salvarPendentes(l) {
    try { if (l.length) localStorage.setItem(CHAVE_PENDENTES, JSON.stringify(l)); else localStorage.removeItem(CHAVE_PENDENTES); } catch (_) { /* sem armazenamento */ }
  }
  function guardarPendente(reg) {
    const l = lerPendentes();
    l.push(Object.assign({}, reg, { guardadoEm: Date.now() }));
    salvarPendentes(l);
    renderAvisos();
  }
  let enviandoPendentes = false;
  async function enviarPendentes(silencioso) {
    if (enviandoPendentes || !apiConfigurada()) return null;
    const l = lerPendentes();
    if (!l.length) return null;
    enviandoPendentes = true;
    const restantes = [];
    for (const reg of l) {
      try { await api('registrar', { dados: reg }); } catch (_) { restantes.push(reg); }
    }
    salvarPendentes(restantes);
    enviandoPendentes = false;
    renderAvisos();
    const enviados = l.length - restantes.length;
    if (!silencioso || enviados) {
      if (enviados) toast(enviados === 1 ? '1 registro pendente foi enviado à planilha.' : `${enviados} registros pendentes foram enviados à planilha.`);
      if (restantes.length && !silencioso) toast('A planilha não respondeu. Tente de novo em instantes.', 'erro');
    }
    return { enviados, restantes: restantes.length };
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

  function montarModelo() {
    const g = S.grupo, m = motivo(), slot = modoSlot(), dest = destino();
    const nv = validarNumero();
    const nomes = tokensPoliciais().filter(t => t.estado !== 'duplicado').map(t => (t.r && t.r.encontrado && t.r.nick ? t.r.nick : t.nick));
    const respR = S.verif.get(chaveNick(el.responsavel.value));
    const responsavel = respR && respR.encontrado && respR.nick ? respR.nick : limparNick(el.responsavel.value);
    const cargoTxt = slot === 'subgrupo' ? partesSubgrupo(S.subgrupo).nome : (S.cargo ? S.cargo.nome : '');
    const temporarias = !!(dest && dest.temporarias);
    return {
      tema: temaPostagem(g),
      brasao: (g && g.brasao) || CFG.BRASAO_AF,
      kicker: temporarias ? 'COFRE DE MEDALHAS TEMPORÁRIAS' : 'COFRE DE MEDALHAS',
      titulo: m ? m.rotulo : '',
      responsavel: limparBB(responsavel),
      grupo: g ? g.nome : '',
      rotuloCargo: slot === 'subgrupo' ? 'SUBGRUPO REFERENTE' : 'CARGO REFERENTE',
      cargo: limparBB(cargoTxt),
      periodo: S.periodo,
      numero: nv.ok ? nv.valor : null,
      natureza: temporarias ? 'temporárias' : 'efetivas',
      policiais: nomes.map(limparBB),
      motivoTexto: limparBB(textoMotivo())
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

  async function extrairCores() {
    const alvos = GRUPOS.filter(g => g.brasao && !g.cor);
    await Promise.allSettled(alvos.map(async g => { S.cores.set(g.id, await corDoBrasao(g.brasao)); }));
    selGrupo.repintar();
    renderSubgrupoToggle();
  }

  /* ==================================================================
     SELETOR PERSONALIZADO
     ================================================================== */
  let seletorAberto = null;

  function criarSeletor(raiz, op) {
    const uid = 'sl' + Math.random().toString(36).slice(2, 8);
    raiz.classList.add('seletor');
    if (op.largo) raiz.classList.add('seletor-largo');
    raiz.innerHTML =
      '<button type="button" class="campo seletor-gatilho" aria-haspopup="listbox" aria-expanded="false">' +
        '<span class="seletor-valor"></span><i class="fa-solid fa-chevron-down seletor-seta" aria-hidden="true"></i>' +
      '</button>' +
      '<div class="seletor-painel" hidden>' +
        (op.busca ? `<label class="seletor-busca"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="text" placeholder="${esc(op.busca)}" autocomplete="off" spellcheck="false" aria-label="${esc(op.busca)}"></label>` : '') +
        `<div class="seletor-lista" role="listbox" tabindex="-1" id="${uid}-lista"></div>` +
      '</div>';
    const gatilho = raiz.querySelector('.seletor-gatilho');
    const painel = raiz.querySelector('.seletor-painel');
    const lista = raiz.querySelector('.seletor-lista');
    const busca = raiz.querySelector('.seletor-busca input');
    const caixaValor = raiz.querySelector('.seletor-valor');
    if (op.rotulo) { gatilho.setAttribute('aria-labelledby', op.rotulo); lista.setAttribute('aria-labelledby', op.rotulo); }
    let opcoes = [], valor = null, ativo = -1, vis = [], vazioTxt = op.placeholder || 'Selecione', bloqueado = false;

    const atual = () => opcoes.find(o => o.valor === valor) || null;
    function pintarValor() {
      const o = atual();
      definirHtml(caixaValor, o
        ? (op.valor ? op.valor(o) : `<span class="truncate">${esc(o.rotulo)}</span>`)
        : `<span class="seletor-placeholder">${esc(vazioTxt)}</span>`);
    }
    function marcarAtivo(rolar) {
      lista.querySelectorAll('.seletor-opcao').forEach(n => n.classList.toggle('ativa', Number(n.dataset.i) === ativo));
      const alvo = busca || lista;
      if (ativo >= 0 && vis[ativo]) {
        alvo.setAttribute('aria-activedescendant', `${uid}-${ativo}`);
        if (rolar) { const n = lista.querySelector(`[data-i="${ativo}"]`); if (n) n.scrollIntoView({ block: 'nearest' }); }
      } else alvo.removeAttribute('aria-activedescendant');
    }
    function pintarLista() {
      const q = busca ? normal(busca.value) : '';
      vis = opcoes.filter(o => !q || normal(o.rotulo + ' ' + (o.busca || '')).includes(q));
      if (ativo >= vis.length) ativo = vis.length - 1;
      let html = '', grupo = null;
      vis.forEach((o, i) => {
        if (o.grupo && o.grupo !== grupo) { grupo = o.grupo; html += `<div class="seletor-grupo" role="presentation">${esc(grupo)}</div>`; }
        const sel = o.valor === valor;
        html += `<div class="seletor-opcao${sel ? ' selecionada' : ''}" role="option" id="${uid}-${i}" data-i="${i}" aria-selected="${sel}">` +
          (op.opcao ? op.opcao(o) : `<span class="min-w-0 flex-1 truncate">${esc(o.rotulo)}</span>`) +
          (sel ? '<i class="fa-solid fa-check seletor-check" aria-hidden="true"></i>' : '') + '</div>';
      });
      lista.innerHTML = html || `<div class="seletor-vazio">${esc(op.semResultado || 'Nada encontrado.')}</div>`;
      marcarAtivo(false);
    }
    function abrir() {
      if (bloqueado || !opcoes.length) return;
      if (seletorAberto && seletorAberto !== ctl) seletorAberto.fechar(false);
      seletorAberto = ctl;
      painel.hidden = false;
      raiz.classList.add('aberto');
      gatilho.setAttribute('aria-expanded', 'true');
      if (busca) busca.value = '';
      ativo = Math.max(0, opcoes.findIndex(o => o.valor === valor));
      pintarLista();
      marcarAtivo(true);
      (busca || lista).focus({ preventScroll: true });
    }
    function fechar(focar = true) {
      if (painel.hidden) return;
      painel.hidden = true;
      raiz.classList.remove('aberto');
      gatilho.setAttribute('aria-expanded', 'false');
      if (seletorAberto === ctl) seletorAberto = null;
      if (focar) gatilho.focus({ preventScroll: true });
    }
    function escolher(i) {
      const o = vis[i];
      if (!o) return;
      const mudou = o.valor !== valor;
      valor = o.valor;
      pintarValor();
      fechar();
      if (mudou && op.mudou) op.mudou(o.valor, o);
    }
    function mover(d) {
      if (!vis.length) return;
      ativo = (ativo + d + vis.length) % vis.length;
      marcarAtivo(true);
    }
    function teclas(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); mover(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
      else if (e.key === 'Home' && !busca) { e.preventDefault(); ativo = 0; marcarAtivo(true); }
      else if (e.key === 'End' && !busca) { e.preventDefault(); ativo = vis.length - 1; marcarAtivo(true); }
      else if (e.key === 'Enter') { e.preventDefault(); escolher(ativo); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); }
      else if (e.key === 'Tab') fechar(false);
    }
    gatilho.addEventListener('click', () => (painel.hidden ? abrir() : fechar()));
    gatilho.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir(); } });
    lista.addEventListener('keydown', teclas);
    if (busca) {
      busca.addEventListener('keydown', teclas);
      busca.addEventListener('input', () => { ativo = 0; pintarLista(); marcarAtivo(true); });
    }
    lista.addEventListener('click', e => { const n = e.target.closest('.seletor-opcao'); if (n) escolher(Number(n.dataset.i)); });
    lista.addEventListener('pointermove', e => {
      const n = e.target.closest('.seletor-opcao');
      if (n && Number(n.dataset.i) !== ativo) { ativo = Number(n.dataset.i); marcarAtivo(false); }
    });
    document.addEventListener('pointerdown', e => { if (!painel.hidden && !raiz.contains(e.target)) fechar(false); });

    const ctl = {
      opcoes(novas, manter = true) {
        opcoes = novas || [];
        if (!manter || !opcoes.some(o => o.valor === valor)) valor = null;
        pintarValor();
        if (!painel.hidden) pintarLista();
      },
      definir(v) { valor = opcoes.some(o => o.valor === v) ? v : null; pintarValor(); },
      get valor() { return valor; },
      get opcao() { return atual(); },
      get gatilho() { return gatilho; },
      textoVazio(t) { vazioTxt = t; pintarValor(); },
      habilitar(sim) { bloqueado = !sim; gatilho.disabled = !sim; if (!sim) fechar(false); },
      repintar() { caixaValor.__html = null; pintarValor(); if (!painel.hidden) pintarLista(); },
      fechar,
      focar() { gatilho.focus({ preventScroll: true }); }
    };
    pintarValor();
    return ctl;
  }

  /* ---------- brasões nas opções ---------- */
  const htmlBrasaoFalta = (sigla, k) => `<span class="brasao-falta tom" style="${varsTom(k)}">${esc(String(sigla).slice(0, 4))}</span>`;
  function htmlBrasao(g) {
    const k = tonsGrupo(g);
    if (!g.brasao) return htmlBrasaoFalta(g.id, k);
    return `<img class="brasao-mini" src="${esc(g.brasao)}" alt="" data-sigla="${esc(g.id)}" data-ce="${esc(k.e)}" data-cc="${esc(k.c)}" decoding="async">`;
  }
  document.addEventListener('error', e => {
    const im = e.target;
    if (!(im instanceof HTMLImageElement) || !im.classList.contains('brasao-mini')) return;
    const tmp = document.createElement('span');
    tmp.innerHTML = htmlBrasaoFalta(im.dataset.sigla || '?', { e: im.dataset.ce || '#86CB41', c: im.dataset.cc || '#4C8613' });
    im.replaceWith(tmp.firstElementChild);
  }, true);

  const htmlGrupo = (g, quebra) => `${htmlBrasao(g)}<span class="nome-grupo tom min-w-0 flex-1 font-semibold ${quebra ? 'leading-snug' : 'truncate'}" style="${varsTom(tonsGrupo(g))}">${esc(g.nome)}</span><span class="sigla">${esc(g.id)}</span>`;
  const htmlSubgrupo = (o, quebra) => `<span class="min-w-0 flex-1 text-texto ${quebra ? 'leading-snug' : 'truncate'}">${esc(o.nome)}</span>${o.sigla ? `<span class="sigla">${esc(o.sigla)}</span>` : ''}`;

  function resumoCargo(cg) {
    const [mn, mx] = faixaPositiva(cg);
    let s = mn > 1 ? `+${mn} a ${mx}` : `até +${mx}`;
    if (cg.negativas) s += ` · -${cg.negativas}`;
    return `${s} · ${cg.periodo}`;
  }

  const selGrupo = criarSeletor(el.selGrupo, {
    rotulo: 'rotulo-grupo', placeholder: 'Selecione o grupo de tarefas', busca: 'Buscar grupo ou sigla',
    largo: true, opcao: o => htmlGrupo(o.g, true), valor: o => htmlGrupo(o.g, false),
    mudou: v => escolherGrupo(v)
  });
  selGrupo.opcoes(GRUPOS.map(g => ({ valor: g.id, rotulo: g.nome, busca: g.id, grupo: g.categoria, g })));

  const selCargo = criarSeletor(el.selCargo, {
    rotulo: 'rotulo-slot', placeholder: 'Escolha o grupo primeiro',
    opcao: o => `<span class="min-w-0 flex-1"><span class="block truncate font-medium text-texto">${esc(o.cg.nome)}</span><span class="mt-0.5 block text-[11.5px] text-musgo">${esc(resumoCargo(o.cg))}</span></span>`,
    valor: o => `<span class="min-w-0 flex-1 truncate text-texto">${esc(o.cg.nome)}</span><span class="sigla">${esc(o.cg.periodo)}</span>`,
    mudou: v => { S.cargo = S.grupo ? S.grupo.cargos[Number(v)] || null : null; S.tocado.delete('numero'); renderPeriodo(); atualizar(); }
  });

  const selSubgrupo = criarSeletor(el.selSubgrupo, {
    rotulo: 'rotulo-slot', placeholder: 'Selecione o subgrupo',
    opcao: o => htmlSubgrupo(o, true), valor: o => htmlSubgrupo(o, false),
    mudou: v => { S.subgrupo = v; atualizar(); }
  });

  const htmlPeriodo = o => `<span class="min-w-0 flex-1 truncate text-texto">${esc(o.rotulo)}</span>${o.p.emAndamento ? '<span class="sigla !text-af-300">em andamento</span>' : ''}`;
  const selPeriodo = criarSeletor(el.selPeriodo, {
    rotulo: 'rotulo-periodo', placeholder: 'Escolha o cargo primeiro',
    opcao: htmlPeriodo, valor: htmlPeriodo,
    mudou: v => { S.periodo = v; atualizar(); }
  });

  /* ==================================================================
     AÇÕES DO FORMULÁRIO
     ================================================================== */
  function escolherGrupo(id) {
    const g = GRUPOS.find(x => x.id === id) || null;
    if (g === S.grupo) return;
    S.grupo = g;
    S.cargo = null;
    S.subgrupo = '';
    S.tocado.delete('numero');
    definirInterno(false, true);
    selGrupo.definir(g ? g.id : null);
    selCargo.opcoes(g ? g.cargos.map((cg, i) => ({ valor: String(i), rotulo: cg.nome, busca: cg.sigla, cg })) : [], false);
    selSubgrupo.opcoes(g && g.subgrupos ? g.subgrupos.map(s => { const p = partesSubgrupo(s); return { valor: s, rotulo: p.nome, busca: p.sigla, nome: p.nome, sigla: p.sigla }; }) : [], false);
    if (g) medirImagem(g.brasao);
    renderSubgrupoToggle();
    renderMotivos();
    renderSlot();
    renderPeriodo();
    atualizar();
  }

  function definirInterno(sim, silencioso) {
    S.interno = !!sim;
    S.tocado.delete('numero');
    el.segmento.dataset.valor = S.interno ? 'sim' : 'nao';
    el.segmento.querySelectorAll('input').forEach(i => { i.checked = (i.value === 'sim') === S.interno; });
    if (silencioso) return;
    renderMotivos();
    renderSlot();
    renderPeriodo();
    atualizar();
  }

  function escolherMotivo(id) {
    const antes = regraNumero();
    S.motivo = id;
    S.tocado.delete('numero');
    const depois = regraNumero();
    if (antes && antes.fixo && !(depois && depois.fixo)) { S.numero = ''; el.numero.value = ''; }
    renderSlot();
    renderPeriodo();
    atualizar();
  }

  function lerPeriodoLivre() {
    const p = interpretarPeriodo(el.periodo.value);
    S.periodo = p && p.ini <= hoje0() ? p.texto : '';
  }
  function erroPeriodoLivre() {
    const v = el.periodo.value.trim();
    if (!v) return '';
    const p = interpretarPeriodo(v);
    if (!p) return 'Use o formato 01 Jan 2026 ou 01 Jan 2026 a 15 Jan 2026.';
    if (p.ini > hoje0()) return 'O período não pode começar no futuro.';
    return '';
  }

  function autoAltura() {
    const ta = el.policiais;
    ta.style.height = 'auto';
    const borda = ta.offsetHeight - ta.clientHeight;
    ta.style.height = (ta.scrollHeight + borda) + 'px';
  }

  function normalizarPoliciais() {
    const toks = tokens(el.policiais.value);
    if (!toks.length) return;
    const novo = toks.map(t => {
      const r = S.verif.get(t.chave);
      return r && r.encontrado && r.nick ? r.nick : t.nick;
    }).join(' / ');
    if (novo !== el.policiais.value) { el.policiais.value = novo; autoAltura(); atualizar(); }
  }

  function canonizarResponsavel() {
    const r = S.verif.get(chaveNick(el.responsavel.value));
    const limpo = r && r.encontrado && r.nick ? r.nick : limparNick(el.responsavel.value);
    if (limpo !== el.responsavel.value) el.responsavel.value = limpo;
  }

  function novaPostagem() {
    el.policiais.value = '';
    autoAltura();
    atualizar();
    el.policiais.focus();
  }

  /* ==================================================================
     RENDERIZAÇÃO
     ================================================================== */
  function mostrarMsg(no, txt) {
    no.hidden = !txt;
    definirHtml(no, txt ? `<i class="fa-solid fa-circle-exclamation mt-0.5"></i><span>${esc(txt)}</span>` : '');
  }

  function renderSubgrupoToggle() {
    const g = S.grupo, tem = temSubgrupos(g);
    el.subgrupo.hidden = !tem;
    if (!tem) return;
    const k = tonsGrupo(g);
    el.subgrupo.style.setProperty('--ce', k.e);
    el.subgrupo.style.setProperty('--cc', k.c);
    definirHtml(el.subgrupoSiglas, g.subgrupos.map(s => {
      const p = partesSubgrupo(s);
      return `<span class="sigla-sub" title="${esc(p.nome)}">${esc(p.sigla || p.nome)}</span>`;
    }).join(''));
  }

  function renderMotivos() {
    const lista = motivosDisponiveis();
    if (S.motivo && !lista.some(m => m.id === S.motivo)) {
      S.motivo = null;
      S.numero = '';
      el.numero.value = '';
    }
    definirHtml(el.motivos, lista.map(m =>
      `<label class="motivo" data-tom="${m.tom}"><input type="radio" name="motivo" value="${m.id}" class="sr-only"${m.id === S.motivo ? ' checked' : ''}>` +
      `<i class="fa-solid ${m.icone}" aria-hidden="true"></i><span>${esc(m.rotulo)}</span></label>`).join(''));
    el.motivos.querySelectorAll('input').forEach(i => { i.checked = i.value === S.motivo; });
  }

  function renderSlot() {
    const sub = modoSlot() === 'subgrupo';
    el.textoSlot.textContent = sub ? 'Subgrupo' : 'Cargo';
    el.iconeSlot.className = 'fa-solid ' + (sub ? 'fa-sitemap' : 'fa-id-badge');
    el.selCargo.hidden = sub;
    el.selSubgrupo.hidden = !sub;
    selCargo.habilitar(!!S.grupo);
    selCargo.textoVazio(S.grupo ? 'Selecione o cargo' : 'Escolha o grupo primeiro');
  }

  function renderPeriodo() {
    const lista = modoPeriodo() === 'lista';
    el.selPeriodo.hidden = !lista;
    el.periodo.hidden = lista;
    if (lista) {
      if (!motivo() || !S.cargo) {
        selPeriodo.opcoes([], false);
        selPeriodo.habilitar(false);
        selPeriodo.textoVazio(!motivo() ? 'Escolha o motivo primeiro' : 'Escolha o cargo primeiro');
        S.periodo = '';
        return;
      }
      const ps = gerarPeriodos(S.cargo.periodo);
      const ops = ps.map(p => ({ valor: p.texto, rotulo: p.texto, grupo: S.cargo.periodo === 'mensal' ? String(p.ini.getFullYear()) : nomeMes(p.ini), p }));
      selPeriodo.opcoes(ops);
      selPeriodo.habilitar(true);
      selPeriodo.textoVazio('Selecione o período');
      if (!ops.some(o => o.valor === S.periodo)) {
        const padrao = ps.find(p => !p.emAndamento) || ps[0];
        S.periodo = padrao ? padrao.texto : '';
      }
      selPeriodo.definir(S.periodo);
    } else {
      const m = motivo();
      if (!el.periodo.value.trim() && m && !m.periodico) el.periodo.value = fmtData(hoje0());
      lerPeriodoLivre();
    }
  }

  function renderNumero() {
    const r = regraNumero();
    const sinal = r ? (r.sinal === 0 ? S.sinalCorrecao : r.sinal) : 1;
    el.sinal.dataset.sinal = sinal < 0 ? '-' : '+';
    el.sinal.textContent = sinal < 0 ? '-' : '+';
    el.sinal.disabled = !(r && r.sinal === 0);
    el.sinal.title = r && r.sinal === 0 ? 'Alternar entre positivas e negativas' : '';
    const fixo = !!(r && r.fixo);
    if (fixo && el.numero.value !== String(r.fixo)) el.numero.value = String(r.fixo);
    if (fixo) S.numero = String(r.fixo);
    if (r && r.bloqueio) { el.numero.value = ''; S.numero = ''; }
    el.numero.readOnly = fixo || !!(r && r.bloqueio);
    el.numeroCadeado.hidden = !fixo;
    el.numeroDica.textContent = !r ? 'Escolha o motivo.' : r.bloqueio ? '' : (r.dica || '');
    const v = validarNumero();
    const mostrar = erroNumeroVisivel(v);
    mostrarMsg(el.numeroMsg, mostrar ? v.erro : '');
    el.numeroCaixa.classList.toggle('invalido', mostrar);
  }

  function renderPeriodoMsg() {
    if (modoPeriodo() === 'lista') { mostrarMsg(el.periodoMsg, ''); el.periodo.classList.remove('invalido'); return; }
    const erro = S.tocado.has('periodo') ? erroPeriodoLivre() : '';
    mostrarMsg(el.periodoMsg, erro);
    el.periodo.classList.toggle('invalido', !!erro);
  }

  const ICONES_ESTADO = {
    verificando: '<i class="fa-solid fa-circle-notch fa-spin text-musgo"></i>',
    ok: '<i class="fa-solid fa-circle-check text-af-400"></i>',
    inexistente: '<i class="fa-solid fa-circle-xmark text-red-500 dark:text-red-400"></i>',
    desativado: '<i class="fa-solid fa-circle-xmark text-red-500 dark:text-red-400"></i>',
    falha: '<i class="fa-solid fa-triangle-exclamation text-amber-500 dark:text-amber-400"></i>'
  };
  function renderResponsavel() {
    const k = chaveNick(el.responsavel.value), est = estadoNick(k), r = S.verif.get(k);
    definirHtml(el.responsavelEstado, k && apiConfigurada() ? (ICONES_ESTADO[est] || '') : '');
    const msg = est === 'inexistente' ? 'Nickname não encontrado no RCCSystem.'
      : est === 'desativado' ? `Policial com status ${(r && r.status) || 'desativado'} no RCCSystem.`
      : '';
    mostrarMsg(el.responsavelMsg, msg);
    el.responsavel.classList.toggle('invalido', !!msg);
  }

  const MARCA = { ok: 'm-ok', verificando: 'm-pend', falha: 'm-pend', inexistente: 'm-erro', desativado: 'm-erro', restrito: 'm-erro', duplicado: 'm-aviso', 'sem-espec': 'm-aviso' };

  function caixaAlerta(tipo, icone, titulo, itens, rodape, botao) {
    return `<div class="alerta alerta-${tipo}"><span class="alerta-icone"><i class="fa-solid ${icone}"></i></span><div class="min-w-0 flex-1">` +
      `<p class="font-semibold">${esc(titulo)}</p>` +
      (itens && itens.length ? `<div class="alerta-lista">${itens.map(([n, d]) => `<span class="alerta-item"><b>${esc(n)}</b>${d ? ` <span class="opacity-75">${esc(d)}</span>` : ''}</span>`).join('')}</div>` : '') +
      (rodape ? `<p class="mt-1.5 text-[12px] opacity-80">${esc(rodape)}</p>` : '') +
      (botao ? `<button type="button" class="btn-mini mt-2.5" data-acao="${botao[0]}"><i class="fa-solid fa-rotate"></i>${esc(botao[1])}</button>` : '') +
      '</div></div>';
  }

  function renderPoliciais() {
    const texto = el.policiais.value, toks = tokensPoliciais();
    let html = '', pos = 0;
    toks.forEach(t => {
      html += esc(texto.slice(pos, t.ini)) + `<mark class="${MARCA[t.estado] || 'm-pend'}">${esc(texto.slice(t.ini, t.fim))}</mark>`;
      pos = t.fim;
    });
    definirHtml(el.hlFundo, html + esc(texto.slice(pos)) + ' ');

    const unicos = toks.filter(t => t.estado !== 'duplicado');
    const verificando = toks.some(t => t.estado === 'verificando') && apiConfigurada();
    el.contador.hidden = !unicos.length;
    definirHtml(el.contador, (verificando ? '<i class="fa-solid fa-circle-notch fa-spin text-musgo"></i>' : '') + `${unicos.length} ${unicos.length === 1 ? 'policial' : 'policiais'}`);

    const por = e => toks.filter(t => t.estado === e);
    const des = por('desativado'), ine = por('inexistente'), res = por('restrito'), dup = por('duplicado');
    const caixas = [];
    if (des.length || ine.length) {
      const titulo = des.length && ine.length ? 'Há policiais desativados ou não encontrados nesta lista.'
        : des.length ? 'Há policiais desativados nesta lista.' : 'Há nicknames não encontrados no RCCSystem.';
      caixas.push(caixaAlerta('erro', 'fa-xmark', titulo, [...des.map(t => [t.nick, (t.r && t.r.status) || 'desativado']), ...ine.map(t => [t.nick, 'não encontrado'])]));
    }
    if (res.length) {
      caixas.push(caixaAlerta('erro', 'fa-xmark', `Estes policiais não recebem medalhas por ${motivo().rotulo.toLowerCase()}.`,
        res.map(t => [t.nick, t.restricao]), 'Para eles, a punição é postada apenas no RCCSystem.'));
    }
    if (dup.length) {
      const nomes = [...new Map(dup.map(t => [t.chave, t.nick])).values()];
      caixas.push(caixaAlerta('aviso', 'fa-clone', nomes.length === 1 ? 'Nickname repetido na lista.' : 'Nicknames repetidos na lista.', nomes.map(n => [n, '']), 'Remova a repetição para continuar.'));
    }
    if (toks.some(t => t.estado === 'falha') || (S.verifFalha.has(chaveNick(el.responsavel.value)))) {
      caixas.push(caixaAlerta('aviso', 'fa-plug-circle-exclamation', 'Não foi possível consultar o RCCSystem agora.', null, S.verifErro ? maiuscula(S.verifErro) + '.' : '', ['reverificar', 'Tentar de novo']));
    }
    if (toks.some(t => t.estado === 'sem-espec')) {
      caixas.push(caixaAlerta('aviso', 'fa-plug-circle-exclamation', 'Não foi possível consultar as especializações agora.', null, '', ['reverificar', 'Tentar de novo']));
    }
    definirHtml(el.alertas, caixas.join(''));
  }

  /* ---------- checklist de envio ---------- */
  const ITENS = [
    { id: 'responsavel', rotulo: () => 'Responsável' },
    { id: 'grupo', rotulo: () => 'Grupo' },
    { id: 'motivo', rotulo: () => 'Motivo' },
    { id: 'slot', rotulo: () => (modoSlot() === 'subgrupo' ? 'Subgrupo' : 'Cargo') },
    { id: 'periodo', rotulo: () => 'Período' },
    { id: 'numero', rotulo: () => 'Medalhas' },
    { id: 'policiais', rotulo: () => 'Policiais' }
  ];
  const ICONE_ITEM = {
    ok: 'fa-solid fa-check', pendente: 'fa-regular fa-circle', erro: 'fa-solid fa-xmark',
    carregando: 'fa-solid fa-circle-notch fa-spin', aviso: 'fa-solid fa-triangle-exclamation'
  };
  const TEXTO_ITEM = { ok: 'preenchido', pendente: 'pendente', erro: 'com erro', carregando: 'verificando', aviso: 'sem resposta' };
  const MSG_ERRO = {
    responsavel: 'Confira o responsável',
    periodo: 'Confira o período de referência',
    numero: 'Confira o número de medalhas',
    policiais: 'Corrija os policiais destacados'
  };
  const CIRCUNFERENCIA = 2 * Math.PI * 21;

  function estadoItens() {
    const ligada = apiConfigurada(), it = {};
    const resp = limparNick(el.responsavel.value);
    if (!resp) it.responsavel = 'pendente';
    else if (!ligada) it.responsavel = 'ok';
    else {
      const e = estadoNick(chaveNick(resp));
      it.responsavel = e === 'ok' ? 'ok' : e === 'verificando' ? 'carregando' : e === 'falha' ? 'aviso' : 'erro';
    }
    it.grupo = S.grupo ? 'ok' : 'pendente';
    it.motivo = motivo() ? 'ok' : 'pendente';
    it.slot = (modoSlot() === 'subgrupo' ? S.subgrupo : S.cargo) ? 'ok' : 'pendente';
    it.periodo = S.periodo ? 'ok' : (modoPeriodo() === 'livre' && S.tocado.has('periodo') && erroPeriodoLivre() ? 'erro' : 'pendente');
    const nv = validarNumero();
    it.numero = nv.ok ? 'ok' : erroNumeroVisivel(nv) ? 'erro' : 'pendente';
    const est = tokensPoliciais().map(t => t.estado);
    if (!est.length) it.policiais = 'pendente';
    else if (est.some(e => e === 'inexistente' || e === 'desativado' || e === 'restrito' || e === 'duplicado')) it.policiais = 'erro';
    else if (!ligada) it.policiais = 'ok';
    else if (est.includes('verificando')) it.policiais = 'carregando';
    else if (est.some(e => e === 'falha' || e === 'sem-espec')) it.policiais = 'aviso';
    else it.policiais = 'ok';
    return it;
  }

  function avaliar() {
    const itens = estadoItens(), ids = ITENS.map(i => i.id);
    const com = e => ids.filter(k => itens[k] === e);
    const erros = com('erro'), faltam = com('pendente');
    const r = { itens, feitos: com('ok').length, total: ids.length, pronto: false, sub: '' };
    const contagem = n => (n === 1 ? 'Falta 1 item' : `Faltam ${n} itens`);
    if (erros.length) return Object.assign(r, { estado: 'erro', titulo: MSG_ERRO[erros[0]], sub: faltam.length ? contagem(faltam.length) + '.' : '' });
    if (faltam.length) return Object.assign(r, { estado: 'pendente', titulo: contagem(faltam.length) });
    if (com('carregando').length) return Object.assign(r, { estado: 'verificando', titulo: 'Verificando no RCCSystem' });
    if (com('aviso').length) return Object.assign(r, { estado: 'aviso', titulo: 'O RCCSystem não respondeu', sub: 'Tente de novo em instantes.' });
    if (S.sessao === 'carregando') return Object.assign(r, { estado: 'verificando', titulo: 'Verificando sua sessão no fórum' });
    if (S.sessao === 'deslogado') return Object.assign(r, { estado: 'bloqueado', titulo: 'Entre no fórum para postar' });
    if (S.sessao === 'erro') return Object.assign(r, { estado: 'bloqueado', titulo: 'Sessão do fórum não confirmada', sub: 'Recarregue a página para tentar de novo.' });
    if (!apiConfigurada()) return Object.assign(r, { estado: 'bloqueado', titulo: 'Formulário sem ligação com o Apps Script' });
    return Object.assign(r, { estado: 'pronto', titulo: 'Tudo pronto para postar', pronto: true });
  }

  function montarChecklist() {
    el.checklist.innerHTML = ITENS.map(it => `<li><button type="button" class="item" data-item="${it.id}"><i aria-hidden="true"></i><span></span></button></li>`).join('');
  }

  // Leva até o campo do item (ou ao que precisa ser preenchido antes dele).
  function irPara(id) {
    let alvo = id;
    if ((id === 'slot' || id === 'motivo') && !S.grupo) alvo = 'grupo';
    if (id === 'periodo' && modoPeriodo() === 'lista') alvo = !S.grupo ? 'grupo' : !motivo() ? 'motivo' : !S.cargo ? 'slot' : 'periodo';
    const caixa = {
      responsavel: el.responsavel, grupo: el.selGrupo, motivo: el.motivos,
      slot: modoSlot() === 'subgrupo' ? el.selSubgrupo : el.selCargo,
      periodo: modoPeriodo() === 'lista' ? el.selPeriodo : el.periodo,
      numero: el.numeroCaixa, policiais: el.policiais
    }[alvo];
    if (!caixa) return;
    const foco = {
      responsavel: el.responsavel, grupo: selGrupo.gatilho,
      motivo: el.motivos.querySelector('input:checked') || el.motivos.querySelector('input'),
      slot: modoSlot() === 'subgrupo' ? selSubgrupo.gatilho : selCargo.gatilho,
      periodo: modoPeriodo() === 'lista' ? selPeriodo.gatilho : el.periodo,
      numero: el.numero, policiais: el.policiais
    }[alvo];
    caixa.scrollIntoView({ behavior: movimentoReduzido() ? 'auto' : 'smooth', block: 'center' });
    if (foco && !foco.disabled) foco.focus({ preventScroll: true });
    reanimar(caixa, 'piscar');
  }

  function renderEnvio() {
    const a = avaliar();
    ITENS.forEach(it => {
      const no = el.checklist.querySelector(`[data-item="${it.id}"]`);
      if (!no) return;
      const est = a.itens[it.id], rot = it.rotulo();
      if (no.dataset.estado !== est) {
        const antes = no.dataset.estado;
        no.dataset.estado = est;
        no.firstElementChild.className = ICONE_ITEM[est];
        if (est === 'ok' && antes) reanimar(no, 'pulo');
      }
      if (no.lastElementChild.textContent !== rot) no.lastElementChild.textContent = rot;
      const acess = `${rot}: ${TEXTO_ITEM[est]}`;
      if (no.getAttribute('aria-label') !== acess) no.setAttribute('aria-label', acess);
    });

    const completa = [
      a.itens.responsavel === 'ok' && a.itens.grupo === 'ok',
      ['motivo', 'slot', 'periodo', 'numero'].every(k => a.itens[k] === 'ok'),
      a.itens.policiais === 'ok'
    ];
    el.secoes.forEach((h, i) => h.classList.toggle('completa', !!completa[i]));

    el.anelBarra.style.strokeDasharray = String(CIRCUNFERENCIA);
    el.anelBarra.style.strokeDashoffset = String(CIRCUNFERENCIA * (1 - a.feitos / a.total));
    el.anelTexto.textContent = `${a.feitos}/${a.total}`;

    const d = destino();
    el.destino.hidden = !d;
    if (d) definirHtml(el.destino, `<i class="fa-solid fa-location-dot"></i><span>[AF] ${esc(S.grupo.nome)}${d.temporarias ? ' · temporárias' : ''}</span>`);

    if (S.enviando) {
      const t = S.enviando === 'forum' ? 'Postando no fórum' : 'Registrando na planilha';
      el.envio.dataset.estado = 'enviando';
      el.envioTitulo.textContent = t;
      el.envioSub.hidden = true;
      el.enviar.disabled = true;
      el.enviar.classList.remove('liberado');
      el.enviarIcone.className = 'fa-solid fa-circle-notch fa-spin';
      el.enviarTexto.textContent = t + '...';
      return;
    }
    el.envio.dataset.estado = a.estado;
    el.envioTitulo.textContent = a.titulo;
    el.envioSub.textContent = a.sub;
    el.envioSub.hidden = !a.sub;
    const travado = el.enviar.disabled;
    el.enviar.disabled = !a.pronto;
    if (a.pronto && travado) reanimar(el.enviar, 'liberado');
    if (!a.pronto) el.enviar.classList.remove('liberado');
    const verificando = a.estado === 'verificando';
    el.enviarIcone.className = verificando ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-paper-plane';
    el.enviarTexto.textContent = verificando ? 'Verificando...' : 'Postar no cofre';
  }

  function renderUsuario() {
    const st = S.sessao;
    el.usuario.dataset.estado = st === 'ok' ? 'ok' : st === 'deslogado' ? 'erro' : st === 'erro' ? 'aviso' : '';
    el.usuarioRotulo.textContent = st === 'ok' ? 'Conectado como' : 'Sessão do fórum';
    el.usuarioNome.textContent = st === 'ok' ? S.usuario : st === 'deslogado' ? 'Não conectado' : st === 'erro' ? 'Não confirmada' : 'Verificando...';
    if (st === 'ok') {
      el.usuarioAvatar.src = 'https://www.habbo.com.br/habbo-imaging/avatarimage?' + new URLSearchParams({ user: S.usuario, direction: '2', head_direction: '3', headonly: '1', size: 'm' }).toString();
      el.usuarioAvatar.hidden = false;
      el.usuarioIcone.hidden = true;
    }
  }

  function aviso(tipo, icone, titulo, texto, acao) {
    return `<div class="aviso aviso-${tipo}"><i class="fa-solid ${icone}"></i><p class="min-w-0 flex-1"><span class="font-semibold">${esc(titulo)}</span> <span class="opacity-80">${esc(texto)}</span></p>${acao || ''}</div>`;
  }
  function renderAvisos() {
    const itens = [];
    if (!apiConfigurada()) itens.push(aviso('aviso', 'fa-plug-circle-xmark', 'O formulário ainda não está ligado ao Apps Script.', 'Cole a URL do App da Web em CFG.API.'));
    if (S.sessao === 'deslogado') itens.push(aviso('erro', 'fa-right-to-bracket', 'Você não está conectado ao fórum.', 'Entre na sua conta para postar no cofre.', '<a href="/login" class="btn-mini">Entrar</a>'));
    if (S.sessao === 'erro') itens.push(aviso('aviso', 'fa-circle-exclamation', 'Não foi possível confirmar sua sessão no fórum.', 'Recarregue a página para tentar de novo.'));
    const pend = lerPendentes().length;
    if (pend) itens.push(aviso('aviso', 'fa-cloud-arrow-up', pend === 1 ? '1 registro aguarda envio à planilha.' : `${pend} registros aguardam envio à planilha.`, 'As postagens no fórum já foram feitas.', '<button type="button" class="btn-mini" data-acao="pendentes"><i class="fa-solid fa-rotate"></i>Enviar agora</button>'));
    definirHtml(el.avisos, itens.join(''));
    el.avisos.hidden = !itens.length;
  }

  function atualizar() {
    renderNumero();
    renderPeriodoMsg();
    renderResponsavel();
    renderPoliciais();
    renderEnvio();
  }

  /* ---------- tema claro e escuro ---------- */
  function temaSalvo() {
    try { const t = localStorage.getItem(CHAVE_TEMA); return t === 'claro' || t === 'escuro' ? t : ''; } catch (_) { return ''; }
  }
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
    try { localStorage.setItem(CHAVE_TEMA, novo); } catch (_) { /* sem armazenamento */ }
    aplicarTema(novo, el.tema);
  }

  /* ---------- modal e toasts ---------- */
  function abrirModal({ tipo, titulo, corpo, acoes, aoFechar }) {
    el.modalIcone.className = 'modal-icone ' + tipo;
    el.modalIcone.innerHTML = `<i class="fa-solid ${tipo === 'sucesso' ? 'fa-check' : tipo === 'erro' ? 'fa-xmark' : 'fa-question'}"></i>`;
    el.modalTitulo.textContent = titulo;
    el.modalCorpo.innerHTML = corpo;
    el.modalAcoes.innerHTML = '';
    acoes.forEach(a => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = a.classe || 'btn-sec';
      b.innerHTML = (a.icone ? `<i class="fa-solid ${a.icone}"></i>` : '') + `<span>${esc(a.rotulo)}</span>`;
      b.addEventListener('click', a.acao);
      el.modalAcoes.appendChild(b);
    });
    S.aoFecharModal = aoFechar || null;
    el.modal.hidden = false;
    document.body.classList.add('overflow-hidden');
    const ultimo = el.modalAcoes.lastElementChild;
    if (ultimo) ultimo.focus();
  }
  function fecharModal() {
    el.modal.hidden = true;
    document.body.classList.remove('overflow-hidden');
    S.aoFecharModal = null;
  }
  function confirmar(titulo, texto, rotuloSim) {
    return new Promise(res => abrirModal({
      tipo: 'pergunta', titulo, corpo: `<p>${esc(texto)}</p>`,
      aoFechar: () => res(false),
      acoes: [
        { rotulo: 'Cancelar', classe: 'btn-sec', acao: () => { fecharModal(); res(false); } },
        { rotulo: rotuloSim, classe: 'btn-pri', acao: () => { fecharModal(); res(true); } }
      ]
    }));
  }
  function mostrarErro(titulo, msg) {
    abrirModal({ tipo: 'erro', titulo, corpo: `<p>${esc(msg)}</p>`, acoes: [{ rotulo: 'Fechar', classe: 'btn-pri', acao: fecharModal }] });
  }
  function toast(msg, tipo) {
    const n = document.createElement('div');
    n.className = 'toast';
    n.innerHTML = `<i class="fa-solid ${tipo === 'erro' ? 'fa-circle-exclamation text-red-500' : 'fa-circle-check text-af-400'}"></i><span>${esc(msg)}</span>`;
    el.toasts.appendChild(n);
    setTimeout(() => { n.classList.add('saindo'); setTimeout(() => n.remove(), 260); }, 2800);
  }

  /* ==================================================================
     ENVIO
     ================================================================== */
  async function enviarPostagem() {
    if (S.enviando || !avaliar().pronto) return;
    const modelo = montarModelo();
    const dest = destino();
    const g = S.grupo;
    const assinatura = JSON.stringify([g.id, dest.topico, modelo.cargo, modelo.periodo, modelo.numero, modelo.policiais, modelo.motivoTexto]);
    if (assinatura === S.ultimaAssinatura) {
      const ok = await confirmar('Postagem repetida', 'Você acabou de postar exatamente estes dados. Deseja postar de novo?', 'Postar de novo');
      if (!ok) return;
    }
    S.enviando = 'forum';
    el.campos.disabled = true;
    renderEnvio();

    // Garante o tamanho real dos brasões antes de montar a postagem.
    await Promise.race([Promise.all([medirImagem(modelo.brasao), medirImagem(CFG.BRASAO_AF)]), espera(6000)]);

    let post;
    try {
      post = await postarNoTopico(dest.topico, gerarBBCode(modelo), [modelo.periodo, modelo.policiais[0], modelo.responsavel]);
    } catch (e) {
      S.enviando = false;
      el.campos.disabled = false;
      renderEnvio();
      mostrarErro('Postagem não enviada', e.message);
      return;
    }
    S.ultimaAssinatura = assinatura;

    S.enviando = 'planilha';
    renderEnvio();
    const registro = {
      id: post.id || '',
      grupo: g.nome,
      sigla: g.id,
      temporarias: dest.temporarias,
      responsavel: modelo.responsavel,
      cargo: modelo.cargo,
      periodo: modelo.periodo,
      policiais: modelo.policiais.join(' / '),
      numero: modelo.numero,
      motivo: modelo.motivoTexto
    };
    let reg;
    try {
      const r = await api('registrar', { dados: registro });
      reg = { ok: true, duplicado: !!r.duplicado };
    } catch (e) {
      reg = { ok: false, erro: e.message };
      guardarPendente(registro);
    }
    S.enviando = false;
    el.campos.disabled = false;
    renderEnvio();
    mostrarSucesso(post, reg, dest);
  }

  function mostrarSucesso(post, reg, dest) {
    const g = S.grupo;
    const planilha = reg.ok
      ? `<div class="linha-status ok"><i class="fa-solid fa-table"></i><span>Registrado na planilha${reg.duplicado ? ' (já constava)' : ''}.</span></div>`
      : `<div class="linha-status aviso"><i class="fa-solid fa-triangle-exclamation"></i><span>A planilha não respondeu (${esc(reg.erro)}). O registro ficou na fila e pode ser reenviado pelo aviso no topo da página.</span></div>`;
    abrirModal({
      tipo: 'sucesso',
      titulo: 'Postagem enviada',
      corpo: `<p>Publicada em <strong class="text-texto">[AF] ${esc(g.nome)}${dest.temporarias ? ' (temporárias)' : ''}</strong>${post.id ? ` <span class="text-musgo">· mensagem ${esc(post.id)}</span>` : ''}.</p>${planilha}`,
      aoFechar: () => novaPostagem(),
      acoes: [
        { rotulo: 'Nova postagem', classe: 'btn-sec', icone: 'fa-plus', acao: () => { fecharModal(); novaPostagem(); } },
        { rotulo: 'Ver postagem', classe: 'btn-pri', icone: 'fa-arrow-up-right-from-square', acao: () => { location.href = post.url || `/t${dest.topico}-?view=newest`; } }
      ]
    });
  }

  /* ==================================================================
     EVENTOS E INÍCIO
     ================================================================== */
  function ligarEventos() {
    el.responsavel.addEventListener('input', () => { atualizar(); agendarVerificacao(); });
    el.responsavel.addEventListener('blur', () => { canonizarResponsavel(); atualizar(); });

    el.segmento.addEventListener('change', e => { if (e.target.name === 'interno') definirInterno(e.target.value === 'sim'); });
    el.motivos.addEventListener('change', e => { if (e.target.name === 'motivo') escolherMotivo(e.target.value); });

    el.numero.addEventListener('input', () => {
      const v = el.numero.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 4);
      if (v !== el.numero.value) el.numero.value = v;
      S.numero = v;
      atualizar();
    });
    el.numero.addEventListener('blur', () => { if (S.numero) S.tocado.add('numero'); atualizar(); });
    el.sinal.addEventListener('click', () => { S.sinalCorrecao = S.sinalCorrecao > 0 ? -1 : 1; atualizar(); });

    el.periodo.addEventListener('input', () => { lerPeriodoLivre(); atualizar(); });
    el.periodo.addEventListener('blur', () => {
      S.tocado.add('periodo');
      const p = interpretarPeriodo(el.periodo.value);
      if (p) el.periodo.value = p.texto;
      lerPeriodoLivre();
      atualizar();
    });

    el.policiais.addEventListener('input', () => { autoAltura(); atualizar(); agendarVerificacao(); });
    el.policiais.addEventListener('blur', normalizarPoliciais);
    el.policiais.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      e.preventDefault();
      const ta = el.policiais, ini = ta.selectionStart, fim = ta.selectionEnd;
      const antes = ta.value.slice(0, ini).replace(/\s+$/, ''), depois = ta.value.slice(fim).replace(/^\s+/, '');
      if (!antes || /\/$/.test(antes)) return;
      ta.value = antes + ' / ' + depois;
      const pos = antes.length + 3;
      ta.setSelectionRange(pos, pos);
      ta.dispatchEvent(new Event('input'));
    });

    el.checklist.addEventListener('click', e => { const b = e.target.closest('[data-item]'); if (b) irPara(b.dataset.item); });
    el.alertas.addEventListener('click', e => { if (e.target.closest('[data-acao="reverificar"]')) reverificar(); });
    el.avisos.addEventListener('click', e => { if (e.target.closest('[data-acao="pendentes"]')) enviarPendentes(false); });
    el.formulario.addEventListener('submit', e => { e.preventDefault(); enviarPostagem(); });
    el.tema.addEventListener('click', alternarTema);
    if (midiaClaro) {
      const seguirSistema = e => { if (!temaSalvo()) aplicarTema(e.matches ? 'claro' : 'escuro'); };
      if (midiaClaro.addEventListener) midiaClaro.addEventListener('change', seguirSistema);
      else if (midiaClaro.addListener) midiaClaro.addListener(seguirSistema);
    }
    el.modal.addEventListener('click', e => { if (e.target === el.modal && S.aoFecharModal) { const f = S.aoFecharModal; fecharModal(); f(); } });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !el.modal.hidden && S.aoFecharModal) { const f = S.aoFecharModal; fecharModal(); f(); }
    });
    window.addEventListener('resize', autoAltura);
  }

  function preencherPelaUrl() {
    const p = new URLSearchParams(location.search);
    const g = p.get('grupo');
    if (g) {
      const alvo = GRUPOS.find(x => normal(x.nome) === normal(g) || x.id.toLowerCase() === g.toLowerCase());
      if (alvo) escolherGrupo(alvo.id);
    }
    if (p.get('responsavel')) el.responsavel.value = limparNick(p.get('responsavel'));
    if (p.get('policiais')) { el.policiais.value = p.get('policiais'); autoAltura(); }
  }

  async function carregarSessao() {
    try {
      const nick = await obterUsuario();
      if (nick) {
        S.sessao = 'ok';
        S.usuario = nick;
        if (!el.responsavel.value.trim()) el.responsavel.value = nick;
      } else S.sessao = 'deslogado';
    } catch (_) {
      S.sessao = 'erro';
    }
    renderUsuario();
    renderAvisos();
    atualizar();
    agendarVerificacao(0);
  }

  function iniciar() {
    el.ano.textContent = new Date().getFullYear();
    pintarBotaoTema();
    montarChecklist();
    renderMotivos();
    renderSlot();
    renderPeriodo();
    ligarEventos();
    preencherPelaUrl();
    autoAltura();
    renderUsuario();
    renderAvisos();
    atualizar();
    agendarVerificacao(0);
    carregarSessao();
    extrairCores();
    enviarPendentes(true);
    setTimeout(medirBrasoes, 300);
  }

  // Exposto para testes e para depuração pelo console.
  window.CofreAF = {
    CFG, GRUPOS, MOTIVOS, S, gerarPeriodos, interpretarPeriodo, interpretarData, tokens, regraNumero, validarNumero,
    montarModelo, gerarBBCode, imagemBB, medirImagem, extrairPostagem, corLegivel, corLegivelClaro, temaPostagem,
    avaliar, escolherGrupo, escolherMotivo, definirInterno, aplicarTema, partesSubgrupo
  };

  iniciar();
})();