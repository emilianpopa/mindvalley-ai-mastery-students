-- Seed Data: Synthetic Appointments, Staff, and Service Types
-- For ExpandHealth Dashboard Demo
-- Run AFTER add_appointments_system.sql

-- ============================================
-- SERVICE TYPES (Expand Health treatments)
-- ============================================
INSERT INTO service_types (tenant_id, name, description, duration_minutes, price, color, category, is_active)
SELECT
  t.id,
  st.name,
  st.description,
  st.duration_minutes,
  st.price,
  st.color,
  st.category,
  true
FROM tenants t
CROSS JOIN (VALUES
  ('Red Light Therapy', 'Full-body red light therapy session for cellular regeneration', 30, 450.00, '#ef4444', 'Light Therapy'),
  ('HBOT Session', 'Hyperbaric oxygen therapy - 1.5 ATA pressure', 60, 1200.00, '#3b82f6', 'Oxygen Therapy'),
  ('IV Drip - NAD+', 'NAD+ infusion for cellular energy and longevity', 90, 2500.00, '#8b5cf6', 'IV Therapy'),
  ('IV Drip - Vitamin C', 'High-dose Vitamin C infusion for immune support', 45, 850.00, '#f97316', 'IV Therapy'),
  ('IV Drip - Myers Cocktail', 'Classic Myers Cocktail with vitamins and minerals', 45, 950.00, '#06b6d4', 'IV Therapy'),
  ('Cryotherapy', 'Whole-body cryotherapy session', 15, 350.00, '#0ea5e9', 'Cold Therapy'),
  ('Infrared Sauna', 'Far-infrared sauna session for detoxification', 45, 280.00, '#f59e0b', 'Heat Therapy'),
  ('Ozone Therapy', '10-pass ozone therapy treatment', 120, 3500.00, '#10b981', 'Oxygen Therapy'),
  ('Consultation - Initial', 'Comprehensive initial health consultation', 90, 1500.00, '#6366f1', 'Consultation'),
  ('Consultation - Follow-up', 'Follow-up consultation and protocol review', 45, 750.00, '#a855f7', 'Consultation'),
  ('Blood Panel - Comprehensive', 'Full comprehensive blood panel with analysis', 30, 2800.00, '#ec4899', 'Diagnostics'),
  ('PEMF Therapy', 'Pulsed electromagnetic field therapy session', 30, 380.00, '#14b8a6', 'Energy Medicine')
) AS st(name, description, duration_minutes, price, color, category)
WHERE t.id = 1
ON CONFLICT DO NOTHING;

-- ============================================
-- STAFF (Practitioners)
-- ============================================
INSERT INTO staff (tenant_id, first_name, last_name, email, phone, title, bio, color, is_active)
SELECT
  t.id,
  s.first_name,
  s.last_name,
  s.email,
  s.phone,
  s.title,
  s.bio,
  s.color,
  true
FROM tenants t
CROSS JOIN (VALUES
  ('Dr. Sarah', 'Mitchell', 'sarah.mitchell@expandhealth.co.za', '+27 82 555 0101', 'Medical Director', 'Board-certified integrative medicine physician with 15 years experience in longevity medicine.', '#6366f1'),
  ('Dr. James', 'Van Der Berg', 'james.vdb@expandhealth.co.za', '+27 82 555 0102', 'Functional Medicine Practitioner', 'Specialist in metabolic health and hormone optimization.', '#10b981'),
  ('Thandi', 'Nkosi', 'thandi.nkosi@expandhealth.co.za', '+27 82 555 0103', 'IV Therapy Nurse', 'Registered nurse specializing in IV nutrient therapy and infusions.', '#f59e0b'),
  ('Michael', 'Roberts', 'michael.r@expandhealth.co.za', '+27 82 555 0104', 'Biohacking Specialist', 'Expert in cold/heat therapy, HBOT, and recovery protocols.', '#3b82f6'),
  ('Lisa', 'Pretorius', 'lisa.p@expandhealth.co.za', '+27 82 555 0105', 'Wellness Coordinator', 'Patient care coordinator and protocol management.', '#ec4899')
) AS s(first_name, last_name, email, phone, title, bio, color)
WHERE t.id = 1
ON CONFLICT DO NOTHING;

