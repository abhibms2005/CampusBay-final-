/**
 * API Integration Module - CampusBay
 * Handles all communication with backend API endpoints
 */

// Get API base URL - use same origin or fallback to localhost:4000
const API_BASE_URL = (function () {
  // Check if we're on same origin (e.g., localhost:4000)
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;

  // If already on the right port, use same origin
  if (port === '4000' || port === '') {
    return `${protocol}//${hostname}${port ? ':' + port : ''}/api`;
  }

  // Otherwise use localhost:4000
  return 'http://localhost:4000/api';
})();

class CampusBayAPI {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  /**
   * Set auth token (called after login/register)
   */
  setToken(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * Clear auth token (called on logout)
   */
  clearToken() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Generic fetch wrapper with auth header
   */
  async _fetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Multipart fetch for file uploads
   */
  async _fetchMultipart(endpoint, formData, method = 'POST') {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // ==================== AUTH ENDPOINTS ====================

  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(name, email, password, college) {
    const data = await this._fetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, college })
    });
    this.setToken(data.token, data.user);
    return data;
  }

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  async login(email, password) {
    const data = await this._fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.token, data.user);
    return data;
  }

  // ==================== ITEMS ENDPOINTS ====================

  /**
   * GET /api/items
   * List items with optional filters
   */
  async listItems(options = {}) {
    const params = new URLSearchParams();
    if (options.q) params.append('q', options.q);
    if (options.category) params.append('category', options.category);
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    if (options.includeStatus) params.append('includeStatus', options.includeStatus);
    if (options.sort) params.append('sort', options.sort);

    return this._fetch(`/items?${params.toString()}`, {
      method: 'GET'
    });
  }

  /**
   * GET /api/items/:id
   * Get a single item by ID
   */
  async getItem(id) {
    return this._fetch(`/items/${id}`, {
      method: 'GET'
    });
  }

  /**
   * POST /api/items
   * Create a new listing (requires authentication and image upload)
   */
  async createItem(title, description, price, category, location, imageFile = null) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('location', location);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this._fetchMultipart('/items', formData, 'POST');
  }

  /**
   * DELETE /api/items/:id
   * Delete an item (only seller can delete)
   */
  async deleteItem(id) {
    return this._fetch(`/items/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * PUT /api/items/:id/toggle
   * Toggle item availability (mark as sold/unsold)
   */
  async toggleItemAvailability(id) {
    return this._fetch(`/items/${id}/toggle`, {
      method: 'PUT'
    });
  }

  /**
   * PUT /api/items/:id/mark-sold
   * Mark item as SOLD (production endpoint)
   */
  async markItemSold(id) {
    return this._fetch(`/items/${id}/mark-sold`, {
      method: 'PUT'
    });
  }

  /**
   * PUT /api/items/:id/purchase
   * Purchase item (buyer endpoint - no seller restriction)
   */
  async purchaseItem(id) {
    return this._fetch(`/items/${id}/purchase`, {
      method: 'PUT'
    });
  }

  /**
   * PUT /api/items/:id/mark-available
   * Mark item as AVAILABLE (production endpoint)
   */
  async markItemAvailable(id) {
    return this._fetch(`/items/${id}/mark-available`, {
      method: 'PUT'
    });
  }

  // ==================== MESSAGES ENDPOINTS ====================

  /**
   * GET /api/messages/conversations
   * Get all messages for authenticated user
   */
  async getMessages() {
    return this._fetch('/messages/conversations', {
      method: 'GET'
    });
  }

  /**
   * GET /api/messages/:conversationId
   * Get messages for a specific conversation
   */
  async getConversation(conversationId) {
    return this._fetch(`/messages/${conversationId}`, {
      method: 'GET'
    });
  }

  /**
   * POST /api/messages
   * Send a message to another user
   */
  async sendMessage(to, itemId, text) {
    return this._fetch('/messages', {
      method: 'POST',
      body: JSON.stringify({ to, itemId, text })
    });
  }

  // ==================== WISHLIST ENDPOINTS ====================

  /**
   * GET /api/wishlist
   * Get current user's wishlist
   */
  async getWishlist() {
    return this._fetch('/wishlist', {
      method: 'GET'
    });
  }

  /**
   * POST /api/wishlist/:itemId
   * Add item to wishlist
   */
  async addToWishlist(itemId) {
    return this._fetch(`/wishlist/${itemId}`, {
      method: 'POST'
    });
  }

  /**
   * DELETE /api/wishlist/:itemId
   * Remove item from wishlist
   */
  async removeFromWishlist(itemId) {
    return this._fetch(`/wishlist/${itemId}`, {
      method: 'DELETE'
    });
  }

  /**
   * GET /api/wishlist/check/:itemId
   * Check if item is in wishlist
   */
  async isInWishlist(itemId) {
    return this._fetch(`/wishlist/check/${itemId}`, {
      method: 'GET'
    });
  }

  // ==================== UTILITY ====================

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!this.token && !!this.user;
  }

  /**
   * Get current user data
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Get auth token
   */
  getToken() {
    return this.token;
  }
}

// Create global API instance
const api = new CampusBayAPI();
