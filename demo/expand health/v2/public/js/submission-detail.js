/**
 * Submission Detail Page JavaScript
 * Shows detailed view of a form submission with AI summary and notes
 */

const API_BASE = window.location.origin;

// Get IDs from URL
const pathParts = window.location.pathname.split('/');
const formId = pathParts[2];
const submissionId = pathParts[4];

let submissionData = null;
let formData = null;
let clientData = null;
let notes = [];
let currentNoteTarget = null; // 'form' or question ID

// Category mapping for questions
const categoryKeywords = {
  goals: ['goal', 'achieve', 'success', 'want', 'hope', 'objective', 'target'],
  symptoms: ['symptom', 'pain', 'feel', 'problem', 'issue', 'condition', 'health'],
  lifestyle: ['diet', 'sleep', 'exercise', 'activity', 'lifestyle', 'habit', 'routine', 'alcohol', 'smoke', 'caffeine'],
  history: ['history', 'past', 'previous', 'family', 'medical', 'surgery', 'medication'],
  readiness: ['ready', 'commit', 'motivation', 'holding', 'barrier', 'challenge', 'support']
};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  if (!formId || !submissionId) {
    alert('Invalid URL');
    window.location.href = '/forms';
    return;
  }

  loadSubmissionData();
});

// Load submission data
async function loadSubmissionData() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    // Load submission and form data in parallel
    const [submissionRes, formRes] = await Promise.all([
      fetch(`${API_BASE}/api/forms/submission/${submissionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${API_BASE}/api/forms/templates/${formId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    console.log('Submission response status:', submissionRes.status);
    console.log('Form response status:', formRes.status);

    if (!submissionRes.ok || !formRes.ok) {
      const subError = !submissionRes.ok ? await submissionRes.text() : '';
      const formError = !formRes.ok ? await formRes.text() : '';
      console.error('Submission error:', subError);
      console.error('Form error:', formError);
      throw new Error('Failed to load data');
    }

    submissionData = await submissionRes.json();
    formData = await formRes.json();

    console.log('Submission data:', submissionData);
    console.log('Form data:', formData);

    // Load client data if available
    if (submissionData.client_id) {
      try {
        const clientRes = await fetch(`${API_BASE}/api/clients/${submissionData.client_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (clientRes.ok) {
          const data = await clientRes.json();
          clientData = data.client;
        }
      } catch (e) {
        console.log('Could not load client data');
      }
    }

    renderSubmission();
  } catch (error) {
    console.error('Error loading submission:', error);
    document.getElementById('loadingState').innerHTML = `
      <p style="color: #EF4444;">Failed to load submission. Please try again.</p>
      <button onclick="window.location.reload()" class="btn-secondary" style="margin-top: 16px;">Retry</button>
    `;
  }
}

// Render submission data
function renderSubmission() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('submissionContent').style.display = 'block';

  // Update header
  document.getElementById('submissionFormName').textContent = formData.name || 'Form Submission';
  document.getElementById('formName').textContent = formData.name || 'Form Submission';

  // Client name
  const clientName = submissionData.client_name ||
                     submissionData.submitted_name ||
                     (clientData ? `${clientData.first_name} ${clientData.last_name}` : 'Anonymous');
  document.getElementById('clientName').textContent = clientName;

  // Update breadcrumb link
  if (submissionData.client_id) {
    const clientLink = document.getElementById('clientLink');
    clientLink.textContent = clientName;
    clientLink.href = `/clients/${submissionData.client_id}`;
  }

  // Submission date
  const date = new Date(submissionData.submitted_at || submissionData.created_at);
  document.getElementById('submissionDate').textContent = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Render AI summary
  renderAISummary();

  // Render questions
  renderQuestions();

  // Render notes
  renderFormNotes();
}

// Render AI summary
function renderAISummary() {
  const container = document.getElementById('aiSummaryContent');

  if (submissionData.ai_summary) {
    // Format the summary with proper HTML
    const formattedSummary = formatAISummary(submissionData.ai_summary);
    container.innerHTML = formattedSummary;
  } else {
    // Auto-generate summary
    generateSummary();
  }
}

