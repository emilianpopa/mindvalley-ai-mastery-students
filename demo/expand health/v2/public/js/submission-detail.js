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

// Category mapping using regex patterns - checked in order (more specific first)
const categoryPatterns = [
  // Medical History - check FIRST with very specific patterns
  // "Do you have any history of disease" should be HISTORY, not symptoms
  {
    category: 'history',
    patterns: [
      /history of/i,  // "history of disease", "history of conditions"
      /family history/i,
      /medical history/i,
      /diagnosed with/i,
      /previous(ly)?\s+(had|diagnosed|treated)/i,
      /surgery|operation|procedure/i,
      /hospital(ized)?/i
    ]
  },
  // Diet/food questions - "I eat wheat", "I drink alcohol"
  {
    category: 'diet',
    patterns: [
      /(I\s+)?(eat|drink|consume)/i,
      /(food|meal|breakfast|lunch|dinner|snack)s?/i,
      /(wheat|gluten|dairy|sugar|sweet|chocolate|candy|pastries)/i,
      /(vegetable|fruit|meat|fish|protein)s?/i,
      /(water|liter|hydration|caffeine|coffee|tea|alcohol)/i,
      /(bread|pasta|rice|grain|processed)/i,
      /appetite|hunger|cravings?/i,
      /diet(ary)?|nutrition/i
    ]
  },
  // Sleep questions
  {
    category: 'sleep',
    patterns: [
      /sleep(ing)?/i,
      /(go to |in )bed/i,
      /wake\s*(up)?/i,
      /insomnia/i,
      /hours?\s+(of\s+)?sleep/i,
      /rest(ful|less)?/i,
      /tired|fatigue(d)?/i
    ]
  },
  // Activity/exercise questions
  {
    category: 'activity',
    patterns: [
      /exercise/i,
      /workout/i,
      /(gym|fitness)/i,
      /(walk|run|jog|swim|cycle|sport)s?/i,
      /physical(ly)?\s+active/i,
      /sedentary/i,
      /yoga|stretch/i
    ]
  },
  // Stress/mental wellness - emotional state questions
  {
    category: 'stress',
    patterns: [
      /stress(ed|ful)?/i,
      /anxi(ety|ous)/i,
      /(worry|worried|worries)/i,
      /(relax|calm|peace)/i,
      /(overwhelm|pressure)/i,
      /mental\s+(health|state|wellbeing)/i,
      /meditat/i,
      /mindful/i
    ]
  },
  // Lifestyle/wellbeing - general life quality questions
  // "I have a healthy social life", "I feel loved and supported"
  {
    category: 'lifestyle',
    patterns: [
      /social\s+life/i,
      /relationship/i,
      /supported/i,
      /loved/i,
      /lifestyle/i,
      /habit/i,
      /routine/i,
      /balance/i,
      /quality of life/i,
      /healthy.*life/i,
      /work.life/i
    ]
  },
  // Goals and motivations
  {
    category: 'goals',
    patterns: [
      /goal/i,
      /achiev/i,
      /objective/i,
      /target/i,
      /want\s+to/i,
      /hope\s+to/i,
      /motivat/i,
      /improve/i
    ]
  },
  // Symptoms - physical complaints
  {
    category: 'symptoms',
    patterns: [
      /symptom/i,
      /pain/i,
      /ache/i,
      /discomfort/i,
      /complaint/i,
      /bloat/i,
      /digest/i,
      /headache|migraine/i,
      /nausea/i,
      /cramp/i
    ]
  },
  // General/contact info - personal details
  {
    category: 'general',
    patterns: [
      /(first|last)?s*name/i,
      /email/i,
      /phone/i,
      /mobile/i,
      /address/i,
      /(date of )?birth/i,
      /age/i,
      /gender/i,
      /occupation/i
    ]
  }
]

