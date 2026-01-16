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
    saved: document.getElementById('saved-items-modal')
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

  function updateAuthUI() {
    if (api.isLoggedIn()) {
      const user = api.getCurrentUser();
      if (navLoggedOut) navLoggedOut.style.display = 'none';
      if (navLoggedIn) navLoggedIn.style.display = 'flex';
      if (welcomeMsg) welcomeMsg.innerText = `Welcome, ${user.name}!`;
    } else {
      if (navLoggedOut) navLoggedOut.style.display = 'flex';
      if (navLoggedIn) navLoggedIn.style.display = 'none';
      savedItems.clear();
      updateSavedCount();
    }
  }

  function updateSavedCount() {
    if (savedItemsBtn) {
      savedItemsBtn.innerHTML = `&#9829; Saved (${savedItems.size})`;
    }
  }

  function openModal(id) {
    if (modals[id]) modals[id].style.display = 'block';
  }

  function closeModal(id) {
    if (modals[id]) modals[id].style.display = 'none';
  }

  // ==================== API CALLS ====================
  async function loadItems() {
    try {
      const result = await api.listItems();
      cachedListings = result.items || [];
      applyFilters();
    } catch (err) {
      console.error('Failed to load items:', err);
      showToast('Failed to load items. Check console.');
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
  function applyFilters() {
    let filtered = [...cachedListings];

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

    listings.forEach(item => {
      const card = document.createElement('article');
      card.className = 'listing-card';
      card.dataset.listingId = item._id || item.id;

      const imgSrc = item.imageUrl || 'https://placehold.co/400x300/cccccc/000?text=No+Image';
      const sellerName = item.seller?.name || 'Unknown Seller';
      const sellerVerified = item.seller?.verified ? '✓' : '';

      card.innerHTML = `
        <div class="listing-card-image">
          <img src="${imgSrc}" alt="${escapeHtml(item.title)}" 
               onerror="this.parentElement.innerHTML='Image'">
        </div>
        <div class="listing-card-content">
          <h3 class="listing-card-title">${escapeHtml(item.title)}</h3>
          <p class="listing-card-price">&#8377;${item.price}</p>
          <p class="listing-card-location">${escapeHtml(item.location || '')}</p>
          <div class="listing-card-action">
            <button class="btn btn-primary chat-btn">Message Seller</button>
          </div>
        </div>`;

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('chat-btn')) {
          e.stopPropagation();
          showChatModal(item);
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

    // Show delete button only if current user is the seller
    if (detailDeleteBtn) {
      const currentUser = api.getCurrentUser();
      const isSeller = currentUser && currentUser.id === (item.seller?._id || item.seller?.id);

      if (isSeller) {
        detailDeleteBtn.style.display = 'block';
        detailDeleteBtn.disabled = false;
      } else {
        detailDeleteBtn.style.display = 'none';
        detailDeleteBtn.disabled = true;
      }
    }

    openModal('detail');
  }

  function showChatModal(item) {
    if (chatModalTitle) chatModalTitle.innerText = `Chat about: ${item.title}`;
    if (chatWindow) {
      chatWindow.innerHTML = `
        <div class="msg msg-seller">Hi! Is this item still available?</div>
        <div class="msg msg-buyer">Yes, it is! Let's talk.</div>`;
    }
    openModal('chat');
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

  // Chat form
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = chatMessageInput?.value;
      if (!msg?.trim()) return;

      const msgDiv = document.createElement('div');
      msgDiv.className = 'msg msg-buyer';
      msgDiv.innerText = msg;
      chatWindow?.appendChild(msgDiv);
      chatWindow.scrollTop = chatWindow.scrollHeight;

      if (chatMessageInput) chatMessageInput.value = '';
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

  // Filter listeners
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (priceMinInput) priceMinInput.addEventListener('input', applyFilters);
  if (priceMaxInput) priceMaxInput.addEventListener('input', applyFilters);
  categoryCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));

  // Modal close buttons
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal-id');
      closeModal(modalId);
    });
  });

  // Click outside modal to close
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });

  // ==================== INITIALIZATION ====================
  updateAuthUI();
  await loadItems();
});
