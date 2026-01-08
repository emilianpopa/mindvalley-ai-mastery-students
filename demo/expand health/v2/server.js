/**
 * ExpandHealth V2 - Main Server
 * Express-based API server with PostgreSQL
 * Updated: 2025-12-30
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { auditMiddleware, attachAuditHelpers } = require('./middleware/auditMiddleware');

// Import database initialization
const { initDatabase } = require('./database/init');

// Import API routes
const authRoutes = require('./api/auth');
const clientsRoutes = require('./api/clients');
const labsRoutes = require('./api/labs');
const protocolsRoutes = require('./api/protocols');
const formsRoutes = require('./api/forms');
const kbRoutes = require('./api/kb');
const notesRoutes = require('./api/notes');
const chatRoutes = require('./api/chat');
const dashboardRoutes = require('./api/dashboard');
const adminRoutes = require('./api/admin');
const auditRoutes = require('./api/audit');
const scheduledMessagesRoutes = require('./api/scheduled-messages');
const integrationsRoutes = require('./api/integrations');
const appointmentsRoutes = require('./api/appointments');
const servicesRoutes = require('./api/services');
const staffRoutes = require('./api/staff');
const bookingPublicRoutes = require('./api/booking-public');
const bookingDashboardRoutes = require('./api/booking-dashboard');
const messagesRoutes = require('./api/messages');
const tasksRoutes = require('./api/tasks');
const classesRoutes = require('./api/classes');
const locationsRoutes = require('./api/locations');
const tagsRoutes = require('./api/tags');
const membershipsRoutes = require('./api/memberships');
const discountsRoutes = require('./api/discounts');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development (enable in production)
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://app.expandhealth.ai', 'https://app.expandhealth.io', 'https://expandhealth-ai-copilot-production.up.railway.app']
    : ['http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true
}));

// Redirect .io to .ai domain
// NOTE: Enable after DNS is configured for app.expandhealth.ai
// app.use((req, res, next) => {
//   if (req.hostname === 'app.expandhealth.io') {
//     return res.redirect(301, `https://app.expandhealth.ai${req.originalUrl}`);
//   }
//   next();
// });

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files with no-cache for JS/CSS to ensure updates are applied
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Request logging (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// HIPAA Audit logging middleware
// Attach audit helpers to all requests
app.use(attachAuditHelpers);
// Auto-log PHI access on API routes
app.use('/api', auditMiddleware);

// ============================================
// FEATURE FLAGS
// ============================================

// Feature flag endpoint - returns which features are enabled
app.get('/api/features', (req, res) => {
  res.json({
    enableBooking: process.env.ENABLE_BOOKING === 'true',
    enableSchedule: process.env.ENABLE_BOOKING === 'true',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// API ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/labs', labsRoutes);
app.use('/api/protocols', protocolsRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scheduled-messages', scheduledMessagesRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/book', bookingPublicRoutes);
app.use('/api/booking-dashboard', bookingDashboardRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/memberships', membershipsRoutes);
app.use('/api/discounts', discountsRoutes);

// Health check endpoint (no auth required) - for Railway health checks
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// SERVE HTML PAGES
// ============================================

// Login page (no auth required)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Protected pages (auth handled by frontend)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/clients', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'clients.html'));
});

// Customers CRM (Momence-style)
app.get('/customers', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'customers.html'));
});

app.get('/customers/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'customer-profile.html'));
});

app.get('/clients/new', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'client-new.html'));
});

// Unlinked submissions - must be before /clients/:id to avoid matching "unlinked" as an ID
app.get('/clients/unlinked', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'forms-unlinked.html'));
});

app.get('/clients/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'client-dashboard.html'));
});

app.get('/clients/:id/edit', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'client-edit.html'));
});

app.get('/forms', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'forms.html'));
});

// Redirect old URL for backwards compatibility
app.get('/forms/unlinked', (req, res) => {
  res.redirect('/clients/unlinked');
});

app.get('/forms/new', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'form-builder.html'));
});

app.get('/forms/:id/edit', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'form-builder.html'));
});

app.get('/forms/:id/submissions', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'form-responses.html'));
});

app.get('/forms/:id/responses', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'form-responses.html'));
});

// Submission detail view
app.get('/forms/:formId/submission/:submissionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'submission-detail.html'));
});

app.get('/forms/:id/fill', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'form-fill.html'));
});

// Public form access (no auth required)
app.get('/f/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'form-public.html'));
});

app.get('/labs', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'labs.html'));
});

app.get('/labs/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'lab-upload.html'));
});

app.get('/labs/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'lab-viewer.html'));
});

app.get('/protocols', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'protocols.html'));
});

app.get('/protocol-templates', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'protocol-templates.html'));
});

app.get('/protocol-templates/new', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'protocol-builder.html'));
});

app.get('/protocol-templates/:id/edit', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'protocol-builder.html'));
});

app.get('/protocols/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'protocol-viewer.html'));
});

app.get('/kb-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'kb-admin.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// User account settings
app.get('/account', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'account.html'));
});

app.get('/appointments', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'appointments.html'));
});

// Single Reservation (booking flow)
app.get('/single-reservation', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'single-reservation.html'));
});

// Service Booking (booking flow - after selecting a service)
app.get('/service-booking', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'service-booking.html'));
});

// Booking Add-ons (booking flow - after additional spots)
app.get('/booking-addons', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'booking-addons.html'));
});

// Booking Practitioner (booking flow - after add-ons)
app.get('/booking-practitioner', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'booking-practitioner.html'));
});

// Booking Time (booking flow - after practitioner selection)
app.get('/booking-time', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'booking-time.html'));
});

// Booking Confirm (booking flow - final step)
app.get('/booking-confirm', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'booking-confirm.html'));
});

// Multi Reservation (booking flow)
app.get('/multi-reservation', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'multi-reservation.html'));
});

// Booking Dashboard (Momence-style)
app.get('/schedule', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'booking-dashboard.html'));
});

// Inbox / Messaging
app.get('/inbox', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'inbox.html'));
});

// Point of Sale
app.get('/pos', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'pos.html'));
});

// Classes
app.get('/classes', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'classes.html'));
});

// Class Detail
app.get('/classes/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'class-detail.html'));
});

app.get('/class-templates', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'class-templates.html'));
});

// Create Class Template (must come before :id route)
app.get('/class-templates/new', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'class-template-create.html'));
});

// Class Template Detail
app.get('/class-templates/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'class-template-detail.html'));
});

app.get('/substitution-requests', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'substitution-requests.html'));
});

app.get('/substitution-report', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'substitution-report.html'));
});

app.get('/settings/practitioner-substitutions', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'practitioner-substitution-settings.html'));
});

// Discount codes
app.get('/discounts', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'discounts.html'));
});

app.get('/discounts/create', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'discount-create.html'));
});

// Reservations (Appointments list view)
app.get('/reservations', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'reservations.html'));
});

// Services (Appointment services management)
app.get('/services', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'appointment-services.html'));
});

// Appointment types settings
app.get('/appointment-types', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'appointment-types.html'));
});

// Marketing routes (placeholder pages - these will be implemented later)
app.get('/marketing/leads', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-leads.html'));
});

app.get('/marketing/webchat', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-webchat.html'));
});

app.get('/marketing/ads', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-ads.html'));
});

app.get('/marketing/sequences', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-sequences.html'));
});

app.get('/marketing/messages', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-messages.html'));
});

app.get('/marketing/templates', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-templates.html'));
});

app.get('/marketing-templates', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-templates.html'));
});

app.get('/marketing-templates/sms/create', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-templates.html'));
});

// Lead Management
app.get('/leads', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-leads.html'));
});

// Lead Detail
app.get('/leads/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'lead-detail.html'));
});

// Sequences
app.get('/sequences', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'sequences.html'));
});

app.get('/marketing/leads', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-leads.html'));
});

app.get('/marketing/referrals', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-referrals.html'));
});

app.get('/marketing/reviews', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-reviews.html'));
});

app.get('/marketing/spotfiller', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'marketing-spotfiller.html'));
});

// Studio set-up routes (placeholder pages)
app.get('/studio/practitioners', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-practitioners.html'));
});

app.get('/practitioner-detail', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'practitioner-detail.html'));
});

app.get('/service-detail', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'service-detail.html'));
});

app.get('/service-edit', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'service-edit.html'));
});

app.get('/studio/pay-rates', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-pay-rates.html'));
});

app.get('/studio/staff-tasks', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-staff-tasks.html'));
});

app.get('/studio/retail-products', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-retail-products.html'));
});

app.get('/studio/discount-codes', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-discount-codes.html'));
});

app.get('/studio/gift-cards', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-gift-cards.html'));
});

app.get('/studio/phone-number', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-phone-number.html'));
});

app.get('/studio/transactional-templates', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-transactional-templates.html'));
});

app.get('/studio/plugins', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-plugins.html'));
});

app.get('/studio/locations', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-locations.html'));
});

app.get('/memberships', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'memberships.html'));
});

app.get('/studio/franchise', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-franchise.html'));
});

app.get('/studio/spot-scheduling', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-spot-scheduling.html'));
});

app.get('/studio/tax-settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-tax-settings.html'));
});

app.get('/studio/class-settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'studio-class-settings.html'));
});

// Settings - Attendance Rules (Cancellation Policy)
app.get('/settings/attendance-rules', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'attendance-rules.html'));
});

// Public booking page (no auth required)
app.get('/book/:tenantSlug', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'booking-public.html'));
});

// Redirect /staff to admin users section
app.get('/staff', (req, res) => {
  res.redirect('/admin#users');
});

app.get('/chat-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'chat-test.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

// Start server with database initialization
async function startServer() {
  // Initialize database schema
  await initDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 ExpandHealth V2 Server');
    console.log('═'.repeat(50));
    console.log(`\n✅ Server running on port: ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log('\n📋 Available endpoints:');
    console.log('   - Login: /login');
    console.log('   - Dashboard: /');
    console.log('   - Clients: /clients');
    console.log('   - Labs: /labs');
    console.log('   - Protocols: /protocols');
    console.log('   - Knowledge Base: /kb-admin');
    console.log('   - Admin: /admin');
    console.log('   - Audit Logs: /api/audit (admin)');
    console.log('\n🔒 HIPAA audit logging: ENABLED');
    console.log('\n' + '═'.repeat(50) + '\n');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
// Trigger redeploy Wed, Dec 31, 2025  1:21:52 PM
