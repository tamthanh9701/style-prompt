const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER_ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  console.log('Page loaded');
  
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  console.log('BODY:', bodyHTML.substring(0, 500));
  
  await browser.close();
})();
