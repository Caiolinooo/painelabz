// src/app/avaliacao/page.tsx
import React from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getEvaluations,
  getEvaluationPeriods,
  getEmployees,
  getAvailablePeriods,
  getMyEvaluationForPeriod,
  getAllMyEvaluationsForPeriod
} from '@/services/evaluationService';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import EvaluationListClient from './EvaluationListClient';

export default async function EvaluationPage() {
  // Priorizar cookies (fonte primária de autenticação para server components)
  // Depois tentar headers como fallback
  let token: string | undefined = undefined;

  // Primeiro: verificar cookies (setados pela API de login)
  const cookieStore = await cookies();
  token = cookieStore.get('abzToken')?.value || cookieStore.get('token')?.value;
  console.log('🔍 EvaluationPage - Token dos cookies:', token ? 'Presente' : 'Ausente');

  // Fallback: tentar ler do header Authorization (se middleware setou)
  if (!token) {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    console.log('🔍 EvaluationPage - Authorization header:', authHeader ? 'Presente' : 'Ausente');

    if (authHeader) {
      // Extrair token do header "Bearer TOKEN"
      token = authHeader.replace('Bearer ', '');
      console.log('✅ EvaluationPage - Token extraído do header Authorization');
    }
  }

  console.log('🔍 EvaluationPage - Token encontrado:', token ? `Sim (primeiros 20 chars: ${token.substring(0, 20)}...)` : 'Não');
  console.log('🔍 EvaluationPage - Token length:', token?.length);
  console.log('🔍 EvaluationPage - Token format:', token ? (token.includes('.') ? 'JWT' : 'Other') : 'N/A');

  if (!token) {
    console.log('❌ EvaluationPage - Redirecionando: sem token');
    redirect('/login?redirect=/avaliacao');
  }

  try {
    // Decodificar token para pegar userId
    const decoded = await verifyToken(token);
    console.log('🔍 EvaluationPage - Token decodificado:', JSON.stringify(decoded, null, 2));
    console.log('🔍 EvaluationPage - userId extraído:', decoded?.userId);

    let userId = decoded?.userId;

    // Fallback: se userId não está no formato esperado, tentar alternativas
    if (!userId && decoded) {
      // Verificar se é um token especial do Supabase
      if (decoded.userId === 'supabase-user' || decoded.userId === 'supabase-access-token' || decoded.userId === 'service-account') {
        console.log('⚠️ EvaluationPage - Token do Supabase detectado, validando com Supabase Admin');

        // Validar o token usando o cliente Admin do Supabase
        const { data: { user: supabaseUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !supabaseUser) {
          console.log('❌ EvaluationPage - Token do Supabase inválido ou expirado:', authError?.message);
          redirect('/login?redirect=/avaliacao');
        }

        console.log('✅ EvaluationPage - Token do Supabase validado com sucesso. ID real:', supabaseUser.id);
        userId = supabaseUser.id;
      } else {
        // Verificar outras propriedades que podem conter o userId
        userId = decoded.sub || decoded.user_id || decoded.id;
        if (userId) {
          console.log('✅ EvaluationPage - userId encontrado em propriedade alternativa:', userId);
        }
      }
    }

    if (!userId) {
      console.log('❌ EvaluationPage - Redirecionando: sem userId no token decodificado');
      console.log('❌ EvaluationPage - Payload completo do token:', JSON.stringify(decoded));
      redirect('/login?redirect=/avaliacao');
    }

    console.log('✅ EvaluationPage - UserId válido encontrado:', userId);

    // Buscar informações do usuário para determinar papel
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users_unified')
      .select('id, role, name, email')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.log('❌ EvaluationPage - Erro ao buscar usuário:', {
        error: userError,
        userId: userId,
        hasData: !!userData
      });

      // Não redirecionar imediatamente, tentar entender o erro
      if (userError?.code === 'PGRST116') {
        console.log('❌ EvaluationPage - Usuário não encontrado no banco de dados');
      }

      console.log('❌ EvaluationPage - Redirecionando: erro ao buscar usuário');
      redirect('/login?redirect=/avaliacao');
    }

    console.log('✅ EvaluationPage - Usuário encontrado:', userData.email, 'Role:', userData.role);

    const [evaluations, periods, employees, availablePeriods] = await Promise.all([
      // A lógica de gerente é interna ao serviço, baseada em avaliacao_colaborador_gerente
      getEvaluations({ userId }),
      getEvaluationPeriods(),
      getEmployees(),
      getAvailablePeriods(userId)
    ]);

    // Para cada período disponível, verificar se já existe avaliação
    const activePeriodsWithEvaluations = await Promise.all(
      availablePeriods.active.map(async (period) => {
        const evaluations = await getAllMyEvaluationsForPeriod(userId, period.id);
        // Se houver mais de uma, retorna 'multiple' para o card tratar
        const existingEvaluationId = evaluations.length === 1
          ? evaluations[0].id
          : (evaluations.length > 1 ? 'multiple' : null);

        // Status: se houver múltiplas, considera 'em_andamento' se alguma estiver, ou 'pendente'
        let evaluationStatus = null;
        if (evaluations.length > 0) {
          if (evaluations.some((e: any) => e.status === 'concluida')) evaluationStatus = 'concluida';
          else if (evaluations.some((e: any) => e.status === 'em_andamento')) evaluationStatus = 'em_andamento';
          else evaluationStatus = evaluations[0].status;
        }

        return {
          period,
          existingEvaluationId,
          evaluationStatus
        };
      })
    );

    const upcomingPeriodsWithEvaluations = await Promise.all(
      availablePeriods.upcoming.map(async (period) => {
        const evaluations = await getAllMyEvaluationsForPeriod(userId, period.id);
        const existingEvaluationId = evaluations.length === 1
          ? evaluations[0].id
          : (evaluations.length > 1 ? 'multiple' : null);

        return {
          period,
          existingEvaluationId,
          evaluationStatus: evaluations.length > 0 ? evaluations[0].status : null
        };
      })
    );

    return (
      <EvaluationListClient
        initialEvaluations={evaluations}
        initialPeriods={periods}
        initialEmployees={employees}
        activePeriods={activePeriodsWithEvaluations}
        upcomingPeriods={upcomingPeriodsWithEvaluations}
        currentUser={userData as any}
      />
    );
  } catch (error) {
    console.error('Failed to fetch evaluation data:', error);
    return (
      <div className="container mx-auto p-6">
        <div className="alert alert-error">
          Erro ao carregar dados de avaliação. Por favor, tente novamente.
        </div>
      </div>
    );
  }
}
