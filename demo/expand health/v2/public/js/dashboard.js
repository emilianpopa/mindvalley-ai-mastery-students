/**
 * Dashboard JavaScript
 * Handles dashboard initialization, auth check, and real-time stats
 */

// Check if user is logged in
function checkAuth() {
  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    // Redirect to login
    window.location.href = '/login';
    return false;
  }

  return true;
}

// Get auth token for API requests
function getAuthToken() {
  return localStorage.getItem('auth_token');
}

// Fetch dashboard stats from API
async function loadDashboardStats() {
  try {
    const token = getAuthToken();
    if (!token) return;

    const response = await fetch('/api/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      throw new Error('Failed to fetch dashboard stats');
    }

    const data = await response.json();
    updateDashboardStats(data.stats);
    updateWelcomeMessage(data.user);

  } catch (error) {
    console.error('Error loading dashboard stats:', error);
  }
}

// Update the stat cards with real data
function updateDashboardStats(stats) {
  // Update Total Clients
  const clientsStatEl = document.getElementById('statClients');
  if (clientsStatEl) {
    clientsStatEl.textContent = stats.clients.total;
  }

  // Update Labs & Tests
  const labsStatEl = document.getElementById('statLabs');
  if (labsStatEl) {
    labsStatEl.textContent = stats.labs.total;
  }

  // Update Active Protocols
  const protocolsStatEl = document.getElementById('statProtocols');
  if (protocolsStatEl) {
    protocolsStatEl.textContent = stats.protocols.active;
  }

  // Update KB Documents
  const kbStatEl = document.getElementById('statKbDocs');
  if (kbStatEl) {
    kbStatEl.textContent = stats.kbDocuments;
  }
}

// Update welcome message with user name
function updateWelcomeMessage(user) {
  const welcomeEl = document.getElementById('welcomeMessage');
  if (welcomeEl && user) {
    const firstName = user.firstName || 'there';
    welcomeEl.textContent = `Welcome back, ${firstName}!`;
  }
}

// Load user info for header
function loadUserInfo() {
  const userJson = localStorage.getItem('user');
  if (!userJson) return;

  const user = JSON.parse(userJson);

  // Update user name
  const userName = document.getElementById('userName');
  if (userName) {
    userName.textContent = `${user.firstName} ${user.lastName}`;
  }

  // Update user role
  const userRole = document.getElementById('userRole');
  if (userRole && user.roles && user.roles.length > 0) {
    userRole.textContent = user.roles[0].replace('_', ' ').toUpperCase();
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  if (!checkAuth()) {
    return;
  }

  // Load user info for header
  loadUserInfo();

  // Load dashboard stats from API
  loadDashboardStats();

  console.log('Dashboard initialized');
});
