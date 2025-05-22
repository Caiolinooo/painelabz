-- Função para criar políticas de armazenamento
CREATE OR REPLACE FUNCTION create_storage_policy(
  bucket_name text,
  policy_name text,
  definition text,
  operation text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policy_exists boolean;
BEGIN
  -- Verificar se a política já existe
  SELECT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = policy_name
  ) INTO policy_exists;
  
  -- Se a política já existe, removê-la
  IF policy_exists THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
  END IF;
  
  -- Criar a política
  EXECUTE format(
    'CREATE POLICY %I ON storage.objects FOR %s TO authenticated USING (%s)',
    policy_name,
    operation,
    definition
  );
END;
$$;
