-- Setup Default Tenant and Platform Admin
-- Run this script to initialize multi-tenancy with a default clinic

-- 1. Create the default ExpandHealth tenant
INSERT INTO tenants (name, slug, primary_color, subscription_tier, kb_sharing_mode, status, settings)
VALUES (
  'ExpandHealth Main',
  'expandhealth-main',
  '#0d9488',
  'enterprise',
  'hybrid',
  'active',
  '{"isDefault": true, "features": ["kb", "protocols", "labs", "forms", "chat"]}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings
RETURNING id;

-- 2. Get the tenant ID we just created
DO $$
DECLARE
  default_tenant_id INTEGER;
  admin_user_id INTEGER;
BEGIN
  -- Get the default tenant
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'expandhealth-main';

  -- Get the first admin user (or any user if no admin exists)
  SELECT id INTO admin_user_id FROM users ORDER BY id LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Update the admin user to be a platform admin and associate with default tenant
    UPDATE users
    SET
      tenant_id = default_tenant_id,
      is_platform_admin = true
    WHERE id = admin_user_id;

    RAISE NOTICE 'User % set as platform admin for tenant %', admin_user_id, default_tenant_id;
  END IF;

  -- Associate ALL existing users with the default tenant (if they don't have one)
  UPDATE users
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;

  RAISE NOTICE 'All users associated with default tenant';

  -- Associate existing clients with the default tenant
  UPDATE clients
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;

  -- Associate existing protocols with the default tenant
  UPDATE protocols
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;

  -- Associate existing protocol templates with the default tenant
  UPDATE protocol_templates
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;

  -- Associate existing KB documents with the default tenant
  UPDATE kb_documents
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;

  -- Associate existing labs with the default tenant
  UPDATE labs
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;

  -- Update tenant's created_by to the admin
  UPDATE tenants
  SET created_by = admin_user_id
  WHERE id = default_tenant_id AND created_by IS NULL;

END $$;

-- 3. Verify the setup
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.is_platform_admin,
  t.name as tenant_name,
  t.slug as tenant_slug
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
ORDER BY u.id;

-- Show tenant info
SELECT * FROM tenants;