// Legacy map for filter tag display
const categoryKeywords = {
  goals: ['goal'],
  symptoms: ['symptom'],
  lifestyle: ['lifestyle'],
  history: ['history'],
  diet: ['diet'],
  sleep: ['sleep'],
  activity: ['activity'],
  stress: ['stress']
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
  // Calculate and render wellness scores
  renderWellnessScores();


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

  console.log('[renderQuestions] Responses:', responses);
  console.log('[renderQuestions] Response keys:', Object.keys(responses));

  // Build field labels map from form template
  const fieldLabels = {};
  const fieldCategories = {};

  if (formData && formData.fields) {
    console.log('[renderQuestions] Form fields count:', formData.fields.length);
    formData.fields.forEach(field => {
      console.log('[renderQuestions] Field:', field.id, '-> Label:', field.label, '-> Category:', field.category);
      fieldLabels[field.id] = field.label;
      fieldCategories[field.id] = field.category || detectCategory(field.label);
    });
  } else {
    console.log('[renderQuestions] No form fields found!');
  }

  console.log('[renderQuestions] Built fieldLabels:', Object.keys(fieldLabels));
  console.log('[renderQuestions] Built fieldCategories:', fieldCategories);

  // Track categories for filter tags
  const usedCategories = new Set();

  // Render each question/answer
  const questionsHtml = Object.entries(responses).map(([key, value]) => {
    const label = fieldLabels[key] || formatFieldLabel(key);
    const precomputedCategory = fieldCategories[key];
    const category = precomputedCategory || detectCategory(label);
    const displayValue = formatAnswer(value);

    console.log(`[renderQuestions] Processing: key="${key.substring(0,30)}...", precomputedCategory=${precomputedCategory}, finalCategory=${category}`);

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

  const categoryOrder = ['all', 'goals', 'symptoms', 'lifestyle', 'diet', 'sleep', 'activity', 'stress', 'history', 'general'];
  const categoryLabels = {
    all: 'All Questions',
    goals: 'Goals',
    symptoms: 'Symptoms',
    lifestyle: 'Lifestyle',
    diet: 'Diet',
    sleep: 'Sleep',
    activity: 'Activity',
    stress: 'Stress',
    history: 'History',
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

// Detect category from question text using regex patterns
function detectCategory(text) {
  if (!text) {
    console.log('[detectCategory] Empty text, returning general');
    return 'general';
  }

  // Normalize text - remove extra whitespace, normalize quotes
  const normalizedText = text.toString().trim();

  console.log('[detectCategory] Testing text:', normalizedText.substring(0, 50) + '...');

  // Check patterns in order - more specific categories first
  for (const { category, patterns } of categoryPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedText)) {
        console.log('[detectCategory] Matched category:', category, 'with pattern:', pattern.toString());
        return category;
      }
    }
  }

  console.log('[detectCategory] No match found, returning general');
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

// ============================================
// WELLNESS SCORES CALCULATION
// ============================================

// Question patterns for wellness score categories
var wellnessQuestionPatterns = {
  sleep: [/sleep/i, /bed\s*time/i, /wake/i, /tired/i, /toilet.*night/i, /fall\s*asleep/i],
  stress: [/stress/i, /anxious/i, /anxiety/i, /mood/i, /confidence/i, /worthy/i, /motivated/i, /joy/i, /loved/i, /supported/i, /relationship/i, /social life/i],
  diet: [/eat/i, /drink/i, /food/i, /water/i, /alcohol/i, /sugar/i, /sweet/i, /wheat/i, /gluten/i, /meat/i, /processed/i, /caffeine/i, /liter/i],
  activity: [/exercise/i, /workout/i, /step/i, /walk/i, /running/i, /HIIT/i, /yoga/i, /pilates/i, /cycling/i, /swimming/i, /active/i, /intensity/i]
};

// Convert answer to score (0-4 scale)
function answerToScore(answer, isNegative) {
  var normalized = String(answer).toLowerCase().replace(/-/g, ' ').trim();
  var agreementScores = { 'strongly agree': 4, 'agree': 3, 'neutral': 2, 'disagree': 1, 'strongly disagree': 0 };
  var frequencyScores = { 'always': 4, 'often': 3, 'sometimes': 2, 'rarely': 1, 'never': 0 };
  var score = (agreementScores[normalized] !== undefined) ? agreementScores[normalized] : 
              ((frequencyScores[normalized] !== undefined) ? frequencyScores[normalized] : 2);
  return isNegative ? (4 - score) : score;
}

// Check if question is negative (higher frequency = worse outcome)
function isNegativeQuestion(text) {
  var negPatterns = [
    /less than/i, /struggle/i, /wake up tired/i, /close to.*bed/i, 
    /toilet.*night/i, /overeat/i, /high.fat/i, /processed/i, 
    /sugar/i, /sweet tooth/i, /alcohol/i, /cigarette/i, /vape/i,
    /more than.*before/i
  ];
  for (var i = 0; i < negPatterns.length; i++) {
    if (negPatterns[i].test(text)) return true;
  }
  return false;
}

// Calculate wellness scores from form responses
function calculateWellnessScores() {
  var responses = submissionData.responses || {};
  var scores = { 
    sleep: { total: 0, count: 0 }, 
    stress: { total: 0, count: 0 }, 
    diet: { total: 0, count: 0 }, 
    activity: { total: 0, count: 0 } 
  };
  
  var fieldLabels = {};
  if (formData && formData.fields) {
    for (var i = 0; i < formData.fields.length; i++) {
      var f = formData.fields[i];
      fieldLabels[f.id] = f.label;
    }
  }

  var keys = Object.keys(responses);
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var value = responses[key];
    var label = fieldLabels[key] || key;
    var isNeg = isNegativeQuestion(label);
    
    for (var cat in wellnessQuestionPatterns) {
      var patterns = wellnessQuestionPatterns[cat];
      var matched = false;
      for (var p = 0; p < patterns.length; p++) {
        if (patterns[p].test(label)) {
          matched = true;
          break;
        }
      }
      if (matched) {
        scores[cat].total += answerToScore(value, isNeg);
        scores[cat].count += 1;
        break;
      }
    }
  }

  var result = {};
  for (var cat in scores) {
    var data = scores[cat];
    result[cat] = data.count > 0 ? Math.round((data.total / data.count / 4) * 10) : null;
  }
  return result;
}

// Extract medical history highlights
function extractMedicalHistory() {
  var responses = submissionData.responses || {};
  var highlights = [];
  
  var fieldLabels = {};
  if (formData && formData.fields) {
    for (var i = 0; i < formData.fields.length; i++) {
      var f = formData.fields[i];
      fieldLabels[f.id] = f.label;
    }
  }

  var keys = Object.keys(responses);
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var value = responses[key];
    var label = fieldLabels[key] || key;
    
    if (/history.*disease|history.*condition|diagnosed/i.test(label)) {
      if (value && String(value).trim() && String(value).toLowerCase() !== 'none') {
        var clean = String(value).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
        clean = clean.charAt(0).toUpperCase() + clean.slice(1);
        highlights.push(clean);
      }
    }
  }
  return highlights;
}

