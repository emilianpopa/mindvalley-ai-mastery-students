/**
 * Global Utility Bar Component
 * Injects the top utility bar on all pages
 * Includes Global Search functionality
 */

// Global search state
let globalSearchTimeout = null;
let globalSearchResults = { clients: [], staff: [], services: [], appointments: [] };

function initUtilityBar(activePage = '') {
  // Get current user info from localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { first_name: 'User', last_name: '', email: 'user@expand.health' };
  const initials = ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || 'U';
  const displayName = `${user.first_name || 'User'} ${(user.last_name || '')[0] || ''}.`;

  const utilityBarHTML = `
    <div class="global-utility-bar">
      <div class="utility-bar-left">
        <!-- Global Search -->
        <div class="global-search-wrapper">
          <div class="global-search-input-container">
            <svg class="global-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              class="global-search-input"
              id="globalSearchInput"
              placeholder="Search..."
              autocomplete="off"
            />
            <kbd class="global-search-shortcut">S</kbd>
          </div>
          <div class="global-search-dropdown" id="globalSearchDropdown">
            <div class="global-search-header" id="globalSearchHeader" style="display: none;">
              <span>Show all results for <strong id="globalSearchQuery"></strong></span>
            </div>
            <div class="global-search-loading" id="globalSearchLoading" style="display: none;">
              <div class="search-spinner"></div>
              Searching...
            </div>
            <div class="global-search-results" id="globalSearchResults"></div>
            <div class="global-search-empty" id="globalSearchEmpty" style="display: none;">
              No results found
            </div>
            <div class="global-search-hint" id="globalSearchHint">
              Type to search clients, practitioners, services...
            </div>
          </div>
        </div>
        <div class="utility-divider"></div>
        <div class="utility-add-group">
          <span class="utility-add-label">Add:</span>
          <button class="utility-add-btn" onclick="openCreateCustomerModal && openCreateCustomerModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            Customer
          </button>
          <button class="utility-add-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <polyline points="17 11 19 13 23 9"></polyline>
            </svg>
            Lead
          </button>
        </div>
      </div>

      <div class="utility-bar-right">
        <a href="/pos" class="utility-btn ${activePage === 'pos' ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          POS
        </a>
        <a href="/appointments" class="utility-btn utility-btn-primary ${activePage === 'schedule' ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Schedule
        </a>
        <div class="utility-divider"></div>
        <button class="utility-notification-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </button>
        <div class="utility-user-dropdown">
          <button class="utility-user-menu" onclick="toggleUtilityUserMenu()">
            <div class="utility-user-avatar">${initials}</div>
            <span class="utility-user-name">${displayName}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div class="utility-user-dropdown-menu" id="utilityUserDropdownMenu">
            <a href="/account" class="utility-dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Manage account
            </a>
            <div class="utility-dropdown-divider"></div>
            <a href="#" class="utility-dropdown-item" onclick="utilityBarSignOut()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Sign Out
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Find the utility bar container or create one
  let container = document.getElementById('utilityBarContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'utilityBarContainer';
    // Insert at the beginning of body or main content
    const mainContent = document.querySelector('.main-content, .page-container, .dashboard-layout, body > div:first-child, body');
    if (mainContent && mainContent !== document.body) {
      mainContent.insertBefore(container, mainContent.firstChild);
    } else {
      document.body.insertBefore(container, document.body.firstChild);
    }
  }

  container.innerHTML = utilityBarHTML;

  // Initialize global search event listeners
  initGlobalSearch();

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.utility-user-dropdown')) {
      const menu = document.getElementById('utilityUserDropdownMenu');
      if (menu) menu.classList.remove('show');
    }
    // Close search dropdown when clicking outside
    if (!e.target.closest('.global-search-wrapper')) {
      hideGlobalSearchDropdown();
    }
  });
}

// ============================================
// GLOBAL SEARCH FUNCTIONS
// ============================================

function initGlobalSearch() {
  const input = document.getElementById('globalSearchInput');
  if (!input) return;

  // Input handler with debounce
  input.addEventListener('input', (e) => {
    handleGlobalSearch(e.target.value);
  });

  // Focus handler
  input.addEventListener('focus', () => {
    showGlobalSearchDropdown();
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideGlobalSearchDropdown();
      input.blur();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      navigateSearchResults(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter') {
      const selected = document.querySelector('.global-search-item.selected');
      if (selected) {
        selected.click();
      }
    }
  });

  // Global keyboard shortcut (S key when not in input)
  document.addEventListener('keydown', (e) => {
    if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const activeElement = document.activeElement;
      const isInputField = activeElement.tagName === 'INPUT' ||
                          activeElement.tagName === 'TEXTAREA' ||
                          activeElement.isContentEditable;
      if (!isInputField) {
        e.preventDefault();
        input.focus();
        showGlobalSearchDropdown();
      }
    }
  });
}

function showGlobalSearchDropdown() {
  const dropdown = document.getElementById('globalSearchDropdown');
  if (dropdown) {
    dropdown.classList.add('show');
  }
}

function hideGlobalSearchDropdown() {
  const dropdown = document.getElementById('globalSearchDropdown');
  if (dropdown) {
    dropdown.classList.remove('show');
  }
}

async function handleGlobalSearch(query) {
  // Clear previous timeout
  if (globalSearchTimeout) {
    clearTimeout(globalSearchTimeout);
  }

  const loading = document.getElementById('globalSearchLoading');
  const results = document.getElementById('globalSearchResults');
  const empty = document.getElementById('globalSearchEmpty');
  const hint = document.getElementById('globalSearchHint');
  const header = document.getElementById('globalSearchHeader');
  const querySpan = document.getElementById('globalSearchQuery');

  if (!query || query.length < 2) {
    if (loading) loading.style.display = 'none';
    if (results) results.innerHTML = '';
    if (empty) empty.style.display = 'none';
    if (hint) hint.style.display = 'block';
    if (header) header.style.display = 'none';
    return;
  }

  // Show loading
  if (hint) hint.style.display = 'none';
  if (loading) loading.style.display = 'flex';
  if (empty) empty.style.display = 'none';
  if (header) {
    header.style.display = 'flex';
    if (querySpan) querySpan.textContent = query;
  }

  // Debounce the search
  globalSearchTimeout = setTimeout(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      globalSearchResults = await response.json();
      renderSearchResults(globalSearchResults, query);
    } catch (error) {
      console.error('Search error:', error);
      if (results) results.innerHTML = '<div class="search-error">Search failed. Please try again.</div>';
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }, 300);
}

function renderSearchResults(data, query) {
  const results = document.getElementById('globalSearchResults');
  const empty = document.getElementById('globalSearchEmpty');

  if (!results) return;

  const { clients, staff, services, appointments } = data;
  const hasResults = clients.length || staff.length || services.length || appointments.length;

  if (!hasResults) {
    results.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';

  let html = '';

  // Clients section
  if (clients.length > 0) {
    html += `
      <div class="search-section">
        <div class="search-section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Clients
        </div>
        ${clients.map(client => `
          <a href="/client-profile?id=${client.id}" class="global-search-item" data-type="client">
            <div class="search-item-avatar">${(client.first_name?.[0] || '') + (client.last_name?.[0] || '')}</div>
            <div class="search-item-content">
              <div class="search-item-name">${highlightMatch(client.first_name + ' ' + client.last_name, query)}</div>
              <div class="search-item-meta">${client.email || ''}</div>
            </div>
          </a>
        `).join('')}
      </div>
    `;
  }

  // Staff/Practitioners section
  if (staff.length > 0) {
    html += `
      <div class="search-section">
        <div class="search-section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Practitioners
        </div>
        ${staff.map(s => `
          <a href="/practitioner-detail?id=${s.id}" class="global-search-item" data-type="staff">
            <div class="search-item-avatar staff">${(s.first_name?.[0] || '') + (s.last_name?.[0] || '')}</div>
            <div class="search-item-content">
              <div class="search-item-name">${highlightMatch(s.first_name + ' ' + s.last_name, query)}</div>
              <div class="search-item-meta">${s.email || ''}</div>
            </div>
          </a>
        `).join('')}
      </div>
    `;
  }

  // Services section
  if (services.length > 0) {
    html += `
      <div class="search-section">
        <div class="search-section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          Services
        </div>
        ${services.map(service => `
          <a href="/service-detail?id=${service.id}" class="global-search-item" data-type="service">
            <div class="search-item-icon service">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </div>
            <div class="search-item-content">
              <div class="search-item-name">${highlightMatch(service.name, query)}</div>
              <div class="search-item-meta">ZAR ${parseFloat(service.price || 0).toFixed(2)} · ${service.duration_minutes || 60} min</div>
            </div>
          </a>
        `).join('')}
      </div>
    `;
  }

  // Appointments section
  if (appointments.length > 0) {
    html += `
      <div class="search-section">
        <div class="search-section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Appointments
        </div>
        ${appointments.map(apt => {
          const date = new Date(apt.start_time);
          const dateStr = date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' });
          const timeStr = date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
          return `
            <a href="/appointments?date=${date.toISOString().split('T')[0]}" class="global-search-item" data-type="appointment">
              <div class="search-item-icon appointment">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div class="search-item-content">
                <div class="search-item-name">${highlightMatch(apt.title || 'Appointment', query)}</div>
                <div class="search-item-meta">${apt.client_first_name ? apt.client_first_name + ' ' + apt.client_last_name + ' · ' : ''}${dateStr}, ${timeStr}</div>
              </div>
            </a>
          `;
        }).join('')}
      </div>
    `;
  }

  results.innerHTML = html;
}

function highlightMatch(text, query) {
  if (!query || !text) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function navigateSearchResults(direction) {
  const items = document.querySelectorAll('.global-search-item');
  if (!items.length) return;

  const current = document.querySelector('.global-search-item.selected');
  let index = -1;

  if (current) {
    current.classList.remove('selected');
    index = Array.from(items).indexOf(current);
  }

  index += direction;
  if (index < 0) index = items.length - 1;
  if (index >= items.length) index = 0;

  items[index].classList.add('selected');
  items[index].scrollIntoView({ block: 'nearest' });
}

function toggleUtilityUserMenu() {
  const menu = document.getElementById('utilityUserDropdownMenu');
  if (menu) {
    menu.classList.toggle('show');
  }
}

function utilityBarSignOut() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

// CSS for the utility bar
function injectUtilityBarStyles() {
  if (document.getElementById('utilityBarStyles')) return;

  const styles = document.createElement('style');
  styles.id = 'utilityBarStyles';
  styles.textContent = `
    .global-utility-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 24px;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .utility-bar-left,
    .utility-bar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Global Search Styles */
    .global-search-wrapper {
      position: relative;
    }

    .global-search-input-container {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: #f3f4f6;
      border: 1px solid transparent;
      border-radius: 8px;
      width: 280px;
      transition: all 0.15s;
    }

    .global-search-input-container:focus-within {
      background: white;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .global-search-icon {
      width: 16px;
      height: 16px;
      color: #9ca3af;
      flex-shrink: 0;
    }

    .global-search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.875rem;
      color: #374151;
      outline: none;
    }

    .global-search-input::placeholder {
      color: #9ca3af;
    }

    .global-search-shortcut {
      padding: 2px 6px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-family: system-ui, sans-serif;
      color: #9ca3af;
    }

    .global-search-dropdown {
      display: none;
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: 420px;
      max-height: 480px;
      overflow-y: auto;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      z-index: 1001;
    }

    .global-search-dropdown.show {
      display: block;
    }

    .global-search-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: #6366f1;
      color: white;
      font-size: 0.875rem;
      border-radius: 11px 11px 0 0;
    }

    .global-search-header strong {
      margin-left: 4px;
    }

    .global-search-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 16px;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .search-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e5e7eb;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .global-search-hint {
      padding: 20px 16px;
      color: #9ca3af;
      font-size: 0.875rem;
      text-align: center;
    }

    .global-search-empty {
      padding: 20px 16px;
      color: #6b7280;
      font-size: 0.875rem;
      text-align: center;
    }

    .search-error {
      padding: 16px;
      color: #dc2626;
      font-size: 0.875rem;
      text-align: center;
    }

    .search-section {
      border-bottom: 1px solid #f3f4f6;
    }

    .search-section:last-child {
      border-bottom: none;
    }

    .search-section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #f9fafb;
    }

    .search-section-header svg {
      width: 14px;
      height: 14px;
    }

    .global-search-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
      transition: background 0.1s;
    }

    .global-search-item:hover,
    .global-search-item.selected {
      background: #f3f4f6;
    }

    .search-item-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #6366f1;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .search-item-avatar.staff {
      background: #0d9488;
    }

    .search-item-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .search-item-icon svg {
      width: 18px;
      height: 18px;
      color: #6b7280;
    }

    .search-item-icon.service {
      background: #fef3c7;
    }

    .search-item-icon.service svg {
      color: #d97706;
    }

    .search-item-icon.appointment {
      background: #dbeafe;
    }

    .search-item-icon.appointment svg {
      color: #2563eb;
    }

    .search-item-content {
      flex: 1;
      min-width: 0;
    }

    .search-item-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: #111827;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .search-item-name mark {
      background: #fef08a;
      color: inherit;
      padding: 0 2px;
      border-radius: 2px;
    }

    .search-item-meta {
      font-size: 0.75rem;
      color: #6b7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .utility-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: white;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s;
    }

    .utility-btn:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }

    .utility-btn svg {
      width: 16px;
      height: 16px;
    }

    .utility-btn-primary {
      background: #7c3aed;
      border-color: #7c3aed;
      color: white;
    }

    .utility-btn-primary:hover {
      background: #6d28d9;
      border-color: #6d28d9;
    }

    .utility-btn.active {
      background: #7c3aed;
      border-color: #7c3aed;
      color: white;
    }

    .utility-divider {
      width: 1px;
      height: 24px;
      background: #e5e7eb;
      margin: 0 4px;
    }

    .utility-add-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .utility-add-label {
      font-size: 0.8125rem;
      color: #6b7280;
    }

    .utility-add-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: white;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      transition: all 0.15s;
    }

    .utility-add-btn:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }

    .utility-add-btn svg {
      width: 16px;
      height: 16px;
    }

    .utility-notification-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.15s;
    }

    .utility-notification-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .utility-notification-btn svg {
      width: 20px;
      height: 20px;
    }

    .utility-user-dropdown {
      position: relative;
    }

    .utility-user-menu {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      transition: background 0.15s;
    }

    .utility-user-menu:hover {
      background: #f3f4f6;
    }

    .utility-user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #7c3aed;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .utility-user-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    .utility-user-menu svg {
      width: 16px;
      height: 16px;
      color: #9ca3af;
    }

    .utility-user-dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      min-width: 200px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: none;
      z-index: 1000;
    }

    .utility-user-dropdown-menu.show {
      display: block;
    }

    .utility-dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      color: #374151;
      text-decoration: none;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.15s;
    }

    .utility-dropdown-item:hover {
      background: #f9fafb;
    }

    .utility-dropdown-item svg {
      width: 18px;
      height: 18px;
      color: #6b7280;
    }

    .utility-dropdown-divider {
      height: 1px;
      background: #e5e7eb;
      margin: 4px 0;
    }

    .feedback-btn {
      color: #7c3aed;
      border-color: #e9d5ff;
    }

    .feedback-btn:hover {
      background: #faf5ff;
      border-color: #d8b4fe;
    }

    /* Responsive adjustments */
    @media (max-width: 1024px) {
      .global-search-input-container {
        width: 200px;
      }
      .global-search-dropdown {
        width: 350px;
      }
    }

    @media (max-width: 768px) {
      .global-search-wrapper {
        display: none;
      }
      .utility-add-group {
        display: none;
      }
    }
  `;
  document.head.appendChild(styles);
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectUtilityBarStyles();
  });
} else {
  injectUtilityBarStyles();
}
