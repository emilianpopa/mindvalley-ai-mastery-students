-- Migration: Add Staff Tasks System
-- Creates tables for internal task management (to-do list)
-- Similar to Momence's internal task feature for staff

-- ============================================
-- STAFF TASKS (Internal To-Do List)
-- ============================================
CREATE TABLE IF NOT EXISTS staff_tasks (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

  -- Assignment
  assigned_to INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  assigned_to_user INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Optional links to other entities
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,

  -- Reminder settings
  send_reminder BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_time TIMESTAMP,

  -- Metadata
  completed_at TIMESTAMP,
  completed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_tasks_tenant ON staff_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to_user ON staff_tasks(assigned_to_user);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON staff_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_client ON staff_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_appointment ON staff_tasks(appointment_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_created_at ON staff_tasks(created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_staff_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_staff_tasks_updated_at ON staff_tasks;
CREATE TRIGGER update_staff_tasks_updated_at BEFORE UPDATE ON staff_tasks
    FOR EACH ROW EXECUTE FUNCTION update_staff_tasks_updated_at();

-- ============================================
-- SUCCESS
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Staff tasks table created successfully!';
END $$;
