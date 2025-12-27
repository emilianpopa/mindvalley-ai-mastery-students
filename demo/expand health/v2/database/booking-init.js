/**
 * Booking System Database Initialization
 * Creates tables for appointments, services, staff availability, etc.
 */

const db = require('./db');

/**
 * Initialize service types/categories table
 */
async function initServiceTypes() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS service_types (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      duration_minutes INTEGER DEFAULT 60,
      price DECIMAL(10, 2),
      color VARCHAR(7) DEFAULT '#3B82F6',
      is_active BOOLEAN DEFAULT true,
      requires_staff BOOLEAN DEFAULT true,
      max_attendees INTEGER DEFAULT 1,
      buffer_before_minutes INTEGER DEFAULT 0,
      buffer_after_minutes INTEGER DEFAULT 0,
      cancellation_policy TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_service_types_tenant ON service_types(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_service_types_active ON service_types(is_active) WHERE is_active = true;
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ service_types table ready');

    await db.query(createIndexesSQL);
    console.log('✅ service_types indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize service_types:', error.message);
    return false;
  }
}

/**
 * Initialize staff/practitioners table
 */
async function initStaff() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      title VARCHAR(100),
      bio TEXT,
      photo_url TEXT,
      color VARCHAR(7) DEFAULT '#10B981',
      is_active BOOLEAN DEFAULT true,
      accepts_bookings BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_staff_user ON staff(user_id);
    CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active) WHERE is_active = true;
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ staff table ready');

    await db.query(createIndexesSQL);
    console.log('✅ staff indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize staff:', error.message);
    return false;
  }
}

/**
 * Initialize staff-service mapping (which staff can perform which services)
 */
async function initStaffServices() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS staff_services (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
      service_type_id INTEGER REFERENCES service_types(id) ON DELETE CASCADE,
      custom_duration_minutes INTEGER,
      custom_price DECIMAL(10, 2),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT staff_services_unique UNIQUE (staff_id, service_type_id)
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_staff_services_staff ON staff_services(staff_id);
    CREATE INDEX IF NOT EXISTS idx_staff_services_service ON staff_services(service_type_id);
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ staff_services table ready');

    await db.query(createIndexesSQL);
    console.log('✅ staff_services indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize staff_services:', error.message);
    return false;
  }
}

/**
 * Initialize staff availability/schedule table
 */
async function initStaffAvailability() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS staff_availability (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT staff_availability_time_check CHECK (start_time < end_time)
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_staff_availability_staff ON staff_availability(staff_id);
    CREATE INDEX IF NOT EXISTS idx_staff_availability_day ON staff_availability(day_of_week);
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ staff_availability table ready');

    await db.query(createIndexesSQL);
    console.log('✅ staff_availability indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize staff_availability:', error.message);
    return false;
  }
}

/**
 * Initialize staff time-off/blocked time table
 */
async function initStaffTimeOff() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS staff_time_off (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
      start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
      end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
      reason VARCHAR(255),
      is_all_day BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT staff_time_off_time_check CHECK (start_datetime < end_datetime)
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff ON staff_time_off(staff_id);
    CREATE INDEX IF NOT EXISTS idx_staff_time_off_dates ON staff_time_off(start_datetime, end_datetime);
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ staff_time_off table ready');

    await db.query(createIndexesSQL);
    console.log('✅ staff_time_off indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize staff_time_off:', error.message);
    return false;
  }
}

/**
 * Initialize appointments table
 */
