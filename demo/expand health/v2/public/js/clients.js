/**
 * Clients Page JavaScript
 * Handles client list, search, filter, and pagination
 */

const API_BASE = window.location.origin;

// State
let currentPage = 1;
let totalPages = 1;
let currentSearch = '';
let currentStatus = 'all';
let currentSort = { field: 'created_at', order: 'DESC' };

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clientsTableBody = document.getElementById('clientsTableBody');
const pagination = document.getElementById('pagination');
const pageInfo = document.getElementById('pageInfo');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const emptyState = document.getElementById('emptyState');
const addClientBtn = document.getElementById('addClientBtn');

// Fetch clients from API
async function fetchClients() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const params = new URLSearchParams({
      page: currentPage,
      limit: 20,
      search: currentSearch,
      status: currentStatus === 'all' ? '' : currentStatus,
      sortBy: currentSort.field,
      sortOrder: currentSort.order
    });

    const response = await fetch(`${API_BASE}/api/clients?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch clients');
    }

    const data = await response.json();
    displayClients(data.clients);
    updatePagination(data.pagination);

  } catch (error) {
    console.error('Error fetching clients:', error);
    showError('Failed to load clients. Please try again.');
  }
}

// Display clients in table
function displayClients(clients) {
  if (clients.length === 0) {
    clientsTableBody.innerHTML = '';
    pagination.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  pagination.style.display = 'flex';

  clientsTableBody.innerHTML = clients.map(client => {
    const initials = getInitials(client.first_name, client.last_name);
    const avatarColor = getAvatarColor(client.id);
    const fullName = `${escapeHtml(client.first_name)} ${escapeHtml(client.last_name)}`;
    const genderAge = formatGenderAge(client.gender, client.date_of_birth);
    const programStatus = client.status === 'active';
    const bioClockEnabled = client.bio_clock_integration !== false;
    const dateCreated = formatDateShort(client.created_at);
    const lastLogin = client.last_login ? formatRelativeTime(client.last_login) : '-';

    return `
      <tr onclick="viewClient(${client.id})" style="cursor: pointer;">
        <td>
          <div class="client-cell">
            <div class="client-avatar placeholder" style="background: ${avatarColor};">
              ${initials}
            </div>
            <div class="client-info">
              <span class="client-name">${fullName}</span>
              <span class="client-meta">${genderAge}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="status-badge ${programStatus ? 'active' : 'inactive'}">
            ${programStatus ? '✓' : '✕'}
          </span>
        </td>
        <td>
          <span class="integration-badge ${bioClockEnabled ? 'enabled' : 'disabled'}">
            ${bioClockEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </td>
        <td>${dateCreated}</td>
        <td>${lastLogin}</td>
        <td>
          <div class="action-buttons" onclick="event.stopPropagation();">
            <button class="action-btn" onclick="viewClient(${client.id})" title="View">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </button>
            <button class="action-btn delete-btn" onclick="deleteClient(${client.id}, '${escapeHtml(fullName)}')" title="Archive">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            <div class="more-menu-wrapper">
              <button class="more-btn" onclick="toggleMoreMenu(event, ${client.id})" title="More">⋮</button>
              <div class="more-menu" id="moreMenu-${client.id}">
                <button class="more-menu-item" onclick="editClient(${client.id})">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Edit Client
                </button>
                <button class="more-menu-item" onclick="viewClientLabs(${client.id})">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  View Labs
                </button>
                <button class="more-menu-item" onclick="viewClientProtocols(${client.id})">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                  View Protocols
                </button>
                <div class="more-menu-divider"></div>
                <button class="more-menu-item danger" onclick="deleteClient(${client.id}, '${escapeHtml(fullName)}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Archive Client
                </button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Get initials from name
function getInitials(firstName, lastName) {
  const first = (firstName || '').charAt(0).toUpperCase();
  const last = (lastName || '').charAt(0).toUpperCase();
  return first + last || '??';
}

// Get consistent avatar color based on ID
function getAvatarColor(id) {
  const colors = [
    '#0F766E', '#7C3AED', '#DB2777', '#EA580C', '#2563EB',
    '#059669', '#8B5CF6', '#EC4899', '#F59E0B', '#3B82F6'
  ];
  return colors[id % colors.length];
}

// Format gender and age
function formatGenderAge(gender, dateOfBirth) {
  const parts = [];

  if (gender) {
    parts.push(gender.charAt(0).toUpperCase() + gender.slice(1));
  } else {
    parts.push('Unknown');
  }

  if (dateOfBirth) {
    const age = calculateAge(dateOfBirth);
    parts.push(`${age} yrs`);
  } else {
    parts.push('N/A yrs');
  }

  return parts.join(' | ');
}

// Calculate age from date of birth
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Format date short (e.g., "Sept 4, 2023")
function formatDateShort(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format relative time (e.g., "8 mo. ago")
function formatRelativeTime(dateString) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk. ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mo. ago`;
  return `${Math.floor(diffDays / 365)} yr. ago`;
}

// Update pagination
function updatePagination(paginationData) {
  currentPage = paginationData.page;
  totalPages = paginationData.totalPages;

  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Show error message
function showError(message) {
  clientsTableBody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align: center; padding: 40px; color: #EF4444;">
        ${escapeHtml(message)}
      </td>
    </tr>
  `;
}

// View client
function viewClient(id) {
  window.location.href = `/clients/${id}`;
}

// Edit client
function editClient(id) {
  window.location.href = `/clients/${id}/edit`;
}

// Toggle more options menu
function toggleMoreMenu(event, id) {
  event.stopPropagation();

  // Close all other open menus
  document.querySelectorAll('.more-menu.active').forEach(menu => {
    if (menu.id !== `moreMenu-${id}`) {
      menu.classList.remove('active');
    }
  });

  // Toggle this menu
  const menu = document.getElementById(`moreMenu-${id}`);
  if (menu) {
    menu.classList.toggle('active');
  }
}

// Close menus when clicking outside
document.addEventListener('click', function(event) {
  if (!event.target.closest('.more-menu-wrapper')) {
    document.querySelectorAll('.more-menu.active').forEach(menu => {
      menu.classList.remove('active');
    });
  }
});

// View client labs
function viewClientLabs(id) {
  window.location.href = `/clients/${id}#labs`;
}

// View client protocols
function viewClientProtocols(id) {
  window.location.href = `/clients/${id}#protocols`;
}

// Delete (archive) client
async function deleteClient(id, name) {
  if (!confirm(`Are you sure you want to archive ${name}? They will be moved to archived status.`)) {
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/clients/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      alert('Client archived successfully');
      fetchClients();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to archive client');
    }
  } catch (error) {
    console.error('Error archiving client:', error);
    alert('Failed to archive client. Please try again.');
  }
}

// Search handler with debounce
let searchTimeout;
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentSearch = searchInput.value.trim();
    currentPage = 1;
    fetchClients();
  }, 500);
}

// Sort handler
function handleSort(field) {
  if (currentSort.field === field) {
    currentSort.order = currentSort.order === 'ASC' ? 'DESC' : 'ASC';
  } else {
    currentSort.field = field;
    currentSort.order = 'ASC';
  }
  fetchClients();
}

// Pagination handlers
function goToPrevPage() {
  if (currentPage > 1) {
    currentPage--;
    fetchClients();
  }
}

function goToNextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    fetchClients();
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Search
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }

  // Pagination
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', goToPrevPage);
  }
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', goToNextPage);
  }

  // Add client button
  if (addClientBtn) {
    addClientBtn.addEventListener('click', () => {
      window.location.href = '/clients/new';
    });
  }

  // Sortable columns
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sortField = th.dataset.sort;
      if (sortField) {
        handleSort(sortField);
      }
    });
  });

  // Fetch clients
  fetchClients();
});

// Export functions for inline handlers
window.viewClient = viewClient;
window.editClient = editClient;
window.deleteClient = deleteClient;
window.toggleMoreMenu = toggleMoreMenu;
window.viewClientLabs = viewClientLabs;
window.viewClientProtocols = viewClientProtocols;
