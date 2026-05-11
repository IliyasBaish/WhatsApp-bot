const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// 1. Initialize the client
// Using LocalAuth saves the session so you don't scan the QR every time
const client = new Client({
    authStrategy: new LocalAuth()
});

// 2. Generate and display the QR code
client.on('qr', (qr) => {
    console.log('Scan this QR code with your phone:');
    qrcode.generate(qr, { small: true });
});

// 3. Confirm connection
client.on('ready', () => {
    console.log('Bot is online and ready!');
});

// 4. Basic "Ping" Command
client.on('message', async (msg) => {
    if (msg.body.toLowerCase() === '!ping') {
        await msg.reply('pong! 🏓');
    }
});

client.initialize();