async function initAppointments() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
      service_type_id INTEGER REFERENCES service_types(id) ON DELETE SET NULL,

      -- Appointment details
      title VARCHAR(255),
      start_time TIMESTAMP WITH TIME ZONE NOT NULL,
      end_time TIMESTAMP WITH TIME ZONE NOT NULL,

      -- Status tracking
      status VARCHAR(30) DEFAULT 'scheduled',

      -- Location
      location_type VARCHAR(30) DEFAULT 'in_person',
      location_address TEXT,
      video_link TEXT,

      -- Pricing
      price DECIMAL(10, 2),
      payment_status VARCHAR(30) DEFAULT 'unpaid',
      payment_method VARCHAR(50),
      payment_reference VARCHAR(255),

      -- Notes
      client_notes TEXT,
      staff_notes TEXT,
      internal_notes TEXT,

      -- Reminders
      reminder_sent BOOLEAN DEFAULT false,
      reminder_sent_at TIMESTAMP WITH TIME ZONE,

      -- Cancellation
      cancelled_at TIMESTAMP WITH TIME ZONE,
      cancelled_by VARCHAR(50),
      cancellation_reason TEXT,

      -- Booking source
      booked_by VARCHAR(50) DEFAULT 'staff',
      booking_source VARCHAR(50) DEFAULT 'admin',

      -- Check-in
      checked_in_at TIMESTAMP WITH TIME ZONE,
      no_show BOOLEAN DEFAULT false,

      -- Metadata
      external_id VARCHAR(255),
      external_platform VARCHAR(50),
      external_data JSONB DEFAULT '{}',

      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

      CONSTRAINT appointments_time_check CHECK (start_time < end_time),
      CONSTRAINT appointments_status_check CHECK (
        status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')
      ),
      CONSTRAINT appointments_location_check CHECK (
        location_type IN ('in_person', 'video', 'phone', 'other')
      ),
      CONSTRAINT appointments_payment_check CHECK (
        payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'partial')
      ),
      CONSTRAINT appointments_booked_by_check CHECK (
        booked_by IN ('staff', 'client', 'system')
      )
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments(staff_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_service ON appointments(service_type_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time);
    CREATE INDEX IF NOT EXISTS idx_appointments_date_range ON appointments(start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_appointments_upcoming ON appointments(start_time)
      WHERE status IN ('scheduled', 'confirmed');
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ appointments table ready');

    await db.query(createIndexesSQL);
    console.log('✅ appointments indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize appointments:', error.message);
    return false;
  }
}

/**
 * Initialize recurring appointments table
 */
async function initRecurringAppointments() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS recurring_appointments (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
      service_type_id INTEGER REFERENCES service_types(id) ON DELETE SET NULL,

      -- Recurrence pattern
      recurrence_type VARCHAR(20) NOT NULL,
      recurrence_interval INTEGER DEFAULT 1,
      day_of_week INTEGER,
      day_of_month INTEGER,

      -- Time slot
      start_time TIME NOT NULL,
      duration_minutes INTEGER NOT NULL,

      -- Validity period
      start_date DATE NOT NULL,
      end_date DATE,
      max_occurrences INTEGER,

      -- Status
      is_active BOOLEAN DEFAULT true,

      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

      CONSTRAINT recurring_type_check CHECK (
        recurrence_type IN ('daily', 'weekly', 'biweekly', 'monthly')
      )
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_recurring_appointments_tenant ON recurring_appointments(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_appointments_client ON recurring_appointments(client_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_appointments_staff ON recurring_appointments(staff_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_appointments_active ON recurring_appointments(is_active) WHERE is_active = true;
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ recurring_appointments table ready');

    await db.query(createIndexesSQL);
    console.log('✅ recurring_appointments indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize recurring_appointments:', error.message);
    return false;
  }
}

/**
 * Initialize booking settings table (per-tenant configuration)
 */
async function initBookingSettings() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS booking_settings (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,

      -- General settings
      booking_enabled BOOLEAN DEFAULT true,
      require_payment BOOLEAN DEFAULT false,
      allow_guest_booking BOOLEAN DEFAULT false,

      -- Time restrictions
      min_booking_notice_hours INTEGER DEFAULT 24,
      max_booking_advance_days INTEGER DEFAULT 60,

      -- Cancellation policy
      allow_cancellation BOOLEAN DEFAULT true,
      cancellation_notice_hours INTEGER DEFAULT 24,
      cancellation_fee_percent DECIMAL(5, 2) DEFAULT 0,

      -- Reminders
      send_confirmation_email BOOLEAN DEFAULT true,
      send_reminder_email BOOLEAN DEFAULT true,
      reminder_hours_before INTEGER DEFAULT 24,
      send_sms_reminders BOOLEAN DEFAULT false,

      -- Display settings
      show_staff_selection BOOLEAN DEFAULT true,
      show_prices BOOLEAN DEFAULT true,
      default_timezone VARCHAR(50) DEFAULT 'America/New_York',

      -- Booking page customization
      booking_page_title VARCHAR(255),
      booking_page_description TEXT,
      booking_page_logo_url TEXT,
      booking_page_color VARCHAR(7) DEFAULT '#3B82F6',

      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ booking_settings table ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize booking_settings:', error.message);
    return false;
  }
}

/**
 * Initialize appointment reminders log
 */
async function initAppointmentReminders() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS appointment_reminders (
      id SERIAL PRIMARY KEY,
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
      reminder_type VARCHAR(30) NOT NULL,
      channel VARCHAR(20) NOT NULL,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'sent',
      error_message TEXT,

      CONSTRAINT reminder_type_check CHECK (
        reminder_type IN ('confirmation', 'reminder_24h', 'reminder_1h', 'followup', 'cancellation')
      ),
      CONSTRAINT reminder_channel_check CHECK (
        channel IN ('email', 'sms', 'whatsapp')
      )
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment ON appointment_reminders(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_appointment_reminders_type ON appointment_reminders(reminder_type);
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ appointment_reminders table ready');

    await db.query(createIndexesSQL);
    console.log('✅ appointment_reminders indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize appointment_reminders:', error.message);
    return false;
  }
}

/**
 * Initialize locations table (for multi-location businesses)
 */
async function initLocations() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      zip VARCHAR(20),
      country VARCHAR(100) DEFAULT 'USA',
      phone VARCHAR(50),
      email VARCHAR(255),
      timezone VARCHAR(50) DEFAULT 'America/New_York',
      is_active BOOLEAN DEFAULT true,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(is_active) WHERE is_active = true;
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ locations table ready');

    await db.query(createIndexesSQL);
    console.log('✅ locations indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize locations:', error.message);
    return false;
  }
}

