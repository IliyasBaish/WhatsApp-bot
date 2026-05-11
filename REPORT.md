# Report

## Problem Statement
Build a WhatsApp-facing capability that delivers a PDF snapshot of the top ten stock markets in the world. The PDF must be generated on demand from a chat command and include the author name.

## Methodology
- Use `whatsapp-web.js` to control WhatsApp Web and listen for a report command.
- Define the top ten stock markets by domestic market capitalization (WFE).
- Map each market to a US-listed ETF proxy to obtain a live quote.
- Generate a PDF with a clear table layout, title, timestamp, and author name.

## Dataset (if applicable)
- Ranking source: World Federation of Exchanges (WFE) annual statistics.
- Quote source: Alpha Vantage `BATCH_STOCK_QUOTES` endpoint.
- Optional local mock data for development is stored in `mock/market-quotes.json` and clearly labeled.

## Evaluation
- Manual validation: send `!report` and confirm the PDF is delivered to a WhatsApp chat.
- Check the PDF layout, timestamp, and author name.

## Evaluation Methods (if applicable)
- Manual functional testing against WhatsApp Web.
- Data sanity checks (presence of prices and timestamps for each proxy ticker).

## Experimental Results
- The system delivers a single PDF document with top ten markets and proxy quotes.
- The PDF is received by the WhatsApp chat as an attachment.
