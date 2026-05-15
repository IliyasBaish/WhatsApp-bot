// Load environment variables from .env for local development.
require('dotenv').config();

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
// Market data fetch + PDF report generation.
const { getMarketSnapshot, generateMarketPdf } = require('./market-report');

// WhatsApp Web client with local auth (persists the session).
const client = new Client({
    authStrategy: new LocalAuth()
});

// Commands the bot responds to.
const COMMANDS = ['!report', '!markets'];

// Print the login QR to the terminal when needed.
client.on('qr', (qr) => qrcode.generate(qr, { small: true }));

// Confirm the bot is connected and ready.
client.on('ready', () => console.log('Bot is ready to send reports.'));

// Handle incoming messages and trigger report generation.
client.on('message', async (msg) => {
    const body = msg.body.trim().toLowerCase();
    if (!COMMANDS.includes(body)) {
        return;
    }

    // Pull runtime configuration from env vars.
    const authorName = process.env.REPORT_AUTHOR;
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const useMockData = process.env.USE_MOCK_DATA === 'true';

    // Basic config validation before calling the APIs.
    if (!authorName) {
        await msg.reply('Missing REPORT_AUTHOR. Set it in your environment before running.');
        return;
    }

    if (!apiKey && !useMockData) {
        await msg.reply('Missing ALPHA_VANTAGE_API_KEY. Set it or enable USE_MOCK_DATA=true.');
        return;
    }

    // Let the user know we're working.
    await msg.reply('Fetching market data and generating your PDF...');

    try {
        // Throttle progress pings to avoid spamming WhatsApp.
        let lastProgressAt = 0;
        const snapshot = await getMarketSnapshot({
            apiKey,
            useMockData,
            onProgress: async ({ completed, total, market }) => {
                const now = Date.now();
                const shouldNotify = completed === total || completed % 2 === 0 || now - lastProgressAt > 20000;
                if (!shouldNotify) {
                    return;
                }

                lastProgressAt = now;
                try {
                    await msg.reply(`Progress: ${completed}/${total} quotes fetched (latest: ${market.proxy}).`);
                } catch (progressError) {
                    console.error(progressError);
                }
            }
        });

        // Generate the PDF and send it back to the user.
        await msg.reply('Building the PDF now...');
        const pdfPath = await generateMarketPdf({
            snapshot,
            authorName,
            outputDir: path.join(__dirname, 'output')
        });

        const media = MessageMedia.fromFilePath(pdfPath);
        await client.sendMessage(msg.from, media, {
            caption: 'Global stock market snapshot (PDF).'
        });
    } catch (error) {
        console.error(error);
        await msg.reply('Failed to generate the report.');
    }
});

// Start the WhatsApp client.
client.initialize();