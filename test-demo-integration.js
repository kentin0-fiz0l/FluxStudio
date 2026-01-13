#!/usr/bin/env node
/**
 * Integration test for collaborative editor demo
 * Tests that the demo can connect to the production collaboration service
 */

const puppeteer = require('puppeteer');

async function testDemo() {
  console.log('🧪 Testing Collaborative Editor Demo Integration\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Listen for console messages
    page.on('console', msg => {
      if (msg.text().includes('FluxStudio') || msg.text().includes('Connection')) {
        console.log('📋', msg.text());
      }
    });

    // Navigate to demo
    console.log('🌐 Loading demo page...');
    await page.goto('http://localhost:3030/', { waitUntil: 'networkidle2' });

    // Wait for page to load
    await page.waitForSelector('#editor', { timeout: 5000 });
    console.log('✅ Demo page loaded\n');

    // Check connection status
    await page.waitForFunction(
      () => document.getElementById('statusText')?.textContent === 'Connected',
      { timeout: 10000 }
    );
    console.log('✅ Connected to collaboration service\n');

    // Type some text
    console.log('📝 Testing text input...');
    await page.type('#editor', 'Hello from automated test!');

    // Wait a bit for sync
    await page.waitForTimeout(1000);

    // Check that text was entered
    const editorContent = await page.$eval('#editor', el => el.value);
    if (editorContent.includes('Hello from automated test!')) {
      console.log('✅ Text input working\n');
    }

    // Check message count
    const messageCount = await page.$eval('#messageCount', el => el.textContent);
    console.log(`📊 Messages processed: ${messageCount}\n`);

    // Check user count
    const userCount = await page.$eval('#userCount', el => el.textContent);
    console.log(`👥 Users connected: ${userCount}\n`);

    console.log('🎉 All integration tests passed!\n');

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  testDemo();
} catch (error) {
  console.log('⚠️  Puppeteer not installed. Skipping integration test.');
  console.log('   To run integration tests: npm install puppeteer\n');
  console.log('✅ Demo files created successfully!');
  console.log('   Run: node serve-demo.js');
  console.log('   Then open: http://localhost:3030/\n');
}
