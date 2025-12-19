/**
 * Lab Upload JavaScript
 * Handles PDF file upload for lab results
 */

const API_BASE = window.location.origin;

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const clientSelect = document.getElementById('client');
const fileInput = document.getElementById('file');
const fileUploadArea = document.getElementById('fileUploadArea');
const filePreview = document.getElementById('filePreview');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileRemove = document.getElementById('fileRemove');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const alert = document.getElementById('alert');

// State
let selectedFile = null;

// Show alert message
function showAlert(message, type = 'error') {
  alert.textContent = message;
  alert.className = `alert ${type}`;
  alert.style.display = 'flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (type === 'success') {
    setTimeout(() => {
      alert.style.display = 'none';
    }, 3000);
  }
}

// Hide alert
function hideAlert() {
  alert.style.display = 'none';
}

// Set loading state
function setLoading(loading) {
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoader = submitBtn.querySelector('.btn-loader');

  if (loading) {
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    submitBtn.disabled = true;
  } else {
    btnText.style.display = 'inline-block';
    btnLoader.style.display = 'none';
    submitBtn.disabled = false;
  }
}

// Format file size
function formatFileSize(bytes) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB`;
}

// Fetch clients for dropdown
async function fetchClients() {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/clients?limit=1000&status=active`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load clients');
    }

    const data = await response.json();
    populateClients(data.clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    showAlert('Failed to load clients. Please refresh the page.');
  }
}

// Populate client dropdown
function populateClients(clients) {
  clientSelect.innerHTML = '<option value="">Select a client...</option>';
  clients.forEach(client => {
    const option = document.createElement('option');
    option.value = client.id;
    option.textContent = `${client.first_name} ${client.last_name}`;
    clientSelect.appendChild(option);
  });
}

// Handle file selection
function handleFileSelect(file) {
  // Validate file type
  if (file.type !== 'application/pdf') {
    showAlert('Only PDF files are allowed');
    return;
  }

  // Validate file size (10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    showAlert('File size exceeds 10MB limit');
    return;
  }

  selectedFile = file;

  // Show file preview
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  fileUploadArea.querySelector('.file-upload-placeholder').style.display = 'none';
  filePreview.style.display = 'flex';
}

// File input change
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleFileSelect(file);
  }
});

// Drag and drop
fileUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileUploadArea.classList.add('drag-over');
});

fileUploadArea.addEventListener('dragleave', () => {
  fileUploadArea.classList.remove('drag-over');
});

fileUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  fileUploadArea.classList.remove('drag-over');

  const file = e.dataTransfer.files[0];
  if (file) {
    // Update file input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    handleFileSelect(file);
  }
});

// Remove file
fileRemove.addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  filePreview.style.display = 'none';
  fileUploadArea.querySelector('.file-upload-placeholder').style.display = 'block';
});

// Validate form
function validateForm() {
  const clientId = clientSelect.value;

  if (!clientId) {
    showAlert('Please select a client');
    return false;
  }

  if (!selectedFile) {
    showAlert('Please select a PDF file to upload');
    return false;
  }

  return true;
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();
  hideAlert();

  if (!validateForm()) {
    return;
  }

  setLoading(true);

  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('client_id', document.getElementById('client').value);
    formData.append('lab_type', document.getElementById('labType').value);
    formData.append('title', document.getElementById('title').value);
    formData.append('test_date', document.getElementById('testDate').value);

    const response = await fetch(`${API_BASE}/api/labs/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to upload lab result');
    }

    // Show success message
    showAlert('Lab result uploaded successfully! Redirecting...', 'success');

    // Redirect to lab viewer after 1.5 seconds
    setTimeout(() => {
      window.location.href = `/labs/${result.lab.id}`;
    }, 1500);

  } catch (error) {
    console.error('Error uploading lab:', error);
    showAlert(error.message || 'Failed to upload lab result. Please try again.');
    setLoading(false);
  }
}

// Handle cancel
function handleCancel() {
  if (selectedFile || clientSelect.value) {
    if (confirm('Are you sure? Any unsaved data will be lost.')) {
      window.location.href = '/labs';
    }
  } else {
    window.location.href = '/labs';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchClients();

  // Event listeners
  uploadForm.addEventListener('submit', handleSubmit);
  cancelBtn.addEventListener('click', handleCancel);
});
