/* public/app.js
   Frontend integration with backend API for CampusBay
   - Expects backend API at same origin:
     POST /api/auth/login
     POST /api/auth/register
     GET  /api/items
     POST /api/items   (multipart/form-data, field name "image")
*/

document.addEventListener('DOMContentLoaded', () => {
  // -----------------------------
  // Element references (safe lookups)
  // -----------------------------
  const listingsGrid = document.getElementById('listings-grid');

  const searchInput = document.getElementById('search-input');
  const priceMinInput = document.getElementById('price-min');
  const priceMaxInput = document.getElementById('price-max');
  const categoryCheckboxes = document.querySelectorAll('.category-filter');

  // Auth & nav
  const navLoggedIn = document.getElementById('nav-logged-in');
  const navLoggedOut = document.getElementById('nav-logged-out');
  const welcomeMsg = document.getElementById('welcome-msg');

  // Forms and buttons
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const createListingForm = document.getElementById('create-listing-form');
  const createListingBtnLoggedOut = document.getElementById('create-listing-btn-logged-out');
  const createListingBtnLoggedIn = document.getElementById('create-listing-btn-logged-in');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const demoLoginBtn = document.getElementById('demo-login-btn');
  const savedItemsBtn = document.getElementById('saved-items-btn');

  // Modals map
  const modals = {
    login: document.getElementById('login-modal'),
    create: document.getElementById('create-listing-modal'),
    chat: document.getElementById('chat-modal'),
    detail: document.getElementById('listing-detail-modal'),
    saved: document.getElementById('saved-items-modal')
  };

  // Toast
  const toast = document.getElementById('toast');

  // Detail modal elements
  const detailTitle = document.getElementById('detail-modal-title');
  const detailImg = document.getElementById('detail-modal-img-src');
  const detailPrice = document.getElementById('detail-modal-price');
  const detailLocation = document.getElementById('detail-modal-location');
  const detailDescription = document.getElementById('detail-modal-description');
  const detailSellerName = document.getElementById('detail-modal-seller-name');
  const detailChatBtn = document.getElementById('detail-modal-chat-btn');
  const detailSaveBtn = document.getElementById('detail-modal-save-btn');

  // Saved items grid
  const savedItemsGrid = document.getElementById('saved-items-grid');

  // -----------------------------
  // State
  // -----------------------------
  let cachedListings = []; // items from server
  let savedItems = new Set(); // saved item ids (client-only)
  let currentViewedListing = null;

  // -----------------------------
  // Utility helpers
  // -----------------------------
  const API_BASE = ''; // same origin

  function showToast(msg) {
    if (!toast) return console.log('toast:', msg);
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2400);
  }

  function getToken() {
    return localStorage.getItem('token');
  }
  function setToken(t) {
    if (t) localStorage.setItem('token', t);
    else localStorage.removeItem('token');
  }
  function getUser() {
    const u = localStorage.getItem('user');
    try { return u ? JSON.parse(u) : null; } catch { return null; }
  }
  function setUser(user) {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }

  // Safe DOM hide/show
  function showElement(el) { if (!el) return; el.style.display = ''; }
  function hideElement(el) { if (!el) return; el.style.display = 'none'; }

  // Modal helpers (simple display toggles)
  function openModal(id) {
    const m = modals[id];
    if (m) m.style.display = 'block';
  }
  function closeModal(id) {
    const m = modals[id];
    if (m) m.style.display = 'none';
  }

  // -----------------------------
  // API functions
  // -----------------------------
  async function apiFetchJson(url, opts = {}) {
    const res = await fetch(url, opts);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await res.json();
      if (!res.ok) throw { status: res.status, body };
      return body;
    } else {
      // fallback for non-json responses
      const txt = await res.text();
      if (!res.ok) throw { status: res.status, body: txt };
      return txt;
    }
  }

  async function apiLogin(email, password) {
    return apiFetchJson(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  }

  async function apiRegister(name, email, password) {
    return apiFetchJson(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
  }

  async function apiGetItems(query = '') {
    // query string optional
    const url = `${API_BASE}/api/items${query ? '?' + query : ''}`;
    return apiFetchJson(url, { method: 'GET' });
  }

  async function apiCreateItem(formData) {
    const token = getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/api/items`, {
      method: 'POST',
      headers, // DO NOT set Content-Type (browser will)
      body: formData
    });
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      if (!res.ok) throw { status: res.status, body };
      return body;
    } else {
      const txt = await res.text();
      if (!res.ok) throw { status: res.status, body: txt };
      return txt;
    }
  }

  // -----------------------------
  // Rendering
  // -----------------------------
  function createCardNode(listing) {
    const id = listing._id || listing.id || '';
    const container = document.createElement('article');
    container.className = 'listing-card';
    container.dataset.listingId = id;

    const imgSrc = listing.imageUrl ? listing.imageUrl : listing.image || 'https://placehold.co/400x300/cccccc/000?text=No+Image';
    container.innerHTML = `
      <div class="listing-card-image">
        <img src="${imgSrc}" alt="${escapeHtml(listing.title||'')}" onerror="this.parentElement.innerHTML='Image'">
      </div>
      <div class="listing-card-content">
        <h3 class="listing-card-title">${escapeHtml(listing.title||'Untitled')}</h3>
        <p class="listing-card-price">&#8377;${listing.price ?? 0}</p>
        <p class="listing-card-location">${escapeHtml(listing.location||'')}</p>
        <div class="listing-card-action">
          <button class="btn btn-primary chat-btn">Message Seller</button>
        </div>
      </div>`;
    return container;
  }

  function renderListings(listings) {
    if (!listingsGrid) return;
    listingsGrid.innerHTML = '';
    if (!listings || listings.length === 0) {
      listingsGrid.innerHTML = '<p class="no-listings-message">No listings found matching your criteria.</p>';
      return;
    }
    listings.forEach(item => {
      const node = createCardNode(item);
      listingsGrid.appendChild(node);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  // -----------------------------
  // Filters (client-side)
  // -----------------------------
  function applyClientFilters(allListings) {
    let filtered = Array.isArray(allListings) ? allListings.slice() : [];

    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (q) {
      filtered = filtered.filter(l => ((l.title||'').toLowerCase().includes(q) || (l.location||'').toLowerCase().includes(q)));
    }
    const min = priceMinInput ? parseFloat(priceMinInput.value) : NaN;
    const max = priceMaxInput ? parseFloat(priceMaxInput.value) : NaN;
    if (!isNaN(min)) filtered = filtered.filter(l => Number(l.price) >= min);
    if (!isNaN(max)) filtered = filtered.filter(l => Number(l.price) <= max);

    const checkedCats = [];
    categoryCheckboxes && categoryCheckboxes.forEach(cb => { if (cb.checked) checkedCats.push(cb.value); });
    if (checkedCats.length) filtered = filtered.filter(l => checkedCats.includes(l.category));

    return filtered;
  }

  // -----------------------------
  // Load initial items
  // -----------------------------
  async function loadItemsAndRender() {
    try {
      const res = await apiGetItems();
      // expecting { items: [...] } as per backend
      cachedListings = Array.isArray(res.items) ? res.items : (res.items || []);
      renderListings(applyClientFilters(cachedListings));
    } catch (err) {
      console.error('Failed load items', err);
      showToast('Failed to load items from server');
      cachedListings = [];
      renderListings([]);
    }
  }

  // -----------------------------
  // Auth UI handling
  // -----------------------------
  function updateAuthUI() {
    const token = getToken();
    if (token) {
      // show logged-in nav
      showElement(navLoggedIn);
      hideElement(navLoggedOut);
      const user = getUser();
      welcomeMsg && (welcomeMsg.innerText = `Welcome, ${user?.name ?? 'User'}!`);
    } else {
      showElement(navLoggedOut);
      hideElement(navLoggedIn);
      welcomeMsg && (welcomeMsg.innerText = 'Welcome!');
    }
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setToken(null);
      setUser(null);
      savedItems.clear();
      updateSavedCount();
      updateAuthUI();
      showToast('Logged out');
    });
  }

  // Demo login button (if present)
  if (demoLoginBtn) {
    demoLoginBtn.addEventListener('click', async () => {
      try {
        // demo user on backend must exist; adjust credentials if needed
        const demoEmail = 'abhilash@bmsce.ac.in';
        const demoPassword = 'demo123'; // if your backend demo uses a different pw, change
        const res = await apiLogin(demoEmail, demoPassword);
        setToken(res.token);
        setUser(res.user);
        updateAuthUI();
        showToast('Logged in (demo)');
      } catch (err) {
        console.error('Demo login failed', err);
        showToast('Demo login failed');
      }
    });
  }

  // Login form
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const ret = await apiLogin(email, password);
        setToken(ret.token);
        setUser(ret.user);
        updateAuthUI();
        // close modal if exists
        closeModal('login');
        showToast('Logged in');
        // refresh listings if needed
        await loadItemsAndRender();
      } catch (err) {
        console.error('Login error', err);
        const loginErrorMsg = document.getElementById('login-error-msg');
        if (loginErrorMsg) loginErrorMsg.style.display = 'block';
        showToast(err?.body?.error || 'Login failed');
      }
    });
  }

  // Register form
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm-password').value;
        const registerErrorMsg = document.getElementById('register-error-msg');
        if (password !== confirm) {
          if (registerErrorMsg) { registerErrorMsg.innerText = 'Passwords do not match.'; registerErrorMsg.style.display = 'block'; }
          return;
        }
        const ret = await apiRegister(name, email, password);
        setToken(ret.token);
        setUser(ret.user);
        updateAuthUI();
        closeModal('login');
        showToast('Account created');
        await loadItemsAndRender();
      } catch (err) {
        console.error('Register error', err);
        const registerErrorMsg = document.getElementById('register-error-msg');
        if (registerErrorMsg) { registerErrorMsg.innerText = err?.body?.error || 'Register failed'; registerErrorMsg.style.display = 'block'; }
      }
    });
  }

  // -----------------------------
  // Create listing
  // -----------------------------
  if (createListingForm) {
    createListingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        // Build FormData with server-expected field names
        const fd = new FormData();
        const title = document.getElementById('listing-title').value;
        const price = document.getElementById('listing-price').value;
        const category = document.getElementById('listing-category').value;
        const location = document.getElementById('listing-location').value;
        const description = document.getElementById('listing-description').value;
        const imagesInput = document.getElementById('images');
        fd.append('title', title);
        fd.append('price', price);
        fd.append('category', category);
        fd.append('location', location);
        fd.append('description', description);
        if (imagesInput && imagesInput.files && imagesInput.files.length) {
          // server expects field name "image"
          fd.append('image', imagesInput.files[0]);
        }

        const res = await apiCreateItem(fd);
        // if API returned { item: ... }
        if (res && res.item) {
          // add to cached and rerender (newest first)
          cachedListings.unshift(res.item);
          renderListings(applyClientFilters(cachedListings));
          createListingForm.reset();
          closeModal('create');
          showToast('Listing created');
        } else {
          showToast('Listing created');
          await loadItemsAndRender();
        }
      } catch (err) {
        console.error('Create item failed', err);
        showToast(err?.body?.error || 'Failed to create listing');
      }
    });
  }

  // -----------------------------
  // Saved items logic (client-only)
  // -----------------------------
  function updateSavedCount() {
    if (!savedItemsBtn) return;
    savedItemsBtn.innerHTML = `&#9829; Saved (${savedItems.size})`;
  }

  if (savedItemsBtn) {
    savedItemsBtn.addEventListener('click', () => {
      if (!getToken()) {
        closeModal('detail');
        openModal('login');
        return;
      }
      renderSavedItems();
      openModal('saved');
    });
  }

  function renderSavedItems() {
    if (!savedItemsGrid) return;
    if (savedItems.size === 0) {
      savedItemsGrid.innerHTML = '<p class="saved-item-empty">You have no saved items.</p>';
      return;
    }
    const items = cachedListings.filter(i => savedItems.has(i._id || i.id));
    savedItemsGrid.innerHTML = '';
    items.forEach(item => {
      const html = document.createElement('div');
      html.className = 'saved-item-card';
      html.dataset.listingId = item._id || item.id;
      html.innerHTML = `
        <img src="${item.imageUrl||item.image||'https://placehold.co/100x100'}" class="saved-item-img" />
        <div class="saved-item-info">
          <div class="saved-item-title">${escapeHtml(item.title)}</div>
          <div class="saved-item-price">&#8377;${item.price}</div>
        </div>
      `;
      savedItemsGrid.appendChild(html);
    });
  }

  // -----------------------------
  // Listing click handling (show detail modal / chat)
  // -----------------------------
  if (listingsGrid) {
    listingsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.listing-card');
      if (!card) return;
      const id = card.dataset.listingId;
      if (!id) return;
      // If chat button clicked
      if (e.target.classList.contains('chat-btn')) {
        const title = card.querySelector('.listing-card-title')?.innerText || 'Chat';
        openModal('chat');
        const chatTitle = document.getElementById('chat-modal-title');
        if (chatTitle) chatTitle.innerText = `Chat: ${title}`;
        return;
      }
      // otherwise show detail modal
      showDetailById(id);
    });
  }

  async function showDetailById(id) {
    try {
      // find in cache
      let found = cachedListings.find(x => (x._id||x.id) === id);
      if (!found) {
        // fetch single from backend if route exists
        const body = await apiFetchJson(`${API_BASE}/api/items/${id}`, { method: 'GET' });
        found = body.item || body;
      }
      if (!found) return;
      currentViewedListing = found;
      detailTitle && (detailTitle.innerText = found.title || 'Listing');
      detailImg && (detailImg.src = found.imageUrl || found.image || 'https://placehold.co/600x400');
      detailPrice && (detailPrice.innerHTML = `&#8377;${found.price || 0}`);
      detailLocation && (detailLocation.innerText = found.location || '');
      detailDescription && (detailDescription.innerText = found.description || '');
      detailSellerName && (detailSellerName.innerText = `Seller: ${found.seller?.name || found.seller || 'Unknown'}`);
      // Save button state
      if (detailSaveBtn) {
        if (savedItems.has(found._id || found.id)) {
          detailSaveBtn.innerText = '✓ Saved';
          detailSaveBtn.disabled = true;
          detailSaveBtn.classList.add('btn-success');
          detailSaveBtn.classList.remove('btn-secondary');
        } else {
          detailSaveBtn.innerText = 'Save for Later';
          detailSaveBtn.disabled = false;
          detailSaveBtn.classList.remove('btn-success');
          detailSaveBtn.classList.add('btn-secondary');
        }
      }
      openModal('detail');
    } catch (err) {
      console.error('Failed to show detail', err);
      showToast('Failed to load listing details');
    }
  }

  // detail save button
  if (detailSaveBtn) {
    detailSaveBtn.addEventListener('click', () => {
      if (!currentViewedListing) return;
      if (!getToken()) {
        closeModal('detail');
        openModal('login');
        return;
      }
      savedItems.add(currentViewedListing._id || currentViewedListing.id);
      updateSavedCount();
      detailSaveBtn.innerText = '✓ Saved';
      detailSaveBtn.disabled = true;
      detailSaveBtn.classList.add('btn-success');
      showToast('Saved for later');
    });
  }

  // detail chat button opens chat modal
  if (detailChatBtn) {
    detailChatBtn.addEventListener('click', () => {
      closeModal('detail');
      openModal('chat');
      const chatTitle = document.getElementById('chat-modal-title');
      if (chatTitle) chatTitle.innerText = `Chat: ${currentViewedListing?.title || 'Seller'}`;
    });
  }

  // -----------------------------
  // Wire search/filter UI
  // -----------------------------
  function onFiltersChanged() {
    renderListings(applyClientFilters(cachedListings));
  }
  searchInput && searchInput.addEventListener('input', onFiltersChanged);
  priceMinInput && priceMinInput.addEventListener('input', onFiltersChanged);
  priceMaxInput && priceMaxInput.addEventListener('input', onFiltersChanged);
  categoryCheckboxes && categoryCheckboxes.forEach(cb => cb.addEventListener('change', onFiltersChanged));

  // -----------------------------
  // Modal close buttons (X buttons in markup have data-modal-id attribute)
  // -----------------------------
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-modal-id');
      if (id) closeModal(id);
    });
  });
  window.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });

  // -----------------------------
  // Initial setup: nav button wiring
  // -----------------------------
  if (loginBtn) loginBtn.addEventListener('click', () => openModal('login'));
  if (createListingBtnLoggedOut) createListingBtnLoggedOut.addEventListener('click', () => openModal('login'));
  if (createListingBtnLoggedIn) createListingBtnLoggedIn.addEventListener('click', () => openModal('create'));

  // -----------------------------
  // Initial load
  // -----------------------------
  updateAuthUI();
  updateSavedCount();
  loadItemsAndRender();
});

