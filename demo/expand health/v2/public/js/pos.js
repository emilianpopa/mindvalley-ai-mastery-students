/**
 * Point of Sale Module - Momence Style
 * Handles product selection, cart management, and payments
 */

(function() {
  // State
  let items = {};
  let cart = [];
  let selectedCustomer = null;
  let currentCategory = 'class';
  let selectedPaymentMethod = null;

  // Tax rate
  const TAX_RATE = 0.15;

  // Category titles
  const categoryTitles = {
    'class': 'Classes',
    'membership': 'Memberships',
    'appointment': 'Appointments',
    'appointment-addon': 'Appointment Add-ons',
    'product': 'Products',
    'gift-card': 'Gift Cards',
    'tip': 'Tips',
    'money-credits': 'Money Credits',
    'class-credits': 'Class/Appointment Credits',
    'on-demand-video': 'On-demand Videos',
    'on-demand-course': 'On-demand Courses'
  };

  // DOM Elements
  const itemsGrid = document.getElementById('itemsGrid');
  const itemSearch = document.getElementById('itemSearch');
  const categoryTitle = document.getElementById('categoryTitle');
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
    loadItems();
    loadCustomers();
    setupEventListeners();
    renderItems();
  }

  function setupEventListeners() {
    // Item search
    if (itemSearch) {
      itemSearch.addEventListener('input', renderItems);
    }

    // Category tabs (vertical)
    document.querySelectorAll('.category-tab-v').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabEl = e.target.closest('.category-tab-v');
        document.querySelectorAll('.category-tab-v').forEach(t => t.classList.remove('active'));
        tabEl.classList.add('active');
        currentCategory = tabEl.dataset.category;
        categoryTitle.textContent = categoryTitles[currentCategory] || currentCategory;
        renderItems();
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
      if (!e.target.closest('.customer-select-wrapper')) {
        customerDropdown?.classList.add('hidden');
      }
    });
  }

  // Items - organized by category like Momence
  function loadItems() {
    items = {
      'class': [
        { id: 'c1', name: 'Yoga Flow', price: 250, duration: '60 min', staff: 'Dr Melody Fourie', icon: 'class' },
        { id: 'c2', name: 'Meditation Circle', price: 200, duration: '45 min', staff: 'Avela Jafta', icon: 'class' },
        { id: 'c3', name: 'Breathwork Session', price: 300, duration: '60 min', staff: 'Dr Melody Fourie', icon: 'class' },
        { id: 'c4', name: 'Sound Healing', price: 350, duration: '75 min', staff: 'Avela Jafta', icon: 'class' },
        { id: 'c5', name: 'Pilates Mat', price: 280, duration: '55 min', staff: 'Maryke Gallagher', icon: 'class' },
        { id: 'c6', name: 'Wellness Workshop', price: 450, duration: '90 min', staff: 'Jack Hardland', icon: 'class' }
      ],
      'membership': [
        { id: 'm1', name: 'Monthly Wellness', price: 2500, period: '/month', icon: 'membership' },
        { id: 'm2', name: 'Quarterly Premium', price: 6500, period: '/quarter', icon: 'membership' },
        { id: 'm3', name: 'Annual Premium', price: 24000, period: '/year', icon: 'membership' },
        { id: 'm4', name: 'Family Plan', price: 4500, period: '/month', icon: 'membership' },
        { id: 'm5', name: 'Corporate Wellness', price: 8000, period: '/month', icon: 'membership' }
      ],
      'appointment': [
        { id: 'a1', name: 'Initial Consultation', price: 1500, duration: '60 min', staff: 'Dr Daniel Blanckenberg', icon: 'appointment' },
        { id: 'a2', name: 'Follow-up Session', price: 850, duration: '45 min', staff: 'Dr Melody Fourie', icon: 'appointment' },
        { id: 'a3', name: 'Lab Review', price: 650, duration: '30 min', staff: 'Dr Daniel Blanckenberg', icon: 'appointment' },
        { id: 'a4', name: 'IV Therapy', price: 1200, duration: '60 min', staff: 'Avela Jafta', icon: 'appointment' },
        { id: 'a5', name: 'Hormone Consultation', price: 1800, duration: '90 min', staff: 'Dr Daniel Blanckenberg', icon: 'appointment' },
        { id: 'a6', name: 'Nutrition Planning', price: 950, duration: '60 min', staff: 'Maryke Gallagher', icon: 'appointment' },
        { id: 'a7', name: 'Wellness Check-up', price: 750, duration: '45 min', staff: 'Dr Melody Fourie', icon: 'appointment' }
      ],
      'appointment-addon': [
        { id: 'aa1', name: 'Blood Draw', price: 250, icon: 'appointment' },
        { id: 'aa2', name: 'Vitamin B12 Injection', price: 350, icon: 'appointment' },
        { id: 'aa3', name: 'Glutathione Add-on', price: 450, icon: 'appointment' },
        { id: 'aa4', name: 'Extended Session (+30min)', price: 400, icon: 'appointment' },
        { id: 'aa5', name: 'Body Composition Analysis', price: 200, icon: 'appointment' }
      ],
      'product': [
        { id: 'p1', name: 'Vitamin D3 + K2', price: 450, icon: 'product' },
        { id: 'p2', name: 'Omega-3 Fish Oil', price: 380, icon: 'product' },
        { id: 'p3', name: 'Magnesium Glycinate', price: 320, icon: 'product' },
        { id: 'p4', name: 'Probiotic Complex', price: 520, icon: 'product' },
        { id: 'p5', name: 'B-Complex', price: 290, icon: 'product' },
        { id: 'p6', name: 'Collagen Powder', price: 680, icon: 'product' },
        { id: 'p7', name: 'Ashwagandha', price: 340, icon: 'product' },
        { id: 'p8', name: 'CoQ10', price: 420, icon: 'product' },
        { id: 'p9', name: 'Zinc + Copper', price: 280, icon: 'product' },
        { id: 'p10', name: 'Liver Support Complex', price: 490, icon: 'product' }
      ],
      'gift-card': [
        { id: 'g1', name: 'Gift Card R250', price: 250, icon: 'gift-card' },
        { id: 'g2', name: 'Gift Card R500', price: 500, icon: 'gift-card' },
        { id: 'g3', name: 'Gift Card R1000', price: 1000, icon: 'gift-card' },
        { id: 'g4', name: 'Gift Card R2500', price: 2500, icon: 'gift-card' },
        { id: 'g5', name: 'Gift Card R5000', price: 5000, icon: 'gift-card' }
      ],
      'tip': [
        { id: 't1', name: 'Tip R50', price: 50, icon: 'tip' },
        { id: 't2', name: 'Tip R100', price: 100, icon: 'tip' },
        { id: 't3', name: 'Tip R200', price: 200, icon: 'tip' },
        { id: 't4', name: 'Tip R500', price: 500, icon: 'tip' },
        { id: 't5', name: 'Custom Tip', price: 0, isCustom: true, icon: 'tip' }
      ],
      'money-credits': [
        { id: 'mc1', name: 'R500 Credit', price: 500, bonus: null, icon: 'credits' },
        { id: 'mc2', name: 'R1000 Credit', price: 1000, bonus: 'R50 bonus', icon: 'credits' },
        { id: 'mc3', name: 'R2500 Credit', price: 2500, bonus: 'R150 bonus', icon: 'credits' },
        { id: 'mc4', name: 'R5000 Credit', price: 5000, bonus: 'R400 bonus', icon: 'credits' }
      ],
      'class-credits': [
        { id: 'cc1', name: '5 Class Pack', price: 1100, credits: '5 classes', icon: 'credits' },
        { id: 'cc2', name: '10 Class Pack', price: 2000, credits: '10 classes', icon: 'credits' },
        { id: 'cc3', name: '20 Class Pack', price: 3600, credits: '20 classes', icon: 'credits' },
        { id: 'cc4', name: '5 Appointment Pack', price: 3500, credits: '5 appointments', icon: 'credits' }
      ],
      'on-demand-video': [
        { id: 'v1', name: 'Morning Yoga Routine', price: 99, duration: '30 min', icon: 'video' },
        { id: 'v2', name: 'Stress Relief Meditation', price: 79, duration: '20 min', icon: 'video' },
        { id: 'v3', name: 'Breathwork Basics', price: 99, duration: '25 min', icon: 'video' },
        { id: 'v4', name: 'Sleep Better Tonight', price: 89, duration: '15 min', icon: 'video' }
      ],
      'on-demand-course': [
        { id: 'co1', name: 'Wellness Foundations', price: 1500, lessons: '12 lessons', icon: 'course' },
        { id: 'co2', name: 'Nutrition Masterclass', price: 2500, lessons: '20 lessons', icon: 'course' },
        { id: 'co3', name: 'Mind-Body Connection', price: 1800, lessons: '15 lessons', icon: 'course' },
        { id: 'co4', name: 'Hormone Health Guide', price: 2200, lessons: '18 lessons', icon: 'course' }
      ]
    };
  }

  function renderItems() {
    if (!itemsGrid) return;

    const categoryItems = items[currentCategory] || [];
    const searchQuery = itemSearch?.value?.toLowerCase() || '';

    let filtered = categoryItems;
    if (searchQuery) {
      filtered = categoryItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery) ||
        (item.staff && item.staff.toLowerCase().includes(searchQuery))
      );
    }

    if (filtered.length === 0) {
      itemsGrid.innerHTML = `
        <div class="items-empty">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>No items found</p>
          <span>${searchQuery ? 'Try a different search term' : 'No items in this category'}</span>
        </div>
      `;
      return;
    }

    itemsGrid.innerHTML = filtered.map(item => `
      <div class="item-card" data-id="${item.id}" data-category="${currentCategory}">
        <div class="item-icon ${item.icon}">
          ${getItemIcon(item.icon)}
        </div>
        <div class="item-name">${item.name}</div>
        <div class="item-price">${item.isCustom ? 'Enter amount' : `R ${formatPrice(item.price)}`}${item.period || ''}</div>
        ${item.duration ? `<div class="item-duration">${item.duration}</div>` : ''}
        ${item.staff ? `<div class="item-staff">${item.staff}</div>` : ''}
        ${item.credits ? `<div class="item-duration">${item.credits}</div>` : ''}
        ${item.lessons ? `<div class="item-duration">${item.lessons}</div>` : ''}
        ${item.bonus ? `<div class="item-duration" style="color: var(--primary)">${item.bonus}</div>` : ''}
      </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', () => {
        const itemId = card.dataset.id;
        const category = card.dataset.category;
        addToCart(itemId, category);
      });
    });
  }

  function getItemIcon(type) {
    const icons = {
      'class': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      'membership': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M1 10h22" stroke="currentColor" stroke-width="2"/></svg>',
      'appointment': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/></svg>',
      'product': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" stroke-width="2"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2"/><path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="2"/></svg>',
      'gift-card': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 8v13M7 8c0-2 1-5 5-5s5 3 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      'tip': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
      'credits': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      'video': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" stroke-width="2"/></svg>',
      'course': '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
    return icons[type] || icons['class'];
  }

  // Cart
  function addToCart(itemId, category) {
    const categoryItems = items[category] || [];
    const item = categoryItems.find(i => i.id === itemId);
    if (!item) return;

    // Handle custom tip
    if (item.isCustom) {
      const amount = prompt('Enter tip amount (R):');
      if (amount && !isNaN(parseFloat(amount))) {
        const customItem = { ...item, price: parseFloat(amount), name: `Custom Tip R${amount}` };
        cart.push({ item: customItem, quantity: 1, category });
        renderCart();
        updateTotals();
      }
      return;
    }

    const existingItem = cart.find(cartItem => cartItem.item.id === itemId);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      cart.push({ item, quantity: 1, category });
    }

    renderCart();
    updateTotals();
  }

  function removeFromCart(itemId) {
    cart = cart.filter(cartItem => cartItem.item.id !== itemId);
    renderCart();
    updateTotals();
  }

  function updateQuantity(itemId, delta) {
    const cartItem = cart.find(i => i.item.id === itemId);
    if (!cartItem) return;

    cartItem.quantity += delta;
    if (cartItem.quantity <= 0) {
      removeFromCart(itemId);
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
          <svg viewBox="0 0 24 24" fill="none" width="40" height="40">
            <circle cx="9" cy="21" r="1" stroke="currentColor" stroke-width="2"/>
            <circle cx="20" cy="21" r="1" stroke="currentColor" stroke-width="2"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>No items in cart</p>
          <span>Select an item from the right</span>
        </div>
      `;
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    cartItems.innerHTML = cart.map(cartItem => `
      <div class="cart-item" data-id="${cartItem.item.id}">
        <div class="cart-item-icon ${cartItem.item.icon}" style="background: ${getIconBackground(cartItem.item.icon)}; color: ${getIconColor(cartItem.item.icon)}">
          ${getItemIcon(cartItem.item.icon)}
        </div>
        <div class="cart-item-details">
          <div class="cart-item-name">${cartItem.item.name}</div>
          <div class="cart-item-meta">${cartItem.item.duration || cartItem.item.staff || cartItem.item.credits || ''}</div>
        </div>
        <div class="cart-item-price">
          <div class="price">R ${formatPrice(cartItem.item.price * cartItem.quantity)}</div>
          <div class="cart-item-quantity">
            <button class="qty-btn minus" data-id="${cartItem.item.id}">-</button>
            <span>${cartItem.quantity}</span>
            <button class="qty-btn plus" data-id="${cartItem.item.id}">+</button>
          </div>
        </div>
      </div>
    `).join('');

    // Add quantity button handlers
    document.querySelectorAll('.qty-btn.minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuantity(btn.dataset.id, -1);
      });
    });

    document.querySelectorAll('.qty-btn.plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuantity(btn.dataset.id, 1);
      });
    });

    if (checkoutBtn) checkoutBtn.disabled = false;
  }

  function getIconBackground(type) {
    const colors = {
      'class': '#dbeafe',
      'membership': '#fef3c7',
      'appointment': '#dcfce7',
      'product': '#f3e8ff',
      'gift-card': '#fce7f3',
      'tip': '#fef9c3',
      'credits': '#e0f2fe',
      'video': '#fee2e2',
      'course': '#f0fdf4'
    };
    return colors[type] || '#f3f4f6';
  }

  function getIconColor(type) {
    const colors = {
      'class': '#2563eb',
      'membership': '#d97706',
      'appointment': '#16a34a',
      'product': '#9333ea',
      'gift-card': '#db2777',
      'tip': '#ca8a04',
      'credits': '#0284c7',
      'video': '#dc2626',
      'course': '#15803d'
    };
    return colors[type] || '#6b7280';
  }

  function updateTotals() {
    const subtotal = cart.reduce((sum, cartItem) => sum + (cartItem.item.price * cartItem.quantity), 0);
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

    // Update UI
    document.getElementById('customerSelectText').textContent =
      `${selectedCustomer.first_name} ${selectedCustomer.last_name}`;

    // Show selected customer section
    const customerSelectWrapper = document.querySelector('.customer-select-wrapper');
    if (customerSelectWrapper) {
      customerSelectWrapper.style.display = 'none';
    }
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
    const customerSelectWrapper = document.querySelector('.customer-select-wrapper');
    if (customerSelectWrapper) {
      customerSelectWrapper.style.display = 'block';
    }
    document.getElementById('customerSelectText').textContent = 'Select Customer';
    selectedCustomerEl?.classList.add('hidden');
  }

  // Payment Modal
  function openPaymentModal() {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, cartItem) => sum + (cartItem.item.price * cartItem.quantity), 0) * (1 + TAX_RATE);
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
    const total = cart.reduce((sum, cartItem) => sum + (cartItem.item.price * cartItem.quantity), 0) * (1 + TAX_RATE);
    const received = parseFloat(document.getElementById('cashReceived')?.value) || 0;
    const change = Math.max(0, received - total);

    document.getElementById('changeDue').textContent = `R ${formatPrice(change)}`;
  }

  function completePayment() {
    if (!selectedPaymentMethod) return;

    // In a real app, this would process the payment
    alert(`Payment of ${document.getElementById('paymentAmount').textContent} completed via ${selectedPaymentMethod}!`);

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
