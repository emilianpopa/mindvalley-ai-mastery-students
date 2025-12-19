/**
 * Form Fill Page - Client-Facing Form Submission
 */

const API_BASE = window.location.origin;
let formTemplate = null;
let responses = {};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Get form ID from URL
  const pathParts = window.location.pathname.split('/');
  const formId = pathParts[2]; // /forms/:id/fill

  if (!formId) {
    showError();
    return;
  }

  loadForm(formId);
});

// Load form template
async function loadForm(formId) {
  try {
    const response = await fetch(`${API_BASE}/api/forms/templates/${formId}`);

    if (!response.ok) {
      throw new Error('Form not found');
    }

    formTemplate = await response.json();

    // Check if form is published
    if (formTemplate.status !== 'published') {
      showError('This form is not currently available for submissions.');
      return;
    }

    renderForm();
    hideLoading();

  } catch (error) {
    console.error('Error loading form:', error);
    showError();
  }
}

// Render form
function renderForm() {
  // Set header info
  document.getElementById('formTitle').textContent = formTemplate.name;
  document.getElementById('formDescription').textContent = formTemplate.description || '';

  // Show progress bar if enabled
  const settings = formTemplate.settings || {};
  if (settings.showProgressBar !== false) {
    document.getElementById('progressBar').style.display = 'block';
  }

  // Show client login section if required
  if (settings.requireLogin === false) {
    document.getElementById('clientLoginSection').style.display = 'none';
  } else {
    document.getElementById('clientLoginSection').style.display = 'block';
  }

  // Render fields
  const fieldsContainer = document.getElementById('formFields');
  fieldsContainer.innerHTML = formTemplate.fields.map((field, index) => renderField(field, index)).join('');

  // Add event listeners for progress tracking
  addProgressListeners();

  // Submit handler
  document.getElementById('formSubmit').addEventListener('submit', handleSubmit);
}

// Render individual field
function renderField(field, index) {
  const required = field.required ? '<span class="field-required">*</span>' : '';
  const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '';

  let fieldHTML = '';

  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
      fieldHTML = `
        <div class="form-field" data-field-id="${field.id}">
          <label class="field-label">
            ${escapeHtml(field.label)} ${required}
          </label>
          <input
            type="${field.type}"
            class="field-input"
            id="${field.id}"
            ${placeholder}
            ${field.required ? 'required' : ''}
          >
          <div class="field-error" id="error-${field.id}"></div>
        </div>
      `;
      break;

    case 'date':
      fieldHTML = `
        <div class="form-field" data-field-id="${field.id}">
          <label class="field-label">
            ${escapeHtml(field.label)} ${required}
          </label>
          <input
            type="date"
            class="field-input"
            id="${field.id}"
            ${field.required ? 'required' : ''}
          >
          <div class="field-error" id="error-${field.id}"></div>
        </div>
      `;
      break;

    case 'textarea':
      fieldHTML = `
        <div class="form-field" data-field-id="${field.id}">
          <label class="field-label">
            ${escapeHtml(field.label)} ${required}
          </label>
          <textarea
            class="field-input"
            id="${field.id}"
            ${placeholder}
            ${field.required ? 'required' : ''}
          ></textarea>
          <div class="field-error" id="error-${field.id}"></div>
        </div>
      `;
      break;

    case 'radio':
      const radioOptions = (field.options || []).map(option => `
        <div class="option-item">
          <input
            type="radio"
            name="${field.id}"
            id="${field.id}-${option.value}"
            value="${escapeHtml(option.value)}"
            ${field.required ? 'required' : ''}
          >
          <label class="option-label" for="${field.id}-${option.value}">
            ${escapeHtml(option.label)}
          </label>
        </div>
      `).join('');

      fieldHTML = `
        <div class="form-field" data-field-id="${field.id}">
          <label class="field-label">
            ${escapeHtml(field.label)} ${required}
          </label>
          <div class="field-options">
            ${radioOptions}
          </div>
          <div class="field-error" id="error-${field.id}"></div>
        </div>
      `;
      break;

    case 'checkbox':
      const checkboxOptions = (field.options || []).map(option => `
        <div class="option-item">
          <input
            type="checkbox"
            name="${field.id}[]"
            id="${field.id}-${option.value}"
            value="${escapeHtml(option.value)}"
          >
          <label class="option-label" for="${field.id}-${option.value}">
            ${escapeHtml(option.label)}
          </label>
        </div>
      `).join('');

      fieldHTML = `
        <div class="form-field" data-field-id="${field.id}">
          <label class="field-label">
            ${escapeHtml(field.label)} ${required}
          </label>
          <div class="field-options">
            ${checkboxOptions}
          </div>
          <div class="field-error" id="error-${field.id}"></div>
        </div>
      `;
      break;

    case 'range':
      const min = field.min || 1;
      const max = field.max || 10;
      const step = field.step || 1;
      const defaultValue = Math.floor((min + max) / 2);

      fieldHTML = `
        <div class="form-field" data-field-id="${field.id}">
          <label class="field-label">
            ${escapeHtml(field.label)} ${required}
          </label>
          <div class="range-container">
            <div class="range-value" id="value-${field.id}">${defaultValue}</div>
            <input
              type="range"
              class="field-input range-input"
              id="${field.id}"
              min="${min}"
              max="${max}"
              step="${step}"
              value="${defaultValue}"
              oninput="document.getElementById('value-${field.id}').textContent = this.value"
            >
            <div class="range-labels">
              <span>${min}</span>
              <span>${max}</span>
            </div>
          </div>
          <div class="field-error" id="error-${field.id}"></div>
        </div>
      `;
      break;
  }

  return fieldHTML;
}

