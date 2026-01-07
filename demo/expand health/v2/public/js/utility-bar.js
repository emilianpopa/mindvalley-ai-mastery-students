/**
 * Global Utility Bar Component
 * Injects the top utility bar on all pages
 */

function initUtilityBar(activePage = '') {
  // Get current user info from localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { first_name: 'User', last_name: '', email: 'user@expand.health' };
  const initials = ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || 'U';
  const displayName = `${user.first_name || 'User'} ${(user.last_name || '')[0] || ''}.`;

  const utilityBarHTML = `
    <div class="global-utility-bar">
      <div class="utility-bar-left">
        <button class="utility-btn feedback-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Feedback
        </button>
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

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.utility-user-dropdown')) {
      const menu = document.getElementById('utilityUserDropdownMenu');
      if (menu) menu.classList.remove('show');
    }
  });
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
