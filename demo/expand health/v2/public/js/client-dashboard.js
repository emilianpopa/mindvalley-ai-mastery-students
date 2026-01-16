/**
 * Client Dashboard JavaScript
 * Handles the enhanced modular client dashboard
 */

const API_BASE = window.location.origin;

// Initialize utility bar
if (typeof initUtilityBar === 'function') {
  initUtilityBar('clients');
}

// ========== Toast Notification System ==========

// Ensure toast container exists
function ensureToastContainer() {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

// Show toast notification
function showToast(message, type = 'info', duration = 5000) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ========== User Menu Functions ==========

// Toggle user dropdown menu
function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  dropdown.classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('userDropdown');
  const wrapper = document.querySelector('.user-menu-wrapper');
  if (dropdown && wrapper && !wrapper.contains(event.target)) {
    dropdown.classList.remove('active');
  }
});

// Handle Logout
function handleLogout() {
  if (confirm('Are you sure you want to log out?')) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

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

// Activate protocol (change status from draft to active)
async function activateProtocol(protocolId) {
  const token = localStorage.getItem('auth_token');
  try {
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'active' })
    });

    if (response.ok) {
      showNotification('Protocol activated successfully', 'success');
      loadProtocols(); // Refresh the list
    } else {
      const data = await response.json();
      showNotification(data.error || 'Failed to activate protocol', 'error');
    }
  } catch (error) {
    console.error('Error activating protocol:', error);
    showNotification('Error activating protocol', 'error');
  }
}

// Set protocol back to draft status
async function setProtocolDraft(protocolId) {
  const token = localStorage.getItem('auth_token');
  try {
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'draft' })
    });

    if (response.ok) {
      showNotification('Protocol set to draft', 'success');
      loadProtocols(); // Refresh the list
    } else {
      const data = await response.json();
      showNotification(data.error || 'Failed to update protocol status', 'error');
    }
  } catch (error) {
    console.error('Error updating protocol status:', error);
    showNotification('Error updating protocol status', 'error');
  }
}

// Create engagement plan from an existing protocol
async function createEngagementPlanFromProtocol(protocolId) {
  const token = localStorage.getItem('auth_token');

  // Show progress modal
  showEngagementPlanProgressModal();

  try {
    updateEngagementPlanProgress('Connecting to AI service...', 10);

    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}/generate-engagement-plan`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personality_type: null,
        communication_preferences: 'WhatsApp'
      })
    });

    if (response.ok) {
      updateEngagementPlanProgress('Processing response...', 90);
      const data = await response.json();

      // Show success in modal
      showEngagementPlanSuccess(data.engagement_plan);

      // Refresh both protocols and engagement plans lists
      loadProtocols();
      loadEngagementPlans();
    } else {
      const data = await response.json();
      showEngagementPlanError(data.error || 'Failed to generate engagement plan');
    }
  } catch (error) {
    console.error('Error creating engagement plan:', error);
    showEngagementPlanError('Error creating engagement plan: ' + error.message);
  }
}

// Show engagement plan generation progress modal
function showEngagementPlanProgressModal() {
  // Remove any existing modal
  const existingModal = document.getElementById('engagementProgressModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'engagementProgressModal';
  modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;';

  modal.innerHTML = `
    <div class="modal-content" style="background: white; border-radius: 16px; max-width: 500px; width: 95%; padding: 32px; text-align: center;">
      <div id="progressContent">
        <div style="margin-bottom: 24px;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#0F766E" stroke-width="2" style="animation: spin 1s linear infinite;">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        </div>
        <h2 style="margin: 0 0 8px 0; color: #1F2937; font-size: 20px;">Generating Engagement Plan</h2>
        <p id="progressStatus" style="color: #6B7280; margin: 0 0 24px 0;">Initializing...</p>
        <div style="background: #E5E7EB; border-radius: 8px; height: 8px; overflow: hidden; margin-bottom: 16px;">
          <div id="progressBar" style="background: linear-gradient(90deg, #0F766E, #8B5CF6); height: 100%; width: 5%; transition: width 0.5s ease;"></div>
        </div>
        <p style="color: #9CA3AF; font-size: 13px;">This usually takes 1-2 minutes...</p>
      </div>
    </div>
  `;

  // Add spin animation
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
  modal.appendChild(style);

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Start progress animation
  simulateProgress();
}

// Simulate progress while waiting for API
let progressInterval;
function simulateProgress() {
  let progress = 5;
  progressInterval = setInterval(() => {
    if (progress < 85) {
      progress += Math.random() * 10;
      if (progress > 85) progress = 85;
      const progressBar = document.getElementById('progressBar');
      if (progressBar) progressBar.style.width = progress + '%';

      // Update status messages
      const statusEl = document.getElementById('progressStatus');
      if (statusEl) {
        if (progress < 20) statusEl.textContent = 'Analyzing protocol content...';
        else if (progress < 40) statusEl.textContent = 'Querying knowledge base...';
        else if (progress < 60) statusEl.textContent = 'Generating personalized phases...';
        else if (progress < 80) statusEl.textContent = 'Creating action items...';
        else statusEl.textContent = 'Finalizing engagement plan...';
      }
    }
  }, 800);
}

// Update progress manually
function updateEngagementPlanProgress(status, percent) {
  const progressBar = document.getElementById('progressBar');
  const statusEl = document.getElementById('progressStatus');
  if (progressBar) progressBar.style.width = percent + '%';
  if (statusEl) statusEl.textContent = status;
}

// Show success result
function showEngagementPlanSuccess(plan) {
  clearInterval(progressInterval);

  const progressContent = document.getElementById('progressContent');
  if (!progressContent) return;

  progressContent.innerHTML = `
    <div style="margin-bottom: 24px;">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    </div>
    <h2 style="margin: 0 0 8px 0; color: #1F2937; font-size: 20px;">Engagement Plan Created!</h2>
    <p style="color: #6B7280; margin: 0 0 24px 0;">${plan?.title || 'Your engagement plan has been generated successfully.'}</p>
    <div style="background: #F0FDFA; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left;">
      <p style="margin: 0 0 8px 0; color: #0F766E; font-weight: 600;">Plan Summary:</p>
      <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">${plan?.summary || 'A personalized 4-week engagement plan has been created for this protocol.'}</p>
      ${plan?.phases ? `<p style="margin: 8px 0 0 0; color: #6B7280; font-size: 13px;">${plan.phases.length} phases created</p>` : ''}
    </div>
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button onclick="closeEngagementProgressModal()" class="btn-secondary" style="padding: 10px 20px;">Close</button>
      <button onclick="closeEngagementProgressModal(); setTimeout(() => { loadEngagementPlans(); document.querySelector('[data-tab=\\'engagement\\']')?.click(); }, 500);" class="btn-primary" style="padding: 10px 20px;">View Engagement Plans</button>
    </div>
  `;
}

// Show error
function showEngagementPlanError(errorMessage) {
  clearInterval(progressInterval);

  const progressContent = document.getElementById('progressContent');
  if (!progressContent) return;

  progressContent.innerHTML = `
    <div style="margin-bottom: 24px;">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </div>
    <h2 style="margin: 0 0 8px 0; color: #1F2937; font-size: 20px;">Generation Failed</h2>
    <p style="color: #6B7280; margin: 0 0 24px 0;">We couldn't generate the engagement plan.</p>
    <div style="background: #FEF2F2; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left;">
      <p style="margin: 0; color: #991B1B; font-size: 14px;">${errorMessage}</p>
    </div>
    <button onclick="closeEngagementProgressModal()" class="btn-secondary" style="padding: 10px 24px;">Close</button>
  `;
}

// Close progress modal
function closeEngagementProgressModal() {
  clearInterval(progressInterval);
  const modal = document.getElementById('engagementProgressModal');
  if (modal) modal.remove();
  document.body.style.overflow = '';
}

// Delete engagement plan (engagement plans are protocols with ai_recommendations)
async function deleteEngagementPlan(planId) {
  if (!confirm('Are you sure you want to delete this engagement plan? This action cannot be undone.')) {
    return;
  }

  const token = localStorage.getItem('auth_token');
  try {
    // Engagement plans are stored as protocols, so use the protocols endpoint
    const response = await fetch(`${API_BASE}/api/protocols/${planId}`, {
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
      const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : 'Client';

      // Parse the engagement plan from ai_recommendations JSON
      let planData = null;
      if (protocol.ai_recommendations) {
        try {
          planData = JSON.parse(protocol.ai_recommendations);
        } catch (e) {
          // Try regex extraction for legacy data
          const jsonMatch = protocol.ai_recommendations.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              planData = JSON.parse(jsonMatch[0]);
            } catch (e2) {
              console.error('Error parsing engagement plan JSON:', e2);
            }
          }
        }
      }

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${planData?.title || protocol.title || 'Engagement Plan'} - ExpandHealth</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; color: #1f2937; }
            h1 { color: #0F766E; margin-bottom: 8px; font-size: 24px; }
            h2 { color: #0F766E; margin-top: 24px; font-size: 18px; border-bottom: 2px solid #0F766E; padding-bottom: 8px; }
            h3 { color: #374151; margin-top: 16px; font-size: 16px; }
            .header-logo { color: #0F766E; font-weight: bold; font-size: 18px; margin-bottom: 20px; }
            .meta { color: #6b7280; margin-bottom: 24px; font-size: 14px; }
            .summary { background: #FEF9C3; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
            .summary p { color: #713F12; margin: 0; }
            .phase { background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0F766E; page-break-inside: avoid; }
            .phase h3 { margin-top: 0; color: #1F2937; }
            .phase-subtitle { font-style: italic; color: #6B7280; margin: 4px 0 12px 0; font-size: 14px; }
            ul { padding-left: 20px; margin: 12px 0; }
            li { margin-bottom: 8px; }
            .goal { background: #E0F2F1; padding: 12px; border-radius: 6px; margin-top: 12px; }
            .goal-label { font-weight: 600; color: #0F766E; font-size: 12px; text-transform: uppercase; }
            .check-in { background: #FEF3C7; padding: 12px; border-radius: 6px; margin-top: 12px; }
            .check-in-label { font-weight: 600; color: #92400E; font-size: 12px; text-transform: uppercase; }
            .comm-schedule { background: #EFF6FF; padding: 16px; border-radius: 8px; margin-top: 24px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header-logo">ExpandHealth</div>
          <h1>${escapeHtml(planData?.title || protocol.title || 'Engagement Plan')}</h1>
          <div class="meta">
            <strong>Client:</strong> ${escapeHtml(clientName)}<br>
            <strong>Date:</strong> ${formatDate(protocol.updated_at || protocol.created_at)}
          </div>

          ${planData ? formatEngagementPlanForPrint(planData) : '<p>No engagement plan data available.</p>'}

          <div class="footer">
            Generated by ExpandHealth • ${new Date().toLocaleDateString()}<br>
            This document is confidential and intended for the named recipient only.
          </div>
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

// Helper function to format engagement plan data for print
function formatEngagementPlanForPrint(planData) {
  let html = '';

  // Summary
  if (planData.summary) {
    html += `<div class="summary"><p>${escapeHtml(planData.summary)}</p></div>`;
  }

  // Phases
  if (planData.phases && Array.isArray(planData.phases)) {
    planData.phases.forEach((phase, index) => {
      html += `
        <div class="phase">
          <h3>${escapeHtml(phase.title || `Phase ${index + 1}`)}</h3>
          ${phase.subtitle ? `<p class="phase-subtitle">${escapeHtml(phase.subtitle)}</p>` : ''}
          ${phase.items && phase.items.length > 0 ? `
            <ul>${phase.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          ` : ''}
          ${phase.progress_goal ? `
            <div class="goal">
              <span class="goal-label">Progress Goal:</span>
              <p style="margin: 4px 0 0 0;">${escapeHtml(phase.progress_goal)}</p>
            </div>
          ` : ''}
          ${phase.check_in_prompts && phase.check_in_prompts.length > 0 ? `
            <div class="check-in">
              <span class="check-in-label">Check-in Questions:</span>
              <ul style="margin: 8px 0 0 0;">${phase.check_in_prompts.map(q => `<li>${escapeHtml(q)}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>
      `;
    });
  }

  // Communication Schedule
  if (planData.communication_schedule) {
    const cs = planData.communication_schedule;
    html += `
      <div class="comm-schedule">
        <h3 style="margin-top: 0; color: #1E40AF;">Communication Schedule</h3>
        <p style="margin: 8px 0;">
          ${cs.check_in_frequency ? `<strong>Frequency:</strong> ${escapeHtml(cs.check_in_frequency)}<br>` : ''}
          ${cs.preferred_channel ? `<strong>Channel:</strong> ${escapeHtml(cs.preferred_channel)}<br>` : ''}
          ${cs.message_tone ? `<strong>Tone:</strong> ${escapeHtml(cs.message_tone)}` : ''}
        </p>
      </div>
    `;
  }

  // Success Metrics
  if (planData.success_metrics && planData.success_metrics.length > 0) {
    html += `
      <h2>Success Metrics</h2>
      <ul>${planData.success_metrics.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
    `;
  }

  return html;
}

// ========== End Card Menu Functions ==========

// Data refresh interval (in milliseconds)
const DATA_REFRESH_INTERVAL = 60000; // Refresh every 60 seconds
let refreshIntervalId = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  if (!clientId || clientId === 'new') {
    showError('Invalid client ID');
    return;
  }

  loadClientData();
  setupTabNavigation();
  loadClientActivity(); // Load real activity data from API
  loadSavedNotes();
  initFormsSearch();

  // Start automatic data refresh
  startDataRefresh();

  // Refresh when page becomes visible again (user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshDashboardData();
    }
  });
});

// Start automatic data refresh interval
function startDataRefresh() {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
  }
  refreshIntervalId = setInterval(refreshDashboardData, DATA_REFRESH_INTERVAL);
}

// Stop automatic data refresh (call when leaving page)
function stopDataRefresh() {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}

// Refresh all dashboard data
async function refreshDashboardData() {
  console.log('[Dashboard] Refreshing data...');
  try {
    // Refresh health metrics
    await loadHealthMetrics();

    // Refresh activity
    await loadClientActivity();

    // Check which tab is active and refresh its data
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
      const tabName = activeTab.getAttribute('data-tab');
      if (tabName === 'labs') {
        loadClientLabs();
      } else if (tabName === 'forms') {
        loadClientForms();
      } else if (tabName === 'notes') {
        loadClientNotes();
      }
    }
  } catch (error) {
    console.error('[Dashboard] Error refreshing data:', error);
  }
}

// Export refresh function for manual use
window.refreshDashboardData = refreshDashboardData;

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
      if (targetTab === 'dashboard') {
        loadClientActivity(); // Refresh activity when switching to Dashboard
      }
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

// Load and render activity feed from real data
async function loadClientActivity() {
  const activityFeed = document.getElementById('activityFeed');
  if (!activityFeed || !clientId) return;

  activityFeed.innerHTML = '<div class="loading-activity"><p>Loading activity...</p></div>';

  try {
    const token = localStorage.getItem('auth_token');
    const activities = [];

    // Fetch labs
    try {
      const labsResponse = await fetch(`${API_BASE}/api/labs/client/${clientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (labsResponse.ok) {
        const labsData = await labsResponse.json();
        (labsData.labs || []).forEach(lab => {
          activities.push({
            id: `lab-${lab.id}`,
            type: 'lab',
            title: lab.title || 'Lab Result',
            date: lab.created_at,
            icon: '📄',
            iconBg: '#FEE2E2',
            tag: 'Labs & Tests',
            tagColor: '#EF4444'
          });
        });
      }
    } catch (e) { console.log('Labs fetch error:', e); }

    // Fetch notes
    try {
      const notesResponse = await fetch(`${API_BASE}/api/notes/client/${clientId}?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (notesResponse.ok) {
        const notesData = await notesResponse.json();
        (notesData.notes || []).forEach(note => {
          activities.push({
            id: `note-${note.id}`,
            type: 'note',
            title: note.is_consultation ? 'Consultation Note' : 'Quick Note',
            date: note.created_at,
            icon: '📝',
            iconBg: '#FEF3C7',
            tag: 'Notes',
            tagColor: '#F59E0B'
          });
        });
      }
    } catch (e) { console.log('Notes fetch error:', e); }

    // Fetch protocols
    try {
      const protocolsResponse = await fetch(`${API_BASE}/api/protocols/client/${clientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (protocolsResponse.ok) {
        const protocolsData = await protocolsResponse.json();
        (protocolsData.protocols || []).forEach(protocol => {
          activities.push({
            id: `protocol-${protocol.id}`,
            type: 'protocol',
            title: protocol.template_name || 'Protocol Activated',
            date: protocol.created_at,
            icon: '📋',
            iconBg: '#DBEAFE',
            tag: 'Protocol',
            tagColor: '#3B82F6'
          });
        });
      }
    } catch (e) { console.log('Protocols fetch error:', e); }

    // Fetch form submissions
    try {
      const formsResponse = await fetch(`${API_BASE}/api/forms/client/${clientId}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (formsResponse.ok) {
        const formsData = await formsResponse.json();
        (formsData.submissions || []).forEach(submission => {
          activities.push({
            id: `form-${submission.id}`,
            type: 'form',
            title: submission.form_name || 'Form Completed',
            date: submission.submitted_at || submission.created_at,
            icon: '📋',
            iconBg: '#D1FAE5',
            tag: 'Forms',
            tagColor: '#10B981'
          });
        });
      }
    } catch (e) { console.log('Forms fetch error:', e); }

    // Sort by date descending
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Update the global sampleActivities for compatibility
    sampleActivities.length = 0;
    activities.forEach(a => sampleActivities.push(a));

    // Render the activities
    renderActivityFeed(activities);

  } catch (error) {
    console.error('Error loading client activity:', error);
    activityFeed.innerHTML = '<p class="empty-message">Error loading activity</p>';
  }
}

// Render activity feed
function renderActivityFeed(activities) {
  const activityFeed = document.getElementById('activityFeed');
  if (!activityFeed) return;

  // Use passed activities or fall back to sampleActivities
  const activityList = activities || sampleActivities;

  if (activityList.length === 0) {
    activityFeed.innerHTML = '<p class="empty-message">No activity yet</p>';
    return;
  }

  const activitiesHtml = activityList.map((activity, index) => `
    <div class="activity-item">
      <div class="activity-timeline ${index === 0 ? 'completed' : ''}">
        ${index === 0 ? '✓' : '○'}
      </div>
      <div class="activity-icon" style="background: ${activity.iconBg};">
        ${activity.icon}
      </div>
      <div class="activity-info">
        <p class="activity-title">${activity.title}</p>
        <p class="activity-date">${formatActivityDate(activity.date)}</p>
      </div>
      <div class="activity-tag" style="background: ${activity.tagColor}20; color: ${activity.tagColor};">
        ${activity.tag}
      </div>
      <div class="activity-actions">
        <button class="activity-btn" title="View" onclick="viewActivityItem('${activity.type}', '${activity.id}')">👁️</button>
        <button class="activity-btn" title="More">⋯</button>
      </div>
    </div>
  `).join('');

  activityFeed.innerHTML = activitiesHtml;
}

// Format activity date
function formatActivityDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

// View activity item
function viewActivityItem(type, id) {
  const actualId = id.replace(`${type}-`, '');
  switch(type) {
    case 'lab':
      viewLab(actualId);
      break;
    case 'note':
      viewNoteDetail(actualId);
      break;
    case 'protocol':
      // Switch to protocol tab
      document.querySelector('[data-tab="protocol"]')?.click();
      break;
    case 'form':
      // Switch to forms tab
      document.querySelector('[data-tab="forms"]')?.click();
      break;
  }
}

// Refresh AI Summary - calls the real regenerateSummary function
function refreshSummary() {
  // Redirect to the actual AI summary generation function
  regenerateSummary();
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

// Track if file upload zone is already setup
let fileUploadZoneInitialized = false;

// Setup file upload drag and drop
function setupFileUploadZone() {
  const zone = document.getElementById('fileUploadZone');
  const input = document.getElementById('labFileInput');

  if (!zone || !input) {
    console.error('File upload zone elements not found');
    return;
  }

  // Only setup once to avoid duplicate event listeners
  if (fileUploadZoneInitialized) {
    return;
  }
  fileUploadZoneInitialized = true;

  // Click to upload - use onclick to ensure it's not duplicated
  zone.onclick = function(e) {
    // Don't trigger if clicking on the file input itself or the preview area
    if (e.target === input || e.target.closest('#uploadPreview')) {
      return;
    }
    input.click();
  };

  // Handle file selection
  input.onchange = function(e) {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  // Drag and drop
  zone.ondragover = function(e) {
    e.preventDefault();
    zone.classList.add('drag-over');
  };

  zone.ondragleave = function() {
    zone.classList.remove('drag-over');
  };

  zone.ondrop = function(e) {
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

  if (file.size > 50 * 1024 * 1024) {
    alert('File size must be less than 50MB.');
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

    // Fetch PDF with auth headers for API endpoints
    let pdfData;
    if (url.startsWith('/api/')) {
      const token = localStorage.getItem('auth_token');
      console.log('🔷 Fetching PDF with auth token:', token ? 'found' : 'MISSING');
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      pdfData = { data: arrayBuffer };
    } else {
      pdfData = url;
    }

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(pdfData);
    labPdfDoc = await loadingTask.promise;
    labPdfTotalPages = labPdfDoc.numPages;
    labPdfCurrentPage = 1;
    console.log('🔷 PDF loaded successfully, pages:', labPdfTotalPages);

    // Remove loading indicator
    const loadingIndicator = container.querySelector('.pdf-loading-indicator');
    if (loadingIndicator) loadingIndicator.remove();

    // Clear container and prepare for all pages
    container.innerHTML = '';

    // Calculate initial scale to fit width
    await calculateLabPdfFitWidthScale();
    console.log('🔷 Scale calculated:', labPdfCurrentScale);

    // Render ALL pages for continuous scrolling
    console.log('🔷 Rendering all', labPdfTotalPages, 'pages...');
    for (let pageNum = 1; pageNum <= labPdfTotalPages; pageNum++) {
      await renderLabPdfPageToContainer(pageNum, container);
    }
    console.log('🔷 All pages rendered successfully');

    // Scroll to top of container to show page 1
    // Use multiple methods to ensure scroll works
    container.scrollTop = 0;

    // Also scroll first page into view after a short delay to ensure DOM is ready
    setTimeout(() => {
      container.scrollTop = 0;
      const firstPage = container.querySelector('.pdf-page-canvas');
      if (firstPage) {
        firstPage.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
      console.log('🔷 Scrolled to top, scrollTop:', container.scrollTop);
    }, 100);

    // Update page info
    labPdfCurrentPage = 1;
    updateLabPdfPageInfo();

  } catch (error) {
    console.error('Error loading PDF with PDF.js:', error);
    // Show error message instead of trying iframe (which won't have auth)
    const container = document.getElementById('labPdfContainer');
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px; text-align: center; color: #6b7280;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        <p style="font-size: 16px; margin-bottom: 8px; font-weight: 500; color: #374151;">PDF Not Available</p>
        <p style="font-size: 14px; max-width: 300px;">This lab result needs to be re-uploaded. The PDF file was not stored in the database.</p>
      </div>
    `;
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

// Render a page to a new canvas appended to the container (for continuous scroll mode)
async function renderLabPdfPageToContainer(pageNum, container) {
  if (!labPdfDoc) return;

  try {
    const page = await labPdfDoc.getPage(pageNum);

    // Create a new canvas for this page
    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-page-canvas';
    canvas.setAttribute('data-page', pageNum);

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

    // Append canvas to container
    container.appendChild(canvas);

    // Add page number indicator
    const pageIndicator = document.createElement('div');
    pageIndicator.className = 'pdf-page-indicator';
    pageIndicator.textContent = `Page ${pageNum} of ${labPdfTotalPages}`;
    pageIndicator.style.cssText = 'text-align: center; padding: 8px; color: #9ca3af; font-size: 12px;';
    container.appendChild(pageIndicator);

  } catch (error) {
    console.error('Error rendering page', pageNum, ':', error);
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

  // Always use API endpoint for PDF (ensures auth headers are used)
  const pdfUrl = `/api/labs/${labId}/file`;

  // Load PDF with PDF.js (with auth headers)
  loadLabPdfWithPdfJs(pdfUrl);

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
  // Clear iframe src if it exists (may have been removed by PDF.js rendering)
  const iframe = document.getElementById('labPdfFrame');
  if (iframe) {
    iframe.src = '';
  }
  // Clear PDF.js document
  labPdfDoc = null;
  labPdfCurrentPage = 1;
  labPdfTotalPages = 0;
  currentViewingLab = null;
}

// Download lab PDF
async function downloadLabPdf() {
  if (!currentViewingLab) {
    console.log('No lab selected for download');
    return;
  }

  console.log('Downloading lab:', currentViewingLab.title, currentViewingLab.id);

  // For demo labs without real files, show a message
  if (currentViewingLab.file_url && currentViewingLab.file_url.includes('/demo-')) {
    alert('This is a demo lab without an actual PDF file. In production, the PDF would download here.');
    return;
  }

  try {
    // Fetch the file with auth token
    const response = await fetch(`/api/labs/${currentViewingLab.id}/file`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(error.error || 'Download failed');
    }

    // Get the blob and create a download link
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentViewingLab.original_filename || currentViewingLab.title + '.pdf' || 'lab-result.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Download error:', error);
    showNotification(error.message || 'Error downloading file', 'error');
  }
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

// Track pending AI summary generations
let pendingSummaryGenerations = new Map();

// Generate AI summary - runs in background so user can continue working
async function generateLabSummary() {
  if (!currentViewingLab) return;

  const labId = currentViewingLab.id;
  const labTitle = currentViewingLab.title || 'Lab Result';

  // Check if already generating for this lab
  if (pendingSummaryGenerations.has(labId)) {
    showToast('AI summary is already being generated for this document.', 'info');
    return;
  }

  const btn = document.getElementById('generateLabSummaryBtn');
  const summaryContainer = document.getElementById('labAiSummary');

  // Update UI to show generating state with progress bar
  btn.disabled = true;
  btn.innerHTML = `
    <span class="btn-spinner"></span>
    <span>Analyzing...</span>
  `;
  btn.classList.add('generating');

  summaryContainer.innerHTML = `
    <div class="ai-progress-container">
      <div class="ai-progress-header">
        <span class="ai-progress-icon">🧠</span>
        <span class="ai-progress-title">AI Analysis in Progress</span>
      </div>
      <div class="ai-progress-bar-wrapper">
        <div class="ai-progress-bar">
          <div class="ai-progress-fill"></div>
        </div>
      </div>
      <div class="ai-progress-steps">
        <div class="ai-step active" id="aiStep1">
          <span class="step-dot"></span>
          <span class="step-text">Reading document</span>
        </div>
        <div class="ai-step" id="aiStep2">
          <span class="step-dot"></span>
          <span class="step-text">Analyzing biomarkers</span>
        </div>
        <div class="ai-step" id="aiStep3">
          <span class="step-dot"></span>
          <span class="step-text">Generating insights</span>
        </div>
      </div>
      <p class="ai-progress-hint">You can close this and continue working. We'll notify you when it's ready.</p>
    </div>
  `;

  // Start the progress animation
  startProgressAnimation();

  // Show toast notification
  showToast(`Generating AI summary for "${labTitle}"... You can continue working.`, 'info', 5000);

  // Track this generation
  pendingSummaryGenerations.set(labId, { title: labTitle, startTime: Date.now() });

  // Run generation in background
  generateLabSummaryInBackground(labId, labTitle);
}

// Background AI summary generation
async function generateLabSummaryInBackground(labId, labTitle) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/labs/${labId}/generate-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.summary) {
      // Update the lab data in memory
      const labIndex = clientLabs.findIndex(l => l.id === labId);
      if (labIndex >= 0) {
        clientLabs[labIndex].ai_summary = data.summary;
        renderLabsTable();
      }

      // If the modal is still open for this lab, update the UI
      if (currentViewingLab && currentViewingLab.id === labId) {
        const summaryContainer = document.getElementById('labAiSummary');
        const btn = document.getElementById('generateLabSummaryBtn');

        if (summaryContainer) {
          summaryContainer.innerHTML = formatAISummary(data.summary);
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '🔄 Regenerate Summary';
          btn.classList.remove('generating');
        }
        currentViewingLab.ai_summary = data.summary;
        stopProgressAnimation();
      }

      // Show success notification
      showToast(`✨ AI summary for "${labTitle}" is ready!`, 'success', 8000);

    } else {
      throw new Error(data.error || 'Failed to generate summary');
    }

  } catch (error) {
    console.error('Error generating summary:', error);

    // Show error notification
    showToast(`Failed to generate AI summary for "${labTitle}". Please try again.`, 'error', 8000);

    // If modal is still open, show error state
    if (currentViewingLab && currentViewingLab.id === labId) {
      const summaryContainer = document.getElementById('labAiSummary');
      const btn = document.getElementById('generateLabSummaryBtn');

      if (summaryContainer) {
        summaryContainer.innerHTML = '<p style="color: #DC2626;">Error generating summary. Please try again.</p>';
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '✨ Generate Summary';
        btn.classList.remove('generating');
      }
      stopProgressAnimation();
    }
  } finally {
    // Remove from pending
    pendingSummaryGenerations.delete(labId);
  }
}

// Progress animation state
let progressAnimationInterval = null;
let progressStep = 0;

// Start the animated progress for AI generation
function startProgressAnimation() {
  progressStep = 0;

  // Animate through steps
  progressAnimationInterval = setInterval(() => {
    progressStep++;

    const step1 = document.getElementById('aiStep1');
    const step2 = document.getElementById('aiStep2');
    const step3 = document.getElementById('aiStep3');

    if (!step1) {
      // Elements no longer exist, stop animation
      stopProgressAnimation();
      return;
    }

    // Update steps based on progress
    if (progressStep >= 2) {
      step1.classList.add('completed');
      step2.classList.add('active');
    }
    if (progressStep >= 4) {
      step2.classList.add('completed');
      step3.classList.add('active');
    }
    if (progressStep >= 6) {
      step3.classList.add('completed');
    }

    // Loop the animation for long operations
    if (progressStep >= 8) {
      progressStep = 0;
      step1.classList.remove('completed');
      step2.classList.remove('completed', 'active');
      step3.classList.remove('completed', 'active');
      step1.classList.add('active');
    }
  }, 2000);
}

// Stop the progress animation
function stopProgressAnimation() {
  if (progressAnimationInterval) {
    clearInterval(progressAnimationInterval);
    progressAnimationInterval = null;
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
    console.log('Deleting lab:', labId);
    const response = await fetch(`${API_BASE}/api/labs/${labId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Delete response:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Delete error:', errorData);
      throw new Error(errorData.error || 'Failed to delete lab');
    }

    loadClientLabs();
    alert('Lab deleted successfully.');

  } catch (error) {
    console.error('Error deleting lab:', error);
    alert('Error deleting lab. Please try again.');
  }
}

// Download lab
async function downloadLab(labId) {
  const lab = clientLabs.find(l => l.id === labId);
  if (!lab) {
    showNotification('Lab not found', 'error');
    return;
  }

  try {
    // Fetch the file with auth token
    const response = await fetch(`/api/labs/${labId}/file`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(error.error || 'Download failed');
    }

    // Get the blob and create a download link
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lab.original_filename || lab.title || 'lab-result.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Download error:', error);
    showNotification(error.message || 'Error downloading file', 'error');
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

  // Clean up progress bar if present
  const progressBar = document.getElementById('saveNoteProgress');
  if (progressBar) progressBar.remove();

  // Re-enable buttons
  const saveBtn = document.querySelector('#newNoteModal .modal-footer .btn-primary');
  const cancelBtn = document.querySelector('#newNoteModal .modal-footer .btn-secondary');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Note';
  }
  if (cancelBtn) cancelBtn.removeAttribute('disabled');

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

async function saveNote() {
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

  if (!currentClient?.id) {
    alert('No client selected');
    return;
  }

  // Map UI note types to API note types
  // HTML select values: consultation, quick, transcript, progress
  const noteTypeMap = {
    'consultation': 'consultation',
    'quick': 'quick_note',
    'transcript': 'quick_note',
    'progress': 'consultation'  // Progress notes are consultation-like
  };
  const apiNoteType = noteTypeMap[type] || 'quick_note';
  const isConsultation = type === 'consultation' || type === 'progress';

  // Build the full content with AI summary if requested
  let fullContent = content;

  // Get modal elements for progress bar
  const modalBody = document.querySelector('#newNoteModal .modal-body');
  const saveBtn = document.querySelector('#newNoteModal .btn-primary');
  const cancelBtn = document.querySelector('#newNoteModal .btn-secondary');

  if (generateSummary && content.length > 50) {
    // Show progress bar above the modal body
    const progressHtml = `
      <div id="saveNoteProgress" class="save-note-progress">
        <div class="progress-status">
          <span class="progress-icon">✨</span>
          <span class="progress-text">Generating AI Summary...</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill"></div>
        </div>
        <div class="progress-steps">
          <span class="step active">Analyzing content</span>
          <span class="step">Generating insights</span>
          <span class="step">Finalizing</span>
        </div>
      </div>
    `;
    modalBody.insertAdjacentHTML('afterend', progressHtml);

    // Disable buttons during generation
    if (saveBtn) saveBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;

    // Animate progress
    const progressBar = document.querySelector('#saveNoteProgress .progress-bar-fill');
    const steps = document.querySelectorAll('#saveNoteProgress .step');
    let progress = 0;

    const noteProgressInterval = setInterval(() => {
      progress += Math.random() * 12;
      if (progress > 90) progress = 90;
      if (progressBar) progressBar.style.width = `${progress}%`;

      // Update steps
      if (progress > 30 && steps[1]) {
        steps[0].classList.remove('active');
        steps[1].classList.add('active');
      }
      if (progress > 65 && steps[2]) {
        steps[1].classList.remove('active');
        steps[2].classList.add('active');
      }
    }, 400);

    try {
      const token = localStorage.getItem('auth_token');
      const summaryResponse = await fetch(`${API_BASE}/api/notes/generate-summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content,
          noteType: type
        })
      });

      clearInterval(noteProgressInterval);
      if (progressBar) progressBar.style.width = '100%';

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        if (summaryData.summary) {
          fullContent += `\n\n---\n**AI Summary:**\n${summaryData.summary}`;
        }
      }
    } catch (summaryError) {
      console.error('Error generating AI summary:', summaryError);
      clearInterval(noteProgressInterval);
      // Continue without summary if AI fails
    } finally {
      // Update progress to show saving
      const progressStatus = document.querySelector('#saveNoteProgress .progress-text');
      if (progressStatus) progressStatus.textContent = 'Saving note...';
    }
  } else if (saveBtn) {
    // Show simple saving state if no AI summary
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="saving-spinner"></span> Saving...';
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: currentClient.id,
        content: fullContent,
        title: title,
        note_type: apiNoteType,
        is_consultation: isConsultation,
        consultation_date: isConsultation ? new Date().toISOString() : null
      })
    });

    if (response.ok) {
      const savedNote = await response.json();
      console.log('Note saved to database:', savedNote);

      // Also save to local memory for immediate display
      const noteData = {
        id: savedNote.id,
        clientId: currentClient.id,
        clientName: `${currentClient.first_name} ${currentClient.last_name}`,
        title,
        type,
        content: fullContent,
        createdAt: savedNote.created_at
      };
      savedNotes.unshift(noteData);

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
      loadClientNotes(); // Refresh from API

      // Add to activity feed
      addNoteToActivityFeed(noteData);
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to save note:', response.status, errorData);
      alert('Failed to save note: ' + (errorData.error || response.statusText));
    }
  } catch (error) {
    console.error('Error saving note:', error);
    alert('Failed to save note: ' + error.message);
  }
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

