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

  // Normalize file URL - always use API endpoint based on lab ID
  // This ensures auth headers are always sent, regardless of what's stored in DB
  const pdfUrl = `/api/labs/${lab.id}/file`;

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

  // Set download button click handler (always use authenticated API endpoint)
  downloadBtn.onclick = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('auth_token');
    try {
      const response = await fetch(pdfUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = lab.title || 'lab-result.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('PDF file not available. It may need to be re-uploaded.');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading PDF');
    }
  };

  // Load PDF with PDF.js for high-quality rendering
  loadPdfWithPdfJs(pdfUrl);

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

// Load PDF using PDF.js for high-quality rendering - renders ALL pages for scrolling
async function loadPdfWithPdfJs(url) {
  // Check if this is a demo/placeholder URL (no real PDF file)
  if (url && url.includes('/demo-') && currentLab && currentLab.extracted_data) {
    console.log('Demo lab detected, showing extracted data view');
    showExtractedDataView();
    return;
  }

  if (!window.pdfjsLib) {
    console.warn('PDF.js not available, falling back to iframe');
    useFallbackIframe(url);
    return;
  }

  try {
    // Show loading indicator in PDF area
    pdfContainer.innerHTML = '<div class="pdf-loading"><div class="mini-loader"></div><p>Loading PDF...</p></div>';

    // For API endpoints that require auth, fetch with token first
    let pdfData;
    if (url.startsWith('/api/')) {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch PDF from API');
      }
      const arrayBuffer = await response.arrayBuffer();
      pdfData = { data: arrayBuffer };
    } else {
      pdfData = url;
    }

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(pdfData);
    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;

    console.log('PDF loaded successfully, pages:', totalPages);

    // Create container for all pages
    pdfContainer.innerHTML = '<div id="pdfPagesContainer" class="pdf-pages-container"></div>';
    const pagesContainer = document.getElementById('pdfPagesContainer');

    // Calculate initial scale to fit width
    await calculateFitWidthScale();

    // Render ALL pages for continuous scrolling
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      await renderPageToContainer(pageNum, pagesContainer);
    }

    console.log('All pages rendered successfully');

    // Update page info
    currentPage = 1;
    updatePageInfo();

    // Setup scroll observer to track current page
    setupScrollObserver(pagesContainer);

  } catch (error) {
    console.error('Error loading PDF with PDF.js:', error);
    // If PDF fails to load and we have extracted data, show that instead
    if (currentLab && currentLab.extracted_data) {
      showExtractedDataView();
    } else {
      // Show helpful error message - PDF not in database
      pdfContainer.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #6b7280;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px; display: block;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          <p style="font-size: 16px; margin-bottom: 8px; font-weight: 500;">PDF Not Available</p>
          <p style="font-size: 14px; max-width: 400px; margin: 0 auto;">This lab result needs to be re-uploaded. The PDF file was not stored in the database.</p>
        </div>
      `;
    }
  }
}

// Render a single page to the pages container
async function renderPageToContainer(pageNum, container) {
  if (!pdfDoc) return;

  try {
    const page = await pdfDoc.getPage(pageNum);

    // Create a wrapper for this page
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'pdf-page-wrapper';
    pageWrapper.dataset.pageNum = pageNum;

    // Create canvas for this page
    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-page-canvas';
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

    // Add page number label
    const pageLabel = document.createElement('div');
    pageLabel.className = 'pdf-page-label';
    pageLabel.textContent = `Page ${pageNum} of ${totalPages}`;

    pageWrapper.appendChild(canvas);
    pageWrapper.appendChild(pageLabel);
    container.appendChild(pageWrapper);

    // Render the page with high quality settings
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      enableWebGL: true,
      renderInteractiveForms: true
    };

    await page.render(renderContext).promise;

  } catch (error) {
    console.error('Error rendering page', pageNum, ':', error);
  }
}

// Setup scroll observer to track which page is currently visible
function setupScrollObserver(container) {
  const pageWrappers = container.querySelectorAll('.pdf-page-wrapper');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        const pageNum = parseInt(entry.target.dataset.pageNum);
        if (pageNum !== currentPage) {
          currentPage = pageNum;
          updatePageInfo();
        }
      }
    });
  }, {
    root: pdfContainer,
    threshold: 0.5
  });

  pageWrappers.forEach(wrapper => observer.observe(wrapper));
}

// Show extracted data when PDF is not available (demo labs)
function showExtractedDataView() {
  const extractedData = typeof currentLab.extracted_data === 'string'
    ? JSON.parse(currentLab.extracted_data)
    : currentLab.extracted_data;

  // Hide PDF controls
  const controls = document.querySelector('.pdf-controls');
  if (controls) {
    controls.style.display = 'none';
  }

  // Hide download button for demo labs
  if (downloadBtn) {
    downloadBtn.style.display = 'none';
  }

  // Build the extracted data view
  let html = `
    <div class="extracted-data-view">
      <div class="demo-notice">
        <span class="demo-icon">📊</span>
        <span>Demo Lab Results - Extracted Data View</span>
      </div>
      <div class="markers-grid">
  `;

  if (extractedData.markers && Array.isArray(extractedData.markers)) {
    extractedData.markers.forEach(marker => {
      const statusClass = marker.flag === 'abnormal' ? 'status-abnormal' :
                          marker.flag === 'warning' ? 'status-warning' : 'status-normal';
      const statusIcon = marker.flag === 'abnormal' ? '🔴' :
                         marker.flag === 'warning' ? '🟡' : '🟢';

      html += `
        <div class="marker-card ${statusClass}">
          <div class="marker-header">
            <span class="marker-name">${marker.name}</span>
            <span class="marker-status">${statusIcon}</span>
          </div>
          <div class="marker-value">
            <span class="value">${marker.value}</span>
            <span class="unit">${marker.unit || ''}</span>
          </div>
          <div class="marker-range">
            Reference: ${marker.range || 'N/A'}
          </div>
          ${marker.note ? `<div class="marker-note">${marker.note}</div>` : ''}
        </div>
      `;
    });
  }

  html += `
      </div>
      ${extractedData.interpretation ? `
        <div class="interpretation-box">
          <h4>Clinical Interpretation</h4>
          <p>${extractedData.interpretation}</p>
        </div>
      ` : ''}
    </div>
  `;

  pdfContainer.innerHTML = html;
  pdfContainer.style.display = 'block';
  pdfContainer.style.overflow = 'auto';
  pdfContainer.style.padding = '20px';
  pdfFrame.style.display = 'none';
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
    rerenderAllPages();
  }
}

// Zoom out
function zoomOut() {
  if (currentScale > MIN_SCALE) {
    currentScale = Math.max(currentScale - SCALE_STEP, MIN_SCALE);
    rerenderAllPages();
  }
}

// Fit to width
async function fitToWidth() {
  await calculateFitWidthScale();
  rerenderAllPages();
}

// Re-render all pages with current scale
async function rerenderAllPages() {
  if (!pdfDoc) return;

  const pagesContainer = document.getElementById('pdfPagesContainer');
  if (!pagesContainer) return;

  // Clear existing pages
  pagesContainer.innerHTML = '';

  // Re-render all pages with new scale
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    await renderPageToContainer(pageNum, pagesContainer);
  }

  // Update zoom display
  updateZoomDisplay();

  // Scroll back to current page
  scrollToPage(currentPage);

  // Re-setup scroll observer
  setupScrollObserver(pagesContainer);
}

// Go to previous page - scroll to it
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    scrollToPage(currentPage);
    updatePageInfo();
  }
}

// Go to next page - scroll to it
function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    scrollToPage(currentPage);
    updatePageInfo();
  }
}

// Scroll to a specific page
function scrollToPage(pageNum) {
  const pagesContainer = document.getElementById('pdfPagesContainer');
  if (!pagesContainer) return;

  const pageWrapper = pagesContainer.querySelector(`[data-page-num="${pageNum}"]`);
  if (pageWrapper) {
    pageWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
