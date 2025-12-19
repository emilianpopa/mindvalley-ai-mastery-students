/**
 * Public Form Page - OTP Verification and Multi-Section Form
 */

const API_BASE = window.location.origin;

// State
let formId = null;
let formData = null;
let userEmail = null;
let userName = null;
let sessionToken = null;
let currentSection = 0;
let sections = [];
let responses = {};
let linkToken = null;
let linkClientId = null;

// Check if in preview mode
let isPreviewMode = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('[form-public] Initializing...');
  console.log('[form-public] URL:', window.location.href);

  // Get form ID from URL
  const pathParts = window.location.pathname.split('/');
  formId = pathParts[2]; // /f/:id
  console.log('[form-public] Form ID:', formId);

  if (!formId) {
    showError('Invalid form URL');
    return;
  }

  // Check for preview mode (admin preview, skips OTP)
  const urlParams = new URLSearchParams(window.location.search);
  isPreviewMode = urlParams.get('preview') === 'true';
  console.log('[form-public] Preview mode:', isPreviewMode);

  loadFormInfo();
  setupOTPInputs();
  setupFormHandlers();
});

// Load form info (just the title to show before OTP)
async function loadFormInfo() {
  try {
    // Check for personalized link token
    const urlParams = new URLSearchParams(window.location.search);
    linkToken = urlParams.get('token');

    // If we have a link token, validate it first
    if (linkToken) {
      console.log('[form-public] Validating link token:', linkToken);
      await validateLinkToken(linkToken);
    }

    // Add preview param if in preview mode
    const url = isPreviewMode
      ? `${API_BASE}/api/forms/public/${formId}?preview=true`
      : `${API_BASE}/api/forms/public/${formId}`;
    console.log('[form-public] Loading form:', url, 'Preview mode:', isPreviewMode);
    const response = await fetch(url);
    console.log('[form-public] Response status:', response.status);

    if (!response.ok) {
      throw new Error('Form not found');
    }

    formData = await response.json();

    // Update title in email step
    document.getElementById('formTitleEmail').textContent = formData.name;

    // Hide loading
    document.getElementById('loadingState').style.display = 'none';

    // If preview mode, skip directly to form
    if (isPreviewMode) {
      userEmail = 'preview@example.com';
      userName = 'Preview User';
      sessionToken = 'preview-mode';
      // Show form step directly (same as after OTP verification)
      document.getElementById('formStep').style.display = 'block';
      initializeForm();
      // Add preview banner
      addPreviewBanner();
    } else {
      // Show email step for OTP verification
      document.getElementById('emailStep').style.display = 'block';
    }

  } catch (error) {
    console.error('Error loading form:', error);
    showError('This form is not available or has been removed.');
  }
}

// Validate personalized link token
async function validateLinkToken(token) {
  try {
    const response = await fetch(`${API_BASE}/api/forms/links/validate/${token}`);

    if (!response.ok) {
      const data = await response.json();
      // Link is invalid or expired, continue with generic flow
      console.log('[form-public] Link token invalid:', data.error);
      linkToken = null;
      return;
    }

    const data = await response.json();
    console.log('[form-public] Link validated:', data);

    // If this is a personalized link with client info, pre-fill the form
    if (data.link_type === 'personalized' && data.client) {
      linkClientId = data.client_id;
      const clientName = `${data.client.first_name} ${data.client.last_name}`.trim();
      const clientEmail = data.client.email;

      // Pre-fill the name and email fields
      document.getElementById('userName').value = clientName;
      document.getElementById('userEmail').value = clientEmail;

      // Show the prefilled info banner
      document.getElementById('prefilledInfo').style.display = 'block';
      document.getElementById('prefilledName').textContent = clientName;
      document.getElementById('prefilledEmail').textContent = clientEmail;

      // Store the values
      userName = clientName;
      userEmail = clientEmail;
    }

  } catch (error) {
    console.error('[form-public] Error validating link token:', error);
    linkToken = null;
  }
}

// Add preview banner at the top
function addPreviewBanner() {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    padding: 12px 20px;
    text-align: center;
    font-weight: 600;
    font-size: 14px;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  banner.innerHTML = '👁️ PREVIEW MODE - Form submissions will not be saved';
  document.body.insertBefore(banner, document.body.firstChild);

  // Add padding to body to account for banner
  document.body.style.paddingTop = '50px';
}

