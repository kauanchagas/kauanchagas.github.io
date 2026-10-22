(() => {
  'use strict';

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
    s.addEventListener('load', () => (window.CofreNucleo ? fn(window.CofreNucleo) : semNucleo()));
    s.addEventListener('error', semNucleo);
  }
  function semNucleo() {
    const av = document.getElementById('avisos');
    if (av) av.innerHTML = '<div class="aviso aviso-erro"><i class="fa-solid fa-plug-circle-xmark"></i><p class="min-w-0 flex-1"><span class="font-semibold">O formulário não carregou por completo.</span> <span class="opacity-80">Recarregue a página. Se continuar, avise a Auditoria Fiscal.</span></p></div>';
  }

  comNucleo(N => {
    const {
      CFG, GRUPOS, MOTIVOS, MESES, MESES_LONGOS, POR_PERIODO, TEMA_AF, COR_VAZIO, BRASAO_CAIXA, RODAPE_CAIXA,
      esc, semAcento, normal, limparNick, chaveNick, limparBB, dois, maiuscula, juntarE, decodificarHtml, espera,
      hexRgb, rgbHex, rgbHsl, hslHex, luminancia, rgba, corLegivel, corLegivelClaro, dia, hoje0, somaDias,
      ultimoDia, fmtData, fmtPeriodo, nomeMes, gerarPeriodos, indiceMes, interpretarData, interpretarPeriodo,
      tokens, temSubgrupos, faixaPositiva, limiteSubgrupo, apiConfigurada, corGrupo, partesSubgrupo, api,
      obterUsuario, extrairPostagem, localizarPostagem, postarNoTopico, dimensao, medirImagem, medirBrasoes,
      imagemBB, temaPostagem, gerarBBCode, corDoBrasao
    } = N;

    const CHAVE_PENDENTES = 'af-cofre:pendentes';
    const CHAVE_TEMA = 'af-cofre:tema';
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

    /* ==================================================================
       ESTADO
       ================================================================== */
    const S = {
      sessao: 'carregando', usuario: '',
      grupo: null, interno: false, motivo: null, cargo: null, subgrupo: '',
      periodo: '', periodoLink: null, numero: '', sinalCorrecao: 1,
      verif: new Map(), verifPend: new Set(), verifFalha: new Set(), verifErro: '', especializacoesOk: true,
      tocado: new Set(), cores: N.cores, enviando: false, ultimaAssinatura: '', aoFecharModal: null
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
    const tonsGrupo = g => { const b = corGrupo(g); return { e: corLegivel(b), c: corLegivelClaro(b) }; };
    const varsTom = k => `--ce:${k.e};--cc:${k.c}`;

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

    const textoMotivo = () => N.textoMotivo({ motivo: S.motivo, cargo: S.cargo, subgrupo: S.subgrupo, interno: S.interno });
    const regraNumero = () => N.regraMedalhas({ grupo: S.grupo, motivo: S.motivo, cargo: S.cargo, interno: S.interno });

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

    function montarModelo() {
      const dest = destino();
      const nv = validarNumero();
      const nomes = tokensPoliciais().filter(t => t.estado !== 'duplicado').map(t => (t.r && t.r.encontrado && t.r.nick ? t.r.nick : t.nick));
      const respR = S.verif.get(chaveNick(el.responsavel.value));
      const responsavel = respR && respR.encontrado && respR.nick ? respR.nick : limparNick(el.responsavel.value);
      return N.modeloPostagem({
        grupo: S.grupo, motivo: S.motivo, interno: S.interno, cargo: S.cargo, subgrupo: S.subgrupo, periodo: S.periodo,
        numero: nv.ok ? nv.valor : null, policiais: nomes, responsavel, temporarias: !!(dest && dest.temporarias)
      });
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
        const grupoDe = p => (S.cargo.periodo === 'mensal' ? String(p.ini.getFullYear()) : nomeMes(p.ini));
        const ops = ps.map(p => ({ valor: p.texto, rotulo: p.texto, grupo: grupoDe(p), p }));
        // Período vindo do link que não está na lista padrão: entra na lista, na ordem das datas.
        const pl = S.periodoLink;
        if (pl && !ops.some(o => o.valor === pl.texto)) {
          ops.push({ valor: pl.texto, rotulo: pl.texto, grupo: grupoDe(pl), p: { ini: pl.ini, fim: pl.fim, emAndamento: pl.fim >= hoje0() } });
          ops.sort((a, b) => b.p.ini - a.p.ini || b.p.fim - a.p.fim);
        }
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
      const k = chaveNick(el.responsavel.value), est = estadoNick(k);
      definirHtml(el.responsavelEstado, k && apiConfigurada() ? (ICONES_ESTADO[est] || '') : '');
      const msg = est === 'inexistente' || est === 'desativado' ? 'Não existe policial ativo com este nickname no RCCSystem.' : '';
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
        const um = des.length + ine.length === 1;
        caixas.push(caixaAlerta('erro', 'fa-xmark', um ? 'Não existe policial ativo com este nickname no RCCSystem.' : 'Não existem policiais ativos com estes nicknames no RCCSystem.',
          [...des, ...ine].sort((a, b) => a.ini - b.ini).map(t => [t.nick, ''])));
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
      el.modalCorpo.hidden = !corpo;
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
    function toast(msg, tipo, duracao = 2800) {
      const n = document.createElement('div');
      n.className = 'toast';
      n.innerHTML = `<i class="fa-solid ${tipo === 'erro' ? 'fa-circle-exclamation text-red-500' : 'fa-circle-check text-af-400'}"></i><span>${esc(msg)}</span>`;
      el.toasts.appendChild(n);
      setTimeout(() => { n.classList.add('saindo'); setTimeout(() => n.remove(), 260); }, duracao);
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
      // Só avisa quando a planilha não respondeu; no caso normal o modal fica limpo.
      const planilha = reg.ok ? ''
        : `<div class="linha-status aviso"><i class="fa-solid fa-triangle-exclamation"></i><span>A planilha não respondeu (${esc(reg.erro)}). O registro ficou na fila e pode ser reenviado pelo aviso no topo da página.</span></div>`;
      abrirModal({
        tipo: 'sucesso',
        titulo: 'Postagem enviada',
        corpo: planilha,
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

    /* ---------- preenchimento pelo link ----------
       ?grupo=SUP&motivo=meta&cargo=Ministro&periodo=04+Out+2026+a+10+Out+2026&medalhas=15&policiais=Nick1+/+Nick2
       Também aceita os nomes do formulário antigo (responsavel_med, grupo_tarefas, periodo_med,
       gratificados_med, cargo_med, numero_med, motivo_grat). Nada é postado sozinho. */
    const PARAMETROS = {
      responsavel: ['responsavel', 'responsavel_med'],
      grupo: ['grupo', 'grupo_tarefas'],
      subgrupo: ['subgrupo', 'subgrupo_med'],
      motivo: ['motivo', 'motivo_grat', 'motivo_med'],
      cargo: ['cargo', 'cargo_med'],
      periodo: ['periodo', 'periodo_med'],
      medalhas: ['medalhas', 'numero', 'numero_med'],
      policiais: ['policiais', 'gratificados', 'gratificados_med']
    };
    const chaveBusca = s => normal(s).replace(/[^a-z0-9]+/g, ' ').trim();
    const unico = (lista, teste) => { const l = lista.filter(teste); return l.length === 1 ? l[0] : null; };
    function acharGrupo(v) {
      const k = chaveBusca(v);
      if (!k) return null;
      return GRUPOS.find(g => chaveBusca(g.nome) === k || chaveBusca(g.id) === k)
        || unico(GRUPOS, g => { const n = chaveBusca(g.nome); return n.includes(k) || k.includes(n); });
    }
    function acharSubgrupo(g, v) {
      const k = chaveBusca(v);
      const lista = (g.subgrupos || []).map(s => ({ s, p: partesSubgrupo(s) }));
      const x = lista.find(o => chaveBusca(o.s) === k || chaveBusca(o.p.nome) === k || (o.p.sigla && chaveBusca(o.p.sigla) === k))
        || unico(lista, o => chaveBusca(o.p.nome).includes(k));
      return x ? x.s : '';
    }
    function acharCargo(g, v) {
      const k = chaveBusca(String(v).replace(/\s*\([^)]*\)\s*$/, '')), ks = chaveBusca(v);
      let i = g.cargos.findIndex(cg => chaveBusca(cg.nome) === k || chaveBusca(cg.sigla) === ks);
      if (i < 0) { const cg = unico(g.cargos, x => chaveBusca(x.nome).startsWith(k)); i = cg ? g.cargos.indexOf(cg) : -1; }
      return i;
    }
    function acharMotivo(v) {
      const k = chaveBusca(v);
      const direto = MOTIVOS.find(m => chaveBusca(m.id) === k || chaveBusca(m.rotulo) === k);
      if (direto) return direto.id;
      const regras = [[/extra/, 'funcao-extra'], [/^nao (cumpri|meta)/, 'nao-meta'], [/rebaix/, 'rebaixamento'], [/expul/, 'expulsao'],
        [/saida/, 'saida'], [/infra/, 'infracao'], [/corre/, 'correcao'], [/cumpri|meta/, 'meta']];
      const r = regras.find(([re]) => re.test(k));
      return r ? r[1] : '';
    }

    function preencherPelaUrl() {
      const p = new URLSearchParams(location.search), q = {};
      Object.entries(PARAMETROS).forEach(([k, nomes]) => {
        const nome = nomes.find(n => (p.get(n) || '').trim());
        q[k] = nome ? p.get(nome).trim() : '';
      });
      const falhas = [];
      if (!Object.values(q).some(Boolean)) return falhas;

      if (q.responsavel) el.responsavel.value = limparNick(q.responsavel);
      const g = q.grupo ? acharGrupo(q.grupo) : null;
      if (g) escolherGrupo(g.id);
      else if (q.grupo) falhas.push('o grupo');

      if (q.subgrupo) {
        const s = g && temSubgrupos(g) ? acharSubgrupo(g, q.subgrupo) : '';
        if (s) { definirInterno(true); S.subgrupo = s; selSubgrupo.definir(s); }
        else falhas.push('o subgrupo');
      }
      if (q.motivo) {
        const m = acharMotivo(q.motivo);
        if (m && motivosDisponiveis().some(x => x.id === m)) { escolherMotivo(m); renderMotivos(); }
        else falhas.push('o motivo');
      }
      if (q.cargo && !S.interno) {
        const i = g ? acharCargo(g, q.cargo) : -1;
        if (i >= 0) { S.cargo = g.cargos[i]; selCargo.definir(String(i)); }
        else falhas.push('o cargo');
      }
      if (q.periodo) {
        const per = interpretarPeriodo(q.periodo);
        if (per) { S.periodoLink = per; S.periodo = per.texto; el.periodo.value = per.texto; S.tocado.add('periodo'); }
        else falhas.push('o período');
      }
      renderSlot();
      renderPeriodo();
      if (q.medalhas) {
        const m = q.medalhas.replace(/\s+/g, '').match(/^([+-]?)(\d{1,4})$/);
        const r = regraNumero();
        if (!m) falhas.push('o número de medalhas');
        else if (!(r && r.fixo)) {
          if (m[1] === '-' && r && r.sinal === 0) S.sinalCorrecao = -1;
          S.numero = String(parseInt(m[2], 10));
          el.numero.value = S.numero;
          S.tocado.add('numero');
        }
      }
      if (q.policiais) {
        el.policiais.value = q.policiais.split(/\s*[\/\n\r]+\s*/).map(limparNick).filter(Boolean).join(' / ');
        autoAltura();
      }
      return falhas;
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
      const falhasLink = preencherPelaUrl();
      if (falhasLink.length) setTimeout(() => toast(`Não reconheci ${juntarE(falhasLink)} do link. Confira e preencha.`, 'erro', 7000), 700);
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
  });
})();
