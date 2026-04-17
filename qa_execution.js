const puppeteer = require('puppeteer');

async function runQA() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  const results = [];
  function assertCheck(id, pass, message) {
    const status = pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} [${id}] ${message}`);
    results.push({ id, pass, message });
  }

  try {
    // 1. Initial Load
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Check Sidebar rendering
    const sidebar = await page.$('.app-sidebar');
    assertCheck('1.1 / 1.3', !!sidebar, 'App shell and sidebar loaded');
    
    // Check 5 nav items
    const navItems = await page.$$eval('.nav-item', els => els.map(e => e.innerText));
    const hasLibrary = navItems.some(t => t.includes('Thư Viện'));
    const hasCreate = navItems.some(t => t.includes('Tạo mới'));
    const hasStudio = navItems.some(t => t.includes('Image Studio'));
    const hasSettings = navItems.some(t => t.includes('Cài đặt'));
    const hasLogs = navItems.some(t => t.includes('Logs'));
    assertCheck('2.1', hasLibrary && hasCreate && hasStudio && hasSettings && hasLogs, 'Sidebar has all 5 required navigation items');

    // Check Active state
    const activeItem = await page.$eval('.nav-item.active', el => el.innerText);
    assertCheck('2.2', activeItem.includes('Thư Viện'), 'Library view is active by default (empty state)');

    // Check Library empty state
    const emptyState = await page.$('.empty-state');
    const emptyText = await page.evaluate(el => el ? el.innerText : '', emptyState);
    assertCheck('3.1', emptyText.includes('Chưa có style nào'), 'Library shows correct empty state representation');

    // 2. Navigate to Settings
    console.log('\n--- Navigating to Settings ---');
    const navButtons = await page.$$('.nav-item');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.nav-item'));
      const settingsBtn = btns.find(b => b.innerText.includes('Cài đặt') || b.innerText.includes('Settings'));
      if (settingsBtn) settingsBtn.click();
    });
    
    // Wait for settings to render
    await page.waitForSelector('.page-title', { timeout: 2000 });
    const settingsTitle = await page.$eval('.page-title', el => el.innerText);
    assertCheck('1.4', settingsTitle.includes('Cài đặt'), 'Navigation to Settings view successful');

    // Settings Provider cards
    const providerCards = await page.$$('.provider-card');
    assertCheck('13.1', providerCards.length === 6, 'There are exactly 6 AI provider cards in settings');
    
    // Check Vertex AI specifically
    let hasVertexConfig = false;
    for (let card of providerCards) {
      const isVertex = await page.evaluate(el => el.innerText.includes('Vertex AI'), card);
      if (isVertex) {
        await card.click(); // Select as active
        hasVertexConfig = true;
      }
    }
    
    // Check Input fields inside Vertex
    // We expect Project, Location, Credentials
    const inputsText = await page.evaluate(() => document.body.innerText);
    const hasProject = inputsText.includes('GCP Project ID');
    const hasLocation = inputsText.includes('GCP Location');
    const hasCredentials = inputsText.includes('Service Account JSON');
    assertCheck('13.5', hasProject && hasLocation && hasCredentials, 'Vertex AI card includes Project, Location, and Credentials inputs');

    // Check Image Generation Section
    const hasImageGenSection = inputsText.includes('Image Generation');
    assertCheck('13.13', hasImageGenSection, 'Image Generation section exists in settings');

    // 3. Navigate to Logs
    console.log('\n--- Navigating to Logs ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.nav-item'));
      const logsBtn = btns.find(b => b.innerText.includes('Logs'));
      if (logsBtn) logsBtn.click();
    });
    
    // Wait for logs
    await page.waitForFunction(() => document.body.innerText.includes('System Logs') || document.body.innerText.includes('bản ghi'), { timeout: 2000 });
    const logsText = await page.evaluate(() => document.body.innerText);
    assertCheck('14.13', logsText.includes('Chưa có logs') || logsText.includes('No logs yet'), 'Logs view displays correct empty state');

  } catch (error) {
    console.error('Test script failed:', error);
  } finally {
    await browser.close();
    console.log('\n==== TEST SUMMARY ====');
    const passed = results.filter(r => r.pass).length;
    console.log(`${passed}/${results.length} checks passed.`);
  }
}

runQA();
