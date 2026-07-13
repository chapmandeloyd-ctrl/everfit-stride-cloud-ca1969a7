
DELETE FROM public.client_keto_assignments
WHERE keto_type_id IN (
  SELECT id FROM public.keto_types WHERE name ILIKE 'Apex%'
);

DELETE FROM public.keto_types WHERE name ILIKE 'Apex%';
