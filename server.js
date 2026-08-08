const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let browser = null;
let page = null;
let botConfig = {};

app.post('/api/save-bot', (req, res) => {
    botConfig = req.body;
    res.json({ status: 'success' });
});

app.post('/api/bot/start', async (req, res) => {
    try {
        if (browser) await browser.close();
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required']
        });
        page = await browser.newPage();
        await page.goto('https://www.ksa-3.com/', { waitUntil: 'networkidle2' });

        // تسجيل الدخول
        await page.waitForSelector('#u2');
        await page.type('#u2', botConfig.user);
        await page.type('#pass1', botConfig.pass);
        await page.evaluate(() => login(2));
        await new Promise(r => setTimeout(r, 4000));

        // دخول الروم
        if (botConfig.room) {
            await page.evaluate((roomName) => {
                const rooms = Array.from(document.querySelectorAll('#rooms .room'));
                const target = rooms.find(el => el.textContent.includes(roomName) || el.getAttribute('n')?.includes(roomName));
                if (target) target.click();
            }, botConfig.room);
        }

        await new Promise(r => setTimeout(r, 2000));
        await page.click('#mic0'); // صعود المايك
        res.json({ status: 'started' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/play-music', async (req, res) => {
    if (!page) return res.status(400).json({ error: 'البوت غير متصل' });
    await page.evaluate((url) => {
        let audio = document.getElementById('bot-audio') || document.createElement('audio');
        audio.id = 'bot-audio';
        audio.src = url;
        audio.play();
    }, req.body.url);
    res.json({ status: 'playing' });
});

app.post('/api/bot/stop', async (req, res) => {
    if (browser) { await browser.close(); browser = null; }
    res.json({ status: 'stopped' });
});

app.listen(3000, () => console.log('Bot Server Running'));
