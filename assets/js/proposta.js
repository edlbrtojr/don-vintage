/* Página da proposta: monta módulos e investimento a partir de dados simples,
   para ajustar valores sem mexer no HTML. */

/* Valores em reais. null = mostra "a combinar".
   Mensalidade ancorada no custo atual: só o plano FULL do Cash Barber já é R$ 800 e a taxa
   por assinante deles fica ~R$ 3,40 acima da do Asaas. Com R$ 278,99 por unidade (3 × = R$ 836,97)
   o dono paga menos que hoje a partir de ~12 assinantes. Se subir a mensalidade, confira a calculadora: o argumento
   "sai mais barato" precisa continuar verdadeiro para a faixa real de assinantes deles.
   Implantação no piso da faixa de mercado para sistema sob medida de PME (R$ 15–40 mil),
   dividida por fase entregue para o dono só pagar pelo que já está funcionando. */
const PRECO = {
  implantacao: 15000,
  parcelasPorFase: 3,
  mensalidadePorUnidade: 278.99,
  unidades: DV.units.length,
  // Margem do fornecedor sobre cada cobrança, recebida via split do Asaas (walletId próprio).
  // Aparece como linha separada, não embutida na taxa do Asaas, porque a tabela do Asaas é pública
  // e o dono pode conferir. Cada 0,1% ≈ R$ 0,19 por assinante; com 150 assinantes a economia
  // mostrada (~R$ 445/mês) só zera perto de 1,7%.
  taxaPlataforma: 0.001,
};
PRECO.mensalidade = PRECO.mensalidadePorUnidade == null ? null : +(PRECO.mensalidadePorUnidade * PRECO.unidades).toFixed(2);

/* Tabelas públicas usadas na calculadora (research/precos.json). */
const PLANO_CLUBE = 189.99;
const CASH_FULL = 800;
// Cash Barber, cartão de crédito: [assinantes mínimos, % , fixo]. Termos de Uso v3.2, cláusula 5.
const CASH_FAIXAS = [
  [1000, 0.0289, 0.59], [850, 0.0289, 0.69], [700, 0.0299, 0.89], [500, 0.0329, 1.29],
  [300, 0.0349, 1.49], [200, 0.0369, 1.69], [0, 0.0399, 1.99],
];
// Asaas, crédito à vista/recorrente, tabela padrão (sem os 3 meses promocionais).
const ASAAS = { pct: 0.0299, fixo: 0.49 };

const MODULOS = [
  ['Site próprio', 'Serviços, preços, equipe, Vintage Club e mapa das 3 unidades. Rápido no celular e encontrável no Google.'],
  ['Agendamento online', 'Horários reais por barbeiro, Pix na hora e lembrete automático no WhatsApp.'],
  ['CRM de clientes', 'Histórico, frequência, barbeiro preferido e aviso de quem sumiu para chamar de volta.'],
  ['Barbeiros e comissões', 'Agenda por unidade, bloqueios e comissão calculada a cada atendimento, inclusive de assinante.'],
  ['Vintage Club', 'Cobrança recorrente no Asaas, cartão ou Pix, plano liberado ou pausado sozinho.'],
  ['Gestão da barbearia', 'Caixa por unidade, despesas, contas a pagar, estoque com alerta de reposição e resultado do mês.'],
];
document.getElementById('modulos').innerHTML = MODULOS.map(([t, d]) => `<div data-reveal><dt>${t}</dt><dd>${d}</dd></div>`).join('');

// Rostos da equipe real: destaques primeiro, até 7, para provar que a demo é deles.
const time = [...DV.barbers].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, 7);
document.getElementById('team').innerHTML = time.map((b, k) =>
  `<span class="avatar" style="--k:${k}" title="${b.name}"><img src="${b.photo}" alt="${b.name}" loading="lazy" width="40" height="40"></span>`).join('');

const valor = v => v == null ? '<span class="tbd">a combinar</span>' : DV.fmt.brl(v);
document.getElementById('investimento').innerHTML = `
  <div class="invest-item">
    <span class="label">Implantação</span>
    <strong class="display">${valor(PRECO.implantacao)}</strong>
    <span class="muted small">${PRECO.implantacao == null ? 'pagamento único' : `${PRECO.parcelasPorFase}× de ${DV.fmt.brl(PRECO.implantacao / PRECO.parcelasPorFase)}, uma na entrega de cada fase`}</span>
  </div>
  <div class="invest-item">
    <span class="label">Mensalidade</span>
    <strong class="display">${valor(PRECO.mensalidadePorUnidade)}${PRECO.mensalidadePorUnidade == null ? '' : '<small>/mês por unidade</small>'}</strong>
    <span class="muted small">${PRECO.unidades} unidades: ${valor(PRECO.mensalidade)}/mês · barbeiros e assinantes ilimitados</span>
  </div>`;

