require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

module.exports = {
  mercadoLivre: {
    clientId: process.env.ML_CLIENT_ID,
    clientSecret: process.env.ML_CLIENT_SECRET,
    affiliateId: process.env.ML_AFFILIATE_ID,
    apiBase: 'https://api.mercadolibre.com',
  },
  search: {
    minDiscountPercent: parseInt(process.env.MIN_DISCOUNT_PERCENT || '30', 10),
    categories: process.env.CATEGORIES ? process.env.CATEGORIES.split(',').map(c => c.trim()) : [],
    maxProductsPerRun: parseInt(process.env.MAX_PRODUCTS_PER_RUN || '5', 10),
  },
  scheduler: {
    intervalMinutes: parseInt(process.env.CRON_INTERVAL_MINUTES || '30', 10),
    quietHoursStart: process.env.QUIET_HOURS_START || '22:00',
    quietHoursEnd: process.env.QUIET_HOURS_END || '08:00',
  },
  whatsapp: {
    groupIds: process.env.WHATSAPP_GROUP_IDS
      ? process.env.WHATSAPP_GROUP_IDS.split(',').map(g => g.trim())
      : [],
  },
  dbPath: require('path').join(__dirname, '../data/promotions.db'),
};
