-- Migration: Enhanced Service Pricing
-- Adds credit pricing, add-ons, and staff-specific pricing to match Momence structure

-- ============================================
-- UPDATE SERVICE_TYPES with credit pricing
-- ============================================
ALTER TABLE service_types
ADD COLUMN IF NOT EXISTS price_in_credits INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_customers INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS buffer_before_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS buffer_after_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS momence_id VARCHAR(50);

-- Add index for Momence ID lookup
CREATE INDEX IF NOT EXISTS idx_service_types_momence_id ON service_types(momence_id);

-- ============================================
-- SERVICE ADD-ONS
-- ============================================
CREATE TABLE IF NOT EXISTS service_addons (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_type_id INTEGER NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_addons_tenant ON service_addons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_addons_service ON service_addons(service_type_id);
CREATE INDEX IF NOT EXISTS idx_service_addons_active ON service_addons(is_active);

-- ============================================
-- STAFF SERVICE PRICING (override prices per staff)
-- ============================================
CREATE TABLE IF NOT EXISTS staff_service_prices (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_type_id INTEGER NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, service_type_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_service_prices_tenant ON staff_service_prices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_service_prices_staff ON staff_service_prices(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_service_prices_service ON staff_service_prices(service_type_id);

-- ============================================
-- APPOINTMENT ADD-ONS (add-ons used in a booking)
-- ============================================
CREATE TABLE IF NOT EXISTS appointment_addons (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  addon_id INTEGER REFERENCES service_addons(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointment_addons_tenant ON appointment_addons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointment_addons_appointment ON appointment_addons(appointment_id);

-- ============================================
-- Add credits_used to appointments
-- ============================================
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS membership_name VARCHAR(255);

-- ============================================
-- SUCCESS
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Service pricing tables created successfully!';
END $$;
