/**
 * Form Builder Page
 * Supports dynamic forms with conditional logic and sections
 */

let formId = null;
let fields = [];
let sections = [{ id: 'section_default', name: 'Section 1', fields: [] }];
let currentSectionIndex = 0;
let editingFieldIndex = null;
let showConditionEditor = {}; // Track which fields have condition editor open

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Check if editing existing form
  const pathParts = window.location.pathname.split('/');
  if (pathParts[2] && pathParts[2] !== 'new') {
    formId = pathParts[2];
    loadForm(formId);
    // Show tabs header, hide simple header when editing
    document.getElementById('formTabsHeader').style.display = 'flex';
    document.getElementById('simpleHeader').style.display = 'none';
  } else {
    // Show simple header for new forms
    document.getElementById('formTabsHeader').style.display = 'none';
    document.getElementById('simpleHeader').style.display = 'flex';
    // Check if coming from PDF upload
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from') === 'pdf') {
      loadParsedPdfData();
    }
  }

  // Close field library when clicking outside
  document.addEventListener('click', (e) => {
    const library = document.getElementById('fieldLibrary');
    const addButton = document.querySelector('.btn-secondary-small');
    if (!library.contains(e.target) && !addButton.contains(e.target)) {
      library.style.display = 'none';
    }
  });
});

// Load existing form for editing
async function loadForm(id) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/forms/templates/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load form');
    }

    const form = await response.json();

    // Populate form settings
    document.getElementById('formName').value = form.name;
    document.getElementById('formDescription').value = form.description || '';
    document.getElementById('formCategory').value = form.category || '';
    document.getElementById('formStatus').value = form.status || 'draft';

    // Populate form settings (stored as hidden values)
    const settings = form.settings || {};
    document.getElementById('allowMultiple').value = settings.allowMultipleSubmissions || false;
    document.getElementById('showProgress').value = settings.showProgressBar !== false;
    document.getElementById('requireLogin').value = settings.requireLogin !== false;
    document.getElementById('sendConfirmation').value = settings.sendConfirmationEmail || false;

    // Load fields
    fields = form.fields || [];
    renderFields();

    // Update breadcrumb
    document.getElementById('breadcrumbTitle').textContent = form.name;

    // Update publish button state
    updatePublishButton(form.status);

    // Update sharing URL
    showSharingSection(id);

    // Update unpublish toggle based on status
    const unpublishToggle = document.getElementById('unpublishForm');
    if (unpublishToggle) {
      unpublishToggle.checked = form.status !== 'published';
    }
  } catch (error) {
    console.error('Error loading form:', error);
    alert('Failed to load form');
  }
}

// Update publish button state
function updatePublishButton(status) {
  const publishBtn = document.getElementById('publishBtn');
  if (publishBtn) {
    if (status === 'published') {
      publishBtn.textContent = 'Published';
      publishBtn.classList.add('published');
    } else {
      publishBtn.textContent = 'Publish';
      publishBtn.classList.remove('published');
    }
  }
}

// Show sharing section with URL
function showSharingSection(id) {
  // Generate the public form URL
  const baseUrl = window.location.origin;
  const publicUrl = `${baseUrl}/f/${id}`;

  // Update the sharing URL input (in settings view)
  const sharingUrl = document.getElementById('sharingUrl');
  if (sharingUrl) {
    sharingUrl.value = publicUrl;
  }
}

