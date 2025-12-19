/**
 * Form Responses Page
 */

let formId = null;
let formData = null;
let responses = [];
let filteredResponses = [];
let currentTab = 'clients';
let currentResponseId = null;
let sortField = 'date';
let sortDirection = 'desc';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Get form ID from URL
  const pathParts = window.location.pathname.split('/');
  formId = pathParts[2];

  if (!formId) {
    alert('Form ID not found');
    window.location.href = '/forms';
    return;
  }

  loadFormData();
  loadResponses();
});

// Load form data
async function loadFormData() {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/forms/templates/${formId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load form');
    }

    formData = await response.json();

    // Update publish button
    const publishBtn = document.getElementById('publishBtn');
    if (formData.status === 'published') {
      publishBtn.textContent = 'Published';
      publishBtn.classList.add('published');
    } else {
      publishBtn.textContent = 'Publish';
      publishBtn.classList.remove('published');
    }
  } catch (error) {
    console.error('Error loading form:', error);
  }
}

// Load responses
async function loadResponses() {
  try {
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('responsesTable').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/forms/submissions/${formId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load responses');
    }

    responses = await response.json();

    document.getElementById('loadingState').style.display = 'none';

    filterAndDisplayResponses();
  } catch (error) {
    console.error('Error loading responses:', error);
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'flex';
  }
}

// Filter and display responses based on current tab and search
function filterAndDisplayResponses() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();

  // Filter by tab (leads = not linked to client, clients = linked to client)
  filteredResponses = responses.filter(r => {
    if (currentTab === 'leads') {
      return !r.client_id;
    } else {
      return r.client_id;
    }
  });

  // Filter by search
  if (searchTerm) {
    filteredResponses = filteredResponses.filter(r => {
      const name = getResponderName(r).toLowerCase();
      const email = getResponderEmail(r).toLowerCase();
      return name.includes(searchTerm) || email.includes(searchTerm);
    });
  }

  // Sort
  filteredResponses.sort((a, b) => {
    let aVal, bVal;

    if (sortField === 'name') {
      aVal = getResponderName(a).toLowerCase();
      bVal = getResponderName(b).toLowerCase();
    } else if (sortField === 'email') {
      aVal = getResponderEmail(a).toLowerCase();
      bVal = getResponderEmail(b).toLowerCase();
    } else {
      aVal = new Date(a.submitted_at || a.created_at);
      bVal = new Date(b.submitted_at || b.created_at);
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Update count
  const countText = currentTab === 'leads' ? 'lead' : 'client';
  document.getElementById('responseCount').textContent =
    `${filteredResponses.length} ${countText} response${filteredResponses.length !== 1 ? 's' : ''}`;

  // Display
  if (filteredResponses.length === 0) {
    document.getElementById('responsesTable').style.display = 'none';
    document.getElementById('emptyState').style.display = 'flex';
  } else {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('responsesTable').style.display = 'block';
    renderResponsesTable();
  }
}

// Get responder name from response data
function getResponderName(response) {
  // First try client_name from the JOIN (best source)
  if (response.client_name && response.client_name.trim() && response.client_name.trim() !== 'Unknown') {
    return response.client_name;
  }

  // Then try response data fields
  const data = response.response_data || response.responses || response.data || {};

  // Handle if data is a string (JSON)
  const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

  // Try common name fields
  if (parsedData.full_name) return parsedData.full_name;
  if (parsedData.name) return parsedData.name;
  if (parsedData.fullName) return parsedData.fullName;
  if (parsedData['Full Name']) return parsedData['Full Name'];
  if (parsedData.first_name && parsedData.last_name) {
    return `${parsedData.first_name} ${parsedData.last_name}`;
  }
  if (parsedData.firstName && parsedData.lastName) {
    return `${parsedData.firstName} ${parsedData.lastName}`;
  }

  // Search through all fields for name-like values
  for (const [key, value] of Object.entries(parsedData)) {
    if (typeof value === 'string' && key.toLowerCase().includes('name') && !key.toLowerCase().includes('email')) {
      return value;
    }
  }

  // Use email prefix as fallback
  const email = getResponderEmail(response);
  if (email && email !== '-') {
    return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  return 'Anonymous';
}

// Get responder email from response data
function getResponderEmail(response) {
  // First try client_email from the JOIN (best source)
  if (response.client_email) return response.client_email;

  // Check verified_email (from OTP verification)
  if (response.verified_email) return response.verified_email;

  const data = response.response_data || response.responses || response.data || {};

  // Handle if data is a string (JSON)
  const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

  // Try common email fields
  if (parsedData.email) return parsedData.email;
  if (parsedData.email_address) return parsedData.email_address;
  if (parsedData.emailAddress) return parsedData.emailAddress;
  if (parsedData.Email) return parsedData.Email;
  if (parsedData['Email Address']) return parsedData['Email Address'];

  // Search through all fields for email-like values
  for (const [key, value] of Object.entries(parsedData)) {
    if (typeof value === 'string' && value.includes('@')) {
      return value;
    }
  }

  return '-';
}

// Render responses table
function renderResponsesTable() {
  const tbody = document.getElementById('responsesTableBody');

  tbody.innerHTML = filteredResponses.map(response => {
    const name = getResponderName(response);
    const email = getResponderEmail(response);
    const date = formatDate(response.submitted_at || response.created_at);
    const status = response.status || 'pending';

    return `
      <tr onclick="viewResponse(${response.id})">
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(email)}</td>
        <td>${date}</td>
        <td>
          <div class="table-actions" onclick="event.stopPropagation()">
            <button class="action-btn approve" onclick="quickApprove(${response.id})" title="Approve">
              ✓
            </button>
            <button class="action-btn reject" onclick="quickReject(${response.id})" title="Reject">
              ✕
            </button>
            <button class="action-btn more" onclick="toggleMoreMenu(event, ${response.id})" title="More options">
              ⋯
            </button>
            <div class="more-menu" id="more-menu-${response.id}">
              <button onclick="viewResponse(${response.id})">👁️ View Details</button>
              <button onclick="exportResponse(${response.id})">📄 Export</button>
              <button class="danger" onclick="deleteResponse(${response.id})">🗑️ Delete</button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Toggle more menu dropdown
function toggleMoreMenu(event, responseId) {
  event.stopPropagation();

  // Close all other menus first
  document.querySelectorAll('.more-menu.show').forEach(menu => {
    menu.classList.remove('show');
  });

  const menu = document.getElementById(`more-menu-${responseId}`);
  menu.classList.toggle('show');
}

// Close menus when clicking outside
document.addEventListener('click', () => {
  document.querySelectorAll('.more-menu.show').forEach(menu => {
    menu.classList.remove('show');
  });
});

// Export single response
function exportResponse(responseId) {
  const response = allResponses.find(r => r.id === responseId);
  if (response) {
    const data = JSON.stringify(response, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-${responseId}.json`;
    a.click();
  }
}

// Delete response
async function deleteResponse(responseId) {
  if (!confirm('Are you sure you want to delete this response? This cannot be undone.')) {
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/forms/submissions/${responseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      loadResponses();
    } else {
      alert('Failed to delete response');
    }
  } catch (error) {
    console.error('Error deleting response:', error);
    alert('Failed to delete response');
  }
}

// Switch tab
function switchTab(tab) {
  currentTab = tab;

  // Update tab buttons
  document.querySelectorAll('.response-tab').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tab) {
      btn.classList.add('active');
    }
  });

  filterAndDisplayResponses();
}

// Filter responses
function filterResponses() {
  filterAndDisplayResponses();
}

// Sort by field
function sortBy(field) {
  if (sortField === field) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortField = field;
    sortDirection = 'asc';
  }

  filterAndDisplayResponses();
}

