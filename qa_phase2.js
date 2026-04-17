const puppeteer = require('puppeteer');
const path = require('path');

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
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    
    // Enable request interception to mock AI response
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().includes('/api/ai') && request.method() === 'POST') {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: '{"result":"{\\"subject_type\\":\\"character\\",\\"artistic_style\\":{\\"style_type\\":\\"Cyberpunk\\"}}"}'
        });
      } else {
        request.continue();
      }
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // Set dummy API key in localStorage
    await page.evaluate(() => {
      const settings = JSON.parse(localStorage.getItem('style_prompt_settings') || '{}');
      if (!settings.providers) settings.providers = {};
      if (!settings.providers.openai) settings.providers.openai = { type: 'openai' };
      settings.providers.openai.api_key = 'dummy_key';
      settings.active_provider = 'openai';
      localStorage.setItem('style_prompt_settings', JSON.stringify(settings));
    });
    
    // Reload to apply settings
    await page.reload({ waitUntil: 'networkidle2' });

    console.log('\n--- Navigating to Create Style ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.nav-item'));
      const createBtn = btns.find(b => b.innerText.includes('Tạo mới') || b.innerText.includes('Create'));
      if (createBtn) createBtn.click();
    });
    
    await page.waitForSelector('.upload-zone', { timeout: 2000 });
    const hasCreateTitle = await page.evaluate(() => document.body.innerText.includes('Thêm Style mới') || document.body.innerText.includes('Create New Style'));
    assertCheck('4.1/4.2', hasCreateTitle, 'Create Style view loaded correctly');

    // Upload an image via file input
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(path.resolve('test_image.png'));

    // Wait for thumbnail to appear
    await page.waitForSelector('.image-thumb', { timeout: 2000 });
    const hasImageBlock = await page.$('.image-thumb');
    assertCheck('4.4', !!hasImageBlock, 'Image thumbnail displayed after file selection');

    // Click Analyze button
    // The button might say 'Phân tích' or 'Analyze'
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button.btn-primary'));
      const analyzeBtn = btns.find(b => b.innerText.includes('Phân tích') || b.innerText.includes('Analyze'));
      if (analyzeBtn && !analyzeBtn.disabled) analyzeBtn.click();
    });

    // Request intercepted, wait for result card
    await page.waitForSelector('.card.slide-in', { timeout: 3000 });
    const hasResultCard = await page.$('.card.slide-in');
    assertCheck('4.11', !!hasResultCard, 'Analysis result card appears after simulated success');

    // Click "Xem & Chỉnh sửa" (Save to Library)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button.btn-primary'));
      const saveBtn = btns.find(b => b.innerText.includes('Xem & Chỉnh sửa') || b.innerText.includes('Lưu') || b.innerText.includes('Save'));
      if (saveBtn) saveBtn.click();
    });

    // Wait to be navigated to Edit View
    await page.waitForSelector('.tabs', { timeout: 2000 });
    
    const editorHtml = await page.evaluate(() => document.body.innerText);
    const hasEditorTab = editorHtml.includes('Editor') || editorHtml.includes('Chỉnh sửa');
    const hasOutputTab = editorHtml.includes('Output') || editorHtml.includes('Đầu ra');
    const hasJsonTab = editorHtml.includes('JSON');
    const hasGalleryTab = editorHtml.includes('Ảnh Đã Tạo') || editorHtml.includes('Generated');
    
    assertCheck('4.15 / 5.5', hasEditorTab && hasOutputTab && hasJsonTab && hasGalleryTab, 'Save pushes style to Library and opens Edit View with 4 tabs');

    // Check Editor UI: Subject Select
    const selectExists = await page.$('select');
    const selectVal = await page.evaluate(el => el.value, selectExists);
    assertCheck('5.6', selectVal === 'character', 'Subject Type was successfully parsed and pre-filled with "character"');

    // Check if the "Cyberpunk" style attribute exists in an input field
    const hasCyberpunk = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.some(i => i.value === 'Cyberpunk');
    });
    assertCheck('5.14', hasCyberpunk, 'FieldInputs are correctly populated with structured prompt data');

    // Check Reference Images area is present in sidebar of Edit view
    const refAreaHTML = await page.evaluate(() => document.querySelector('.side-col').innerText);
    assertCheck('6.1 / 6.4', refAreaHTML.includes('1/30'), 'Reference images area is populated via IndexedDB loading (1 image uploaded)');

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
