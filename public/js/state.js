// Central App State & Utility Store for Pulse
const State = {
  currentUser: null,
  activeView: 'feed', // 'feed' | 'profile'
  activeFeedTab: 'for-you', // 'for-you' | 'following'
  activeProfileUser: null, // profile object being viewed
  activeProfileTab: 'posts', // 'posts' | 'liked'
  activeTagFilter: null,
  theme: localStorage.getItem('pulse_theme') || 'dark',

  initTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  },

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.theme);
    localStorage.setItem('pulse_theme', this.theme);
    return this.theme;
  },

  setCurrentUser(user) {
    this.currentUser = user;
    this.notifyListeners('user_change', user);
  },

  listeners: {},

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },

  notifyListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
};

// UI Toast Notification Utility
const Toast = {
  show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[m]);
  }
};

// Format Utilities
const Formatter = {
  timeAgo(dateInput) {
    if (!dateInput) return '';
    // Normalize SQLite timestamp "YYYY-MM-DD HH:MM:SS"
    const parsed = typeof dateInput === 'string' && !dateInput.includes('Z') 
      ? new Date(dateInput.replace(' ', 'T') + 'Z') 
      : new Date(dateInput);

    const now = new Date();
    const diffSec = Math.floor((now - parsed) / 1000);

    if (diffSec < 45) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  formatContent(text) {
    if (!text) return '';
    let escaped = Toast.escapeHtml(text);

    // Turn URLs into clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    escaped = escaped.replace(urlRegex, url => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });

    // Turn #hashtags into clickable tags
    const tagRegex = /(#\w+)/g;
    escaped = escaped.replace(tagRegex, tag => {
      const cleanTag = tag.substring(1);
      return `<span class="post-hashtag" data-tag="${cleanTag}">${tag}</span>`;
    });

    return escaped;
  }
};

window.State = State;
window.Toast = Toast;
window.Formatter = Formatter;
