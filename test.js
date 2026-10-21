const app = require('./server');

const TEST_PORT = 3099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runTests() {
  console.log('🧪 Starting API Integration Tests...');

  const server = app.listen(TEST_PORT);
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthData.status === 'ok', 'Health check responds with status ok');

    // 2. Login with seed user
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'alex_tech', password: 'password123' })
    });
    const loginData = await loginRes.json();
    assert(loginData.success === true, 'Seed user alex_tech logs in successfully');
    assert(loginData.token, 'Auth token returned on login');
    const token = loginData.token;

    // 3. Current user /me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meRes.json();
    assert(meData.success === true && meData.user.username === 'alex_tech', 'Auth /me returns current user profile');

    // 4. Fetch feed
    const feedRes = await fetch(`${BASE_URL}/api/posts?feed=for-you`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const feedData = await feedRes.json();
    assert(feedData.success === true && Array.isArray(feedData.posts), 'Feed returns posts array');
    assert(feedData.posts.length > 0, 'Feed contains posts from seed');
    const testPostId = feedData.posts[0].id;

    // 5. Create new post
    const createPostRes = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content: 'Testing automated post creation from test suite! 🧪✨ #automated #test',
        image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600'
      })
    });
    const createPostData = await createPostRes.json();
    assert(createPostData.success === true, 'Created new post successfully');
    const newPostId = createPostData.post.id;

    // 6. Like post
    const likeRes = await fetch(`${BASE_URL}/api/posts/${newPostId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const likeData = await likeRes.json();
    assert(likeData.success === true && likeData.is_liked === true, 'Toggled like on new post');

    // 7. Add comment to post
    const commentRes = await fetch(`${BASE_URL}/api/posts/${newPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content: 'First test comment on automated post!' })
    });
    const commentData = await commentRes.json();
    assert(commentData.success === true && commentData.comment.content === 'First test comment on automated post!', 'Added comment to post');
    const commentId = commentData.comment.id;

    // 8. Follow toggle
    // Get another user id, e.g. elena_sound
    const elenaRes = await fetch(`${BASE_URL}/api/users/profile/elena_sound`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const elenaData = await elenaRes.json();
    assert(elenaData.success === true, 'Fetched elena_sound profile');
    const elenaId = elenaData.profile.id;

    const followRes = await fetch(`${BASE_URL}/api/users/${elenaId}/follow`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const followData = await followRes.json();
    assert(followData.success === true, 'Toggled follow on target user');

    // 9. Delete comment
    const delCommentRes = await fetch(`${BASE_URL}/api/posts/${newPostId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const delCommentData = await delCommentRes.json();
    assert(delCommentData.success === true, 'Deleted test comment');

    // 10. Delete post
    const delPostRes = await fetch(`${BASE_URL}/api/posts/${newPostId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const delPostData = await delPostRes.json();
    assert(delPostData.success === true, 'Deleted test post');

    console.log(`\n================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`================================`);
  } catch (err) {
    console.error('Test run error:', err);
    failed++;
  } finally {
    server.close();
    setTimeout(() => process.exit(failed > 0 ? 1 : 0), 100);
  }
}

runTests();
