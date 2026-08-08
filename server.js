const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let browser = null;
let page = null;
let botConfig = {};

// حفظ بيانات البوت
app.post('/api/save-bot', (req, res) => {
  botConfig = req.body;
  console.log("تم حفظ البيانات:", botConfig);
  res.json({ status: 'success' });
});

// تشغيل البوت ودخول الموقع
app.post('/api/bot/start', async (req, res) => {
  try {
    if (browser) await browser.close();

    console.log("جاري تشغيل المتصفح السحابي...");
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
    
    console.log("جاري التوجه إلى الموقع...");
    await page.goto('https://www.ksa-3.com/', { waitUntil: 'networkidle2' });

    // 1. تسجيل الدخول كعضو رسمي
    if (botConfig.user && botConfig.pass) {
      console.log("جاري كتابة اسم المستخدم وكلمة المرور...");
      await page.waitForSelector('#u2', { timeout: 10000 });
      await page.type('#u2', botConfig.user);
      
      await page.waitForSelector('#pass1', { timeout: 10000 });
      await page.type('#pass1', botConfig.pass);

      console.log("جاري الضغط على زر دخول الأعضاء (login(2))...");
      await page.evaluate(() => {
        if (typeof login === 'function') {
          login(2);
        } else {
          const btn = document.querySelector('button[onclick="login(2)"]');
          if (btn) btn.click();
        }
      });
    }

    // الانتظار لاكتمال تحميل الشات وروماته
    await new Promise(r => setTimeout(r, 5000));

    // 2. دخول الروم المحدد
    if (botConfig.room) {
      console.log("جاري البحث عن الروم: " + botConfig.room);
      const roomJoined = await page.evaluate((targetRoom) => {
        const rooms = Array.from(document.querySelectorAll('#rooms .room, #rooms .nosel'));
        const matched = rooms.find(el => {
          const text = el.innerText || '';
          const nAttr = el.getAttribute('n') || '';
          return text.includes(targetRoom) || nAttr.includes(targetRoom);
        });

        if (matched) {
          matched.click();
          return true;
        }
        return false;
      }, botConfig.room);

      if (roomJoined) {
        console.log("تم الضغط على الروم بنجاح.");
      } else {
        console.log("لم يتم العثور على الروم، يرجى التأكد من اسم الروم المكتوب.");
      }

      await new Promise(r => setTimeout(r, 3000));
    }

    // 3. الصعود على المايك الأول (#mic0)
    console.log("جاري الصعود على المايك...");
    await page.waitForSelector('#mic0', { timeout: 10000 });
    await page.click('#mic0');
    console.log("تم الصعود على المايك بنجاح.");

    res.json({ status: 'started', message: 'تم تشغيل البوت وتجهيز المايك بنجاح' });
  } catch (err) {
    console.error("حدث خطأ أثناء التشغيل:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// تشغيل الصوت
app.post('/api/play-music', async (req, res) => {
  if (!page) return res.status(400).json({ error: 'البوت غير متصل' });
  try {
    const { url } = req.body;
    await page.evaluate((audioUrl) => {
      let audio = document.getElementById('bot-audio') || document.createElement('audio');
      audio.id = 'bot-audio';
      audio.src = audioUrl;
      audio.play();
    }, url);
    res.json({ status: 'playing' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// إيقاف البوت
app.post('/api/bot/stop', async (req, res) => {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
    console.log("تم إيقاف البوت.");
  }
  res.json({ status: 'stopped' });
});

// الاستماع على المنفذ المطلوب من Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Bot Server Running on port ${PORT}`));
