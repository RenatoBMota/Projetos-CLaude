const cron = require('node-cron');
const config = require('./config');
const { searchPromotions } = require('./mercadolivre');
const { hasBeenPosted, markAsPosted, cleanOldEntries } = require('./database');
const { sendPromotion, isConnected } = require('./whatsapp');

function isQuietHours() {
  const now = new Date();
  const [startH, startM] = config.scheduler.quietHoursStart.split(':').map(Number);
  const [endH, endM] = config.scheduler.quietHoursEnd.split(':').map(Number);

  const current = now.getHours() * 60 + now.getMinutes();
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  if (start > end) {
    // Overnight: ex. 22:00 → 08:00
    return current >= start || current < end;
  }
  return current >= start && current < end;
}

async function runCycle() {
  if (!isConnected()) {
    console.log('⏸  WhatsApp não conectado, aguardando...');
    return;
  }

  if (isQuietHours()) {
    console.log(`🌙 Horário de silêncio ativo (${config.scheduler.quietHoursStart} - ${config.scheduler.quietHoursEnd}), pulando ciclo.`);
    return;
  }

  console.log(`\n🔍 [${new Date().toLocaleString('pt-BR')}] Buscando promoções...`);

  try {
    const products = await searchPromotions();
    const newProducts = products.filter(p => !hasBeenPosted(p.id));

    if (newProducts.length === 0) {
      console.log('ℹ️  Nenhuma promoção nova encontrada.');
      return;
    }

    console.log(`📦 ${newProducts.length} promoção(ões) nova(s) encontrada(s).`);

    for (const product of newProducts) {
      await sendPromotion(product);
      markAsPosted(product);
      // Pausa de 3 segundos entre envios para evitar spam
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (err) {
    console.error('❌ Erro no ciclo de busca:', err.message);
  }
}

function startScheduler() {
  const minutes = config.scheduler.intervalMinutes;
  const cronExpr = `*/${minutes} * * * *`;

  console.log(`⏱  Agendador iniciado: verificando a cada ${minutes} minuto(s)`);

  // Roda imediatamente na inicialização
  runCycle();

  // Limpa entradas antigas diariamente às 03:00
  cron.schedule('0 3 * * *', () => {
    const removed = cleanOldEntries(7);
    if (removed > 0) console.log(`🧹 ${removed} entrada(s) antiga(s) removida(s) do banco.`);
  });

  cron.schedule(cronExpr, runCycle);
}

module.exports = { startScheduler, runCycle };
