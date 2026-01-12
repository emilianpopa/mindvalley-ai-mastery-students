/**
 * Client Form JavaScript
 * Handles client creation and editing
 */

const API_BASE = window.location.origin;

// DOM Elements
const clientForm = document.getElementById('clientForm');
const submitBtn = document.getElementById('submitBtn');
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

// Get form data
function getFormData() {
  const formData = new FormData(clientForm);
  const data = {};

  for (const [key, value] of formData.entries()) {
    // Only include non-empty values
    if (value && value.trim() !== '') {
      data[key] = value.trim();
    }
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

    const response = await fetch(`${API_BASE}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create client');
    }

    // Show success message
    showAlert('Client created successfully! Redirecting...', 'success');

    // Redirect to clients list after 1.5 seconds
    setTimeout(() => {
      window.location.href = '/clients';
    }, 1500);

  } catch (error) {
    console.error('Error creating client:', error);
    showAlert(error.message || 'Failed to create client. Please try again.');
    setLoading(false);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  clientForm.addEventListener('submit', handleSubmit);

  // Phone number formatting - supports international numbers
  // Allows +, digits, spaces, dashes, and parentheses
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      // Allow international format: +44, spaces, dashes, parentheses, and digits
      // Only remove characters that are definitely not part of phone numbers
      let value = e.target.value.replace(/[^\d\s\-\+\(\)]/g, '');
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
