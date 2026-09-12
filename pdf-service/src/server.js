const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_CONCURRENT_PAGES = parseInt(process.env.MAX_CONCURRENT_PAGES || '4', 10);
const MAX_REQUESTS_BEFORE_RESTART = 200;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let browser = null;
let activeRequests = 0;
let totalRequestsServed = 0;
let isRestartingBrowser = false;

async function getBrowser() {
  if (isRestartingBrowser) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return getBrowser();
  }

  if (!browser || !browser.isConnected() || totalRequestsServed >= MAX_REQUESTS_BEFORE_RESTART) {
    if (browser) {
      try {
        isRestartingBrowser = true;
        await browser.close().catch(() => {});
      } catch (_) {
        // ignore close error
      } finally {
        browser = null;
        totalRequestsServed = 0;
        isRestartingBrowser = false;
      }
    }

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
        '--disable-extensions',
        '--font-render-hinting=none',
      ],
    });
  }
  return browser;
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'surat-embroidery-pdf-service',
    activeRequests,
    totalRequestsServed,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.post('/generate-pdf', async (req, res) => {
  const {
    html,
    landscape = false,
    format = 'A4',
    margin,
    displayHeaderFooter,
    headerTemplate,
    footerTemplate,
  } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'Missing "html" string in request body' });
  }

  // Backpressure check
  if (activeRequests >= MAX_CONCURRENT_PAGES * 2) {
    return res.status(429).json({ error: 'PDF service busy. Please retry in a moment.' });
  }

  activeRequests++;
  totalRequestsServed++;
  let page = null;

  try {
    const b = await getBrowser();
    page = await b.newPage();

    // Optimize page resource loading: block unnecessary media/fonts requests if any
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'media', 'websocket'].includes(resourceType) && !request.url().startsWith('data:')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000,
    });

    const isHeaderFooter = displayHeaderFooter !== undefined ? Boolean(displayHeaderFooter) : true;

    const pdfBuffer = await page.pdf({
      format: format || 'A4',
      landscape: Boolean(landscape),
      printBackground: true,
      displayHeaderFooter: isHeaderFooter,
      headerTemplate: headerTemplate || '<div></div>',
      footerTemplate:
        footerTemplate ||
        '<div style="font-size: 7.2pt; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 6mm; color: #555; border-top: 0.5px solid #ccc; padding-top: 2px;"><span>GST SAC 9988 Job-Work Invoice</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
      margin: margin || {
        top: '6mm',
        right: '5mm',
        bottom: '10mm',
        left: '5mm',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating PDF:', err);
    return res.status(500).json({
      error: 'Failed to generate PDF',
      message: err.message,
    });
  } finally {
    activeRequests = Math.max(0, activeRequests - 1);
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
