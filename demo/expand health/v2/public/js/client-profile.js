/**
 * Client Profile JavaScript
 * Handles viewing and managing individual client profiles
 */

const API_BASE = window.location.origin;

// Get client ID from URL
const pathParts = window.location.pathname.split('/');
const clientId = pathParts[pathParts.length - 1];

// DOM Elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const profileView = document.getElementById('profileView');
const errorMessage = document.getElementById('errorMessage');
const editBtn = document.getElementById('editBtn');
const archiveBtn = document.getElementById('archiveBtn');

// Format date
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Format datetime
function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Capitalize first letter
function capitalize(str) {
  if (!str) return '-';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

// Display client data
function displayClient(client) {
  // Update page title and header
  const fullName = `${client.first_name} ${client.last_name}`;
  document.title = `${fullName} - ExpandHealth`;
  document.getElementById('clientName').textContent = fullName;
  document.getElementById('breadcrumbName').textContent = fullName;

  // Basic Information
  document.getElementById('firstName').textContent = client.first_name || '-';
  document.getElementById('lastName').textContent = client.last_name || '-';
  document.getElementById('email').textContent = client.email || '-';
  document.getElementById('phone').textContent = client.phone || '-';
  document.getElementById('dateOfBirth').textContent = formatDate(client.date_of_birth);
  document.getElementById('gender').textContent = capitalize(client.gender);

  // Address
  document.getElementById('address').textContent = client.address || '-';
  document.getElementById('city').textContent = client.city || '-';
  document.getElementById('state').textContent = client.state || '-';
  document.getElementById('zipCode').textContent = client.zip_code || '-';

  // Emergency Contact
  document.getElementById('emergencyContactName').textContent = client.emergency_contact_name || '-';
  document.getElementById('emergencyContactPhone').textContent = client.emergency_contact_phone || '-';

  // Medical Information
  document.getElementById('medicalHistory').textContent = client.medical_history || '-';
  document.getElementById('currentMedications').textContent = client.current_medications || '-';
  document.getElementById('allergies').textContent = client.allergies || '-';

  // Metadata
  document.getElementById('clientId').textContent = client.id;
  document.getElementById('createdAt').textContent = formatDateTime(client.created_at);
  document.getElementById('updatedAt').textContent = formatDateTime(client.updated_at);

  // Status Badge
  const statusBadge = document.getElementById('statusBadge');
  statusBadge.textContent = capitalize(client.status);
  statusBadge.className = `status-badge ${client.status}`;

  // Show profile, hide loading
  loadingState.style.display = 'none';
  profileView.style.display = 'block';
}

// Show error
function showError(message) {
  loadingState.style.display = 'none';
  errorMessage.textContent = message;
  errorState.style.display = 'flex';
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
      showError('Client not found');
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to load client');
    }

    const data = await response.json();
    displayClient(data.client);

  } catch (error) {
    console.error('Error fetching client:', error);
    showError(error.message || 'Failed to load client profile. Please try again.');
  }
}

// Handle edit button
function handleEdit() {
  window.location.href = `/clients/${clientId}/edit`;
}

// Handle archive button
async function handleArchive() {
  const clientName = document.getElementById('clientName').textContent;

  if (!confirm(`Are you sure you want to archive ${clientName}? They will be moved to archived status and hidden from the active client list.`)) {
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/clients/${clientId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      alert('Client archived successfully');
      window.location.href = '/clients';
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to archive client');
    }
  } catch (error) {
    console.error('Error archiving client:', error);
    alert('Failed to archive client. Please try again.');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (!clientId || clientId === 'new') {
    showError('Invalid client ID');
    return;
  }

  fetchClient();

  // Event listeners
  editBtn.addEventListener('click', handleEdit);
  archiveBtn.addEventListener('click', handleArchive);
});