// Render wellness scores section
function renderWellnessScores() {
  var section = document.getElementById('wellnessScoresSection');
  if (!section) {
    console.log('[WellnessScores] Section element not found');
    return;
  }

  var formName = (formData.name || '').toLowerCase();
  if (formName.indexOf('wellbeing') === -1 && formName.indexOf('check-in') === -1 && formName.indexOf('wellness') === -1) {
    console.log('[WellnessScores] Not a wellness form, hiding section');
    section.style.display = 'none';
    return;
  }

  var scores = calculateWellnessScores();
  var history = extractMedicalHistory();
  
  console.log('[WellnessScores] Calculated scores:', scores);
  console.log('[WellnessScores] Medical history:', history);
  
  var hasScores = false;
  for (var cat in scores) {
    if (scores[cat] !== null) hasScores = true;
  }

  if (!hasScores) {
    console.log('[WellnessScores] No scores calculated, hiding section');
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  var categories = ['sleep', 'stress', 'diet', 'activity'];
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    var scoreEl = document.getElementById(cat + 'Score');
    var fillEl = document.getElementById(cat + 'ScoreFill');
    if (scoreEl && scores[cat] !== null) {
      scoreEl.textContent = scores[cat];
      if (fillEl) {
        fillEl.style.width = (scores[cat] * 10) + '%';
      }
    }
  }

  // Add medical history if present
  if (history.length > 0) {
    var existingHistory = section.querySelector('.medical-highlights');
    if (existingHistory) existingHistory.remove();
    
    var historyHtml = '<div class="medical-highlights">' +
      '<h4>Medical History</h4>' +
      '<ul>' + history.map(function(h) { return '<li>' + escapeHtml(h) + '</li>'; }).join('') + '</ul>' +
      '</div>';
    
    var grid = section.querySelector('.wellness-scores-grid');
    if (grid) {
      grid.insertAdjacentHTML('afterend', historyHtml);
    }
  }
}
