/**
 * AI Chat Widget
 * Sidebar chat assistant that appears on all pages
 */

// Prevent double-loading
if (window.chatWidgetLoaded) {
  console.log('Chat widget already loaded, skipping initialization');
} else {
  window.chatWidgetLoaded = true;

const API_BASE = window.location.origin;

class ChatWidget {
  constructor() {
    this.isOpen = false;
    this.conversationHistory = [];
    this.currentContext = {
      client_id: null,
      protocol_id: null,
      lab_id: null
    };
    this.contextData = {
      client: null,
      protocol: null,
      lab: null
    };

    this.init();
  }

  init() {
    // Create widget HTML
    this.createWidget();

    // Event listeners
    this.setupEventListeners();

    // Load initial suggestions
    this.loadSuggestions();

    // Check URL for context
    this.detectPageContext();
  }

  createWidget() {
    const widgetHTML = `
      <div class="chat-widget" id="chatWidget">
        <!-- Toggle Button -->
        <button class="chat-toggle" id="chatToggle" title="AI Assistant">
          💬
        </button>

        <!-- Chat Panel -->
        <div class="chat-panel" id="chatPanel">
          <!-- Header -->
          <div class="chat-header">
            <div class="chat-header-title">
              <div>
                <h3>✨ AI Assistant</h3>
                <div class="chat-status">
                  <span class="status-dot"></span>
                  <span>Online</span>
                </div>
              </div>
            </div>
            <div class="chat-header-actions">
              <button class="chat-action-btn" id="clearChatBtn" title="Clear chat">
                🗑️
              </button>
              <button class="chat-action-btn" id="closeChatBtn" title="Close">
                ✕
              </button>
            </div>
          </div>

          <!-- Context Bar -->
          <div class="chat-context-bar" id="chatContextBar"></div>

          <!-- Messages -->
          <div class="chat-messages" id="chatMessages">
            <div class="chat-welcome">
              <div class="chat-welcome-icon">🤖</div>
              <h4>Hi! I'm your AI assistant</h4>
              <p>I can help you with protocols, lab results, client care, and more. Ask me anything!</p>
            </div>
          </div>

          <!-- Suggestions -->
          <div class="chat-suggestions" id="chatSuggestions"></div>

          <!-- Input Area -->
          <div class="chat-input-area">
            <div class="chat-input-wrapper">
              <textarea
                id="chatInput"
                class="chat-input"
                placeholder="Ask me anything..."
                rows="1"
              ></textarea>
              <button class="chat-send-btn" id="chatSendBtn">
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);

    // Get elements
    this.elements = {
      toggle: document.getElementById('chatToggle'),
      panel: document.getElementById('chatPanel'),
      messages: document.getElementById('chatMessages'),
      input: document.getElementById('chatInput'),
      sendBtn: document.getElementById('chatSendBtn'),
      clearBtn: document.getElementById('clearChatBtn'),
      closeBtn: document.getElementById('closeChatBtn'),
      contextBar: document.getElementById('chatContextBar'),
      suggestions: document.getElementById('chatSuggestions')
    };
  }

  setupEventListeners() {
    // Toggle chat
    this.elements.toggle.addEventListener('click', () => this.toggleChat());
    this.elements.closeBtn.addEventListener('click', () => this.toggleChat());

    // Send message
    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());

    // Enter to send (Shift+Enter for new line)
    this.elements.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    this.elements.input.addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
    });

    // Clear chat
    this.elements.clearBtn.addEventListener('click', () => this.clearChat());
  }

  toggleChat() {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.elements.panel.classList.add('open');
      this.elements.toggle.classList.add('active');
      this.elements.toggle.innerHTML = '✕';
      this.elements.input.focus();

      // Load suggestions if empty
      if (this.conversationHistory.length === 0) {
        this.loadSuggestions();
      }
    } else {
      this.elements.panel.classList.remove('open');
      this.elements.toggle.classList.remove('active');
      this.elements.toggle.innerHTML = '💬';
    }
  }

  async sendMessage() {
    const message = this.elements.input.value.trim();
    if (!message) return;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.addMessage('assistant', '⚠️ Please log in to use the AI assistant.');
      return;
    }

    // Add user message
    this.addMessage('user', message);
    this.elements.input.value = '';
    this.elements.input.style.height = 'auto';

    // Add to history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    // Show loading
    this.showLoading();
    this.elements.sendBtn.disabled = true;

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          context: this.currentContext,
          conversationHistory: this.conversationHistory
        })
      });

      this.removeLoading();

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();

      // Add assistant message
      this.addMessage('assistant', data.message, data.context);

      // Add to history
      this.conversationHistory.push({
        role: 'assistant',
        content: data.message
      });

      // Reload suggestions
      this.loadSuggestions();

    } catch (error) {
      this.removeLoading();
      console.error('Error sending message:', error);
      this.addMessage('assistant', '❌ Sorry, I encountered an error. Please try again.');
    } finally {
      this.elements.sendBtn.disabled = false;
    }
  }

  addMessage(role, content, context = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;

    const avatar = role === 'user' ? '👤' : '🤖';
    const time = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });

    // Format content
    const formattedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n- /g, '<li>')
      .replace(/\n/g, '<br>');

    let htmlContent = formattedContent;
    if (!htmlContent.startsWith('<p>') && !htmlContent.startsWith('<li>')) {
      htmlContent = '<p>' + htmlContent + '</p>';
    }

    // Context badges
    let contextBadges = '';
    if (context && (context.client || context.protocol || context.lab || context.knowledgeBase)) {
      const badges = [];
      if (context.client) badges.push('📊 Client Data');
      if (context.protocol) badges.push('📋 Protocol');
      if (context.lab) badges.push('🔬 Lab Results');
      if (context.knowledgeBase) badges.push('📚 Knowledge Base');

      contextBadges = `
        <div class="chat-context-badges">
          ${badges.map(badge => `<span class="chat-context-badge">${badge}</span>`).join('')}
        </div>
      `;
    }

    messageDiv.innerHTML = `
      <div class="chat-message-avatar">${avatar}</div>
      <div>
        <div class="chat-message-content">
          ${htmlContent}
          ${contextBadges}
        </div>
        <div class="chat-message-time">${time}</div>
      </div>
    `;

    // Remove welcome message if it exists
    const welcome = this.elements.messages.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    this.elements.messages.appendChild(messageDiv);
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }

  showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message assistant';
    loadingDiv.id = 'chatLoadingIndicator';
    loadingDiv.innerHTML = `
      <div class="chat-message-avatar">🤖</div>
      <div class="chat-message-content">
        <div class="chat-loading">
          <div class="chat-loading-dot"></div>
          <div class="chat-loading-dot"></div>
          <div class="chat-loading-dot"></div>
        </div>
      </div>
    `;
    this.elements.messages.appendChild(loadingDiv);
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }

  removeLoading() {
    const loading = document.getElementById('chatLoadingIndicator');
    if (loading) loading.remove();
  }

  clearChat() {
    if (!confirm('Clear all messages?')) return;

    this.conversationHistory = [];
    this.elements.messages.innerHTML = `
      <div class="chat-welcome">
        <div class="chat-welcome-icon">🤖</div>
        <h4>Chat cleared!</h4>
        <p>How can I help you today?</p>
      </div>
    `;
    this.loadSuggestions();
  }

  async loadSuggestions() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      // Detect current page
      const path = window.location.pathname;
      let page = 'general';

      if (path.includes('/clients/')) page = 'client-profile';
      else if (path.includes('/protocols')) page = 'protocols';
      else if (path.includes('/labs')) page = 'labs';
      else if (path.includes('/protocol-templates')) page = 'protocol-templates';

      const response = await fetch(`${API_BASE}/api/chat/suggestions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          context: {
            page: page,
            ...this.currentContext
          }
        })
      });

      const data = await response.json();

      this.elements.suggestions.innerHTML = data.suggestions.map(s =>
        `<div class="suggestion-chip" data-suggestion="${s.replace(/"/g, '&quot;')}">${s}</div>`
      ).join('');

      // Add click listeners
      this.elements.suggestions.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          this.elements.input.value = chip.getAttribute('data-suggestion');
          this.elements.input.focus();
        });
      });

    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  }

  detectPageContext() {
    const path = window.location.pathname;

    // Client profile page
    const clientMatch = path.match(/\/clients\/(\d+)/);
    if (clientMatch) {
      this.setContext('client', parseInt(clientMatch[1]));
    }

    // Protocol page
    const protocolMatch = path.match(/\/protocols\/(\d+)/);
    if (protocolMatch) {
      this.setContext('protocol', parseInt(protocolMatch[1]));
    }

    // Lab page
    const labMatch = path.match(/\/labs\/(\d+)/);
    if (labMatch) {
      this.setContext('lab', parseInt(labMatch[1]));
    }
  }

  async setContext(type, id) {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      let endpoint, label;

      switch(type) {
        case 'client':
          this.currentContext.client_id = id;
          endpoint = `${API_BASE}/api/clients/${id}`;
          label = 'Client';
          break;
        case 'protocol':
          this.currentContext.protocol_id = id;
          endpoint = `${API_BASE}/api/protocols/${id}`;
          label = 'Protocol';
          break;
        case 'lab':
          this.currentContext.lab_id = id;
          endpoint = `${API_BASE}/api/labs/${id}`;
          label = 'Lab';
          break;
      }

      // Fetch data
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        this.contextData[type] = data;
        this.updateContextBar();
        this.loadSuggestions();
      }

    } catch (error) {
      console.error(`Error setting ${type} context:`, error);
    }
  }

  updateContextBar() {
    const chips = [];

    if (this.contextData.client) {
      const client = this.contextData.client;
      chips.push(`
        <div class="context-chip">
          👤 ${client.first_name} ${client.last_name}
          <button class="context-chip-remove" onclick="chatWidget.removeContext('client')">✕</button>
        </div>
      `);
    }

    if (this.contextData.protocol) {
      const protocol = this.contextData.protocol;
      chips.push(`
        <div class="context-chip">
          📋 ${protocol.template_name || 'Protocol'}
          <button class="context-chip-remove" onclick="chatWidget.removeContext('protocol')">✕</button>
        </div>
      `);
    }

    if (this.contextData.lab) {
      const lab = this.contextData.lab;
      chips.push(`
        <div class="context-chip">
          🔬 ${lab.title || 'Lab Result'}
          <button class="context-chip-remove" onclick="chatWidget.removeContext('lab')">✕</button>
        </div>
      `);
    }

    this.elements.contextBar.innerHTML = chips.join('');
    this.elements.contextBar.style.display = chips.length > 0 ? 'flex' : 'none';
  }

  removeContext(type) {
    this.currentContext[`${type}_id`] = null;
    this.contextData[type] = null;
    this.updateContextBar();
    this.loadSuggestions();
  }
}

// Initialize chat widget when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.chatWidget = new ChatWidget();
  });
} else {
  window.chatWidget = new ChatWidget();
}

} // End of double-loading protection
