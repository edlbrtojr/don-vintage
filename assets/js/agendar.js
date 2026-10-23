/* Fluxo de agendamento (e de assinatura do clube) sem backend.
   Todos os dados vêm de window.DV; agenda ocupada é fictícia e determinística. */
(function () {
  'use strict';
  const DV = window.DV;
  const B = DV.business || {};
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (v) => DV.fmt.brl(v);
  const dur = (m) => DV.fmt.dur(m);
  const units = DV.units && DV.units.length ? DV.units : [{ id: 'principal', name: B.neighborhood || B.name, address: B.address, whatsapp: B.whatsapp, mapsUrl: B.mapsUrl, rating: B.rating, reviewsCount: B.reviewsCount }];
  const clubName = B.clubName || 'Clube';
  const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const WD_L = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const MO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MO_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  // "Mais pedidos" vem primeiro na lista de serviços; ids que não existirem em data.js são ignorados.
  const FEATURED = ['corte', 'barba', 'barba-express', 'pezinho'];
  // Desconto do assinante nos serviços fora do plano. data.js só traz isso como texto do perk
  // ("10% OFF em todos os outros serviços"); se o plano ganhar um campo numérico, ler dele.
  const SUB_DISCOUNT = 0.10;
  // Antecedência mínima para horários de hoje: evita marcar um slot que começa enquanto o cliente ainda digita.
  const MIN_LEAD_MIN = 30;
  const SLOT = 15;
  const CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* ---------- Tempo de Rio Branco ----------
     A agenda é no horário do Acre (UTC-5, sem horário de verão desde 2019), não no do
     aparelho. Representamos "relógio de Rio Branco" em objetos Date lidos com getUTC*.
     Se o Acre voltar a ter horário de verão, trocar por Intl com 'America/Rio_Branco'. */
  const TZ_OFF_H = 5;
  const nowRB = () => new Date(Date.now() - TZ_OFF_H * 3600e3);
  const keyOf = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const todayKey = () => keyOf(nowRB());
  const days14 = () => { const n = nowRB(); return Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + i))); };
  function dayLabel(k, long) {
    const d = fromKey(k); const t = fromKey(todayKey());
    const diff = Math.round((d - t) / 864e5);
    if (!long && diff === 0) return 'Hoje';
    if (!long && diff === 1) return 'Amanhã';
    return long ? `${WD_L[d.getUTCDay()]}, ${d.getUTCDate()} de ${MO_L[d.getUTCMonth()]}` : `${WD[d.getUTCDay()]} ${d.getUTCDate()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  /* ---------- Agenda fictícia determinística ----------
     DV.rng é uma sequência única: consumi-la aqui faria a ocupação depender da ordem
     em que o cliente navega. Por isso cada barbeiro+dia tem a própria semente (mesmo
     algoritmo do DV.rng), e a agenda é sempre a mesma em toda apresentação. */
  function seeded(str) {
    let h = 2166136261 ^ 20261023;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    let seed = h;
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const busyCache = new Map();
  function busyFor(barberId, k) {
    const ck = barberId + '|' + k;
    if (busyCache.has(ck)) return busyCache.get(ck);
    const wd = fromKey(k).getUTCDay(); const h = B.hours && B.hours[wd];
    if (!h) { busyCache.set(ck, null); return null; }
    const open = toMin(h[0]), n = (toMin(h[1]) - open) / SLOT;
    const busy = new Array(n).fill(false);
    const r = seeded(ck);
    // Sábado mais cheio (~55%) que dia de semana (~40%): é o padrão de movimento de barbearia.
    const p = wd === 6 ? 0.24 : 0.15;
    // Almoço de 1h entre 11h30 e 13h, variando por barbeiro; não existe no sábado.
    if (wd !== 6) { const l = (toMin('11:30') - open) / SLOT + Math.floor(r() * 4); for (let i = l; i < l + 4 && i < n; i++) if (i >= 0) busy[i] = true; }
    for (let i = 0; i < n;) {
      if (!busy[i] && r() < p) { const len = 2 + Math.floor(r() * 4); for (let j = i; j < i + len && j < n; j++) busy[j] = true; i += len; } else i++;
    }
    const res = { open, busy };
    busyCache.set(ck, res);
    return res;
  }
  function freeStarts(barberId, k, total) {
    const ag = busyFor(barberId, k); if (!ag) return [];
    const need = Math.ceil(total / SLOT); const out = [];
    const isToday = k === todayKey(); const n = nowRB(); const nowMin = n.getUTCHours() * 60 + n.getUTCMinutes();
    for (let i = 0; i + need <= ag.busy.length; i++) {
      const start = ag.open + i * SLOT;
      if (isToday && start < nowMin + MIN_LEAD_MIN) continue;
      let ok = true; for (let j = i; j < i + need; j++) if (ag.busy[j]) { ok = false; break; }
      if (ok) out.push(start);
    }
    return out;
  }

  /* ---------- Estado ---------- */
  const qs = new URLSearchParams(location.search);
  const planById = (id) => DV.plans.find(p => p.id === id);
  const S = {
    mode: qs.get('plano') && planById(qs.get('plano')) ? 'plan' : 'book',
    unit: units.length === 1 ? units[0].id : null,
    services: [], barber: null, date: null, time: null, assigned: null,
    name: '', phone: '', subscriber: false, subPlan: (DV.plans.find(p => p.highlight) || DV.plans[0] || {}).id,
    reminder: true, pay: null, cat: 'Mais pedidos',
    planId: qs.get('plano'), planPay: 'card', card: { num: '', exp: '', cvv: '', holder: '' },
    done: false, canceled: false, code: '',
  };
  const STEPS = S.mode === 'plan'
    ? [{ id: 'plano', t: 'Vintage Club' }, { id: 'dados', t: 'Seus dados' }, { id: 'pagamento', t: 'Pagamento' }, { id: 'fim', t: 'Assinatura ativa' }]
    : [{ id: 'unidade', t: 'Unidade' }, { id: 'servicos', t: 'Serviços' }, { id: 'profissional', t: 'Profissional' }, { id: 'horario', t: 'Data e horário' }, { id: 'dados', t: 'Seus dados' }, { id: 'pagamento', t: 'Pagamento' }, { id: 'fim', t: 'Confirmado' }]
      .filter(s => s.id !== 'unidade' || units.length > 1);
  if (S.mode === 'plan') STEPS[0].t = (planById(S.planId) || {}).name || clubName;
  const idx = (id) => STEPS.findIndex(s => s.id === id);
  let cur = 0;

  // Pré-seleção vinda da URL (links do site)
  const svcById = (id) => DV.services.find(s => s.id === id);
  const barberById = (id) => DV.barbers.find(b => b.id === id);
  if (qs.get('unidade') && units.some(u => u.id === qs.get('unidade'))) S.unit = qs.get('unidade');
  const qb = barberById(qs.get('barbeiro'));
  if (qb) { S.barber = qb.id; if (qb.unit) S.unit = qb.unit; }
  const qsvc = svcById(qs.get('servico'));
  if (qsvc && (!qb || qb.services.includes(qsvc.id))) { S.services = [qsvc.id]; if (!FEATURED.includes(qsvc.id)) S.cat = qsvc.category || 'Outros'; }
  if (qs.get('assinante') && planById(qs.get('assinante'))) { S.subscriber = true; S.subPlan = qs.get('assinante'); }

  /* ---------- Regras derivadas ---------- */
  const unit = () => units.find(u => u.id === S.unit) || units[0];
  const selSvcs = () => S.services.map(svcById).filter(Boolean);
  const totalDur = () => selSvcs().reduce((a, s) => a + (s.durationMin || 30), 0);
  const subPlan = () => planById(S.subPlan);
  const covered = (s) => !!(s.inPlan || ((subPlan() || {}).covers || []).includes(s.id));
  const priceOf = (s) => !S.subscriber ? s.price : covered(s) ? 0 : Math.round(s.price * (1 - SUB_DISCOUNT) * 100) / 100;
  const total = () => selSvcs().reduce((a, s) => a + priceOf(s), 0);
  const fullTotal = () => selSvcs().reduce((a, s) => a + s.price, 0);
  const unitBarbers = () => DV.barbers.filter(b => !b.unit || b.unit === S.unit);
  const eligible = () => unitBarbers().filter(b => S.services.every(id => (b.services || []).includes(id)));
  const poolIds = () => S.barber && S.barber !== 'any' ? [S.barber] : eligible().map(b => b.id);
  const barberName = (id) => (barberById(id) || {}).name || '';
  const firstName = () => (S.name.trim().split(/\s+/)[0] || '');
  const phoneDigits = () => S.phone.replace(/\D/g, '');

  function slotsFor(k) {
    const t = totalDur(); const set = new Set();
    poolIds().forEach(id => freeStarts(id, k, t).forEach(m => set.add(m)));
    return [...set].sort((a, b) => a - b);
  }
  function assign(k, min) {
    const t = totalDur();
    return poolIds().find(id => freeStarts(id, k, t).includes(min)) || null;
  }
  function nextFree(id) {
    const t = totalDur();
    for (const d of days14()) { const k = keyOf(d); const f = freeStarts(id, k, t); if (f.length) return `${dayLabel(k)} · ${hhmm(f[0])}`; }
    return null;
  }

  /* ---------- Validação por etapa ---------- */
  function check(id) {
    switch (id) {
      case 'unidade': return S.unit ? '' : 'Escolha uma unidade';
      case 'servicos':
        if (!S.services.length) return 'Escolha pelo menos um serviço';
        if (!eligible().length) return 'Nenhum profissional desta unidade faz todos esses serviços juntos';
        return '';
      case 'profissional': return S.barber ? '' : 'Escolha um profissional';
      case 'horario': return S.date && S.time != null ? '' : 'Escolha o dia e o horário';
      case 'dados':
        if (S.name.trim().length < 2) return 'Informe seu nome';
        if (phoneDigits().length !== 11) return 'Informe o WhatsApp com DDD';
        return '';
      case 'pagamento':
        if (S.mode === 'plan' && S.planPay === 'card') {
          const c = S.card;
          if (c.num.replace(/\D/g, '').length !== 16 || c.exp.replace(/\D/g, '').length !== 4 || c.cvv.length < 3 || c.holder.trim().length < 2) return 'Preencha os dados do cartão';
        }
        return S.mode === 'plan' || S.pay ? '' : 'Escolha a forma de pagamento';
      default: return '';
    }
  }
  const maxReachable = () => { for (let i = 0; i < STEPS.length - 1; i++) if (check(STEPS[i].id)) return i; return S.done ? STEPS.length - 1 : STEPS.length - 2; };

  /* ---------- Componentes ---------- */
  const avatar = (b, s) => `<span class="avatar" style="--s:${s || 52}px">${b.photo ? `<img src="${esc(b.photo)}" alt="">` : esc(DV.fmt.initials(b.name))}</span>`;
  const priceTag = (s) => {
    const p = priceOf(s);
    if (S.subscriber && p !== s.price) return `<b>${p === 0 ? 'R$ 0,00' : brl(p)}</b><small><s>${brl(s.price)}</s>${p === 0 ? ' · plano' : ' · 10% OFF'}</small>`;
    return `<b>${s.priceFrom ? '<small>a partir de </small>' : ''}${brl(s.price)}</b><small>${dur(s.durationMin)}</small>`;
  };
  const badge = '<a class="demo-badge inline" href="index.html"><b>Demo</b> · Proposta</a>';

  /* ---------- Etapas ---------- */
  const R = {};

  R.unidade = () => `
    <h1 class="h-step">Qual unidade?</h1>
    <p class="sub">${esc(B.mission || 'Escolha onde quer ser atendido.')}</p>
    <div class="opts">${units.map(u => `
      <button class="opt ${S.unit === u.id ? 'on' : ''}" data-act="unit" data-id="${esc(u.id)}">
        <span class="pin">DV</span>
        <span class="opt-main"><b>${esc(u.name)}</b><small>${esc(u.address || '')}</small>
          ${u.rating ? `<small class="brass">★ ${Number(u.rating).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}${u.reviewsCount ? ` · ${u.reviewsCount} avaliações` : ''}</small>` : ''}</span>
        <span class="check">${CHECK}</span>
      </button>`).join('')}
    </div>`;

  function svcCats() {
    const cats = [...new Set(DV.services.map(s => s.category || 'Outros'))];
    const feat = FEATURED.filter(svcById);
    return (feat.length ? ['Mais pedidos'] : []).concat(cats);
  }
  function svcList() {
    const b = S.barber && S.barber !== 'any' ? barberById(S.barber) : null;
    const list = S.cat === 'Mais pedidos' ? FEATURED.map(svcById).filter(Boolean) : DV.services.filter(s => (s.category || 'Outros') === S.cat);
    return list.map(s => {
      const no = b && !(b.services || []).includes(s.id);
      return `<button class="opt ${S.services.includes(s.id) ? 'on' : ''}" data-act="svc" data-id="${esc(s.id)}" ${no ? 'disabled' : ''}>
        <span class="check sq">${CHECK}</span>
        <span class="opt-main"><b>${esc(s.name)}</b><small>${no ? `${esc(b.name)} não realiza este serviço` : esc(s.description || '')}</small>
          ${S.subscriber ? '' : s.inPlan ? `<small class="brass">Incluso no ${esc(clubName)}</small>` : ''}</span>
        <span class="opt-side">${priceTag(s)}</span>
      </button>`;
    }).join('');
  }
  function catChips() {
    return svcCats().map(c => {
      const n = c === 'Mais pedidos' ? S.services.filter(id => FEATURED.includes(id)).length : selSvcs().filter(s => (s.category || 'Outros') === c).length;
      return `<button class="chip-btn ${S.cat === c ? 'on' : ''}" data-act="cat" data-id="${esc(c)}">${esc(c)}${n ? ` · ${n}` : ''}</button>`;
    }).join('');
  }
  R.servicos = () => {
    const b = S.barber && S.barber !== 'any' ? barberById(S.barber) : null;
    return `
    <h1 class="h-step">O que vamos fazer?</h1>
    <p class="sub">Escolha um ou mais serviços${units.length > 1 ? ` · Unidade ${esc(unit().name)}` : ''}.</p>
    ${b ? `<div class="banner">${avatar(b, 36)}<span>Agendando com <b>${esc(b.name)}</b></span><button data-act="clearBarber">Trocar</button></div>` : ''}
    ${S.subscriber ? `<div class="banner"><span>✦ Preços de assinante ${esc((subPlan() || {}).name || clubName)}</span></div>` : ''}
    <div class="days cats" id="cats">${catChips()}</div>
    <div class="opts" id="svcList" style="margin-top:8px">${svcList()}</div>`;
  };

  R.profissional = () => {
    const el = eligible(); const out = unitBarbers().length - el.length;
    const any = el.length > 1 ? `
      <button class="opt ${S.barber === 'any' ? 'on' : ''}" data-act="barber" data-id="any">
        <span class="any-ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5M14.5 14.6c2.6-.4 4.9 1.1 5.6 4.4"/></svg></span>
        <span class="opt-main"><b>Sem preferência</b><small>Primeiro horário disponível</small></span>
        <span class="check">${CHECK}</span>
      </button>` : '';
    return `
    <h1 class="h-step">Com quem?</h1>
    <p class="sub">Profissionais da unidade ${esc(unit().name)} que fazem ${S.services.length > 1 ? 'todos os serviços escolhidos' : esc((selSvcs()[0] || {}).name || 'o serviço')}.</p>
    <div class="opts">${any}${el.map(b => {
      const nf = nextFree(b.id);
      return `<button class="opt ${S.barber === b.id ? 'on' : ''}" data-act="barber" data-id="${esc(b.id)}">
        ${avatar(b)}
        <span class="opt-main"><b>${esc(b.name)}</b><small>${esc(b.role || 'Barbeiro')}</small>
          ${nf ? `<small><span class="chip ok" style="margin-top:4px">Próximo: ${esc(nf)}</span></small>` : '<small class="muted">Sem horários nos próximos 14 dias</small>'}</span>
        <span class="check">${CHECK}</span>
      </button>`;
    }).join('')}</div>
    ${out > 0 ? `<p class="note">${out} profissional${out > 1 ? 'is' : ''} da unidade não ${out > 1 ? 'realizam' : 'realiza'} ${S.services.length > 1 ? 'todos esses serviços' : 'esse serviço'}.</p>` : ''}`;
  };

  function slotsHTML() {
    if (!S.date) return '';
    const list = slotsFor(S.date);
    if (!list.length) return `<div class="empty"><b>Sem horários neste dia</b>Tente outro dia ou outro profissional.</div>`;
    const groups = [['Manhã', 0, 720], ['Tarde', 720, 1080], ['Noite', 1080, 1440]];
    return groups.map(([g, a, z]) => {
      const it = list.filter(m => m >= a && m < z); if (!it.length) return '';
      return `<div class="slot-group"><h4 class="label">${g}<small>${it.length} horário${it.length > 1 ? 's' : ''}</small></h4>
        <div class="slots">${it.map(m => `<button class="slot ${S.time === m ? 'on' : ''}" data-act="slot" data-m="${m}">${hhmm(m)}</button>`).join('')}</div></div>`;
    }).join('');
  }
  R.horario = () => {
    const ds = days14().map(d => {
      const k = keyOf(d); const h = B.hours && B.hours[d.getUTCDay()];
      const n = h ? slotsFor(k).length : 0;
      const tag = !h ? 'fechado' : n ? (k === todayKey() ? 'hoje' : `${n} livres`) : (k === todayKey() ? 'encerrado' : 'lotado');
      return `<button class="day ${S.date === k ? 'on' : ''}" data-act="day" data-k="${k}" ${n ? '' : 'disabled'} aria-label="${esc(dayLabel(k, true))}${n ? '' : ' — ' + tag}">
        <span>${WD[d.getUTCDay()]}</span><b>${d.getUTCDate()}</b><em>${n ? (k === todayKey() ? 'hoje' : MO[d.getUTCMonth()]) : tag}</em></button>`;
    }).join('');
    const who = S.barber === 'any' ? 'qualquer profissional' : barberName(S.barber);
    return `
    <h1 class="h-step">Quando?</h1>
    <p class="sub">${dur(totalDur())} com ${esc(who)} · horário de Rio Branco.</p>
    <div class="days" id="days">${ds}</div>
    <p class="day-title" id="dayTitle">${S.date ? esc(dayLabel(S.date, true)) : ''}</p>
    <div id="slots">${slotsHTML()}</div>`;
  };

  R.dados = () => `
    <h1 class="h-step">${S.mode === 'plan' ? 'Quem vai assinar?' : 'Quase lá'}</h1>
    <p class="sub">${S.mode === 'plan' ? 'Seus dados para a assinatura e os recibos mensais.' : 'Para confirmar e lembrar você do horário.'}</p>
    <div class="form">
      <label class="field"><span class="label">Nome</span>
        <input class="input" id="fName" data-in="name" autocomplete="name" autocapitalize="words" enterkeyhint="next" placeholder="Como podemos te chamar?" value="${esc(S.name)}"></label>
      <label class="field"><span class="label">WhatsApp</span>
        <input class="input" id="fPhone" data-in="phone" type="tel" inputmode="numeric" autocomplete="tel-national" enterkeyhint="done" placeholder="(68) 99999-9999" value="${esc(S.phone)}" maxlength="15"></label>
      <p class="err" id="fErr"></p>
      ${S.mode === 'book' && DV.plans.length ? `
      <label class="toggle"><span class="tg-main"><b>Já sou assinante do ${esc(clubName)}</b><small>Serviços do plano saem R$ 0,00 · 10% OFF nos demais</small></span>
        <input type="checkbox" data-in="subscriber" ${S.subscriber ? 'checked' : ''}><span class="sw"></span></label>
      ${S.subscriber && DV.plans.length > 1 ? `<div class="chips-sel">${DV.plans.map(p => `<button class="chip-btn ${S.subPlan === p.id ? 'on' : ''}" data-act="subPlan" data-id="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>` : ''}` : ''}
      <label class="toggle"><span class="tg-main"><b>Lembrete pelo WhatsApp</b><small>${S.mode === 'plan' ? 'Recibo e aviso de renovação' : 'Avisamos 2h antes do horário'}</small></span>
        <input type="checkbox" data-in="reminder" ${S.reminder ? 'checked' : ''}><span class="sw"></span></label>
      <p class="privacy">Usamos seus dados só para o atendimento. Nada de spam.</p>
    </div>`;

  /* QR Pix fictício: módulos pseudoaleatórios + os 3 marcadores de canto, só para ter a cara de um QR. */
  function qrSVG(seedStr) {
    const N = 29, r = seeded(seedStr); const cells = [];
    const inFinder = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && r() < 0.48) cells.push(`M${x} ${y}h1v1h-1z`);
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="none" stroke="var(--bg)" stroke-width="1" transform="translate(.5 .5)" /><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="var(--bg)"/>`;
    return `<svg viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" role="img" aria-label="QR Code Pix de demonstração"><path d="${cells.join('')}" fill="var(--bg)"/>${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}</svg>`;
  }
  const pixCode = (amount, ref) => `00020126580014BR.GOV.BCB.PIX0136demo-asaas-donvintage-${ref.toLowerCase()}52040000530398654${String(amount.toFixed(2).length).padStart(2, '0')}${amount.toFixed(2)}5802BR5911DON VINTAGE6010RIO BRANCO62140510DEMO${ref}6304A1F3`;
  function pixPanel(amount, ref, recurring) {
    return `<div class="pix" id="pix">
      <div class="qr">${qrSVG(ref)}<span class="qr-tag">Demonstração</span></div>
      <p class="timer">${recurring ? 'Autorize o <b>Pix Automático</b> no app do seu banco' : `Pague em até <b id="pixTimer">10:00</b> · ${brl(amount)}`}</p>
      <div class="copy-box"><code id="pixCode">${esc(pixCode(amount, ref))}</code><button class="btn btn-ghost" data-act="copy">Copiar</button></div>
      <span class="asaas"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>Cobrança processada pelo Asaas · QR fictício, não pague</span>
    </div>`;
  }

  R.pagamento = () => {
    if (S.mode === 'plan') return planPayment();
    const t = total(); const sp = subPlan();
    if (S.pay === 'plan' && !S.subscriber) S.pay = null;
    if ((S.pay === 'pix' || S.pay === 'local') && t === 0) S.pay = null;
    if (!S.pay) S.pay = S.subscriber ? 'plan' : 'local';
    const opt = (id, ic, title, small) => `
      <button class="opt ${S.pay === id ? 'on' : ''}" data-act="pay" data-id="${id}">
        <span class="pay-ic">${ic}</span><span class="opt-main"><b>${title}</b><small>${small}</small></span><span class="check">${CHECK}</span>
      </button>`;
    const icShop = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 10h16l-1-5H5l-1 5zM5 10v9h14v-9M10 19v-5h4v5"/></svg>';
    const icPix = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3l4 4-4 4-4-4 4-4zM12 13l4 4-4 4-4-4 4-4zM3 12l4-4 4 4-4 4-4-4zM13 12l4-4 4 4-4 4-4-4z"/></svg>';
    const icClub = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>';
    return `
    <h1 class="h-step">Como prefere pagar?</h1>
    <p class="sub">${esc(selSvcs().map(s => s.name).join(' + '))} · ${esc(dayLabel(S.date))} às ${hhmm(S.time)}</p>
    <div class="total-row"><span class="label">Total${S.subscriber && t < fullTotal() ? ` <s class="muted">${brl(fullTotal())}</s>` : ''}</span><b>${brl(t)}</b></div>
    <div class="opts">
      ${S.subscriber ? opt('plan', icClub, `Usar meu plano${sp ? ' · ' + esc(sp.name) : ''}`, t > 0 ? `Plano cobre os serviços inclusos · ${brl(t)} restante na barbearia` : 'Tudo coberto pela assinatura · R$ 0,00 hoje') : ''}
      ${t > 0 ? opt('pix', icPix, 'Pix agora', 'Via Asaas · confirmação na hora') : ''}
      ${t > 0 ? opt('local', icShop, 'Pagar na barbearia', 'Dinheiro, cartão ou Pix no balcão') : ''}
    </div>
    ${S.pay === 'pix' ? pixPanel(t, refCode()) : ''}`;
  };

  function refCode() {
    if (!S.code) { const r = seeded(S.name + S.phone + S.date + S.time + S.planId); S.code = 'DV' + String(Math.floor(r() * 9000) + 1000); }
    return S.code;
  }

  function planPayment() {
    const p = planById(S.planId); const c = S.card;
    const num = (c.num || '').padEnd(19, '•').replace(/(.{4})(?=.)/g, '$1').slice(0, 19);
    return `
    <h1 class="h-step">Pagamento recorrente</h1>
    <p class="sub">${esc(p.name)} · ${brl(p.price)}/${esc(p.period || 'mês')}, renovado automaticamente.</p>
    <div class="opts" style="margin-bottom:16px">
      <button class="opt ${S.planPay === 'card' ? 'on' : ''}" data-act="planPay" data-id="card">
        <span class="pay-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg></span>
        <span class="opt-main"><b>Cartão de crédito</b><small>Cobrança mensal automática</small></span><span class="check">${CHECK}</span></button>
      <button class="opt ${S.planPay === 'pix' ? 'on' : ''}" data-act="planPay" data-id="pix">
        <span class="pay-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3l4 4-4 4-4-4 4-4zM12 13l4 4-4 4-4-4 4-4zM3 12l4-4 4 4-4 4-4-4zM13 12l4-4 4 4-4 4-4-4z"/></svg></span>
        <span class="opt-main"><b>Pix Automático</b><small>Autoriza uma vez, debita todo mês</small></span><span class="check">${CHECK}</span></button>
    </div>
    ${S.planPay === 'card' ? `
      <div class="cc" aria-hidden="true">
        <div style="display:flex;justify-content:space-between;align-items:center"><span class="cc-chip"></span><span class="label brass">${esc(clubName)}</span></div>
        <div class="cc-num" id="ccNum">${esc(num)}</div>
        <div class="cc-row"><span>Titular<br><b id="ccHolder">${esc(c.holder || 'SEU NOME')}</b></span><span>Validade<br><b id="ccExp">${esc(c.exp || 'MM/AA')}</b></span></div>
      </div>
      <div class="form">
        <label class="field"><span class="label">Número do cartão</span><input class="input" data-in="ccnum" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="19" value="${esc(c.num)}"></label>
        <div class="grid2">
          <label class="field"><span class="label">Validade</span><input class="input" data-in="ccexp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" maxlength="5" value="${esc(c.exp)}"></label>
          <label class="field"><span class="label">CVV</span><input class="input" data-in="cccvv" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4" value="${esc(c.cvv)}"></label>
        </div>
        <label class="field"><span class="label">Nome impresso</span><input class="input" data-in="ccholder" autocomplete="cc-name" autocapitalize="characters" placeholder="Como no cartão" value="${esc(c.holder)}"></label>
        <button class="link-btn" data-act="testCard">Preencher com cartão de teste</button>
        <span class="asaas" style="justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>Ambiente de demonstração · nada é cobrado</span>
      </div>` : pixPanel(p.price, refCode(), true)}`;
  }

  R.plano = () => {
    const p = planById(S.planId);
    return `
    <div class="plan-hero">
      ${p.badge ? `<span class="chip brass" style="align-self:flex-start">${esc(p.badge)}</span>` : ''}
      <h2>${esc(p.name)}</h2>
      ${p.subtitle ? `<p class="muted" style="margin-top:-6px">${esc(p.subtitle)}</p>` : ''}
      <div class="price"><b>${brl(p.price)}</b><span>/${esc(p.period || 'mês')}</span></div>
      <ul class="perks">${(p.perks || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    ${DV.plans.length > 1 ? `<div class="chips-sel" style="margin-top:14px">${DV.plans.map(o => `<button class="chip-btn ${o.id === p.id ? 'on' : ''}" data-act="plan" data-id="${esc(o.id)}">${esc(o.name)}</button>`).join('')}</div>` : ''}
    <div class="how-bill">
      <div><i>1</i><span><b style="color:var(--text)">Assine em 1 minuto</b> — cartão de crédito ou Pix Automático, processado pelo Asaas.</span></div>
      <div><i>2</i><span><b style="color:var(--text)">Agende quando quiser</b> — os serviços do plano saem R$ 0,00 no agendamento.</span></div>
      <div><i>3</i><span><b style="color:var(--text)">Renova sozinho todo mês</b> — recibo no seu WhatsApp.</span></div>
    </div>`;
  };

  /* ---------- Confirmação ---------- */
  const startDate = () => { const d = fromKey(S.date); return new Date(d.getTime() + S.time * 60e3); };
  const minutesUntil = () => (startDate() - nowRB()) / 60e3;
  const utcStamp = (d) => new Date(d.getTime() + TZ_OFF_H * 3600e3).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  function waBooking() {
    const u = unit(); const num = u.whatsapp || B.whatsapp;
    const txt = `Olá! Sou ${S.name.trim()} e agendei pelo site: ${selSvcs().map(s => s.name).join(' + ')} em ${dayLabel(S.date, true)} às ${hhmm(S.time)} com ${barberName(S.assigned)} (unidade ${u.name}). Código ${S.code}.`;
    return num ? `https://wa.me/${num}?text=${encodeURIComponent(txt)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`;
  }
  function icsHref() {
    const s = startDate(); const e = new Date(s.getTime() + totalDur() * 60e3); const u = unit();
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Don Vintage//Agendamento demo//PT-BR', 'BEGIN:VEVENT',
      `UID:${S.code}@donvintage.demo`, `DTSTAMP:${utcStamp(nowRB())}`, `DTSTART:${utcStamp(s)}`, `DTEND:${utcStamp(e)}`,
      `SUMMARY:${B.name} · ${selSvcs().map(x => x.name).join(' + ')}`,
      `DESCRIPTION:Com ${barberName(S.assigned)}. Código ${S.code}. Remarque ou cancele até 2h antes.`,
      `LOCATION:${B.name} ${u.name} - ${(u.address || '').replace(/,/g, '\\,')} - ${B.city || ''}`,
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Seu horário na Don Vintage', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
    return URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
  }
  function gcalHref() {
    const s = startDate(); const e = new Date(s.getTime() + totalDur() * 60e3); const u = unit();
    const p = new URLSearchParams({ action: 'TEMPLATE', text: `${B.name} · ${selSvcs().map(x => x.name).join(' + ')}`, dates: `${utcStamp(s)}/${utcStamp(e)}`, details: `Com ${barberName(S.assigned)}. Código ${S.code}.`, location: `${B.name} ${u.name}, ${u.address || ''}, ${B.city || ''}` });
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }
  const payLabel = () => ({ plan: ['Coberto pelo plano', 'brass'], pix: ['Pago via Pix', 'ok'], local: ['Pagar na barbearia', 'warn'] })[S.pay] || ['', ''];

  function bookingDone() {
    if (S.canceled) return `
      <div class="success">
        <svg class="seal cancel" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3"/><path d="M36 36l28 28M64 36L36 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>
        <h1 class="h-step">Agendamento cancelado</h1>
        <p class="sub">O horário de ${esc(dayLabel(S.date, true))} às ${hhmm(S.time)} foi liberado. ${S.pay === 'pix' ? 'O estorno do Pix cai em instantes.' : ''}</p>
        <div class="actions"><button class="btn btn-primary btn-block" data-act="restart">Agendar novamente</button><a class="btn btn-ghost btn-block" href="site.html">Voltar ao site</a></div>
      </div>`;
    const u = unit(); const b = barberById(S.assigned) || { name: '—' }; const [pl, pc] = payLabel();
    const s = startDate(); const end = S.time + totalDur(); const late = minutesUntil() < 120;
    return `
    <div class="success">
      <svg class="seal" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3"/><path d="M30 52l13 13 27-29" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <p class="code">Código ${esc(S.code)}</p>
      <h1 class="h-step" style="margin-top:6px">Tudo certo, ${esc(firstName())}!</h1>
      <p class="sub">Seu horário está confirmado. ${S.reminder ? 'Lembrete no WhatsApp 2h antes.' : ''}</p>
      <article class="ticket">
        <div class="ticket-top">
          <span class="label">${esc(B.name)} · ${esc(u.name)}</span>
          <span class="when">${esc(dayLabel(S.date, true))}</span>
          <span class="hour">${hhmm(S.time)} – ${hhmm(end)}</span>
        </div>
        <div class="perf"></div>
        <ul class="ticket-list">
          <li><span>Profissional</span><b style="display:flex;align-items:center;gap:8px">${avatar(b, 26)}${esc(b.name)}</b></li>
          ${selSvcs().map(x => `<li><span>${esc(x.name)}</span><b>${priceOf(x) === 0 && S.subscriber ? 'Plano' : brl(priceOf(x))}</b></li>`).join('')}
          <li><span>Endereço</span><b>${esc(u.address || B.address || '')}</b></li>
          <li class="tot"><span>Total · <span class="chip ${pc}">${pl}</span></span><b>${brl(total())}</b></li>
        </ul>
      </article>
      <div class="actions">
        <a class="btn btn-primary btn-block" href="${icsHref()}" download="don-vintage-${esc(S.code)}.ics">Adicionar ao calendário</a>
        <a class="link-btn" href="${esc(gcalHref())}" target="_blank" rel="noopener" style="text-align:center;display:block">ou abrir no Google Agenda</a>
        <a class="btn btn-wa btn-block" href="${esc(waBooking())}" target="_blank" rel="noopener">Falar no WhatsApp</a>
        <div class="row">
          <button class="btn btn-ghost" data-act="reschedule" ${late ? 'disabled' : ''}>Remarcar</button>
          <button class="btn btn-danger" data-act="cancel" ${late ? 'disabled' : ''}>Cancelar</button>
        </div>
        <div class="policy"><span>ⓘ</span><span>${late ? '<b>Faltam menos de 2h.</b> Para mudanças agora, fale com a unidade pelo WhatsApp.' : '<b>Remarque ou cancele até 2h antes</b> do horário, sem custo, por aqui mesmo.'}</span></div>
        <a class="btn btn-ghost btn-block" href="site.html" style="margin-top:6px">Voltar ao site</a>
      </div>
    </div>`;
  }

  function planDone() {
    const p = planById(S.planId); const n = nowRB();
    const next = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate()));
    const u = unit(); const num = u.whatsapp || B.whatsapp;
    const txt = `Olá! Acabei de assinar o ${p.name} pelo site. Sou ${S.name.trim()}. Código ${S.code}.`;
    return `
    <div class="success">
      <svg class="seal" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3"/><path d="M30 52l13 13 27-29" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h1 class="h-step">Bem-vindo ao ${esc(p.name)}, ${esc(firstName())}!</h1>
      <p class="sub">Assinatura ativa. ${S.planPay === 'card' ? 'Cobrança automática no cartão' : 'Pix Automático autorizado'} todo dia ${n.getUTCDate()}.</p>
      <div class="member">
        <div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="m-club">${esc(p.name)}</div><div class="m-plan" style="margin-top:6px">${esc(p.subtitle || 'Membro')}</div></div><span class="logo-mark">DV</span></div>
        <div class="m-name">${esc(S.name.trim())}</div>
        <div class="m-row"><span>Membro desde<b>${MO[n.getUTCMonth()]}/${n.getUTCFullYear()}</b></span><span>Próxima cobrança<b>${String(next.getUTCDate()).padStart(2, '0')}/${String(next.getUTCMonth() + 1).padStart(2, '0')}/${next.getUTCFullYear()}</b></span><span>Nº<b>${esc(S.code)}</b></span></div>
        <div class="pole"></div>
      </div>
      <div class="actions">
        <a class="btn btn-primary btn-block" href="agendar.html?assinante=${encodeURIComponent(p.id)}">Agendar meu primeiro horário</a>
        <a class="btn btn-wa btn-block" href="${num ? `https://wa.me/${num}?text=${encodeURIComponent(txt)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`}" target="_blank" rel="noopener">Falar no WhatsApp</a>
        <div class="policy"><span>ⓘ</span><span><b>${brl(p.price)}/${esc(p.period || 'mês')}</b>, renovação automática. Recibo de cada cobrança chega no seu WhatsApp.</span></div>
        <a class="btn btn-ghost btn-block" href="site.html">Voltar ao site</a>
      </div>
    </div>`;
  }
  R.fim = () => S.mode === 'plan' ? planDone() : bookingDone();

  /* ---------- Rodapé, cabeçalho e resumo ---------- */
  const body = $('#body'), foot = $('#foot'), footSum = $('#footSum'), nextBtn = $('#nextBtn');
  function updateFoot() {
    const id = STEPS[cur].id;
    foot.classList.toggle('gone', id === 'fim');
    let left = '', label = 'Continuar';
    if (S.mode === 'plan') {
      const p = planById(S.planId);
      left = `<span><b>${esc(p.name)}</b></span><span class="t">${brl(p.price)}<small class="muted">/${esc(p.period || 'mês')}</small></span>`;
      if (id === 'pagamento') label = S.planPay === 'card' ? `Assinar por ${brl(p.price)}/mês` : 'Já autorizei o Pix';
    } else {
      const n = S.services.length;
      if (id === 'unidade') left = S.unit ? `<span>Unidade <b>${esc(unit().name)}</b></span>` : '';
      else if (n) {
        let ctx = `<b>${n} serviço${n > 1 ? 's' : ''}</b> · ${dur(totalDur())}`;
        if (id === 'profissional' && S.barber) ctx = `<b>${S.barber === 'any' ? 'Sem preferência' : esc(barberName(S.barber))}</b> · ${dur(totalDur())}`;
        if ((id === 'horario' || id === 'dados' || id === 'pagamento') && S.time != null) ctx = `<b>${esc(dayLabel(S.date))} · ${hhmm(S.time)}</b>`;
        left = `<span>${ctx}</span><span class="t">${brl(total())}</span>`;
      }
      if (id === 'pagamento') label = S.pay === 'pix' ? 'Já paguei o Pix' : S.pay === 'plan' ? 'Confirmar com meu plano' : 'Confirmar agendamento';
    }
    footSum.innerHTML = left;
    nextBtn.textContent = label;
    // Botão fica clicável mesmo inválido: o toque mostra o motivo (botão "morto" confunde no celular).
    nextBtn.classList.toggle('is-off', !!check(id));
    nextBtn.style.opacity = check(id) ? '.55' : '';
    renderSide();
  }
  function updateHead() {
    const st = STEPS[cur]; const last = STEPS.length - 1;
    $('#stepTitle').textContent = st.t;
    $('#stepCount').textContent = cur < last ? `Etapa ${cur + 1} de ${last}` : (S.mode === 'plan' ? clubName : B.name);
    $('#progressBar').style.width = `${Math.max(4, (cur / last) * 100)}%`;
    $('#backBtn').style.visibility = cur === last ? 'hidden' : '';
    document.title = `${st.t} · ${B.name}`;
  }
  function renderSide() {
    const side = $('#side'); if (getComputedStyle(side).display === 'none') return;
    let rows;
    if (S.mode === 'plan') {
      const p = planById(S.planId);
      rows = [['Plano', p.name], ['Cobrança', S.planPay === 'card' ? 'Cartão recorrente' : 'Pix Automático'], ['Assinante', S.name.trim() || null]];
      side.innerHTML = `<div class="card side-card"><p class="eyebrow">Resumo</p><h3>Sua assinatura</h3><ul class="side-list">${rows.map(([k, v]) => `<li class="${v ? '' : 'nil'}"><span class="label">${k}</span><b>${esc(v || '—')}</b></li>`).join('')}</ul><div class="side-tot"><span class="label">Por mês</span><b>${brl(p.price)}</b></div></div><p class="side-help">Pagamento recorrente processado pelo Asaas. Ambiente de demonstração.</p>${badge}`;
      return;
    }
    rows = [
      ['Unidade', S.unit ? unit().name : null],
      ['Serviços', selSvcs().map(s => s.name).join(', ') || null],
      ['Profissional', S.barber ? (S.barber === 'any' ? (S.assigned && S.time != null ? `${barberName(S.assigned)} (sem preferência)` : 'Sem preferência') : barberName(S.barber)) : null],
      ['Data e horário', S.time != null ? `${dayLabel(S.date, true)} · ${hhmm(S.time)}` : null],
      ['Cliente', S.name.trim() || null],
      ['Pagamento', STEPS[cur].id === 'pagamento' || S.done ? ({ plan: 'Plano', pix: 'Pix', local: 'Na barbearia' })[S.pay] : null],
    ];
    side.innerHTML = `<div class="card side-card"><p class="eyebrow">Resumo</p><h3>Seu horário</h3>
      <ul class="side-list">${rows.map(([k, v]) => `<li class="${v ? '' : 'nil'}"><span class="label">${k}</span><b>${esc(v || '—')}</b></li>`).join('')}</ul>
      <div class="side-tot"><span class="label">Total${S.services.length ? ' · ' + dur(totalDur()) : ''}</span><b>${brl(total())}</b></div></div>
      <p class="side-help">Remarque ou cancele até 2h antes. Lembrete automático pelo WhatsApp.</p>${badge}`;
  }

  /* ---------- Navegação ---------- */
  let pixTimer = null;
  function render(dir) {
    clearInterval(pixTimer);
    const id = STEPS[cur].id;
    // Ao entrar no horário: descarta seleção que deixou de existir (trocou serviço/profissional).
    if (id === 'horario') {
      if (S.date && S.time != null && !slotsFor(S.date).includes(S.time)) { S.time = null; S.assigned = null; }
      if (!S.date || !slotsFor(S.date).length) { const d = days14().map(keyOf).find(k => slotsFor(k).length); S.date = d || null; }
    }
    if (id === 'profissional' && S.barber && S.barber !== 'any' && !eligible().some(b => b.id === S.barber)) S.barber = null;
    if (id === 'profissional' && !S.barber && eligible().length === 1) S.barber = eligible()[0].id;
    const keep = dir === 'same' ? body.scrollTop : 0;
    body.innerHTML = `<div class="step ${dir === 'back' ? 'back' : dir === 'same' ? 'still' : ''}">${R[id]()}${$('#side') && getComputedStyle($('#side')).display !== 'none' ? '' : badge}</div>`;
    body.scrollTop = keep;
    updateHead(); updateFoot();
    if (id === 'horario') { const on = body.querySelector('.day.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' }); }
    if (id === 'pagamento') startPixTimer();
  }
  function go(i, opts) {
    opts = opts || {};
    const dir = i < cur ? 'back' : 'fwd';
    cur = Math.max(0, Math.min(i, STEPS.length - 1));
    if (opts.push) history.pushState({ s: cur, m: S.mode }, '', '#' + STEPS[cur].id);
    else if (opts.replace) history.replaceState({ s: cur, m: S.mode }, '', location.pathname + location.search + '#' + STEPS[cur].id);
    render(dir);
  }
  function scrollToPix() { const p = $('#pix'); if (p) requestAnimationFrame(() => p.scrollIntoView({ behavior: 'smooth', block: 'nearest' })); }
  function startPixTimer() {
    const el = $('#pixTimer'); if (!el) return;
    let left = 600;
    pixTimer = setInterval(() => { left--; if (left < 0) { clearInterval(pixTimer); return; } el.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`; }, 1000);
  }
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }
  function busy(text, ms) {
    return new Promise(res => { const o = $('#overlay'); $('#overlayText').textContent = text; o.hidden = false; setTimeout(() => { o.hidden = true; res(); }, ms); });
  }

  async function next() {
    const id = STEPS[cur].id; const err = check(id);
    if (err) {
      nextBtn.classList.remove('shake'); void nextBtn.offsetWidth; nextBtn.classList.add('shake');
      if (id === 'dados') { const e = $('#fErr'); if (e) e.textContent = err; markFields(); }
      toast(err); return;
    }
    if (id === 'pagamento') {
      refCode();
      if (S.mode === 'plan') await busy(S.planPay === 'card' ? 'Criando assinatura no Asaas…' : 'Confirmando autorização do Pix…', 1500);
      else await busy(S.pay === 'pix' ? 'Recebendo Pix via Asaas…' : 'Reservando seu horário…', S.pay === 'pix' ? 1500 : 1000);
      S.done = true; S.canceled = false;
      if (navigator.vibrate) navigator.vibrate(30);
    }
    go(cur + 1, { push: true });
  }
  function markFields() {
    const n = $('#fName'), p = $('#fPhone');
    if (n) n.classList.toggle('bad', S.name.trim().length < 2);
    if (p) p.classList.toggle('bad', phoneDigits().length !== 11);
  }
  function back() {
    if (cur === 0) { location.href = 'site.html'; return; }
    history.back();
  }

  window.addEventListener('popstate', (e) => {
    let s = e.state && e.state.m === S.mode ? e.state.s : 0;
    if (S.done && s < STEPS.length - 1) {
      // Depois de confirmado, voltar não reabre o pagamento: começa um agendamento novo mantendo nome e unidade.
      if (S.mode === 'plan') { location.href = 'site.html'; return; }
      restart(); return;
    }
    s = Math.min(s, maxReachable());
    go(s, { replace: s !== (e.state && e.state.s) });
  });

  function restart() {
    Object.assign(S, { services: [], barber: null, date: null, time: null, assigned: null, pay: null, done: false, canceled: false, code: '', cat: 'Mais pedidos' });
    const first = units.length > 1 && S.unit ? idx('servicos') : 0;
    history.replaceState({ s: 0, m: S.mode }, '', location.pathname + '#' + STEPS[0].id);
    if (first) go(first, { push: true }); else go(0);
  }

  /* ---------- Eventos ---------- */
  nextBtn.addEventListener('click', next);
  $('#backBtn').addEventListener('click', back);

  body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const a = el.dataset.act, id = el.dataset.id;
    switch (a) {
      case 'unit':
        if (S.unit !== id) { S.unit = id; S.time = null; if (S.barber && S.barber !== 'any' && (barberById(S.barber) || {}).unit !== id) S.barber = null; }
        body.querySelectorAll('[data-act="unit"]').forEach(b => b.classList.toggle('on', b.dataset.id === id));
        updateFoot(); setTimeout(() => { if (STEPS[cur].id === 'unidade') next(); }, 260);
        break;
      case 'cat':
        S.cat = id; $('#cats').innerHTML = catChips(); $('#svcList').innerHTML = svcList();
        break;
      case 'svc': {
        const i = S.services.indexOf(id);
        if (i >= 0) S.services.splice(i, 1); else S.services.push(id);
        S.time = null; S.assigned = null;
        el.classList.toggle('on', i < 0); $('#cats').innerHTML = catChips();
        if (i < 0 && S.services.length && !eligible().length) toast('Nenhum profissional faz todos esses serviços juntos nesta unidade');
        updateFoot(); break;
      }
      case 'clearBarber': S.barber = null; render('same'); break;
      case 'barber':
        if (S.barber !== id) { S.barber = id; S.time = null; S.assigned = null; }
        body.querySelectorAll('[data-act="barber"]').forEach(b => b.classList.toggle('on', b.dataset.id === id));
        updateFoot(); setTimeout(() => { if (STEPS[cur].id === 'profissional') next(); }, 260);
        break;
      case 'day':
        S.date = el.dataset.k; S.time = null; S.assigned = null;
        body.querySelectorAll('.day').forEach(b => b.classList.toggle('on', b === el));
        $('#dayTitle').textContent = dayLabel(S.date, true); $('#slots').innerHTML = slotsHTML();
        updateFoot(); break;
      case 'slot':
        S.time = Number(el.dataset.m); S.assigned = assign(S.date, S.time);
        body.querySelectorAll('.slot').forEach(b => b.classList.toggle('on', b === el));
        updateFoot();
        if (S.barber === 'any' && S.assigned) toast(`Você será atendido por ${barberName(S.assigned)}`);
        break;
      case 'subPlan': S.subPlan = id; render('same'); break;
      case 'pay': S.pay = id; render('same'); scrollToPix(); break;
      case 'planPay': S.planPay = id; render('same'); scrollToPix(); break;
      case 'plan': S.planId = id; STEPS[0].t = planById(id).name; S.code = ''; render('same'); break;
      case 'copy': copy($('#pixCode').textContent); break;
      case 'testCard':
        // Número de teste público (Visa 4111…), aceito no sandbox do Asaas; nunca um cartão real.
        S.card = { num: '4111 1111 1111 1111', exp: '12/30', cvv: '123', holder: (S.name || 'Cliente Teste').toUpperCase() };
        render('same'); break;
      case 'reschedule':
        S.done = false; S.code = '';
        go(idx('horario'), { push: true }); toast('Escolha o novo horário'); break;
      case 'cancel':
        if (!el.classList.contains('arm')) {
          el.classList.add('arm'); el.textContent = 'Toque para confirmar';
          setTimeout(() => { if (el.isConnected) { el.classList.remove('arm'); el.textContent = 'Cancelar'; } }, 3000);
        } else { S.canceled = true; render('same'); body.scrollTop = 0; toast('Horário liberado'); }
        break;
      case 'restart': restart(); break;
    }
  });

  const maskPhone = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };
  body.addEventListener('input', (e) => {
    const el = e.target; const k = el.dataset.in; if (!k) return;
    if (k === 'name') S.name = el.value;
    if (k === 'phone') { el.value = maskPhone(el.value); S.phone = el.value; }
    if (k === 'ccnum') { el.value = el.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1 '); S.card.num = el.value; $('#ccNum').textContent = (el.value || '').padEnd(19, '•'); }
    if (k === 'ccexp') { const d = el.value.replace(/\D/g, '').slice(0, 4); el.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; S.card.exp = el.value; $('#ccExp').textContent = el.value || 'MM/AA'; }
    if (k === 'cccvv') { el.value = el.value.replace(/\D/g, '').slice(0, 4); S.card.cvv = el.value; }
    if (k === 'ccholder') { S.card.holder = el.value; $('#ccHolder').textContent = el.value.toUpperCase() || 'SEU NOME'; }
    if (el.classList.contains('bad')) markFields();
    const err = $('#fErr'); if (err && !check('dados')) err.textContent = '';
    updateFoot();
  });
  body.addEventListener('change', (e) => {
    const el = e.target; const k = el.dataset.in;
    if (k === 'subscriber') { S.subscriber = el.checked; S.pay = null; if (DV.plans.length > 1) render('same'); else updateFoot(); }
    if (k === 'reminder') S.reminder = el.checked;
  });
  body.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.dataset.in) return;
    if (e.target.dataset.in === 'name') { e.preventDefault(); const p = $('#fPhone'); if (p) p.focus(); }
    else if (e.target.dataset.in === 'phone') { e.preventDefault(); e.target.blur(); next(); }
  });

  function copy(text) {
    const done = () => toast('Código Pix copiado');
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, fallback); } else fallback();
    function fallback() {
      const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (_) { toast('Não foi possível copiar'); } t.remove();
    }
  }

  window.addEventListener('resize', () => renderSide());

  /* ---------- Início ----------
     Sempre começa do zero (hash antigo é ignorado). Se a URL já trouxe unidade, pula
     para serviços mas deixa a etapa de unidade no histórico, para o "voltar" funcionar. */
  history.replaceState({ s: 0, m: S.mode }, '', location.pathname + location.search + '#' + STEPS[0].id);
  const skipUnit = S.mode === 'book' && STEPS[0].id === 'unidade' && S.unit && (qs.has('unidade') || qb);
  if (skipUnit) {
    go(idx('servicos'), { push: true });
  } else {
    render();
  }
})();
