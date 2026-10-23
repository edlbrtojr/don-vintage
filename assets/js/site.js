/* Landing page: tudo que é dado (serviços, preços, barbeiros, planos, unidades)
   vem de window.DV — o HTML só tem a estrutura. */
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

  /* Hora de Rio Branco (UTC-5, sem horário de verão desde 2019), independente
     do fuso do aparelho de quem abre a demo. Se o Acre voltar a ter horário de
     verão, trocar por Intl com timeZone 'America/Rio_Branco'. */
  function nowRB() { return new Date(Date.now() - 5 * 3600e3); }
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const hLabel = (hhmm) => hhmm.replace(':00', 'h').replace(':', 'h');

  // Texto da marca
  document.querySelectorAll('[data-dv="name"]').forEach(el => { el.textContent = B.name || el.textContent; });
  $('#heroCity').textContent = (B.city || 'Rio Branco - AC').replace(' - ', ' · ');
  $('#heroTag').textContent = B.slogan || B.tagline || '';
  $('#heroMission').textContent = B.mission || '';
  $('#clubTitle').textContent = clubName;

  // Status aberto/fechado
  function openStatus() {
    const n = nowRB(); const d = n.getUTCDay(); const h = B.hours && B.hours[d];
    const cur = n.getUTCHours() * 60 + n.getUTCMinutes();
    if (h && cur >= toMin(h[0]) && cur < toMin(h[1])) return { open: true, text: `Aberto agora · até ${hLabel(h[1])}` };
    if (h && cur < toMin(h[0])) return { open: false, text: `Fechado · abre hoje ${hLabel(h[0])}` };
    for (let i = 1; i <= 7; i++) {
      const dd = (d + i) % 7; const hh = B.hours && B.hours[dd];
      if (hh) return { open: false, text: `Fechado · abre ${i === 1 ? 'amanhã' : DAYS_S[dd].toLowerCase()} ${hLabel(hh[0])}` };
    }
    return { open: false, text: 'Fechado' };
  }
  const st = openStatus();

  // Chips do hero
  const meta = [];
  if (B.rating) meta.push(`<span class="chip"><span class="star">★</span> <b>${fmtRating(B.rating)}</b> no Google${B.reviewsCount ? ` · ${B.reviewsCount} avaliações` : ''}</span>`);
  meta.push(`<span class="chip ${st.open ? 'ok' : ''}"><span class="dot"></span> ${esc(st.text)}</span>`);
  if (units.length > 1) meta.push(`<span class="chip">${units.length} unidades</span>`);
  if (B.instagramFollowers) meta.push(`<span class="chip">${(B.instagramFollowers / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil no Instagram</span>`);
  $('#heroMeta').innerHTML = meta.join('');

  // Serviços: destaque para os mais pedidos; o catálogo completo (18+) fica atrás de "ver todos"
  // para o celular não virar um rolo infinito. Se a lista FEATURED sumir dos dados, mostra os 6 primeiros.
  const FEATURED = ['corte', 'barba', 'barba-express', 'pezinho', 'raspar', 'hidratacao-barba'];
  const price = (s) => (s.priceFrom ? '<small>a partir de</small>' : '') + brl(s.price);
  const svcCard = (s) => `
    <article class="card svc reveal">
      <div class="svc-top">
        <div class="svc-tags"><span class="chip">${esc(s.category || 'Serviço')}</span>${s.inPlan ? `<span class="chip brass">No ${esc(clubName)}</span>` : ''}</div>
        <span class="svc-price">${price(s)}</span>
      </div>
      <h3>${esc(s.name)}</h3>
      <p>${esc(s.description || '')}</p>
      <div class="svc-foot">
        <span class="label">⏱ ${DV.fmt.dur(s.durationMin)}</span>
        <a class="btn btn-ghost" href="agendar.html?servico=${encodeURIComponent(s.id)}">Agendar</a>
      </div>
    </article>`;
  let feat = FEATURED.map(id => DV.services.find(s => s.id === id)).filter(Boolean);
  if (feat.length < 3) feat = DV.services.slice(0, 6);
  const rest = DV.services.filter(s => !feat.includes(s));
  const cats = [...new Set(rest.map(s => s.category || 'Outros'))];
  $('#services').innerHTML = feat.map(svcCard).join('');
  if (rest.length) {
    const more = document.createElement('div');
    more.className = 'svc-more';
    more.innerHTML = `
      <div class="svc-all" id="svcAll" hidden>
        ${cats.map(c => `<h3 class="label svc-cat">${esc(c)}</h3>
          <ul class="svc-list card">${rest.filter(s => (s.category || 'Outros') === c).map(s => `
            <li><a href="agendar.html?servico=${encodeURIComponent(s.id)}">
              <span><b>${esc(s.name)}</b><small>${DV.fmt.dur(s.durationMin)}</small></span>
              <span class="svc-price sm">${price(s)}</span></a></li>`).join('')}
          </ul>`).join('')}
      </div>
      <button class="btn btn-ghost" id="svcToggle" aria-expanded="false" aria-controls="svcAll">Ver todos os ${DV.services.length} serviços</button>`;
    $('#services').after(more);
    $('#svcToggle').addEventListener('click', (e) => {
      const all = $('#svcAll'); const open = all.hidden;
      all.hidden = !open; e.currentTarget.setAttribute('aria-expanded', String(open));
      e.currentTarget.textContent = open ? 'Mostrar menos' : `Ver todos os ${DV.services.length} serviços`;
      if (!open) document.getElementById('servicos').scrollIntoView();
    });
  }

  // Barbeiros
  const unitName = (id) => (units.find(u => u.id === id) || {}).name;
  $('#barbers').innerHTML = DV.barbers.map(b => {
    const av = b.photo ? `<img src="${esc(b.photo)}" alt="">` : esc(DV.fmt.initials(b.name));
    const svcs = (b.services || []).map(id => (DV.services.find(s => s.id === id) || {}).name).filter(Boolean);
    const tags = [b.unit && unitName(b.unit) ? `<span class="chip brass">${esc(unitName(b.unit))}</span>` : '', `<span class="chip">${svcs.length} serviços</span>`].join('');
    return `
    <a class="card barber reveal" href="agendar.html?barbeiro=${encodeURIComponent(b.id)}${b.unit ? '&unidade=' + encodeURIComponent(b.unit) : ''}">
      <span class="avatar">${av}</span>
      <h3>${esc(b.name)}</h3>
      <span class="muted">${esc(b.role || 'Barbeiro')}</span>
      <span class="tags">${tags}</span>
      <span class="go">Agendar com ${esc(b.name.split(' ')[0])} →</span>
    </a>`;
  }).join('');

  // Planos
  const planCard = (p) => `
    <article class="card plan reveal ${p.highlight || DV.plans.length === 1 ? 'hl' : ''}">
      ${p.badge || p.highlight ? `<span class="plan-flag">${esc(p.badge || 'Mais escolhido')}</span>` : ''}
      <p class="eyebrow">${esc(p.subtitle || clubName)}</p>
      <h3>${esc(p.name)}</h3>
      <div class="plan-price"><b>${brl(p.price)}</b><span>/${esc(p.period || 'mês')}</span></div>
      <ul class="perks">${(p.perks || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <a class="btn btn-primary btn-block" href="agendar.html?plano=${encodeURIComponent(p.id)}">Assinar o ${esc(p.name)}</a>
      <p class="plan-note">Renovação mensal automática no cartão ou Pix</p>
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
    <article class="card plan-math reveal">
      <p class="eyebrow">Faça a conta</p>
      <div class="eq">
        <div><span>Corte</span><b>${brl(svc('corte').price)}</b></div>
        <i>+</i>
        <div><span>Barba</span><b>${brl(svc('barba').price)}</b></div>
        <i>=</i>
        <div class="res"><span>por visita</span><b>${brl(visit)}</b></div>
      </div>
      <p class="pays">O ${esc(one.name)} <b>se paga em ${n} visita${n > 1 ? 's' : ''}</b>. Da ${n + 1}ª em diante, é por conta da casa.</p>
      <div class="visits" aria-hidden="true">${[1, 2, 3, 4].map(i => `<span class="${i <= n ? 'paid' : 'free'}">${i}ª</span>`).join('')}</div>
      <p class="plan-note">Avulso, 4 visitas no mês sairiam ${brl(visit * 4)}.</p>
    </article>`;
  }
  $('#plans').classList.toggle('single', !!one);
  $('#plans').innerHTML = DV.plans.map(planCard).join('') + math;

  // Avaliações
  if (B.rating) {
    $('#ratingBig').innerHTML = `<div class="rating-big"><b>${fmtRating(B.rating)}</b><div><span class="stars">★★★★★</span><small>${B.reviewsCount ? B.reviewsCount + ' avaliações no Google' : 'no Google'}${units.length > 1 ? ' · ' + units.length + ' unidades' : ''}</small></div></div>`;
  }
  const rv = DV.reviews || [];
  $('#reviews').classList.toggle('single', rv.length < 2);
  $('#reviews').innerHTML = rv.map(r => `
    <figure class="card review reveal" style="margin:0">
      <span class="stars">${stars(r.stars)}</span>
      <p>${esc(r.text)}</p>
      <footer><span class="avatar">${/google/i.test(r.name || '') ? 'G' : esc(DV.fmt.initials(r.name || 'C'))}</span>${esc(r.name || 'Cliente')}${r.source ? ' · ' + esc(r.source) : ''}</footer>
    </figure>`).join('');

  // Unidades
  $('#unitsTitle').textContent = units.length > 1 ? `${units.length} unidades em Rio Branco` : 'Localização';
  $('#unitsSub').textContent = B.mission || '';
  $('#units').innerHTML = units.map((u, i) => `
    <article class="card unit reveal">
      <a class="map" href="${esc(u.mapsUrl || B.mapsUrl)}" target="_blank" rel="noopener" aria-label="Abrir ${esc(u.name)} no Google Maps" style="--r-ang:${100 + i * 25}deg">
        <span class="map-grid" aria-hidden="true"></span>
        <span class="map-pin" aria-hidden="true"><span>DV</span></span>
      </a>
      <div class="unit-body">
        <p class="eyebrow">Unidade</p>
        <h3>${esc(u.name)}</h3>
        <p class="addr">${esc(u.address || '')}<br>${esc(B.city || '')}</p>
        <div class="meta">
          ${u.rating ? `<span class="chip"><span class="star">★</span> ${fmtRating(u.rating)}${u.reviewsCount ? ` · ${u.reviewsCount}` : ''}</span>` : ''}
          ${u.phone ? `<span class="chip">${esc(u.phone)}</span>` : ''}
        </div>
      </div>
      <div class="unit-ctas">
        <a class="btn btn-ghost" href="${esc(u.mapsUrl || B.mapsUrl)}" target="_blank" rel="noopener">Maps</a>
        ${u.whatsapp ? `<a class="btn btn-wa" href="${waLink(u.whatsapp, `Olá! Vim pelo site da ${B.name} (${u.name}).`)}" target="_blank" rel="noopener">WhatsApp</a>`
          : `<a class="btn btn-primary" href="agendar.html?unidade=${encodeURIComponent(u.id)}">Agendar</a>`}
      </div>
    </article>`).join('');

  // Horários
  const today = nowRB().getUTCDay();
  const order = [1, 2, 3, 4, 5, 6, 0]; // semana começando na segunda, como se lê no balcão
  $('#hours').innerHTML = order.map(d => {
    const h = B.hours && B.hours[d];
    return `<li class="${d === today ? 'today' : ''} ${h ? '' : 'closed'}"><span>${DAYS[d]}${d === today ? ' · hoje' : ''}</span><span>${h ? `${hLabel(h[0])} – ${hLabel(h[1])}` : 'Fechado'}</span></li>`;
  }).join('');
  $('#openNow').textContent = st.text;

  // Rodapé
  const links = [];
  if (B.instagram) links.push(`<a href="https://instagram.com/${esc(B.instagram)}" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>@${esc(B.instagram)}</a>`);
  if (B.whatsapp) links.push(`<a href="${waLink(B.whatsapp, `Olá! Vim pelo site da ${B.name}.`)}" target="_blank" rel="noopener">WhatsApp</a>`);
  links.push('<a href="agendar.html">Agendar</a>', '<a href="#clube">' + esc(clubName) + '</a>');
  $('#footLinks').innerHTML = links.join('');
  $('#footCopy').textContent = `© ${new Date().getFullYear()} ${B.fullName || B.name} · ${B.city || ''}`;

  // Menu mobile
  const burger = $('#burger'), nav = $('#nav');
  const setMenu = (open) => { nav.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open)); };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // Sombra do header ao rolar
  const topbar = $('#topbar');
  const onScroll = () => topbar.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if ('IntersectionObserver' in window) {
    // A barra inferior some enquanto os CTAs do hero ou o CTA final estão na tela: evita dois botões iguais lado a lado.
    const bar = $('#bottombar'); const seen = new Set();
    const io = new IntersectionObserver((ents) => {
      ents.forEach(en => en.isIntersecting ? seen.add(en.target) : seen.delete(en.target));
      bar.classList.toggle('hide', seen.size > 0);
      document.body.classList.toggle('bar-hidden', seen.size > 0);
    });
    io.observe($('.hero-ctas')); io.observe($('.final .btn'));

    const rev = new IntersectionObserver((ents) => ents.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); rev.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(el => rev.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }
})();
