const bcrypt = require('bcryptjs');
const db = require('./database');

async function seed() {
  console.log('🌱 Starting database seed...');

  // Check if data already exists
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers && existingUsers.count > 0) {
    console.log(`ℹ️ Database already contains ${existingUsers.count} users. Skipping seed.`);
    return;
  }

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // 1. Insert Sample Users
  const users = [
    {
      username: 'alex_tech',
      email: 'alex@example.com',
      password_hash: defaultPasswordHash,
      display_name: 'Alex Rivera',
      bio: 'Full-stack builder & open source enthusiast 🚀. Loving modern web, microservices, and AI integrations.',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      location: 'San Francisco, CA',
      website: 'https://alexrivera.dev'
    },
    {
      username: 'maya_dev',
      email: 'maya@example.com',
      password_hash: defaultPasswordHash,
      display_name: 'Maya Patel',
      bio: 'Frontend Architect & UI/UX lover ✨ Building accessible and delightful web experiences.',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
      location: 'New York, NY',
      website: 'https://mayapatel.design'
    },
    {
      username: 'jordan_art',
      email: 'jordan@example.com',
      password_hash: defaultPasswordHash,
      display_name: 'Jordan Lee',
      bio: 'Digital artist, photographer & visual storyteller 📸 Capturing everyday moments in neon and shadow.',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      location: 'Austin, TX',
      website: 'https://jordanlee.art'
    },
    {
      username: 'elena_sound',
      email: 'elena@example.com',
      password_hash: defaultPasswordHash,
      display_name: 'Elena Rostova',
      bio: 'Music producer, synth wave collector, coffee explorer ☕🎧',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
      location: 'Berlin, Germany',
      website: 'https://soundwave.fm/elena'
    },
    {
      username: 'david_kim',
      email: 'david@example.com',
      password_hash: defaultPasswordHash,
      display_name: 'David Kim',
      bio: 'Cybersecurity specialist, linux tinkerer, and avid climber 🧗‍♂️ Keeping the web secure.',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      location: 'Seattle, WA',
      website: 'https://davidkim.sec'
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, display_name, bio, avatar_url, cover_url, location, website)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const userIds = {};
  for (const u of users) {
    const res = insertUser.run(u.username, u.email, u.password_hash, u.display_name, u.bio, u.avatar_url, u.cover_url, u.location, u.website);
    userIds[u.username] = Number(res.lastInsertRowid);
  }
  console.log(`✅ Inserted ${users.length} users.`);

  // 2. Insert Follow Relationships
  const insertFollow = db.prepare(`
    INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)
  `);

  const followPairs = [
    ['alex_tech', 'maya_dev'],
    ['alex_tech', 'jordan_art'],
    ['alex_tech', 'david_kim'],
    ['maya_dev', 'alex_tech'],
    ['maya_dev', 'elena_sound'],
    ['jordan_art', 'alex_tech'],
    ['jordan_art', 'maya_dev'],
    ['elena_sound', 'jordan_art'],
    ['david_kim', 'alex_tech'],
    ['david_kim', 'maya_dev']
  ];

  for (const [f1, f2] of followPairs) {
    insertFollow.run(userIds[f1], userIds[f2]);
  }
  console.log(`✅ Inserted follow relationships.`);

  // 3. Insert Posts
  const insertPost = db.prepare(`
    INSERT INTO posts (user_id, content, image_url, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const now = Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;

  const samplePosts = [
    {
      username: 'alex_tech',
      content: 'Just launched our brand new lightweight real-time micro-service! Loving the speed of Node 24 native SQLite and clean REST APIs. No bloated dependencies, just pure performance. 🚀⚡ #webdev #javascript #buildinpublic',
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80',
      timeAgo: 2 * hour
    },
    {
      username: 'maya_dev',
      content: 'Design tip for the day: micro-interactions make or break software elegance. A slight hover bounce, smooth color transitions, and crisp typography turn a plain utility into a product people love returning to! 🎨✨ How do you approach your UI transitions?',
      image_url: null,
      timeAgo: 4 * hour
    },
    {
      username: 'jordan_art',
      content: 'Golden hour in downtown Austin tonight. The way the dusk reflections hit the glass facades is pure magic. Shot with 35mm prime. 🏙️📸 #photography #cityscape #goldenhour',
      image_url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1000&q=80',
      timeAgo: 7 * hour
    },
    {
      username: 'elena_sound',
      content: 'Late night studio sessions with the Prophet synthesizer. There is something truly therapeutic about patching analog cables and finding that exact sweet resonant filter frequency. 🎹🎶 Sending calm vibes to everyone working on their dreams tonight!',
      image_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1000&q=80',
      timeAgo: 12 * hour
    },
    {
      username: 'david_kim',
      content: 'Friendly reminder to turn on Two-Factor Authentication (2FA) on your developer accounts! Security is a continuous habit, not a one-time checklist. Stay safe out there friends! 🔐🛡️',
      image_url: null,
      timeAgo: 1 * 24 * hour
    },
    {
      username: 'alex_tech',
      content: 'Question for devs: What is your favorite CSS architecture in 2026? Modern CSS with native nesting and custom properties has eliminated the need for heavy preprocessors in almost all my projects. Thoughts? 👇',
      image_url: null,
      timeAgo: 2 * 24 * hour
    }
  ];

  const postIds = [];
  for (const p of samplePosts) {
    const postDate = new Date(now - p.timeAgo).toISOString().replace('T', ' ').substring(0, 19);
    const res = insertPost.run(userIds[p.username], p.content, p.image_url, postDate);
    postIds.push(Number(res.lastInsertRowid));
  }
  console.log(`✅ Inserted ${samplePosts.length} posts.`);

  // 4. Insert Comments
  const insertComment = db.prepare(`
    INSERT INTO comments (post_id, user_id, content, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const comments = [
    {
      postId: postIds[0],
      username: 'maya_dev',
      content: 'Native SQLite in Node is such a game changer! Simple, durable, zero configuration overhead.',
      timeAgo: 90 * minute
    },
    {
      postId: postIds[0],
      username: 'david_kim',
      content: 'Solid work Alex. Always keep transactions clean and enable WAL mode!',
      timeAgo: 45 * minute
    },
    {
      postId: postIds[1],
      username: 'alex_tech',
      content: 'Totally agree Maya! Subtle feedback on button presses makes everything feel responsive.',
      timeAgo: 3 * hour
    },
    {
      postId: postIds[1],
      username: 'jordan_art',
      content: 'Typography and white space are everything. Beautiful thoughts!',
      timeAgo: 2 * hour
    },
    {
      postId: postIds[2],
      username: 'elena_sound',
      content: 'The lighting on this shot is unbelievable Jordan! Beautiful framing.',
      timeAgo: 5 * hour
    },
    {
      postId: postIds[5],
      username: 'maya_dev',
      content: 'Modern CSS custom properties and :has() selector have completely changed the game!',
      timeAgo: 20 * hour
    }
  ];

  for (const c of comments) {
    const commentDate = new Date(now - c.timeAgo).toISOString().replace('T', ' ').substring(0, 19);
    insertComment.run(c.postId, userIds[c.username], c.content, commentDate);
  }
  console.log(`✅ Inserted ${comments.length} comments.`);

  // 5. Insert Likes
  const insertLike = db.prepare(`
    INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)
  `);

  const likes = [
    { postId: postIds[0], username: 'maya_dev' },
    { postId: postIds[0], username: 'jordan_art' },
    { postId: postIds[0], username: 'david_kim' },
    { postId: postIds[0], username: 'elena_sound' },
    { postId: postIds[1], username: 'alex_tech' },
    { postId: postIds[1], username: 'jordan_art' },
    { postId: postIds[2], username: 'alex_tech' },
    { postId: postIds[2], username: 'maya_dev' },
    { postId: postIds[2], username: 'elena_sound' },
    { postId: postIds[3], username: 'alex_tech' },
    { postId: postIds[4], username: 'alex_tech' },
    { postId: postIds[4], username: 'maya_dev' },
    { postId: postIds[5], username: 'maya_dev' },
    { postId: postIds[5], username: 'david_kim' }
  ];

  for (const l of likes) {
    insertLike.run(l.postId, userIds[l.username]);
  }
  console.log(`✅ Inserted ${likes.length} likes.`);

  console.log('🎉 Database seeding completed successfully!');
}

module.exports = seed;

if (require.main === module) {
  seed();
}
