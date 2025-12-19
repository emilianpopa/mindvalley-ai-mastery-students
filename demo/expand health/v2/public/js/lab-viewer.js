/**
 * Lab Viewer JavaScript
 * Handles PDF viewing with PDF.js for high-quality rendering and AI summary generation
 */

const API_BASE = window.location.origin;

// Get lab ID from URL
const pathParts = window.location.pathname.split('/');
const labId = pathParts[pathParts.length - 1];

// DOM Elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const labView = document.getElementById('labView');
const errorMessage = document.getElementById('errorMessage');
const pdfFrame = document.getElementById('pdfFrame');
const pdfCanvas = document.getElementById('pdfCanvas');
const pdfContainer = document.getElementById('pdfContainer');
const generateSummaryBtn = document.getElementById('generateSummaryBtn');
const deleteBtn = document.getElementById('deleteBtn');
const downloadBtn = document.getElementById('downloadBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

// PDF controls
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const fitWidthBtn = document.getElementById('fitWidthBtn');
const zoomLevelDisplay = document.getElementById('zoomLevel');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageInfoDisplay = document.getElementById('pageInfo');

// Summary elements
const summaryCard = document.getElementById('summaryCard');
const summaryBadge = document.getElementById('summaryBadge');
const summaryLoading = document.getElementById('summaryLoading');
const summaryEmpty = document.getElementById('summaryEmpty');
const summaryContent = document.getElementById('summaryContent');

// Current lab data
let currentLab = null;

// PDF.js variables
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let currentScale = 1.5; // Start at 150% for better clarity
let baseScale = 1.5;
const MIN_SCALE = 0.5;
const MAX_SCALE = 4.0;
const SCALE_STEP = 0.25;

// Initialize PDF.js worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

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

// Format file size
function formatFileSize(bytes) {
  if (!bytes) return '-';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB`;
}

// Display lab data
function displayLab(lab) {
  currentLab = lab;

  // Update page title
  const title = lab.title || `${lab.client_name} - ${lab.lab_type}`;
  document.title = `${title} - ExpandHealth`;
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('breadcrumbTitle').textContent = title;

  // Update info card
  document.getElementById('labTitle').textContent = title;
  document.getElementById('clientLink').href = `/clients/${lab.client_id}`;
  document.getElementById('clientLink').textContent = lab.client_name || 'Unknown Client';
  document.getElementById('labType').textContent = lab.lab_type || 'General';
  document.getElementById('testDate').textContent = formatDate(lab.test_date);

  // Update details
  document.getElementById('fileSize').textContent = formatFileSize(lab.file_size);
  document.getElementById('uploadedDate').textContent = formatDateTime(lab.created_at);
  document.getElementById('uploadedBy').textContent = 'Admin'; // TODO: Get actual uploader name
  document.getElementById('labId').textContent = lab.id;

  // Set download link
  downloadBtn.href = lab.file_url;
  downloadBtn.download = lab.title || 'lab-result.pdf';

  // Load PDF with PDF.js for high-quality rendering
  loadPdfWithPdfJs(lab.file_url);

  // Handle AI summary
  if (lab.ai_summary) {
    showSummary(lab.ai_summary);
  } else {
    summaryEmpty.style.display = 'block';
    summaryContent.style.display = 'none';
  }

  // Show lab view, hide loading
  loadingState.style.display = 'none';
  labView.style.display = 'block';
}

// Load PDF using PDF.js for high-quality rendering
async function loadPdfWithPdfJs(url) {
  if (!window.pdfjsLib) {
    console.warn('PDF.js not available, falling back to iframe');
    useFallbackIframe(url);
    return;
  }

  try {
    // Show loading indicator in PDF area
    pdfContainer.innerHTML = '<div class="pdf-loading"><div class="mini-loader"></div><p>Loading PDF...</p></div>';

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(url);
    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;

    // Restore canvas
    pdfContainer.innerHTML = '<canvas id="pdfCanvas"></canvas>';

    // Calculate initial scale to fit width
    await calculateFitWidthScale();

    // Render the first page
    await renderPage(currentPage);

    // Update page info
    updatePageInfo();

  } catch (error) {
    console.error('Error loading PDF with PDF.js:', error);
    useFallbackIframe(url);
  }
}

// Calculate scale to fit container width
async function calculateFitWidthScale() {
  if (!pdfDoc) return;

  try {
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    const containerWidth = pdfContainer.clientWidth - 40; // Account for padding

    // Calculate scale to fit width, with a minimum for readability
    baseScale = Math.max(containerWidth / viewport.width, 1.0);
    currentScale = baseScale;
  } catch (error) {
    console.error('Error calculating fit width scale:', error);
  }
}

// Render a specific page
async function renderPage(pageNum) {
  if (!pdfDoc) return;

  try {
    const page = await pdfDoc.getPage(pageNum);

    // Get canvas element (may have been recreated)
    const canvas = document.getElementById('pdfCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Use device pixel ratio for sharp rendering on high-DPI displays
    const devicePixelRatio = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: currentScale });

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
    updateZoomDisplay();

  } catch (error) {
    console.error('Error rendering page:', error);
  }
}

// Use fallback iframe if PDF.js fails
function useFallbackIframe(url) {
  pdfContainer.style.display = 'none';
  pdfFrame.style.display = 'block';
  pdfFrame.src = url;

  // Hide PDF.js controls
  const controls = document.querySelector('.pdf-controls');
  if (controls) {
    controls.style.display = 'none';
  }
}

// Update zoom display
function updateZoomDisplay() {
  const percentage = Math.round(currentScale * 100);
  zoomLevelDisplay.textContent = `${percentage}%`;
}

// Update page info display
function updatePageInfo() {
  pageInfoDisplay.textContent = `${currentPage} / ${totalPages}`;

  // Enable/disable navigation buttons
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

// Zoom in
function zoomIn() {
  if (currentScale < MAX_SCALE) {
    currentScale = Math.min(currentScale + SCALE_STEP, MAX_SCALE);
    renderPage(currentPage);
  }
}

// Zoom out
function zoomOut() {
  if (currentScale > MIN_SCALE) {
    currentScale = Math.max(currentScale - SCALE_STEP, MIN_SCALE);
    renderPage(currentPage);
  }
}

// Fit to width
async function fitToWidth() {
  await calculateFitWidthScale();
  renderPage(currentPage);
}

// Go to previous page
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
    updatePageInfo();
    // Scroll to top of PDF viewer
    pdfContainer.scrollTop = 0;
  }
}

// Go to next page
function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    renderPage(currentPage);
    updatePageInfo();
    // Scroll to top of PDF viewer
    pdfContainer.scrollTop = 0;
  }
}

// Show error
function showError(message) {
  loadingState.style.display = 'none';
  errorMessage.textContent = message;
  errorState.style.display = 'flex';
}

// Fetch lab data
async function fetchLab() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const response = await fetch(`${API_BASE}/api/labs/${labId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (response.status === 404) {
      showError('Lab result not found');
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to load lab result');
    }

    const data = await response.json();
    displayLab(data.lab);

  } catch (error) {
    console.error('Error fetching lab:', error);
    showError(error.message || 'Failed to load lab result. Please try again.');
  }
}

// Generate AI summary
async function generateSummary() {
  // Hide empty state, show loading
  summaryEmpty.style.display = 'none';
  summaryContent.style.display = 'none';
  summaryLoading.style.display = 'flex';
  generateSummaryBtn.disabled = true;

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/labs/${labId}/generate-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to generate summary');
    }

    const data = await response.json();
    showSummary(data.summary);

    // Update current lab data
    currentLab.ai_summary = data.summary;

  } catch (error) {
    console.error('Error generating summary:', error);
    alert(error.message || 'Failed to generate AI summary. Please try again.');
    summaryEmpty.style.display = 'block';
    summaryLoading.style.display = 'none';
    generateSummaryBtn.disabled = false;
  }
}