// View response details
async function viewResponse(responseId) {
  currentResponseId = responseId;
  const response = responses.find(r => r.id === responseId);

  if (!response) return;

  // Populate modal
  document.getElementById('detailName').textContent = getResponderName(response);
  document.getElementById('detailEmail').textContent = getResponderEmail(response);
  document.getElementById('detailDate').textContent = formatDate(response.submitted_at || response.created_at);

  const statusEl = document.getElementById('detailStatus');
  const status = response.status || 'pending';
  statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  statusEl.className = `status-badge ${status}`;

  // Populate responses
  const container = document.getElementById('responsesContainer');
  const data = response.response_data || response.data || {};

  // Get field labels from form
  const fieldLabels = {};
  if (formData && formData.fields) {
    formData.fields.forEach(f => {
      fieldLabels[f.id] = f.label;
    });
  }

  container.innerHTML = Object.entries(data).map(([key, value]) => {
    const label = fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const displayValue = Array.isArray(value) ? value.join(', ') : value;

    return `
      <div class="response-item">
        <div class="question">${escapeHtml(label)}</div>
        <div class="answer">${escapeHtml(String(displayValue))}</div>
      </div>
    `;
  }).join('');

  // Load notes
  document.getElementById('internalNotes').value = response.notes || '';

  // Reset AI summary
  document.getElementById('aiSummaryContent').innerHTML =
    '<p class="ai-summary-placeholder">Click "Generate Summary" to get an AI-powered analysis of this response.</p>';
  document.getElementById('generateSummaryBtn').disabled = false;
  document.getElementById('generateSummaryBtn').textContent = 'Generate Summary';

  // Show modal
  document.getElementById('detailModal').style.display = 'flex';
}

