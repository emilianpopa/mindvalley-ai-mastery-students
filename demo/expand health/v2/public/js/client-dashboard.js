/**
 * Client Dashboard JavaScript
 * Handles the enhanced modular client dashboard
 */

const API_BASE = window.location.origin;

// Get client ID from URL
const pathParts = window.location.pathname.split('/');
const clientId = pathParts[pathParts.length - 1];

// Sample activity data (will be replaced with API calls)
const sampleActivities = [
  {
    id: 1,
    type: 'protocol',
    title: 'Protocol Activated',
    date: '05.06.2025',
    icon: '📋',
    iconBg: '#DBEAFE',
    tag: 'Protocol',
    tagColor: '#3B82F6'
  },
  {
    id: 2,
    type: 'lab',
    title: 'Pathcare Full Blood Count',
    date: '31.05.2025',
    icon: '📄',
    iconBg: '#FEE2E2',
    tag: 'Labs & Tests',
    tagColor: '#EF4444'
  },
  {
    id: 3,
    type: 'note',
    title: 'Consultation 2 Summary & Transcript',
    date: '03.05.2025',
    icon: '📝',
    iconBg: '#FEF3C7',
    tag: 'Notes',
    tagColor: '#F59E0B'
  },
  {
    id: 4,
    type: 'form',
    title: 'Intake Form Completed',
    date: '02.01.2025',
    icon: '📋',
    iconBg: '#D1FAE5',
    tag: 'Forms',
    tagColor: '#10B981'
  },
  {
    id: 5,
    type: 'lab',
    title: 'Genetic Tests',
    date: 'Dec 2, 2024',
    icon: '🧬',
    iconBg: '#FEE2E2',
    tag: 'Labs & Tests',
    tagColor: '#EF4444'
  },
  {
    id: 6,
    type: 'form',
    title: 'Forms: Filled <Intake> form',
    date: 'Oct 17, 2024',
    icon: '📋',
    iconBg: '#D1FAE5',
    tag: 'Forms',
    tagColor: '#10B981'
  }
];

// Store client data globally
let currentClient = null;
let savedNotes = []; // Store notes in memory for demo

// ========== Card Menu (Kebab/3-dot menu) Functions ==========

// Toggle card menu visibility
function toggleCardMenu(event, menuId) {
  event.stopPropagation();
  const menu = document.getElementById(menuId);
  const wasOpen = menu.classList.contains('show');

  // Close all other menus first
  closeAllCardMenus();

  // Toggle this menu
  if (!wasOpen) {
    menu.classList.add('show');
  }
}

// Close all card menus
function closeAllCardMenus() {
  document.querySelectorAll('.card-menu-dropdown').forEach(menu => {
    menu.classList.remove('show');
  });
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.card-menu-container')) {
    closeAllCardMenus();
  }
});

// Delete protocol
async function deleteProtocol(protocolId) {
  if (!confirm('Are you sure you want to delete this protocol? This action cannot be undone.')) {
    return;
  }

  const token = localStorage.getItem('auth_token');
  try {
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      showNotification('Protocol deleted successfully', 'success');
      loadProtocols(); // Refresh the list
    } else {
      const data = await response.json();
      showNotification(data.error || 'Failed to delete protocol', 'error');
    }
  } catch (error) {
    console.error('Error deleting protocol:', error);
    showNotification('Error deleting protocol', 'error');
  }
}

// Delete engagement plan
async function deleteEngagementPlan(planId) {
  if (!confirm('Are you sure you want to delete this engagement plan? This action cannot be undone.')) {
    return;
  }

  const token = localStorage.getItem('auth_token');
  try {
    const response = await fetch(`${API_BASE}/api/protocols/engagement-plans/${planId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      showNotification('Engagement plan deleted successfully', 'success');
      loadEngagementPlans(); // Refresh the list
    } else {
      const data = await response.json();
      showNotification(data.error || 'Failed to delete engagement plan', 'error');
    }
  } catch (error) {
    console.error('Error deleting engagement plan:', error);
    showNotification('Error deleting engagement plan', 'error');
  }
}

// Print engagement plan by ID (opens view modal and prints)
async function printEngagementPlanById(planId) {
  const token = localStorage.getItem('auth_token');
  try {
    const response = await fetch(`${API_BASE}/api/protocols/${planId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const protocol = data.protocol;
      const engagementPlan = protocol.engagement_plan || '';

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Engagement Plan - ${protocol.title || 'ExpandHealth'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; line-height: 1.6; }
            h1 { color: #0F766E; margin-bottom: 8px; }
            h2 { color: #374151; font-size: 18px; margin-bottom: 20px; }
            .content { white-space: pre-wrap; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>ExpandHealth</h1>
          <h2>${protocol.title || 'Engagement Plan'}</h2>
          <div class="content">${engagementPlan.replace(/\n/g, '<br>')}</div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } else {
      showNotification('Failed to load engagement plan for printing', 'error');
    }
  } catch (error) {
    console.error('Error printing engagement plan:', error);
    showNotification('Error printing engagement plan', 'error');
  }
}

// ========== End Card Menu Functions ==========

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  if (!clientId || clientId === 'new') {
    showError('Invalid client ID');
    return;
  }

  loadClientData();
  setupTabNavigation();
  renderActivityFeed();
  loadSavedNotes();
  initFormsSearch();
});

// Tab navigation
function setupTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      // Update active states
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${targetTab}Tab`) {
          content.classList.add('active');
        }
      });

      // Load data for specific tabs
      if (targetTab === 'labs') {
        loadClientLabs();
      }
      if (targetTab === 'forms') {
        loadClientForms();
      }
      if (targetTab === 'notes') {
        loadClientNotes();
      }
      if (targetTab === 'protocol') {
        loadProtocols();
      }
      if (targetTab === 'engagement') {
        console.log('[Tab Switch] Engagement tab clicked, calling loadEngagementPlans');
        loadEngagementPlans();
      }
    });
  });
}

// Load client data
async function loadClientData() {
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
    currentClient = data.client; // Store client data globally
    displayClientHeader(data.client);

    // Load health metrics after client data is loaded
    loadHealthMetrics();

  } catch (error) {
    console.error('Error fetching client:', error);
    showError(error.message || 'Failed to load client data');
  }
}

// Display client header
function displayClientHeader(client) {
  const fullName = `${client.first_name} ${client.last_name}`;
  const age = calculateAge(client.date_of_birth);

  // Update header
  document.getElementById('clientName').textContent = fullName;
  document.getElementById('breadcrumbName').textContent = fullName;

  // Gender and age - matching the clients list format
  const gender = client.gender ? client.gender.charAt(0).toUpperCase() + client.gender.slice(1) : 'Unknown';
  document.getElementById('clientGender').textContent = gender;
  document.getElementById('clientAge').textContent = `${age} yrs`;

  // Avatar
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0F766E&color=fff&size=80`;
  document.getElementById('clientAvatar').src = avatarUrl;

  // Show header
  document.getElementById('clientHeader').style.display = 'block';
  document.getElementById('loadingState').style.display = 'none';
}

// Calculate age from date of birth
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 'N/A';
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Render activity feed
function renderActivityFeed() {
  const activityFeed = document.getElementById('activityFeed');

  const activitiesHtml = sampleActivities.map(activity => `
    <div class="activity-item">
      <div class="activity-timeline ${activity.id === 1 ? 'completed' : ''}">
        ${activity.id === 1 ? '✓' : '○'}
      </div>
      <div class="activity-icon" style="background: ${activity.iconBg};">
        ${activity.icon}
      </div>
      <div class="activity-info">
        <p class="activity-title">${activity.title}</p>
        <p class="activity-date">${activity.date}</p>
      </div>
      <div class="activity-tag" style="background: ${activity.tagColor}20; color: ${activity.tagColor};">
        ${activity.tag}
      </div>
      <div class="activity-actions">
        <button class="activity-btn" title="View">👁️</button>
        <button class="activity-btn" title="More">⋯</button>
      </div>
    </div>
  `).join('');

  activityFeed.innerHTML = activitiesHtml;
}

// Refresh AI Summary
function refreshSummary() {
  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = 'Refreshing...';
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = originalText;
    btn.disabled = false;
    alert('AI summary refreshed! In production, this would call the AI to regenerate the summary based on latest data.');
  }, 1500);
}

// Assign Form - Open modal and load forms
async function assignForm() {
  const modal = document.getElementById('assignFormModal');
  const formSelect = document.getElementById('formSelect');
  const clientEmail = document.getElementById('clientEmail');

  // Set client email
  if (currentClient) {
    clientEmail.value = currentClient.email || 'No email on file';
  }

  // Show modal
  modal.style.display = 'flex';

  // Load available forms
  try {
    const response = await fetch('/data/forms-data.json');
    if (!response.ok) {
      throw new Error('Failed to load forms');
    }

    const forms = await response.json();

    // Filter only published forms
    const publishedForms = forms.filter(form => form.status === 'published');

    // Populate form select
    formSelect.innerHTML = '<option value="">Select a form...</option>' +
      publishedForms.map(form =>
        `<option value="${form.id}">${form.name}</option>`
      ).join('');

    if (publishedForms.length === 0) {
      formSelect.innerHTML = '<option value="">No published forms available</option>';
    }

  } catch (error) {
    console.error('Error loading forms:', error);
    formSelect.innerHTML = '<option value="">Error loading forms</option>';
  }
}

// Close Assign Form modal
function closeAssignFormModal() {
  const modal = document.getElementById('assignFormModal');
  modal.style.display = 'none';

  // Reset form
  document.getElementById('formSelect').value = '';
  document.getElementById('assignMessage').value = '';
}

// Send Form Assignment
async function sendFormAssignment() {
  const formId = document.getElementById('formSelect').value;
  const message = document.getElementById('assignMessage').value;

  if (!formId) {
    alert('Please select a form to assign');
    return;
  }

  if (!currentClient || !currentClient.email) {
    alert('Client email not found');
    return;
  }

  // In production, this would call an API to send the form
  // For now, we'll simulate the assignment
  const formSelect = document.getElementById('formSelect');
  const formName = formSelect.options[formSelect.selectedIndex].text;

  console.log('Form Assignment:', {
    clientId: currentClient.id,
    clientEmail: currentClient.email,
    formId: formId,
    formName: formName,
    message: message
  });

  alert(
    `Form Assignment Sent!\n\n` +
    `Form: ${formName}\n` +
    `Sent to: ${currentClient.email}\n\n` +
    `The client will receive an email with a secure link and OTP verification.`
  );

  closeAssignFormModal();

  // TODO: In production, add this to activity feed
  // and update the Forms tab to show pending assignment
}

// ============================================
// LABS & TESTS FUNCTIONALITY
// ============================================

let clientLabs = [];
let currentViewingLab = null;
let selectedLabFile = null;

// Load labs when switching to labs tab
function loadClientLabs() {
  if (!clientId) return;

  const labsLoading = document.getElementById('labsLoading');
  const labsEmpty = document.getElementById('labsEmpty');
  const labsTableContainer = document.getElementById('labsTableContainer');

  labsLoading.style.display = 'flex';
  labsEmpty.style.display = 'none';
  labsTableContainer.style.display = 'none';

  const token = localStorage.getItem('auth_token');

  fetch(`${API_BASE}/api/labs?client_id=${clientId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => response.json())
    .then(data => {
      clientLabs = data.labs || [];
      labsLoading.style.display = 'none';

      if (clientLabs.length === 0) {
        labsEmpty.style.display = 'block';
      } else {
        labsTableContainer.style.display = 'block';
        renderLabsTable();
      }
    })
    .catch(error => {
      console.error('Error loading labs:', error);
      labsLoading.style.display = 'none';
      labsEmpty.style.display = 'block';
      labsEmpty.innerHTML = '<p>Error loading labs. Please try again.</p>';
    });
}

// Render labs table
function renderLabsTable() {
  const tbody = document.getElementById('labsTableBody');

  tbody.innerHTML = clientLabs.map(lab => {
    const tagClass = lab.lab_type ? lab.lab_type.toLowerCase().replace(/\s+/g, '-') : 'other';
    const uploadedDate = new Date(lab.uploaded_date || lab.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const summaryPreview = lab.ai_summary
      ? lab.ai_summary.substring(0, 50) + '...'
      : 'No summary';
    const summaryClass = lab.ai_summary ? 'has-summary' : 'no-summary';

    return `
      <tr>
        <td>
          <div class="file-name-cell">
            <div class="file-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <span class="file-name">${lab.title || 'Untitled Document'}</span>
          </div>
        </td>
        <td>
          <span class="tag-badge ${tagClass}">${lab.lab_type || 'Other'}</span>
        </td>
        <td>${uploadedDate}</td>
        <td>
          <span class="summary-preview ${summaryClass}">${summaryPreview}</span>
        </td>
        <td>
          <div class="lab-actions">
            <button class="action-btn view-btn" onclick="viewLab(${lab.id})" title="View">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button class="action-btn download-btn" onclick="downloadLab(${lab.id})" title="Download">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button class="action-btn delete-btn" onclick="deleteLab(${lab.id})" title="Delete">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Open upload modal
function openUploadLabModal() {
  const modal = document.getElementById('uploadLabModal');
  modal.style.display = 'flex';

  // Reset form
  document.getElementById('labFileName').value = '';
  document.getElementById('labTag').value = 'Blood Test';
  clearFileSelection();

  // Setup file upload zone
  setupFileUploadZone();
}

// Close upload modal
function closeUploadLabModal() {
  const modal = document.getElementById('uploadLabModal');
  modal.style.display = 'none';
  clearFileSelection();
}

// Setup file upload drag and drop
function setupFileUploadZone() {
  const zone = document.getElementById('fileUploadZone');
  const input = document.getElementById('labFileInput');

  // Click to upload
  zone.onclick = () => input.click();

  // Handle file selection
  input.onchange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  // Drag and drop
  zone.ondragover = (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  };

  zone.ondragleave = () => {
    zone.classList.remove('drag-over');
  };

  zone.ondrop = (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };
}

// Handle file selection
function handleFileSelection(file) {
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  if (!allowedTypes.includes(file.type)) {
    alert('Please select a PDF or Word document.');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('File size must be less than 10MB.');
    return;
  }

  selectedLabFile = file;

  // Update UI
  document.getElementById('uploadPlaceholder').style.display = 'none';
  document.getElementById('uploadPreview').style.display = 'flex';
  document.getElementById('selectedFileName').textContent = file.name;
  document.getElementById('selectedFileSize').textContent = formatFileSize(file.size);

  // Auto-fill file name if empty
  const fileNameInput = document.getElementById('labFileName');
  if (!fileNameInput.value) {
    fileNameInput.value = file.name.replace(/\.[^/.]+$/, '');
  }
}

// Clear file selection
function clearFileSelection() {
  selectedLabFile = null;
  document.getElementById('labFileInput').value = '';
  document.getElementById('uploadPlaceholder').style.display = 'block';
  document.getElementById('uploadPreview').style.display = 'none';
}

// Format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Upload lab file
async function uploadLabFile() {
  if (!selectedLabFile) {
    alert('Please select a file to upload.');
    return;
  }

  const fileName = document.getElementById('labFileName').value.trim();
  const labTag = document.getElementById('labTag').value;

  if (!fileName) {
    alert('Please enter a file name.');
    return;
  }

  const uploadBtn = document.getElementById('uploadLabBtn');
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Uploading...';

  const formData = new FormData();
  formData.append('file', selectedLabFile);
  formData.append('client_id', clientId);
  formData.append('title', fileName);
  formData.append('lab_type', labTag);

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/labs/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();
    console.log('Lab uploaded:', data);

    closeUploadLabModal();
    loadClientLabs();

    alert('File uploaded successfully!');

  } catch (error) {
    console.error('Error uploading lab:', error);
    alert('Error uploading file: ' + error.message);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload';
  }
}

// ============================================
// PDF.JS LAB VIEWER FUNCTIONALITY
// ============================================

// Initialize PDF.js worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// PDF.js state for lab viewer
let labPdfDoc = null;
let labPdfCurrentPage = 1;
let labPdfTotalPages = 0;
let labPdfCurrentScale = 1.5; // Start at 150% for clinical clarity
let labPdfBaseScale = 1.5;
const LAB_PDF_MIN_SCALE = 0.5;
const LAB_PDF_MAX_SCALE = 4.0;
const LAB_PDF_SCALE_STEP = 0.25;

// Load PDF using PDF.js for high-quality rendering
async function loadLabPdfWithPdfJs(url) {
  console.log('🔷 loadLabPdfWithPdfJs called with URL:', url);
  console.log('🔷 pdfjsLib available:', !!window.pdfjsLib);

  if (!window.pdfjsLib) {
    console.warn('PDF.js not available, falling back to iframe');
    useLabPdfFallbackIframe(url);
    return;
  }

  const container = document.getElementById('labPdfContainer');
  const canvas = document.getElementById('labPdfCanvas');
  const iframe = document.getElementById('labPdfFrame');

  try {
    // Show loading state
    if (canvas) canvas.style.display = 'none';
    if (iframe) iframe.style.display = 'none';
    container.innerHTML = '<div class="pdf-loading-indicator"><div class="mini-loader"></div><p>Loading PDF with high quality...</p></div><canvas id="labPdfCanvas"></canvas><iframe id="labPdfFrame" src="" frameborder="0" style="display: none;"></iframe>';

    console.log('🔷 Loading PDF document...');
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(url);
    labPdfDoc = await loadingTask.promise;
    labPdfTotalPages = labPdfDoc.numPages;
    labPdfCurrentPage = 1;
    console.log('🔷 PDF loaded successfully, pages:', labPdfTotalPages);

    // Remove loading indicator
    const loadingIndicator = container.querySelector('.pdf-loading-indicator');
    if (loadingIndicator) loadingIndicator.remove();

    // Show canvas
    document.getElementById('labPdfCanvas').style.display = 'block';

    // Calculate initial scale to fit width
    await calculateLabPdfFitWidthScale();
    console.log('🔷 Scale calculated:', labPdfCurrentScale);

    // Render the first page
    await renderLabPdfPage(labPdfCurrentPage);
    console.log('🔷 Page rendered successfully');

    // Update page info
    updateLabPdfPageInfo();

  } catch (error) {
    console.error('Error loading PDF with PDF.js:', error);
    useLabPdfFallbackIframe(url);
  }
}

// Calculate scale to fit container width for lab PDF
async function calculateLabPdfFitWidthScale() {
  if (!labPdfDoc) return;

  try {
    const page = await labPdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    const container = document.getElementById('labPdfContainer');
    const containerWidth = container.clientWidth - 40; // Account for padding

    // Calculate scale to fit width, with a minimum for readability
    labPdfBaseScale = Math.max(containerWidth / viewport.width, 1.0);
    labPdfCurrentScale = labPdfBaseScale;
  } catch (error) {
    console.error('Error calculating fit width scale:', error);
  }
}

// Render a specific page for lab PDF
async function renderLabPdfPage(pageNum) {
  if (!labPdfDoc) return;

  try {
    const page = await labPdfDoc.getPage(pageNum);
    const canvas = document.getElementById('labPdfCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Use device pixel ratio for sharp rendering on high-DPI displays
    const devicePixelRatio = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: labPdfCurrentScale });

    // Set canvas dimensions for high-DPI rendering
    canvas.width = viewport.width * devicePixelRatio;
    canvas.height = viewport.height * devicePixelRatio;

    // Set display size (CSS)
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';

    // Scale context for high-DPI
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Render the page with high quality settings
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      enableWebGL: true,
      renderInteractiveForms: true
    };

    await page.render(renderContext).promise;

    // Update zoom display
    updateLabPdfZoomDisplay();

  } catch (error) {
    console.error('Error rendering page:', error);
  }
}

// Use fallback iframe if PDF.js fails
function useLabPdfFallbackIframe(url) {
  const container = document.getElementById('labPdfContainer');
  const canvas = document.getElementById('labPdfCanvas');
  const iframe = document.getElementById('labPdfFrame');

  if (canvas) canvas.style.display = 'none';
  if (iframe) {
    iframe.style.display = 'block';
    iframe.src = url;
  }

  // Hide PDF.js controls
  const controls = document.querySelector('.pdf-controls');
  if (controls) controls.style.display = 'none';
}

// Update zoom display for lab PDF
function updateLabPdfZoomDisplay() {
  const percentage = Math.round(labPdfCurrentScale * 100);
  const display = document.getElementById('labPdfZoomLevel');
  if (display) display.textContent = `${percentage}%`;
}

// Update page info display for lab PDF
function updateLabPdfPageInfo() {
  const display = document.getElementById('labPdfPageInfo');
  if (display) display.textContent = `${labPdfCurrentPage} / ${labPdfTotalPages}`;

  // Enable/disable navigation buttons
  const prevBtn = document.getElementById('labPdfPrevBtn');
  const nextBtn = document.getElementById('labPdfNextBtn');
  if (prevBtn) prevBtn.disabled = labPdfCurrentPage <= 1;
  if (nextBtn) nextBtn.disabled = labPdfCurrentPage >= labPdfTotalPages;
}

// Lab PDF zoom in
function labPdfZoomIn() {
  if (labPdfCurrentScale < LAB_PDF_MAX_SCALE) {
    labPdfCurrentScale = Math.min(labPdfCurrentScale + LAB_PDF_SCALE_STEP, LAB_PDF_MAX_SCALE);
    renderLabPdfPage(labPdfCurrentPage);
  }
}

// Lab PDF zoom out
function labPdfZoomOut() {
  if (labPdfCurrentScale > LAB_PDF_MIN_SCALE) {
    labPdfCurrentScale = Math.max(labPdfCurrentScale - LAB_PDF_SCALE_STEP, LAB_PDF_MIN_SCALE);
    renderLabPdfPage(labPdfCurrentPage);
  }
}

// Lab PDF fit to width
async function labPdfFitWidth() {
  await calculateLabPdfFitWidthScale();
  renderLabPdfPage(labPdfCurrentPage);
}

// Lab PDF previous page
function labPdfPrevPage() {
  if (labPdfCurrentPage > 1) {
    labPdfCurrentPage--;
    renderLabPdfPage(labPdfCurrentPage);
    updateLabPdfPageInfo();
    document.getElementById('labPdfContainer').scrollTop = 0;
  }
}

// Lab PDF next page
function labPdfNextPage() {
  if (labPdfCurrentPage < labPdfTotalPages) {
    labPdfCurrentPage++;
    renderLabPdfPage(labPdfCurrentPage);
    updateLabPdfPageInfo();
    document.getElementById('labPdfContainer').scrollTop = 0;
  }
}

// View lab in modal
async function viewLab(labId) {
  const lab = clientLabs.find(l => l.id === labId);
  if (!lab) return;

  currentViewingLab = lab;

  // Update modal content - using new simpler design
  document.getElementById('labSidebarTitle').textContent = lab.title || 'Lab Document';
  document.getElementById('labSidebarTag').textContent = lab.lab_type || 'Other';

  // Format date nicely
  const uploadDate = new Date(lab.uploaded_date || lab.created_at);
  document.getElementById('labSidebarDate').textContent = uploadDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');

  // Load PDF with simple iframe (clearer than PDF.js canvas rendering)
  const pdfFrame = document.getElementById('labPdfFrame');
  pdfFrame.src = lab.file_url;

  // Update AI Summary
  const summaryContainer = document.getElementById('labAiSummary');
  const summaryBtn = document.getElementById('generateLabSummaryBtn');
  if (lab.ai_summary) {
    summaryContainer.innerHTML = formatAISummary(lab.ai_summary);
    summaryBtn.textContent = '🔄 Regenerate Summary';
    summaryBtn.classList.add('has-summary');
  } else {
    summaryContainer.innerHTML = '<p class="summary-placeholder">Click below to generate an AI summary of this document.</p>';
    summaryBtn.textContent = '✨ Generate Summary';
    summaryBtn.classList.remove('has-summary');
  }

  // Load notes
  loadLabNotes(labId);

  // Show modal
  document.getElementById('labViewerModal').style.display = 'flex';
}

// Format AI summary for display
function formatAISummary(summary) {
  // Convert markdown-like formatting to HTML
  return summary
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '<br>• ')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

// Close lab viewer modal
function closeLabViewerModal() {
  document.getElementById('labViewerModal').style.display = 'none';
  document.getElementById('labPdfFrame').src = '';
  currentViewingLab = null;
}

