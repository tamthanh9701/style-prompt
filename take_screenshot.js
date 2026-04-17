const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  await page.screenshot({ path: 'test_screenshot.png' });
  console.log('Saved screenshot to test_screenshot.png');
  
  console.log('Sidebar text:', await page.evaluate(() => {
    const el = document.querySelector('.app-sidebar');
    return el ? el.innerText : 'NOT FOUND';
  }));
  
  await browser.close();
})();
