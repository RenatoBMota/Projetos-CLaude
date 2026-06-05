# Mercado Livre Promo Bot

Automação que busca promoções no Mercado Livre com desconto configurável e posta links de afiliado em grupos do WhatsApp.

## Requisitos

- Node.js 18+
- Conta no [Mercado Developers](https://developers.mercadolibre.com.br/) (para Client ID/Secret)
- Conta no [Programa de Afiliados ML](https://www.mercadolivre.com.br/afiliados)
- WhatsApp instalado no celular (para escanear o QR Code)

## Instalação

```bash
cd mercado-livre-promo
npm install
cp .env.example .env
```

Edite o `.env` com suas credenciais.

## Configuração

### 1. Credenciais do Mercado Livre

No [Mercado Developers](https://developers.mercadolibre.com.br/):
1. Crie um app em **Meus Aplicativos**
2. Copie o **Client ID** e **Client Secret**
3. Preencha `ML_CLIENT_ID` e `ML_CLIENT_SECRET` no `.env`

Para o `ML_AFFILIATE_ID`, acesse o painel de afiliados e copie seu ID de rastreamento.

### 2. Descobrir IDs dos grupos WhatsApp

Execute o comando abaixo e escaneie o QR Code:

```bash
node src/index.js --list-groups
```

Os IDs terão o formato `XXXXXXXXXXX-XXXXXXXXXX@g.us`. Copie os desejados para `WHATSAPP_GROUP_IDS` no `.env`, separados por vírgula.

### 3. Categorias (opcional)

Deixe `CATEGORIES` vazio para buscar em todas as categorias, ou informe IDs específicos:

| Categoria    | ID       |
|--------------|----------|
| Celulares    | MLB1051  |
| Computadores | MLB1055  |
| Televisores  | MLB1648  |
| Games        | MLB1144  |
| Eletrodomést.| MLB1574  |

## Uso

```bash
npm start
```

Na primeira execução, um QR Code será exibido no terminal. Escaneie com o WhatsApp do celular em **Aparelhos conectados**.

## Como funciona

1. A cada X minutos (configurável), busca produtos em promoção na API do ML
2. Filtra os que têm desconto acima do mínimo configurado
3. Verifica no banco local se o produto já foi postado (evita repetição por 7 dias)
4. Gera link de afiliado e envia mensagem formatada nos grupos configurados
5. Respeita o horário de silêncio (não envia fora do período configurado)

## Aviso

O uso do `whatsapp-web.js` é não-oficial e viola os Termos de Uso do WhatsApp. Use com moderação para evitar banimento da conta.