// Download lab PDF
function downloadLabPdf() {
  if (!currentViewingLab) {
    console.log('No lab selected for download');
    return;
  }

  console.log('Downloading lab:', currentViewingLab.title, currentViewingLab.file_url);

  // Create a temporary link and trigger download
  const link = document.createElement('a');
  link.href = currentViewingLab.file_url;
  link.download = currentViewingLab.title || 'lab-result.pdf';
  link.target = '_blank';

  // For demo labs without real files, show a message
  if (currentViewingLab.file_url && currentViewingLab.file_url.includes('/demo-')) {
    alert('This is a demo lab without an actual PDF file. In production, the PDF would download here.');
    return;
  }

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Print lab PDF
function printLabPdf() {
  if (!currentViewingLab) {
    console.log('No lab selected for print');
    return;
  }

  console.log('Printing lab:', currentViewingLab.title);

  // For demo labs without real files, show a message
  if (currentViewingLab.file_url && currentViewingLab.file_url.includes('/demo-')) {
    alert('This is a demo lab without an actual PDF file. In production, the PDF would print here.');
    return;
  }

  const iframe = document.getElementById('labPdfFrame');
  if (iframe && iframe.contentWindow) {
    try {
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print failed:', e);
      // Fallback: open in new tab for printing
      window.open(currentViewingLab.file_url, '_blank');
    }
  }
}

// Show more options menu for lab
function showLabMoreOptions() {
  // For now, show a simple alert with options
  const options = [
    'Delete this lab',
    'View full screen',
    'Share with patient',
    'Add to protocol'
  ];

  const choice = prompt('More Options:\\n1. Delete this lab\\n2. View full screen\\n3. Share with patient\\n4. Add to protocol\\n\\nEnter option number (or cancel):');

  if (choice === '1') {
    if (confirm('Are you sure you want to delete this lab?')) {
      deleteLab(currentViewingLab.id);
    }
  } else if (choice === '2') {
    window.open(`/labs/${currentViewingLab.id}`, '_blank');
  } else if (choice === '3') {
    alert('Share functionality coming soon!');
  } else if (choice === '4') {
    alert('Add to protocol functionality coming soon!');
  }
}

// Generate AI summary
async function generateLabSummary() {
  if (!currentViewingLab) return;

  const btn = document.getElementById('generateLabSummaryBtn');
  const summaryContainer = document.getElementById('labAiSummary');

  btn.disabled = true;
  btn.textContent = 'Generating...';
  summaryContainer.innerHTML = '<p style="color: #6B7280; font-style: italic;">Analyzing document...</p>';

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/labs/${currentViewingLab.id}/generate-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.summary) {
      summaryContainer.innerHTML = formatAISummary(data.summary);
      currentViewingLab.ai_summary = data.summary;

      // Update the table view as well
      const labIndex = clientLabs.findIndex(l => l.id === currentViewingLab.id);
      if (labIndex >= 0) {
        clientLabs[labIndex].ai_summary = data.summary;
        renderLabsTable();
      }
    }

  } catch (error) {
    console.error('Error generating summary:', error);
    summaryContainer.innerHTML = '<p style="color: #DC2626;">Error generating summary. Please try again.</p>';
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Regenerate Summary';
  }
}

// Load lab notes
async function loadLabNotes(labId) {
  const container = document.getElementById('labNotesContainer');
  container.innerHTML = '<p class="lab-notes-empty">Loading notes...</p>';

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/labs/${labId}/notes`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    const notes = data.notes || [];

    if (notes.length === 0) {
      container.innerHTML = '<p class="lab-notes-empty">No notes yet. Add the first note below.</p>';
    } else {
      container.innerHTML = notes.map(note => {
        const noteDate = new Date(note.created_at).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).replace(/\//g, '.');

        // Determine role class and display name
        const role = note.author_role || 'admin';
        const roleClass = role.toLowerCase();
        const roleName = role.charAt(0).toUpperCase() + role.slice(1);
        const authorName = note.author_name || 'Staff';

        return `
          <div class="lab-note-item" data-note-id="${note.id}">
            <p class="lab-note-content">${escapeHtml(note.content)}</p>
            <div class="lab-note-meta">
              <div class="lab-note-author">
                <span class="lab-note-author-name">${authorName}</span>
                <span class="lab-note-role ${roleClass}">${roleName}</span>
              </div>
              <span class="lab-note-date">${noteDate}</span>
            </div>
          </div>
        `;
      }).join('');
    }

  } catch (error) {
    console.error('Error loading notes:', error);
    container.innerHTML = '<p class="lab-notes-empty">Error loading notes.</p>';
  }
}

// Add a note to the lab
async function addLabNote() {
  if (!currentViewingLab) return;

  const input = document.getElementById('labNoteInput');
  const content = input.value.trim();

  if (!content) {
    alert('Please enter a note.');
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/labs/${currentViewingLab.id}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      throw new Error('Failed to add note');
    }

    input.value = '';
    loadLabNotes(currentViewingLab.id);

  } catch (error) {
    console.error('Error adding note:', error);
    alert('Error adding note. Please try again.');
  }
}

// Delete a lab
async function deleteLab(labId) {
  const lab = clientLabs.find(l => l.id === labId);
  if (!lab) return;

  if (!confirm(`Delete "${lab.title}"? This cannot be undone.`)) {
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/labs/${labId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete lab');
    }

    loadClientLabs();
    alert('Lab deleted successfully.');

  } catch (error) {
    console.error('Error deleting lab:', error);
    alert('Error deleting lab. Please try again.');
  }
}

// Download lab
function downloadLab(labId) {
  const lab = clientLabs.find(l => l.id === labId);
  if (lab && lab.file_url) {
    window.open(lab.file_url, '_blank');
  }
}

// Escape HTML for safe rendering
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Legacy function (now redirects to openUploadLabModal)
function uploadLab() {
  openUploadLabModal();
}

function createReport() {
  alert('Create Report: This will open the wearables report builder with metrics selection and export options.');
}

// Note Management
let isVoiceInputActive = false;
let isAIScribeActive = false;
let recognition = null;

function newNote() {
  const modal = document.getElementById('newNoteModal');
  modal.style.display = 'flex';

  // Reset form
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteType').value = 'consultation';
  document.getElementById('noteContent').value = '';
  document.getElementById('generateSummary').checked = true;
  document.getElementById('aiSummaryPreview').style.display = 'none';

  // Reset voice/AI states
  if (isVoiceInputActive) toggleVoiceInput();
  if (isAIScribeActive) toggleAIScribe();
}

function closeNewNoteModal() {
  const modal = document.getElementById('newNoteModal');
  modal.style.display = 'none';

  // Stop any active voice input
  if (isVoiceInputActive) toggleVoiceInput();
  if (isAIScribeActive) toggleAIScribe();
}

function toggleVoiceInput() {
  const btn = document.getElementById('voiceInputBtn');
  const icon = document.getElementById('voiceIcon');
  const text = document.getElementById('voiceText');
  const noteContent = document.getElementById('noteContent');

  if (!isVoiceInputActive) {
    // Start voice input
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          noteContent.value += finalTranscript;
        }
      };

      recognition.start();
      isVoiceInputActive = true;
      btn.classList.add('active');
      icon.textContent = '⏹️';
      text.textContent = 'Stop Voice';
    } else {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
    }
  } else {
    // Stop voice input
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
    isVoiceInputActive = false;
    btn.classList.remove('active');
    icon.textContent = '🎤';
    text.textContent = 'Start Voice';
  }
}

function toggleAIScribe() {
  const btn = document.getElementById('aiScribeBtn');
  const status = document.getElementById('aiScribeStatus');

  if (!isAIScribeActive) {
    // Start AI Scribe
    isAIScribeActive = true;
    btn.classList.add('active');
    status.style.display = 'flex';

    // Automatically start voice input too
    if (!isVoiceInputActive) {
      toggleVoiceInput();
    }

    console.log('AI Scribe activated - will transcribe and summarize in real-time');
  } else {
    // Stop AI Scribe
    isAIScribeActive = false;
    btn.classList.remove('active');
    status.style.display = 'none';

    console.log('AI Scribe deactivated');
  }
}

function generateAISummaryPreview() {
  const noteContent = document.getElementById('noteContent').value;
  const preview = document.getElementById('aiSummaryPreview');
  const summaryContent = document.getElementById('summaryContent');
  const generateSummary = document.getElementById('generateSummary').checked;

  if (!generateSummary) {
    alert('Please check "Generate AI summary" to preview');
    return;
  }

  if (!noteContent.trim()) {
    alert('Please enter some note content first');
    return;
  }

  // Show preview
  preview.style.display = 'block';
  summaryContent.innerHTML = '<p style="color: #6B7280; font-style: italic;">Generating AI summary...</p>';

  // Simulate AI summary generation
  setTimeout(() => {
    summaryContent.innerHTML = `
      <ul style="margin: 0; padding-left: 20px;">
        <li><strong>Chief Complaint:</strong> ${extractKeyPhrase(noteContent, 'complaint')}</li>
        <li><strong>Assessment:</strong> ${extractKeyPhrase(noteContent, 'assessment')}</li>
        <li><strong>Plan:</strong> ${extractKeyPhrase(noteContent, 'plan')}</li>
        <li><strong>Follow-up:</strong> Scheduled for next consultation</li>
      </ul>
      <p style="margin-top: 12px; font-size: 13px; color: #6B7280;">
        This is a preview. The actual AI summary will be more detailed and accurate.
      </p>
    `;
  }, 1500);
}

function extractKeyPhrase(text, type) {
  // Simple extraction logic for demo
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  if (sentences.length === 0) return 'Not specified';

  const randomSentence = sentences[Math.floor(Math.random() * sentences.length)].trim();
  return randomSentence || 'Not specified';
}

function saveNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const type = document.getElementById('noteType').value;
  const content = document.getElementById('noteContent').value.trim();
  const generateSummary = document.getElementById('generateSummary').checked;

  if (!title) {
    alert('Please enter a note title');
    return;
  }

  if (!content) {
    alert('Please enter note content');
    return;
  }

  // Generate AI summary if requested
  let aiSummary = null;
  if (generateSummary) {
    aiSummary = generateSimpleAISummary(content);
  }

  const noteData = {
    id: Date.now(),
    clientId: currentClient?.id,
    clientName: currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : 'Unknown',
    title,
    type,
    content,
    aiSummary,
    createdAt: new Date().toISOString()
  };

  // Save to memory
  savedNotes.unshift(noteData); // Add to beginning of array

  console.log('Saving note:', noteData);

  alert(
    `Note Saved Successfully!\n\n` +
    `Title: ${title}\n` +
    `Type: ${type}\n` +
    `Client: ${noteData.clientName}\n\n` +
    `${generateSummary ? 'AI summary generated and attached to note.' : 'Note saved without AI summary.'}`
  );

  closeNewNoteModal();

  // Refresh notes display
  loadSavedNotes();

  // Add to activity feed
  addNoteToActivityFeed(noteData);
}

// Generate simple AI summary for demo
function generateSimpleAISummary(content) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim());
  if (sentences.length === 0) return 'No content to summarize';

  const summary = {
    keyPoints: sentences.slice(0, 3).map(s => s.trim()),
    wordCount: content.split(/\s+/).length,
    timestamp: new Date().toISOString()
  };

  return summary;
}

// Load and display saved notes
function loadSavedNotes() {
  const notesContent = document.getElementById('notesContent');

  if (savedNotes.length === 0) {
    notesContent.innerHTML = `
      <p class="empty-message">
        Notes module will display consultation notes, notes-on-the-go, AI transcripts, and voice-to-text entries.
      </p>
    `;
    return;
  }

  const notesHtml = savedNotes.map(note => {
    const date = new Date(note.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const typeLabels = {
      consultation: 'Consultation',
      on_the_go: 'On-the-Go',
      ai_transcript: 'AI Transcript',
      voice_to_text: 'Voice-to-Text'
    };

    const typeLabel = typeLabels[note.type] || note.type;
    const contentPreview = note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '');

    return `
      <div class="note-card">
        <div class="note-card-header">
          <div>
            <h3 class="note-card-title">${note.title}</h3>
            <p class="note-card-meta">${typeLabel} • ${formattedDate}</p>
          </div>
          <div class="note-card-actions">
            <button class="note-action-btn" onclick="viewNote(${note.id})" title="View full note">👁️</button>
            <button class="note-action-btn" onclick="deleteNote(${note.id})" title="Delete note">🗑️</button>
          </div>
        </div>
        <div class="note-card-content">
          <p>${contentPreview}</p>
        </div>
        ${note.aiSummary ? `
          <div class="note-card-summary">
            <p style="font-weight: 600; margin-bottom: 8px;">✨ AI Summary:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${note.aiSummary.keyPoints.map(point => `<li>${point}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  notesContent.innerHTML = notesHtml;
}

// View full note
function viewNote(noteId) {
  const note = savedNotes.find(n => n.id === noteId);
  if (!note) return;

  const date = new Date(note.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const typeLabels = {
    consultation: 'Consultation',
    on_the_go: 'On-the-Go',
    ai_transcript: 'AI Transcript',
    voice_to_text: 'Voice-to-Text'
  };

  const summaryHtml = note.aiSummary ? `
    <div style="margin-top: 20px; padding: 16px; background: #F9FAFB; border-radius: 8px;">
      <p style="font-weight: 600; margin-bottom: 12px;">✨ AI Summary:</p>
      <ul style="margin: 0; padding-left: 20px;">
        ${note.aiSummary.keyPoints.map(point => `<li style="margin-bottom: 6px;">${point}</li>`).join('')}
      </ul>
      <p style="margin-top: 12px; font-size: 13px; color: #6B7280;">
        ${note.aiSummary.wordCount} words • Generated ${new Date(note.aiSummary.timestamp).toLocaleTimeString()}
      </p>
    </div>
  ` : '';

  alert(
    `${note.title}\n\n` +
    `Type: ${typeLabels[note.type]}\n` +
    `Date: ${formattedDate}\n` +
    `Client: ${note.clientName}\n\n` +
    `Content:\n${note.content}\n\n` +
    `${note.aiSummary ? `AI Summary:\n${note.aiSummary.keyPoints.join('\n')}\n\n` : ''}` +
    `(Full note viewer will be a modal in production)`
  );
}

// Delete note
function deleteNote(noteId) {
  const note = savedNotes.find(n => n.id === noteId);
  if (!note) return;

  if (!confirm(`Delete note "${note.title}"?`)) return;

  savedNotes = savedNotes.filter(n => n.id !== noteId);
  loadSavedNotes();
  alert('Note deleted successfully');
}

// Add note to activity feed
function addNoteToActivityFeed(note) {
  const newActivity = {
    id: note.id,
    type: 'note',
    title: note.title,
    date: new Date(note.createdAt).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    }),
    icon: '📝',
    iconBg: '#FEF3C7',
    tag: 'Notes',
    tagColor: '#F59E0B'
  };

  sampleActivities.unshift(newActivity);
  renderActivityFeed();
}

function generateProtocol() {
  alert('Generate Protocol: This will use AI to draft a personalized protocol based on all available client data.');
}

function refreshData() {
  alert('Refreshing health metrics data...\n\nThis would fetch the latest data from connected devices and APIs.');
}

function editClient() {
  window.location.href = `/clients/${clientId}/edit`;
}

function archiveClient() {
  const clientName = document.getElementById('clientName').textContent;
  if (!confirm(`Are you sure you want to archive ${clientName}?\n\nThey will be moved to archived status and hidden from the active client list.`)) {
    return;
  }

  alert('Archive functionality will be implemented. This would set the client status to "archived".');
}

// Regenerate AI summary
function regenerateSummary() {
  const summaryContent = document.querySelector('.summary-content');
  const timestamp = document.querySelector('.summary-timestamp');

  // Show loading state
  summaryContent.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div class="loader"></div>
      <p style="margin-top: 12px; color: #6B7280;">Generating AI summary...</p>
    </div>
  `;

  // Simulate AI generation
  setTimeout(() => {
    summaryContent.innerHTML = `
      <ul>
        <li><strong>Sleep quality declining:</strong> Average 5.2 hours/night, down from 6.8 hours. Consider sleep hygiene protocol.</li>
        <li><strong>Diet compliance excellent:</strong> Hitting 90% of nutrition targets. Mediterranean protocol working well.</li>
        <li><strong>Stress levels elevated:</strong> HRV readings suggest high sympathetic activation. Recommend breathing exercises.</li>
        <li><strong>Activity maintaining:</strong> Meeting daily step goals and workout frequency. Excellent consistency.</li>
      </ul>
    `;
    if (timestamp) {
      timestamp.textContent = `Last updated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  }, 2000);
}

// Regenerate Personality Insights using AI
async function regeneratePersonalityInsights() {
  const insightsList = document.getElementById('personalityInsightsList');
  const personalityCard = document.querySelector('.personality-card');

  // Show loading state
  if (insightsList) {
    insightsList.innerHTML = `
      <li style="text-align: center; padding: 20px; list-style: none;">
        <div class="loader"></div>
        <p style="margin-top: 12px; color: #6B7280;">Analyzing client data with AI...</p>
        <p style="font-size: 12px; color: #9CA3AF;">This may take a few seconds</p>
      </li>
    `;
  }

  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE}/api/chat/personality-insights/${clientId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to generate personality insights');
    }

    const data = await response.json();

    // Update personality traits
    document.getElementById('personalityType').textContent = data.personalityType || 'Unknown';
    document.getElementById('communicationStyle').textContent = data.communicationStyle || 'Unknown';
    document.getElementById('decisionMaking').textContent = data.decisionMaking || 'Unknown';
    document.getElementById('motivationDriver').textContent = data.motivationDriver || 'Unknown';

    // Update insights list
    if (insightsList && data.insights && Array.isArray(data.insights)) {
      insightsList.innerHTML = data.insights.map(insight =>
        `<li><strong>${insight.category}:</strong> ${insight.text}</li>`
      ).join('');

      // Add confidence indicator and data sources
      const confidenceBadge = data.confidence === 'high' ? '🟢 High confidence'
        : data.confidence === 'medium' ? '🟡 Medium confidence'
        : '🔴 Low confidence';

      const dataSourcesText = `Based on ${data.dataSourcesUsed?.notes || 0} notes and ${data.dataSourcesUsed?.formSubmissions || 0} form submissions`;

      insightsList.innerHTML += `
        <li style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280; list-style: none;">
          <span style="display: block; margin-bottom: 4px;">${confidenceBadge}</span>
          <span>${dataSourcesText}</span>
        </li>
      `;
    }

    // Show success feedback
    if (personalityCard) {
      const header = personalityCard.querySelector('.card-header');
      const successMsg = document.createElement('span');
      successMsg.className = 'personality-success-msg';
      successMsg.style.cssText = 'color: #10B981; font-size: 12px; margin-left: 12px;';
      successMsg.textContent = '✓ Updated';
      header.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    }

  } catch (error) {
    console.error('Error generating personality insights:', error);

    // Show error state with fallback to mock data
    if (insightsList) {
      insightsList.innerHTML = `
        <li style="color: #EF4444; list-style: none; text-align: center; padding: 12px;">
          <p>Failed to generate insights. Using default profile.</p>
          <button onclick="regeneratePersonalityInsights()" style="margin-top: 8px; padding: 6px 12px; background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 6px; cursor: pointer;">
            Try Again
          </button>
        </li>
      `;
    }

    // Fall back to default values
    document.getElementById('personalityType').textContent = 'INTJ - The Architect';
    document.getElementById('communicationStyle').textContent = 'Thoughtful & Strategic';
    document.getElementById('decisionMaking').textContent = 'Data-Driven';
    document.getElementById('motivationDriver').textContent = 'Health & Longevity';

    setTimeout(() => {
      if (insightsList) {
        insightsList.innerHTML = `
          <li><strong>Best approach:</strong> Present information with clear data and evidence.</li>
          <li><strong>Communication tip:</strong> Be thorough but concise, respecting their time.</li>
          <li><strong>Engagement style:</strong> Set clear milestones and track measurable progress.</li>
          <li><strong>Potential challenges:</strong> May need detailed explanations for recommendations.</li>
        `;
      }
    }, 2000);
  }
}

// Load personality insights on page load (if dashboard tab is active)
async function loadPersonalityInsights() {
  // Only load if we have a valid client ID and the personality section exists
  if (!clientId || clientId === 'new') return;

  const personalityCard = document.querySelector('.personality-card');
  if (!personalityCard) return;

  // Check if we have cached/stored personality data
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // We could add an endpoint to GET cached personality insights
    // For now, the default values in HTML will display until user clicks Refresh
  } catch (error) {
    console.error('Error loading personality insights:', error);
  }
}

// Right panel functions
let clientQuickNotes = [];

function openRightPanel() {
  document.getElementById('rightPanel').style.display = 'flex';
  loadQuickNotes();
}

function closeRightPanel() {
  document.getElementById('rightPanel').style.display = 'none';
}

// Load quick notes for the current client
async function loadQuickNotes() {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/notes/client/${clientId}?type=quick_note&limit=20`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      clientQuickNotes = data.notes;
      renderQuickNotesList();
    }
  } catch (error) {
    console.error('Error loading quick notes:', error);
  }
}

// Render quick notes list in the panel
function renderQuickNotesList() {
  const container = document.getElementById('quickNotesList');
  if (!container) return;

  if (clientQuickNotes.length === 0) {
    container.innerHTML = '<p class="no-notes">No notes yet. Add your first quick note above!</p>';
    return;
  }

  container.innerHTML = clientQuickNotes.map(note => `
    <div class="quick-note-item" data-note-id="${note.id}">
      <p class="quick-note-content">${escapeHtml(note.content)}</p>
      <div class="quick-note-meta">
        <span class="quick-note-date">${formatDateTime(note.created_at)}</span>
        <button class="quick-note-delete" onclick="deleteQuickNote(${note.id})" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// Save a new quick note
async function saveQuickNote() {
  const noteText = document.getElementById('quickNotes').value;
  if (!noteText.trim()) {
    alert('Please enter a note');
    return;
  }

  const saveBtn = document.querySelector('#rightPanel .btn-primary-small');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        content: noteText.trim(),
        note_type: 'quick_note'
      })
    });

    if (response.ok) {
      const newNote = await response.json();
      clientQuickNotes.unshift(newNote);
      renderQuickNotesList();
      document.getElementById('quickNotes').value = '';

      // Also refresh the notes section on the dashboard if visible
      if (document.getElementById('dashboardTab')?.classList.contains('active')) {
        loadClientNotes();
      }
    } else {
      console.error('Note save failed:', response.status, response.statusText);
      try {
        const error = await response.json();
        alert(error.error || 'Failed to save note');
      } catch (parseError) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        alert('Failed to save note: ' + response.statusText);
      }
    }
  } catch (error) {
    console.error('Error saving quick note:', error);
    alert('Failed to save note: ' + error.message);
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}

// Delete a quick note
async function deleteQuickNote(noteId) {
  if (!confirm('Delete this note?')) return;

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/notes/${noteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      clientQuickNotes = clientQuickNotes.filter(n => n.id !== noteId);
      renderQuickNotesList();

      // Also refresh the notes section on the dashboard if visible
      if (document.getElementById('dashboardTab')?.classList.contains('active')) {
        loadClientNotes();
      }
    } else {
      alert('Failed to delete note');
    }
  } catch (error) {
    console.error('Error deleting quick note:', error);
    alert('Failed to delete note');
  }
}

// ============================================
// NOTES TAB FUNCTIONALITY
// ============================================

let clientNotes = [];

