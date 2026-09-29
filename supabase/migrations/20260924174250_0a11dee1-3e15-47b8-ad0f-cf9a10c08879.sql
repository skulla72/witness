UPDATE public.organizations
SET logo_url = CASE slug
  WHEN 'fellowship-of-christian-athletes-kansas-city' THEN '/__l5e/assets-v1/61194114-9ed9-4303-bf64-c3d5d5df071a/fca-profile.jpg'
  WHEN 'cavetime-tulsa' THEN '/__l5e/assets-v1/a2393c6f-221e-49c3-b23b-b92397309d7f/cavetime-profile.jpg'
  WHEN 'flatirons-church-west-golden' THEN '/__l5e/assets-v1/be274ce3-49b5-44bc-a7d4-a50af01ae009/flatirons-profile.jpg'
  WHEN 'cross-point-church-nashville' THEN '/__l5e/assets-v1/08af0e0c-7768-4d60-922d-f01a5c0c2d3a/crosspoint-profile.jpg'
  ELSE logo_url
END,
updated_at = now()
WHERE slug IN (
  'fellowship-of-christian-athletes-kansas-city',
  'cavetime-tulsa',
  'flatirons-church-west-golden',
  'cross-point-church-nashville'
);