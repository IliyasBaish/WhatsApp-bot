const axios = require('axios');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const MARKET_RANKING = {
    definition: 'Top ten stock markets by domestic market capitalization (latest WFE annual statistics).',
    sourceName: 'World Federation of Exchanges (WFE) - Domestic Market Capitalization',
    sourceUrl: 'https://www.world-exchanges.org/our-work/statistics'
};

const TOP_MARKETS = [
    { rank: 1, market: 'United States', region: 'North America', proxy: 'SPY', index: 'S&P 500 ETF' },
    { rank: 2, market: 'China', region: 'Asia', proxy: 'MCHI', index: 'MSCI China ETF' },
    { rank: 3, market: 'Japan', region: 'Asia', proxy: 'EWJ', index: 'MSCI Japan ETF' },
    { rank: 4, market: 'Hong Kong', region: 'Asia', proxy: 'EWH', index: 'MSCI Hong Kong ETF' },
    { rank: 5, market: 'India', region: 'Asia', proxy: 'INDA', index: 'MSCI India ETF' },
    { rank: 6, market: 'United Kingdom', region: 'Europe', proxy: 'EWU', index: 'MSCI United Kingdom ETF' },
    { rank: 7, market: 'France', region: 'Europe', proxy: 'EWQ', index: 'MSCI France ETF' },
    { rank: 8, market: 'Canada', region: 'North America', proxy: 'EWC', index: 'MSCI Canada ETF' },
    { rank: 9, market: 'Germany', region: 'Europe', proxy: 'EWG', index: 'MSCI Germany ETF' },
    { rank: 10, market: 'Saudi Arabia', region: 'Middle East', proxy: 'KSA', index: 'MSCI Saudi Arabia ETF' }
];

function getQuoteUrl(apiKey, symbol) {
    return `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
}

function parseGlobalQuote(data) {
    const quote = data?.['Global Quote'] || {};
    const symbol = quote['01. symbol'];

    if (!symbol) {
        return null;
    }

    return {
        symbol,
        price: quote['05. price'] || null,
        timestamp: quote['07. latest trading day'] || null
    };
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatCurrency(value) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
        return 'N/A';
    }

    return `$${numberValue.toFixed(2)}`;
}

function formatTimestamp(value) {
    if (!value) {
        return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString();
}

function buildSnapshot(quoteMap, generatedAt) {
    return TOP_MARKETS.map((market) => {
        const quote = quoteMap[market.proxy] || {};
        return {
            ...market,
            price: quote.price || null,
            timestamp: quote.timestamp || null,
            generatedAt
        };
    });
}

async function getMarketSnapshot({ apiKey, useMockData, onProgress }) {
    const generatedAt = new Date().toISOString();

    if (useMockData) {
        const mockPath = path.join(__dirname, 'mock', 'market-quotes.json');
        const mockRaw = fs.readFileSync(mockPath, 'utf8');
        const mock = JSON.parse(mockRaw);
        const quoteMap = mock.quotes || {};
        const mockTime = mock.generatedAt || generatedAt;
        return {
            generatedAt: mockTime,
            markets: buildSnapshot(quoteMap, mockTime),
            dataSourceLabel: 'Mock data (local development)'
        };
    }

    if (!apiKey) {
        throw new Error('Missing ALPHA_VANTAGE_API_KEY.');
    }

    const throttleMs = Number(process.env.ALPHA_VANTAGE_THROTTLE_MS || 12000);
    const quoteMap = {};

    const total = TOP_MARKETS.length;
    let completed = 0;

    for (const market of TOP_MARKETS) {
        const url = getQuoteUrl(apiKey, market.proxy);
        const response = await axios.get(url, { timeout: 15000 });

        if (response.data?.Note || response.data?.['Error Message']) {
            throw new Error(response.data?.Note || response.data?.['Error Message']);
        }

        const parsed = parseGlobalQuote(response.data);
        if (parsed) {
            quoteMap[parsed.symbol] = {
                price: parsed.price,
                timestamp: parsed.timestamp
            };
        }

        completed += 1;
        if (typeof onProgress === 'function') {
            onProgress({ completed, total, market });
        }

        if (throttleMs > 0) {
            await delay(throttleMs);
        }
    }

    return {
        generatedAt,
        markets: buildSnapshot(quoteMap, generatedAt),
        dataSourceLabel: 'Alpha Vantage (GLOBAL_QUOTE)'
    };
}

async function generateMarketPdf({ snapshot, authorName, outputDir }) {
    const safeOutputDir = outputDir || path.join(__dirname, 'output');
    fs.mkdirSync(safeOutputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Market_Report_${timestamp}.pdf`;
    const filePath = path.join(safeOutputDir, fileName);

    return new Promise((resolve) => {
        const doc = new PDFDocument({ margin: 48 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc.fillColor('#1a237e').fontSize(22).text('Global Stock Market Snapshot', { align: 'center' });
        doc.moveDown(0.5);
        doc.fillColor('#333333').fontSize(11).text(`Generated: ${formatTimestamp(snapshot.generatedAt)}`, { align: 'center' });
        doc.fillColor('#333333').fontSize(11).text(`Prepared for: ${authorName}`, { align: 'center' });
        doc.moveDown();

        doc.fillColor('#000000').fontSize(10).text(`Definition: ${MARKET_RANKING.definition}`);
        doc.fillColor('#555555').fontSize(9).text(`Ranking source: ${MARKET_RANKING.sourceName}`);
        doc.fillColor('#555555').fontSize(9).text(MARKET_RANKING.sourceUrl);
        doc.moveDown();

        const tableTop = doc.y + 6;
        const rowHeight = 20;

        doc.fillColor('#000000').fontSize(10);
        doc.text('Rank', 48, tableTop);
        doc.text('Market', 90, tableTop);
        doc.text('Region', 220, tableTop);
        doc.text('Proxy', 320, tableTop);
        doc.text('Last Price', 380, tableTop);
        doc.text('Quote Time', 460, tableTop);
        doc.moveTo(48, tableTop + 14).lineTo(560, tableTop + 14).stroke();

        snapshot.markets.forEach((market, index) => {
            const y = tableTop + 18 + (index * rowHeight);
            doc.fillColor('#0d47a1').text(String(market.rank), 48, y);
            doc.fillColor('#000000').text(market.market, 90, y, { width: 120 });
            doc.fillColor('#000000').text(market.region, 220, y, { width: 90 });
            doc.fillColor('#000000').text(market.proxy, 320, y, { width: 50 });
            doc.fillColor('#000000').text(formatCurrency(market.price), 380, y, { width: 70 });
            doc.fillColor('#000000').text(formatTimestamp(market.timestamp), 460, y, { width: 120 });
        });

        doc.moveDown(2);
        doc.fillColor('#666666').fontSize(8).text(`Quote source: ${snapshot.dataSourceLabel}`);
        doc.fillColor('#666666').fontSize(8).text('Proxy tickers are US-listed ETFs used as market-level representatives.');

        doc.end();
        stream.on('finish', () => resolve(filePath));
    });
}

module.exports = {
    MARKET_RANKING,
    TOP_MARKETS,
    getMarketSnapshot,
    generateMarketPdf
};