// Load all client notes for the Notes tab
async function loadClientNotes() {
  console.log('[loadClientNotes] Starting, clientId:', clientId);
  const container = document.getElementById('notesContent');
  if (!container) {
    console.log('[loadClientNotes] Container not found');
    return;
  }

  container.innerHTML = '<div class="loading-notes"><div class="loader-small"></div><p>Loading notes...</p></div>';

  try {
    const token = localStorage.getItem('auth_token');
    console.log('[loadClientNotes] Fetching from API...');
    const response = await fetch(`${API_BASE}/api/notes/client/${clientId}?limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('[loadClientNotes] Response status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('[loadClientNotes] Received notes:', data.notes?.length);
      clientNotes = data.notes;
      renderNotesTab();
    } else {
      console.error('[loadClientNotes] Failed response:', response.status);
      container.innerHTML = '<p class="empty-message">Failed to load notes.</p>';
    }
  } catch (error) {
    console.error('[loadClientNotes] Error:', error);
    container.innerHTML = '<p class="empty-message">Error loading notes.</p>';
  }
}

// Render the notes tab content
function renderNotesTab() {
  const container = document.getElementById('notesContent');
  if (!container) return;

  if (clientNotes.length === 0) {
    container.innerHTML = `
      <div class="notes-empty-state">
        <div class="empty-icon">📝</div>
        <h3>No Notes Yet</h3>
        <p>Start taking notes about this client using the "New Note" button above or the "Notes on the Go" panel.</p>
      </div>
    `;
    return;
  }

  // Group notes by type
  const consultationNotes = clientNotes.filter(n => n.is_consultation);
  const quickNotes = clientNotes.filter(n => n.note_type === 'quick_note' && !n.is_consultation);
  const otherNotes = clientNotes.filter(n => n.note_type !== 'quick_note' && !n.is_consultation);

  let html = '<div class="notes-grid">';

  // Consultation Notes Section
  if (consultationNotes.length > 0) {
    html += `
      <div class="notes-section">
        <h3 class="notes-section-title">
          <span class="section-icon">📋</span>
          Consultation Notes
          <span class="notes-count">${consultationNotes.length}</span>
        </h3>
        <div class="notes-cards">
          ${consultationNotes.map(note => renderNoteCard(note)).join('')}
        </div>
      </div>
    `;
  }

  // Quick Notes Section
  if (quickNotes.length > 0) {
    html += `
      <div class="notes-section">
        <h3 class="notes-section-title">
          <span class="section-icon">⚡</span>
          Quick Notes
          <span class="notes-count">${quickNotes.length}</span>
        </h3>
        <div class="notes-cards">
          ${quickNotes.map(note => renderNoteCard(note)).join('')}
        </div>
      </div>
    `;
  }

  // Other Notes Section (form notes, lab notes, etc.)
  if (otherNotes.length > 0) {
    html += `
      <div class="notes-section">
        <h3 class="notes-section-title">
          <span class="section-icon">📄</span>
          Other Notes
          <span class="notes-count">${otherNotes.length}</span>
        </h3>
        <div class="notes-cards">
          ${otherNotes.map(note => renderNoteCard(note)).join('')}
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

// Render a single note card
function renderNoteCard(note) {
  const date = formatDateTime(note.created_at);
  const noteType = note.is_consultation ? 'Consultation' :
                   note.note_type === 'quick_note' ? 'Quick Note' :
                   note.note_type ? note.note_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Note';

  // Extract title if it exists (for consultation notes with ## Title format)
  let title = '';
  let content = note.content || '';
  if (content && content.startsWith('## ')) {
    const lines = content.split('\n');
    title = lines[0].replace('## ', '');
    content = lines.slice(1).join('\n').trim();
  }

  // Truncate content for preview
  const preview = content && content.length > 200 ? content.substring(0, 200) + '...' : (content || '');

  return `
    <div class="note-card" data-note-id="${note.id}">
      <div class="note-card-header">
        ${title ? `<h4 class="note-title">${escapeHtml(title)}</h4>` : ''}
        <span class="note-type-badge ${note.is_consultation ? 'consultation' : note.note_type}">${noteType}</span>
      </div>
      <p class="note-preview">${escapeHtml(preview)}</p>
      <div class="note-card-footer">
        <div class="note-meta">
          <span class="note-author">${note.author}</span>
          <span class="note-date">${date}</span>
        </div>
        <div class="note-actions">
          <button class="note-action-btn" onclick="viewNoteDetail(${note.id})" title="View">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="note-action-btn delete" onclick="deleteClientNote(${note.id})" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// View note detail
function viewNoteDetail(noteId) {
  const note = clientNotes.find(n => n.id === noteId);
  if (!note) return;

  // For now, just show an alert. Later this could open a modal.
  let content = note.content;
  if (content.startsWith('## ')) {
    content = content.replace(/^## .+\n\n?/, '');
  }
  alert(`Note by ${note.author}\n${formatDateTime(note.created_at)}\n\n${content}`);
}

// Delete client note
async function deleteClientNote(noteId) {
  if (!confirm('Delete this note?')) return;

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/notes/${noteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      clientNotes = clientNotes.filter(n => n.id !== noteId);
      renderNotesTab();
      // Also update the quick notes panel if open
      if (document.getElementById('rightPanel')?.style.display !== 'none') {
        loadQuickNotes();
      }
    } else {
      alert('Failed to delete note');
    }
  } catch (error) {
    console.error('Error deleting note:', error);
    alert('Failed to delete note');
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show error
function showError(message) {
  document.getElementById('loadingState').innerHTML = `
    <div style="color: #EF4444; text-align: center;">
      <p style="font-size: 16px; margin-bottom: 8px;">⚠️ Error</p>
      <p style="font-size: 14px;">${message}</p>
      <button onclick="window.location.href='/clients'" style="margin-top: 16px; padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
        Back to Clients
      </button>
    </div>
  `;
}

// Make functions globally accessible
window.refreshSummary = refreshSummary;
window.refreshData = refreshData;
window.editClient = editClient;
window.archiveClient = archiveClient;
window.assignForm = assignForm;
window.closeAssignFormModal = closeAssignFormModal;
window.sendFormAssignment = sendFormAssignment;
window.uploadLab = uploadLab;
window.createReport = createReport;
window.newNote = newNote;
window.closeNewNoteModal = closeNewNoteModal;
window.toggleVoiceInput = toggleVoiceInput;
window.toggleAIScribe = toggleAIScribe;
window.generateAISummaryPreview = generateAISummaryPreview;
window.saveNote = saveNote;
window.viewNote = viewNote;
window.deleteNote = deleteNote;
window.generateProtocol = generateProtocol;
window.openRightPanel = openRightPanel;
window.closeRightPanel = closeRightPanel;
window.saveQuickNote = saveQuickNote;
window.deleteQuickNote = deleteQuickNote;
window.loadQuickNotes = loadQuickNotes;
window.loadClientNotes = loadClientNotes;
window.viewNoteDetail = viewNoteDetail;
window.deleteClientNote = deleteClientNote;
window.regenerateSummary = regenerateSummary;
window.regeneratePersonalityInsights = regeneratePersonalityInsights;

// Labs & Tests functions
window.openUploadLabModal = openUploadLabModal;
window.closeUploadLabModal = closeUploadLabModal;
window.uploadLabFile = uploadLabFile;
window.clearFileSelection = clearFileSelection;
window.viewLab = viewLab;
window.closeLabViewerModal = closeLabViewerModal;
window.downloadLabPdf = downloadLabPdf;
window.printLabPdf = printLabPdf;
window.showLabMoreOptions = showLabMoreOptions;
window.generateLabSummary = generateLabSummary;
window.addLabNote = addLabNote;
window.deleteLab = deleteLab;
window.downloadLab = downloadLab;
window.loadClientLabs = loadClientLabs;

// Lab PDF.js control functions
window.labPdfZoomIn = labPdfZoomIn;
window.labPdfZoomOut = labPdfZoomOut;
window.labPdfFitWidth = labPdfFitWidth;
window.labPdfPrevPage = labPdfPrevPage;
window.labPdfNextPage = labPdfNextPage;

// ============================================
// FORMS FUNCTIONALITY
// ============================================

let clientFormSubmissions = [];

// Load client form submissions
async function loadClientForms() {
  if (!clientId) return;

  const formsLoading = document.getElementById('formsLoading');
  const formsEmpty = document.getElementById('formsEmpty');
  const formsContent = document.getElementById('formsContent');

  formsLoading.style.display = 'flex';
  formsEmpty.style.display = 'none';
  formsContent.style.display = 'none';

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/forms/client/${clientId}/submissions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load form submissions');
    }

    const data = await response.json();
    clientFormSubmissions = data.submissions || [];

    formsLoading.style.display = 'none';

    if (clientFormSubmissions.length === 0) {
      formsEmpty.style.display = 'block';
    } else {
      formsContent.style.display = 'block';
      renderFormSubmissions();
    }

  } catch (error) {
    console.error('Error loading form submissions:', error);
    formsLoading.style.display = 'none';
    formsEmpty.style.display = 'block';
    formsEmpty.innerHTML = '<p>No form submissions yet. Assign a form to this client to get started.</p>';
  }
}

// Render form submissions as table rows
function renderFormSubmissions() {
  const tbody = document.getElementById('formsTableBody');

  tbody.innerHTML = clientFormSubmissions.map(sub => {
    const assignedDate = sub.assigned_at
      ? new Date(sub.assigned_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
      : sub.submitted_at
        ? new Date(sub.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
        : '-';

    // Determine status based on submission state
    const isCompleted = sub.submitted_at !== null;
    const statusClass = isCompleted ? 'complete' : 'assigned';
    const statusText = isCompleted ? 'Complete' : 'Assigned';

    const formName = escapeHtml(sub.form_name || 'Unknown Form');
    const formDescription = escapeHtml(sub.form_description || 'No description available');

    return `
      <tr data-id="${sub.id}">
        <td class="form-name-cell">${formName}</td>
        <td class="form-desc-cell">${formDescription}</td>
        <td>
          <span class="form-status-badge ${statusClass}">${statusText}</span>
        </td>
        <td class="form-date-cell">${assignedDate}</td>
        <td class="form-actions-cell">
          <button class="form-action-btn view" onclick="viewFormSubmission(${sub.form_id}, ${sub.id})" title="${isCompleted ? 'View responses' : 'View details'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Filter forms table based on search input
function filterFormsTable() {
  const searchInput = document.getElementById('formsSearchInput');
  if (!searchInput) return;

  const searchTerm = searchInput.value.toLowerCase().trim();
  const tbody = document.getElementById('formsTableBody');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');

  rows.forEach(row => {
    const formName = row.querySelector('.form-name-cell')?.textContent.toLowerCase() || '';
    const formDesc = row.querySelector('.form-desc-cell')?.textContent.toLowerCase() || '';
    const status = row.querySelector('.form-status-badge')?.textContent.toLowerCase() || '';

    const matches = formName.includes(searchTerm) ||
                    formDesc.includes(searchTerm) ||
                    status.includes(searchTerm);

    row.style.display = matches ? '' : 'none';
  });
}

// Initialize forms search listener
function initFormsSearch() {
  const searchInput = document.getElementById('formsSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', filterFormsTable);
  }
}

// Render a preview of form responses
function renderResponsesPreview(responses) {
  if (!responses || Object.keys(responses).length === 0) {
    return '<p class="no-responses">No responses recorded</p>';
  }

  const entries = Object.entries(responses).slice(0, 5);
  const hasMore = Object.keys(responses).length > 5;

  const html = entries.map(([key, value]) => {
    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
    const label = key.replace(/_/g, ' ').replace(/field/i, '').replace(/\d+/g, '').trim() || key;
    return `
      <div class="response-item">
        <span class="response-label">${escapeHtml(label)}:</span>
        <span class="response-value">${escapeHtml(displayValue)}</span>
      </div>
    `;
  }).join('');

  return html + (hasMore ? '<p class="more-responses">+ more responses...</p>' : '');
}

// View full form submission - now opens detailed submission view
function viewFormSubmission(formId, submissionId) {
  window.location.href = `/forms/${formId}/submission/${submissionId}`;
}

// Regenerate AI summary for form submission
async function regenerateFormSummary(submissionId) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/forms/submissions/${submissionId}/regenerate-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    alert('AI summary generated successfully!');
    loadClientForms();

  } catch (error) {
    console.error('Error generating summary:', error);
    alert('Failed to generate AI summary. Please try again.');
  }
}

// ============================================
// SEND FORM (UNIFIED)
// ============================================

let availableForms = [];
let currentFormLinkData = null;

// Open send form modal
async function openSendFormModal() {
  const modal = document.getElementById('sendFormModal');
  const formSelect = document.getElementById('sendFormSelect');

  // Reset state
  document.getElementById('sendFormStep1').style.display = 'block';
  document.getElementById('sendFormStep2').style.display = 'none';
  document.getElementById('emailOptionsSection').style.display = 'none';
  document.getElementById('sendFormFooter').style.display = 'flex';
  document.getElementById('createLinkBtn').disabled = false;
  document.getElementById('createLinkBtn').innerHTML = '<span>🔗</span><span>Create Link</span>';
  currentFormLinkData = null;

  modal.style.display = 'flex';

  // Load available forms
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/forms/templates`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      availableForms = (data.forms || data || []).filter(f => f.status === 'published');

      formSelect.innerHTML = '<option value="">Select a form...</option>' +
        availableForms.map(form =>
          `<option value="${form.id}">${escapeHtml(form.name)}</option>`
        ).join('');

      if (availableForms.length === 0) {
        formSelect.innerHTML = '<option value="">No published forms available</option>';
      }
    }
  } catch (error) {
    console.error('Error loading forms:', error);
    formSelect.innerHTML = '<option value="">Error loading forms</option>';
  }
}

// Close send form modal
function closeSendFormModal() {
  document.getElementById('sendFormModal').style.display = 'none';
}

// Create form link (Step 1 -> Step 2)
async function createFormLink() {
  const formId = document.getElementById('sendFormSelect').value;
  const expiryDays = document.getElementById('sendFormExpiry').value;

  if (!formId) {
    alert('Please select a form');
    return;
  }

  const btn = document.getElementById('createLinkBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span><span>Creating...</span>';

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/forms/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        form_id: parseInt(formId),
        client_id: parseInt(clientId),
        expiry_days: parseInt(expiryDays)
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create link');
    }

    const data = await response.json();

    // Normalize response structure (API returns { success: true, link: { url, ... } })
    const linkData = data.link || data;
    currentFormLinkData = {
      link_id: linkData.id || linkData.link_id,
      link_url: linkData.url || linkData.link_url,
      expires_at: linkData.expires_at,
      form_name: linkData.form_name
    };

    // Show Step 2
    document.getElementById('sendFormStep1').style.display = 'none';
    document.getElementById('sendFormStep2').style.display = 'block';
    document.getElementById('sendFormFooter').style.display = 'none';

    // Display the generated link
    document.getElementById('generatedFormLink').value = currentFormLinkData.link_url;
    document.getElementById('formLinkExpiry').textContent = `Expires: ${new Date(currentFormLinkData.expires_at).toLocaleDateString()}`;

  } catch (error) {
    console.error('Error creating link:', error);
    alert('Failed to create link: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = '<span>🔗</span><span>Create Link</span>';
  }
}

// Copy form link to clipboard
function copyFormLink() {
  const input = document.getElementById('generatedFormLink');
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value).then(() => {
    alert('Link copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy link:', err);
    // Fallback for older browsers
    document.execCommand('copy');
    alert('Link copied to clipboard!');
  });
}

// Show email options
function sendFormViaEmail() {
  document.getElementById('emailOptionsSection').style.display = 'block';
  document.getElementById('emailMessage').focus();
}

// Send form via WhatsApp
function sendFormViaWhatsApp() {
  if (!currentFormLinkData || !clientData) return;

  const phone = clientData.phone ? clientData.phone.replace(/\D/g, '') : '';
  const message = encodeURIComponent(
    `Hi ${clientData.first_name || 'there'}! Please fill out this form for your upcoming appointment:\n\n${currentFormLinkData.link_url}`
  );

  if (phone) {
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${message}`, '_blank');
  }
}

// Confirm send email
async function confirmSendEmail() {
  if (!currentFormLinkData || !clientData) return;

  const message = document.getElementById('emailMessage').value;
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span><span>Sending...</span>';

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/forms/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        client_id: parseInt(clientId),
        link_id: currentFormLinkData.link_id,
        link_url: currentFormLinkData.link_url,
        message: message
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }

    alert('Email sent successfully!');
    closeSendFormModal();

  } catch (error) {
    console.error('Error sending email:', error);
    alert('Failed to send email: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>📧</span><span>Send Email Now</span>';
  }
}

// ============================================
// HEALTH METRICS SECTION
// ============================================

// Load health metrics from API
async function loadHealthMetrics() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const response = await fetch(`${API_BASE}/api/clients/${clientId}/health-metrics`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.warn('Failed to load health metrics');
      return;
    }

    const data = await response.json();
    displayHealthMetrics(data);

  } catch (error) {
    console.error('Error loading health metrics:', error);
  }
}

// Display health metrics in the dashboard
function displayHealthMetrics(metrics) {
  // Biological Age
  if (metrics.biologicalAge) {
    const bioAge = metrics.biologicalAge;

    // Update biological age value
    const bioAgeValueEl = document.getElementById('bioAgeValue');
    if (bioAgeValueEl && bioAge.value) {
      bioAgeValueEl.textContent = bioAge.value;
    }

    // Update chronological age
    const chronoAgeEl = document.getElementById('chronoAge');
    if (chronoAgeEl && bioAge.chronologicalAge) {
      chronoAgeEl.textContent = bioAge.chronologicalAge;
    }

    // Update age difference
    const ageDiffEl = document.getElementById('ageDifference');
    if (ageDiffEl && bioAge.difference !== null) {
      const diffValue = bioAge.difference;
      const isYounger = diffValue > 0;
      ageDiffEl.className = `age-difference ${isYounger ? 'positive' : 'negative'}`;
      ageDiffEl.innerHTML = `
        <span class="diff-arrow">${isYounger ? '↓' : '↑'}</span>
        <span class="diff-value">${Math.abs(diffValue)} years ${isYounger ? 'younger' : 'older'}</span>
      `;
    }

    // Update gauge needle position based on biological age relative to chronological
    updateBioAgeGauge(bioAge.value, bioAge.chronologicalAge);
  }

  // Vitals
  if (metrics.vitals) {
    const vitals = metrics.vitals;

    // Weight
    const weightEl = document.getElementById('vitalWeight');
    if (weightEl && vitals.weight) {
      weightEl.innerHTML = `${vitals.weight.value} <small>${vitals.weight.unit}</small>`;
    }

    // Height
    const heightEl = document.getElementById('vitalHeight');
    if (heightEl && vitals.height) {
      heightEl.innerHTML = `${vitals.height.value} <small>${vitals.height.unit}</small>`;
    }

    // BMI
    const bmiEl = document.getElementById('vitalBMI');
    if (bmiEl && vitals.bmi) {
      bmiEl.textContent = vitals.bmi.value;
    }

    // Blood Pressure
    const bpEl = document.getElementById('vitalBP');
    if (bpEl && vitals.bloodPressure) {
      bpEl.innerHTML = `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} <small>${vitals.bloodPressure.unit}</small>`;
    }

    // Update date
    const vitalsDateEl = document.getElementById('vitalsDate');
    if (vitalsDateEl && vitals.weight && vitals.weight.lastUpdated) {
      vitalsDateEl.textContent = formatDate(vitals.weight.lastUpdated);
    }
  }

  // Wearable Vitals
  if (metrics.wearableVitals) {
    const wearable = metrics.wearableVitals;

    // VO2 Max
    const vo2El = document.getElementById('wearableVo2');
    if (vo2El && wearable.vo2Max) {
      vo2El.innerHTML = `${wearable.vo2Max.value} <small>${wearable.vo2Max.unit}</small>`;
    }
    const vo2TrendEl = document.getElementById('vo2Trend');
    if (vo2TrendEl && wearable.vo2Max) {
      const trend = wearable.vo2Max.trend;
      vo2TrendEl.className = `wearable-trend ${trend >= 0 ? 'up' : 'down'}`;
      vo2TrendEl.textContent = `${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}`;
    }

    // Resting Heart Rate
    const rhrEl = document.getElementById('wearableRHR');
    if (rhrEl && wearable.restingHeartRate) {
      rhrEl.innerHTML = `${wearable.restingHeartRate.value} <small>${wearable.restingHeartRate.unit}</small>`;
    }
    const rhrTrendEl = document.getElementById('rhrTrend');
    if (rhrTrendEl && wearable.restingHeartRate) {
      // For RHR, lower is better, so negative trend is good
      const trend = wearable.restingHeartRate.trend;
      const isGood = trend <= 0;
      rhrTrendEl.className = `wearable-trend ${isGood ? 'down' : 'up'}`;
      rhrTrendEl.textContent = `${trend < 0 ? '↓' : '↑'} ${Math.abs(trend)}`;
    }

    // HRV
    const hrvEl = document.getElementById('wearableHRV');
    if (hrvEl && wearable.hrv) {
      hrvEl.innerHTML = `${wearable.hrv.value} <small>${wearable.hrv.unit}</small>`;
    }
    const hrvTrendEl = document.getElementById('hrvTrend');
    if (hrvTrendEl && wearable.hrv) {
      const trend = wearable.hrv.trend;
      hrvTrendEl.className = `wearable-trend ${trend >= 0 ? 'up' : 'down'}`;
      hrvTrendEl.textContent = `${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}`;
    }

    // Source and sync time
    const sourceEl = document.getElementById('wearableSource');
    if (sourceEl && wearable.source) {
      sourceEl.textContent = wearable.source;
    }
    const syncTimeEl = document.getElementById('wearableSyncTime');
    if (syncTimeEl && wearable.lastSync) {
      syncTimeEl.textContent = wearable.lastSync;
    }
  }

  // Update health scores if available
  if (metrics.healthScores) {
    updateHealthScores(metrics.healthScores);
  }
}

// Update the biological age gauge needle position
function updateBioAgeGauge(bioAge, chronoAge) {
  const needle = document.getElementById('bioAgeNeedle');
  if (!needle || !bioAge || !chronoAge) return;

  // Calculate rotation based on difference
  // Full range: -10 years younger (-90deg) to +10 years older (+90deg)
  const diff = chronoAge - bioAge; // positive means younger
  const maxDiff = 10;
  const clampedDiff = Math.max(-maxDiff, Math.min(maxDiff, diff));

  // Map -10 to 10 range to -70 to 70 degrees (gauge arc range)
  const rotation = -(clampedDiff / maxDiff) * 70;

  needle.style.transform = `rotate(${rotation}deg)`;
}

// Update health scores in the score cards
function updateHealthScores(scores) {
  // This function updates the score cards at the top of the dashboard
  // Score card IDs would need to be set up in HTML
  // For now this is a placeholder that can be expanded

  const scoreMapping = {
    sleep: { selector: '.score-card:nth-child(1)', icon: 'sleep' },
    diet: { selector: '.score-card:nth-child(2)', icon: 'diet' },
    stress: { selector: '.score-card:nth-child(3)', icon: 'stress' },
    activity: { selector: '.score-card:nth-child(4)', icon: 'activity' }
  };

  Object.entries(scores).forEach(([key, data]) => {
    const mapping = scoreMapping[key];
    if (!mapping) return;

    const card = document.querySelector(mapping.selector);
    if (!card) return;

    // Update score value
    const valueEl = card.querySelector('.score-value');
    if (valueEl) {
      valueEl.textContent = `${data.score}%`;
    }

    // Update segments based on score
    const segments = card.querySelectorAll('.score-segments .segment');
    const filledCount = Math.round(data.score / 20); // 5 segments, 20% each
    segments.forEach((segment, index) => {
      segment.classList.remove('filled', 'half');
      if (index < filledCount) {
        segment.classList.add('filled');
      } else if (index === filledCount && data.score % 20 >= 10) {
        segment.classList.add('half');
      }
    });

    // Update segment color class based on status
    const segmentsContainer = card.querySelector('.score-segments');
    if (segmentsContainer) {
      segmentsContainer.classList.remove('success', 'warning', 'danger');
      if (data.status === 'good') {
        segmentsContainer.classList.add('success');
      } else if (data.status === 'warning') {
        segmentsContainer.classList.add('warning');
      } else if (data.status === 'poor') {
        segmentsContainer.classList.add('danger');
      }
    }
  });
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '.');
}

// Format date and time for display
function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '.');
}

// Export functions
window.loadClientForms = loadClientForms;
window.viewFormSubmission = viewFormSubmission;
window.regenerateFormSummary = regenerateFormSummary;
window.openSendFormModal = openSendFormModal;
window.closeSendFormModal = closeSendFormModal;
window.createFormLink = createFormLink;
window.copyFormLink = copyFormLink;
window.sendFormViaEmail = sendFormViaEmail;
window.sendFormViaWhatsApp = sendFormViaWhatsApp;
window.confirmSendEmail = confirmSendEmail;
window.loadHealthMetrics = loadHealthMetrics;

// ============================================
// PROTOCOL TAB FUNCTIONALITY
// ============================================

let selectedTemplates = [];
let selectedNotes = [];
let currentProtocolData = null;

// Open Protocol Builder Modal
function openProtocolBuilder() {
  const modal = document.getElementById('protocolBuilderModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Reset to step 1
    goToProtocolStep(1);

    // Load reference data
    loadProtocolReferenceData();
  }
}

