/**
 * Admin Dashboard JavaScript
 * Handles user management, roles, tenants, and KB sharing
 */

// Global state
let currentUser = null;
let isPlatformAdmin = false;
let currentTenant = null;
let currentTenantId = null;
let editingUserId = null;
let editingTenantId = null;
let selectedRoleId = null;
let searchTimeout = null;

// API helper
async function api(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    window.location.href = '/login';
    return;
  }

  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`/api/admin${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  const token = localStorage.getItem('auth_token');
  if (!token) {
    window.location.href = '/login';
    return;
  }

  // Load user info
  const userStr = localStorage.getItem('user');
  if (userStr) {
    currentUser = JSON.parse(userStr);
    updateUserDisplay();
  }

  // Load initial data
  try {
    const stats = await api('/stats');
    isPlatformAdmin = stats.scope === 'platform';
    currentTenant = stats.tenantName;
    currentTenantId = stats.tenantId;

    updateUIForUserType();
    updateStats(stats);

    // Handle URL hash for section navigation
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    // Initialize nav items
    initNavigation();

  } catch (error) {
    console.error('Failed to initialize admin:', error);
    showToast('Failed to load admin data', 'error');
  }
});

// Update UI based on user type (platform admin vs clinic admin)
function updateUIForUserType() {
  const platformOnlyElements = document.querySelectorAll('.platform-only');
  platformOnlyElements.forEach(el => {
    el.style.display = isPlatformAdmin ? '' : 'none';
  });

  if (currentTenant) {
    const tenantBadge = document.getElementById('tenantBadge');
    const tenantName = document.getElementById('tenantName');
    tenantBadge.style.display = 'flex';
    tenantName.textContent = currentTenant;
  }
}

// Update user display in header
function updateUserDisplay() {
  if (!currentUser) return;

  const nameEl = document.getElementById('dropdownUserName');
  const emailEl = document.getElementById('dropdownUserEmail');
  const avatars = document.querySelectorAll('.user-avatar, .dropdown-avatar');

  if (nameEl) {
    nameEl.textContent = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Admin User';
  }
  if (emailEl) {
    emailEl.textContent = currentUser.email || '';
  }

  const name = encodeURIComponent(`${currentUser.firstName || 'A'} ${currentUser.lastName || ''}`);
  avatars.forEach(el => {
    el.src = `https://ui-avatars.com/api/?name=${name}&background=0F766E&color=fff&size=40`;
  });
}

