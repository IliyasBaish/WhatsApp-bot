require('dotenv').config();

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const { getMarketSnapshot, generateMarketPdf } = require('./market-report');

const client = new Client({
    authStrategy: new LocalAuth()
});

const COMMANDS = ['!report', '!markets'];

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));

client.on('ready', () => console.log('Bot is ready to send reports.'));

client.on('message', async (msg) => {
    const body = msg.body.trim().toLowerCase();
    if (!COMMANDS.includes(body)) {
        return;
    }

    const authorName = process.env.REPORT_AUTHOR;
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const useMockData = process.env.USE_MOCK_DATA === 'true';

    if (!authorName) {
        await msg.reply('Missing REPORT_AUTHOR. Set it in your environment before running.');
        return;
    }

    if (!apiKey && !useMockData) {
        await msg.reply('Missing ALPHA_VANTAGE_API_KEY. Set it or enable USE_MOCK_DATA=true.');
        return;
    }

    await msg.reply('Fetching market data and generating your PDF...');

    try {
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

client.initialize();