// Show summary
function showSummary(summary) {
  summaryLoading.style.display = 'none';
  summaryEmpty.style.display = 'none';
  summaryContent.style.display = 'block';

  // Update badge
  summaryBadge.textContent = 'Generated';
  summaryBadge.classList.add('generated');

  // Format and display summary
  summaryContent.innerHTML = formatSummary(summary);

  generateSummaryBtn.disabled = false;
  generateSummaryBtn.querySelector('span:last-child').textContent = 'Regenerate Summary';
}

// Format summary text to HTML
function formatSummary(text) {
  if (!text) return '<p>No summary available</p>';

  // Simple markdown-like formatting
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\n\n/g, '</p><p>') // Paragraphs
    .replace(/\n- /g, '<li>') // List items
    .replace(/\n/g, '<br>'); // Line breaks

  // Wrap in paragraph if not already
  if (!html.startsWith('<p>')) {
    html = '<p>' + html + '</p>';
  }

  // Wrap list items in ul
  if (html.includes('<li>')) {
    html = html.replace(/(<li>.*?<br>)/gs, '<ul>$1</ul>');
    html = html.replace(/<\/ul><ul>/g, '');
  }

  return html;
}

// Delete lab
async function deleteLab() {
  const labTitle = currentLab.title || 'this lab result';

  if (!confirm(`Are you sure you want to delete ${labTitle}? This cannot be undone and will permanently remove the PDF file.`)) {
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

    if (response.ok) {
      alert('Lab deleted successfully');
      window.location.href = '/labs';
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete lab');
    }
  } catch (error) {
    console.error('Error deleting lab:', error);
    alert('Failed to delete lab. Please try again.');
  }
}

// Fullscreen PDF
function toggleFullscreen() {
  const pdfViewer = document.querySelector('.pdf-viewer');

  if (!document.fullscreenElement) {
    pdfViewer.requestFullscreen().catch(err => {
      console.error('Error attempting to enable fullscreen:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

// Handle keyboard navigation
function handleKeydown(event) {
  // Only handle if not in an input field
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }

  switch (event.key) {
    case 'ArrowLeft':
      prevPage();
      event.preventDefault();
      break;
    case 'ArrowRight':
      nextPage();
      event.preventDefault();
      break;
    case '+':
    case '=':
      zoomIn();
      event.preventDefault();
      break;
    case '-':
      zoomOut();
      event.preventDefault();
      break;
  }
}

// Handle window resize
let resizeTimeout;
function handleResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, 250);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (!labId || labId === 'upload') {
    showError('Invalid lab ID');
    return;
  }

  fetchLab();

  // Event listeners for buttons
  generateSummaryBtn.addEventListener('click', generateSummary);
  deleteBtn.addEventListener('click', deleteLab);
  fullscreenBtn.addEventListener('click', toggleFullscreen);

  // PDF control event listeners
  zoomInBtn.addEventListener('click', zoomIn);
  zoomOutBtn.addEventListener('click', zoomOut);
  fitWidthBtn.addEventListener('click', fitToWidth);
  prevPageBtn.addEventListener('click', prevPage);
  nextPageBtn.addEventListener('click', nextPage);

  // Keyboard navigation
  document.addEventListener('keydown', handleKeydown);

  // Window resize handler
  window.addEventListener('resize', handleResize);
});