// Setup OTP input handlers
function setupOTPInputs() {
  const otpInputs = document.querySelectorAll('.otp-input');

  otpInputs.forEach((input, index) => {
    // Handle input
    input.addEventListener('input', (e) => {
      const value = e.target.value;

      // Only allow numbers
      if (!/^\d*$/.test(value)) {
        e.target.value = '';
        return;
      }

      // Add filled class
      if (value) {
        e.target.classList.add('filled');
      } else {
        e.target.classList.remove('filled');
      }

      // Auto-focus next input
      if (value && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }

      // Auto-submit when all filled
      if (value && index === otpInputs.length - 1) {
        const otp = Array.from(otpInputs).map(inp => inp.value).join('');
        if (otp.length === 6) {
          document.getElementById('otpForm').dispatchEvent(new Event('submit'));
        }
      }
    });

    // Handle backspace
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        otpInputs[index - 1].focus();
      }
    });

    // Handle paste
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

      pastedData.split('').forEach((char, i) => {
        if (otpInputs[i]) {
          otpInputs[i].value = char;
          otpInputs[i].classList.add('filled');
        }
      });

      // Focus last filled or next empty
      const lastIndex = Math.min(pastedData.length, otpInputs.length - 1);
      otpInputs[lastIndex].focus();

      // Auto-submit if complete
      if (pastedData.length === 6) {
        setTimeout(() => {
          document.getElementById('otpForm').dispatchEvent(new Event('submit'));
        }, 100);
      }
    });
  });
}

// Setup form handlers
function setupFormHandlers() {
  // Email form
  document.getElementById('emailForm').addEventListener('submit', handleEmailSubmit);

  // OTP form
  document.getElementById('otpForm').addEventListener('submit', handleOTPSubmit);

  // Resend OTP
  document.getElementById('resendBtn').addEventListener('click', handleResendOTP);

  // Main form
  document.getElementById('mainForm').addEventListener('submit', handleFormSubmit);
}

// Handle email submission - send OTP
async function handleEmailSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('userName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const errorEl = document.getElementById('emailError');
  const btn = document.getElementById('sendOtpBtn');
  const btnText = document.getElementById('sendOtpText');
  const spinner = document.getElementById('sendOtpSpinner');

  // Validate name
  if (!name || name.length < 2) {
    errorEl.textContent = 'Please enter your full name';
    return;
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorEl.textContent = 'Please enter a valid email address';
    return;
  }

  errorEl.textContent = '';
  btn.disabled = true;
  btnText.textContent = 'Sending...';
  spinner.style.display = 'inline-block';

  try {
    const response = await fetch(`${API_BASE}/api/forms/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, form_id: formId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send OTP');
    }

    userEmail = email;
    userName = name;

    // Show OTP step
    document.getElementById('emailStep').style.display = 'none';
    document.getElementById('otpStep').style.display = 'block';
    document.getElementById('displayEmail').textContent = email;

    // Focus first OTP input
    document.querySelector('.otp-input').focus();

    // Show demo OTP if available (development only)
    if (data.demo_otp) {
      document.getElementById('demoOtpDisplay').style.display = 'block';
      document.getElementById('demoOtpCode').textContent = data.demo_otp;
    }

  } catch (error) {
    console.error('Error sending OTP:', error);
    errorEl.textContent = error.message;
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Send Verification Code';
    spinner.style.display = 'none';
  }
}

// Handle OTP verification
async function handleOTPSubmit(e) {
  e.preventDefault();

  const otpInputs = document.querySelectorAll('.otp-input');
  const otp = Array.from(otpInputs).map(inp => inp.value).join('');
  const errorEl = document.getElementById('otpError');
  const btn = document.getElementById('verifyOtpBtn');
  const btnText = document.getElementById('verifyOtpText');
  const spinner = document.getElementById('verifyOtpSpinner');

  if (otp.length !== 6) {
    errorEl.textContent = 'Please enter the complete 6-digit code';
    return;
  }

  errorEl.textContent = '';
  btn.disabled = true;
  btnText.textContent = 'Verifying...';
  spinner.style.display = 'inline-block';

  try {
    const response = await fetch(`${API_BASE}/api/forms/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, form_id: formId, otp })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Invalid OTP');
    }

    sessionToken = data.session_token;

    // Show form
    document.getElementById('otpStep').style.display = 'none';
    document.getElementById('formStep').style.display = 'block';

    // Initialize form
    initializeForm();

  } catch (error) {
    console.error('Error verifying OTP:', error);
    errorEl.textContent = error.message;

    // Clear OTP inputs on error
    otpInputs.forEach(inp => {
      inp.value = '';
      inp.classList.remove('filled');
      inp.classList.add('error');
    });
    otpInputs[0].focus();

    setTimeout(() => {
      otpInputs.forEach(inp => inp.classList.remove('error'));
    }, 2000);
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Verify Code';
    spinner.style.display = 'none';
  }
}

