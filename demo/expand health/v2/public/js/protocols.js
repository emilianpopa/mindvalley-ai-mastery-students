/**
 * Client Protocols JavaScript
 * Handles protocol assignment and management
 */

const API_BASE = window.location.origin;

// DOM Elements
const protocolsTableBody = document.getElementById('protocolsTableBody');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const templateFilter = document.getElementById('templateFilter');
const pagination = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// Stats
const activeProtocolsEl = document.getElementById('activeProtocols');
const completedProtocolsEl = document.getElementById('completedProtocols');
const clientsCountEl = document.getElementById('clientsCount');
const startingThisWeekEl = document.getElementById('startingThisWeek');

// Modal
const assignModal = document.getElementById('assignModal');
const clientSelect = document.getElementById('clientSelect');
const templateSelect = document.getElementById('templateSelect');
const startDateInput = document.getElementById('startDate');
const protocolNotesTextarea = document.getElementById('protocolNotes');
const templateInfo = document.getElementById('templateInfo');
const assignBtn = document.getElementById('assignBtn');

// State
let currentPage = 1;
let totalPages = 1;
let searchTimeout;
let clients = [];
let templates = [];

// Format date
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Calculate progress
function calculateProgress(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (now < start) return 0;
  if (now > end) return 100;

  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
}

// Create protocol row
function createProtocolRow(protocol) {
  const progress = calculateProgress(protocol.start_date, protocol.end_date);

  return `
    <tr>
      <td>
        <div class="client-cell">
          <img
            src="https://ui-avatars.com/api/?name=${encodeURIComponent(protocol.client_name)}&background=0F766E&color=fff"
            alt="${protocol.client_name}"
            class="client-avatar"
          >
          <div class="client-info">
            <div class="client-name">${protocol.client_name}</div>
            <div class="client-email">${protocol.client_email || ''}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="protocol-name">${protocol.template_name}</div>
        <span class="protocol-category">${protocol.template_category}</span>
      </td>
      <td>${protocol.template_category}</td>
      <td>${formatDate(protocol.start_date)}</td>
      <td>${formatDate(protocol.end_date)}</td>
      <td>
        <span class="status-badge ${protocol.status}">
          ${protocol.status === 'active' ? '✅' : protocol.status === 'completed' ? '🎉' : protocol.status === 'paused' ? '⏸️' : '📁'}
          ${protocol.status.charAt(0).toUpperCase() + protocol.status.slice(1)}
        </span>
      </td>
      <td class="progress-cell">
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-text">${progress}% complete</div>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-action" onclick="viewProtocol(${protocol.id})" title="View details">
            👁️ View
          </button>
          <button class="btn-action" onclick="generateRecommendations(${protocol.id})" title="AI recommendations">
            ✨ AI
          </button>
        </div>
      </td>
    </tr>
  `;
}