// Update stats display
function updateStats(stats) {
  document.getElementById('statUsers').textContent = stats.totalUsers || 0;
  document.getElementById('statClients').textContent = stats.totalClients || 0;
  document.getElementById('statProtocols').textContent = stats.totalProtocols || 0;

  if (isPlatformAdmin && stats.totalTenants !== undefined) {
    document.getElementById('statTenants').textContent = stats.totalTenants;
    document.getElementById('tenantsStatCard').style.display = '';
  }

  // Render activity
  if (stats.recentActivity && stats.recentActivity.length > 0) {
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = stats.recentActivity.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${getActionIcon(activity.action)}</div>
        <div class="activity-content">
          <p class="activity-text">${formatAction(activity.action, activity.entity_type)}</p>
          <p class="activity-meta">${activity.first_name || 'System'} ${activity.last_name || ''} - ${formatDate(activity.created_at)}</p>
        </div>
      </div>
    `).join('');
  } else {
    document.getElementById('activityList').innerHTML = '<p class="empty-state">No recent activity</p>';
  }
}

// Navigation
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      showSection(section);
    });
  });
}

function handleHashChange() {
  const hash = window.location.hash.slice(1) || 'dashboard';
  showSection(hash);
}

function showSection(sectionName) {
  // Update URL hash
  window.location.hash = sectionName;

  // Update tab active state (horizontal tabs)
  document.querySelectorAll('.admin-tab[data-section]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.section === sectionName);
  });

  // Also update nav active state for backwards compatibility
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionName);
  });

  // Show/hide sections
  document.querySelectorAll('.admin-section').forEach(section => {
    section.classList.toggle('active', section.id === `${sectionName}-section`);
  });

  // Update page title
  const titles = {
    dashboard: 'Admin Dashboard',
    users: 'User Management',
    roles: 'Roles & Permissions',
    tenants: 'Clinic Management',
    kb: 'KB Sharing',
    audit: 'Audit Log'
  };
  document.getElementById('pageTitle').textContent = 'Admin Settings';
  document.getElementById('breadcrumbSection').textContent = titles[sectionName] || 'Dashboard';

  // Load section data
  switch (sectionName) {
    case 'users':
      loadUsers();
      break;
    case 'roles':
      loadRoles();
      break;
    case 'tenants':
      loadTenants();
      break;
    case 'kb':
      loadKBCollections();
      break;
    case 'audit':
      loadAuditLog();
      break;
  }
}

// ============================================
// USERS
// ============================================

async function loadUsers() {
  const search = document.getElementById('userSearch')?.value || '';
  const role = document.getElementById('userRoleFilter')?.value || '';
  const status = document.getElementById('userStatusFilter')?.value || '';

  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Loading users...</td></tr>';

  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (status) params.append('status', status);

    const data = await api(`/users?${params}`);

    if (data.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No users found</td></tr>';
      return;
    }

    tbody.innerHTML = data.users.map(user => `
      <tr>
        <td>
          <div class="user-cell">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(`${user.first_name || 'U'} ${user.last_name || ''}`)}&background=0F766E&color=fff&size=32" class="user-avatar-sm">
            <div>
              <span class="user-name">${user.first_name || ''} ${user.last_name || ''}</span>
              ${user.is_platform_admin ? '<span class="badge badge-purple">Platform Admin</span>' : ''}
            </div>
          </div>
        </td>
        <td>${user.email}</td>
        <td>
          ${user.roles.map(r => `<span class="badge badge-${getRoleBadgeColor(r.name)}">${formatRoleName(r.name)}</span>`).join(' ')}
        </td>
        <td class="platform-only">${user.tenant_name || '-'}</td>
        <td>
          <span class="status-badge status-${user.status}">${user.status}</span>
        </td>
        <td>${user.last_login ? formatDate(user.last_login) : 'Never'}</td>
        <td>
          <div class="action-buttons">
            <button class="icon-btn" onclick="editUser(${user.id})" title="Edit">
              <svg viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="icon-btn" onclick="toggleUserStatus(${user.id}, '${user.status}')" title="${user.status === 'enabled' ? 'Disable' : 'Enable'}">
              <svg viewBox="0 0 24 24" fill="none">${user.status === 'enabled' ? '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}</svg>
            </button>
            <button class="icon-btn icon-btn-danger" onclick="deleteUser(${user.id})" title="Delete">
              <svg viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Apply platform-only visibility
    updateUIForUserType();

  } catch (error) {
    console.error('Failed to load users:', error);
    tbody.innerHTML = `<tr><td colspan="7" class="error-row">Error: ${error.message}</td></tr>`;
  }
}

function openUserModal(userId = null) {
  editingUserId = userId;
  const modal = document.getElementById('userModal');
  const form = document.getElementById('userForm');
  const title = document.getElementById('userModalTitle');
  const submitBtn = document.getElementById('userSubmitBtn');
  const passwordGroup = document.getElementById('passwordGroup');

  form.reset();
  loadRoleCheckboxes();

  if (userId) {
    title.textContent = 'Edit User';
    submitBtn.textContent = 'Save Changes';
    passwordGroup.querySelector('label').textContent = 'New Password (leave blank to keep current)';
    document.getElementById('userPassword').required = false;
    loadUserForEdit(userId);
  } else {
    title.textContent = 'Add New User';
    submitBtn.textContent = 'Create User';
    passwordGroup.querySelector('label').textContent = 'Password';
    document.getElementById('userPassword').required = true;
  }

  if (isPlatformAdmin) {
    loadTenantsForSelect();
    document.getElementById('userTenantGroup').style.display = '';
  }

  modal.classList.add('active');
}

