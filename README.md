# WhatsApp Market Report Bot

This bot sends a PDF snapshot of the top ten stock markets in the world to a WhatsApp chat. It uses WhatsApp Web automation via `whatsapp-web.js` and a market data proxy via Alpha Vantage.

## Definition of "Top Ten"
Top ten stock markets are defined by domestic market capitalization using the latest World Federation of Exchanges (WFE) annual statistics.

Source: https://www.world-exchanges.org/our-work/statistics

## Summary of PDF Content
- Title, generation date/time, and author name
- Table with: rank, market name, region, proxy ticker, last price, and quote timestamp
- Data source and proxy note

## Requirements
- Node.js 18+ recommended
- WhatsApp Web logged in on your machine
- Alpha Vantage API key

## Setup
1. Install dependencies:
   - `npm install`
2. Create a `.env` file (see `.env.example`):
   - `ALPHA_VANTAGE_API_KEY=...`
   - `REPORT_AUTHOR=Your Full Name`
   - Optional: `USE_MOCK_DATA=true` for local-only testing
3. Start the bot:
   - `npm run start`
4. In WhatsApp, send `!report` (or `!markets`) to the bot.

If you do not have a personal test chat, you may send the command to +852 68720365.

## Data Sources and Notes
- Market ranking source: WFE domestic market capitalization statistics.
- Quote source: Alpha Vantage `BATCH_STOCK_QUOTES` endpoint.
- Proxy tickers are US-listed ETFs representing each market.

## Limitations and Compliance Notes
- Alpha Vantage free tier has rate limits; use `USE_MOCK_DATA=true` for local-only testing.
- WhatsApp Web automation may be subject to WhatsApp terms of service; use responsibly.
- ETF proxies are not the exact index level; they are a practical, accessible proxy.

## Scripts
- `npm run start` - run the WhatsApp bot
- `npm run generate` - create a PDF locally without WhatsApp