// Handle resend OTP
async function handleResendOTP() {
  const btn = document.getElementById('resendBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const response = await fetch(`${API_BASE}/api/forms/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, form_id: formId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to resend OTP');
    }

    // Clear OTP inputs
    document.querySelectorAll('.otp-input').forEach(inp => {
      inp.value = '';
      inp.classList.remove('filled');
    });
    document.querySelector('.otp-input').focus();

    // Update demo OTP if available
    if (data.demo_otp) {
      document.getElementById('demoOtpCode').textContent = data.demo_otp;
    }

    btn.textContent = 'Code Sent!';
    setTimeout(() => {
      btn.textContent = 'Resend Code';
      btn.disabled = false;
    }, 3000);

  } catch (error) {
    console.error('Error resending OTP:', error);
    document.getElementById('otpError').textContent = error.message;
    btn.textContent = 'Resend Code';
    btn.disabled = false;
  }
}

// Go back to email step
function goBackToEmail() {
  document.getElementById('otpStep').style.display = 'none';
  document.getElementById('emailStep').style.display = 'block';
  document.getElementById('userEmail').focus();
}

// Initialize form after OTP verification
function initializeForm() {
  // Set form title and description
  document.getElementById('formTitle').textContent = formData.name;
  document.getElementById('formDescription').textContent = formData.description || '';

  // Show/hide progress bar
  const settings = formData.settings || {};
  if (settings.showProgressBar === false) {
    document.getElementById('progressContainer').style.display = 'none';
  }

  // Organize fields into sections
  sections = organizeFieldsIntoSections(formData.fields);

  // Render sections
  renderSections();

  // Show first section
  showSection(0);
}

// Organize fields into logical sections based on section breaks
function organizeFieldsIntoSections(fields) {
  const result = [];
  let currentSection = {
    name: 'Getting Started',
    description: '',
    fields: []
  };

  fields.forEach(field => {
    if (field.type === 'section') {
      // If current section has fields, save it
      if (currentSection.fields.length > 0) {
        result.push(currentSection);
      }
      // Start new section
      currentSection = {
        name: field.label || 'Section',
        description: field.description || '',
        fields: []
      };
    } else {
      // Add field to current section
      currentSection.fields.push(field);
    }
  });

  // Don't forget the last section
  if (currentSection.fields.length > 0) {
    result.push(currentSection);
  }

  // If no fields at all, return empty
  if (result.length === 0) {
    return [{
      name: 'Please complete the form',
      description: '',
      fields: fields.filter(f => f.type !== 'section')
    }];
  }

  return result;
}

// Render all sections
function renderSections() {
  const container = document.getElementById('formSections');

  container.innerHTML = sections.map((section, index) => `
    <div class="form-section" id="section-${index}" data-section="${index}">
      <div class="section-header">
        <h2 class="section-title">${escapeHtml(section.name)}</h2>
        ${section.description ? `<p class="section-description">${escapeHtml(section.description)}</p>` : ''}
      </div>
      <div class="section-fields">
        ${section.fields.map(field => renderField(field)).join('')}
      </div>
    </div>
  `).join('');

  // Add change listeners for progress tracking AND conditional logic
  container.querySelectorAll('input, textarea, select').forEach(input => {
    input.addEventListener('change', () => {
      updateProgress();
      evaluateAllConditions();
    });
    input.addEventListener('input', () => {
      updateProgress();
      evaluateAllConditions();
    });
  });

  // Initial evaluation of conditions
  evaluateAllConditions();
}

