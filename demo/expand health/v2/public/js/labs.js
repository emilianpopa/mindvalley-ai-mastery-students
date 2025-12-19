/**
 * Labs & Tests JavaScript
 * Handles lab listing, filtering, and management
 */

const API_BASE = window.location.origin;

// State
let currentPage = 1;
let currentSearch = '';
let currentClientId = '';
let currentType = '';
let totalPages = 1;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clientFilter = document.getElementById('clientFilter');
const typeFilter = document.getElementById('typeFilter');
const labsTableBody = document.getElementById('labsTableBody');
const pagination = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const paginationInfo = document.getElementById('paginationInfo');

// Stats elements
const totalLabsEl = document.getElementById('totalLabs');
const monthLabsEl = document.getElementById('monthLabs');
const aiSummaryCountEl = document.getElementById('aiSummaryCount');

// Format date
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format file size
function formatFileSize(bytes) {
  if (!bytes) return '-';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB`;
}

// Fetch clients for filter dropdown
async function fetchClients() {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/clients?limit=1000&status=active`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return;

    const data = await response.json();
    populateClientFilter(data.clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
  }
}

// Populate client filter dropdown
function populateClientFilter(clients) {
  clientFilter.innerHTML = '<option value="">All Clients</option>';
  clients.forEach(client => {
    const option = document.createElement('option');
    option.value = client.id;
    option.textContent = `${client.first_name} ${client.last_name}`;
    clientFilter.appendChild(option);
  });
}

// Fetch labs
async function fetchLabs() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const params = new URLSearchParams({
      page: currentPage,
      limit: 20,
      search: currentSearch
    });

    if (currentClientId) {
      params.append('client_id', currentClientId);
    }

    if (currentType) {
      params.append('lab_type', currentType);
    }

    const response = await fetch(`${API_BASE}/api/labs?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch labs');
    }

    const data = await response.json();
    displayLabs(data.labs);
    updatePagination(data.pagination);
    updateStats(data.labs);

  } catch (error) {
    console.error('Error fetching labs:', error);
    showError('Failed to load labs. Please try again.');
  }
}

// Display labs in table
function displayLabs(labs) {
  if (labs.length === 0) {
    labsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <h3>No labs found</h3>
          <p>Upload a lab result to get started</p>
        </td>
      </tr>
    `;
    pagination.style.display = 'none';
    return;
  }

  pagination.style.display = 'flex';

  labsTableBody.innerHTML = labs.map(lab => `
    <tr>
      <td>
        <a href="/clients/${lab.client_id}" class="client-link">
          ${lab.client_name || 'Unknown Client'}
        </a>
      </td>
      <td>${lab.title || '-'}</td>
      <td><span class="type-badge">${lab.lab_type || 'General'}</span></td>
      <td class="date-display">${formatDate(lab.test_date)}</td>
      <td class="file-size">${formatFileSize(lab.file_size)}</td>
      <td class="date-display">${formatDate(lab.created_at)}</td>
      <td>
        ${lab.ai_summary
          ? '<span class="ai-badge has-summary">✨ Yes</span>'
          : '<span class="ai-badge no-summary">-</span>'}
      </td>
      <td>
        <div class="action-btns">
          <a href="/labs/${lab.id}" class="action-btn">View</a>
          <button onclick="deleteLab(${lab.id})" class="action-btn danger">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Update pagination
function updatePagination(paginationData) {
  currentPage = paginationData.page;
  totalPages = paginationData.totalPages;

  paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Update stats
function updateStats(labs) {
  // Total labs
  totalLabsEl.textContent = labs.length;

  // This month
  const now = new Date();
  const thisMonth = labs.filter(lab => {
    const labDate = new Date(lab.created_at);
    return labDate.getMonth() === now.getMonth() &&
           labDate.getFullYear() === now.getFullYear();
  }).length;
  monthLabsEl.textContent = thisMonth;

  // AI summaries
  const withAI = labs.filter(lab => lab.ai_summary).length;
  aiSummaryCountEl.textContent = withAI;
}

// Show error
function showError(message) {
  labsTableBody.innerHTML = `
    <tr>
      <td colspan="8" class="empty-state">
        <h3>Error</h3>
        <p>${message}</p>
      </td>
    </tr>
  `;
}

// Delete lab
async function deleteLab(labId) {
  if (!confirm('Are you sure you want to delete this lab result? This cannot be undone.')) {
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/labs/${labId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      alert('Lab deleted successfully');
      fetchLabs(); // Refresh list
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete lab');
    }
  } catch (error) {
    console.error('Error deleting lab:', error);
    alert('Failed to delete lab. Please try again.');
  }
}

// Make deleteLab available globally
window.deleteLab = deleteLab;

// Search with debounce
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentSearch = e.target.value;
    currentPage = 1;
    fetchLabs();
  }, 300);
});

// Client filter
clientFilter.addEventListener('change', (e) => {
  currentClientId = e.target.value;
  currentPage = 1;
  fetchLabs();
});

// Type filter
typeFilter.addEventListener('change', (e) => {
  currentType = e.target.value;
  currentPage = 1;
  fetchLabs();
});

// Pagination
prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    fetchLabs();
  }
});

nextPageBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    fetchLabs();
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchClients();
  fetchLabs();
});
