/**
 * Forms List Page
 */

let allForms = [];
let currentDropdown = null;
let selectedPdfFile = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  loadForms();
  loadUnlinkedCount();
  setupSearch();
  setupDropdownCloseOnClickOutside();
  setupDragAndDrop();
});

// Load unlinked submissions count
async function loadUnlinkedCount() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const response = await fetch('/api/forms/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const unlinkedCount = data.unlinked_count || 0;
      const badge = document.getElementById('unlinkedCount');
      if (badge) {
        badge.textContent = unlinkedCount;
        badge.style.display = unlinkedCount > 0 ? 'inline-flex' : 'none';
      }
    }
  } catch (error) {
    console.error('Error loading unlinked count:', error);
  }
}

// Load forms from API
async function loadForms() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    // Load from API endpoint
    const response = await fetch('/api/forms/templates', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch forms');
    }

    const data = await response.json();
    allForms = data.forms || data || [];

    renderForms(allForms);
  } catch (error) {
    console.error('Error loading forms:', error);
    showError('Failed to load forms');
  }
}

// Render forms table
function renderForms(forms) {
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const formsTable = document.getElementById('formsTable');
  const tableBody = document.getElementById('formsTableBody');

  loadingState.style.display = 'none';

  if (forms.length === 0) {
    emptyState.style.display = 'flex';
    formsTable.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  formsTable.style.display = 'block';

  tableBody.innerHTML = forms.map(form => `
    <tr>
      <td>
        <span class="form-name">${escapeHtml(form.name)}</span>
      </td>
      <td>
        <div class="form-description">${escapeHtml(form.description || '-')}</div>
      </td>
      <td>
        <span class="status-badge ${form.status}">${form.status}</span>
      </td>
      <td>
        <span class="date-display">${formatDate(form.last_updated || form.updated_at)}</span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" onclick="editForm(${form.id})" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="action-btn" onclick="viewSubmissions(${form.id})" title="View Submissions">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </button>
          <div class="more-menu-wrapper">
            <button class="more-btn" onclick="toggleDropdown(event, ${form.id})" title="More">⋮</button>
            <div class="more-menu" id="dropdown-${form.id}">
              <button class="more-menu-item" onclick="viewSubmissions(${form.id})">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                View Submissions (${form.submissions_count || 0})
              </button>
              <button class="more-menu-item" onclick="duplicateForm(${form.id})">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Duplicate
              </button>
              <button class="more-menu-item" onclick="copyLink(${form.id})">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                Copy Fill Link
              </button>
              <div class="more-menu-divider"></div>
              <button class="more-menu-item danger" onclick="deleteForm(${form.id}, '${escapeHtml(form.name)}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `).join('');
}

// Setup search functionality
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = e.target.value.toLowerCase();
      const filtered = allForms.filter(form =>
        form.name.toLowerCase().includes(query) ||
        (form.description && form.description.toLowerCase().includes(query)) ||
        (form.category && form.category.toLowerCase().includes(query))
      );
      renderForms(filtered);
    }, 300);
  });
}

// View form details
function viewForm(formId) {
  window.location.href = `/forms/${formId}/edit`;
}

// Edit form
function editForm(formId) {
  window.location.href = `/forms/${formId}/edit`;
}

// View form submissions
function viewSubmissions(formId) {
  window.location.href = `/forms/${formId}/submissions`;
}

// Duplicate form
async function duplicateForm(formId) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/forms/templates/${formId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch form');
    }

    const form = await response.json();

    // Create duplicate
    const duplicateResponse = await fetch('/api/forms/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: `${form.name} (Copy)`,
        description: form.description,
        category: form.category,
        fields: form.fields,
        settings: form.settings
      })
    });

    if (!duplicateResponse.ok) {
      throw new Error('Failed to duplicate form');
    }

    alert('Form duplicated successfully');
    loadForms();
  } catch (error) {
    console.error('Error duplicating form:', error);
    alert('Failed to duplicate form');
  }
}

// Copy form fill link
function copyLink(formId) {
  const link = `${window.location.origin}/forms/${formId}/fill`;
  navigator.clipboard.writeText(link).then(() => {
    alert('Form link copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy link:', err);
    alert('Failed to copy link');
  });
}

// Delete form
async function deleteForm(formId, formName) {
  if (!confirm(`Are you sure you want to delete "${formName}"?\n\nThis action cannot be undone.`)) {
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/forms/templates/${formId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete form');
    }

    alert('Form deleted successfully');
    loadForms();
  } catch (error) {
    console.error('Error deleting form:', error);
    alert(error.message);
  }
}

// Toggle dropdown menu
function toggleDropdown(event, formId) {
  event.stopPropagation();

  const dropdown = document.getElementById(`dropdown-${formId}`);

  // Close all other open menus
  document.querySelectorAll('.more-menu.active').forEach(menu => {
    if (menu.id !== `dropdown-${formId}`) {
      menu.classList.remove('active');
    }
  });

  dropdown.classList.toggle('active');
  currentDropdown = dropdown.classList.contains('active') ? dropdown : null;
}

