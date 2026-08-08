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
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required'
      ]
    });

    page = await browser.newPage();
    
    // 1. التوجه لموقع الشات
    await page.goto('https://www.ksa-3.com/', { waitUntil: 'networkidle2' });

    // 2. إدخال اسم المستخدم وكلمة المرور في التبويب الثاني (id="u2" و id="pass1")
    if (botConfig.user && botConfig.pass) {
      await page.waitForSelector('#u2', { timeout: 10000 });
      await page.type('#u2', botConfig.user);
      
      await page.waitForSelector('#pass1', { timeout: 10000 });
      await page.type('#pass1', botConfig.pass);

      // 3. الضغط على زر دخول الأعضاء المخصص login(2)
      await page.evaluate(() => {
        if (typeof login === 'function') {
          login(2);
        } else {
          const btn = document.querySelector('button[onclick="login(2)"]');
          if (btn) btn.click();
        }
      });
    }

    // الانتظار لتأكيد تسجيل الدخول
    await new Promise(r => setTimeout(r, 4000));

    // 4. الانتقال للروم المحدد عبر البحث عن الاسم
    if (botConfig.room) {
      await page.evaluate((roomName) => {
        const roomElements = Array.from(document.querySelectorAll('.room, .room-item, [onclick*="room"]'));
        const targetRoom = roomElements.find(el => el.textContent.trim().includes(roomName));
        if (targetRoom) targetRoom.click();
      }, botConfig.room);
    }

    res.json({ status: 'started', message: 'تم الدخول بحساب العضو الرسمي بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot/stop', async (req, res) => {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
  res.json({ status: 'stopped' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
