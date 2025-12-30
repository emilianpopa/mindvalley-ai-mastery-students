const fs = require('fs');

// Full navigation with AI + Booking sections
const fullNav = `      <nav class="sidebar-nav">
        <div class="nav-section-title">AI</div>
        <a href="/" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Dashboard</span>
        </a>
        <a href="/clients" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span>Clients</span>
        </a>

        <div class="nav-section-title">AI ADMIN</div>
        <a href="/forms" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          <span>Forms</span>
        </a>
        <a href="/protocol-templates" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          <span>Protocol Templates</span>
        </a>
        <a href="/admin" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span>Admin Settings</span>
        </a>
        <a href="/kb-admin" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span>AI Knowledge Base</span>
        </a>

        <div class="nav-section booking-nav">
          <div class="nav-section-title">BOOKING</div>
          <a href="/schedule" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
            <span>Dashboard</span>
          </a>
          <a href="/inbox" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span>Inbox</span>
          </a>
          <a href="/pos" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            <span>Point of sale</span>
          </a>
          <div class="nav-dropdown">
            <div class="nav-dropdown-trigger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>Classes</span>
              <svg class="nav-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
            <div class="nav-dropdown-menu">
              <div class="nav-dropdown-header">CLASSES</div>
              <div class="nav-dropdown-section">SCHEDULING</div>
              <a href="/classes" class="nav-dropdown-item">Schedule</a>
              <a href="/class-templates" class="nav-dropdown-item">Class templates</a>
              <div class="nav-dropdown-section">PRACTITIONERS</div>
              <a href="/substitution-requests" class="nav-dropdown-item">Substitution requests</a>
            </div>
          </div>
          <a href="/appointments" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Appointments</span>
          </a>
          <a href="/community" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Community</span>
          </a>
          <a href="/on-demand" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>On-Demand</span>
          </a>
          <a href="/memberships" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Memberships</span>
          </a>
          <a href="/customers" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Customers</span>
          </a>
          <a href="/leads" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            <span>Marketing</span>
          </a>
          <a href="/analytics" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            <span>Analytics</span>
          </a>
          <a href="/financials" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            <span>Financials</span>
          </a>
        </div>

        <div class="nav-section booking-nav">
          <div class="nav-section-title">STUDIO SET-UP</div>
          <a href="/studio/practitioners" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Practitioners</span>
          </a>
          <a href="/services" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            <span>Services</span>
          </a>
          <a href="/studio/locations" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>Locations</span>
          </a>
        </div>
      </nav>`;

// ALL pages that should have full nav (AI + Booking)
const allPages = [
  // AI pages
  'views/dashboard.html',
  'views/clients.html',
  'views/forms.html',
  'views/protocol-templates.html',
  'views/admin.html',
  'views/kb-admin.html',
  'views/client-profile.html',
  'views/client-edit.html',
  'views/client-new.html',
  'views/form-builder.html',
  'views/form-responses.html',
  'views/protocol-builder.html',
  'views/protocols.html',
  'views/labs.html',
  'views/lab-upload.html',
  'views/lab-viewer.html',
  'views/submission-detail.html',
  'views/client-dashboard.html',
  // Booking pages
  'views/booking-dashboard.html',
  'views/appointments.html',
  'views/appointment-types.html',
  'views/classes.html',
  'views/class-detail.html',
  'views/class-templates.html',
  'views/customers.html',
  'views/customer-profile.html',
  'views/inbox.html',
  'views/marketing-leads.html',
  'views/marketing-templates.html',
  'views/lead-detail.html',
  'views/memberships.html',
  'views/pos.html',
  'views/reservations.html',
  'views/sequences.html',
  'views/services.html',
  'views/studio-practitioners.html',
  'views/studio-locations.html',
  'views/studio-class-settings.html',
  'views/studio-staff-tasks.html',
  'views/substitution-requests.html',
  'views/forms-unlinked.html'
];

// Active page mapping
const activePages = {
  // AI pages
  'views/dashboard.html': '/',
  'views/clients.html': '/clients',
  'views/client-profile.html': '/clients',
  'views/client-edit.html': '/clients',
  'views/client-new.html': '/clients',
  'views/client-dashboard.html': '/clients',
  'views/forms.html': '/forms',
  'views/form-builder.html': '/forms',
  'views/form-responses.html': '/forms',
  'views/submission-detail.html': '/forms',
  'views/protocol-templates.html': '/protocol-templates',
  'views/protocol-builder.html': '/protocol-templates',
  'views/protocols.html': '/protocol-templates',
  'views/admin.html': '/admin',
  'views/kb-admin.html': '/kb-admin',
  'views/labs.html': '/clients',
  'views/lab-upload.html': '/clients',
  'views/lab-viewer.html': '/clients',
  // Booking pages
  'views/booking-dashboard.html': '/schedule',
  'views/appointments.html': '/appointments',
  'views/appointment-types.html': '/appointments',
  'views/classes.html': '/classes',
  'views/class-detail.html': '/classes',
  'views/class-templates.html': '/class-templates',
  'views/customers.html': '/customers',
  'views/customer-profile.html': '/customers',
  'views/inbox.html': '/inbox',
  'views/marketing-leads.html': '/leads',
  'views/marketing-templates.html': '/leads',
  'views/lead-detail.html': '/leads',
  'views/memberships.html': '/memberships',
  'views/pos.html': '/pos',
  'views/reservations.html': '/schedule',
  'views/sequences.html': '/leads',
  'views/services.html': '/services',
  'views/studio-practitioners.html': '/studio/practitioners',
  'views/studio-locations.html': '/studio/locations',
  'views/studio-class-settings.html': '/classes',
  'views/studio-staff-tasks.html': '/studio/practitioners',
  'views/substitution-requests.html': '/substitution-requests',
  'views/forms-unlinked.html': '/forms'
};

allPages.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log('Skipping ' + file + ' (not found)');
    return;
  }

  let content = fs.readFileSync(file, 'utf8');
  let updated = false;

  // Find and replace the nav section
  const navStartPattern = /<nav class="sidebar-nav">[\s\S]*?<\/nav>/;

  if (navStartPattern.test(content)) {
    // Determine active page
    const activePath = activePages[file] || '/';
    let navWithActive = fullNav.replace(
      '<a href="' + activePath + '" class="nav-item">',
      '<a href="' + activePath + '" class="nav-item active">'
    );

    content = content.replace(navStartPattern, navWithActive);
    updated = true;
  } else {
    console.log('Nav not found in: ' + file);
  }

  // Add nav.js script if not already present
  if (!content.includes('/js/nav.js')) {
    // Add after feature-flags.js if present, otherwise after first <script> in head
    if (content.includes('/js/feature-flags.js')) {
      content = content.replace(
        '<script src="/js/feature-flags.js"></script>',
        '<script src="/js/feature-flags.js"></script>\n  <script src="/js/nav.js"></script>'
      );
      updated = true;
      console.log('Added nav.js to: ' + file);
    } else if (content.includes('</head>')) {
      content = content.replace(
        '</head>',
        '  <script src="/js/nav.js"></script>\n</head>'
      );
      updated = true;
      console.log('Added nav.js to: ' + file);
    }
  }

  if (updated) {
    fs.writeFileSync(file, content);
    console.log('Updated: ' + file);
  }
});

console.log('Done!');