/**
 * Initialize class templates table
 */
async function initClassTemplates() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS class_templates (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      class_kind VARCHAR(50) DEFAULT 'class' CHECK (class_kind IN ('class', 'workshop', 'course', 'retreat', 'private_class', 'semester')),
      duration_minutes INTEGER DEFAULT 60,
      max_participants INTEGER,
      price DECIMAL(10, 2),
      color VARCHAR(7) DEFAULT '#6366F1',
      image_url TEXT,
      location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
      default_staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
      enable_waitlist BOOLEAN DEFAULT false,
      enable_spot_selection BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_class_templates_tenant ON class_templates(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_class_templates_kind ON class_templates(class_kind);
    CREATE INDEX IF NOT EXISTS idx_class_templates_active ON class_templates(is_active) WHERE is_active = true;
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ class_templates table ready');

    await db.query(createIndexesSQL);
    console.log('✅ class_templates indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize class_templates:', error.message);
    return false;
  }
}

/**
 * Initialize scheduled classes table
 */
async function initScheduledClasses() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS scheduled_classes (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      template_id INTEGER REFERENCES class_templates(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      class_kind VARCHAR(50) DEFAULT 'class' CHECK (class_kind IN ('class', 'workshop', 'course', 'retreat', 'private_class', 'semester')),
      class_type VARCHAR(30) DEFAULT 'one_off' CHECK (class_type IN ('one_off', 'from_template', 'recurring')),
      start_time TIMESTAMP WITH TIME ZONE NOT NULL,
      end_time TIMESTAMP WITH TIME ZONE NOT NULL,
      duration_minutes INTEGER DEFAULT 60,
      max_participants INTEGER,
      current_participants INTEGER DEFAULT 0,
      price DECIMAL(10, 2),
      color VARCHAR(7) DEFAULT '#6366F1',
      image_url TEXT,
      staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
      location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
      enable_waitlist BOOLEAN DEFAULT false,
      waitlist_count INTEGER DEFAULT 0,
      enable_spot_selection BOOLEAN DEFAULT false,
      status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
      recurring_rule TEXT,
      recurring_parent_id INTEGER REFERENCES scheduled_classes(id) ON DELETE CASCADE,
      detached_from_template BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_scheduled_classes_tenant ON scheduled_classes(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_classes_template ON scheduled_classes(template_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_classes_staff ON scheduled_classes(staff_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_classes_location ON scheduled_classes(location_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_classes_start ON scheduled_classes(start_time);
    CREATE INDEX IF NOT EXISTS idx_scheduled_classes_status ON scheduled_classes(status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_classes_recurring ON scheduled_classes(recurring_parent_id);
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ scheduled_classes table ready');

    await db.query(createIndexesSQL);
    console.log('✅ scheduled_classes indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize scheduled_classes:', error.message);
    return false;
  }
}

/**
 * Initialize class registrations table (who is attending which class)
 */
async function initClassRegistrations() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS class_registrations (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      class_id INTEGER REFERENCES scheduled_classes(id) ON DELETE CASCADE,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      status VARCHAR(30) DEFAULT 'registered' CHECK (status IN ('registered', 'waitlisted', 'checked_in', 'no_show', 'cancelled')),
      spot_number INTEGER,
      payment_status VARCHAR(30) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'partial')),
      payment_amount DECIMAL(10, 2),
      registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      checked_in_at TIMESTAMP WITH TIME ZONE,
      cancelled_at TIMESTAMP WITH TIME ZONE,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT class_registrations_unique UNIQUE (class_id, client_id)
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_class_registrations_tenant ON class_registrations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_class_registrations_class ON class_registrations(class_id);
    CREATE INDEX IF NOT EXISTS idx_class_registrations_client ON class_registrations(client_id);
    CREATE INDEX IF NOT EXISTS idx_class_registrations_status ON class_registrations(status);
  `;

  try {
    await db.query(createTableSQL);
    console.log('✅ class_registrations table ready');

    await db.query(createIndexesSQL);
    console.log('✅ class_registrations indexes ready');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize class_registrations:', error.message);
    return false;
  }
}

/**
 * Seed default staff members for ExpandHealth
 */
async function seedDefaultStaff() {
  // Check if staff already exists
  const existingStaff = await db.query('SELECT COUNT(*) FROM staff');
  if (parseInt(existingStaff.rows[0].count) > 0) {
    console.log('✅ Staff already seeded, skipping...');
    return true;
  }

  // Get the default tenant
  const tenantResult = await db.query('SELECT id FROM tenants LIMIT 1');
  if (tenantResult.rows.length === 0) {
    console.log('⚠️ No tenant found, skipping staff seed');
    return true;
  }
  const tenantId = tenantResult.rows[0].id;

  const staffMembers = [
    {
      first_name: 'Jack',
      last_name: 'Memory Hardland',
      email: 'jack@expandhealth.co.za',
      title: 'Founder & CEO',
      color: '#10B981'
    },
    {
      first_name: 'Avela',
      last_name: 'Jafta',
      email: 'avela.jafta@expandhealth.co.za',
      title: 'Wellness Coordinator',
      color: '#F59E0B'
    },
    {
      first_name: 'Maryke',
      last_name: 'Gallagher',
      email: 'maryke.gallagher@expandhealth.co.za',
      title: 'Nutritionist',
      color: '#EF4444'
    },
    {
      first_name: 'Dr Daniel',
      last_name: 'Blanckenberg',
      email: 'daniel.blanckenberg@expandhealth.co.za',
      title: 'Medical Director',
      color: '#14B8A6'
    },
    {
      first_name: 'Dr Melody',
      last_name: 'Fourie',
      email: 'melody@nourishedwellbeing.co.za',
      title: 'Wellness Doctor',
      color: '#6366F1'
    },
    {
      first_name: 'Maryke',
      last_name: 'Korsten',
      email: 'maryke.korsten@expandhealth.co.za',
      title: 'Marketing & Sales',
      color: '#EC4899'
    },
    {
      first_name: 'Sheeham',
      last_name: 'Jacobs',
      email: 'sheeham.jacobs@expandhealth.co.za',
      title: 'Operations',
      color: '#8B5CF6'
    }
  ];

  try {
    for (const staff of staffMembers) {
      await db.query(`
        INSERT INTO staff (tenant_id, first_name, last_name, email, title, color, is_active, accepts_bookings)
        VALUES ($1, $2, $3, $4, $5, $6, true, true)
      `, [tenantId, staff.first_name, staff.last_name, staff.email, staff.title, staff.color]);
    }
    console.log(`✅ Seeded ${staffMembers.length} staff members`);
    return true;
  } catch (error) {
    console.error('❌ Failed to seed staff:', error.message);
    return false;
  }
}

/**
 * Run all booking database initializations
 */
async function initBookingDatabase() {
  console.log('\n🔄 Initializing booking system schema...');

  try {
    // Initialize tables in order (respecting foreign key dependencies)
    await initServiceTypes();
    await initStaff();
    await initStaffServices();
    await initStaffAvailability();
    await initStaffTimeOff();
    await initLocations();
    await initAppointments();
    await initRecurringAppointments();
    await initBookingSettings();
    await initAppointmentReminders();

    // Initialize class management tables
    await initClassTemplates();
    await initScheduledClasses();
    await initClassRegistrations();

    // Seed default staff members
    await seedDefaultStaff();

    console.log('✅ Booking system initialization complete\n');
    return true;
  } catch (error) {
    console.error('❌ Booking system initialization failed:', error.message);
    return false;
  }
}

module.exports = {
  initBookingDatabase,
  initServiceTypes,
  initStaff,
  initStaffServices,
  initStaffAvailability,
  initStaffTimeOff,
  initLocations,
  initAppointments,
  initRecurringAppointments,
  initBookingSettings,
  initAppointmentReminders,
  initClassTemplates,
  initScheduledClasses,
  initClassRegistrations,
  seedDefaultStaff
};
