/**
 * Form Submissions Page
 */

let formId = null;
let formTemplate = null;
let allSubmissions = [];
let currentSubmission = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Get form ID from URL
  const pathParts = window.location.pathname.split('/');
  formId = pathParts[2]; // /forms/:id/submissions

  if (!formId) {
    alert('Invalid form ID');
    window.location.href = '/forms';
    return;
  }

  loadFormInfo();
  loadSubmissions();
});

// Load form information
async function loadFormInfo() {
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

    formTemplate = await response.json();

    // Update page header
    document.getElementById('pageTitle').textContent = `${formTemplate.name} - Submissions`;
    document.getElementById('formDescription').textContent = formTemplate.description || '';
    document.getElementById('breadcrumbTitle').textContent = formTemplate.name;

  } catch (error) {
    console.error('Error loading form info:', error);
    alert('Failed to load form information');
  }
}

// Load submissions
async function loadSubmissions() {
  try {
    const token = localStorage.getItem('auth_token');
    const statusFilter = document.getElementById('statusFilter').value;

    let url = `/api/forms/submissions?form_id=${formId}`;
    if (statusFilter) {
      url += `&status=${statusFilter}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load submissions');
    }

    const data = await response.json();
    allSubmissions = data.submissions || [];

    renderSubmissions();
    updateStats();

  } catch (error) {
    console.error('Error loading submissions:', error);
    alert('Failed to load submissions');
  }
}

// Render submissions table
function renderSubmissions() {
  const tbody = document.getElementById('submissionsTableBody');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const tableContainer = document.getElementById('submissionsTable');

  loadingState.style.display = 'none';

  if (allSubmissions.length === 0) {
    emptyState.style.display = 'flex';
    tableContainer.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  tableContainer.style.display = 'block';

  tbody.innerHTML = allSubmissions.map(submission => {
    const submittedAt = new Date(submission.submitted_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    const clientName = submission.client_name || 'Anonymous';
    const reviewedBy = submission.reviewed_by_name || '-';

    const statusBadge = submission.status === 'reviewed'
      ? '<span class="status-badge reviewed">Reviewed</span>'
      : '<span class="status-badge pending">Pending</span>';

    return `
      <tr>
        <td>${submittedAt}</td>
        <td>${clientName}</td>
        <td>${statusBadge}</td>
        <td>${reviewedBy}</td>
        <td>
          <button class="action-btn view" onclick="viewSubmission(${submission.id})" title="View details">
            👁️ View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Update stats
function updateStats() {
  const total = allSubmissions.length;
  const pending = allSubmissions.filter(s => s.status === 'pending').length;
  const reviewed = allSubmissions.filter(s => s.status === 'reviewed').length;

  document.getElementById('totalCount').textContent = total;
  document.getElementById('pendingCount').textContent = pending;
  document.getElementById('reviewedCount').textContent = reviewed;
}

// View submission details
async function viewSubmission(submissionId) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/forms/submissions/${submissionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load submission');
    }

    currentSubmission = await response.json();
    showDetailModal();

  } catch (error) {
    console.error('Error loading submission:', error);
    alert('Failed to load submission details');
  }
}

// Show detail modal
function showDetailModal() {
  const modal = document.getElementById('detailModal');

  // Submission info
  const submittedAt = new Date(currentSubmission.submitted_at).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  document.getElementById('detailSubmittedAt').textContent = submittedAt;
  document.getElementById('detailClient').textContent = currentSubmission.client_name || 'Anonymous';

  const statusBadge = currentSubmission.status === 'reviewed'
    ? '<span class="status-badge reviewed">Reviewed</span>'
    : '<span class="status-badge pending">Pending</span>';
  document.getElementById('detailStatus').innerHTML = statusBadge;

  // Render responses
  renderResponses();

  // Review notes
  document.getElementById('reviewNotes').value = currentSubmission.notes || '';

  // Update button
  const reviewBtn = document.getElementById('markReviewedBtn');
  if (currentSubmission.status === 'reviewed') {
    reviewBtn.textContent = '✓ Already Reviewed';
    reviewBtn.disabled = true;
  } else {
    reviewBtn.textContent = '✓ Mark as Reviewed';
    reviewBtn.disabled = false;
  }

  modal.style.display = 'flex';
}

// Render responses
function renderResponses() {
  const container = document.getElementById('responsesContainer');
  const responses = currentSubmission.responses || {};

  if (!formTemplate || !formTemplate.fields) {
    container.innerHTML = '<p>Loading form structure...</p>';
    return;
  }

  const html = formTemplate.fields.map(field => {
    const value = responses[field.id];

    if (value === undefined || value === null || value === '') {
      return ''; // Skip empty responses
    }

    let formattedValue = '';

    if (Array.isArray(value)) {
      // Checkbox values
      formattedValue = `
        <div class="response-value list">
          ${value.map(v => `<span>${escapeHtml(v)}</span>`).join('')}
        </div>
      `;
    } else if (field.type === 'range') {
      // Scale values
      const min = field.min || 1;
      const max = field.max || 10;
      const percentage = ((value - min) / (max - min)) * 100;
      formattedValue = `
        <div class="response-value scale">
          <div class="scale-bar">
            <div class="scale-fill" style="width: ${percentage}%"></div>
          </div>
          <div class="scale-number">${value}</div>
        </div>
      `;
    } else {
      // Text values
      formattedValue = `<div class="response-value">${escapeHtml(value).replace(/\n/g, '<br>')}</div>`;
    }

    return `
      <div class="response-item">
        <label class="response-label">${escapeHtml(field.label)}</label>
        ${formattedValue}
      </div>
    `;
  }).filter(html => html).join('');

  container.innerHTML = html || '<p>No responses recorded.</p>';
}

// Close detail modal
function closeDetailModal() {
  document.getElementById('detailModal').style.display = 'none';
  currentSubmission = null;
}

// Mark submission as reviewed
async function markAsReviewed() {
  if (!currentSubmission) return;

  const notes = document.getElementById('reviewNotes').value.trim();

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/forms/submissions/${currentSubmission.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'reviewed',
        notes: notes
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update submission');
    }

    alert('Submission marked as reviewed!');
    closeDetailModal();
    loadSubmissions(); // Reload list

  } catch (error) {
    console.error('Error updating submission:', error);
    alert('Failed to update submission');
  }
}

// Copy form link
function copyFormLink() {
  const link = `${window.location.origin}/forms/${formId}/fill`;
  navigator.clipboard.writeText(link).then(() => {
    alert('Form link copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy link:', err);
    alert('Failed to copy link');
  });
}

// Export submissions to CSV
function exportSubmissions() {
  if (allSubmissions.length === 0) {
    alert('No submissions to export');
    return;
  }

  // Build CSV header
  const fields = formTemplate.fields || [];
  const headers = ['Submitted', 'Client', 'Status', 'Reviewed By', ...fields.map(f => f.label)];
  const csvRows = [headers.join(',')];

  // Build CSV rows
  allSubmissions.forEach(submission => {
    const responses = submission.responses || {};
    const row = [
      `"${new Date(submission.submitted_at).toLocaleString()}"`,
      `"${submission.client_name || 'Anonymous'}"`,
      submission.status,
      `"${submission.reviewed_by_name || '-'}"`,
      ...fields.map(field => {
        const value = responses[field.id];
        if (Array.isArray(value)) {
          return `"${value.join(', ')}"`;
        }
        return `"${value || ''}"`;
      })
    ];
    csvRows.push(row.join(','));
  });

  // Download CSV
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${formTemplate.name.replace(/\s+/g, '-')}-submissions-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Utility function
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