// Close detail modal
function closeDetailModal() {
  document.getElementById('detailModal').style.display = 'none';
  currentResponseId = null;
}

// Quick approve
async function quickApprove(responseId) {
  await updateResponseStatus(responseId, 'approved');
}

// Quick reject
async function quickReject(responseId) {
  await updateResponseStatus(responseId, 'rejected');
}

// Approve from modal
async function approveResponse() {
  if (!currentResponseId) return;
  await updateResponseStatus(currentResponseId, 'approved');
  closeDetailModal();
}

// Reject from modal
async function rejectResponse() {
  if (!currentResponseId) return;
  await updateResponseStatus(currentResponseId, 'rejected');
  closeDetailModal();
}

// Update response status
async function updateResponseStatus(responseId, status) {
  try {
    const token = localStorage.getItem('auth_token');
    const notes = document.getElementById('internalNotes')?.value || '';

    const response = await fetch(`/api/forms/submissions/${responseId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status, notes })
    });

    if (!response.ok) {
      throw new Error('Failed to update status');
    }

    // Update local data
    const idx = responses.findIndex(r => r.id === responseId);
    if (idx !== -1) {
      responses[idx].status = status;
      responses[idx].notes = notes;
    }

    filterAndDisplayResponses();
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Failed to update response status');
  }
}

// Generate AI summary
async function generateAISummary() {
  if (!currentResponseId) return;

  const btn = document.getElementById('generateSummaryBtn');
  const content = document.getElementById('aiSummaryContent');

  btn.disabled = true;
  btn.textContent = 'Generating...';
  content.innerHTML = `
    <div class="ai-summary-loading">
      <div class="loading-spinner"></div>
      <span>Analyzing response...</span>
    </div>
  `;

  try {
    const response = responses.find(r => r.id === currentResponseId);
    const token = localStorage.getItem('auth_token');

    const result = await fetch('/api/forms/submissions/ai-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        response_id: currentResponseId,
        response_data: response.response_data || response.data,
        form_name: formData?.name
      })
    });

    if (!result.ok) {
      throw new Error('Failed to generate summary');
    }

    const data = await result.json();
    content.innerHTML = `<p>${escapeHtml(data.summary)}</p>`;
    btn.textContent = 'Regenerate';
  } catch (error) {
    console.error('Error generating summary:', error);
    content.innerHTML = '<p class="ai-summary-placeholder">Failed to generate summary. Please try again.</p>';
    btn.textContent = 'Try Again';
  }

  btn.disabled = false;
}

// Navigation functions
function navigateToBuilder() {
  window.location.href = `/forms/${formId}/edit`;
}

function navigateToSettings() {
  window.location.href = `/forms/${formId}/edit#settings`;
}

function previewForm() {
  window.open(`/f/${formId}?preview=true`, '_blank');
}

function saveDraft() {
  // Save current form as draft
  alert('Form saved as draft');
}

async function togglePublish() {
  if (!formData) return;

  const newStatus = formData.status === 'published' ? 'draft' : 'published';

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/forms/templates/${formId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ...formData, status: newStatus })
    });

    if (!response.ok) {
      throw new Error('Failed to update status');
    }

    formData.status = newStatus;

    const publishBtn = document.getElementById('publishBtn');
    if (newStatus === 'published') {
      publishBtn.textContent = 'Published';
      publishBtn.classList.add('published');
    } else {
      publishBtn.textContent = 'Publish';
      publishBtn.classList.remove('published');
    }
  } catch (error) {
    console.error('Error toggling publish:', error);
    alert('Failed to update form status');
  }
}

// Copy form link
function copyFormLink() {
  const url = `${window.location.origin}/f/${formId}`;
  navigator.clipboard.writeText(url).then(() => {
    alert('Form link copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    prompt('Copy this link:', url);
  });
}

// Utility functions
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions globally available for onclick handlers
window.quickApprove = quickApprove;
window.quickReject = quickReject;
window.approveResponse = approveResponse;
window.rejectResponse = rejectResponse;
window.viewResponse = viewResponse;
window.closeDetailModal = closeDetailModal;
window.generateAISummary = generateAISummary;
window.switchTab = switchTab;
window.filterResponses = filterResponses;
window.sortBy = sortBy;
window.toggleMoreMenu = toggleMoreMenu;
window.deleteResponse = deleteResponse;
window.exportResponse = exportResponse;
window.navigateToBuilder = navigateToBuilder;
window.navigateToSettings = navigateToSettings;
window.previewForm = previewForm;
window.saveDraft = saveDraft;
window.togglePublish = togglePublish;
window.copyFormLink = copyFormLink;
