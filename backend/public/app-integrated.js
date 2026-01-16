/**
 * CampusBay Frontend - Marketplace Page
 * Fully integrated with backend API
 * 
 * API Endpoints:
 * - POST /api/auth/login
 * - POST /api/auth/register
 * - GET /api/items
 * - GET /api/items/:id
 * - POST /api/items (with multipart form-data)
 * - DELETE /api/items/:id
 * - PUT /api/items/:id/toggle
 * - GET /api/messages
 * - POST /api/messages
 */

// Verify API client is loaded
if (typeof api === 'undefined') {
  console.error('❌ API client not loaded! Make sure api.js is loaded before app-integrated.js');
  alert('Error: API client not loaded. Please refresh the page.');
}

document.addEventListener('DOMContentLoaded', async () => {
  // ==================== ELEMENT REFERENCES ====================
  const listingsGrid = document.getElementById('listings-grid');
  const searchInput = document.getElementById('search-input');
  const priceMinInput = document.getElementById('price-min');
  const priceMaxInput = document.getElementById('price-max');
  const categoryCheckboxes = document.querySelectorAll('.category-filter');

  const navLoggedIn = document.getElementById('nav-logged-in');
  const navLoggedOut = document.getElementById('nav-logged-out');
  const welcomeMsg = document.getElementById('welcome-msg');

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const createListingForm = document.getElementById('create-listing-form');
  const createListingBtnLoggedOut = document.getElementById('create-listing-btn-logged-out');
  const createListingBtnLoggedIn = document.getElementById('create-listing-btn-logged-in');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const demoLoginBtn = document.getElementById('demo-login-btn');
  const savedItemsBtn = document.getElementById('saved-items-btn');

  const modals = {
    login: document.getElementById('login-modal'),
    create: document.getElementById('create-listing-modal'),
    chat: document.getElementById('chat-modal'),
    detail: document.getElementById('listing-detail-modal'),
    saved: document.getElementById('saved-items-modal'),
    payment: document.getElementById('payment-modal'),
    purchases: document.getElementById('purchases-modal'),
    'sold-items': document.getElementById('sold-items-modal'),
    'seller-inbox': document.getElementById('seller-inbox-modal')
  };

  const toast = document.getElementById('toast');

  const detailTitle = document.getElementById('detail-modal-title');
  const detailImg = document.getElementById('detail-modal-img-src');
  const detailPrice = document.getElementById('detail-modal-price');
  const detailLocation = document.getElementById('detail-modal-location');
  const detailDescription = document.getElementById('detail-modal-description');
  const detailSellerName = document.getElementById('detail-modal-seller-name');
  const detailChatBtn = document.getElementById('detail-modal-chat-btn');
  const detailSaveBtn = document.getElementById('detail-modal-save-btn');
  const detailDeleteBtn = document.getElementById('detail-modal-delete-btn');

  const savedItemsGrid = document.getElementById('saved-items-grid');
  const chatModalTitle = document.getElementById('chat-modal-title');
  const chatForm = document.getElementById('chat-form');
  const chatMessageInput = document.getElementById('chat-message-input');
  const chatWindow = document.getElementById('chat-window');

  // Auth tabs
  const loginTabBtn = document.getElementById('login-tab-btn');
  const registerTabBtn = document.getElementById('register-tab-btn');
  const loginFormContainer = document.getElementById('login-form-container');
  const registerFormContainer = document.getElementById('register-form-container');
  const authModalTitle = document.getElementById('auth-modal-title');

  // ==================== STATE ====================
  let cachedListings = [];
  let savedItems = new Set();
  let currentViewedListing = null;
  let currentChatItem = null; // Track which item is being discussed
  let currentChatRecipient = null; // Track the actual recipient (buyer or seller)
  let currentConversation = []; // Store fetched messages
  let chatAutoRefreshInterval = null; // Track auto-refresh interval


  // Payment modal elements
  const paymentForm = document.getElementById('payment-form');
  const paymentItemImage = document.getElementById('payment-item-image');
  const paymentItemTitle = document.getElementById('payment-item-title');
  const paymentItemPrice = document.getElementById('payment-item-price');
  const paymentSellerName = document.getElementById('payment-seller-name');
  const detailBuyBtn = document.getElementById('detail-modal-buy-btn');
  const refreshChatBtn = document.getElementById('refresh-chat-btn');

  // ==================== UTILITY FUNCTIONS ====================
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return (text || '').replace(/[&<>"']/g, m => map[m]);
  }

  function showToast(msg) {
    if (!toast) return console.log('Toast:', msg);
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2500);
  }

  function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
  }

  function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
  }

  function updateAuthUI() {
    const myListingsFilter = document.getElementById('my-listings-filter');
    const purchaseHistorySection = document.getElementById('purchase-history-section');

    if (api.isLoggedIn()) {
      const user = api.getCurrentUser();
      if (navLoggedOut) navLoggedOut.style.display = 'none';
      if (navLoggedIn) navLoggedIn.style.display = 'flex';
      if (welcomeMsg) welcomeMsg.innerText = `Welcome, ${user.name}!`;
      if (myListingsFilter) myListingsFilter.style.display = 'block';
      if (purchaseHistorySection) purchaseHistorySection.style.display = 'block';
      updateSellerStats(); // Update stats when logged in
    } else {
      if (navLoggedOut) navLoggedOut.style.display = 'flex';
      if (navLoggedIn) navLoggedIn.style.display = 'none';
      if (myListingsFilter) myListingsFilter.style.display = 'none';
      if (purchaseHistorySection) purchaseHistorySection.style.display = 'none';
      savedItems.clear();
      updateSavedCount();
      hideSellerStats(); // Hide stats when logged out
      showOnlyMyListings = false; // Reset filter
    }
  }

  async function updateSellerStats() {
    const sellerStatsDiv = document.getElementById('seller-stats');
    if (!sellerStatsDiv) return;

    if (!api.isLoggedIn()) {
      sellerStatsDiv.style.display = 'none';
      return;
    }

    sellerStatsDiv.style.display = 'block';

    try {
      // Fetch all items including sold ones
      const result = await api.listItems({ includeStatus: 'ALL' });
      const currentUser = api.getCurrentUser();

      // Filter items by current seller
      const myListings = result.items.filter(item =>
        (item.seller?._id || item.seller?.id) === currentUser.id
      );

      const totalListings = myListings.length;
      const soldItems = myListings.filter(item => item.availabilityStatus === 'SOLD').length;
      const totalEarnings = myListings
        .filter(item => item.availabilityStatus === 'SOLD')
        .reduce((sum, item) => sum + (item.price || 0), 0);

      // Update UI
      const totalListingsEl = document.getElementById('stat-total-listings');
      const soldItemsEl = document.getElementById('stat-sold-items');
      const earningsEl = document.getElementById('stat-earnings');

      if (totalListingsEl) totalListingsEl.innerText = totalListings;
      if (soldItemsEl) soldItemsEl.innerText = soldItems;
      if (earningsEl) earningsEl.innerText = `₹${totalEarnings.toLocaleString()}`;
    } catch (err) {
      console.error('Failed to update seller stats:', err);
    }
  }

  function hideSellerStats() {
    const sellerStatsDiv = document.getElementById('seller-stats');
    if (sellerStatsDiv) sellerStatsDiv.style.display = 'none';
  }

  function updateSavedCount() {
    if (savedItemsBtn) {
      savedItemsBtn.innerHTML = `&#9829; Saved (${savedItems.size})`;
    }
  }

  function openModal(id) {
    if (modals[id]) {
      modals[id].style.display = 'block';
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
  }

  function closeModal(id) {
    if (modals[id]) {
      modals[id].style.display = 'none';
      document.body.style.overflow = 'auto'; // Restore scroll

      // Reset forms when closing modals
      if (id === 'create') {
        createListingForm?.reset();
      } else if (id === 'login') {
        loginForm?.reset();
        registerForm?.reset();
        const loginError = document.getElementById('login-error-msg');
        const registerError = document.getElementById('register-error-msg');
        if (loginError) loginError.style.display = 'none';
        if (registerError) registerError.style.display = 'none';
      } else if (id === 'chat') {
        if (chatMessageInput) chatMessageInput.value = '';
        // Stop auto-refresh when closing chat
        if (chatAutoRefreshInterval) {
          clearInterval(chatAutoRefreshInterval);
          chatAutoRefreshInterval = null;
        }
      } else if (id === 'payment') {
        paymentForm?.reset();
      }
    }
  }

  // ==================== API CALLS ====================
  async function loadItems() {
    try {
      showLoading();
      const result = await api.listItems();
      cachedListings = result.items || [];
      applyFilters();
      updateSellerStats(); // Update stats after loading items
      hideLoading();
    } catch (err) {
      console.error('Failed to load items:', err);
      showToast('Failed to load items. Check console.');
      hideLoading();
    }
  }

  async function createListing() {
    if (!api.isLoggedIn()) {
      showToast('Please login first');
      openModal('login');
      return;
    }

    try {
      const title = document.getElementById('listing-title')?.value;
      const description = document.getElementById('listing-description')?.value;
      const price = document.getElementById('listing-price')?.value;
      const category = document.getElementById('listing-category')?.value;
      const location = document.getElementById('listing-location')?.value;
      const imageInput = document.getElementById('images');

      if (!title || !price || !category || !location) {
        showToast('Please fill in required fields');
        return;
      }

      let imageFile = null;
      if (imageInput && imageInput.files && imageInput.files[0]) {
        imageFile = imageInput.files[0];
      }

      const result = await api.createItem(title, description, price, category, location, imageFile);
      showToast('Listing created successfully!');
      createListingForm.reset();
      closeModal('create');
      await loadItems();
    } catch (err) {
      console.error('Failed to create listing:', err);
      showToast('Failed to create listing: ' + (err.message || ''));
    }
  }

  // ==================== FILTERING ====================
  let showOnlyMyListings = false;

  function applyFilters() {
    let filtered = [...cachedListings];

    // My Listings filter
    if (showOnlyMyListings && api.isLoggedIn()) {
      const currentUser = api.getCurrentUser();
      filtered = filtered.filter(item =>
        (item.seller?._id || item.seller?.id) === currentUser.id
      );
    }

    // Search
    const searchTerm = searchInput?.value.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(item =>
        (item.title?.toLowerCase().includes(searchTerm)) ||
        (item.description?.toLowerCase().includes(searchTerm)) ||
        (item.location?.toLowerCase().includes(searchTerm))
      );
    }

    // Price range
    const minPrice = parseFloat(priceMinInput?.value);
    const maxPrice = parseFloat(priceMaxInput?.value);
    if (!isNaN(minPrice)) filtered = filtered.filter(item => item.price >= minPrice);
    if (!isNaN(maxPrice)) filtered = filtered.filter(item => item.price <= maxPrice);

    // Categories
    const selectedCategories = [];
    categoryCheckboxes.forEach(cb => {
      if (cb.checked) selectedCategories.push(cb.value);
    });
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(item => selectedCategories.includes(item.category));
    }

    renderListings(filtered);
  }

  // ==================== RENDERING ====================
  function renderListings(listings) {
    if (!listingsGrid) return;
    listingsGrid.innerHTML = '';

    if (!listings || listings.length === 0) {
      listingsGrid.innerHTML = '<p class="no-listings-message">No listings found. Try adjusting your filters!</p>';
      return;
    }

    const currentUser = api.getCurrentUser();

    listings.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'listing-card';
      card.dataset.listingId = item._id || item.id;
      card.dataset.category = item.category || 'Other'; // For category-specific styling

      // 🎨 SMOOTH ENTRANCE ANIMATION with STAGGER
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'all 0.5s ease';
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 50); // Stagger each card by 50ms

      // ✅ PRODUCTION-SAFE AVAILABILITY LOGIC - USES BACKEND TRUTH ONLY
      // The backend now provides explicit availabilityStatus field
      // No more client-side inference - we trust the backend state
      const isAvailable = item.availabilityStatus === 'AVAILABLE';

      // Apply sold-out styling if unavailable
      if (!isAvailable) {
        card.classList.add('sold-out');
      }

      // Check if current user is the seller - add my-listing class for visual distinction
      const sellerId = item.seller?._id || item.seller?.id;
      const isOwnItem = currentUser && currentUser.id === sellerId;
      if (isOwnItem) {
        card.classList.add('my-listing');
      }

      const imgSrc = item.imageUrl || '';
      const sellerName = item.seller?.name || 'Unknown Seller';
      const sellerVerified = item.seller?.verified ? '✓' : '';

      // Availability badge HTML - show actual status from backend
      let availabilityBadge = '';
      if (item.availabilityStatus === 'SOLD') {
        availabilityBadge = '<div class="availability-badge sold">Sold</div>';
      } else if (item.availabilityStatus === 'RESERVED') {
        availabilityBadge = '<div class="availability-badge reserved">Reserved</div>';
      } else {
        availabilityBadge = '<div class="availability-badge available">Available</div>';
      }

      // 🔍 HIGHLIGHT SEARCH TERMS in title and description
      const searchTerm = searchInput?.value.trim();
      let displayTitle = escapeHtml(item.title);
      let displayDescription = item.description || '';

      if (searchTerm) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        displayTitle = displayTitle.replace(regex, '<mark style="background: #fef08a; padding: 2px 4px; border-radius: 3px;">$1</mark>');
        displayDescription = displayDescription.replace(regex, '<mark style="background: #fef08a; padding: 2px 4px; border-radius: 3px;">$1</mark>');
      }

      // Determine button text and behavior
      let buttonHtml = '';
      if (isOwnItem) {
        // User's own item - show ownership indicator instead of message button
        buttonHtml = '<button class="btn btn-secondary" disabled style="cursor: not-allowed;">Your Item</button>';
      } else if (isAvailable) {
        buttonHtml = `
        <button class="btn btn-success quick-buy-btn" style="flex: 1; font-size: 0.875rem; padding: var(--space-2);">\ud83d\udcb3 Buy</button>
        <button class="btn btn-primary chat-btn" style="flex: 1; font-size: 0.875rem; padding: var(--space-2);">Message</button>
      `;
      } else {
        buttonHtml = '<button class="btn btn-primary chat-btn" disabled>Unavailable</button>';
      }

      card.innerHTML = `
        ${availabilityBadge}
        <div class="listing-card-image">
          ${imgSrc ? `<img src="${imgSrc}" alt="${escapeHtml(item.title)}" 
               onerror="this.style.display='none'">` : ''}
        </div>
        <div class="listing-card-content">
          <h3 class="listing-card-title">${displayTitle}</h3>
          <p class="listing-card-price">&#8377;${item.price}</p>
          <p class="listing-card-location">${escapeHtml(item.location || '')}</p>
          <div class="listing-card-action" style="display: flex; gap: var(--space-2);">
            ${buttonHtml}
          </div>
        </div>`;

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-buy-btn') && !e.target.disabled) {
          e.stopPropagation();
          if (isAvailable && !isOwnItem) {
            showPaymentModal(item);
          }
        } else if (e.target.classList.contains('chat-btn') && !e.target.disabled) {
          e.stopPropagation();
          if (isAvailable && !isOwnItem) {
            showChatModal(item);
          } else if (isOwnItem) {
            showToast('This is your own item');
          } else {
            showToast('This item is no longer available');
          }
        } else {
          showDetailModal(item);
        }
      });

      listingsGrid.appendChild(card);
    });
  }

  function showDetailModal(item) {
    currentViewedListing = item;

    if (detailTitle) detailTitle.innerText = item.title;
    if (detailImg) {
      detailImg.src = item.imageUrl || 'https://placehold.co/600x400/cccccc/000?text=No+Image';
      detailImg.alt = item.title;
    }
    if (detailPrice) detailPrice.innerHTML = `&#8377;${item.price}`;
    if (detailLocation) detailLocation.innerText = item.location || 'Location not specified';
    if (detailDescription) detailDescription.innerText = item.description || 'No description available';
    if (detailSellerName) {
      const verified = item.seller?.verified ? ' ✓' : '';
      detailSellerName.innerText = `Seller: ${item.seller?.name || 'Unknown'}${verified}`;
    }

    if (detailSaveBtn) {
      detailSaveBtn.dataset.listingId = item._id || item.id;
      if (savedItems.has(item._id || item.id)) {
        detailSaveBtn.innerText = '✓ Saved';
        detailSaveBtn.classList.add('btn-success');
        detailSaveBtn.classList.remove('btn-secondary');
        detailSaveBtn.disabled = true;
      } else {
        detailSaveBtn.innerText = 'Save for Later';
        detailSaveBtn.classList.remove('btn-success');
        detailSaveBtn.classList.add('btn-secondary');
        detailSaveBtn.disabled = false;
      }
    }

    // Determine if current user is the seller
    const currentUser = api.getCurrentUser();
    const isSeller = currentUser && currentUser.id === (item.seller?._id || item.seller?.id);
    const isAvailable = item.availabilityStatus === 'AVAILABLE';

    // Show/hide Buy Now button
    if (detailBuyBtn) {
      if (isSeller) {
        detailBuyBtn.style.display = 'none'; // Can't buy your own item
      } else if (isAvailable) {
        detailBuyBtn.style.display = 'inline-flex';
      } else {
        detailBuyBtn.style.display = 'none'; // Item not available
      }
    }

    // Show delete button and mark-sold button only if current user is the seller
    if (detailDeleteBtn) {
      if (isSeller) {
        detailDeleteBtn.style.display = 'inline-flex';
        detailDeleteBtn.disabled = false;

        // Show mark-sold or mark-available button
        let markStatusBtn = document.getElementById('detail-modal-mark-status-btn');
        if (markStatusBtn) {
          markStatusBtn.style.display = 'inline-flex';
          if (item.availabilityStatus === 'AVAILABLE') {
            markStatusBtn.innerText = '✓ Mark as Sold';
            markStatusBtn.className = 'btn btn-secondary';
            markStatusBtn.dataset.action = 'mark-sold';
          } else {
            markStatusBtn.innerText = '↻ Mark as Available';
            markStatusBtn.className = 'btn btn-primary';
            markStatusBtn.dataset.action = 'mark-available';
          }
        }
      } else {
        detailDeleteBtn.style.display = 'none';
        detailDeleteBtn.disabled = true;
        let markStatusBtn = document.getElementById('detail-modal-mark-status-btn');
        if (markStatusBtn) markStatusBtn.style.display = 'none';
      }
    }

    openModal('detail');
  }

  async function showChatModal(item, recipientId = null) {
    if (!api.isLoggedIn()) {
      showToast('Please login to send messages');
      openModal('login');
      return;
    }

    currentChatItem = item;
    const sellerId = item.seller?._id || item.seller?.id;
    const currentUser = api.getCurrentUser();
    const isSeller = sellerId === currentUser.id;

    // Determine the conversation partner
    if (recipientId) {
      // Explicitly provided recipient (e.g., seller replying from inbox)
      currentChatRecipient = recipientId;
    } else if (isSeller) {
      // User is the seller - they shouldn't reach here without a recipientId
      // But if they do, show message to use inbox
      showToast('Please use Messages Inbox to reply to buyers');
      return;
    } else {
      // User is a buyer - send to seller
      currentChatRecipient = sellerId;
    }

    // Prevent messaging self
    if (currentChatRecipient === currentUser.id) {
      showToast('You cannot message yourself');
      return;
    }

    // Set chat modal title with context
    if (chatModalTitle) {
      if (isSeller) {
        chatModalTitle.innerText = `Replying about: ${item.title}`;
      } else {
        chatModalTitle.innerText = `Chat about: ${item.title}`;
      }
    }

    // Load conversation history
    await loadConversation(item._id || item.id, currentChatRecipient);

    openModal('chat');

    // Start auto-refresh every 5 seconds
    if (chatAutoRefreshInterval) clearInterval(chatAutoRefreshInterval);
    chatAutoRefreshInterval = setInterval(async () => {
      await loadConversation(item._id || item.id, currentChatRecipient);
    }, 5000); // Refresh every 5 seconds
  }


  async function loadConversation(itemId, partnerId) {
    if (!chatWindow) return;

    try {
      // Show loading state
      chatWindow.innerHTML = '<div class="msg" style="text-align: center; color: #888;">Loading messages...</div>';

      // Fetch all conversations for current user
      const result = await api.getMessages();
      const allMessages = result.messages || [];

      const currentUser = api.getCurrentUser();

      // Filter messages for this specific item and conversation partner
      const relevantMessages = allMessages.filter(msg => {
        const msgItemId = msg.item?._id || msg.item?.id || msg.item;
        const msgFromId = msg.from?._id || msg.from?.id || msg.from;
        const msgToId = msg.to?._id || msg.to?.id || msg.to;

        // Message must be about this item
        if (msgItemId !== itemId) return false;

        // Message must be between current user and conversation partner
        return (msgFromId === currentUser.id && msgToId === partnerId) ||
          (msgFromId === partnerId && msgToId === currentUser.id);
      });


      // Sort by creation time (oldest first)
      relevantMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      currentConversation = relevantMessages;

      // Display messages
      if (relevantMessages.length === 0) {
        chatWindow.innerHTML = `
          <div class="msg" style="text-align: center; color: #888; font-style: italic;">
            No messages yet. Start the conversation!
          </div>`;
      } else {
        chatWindow.innerHTML = '';
        relevantMessages.forEach(msg => {
          const msgDiv = document.createElement('div');
          const isFromCurrentUser = (msg.from?._id || msg.from?.id || msg.from) === currentUser.id;
          msgDiv.className = isFromCurrentUser ? 'msg msg-buyer' : 'msg msg-seller';
          msgDiv.innerText = msg.text;

          // Add timestamp
          const timestamp = document.createElement('div');
          timestamp.style.fontSize = '0.7rem';
          timestamp.style.color = '#999';
          timestamp.style.marginTop = '4px';
          timestamp.innerText = new Date(msg.createdAt).toLocaleString();
          msgDiv.appendChild(timestamp);

          chatWindow.appendChild(msgDiv);
        });
      }

      // Scroll to bottom
      chatWindow.scrollTop = chatWindow.scrollHeight;
    } catch (err) {
      console.error('Failed to load conversation:', err);
      chatWindow.innerHTML = '<div class="msg" style="text-align: center; color: #d93025;">Failed to load messages. Please try again.</div>';
    }
  }

  function renderSavedItems() {
    if (!savedItemsGrid) return;

    if (savedItems.size === 0) {
      savedItemsGrid.innerHTML = '<p class="saved-item-empty">You have no saved items.</p>';
      return;
    }

    savedItemsGrid.innerHTML = '';
    const savedListings = cachedListings.filter(item => savedItems.has(item._id || item.id));

    savedListings.forEach(item => {
      const card = document.createElement('div');
      card.className = 'saved-item-card';
      card.dataset.listingId = item._id || item.id;

      card.innerHTML = `
        <img src="${item.imageUrl || 'https://placehold.co/60x60/cccccc/000?text=No+Image'}" 
             alt="${escapeHtml(item.title)}" class="saved-item-img">
        <div class="saved-item-info">
          <div class="saved-item-title">${escapeHtml(item.title)}</div>
          <div class="saved-item-price">&#8377;${item.price}</div>
        </div>`;

      card.addEventListener('click', () => {
        closeModal('saved');
        showDetailModal(item);
      });

      savedItemsGrid.appendChild(card);
    });
  }

  // ==================== DELETE ITEM ====================
  async function deleteItem() {
    if (!currentViewedListing) return;

    const confirmed = confirm(`Are you sure you want to delete "${currentViewedListing.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const itemId = currentViewedListing._id || currentViewedListing.id;
      await api.deleteItem(itemId);
      showToast('Item deleted successfully!');
      closeModal('detail');
      await loadItems();
    } catch (err) {
      console.error('Failed to delete item:', err);
      showToast('Failed to delete item: ' + (err.message || ''));
    }
  }

  // ==================== SELLER INBOX ====================
  async function loadSellerInbox() {
    const container = document.getElementById('inbox-messages-container');
    const countBadge = document.getElementById('inbox-count');

    if (!container) return;

    try {
      container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">Loading messages...</div>';

      const result = await api.getMessages();
      const allMessages = result.messages || [];
      const currentUser = api.getCurrentUser();

      // Filter messages for conversations involving the current user
      const relevantMessages = allMessages.filter(msg => {
        const toId = msg.to?._id || msg.to?.id || msg.to;
        const fromId = msg.from?._id || msg.from?.id || msg.from;
        // Include messages sent TO me or FROM me
        return toId === currentUser.id || fromId === currentUser.id;
      });

      // Group messages by item AND buyer (unique conversations)
      const conversationsByKey = {};
      relevantMessages.forEach(msg => {
        const itemId = msg.item?._id || msg.item?.id || msg.item;
        const fromId = msg.from?._id || msg.from?.id || msg.from;
        const toId = msg.to?._id || msg.to?.id || msg.to;

        // Determine the "other party" - the person who is NOT the current user
        const otherPartyId = fromId === currentUser.id ? toId : fromId;
        const otherPartyName = fromId === currentUser.id
          ? (msg.to?.name || 'Unknown')
          : (msg.from?.name || 'Unknown');

        // Create a unique key for each item+buyer combination
        const conversationKey = `${itemId}_${otherPartyId}`;

        if (!conversationsByKey[conversationKey]) {
          conversationsByKey[conversationKey] = {
            item: msg.item,
            otherPartyId: otherPartyId,
            otherPartyName: otherPartyName,
            messages: [],
            latestTimestamp: null
          };
        }
        conversationsByKey[conversationKey].messages.push(msg);
        const msgTime = new Date(msg.createdAt);
        if (!conversationsByKey[conversationKey].latestTimestamp || msgTime > conversationsByKey[conversationKey].latestTimestamp) {
          conversationsByKey[conversationKey].latestTimestamp = msgTime;
          // Update other party name from the latest message if available
          if (fromId !== currentUser.id && msg.from?.name) {
            conversationsByKey[conversationKey].otherPartyName = msg.from.name;
          }
        }
      });

      // Update count badge
      const totalConversations = Object.keys(conversationsByKey).length;
      if (countBadge) {
        countBadge.innerText = totalConversations;
        countBadge.style.display = totalConversations > 0 ? 'inline-block' : 'none';
      }

      if (totalConversations === 0) {
        container.innerHTML = '<p class="no-listings-message">No messages yet. When you chat with buyers or sellers, conversations will appear here.</p>';
        return;
      }

      // Render grouped messages
      container.innerHTML = '';

      // Sort by latest message timestamp (newest first)
      const sortedConversations = Object.values(conversationsByKey).sort((a, b) => b.latestTimestamp - a.latestTimestamp);

      sortedConversations.forEach(convo => {
        const itemData = convo.item || {};
        const latestMsg = convo.messages[convo.messages.length - 1];
        const msgCount = convo.messages.length;

        const card = document.createElement('div');
        card.className = 'inbox-message-card';
        card.innerHTML = `
          <div class="inbox-item-info">
            <img src="${itemData.imageUrl || 'https://placehold.co/48x48/ccc/000?text=Item'}" 
                 alt="${escapeHtml(itemData.title || 'Item')}" class="inbox-item-image">
            <div>
              <div class="inbox-item-title">${escapeHtml(itemData.title || 'Unknown Item')}</div>
              <div class="inbox-buyer-name">
                ${escapeHtml(convo.otherPartyName)} (${msgCount} message${msgCount > 1 ? 's' : ''})
              </div>
            </div>
          </div>
          <div class="inbox-message-preview">
            "${escapeHtml(latestMsg.text.substring(0, 100))}${latestMsg.text.length > 100 ? '...' : ''}"
          </div>
          <div class="inbox-timestamp">
            ${convo.latestTimestamp.toLocaleString()}
          </div>
        `;

        // Click to open chat for this item WITH the specific buyer/seller
        card.addEventListener('click', () => {
          closeModal('seller-inbox');
          // Find the full item from cached listings
          const fullItem = cachedListings.find(i => (i._id || i.id) === (itemData._id || itemData.id));
          if (fullItem) {
            // Pass the other party's ID as the recipient
            showChatModal(fullItem, convo.otherPartyId);
          } else {
            // Item might not be in cache, create a minimal item object
            const minimalItem = {
              _id: itemData._id || itemData.id,
              title: itemData.title || 'Item',
              seller: { _id: currentUser.id } // Current user is the seller for their inbox
            };
            showChatModal(minimalItem, convo.otherPartyId);
          }
        });

        container.appendChild(card);
      });

    } catch (err) {
      console.error('Failed to load seller inbox:', err);
      container.innerHTML = '<p class="no-listings-message" style="color: var(--error-500);">Failed to load messages. Please try again.</p>';
    }
  }


  // ==================== EVENT LISTENERS ====================

  // Auth tabs
  if (loginTabBtn) {
    loginTabBtn.addEventListener('click', () => {
      loginTabBtn.classList.add('active');
      registerTabBtn?.classList.remove('active');
      loginFormContainer?.classList.add('active');
      registerFormContainer?.classList.remove('active');
      if (authModalTitle) authModalTitle.innerText = 'Login';
    });
  }

  if (registerTabBtn) {
    registerTabBtn.addEventListener('click', () => {
      loginTabBtn?.classList.remove('active');
      registerTabBtn.classList.add('active');
      loginFormContainer?.classList.remove('active');
      registerFormContainer?.classList.add('active');
      if (authModalTitle) authModalTitle.innerText = 'Register';
    });
  }

  // Login form
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email')?.value;
      const password = document.getElementById('login-password')?.value;

      if (!email || !password) {
        showToast('Please enter email and password');
        return;
      }

      try {
        const result = await api.login(email, password);
        showToast(`Welcome back, ${result.user.name}!`);
        updateAuthUI();
        closeModal('login');
        loginForm.reset();
        await loadItems();

        // Check for seller notifications
        setTimeout(() => checkSellerNotifications(), 500);
      } catch (err) {
        console.error('Login error:', err);
        const errMsg = document.getElementById('login-error-msg');
        if (errMsg) {
          errMsg.innerText = err.message || 'Invalid credentials';
          errMsg.style.display = 'block';
        }
        showToast('Login failed: ' + (err.message || ''));
      }
    });
  }

  // Register form
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name')?.value;
      const email = document.getElementById('register-email')?.value;
      const password = document.getElementById('register-password')?.value;
      const confirmPassword = document.getElementById('register-confirm-password')?.value;

      if (!name || !email || !password || !confirmPassword) {
        showToast('Please fill in all fields');
        return;
      }

      if (password !== confirmPassword) {
        const errMsg = document.getElementById('register-error-msg');
        if (errMsg) {
          errMsg.innerText = 'Passwords do not match';
          errMsg.style.display = 'block';
        }
        return;
      }

      try {
        const result = await api.register(name, email, password, 'College');
        showToast(`Account created! Welcome, ${result.user.name}!`);
        updateAuthUI();
        closeModal('login');
        registerForm.reset();
        await loadItems();
      } catch (err) {
        console.error('Register error:', err);
        const errMsg = document.getElementById('register-error-msg');
        if (errMsg) {
          errMsg.innerText = err.message || 'Registration failed';
          errMsg.style.display = 'block';
        }
        showToast('Registration failed: ' + (err.message || ''));
      }
    });
  }

  // Demo login
  if (demoLoginBtn) {
    demoLoginBtn.addEventListener('click', async () => {
      try {
        const result = await api.login('sneha.reddy@bmsce.ac.in', 'Password@123');
        showToast(`Demo login successful! Welcome, Sneha Reddy!`);
        updateAuthUI();
        closeModal('login');
        await loadItems();
      } catch (err) {
        console.error('Demo login error:', err);
        showToast('Demo login failed: ' + (err.message || ''));
      }
    });
  }

  // Create listing
  if (createListingForm) {
    createListingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await createListing();
    });
  }

  // Chat form - SEND MESSAGES TO BACKEND
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!api.isLoggedIn()) {
        showToast('Please login to send messages');
        closeModal('chat');
        openModal('login');
        return;
      }

      const msg = chatMessageInput?.value;
      if (!msg?.trim()) return;

      if (!currentChatItem) {
        showToast('Error: No item selected');
        return;
      }

      if (!currentChatRecipient) {
        showToast('Error: No recipient selected');
        return;
      }

      const itemId = currentChatItem._id || currentChatItem.id;
      const currentUser = api.getCurrentUser();

      // Prevent sending to self
      if (currentChatRecipient === currentUser.id) {
        showToast('You cannot message yourself');
        return;
      }

      try {
        // Disable send button to prevent double-send
        const sendBtn = chatForm.querySelector('button[type="submit"]');
        if (sendBtn) sendBtn.disabled = true;

        // Send message to backend using currentChatRecipient
        const result = await api.sendMessage(currentChatRecipient, itemId, msg.trim());

        // Add message to UI immediately for better UX
        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg msg-buyer'; // Current user's messages are always on the right
        msgDiv.innerText = msg.trim();

        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.style.fontSize = '0.7rem';
        timestamp.style.color = '#999';
        timestamp.style.marginTop = '4px';
        timestamp.innerText = new Date().toLocaleString();
        msgDiv.appendChild(timestamp);

        chatWindow?.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        // Clear input
        if (chatMessageInput) chatMessageInput.value = '';

        // Re-enable send button
        if (sendBtn) sendBtn.disabled = false;

        console.log('Message sent successfully:', result);
      } catch (err) {
        console.error('Failed to send message:', err);
        showToast('Failed to send message: ' + (err.message || 'Unknown error'));

        // Re-enable send button
        const sendBtn = chatForm.querySelector('button[type="submit"]');
        if (sendBtn) sendBtn.disabled = false;
      }
    });
  }


  // Save for later button
  if (detailSaveBtn) {
    detailSaveBtn.addEventListener('click', () => {
      if (!api.isLoggedIn()) {
        closeModal('detail');
        openModal('login');
        return;
      }

      if (currentViewedListing) {
        const id = currentViewedListing._id || currentViewedListing.id;
        savedItems.add(id);
        detailSaveBtn.innerText = '✓ Saved';
        detailSaveBtn.classList.add('btn-success');
        detailSaveBtn.classList.remove('btn-secondary');
        detailSaveBtn.disabled = true;
        updateSavedCount();
        showToast('Item saved for later!');
      }
    });
  }

  // Delete item button
  if (detailDeleteBtn) {
    detailDeleteBtn.addEventListener('click', deleteItem);
  }

  // Saved items button
  if (savedItemsBtn) {
    savedItemsBtn.addEventListener('click', () => {
      if (!api.isLoggedIn()) {
        openModal('login');
        return;
      }
      renderSavedItems();
      openModal('saved');
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      api.clearToken();
      updateAuthUI();
      showToast('Logged out successfully');
      // Close detail modal if open
      closeModal('detail');

      // Clear login form fields to prevent auto-fill issues
      const loginEmailInput = document.getElementById('login-email');
      const loginPasswordInput = document.getElementById('login-password');
      if (loginEmailInput) loginEmailInput.value = '';
      if (loginPasswordInput) loginPasswordInput.value = '';

      // Also reset the login form
      if (loginForm) loginForm.reset();
    });
  }

  // Seller Inbox button
  const sellerInboxBtn = document.getElementById('seller-inbox-btn');
  if (sellerInboxBtn) {
    sellerInboxBtn.addEventListener('click', async () => {
      if (!api.isLoggedIn()) {
        openModal('login');
        return;
      }
      await loadSellerInbox();
      openModal('seller-inbox');
    });
  }

  // Login button
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      openModal('login');
    });
  }

  // Create listing buttons
  if (createListingBtnLoggedOut) {
    createListingBtnLoggedOut.addEventListener('click', () => {
      openModal('login');
    });
  }

  if (createListingBtnLoggedIn) {
    createListingBtnLoggedIn.addEventListener('click', () => {
      openModal('create');
    });
  }

  // My Listings toggle button
  const toggleMyListingsBtn = document.getElementById('toggle-my-listings-btn');
  if (toggleMyListingsBtn) {
    toggleMyListingsBtn.addEventListener('click', () => {
      showOnlyMyListings = !showOnlyMyListings;

      const icon = document.getElementById('my-listings-icon');
      const text = document.getElementById('my-listings-text');

      if (showOnlyMyListings) {
        toggleMyListingsBtn.classList.remove('btn-secondary');
        toggleMyListingsBtn.classList.add('btn-primary');
        if (icon) icon.innerText = '✅';
        if (text) text.innerText = 'Show All Listings';
      } else {
        toggleMyListingsBtn.classList.remove('btn-primary');
        toggleMyListingsBtn.classList.add('btn-secondary');
        if (icon) icon.innerText = '📦';
        if (text) text.innerText = 'Show My Listings Only';
      }

      applyFilters(); // Refresh with new filter
    });
  }

  // Filter listeners
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (priceMinInput) priceMinInput.addEventListener('input', applyFilters);
  if (priceMaxInput) priceMaxInput.addEventListener('input', applyFilters);
  categoryCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));

  // Modal close buttons - properly close and reset state
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal-id');
      closeModal(modalId);
    });
  });

  // Click outside modal to close
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      // Find which modal was clicked
      Object.keys(modals).forEach(id => {
        if (modals[id] === e.target) {
          closeModal(id);
        }
      });
    }
  });

  // ESC key to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close all open modals
      Object.keys(modals).forEach(id => {
        if (modals[id] && modals[id].style.display === 'block') {
          closeModal(id);
        }
      });
    }
  });

  // Mark status button handler (mark as sold/available)
  const markStatusBtn = document.getElementById('detail-modal-mark-status-btn');
  if (markStatusBtn) {
    markStatusBtn.addEventListener('click', async () => {
      if (!currentViewedListing) return;

      const action = markStatusBtn.dataset.action;
      const itemId = currentViewedListing._id || currentViewedListing.id;

      try {
        let result;
        if (action === 'mark-sold') {
          result = await api.markItemSold(itemId);
          showToast('Item marked as SOLD');
        } else {
          result = await api.markItemAvailable(itemId);
          showToast('Item marked as AVAILABLE');
        }

        closeModal('detail');
        await loadItems(); // Refresh listings
      } catch (err) {
        console.error('Failed to update item status:', err);
        showToast('Failed to update item status');
      }
    });
  }

  // ==================== PAYMENT MODAL ====================
  function showPaymentModal(item) {
    if (!api.isLoggedIn()) {
      showToast('Please login to purchase items');
      openModal('login');
      return;
    }

    const currentUser = api.getCurrentUser();
    const isSeller = currentUser && currentUser.id === (item.seller?._id || item.seller?.id);

    if (isSeller) {
      showToast('You cannot buy your own item');
      return;
    }

    if (item.availabilityStatus !== 'AVAILABLE') {
      showToast('This item is no longer available');
      return;
    }

    // Store the item for payment processing
    currentViewedListing = item;

    // Populate payment modal with item details
    if (paymentItemImage) paymentItemImage.src = item.imageUrl || 'https://placehold.co/80x80/cccccc/000?text=No+Image';
    if (paymentItemTitle) paymentItemTitle.innerText = item.title;
    if (paymentItemPrice) paymentItemPrice.innerHTML = `&#8377;${item.price}`;
    if (paymentSellerName) paymentSellerName.innerText = item.seller?.name || 'Unknown';

    // Pre-fill buyer name if available
    const buyerNameInput = document.getElementById('payment-buyer-name');
    if (buyerNameInput && currentUser) {
      buyerNameInput.value = currentUser.name || '';
    }

    closeModal('detail');
    openModal('payment');
  }

  // Payment form submit handler
  if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentViewedListing) {
        showToast('Error: No item selected');
        return;
      }

      // Get payment form values
      const buyerName = document.getElementById('payment-buyer-name')?.value;
      const buyerPhone = document.getElementById('payment-buyer-phone')?.value;
      const cardNumber = document.getElementById('payment-card-number')?.value || '';
      const cardExpiry = document.getElementById('payment-card-expiry')?.value || '';
      const cardCvv = document.getElementById('payment-card-cvv')?.value || '';
      const cardName = document.getElementById('payment-card-name')?.value || '';

      if (!buyerName || !buyerPhone || !cardNumber || !cardExpiry || !cardCvv || !cardName) {
        showToast('Please fill in all required fields');
        return;
      }

      // Basic card validation
      const cardDigits = cardNumber.replace(/\s/g, '');
      if (cardDigits.length < 13 || !/^\d+$/.test(cardDigits)) {
        showToast('Invalid card number');
        return;
      }

      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        showToast('Invalid expiry date (use MM/YY format)');
        return;
      }

      if (cardCvv.length < 3 || !/^\d+$/.test(cardCvv)) {
        showToast('Invalid CVV');
        return;
      }

      try {
        const itemId = currentViewedListing._id || currentViewedListing.id;
        const sellerId = currentViewedListing.seller?._id || currentViewedListing.seller?.id;
        const itemLocation = currentViewedListing.location || 'Campus';

        // Show processing toast
        showToast('Processing payment...');

        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mark item as sold via purchase endpoint (buyer can do this)
        await api.purchaseItem(itemId);

        // Send automatic message to seller about the purchase
        try {
          const purchaseMessage = `🎉 ITEM PURCHASED!\n\nBuyer Details:\n👤 Name: ${buyerName}\n📱 Phone: ${buyerPhone}\n📍 Pickup at: ${itemLocation}\n\nThe buyer has completed payment. Please contact them to arrange pickup at the item location.`;
          await api.sendMessage(sellerId, purchaseMessage, itemId);
        } catch (msgErr) {
          console.error('Failed to send purchase notification:', msgErr);
          // Don't fail the whole transaction if message fails
        }

        // Track purchase locally
        const purchaseRecord = {
          itemId: itemId,
          itemTitle: currentViewedListing.title,
          itemPrice: currentViewedListing.price,
          itemImage: currentViewedListing.imageUrl,
          sellerName: currentViewedListing.seller?.name,
          sellerId: sellerId,
          buyerName: buyerName,
          buyerPhone: buyerPhone,
          pickupLocation: itemLocation,
          purchaseDate: new Date().toISOString(),
          cardLastFour: cardDigits.slice(-4)
        };

        // Save to localStorage
        const purchases = JSON.parse(localStorage.getItem('myPurchases') || '[]');
        purchases.unshift(purchaseRecord); // Add to beginning
        localStorage.setItem('myPurchases', JSON.stringify(purchases));

        // Track seller notification (so seller sees popup on next login)
        const sellerNotifications = JSON.parse(localStorage.getItem('sellerNotifications') || '{}');
        if (!sellerNotifications[sellerId]) {
          sellerNotifications[sellerId] = [];
        }
        sellerNotifications[sellerId].push({
          ...purchaseRecord,
          notifiedAt: null,
          createdAt: purchaseRecord.purchaseDate
        });
        localStorage.setItem('sellerNotifications', JSON.stringify(sellerNotifications));

        // Close payment modal
        closeModal('payment');
        paymentForm.reset();

        // Show success modal
        showPaymentSuccessModal(currentViewedListing, cardDigits.slice(-4));

        // Reload items
        await loadItems();
      } catch (err) {
        console.error('Payment error:', err);
        showToast('Payment failed: ' + (err.message || 'Unknown error'));
      }
    });
  }

  // Payment Success Modal function
  function showPaymentSuccessModal(item, lastFourDigits) {
    const successModal = document.getElementById('payment-success-modal');
    const successDetails = document.getElementById('payment-success-details');

    if (successDetails) {
      successDetails.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-3);">
          <img src="${item.imageUrl || 'https://placehold.co/60x60/ccc/000?text=Item'}" 
               alt="${escapeHtml(item.title)}"
               style="width: 60px; height: 60px; border-radius: var(--radius-lg); object-fit: cover; border: 2px solid var(--success-200);">
          <div style="flex: 1; text-align: left;">
            <div style="font-weight: 600; color: var(--gray-900); margin-bottom: var(--space-1);">
              ${escapeHtml(item.title)}
            </div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--success-700);">
              ₹${item.price}
            </div>
          </div>
        </div>
        <div style="padding-top: var(--space-3); border-top: 2px solid rgba(255,255,255,0.6); text-align: center;">
          <div style="font-size: 0.875rem; color: var(--text-secondary);">
            Paid with card ****${lastFourDigits}
          </div>
        </div>
      `;
    }

    if (successModal) {
      successModal.style.display = 'block';
      document.body.style.overflow = 'hidden';

      // Auto-close after 4 seconds
      setTimeout(() => {
        successModal.style.display = 'none';
        document.body.style.overflow = 'auto';
      }, 4000);

      // Allow manual close
      successModal.onclick = (e) => {
        if (e.target === successModal) {
          successModal.style.display = 'none';
          document.body.style.overflow = 'auto';
        }
      };
    }
  }

  // Card input formatting
  const cardNumberInput = document.getElementById('payment-card-number');
  const cardExpiryInput = document.getElementById('payment-card-expiry');

  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\s/g, '');
      value = value.replace(/\D/g, '');
      let formatted = '';
      for (let i = 0; i < value.length && i < 16; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += value[i];
      }
      e.target.value = formatted;
    });
  }

  if (cardExpiryInput) {
    cardExpiryInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        e.target.value = value.slice(0, 2) + '/' + value.slice(2, 4);
      } else {
        e.target.value = value;
      }
    });
  }













  // Buy Now button handler
  if (detailBuyBtn) {
    detailBuyBtn.addEventListener('click', () => {
      if (currentViewedListing) {
        showPaymentModal(currentViewedListing);
      }
    });
  }

  // Refresh chat button handler
  if (refreshChatBtn) {
    refreshChatBtn.addEventListener('click', async () => {
      if (currentChatItem && currentChatRecipient) {
        const itemId = currentChatItem._id || currentChatItem.id;
        await loadConversation(itemId, currentChatRecipient);
        showToast('Messages refreshed');
      }
    });
  }


  // My Purchases button handler
  const myPurchasesBtn = document.getElementById('my-purchases-btn');
  if (myPurchasesBtn) {
    myPurchasesBtn.addEventListener('click', () => {
      renderMyPurchases();
      openModal('purchases');
    });
  }

  // My Sold Items button handler
  const mySoldItemsBtn = document.getElementById('my-sold-items-btn');
  if (mySoldItemsBtn) {
    mySoldItemsBtn.addEventListener('click', async () => {
      await renderMySoldItems();
      openModal('sold-items');
    });
  }

  // ==================== PURCHASE HISTORY ====================

  // Render My Purchases
  function renderMyPurchases() {
    const purchasesGrid = document.getElementById('purchases-grid');
    if (!purchasesGrid) return;

    const purchases = JSON.parse(localStorage.getItem('myPurchases') || '[]');

    if (purchases.length === 0) {
      purchasesGrid.innerHTML = '<p class="no-listings-message">You haven\'t purchased anything yet.</p>';
      return;
    }

    purchasesGrid.innerHTML = purchases.map(purchase => `
      <div class="listing-card" style="opacity: 1; transform: none;">
        <div class="availability-badge sold">Purchased</div>
        <div class="listing-card-image">
          ${purchase.itemImage ? `<img src="${purchase.itemImage}" alt="${escapeHtml(purchase.itemTitle)}" onerror="this.style.display='none'">` : ''}
        </div>
        <div class="listing-card-content">
          <h3 class="listing-card-title">${escapeHtml(purchase.itemTitle)}</h3>
          <p class="listing-card-price">₹${purchase.itemPrice}</p>
          <p class="listing-card-location" style="font-size: 0.875rem; color: var(--text-secondary);">
            Purchased on: ${new Date(purchase.purchaseDate).toLocaleDateString()}
          </p>
          <div style="margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--gray-200);">
            <p style="font-size: 0.875rem; margin-bottom: var(--space-1);"><strong>Seller:</strong> ${escapeHtml(purchase.sellerName)}</p>
            <p style="font-size: 0.875rem; margin-bottom: var(--space-1);"><strong>Pickup:</strong> ${escapeHtml(purchase.pickupLocation)}</p>
            <p style="font-size: 0.875rem; color: var(--text-tertiary);">Card: ****${purchase.cardLastFour}</p>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Render My Sold Items
  async function renderMySoldItems() {
    const soldItemsGrid = document.getElementById('sold-items-grid');
    if (!soldItemsGrid) return;

    const currentUser = api.getCurrentUser();
    if (!currentUser) {
      soldItemsGrid.innerHTML = '<p class="no-listings-message">Please login to view your sold items.</p>';
      return;
    }

    try {
      // Fetch ALL items from database including sold ones
      const result = await api.listItems({ includeStatus: 'ALL' });
      const allItems = result.items || [];

      // Filter for sold items by this user
      const soldItems = allItems.filter(item => {
        const sellerId = item.seller?._id || item.seller?.id;
        return sellerId === currentUser.id && item.availabilityStatus === 'SOLD';
      });

      if (soldItems.length === 0) {
        soldItemsGrid.innerHTML = '<p class="no-listings-message">You haven\'t sold anything yet.</p>';
        return;
      }

      // Try to get buyer info from localStorage purchases
      const allPurchases = JSON.parse(localStorage.getItem('myPurchases') || '[]');

      soldItemsGrid.innerHTML = soldItems.map(item => {
        // Try to find matching purchase record for buyer info
        const purchaseInfo = allPurchases.find(p => p.itemId === (item._id || item.id));

        return `
        <div class="listing-card sold-out" style="opacity: 1; transform: none;">
          <div class="availability-badge sold">Sold</div>
          <div class="listing-card-image">
            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${escapeHtml(item.title)}" onerror="this.style.display='none'">` : ''}
          </div>
          <div class="listing-card-content">
            <h3 class="listing-card-title">${escapeHtml(item.title)}</h3>
            <p class="listing-card-price">₹${item.price}</p>
            ${purchaseInfo ? `
              <div style="margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--gray-200);">
                <p style="font-size: 0.875rem; margin-bottom: var(--space-1); color: var(--success-600);"><strong>✓ Buyer Info:</strong></p>
                <p style="font-size: 0.875rem; margin-bottom: var(--space-1);">👤 ${escapeHtml(purchaseInfo.buyerName)}</p>
                <p style="font-size: 0.875rem; margin-bottom: var(--space-1);">📱 ${escapeHtml(purchaseInfo.buyerPhone)}</p>
                <p style="font-size: 0.875rem;">📍 ${escapeHtml(purchaseInfo.pickupLocation)}</p>
              </div>
            ` : '<p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: var(--space-2);">Buyer details not available</p>'}
          </div>
        </div>
      `;
      }).join('');
    } catch (err) {
      console.error('Error loading sold items:', err);
      soldItemsGrid.innerHTML = '<p class="no-listings-message">Error loading sold items. Please try again.</p>';
    }
  }

  // ==================== SELLER NOTIFICATIONS ====================

  // Check and show seller notifications
  function checkSellerNotifications() {
    const currentUser = api.getCurrentUser();
    if (!currentUser) return;

    const sellerNotifications = JSON.parse(localStorage.getItem('sellerNotifications') || '{}');
    const userNotifications = sellerNotifications[currentUser.id] || [];

    // Filter unread notifications
    const unreadNotifications = userNotifications.filter(n => !n.notifiedAt);

    if (unreadNotifications.length > 0) {
      // Show the most recent purchase
      const latestPurchase = unreadNotifications[0];
      showSellerNotification(latestPurchase);

      // Mark as notified
      sellerNotifications[currentUser.id] = userNotifications.map(n => {
        if (!n.notifiedAt) {
          return { ...n, notifiedAt: new Date().toISOString() };
        }
        return n;
      });
      localStorage.setItem('sellerNotifications', JSON.stringify(sellerNotifications));
    }
  }

  // Show seller notification modal
  function showSellerNotification(purchaseInfo) {
    const modal = document.getElementById('seller-notification-modal');
    const content = document.getElementById('seller-notification-content');

    if (!modal || !content) return;

    content.innerHTML = `
      <div style="text-align: center; margin-bottom: var(--space-4);">
        <img src="${purchaseInfo.itemImage || 'https://placehold.co/120x120/ccc/000?text=Item'}" 
             alt="${escapeHtml(purchaseInfo.itemTitle)}"
             style="width: 120px; height: 120px; border-radius: var(--radius-xl); object-fit: cover; border: 3px solid var(--success-200); margin-bottom: var(--space-3);">
        <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: var(--space-1);">
          ${escapeHtml(purchaseInfo.itemTitle)}
        </h3>
        <p style="font-size: 1.5rem; font-weight: 800; color: var(--success-600);">
          ₹${purchaseInfo.itemPrice}
        </p>
      </div>
      
      <div style="border-top: 2px solid var(--gray-200); padding-top: var(--space-4);">
        <h4 style="font-size: 0.875rem; font-weight: 700; color: var(--text-secondary); margin-bottom: var(--space-3); text-transform: uppercase;">
          👤 Buyer Information
        </h4>
        <div style="display: grid; gap: var(--space-2);">
          <div>
            <strong style="color: var(--text-secondary); font-size: 0.875rem;">Name:</strong>
            <p style="margin: 0; font-size: 1rem;">${escapeHtml(purchaseInfo.buyerName)}</p>
          </div>
          <div>
            <strong style="color: var(--text-secondary); font-size: 0.875rem;">Phone:</strong>
            <p style="margin: 0; font-size: 1rem;">${escapeHtml(purchaseInfo.buyerPhone)}</p>
          </div>
          <div>
            <strong style="color: var(--text-secondary); font-size: 0.875rem;">Pickup Location:</strong>
            <p style="margin: 0; font-size: 1rem;">${escapeHtml(purchaseInfo.pickupLocation)}</p>
          </div>
        </div>
      </div>

      <div style="border-top: 2px solid var(--gray-200); padding-top: var(--space-4); margin-top: var(--space-4);">
        <h4 style="font-size: 0.875rem; font-weight: 700; color: var(--text-secondary); margin-bottom: var(--space-2); text-transform: uppercase;">
          💳 Payment Details
        </h4>
        <div style="display: grid; gap: var(--space-2);">
          <div>
            <strong style="color: var(--text-secondary); font-size: 0.875rem;">Purchased:</strong>
            <p style="margin: 0; font-size: 0.875rem;">${new Date(purchaseInfo.purchaseDate).toLocaleString()}</p>
          </div>
          <div>
            <strong style="color: var(--text-secondary); font-size: 0.875rem;">Payment Method:</strong>
            <p style="margin: 0; font-size: 0.875rem;">Card ending in ****${purchaseInfo.cardLastFour}</p>
          </div>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, var(--success-50), var(--accent-50)); padding: var(--space-3); border-radius: var(--radius-lg); margin-top: var(--space-4); border: 2px solid var(--success-200);">
        <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary); text-align: center;">
          💬 The buyer has your contact details. Please arrange pickup soon!
        </p>
      </div>
    `;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  // ==================== INITIALIZATION ====================
  updateAuthUI();
  await loadItems();
});
