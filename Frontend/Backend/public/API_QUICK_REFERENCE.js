/**
 * QUICK REFERENCE - CampusBay API Usage Examples
 * 
 * The global `api` object is available after api.js is loaded.
 * All methods are async and use Promises.
 */

// ============================================================================
// AUTHENTICATION
// ============================================================================

// Register new user
async function registerUser() {
  try {
    const result = await api.register(
      'Priya S.',                    // name
      'priya@bmsce.ac.in',          // email
      'securePassword123',          // password
      'BMSCE'                       // college
    );
    console.log('Registered:', result.user.name);
    console.log('Token:', result.token);
  } catch (err) {
    console.error('Registration failed:', err.message);
  }
}

// Login user
async function loginUser() {
  try {
    const result = await api.login(
      'abhilash@bmsce.ac.in',
      'password'
    );
    console.log('Logged in as:', result.user.name);
    // Token is automatically stored in localStorage
  } catch (err) {
    console.error('Login failed:', err.message);
  }
}

// Logout user
function logoutUser() {
  api.clearToken();
  console.log('Logged out');
}

// Check if logged in
if (api.isLoggedIn()) {
  console.log('User is logged in');
  const user = api.getCurrentUser();
  console.log('Current user:', user.name);
}

// ============================================================================
// LISTINGS / ITEMS
// ============================================================================

// Get all items (with filters)
async function getItems() {
  try {
    const result = await api.listItems({
      q: 'textbook',           // search query (optional)
      category: 'Books',        // category filter (optional)
      page: 1,                  // pagination (optional, default: 1)
      limit: 20                 // items per page (optional, default: 20)
    });
    console.log('Found items:', result.items);
  } catch (err) {
    console.error('Failed to load items:', err.message);
  }
}

// Get single item by ID
async function getItemDetails(itemId) {
  try {
    const result = await api.getItem(itemId);
    console.log('Item details:', result.item);
    console.log('Seller:', result.item.seller.name);
    console.log('Price:', result.item.price);
  } catch (err) {
    console.error('Failed to get item:', err.message);
  }
}

// Create new listing
async function createNewListing() {
  try {
    // Get image file from form input
    const imageFile = document.getElementById('image-input').files[0];
    
    const result = await api.createItem(
      'Engineering Data Structures Textbook',  // title
      'Third edition, used for 1 semester',    // description
      350,                                     // price
      'Books',                                 // category
      'CSE Block, BMSCE',                      // location
      imageFile                                // image file (optional)
    );
    
    console.log('Listing created:', result.item);
  } catch (err) {
    console.error('Failed to create listing:', err.message);
  }
}

// Create listing without image
async function createListingNoImage() {
  try {
    const result = await api.createItem(
      'Laptop Charger',
      '65W HP charger',
      900,
      'Electronics',
      'NGH 7',
      null  // no image
    );
    console.log('Listing created:', result.item);
  } catch (err) {
    console.error('Failed to create listing:', err.message);
  }
}

// Delete a listing (only seller can delete)
async function deleteListing(itemId) {
  try {
    const result = await api.deleteItem(itemId);
    console.log('Item deleted');
  } catch (err) {
    console.error('Failed to delete item:', err.message);
  }
}

// Mark item as sold/unsold (toggle availability)
async function toggleItemStatus(itemId) {
  try {
    const result = await api.toggleItemAvailability(itemId);
    console.log('Item availability toggled:', result.item.isAvailable);
  } catch (err) {
    console.error('Failed to toggle item:', err.message);
  }
}

// ============================================================================
// MESSAGING
// ============================================================================

// Get all messages/conversations
async function getAllMessages() {
  try {
    const result = await api.getMessages();
    console.log('All conversations:', result.messages);
    result.messages.forEach(msg => {
      console.log(`From ${msg.sender.name}: ${msg.text}`);
    });
  } catch (err) {
    console.error('Failed to get messages:', err.message);
  }
}

// Send message to another user about an item
async function sendMessageToSeller(recipientId, itemId, messageText) {
  try {
    const result = await api.sendMessage(
      recipientId,    // ID of the person receiving the message
      itemId,         // ID of the item being discussed
      messageText     // the message text
    );
    console.log('Message sent successfully');
  } catch (err) {
    console.error('Failed to send message:', err.message);
  }
}

