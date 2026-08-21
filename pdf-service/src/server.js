const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ]
    });
  }
  return browser;
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'surat-embroidery-pdf-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.post('/generate-pdf', async (req, res) => {
  const { html, landscape = false, format = 'A4', margin } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'Missing "html" string in request body' });
  }

  let page = null;
  try {
    const b = await getBrowser();
    page = await b.newPage();

    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000
    });

    const pdfBuffer = await page.pdf({
      format: format,
      landscape: Boolean(landscape),
      printBackground: true,
      margin: margin || {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm'
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating PDF:', err);
    return res.status(500).json({
      error: 'Failed to generate PDF',
      message: err.message
    });
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
});

process.on('SIGINT', async () => {
  if (browser) {
    await browser.close().catch(() => {});
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (browser) {
    await browser.close().catch(() => {});
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`PDF Service listening on port ${PORT}`);
});
