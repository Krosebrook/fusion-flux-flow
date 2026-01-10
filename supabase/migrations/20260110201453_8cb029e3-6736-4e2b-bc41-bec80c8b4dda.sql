-- Create a function to atomically create an org and add the creator as owner
-- This bypasses RLS to solve the chicken-and-egg problem
CREATE OR REPLACE FUNCTION public.create_org_with_owner(org_name text, org_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- Insert org
  INSERT INTO orgs (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Add creator as owner
  INSERT INTO org_members (org_id, user_id, role)
  VALUES (new_org_id, auth.uid(), 'owner');

  RETURN new_org_id;
END;
$$;