document.getElementById('invest-inc').innerHTML = [
  'Migração de serviços, produtos, barbeiros e clientes',
  'Hospedagem, domínio donvintage.com.br e certificado',
  'Suporte por WhatsApp e treinamento da equipe',
  'Atualizações e melhorias contínuas',
  PRECO.taxaPlataforma
    ? `Taxa da plataforma de só ${(PRECO.taxaPlataforma * 100).toLocaleString('pt-BR')}% por cobrança, sem valor fixo`
    : 'Sem taxa por assinante, sem limite de unidades',
].map(t => `<li>${t}</li>`).join('');

/* Calculadora hoje x proposta */
const calcN = document.getElementById('calc-n');
function custos(n) {
  const [, pct, fixo] = CASH_FAIXAS.find(([min]) => n >= min);
  const taxaCash = n * (PLANO_CLUBE * pct + fixo);
  const taxaAsaas = n * (PLANO_CLUBE * ASAAS.pct + ASAAS.fixo);
  const taxaPlat = n * PLANO_CLUBE * (PRECO.taxaPlataforma || 0);
  return {
    hoje: CASH_FULL + taxaCash, taxaCash, pctCash: pct, fixoCash: fixo,
    nos: (PRECO.mensalidade || 0) + taxaAsaas + taxaPlat, taxaAsaas, taxaPlat,
  };
}
const brl0 = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pctTxt = p => (p * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%';
const $id = id => document.getElementById(id);
let ultimaEco = null;
function renderCalc() {
  const n = +calcN.value;
  const c = custos(n);
  // Trilho preenchido até o polegar
  calcN.style.setProperty('--p', ((n - calcN.min) / (calcN.max - calcN.min) * 100) + '%');
  $id('calc-n-out').textContent = n;
  DV.motion.countUp($id('calc-hoje'), c.hoje, brl0);
  DV.motion.countUp($id('calc-nos'), c.nos, brl0);
  $id('calc-hoje-det').innerHTML = `
    <li><span>Plano FULL</span><b>${brl0(CASH_FULL)}</b></li>
    <li><span>Taxa ${pctTxt(c.pctCash)} + ${DV.fmt.brl(c.fixoCash)}</span><b>${brl0(c.taxaCash)}</b></li>`;
  $id('calc-nos-det').innerHTML = `
    <li><span>Sistema, ${PRECO.unidades} unid.</span><b>${brl0(PRECO.mensalidade || 0)}</b></li>
    <li><span>Asaas ${pctTxt(ASAAS.pct)} + ${DV.fmt.brl(ASAAS.fixo)}</span><b>${brl0(c.taxaAsaas)}</b></li>
    ${PRECO.taxaPlataforma ? `<li><span>Plataforma ${pctTxt(PRECO.taxaPlataforma)}</span><b>${brl0(c.taxaPlat)}</b></li>` : ''}`;
  const eco = c.hoje - c.nos;
  const ecoEl = $id('calc-eco');
  if (eco > 0) DV.motion.countUp(ecoEl, eco, v => `${brl0(v)}/mês · ${brl0(v * 12)}/ano`);
  else { ecoEl.dataset.v = 0; ecoEl.textContent = 'empata'; }
  // Pulso só quando a economia muda de faixa de R$ 50, para não piscar a cada passo do slider
  const faixa = Math.round(eco / 50);
  if (ultimaEco !== null && faixa !== ultimaEco) { const box = ecoEl.parentElement; box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump'); }
  ultimaEco = faixa;
}
calcN.addEventListener('input', renderCalc);
renderCalc();
DV.motion.reveal();

document.getElementById('ano').textContent = new Date().getFullYear();

// Sem WhatsApp do dono da proposta cadastrado, o CTA leva à demo em vez de um link quebrado.
const cta = document.getElementById('cta-whats');
const msg = encodeURIComponent('Fala! Vi a proposta do sistema para a Don Vintage e quero conversar.');
cta.href = DV.business.ownerWhatsapp ? `https://wa.me/${DV.business.ownerWhatsapp}?text=${msg}` : 'agendar.html';
