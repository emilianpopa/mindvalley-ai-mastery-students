-- Momence Service Prices Seed Data
-- This script updates service prices based on Momence appointment pricing
-- Run after add-categories.js to ensure category_id foreign key works

-- ============================================
-- UPSERT SERVICES WITH PRICES FROM MOMENCE
-- ============================================
-- Uses the existing category field or category_id if available

DO $$
DECLARE
  v_tenant_id INTEGER;
  v_cat_modalities INTEGER;
  v_cat_massage INTEGER;
  v_cat_health_coach INTEGER;
  v_cat_events INTEGER;
BEGIN
  -- Get tenant ID
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No tenant found, skipping seed';
    RETURN;
  END IF;

  -- Try to get category IDs (may not exist if categories migration not run)
  SELECT id INTO v_cat_modalities FROM service_categories WHERE tenant_id = v_tenant_id AND name = 'Modalities';
  SELECT id INTO v_cat_massage FROM service_categories WHERE tenant_id = v_tenant_id AND name = 'Massage';
  SELECT id INTO v_cat_health_coach FROM service_categories WHERE tenant_id = v_tenant_id AND name = 'Health Coach Consultations';
  SELECT id INTO v_cat_events FROM service_categories WHERE tenant_id = v_tenant_id AND name = 'Events/Workshops';

  -- Page 1 Services
  -- HBOT2 90 min - ZAR 3,000.00 - 112m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'HBOT2 90 min', 3000.00, 112, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 3000.00, duration_minutes = 112, category_id = v_cat_modalities, category = 'Modalities';

  -- HBOT2 30 min - ZAR 1,125.00 - 38m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'HBOT2 30 min', 1125.00, 38, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1125.00, duration_minutes = 38, category_id = v_cat_modalities, category = 'Modalities';

  -- HBOT2 60 min - ZAR 2,250.00 - 72m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'HBOT2 60 min', 2250.00, 72, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 2250.00, duration_minutes = 72, category_id = v_cat_modalities, category = 'Modalities';

  -- Lymphatic Drainage 60Min - ZAR 950.00 - 45m - Massage
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Lymphatic Drainage 60Min', 950.00, 45, v_cat_massage, 'Massage', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 950.00, duration_minutes = 45, category_id = v_cat_massage, category = 'Massage';

  -- HBOT1 90 min - ZAR 3,000.00 - 112m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'HBOT1 90 min', 3000.00, 112, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 3000.00, duration_minutes = 112, category_id = v_cat_modalities, category = 'Modalities';

  -- Back / Neck / Shoulder Massage 45 Min - ZAR 825.00 - 30m - Massage
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Back / Neck / Shoulder Massage 45 Min', 825.00, 30, v_cat_massage, 'Massage', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 825.00, duration_minutes = 30, category_id = v_cat_massage, category = 'Massage';

  -- Oligoscan - ZAR 1,200.00 - 10m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Oligoscan', 1200.00, 10, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1200.00, duration_minutes = 10, category_id = v_cat_modalities, category = 'Modalities';

  -- Theragun - ZAR 200.00 - 15m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Theragun', 200.00, 15, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 200.00, duration_minutes = 15, category_id = v_cat_modalities, category = 'Modalities';

  -- Back / Neck / Shoulder Massage 30 Min - ZAR 550.00 - 30m - Massage
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Back / Neck / Shoulder Massage 30 Min', 550.00, 30, v_cat_massage, 'Massage', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 550.00, duration_minutes = 30, category_id = v_cat_massage, category = 'Massage';

  -- Health Insights - ZAR 1,950.00 - 72m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Health Insights', 1950.00, 72, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1950.00, duration_minutes = 72, category_id = v_cat_modalities, category = 'Modalities';

  -- VO2 Max - ZAR 1,200.00 - 45m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'VO2 Max', 1200.00, 45, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1200.00, duration_minutes = 45, category_id = v_cat_modalities, category = 'Modalities';

  -- VO2max + In Body Scan - ZAR 1,150.00 - 60m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'VO2max + In Body Scan', 1150.00, 60, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1150.00, duration_minutes = 60, category_id = v_cat_modalities, category = 'Modalities';

  -- Bulb Rife - ZAR 600.00 - 30m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Bulb Rife', 600.00, 30, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 600.00, duration_minutes = 30, category_id = v_cat_modalities, category = 'Modalities';

  -- Rife - ZAR 350.00 - 20m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Rife', 350.00, 20, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 350.00, duration_minutes = 20, category_id = v_cat_modalities, category = 'Modalities';

  -- Follow up Consultation - ZAR 850.00 - 30m - Health Coach Consultations
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Follow up Consultation', 850.00, 30, v_cat_health_coach, 'Health Coach Consultations', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 850.00, duration_minutes = 30, category_id = v_cat_health_coach, category = 'Health Coach Consultations';

  -- Soul Collage - ZAR 750.00 - 180m - Events/Workshops
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Soul Collage', 750.00, 180, v_cat_events, 'Events/Workshops', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 750.00, duration_minutes = 180, category_id = v_cat_events, category = 'Events/Workshops';

  -- Consultation - ZAR 1,700.00 - 60m - Health Coach Consultations
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Consultation', 1700.00, 60, v_cat_health_coach, 'Health Coach Consultations', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1700.00, duration_minutes = 60, category_id = v_cat_health_coach, category = 'Health Coach Consultations';

  -- Meeting - ZAR 0.00 - 30m
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, is_active)
  VALUES (v_tenant_id, 'Meeting', 0.00, 30, true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 0.00, duration_minutes = 30;

  -- Tour - ZAR 0.00 - 45m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Tour', 0.00, 45, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 0.00, duration_minutes = 45, category_id = v_cat_modalities, category = 'Modalities';

  -- In Body Scan - ZAR 150.00 - 10m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'In Body Scan', 150.00, 10, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 150.00, duration_minutes = 10, category_id = v_cat_modalities, category = 'Modalities';

  -- Page 2 Services
  -- 30 min Massage - ZAR 400.00 - 30m
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, is_active)
  VALUES (v_tenant_id, '30 min Massage', 400.00, 30, true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 400.00, duration_minutes = 30;

  -- Hot Cold (Cold plunge+Infra Red Sauna) - ZAR 550.00 - 35m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Hot Cold (Cold plunge+Infra Red Sauna)', 550.00, 35, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 550.00, duration_minutes = 35, category_id = v_cat_modalities, category = 'Modalities';

  -- Massage Targetted Area 45 Min - ZAR 600.00 - 45m - Massage
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Massage Targetted Area 45 Min', 600.00, 45, v_cat_massage, 'Massage', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 600.00, duration_minutes = 45, category_id = v_cat_massage, category = 'Massage';

  -- Lymphatic Drainage 90 Min - ZAR 1,200.00 - 90m - Massage
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Lymphatic Drainage 90 Min', 1200.00, 90, v_cat_massage, 'Massage', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1200.00, duration_minutes = 90, category_id = v_cat_massage, category = 'Massage';

  -- Swedish Massage 90 Min - ZAR 1,450.00 - 90m - Massage
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Swedish Massage 90 Min', 1450.00, 90, v_cat_massage, 'Massage', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1450.00, duration_minutes = 90, category_id = v_cat_massage, category = 'Massage';

  -- Reflex Foot Massage 60 Min - ZAR 950.00 - 60m - Massage
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Reflex Foot Massage 60 Min', 950.00, 60, v_cat_massage, 'Massage', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 950.00, duration_minutes = 60, category_id = v_cat_massage, category = 'Massage';

  -- Deep Tissue Massage 90 Min - ZAR 1,050.00 - 90m - Massage
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Deep Tissue Massage 90 Min', 1050.00, 90, v_cat_massage, 'Massage', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1050.00, duration_minutes = 90, category_id = v_cat_massage, category = 'Massage';

  -- Deep Tissue Massage 60 Min - ZAR 1,150.00 - 60m - Massage
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Deep Tissue Massage 60 Min', 1150.00, 60, v_cat_massage, 'Massage', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1150.00, duration_minutes = 60, category_id = v_cat_massage, category = 'Massage';

  -- Cold Plunge Sea View - ZAR 150.00 - 3m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Cold Plunge Sea View', 150.00, 3, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 150.00, duration_minutes = 3, category_id = v_cat_modalities, category = 'Modalities';

  -- Sports Massage 90 Min - ZAR 1,050.00 - 90m - Massage
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Sports Massage 90 Min', 1050.00, 90, v_cat_massage, 'Massage', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1050.00, duration_minutes = 90, category_id = v_cat_massage, category = 'Massage';

  -- Sports Massage 60 Min - ZAR 1,150.00 - 60m - Massage
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Sports Massage 60 Min', 1150.00, 60, v_cat_massage, 'Massage', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1150.00, duration_minutes = 60, category_id = v_cat_massage, category = 'Massage';

  -- Cold Plunge City View - ZAR 150.00 - 3m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Cold Plunge City View', 150.00, 3, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 150.00, duration_minutes = 3, category_id = v_cat_modalities, category = 'Modalities';

  -- Infrared Sauna - ZAR 500.00 - 30m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Infrared Sauna', 500.00, 30, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 500.00, duration_minutes = 30, category_id = v_cat_modalities, category = 'Modalities';

  -- Swedish Massage 60 Min - ZAR 950.00 - 60m - Massage
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Swedish Massage 60 Min', 950.00, 60, v_cat_massage, 'Massage', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 950.00, duration_minutes = 60, category_id = v_cat_massage, category = 'Massage';

  -- PEMF - ZAR 300.00 - 12m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'PEMF', 300.00, 12, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 300.00, duration_minutes = 12, category_id = v_cat_modalities, category = 'Modalities';

  -- HBOT1 60 min - ZAR 2,250.00 - 72m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'HBOT1 60 min', 2250.00, 72, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 2250.00, duration_minutes = 72, category_id = v_cat_modalities, category = 'Modalities';

  -- HBOT1 30 min - ZAR 1,125.00 - 38m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'HBOT1 30 min', 1125.00, 38, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 1125.00, duration_minutes = 38, category_id = v_cat_modalities, category = 'Modalities';

  -- Hocatt Ozone + PEMF - ZAR 650.00 - 20m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Hocatt Ozone + PEMF', 650.00, 20, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 650.00, duration_minutes = 20, category_id = v_cat_modalities, category = 'Modalities';

  -- Hocatt Ozone Steam Sauna - ZAR 500.00 - 20m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Hocatt Ozone Steam Sauna', 500.00, 20, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 500.00, duration_minutes = 20, category_id = v_cat_modalities, category = 'Modalities';

  -- Lymphatic Drainage Compression boots - ZAR 150.00 - 20m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Lymphatic Drainage Compression boots', 150.00, 20, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 150.00, duration_minutes = 20, category_id = v_cat_modalities, category = 'Modalities';

  -- Page 3 Services
  -- Somadome - ZAR 150.00 - 20m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Somadome', 150.00, 20, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 150.00, duration_minutes = 20, category_id = v_cat_modalities, category = 'Modalities';

  -- Red Light Therapy - ZAR 500.00 - 20m - Modalities
  INSERT INTO service_types (tenant_id, name, price, duration_minutes, category_id, category, is_active)
  VALUES (v_tenant_id, 'Red Light Therapy', 500.00, 20, v_cat_modalities, 'Modalities', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET price = 500.00, duration_minutes = 20, category_id = v_cat_modalities, category = 'Modalities';

  RAISE NOTICE 'Successfully seeded 44 services with Momence prices';
END $$;