// Evaluate all conditional fields
function evaluateAllConditions() {
  const allFields = formData.fields || [];

  allFields.forEach(field => {
    if (field.condition && field.condition.field) {
      const shouldShow = evaluateCondition(field.condition);
      const container = document.querySelector(`[data-field-id="${field.id}"]`);

      if (container) {
        if (shouldShow) {
          container.style.display = 'block';
          container.classList.remove('condition-hidden');
        } else {
          container.style.display = 'none';
          container.classList.add('condition-hidden');
          // Clear the value if hidden
          const input = container.querySelector('input, textarea, select');
          if (input) {
            if (input.type === 'radio' || input.type === 'checkbox') {
              container.querySelectorAll('input').forEach(i => i.checked = false);
              container.querySelectorAll('.option-item').forEach(o => o.classList.remove('selected'));
            } else {
              input.value = '';
            }
          }
        }
      }
    }
  });
}

// Evaluate a single condition
function evaluateCondition(condition) {
  if (!condition || !condition.field) return true;

  const { field: targetFieldId, operator, value } = condition;

  // Get the current value of the target field
  let currentValue = getFieldValue(targetFieldId);

  switch (operator) {
    case 'equals':
      return currentValue === value;
    case 'not_equals':
      return currentValue !== value;
    case 'contains':
      return currentValue && currentValue.toLowerCase().includes(value.toLowerCase());
    case 'not_empty':
      return currentValue && currentValue.toString().trim() !== '';
    default:
      return true;
  }
}

// Get the current value of a field
function getFieldValue(fieldId) {
  // Check for radio button
  const radioChecked = document.querySelector(`input[name="${fieldId}"]:checked`);
  if (radioChecked) return radioChecked.value;

  // Check for checkbox (return first checked or array)
  const checkboxes = document.querySelectorAll(`input[name="${fieldId}[]"]:checked`);
  if (checkboxes.length > 0) {
    return Array.from(checkboxes).map(c => c.value).join(', ');
  }

  // Regular input
  const input = document.getElementById(fieldId);
  return input ? input.value : '';
}

