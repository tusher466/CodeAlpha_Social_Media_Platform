const express = require('express');
const db = require('../db/database');
const { authRequired, authOptional } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

// GET /api/users/profile/:username
router.get('/profile/:username', authOptional, (req, res) => {
  try {
    const { username } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const currentUserId = req.user ? req.user.id : null;
    const isSelf = currentUserId === user.id;

    // Follower & following counts
    const followerCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE following_id = ?').get(user.id).c;
    const followingCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?').get(user.id).c;
    const postCount = db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id = ?').get(user.id).c;
    
    // Total likes received across all posts
    const likesReceived = db.prepare(`
      SELECT COUNT(*) as c 
      FROM likes 
      JOIN posts ON likes.post_id = posts.id 
      WHERE posts.user_id = ?
    `).get(user.id).c;

    // Is current user following this profile?
    let isFollowing = false;
    if (currentUserId && !isSelf) {
      const followCheck = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, user.id);
      isFollowing = !!followCheck;
    }

    return res.json({
      success: true,
      profile: {
        ...sanitizeUser(user),
        follower_count: followerCount,
        following_count: followingCount,
        post_count: postCount,
        likes_received: likesReceived,
        is_following: isFollowing,
        is_self: isSelf
      }
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
});

// PUT /api/users/profile - update current user profile
router.put(
  '/profile',
  authRequired,
  upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  (req, res) => {
    try {
      const userId = req.user.id;
      const { display_name, bio, location, website } = req.body;

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      let avatar_url = req.body.avatar_url !== undefined ? req.body.avatar_url : user.avatar_url;
      if (req.files && req.files.avatar && req.files.avatar[0]) {
        avatar_url = `/uploads/${req.files.avatar[0].filename}`;
      }

      let cover_url = req.body.cover_url !== undefined ? req.body.cover_url : user.cover_url;
      if (req.files && req.files.cover && req.files.cover[0]) {
        cover_url = `/uploads/${req.files.cover[0].filename}`;
      }

      const updatedDisplayName = display_name !== undefined ? display_name.trim() : user.display_name;
      const updatedBio = bio !== undefined ? bio.trim() : user.bio;
      const updatedLocation = location !== undefined ? location.trim() : user.location;
      const updatedWebsite = website !== undefined ? website.trim() : user.website;

      db.prepare(`
        UPDATE users 
        SET display_name = ?, bio = ?, location = ?, website = ?, avatar_url = ?, cover_url = ?
        WHERE id = ?
      `).run(updatedDisplayName, updatedBio, updatedLocation, updatedWebsite, avatar_url, cover_url, userId);

      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        user: sanitizeUser(updatedUser)
      });
    } catch (err) {
      console.error('Update profile error:', err);
      return res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
  }
);

// POST /api/users/:id/follow - Toggle or follow user
router.post('/:id/follow', authRequired, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const currentUserId = req.user.id;

    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({ success: false, error: 'You cannot follow yourself' });
    }

    const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User does not exist' });
    }

    // Check if currently following
    const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, targetUserId);

    let isFollowing = false;
    if (existing) {
      // Unfollow
      db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(currentUserId, targetUserId);
      isFollowing = false;
    } else {
      // Follow
      db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(currentUserId, targetUserId);
      isFollowing = true;
    }

    const updatedFollowerCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE following_id = ?').get(targetUserId).c;

    return res.json({
      success: true,
      is_following: isFollowing,
      follower_count: updatedFollowerCount,
      message: isFollowing ? `You are now following @${targetUser.username}` : `Unfollowed @${targetUser.username}`
    });
  } catch (err) {
    console.error('Follow toggle error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update follow relationship' });
  }
});

// GET /api/users/:id/followers - List of followers
router.get('/:id/followers', authOptional, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const currentUserId = req.user ? req.user.id : null;

    const followers = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio,
        CASE WHEN ? IS NOT NULL AND EXISTS(
          SELECT 1 FROM follows f2 WHERE f2.follower_id = ? AND f2.following_id = u.id
        ) THEN 1 ELSE 0 END AS is_following
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
    `).all(currentUserId, currentUserId, targetUserId);

    return res.json({ success: true, followers });
  } catch (err) {
    console.error('Fetch followers error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch followers' });
  }
});

// GET /api/users/:id/following - List of following
router.get('/:id/following', authOptional, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const currentUserId = req.user ? req.user.id : null;

    const following = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio,
        CASE WHEN ? IS NOT NULL AND EXISTS(
          SELECT 1 FROM follows f2 WHERE f2.follower_id = ? AND f2.following_id = u.id
        ) THEN 1 ELSE 0 END AS is_following
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
    `).all(currentUserId, currentUserId, targetUserId);

    return res.json({ success: true, following });
  } catch (err) {
    console.error('Fetch following error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch following' });
  }
});

// GET /api/users/suggestions - Suggested users to follow
router.get('/suggestions', authOptional, (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : 0;

    const suggestions = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count
      FROM users u
      WHERE u.id != ? 
        AND u.id NOT IN (
          SELECT following_id FROM follows WHERE follower_id = ?
        )
      ORDER BY follower_count DESC, u.created_at DESC
      LIMIT 5
    `).all(currentUserId, currentUserId);

    return res.json({ success: true, suggestions });
  } catch (err) {
    console.error('Fetch suggestions error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load suggestions' });
  }
});

// GET /api/users/search?q=query
router.get('/search', (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) {
      return res.json({ success: true, users: [] });
    }

    const pattern = `%${query}%`;
    const users = db.prepare(`
      SELECT id, username, display_name, avatar_url, bio,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as follower_count
      FROM users
      WHERE username LIKE ? OR display_name LIKE ?
      ORDER BY follower_count DESC
      LIMIT 10
    `).all(pattern, pattern);

    return res.json({ success: true, users });
  } catch (err) {
    console.error('Search users error:', err);
    return res.status(500).json({ success: false, error: 'Failed to search users' });
  }
});

module.exports = router;