// Close dropdown when clicking outside
function setupDropdownCloseOnClickOutside() {
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.more-menu-wrapper')) {
      document.querySelectorAll('.more-menu.active').forEach(menu => {
        menu.classList.remove('active');
      });
      currentDropdown = null;
    }
  });
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  const loadingState = document.getElementById('loadingState');
  loadingState.style.display = 'flex';
  loadingState.innerHTML = `
    <div style="color: #EF4444; text-align: center;">
      <p style="font-size: 16px; margin-bottom: 8px;">⚠️ Error</p>
      <p style="font-size: 14px;">${message}</p>
    </div>
  `;
}

// ===== PDF UPLOAD FUNCTIONALITY =====

// Show PDF upload modal
function showPdfUploadModal() {
  const modal = document.getElementById('pdfUploadModal');
  modal.style.display = 'flex';
  resetPdfUpload();
}

// Close PDF upload modal
function closePdfUploadModal() {
  const modal = document.getElementById('pdfUploadModal');
  modal.style.display = 'none';
  resetPdfUpload();
}

// Reset upload state
function resetPdfUpload() {
  selectedPdfFile = null;
  document.getElementById('pdfFileInput').value = '';
  document.getElementById('uploadBtn').disabled = true;
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('uploadError').style.display = 'none';

  const uploadArea = document.getElementById('uploadArea');
  uploadArea.innerHTML = `
    <input type="file" id="pdfFileInput" accept=".pdf" style="display: none;" onchange="handlePdfSelection(event)">
    <div class="upload-placeholder" onclick="document.getElementById('pdfFileInput').click()">
      <div class="upload-icon">📄</div>
      <p>Click to select a PDF file</p>
      <p class="upload-hint">or drag and drop here</p>
    </div>
  `;
}

// Handle PDF file selection
function handlePdfSelection(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (file.type !== 'application/pdf') {
    showUploadError('Please select a valid PDF file');
    return;
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    showUploadError('File size must be less than 10MB');
    return;
  }

  selectedPdfFile = file;
  displaySelectedFile(file);
  document.getElementById('uploadBtn').disabled = false;
  document.getElementById('uploadError').style.display = 'none';
}

// Display selected file info
function displaySelectedFile(file) {
  const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
  const uploadArea = document.getElementById('uploadArea');

  uploadArea.innerHTML = `
    <div class="upload-file-info">
      <div class="file-icon">📄</div>
      <div class="file-details">
        <p class="file-name">${escapeHtml(file.name)}</p>
        <p class="file-size">${sizeInMB} MB</p>
      </div>
      <button class="file-remove" onclick="resetPdfUpload()" title="Remove file">×</button>
    </div>
  `;
}

// Setup drag and drop
function setupDragAndDrop() {
  const modal = document.getElementById('pdfUploadModal');
  if (!modal) return;

  modal.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  modal.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        selectedPdfFile = file;
        displaySelectedFile(file);
        document.getElementById('uploadBtn').disabled = false;
        document.getElementById('uploadError').style.display = 'none';
      } else {
        showUploadError('Please drop a valid PDF file');
      }
    }
  });
}

// Show upload error
function showUploadError(message) {
  const errorDiv = document.getElementById('uploadError');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// Upload and parse PDF
async function uploadPdf() {
  if (!selectedPdfFile) return;

  try {
    // Show progress
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('uploadError').style.display = 'none';
    document.getElementById('uploadBtn').disabled = true;

    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    // Simulate progress updates
    progressFill.style.width = '30%';
    progressText.textContent = 'Uploading PDF...';

    // Create FormData
    const formData = new FormData();
    formData.append('pdf', selectedPdfFile);

    const token = localStorage.getItem('auth_token');

    // Upload PDF
    const response = await fetch('/api/forms/parse-pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    progressFill.style.width = '60%';
    progressText.textContent = 'Analyzing form structure with AI...';

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to parse PDF');
    }

    const result = await response.json();

    progressFill.style.width = '100%';
    progressText.textContent = 'Complete! Redirecting to form builder...';

    // Wait a moment then redirect to form builder with parsed data
    setTimeout(() => {
      // Store parsed form data in sessionStorage
      sessionStorage.setItem('parsedFormData', JSON.stringify(result));
      window.location.href = '/forms/new?from=pdf';
    }, 1000);

  } catch (error) {
    console.error('Error uploading PDF:', error);
    showUploadError(error.message || 'Failed to parse PDF. Please try again.');
    document.getElementById('uploadBtn').disabled = false;
    document.getElementById('uploadProgress').style.display = 'none';
  }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const modal = document.getElementById('pdfUploadModal');
  if (e.target === modal) {
    closePdfUploadModal();
  }
});
