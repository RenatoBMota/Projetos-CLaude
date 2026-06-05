const { initWhatsApp, listGroups } = require('./whatsapp');
const { startScheduler } = require('./scheduler');

const args = process.argv.slice(2);

async function main() {
  // Modo auxiliar: lista grupos disponíveis (útil para descobrir IDs)
  if (args.includes('--list-groups')) {
    console.log('🔌 Conectando ao WhatsApp para listar grupos...');
    await initWhatsApp();
    await listGroups();
    process.exit(0);
  }

  console.log('🚀 Mercado Livre Promo Bot iniciando...');
  console.log('📲 Aguarde a autenticação do WhatsApp...\n');

  await initWhatsApp();
  startScheduler();
}

main().catch(err => {
  console.error('💥 Erro fatal:', err.message);
  process.exit(1);
});
