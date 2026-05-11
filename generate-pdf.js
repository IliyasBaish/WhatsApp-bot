require('dotenv').config();

const path = require('path');
const { getMarketSnapshot, generateMarketPdf } = require('./market-report');

async function createMarketPdf() {
    try {
        const authorName = process.env.REPORT_AUTHOR;
        const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
        const useMockData = process.env.USE_MOCK_DATA === 'true';

        if (!authorName) {
            console.log('Missing REPORT_AUTHOR.');
            return;
        }

        if (!apiKey && !useMockData) {
            console.log('Missing ALPHA_VANTAGE_API_KEY or enable USE_MOCK_DATA=true.');
            return;
        }

        const snapshot = await getMarketSnapshot({ apiKey, useMockData });
        const pdfPath = await generateMarketPdf({
            snapshot,
            authorName,
            outputDir: path.join(__dirname, 'output')
        });

        console.log(`Success! PDF saved as ${pdfPath}`);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

createMarketPdf();