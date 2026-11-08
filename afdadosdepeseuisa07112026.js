 /* Se o código principal (logo abaixo) não rodar, a página explica o que houve em vez de ficar em branco. */
  window.addEventListener('load', function () {
    setTimeout(function () {
      var app = document.getElementById('app'), ano = document.getElementById('ano-rodape');
      if (window.AfPesquisa || !app) return;
      if (ano && !ano.textContent) ano.textContent = String(new Date().getFullYear());
      app.innerHTML = '<div class="cartao mx-auto max-w-xl text-center" style="padding:28px 24px">' +
        '<i class="fa-solid fa-triangle-exclamation text-[28px] text-aviso"></i>' +
        '<h2 class="mt-3 text-[18px] font-bold text-texto">A ferramenta não carregou</h2>' +
        '<p class="mt-2 text-[13px] leading-relaxed text-musgo">O código desta página não rodou. Isso acontece quando o arquivo é cortado ou alterado ao salvar no painel do fórum, ou num navegador muito antigo. Atualize o navegador; se continuar, cole de novo o arquivo inteiro na página HTML, sem editar nada, e salve.</p>' +
        '</div>';
    }, 1200);
  });

/* ---- nucleo.js ---- */
/* =====================================================================
   NÚCLEO: leitura e cálculos da Escala de Dados de Pesquisa (sem DOM).
   Datas são "dias" inteiros (dias desde 01/01/1970, em UTC), para não
   depender de fuso nem de horário de verão.
   ===================================================================== */