// Render individual field
function renderField(field) {
  const required = field.required ? '<span class="field-required">*</span>' : '';
  const placeholder = field.placeholder || '';

  let fieldHTML = '';

  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
      fieldHTML = `
        <div class="field-container" data-field-id="${field.id}">
          <label class="field-label">${escapeHtml(field.label)} ${required}</label>
          <input
            type="${field.type}"
            class="field-input"
            id="${field.id}"
            name="${field.id}"
            placeholder="${escapeHtml(placeholder)}"
            ${field.required ? 'required' : ''}
          >
          <div class="field-error" id="error-${field.id}"></div>
        </div>
      `;
      break;

    case 'date':
      fieldHTML = `
        <div class="field-container" data-field-id="${field.id}">
          <label class="field-label">${escapeHtml(field.label)} ${required}</label>
          <input
            type="date"
            class="field-input"
            id="${field.id}"
            name="${field.id}"
            ${field.required ? 'required' : ''}
          >
          <div class="field-error" id="error-${field.id}"></div>
        </div>
      `;
      break;

    case 'textarea':
      fieldHTML = `
        <div class="field-container" data-field-id="${field.id}">
          <label class="field-label">${escapeHtml(field.label)} ${required}</label>
          <textarea
            class="field-input"
            id="${field.id}"
            name="${field.id}"
            placeholder="${escapeHtml(placeholder)}"
            rows="4"
            ${field.required ? 'required' : ''}
          ></textarea>
          <div class="field-error" id="error-${field.id}"></div>
        </div>
      `;
      break;

    case 'radio':
      const radioOptions = (field.options || []).map(opt => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        return `
          <div class="option-item" onclick="selectOption(this, '${field.id}')">
            <input
              type="radio"
              name="${field.id}"
              id="${field.id}-${optValue}"
              value="${escapeHtml(optValue)}"
              ${field.required ? 'required' : ''}
            >
            <label class="option-label" for="${field.id}-${optValue}">${escapeHtml(optLabel)}</label>
          </div>
        `;
      }).join('');

      fieldHTML = `
        <div class="field-container" data-field-id="${field.id}">
          <label class="field-label">${escapeHtml(field.label)} ${required}</label>
          <div class="field-options">${radioOptions}</div>
          <div class="field-error" id="error-${field.id}"></div>
        </div>
      `;
      break;

    case 'checkbox':
      const checkboxOptions = (field.options || []).map(opt => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        return `
          <div class="option-item" onclick="toggleCheckbox(this, '${field.id}')">
            <input
              type="checkbox"
              name="${field.id}[]"
              id="${field.id}-${optValue}"
              value="${escapeHtml(optValue)}"
            >
            <label class="option-label" for="${field.id}-${optValue}">${escapeHtml(optLabel)}</label>
          </div>
        `;
      }).join('');

      fieldHTML = `
        <div class="field-container" data-field-id="${field.id}">
          <label class="field-label">${escapeHtml(field.label)} ${required}</label>
          <div class="field-options">${checkboxOptions}</div>
          <div class="field-error" id="error-${field.id}"></div>
        </div>
      `;
      break;

    case 'range':
      const min = field.min || 1;
      const max = field.max || 10;
      const defaultVal = Math.floor((min + max) / 2);

      fieldHTML = `
        <div class="field-container" data-field-id="${field.id}">
          <label class="field-label">${escapeHtml(field.label)} ${required}</label>
          <div class="range-container">
            <div class="range-value" id="value-${field.id}">${defaultVal}</div>
            <input
              type="range"
              class="range-input"
              id="${field.id}"
              name="${field.id}"
              min="${min}"
              max="${max}"
              value="${defaultVal}"
              oninput="document.getElementById('value-${field.id}').textContent = this.value; updateProgress();"
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

    case 'ai_personalized':
      // AI Personalized questions - will be generated dynamically
      fieldHTML = `
        <div class="field-container ai-personalized-container" data-field-id="${field.id}" data-ai-prompt="${escapeHtml(field.aiPrompt || '')}" data-question-count="${field.questionCount || 3}">
          <div class="ai-personalized-header">
            <div class="ai-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A855F7" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div class="ai-personalized-title">
              <h3>Personalized Questions</h3>
              <p>Based on your previous answers, we have some additional questions for you.</p>
            </div>
          </div>
          <div id="ai-questions-${field.id}" class="ai-questions-container">
            <div class="ai-loading">
              <div class="ai-loading-spinner"></div>
              <p>Generating personalized questions...</p>
            </div>
          </div>
        </div>
      `;
      break;
  }

  return fieldHTML;
}

// Select radio option
function selectOption(element, fieldId) {
  const container = element.closest('.field-options');
  container.querySelectorAll('.option-item').forEach(opt => opt.classList.remove('selected'));
  element.classList.add('selected');
  element.querySelector('input').checked = true;
  updateProgress();
}

// Toggle checkbox
function toggleCheckbox(element, fieldId) {
  element.classList.toggle('selected');
  const checkbox = element.querySelector('input');
  checkbox.checked = !checkbox.checked;
  updateProgress();
}

// Show specific section
function showSection(index) {
  // Hide all sections
  document.querySelectorAll('.form-section').forEach(sec => sec.classList.remove('active'));

  // Show target section
  const section = document.getElementById(`section-${index}`);
  if (section) {
    section.classList.add('active');
    currentSection = index;

    // Update navigation buttons
    updateNavigation();

    // Check if this section has AI personalized fields
    const sectionData = sections[index];
    if (sectionData && sectionData.fields.some(f => f.type === 'ai_personalized')) {
      generateAIQuestions(index);
    }

    // Re-evaluate conditions for this section
    evaluateAllConditions();

    // Scroll to top of form
    document.getElementById('formStep').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Update navigation buttons
function updateNavigation() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');

  // Show/hide prev button
  prevBtn.style.display = currentSection > 0 ? 'block' : 'none';

  // Show next or submit
  if (currentSection < sections.length - 1) {
    nextBtn.style.display = 'block';
    submitBtn.style.display = 'none';
  } else {
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'block';
  }
}

// Previous section
function prevSection() {
  if (currentSection > 0) {
    showSection(currentSection - 1);
  }
}

// Next section
function nextSection() {
  // Validate current section
  if (!validateSection(currentSection)) {
    return;
  }

  // Collect responses from current section
  collectSectionResponses(currentSection);

  if (currentSection < sections.length - 1) {
    showSection(currentSection + 1);
  }
}

// Validate current section
function validateSection(sectionIndex) {
  const section = sections[sectionIndex];
  let isValid = true;

  section.fields.forEach(field => {
    const errorEl = document.getElementById(`error-${field.id}`);
    if (errorEl) errorEl.textContent = '';

    if (field.required) {
      let value = null;

      if (field.type === 'radio') {
        const checked = document.querySelector(`input[name="${field.id}"]:checked`);
        value = checked ? checked.value : null;
      } else if (field.type === 'checkbox') {
        const checked = document.querySelectorAll(`input[name="${field.id}[]"]:checked`);
        value = checked.length > 0 ? Array.from(checked).map(c => c.value) : null;
      } else {
        const input = document.getElementById(field.id);
        value = input ? input.value.trim() : null;
      }

      if (!value || (Array.isArray(value) && value.length === 0)) {
        if (errorEl) errorEl.textContent = 'This field is required';
        isValid = false;
      }

      // Email validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          if (errorEl) errorEl.textContent = 'Please enter a valid email';
          isValid = false;
        }
      }
    }
  });

  if (!isValid) {
    // Scroll to first error
    const firstError = document.querySelector('.field-error:not(:empty)');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return isValid;
}

// Collect responses from section
function collectSectionResponses(sectionIndex) {
  const section = sections[sectionIndex];

  section.fields.forEach(field => {
    if (field.type === 'radio') {
      const checked = document.querySelector(`input[name="${field.id}"]:checked`);
      if (checked) responses[field.id] = checked.value;
    } else if (field.type === 'checkbox') {
      const checked = document.querySelectorAll(`input[name="${field.id}[]"]:checked`);
      if (checked.length > 0) {
        responses[field.id] = Array.from(checked).map(c => c.value);
      }
    } else {
      const input = document.getElementById(field.id);
      if (input && input.value.trim()) {
        responses[field.id] = input.value.trim();
      }
    }
  });
}

// Update progress bar
function updateProgress() {
  const settings = formData.settings || {};
  if (settings.showProgressBar === false) return;

  const allFields = formData.fields;
  let completedFields = 0;

  allFields.forEach(field => {
    let isCompleted = false;

    if (field.type === 'radio') {
      const checked = document.querySelector(`input[name="${field.id}"]:checked`);
      isCompleted = !!checked;
    } else if (field.type === 'checkbox') {
      const checked = document.querySelectorAll(`input[name="${field.id}[]"]:checked`);
      isCompleted = checked.length > 0;
    } else if (field.type === 'range') {
      isCompleted = true; // Always has a value
    } else {
      const input = document.getElementById(field.id);
      isCompleted = input && input.value.trim() !== '';
    }

    if (isCompleted) completedFields++;
  });

  const progress = Math.round((completedFields / allFields.length) * 100);
  document.getElementById('progressFill').style.width = `${progress}%`;
  document.getElementById('progressText').textContent = `${progress}% Complete`;
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();

  // Validate last section
  if (!validateSection(currentSection)) {
    return;
  }

  // Collect final section responses
  collectSectionResponses(currentSection);

  // In preview mode, just show success without actually submitting
  if (isPreviewMode) {
    document.getElementById('formStep').style.display = 'none';
    document.getElementById('successState').style.display = 'block';
    document.getElementById('confirmEmail').textContent = 'preview@example.com';
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    // Build submission payload
    const submissionPayload = {
      form_id: parseInt(formId),
      responses: responses,
      submitted_email: userEmail,
      submitted_name: userName,
      source: linkToken ? 'personalized_link' : 'direct'
    };

    // Add link token if present
    if (linkToken) {
      submissionPayload.link_token = linkToken;
    }

    // Add client_id if we got one from personalized link
    if (linkClientId) {
      submissionPayload.client_id = linkClientId;
    }

    const response = await fetch(`${API_BASE}/api/forms/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken
      },
      body: JSON.stringify(submissionPayload)
    });

    if (!response.ok) {
      throw new Error('Submission failed');
    }

    // Show success
    document.getElementById('formStep').style.display = 'none';
    document.getElementById('successState').style.display = 'block';
    document.getElementById('confirmEmail').textContent = userEmail;

  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Failed to submit form. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Form';
  }
}

