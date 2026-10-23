/* Painel — dados fictícios da demo e cálculos.
   Tudo deriva de window.DV (serviços, barbeiros, planos, produtos, unidades) e de DV.rng,
   então a apresentação mostra sempre os mesmos números. Os KPIs, a DRE, as comissões e o
   caixa saem da MESMA lista de atendimentos/vendas/cobranças — por isso fecham entre si. */
(function () {
  'use strict';
  const DV = window.DV;
  const R = DV.rng;
  const rnd = (a, b) => a + R() * (b - a);
  const int = (a, b) => Math.floor(a + R() * (b - a + 1));
  const pick = a => a[Math.floor(R() * a.length)];
  const chance = p => R() < p;
  function weighted(items, w) {
    const tot = items.reduce((s, it) => s + w(it), 0);
    let x = R() * tot;
    for (const it of items) { x -= w(it); if (x <= 0) return it; }
    return items[items.length - 1];
  }
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };
  const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

  /* ---------- Calendário ---------- */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const D = today.getDate();
  const dayCache = [];
  function dayDate(ago) {
    if (!dayCache[ago]) { const d = new Date(today); d.setDate(d.getDate() - ago); dayCache[ago] = d; }
    return dayCache[ago];
  }
  const hoursOf = d => DV.business.hours[d.getDay()] || null;
  const isOpenAgo = ago => !!hoursOf(dayDate(ago));
  // Visita que cairia em dia fechado vai para o dia anterior — por isso o sábado fica mais cheio, como na vida real.
  function openAgo(ago) { let a = ago, g = 0; while (!isOpenAgo(a) && g++ < 7) a++; return a; }

  // Se hoje estiver fechado (domingo), a agenda usa o horário do primeiro dia aberto para a demo não ficar vazia.
  const H = hoursOf(today) || Object.values(DV.business.hours).find(Boolean) || ['09:00', '19:00'];
  const OPEN = toMin(H[0]), CLOSE = toMin(H[1]);
  const real = new Date();
  // Relógio da demo preso dentro do expediente: mostrada às 7h ou às 22h, a agenda ainda tem passado, presente e futuro.
  const NOW = Math.round(Math.min(Math.max(real.getHours() * 60 + real.getMinutes(), OPEN + 150), CLOSE - 90));

  /* ---------- Catálogo ---------- */
  const units = (DV.units && DV.units.length) ? DV.units : [{ id: 'u1', name: DV.business.neighborhood || 'Matriz', rating: DV.business.rating, reviewsCount: DV.business.reviewsCount }];
  const unitById = Object.fromEntries(units.map(u => [u.id, u]));
  // Barbeiro sem campo unit é distribuído em rodízio entre as unidades (determinístico pela ordem do DV).
  const barbers = DV.barbers.map((b, i) => Object.assign({}, b, { unit: unitById[b.unit] ? b.unit : units[i % units.length].id }));
  const barberById = Object.fromEntries(barbers.map(b => [b.id, b]));
  // Combo derivado "Corte + Barba": o DV lista serviços avulsos, mas na cadeira o cliente costuma fazer
  // os dois na mesma visita (é a referência de R$120 do Vintage Club). Só existe se ambos existirem.
  const SERVICES = DV.services.slice();
  {
    const c1 = DV.services.find(x => x.id === 'corte'), c2 = DV.services.find(x => x.id === 'barba');
    if (c1 && c2) SERVICES.push({ id: 'corte+barba', name: 'Corte + Barba', price: c1.price + c2.price, durationMin: c1.durationMin + c2.durationMin, category: 'Combo', parts: ['corte', 'barba'] });
  }
  const svc = Object.fromEntries(SERVICES.map(s => [s.id, s]));
  const plans = DV.plans || [];
  const planById = Object.fromEntries(plans.map(p => [p.id, p]));
  const offers = (b, sid) => !b.services || (svc[sid] && svc[sid].parts ? svc[sid].parts.every(x => b.services.includes(x)) : b.services.includes(sid));

  // Peso de escolha de serviço: corte e combo dominam o movimento; química e tratamentos são raros.
  // Ids desconhecidos (serviço novo no DV) pesam pouco para não distorcer o mix.
  const SVC_W = { corte: 6, 'corte+barba': 5, barba: 3, 'barba-express': 2, pezinho: 1.2, raspar: 1, 'sobrancelha-navalha': .8 };
  const svcW = s => SVC_W[s.id] || .25;

  // Cobertura do plano lida do texto (nome + benefícios): "corte"/"barba". Se os planos mudarem de nome
  // sem citar o serviço, o plano passa a não cobrir nada e os atendimentos viram avulsos.
  const KEYS = ['corte', 'barba'];
  const svcKeys = s => KEYS.filter(k => norm(s.name).includes(k));
  const planKeyCache = {};
  const planKeys = p => planKeyCache[p.id] || (planKeyCache[p.id] = KEYS.filter(k => norm(p.name + ' ' + (p.perks || []).join(' ')).includes(k)));
  // Ordem de prioridade: plan.covers (ids) > service.inPlan > texto do plano.
  function coversId(plan, s) {
    if (Array.isArray(plan.covers)) return plan.covers.includes(s.id);
    if (typeof s.inPlan === 'boolean') return s.inPlan;
    const pk = planKeys(plan), sk = svcKeys(s); return sk.length > 0 && sk.every(k => pk.includes(k));
  }
  function covers(plan, s) { if (!plan || !s) return false; return s.parts ? s.parts.every(id => svc[id] && coversId(plan, svc[id])) : coversId(plan, s); }
  const coveredSvcs = plan => SERVICES.filter(s => covers(plan, s));
  // Desconto do assinante nos serviços fora do plano (Vintage Club: 10% OFF).
  const SUB_OFF = .9;
  // Comissão de assinatura: o cliente não paga na hora, então o barbeiro recebe comissão sobre um valor de
  // referência = 50% da tabela. Se o dono usar outra regra (valor fixo por atendimento), muda só aqui.
  const SUB_REF = .5;

  const products = DV.products.map(p => Object.assign({}, p));
  // Estoque do DV é o total da rede; dividido entre unidades para o filtro por unidade (soma confere com o total).
  const stockU = {};
  products.forEach(p => {
    stockU[p.id] = {};
    const base = Math.floor(p.stock / units.length); let rest = p.stock - base * units.length;
    units.forEach(u => { stockU[p.id][u.id] = base + (rest-- > 0 ? 1 : 0); });
  });

  const METHODS = [['pix', .45], ['cartao', .37], ['dinheiro', .18]];
  const payMethod = () => weighted(METHODS, m => m[1])[0];

  /* ---------- Clientes e histórico ---------- */
  const FIRST = ['João', 'Pedro', 'Lucas', 'Gabriel', 'Matheus', 'Rafael', 'Felipe', 'Bruno', 'Thiago', 'Gustavo', 'Leonardo', 'Rodrigo', 'Diego', 'André', 'Carlos', 'Eduardo', 'Marcelo', 'Fernando', 'Ricardo', 'Vinícius', 'Daniel', 'Igor', 'Caio', 'Renan', 'Henrique', 'Paulo', 'Antônio', 'Francisco', 'Raimundo', 'Luiz', 'Samuel', 'Davi', 'Arthur', 'Heitor', 'Miguel', 'Enzo', 'Murilo', 'Otávio', 'Alisson', 'Cléber', 'Railson', 'Edson', 'Márcio', 'Alex', 'Kauã', 'Breno', 'Victor', 'Hugo', 'Nathan', 'Wellington', 'Elias', 'Josué', 'Marcos', 'Sérgio', 'Roberto'];
  const LAST = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Araújo', 'Ribeiro', 'Gomes', 'Martins', 'Barbosa', 'Rocha', 'Dias', 'Moura', 'Cavalcante', 'Freitas', 'Mendes', 'Cunha', 'Teixeira', 'Nogueira', 'Correia', 'Cardoso', 'Monteiro', 'Batista', 'Farias', 'Brito', 'Maciel', 'Queiroz', 'Sales', 'Vieira', 'Lopes', 'Pinheiro', 'Melo', 'Castro'];

  // Dimensionado para a rede real (3 unidades, ~5 barbeiros, R$60–90 mil/mês): ~160 clientes por cadeira,
  // ~17% assinantes (é a casa "por assinatura"), ~8 atendimentos/dia por barbeiro. Mudou a equipe, escala junto.
  const NC = Math.max(240, barbers.length * 160);
  const clients = [], visits = [], usedNames = new Set();
  const planPool = plans.filter(p => coveredSvcs(p).length);
  const SUB_METHODS = [['cartao', .55], ['pix', .3], ['boleto', .15]];

  function addVisit(c, ago) {
    const plan = planById[c.plan];
    const subActive = c.sub && ago <= c.sub.sinceDays;
    let s = chance(.8) ? svc[c.fav] : (subActive ? pick(coveredSvcs(plan)) : weighted(SERVICES, svcW));
    if (!s) s = SERVICES[0];
    let b = barberById[c.pref];
    if (!chance(.8)) { const same = barbers.filter(x => x.unit === b.unit); b = chance(.92) ? pick(same) : pick(barbers); }
    if (!offers(b, s.id)) b = barbers.find(x => x.unit === barberById[c.pref].unit && offers(x, s.id)) || barbers.find(x => offers(x, s.id)) || b;
    const plano = subActive && covers(plan, s);
    const v = { c: c.id, b: b.id, u: b.unit, s: s.id, ago, price: plano ? 0 : (subActive ? +(s.price * SUB_OFF).toFixed(2) : s.price), method: plano ? 'plano' : payMethod() };
    c.visits.push(v); visits.push(v);
  }

  for (let i = 0; i < NC; i++) {
    let name, g = 0;
    do { name = pick(FIRST) + ' ' + pick(LAST); if (usedNames.has(name)) name += ' ' + pick(LAST); } while (usedNames.has(name) && g++ < 20);
    usedNames.add(name);
    const pref = pick(barbers);
    const plan = planPool.length && chance(.175) ? weighted(planPool, p => p.highlight ? 1.7 : 1) : null;
    const lapsed = !plan && chance(.05);
    const isNew = !lapsed && !plan && chance(.07);
    const freq = plan ? int(8, 13) : int(18, 42);
    let since = isNew ? int(3, 28) : int(60, 720);
    const favPool = (plan ? coveredSvcs(plan) : SERVICES).filter(s => offers(pref, s.id));
    const fav = weighted(favPool.length ? favPool : SERVICES, svcW);
    const c = {
      id: 'c' + (i + 1), name, unit: pref.unit,
      phone: `(68) 9${int(8100, 9999)}-${String(int(0, 9999)).padStart(4, '0')}`,
      birth: { d: int(1, 28), m: int(0, 11) },
      pref: pref.id, fav: fav.id, freq, plan: plan ? plan.id : null, sub: null, visits: [], campaignAt: null,
    };
    if (plan) {
      const sinceDays = int(30, 420);
      since = Math.max(since, sinceDays + int(0, 200));
      const method = weighted(SUB_METHODS, m => m[1])[0];
      const dueDay = int(1, 28);
      let status, paidDay = null, paidThisMonth = false;
      if (dueDay < D) {
        // Atraso proporcional à forma: cartão quase nunca falha, boleto é quem mais atrasa.
        const late = { cartao: .02, pix: .08, boleto: .18 }[method];
        if (chance(late)) status = 'vencido';
        else { status = 'confirmado'; paidDay = Math.max(1, dueDay - (method === 'cartao' ? 0 : int(0, 2))); paidThisMonth = true; }
      } else if (dueDay === D) {
        if (chance(.5)) { status = 'confirmado'; paidDay = D; paidThisMonth = true; } else status = 'pendente';
      } else status = dueDay - D <= 7 ? 'pendente' : 'confirmado';
      c.sub = { plan: plan.id, method, dueDay, status, paidDay, paidThisMonth, sinceDays, resentAt: null, webhookAt: null };
    }
    c.since = since;
    const last = lapsed ? int(46, 140) : Math.min(since, int(1, freq));
    const cap = Math.min(since, 420);
    let ago = last;
    while (ago <= cap) {
      const a = openAgo(ago);
      if (a > cap + 6) break;
      addVisit(c, a);
      ago = a + Math.max(5, Math.round(freq * rnd(.7, 1.3)));
    }
    clients.push(c);
  }
  const clientById = Object.fromEntries(clients.map(c => [c.id, c]));
  const subs = () => clients.filter(c => c.sub);

  // Garante ao menos 2 cobranças vencidas para a demo do fluxo de bloqueio/webhook.
  if (D > 3) {
    let late = subs().filter(c => c.sub.status === 'vencido').length;
    for (const c of subs()) {
      if (late >= 2) break;
      if (c.sub.method !== 'cartao' && c.sub.status === 'confirmado' && c.sub.dueDay < D) {
        Object.assign(c.sub, { status: 'vencido', paidDay: null, paidThisMonth: false }); late++;
      }
    }
  }
  // Cancelamentos dos últimos 30 dias por plano (para churn).
  const cancelled = Object.fromEntries(plans.map(p => [p.id, Math.max(1, Math.round(clients.filter(c => c.plan === p.id).length * rnd(.015, .04)))]));

  /* ---------- Vendas de produtos (60 dias) ---------- */
  const sales = [];
  // Item barato (bebida) gira muito; item caro (máquina, relógio) raramente.
  const prodW = p => p.price < 15 ? 5 : p.price > 180 ? .3 : 1;
  for (let ago = 60; ago >= 1; ago--) {
    if (!isOpenAgo(ago)) continue;
    units.forEach(u => {
      const n = int(0, 3);
      for (let k = 0; k < n; k++) { const p = weighted(products, prodW); sales.push({ ago, u: u.id, p: p.id, qty: 1, price: p.price, cost: p.cost, method: payMethod(), time: null }); }
    });
  }

  /* ---------- Agenda de hoje ---------- */
  const r15 = m => Math.round(m / 15) * 15;
  const blocks = [];
  barbers.forEach((b, i) => {
    const ls = r15(Math.max(OPEN + 120, Math.min(CLOSE - 150, 720 + (i % 3) * 30)));
    blocks.push({ b: b.id, start: ls, end: ls + 60, label: 'Intervalo · almoço', kind: 'intervalo' });
    if (i % 3 === 2) { const s = r15(Math.min(CLOSE - 75, 930)); blocks.push({ b: b.id, start: s, end: s + 45, label: 'Bloqueado · compromisso', kind: 'bloqueio' }); }
  });

  const appts = [];
  const busy = new Set();
  const eligible = clients.filter(c => c.visits.length && c.visits[0].ago >= 6 && c.visits[0].ago < 45);
  // Um assinante com cobrança vencida agendado à tarde: é a deixa para mostrar o bloqueio automático do plano.
  let forcedLate = clients.find(c => c.sub && c.sub.status === 'vencido' && coveredSvcs(planById[c.plan]).some(s => offers(barbers[0], s.id)));
  let seq = 0;
  barbers.forEach(b => {
    const bb = blocks.filter(x => x.b === b.id).sort((x, y) => x.start - y.start);
    const offered = SERVICES.filter(s => offers(b, s.id));
    let t = OPEN;
    while (t < CLOSE) {
      const blk = bb.find(x => t >= x.start && t < x.end);
      if (blk) { t = blk.end; continue; }
      // ~30% de buracos de 15 min deixa a ocupação na faixa de 65–75%, realista e com espaço para encaixe.
      if (chance(.3)) { t += chance(.5) ? 30 : 15; continue; }
      const nb = bb.find(x => x.start >= t);
      const limit = nb ? nb.start : CLOSE;
      let c;
      if (b === barbers[0] && forcedLate && t >= NOW + 30) { c = forcedLate; forcedLate = null; }
      else {
        const mine = eligible.filter(x => !busy.has(x.id) && x.pref === b.id);
        const unit = eligible.filter(x => !busy.has(x.id) && x.unit === b.unit);
        c = (mine.length && chance(.7)) ? pick(mine) : (unit.length ? pick(unit) : pick(eligible));
      }
      if (!c) break;
      const plan = planById[c.plan];
      let s = svc[c.fav];
      if (!s || !offers(b, s.id)) s = plan ? (coveredSvcs(plan).find(x => offers(b, x.id)) || weighted(offered, svcW)) : weighted(offered, svcW);
      let dur = Math.ceil(s.durationMin / 15) * 15;
      if (t + dur > limit) {
        const short = offered.filter(x => Math.ceil(x.durationMin / 15) * 15 <= limit - t);
        if (!short.length) { t = limit; continue; }
        s = pick(short); dur = Math.ceil(s.durationMin / 15) * 15;
      }
      const a = { id: 'a' + (++seq), c: c.id, b: b.id, u: b.unit, s: s.id, start: t, end: t + dur, status: 'confirmado', price: null, method: null };
      if (a.end <= NOW) {
        if (chance(.06)) a.status = 'faltou';
        else { a.status = 'concluido'; const pl = planCovers(c, s); a.method = pl ? 'plano' : payMethod(); a.price = pl ? 0 : priceFor(c, s); }
      } else if (a.start <= NOW) a.status = 'atendimento';
      appts.push(a); busy.add(c.id);
      t += dur;
    }
  });
  if (!appts.some(a => a.status === 'faltou')) {
    const done = appts.filter(a => a.status === 'concluido');
    if (done.length > 4) Object.assign(done[2], { status: 'faltou', price: null, method: null });
  }

  // Vendas de produto da manhã de hoje.
  units.forEach(u => {
    const n = NOW > OPEN + 60 ? int(1, 2) : 0;
    for (let k = 0; k < n; k++) { const p = weighted(products, prodW); sales.push({ ago: 0, u: u.id, p: p.id, qty: 1, price: p.price, cost: p.cost, method: payMethod(), time: r15(int(OPEN + 30, NOW - 10)) }); }
  });

  function priceFor(c, s) { return c && c.sub && c.sub.status !== 'vencido' ? +(s.price * SUB_OFF).toFixed(2) : s.price; }
  function planCovers(c, s) {
    return !!(c && c.sub && c.sub.status !== 'vencido' && covers(planById[c.plan], s));
  }

  /* ---------- Despesas e contas a pagar (por unidade, competência do mês) ---------- */
  const bills = [];
  const EXP = [
    ['aluguel', 'Aluguel', 'Aluguel do salão', [2600, 3200], 5],
    ['energia', 'Energia', 'Energia elétrica', [520, 760], 27],
    ['agua', 'Água', 'Água e esgoto', [120, 190], 25],
    ['internet', 'Internet', 'Internet fibra', [119.9, 119.9], 15],
    ['material', 'Material', 'Lâminas, toalhas e descartáveis', [340, 520], 10],
    ['limpeza', 'Limpeza', 'Limpeza e higiene', [150, 220], 8],
    ['contador', 'Contabilidade', 'Honorários contábeis (rateio)', [300, 300], 30],
    ['marketing', 'Marketing', 'Impulsionamento Instagram (rateio)', [250, 250], 12],
  ];
  units.forEach(u => {
    EXP.forEach(([id, cat, desc, [a, b], due]) => {
      const value = Math.round(rnd(a, b) / 10) * 10 || a;
      bills.push({ id: `${u.id}-${id}`, u: u.id, cat, desc, value: a === b ? a : value, due, paid: due < D, stock: false });
    });
    // Compra de estoque: conta a pagar que NÃO entra na DRE (vira CMV só quando o produto é vendido).
    bills.push({ id: `${u.id}-fornecedor`, u: u.id, cat: 'Estoque', desc: 'Fornecedor de cosméticos (boleto)', value: Math.round(rnd(480, 900) / 10) * 10, due: Math.min(28, D + int(2, 5)), paid: false, stock: true });
  });

  const meta = Object.fromEntries(barbers.map(b => [b.id, { rating: +(rnd(4.7, 5)).toFixed(1), reviews: int(30, 160), closedAt: null }]));

  /* ---------- Seleção por unidade ---------- */
  const S = { unit: 'all', version: 0 };
  const inU = u => S.unit === 'all' || S.unit === u;
  const barbersU = () => barbers.filter(b => inU(b.unit));
  const apptsU = () => appts.filter(a => inU(a.u));

  /* ---------- Cálculos ---------- */
  const statCache = new Map();
  function clientStats(c) {
    const hit = statCache.get(c.id);
    if (hit && hit.v === S.version) return hit.s;
    const done = appts.filter(a => a.c === c.id && a.status === 'concluido').map(a => ({ ago: 0, price: a.price, b: a.b, s: a.s, method: a.method }));
    const all = done.concat(c.visits);
    const n = all.length;
    const lastAgo = n ? all[0].ago : null;
    const histLast = c.visits.length ? c.visits[0].ago : null;
    const freq = n > 1 ? Math.round((all[n - 1].ago - all[0].ago) / (n - 1)) : null;
    const spent = sum(all, v => v.price || 0);
    const subMonths = c.sub ? Math.max(1, Math.round(c.sub.sinceDays / 30)) : 0;
    const ltv = spent + (c.sub ? subMonths * planById[c.plan].price : 0);
    const paid = all.filter(v => v.price > 0);
    const cnt = {}; all.forEach(v => { cnt[v.b] = (cnt[v.b] || 0) + 1; });
    const favB = Object.keys(cnt).sort((x, y) => cnt[y] - cnt[x])[0] || c.pref;
    const nextIn = freq != null && lastAgo != null ? freq - lastAgo : null;
    const s = {
      n, lastAgo, freq, ltv, subMonths, ticket: paid.length ? spent / paid.length : 0, favB, nextIn,
      lapsed: histLast != null && histLast >= 45 && lastAgo !== 0,
      bday: c.birth.m === today.getMonth(),
      isNew: c.since <= 30,
      vip: ltv >= VIP_MIN,
    };
    statCache.set(c.id, { v: S.version, s });
    return s;
  }
  // VIP = top 8% em LTV no histórico (fixado na carga para a etiqueta não "piscar" durante a demo).
  let VIP_MIN = Infinity;
  {
    const l = clients.map(c => sum(c.visits, v => v.price) + (c.sub ? Math.max(1, Math.round(c.sub.sinceDays / 30)) * planById[c.plan].price : 0)).sort((a, b) => b - a);
    VIP_MIN = l[Math.floor(l.length * .08)] || Infinity;
  }

  const CARD_FEE = .0249; // maquininha (débito/crédito médio)
  const ASAAS_FEE = { cartao: v => v * .0299 + .49, pix: () => 1.99, boleto: () => 1.99 };

  // Mês corrente até hoje (ago 0..D-1). Atendimentos de assinante entram na comissão pelo valor de tabela.
  function monthStats() {
    const per = {}; barbersU().forEach(b => { per[b.id] = { fat: 0, n: 0, subN: 0, subVal: 0, today: 0 }; });
    let serv = 0, atend = 0, avulsos = 0, cardRev = 0;
    const add = v => {
      const pb = per[v.b]; if (!pb) return;
      atend++; pb.n++;
      if (v.method === 'plano') { pb.subN++; pb.subVal += svc[v.s].price * SUB_REF; }
      else { serv += v.price; avulsos++; pb.fat += v.price; if (v.method === 'cartao') cardRev += v.price; }
    };
    visits.forEach(v => { if (v.ago < D) add(v); });
    appts.forEach(a => { if (a.status === 'concluido') { add(a); if (per[a.b]) per[a.b].today++; } });
    let prod = 0, cmv = 0, prodN = 0;
    sales.forEach(s => { if (s.ago < D && inU(s.u)) { prod += s.price * s.qty; cmv += s.cost * s.qty; prodN += s.qty; if (s.method === 'cartao') cardRev += s.price * s.qty; } });
    let subsRev = 0, subsFee = 0;
    subs().forEach(c => { if (c.sub.paidThisMonth && inU(c.unit)) { const p = planById[c.plan].price; subsRev += p; subsFee += ASAAS_FEE[c.sub.method](p); } });
    const fees = cardRev * CARD_FEE + subsFee;
    let comm = 0;
    barbersU().forEach(b => { const pb = per[b.id]; pb.comm = (b.commission || 0) / 100 * (pb.fat + pb.subVal); pb.ticket = pb.n - pb.subN ? pb.fat / (pb.n - pb.subN) : 0; comm += pb.comm; });
    const opBills = bills.filter(x => !x.stock && inU(x.u));
    const exp = sum(opBills, x => x.value);
    const receita = serv + subsRev + prod;
    return { per, serv, atend, avulsos, prod, prodN, cmv, subsRev, fees, comm, exp, opBills, receita, lucro: receita - fees - comm - cmv - exp, ticket: avulsos ? serv / avulsos : 0 };
  }

  // Mesmo período do mês anterior (dias 1..D), só serviços + produtos, para a variação do Início.
  function prevPeriod() {
    const ref = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const inPrev = d => d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear() && d.getDate() <= D;
    let v = 0;
    visits.forEach(x => { if (inU(x.u) && inPrev(dayDate(x.ago))) v += x.price; });
    sales.forEach(x => { if (inU(x.u) && inPrev(dayDate(x.ago))) v += x.price * x.qty; });
    return v;
  }

  function dayStats() {
    const list = apptsU();
    const done = list.filter(a => a.status === 'concluido');
    const caixa = { pix: 0, cartao: 0, dinheiro: 0, assinatura: 0 };
    const movs = [];
    done.forEach(a => { if (a.price > 0) caixa[a.method] += a.price; movs.push({ t: a.doneAt || a.end, label: `${clientById[a.c].name} · ${svc[a.s].name}`, v: a.price, m: a.method, u: a.u }); });
    sales.forEach(s => { if (s.ago === 0 && inU(s.u)) { caixa[s.method] += s.price * s.qty; movs.push({ t: s.time, label: `Venda · ${s.qty}× ${products.find(p => p.id === s.p).name}`, v: s.price * s.qty, m: s.method, u: s.u }); } });
    subs().forEach(c => { if (c.sub.paidDay === D && c.sub.paidThisMonth && inU(c.unit)) { const p = planById[c.plan].price; caixa.assinatura += p; movs.push({ t: c.sub.webhookAt || OPEN + 5, label: `${DV.business.clubName || 'Assinatura'} · ${clientById[c.id].name}`, v: p, m: 'assinatura', u: c.unit }); } });
    movs.sort((a, b) => b.t - a.t);
    const total = caixa.pix + caixa.cartao + caixa.dinheiro + caixa.assinatura;
    const bars = barbersU();
    let avail = 0;
    bars.forEach(b => { avail += CLOSE - OPEN - sum(blocks.filter(x => x.b === b.id), x => x.end - x.start); });
    const booked = sum(list.filter(a => a.status !== 'faltou'), a => a.end - a.start);
    return {
      total, caixa, movs, done: done.length, booked: list.filter(a => a.status !== 'faltou').length,
      faltas: list.filter(a => a.status === 'faltou').length,
      inService: list.filter(a => a.status === 'atendimento').length,
      occ: avail ? booked / avail : 0,
      ticket: done.filter(a => a.price > 0).length ? (caixa.pix + caixa.cartao + caixa.dinheiro - sum(movs.filter(m => m.label.startsWith('Venda')), m => m.v)) / done.filter(a => a.price > 0).length : 0,
    };
  }

  function occOf(unitId) {
    const bars = barbers.filter(b => b.unit === unitId);
    let avail = 0; bars.forEach(b => { avail += CLOSE - OPEN - sum(blocks.filter(x => x.b === b.id), x => x.end - x.start); });
    const booked = sum(appts.filter(a => a.u === unitId && a.status !== 'faltou'), a => a.end - a.start);
    return avail ? booked / avail : 0;
  }

  // Faturamento diário (serviços + produtos) dos últimos 30 dias; assinaturas ficam de fora porque
  // concentram nos dias de vencimento e distorcem a leitura do movimento do salão.
  function series30() {
    const arr = new Array(30).fill(0);
    visits.forEach(v => { if (v.ago < 30 && inU(v.u)) arr[v.ago] += v.price; });
    sales.forEach(s => { if (s.ago < 30 && inU(s.u)) arr[s.ago] += s.price * s.qty; });
    appts.forEach(a => { if (a.status === 'concluido' && inU(a.u)) arr[0] += a.price; });
    return arr.map((v, ago) => ({ ago, date: dayDate(ago), v, open: isOpenAgo(ago) })).reverse();
  }

  function subsStats() {
    const list = subs().filter(c => inU(c.unit));
    const by = {};
    plans.forEach(p => { by[p.id] = { n: 0, mrr: 0, late: 0, lateV: 0, cancel: cancelled[p.id] || 0 }; });
    let mrr = 0, lateV = 0, late = 0, pend = 0;
    list.forEach(c => {
      const p = planById[c.plan]; const b = by[p.id];
      b.n++; b.mrr += p.price; mrr += p.price;
      if (c.sub.status === 'vencido') { b.late++; b.lateV += p.price; late++; lateV += p.price; }
      if (c.sub.status === 'pendente') pend++;
    });
    // Cancelamentos são da rede; no filtro por unidade, proporcionais ao tamanho da base da unidade.
    const share = subs().length ? list.length / subs().length : 0;
    let canc = 0;
    plans.forEach(p => { by[p.id].cancel = Math.round((cancelled[p.id] || 0) * share); canc += by[p.id].cancel; by[p.id].churn = by[p.id].n + by[p.id].cancel ? by[p.id].cancel / (by[p.id].n + by[p.id].cancel) : 0; });
    const perUnit = units.map(u => { const l = subs().filter(c => c.unit === u.id); return { u, n: l.length, mrr: sum(l, c => planById[c.plan].price), late: l.filter(c => c.sub.status === 'vencido').length }; });
    return { list, by, n: list.length, mrr, late, lateV, pend, canc, churn: list.length + canc ? canc / (list.length + canc) : 0, perUnit };
  }

  const stockOf = p => S.unit === 'all' ? p.stock : stockU[p.id][S.unit];
  const minOf = p => S.unit === 'all' ? p.min : Math.ceil(p.min / units.length);

  /* ---------- Mutações (em memória) ---------- */
  const bump = () => { S.version++; };
  const act = {
    checkIn(id) { const a = appts.find(x => x.id === id); if (a) { a.status = 'atendimento'; a.checkInAt = NOW; bump(); } },
    conclude(id, method) {
      const a = appts.find(x => x.id === id); if (!a) return;
      const s = svc[a.s];
      a.status = 'concluido'; a.method = method; a.price = method === 'plano' ? 0 : priceFor(clientById[a.c], s); a.doneAt = Math.max(NOW, a.start); bump();
    },
    noShow(id) { const a = appts.find(x => x.id === id); if (a) { a.status = 'faltou'; bump(); } },
    addAppt({ name, b, s, start }) {
      const nn = norm(name).trim();
      let c = clients.find(x => norm(x.name) === nn);
      const bar = barberById[b];
      if (!c) {
        c = { id: 'c' + (clients.length + 1), name: name.trim(), unit: bar.unit, phone: '(68) 9 0000-0000', birth: { d: 1, m: (today.getMonth() + 6) % 12 }, pref: b, fav: s, freq: 30, plan: null, sub: null, visits: [], since: 0, campaignAt: null };
        clients.unshift(c); clientById[c.id] = c;
      }
      const sv = svc[s];
      const a = { id: 'a' + (++seq), c: c.id, b, u: bar.unit, s, start, end: start + Math.ceil(sv.durationMin / 15) * 15, status: 'confirmado', price: null, method: null, isNew: true };
      appts.push(a); bump(); return a;
    },
    sell(pid, qty, method) {
      const p = products.find(x => x.id === pid); if (!p) return;
      const u = S.unit === 'all' ? units.reduce((best, x) => stockU[pid][x.id] > stockU[pid][best.id] ? x : best, units[0]).id : S.unit;
      qty = Math.min(qty, stockU[pid][u]);
      if (qty <= 0) return 0;
      stockU[pid][u] -= qty; p.stock -= qty;
      sales.push({ ago: 0, u, p: pid, qty, price: p.price, cost: p.cost, method, time: Math.max(NOW, real.getHours() * 60 + real.getMinutes()) });
      bump(); return qty;
    },
    stockIn(pid, qty) {
      const p = products.find(x => x.id === pid); if (!p) return;
      const u = S.unit === 'all' ? units.reduce((low, x) => stockU[pid][x.id] < stockU[pid][low.id] ? x : low, units[0]).id : S.unit;
      stockU[pid][u] += qty; p.stock += qty; bump(); return u;
    },
    resend(cid) { const c = clientById[cid]; if (c && c.sub) { c.sub.resentAt = Date.now(); bump(); } },
    webhook(cid) {
      const c = clientById[cid]; if (!c || !c.sub) return;
      Object.assign(c.sub, { status: 'confirmado', paidDay: D, paidThisMonth: true, webhookAt: Math.max(NOW, real.getHours() * 60 + real.getMinutes()) });
      bump();
    },
    payBill(id) { const b = bills.find(x => x.id === id); if (b) { b.paid = true; bump(); } },
    closeCommission(bid) { if (meta[bid]) { meta[bid].closedAt = new Date(); bump(); } },
    campaign(ids) { ids.forEach(id => { if (clientById[id]) clientById[id].campaignAt = Date.now(); }); bump(); },
    setUnit(u) { S.unit = (u === 'all' || unitById[u]) ? u : 'all'; bump(); },
  };

  // Horários livres de um barbeiro hoje, a partir de agora, que comportam a duração pedida.
  function freeSlots(bid, durMin) {
    const dur = Math.ceil(durMin / 15) * 15;
    const taken = appts.filter(a => a.b === bid && a.status !== 'faltou').map(a => [a.start, a.end])
      .concat(blocks.filter(x => x.b === bid).map(x => [x.start, x.end]));
    const out = [];
    for (let t = Math.ceil((NOW + 5) / 15) * 15; t + dur <= CLOSE; t += 15) {
      if (!taken.some(([s, e]) => t < e && t + dur > s)) out.push(t);
    }
    return out;
  }

  window.DVP = {
    S, today, D, NOW, OPEN, CLOSE, hhmm, norm, dayDate, units, unitById, barbers, barberById, svc, plans, planById,
    clients, clientById, visits, appts, blocks, sales, bills, products, stockU, meta, cancelled,
    SERVICES, SUB_OFF, SUB_REF, priceFor, covers, coveredSvcs, planCovers, offers, inU, barbersU, apptsU, clientStats, monthStats, prevPeriod, dayStats,
    series30, subsStats, occOf, stockOf, minOf, freeSlots, act, subs,
  };
})();