// Add progress listeners
function addProgressListeners() {
  const fields = formTemplate.fields;
  const inputs = document.querySelectorAll('.field-input, input[type="radio"], input[type="checkbox"]');

  inputs.forEach(input => {
    input.addEventListener('change', updateProgress);
    input.addEventListener('input', updateProgress);
  });

  // Initial progress
  updateProgress();
}

// Update progress bar
function updateProgress() {
  const settings = formTemplate.settings || {};
  if (settings.showProgressBar === false) return;

  const fields = formTemplate.fields;
  let completedFields = 0;

  fields.forEach(field => {
    const fieldEl = document.querySelector(`[data-field-id="${field.id}"]`);
    if (!fieldEl) return;

    let isCompleted = false;

    if (field.type === 'radio') {
      const radioInputs = fieldEl.querySelectorAll('input[type="radio"]');
      isCompleted = Array.from(radioInputs).some(input => input.checked);
    } else if (field.type === 'checkbox') {
      const checkboxInputs = fieldEl.querySelectorAll('input[type="checkbox"]');
      isCompleted = Array.from(checkboxInputs).some(input => input.checked);
    } else if (field.type === 'range') {
      // Range is always "completed" since it has a default value
      isCompleted = true;
    } else {
      const input = document.getElementById(field.id);
      isCompleted = input && input.value.trim() !== '';
    }

    if (isCompleted) completedFields++;
  });

  const progress = Math.round((completedFields / fields.length) * 100);

  document.getElementById('progressFill').style.width = `${progress}%`;
  document.getElementById('progressText').textContent = `${progress}% Complete`;
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();

  // Clear previous errors
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.field-input').forEach(el => el.classList.remove('error'));

  // Collect responses
  responses = {};
  let hasErrors = false;

  formTemplate.fields.forEach(field => {
    if (field.type === 'radio') {
      const selectedRadio = document.querySelector(`input[name="${field.id}"]:checked`);
      if (field.required && !selectedRadio) {
        showFieldError(field.id, 'This field is required');
        hasErrors = true;
      } else if (selectedRadio) {
        responses[field.id] = selectedRadio.value;
      }
    } else if (field.type === 'checkbox') {
      const checkedBoxes = document.querySelectorAll(`input[name="${field.id}[]"]:checked`);
      const values = Array.from(checkedBoxes).map(cb => cb.value);
      if (field.required && values.length === 0) {
        showFieldError(field.id, 'Please select at least one option');
        hasErrors = true;
      } else if (values.length > 0) {
        responses[field.id] = values;
      }
    } else {
      const input = document.getElementById(field.id);
      const value = input.value.trim();

      if (field.required && !value) {
        showFieldError(field.id, 'This field is required');
        input.classList.add('error');
        hasErrors = true;
      } else if (value) {
        // Email validation
        if (field.type === 'email' && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            showFieldError(field.id, 'Please enter a valid email address');
            input.classList.add('error');
            hasErrors = true;
          } else {
            responses[field.id] = value;
          }
        } else {
          responses[field.id] = value;
        }
      }
    }
  });

  if (hasErrors) {
    // Scroll to first error
    const firstError = document.querySelector('.field-input.error, .field-error:not(:empty)');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  // Get client info (optional)
  let clientId = null;
  const settings = formTemplate.settings || {};

  if (settings.requireLogin !== false) {
    const clientIdInput = document.getElementById('clientId').value.trim();
    if (clientIdInput) {
      clientId = parseInt(clientIdInput);
    }
  }

  // Submit to API
  await submitForm(clientId);
}

// Submit form to API
async function submitForm(clientId) {
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const response = await fetch(`${API_BASE}/api/forms/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        form_id: formTemplate.id,
        client_id: clientId,
        responses: responses
      })
    });

    if (!response.ok) {
      throw new Error('Submission failed');
    }

    const data = await response.json();

    // Show success message
    showSuccess();

  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Failed to submit form. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Form';
  }
}

// Show field error
function showFieldError(fieldId, message) {
  const errorEl = document.getElementById(`error-${fieldId}`);
  if (errorEl) {
    errorEl.textContent = message;
  }
}

// Show success state
function showSuccess() {
  document.getElementById('formContent').style.display = 'none';
  document.getElementById('successState').style.display = 'block';

  // Custom success message
  const settings = formTemplate.settings || {};
  if (settings.sendConfirmationEmail) {
    document.getElementById('successMessage').textContent =
      'Thank you for completing this form. Your responses have been recorded and a confirmation email has been sent.';
  }
}

// Show error state
function showError(message) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display = 'block';

  if (message) {
    document.querySelector('.error-state p').textContent = message;
  }
}

// Hide loading
function hideLoading() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('formContent').style.display = 'block';
}

// Utility function
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
