/**
 * Knowledge Base Admin Page
 */

// Prevent double-loading
if (window.kbAdminLoaded) {
  console.log('KB Admin already loaded, skipping initialization');
} else {
  window.kbAdminLoaded = true;

const API_BASE_KB = window.location.origin;
let allDocuments = [];
let selectedFiles = []; // Changed from single file to array
let sortColumn = 'uploaded_at';
let sortDirection = 'desc';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  loadDocuments();
});

// Load all documents
async function loadDocuments() {
  try {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      console.error('No auth token found');
      hideLoading();
      showError('Please log in to view knowledge base');
      return;
    }

    console.log('Fetching documents from:', `${API_BASE_KB}/api/kb/documents`);

    const response = await fetch(`${API_BASE_KB}/api/kb/documents`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Documents API error:', response.status, errorText);
      throw new Error('Failed to load documents');
    }

    const data = await response.json();
    console.log('Documents loaded:', data);
    allDocuments = data.documents || [];

    renderDocuments();
    hideLoading();

  } catch (error) {
    console.error('Error loading documents:', error);
    hideLoading();
    showError('Failed to load knowledge base documents');
  }
}

// Render documents table
function renderDocuments() {
  const tableContainer = document.getElementById('documentsTable');
  const tableBody = document.getElementById('documentsTableBody');
  const emptyState = document.getElementById('emptyState');

  // Apply search filter
  const searchQuery = document.getElementById('searchInput').value.toLowerCase();

  let filtered = allDocuments;

  if (searchQuery) {
    filtered = filtered.filter(doc =>
      doc.name.toLowerCase().includes(searchQuery) ||
      (doc.category && doc.category.toLowerCase().includes(searchQuery))
    );
  }

  // Sort documents
  filtered.sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];

    if (sortColumn === 'uploaded_at') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  if (filtered.length === 0) {
    tableContainer.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  tableContainer.style.display = 'block';

  tableBody.innerHTML = filtered.map(doc => {
    const uploadedDate = new Date(doc.uploaded_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const tagClass = getCategoryClass(doc.category);
    const notes = getDocumentNotes(doc.category);

    return `
      <tr>
        <td class="file-name-cell">${escapeHtml(doc.name)}</td>
        <td>
          <span class="tag-badge ${tagClass}">${escapeHtml(doc.category)}</span>
        </td>
        <td>${uploadedDate}</td>
        <td class="notes-cell" title="${escapeHtml(notes)}">${escapeHtml(notes)}</td>
        <td>
          <div class="actions-cell">
            <button class="action-btn view" onclick="viewDocument(${doc.id})" title="View details">
              👁
            </button>
            <button class="action-btn edit" onclick="editDocument(${doc.id})" title="Edit">
              ✏️
            </button>
            <button class="action-btn delete" onclick="deleteDocument(${doc.id}, '${escapeHtml(doc.name)}')
" title="Delete">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Get category CSS class
function getCategoryClass(category) {
  const classes = {
    'Cardiometabolic & Heart Health': 'cardio',
    'Hormonal & Endocrine': 'hormonal',
    'Longevity & Healthy Ageing': 'longevity',
    'Immune & Inflammation': 'immune',
    'Gut & Detox': 'gut',
    'General': 'general'
  };
  return classes[category] || 'general';
}

// Get document notes based on category
function getDocumentNotes(category) {
  const notes = {
    'Cardiometabolic & Heart Health': 'A protocol focused on lowering blood pressure and reducing cardiovascular strain.',
    'Hormonal & Endocrine': 'Designed to support healthy testosterone levels and hormonal balance.',
    'Longevity & Healthy Ageing': "Aims to enhance the body's natural DNA repair mechanisms.",
    'Immune & Inflammation': 'Supports energy restoration, immune function, and cellular repair.',
    'Gut & Detox': 'Supports digestive health and microbiome diversity.',
    'General': 'General knowledge base document'
  };
  return notes[category] || 'Knowledge base document';
}

// Sort table
function sortTable(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }
  renderDocuments();
}

// Filter documents
function filterDocuments() {
  renderDocuments();
}

// Show upload modal
function showUploadModal() {
  const modal = document.getElementById('uploadModal');
  const uploadBtn = document.getElementById('uploadBtn');
  const form = document.getElementById('uploadForm');

  // Reset form
  form.reset();

  // Reset button state
  uploadBtn.disabled = false;
  uploadBtn.textContent = 'Upload';
  uploadBtn.style.background = '';

  // Clear file
  removeFile();

  // Show modal
  modal.style.display = 'flex';
}

// Close upload modal
function closeUploadModal() {
  const modal = document.getElementById('uploadModal');
  const uploadBtn = document.getElementById('uploadBtn');

  // Reset button state when closing
  uploadBtn.disabled = false;
  uploadBtn.textContent = 'Upload';
  uploadBtn.style.background = '';

  // Hide modal
  modal.style.display = 'none';
}

// Handle file selection
function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  const validFiles = [];
  const invalidFiles = [];

  files.forEach(file => {
    if (file.size > maxSize) {
      invalidFiles.push(file.name);
    } else {
      validFiles.push(file);
    }
  });

  if (invalidFiles.length > 0) {
    alert(`These files are too large (max 10MB):\n${invalidFiles.join('\n')}`);
  }

  if (validFiles.length === 0) {
    event.target.value = '';
    return;
  }

  selectedFiles = validFiles;

  // Show file preview list
  document.getElementById('uploadPrompt').style.display = 'none';
  renderFilePreviewList();

  // Auto-fill document name from first filename (without extension)
  const nameWithoutExt = validFiles[0].name.replace(/\.[^/.]+$/, '');
  const docNameInput = document.getElementById('docName');
  if (!docNameInput.value) {
    docNameInput.value = nameWithoutExt;
  }
}

// Render file preview list
function renderFilePreviewList() {
  const previewList = document.getElementById('filePreviewList');

  if (selectedFiles.length === 0) {
    previewList.style.display = 'none';
    document.getElementById('uploadPrompt').style.display = 'flex';
    return;
  }

  previewList.style.display = 'block';
  previewList.innerHTML = selectedFiles.map((file, index) => `
    <div class="file-preview-item">
      <div class="file-icon">📄</div>
      <div class="file-info">
        <div class="file-name">${escapeHtml(file.name)}</div>
        <div class="file-size">${formatFileSize(file.size)}</div>
      </div>
      <button type="button" class="file-remove" onclick="removeFileAtIndex(${index})" title="Remove file">
        ✕
      </button>
    </div>
  `).join('');
}

// Remove file at index
function removeFileAtIndex(index) {
  selectedFiles.splice(index, 1);

  if (selectedFiles.length === 0) {
    const fileInput = document.getElementById('docFile');
    if (fileInput) {
      fileInput.value = '';
    }
  }

  renderFilePreviewList();
}

// Remove selected file (legacy - now handled by removeFileAtIndex)
function removeFile() {
  selectedFiles = [];
  const fileInput = document.getElementById('docFile');
  if (fileInput) {
    fileInput.value = '';
  }
  renderFilePreviewList();
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Upload document
async function uploadDocument(event) {
  event.preventDefault();

  const uploadBtn = document.getElementById('uploadBtn');
  const originalText = uploadBtn.textContent;
  uploadBtn.disabled = true;

  try {
    const name = document.getElementById('docName').value.trim();
    const category = document.getElementById('docCategory').value;

    if (!name) {
      alert('Please enter a document name');
      uploadBtn.disabled = false;
      uploadBtn.textContent = originalText;
      return;
    }

    if (!category) {
      alert('Please select a tag');
      uploadBtn.disabled = false;
      uploadBtn.textContent = originalText;
      return;
    }

    if (selectedFiles.length === 0) {
      alert('Please select at least one file');
      uploadBtn.disabled = false;
      uploadBtn.textContent = originalText;
      return;
    }

    console.log(`Starting upload of ${selectedFiles.length} file(s)`);

    const token = localStorage.getItem('auth_token');
    let successCount = 0;
    let errorCount = 0;

    // Upload files sequentially
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileNum = i + 1;
      const totalFiles = selectedFiles.length;

      // Update button with progress
      uploadBtn.innerHTML = `<span style="display: inline-block; width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 8px;"></span>Uploading ${fileNum}/${totalFiles}...`;

      try {
        console.log(`Uploading file ${fileNum}/${totalFiles}: ${file.name}`);

        // Read file content
        const content = await readFileContent(file);
        console.log(`File content read, length: ${content.length}`);

        // Use name + filename for multi-file, or just name for single file
        const docName = selectedFiles.length > 1
          ? `${name} - ${file.name.replace(/\.[^/.]+$/, '')}`
          : name;

        const response = await fetch(`${API_BASE_KB}/api/kb/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: docName,
            content,
            category,
            filename: file.name
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Upload error for ${file.name}:`, errorData);
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        console.log(`Upload successful for ${file.name}:`, data);
        successCount++;

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        errorCount++;
      }
    }

    // Show final status
    if (errorCount === 0) {
      uploadBtn.innerHTML = `✓ Uploaded ${successCount} file(s)!`;
      uploadBtn.style.background = '#059669';
    } else if (successCount > 0) {
      uploadBtn.innerHTML = `⚠ ${successCount} succeeded, ${errorCount} failed`;
      uploadBtn.style.background = '#F59E0B';
    } else {
      throw new Error('All uploads failed');
    }

    // Wait a moment before closing
    await new Promise(resolve => setTimeout(resolve, 1000));

    closeUploadModal();

    // Reload documents to show the new ones
    await loadDocuments();

    console.log('Documents reloaded after upload');

    // Show summary if there were errors
    if (errorCount > 0) {
      alert(`Upload complete:\n${successCount} files uploaded successfully\n${errorCount} files failed`);
    }

  } catch (error) {
    console.error('Error uploading documents:', error);
    alert(`Failed to upload documents: ${error.message}`);
    uploadBtn.disabled = false;
    uploadBtn.textContent = originalText;
    uploadBtn.style.background = '';
  }
}

// Read file content
async function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    // Read as text for TXT, MD files
    // For PDF/Word, you'd need a library like pdf.js or mammoth.js
    if (file.type === 'application/pdf') {
      alert('PDF extraction requires additional processing. For now, please convert your PDF to text and upload as a .txt file.');
      reject(new Error('PDF not supported yet'));
    } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      alert('Word document extraction requires additional processing. For now, please save your document as .txt and upload that instead.');
      reject(new Error('Word documents not supported yet'));
    } else {
      reader.readAsText(file);
    }
  });
}

// View document details
function viewDocument(docId) {
  const doc = allDocuments.find(d => d.id === docId);
  if (!doc) return;

  const modal = document.getElementById('viewModal');
  document.getElementById('viewName').textContent = doc.name;
  document.getElementById('viewCategory').textContent = doc.category;
  document.getElementById('viewSize').textContent = doc.size;
  document.getElementById('viewDate').textContent = new Date(doc.uploaded_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  document.getElementById('viewNotes').textContent = getDocumentNotes(doc.category);

  modal.style.display = 'flex';
}

// Close view modal
function closeViewModal() {
  document.getElementById('viewModal').style.display = 'none';
}

// Edit document (placeholder)
function editDocument(docId) {
  const doc = allDocuments.find(d => d.id === docId);
  if (!doc) return;

  alert(`Edit functionality coming soon!\n\nDocument: ${doc.name}\nCategory: ${doc.category}`);
}

// Delete document
async function deleteDocument(docId, docName) {
  if (!confirm(`Are you sure you want to delete "${docName}"?\n\nThis action cannot be undone.`)) {
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_KB}/api/kb/documents/${docId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const data = await response.json();
      if (response.status === 403) {
        alert(data.message || 'Cannot delete this document');
        return;
      }
      throw new Error('Delete failed');
    }

    alert('Document deleted successfully');

    // Reload documents
    await loadDocuments();

  } catch (error) {
    console.error('Error deleting document:', error);
    alert('Failed to delete document');
  }
}

// Hide loading
function hideLoading() {
  document.getElementById('loadingState').style.display = 'none';
}

// Show error
function showError(message) {
  alert(message);
}

// Utility function
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions globally accessible
window.showUploadModal = showUploadModal;
window.closeUploadModal = closeUploadModal;
window.uploadDocument = uploadDocument;
window.handleFileSelect = handleFileSelect;
window.removeFile = removeFile;
window.removeFileAtIndex = removeFileAtIndex;
window.viewDocument = viewDocument;
window.closeViewModal = closeViewModal;
window.editDocument = editDocument;
window.deleteDocument = deleteDocument;
window.sortTable = sortTable;
window.filterDocuments = filterDocuments;

} // End of double-loading protection
