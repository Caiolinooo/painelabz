// =====================================================
// Context Manager - Continuous Context Enrichment
// =====================================================

import type { IAUserContext, IAUserRole } from '@/types/ia';
import { supabaseAdmin } from '@/lib/supabase';
import { getEffectiveRole, getAccessibleUserIds } from './permissions';

// Memory store for user interactions
export interface MemoryStore {
  userId: string;
  interactions: Array<{
    id: string;
    timestamp: string;
    type: string;
    category: string;
    data: any;
    context: any;
    outcome?: string;
    success?: boolean;
  }>;
  patterns: Array<{
    id: string;
    pattern: string;
    category: string;
    frequency: number;
    lastSeen: string;
    firstSeen: string;
    confidence: number;
    metadata: any;
  }>;
  preferences: {
    communication: {
      preferredChannels: string[];
      responseTime: string;
      notificationFrequency: string;
    };
    workPatterns: {
      productiveHours: string[];
      meetingPreferences: string;
      taskPriorities: string[];
    };
    kpiPreferences: {
      favoriteMetrics: string[];
      alertThresholds: Record<string, number>;
      reportFrequency: string;
    };
  };
  metadata: {
    lastUpdated: string;
    totalInteractions: number;
    patternCount: number;
  };
}

// Interaction types
export type InteractionType = 
  | 'kpi_check'
  | 'dashboard_view'
  | 'notification_response'
  | 'task_completion'
  | 'kpi_update'
  | 'plan_execution'
  | 'feedback'
  | 'override'
  | 'manual_action';

// Context enrichment result
export interface EnrichedContext extends IAUserContext {
  memory: {
    recentInteractions: Array<MemoryStore['interactions'][0]>;
    patterns: Array<MemoryStore['patterns'][0]>;
    preferences: MemoryStore['preferences'];
  };
  realTime: {
    currentKpis: any[];
    pendingTasks: any[];
    recentNotifications: any[];
    activeAlerts: any[];
  };
  predictions: {
    likelyOutcomes: Array<{
      scenario: string;
      probability: number;
      impact: string;
      timeframe: string;
    }>;
    recommendedActions: Array<{
      action: string;
      confidence: number;
      rationale: string;
    }>;
  };
}

export class ContextManager {
  private memoryStore: Map<string, MemoryStore> = new Map();
  private readonly MAX_INTERACTIONS = 1000;
  private readonly MAX_PATTERNS = 100;
  private readonly MAX_USERS_IN_MEMORY = 100;

  /**
   * Get enriched context for a user
   */
  async getContext(userId: string): Promise<EnrichedContext> {
    // 1. Fetch base context
    const baseContext = await this.fetchBaseContext(userId);
    
    // 2. Retrieve memory
    const memory = await this.getMemory(userId);
    
    // 3. Fetch real-time data
    const realTime = await this.fetchRealTimeData(userId, baseContext.role);
    
    // 4. Generate predictions
    const predictions = await this.generatePredictions(userId, memory, baseContext);
    
    // 5. Detect patterns
    await this.detectPatterns(userId, memory);
    
    return {
      ...baseContext,
      memory: {
        recentInteractions: memory.interactions.slice(-20), // Last 20 interactions
        patterns: memory.patterns.slice(-10), // Top 10 patterns
        preferences: memory.preferences,
      },
      realTime,
      predictions,
    };
  }

  /**
   * Fetch base user context
   */
  private async fetchBaseContext(userId: string): Promise<IAUserContext> {
    const { data: profile } = await supabaseAdmin
      .from('users_unified')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!profile) {
      throw new Error(`User not found: ${userId}`);
    }
    
    const role = await getEffectiveRole(userId, profile.role);
    const accessibleIds = await getAccessibleUserIds(userId, role);
    
