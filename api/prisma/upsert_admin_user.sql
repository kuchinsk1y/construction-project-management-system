INSERT INTO users (
  email,
  first_name,
  last_name,
  middle_names,
  position,
  phone_number,
  telegram_id,
  is_active,
  roles
)
VALUES (
  'tymur.kuchynskyi@ispik.eu',
  'Tymur',
  'Kuchynskyi',
  NULL,
  'Administrator',
  '+380000000001',
  784892922,
  TRUE,
  ARRAY['admin']::text[]
)
ON CONFLICT (email) DO UPDATE
SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  middle_names = EXCLUDED.middle_names,
  position = EXCLUDED.position,
  phone_number = EXCLUDED.phone_number,
  telegram_id = EXCLUDED.telegram_id,
  is_active = EXCLUDED.is_active,
  roles = EXCLUDED.roles,
  updated_at = NOW();
