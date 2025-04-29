import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import fs from 'fs';
import ChartJSImage from 'chart.js-image';

const TOKEN = '7085377911:AAG1LhCjychxcOPTKgTjGcdr-SQLUN9fBl8';
const CHAT_ID = '6561847643';
const bot = new Telegraf(TOKEN);

let lastPrice = 0;
let history = [];

// Ambil harga BTC
async function getBTCPrice() {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const data = await res.json();
    return data.bitcoin.usd;
}

// Grafik harga pakai chart.js-image
async function sendGraph(ctx) {
    const labels = history.map(h => h.time);
    const data = history.map(h => h.price);
    const chart = ChartJSImage()
        .chart({
            type: 'line',
            data: {
                labels: labels,
                datasets: [{ label: 'Harga BTC', data: data, borderColor: 'orange' }]
            }
        })
        .backgroundColor('white')
        .width(500)
        .height(300);

    const url = chart.toURL();
    ctx.replyWithPhoto({ url }, { caption: 'Grafik harga BTC 1H terakhir' });
}

// Histori tiap jam (batas 10 jam)
function updateHistory(price) {
    const now = new Date();
    history.push({ time: `${now.getHours()}:${now.getMinutes()}`, price });
    if (history.length > 10) history.shift(); // max 10 data
}

// Saran beli/jual
function getAdvice(price) {
    if (history.length < 2) return 'Belum cukup data, tunggu beberapa saat.';
    const last = history[history.length - 2].price;
    if (price > last * 1.01) return 'Harga naik >1%, bisa pertimbangkan **JUAL**';
    if (price < last * 0.99) return 'Harga turun >1%, bisa pertimbangkan **BELI**';
    return 'Harga stabil, tunggu momentum terbaik.';
}

// Command
bot.start((ctx) => {
    ctx.reply(`Selamat datang di *BTC Watcher Bot*\nPantau harga, grafik, saran beli/jual semua disini!\n\nCommand:\n/cekbtc\n/grafik\n/saran\n/help`, { parse_mode: 'Markdown' });
});

bot.command('cekbtc', async (ctx) => {
    const price = await getBTCPrice();
    ctx.reply(`💰 *Harga Bitcoin Saat Ini:*\n$${price.toLocaleString()} USD`, { parse_mode: 'Markdown' });
});

bot.command('grafik', async (ctx) => {
    if (history.length < 2) {
        ctx.reply('Grafik belum tersedia, tunggu beberapa menit...');
        return;
    }
    await sendGraph(ctx);
});

bot.command('saran', async (ctx) => {
    const price = await getBTCPrice();
    const advice = getAdvice(price);
    ctx.reply(`💡 *Saran:* ${advice}`, { parse_mode: 'Markdown' });
});

bot.command('help', (ctx) => {
    ctx.reply('/cekbtc → Cek harga\n/grafik → Grafik 1 jam terakhir\n/saran → Saran beli/jual\n/start → Info awal');
});

// Auto monitor
async function monitor() {
    const price = await getBTCPrice();
    if (price) {
        updateHistory(price);
        if (lastPrice && price > lastPrice) {
            bot.telegram.sendMessage(CHAT_ID, `🚨 *Harga BTC Naik!*\n$${lastPrice.toLocaleString()} → $${price.toLocaleString()}`, { parse_mode: 'Markdown' });
        }
        lastPrice = price;
    }
}

bot.launch();
console.log('Bot aktif! Mantau tiap 1 menit...');
setInterval(monitor, 60000); // setiap 1 menit