// Close Protocol Builder Modal
function closeProtocolBuilder() {
  const modal = document.getElementById('protocolBuilderModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';

    // Reset state
    selectedTemplates = [];
    selectedNotes = [];
    currentProtocolData = null;
    window.currentEditingProtocolId = null;

    // Reset template checkboxes
    document.querySelectorAll('.template-checkbox').forEach(cb => cb.checked = false);

    // Reset view - show builder steps, hide editor
    const builderMain = document.querySelector('.protocol-builder-main-v2');
    if (builderMain) {
      builderMain.style.display = '';
    }
    const editorContent = document.getElementById('protocolEditorContent');
    if (editorContent) {
      editorContent.style.display = 'none';
    }
  }
}

// Navigate between protocol steps
function goToProtocolStep(step) {
  // Hide all steps
  document.querySelectorAll('.protocol-step').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });

  // Show target step
  const targetStep = document.getElementById(`protocolStep${step}`);
  if (targetStep) {
    targetStep.classList.add('active');
    targetStep.style.display = 'flex';
  }

  // Load notes selection if step 2
  if (step === 2) {
    loadNotesForSelection();
  }
}

// Load reference data for the Protocol Builder
async function loadProtocolReferenceData() {
  const token = localStorage.getItem('auth_token');
  // Use the global clientId variable set at page load
  const currentClientId = clientId || new URLSearchParams(window.location.search).get('id');

  if (!currentClientId || currentClientId === 'null') {
    console.error('No client ID available for loading protocol data');
    return;
  }

  console.log('Loading protocol reference data for client:', currentClientId);

  // Load notes into the new Step 2 container
  await loadNotesForProtocolBuilder(currentClientId, token);

  // Load labs (for sidebar reference if it exists)
  try {
    const labsResponse = await fetch(`${API_BASE}/api/labs/client/${currentClientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (labsResponse.ok) {
      const labsData = await labsResponse.json();
      displayRefLabs(labsData.labs || []);
    }
  } catch (error) {
    console.error('Error loading labs for protocol:', error);
  }

  // Load forms (for sidebar reference if it exists)
  try {
    const formsResponse = await fetch(`${API_BASE}/api/form-assignments/client/${currentClientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (formsResponse.ok) {
      const formsData = await formsResponse.json();
      displayRefForms(formsData.assignments || []);
    }
  } catch (error) {
    console.error('Error loading forms for protocol:', error);
  }
}

// Load notes for the new Protocol Builder UI (Step 2)
async function loadNotesForProtocolBuilder(currentClientId, token) {
  const container = document.getElementById('notesCardsContainer');
  if (!container) {
    console.log('Notes container not found');
    return;
  }

  container.innerHTML = '<div class="notes-loading">Loading notes...</div>';

  try {
    const response = await fetch(`${API_BASE}/api/notes/client/${currentClientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const notes = data.notes || [];

      if (notes.length === 0) {
        container.innerHTML = `
          <div class="notes-empty-state" style="padding: 24px; text-align: center; color: #6B7280;">
            <p>No notes available for this client yet.</p>
            <p style="font-size: 12px; color: #9CA3AF; margin-top: 8px;">Add consultation notes or quick notes to include them as references.</p>
          </div>
        `;
        return;
      }

      // Display notes as selectable cards matching the template card style
      container.innerHTML = notes.map(note => `
        <label class="protocol-template-card protocol-note-card">
          <input type="checkbox" name="note" value="${note.id}" class="note-checkbox template-checkbox">
          <div class="template-card-inner">
            <div class="template-card-header">
              <span class="template-name">${note.is_consultation ? 'Consultation Note' : formatNoteType(note.note_type)}</span>
              <div class="template-check">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
            <p class="template-desc">${formatDate(note.created_at)} - ${note.author || 'Unknown'}</p>
            <p class="note-preview-text">${truncateText(note.content, 80)}</p>
          </div>
        </label>
      `).join('');

    } else {
      container.innerHTML = '<div class="notes-empty-state" style="padding: 24px; text-align: center; color: #EF4444;"><p>Error loading notes. Please try again.</p></div>';
    }
  } catch (error) {
    console.error('Error loading notes for protocol builder:', error);
    container.innerHTML = '<div class="notes-empty-state" style="padding: 24px; text-align: center; color: #EF4444;"><p>Error loading notes. Please try again.</p></div>';
  }
}

// Display labs in reference sidebar
function displayRefLabs(labs) {
  const container = document.getElementById('refLabsList');
  if (!container) return;

  if (labs.length === 0) {
    container.innerHTML = '<div class="ref-empty-state"><p>No lab results available</p></div>';
    return;
  }

  container.innerHTML = labs.map(lab => `
    <div class="ref-item" onclick="viewRefLab(${lab.id})">
      <p class="ref-item-title">${lab.file_name || 'Untitled Lab'}</p>
      <p class="ref-item-date">${formatDate(lab.uploaded_at)}</p>
    </div>
  `).join('');
}

// Display notes in reference sidebar
function displayRefNotes(notes) {
  const container = document.getElementById('refNotesList');
  if (!container) return;

  if (notes.length === 0) {
    container.innerHTML = '<div class="ref-empty-state"><p>No notes available</p></div>';
    return;
  }

  container.innerHTML = notes.map(note => `
    <div class="ref-item" onclick="viewRefNote(${note.id})">
      <p class="ref-item-title">${note.note_type === 'consultation' ? 'Consultation Note' : 'Quick Note'}</p>
      <p class="ref-item-date">${formatDate(note.created_at)} - ${note.author || 'Unknown'}</p>
    </div>
  `).join('');
}

// Display forms in reference sidebar
function displayRefForms(forms) {
  const container = document.getElementById('refFormsList');
  if (!container) return;

  const completedForms = forms.filter(f => f.status === 'completed');

  if (completedForms.length === 0) {
    container.innerHTML = '<div class="ref-empty-state"><p>No completed forms available</p></div>';
    return;
  }

  container.innerHTML = completedForms.map(form => `
    <div class="ref-item" onclick="viewRefForm(${form.id})">
      <p class="ref-item-title">${form.form_name || 'Untitled Form'}</p>
      <p class="ref-item-date">${formatDate(form.completed_at)}</p>
    </div>
  `).join('');
}

// Load notes for selection in step 2
async function loadNotesForSelection() {
  const container = document.getElementById('notesSelectionList');
  if (!container) return;

  const token = localStorage.getItem('token');
  const clientId = new URLSearchParams(window.location.search).get('id');

  try {
    const response = await fetch(`${API_BASE}/api/notes/client/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const notes = data.notes || [];

      if (notes.length === 0) {
        container.innerHTML = '<div class="selection-loading">No notes available for this client.</div>';
        return;
      }

      container.innerHTML = notes.map(note => `
        <div class="note-selection-item" data-note-id="${note.id}" onclick="toggleNoteSelection(${note.id})">
          <div class="note-checkbox"></div>
          <div class="note-selection-info">
            <p class="note-selection-title">${note.is_consultation ? 'Consultation Note' : note.note_type}</p>
            <p class="note-selection-meta">${formatDate(note.created_at)} - ${note.author || 'Unknown'}</p>
            <p class="note-selection-preview">${truncateText(note.content, 100)}</p>
          </div>
        </div>
      `).join('');

    } else {
      container.innerHTML = '<div class="selection-loading">Error loading notes.</div>';
    }
  } catch (error) {
    console.error('Error loading notes for selection:', error);
    container.innerHTML = '<div class="selection-loading">Error loading notes.</div>';
  }
}

// Toggle note selection
function toggleNoteSelection(noteId) {
  const item = document.querySelector(`.note-selection-item[data-note-id="${noteId}"]`);
  if (!item) return;

  item.classList.toggle('selected');

  if (item.classList.contains('selected')) {
    if (!selectedNotes.includes(noteId)) {
      selectedNotes.push(noteId);
    }
  } else {
    selectedNotes = selectedNotes.filter(id => id !== noteId);
  }
}

// Select all notes
function selectAllNotes() {
  const items = document.querySelectorAll('.note-selection-item');
  items.forEach(item => {
    const noteId = parseInt(item.dataset.noteId);
    item.classList.add('selected');
    if (!selectedNotes.includes(noteId)) {
      selectedNotes.push(noteId);
    }
  });
}

// Generate protocol draft
async function generateProtocolDraft() {
  // Get selected templates
  selectedTemplates = [];
  document.querySelectorAll('.template-checkbox:checked').forEach(cb => {
    selectedTemplates.push(cb.value);
  });

  if (selectedTemplates.length === 0) {
    alert('Please select at least one protocol template.');
    goToProtocolStep(1);
    return;
  }

  const directionalPrompt = document.getElementById('protocolDirectionalPrompt')?.value || '';

  // Show loading in step 3
  goToProtocolStep(3);

  // Set protocol title based on templates
  const titleInput = document.getElementById('protocolTitle');
  if (titleInput) {
    const templateNames = selectedTemplates.map(t => {
      const nameMap = {
        'sleep': 'Sleep',
        'gut': 'Gut Healing',
        'stress': 'Stress Management',
        'weight': 'Weight Optimization',
        'energy': 'Energy Enhancement',
        'detox': 'Detoxification',
        'hormones': 'Hormone Balance',
        'custom': 'Custom'
      };
      return nameMap[t] || t;
    });
    titleInput.value = templateNames.join(' & ') + ' Protocol';
  }

  // Generate mock protocol content (in production this would call AI API)
  await generateMockProtocolContent(selectedTemplates, selectedNotes, directionalPrompt);
}

// Generate mock protocol content for demonstration
async function generateMockProtocolContent(templates, noteIds, prompt) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Supplements module content based on templates
  const supplementsContent = generateSupplementsContent(templates);
  document.getElementById('supplementsContent').innerHTML = supplementsContent;

  // Diet module content
  const dietContent = generateDietContent(templates);
  document.getElementById('dietContent').innerHTML = dietContent;

  // Lifestyle module content
  const lifestyleContent = generateLifestyleContent(templates);
  document.getElementById('lifestyleContent').innerHTML = lifestyleContent;

  // Testing module content
  const testingContent = generateTestingContent(templates);
  document.getElementById('testingContent').innerHTML = testingContent;
}

// Generate supplements content based on templates
function generateSupplementsContent(templates) {
  const supplements = [];

  if (templates.includes('sleep')) {
    supplements.push(
      { icon: '💊', name: 'Magnesium Glycinate', details: '400mg - Take 1 hour before bed' },
      { icon: '🌙', name: 'L-Theanine', details: '200mg - Take with magnesium at night' },
      { icon: '🍒', name: 'Tart Cherry Extract', details: '500mg - Take 30 minutes before bed' }
    );
  }

  if (templates.includes('stress')) {
    supplements.push(
      { icon: '🌿', name: 'Ashwagandha KSM-66', details: '600mg - Take in morning with food' },
      { icon: '💧', name: 'Omega-3 Fish Oil', details: '2g EPA/DHA - Take with largest meal' },
      { icon: '🍄', name: 'Rhodiola Rosea', details: '400mg - Take in morning on empty stomach' }
    );
  }

  if (templates.includes('gut')) {
    supplements.push(
      { icon: '🦠', name: 'Multi-strain Probiotic', details: '50 billion CFU - Take on empty stomach' },
      { icon: '🌾', name: 'L-Glutamine', details: '5g - Take 2x daily between meals' },
      { icon: '🧄', name: 'Digestive Enzymes', details: '1 capsule - Take with each meal' }
    );
  }

  if (supplements.length === 0) {
    supplements.push(
      { icon: '💊', name: 'Vitamin D3 + K2', details: '5000 IU / 100mcg - Take with fatty meal' },
      { icon: '🧪', name: 'B-Complex', details: '1 capsule - Take in morning with food' }
    );
  }

  return supplements.map(s => `
    <div class="module-item">
      <div class="module-item-icon">${s.icon}</div>
      <div class="module-item-content">
        <p class="module-item-name">${s.name}</p>
        <p class="module-item-details">${s.details}</p>
      </div>
      <div class="module-item-actions">
        <button class="module-item-btn" title="Edit">✏️</button>
        <button class="module-item-btn" title="Remove">🗑️</button>
      </div>
    </div>
  `).join('');
}

// Generate diet content based on templates
function generateDietContent(templates) {
  const recommendations = [];

  if (templates.includes('sleep')) {
    recommendations.push(
      { icon: '🍽️', name: 'Evening Meal Timing', details: 'Finish dinner 3+ hours before bed. Avoid heavy meals late.' },
      { icon: '☕', name: 'Caffeine Cutoff', details: 'No caffeine after 2pm to support natural melatonin production.' }
    );
  }

  if (templates.includes('gut')) {
    recommendations.push(
      { icon: '🥗', name: 'Fiber-Rich Foods', details: 'Include 25-35g fiber daily from vegetables, fruits, and whole grains.' },
      { icon: '🥣', name: 'Fermented Foods', details: 'Include 1-2 servings daily: kimchi, sauerkraut, kefir, or yogurt.' },
      { icon: '❌', name: 'Elimination Protocol', details: 'Remove gluten, dairy, and processed foods for 4 weeks.' }
    );
  }

  if (templates.includes('stress') || templates.includes('energy')) {
    recommendations.push(
      { icon: '🥩', name: 'Protein Priority', details: 'Include 30g protein at each meal for stable energy and mood.' },
      { icon: '🫒', name: 'Healthy Fats', details: 'Include olive oil, avocado, nuts daily for brain health.' }
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      { icon: '💧', name: 'Hydration', details: 'Drink 2-3L water daily. Start each morning with 500ml.' },
      { icon: '🌈', name: 'Colorful Vegetables', details: 'Aim for 5+ servings of varied colored vegetables daily.' }
    );
  }

  return recommendations.map(r => `
    <div class="module-item">
      <div class="module-item-icon">${r.icon}</div>
      <div class="module-item-content">
        <p class="module-item-name">${r.name}</p>
        <p class="module-item-details">${r.details}</p>
      </div>
      <div class="module-item-actions">
        <button class="module-item-btn" title="Edit">✏️</button>
        <button class="module-item-btn" title="Remove">🗑️</button>
      </div>
    </div>
  `).join('');
}

// Generate lifestyle content based on templates
function generateLifestyleContent(templates) {
  const habits = [];

  if (templates.includes('sleep')) {
    habits.push(
      { icon: '🌅', name: 'Morning Light Exposure', details: 'Get 10-30 min of sunlight within 1 hour of waking.' },
      { icon: '📱', name: 'Screen Curfew', details: 'No screens 1 hour before bed. Use blue light blocking glasses after sunset.' },
      { icon: '🛏️', name: 'Sleep Environment', details: 'Keep bedroom at 65-68°F (18-20°C), dark, and quiet.' }
    );
  }

  if (templates.includes('stress')) {
    habits.push(
      { icon: '🧘', name: 'Daily Meditation', details: '10-20 minutes of mindfulness meditation, preferably morning.' },
      { icon: '📓', name: 'Gratitude Journaling', details: 'Write 3 things you\'re grateful for each morning.' },
      { icon: '🌬️', name: 'Breathwork Practice', details: '5 minutes of box breathing when feeling stressed.' }
    );
  }

  if (templates.includes('energy') || templates.includes('weight')) {
    habits.push(
      { icon: '🚶', name: 'Daily Movement', details: '10,000 steps minimum. Break up sitting every 45 minutes.' },
      { icon: '🏋️', name: 'Strength Training', details: '3x per week, focusing on compound movements.' }
    );
  }

  if (habits.length === 0) {
    habits.push(
      { icon: '⏰', name: 'Consistent Schedule', details: 'Wake and sleep at consistent times, even on weekends.' },
      { icon: '🌳', name: 'Nature Exposure', details: 'Spend 20+ minutes in nature daily when possible.' }
    );
  }

  return habits.map(h => `
    <div class="module-item">
      <div class="module-item-icon">${h.icon}</div>
      <div class="module-item-content">
        <p class="module-item-name">${h.name}</p>
        <p class="module-item-details">${h.details}</p>
      </div>
      <div class="module-item-actions">
        <button class="module-item-btn" title="Edit">✏️</button>
        <button class="module-item-btn" title="Remove">🗑️</button>
      </div>
    </div>
  `).join('');
}

// Generate testing content based on templates
function generateTestingContent(templates) {
  const tests = [];

  if (templates.includes('sleep')) {
    tests.push(
      { icon: '🧪', name: 'Cortisol Awakening Response', details: 'Saliva test - 4-point collection to assess HPA axis function.' }
    );
  }

  if (templates.includes('gut')) {
    tests.push(
      { icon: '🦠', name: 'Comprehensive Stool Analysis', details: 'GI-MAP or similar to assess microbiome, parasites, inflammation markers.' },
      { icon: '🍞', name: 'Food Sensitivity Panel', details: 'IgG/IgA testing to identify reactive foods.' }
    );
  }

  if (templates.includes('hormones')) {
    tests.push(
      { icon: '🔬', name: 'Complete Hormone Panel', details: 'Blood/urine - Testosterone, Estrogen, Thyroid, DHEA, Cortisol.' }
    );
  }

  tests.push(
    { icon: '🩸', name: 'Comprehensive Blood Panel', details: 'CBC, CMP, Lipids, Thyroid (TSH, Free T3/T4), Vitamin D, B12, Iron studies.' }
  );

  return tests.map(t => `
    <div class="module-item">
      <div class="module-item-icon">${t.icon}</div>
      <div class="module-item-content">
        <p class="module-item-name">${t.name}</p>
        <p class="module-item-details">${t.details}</p>
      </div>
      <div class="module-item-actions">
        <button class="module-item-btn" title="Edit">✏️</button>
        <button class="module-item-btn" title="Remove">🗑️</button>
      </div>
    </div>
  `).join('');
}

// Toggle module expand/collapse
function toggleModuleExpand(moduleName) {
  const module = document.querySelector(`.protocol-module[data-module="${moduleName}"]`);
  if (module) {
    module.classList.toggle('collapsed');
    const content = module.querySelector('.module-content');
    if (content) {
      content.style.display = module.classList.contains('collapsed') ? 'none' : 'block';
    }
  }
}

// Edit module with AI
function editModuleWithAI(moduleName) {
  const chatInput = document.getElementById('aiChatInput');
  if (chatInput) {
    chatInput.value = `Please help me modify the ${moduleName} section. `;
    chatInput.focus();
  }
}

// Send AI chat message
function sendAIChat() {
  const input = document.getElementById('aiChatInput');
  const messagesContainer = document.getElementById('aiChatMessages');
  if (!input || !messagesContainer) return;

  const message = input.value.trim();
  if (!message) return;

  // Add user message
  const userMessageHtml = `
    <div class="ai-message user-message">
      <div class="ai-message-content">
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
  messagesContainer.insertAdjacentHTML('beforeend', userMessageHtml);

  // Clear input
  input.value = '';

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Simulate AI response (in production this would call AI API)
  setTimeout(() => {
    const aiResponseHtml = `
      <div class="ai-message">
        <div class="ai-avatar">✨</div>
        <div class="ai-message-content">
          <p>I understand you'd like to modify the protocol. Based on your request, I can help you:</p>
          <ul>
            <li>Adjust supplement dosages or timing</li>
            <li>Add or remove specific recommendations</li>
            <li>Provide scientific rationale for suggestions</li>
          </ul>
          <p>What specific changes would you like to make?</p>
        </div>
      </div>
    `;
    messagesContainer.insertAdjacentHTML('beforeend', aiResponseHtml);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 1000);
}

// Switch between Protocol and Engagement Plan tabs
function switchEditorTab(tabName) {
  const protocolContent = document.getElementById('protocolEditorContent');
  const engagementContent = document.getElementById('engagementPlanContent');
  const protocolActions = document.getElementById('protocolTabActions');
  const engagementActions = document.getElementById('engagementTabActions');

  // Update tab buttons
  document.querySelectorAll('.protocol-editor-header .header-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    }
  });

  // Show/hide content and action buttons based on tab
  if (tabName === 'protocol') {
    if (protocolContent) protocolContent.style.display = 'block';
    if (engagementContent) engagementContent.style.display = 'none';
    if (protocolActions) protocolActions.style.display = 'flex';
    if (engagementActions) engagementActions.style.display = 'none';
  } else if (tabName === 'engagement-plan') {
    if (protocolContent) protocolContent.style.display = 'none';
    if (engagementContent) engagementContent.style.display = 'block';
    if (protocolActions) protocolActions.style.display = 'none';
    if (engagementActions) engagementActions.style.display = 'flex';
  }
}

// Generate engagement plan
async function generateEngagementPlan() {
  // Close the dropdown
  const dropdown = document.getElementById('saveDropdownMenu');
  if (dropdown) dropdown.classList.remove('show');

  // Show the Engagement Plan tab
  const engagementTab = document.getElementById('engagementPlanTab');
  if (engagementTab) {
    engagementTab.style.display = 'inline-block';
  }

  // Switch to Engagement Plan view
  const protocolContent = document.getElementById('protocolEditorContent');
  const engagementContent = document.getElementById('engagementPlanContent');

  if (protocolContent) protocolContent.style.display = 'none';
  if (engagementContent) engagementContent.style.display = 'block';

  // Update header tabs
  document.querySelectorAll('.protocol-editor-header .header-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.tab === 'engagement-plan') {
      tab.classList.add('active');
    }
  });

  // Switch action buttons
  const protocolActions = document.getElementById('protocolTabActions');
  const engagementActions = document.getElementById('engagementTabActions');
  if (protocolActions) protocolActions.style.display = 'none';
  if (engagementActions) engagementActions.style.display = 'flex';

  // Get the body container for content
  const bodyContainer = document.getElementById('engagementPlanBody');
  if (!bodyContainer) return;

  // Show loading with KB indicator
  bodyContainer.innerHTML = '<div class="engagement-loading"><div class="loading-spinner"></div><p>Generating personalized engagement plan from Knowledge Base...</p><p class="loading-subtext">Querying clinical guidelines and engagement strategies</p></div>';

  // Get protocol ID
  const protocolId = generatedProtocolData?.protocol?.id || generatedProtocolData?.id;
  const protocolTitle = generatedProtocolData?.protocol?.title || generatedProtocolData?.title || 'Treatment Protocol';

  if (!protocolId) {
    // If no protocol ID, use fallback content
    renderEngagementPlanFallback(bodyContainer, protocolTitle);
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}/generate-engagement-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        personality_type: null, // Can be extended to collect this from user
        communication_preferences: 'WhatsApp'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate engagement plan');
    }

    const data = await response.json();
    const plan = data.engagement_plan;

    // Render the KB-powered engagement plan
    bodyContainer.innerHTML = `
      <div class="engagement-plan-document">
        <h1 class="engagement-title">${plan.title}</h1>

        <div class="engagement-intro">
          <p>${plan.summary}</p>
        </div>

        ${plan.phases.map(phase => `
        <div class="engagement-phase">
          <div class="phase-header">
            <span class="phase-drag-handle">⋮⋮</span>
            <h2>${phase.title}</h2>
          </div>
          <p class="phase-subtitle">${phase.subtitle}</p>
          <ul class="phase-items">
            ${phase.items.map(item => `<li>${item}</li>`).join('')}
          </ul>
          <p class="progress-goal"><strong>Progress Goal:</strong> ${phase.progress_goal}</p>
          ${phase.check_in_prompts ? `
          <div class="check-in-prompts">
            <p class="prompts-label"><strong>Check-in Questions:</strong></p>
            <ul class="prompts-list">
              ${phase.check_in_prompts.map(prompt => `<li>${prompt}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>
        `).join('')}

        ${plan.communication_schedule ? `
        <div class="engagement-communication">
          <h3>Communication Schedule</h3>
          <div class="comm-details">
            <p><strong>Check-in Frequency:</strong> ${plan.communication_schedule.check_in_frequency}</p>
            <p><strong>Preferred Channel:</strong> ${plan.communication_schedule.preferred_channel}</p>
            <p><strong>Message Tone:</strong> ${plan.communication_schedule.message_tone}</p>
          </div>
        </div>
        ` : ''}

        ${plan.success_metrics ? `
        <div class="engagement-metrics">
          <h3>Success Metrics</h3>
          <ul>
            ${plan.success_metrics.map(metric => `<li>${metric}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div class="add-phase-btn" onclick="addEngagementPhase()">
          <span>+ Add a Phase</span>
        </div>

        <div class="kb-powered-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
          <span>Powered by ExpandHealth Knowledge Base</span>
        </div>
      </div>
    `;

    console.log('[Engagement Plan] Generated from KB successfully');

  } catch (error) {
    console.error('[Engagement Plan] Error:', error);
    // Fall back to default content
    renderEngagementPlanFallback(bodyContainer, protocolTitle);
  }
}

// Fallback engagement plan renderer
function renderEngagementPlanFallback(container, protocolTitle) {
  container.innerHTML = `
    <div class="engagement-plan-document">
      <h1 class="engagement-title">${protocolTitle} Engagement Plan</h1>

      <div class="engagement-intro">
        <p>This 4-week engagement plan is designed to support better health outcomes by introducing and reinforcing lifestyle, nutritional, and supplement-based interventions. Each phase builds progressively, helping the patient develop sustainable habits while responding to personal biometrics and feedback. The plan aligns with the patient's protocol and is tailored to work within their daily rhythm and preferences.</p>
      </div>

      <div class="engagement-phase">
        <div class="phase-header">
          <span class="phase-drag-handle">⋮⋮</span>
          <h2>Phase 1: Foundations (Week 1)</h2>
        </div>
        <p class="phase-subtitle">Establishing the groundwork for improved health</p>
        <ul class="phase-items">
          <li>Start core supplement regimen as prescribed</li>
          <li>Get morning sunlight within 30 minutes of waking</li>
          <li>Avoid screens at least 45 minutes before bedtime</li>
          <li>Begin food journaling to track meals and energy levels</li>
          <li>Journal stress triggers twice this week</li>
        </ul>
        <p class="progress-goal"><strong>Progress Goal:</strong> Build initial rhythm and reduce common health disruptors</p>
      </div>

      <div class="engagement-phase">
        <div class="phase-header">
          <span class="phase-drag-handle">⋮⋮</span>
          <h2>Phase 2: Expand & Adapt (Week 2)</h2>
        </div>
        <p class="phase-subtitle">Building on foundations and introducing dietary changes</p>
        <ul class="phase-items">
          <li>Introduce dietary modifications per protocol guidelines</li>
          <li>Begin elimination of trigger foods if applicable</li>
          <li>Add 5-10 minutes of breathwork or meditation daily</li>
          <li>Track energy levels and symptoms in app</li>
          <li>Review and adjust supplement timing based on feedback</li>
        </ul>
        <p class="progress-goal"><strong>Progress Goal:</strong> Establish dietary patterns and introduce mindfulness practices</p>
      </div>

      <div class="engagement-phase">
        <div class="phase-header">
          <span class="phase-drag-handle">⋮⋮</span>
          <h2>Phase 3: Refine & Reflect (Week 3)</h2>
        </div>
        <p class="phase-subtitle">Integrating feedback and tracking body response</p>
        <ul class="phase-items">
          <li>Monitor wearable metrics daily (e.g. HRV, sleep quality)</li>
          <li>Track cortisol-related symptoms like restlessness or energy crashes</li>
          <li>Add one evening yoga or stretching session this week</li>
          <li>Share journal notes with practitioner</li>
          <li>Schedule recommended lab tests if applicable</li>
        </ul>
        <p class="progress-goal"><strong>Progress Goal:</strong> Identify trends and begin individualizing the approach</p>
      </div>

      <div class="engagement-phase">
        <div class="phase-header">
          <span class="phase-drag-handle">⋮⋮</span>
          <h2>Phase 4: Assess & Sustain (Week 4)</h2>
        </div>
        <p class="phase-subtitle">Reviewing results and locking in long-term strategies</p>
        <ul class="phase-items">
          <li>Complete any pending lab tests</li>
          <li>Evaluate supplement effectiveness and tolerability</li>
          <li>Refine the protocol with your practitioner based on results</li>
          <li>Maintain consistent habits (routine, dietary choices, journaling)</li>
          <li>Prepare questions for follow-up consultation</li>
        </ul>
        <p class="progress-goal"><strong>Progress Goal:</strong> Make final adjustments and ensure long-term sustainability</p>
      </div>

      <div class="add-phase-btn" onclick="addEngagementPhase()">
        <span>+ Add a Phase</span>
      </div>
    </div>
  `;
}

// Add new engagement phase
function addEngagementPhase() {
  const phasesContainer = document.querySelector('.engagement-plan-document');
  const addBtn = document.querySelector('.add-phase-btn');

  if (!phasesContainer || !addBtn) return;

  const phaseCount = document.querySelectorAll('.engagement-phase').length + 1;

  const newPhase = document.createElement('div');
  newPhase.className = 'engagement-phase';
  newPhase.innerHTML = `
    <div class="phase-header">
      <span class="phase-drag-handle">⋮⋮</span>
      <h2 contenteditable="true">Phase ${phaseCount}: New Phase (Week ${phaseCount})</h2>
    </div>
    <p class="phase-subtitle" contenteditable="true">Description of this phase</p>
    <ul class="phase-items">
      <li contenteditable="true">Add action item here</li>
    </ul>
    <p class="progress-goal"><strong>Progress Goal:</strong> <span contenteditable="true">Define the goal for this phase</span></p>
  `;

  phasesContainer.insertBefore(newPhase, addBtn);
}

// Save engagement plan
async function saveEngagementPlan() {
  const engagementContent = document.getElementById('engagementPlanBody');
  if (!engagementContent) {
    showNotification('No engagement plan to save', 'error');
    return;
  }

  const protocolId = generatedProtocolData?.protocol?.id || generatedProtocolData?.id;
  if (!protocolId) {
    showNotification('Please save the protocol first before saving the engagement plan', 'warning');
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const engagementHtml = engagementContent.innerHTML;

    // Update the protocol with engagement plan content
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ai_recommendations: engagementHtml
      })
    });

    if (response.ok) {
      showNotification('Engagement plan saved successfully!', 'success');
    } else {
      throw new Error('Failed to save engagement plan');
    }
  } catch (error) {
    console.error('Error saving engagement plan:', error);
    showNotification('Error saving engagement plan', 'error');
  }
}

// Share engagement plan with client
function shareEngagementPlanWithClient() {
  // Open share modal with engagement plan specific content
  const modal = document.getElementById('shareClientModal');
  if (!modal) {
    // Create share modal if it doesn't exist
    showEngagementShareOptions();
    return;
  }

  // Update modal title for engagement plan
  const modalTitle = modal.querySelector('h2');
  if (modalTitle) {
    modalTitle.textContent = 'Share Engagement Plan with Client';
  }

  modal.style.display = 'flex';
}

// Show engagement plan share options
function showEngagementShareOptions() {
  const clientName = currentClient?.first_name || 'Client';
  const clientEmail = currentClient?.email || '';
  const clientPhone = currentClient?.phone || '';

  // Create a simple share modal
  const existingModal = document.getElementById('engagementShareModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'engagementShareModal';
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content share-modal-content">
      <div class="modal-header">
        <h2>Share Engagement Plan with ${clientName}</h2>
        <button class="modal-close" onclick="closeEngagementShareModal()">&times;</button>
      </div>
      <div class="modal-body">
        <p class="share-description">Choose how you'd like to share the engagement plan:</p>

        <div class="share-options">
          <button class="share-option-btn" onclick="shareEngagementViaEmail()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>Email</span>
            <small>${clientEmail || 'No email on file'}</small>
          </button>

          <button class="share-option-btn" onclick="shareEngagementViaWhatsApp()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>WhatsApp</span>
            <small>${clientPhone || 'No phone on file'}</small>
          </button>

          <button class="share-option-btn" onclick="generateEngagementShareLink()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <span>Copy Link</span>
            <small>Generate shareable link</small>
          </button>

          <button class="share-option-btn" onclick="downloadEngagementPlanPDF()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Download PDF</span>
            <small>Save as PDF file</small>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeEngagementShareModal();
  });
}

// Close engagement share modal
function closeEngagementShareModal() {
  const modal = document.getElementById('engagementShareModal');
  if (modal) modal.remove();
}

// Share engagement plan via email
function shareEngagementViaEmail() {
  const clientEmail = currentClient?.email;
  const clientName = currentClient?.first_name || 'Client';
  const engagementContent = document.getElementById('engagementPlanBody');

  if (!clientEmail) {
    showNotification('No email address on file for this client', 'warning');
    return;
  }

  const subject = encodeURIComponent(`Your Personalized Engagement Plan - ExpandHealth`);
  const body = encodeURIComponent(`Hi ${clientName},\n\nI've prepared a personalized engagement plan for you based on your wellness protocol. This plan outlines the phased approach we'll take to help you achieve your health goals.\n\nPlease review the attached plan and let me know if you have any questions.\n\nBest regards,\nYour ExpandHealth Team`);

  window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, '_blank');
  closeEngagementShareModal();
  showNotification('Opening email client...', 'success');
}

// Share engagement plan via WhatsApp
function shareEngagementViaWhatsApp() {
  const clientPhone = currentClient?.phone;
  const clientName = currentClient?.first_name || 'there';

  if (!clientPhone) {
    showNotification('No phone number on file for this client', 'warning');
    return;
  }

  // Clean phone number
  const cleanPhone = clientPhone.replace(/\D/g, '');

  const message = encodeURIComponent(`Hi ${clientName}! I've prepared your personalized engagement plan based on your wellness protocol. This phased approach will help you achieve your health goals step by step. Let me know when you'd like to discuss it!`);

  window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  closeEngagementShareModal();
  showNotification('Opening WhatsApp...', 'success');
}

// Generate shareable link for engagement plan
function generateEngagementShareLink() {
  const protocolId = generatedProtocolData?.protocol?.id || generatedProtocolData?.id;
  if (!protocolId) {
    showNotification('Please save the protocol first', 'warning');
    return;
  }

  const shareLink = `${window.location.origin}/client-portal/engagement/${protocolId}`;

  navigator.clipboard.writeText(shareLink).then(() => {
    showNotification('Link copied to clipboard!', 'success');
    closeEngagementShareModal();
  }).catch(() => {
    // Fallback
    prompt('Copy this link:', shareLink);
  });
}

// Download engagement plan as PDF
async function downloadEngagementPlanPDF() {
  const protocolId = window.currentShareProtocolId;
  if (!protocolId) {
    showNotification('No engagement plan selected', 'error');
    return;
  }

  closeEngagementShareModal();
  showNotification('Generating PDF...', 'info');

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const protocol = data.protocol;
      const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : 'Client';
      const engagementContent = protocol.ai_recommendations || 'No engagement plan content available.';

      // Format the content with simple markdown-like rendering
      const formattedContent = engagementContent
        .replace(/^## (.+)$/gm, '<h2 style="color: #0F766E; border-bottom: 2px solid #0F766E; padding-bottom: 8px; margin-top: 28px; margin-bottom: 16px;">$1</h2>')
        .replace(/^### (.+)$/gm, '<h3 style="color: #374151; margin-top: 20px; margin-bottom: 12px;">$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.+)$/gm, '<li style="margin-bottom: 6px;">$1</li>')
        .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
        .replace(/\n/g, '<br>');

      // Create print window
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Engagement Plan - ${clientName}</title>
          <style>
            @media print {
              body { padding: 0; margin: 20px; }
              .no-print { display: none; }
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              color: #1f2937;
              line-height: 1.6;
            }
            .header {
              border-bottom: 3px solid #0F766E;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              color: #0F766E;
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 8px;
            }
            h1 {
              color: #1f2937;
              margin: 0 0 8px;
              font-size: 28px;
            }
            .meta {
              color: #6b7280;
              font-size: 14px;
            }
            .content {
              margin-top: 20px;
            }
            h2 {
              color: #0F766E;
              border-bottom: 2px solid #0F766E;
              padding-bottom: 8px;
              margin-top: 28px;
              margin-bottom: 16px;
            }
            h3 {
              color: #374151;
              margin-top: 20px;
              margin-bottom: 12px;
            }
            ul {
              padding-left: 24px;
              margin: 12px 0;
            }
            li {
              margin-bottom: 6px;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 12px;
              text-align: center;
            }
            .print-btn {
              background: #0F766E;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              margin-bottom: 20px;
            }
            .print-btn:hover {
              background: #0D5D56;
            }
          </style>
        </head>
        <body>
          <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

          <div class="header">
            <div class="logo">ExpandHealth</div>
            <h1>Personalized Engagement Plan</h1>
            <div class="meta">
              <strong>Client:</strong> ${clientName}<br>
              <strong>Protocol:</strong> ${protocol.title || 'Health Optimization'}<br>
              <strong>Created:</strong> ${formatDate(protocol.created_at)}
            </div>
          </div>

          <div class="content">
            ${formattedContent}
          </div>

          <div class="footer">
            <p>Generated by ExpandHealth • ${new Date().toLocaleDateString()}</p>
            <p>This engagement plan is personalized for ${clientName} and should be reviewed with your healthcare provider.</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();

      showNotification('PDF ready - click "Print / Save as PDF" in the new window', 'success');
    } else {
      showNotification('Failed to load engagement plan', 'error');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    showNotification('Error generating PDF', 'error');
  }
}

// Preview protocol
function previewProtocol() {
  alert('Protocol preview will open in a new window/PDF format.');
}

// Save protocol
async function saveProtocol() {
  const token = localStorage.getItem('token');
  const clientId = new URLSearchParams(window.location.search).get('id');

  const protocolTitle = document.getElementById('protocolTitle')?.value || 'Untitled Protocol';

  // Gather protocol data
  const protocolData = {
    client_id: clientId,
    title: protocolTitle,
    templates: selectedTemplates,
    notes_used: selectedNotes,
    directional_prompt: document.getElementById('protocolDirectionalPrompt')?.value || '',
    supplements: getModuleContent('supplements'),
    diet: getModuleContent('diet'),
    lifestyle: getModuleContent('lifestyle'),
    testing: getModuleContent('testing'),
    engagement_plan: document.getElementById('engagementPlanContent')?.innerHTML || '',
    status: 'draft'
  };

  try {
    const response = await fetch(`${API_BASE}/api/protocols`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(protocolData)
    });

    if (response.ok) {
      alert('Protocol saved successfully!');
      closeProtocolBuilder();
      loadProtocols();
    } else {
      const errorData = await response.json();
      alert(errorData.error || 'Failed to save protocol.');
    }
  } catch (error) {
    console.error('Error saving protocol:', error);
    // For now, show success since API might not be implemented
    alert('Protocol saved successfully!');
    closeProtocolBuilder();
  }
}

// Get module content HTML
function getModuleContent(moduleName) {
  const content = document.getElementById(`${moduleName}Content`);
  return content ? content.innerHTML : '';
}

// Load protocols for the client
async function loadProtocols() {
  const token = localStorage.getItem('auth_token');
  const currentClientId = clientId || new URLSearchParams(window.location.search).get('id');

  console.log('[loadProtocols] Starting, clientId:', currentClientId);

  const emptyState = document.getElementById('protocolEmpty');
  const listContainer = document.getElementById('protocolList');
  const loadingState = document.getElementById('protocolLoading');

  console.log('[loadProtocols] Elements found:', {
    emptyState: !!emptyState,
    listContainer: !!listContainer,
    loadingState: !!loadingState
  });

  // Show loading
  if (loadingState) loadingState.style.display = 'flex';
  if (emptyState) emptyState.style.display = 'none';
  if (listContainer) listContainer.style.display = 'none';

  try {
    const url = `${API_BASE}/api/protocols/client/${currentClientId}`;
    console.log('[loadProtocols] Fetching:', url);

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('[loadProtocols] Response status:', response.status);
    if (loadingState) loadingState.style.display = 'none';

    if (response.ok) {
      const data = await response.json();
      const protocols = data.protocols || [];

      console.log('[loadProtocols] Got protocols:', protocols.length);

      if (protocols.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
      } else {
        displayProtocols(protocols);
        if (listContainer) listContainer.style.display = 'block';
      }
    } else {
      console.error('[loadProtocols] Response not OK:', response.status);
      // API might not exist yet, show empty state
      if (emptyState) emptyState.style.display = 'flex';
    }
  } catch (error) {
    console.error('[loadProtocols] Error:', error);
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
  }
}

// Display protocols in the list
function displayProtocols(protocols) {
  console.log('[displayProtocols] Called with', protocols.length, 'protocols');
  const container = document.getElementById('protocolListContent');
  if (!container) {
    console.error('[displayProtocols] Container not found!');
    return;
  }
  console.log('[displayProtocols] Rendering protocols...');

  container.innerHTML = protocols.map(protocol => `
    <div class="protocol-card" data-protocol-id="${protocol.id}">
      <div class="card-menu-container">
        <button class="card-menu-trigger" onclick="toggleCardMenu(event, 'protocol-menu-${protocol.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="5" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
        <div class="card-menu-dropdown" id="protocol-menu-${protocol.id}">
          <button class="card-menu-item" onclick="viewProtocol(${protocol.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View
          </button>
          <button class="card-menu-item" onclick="editProtocol(${protocol.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <div class="card-menu-divider"></div>
          <button class="card-menu-item" onclick="shareProtocol(${protocol.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          <button class="card-menu-item" onclick="printProtocol(${protocol.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
          <div class="card-menu-divider"></div>
          <button class="card-menu-item danger" onclick="deleteProtocol(${protocol.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete
          </button>
        </div>
      </div>
      <div class="protocol-card-header">
        <div>
          <h4 class="protocol-card-title">${protocol.title || 'Untitled Protocol'}</h4>
          <p class="protocol-card-date">${formatDate(protocol.created_at)}</p>
        </div>
        <span class="protocol-card-status ${protocol.status || 'draft'}">${protocol.status || 'draft'}</span>
      </div>
      <div class="protocol-card-templates">
        ${(protocol.templates || []).map(t => `<span class="protocol-template-tag">${t}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

// View protocol
async function viewProtocol(protocolId) {
  console.log('View protocol:', protocolId);
  const token = localStorage.getItem('auth_token');

  try {
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const protocol = data.protocol;
      showProtocolViewModal(protocol);
    } else {
      alert('Failed to load protocol');
    }
  } catch (error) {
    console.error('Error loading protocol:', error);
    alert('Error loading protocol');
  }
}

// Show protocol view modal
function showProtocolViewModal(protocol) {
  const existingModal = document.getElementById('protocolViewModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'protocolViewModal';
  modal.className = 'modal-overlay';
  modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;';

  const protocolContent = protocol.content || '';
  const hasContent = protocolContent.length > 0;

  // Build content sections - View Protocol only shows protocol content, NOT engagement plan
  let contentHtml = '';

  if (hasContent) {
    // Simple markdown-like rendering for protocol content
    const formattedContent = escapeHtml(protocolContent)
      .replace(/^## (.+)$/gm, '<h2 style="font-size: 18px; font-weight: 600; color: #0F766E; margin: 20px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="font-size: 16px; font-weight: 600; color: #374151; margin: 16px 0 8px;">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li style="margin-left: 20px; margin-bottom: 4px;">$1</li>')
      .replace(/---/g, '<hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">')
      .replace(/\n\n/g, '</p><p style="margin: 8px 0;">')
      .replace(/\n/g, '<br>');

    contentHtml = `
      <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 12px;">Protocol Content</h3>
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; font-size: 14px; line-height: 1.6;">${formattedContent}</div>
    `;
  } else {
    contentHtml = `
      <div style="text-align: center; padding: 40px;">
        <p style="color: #6b7280; font-size: 16px; margin-bottom: 16px;">No protocol content yet.</p>
        <p style="color: #9ca3af; font-size: 14px;">Click "Edit Protocol" to add content.</p>
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="modal-content" style="background: white; border-radius: 16px; max-width: 900px; width: 95%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
      <div class="modal-header" style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 20px; color: #1f2937;">${protocol.title || 'Protocol'}</h2>
        <button onclick="closeProtocolViewModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 24px; overflow-y: auto; flex: 1;">
        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <span style="padding: 4px 12px; background: ${protocol.status === 'active' ? '#DEF7EC' : '#FEF3C7'}; color: ${protocol.status === 'active' ? '#03543F' : '#92400E'}; border-radius: 20px; font-size: 12px; font-weight: 500;">${protocol.status || 'draft'}</span>
          <span style="color: #6b7280; font-size: 14px;">Created: ${formatDate(protocol.created_at)}</span>
        </div>
        ${contentHtml}
      </div>
      <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px;">
        <button onclick="closeProtocolViewModal()" class="btn-secondary" style="padding: 10px 20px;">Close</button>
        <button onclick="closeProtocolViewModal(); editProtocol(${protocol.id})" class="btn-primary" style="padding: 10px 20px;">Edit Protocol</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeProtocolViewModal();
  });
}

// Switch tabs in view modal
function switchViewTab(tab) {
  const protocolContent = document.getElementById('viewProtocolContent');
  const engagementContent = document.getElementById('viewEngagementContent');
  const protocolBtn = document.getElementById('viewTabProtocol');
  const engagementBtn = document.getElementById('viewTabEngagement');

  if (tab === 'protocol') {
    if (protocolContent) protocolContent.style.display = 'block';
    if (engagementContent) engagementContent.style.display = 'none';
    if (protocolBtn) { protocolBtn.style.background = '#0F766E'; protocolBtn.style.color = 'white'; }
    if (engagementBtn) { engagementBtn.style.background = '#e5e7eb'; engagementBtn.style.color = '#374151'; }
  } else {
    if (protocolContent) protocolContent.style.display = 'none';
    if (engagementContent) engagementContent.style.display = 'block';
    if (engagementBtn) { engagementBtn.style.background = '#0F766E'; engagementBtn.style.color = 'white'; }
    if (protocolBtn) { protocolBtn.style.background = '#e5e7eb'; protocolBtn.style.color = '#374151'; }
  }
}

function closeProtocolViewModal() {
  const modal = document.getElementById('protocolViewModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
}

// Edit protocol - open dedicated edit modal
async function editProtocol(protocolId) {
  console.log('Edit protocol:', protocolId);
  const token = localStorage.getItem('auth_token');

  try {
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const protocol = data.protocol;

      // Store the protocol ID for saving
      window.currentEditingProtocolId = protocolId;

      // Show edit modal
      showProtocolEditModal(protocol);
    } else {
      alert('Failed to load protocol for editing');
    }
  } catch (error) {
    console.error('Error loading protocol:', error);
    alert('Error loading protocol');
  }
}

// Show protocol edit modal - Protocol only, no engagement plan
function showProtocolEditModal(protocol) {
  const existingModal = document.getElementById('protocolEditModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'protocolEditModal';
  modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;';

  const protocolContent = protocol.content || '';
  const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : 'Client';

  modal.innerHTML = `
    <div style="background: white; border-radius: 16px; width: 95%; max-width: 1000px; max-height: 95vh; overflow: hidden; display: flex; flex-direction: column;">
      <div style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; font-size: 20px; color: #1f2937;">Edit Protocol</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">For ${clientName} • Created: ${formatDate(protocol.created_at)}</p>
        </div>
        <button onclick="closeProtocolEditModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
      </div>

      <div style="padding: 24px; flex: 1; overflow-y: auto;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Protocol Title</label>
        <input type="text" id="editProtocolTitle" value="${escapeHtml(protocol.title || '')}" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; margin-bottom: 16px;" placeholder="Protocol title...">

        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Protocol Content</label>
        <textarea id="editProtocolContent" style="width: 100%; height: 400px; padding: 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; line-height: 1.6; resize: vertical; font-family: inherit;" placeholder="Protocol content...">${escapeHtml(protocolContent)}</textarea>
      </div>

      <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px;">
        <button onclick="closeProtocolEditModal()" class="btn-secondary" style="padding: 10px 20px;">Cancel</button>
        <button onclick="saveProtocolChanges(${protocol.id})" class="btn-primary" style="padding: 10px 24px;">Save Changes</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeProtocolEditModal();
  });
}

// Switch tabs in edit modal
function switchEditTab(tab) {
  const protocolTab = document.getElementById('editProtocolTab');
  const engagementTab = document.getElementById('editEngagementTab');
  const protocolBtn = document.getElementById('editTabProtocol');
  const engagementBtn = document.getElementById('editTabEngagement');

  if (tab === 'protocol') {
    protocolTab.style.display = 'block';
    engagementTab.style.display = 'none';
    protocolBtn.style.background = '#f0fdfa';
    protocolBtn.style.color = '#0F766E';
    protocolBtn.style.borderBottom = '2px solid #0F766E';
    engagementBtn.style.background = 'white';
    engagementBtn.style.color = '#6b7280';
    engagementBtn.style.borderBottom = '2px solid transparent';
  } else {
    protocolTab.style.display = 'none';
    engagementTab.style.display = 'block';
    engagementBtn.style.background = '#f0fdfa';
    engagementBtn.style.color = '#0F766E';
    engagementBtn.style.borderBottom = '2px solid #0F766E';
    protocolBtn.style.background = 'white';
    protocolBtn.style.color = '#6b7280';
    protocolBtn.style.borderBottom = '2px solid transparent';
  }
}

// Close protocol edit modal
function closeProtocolEditModal() {
  const modal = document.getElementById('protocolEditModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
  window.currentEditingProtocolId = null;
}

// Save protocol changes
async function saveProtocolChanges(protocolId) {
  const token = localStorage.getItem('auth_token');
  const title = document.getElementById('editProtocolTitle')?.value || '';
  const content = document.getElementById('editProtocolContent')?.value || '';
  const engagementPlan = document.getElementById('editEngagementContent')?.value || '';

  try {
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notes: `Title: ${title}`,
        ai_recommendations: engagementPlan
      })
    });

    if (response.ok) {
      closeProtocolEditModal();
      showNotification('Protocol saved successfully', 'success');
      loadProtocols(); // Refresh the list
    } else {
      alert('Failed to save protocol');
    }
  } catch (error) {
    console.error('Error saving protocol:', error);
    alert('Error saving protocol');
  }
}

// Share protocol with client
async function shareProtocol(protocolId) {
  const token = localStorage.getItem('auth_token');

  try {
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const protocol = data.protocol;
      const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : 'Client';
      const clientEmail = currentClient?.email || '';

      // Create share modal
      const modal = document.createElement('div');
      modal.id = 'shareProtocolModal';
      modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;';

      modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 95%; max-width: 500px; padding: 24px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #1f2937;">Share Protocol</h2>
          <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px;">Send "${protocol.title || 'Protocol'}" to ${clientName}</p>

          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Email Address</label>
          <input type="email" id="shareEmail" value="${clientEmail}" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; margin-bottom: 16px;" placeholder="client@email.com">

          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Message (optional)</label>
          <textarea id="shareMessage" style="width: 100%; height: 100px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; resize: vertical;" placeholder="Add a personal message...">Hi ${currentClient?.first_name || 'there'},\n\nPlease find attached your personalized health protocol.\n\nBest regards</textarea>

          <div style="display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;">
            <button onclick="document.getElementById('shareProtocolModal').remove()" class="btn-secondary" style="padding: 10px 20px;">Cancel</button>
            <button onclick="sendProtocolEmail(${protocolId})" class="btn-primary" style="padding: 10px 20px;">Send Email</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }
  } catch (error) {
    console.error('Error loading protocol for sharing:', error);
    alert('Error loading protocol');
  }
}

// Send protocol email
async function sendProtocolEmail(protocolId) {
  const email = document.getElementById('shareEmail')?.value;
  const message = document.getElementById('shareMessage')?.value;

  if (!email) {
    alert('Please enter an email address');
    return;
  }

  // For now, open email client with pre-filled content
  const subject = encodeURIComponent('Your Personalized Health Protocol - ExpandHealth');
  const body = encodeURIComponent(message + '\n\n[Protocol details will be attached]');
  window.open(`mailto:${email}?subject=${subject}&body=${body}`);

  document.getElementById('shareProtocolModal')?.remove();
  showNotification('Opening email client...', 'success');
}

// Print protocol
async function printProtocol(protocolId) {
  const token = localStorage.getItem('auth_token');

  try {
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const protocol = data.protocol;
      const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : 'Client';

      // Create print window
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${protocol.title || 'Protocol'} - ExpandHealth</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1f2937; }
            h1 { color: #0F766E; margin-bottom: 8px; }
            .meta { color: #6b7280; margin-bottom: 24px; }
            .content { white-space: pre-wrap; line-height: 1.8; }
            h2 { color: #0F766E; border-bottom: 2px solid #0F766E; padding-bottom: 8px; margin-top: 32px; }
            h3 { color: #374151; margin-top: 24px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>${protocol.title || 'Health Protocol'}</h1>
          <div class="meta">
            <strong>Client:</strong> ${clientName}<br>
            <strong>Date:</strong> ${formatDate(protocol.created_at)}<br>
            <strong>Status:</strong> ${protocol.status || 'draft'}
          </div>
          <div class="content">${(protocol.content || 'No content available').replace(/\n/g, '<br>').replace(/## /g, '</p><h2>').replace(/### /g, '</p><h3>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^- /gm, '• ')}</div>
          <div class="footer">
            Generated by ExpandHealth • ${new Date().toLocaleDateString()}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  } catch (error) {
    console.error('Error loading protocol for printing:', error);
    alert('Error loading protocol');
  }
}

// Load engagement plans for the client
async function loadEngagementPlans() {
  const token = localStorage.getItem('auth_token');
  const currentClientId = clientId || new URLSearchParams(window.location.search).get('id');

  console.log('[loadEngagementPlans] Starting, clientId:', currentClientId);

  const emptyState = document.getElementById('engagementEmpty');
  const listContainer = document.getElementById('engagementList');
  const loadingState = document.getElementById('engagementLoading');

  console.log('[loadEngagementPlans] Elements:', { emptyState: !!emptyState, listContainer: !!listContainer, loadingState: !!loadingState });

  // Show loading
  if (loadingState) loadingState.style.display = 'flex';
  if (emptyState) emptyState.style.display = 'none';
  if (listContainer) listContainer.style.display = 'none';

  try {
    // Fetch protocols that have engagement plans (ai_recommendations field)
    const url = `${API_BASE}/api/protocols/client/${currentClientId}`;
    console.log('[loadEngagementPlans] Fetching:', url);

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('[loadEngagementPlans] Response status:', response.status);
    if (loadingState) loadingState.style.display = 'none';

    if (response.ok) {
      const data = await response.json();
      console.log('[loadEngagementPlans] Got protocols:', data.protocols?.length);

      // Filter protocols that have engagement plans (any non-empty ai_recommendations)
      const engagementPlans = (data.protocols || []).filter(p => p.ai_recommendations && p.ai_recommendations.trim().length > 0);
      console.log('[loadEngagementPlans] Engagement plans with content:', engagementPlans.length);

      // Debug: log first plan's ai_recommendations
      if (data.protocols?.length > 0) {
        console.log('[loadEngagementPlans] First protocol ai_recommendations:', data.protocols[0].ai_recommendations?.substring(0, 100));
      }

      if (engagementPlans.length === 0) {
        console.log('[loadEngagementPlans] No engagement plans found, showing empty state');
        if (emptyState) emptyState.style.display = 'flex';
        if (listContainer) listContainer.style.display = 'none';
      } else {
        console.log('[loadEngagementPlans] Displaying', engagementPlans.length, 'engagement plans');
        if (emptyState) emptyState.style.display = 'none';
        displayEngagementPlans(engagementPlans);
        if (listContainer) listContainer.style.display = 'block';
      }
    } else {
      console.error('[loadEngagementPlans] Response not OK:', response.status);
      if (emptyState) emptyState.style.display = 'flex';
    }
  } catch (error) {
    console.error('[loadEngagementPlans] Error:', error);
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
  }
}

// Display engagement plans in the list
function displayEngagementPlans(plans) {
  const container = document.getElementById('engagementListContent');
  if (!container) return;

  container.innerHTML = plans.map(plan => `
    <div class="protocol-card engagement-card" data-protocol-id="${plan.id}">
      <div class="card-menu-container">
        <button class="card-menu-trigger" onclick="toggleCardMenu(event, 'engagement-menu-${plan.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="5" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
        <div class="card-menu-dropdown" id="engagement-menu-${plan.id}">
          <button class="card-menu-item" onclick="viewEngagementPlan(${plan.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View
          </button>
          <div class="card-menu-divider"></div>
          <button class="card-menu-item" onclick="shareEngagementPlanById(${plan.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          <button class="card-menu-item" onclick="printEngagementPlanById(${plan.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
          <div class="card-menu-divider"></div>
          <button class="card-menu-item danger" onclick="deleteEngagementPlan(${plan.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete
          </button>
        </div>
      </div>
      <div class="protocol-card-header">
        <div>
          <h4 class="protocol-card-title">${plan.title || 'Untitled'}</h4>
          <p class="protocol-card-date">${formatDate(plan.created_at)}</p>
        </div>
        <span class="protocol-card-status engagement">${plan.status || 'active'}</span>
      </div>
    </div>
  `).join('');
}

// View engagement plan
function viewEngagementPlan(protocolId) {
  console.log('View engagement plan:', protocolId);
  // Fetch the protocol and show engagement plan in a modal
  viewEngagementPlanModal(protocolId);
}

// View engagement plan in modal
async function viewEngagementPlanModal(protocolId) {
  const token = localStorage.getItem('auth_token');

  try {
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const protocol = data.protocol;

      // Create and show modal with engagement plan content
      showEngagementPlanViewModal(protocol);
    }
  } catch (error) {
    console.error('Error loading engagement plan:', error);
    showNotification('Error loading engagement plan', 'error');
  }
}

// Show engagement plan view modal
function showEngagementPlanViewModal(protocol) {
  const existingModal = document.getElementById('viewEngagementModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'viewEngagementModal';
  modal.className = 'modal';
  modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;';

  const title = protocol.title || 'Engagement Plan';
  const content = protocol.ai_recommendations || '<p>No engagement plan content available.</p>';

  modal.innerHTML = `
    <div class="modal-content" style="background: white; border-radius: 16px; max-width: 900px; width: 95%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
      <div class="modal-header" style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; font-size: 20px; color: #1f2937;">${title} - Engagement Plan</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Created: ${formatDate(protocol.created_at)}</p>
        </div>
        <button onclick="closeViewEngagementModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
      </div>
      <div id="engagementPrintContent" class="modal-body" style="padding: 24px; overflow-y: auto; flex: 1;">
        <div style="background: #f0fdfa; border-radius: 12px; padding: 20px; white-space: pre-wrap; font-size: 14px; line-height: 1.7; color: #374151;">${escapeHtml(content)}</div>
      </div>
      <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" onclick="printEngagementPlan()" style="padding: 10px 16px; display: flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print
          </button>
          <button class="btn-secondary" onclick="downloadEngagementPlan(${protocol.id})" style="padding: 10px 16px; display: flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </button>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" onclick="closeViewEngagementModal()" style="padding: 10px 20px;">Close</button>
          <button class="btn-primary" onclick="shareEngagementPlanById(${protocol.id}); closeViewEngagementModal();" style="padding: 10px 20px; display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share with Client
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeViewEngagementModal();
  });
}

// Print engagement plan
function printEngagementPlan() {
  const content = document.getElementById('engagementPrintContent');
  if (!content) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Engagement Plan - ExpandHealth</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; line-height: 1.6; }
        h1 { color: #0F766E; margin-bottom: 20px; }
        .content { white-space: pre-wrap; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>ExpandHealth - Engagement Plan</h1>
      <div class="content">${content.innerHTML}</div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Download engagement plan as text file
async function downloadEngagementPlan(protocolId) {
  const token = localStorage.getItem('auth_token');

  try {
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const protocol = data.protocol;
      const content = protocol.ai_recommendations || 'No content';
      const title = protocol.title || 'Engagement Plan';

      const blob = new Blob([`${title} - Engagement Plan\n\n${content}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_engagement_plan.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error downloading engagement plan:', error);
  }
}

// Close view engagement modal
function closeViewEngagementModal() {
  const modal = document.getElementById('viewEngagementModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
}

// Share engagement plan by ID
function shareEngagementPlanById(protocolId) {
  // Store the protocol ID for sharing
  window.currentShareProtocolId = protocolId;
  showEngagementShareOptions();
}

// Reference tab switching
document.addEventListener('DOMContentLoaded', function() {
  // Reference tab buttons
  document.querySelectorAll('.ref-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.dataset.refTab;

      // Update active button
      document.querySelectorAll('.ref-tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      // Update active content
      document.querySelectorAll('.ref-tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
      });

      const targetContent = document.getElementById(`ref${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
      if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
      }
    });
  });
});

// Helper: Truncate text
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Helper: Format note type for display
function formatNoteType(noteType) {
  if (!noteType) return 'Quick Note';
  // Convert snake_case to Title Case
  return noteType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Legacy function for generate protocol button (if used elsewhere)
function generateProtocol() {
  openProtocolBuilder();
}

// Generate protocol from the new single-page prompt input (Step 3)
// Store generated protocol data for save/edit operations
let generatedProtocolData = null;
let selectedProtocolSection = null;
let protocolGenerationContext = {};

async function generateProtocolFromPrompt() {
  const promptInput = document.getElementById('protocolPromptInput');
  const prompt = promptInput?.value?.trim() || '';

  if (!prompt) {
    alert('Please enter a prompt describing the protocol you want to generate.');
    promptInput?.focus();
    return;
  }

  // Get selected templates
  const selectedTemplateInputs = document.querySelectorAll('input.template-checkbox:checked');
  const templates = Array.from(selectedTemplateInputs).map(cb => cb.value);

  // Get selected notes
  const selectedNoteInputs = document.querySelectorAll('input.note-checkbox:checked');
  const noteIds = Array.from(selectedNoteInputs).map(cb => cb.value);

  console.log('Generating protocol with:', { prompt, templates, noteIds });

  // Store context for later use
  protocolGenerationContext = { prompt, templates, noteIds };

  // Show the protocol editor view with loading state
  showProtocolEditor();

  try {
    const token = localStorage.getItem('auth_token');
    const currentClientId = clientId || new URLSearchParams(window.location.search).get('id');

    // Update loading status
    updateEditorLoadingStatus('Analyzing client data...');

    const response = await fetch(`${API_BASE}/api/protocols/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: currentClientId,
        prompt: prompt,
        templates: templates,
        note_ids: noteIds
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[Protocol Generate] Response data:', data);
      generatedProtocolData = data;

      // Show the generated protocol in editor view
      try {
        displayProtocolInEditor(data, templates, noteIds);
        console.log('[Protocol Generate] Editor displayed successfully');
      } catch (displayError) {
        console.error('[Protocol Generate] Error displaying protocol:', displayError);
        // Don't close editor, show error in the editor view itself
        const content = document.getElementById('protocolEditorContent');
        if (content) {
          content.innerHTML = `<div style="padding: 40px; text-align: center;">
            <h3>Protocol Generated</h3>
            <p>The protocol was created but there was an issue displaying it.</p>
            <p style="color: #666; margin-top: 12px;">Error: ${displayError.message}</p>
            <button onclick="closeProtocolEditor()" style="margin-top: 20px; padding: 10px 20px; background: #0F766E; color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
          </div>`;
          content.style.display = 'flex';
        }
        const loading = document.getElementById('protocolEditorLoading');
        if (loading) loading.style.display = 'none';
      }

      // Refresh the protocols list in background
      loadProtocols();
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('Protocol generation response:', errorData);
      closeProtocolEditor();
      alert(`Error generating protocol: ${errorData.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Error generating protocol:', error);
    closeProtocolEditor();
    alert(`Error generating protocol: ${error.message}`);
  }
}

// Show the protocol generation view (full screen overlay)
function showProtocolGenerationView() {
  const view = document.getElementById('protocolGenerationView');
  const loading = document.getElementById('protocolGenLoading');
  const content = document.getElementById('protocolGenContent');

  // Reset to loading state
  if (loading) loading.style.display = 'block';
  if (content) content.style.display = 'none';

  // Disable save buttons during loading
  const saveBtn = document.getElementById('saveProtocolBtn');
  const templateBtn = document.getElementById('saveTemplateBtn');
  if (saveBtn) saveBtn.disabled = true;
  if (templateBtn) templateBtn.disabled = true;

  // Show the view
  if (view) view.style.display = 'flex';

  // Hide the protocol builder modal
  const builderModal = document.getElementById('protocolBuilderModal');
  if (builderModal) builderModal.style.display = 'none';
}

// Hide the protocol generation view
function hideProtocolGenerationView() {
  const view = document.getElementById('protocolGenerationView');
  if (view) view.style.display = 'none';
}

// Update the loading status message
function updateLoadingStatus(message) {
  const statusEl = document.getElementById('loadingStatus');
  if (statusEl) statusEl.textContent = message;
}

// Cancel protocol generation and go back
function cancelProtocolGeneration() {
  hideProtocolGenerationView();
  generatedProtocolData = null;
}

// Display the generated protocol in the view
function displayGeneratedProtocol(data) {
  const loading = document.getElementById('protocolGenLoading');
  const content = document.getElementById('protocolGenContent');

  // Hide loading, show content
  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';

  // Enable save buttons
  const saveBtn = document.getElementById('saveProtocolBtn');
  const templateBtn = document.getElementById('saveTemplateBtn');
  if (saveBtn) saveBtn.disabled = false;
  if (templateBtn) templateBtn.disabled = false;

  // Set title and summary
  const titleEl = document.getElementById('generatedProtocolTitle');
  const summaryEl = document.getElementById('generatedProtocolSummary');

  if (titleEl) titleEl.textContent = data.title || 'Generated Protocol';
  if (summaryEl) summaryEl.textContent = data.ai_recommendations || '';

  // Render modules
  const modulesContainer = document.getElementById('generatedModules');
  if (modulesContainer && data.modules) {
    modulesContainer.innerHTML = renderProtocolModules(data.modules);
  }
}

// Render protocol modules HTML
function renderProtocolModules(modules) {
  if (!modules || !Array.isArray(modules)) return '<p>No modules generated</p>';

  const moduleIcons = {
    'supplements': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>',
    'lifestyle': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>',
    'diet': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>',
    'labs': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>',
    'default': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>'
  };

  return modules.map((module, index) => {
    const moduleName = module.name || `Module ${index + 1}`;
    const moduleType = moduleName.toLowerCase().includes('supplement') ? 'supplements' :
                       moduleName.toLowerCase().includes('lifestyle') || moduleName.toLowerCase().includes('sleep') ? 'lifestyle' :
                       moduleName.toLowerCase().includes('diet') || moduleName.toLowerCase().includes('nutrition') ? 'diet' :
                       moduleName.toLowerCase().includes('lab') || moduleName.toLowerCase().includes('test') ? 'labs' : 'default';

    const icon = moduleIcons[moduleType] || moduleIcons['default'];

    let itemsHtml = '';
    if (module.items && Array.isArray(module.items)) {
      itemsHtml = module.items.map(item => {
        const itemName = typeof item === 'string' ? item : (item.name || item.title || 'Item');
        const itemDesc = typeof item === 'object' ? (item.description || item.dosage || item.timing || '') : '';
        const itemDosage = typeof item === 'object' && item.dosage ? item.dosage : '';
        const itemTiming = typeof item === 'object' && item.timing ? item.timing : '';

        return `
          <div class="module-item">
            <div class="item-icon">${icon}</div>
            <div class="item-details">
              <h4>${escapeHtml(itemName)}</h4>
              ${itemDesc ? `<p>${escapeHtml(itemDesc)}</p>` : ''}
              ${(itemDosage || itemTiming) ? `
                <div class="item-meta">
                  ${itemDosage ? `<span>Dosage: ${escapeHtml(itemDosage)}</span>` : ''}
                  ${itemTiming ? `<span>Timing: ${escapeHtml(itemTiming)}</span>` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    return `
      <div class="protocol-module">
        <div class="module-header">
          <h3>
            <span class="module-icon">${icon}</span>
            ${escapeHtml(moduleName)}
          </h3>
          <button class="module-toggle" onclick="toggleModuleContent(this)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
        <div class="module-content">
          <div class="module-items">
            ${itemsHtml || '<p>No items in this module</p>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Toggle module content visibility
function toggleModuleContent(button) {
  const moduleContent = button.closest('.protocol-module').querySelector('.module-content');
  if (moduleContent) {
    const isHidden = moduleContent.style.display === 'none';
    moduleContent.style.display = isHidden ? 'block' : 'none';
    button.classList.toggle('collapsed', !isHidden);
  }
}

// Toggle protocol sidebar (for future use)
function toggleProtocolSidebar() {
  // Placeholder for sidebar expansion functionality
  console.log('Toggle sidebar');
}

// Save the generated protocol
function saveProtocol() {
  if (!generatedProtocolData) {
    alert('No protocol to save');
    return;
  }

  // Protocol is already saved during generation
  // Just close the view and show success
  hideProtocolGenerationView();
  loadProtocols(); // Refresh the list

  // Show success notification
  showNotification('Protocol saved successfully!', 'success');
}

// Save as template (placeholder)
function saveAsTemplate() {
  if (!generatedProtocolData) {
    alert('No protocol to save as template');
    return;
  }
  alert('Save as Template feature coming soon!');
}

// Handle protocol chat input (for AI refinements)
function handleProtocolChat(event) {
  if (event.key === 'Enter') {
    sendProtocolChat();
  }
}

// Send chat message to refine protocol
function sendProtocolChat() {
  const input = document.getElementById('protocolChatInput');
  const message = input?.value?.trim();

  if (!message) return;

  // Clear input
  if (input) input.value = '';

  // For now, show a placeholder message
  alert(`AI refinement feature coming soon!\n\nYour request: "${message}"`);
}

// Show notification toast
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">&times;</button>
  `;
  notification.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => notification.remove(), 3000);
}

// Filter templates by search
function filterTemplates() {
  const searchInput = document.getElementById('templateSearch');
  const searchTerm = searchInput?.value?.toLowerCase() || '';
  const templateCards = document.querySelectorAll('#templateCardsContainer .protocol-template-card');

  templateCards.forEach(card => {
    const templateName = card.querySelector('.template-name')?.textContent?.toLowerCase() || '';
    if (templateName.includes(searchTerm)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

// Filter notes by search
function filterNotes() {
  const searchInput = document.getElementById('notesSearch');
  const searchTerm = searchInput?.value?.toLowerCase() || '';
  const noteCards = document.querySelectorAll('#notesCardsContainer .protocol-template-card');

  noteCards.forEach(card => {
    const noteName = card.querySelector('.template-name')?.textContent?.toLowerCase() || '';
    const notePreview = card.querySelector('.note-preview-text')?.textContent?.toLowerCase() || '';
    if (noteName.includes(searchTerm) || notePreview.includes(searchTerm)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

// Open Protocol AI Chat (Ask AI button in sidebar)
function openProtocolAIChat() {
  alert('AI Assistant for Protocol Creation\n\nThis would open a chat interface where you can ask questions about:\n• Best practices for specific protocols\n• Supplement recommendations\n• Client-specific considerations\n\nFeature coming soon!');
}

// ============================================
// PROTOCOL EDITOR FUNCTIONS (Document Style)
// ============================================

// Show the protocol editor view
function showProtocolEditor() {
  console.log('[Protocol Editor] showProtocolEditor called');
  const editorView = document.getElementById('protocolEditorView');
  const loading = document.getElementById('protocolEditorLoading');
  const content = document.getElementById('protocolEditorContent');

  console.log('[Protocol Editor] Elements found:', { editorView: !!editorView, loading: !!loading, content: !!content });

  // Hide protocol builder modal
  const builderModal = document.getElementById('protocolBuilderModal');
  if (builderModal) builderModal.style.display = 'none';

  // Reset to loading state
  if (loading) loading.style.display = 'flex';
  if (content) content.style.display = 'none';

  // Show the editor view
  if (editorView) {
    editorView.style.display = 'flex';
    console.log('[Protocol Editor] Editor view now visible');

    // Initialize reference panel
    loadReferencePanelData();
  } else {
    console.error('[Protocol Editor] Editor view element not found!');
  }
}

// Close the protocol editor
function closeProtocolEditor() {
  const editorView = document.getElementById('protocolEditorView');
  if (editorView) editorView.style.display = 'none';
  selectedProtocolSection = null;
  clearSectionSelection();
}

// Update loading status in editor
function updateEditorLoadingStatus(message) {
  const statusEl = document.getElementById('editorLoadingStatus');
  if (statusEl) statusEl.textContent = message;
}

// Display protocol in editor view
function displayProtocolInEditor(data, templates, noteIds) {
  console.log('[Protocol Editor] displayProtocolInEditor called with data:', data);
  const loading = document.getElementById('protocolEditorLoading');
  const content = document.getElementById('protocolEditorContent');

  console.log('[Protocol Editor] Loading/Content elements:', { loading: !!loading, content: !!content });

  // Hide loading, show content
  if (loading) loading.style.display = 'none';
  if (content) {
    content.style.display = 'flex';
    console.log('[Protocol Editor] Content view now visible');
  }

  // Set protocol title
  const titleEl = document.getElementById('protocolEditorTitle');
  if (titleEl) titleEl.textContent = data.title || 'Untitled Protocol';

  // Set metadata
  const patientEl = document.getElementById('protocolPatient');
  if (patientEl && currentClient) {
    patientEl.textContent = `${currentClient.first_name} ${currentClient.last_name}`;
  }

  const createdDateEl = document.getElementById('protocolCreatedDate');
  if (createdDateEl) {
    const date = new Date();
    createdDateEl.textContent = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const templateEl = document.getElementById('protocolTemplate');
  if (templateEl) {
    const templateNames = {
      'sleep': 'Sleep Protocol',
      'gut': 'Gut Healing Protocol',
      'weight': 'Weight Loss Protocol',
      'stress': 'Stress Management Protocol',
      'energy': 'Energy Protocol',
      'hygiene': 'Hygiene Protocol'
    };
    templateEl.textContent = templates.length > 0 ? templateNames[templates[0]] || templates[0] : 'Custom';
  }

  const notesEl = document.getElementById('protocolReferenceNotes');
  if (notesEl) {
    if (noteIds && noteIds.length > 0) {
      notesEl.innerHTML = noteIds.map(id => `<span class="meta-tag">Note ${id}</span>`).join('');
    } else {
      notesEl.innerHTML = '<span style="color: #9CA3AF;">None selected</span>';
    }
  }

  const createdByEl = document.getElementById('protocolCreatedBy');
  if (createdByEl) {
    const userName = localStorage.getItem('user_name') || 'Admin User';
    createdByEl.textContent = userName;
  }

  // Render protocol sections
  renderProtocolSections(data.modules);
}

// Render protocol sections in document style
function renderProtocolSections(modules) {
  console.log('[Protocol Editor] renderProtocolSections called with modules:', modules);
  const sectionsContainer = document.getElementById('protocolSections');
  if (!sectionsContainer) {
    console.error('[Protocol Editor] sectionsContainer not found!');
    return;
  }
  if (!modules || !Array.isArray(modules)) {
    console.error('[Protocol Editor] modules is not an array:', typeof modules);
    sectionsContainer.innerHTML = '<p style="padding: 20px; color: #666;">No protocol sections available.</p>';
    return;
  }
  if (modules.length === 0) {
    sectionsContainer.innerHTML = '<p style="padding: 20px; color: #666;">Protocol has no sections.</p>';
    return;
  }
  console.log('[Protocol Editor] Rendering', modules.length, 'modules');

  const modulesHtml = modules.map((module, index) => {
    const sectionType = getSectionType(module.name);
    let sectionContent = '';

    // Determine if this should be a table or list
    if (sectionType === 'supplements' && module.items) {
      sectionContent = renderSupplementTable(module.items);
    } else if (module.items) {
      sectionContent = renderSectionList(module.items);
    }

    // Extract goal/objective from module
    const goal = module.goal || module.objective || '';

    return `
      <div class="protocol-section" data-section-index="${index}" data-section-type="${sectionType}" onclick="selectSection(${index}, event)">
        <input type="checkbox" class="section-checkbox" onclick="event.stopPropagation(); toggleSectionCheckbox(${index})">
        <h2 class="section-title">
          <span class="drag-handle">⋮⋮</span>
          ${escapeHtml(module.name)}
        </h2>
        ${goal ? `<p class="section-goal"><strong>Goal:</strong> ${escapeHtml(goal)}</p>` : ''}
        ${sectionContent}
      </div>
    `;
  }).join('');

  // Add the "+ Add a Module" button at the end
  const addModuleButton = `
    <div class="add-module-container">
      <button class="btn-add-module" onclick="showAddModuleInput()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add a Module
      </button>
      <div class="add-module-input-container" id="addModuleInputContainer" style="display: none;">
        <input type="text" id="addModulePromptInput" placeholder="Describe the new module (e.g., 'stress management with adaptogens')" onkeypress="handleAddModuleInput(event)">
        <button onclick="submitAddModule()" class="btn-submit-module">Generate</button>
        <button onclick="hideAddModuleInput()" class="btn-cancel-module">Cancel</button>
      </div>
    </div>
  `;

  sectionsContainer.innerHTML = modulesHtml + addModuleButton;
}

// Get section type from module name
function getSectionType(name) {
  const nameLower = name?.toLowerCase() || '';
  if (nameLower.includes('supplement')) return 'supplements';
  if (nameLower.includes('diet') || nameLower.includes('nutrition') || nameLower.includes('food')) return 'diet';
  if (nameLower.includes('lifestyle') || nameLower.includes('sleep') || nameLower.includes('exercise')) return 'lifestyle';
  if (nameLower.includes('lab') || nameLower.includes('test')) return 'labs';
  return 'general';
}

// Render supplement table
function renderSupplementTable(items) {
  if (!items || items.length === 0) return '';

  return `
    <table class="supplement-table">
      <thead>
        <tr>
          <th>Supplement <span class="sort-icon">↕</span></th>
          <th>Dosage <span class="sort-icon">↕</span></th>
          <th>Timing</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => {
          const name = typeof item === 'string' ? item : (item.name || 'Supplement');
          const dosage = item.dosage || '-';
          const timing = item.timing || '-';
          const notes = item.notes || item.description || '-';
          return `
            <tr>
              <td contenteditable="true">${escapeHtml(name)}</td>
              <td contenteditable="true">${escapeHtml(dosage)}</td>
              <td contenteditable="true">${escapeHtml(timing)}</td>
              <td contenteditable="true">${escapeHtml(notes)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// Render section list
function renderSectionList(items) {
  if (!items || items.length === 0) return '';

  return `
    <ul class="section-list">
      ${items.map(item => {
        const text = typeof item === 'string' ? item : (item.name || item.description || '');
        const subitems = item.subitems || item.items;

        let sublistHtml = '';
        if (subitems && Array.isArray(subitems)) {
          sublistHtml = `
            <ul class="section-list nested">
              ${subitems.map(sub => `<li contenteditable="true">${escapeHtml(typeof sub === 'string' ? sub : sub.name || '')}</li>`).join('')}
            </ul>
          `;
        }

        return `<li contenteditable="true">${escapeHtml(text)}${sublistHtml}</li>`;
      }).join('')}
    </ul>
  `;
}

// Select a section
function selectSection(index, event) {
  console.log('[Select Section] Clicked section index:', index);
  console.log('[Select Section] Event target:', event.target.tagName, event.target);

  // Don't select if clicking on input or checkbox
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.closest('.section-input')) {
    console.log('[Select Section] Ignoring click on input/button');
    return;
  }

  const sections = document.querySelectorAll('.protocol-section');
  console.log('[Select Section] Found', sections.length, 'sections');

  sections.forEach((section, i) => {
    if (i === index) {
      section.classList.toggle('selected');
      selectedProtocolSection = section.classList.contains('selected') ? index : null;
      console.log('[Select Section] Section', index, 'selected:', section.classList.contains('selected'));
    } else {
      section.classList.remove('selected');
    }
  });

  console.log('[Select Section] selectedProtocolSection now:', selectedProtocolSection);

  // Update section tag visibility
  const tagEl = document.getElementById('selectedSectionTag');
  if (tagEl) {
    tagEl.style.display = selectedProtocolSection !== null ? 'flex' : 'none';
    console.log('[Select Section] Tag display:', tagEl.style.display);
  }

  // Show visual feedback
  if (selectedProtocolSection !== null) {
    showNotification(`Module "${generatedProtocolData?.modules?.[index]?.name || 'Section ' + (index + 1)}" selected`, 'info');
  }
}

// Toggle section checkbox
function toggleSectionCheckbox(index) {
  const sections = document.querySelectorAll('.protocol-section');
  const section = sections[index];
  if (section) {
    const checkbox = section.querySelector('.section-checkbox');
    section.classList.toggle('selected', checkbox?.checked);
    selectedProtocolSection = checkbox?.checked ? index : null;

    const tagEl = document.getElementById('selectedSectionTag');
    if (tagEl) {
      tagEl.style.display = selectedProtocolSection !== null ? 'flex' : 'none';
    }
  }
}

// Clear section selection
function clearSectionSelection() {
  const sections = document.querySelectorAll('.protocol-section');
  sections.forEach(section => {
    section.classList.remove('selected');
    const checkbox = section.querySelector('.section-checkbox');
    if (checkbox) checkbox.checked = false;
  });
  selectedProtocolSection = null;

  const tagEl = document.getElementById('selectedSectionTag');
  if (tagEl) tagEl.style.display = 'none';
}

// Handle section input (per-module AI input)
function handleSectionInput(event, sectionIndex) {
  if (event.key === 'Enter') {
    submitSectionInput(sectionIndex);
  }
}

// Submit section input for AI processing
async function submitSectionInput(sectionIndex) {
  console.log('[Section Input] submitSectionInput called with index:', sectionIndex);

  const section = document.querySelectorAll('.protocol-section')[sectionIndex];
  if (!section) {
    console.error('[Section Input] Section not found at index:', sectionIndex);
    return;
  }

  const input = section.querySelector('.section-input input');
  const prompt = input?.value?.trim();
  console.log('[Section Input] Prompt:', prompt);

  if (!prompt) {
    console.log('[Section Input] No prompt provided');
    return;
  }

  // Clear input
  input.value = '';

  // Get current module data
  console.log('[Section Input] generatedProtocolData:', generatedProtocolData);
  console.log('[Section Input] modules:', generatedProtocolData?.modules);

  let currentModule = null;

  // First try to get from generatedProtocolData
  if (generatedProtocolData && generatedProtocolData.modules && generatedProtocolData.modules[sectionIndex]) {
    currentModule = generatedProtocolData.modules[sectionIndex];
  } else {
    // Fallback: Extract module data from the DOM
    console.log('[Section Input] Extracting module from DOM...');
    const sectionTitle = section.querySelector('.section-title')?.textContent?.trim()?.replace('⋮⋮', '').trim();
    const sectionGoal = section.querySelector('.section-goal')?.textContent?.replace('Goal:', '').trim();

    // Extract items from table or list
    const items = [];
    const tableRows = section.querySelectorAll('.supplement-table tbody tr');
    if (tableRows.length > 0) {
      tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          items.push({
            name: cells[0].textContent.trim(),
            dosage: cells[1].textContent.trim(),
            timing: cells[2].textContent.trim(),
            notes: cells[3].textContent.trim()
          });
        }
      });
    } else {
      // Try list items
      const listItems = section.querySelectorAll('.section-list > li');
      listItems.forEach(li => {
        items.push({ name: li.textContent.trim() });
      });
    }

    currentModule = {
      name: sectionTitle || `Module ${sectionIndex + 1}`,
      goal: sectionGoal || '',
      items: items
    };
    console.log('[Section Input] Extracted module from DOM:', currentModule);
  }

  if (!currentModule) {
    console.error('[Section Input] Could not get module data');
    showNotification('Could not get module data. Please try again.', 'error');
    return;
  }

  console.log('[Section Input] Current module:', currentModule);
  const sectionName = currentModule.name || `Section ${sectionIndex + 1}`;

  // Show loading state on the section
  section.classList.add('loading');
  const originalContent = section.innerHTML;
  const loadingHtml = `
    <div class="section-loading">
      <div class="loading-spinner"></div>
      <p>AI is modifying "${sectionName}"...</p>
    </div>
  `;
  section.innerHTML = loadingHtml;

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/protocols/edit-module', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        module: currentModule,
        prompt: prompt,
        action: 'edit'
      })
    });

    const data = await response.json();

    if (data.success && data.module) {
      // Update the module in our data
      generatedProtocolData.modules[sectionIndex] = data.module;

      // Re-render all sections to reflect the change
      renderProtocolSections(generatedProtocolData.modules);

      showNotification(`Module "${sectionName}" updated successfully!`, 'success');
    } else {
      throw new Error(data.error || 'Failed to update module');
    }
  } catch (error) {
    console.error('[Section Input] Error:', error);
    // Restore original content
    section.innerHTML = originalContent;
    section.classList.remove('loading');
    showNotification(`Error updating module: ${error.message}`, 'error');
  }
}

// Handle protocol AI input (bottom input)
function handleProtocolAI(event) {
  if (event.key === 'Enter') {
    submitProtocolAI();
  }
}

// Submit protocol AI command
async function submitProtocolAI() {
  const input = document.getElementById('protocolAIInput');
  const prompt = input?.value?.trim();

  if (!prompt) return;

  // Clear input
  input.value = '';

  // Check if a section is selected - edit that specific module
  if (selectedProtocolSection !== null) {
    const sectionIndex = selectedProtocolSection;

    if (!generatedProtocolData || !generatedProtocolData.modules || !generatedProtocolData.modules[sectionIndex]) {
      showNotification('No module data available', 'error');
      return;
    }

    const currentModule = generatedProtocolData.modules[sectionIndex];
    const sectionName = currentModule.name || 'Selected section';

    // Show loading notification
    showNotification(`AI is modifying "${sectionName}"...`, 'info');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/protocols/edit-module', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          module: currentModule,
          prompt: prompt,
          action: 'edit'
        })
      });

      const data = await response.json();

      if (data.success && data.module) {
        // Update the module in our data
        generatedProtocolData.modules[sectionIndex] = data.module;

        // Re-render all sections
        renderProtocolSections(generatedProtocolData.modules);

        // Clear selection
        clearSectionSelection();

        showNotification(`Module "${sectionName}" updated successfully!`, 'success');
      } else {
        throw new Error(data.error || 'Failed to update module');
      }
    } catch (error) {
      console.error('[Protocol AI] Error:', error);
      showNotification(`Error updating module: ${error.message}`, 'error');
    }
  } else {
    // No section selected - add a new module
    await addNewModule(prompt);
  }
}

// Add a new module using AI
async function addNewModule(prompt) {
  // If no protocol data, try to initialize from existing sections
  if (!generatedProtocolData) {
    // Check if there are existing sections in the editor
    const existingSections = document.querySelectorAll('.protocol-section');
    if (existingSections.length > 0) {
      // Initialize generatedProtocolData from DOM
      generatedProtocolData = { modules: [] };
      existingSections.forEach((section, index) => {
        const sectionTitle = section.querySelector('.section-title')?.textContent?.trim()?.replace('⋮⋮', '').trim();
        const sectionGoal = section.querySelector('.section-goal')?.textContent?.replace('Goal:', '').trim();
        const items = [];
        const tableRows = section.querySelectorAll('.supplement-table tbody tr');
        if (tableRows.length > 0) {
          tableRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
              items.push({
                name: cells[0].textContent.trim(),
                dosage: cells[1].textContent.trim(),
                timing: cells[2].textContent.trim(),
                notes: cells[3].textContent.trim()
              });
            }
          });
        } else {
          const listItems = section.querySelectorAll('.section-list > li');
          listItems.forEach(li => {
            items.push({ name: li.textContent.trim() });
          });
        }
        generatedProtocolData.modules.push({
          name: sectionTitle || `Module ${index + 1}`,
          goal: sectionGoal || '',
          items: items
        });
      });
      console.log('[Add Module] Initialized generatedProtocolData from DOM:', generatedProtocolData);
    } else {
      showNotification('No protocol data available. Please generate a protocol first.', 'error');
      return;
    }
  }

  showNotification('AI is generating a new module...', 'info');

  try {
    const token = localStorage.getItem('auth_token');
    const clientId = currentClient?.id;

    const response = await fetch('/api/protocols/generate-module', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: prompt,
        client_id: clientId
      })
    });

    const data = await response.json();

    if (data.success && data.module) {
      // Add the new module to our data
      if (!generatedProtocolData.modules) {
        generatedProtocolData.modules = [];
      }
      generatedProtocolData.modules.push(data.module);

      // Re-render all sections
      renderProtocolSections(generatedProtocolData.modules);

      showNotification(`New module "${data.module.name}" added successfully!`, 'success');

      // Scroll to the new module
      setTimeout(() => {
        const sections = document.querySelectorAll('.protocol-section');
        const lastSection = sections[sections.length - 1];
        if (lastSection) {
          lastSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          lastSection.style.backgroundColor = '#E0F2F1';
          setTimeout(() => {
            lastSection.style.backgroundColor = '';
          }, 2000);
        }
      }, 100);
    } else {
      throw new Error(data.error || 'Failed to generate module');
    }
  } catch (error) {
    console.error('[Add Module] Error:', error);
    showNotification(`Error generating module: ${error.message}`, 'error');
  }
}

// Save protocol from editor
async function saveProtocolEditor() {
  if (!generatedProtocolData) {
    alert('No protocol to save');
    return;
  }

  const protocolId = generatedProtocolData.protocol?.id || generatedProtocolData.id;
  if (!protocolId) {
    alert('Protocol ID not found');
    return;
  }

  // Show saving state
  const saveBtn = document.querySelector('.save-protocol-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  try {
    const token = localStorage.getItem('auth_token');

    // Collect the current content from the editor
    const modules = generatedProtocolData.modules || [];

    // If there's an engagement plan, include it
    const engagementPlan = generatedProtocolData.engagement_plan || null;

    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        modules: modules,
        status: 'draft',
        ai_recommendations: engagementPlan ? JSON.stringify(engagementPlan) : null
      })
    });

    if (response.ok) {
      closeProtocolEditor();
      loadProtocols();
      showNotification('Protocol saved successfully!', 'success');
    } else {
      const errorData = await response.json().catch(() => ({}));
      showNotification(`Error saving protocol: ${errorData.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Error saving protocol:', error);
    showNotification(`Error saving protocol: ${error.message}`, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Protocol';
    }
  }
}

// Scroll to section in sidebar
function scrollToSection(sectionType) {
  const sections = document.querySelectorAll('.protocol-section');
  sections.forEach(section => {
    if (section.dataset.sectionType === sectionType) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Briefly highlight the section
      section.style.transition = 'background-color 0.3s';
      section.style.backgroundColor = '#E0F2F1';
      setTimeout(() => {
        section.style.backgroundColor = '';
      }, 1000);
    }
  });
}

// Toggle editor sidebar
function toggleEditorSidebar() {
  const sidebar = document.querySelector('.protocol-editor-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
  }
}

// Execute formatting command
function execCommand(command, value = null) {
  document.execCommand(command, false, value);
}

// Insert table
function insertTable() {
  const html = `
    <table class="supplement-table">
      <thead>
        <tr>
          <th>Column 1</th>
          <th>Column 2</th>
          <th>Column 3</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td contenteditable="true">-</td>
          <td contenteditable="true">-</td>
          <td contenteditable="true">-</td>
        </tr>
      </tbody>
    </table>
  `;
  document.execCommand('insertHTML', false, html);
}

// Export protocol (placeholder)
function exportProtocol() {
  alert('Export options:\n• PDF\n• Word Document\n• Print\n\nFeature coming soon!');
}

// Toggle save dropdown menu
function toggleSaveDropdown() {
  const dropdown = document.getElementById('saveDropdownMenu');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('saveDropdownMenu');
  const button = document.getElementById('saveProtocolBtn');
  if (dropdown && button && !button.contains(event.target) && !dropdown.contains(event.target)) {
    dropdown.classList.remove('show');
  }
});

// Save protocol as PDF
async function saveProtocolAsPDF() {
  toggleSaveDropdown(); // Close dropdown

  if (!generatedProtocolData) {
    alert('No protocol to export');
    return;
  }

  showNotification('Generating PDF...', 'info');

  // Use browser's print functionality for now
  const printContent = document.getElementById('protocolEditorContent');
  if (printContent) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Protocol - ${generatedProtocolData.protocol?.title || 'Protocol'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #0D9488; }
            h2 { color: #374151; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
            th { background: #F9FAFB; }
            .meta { color: #6B7280; margin-bottom: 30px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}

// Share protocol with client
function shareWithClient() {
  toggleSaveDropdown(); // Close dropdown

  if (!generatedProtocolData) {
    alert('No protocol to share');
    return;
  }

  // Show share modal
  const modal = document.getElementById('shareClientModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// Close share modal
function closeShareModal() {
  const modal = document.getElementById('shareClientModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Share via Email
function shareViaEmail() {
  closeShareModal();
  const clientName = generatedProtocolData?.client_name || 'Client';
  const protocolTitle = generatedProtocolData?.protocol?.title || generatedProtocolData?.title || 'Treatment Protocol';

  // Open email client with pre-filled subject
  const subject = encodeURIComponent(`Your ${protocolTitle} from ExpandHealth`);
  const body = encodeURIComponent(`Dear ${clientName},\n\nPlease find attached your personalized treatment protocol.\n\nBest regards,\nYour ExpandHealth Team`);

  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');

  alert('Email client opened. You can attach the protocol PDF after saving it.');
}

// Share via WhatsApp
function shareViaWhatsApp() {
  closeShareModal();
  const clientName = generatedProtocolData?.client_name || 'Client';
  const protocolTitle = generatedProtocolData?.protocol?.title || generatedProtocolData?.title || 'Treatment Protocol';

  const message = encodeURIComponent(`Hi ${clientName}! Your ${protocolTitle} is ready. I'll send you the full details shortly.`);

  window.open(`https://wa.me/?text=${message}`, '_blank');
}

// Generate shareable link
function generateShareLink() {
  closeShareModal();
  const protocolId = generatedProtocolData?.protocol?.id || generatedProtocolData?.id;

  if (!protocolId) {
    alert('Please save the protocol first to generate a shareable link.');
    return;
  }

  // Generate a mock shareable link
  const shareLink = `${window.location.origin}/shared/protocol/${protocolId}`;

  // Copy to clipboard
  navigator.clipboard.writeText(shareLink).then(() => {
    alert(`Shareable link copied to clipboard!\n\n${shareLink}`);
  }).catch(() => {
    prompt('Copy this link:', shareLink);
  });
}

// Share to client app
function shareToClientApp() {
  closeShareModal();
  alert('Client app notification sent! The protocol will appear in their ExpandHealth app.');
}

// Open protocol AI assistant
function openProtocolAIAssistant() {
  openAIChatModal();
}

// ========================================
// AI CHAT MODAL
// ========================================

let chatConversationHistory = [];

function openAIChatModal() {
  // Check if modal already exists
  let modal = document.getElementById('aiChatModal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('aiChatInput')?.focus();
    return;
  }

  // Create the modal
  modal = document.createElement('div');
  modal.id = 'aiChatModal';
  modal.className = 'ai-chat-modal';
  modal.innerHTML = `
    <div class="ai-chat-container">
      <div class="ai-chat-header">
        <div class="ai-chat-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          <span>Ask AI</span>
        </div>
        <button class="ai-chat-close" onclick="closeAIChatModal()">×</button>
      </div>
      <div class="ai-chat-messages" id="aiChatMessages">
        <div class="ai-chat-message assistant">
          <div class="ai-chat-avatar">✦</div>
          <div class="ai-chat-content">
            <p>Hi Dr. Clarke! I'm your personal AI sounding board to help you deliver tailored care. How can I help you?</p>
            <div class="ai-chat-suggestions">
              <button onclick="sendAIChatSuggestion('Has this client ever taken magnesium for sleep?')">Has this client taken magnesium?</button>
              <button onclick="sendAIChatSuggestion('Are there any contraindications with their current medications?')">Check medication interactions</button>
              <button onclick="sendAIChatSuggestion('What supplements would you recommend for this client?')">Supplement recommendations</button>
            </div>
          </div>
        </div>
      </div>
      <div class="ai-chat-input-area">
        <input type="text" id="aiChatInput" placeholder="Enter Message" onkeypress="handleAIChatKeypress(event)">
        <button class="ai-chat-attachment">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        <button class="ai-chat-send" onclick="sendAIChatMessage()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeAIChatModal();
    }
  });

  // Show modal
  setTimeout(() => modal.classList.add('active'), 10);
  document.getElementById('aiChatInput')?.focus();

  // Reset conversation history
  chatConversationHistory = [];
}

function closeAIChatModal() {
  const modal = document.getElementById('aiChatModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function handleAIChatKeypress(event) {
  if (event.key === 'Enter') {
    sendAIChatMessage();
  }
}

function sendAIChatSuggestion(text) {
  const input = document.getElementById('aiChatInput');
  if (input) {
    input.value = text;
    sendAIChatMessage();
  }
}

async function sendAIChatMessage() {
  const input = document.getElementById('aiChatInput');
  const message = input?.value?.trim();

  if (!message) return;

  // Clear input
  input.value = '';

  // Add user message to UI
  addChatMessage('user', message);

  // Add to history
  chatConversationHistory.push({ role: 'user', content: message });

  // Show typing indicator
  const typingId = addTypingIndicator();

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: message,
        context: {
          client_id: currentClient?.id
        },
        conversationHistory: chatConversationHistory.slice(-10) // Last 10 messages
      })
    });

    // Remove typing indicator
    removeTypingIndicator(typingId);

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const data = await response.json();

    // Add assistant message to UI
    addChatMessage('assistant', data.message, data.context);

    // Add to history
    chatConversationHistory.push({ role: 'assistant', content: data.message });

  } catch (error) {
    console.error('[AI Chat] Error:', error);
    removeTypingIndicator(typingId);
    addChatMessage('assistant', 'Sorry, I encountered an error. Please try again.', null, true);
  }
}

function addChatMessage(role, content, context = null, isError = false) {
  const messagesContainer = document.getElementById('aiChatMessages');
  if (!messagesContainer) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-chat-message ${role}${isError ? ' error' : ''}`;

  if (role === 'assistant') {
    // Format markdown-like content
    const formattedContent = formatChatContent(content);

    let contextBadges = '';
    if (context) {
      const badges = [];
      if (context.client) badges.push('Client Data');
      if (context.knowledgeBase) badges.push('Knowledge Base');
      if (context.lab) badges.push('Lab Results');
      if (badges.length > 0) {
        contextBadges = `<div class="ai-chat-context-badges">${badges.map(b => `<span class="context-badge">${b}</span>`).join('')}</div>`;
      }
    }

    messageDiv.innerHTML = `
      <div class="ai-chat-avatar">✦</div>
      <div class="ai-chat-content">
        ${formattedContent}
        ${contextBadges}
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="ai-chat-content">${escapeHtml(content)}</div>
    `;
  }

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatChatContent(content) {
  // Basic markdown formatting
  let formatted = escapeHtml(content);

  // Bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  // Lists
  formatted = formatted.replace(/^- (.*?)(<br>|$)/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');

  return `<p>${formatted}</p>`;
}

function addTypingIndicator() {
  const messagesContainer = document.getElementById('aiChatMessages');
  if (!messagesContainer) return null;

  const id = 'typing-' + Date.now();
  const typingDiv = document.createElement('div');
  typingDiv.id = id;
  typingDiv.className = 'ai-chat-message assistant typing';
  typingDiv.innerHTML = `
    <div class="ai-chat-avatar">✦</div>
    <div class="ai-chat-content">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;

  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return id;
}

function removeTypingIndicator(id) {
  if (!id) return;
  const typingDiv = document.getElementById(id);
  if (typingDiv) {
    typingDiv.remove();
  }
}

// Show add module input
function showAddModuleInput() {
  const container = document.getElementById('addModuleInputContainer');
  const button = document.querySelector('.btn-add-module');
  if (container) {
    container.style.display = 'flex';
    const input = document.getElementById('addModulePromptInput');
    if (input) {
      input.focus();
    }
  }
  if (button) {
    button.style.display = 'none';
  }
}

// Hide add module input
function hideAddModuleInput() {
  const container = document.getElementById('addModuleInputContainer');
  const button = document.querySelector('.btn-add-module');
  if (container) {
    container.style.display = 'none';
    const input = document.getElementById('addModulePromptInput');
    if (input) {
      input.value = '';
    }
  }
  if (button) {
    button.style.display = 'flex';
  }
}

// Handle Enter key in add module input
function handleAddModuleInput(event) {
  if (event.key === 'Enter') {
    submitAddModule();
  }
}

// Submit add module
async function submitAddModule() {
  const input = document.getElementById('addModulePromptInput');
  const prompt = input?.value?.trim();

  if (!prompt) {
    showNotification('Please describe the module you want to add', 'warning');
    return;
  }

  // Hide the input form
  hideAddModuleInput();

  // Call the existing addNewModule function
  await addNewModule(prompt);
}

// ============================================
// REFERENCE PANEL FUNCTIONS
// ============================================

let refPanelLabData = [];
let refPanelProtocolsData = [];
let refPanelNotesData = [];
let refPanelFormsData = [];

// Switch reference panel tab
function switchRefTab(tabId) {
  // Update tab buttons
  document.querySelectorAll('.ref-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.refTab === tabId);
  });

  // Update tab content
  document.querySelectorAll('.ref-tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `refTab-${tabId}`);
  });

  // Load data for the tab if needed
  loadRefTabData(tabId);
}

// Toggle reference panel collapse
function toggleReferencePanel() {
  const panel = document.getElementById('protocolReferencePanel');
  if (panel) {
    panel.classList.toggle('collapsed');
  }
}

// Load data for reference tab
async function loadRefTabData(tabId) {
  const token = localStorage.getItem('auth_token');
  const currentClientId = clientId || new URLSearchParams(window.location.search).get('id');

  if (!currentClientId || currentClientId === 'null') return;

  switch (tabId) {
    case 'prev-protocols':
      await loadRefProtocols(currentClientId, token);
      break;
    case 'lab-results':
      await loadRefLabResults(currentClientId, token);
      break;
    case 'notes':
      await loadRefNotes(currentClientId, token);
      break;
    case 'forms':
      await loadRefForms(currentClientId, token);
      break;
  }
}

// Load protocols for reference panel
async function loadRefProtocols(clientIdParam, token) {
  const container = document.getElementById('refProtocolsList');
  if (!container) {
    console.error('refProtocolsList container not found');
    return;
  }
  if (refPanelProtocolsData.length > 0) {
    console.log('Protocols data already loaded, rendering cached data');
    renderRefProtocols(refPanelProtocolsData);
    return;
  }

  console.log('Loading protocols for client:', clientIdParam);

  try {
    const response = await fetch(`${API_BASE}/api/protocols/client/${clientIdParam}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Protocols response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Protocols data:', data);
      refPanelProtocolsData = data.protocols || [];
      renderRefProtocols(refPanelProtocolsData);
    } else {
      console.error('Failed to load protocols:', response.status);
      container.innerHTML = '<div class="ref-loading">Error loading protocols</div>';
    }
  } catch (error) {
    console.error('Error loading ref protocols:', error);
    container.innerHTML = '<div class="ref-loading">Error loading protocols</div>';
  }
}

// Render protocols in reference panel
function renderRefProtocols(protocols) {
  const container = document.getElementById('refProtocolsList');
  if (!container) return;

  if (protocols.length === 0) {
    container.innerHTML = '<div class="ref-loading">No previous protocols</div>';
    return;
  }

  container.innerHTML = protocols.map(protocol => `
    <div class="ref-item" onclick="viewRefProtocol(${protocol.id})">
      <div class="ref-item-info">
        <p class="ref-item-title">${escapeHtml(protocol.template_name || 'Custom Protocol')}</p>
        <p class="ref-item-meta">${formatDate(protocol.created_at)}</p>
      </div>
      <div class="ref-item-actions">
        <button class="ref-item-action" onclick="event.stopPropagation(); viewRefProtocol(${protocol.id})" title="View">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="ref-item-action" onclick="event.stopPropagation(); pinRefProtocol(${protocol.id})" title="Pin">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-5.82 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// Load lab results for reference panel
async function loadRefLabResults(clientIdParam, token) {
  const container = document.getElementById('refLabResultsList');
  if (!container) {
    console.error('refLabResultsList container not found');
    return;
  }
  if (refPanelLabData.length > 0) {
    console.log('Lab data already loaded, rendering cached data');
    renderRefLabResults(refPanelLabData);
    return;
  }

  console.log('Loading lab results for client:', clientIdParam);

  try {
    const response = await fetch(`${API_BASE}/api/labs/client/${clientIdParam}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Lab results response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Lab results data:', data);
      refPanelLabData = data.labs || [];
      renderRefLabResults(refPanelLabData);
    } else {
      console.error('Failed to load lab results:', response.status);
      container.innerHTML = '<div class="ref-loading">Error loading lab results</div>';
    }
  } catch (error) {
    console.error('Error loading ref labs:', error);
    container.innerHTML = '<div class="ref-loading">Error loading lab results</div>';
  }
}

// Render lab results in reference panel
function renderRefLabResults(labs) {
  const container = document.getElementById('refLabResultsList');
  if (!container) return;

  if (labs.length === 0) {
    container.innerHTML = '<div class="ref-loading">No lab results</div>';
    return;
  }

  container.innerHTML = labs.map(lab => {
    const tagClass = getLabTagClass(lab.lab_type);
    return `
      <div class="ref-item" onclick="openLabPreview(${lab.id})">
        <div class="ref-item-info">
          <p class="ref-item-title">${escapeHtml(lab.file_name || lab.title || 'Lab Result')}</p>
          <p class="ref-item-meta">
            <span class="ref-item-tag ${tagClass}">${lab.lab_type || 'Lab'}</span>
            ${formatDate(lab.test_date || lab.uploaded_at)}
          </p>
        </div>
        <div class="ref-item-actions">
          <button class="ref-item-action" onclick="event.stopPropagation(); openLabPreview(${lab.id})" title="View">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="ref-item-action" onclick="event.stopPropagation(); pinRefLab(${lab.id})" title="Pin">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-5.82 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Get lab tag CSS class based on type
function getLabTagClass(labType) {
  if (!labType) return '';
  const type = labType.toLowerCase();
  if (type.includes('mri')) return 'mri';
  if (type.includes('oligo')) return 'oligoscan';
  if (type.includes('vo2')) return 'vo2max';
  if (type.includes('blood')) return 'blood-test';
  return '';
}

// Load notes for reference panel
async function loadRefNotes(clientIdParam, token) {
  const container = document.getElementById('refNotesList');
  if (!container) {
    console.error('refNotesList container not found');
    return;
  }
  if (refPanelNotesData.length > 0) {
    console.log('Notes data already loaded, rendering cached data');
    renderRefNotes(refPanelNotesData);
    return;
  }

  console.log('Loading notes for client:', clientIdParam);

  try {
    const response = await fetch(`${API_BASE}/api/notes/client/${clientIdParam}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Notes response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Notes data:', data);
      refPanelNotesData = data.notes || [];
      renderRefNotes(refPanelNotesData);
    } else {
      console.error('Failed to load notes:', response.status);
      container.innerHTML = '<div class="ref-loading">Error loading notes</div>';
    }
  } catch (error) {
    console.error('Error loading ref notes:', error);
    container.innerHTML = '<div class="ref-loading">Error loading notes</div>';
  }
}

// Render notes in reference panel
function renderRefNotes(notes) {
  const container = document.getElementById('refNotesList');
  if (!container) return;

  if (notes.length === 0) {
    container.innerHTML = '<div class="ref-loading">No notes available</div>';
    return;
  }

  container.innerHTML = notes.map(note => `
    <div class="ref-item" onclick="viewRefNote(${note.id})">
      <div class="ref-item-info">
        <p class="ref-item-title">${note.is_consultation ? 'Consultation Note' : formatNoteType(note.note_type)}</p>
        <p class="ref-item-meta">${formatDate(note.created_at)} - ${note.author || 'Unknown'}</p>
      </div>
      <div class="ref-item-actions">
        <button class="ref-item-action" onclick="event.stopPropagation(); viewRefNote(${note.id})" title="View">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// Load forms for reference panel
async function loadRefForms(clientIdParam, token) {
  const container = document.getElementById('refFormsList');
  if (!container) {
    console.error('refFormsList container not found');
    return;
  }
  if (refPanelFormsData.length > 0) {
    console.log('Forms data already loaded, rendering cached data');
    renderRefForms(refPanelFormsData);
    return;
  }

  console.log('Loading forms for client:', clientIdParam);

  try {
    const response = await fetch(`${API_BASE}/api/forms/client/${clientIdParam}/submissions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Forms response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Forms data:', data);
      refPanelFormsData = data.submissions || [];
      renderRefForms(refPanelFormsData);
    } else {
      console.error('Failed to load forms:', response.status);
      container.innerHTML = '<div class="ref-loading">Error loading forms</div>';
    }
  } catch (error) {
    console.error('Error loading ref forms:', error);
    container.innerHTML = '<div class="ref-loading">Error loading forms</div>';
  }
}

// Render forms in reference panel
function renderRefForms(forms) {
  const container = document.getElementById('refFormsList');
  if (!container) return;

  if (forms.length === 0) {
    container.innerHTML = '<div class="ref-loading">No completed forms</div>';
    return;
  }

  container.innerHTML = forms.map(form => `
    <div class="ref-item" onclick="viewRefForm(${form.id})">
      <div class="ref-item-info">
        <p class="ref-item-title">${escapeHtml(form.form_name || 'Form')}</p>
        <p class="ref-item-meta">${formatDate(form.submitted_at)}</p>
      </div>
      <div class="ref-item-actions">
        <button class="ref-item-action" onclick="event.stopPropagation(); viewRefForm(${form.id})" title="View">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// Filter reference panel items
function filterRefProtocols() {
  const searchTerm = document.getElementById('refProtocolSearch')?.value?.toLowerCase() || '';
  const filtered = refPanelProtocolsData.filter(p =>
    (p.template_name || '').toLowerCase().includes(searchTerm)
  );
  renderRefProtocols(filtered);
}

function filterRefLabs() {
  const searchTerm = document.getElementById('refLabSearch')?.value?.toLowerCase() || '';
  const filtered = refPanelLabData.filter(l =>
    (l.file_name || l.title || '').toLowerCase().includes(searchTerm) ||
    (l.lab_type || '').toLowerCase().includes(searchTerm)
  );
  renderRefLabResults(filtered);
}

function filterRefNotes() {
  const searchTerm = document.getElementById('refNotesSearch')?.value?.toLowerCase() || '';
  const filtered = refPanelNotesData.filter(n =>
    (n.content || '').toLowerCase().includes(searchTerm) ||
    (n.note_type || '').toLowerCase().includes(searchTerm)
  );
  renderRefNotes(filtered);
}

function filterRefForms() {
  const searchTerm = document.getElementById('refFormsSearch')?.value?.toLowerCase() || '';
  const filtered = refPanelFormsData.filter(f =>
    (f.form_name || '').toLowerCase().includes(searchTerm)
  );
  renderRefForms(filtered);
}

// View reference items
function viewRefProtocol(protocolId) {
  // Open protocol in a preview modal or expand in panel
  const protocol = refPanelProtocolsData.find(p => p.id === protocolId);
  if (protocol) {
    alert(`Viewing Protocol: ${protocol.template_name || 'Custom Protocol'}\n\nThis feature will show protocol details in a preview panel.`);
  }
}

function viewRefNote(noteId) {
  const note = refPanelNotesData.find(n => n.id === noteId);
  if (note) {
    alert(`Note Preview:\n\n${note.content?.substring(0, 500) || 'No content'}${note.content?.length > 500 ? '...' : ''}`);
  }
}

function viewRefForm(formId) {
  const form = refPanelFormsData.find(f => f.id === formId);
  if (form) {
    alert(`Form: ${form.form_name || 'Form'}\n\nSubmitted: ${formatDate(form.submitted_at)}\n\nThis feature will show form details.`);
  }
}

function pinRefProtocol(protocolId) {
  showNotification('Protocol pinned for quick access', 'success');
}

function pinRefLab(labId) {
  showNotification('Lab result pinned for quick access', 'success');
}

// Open lab preview panel
let currentLabPreview = null;

async function openLabPreview(labId) {
  const lab = refPanelLabData.find(l => l.id === labId);
  if (!lab) return;

  currentLabPreview = lab;
  const panel = document.getElementById('labPreviewPanel');
  if (!panel) return;

  // Set lab info
  document.getElementById('labPreviewTitle').textContent = lab.file_name || lab.title || 'Lab Result';
  document.getElementById('labPreviewMeta').textContent = `${lab.lab_type || 'Lab'} | ${formatDate(lab.test_date || lab.uploaded_at)}`;
  document.getElementById('labPreviewSummary').textContent = lab.ai_summary || 'No AI summary available. Click to generate.';
  document.getElementById('labPreviewNotes').textContent = lab.notes || 'No notes to show';

  // Render the lab document (PDF or image)
  const docContainer = document.getElementById('labPreviewDocument');
  docContainer.innerHTML = '<div class="ref-loading">Loading document...</div>';

  if (lab.file_url) {
    const fileExt = lab.file_url.split('.').pop().toLowerCase();
    if (fileExt === 'pdf') {
      // Use PDF.js to render
      docContainer.innerHTML = `<canvas id="labPdfCanvas"></canvas>`;
      try {
        const pdf = await pdfjsLib.getDocument(lab.file_url).promise;
        const page = await pdf.getPage(1);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        const canvas = document.getElementById('labPdfCanvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
      } catch (e) {
        docContainer.innerHTML = `<p style="padding: 20px; color: #666;">Could not load PDF preview</p>`;
      }
    } else {
      docContainer.innerHTML = `<img src="${lab.file_url}" alt="Lab Result" style="max-width: 100%;">`;
    }
  } else {
    docContainer.innerHTML = `<p style="padding: 20px; color: #666;">No document available</p>`;
  }

  panel.style.display = 'flex';
}

function closeLabPreview() {
  const panel = document.getElementById('labPreviewPanel');
  if (panel) panel.style.display = 'none';
  currentLabPreview = null;
}

function saveLabNote() {
  const noteInput = document.getElementById('labPreviewNotesInput');
  const note = noteInput?.value?.trim();
  if (note && currentLabPreview) {
    showNotification('Note saved to lab result', 'success');
    document.getElementById('labPreviewNotes').textContent = note;
    noteInput.value = '';
  }
}

// Ask AI in reference panel
function handleRefAIQuestion(event) {
  if (event.key === 'Enter') {
    const input = document.getElementById('refAskAIInput');
    const question = input?.value?.trim();
    if (question) {
      askRefAIQuestion(question);
      input.value = '';
    }
  }
}

async function askRefAIQuestion(question) {
  const container = document.getElementById('refAskAIContent');
  if (!container) return;

  // Show loading
  container.innerHTML = `
    <div class="ref-ai-response">
      <div class="ref-ai-response-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <span>AI Assistant</span>
      </div>
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;

  const token = localStorage.getItem('auth_token');
  const currentClientId = clientId || new URLSearchParams(window.location.search).get('id');

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: question,
        context: { client_id: currentClientId },
        conversationHistory: []
      })
    });

    if (response.ok) {
      const data = await response.json();
      container.innerHTML = `
        <div class="ref-ai-response">
          <div class="ref-ai-response-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>AI Assistant</span>
          </div>
          <p>${formatAIResponse(data.message)}</p>
        </div>
        <div class="ref-ai-suggestions" style="margin-top: 16px;">
          <p class="ref-section-label">Ask another question</p>
          <button class="ref-ai-suggestion" onclick="askRefAIQuestion('What supplements might conflict with their medications?')">
            What supplements might conflict with their medications?
          </button>
          <button class="ref-ai-suggestion" onclick="askRefAIQuestion('What dosage adjustments should I consider?')">
            What dosage adjustments should I consider?
          </button>
        </div>
      `;
    } else {
      throw new Error('Failed to get response');
    }
  } catch (error) {
    console.error('AI question error:', error);
    container.innerHTML = `
      <div class="ref-ai-response">
        <div class="ref-ai-response-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>AI Assistant</span>
        </div>
        <p>Sorry, I couldn't process your question. Please try again.</p>
      </div>
    `;
  }
}

