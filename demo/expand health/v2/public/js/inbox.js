/**
 * Inbox / Messaging Module
 * Handles customer communication through email, SMS, and in-app messaging
 */

(function() {
  // State
  let contacts = [];
  let selectedContact = null;
  let messages = [];
  let currentChannel = 'all';
  let currentComposeType = 'email';

  // DOM Elements
  const contactsList = document.getElementById('contactsList');
  const contactSearch = document.getElementById('contactSearch');
  const conversationHeader = document.getElementById('conversationHeader');
  const messagesContainer = document.getElementById('messagesContainer');
  const composeArea = document.getElementById('composeArea');
  const detailPanel = document.getElementById('detailPanel');
  const sendMessageBtn = document.getElementById('sendMessageBtn');

  // Avatar colors (expanded for more variety like Momence)
  const avatarColors = ['purple', 'blue', 'green', 'orange', 'pink', 'teal', 'indigo', 'red', 'cyan', 'amber', 'lime', 'rose'];

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    loadContacts();
    setupEventListeners();
  }

  function setupEventListeners() {
    // Contact search
    if (contactSearch) {
      contactSearch.addEventListener('input', filterContacts);
    }

    // Contact tabs
    document.querySelectorAll('.contacts-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.contacts-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        loadContacts(e.target.dataset.tab);
      });
    });

    // Channel tabs
    document.querySelectorAll('.channel-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.channel-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentChannel = e.target.dataset.channel;
        if (selectedContact) {
          loadMessages(selectedContact.id);
        }
      });
    });

    // Compose tabs
    document.querySelectorAll('.compose-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.compose-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentComposeType = e.target.dataset.type;
        updateComposeArea();
      });
    });

    // Toggle detail panel
    const toggleDetailBtn = document.getElementById('toggleDetailBtn');
    if (toggleDetailBtn) {
      toggleDetailBtn.addEventListener('click', toggleDetailPanel);
    }

    // Send message
    if (sendMessageBtn) {
      sendMessageBtn.addEventListener('click', sendMessage);
    }
  }

  async function loadContacts(tab = 'all') {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/clients?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load contacts');

      const data = await response.json();
      contacts = data.clients || [];

      // Add mock message data for demo
      contacts = contacts.map((contact, index) => ({
        ...contact,
        lastMessage: getRandomLastMessage(),
        lastMessageTime: getRandomTime(),
        unread: Math.random() > 0.7,
        avatarColor: avatarColors[index % avatarColors.length]
      }));

      // Sort by last message time
      contacts.sort((a, b) => {
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
        return 0;
      });

      renderContacts();
    } catch (error) {
      console.error('Error loading contacts:', error);
      // Show demo contacts if API fails
      contacts = getDemoContacts();
      renderContacts();
    }
  }

  function renderContacts() {
    if (!contactsList) return;

    contactsList.innerHTML = contacts.map(contact => `
      <div class="contact-item ${contact.unread ? 'unread' : ''} ${selectedContact?.id === contact.id ? 'active' : ''}"
           data-id="${contact.id}">
        <div class="contact-avatar ${contact.avatarColor}">
          ${getInitials(contact.first_name, contact.last_name)}
        </div>
        <div class="contact-content">
          <div class="contact-header">
            <span class="contact-name">${contact.first_name} ${contact.last_name}</span>
            <span class="contact-time">${contact.lastMessageTime}</span>
          </div>
          <div class="contact-preview">${escapeHtml(contact.lastMessage || '')}</div>
        </div>
      </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.contact-item').forEach(item => {
      item.addEventListener('click', () => selectContact(item.dataset.id));
    });
  }

  function filterContacts() {
    const query = contactSearch.value.toLowerCase();
    const filtered = contacts.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
      (c.email && c.email.toLowerCase().includes(query))
    );

    contactsList.innerHTML = filtered.map(contact => `
      <div class="contact-item ${contact.unread ? 'unread' : ''} ${selectedContact?.id === contact.id ? 'active' : ''}"
           data-id="${contact.id}">
        <div class="contact-avatar ${contact.avatarColor}">
          ${getInitials(contact.first_name, contact.last_name)}
        </div>
        <div class="contact-content">
          <div class="contact-header">
            <span class="contact-name">${contact.first_name} ${contact.last_name}</span>
            <span class="contact-time">${contact.lastMessageTime}</span>
          </div>
          <div class="contact-preview">${escapeHtml(contact.lastMessage || '')}</div>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.contact-item').forEach(item => {
      item.addEventListener('click', () => selectContact(item.dataset.id));
    });
  }

  function selectContact(contactId) {
    selectedContact = contacts.find(c => c.id == contactId);
    if (!selectedContact) return;

    // Update UI
    document.querySelectorAll('.contact-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id == contactId);
      if (item.dataset.id == contactId) {
        item.classList.remove('unread');
      }
    });

    // Mark as read
    const contact = contacts.find(c => c.id == contactId);
    if (contact) contact.unread = false;

    // Update header
    updateConversationHeader();

    // Load messages
    loadMessages(contactId);

    // Show compose area
    if (composeArea) {
      composeArea.style.display = 'block';
    }

    // Update detail panel
    updateDetailPanel();
  }

  function updateConversationHeader() {
    if (!selectedContact) return;

    const avatar = document.getElementById('selectedContactAvatar');
    const name = document.getElementById('selectedContactName');

    if (avatar) {
      avatar.innerHTML = `<span>${getInitials(selectedContact.first_name, selectedContact.last_name)}</span>`;
      avatar.className = `contact-avatar ${selectedContact.avatarColor}`;
    }

    if (name) {
      name.textContent = `${selectedContact.first_name} ${selectedContact.last_name}`;
    }
  }

  async function loadMessages(contactId) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/messages/client/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      messages = data.messages || [];
      renderMessages();
    } catch (error) {
      console.error('Error loading messages:', error);
      // Show demo messages
      messages = getDemoMessages(contactId);
      renderMessages();
    }
  }

  function renderMessages() {
    if (!messagesContainer) return;

    if (messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
          </svg>
          <p>No messages yet. Start a conversation!</p>
        </div>
      `;
      return;
    }

    // Filter by channel
    let filtered = messages;
    if (currentChannel !== 'all') {
      filtered = messages.filter(m => m.channel === currentChannel);
    }

    // Group by date
    const grouped = groupMessagesByDate(filtered);

    messagesContainer.innerHTML = Object.entries(grouped).map(([date, msgs]) => `
      <div class="message-date-group">
        <div class="message-date">
          <span>${date}</span>
        </div>
        ${msgs.map(msg => renderMessage(msg)).join('')}
      </div>
    `).join('');

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function renderMessage(msg) {
    const isSent = msg.direction === 'outbound';
    const channelIcon = getChannelIcon(msg.channel);

    return `
      <div class="message ${isSent ? 'sent' : 'received'}">
        <div class="message-bubble">
          ${msg.channel === 'email' && msg.to_email ? `
            <div class="message-header">
              <div class="message-to">To: <strong>${msg.to_email}</strong></div>
            </div>
            ${msg.subject ? `<div class="message-subject">${msg.subject}</div>` : ''}
          ` : ''}
          <div class="message-content">
            ${formatMessageContent(msg.content)}
          </div>
          ${msg.content && msg.content.length > 200 ? `
            <button class="show-more-btn" onclick="toggleMessageExpand(this)">
              <svg viewBox="0 0 24 24" fill="none" width="12" height="12">
                <polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Show more
            </button>
          ` : ''}
          <div class="message-footer">
            <span class="message-channel">${channelIcon} ${msg.channel || 'email'}</span>
            <span class="message-time">Sent · ${formatTime(msg.sent_at)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function updateComposeArea() {
    const subjectField = document.getElementById('composeSubject');
    if (subjectField) {
      subjectField.style.display = currentComposeType === 'email' ? 'block' : 'none';
    }
  }

  async function sendMessage() {
    if (!selectedContact) return;

    const body = document.getElementById('messageBody');
    const subject = document.getElementById('emailSubject');

    if (!body || !body.value.trim()) {
      alert('Please enter a message');
      return;
    }

    const message = {
      client_id: selectedContact.id,
      channel: currentComposeType,
      direction: 'outbound',
      content: body.value.trim(),
      subject: currentComposeType === 'email' ? (subject?.value || '') : null,
      to_email: selectedContact.email
    };

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) throw new Error('Failed to send message');

      // Clear form
      body.value = '';
      if (subject) subject.value = '';

      // Add to local messages and re-render
      messages.push({
        ...message,
        id: Date.now(),
        sent_at: new Date().toISOString()
      });
      renderMessages();

    } catch (error) {
      console.error('Error sending message:', error);
      // For demo, add locally anyway
      messages.push({
        ...message,
        id: Date.now(),
        sent_at: new Date().toISOString()
      });
      renderMessages();
      body.value = '';
      if (subject) subject.value = '';
    }
  }

  function updateDetailPanel() {
    if (!selectedContact || !detailPanel) return;

    document.getElementById('detailAvatar').innerHTML =
      `<span>${getInitials(selectedContact.first_name, selectedContact.last_name)}</span>`;
    document.getElementById('detailAvatar').className = `detail-avatar ${selectedContact.avatarColor}`;

    document.getElementById('detailName').textContent =
      `${selectedContact.first_name} ${selectedContact.last_name}`;

    document.getElementById('detailPhone').textContent =
      selectedContact.phone || 'No phone number';

    document.getElementById('detailLeadStage').textContent =
      selectedContact.lead_stage || 'No stage';

    document.getElementById('detailSalesJourney').textContent =
      selectedContact.sales_journey || 'No active sales journey';

    document.getElementById('detailNextVisit').textContent =
      selectedContact.next_visit || 'No scheduled visit';

    document.getElementById('detailMemberships').textContent =
      selectedContact.memberships || 'No active memberships';

    document.getElementById('detailMoneyCredits').textContent =
      `ZAR ${(selectedContact.money_credits || 0).toFixed(2)}`;

    document.getElementById('detailAppointmentCredits').textContent =
      selectedContact.appointment_credits || '0';

    const lastVisitEl = document.getElementById('detailLastVisit');
    if (selectedContact.last_visit) {
      lastVisitEl.innerHTML = `
        <span class="visit-type">${selectedContact.last_visit.type}</span>
        <span class="visit-date">${selectedContact.last_visit.date}</span>
      `;
    } else {
      lastVisitEl.innerHTML = '<span class="visit-type">No visits yet</span>';
    }

    const tagsEl = document.getElementById('detailTags');
    if (selectedContact.tags && selectedContact.tags.length > 0) {
      tagsEl.innerHTML = selectedContact.tags.map(t => `<span class="tag">${t}</span>`).join('');
    } else {
      tagsEl.innerHTML = '<span class="tag">No tags</span>';
    }

    document.getElementById('viewProfileLink').href = `/clients/${selectedContact.id}`;
  }

  function toggleDetailPanel() {
    if (detailPanel) {
      detailPanel.classList.toggle('hidden');
      detailPanel.classList.toggle('visible');
    }
  }

  // Helper functions
  function getInitials(firstName, lastName) {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getRandomLastMessage() {
    const messages = [
      'Final chance: Build on your holi...',
      'Schedule change times. Octobe...',
      'Hi there team, I have to take a fri...',
      'Thank-you for your reply! I a...',
      'Soul Collage confirmation resend',
      'You\'re in! Confirmation for The...',
      'Appointment reminder for tomorrow',
      'Your lab results are ready',
      'Protocol update: Week 3 check-in'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  function getRandomTime() {
    const times = ['1w', '9w', '34w', '46w', '1y', '2d', '3h', '5m'];
    return times[Math.floor(Math.random() * times.length)];
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function formatMessageContent(content) {
    if (!content) return '';
    // Convert newlines to paragraphs
    return content.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
  }

  function groupMessagesByDate(messages) {
    const groups = {};
    messages.forEach(msg => {
      const date = new Date(msg.sent_at || Date.now());
      const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    });
    return groups;
  }

  function getChannelIcon(channel) {
    const icons = {
      email: '<svg viewBox="0 0 24 24" fill="none" width="12" height="12"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2"/></svg>',
      sms: '<svg viewBox="0 0 24 24" fill="none" width="12" height="12"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/></svg>',
      'in-app': '<svg viewBox="0 0 24 24" fill="none" width="12" height="12"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" stroke="currentColor" stroke-width="2"/></svg>'
    };
    return icons[channel] || icons.email;
  }

  // Demo data
  function getDemoContacts() {
    return [
      { id: 1, first_name: 'Momence', last_name: '', email: 'support@momence.com', lastMessage: 'Final chance: Build on your holi...', lastMessageTime: '1w', unread: true, avatarColor: 'purple' },
      { id: 2, first_name: 'Jessica', last_name: 'Roelofse', email: 'jessica@example.com', lastMessage: 'Schedule change times. Octobe...', lastMessageTime: '9w', unread: false, avatarColor: 'indigo' },
      { id: 3, first_name: 'Michelle', last_name: 'Korevaar', email: 'michelle@example.com', lastMessage: 'Hi there team, I have to take a fri...', lastMessageTime: '34w', unread: false, avatarColor: 'teal' },
      { id: 4, first_name: 'Alexandra', last_name: 'Boxshall-Smith', email: 'alex@example.com', lastMessage: 'Thank-you for your reply! I a...', lastMessageTime: '46w', unread: false, avatarColor: 'orange' },
      { id: 5, first_name: 'Angela', last_name: 'Landsdell', email: 'angela@example.com', lastMessage: 'Soul Collage confirmation resend', lastMessageTime: '1y', unread: false, avatarColor: 'pink' },
      { id: 6, first_name: 'Leigh', last_name: 'Vecencie', email: 'leigh@example.com', lastMessage: 'You\'re in! Confirmation for The...', lastMessageTime: '1y', unread: false, avatarColor: 'green' },
      { id: 7, first_name: 'Carmen', last_name: 'Heunis', email: 'carmen@example.com', lastMessage: 'You\'re in! Confirmation for The...', lastMessageTime: '1y', unread: false, avatarColor: 'blue' },
      { id: 8, first_name: 'Sarah', last_name: 'Oliver', email: 'sarah@example.com', lastMessage: 'You\'re in! Confirmation for The...', lastMessageTime: '1y', unread: false, avatarColor: 'red' }
    ];
  }

  function getDemoMessages(contactId) {
    const contact = contacts.find(c => c.id == contactId);
    if (!contact) return [];

    return [
      {
        id: 1,
        client_id: contactId,
        channel: 'email',
        direction: 'outbound',
        to_email: contact.email,
        subject: 'Schedule change times. October 20- October 24 2025',
        content: `We are confirming your booking cancellation for Friday 10 October. We have provisionally moved your booking on 16th of October to 1.15pm.\n\nThank you!\n\nExpand Health Team.`,
        sent_at: '2025-10-06T15:56:00Z'
      },
      {
        id: 2,
        client_id: contactId,
        channel: 'email',
        direction: 'outbound',
        to_email: contact.email,
        subject: 'Schedule change times. October 20- October 24 2025',
        content: `Good Afternoon ${contact.first_name},\n\nKindly find the adjusted schedule start times for next week's sessions.\n\nMonday: 1pm\nTuesday: None\nWednesday: 1pm\nThursday: 1pm`,
        sent_at: '2025-10-16T13:27:00Z'
      }
    ];
  }

  // Expose for external use
  window.toggleMessageExpand = function(btn) {
    const bubble = btn.closest('.message-bubble');
    const content = bubble.querySelector('.message-content');
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" width="12" height="12">
          <polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Show more
      `;
    } else {
      content.style.maxHeight = 'none';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" width="12" height="12">
          <polyline points="18 15 12 9 6 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Show less
      `;
    }
  };

})();