const PesquisaNucleo = (function () {
  'use strict';

  /* ---------------------------------------------------------------
     TEXTO
     --------------------------------------------------------------- */
  const semAcento = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '');
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

  // eventos: todos os lidos (janela inteira). Devolve os movimentos (entrada/saída) com situação.
  // Cancelados e riscados ficam fora; repetidos (entrada sobre entrada, saída sobre saída) também.
  function movimentos(eventos, opc) {
    opc = opc || {};
    const raiz = apelidos(eventos);
    const lista = eventos.filter(e => (e.grupo === 'entrada' || e.grupo === 'saida') && e.chave && e.dia != null).sort(ordemEv);
    const estado = new Map(), ultimo = new Map();
    const naListagem = opc.listagem || null; // Set de chaves
    const raizesListagem = naListagem ? new Set([...naListagem].map(raiz)) : null;
    const estaNaListagem = k => !!raizesListagem && raizesListagem.has(raiz(k));
    lista.forEach(e => {
      const k = raiz(e.chave);
      e.raiz = k;
      e.avisosMov = [];
      if (e.cancelado) {
        e.situacao = 'cancelado'; e.contaPadrao = false;
        e.citadoEm = [{ post: e.cancelado.post, url: e.cancelado.url, dia: e.cancelado.dia, cancela: true }];
        e.avisosMov.push('cancelado na mensagem de ' + fmtDia(e.cancelado.dia) + (e.cancelado.como === 'texto' ? ' (o cancelamento não cita o requerimento: confira)' : ''));
        return;
      }
      if (e.riscado) { e.situacao = 'riscado'; e.contaPadrao = false; e.avisosMov.push('o nick está riscado na mensagem'); return; }
      const st = estado.get(k);
      const ant = ultimo.get(k);
      const tipoMov = e.grupo;
      if (st === (tipoMov === 'entrada' ? 'dentro' : 'fora') && ant) {
        // O mesmo requerimento postado de novo vem em poucos dias. Bem depois (ou com requerimentos da pessoa
        // no meio, como advertência e licença), é outro movimento e a entrada ou saída do meio é que não foi postada.
        const ativo = tipoMov === 'saida' && eventos.some(x => x.chave && raiz(x.chave) === k && x.dia > ant.dia && x.dia < e.dia && x.grupo !== 'entrada' && x.grupo !== 'saida' && x.tipo !== 'nota' && !x.cancelado);
        // a remoção na fiscalização costuma ser seguida do requerimento formal de expulsão, às vezes semanas depois
        const prazo = ant.tipo === 'fiscalizacao' && e.tipo !== 'fiscalizacao' ? 21 : 7;
        if (e.dia - ant.dia <= prazo && !ativo) {
          e.situacao = 'repetido'; e.contaPadrao = false; e.repeteDe = ant.id;
          e.avisosMov.push((tipoMov === 'entrada' ? 'entrada' : 'saída') + ' repetida: já havia ' + (tipoMov === 'entrada' ? 'entrada' : 'saída') + ' em ' + fmtDia(ant.dia) + ' sem movimento contrário no meio');
          return;
        }
        e.avisosMov.push(tipoMov === 'entrada'
          ? 'não achei a saída entre esta entrada e a de ' + fmtDia(ant.dia) + ': confira'
          : 'não achei a entrada entre esta saída e a de ' + fmtDia(ant.dia) + (ativo ? ' (há requerimentos dele no meio)' : '') + ': confira');
      }
      e.situacao = 'conta'; e.contaPadrao = true;
      estado.set(k, tipoMov === 'entrada' ? 'dentro' : 'fora');
      ultimo.set(k, e);
    });
    // conferência com a listagem atual e com os movimentos seguintes
    lista.forEach((e, i) => {
      if (e.situacao !== 'conta') return;
      const depois = lista.slice(i + 1).filter(x => x.raiz === e.raiz && x.situacao === 'conta');
      const contrario = depois.find(x => x.grupo !== e.grupo);
      if (!naListagem) { e.confirmacao = 'sem-listagem'; return; }
      const esta = estaNaListagem(e.raiz);
      if (e.grupo === 'entrada') {
        if (esta) e.confirmacao = 'na-listagem';
        else if (contrario) e.confirmacao = 'saiu-depois';
        else { e.confirmacao = 'nao-confirmada'; e.avisosMov.push('não está na listagem atual e não achei saída depois: confira se a entrada valeu'); }
      } else {
        if (!esta) e.confirmacao = 'fora-da-listagem';
        else if (contrario) e.confirmacao = 'voltou-depois';
        else { e.confirmacao = 'nao-confirmada'; e.avisosMov.push('ainda aparece na listagem atual: confira se a saída foi cancelada ou se a listagem não foi atualizada'); }
      }
    });
    return lista;
  }

  // Conta por semana (só os itens incluídos). incluir(e) decide (padrão + escolha do auditor).
  function contarPorSemana(lista, semanas, incluir) {
    return semanas.map(s => {
      const daSemana = lista.filter(e => e.dia >= s.ini && e.dia <= s.fim);
      const ent = daSemana.filter(e => e.grupo === 'entrada' && incluir(e));
      const sai = daSemana.filter(e => e.grupo === 'saida' && incluir(e));
      return { semana: s, entradas: ent.length, saidas: sai.length, itensEntrada: ent, itensSaida: sai, todos: daSemana };
    });
  }

  /* ---------------------------------------------------------------
     PORCENTAGENS (tópico do fórum): seções, contagem de membros e aulas
     --------------------------------------------------------------- */
  const VOCAB_PADRAO = [
    ['casos especiais', 'esp'], ['caso especial', 'esp'], ['casos especias', 'esp'], ['isentos', 'esp'], ['isento', 'esp'], ['especiais', 'esp'],
    ['abaixo da media', 'neg'], ['negativos', 'neg'], ['negativo', 'neg'], ['irregulares', 'neg'], ['irregular', 'neg'], ['nao cumpriram', 'neg'], ['metas nao cumpridas', 'neg'],
    ['acima da media', 'pos'], ['na media', 'pos'], ['destaques', 'pos'], ['destaque', 'pos'], ['excelentes', 'pos'], ['excelente', 'pos'],
    ['otimos', 'pos'], ['otimo', 'pos'], ['bons', 'pos'], ['positivos', 'pos'], ['positivo', 'pos'], ['regulares', 'pos'], ['regular', 'pos'],
    ['cumpriram', 'pos'], ['metas cumpridas', 'pos']
  ];
  const PREFIXOS_SECAO = 'instrutores|supervisores|treinadores(?: de nivel (?:[0-9]|i{1,3}))?|professores|mentores|membros|policiais|tutores|graduadores|monitores|avaliadores|capacitadores|ministros|estagiarios|fiscalizadores|coordenadores|conselheiros';
  function prepararVocab(lista) {
    return (lista && lista.length ? lista : VOCAB_PADRAO)
      .map(([frase, classe, rotulo]) => ({ frase: norm(frase), classe, rotulo: rotulo || frase }))
      .sort((a, b) => b.frase.length - a.frase.length)
      .map(v => Object.assign(v, { re: new RegExp('^(?:(?:' + PREFIXOS_SECAO + ')\\s+)?(?:(?:em|com|de)\\s+)?' + escRe(v.frase) + '(?![a-z])') }));
  }
  function secaoDaLinha(linha, vocab) {
    const primeira = tirarMarcas(linha).split(' | ')[0];
    const l = norm(primeira).replace(/^[^a-z0-9]+/, '');
    if (!l || l.length > 70) return null;
    for (const v of vocab) if (v.re.test(l)) return v;
    return null;
  }
  const CLASSE_NOME = { pos: 'Positivos', neg: 'Negativos', esp: 'Casos especiais' };
  // Linha de membro (contagem de reserva, quando o padrão da companhia não aparece).
  const RE_MEMBRO_LIVRE = /^(?:\d{1,3}\s*[.)•\-\u2013]?\s*)?(?:[•·▪►»*\-]\s*)?([^\s|]{2,25})(?:\s*(?:[-\u2013\u2014|:(]|$))/;
  const PALAVRAS_NAO_NICK = /^(total|totais|nenhum|nenhuma|obs|observacao|observacoes|legenda|semana|periodo|meta|metas|pontos|aulas|data|cargo|motivo|responsavel|atenciosamente|parabens|enquadram-se|consideram-se)$/;
  // Onde a lista de membros acaba (os totais e o rodapé vêm depois).
  const PARADAS_PADRAO = ['total de', 'totais', 'total geral', 'legenda', 'reservam-se', 'desenvolvido por', 'design inspirado', 'todos os direitos'];

  function porcentagemDoTexto(linhas, cfg) {
    cfg = cfg || {};
    const vocab = prepararVocab(cfg.secoes);
    const paradas = PARADAS_PADRAO.concat(cfg.fim || []).map(norm);
    const membroRe = cfg.membro ? new RegExp('\\d+\\s*' + escRe(norm(cfg.membro)).replace(/\\\|/g, '\\s*\\|').replace(/ /g, '\\s*')) : null;
    // linhas fora dos spoilers de legenda
    const limpas = [];
    let legenda = 0;
    (linhas || []).forEach(l => {
      if (/^\{\{spoiler:/.test(l)) { if (legenda || /legenda/i.test(l)) legenda++; return; }
      if (l === '{{/spoiler}}') { if (legenda) legenda--; return; }
      if (legenda) return;
      const t = tirarMarcas(l);
      if (t) limpas.push(t);
    });
    // Títulos de seção: em maiúsculas ou terminados em ":" quando a postagem tem títulos assim
    // (a linha "Caso Especial" embaixo de um treinador é o motivo, não um título novo).
    const forte = l => { const letras = l.replace(/[^A-Za-zÀ-ÿ]/g, ''); const mai = letras.replace(/[^A-ZÀ-Þ]/g, '').length; return /:\s*$/.test(l) || (letras.length >= 4 && mai / letras.length >= 0.7); };
    const candidatos = limpas.map(l => secaoDaLinha(l, vocab));
    const estrito = limpas.some((l, i) => candidatos[i] && forte(l));
    const semInicio = l => norm(l).replace(/^[^a-z0-9]+/, '');
    const secoes = [];
    let atual = null;
    for (let i = 0; i < limpas.length; i++) {
      const l = limpas[i];
      const sec = candidatos[i];
      if (sec && (!estrito || forte(l))) { atual = { rotulo: sec.rotulo, frase: sec.frase, classe: sec.classe, linhas: [], titulo: l }; secoes.push(atual); continue; }
      if (atual && paradas.some(f => semInicio(l).startsWith(f))) break;
      if (atual) atual.linhas.push(l);
    }
    const avisos = [], notas = [];
    const usaPadrao = !!membroRe && limpas.some(l => membroRe.test(norm(l)));
    secoes.forEach(s => {
      const vazia = s.linhas.some(l => /^(nenhum|nenhuma|sem membros?|nao ha)\b/.test(semInicio(l)));
      const porPadrao = usaPadrao ? s.linhas.filter(l => membroRe.test(norm(l))).length : null;
      const livres = s.linhas.filter(l => { const m = RE_MEMBRO_LIVRE.exec(norm(l)); return m && !PALAVRAS_NAO_NICK.test(m[1]) && !secaoDaLinha(l, vocab); }).length;
      if (porPadrao != null) s.n = porPadrao;
      else if (vazia) s.n = 0;
      else { s.n = livres; s.reserva = true; }
      if (vazia && s.n) avisos.push('Em "' + s.titulo + '" há "nenhum membro" e também ' + s.n + ' linha(s) de membro.');
    });
    if (secoes.some(s => s.reserva) && membroRe) avisos.push('O padrão de membro ("' + cfg.membro + '") não apareceu na postagem; contei uma linha por membro.');
    const soma = c => secoes.filter(s => s.classe === c).reduce((t, s) => t + s.n, 0);
    const vistas = {};
    secoes.forEach(s => { vistas[s.frase] = (vistas[s.frase] || 0) + 1; });
    Object.keys(vistas).filter(f => vistas[f] > 1).forEach(f => avisos.push('A seção "' + f + '" aparece ' + vistas[f] + ' vezes na mensagem.'));
    if (!secoes.length) avisos.push('Não achei as seções de positivos, negativos e casos especiais.');
    const aulas = aulasDoTexto(norm(limpas.join('\n')), cfg.aulas || []);
    const faltam = Object.keys(aulas).filter(k => aulas[k] == null);
    // com o quadro de totais na postagem, a aula que não aparece não foi aplicada na semana
    if (faltam.length && faltam.length < Object.keys(aulas).length) { faltam.forEach(k => { aulas[k] = 0; }); notas.push('Sem total de ' + faltam.join(', ') + ' na postagem: contei 0.'); }
    else faltam.forEach(k => avisos.push('Não achei o total de ' + k + '.'));
    return { secoes: secoes.map(s => ({ rotulo: s.titulo, classe: s.classe, n: s.n, reserva: !!s.reserva })), pos: soma('pos'), neg: soma('neg'), esp: soma('esp'), aulas, avisos, notas };
  }

  function aulasDoTexto(texto, aulasCfg) {
    const out = {};
    aulasCfg.forEach(a => {
      let valor = null;
      const frases = (a.frases && a.frases.length ? a.frases : [a.sigla]).map(norm);
      for (const f of frases) {
        const re = new RegExp('(?:^|[^a-z0-9])' + escRe(f).replace(/ /g, '\\s+') + '(?:\\s+aplicad[oa]s?)?\\s*[:=|\\-\\u2013]?\\s*\\[?\\s*(\\d{1,5})(?!\\d)', 'g');
        let m, ultimo = null, primeiro = null;
        while ((m = re.exec(texto))) { if (primeiro == null) primeiro = +m[1]; ultimo = +m[1]; }
        const v = a.ultima ? ultimo : primeiro;
        if (v != null) { valor = v; break; }
      }
      out[a.sigla] = valor;
    });
    return out;
  }

  // A mensagem é desta semana? 'exato', 'aproximado' (um dia de diferença numa das pontas) ou ''.
  function casaSemana(texto, semana, opc) {
    const pers = periodosDoTexto(texto, Object.assign({ anoBase: partes(semana.fim).a }, opc || {}));
    if (!pers.length) return '';
    const p = pers[0];
    if (p.ini === semana.ini && p.fim === semana.fim) return 'exato';
    if (pers.some(x => x.ini === semana.ini && x.fim === semana.fim)) return 'exato';
    if ((p.ini === semana.ini && Math.abs(p.fim - semana.fim) <= 1) || (p.fim === semana.fim && Math.abs(p.ini - semana.ini) <= 1)) return 'aproximado';
    return '';
  }
  // Período principal de uma mensagem de porcentagem (o primeiro de 5 a 16 dias).
  function periodoPrincipal(texto, opc) {
    return periodosDoTexto(texto, opc).find(p => p.fim - p.ini >= 5 && p.fim - p.ini <= 16) || null;
  }

  /* ---------------------------------------------------------------
     PORCENTAGEM EM PLANILHA (Professores): blocos semanais NICK, CRO, CAC, ...
     --------------------------------------------------------------- */
  const STATUS_PADRAO = [['caso especial', 'esp'], ['casos especiais', 'esp'], ['isento', 'esp'], ['licenca', 'esp'], ['irregular', 'neg'], ['negativo', 'neg'],
    ['excelente', 'pos'], ['otimo', 'pos'], ['bom', 'pos'], ['regular', 'pos'], ['destaque', 'pos'], ['positivo', 'pos']];
  function classeDoStatus(s, lista) {
    const t = norm(s);
    if (!t) return null;
    let melhor = null;
    (lista || STATUS_PADRAO).forEach(([f, c]) => { const ff = norm(f); if ((t === ff || t.indexOf(ff) !== -1) && (!melhor || ff.length > melhor[0].length)) melhor = [ff, c]; });
    return melhor ? melhor[1] : '?';
  }
  function porcentagemDaGrade(grade, semana, cfg) {
    cfg = cfg || {};
    const R = grade.length;
    const cel = (r, c) => (grade[r] && grade[r][c] != null ? String(grade[r][c]) : '');
    let ancora = null;
    for (let r = 0; r < Math.min(R, 80) && !ancora; r++) {
      const C = (grade[r] || []).length;
      for (let c = 0; c < C && !ancora; c++) {
        const v = cel(r, c);
        if (!/\d/.test(v)) continue;
        const k = casaSemana(v, semana);
        if (k) ancora = { r, c, tipo: k };
      }
    }
    if (!ancora) return null;
    // fim do bloco: próxima célula de período na mesma linha
    const C = Math.max(...grade.slice(ancora.r, ancora.r + 6).map(l => (l || []).length));
    let cFim = C, cIni = 0;
    for (let c = ancora.c + 1; c < C; c++) if (periodoPrincipal(cel(ancora.r, c))) { cFim = c; break; }
    for (let c = ancora.c - 1; c >= 0; c--) if (periodoPrincipal(cel(ancora.r, c))) { cIni = c + 1; break; }
    cIni = Math.max(cIni, ancora.c - 6);
    // cabeçalho: NICK ... STATUS (o bloco vai até o próximo NICK da mesma linha)
    const ehNick = v => /^(nick|nickname|membro|policial|professor)/.test(norm(v));
    const ehStatus = v => /^status|^situacao|^classificacao/.test(norm(v));
    const ehSigla = (v, a) => { const n = norm(v); return n === norm(a.sigla) || n.startsWith(norm(a.sigla) + ' '); };
    let h = -1, col = {};
    for (let r = ancora.r; r < Math.min(R, ancora.r + 6) && h < 0; r++) {
      const linha = grade[r] || [];
      let cNick = -1;
      for (let c = Math.max(cIni, ancora.c - 2); c < cFim; c++) if (ehNick(linha[c])) { cNick = c; break; }
      if (cNick < 0) continue;
      let fimBloco = cFim;
      for (let c = cNick + 1; c < cFim; c++) if (ehNick(linha[c])) { fimBloco = c; break; }
      let cStatus = -1;
      for (let c = cNick + 1; c < fimBloco; c++) if (ehStatus(linha[c])) { cStatus = c; break; }
      if (cStatus < 0) continue;
      h = r;
      col = { nick: cNick, status: cStatus, aulas: {} };
      for (let c = cNick + 1; c < fimBloco; c++) (cfg.aulas || []).forEach(a => { if (col.aulas[a.sigla] == null && ehSigla(linha[c], a)) col.aulas[a.sigla] = c; });
      // Aulas sem título neste bloco (a planilha só põe CRO, CAC, ... no modelo): usa a posição em relação
      // ao NICK de outro bloco da mesma linha que tem os títulos e o STATUS na mesma distância.
      const faltam = (cfg.aulas || []).filter(a => col.aulas[a.sigla] == null);
      const dStatus = cStatus - cNick;
      if (faltam.length && dStatus > 1) {
        for (let c = 0; c < linha.length; c++) {
          if (c === cNick || !ehNick(linha[c])) continue;
          let d = 1;
          while (d <= 12 && !ehStatus(linha[c + d] || '')) d++;
          if (d !== dStatus) continue;
          faltam.forEach(a => {
            if (col.aulas[a.sigla] != null) return;
            for (let x = 1; x < dStatus; x++) if (ehSigla(linha[c + x] || '', a)) { col.aulas[a.sigla] = cNick + x; break; }
          });
        }
      }
    }
    if (h < 0) return { erro: 'achei a semana, mas não o cabeçalho (NICK e STATUS)', ancora };
    const conta = { pos: 0, neg: 0, esp: 0 }, desconhecidos = [], nicks = { pos: [], neg: [], esp: [] };
    const somaAulas = {}; Object.keys(col.aulas).forEach(k => { somaAulas[k] = 0; });
    let totais = null;
    for (let r = h + 1; r < R; r++) {
      const nick = cel(r, col.nick).trim();
      const nn = norm(nick);
      if (/^total/.test(nn)) { totais = {}; Object.keys(col.aulas).forEach(k => { const m = /\d+/.exec(cel(r, col.aulas[k]).replace(/[.\s]/g, '')); totais[k] = m ? +m[0] : null; }); break; }
      if (!nick) continue;
      if (periodoPrincipal(nick)) break;
      if (/^(nick|nickname)$/.test(nn)) continue;
      const cls = classeDoStatus(cel(r, col.status), cfg.status);
      if (!cls) continue;
      if (cls === '?') { desconhecidos.push(nick + ' (' + cel(r, col.status) + ')'); continue; }
      conta[cls]++; nicks[cls].push(nick);
      Object.keys(col.aulas).forEach(k => { const v = parseFloat(String(cel(r, col.aulas[k])).replace(',', '.')); if (!isNaN(v)) somaAulas[k] += v; });
    }
    const aulas = {};
    (cfg.aulas || []).forEach(a => { aulas[a.sigla] = totais && totais[a.sigla] != null ? totais[a.sigla] : col.aulas[a.sigla] != null ? Math.round(somaAulas[a.sigla]) : null; });
    const avisos = [], notas = [];
    if (ancora.tipo === 'aproximado') avisos.push('o período da planilha tem um dia de diferença');
    if (desconhecidos.length) avisos.push('status não reconhecido: ' + desconhecidos.slice(0, 6).join(', ') + (desconhecidos.length > 6 ? '...' : ''));
    if (!totais) notas.push('A planilha não tem a linha de TOTAL nesta semana: somei as aulas linha a linha.');
    return { pos: conta.pos, neg: conta.neg, esp: conta.esp, nicks, aulas, avisos, notas, secoes: [{ rotulo: 'Status positivos', classe: 'pos', n: conta.pos }, { rotulo: 'IRREGULAR', classe: 'neg', n: conta.neg }, { rotulo: 'CASO ESPECIAL', classe: 'esp', n: conta.esp }] };
  }

  /* ---------------------------------------------------------------
     LISTAGEM DE MEMBROS
     Linhas vêm do DOM; spoilers chegam como {{spoiler:Título}} ... {{/spoiler}}.
     Formatos reais: cartões (nick numa linha, datas nas seguintes, etiquetas soltas), lista limpa
     ("Cargo" / nick / "entrada › promoção"), linhas "Cargo nick \u2212 datas" e o BBCode dos Treinadores
     ("01 • nick - 03 Jun 2022 - {04 Jan 2024} [L]").
     --------------------------------------------------------------- */
  // Palavra de cargo (no singular, plural ou com "(a)"), sem o resto da linha.
  const PALAVRA_PAPEL = [
    ['vice', /^vice[\s\-]*lider(?:es|as?)?(?:\([ao]\))?$/],
    ['lider', /^lider(?:es|as?)?(?:\([ao]\))?$/],
    ['lideranca', /^lideranca$/],
    ['ministro', /^ministr[oa]s?(?:\([ao]\))?$/],
    ['ministro', /^ministerios?$/],
    ['conselheiro', /^conselheir[oa]s?(?:\([ao]\))?$/],
    ['conselheiro', /^conselhos?$/],
    ['outro', /^(?:estagiari[oa]s?|graduador(?:es|as?)?|consultor(?:es|as?)?|instrutor(?:es|as?)?|supervisor(?:es|as?)?|tutor(?:es|as?)?|fiscalizador(?:es|as?)?|treinador(?:es|as?)?|professor(?:es|as?)?|mentor(?:es|as?)?|avaliador(?:es|as?)?|capacitador(?:es|as?)?|monitor(?:es|as?)?|coordenador(?:es|as?)?|membros?|agentes?|auxiliar(?:es)?|assistentes?|secretari[oa]s?|diretor(?:es|as?)?|analistas?|presidentes?|soldados?|cabos?|sargentos?|oficia(?:l|is)|efetivos?|candidatos?|alunos?|recrutas?|aplicador(?:es|as?)?)(?:\([ao]\))?$/]
  ];
  const papelDaPalavra = p => { const w = norm(p).replace(/[^a-z()\- ]/g, ''); for (const [papel, re] of PALAVRA_PAPEL) if (re.test(w)) return papel; return null; };
  // Linha que é só um título de cargo: "LÍDER {L.TRE} [01/01]", "Vice-Líderes", "Ministro de Contabilidade",
  // "Ministro(a) da Contabilidade 2", "Ministério da Segurança:", "CONSELHO", "Estagiário(a) das Finanças".
  function papelDaLinha(linha) {
    // só a primeira célula ("LÍDER [01/01] | Responsável pela estrutura...")
    const t = tirarMarcas(linha).split(' | ')[0].replace(/\{[^}]*\}|\[[^\]]*\]/g, ' ').replace(/[:•|]+\s*$/, '').replace(/\s+/g, ' ').trim();
    if (t.length < 4 || t.length > 60 || /\.$/.test(t) || datasDoTexto(t).length) return null;
    const palavras = t.split(' ');
    if (palavras.length > 6) return null;
    const papel = papelDaPalavra(palavras[0]);
    if (!papel) return null;
    const resto = palavras.slice(1);
    // depois da palavra: nada, "de/da/das/do/dos/em ..." (ministério, nível) ou "interino"
    if (resto.length && !/^(de|da|das|do|dos|em|e|interin[oa]s?)$/i.test(semAcento(resto[0]))) return null;
    return { papel, texto: t };
  }
  // compatibilidade
  const papelDoTitulo = t => { const p = papelDaLinha(t); return p ? (p.papel === 'lideranca' ? 'lider' : p.papel) : null; };
  function papelDoCargo(cargo) {
    const t = norm(cargo);
    if (!t) return null;
    if (/vice/.test(t) && /lider/.test(t)) return 'vice';
    if (/\blider/.test(t)) return 'lider';
    if (/ministr/.test(t)) return 'ministro';
    if (/conselh/.test(t)) return 'conselheiro';
    return 'outro';
  }
  // Título de seção em maiúsculas (usado para achar o fim da listagem: BACKUP, MÁQUINA DO TEMPO).
  function cabecalho(linha) {
    const primeira = tirarMarcas(linha).split(' | ')[0];
    const s = primeira.replace(/\{[^}]*\}|\[[^\]]*\]/g, ' ').replace(/[•|:]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (s.length < 4 || s.length > 80) return null;
    if (/[a-zß-ÿ]/.test(s)) return null;
    if (!/[A-ZÀ-Þ]{4}/.test(s)) return null;
    if (/\d{2}/.test(s)) return null;
    return s;
  }
  // Etiquetas que acompanham o nick: L, RL, PB, AD, DA, L.DA, VL.DCI, "L.DA | DRI", "[DA/CDC/SPP]", "G (3d)", "[PA]".
  const RE_ETIQUETA_TOKEN = /^(?:(?:V?L|VP|P|F|D|S|A)\.)?[A-Z]{1,3}\d?$/;
  function ehEtiqueta(t, conhecidas) {
    const s = String(t || '').trim();
    if (!s || s.length > 40) return false;
    if (/^\[?\s*G\s*\(\s*\d+\s*d\s*\)\s*\]?$/i.test(s)) return true;
    const tokens = s.replace(/[\[\]{}()]/g, ' ').split(/[\s|\/,]+/).filter(Boolean);
    if (!tokens.length) return false;
    return tokens.every(x => RE_ETIQUETA_TOKEN.test(x) || (conhecidas && conhecidas.has(x.toUpperCase())));
  }
  // Linhas que nunca são nick numa listagem.
  const RE_NAO_NICK = /^(whatsapp|discord|grupo whatsapp|vaga liberada|vaga em aberto|vaga aberta|vago|vaga|nenhum\b.*|nenhuma\b.*|inicio|retorno|periodo|licenca|reserva|licencas?\/reservas?|backups?|carregando.*|buscar.*|filtrar.*|selecione.*|selecionar.*|escolha.*|listagem.*|informacoes.*|requerimentos?|advertencias?|legendas?|ocupad[oa]|em breve|clique aqui.*|-|\u2014|\u2013)$/;
  // Nomes de ministério e setor que aparecem logo abaixo do nick nos cartões.
  const RE_SETOR = /^(administracao|atualizacao|contabilidade(?: \d)?|financas|seguranca|assistencia|documentacao|recursos humanos|rh|comunicacao|marketing|eventos|ouvidoria|juridico|fiscalizacao|ensino|instrucao|treinamento|tecnologia|desenvolvimento|logistica|patrimonio|tesouraria|integracao|projetos?|relacoes publicas)$/;
  function nickDaLinha(linha, conhecidas) {
    // "ofranco6830 ." (ponto solto de enfeite depois do nick)
    const t = tirarMarcas(linha).replace(/\s+[.·]+(?=\s|$)/g, ' ').trim();
    if (!t || t.length > 25) return null;
    const n = norm(t);
    if (RE_NAO_NICK.test(n) || RE_SETOR.test(n)) return null;
    if (/^\d{1,3}(\s*\/\s*\d{1,3})?$/.test(t) || /^[\u2014\u2013\-]\s/.test(t)) return null;
    if (ehEtiqueta(t, conhecidas)) return null;
    const nick = limparNick(t);
    return pareceNick(nick) && /[a-z0-9]/i.test(nick) ? nick : null;
  }
  // Linha só de datas: "09 fev. 2024 → 08 nov. 2025", "25 Set 2019 ›01 Mai 2023", "26 OUT. 2023", "19 dez. 2022 → R - 15 jun. 2025".
  function datasDaLinha(linha) {
    const t = tirarMarcas(linha);
    const ds = datasDoTexto(t);
    if (!ds.length) return null;
    let resto = '';
    let p = 0;
    ds.forEach(d => { resto += t.slice(p, d.i); p = d.fim; });
    resto += t.slice(p);
    if (semAcento(resto).replace(/[\s→›»>|.\-\u2013\u2014\u2212:,()\[\]{}]+/g, '').replace(/^(R|PB|ate|a|ao)$/i, '').length > 2) return null;
    return ds.map(d => d.dia);
  }
  const ehSeta = linha => !tirarMarcas(linha) || /^[\s→›»>\-\u2013\u2014\u2212|]+$/.test(tirarMarcas(linha));
  // Período de licença: "08 Out 2026 até 07 Nov 2026", "[01 Ago 2026 a 30 Out 2026]".
  const periodoDaLinha = t => periodosDoTexto(t, { palavra: true }).filter(p => p.fim - p.ini >= 1 && p.fim - p.ini <= 200);
  const RE_CANDIDATO = /(\S+)\s+[-\u2013\u2014\u2212]\s+(?=[\[{(]?\s*\d)/g;
  function extrairMembro(linha) {
    const l = tirarMarcas(linha);
    const oc = /\[\s*ocupad[oa]\s*[-:\u2013\u2212]\s*([^\]]+?)\s*\]/i.exec(l);
    if (oc && pareceNick(limparNick(oc[1]))) return { nick: limparNick(oc[1]), entrada: null, desde: null, ocupado: true, resto: '' };
    RE_CANDIDATO.lastIndex = 0;
    let m;
    while ((m = RE_CANDIDATO.exec(l))) {
      const depois = l.slice(m.index + m[0].length);
      const ds = datasDoTexto(depois);
      if (!ds.length || ds[0].i > 3) continue;
      const nick = limparNick(m[1]).replace(/^\d{1,3}\s*[.•]\s*/, '');
      if (!pareceNick(nick) || /^[\[{(]/.test(nick)) continue;
      // datas de entrada e promoção ficam antes do período de licença entre colchetes
      const lic = periodoDaLinha(depois);
      const fora = lic.length ? ds.filter(d => !lic.some(p => d.dia === p.ini || d.dia === p.fim)) : ds;
      return { nick, entrada: fora[0] ? fora[0].dia : null, desde: fora[1] ? fora[1].dia : null, prefixo: l.slice(0, m.index).trim(), resto: depois };
    }
    return null;
  }

  function analisarListagem(linhas, cfg) {
    cfg = cfg || {};
    // etiquetas da legenda ("[GP] - ...", "L" / "Licença/Reserva", "[CAP]")
    const conhecidas = new Set(['L', 'R', 'RL', 'LR', 'PB', 'AD', 'PA', 'GP', 'CE', 'REB', 'CAP', 'ADV', 'INTERINO', 'RESERVA', 'DEV']);
    let naLegenda = false;
    linhas.forEach(l => {
      if (/^\{\{spoiler:/.test(l)) { naLegenda = /legenda/i.test(l); return; }
      if (l === '{{/spoiler}}') { naLegenda = false; return; }
      if (!naLegenda) return;
      const m = /^\s*[\[{]?([A-Z][A-Z0-9.]{0,9})[\]}]?(?:\s|$)/.exec(tirarMarcas(l));
      if (m) conhecidas.add(m[1].toUpperCase());
    });
    const brutos = [];
    let papel = null, secao = null, ctx = 'principal', titulos = 0, fim = false;
    const pilha = [];
    let cand = null, ultimo = null;
    const contextoDoSpoiler = t => { const u = maiusc(t); return /LEGENDA/.test(u) ? 'ignorar' : /LICEN|RESERVA|AFASTAD/.test(u) ? 'licenca' : null; };
    const emitir = (nick, datas, k, extra) => {
      const b = Object.assign({ nick, chave: chaveNick(nick), entrada: datas[0] != null ? datas[0] : null, desde: datas[1] != null ? datas[1] : null, secao, papel, ctx, licencas: [], ocupado: false, k }, extra || {});
      brutos.push(b);
      ultimo = b;
      cand = null;
      return b;
    };
    for (let k = 0; k < linhas.length && !fim; k++) {
      const linha = linhas[k];
      if (linha.indexOf('{{spoiler:') === 0) {
        pilha.push({ ctx, secao, papel });
        const c = contextoDoSpoiler(linha.slice(10, -2));
        if (c) { ctx = c; secao = null; papel = null; }
        cand = null; ultimo = null;
        continue;
      }
      if (linha === '{{/spoiler}}') { const s = pilha.pop(); if (s) { ctx = s.ctx; secao = s.secao; papel = s.papel; } cand = null; ultimo = null; continue; }
      if (linha === '{{hr}}' || ctx === 'ignorar') continue;
      const t = tirarMarcas(linha);
      if (!t) continue;
      // fim da listagem atual: backup e máquina do tempo mostram listagens antigas
      const cab = cabecalho(linha);
      if (cab && /^(BACKUP|BACKUPS|MAQUINA DO TEMPO|HISTORICO)$/.test(maiusc(cab))) { fim = true; break; }
      // período de licença do membro anterior
      const pers = periodoDaLinha(t);
      if (pers.length && datasDaLinha(linha)) {
        if (ultimo && k - ultimo.k <= 6 && (ctx === 'licenca' || /licen/i.test(semAcento(linhas[k - 1] || '')))) pers.forEach(p => { if (!ultimo.licencas.some(x => x.ini === p.ini && x.fim === p.fim)) ultimo.licencas.push(p); });
        cand = null;
        continue;
      }
      // BBCode dos Treinadores e linhas "Cargo nick \u2212 datas"
      const m = extrairMembro(linha);
      if (m) {
        const pref = m.prefixo ? papelDaLinha(m.prefixo.replace(/^\d{1,3}\s*[.•]\s*/, '')) : null;
        const b = emitir(m.nick, [m.entrada, m.desde], k, { ocupado: !!m.ocupado, papel: pref && pref.papel !== 'lideranca' ? pref.papel : papel, secao: pref ? pref.texto : secao });
        periodoDaLinha(m.resto || '').forEach(p => b.licencas.push(p));
        continue;
      }
      const pl = papelDaLinha(linha);
      if (pl) {
        titulos++;
        papel = pl.papel; secao = pl.texto;
        cand = null; ultimo = null;
        continue;
      }
      const ds = datasDaLinha(linha);
      if (ds) {
        if (cand && k - cand.k <= 6) {
          const datas = ds.slice(0, 2);
          // "26 OUT. 2023" e, na linha seguinte (às vezes depois de uma seta), "23 MAR. 2026"
          if (datas.length === 1) {
            let j = k + 1;
            while (j < linhas.length && j - k <= 3 && ehSeta(linhas[j])) j++;
            const prox = j < linhas.length ? datasDaLinha(linhas[j]) : null;
            if (prox && prox.length === 1 && !periodoDaLinha(tirarMarcas(linhas[j])).length) { datas.push(prox[0]); k = j; }
          }
          emitir(cand.nick, datas, cand.k);
          ultimo.k = k;
        }
        continue;
      }
      const n = nickDaLinha(linha, conhecidas);
      if (n && !cand) cand = { nick: n, k };
    }
    // junta repetidos (cartões, lista limpa e spoiler de licença)
    const mapa = new Map();
    brutos.forEach(b => {
      let x = mapa.get(b.chave);
      if (!x) { x = { nick: b.nick, chave: b.chave, entrada: null, desde: null, secoes: [], papel: null, licencas: [], naLista: false, ocupado: false, tagL: false }; mapa.set(b.chave, x); }
      const forte = p => p && p !== 'outro' && p !== 'lideranca';
      if (b.ctx === 'principal') {
        x.naLista = true;
        if (b.secao && !x.secoes.includes(b.secao)) x.secoes.push(b.secao);
        if (forte(b.papel) && !forte(x.papel)) x.papel = b.papel;
        else if (!x.papel && b.papel && b.papel !== 'lideranca') x.papel = b.papel;
        if (b.entrada != null && (x.entrada == null || b.entrada > x.entrada)) x.entrada = b.entrada;
        if (b.desde != null && (x.desde == null || b.desde > x.desde)) x.desde = b.desde;
        if (b.ocupado) x.ocupado = true;
      } else {
        if (forte(b.papel) && !x.papelLicenca) x.papelLicenca = b.papel;
        if (b.secao && !x.secoesLicenca) x.secoesLicenca = [b.secao];
        if (x.entrada == null && b.entrada != null) x.entrada = b.entrada;
      }
      b.licencas.forEach(l => { if (!x.licencas.some(y => y.ini === l.ini && y.fim === l.fim)) x.licencas.push(l); });
    });
    const membros = [...mapa.values()];
    membros.forEach(x => { if ((!x.papel || x.papel === 'outro') && x.papelLicenca) x.papel = x.papel && !x.naLista ? x.papelLicenca : (x.papel || x.papelLicenca); if (x.licencas.length) x.tagL = true; });
    const naLista = membros.filter(x => x.naLista).length;
    return { membros, titulos, valido: naLista >= 3 && titulos >= 2, total: naLista };
  }

  /* ---------------------------------------------------------------
     LICENÇAS E DIAS ATIVOS
     Intervalo de licença: dias [ini, fim) (o dia do fim já é ativo).
     Licença sem retorno vai até o prazo; retorno antecipado encerra; prolongamento soma.
     --------------------------------------------------------------- */
  function licencasDe(eventos, raiz) {
    const lista = eventos.filter(e => e.grupo === 'licenca' && e.chave && raiz(e.chave) && e.dia != null && !e.cancelado && !e.riscado).sort(ordemEv);
    const porNick = new Map();
    lista.forEach(e => {
      const k = raiz(e.chave);
      if (!porNick.has(k)) porNick.set(k, []);
      porNick.get(k).push(e);
    });
    const out = new Map();
    const diasDe = e => (e.dias != null ? e.dias : e.periodo ? e.periodo.fim - e.periodo.ini : null);
    porNick.forEach((evs, k) => {
      const ints = [], avisos = [];
      let atual = null;
      evs.forEach(e => {
        if (e.tipo === 'licenca') {
          const ini = e.periodo ? e.periodo.ini : e.dia;
          const dias = diasDe(e);
          if (dias == null || dias <= 0) { avisos.push({ texto: 'licença de ' + fmtDia(e.dia) + ' sem a quantidade de dias (não contei)', ev: e }); return; }
          const fim = ini + dias;
          // o mesmo pedido postado duas vezes (pelo membro e por quem deu a permissão)
          if (atual && Math.abs(ini - atual.ini) <= 1 && Math.abs(fim - atual.fim) <= 1) { atual.eventos.push(e); e.repetida = true; return; }
          if (atual && ini < atual.fim) {
            avisos.push({ texto: 'licença nova em ' + fmtDia(e.dia) + ' antes do fim da anterior (' + fmtDia(atual.fim) + ')', ev: e, int: atual });
            atual.fim = Math.max(atual.fim, fim); atual.eventos.push(e);
            return;
          }
          atual = { ini, fim, dias, eventos: [e], fonte: 'requerimento', prolongamentos: [] };
          ints.push(atual);
        } else if (e.tipo === 'prolongamento') {
          const mais = e.periodo ? null : diasDe(e);
          if (!atual) {
            const d = diasDe(e);
            if (d) { atual = { ini: e.periodo ? e.periodo.ini : e.dia, fim: e.periodo ? e.periodo.fim : e.dia + d, dias: d, eventos: [e], fonte: 'requerimento', semInicio: true, prolongamentos: [] }; ints.push(atual); }
            avisos.push({ texto: 'prolongamento de ' + fmtDia(e.dia) + ' sem a licença no período lido', ev: e, int: atual || undefined, soNoMes: !atual });
            return;
          }
          if (!e.periodo && !mais) { avisos.push({ texto: 'prolongamento de ' + fmtDia(e.dia) + ' sem a quantidade de dias', ev: e }); return; }
          // prolongamento repetido (mesmos dias, postado de novo em até 1 dia)
          if (atual.prolongamentos.some(p => Math.abs(p.dia - e.dia) <= 1 && diasDe(p) === diasDe(e))) { atual.eventos.push(e); e.repetida = true; return; }
          if (e.dia > atual.fim + 1) avisos.push({ texto: 'prolongamento postado em ' + fmtDia(e.dia) + ', depois do fim da licença (' + fmtDia(atual.fim) + ')', ev: e, int: atual });
          if (e.periodo) atual.fim = Math.max(atual.fim, e.periodo.fim);
          else atual.fim += mais;
          atual.eventos.push(e); atual.prolongamentos.push(e);
        } else if (e.tipo === 'retorno') {
          if (atual && e.dia < atual.fim && e.dia >= atual.ini) { atual.fim = e.dia; atual.retorno = e; atual.eventos.push(e); }
          else if (atual && e.dia >= atual.fim) { atual.retornoTarde = e; }
          else avisos.push({ texto: 'retorno em ' + fmtDia(e.dia) + ' sem a licença no período lido', ev: e, soNoMes: true });
        }
      });
      out.set(k, { intervalos: ints, avisos });
    });
    return out;
  }
  // Dias de [a, b] (inclusive) cobertos por algum intervalo [ini, fim).
  function diasCobertos(ints, a, b) {
    if (b < a) return 0;
    let n = 0;
    for (let d = a; d <= b; d++) if (ints.some(x => d >= x.ini && d < x.fim)) n++;
    return n;
  }

  // Ministério/Conselho e Liderança do mês, com dias ativos. Quem mudou de grupo no mês (ex.: ministro
  // promovido a vice-líder) aparece nos dois, cada um com a sua parte do mês.
  function lideranca(opc) {
    const { listagem, eventos, companhia, ano, mes } = opc;
    const lim = limitesDoMes(ano, mes);
    const h = opc.hoje != null ? opc.hoje : hoje();
    const ate = Math.min(lim.fim, h);
    const parcial = h < lim.fim;
    const raiz = apelidos(eventos || []);
    const papeisLid = companhia.lideranca || ['lider', 'vice'];
    const papeisMin = companhia.ministerio || ['ministro'];
    const grupoDe = papel => (papeisLid.includes(papel) ? 'lideranca' : papeisMin.includes(papel) ? 'ministerio' : null);
    const lic = licencasDe(eventos || [], raiz);
    const pessoas = new Map();
    const add = (chave, papel, dados) => {
      const k = raiz(chave), g = grupoDe(papel);
      if (!g) return null;
      const id = k + '|' + g;
      let p = pessoas.get(id);
      if (!p) { p = Object.assign({ chave: k, id, grupo: g, papel, notas: [], fontes: [], licencasListagem: [] }, dados); pessoas.set(id, p); }
      return p;
    };
    const daPessoa = chave => [...pessoas.values()].filter(p => p.chave === raiz(chave));
    const naListagemAtual = new Set((listagem ? listagem.membros : []).filter(m => m.naLista).map(m => raiz(m.chave)));
    (listagem ? listagem.membros : []).forEach(m => {
      if (!m.naLista || !grupoDe(m.papel)) return;
      const p = add(m.chave, m.papel, { nick: m.nick, desde: m.desde, entrada: m.entrada, naListagem: true, licencasListagem: m.licencas, ocupado: m.ocupado });
      p.secoes = m.secoes;
    });
    // quem saiu ou mudou de cargo no mês (pode já não aparecer na listagem atual)
    const valem = (eventos || []).filter(e => e.dia != null && e.dia >= lim.ini && e.dia <= lim.fim && e.chave && !e.cancelado && !e.riscado).sort(ordemEv);
    valem.forEach(e => {
      // data escrita no requerimento ("Data: 10/10/2026"), quando é perto da data da mensagem
      const quando = e.dataCampo != null && e.dataCampo <= e.dia && e.dia - e.dataCampo <= 7 && e.dataCampo >= lim.ini ? e.dataCampo : e.dia;
      if (e.grupo === 'saida') {
        const doNick = daPessoa(e.chave);
        if (!doNick.length) {
          const pc = papelDoCargo(e.cargo);
          const q = add(e.chave, pc, { nick: e.nick, naListagem: false });
          if (q) doNick.push(q);
        }
        doNick.forEach(p => { if (p.ate == null || p.ate > e.dia - 1) p.ate = e.dia - 1; p.notas.push('saiu da companhia em ' + fmtDia(e.dia) + (e.cargo ? ' (cargo: ' + e.cargo + ')' : '')); p.fontes.push(e); });
      } else if (e.tipo === 'mudanca') {
        const de = papelDoCargo(e.cargoAtual || e.cargo), para = papelDoCargo(e.cargoNovo);
        const gDe = grupoDe(de), gPara = grupoDe(para);
        if (gPara && gPara !== gDe) {
          // entrou no grupo no mês (pode ter saído depois e nem estar na listagem)
          let p = daPessoa(e.chave).find(x => x.grupo === gPara);
          if (!p) { p = add(e.chave, para, { nick: e.nick, naListagem: false }); if (p) p.notas.push('promovido a ' + e.cargoNovo + ' em ' + fmtDia(quando)); }
          if (p && (p.desde == null || p.desde < quando)) { p.desdeReq = quando; p.fontes.push(e); }
        } else if (gPara && gPara === gDe) {
          // mudou de cargo dentro do grupo (vice para líder): conta o mês todo no grupo
          const p = daPessoa(e.chave).find(x => x.grupo === gPara);
          if (p) { p.mesmoGrupo = quando; p.fontes.push(e); p.notas.push('passou de ' + (e.cargoAtual || e.cargo) + ' para ' + e.cargoNovo + ' em ' + fmtDia(quando)); }
        }
        if (gDe && gDe !== gPara) {
          const p = daPessoa(e.chave).find(x => x.grupo === gDe) || add(e.chave, de, { nick: e.nick, naListagem: false });
          p.ate = quando - 1;
          p.notas.push('deixou o cargo em ' + fmtDia(quando) + ' (' + (e.cargoAtual || e.cargo) + ' para ' + e.cargoNovo + ')');
          p.fontes.push(e);
        }
      }
    });
    // Depois do mês: o primeiro requerimento de cargo ou de saída de cada pessoa mostra o cargo que ela tinha
    // no fim do mês (quem foi promovido ou saiu depois já não está no cargo antigo da listagem atual).
    const jaVistos = new Set();
    (eventos || []).filter(e => e.dia != null && e.dia > lim.fim && e.chave && !e.cancelado && !e.riscado && (e.grupo === 'entrada' || e.grupo === 'saida' || e.tipo === 'mudanca')).sort(ordemEv).forEach(e => {
      const k = raiz(e.chave);
      if (jaVistos.has(k)) return;
      jaVistos.add(k);
      if (e.grupo === 'entrada') return;
      const papel = papelDoCargo(e.tipo === 'mudanca' ? (e.cargoAtual || e.cargo) : e.cargo);
      const g = grupoDe(papel);
      if (!g || daPessoa(e.chave).some(p => p.grupo === g)) return;
      const p = add(e.chave, papel, { nick: e.nick, naListagem: false });
      if (!p) return;
      p.notas.push(e.tipo === 'mudanca' ? 'era ' + (e.cargoAtual || e.cargo) + ' até ' + fmtDia(e.dia) + ', depois do mês' : 'saiu da companhia em ' + fmtDia(e.dia) + ', depois do mês' + (e.cargo ? ' (cargo: ' + e.cargo + ')' : ''));
      p.fontes.push(e);
    });
    const lista = [...pessoas.values()].map(p => {
      let inicio = lim.ini;
      // a data de promoção da listagem não vale quando a pessoa só trocou de cargo dentro do grupo no mês
      const desdeLista = p.mesmoGrupo != null && p.desde != null && Math.abs(p.desde - p.mesmoGrupo) <= 3 ? null : p.desde;
      const desde = p.desdeReq != null ? p.desdeReq : desdeLista;
      if (desde != null && desde > lim.ini && desde <= lim.fim) { inicio = desde; p.notas.push('no cargo desde ' + fmtDia(desde)); }
      const depoisDoMes = desde != null && desde > lim.fim;
      if (depoisDoMes) p.notas.push('no cargo desde ' + fmtDia(desde) + ', depois do mês');
      const fimCargo = Math.min(ate, p.ate != null ? p.ate : ate);
      const reqs = lic.get(p.chave) || { intervalos: [], avisos: [] };
      const ints = reqs.intervalos.slice();
      // avisos que mexem no mês: os de uma licença que termina antes do mês (por exemplo, com retorno) ficam de fora
      const avisos = reqs.avisos.filter(a => (a.soNoMes ? a.ev.dia >= lim.ini : a.int ? a.int.fim > lim.ini && a.int.ini <= lim.fim : a.ev.dia >= lim.ini - 100) && a.ev.dia <= lim.fim).map(a => a.texto);
      // licenças escritas na listagem
      (p.licencasListagem || []).forEach(l => {
        const igual = ints.find(x => x.ini < l.fim && l.ini < x.fim);
        const noMes = l.fim > lim.ini && l.ini <= lim.fim;
        if (!igual) { ints.push({ ini: l.ini, fim: l.fim, fonte: 'listagem', eventos: [] }); if (noMes) avisos.push('licença de ' + fmtFaixaLonga(l.ini, l.fim) + ' só aparece na listagem'); }
        else if (noMes && (Math.abs(igual.fim - l.fim) > 1 || Math.abs(igual.ini - l.ini) > 1)) avisos.push('a listagem mostra a licença como ' + fmtFaixaLonga(l.ini, l.fim) + ' e os requerimentos dão ' + fmtFaixaLonga(igual.ini, igual.fim));
      });
      const doMes = ints.filter(x => x.fim > lim.ini && x.ini <= lim.fim).sort((a, b) => a.ini - b.ini);
      const diasNoCargo = Math.max(0, fimCargo - inicio + 1);
      const emLicenca = diasCobertos(doMes, inicio, fimCargo);
      return {
        id: p.id, chave: p.chave, nick: p.nick, papel: p.papel, grupo: p.grupo, naListagem: !!p.naListagem || naListagemAtual.has(p.chave), desde, depoisDoMes, inicio, fimCargo,
        diasNoMes: lim.fim - lim.ini + 1, diasNoCargo, diasLicenca: emLicenca, diasAtivos: diasNoCargo - emLicenca,
        licencas: doMes.map(x => ({ ini: x.ini, fim: x.fim, fonte: x.fonte, retorno: !!x.retorno, eventos: (x.eventos || []).map(e => ({ post: e.post, url: e.url, tipo: e.tipo, dia: e.dia, dias: e.dias })) })),
        notas: p.notas, avisos, fontes: p.fontes.map(e => ({ post: e.post, url: e.url, tipo: e.tipo, dia: e.dia })), parcial
      };
    });
    const ordemPapel = { lider: 0, lideranca: 0, vice: 1, ministro: 2, conselheiro: 2 };
    lista.sort((a, b) => (ordemPapel[a.papel] - ordemPapel[b.papel]) || a.nick.localeCompare(b.nick, 'pt'));
    return { lista, ate, parcial, mes: lim };
  }

  /* ---------------------------------------------------------------
     EXPORTAÇÃO (colar na planilha)
     --------------------------------------------------------------- */
  const tsv = linhas => linhas.map(l => l.map(v => (v == null ? '' : String(v).replace(/[\t\r\n]+/g, ' '))).join('\t')).join('\n');

  return {
    semAcento, norm, maiusc, baixo, escRe, tirarMarcas, chaveNick, limparNick, pareceNick, pareceNickSolto, partirNicks,
    MESES, MESES_LONGOS, dia, diaLivre, partes, fmtDia, fmtCurto, fmtFaixa, fmtFaixaLonga, hoje,
    definirHoje: n => { hojeFixo = n; },
    datasDoTexto, primeiraData, periodosDoTexto, semanasDoMes, limitesDoMes, domingoDe,
    TIPOS, NOME_TIPO, tituloDaLinha, camposDe, analisarBloco, blocosDaMensagem, eventosDaMensagem,
    apelidos, movimentos, contarPorSemana, marcarCancelamentos, citaNick,
    VOCAB_PADRAO, porcentagemDoTexto, aulasDoTexto, casaSemana, periodoPrincipal, porcentagemDaGrade, classeDoStatus, CLASSE_NOME,
    papelDoTitulo, papelDaLinha, papelDoCargo, cabecalho, extrairMembro, analisarListagem, ehEtiqueta,
    licencasDe, diasCobertos, lideranca, tsv
  };
})();

/* ---- dom.js ---- */
/* =====================================================================
   DOM: transforma páginas do fórum em linhas de texto e mensagens.
   Funciona com o HTML do Forumotion (phpBB3, ModernBB e parecidos).
   ===================================================================== */
const PesquisaDom = (function (N) {
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
})(typeof PesquisaNucleo !== 'undefined' ? PesquisaNucleo : require('./nucleo.js'));

/* ---- forum.js ---- */
/* =====================================================================
   FÓRUM: leitura das páginas (mesma origem), busca por data, listagens,
   planilha dos Professores (gviz), sessão e grupos de acesso.
   ===================================================================== */
const PesquisaForum = (function (N, D) {
  'use strict';
  const ESPERA = ms => new Promise(r => setTimeout(r, ms));
  const topicos = new Map();   // tid -> Promise<topico> (só o resumo das páginas fica guardado, não o HTML)
  let pedidos = 0;

  async function buscarTexto(url, opc) {
    opc = opc || {};
    let ultimo = null;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const t = ctl ? setTimeout(() => ctl.abort(), opc.tempo || 30000) : null;
      try {
        pedidos++;
        const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store', signal: ctl ? ctl.signal : undefined });
        if (t) clearTimeout(t);
        if (r.status === 404) { const e = new Error('página não encontrada (' + url + ')'); e.status = 404; throw e; }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.text();
      } catch (e) {
        if (t) clearTimeout(t);
        ultimo = e;
        if (e.status === 404) throw e;
        await ESPERA(600 * (tentativa + 1));
      }
    }
    throw ultimo || new Error('falha ao ler ' + url);
  }
  function lerDoc(url, opc) {
    return buscarTexto(url, opc).then(html => new DOMParser().parseFromString(html, 'text/html'));
  }
  function esquecer() { topicos.clear(); planilhas.clear(); }

  // Executa tarefas com no máximo n ao mesmo tempo.
  async function limitar(itens, n, fn) {
    const res = new Array(itens.length);
    let i = 0;
    const trab = async () => { while (i < itens.length) { const k = i++; res[k] = await fn(itens[k], k); } };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(n, itens.length)) }, trab));
    return res;
  }

  /* ---------- tópicos e páginas ---------- */
  function urlPagina(T, off) { return '/t' + T.tid + (off ? 'p' + off : '') + '-' + (T.slug || ''); }
  function abrirTopico(tid, opc) {
    tid = String(tid).replace(/^t/, '');
    if (!(opc && opc.novo) && topicos.has(tid)) return topicos.get(tid);
    const p = (async () => {
      const doc = await lerDoc('/t' + tid + '-');
      const pg = D.paginacao(doc, tid);
      const titulo = ((doc.querySelector('h1.page-title, .page-title, h1, title') || {}).textContent || '').replace(/\s+/g, ' ').trim();
      const T = { tid, slug: pg.slug, passo: pg.passo, offsets: pg.offsets, titulo, paginas: new Map() };
      const p0 = montarPagina(T, 0, doc);
      T.primeira = p0.mensagens[0] ? p0.mensagens[0].id : '';
      T.paginas.set(0, Promise.resolve(p0));
      return T;
    })();
    topicos.set(tid, p);
    p.catch(() => topicos.delete(tid));
    return p;
  }
  function montarPagina(T, off, doc) {
    const url = urlPagina(T, off);
    // alguns fóruns repetem a primeira mensagem do tópico no alto de todas as páginas
    const mensagens = D.mensagensDaPagina(doc, { urlBase: url }).filter(m => !(off && T.primeira && m.id === T.primeira));
    const semData = mensagens.filter(m => m.dia == null).length;
    // Sem a data da mensagem: usa a primeira data escrita no texto; se não houver, a da mensagem anterior.
    const h = N.hoje();
    let ant = null;
    mensagens.forEach(m => {
      if (m.dia == null) {
        m.diaAproximado = true;
        const t = N.primeiraData(m.linhas.map(N.tirarMarcas).join(' '));
        m.dia = t != null && t <= h + 1 && t > N.dia(2015, 0, 1) ? t : ant;
      }
      if (m.dia != null) ant = m.dia;
    });
    const dias = mensagens.map(m => m.dia).filter(x => x != null);
    // páginas HTML citadas na primeira mensagem (listagem que mostra uma página por iframe ou link)
    let citadas = [];
    if (off === 0 && mensagens[0]) { const el = doc.querySelector('[id="p' + mensagens[0].id + '"]'); citadas = D.paginasCitadas(el || doc); }
    return { off, url, mensagens, primeiro: dias.length ? Math.min(...dias) : null, ultimo: dias.length ? Math.max(...dias) : null, semData, citadas };
  }
  function pagina(T, off) {
    if (T.paginas.has(off)) return T.paginas.get(off);
    const p = lerDoc(urlPagina(T, off)).then(doc => montarPagina(T, off, doc));
    T.paginas.set(off, p);
    p.catch(() => T.paginas.delete(off));
    return p;
  }

  // Primeira página que tem mensagens a partir do dia alvo (busca binária pelas datas).
  async function primeiraPaginaDesde(T, alvo) {
    let lo = 0, hi = T.offsets.length - 1, resp = hi;
    while (lo <= hi) {
      const meio = (lo + hi) >> 1;
      const pg = await pagina(T, T.offsets[meio]);
      if (pg.ultimo == null) { resp = Math.min(resp, meio); hi = meio - 1; continue; }
      if (pg.ultimo >= alvo) { resp = meio; hi = meio - 1; } else lo = meio + 1;
    }
    return resp;
  }

  // Mensagens do tópico postadas entre os dias de e ate (inclusive).
  async function mensagensEntre(tid, de, ate, progresso) {
    const T = await abrirTopico(tid);
    const total = T.offsets.length;
    const i0 = await primeiraPaginaDesde(T, de);
    const lidas = [];
    let i = i0;
    const lote = 4;
    while (i < total) {
      const offs = T.offsets.slice(i, i + lote);
      const pgs = await limitar(offs, lote, off => pagina(T, off));
      let passou = false;
      pgs.forEach(pg => { lidas.push(pg); if (pg.primeiro != null && pg.primeiro > ate) passou = true; });
      if (progresso) progresso({ lidas: lidas.length, inicio: i0, total, pagina: i + offs.length });
      if (passou) break;
      i += lote;
    }
    const mensagens = [];
    const vistos = new Set();
    lidas.forEach(pg => pg.mensagens.forEach(m => {
      if (vistos.has(m.id)) return;
      vistos.add(m.id);
      if (m.dia == null || (m.dia >= de && m.dia <= ate)) mensagens.push(Object.assign({ pagina: pg.url }, m));
    }));
    // Os tópicos de requerimentos apagam ou arquivam as mensagens antigas: a 2ª mensagem diz desde quando há dados.
    const p0 = await pagina(T, 0);
    const segunda = p0.mensagens[1] || (total > 1 ? (await pagina(T, T.offsets[1])).mensagens[0] : null);
    const inicioTopico = segunda && segunda.dia != null ? segunda.dia : null;
    return { T, mensagens, paginas: lidas.length, primeiraPagina: i0, totalPaginas: total, semData: lidas.reduce((t, p) => t + p.semData, 0), inicioTopico };
  }

  /* ---------- porcentagens ---------- */
  const textoDe = m => m.linhas.map(N.tirarMarcas).join('\n');
  async function porcentagensDoTopico(tid, semanas, cfg, progresso) {
    const de = semanas[0].ini, ate = semanas[semanas.length - 1].fim + 28;
    const r = await mensagensEntre(tid, de, ate, progresso);
    const porSemana = semanas.map(s => {
      const achadas = [];
      r.mensagens.forEach(m => {
        const t = textoDe(m);
        const tipo = N.casaSemana(t, s);
        if (!tipo) return;
        const pp = N.periodoPrincipal(t);
        const res = N.porcentagemDoTexto(m.linhas, cfg);
        achadas.push({ m, tipo, res, primeiro: !!pp && pp.ini === s.ini && pp.fim === s.fim, secoes: res.secoes.length });
      });
      // vale a mais recente que é desta semana logo no início e tem as seções; depois as exatas; por último as aproximadas
      const ordem = [a => a.tipo === 'exato' && a.primeiro && a.secoes, a => a.tipo === 'exato' && a.secoes, a => a.secoes, () => true];
      let escolhida = null;
      for (const f of ordem) { const l = achadas.filter(f); if (l.length) { escolhida = l[l.length - 1]; break; } }
      const res = escolhida ? escolhida.res : null;
      const avisos = [];
      if (!escolhida) avisos.push('Não achei a porcentagem desta semana no tópico.');
      else {
        if (escolhida.tipo === 'aproximado') avisos.push('O período da postagem tem um dia de diferença.');
        if (achadas.length > 1) avisos.push('Há ' + achadas.length + ' postagens desta semana; usei a mais recente.');
        res.avisos.forEach(a => avisos.push(a));
      }
      return { semana: s, resultado: res, url: escolhida ? '/viewtopic?p=' + escolhida.m.id + '#' + escolhida.m.id : '', postagem: escolhida ? escolhida.m.id : '', outras: achadas.filter(a => a !== escolhida).map(a => '/viewtopic?p=' + a.m.id + '#' + a.m.id), avisos, notas: res ? (res.notas || []).slice() : [], dataPostagem: escolhida ? escolhida.m.dia : null };
    });
    return { fonte: '/t' + tid + '-' + (r.T.slug || ''), titulo: r.T.titulo, porSemana, paginas: r.paginas };
  }

  /* ---------- planilha (Professores) via gviz ---------- */
  const planilhas = new Map();
  function csvParaGrade(txt) {
    const linhas = [];
    let linha = [], cel = '', aspas = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (aspas) {
        if (c === '"') { if (txt[i + 1] === '"') { cel += '"'; i++; } else aspas = false; }
        else cel += c;
      } else if (c === '"') aspas = true;
      else if (c === ',') { linha.push(cel); cel = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; linha.push(cel); linhas.push(linha); linha = []; cel = ''; }
      else cel += c;
    }
    if (cel || linha.length) { linha.push(cel); linhas.push(linha); }
    return linhas;
  }
  function jsonp(url, tempo) {
    return new Promise((resolve, reject) => {
      const nome = '__afPesquisa' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const s = document.createElement('script');
      const limpar = () => { try { delete window[nome]; } catch (_) { window[nome] = undefined; } s.remove(); clearTimeout(t); };
      const t = setTimeout(() => { limpar(); reject(new Error('a planilha não respondeu')); }, tempo || 20000);
      window[nome] = dados => { limpar(); resolve(dados); };
      s.onerror = () => { limpar(); reject(new Error('não consegui abrir a planilha')); };
      s.src = url.replace('RESPONDER', nome);
      document.head.appendChild(s);
    });
  }
  function gvizParaGrade(d) {
    if (!d || d.status === 'error' || !d.table) throw new Error((d && d.errors && d.errors[0] && (d.errors[0].detailed_message || d.errors[0].message)) || 'resposta inválida da planilha');
    return d.table.rows.map(r => (r.c || []).map(c => (c == null ? '' : c.f != null ? String(c.f) : c.v != null ? String(c.v) : '')));
  }
  function lerAba(id, aba) {
    const chave = id + '|' + aba;
    if (planilhas.has(chave)) return planilhas.get(chave);
    const base = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/gviz/tq?headers=0&sheet=' + encodeURIComponent(aba);
    const p = (async () => {
      try {
        const r = await fetch(base + '&tqx=out:csv', { credentials: 'omit' });
        if (r.ok) { const txt = await r.text(); if (!/^\s*</.test(txt)) return csvParaGrade(txt); }
      } catch (_) { /* sem CORS: tenta JSONP */ }
      return gvizParaGrade(await jsonp(base + '&tqx=out:json;responseHandler:RESPONDER'));
    })();
    planilhas.set(chave, p);
    p.catch(() => planilhas.delete(chave));
    return p;
  }
  // Ids de planilhas citadas num tópico (ex.: o tópico geral da Consulta de Desempenho dos Professores).
  async function planilhasCitadas(tid, filtro) {
    const doc = await lerDoc('/t' + String(tid).replace(/^t/, '') + '-');
    const out = [];
    doc.querySelectorAll('a[href*="/spreadsheets/d/"], iframe[src*="/spreadsheets/d/"]').forEach(a => {
      const m = /\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/.exec(a.getAttribute('href') || a.getAttribute('src') || '');
      if (!m) return;
      let ctx = a.textContent || '';
      for (let el = a.parentElement, k = 0; el && k < 3 && ctx.length < 60; el = el.parentElement, k++) ctx = el.textContent || ctx;
      out.push({ id: m[1], texto: N.norm(ctx).slice(0, 200) });
    });
    const html = doc.documentElement ? doc.documentElement.innerHTML : '';
    const re = /\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/g;
    let m;
    while ((m = re.exec(html))) if (!out.some(x => x.id === m[1])) out.push({ id: m[1], texto: '' });
    return filtro ? out.sort((a, b) => filtro(b.texto) - filtro(a.texto)) : out;
  }
  async function porcentagensDaPlanilha(fonte, semanas, cfg, progresso) {
    const ids = [];
    (fonte.planilhas || []).forEach(id => { if (!ids.includes(id)) ids.push(id); });
    const notas = [];
    if (fonte.descobrir) {
      try {
        const pal = N.norm(fonte.palavra || 'professor');
        const outros = (fonte.evitar || []).map(N.norm);
        // Só as planilhas dos Professores (de outros anos, por exemplo). O tópico geral também tem as do
        // Conselho, dos Coordenadores, do Serviço de Proteção..., que não podem entrar no lugar.
        const serve = t => t.indexOf(pal) !== -1 && !outros.some(o => t.indexOf(o) !== -1);
        const achados = await planilhasCitadas(fonte.descobrir);
        achados.filter(x => serve(x.texto)).forEach(x => { if (!ids.includes(x.id)) ids.push(x.id); });
      } catch (e) { notas.push('Não consegui ler o tópico geral das planilhas (' + e.message + ').'); }
    }
    const porSemana = [];
    for (const s of semanas) {
      const meses = [];
      [s.ini + 3, s.ini, s.fim].forEach(n => { const p = N.partes(n); const nome = N.MESES_LONGOS[p.m]; if (!meses.includes(nome)) meses.push(nome); });
      let achou = null, erros = [];
      for (const id of ids) {
        for (const aba of meses) {
          try {
            const grade = await lerAba(id, aba);
            const r = N.porcentagemDaGrade(grade, s, cfg);
            if (r && !r.erro) { achou = { id, aba, r }; break; }
            if (r && r.erro) erros.push(aba + ': ' + r.erro);
          } catch (e) { erros.push(aba + ': ' + e.message); }
        }
        if (achou) break;
      }
      if (progresso) progresso({ semana: s.n, total: semanas.length });
      porSemana.push(achou
        ? { semana: s, resultado: achou.r, url: 'https://docs.google.com/spreadsheets/d/' + achou.id + '/edit', aba: achou.aba, avisos: achou.r.avisos.slice(), notas: (achou.r.notas || []).slice() }
        : { semana: s, resultado: null, url: ids[0] ? 'https://docs.google.com/spreadsheets/d/' + ids[0] + '/edit' : '', avisos: ['Não achei esta semana na planilha' + (erros.length ? ' (' + erros.slice(0, 2).join('; ') + ')' : '') + '.'] });
    }
    return { fonte: ids[0] ? 'https://docs.google.com/spreadsheets/d/' + ids[0] + '/edit' : '', porSemana, notas, planilhas: ids };
  }

  /* ---------- listagem ---------- */
  // Abre uma página HTML do fórum num quadro escondido e espera o conteúdo parar de mudar (listagens montadas por script).
  function renderizar(caminho, tempo, minEstavel) {
    return new Promise((resolve, reject) => {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      f.setAttribute('tabindex', '-1');
      f.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      f.style.cssText = 'position:fixed;left:-12000px;top:0;width:1280px;height:900px;opacity:0;pointer-events:none;border:0';
      let acabou = false, ultimo = -1, estavel = 0;
      const fim = erro => {
        if (acabou) return;
        acabou = true;
        clearInterval(relogio); clearTimeout(limite);
        try {
          const doc = f.contentDocument;
          if (!doc || !doc.body) throw erro || new Error('a página não abriu');
          const linhas = D.linhasDoElemento(doc.body, { estilos: true });
          f.remove();
          resolve(linhas);
        } catch (e) { f.remove(); reject(e); }
      };
      const relogio = setInterval(() => {
        try {
          const doc = f.contentDocument;
          if (!doc || !doc.body) return;
          const tam = (doc.body.textContent || '').length;
          if (doc.readyState === 'complete' && tam === ultimo && tam > 300) { if (++estavel >= (minEstavel || 3)) fim(); } else estavel = 0;
          ultimo = tam;
        } catch (e) { fim(e); }
      }, 400);
      const limite = setTimeout(() => fim(), tempo || 20000);
      f.src = caminho;
      document.body.appendChild(f);
    });
  }
  const frescor = L => Math.max(-1, ...L.membros.map(m => Math.max(m.entrada || -1, m.desde || -1)));
  async function lerListagem(cfg, progresso) {
    const tentativas = [];
    const fontes = [];
    (cfg.paginas || []).forEach(p => fontes.push({ tipo: 'pagina', caminho: p }));
    (cfg.topicos || []).forEach(t => fontes.push({ tipo: 'topico', tid: String(t).replace(/^t/, '') }));
    const vistas = new Set();
    for (let k = 0; k < fontes.length; k++) {
      const f = fontes[k];
      const id = f.tipo === 'topico' ? 't' + f.tid : f.caminho;
      // /h449- e /h449-efe-lista-de-membros são a mesma página: abre uma vez só
      const h = f.tipo === 'pagina' && /^\/h(\d+)(?:-|$)/.exec(f.caminho);
      const chave = h ? '/h' + h[1] : id;
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      if (progresso) progresso({ fonte: id });
      try {
        let linhas, url;
        if (f.tipo === 'topico') {
          const T = await abrirTopico(f.tid);
          const pg = await pagina(T, 0);
          const m = pg.mensagens[0];
          url = urlPagina(T, 0);
          if (!m) throw new Error('tópico sem mensagens');
          linhas = m.linhas.concat(...m.citacoes);
          // páginas HTML que o tópico mostra (iframe) ou cita
          (pg.citadas || []).forEach(c => { if (!vistas.has(c)) fontes.push({ tipo: 'pagina', caminho: c, citadaPor: id }); });
        } else {
          url = f.caminho;
          const doc = await lerDoc(f.caminho);
          linhas = D.linhasDoElemento(doc.body);
          // listagem montada por script: abre a página num quadro escondido; se a planilha da página
          // ainda não tinha carregado, espera mais e lê de novo
          if (!N.analisarListagem(linhas).valido) linhas = await renderizar(f.caminho);
          if (!N.analisarListagem(linhas).valido) linhas = await renderizar(f.caminho, 45000, 12);
        }
        const L = N.analisarListagem(linhas);
        tentativas.push({ id, url, tipo: f.tipo, valido: L.valido, membros: L.total, frescor: L.valido ? frescor(L) : null, resultado: L });
      } catch (e) {
        tentativas.push({ id, url: f.tipo === 'topico' ? '/t' + f.tid + '-' : f.caminho, tipo: f.tipo, valido: false, erro: e.message });
      }
    }
    const validas = tentativas.filter(t => t.valido);
    // a mais atualizada: a que tem a entrada ou promoção mais recente
    validas.sort((a, b) => b.frescor - a.frescor || b.membros - a.membros);
    const escolhida = validas[0] || null;
    return { escolhida, tentativas };
  }

  /* ---------- sessão e grupos ---------- */
  const nickValido = n => !!n && !/^(anonymous|visitante|convidado)$/i.test(n);
  function decodificar(s) {
    const t = document.createElement('textarea');
    t.innerHTML = s;
    return t.value;
  }
  async function obterUsuario() {
    if (typeof window.AF_PESQUISA_SESSAO === 'function') return window.AF_PESQUISA_SESSAO();
    const ud = window._userdata;
    if (ud && typeof ud === 'object' && 'session_logged_in' in ud && ud.username) {
      if (+ud.session_logged_in !== 1) return null;
      const nome = decodificar(String(ud.username)).trim();
      return nickValido(nome) ? { nick: nome, id: String(ud.user_id || '') } : null;
    }
    const html = await buscarTexto('/forum');
    const logado = html.match(/_userdata\["session_logged_in"\]\s*=\s*(\d)/);
    if (logado && logado[1] !== '1') return null;
    const m = html.match(/_userdata\["username"\]\s*=\s*"((?:[^"\\]|\\.)*)"/);
    if (!m) throw new Error('não consegui ler a sessão do fórum');
    let nome = '';
    try { nome = JSON.parse('"' + m[1] + '"'); } catch (_) { nome = m[1].replace(/\\(.)/g, '$1'); }
    nome = decodificar(nome).trim();
    const id = (html.match(/_userdata\["user_id"\]\s*=\s*(-?\d+)/) || [])[1] || '';
    return nickValido(nome) ? { nick: nome, id } : null;
  }
  const FORA_DA_LISTA = 'header, nav, footer, aside, #page-header, #page-footer, .headerbar, .navbar, #navbar, #fa_toolbar, #fa_right, #fa_toolbar_hidden, #chatbox, .chatbox';
  const idGrupo = c => { const m = /^\/g(\d+)(?:p\d+)?-/.exec(c) || /^\/groupcp\?g=(\d+)/.exec(c); return m ? m[1] : ''; };
  function marcasDoUsuario(doc, u) {
    doc.querySelectorAll(FORA_DA_LISTA).forEach(n => n.remove());
    let n = 0;
    doc.querySelectorAll('a[href]').forEach(a => {
      const m = /^\/u(\d+)(?:[-/?#]|$)/.exec(D.caminhoDe(a.getAttribute('href')));
      if (!m) return;
      if (u.id ? m[1] === String(u.id) : N.chaveNick(a.textContent) === N.chaveNick(u.nick)) n++;
    });
    return n;
  }
  async function membroDoGrupo(caminho, u, base) {
    const id = idGrupo(caminho), vistas = new Set(), fila = [caminho];
    while (fila.length && vistas.size < 30) {
      const atual = fila.shift();
      if (vistas.has(atual)) continue;
      vistas.add(atual);
      const doc = await lerDoc(atual);
      const outras = [...doc.querySelectorAll('a[href]')].map(a => D.caminhoDe(a.getAttribute('href')))
        .filter(c => c && idGrupo(c) === id && (/^\/g\d+p\d+-/.test(c) || /[?&]start=\d+/.test(c)));
      if (marcasDoUsuario(doc, u) > base) return true;
      outras.forEach(c => { if (!vistas.has(c) && !fila.includes(c)) fila.push(c); });
    }
    return false;
  }
  // Acha o grupo na lista /groups: nome ou apelido igual (sem acento, pontuação e "e"), ou o nome completo dentro do texto.
  function acharGrupo(doc, g) {
    const comoNome = t => N.norm(t).replace(/[^a-z0-9]+/g, ' ').replace(/\be\b/g, ' ').replace(/\s+/g, ' ').trim();
    const alvo = comoNome(g.nome), iguais = [g.nome].concat(g.apelidos || []).map(comoNome).filter(Boolean);
    const as = [...doc.querySelectorAll('a[href]')].filter(x => idGrupo(D.caminhoDe(x.getAttribute('href'))));
    const a = as.find(x => iguais.includes(comoNome(x.textContent))) || (alvo ? as.find(x => (' ' + comoNome(x.textContent) + ' ').indexOf(' ' + alvo + ' ') >= 0) : null);
    return a ? D.caminhoDe(a.getAttribute('href')) : '';
  }
  // Grupos (da configuração) em que a pessoa está. Para no primeiro encontrado.
  async function gruposDoUsuario(u, grupos) {
    if (typeof window.AF_PESQUISA_ACESSO === 'function') return window.AF_PESQUISA_ACESSO(u);
    let base = 0, lista = null, falhas = 0, tentativas = 0;
    try { base = marcasDoUsuario(await lerDoc('/faq'), u); } catch (_) { base = 0; }
    for (const g of grupos) {
      let caminho = g.endereco || '';
      if (!caminho) {
        if (!lista) { try { lista = await lerDoc('/groups'); } catch (_) { lista = null; } }
        caminho = lista ? acharGrupo(lista, g) : '';
      }
      if (!caminho) continue;
      tentativas++;
      try { if (await membroDoGrupo(caminho, u, base)) return [g.nome]; } catch (_) { falhas++; }
    }
    if (tentativas && falhas === tentativas) throw new Error('não consegui ler os grupos do fórum');
    return [];
  }

  return {
    buscarTexto, lerDoc, esquecer, limitar, abrirTopico, pagina, urlPagina, primeiraPaginaDesde, mensagensEntre,
    porcentagensDoTopico, porcentagensDaPlanilha, lerAba, planilhasCitadas, csvParaGrade, lerListagem, renderizar,
    obterUsuario, gruposDoUsuario, contarPedidos: () => pedidos
  };
})(PesquisaNucleo, PesquisaDom);

