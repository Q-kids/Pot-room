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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream'
      ]
    });

    page = await browser.newPage();
    await page.goto('https://www.ksa-3.com/', { waitUntil: 'networkidle2' });

    if (botConfig.user && botConfig.pass) {
      // إدخال الحساب والدخول
      await page.type('#user_input', botConfig.user);
      await page.type('#pass_input', botConfig.pass);
      await page.click('#login_button');
    }

    res.json({ status: 'started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot/stop', async (req, res) => {
  if (browser) {
    await browser.close();
    browser = null;
  }
  res.json({ status: 'stopped' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
