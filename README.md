# Pulse — Mini Social Media Platform

A modern, fast, full-stack social media application built with **HTML5, CSS3, Vanilla JavaScript, Express.js**, and **SQLite**.

---

## ✨ Features Implemented

### 1. 👤 User Profiles
- **Profile Details**: Display name, username (`@handle`), bio, custom avatar, cover photo, location, website link, and joined date.
- **Dynamic Profile Statistics**: Real-time counters for **Followers**, **Following**, **Posts**, and **Total Likes Received**.
- **Interactive Profile Modals**: Click on *Followers* or *Following* to view the interactive list of users with 1-click Follow/Unfollow controls.
- **Edit Profile**: Full profile editor with avatar upload, random avatar generator (DiceBear API), bio, location, and website.
- **Profile Navigation Tabs**: Switch between **Posts** (posts authored by the user) and **Liked Posts** (posts liked by the user).

### 2. 📝 Posts & Comments
- **Rich Post Composer**:
  - Auto-growing text area with character countdown (up to 2,000 characters).
  - Image attachments: upload image files directly or paste web image URLs with real-time preview and remove controls.
  - Interactive hashtag chips (`#webdev`, `#javascript`, `#design`, `#photography`).
- **Feeds**:
  - **For You**: Global discovery feed of all community posts.
  - **Following**: Dedicated feed showing exclusively posts from creators you follow.
  - **Hashtag Filtering**: Click on any `#hashtag` to filter the feed in real-time.
- **Threaded Conversation & Comments**:
  - View full conversation threads with author metadata and relative timestamps.
  - Post replies and delete comments (permitted for the comment author or the post owner).
  - Dynamic comment count badge updates instantly across the UI.
- **Post Management**:
  - Authors can delete their own posts (cascading deletes comments and likes).
  - Share post link with 1-click clipboard copy and toast notifications.

### 3. ❤️ Like & Follow System
- **Like / Unlike**:
  - Optimistic UI updates with smooth heart pop animations and real-time counter updates.
  - View the list of people who liked any post.
- **Follow / Unfollow**:
  - Follow buttons available on user profile headers, the *"Who to follow"* sidebar widget, and inside Followers/Following modal lists.
  - Dynamically updates feeds and follower counts across the entire application.
- **Discovery & Search**:
  - Live search bar with instant autocomplete for discovering users by name or handle.
  - "Who to follow" recommendation widget based on community connections.

### 4. 🎨 Modern Responsive UI & UX
- **Desktop 3-Column Layout**: Left navigation sidebar, central scrollable feed, and right utility sidebar.
- **Mobile Responsive**: Adapts automatically with a top header and bottom navigation bar.
- **Dark & Light Mode**: Toggle between sleek dark theme and clean light theme with `localStorage` persistence.
- **Toast Notifications**: Non-intrusive animated feedback for actions (liked, followed, posted, copied).
- **Quick Demo Switcher**: Instant 1-click account switching to test multi-user interactions effortlessly!

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JS | Zero external framework overhead, modular components, responsive design. |
| **Backend** | Express.js (Node.js) | RESTful API, JWT authentication, cookie & header token support, Multer upload. |
| **Database** | SQLite (`node:sqlite`) | Persistent relational database with foreign key constraints, indexes, and WAL mode. |
| **Security** | `bcryptjs`, `jsonwebtoken` | Salted password hashing (cost factor 10) and secure JWT authentication. |

---

## 🗄️ Database Schema

The database schema (`db/social_media.db`) comprises 5 relational tables:

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  location TEXT DEFAULT '',
  website TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Likes table
CREATE TABLE likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- Follows table
CREATE TABLE follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id)
);
```

---

## 🚀 Quick Start Guide

### 1. Start the Server
Run the following command in the project root:

```bash
npm start
```
*(or `node server.js`)*

The server starts up and automatically seeds initial sample data if the database is clean.

### 2. Open in Browser
Visit:
```
http://localhost:3000
```

---

## 👥 Preloaded Demo Accounts

The database comes pre-populated with active accounts, posts, likes, comments, and follower connections:

| Username | Display Name | Default Password | Role / Bio |
| :--- | :--- | :--- | :--- |
| `alex_tech` | Alex Rivera | `password123` | Full-stack builder & open source enthusiast 🚀 |
| `maya_dev` | Maya Patel | `password123` | Frontend Architect & UI/UX lover ✨ |
| `jordan_art` | Jordan Lee | `password123` | Digital artist & photographer 📸 |
| `elena_sound`| Elena Rostova | `password123` | Music producer & synth collector 🎹 |
| `david_kim` | David Kim | `password123` | Cybersecurity specialist & climber 🧗‍♂️ |

> 💡 **Tip:** You can use the **⚡ Quick Demo Switcher** in the right sidebar or in the Sign In modal to test following, liking, and replying between accounts with a single click. You can also register any new account.

---

## 🔌 API Endpoints Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account (`username`, `email`, `password`, `display_name`).
- `POST /api/auth/login` — Login (`login`, `password`).
- `GET  /api/auth/me` — Get current logged-in user details and profile counts.
- `POST /api/auth/logout` — Clear session.

### Posts (`/api/posts`)
- `GET    /api/posts` — Get post feed (`?feed=for-you|following|user|liked`, `?tag=...`, `?page=...`).
- `POST   /api/posts` — Create a new post (`content`, optional `image` or `image_url`).
- `GET    /api/posts/:id` — Get single post with author metadata and comments.
- `DELETE /api/posts/:id` — Delete post (author only).
- `POST   /api/posts/:id/like` — Toggle like/unlike on post.
- `GET    /api/posts/:id/likes` — List users who liked the post.
- `POST   /api/posts/:id/comments` — Add comment to post (`content`).
- `DELETE /api/posts/:postId/comments/:commentId` — Delete comment (comment author or post author).

### Users & Profiles (`/api/users`)
- `GET  /api/users/profile/:username` — Get user profile details and stats.
- `PUT  /api/users/profile` — Update user profile (`display_name`, `bio`, `location`, `website`, `avatar`).
- `POST /api/users/:id/follow` — Toggle follow/unfollow for user `:id`.
- `GET  /api/users/:id/followers` — List users following user `:id`.
- `GET  /api/users/:id/following` — List users followed by user `:id`.
- `GET  /api/users/suggestions` — Get recommended accounts to follow.
- `GET  /api/users/search?q=...` — Search users by username or display name.

---

## 🧪 Running Automated Tests

Run the integration test suite:

```bash
npm test
```

This runs 13 end-to-end tests verifying:
- Authentication & registration
- Profile retrieval & stats
- Post creation & deletion
- Liking & unliking posts
- Threaded comments & deletion
- Following & unfollowing users
