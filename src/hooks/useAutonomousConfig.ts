// =====================================================
// Hook: useAutonomousConfig - Manage autonomous configuration
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import type { AutonomousConfig } from '@/lib/ia/autonomous-config';
import { DEFAULT_AUTONOMOUS_CONFIG, AUTONOMY_PRESETS } from '@/lib/ia/autonomous-config';

export interface UseAutonomousConfigOptions {
  initialConfig?: Partial<AutonomousConfig>;
  preset?: keyof typeof AUTONOMY_PRESETS;
  storageKey?: string;
  persistToStorage?: boolean;
}

export interface UseAutonomousConfigReturn {
  config: AutonomousConfig;
  preset: keyof typeof AUTONOMY_PRESETS | 'custom';
  presets: typeof AUTONOMY_PRESETS;
  updateConfig: (updates: Partial<AutonomousConfig>) => void;
  setPreset: (preset: keyof typeof AUTONOMY_PRESETS) => void;
  resetToDefault: () => void;
  resetToPreset: (preset: keyof typeof AUTONOMY_PRESETS) => void;
  isCustom: boolean;
}

export function useAutonomousConfig(
  options: UseAutonomousConfigOptions = {}
): UseAutonomousConfigReturn {
  const {
    initialConfig = {},
    preset: initialPreset,
    storageKey = 'abz-autonomous-config',
    persistToStorage = true,
  } = options;

  const [config, setConfig] = useState<AutonomousConfig>(() => {
    // Try to load from localStorage if enabled
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          return { ...DEFAULT_AUTONOMOUS_CONFIG, ...JSON.parse(stored), ...initialConfig };
        }
      } catch (err) {
        console.error('[useAutonomousConfig] Error loading from storage:', err);
      }
    }

    // Apply preset if specified
    if (initialPreset && AUTONOMY_PRESETS[initialPreset]) {
      return { ...DEFAULT_AUTONOMOUS_CONFIG, ...AUTONOMY_PRESETS[initialPreset], ...initialConfig };
    }

    return { ...DEFAULT_AUTONOMOUS_CONFIG, ...initialConfig };
  });

  const [preset, setPresetState] = useState<keyof typeof AUTONOMY_PRESETS | 'custom'>(
    initialPreset || 'custom'
  );

  // Persist to localStorage when config changes
  useEffect(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(config));
      } catch (err) {
        console.error('[useAutonomousConfig] Error saving to storage:', err);
      }
    }
  }, [config, storageKey, persistToStorage]);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<AutonomousConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };
      
      // Check if config matches any preset
      let matchesPreset: keyof typeof AUTONOMY_PRESETS | 'custom' = 'custom';
      
      for (const [presetKey, presetConfig] of Object.entries(AUTONOMY_PRESETS)) {
        const preset = presetKey as keyof typeof AUTONOMY_PRESETS;
        if (
          newConfig.interval === presetConfig.interval &&
          newConfig.autonomyLevel === presetConfig.autonomyLevel &&
          newConfig.autoRender === presetConfig.autoRender &&
          newConfig.maxLayouts === presetConfig.maxLayouts &&
          newConfig.learning.enabled === presetConfig.learning.enabled &&
          newConfig.autoActions.enabled === presetConfig.autoActions.enabled
        ) {
          matchesPreset = preset;
          break;
        }
      }
      
      setPresetState(matchesPreset);
      return newConfig;
    });
  }, []);

  // Set preset
  const setPreset = useCallback((newPreset: keyof typeof AUTONOMY_PRESETS) => {
    if (AUTONOMY_PRESETS[newPreset]) {
      setConfig({ ...DEFAULT_AUTONOMOUS_CONFIG, ...AUTONOMY_PRESETS[newPreset] });
      setPresetState(newPreset);
    }
  }, []);

  // Reset to default
  const resetToDefault = useCallback(() => {
    setConfig({ ...DEFAULT_AUTONOMOUS_CONFIG });
    setPresetState('custom');
  }, []);

  // Reset to specific preset
  const resetToPreset = useCallback((newPreset: keyof typeof AUTONOMY_PRESETS) => {
    if (AUTONOMY_PRESETS[newPreset]) {
      setConfig({ ...DEFAULT_AUTONOMOUS_CONFIG, ...AUTONOMY_PRESETS[newPreset] });
      setPresetState(newPreset);
    }
  }, []);

  // Check if current config is custom
  const isCustom = preset === 'custom';

  return {
    config,
    preset,
    presets: AUTONOMY_PRESETS,
    updateConfig,
    setPreset,
    resetToDefault,
    resetToPreset,
    isCustom,
  };
}
