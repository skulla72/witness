UPDATE public.organizations
SET updated_at = updated_at
WHERE slug IN (
  'fellowship-of-christian-athletes-kansas-city',
  'cavetime-tulsa',
  'flatirons-church-west-golden',
  'cross-point-church-nashville'
);