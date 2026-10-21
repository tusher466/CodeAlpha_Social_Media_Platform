const app = require('./server');

const TEST_PORT = 3088;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function verify() {
  console.log('🔍 Verifying frontend assets & API routes...');
  const server = app.listen(TEST_PORT);
  let failed = false;

  try {
    // 1. Check index.html
    const htmlRes = await fetch(`${BASE_URL}/`);
    if (htmlRes.status !== 200) throw new Error(`index.html returned ${htmlRes.status}`);
    const htmlText = await htmlRes.text();
    if (!htmlText.includes('Pulse')) throw new Error('index.html missing brand name');
    console.log('  ✅ index.html served correctly (200 OK)');

    // 2. Check css/styles.css
    const cssRes = await fetch(`${BASE_URL}/css/styles.css`);
    if (cssRes.status !== 200) throw new Error(`styles.css returned ${cssRes.status}`);
    console.log('  ✅ css/styles.css served correctly (200 OK)');

    // 3. Check js/app.js
    const jsRes = await fetch(`${BASE_URL}/js/app.js`);
    if (jsRes.status !== 200) throw new Error(`app.js returned ${jsRes.status}`);
    console.log('  ✅ js/app.js served correctly (200 OK)');

    // 4. Check api/posts
    const postsRes = await fetch(`${BASE_URL}/api/posts`);
    const postsData = await postsRes.json();
    if (!postsData.success || !postsData.posts.length) throw new Error('api/posts returned empty or failed');
    console.log(`  ✅ api/posts returned ${postsData.posts.length} posts`);

    // 5. Check api/users/suggestions
    const suggRes = await fetch(`${BASE_URL}/api/users/suggestions`);
    const suggData = await suggRes.json();
    if (!suggData.success || !suggData.suggestions.length) throw new Error('api/users/suggestions failed');
    console.log(`  ✅ api/users/suggestions returned ${suggData.suggestions.length} recommendations`);

    console.log('\n🎉 ALL FRONTEND & BACKEND ASSETS VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('Verification failed:', err);
    failed = true;
  } finally {
    server.close();
    setTimeout(() => process.exit(failed ? 1 : 0), 100);
  }
}

verify();