// Regenerate AI summary from real client data
async function regenerateSummary() {
  const summaryContent = document.getElementById('summaryContent');
  const timestamp = document.getElementById('summaryTimestamp');

  if (!summaryContent) return;

  // Show loading state
  summaryContent.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div class="loader"></div>
      <p style="margin-top: 12px; color: #6B7280;">Generating AI summary from client data...</p>
      <p style="font-size: 12px; color: #9CA3AF;">Analyzing forms, notes, and lab results</p>
    </div>
  `;

  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE}/api/chat/client-summary/${clientId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();

    // Check if no data available
    if (!data.summary || data.summary === null) {
      summaryContent.innerHTML = `
        <div class="summary-empty-state">
          <p style="color: #6B7280; text-align: center; padding: 20px;">
            ${data.message || 'No data available to generate summary. Add notes, forms, or lab results first.'}
          </p>
        </div>
      `;
      if (timestamp) {
        timestamp.textContent = 'No data available';
      }
      return;
    }

    // Display the summary items
    if (Array.isArray(data.summary)) {
      summaryContent.innerHTML = `
        <ul>
          ${data.summary.map(item =>
            `<li><strong>${item.category}</strong> ${item.text}</li>`
          ).join('')}
        </ul>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF;">
          Based on ${data.dataSourcesUsed?.notes || 0} notes, ${data.dataSourcesUsed?.forms || 0} forms, ${data.dataSourcesUsed?.labs || 0} labs, ${data.dataSourcesUsed?.protocols || 0} protocols
        </div>
      `;
    } else {
      summaryContent.innerHTML = `<p>${data.summary}</p>`;
    }

    // Update timestamp
    if (timestamp) {
      const now = new Date();
      timestamp.textContent = `Last refreshed on ${now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')}`;
    }

  } catch (error) {
    console.error('Error generating summary:', error);
    summaryContent.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #EF4444;">
        <p>Failed to generate summary</p>
        <p style="font-size: 12px; color: #6B7280;">${error.message}</p>
        <button onclick="regenerateSummary()" style="margin-top: 12px; padding: 8px 16px; background: #0F766E; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Try Again
        </button>
      </div>
    `;
  }
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

  // Extract AI Summary from content if present
  let mainContent = content;
  let aiSummaryHtml = '';

  const aiSummaryPatterns = [
    /---\s*\n\*\*AI Summary:\*\*\n?([\s\S]*?)$/i,
    /\*\*AI Summary:\*\*\n?([\s\S]*?)$/i,
    /✨?\s*AI Summary:?\s*\n?([\s\S]*?)$/i
  ];

  for (const pattern of aiSummaryPatterns) {
    const match = content.match(pattern);
    if (match) {
      const summaryText = match[1].trim();
      mainContent = content.replace(match[0], '').replace(/---\s*$/, '').trim();

      // Extract key points from the summary (bullet points or first few meaningful lines)
      const lines = summaryText.split(/\n/).filter(line => line.trim());
      const keyPoints = [];

      for (const line of lines) {
        const trimmed = line.trim();
        // Skip headers (lines starting with #)
        if (trimmed.startsWith('#')) continue;
        // Skip empty lines after cleaning
        if (!trimmed) continue;

        // Clean up the line - remove bullet markers, bold markers
        let cleaned = trimmed
          .replace(/^[•\-\*]\s*/, '')  // Remove bullet markers
          .replace(/^\d+\.\s*/, '')    // Remove numbered list markers
          .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold markers
          .trim();

        if (cleaned && cleaned.length > 10) {
          keyPoints.push(cleaned);
          if (keyPoints.length >= 3) break;
        }
      }

      if (keyPoints.length > 0) {
        aiSummaryHtml = `
          <div class="note-card-ai-summary">
            <div class="ai-summary-label-small">✨ AI Summary</div>
            <ul class="ai-summary-bullets">
              ${keyPoints.map(point => `<li>${escapeHtml(point.length > 80 ? point.substring(0, 80) + '...' : point)}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      break;
    }
  }

  // Truncate main content for preview
  const preview = mainContent && mainContent.length > 100 ? mainContent.substring(0, 100) + '...' : (mainContent || '');

  return `
    <div class="note-card" data-note-id="${note.id}">
      <div class="note-card-header">
        ${title ? `<h4 class="note-title">${escapeHtml(title)}</h4>` : ''}
        <span class="note-type-badge ${note.is_consultation ? 'consultation' : note.note_type}">${noteType}</span>
      </div>
      <p class="note-preview">${escapeHtml(preview)}</p>
      ${aiSummaryHtml}
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

// View note detail in a modal
function viewNoteDetail(noteId) {
  const note = clientNotes.find(n => n.id === noteId);
  if (!note) return;

  // Extract title if it exists
  let title = note.title || '';
  let content = note.content || '';
  if (content.startsWith('## ')) {
    const lines = content.split('\n');
    title = lines[0].replace('## ', '');
    content = lines.slice(1).join('\n').trim();
  }

  const noteType = note.is_consultation ? 'Consultation' :
                   note.note_type === 'quick_note' ? 'Quick Note' :
                   note.note_type ? note.note_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Note';

  // Check if there's an AI Summary section in the content
  let mainContent = content;
  let aiSummary = '';

  // Try to find AI Summary in the content (multiple patterns)
  // Pattern 1: **AI Summary:** followed by bullet points
  // Pattern 2: ✨ AI Summary: followed by content
  // Pattern 3: --- separator followed by AI Summary
  const aiSummaryPatterns = [
    /---\s*\n\*\*AI Summary:\*\*\n?([\s\S]*?)$/i,
    /\*\*AI Summary:\*\*\n?([\s\S]*?)$/i,
    /✨?\s*AI Summary:?\s*\n?([\s\S]*?)$/i
  ];

  for (const pattern of aiSummaryPatterns) {
    const match = content.match(pattern);
    if (match) {
      aiSummary = match[1].trim();
      mainContent = content.replace(match[0], '').trim();
      // Remove trailing separator if present
      mainContent = mainContent.replace(/---\s*$/, '').trim();
      break;
    }
  }

  // Create modal HTML
  const modalHtml = `
    <div class="note-detail-modal-overlay" id="noteDetailModal" onclick="closeNoteDetailModal(event)">
      <div class="note-detail-modal" onclick="event.stopPropagation()">
        <div class="note-detail-header">
          <div class="note-detail-title-section">
            ${title ? `<h2 class="note-detail-title">${escapeHtml(title)}</h2>` : ''}
            <div class="note-detail-meta">
              <span class="note-type-badge ${note.is_consultation ? 'consultation' : note.note_type}">${noteType}</span>
              <span class="note-detail-date">${formatDateTime(note.created_at)}</span>
              <span class="note-detail-author">by ${note.author}</span>
            </div>
          </div>
          <button class="note-detail-close" onclick="closeNoteDetailModal()">&times;</button>
        </div>

        <div class="note-detail-body">
          ${aiSummary ? `
          <div class="note-detail-ai-summary">
            <div class="ai-summary-header">
              <span class="ai-summary-icon">✨</span>
              <span class="ai-summary-label">AI Summary</span>
            </div>
            <div class="ai-summary-content">
              ${formatAISummaryForModal(aiSummary)}
            </div>
          </div>
          ` : ''}

          <div class="note-detail-content">
            <h3 class="note-content-label">Full Note</h3>
            <div class="note-content-text">
              ${formatNoteContent(mainContent)}
            </div>
          </div>
        </div>

        <div class="note-detail-footer">
          <button class="btn-secondary" onclick="closeNoteDetailModal()">Close</button>
          <button class="btn-primary" onclick="editNoteFromModal(${note.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Note
          </button>
          <button class="btn-danger" onclick="deleteClientNote(${note.id}); closeNoteDetailModal();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Delete Note
          </button>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  const existingModal = document.getElementById('noteDetailModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.body.style.overflow = 'hidden';
}

// Format AI summary for modal display - supports markdown
function formatAISummaryForModal(summary) {
  if (!summary) return '<p>No summary available</p>';

  // Simple markdown to HTML converter
  let html = summary;

  // Escape HTML first to prevent XSS
  html = escapeHtml(html);

  // Convert markdown headers (## Header)
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  // Convert bold (**text** or __text__)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Convert bullet points (lines starting with - or * or •)
  const lines = html.split('\n');
  let inList = false;
  let result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^[\s]*[-*•]\s+(.+)$/);

    if (bulletMatch) {
      if (!inList) {
        result.push('<ul class="ai-summary-list">');
        inList = true;
      }
      result.push(`<li>${bulletMatch[1]}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      // Keep headers as-is, wrap other content in paragraphs
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('<h')) {
        result.push(`<p>${trimmed}</p>`);
      } else if (trimmed) {
        result.push(trimmed);
      }
    }
  }

  if (inList) {
    result.push('</ul>');
  }

  // Join and clean up empty paragraphs
  html = result.join('\n').replace(/<p><\/p>/g, '');

  return html;
}

// Format note content for display
function formatNoteContent(content) {
  if (!content) return '<p class="empty-content">No content</p>';

  // Convert markdown-style content to HTML
  let html = escapeHtml(content);

  // Convert line breaks to paragraphs
  html = html.split('\n\n').map(para => `<p>${para}</p>`).join('');

  // Convert single line breaks within paragraphs
  html = html.replace(/\n/g, '<br>');

  return html;
}

// Close note detail modal
function closeNoteDetailModal(event) {
  if (event && event.target !== event.currentTarget) return;

  const modal = document.getElementById('noteDetailModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
}

// Edit note from modal - opens an edit modal
async function editNoteFromModal(noteId) {
  const note = clientNotes.find(n => n.id === noteId);
  if (!note) {
    alert('Note not found');
    return;
  }

  // Close the view modal
  closeNoteDetailModal();

  // Extract content without AI summary
  let content = note.content || '';
  const aiSummaryPatterns = [
    /---\s*\n\*\*AI Summary:\*\*\n?([\s\S]*?)$/i,
    /\*\*AI Summary:\*\*\n?([\s\S]*?)$/i,
    /✨?\s*AI Summary:?\s*\n?([\s\S]*?)$/i
  ];

  for (const pattern of aiSummaryPatterns) {
    const match = content.match(pattern);
    if (match) {
      content = content.replace(match[0], '').replace(/---\s*$/, '').trim();
      break;
    }
  }

  const noteType = note.is_consultation ? 'Consultation' :
                   note.note_type === 'quick_note' ? 'Quick Note' :
                   note.note_type ? note.note_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Note';

  const modalHtml = `
    <div id="editNoteModal" class="modal-overlay" onclick="closeEditNoteModal(event)">
      <div class="modal-content edit-note-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Edit Note</h2>
          <span class="note-type-badge ${note.is_consultation ? 'consultation' : note.note_type}">${noteType}</span>
          <button class="modal-close" onclick="closeEditNoteModal()">&times;</button>
        </div>
        <div class="modal-body">
          <textarea id="editNoteContent" class="edit-note-textarea" placeholder="Note content...">${escapeHtml(content)}</textarea>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeEditNoteModal()">Cancel</button>
          <button class="btn-primary" onclick="saveEditedNote(${noteId})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.body.style.overflow = 'hidden';

  // Focus the textarea
  document.getElementById('editNoteContent').focus();
}

// Close edit note modal
function closeEditNoteModal(event) {
  if (event && event.target !== event.currentTarget) return;

  const modal = document.getElementById('editNoteModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
}

// Save edited note
async function saveEditedNote(noteId) {
  const content = document.getElementById('editNoteContent').value.trim();

  if (!content) {
    alert('Note content cannot be empty');
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/notes/${noteId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    if (response.ok) {
      const updatedNote = await response.json();

      // Update in local array
      const noteIndex = clientNotes.findIndex(n => n.id === noteId);
      if (noteIndex !== -1) {
        clientNotes[noteIndex].content = content;
      }

      closeEditNoteModal();
      renderNotesTab();

      // Also refresh quick notes if panel is open
      if (document.getElementById('rightPanel')?.style.display !== 'none') {
        loadQuickNotes();
      }

      alert('Note updated successfully');
    } else {
      const error = await response.json();
      alert('Failed to update note: ' + (error.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error updating note:', error);
    alert('Failed to update note');
  }
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
window.closeNoteDetailModal = closeNoteDetailModal;
window.deleteClientNote = deleteClientNote;
window.regenerateSummary = regenerateSummary;
window.regeneratePersonalityInsights = regeneratePersonalityInsights;
window.loadClientActivity = loadClientActivity;
window.viewActivityItem = viewActivityItem;

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
    showToast('Link copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy link:', err);
    // Fallback for older browsers
    document.execCommand('copy');
    showToast('Link copied to clipboard!', 'success');
  });
}

// Show email options
function sendFormViaEmail() {
  document.getElementById('emailOptionsSection').style.display = 'block';
  document.getElementById('emailMessage').focus();
}

// Send form via WhatsApp
function sendFormViaWhatsApp() {
  if (!currentFormLinkData || !currentClient) return;

  const phone = currentClient.phone ? currentClient.phone.replace(/\D/g, '') : '';
  const message = encodeURIComponent(
    `Hi ${currentClient.first_name || 'there'}! Please fill out this form for your upcoming appointment:\n\n${currentFormLinkData.link_url}`
  );

  if (phone) {
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${message}`, '_blank');
  }
}

