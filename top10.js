require('dotenv').config();

const { getMarketSnapshot } = require('./market-report');

async function getTopMarkets() {
    try {
        const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
        const useMockData = process.env.USE_MOCK_DATA === 'true';

        if (!apiKey && !useMockData) {
            console.log('Missing ALPHA_VANTAGE_API_KEY or enable USE_MOCK_DATA=true.');
            return;
        }

        const snapshot = await getMarketSnapshot({ apiKey, useMockData });
        console.log('--- TOP 10 STOCK MARKETS (BY MARKET CAP) ---');

        snapshot.markets.forEach((market) => {
            console.log(`${market.rank}. ${market.market} (${market.region}) - ${market.proxy}`);
            console.log(`   Last Price: ${market.price || 'N/A'} | Quote Time: ${market.timestamp || 'N/A'}`);
            console.log('---------------------------');
        });
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

getTopMarkets();