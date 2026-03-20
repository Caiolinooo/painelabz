import { supabase } from '@/lib/supabase';

type CalculationMethod = 'simple_average' | 'weighted';
const EVALUATION_SETTINGS_FALLBACK_KEY = 'evaluation_settings';

export interface GerenteGeralAuditAssignment {
  userId: string;
  leaderIds: string[];
}

type RoleQuestionsMap = Record<'collaborator' | 'manager', number[]>;

type EvaluationRequiredConfig = {
  required_by_role?: Partial<RoleQuestionsMap>;
  visibility_by_role?: Partial<RoleQuestionsMap>;
  auditoria?: {
    gerentesGerais?: GerenteGeralAuditAssignment[];
  };
};

type SettingsTimestamps = {
  created_at?: string;
  updated_at?: string;
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMissingRelationError(error: unknown, relationName?: string): boolean {
  if (!error || typeof error !== 'object') return false;

  const maybeError = error as { code?: string; message?: string };
  if (maybeError.code === '42P01') {
    return true;
  }

  const message = maybeError.message?.toLowerCase() || '';
  return relationName
    ? message.includes(`relation \"public.${relationName.toLowerCase()}\" does not exist`) || message.includes(`relation \"${relationName.toLowerCase()}\" does not exist`)
    : message.includes('does not exist');
}

function normalizeAuditAssignments(assignments: unknown): GerenteGeralAuditAssignment[] {
  if (!Array.isArray(assignments)) return [];

  return assignments
    .map((assignment): GerenteGeralAuditAssignment | null => {
      if (!assignment || typeof assignment !== 'object') {
        return null;
      }

      const rawAssignment = assignment as { userId?: unknown; leaderIds?: unknown };
      const userId = typeof rawAssignment.userId === 'string' ? rawAssignment.userId.trim() : '';
      const leaderIds = Array.isArray(rawAssignment.leaderIds)
        ? rawAssignment.leaderIds
          .filter((leaderId): leaderId is string => typeof leaderId === 'string')
          .map((leaderId: string) => leaderId.trim())
          .filter(Boolean)
        : [];

      if (!userId) {
        return null;
      }

      return {
        userId,
        leaderIds: Array.from(new Set(leaderIds))
      };
    })
    .filter((assignment): assignment is GerenteGeralAuditAssignment => Boolean(assignment));
}

function normalizeSettings(settings: EvaluationSettings | null): EvaluationSettings | null {
  if (!settings) return null;

  const calculationSettings = settings.calculo || { method: 'simple_average' as CalculationMethod };

  return {
    ...settings,
    calculo: {
      ...calculationSettings,
      method: calculationSettings.method || 'simple_average'
    },
    obrigatoriedade: {
      ...(settings.obrigatoriedade || {}),
      auditoria: {
        ...((settings.obrigatoriedade?.auditoria || {}) as NonNullable<EvaluationRequiredConfig['auditoria']>),
        gerentesGerais: normalizeAuditAssignments(settings.obrigatoriedade?.auditoria?.gerentesGerais)
      }
    }
  };
}

function parseStoredSettingsValue(value: unknown, timestamps: SettingsTimestamps = {}): EvaluationSettings[] {
  const rawSettings = Array.isArray(value)
    ? value
    : (isObjectRecord(value) ? [value] : []);

  return rawSettings
    .map((rawSetting, index) => {
      if (!isObjectRecord(rawSetting)) {
        return null;
      }

      const calculo = isObjectRecord(rawSetting.calculo)
        ? rawSetting.calculo as EvaluationSettings['calculo']
        : { method: 'simple_average' as CalculationMethod };

      const obrigatoriedade = isObjectRecord(rawSetting.obrigatoriedade)
        ? rawSetting.obrigatoriedade as EvaluationRequiredConfig
        : {};

      return normalizeSettings({
        id: typeof rawSetting.id === 'string' ? rawSetting.id : `legacy-evaluation-settings-${index}`,
        scope: rawSetting.scope === 'periodo' ? 'periodo' : 'global',
        periodo_id: typeof rawSetting.periodo_id === 'string' ? rawSetting.periodo_id : null,
        calculo,
        obrigatoriedade,
        ativo: rawSetting.ativo !== false,
        created_at: typeof rawSetting.created_at === 'string' ? rawSetting.created_at : (timestamps.created_at || new Date().toISOString()),
        updated_at: typeof rawSetting.updated_at === 'string' ? rawSetting.updated_at : timestamps.updated_at
      });
    })
    .filter((setting): setting is EvaluationSettings => Boolean(setting));
}

function serializeSettings(settings: EvaluationSettings[]): unknown[] {
  return settings.map((setting) => ({
    id: setting.id,
    scope: setting.scope,
    periodo_id: setting.periodo_id ?? null,
    calculo: setting.calculo,
    obrigatoriedade: setting.obrigatoriedade || {},
    ativo: setting.ativo,
    created_at: setting.created_at,
    updated_at: setting.updated_at
  }));
}

function mergeSettings(
  baseSettings: EvaluationSettings | null,
  overrideSettings: EvaluationSettings | null
): EvaluationSettings | null {
  const normalizedBase = normalizeSettings(baseSettings);
  const normalizedOverride = normalizeSettings(overrideSettings);

  if (!normalizedBase) return normalizedOverride;
  if (!normalizedOverride) return normalizedBase;

  return normalizeSettings({
    ...normalizedBase,
    ...normalizedOverride,
    calculo: {
      ...normalizedBase.calculo,
      ...normalizedOverride.calculo
    },
    obrigatoriedade: {
      ...(normalizedBase.obrigatoriedade || {}),
      ...(normalizedOverride.obrigatoriedade || {}),
      required_by_role: {
        ...(normalizedBase.obrigatoriedade?.required_by_role || {}),
        ...(normalizedOverride.obrigatoriedade?.required_by_role || {})
      },
      visibility_by_role: {
        ...(normalizedBase.obrigatoriedade?.visibility_by_role || {}),
        ...(normalizedOverride.obrigatoriedade?.visibility_by_role || {})
      },
      auditoria: {
        ...(normalizedBase.obrigatoriedade?.auditoria || {}),
        ...(normalizedOverride.obrigatoriedade?.auditoria || {})
      }
    }
  });
}

export interface EvaluationSettings {
  id: string;
  scope: 'global' | 'periodo';
  periodo_id?: string | null;
  calculo: {
    method: CalculationMethod;
    weights?: Record<string, number>; // por criterio_id ou categoria
    categoryMethods?: Record<string, CalculationMethod>;
  };
  obrigatoriedade?: EvaluationRequiredConfig;
  ativo: boolean;
  created_at: string;
  updated_at?: string;
}

export const EvaluationSettingsService = {
  normalizeAuditAssignments,

  normalizeSettings,

  parseStoredSettingsValue,

  serializeSettings,

  isMissingRelationError,

  fallbackStorageKey: EVALUATION_SETTINGS_FALLBACK_KEY,

  async getFallbackSettings(): Promise<EvaluationSettings[]> {
    const { data, error } = await supabase
      .from('settings')
      .select('value, created_at, updated_at')
      .eq('key', EVALUATION_SETTINGS_FALLBACK_KEY)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error, 'settings')) {
        return [];
      }
      throw error;
    }

    if (!data) {
      return [];
    }

    return parseStoredSettingsValue(data.value, {
      created_at: data.created_at,
      updated_at: data.updated_at
    });
  },

  async getActiveSettings(): Promise<EvaluationSettings[]> {
    const { data, error } = await supabase
      .from('avaliacao_settings')
      .select('*')
      .eq('ativo', true)
      .order('updated_at', { ascending: false });

    if (error) {
      if (isMissingRelationError(error, 'avaliacao_settings')) {
        return this.getFallbackSettings();
      }
      throw error;
    }

    return (data || []).map((setting) => normalizeSettings(setting as EvaluationSettings) as EvaluationSettings);
  },

  buildEffectiveSettings(settings: EvaluationSettings[], periodoId?: string | null): EvaluationSettings | null {
    const globalSettings = settings.find((setting) => setting.scope === 'global') || null;
    const periodoSettings = periodoId
      ? settings.find((setting) => setting.scope === 'periodo' && setting.periodo_id === periodoId) || null
      : null;

    return mergeSettings(globalSettings, periodoSettings);
  },

  async getEffectiveSettings(periodoId?: string | null): Promise<EvaluationSettings | null> {
    const settings = await this.getActiveSettings();
    return this.buildEffectiveSettings(settings, periodoId);
  },

  getGerentesGerais(settings?: EvaluationSettings | null): GerenteGeralAuditAssignment[] {
    return normalizeAuditAssignments(settings?.obrigatoriedade?.auditoria?.gerentesGerais);
  },

  getAuditableLeaderIds(settings: EvaluationSettings | null, userId: string): string[] {
    const assignment = this.getGerentesGerais(settings).find((item) => item.userId === userId);
    return assignment ? Array.from(new Set(assignment.leaderIds)) : [];
  },

  getAllAuditableLeaderIds(settings: EvaluationSettings[], userId: string): string[] {
    return Array.from(new Set(
      settings.flatMap((setting) => this.getAuditableLeaderIds(setting, userId))
    ));
  },

  canUserAuditEvaluator(settings: EvaluationSettings | null, userId: string, evaluatorId?: string | null): boolean {
    if (!evaluatorId) return false;
    return this.getAuditableLeaderIds(settings, userId).includes(evaluatorId);
  },

  canUserAuditEvaluatorForPeriod(
    settings: EvaluationSettings[],
    userId: string,
    evaluatorId?: string | null,
    periodoId?: string | null
  ): boolean {
    const effectiveSettings = this.buildEffectiveSettings(settings, periodoId);
    return this.canUserAuditEvaluator(effectiveSettings, userId, evaluatorId);
  },

  calculateScore(
    notas: { criterioId?: string; categoria?: string; valor: number; peso?: number }[],
    settings?: EvaluationSettings | null
  ): number {
    if (!notas || notas.length === 0) return 0;
    const method = settings?.calculo?.method || 'simple_average';

    if (method === 'weighted') {
      let somaPesos = 0;
      let somaPonderada = 0;
      for (const n of notas) {
        const basePeso = n.peso ?? 1;
        const confPeso = n.criterioId && settings?.calculo?.weights
          ? settings.calculo.weights[n.criterioId] ?? basePeso
          : basePeso;
        somaPesos += confPeso;
        somaPonderada += n.valor * confPeso;
      }
      return somaPesos > 0 ? Math.round((somaPonderada / somaPesos) * 10) / 10 : 0;
    }

    // simple_average
    const media = notas.reduce((acc, n) => acc + n.valor, 0) / notas.length;
    return Math.round(media * 10) / 10;
  }
};
