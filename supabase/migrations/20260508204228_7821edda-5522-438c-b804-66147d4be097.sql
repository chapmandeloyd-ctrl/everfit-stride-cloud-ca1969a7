-- Revert the test row inserted during fresh-pair logic verification.
-- Keeps Dee's state matching what it was before the test simulation.
DELETE FROM public.client_keto_assignments
WHERE client_id = '1eee93c2-55e6-47bd-a68a-a1ed4219911e'
  AND keto_type_id = 'cf9a4c02-7d5c-4fa9-b52c-afd39f2f7bd0'
  AND is_active = true
  AND assigned_at >= NOW() - INTERVAL '15 minutes';