// app.js
// Place this file in your frontend public folder and include <script src="app.js"></script> at the end of marketplace.html

document.addEventListener('DOMContentLoaded', () => {
  /***** Config *****/
  const API_BASE = ''; // same origin; change to 'http://localhost:4000' if serving frontend separately

  /***** DOM shortcuts *****/
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

  // detail modal elements
  const detailTitle = document.getElementById('detail-modal-title');
  const detailImg = document.getElementById('detail-modal-img-src');
  const detailPrice = document.getElementById('detail-modal-price');
  const detailLocation = document.getElementById('detail-modal-location');
  const detailDescription = document.getElementById('detail-modal-description');
  const detailSellerName = document.getElementById('detail-modal-seller-name');
  const detailChatBtn = document.getElementById('detail-modal-chat-btn');
  const detailSaveBtn = document.getElementById('detail-modal-save-btn');

  const savedItemsGrid = document.getElementById('saved-items-grid');

  /***** State *****/
  let cachedListings = []; // holds items from server
  let savedItems = new Set(); // client-only saved ids
  let currentViewedListing = null;

  /***** Utility helpers *****/
  function showToast(msg) {
    if (!toast) { console.log(msg); return; }
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2500);
  }

  function setToken(token) {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }
  function getToken() { return localStorage.getItem('token'); }

  function setUser(u) { if (u) localStorage.setItem('user', JSON.stringify(u)); else localStorage.removeItem('user'); }
  function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }

  function openModal(id) { if (modals[id]) modals[id].style.display = 'block'; }
  function closeModal(id) { if (modals[id]) modals[id].style.display = 'none'; }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  async function apiFetchJson(url, opts = {}) {
    const res = await fetch(url, opts);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      if (!res.ok) throw body;
      return body;
    } else {
      const text = await res.text();
      if (!res.ok) throw text;
      return text;
    }
  }

  /***** API wrappers (adjust if your backend shape differs) *****/
  async function fetchItemsFromServer() {
    try {
      const body = await apiFetchJson(`${API_BASE}/api/items`);
      // Accept either an array or { items: [...] }
      return Array.isArray(body) ? body : (body.items || []);
    } catch (err) {
      console.error('fetch items failed', err);
      showToast('Failed to load listings');
      return [];
    }
  }
  async function loginApi(email, password) {
    return apiFetchJson(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
  }
  async function registerApi(name, email, password) {
    return apiFetchJson(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name, email, password })
    });
  }
  async function createItemApi(formData) {
    const token = getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    // DO NOT set Content-Type when sending FormData
    const res = await fetch(`${API_BASE}/api/items`, {
      method: 'POST',
      headers,
      body: formData
    });
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      if (!res.ok) throw body;
      return body;
    } else {
      const text = await res.text();
      if (!res.ok) throw text;
      return text;
    }
  }

  /***** Rendering & filters *****/
  function createCard(listing) {
    const id = listing._id || listing.id || '';
    const img = listing.imageUrl || listing.image || 'https://placehold.co/400x300/cccccc/000?text=No+Image';
    const container = document.createElement('article');
    container.className = 'listing-card';
    container.dataset.listingId = id;
    container.innerHTML = `
      <div class="listing-card-image"><img src="${img}" alt="${escapeHtml(listing.title||'')}" onerror="this.parentElement.innerHTML='Image'"></div>
      <div class="listing-card-content">
        <h3 class="listing-card-title">${escapeHtml(listing.title||'Untitled')}</h3>
        <p class="listing-card-price">&#8377;${listing.price ?? 0}</p>
        <p class="listing-card-location">${escapeHtml(listing.location||'')}</p>
        <div class="listing-card-action">
          <button class="btn btn-primary chat-btn">Message Seller</button>
        </div>
      </div>`;
    return container;
  }

  function renderListings(listings) {
    if (!listingsGrid) return;
    listingsGrid.innerHTML = '';
    if (!listings || listings.length === 0) {
      listingsGrid.innerHTML = '<p class="no-listings-message">No listings found matching your criteria.</p>';
      return;
    }
    listings.forEach(l => listingsGrid.appendChild(createCard(l)));
  }

  function applyFilters(array) {
    let items = (array||[]).slice();
    const q = (searchInput?.value || '').trim().toLowerCase();
    if (q) items = items.filter(i => (i.title||'').toLowerCase().includes(q) || (i.location||'').toLowerCase().includes(q));
    const min = parseFloat(priceMinInput?.value); const max = parseFloat(priceMaxInput?.value);
    if (!isNaN(min)) items = items.filter(i => Number(i.price) >= min);
    if (!isNaN(max)) items = items.filter(i => Number(i.price) <= max);
    const checked = Array.from(categoryCheckboxes||[]).filter(c=>c.checked).map(c=>c.value);
    if (checked.length) items = items.filter(i => checked.includes(i.category));
    return items;
  }

  /***** Load initial data and UI state *****/
  async function loadInitial() {
    cachedListings = await fetchItemsFromServer();
    renderListings(applyFilters(cachedListings));
  }

  function updateAuthUI() {
    const token = getToken();
    if (token) {
      if (navLoggedOut) navLoggedOut.style.display = 'none';
      if (navLoggedIn) navLoggedIn.style.display = 'flex';
      const user = getUser();
      if (welcomeMsg) welcomeMsg.innerText = `Welcome, ${user?.name ?? 'User'}!`;
    } else {
      if (navLoggedOut) navLoggedOut.style.display = 'flex';
      if (navLoggedIn) navLoggedIn.style.display = 'none';
    }
  }

  /***** Event handlers *****/
  // Login submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email')?.value;
      const password = document.getElementById('login-password')?.value;
      try {
        const data = await loginApi(email, password);
        // Expecting { token, user }
        setToken(data.token);
        setUser(data.user);
        updateAuthUI();
        closeModal('login');
        showToast('Logged in');
        // refresh listings (maybe some are user-specific)
        cachedListings = await fetchItemsFromServer();
        renderListings(applyFilters(cachedListings));
      } catch (err) {
        console.error('login failed', err);
        const msg = document.getElementById('login-error-msg');
        if (msg) { msg.style.display = 'block'; msg.innerText = err?.error || 'Login failed'; }
        showToast('Login failed');
      }
    });
  }

  // Register submit
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name')?.value;
      const email = document.getElementById('register-email')?.value;
      const password = document.getElementById('register-password')?.value;
      const confirm = document.getElementById('register-confirm-password')?.value;
      const registerErrorMsg = document.getElementById('register-error-msg');
      if (password !== confirm) {
        if (registerErrorMsg) { registerErrorMsg.innerText = 'Passwords do not match.'; registerErrorMsg.style.display = 'block'; }
        return;
      }
      try {
        const data = await registerApi(name, email, password);
        setToken(data.token);
        setUser(data.user);
        updateAuthUI();
        closeModal('login');
        showToast('Registered and logged in');
        cachedListings = await fetchItemsFromServer();
        renderListings(applyFilters(cachedListings));
      } catch (err) {
        console.error('register failed', err);
        if (registerErrorMsg) { registerErrorMsg.innerText = err?.error || 'Register failed'; registerErrorMsg.style.display = 'block'; }
        showToast('Register failed');
      }
    });
  }

  // Create listing submit
  if (createListingForm) {
    createListingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData();
      fd.append('title', document.getElementById('listing-title')?.value || '');
      fd.append('price', document.getElementById('listing-price')?.value || 0);
      fd.append('category', document.getElementById('listing-category')?.value || '');
      fd.append('location', document.getElementById('listing-location')?.value || '');
      fd.append('description', document.getElementById('listing-description')?.value || '');
      const files = document.getElementById('images')?.files;
      if (files && files[0]) fd.append('image', files[0]); // backend expected field 'image'
      try {
        const res = await createItemApi(fd);
        // prefer backend to return created item as res.item
        if (res && res.item) {
          cachedListings.unshift(res.item);
          renderListings(applyFilters(cachedListings));
        } else {
          // fallback: reload everything
          cachedListings = await fetchItemsFromServer();
          renderListings(applyFilters(cachedListings));
        }
        createListingForm.reset();
        closeModal('create');
        showToast('Listing created');
      } catch (err) {
        console.error('create listing failed', err);
        showToast(err?.error || 'Failed to create listing');
      }
    });
  }

  // Listing click (detail / chat)
  if (listingsGrid) {
    listingsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.listing-card');
      if (!card) return;
      const id = card.dataset.listingId;
      if (!id) return;
      // Message button clicked
      if (e.target.classList.contains('chat-btn')) {
        const title = card.querySelector('.listing-card-title')?.innerText || 'Chat';
        openModal('chat');
        const chatTitle = document.getElementById('chat-modal-title');
        if (chatTitle) chatTitle.innerText = `Chat: ${title}`;
        return;
      }
      // Show detail from cache
      const found = cachedListings.find(it => (it._id || it.id) == id);
      if (found) {
        currentViewedListing = found;
        if (detailTitle) detailTitle.innerText = found.title || 'Listing';
        if (detailImg) detailImg.src = found.imageUrl || found.image || 'https://placehold.co/600x400';
        if (detailPrice) detailPrice.innerHTML = `&#8377;${found.price || 0}`;
        if (detailLocation) detailLocation.innerText = found.location || '';
        if (detailDescription) detailDescription.innerText = found.description || '';
        if (detailSellerName) detailSellerName.innerText = `Seller: ${found.seller?.name || found.seller || 'Unknown'}`;
        if (detailSaveBtn) {
          if (savedItems.has(found._id || found.id)) {
            detailSaveBtn.innerText = '✓ Saved'; detailSaveBtn.disabled = true; detailSaveBtn.classList.add('btn-success');
          } else {
            detailSaveBtn.innerText = 'Save for Later'; detailSaveBtn.disabled = false; detailSaveBtn.classList.remove('btn-success');
          }
        }
        openModal('detail');
      }
    });
  }

  // Save for later (client only)
  if (detailSaveBtn) {
    detailSaveBtn.addEventListener('click', () => {
      if (!currentViewedListing) return;
      if (!getToken()) { closeModal('detail'); openModal('login'); return; }
      savedItems.add(currentViewedListing._id || currentViewedListing.id);
      updateSavedCount();
      detailSaveBtn.innerText = '✓ Saved';
      detailSaveBtn.disabled = true;
      detailSaveBtn.classList.add('btn-success');
      showToast('Saved for later');
    });
  }

  function updateSavedCount() {
    if (!savedItemsBtn) return;
    savedItemsBtn.innerHTML = `&#9829; Saved (${savedItems.size})`;
  }

  if (savedItemsBtn) {
    savedItemsBtn.addEventListener('click', () => {
      if (!getToken()) { openModal('login'); return; }
      renderSavedItems();
      openModal('saved');
    });
  }

  function renderSavedItems() {
    if (!savedItemsGrid) return;
    if (savedItems.size === 0) {
      savedItemsGrid.innerHTML = '<p class="saved-item-empty">You have no saved items.</p>';
      return;
    }
    savedItemsGrid.innerHTML = '';
    const items = cachedListings.filter(i => savedItems.has(i._id || i.id));
    items.forEach(it => {
      const div = document.createElement('div');
      div.className = 'saved-item-card';
      div.dataset.listingId = it._id || it.id;
      div.innerHTML = `
        <img src="${it.imageUrl || it.image || 'https://placehold.co/100x100'}" class="saved-item-img">
        <div class="saved-item-info">
          <div class="saved-item-title">${escapeHtml(it.title)}</div>
          <div class="saved-item-price">&#8377;${it.price}</div>
        </div>`;
      savedItemsGrid.appendChild(div);
    });
  }

  // Close buttons for modals (X)
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-modal-id');
      if (id) closeModal(id);
    });
  });
  // Click outside modal to close
  window.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal')) e.target.style.display = 'none';
  });

  // Nav buttons
  loginBtn && loginBtn.addEventListener('click', () => openModal('login'));
  createListingBtnLoggedOut && createListingBtnLoggedOut.addEventListener('click', () => openModal('login'));
  createListingBtnLoggedIn && createListingBtnLoggedIn.addEventListener('click', () => openModal('create'));

  logoutBtn && logoutBtn.addEventListener('click', () => {
    setToken(null); setUser(null);
    savedItems.clear(); updateSavedCount();
    updateAuthUI();
    showToast('Logged out');
  });

  // Filters wiring
  searchInput && searchInput.addEventListener('input', () => renderListings(applyFilters(cachedListings)));
  priceMinInput && priceMinInput.addEventListener('input', () => renderListings(applyFilters(cachedListings)));
  priceMaxInput && priceMaxInput.addEventListener('input', () => renderListings(applyFilters(cachedListings)));
  categoryCheckboxes && categoryCheckboxes.forEach(cb => cb.addEventListener('change', () => renderListings(applyFilters(cachedListings))));

  /***** Boot *****/
  updateAuthUI();
  updateSavedCount();

  // load items
  (async function initLoad(){
    cachedListings = await fetchItemsFromServer();
    renderListings(applyFilters(cachedListings));
  })();
});
