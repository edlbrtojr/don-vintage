/* Página da proposta: monta módulos e investimento a partir de dados simples,
   para ajustar valores sem mexer no HTML. */

/* Valores em reais. null = mostra "a combinar".
   Mensalidade ancorada no custo atual: só o plano FULL do Cash Barber já é R$ 800 e a taxa
   por assinante deles fica ~R$ 3,40 acima da do Asaas. Com R$ 990 o dono paga menos que hoje
   a partir de ~60 assinantes. Se subir a mensalidade, confira a calculadora: o argumento
   "sai mais barato" precisa continuar verdadeiro para a faixa real de assinantes deles.
   Implantação no piso da faixa de mercado para sistema sob medida de PME (R$ 15–40 mil),
   dividida por fase entregue para o dono só pagar pelo que já está funcionando. */
const PRECO = {
  implantacao: 15000,
  parcelasPorFase: 3,
  mensalidade: 990,
  // Margem do fornecedor sobre cada cobrança, recebida via split do Asaas (walletId próprio).
  // Aparece como linha separada, não embutida na taxa do Asaas, porque a tabela do Asaas é pública
  // e o dono pode conferir. Cada 0,1% ≈ R$ 0,19 por assinante; com 150 assinantes a economia
  // mostrada (~R$ 320/mês) só zera perto de 1,1%.
  taxaPlataforma: 0.001,
};

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
  { t: 'Site próprio', d: 'Página da Don Vintage com serviços, preços, barbeiros, clube e mapa. Otimizada para Google e celular.', i: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>' },
  { t: 'Agendamento online', d: 'Fluxo em 30 segundos, horários reais por barbeiro, Pix na hora e lembrete automático no WhatsApp.', i: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>' },
  { t: 'CRM de clientes', d: 'Histórico, frequência, barbeiro preferido e aviso de quem está sumido para campanha de retorno.', i: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/>' },
  { t: 'Barbeiros e comissões', d: 'Agenda individual por unidade, bloqueios, metas e comissão calculada sozinha a cada atendimento.', i: '<path d="M6 3l12 12M6 15L18 3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>' },
  { t: 'Clube de assinatura', d: 'Vintage Club com cobrança recorrente no Asaas, cartão ou Pix, liberação automática do plano.', i: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>' },
  { t: 'Gestão da barbearia', d: 'Caixa por unidade, despesas, contas a pagar, estoque de produtos com alerta de reposição e relatório do mês.', i: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' },
];

document.getElementById('modulos').innerHTML = MODULOS.map((m, n) => `
  <article class="mod card">
    <span class="mod-ico" aria-hidden="true"><svg viewBox="0 0 24 24">${m.i}</svg></span>
    <div>
      <h3><span class="mod-n">${String(n + 1).padStart(2, '0')}</span> ${m.t}</h3>
      <p class="muted">${m.d}</p>
    </div>
  </article>`).join('');

const valor = v => v == null ? '<span class="tbd">a combinar</span>' : DV.fmt.brl(v);
document.getElementById('investimento').innerHTML = `
  <div class="invest-item">
    <span class="label">Implantação</span>
    <strong class="display">${valor(PRECO.implantacao)}</strong>
    <span class="muted small">${PRECO.implantacao == null ? 'pagamento único' : `${PRECO.parcelasPorFase}× de ${DV.fmt.brl(PRECO.implantacao / PRECO.parcelasPorFase)}, uma na entrega de cada fase`}</span>
  </div>
  <div class="invest-item">
    <span class="label">Mensalidade</span>
    <strong class="display">${valor(PRECO.mensalidade)}${PRECO.mensalidade == null ? '' : '<small>/mês</small>'}</strong>
    <span class="muted small">3 unidades · barbeiros e assinantes ilimitados</span>
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
function renderCalc() {
  const n = +calcN.value;
  const c = custos(n);
  const brl0 = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const pctTxt = p => (p * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%';
  document.getElementById('calc-n-out').textContent = n;
  document.getElementById('calc-hoje').textContent = brl0(c.hoje) + '/mês';
  document.getElementById('calc-nos').textContent = brl0(c.nos) + '/mês';
  document.getElementById('calc-hoje-det').innerHTML = `
    <li><span>Plano FULL</span><b>${brl0(CASH_FULL)}</b></li>
    <li><span>Taxa ${pctTxt(c.pctCash)} + ${DV.fmt.brl(c.fixoCash)}</span><b>${brl0(c.taxaCash)}</b></li>`;
  document.getElementById('calc-nos-det').innerHTML = `
    <li><span>Sistema Don Vintage</span><b>${brl0(PRECO.mensalidade || 0)}</b></li>
    <li><span>Asaas ${pctTxt(ASAAS.pct)} + ${DV.fmt.brl(ASAAS.fixo)}</span><b>${brl0(c.taxaAsaas)}</b></li>
    ${PRECO.taxaPlataforma ? `<li><span>Plataforma ${pctTxt(PRECO.taxaPlataforma)}</span><b>${brl0(c.taxaPlat)}</b></li>` : ''}`;
  const eco = c.hoje - c.nos;
  document.getElementById('calc-eco').textContent = eco > 0 ? `${brl0(eco)}/mês · ${brl0(eco * 12)}/ano` : 'empata';
}
calcN.addEventListener('input', renderCalc);
renderCalc();

document.getElementById('ano').textContent = new Date().getFullYear();

// Sem WhatsApp do dono da proposta cadastrado, o CTA leva à demo em vez de um link quebrado.
const cta = document.getElementById('cta-whats');
const msg = encodeURIComponent('Fala! Vi a proposta do sistema para a Don Vintage e quero conversar.');
cta.href = DV.business.ownerWhatsapp ? `https://wa.me/${DV.business.ownerWhatsapp}?text=${msg}` : 'agendar.html';
