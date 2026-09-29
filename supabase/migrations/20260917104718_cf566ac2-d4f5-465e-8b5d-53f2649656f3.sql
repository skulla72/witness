GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.grants_for_org_public(uuid) TO anon, authenticated, service_role;