function closeUserModal() {
  document.getElementById('userModal').classList.remove('active');
  editingUserId = null;
}

async function loadUserForEdit(userId) {
  try {
    const data = await api(`/users/${userId}`);
    const user = data.user;

    document.getElementById('userFirstName').value = user.first_name || '';
    document.getElementById('userLastName').value = user.last_name || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userJobTitle').value = user.job_title || '';
    document.getElementById('userPhone').value = user.phone || '';

    if (isPlatformAdmin && user.tenant_id) {
      document.getElementById('userTenant').value = user.tenant_id;
    }

    // Set role checkboxes
    user.roles.forEach(role => {
      const checkbox = document.querySelector(`#roleCheckboxes input[value="${role.name}"]`);
      if (checkbox) checkbox.checked = true;
    });

  } catch (error) {
    showToast('Failed to load user: ' + error.message, 'error');
  }
}

async function loadRoleCheckboxes() {
  try {
    const data = await api('/roles');
    const container = document.getElementById('roleCheckboxes');

    container.innerHTML = data.roles.map(role => `
      <label class="checkbox-label">
        <input type="checkbox" name="roles" value="${role.name}">
        <span>${formatRoleName(role.name)}</span>
      </label>
    `).join('');

  } catch (error) {
    console.error('Failed to load roles:', error);
  }
}

