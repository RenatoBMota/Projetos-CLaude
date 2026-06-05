const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('./config');

let client = null;
let isReady = false;

function formatPrice(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function buildMessage(product) {
  const conditionLabel = product.condition === 'new' ? 'Novo' : 'Usado';
  return [
    `🔥 *PROMOÇÃO MERCADO LIVRE* 🔥`,
    ``,
    `📦 *${product.title}*`,
    ``,
    `~~${formatPrice(product.originalPrice)}~~ → *${formatPrice(product.price)}*`,
    `🏷️ *${product.discountPercent}% OFF*`,
    `📌 ${conditionLabel}`,
    ``,
    `🔗 ${product.affiliateLink}`,
    ``,
    `_Oferta por tempo limitado!_`,
  ].join('\n');
}

async function initWhatsApp() {
  return new Promise((resolve, reject) => {
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: require('path').join(__dirname, '../data/wwebjs_auth'),
      }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    client.on('qr', (qr) => {
      console.log('\n📱 Escaneie o QR Code abaixo com o WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
      console.log('✅ WhatsApp conectado!');
      isReady = true;
      resolve(client);
    });

    client.on('auth_failure', (msg) => {
      console.error('❌ Falha na autenticação WhatsApp:', msg);
      reject(new Error(msg));
    });

    client.on('disconnected', (reason) => {
      console.warn('⚠️ WhatsApp desconectado:', reason);
      isReady = false;
    });

    client.initialize();
  });
}

async function listGroups() {
  if (!isReady) throw new Error('WhatsApp não está conectado');
  const chats = await client.getChats();
  const groups = chats.filter(c => c.isGroup);
  console.log('\n📋 Grupos disponíveis:');
  groups.forEach(g => console.log(`  ID: ${g.id._serialized}  |  Nome: ${g.name}`));
  return groups;
}

async function sendPromotion(product) {
  if (!isReady) throw new Error('WhatsApp não está conectado');

  const groupIds = config.whatsapp.groupIds;
  if (groupIds.length === 0) {
    console.warn('⚠️  Nenhum grupo configurado em WHATSAPP_GROUP_IDS');
    return;
  }

  const message = buildMessage(product);

  for (const groupId of groupIds) {
    try {
      const chat = await client.getChatById(groupId);
      await chat.sendMessage(message);
      console.log(`✉️  Enviado para "${chat.name}": ${product.title}`);
    } catch (err) {
      console.error(`❌ Erro ao enviar para ${groupId}:`, err.message);
    }
  }
}

module.exports = { initWhatsApp, listGroups, sendPromotion, isConnected: () => isReady };
