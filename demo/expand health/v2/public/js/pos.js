/**
 * Point of Sale Module
 * Handles product selection, cart management, and payments
 */

(function() {
  // State
  let products = [];
  let cart = [];
  let selectedCustomer = null;
  let currentCategory = 'all';
  let selectedPaymentMethod = null;

  // Tax rate
  const TAX_RATE = 0.15;

  // DOM Elements
  const productsGrid = document.getElementById('productsGrid');
  const productSearch = document.getElementById('productSearch');
  const cartItems = document.getElementById('cartItems');
  const customerSelect = document.getElementById('customerSelect');
  const customerDropdown = document.getElementById('customerDropdown');
  const customerSearchInput = document.getElementById('customerSearchInput');
  const customerList = document.getElementById('customerList');
  const selectedCustomerEl = document.getElementById('selectedCustomer');
  const paymentModal = document.getElementById('paymentModal');
  const checkoutBtn = document.getElementById('checkoutBtn');

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    loadProducts();
    loadCustomers();
    setupEventListeners();
  }

  function setupEventListeners() {
    // Product search
    if (productSearch) {
      productSearch.addEventListener('input', filterProducts);
    }

    // Category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        renderProducts();
      });
    });

    // Customer selection
    if (customerSelect) {
      customerSelect.addEventListener('click', toggleCustomerDropdown);
    }

    if (customerSearchInput) {
      customerSearchInput.addEventListener('input', filterCustomers);
    }

    // Remove customer
    const removeCustomerBtn = document.getElementById('removeCustomerBtn');
    if (removeCustomerBtn) {
      removeCustomerBtn.addEventListener('click', removeCustomer);
    }

    // Add new customer
    const addNewCustomerBtn = document.getElementById('addNewCustomerBtn');
    if (addNewCustomerBtn) {
      addNewCustomerBtn.addEventListener('click', () => {
        window.location.href = '/clients/new';
      });
    }

    // Clear cart
    const clearCartBtn = document.getElementById('clearCartBtn');
    if (clearCartBtn) {
      clearCartBtn.addEventListener('click', clearCart);
    }

    // Checkout
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', openPaymentModal);
    }

    // Payment modal
    const closePaymentModal = document.getElementById('closePaymentModal');
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
    const completePaymentBtn = document.getElementById('completePaymentBtn');

    if (closePaymentModal) {
      closePaymentModal.addEventListener('click', closeModal);
    }
    if (cancelPaymentBtn) {
      cancelPaymentBtn.addEventListener('click', closeModal);
    }
    if (completePaymentBtn) {
      completePaymentBtn.addEventListener('click', completePayment);
    }

    // Payment methods
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
      btn.addEventListener('click', (e) => selectPaymentMethod(e.target.closest('.payment-method-btn')));
    });

    // Quick amounts
    document.querySelectorAll('.quick-amount').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const amount = parseFloat(e.target.dataset.amount);
        document.getElementById('cashReceived').value = amount.toFixed(2);
        calculateChange();
      });
    });

    // Cash received input
    const cashReceived = document.getElementById('cashReceived');
    if (cashReceived) {
      cashReceived.addEventListener('input', calculateChange);
    }

    // Modal overlay click
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', closeModal);
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.customer-section')) {
        customerDropdown?.classList.add('hidden');
      }
    });
  }

  // Products
  function loadProducts() {
    // Demo products
    products = [
      // Services
      { id: 1, name: 'Initial Consultation', price: 1500, category: 'services', duration: '60 min', icon: 'service' },
      { id: 2, name: 'Follow-up Session', price: 850, category: 'services', duration: '45 min', icon: 'service' },
      { id: 3, name: 'Lab Review', price: 650, category: 'services', duration: '30 min', icon: 'service' },
      { id: 4, name: 'IV Therapy', price: 1200, category: 'services', duration: '60 min', icon: 'service' },
      { id: 5, name: 'Hormone Consultation', price: 1800, category: 'services', duration: '90 min', icon: 'service' },

      // Packages
      { id: 6, name: '3-Month Wellness Package', price: 4500, category: 'packages', sessions: '6 sessions', icon: 'package' },
      { id: 7, name: 'Detox Program', price: 3200, category: 'packages', sessions: '4 weeks', icon: 'package' },
      { id: 8, name: 'Weight Loss Package', price: 5500, category: 'packages', sessions: '12 weeks', icon: 'package' },

      // Products
      { id: 9, name: 'Vitamin D3 + K2', price: 450, category: 'products', icon: 'product' },
      { id: 10, name: 'Omega-3 Fish Oil', price: 380, category: 'products', icon: 'product' },
      { id: 11, name: 'Magnesium Glycinate', price: 320, category: 'products', icon: 'product' },
      { id: 12, name: 'Probiotic Complex', price: 520, category: 'products', icon: 'product' },
      { id: 13, name: 'B-Complex', price: 290, category: 'products', icon: 'product' },
      { id: 14, name: 'Collagen Powder', price: 680, category: 'products', icon: 'product' },

      // Memberships
      { id: 15, name: 'Monthly Wellness', price: 2500, category: 'memberships', period: '/month', icon: 'membership' },
      { id: 16, name: 'Annual Premium', price: 24000, category: 'memberships', period: '/year', icon: 'membership' },

      // Gift Cards
      { id: 17, name: 'Gift Card R500', price: 500, category: 'gift-cards', icon: 'gift-card' },
      { id: 18, name: 'Gift Card R1000', price: 1000, category: 'gift-cards', icon: 'gift-card' },
      { id: 19, name: 'Gift Card R2500', price: 2500, category: 'gift-cards', icon: 'gift-card' }
    ];

    renderProducts();
  }

  function renderProducts() {
    if (!productsGrid) return;

    let filtered = products;
    if (currentCategory !== 'all') {
      filtered = products.filter(p => p.category === currentCategory);
    }

    // Apply search filter
    const searchQuery = productSearch?.value?.toLowerCase() || '';
    if (searchQuery) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery));
    }

    productsGrid.innerHTML = filtered.map(product => `
      <div class="product-card" data-id="${product.id}">
        <div class="product-icon ${product.icon}">
          ${getProductIcon(product.icon)}
        </div>
        <div class="product-name">${product.name}</div>
        <div class="product-price">R ${formatPrice(product.price)}${product.period || ''}</div>
        ${product.duration ? `<div class="product-duration">${product.duration}</div>` : ''}
        ${product.sessions ? `<div class="product-duration">${product.sessions}</div>` : ''}
      </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => addToCart(parseInt(card.dataset.id)));
    });
  }

  function filterProducts() {
    renderProducts();
  }

  function getProductIcon(type) {
    const icons = {
      'service': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      'package': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" stroke-width="2"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" stroke-width="2"/><line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" stroke-width="2"/></svg>',
      'product': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" stroke-width="2"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2"/><path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="2"/></svg>',
      'membership': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg>',
      'gift-card': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 8v13M7 8c0-2 1-5 5-5s5 3 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    };
    return icons[type] || icons['service'];
  }

  // Cart
  function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.product.id === productId);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      cart.push({ product, quantity: 1 });
    }

    renderCart();
    updateTotals();
  }

  function removeFromCart(productId) {
    cart = cart.filter(item => item.product.id !== productId);
    renderCart();
    updateTotals();
  }

  function updateQuantity(productId, delta) {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      renderCart();
      updateTotals();
    }
  }

  function clearCart() {
    cart = [];
    renderCart();
    updateTotals();
  }

  function renderCart() {
    if (!cartItems) return;

    if (cart.length === 0) {
      cartItems.innerHTML = `
        <div class="empty-cart">
          <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
            <circle cx="9" cy="21" r="1" stroke="currentColor" stroke-width="2"/>
            <circle cx="20" cy="21" r="1" stroke="currentColor" stroke-width="2"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>No items in cart</p>
          <span>Click on a product to add it</span>
        </div>
      `;
      checkoutBtn.disabled = true;
      return;
    }

    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.product.id}">
        <div class="cart-item-icon ${item.product.icon}">
          ${getProductIcon(item.product.icon)}
        </div>
        <div class="cart-item-details">
          <div class="cart-item-name">${item.product.name}</div>
          <div class="cart-item-meta">${item.product.duration || item.product.sessions || ''}</div>
        </div>
        <div class="cart-item-price">
          <div class="price">R ${formatPrice(item.product.price * item.quantity)}</div>
          <div class="cart-item-quantity">
            <button class="qty-btn minus" data-id="${item.product.id}">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn plus" data-id="${item.product.id}">+</button>
          </div>
        </div>
      </div>
    `).join('');

    // Add quantity button handlers
    document.querySelectorAll('.qty-btn.minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuantity(parseInt(btn.dataset.id), -1);
      });
    });

    document.querySelectorAll('.qty-btn.plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuantity(parseInt(btn.dataset.id), 1);
      });
    });

    checkoutBtn.disabled = false;
  }

  function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    document.getElementById('cartSubtotal').textContent = `R ${formatPrice(subtotal)}`;
    document.getElementById('cartTax').textContent = `R ${formatPrice(tax)}`;
    document.getElementById('cartTotal').textContent = `R ${formatPrice(total)}`;
  }

  // Customers
  let customers = [];

  function loadCustomers() {
    // Demo customers
    customers = [
      { id: 1, first_name: 'Sarah', last_name: 'Johnson', email: 'sarah@example.com' },
      { id: 2, first_name: 'Michael', last_name: 'Chen', email: 'michael@example.com' },
      { id: 3, first_name: 'Emma', last_name: 'Williams', email: 'emma@example.com' },
      { id: 4, first_name: 'James', last_name: 'Brown', email: 'james@example.com' },
      { id: 5, first_name: 'Olivia', last_name: 'Davis', email: 'olivia@example.com' }
    ];

    renderCustomerList();
  }

  function renderCustomerList() {
    if (!customerList) return;

    const searchQuery = customerSearchInput?.value?.toLowerCase() || '';
    let filtered = customers;

    if (searchQuery) {
      filtered = customers.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery) ||
        c.email.toLowerCase().includes(searchQuery)
      );
    }

    customerList.innerHTML = filtered.map(customer => `
      <div class="customer-list-item" data-id="${customer.id}">
        <div class="avatar">${getInitials(customer.first_name, customer.last_name)}</div>
        <div class="name">${customer.first_name} ${customer.last_name}</div>
      </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.customer-list-item').forEach(item => {
      item.addEventListener('click', () => selectCustomer(parseInt(item.dataset.id)));
    });
  }

  function toggleCustomerDropdown(e) {
    e.stopPropagation();
    customerDropdown?.classList.toggle('hidden');
    if (!customerDropdown?.classList.contains('hidden')) {
      customerSearchInput?.focus();
    }
  }

  function filterCustomers() {
    renderCustomerList();
  }

  function selectCustomer(customerId) {
    selectedCustomer = customers.find(c => c.id === customerId);
    if (!selectedCustomer) return;

    customerDropdown?.classList.add('hidden');
    customerSelect?.classList.add('hidden');
    selectedCustomerEl?.classList.remove('hidden');

    document.getElementById('selectedCustomerAvatar').textContent =
      getInitials(selectedCustomer.first_name, selectedCustomer.last_name);
    document.getElementById('selectedCustomerName').textContent =
      `${selectedCustomer.first_name} ${selectedCustomer.last_name}`;
    document.getElementById('selectedCustomerEmail').textContent =
      selectedCustomer.email;
  }

  function removeCustomer() {
    selectedCustomer = null;
    customerSelect?.classList.remove('hidden');
    selectedCustomerEl?.classList.add('hidden');
  }

  // Payment Modal
  function openPaymentModal() {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) * (1 + TAX_RATE);
    document.getElementById('paymentAmount').textContent = `R ${formatPrice(total)}`;

    paymentModal?.classList.remove('hidden');
    selectedPaymentMethod = null;
    document.querySelectorAll('.payment-method-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('cashInput')?.classList.add('hidden');
    document.getElementById('completePaymentBtn').disabled = true;
  }

  function closeModal() {
    paymentModal?.classList.add('hidden');
  }

  function selectPaymentMethod(btn) {
    const method = btn.dataset.method;
    selectedPaymentMethod = method;

    document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    // Show cash input for cash payments
    const cashInput = document.getElementById('cashInput');
    if (method === 'cash') {
      cashInput?.classList.remove('hidden');
    } else {
      cashInput?.classList.add('hidden');
    }

    // Enable complete button
    document.getElementById('completePaymentBtn').disabled = false;
  }

  function calculateChange() {
    const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) * (1 + TAX_RATE);
    const received = parseFloat(document.getElementById('cashReceived')?.value) || 0;
    const change = Math.max(0, received - total);

    document.getElementById('changeDue').textContent = `R ${formatPrice(change)}`;
  }

  function completePayment() {
    if (!selectedPaymentMethod) return;

    // In a real app, this would process the payment
    alert(`Payment of R ${document.getElementById('paymentAmount').textContent.replace('R ', '')} completed via ${selectedPaymentMethod}!`);

    // Clear cart and close modal
    clearCart();
    closeModal();
    selectedCustomer = null;
    removeCustomer();
  }

  // Helpers
  function getInitials(firstName, lastName) {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  }

  function formatPrice(amount) {
    return amount.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

})();