// Format AI summary with proper HTML
function formatAISummary(summary) {
  if (!summary) return '<p class="summary-placeholder">No summary available</p>';

  // Convert markdown-like formatting to HTML
  let html = summary
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n- /g, '</p><ul><li>')
    .replace(/\n/g, '<br>');

  // Wrap in paragraph if not already
  if (!html.startsWith('<p>')) {
    html = '<p>' + html + '</p>';
  }

  return html;
}

// Generate AI summary
async function generateSummary() {
  const container = document.getElementById('aiSummaryContent');
  const btn = document.getElementById('regenerateBtn');

  container.innerHTML = '<p class="summary-placeholder">Generating AI summary...</p>';
  btn.disabled = true;

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/forms/submissions/${submissionId}/regenerate-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const summary = data.ai_summary || data.summary;
      submissionData.ai_summary = summary;
      container.innerHTML = formatAISummary(summary);
    } else {
      container.innerHTML = '<p class="summary-placeholder">Could not generate summary. Please try again.</p>';
    }
  } catch (error) {
    console.error('Error generating summary:', error);
    container.innerHTML = '<p class="summary-placeholder">Error generating summary.</p>';
  }

  btn.disabled = false;
}

// Regenerate summary
function regenerateSummary() {
  generateSummary();
}