-- ============================================
-- APPOINTMENTS (30 days of synthetic data)
-- ============================================

-- Helper: Get random client, staff, service for tenant 1
-- We'll create appointments for the past 30 days and next 7 days

-- Create a function to generate appointments
DO $$
DECLARE
  v_tenant_id INTEGER := 1;
  v_client_id INTEGER;
  v_staff_id INTEGER;
  v_service_id INTEGER;
  v_service_price DECIMAL(10,2);
  v_service_duration INTEGER;
  v_service_name VARCHAR(255);
  v_start_time TIMESTAMP;
  v_day_offset INTEGER;
  v_hour INTEGER;
  v_status VARCHAR(30);
  v_payment_status VARCHAR(30);
  v_booking_source VARCHAR(50);
  v_random_val FLOAT;
  v_client_ids INTEGER[];
  v_staff_ids INTEGER[];
  v_service_data RECORD;
  i INTEGER;
BEGIN
  -- Get all client IDs for tenant 1
  SELECT ARRAY_AGG(id) INTO v_client_ids FROM clients WHERE tenant_id = v_tenant_id;

  -- Get all staff IDs for tenant 1
  SELECT ARRAY_AGG(id) INTO v_staff_ids FROM staff WHERE tenant_id = v_tenant_id;

  -- Skip if no clients or staff
  IF v_client_ids IS NULL OR v_staff_ids IS NULL THEN
    RAISE NOTICE 'No clients or staff found for tenant %. Skipping appointment generation.', v_tenant_id;
    RETURN;
  END IF;

  -- Generate appointments for past 30 days
  FOR v_day_offset IN -30..-1 LOOP
    -- 3-8 appointments per day
    FOR i IN 1..FLOOR(RANDOM() * 6 + 3)::INTEGER LOOP
      -- Random client
      v_client_id := v_client_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(v_client_ids, 1))::INTEGER];

      -- Random staff
      v_staff_id := v_staff_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(v_staff_ids, 1))::INTEGER];

      -- Random service
      SELECT id, price, duration_minutes, name INTO v_service_data
      FROM service_types
      WHERE tenant_id = v_tenant_id
      ORDER BY RANDOM()
      LIMIT 1;

      v_service_id := v_service_data.id;
      v_service_price := v_service_data.price;
      v_service_duration := v_service_data.duration_minutes;
      v_service_name := v_service_data.name;

      -- Random hour between 8am and 5pm
      v_hour := 8 + FLOOR(RANDOM() * 9)::INTEGER;

      -- Calculate start time
      v_start_time := (CURRENT_DATE + v_day_offset * INTERVAL '1 day' + v_hour * INTERVAL '1 hour')::TIMESTAMP;

      -- Past appointments are mostly completed
      v_random_val := RANDOM();
      IF v_random_val < 0.75 THEN
        v_status := 'completed';
        v_payment_status := 'paid';
      ELSIF v_random_val < 0.85 THEN
        v_status := 'completed';
        v_payment_status := 'pending';
      ELSIF v_random_val < 0.92 THEN
        v_status := 'cancelled';
        v_payment_status := 'refunded';
      ELSE
        v_status := 'no_show';
        v_payment_status := 'unpaid';
      END IF;

      -- Random booking source
      v_random_val := RANDOM();
      IF v_random_val < 0.4 THEN
        v_booking_source := 'online';
      ELSIF v_random_val < 0.7 THEN
        v_booking_source := 'phone';
      ELSIF v_random_val < 0.9 THEN
        v_booking_source := 'manual';
      ELSE
        v_booking_source := 'referral';
      END IF;

      INSERT INTO appointments (
        tenant_id, client_id, staff_id, service_type_id, title,
        start_time, end_time, status, payment_status, price, currency,
        location_type, booking_source, created_at
      ) VALUES (
        v_tenant_id, v_client_id, v_staff_id, v_service_id, v_service_name,
        v_start_time, v_start_time + (v_service_duration || ' minutes')::INTERVAL,
        v_status, v_payment_status, v_service_price, 'ZAR',
        'in_person', v_booking_source,
        v_start_time - INTERVAL '2 days' -- Booked 2 days before
      );
    END LOOP;
  END LOOP;

  -- Generate appointments for today
  FOR i IN 1..FLOOR(RANDOM() * 4 + 4)::INTEGER LOOP
    v_client_id := v_client_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(v_client_ids, 1))::INTEGER];
    v_staff_id := v_staff_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(v_staff_ids, 1))::INTEGER];

    SELECT id, price, duration_minutes, name INTO v_service_data
    FROM service_types
    WHERE tenant_id = v_tenant_id
    ORDER BY RANDOM()
    LIMIT 1;

    v_service_id := v_service_data.id;
    v_service_price := v_service_data.price;
    v_service_duration := v_service_data.duration_minutes;
    v_service_name := v_service_data.name;

    v_hour := 8 + i; -- Spread throughout the day
    v_start_time := (CURRENT_DATE + v_hour * INTERVAL '1 hour')::TIMESTAMP;

    -- Today's appointments: mix of statuses
    v_random_val := RANDOM();
    IF v_hour < EXTRACT(HOUR FROM CURRENT_TIME) THEN
      -- Past hours today
      IF v_random_val < 0.8 THEN
        v_status := 'completed';
        v_payment_status := 'paid';
      ELSE
        v_status := 'completed';
        v_payment_status := 'pending';
      END IF;
    ELSE
      -- Future hours today
      IF v_random_val < 0.7 THEN
        v_status := 'confirmed';
      ELSE
        v_status := 'scheduled';
      END IF;
      v_payment_status := 'pending';
    END IF;

    INSERT INTO appointments (
      tenant_id, client_id, staff_id, service_type_id, title,
      start_time, end_time, status, payment_status, price, currency,
      location_type, booking_source, created_at
    ) VALUES (
      v_tenant_id, v_client_id, v_staff_id, v_service_id, v_service_name,
      v_start_time, v_start_time + (v_service_duration || ' minutes')::INTERVAL,
      v_status, v_payment_status, v_service_price, 'ZAR',
      'in_person', 'online',
      v_start_time - INTERVAL '3 days'
    );
  END LOOP;

  -- Generate appointments for next 7 days
  FOR v_day_offset IN 1..7 LOOP
    FOR i IN 1..FLOOR(RANDOM() * 5 + 2)::INTEGER LOOP
      v_client_id := v_client_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(v_client_ids, 1))::INTEGER];
      v_staff_id := v_staff_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(v_staff_ids, 1))::INTEGER];

      SELECT id, price, duration_minutes, name INTO v_service_data
      FROM service_types
      WHERE tenant_id = v_tenant_id
      ORDER BY RANDOM()
      LIMIT 1;

      v_service_id := v_service_data.id;
      v_service_price := v_service_data.price;
      v_service_duration := v_service_data.duration_minutes;
      v_service_name := v_service_data.name;

      v_hour := 8 + FLOOR(RANDOM() * 9)::INTEGER;
      v_start_time := (CURRENT_DATE + v_day_offset * INTERVAL '1 day' + v_hour * INTERVAL '1 hour')::TIMESTAMP;

      -- Future appointments
      v_random_val := RANDOM();
      IF v_random_val < 0.6 THEN
        v_status := 'confirmed';
      ELSE
        v_status := 'scheduled';
      END IF;
      v_payment_status := 'pending';

      INSERT INTO appointments (
        tenant_id, client_id, staff_id, service_type_id, title,
        start_time, end_time, status, payment_status, price, currency,
        location_type, booking_source, created_at
      ) VALUES (
        v_tenant_id, v_client_id, v_staff_id, v_service_id, v_service_name,
        v_start_time, v_start_time + (v_service_duration || ' minutes')::INTERVAL,
        v_status, v_payment_status, v_service_price, 'ZAR',
        'in_person', 'online',
        CURRENT_TIMESTAMP - (RANDOM() * 5)::INTEGER * INTERVAL '1 day'
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Synthetic appointments created successfully!';
END $$;

-- ============================================
-- SUMMARY STATS
-- ============================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM appointments WHERE tenant_id = 1;
  RAISE NOTICE 'Total appointments created: %', v_count;

  SELECT COUNT(*) INTO v_count FROM staff WHERE tenant_id = 1;
  RAISE NOTICE 'Total staff created: %', v_count;

  SELECT COUNT(*) INTO v_count FROM service_types WHERE tenant_id = 1;
  RAISE NOTICE 'Total service types created: %', v_count;
END $$;