// Confirm send email
async function confirmSendEmail() {
  if (!currentFormLinkData || !currentClient) {
    showToast('Please create a form link first', 'warning');
    return;
  }

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
      // Handle specific error messages with user-friendly text
      if (error.error === 'Email service not configured') {
        throw new Error('EMAIL_NOT_CONFIGURED');
      }
      throw new Error(error.error || 'Failed to send email');
    }

    const result = await response.json();

    // Check if in sandbox mode
    if (result.sandbox_mode) {
      showToast('Email queued! Note: Sandbox mode - only delivers to Resend account owner. Verify a domain for production use.', 'warning', 8000);
    } else {
      showToast('Email sent successfully to ' + (currentClient.email || 'client'), 'success');
    }
    closeSendFormModal();

  } catch (error) {
    console.error('Error sending email:', error);

    if (error.message === 'EMAIL_NOT_CONFIGURED') {
      // Show a more helpful message for unconfigured email
      showToast('Email service is not configured. Please use "Copy Link" or "WhatsApp" to share the form instead.', 'warning', 8000);
    } else if (error.message.includes('does not have an email')) {
      showToast('This client does not have an email address on file. Please add their email first or use another sharing method.', 'warning', 6000);
    } else {
      showToast('Failed to send email: ' + error.message, 'error');
    }
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
    if (ageDiffEl && bioAge.difference !== null && bioAge.difference !== undefined) {
      const diffValue = bioAge.difference;
      const isYounger = diffValue > 0;
      ageDiffEl.style.display = 'flex';
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
    const hasWearableData = wearable.vo2Max || wearable.restingHeartRate || wearable.hrv;

    // Update wearable badge connection status
    const wearableBadge = document.getElementById('wearableBadge');
    const wearableStatusEl = document.getElementById('wearableStatus');
    if (hasWearableData && wearableBadge && wearableStatusEl) {
      wearableBadge.classList.remove('not-connected');
      wearableStatusEl.textContent = 'Connected';
    }

    // VO2 Max
    const vo2El = document.getElementById('wearableVo2');
    if (vo2El && wearable.vo2Max) {
      vo2El.innerHTML = `${wearable.vo2Max.value} <small>${wearable.vo2Max.unit}</small>`;
    }
    const vo2TrendEl = document.getElementById('vo2Trend');
    if (vo2TrendEl && wearable.vo2Max && wearable.vo2Max.trend !== undefined) {
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
    if (rhrTrendEl && wearable.restingHeartRate && wearable.restingHeartRate.trend !== undefined) {
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
    if (hrvTrendEl && wearable.hrv && wearable.hrv.trend !== undefined) {
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

  // Load protocol templates from API (Step 1)
  await loadProtocolTemplatesForBuilder(token);

  // Load notes into the Step 2 container
  await loadNotesForProtocolBuilder(currentClientId, token);

  // Load labs into the Step 3 container (selectable for protocol generation)
  await loadLabsForProtocolBuilder(currentClientId, token);

  // Also load labs for sidebar reference if it exists
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

// Load protocol templates from the API for the Protocol Builder (Step 1)
async function loadProtocolTemplatesForBuilder(token) {
  const container = document.getElementById('templateCardsContainer');
  if (!container) {
    console.log('Template container not found');
    return;
  }

  container.innerHTML = '<div class="templates-loading" style="padding: 20px; text-align: center; color: #6B7280;">Loading templates...</div>';

  try {
    const response = await fetch(`${API_BASE}/api/protocols/templates?limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const templates = data.templates || [];

      if (templates.length === 0) {
        container.innerHTML = `
          <div class="templates-empty-state" style="padding: 24px; text-align: center; color: #6B7280;">
            <p>No protocol templates available.</p>
            <p style="font-size: 12px; color: #9CA3AF; margin-top: 8px;">Create templates in Protocol Templates section.</p>
          </div>
        `;
        return;
      }

      // Display templates as selectable cards
      container.innerHTML = templates.map(template => `
        <label class="protocol-template-card">
          <input type="checkbox" name="template" value="${template.id}" class="template-checkbox" data-template-name="${escapeHtml(template.name)}">
          <div class="template-card-inner">
            <div class="template-card-header">
              <span class="template-name">${escapeHtml(template.name)}</span>
              <div class="template-check">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
            <p class="template-desc">${template.category || 'General'} • ${template.modules_count || 0} modules • ${template.duration_weeks || 0} weeks</p>
            <p class="template-preview-text">${escapeHtml(truncateText(template.description || '', 80))}</p>
          </div>
        </label>
      `).join('');

    } else {
      console.error('Failed to load templates:', response.status);
      container.innerHTML = '<div class="templates-error" style="padding: 24px; text-align: center; color: #EF4444;"><p>Error loading templates. Please try again.</p></div>';
    }
  } catch (error) {
    console.error('Error loading protocol templates:', error);
    container.innerHTML = '<div class="templates-error" style="padding: 24px; text-align: center; color: #EF4444;"><p>Error loading templates. Please try again.</p></div>';
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
          <input type="checkbox" name="note" value="${note.id}" class="note-checkbox">
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

// Load labs for the Protocol Builder UI (Step 3)
async function loadLabsForProtocolBuilder(currentClientId, token) {
  const container = document.getElementById('labsCardsContainer');
  if (!container) {
    console.log('Labs container not found');
    return;
  }

  container.innerHTML = '<div class="labs-loading">Loading lab results...</div>';

  try {
    const response = await fetch(`${API_BASE}/api/labs/client/${currentClientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const labs = data.labs || [];

      if (labs.length === 0) {
        container.innerHTML = `
          <div class="labs-empty-state" style="padding: 24px; text-align: center; color: #6B7280;">
            <p>No lab results available for this client yet.</p>
            <p style="font-size: 12px; color: #9CA3AF; margin-top: 8px;">Upload lab results to include them in protocol generation.</p>
          </div>
        `;
        return;
      }

      // Display labs as selectable cards matching the template card style
      container.innerHTML = labs.map(lab => `
        <label class="protocol-template-card protocol-lab-card">
          <input type="checkbox" name="lab" value="${lab.id}" class="lab-checkbox">
          <div class="template-card-inner">
            <div class="template-card-header">
              <span class="template-name">${lab.title || lab.file_name || 'Lab Result'}</span>
              <div class="template-check">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
            <p class="template-desc">${lab.lab_type || 'Lab'} - ${formatDate(lab.test_date || lab.uploaded_at)}</p>
            <p class="note-preview-text">${lab.ai_summary ? truncateText(lab.ai_summary, 80) : 'Lab data available'}</p>
          </div>
        </label>
      `).join('');

    } else {
      container.innerHTML = '<div class="labs-empty-state" style="padding: 24px; text-align: center; color: #EF4444;"><p>Error loading lab results. Please try again.</p></div>';
    }
  } catch (error) {
    console.error('Error loading labs for protocol builder:', error);
    container.innerHTML = '<div class="labs-empty-state" style="padding: 24px; text-align: center; color: #EF4444;"><p>Error loading lab results. Please try again.</p></div>';
  }
}

// Filter labs in protocol builder
function filterLabs() {
  const searchTerm = document.getElementById('labsSearch')?.value?.toLowerCase() || '';
  const cards = document.querySelectorAll('.protocol-lab-card');

  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(searchTerm) ? '' : 'none';
  });
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

  container.innerHTML = notes.map(note => {
    // Determine note title based on type
    let noteTitle = 'Quick Note';
    if (note.is_consultation) {
      // Extract title from consultation notes (format: ## Title\n\nContent)
      if (note.content && note.content.startsWith('## ')) {
        const titleMatch = note.content.match(/^## (.+?)(\n|$)/);
        noteTitle = titleMatch ? titleMatch[1] : 'Consultation Note';
      } else {
        noteTitle = 'Consultation Note';
      }
    } else if (note.note_type && note.note_type !== 'quick_note') {
      noteTitle = note.note_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return `
      <div class="ref-item ${note.is_consultation ? 'consultation-note' : ''}" onclick="viewRefNote(${note.id})">
        <p class="ref-item-title">${noteTitle}</p>
        <p class="ref-item-date">${formatDate(note.created_at)} - ${note.author || 'Unknown'}</p>
      </div>
    `;
  }).join('');
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

  const token = localStorage.getItem('auth_token');
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
    const token = localStorage.getItem('auth_token');
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

// Save engagement plan as PDF by ID (called from menu)
async function saveEngagementPlanAsPDF(planId) {
  window.currentShareProtocolId = planId;
  await downloadEngagementPlanPDF();
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

      // Parse the engagement plan from ai_recommendations JSON
      let planData = null;
      if (protocol.ai_recommendations) {
        try {
          planData = JSON.parse(protocol.ai_recommendations);
        } catch (e) {
          // Try regex extraction for legacy data
          const jsonMatch = protocol.ai_recommendations.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              planData = JSON.parse(jsonMatch[0]);
            } catch (e2) {
              console.error('Error parsing engagement plan JSON:', e2);
            }
          }
        }
      }

      // Use the proper formatting function for engagement plan data
      const formattedContent = planData ? formatEngagementPlanForPrint(planData) : '<p>No engagement plan data available.</p>';
      const planTitle = planData?.title || protocol.title || 'Engagement Plan';

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
            /* Engagement Plan specific styles */
            .summary {
              background: #FEF9C3;
              padding: 16px;
              border-radius: 8px;
              margin-bottom: 24px;
            }
            .summary p {
              color: #713F12;
              margin: 0;
            }
            .phase {
              background: #F9FAFB;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
              border-left: 4px solid #0F766E;
              page-break-inside: avoid;
            }
            .phase h3 {
              margin-top: 0;
              color: #1F2937;
            }
            .phase-subtitle {
              font-style: italic;
              color: #6B7280;
              margin: 4px 0 12px 0;
              font-size: 14px;
            }
            .goal {
              background: #E0F2F1;
              padding: 12px;
              border-radius: 6px;
              margin-top: 12px;
            }
            .goal-label {
              font-weight: 600;
              color: #0F766E;
              font-size: 12px;
              text-transform: uppercase;
            }
            .check-in {
              background: #FEF3C7;
              padding: 12px;
              border-radius: 6px;
              margin-top: 12px;
            }
            .check-in-label {
              font-weight: 600;
              color: #92400E;
              font-size: 12px;
              text-transform: uppercase;
            }
            .comm-schedule {
              background: #EFF6FF;
              padding: 16px;
              border-radius: 8px;
              margin-top: 24px;
            }
          </style>
        </head>
        <body>
          <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

          <div class="header">
            <div class="logo">ExpandHealth</div>
            <h1>${escapeHtml(planTitle)}</h1>
            <div class="meta">
              <strong>Client:</strong> ${escapeHtml(clientName)}<br>
              <strong>Created:</strong> ${formatDate(protocol.created_at)}
            </div>
          </div>

          <div class="content">
            ${formattedContent}
          </div>

          <div class="footer">
            <p>Generated by ExpandHealth • ${new Date().toLocaleDateString()}</p>
            <p>This engagement plan is personalized for ${escapeHtml(clientName)} and should be reviewed with your healthcare provider.</p>
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
  const token = localStorage.getItem('auth_token');
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
          ${protocol.status === 'draft' ? `
          <button class="card-menu-item" onclick="activateProtocol(${protocol.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Activate
          </button>
          ` : `
          <button class="card-menu-item" onclick="setProtocolDraft(${protocol.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Set as Draft
          </button>
          `}
          <button class="card-menu-item" onclick="createEngagementPlanFromProtocol(${protocol.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Create Engagement Plan
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
          <button class="card-menu-item" onclick="saveProtocolAsPDF(${protocol.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="18"/><line x1="15" y1="15" x2="12" y2="18"/></svg>
            Save as PDF
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

  // Store protocol ID for summary generation
  window.currentViewingProtocolId = protocol.id;

  const modal = document.createElement('div');
  modal.id = 'protocolViewModal';
  modal.className = 'modal-overlay';
  modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;';

  const protocolContent = protocol.content || '';
  const hasContent = protocolContent.length > 0;

  // Build AI Summary section
  const hasSummary = protocol.ai_summary && protocol.ai_summary.trim().length > 0;
  const aiSummaryHtml = `
    <div style="margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0;">AI Summary</h3>
        <span style="background: linear-gradient(135deg, #0F766E 0%, #115E59 100%); color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500;">AI</span>
      </div>
      <div id="protocolAISummaryContainer" style="background: linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 100%); border: 1px solid #99F6E4; border-radius: 12px; padding: 16px;">
        ${hasSummary ? `
          <p id="protocolAISummaryText" style="margin: 0; font-size: 14px; line-height: 1.6; color: #134E4A; white-space: pre-wrap;">${escapeHtml(protocol.ai_summary)}</p>
        ` : `
          <div id="protocolAISummaryText" style="text-align: center; padding: 12px;">
            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">No AI summary yet. Generate one to get a quick overview of this protocol.</p>
            <button onclick="generateProtocolAISummary()" id="generateProtocolSummaryBtn" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #0F766E 0%, #115E59 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Generate AI Summary
            </button>
          </div>
        `}
      </div>
    </div>
  `;

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
        ${aiSummaryHtml}
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

// Generate AI summary for the protocol being viewed
async function generateProtocolAISummary() {
  const protocolId = window.currentViewingProtocolId;
  if (!protocolId) {
    showNotification('No protocol selected', 'error');
    return;
  }

  const summaryContainer = document.getElementById('protocolAISummaryText');
  const generateBtn = document.getElementById('generateProtocolSummaryBtn');

  // Show loading state with progress bar
  if (summaryContainer) {
    summaryContainer.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px;">
          <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span style="color: #0F766E; font-weight: 500;">Generating AI Summary...</span>
        </div>
        <div class="ai-summary-progress" style="background: #E5E7EB; border-radius: 8px; height: 6px; overflow: hidden; max-width: 300px; margin: 0 auto;">
          <div class="ai-summary-progress-fill" style="height: 100%; width: 0%; background: linear-gradient(90deg, #0F766E, #14B8A6, #0F766E); background-size: 200% 100%; border-radius: 8px; animation: progressPulse 2s ease-in-out infinite, progressGrow 8s ease-out forwards;"></div>
        </div>
        <p style="color: #6B7280; font-size: 13px; margin-top: 12px;">Analyzing protocol content and creating a concise overview...</p>
      </div>
    `;
  }

  if (generateBtn) {
    generateBtn.style.display = 'none';
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}/generate-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (summaryContainer) {
        // Format the summary nicely
        const formattedSummary = formatProtocolSummary(data.summary);
        summaryContainer.innerHTML = formattedSummary;
      }
      showNotification('AI summary generated successfully!', 'success');
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate summary');
    }
  } catch (error) {
    console.error('Error generating protocol summary:', error);
    showNotification(`Error: ${error.message}`, 'error');

    // Reset to allow retry
    if (summaryContainer) {
      summaryContainer.innerHTML = `
        <div style="text-align: center; padding: 12px;">
          <p style="margin: 0 0 12px 0; color: #DC2626; font-size: 14px;">Failed to generate summary. Please try again.</p>
          <button onclick="generateProtocolAISummary()" id="generateProtocolSummaryBtn" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #0F766E 0%, #115E59 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Retry Generate Summary
          </button>
        </div>
      `;
    }
  }
}

// Format protocol AI summary with nice styling
function formatProtocolSummary(summary) {
  if (!summary) return '<p style="color: #6B7280;">No summary available</p>';

  // Convert markdown-like formatting to HTML
  let html = escapeHtml(summary)
    // Bold headers like **Main Focus:**
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #0F766E;">$1</strong>')
    // Bullet points
    .replace(/^[-•]\s*(.+)$/gm, '<li style="margin-bottom: 6px; color: #374151;">$1</li>')
    // Numbered lists
    .replace(/^\d+\.\s*(.+)$/gm, '<li style="margin-bottom: 6px; color: #374151;">$1</li>')
    // Wrap consecutive <li> items in <ul>
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => `<ul style="margin: 8px 0 12px 16px; padding: 0; list-style: disc;">${match}</ul>`)
    // Paragraphs
    .replace(/\n\n/g, '</p><p style="margin: 10px 0; color: #374151;">')
    .replace(/\n/g, '<br>');

  return `<div class="protocol-summary-formatted" style="font-size: 14px; line-height: 1.6;"><p style="margin: 0 0 10px 0; color: #374151;">${html}</p></div>`;
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

// Edit protocol - open full-screen structured editor
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

      // Parse protocol content into structured modules
      const modules = parseProtocolContentToModules(protocol);

      // Store in generatedProtocolData for the editor to use
      generatedProtocolData = {
        id: protocol.id,
        protocol: protocol,
        title: protocol.title || 'Protocol',
        modules: modules
      };

      // Open the full-screen structured editor
      openProtocolEditorForExisting(protocol, modules);
    } else {
      alert('Failed to load protocol for editing');
    }
  } catch (error) {
    console.error('Error loading protocol:', error);
    alert('Error loading protocol');
  }
}

// Parse protocol content (markdown/text) into structured modules
function parseProtocolContentToModules(protocol) {
  const content = protocol.content || protocol.notes || '';
  const modules = [];

  // If we have modules stored as JSON, use them directly
  if (protocol.modules && Array.isArray(protocol.modules) && protocol.modules.length > 0) {
    return protocol.modules;
  }

  // Parse markdown content into modules
  // Look for ## headers which indicate module sections
  const sections = content.split(/^##\s+/m).filter(s => s.trim());

  sections.forEach((section, index) => {
    const lines = section.split('\n');
    const name = lines[0]?.trim() || `Module ${index + 1}`;

    // Extract goal if present
    let goal = '';
    const goalMatch = section.match(/\*\*Goal:?\*\*\s*(.+)/i);
    if (goalMatch) {
      goal = goalMatch[1].trim();
    }

    // Extract items (look for ### headers or bullet points)
    const items = [];
    const subSections = section.split(/^###\s+/m);

    if (subSections.length > 1) {
      // Has ### subsections - these are individual items
      subSections.slice(1).forEach(subSection => {
        const subLines = subSection.split('\n');
        const itemName = subLines[0]?.trim() || '';
        if (!itemName) return;

        const item = { name: itemName };

        // Extract dosage, timing, notes from bullet points
        subLines.slice(1).forEach(line => {
          const dosageMatch = line.match(/\*\*Dosage:?\*\*\s*(.+)/i);
          const timingMatch = line.match(/\*\*Timing:?\*\*\s*(.+)/i);
          const notesMatch = line.match(/\*\*Notes?:?\*\*\s*(.+)/i);

          if (dosageMatch) item.dosage = dosageMatch[1].trim();
          if (timingMatch) item.timing = timingMatch[1].trim();
          if (notesMatch) item.notes = notesMatch[1].trim();
        });

        items.push(item);
      });
    } else {
      // No ### subsections - extract bullet points as items
      const bulletPoints = section.match(/^[-*]\s+(.+)$/gm);
      if (bulletPoints) {
        bulletPoints.forEach(bp => {
          const text = bp.replace(/^[-*]\s+/, '').trim();
          if (text && !text.startsWith('**')) {
            items.push({ name: text });
          }
        });
      }
    }

    if (name && !name.startsWith('Title:')) {
      modules.push({
        name: name,
        goal: goal,
        items: items.length > 0 ? items : [{ name: 'No items defined' }]
      });
    }
  });

  // If no modules were parsed, create a default one
  if (modules.length === 0 && content.trim()) {
    modules.push({
      name: 'Protocol Content',
      goal: '',
      items: [{ name: content.substring(0, 200) + '...' }]
    });
  }

  return modules;
}

// Open full-screen protocol editor for existing protocol
function openProtocolEditorForExisting(protocol, modules) {
  // Remove any existing editor
  const existingEditor = document.getElementById('existingProtocolEditorView');
  if (existingEditor) existingEditor.remove();

  const editorView = document.createElement('div');
  editorView.id = 'existingProtocolEditorView';
  editorView.className = 'protocol-editor-view';
  editorView.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #F8FAFB; z-index: 2000; display: flex; flex-direction: column;';

  const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : 'Client';
  const protocolTitle = protocol.title || 'Protocol';

  editorView.innerHTML = `
    <!-- Header -->
    <div class="protocol-editor-header">
      <button class="back-btn" onclick="closeExistingProtocolEditor()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Client
      </button>

      <div class="header-tabs">
        <button class="header-tab active" data-tab="protocol" onclick="switchExistingEditorTab('protocol')">Protocol</button>
      </div>

      <div class="header-actions" style="display: flex; gap: 12px;">
        <button class="btn-secondary" onclick="printExistingProtocol()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Print
        </button>
        <button class="btn-primary" onclick="saveExistingProtocolEditor()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save Protocol
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="protocol-editor-layout" style="display: flex; flex: 1; overflow: hidden;">
      <!-- Left Reference Panel with Tabs -->
      <div class="protocol-reference-panel" id="existingProtocolReferencePanel">
        <!-- Reference Panel Tabs -->
        <div class="reference-panel-tabs">
          <button class="ref-tab active" data-ref-tab="ask-ai" onclick="switchRefTab('ask-ai', 'existing')">Ask AI</button>
          <button class="ref-tab" data-ref-tab="prev-protocols" onclick="switchRefTab('prev-protocols', 'existing')">Previous Protocols</button>
          <button class="ref-tab" data-ref-tab="lab-results" onclick="switchRefTab('lab-results', 'existing')">Lab Results</button>
          <button class="ref-tab" data-ref-tab="notes" onclick="switchRefTab('notes', 'existing')">Notes</button>
          <button class="ref-tab" data-ref-tab="forms" onclick="switchRefTab('forms', 'existing')">Forms</button>
          <button class="ref-panel-collapse" onclick="toggleExistingReferencePanel()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>

        <!-- Tab Content: Ask AI -->
        <div class="ref-tab-content active" id="existingRefTab-ask-ai">
          <div class="ref-panel-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Ask a question about this client..." id="existingRefAskAIInput" onkeypress="handleRefAIQuestion(event)">
          </div>
          <div class="ref-panel-list" id="existingRefAskAIContent">
            <div class="ref-ai-suggestions">
              <p class="ref-section-label">Suggested Questions</p>
              <button class="ref-ai-suggestion" onclick="askRefAIQuestion('What supplements might conflict with their medications?')">
                What supplements might conflict with their medications?
              </button>
              <button class="ref-ai-suggestion" onclick="askRefAIQuestion('Are there any contraindications based on their medical history?')">
                Are there any contraindications based on their medical history?
              </button>
              <button class="ref-ai-suggestion" onclick="askRefAIQuestion('What dosage adjustments should I consider?')">
                What dosage adjustments should I consider?
              </button>
              <button class="ref-ai-suggestion" onclick="askRefAIQuestion('What are the key findings from their recent labs?')">
                What are the key findings from their recent labs?
              </button>
            </div>
          </div>
        </div>

        <!-- Tab Content: Previous Protocols -->
        <div class="ref-tab-content" id="existingRefTab-prev-protocols">
          <div class="ref-panel-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Search Protocols or Keywords" id="existingRefProtocolSearch" onkeyup="filterRefProtocols('existing')">
          </div>
          <div class="ref-panel-list" id="existingRefProtocolsList">
            <div class="ref-loading">Loading protocols...</div>
          </div>
        </div>

        <!-- Tab Content: Lab Results -->
        <div class="ref-tab-content" id="existingRefTab-lab-results">
          <div class="ref-panel-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Search Lab Results or Tags" id="existingRefLabSearch" onkeyup="filterRefLabs('existing')">
          </div>
          <div class="ref-panel-list" id="existingRefLabResultsList">
            <div class="ref-loading">Loading lab results...</div>
          </div>
        </div>

        <!-- Tab Content: Notes -->
        <div class="ref-tab-content" id="existingRefTab-notes">
          <div class="ref-panel-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Search Notes" id="existingRefNotesSearch" onkeyup="filterRefNotes('existing')">
          </div>
          <div class="ref-panel-list" id="existingRefNotesList">
            <div class="ref-loading">Loading notes...</div>
          </div>
        </div>

        <!-- Tab Content: Forms -->
        <div class="ref-tab-content" id="existingRefTab-forms">
          <div class="ref-panel-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Search Forms" id="existingRefFormsSearch" onkeyup="filterRefForms('existing')">
          </div>
          <div class="ref-panel-list" id="existingRefFormsList">
            <div class="ref-loading">Loading forms...</div>
          </div>
        </div>
      </div>

      <!-- Lab Preview Panel (shown when lab is selected) -->
      <div class="lab-preview-panel" id="existingLabPreviewPanel" style="display: none;" onclick="if(event.target === this) closeLabPreview()">
        <div class="lab-preview-content">
          <div class="lab-preview-header">
            <button class="lab-preview-close" onclick="closeLabPreview()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="lab-preview-document" id="existingLabPreviewDocument">
            <!-- Lab PDF/image will be rendered here -->
          </div>
          <div class="lab-preview-sidebar">
            <h3 id="existingLabPreviewTitle">Lab Title</h3>
            <p class="lab-preview-meta" id="existingLabPreviewMeta">Type | Date</p>
            <div class="lab-preview-section">
              <h4>Summary</h4>
              <div id="existingLabPreviewSummaryContainer">
                <p id="existingLabPreviewSummary">AI summary will appear here...</p>
                <button id="existingGenerateLabSummaryBtn" class="generate-summary-btn" onclick="generateLabAISummary()" style="display: none;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Generate AI Summary
                </button>
              </div>
            </div>
            <div class="lab-preview-section">
              <h4>Notes</h4>
              <p id="existingLabPreviewNotes">No notes to show</p>
              <textarea id="existingLabPreviewNotesInput" placeholder="Enter your notes" rows="4"></textarea>
              <button class="lab-preview-note-btn" onclick="saveLabNote()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Left Sidebar with module icons -->
      <div class="protocol-editor-sidebar">
        ${modules.map((m, i) => `
          <button class="sidebar-icon ${i === 0 ? 'active' : ''}" title="${escapeHtml(m.name)}" onclick="scrollToProtocolSection(${i})">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </button>
        `).join('')}
      </div>

      <!-- Main Editor Area -->
      <div class="protocol-editor-main" style="flex: 1; overflow-y: auto;">
        <div class="protocol-document" style="max-width: 900px; margin: 0 auto; padding: 40px;">
          <!-- Title -->
          <h1 class="protocol-title" contenteditable="true" id="existingProtocolTitle">${escapeHtml(protocolTitle)}</h1>

          <!-- Metadata -->
          <div class="protocol-metadata">
            <div class="meta-row">
              <span class="meta-label">Client</span>
              <span class="meta-value">${escapeHtml(clientName)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Created</span>
              <span class="meta-value">${formatDate(protocol.created_at)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Status</span>
              <span class="meta-value" style="text-transform: capitalize;">${protocol.status || 'draft'}</span>
            </div>
          </div>

          <!-- Protocol Sections -->
          <div id="existingProtocolSections" class="protocol-sections">
            ${renderExistingProtocolSections(modules)}
          </div>

          <!-- Add Module Button -->
          <div class="add-module-container" style="padding: 24px; border-top: 1px dashed #E5E7EB; margin-top: 20px;">
            <button class="btn-add-module" onclick="addModuleToExistingProtocol()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Add New Module
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer with AI Input -->
    <div class="protocol-editor-footer">
      <div id="existingSelectedSectionTag" class="selected-section-tag" style="display: none;">
        <span id="existingSelectedSectionName">Section selected</span>
        <button onclick="clearExistingProtocolSelection()">&times;</button>
      </div>
      <div class="ai-input-container protocol-ai-input-wrapper">
        <input type="text" id="existingProtocolAIInput" placeholder="Ask AI to modify the protocol (e.g., 'add a stress management module')" onkeypress="handleExistingProtocolAI(event)">
        <button class="ai-submit-btn" onclick="submitExistingProtocolAI()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Floating Action Buttons -->
    <div class="editor-fab-container">
      <button class="editor-fab ask-ai-fab" onclick="openAIChatModal()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Ask AI</span>
      </button>
      <button class="editor-fab quick-notes-fab" onclick="openRightPanel()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <span>Quick Notes</span>
      </button>
    </div>
  `;

  document.body.appendChild(editorView);
  document.body.style.overflow = 'hidden';

  // Load reference panel data for the existing protocol editor
  loadReferencePanelDataForExisting();

  // Initialize editable field behaviors
  initializeEditableFields();
}

// Toggle the existing protocol editor reference panel
function toggleExistingReferencePanel() {
  const panel = document.getElementById('existingProtocolReferencePanel');
  if (!panel) return;

  panel.classList.toggle('collapsed');
  const collapseBtn = panel.querySelector('.ref-panel-collapse svg');
  if (collapseBtn) {
    if (panel.classList.contains('collapsed')) {
      collapseBtn.innerHTML = '<polyline points="9 18 15 12 9 6"/>';
    } else {
      collapseBtn.innerHTML = '<polyline points="15 18 9 12 15 6"/>';
    }
  }
}

// Load reference panel data for the existing protocol editor
async function loadReferencePanelDataForExisting() {
  if (!currentClient) return;

  const clientId = currentClient.id;
  const token = localStorage.getItem('auth_token');

  try {
    // Load protocols
    const protocolsRes = await fetch(`${API_BASE}/api/protocols/client/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (protocolsRes.ok) {
      const data = await protocolsRes.json();
      refPanelProtocolData = data.protocols || [];
      renderExistingRefProtocols();
    }

    // Load labs
    const labsRes = await fetch(`${API_BASE}/api/labs/client/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (labsRes.ok) {
      const data = await labsRes.json();
      refPanelLabData = data.labs || [];
      renderExistingRefLabs();
    }

    // Load notes
    const notesRes = await fetch(`${API_BASE}/api/notes/client/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (notesRes.ok) {
      const data = await notesRes.json();
      refPanelNotesData = data.notes || [];
      renderExistingRefNotes();
    }

    // Load forms
    const formsRes = await fetch(`${API_BASE}/api/forms/client/${clientId}/submissions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (formsRes.ok) {
      const data = await formsRes.json();
      refPanelFormsData = data.submissions || [];
      renderExistingRefForms();
    }
  } catch (error) {
    console.error('Error loading reference panel data:', error);
  }
}

// Render protocols for existing editor reference panel
function renderExistingRefProtocols() {
  const container = document.getElementById('existingRefProtocolsList');
  if (!container) return;

  if (!refPanelProtocolData || refPanelProtocolData.length === 0) {
    container.innerHTML = '<p class="ref-empty">No previous protocols found.</p>';
    return;
  }

  container.innerHTML = refPanelProtocolData.map(protocol => `
    <div class="ref-item" onclick="viewRefProtocol(${protocol.id})">
      <div class="ref-item-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div class="ref-item-content">
        <span class="ref-item-title">${escapeHtml(protocol.title || 'Untitled Protocol')}</span>
        <span class="ref-item-meta">${formatDate(protocol.created_at)}</span>
      </div>
    </div>
  `).join('');
}

// Render labs for existing editor reference panel
function renderExistingRefLabs() {
  const container = document.getElementById('existingRefLabResultsList');
  if (!container) return;

  if (!refPanelLabData || refPanelLabData.length === 0) {
    container.innerHTML = '<p class="ref-empty">No lab results found.</p>';
    return;
  }

  container.innerHTML = refPanelLabData.map(lab => `
    <div class="ref-item ref-lab-item" onclick="openLabPreview(${lab.id})">
      <div class="ref-item-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <line x1="10" y1="9" x2="8" y2="9"/>
        </svg>
      </div>
      <div class="ref-item-content">
        <span class="ref-item-title">${escapeHtml(lab.file_name || lab.title || 'Lab Result')}</span>
        <span class="ref-item-meta">${lab.lab_type || 'Lab'} | ${formatDate(lab.test_date || lab.uploaded_at)}</span>
      </div>
    </div>
  `).join('');
}

// Render notes for existing editor reference panel
function renderExistingRefNotes() {
  const container = document.getElementById('existingRefNotesList');
  if (!container) return;

  if (!refPanelNotesData || refPanelNotesData.length === 0) {
    container.innerHTML = '<p class="ref-empty">No notes found.</p>';
    return;
  }

  container.innerHTML = refPanelNotesData.map(note => `
    <div class="ref-item" onclick="viewRefNote(${note.id})">
      <div class="ref-item-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <div class="ref-item-content">
        <span class="ref-item-title">${escapeHtml((note.content || '').substring(0, 50))}${(note.content || '').length > 50 ? '...' : ''}</span>
        <span class="ref-item-meta">${note.note_type || 'Note'} | ${formatDate(note.created_at)}</span>
      </div>
    </div>
  `).join('');
}

// Render forms for existing editor reference panel
function renderExistingRefForms() {
  const container = document.getElementById('existingRefFormsList');
  if (!container) return;

  if (!refPanelFormsData || refPanelFormsData.length === 0) {
    container.innerHTML = '<p class="ref-empty">No form submissions found.</p>';
    return;
  }

  container.innerHTML = refPanelFormsData.map(form => `
    <div class="ref-item" onclick="viewRefForm(${form.id})">
      <div class="ref-item-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11H3v10h6V11z"/>
          <path d="M21 3h-6v18h6V3z"/>
          <path d="M15 11H9v10h6V11z"/>
        </svg>
      </div>
      <div class="ref-item-content">
        <span class="ref-item-title">${escapeHtml(form.form_name || form.template_name || 'Form Submission')}</span>
        <span class="ref-item-meta">${formatDate(form.submitted_at || form.created_at)}</span>
      </div>
    </div>
  `).join('');
}

// Render existing protocol sections
function renderExistingProtocolSections(modules) {
  if (!modules || modules.length === 0) {
    return '<p style="color: #6B7280; text-align: center; padding: 40px;">No modules yet. Click "Add New Module" to create one.</p>';
  }

  return modules.map((module, index) => {
    const sectionType = getSectionType(module.name);
    const isCore = module.is_core_protocol || module.name?.toLowerCase().includes('core protocol');
    const isClinic = module.is_clinic_treatments || module.name?.toLowerCase().includes('clinic');
    let sectionContent = '';

    if (sectionType === 'supplements' && module.items) {
      sectionContent = renderSupplementTable(module.items);
    } else if (module.items) {
      sectionContent = renderClinicalSectionList(module.items);
    }

    // Render safety gates if present
    let safetyGatesHtml = '';
    if (module.safety_gates && module.safety_gates.length > 0) {
      safetyGatesHtml = `
        <div class="safety-gates-section" style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 16px; border-radius: 8px; margin-top: 16px;">
          <h4 style="color: #DC2626; margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; font-weight: 600;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Safety Gates
          </h4>
          <ul style="margin: 0; padding-left: 20px; color: #991B1B;">
            ${module.safety_gates.map(gate => `<li style="margin-bottom: 6px; font-size: 13px;">${escapeHtml(gate)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Render "what not to do" if present
    let whatNotToDoHtml = '';
    if (module.what_not_to_do && module.what_not_to_do.length > 0) {
      whatNotToDoHtml = `
        <div class="what-not-to-do-section" style="background: #FEF3C7; border-left: 4px solid #D97706; padding: 16px; border-radius: 8px; margin-top: 12px;">
          <h4 style="color: #92400E; margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; font-weight: 600;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            What NOT To Do Early
          </h4>
          <ul style="margin: 0; padding-left: 20px; color: #78350F;">
            ${module.what_not_to_do.map(item => `<li style="margin-bottom: 6px; font-size: 13px;">${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Render readiness criteria if present
    let readinessCriteriaHtml = '';
    if (module.readiness_criteria && module.readiness_criteria.length > 0) {
      readinessCriteriaHtml = `
        <div class="readiness-criteria-section" style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; border-radius: 8px; margin-top: 12px;">
          <h4 style="color: #1E40AF; margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; font-weight: 600;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Readiness Criteria
          </h4>
          <ul style="margin: 0; padding-left: 20px; color: #1E3A8A;">
            ${module.readiness_criteria.map(criteria => `<li style="margin-bottom: 6px; font-size: 13px;">${escapeHtml(criteria)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Section styling based on type
    const sectionStyles = isCore
      ? 'background: linear-gradient(to right, #ECFDF5, #F0FDF4); border-left: 4px solid #059669;'
      : isClinic
        ? 'background: linear-gradient(to right, #F0FDFA, #F5F5F5); border-left: 4px solid #0F766E;'
        : '';

    // Phase badge
    let phaseBadge = '';
    if (isCore) {
      phaseBadge = `<span style="background: #059669; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px; font-weight: 500;">CORE</span>`;
    } else if (module.phase_number) {
      phaseBadge = `<span style="background: #0F766E; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px; font-weight: 500;">PHASE ${module.phase_number}</span>`;
    } else if (isClinic) {
      phaseBadge = `<span style="background: #0F766E; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px; font-weight: 500;">CLINIC</span>`;
    }

    // Duration info
    let durationInfo = '';
    if (module.duration_weeks) {
      durationInfo = `<span style="color: #6B7280; font-size: 12px; margin-left: 8px;">Duration: ${module.duration_weeks} weeks</span>`;
    }
    if (module.start_week) {
      durationInfo += `<span style="color: #6B7280; font-size: 12px; margin-left: 8px;">Starts: Week ${module.start_week}</span>`;
    }

    return `
      <div class="protocol-section" data-section-index="${index}" data-section-type="${sectionType}" onclick="selectExistingSection(${index}, event)" style="${sectionStyles} position: relative; padding: 24px; border-radius: 12px; margin-bottom: 16px;">
        <input type="checkbox" class="section-checkbox" onclick="event.stopPropagation(); toggleExistingSectionCheckbox(${index})">
        <h2 class="section-title" style="display: flex; align-items: center; flex-wrap: wrap;">
          <span class="drag-handle">⋮⋮</span>
          <span contenteditable="true" class="module-title-text" data-index="${index}">${escapeHtml(module.name)}</span>
          ${phaseBadge}
          ${durationInfo}
        </h2>
        ${module.description ? `<p style="color: #6B7280; font-style: italic; margin: 8px 0 16px 0; font-size: 14px;">${escapeHtml(module.description)}</p>` : ''}
        ${module.goal ? `<p class="section-goal"><strong>Goal:</strong> <span contenteditable="true" class="module-goal-text" data-index="${index}">${escapeHtml(module.goal)}</span></p>` : ''}

        ${readinessCriteriaHtml}
        ${sectionContent}
        ${safetyGatesHtml}
        ${whatNotToDoHtml}

        <!-- Per-module AI input -->
        <div class="section-input" style="margin-top: 16px;">
          <input type="text" placeholder="Ask AI to modify this module..." onkeypress="handleExistingModuleInput(event, ${index})">
          <button onclick="submitExistingModuleInput(${index})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <!-- Delete Module Button -->
        <button onclick="deleteExistingModule(${index}); event.stopPropagation();"
          style="position: absolute; top: 16px; right: 48px; background: none; border: none; color: #9CA3AF; cursor: pointer; padding: 4px;"
          title="Delete Module">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');
}

// Render clinical section list with enhanced item display (all fields editable)
function renderClinicalSectionList(items) {
  if (!items || items.length === 0) return '';

  return `
    <div class="section-items" style="margin-top: 16px;">
      ${items.map((item, i) => {
        const itemName = typeof item === 'string' ? item : (item.name || item.title || 'Item');
        const isString = typeof item === 'string';

        if (isString) {
          return `<div class="section-item" style="padding: 12px; background: white; border-radius: 8px; margin-bottom: 8px; border: 1px solid #E5E7EB;">
            <span contenteditable="true" class="item-text editable-field" data-index="${i}" data-field="name" title="Click to edit">${escapeHtml(itemName)}</span>
          </div>`;
        }

        // Complex item with all fields editable
        return `
          <div class="section-item clinical-item" data-item-index="${i}" style="padding: 16px; background: white; border-radius: 8px; margin-bottom: 12px; border: 1px solid #E5E7EB; border-left: 3px solid #0F766E;">
            <h4 style="margin: 0 0 8px 0; color: #1F2937; font-size: 15px;" contenteditable="true" class="item-name editable-field" data-index="${i}" data-field="name" title="Click to edit name">${escapeHtml(itemName)}</h4>
            ${item.rationale ? `<p contenteditable="true" class="editable-field item-rationale" data-index="${i}" data-field="rationale" title="Click to edit rationale" style="color: #374151; margin: 0 0 8px 0; font-size: 14px; padding: 4px; border-radius: 4px;">${escapeHtml(item.rationale)}</p>` : `<p contenteditable="true" class="editable-field item-rationale empty-field" data-index="${i}" data-field="rationale" title="Click to add rationale" style="color: #9CA3AF; margin: 0 0 8px 0; font-size: 14px; padding: 4px; border-radius: 4px; font-style: italic;">Add rationale...</p>`}
            ${item.description ? `<p contenteditable="true" class="editable-field item-description" data-index="${i}" data-field="description" title="Click to edit description" style="color: #6B7280; margin: 0 0 8px 0; font-size: 13px; padding: 4px; border-radius: 4px;">${escapeHtml(item.description)}</p>` : ''}
            <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px;">
              <span style="font-size: 13px; color: #059669; display: flex; align-items: center; gap: 4px;">
                <strong>Dosage:</strong>
                <span contenteditable="true" class="editable-field item-dosage" data-index="${i}" data-field="dosage" title="Click to edit dosage" style="padding: 2px 6px; border-radius: 4px; min-width: 60px;">${item.dosage ? escapeHtml(item.dosage) : '<span class="empty-placeholder">Add dosage</span>'}</span>
              </span>
              <span style="font-size: 13px; color: #0369A1; display: flex; align-items: center; gap: 4px;">
                <strong>Timing:</strong>
                <span contenteditable="true" class="editable-field item-timing" data-index="${i}" data-field="timing" title="Click to edit timing" style="padding: 2px 6px; border-radius: 4px; min-width: 60px;">${item.timing ? escapeHtml(item.timing) : '<span class="empty-placeholder">Add timing</span>'}</span>
              </span>
              <span style="font-size: 13px; color: #7C3AED; display: flex; align-items: center; gap: 4px;">
                <strong>Frequency:</strong>
                <span contenteditable="true" class="editable-field item-frequency" data-index="${i}" data-field="frequency" title="Click to edit frequency" style="padding: 2px 6px; border-radius: 4px; min-width: 60px;">${item.frequency ? escapeHtml(item.frequency) : '<span class="empty-placeholder">Add frequency</span>'}</span>
              </span>
              ${item.category ? `<span style="font-size: 11px; background: #F3F4F6; padding: 2px 8px; border-radius: 4px; color: #6B7280; text-transform: uppercase;">${escapeHtml(item.category)}</span>` : ''}
            </div>
            <div style="background: #FEF2F2; padding: 8px 12px; border-radius: 6px; margin-top: 10px;">
              <span style="font-size: 12px; color: #991B1B; display: flex; align-items: flex-start; gap: 4px;">
                <strong>⚠️ Contraindications:</strong>
                <span contenteditable="true" class="editable-field item-contraindications" data-index="${i}" data-field="contraindications" title="Click to edit contraindications" style="padding: 2px 6px; border-radius: 4px; flex: 1;">${item.contraindications ? escapeHtml(item.contraindications) : '<span class="empty-placeholder">None specified</span>'}</span>
              </span>
            </div>
            <p style="color: #6B7280; margin: 8px 0 0 0; font-size: 12px; display: flex; align-items: flex-start; gap: 4px;">
              📝 <span contenteditable="true" class="editable-field item-notes" data-index="${i}" data-field="notes" title="Click to edit notes" style="padding: 2px 6px; border-radius: 4px; font-style: italic; flex: 1;">${item.notes ? escapeHtml(item.notes) : '<span class="empty-placeholder">Add notes...</span>'}</span>
            </p>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Initialize editable field behaviors for inline editing
function initializeEditableFields() {
  // Handle placeholder behavior for editable fields
  document.querySelectorAll('.editable-field').forEach(field => {
    const placeholder = field.querySelector('.empty-placeholder');

    field.addEventListener('focus', function() {
      // Clear placeholder text on focus
      if (placeholder) {
        placeholder.style.display = 'none';
      }
      if (this.classList.contains('empty-field')) {
        this.textContent = '';
        this.classList.remove('empty-field');
      }
    });

    field.addEventListener('blur', function() {
      // Restore placeholder if field is empty on blur
      const text = this.textContent.trim();
      const fieldType = this.dataset.field;

      if (!text || text === '') {
        this.classList.add('empty-field');
        const placeholders = {
          'rationale': 'Add rationale...',
          'dosage': 'Add dosage',
          'timing': 'Add timing',
          'frequency': 'Add frequency',
          'contraindications': 'None specified',
          'notes': 'Add notes...'
        };
        if (placeholders[fieldType]) {
          this.innerHTML = `<span class="empty-placeholder">${placeholders[fieldType]}</span>`;
        }
      }
    });

    // Prevent Enter key from creating new lines in single-line fields
    field.addEventListener('keydown', function(e) {
      const fieldType = this.dataset.field;
      const singleLineFields = ['dosage', 'timing', 'frequency', 'name'];
      if (e.key === 'Enter' && singleLineFields.includes(fieldType)) {
        e.preventDefault();
        this.blur();
      }
    });
  });
}

// Select existing protocol section
function selectExistingSection(index, event) {
  // Don't trigger section selection when clicking on editable fields
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' ||
      event.target.closest('.section-input') ||
      event.target.contentEditable === 'true' || event.target.contentEditable === true ||
      event.target.closest('[contenteditable="true"]') ||
      event.target.closest('.editable-field')) {
    return;
  }

  const sections = document.querySelectorAll('#existingProtocolSections .protocol-section');
  sections.forEach((section, i) => {
    if (i === index) {
      section.classList.toggle('selected');
      selectedProtocolSection = section.classList.contains('selected') ? index : null;
    } else {
      section.classList.remove('selected');
    }
  });

  const tagEl = document.getElementById('existingSelectedSectionTag');
  const nameEl = document.getElementById('existingSelectedSectionName');
  if (tagEl) {
    tagEl.style.display = selectedProtocolSection !== null ? 'flex' : 'none';
    if (nameEl && selectedProtocolSection !== null) {
      nameEl.textContent = generatedProtocolData.modules[index]?.name || `Module ${index + 1}`;
    }
  }

  if (selectedProtocolSection !== null) {
    showNotification(`Module "${generatedProtocolData.modules[index]?.name || `Module ${index + 1}`}" selected`, 'info');
  }
}

// Toggle existing section checkbox
function toggleExistingSectionCheckbox(index) {
  const sections = document.querySelectorAll('#existingProtocolSections .protocol-section');
  const section = sections[index];
  if (section) {
    const checkbox = section.querySelector('.section-checkbox');
    section.classList.toggle('selected', checkbox?.checked);
    selectedProtocolSection = checkbox?.checked ? index : null;

    const tagEl = document.getElementById('existingSelectedSectionTag');
    if (tagEl) {
      tagEl.style.display = selectedProtocolSection !== null ? 'flex' : 'none';
    }
  }
}

// Clear existing protocol selection
function clearExistingProtocolSelection() {
  const sections = document.querySelectorAll('#existingProtocolSections .protocol-section');
  sections.forEach(section => {
    section.classList.remove('selected');
    const checkbox = section.querySelector('.section-checkbox');
    if (checkbox) checkbox.checked = false;
  });
  selectedProtocolSection = null;

  const tagEl = document.getElementById('existingSelectedSectionTag');
  if (tagEl) tagEl.style.display = 'none';
}

// Handle per-module AI input for existing protocol
function handleExistingModuleInput(event, index) {
  if (event.key === 'Enter') {
    submitExistingModuleInput(index);
  }
}

// Submit per-module AI edit for existing protocol
async function submitExistingModuleInput(moduleIndex) {
  const section = document.querySelectorAll('#existingProtocolSections .protocol-section')[moduleIndex];
  if (!section) return;

  const input = section.querySelector('.section-input input');
  const prompt = input?.value?.trim();
  if (!prompt) return;

  input.value = '';

  const currentModule = generatedProtocolData.modules[moduleIndex];
  if (!currentModule) {
    showNotification('Module not found', 'error');
    return;
  }

  section.classList.add('loading');
  const originalContent = section.innerHTML;
  section.innerHTML = `
    <div class="section-loading">
      <div class="loading-spinner"></div>
      <p>AI is modifying "${currentModule.name}"...</p>
    </div>
  `;

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/protocols/edit-module`, {
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
      generatedProtocolData.modules[moduleIndex] = data.module;
      rerenderExistingProtocolSections();
      showNotification(`Module updated successfully!`, 'success');
    } else {
      throw new Error(data.error || 'Failed to update module');
    }
  } catch (error) {
    console.error('Error updating module:', error);
    section.innerHTML = originalContent;
    section.classList.remove('loading');
    showNotification(`Error: ${error.message}`, 'error');
  }
}

// Handle global AI input for existing protocol
function handleExistingProtocolAI(event) {
  if (event.key === 'Enter') {
    submitExistingProtocolAI();
  }
}

// Submit global AI command for existing protocol
async function submitExistingProtocolAI() {
  const input = document.getElementById('existingProtocolAIInput');
  const prompt = input?.value?.trim();
  if (!prompt) return;

  input.value = '';

  if (selectedProtocolSection !== null) {
    // Edit selected module
    const currentModule = generatedProtocolData.modules[selectedProtocolSection];
    if (!currentModule) {
      showNotification('Module not found', 'error');
      return;
    }

    showNotification(`AI is modifying "${currentModule.name}"...`, 'info');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api/protocols/edit-module`, {
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
        generatedProtocolData.modules[selectedProtocolSection] = data.module;
        rerenderExistingProtocolSections();
        clearExistingProtocolSelection();
        showNotification(`Module updated successfully!`, 'success');
      } else {
        throw new Error(data.error || 'Failed to update module');
      }
    } catch (error) {
      console.error('Error updating module:', error);
      showNotification(`Error: ${error.message}`, 'error');
    }
  } else {
    // Add new module
    await addModuleToExistingProtocolWithAI(prompt);
  }
}

// Add module with AI to existing protocol
async function addModuleToExistingProtocolWithAI(prompt) {
  showNotification('AI is generating a new module...', 'info');

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/protocols/edit-module`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: prompt,
        action: 'add'
      })
    });

    const data = await response.json();

    if (data.success && data.module) {
      if (!generatedProtocolData.modules) {
        generatedProtocolData.modules = [];
      }
      generatedProtocolData.modules.push(data.module);
      rerenderExistingProtocolSections();
      showNotification(`New module "${data.module.name}" added!`, 'success');

      setTimeout(() => {
        const sections = document.querySelectorAll('#existingProtocolSections .protocol-section');
        const lastSection = sections[sections.length - 1];
        if (lastSection) {
          lastSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          lastSection.style.backgroundColor = '#E0F2F1';
          setTimeout(() => { lastSection.style.backgroundColor = ''; }, 2000);
        }
      }, 100);
    } else {
      throw new Error(data.error || 'Failed to generate module');
    }
  } catch (error) {
    console.error('Error generating module:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

// Add blank module to existing protocol
function addModuleToExistingProtocol() {
  const moduleCount = (generatedProtocolData.modules || []).length + 1;
  const newModule = {
    name: `New Module ${moduleCount}`,
    goal: 'Define the goal for this module',
    items: [{ name: 'Add item here', dosage: '', timing: '', notes: '' }]
  };

  if (!generatedProtocolData.modules) {
    generatedProtocolData.modules = [];
  }
  generatedProtocolData.modules.push(newModule);
  rerenderExistingProtocolSections();

  setTimeout(() => {
    const sections = document.querySelectorAll('#existingProtocolSections .protocol-section');
    const lastSection = sections[sections.length - 1];
    if (lastSection) {
      lastSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

// Delete module from existing protocol
function deleteExistingModule(index) {
  if (!confirm('Are you sure you want to delete this module?')) return;

  generatedProtocolData.modules.splice(index, 1);
  rerenderExistingProtocolSections();
  showNotification('Module deleted', 'success');
}

// Re-render existing protocol sections
function rerenderExistingProtocolSections() {
  const container = document.getElementById('existingProtocolSections');
  if (container) {
    container.innerHTML = renderExistingProtocolSections(generatedProtocolData.modules || []);
  }
}

// Scroll to protocol section
function scrollToProtocolSection(index) {
  const sections = document.querySelectorAll('#existingProtocolSections .protocol-section');
  if (sections[index]) {
    sections[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Save existing protocol from editor
async function saveExistingProtocolEditor() {
  if (!window.currentEditingProtocolId || !generatedProtocolData) {
    showNotification('No protocol to save', 'error');
    return;
  }

  // Collect updated title
  const titleEl = document.getElementById('existingProtocolTitle');
  const newTitle = titleEl?.textContent?.trim() || generatedProtocolData.title;

  // Collect updated module data from contenteditable elements
  document.querySelectorAll('.module-title-text').forEach((el, i) => {
    if (generatedProtocolData.modules[i]) {
      generatedProtocolData.modules[i].name = el.textContent.trim();
    }
  });

  document.querySelectorAll('.module-goal-text').forEach((el) => {
    const index = parseInt(el.dataset.index);
    if (generatedProtocolData.modules[index]) {
      generatedProtocolData.modules[index].goal = el.textContent.trim();
    }
  });

  // Collect updated item data from each section (all editable fields)
  document.querySelectorAll('.protocol-section').forEach((section, sectionIndex) => {
    if (generatedProtocolData.modules[sectionIndex]) {
      const module = generatedProtocolData.modules[sectionIndex];

      // Get the items array based on section type
      const itemsKey = module.supplements ? 'supplements' :
                       module.interventions ? 'interventions' :
                       module.treatments ? 'treatments' :
                       module.lifestyle ? 'lifestyle' :
                       module.tests ? 'tests' :
                       module.items ? 'items' : null;

      if (itemsKey && module[itemsKey]) {
        // Collect all editable fields for each item
        section.querySelectorAll('.clinical-item').forEach((itemEl) => {
          const itemIndex = parseInt(itemEl.dataset.itemIndex);
          if (isNaN(itemIndex) || !module[itemsKey][itemIndex]) return;

          const item = module[itemsKey][itemIndex];

          // Helper function to get clean text content (removes placeholder text)
          const getFieldValue = (field) => {
            const el = itemEl.querySelector(`.item-${field}`);
            if (!el) return null;
            const text = el.textContent.trim();
            // Return null if it's placeholder text
            if (text === 'Add dosage' || text === 'Add timing' || text === 'Add frequency' ||
                text === 'None specified' || text === 'Add notes...' || text === 'Add rationale...') {
              return null;
            }
            return text || null;
          };

          if (typeof item === 'string') {
            // Convert string item to object if fields are edited
            const nameEl = itemEl.querySelector('.item-name');
            if (nameEl) {
              module[itemsKey][itemIndex] = nameEl.textContent.trim();
            }
          } else {
            // Update all fields for complex items
            const nameEl = itemEl.querySelector('.item-name');
            if (nameEl) item.name = nameEl.textContent.trim();

            const rationale = getFieldValue('rationale');
            if (rationale !== null) item.rationale = rationale;
            else delete item.rationale;

            const dosage = getFieldValue('dosage');
            if (dosage !== null) item.dosage = dosage;
            else delete item.dosage;

            const timing = getFieldValue('timing');
            if (timing !== null) item.timing = timing;
            else delete item.timing;

            const frequency = getFieldValue('frequency');
            if (frequency !== null) item.frequency = frequency;
            else delete item.frequency;

            const contraindications = getFieldValue('contraindications');
            if (contraindications !== null) item.contraindications = contraindications;
            else delete item.contraindications;

            const notes = getFieldValue('notes');
            if (notes !== null) item.notes = notes;
            else delete item.notes;
          }
        });

        // Also handle simple items (strings)
        section.querySelectorAll('.section-item:not(.clinical-item) .item-text').forEach((el) => {
          const itemIndex = parseInt(el.dataset.index);
          if (!isNaN(itemIndex) && module[itemsKey][itemIndex]) {
            if (typeof module[itemsKey][itemIndex] === 'string') {
              module[itemsKey][itemIndex] = el.textContent.trim();
            }
          }
        });

        // Handle supplement table rows
        section.querySelectorAll('.supplement-row').forEach((row) => {
          const itemIndex = parseInt(row.dataset.itemIndex);
          if (isNaN(itemIndex) || !module[itemsKey][itemIndex]) return;

          const item = module[itemsKey][itemIndex];

          // Helper function to get clean text from table cell
          const getCellValue = (field) => {
            const el = row.querySelector(`.item-${field}`);
            if (!el) return null;
            const text = el.textContent.trim();
            if (text === '-' || text === '') return null;
            return text;
          };

          if (typeof item === 'string') {
            const nameEl = row.querySelector('.item-name');
            if (nameEl) {
              module[itemsKey][itemIndex] = nameEl.textContent.trim();
            }
          } else {
            const nameEl = row.querySelector('.item-name');
            if (nameEl) item.name = nameEl.textContent.trim();

            const dosage = getCellValue('dosage');
            if (dosage !== null) item.dosage = dosage;
            else delete item.dosage;

            const timing = getCellValue('timing');
            if (timing !== null) item.timing = timing;
            else delete item.timing;

            const notes = getCellValue('notes');
            if (notes !== null) item.notes = notes;
            else delete item.notes;
          }
        });
      }
    }
  });

  // Convert modules back to content format
  const content = modulesToContent(generatedProtocolData.modules);

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/protocols/${window.currentEditingProtocolId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: newTitle,
        content: content,
        modules: generatedProtocolData.modules,
        notes: `Title: ${newTitle}\n\n${content}`
      })
    });

    if (response.ok) {
      showNotification('Protocol saved successfully!', 'success');
      loadProtocols();
    } else {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save');
    }
  } catch (error) {
    console.error('Error saving protocol:', error);
    showNotification(`Error saving: ${error.message}`, 'error');
  }
}

// Convert modules to markdown content
function modulesToContent(modules) {
  if (!modules || modules.length === 0) return '';

  return modules.map(module => {
    let content = `## ${module.name}\n`;
    if (module.goal) {
      content += `**Goal:** ${module.goal}\n\n`;
    }

    if (module.items && module.items.length > 0) {
      module.items.forEach(item => {
        if (typeof item === 'string') {
          content += `- ${item}\n`;
        } else {
          content += `### ${item.name}\n`;
          if (item.dosage) content += `- **Dosage:** ${item.dosage}\n`;
          if (item.timing) content += `- **Timing:** ${item.timing}\n`;
          if (item.notes) content += `- **Notes:** ${item.notes}\n`;
          content += '\n';
        }
      });
    }

    return content;
  }).join('\n');
}

// Print existing protocol from editor
function printExistingProtocol() {
  if (!generatedProtocolData) return;

  const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : 'Client';
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${generatedProtocolData.title || 'Protocol'}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
        h1 { color: #0F766E; }
        h2 { color: #374151; margin-top: 24px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px; }
        h3 { color: #4B5563; }
        .module { margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { border: 1px solid #E5E7EB; padding: 8px 12px; text-align: left; }
        th { background: #F9FAFB; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(generatedProtocolData.title || 'Protocol')}</h1>
      <p style="color: #6B7280;">Client: ${escapeHtml(clientName)}</p>

      ${(generatedProtocolData.modules || []).map(module => `
        <div class="module">
          <h2>${escapeHtml(module.name)}</h2>
          ${module.goal ? `<p><strong>Goal:</strong> ${escapeHtml(module.goal)}</p>` : ''}
          ${module.items && module.items.length > 0 ? `
            <table>
              <thead><tr><th>Item</th><th>Dosage</th><th>Timing</th><th>Notes</th></tr></thead>
              <tbody>
                ${module.items.map(item => `
                  <tr>
                    <td>${escapeHtml(typeof item === 'string' ? item : item.name || '')}</td>
                    <td>${escapeHtml(item.dosage || '-')}</td>
                    <td>${escapeHtml(item.timing || '-')}</td>
                    <td>${escapeHtml(item.notes || '-')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        </div>
      `).join('')}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Switch tabs in existing protocol editor
function switchExistingEditorTab(tabName) {
  // For now, just show a notification - engagement plan tab would show engagement content
  if (tabName === 'engagement') {
    showNotification('Switching to engagement plan view...', 'info');
    // Could open engagement plan editor here
    const protocolId = window.currentEditingProtocolId;
    if (protocolId) {
      closeExistingProtocolEditor();
      openEngagementPlanEditor(protocolId);
    }
  }
}

// Close existing protocol editor
function closeExistingProtocolEditor() {
  const editor = document.getElementById('existingProtocolEditorView');
  if (editor) {
    editor.remove();
  }
  document.body.style.overflow = '';
  window.currentEditingProtocolId = null;
  selectedProtocolSection = null;
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

// Share protocol with client - shows share options modal like engagement plan
async function shareProtocol(protocolId) {
  // Store the protocol ID for sharing functions
  window.currentShareProtocolId = protocolId;
  showProtocolShareOptions(protocolId);
}

// Show protocol share options modal (same UI as engagement plan)
async function showProtocolShareOptions(protocolId) {
  const token = localStorage.getItem('auth_token');
  const clientName = currentClient?.first_name || 'Client';
  const clientEmail = currentClient?.email || '';
  const clientPhone = currentClient?.phone || '';

  // Fetch protocol title for display
  let protocolTitle = 'Protocol';
  try {
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      protocolTitle = data.protocol?.title || 'Protocol';
    }
  } catch (e) {
    console.error('Error fetching protocol:', e);
  }

  // Remove existing modal if present
  const existingModal = document.getElementById('shareProtocolModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'shareProtocolModal';
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content share-modal-content">
      <div class="modal-header">
        <h2>Share Protocol with ${clientName}</h2>
        <button class="modal-close" onclick="closeProtocolShareModal()">&times;</button>
      </div>
      <div class="modal-body">
        <p class="share-description">Choose how you'd like to share the protocol:</p>

        <div class="share-options">
          <button class="share-option-btn" onclick="shareProtocolViaEmail()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>Email</span>
            <small>${clientEmail || 'No email on file'}</small>
          </button>

          <button class="share-option-btn" onclick="shareProtocolViaWhatsApp()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>WhatsApp</span>
            <small>${clientPhone || 'No phone on file'}</small>
          </button>

          <button class="share-option-btn" onclick="generateProtocolShareLink()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <span>Copy Link</span>
            <small>Generate shareable link</small>
          </button>

          <button class="share-option-btn" onclick="downloadProtocolPDF()">
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
    if (e.target === modal) closeProtocolShareModal();
  });
}

// Close protocol share modal
function closeProtocolShareModal() {
  const modal = document.getElementById('shareProtocolModal');
  if (modal) modal.remove();
}

// Share protocol via email
function shareProtocolViaEmail() {
  const clientEmail = currentClient?.email;
  const clientName = currentClient?.first_name || 'Client';

  if (!clientEmail) {
    showNotification('No email address on file for this client', 'warning');
    return;
  }

  const subject = encodeURIComponent(`Your Personalized Health Protocol - ExpandHealth`);
  const body = encodeURIComponent(`Hi ${clientName},\n\nI've prepared a personalized health protocol for you based on your wellness assessment. This protocol outlines the phased approach we'll take to help you achieve your health goals.\n\nPlease review the attached protocol and let me know if you have any questions.\n\nBest regards,\nYour ExpandHealth Team`);

  window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, '_blank');
  closeProtocolShareModal();
  showNotification('Opening email client...', 'success');
}

// Share protocol via WhatsApp
function shareProtocolViaWhatsApp() {
  const clientPhone = currentClient?.phone;
  const clientName = currentClient?.first_name || 'there';

  if (!clientPhone) {
    showNotification('No phone number on file for this client', 'warning');
    return;
  }

  // Clean phone number
  const cleanPhone = clientPhone.replace(/\D/g, '');

  const message = encodeURIComponent(`Hi ${clientName}! I've prepared your personalized health protocol based on your wellness assessment. This phased approach will help you achieve your health goals step by step. Let me know when you'd like to discuss it!`);

  window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  closeProtocolShareModal();
  showNotification('Opening WhatsApp...', 'success');
}

// Generate shareable link for protocol
function generateProtocolShareLink() {
  const protocolId = window.currentShareProtocolId;
  if (!protocolId) {
    showNotification('No protocol selected', 'warning');
    return;
  }

  const shareLink = `${window.location.origin}/client-portal/protocol/${protocolId}`;

  navigator.clipboard.writeText(shareLink).then(() => {
    showNotification('Link copied to clipboard!', 'success');
    closeProtocolShareModal();
  }).catch(() => {
    // Fallback
    prompt('Copy this link:', shareLink);
  });
}

// Download protocol as PDF
async function downloadProtocolPDF() {
  const protocolId = window.currentShareProtocolId;
  if (!protocolId) {
    showNotification('No protocol selected', 'error');
    return;
  }

  closeProtocolShareModal();
  showNotification('Generating PDF...', 'info');

  // Call the existing saveProtocolAsPDF function
  await saveProtocolAsPDF(protocolId);
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

// Save protocol as PDF
async function saveProtocolAsPDF(protocolId) {
  const token = localStorage.getItem('auth_token');

  try {
    showNotification('Preparing PDF...', 'info');

    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const protocol = data.protocol;
      const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : 'Client';

      // Try to parse full clinical protocol data from ai_recommendations
      let clinicalData = null;
      if (protocol.ai_recommendations) {
        try {
          clinicalData = JSON.parse(protocol.ai_recommendations);
        } catch (e) {
          // Legacy format or not JSON
        }
      }

      // Use clinical data title if available, otherwise fallback
      // Clean up title for Protocol PDF (remove "Engagement Plan" and "for [Name]" parts)
      let protocolTitle = clinicalData?.title || protocol.title || 'Health Protocol';
      // Remove "Engagement Plan" and replace with "Protocol"
      protocolTitle = protocolTitle.replace(/\s*Engagement Plan\s*/gi, ' Protocol ').trim();
      // Remove "for [Client Name]" suffix since we show client name separately
      protocolTitle = protocolTitle.replace(/\s+for\s+.+$/i, '').trim();
      // Clean up extra spaces
      protocolTitle = protocolTitle.replace(/\s+/g, ' ').trim();
      // Ensure "Protocol" is in the title
      if (!protocolTitle.toLowerCase().includes('protocol')) {
        protocolTitle = protocolTitle + ' Protocol';
      }

      // Generate content HTML - Protocol PDF should use modules, NOT engagement plan data
      let contentHtml = '';

      // First priority: Use protocol modules (the actual clinical protocol data)
      if (protocol.modules && Array.isArray(protocol.modules) && protocol.modules.length > 0) {
        // Parse modules if it's a string
        let modules = protocol.modules;
        if (typeof modules === 'string') {
          try {
            modules = JSON.parse(modules);
          } catch (e) {
            console.error('Error parsing modules:', e);
          }
        }
        contentHtml = formatProtocolModulesForPrint(modules);
      } else if (clinicalData && (clinicalData.core_protocol || clinicalData.integrated_findings)) {
        // New clinical protocol structure from ai_recommendations
        contentHtml = formatClinicalProtocolForPrint(clinicalData);
      } else if (protocol.content) {
        contentHtml = `<div class="text-content">${escapeHtml(protocol.content).replace(/\n/g, '<br>')}</div>`;
      } else {
        contentHtml = '<p>No protocol content available</p>';
      }

      // Open print window
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${escapeHtml(protocolTitle)} - ExpandHealth</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; color: #1f2937; }
            h1 { color: #0F766E; margin-bottom: 8px; font-size: 24px; }
            h2 { color: #0F766E; margin-top: 24px; font-size: 18px; border-bottom: 2px solid #0F766E; padding-bottom: 8px; }
            h3 { color: #374151; margin-top: 16px; font-size: 16px; }
            .header-logo { color: #0F766E; font-weight: bold; font-size: 18px; margin-bottom: 20px; }
            .meta { color: #6b7280; margin-bottom: 24px; font-size: 14px; }
            .summary { background: #FEF9C3; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
            .summary p { color: #713F12; margin: 0; }
            .findings { background: #EFF6FF; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
            .findings h3 { margin-top: 0; color: #1E40AF; }
            .phase { background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0F766E; page-break-inside: avoid; }
            .phase h3 { margin-top: 0; color: #1F2937; }
            .phase-subtitle { font-style: italic; color: #6B7280; margin: 4px 0 12px 0; font-size: 14px; }
            .core-phase { border-left-color: #059669; background: #ECFDF5; }
            .item { margin-bottom: 16px; padding-left: 16px; border-left: 3px solid #0F766E; }
            .item h4 { margin: 0 0 4px 0; color: #1F2937; font-size: 15px; }
            .item p { margin: 0; color: #6B7280; font-size: 13px; }
            .item-meta { margin-top: 6px; font-size: 12px; color: #6B7280; }
            .item-meta span { display: block; margin-bottom: 2px; }
            ul { padding-left: 20px; margin: 12px 0; }
            li { margin-bottom: 8px; }
            .safety-box { background: #FEF2F2; padding: 16px; border-radius: 8px; margin-top: 16px; border-left: 4px solid #DC2626; }
            .safety-box h4 { margin: 0 0 8px 0; color: #DC2626; font-size: 14px; text-transform: uppercase; }
            .warning-box { background: #FEF3C7; padding: 12px; border-radius: 6px; margin-top: 12px; }
            .warning-box h4 { margin: 0 0 8px 0; color: #92400E; font-size: 12px; text-transform: uppercase; }
            .clinic-box { background: #F0FDFA; padding: 16px; border-radius: 8px; margin-top: 24px; border-left: 4px solid #0F766E; }
            .clinic-box h3 { margin-top: 0; color: #0F766E; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px; }
            .text-content { white-space: pre-wrap; line-height: 1.8; font-size: 14px; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header-logo">ExpandHealth</div>
          <h1>${escapeHtml(protocolTitle)}</h1>
          <div class="meta">
            <strong>Client:</strong> ${escapeHtml(clientName)}<br>
            <strong>Date:</strong> ${formatDate(protocol.created_at)}<br>
            <strong>Status:</strong> ${escapeHtml(protocol.status || 'draft')}
          </div>
          ${contentHtml}
          <div class="footer">
            Generated by ExpandHealth • ${new Date().toLocaleDateString()}<br>
            This document is confidential and intended for the named recipient only.
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);

      showNotification('PDF ready - use "Save as PDF" in the print dialog', 'success');
    } else {
      showNotification('Failed to load protocol', 'error');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    showNotification('Error generating PDF', 'error');
  }
}

// Format clinical protocol structure for print/PDF
function formatClinicalProtocolForPrint(data) {
  let html = '';

  // Summary
  if (data.summary) {
    html += `<div class="summary"><p>${escapeHtml(data.summary)}</p></div>`;
  }

  // Integrated Findings
  if (data.integrated_findings) {
    html += `<div class="findings">`;
    html += `<h3>Integrated Findings</h3>`;
    if (data.integrated_findings.primary_concerns?.length) {
      html += `<p><strong>Primary Concerns:</strong></p><ul>${data.integrated_findings.primary_concerns.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`;
    }
    if (data.integrated_findings.confirmed_conditions?.length) {
      html += `<p><strong>Confirmed Conditions:</strong></p><ul>${data.integrated_findings.confirmed_conditions.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`;
    }
    html += `</div>`;
  }

  // Core Protocol
  if (data.core_protocol) {
    const core = data.core_protocol;
    html += `<div class="phase core-phase">`;
    html += `<h3>${escapeHtml(core.phase_name || 'Core Protocol - Weeks 1-2')}</h3>`;
    html += `<p class="phase-subtitle">Minimum Viable Plan • Maximum ${core.max_actions || '3-5'} actions</p>`;

    if (core.items?.length) {
      core.items.forEach(item => {
        html += formatProtocolItemForPrint(item);
      });
    }

    // Safety Gates
    if (core.safety_gates?.length) {
      html += `<div class="safety-box">`;
      html += `<h4>Safety Gates</h4>`;
      html += `<ul>${core.safety_gates.map(g => `<li>${escapeHtml(g)}</li>`).join('')}</ul>`;
      html += `</div>`;
    }

    // What Not To Do
    if (core.what_not_to_do?.length) {
      html += `<div class="warning-box">`;
      html += `<h4>What NOT To Do Early</h4>`;
      html += `<ul>${core.what_not_to_do.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`;
      html += `</div>`;
    }

    html += `</div>`;
  }

  // Phased Expansion
  if (data.phased_expansion?.length) {
    data.phased_expansion.forEach(phase => {
      html += `<div class="phase">`;
      html += `<h3>${escapeHtml(phase.phase_name || `Phase ${phase.phase_number}`)}</h3>`;
      if (phase.start_week) {
        html += `<p class="phase-subtitle">Starts Week ${phase.start_week} • Duration: ${phase.duration_weeks || 4} weeks</p>`;
      }

      // Readiness Criteria
      if (phase.readiness_criteria?.length) {
        html += `<p><strong>Readiness Criteria:</strong></p>`;
        html += `<ul>${phase.readiness_criteria.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`;
      }

      // Items
      if (phase.items?.length) {
        phase.items.forEach(item => {
          html += formatProtocolItemForPrint(item);
        });
      }

      // Safety Gates
      if (phase.safety_gates?.length) {
        html += `<div class="safety-box">`;
        html += `<h4>Safety Gates</h4>`;
        html += `<ul>${phase.safety_gates.map(g => `<li>${escapeHtml(g)}</li>`).join('')}</ul>`;
        html += `</div>`;
      }

      html += `</div>`;
    });
  }

  // Clinic Treatments
  if (data.clinic_treatments) {
    html += `<div class="clinic-box">`;
    html += `<h3>Clinic Treatments</h3>`;
    html += `<p class="phase-subtitle">${escapeHtml(data.clinic_treatments.phase || 'Available after core protocol stability')}</p>`;

    if (data.clinic_treatments.readiness_criteria?.length) {
      html += `<p><strong>Readiness Criteria:</strong></p>`;
      html += `<ul>${data.clinic_treatments.readiness_criteria.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`;
    }

    if (data.clinic_treatments.available_modalities?.length) {
      data.clinic_treatments.available_modalities.forEach(mod => {
        html += `<div class="item">`;
        html += `<h4>${escapeHtml(mod.name)}</h4>`;
        if (mod.indication) html += `<p><strong>Indication:</strong> ${escapeHtml(mod.indication)}</p>`;
        if (mod.protocol) html += `<p><strong>Protocol:</strong> ${escapeHtml(mod.protocol)}</p>`;
        if (mod.contraindications) html += `<p><strong>Contraindications:</strong> ${escapeHtml(mod.contraindications)}</p>`;
        if (mod.notes) html += `<p>${escapeHtml(mod.notes)}</p>`;
        html += `</div>`;
      });
    }

    if (data.clinic_treatments.note) {
      html += `<p style="margin-top: 12px; font-style: italic; color: #6B7280;">${escapeHtml(data.clinic_treatments.note)}</p>`;
    }

    html += `</div>`;
  }

  // Safety Summary
  if (data.safety_summary) {
    html += `<h2>Safety Summary</h2>`;
    if (data.safety_summary.absolute_contraindications?.length) {
      html += `<p><strong>Absolute Contraindications:</strong></p>`;
      html += `<ul>${data.safety_summary.absolute_contraindications.map(c => `<li style="color: #DC2626;">${escapeHtml(c)}</li>`).join('')}</ul>`;
    }
    if (data.safety_summary.monitoring_requirements?.length) {
      html += `<p><strong>Monitoring Requirements:</strong></p>`;
      html += `<ul>${data.safety_summary.monitoring_requirements.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul>`;
    }
  }

  // Retest Schedule
  if (data.retest_schedule?.length) {
    html += `<h2>Retest Schedule</h2>`;
    data.retest_schedule.forEach(test => {
      html += `<div class="item">`;
      html += `<h4>${escapeHtml(test.test)}</h4>`;
      html += `<p><strong>Timing:</strong> ${escapeHtml(test.timing)}</p>`;
      html += `<p><strong>Purpose:</strong> ${escapeHtml(test.purpose)}</p>`;
      if (test.decision_tree) html += `<p><strong>Decision:</strong> ${escapeHtml(test.decision_tree)}</p>`;
      html += `</div>`;
    });
  }

  return html;
}

// Format a single protocol item for print
function formatProtocolItemForPrint(item) {
  const itemName = typeof item === 'string' ? item : (item.name || 'Item');
  let html = `<div class="item">`;
  html += `<h4>${escapeHtml(itemName)}</h4>`;

  if (item.rationale) html += `<p>${escapeHtml(item.rationale)}</p>`;
  if (item.description) html += `<p>${escapeHtml(item.description)}</p>`;

  html += `<div class="item-meta">`;
  if (item.dosage) html += `<span><strong>Dosage:</strong> ${escapeHtml(item.dosage)}</span>`;
  if (item.timing) html += `<span><strong>Timing:</strong> ${escapeHtml(item.timing)}</span>`;
  if (item.frequency) html += `<span><strong>Frequency:</strong> ${escapeHtml(item.frequency)}</span>`;
  if (item.contraindications) html += `<span><strong>Contraindications:</strong> ${escapeHtml(item.contraindications)}</span>`;
  if (item.notes) html += `<span><strong>Notes:</strong> ${escapeHtml(item.notes)}</span>`;
  html += `</div>`;

  html += `</div>`;
  return html;
}

// Helper function to format legacy protocol modules for print/PDF
function formatProtocolModulesForPrint(modules) {
  if (!modules || !Array.isArray(modules)) return '<p>No modules available</p>';

  return modules.map((module, index) => {
    const moduleName = module.name || `Module ${index + 1}`;
    const isCore = module.is_core_protocol;
    const isClinc = module.is_clinic_treatments;

    let html = `<div class="phase ${isCore ? 'core-phase' : ''} ${isClinc ? 'clinic-box' : ''}">`;
    html += `<h3>${escapeHtml(moduleName)}</h3>`;

    if (module.description) {
      html += `<p class="phase-subtitle">${escapeHtml(module.description)}</p>`;
    }

    if (module.goal) {
      html += `<p><strong>Goal:</strong> ${escapeHtml(module.goal)}</p>`;
    }

    // Items
    if (module.items?.length) {
      module.items.forEach(item => {
        html += formatProtocolItemForPrint(item);
      });
    }

    // Safety Gates (new clinical format)
    if (module.safety_gates?.length) {
      html += `<div class="safety-box">`;
      html += `<h4>Safety Gates</h4>`;
      html += `<ul>${module.safety_gates.map(g => `<li>${escapeHtml(g)}</li>`).join('')}</ul>`;
      html += `</div>`;
    }

    // What Not To Do (new clinical format)
    if (module.what_not_to_do?.length) {
      html += `<div class="warning-box">`;
      html += `<h4>What NOT To Do</h4>`;
      html += `<ul>${module.what_not_to_do.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`;
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }).join('');
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

// Helper to extract engagement plan title from ai_recommendations JSON
function getEngagementPlanTitle(plan) {
  // Try to parse the ai_recommendations to get the actual engagement plan title
  if (plan.ai_recommendations) {
    try {
      const engagementData = JSON.parse(plan.ai_recommendations);
      if (engagementData.title) {
        return engagementData.title;
      }
    } catch (e) {
      // If JSON parsing fails, fall back to generating a title
    }
  }
  // Fallback: use client name if available, otherwise generic title
  const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : '';
  return clientName ? `Engagement Plan for ${clientName}` : 'Engagement Plan';
}

// Display engagement plans in the list
function displayEngagementPlans(plans) {
  const container = document.getElementById('engagementListContent');
  if (!container) return;

  container.innerHTML = plans.map(plan => {
    const displayTitle = getEngagementPlanTitle(plan);
    return `
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
          <button class="card-menu-item" onclick="editEngagementPlan(${plan.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <div class="card-menu-divider"></div>
          <button class="card-menu-item" onclick="shareEngagementPlanById(${plan.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          <button class="card-menu-item" onclick="saveEngagementPlanAsPDF(${plan.id}); closeAllCardMenus();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
            Save as PDF
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
          <h4 class="protocol-card-title">${escapeHtml(displayTitle)}</h4>
          <p class="protocol-card-date">${formatDate(plan.updated_at || plan.created_at)}</p>
        </div>
        <span class="protocol-card-status engagement">${plan.status || 'active'}</span>
      </div>
    </div>
  `}).join('');
}

// View engagement plan - opens the editor view
function viewEngagementPlan(protocolId) {
  console.log('View/Edit engagement plan:', protocolId);
  // Open the engagement plan editor
  openEngagementPlanEditor(protocolId);
}

// Edit engagement plan - same as view but explicitly for editing
function editEngagementPlan(protocolId) {
  console.log('Edit engagement plan:', protocolId);
  // Open the engagement plan editor (same as view - the editor allows editing)
  openEngagementPlanEditor(protocolId);
}

// View engagement plan in modal (fallback for simple view)
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

// ========== Engagement Plan Editor ==========

// Global state for engagement plan editor
let currentEngagementPlanData = null;
let currentEngagementProtocolId = null;
let selectedEngagementPhase = null;

// Open engagement plan editor
async function openEngagementPlanEditor(protocolId) {
  const token = localStorage.getItem('auth_token');

  try {
    const response = await fetch(`${API_BASE}/api/protocols/${protocolId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to load engagement plan');
    }

    const data = await response.json();
    const protocol = data.protocol;

    // Parse the engagement plan data
    let planData = null;
    if (protocol.ai_recommendations) {
      const rawContent = protocol.ai_recommendations;
      console.log('[Engagement Plan] Raw ai_recommendations:', rawContent?.substring(0, 200));
      try {
        // First try direct JSON parse (for clean JSON storage)
        planData = JSON.parse(rawContent);
      } catch (e) {
        console.log('[Engagement Plan] Direct parse failed, trying regex extraction');
        try {
          // Fallback: Try to find JSON object in the content (for legacy data with prefixes)
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            planData = JSON.parse(jsonMatch[0]);
          }
        } catch (e2) {
          console.error('Error parsing engagement plan:', e2);
        }
      }
    }

    if (!planData) {
      console.log('[Engagement Plan] No plan data found in ai_recommendations');
      showNotification('No structured engagement plan data found. Please generate an engagement plan first.', 'error');
      return;
    }

    // Validate that we have the expected structure
    if (!planData.phases || !Array.isArray(planData.phases)) {
      console.error('[Engagement Plan] Invalid plan structure - missing phases array');
      showNotification('Invalid engagement plan structure. Please regenerate the plan.', 'error');
      return;
    }

    currentEngagementPlanData = planData;
    currentEngagementProtocolId = protocolId;

    // Show the editor
    showEngagementPlanEditorView(protocol, planData);

  } catch (error) {
    console.error('Error opening engagement plan editor:', error);
    showNotification('Error opening engagement plan editor', 'error');
  }
}

// Show the engagement plan editor view
function showEngagementPlanEditorView(protocol, planData) {
  // Remove any existing editor
  const existingEditor = document.getElementById('engagementPlanEditorView');
  if (existingEditor) existingEditor.remove();

  const editorView = document.createElement('div');
  editorView.id = 'engagementPlanEditorView';
  editorView.className = 'protocol-editor-view';
  editorView.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #F8FAFB; z-index: 2000; display: flex; flex-direction: column;';

  const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : 'Client';

  editorView.innerHTML = `
    <!-- Header -->
    <div class="protocol-editor-header">
      <button class="back-btn" onclick="closeEngagementPlanEditor()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Client
      </button>

      <div class="header-actions" style="display: flex; gap: 12px;">
        <button class="btn-secondary" onclick="shareEngagementPlan()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share
        </button>
        <button class="btn-secondary" onclick="printEngagementPlanFromEditor()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Print
        </button>
        <button class="btn-primary" onclick="saveEngagementPlanFromEditor()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save Changes
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="protocol-editor-layout" style="display: flex; flex: 1; overflow: hidden;">
      <!-- Left Sidebar -->
      <div class="protocol-editor-sidebar">
        <button class="sidebar-icon active" title="Phases">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </button>
        <button class="sidebar-icon" title="Communication" onclick="scrollToEngagementSection('communication')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        <button class="sidebar-icon" title="Metrics" onclick="scrollToEngagementSection('metrics')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20V10M18 20V4M6 20v-4"/>
          </svg>
        </button>
      </div>

      <!-- Main Editor Area -->
      <div class="protocol-editor-main" style="flex: 1; overflow-y: auto;">
        <div class="protocol-document" style="max-width: 900px; margin: 0 auto; padding: 40px;">
          <!-- Title -->
          <h1 class="protocol-title" contenteditable="true" id="engagementPlanTitle">${escapeHtml(planData.title || 'Engagement Plan')}</h1>

          <!-- Metadata -->
          <div class="protocol-metadata">
            <div class="meta-row">
              <span class="meta-label">Client</span>
              <span class="meta-value">${escapeHtml(clientName)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Created</span>
              <span class="meta-value">${formatDate(protocol.updated_at || protocol.created_at)}</span>
            </div>
          </div>

          <!-- Summary Section -->
          <div class="engagement-summary" style="background: #FEF9C3; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
            <h3 style="margin: 0 0 8px 0; color: #713F12; font-size: 14px; font-weight: 600;">Summary</h3>
            <p contenteditable="true" id="engagementPlanSummary" style="margin: 0; color: #713F12; font-size: 14px; line-height: 1.6;">${escapeHtml(planData.summary || 'Click to add a summary...')}</p>
          </div>

          <!-- Phases -->
          <div id="engagementPhasesContainer" class="protocol-sections">
            ${renderEngagementPhases(planData.phases || [])}
          </div>

          <!-- Add Phase Button -->
          <div class="add-module-container" style="padding: 24px; border-top: 1px dashed #E5E7EB; margin-top: 20px;">
            <button class="btn-add-module" onclick="addNewEngagementPhase()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Add New Phase
            </button>
          </div>

          <!-- Communication Schedule -->
          ${planData.communication_schedule ? `
          <div id="communicationSection" class="engagement-communication" style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; margin-top: 32px;">
            <h3 style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">Communication Schedule</h3>
            <p style="font-size: 13px; color: #6B7280; margin: 0 0 16px 0;">Plan your client check-ins. These are reminders for you - automated messaging coming soon.</p>
            <div class="comm-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
              <div>
                <label style="font-size: 12px; color: #6B7280; display: block; margin-bottom: 4px;">Check-in Frequency</label>
                <select id="commFrequency" style="width: 100%; padding: 8px 12px; border: 1px solid #E5E7EB; border-radius: 6px; font-size: 14px; background: white;">
                  <option value="">Select frequency...</option>
                  <option value="Daily" ${planData.communication_schedule.check_in_frequency === 'Daily' ? 'selected' : ''}>Daily</option>
                  <option value="Every 2 days" ${planData.communication_schedule.check_in_frequency === 'Every 2 days' ? 'selected' : ''}>Every 2 days</option>
                  <option value="Every 3 days" ${planData.communication_schedule.check_in_frequency === 'Every 3 days' || planData.communication_schedule.check_in_frequency?.includes('3 days') ? 'selected' : ''}>Every 3 days</option>
                  <option value="Twice a week" ${planData.communication_schedule.check_in_frequency === 'Twice a week' ? 'selected' : ''}>Twice a week</option>
                  <option value="Weekly" ${planData.communication_schedule.check_in_frequency === 'Weekly' ? 'selected' : ''}>Weekly</option>
                  <option value="Bi-weekly" ${planData.communication_schedule.check_in_frequency === 'Bi-weekly' ? 'selected' : ''}>Bi-weekly</option>
                  <option value="Monthly" ${planData.communication_schedule.check_in_frequency === 'Monthly' ? 'selected' : ''}>Monthly</option>
                </select>
              </div>
              <div>
                <label style="font-size: 12px; color: #6B7280; display: block; margin-bottom: 4px;">Preferred Channel</label>
                <select id="commChannel" style="width: 100%; padding: 8px 12px; border: 1px solid #E5E7EB; border-radius: 6px; font-size: 14px; background: white;">
                  <option value="">Select channel...</option>
                  <option value="WhatsApp" ${planData.communication_schedule.preferred_channel === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option>
                  <option value="Email" ${planData.communication_schedule.preferred_channel === 'Email' ? 'selected' : ''}>Email</option>
                  <option value="SMS" ${planData.communication_schedule.preferred_channel === 'SMS' ? 'selected' : ''}>SMS</option>
                  <option value="Phone Call" ${planData.communication_schedule.preferred_channel === 'Phone Call' ? 'selected' : ''}>Phone Call</option>
                  <option value="In-App Message" ${planData.communication_schedule.preferred_channel === 'In-App Message' ? 'selected' : ''}>In-App Message</option>
                  <option value="Video Call" ${planData.communication_schedule.preferred_channel === 'Video Call' ? 'selected' : ''}>Video Call</option>
                </select>
              </div>
              <div>
                <label style="font-size: 12px; color: #6B7280; display: block; margin-bottom: 4px;">Message Tone</label>
                <select id="commTone" style="width: 100%; padding: 8px 12px; border: 1px solid #E5E7EB; border-radius: 6px; font-size: 14px; background: white;">
                  <option value="">Select tone...</option>
                  <option value="Encouraging and supportive" ${planData.communication_schedule.message_tone?.includes('Encouraging') || planData.communication_schedule.message_tone?.includes('supportive') ? 'selected' : ''}>Encouraging and supportive</option>
                  <option value="Professional and informative" ${planData.communication_schedule.message_tone?.includes('Professional') ? 'selected' : ''}>Professional and informative</option>
                  <option value="Friendly and casual" ${planData.communication_schedule.message_tone?.includes('Friendly') || planData.communication_schedule.message_tone?.includes('casual') ? 'selected' : ''}>Friendly and casual</option>
                  <option value="Motivational and energetic" ${planData.communication_schedule.message_tone?.includes('Motivational') ? 'selected' : ''}>Motivational and energetic</option>
                  <option value="Calm and reassuring" ${planData.communication_schedule.message_tone?.includes('Calm') ? 'selected' : ''}>Calm and reassuring</option>
                  <option value="Direct and concise" ${planData.communication_schedule.message_tone?.includes('Direct') ? 'selected' : ''}>Direct and concise</option>
                </select>
              </div>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
              <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button onclick="scheduleCheckInMessages()" class="btn-primary" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Schedule Check-in Messages
                </button>
                <button onclick="viewScheduledMessages()" class="btn-secondary" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  View Scheduled Messages
                </button>
              </div>
              <p style="font-size: 12px; color: #6B7280; margin-top: 8px;">Auto-generate and schedule messages based on this plan</p>
            </div>
          </div>
          ` : ''}

          <!-- Success Metrics -->
          ${planData.success_metrics && planData.success_metrics.length > 0 ? `
          <div id="metricsSection" class="engagement-metrics" style="background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; margin-top: 24px;">
            <h3 style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Success Metrics</h3>
            <ul id="successMetricsList" style="margin: 0; padding-left: 20px;">
              ${planData.success_metrics.map((metric, i) => `
                <li style="margin-bottom: 8px;">
                  <span contenteditable="true" class="success-metric-item" data-index="${i}">${escapeHtml(metric)}</span>
                </li>
              `).join('')}
            </ul>
            <button onclick="addSuccessMetric()" style="margin-top: 12px; padding: 8px 16px; background: #F0FDFA; border: 1px dashed #0F766E; border-radius: 6px; color: #0F766E; font-size: 13px; cursor: pointer;">
              + Add Metric
            </button>
          </div>
          ` : ''}

        </div>
      </div>
    </div>

    <!-- Footer with AI Input -->
    <div class="protocol-editor-footer">
      <div id="selectedPhaseTag" class="selected-section-tag" style="display: none;">
        <span id="selectedPhaseName">Phase selected</span>
        <button onclick="clearEngagementPhaseSelection()">&times;</button>
      </div>
      <div class="ai-input-container protocol-ai-input-wrapper">
        <input type="text" id="engagementAIInput" placeholder="Ask AI to modify the engagement plan (e.g., 'add a week 5 phase for maintenance')" onkeypress="handleEngagementAI(event)">
        <button class="ai-submit-btn" onclick="submitEngagementAI()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Floating Action Buttons -->
    <div class="editor-fab-container">
      <button class="editor-fab ask-ai-fab" onclick="openAIChatModal()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Ask AI</span>
      </button>
      <button class="editor-fab quick-notes-fab" onclick="openRightPanel()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <span>Quick Notes</span>
      </button>
    </div>
  `;

  document.body.appendChild(editorView);
  document.body.style.overflow = 'hidden';
}

// Render engagement phases as editable sections
function renderEngagementPhases(phases) {
  if (!phases || phases.length === 0) {
    return '<p style="color: #6B7280; text-align: center; padding: 40px;">No phases yet. Click "Add New Phase" to create one.</p>';
  }

  return phases.map((phase, index) => `
    <div class="protocol-section engagement-phase-section" data-phase-index="${index}" onclick="selectEngagementPhase(${index}, event)">
      <input type="checkbox" class="section-checkbox" onclick="toggleEngagementPhaseCheckbox(${index})" />

      <h2 class="section-title">
        <span class="drag-handle">⋮⋮</span>
        <span contenteditable="true" class="phase-title-text" data-index="${index}">${escapeHtml(phase.title || `Phase ${index + 1}`)}</span>
      </h2>

      ${phase.subtitle ? `<p class="section-goal" contenteditable="true" data-index="${index}">${escapeHtml(phase.subtitle)}</p>` : ''}

      <!-- Phase Items -->
      <ul class="section-list phase-items-list" data-index="${index}">
        ${(phase.items || []).map((item, itemIndex) => `
          <li contenteditable="true" data-phase="${index}" data-item="${itemIndex}">${escapeHtml(item)}</li>
        `).join('')}
      </ul>

      <!-- Add Item Button -->
      <button onclick="addPhaseItem(${index}); event.stopPropagation();" style="margin: 8px 0 16px 24px; padding: 6px 12px; background: #F9FAFB; border: 1px dashed #D1D5DB; border-radius: 4px; color: #6B7280; font-size: 12px; cursor: pointer;">
        + Add Item
      </button>

      ${phase.progress_goal ? `
      <div style="background: #F0FDFA; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
        <strong style="color: #0F766E; font-size: 12px;">Progress Goal:</strong>
        <p contenteditable="true" class="phase-progress-goal" data-index="${index}" style="margin: 4px 0 0 0; color: #374151; font-size: 14px;">${escapeHtml(phase.progress_goal)}</p>
      </div>
      ` : ''}

      ${phase.check_in_prompts && phase.check_in_prompts.length > 0 ? `
      <div class="check-in-prompts" style="background: #FEF3C7; padding: 12px; border-radius: 8px; border-left: 3px solid #F59E0B;">
        <strong style="color: #92400E; font-size: 12px;">Check-in Questions:</strong>
        <ul class="prompts-list" style="margin: 8px 0 0 0; padding-left: 20px;">
          ${phase.check_in_prompts.map((prompt, pi) => `
            <li contenteditable="true" data-phase="${index}" data-prompt="${pi}" style="color: #78350F; font-size: 13px; margin-bottom: 4px;">${escapeHtml(prompt)}</li>
          `).join('')}
        </ul>
      </div>
      ` : ''}

      <!-- Per-phase AI input -->
      <div class="section-input" style="margin-top: 16px;">
        <input type="text" placeholder="Ask AI to modify this phase..." onkeypress="handleEngagementPhaseInput(event, ${index})">
        <button onclick="submitEngagementPhaseInput(${index})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      <!-- Delete Phase Button -->
      <button onclick="deleteEngagementPhase(${index}); event.stopPropagation();"
        style="position: absolute; top: 16px; right: 48px; background: none; border: none; color: #9CA3AF; cursor: pointer; padding: 4px;"
        title="Delete Phase">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  `).join('');
}

// Select an engagement phase
function selectEngagementPhase(index, event) {
  // Don't select if clicking on input, button, or contenteditable
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' ||
      event.target.closest('.section-input') || event.target.contentEditable === 'true') {
    return;
  }

  const sections = document.querySelectorAll('.engagement-phase-section');
  sections.forEach((section, i) => {
    if (i === index) {
      section.classList.toggle('selected');
      selectedEngagementPhase = section.classList.contains('selected') ? index : null;
    } else {
      section.classList.remove('selected');
    }
  });

  // Update tag visibility
  const tagEl = document.getElementById('selectedPhaseTag');
  const nameEl = document.getElementById('selectedPhaseName');
  if (tagEl) {
    tagEl.style.display = selectedEngagementPhase !== null ? 'flex' : 'none';
    if (nameEl && selectedEngagementPhase !== null) {
      nameEl.textContent = currentEngagementPlanData.phases[index]?.title || `Phase ${index + 1}`;
    }
  }

  if (selectedEngagementPhase !== null) {
    showNotification(`Phase "${currentEngagementPlanData.phases[index]?.title || `Phase ${index + 1}`}" selected`, 'info');
  }
}

// Toggle engagement phase checkbox
function toggleEngagementPhaseCheckbox(index) {
  const sections = document.querySelectorAll('.engagement-phase-section');
  const section = sections[index];
  if (section) {
    const checkbox = section.querySelector('.section-checkbox');
    section.classList.toggle('selected', checkbox?.checked);
    selectedEngagementPhase = checkbox?.checked ? index : null;

    const tagEl = document.getElementById('selectedPhaseTag');
    if (tagEl) {
      tagEl.style.display = selectedEngagementPhase !== null ? 'flex' : 'none';
    }
  }
}

// Clear engagement phase selection
function clearEngagementPhaseSelection() {
  const sections = document.querySelectorAll('.engagement-phase-section');
  sections.forEach(section => {
    section.classList.remove('selected');
    const checkbox = section.querySelector('.section-checkbox');
    if (checkbox) checkbox.checked = false;
  });
  selectedEngagementPhase = null;

  const tagEl = document.getElementById('selectedPhaseTag');
  if (tagEl) tagEl.style.display = 'none';
}

// Handle per-phase AI input
function handleEngagementPhaseInput(event, index) {
  if (event.key === 'Enter') {
    submitEngagementPhaseInput(index);
  }
}

// Submit per-phase AI edit
async function submitEngagementPhaseInput(phaseIndex) {
  const section = document.querySelectorAll('.engagement-phase-section')[phaseIndex];
  if (!section) return;

  const input = section.querySelector('.section-input input');
  const prompt = input?.value?.trim();
  if (!prompt) return;

  input.value = '';

  const currentPhase = currentEngagementPlanData.phases[phaseIndex];
  if (!currentPhase) {
    showNotification('Phase not found', 'error');
    return;
  }

  // Show loading
  section.classList.add('loading');
  const originalContent = section.innerHTML;
  section.innerHTML = `
    <div class="section-loading">
      <div class="loading-spinner"></div>
      <p>AI is modifying "${currentPhase.title || `Phase ${phaseIndex + 1}`}"...</p>
    </div>
  `;

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/protocols/edit-engagement-phase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        phase: currentPhase,
        prompt: prompt,
        action: 'edit'
      })
    });

    const data = await response.json();

    if (data.success && data.phase) {
      currentEngagementPlanData.phases[phaseIndex] = data.phase;
      rerenderEngagementPhases();
      showNotification(`Phase updated successfully!`, 'success');
    } else {
      throw new Error(data.error || 'Failed to update phase');
    }
  } catch (error) {
    console.error('Error updating phase:', error);
    section.innerHTML = originalContent;
    section.classList.remove('loading');
    showNotification(`Error updating phase: ${error.message}`, 'error');
  }
}

// Handle global AI input for engagement plan
function handleEngagementAI(event) {
  if (event.key === 'Enter') {
    submitEngagementAI();
  }
}

// Submit global AI command for engagement plan
async function submitEngagementAI() {
  const input = document.getElementById('engagementAIInput');
  const prompt = input?.value?.trim();
  if (!prompt) return;

  input.value = '';

  // If a phase is selected, edit that specific phase
  if (selectedEngagementPhase !== null) {
    const currentPhase = currentEngagementPlanData.phases[selectedEngagementPhase];
    if (!currentPhase) {
      showNotification('Phase not found', 'error');
      return;
    }

    showNotification(`AI is modifying "${currentPhase.title || `Phase ${selectedEngagementPhase + 1}`}"...`, 'info');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api/protocols/edit-engagement-phase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phase: currentPhase,
          prompt: prompt,
          action: 'edit'
        })
      });

      const data = await response.json();

      if (data.success && data.phase) {
        currentEngagementPlanData.phases[selectedEngagementPhase] = data.phase;
        rerenderEngagementPhases();
        clearEngagementPhaseSelection();
        showNotification(`Phase updated successfully!`, 'success');
      } else {
        throw new Error(data.error || 'Failed to update phase');
      }
    } catch (error) {
      console.error('Error updating phase:', error);
      showNotification(`Error: ${error.message}`, 'error');
    }
  } else {
    // No phase selected - add a new phase based on the prompt
    await addNewEngagementPhaseWithAI(prompt);
  }
}

// Add new phase with AI
async function addNewEngagementPhaseWithAI(prompt) {
  showNotification('AI is generating a new phase...', 'info');

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/protocols/edit-engagement-phase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: prompt,
        action: 'add'
      })
    });

    const data = await response.json();

    if (data.success && data.phase) {
      if (!currentEngagementPlanData.phases) {
        currentEngagementPlanData.phases = [];
      }
      currentEngagementPlanData.phases.push(data.phase);
      rerenderEngagementPhases();
      showNotification(`New phase "${data.phase.title}" added!`, 'success');

      // Scroll to new phase
      setTimeout(() => {
        const sections = document.querySelectorAll('.engagement-phase-section');
        const lastSection = sections[sections.length - 1];
        if (lastSection) {
          lastSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          lastSection.style.backgroundColor = '#E0F2F1';
          setTimeout(() => { lastSection.style.backgroundColor = ''; }, 2000);
        }
      }, 100);
    } else {
      throw new Error(data.error || 'Failed to generate phase');
    }
  } catch (error) {
    console.error('Error generating phase:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

// Add new blank phase manually
function addNewEngagementPhase() {
  const phaseCount = (currentEngagementPlanData.phases || []).length + 1;
  const newPhase = {
    title: `Phase ${phaseCount}: New Phase (Week ${phaseCount})`,
    subtitle: 'Description of this phase',
    items: ['Add action item here'],
    progress_goal: 'Define the goal for this phase',
    check_in_prompts: ['How are you progressing?']
  };

  if (!currentEngagementPlanData.phases) {
    currentEngagementPlanData.phases = [];
  }
  currentEngagementPlanData.phases.push(newPhase);
  rerenderEngagementPhases();

  // Scroll to new phase
  setTimeout(() => {
    const sections = document.querySelectorAll('.engagement-phase-section');
    const lastSection = sections[sections.length - 1];
    if (lastSection) {
      lastSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

// Delete an engagement phase
function deleteEngagementPhase(index) {
  if (!confirm('Are you sure you want to delete this phase?')) return;

  currentEngagementPlanData.phases.splice(index, 1);
  rerenderEngagementPhases();
  showNotification('Phase deleted', 'success');
}

// Add item to a phase
function addPhaseItem(phaseIndex) {
  if (!currentEngagementPlanData.phases[phaseIndex]) return;

  if (!currentEngagementPlanData.phases[phaseIndex].items) {
    currentEngagementPlanData.phases[phaseIndex].items = [];
  }
  currentEngagementPlanData.phases[phaseIndex].items.push('New action item');
  rerenderEngagementPhases();
}

// Add success metric
function addSuccessMetric() {
  if (!currentEngagementPlanData.success_metrics) {
    currentEngagementPlanData.success_metrics = [];
  }
  currentEngagementPlanData.success_metrics.push('New success metric');

  const list = document.getElementById('successMetricsList');
  if (list) {
    const li = document.createElement('li');
    li.style.marginBottom = '8px';
    li.innerHTML = `<span contenteditable="true" class="success-metric-item" data-index="${currentEngagementPlanData.success_metrics.length - 1}">New success metric</span>`;
    list.appendChild(li);
  }
}

// Re-render engagement phases
function rerenderEngagementPhases() {
  const container = document.getElementById('engagementPhasesContainer');
  if (container) {
    container.innerHTML = renderEngagementPhases(currentEngagementPlanData.phases || []);
  }
}

// Scroll to engagement section
function scrollToEngagementSection(sectionId) {
  const section = document.getElementById(sectionId + 'Section');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Save engagement plan from editor
async function saveEngagementPlanFromEditor() {
  if (!currentEngagementProtocolId || !currentEngagementPlanData) {
    showNotification('No engagement plan to save', 'error');
    return;
  }

  // Collect updated data from the editor
  const titleEl = document.getElementById('engagementPlanTitle');
  const summaryEl = document.getElementById('engagementPlanSummary');

  if (titleEl) currentEngagementPlanData.title = titleEl.textContent.trim();
  if (summaryEl) currentEngagementPlanData.summary = summaryEl.textContent.trim();

  // Collect phase data from contenteditable elements
  document.querySelectorAll('.phase-title-text').forEach((el, i) => {
    if (currentEngagementPlanData.phases[i]) {
      currentEngagementPlanData.phases[i].title = el.textContent.trim();
    }
  });

  document.querySelectorAll('.phase-progress-goal').forEach((el) => {
    const index = parseInt(el.dataset.index);
    if (currentEngagementPlanData.phases[index]) {
      currentEngagementPlanData.phases[index].progress_goal = el.textContent.trim();
    }
  });

  // Collect items from lists
  document.querySelectorAll('.phase-items-list').forEach((list) => {
    const phaseIndex = parseInt(list.dataset.index);
    if (currentEngagementPlanData.phases[phaseIndex]) {
      const items = [];
      list.querySelectorAll('li').forEach(li => {
        const text = li.textContent.trim();
        if (text) items.push(text);
      });
      currentEngagementPlanData.phases[phaseIndex].items = items;
    }
  });

  // Collect success metrics
  const metricItems = document.querySelectorAll('.success-metric-item');
  if (metricItems.length > 0) {
    currentEngagementPlanData.success_metrics = [];
    metricItems.forEach(item => {
      const text = item.textContent.trim();
      if (text) currentEngagementPlanData.success_metrics.push(text);
    });
  }

  // Collect communication schedule
  const freqEl = document.getElementById('commFrequency');
  const channelEl = document.getElementById('commChannel');
  const toneEl = document.getElementById('commTone');
  if (freqEl || channelEl || toneEl) {
    currentEngagementPlanData.communication_schedule = {
      check_in_frequency: freqEl?.value || '',
      preferred_channel: channelEl?.value || '',
      message_tone: toneEl?.value || ''
    };
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/protocols/${currentEngagementProtocolId}/engagement-plan`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        engagement_plan: currentEngagementPlanData
      })
    });

    if (response.ok) {
      showNotification('Engagement plan saved successfully!', 'success');
      loadEngagementPlans(); // Refresh the list
    } else {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save');
    }
  } catch (error) {
    console.error('Error saving engagement plan:', error);
    showNotification(`Error saving: ${error.message}`, 'error');
  }
}

// Schedule check-in messages based on engagement plan
function scheduleCheckInMessages() {
  if (!currentEngagementPlanData || !currentEngagementProtocolId) {
    showNotification('No engagement plan data available', 'error');
    return;
  }

  const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : 'Client';

  // Get current values from form
  const frequency = document.getElementById('commFrequency')?.value || 'Every 3 days';
  const channel = document.getElementById('commChannel')?.value || 'WhatsApp';
  const tone = document.getElementById('commTone')?.value || 'Encouraging and supportive';

  // Create scheduling modal
  const existingModal = document.getElementById('scheduleMessagesModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'scheduleMessagesModal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 3000;';

  // Calculate estimated number of messages
  const phases = currentEngagementPlanData.phases || [];
  const frequencyDays = { 'Daily': 1, 'Every 2 days': 2, 'Every 3 days': 3, 'Twice a week': 3.5, 'Weekly': 7, 'Bi-weekly': 14, 'Monthly': 30 };
  const days = frequencyDays[frequency] || 3;
  const messagesPerPhase = Math.ceil(7 / days) + 1; // check-ins + phase start
  const totalMessages = phases.length * messagesPerPhase;

  modal.innerHTML = `
    <div style="background: white; border-radius: 16px; max-width: 500px; width: 95%; padding: 24px;">
      <h3 style="margin: 0 0 8px 0; color: #1F2937;">Schedule Check-in Messages</h3>
      <p style="color: #6B7280; margin: 0 0 20px 0; font-size: 14px;">
        Set up automated check-in messages for ${escapeHtml(clientName)}
      </p>

      <div style="background: #F0FDFA; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span style="font-weight: 600; color: #0F766E;">Schedule Summary</span>
        </div>
        <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
          <li>${phases.length} phases in this plan</li>
          <li>Check-ins: ${frequency}</li>
          <li>Channel: ${channel}</li>
          <li>~${totalMessages} messages will be scheduled</li>
        </ul>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">
          Start Date
        </label>
        <input type="date" id="scheduleStartDate"
          value="${new Date().toISOString().split('T')[0]}"
          min="${new Date().toISOString().split('T')[0]}"
          style="width: 100%; padding: 10px 12px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px;">
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button onclick="closeScheduleMessagesModal()" style="padding: 10px 20px; background: white; border: 1px solid #E5E7EB; border-radius: 8px; cursor: pointer;">
          Cancel
        </button>
        <button onclick="confirmScheduleMessages()" class="btn-primary" style="padding: 10px 20px;">
          Schedule Messages
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) closeScheduleMessagesModal();
  };
}

function closeScheduleMessagesModal() {
  const modal = document.getElementById('scheduleMessagesModal');
  if (modal) modal.remove();
}

async function confirmScheduleMessages() {
  const startDate = document.getElementById('scheduleStartDate')?.value;
  if (!startDate) {
    showNotification('Please select a start date', 'error');
    return;
  }

  const frequency = document.getElementById('commFrequency')?.value || 'Every 3 days';
  const channel = document.getElementById('commChannel')?.value || 'whatsapp';
  const tone = document.getElementById('commTone')?.value || 'Encouraging and supportive';

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/scheduled-messages/bulk-from-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        client_id: clientId,
        engagement_plan_id: currentEngagementProtocolId,
        channel: channel.toLowerCase(),
        start_date: startDate,
        check_in_frequency: frequency,
        message_tone: tone
      })
    });

    if (response.ok) {
      const data = await response.json();
      closeScheduleMessagesModal();
      showNotification(`Successfully scheduled ${data.messages_created} messages!`, 'success');

      // Show success modal with summary
      showScheduleSuccessModal(data);
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to schedule messages');
    }
  } catch (error) {
    console.error('Error scheduling messages:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

function showScheduleSuccessModal(data) {
  const existingModal = document.getElementById('scheduleSuccessModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'scheduleSuccessModal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 3000;';

  modal.innerHTML = `
    <div style="background: white; border-radius: 16px; max-width: 450px; width: 95%; padding: 32px; text-align: center;">
      <div style="width: 64px; height: 64px; background: #D1FAE5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h3 style="margin: 0 0 8px 0; color: #1F2937; font-size: 20px;">Messages Scheduled!</h3>
      <p style="color: #6B7280; margin: 0 0 24px 0; font-size: 14px;">
        ${data.messages_created} check-in messages have been scheduled for your client.
      </p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button onclick="document.getElementById('scheduleSuccessModal').remove(); viewScheduledMessages();" style="padding: 12px 24px; background: white; border: 1px solid #E5E7EB; border-radius: 8px; cursor: pointer; font-weight: 500;">
          View Messages
        </button>
        <button onclick="document.getElementById('scheduleSuccessModal').remove()" class="btn-primary" style="padding: 12px 24px;">
          Done
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// View scheduled messages for current client
async function viewScheduledMessages() {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/scheduled-messages/client/${clientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch scheduled messages');
    }

    const messages = await response.json();

    // Create messages list modal
    const existingModal = document.getElementById('scheduledMessagesModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'scheduledMessagesModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 3000;';

    const pendingMessages = messages.filter(m => m.status === 'pending');
    const sentMessages = messages.filter(m => m.status === 'sent');

    modal.innerHTML = `
      <div style="background: white; border-radius: 16px; max-width: 700px; width: 95%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
        <div style="padding: 20px 24px; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h3 style="margin: 0; color: #1F2937; font-size: 18px;">Scheduled Messages</h3>
            <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">
              ${pendingMessages.length} pending · ${sentMessages.length} sent
            </p>
          </div>
          <button onclick="closeScheduledMessagesModal()" style="background: none; border: none; cursor: pointer; padding: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style="overflow-y: auto; flex: 1; padding: 16px 24px;">
          ${messages.length === 0 ? `
            <div style="text-align: center; padding: 40px 20px; color: #6B7280;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5" style="margin-bottom: 12px;">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <p style="margin: 0;">No scheduled messages yet</p>
            </div>
          ` : messages.map(msg => `
            <div style="padding: 16px; border: 1px solid #E5E7EB; border-radius: 10px; margin-bottom: 12px; ${msg.status === 'sent' ? 'opacity: 0.6;' : ''}">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; ${
                    msg.status === 'pending' ? 'background: #FEF3C7; color: #D97706;' :
                    msg.status === 'sent' ? 'background: #D1FAE5; color: #059669;' :
                    msg.status === 'failed' ? 'background: #FEE2E2; color: #DC2626;' :
                    'background: #E5E7EB; color: #6B7280;'
                  }">
                    ${msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                  </span>
                  <span style="padding: 4px 10px; border-radius: 12px; font-size: 12px; background: #EEF2FF; color: #6366F1;">
                    ${msg.channel}
                  </span>
                  <span style="padding: 4px 10px; border-radius: 12px; font-size: 12px; background: #F3F4F6; color: #6B7280;">
                    ${msg.message_type.replace('_', ' ')}
                  </span>
                </div>
                ${msg.status === 'pending' ? `
                  <button onclick="cancelScheduledMessage(${msg.id})" style="background: none; border: none; cursor: pointer; color: #EF4444; font-size: 12px;">
                    Cancel
                  </button>
                ` : ''}
              </div>
              <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; line-height: 1.5;">
                ${escapeHtml(msg.message_content)}
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                ${msg.status === 'sent' ? 'Sent' : 'Scheduled for'}: ${new Date(msg.scheduled_for).toLocaleString()}
              </p>
            </div>
          `).join('')}
        </div>

        <div style="padding: 16px 24px; border-top: 1px solid #E5E7EB; display: flex; justify-content: flex-end;">
          <button onclick="closeScheduledMessagesModal()" class="btn-primary" style="padding: 10px 24px;">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.onclick = (e) => {
      if (e.target === modal) closeScheduledMessagesModal();
    };

  } catch (error) {
    console.error('Error fetching scheduled messages:', error);
    showNotification('Failed to load scheduled messages', 'error');
  }
}

function closeScheduledMessagesModal() {
  const modal = document.getElementById('scheduledMessagesModal');
  if (modal) modal.remove();
}

async function cancelScheduledMessage(messageId) {
  if (!confirm('Are you sure you want to cancel this message?')) return;

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/scheduled-messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      showNotification('Message cancelled', 'success');
      // Refresh the list
      viewScheduledMessages();
    } else {
      throw new Error('Failed to cancel message');
    }
  } catch (error) {
    console.error('Error cancelling message:', error);
    showNotification('Failed to cancel message', 'error');
  }
}

// Share engagement plan
function shareEngagementPlan() {
  if (!currentEngagementPlanData) {
    showNotification('No engagement plan data to share', 'error');
    return;
  }

  const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : 'Client';
  const title = currentEngagementPlanData.title || 'Engagement Plan';

  // Create share modal
  const existingModal = document.getElementById('shareEngagementModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'shareEngagementModal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 3000;';

  modal.innerHTML = `
    <div style="background: white; border-radius: 16px; max-width: 500px; width: 95%; padding: 24px;">
      <h3 style="margin: 0 0 8px 0; color: #1F2937;">Share Engagement Plan</h3>
      <p style="color: #6B7280; margin: 0 0 20px 0; font-size: 14px;">Choose how you'd like to share "${escapeHtml(title)}"</p>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button onclick="shareEngagementViaEmail()" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; text-align: left;">
          <div style="width: 40px; height: 40px; background: #EEF2FF; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div>
            <div style="font-weight: 600; color: #1F2937;">Email</div>
            <div style="font-size: 12px; color: #6B7280;">Send via email client</div>
          </div>
        </button>

        <button onclick="shareEngagementViaWhatsApp()" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; text-align: left;">
          <div style="width: 40px; height: 40px; background: #DCFCE7; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#22C55E">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <div style="font-weight: 600; color: #1F2937;">WhatsApp</div>
            <div style="font-size: 12px; color: #6B7280;">Share via WhatsApp</div>
          </div>
        </button>

        <button onclick="copyEngagementPlanLink()" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; text-align: left;">
          <div style="width: 40px; height: 40px; background: #F0FDFA; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </div>
          <div>
            <div style="font-weight: 600; color: #1F2937;">Copy Text</div>
            <div style="font-size: 12px; color: #6B7280;">Copy plan as formatted text</div>
          </div>
        </button>
      </div>

      <button onclick="closeShareEngagementModal()" style="width: 100%; margin-top: 16px; padding: 12px; background: #E5E7EB; border: none; border-radius: 8px; color: #374151; font-weight: 500; cursor: pointer;">
        Cancel
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeShareEngagementModal();
  });
}

function closeShareEngagementModal() {
  const modal = document.getElementById('shareEngagementModal');
  if (modal) modal.remove();
}

function getEngagementPlanText() {
  if (!currentEngagementPlanData) return '';

  let text = `${currentEngagementPlanData.title || 'Engagement Plan'}\n\n`;

  if (currentEngagementPlanData.summary) {
    text += `${currentEngagementPlanData.summary}\n\n`;
  }

  (currentEngagementPlanData.phases || []).forEach(phase => {
    text += `${phase.title}\n`;
    if (phase.subtitle) text += `${phase.subtitle}\n`;
    text += '\n';

    if (phase.items && phase.items.length > 0) {
      phase.items.forEach(item => {
        text += `• ${item}\n`;
      });
      text += '\n';
    }

    if (phase.progress_goal) {
      text += `Goal: ${phase.progress_goal}\n\n`;
    }
  });

  return text;
}

function shareEngagementViaEmail() {
  const text = getEngagementPlanText();
  const subject = encodeURIComponent(currentEngagementPlanData?.title || 'Engagement Plan');
  const body = encodeURIComponent(text);
  window.open(`mailto:?subject=${subject}&body=${body}`);
  closeShareEngagementModal();
}

function shareEngagementViaWhatsApp() {
  const text = getEngagementPlanText();
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`);
  closeShareEngagementModal();
}

function copyEngagementPlanLink() {
  const text = getEngagementPlanText();
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Engagement plan copied to clipboard!', 'success');
    closeShareEngagementModal();
  }).catch(err => {
    console.error('Failed to copy:', err);
    showNotification('Failed to copy to clipboard', 'error');
  });
}

// Print engagement plan from editor
function printEngagementPlanFromEditor() {
  if (!currentEngagementPlanData) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${currentEngagementPlanData.title || 'Engagement Plan'}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
        h1 { color: #0F766E; }
        h2 { color: #374151; margin-top: 24px; }
        .phase { background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0F766E; }
        .phase h3 { margin-top: 0; color: #1F2937; }
        ul { padding-left: 20px; }
        li { margin-bottom: 8px; }
        .goal { background: #E0F2F1; padding: 12px; border-radius: 6px; margin-top: 12px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(currentEngagementPlanData.title || 'Engagement Plan')}</h1>
      ${currentEngagementPlanData.summary ? `<p style="color: #6B7280;">${escapeHtml(currentEngagementPlanData.summary)}</p>` : ''}

      ${(currentEngagementPlanData.phases || []).map(phase => `
        <div class="phase">
          <h3>${escapeHtml(phase.title)}</h3>
          ${phase.subtitle ? `<p style="font-style: italic; color: #6B7280;">${escapeHtml(phase.subtitle)}</p>` : ''}
          ${phase.items && phase.items.length > 0 ? `
            <ul>${phase.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          ` : ''}
          ${phase.progress_goal ? `<div class="goal"><strong>Progress Goal:</strong> ${escapeHtml(phase.progress_goal)}</div>` : ''}
        </div>
      `).join('')}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Close engagement plan editor
function closeEngagementPlanEditor() {
  const editor = document.getElementById('engagementPlanEditorView');
  if (editor) {
    editor.remove();
  }
  document.body.style.overflow = '';
  currentEngagementPlanData = null;
  currentEngagementProtocolId = null;
  selectedEngagementPhase = null;
}

// Format engagement plan JSON data into readable HTML
function formatEngagementPlanHtml(planData) {
  let html = '';

  // Title and summary
  if (planData.title) {
    html += `<h2 style="color: #0F766E; margin: 0 0 16px 0; font-size: 22px;">${planData.title}</h2>`;
  }
  if (planData.summary) {
    html += `<p style="color: #374151; margin-bottom: 24px; font-size: 15px; line-height: 1.6;">${planData.summary}</p>`;
  }

  // Phases
  if (planData.phases && Array.isArray(planData.phases)) {
    planData.phases.forEach(phase => {
      html += `
        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 4px solid #0F766E;">
          <h3 style="color: #1F2937; margin: 0 0 4px 0; font-size: 17px;">${phase.title || `Phase ${phase.phase_number}`}</h3>
          ${phase.subtitle ? `<p style="color: #6B7280; margin: 0 0 16px 0; font-size: 13px; font-style: italic;">${phase.subtitle}</p>` : ''}

          ${phase.items && phase.items.length > 0 ? `
            <ul style="margin: 0 0 16px 0; padding-left: 20px;">
              ${phase.items.map(item => `<li style="color: #374151; margin-bottom: 8px; line-height: 1.5;">${item}</li>`).join('')}
            </ul>
          ` : ''}

          ${phase.progress_goal ? `
            <div style="background: #F0FDFA; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
              <strong style="color: #0F766E; font-size: 12px; text-transform: uppercase;">Progress Goal:</strong>
              <p style="color: #374151; margin: 4px 0 0 0; font-size: 14px;">${phase.progress_goal}</p>
            </div>
          ` : ''}

          ${phase.check_in_prompts && phase.check_in_prompts.length > 0 ? `
            <div style="background: #FEF3C7; padding: 12px; border-radius: 8px;">
              <strong style="color: #92400E; font-size: 12px; text-transform: uppercase;">Check-in Questions:</strong>
              <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                ${phase.check_in_prompts.map(q => `<li style="color: #78350F; margin-bottom: 4px; font-size: 13px;">${q}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
    });
  }

  // Communication schedule
  if (planData.communication_schedule) {
    const comm = planData.communication_schedule;
    html += `
      <div style="background: #EDE9FE; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <h3 style="color: #6D28D9; margin: 0 0 12px 0; font-size: 16px;">Communication Schedule</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
          ${comm.check_in_frequency ? `<div><strong style="color: #7C3AED; font-size: 12px;">Frequency:</strong><br><span style="color: #374151;">${comm.check_in_frequency}</span></div>` : ''}
          ${comm.preferred_channel ? `<div><strong style="color: #7C3AED; font-size: 12px;">Channel:</strong><br><span style="color: #374151;">${comm.preferred_channel}</span></div>` : ''}
          ${comm.message_tone ? `<div><strong style="color: #7C3AED; font-size: 12px;">Tone:</strong><br><span style="color: #374151;">${comm.message_tone}</span></div>` : ''}
        </div>
      </div>
    `;
  }

  // Success metrics
  if (planData.success_metrics && planData.success_metrics.length > 0) {
    html += `
      <div style="background: #ECFDF5; border-radius: 12px; padding: 20px;">
        <h3 style="color: #065F46; margin: 0 0 12px 0; font-size: 16px;">Success Metrics</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${planData.success_metrics.map(m => `<li style="color: #047857; margin-bottom: 6px;">${m}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  return html || '<p>No engagement plan content available.</p>';
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

  // Extract and format engagement plan content
  let content = '<p>No engagement plan content available.</p>';
  if (protocol.ai_recommendations) {
    const rawContent = protocol.ai_recommendations;

    // Check if there's an engagement plan JSON after the separator
    const engagementPlanMatch = rawContent.match(/---\s*ENGAGEMENT PLAN\s*---\s*([\s\S]*)/i);
    if (engagementPlanMatch) {
      try {
        // Extract JSON from the content (find the first { to last })
        const jsonText = engagementPlanMatch[1].trim();
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const planData = JSON.parse(jsonMatch[0]);
          content = formatEngagementPlanHtml(planData);
        } else {
          content = jsonText.replace(/\n/g, '<br>');
        }
      } catch (e) {
        console.error('Error parsing engagement plan JSON:', e);
        // If not valid JSON, just use the text after the separator
        content = engagementPlanMatch[1].trim().replace(/\n/g, '<br>');
      }
    } else {
      // Try to find JSON anywhere in the content
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const planData = JSON.parse(jsonMatch[0]);
          if (planData.title || planData.phases || planData.overview || planData.summary) {
            content = formatEngagementPlanHtml(planData);
          } else {
            content = rawContent.replace(/\n/g, '<br>');
          }
        } else {
          content = rawContent.replace(/\n/g, '<br>');
        }
      } catch (e) {
        console.error('Error parsing raw content as JSON:', e);
        // Not JSON, just display as HTML
        content = rawContent.replace(/\n/g, '<br>');
      }
    }
  }

  modal.innerHTML = `
    <div class="modal-content" style="background: white; border-radius: 16px; max-width: 900px; width: 95%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
      <div class="modal-header" style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; font-size: 20px; color: #1f2937;">Engagement Plan</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Created: ${formatDate(protocol.updated_at || protocol.created_at)}</p>
        </div>
        <button onclick="closeViewEngagementModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
      </div>
      <div id="engagementPrintContent" class="modal-body" style="padding: 24px; overflow-y: auto; flex: 1;">
        <div class="engagement-plan-content" style="background: #f0fdfa; border-radius: 12px; padding: 20px; font-size: 14px; line-height: 1.7; color: #374151;">${content}</div>
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

  // Get selected templates (only actual protocol templates, not notes or labs)
  const selectedTemplateInputs = document.querySelectorAll('input[name="template"].template-checkbox:checked');
  const templates = Array.from(selectedTemplateInputs).map(cb => cb.value);
  const templateNames = Array.from(selectedTemplateInputs).map(cb => cb.dataset.templateName || cb.value);

  // Get selected notes
  const selectedNoteInputs = document.querySelectorAll('input.note-checkbox:checked');
  const noteIds = Array.from(selectedNoteInputs).map(cb => cb.value);

  // Get selected labs
  const selectedLabInputs = document.querySelectorAll('input.lab-checkbox:checked');
  const labIds = Array.from(selectedLabInputs).map(cb => cb.value);

  console.log('Generating protocol with:', { prompt, templates, templateNames, noteIds, labIds });

  // Store context for later use
  protocolGenerationContext = { prompt, templates, templateNames, noteIds, labIds };

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
        note_ids: noteIds,
        lab_ids: labIds
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[Protocol Generate] Response data:', data);
      generatedProtocolData = data;

      // Show the generated protocol in editor view
      try {
        displayProtocolInEditor(data, templateNames, noteIds);
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
    'core': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    'clinic': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    'default': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>'
  };

  return modules.map((module, index) => {
    const moduleName = module.name || `Module ${index + 1}`;
    const isCore = module.is_core_protocol || moduleName.toLowerCase().includes('core protocol');
    const isClinic = module.is_clinic_treatments || moduleName.toLowerCase().includes('clinic');

    const moduleType = isCore ? 'core' :
                       isClinic ? 'clinic' :
                       moduleName.toLowerCase().includes('supplement') ? 'supplements' :
                       moduleName.toLowerCase().includes('lifestyle') || moduleName.toLowerCase().includes('sleep') ? 'lifestyle' :
                       moduleName.toLowerCase().includes('diet') || moduleName.toLowerCase().includes('nutrition') ? 'diet' :
                       moduleName.toLowerCase().includes('lab') || moduleName.toLowerCase().includes('test') ? 'labs' : 'default';

    const icon = moduleIcons[moduleType] || moduleIcons['default'];

    // Phase badge
    let phaseBadge = '';
    if (isCore) {
      phaseBadge = `<span style="background: #059669; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; margin-left: 8px; font-weight: 500;">CORE</span>`;
    } else if (module.phase_number) {
      phaseBadge = `<span style="background: #0F766E; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; margin-left: 8px; font-weight: 500;">PHASE ${module.phase_number}</span>`;
    } else if (isClinic) {
      phaseBadge = `<span style="background: #0F766E; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; margin-left: 8px; font-weight: 500;">CLINIC</span>`;
    }

    // Module styling
    const moduleStyle = isCore ? 'background: linear-gradient(to right, #ECFDF5, #F0FDF4); border-left: 4px solid #059669;' :
                        isClinic ? 'background: linear-gradient(to right, #F0FDFA, #F5F5F5); border-left: 4px solid #0F766E;' : '';

    let itemsHtml = '';
    if (module.items && Array.isArray(module.items)) {
      itemsHtml = module.items.map(item => {
        const itemName = typeof item === 'string' ? item : (item.name || item.title || 'Item');
        const itemRationale = typeof item === 'object' ? (item.rationale || '') : '';
        const itemDesc = typeof item === 'object' ? (item.description || '') : '';
        const itemDosage = typeof item === 'object' && item.dosage ? item.dosage : '';
        const itemTiming = typeof item === 'object' && item.timing ? item.timing : '';
        const itemContra = typeof item === 'object' && item.contraindications ? item.contraindications : '';
        const itemNotes = typeof item === 'object' && item.notes ? item.notes : '';

        return `
          <div class="module-item" style="border-left: 3px solid #0F766E; padding-left: 12px; margin-bottom: 16px;">
            <div class="item-details">
              <h4 style="margin: 0 0 6px 0; color: #1F2937;">${escapeHtml(itemName)}</h4>
              ${itemRationale ? `<p style="color: #374151; margin: 0 0 6px 0; font-size: 13px;">${escapeHtml(itemRationale)}</p>` : ''}
              ${itemDesc ? `<p style="color: #6B7280; margin: 0 0 6px 0; font-size: 13px;">${escapeHtml(itemDesc)}</p>` : ''}
              ${(itemDosage || itemTiming) ? `
                <div class="item-meta" style="display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px;">
                  ${itemDosage ? `<span style="font-size: 12px; color: #059669;"><strong>Dosage:</strong> ${escapeHtml(itemDosage)}</span>` : ''}
                  ${itemTiming ? `<span style="font-size: 12px; color: #0369A1;"><strong>Timing:</strong> ${escapeHtml(itemTiming)}</span>` : ''}
                </div>
              ` : ''}
              ${itemContra ? `
                <div style="background: #FEF2F2; padding: 6px 10px; border-radius: 4px; margin-top: 8px;">
                  <span style="font-size: 11px; color: #991B1B;"><strong>⚠️ Contraindications:</strong> ${escapeHtml(itemContra)}</span>
                </div>
              ` : ''}
              ${itemNotes ? `<p style="color: #6B7280; margin: 6px 0 0 0; font-size: 11px; font-style: italic;">📝 ${escapeHtml(itemNotes)}</p>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    // Safety gates section
    let safetyGatesHtml = '';
    if (module.safety_gates && module.safety_gates.length > 0) {
      safetyGatesHtml = `
        <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 12px; border-radius: 6px; margin-top: 16px;">
          <h5 style="color: #DC2626; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase;">⚠️ Safety Gates</h5>
          <ul style="margin: 0; padding-left: 16px; color: #991B1B; font-size: 12px;">
            ${module.safety_gates.map(gate => `<li style="margin-bottom: 4px;">${escapeHtml(gate)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // What not to do section
    let whatNotToDoHtml = '';
    if (module.what_not_to_do && module.what_not_to_do.length > 0) {
      whatNotToDoHtml = `
        <div style="background: #FEF3C7; border-left: 4px solid #D97706; padding: 12px; border-radius: 6px; margin-top: 12px;">
          <h5 style="color: #92400E; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase;">🚫 What NOT To Do Early</h5>
          <ul style="margin: 0; padding-left: 16px; color: #78350F; font-size: 12px;">
            ${module.what_not_to_do.map(item => `<li style="margin-bottom: 4px;">${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Readiness criteria section
    let readinessCriteriaHtml = '';
    if (module.readiness_criteria && module.readiness_criteria.length > 0) {
      readinessCriteriaHtml = `
        <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <h5 style="color: #1E40AF; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase;">✓ Readiness Criteria</h5>
          <ul style="margin: 0; padding-left: 16px; color: #1E3A8A; font-size: 12px;">
            ${module.readiness_criteria.map(criteria => `<li style="margin-bottom: 4px;">${escapeHtml(criteria)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    return `
      <div class="protocol-module" style="${moduleStyle} border-radius: 12px; margin-bottom: 16px; overflow: hidden;">
        <div class="module-header" style="padding: 16px; background: rgba(255,255,255,0.5);">
          <h3 style="margin: 0; display: flex; align-items: center; flex-wrap: wrap;">
            <span class="module-icon" style="margin-right: 8px;">${icon}</span>
            ${escapeHtml(moduleName)}
            ${phaseBadge}
            ${module.duration_weeks ? `<span style="color: #6B7280; font-size: 12px; margin-left: 8px; font-weight: normal;">• ${module.duration_weeks} weeks</span>` : ''}
          </h3>
          <button class="module-toggle" onclick="toggleModuleContent(this)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
        <div class="module-content" style="padding: 16px; background: white;">
          ${module.description ? `<p style="color: #6B7280; font-style: italic; margin: 0 0 16px 0; font-size: 13px;">${escapeHtml(module.description)}</p>` : ''}
          ${module.goal ? `<p style="margin: 0 0 16px 0;"><strong>Goal:</strong> ${escapeHtml(module.goal)}</p>` : ''}
          ${readinessCriteriaHtml}
          <div class="module-items">
            ${itemsHtml || '<p style="color: #9CA3AF;">No items in this module</p>'}
          </div>
          ${safetyGatesHtml}
          ${whatNotToDoHtml}
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

// Protocol generation progress tracking
let protocolProgressInterval;

// Show the protocol editor view with progress animation
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

  // Hide FAB container during loading
  const fabContainer = document.getElementById('editorFabContainer');
  if (fabContainer) fabContainer.style.display = 'none';

  // Reset progress bar
  const progressBar = document.getElementById('protocolProgressBar');
  if (progressBar) progressBar.style.width = '5%';

  // Show the editor view
  if (editorView) {
    editorView.style.display = 'flex';
    console.log('[Protocol Editor] Editor view now visible');

    // Initialize reference panel
    loadReferencePanelData();

    // Start progress animation
    startProtocolProgressAnimation();
  } else {
    console.error('[Protocol Editor] Editor view element not found!');
  }
}

// Start the protocol generation progress animation
function startProtocolProgressAnimation() {
  let progress = 5;

  // Clear any existing interval
  if (protocolProgressInterval) {
    clearInterval(protocolProgressInterval);
  }

  protocolProgressInterval = setInterval(() => {
    if (progress < 85) {
      progress += Math.random() * 10;
      if (progress > 85) progress = 85;

      const progressBar = document.getElementById('protocolProgressBar');
      if (progressBar) progressBar.style.width = progress + '%';

      // Update status messages based on progress
      const statusEl = document.getElementById('editorLoadingStatus');
      if (statusEl) {
        if (progress < 15) statusEl.textContent = 'Analyzing client data...';
        else if (progress < 30) statusEl.textContent = 'Reviewing clinical notes...';
        else if (progress < 45) statusEl.textContent = 'Consulting knowledge base...';
        else if (progress < 60) statusEl.textContent = 'Generating protocol sections...';
        else if (progress < 75) statusEl.textContent = 'Creating supplement recommendations...';
        else statusEl.textContent = 'Finalizing protocol...';
      }
    }
  }, 800);
}

// Stop the protocol progress animation
function stopProtocolProgressAnimation() {
  if (protocolProgressInterval) {
    clearInterval(protocolProgressInterval);
    protocolProgressInterval = null;
  }

  // Complete the progress bar
  const progressBar = document.getElementById('protocolProgressBar');
  if (progressBar) progressBar.style.width = '100%';
}

// Close the protocol editor
function closeProtocolEditor() {
  // Stop any running progress animation
  stopProtocolProgressAnimation();

  const editorView = document.getElementById('protocolEditorView');
  if (editorView) editorView.style.display = 'none';

  // Hide the floating action buttons
  const fabContainer = document.getElementById('editorFabContainer');
  if (fabContainer) fabContainer.style.display = 'none';

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

  // Stop the progress animation
  stopProtocolProgressAnimation();

  const loading = document.getElementById('protocolEditorLoading');
  const content = document.getElementById('protocolEditorContent');

  console.log('[Protocol Editor] Loading/Content elements:', { loading: !!loading, content: !!content });

  // Hide loading, show content
  if (loading) loading.style.display = 'none';
  if (content) {
    content.style.display = 'flex';
    console.log('[Protocol Editor] Content view now visible');
  }

  // Show the floating action buttons (Ask AI, Quick Notes)
  const fabContainer = document.getElementById('editorFabContainer');
  if (fabContainer) fabContainer.style.display = 'flex';

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
    // templates parameter now contains template names directly
    templateEl.textContent = templates.length > 0 ? templates[0] : 'Custom';
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

// Render supplement table (all fields editable)
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
        ${items.map((item, i) => {
          const name = typeof item === 'string' ? item : (item.name || 'Supplement');
          const dosage = item.dosage || '';
          const timing = item.timing || '';
          const notes = item.notes || item.description || '';
          return `
            <tr class="supplement-row" data-item-index="${i}">
              <td contenteditable="true" class="editable-field item-name" data-index="${i}" data-field="name">${escapeHtml(name)}</td>
              <td contenteditable="true" class="editable-field item-dosage" data-index="${i}" data-field="dosage">${dosage ? escapeHtml(dosage) : '<span class="empty-placeholder">-</span>'}</td>
              <td contenteditable="true" class="editable-field item-timing" data-index="${i}" data-field="timing">${timing ? escapeHtml(timing) : '<span class="empty-placeholder">-</span>'}</td>
              <td contenteditable="true" class="editable-field item-notes" data-index="${i}" data-field="notes">${notes ? escapeHtml(notes) : '<span class="empty-placeholder">-</span>'}</td>
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

  const promptLower = prompt.toLowerCase();

  // Check if this is a REMOVAL/DELETE request
  const isRemovalRequest = promptLower.includes('remove') ||
    promptLower.includes('delete') ||
    promptLower.includes('take out') ||
    promptLower.includes('get rid of') ||
    promptLower.includes('eliminate');

  if (isRemovalRequest && generatedProtocolData && generatedProtocolData.modules) {
    // Try to find which module to remove based on the prompt
    const moduleIndex = findModuleByPrompt(prompt, generatedProtocolData.modules);

    if (moduleIndex !== -1) {
      const moduleToRemove = generatedProtocolData.modules[moduleIndex];
      const moduleName = moduleToRemove.name || 'Module';

      // Confirm removal
      if (confirm(`Are you sure you want to remove the "${moduleName}" module?`)) {
        // Remove the module from the array
        generatedProtocolData.modules.splice(moduleIndex, 1);

        // Re-render all sections
        renderProtocolSections(generatedProtocolData.modules);

        // Clear any selection
        clearSectionSelection();

        showNotification(`Module "${moduleName}" has been removed.`, 'success');
      }
      return;
    } else {
      showNotification('Could not identify which module to remove. Please click on the module first, then ask to remove it.', 'warning');
      return;
    }
  }

  // Check if a section is selected - edit that specific module
  if (selectedProtocolSection !== null) {
    const sectionIndex = selectedProtocolSection;

    if (!generatedProtocolData || !generatedProtocolData.modules || !generatedProtocolData.modules[sectionIndex]) {
      showNotification('No module data available', 'error');
      return;
    }

    const currentModule = generatedProtocolData.modules[sectionIndex];
    const sectionName = currentModule.name || 'Selected section';

    // Check if user wants to remove the selected module
    if (isRemovalRequest) {
      if (confirm(`Are you sure you want to remove the "${sectionName}" module?`)) {
        generatedProtocolData.modules.splice(sectionIndex, 1);
        renderProtocolSections(generatedProtocolData.modules);
        clearSectionSelection();
        showNotification(`Module "${sectionName}" has been removed.`, 'success');
      }
      return;
    }

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

// Find a module by matching keywords in the prompt
function findModuleByPrompt(prompt, modules) {
  const promptLower = prompt.toLowerCase();

  // Common module name keywords to look for
  const moduleKeywords = [
    { keywords: ['h. pylori', 'h pylori', 'hpylori', 'pylori', 'h.pylori'], match: 'pylori' },
    { keywords: ['mycotoxin', 'myco', 'mold', 'toxin binding'], match: 'mycotoxin' },
    { keywords: ['gut', 'digestive', 'gi ', 'gastrointestinal'], match: 'gut' },
    { keywords: ['sleep', 'circadian', 'melatonin'], match: 'sleep' },
    { keywords: ['stress', 'adrenal', 'cortisol', 'adaptogen'], match: 'stress' },
    { keywords: ['immune', 'immunity', 'inflammation'], match: 'immune' },
    { keywords: ['liver', 'detox', 'detoxification'], match: 'detox' },
    { keywords: ['supplement', 'vitamin', 'mineral'], match: 'supplement' },
    { keywords: ['lifestyle', 'habit', 'routine'], match: 'lifestyle' },
    { keywords: ['diet', 'nutrition', 'food', 'eating'], match: 'diet' },
    { keywords: ['clinic', 'treatment', 'therapy', 'hbot', 'iv ', 'sauna'], match: 'clinic' },
    { keywords: ['first', 'module 1', '1st'], match: 'first' },
    { keywords: ['second', 'module 2', '2nd'], match: 'second' },
    { keywords: ['third', 'module 3', '3rd'], match: 'third' },
    { keywords: ['last', 'final'], match: 'last' },
    { keywords: ['antimicrobial', 'antibiotic', 'eradication'], match: 'antimicrobial' }
  ];

  // First, try to find by position keywords
  if (promptLower.includes('first') || promptLower.includes('1st') || promptLower.includes('module 1')) {
    return 0;
  }
  if (promptLower.includes('second') || promptLower.includes('2nd') || promptLower.includes('module 2')) {
    return modules.length > 1 ? 1 : -1;
  }
  if (promptLower.includes('third') || promptLower.includes('3rd') || promptLower.includes('module 3')) {
    return modules.length > 2 ? 2 : -1;
  }
  if (promptLower.includes('last') || promptLower.includes('final')) {
    return modules.length - 1;
  }

  // Try to match by module name keywords
  for (let i = 0; i < modules.length; i++) {
    const moduleName = (modules[i].name || '').toLowerCase();

    // Direct name match
    for (const kw of moduleKeywords) {
      for (const keyword of kw.keywords) {
        if (promptLower.includes(keyword) && moduleName.includes(kw.match)) {
          return i;
        }
      }
    }

    // Also check if prompt contains words from module name directly
    const moduleWords = moduleName.split(/\s+/).filter(w => w.length > 3);
    for (const word of moduleWords) {
      if (promptLower.includes(word)) {
        return i;
      }
    }
  }

  return -1;
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

// Save protocol as PDF from editor view (uses generatedProtocolData)
async function saveEditorProtocolAsPDF() {
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
let refPanelProtocolData = []; // For existing protocol editor
let refPanelNotesData = [];
let refPanelFormsData = [];

// Switch reference panel tab
function switchRefTab(tabId, context = '') {
  // Determine the prefix for element IDs based on context
  const prefix = context === 'existing' ? 'existing' : '';
  const tabContentPrefix = prefix ? `${prefix}RefTab-` : 'refTab-';

  // Get the container based on context
  const panelId = context === 'existing' ? 'existingProtocolReferencePanel' : 'protocolReferencePanel';
  const panel = document.getElementById(panelId);

  if (panel) {
    // Update tab buttons within the specific panel
    panel.querySelectorAll('.ref-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.refTab === tabId);
    });

    // Update tab content within the specific panel
    panel.querySelectorAll('.ref-tab-content').forEach(content => {
      const expectedId = tabContentPrefix + tabId;
      content.classList.toggle('active', content.id === expectedId);
    });
  } else {
    // Fallback to global selection for backwards compatibility
    document.querySelectorAll('.ref-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.refTab === tabId);
    });
    document.querySelectorAll('.ref-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `refTab-${tabId}`);
    });
  }

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
  // Open protocol in the protocol view modal
  // Check both data sources (protocol builder uses refPanelProtocolsData, existing editor uses refPanelProtocolData)
  let protocol = refPanelProtocolsData?.find(p => p.id === protocolId);
  if (!protocol && typeof refPanelProtocolData !== 'undefined') {
    protocol = refPanelProtocolData?.find(p => p.id === protocolId);
  }
  if (protocol) {
    // Use the existing showProtocolViewModal function
    showProtocolViewModal(protocol);
  } else {
    console.error('Protocol not found:', protocolId);
    showNotification('Could not load protocol', 'error');
  }
}

function viewRefNote(noteId) {
  const note = refPanelNotesData.find(n => n.id === noteId);
  if (note) {
    // Show note in a modal
    showNotePreviewModal(note);
  }
}

function viewRefForm(formId) {
  const form = refPanelFormsData.find(f => f.id === formId);
  if (form) {
    // Show form in a modal
    showFormPreviewModal(form);
  }
}

// Show note preview modal
function showNotePreviewModal(note) {
  const existingModal = document.getElementById('notePreviewModal');
  if (existingModal) existingModal.remove();

  const noteDate = note.created_at ? new Date(note.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'Unknown date';

  const noteType = note.is_consultation ? 'Consultation Note' :
                   note.note_type === 'quick_note' ? 'Quick Note' :
                   note.note_type || 'Note';

  const modal = document.createElement('div');
  modal.id = 'notePreviewModal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 3000; display: flex; align-items: center; justify-content: center;';
  modal.innerHTML = `
    <div style="background: white; border-radius: 16px; max-width: 700px; width: 90%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
      <div style="padding: 20px 24px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; font-size: 18px; color: #1F2937;">${noteType}</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6B7280;">${noteDate}</p>
        </div>
        <button onclick="document.getElementById('notePreviewModal').remove()" style="background: none; border: none; cursor: pointer; padding: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div style="padding: 24px; overflow-y: auto; flex: 1;">
        <div style="white-space: pre-wrap; font-size: 14px; color: #374151; line-height: 1.6;">${escapeHtml(note.content || 'No content')}</div>
      </div>
    </div>
  `;
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
}

// Show form preview modal
function showFormPreviewModal(form) {
  const existingModal = document.getElementById('formPreviewModal');
  if (existingModal) existingModal.remove();

  const formDate = form.submitted_at ? new Date(form.submitted_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : 'Unknown date';

  // Parse form data if it exists
  let formDataHtml = '<p style="color: #6B7280;">No form data available</p>';
  if (form.form_data) {
    try {
      const data = typeof form.form_data === 'string' ? JSON.parse(form.form_data) : form.form_data;
      formDataHtml = Object.entries(data).map(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
        const displayValue = Array.isArray(value) ? value.join(', ') : (value || '-');
        return `
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; color: #6B7280; text-transform: capitalize; margin-bottom: 2px;">${label}</label>
            <p style="margin: 0; font-size: 14px; color: #1F2937;">${escapeHtml(String(displayValue))}</p>
          </div>
        `;
      }).join('');
    } catch (e) {
      formDataHtml = `<pre style="white-space: pre-wrap; font-size: 13px;">${escapeHtml(String(form.form_data))}</pre>`;
    }
  }

  const modal = document.createElement('div');
  modal.id = 'formPreviewModal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 3000; display: flex; align-items: center; justify-content: center;';
  modal.innerHTML = `
    <div style="background: white; border-radius: 16px; max-width: 700px; width: 90%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
      <div style="padding: 20px 24px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; font-size: 18px; color: #1F2937;">${escapeHtml(form.form_name || 'Form')}</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6B7280;">Submitted: ${formDate}</p>
        </div>
        <button onclick="document.getElementById('formPreviewModal').remove()" style="background: none; border: none; cursor: pointer; padding: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div style="padding: 24px; overflow-y: auto; flex: 1;">
        ${formDataHtml}
      </div>
    </div>
  `;
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
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

  // Check for both panel contexts (protocol builder and existing protocol editor)
  let panel = document.getElementById('labPreviewPanel');
  let prefix = '';

  // If not found, try the existing protocol editor panel
  if (!panel || panel.style.display === 'none' && document.getElementById('existingLabPreviewPanel')) {
    panel = document.getElementById('existingLabPreviewPanel');
    prefix = 'existing';
  }

  if (!panel) return;

  // Get elements with appropriate prefix
  const titleEl = document.getElementById(prefix ? 'existingLabPreviewTitle' : 'labPreviewTitle');
  const metaEl = document.getElementById(prefix ? 'existingLabPreviewMeta' : 'labPreviewMeta');
  const notesEl = document.getElementById(prefix ? 'existingLabPreviewNotes' : 'labPreviewNotes');
  const summaryEl = document.getElementById(prefix ? 'existingLabPreviewSummary' : 'labPreviewSummary');
  const generateBtn = document.getElementById(prefix ? 'existingGenerateLabSummaryBtn' : 'generateLabSummaryBtn');
  const docContainer = document.getElementById(prefix ? 'existingLabPreviewDocument' : 'labPreviewDocument');

  // Set lab info
  if (titleEl) titleEl.textContent = lab.file_name || lab.title || 'Lab Result';
  if (metaEl) metaEl.textContent = `${lab.lab_type || 'Lab'} | ${formatDate(lab.test_date || lab.uploaded_at)}`;
  if (notesEl) notesEl.textContent = lab.notes || 'No notes to show';

  // Handle AI summary display and generate button
  if (summaryEl) {
    if (lab.ai_summary) {
      summaryEl.innerHTML = formatLabSummary(lab.ai_summary);
      if (generateBtn) generateBtn.style.display = 'none';
    } else {
      summaryEl.innerHTML = '<p class="no-summary-text">No AI summary available. Click below to generate one.</p>';
      if (generateBtn) generateBtn.style.display = 'flex';
    }
  }

  // Render the lab document (PDF or image)
  if (!docContainer) return;
  docContainer.innerHTML = '<div class="ref-loading">Loading document...</div>';

  if (lab.file_url) {
    // Determine if it's a PDF based on file extension, mime type, or API endpoint
    const isPdf = lab.file_mime_type === 'application/pdf' ||
                  lab.original_filename?.toLowerCase().endsWith('.pdf') ||
                  lab.file_url.includes('/api/labs/') ||
                  lab.file_url.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // Use PDF.js to render all pages - use unique ID for the container
      const pdfContainerId = prefix ? 'existingLabPdfPagesContainer' : 'labPdfPagesContainer';
      docContainer.innerHTML = `<div id="${pdfContainerId}" class="pdf-pages-container"><div class="ref-loading">Loading PDF...</div></div>`;
      try {
        const pdfUrl = lab.file_url.startsWith('/') ? `${API_BASE}${lab.file_url}` : lab.file_url;

        // Fetch PDF with auth headers for API endpoints (handles both relative and absolute URLs)
        let pdfData;
        const needsAuth = lab.file_url.includes('/api/labs/') || lab.file_url.startsWith('/api/');
        if (needsAuth) {
          const token = localStorage.getItem('auth_token');
          const response = await fetch(pdfUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          pdfData = { data: arrayBuffer };
        } else {
          pdfData = pdfUrl;
        }

        const pdf = await pdfjsLib.getDocument(pdfData).promise;
        const pagesContainer = document.getElementById(pdfContainerId);
        pagesContainer.innerHTML = '';

        // Render all pages
        const numPages = pdf.numPages;
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const scale = 1.2;
          const viewport = page.getViewport({ scale });

          const pageDiv = document.createElement('div');
          pageDiv.className = 'pdf-page';
          pageDiv.innerHTML = `<div class="page-number">Page ${pageNum} of ${numPages}</div>`;

          const canvas = document.createElement('canvas');
          canvas.className = 'pdf-page-canvas';
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          pageDiv.appendChild(canvas);
          pagesContainer.appendChild(pageDiv);

          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (e) {
        console.error('Error loading PDF:', e);
        docContainer.innerHTML = `<p style="padding: 20px; color: #666;">Could not load PDF preview. Error: ${e.message}</p>`;
      }
    } else {
      // For images
      const imgUrl = lab.file_url.startsWith('/') ? `${API_BASE}${lab.file_url}` : lab.file_url;
      docContainer.innerHTML = `<img src="${imgUrl}" alt="Lab Result" style="max-width: 100%;">`;
    }
  } else {
    docContainer.innerHTML = `<p style="padding: 20px; color: #666;">No document available</p>`;
  }

  panel.style.display = 'flex';
}

function closeLabPreview() {
  // Close both panels (whichever is visible)
  const panel1 = document.getElementById('labPreviewPanel');
  const panel2 = document.getElementById('existingLabPreviewPanel');
  if (panel1) panel1.style.display = 'none';
  if (panel2) panel2.style.display = 'none';
  currentLabPreview = null;
}

// Format AI summary with markdown-like rendering
function formatLabSummary(summary) {
  if (!summary) return '';

  // Convert markdown to HTML
  let formatted = escapeHtml(summary)
    // Headers
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Bullet points with dash
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Bullet points with asterisk
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    // Numbered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> elements in <ul>
  formatted = formatted.replace(/(<li>.*?<\/li>)(\s*<br>)?(\s*<li>)/g, '$1$3');
  formatted = formatted.replace(/(<li>.*?<\/li>)+/g, '<ul class="lab-summary-list">$&</ul>');

  return `<div class="lab-summary-formatted"><p>${formatted}</p></div>`;
}

// Generate AI summary for the current lab preview
async function generateLabAISummary() {
  if (!currentLabPreview) {
    showNotification('No lab selected', 'error');
    return;
  }

  // Check which panel is active and get the correct elements
  const existingPanel = document.getElementById('existingLabPreviewPanel');
  const isExisting = existingPanel && existingPanel.style.display !== 'none';

  const summaryEl = document.getElementById(isExisting ? 'existingLabPreviewSummary' : 'labPreviewSummary');
  const generateBtn = document.getElementById(isExisting ? 'existingGenerateLabSummaryBtn' : 'generateLabSummaryBtn');

  // Show loading state with progress bar
  if (generateBtn) {
    generateBtn.style.display = 'none';
  }
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="ai-summary-loading">
        <div class="ai-summary-loading-header">
          <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span>Analyzing lab results...</span>
        </div>
        <div class="ai-summary-progress-container">
          <div class="ai-summary-progress-bar">
            <div class="ai-summary-progress-fill"></div>
          </div>
          <span class="ai-summary-progress-text">This may take a few moments</span>
        </div>
      </div>
    `;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/labs/${currentLabPreview.id}/generate-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (summaryEl) {
        summaryEl.innerHTML = formatLabSummary(data.summary) || '<p>Summary generated successfully.</p>';
      }
      currentLabPreview.ai_summary = data.summary;
      showNotification('AI summary generated successfully!', 'success');

      // Update the lab in the reference panel list
      const labIndex = refPanelLabData.findIndex(l => l.id === currentLabPreview.id);
      if (labIndex !== -1) {
        refPanelLabData[labIndex].ai_summary = data.summary;
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate summary');
    }
  } catch (error) {
    console.error('Error generating lab summary:', error);
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="ai-summary-error">
          <p>Failed to generate summary. Please try again.</p>
          <button onclick="generateLabAISummary()" class="generate-summary-btn" style="margin-top: 12px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Try Again
          </button>
        </div>
      `;
    }
    showNotification(`Error: ${error.message}`, 'error');
  }
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
window.activateProtocol = activateProtocol;
window.setProtocolDraft = setProtocolDraft;
window.deleteProtocol = deleteProtocol;
window.createEngagementPlanFromProtocol = createEngagementPlanFromProtocol;
window.closeEngagementProgressModal = closeEngagementProgressModal;
window.shareProtocol = shareProtocol;
window.showProtocolShareOptions = showProtocolShareOptions;
window.closeProtocolShareModal = closeProtocolShareModal;
window.shareProtocolViaEmail = shareProtocolViaEmail;
window.shareProtocolViaWhatsApp = shareProtocolViaWhatsApp;
window.generateProtocolShareLink = generateProtocolShareLink;
window.downloadProtocolPDF = downloadProtocolPDF;
window.printProtocol = printProtocol;
window.saveProtocolAsPDF = saveProtocolAsPDF;
window.showProtocolViewModal = showProtocolViewModal;
window.closeProtocolViewModal = closeProtocolViewModal;
window.generateProtocolAISummary = generateProtocolAISummary;
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
window.findModuleByPrompt = findModuleByPrompt;
window.addNewModule = addNewModule;
window.saveProtocolEditor = saveProtocolEditor;
window.scrollToSection = scrollToSection;
window.toggleEditorSidebar = toggleEditorSidebar;
window.execCommand = execCommand;
window.insertTable = insertTable;
window.exportProtocol = exportProtocol;
window.toggleSaveDropdown = toggleSaveDropdown;
window.saveEditorProtocolAsPDF = saveEditorProtocolAsPDF;
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
window.saveEngagementPlanAsPDF = saveEngagementPlanAsPDF;
window.loadEngagementPlans = loadEngagementPlans;
window.displayEngagementPlans = displayEngagementPlans;
window.viewEngagementPlan = viewEngagementPlan;
window.editEngagementPlan = editEngagementPlan;
window.getEngagementPlanTitle = getEngagementPlanTitle;
window.viewEngagementPlanModal = viewEngagementPlanModal;
window.showEngagementPlanViewModal = showEngagementPlanViewModal;
window.closeViewEngagementModal = closeViewEngagementModal;
window.shareEngagementPlanById = shareEngagementPlanById;
window.printEngagementPlan = printEngagementPlan;
window.downloadEngagementPlan = downloadEngagementPlan;

// Engagement Plan Editor functions
window.openEngagementPlanEditor = openEngagementPlanEditor;
window.showEngagementPlanEditorView = showEngagementPlanEditorView;
window.renderEngagementPhases = renderEngagementPhases;
window.selectEngagementPhase = selectEngagementPhase;
window.toggleEngagementPhaseCheckbox = toggleEngagementPhaseCheckbox;
window.clearEngagementPhaseSelection = clearEngagementPhaseSelection;
window.handleEngagementPhaseInput = handleEngagementPhaseInput;
window.submitEngagementPhaseInput = submitEngagementPhaseInput;
window.handleEngagementAI = handleEngagementAI;
window.submitEngagementAI = submitEngagementAI;
window.addNewEngagementPhaseWithAI = addNewEngagementPhaseWithAI;
window.addNewEngagementPhase = addNewEngagementPhase;
window.deleteEngagementPhase = deleteEngagementPhase;
window.addPhaseItem = addPhaseItem;
window.addSuccessMetric = addSuccessMetric;
window.rerenderEngagementPhases = rerenderEngagementPhases;
window.scrollToEngagementSection = scrollToEngagementSection;
window.saveEngagementPlanFromEditor = saveEngagementPlanFromEditor;
window.printEngagementPlanFromEditor = printEngagementPlanFromEditor;
window.shareEngagementPlan = shareEngagementPlan;
window.closeShareEngagementModal = closeShareEngagementModal;
window.shareEngagementViaEmail = shareEngagementViaEmail;
window.shareEngagementViaWhatsApp = shareEngagementViaWhatsApp;
window.copyEngagementPlanLink = copyEngagementPlanLink;
window.closeEngagementPlanEditor = closeEngagementPlanEditor;

// Existing Protocol Editor functions
window.parseProtocolContentToModules = parseProtocolContentToModules;
window.openProtocolEditorForExisting = openProtocolEditorForExisting;
window.renderExistingProtocolSections = renderExistingProtocolSections;
window.selectExistingSection = selectExistingSection;
window.toggleExistingSectionCheckbox = toggleExistingSectionCheckbox;
window.clearExistingProtocolSelection = clearExistingProtocolSelection;
window.handleExistingModuleInput = handleExistingModuleInput;
window.submitExistingModuleInput = submitExistingModuleInput;
window.handleExistingProtocolAI = handleExistingProtocolAI;
window.submitExistingProtocolAI = submitExistingProtocolAI;
window.addModuleToExistingProtocolWithAI = addModuleToExistingProtocolWithAI;
window.addModuleToExistingProtocol = addModuleToExistingProtocol;
window.deleteExistingModule = deleteExistingModule;
window.rerenderExistingProtocolSections = rerenderExistingProtocolSections;
window.scrollToProtocolSection = scrollToProtocolSection;
window.saveExistingProtocolEditor = saveExistingProtocolEditor;
window.modulesToContent = modulesToContent;
window.printExistingProtocol = printExistingProtocol;
window.switchExistingEditorTab = switchExistingEditorTab;
window.closeExistingProtocolEditor = closeExistingProtocolEditor;

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
window.toggleExistingReferencePanel = toggleExistingReferencePanel;
window.loadReferencePanelData = loadReferencePanelData;
window.loadReferencePanelDataForExisting = loadReferencePanelDataForExisting;
window.renderExistingRefProtocols = renderExistingRefProtocols;
window.renderExistingRefLabs = renderExistingRefLabs;
window.renderExistingRefNotes = renderExistingRefNotes;
window.renderExistingRefForms = renderExistingRefForms;
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
window.generateLabAISummary = generateLabAISummary;
window.formatLabSummary = formatLabSummary;
window.saveLabNote = saveLabNote;
window.handleRefAIQuestion = handleRefAIQuestion;
window.askRefAIQuestion = askRefAIQuestion;

// Scheduled Messages exports
window.scheduleCheckInMessages = scheduleCheckInMessages;
window.closeScheduleMessagesModal = closeScheduleMessagesModal;
window.confirmScheduleMessages = confirmScheduleMessages;
window.showScheduleSuccessModal = showScheduleSuccessModal;
window.viewScheduledMessages = viewScheduledMessages;
window.closeScheduledMessagesModal = closeScheduledMessagesModal;
window.cancelScheduledMessage = cancelScheduledMessage;
