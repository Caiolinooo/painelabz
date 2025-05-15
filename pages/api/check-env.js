// API para verificar as variáveis de ambiente no Next.js
export default function handler(req, res) {
  // Verificar variáveis do Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  // Preparar resposta
  const response = {
    supabaseUrl: supabaseUrl ? 'Definido' : 'Não definido',
    supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 10)}` : 'Não definido',
    supabaseServiceKey: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 10)}...${supabaseServiceKey.substring(supabaseServiceKey.length - 10)}` : 'Não definido',
    serviceKeyLength: supabaseServiceKey ? supabaseServiceKey.length : 0,
    databaseUrl: process.env.DATABASE_URL ? 'Definido' : 'Não definido',
  };

  // Retornar resposta
  res.status(200).json(response);
}
