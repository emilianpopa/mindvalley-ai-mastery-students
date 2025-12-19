/**
 * Authentication JavaScript
 * Handles login, token storage, and redirects
 */

// API base URL
const API_BASE = window.location.origin;

// DOM elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const alert = document.getElementById('alert');

// Show alert message
function showAlert(message, type = 'error') {
  alert.textContent = message;
  alert.className = `alert ${type}`;
  alert.style.display = 'block';

  // Auto-hide success messages after 3 seconds
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

// Show loading state
function setLoading(loading) {
  const btnText = loginBtn.querySelector('.btn-text');
  const btnLoader = loginBtn.querySelector('.btn-loader');

  if (loading) {
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    loginBtn.disabled = true;
  } else {
    btnText.style.display = 'block';
    btnLoader.style.display = 'none';
    loginBtn.disabled = false;
  }
}

// Check if user is already logged in
function checkAuth() {
  const token = localStorage.getItem('auth_token');
  if (token) {
    // Redirect to dashboard
    window.location.href = '/';
  }
}

// Handle login form submission
async function handleLogin(e) {
  e.preventDefault();
  hideAlert();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Validation
  if (!email || !password) {
    showAlert('Please enter both email and password');
    return;
  }

  setLoading(true);

  try {
    // Call login API
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store token and user data
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Show success message
    showAlert('Login successful! Redirecting...', 'success');

    // Redirect to dashboard after 1 second
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);

  } catch (error) {
    console.error('Login error:', error);
    showAlert(error.message || 'Login failed. Please try again.');
  } finally {
    setLoading(false);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Only run login page logic if we're on the login page
  if (loginForm) {
    // Check if already logged in
    checkAuth();

    // Add form submit handler
    loginForm.addEventListener('submit', handleLogin);

    // Focus email input
    emailInput.focus();

    // Pre-fill default admin credentials (ONLY FOR DEVELOPMENT)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('Development mode: Default admin credentials available');
      console.log('Email: admin@expandhealth.io');
      console.log('Password: admin123');
    }
  }
});

// Logout function (used by other pages)
function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

// Get auth token
function getAuthToken() {
  return localStorage.getItem('auth_token');
}

// Get current user
function getCurrentUser() {
  const userJson = localStorage.getItem('user');
  return userJson ? JSON.parse(userJson) : null;
}

// Check if user has role
function hasRole(role) {
  const user = getCurrentUser();
  return user && user.roles && user.roles.includes(role);
}

// Export functions for use in other pages
window.auth = {
  logout,
  getAuthToken,
  getCurrentUser,
  hasRole
};