// Copy share URL to clipboard
function copyShareUrl() {
  const sharingUrl = document.getElementById('sharingUrl');
  const copyIcon = document.getElementById('copyIcon');

  navigator.clipboard.writeText(sharingUrl.value).then(() => {
    // Show success feedback
    copyIcon.textContent = '✓';

    setTimeout(() => {
      copyIcon.textContent = '📋';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    // Fallback for older browsers
    sharingUrl.select();
    document.execCommand('copy');
    copyIcon.textContent = '✓';

    setTimeout(() => {
      copyIcon.textContent = '📋';
    }, 2000);
  });
}

// Preview form in new tab (with preview mode to skip OTP)
function previewForm() {
  if (formId) {
    window.open(`/f/${formId}?preview=true`, '_blank');
  }
}

// Show field library popup
function showFieldLibrary() {
  const library = document.getElementById('fieldLibrary');
  library.style.display = library.style.display === 'none' ? 'block' : 'none';
}

// Add new field
function addField(type) {
  const fieldId = `field_${Date.now()}`;
  const newField = {
    id: fieldId,
    type: type,
    label: '',
    required: false,
    placeholder: ''
  };

  // Add type-specific properties
  if (type === 'radio' || type === 'checkbox') {
    newField.options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' }
    ];
  } else if (type === 'range') {
    newField.min = 1;
    newField.max = 10;
    newField.step = 1;
  } else if (type === 'section') {
    newField.label = 'New Section';
    newField.description = '';
    newField.required = false; // Sections are not "required"
  } else if (type === 'ai_personalized') {
    newField.label = 'AI Personalized Questions';
    newField.aiPrompt = 'Based on the client\'s previous answers, generate personalized follow-up questions about their health concerns and goals.';
    newField.questionCount = 3;
    newField.required = false; // AI questions have their own required logic
  }

  fields.push(newField);
  renderFields();

  // Hide library
  document.getElementById('fieldLibrary').style.display = 'none';

  // Scroll to new field
  setTimeout(() => {
    const fieldCard = document.getElementById(`field-${fieldId}`);
    if (fieldCard) {
      fieldCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

// Render all fields
function renderFields() {
  const fieldsList = document.getElementById('fieldsList');
  const emptyState = document.getElementById('emptyFieldsState');

  if (fields.length === 0) {
    fieldsList.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  fieldsList.innerHTML = fields.map((field, index) => renderFieldCard(field, index)).join('');
}

// Render single field card
function renderFieldCard(field, index) {
  const typeIcons = {
    text: '📝',
    textarea: '📄',
    email: '✉️',
    tel: '📞',
    date: '📅',
    radio: '🔘',
    checkbox: '☑️',
    range: '📊',
    section: '📑',
    ai_personalized: '🤖'
  };

  const typeLabels = {
    text: 'Short Text',
    textarea: 'Long Text',
    email: 'Email',
    tel: 'Phone',
    date: 'Date',
    radio: 'Multiple Choice',
    checkbox: 'Checkboxes',
    range: 'Scale',
    section: 'Section Break',
    ai_personalized: 'AI Personalized'
  };

  const hasCondition = field.condition && field.condition.field;
  const conditionOpen = showConditionEditor[field.id] || false;

  return `
    <div class="field-card ${hasCondition ? 'has-condition' : ''}" id="field-${field.id}">
      <div class="field-header">
        <span class="field-type-badge">
          <span>${typeIcons[field.type] || '📋'}</span>
          <span>${typeLabels[field.type] || field.type}</span>
        </span>
        <div class="field-actions">
          ${index > 0 ? `<button class="field-action-btn move" onclick="moveField(${index}, -1)" title="Move up">↑</button>` : ''}
          ${index < fields.length - 1 ? `<button class="field-action-btn move" onclick="moveField(${index}, 1)" title="Move down">↓</button>` : ''}
          <button class="field-action-btn delete" onclick="deleteField(${index})" title="Delete">🗑️</button>
        </div>
      </div>
      ${hasCondition ? `
        <div class="condition-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Shows when: "${getFieldLabelById(field.condition.field)}" ${field.condition.operator} "${field.condition.value}"
        </div>
      ` : ''}
      <div class="field-body">
        ${field.type === 'section' ? `
          <div class="form-group">
            <label>Section Title *</label>
            <input type="text" value="${escapeHtml(field.label)}" onchange="updateField(${index}, 'label', this.value)" placeholder="e.g., Health History">
          </div>
          <div class="form-group">
            <label>Section Description</label>
            <textarea onchange="updateField(${index}, 'description', this.value)" placeholder="Optional description for this section">${escapeHtml(field.description || '')}</textarea>
          </div>
        ` : field.type === 'ai_personalized' ? `
          <div class="form-group">
            <label>AI Question Prompt *</label>
            <textarea onchange="updateField(${index}, 'aiPrompt', this.value)" placeholder="Describe what kind of personalized questions to generate based on previous answers...">${escapeHtml(field.aiPrompt || '')}</textarea>
          </div>
          <div class="form-group">
            <label>Number of Questions</label>
            <input type="number" value="${field.questionCount || 3}" min="1" max="10" onchange="updateField(${index}, 'questionCount', parseInt(this.value))">
          </div>
        ` : `
          <div class="form-group">
            <label>Field Label *</label>
            <input type="text" value="${escapeHtml(field.label)}" onchange="updateField(${index}, 'label', this.value)" placeholder="e.g., Full Name">
          </div>
          ${field.type === 'textarea' || field.type === 'text' || field.type === 'email' ? `
            <div class="form-group">
              <label>Placeholder</label>
              <input type="text" value="${escapeHtml(field.placeholder || '')}" onchange="updateField(${index}, 'placeholder', this.value)" placeholder="Optional hint text">
            </div>
          ` : ''}
          ${field.type === 'range' ? `
            <div class="form-group">
              <label>Min Value</label>
              <input type="number" value="${field.min || 1}" onchange="updateField(${index}, 'min', parseInt(this.value))">
            </div>
            <div class="form-group">
              <label>Max Value</label>
              <input type="number" value="${field.max || 10}" onchange="updateField(${index}, 'max', parseInt(this.value))">
            </div>
          ` : ''}
          ${(field.type === 'radio' || field.type === 'checkbox') ? renderOptionsEditor(field, index) : ''}
        `}

        ${field.type !== 'section' ? `
          <div class="form-group-checkbox">
            <input type="checkbox" id="required-${field.id}" ${field.required ? 'checked' : ''} onchange="updateField(${index}, 'required', this.checked)">
            <label for="required-${field.id}">Required field</label>
          </div>
        ` : ''}

        <!-- Conditional Logic Toggle -->
        ${index > 0 && field.type !== 'section' ? `
          <div class="condition-toggle">
            <button class="condition-toggle-btn ${conditionOpen ? 'active' : ''}" onclick="toggleConditionEditor(${index}, '${field.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              ${hasCondition ? 'Edit Condition' : 'Add Condition'}
            </button>
            ${hasCondition ? `
              <button class="condition-remove-btn" onclick="removeCondition(${index})" title="Remove condition">×</button>
            ` : ''}
          </div>

          ${conditionOpen ? renderConditionEditor(field, index) : ''}
        ` : ''}
      </div>
    </div>
  `;
}

// Get field label by ID for condition display
function getFieldLabelById(fieldId) {
  const field = fields.find(f => f.id === fieldId);
  return field ? field.label : fieldId;
}

// Toggle condition editor visibility
function toggleConditionEditor(index, fieldId) {
  showConditionEditor[fieldId] = !showConditionEditor[fieldId];
  renderFields();
}

// Remove condition from field
function removeCondition(index) {
  delete fields[index].condition;
  renderFields();
}

// Render condition editor
function renderConditionEditor(field, index) {
  // Get all previous fields that can be used as conditions
  const previousFields = fields.slice(0, index).filter(f =>
    f.type === 'radio' || f.type === 'checkbox' || f.type === 'text' || f.type === 'email' || f.type === 'range'
  );

  if (previousFields.length === 0) {
    return `
      <div class="condition-editor">
        <p class="condition-note">No previous fields available for conditions. Add fields above this one first.</p>
      </div>
    `;
  }

  const currentCondition = field.condition || {};
  const selectedField = previousFields.find(f => f.id === currentCondition.field);

  return `
    <div class="condition-editor">
      <p class="condition-title">Show this field when:</p>
      <div class="condition-row">
        <select class="condition-field-select" onchange="updateConditionField(${index}, this.value)">
          <option value="">Select a field...</option>
          ${previousFields.map(f => `
            <option value="${f.id}" ${currentCondition.field === f.id ? 'selected' : ''}>
              ${escapeHtml(f.label || 'Untitled')}
            </option>
          `).join('')}
        </select>

        <select class="condition-operator-select" onchange="updateConditionOperator(${index}, this.value)">
          <option value="equals" ${currentCondition.operator === 'equals' ? 'selected' : ''}>equals</option>
          <option value="not_equals" ${currentCondition.operator === 'not_equals' ? 'selected' : ''}>does not equal</option>
          <option value="contains" ${currentCondition.operator === 'contains' ? 'selected' : ''}>contains</option>
          <option value="not_empty" ${currentCondition.operator === 'not_empty' ? 'selected' : ''}>is not empty</option>
        </select>

        ${currentCondition.operator !== 'not_empty' ? `
          ${selectedField && (selectedField.type === 'radio' || selectedField.type === 'checkbox') ? `
            <select class="condition-value-select" onchange="updateConditionValue(${index}, this.value)">
              <option value="">Select value...</option>
              ${(selectedField.options || []).map(opt => `
                <option value="${escapeHtml(opt.value)}" ${currentCondition.value === opt.value ? 'selected' : ''}>
                  ${escapeHtml(opt.label)}
                </option>
              `).join('')}
            </select>
          ` : `
            <input type="text" class="condition-value-input" value="${escapeHtml(currentCondition.value || '')}"
              onchange="updateConditionValue(${index}, this.value)" placeholder="Value...">
          `}
        ` : ''}
      </div>
    </div>
  `;
}

// Update condition field
function updateConditionField(index, fieldId) {
  if (!fields[index].condition) {
    fields[index].condition = {};
  }
  fields[index].condition.field = fieldId;
  fields[index].condition.value = ''; // Reset value when field changes
  renderFields();
}

// Update condition operator
function updateConditionOperator(index, operator) {
  if (!fields[index].condition) {
    fields[index].condition = {};
  }
  fields[index].condition.operator = operator;
  renderFields();
}

// Update condition value
function updateConditionValue(index, value) {
  if (!fields[index].condition) {
    fields[index].condition = {};
  }
  fields[index].condition.value = value;
  renderFields();
}

// Render options editor for radio/checkbox fields
function renderOptionsEditor(field, fieldIndex) {
  const options = field.options || [];
  return `
    <div class="options-editor">
      <label>Options</label>
      ${options.map((option, optionIndex) => `
        <div class="option-item">
          <input type="text" value="${escapeHtml(option.label)}" onchange="updateOption(${fieldIndex}, ${optionIndex}, 'label', this.value)" placeholder="Option ${optionIndex + 1}">
          <button onclick="removeOption(${fieldIndex}, ${optionIndex})">Remove</button>
        </div>
      `).join('')}
      <button class="add-option-btn" onclick="addOption(${fieldIndex})">+ Add Option</button>
    </div>
  `;
}

// Update field property
function updateField(index, property, value) {
  fields[index][property] = value;
  // Re-render if options changed
  if (property === 'options') {
    renderFields();
  }
}

// Add option to radio/checkbox field
function addOption(fieldIndex) {
  const field = fields[fieldIndex];
  const optionNumber = field.options.length + 1;
  field.options.push({
    value: `option${optionNumber}`,
    label: `Option ${optionNumber}`
  });
  renderFields();
}

// Update option
function updateOption(fieldIndex, optionIndex, property, value) {
  fields[fieldIndex].options[optionIndex][property] = value;
  // Also update value to match label for simplicity
  if (property === 'label') {
    fields[fieldIndex].options[optionIndex].value = value.toLowerCase().replace(/\s+/g, '-');
  }
}

// Remove option
function removeOption(fieldIndex, optionIndex) {
  fields[fieldIndex].options.splice(optionIndex, 1);
  renderFields();
}

// Move field up or down
function moveField(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= fields.length) return;

  // Swap fields
  [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
  renderFields();
}

// Delete field
function deleteField(index) {
  if (!confirm('Are you sure you want to delete this field?')) return;
  fields.splice(index, 1);
  renderFields();
}

// Save form
async function saveForm() {
  try {
    // Validate
    const name = document.getElementById('formName').value.trim();
    if (!name) {
      alert('Please enter a form name');
      return;
    }

    if (fields.length === 0) {
      alert('Please add at least one field to the form');
      return;
    }

    // Validate all fields have labels
    for (let i = 0; i < fields.length; i++) {
      if (!fields[i].label || fields[i].label.trim() === '') {
        alert(`Field ${i + 1} is missing a label`);
        return;
      }
    }

    // Prepare data
    const formData = {
      name: name,
      description: document.getElementById('formDescription').value.trim(),
      category: document.getElementById('formCategory').value,
      status: document.getElementById('formStatus').value,
      fields: fields,
      settings: {
        allowMultipleSubmissions: document.getElementById('allowMultiple').value === 'true',
        showProgressBar: document.getElementById('showProgress').value === 'true',
        requireLogin: document.getElementById('requireLogin').value === 'true',
        sendConfirmationEmail: document.getElementById('sendConfirmation').value === 'true'
      }
    };

    const token = localStorage.getItem('auth_token');
    const url = formId ? `/api/forms/templates/${formId}` : '/api/forms/templates';
    const method = formId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error('Failed to save form');
    }

    alert(formId ? 'Form updated successfully!' : 'Form created successfully!');
    window.location.href = '/forms';
  } catch (error) {
    console.error('Error saving form:', error);
    alert('Failed to save form. Please try again.');
  }
}

// Cancel form creation/editing
function cancelForm() {
  if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
    window.location.href = '/forms';
  }
}

// Load parsed PDF data from sessionStorage
function loadParsedPdfData() {
  try {
    const parsedDataStr = sessionStorage.getItem('parsedFormData');
    if (!parsedDataStr) {
      console.warn('No parsed PDF data found in sessionStorage');
      return;
    }

    const parsedData = JSON.parse(parsedDataStr);
    const form = parsedData.form;

    if (!form) {
      console.error('Invalid parsed form data');
      return;
    }

    // Populate form settings
    document.getElementById('formName').value = form.name || '';
    document.getElementById('formDescription').value = form.description || '';
    document.getElementById('formCategory').value = form.category || '';

    // Load fields from parsed PDF
    fields = form.fields || [];

    // Ensure all fields have proper structure
    fields = fields.map((field, index) => {
      // Generate ID if not present
      if (!field.id) {
        field.id = `field_${Date.now()}_${index}`;
      }

      // Ensure options have correct format for radio/checkbox
      if ((field.type === 'radio' || field.type === 'checkbox') && field.options) {
        field.options = field.options.map((opt, optIndex) => {
          if (typeof opt === 'string') {
            return {
              value: opt.toLowerCase().replace(/\s+/g, '-'),
              label: opt
            };
          }
          return opt;
        });
      }

      // Set defaults for range fields
      if (field.type === 'range') {
        field.min = field.min || 1;
        field.max = field.max || 10;
        field.step = field.step || 1;
      }

      return field;
    });

    renderFields();

    // Clear sessionStorage
    sessionStorage.removeItem('parsedFormData');

    // Update page title
    document.getElementById('pageTitle').textContent = 'Create Form from PDF';
    document.getElementById('breadcrumbTitle').textContent = 'PDF Parsed Successfully ✓';

    // Show success message
    const successMessage = document.createElement('div');
    successMessage.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #D1FAE5;
      color: #059669;
      padding: 16px 24px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
      z-index: 1000;
      font-weight: 600;
      animation: slideIn 0.3s ease;
    `;
    successMessage.textContent = `✓ PDF parsed successfully! ${fields.length} fields extracted.`;
    document.body.appendChild(successMessage);

    setTimeout(() => {
      successMessage.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => successMessage.remove(), 300);
    }, 4000);

  } catch (error) {
    console.error('Error loading parsed PDF data:', error);
    alert('Failed to load parsed PDF data. Please try again.');
  }
}

// Utility function
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// TAB NAVIGATION FUNCTIONS
// ========================================

// Switch to Questions tab
function switchToQuestions() {
  setActiveTab('questions');
  document.getElementById('questionsView').style.display = 'grid';
  document.getElementById('settingsView').style.display = 'none';
}

// Switch to Form Settings view
function switchToSettings() {
  setActiveTab('settings');
  document.getElementById('questionsView').style.display = 'none';
  document.getElementById('settingsView').style.display = 'block';
  // Update sharing URL
  if (formId) {
    showSharingSection(formId);
  }
}

// Navigate to Responses page
function navigateToResponses() {
  if (formId) {
    window.location.href = `/forms/${formId}/responses`;
  }
}

// Toggle publish status
async function togglePublish() {
  if (!formId) return;

  const currentStatus = document.getElementById('formStatus').value;
  const newStatus = currentStatus === 'published' ? 'draft' : 'published';

  try {
    // First save the form with new status
    document.getElementById('formStatus').value = newStatus;
    await saveForm();

    // Update button state
    updatePublishButton(newStatus);

    // Update unpublish toggle in settings
    const unpublishToggle = document.getElementById('unpublishForm');
    if (unpublishToggle) {
      unpublishToggle.checked = newStatus !== 'published';
    }
  } catch (error) {
    console.error('Error toggling publish:', error);
    // Revert status on error
    document.getElementById('formStatus').value = currentStatus;
  }
}

// Handle unpublish toggle from settings
function handleUnpublish() {
  const unpublishToggle = document.getElementById('unpublishForm');
  if (unpublishToggle.checked) {
    // Unpublish the form
    document.getElementById('formStatus').value = 'draft';
    updatePublishButton('draft');
    saveForm();
  } else {
    // Publish the form
    document.getElementById('formStatus').value = 'published';
    updatePublishButton('published');
    saveForm();
  }
}

// Delete form
async function deleteForm() {
  if (!formId) return;

  if (!confirm('Are you sure you want to permanently delete this form? This action cannot be undone and all response data will be lost.')) {
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/forms/templates/${formId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete form');
    }

    alert('Form deleted successfully');
    window.location.href = '/forms';
  } catch (error) {
    console.error('Error deleting form:', error);
    alert('Failed to delete form. Please try again.');
  }
}

// Set active tab styling
function setActiveTab(tab) {
  const tabs = document.querySelectorAll('.form-tabs .form-tab');
  tabs.forEach((t, index) => {
    t.classList.remove('active');
    if ((tab === 'questions' && index === 0) || (tab === 'settings' && index === 1)) {
      t.classList.add('active');
    }
  });
}
