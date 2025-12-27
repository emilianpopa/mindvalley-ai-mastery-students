-- Seed locations for ExpandHealth tenant
-- Run this after the locations table is created

-- First, get the tenant ID for ExpandHealth
DO $$
DECLARE
  v_tenant_id INTEGER;
BEGIN
  -- Get the ExpandHealth tenant ID
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'expandhealth' LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'ExpandHealth tenant not found, skipping location seeding';
    RETURN;
  END IF;

  -- Delete existing locations for this tenant (optional - comment out if you want to keep existing)
  -- DELETE FROM locations WHERE tenant_id = v_tenant_id;

  -- Insert locations (only if they don't exist)
  INSERT INTO locations (tenant_id, name, is_primary, is_active)
  SELECT v_tenant_id, name, is_primary, true
  FROM (VALUES
    ('28 DeWolfe Street', true),
    ('Compression boot location', false),
    ('Consult Room 1', false),
    ('Consult Room 2', false),
    ('Consult Room 3', false),
    ('Drip Location', false),
    ('Event Space', false),
    ('HBOT', false),
    ('Hocatt + Massage', false),
    ('Ice bath 1', false),
    ('Ice bath 2', false),
    ('Infrared Sauna', false),
    ('PEMF', false),
    ('Reception / meeting space', false),
    ('Red Light Therapy Room', false),
    ('Somadome', false),
    ('Online', false)
  ) AS v(name, is_primary)
  WHERE NOT EXISTS (
    SELECT 1 FROM locations l
    WHERE l.tenant_id = v_tenant_id AND l.name = v.name
  );

  RAISE NOTICE 'Locations seeded for tenant %', v_tenant_id;
END $$;
