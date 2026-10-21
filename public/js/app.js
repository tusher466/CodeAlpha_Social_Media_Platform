// Pulse Social Media — Main Application Orchestrator
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  selectedPostFile: null,
  activeDetailPostId: null,

  async init() {
    State.initTheme();
    this.bindGlobalEvents();
    this.bindModalEvents();
    this.bindComposerEvents();
    this.bindSearchEvents();

    // Check logged in user
    await this.checkAuthStatus();

    // Initial data fetch
    await Promise.all([
      this.loadFeed('for-you'),
      this.loadSuggestions()
    ]);
  },

  // -------------------------------------------------------------
  // AUTHENTICATION & SESSION
  // -------------------------------------------------------------
  async checkAuthStatus() {
    try {
      const token = API.getToken();
      if (token) {
        const res = await API.getMe();
        if (res.success && res.user) {
          State.setCurrentUser(res.user);
        } else {
          State.setCurrentUser(null);
        }
      } else {
        State.setCurrentUser(null);
      }
    } catch (err) {
      State.setCurrentUser(null);
    }
    this.renderUserSection();
  },

  renderUserSection() {
    const sidebarSection = document.getElementById('sidebar-user-section');
    const mobileAuthWrap = document.getElementById('mobile-auth-btn-wrap');
    const composerAvatar = document.getElementById('composer-avatar');
    const user = State.currentUser;

    if (user) {
      if (composerAvatar) {
        composerAvatar.src = user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`;
      }

      const userBadgeHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div class="user-badge-btn" id="sidebar-my-profile" style="cursor: pointer; flex: 1; min-width: 0;">
            <img class="avatar avatar-md" src="${user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.username}" alt="${user.display_name}">
            <div class="user-badge-info">
              <div class="user-badge-name">${Toast.escapeHtml(user.display_name)}</div>
              <div class="user-badge-handle">@${user.username}</div>
            </div>
          </div>
          <button class="logout-icon-btn" id="btn-logout" title="Log out">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      `;

      if (sidebarSection) sidebarSection.innerHTML = userBadgeHtml;
      if (mobileAuthWrap) {
        mobileAuthWrap.innerHTML = `
          <img class="avatar avatar-sm" id="m-header-avatar" style="cursor: pointer;" src="${user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.username}" alt="${user.display_name}">
        `;
        document.getElementById('m-header-avatar')?.addEventListener('click', () => {
          this.navigateToProfile(user.username);
        });
      }

      document.getElementById('sidebar-my-profile')?.addEventListener('click', () => {
        this.navigateToProfile(user.username);
      });

      document.getElementById('btn-logout')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await API.logout();
        State.setCurrentUser(null);
        this.renderUserSection();
        Toast.show('Logged out successfully', 'info');
        this.loadFeed(State.activeFeedTab);
        this.loadSuggestions();
      });

    } else {
      if (composerAvatar) {
        composerAvatar.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=guest';
      }

      const loginPromptHtml = `
        <button class="btn btn-primary btn-block" id="sidebar-login-btn">
          <span>Sign In / Register</span>
        </button>
      `;

      if (sidebarSection) sidebarSection.innerHTML = loginPromptHtml;
      if (mobileAuthWrap) {
        mobileAuthWrap.innerHTML = `
          <button class="btn btn-primary btn-sm" id="mobile-login-btn">Sign In</button>
        `;
        document.getElementById('mobile-login-btn')?.addEventListener('click', () => this.openModal('auth-modal'));
      }

      document.getElementById('sidebar-login-btn')?.addEventListener('click', () => this.openModal('auth-modal'));
    }
  },

  // -------------------------------------------------------------
  // FEED & POSTS LOADING
  // -------------------------------------------------------------
  async loadFeed(feedType = 'for-you', tag = null) {
    State.activeFeedTab = feedType;
    State.activeTagFilter = tag;
    State.activeView = 'feed';

    this.showView('view-feed');

    // Update active tab buttons
    document.querySelectorAll('.feed-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.feed === feedType);
    });

    // Update filter banner
    const filterBanner = document.getElementById('active-filter-banner');
    if (tag) {
      filterBanner.style.display = 'flex';
      document.getElementById('active-filter-text').textContent = `Filtering posts by #${tag}`;
    } else {
      filterBanner.style.display = 'none';
    }

    const stream = document.getElementById('posts-stream');
    stream.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading posts...</p>
      </div>
    `;

    try {
      const data = await API.getPosts({ feed: feedType, tag });
      stream.innerHTML = '';

      if (!data.posts || data.posts.length === 0) {
        let msg = feedType === 'following' 
          ? 'Posts from people you follow will appear here. Find people in "Who to follow" on the right!' 
          : 'No posts found yet. Be the first to share something!';
        if (tag) msg = `No posts found tagged with #${tag}`;

        stream.innerHTML = `
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            <h3>Nothing here yet</h3>
            <p>${msg}</p>
          </div>
        `;
        return;
      }

      data.posts.forEach(post => {
        const postCard = Components.renderPostCard(post);
        stream.appendChild(postCard);
      });

    } catch (err) {
      stream.innerHTML = `
        <div class="empty-state">
          <p style="color: var(--accent-rose);">Failed to load posts: ${Toast.escapeHtml(err.message)}</p>
        </div>
      `;
    }
  },

  // -------------------------------------------------------------
  // PROFILE VIEW
  // -------------------------------------------------------------
  async navigateToProfile(username) {
    if (!username) return;

    State.activeView = 'profile';
    this.showView('view-profile');

    const headerContainer = document.getElementById('profile-header-container');
    const postsStream = document.getElementById('profile-posts-stream');

    headerContainer.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading profile...</p>
      </div>
    `;
    postsStream.innerHTML = '';

    try {
      const data = await API.getProfile(username);
      State.activeProfileUser = data.profile;
      headerContainer.innerHTML = Components.renderProfileHeader(data.profile);

      this.bindProfileHeaderEvents(data.profile);
      await this.loadProfilePosts(data.profile.username, State.activeProfileTab);

    } catch (err) {
      headerContainer.innerHTML = `
        <div class="empty-state">
          <p style="color: var(--accent-rose);">User @${Toast.escapeHtml(username)} not found.</p>
        </div>
      `;
    }
  },

  async loadProfilePosts(username, tab = 'posts') {
    State.activeProfileTab = tab;
    const stream = document.getElementById('profile-posts-stream');
    stream.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading posts...</p>
      </div>
    `;

    document.querySelectorAll('.profile-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    try {
      const feedType = tab === 'liked' ? 'liked' : 'user';
      const user = State.activeProfileUser;
      const data = await API.getPosts({ feed: feedType, userId: user ? user.id : null, username });

      stream.innerHTML = '';
      if (!data.posts || data.posts.length === 0) {
        stream.innerHTML = `
          <div class="empty-state">
            <h3>No posts yet</h3>
            <p>@${Toast.escapeHtml(username)} hasn't ${tab === 'liked' ? 'liked any posts' : 'posted anything'} yet.</p>
          </div>
        `;
        return;
      }

      data.posts.forEach(post => {
        stream.appendChild(Components.renderPostCard(post));
      });

    } catch (err) {
      stream.innerHTML = `<div class="empty-state"><p style="color: var(--accent-rose);">${Toast.escapeHtml(err.message)}</p></div>`;
    }
  },

  bindProfileHeaderEvents(profile) {
    // Edit profile button
    document.getElementById('btn-open-edit-profile')?.addEventListener('click', () => {
      this.populateEditProfileModal(profile);
      this.openModal('edit-profile-modal');
    });

    // Follow/Unfollow button
    document.getElementById('btn-profile-follow')?.addEventListener('click', async (e) => {
      if (!State.currentUser) {
        this.openModal('auth-modal');
        return;
      }
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const res = await API.toggleFollow(profile.id);
        profile.is_following = res.is_following;
        profile.follower_count = res.follower_count;

        btn.className = `btn btn-follow ${res.is_following ? 'following' : 'not-following'}`;
        btn.querySelector('span').textContent = res.is_following ? 'Following' : 'Follow';

        const followerCountEl = document.querySelector('#stat-followers .stat-count');
        if (followerCountEl) followerCountEl.textContent = res.follower_count;

        Toast.show(res.message, 'success');
        this.loadSuggestions();
      } catch (err) {
        Toast.show(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    // Followers list modal click
    document.getElementById('stat-followers')?.addEventListener('click', () => {
      this.openUsersModal('followers', profile.id, `@${profile.username}'s Followers`);
    });

    // Following list modal click
    document.getElementById('stat-following')?.addEventListener('click', () => {
      this.openUsersModal('following', profile.id, `@${profile.username} is Following`);
    });
  },

  // -------------------------------------------------------------
  // POST COMPOSER
  // -------------------------------------------------------------
  bindComposerEvents() {
    const textarea = document.getElementById('composer-text');
    const counter = document.getElementById('composer-counter');
    const fileInput = document.getElementById('composer-file-input');
    const mediaPreview = document.getElementById('composer-media-preview');
    const previewImg = document.getElementById('composer-preview-img');
    const removeMediaBtn = document.getElementById('btn-remove-media');
    const toggleUrlBtn = document.getElementById('btn-toggle-url-input');
    const urlRow = document.getElementById('composer-url-row');
    const urlInput = document.getElementById('composer-url-input');
    const applyUrlBtn = document.getElementById('btn-apply-img-url');
    const publishBtn = document.getElementById('btn-publish-post');

    // Auto-grow textarea & character countdown
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 260)}px`;

      const remaining = 2000 - textarea.value.length;
      counter.textContent = remaining;
      counter.classList.toggle('warning', remaining <= 100 && remaining > 20);
      counter.classList.toggle('danger', remaining <= 20);
    });

    // File input preview
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.selectedPostFile = file;
        const reader = new FileReader();
        reader.onload = (re) => {
          previewImg.src = re.target.result;
          mediaPreview.style.display = 'block';
          urlRow.style.display = 'none';
          urlInput.value = '';
        };
        reader.readAsDataURL(file);
      }
    });

    // Remove media
    removeMediaBtn.addEventListener('click', () => {
      this.selectedPostFile = null;
      fileInput.value = '';
      previewImg.src = '';
      mediaPreview.style.display = 'none';
      urlInput.value = '';
    });

    // Toggle image URL row
    toggleUrlBtn.addEventListener('click', () => {
      const isVisible = urlRow.style.display === 'flex';
      urlRow.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) urlInput.focus();
    });

    // Apply URL image
    applyUrlBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (url) {
        this.selectedPostFile = null;
        fileInput.value = '';
        previewImg.src = url;
        mediaPreview.style.display = 'block';
        urlRow.style.display = 'none';
      }
    });

    // Quick tag chips
    document.querySelectorAll('.quick-tag-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        if (!textarea.value.includes(tag)) {
          textarea.value = (textarea.value.trim() ? textarea.value.trim() + ' ' : '') + tag + ' ';
          textarea.dispatchEvent(new Event('input'));
        }
        textarea.focus();
      });
    });

    // Publish Post
    publishBtn.addEventListener('click', async () => {
      if (!State.currentUser) {
        this.openModal('auth-modal');
        return;
      }

      const content = textarea.value.trim();
      const imageUrl = (previewImg.src && !this.selectedPostFile) ? previewImg.src : null;

      if (!content && !this.selectedPostFile && !imageUrl) {
        Toast.show('Please write something or attach an image', 'error');
        return;
      }

      publishBtn.disabled = true;
      publishBtn.innerHTML = `<span>Posting...</span>`;

      try {
        let res;
        if (this.selectedPostFile) {
          const formData = new FormData();
          formData.append('content', content);
          formData.append('image', this.selectedPostFile);
          res = await API.createPost(formData);
        } else {
          res = await API.createPost({ content, image_url: imageUrl });
        }

        // Reset composer
        textarea.value = '';
        textarea.style.height = 'auto';
        counter.textContent = '2000';
        counter.className = 'char-counter';
        this.selectedPostFile = null;
        fileInput.value = '';
        previewImg.src = '';
        mediaPreview.style.display = 'none';
        urlRow.style.display = 'none';
        urlInput.value = '';

        Toast.show('Post published!', 'success');

        // Prepend new post card to active stream
        const stream = document.getElementById('posts-stream');
        if (stream && State.activeView === 'feed') {
          const emptyState = stream.querySelector('.empty-state');
          if (emptyState) emptyState.remove();

          const newCard = Components.renderPostCard(res.post);
          stream.insertBefore(newCard, stream.firstChild);
        }

      } catch (err) {
        Toast.show(err.message, 'error');
      } finally {
        publishBtn.disabled = false;
        publishBtn.innerHTML = `<span>Post</span>`;
      }
    });
  },

  // -------------------------------------------------------------
  // POST & FEED GLOBAL EVENT DELEGATION
  // -------------------------------------------------------------
  bindGlobalEvents() {
    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => State.toggleTheme());
    document.getElementById('theme-toggle-desktop')?.addEventListener('click', () => State.toggleTheme());

    // Navigation buttons
    document.getElementById('nav-feed-btn')?.addEventListener('click', () => this.loadFeed('for-you'));
    document.getElementById('nav-explore-btn')?.addEventListener('click', () => this.loadFeed('for-you'));
    document.getElementById('nav-brand')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.loadFeed('for-you');
    });

    document.getElementById('nav-profile-btn')?.addEventListener('click', () => {
      if (State.currentUser) {
        this.navigateToProfile(State.currentUser.username);
      } else {
        this.openModal('auth-modal');
      }
    });

    // Mobile nav
    document.getElementById('m-nav-feed')?.addEventListener('click', () => this.loadFeed('for-you'));
    document.getElementById('m-nav-explore')?.addEventListener('click', () => this.loadFeed('for-you'));
    document.getElementById('m-nav-compose')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('composer-text')?.focus();
    });
    document.getElementById('m-nav-profile')?.addEventListener('click', () => {
      if (State.currentUser) {
        this.navigateToProfile(State.currentUser.username);
      } else {
        this.openModal('auth-modal');
      }
    });

    // Feed Tabs
    document.getElementById('tab-for-you')?.addEventListener('click', () => this.loadFeed('for-you'));
    document.getElementById('tab-following')?.addEventListener('click', () => {
      if (!State.currentUser) {
        this.openModal('auth-modal');
        return;
      }
      this.loadFeed('following');
    });

    // Clear tag filter button
    document.getElementById('btn-clear-filter')?.addEventListener('click', () => {
      this.loadFeed(State.activeFeedTab);
    });

    // Profile sub-tabs (Posts vs Liked)
    document.getElementById('ptab-posts')?.addEventListener('click', () => {
      if (State.activeProfileUser) this.loadProfilePosts(State.activeProfileUser.username, 'posts');
    });
    document.getElementById('ptab-liked')?.addEventListener('click', () => {
      if (State.activeProfileUser) this.loadProfilePosts(State.activeProfileUser.username, 'liked');
    });

    // Compose button in left sidebar
    document.getElementById('open-compose-btn')?.addEventListener('click', () => {
      if (State.activeView !== 'feed') {
        this.loadFeed('for-you');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('composer-text')?.focus();
    });

    // Global Trending topic click
    document.querySelectorAll('.trend-item').forEach(item => {
      item.addEventListener('click', () => {
        const tag = item.dataset.tag;
        this.loadFeed('for-you', tag);
      });
    });

    // Demo account quick buttons in right sidebar
    document.querySelectorAll('.demo-user-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        const username = chip.dataset.user;
        await this.demoLogin(username);
      });
    });

    // Delegate clicks on posts (Likes, Comments, Hashtags, Author Profiles, Deletes)
    document.body.addEventListener('click', async (e) => {
      // 1. Author link click
      const authorLink = e.target.closest('.post-author-link, .suggestion-user-link, .user-row-info');
      if (authorLink) {
        e.preventDefault();
        const username = authorLink.dataset.username;
        if (username) {
          this.closeAllModals();
          this.navigateToProfile(username);
          return;
        }
      }

      // 2. Hashtag click
      const hashtagEl = e.target.closest('.post-hashtag');
      if (hashtagEl) {
        const tag = hashtagEl.dataset.tag;
        this.loadFeed('for-you', tag);
        return;
      }

      // 3. Like Button Toggle
      const likeBtn = e.target.closest('.like-btn');
      if (likeBtn) {
        e.stopPropagation();
        if (!State.currentUser) {
          this.openModal('auth-modal');
          return;
        }

        const postId = likeBtn.dataset.postId;
        const countSpan = likeBtn.querySelector('.like-count');
        const isCurrentlyLiked = likeBtn.classList.contains('liked');

        // Optimistic UI update
        likeBtn.classList.toggle('liked', !isCurrentlyLiked);
        let curCount = parseInt(countSpan.textContent || '0', 10);
        let newCount = isCurrentlyLiked ? Math.max(0, curCount - 1) : curCount + 1;
        countSpan.textContent = newCount > 0 ? newCount : '';

        const svg = likeBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', !isCurrentlyLiked ? 'currentColor' : 'none');

        try {
          const res = await API.toggleLike(postId);
          // Sync with exact server count
          likeBtn.classList.toggle('liked', res.is_liked);
          countSpan.textContent = res.likes_count > 0 ? res.likes_count : '';
        } catch (err) {
          // Revert optimistic update
          likeBtn.classList.toggle('liked', isCurrentlyLiked);
          countSpan.textContent = curCount > 0 ? curCount : '';
          Toast.show(err.message, 'error');
        }
        return;
      }

      // 4. Comment Button Click (Opens Post Conversation Modal)
      const commentBtn = e.target.closest('.comment-btn');
      if (commentBtn) {
        e.stopPropagation();
        const postId = commentBtn.dataset.postId;
        this.openPostDetailModal(postId);
        return;
      }

      // 5. Share Button Click (Copy link)
      const shareBtn = e.target.closest('.share-btn');
      if (shareBtn) {
        e.stopPropagation();
        const postId = shareBtn.dataset.postId;
        const url = `${window.location.origin}/#post-${postId}`;
        try {
          await navigator.clipboard.writeText(url);
          Toast.show('Post link copied to clipboard!', 'success');
        } catch (err) {
          Toast.show('Link: ' + url, 'info');
        }
        return;
      }

      // 6. Delete Post Click
      const delPostBtn = e.target.closest('.btn-post-delete');
      if (delPostBtn) {
        e.stopPropagation();
        const postId = delPostBtn.dataset.postId;
        if (confirm('Are you sure you want to delete this post?')) {
          try {
            await API.deletePost(postId);
            const card = document.querySelector(`article[data-post-id="${postId}"]`);
            if (card) {
              card.style.opacity = '0';
              card.style.transform = 'scale(0.95)';
              setTimeout(() => card.remove(), 200);
            }
            Toast.show('Post deleted', 'info');
          } catch (err) {
            Toast.show(err.message, 'error');
          }
        }
        return;
      }

      // 7. Generic Follow button click (in sidebar suggestions or user modals)
      const followBtn = e.target.closest('.btn-follow:not(#btn-profile-follow)');
      if (followBtn) {
        e.stopPropagation();
        if (!State.currentUser) {
          this.openModal('auth-modal');
          return;
        }

        const userId = followBtn.dataset.userId;
        followBtn.disabled = true;

        try {
          const res = await API.toggleFollow(userId);
          const isNowFollowing = res.is_following;

          // Update this button and any other buttons for this user on the page
          document.querySelectorAll(`.btn-follow[data-user-id="${userId}"]`).forEach(btn => {
            btn.className = `btn btn-follow btn-sm ${isNowFollowing ? 'following' : 'not-following'}`;
            btn.querySelector('span').textContent = isNowFollowing ? 'Following' : 'Follow';
          });

          Toast.show(res.message, 'success');
          this.loadSuggestions();
        } catch (err) {
          Toast.show(err.message, 'error');
        } finally {
          followBtn.disabled = false;
        }
      }
    });
  },

  // -------------------------------------------------------------
  // POST CONVERSATION & COMMENTS MODAL
  // -------------------------------------------------------------
  async openPostDetailModal(postId) {
    this.activeDetailPostId = postId;
    this.openModal('post-detail-modal');

    const body = document.getElementById('post-detail-body');
    const commentsStream = document.getElementById('modal-comments-stream');
    const commentInput = document.getElementById('modal-comment-text');

    commentInput.value = '';
    body.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading conversation...</p></div>`;
    commentsStream.innerHTML = '';

    try {
      const data = await API.getPostDetail(postId);
      const postCard = Components.renderPostCard(data.post);
      body.innerHTML = '';
      body.appendChild(postCard);

      this.renderModalComments(data.comments);
    } catch (err) {
      body.innerHTML = `<div class="empty-state"><p style="color: var(--accent-rose);">${Toast.escapeHtml(err.message)}</p></div>`;
    }
  },

  renderModalComments(comments) {
    const commentsStream = document.getElementById('modal-comments-stream');
    commentsStream.innerHTML = '';

    if (!comments || comments.length === 0) {
      commentsStream.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No replies yet. Be the first to join the conversation!</p>`;
      return;
    }

    comments.forEach(comment => {
      const item = Components.renderCommentItem(comment);
      commentsStream.appendChild(item);
    });

    // Delete comment button handler
    commentsStream.querySelectorAll('.btn-del-comment').forEach(btn => {
      btn.addEventListener('click', async () => {
        const commentId = btn.dataset.commentId;
        const postId = btn.dataset.postId;
        try {
          const res = await API.deleteComment(postId, commentId);
          const item = commentsStream.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
          if (item) item.remove();

          // Update comment count on post card
          this.updatePostCardCommentCount(postId, res.comments_count);
          Toast.show('Comment deleted', 'info');
        } catch (err) {
          Toast.show(err.message, 'error');
        }
      });
    });
  },

  updatePostCardCommentCount(postId, count) {
    document.querySelectorAll(`article[data-post-id="${postId}"] .comment-count`).forEach(el => {
      el.textContent = count > 0 ? count : '';
    });
  },

  // -------------------------------------------------------------
  // MODAL LOGIC & FORMS
  // -------------------------------------------------------------
  bindModalEvents() {
    // Close modal triggers
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        this.closeModal(modalId);
      });
    });

    // Close on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal(modal.id);
      });
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllModals();
    });

    // Auth Modal tab switching (Sign in vs Register)
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const formLogin = document.getElementById('login-form');
    const formRegister = document.getElementById('register-form');

    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display = 'flex';
      formRegister.style.display = 'none';
      document.getElementById('auth-modal-title').textContent = 'Sign in to Pulse';
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formRegister.style.display = 'flex';
      formLogin.style.display = 'none';
      document.getElementById('auth-modal-title').textContent = 'Join Pulse today';
    });

    // Login Form Submit
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const login = document.getElementById('login-identifier').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const res = await API.login(login, password);
        State.setCurrentUser(res.user);
        this.renderUserSection();
        this.closeModal('auth-modal');
        Toast.show(`Welcome back, ${res.user.display_name}!`, 'success');
        this.loadFeed(State.activeFeedTab);
        this.loadSuggestions();
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });

    // Quick demo buttons inside login modal
    document.querySelectorAll('.quick-login-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const username = btn.dataset.user;
        await this.demoLogin(username);
      });
    });

    // Register Form Submit
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-username').value.trim();
      const display_name = document.getElementById('reg-fullname').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;

      try {
        const res = await API.register(username, email, password, display_name);
        State.setCurrentUser(res.user);
        this.renderUserSection();
        this.closeModal('auth-modal');
        Toast.show(`Account created! Welcome to Pulse, ${res.user.display_name}!`, 'success');
        this.loadFeed('for-you');
        this.loadSuggestions();
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });

    // Submit Comment inside Post Detail Modal
    document.getElementById('btn-submit-modal-comment')?.addEventListener('click', async () => {
      if (!State.currentUser) {
        this.openModal('auth-modal');
        return;
      }

      const input = document.getElementById('modal-comment-text');
      const content = input.value.trim();
      if (!content) return;

      const submitBtn = document.getElementById('btn-submit-modal-comment');
      submitBtn.disabled = true;

      try {
        const res = await API.addComment(this.activeDetailPostId, content);
        input.value = '';

        // Add to modal comments list
        const stream = document.getElementById('modal-comments-stream');
        const emptyMsg = stream.querySelector('p');
        if (emptyMsg) emptyMsg.remove();

        const item = Components.renderCommentItem(res.comment);
        stream.appendChild(item);

        // Update comment counter on post card
        this.updatePostCardCommentCount(this.activeDetailPostId, res.comments_count);
        Toast.show('Reply added', 'success');
      } catch (err) {
        Toast.show(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
      }
    });

    // Edit Profile Modal Submissions
    const editForm = document.getElementById('edit-profile-form');
    const avatarFileInput = document.getElementById('edit-avatar-file');
    const avatarPreviewImg = document.getElementById('edit-avatar-preview');
    let editAvatarFile = null;

    avatarFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        editAvatarFile = file;
        const reader = new FileReader();
        reader.onload = re => { avatarPreviewImg.src = re.target.result; };
        reader.readAsDataURL(file);
      }
    });

    document.getElementById('btn-dicebear-avatar')?.addEventListener('click', () => {
      const randomSeed = Math.random().toString(36).substring(7);
      avatarPreviewImg.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`;
      editAvatarFile = null;
      avatarFileInput.value = '';
    });

    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const displayName = document.getElementById('edit-display-name').value.trim();
      const bio = document.getElementById('edit-bio').value.trim();
      const location = document.getElementById('edit-location').value.trim();
      const website = document.getElementById('edit-website').value.trim();

      try {
        let res;
        if (editAvatarFile) {
          const formData = new FormData();
          formData.append('display_name', displayName);
          formData.append('bio', bio);
          formData.append('location', location);
          formData.append('website', website);
          formData.append('avatar', editAvatarFile);
          res = await API.updateProfile(formData);
        } else {
          res = await API.updateProfile({
            display_name: displayName,
            bio,
            location,
            website,
            avatar_url: avatarPreviewImg.src
          });
        }

        State.setCurrentUser(res.user);
        this.renderUserSection();
        this.closeModal('edit-profile-modal');
        Toast.show('Profile updated successfully!', 'success');

        if (State.activeView === 'profile' && State.activeProfileUser && State.activeProfileUser.id === res.user.id) {
          this.navigateToProfile(res.user.username);
        }
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });
  },

  populateEditProfileModal(profile) {
    document.getElementById('edit-display-name').value = profile.display_name || '';
    document.getElementById('edit-bio').value = profile.bio || '';
    document.getElementById('edit-location').value = profile.location || '';
    document.getElementById('edit-website').value = profile.website || '';
    document.getElementById('edit-avatar-preview').src = profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`;
  },

  async openUsersModal(type, userId, title) {
    this.openModal('users-list-modal');
    document.getElementById('users-list-title').textContent = title;
    const body = document.getElementById('users-list-body');
    body.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

    try {
      const res = type === 'followers' ? await API.getFollowers(userId) : await API.getFollowing(userId);
      const list = type === 'followers' ? res.followers : res.following;

      body.innerHTML = '';
      if (!list || list.length === 0) {
        body.innerHTML = `<div class="empty-state"><p>No users found</p></div>`;
        return;
      }

      list.forEach(u => {
        body.appendChild(Components.renderUserRow(u));
      });
    } catch (err) {
      body.innerHTML = `<p style="color: var(--accent-rose);">${Toast.escapeHtml(err.message)}</p>`;
    }
  },

  // -------------------------------------------------------------
  // SIDEBAR SUGGESTIONS & SEARCH
  // -------------------------------------------------------------
  async loadSuggestions() {
    const listEl = document.getElementById('suggestions-list');
    if (!listEl) return;

    try {
      const data = await API.getSuggestions();
      listEl.innerHTML = '';

      if (!data.suggestions || data.suggestions.length === 0) {
        listEl.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">No suggestions right now.</p>`;
        return;
      }

      data.suggestions.forEach(user => {
        listEl.appendChild(Components.renderSuggestionItem(user));
      });
    } catch (err) {
      console.error('Suggestions load error:', err);
    }
  },

  bindSearchEvents() {
    const searchInput = document.getElementById('global-search-input');
    const dropdown = document.getElementById('search-dropdown');
    let debounceTimer = null;

    searchInput?.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const query = searchInput.value.trim();

      if (!query) {
        dropdown.style.display = 'none';
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const res = await API.searchUsers(query);
          dropdown.innerHTML = '';

          if (!res.users || res.users.length === 0) {
            dropdown.innerHTML = `<div style="padding: 12px 16px; font-size: 0.88rem; color: var(--text-muted);">No matching users found</div>`;
            dropdown.style.display = 'block';
            return;
          }

          res.users.forEach(u => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.innerHTML = `
              <img class="avatar avatar-sm" src="${u.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + u.username}" alt="">
              <div>
                <div style="font-weight: 700; font-size: 0.9rem;">${Toast.escapeHtml(u.display_name)}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">@${u.username}</div>
              </div>
            `;
            item.addEventListener('click', () => {
              dropdown.style.display = 'none';
              searchInput.value = '';
              this.navigateToProfile(u.username);
            });
            dropdown.appendChild(item);
          });

          dropdown.style.display = 'block';
        } catch (err) {
          dropdown.style.display = 'none';
        }
      }, 250);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-box')) {
        if (dropdown) dropdown.style.display = 'none';
      }
    });
  },

  // -------------------------------------------------------------
  // HELPER UTILITIES
  // -------------------------------------------------------------
  async demoLogin(username) {
    try {
      const res = await API.login(username, 'password123');
      State.setCurrentUser(res.user);
      this.renderUserSection();
      this.closeAllModals();
      Toast.show(`Switched account to @${username}`, 'success');
      this.loadFeed(State.activeFeedTab);
      this.loadSuggestions();
    } catch (err) {
      Toast.show('Demo login failed: ' + err.message, 'error');
    }
  },

  showView(viewId) {
    document.querySelectorAll('.view').forEach(v => {
      v.style.display = v.id === viewId ? 'block' : 'none';
    });

    // Update nav active classes
    const isFeed = viewId === 'view-feed';
    document.getElementById('nav-feed-btn')?.classList.toggle('active', isFeed);
    document.getElementById('m-nav-feed')?.classList.toggle('active', isFeed);

    const isProfile = viewId === 'view-profile';
    document.getElementById('nav-profile-btn')?.classList.toggle('active', isProfile && State.activeProfileUser && State.currentUser && State.activeProfileUser.id === State.currentUser.id);
    document.getElementById('m-nav-profile')?.classList.toggle('active', isProfile && State.activeProfileUser && State.currentUser && State.activeProfileUser.id === State.currentUser.id);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.style.display = 'none';
    });
    document.body.style.overflow = '';
  }
};