    // Fetch evaluation data
    const { data: evaluations } = await supabaseAdmin
      .from('avaliacoes_desempenho')
      .select('nota_final, status, created_at')
      .eq('colaborador_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Fetch vacation data
    const { data: vacations } = await supabaseAdmin
      .from('leave_requests')
      .select('status, start_date, end_date')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
      .limit(5);
    
    // Fetch reimbursement data
    const { data: userData } = await supabaseAdmin
      .from('users_unified')
      .select('email')
      .eq('id', userId)
      .single();
    
    let reimbursements = { pending: 0, totalApproved: 0 };
    if (userData?.email) {
      const { data: reembolsos } = await supabaseAdmin
        .from('Reimbursement')
        .select('status, valorTotal')
        .eq('email', userData.email)
        .order('data', { ascending: false })
        .limit(20);
      
      if (reembolsos) {
        reimbursements = {
          pending: reembolsos.filter(r => r.status === 'pendente').length,
          totalApproved: reembolsos
            .filter(r => r.status === 'aprovado' || r.status === 'pago')
            .reduce((sum, r) => sum + (parseFloat(r.valorTotal) || 0), 0),
        };
      }
    }
    
    // Fetch recent emails (if available)
    let recentEmails: any[] = [];
    if (profile.email_corporativo) {
      const { data: emails } = await supabaseAdmin
        .from('email_logs')
        .select('subject, from_email, sent_at')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(5);
      recentEmails = emails?.map(e => ({
        subject: e.subject,
        from: e.from_email,
        date: e.sent_at,
      })) || [];
    }
    
    return {
      userId,
      userName: `${profile.first_name} ${profile.last_name}`.trim(),
      role: role as any,
      department: profile.department || 'Não definido',
      position: profile.position || 'Não definido',
      profile: {
        email: profile.email || null,
        phone: profile.phone || null,
      },
      evaluations: {
        count: evaluations?.length || 0,
        avgScore: evaluations?.length
          ? Math.round(
              (evaluations.reduce((sum, e) => sum + (e.nota_final || 0), 0) /
                evaluations.filter(e => e.nota_final).length) * 10
            ) / 10
          : null,
        lastPeriod: evaluations?.[0]?.created_at?.split('T')[0] || null,
      },
      vacations: {
        pending: vacations?.filter(v => v.status === 'PENDING_LEADER' || v.status === 'PENDING_MANAGER').length || 0,
        upcoming: (vacations || [])
          .filter(v => v.status === 'APPROVED' && new Date(v.start_date) > new Date())
          .map(v => ({
            start: v.start_date,
            end: v.end_date,
            status: v.status,
          })),
      },
      reimbursements,
      recentEmails,
      teamMemberIds: accessibleIds || [],
      availableTools: [], // Will be populated by tool registry
    };
  }

