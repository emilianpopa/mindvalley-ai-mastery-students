/**
 * Protocol Templates JavaScript
 * Handles template listing, search, and management
 */

const API_BASE = window.location.origin;

// DOM Elements
const templatesGrid = document.getElementById('templatesGrid');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const sortBy = document.getElementById('sortBy');
const pagination = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// Stats
const totalTemplatesEl = document.getElementById('totalTemplates');
const activeProtocolsEl = document.getElementById('activeProtocols');
const mostUsedTemplateEl = document.getElementById('mostUsedTemplate');
const totalCategoriesEl = document.getElementById('totalCategories');

// State
let currentPage = 1;
let totalPages = 1;
let searchTimeout;

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

// Format duration
function formatDuration(weeks) {
  if (!weeks) return 'Flexible';
  return weeks === 1 ? '1 week' : `${weeks} weeks`;
}

// Create template card
function createTemplateCard(template) {
  const card = document.createElement('div');
  card.className = 'template-card';
  card.onclick = () => viewTemplate(template.id);

  const modulesCount = template.modules ? (Array.isArray(template.modules) ? template.modules.length : JSON.parse(template.modules).length) : 0;

  card.innerHTML = `
    <div class="template-header">
      <div class="template-info">
        <h3 class="template-name">${template.name}</h3>
        <span class="template-category">${template.category}</span>
      </div>
      <div class="template-actions">
        <button class="btn-icon-only" onclick="event.stopPropagation(); editTemplate(${template.id})" title="Edit">
          ✏️
        </button>
        <button class="btn-icon-only btn-danger" onclick="event.stopPropagation(); deleteTemplate(${template.id}, '${template.name}')" title="Delete">
          🗑️
        </button>
      </div>
    </div>

    ${template.description ? `
      <p class="template-description">${template.description}</p>
    ` : ''}

    <div class="template-meta">
      <div class="meta-item">
        <span class="meta-icon">📋</span>
        <span><span class="meta-value">${modulesCount}</span> modules</span>
      </div>
      <div class="meta-item">
        <span class="meta-icon">📅</span>
        <span><span class="meta-value">${formatDuration(template.duration_weeks)}</span></span>
      </div>
    </div>

    <div class="template-footer">
      <div class="usage-badge">
        <span>👥</span>
        <span>Used by <span class="usage-count">${template.usage_count || 0}</span> clients</span>
      </div>
      <span class="template-date">${formatDate(template.created_at)}</span>
    </div>
  `;

  return card;
}

// Fetch and display templates
async function fetchTemplates() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    // Build query params
    const params = new URLSearchParams({
      page: currentPage,
      limit: 12,
      sortBy: sortBy.value,
      sortOrder: 'DESC'
    });

    if (searchInput.value.trim()) {
      params.append('search', searchInput.value.trim());
    }

    if (categoryFilter.value) {
      params.append('category', categoryFilter.value);
    }

    const response = await fetch(`${API_BASE}/api/protocols/templates?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to load templates');
    }

    const data = await response.json();
    displayTemplates(data.templates, data.pagination);
    updateStats(data.templates);

  } catch (error) {
    console.error('Error fetching templates:', error);
    showError('Failed to load templates. Please try again.');
  }
}

// Display templates
function displayTemplates(templates, paginationData) {
  loadingState.style.display = 'none';

  if (templates.length === 0) {
    templatesGrid.style.display = 'none';
    emptyState.style.display = 'flex';
    pagination.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  templatesGrid.style.display = 'grid';
  templatesGrid.innerHTML = '';

  templates.forEach(template => {
    templatesGrid.appendChild(createTemplateCard(template));
  });

  // Update pagination
  totalPages = paginationData.totalPages;
  updatePagination(paginationData);
}

// Update pagination controls
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
function updateStats(templates) {
  totalTemplatesEl.textContent = templates.length;

  // Calculate active protocols (sum of usage_count) - parse as int since DB returns string
  const totalUsage = templates.reduce((sum, t) => sum + (parseInt(t.usage_count) || 0), 0);
  activeProtocolsEl.textContent = totalUsage;

  // Find most used template
  if (templates.length > 0) {
    const mostUsed = templates.reduce((max, t) =>
      (parseInt(t.usage_count) || 0) > (parseInt(max.usage_count) || 0) ? t : max
    );
    mostUsedTemplateEl.textContent = mostUsed.name;
  } else {
    mostUsedTemplateEl.textContent = '-';
  }

  // Count unique categories
  const categories = new Set(templates.map(t => t.category));
  totalCategoriesEl.textContent = categories.size;
}

// View template
function viewTemplate(id) {
  window.location.href = `/protocol-templates/${id}/edit`;
}

// Edit template
function editTemplate(id) {
  window.location.href = `/protocol-templates/${id}/edit`;
}

// Delete template
async function deleteTemplate(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"?\n\nThis cannot be undone. Templates in use by clients cannot be deleted.`)) {
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/protocols/templates/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      alert('Template deleted successfully');
      fetchTemplates();
    } else {
      alert(data.message || data.error || 'Failed to delete template');
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    alert('Failed to delete template. Please try again.');
  }
}

// Show error
function showError(message) {
  loadingState.style.display = 'none';
  templatesGrid.style.display = 'none';
  emptyState.style.display = 'flex';
  emptyState.innerHTML = `
    <div class="empty-icon">⚠️</div>
    <h3>Error Loading Templates</h3>
    <p>${message}</p>
    <button class="btn-primary" onclick="location.reload()">Retry</button>
  `;
}

// Search with debounce
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage = 1;
    fetchTemplates();
  }, 500);
}

// Filter change
function handleFilterChange() {
  currentPage = 1;
  fetchTemplates();
}

// Pagination
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    fetchTemplates();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    fetchTemplates();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchTemplates();

  // Event listeners
  searchInput.addEventListener('input', handleSearch);
  categoryFilter.addEventListener('change', handleFilterChange);
  sortBy.addEventListener('change', handleFilterChange);
  prevPageBtn.addEventListener('click', previousPage);
  nextPageBtn.addEventListener('click', nextPage);
});
