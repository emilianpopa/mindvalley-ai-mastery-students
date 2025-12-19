/**
 * Client Edit JavaScript
 * Handles editing existing client data
 */

const API_BASE = window.location.origin;

// Get client ID from URL
const pathParts = window.location.pathname.split('/');
const clientId = pathParts[pathParts.length - 2]; // /clients/:id/edit

// DOM Elements
const loadingState = document.getElementById('loadingState');
const formCard = document.getElementById('formCard');
const clientForm = document.getElementById('clientForm');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const alert = document.getElementById('alert');

// Show alert message
function showAlert(message, type = 'error') {
  alert.textContent = message;
  alert.className = `alert ${type}`;
  alert.style.display = 'flex';

  // Scroll to top to show alert
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Auto-hide success messages
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

// Format date for input field (YYYY-MM-DD)
function formatDateForInput(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Populate form with client data
function populateForm(client) {
  document.getElementById('firstName').value = client.first_name || '';
  document.getElementById('lastName').value = client.last_name || '';
  document.getElementById('email').value = client.email || '';
  document.getElementById('phone').value = client.phone || '';
  document.getElementById('dateOfBirth').value = formatDateForInput(client.date_of_birth);
  document.getElementById('gender').value = client.gender || '';
  document.getElementById('status').value = client.status || 'active';

  document.getElementById('address').value = client.address || '';
  document.getElementById('city').value = client.city || '';
  document.getElementById('state').value = client.state || '';
  document.getElementById('zipCode').value = client.zip_code || '';

  document.getElementById('emergencyContactName').value = client.emergency_contact_name || '';
  document.getElementById('emergencyContactPhone').value = client.emergency_contact_phone || '';

  document.getElementById('medicalHistory').value = client.medical_history || '';
  document.getElementById('currentMedications').value = client.current_medications || '';
  document.getElementById('allergies').value = client.allergies || '';

  // Update page title
  const fullName = `${client.first_name} ${client.last_name}`;
  document.title = `Edit ${fullName} - ExpandHealth`;
  document.getElementById('pageTitle').textContent = `Edit ${fullName}`;
  document.getElementById('breadcrumbName').textContent = fullName;

  // Show form, hide loading
  loadingState.style.display = 'none';
  formCard.style.display = 'block';
}

// Fetch client data
async function fetchClient() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const response = await fetch(`${API_BASE}/api/clients/${clientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (response.status === 404) {
      showAlert('Client not found');
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to load client');
    }

    const data = await response.json();
    populateForm(data.client);

  } catch (error) {
    console.error('Error fetching client:', error);
    showAlert('Failed to load client. Please try again.');
  }
}

// Get form data
function getFormData() {
  const formData = new FormData(clientForm);
  const data = {};

  for (const [key, value] of formData.entries()) {
    // Include all values (even empty ones, as we're updating)
    data[key] = value.trim();
  }

  return data;
}

// Validate form
function validateForm() {
  const data = getFormData();

  if (!data.first_name) {
    showAlert('First name is required');
    return false;
  }

  if (!data.last_name) {
    showAlert('Last name is required');
    return false;
  }

  if (!data.email) {
    showAlert('Email is required');
    return false;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    showAlert('Please enter a valid email address');
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

    const data = getFormData();

    const response = await fetch(`${API_BASE}/api/clients/${clientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update client');
    }

    // Show success message
    showAlert('Client updated successfully! Redirecting...', 'success');

    // Redirect to profile after 1.5 seconds
    setTimeout(() => {
      window.location.href = `/clients/${clientId}`;
    }, 1500);

  } catch (error) {
    console.error('Error updating client:', error);
    showAlert(error.message || 'Failed to update client. Please try again.');
    setLoading(false);
  }
}

// Handle cancel
function handleCancel() {
  if (confirm('Are you sure? Any unsaved changes will be lost.')) {
    window.location.href = `/clients/${clientId}`;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (!clientId) {
    showAlert('Invalid client ID');
    return;
  }

  fetchClient();

  // Event listeners
  clientForm.addEventListener('submit', handleSubmit);
  cancelBtn.addEventListener('click', handleCancel);

  // Phone number formatting (optional)
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 0) {
        if (value.length <= 3) {
          value = `(${value}`;
        } else if (value.length <= 6) {
          value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
        } else {
          value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
        }
      }
      e.target.value = value;
    });
  }

  // ZIP code formatting (optional)
  const zipInput = document.getElementById('zipCode');
  if (zipInput) {
    zipInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5);
    });
  }
});
