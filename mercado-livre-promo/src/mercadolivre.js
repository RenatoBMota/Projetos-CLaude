const axios = require('axios');
const config = require('./config');

let accessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt - 60_000) {
    return accessToken;
  }

  const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
    grant_type: 'client_credentials',
    client_id: config.mercadoLivre.clientId,
    client_secret: config.mercadoLivre.clientSecret,
  });

  accessToken = response.data.access_token;
  tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
  return accessToken;
}

function buildAffiliateLink(permalink) {
  if (!config.mercadoLivre.affiliateId) return permalink;
  const url = new URL(permalink);
  url.searchParams.set('ref', config.mercadoLivre.affiliateId);
  return url.toString();
}

async function searchPromotions() {
  const token = await getAccessToken();
  const { minDiscountPercent, categories, maxProductsPerRun } = config.search;

  const categoriesToSearch = categories.length > 0 ? categories : [null];
  const results = [];

  for (const category of categoriesToSearch) {
    const params = {
      sort: 'price_asc',
      promotions: 'discount',
      limit: 50,
    };
    if (category) params.category = category;

    const searchUrl = `${config.mercadoLivre.apiBase}/sites/MLB/search`;
    const response = await axios.get(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });

    const items = response.data.results || [];

    for (const item of items) {
      const originalPrice = item.original_price;
      const price = item.price;

      if (!originalPrice || originalPrice <= price) continue;

      const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
      if (discountPercent < minDiscountPercent) continue;

      results.push({
        id: item.id,
        title: item.title,
        price,
        originalPrice,
        discountPercent,
        permalink: item.permalink,
        affiliateLink: buildAffiliateLink(item.permalink),
        thumbnail: item.thumbnail,
        condition: item.condition,
        availableQuantity: item.available_quantity,
      });

      if (results.length >= maxProductsPerRun) break;
    }

    if (results.length >= maxProductsPerRun) break;
  }

  // Ordena por maior desconto primeiro
  return results.sort((a, b) => b.discountPercent - a.discountPercent);
}

module.exports = { searchPromotions };
