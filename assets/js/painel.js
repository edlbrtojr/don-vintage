/* Painel administrativo — SPA por hash (#inicio, #agenda, ...). Lê catálogo de window.DV e
   os dados da demo de window.DVP (painel-dados.js). Tudo em memória: recarregar a página volta ao início. */
(function () {
  'use strict';
  const DV = window.DV, P = window.DVP;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = v => DV.fmt.brl(v || 0);
  const brl0 = v => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const pct = (v, d = 0) => ((v || 0) * 100).toLocaleString('pt-BR', { maximumFractionDigits: d }) + '%';
  const nf = (v, d = 1) => (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
  const ini = n => DV.fmt.initials(n);
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const CLUB = DV.business.clubName || 'Assinatura';
  const PLAN = P.plans.find(p => p.highlight) || P.plans[0];
  const COMBO = P.svc['corte+barba'];
  const MES = P.today.toLocaleDateString('pt-BR', { month: 'long' });
  const MES_ANT = new Date(P.today.getFullYear(), P.today.getMonth() - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
  const fDay = d => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
  const agoTxt = a => a == null ? '—' : a === 0 ? 'hoje' : a === 1 ? 'ontem' : `há ${a} dias`;
  const unitName = id => (P.unitById[id] || {}).name || '';
  const bookLink = () => { try { return new URL(DV.links.agendar || 'agendar.html', location.href).href; } catch (e) { return DV.links.agendar; } };

  const METHOD = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro', plano: CLUB, assinatura: CLUB, boleto: 'Boleto' };
  const STATUS = { confirmado: ['Confirmado', 'info'], atendimento: ['Em atendimento', 'brass'], concluido: ['Concluído', 'ok'], faltou: ['Faltou', 'bad'] };
  const SUBST = { confirmado: ['Confirmado', 'ok'], pendente: ['Pendente', 'warn'], vencido: ['Vencido', 'bad'] };

  const ICONS = {
    home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
    calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
    users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    scissors: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12',
    crown: 'M3 18h18M3 7l4.5 5L12 5l4.5 7L21 7l-2 11H5z',
    wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M17 14h.01',
    box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
    gear: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    more: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
    check: 'M20 6L9 17l-5-5',
    x: 'M18 6L6 18M6 6l12 12',
    chev: 'M9 18l6-6-6-6',
    chevd: 'M6 9l6 6 6-6',
    msg: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z',
    alert: 'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
    send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
    coffee: 'M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 2v3M10 2v3M14 2v3',
    pin: 'M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z',
    pix: 'M12 2l10 10-10 10L2 12z',
    card: 'M2 5h20v14H2zM2 10h20',
    cash: 'M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    down: 'M12 5v14M19 12l-7 7-7-7',
    up: 'M12 19V5M5 12l7-7 7 7',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8',
    copy: 'M9 9h13v13H9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    ext: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
    refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
    login: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
    userx: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM18 8l5 5M23 8l-5 5',
  };
  const ic = (n, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true"><path d="${ICONS[n] || ''}"/></svg>`;
  const chip = (t, tone = '') => `<span class="chip ${tone}">${t}</span>`;
  const avatar = (name, s) => `<span class="avatar"${s ? ` style="--s:${s}px"` : ''}>${esc(ini(name))}</span>`;
  // Barbeiros têm foto real (data.js); clientes fictícios ficam com iniciais.
  const bAvatar = (b, s) => b.photo ? `<span class="avatar"${s ? ` style="--s:${s}px"` : ''}><img src="${esc(b.photo)}" alt="" loading="lazy"></span>` : avatar(b.name, s);
  const kpi = (label, icon, v, s, tone = '') => `<div class="card kpi ${tone}"><span class="label">${ic(icon)}${label}</span><span class="v">${v}</span>${s ? `<span class="s">${s}</span>` : ''}</div>`;
  const bar = (v, tone = '') => `<div class="bar ${tone}"><i style="width:${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%"></i></div>`;
  const unitLabel = () => P.S.unit === 'all' ? 'Todas as unidades' : `Unidade ${unitName(P.S.unit)}`;
  function withUnit(u, fn) { const old = P.S.unit; P.S.unit = u; try { return fn(); } finally { P.S.unit = old; } }
  const mqDesk = window.matchMedia('(min-width: 960px)');

  /* ---------- Rotas ---------- */
  const ROUTES = {
    inicio: { t: 'Início', i: 'home', v: vInicio },
    agenda: { t: 'Agenda', i: 'calendar', v: vAgenda },
    clientes: { t: 'Clientes', i: 'users', v: vClientes },
    assinaturas: { t: CLUB, i: 'crown', v: vAssin, short: 'Club', star: true },
    barbeiros: { t: 'Barbeiros', i: 'scissors', v: vBarbeiros },
    financeiro: { t: 'Financeiro', i: 'wallet', v: vFin },
    estoque: { t: 'Estoque', i: 'box', v: vEstoque },
    config: { t: 'Configurações', i: 'gear', v: vConfig },
  };
  // As 4 telas que o dono abre todo dia ficam na barra; o resto vai para "Mais".
  const MAIN = ['inicio', 'agenda', 'clientes', 'assinaturas'];
  let cur = 'inicio', params = new URLSearchParams(), after = [];
  const view = $('#view');

  function nav() {
    $('#sideNav').innerHTML = Object.entries(ROUTES).map(([k, r]) => `<a href="#${k}" data-r="${k}">${ic(r.i)}<span>${esc(r.t)}</span>${r.star ? '<span class="tag">Carro-chefe</span>' : ''}</a>`).join('');
    $('#bnav').innerHTML = MAIN.map(k => `<a href="#${k}" data-r="${k}" class="${ROUTES[k].star ? 'star' : ''}">${ic(ROUTES[k].i)}<span>${esc(ROUTES[k].short || ROUTES[k].t)}</span></a>`).join('') +
      `<button type="button" data-act="more" data-r="mais">${ic('more')}<span>Mais</span></button>`;
    const sel = () => `<span class="unit-wrap"><select class="unit-select" data-unit aria-label="Unidade"><option value="all">Todas as unidades</option>${P.units.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select>${ic('chevd')}</span>`;
    $('.top .logo').insertAdjacentHTML('afterend', sel());
    $('.side-logo').insertAdjacentHTML('afterend', sel());
  }
  function markNav() {
    const inMore = !MAIN.includes(cur);
    document.querySelectorAll('[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === cur || (a.dataset.r === 'mais' && inMore)));
    document.querySelectorAll('[data-unit]').forEach(s => { s.value = P.S.unit; });
  }
  function render(keep) {
    const y = window.scrollY;
    const r = ROUTES[cur];
    after = [];
    view.innerHTML = r.v(params);
    document.title = `${r.t} · Painel Don Vintage`;
    $('#topTitle').textContent = r.t;
    markNav();
    after.forEach(f => f());
    if (keep) window.scrollTo(0, y);
    const n = alerts().filter(a => a.tone === 'bad' || a.tone === 'warn').length;
    $('#alertDot').textContent = n ? ' ' : '';
  }
  let entered = false;
  function onRoute() {
    const [n, q] = location.hash.slice(1).split('?');
    cur = ROUTES[n] ? n : 'inicio';
    params = new URLSearchParams(q || '');
    closeSheet();
    entered = true;
    render();
    window.scrollTo(0, 0);
  }
  function refresh() { render(true); if (sheetFn) $('#sheetBody').innerHTML = sheetFn(); }

  /* ---------- Sheet ---------- */
  let sheetFn = null;
  function openSheet(title, fn) {
    sheetFn = fn;
    $('#sheetTitle').textContent = title;
    $('#sheetBody').innerHTML = fn();
    const w = $('#sheet'); w.hidden = false;
    $('.sheet', w).scrollTop = 0;
    document.body.classList.add('lock');
  }
  function closeSheet() { sheetFn = null; $('#sheet').hidden = true; document.body.classList.remove('lock'); apptMode = null; }
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.innerHTML = ic('check') + `<span>${msg}</span>`; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------- Alertas ---------- */
  function alerts() {
    const out = [];
    const ss = P.subsStats();
    if (ss.late) out.push({ tone: 'bad', icon: 'alert', t: `${ss.late} assinante${ss.late > 1 ? 's' : ''} com cobrança atrasada`, d: `${brl(ss.lateV)} em aberto no ${CLUB} · plano bloqueado até pagar`, href: '#assinaturas?f=vencido' });
    const low = P.products.filter(p => P.stockOf(p) < P.minOf(p));
    low.slice(0, 2).forEach(p => out.push({ tone: 'warn', icon: 'box', t: `${p.name} abaixo do mínimo`, d: `${P.stockOf(p)} em estoque · mínimo ${P.minOf(p)}`, href: '#estoque' }));
    if (low.length > 2) out.push({ tone: 'warn', icon: 'box', t: `Mais ${low.length - 2} produto${low.length > 3 ? 's' : ''} para repor`, d: low.slice(2).map(p => p.name).join(', '), href: '#estoque' });
    const cl = P.clients.filter(c => P.inU(c.unit));
    const lapsed = cl.filter(c => P.clientStats(c).lapsed && !c.campaignAt).length;
    if (lapsed) out.push({ tone: 'info', icon: 'msg', t: `${lapsed} clientes sem voltar há 45+ dias`, d: 'Enviar campanha de retorno no WhatsApp', act: 'campaign', aud: 'sumidos' });
    const week = cl.filter(c => c.birth.m === P.today.getMonth() && c.birth.d >= P.D && c.birth.d <= P.D + 7 && !c.campaignAt).length;
    if (week) out.push({ tone: 'brass', icon: 'gift', t: `${week} aniversariantes nesta semana`, d: 'Mandar parabéns com cupom', act: 'campaign', aud: 'bday' });
    const due = P.bills.filter(b => P.inU(b.u) && !b.paid && b.due - P.D <= 3);
    if (due.length) out.push({ tone: 'warn', icon: 'file', t: `${due.length} conta${due.length > 1 ? 's' : ''} vence${due.length > 1 ? 'm' : ''} em até 3 dias`, d: brl(sum(due, b => b.value)), href: '#financeiro' });
    return out;
  }
  const alertRows = list => list.length ? list.map(a => {
    const inner = `<span class="ico-b ${a.tone}">${ic(a.icon)}</span><span class="grow"><span class="t" style="white-space:normal">${esc(a.t)}</span><span class="d" style="white-space:normal">${esc(a.d)}</span></span>${ic('chev', 'chev')}`;
    return a.href ? `<a class="row" href="${a.href}">${inner}</a>` : `<button class="row" data-act="${a.act}" data-aud="${a.aud}">${inner}</button>`;
  }).join('') : `<p class="empty">Tudo em ordem por aqui.</p>`;

  /* ---------- Início ---------- */
  function vInicio() {
    const m = P.monthStats(), d = P.dayStats(), ss = P.subsStats(), prev = P.prevPeriod();
    const cur2 = m.serv + m.prod;
    const delta = prev ? cur2 / prev - 1 : 0;
    const h = new Date().getHours();
    const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const owner = DV.business.owner || DV.business.ownerName;
    const next = P.apptsU().filter(a => a.status === 'confirmado' || a.status === 'atendimento').sort((a, b) => a.start - b.start).slice(0, 5);
    const nx = next.find(a => a.status === 'confirmado');
    const al = alerts();
    after.push(drawChart);
    return `
    <section class="hello">
      <p class="eyebrow">${esc(P.today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))} · ${esc(unitLabel())}</p>
      <h1 class="display">${greet}${owner ? ', ' + esc(owner) : ''}.</h1>
      <p class="muted"><span class="live">Agora ${P.hhmm(P.NOW)}</span> · ${d.inService} em atendimento${nx ? ` · próximo às ${P.hhmm(nx.start)} com ${esc(P.barberById[nx.b].name)}` : ''}</p>
    </section>
    <div class="kpis k4">
      ${kpi('Faturamento hoje', 'wallet', brl0(d.total), `${d.done} atendimentos concluídos`, 'brass')}
      ${kpi('Faturamento do mês', 'trend', brl0(m.receita), `<span class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${pct(Math.abs(delta), 1)}</span> vs. ${MES_ANT} (serviços e produtos)`)}
      ${kpi('Atendimentos hoje', 'scissors', `${d.done}<span class="muted" style="font-size:.6em"> / ${d.booked}</span>`, `${m.atend} no mês · ${d.faltas} falta${d.faltas === 1 ? '' : 's'} hoje`)}
      ${kpi('Ticket médio', 'card', brl(m.ticket), `Avulso, no mês · hoje ${brl(d.ticket)}`)}
      ${kpi('Ocupação hoje', 'clock', pct(d.occ), bar(d.occ, d.occ > .85 ? 'ok' : ''))}
      ${kpi(`MRR ${esc(CLUB)}`, 'crown', brl0(ss.mrr), `${ss.n} assinantes ativos`, 'brass')}
      ${kpi('Inadimplência', 'alert', brl0(ss.lateV), `${ss.late} cobranças vencidas · ${pct(ss.mrr ? ss.lateV / ss.mrr : 0, 1)} do MRR`, ss.late ? 'bad' : '')}
      ${kpi('Resultado do mês', 'zap', brl0(m.lucro), `Margem ${pct(m.receita ? m.lucro / m.receita : 0)} · ver DRE`)}
    </div>

    ${P.units.length > 1 ? `<section class="mt">
      <div class="sec-t"><h2>Comparativo das unidades</h2><span class="small muted">Toque para filtrar</span></div>
      <div class="units">${unitCards()}</div>
    </section>` : ''}

    <div class="g-main mt">
      <div class="stack">
        <section class="card">
          <div class="card-t"><h3>Faturamento · últimos 30 dias</h3><span class="chip">Serviços + produtos</span></div>
          <div class="readout" id="readout"></div>
          <div class="chart" id="chart"></div>
        </section>
        <section class="card">
          <div class="card-t"><h3>Próximos atendimentos</h3><a class="link" href="#agenda">Ver agenda</a></div>
          <div class="list">${next.length ? next.map(apptRow).join('') : '<p class="empty">Sem mais atendimentos hoje.</p>'}</div>
        </section>
      </div>
      <div class="stack">
        <section class="card">
          <div class="card-t"><h3>Alertas</h3>${chip(String(al.length), al.length ? 'warn' : 'ok')}</div>
          <div class="list">${alertRows(al)}</div>
        </section>
        <section class="card">
          <div class="card-t"><h3>Mês em números</h3><a class="link" href="#financeiro">DRE</a></div>
          ${miniDre(m)}
        </section>
        <section class="card">
          <div class="card-t"><h3>Ranking da equipe</h3><a class="link" href="#barbeiros">Comissões</a></div>
          <div class="list">${P.barbersU().map(b => [b, m.per[b.id]]).sort((a, b) => (b[1].fat + b[1].subVal) - (a[1].fat + a[1].subVal)).slice(0, 5).map(([b, x], i) => `
            <button class="row" data-act="barber" data-id="${b.id}"><span class="time">${i + 1}º</span>${bAvatar(b, 36)}<span class="grow"><span class="t">${esc(b.name)}</span><span class="d">${x.n} atendimentos · ${esc(unitName(b.unit))}</span></span><span class="end num">${brl0(x.fat)}</span></button>`).join('')}</div>
        </section>
      </div>
    </div>`;
  }
  function unitCards() {
    return P.units.map(u => {
      const m = withUnit(u.id, P.monthStats), d = withUnit(u.id, P.dayStats), s = withUnit(u.id, P.subsStats);
      const occ = P.occOf(u.id);
      return `<button class="unit ${P.S.unit === u.id ? 'on' : ''}" data-act="unit" data-id="${u.id}">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><h4>${esc(u.name)}</h4><span class="stars">★ ${nf(u.rating)} <span class="muted">(${u.reviewsCount || 0})</span></span></div>
        <div class="mini"><div><span class="label">Mês</span><b>${brl0(m.receita)}</b></div><div><span class="label">Hoje</span><b>${brl0(d.total)}</b></div><div><span class="label">${esc(CLUB)}</span><b>${s.n}</b></div></div>
        <div><div style="display:flex;justify-content:space-between" class="small"><span class="muted">Ocupação hoje</span><b>${pct(occ)}</b></div>${bar(occ)}</div>
      </button>`;
    }).join('');
  }
  function miniDre(m) {
    const line = (l, v, cls = '') => `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line-soft)" class="${cls}"><span class="muted">${l}</span><b class="num">${brl0(v)}</b></div>`;
    return line('Receita bruta', m.receita) + line('Comissões', -m.comm) + line('Despesas + CMV + taxas', -(m.exp + m.cmv + m.fees)) +
      `<div style="display:flex;justify-content:space-between;padding-top:10px"><b>Resultado</b><b class="num ${m.lucro >= 0 ? 'up' : 'down'}" style="font-size:20px">${brl0(m.lucro)}</b></div>`;
  }
  function apptRow(a) {
    const c = P.clientById[a.c], s = P.svc[a.s], st = STATUS[a.status];
    return `<button class="row" data-act="appt" data-id="${a.id}"><span class="time">${P.hhmm(a.start)}<small>${P.svc[a.s].durationMin} min</small></span>${avatar(c.name, 38)}
      <span class="grow"><span class="t">${esc(c.name)}</span><span class="d">${esc(s.name)} · ${esc(P.barberById[a.b].name)}${P.S.unit === 'all' ? ' · ' + esc(unitName(a.u)) : ''}</span></span>
      <span class="end chips" style="flex-direction:column;align-items:flex-end">${a.status === 'atendimento' ? chip(st[0], st[1]) : ''}${c.sub ? chip(ic('crown') + 'Club', c.sub.status === 'vencido' ? 'bad' : 'brass') : ''}</span></button>`;
  }

  // Gráfico SVG desenhado na largura real do contêiner (texto legível no celular e no desktop).
  let chartSel = null;
  function drawChart() {
    const host = $('#chart'); if (!host) return;
    const data = P.series30();
    const W = Math.max(280, host.clientWidth), H = 190, pl = 44, pb = 22, pt = 8;
    const max = Math.max(1, ...data.map(x => x.v));
    const step = [500, 1000, 2000, 2500, 5000, 10000, 20000].find(s => max / s <= 4) || 50000;
    const top = Math.ceil(max / step) * step;
    const y = v => pt + (H - pt - pb) * (1 - v / top);
    const bw = (W - pl) / data.length;
    const open = data.filter(x => x.open);
    const avg = open.length ? sum(open.slice(0, -1), x => x.v) / Math.max(1, open.length - 1) : 0;
    let g = '';
    for (let v = 0; v <= top; v += step) g += `<line class="grid-l" x1="${pl}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v >= 1000 ? nf(v / 1000) + ' mil' : v}</text>`;
    const bars = data.map((x, i) => {
      const hh = Math.max(x.open ? 2 : 1, y(0) - y(x.v));
      return `<rect class="bar-r ${x.ago === 0 ? 'today' : ''} ${chartSel === i ? 'sel' : ''}" data-i="${i}" x="${(pl + i * bw + bw * .16).toFixed(1)}" y="${(y(0) - hh).toFixed(1)}" width="${(bw * .68).toFixed(1)}" height="${hh.toFixed(1)}" rx="2"/>`;
    }).join('');
    const labels = data.map((x, i) => (data.length - 1 - i) % 7 === 0 ? `<text x="${pl + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${x.ago === 0 ? 'hoje' : x.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</text>` : '').join('');
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Faturamento diário dos últimos 30 dias">${g}<line class="avg" x1="${pl}" x2="${W}" y1="${y(avg)}" y2="${y(avg)}"/>${bars}${labels}</svg>`;
    const tot = sum(data, x => x.v);
    const show = i => {
      const ro = $('#readout'); if (!ro) return;
      if (i == null) { ro.innerHTML = `<b>${brl0(tot)}</b><span class="muted small">em 30 dias · média ${brl0(avg)} por dia aberto (linha tracejada)</span>`; return; }
      const x = data[i];
      ro.innerHTML = `<b>${brl0(x.v)}</b><span class="muted small">${esc(fDay(x.date))}${x.ago === 0 ? ' · parcial' : ''}${x.open ? '' : ' · fechado'}</span>`;
    };
    show(chartSel);
    host.onclick = host.onmouseover = e => {
      const r = e.target.closest('rect[data-i]'); if (!r) return;
      chartSel = +r.dataset.i; host.querySelectorAll('.bar-r').forEach(b => b.classList.toggle('sel', b === r)); show(chartSel);
    };
  }

  /* ---------- Agenda ---------- */
  let agB = null;
  function vAgenda() {
    const bars = P.barbersU();
    const d = P.dayStats();
    if (!bars.find(b => b.id === agB)) agB = bars[0] && bars[0].id;
    const desk = mqDesk.matches;
    const list = desk ? bars : bars.filter(b => b.id === agB);
    if (entered) { entered = false; after.push(scrollToNow); }
    const cnt = id => P.appts.filter(a => a.b === id && a.status !== 'faltou').length;
    return `
    <div class="ph"><div><p class="eyebrow">${esc(P.today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h1 class="display">Agenda de hoje</h1>
      <p class="sub">${d.booked} agendamentos · ${d.done} concluídos · ocupação ${pct(d.occ)} · ${esc(unitLabel())}</p></div>
      <div class="ph-act"><button class="btn btn-primary btn-sm" data-act="newAppt">${ic('plus')}Novo agendamento</button></div></div>
    <div class="legend">${Object.entries(STATUS).map(([k, v]) => `<span class="st-${k}"><i></i>${v[0]}</span>`).join('')}<span><i style="background:var(--line)"></i>Bloqueio / intervalo</span><span>${ic('crown')} ${esc(CLUB)}</span></div>
    ${desk ? '' : `<div class="seg" role="tablist">${bars.map(b => `<button class="${b.id === agB ? 'on' : ''}" data-act="pickB" data-id="${b.id}" role="tab" aria-selected="${b.id === agB}">${bAvatar(b)}${esc(b.name)} <span class="n">${cnt(b.id)}</span></button>`).join('')}</div>`}
    ${list.length ? timeline(list) : '<p class="empty">Nenhum barbeiro nesta unidade.</p>'}`;
  }
  function scrollToNow() {
    const nl = $('.tl-col .now-line'); if (!nl) return;
    const top = nl.getBoundingClientRect().top + window.scrollY - (mqDesk.matches ? 160 : 260);
    if (top > 200) setTimeout(() => window.scrollTo({ top, behavior: 'smooth' }), 60);
  }
  function timeline(list) {
    const ppm = mqDesk.matches ? 1.8 : 3; // 3px/min no celular: bloco de 15 min ≈ 45px, alvo de toque confortável
    const OFF = 12;
    const span = P.CLOSE - P.OPEN;
    const Hh = span * ppm + OFF * 2;
    const y = m => OFF + (m - P.OPEN) * ppm;
    let axis = '';
    for (let m = Math.ceil(P.OPEN / 60) * 60; m <= P.CLOSE; m += 60) axis += `<span style="top:${y(m)}px">${P.hhmm(m)}</span>`;
    const nowL = P.NOW > P.OPEN && P.NOW < P.CLOSE ? `<div class="now-line" style="top:${y(P.NOW)}px" data-t="${P.hhmm(P.NOW)}"></div>` : '';
    const heads = list.map(b => {
      const n = P.appts.filter(a => a.b === b.id && a.status !== 'faltou').length;
      return `<div class="tl-head">${bAvatar(b)}<div style="min-width:0"><b>${esc(b.name)}</b><small>${n} hoje · ${esc(unitName(b.unit))}</small></div></div>`;
    }).join('');
    const cols = list.map(b => {
      const evs = P.appts.filter(a => a.b === b.id).sort((a, z) => a.start - z.start).map(a => {
        const c = P.clientById[a.c], s = P.svc[a.s];
        const h = (a.end - a.start) * ppm - 3;
        const compact = h < 50;
        return `<button class="ev st-${a.status} ${compact ? 'compact' : ''}" style="top:${y(a.start)}px;height:${h}px" data-act="appt" data-id="${a.id}" aria-label="${esc(c.name)}, ${P.hhmm(a.start)}, ${esc(STATUS[a.status][0])}">
          <span class="ev-t">${P.hhmm(a.start)}${compact ? '' : ' – ' + P.hhmm(a.end)}</span><b>${esc(c.name)}</b>${compact ? '' : `<span class="ev-s">${esc(s.name)}${a.status === 'concluido' ? ' · ' + (a.price ? brl(a.price) : 'plano') : ''}</span>`}${c.sub ? ic('crown', 'vc') : ''}</button>`;
      }).join('');
      const blks = P.blocks.filter(x => x.b === b.id).map(x => `<div class="blk" style="top:${y(x.start)}px;height:${(x.end - x.start) * ppm - 3}px">${ic(x.kind === 'intervalo' ? 'coffee' : 'lock')}${esc(x.label)} · ${P.hhmm(x.start)}–${P.hhmm(x.end)}</div>`).join('');
      return `<div class="tl-col" style="height:${Hh}px;background-size:100% ${60 * ppm}px;background-position:0 ${OFF + ((60 - P.OPEN % 60) % 60) * ppm}px">${blks}${evs}${nowL}</div>`;
    }).join('');
    return `<div class="tl-scroll"><div class="tl ${list.length === 1 ? 'one' : ''}" style="--cols:${list.length}"><div class="tl-head"></div>${heads}<div class="tl-axis" style="height:${Hh}px">${axis}</div>${cols}</div></div>`;
  }

  let apptMode = null;
  function apptBody(id) {
    const a = P.appts.find(x => x.id === id); if (!a) return '';
    const c = P.clientById[a.c], s = P.svc[a.s], b = P.barberById[a.b], st = c.sub;
    const cs = P.clientStats(c);
    const plan = P.planById[c.plan];
    const covered = !!(st && P.covers(plan, s));
    const blocked = covered && st.status === 'vencido';
    const usesPlan = P.planCovers(c, s);
    const price = a.status === 'concluido' ? a.price : (usesPlan ? 0 : P.priceFor(c, s));
    const sst = STATUS[a.status];
    if (apptMode === 'pay') {
      return `<div class="who">${avatar(c.name)}<div><h3>${esc(c.name)}</h3><p class="muted small">${esc(s.name)} · ${esc(b.name)}</p></div></div>
        <div class="card card-hl" style="text-align:center"><span class="label">Total a cobrar</span><div class="num" style="font-size:38px;color:var(--brass)">${brl(price)}</div>${usesPlan ? `<p class="small muted">Coberto pelo ${esc(CLUB)} · comissão de assinatura sobre ${brl(s.price * P.SUB_REF)}</p>` : (st && !blocked ? `<p class="small muted">10% OFF de assinante aplicado</p>` : '')}</div>
        <div class="pay">
          ${usesPlan ? `<button class="wide" data-act="pay" data-id="${a.id}" data-m="plano">${ic('crown')}Registrar uso do ${esc(CLUB)}<small>R$ 0,00 no caixa · baixa automática</small></button>` : ''}
          ${usesPlan ? '' : `<button data-act="pay" data-id="${a.id}" data-m="pix">${ic('pix')}Pix<small>QR na tela</small></button>
          <button data-act="pay" data-id="${a.id}" data-m="cartao">${ic('card')}Cartão<small>Débito ou crédito</small></button>
          <button data-act="pay" data-id="${a.id}" data-m="dinheiro">${ic('cash')}Dinheiro<small>Troco calculado</small></button>
          <button data-act="charge0" data-id="${a.id}">${ic('x')}Voltar<small>Não cobrar agora</small></button>`}
        </div>
        ${usesPlan ? `<button class="btn btn-ghost btn-block" data-act="charge0">Voltar</button>` : ''}`;
    }
    const actions = {
      confirmado: `<button class="btn btn-primary" data-act="checkin" data-id="${a.id}">${ic('login')}Check-in</button><button class="btn btn-ok" data-act="charge" data-id="${a.id}">${ic('check')}Concluir e cobrar</button><button class="btn btn-ghost" data-act="wa" data-k="lembrete" data-id="${a.id}">${ic('msg')}WhatsApp</button><button class="btn btn-ghost" data-act="noshow" data-id="${a.id}">${ic('userx')}Faltou</button>`,
      atendimento: `<button class="btn btn-ok" data-act="charge" data-id="${a.id}">${ic('check')}Concluir e cobrar</button><button class="btn btn-ghost" data-act="wa" data-k="lembrete" data-id="${a.id}">${ic('msg')}WhatsApp</button>`,
      concluido: `<button class="btn btn-ghost" data-act="wa" data-k="pos" data-id="${a.id}">${ic('star')}Pedir avaliação no WhatsApp</button>`,
      faltou: `<button class="btn btn-primary" data-act="wa" data-k="falta" data-id="${a.id}">${ic('msg')}Remarcar pelo WhatsApp</button>`,
    }[a.status];
    return `<div class="who">${avatar(c.name)}<div style="min-width:0"><h3>${esc(c.name)}</h3><p class="muted small">${esc(c.phone)} · ${esc(unitName(a.u))}</p>
        <div class="chips" style="margin-top:6px">${chip(sst[0], sst[1])}${st ? chip(ic('crown') + esc(CLUB), blocked ? 'bad' : 'brass') : ''}${cs.vip ? chip('VIP', 'warn') : ''}${a.isNew ? chip('Encaixe', 'info') : ''}</div></div></div>
      <div class="kv">
        <div><span class="label">Serviço</span><b>${esc(s.name)}</b></div>
        <div><span class="label">Horário</span><b>${P.hhmm(a.start)} – ${P.hhmm(a.end)}</b></div>
        <div><span class="label">Barbeiro</span><b>${esc(b.name)}</b></div>
        <div><span class="label">${a.status === 'concluido' ? 'Pago' : 'Valor'}</span><b>${price ? brl(price) : 'R$ 0,00 · plano'}${a.status === 'concluido' ? ' · ' + METHOD[a.method] : ''}</b></div>
      </div>
      ${blocked && a.status !== 'concluido' ? `<div class="note bad">${ic('lock')}<div><b>Plano bloqueado: cobrança vencida há ${P.D - st.dueDay} dias.</b><br>O Asaas avisou o painel (webhook de atraso) e o uso do ${esc(CLUB)} fica suspenso até o pagamento. Hoje sai como avulso, ou reenvie a cobrança.</div></div>
        <div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="resend" data-id="${c.id}">${ic('send')}${st.resentAt ? 'Reenviada' : 'Reenviar cobrança'}</button><button class="btn btn-ghost btn-sm" data-act="webhook" data-id="${c.id}">${ic('zap')}Simular pagamento</button></div>` : ''}
      ${usesPlan && a.status !== 'concluido' ? `<div class="note ok">${ic('crown')}<div>Coberto pelo ${esc(CLUB)} (pagamento confirmado no Asaas). Entra R$ 0 no caixa e gera comissão de assinatura sobre ${brl(s.price * P.SUB_REF)}.</div></div>` : ''}
      <div class="kv k3">
        <div><span class="label">Visitas</span><b>${cs.n}</b></div>
        <div><span class="label">Última</span><b>${agoTxt(cs.lastAgo === 0 && a.status !== 'concluido' ? null : cs.lastAgo)}</b></div>
        <div><span class="label">Frequência</span><b>${cs.freq ? `${cs.freq} dias` : '—'}</b></div>
      </div>
      <div class="btn-row">${actions}</div>
      <button class="link" data-act="client" data-id="${c.id}">Ver ficha completa do cliente →</button>`;
  }
  const openAppt = id => { apptMode = null; openSheet('Atendimento', () => apptBody(id)); };

  /* ---------- Novo agendamento ---------- */
  let na = null;
  function openNew(name) {
    const b = (P.barbersU().find(x => x.id === agB) || P.barbersU()[0] || P.barbers[0]);
    na = { name: name || '', b: b.id, s: 'corte', t: null };
    openSheet('Novo agendamento', newBody);
  }
  function newBody() {
    const bars = P.barbersU().length ? P.barbersU() : P.barbers;
    const b = P.barberById[na.b];
    const svcs = P.SERVICES.filter(s => P.offers(b, s.id));
    if (!svcs.find(s => s.id === na.s)) na.s = svcs[0].id;
    const s = P.svc[na.s];
    const slots = P.freeSlots(b.id, s.durationMin);
    if (!slots.includes(na.t)) na.t = slots[0] || null;
    const match = P.clients.find(c => P.norm(c.name) === P.norm(na.name).trim());
    return `<div class="form">
      <label class="field"><span class="label">Cliente</span><input class="input" list="dlCli" data-input="naName" value="${esc(na.name)}" placeholder="Nome do cliente" autocomplete="off"></label>
      <datalist id="dlCli">${P.clients.filter(c => P.inU(c.unit)).slice(0, 400).map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>
      <p class="small muted" id="naHint">${match ? `Cliente cadastrado${match.sub ? ` · assinante ${esc(CLUB)}` : ''}` : na.name ? 'Novo cliente — será cadastrado agora' : 'Digite para buscar na base'}</p>
      <label class="field"><span class="label">Barbeiro</span><select class="input" data-change="naB">${bars.map(x => `<option value="${x.id}" ${x.id === na.b ? 'selected' : ''}>${esc(x.name)} · ${esc(unitName(x.unit))}</option>`).join('')}</select></label>
      <label class="field"><span class="label">Serviço</span><select class="input" data-change="naS">${svcs.map(x => `<option value="${x.id}" ${x.id === na.s ? 'selected' : ''}>${esc(x.name)} · ${brl(x.price)} · ${DV.fmt.dur(x.durationMin)}</option>`).join('')}</select></label>
      <label class="field"><span class="label">Horário livre hoje</span><select class="input" data-change="naT">${slots.length ? slots.map(t => `<option value="${t}" ${t === na.t ? 'selected' : ''}>${P.hhmm(t)}</option>`).join('') : '<option>Sem horários livres hoje</option>'}</select></label>
      <button class="btn btn-primary btn-block" data-act="saveAppt" ${slots.length ? '' : 'disabled'}>${ic('check')}Agendar e enviar confirmação</button>
      <p class="small muted">A confirmação vai automática pelo WhatsApp, com lembrete 2h antes.</p></div>`;
  }

  /* ---------- Clientes ---------- */
  let cf = 'todos', cq = '', cLim = 40;
  const tagsOf = (c, st) => {
    const t = [];
    if (c.sub) t.push(c.sub.status === 'vencido' ? ['Club bloqueado', 'bad'] : [CLUB, 'brass']);
    if (st.vip) t.push(['VIP', 'warn']);
    if (st.lapsed) t.push(['Sumido', 'bad']);
    if (st.bday) t.push(['Aniversário ' + String(c.birth.d).padStart(2, '0') + '/' + String(c.birth.m + 1).padStart(2, '0'), 'info']);
    if (st.isNew) t.push(['Novo', 'ok']);
    if (c.campaignAt) t.push(['Campanha enviada', 'info']);
    return t;
  };
  const FILTERS = [['todos', 'Todos'], ['assinantes', 'Assinantes'], ['sumidos', 'Sumidos 45+ dias'], ['aniver', `Aniversariantes de ${MES}`], ['vip', 'VIP']];
  function filterClients(f, q) {
    let l = P.clients.filter(c => P.inU(c.unit));
    const st = c => P.clientStats(c);
    if (f === 'assinantes') l = l.filter(c => c.sub);
    if (f === 'sumidos') l = l.filter(c => st(c).lapsed);
    if (f === 'aniver') l = l.filter(c => st(c).bday);
    if (f === 'vip') l = l.filter(c => st(c).vip);
    if (q) { const n = P.norm(q).trim(), dg = q.replace(/\D/g, ''); l = l.filter(c => P.norm(c.name).includes(n) || (dg.length > 2 && c.phone.replace(/\D/g, '').includes(dg))); }
    const k = { sumidos: c => -st(c).lastAgo, aniver: c => c.birth.d, vip: c => -st(c).ltv }[f] || (c => st(c).lastAgo == null ? 999 : st(c).lastAgo);
    return l.slice().sort((a, b) => k(a) - k(b));
  }
  function clientRows() {
    const l = filterClients(cf, cq);
    if (!l.length) return '<p class="empty">Nenhum cliente encontrado.</p>';
    return l.slice(0, cLim).map(c => {
      const st = P.clientStats(c);
      const tg = tagsOf(c, st).slice(0, 2);
      return `<button class="crow" data-act="client" data-id="${c.id}">${avatar(c.name)}
        <span class="nm"><span>${esc(c.name)}</span>${tg.map(t => chip(esc(t[0]), t[1])).join('')}</span>
        <span class="meta"><span><i>Última: </i><b>${agoTxt(st.lastAgo)}</b></span><span><i>A cada </i><b>${st.freq ? st.freq + ' dias' : '—'}</b></span><span><i>LTV </i><b>${brl0(st.ltv)}</b></span><span><i>Barbeiro: </i><b>${esc(P.barberById[st.favB].name)}</b></span></span>${ic('chev', 'chev')}</button>`;
    }).join('') + (l.length > cLim ? `<button class="btn btn-ghost btn-block more" data-act="moreCli">Mostrar mais (${l.length - cLim})</button>` : '');
  }
  function vClientes(p) {
    if (p.get('f')) cf = p.get('f');
    const base = P.clients.filter(c => P.inU(c.unit));
    const counts = Object.fromEntries(FILTERS.map(([k]) => [k, filterClients(k, '').length]));
    const banner = cf === 'sumidos' ? `<div class="note brass" style="margin-bottom:12px">${ic('msg')}<div style="flex:1"><b>${counts.sumidos} clientes não voltam há 45+ dias.</b> Uma mensagem personalizada costuma trazer 1 em cada 5 de volta.<div class="btn-row" style="margin-top:10px"><button class="btn btn-primary btn-sm" data-act="campaign" data-aud="sumidos">${ic('send')}Campanha de retorno no WhatsApp</button></div></div></div>`
      : cf === 'aniver' ? `<div class="note brass" style="margin-bottom:12px">${ic('gift')}<div style="flex:1"><b>${counts.aniver} aniversariantes em ${MES}.</b><div class="btn-row" style="margin-top:10px"><button class="btn btn-primary btn-sm" data-act="campaign" data-aud="bday">${ic('send')}Mandar parabéns com cupom</button></div></div></div>` : '';
    return `<div class="ph"><div><h1 class="display">Clientes</h1><p class="sub">${base.length} clientes · ${base.filter(c => c.sub).length} assinantes · ${esc(unitLabel())}</p></div>
      <div class="ph-act"><button class="btn btn-ghost btn-sm" data-act="campaign" data-aud="sumidos">${ic('msg')}Campanha de retorno</button></div></div>
      <div class="search">${ic('search')}<input class="input" type="search" id="cq" data-input="cq" placeholder="Buscar por nome ou telefone" value="${esc(cq)}" autocomplete="off"></div>
      <div class="seg">${FILTERS.map(([k, l]) => `<button class="${cf === k ? 'on' : ''}" data-act="cf" data-f="${k}">${esc(l)} <span class="n">${counts[k]}</span></button>`).join('')}</div>
      ${banner}
      <div class="card" style="padding:4px 14px">
        <div class="chead"><span></span><span>Cliente</span><span>Última visita</span><span>Frequência</span><span>LTV</span><span>Barbeiro</span><span></span></div>
        <div id="clist">${clientRows()}</div>
      </div>`;
  }
  function clientBody(id) {
    const c = P.clientById[id]; const st = P.clientStats(c);
    const tg = tagsOf(c, st);
    const done = P.appts.filter(a => a.c === c.id && a.status === 'concluido').map(a => ({ ago: 0, price: a.price, b: a.b, s: a.s, method: a.method }));
    const hist = done.concat(c.visits).slice(0, 10);
    const next = st.nextIn != null ? P.dayDate(-st.nextIn) : null;
    const nextNote = st.nextIn == null ? '' : st.nextIn > 0
      ? `<div class="note brass">${ic('calendar')}<div><b>Próxima visita prevista: ${esc(fDay(next))}</b> (em ${st.nextIn} dia${st.nextIn > 1 ? 's' : ''}), pela frequência média de ${st.freq} dias.</div></div>`
      : `<div class="note ${st.lapsed ? 'bad' : ''}">${ic('clock')}<div><b>Visita prevista para ${esc(fDay(next))} — ${st.nextIn === 0 ? 'é hoje' : `atrasada ${-st.nextIn} dia${st.nextIn < -1 ? 's' : ''}`}.</b> ${st.lapsed ? 'Bom momento para uma mensagem de retorno.' : ''}</div></div>`;
    const sub = c.sub ? (() => { const s = c.sub, ss = SUBST[s.status]; return `<div class="card card-hl"><div class="card-t"><h3>${ic('crown')} ${esc(P.planById[c.plan].name)}</h3>${chip(ss[0], ss[1])}</div>
      <div class="kv"><div><span class="label">Mensalidade</span><b>${brl(P.planById[c.plan].price)}</b></div><div><span class="label">Forma (Asaas)</span><b>${METHOD[s.method]}</b></div><div><span class="label">Vencimento</span><b>Todo dia ${s.dueDay}</b></div><div><span class="label">Assinante há</span><b>${st.subMonths} ${st.subMonths > 1 ? 'meses' : 'mês'}</b></div></div>
      ${s.status !== 'confirmado' ? `<div class="btn-row" style="margin-top:12px"><button class="btn btn-ghost btn-sm" data-act="resend" data-id="${c.id}">${ic('send')}${s.resentAt ? 'Cobrança reenviada' : 'Reenviar cobrança'}</button><button class="btn btn-ghost btn-sm" data-act="webhook" data-id="${c.id}">${ic('zap')}Simular pagamento</button></div>` : ''}</div>`; })() : '';
    return `<div class="who">${avatar(c.name)}<div style="min-width:0"><h3>${esc(c.name)}</h3><p class="muted small">${esc(c.phone)} · ${esc(unitName(c.unit))} · aniversário ${String(c.birth.d).padStart(2, '0')}/${String(c.birth.m + 1).padStart(2, '0')}</p>
      <div class="chips" style="margin-top:6px">${tg.map(t => chip(esc(t[0]), t[1])).join('')}</div></div></div>
      <div class="kv k3">
        <div><span class="label">Visitas</span><b>${st.n}</b></div>
        <div><span class="label">Frequência</span><b>${st.freq ? `a cada ${st.freq} dias` : '—'}</b></div>
        <div><span class="label">LTV</span><b>${brl0(st.ltv)}</b></div>
        <div><span class="label">Ticket avulso</span><b>${st.ticket ? brl(st.ticket) : '—'}</b></div>
        <div><span class="label">Preferido</span><b>${esc(P.barberById[st.favB].name)}</b></div>
        <div><span class="label">Cliente desde</span><b>${c.since ? P.dayDate(c.since).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '') : 'hoje'}</b></div>
      </div>
      ${nextNote}${sub}
      <div class="btn-row"><button class="btn btn-primary" data-act="campaign" data-aud="c:${c.id}">${ic('msg')}WhatsApp de retorno</button><button class="btn btn-ghost" data-act="newAppt" data-name="${esc(c.name)}">${ic('calendar')}Agendar</button></div>
      <div><div class="sec-t"><h2>Histórico</h2><span class="small muted">${hist.length} últimas visitas</span></div>
      <div class="list">${hist.length ? hist.map(v => `<div class="row"><span class="grow"><span class="t">${esc(P.svc[v.s].name)}</span><span class="d">${esc(fDay(P.dayDate(v.ago)))} · ${esc(P.barberById[v.b].name)}</span></span><span class="end">${v.method === 'plano' ? chip('Club', 'brass') : `<b class="num">${brl(v.price)}</b><span class="d" style="display:block">${METHOD[v.method]}</span>`}</span></div>`).join('') : '<p class="empty">Sem visitas ainda.</p>'}</div></div>`;
  }
  const openClient = id => openSheet('Ficha do cliente', () => clientBody(id));

  /* ---------- Campanha WhatsApp ---------- */
  let camp = null;
  const TPL = {
    sumidos: `Fala, {nome}! Faz {dias} dias que você não aparece na Don Vintage {unidade}. Sua cadeira está te esperando.\n\nAgende em 30 segundos: {link}\n\nE se quiser vir sempre: no ${CLUB}, corte + barba ilimitados por ${brl(PLAN ? PLAN.price : 0)}/mês.`,
    bday: `Parabéns, {nome}! A Don Vintage te deseja um ótimo aniversário.\n\nSeu presente: 20% OFF em qualquer serviço até o fim do mês. Agende: {link}`,
    one: `Fala, {nome}! Tudo certo? Já está na hora de dar aquele trato no visual. Seu barbeiro {barbeiro} tem horário essa semana na Don Vintage {unidade}.\n\nAgende aqui: {link}`,
  };
  function openCampaign(aud) {
    let ids, kind;
    if (aud && aud.startsWith('c:')) { ids = [aud.slice(2)]; kind = 'one'; }
    else if (aud === 'bday') { ids = filterClients('aniver', '').filter(c => !c.campaignAt).map(c => c.id); kind = 'bday'; }
    else { ids = filterClients('sumidos', '').filter(c => !c.campaignAt).map(c => c.id); kind = 'sumidos'; }
    camp = { ids, kind, tpl: TPL[kind] };
    openSheet(kind === 'one' ? 'Mensagem no WhatsApp' : kind === 'bday' ? 'Parabéns no WhatsApp' : 'Campanha de retorno', campBody);
  }
  const fillTpl = (tpl, c) => { const st = P.clientStats(c); return tpl.replace(/\{nome\}/g, c.name.split(' ')[0]).replace(/\{dias\}/g, st.lastAgo == null ? 'alguns' : st.lastAgo).replace(/\{unidade\}/g, unitName(c.unit)).replace(/\{barbeiro\}/g, P.barberById[st.favB].name).replace(/\{link\}/g, bookLink()); };
  function campBody() {
    const list = camp.ids.map(id => P.clientById[id]);
    if (!list.length) return '<p class="empty">Todos já receberam a campanha hoje. Volte amanhã para ver novos clientes no filtro.</p>';
    const first = list[0];
    const tick = sum(list, c => P.clientStats(c).ticket || (COMBO ? COMBO.price / 2 : 50)) / list.length;
    const back = Math.max(1, Math.round(list.length * .2));
    return `${list.length > 1 ? `<div class="kv k3"><div><span class="label">Destinatários</span><b>${list.length}</b></div><div><span class="label">Retorno típico</span><b>~${back} clientes</b></div><div><span class="label">Receita estimada</span><b>${brl0(back * tick)}</b></div></div>` : ''}
      <label class="field"><span class="label">Mensagem ({nome}, {dias}, {unidade}, {barbeiro}, {link})</span><textarea class="input" data-input="tpl">${esc(camp.tpl)}</textarea></label>
      <div class="wa"><div class="wa-head">${avatar(first.name, 30)}<span>Prévia para <b>${esc(first.name)}</b> · ${esc(first.phone)}</span></div><div class="wa-bubble" id="waPrev">${esc(fillTpl(camp.tpl, first))}<small>${P.hhmm(P.NOW)} ✓✓</small></div></div>
      ${list.length > 1 ? `<div class="chips">${list.slice(0, 8).map(c => chip(esc(c.name))).join('')}${list.length > 8 ? chip(`+${list.length - 8}`) : ''}</div>` : ''}
      <button class="btn btn-primary btn-block" data-act="sendCamp">${ic('send')}${list.length > 1 ? `Enviar para ${list.length} clientes` : 'Enviar pelo WhatsApp'}</button>
      <p class="small muted">Envio pela API oficial do WhatsApp, com intervalo entre mensagens. Nesta demo nada é enviado.</p>`;
  }
  function openWa(kind, id) {
    const a = P.appts.find(x => x.id === id); const c = P.clientById[a.c];
    const first = c.name.split(' ')[0], b = P.barberById[a.b].name, s = P.svc[a.s].name;
    const txt = {
      lembrete: `Olá, ${first}! Confirmando seu horário hoje às ${P.hhmm(a.start)} com ${b} (${s}) na Don Vintage ${unitName(a.u)}.\n\nResponda 1 para confirmar ou 2 para remarcar.`,
      pos: `Valeu pela visita, ${first}! Se curtiu o trabalho do ${b}, deixa sua avaliação no Google? Leva 10 segundos e ajuda demais a casa.`,
      falta: `Oi, ${first}! Sentimos sua falta hoje às ${P.hhmm(a.start)}. Quer remarcar? Tem horário com ${b} ainda essa semana: ${bookLink()}`,
    }[kind];
    camp = { ids: [c.id], kind: 'one', tpl: txt };
    openSheet('Mensagem no WhatsApp', campBody);
  }

  /* ---------- Barbeiros ---------- */
  function vBarbeiros() {
    const m = P.monthStats();
    const bars = P.barbersU();
    const tot = sum(bars, b => m.per[b.id].fat);
    return `<div class="ph"><div><h1 class="display">Barbeiros</h1><p class="sub">${bars.length} profissionais · ${esc(unitLabel())} · ${esc(MES)} (dia 1 a ${P.D})</p></div></div>
      <div class="note" style="margin-bottom:16px">${ic('crown')}<div><b>Comissão de assinatura:</b> atendimento do ${esc(CLUB)} entra R$ 0 no caixa, mas o barbeiro recebe comissão sobre um valor de referência de ${pct(P.SUB_REF)} da tabela (ex.: ${esc(P.svc.corte ? 'Corte ' + brl(P.svc.corte.price) + ' → ref. ' + brl(P.svc.corte.price * P.SUB_REF) : '')}).</div></div>
      <div class="grid g-3">${bars.map(b => {
        const x = m.per[b.id], mt = P.meta[b.id];
        return `<article class="card" style="display:flex;flex-direction:column;gap:12px">
          <div class="who">${bAvatar(b, 52)}<div style="min-width:0;flex:1"><h3>${esc(b.name)}</h3><p class="small muted">${esc(b.role || 'Barbeiro')} · ${esc(unitName(b.unit))}</p><span class="small brass">★ ${nf(mt.rating)} <span class="muted">(${mt.reviews} avaliações)</span></span></div></div>
          <div class="mini"><div><span class="label">Faturado</span><b>${brl0(x.fat)}</b></div><div><span class="label">Atend.</span><b>${x.n}</b></div><div><span class="label">Ticket</span><b>${brl0(x.ticket)}</b></div></div>
          <div class="small muted">${x.subN} atendimentos de assinante · ref. ${brl0(x.subVal)}</div>
          <div>${bar(tot ? x.fat / tot : 0)}<span class="small muted">${pct(tot ? x.fat / tot : 0)} do faturamento de serviços</span></div>
          <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;padding-top:10px;border-top:1px solid var(--line-soft)">
            <div><span class="label">Comissão ${b.commission}%</span><div class="num" style="font-size:22px;color:var(--brass)">${brl(x.comm)}</div></div>
            ${mt.closedAt ? chip(ic('check') + 'Fechado', 'ok') : chip('A pagar', 'warn')}</div>
          <button class="btn btn-ghost btn-sm" data-act="barber" data-id="${b.id}">Horários, serviços e fechamento</button>
        </article>`;
      }).join('')}</div>
      <section class="card mt">
        <div class="card-t"><h3>Fechamento de comissão · ${esc(MES)}</h3>${chip('Parcial até hoje', 'info')}</div>
        <table class="tbl cards"><thead><tr><th>Barbeiro</th><th class="r">Faturado avulso</th><th class="r">Assinantes</th><th class="r">Base assinatura</th><th class="r">%</th><th class="r">Comissão</th><th></th></tr></thead>
        <tbody>${bars.map(b => { const x = m.per[b.id]; return `<tr><td class="first">${esc(b.name)}</td><td class="r" data-l="Faturado avulso">${brl(x.fat)}</td><td class="r" data-l="Atend. assinantes">${x.subN}</td><td class="r" data-l="Base assinatura">${brl(x.subVal)}</td><td class="r" data-l="Comissão %">${b.commission}%</td><td class="r" data-l="A pagar"><b>${brl(x.comm)}</b></td><td class="r" data-l="Status">${P.meta[b.id].closedAt ? chip('Fechado', 'ok') : `<button class="btn btn-ghost btn-sm" data-act="closeComm" data-id="${b.id}">Fechar</button>`}</td></tr>`; }).join('')}</tbody>
        <tfoot><tr><td class="first">Total da equipe</td><td class="r" data-l="Faturado avulso">${brl(tot)}</td><td class="r" data-l="Atend. assinantes">${sum(bars, b => m.per[b.id].subN)}</td><td class="r" data-l="Base assinatura">${brl(sum(bars, b => m.per[b.id].subVal))}</td><td class="r" data-l=""></td><td class="r" data-l="Total a pagar">${brl(m.comm)}</td><td></td></tr></tfoot></table>
        <p class="small muted" style="margin-top:10px">${ic('check')} O faturado da equipe (${brl(tot)}) é a mesma “Receita de serviços” da DRE no Financeiro.</p>
      </section>`;
  }
  function barberBody(id) {
    const b = P.barberById[id], m = P.monthStats(), x = m.per[b.id] || withUnit(b.unit, P.monthStats).per[b.id], mt = P.meta[id];
    const lunch = P.blocks.find(z => z.b === id && z.kind === 'intervalo');
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const ap = P.appts.filter(a => a.b === id);
    return `<div class="who">${bAvatar(b)}<div><h3>${esc(b.name)}</h3><p class="small muted">${esc(b.role || 'Barbeiro')} · Unidade ${esc(unitName(b.unit))} · ★ ${nf(mt.rating)}</p></div></div>
      <div class="kv"><div><span class="label">Hoje</span><b>${ap.filter(a => a.status !== 'faltou').length} agendados · ${ap.filter(a => a.status === 'concluido').length} feitos</b></div><div><span class="label">Faturado no mês</span><b>${brl(x.fat)}</b></div><div><span class="label">Atendimentos no mês</span><b>${x.n} (${x.subN} Club)</b></div><div><span class="label">Comissão</span><b>${b.commission}%</b></div></div>
      <div><div class="sec-t"><h2>Horários de trabalho</h2></div><div class="list">${[1, 2, 3, 4, 5, 6, 0].map(d => { const h = DV.business.hours[d]; return `<div class="row" style="min-height:44px"><span class="grow">${days[d]}</span><span class="end small">${h ? `${h[0]}–${h[1]}${lunch ? ` <span class="muted">· intervalo ${P.hhmm(lunch.start)}</span>` : ''}` : '<span class="muted">Folga</span>'}</span></div>`; }).join('')}</div></div>
      <div><div class="sec-t"><h2>Serviços que realiza</h2></div><div class="chips">${P.SERVICES.filter(s => !s.parts && P.offers(b, s.id)).map(s => chip(`${esc(s.name)} · ${brl0(s.price)}`, P.covers(PLAN, s) ? 'brass' : '')).join('')}</div><p class="small muted" style="margin-top:6px">Em amarelo: cobertos pelo ${esc(CLUB)}.</p></div>
      <div class="card"><div class="card-t"><h3>Fechamento · ${esc(MES)}</h3>${mt.closedAt ? chip('Fechado', 'ok') : chip('Em aberto', 'warn')}</div>
        <div class="list">
          <div class="row" style="min-height:40px"><span class="grow">Serviços avulsos</span><span class="end">${brl(x.fat)}</span></div>
          <div class="row" style="min-height:40px"><span class="grow">Assinantes (${x.subN} × ref. ${pct(P.SUB_REF)})</span><span class="end">${brl(x.subVal)}</span></div>
          <div class="row" style="min-height:40px"><span class="grow">Base de cálculo × ${b.commission}%</span><span class="end">${brl(x.fat + x.subVal)}</span></div>
          <div class="row" style="min-height:48px"><b class="grow">Total a pagar</b><b class="end num" style="font-size:22px;color:var(--brass)">${brl(x.comm)}</b></div>
        </div>
        ${mt.closedAt ? `<p class="small muted">Fechado em ${mt.closedAt.toLocaleDateString('pt-BR')} · recibo gerado.</p>` : `<button class="btn btn-primary btn-block" data-act="closeComm" data-id="${b.id}">${ic('file')}Fechar comissão e gerar recibo</button>`}
      </div>`;
  }

  /* ---------- Assinaturas (Vintage Club) ---------- */
  let sf = 'todos', sLim = 30;
  function usage() {
    const ss = P.subsStats();
    let visits = 0, ref = 0;
    P.visits.forEach(v => { if (v.method === 'plano' && v.ago < 30 && P.inU(v.u)) { visits++; ref += P.svc[v.s].price; } });
    P.appts.forEach(a => { if (a.method === 'plano' && a.status === 'concluido' && P.inU(a.u)) { visits++; ref += P.svc[a.s].price; } });
    const per = ss.n ? visits / ss.n : 0;
    const price = PLAN ? PLAN.price : 0;
    const comm = sum(P.barbersU(), b => (b.commission || 0) / 100) / Math.max(1, P.barbersU().length);
    const commPerSub = ss.n ? ref * P.SUB_REF * comm / ss.n : 0;
    return { visits, per, cpv: per ? price / per : 0, avulso: COMBO ? COMBO.price : 120, commPerSub, net: price - commPerSub - (price * .0299 + .49) };
  }
  function vAssin(p) {
    if (p.get('f')) sf = p.get('f');
    const ss = P.subsStats(), u = usage();
    const list = ss.list.filter(c => sf === 'todos' || c.sub.status === sf).sort((a, b) => ({ vencido: 0, pendente: 1, confirmado: 2 }[a.sub.status] - { vencido: 0, pendente: 1, confirmado: 2 }[b.sub.status]) || a.sub.dueDay - b.sub.dueDay);
    const cnt = k => ss.list.filter(c => k === 'todos' || c.sub.status === k).length;
    const m = P.monthStats();
    const maxU = Math.max(1, ...ss.perUnit.map(x => x.mrr));
    return `<section class="card card-hl club-hero">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span class="eyebrow">Carro-chefe · a barbearia por assinatura</span><span class="asaas">Integrado ao Asaas</span></div>
        <h2>${esc(CLUB)}</h2>
        <p class="muted">${esc(PLAN ? (PLAN.subtitle || PLAN.name) : '')} · ${brl(PLAN ? PLAN.price : 0)}/${esc(PLAN ? PLAN.period : 'mês')} · ${esc(unitLabel())}</p>
        <div style="display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;margin-top:14px"><div><span class="label">Receita recorrente mensal (MRR)</span><div class="big">${brl0(ss.mrr)}</div></div><span class="muted small" style="padding-bottom:6px">${ss.n} assinantes ativos · ${brl0(m.subsRev)} já recebido em ${esc(MES)}</span></div>
      </section>
      <div class="kpis k4 mt">
        ${kpi('Assinantes ativos', 'users', ss.n, `${ss.pend} cobranças pendentes`)}
        ${kpi('Churn 30 dias', 'trend', pct(ss.churn, 1), `${ss.canc} cancelamento${ss.canc === 1 ? '' : 's'}`)}
        ${kpi('Inadimplência', 'alert', brl0(ss.lateV), `${ss.late} vencidas · ${pct(ss.mrr ? ss.lateV / ss.mrr : 0, 1)} do MRR`, ss.late ? 'bad' : '')}
        ${kpi('Uso por assinante', 'scissors', `${nf(u.per)}×/mês`, `${u.visits} visitas nos últimos 30 dias`)}
      </div>
      <div class="grid g-2 mt">
        <section class="card">
          <div class="card-t"><h3>O plano dá lucro?</h3>${chip(u.net > 0 ? 'Sim' : 'Atenção', u.net > 0 ? 'ok' : 'bad')}</div>
          <div class="kv"><div><span class="label">Custo por visita p/ cliente</span><b>${brl(u.cpv)}</b></div><div><span class="label">Avulso (corte + barba)</span><b>${brl(u.avulso)}</b></div><div><span class="label">Comissão / assinante</span><b>${brl(u.commPerSub)}</b></div><div><span class="label">Sobra / assinante</span><b class="${u.net > 0 ? 'up' : 'down'}">${brl(u.net)}</b></div></div>
          <p class="small muted" style="margin-top:10px">Cada assinante vem ${nf(u.per)}× por mês: paga ${brl(u.cpv)} por visita contra ${brl(u.avulso)} no avulso. Descontadas a comissão de assinatura e a taxa do Asaas, sobram ${brl(u.net)} por mês — receita garantida antes do mês começar.</p>
        </section>
        <section class="card">
          <div class="card-t"><h3>Assinantes por unidade</h3></div>
          <div class="list">${ss.perUnit.map(x => `<button class="row" data-act="unit" data-id="${x.u.id}"><span class="grow"><span class="t">${esc(x.u.name)}</span><span class="d">${x.n} assinantes${x.late ? ` · <span class="down">${x.late} vencido${x.late > 1 ? 's' : ''}</span>` : ''}</span>${bar(x.mrr / maxU)}</span><span class="end num">${brl0(x.mrr)}</span></button>`).join('')}</div>
        </section>
      </div>
      <section class="card mt">
        <div class="card-t"><h3>Como funciona a cobrança automática</h3><span class="asaas">Asaas</span></div>
        <div class="flow">
          <div><b>Cliente assina</b>Pelo link de agendamento, com cartão, Pix ou boleto recorrente.</div>
          <div><b>Asaas cobra todo mês</b>Gera a cobrança, envia lembrete e tenta de novo no cartão.</div>
          <div><b>Webhook confirma</b>Pagamento confirmado → o painel libera o uso do plano na hora.</div>
          <div class="bad"><b>Atrasou?</b>Webhook de atraso → bloqueia agendar como assinante até pagar.</div>
        </div>
      </section>
      <section class="card mt">
        <div class="card-t"><h3>Assinantes</h3><span class="small muted">Status da cobrança do mês</span></div>
        <div class="seg">${[['todos', 'Todos'], ['vencido', 'Vencido'], ['pendente', 'Pendente'], ['confirmado', 'Confirmado']].map(([k, l]) => `<button class="${sf === k ? 'on' : ''}" data-act="sf" data-f="${k}">${l} <span class="n">${cnt(k)}</span></button>`).join('')}</div>
        <div class="list">${list.slice(0, sLim).map(c => {
          const s = c.sub, st = SUBST[s.status];
          return `<div class="row" style="flex-wrap:wrap"><button class="row" style="border:0;flex:1 1 220px;padding:0;min-width:0" data-act="client" data-id="${c.id}">${avatar(c.name, 38)}<span class="grow"><span class="t">${esc(c.name)}</span><span class="d">${esc(unitName(c.unit))} · ${METHOD[s.method]} · vence dia ${s.dueDay}${s.status === 'vencido' ? ` · ${P.D - s.dueDay} dias de atraso` : ''}</span></span></button>
            <span class="end" style="display:flex;align-items:center;gap:8px">${chip(st[0], st[1])}${s.status !== 'confirmado' ? `<button class="btn btn-ghost btn-sm" data-act="resend" data-id="${c.id}" ${s.resentAt ? 'disabled' : ''}>${s.resentAt ? 'Reenviada' : 'Reenviar cobrança'}</button>` : `<span class="small muted" style="min-width:68px;text-align:right">${s.paidThisMonth ? 'pago dia ' + s.paidDay : 'em dia'}</span>`}</span></div>`;
        }).join('') || '<p class="empty">Nenhum assinante neste filtro.</p>'}</div>
        ${list.length > sLim ? `<button class="btn btn-ghost btn-block more" data-act="moreSub">Mostrar mais (${list.length - sLim})</button>` : ''}
      </section>`;
  }

  /* ---------- Financeiro ---------- */
  function vFin() {
    const d = P.dayStats(), m = P.monthStats();
    const parts = [['pix', 'Pix', 'pix', ''], ['cartao', 'Cartão', 'card', 'info'], ['dinheiro', 'Dinheiro', 'cash', 'ok'], ['assinatura', CLUB, 'crown', '']];
    const pend = P.bills.filter(b => P.inU(b.u) && !b.paid).sort((a, b) => a.due - b.due);
    const paid = P.bills.filter(b => P.inU(b.u) && b.paid);
    const cats = {}; m.opBills.forEach(b => { cats[b.cat] = (cats[b.cat] || 0) + b.value; });
    const maxC = Math.max(1, ...Object.values(cats));
    const L = (l, v, o = {}) => `<tr class="${o.cls || ''}"><td class="first" style="${o.b ? 'font-weight:700' : ''}">${l}</td><td class="r ${v < 0 ? 'down' : ''}" data-l="${o.b ? '' : 'Valor'}" style="${o.b ? 'font-weight:700' : ''}">${brl(v)}</td><td class="r muted" data-l="% receita">${m.receita ? pct(Math.abs(v) / m.receita, 1) : '—'}</td></tr>`;
    return `<div class="ph"><div><h1 class="display">Financeiro</h1><p class="sub">${esc(unitLabel())} · ${esc(MES)}, dia 1 a ${P.D}</p></div></div>
      <div class="g-main">
        <div class="stack">
          <section class="card card-hl">
            <div class="card-t"><h3>Caixa de hoje</h3>${chip('Aberto', 'ok')}</div>
            <div class="num" style="font-size:40px;color:var(--brass);line-height:1">${brl(d.total)}</div>
            <p class="small muted" style="margin:4px 0 14px">${d.done} atendimentos concluídos · ${d.movs.filter(x => x.label.startsWith('Venda')).length} vendas de produto</p>
            <div class="stack" style="gap:12px">${parts.map(([k, l, i, t]) => `<div><div style="display:flex;justify-content:space-between;gap:8px" class="small"><span>${ic(i)} ${esc(l)}</span><b class="num">${brl(d.caixa[k])}</b></div>${bar(d.total ? d.caixa[k] / d.total : 0, t)}</div>`).join('')}</div>
          </section>
          <section class="card">
            <div class="card-t"><h3>Movimentos de hoje</h3><span class="small muted">${d.movs.length}</span></div>
            <div class="list">${d.movs.slice(0, 10).map(x => `<div class="row"><span class="time" style="font-size:15px">${P.hhmm(x.t)}</span><span class="grow"><span class="t">${esc(x.label)}</span><span class="d">${METHOD[x.m] || x.m}${P.S.unit === 'all' ? ' · ' + esc(unitName(x.u)) : ''}</span></span><b class="end num">${x.v ? brl(x.v) : 'R$ 0 · plano'}</b></div>`).join('') || '<p class="empty">Nenhum movimento ainda.</p>'}</div>
          </section>
        </div>
        <div class="stack">
          <section class="card">
            <div class="card-t"><h3>DRE simplificada</h3>${chip('Mês até hoje', 'info')}</div>
            <table class="tbl dre"><thead><tr><th>Conta</th><th class="r">Valor</th><th class="r">% receita</th></tr></thead><tbody>
              ${L('Receita de serviços (avulsos)', m.serv)}${L(`Receita ${esc(CLUB)}`, m.subsRev)}${L('Receita de produtos', m.prod)}
              ${L('= Receita bruta', m.receita, { b: 1 })}
              ${L('(−) Taxas de cartão e Asaas', -m.fees)}${L('(−) Comissões (inclui assinatura)', -m.comm)}${L('(−) Custo dos produtos vendidos', -m.cmv)}${L('(−) Despesas operacionais', -m.exp)}
            </tbody><tfoot><tr><td class="first">= Resultado</td><td class="r ${m.lucro >= 0 ? 'up' : 'down'}" data-l="Resultado">${brl(m.lucro)}</td><td class="r" data-l="Margem">${pct(m.receita ? m.lucro / m.receita : 0, 1)}</td></tr></tfoot></table>
          </section>
          <section class="card">
            <div class="card-t"><h3>Contas a pagar</h3>${chip(brl0(sum(pend, b => b.value)), 'warn')}</div>
            <div class="list">${pend.map(b => `<div class="row"><span class="grow"><span class="t">${esc(b.desc)}</span><span class="d">${esc(b.cat)}${P.S.unit === 'all' ? ' · ' + esc(unitName(b.u)) : ''} · vence ${String(b.due).padStart(2, '0')}/${String(P.today.getMonth() + 1).padStart(2, '0')}${b.due - P.D <= 3 ? ' · <span class="down">em breve</span>' : ''}</span></span><span class="end" style="display:flex;align-items:center;gap:8px"><b class="num">${brl(b.value)}</b><button class="btn btn-ghost btn-sm" data-act="payBill" data-id="${b.id}">Pagar</button></span></div>`).join('') || '<p class="empty">Nada pendente.</p>'}</div>
            <p class="small muted" style="margin-top:8px">${paid.length} contas pagas em ${esc(MES)} · ${brl(sum(paid, b => b.value))}. Compra de estoque não entra na DRE: vira custo quando o produto é vendido.</p>
          </section>
          <section class="card">
            <div class="card-t"><h3>Despesas do mês</h3><b class="num">${brl0(m.exp)}</b></div>
            <div class="stack" style="gap:10px">${Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div><div style="display:flex;justify-content:space-between" class="small"><span>${esc(k)}</span><b class="num">${brl(v)}</b></div>${bar(v / maxC, 'warn')}</div>`).join('')}</div>
          </section>
        </div>
      </div>`;
  }

  /* ---------- Estoque ---------- */
  const moves = [];
  function vEstoque() {
    const m = P.monthStats();
    const ps = P.products;
    const soldMonth = id => sum(P.sales.filter(s => s.p === id && s.ago < P.D && P.inU(s.u)), s => s.qty);
    const low = ps.filter(p => P.stockOf(p) < P.minOf(p));
    return `<div class="ph"><div><h1 class="display">Estoque</h1><p class="sub">${ps.length} produtos · ${esc(unitLabel())}</p></div></div>
      <div class="kpis k4">
        ${kpi('Valor em estoque', 'box', brl0(sum(ps, p => P.stockOf(p) * p.cost)), `a custo · ${brl0(sum(ps, p => P.stockOf(p) * p.price))} a preço de venda`)}
        ${kpi('Itens em estoque', 'box', sum(ps, p => P.stockOf(p)), 'unidades')}
        ${kpi('Vendas no mês', 'trend', brl0(m.prod), `${m.prodN} itens · margem ${pct(m.prod ? (m.prod - m.cmv) / m.prod : 0)}`)}
        ${kpi('Para repor', 'alert', low.length, low.length ? low.map(p => esc(p.name)).slice(0, 2).join(', ') + (low.length > 2 ? '…' : '') : 'Tudo acima do mínimo', low.length ? 'bad' : '')}
      </div>
      <div class="grid g-3 mt">${ps.slice().sort((a, b) => (P.stockOf(a) < P.minOf(a) ? 0 : 1) - (P.stockOf(b) < P.minOf(b) ? 0 : 1)).map(p => {
        const st = P.stockOf(p), mn = P.minOf(p), isLow = st < mn, edge = st === mn;
        const mg = p.price ? (p.price - p.cost) / p.price : 0;
        return `<article class="card prod ${isLow ? 'low' : ''}">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div style="min-width:0"><h3>${esc(p.name)}</h3><span class="small muted">${esc(p.brand && p.brand !== '—' ? p.brand : 'Produto')} · ${soldMonth(p.id)} vendidos no mês</span></div>${isLow ? chip(ic('alert') + 'Repor', 'bad') : edge ? chip('No limite', 'warn') : chip('OK', 'ok')}</div>
          <div class="stock"><b class="${isLow ? 'down' : ''}">${st}</b><span class="muted">un · mínimo ${mn}</span></div>
          ${bar(Math.min(1, st / Math.max(1, mn * 2.5)), isLow ? 'bad' : edge ? 'warn' : 'ok')}
          <div class="mini"><div><span class="label">Preço</span><b>${brl(p.price)}</b></div><div><span class="label">Custo</span><b>${brl(p.cost)}</b></div><div><span class="label">Margem</span><b>${pct(mg)}</b></div></div>
          <div class="btn-row"><button class="btn btn-primary btn-sm" data-act="prod" data-k="venda" data-id="${p.id}" ${st ? '' : 'disabled'}>${ic('up')}Vender</button><button class="btn btn-ghost btn-sm" data-act="prod" data-k="entrada" data-id="${p.id}">${ic('down')}Entrada</button></div>
        </article>`;
      }).join('')}</div>
      ${moves.length ? `<section class="card mt"><div class="card-t"><h3>Movimentações desta sessão</h3></div><div class="list">${moves.slice().reverse().map(x => `<div class="row"><span class="ico-b ${x.k === 'venda' ? 'ok' : 'info'}">${ic(x.k === 'venda' ? 'up' : 'down')}</span><span class="grow"><span class="t">${x.k === 'venda' ? 'Venda' : 'Entrada'} · ${x.qty}× ${esc(x.name)}</span><span class="d">${esc(unitName(x.u))} · ${x.t}${x.m ? ' · ' + METHOD[x.m] : ''}</span></span>${x.v ? `<b class="end num">${brl(x.v)}</b>` : ''}</div>`).join('')}</div></section>` : ''}`;
  }
  let pq = null;
  function prodBody() {
    const p = P.products.find(x => x.id === pq.id);
    const st = P.stockOf(p);
    const max = pq.k === 'venda' ? (P.S.unit === 'all' ? Math.max(...P.units.map(u => P.stockU[p.id][u.id])) : st) : 99;
    pq.qty = Math.max(1, Math.min(pq.qty, max || 1));
    return `<div class="who"><span class="ico-b">${ic('box')}</span><div><h3>${esc(p.name)}</h3><p class="small muted">${st} em estoque · ${esc(unitLabel())}</p></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><span class="label">Quantidade</span><div class="stepper"><button data-act="pq" data-d="-1" aria-label="Menos">${ic('minus')}</button><b>${pq.qty}</b><button data-act="pq" data-d="1" aria-label="Mais">${ic('plus')}</button></div></div>
      ${pq.k === 'venda' ? `<div class="card card-hl" style="text-align:center"><span class="label">Total</span><div class="num" style="font-size:32px;color:var(--brass)">${brl(p.price * pq.qty)}</div></div>
        <div class="pay"><button data-act="sellGo" data-m="pix">${ic('pix')}Pix</button><button data-act="sellGo" data-m="cartao">${ic('card')}Cartão</button><button data-act="sellGo" data-m="dinheiro" class="wide" style="background:var(--surface);color:var(--text);border-color:var(--line)">${ic('cash')}Dinheiro</button></div>`
      : `<p class="small muted">Custo da entrada: ${brl(p.cost * pq.qty)}${P.S.unit === 'all' ? ' · vai para a unidade com menos estoque' : ''}.</p><button class="btn btn-primary btn-block" data-act="inGo">${ic('down')}Registrar entrada</button>`}`;
  }

  /* ---------- Configurações ---------- */
  const toggles = { r24: true, r2: true, aval: true, ret: false, bday: true };
  function vConfig() {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const T = (k, l, d) => `<div class="row"><span class="grow"><span class="t" style="white-space:normal">${l}</span><span class="d" style="white-space:normal">${d}</span></span><button class="switch" role="switch" aria-checked="${toggles[k]}" aria-label="${esc(l)}" data-act="tog" data-k="${k}"></button></div>`;
    const integ = [
      ['Asaas', 'zap', 'Cobrança recorrente do ' + CLUB + ' · webhook ativo · última notificação há 2 min', 'Conectado'],
      ['WhatsApp Business', 'msg', 'Confirmações, lembretes e campanhas pela API oficial', 'Conectado'],
      ['Google Agenda', 'calendar', `Sincronizando ${P.barbers.length} agendas de barbeiros`, 'Sincronizado'],
    ];
    return `<div class="ph"><div><h1 class="display">Configurações</h1><p class="sub">${esc(DV.business.fullName)} · ${esc(DV.business.city)}</p></div></div>
      <div class="grid g-2">
        <section class="card"><div class="card-t"><h3>Link público de agendamento</h3></div>
          <div class="linkbox"><code>${esc(bookLink())}</code><button class="btn btn-primary btn-sm" data-act="copy">${ic('copy')}Copiar</button></div>
          <div class="btn-row" style="margin-top:10px"><a class="btn btn-ghost btn-sm" href="${esc(DV.links.agendar || 'agendar.html')}">${ic('ext')}Abrir agendamento</a></div>
          <p class="small muted" style="margin-top:10px">Vai na bio do Instagram (@${esc(DV.business.instagram)}) e no Google. O cliente escolhe unidade, barbeiro e horário.</p></section>
        <section class="card"><div class="card-t"><h3>Integrações</h3></div><div class="list">${integ.map(([n, i, d, s]) => `<div class="row"><span class="ico-b ok">${ic(i)}</span><span class="grow"><span class="t">${n}</span><span class="d" style="white-space:normal">${esc(d)}</span></span>${chip(s, 'ok')}</div>`).join('')}</div></section>
        <section class="card"><div class="card-t"><h3>Horário de funcionamento</h3></div><div class="list">${[1, 2, 3, 4, 5, 6, 0].map(d => { const h = DV.business.hours[d]; return `<div class="row" style="min-height:44px"><span class="grow">${days[d]}</span><span class="end">${h ? `${h[0]} – ${h[1]}` : '<span class="muted">Fechado</span>'}</span></div>`; }).join('')}</div></section>
        <section class="card"><div class="card-t"><h3>Automações</h3></div><div class="list">
          ${T('r24', 'Lembrete 24h antes', 'WhatsApp com botão de confirmar ou remarcar')}
          ${T('r2', 'Lembrete 2h antes', 'Reduz faltas na agenda')}
          ${T('aval', 'Pedir avaliação no Google', 'Enviado 1h depois do atendimento concluído')}
          ${T('ret', 'Campanha automática de retorno', 'Dispara quando o cliente passa 45 dias sem vir')}
          ${T('bday', 'Parabéns no aniversário', 'Com cupom de 20% válido no mês')}</div></section>
        <section class="card" style="grid-column:1/-1"><div class="card-t"><h3>Unidades</h3></div><div class="units">${P.units.map(u => `<div class="unit"><h4>${esc(u.name)}</h4><span class="small muted">${ic('pin')} ${esc(u.address || '')}</span><span class="small">${esc(u.phone || '')}</span><span class="stars">★ ${nf(u.rating)} no Google <span class="muted">(${u.reviewsCount || 0} avaliações)</span></span><span class="small muted">${P.barbers.filter(b => b.unit === u.id).map(b => esc(b.name)).join(', ') || 'Sem barbeiros'}</span></div>`).join('')}</div></section>
      </div>`;
  }

  /* ---------- "Mais" e alertas (sheets) ---------- */
  const moreBody = () => `<div class="list">${Object.entries(ROUTES).filter(([k]) => !MAIN.includes(k)).map(([k, r]) => `<a class="row" href="#${k}"><span class="ico-b">${ic(r.i)}</span><span class="grow"><span class="t">${esc(r.t)}</span><span class="d">${{ barbeiros: 'Desempenho e comissões', financeiro: 'Caixa, DRE e contas a pagar', estoque: 'Produtos, vendas e reposição', config: 'Horários, link e integrações' }[k] || ''}</span></span>${ic('chev', 'chev')}</a>`).join('')}</div>
    <a class="btn btn-ghost btn-block" href="index.html">Voltar para a proposta</a>`;

  /* ---------- Ações ---------- */
  const A = {
    close: () => closeSheet(),
    more: () => openSheet('Mais', moreBody),
    alerts: () => openSheet('Alertas', () => `<div class="list">${alertRows(alerts())}</div>`),
    unit: el => { P.act.setUnit(P.S.unit === el.dataset.id ? 'all' : el.dataset.id); refresh(); },
    appt: el => openAppt(el.dataset.id),
    checkin: el => { P.act.checkIn(el.dataset.id); toast('Check-in feito · cliente em atendimento'); refresh(); },
    charge: el => { apptMode = 'pay'; refresh(); $('.sheet').scrollTop = 0; },
    charge0: () => { apptMode = null; refresh(); },
    pay: el => {
      P.act.conclude(el.dataset.id, el.dataset.m);
      const a = P.appts.find(x => x.id === el.dataset.id);
      apptMode = null;
      toast(el.dataset.m === 'plano' ? `Uso do ${CLUB} registrado` : `Concluído · ${brl(a.price)} via ${METHOD[el.dataset.m]}`);
      refresh();
    },
    noshow: el => { P.act.noShow(el.dataset.id); toast('Falta registrada · horário liberado para encaixe'); refresh(); },
    wa: el => openWa(el.dataset.k, el.dataset.id),
    client: el => openClient(el.dataset.id),
    campaign: el => openCampaign(el.dataset.aud),
    sendCamp: () => {
      const n = camp.ids.length;
      if (camp.kind !== 'one') P.act.campaign(camp.ids);
      closeSheet(); toast(n > 1 ? `Campanha enviada para ${n} clientes (simulação)` : 'Mensagem enviada pelo WhatsApp (simulação)'); render(true);
    },
    newAppt: el => openNew(el.dataset.name),
    saveAppt: () => {
      if (!na.name.trim()) { toast('Informe o nome do cliente'); const i = $('[data-input="naName"]'); if (i) i.focus(); return; }
      if (na.t == null) return;
      const a = P.act.addAppt({ name: na.name, b: na.b, s: na.s, start: na.t });
      agB = a.b; closeSheet();
      toast(`Agendado ${P.hhmm(a.start)} com ${P.barberById[a.b].name} · confirmação enviada`);
      if (cur !== 'agenda') location.hash = '#agenda'; else render(true);
    },
    pickB: el => { agB = el.dataset.id; render(true); },
    cf: el => { cf = el.dataset.f; cLim = 40; render(true); },
    moreCli: () => { cLim += 40; $('#clist').innerHTML = clientRows(); },
    sf: el => { sf = el.dataset.f; sLim = 30; render(true); },
    moreSub: () => { sLim += 30; render(true); },
    resend: el => {
      const c = P.clientById[el.dataset.id];
      if (c.sub.resentAt) return;
      P.act.resend(el.dataset.id);
      toast(`Cobrança reenviada pelo Asaas · ${METHOD[c.sub.method]} por WhatsApp e e-mail`); refresh();
    },
    webhook: el => {
      P.act.webhook(el.dataset.id);
      toast(`Webhook do Asaas: pagamento confirmado · ${CLUB} liberado`); refresh();
    },
    barber: el => openSheet('Barbeiro', () => barberBody(el.dataset.id)),
    closeComm: el => { P.act.closeCommission(el.dataset.id); toast(`Comissão de ${P.barberById[el.dataset.id].name} fechada · recibo gerado`); refresh(); },
    payBill: el => { const b = P.bills.find(x => x.id === el.dataset.id); P.act.payBill(el.dataset.id); toast(`${b.desc} paga · ${brl(b.value)}`); refresh(); },
    prod: el => { pq = { id: el.dataset.id, k: el.dataset.k, qty: 1 }; openSheet(el.dataset.k === 'venda' ? 'Registrar venda' : 'Entrada de estoque', prodBody); },
    pq: el => { pq.qty += +el.dataset.d; $('#sheetBody').innerHTML = prodBody(); },
    sellGo: el => {
      const p = P.products.find(x => x.id === pq.id);
      const sold = P.act.sell(pq.id, pq.qty, el.dataset.m);
      if (!sold) { toast('Sem estoque nesta unidade'); return; }
      const s = P.sales[P.sales.length - 1];
      moves.push({ k: 'venda', qty: sold, name: p.name, u: s.u, t: P.hhmm(s.time), m: el.dataset.m, v: p.price * sold });
      closeSheet(); toast(`Venda registrada · ${brl(p.price * sold)} no caixa`); render(true);
    },
    inGo: () => {
      const p = P.products.find(x => x.id === pq.id);
      const u = P.act.stockIn(pq.id, pq.qty);
      const n = new Date();
      moves.push({ k: 'entrada', qty: pq.qty, name: p.name, u, t: `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}` });
      closeSheet(); toast(`Entrada de ${pq.qty} un. registrada · ${unitName(u)}`); render(true);
    },
    tog: el => { toggles[el.dataset.k] = !toggles[el.dataset.k]; el.setAttribute('aria-checked', toggles[el.dataset.k]); toast(toggles[el.dataset.k] ? 'Automação ativada' : 'Automação desativada'); },
    copy: () => {
      const l = bookLink();
      const ok = () => toast('Link copiado');
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(l).then(ok, () => toast(l));
      else toast(l);
    },
  };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const f = A[el.dataset.act];
    if (f) { e.preventDefault(); f(el, e); }
  });
  document.addEventListener('input', e => {
    const k = e.target.dataset.input;
    if (k === 'cq') { cq = e.target.value; cLim = 40; $('#clist').innerHTML = clientRows(); }
    if (k === 'tpl') { camp.tpl = e.target.value; const pv = $('#waPrev'); if (pv) pv.innerHTML = esc(fillTpl(camp.tpl, P.clientById[camp.ids[0]])) + `<small>${P.hhmm(P.NOW)} ✓✓</small>`; }
    if (k === 'naName') {
      na.name = e.target.value;
      const m = P.clients.find(c => P.norm(c.name) === P.norm(na.name).trim());
      const h = $('#naHint'); if (h) h.textContent = m ? `Cliente cadastrado${m.sub ? ` · assinante ${CLUB}` : ''}` : na.name ? 'Novo cliente — será cadastrado agora' : 'Digite para buscar na base';
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-unit]')) { P.act.setUnit(t.value); refresh(); return; }
    const k = t.dataset.change;
    if (k === 'naB') { na.b = t.value; na.t = null; $('#sheetBody').innerHTML = newBody(); }
    if (k === 'naS') { na.s = t.value; na.t = null; $('#sheetBody').innerHTML = newBody(); }
    if (k === 'naT') na.t = +t.value;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetFn) closeSheet(); });
  window.addEventListener('hashchange', onRoute);
  let rT;
  window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if ($('#chart')) drawChart(); }, 150); });
  // Agenda muda de colunas (desktop) para seletor + timeline (mobile) ao cruzar 960px.
  const mqChange = () => { if (cur === 'agenda') render(true); };
  if (mqDesk.addEventListener) mqDesk.addEventListener('change', mqChange); else mqDesk.addListener(mqChange);

  nav();
  onRoute();
})();
