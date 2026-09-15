const { chromium } = require('playwright');
const assert = require('assert');

async function testETMSFrontendLogin() {
  console.log('🎭 Testing ETMS Frontend Login on http://localhost:3002/login...\n');
  let browser;

  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
    const page = await browser.newPage();

    page.on('console', msg => console.log('  🌐 BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('requestfailed', req => console.log('  💥 REQUEST FAILED:', req.url(), req.failure()?.errorText));

    console.log('  ⏳ Navigating to http://localhost:3002/login...');
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    const title = await page.title();
    console.log(`  ℹ️ Page title: '${title}'`);

    // Click quick login button for Bhavesh Patel (9825012345)
    console.log('  ⏳ Clicking 1-Click Demo Account (Bhavesh Patel - 9825012345)...');
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.textContent.includes('Bhavesh Patel') || b.textContent.includes('9825012345'));
      if (target) target.click();
    });

    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`  ℹ️ Current URL after login attempt: ${currentUrl}`);

    const token = await page.evaluate(() => localStorage.getItem('etms_access_token'));
    console.log(`  ℹ️ LocalStorage etms_access_token exists: ${token !== null && token !== undefined}`);

    if (token) {
      console.log('\n✅ PASSED: ETMS Frontend Login verified successfully!');
      console.log(`  🔑 Token snippet: ${token.substring(0, 30)}...`);
    } else {
      console.log('\n❌ FAILED: Token not found in localStorage');
    }

    await browser.close();
  } catch (err) {
    console.error('💥 Error testing ETMS login:', err);
    if (browser) await browser.close();
  }
}

testETMSFrontendLogin();
