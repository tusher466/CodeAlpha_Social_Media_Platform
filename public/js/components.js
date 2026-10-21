// UI Components for Pulse Social Media
const Components = {
  // Post Card Component
  renderPostCard(post) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.dataset.postId = post.id;

    const timeAgoStr = Formatter.timeAgo(post.created_at);
    const formattedContent = Formatter.formatContent(post.content);
    const isLiked = Boolean(post.is_liked);
    const likeCount = Number(post.likes_count || 0);
    const commentCount = Number(post.comments_count || 0);

    const mediaHtml = post.image_url ? `
      <div class="post-media">
        <img src="${post.image_url}" alt="Post attachment" loading="lazy" class="post-media-img" data-full="${post.image_url}">
      </div>
    ` : '';

    const deleteBtnHtml = post.is_author ? `
      <button class="btn-post-delete" data-post-id="${post.id}" title="Delete post">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    ` : '';

    card.innerHTML = `
      <div class="post-header">
        <a href="#" class="post-author-link" data-username="${post.author.username}">
          <img class="avatar avatar-md" src="${post.author.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + post.author.username}" alt="${post.author.display_name}">
          <div class="post-author-info">
            <span class="post-author-name">${Toast.escapeHtml(post.author.display_name)}</span>
            <div class="post-author-meta">
              <span class="post-author-handle">@${post.author.username}</span>
              <span class="post-dot">·</span>
              <span class="post-time">${timeAgoStr}</span>
            </div>
          </div>
        </a>
        <div class="post-menu-actions">
          ${deleteBtnHtml}
        </div>
      </div>

      <div class="post-body">
        <div class="post-content">${formattedContent}</div>
        ${mediaHtml}

        <div class="post-actions">
          <!-- Like Button -->
          <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}" title="${isLiked ? 'Unlike' : 'Like'}">
            <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span class="action-count like-count">${likeCount > 0 ? likeCount : ''}</span>
          </button>

          <!-- Comment Button -->
          <button class="action-btn comment-btn" data-post-id="${post.id}" title="View conversation & comments">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            <span class="action-count comment-count">${commentCount > 0 ? commentCount : ''}</span>
          </button>

          <!-- Share / Copy Link Button -->
          <button class="action-btn share-btn" data-post-id="${post.id}" title="Share post link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>
    `;

    return card;
  },

  // Comment Item Component
  renderCommentItem(comment) {
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.dataset.commentId = comment.id;

    const timeAgoStr = Formatter.timeAgo(comment.created_at);
    const deleteBtn = comment.can_delete ? `
      <button class="btn-del-comment" data-comment-id="${comment.id}" data-post-id="${comment.post_id}" title="Delete comment">
        ✕
      </button>
    ` : '';

    item.innerHTML = `
      <img class="avatar avatar-sm" src="${comment.author.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + comment.author.username}" alt="${comment.author.display_name}">
      <div class="comment-body">
        <div class="comment-header">
          <div>
            <span class="comment-author-name">${Toast.escapeHtml(comment.author.display_name)}</span>
            <span class="post-author-handle">@${comment.author.username}</span>
            <span class="post-dot">·</span>
            <span class="comment-time">${timeAgoStr}</span>
          </div>
          ${deleteBtn}
        </div>
        <p class="comment-text">${Formatter.formatContent(comment.content)}</p>
      </div>
    `;

    return item;
  },

  // Profile Header Card
  renderProfileHeader(profile) {
    const isSelf = Boolean(profile.is_self);
    const isFollowing = Boolean(profile.is_following);

    const actionButtonHtml = isSelf ? `
      <button class="btn btn-outline" id="btn-open-edit-profile">Edit Profile</button>
    ` : `
      <button class="btn btn-follow ${isFollowing ? 'following' : 'not-following'}" id="btn-profile-follow" data-user-id="${profile.id}">
        <span>${isFollowing ? 'Following' : 'Follow'}</span>
      </button>
    `;

    const locationHtml = profile.location ? `
      <div class="profile-detail-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span>${Toast.escapeHtml(profile.location)}</span>
      </div>
    ` : '';

    const websiteHtml = profile.website ? `
      <div class="profile-detail-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <a href="${profile.website}" target="_blank" rel="noopener noreferrer">${Toast.escapeHtml(profile.website.replace(/^https?:\/\//, ''))}</a>
      </div>
    ` : '';

    const joinDate = profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently';

    return `
      <div class="profile-cover">
        ${profile.cover_url ? `<img src="${profile.cover_url}" alt="Cover image">` : ''}
      </div>
      <div class="profile-main-meta">
        <div class="profile-avatar-row">
          <img class="avatar avatar-xl" src="${profile.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + profile.username}" alt="${profile.display_name}">
          ${actionButtonHtml}
        </div>

        <div class="profile-titles">
          <h1 class="profile-fullname">${Toast.escapeHtml(profile.display_name)}</h1>
          <div class="profile-username">@${profile.username}</div>
        </div>

        ${profile.bio ? `<p class="profile-bio">${Toast.escapeHtml(profile.bio)}</p>` : ''}

        <div class="profile-details-strip">
          ${locationHtml}
          ${websiteHtml}
          <div class="profile-detail-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Joined ${joinDate}</span>
          </div>
        </div>

        <!-- Interactive Stats Strip -->
        <div class="profile-stats-strip">
          <div class="stat-pill" id="stat-following" data-user-id="${profile.id}">
            <span class="stat-count">${profile.following_count || 0}</span>
            <span class="stat-label">Following</span>
          </div>
          <div class="stat-pill" id="stat-followers" data-user-id="${profile.id}">
            <span class="stat-count">${profile.follower_count || 0}</span>
            <span class="stat-label">Followers</span>
          </div>
          <div class="stat-pill">
            <span class="stat-count">${profile.post_count || 0}</span>
            <span class="stat-label">Posts</span>
          </div>
          <div class="stat-pill">
            <span class="stat-count">${profile.likes_received || 0}</span>
            <span class="stat-label">Likes Received</span>
          </div>
        </div>
      </div>
    `;
  },

  // User Row for Followers/Following Modal
  renderUserRow(user) {
    const row = document.createElement('div');
    row.className = 'user-row';

    const isFollowing = Boolean(user.is_following);
    const isSelf = State.currentUser && State.currentUser.id === user.id;

    const followBtnHtml = isSelf ? '' : `
      <button class="btn btn-follow btn-sm ${isFollowing ? 'following' : 'not-following'}" data-user-id="${user.id}">
        <span>${isFollowing ? 'Following' : 'Follow'}</span>
      </button>
    `;

    row.innerHTML = `
      <a href="#" class="user-row-info" data-username="${user.username}">
        <img class="avatar avatar-sm" src="${user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.username}" alt="${user.display_name}">
        <div>
          <div class="post-author-name">${Toast.escapeHtml(user.display_name)}</div>
          <div class="post-author-handle">@${user.username}</div>
        </div>
      </a>
      ${followBtnHtml}
    `;

    return row;
  },

  // Suggestion Item for Right Sidebar
  renderSuggestionItem(user) {
    const item = document.createElement('div');
    item.className = 'suggestion-item';

    item.innerHTML = `
      <a href="#" class="suggestion-user-link" data-username="${user.username}">
        <img class="avatar avatar-sm" src="${user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.username}" alt="${user.display_name}">
        <div>
          <div class="suggestion-name">${Toast.escapeHtml(user.display_name)}</div>
          <div class="suggestion-handle">@${user.username}</div>
        </div>
      </a>
      <button class="btn btn-follow btn-sm not-following" data-user-id="${user.id}">
        <span>Follow</span>
      </button>
    `;

    return item;
  }
};

window.Components = Components;
