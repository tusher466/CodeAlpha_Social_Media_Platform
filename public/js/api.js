// Centralized API Client for Pulse Social Media
const API = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('pulse_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('pulse_token', token);
    } else {
      localStorage.removeItem('pulse_token');
    }
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = options.headers || {};

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth Endpoints
  async register(username, email, password, display_name) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, display_name })
    });
    if (data.token) this.setToken(data.token);
    return data;
  },

  async login(login, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password })
    });
    if (data.token) this.setToken(data.token);
    return data;
  },

  async getMe() {
    return await this.request('/auth/me');
  },

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    this.setToken(null);
  },

  // Posts Endpoints
  async getPosts({ feed = 'for-you', userId = null, username = null, tag = null, page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (feed) params.append('feed', feed);
    if (userId) params.append('userId', userId);
    if (username) params.append('username', username);
    if (tag) params.append('tag', tag);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);

    return await this.request(`/posts?${params.toString()}`);
  },

  async createPost(payload) {
    if (payload instanceof FormData) {
      return await this.request('/posts', {
        method: 'POST',
        body: payload
      });
    }
    return await this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getPostDetail(id) {
    return await this.request(`/posts/${id}`);
  },

  async deletePost(id) {
    return await this.request(`/posts/${id}`, { method: 'DELETE' });
  },

  async toggleLike(id) {
    return await this.request(`/posts/${id}/like`, { method: 'POST' });
  },

  async getPostLikes(id) {
    return await this.request(`/posts/${id}/likes`);
  },

  async addComment(postId, content) {
    return await this.request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },

  async deleteComment(postId, commentId) {
    return await this.request(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
  },

  // Users & Profiles Endpoints
  async getProfile(username) {
    return await this.request(`/users/profile/${encodeURIComponent(username)}`);
  },

  async updateProfile(payload) {
    if (payload instanceof FormData) {
      return await this.request('/users/profile', {
        method: 'PUT',
        body: payload
      });
    }
    return await this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async toggleFollow(userId) {
    return await this.request(`/users/${userId}/follow`, { method: 'POST' });
  },

  async getFollowers(userId) {
    return await this.request(`/users/${userId}/followers`);
  },

  async getFollowing(userId) {
    return await this.request(`/users/${userId}/following`);
  },

  async getSuggestions() {
    return await this.request('/users/suggestions');
  },

  async searchUsers(query) {
    return await this.request(`/users/search?q=${encodeURIComponent(query)}`);
  }
};

window.API = API;