  /**
   * Evict least recently used user from memory store when at capacity
   */
  private evictLRU(): void {
    if (this.memoryStore.size <= this.MAX_USERS_IN_MEMORY) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, store] of this.memoryStore) {
      const lastUpdated = store.metadata?.lastUpdated;
      if (lastUpdated) {
        const time = new Date(lastUpdated).getTime();
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = key;
        }
      }
    }

    if (oldestKey) {
      this.memoryStore.delete(oldestKey);
      console.log(`[IA ContextManager] LRU eviction: removed user ${oldestKey.substring(0, 8)}... from memory cache`);
    }
  }

  /**
   * Get or create memory store for user
   */
  private async getMemory(userId: string): Promise<MemoryStore> {
    if (this.memoryStore.has(userId)) {
      return this.memoryStore.get(userId)!;
    }

    this.evictLRU();
    
    // Try to load from database
    const { data: dbMemory } = await supabaseAdmin
      .from('ia_memory')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (dbMemory) {
      const memory: MemoryStore = {
        userId,
        interactions: dbMemory.interactions || [],
        patterns: dbMemory.patterns || [],
        preferences: dbMemory.preferences || this.getDefaultPreferences(),
        metadata: dbMemory.metadata || {
          lastUpdated: new Date().toISOString(),
          totalInteractions: 0,
          patternCount: 0,
        },
      };
      this.memoryStore.set(userId, memory);
      return memory;
    }
    
    // Create new memory store
    const newMemory: MemoryStore = {
      userId,
      interactions: [],
      patterns: [],
      preferences: this.getDefaultPreferences(),
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalInteractions: 0,
        patternCount: 0,
      },
    };
    this.memoryStore.set(userId, newMemory);
    return newMemory;
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): MemoryStore['preferences'] {
    return {
      communication: {
        preferredChannels: ['portal', 'push'],
        responseTime: 'within_24h',
        notificationFrequency: 'immediate',
      },
      workPatterns: {
        productiveHours: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        meetingPreferences: 'morning',
        taskPriorities: ['high', 'medium', 'low'],
      },
      kpiPreferences: {
        favoriteMetrics: [],
        alertThresholds: {},
        reportFrequency: 'weekly',
      },
    };
  }

  /**
   * Fetch real-time data
   */
  private async fetchRealTimeData(userId: string, role: IAUserRole): Promise<EnrichedContext['realTime']> {
    const accessibleIds = await getAccessibleUserIds(userId, role);
    
    // Fetch current KPIs
    const { data: kpis } = await supabaseAdmin
      .from('ia_dashboard_cache')
      .select('data')
      .eq('user_id', userId)
      .eq('dashboard_type', 'summary')
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();
    
    // Fetch pending tasks
    const { data: tasks } = await supabaseAdmin
      .from('scheduled_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('next_run', { ascending: true })
      .limit(10);
    
    // Fetch recent notifications
    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Fetch active alerts
    const { data: alerts } = await supabaseAdmin
      .from('kpi_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);
    
    return {
      currentKpis: kpis?.data?.kpis || [],
      pendingTasks: tasks || [],
      recentNotifications: notifications || [],
      activeAlerts: alerts || [],
    };
  }

  /**
   * Generate predictions based on history and context
   */
  private async generatePredictions(
    userId: string,
    memory: MemoryStore,
    context: IAUserContext
  ): Promise<EnrichedContext['predictions']> {
    const predictions: EnrichedContext['predictions'] = {
      likelyOutcomes: [],
      recommendedActions: [],
    };
    
    // Analyze interaction patterns
    const recentActions = memory.interactions
      .filter(i => i.type.includes('kpi') || i.type.includes('task'))
      .slice(-20);
    
    if (recentActions.length > 5) {
      const successRate = recentActions.filter(a => a.success).length / recentActions.length;
      
      if (successRate > 0.8) {
        predictions.likelyOutcomes.push({
          scenario: 'Continued improvement in KPI performance',
          probability: Math.round(successRate * 100),
          impact: 'Positive',
          timeframe: '2-4 weeks',
        });
      } else if (successRate < 0.5) {
        predictions.likelyOutcomes.push({
          scenario: 'Need for intervention or strategy adjustment',
          probability: Math.round((1 - successRate) * 100),
          impact: 'Moderate',
          timeframe: '1-2 weeks',
        });
      }
    }
    
    // Pattern-based predictions
    const decliningPatterns = memory.patterns.filter(
      p => p.pattern.includes('declining') && p.confidence > 0.7
    );
    
    if (decliningPatterns.length > 0) {
      predictions.likelyOutcomes.push({
        scenario: 'Potential KPI decline if no action taken',
        probability: Math.round(
          decliningPatterns.reduce((sum, p) => sum + p.confidence, 0) / decliningPatterns.length * 100
        ),
        impact: 'High',
        timeframe: '1-3 weeks',
      });
    }
    
    // Recommended actions based on patterns
    if (memory.patterns.some(p => p.pattern.includes('late_response'))) {
      predictions.recommendedActions.push({
        action: 'Set up automated reminders for pending tasks',
        confidence: 0.85,
        rationale: 'Historical pattern shows delayed responses to pending items',
      });
    }
    
    if (memory.patterns.some(p => p.pattern.includes('kpi_below_target'))) {
      predictions.recommendedActions.push({
        action: 'Review and adjust KPI targets or intervention strategies',
        confidence: 0.75,
        rationale: 'Recurring pattern of KPIs falling below targets',
      });
    }
    
    // Role-based recommendations
    if (context.role === 'GERENTE' && memory.interactions.length > 10) {
      predictions.recommendedActions.push({
        action: 'Delegate KPI monitoring to team leads for faster response',
        confidence: 0.7,
        rationale: 'Manager role with sufficient interaction history suggests delegation opportunity',
      });
    }
    
    return predictions;
  }

  /**
   * Detect patterns in user interactions
   */
  private async detectPatterns(userId: string, memory: MemoryStore): Promise<void> {
    if (memory.interactions.length < 5) return;
    
    const recentInteractions = memory.interactions.slice(-50);
    const patternCandidates = this.extractPatternCandidates(recentInteractions);
    
    for (const candidate of patternCandidates) {
      const existingPattern = memory.patterns.find(p => p.pattern === candidate.pattern);
      
      if (existingPattern) {
        existingPattern.frequency++;
        existingPattern.lastSeen = new Date().toISOString();
        existingPattern.confidence = Math.min(existingPattern.confidence + 0.05, 0.95);
      } else {
        memory.patterns.push({
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pattern: candidate.pattern,
          category: candidate.category,
          frequency: 1,
          lastSeen: new Date().toISOString(),
          firstSeen: new Date().toISOString(),
          confidence: 0.3,
          metadata: candidate.metadata,
        });
      }
    }
    
    // Keep only top patterns
    if (memory.patterns.length > this.MAX_PATTERNS) {
      memory.patterns.sort((a, b) => b.confidence - a.confidence);
      memory.patterns = memory.patterns.slice(0, this.MAX_PATTERNS);
    }
    
    memory.metadata.patternCount = memory.patterns.length;
    memory.metadata.lastUpdated = new Date().toISOString();
    
    // Persist to database periodically
    await this.persistMemory(userId, memory);
  }

  /**
   * Extract pattern candidates from interactions
   */
  private extractPatternCandidates(
    interactions: MemoryStore['interactions']
  ): Array<{
    pattern: string;
    category: string;
    metadata: any;
  }> {
    const candidates: Array<{
      pattern: string;
      category: string;
      metadata: any;
    }> = [];
    
    // Time-based patterns
    const timeGroups = this.groupByTimeOfDay(interactions);
    for (const [timeSlot, group] of Object.entries(timeGroups)) {
      if (group.length >= 3) {
        candidates.push({
          pattern: `activity_peak_${timeSlot}`,
          category: 'temporal',
          metadata: { count: group.length, timeSlot },
        });
      }
    }
    
    // Action sequence patterns
    const actionSequences = this.extractActionSequences(interactions);
    for (const [sequence, count] of Object.entries(actionSequences)) {
      if (count >= 3) {
        candidates.push({
          pattern: `sequence_${sequence}`,
          category: 'behavioral',
          metadata: { count, sequence },
        });
      }
    }
    
    // Outcome patterns
    const successPatterns = interactions.filter(i => i.success === true);
    const failurePatterns = interactions.filter(i => i.success === false);
    
    if (successPatterns.length >= 5) {
      const commonTypes = this.getCommonTypes(successPatterns);
      for (const type of commonTypes) {
        candidates.push({
          pattern: `success_${type}`,
          category: 'outcome',
          metadata: { count: successPatterns.filter(p => p.type === type).length, type },
        });
      }
    }
    
    if (failurePatterns.length >= 3) {
      const commonTypes = this.getCommonTypes(failurePatterns);
      for (const type of commonTypes) {
        candidates.push({
          pattern: `failure_${type}`,
          category: 'outcome',
          metadata: { count: failurePatterns.filter(p => p.type === type).length, type },
        });
      }
    }
    
    // KPI-related patterns
    const kpiInteractions = interactions.filter(i => i.type.includes('kpi'));
    if (kpiInteractions.length >= 3) {
      candidates.push({
        pattern: 'frequent_kpi_monitoring',
        category: 'domain',
        metadata: { count: kpiInteractions.length },
      });
    }
    
    return candidates;
  }

  /**
   * Group interactions by time of day
   */
  private groupByTimeOfDay(
    interactions: MemoryStore['interactions']
  ): Record<string, MemoryStore['interactions']> {
    const groups: Record<string, MemoryStore['interactions']> = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    };
    
    for (const interaction of interactions) {
      const hour = new Date(interaction.timestamp).getHours();
      if (hour >= 6 && hour < 12) {
        groups.morning.push(interaction);
      } else if (hour >= 12 && hour < 18) {
        groups.afternoon.push(interaction);
      } else if (hour >= 18 && hour < 24) {
        groups.evening.push(interaction);
      } else {
        groups.night.push(interaction);
      }
    }
    
    return groups;
  }

  /**
   * Extract action sequences
   */
  private extractActionSequences(
    interactions: MemoryStore['interactions']
  ): Record<string, number> {
    const sequences: Record<string, number> = {};
    
    for (let i = 0; i < interactions.length - 1; i++) {
      const sequence = `${interactions[i].type}->${interactions[i + 1].type}`;
      sequences[sequence] = (sequences[sequence] || 0) + 1;
    }
    
    return sequences;
  }

  /**
   * Get common interaction types
   */
  private getCommonTypes(
    interactions: MemoryStore['interactions']
  ): string[] {
    const typeCounts: Record<string, number> = {};
    
    for (const interaction of interactions) {
      typeCounts[interaction.type] = (typeCounts[interaction.type] || 0) + 1;
    }
    
    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
  }

  /**
   * Store interaction
   */
  async storeInteraction(
    userId: string,
    interaction: Omit<MemoryStore['interactions'][0], 'id' | 'context'>
  ): Promise<void> {
    const memory = await this.getMemory(userId);
    const context = await this.getContext(userId);
    
    const fullInteraction = {
      ...interaction,
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      context: {
        role: (context as any).role,
        department: (context as any).department,
        kpis: context.realTime.currentKpis,
      },
    };
    
    memory.interactions.push(fullInteraction);
    memory.metadata.totalInteractions++;
    memory.metadata.lastUpdated = new Date().toISOString();
    
    // Keep only recent interactions
    if (memory.interactions.length > this.MAX_INTERACTIONS) {
      memory.interactions = memory.interactions.slice(-this.MAX_INTERACTIONS);
    }
    
    // Detect patterns
    await this.detectPatterns(userId, memory);
  }

  /**
   * Update preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<MemoryStore['preferences']>
  ): Promise<void> {
    const memory = await this.getMemory(userId);
    
    memory.preferences = {
      communication: { ...memory.preferences.communication, ...updates.communication },
      workPatterns: { ...memory.preferences.workPatterns, ...updates.workPatterns },
      kpiPreferences: { ...memory.preferences.kpiPreferences, ...updates.kpiPreferences },
    };
    
    memory.metadata.lastUpdated = new Date().toISOString();
    await this.persistMemory(userId, memory);
  }

  /**
   * Persist memory to database
   */
  private async persistMemory(userId: string, memory: MemoryStore): Promise<void> {
    try {
      await supabaseAdmin.from('ia_memory').upsert({
        user_id: userId,
        interactions: memory.interactions,
        patterns: memory.patterns,
        preferences: memory.preferences,
        metadata: memory.metadata,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[ContextManager] Error persisting memory:', err);
    }
  }

  /**
   * Get user patterns
   */
  async getUserPatterns(userId: string): Promise<MemoryStore['patterns']> {
    const memory = await this.getMemory(userId);
    return memory.patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Clear user memory
   */
  async clearMemory(userId: string): Promise<void> {
    this.memoryStore.delete(userId);
    
    try {
      await supabaseAdmin.from('ia_memory').delete().eq('user_id', userId);
    } catch (err) {
      console.error('[ContextManager] Error clearing memory:', err);
    }
  }
}