// Example: Ask seller about an item
async function askSellerAboutItem() {
  try {
    await api.sendMessage(
      '507f1f77bcf86cd799439012',  // seller's user ID
      '507f1f77bcf86cd799439013',  // item ID
      'Is this item still available? Can we negotiate the price?'
    );
    console.log('Message sent to seller');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// ============================================================================
// COMMON PATTERNS
// ============================================================================

// Pattern 1: Search and filter items
async function searchItems() {
  try {
    // Search for electronics
    const electronics = await api.listItems({
      category: 'Electronics',
      limit: 5
    });
    console.log('Found electronics:', electronics.items);

    // Search with keyword
    const textbooks = await api.listItems({
      q: 'data structures'
    });
    console.log('Found textbooks:', textbooks.items);

    // Price range filtering (client-side after fetching)
    const affordable = electronics.items.filter(item => item.price < 1000);
    console.log('Items under ₹1000:', affordable);
  } catch (err) {
    console.error('Search error:', err.message);
  }
}

// Pattern 2: Protect form submission with auth
async function submitListingForm(event) {
  event.preventDefault();

  // Check if user is logged in
  if (!api.isLoggedIn()) {
    alert('Please login first');
    // Redirect to login modal
    return;
  }

  // Get form data
  const title = document.getElementById('listing-title').value;
  const price = document.getElementById('listing-price').value;
  const category = document.getElementById('listing-category').value;
  const location = document.getElementById('listing-location').value;
  const description = document.getElementById('listing-description').value;
  const imageFile = document.getElementById('listing-image').files[0];

  try {
    const result = await api.createItem(
      title,
      description,
      price,
      category,
      location,
      imageFile
    );
    alert('Listing created successfully!');
    // Reset form
    event.target.reset();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Pattern 3: Load and display items on page
async function loadItemsToPage() {
  try {
    const result = await api.listItems();
    const container = document.getElementById('items-container');
    
    if (result.items.length === 0) {
      container.innerHTML = '<p>No items found</p>';
      return;
    }

    container.innerHTML = result.items.map(item => `
      <div class="item-card">
        <h3>${item.title}</h3>
        <p>Price: ₹${item.price}</p>
        <p>Seller: ${item.seller.name}</p>
        <button onclick="api.getItem('${item._id}')">View Details</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load items:', err.message);
  }
}

// Pattern 4: Handle login/logout
async function handleLogin(email, password) {
  try {
    const result = await api.login(email, password);
    
    // Update UI
    document.getElementById('user-name').textContent = result.user.name;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('profile-section').style.display = 'block';
    
    // Reload items
    await loadItemsToPage();
  } catch (err) {
    alert('Login failed: ' + err.message);
  }
}

function handleLogout() {
  api.clearToken();
  
  // Update UI
  document.getElementById('user-name').textContent = '';
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('profile-section').style.display = 'none';
  
  // Reload items
  loadItemsToPage();
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// How to handle different error types
async function robustApiCall() {
  try {
    const result = await api.login('user@example.com', 'password');
    console.log('Success:', result);
  } catch (err) {
    // Error object structure
    console.error('Error message:', err.message);
    
    // Common errors
    if (err.message.includes('Invalid credentials')) {
      alert('Wrong email or password');
    } else if (err.message.includes('not found')) {
      alert('Item not found');
    } else if (err.message.includes('Not allowed')) {
      alert('You do not have permission');
    } else if (err.message.includes('Missing fields')) {
      alert('Please fill in all required fields');
    } else {
      alert('An error occurred: ' + err.message);
    }
  }
}

// ============================================================================
// DEBUGGING
// ============================================================================

// Check current auth state
function debugAuthState() {
  console.log('=== Auth State ===');
  console.log('Logged in:', api.isLoggedIn());
  console.log('Current user:', api.getCurrentUser());
  console.log('Token:', api.getToken());
}

// Test API connectivity
async function testApiConnectivity() {
  try {
    const result = await api.listItems({ limit: 1 });
    console.log('✓ API is working');
    console.log('✓ Items endpoint accessible');
    console.log('✓ Sample item:', result.items[0]);
  } catch (err) {
    console.error('✗ API not working:', err.message);
  }
}

// Test authentication
async function testAuth() {
  try {
    // Try login with test account
    const result = await api.login('test@example.com', 'password');
    console.log('✓ Auth working, logged in as:', result.user.name);
    api.clearToken(); // logout immediately
  } catch (err) {
    console.log('Auth test - Expected error (test account may not exist):', err.message);
  }
}
