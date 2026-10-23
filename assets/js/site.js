/* Landing page: tudo que é dado (serviços, preços, barbeiros, planos, unidades)
   vem de window.DV; o HTML só tem a estrutura. Depois de renderizar, DV.motion.reveal()
   liga a entrada no scroll dos itens gerados aqui. */
(function () {
  'use strict';
  const DV = window.DV;
  const B = DV.business || {};
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (v) => DV.fmt.brl(v);
  const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const DAYS_S = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const units = DV.units && DV.units.length ? DV.units : [{ id: 'principal', name: B.neighborhood || B.name, address: B.address, phone: B.phone, whatsapp: B.whatsapp, rating: B.rating, reviewsCount: B.reviewsCount, mapsUrl: B.mapsUrl }];
  const clubName = B.clubName || 'Clube';
  const fmtRating = (r) => Number(r).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const stars = (n) => '★★★★★'.slice(0, Math.round(n || 5)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n || 5));
  const waLink = (num, text) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  const reveal = () => DV.motion && DV.motion.reveal();

  /* Hora de Rio Branco (UTC-5, sem horário de verão desde 2019), independente
     do fuso do aparelho de quem abre a demo. Se o Acre voltar a ter horário de
     verão, trocar por Intl com timeZone 'America/Rio_Branco'. */
  function nowRB() { return new Date(Date.now() - 5 * 3600e3); }
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  // "09:00" vira "9h", "18:30" vira "18h30": é assim que se escreve na placa da porta.
  const hLabel = (hhmm) => { const [h, m] = hhmm.split(':'); return `${Number(h)}h${m !== '00' ? m : ''}`; };

  // Texto da marca
  document.querySelectorAll('[data-dv="name"]').forEach(el => { el.textContent = B.name || el.textContent; });
  $('#heroCity').textContent = (B.city || 'Rio Branco - AC').replace(' - AC', ' · Acre');
  $('#heroTag').textContent = B.slogan || B.tagline || '';
  $('#heroMission').textContent = B.mission || '';
  $('#clubTitle').textContent = clubName;

  // Status aberto/fechado
  function openStatus() {
    const n = nowRB(); const d = n.getUTCDay(); const h = B.hours && B.hours[d];
    const cur = n.getUTCHours() * 60 + n.getUTCMinutes();
    if (h && cur >= toMin(h[0]) && cur < toMin(h[1])) return { open: true, text: `Aberto agora · até ${hLabel(h[1])}` };
    if (h && cur < toMin(h[0])) return { open: false, text: `Fechado · abre hoje às ${hLabel(h[0])}` };
    for (let i = 1; i <= 7; i++) {
      const dd = (d + i) % 7; const hh = B.hours && B.hours[dd];
      if (hh) return { open: false, text: `Fechado · abre ${i === 1 ? 'amanhã' : DAYS_S[dd].toLowerCase()} às ${hLabel(hh[0])}` };
    }
    return { open: false, text: 'Fechado' };
  }
  const st = openStatus();
  const dot = `<span class="dot${st.open ? ' live' : ''}" aria-hidden="true"></span>`;

  // Chips do hero
  const meta = [];
  if (B.rating) meta.push(`<span class="chip"><span class="star" aria-hidden="true">★</span> <b>${fmtRating(B.rating)}</b> no Google${B.reviewsCount ? ` · ${B.reviewsCount} avaliações` : ''}</span>`);
  meta.push(`<span class="chip ${st.open ? 'ok' : ''}">${dot} ${esc(st.text)}</span>`);
  if (units.length > 1) meta.push(`<span class="chip">${units.length} unidades</span>`);
  $('#heroMeta').innerHTML = meta.join('');

  // Serviços: tabela de preço com os mais pedidos; o catálogo completo (18+) fica atrás de "ver todos"
  // para o celular não virar um rolo infinito. Se a lista FEATURED sumir dos dados, mostra os 6 primeiros.
  const FEATURED = ['corte', 'barba', 'barba-express', 'pezinho', 'raspar', 'hidratacao-barba'];
  const price = (s) => (s.priceFrom ? '<small>a partir de</small>' : '') + brl(s.price);
  const svcRow = (s, withReveal) => `
    <li${withReveal ? ' data-reveal' : ''}><a class="svc" href="agendar.html?servico=${encodeURIComponent(s.id)}">
      <span class="svc-name">${esc(s.name)}</span>
      <span class="svc-lead" aria-hidden="true"></span>
      <span class="svc-price">${price(s)}</span>
      ${s.description ? `<span class="svc-desc">${esc(s.description)}</span>` : ''}
      <span class="svc-meta">
        <span class="label">${DV.fmt.dur(s.durationMin)}</span>
        ${s.inPlan ? `<span class="label in-plan">Incluso no ${esc(clubName)}</span>` : ''}
        <span class="svc-go" aria-hidden="true">Agendar →</span>
      </span>
    </a></li>`;
  let feat = FEATURED.map(id => DV.services.find(s => s.id === id)).filter(Boolean);
  if (feat.length < 3) feat = DV.services.slice(0, 6);
  const rest = DV.services.filter(s => !feat.includes(s));
  const cats = [...new Set(rest.map(s => s.category || 'Outros'))];
  $('#services').innerHTML = feat.map(s => svcRow(s, true)).join('');
  if (rest.length) {
    const label = `Ver todos os ${DV.services.length} serviços`;
    const more = document.createElement('div');
    more.className = 'svc-more';
    more.innerHTML = `
      <div class="svc-all" id="svcAll">
        <div class="svc-all-in" inert>
          ${cats.map(c => `<h3 class="label svc-cat">${esc(c)}</h3>
            <ul class="svc-list">${rest.filter(s => (s.category || 'Outros') === c).map(s => svcRow(s, false)).join('')}</ul>`).join('')}
        </div>
      </div>
      <button class="btn btn-ghost svc-toggle" id="svcToggle" type="button" aria-expanded="false" aria-controls="svcAll"><span class="svc-toggle-txt">${label}</span> <span class="chev" aria-hidden="true">↓</span></button>`;
    $('#services').after(more);
    const all = $('#svcAll'), inner = $('.svc-all-in', all), btn = $('#svcToggle');
    btn.addEventListener('click', () => {
      const open = !all.classList.contains('open');
      all.classList.toggle('open', open);
      inner.inert = !open;
      btn.setAttribute('aria-expanded', String(open));
      $('.svc-toggle-txt', btn).textContent = open ? 'Mostrar menos' : label;
      // Ao recolher, o botão sobe junto com a lista: rola de volta para o topo da tabela.
      if (!open) $('#services').scrollIntoView({ behavior: DV.motion && DV.motion.reduced() ? 'auto' : 'smooth', block: 'start' });
    });
  }

  // Barbeiros: retrato como protagonista; o toque leva direto ao agendamento com ele.
  const unitName = (id) => (units.find(u => u.id === id) || {}).name;
  $('#barbersSub').textContent = `${DV.barbers.length} barbeiros nas ${units.length} unidades. Toque na foto e agende direto com quem você já conhece.`;
  $('#barbers').innerHTML = DV.barbers.map(b => {
    const un = b.unit && unitName(b.unit);
    const img = b.photo
      ? `<img src="${esc(b.photo)}" alt="" loading="lazy" width="480" height="600">`
      : '';
    return `
    <a class="barber" href="agendar.html?barbeiro=${encodeURIComponent(b.id)}${b.unit ? '&unidade=' + encodeURIComponent(b.unit) : ''}" aria-label="Agendar com ${esc(b.name)}${un ? ', unidade ' + esc(un) : ''}">
      ${img}
      ${b.featured ? '<span class="barber-flag">Destaque</span>' : ''}
      <span class="barber-info"><b>${esc(b.name)}</b><small>${esc(un || b.role || 'Barbeiro')}</small></span>
    </a>`;
  }).join('');

  // Planos
  const planCard = (p) => `
    <article class="plan" data-reveal>
      ${p.badge || p.highlight ? `<span class="plan-flag">${esc(p.badge || 'Mais escolhido')}</span>` : ''}
      <h3>${esc(p.name)}</h3>
      ${p.subtitle ? `<p class="plan-sub">${esc(p.subtitle)}</p>` : ''}
      <div class="plan-price"><b>${brl(p.price)}</b><span>/${esc(p.period || 'mês')}</span></div>
      <ul class="perks">${(p.perks || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <a class="btn btn-primary btn-block" href="agendar.html?plano=${encodeURIComponent(p.id)}">Assinar o ${esc(p.name)}</a>
      <p class="plan-note">Renovação mensal automática no cartão ou Pix.</p>
    </article>`;
  // "Se paga em N visitas": usa os preços reais de corte e barba avulsos, para a conta
  // acompanhar qualquer reajuste em data.js. Sem um dos dois, o card de conta não aparece.
  const svc = (id) => DV.services.find(s => s.id === id);
  const one = DV.plans.length === 1 ? DV.plans[0] : null;
  let math = '';
  if (one && svc('corte') && svc('barba')) {
    const visit = svc('corte').price + svc('barba').price;
    const n = Math.ceil(one.price / visit);
    math = `
    <article class="plan-math" data-reveal>
      <h3>Faça a conta</h3>
      <div class="eq">
        <div><span>Corte</span><b>${brl(svc('corte').price)}</b></div>
        <i aria-hidden="true">+</i>
        <div><span>Barba</span><b>${brl(svc('barba').price)}</b></div>
        <i aria-hidden="true">=</i>
        <div class="res"><span>Por visita</span><b>${brl(visit)}</b></div>
      </div>
      <p class="pays">O ${esc(one.name)} <b>se paga em ${n} visita${n > 1 ? 's' : ''}</b>. Da ${n + 1}ª em diante, é por conta da casa.</p>
      <div class="visits" aria-hidden="true">${[1, 2, 3, 4].map(i => `<span class="${i <= n ? 'paid' : 'free'}">${i}ª</span>`).join('')}</div>
      <p class="plan-note">Avulso, 4 visitas no mês sairiam ${brl(visit * 4)}.</p>
    </article>`;
  }
  $('#plans').classList.toggle('single', !!one);
  $('#plans').innerHTML = DV.plans.map(planCard).join('') + math;

  // Avaliações: os textos em data.js são paráfrases dos temas do Google, e a página diz isso.
  if (B.rating) {
    $('#ratingBig').innerHTML = `<div class="rating-big"><b>${fmtRating(B.rating)}</b><div><span class="stars" aria-label="${fmtRating(B.rating)} de 5 estrelas">★★★★★</span><small>${B.reviewsCount ? B.reviewsCount + ' avaliações no Google' : 'no Google'}${units.length > 1 ? ', somando as ' + units.length + ' unidades' : ''}</small></div></div>`;
  }
  const rv = DV.reviews || [];
  $('#reviews').innerHTML = rv.map(r => `
    <figure class="review" data-reveal>
      <span class="stars" aria-label="${r.stars || 5} de 5 estrelas">${stars(r.stars)}</span>
      <blockquote>${esc(r.text)}</blockquote>
      <figcaption>${esc(r.name || 'Cliente')}${r.source ? ' · ' + esc(r.source) : ''}</figcaption>
    </figure>`).join('') + (rv.length ? '<p class="reviews-note">Resumo do que os clientes mais repetem nas avaliações do Google.</p>' : '');

  // Unidades
  $('#unitsTitle').textContent = units.length > 1 ? `${units.length} unidades em Rio Branco` : 'Onde estamos';
  $('#unitsSub').textContent = units.length > 1 ? 'Mesmo padrão, mesma equipe treinada. Escolha a mais perto de você.' : (B.address || '');
  $('#units').innerHTML = units.map((u, i) => `
    <article class="card unit" data-reveal>
      <a class="map" href="${esc(u.mapsUrl || B.mapsUrl)}" target="_blank" rel="noopener" aria-label="Abrir a unidade ${esc(u.name)} no Google Maps" style="--r-ang:${100 + i * 25}deg">
        <span class="map-grid" aria-hidden="true"></span>
        <span class="map-pin" aria-hidden="true"><span>DV</span></span>
        <span class="map-hint" aria-hidden="true">Abrir no Maps</span>
      </a>
      <div class="unit-body">
        <h3>${esc(u.name)}</h3>
        <p class="addr">${esc(u.address || '')}<br>${esc((B.city || '').replace(' - ', ', '))}</p>
        <div class="meta">
          ${u.rating ? `<span class="chip"><span class="star" aria-hidden="true">★</span> ${fmtRating(u.rating)}${u.reviewsCount ? ` · ${u.reviewsCount} avaliações` : ''}</span>` : ''}
          ${u.phone ? `<span class="chip">${esc(u.phone)}</span>` : ''}
        </div>
      </div>
      <div class="unit-ctas">
        <a class="btn btn-ghost" href="agendar.html?unidade=${encodeURIComponent(u.id)}">Agendar</a>
        ${u.whatsapp ? `<a class="btn btn-wa" href="${waLink(u.whatsapp, `Olá! Vim pelo site da ${B.name} (${u.name}).`)}" target="_blank" rel="noopener">WhatsApp</a>`
          : `<a class="btn btn-ghost" href="${esc(u.mapsUrl || B.mapsUrl)}" target="_blank" rel="noopener">Maps</a>`}
      </div>
    </article>`).join('');

  // Horários
  const today = nowRB().getUTCDay();
  const order = [1, 2, 3, 4, 5, 6, 0]; // semana começando na segunda, como se lê no balcão
  $('#hours').innerHTML = order.map(d => {
    const h = B.hours && B.hours[d];
    return `<li class="${d === today ? 'today' : ''} ${h ? '' : 'closed'}"><span>${DAYS[d]}${d === today ? ' (hoje)' : ''}</span><span>${h ? `${hLabel(h[0])} às ${hLabel(h[1])}` : 'Fechado'}</span></li>`;
  }).join('');
  const openNow = $('#openNow');
  openNow.innerHTML = `${dot}${esc(st.text)}`;
  openNow.classList.toggle('is-open', st.open);

  // Rodapé
  const links = [];
  if (B.instagram) links.push(`<a href="https://instagram.com/${esc(B.instagram)}" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>@${esc(B.instagram)}</a>`);
  if (B.whatsapp) links.push(`<a href="${waLink(B.whatsapp, `Olá! Vim pelo site da ${B.name}.`)}" target="_blank" rel="noopener">WhatsApp</a>`);
  links.push('<a href="agendar.html">Agendar</a>', '<a href="#clube">' + esc(clubName) + '</a>');
  $('#footLinks').innerHTML = links.join('');
  $('#footCopy').textContent = `© ${new Date().getFullYear()} ${B.fullName || B.name} · ${(B.city || '').replace(' - ', ', ')}`;

  reveal();

  // Menu mobile: abre com transição (CSS), foco vai para o primeiro link, Esc e toque fora fecham
  // e o foco volta para o botão. No desktop (>= 1000px) o menu é a própria barra e nada disso roda.
  const burger = $('#burger'), nav = $('#nav'), topbar = $('#topbar');
  const desktop = window.matchMedia('(min-width: 1000px)');
  const isOpen = () => nav.classList.contains('open');
  function setMenu(open, returnFocus) {
    if (open === isOpen()) return;
    nav.classList.toggle('open', open);
    topbar.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    // focus() força o recálculo de estilo, então o link já está visível (visibility sem atraso ao abrir).
    if (open) { const a = $('a', nav); if (a) a.focus({ preventScroll: true }); }
    else if (returnFocus) burger.focus();
  }
  burger.addEventListener('click', () => setMenu(!isOpen()));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) setMenu(false, true); });
  document.addEventListener('pointerdown', (e) => { if (isOpen() && !topbar.contains(e.target)) setMenu(false); });
  desktop.addEventListener('change', () => setMenu(false));

  // Header: fundo sólido assim que a página sai do topo (sem vidro, ver site.css).
  const onScroll = () => topbar.classList.toggle('is-solid', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if ('IntersectionObserver' in window) {
    // A barra inferior some enquanto os CTAs do hero ou o CTA final estão na tela: evita dois botões iguais lado a lado.
    const bar = $('#bottombar'); const seen = new Set();
    const io = new IntersectionObserver((ents) => {
      ents.forEach(en => en.isIntersecting ? seen.add(en.target) : seen.delete(en.target));
      bar.classList.toggle('hide', seen.size > 0);
    });
    io.observe($('.hero-ctas')); io.observe($('.final .btn'));

    // Marca no menu a seção que ocupa o meio da tela.
    const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
    const spy = new IntersectionObserver((ents) => {
      ents.forEach(en => {
        if (!en.isIntersecting) return;
        navLinks.forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id));
        navLinks.forEach(a => { if (a.hasAttribute('aria-current')) a.setAttribute('aria-current', 'true'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });
  }
})();