async function handleUserSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const roles = Array.from(form.querySelectorAll('input[name="roles"]:checked')).map(cb => cb.value);

  const userData = {
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    job_title: formData.get('job_title'),
    phone: formData.get('phone'),
    roles
  };

  if (formData.get('password')) {
    userData.password = formData.get('password');
  }

  if (isPlatformAdmin && formData.get('tenant_id')) {
    userData.tenant_id = parseInt(formData.get('tenant_id'));
  }

  try {
    if (editingUserId) {
      await api(`/users/${editingUserId}`, { method: 'PUT', body: userData });
      if (roles.length > 0) {
        await api(`/users/${editingUserId}/roles`, { method: 'PUT', body: { roles } });
      }
      showToast('User updated successfully', 'success');
    } else {
      await api('/users', { method: 'POST', body: userData });
      showToast('User created successfully', 'success');
    }

    closeUserModal();
    loadUsers();

  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function editUser(userId) {
  openUserModal(userId);
}

async function toggleUserStatus(userId, currentStatus) {
  const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
  const action = newStatus === 'enabled' ? 'enable' : 'disable';

  if (!confirm(`Are you sure you want to ${action} this user?`)) return;

  try {
    await api(`/users/${userId}/status`, {
      method: 'PUT',
      body: { status: newStatus }
    });
    showToast(`User ${newStatus} successfully`, 'success');
    loadUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

  try {
    await api(`/users/${userId}`, { method: 'DELETE' });
    showToast('User deleted successfully', 'success');
    loadUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Invite Modal
function openInviteModal() {
  document.getElementById('inviteModal').classList.add('active');
}

function closeInviteModal() {
  document.getElementById('inviteModal').classList.remove('active');
  document.getElementById('inviteForm').reset();
}

async function handleInviteSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);

  try {
    const data = await api('/users/invite', {
      method: 'POST',
      body: {
        email: formData.get('email'),
        role: formData.get('role')
      }
    });

    showToast('Invitation sent successfully!', 'success');

    // Show invite URL (in production, this would be emailed)
    if (data.inviteUrl) {
      alert(`Invitation link (copy and send to user):\n\n${data.inviteUrl}`);
    }

    closeInviteModal();

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============================================
// ROLES
// ============================================

async function loadRoles() {
  const grid = document.getElementById('rolesGrid');
  grid.innerHTML = '<p class="empty-state">Loading roles...</p>';

  try {
    const data = await api('/roles');

    grid.innerHTML = data.roles.map(role => `
      <div class="role-card ${selectedRoleId === role.id ? 'selected' : ''}" onclick="selectRole(${role.id})">
        <div class="role-header">
          <h4>${formatRoleName(role.name)}</h4>
          <span class="badge badge-gray">${role.user_count} users</span>
        </div>
        <p class="role-description">${role.description || 'No description'}</p>
        ${!['super_admin', 'clinic_admin', 'doctor', 'therapist', 'receptionist'].includes(role.name) ? `
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteRole(${role.id})">Delete</button>
        ` : ''}
      </div>
    `).join('');

    // Load modules for permission matrix
    loadModulesForMatrix();

  } catch (error) {
    grid.innerHTML = `<p class="error-state">Error: ${error.message}</p>`;
  }
}

async function selectRole(roleId) {
  selectedRoleId = roleId;

  // Update UI
  document.querySelectorAll('.role-card').forEach(card => {
    card.classList.remove('selected');
  });
  event?.currentTarget?.classList.add('selected');

  // Load permissions for this role
  loadRolePermissions(roleId);
}

async function loadModulesForMatrix() {
  try {
    const data = await api('/modules');
    window.adminModules = data.modules;
  } catch (error) {
    console.error('Failed to load modules:', error);
  }
}

async function loadRolePermissions(roleId) {
  const matrix = document.getElementById('permissionMatrix');
  matrix.innerHTML = '<p class="empty-state">Loading permissions...</p>';

  try {
    const data = await api(`/roles/${roleId}`);

    matrix.innerHTML = `
      <table class="permission-table">
        <thead>
          <tr>
            <th>Module</th>
            <th>View</th>
            <th>Create</th>
            <th>Edit</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          ${data.permissions.map(perm => `
            <tr>
              <td>${perm.display_name}</td>
              <td><input type="checkbox" ${perm.can_view ? 'checked' : ''} data-module="${perm.module_id}" data-perm="view" onchange="updatePermission(${roleId}, ${perm.module_id}, 'view', this.checked)"></td>
              <td><input type="checkbox" ${perm.can_create ? 'checked' : ''} data-module="${perm.module_id}" data-perm="create" onchange="updatePermission(${roleId}, ${perm.module_id}, 'create', this.checked)"></td>
              <td><input type="checkbox" ${perm.can_edit ? 'checked' : ''} data-module="${perm.module_id}" data-perm="edit" onchange="updatePermission(${roleId}, ${perm.module_id}, 'edit', this.checked)"></td>
              <td><input type="checkbox" ${perm.can_delete ? 'checked' : ''} data-module="${perm.module_id}" data-perm="delete" onchange="updatePermission(${roleId}, ${perm.module_id}, 'delete', this.checked)"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${isPlatformAdmin ? '<button class="btn btn-primary mt-3" onclick="savePermissions(' + roleId + ')">Save Permissions</button>' : ''}
    `;

  } catch (error) {
    matrix.innerHTML = `<p class="error-state">Error: ${error.message}</p>`;
  }
}

async function savePermissions(roleId) {
  const matrix = document.getElementById('permissionMatrix');
  const checkboxes = matrix.querySelectorAll('input[type="checkbox"]');

  const permissionsMap = {};

  checkboxes.forEach(cb => {
    const moduleId = cb.dataset.module;
    const perm = cb.dataset.perm;

    if (!permissionsMap[moduleId]) {
      permissionsMap[moduleId] = { module_id: parseInt(moduleId) };
    }
    permissionsMap[moduleId][`can_${perm}`] = cb.checked;
  });

  const permissions = Object.values(permissionsMap);

  try {
    await api(`/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: { permissions }
    });
    showToast('Permissions saved successfully', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openRoleModal() {
  document.getElementById('roleModal').classList.add('active');
  loadModulesForNewRole();
}

function closeRoleModal() {
  document.getElementById('roleModal').classList.remove('active');
  document.getElementById('roleForm').reset();
}

async function loadModulesForNewRole() {
  const container = document.getElementById('newRolePermissions');

  if (!window.adminModules) {
    await loadModulesForMatrix();
  }

  container.innerHTML = (window.adminModules || []).map(mod => `
    <div class="permission-row">
      <span class="module-name">${mod.display_name}</span>
      <label><input type="checkbox" name="perm_${mod.id}_view"> View</label>
      <label><input type="checkbox" name="perm_${mod.id}_create"> Create</label>
      <label><input type="checkbox" name="perm_${mod.id}_edit"> Edit</label>
      <label><input type="checkbox" name="perm_${mod.id}_delete"> Delete</label>
    </div>
  `).join('');
}

async function handleRoleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);

  try {
    // Create role
    const roleData = await api('/roles', {
      method: 'POST',
      body: {
        name: formData.get('name').toLowerCase().replace(/\s+/g, '_'),
        description: formData.get('description')
      }
    });

    // Set permissions
    const permissions = [];
    (window.adminModules || []).forEach(mod => {
      permissions.push({
        module_id: mod.id,
        can_view: formData.get(`perm_${mod.id}_view`) === 'on',
        can_create: formData.get(`perm_${mod.id}_create`) === 'on',
        can_edit: formData.get(`perm_${mod.id}_edit`) === 'on',
        can_delete: formData.get(`perm_${mod.id}_delete`) === 'on'
      });
    });

    await api(`/roles/${roleData.role.id}/permissions`, {
      method: 'PUT',
      body: { permissions }
    });

    showToast('Role created successfully', 'success');
    closeRoleModal();
    loadRoles();

  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteRole(roleId) {
  if (!confirm('Are you sure you want to delete this role? Users with this role will need to be reassigned.')) return;

  try {
    await api(`/roles/${roleId}`, { method: 'DELETE' });
    showToast('Role deleted successfully', 'success');
    loadRoles();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============================================
// TENANTS
// ============================================

async function loadTenants() {
  if (!isPlatformAdmin) return;

  const grid = document.getElementById('tenantsGrid');
  grid.innerHTML = '<p class="empty-state">Loading clinics...</p>';

  const search = document.getElementById('tenantSearch')?.value || '';
  const status = document.getElementById('tenantStatusFilter')?.value || '';

  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const data = await api(`/tenants?${params}`);

    if (data.tenants.length === 0) {
      grid.innerHTML = '<p class="empty-state">No clinics found</p>';
      return;
    }

    grid.innerHTML = data.tenants.map(tenant => `
      <div class="tenant-card">
        <div class="tenant-header">
          <div class="tenant-logo" style="background-color: ${tenant.primary_color || '#0d9488'}">
            ${tenant.logo_url ? `<img src="${tenant.logo_url}" alt="${tenant.name}">` : tenant.name.charAt(0)}
          </div>
          <div class="tenant-info">
            <h4>${tenant.name}</h4>
            <span class="tenant-slug">${tenant.slug}</span>
          </div>
          <span class="status-badge status-${tenant.status}">${tenant.status}</span>
        </div>
        <div class="tenant-stats">
          <div class="tenant-stat">
            <span class="stat-value">${tenant.user_count || 0}</span>
            <span class="stat-label">Users</span>
          </div>
          <div class="tenant-stat">
            <span class="stat-value">${tenant.client_count || 0}</span>
            <span class="stat-label">Clients</span>
          </div>
          <div class="tenant-stat">
            <span class="stat-value">${tenant.subscription_tier}</span>
            <span class="stat-label">Plan</span>
          </div>
        </div>
        <div class="tenant-actions">
          <button class="btn btn-sm btn-secondary" onclick="editTenant(${tenant.id})">Edit</button>
          <button class="btn btn-sm btn-secondary" onclick="viewTenantUsers(${tenant.id})">Users</button>
          ${tenant.status === 'active' ? `
            <button class="btn btn-sm btn-danger" onclick="deactivateTenant(${tenant.id})">Deactivate</button>
          ` : ''}
        </div>
      </div>
    `).join('');

  } catch (error) {
    grid.innerHTML = `<p class="error-state">Error: ${error.message}</p>`;
  }
}

async function loadTenantsForSelect() {
  try {
    const data = await api('/tenants');
    const select = document.getElementById('userTenant');

    select.innerHTML = '<option value="">Select clinic...</option>' +
      data.tenants.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

  } catch (error) {
    console.error('Failed to load tenants for select:', error);
  }
}

function openTenantModal(tenantId = null) {
  editingTenantId = tenantId;
  const modal = document.getElementById('tenantModal');
  const form = document.getElementById('tenantForm');
  const title = document.getElementById('tenantModalTitle');
  const submitBtn = document.getElementById('tenantSubmitBtn');

  form.reset();

  if (tenantId) {
    title.textContent = 'Edit Clinic';
    submitBtn.textContent = 'Save Changes';
    loadTenantForEdit(tenantId);
  } else {
    title.textContent = 'Add New Clinic';
    submitBtn.textContent = 'Create Clinic';
  }

  modal.classList.add('active');
}

function closeTenantModal() {
  document.getElementById('tenantModal').classList.remove('active');
  editingTenantId = null;
}

async function loadTenantForEdit(tenantId) {
  try {
    const data = await api(`/tenants/${tenantId}`);
    const tenant = data.tenant;

    document.getElementById('tenantName').value = tenant.name || '';
    document.getElementById('tenantSlug').value = tenant.slug || '';
    document.getElementById('tenantColor').value = tenant.primary_color || '#0d9488';
    document.getElementById('tenantTier').value = tenant.subscription_tier || 'starter';
    document.getElementById('tenantKbMode').value = tenant.kb_sharing_mode || 'private';

  } catch (error) {
    showToast('Failed to load clinic: ' + error.message, 'error');
  }
}

async function handleTenantSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);

  const tenantData = {
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
    primary_color: formData.get('primary_color'),
    subscription_tier: formData.get('subscription_tier'),
    kb_sharing_mode: formData.get('kb_sharing_mode')
  };

  try {
    if (editingTenantId) {
      await api(`/tenants/${editingTenantId}`, { method: 'PUT', body: tenantData });
      showToast('Clinic updated successfully', 'success');
    } else {
      await api('/tenants', { method: 'POST', body: tenantData });
      showToast('Clinic created successfully', 'success');
    }

    closeTenantModal();
    loadTenants();

  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function editTenant(tenantId) {
  openTenantModal(tenantId);
}

async function viewTenantUsers(tenantId) {
  // Navigate to users section with tenant filter
  showSection('users');
  // TODO: Add tenant filter to users
}

async function deactivateTenant(tenantId) {
  if (!confirm('Are you sure you want to deactivate this clinic? Users will lose access.')) return;

  try {
    await api(`/tenants/${tenantId}`, { method: 'DELETE' });
    showToast('Clinic deactivated', 'success');
    loadTenants();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============================================
// KB COLLECTIONS
// ============================================

async function loadKBCollections() {
  const grid = document.getElementById('kbCollectionsGrid');
  grid.innerHTML = '<p class="empty-state">Loading KB collections...</p>';

  try {
    // Use the global tenantId set at init
    if (!currentTenantId && !isPlatformAdmin) {
      grid.innerHTML = '<p class="empty-state">No tenant associated with your account</p>';
      return;
    }

    // This would need the tenant ID - for now show placeholder
    grid.innerHTML = `
      <div class="kb-collection-card">
        <div class="collection-header">
          <h4>Global Knowledge Base</h4>
          <span class="badge badge-green">Shared</span>
        </div>
        <p class="collection-description">Shared ExpandHealth medical knowledge across all clinics</p>
        <div class="collection-stats">
          <span>Documents: -</span>
        </div>
      </div>
      <div class="kb-collection-card">
        <div class="collection-header">
          <h4>Private Collection</h4>
          <span class="badge badge-gray">Private</span>
        </div>
        <p class="collection-description">Clinic-specific proprietary documents</p>
        <div class="collection-stats">
          <span>Documents: -</span>
        </div>
        <button class="btn btn-sm btn-secondary mt-2" onclick="toggleKBSharing(1)">Share with Network</button>
      </div>
    `;

  } catch (error) {
    grid.innerHTML = `<p class="error-state">Error: ${error.message}</p>`;
  }
}

async function toggleKBSharing(collectionId) {
  // TODO: Implement KB sharing toggle
  showToast('KB sharing toggle coming soon', 'info');
}

// ============================================
// AUDIT LOG
// ============================================

async function loadAuditLog() {
  const tbody = document.getElementById('auditTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Loading audit log...</td></tr>';

  const action = document.getElementById('auditActionFilter')?.value || '';

  try {
    const params = new URLSearchParams();
    if (action) params.append('action', action);
    params.append('limit', '50');

    const data = await api(`/audit-log?${params}`);

    if (data.logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No audit logs found</td></tr>';
      return;
    }

    tbody.innerHTML = data.logs.map(log => `
      <tr>
        <td>${formatDateTime(log.created_at)}</td>
        <td>${log.first_name || 'System'} ${log.last_name || ''}</td>
        <td><span class="badge badge-${getActionBadgeColor(log.action)}">${formatAction(log.action)}</span></td>
        <td>${log.entity_type || '-'} ${log.entity_id ? `#${log.entity_id}` : ''}</td>
        <td><button class="btn btn-sm btn-secondary" onclick="viewAuditDetails(${log.id})">View</button></td>
      </tr>
    `).join('');

  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="error-row">Error: ${error.message}</td></tr>`;
  }
}

function viewAuditDetails(logId) {
  // TODO: Show modal with full audit details
  showToast('Audit detail view coming soon', 'info');
}

// ============================================
// UTILITIES
// ============================================

function debounceSearch(callback) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(callback, 300);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function formatRoleName(name) {
  return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatAction(action, entityType) {
  const actions = {
    create_user: 'Created user',
    update_user: 'Updated user',
    delete_user: 'Deleted user',
    enabled_user: 'Enabled user',
    disabled_user: 'Disabled user',
    update_user_roles: 'Changed user roles',
    send_invitation: 'Sent invitation',
    create_tenant: 'Created clinic',
    update_tenant: 'Updated clinic',
    deactivate_tenant: 'Deactivated clinic',
    create_role: 'Created role',
    update_role_permissions: 'Updated role permissions',
    delete_role: 'Deleted role',
    create_kb_collection: 'Created KB collection',
    update_kb_sharing: 'Updated KB sharing'
  };
  return actions[action] || action.replace(/_/g, ' ');
}

function getActionIcon(action) {
  if (action.includes('create')) return '<svg viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  if (action.includes('update')) return '<svg viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  if (action.includes('delete') || action.includes('deactivate')) return '<svg viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10"/></svg>';
}

function getRoleBadgeColor(role) {
  const colors = {
    super_admin: 'purple',
    clinic_admin: 'blue',
    doctor: 'green',
    therapist: 'teal',
    receptionist: 'gray'
  };
  return colors[role] || 'gray';
}

function getActionBadgeColor(action) {
  if (action.includes('create')) return 'green';
  if (action.includes('update')) return 'blue';
  if (action.includes('delete') || action.includes('deactivate')) return 'red';
  return 'gray';
}

// Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">&times;</button>
  `;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 5000);
}

// User menu
function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  dropdown.classList.toggle('active');
}

document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('userDropdown');
  const wrapper = document.querySelector('.user-menu-wrapper');
  if (dropdown && wrapper && !wrapper.contains(event.target)) {
    dropdown.classList.remove('active');
  }
});

function handleLogout() {
  if (confirm('Are you sure you want to log out?')) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}
