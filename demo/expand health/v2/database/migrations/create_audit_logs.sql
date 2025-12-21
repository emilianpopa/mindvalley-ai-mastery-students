-- HIPAA Audit Log Table
-- This table stores all access and modification events for PHI (Protected Health Information)
-- Required for HIPAA compliance - retain for minimum 6 years

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,

    -- Event identification
    event_id UUID DEFAULT gen_random_uuid() NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'access', 'create', 'update', 'delete', 'export', 'login', 'logout', 'failed_login'
    event_category VARCHAR(50) NOT NULL, -- 'authentication', 'client', 'lab', 'protocol', 'form', 'note', 'admin'

    -- Actor (who performed the action)
    user_id INTEGER REFERENCES users(id),
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    ip_address VARCHAR(45), -- IPv4 or IPv6
    user_agent TEXT,

    -- Resource being accessed/modified
    resource_type VARCHAR(50), -- 'client', 'lab_result', 'protocol', 'form_submission', 'note'
    resource_id VARCHAR(100), -- ID of the resource
    resource_name VARCHAR(255), -- Human-readable name (e.g., client name for reference)

    -- Action details
    action VARCHAR(100) NOT NULL, -- Specific action (e.g., 'view_lab_result', 'update_protocol')
    action_description TEXT, -- Human-readable description

    -- Data changes (for update/delete operations)
    previous_values JSONB, -- Snapshot of data before change
    new_values JSONB, -- Snapshot of data after change
    changed_fields TEXT[], -- Array of field names that changed

    -- PHI indicator
    contains_phi BOOLEAN DEFAULT false, -- Flag if this action involved PHI
    phi_types TEXT[], -- Types of PHI accessed (e.g., 'name', 'dob', 'medical_history')

    -- Request context
    request_method VARCHAR(10),
    request_path TEXT,
    request_query JSONB,

    -- Outcome
    status VARCHAR(20) DEFAULT 'success', -- 'success', 'failure', 'denied'
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Index for efficient querying
    CONSTRAINT audit_logs_event_type_check CHECK (
        event_type IN ('access', 'create', 'update', 'delete', 'export', 'login', 'logout', 'failed_login', 'share')
    )
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_contains_phi ON audit_logs(contains_phi) WHERE contains_phi = true;
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status) WHERE status != 'success';

-- Create a view for easy querying of PHI access
CREATE OR REPLACE VIEW phi_access_log AS
SELECT
    al.event_id,
    al.created_at,
    al.user_email,
    al.user_role,
    al.ip_address,
    al.event_type,
    al.action,
    al.resource_type,
    al.resource_id,
    al.resource_name,
    al.phi_types,
    al.status
FROM audit_logs al
WHERE al.contains_phi = true
ORDER BY al.created_at DESC;

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'HIPAA-compliant audit log for tracking all PHI access and modifications. Retain for minimum 6 years.';