// Fetch and display protocols
async function fetchProtocols() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    // Build query params
    const params = new URLSearchParams({
      page: currentPage,
      limit: 20
    });

    if (searchInput.value.trim()) {
      // Note: Backend needs to support client name search
      params.append('search', searchInput.value.trim());
    }

    if (statusFilter.value) {
      params.append('status', statusFilter.value);
    }

    if (templateFilter.value) {
      params.append('template_id', templateFilter.value);
    }

    const response = await fetch(`${API_BASE}/api/protocols?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to load protocols');
    }

    const data = await response.json();
    displayProtocols(data.protocols, data.pagination);
    updateStats(data.protocols);

  } catch (error) {
    console.error('Error fetching protocols:', error);
    showError('Failed to load protocols. Please try again.');
  }
}

// Display protocols
function displayProtocols(protocols, paginationData) {
  loadingState.style.display = 'none';

  if (protocols.length === 0) {
    document.querySelector('.table-container').style.display = 'none';
    emptyState.style.display = 'flex';
    pagination.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  document.querySelector('.table-container').style.display = 'block';
  protocolsTableBody.innerHTML = protocols.map(protocol => createProtocolRow(protocol)).join('');

  // Update pagination
  totalPages = paginationData.totalPages;
  updatePagination(paginationData);
}

// Update pagination
function updatePagination(data) {
  if (data.totalPages <= 1) {
    pagination.style.display = 'none';
    return;
  }

  pagination.style.display = 'flex';
  pageInfo.textContent = `Page ${data.page} of ${data.totalPages}`;
  prevPageBtn.disabled = data.page === 1;
  nextPageBtn.disabled = data.page === data.totalPages;
}

// Update stats
function updateStats(protocols) {
  const active = protocols.filter(p => p.status === 'active').length;
  const completed = protocols.filter(p => p.status === 'completed').length;
  const uniqueClients = new Set(protocols.map(p => p.client_id)).size;

  // Starting this week
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startingThisWeek = protocols.filter(p => {
    const startDate = new Date(p.start_date);
    return startDate >= weekAgo && startDate <= now;
  }).length;

  activeProtocolsEl.textContent = active;
  completedProtocolsEl.textContent = completed;
  clientsCountEl.textContent = uniqueClients;
  startingThisWeekEl.textContent = startingThisWeek;
}

// Load clients and templates for modal
async function loadClientsAndTemplates() {
  try {
    const token = localStorage.getItem('auth_token');

    // Load clients
    const clientsResponse = await fetch(`${API_BASE}/api/clients?limit=1000`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const clientsData = await clientsResponse.json();
    clients = clientsData.clients || [];

    clientSelect.innerHTML = '<option value="">Select a client...</option>' +
      clients.map(c => `<option value="${c.id}">${c.first_name} ${c.last_name}</option>`).join('');

    // Load templates
    const templatesResponse = await fetch(`${API_BASE}/api/protocols/templates?limit=1000`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const templatesData = await templatesResponse.json();
    templates = templatesData.templates || [];

    templateSelect.innerHTML = '<option value="">Select a template...</option>' +
      templates.map(t => `<option value="${t.id}">${t.name} (${t.category})</option>`).join('');

    // Also populate template filter
    templateFilter.innerHTML = '<option value="">All Templates</option>' +
      templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

  } catch (error) {
    console.error('Error loading clients/templates:', error);
  }
}

// Open assign modal
function openAssignModal() {
  if (clients.length === 0 || templates.length === 0) {
    loadClientsAndTemplates();
  }

  // Set default start date to today
  startDateInput.value = new Date().toISOString().split('T')[0];

  assignModal.style.display = 'flex';
}

// Close assign modal
function closeAssignModal() {
  assignModal.style.display = 'none';
  clientSelect.value = '';
  templateSelect.value = '';
  startDateInput.value = '';
  protocolNotesTextarea.value = '';
  templateInfo.textContent = '';
}

// Show template info when selected
templateSelect.addEventListener('change', (e) => {
  const templateId = parseInt(e.target.value);
  const template = templates.find(t => t.id === templateId);

  if (template) {
    const duration = template.duration_weeks ? `${template.duration_weeks} weeks` : 'Flexible duration';
    const modules = Array.isArray(template.modules) ? template.modules.length : JSON.parse(template.modules || '[]').length;
    templateInfo.textContent = `${duration} • ${modules} modules • ${template.category}`;
  } else {
    templateInfo.textContent = '';
  }
});

// Assign protocol
async function assignProtocol() {
  try {
    const clientId = clientSelect.value;
    const templateId = templateSelect.value;
    const startDate = startDateInput.value;
    const notes = protocolNotesTextarea.value.trim();

    // Validation
    if (!clientId) {
      alert('Please select a client');
      return;
    }

    if (!templateId) {
      alert('Please select a protocol template');
      return;
    }

    if (!startDate) {
      alert('Please select a start date');
      return;
    }

    // Disable button
    assignBtn.disabled = true;
    assignBtn.innerHTML = '<span>💾</span><span>Assigning...</span>';

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/protocols`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: parseInt(clientId),
        template_id: parseInt(templateId),
        start_date: startDate,
        notes: notes || null
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert('Protocol assigned successfully!');
      closeAssignModal();
      fetchProtocols();
    } else {
      throw new Error(data.error || 'Failed to assign protocol');
    }

  } catch (error) {
    console.error('Error assigning protocol:', error);
    alert(error.message || 'Failed to assign protocol. Please try again.');
  } finally {
    assignBtn.disabled = false;
    assignBtn.innerHTML = '<span>💾</span><span>Assign Protocol</span>';
  }
}

// View protocol details
function viewProtocol(id) {
  window.location.href = `/protocols/${id}`;
}

// Generate AI recommendations
async function generateRecommendations(id) {
  if (!confirm('Generate AI recommendations for this protocol? This will analyze the client\'s health data and suggest optimizations.')) {
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/protocols/${id}/generate-recommendations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok) {
      alert('AI recommendations generated!\n\n' + data.recommendations.substring(0, 200) + '...\n\nView full recommendations in the protocol details page.');
      viewProtocol(id);
    } else {
      throw new Error(data.error || 'Failed to generate recommendations');
    }

  } catch (error) {
    console.error('Error generating recommendations:', error);
    alert(error.message || 'Failed to generate AI recommendations.');
  }
}

// Search with debounce
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage = 1;
    fetchProtocols();
  }, 500);
}

// Filter change
function handleFilterChange() {
  currentPage = 1;
  fetchProtocols();
}

// Pagination
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    fetchProtocols();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    fetchProtocols();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Show error
function showError(message) {
  loadingState.style.display = 'none';
  document.querySelector('.table-container').style.display = 'none';
  emptyState.style.display = 'flex';
  emptyState.innerHTML = `
    <div class="empty-icon">⚠️</div>
    <h3>Error Loading Protocols</h3>
    <p>${message}</p>
    <button class="btn-primary" onclick="location.reload()">Retry</button>
  `;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchProtocols();
  loadClientsAndTemplates();

  // Event listeners
  searchInput.addEventListener('input', handleSearch);
  statusFilter.addEventListener('change', handleFilterChange);
  templateFilter.addEventListener('change', handleFilterChange);
  prevPageBtn.addEventListener('click', previousPage);
  nextPageBtn.addEventListener('click', nextPage);

  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && assignModal.style.display === 'flex') {
      closeAssignModal();
    }
  });
});
