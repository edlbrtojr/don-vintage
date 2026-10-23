/* Dados da Don Vintage usados por todas as telas da demonstração.
   Fonte: Cash Barber (sessão do dono), Google e Instagram — ver research/*.json.
   Tudo que for fictício para a demo (clientes, métricas, agenda) está em DV.demo
   e é gerado de forma determinística, para a apresentação mostrar sempre o mesmo. */

window.DV = {
  business: {
    name: 'Don Vintage',
    fullName: 'Don Vintage Barbearia',
    tagline: 'Tradicional & assinatura',
    slogan: 'Mais que um corte, é experiência.',
    mission: '3 unidades e uma só missão: a excelência.',
    clubName: 'Vintage Club',
    city: 'Rio Branco - AC',
    address: 'R. Rio de Janeiro, 1158 - Abraão Alab',
    neighborhood: 'Abraão Alab',
    phone: '(68) 99948-8502',
    whatsapp: '5568999488502', // só dígitos, com DDI
    instagram: 'donvintagebarbearia',
    instagramFollowers: 5293,
    // Soma das 3 unidades no Google em out/2026; média ponderada das notas 4,9 / 5,0 / 4,9.
    rating: 4.9,
    reviewsCount: 344,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Don+Vintage+Barbearia+Rio+Branco',
    // dia da semana (0=domingo) -> [abre, fecha] em "HH:MM"; null = fechado.
    // Google diz sáb 08–18; a bio do Instagram diz seg–sáb 09–19. Usamos o Google; confirmar com o dono.
    hours: {
      0: null,
      1: ['09:00', '19:00'],
      2: ['09:00', '19:00'],
      3: ['09:00', '19:00'],
      4: ['09:00', '19:00'],
      5: ['09:00', '19:00'],
      6: ['08:00', '18:00'],
    },
  },

  // 3 unidades (Google Business, out/2026). O agendamento começa escolhendo a unidade.
  units: [
    { id: 'abraao', name: 'Abraão Alab', address: 'R. Rio de Janeiro, 1158 - Abraão Alab', phone: '(68) 99948-8502', whatsapp: '5568999488502', rating: 4.9, reviewsCount: 156, mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Don+Vintage+Barbearia+R.+Rio+de+Janeiro+1158+Rio+Branco' },
    { id: 'europa', name: 'Jardim Europa', address: 'Alameda Grécia, 306 - Jardim Europa', phone: '(68) 99912-9776', whatsapp: '5568999129776', rating: 5.0, reviewsCount: 117, mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Don+Vintage+barbearia+Jardim+Europa+Rio+Branco' },
    { id: 'juliao', name: 'Manoel Julião', address: 'R. Cícero Leão de Paiva, 28 - Res. Iolanda', phone: '(68) 99955-8052', whatsapp: '5568999558052', rating: 4.9, reviewsCount: 71, mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Don+Vintage+Juliao+Rio+Branco' },
  ],

  // Preços reais do Cash Barber (portal do assinante, out/2026). O portal não mostra
  // duração: os minutos abaixo são estimativa de mercado — confirmar com o dono.
  // durationMin define quantos slots de 15 min o serviço ocupa na agenda.
  // inPlan = coberto 100% pelo Vintage Club; os demais têm 10% OFF para assinante.
  services: [
    { id: 'corte', name: 'Corte', price: 60, durationMin: 45, category: 'Cabelo', inPlan: true, description: 'Tesoura ou máquina, lavagem e finalização.' },
    { id: 'barba', name: 'Barba', price: 60, durationMin: 40, category: 'Barba', inPlan: true, description: 'Toalha quente, navalha e balm. O ritual completo.' },
    { id: 'barba-express', name: 'Barba Express', price: 45, durationMin: 20, category: 'Barba', inPlan: true, description: 'Alinhamento rápido na máquina e navalha.' },
    { id: 'pezinho', name: 'Pezinho', price: 20, durationMin: 15, category: 'Cabelo', inPlan: true, description: 'Acabamento de nuca e laterais entre um corte e outro.' },
    { id: 'raspar', name: 'Raspar na máquina', price: 40, durationMin: 20, category: 'Cabelo', inPlan: true, description: 'Máquina zero ou pente único.' },
    { id: 'sobrancelha-navalha', name: 'Sobrancelha na navalha', price: 20, durationMin: 10, category: 'Extras', description: 'Desenho limpo na navalha.' },
    { id: 'sobrancelha-pinca', name: 'Sobrancelha na pinça', price: 30, durationMin: 15, category: 'Extras', description: 'Acabamento fio a fio.' },
    { id: 'penteado', name: 'Penteado', price: 30, durationMin: 15, category: 'Cabelo', description: 'Finalização com produto para evento.' },
    { id: 'hidratacao', name: 'Hidratação', price: 40, durationMin: 20, category: 'Tratamentos', description: 'Máscara de hidratação para o cabelo.' },
    { id: 'hidratacao-barba', name: 'Hidratação de barba', price: 40, durationMin: 20, category: 'Tratamentos', description: 'Barba macia e alinhada por mais tempo.' },
    { id: 'tintura-barba', name: 'Tintura de barba', price: 50, durationMin: 30, category: 'Química', description: 'Cobertura de fios brancos na barba.' },
    { id: 'limpeza-pele', name: 'Limpeza de pele enzimática', price: 50, durationMin: 30, category: 'Tratamentos', description: 'Limpeza facial com enzimas.' },
    { id: 'limpeza-premium', name: 'Limpeza Premium Protocolo', price: 90, durationMin: 45, category: 'Tratamentos', description: 'Protocolo completo de limpeza facial.' },
    { id: 'depilacao-nariz', name: 'Depilação de nariz', price: 20, durationMin: 10, category: 'Extras', description: 'Rápida e sem drama.' },
    { id: 'luzes', name: 'Luzes', price: 120, durationMin: 90, category: 'Química', description: 'Mechas para iluminar o visual.' },
    { id: 'platinado', name: 'Platinado + corte', price: 299.9, durationMin: 180, category: 'Química', description: 'Descoloração completa, matização e corte.' },
    { id: 'alinhamento', name: 'Alinhamento', price: 140, priceFrom: true, durationMin: 90, category: 'Química', description: 'Alisamento e alinhamento dos fios.' },
    { id: 'massagem', name: 'Massagem 15 min', price: 10, durationMin: 15, category: 'Extras', description: 'Relaxa antes ou depois do corte.' },
  ],

  // Equipe real por unidade, como aparece no "Novo agendamento" do Cash Barber (out/2026),
  // com as fotos de lá. featured = selo "Destaque" que eles usam. O portal não informa
  // quais serviços cada um faz nem a comissão: todos recebem o catálogo inteiro (abaixo)
  // e 50% de comissão até o dono passar a regra real.
  barbers: [
    { id: 'italo', name: 'Italo', unit: 'abraao', featured: true },
    { id: 'alessandro', name: 'Alessandro', unit: 'abraao' },
    { id: 'fabio', name: 'Fabio', unit: 'abraao' },
    { id: 'misael', name: 'Misael Kennedy', unit: 'abraao' },
    { id: 'dolph', name: 'Dolph', unit: 'europa', featured: true },
    { id: 'willy', name: 'Willy', unit: 'europa' },
    { id: 'wesley', name: 'Wesley', unit: 'europa' },
    { id: 'jose', name: 'José', unit: 'europa' },
    { id: 'jaziel', name: 'Jaziel', unit: 'europa' },
    { id: 'allan', name: 'Állan', unit: 'europa' },
    { id: 'lucca', name: 'Lucca', unit: 'europa' },
    { id: 'bruna', name: 'Bruna', unit: 'juliao', featured: true },
    { id: 'jefferson', name: 'Jefferson', unit: 'juliao' },
  ],

  // Vintage Club: plano real do Cash Barber (selo "Mais vendido"). Na proposta, a cobrança
  // recorrente passa para o Asaas. Corte R$60 + barba R$60 = R$120/visita: o plano se paga em 2 visitas.
  plans: [
    {
      id: 'vintage-club', name: 'Vintage Club', subtitle: 'Corte + Barba ilimitado', price: 189.99, period: 'mês', highlight: true, badge: 'Mais vendido',
      covers: ['corte', 'barba', 'barba-express', 'pezinho', 'raspar'],
      perks: ['Corte, barba, barba express, pezinho e máquina ilimitados', '10% OFF em todos os outros serviços', '10% OFF em todos os produtos', 'Agenda liberada com 7 dias de antecedência'],
    },
  ],

  // Produtos reais do catálogo (preços do Cash Barber). Estoque, mínimo e custo são fictícios da demo.
  products: [
    { id: 'pomada-fox', name: 'Pomada Fox efeito teia', brand: 'Fox', price: 50, stock: 18, min: 6, cost: 24 },
    { id: 'pomada-po-million', name: 'Pomada em pó Million', brand: 'Million', price: 75, stock: 7, min: 4, cost: 38 },
    { id: 'pomada-macholandia', name: 'Pomada Macholândia matte 86g', brand: 'Macholândia', price: 90, stock: 5, min: 3, cost: 46 },
    { id: 'balm-don-alcides', name: 'Balm Don Alcides', brand: 'Don Alcides', price: 89.9, stock: 3, min: 4, cost: 44 },
    { id: 'balm-el-capitan', name: 'Balm El Capitan', brand: 'El Capitan', price: 75, stock: 9, min: 4, cost: 36 },
    { id: 'oleo-tower', name: 'Óleo para barba Tower', brand: 'Tower', price: 85, stock: 2, min: 4, cost: 41 },
    { id: 'shampoo-barba-fox', name: 'Shampoo para barba Fox 120ml', brand: 'Fox', price: 70, stock: 11, min: 5, cost: 32 },
    { id: 'minoxidil', name: 'Minoxidil', brand: '—', price: 140, stock: 6, min: 3, cost: 78 },
    { id: 'toppik', name: 'Toppik', brand: 'Toppik', price: 100, stock: 4, min: 2, cost: 55 },
    { id: 'kemei', name: 'Máquina Kemei', brand: 'Kemei', price: 199.9, stock: 3, min: 2, cost: 118 },
    { id: 'relogio', name: 'Relógio Don Vintage', brand: 'Don Vintage', price: 249.5, stock: 5, min: 2, cost: 120 },
    { id: 'pepsi', name: 'Pepsi', brand: 'Pepsi', price: 5.5, stock: 40, min: 24, cost: 2.6 },
  ],

  // Paráfrases dos temas recorrentes nas avaliações do Google (não são citações literais).
  reviews: [
    { name: 'Avaliação no Google', text: 'Atendimento excelente e personalizado, do início ao fim.', stars: 5 },
    { name: 'Avaliação no Google', text: 'Ambiente aconchegante e profissionais muito qualificados.', stars: 5 },
    { name: 'Avaliação no Google', text: 'Até o chocolate no final faz diferença. A melhor da cidade.', stars: 5 },
  ],

  links: {
    proposta: 'index.html',
    site: 'site.html',
    agendar: 'agendar.html',
    painel: 'painel.html',
  },
};

// Completa os barbeiros com os campos que as telas esperam (ver comentário em barbers).
DV.barbers.forEach(b => {
  b.role = b.role || (b.name === 'Bruna' ? 'Barbeira' : 'Barbeiro');
  b.photo = `assets/img/barbeiros/${b.id}.jpg`;
  b.services = b.services || DV.services.map(s => s.id);
  b.commission = b.commission || 50;
});

/* Utilidades compartilhadas */
DV.fmt = {
  brl(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); },
  initials(name) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase(); },
  dur(min) { return min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}` : `${min} min`; },
};

/* Gerador pseudoaleatório com semente fixa: a demo mostra os mesmos números em
   toda apresentação. Trocar a semente muda todos os dados fictícios de uma vez. */
DV.rng = (function (seed) {
  return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
})(20261023);
