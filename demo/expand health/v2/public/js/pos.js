/**
 * Point of Sale Module - Momence Style
 * Initial view: Who is selling + Customer selection
 * Cart appears only after customer is selected
 */

(function() {
  // State
  let staff = [];
  let customers = [];
  let cart = [];
  let selectedSeller = null;
  let selectedCustomer = null;
  let currentCategory = 'class';
  let selectedPaymentMethod = null;
  let timeFilter = 'upcoming';

  // Tax rate
  const TAX_RATE = 0.15;

  // Category config
  const categoryConfig = {
    'class': {
      title: 'Class',
      placeholder: 'Select a class...',
      modalTitle: 'Select a class',
      searchPlaceholder: 'Search for a class',
      hasDateFilter: true,
      hasTimeFilter: true
    },
    'membership': {
      title: 'Membership',
      placeholder: 'Select a membership...',
      modalTitle: 'Select a membership',
      searchPlaceholder: 'Search memberships',
      hasDateFilter: false,
      hasTimeFilter: false
    },
    'appointment': {
      title: 'Appointment',
      placeholder: 'Select an appointment...',
      modalTitle: 'Select an appointment',
      searchPlaceholder: 'Search appointments',
      hasDateFilter: true,
      hasTimeFilter: true
    },
    'appointment-addon': {
      title: 'Appointment add-on',
      placeholder: 'Select an add-on...',
      modalTitle: 'Select an add-on',
      searchPlaceholder: 'Search add-ons',
      hasDateFilter: false,
      hasTimeFilter: false
    },
    'product': {
      title: 'Product',
      placeholder: 'Select a product...',
      modalTitle: 'Select a product',
      searchPlaceholder: 'Search products',
      hasDateFilter: false,
      hasTimeFilter: false
    },
    'gift-card': {
      title: 'Gift card',
      placeholder: 'Select a gift card...',
      modalTitle: 'Select a gift card',
      searchPlaceholder: 'Search gift cards',
      hasDateFilter: false,
      hasTimeFilter: false
    },
    'tip': {
      title: 'Tip',
      placeholder: 'Select tip amount...',
      modalTitle: 'Add a tip',
      searchPlaceholder: 'Enter tip amount',
      hasDateFilter: false,
      hasTimeFilter: false
    },
    'money-credits': {
      title: 'Money Credits',
      placeholder: 'Select credit package...',
      modalTitle: 'Select credit package',
      searchPlaceholder: 'Search credit packages',
      hasDateFilter: false,
      hasTimeFilter: false
    },
    'class-credits': {
      title: 'Class/Appointments Credits',
      placeholder: 'Select credit pack...',
      modalTitle: 'Select credit pack',
      searchPlaceholder: 'Search credit packs',
      hasDateFilter: false,
      hasTimeFilter: false
    },
    'on-demand-video': {
      title: 'On-demand video',
      placeholder: 'Select a video...',
      modalTitle: 'Select a video',
      searchPlaceholder: 'Search videos',
      hasDateFilter: false,
      hasTimeFilter: false
    },
    'on-demand-course': {
      title: 'On-demand course',
      placeholder: 'Select a course...',
      modalTitle: 'Select a course',
      searchPlaceholder: 'Search courses',
      hasDateFilter: false,
      hasTimeFilter: false
    }
  };

  // Items data by category
  const items = {
    'class': [
      { id: 'c1', name: 'Yoga Flow', price: 250, datetime: '2025-01-02 09:00', duration: '60 min', staff: 'Dr Melody Fourie', spots: 8 },
      { id: 'c2', name: 'Meditation Circle', price: 200, datetime: '2025-01-02 10:30', duration: '45 min', staff: 'Avela Jafta', spots: 12 },
      { id: 'c3', name: 'Breathwork Session', price: 300, datetime: '2025-01-03 08:00', duration: '60 min', staff: 'Dr Melody Fourie', spots: 6 },
      { id: 'c4', name: 'Sound Healing', price: 350, datetime: '2025-01-03 14:00', duration: '75 min', staff: 'Avela Jafta', spots: 10 },
      { id: 'c5', name: 'Pilates Mat', price: 280, datetime: '2025-01-04 07:00', duration: '55 min', staff: 'Maryke Gallagher', spots: 15 },
      { id: 'c6', name: 'Wellness Workshop', price: 450, datetime: '2025-01-05 10:00', duration: '90 min', staff: 'Jack Hardland', spots: 20 }
    ],
    'membership': [
      { id: 'm1', name: 'Monthly Wellness', price: 2500, period: '/month', description: 'Unlimited classes' },
      { id: 'm2', name: 'Quarterly Premium', price: 6500, period: '/quarter', description: 'Unlimited classes + 2 appointments' },
      { id: 'm3', name: 'Annual Premium', price: 24000, period: '/year', description: 'Full access + priority booking' },
      { id: 'm4', name: 'Family Plan', price: 4500, period: '/month', description: 'Up to 4 family members' },
      { id: 'm5', name: 'Corporate Wellness', price: 8000, period: '/month', description: 'Team wellness program' }
    ],
    'appointment': [
      { id: 'a1', name: 'Initial Consultation', price: 1500, datetime: '2025-01-02 11:00', duration: '60 min', staff: 'Dr Daniel Blanckenberg' },
      { id: 'a2', name: 'Follow-up Session', price: 850, datetime: '2025-01-02 14:00', duration: '45 min', staff: 'Dr Melody Fourie' },
      { id: 'a3', name: 'Lab Review', price: 650, datetime: '2025-01-03 09:00', duration: '30 min', staff: 'Dr Daniel Blanckenberg' },
      { id: 'a4', name: 'IV Therapy', price: 1200, datetime: '2025-01-03 13:00', duration: '60 min', staff: 'Avela Jafta' },
      { id: 'a5', name: 'Hormone Consultation', price: 1800, datetime: '2025-01-04 10:00', duration: '90 min', staff: 'Dr Daniel Blanckenberg' },
      { id: 'a6', name: 'Nutrition Planning', price: 950, datetime: '2025-01-04 15:00', duration: '60 min', staff: 'Maryke Gallagher' }
    ],
    'appointment-addon': [
      { id: 'aa1', name: 'Blood Draw', price: 250, description: 'Lab work collection' },
      { id: 'aa2', name: 'Vitamin B12 Injection', price: 350, description: 'Energy boost' },
      { id: 'aa3', name: 'Glutathione Add-on', price: 450, description: 'Antioxidant support' },
      { id: 'aa4', name: 'Extended Session (+30min)', price: 400, description: 'Extra consultation time' },
      { id: 'aa5', name: 'Body Composition Analysis', price: 200, description: 'InBody scan' }
    ],
    'product': [
      { id: 'p1', name: 'Vitamin D3 + K2', price: 450, description: 'Bone & immune health' },
      { id: 'p2', name: 'Omega-3 Fish Oil', price: 380, description: 'Heart & brain health' },
      { id: 'p3', name: 'Magnesium Glycinate', price: 320, description: 'Muscle & sleep support' },
      { id: 'p4', name: 'Probiotic Complex', price: 520, description: 'Gut health' },
      { id: 'p5', name: 'B-Complex', price: 290, description: 'Energy & metabolism' },
      { id: 'p6', name: 'Collagen Powder', price: 680, description: 'Skin, hair & joints' }
    ],
    'gift-card': [
      { id: 'g1', name: 'Gift Card R250', price: 250, description: 'Gift card value R250' },
      { id: 'g2', name: 'Gift Card R500', price: 500, description: 'Gift card value R500' },
      { id: 'g3', name: 'Gift Card R1000', price: 1000, description: 'Gift card value R1000' },
      { id: 'g4', name: 'Gift Card R2500', price: 2500, description: 'Gift card value R2500' }
    ],
    'tip': [
      { id: 't1', name: 'Tip R50', price: 50, description: 'Thank you tip' },
      { id: 't2', name: 'Tip R100', price: 100, description: 'Thank you tip' },
      { id: 't3', name: 'Tip R200', price: 200, description: 'Thank you tip' },
      { id: 't4', name: 'Tip R500', price: 500, description: 'Thank you tip' }
    ],
    'money-credits': [
      { id: 'mc1', name: 'R500 Credit', price: 500, description: 'Store credit' },
      { id: 'mc2', name: 'R1000 Credit (+R50)', price: 1000, description: 'Store credit + R50 bonus' },
      { id: 'mc3', name: 'R2500 Credit (+R150)', price: 2500, description: 'Store credit + R150 bonus' },
      { id: 'mc4', name: 'R5000 Credit (+R400)', price: 5000, description: 'Store credit + R400 bonus' }
    ],
    'class-credits': [
      { id: 'cc1', name: '5 Class Pack', price: 1100, description: '5 classes, valid 3 months' },
      { id: 'cc2', name: '10 Class Pack', price: 2000, description: '10 classes, valid 6 months' },
      { id: 'cc3', name: '20 Class Pack', price: 3600, description: '20 classes, valid 12 months' },
      { id: 'cc4', name: '5 Appointment Pack', price: 3500, description: '5 appointments, valid 6 months' }
    ],
    'on-demand-video': [
      { id: 'v1', name: 'Morning Yoga Routine', price: 99, duration: '30 min', description: 'Start your day right' },
      { id: 'v2', name: 'Stress Relief Meditation', price: 79, duration: '20 min', description: 'Calm your mind' },
      { id: 'v3', name: 'Breathwork Basics', price: 99, duration: '25 min', description: 'Learn breathing techniques' }
    ],
    'on-demand-course': [
      { id: 'co1', name: 'Wellness Foundations', price: 1500, description: '12 lessons, self-paced' },
      { id: 'co2', name: 'Nutrition Masterclass', price: 2500, description: '20 lessons, self-paced' },
      { id: 'co3', name: 'Mind-Body Connection', price: 1800, description: '15 lessons, self-paced' }
    ]
  };

  // DOM Elements
  const sellerSelect = document.getElementById('sellerSelect');
  const customerSelect = document.getElementById('customerSelect');
  const addCustomerBtn = document.getElementById('addCustomerBtn');
  const payingForOther = document.getElementById('payingForOther');
  const cartSection = document.getElementById('cartSection');
  const categoryItemSelect = document.getElementById('categoryItemSelect');
  const categoryContentTitle = document.getElementById('categoryContentTitle');
  const calendarBtn = document.getElementById('calendarBtn');
  const addNewItemBtn = document.getElementById('addNewItemBtn');
  const cartItemsList = document.getElementById('cartItemsList');
  const cartFooter = document.getElementById('cartFooter');
  const cancelBtn = document.getElementById('cancelBtn');
  const addToCartBtn = document.getElementById('addToCartBtn');
  const selectClassModal = document.getElementById('selectClassModal');
  const closeClassModal = document.getElementById('closeClassModal');
  const classSearchInput = document.getElementById('classSearchInput');
  const classResults = document.getElementById('classResults');
  const paymentModal = document.getElementById('paymentModal');

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    await loadStaff();
    await loadCustomers();
    setupEventListeners();
    updateCategoryContent();
  }

  async function loadStaff() {
    try {
      const response = await fetch('/api/staff?active_only=true');
      if (response.ok) {
        staff = await response.json();
      } else {
        // Fallback demo data
        staff = [
          { id: 1, first_name: 'Dr Daniel', last_name: 'Blanckenberg', title: 'Medical Director' },
          { id: 2, first_name: 'Dr Melody', last_name: 'Fourie', title: 'Functional Medicine' },
          { id: 3, first_name: 'Avela', last_name: 'Jafta', title: 'IV Therapy Specialist' },
          { id: 4, first_name: 'Maryke', last_name: 'Gallagher', title: 'Nutritionist' },
          { id: 5, first_name: 'Jack', last_name: 'Hardland', title: 'Wellness Coach' }
        ];
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      staff = [
        { id: 1, first_name: 'Dr Daniel', last_name: 'Blanckenberg', title: 'Medical Director' },
        { id: 2, first_name: 'Dr Melody', last_name: 'Fourie', title: 'Functional Medicine' },
        { id: 3, first_name: 'Avela', last_name: 'Jafta', title: 'IV Therapy Specialist' },
        { id: 4, first_name: 'Maryke', last_name: 'Gallagher', title: 'Nutritionist' },
        { id: 5, first_name: 'Jack', last_name: 'Hardland', title: 'Wellness Coach' }
      ];
    }
    renderSellerDropdown();
  }

  async function loadCustomers() {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        customers = await response.json();
      } else {
        // Fallback demo data
        customers = [
          { id: 1, first_name: 'Sarah', last_name: 'Johnson', email: 'sarah@example.com' },
          { id: 2, first_name: 'Michael', last_name: 'Chen', email: 'michael@example.com' },
          { id: 3, first_name: 'Emma', last_name: 'Williams', email: 'emma@example.com' },
          { id: 4, first_name: 'James', last_name: 'Brown', email: 'james@example.com' },
          { id: 5, first_name: 'Olivia', last_name: 'Davis', email: 'olivia@example.com' }
        ];
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      customers = [
        { id: 1, first_name: 'Sarah', last_name: 'Johnson', email: 'sarah@example.com' },
        { id: 2, first_name: 'Michael', last_name: 'Chen', email: 'michael@example.com' },
        { id: 3, first_name: 'Emma', last_name: 'Williams', email: 'emma@example.com' },
        { id: 4, first_name: 'James', last_name: 'Brown', email: 'james@example.com' },
        { id: 5, first_name: 'Olivia', last_name: 'Davis', email: 'olivia@example.com' }
      ];
    }
    renderCustomerDropdown();
  }

  function renderSellerDropdown() {
    if (!sellerSelect) return;

    sellerSelect.innerHTML = '<option value="">Select staff member...</option>';
    staff.forEach(member => {
      const option = document.createElement('option');
      option.value = member.id;
      option.textContent = `${member.first_name} ${member.last_name}`;
      sellerSelect.appendChild(option);
    });
  }

  function renderCustomerDropdown() {
    if (!customerSelect) return;

    customerSelect.innerHTML = '<option value="">Select customer...</option>';
    customers.forEach(customer => {
      const option = document.createElement('option');
      option.value = customer.id;
      option.textContent = `${customer.first_name} ${customer.last_name}`;
      customerSelect.appendChild(option);
    });
  }

  function setupEventListeners() {
    // Seller selection
    if (sellerSelect) {
      sellerSelect.addEventListener('change', (e) => {
        selectedSeller = staff.find(s => s.id == e.target.value) || null;
      });
    }

    // Customer selection - show cart when selected
    if (customerSelect) {
      customerSelect.addEventListener('change', (e) => {
        selectedCustomer = customers.find(c => c.id == e.target.value) || null;

        if (selectedCustomer) {
          // Show cart section
          cartSection?.classList.remove('hidden');
        } else {
          // Hide cart section
          cartSection?.classList.add('hidden');
        }
      });
    }

    // Add new customer
    if (addCustomerBtn) {
      addCustomerBtn.addEventListener('click', () => {
        window.location.href = '/clients/new';
      });
    }

    // Category tabs
    document.querySelectorAll('.cart-category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.cart-category-btn');

        // Update active state
        document.querySelectorAll('.cart-category-btn').forEach(b => b.classList.remove('active'));
        button.classList.add('active');

        // Update current category
        currentCategory = button.dataset.category;
        updateCategoryContent();
      });
    });

    // Category item select - open modal
    if (categoryItemSelect) {
      categoryItemSelect.addEventListener('click', (e) => {
        e.preventDefault();
        openSelectionModal();
      });

      categoryItemSelect.addEventListener('focus', (e) => {
        e.preventDefault();
        openSelectionModal();
      });
    }

    // Calendar button
    if (calendarBtn) {
      calendarBtn.addEventListener('click', () => {
        // For now, just show an alert - could implement a date picker
        alert('Date picker coming soon!');
      });
    }

    // Add new item button
    if (addNewItemBtn) {
      addNewItemBtn.addEventListener('click', () => {
        const config = categoryConfig[currentCategory];
        alert(`Create new ${config.title} - coming soon!`);
      });
    }

    // Close modal
    if (closeClassModal) {
      closeClassModal.addEventListener('click', closeSelectionModal);
    }

    // Modal overlay click
    const modalOverlay = selectClassModal?.querySelector('.pos-modal-overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', closeSelectionModal);
    }

    // Search in modal
    if (classSearchInput) {
      classSearchInput.addEventListener('input', renderModalResults);
    }

    // Time filter tabs
    document.querySelectorAll('.time-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const button = e.target.closest('.time-tab');

        document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
        button.classList.add('active');

        timeFilter = button.dataset.time;
        renderModalResults();
      });
    });

    // Cancel button
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        cart = [];
        renderCart();
      });
    }

    // Add to cart button
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        if (cart.length > 0) {
          openPaymentModal();
        }
      });
    }

    // Payment modal
    const closePaymentModalBtn = document.getElementById('closePaymentModal');
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
    const completePaymentBtn = document.getElementById('completePaymentBtn');

    if (closePaymentModalBtn) {
      closePaymentModalBtn.addEventListener('click', closePaymentModalHandler);
    }
    if (cancelPaymentBtn) {
      cancelPaymentBtn.addEventListener('click', closePaymentModalHandler);
    }
    if (completePaymentBtn) {
      completePaymentBtn.addEventListener('click', completePayment);
    }

    // Payment methods
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
      btn.addEventListener('click', (e) => selectPaymentMethod(e.target.closest('.payment-method-btn')));
    });

    // Payment modal overlay
    const paymentOverlay = paymentModal?.querySelector('.modal-overlay');
    if (paymentOverlay) {
      paymentOverlay.addEventListener('click', closePaymentModalHandler);
    }
  }

  function updateCategoryContent() {
    const config = categoryConfig[currentCategory];

    if (categoryContentTitle) {
      categoryContentTitle.textContent = config.title;
    }

    if (categoryItemSelect) {
      categoryItemSelect.innerHTML = `<option value="">${config.placeholder}</option>`;
    }

    // Show/hide date filter based on category
    if (calendarBtn) {
      calendarBtn.style.display = config.hasDateFilter ? 'flex' : 'none';
    }
  }

  function openSelectionModal() {
    const config = categoryConfig[currentCategory];

    // Update modal title
    const modalTitle = selectClassModal?.querySelector('.pos-modal-header h2');
    if (modalTitle) {
      modalTitle.textContent = config.modalTitle;
    }

    // Update search placeholder
    if (classSearchInput) {
      classSearchInput.placeholder = config.searchPlaceholder;
      classSearchInput.value = '';
    }

    // Show/hide time tabs
    const timeTabs = selectClassModal?.querySelector('.modal-time-tabs');
    if (timeTabs) {
      timeTabs.style.display = config.hasTimeFilter ? 'flex' : 'none';
    }

    // Show/hide date filter button
    const dateFilterBtn = document.getElementById('classDateFilter');
    if (dateFilterBtn) {
      dateFilterBtn.style.display = config.hasDateFilter ? 'flex' : 'none';
    }

    // Render results
    renderModalResults();

    // Show modal
    selectClassModal?.classList.remove('hidden');
  }

  function closeSelectionModal() {
    selectClassModal?.classList.add('hidden');
  }

  function renderModalResults() {
    if (!classResults) return;

    const categoryItems = items[currentCategory] || [];
    const searchQuery = classSearchInput?.value?.toLowerCase() || '';

    let filtered = categoryItems;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery) ||
        (item.staff && item.staff.toLowerCase().includes(searchQuery)) ||
        (item.description && item.description.toLowerCase().includes(searchQuery))
      );
    }

    // Apply time filter for items with datetime
    if (categoryConfig[currentCategory].hasTimeFilter) {
      const now = new Date();
      filtered = filtered.filter(item => {
        if (!item.datetime) return true;
        const itemDate = new Date(item.datetime);
        return timeFilter === 'upcoming' ? itemDate >= now : itemDate < now;
      });
    }

    if (filtered.length === 0) {
      classResults.innerHTML = `<div class="no-results">No ${categoryConfig[currentCategory].title.toLowerCase()}s found</div>`;
      return;
    }

    classResults.innerHTML = filtered.map(item => `
      <div class="class-result-item" data-id="${item.id}">
        <div class="class-result-info">
          <div class="class-result-name">${item.name}</div>
          <div class="class-result-meta">
            ${item.datetime ? formatDateTime(item.datetime) : ''}
            ${item.duration ? ` · ${item.duration}` : ''}
            ${item.staff ? ` · ${item.staff}` : ''}
            ${item.description ? item.description : ''}
            ${item.period ? item.period : ''}
            ${item.spots ? ` · ${item.spots} spots` : ''}
          </div>
        </div>
        <div class="class-result-price">R ${formatPrice(item.price)}</div>
      </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.class-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const itemId = el.dataset.id;
        selectItem(itemId);
      });
    });
  }

  function selectItem(itemId) {
    const categoryItems = items[currentCategory] || [];
    const item = categoryItems.find(i => i.id === itemId);

    if (!item) return;

    // Add to cart
    const existingItem = cart.find(c => c.id === itemId);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      cart.push({
        ...item,
        category: currentCategory,
        quantity: 1
      });
    }

    // Close modal
    closeSelectionModal();

    // Render cart
    renderCart();
  }

  function renderCart() {
    if (!cartItemsList) return;

    if (cart.length === 0) {
      cartItemsList.classList.add('hidden');
      cartFooter?.classList.add('hidden');
      return;
    }

    cartItemsList.classList.remove('hidden');
    cartFooter?.classList.remove('hidden');

    cartItemsList.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-details">
            ${item.datetime ? formatDateTime(item.datetime) : ''}
            ${item.duration ? item.duration : ''}
            ${item.staff ? ` · ${item.staff}` : ''}
            ${item.quantity > 1 ? ` × ${item.quantity}` : ''}
          </div>
        </div>
        <div class="cart-item-price">R ${formatPrice(item.price * item.quantity)}</div>
        <button class="cart-item-remove" data-id="${item.id}" title="Remove">
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `).join('');

    // Add remove handlers
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.id;
        removeFromCart(itemId);
      });
    });
  }

  function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    renderCart();
  }

  function openPaymentModal() {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    const paymentAmount = document.getElementById('paymentAmount');
    if (paymentAmount) {
      paymentAmount.textContent = `R ${formatPrice(total)}`;
    }

    // Reset payment method
    selectedPaymentMethod = null;
    document.querySelectorAll('.payment-method-btn').forEach(btn => btn.classList.remove('selected'));

    const completePaymentBtn = document.getElementById('completePaymentBtn');
    if (completePaymentBtn) {
      completePaymentBtn.disabled = true;
    }

    paymentModal?.classList.remove('hidden');
  }

  function closePaymentModalHandler() {
    paymentModal?.classList.add('hidden');
  }

  function selectPaymentMethod(btn) {
    const method = btn.dataset.method;
    selectedPaymentMethod = method;

    document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    const completePaymentBtn = document.getElementById('completePaymentBtn');
    if (completePaymentBtn) {
      completePaymentBtn.disabled = false;
    }
  }

  function completePayment() {
    if (!selectedPaymentMethod) return;

    const paymentAmount = document.getElementById('paymentAmount');
    alert(`Payment of ${paymentAmount?.textContent} completed via ${selectedPaymentMethod}!`);

    // Clear cart
    cart = [];
    renderCart();

    // Reset customer selection
    selectedCustomer = null;
    if (customerSelect) {
      customerSelect.value = '';
    }
    cartSection?.classList.add('hidden');

    // Close modal
    closePaymentModalHandler();
  }

  // Helpers
  function formatPrice(amount) {
    return amount.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    const options = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-ZA', options);
  }

})();
