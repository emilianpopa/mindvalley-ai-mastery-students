/**
 * Protocol Builder JavaScript
 * Handles creating and editing protocol templates
 */

const API_BASE = window.location.origin;

// Get template ID from URL (if editing)
const pathParts = window.location.pathname.split('/');
const isEdit = pathParts.includes('edit');
const templateId = isEdit ? pathParts[pathParts.length - 2] : null;

// DOM Elements
const pageTitle = document.getElementById('pageTitle');
const breadcrumbTitle = document.getElementById('breadcrumbTitle');
const templateNameInput = document.getElementById('templateName');
const categorySelect = document.getElementById('category');
const durationInput = document.getElementById('duration');
const descriptionTextarea = document.getElementById('description');
const modulesList = document.getElementById('modulesList');
const saveBtn = document.getElementById('saveBtn');
const saveBtnText = document.getElementById('saveBtnText');
const loadingState = document.getElementById('loadingState');
const builderForm = document.getElementById('builderForm');

// State
let modules = [];
let currentTemplate = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (isEdit && templateId) {
    loadTemplate();
  } else {
    // Start with one empty module for new templates
    addModule();
  }
});

// Load existing template for editing
async function loadTemplate() {
  try {
    loadingState.style.display = 'flex';
    builderForm.style.display = 'none';

    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const response = await fetch(`${API_BASE}/api/protocols/templates/${templateId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (response.status === 404) {
      alert('Template not found');
      window.location.href = '/protocol-templates';
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to load template');
    }

    const data = await response.json();
    currentTemplate = data.template;

    // Update page title
    pageTitle.textContent = 'Edit Protocol Template';
    breadcrumbTitle.textContent = currentTemplate.name;
    saveBtnText.textContent = 'Update Template';

    // Populate form
    templateNameInput.value = currentTemplate.name;
    categorySelect.value = currentTemplate.category;
    durationInput.value = currentTemplate.duration_weeks || '';
    descriptionTextarea.value = currentTemplate.description || '';

    // Load modules
    modules = Array.isArray(currentTemplate.modules)
      ? currentTemplate.modules
      : JSON.parse(currentTemplate.modules || '[]');

    renderModules();

    loadingState.style.display = 'none';
    builderForm.style.display = 'block';

  } catch (error) {
    console.error('Error loading template:', error);
    alert('Failed to load template. Please try again.');
    window.location.href = '/protocol-templates';
  }
}

// Add new module
function addModule() {
  modules.push({
    week: modules.length + 1,
    title: '',
    description: ''
  });
  renderModules();
}

// Remove module
function removeModule(index) {
  if (modules.length === 1) {
    alert('A protocol must have at least one module.');
    return;
  }

  if (confirm('Are you sure you want to remove this module?')) {
    modules.splice(index, 1);
    // Renumber remaining modules
    modules.forEach((module, idx) => {
      module.week = idx + 1;
    });
    renderModules();
  }
}

// Move module up
function moveModuleUp(index) {
  if (index === 0) return;
  const temp = modules[index];
  modules[index] = modules[index - 1];
  modules[index - 1] = temp;
  // Renumber modules
  modules.forEach((module, idx) => {
    module.week = idx + 1;
  });
  renderModules();
}

// Move module down
function moveModuleDown(index) {
  if (index === modules.length - 1) return;
  const temp = modules[index];
  modules[index] = modules[index + 1];
  modules[index + 1] = temp;
  // Renumber modules
  modules.forEach((module, idx) => {
    module.week = idx + 1;
  });
  renderModules();
}

// Update module data
function updateModule(index, field, value) {
  modules[index][field] = value;
}

// Render modules list
function renderModules() {
  if (modules.length === 0) {
    modulesList.innerHTML = `
      <div class="modules-empty">
        <div class="modules-empty-icon">📋</div>
        <p>No modules yet</p>
        <small>Add modules to define the phases of your protocol</small>
      </div>
    `;
    return;
  }

  modulesList.innerHTML = modules.map((module, index) => `
    <div class="module-card" data-index="${index}">
      <div class="module-header">
        <span class="module-number">
          <span class="drag-handle">⋮⋮</span>
          Module ${module.week}
        </span>
        <div class="module-actions">
          ${index > 0 ? `
            <button class="btn-icon-small" onclick="moveModuleUp(${index})" title="Move up">
              ↑
            </button>
          ` : ''}
          ${index < modules.length - 1 ? `
            <button class="btn-icon-small" onclick="moveModuleDown(${index})" title="Move down">
              ↓
            </button>
          ` : ''}
          <button class="btn-icon-small btn-danger" onclick="removeModule(${index})" title="Remove">
            🗑️
          </button>
        </div>
      </div>

      <div class="module-fields">
        <div class="module-field">
          <label>Week</label>
          <input
            type="number"
            class="form-input"
            value="${module.week}"
            min="1"
            onchange="updateModule(${index}, 'week', parseInt(this.value))"
          >
        </div>

        <div class="module-field">
          <label>Title</label>
          <input
            type="text"
            class="form-input"
            value="${module.title || ''}"
            placeholder="e.g., Foundation Phase"
            oninput="updateModule(${index}, 'title', this.value)"
          >
        </div>

        <div class="module-field">
          <label>Description</label>
          <textarea
            class="form-input"
            placeholder="Describe what happens in this module..."
            oninput="updateModule(${index}, 'description', this.value)"
          >${module.description || ''}</textarea>
        </div>
      </div>
    </div>
  `).join('');
}

// Save template
async function saveTemplate() {
  try {
    // Validation
    const name = templateNameInput.value.trim();
    const category = categorySelect.value;

    if (!name) {
      alert('Please enter a template name');
      templateNameInput.focus();
      return;
    }

    if (!category) {
      alert('Please select a category');
      categorySelect.focus();
      return;
    }

    // Validate modules
    const validModules = modules.filter(m => m.title && m.title.trim());
    if (validModules.length === 0) {
      alert('Please add at least one module with a title');
      return;
    }

    // Disable button
    saveBtn.disabled = true;
    saveBtnText.textContent = isEdit ? 'Updating...' : 'Saving...';

    const token = localStorage.getItem('auth_token');
    const url = isEdit
      ? `${API_BASE}/api/protocols/templates/${templateId}`
      : `${API_BASE}/api/protocols/templates`;

    const method = isEdit ? 'PUT' : 'POST';

    const data = {
      name: name,
      category: category,
      duration_weeks: durationInput.value ? parseInt(durationInput.value) : null,
      description: descriptionTextarea.value.trim() || null,
      modules: validModules
    };

    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    const result = await response.json();

    if (response.ok) {
      alert(result.message || (isEdit ? 'Template updated successfully' : 'Template created successfully'));
      window.location.href = '/protocol-templates';
    } else {
      throw new Error(result.error || 'Failed to save template');
    }

  } catch (error) {
    console.error('Error saving template:', error);
    alert(error.message || 'Failed to save template. Please try again.');
    saveBtn.disabled = false;
    saveBtnText.textContent = isEdit ? 'Update Template' : 'Save Template';
  }
}