/* ---- app.js ---- */
/* =====================================================================
   PÁGINA: acesso, coleta, conferência e cópia para a planilha.
   ===================================================================== */
(function () {
  'use strict';
  const N = PesquisaNucleo, F = PesquisaForum;
  const CFG = window.AF_PESQUISA_CONFIG || { grupos: [], companhias: [] };
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const fmtN = n => (n == null ? '' : Number(n).toLocaleString('pt-BR'));
  const plural = (n, um, varios) => fmtN(n) + ' ' + (n === 1 ? um : varios);
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* sem armazenamento */ } };
  const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch (_) { return padrao; } };
  const emblema = id => 'https://i.imgur.com/' + id + '.png';
  const cabeca = nick => 'https://www.habbo.com.br/habbo-imaging/avatarimage?user=' + encodeURIComponent(nick) + '&headonly=1&size=s&head_direction=3&direction=3&gesture=sml';
  const linkPost = id => '/viewtopic?p=' + id + '#' + id;
  const NOME_PAPEL = { lider: 'Líder', vice: 'Vice-Líder', lideranca: 'Liderança', ministro: 'Ministro', conselheiro: 'Conselheiro' };
  const SAIDA_NOME = { entrada: 'Entrada', admissao: 'Admissão', reintegracao: 'Reintegração', saida: 'Saída', expulsao: 'Expulsão', exoneracao: 'Exoneração', fiscalizacao: 'Fiscalização' };
  // "Fiscalização · Expulsão", "Supervisão de listagem · Desligamento honroso", "Saída (fiscalização)"
  const nomeMov = e => {
    if (e.tipo === 'fiscalizacao') return (/SUPERVIS/i.test(N.semAcento(e.titulo || '')) ? 'Supervisão de listagem' : 'Fiscalização') + (e.motivo ? ' · ' + e.motivo : '');
    return (SAIDA_NOME[e.tipo] || e.tipo) + (e.fiscalizacao ? ' (fiscalização)' : '');
  };
  const companhias = CFG.companhias || [];

  /* ---------- estado ---------- */
  const S = {
    usuario: null, acesso: 'verificando', grupo: '', erro: '',
    cia: ler('af-pesquisa:cia', '') || (companhias[0] && companhias[0].id) || '',
    ano: 0, mes: 0, estado: 'ocioso', passos: {}, dados: null, escolhas: { mov: {}, pessoas: {} }, filtro: 'todos', relogio: 0
  };
  const companhia = () => companhias.find(c => c.id === S.cia) || companhias[0];
  const chaveEscolhas = () => 'af-pesquisa:escolhas:' + S.cia + ':' + S.ano + '-' + (S.mes + 1);
  const incluido = e => { const x = S.escolhas.mov[e.id]; return x === undefined ? !!e.contaPadrao : !!x; };
  const pessoaOpc = p => Object.assign({ incluir: !p.depoisDoMes, mesInteiro: false }, S.escolhas.pessoas[p.id] || {});

  function mesPadrao() {
    let x = N.hoje() - 1;
    while (N.partes(x).sem !== 6) x--;
    const p = N.partes(x - 3);
    return { ano: p.a, mes: p.m };
  }
  function mesmoOuDepois(a, m) { const h = N.partes(N.hoje()); return a > h.a || (a === h.a && m > h.m); }

  /* ---------- tema ---------- */
  function tema() {
    $('tema').addEventListener('click', () => {
      const escuro = !document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', escuro);
      try { localStorage.setItem('af-pesquisa:tema', escuro ? 'escuro' : 'claro'); } catch (_) { /* sem armazenamento */ }
    });
  }

  /* ---------- avisos rápidos ---------- */
  function toast(msg, tipo) {
    const el = document.createElement('div');
    el.className = 'pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border border-realce/10 bg-placa px-4 py-3 text-[13px] font-medium text-texto';
    el.style.boxShadow = 'var(--sombra-modal)';
    el.innerHTML = '<i class="fa-solid ' + (tipo === 'erro' ? 'fa-circle-exclamation text-neg' : 'fa-circle-check text-pos') + '"></i><span>' + esc(msg) + '</span>';
    $('toasts').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 2600);
  }
  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); return true; } catch (_) {
      const t = document.createElement('textarea');
      t.value = texto; t.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(t); t.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      t.remove();
      return ok;
    }
  }

  /* ---------- usuário e acesso ---------- */
  function mostrarUsuario() {
    const el = $('usuario');
    if (!S.usuario) { el.classList.add('hidden'); el.classList.remove('flex'); return; }
    el.classList.remove('hidden'); el.classList.add('flex');
    el.innerHTML = '<img class="h-9 w-9 rounded-xl bg-placa2 object-cover object-top" src="' + esc(cabeca(S.usuario.nick)) + '" alt="" style="image-rendering:pixelated">' +
      '<span class="leading-tight"><span class="block text-[10px] font-semibold uppercase tracking-[.12em] text-musgo">' + esc(S.grupo || 'Conectado') + '</span><b class="block max-w-[150px] truncate text-[13px] text-texto">' + esc(S.usuario.nick) + '</b></span>';
  }
  async function iniciar() {
    tema();
    $('ano-rodape').textContent = String(N.partes(N.hoje()).a);
    const m = ler('af-pesquisa:mes', null);
    const padrao = mesPadrao();
    S.ano = m && m.ano ? m.ano : padrao.ano; S.mes = m && m.mes != null ? m.mes : padrao.mes;
    if (mesmoOuDepois(S.ano, S.mes)) { S.ano = padrao.ano; S.mes = padrao.mes; }
    lerEscolhas();
    render();
    try { S.usuario = await F.obterUsuario(); } catch (e) { S.acesso = 'erro'; S.erro = e.message; render(); return; }
    if (!S.usuario) { S.acesso = 'entrar'; render(); return; }
    mostrarUsuario();
    const chave = 'af-pesquisa:acesso:' + (S.usuario.id || N.chaveNick(S.usuario.nick));
    const salvo = ler(chave, null);
    if (salvo && salvo.ate > Date.now() && Array.isArray(salvo.grupos) && salvo.grupos.length) { S.acesso = 'ok'; S.grupo = salvo.grupos[0]; }
    else {
      try {
        const g = await F.gruposDoUsuario(S.usuario, CFG.grupos || []);
        guardar(chave, { ate: Date.now() + (g.length ? 30 : 2) * 60000, grupos: g });
        S.acesso = g.length ? 'ok' : 'restrito'; S.grupo = g[0] || '';
      } catch (e) { S.acesso = 'erro'; S.erro = e.message; }
    }
    mostrarUsuario();
    render();
  }

  /* ---------- coleta ---------- */
  function passo(id, estado, texto) {
    S.passos[id] = { estado, texto };
    const el = document.querySelector('[data-passo="' + id + '"]');
    if (el) { el.setAttribute('data-estado', estado); el.querySelector('[data-texto]').textContent = texto; el.querySelector('.icone').innerHTML = iconePasso(estado, id); }
  }
  const ICONE_PASSO = { listagem: 'fa-users', requerimentos: 'fa-file-signature', licencas: 'fa-mug-hot', desempenho: 'fa-chart-simple' };
  const iconePasso = (estado, id) => estado === 'lendo' ? '<i class="fa-solid fa-circle-notch fa-spin"></i>' : estado === 'feito' ? '<i class="fa-solid fa-check"></i>' : estado === 'erro' ? '<i class="fa-solid fa-triangle-exclamation"></i>' : '<i class="fa-solid ' + ICONE_PASSO[id] + '"></i>';

  async function coletar(forcar) {
    if (S.estado === 'coletando') return;
    const cia = companhia();
    if (!cia) return;
    if (forcar) F.esquecer();
    const semanas = N.semanasDoMes(S.ano, S.mes);
    const mes = N.limitesDoMes(S.ano, S.mes);
    const h = N.hoje();
    const ini = Math.min(semanas[0].ini, mes.ini), fim = Math.max(semanas[semanas.length - 1].fim, mes.fim);
    const de1 = ini - 7;
    const ate = Math.min(h, fim + (CFG.diasDepoisParaConferir || 120));
    const de2 = mes.ini - (CFG.diasAntesParaLicencas || 95);
    const seq = ++S.relogio;
    S.estado = 'coletando';
    S.dados = { cia, ano: S.ano, mes: S.mes, semanas, limites: mes, janela: { de: de2, ate }, inicio: Date.now(), req: null, reqAntes: null, listagem: null, desempenho: null, erros: {} };
    S.passos = {
      listagem: { estado: 'lendo', texto: 'Procurando a listagem de membros...' },
      requerimentos: { estado: 'lendo', texto: 'Lendo os requerimentos do mês...' },
      licencas: { estado: 'espera', texto: 'Depois dos requerimentos do mês.' },
      desempenho: { estado: 'lendo', texto: 'Procurando as porcentagens das semanas...' }
    };
    render();
    const vivo = () => seq === S.relogio;
    const d = S.dados;
    const pList = F.lerListagem(cia.listagem || {}, p => vivo() && passo('listagem', 'lendo', 'Lendo ' + p.fonte + '...')).then(r => {
      if (!vivo()) return;
      d.listagem = r;
      if (r.escolhida) passo('listagem', 'feito', plural(r.escolhida.membros, 'membro', 'membros') + ' em ' + r.escolhida.id + '.');
      else passo('listagem', 'erro', 'Não achei uma listagem válida.');
      calcular(); renderResultado();
    }).catch(e => { if (vivo()) { d.erros.listagem = e.message; passo('listagem', 'erro', e.message); } });
    const pReq = F.mensagensEntre(cia.requerimentos, de1, ate, p => vivo() && passo('requerimentos', 'lendo', 'Página ' + p.pagina + ' de ' + p.total + '...')).then(r => {
      if (!vivo()) return;
      d.req = Object.assign(r, { de: de1, ate });
      d.inicioReq = r.inicioTopico != null ? r.inicioTopico : null;
      passo('requerimentos', 'feito', plural(r.mensagens.length, 'mensagem lida', 'mensagens lidas') + ' (' + N.fmtCurto(de1) + ' a ' + N.fmtCurto(ate) + ').');
      calcular(); renderResultado();
    }).catch(e => { if (vivo()) { d.erros.requerimentos = e.message; passo('requerimentos', 'erro', e.message); } });
    const des = cia.desempenho || {};
    const progDes = p => vivo() && passo('desempenho', 'lendo', p.semana ? 'Semana ' + p.semana + ' de ' + p.total + '...' : 'Página ' + p.pagina + ' de ' + p.total + '...');
    const pDes = (des.topico ? F.porcentagensDoTopico(des.topico, semanas, des, progDes) : F.porcentagensDaPlanilha(des, semanas, des, progDes)).then(r => {
      if (!vivo()) return;
      d.desempenho = r;
      const achadas = r.porSemana.filter(x => x.resultado).length;
      passo('desempenho', achadas === semanas.length ? 'feito' : 'erro', achadas + ' de ' + semanas.length + ' semanas encontradas.');
      calcular(); renderResultado();
    }).catch(e => { if (vivo()) { d.erros.desempenho = e.message; passo('desempenho', 'erro', e.message); } });
    await Promise.all([pList, pReq, pDes]);
    if (!vivo()) return;
    if (d.req) {
      passo('licencas', 'lendo', 'Lendo os requerimentos desde ' + N.fmtDia(de2) + '...');
      try {
        const r = await F.mensagensEntre(cia.requerimentos, de2, de1 - 1, p => vivo() && passo('licencas', 'lendo', 'Página ' + p.pagina + ' de ' + p.total + '...'));
        if (!vivo()) return;
        d.reqAntes = Object.assign(r, { de: de2, ate: de1 - 1 });
        passo('licencas', 'feito', 'Licenças conferidas desde ' + N.fmtDia(de2) + '.');
      } catch (e) { d.erros.licencas = e.message; passo('licencas', 'erro', e.message); }
    } else passo('licencas', 'erro', 'Sem os requerimentos do mês.');
    S.estado = 'pronto';
    d.fim = Date.now();
    d.pedidos = F.contarPedidos();
    calcular();
    render();
  }

  /* ---------- cálculo ---------- */
  function calcular() {
    const d = S.dados;
    if (!d) return;
    const cia = d.cia, semanas = d.semanas;
    const ini = semanas[0].ini, fim = semanas[semanas.length - 1].fim;
    const msgs = [], vistos = new Set();
    [d.reqAntes, d.req].forEach(r => r && r.mensagens.forEach(m => { if (!vistos.has(m.id)) { vistos.add(m.id); msgs.push(m); } }));
    const eventos = [].concat(...msgs.map(m => N.eventosDaMensagem(m)));
    // requerimentos cancelados (a mensagem de cancelamento cita o original ou indica o REF)
    N.marcarCancelamentos(eventos);
    const L = d.listagem && d.listagem.escolhida ? d.listagem.escolhida.resultado : null;
    const conjunto = L ? new Set(L.membros.map(m => m.chave)) : null;
    const confere = !!d.req && d.req.ate >= N.hoje() - 1;
    const movs = N.movimentos(eventos, { listagem: confere ? conjunto : null });
    d.eventos = eventos;
    d.mensagensMes = msgs.filter(m => m.dia != null && m.dia >= ini && m.dia <= fim);
    d.movimentos = movs.filter(e => e.dia >= ini && e.dia <= fim);
    d.listagemConfere = confere && !!conjunto;
    d.lid = L || d.req ? N.lideranca({ listagem: L, eventos, companhia: { lideranca: cia.lideranca, ministerio: cia.ministerio }, ano: d.ano, mes: d.mes }) : null;
    if (d.lid) d.lid.lista.forEach(p => aplicarMesInteiro(p, d));
  }
  function aplicarMesInteiro(p, d) {
    const o = pessoaOpc(p);
    p.opc = o;
    if (o.mesInteiro && p.inicio > d.limites.ini) {
      const ini = d.limites.ini;
      const ints = p.licencas.map(x => ({ ini: x.ini, fim: x.fim }));
      p.diasNoCargoAjustado = p.fimCargo - ini + 1;
      p.diasAtivosAjustado = p.diasNoCargoAjustado - N.diasCobertos(ints, ini, p.fimCargo);
    } else { p.diasNoCargoAjustado = null; p.diasAtivosAjustado = null; }
  }
  const diasAtivos = p => (p.diasAtivosAjustado != null ? p.diasAtivosAjustado : p.diasAtivos);

  // Números por semana (o que vai para a planilha).
  function numeros() {
    const d = S.dados;
    const sem = N.contarPorSemana(d.movimentos || [], d.semanas, incluido);
    const des = d.desempenho ? d.desempenho.porSemana : d.semanas.map(s => ({ semana: s, resultado: null, avisos: [] }));
    const aulas = ((d.cia.desempenho || {}).aulas || []).map(a => a.sigla);
    return d.semanas.map((s, i) => {
      const r = des[i] && des[i].resultado;
      const movAvisos = sem[i].todos.filter(e => (e.avisosMov && e.avisosMov.length) || e.situacao !== 'conta');
      // semana anterior às mensagens que o tópico ainda guarda: sem dado (e não zero)
      const semDados = d.inicioReq != null && s.fim < d.inicioReq;
      const incompleta = d.inicioReq != null && s.ini < d.inicioReq && !semDados;
      return {
        semana: s, pos: r ? r.pos : null, neg: r ? r.neg : null, esp: r ? r.esp : null,
        ent: d.req && !semDados ? sem[i].entradas : null, sai: d.req && !semDados ? sem[i].saidas : null, incompleta,
        aulas: Object.fromEntries(aulas.map(k => [k, r && r.aulas ? (r.aulas[k] != null ? r.aulas[k] : null) : null])),
        des: des[i], mov: sem[i], alertaDes: !r || (des[i].avisos && des[i].avisos.length > 0), alertaMov: movAvisos.length > 0 || incompleta
      };
    });
  }

  /* ---------- pontos para conferir ---------- */
  function pontos() {
    const d = S.dados, out = [];
    if (!d) return out;
    const add = (grupo, texto, links, nivel) => out.push({ grupo, texto, links: links || [], nivel: nivel || 'aviso' });
    if (d.erros.listagem) add('Listagem', 'Erro ao ler a listagem: ' + d.erros.listagem);
    if (d.listagem && !d.listagem.escolhida) add('Listagem', 'Nenhuma fonte da listagem foi reconhecida. Os dias ativos e a conferência das entradas e saídas ficam sem a listagem.', d.listagem.tentativas.map(t => ({ rotulo: t.id, url: t.url })));
    if (d.req && !d.listagemConfere && d.listagem && d.listagem.escolhida) add('Entradas e saídas', 'O mês é antigo demais para conferir as entradas e saídas com a listagem atual.', [], 'info');
    (d.movimentos || []).forEach(e => {
      if (!e.avisosMov || !e.avisosMov.length || e.situacao === 'cancelado') return;
      add('Entradas e saídas', nomeMov(e) + ' de ' + e.nick + ' em ' + N.fmtDia(e.dia) + ': ' + e.avisosMov.join('; ') + '.', [{ rotulo: 'mensagem', url: linkPost(e.post) }].concat((e.citadoEm || []).map(c => ({ rotulo: c.cancela ? 'cancelamento' : 'citação', url: linkPost(c.post) }))), e.situacao === 'conta' ? 'aviso' : 'info');
    });
    const ini = d.semanas[0].ini, fim = d.semanas[d.semanas.length - 1].fim;
    (d.eventos || []).filter(e => e.dia != null && e.dia >= ini && e.dia <= fim).forEach(e => {
      if (e.tipo === 'desconhecido') add('Requerimentos', 'Mensagem de ' + N.fmtDia(e.dia) + (e.autor ? ' (' + e.autor + ')' : '') + ' sem tipo reconhecido' + (e.linhasResumo && e.linhasResumo.length ? ': "' + e.linhasResumo.join(' ').slice(0, 90) + '"' : '') + '.', [{ rotulo: 'mensagem', url: linkPost(e.post) }], 'info');
      else if (e.tipo === 'nota' && e.cancela) {
        const alvos = (d.eventos || []).filter(x => x.cancelado && x.cancelado.post === e.post);
        const nome = x => (x.grupo === 'entrada' || x.grupo === 'saida' ? nomeMov(x) : N.NOME_TIPO[x.tipo] || x.tipo).replace(/^./, c => c.toLowerCase());
        if (alvos.length) add('Requerimentos', 'Mensagem de ' + N.fmtDia(e.dia) + (e.autor ? ' (' + e.autor + ')' : '') + ' cancela: ' + alvos.map(x => nome(x) + ' de ' + x.nick).join(', ') + '. Ficou fora da contagem; ligue de novo se o cancelamento não valeu.', [{ rotulo: 'cancelamento', url: linkPost(e.post) }].concat(alvos.slice(0, 3).map(x => ({ rotulo: 'original', url: linkPost(x.post) }))), 'info');
        else add('Requerimentos', 'Mensagem de ' + N.fmtDia(e.dia) + ' fala em cancelamento, mas não achei o requerimento cancelado no período lido.', [{ rotulo: 'mensagem', url: linkPost(e.post) }]);
      }
      else if ((e.grupo === 'entrada' || e.grupo === 'saida' || e.grupo === 'licenca') && e.avisos && e.avisos.length) add('Requerimentos', N.NOME_TIPO[e.tipo] + (e.nick ? ' de ' + e.nick : '') + ' em ' + N.fmtDia(e.dia) + ': ' + e.avisos.join('; ') + '.', [{ rotulo: 'mensagem', url: linkPost(e.post) }]);
    });
    if (d.req && d.inicioReq != null) {
      const ini0 = d.semanas[0].ini;
      if (d.inicioReq > ini0) {
        const antes = d.semanas.filter(s => s.fim < d.inicioReq).map(s => s.n + 'ª');
        const parcial = d.semanas.find(s => s.ini < d.inicioReq && s.fim >= d.inicioReq);
        add('Requerimentos', 'O tópico de requerimentos só guarda mensagens a partir de ' + N.fmtDia(d.inicioReq) + ' (as mais antigas foram apagadas ou arquivadas). ' +
          (antes.length ? 'Semana' + (antes.length > 1 ? 's ' : ' ') + antes.join(', ') + ' sem entradas e saídas. ' : '') + (parcial ? 'A ' + parcial.n + 'ª semana está incompleta.' : ''), [{ rotulo: 'tópico', url: '/t' + d.cia.requerimentos + '-' }]);
      }
      const de2 = d.limites.ini - (CFG.diasAntesParaLicencas || 95);
      if (d.inicioReq > de2) add('Ministério e liderança', 'Licenças pedidas antes de ' + N.fmtDia(d.inicioReq) + ' não estão mais no tópico: só entram se aparecerem na listagem.', [], 'info');
    }
    const semData = (d.mensagensMes || []).filter(m => m.diaAproximado).length;
    if (semData) add('Requerimentos', plural(semData, 'mensagem ficou', 'mensagens ficaram') + ' sem data legível; usei a data da mensagem anterior.', [], 'info');
    if (d.desempenho) {
      (d.desempenho.notas || []).forEach(n => add('Porcentagens', n, [], 'info'));
      d.desempenho.porSemana.forEach(x => {
        (x.avisos || []).forEach(a => add('Porcentagens', x.semana.n + 'ª semana (' + x.semana.rotulo + '): ' + a, x.url ? [{ rotulo: 'fonte', url: x.url }] : [], 'aviso'));
        (x.notas || []).forEach(a => add('Porcentagens', x.semana.n + 'ª semana (' + x.semana.rotulo + '): ' + a, x.url ? [{ rotulo: 'fonte', url: x.url }] : [], 'info'));
      });
    } else if (d.erros.desempenho) add('Porcentagens', 'Erro ao ler as porcentagens: ' + d.erros.desempenho);
    if (d.lid) d.lid.lista.forEach(p => {
      (p.avisos || []).forEach(a => add('Ministério e liderança', p.nick + ': ' + a + '.', p.licencas.reduce((l, x) => l.concat(x.eventos.map(e => ({ rotulo: N.NOME_TIPO[e.tipo].toLowerCase(), url: linkPost(e.post) }))), [])));
      if (p.depoisDoMes) add('Ministério e liderança', p.nick + ' está no cargo só depois do mês (desde ' + N.fmtDia(p.desde) + '). Ficou fora; marque se já era do cargo no mês.', [], 'info');
    });
    if (d.erros.requerimentos) add('Requerimentos', 'Erro ao ler os requerimentos: ' + d.erros.requerimentos);
    if (d.erros.licencas) add('Ministério e liderança', 'Erro ao ler os requerimentos dos meses anteriores: ' + d.erros.licencas + '. Licenças que começaram antes do mês podem ter ficado de fora.');
    return out;
  }

  /* ---------- cópia para a planilha ---------- */
  function blocoTSV(bloco) {
    const d = S.dados, nums = numeros();
    if (bloco === 'semanas') return N.tsv(['pos', 'neg', 'esp', 'ent', 'sai'].map(k => nums.map(x => (x[k] == null ? '' : x[k]))));
    if (bloco === 'aulas') return N.tsv(((d.cia.desempenho || {}).aulas || []).map(a => nums.map(x => (x.aulas[a.sigla] == null ? '' : x.aulas[a.sigla]))));
    const lista = d.lid ? d.lid.lista.filter(p => pessoaOpc(p).incluir) : [];
    if (bloco === 'ministerio') return N.tsv(lista.filter(p => p.grupo === 'ministerio').map(p => [p.nick, diasAtivos(p)]));
    if (bloco === 'lideranca') return N.tsv(lista.filter(p => p.grupo === 'lideranca').map(p => [p.nick, NOME_PAPEL[p.papel] || '', diasAtivos(p)]));
    return '';
  }

  /* ---------- telas ---------- */
  function render() {
    const app = $('app');
    if (S.acesso === 'verificando') { app.innerHTML = tela('fa-circle-notch fa-spin', 'Conferindo seu acesso', 'Lendo a sua sessão e os grupos do fórum.'); return; }
    if (S.acesso === 'entrar') { app.innerHTML = tela('fa-right-to-bracket', 'Entre no fórum', 'Conecte-se à sua conta do fórum e recarregue esta página.', '<a class="btn-principal mt-5" href="/login">Entrar</a>'); return; }
    if (S.acesso === 'restrito') {
      app.innerHTML = tela('fa-lock', 'Página restrita', 'Esta ferramenta é da Auditoria Fiscal. Ela abre para quem está em um destes grupos do fórum:',
        '<ul class="mx-auto mt-4 grid max-w-md gap-1.5 text-left text-[13px]">' + (CFG.grupos || []).map(g => '<li class="info-linha !py-2"><i class="fa-solid fa-users"></i>' + esc(g.nome) + '</li>').join('') + '</ul>');
      return;
    }
    if (S.acesso === 'erro') { app.innerHTML = tela('fa-triangle-exclamation', 'Não deu para conferir o acesso', esc(S.erro || 'Erro desconhecido.') + ' Recarregue a página para tentar de novo.'); return; }
    app.innerHTML = '<div id="controles"></div><div id="progresso"></div><div id="resultado"></div>';
    renderControles();
    renderProgresso();
    renderResultado();
  }
  const tela = (icone, titulo, texto, extra) => '<section class="cartao mx-auto mt-6 max-w-xl text-center"><div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-af-500/10 text-[22px] text-af-400"><i class="fa-solid ' + icone + '"></i></div>' +
    '<h2 class="mt-4 font-titulo text-[26px] font-bold uppercase tracking-[.02em] text-texto">' + esc(titulo) + '</h2><p class="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-musgo">' + texto + '</p>' + (extra || '') + '</section>';

  function renderControles() {
    const el = $('controles');
    if (!el) return;
    const semanas = N.semanasDoMes(S.ano, S.mes);
    const proxBloq = mesmoOuDepois(S.mes === 11 ? S.ano + 1 : S.ano, S.mes === 11 ? 0 : S.mes + 1);
    const coletando = S.estado === 'coletando';
    const mesmo = S.dados && S.dados.cia.id === S.cia && S.dados.ano === S.ano && S.dados.mes === S.mes;
    el.innerHTML = '<section class="cartao">' +
      '<div class="secao"><i class="fa-solid fa-building-shield"></i>Companhia</div>' +
      '<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">' + companhias.map(c =>
        '<button type="button" class="chip-cia" data-acao="cia" data-id="' + esc(c.id) + '" aria-pressed="' + (c.id === S.cia) + '" style="--cor:' + esc(c.cor) + '"' + (coletando ? ' disabled' : '') + '>' +
        '<img src="' + esc(emblema(c.emblema)) + '" alt="" class="h-9 w-9 shrink-0 object-contain"><span class="min-w-0"><b class="block text-[13px] text-texto">' + esc(c.id) + '</b><span class="block truncate text-[11px] text-musgo">' + esc(c.nome) + '</span></span></button>').join('') + '</div>' +
      '<div class="mt-5 flex flex-wrap items-end gap-x-4 gap-y-3">' +
      '<div class="w-full sm:w-auto"><div class="secao !mb-1.5"><i class="fa-regular fa-calendar"></i>Mês de referência</div><div class="flex items-center gap-1.5">' +
      '<button type="button" class="btn !px-3" data-acao="mes" data-delta="-1" aria-label="Mês anterior"' + (coletando ? ' disabled' : '') + '><i class="fa-solid fa-chevron-left"></i></button>' +
      '<div class="min-w-0 flex-1 rounded-xl border border-realce/[0.08] bg-placa2 px-4 py-2.5 text-center text-[14px] font-semibold text-texto sm:min-w-[170px] sm:flex-none">' + esc(N.MESES_LONGOS[S.mes]) + ' de ' + S.ano + '</div>' +
      '<button type="button" class="btn !px-3" data-acao="mes" data-delta="1" aria-label="Próximo mês"' + (proxBloq || coletando ? ' disabled' : '') + '><i class="fa-solid fa-chevron-right"></i></button></div></div>' +
      '<div class="w-full text-[12px] leading-relaxed text-musgo sm:w-auto sm:min-w-[220px] sm:flex-1"><b class="font-semibold text-nevoa">' + plural(semanas.length, 'semana', 'semanas') + ':</b> ' + semanas.map(s => esc(s.rotulo)).join(' · ') + '</div>' +
      '<button type="button" class="btn-principal w-full sm:w-auto" data-acao="coletar"' + (coletando ? ' disabled' : '') + '>' + (coletando ? '<i class="fa-solid fa-circle-notch fa-spin"></i>Coletando...' : '<i class="fa-solid fa-magnifying-glass-chart"></i>' + (mesmo ? 'Coletar de novo' : 'Coletar dados')) + '</button>' +
      '</div></section>';
  }
  function renderProgresso() {
    const el = $('progresso');
    if (!el) return;
    if (!S.dados || S.estado !== 'coletando') { el.innerHTML = ''; return; }
    const nomes = { listagem: 'Listagem', requerimentos: 'Requerimentos do mês', licencas: 'Licenças anteriores', desempenho: 'Porcentagens' };
    el.innerHTML = '<section class="cartao mt-4"><div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">' + Object.keys(nomes).map(k => {
      const p = S.passos[k] || { estado: 'espera', texto: '' };
      return '<div class="passo" data-passo="' + k + '" data-estado="' + p.estado + '"><span class="icone">' + iconePasso(p.estado, k) + '</span><span class="min-w-0"><b class="block text-[13px] text-texto">' + nomes[k] + '</b><span data-texto class="block text-[12px] text-musgo">' + esc(p.texto) + '</span></span></div>';
    }).join('') + '</div></section>';
  }

  function celula(valor, acao, extra, alerta) {
    if (valor == null) return '<span class="inline-block min-w-[46px] px-2 text-right text-musgo/70" title="sem dado">-</span>';
    return '<button type="button" class="cel" data-acao="detalhe" ' + acao + (alerta ? ' data-alerta title="Tem ponto para conferir"' : '') + (extra || '') + '>' + fmtN(valor) + '</button>';
  }
  const soma = lista => { const v = lista.filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) : null; };

  function renderResultado() {
    const el = $('resultado');
    if (!el) return;
    renderControles();
    renderProgresso();
    const d = S.dados;
    if (!d) {
      el.innerHTML = '<section class="cartao mt-4"><div class="info-linha"><i class="fa-solid fa-circle-info"></i><span>Escolha a companhia e o mês e clique em <b class="text-texto">Coletar dados</b>. A página lê a listagem, os requerimentos e as porcentagens do fórum e monta os números de cada semana, com o que precisa ser conferido.</span></div></section>';
      return;
    }
    const nums = numeros();
    const cia = d.cia;
    const aulas = ((cia.desempenho || {}).aulas || []).map(a => a.sigla);
    const lista = pontos();
    const tot = k => soma(nums.map(x => x[k]));
    const totAulas = soma(nums.map(x => soma(aulas.map(a => x.aulas[a]))));
    const mesNome = N.MESES_LONGOS[d.mes] + ' de ' + d.ano;
    const cab = '<section class="mt-6 flex flex-wrap items-center gap-3"><img src="' + esc(emblema(cia.emblema)) + '" alt="" class="h-12 w-12 shrink-0 object-contain"><div class="min-w-[200px] flex-1"><div class="kicker" style="color:' + esc(cia.cor) + '">' + esc(cia.id) + ' · ' + esc(mesNome) + '</div>' +
      '<h2 class="font-titulo text-[24px] font-bold uppercase leading-tight tracking-[.02em] text-texto">' + esc(cia.nome) + '</h2><p class="text-[12px] text-musgo">' + (S.estado === 'coletando' ? 'Coletando... os números aparecem à medida que as fontes são lidas.' : 'Coletado ' + (d.fim ? 'às ' + new Date(d.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '') + ' · ' + plural(d.pedidos || 0, 'página lida', 'páginas lidas') + ' no fórum.') + '</p></div>' +
      (S.estado === 'pronto' ? '<button type="button" class="btn" data-acao="coletar" data-forcar="1"><i class="fa-solid fa-rotate"></i>Recarregar do fórum</button>' : '') + '</section>';
    const kpis = '<section class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">' + [
      ['Positivos', tot('pos'), 'text-pos'], ['Negativos', tot('neg'), 'text-neg'], ['Casos especiais', tot('esp'), 'text-esp'], ['Entradas', tot('ent'), ''], ['Saídas', tot('sai'), ''], ['Aulas', totAulas, ''], ['Para conferir', lista.filter(p => p.nivel === 'aviso').length, 'text-aviso']
    ].map(([r, v, c], i) => '<div class="kpi' + (i === 6 ? ' col-span-2 sm:col-span-1' : '') + '"><b class="' + c + '">' + (v == null ? '-' : fmtN(v)) + '</b><span>' + r + '</span></div>').join('') + '</section>';
    const alertaDe = (x, k) => (k === 'ent' || k === 'sai') ? x.alertaMov && x.mov.todos.some(e => e.grupo === (k === 'ent' ? 'entrada' : 'saida') && ((e.avisosMov && e.avisosMov.length) || e.situacao !== 'conta')) : x.alertaDes;
    const LINHAS = [['Positivos', 'pos', 'fa-arrow-trend-up', 'text-pos', 'Pos.'], ['Negativos', 'neg', 'fa-arrow-trend-down', 'text-neg', 'Neg.'], ['Casos especiais', 'esp', 'fa-star-of-life', 'text-esp', 'Esp.'], ['Entradas', 'ent', 'fa-right-to-bracket', 'text-af-400', 'Ent.'], ['Saídas', 'sai', 'fa-right-from-bracket', 'text-af-400', 'Saí.']];
    const totTxt = v => '<span class="cel pointer-events-none font-bold">' + (v == null ? '-' : fmtN(v)) + '</span>';
    const cabSem = '<th>Semana</th>' + nums.map(x => '<th class="n">' + x.semana.n + 'ª<span class="mt-0.5 block text-[10px] font-medium normal-case tracking-normal">' + esc(x.semana.rotulo) + '</span></th>').join('') + '<th class="n">Total</th>';
    const tabSem = '<div class="rolagem hidden sm:block"><table class="tabela min-w-[620px]" data-tabela="semanal"><thead><tr>' + cabSem + '</tr></thead><tbody>' + LINHAS.map(([rot, k, icone, cor]) =>
      '<tr><td class="whitespace-nowrap font-semibold text-texto"><i class="fa-solid ' + icone + ' mr-2 w-4 text-center text-[11px] ' + cor + '"></i>' + rot + '</td>' +
      nums.map((x, i) => '<td class="n">' + celula(x[k], 'data-tipo="' + k + '" data-semana="' + i + '"', '', alertaDe(x, k)) + '</td>').join('') +
      '<td class="n font-bold text-texto">' + totTxt(tot(k)) + '</td></tr>').join('') + '</tbody></table></div>';
    // no celular: uma linha por semana
    const tabSemMovel = '<div class="sm:hidden"><table class="tabela !text-[12.5px]" data-tabela="semanal-movel"><thead><tr><th class="!px-2">Semana</th>' + LINHAS.map(l => '<th class="n !px-1">' + l[4] + '</th>').join('') + '</tr></thead><tbody>' +
      nums.map((x, i) => '<tr><td class="!px-2"><b class="text-texto">' + x.semana.n + 'ª</b><span class="block whitespace-nowrap text-[10.5px] text-musgo">' + esc(x.semana.rotulo) + '</span></td>' + LINHAS.map(([, k]) => '<td class="n !px-1">' + celula(x[k], 'data-tipo="' + k + '" data-semana="' + i + '"', '', alertaDe(x, k)) + '</td>').join('') + '</tr>').join('') +
      '<tr><td class="!px-2 font-bold text-texto">Total</td>' + LINHAS.map(([, k]) => '<td class="n !px-1">' + totTxt(tot(k)) + '</td>').join('') + '</tr></tbody></table></div>';
    const semanal = '<section class="cartao mt-4"><div class="secao"><i class="fa-solid fa-calendar-week"></i>Desempenho semanal<span class="ml-auto normal-case tracking-normal"><button type="button" class="btn-mini" data-acao="copiar" data-bloco="semanas"><i class="fa-regular fa-copy"></i>Copiar para a planilha</button></span></div>' +
      tabSem + tabSemMovel +
      '<p class="mt-3 text-[11.5px] leading-relaxed text-musgo">Positivos somam destaques, excelentes, bons, ótimos, acima e na média. Toque num número para ver de onde ele veio. O ponto amarelo marca o que precisa ser conferido.</p></section>';
    const linhasAulas = aulas.map(a => '<tr><td class="font-semibold text-texto">' + esc(a) + '</td>' + nums.map((x, i) => '<td class="n">' + celula(x.aulas[a], 'data-tipo="aula" data-semana="' + i + '"', '', !!(x.des && x.des.resultado && x.des.resultado.aulas && x.des.resultado.aulas[a] == null)) + '</td>').join('') + '<td class="n font-bold text-texto">' + totTxt(soma(nums.map(x => x.aulas[a]))) + '</td></tr>').join('');
    const aulasHtml = aulas.length ? '<section class="cartao mt-4"><div class="secao"><i class="fa-solid fa-chalkboard-user"></i>Aulas aplicadas<span class="ml-auto normal-case tracking-normal"><button type="button" class="btn-mini" data-acao="copiar" data-bloco="aulas"><i class="fa-regular fa-copy"></i>Copiar para a planilha</button></span></div>' +
      '<div class="rolagem"><table class="tabela ' + (aulas.length > 4 ? 'min-w-[620px]' : 'min-w-[520px]') + '" data-tabela="aulas"><thead><tr>' + cabSem.replace('<th>Semana</th>', '<th>Aula</th>') + '</tr></thead><tbody>' + linhasAulas +
      '<tr><td class="font-bold text-texto">Total de aulas</td>' + nums.map(x => '<td class="n font-bold text-texto">' + totTxt(soma(aulas.map(a => x.aulas[a]))) + '</td>').join('') + '<td class="n font-bold text-texto">' + totTxt(totAulas) + '</td></tr></tbody></table></div>' +
      '<p class="mt-3 text-[11.5px] text-musgo">Fonte: porcentagem de ' + esc((cia.desempenho || {}).cargo || 'cargo base') + '.' + (d.desempenho && d.desempenho.fonte ? ' <a class="link" target="_blank" rel="noopener" href="' + esc(d.desempenho.fonte) + '">Abrir a fonte</a>' : '') + '</p></section>' : '';
    el.innerHTML = cab + kpis + semanal + aulasHtml + htmlMovimentos(nums) + htmlLideranca() + htmlPontos(lista) + htmlFontes();
  }
  function seloSituacao(e) {
    if (e.situacao === 'cancelado') return '<span class="selo selo-neutro"><i class="fa-solid fa-ban"></i>Cancelado</span>';
    if (e.situacao === 'repetido') return '<span class="selo selo-neutro"><i class="fa-solid fa-clone"></i>Repetido</span>';
    if (e.situacao === 'riscado') return '<span class="selo selo-neutro"><i class="fa-solid fa-strikethrough"></i>Riscado</span>';
    if (e.avisosMov && e.avisosMov.length) return '<span class="selo selo-aviso"><i class="fa-solid fa-triangle-exclamation"></i>Conferir</span>';
    if (e.confirmacao === 'na-listagem' || e.confirmacao === 'fora-da-listagem') return '<span class="selo selo-ok"><i class="fa-solid fa-check"></i>Confere</span>';
    if (e.confirmacao === 'saiu-depois') return '<span class="selo selo-ok" title="Saiu depois"><i class="fa-solid fa-check"></i>Saiu depois</span>';
    if (e.confirmacao === 'voltou-depois') return '<span class="selo selo-ok" title="Voltou depois"><i class="fa-solid fa-check"></i>Voltou depois</span>';
    return '<span class="selo selo-neutro">Conta</span>';
  }
  function linhaMov(e) {
    const inc = incluido(e);
    const ent = e.grupo === 'entrada';
    return '<div class="flex items-start gap-3 border-b border-linha/70 py-2.5 last:border-b-0' + (inc ? '' : ' opacity-60') + '" data-item="' + esc(e.id) + '">' +
      '<img class="cabeca mt-0.5" loading="lazy" alt="" src="' + esc(cabeca(e.nick)) + '">' +
      '<div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-x-2 gap-y-1"><b class="break-all text-[13.5px] font-semibold text-texto">' + esc(e.nick) + '</b>' +
      '<span class="selo ' + (ent ? 'selo-ok' : 'selo-neg') + '">' + esc(nomeMov(e)) + '</span>' +
      '<span class="text-[12px] tabular-nums text-musgo">' + esc(N.fmtCurto(e.dia)) + '</span>' + seloSituacao(e) + '</div>' +
      (e.avisosMov && e.avisosMov.length ? '<p class="mt-1 text-[11.5px] leading-snug text-musgo">' + esc(e.avisosMov.join('; ')) + '.</p>' : '') + '</div>' +
      '<div class="flex shrink-0 flex-col items-end gap-1.5"><button type="button" class="interruptor" role="switch" aria-checked="' + inc + '" aria-label="Contar ' + esc(e.nick) + '" data-acao="mov" data-id="' + esc(e.id) + '"></button>' +
      '<a class="link text-[11.5px]" target="_blank" rel="noopener" href="' + esc(linkPost(e.post)) + '">mensagem</a></div></div>';
  }
  function htmlMovimentos(nums) {
    const d = S.dados;
    if (!d.req) return '';
    const todos = d.movimentos || [];
    const conferir = e => (e.avisosMov && e.avisosMov.length) || e.situacao !== 'conta';
    const filtros = [['todos', 'Todos', todos.length], ['entrada', 'Entradas', todos.filter(e => e.grupo === 'entrada').length], ['saida', 'Saídas', todos.filter(e => e.grupo === 'saida').length], ['conferir', 'Para conferir', todos.filter(conferir).length]];
    const passa = e => S.filtro === 'todos' || (S.filtro === 'conferir' ? conferir(e) : e.grupo === S.filtro);
    const blocos = nums.map(x => {
      const itens = x.mov.todos.filter(e => (e.grupo === 'entrada' || e.grupo === 'saida') && passa(e));
      if (!itens.length) return '';
      return '<div class="mt-4 first:mt-2"><div class="mb-1 text-[11px] font-semibold uppercase tracking-[.12em] text-musgo">' + x.semana.n + 'ª semana · ' + esc(x.semana.rotulo) + ' <span class="font-medium normal-case tracking-normal">· ' + plural(x.ent, 'entrada', 'entradas') + ', ' + plural(x.sai, 'saída', 'saídas') + '</span></div>' + itens.map(linhaMov).join('') + '</div>';
    }).join('');
    return '<section class="cartao mt-4"><div class="secao"><i class="fa-solid fa-people-arrows"></i>Entradas e saídas<span class="ml-auto flex flex-wrap gap-1.5 normal-case tracking-normal">' +
      filtros.map(([v, r, n]) => '<button type="button" class="filtro" data-acao="filtro" data-valor="' + v + '" aria-pressed="' + (S.filtro === v) + '">' + r + ' <span class="text-musgo">' + n + '</span></button>').join('') + '</span></div>' +
      '<p class="text-[12px] leading-relaxed text-musgo">Entram: entrada, admissão e reintegração. Saem: saída, expulsão, exoneração e os removidos na fiscalização ou supervisão da listagem. Cancelados, repetidos e riscados ficam fora; ligue ou desligue cada item para corrigir a contagem.</p>' +
      (blocos || '<div class="info-linha mt-3"><i class="fa-solid fa-circle-info"></i><span>Nenhum item neste filtro.</span></div>') + '</section>';
  }
  function cartaoPessoas(titulo, icone, grupo, bloco) {
    const d = S.dados;
    const lista = d.lid.lista.filter(p => p.grupo === grupo);
    const ROT = { licenca: 'pedido', prolongamento: 'prolongamento', retorno: 'retorno' };
    const corpo = lista.map(p => {
      const o = pessoaOpc(p);
      const dias = diasAtivos(p);
      const lic = p.licencas.map(x => '<span class="block"><i class="fa-solid fa-mug-hot mr-1.5 text-esp"></i>Licença de ' + esc(N.fmtCurto(x.ini)) + ' a ' + esc(N.fmtCurto(x.fim - 1)) +
        (x.retorno ? ' (voltou antes)' : x.eventos.some(e => e.tipo === 'prolongamento') ? ' (prolongada)' : '') + (x.fonte === 'listagem' ? ' (só na listagem)' : '') +
        x.eventos.map(e => ' · <a class="link" target="_blank" rel="noopener" href="' + esc(linkPost(e.post)) + '">' + esc(ROT[e.tipo] || e.tipo) + '</a>').join('') + '</span>').join('');
      const podeMesInteiro = p.inicio > d.limites.ini;
      return '<div class="border-b border-linha/70 px-1 py-3 last:border-b-0' + (o.incluir ? '' : ' opacity-55') + '">' +
        '<div class="flex items-center gap-3"><img class="cabeca !h-9 !w-9" loading="lazy" alt="" src="' + esc(cabeca(p.nick)) + '"><div class="min-w-0 flex-1"><b class="block truncate text-[13.5px] text-texto">' + esc(p.nick) + '</b>' +
        '<span class="text-[11.5px] text-musgo">' + esc(NOME_PAPEL[p.papel] || '') + (p.naListagem ? '' : ' · fora da listagem atual') + '</span></div>' +
        '<div class="text-right"><b class="font-titulo text-[26px] leading-none text-texto">' + dias + '</b><span class="text-[11px] text-musgo"> / ' + (p.diasNoCargoAjustado != null ? p.diasNoCargoAjustado : p.diasNoCargo) + '</span><span class="block text-[10.5px] uppercase tracking-[.08em] text-musgo">dias ativos</span></div></div>' +
        (p.licencas.length ? '<p class="mt-2 text-[12px] leading-relaxed text-nevoa">' + lic + '<span class="block text-musgo">' + plural(p.diasLicenca, 'dia', 'dias') + ' de licença no mês.</span></p>' : '') +
        (p.notas.length ? '<p class="mt-1 text-[11.5px] text-musgo">' + esc(p.notas.join('; ')) + '.</p>' : '') +
        (p.avisos.length ? '<p class="mt-1 text-[11.5px] text-aviso"><i class="fa-solid fa-triangle-exclamation mr-1"></i>' + esc(p.avisos.join('; ')) + '.</p>' : '') +
        '<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-musgo"><label class="inline-flex items-center gap-2"><button type="button" class="interruptor" role="switch" aria-checked="' + o.incluir + '" data-acao="pessoa" data-campo="incluir" data-chave="' + esc(p.id) + '"></button>Incluir</label>' +
        (podeMesInteiro ? '<label class="inline-flex items-center gap-2"><button type="button" class="interruptor" role="switch" aria-checked="' + o.mesInteiro + '" data-acao="pessoa" data-campo="mesInteiro" data-chave="' + esc(p.id) + '"></button>Contar o mês inteiro</label>' : '') + '</div></div>';
    }).join('');
    return '<section class="cartao"><div class="secao"><i class="fa-solid ' + icone + '"></i>' + esc(titulo) + '<span class="ml-auto normal-case tracking-normal"><button type="button" class="btn-mini" data-acao="copiar" data-bloco="' + bloco + '"><i class="fa-regular fa-copy"></i>Copiar</button></span></div>' +
      (corpo || '<div class="info-linha"><i class="fa-solid fa-circle-info"></i><span>Ninguém encontrado.</span></div>') + '</section>';
  }
  function htmlLideranca() {
    const d = S.dados;
    if (!d.lid) return '';
    const semListagem = !(d.listagem && d.listagem.escolhida);
    const nota = '<div class="info-linha mb-3"><i class="fa-solid fa-circle-info"></i><span>Dias ativos' + (d.lid.parcial ? ' até hoje (' + esc(N.fmtDia(d.lid.ate)) + ')' : ' no mês') + ': dias no cargo menos os dias de licença. Licença sem retorno conta o prazo inteiro; o retorno antecipado encerra a licença; o prolongamento soma dias.' +
      (d.reqAntes ? ' Requerimentos lidos desde ' + esc(N.fmtDia(d.reqAntes.de)) + '.' : ' Ainda faltam os requerimentos dos meses anteriores.') + '</span></div>';
    return '<section class="mt-4">' + (semListagem ? '<div class="aviso-linha mb-3"><i class="fa-solid fa-triangle-exclamation"></i><span>Sem a listagem, só aparecem os cargos achados nos requerimentos do mês.</span></div>' : '') + nota +
      '<div class="grid gap-4 lg:grid-cols-2">' + cartaoPessoas(d.cia.tituloMinisterio || 'Ministério', 'fa-landmark', 'ministerio', 'ministerio') + cartaoPessoas('Liderança', 'fa-crown', 'lideranca', 'lideranca') + '</div></section>';
  }
  function htmlPontos(lista) {
    if (!S.dados || (!lista.length && S.estado === 'coletando')) return '';
    const grupos = {};
    lista.forEach(p => { (grupos[p.grupo] = grupos[p.grupo] || []).push(p); });
    const nomes = Object.keys(grupos);
    return '<section class="cartao mt-4"><div class="secao"><i class="fa-solid fa-list-check"></i>Pontos para conferir<span class="ml-auto text-[12px] normal-case tracking-normal">' + plural(lista.filter(p => p.nivel === 'aviso').length, 'aviso', 'avisos') + '</span></div>' +
      (nomes.length ? nomes.map(g => '<h3 class="mb-2 mt-4 text-[12px] font-semibold text-texto first:mt-0">' + esc(g) + '</h3><div class="grid gap-2">' + grupos[g].map(p =>
        '<div class="' + (p.nivel === 'aviso' ? 'aviso-linha' : 'info-linha') + '"><i class="fa-solid ' + (p.nivel === 'aviso' ? 'fa-triangle-exclamation' : 'fa-circle-info') + '"></i><span>' + esc(p.texto) +
        p.links.map(l => ' <a class="link" target="_blank" rel="noopener" href="' + esc(l.url) + '">' + esc(l.rotulo) + '</a>').join('') + '</span></div>').join('') + '</div>').join('')
        : '<div class="info-linha"><i class="fa-solid fa-circle-check"></i><span>Nada para conferir.</span></div>') + '</section>';
  }
  function htmlFontes() {
    const d = S.dados;
    const itens = [];
    if (d.listagem) {
      const e = d.listagem.escolhida;
      itens.push('<li><b class="text-texto">Listagem:</b> ' + (e ? '<a class="link" target="_blank" rel="noopener" href="' + esc(e.url) + '">' + esc(e.id) + '</a> (' + plural(e.membros, 'membro', 'membros') + ')' : 'nenhuma reconhecida') +
        (d.listagem.tentativas.length > 1 ? '. Também lidas: ' + d.listagem.tentativas.filter(t => t !== e).map(t => '<a class="link" target="_blank" rel="noopener" href="' + esc(t.url) + '">' + esc(t.id) + '</a>' + (t.valido ? ' (' + t.membros + ')' : t.erro ? ' (' + esc(t.erro) + ')' : ' (não reconhecida)')).join(', ') : '') + '.</li>');
    }
    if (d.req) itens.push('<li><b class="text-texto">Requerimentos:</b> <a class="link" target="_blank" rel="noopener" href="' + esc('/t' + d.cia.requerimentos + '-') + '">tópico ' + esc(d.cia.requerimentos) + '</a>, mensagens de ' + esc(N.fmtDia((d.reqAntes || d.req).de)) + ' a ' + esc(N.fmtDia(d.req.ate)) + ' (' + plural(d.req.paginas + (d.reqAntes ? d.reqAntes.paginas : 0), 'página', 'páginas') + ').</li>');
    if (d.desempenho) itens.push('<li><b class="text-texto">Porcentagens:</b> ' + (d.desempenho.fonte ? '<a class="link" target="_blank" rel="noopener" href="' + esc(d.desempenho.fonte) + '">' + esc(d.desempenho.titulo || d.desempenho.fonte) + '</a>' : '-') + '.</li>');
    return '<section class="cartao mt-4"><div class="secao"><i class="fa-solid fa-link"></i>Fontes consultadas</div><ul class="grid gap-1.5 text-[12.5px] leading-relaxed text-musgo">' + itens.join('') + '</ul></section>';
  }

  /* ---------- detalhe de uma célula ---------- */
  function abrirModal(titulo, sub, corpo) {
    const m = $('modal');
    m.hidden = false;
    m.innerHTML = '<div class="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" data-acao="fechar-modal">' +
      '<div class="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-[22px] border border-realce/10 bg-placa p-5 sm:rounded-[22px] sm:p-6" role="dialog" aria-modal="true" aria-label="' + esc(titulo) + '" style="box-shadow: var(--sombra-modal)" data-parar>' +
      '<button type="button" class="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl text-musgo hover:bg-realce/5 hover:text-texto" data-acao="fechar-modal" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>' +
      '<div class="kicker pr-10">' + esc(sub) + '</div><h3 class="mt-1 pr-10 font-titulo text-[24px] font-bold uppercase leading-tight tracking-[.02em] text-texto">' + esc(titulo) + '</h3><div class="mt-4">' + corpo + '</div></div></div>';
    const b = m.querySelector('button');
    if (b) b.focus();
  }
  function fecharModal() { const m = $('modal'); m.hidden = true; m.innerHTML = ''; }
  function detalhe(tipo, i) {
    const d = S.dados, nums = numeros(), x = nums[i];
    if (!x) return;
    const s = x.semana;
    const sub = d.cia.id + ' · ' + s.n + 'ª semana · ' + s.rotulo + ' ' + N.partes(s.fim).a;
    if (tipo === 'ent' || tipo === 'sai') {
      const g = tipo === 'ent' ? 'entrada' : 'saida';
      const itens = x.mov.todos.filter(e => e.grupo === g);
      abrirModal(tipo === 'ent' ? 'Entradas' : 'Saídas', sub, itens.length ? '<div>' + itens.map(linhaMov).join('') + '</div>' : '<div class="info-linha"><i class="fa-solid fa-circle-info"></i><span>Nenhum requerimento nesta semana.</span></div>');
      return;
    }
    const des = x.des || {};
    const r = des.resultado;
    let corpo = '';
    if (!r) corpo += '<div class="aviso-linha"><i class="fa-solid fa-triangle-exclamation"></i><span>' + esc((des.avisos || []).join(' ') || 'Sem dado desta semana.') + '</span></div>';
    else {
      corpo += '<div class="grid grid-cols-3 gap-2"><div class="kpi"><b class="text-pos">' + r.pos + '</b><span>Positivos</span></div><div class="kpi"><b class="text-neg">' + r.neg + '</b><span>Negativos</span></div><div class="kpi"><b class="text-esp">' + r.esp + '</b><span>Casos especiais</span></div></div>';
      corpo += '<h4 class="mb-1 mt-4 text-[12px] font-semibold uppercase tracking-[.1em] text-musgo">Seções lidas</h4><table class="tabela">' + (r.secoes || []).map(sc => '<tr><td>' + esc(sc.rotulo) + (sc.reserva ? ' <span class="selo selo-aviso">contagem por linha</span>' : '') + '</td><td><span class="selo ' + (sc.classe === 'pos' ? 'selo-ok' : sc.classe === 'neg' ? 'selo-neg' : 'selo-esp') + '">' + N.CLASSE_NOME[sc.classe] + '</span></td><td class="n font-semibold text-texto">' + sc.n + '</td></tr>').join('') + '</table>';
      const au = Object.keys(r.aulas || {});
      if (au.length) corpo += '<h4 class="mb-1 mt-4 text-[12px] font-semibold uppercase tracking-[.1em] text-musgo">Aulas</h4><div class="flex flex-wrap gap-2">' + au.map(k => '<span class="selo selo-neutro !text-[12px]">' + esc(k) + ': <b class="text-texto">' + (r.aulas[k] == null ? 'não achei' : fmtN(r.aulas[k])) + '</b></span>').join('') + '</div>';
      if (des.avisos && des.avisos.length) corpo += '<div class="mt-4 grid gap-2">' + des.avisos.map(a => '<div class="aviso-linha"><i class="fa-solid fa-triangle-exclamation"></i><span>' + esc(a) + '</span></div>').join('') + '</div>';
      if (des.notas && des.notas.length) corpo += '<div class="mt-3 grid gap-2">' + des.notas.map(a => '<div class="info-linha"><i class="fa-solid fa-circle-info"></i><span>' + esc(a) + '</span></div>').join('') + '</div>';
    }
    const links = [];
    if (des.url) links.push('<a class="btn" target="_blank" rel="noopener" href="' + esc(des.url) + '"><i class="fa-solid fa-arrow-up-right-from-square"></i>' + (des.aba ? 'Abrir a planilha (' + esc(des.aba) + ')' : 'Abrir a postagem') + '</a>');
    (des.outras || []).forEach((u, k) => links.push('<a class="btn" target="_blank" rel="noopener" href="' + esc(u) + '">Outra postagem ' + (k + 1) + '</a>'));
    if (links.length) corpo += '<div class="mt-4 flex flex-wrap gap-2">' + links.join('') + '</div>';
    abrirModal(tipo === 'aula' ? 'Aulas da semana' : 'Desempenho da semana', sub, corpo);
  }

  /* ---------- escolhas do auditor ---------- */
  function lerEscolhas() {
    const e = ler(chaveEscolhas(), null);
    S.escolhas = { mov: (e && e.mov) || {}, pessoas: (e && e.pessoas) || {} };
  }
  function salvarEscolhas() { guardar(chaveEscolhas(), S.escolhas); }

  /* ---------- eventos da página ---------- */
  document.addEventListener('click', ev => {
    const alvo = ev.target.closest('[data-acao]');
    if (!alvo) return;
    const acao = alvo.getAttribute('data-acao');
    if (acao === 'fechar-modal') {
      if (alvo.hasAttribute('data-parar')) return;
      if (ev.target.closest('[data-parar]') && !ev.target.closest('button[data-acao="fechar-modal"]')) return;
      fecharModal();
      return;
    }
    if (acao === 'cia') {
      S.cia = alvo.getAttribute('data-id');
      guardar('af-pesquisa:cia', S.cia);
      lerEscolhas();
      S.dados = null; S.filtro = 'todos';
      renderResultado();
      return;
    }
    if (acao === 'mes') {
      const delta = +alvo.getAttribute('data-delta');
      let m = S.mes + delta, a = S.ano;
      if (m < 0) { m = 11; a--; } else if (m > 11) { m = 0; a++; }
      if (mesmoOuDepois(a, m)) return;
      S.ano = a; S.mes = m;
      guardar('af-pesquisa:mes', { ano: a, mes: m });
      lerEscolhas();
      S.dados = null; S.filtro = 'todos';
      renderResultado();
      return;
    }
    if (acao === 'coletar') { coletar(alvo.getAttribute('data-forcar') === '1'); return; }
    if (acao === 'filtro') { S.filtro = alvo.getAttribute('data-valor'); renderResultado(); return; }
    if (acao === 'detalhe') { detalhe(alvo.getAttribute('data-tipo'), +alvo.getAttribute('data-semana')); return; }
    if (acao === 'mov') {
      const id = alvo.getAttribute('data-id');
      const e = (S.dados.movimentos || []).find(x => x.id === id);
      if (!e) return;
      const novo = !incluido(e);
      if (novo === !!e.contaPadrao) delete S.escolhas.mov[id]; else S.escolhas.mov[id] = novo;
      salvarEscolhas();
      const abertoModal = !$('modal').hidden;
      renderResultado();
      if (abertoModal) { const ref = $('modal').querySelector('[data-acao="mov"][data-id="' + CSS.escape(id) + '"]'); if (ref) { ref.setAttribute('aria-checked', String(novo)); const item = ref.closest('[data-item]'); if (item) item.classList.toggle('opacity-60', !novo); } }
      return;
    }
    if (acao === 'pessoa') {
      const k = alvo.getAttribute('data-chave'), campo = alvo.getAttribute('data-campo');
      const p = S.dados.lid.lista.find(x => x.id === k);
      if (!p) return;
      const atual = pessoaOpc(p);
      const novo = Object.assign({}, S.escolhas.pessoas[k] || {}, { [campo]: !atual[campo] });
      S.escolhas.pessoas[k] = novo;
      salvarEscolhas();
      aplicarMesInteiro(p, S.dados);
      renderResultado();
      return;
    }
    if (acao === 'copiar') {
      const bloco = alvo.getAttribute('data-bloco');
      const txt = blocoTSV(bloco);
      if (!txt) { toast('Nada para copiar.', 'erro'); return; }
      copiar(txt).then(ok => toast(ok ? 'Copiado. Cole na primeira célula do bloco na planilha.' : 'Não consegui copiar.', ok ? '' : 'erro'));
    }
  });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('modal').hidden) fecharModal(); });

  window.AfPesquisa = { S, coletar, calcular, numeros, pontos, blocoTSV };
  iniciar();
})();