// Render questions with answers
function renderQuestions() {
  const container = document.getElementById('questionsList');
  const responses = submissionData.responses || submissionData.response_data || {};

  // Build field labels map from form template
  const fieldLabels = {};
  const fieldCategories = {};

  if (formData && formData.fields) {
    formData.fields.forEach(field => {
      fieldLabels[field.id] = field.label;
      fieldCategories[field.id] = field.category || detectCategory(field.label);
    });
  }

  // Track categories for filter tags
  const usedCategories = new Set();

  // Render each question/answer
  const questionsHtml = Object.entries(responses).map(([key, value]) => {
    const label = fieldLabels[key] || formatFieldLabel(key);
    const category = fieldCategories[key] || detectCategory(label);
    const displayValue = formatAnswer(value);

    usedCategories.add(category);

    // Get notes for this question
    const questionNotes = notes.filter(n => n.questionId === key);

    return `
      <div class="question-card" data-category="${category}" data-question-id="${key}">
        <div class="question-header">
          <div class="question-text">${escapeHtml(label)}</div>
          <span class="question-category ${category}">${category}</span>
        </div>
        <div class="answer-text">${escapeHtml(displayValue)}</div>
        <div class="question-actions">
          <button class="add-note-btn" onclick="openNoteModal('${key}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add Note
          </button>
        </div>
        ${questionNotes.length > 0 ? renderQuestionNotes(questionNotes) : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = questionsHtml;

  // Render filter tags
  renderFilterTags(usedCategories);
}

// Render question notes
function renderQuestionNotes(notesList) {
  if (!notesList || notesList.length === 0) return '';

  const notesHtml = notesList.map(note => `
    <div class="note-item">
      <div class="note-avatar">${getInitials(note.author)}</div>
      <div class="note-content">
        <div class="note-header">
          <span class="note-author">${escapeHtml(note.author)}</span>
          <span class="note-date">${formatNoteDate(note.date)}</span>
        </div>
        <div class="note-text">${escapeHtml(note.text)}</div>
      </div>
    </div>
  `).join('');

  return `<div class="question-notes">${notesHtml}</div>`;
}

// Render filter tags
function renderFilterTags(usedCategories) {
  const container = document.getElementById('filterTags');

  const categoryOrder = ['all', 'goals', 'symptoms', 'lifestyle', 'history', 'readiness', 'general'];
  const categoryLabels = {
    all: 'All Questions',
    goals: 'Goals',
    symptoms: 'Symptoms',
    lifestyle: 'Lifestyle',
    history: 'History',
    readiness: 'Readiness',
    general: 'General'
  };

  const tagsHtml = categoryOrder
    .filter(cat => cat === 'all' || usedCategories.has(cat))
    .map(cat => `
      <button class="filter-tag ${cat === 'all' ? 'active' : ''}"
              data-category="${cat}"
              onclick="filterByCategory('${cat}')">
        ${categoryLabels[cat]}
      </button>
    `).join('');

  container.innerHTML = tagsHtml;
}

// Filter questions by category
function filterByCategory(category) {
  // Update active tag
  document.querySelectorAll('.filter-tag').forEach(tag => {
    tag.classList.toggle('active', tag.dataset.category === category);
  });

  // Show/hide questions
  document.querySelectorAll('.question-card').forEach(card => {
    if (category === 'all' || card.dataset.category === category) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}

// Render form notes
function renderFormNotes() {
  const container = document.getElementById('notesList');
  const formNotes = notes.filter(n => n.questionId === 'form');

  if (formNotes.length === 0) {
    container.innerHTML = '<div class="empty-notes">No form notes yet. Click "Add Form Notes" to add one.</div>';
    return;
  }

  container.innerHTML = formNotes.map(note => `
    <div class="note-item">
      <div class="note-avatar">${getInitials(note.author)}</div>
      <div class="note-content">
        <div class="note-header">
          <span class="note-author">${escapeHtml(note.author)}</span>
          <span class="note-date">${formatNoteDate(note.date)}</span>
        </div>
        <div class="note-text">${escapeHtml(note.text)}</div>
      </div>
    </div>
  `).join('');
}

// Detect category from question text
function detectCategory(text) {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      return category;
    }
  }

  return 'general';
}

// Format field label from key
function formatFieldLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

// Format answer value
function formatAnswer(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value || '-');
}

// Open note modal
function openNoteModal(target) {
  currentNoteTarget = target;
  document.getElementById('noteText').value = '';
  document.getElementById('noteModal').style.display = 'flex';
  document.getElementById('noteText').focus();
}

// Close note modal
function closeNoteModal() {
  document.getElementById('noteModal').style.display = 'none';
  currentNoteTarget = null;
}

// Add form note
function addFormNote() {
  openNoteModal('form');
}

// Save note
function saveNote() {
  const text = document.getElementById('noteText').value.trim();
  if (!text) {
    alert('Please enter a note');
    return;
  }

  // Add note to local storage (in a real app, this would save to the backend)
  const note = {
    id: Date.now(),
    questionId: currentNoteTarget,
    text: text,
    author: 'Admin User', // In real app, get from auth
    date: new Date().toISOString()
  };

  notes.push(note);
  saveNotesToStorage();

  // Re-render
  if (currentNoteTarget === 'form') {
    renderFormNotes();
  } else {
    renderQuestions();
  }

  closeNoteModal();
}

// Save notes to local storage
function saveNotesToStorage() {
  const key = `submission_notes_${submissionId}`;
  localStorage.setItem(key, JSON.stringify(notes));
}

// Load notes from local storage
function loadNotesFromStorage() {
  const key = `submission_notes_${submissionId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    notes = JSON.parse(stored);
  }
}

// Load notes on init
loadNotesFromStorage();

// Export submission
function exportSubmission() {
  const exportData = {
    form: formData.name,
    client: document.getElementById('clientName').textContent,
    date: document.getElementById('submissionDate').textContent,
    ai_summary: submissionData.ai_summary,
    responses: submissionData.responses || submissionData.response_data,
    notes: notes
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `submission-${submissionId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Go back
function goBack() {
  if (submissionData && submissionData.client_id) {
    window.location.href = `/clients/${submissionData.client_id}`;
  } else {
    window.location.href = `/forms/${formId}/responses`;
  }
}

// Quick notes
function openQuickNotes() {
  document.getElementById('quickNotesPanel').style.display = 'flex';
}

function closeQuickNotes() {
  document.getElementById('quickNotesPanel').style.display = 'none';
}

function saveQuickNote() {
  const text = document.getElementById('quickNotesText').value.trim();
  if (text) {
    const note = {
      id: Date.now(),
      questionId: 'form',
      text: text,
      author: 'Admin User',
      date: new Date().toISOString()
    };
    notes.push(note);
    saveNotesToStorage();
    renderFormNotes();
    document.getElementById('quickNotesText').value = '';
    closeQuickNotes();
  }
}

// Utility functions
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatNoteDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Make functions global
window.filterByCategory = filterByCategory;
window.openNoteModal = openNoteModal;
window.closeNoteModal = closeNoteModal;
window.addFormNote = addFormNote;
window.saveNote = saveNote;
window.exportSubmission = exportSubmission;
window.goBack = goBack;
window.regenerateSummary = regenerateSummary;
window.openQuickNotes = openQuickNotes;
window.closeQuickNotes = closeQuickNotes;
window.saveQuickNote = saveQuickNote;