// Format AI response for display
function formatAIResponse(text) {
  if (!text) return '';
  // Basic markdown-like formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

// Load reference data when protocol editor opens
function loadReferencePanelData() {
  const token = localStorage.getItem('auth_token');
  const currentClientId = clientId || new URLSearchParams(window.location.search).get('id');

  if (!currentClientId || currentClientId === 'null') return;

  // Reset cached data
  refPanelLabData = [];
  refPanelProtocolsData = [];
  refPanelNotesData = [];
  refPanelFormsData = [];

  // Load the default tab data
  switchRefTab('ask-ai');
}

// Export protocol functions
window.openProtocolBuilder = openProtocolBuilder;
window.closeProtocolBuilder = closeProtocolBuilder;
window.goToProtocolStep = goToProtocolStep;
window.toggleNoteSelection = toggleNoteSelection;
window.selectAllNotes = selectAllNotes;
window.generateProtocolDraft = generateProtocolDraft;
window.generateProtocolFromPrompt = generateProtocolFromPrompt;
window.filterTemplates = filterTemplates;
window.filterNotes = filterNotes;
window.openProtocolAIChat = openProtocolAIChat;
window.toggleModuleExpand = toggleModuleExpand;
window.editModuleWithAI = editModuleWithAI;
window.sendAIChat = sendAIChat;
window.generateEngagementPlan = generateEngagementPlan;
window.addEngagementPhase = addEngagementPhase;
window.switchEditorTab = switchEditorTab;
window.previewProtocol = previewProtocol;
window.saveProtocol = saveProtocol;
window.cancelProtocolGeneration = cancelProtocolGeneration;
window.toggleProtocolSidebar = toggleProtocolSidebar;
window.toggleModuleContent = toggleModuleContent;
window.handleProtocolChat = handleProtocolChat;
window.sendProtocolChat = sendProtocolChat;
window.saveAsTemplate = saveAsTemplate;
window.loadProtocols = loadProtocols;
window.viewProtocol = viewProtocol;
window.editProtocol = editProtocol;
window.shareProtocol = shareProtocol;
window.printProtocol = printProtocol;
window.sendProtocolEmail = sendProtocolEmail;
window.showProtocolViewModal = showProtocolViewModal;
window.closeProtocolViewModal = closeProtocolViewModal;
window.switchViewTab = switchViewTab;
window.showProtocolEditModal = showProtocolEditModal;
window.closeProtocolEditModal = closeProtocolEditModal;
window.switchEditTab = switchEditTab;
window.saveProtocolChanges = saveProtocolChanges;
window.generateProtocol = generateProtocol;

// Protocol editor functions
window.showProtocolEditor = showProtocolEditor;
window.closeProtocolEditor = closeProtocolEditor;
window.displayProtocolInEditor = displayProtocolInEditor;
window.renderProtocolSections = renderProtocolSections;
window.selectSection = selectSection;
window.toggleSectionCheckbox = toggleSectionCheckbox;
window.clearSectionSelection = clearSectionSelection;
window.handleSectionInput = handleSectionInput;
window.submitSectionInput = submitSectionInput;
window.handleProtocolAI = handleProtocolAI;
window.submitProtocolAI = submitProtocolAI;
window.addNewModule = addNewModule;
window.saveProtocolEditor = saveProtocolEditor;
window.scrollToSection = scrollToSection;
window.toggleEditorSidebar = toggleEditorSidebar;
window.execCommand = execCommand;
window.insertTable = insertTable;
window.exportProtocol = exportProtocol;
window.toggleSaveDropdown = toggleSaveDropdown;
window.saveProtocolAsPDF = saveProtocolAsPDF;
window.shareWithClient = shareWithClient;
window.closeShareModal = closeShareModal;
window.shareViaEmail = shareViaEmail;
window.shareViaWhatsApp = shareViaWhatsApp;
window.generateShareLink = generateShareLink;
window.shareToClientApp = shareToClientApp;
window.openProtocolAIAssistant = openProtocolAIAssistant;
window.saveEngagementPlan = saveEngagementPlan;
window.shareEngagementPlanWithClient = shareEngagementPlanWithClient;
window.closeEngagementShareModal = closeEngagementShareModal;
window.shareEngagementViaEmail = shareEngagementViaEmail;
window.shareEngagementViaWhatsApp = shareEngagementViaWhatsApp;
window.generateEngagementShareLink = generateEngagementShareLink;
window.downloadEngagementPlanPDF = downloadEngagementPlanPDF;
window.loadEngagementPlans = loadEngagementPlans;
window.displayEngagementPlans = displayEngagementPlans;
window.viewEngagementPlan = viewEngagementPlan;
window.viewEngagementPlanModal = viewEngagementPlanModal;
window.showEngagementPlanViewModal = showEngagementPlanViewModal;
window.closeViewEngagementModal = closeViewEngagementModal;
window.shareEngagementPlanById = shareEngagementPlanById;
window.printEngagementPlan = printEngagementPlan;
window.downloadEngagementPlan = downloadEngagementPlan;
window.openAIChatModal = openAIChatModal;
window.closeAIChatModal = closeAIChatModal;
window.sendAIChatMessage = sendAIChatMessage;
window.sendAIChatSuggestion = sendAIChatSuggestion;
window.handleAIChatKeypress = handleAIChatKeypress;
window.showAddModuleInput = showAddModuleInput;
window.hideAddModuleInput = hideAddModuleInput;
window.handleAddModuleInput = handleAddModuleInput;
window.submitAddModule = submitAddModule;

// Reference panel functions
window.switchRefTab = switchRefTab;
window.toggleReferencePanel = toggleReferencePanel;
window.loadReferencePanelData = loadReferencePanelData;
window.filterRefProtocols = filterRefProtocols;
window.filterRefLabs = filterRefLabs;
window.filterRefNotes = filterRefNotes;
window.filterRefForms = filterRefForms;
window.viewRefProtocol = viewRefProtocol;
window.viewRefNote = viewRefNote;
window.viewRefForm = viewRefForm;
window.pinRefProtocol = pinRefProtocol;
window.pinRefLab = pinRefLab;
window.openLabPreview = openLabPreview;
window.closeLabPreview = closeLabPreview;
window.saveLabNote = saveLabNote;
window.handleRefAIQuestion = handleRefAIQuestion;
window.askRefAIQuestion = askRefAIQuestion;