// Show error state
function showError(message) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display = 'block';
  if (message) {
    document.getElementById('errorMessage').textContent = message;
  }
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Generate AI personalized questions when entering a section with AI fields
async function generateAIQuestions(sectionIndex) {
  const section = sections[sectionIndex];
  const aiFields = section.fields.filter(f => f.type === 'ai_personalized');

  for (const field of aiFields) {
    const container = document.getElementById(`ai-questions-${field.id}`);
    if (!container) continue;

    // Collect all responses so far for context
    const currentResponses = {};
    formData.fields.forEach(f => {
      const value = getFieldValue(f.id);
      if (value) {
        currentResponses[f.label || f.id] = value;
      }
    });

    try {
      // Call AI API to generate questions
      const response = await fetch(`${API_BASE}/api/forms/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify({
          prompt: field.aiPrompt,
          questionCount: field.questionCount || 3,
          previousResponses: currentResponses,
          formId: formId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      const questions = data.questions || [];

      // Render the generated questions
      renderAIQuestions(container, field.id, questions);

    } catch (error) {
      console.error('Error generating AI questions:', error);
      // Show fallback questions
      container.innerHTML = `
        <div class="ai-error">
          <p>Unable to generate personalized questions. Please answer these general questions:</p>
        </div>
        ${renderFallbackQuestions(field.id, field.questionCount || 3)}
      `;
    }
  }
}

// Render AI generated questions
function renderAIQuestions(container, fieldId, questions) {
  container.innerHTML = questions.map((q, index) => `
    <div class="ai-question" data-question-index="${index}">
      <label class="field-label">${escapeHtml(q.question)}</label>
      ${q.type === 'textarea' ? `
        <textarea
          class="field-input ai-answer"
          id="${fieldId}_q${index}"
          name="${fieldId}_q${index}"
          placeholder="Your answer..."
          rows="3"
        ></textarea>
      ` : q.type === 'radio' && q.options ? `
        <div class="field-options">
          ${q.options.map((opt, optIdx) => `
            <div class="option-item" onclick="selectOption(this, '${fieldId}_q${index}')">
              <input type="radio" name="${fieldId}_q${index}" id="${fieldId}_q${index}_${optIdx}" value="${escapeHtml(opt)}">
              <label class="option-label" for="${fieldId}_q${index}_${optIdx}">${escapeHtml(opt)}</label>
            </div>
          `).join('')}
        </div>
      ` : `
        <input
          type="text"
          class="field-input ai-answer"
          id="${fieldId}_q${index}"
          name="${fieldId}_q${index}"
          placeholder="Your answer..."
        >
      `}
    </div>
  `).join('');

  // Add listeners for AI questions
  container.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('change', updateProgress);
    input.addEventListener('input', updateProgress);
  });
}

// Render fallback questions if AI fails
function renderFallbackQuestions(fieldId, count) {
  const fallbackQuestions = [
    'What are your main health goals?',
    'Are there any specific concerns you would like to address?',
    'Is there anything else you would like us to know?'
  ];

  return fallbackQuestions.slice(0, count).map((q, index) => `
    <div class="ai-question" data-question-index="${index}">
      <label class="field-label">${q}</label>
      <textarea
        class="field-input ai-answer"
        id="${fieldId}_q${index}"
        name="${fieldId}_q${index}"
        placeholder="Your answer..."
        rows="3"
      ></textarea>
    </div>
  `).join('');
}

// Make functions globally available
window.selectOption = selectOption;
window.toggleCheckbox = toggleCheckbox;
window.prevSection = prevSection;
window.nextSection = nextSection;
window.goBackToEmail = goBackToEmail;
window.generateAIQuestions = generateAIQuestions;
