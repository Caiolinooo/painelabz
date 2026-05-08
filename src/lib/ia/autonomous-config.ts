// =====================================================
// Autonomous KPI Agent Configuration
// =====================================================

export interface AutonomousConfig {
  // Core cycle settings
  interval: number; // Cycle frequency in milliseconds (default: 30000 = 30s)
  
  // Autonomy level
  autonomyLevel: 'low' | 'medium' | 'high' | 'full';
  
  // Rendering
  autoRender: boolean;
  maxLayouts: number; // Maximum number of layouts to keep in history
  
  // Learning and memory
  learning: {
    enabled: boolean;
    memorySize: number; // Number of interactions to remember
    patternDetection: boolean;
    autoAdjust: boolean;
  };
  
  // Alerts and notifications
  alerts: {
    enabled: boolean;
    channels: ('push' | 'email' | 'portal')[];
    thresholds: {
      [kpi: string]: { min?: number; max?: number };
    };
  };
  
  // Automatic actions
  autoActions: {
    enabled: boolean;
    maxPerCycle: number;
    requireConfirmation: boolean;
  };
  
  // Sector-specific configuration
  sectorConfig: {
    [sectorId: string]: {
      kpis: string[];
      goals: {
        [kpi: string]: number;
      };
      priority: number;
    };
  };
}

// Default configuration
export const DEFAULT_AUTONOMOUS_CONFIG: AutonomousConfig = {
  interval: 30000, // 30 seconds
  autonomyLevel: 'medium',
  autoRender: true,
  maxLayouts: 5,
  learning: {
    enabled: true,
    memorySize: 1000,
    patternDetection: true,
    autoAdjust: true,
  },
  alerts: {
    enabled: true,
    channels: ['push', 'portal'] as ('push' | 'email' | 'portal')[],
    thresholds: {},
  },
  autoActions: {
    enabled: true,
    maxPerCycle: 3,
    requireConfirmation: false,
  },
  sectorConfig: {},
};

// Configuration presets for different autonomy levels
export const AUTONOMY_PRESETS = {
  low: {
    interval: 60000, // 1 minute
    autonomyLevel: 'low' as const,
    autoRender: false,
    maxLayouts: 3,
    learning: {
      enabled: true,
      memorySize: 500,
      patternDetection: false,
      autoAdjust: false,
    },
    alerts: {
      enabled: true,
      channels: ['portal'] as ('push' | 'email' | 'portal')[],
      thresholds: {},
    },
    autoActions: {
      enabled: false,
      maxPerCycle: 1,
      requireConfirmation: true,
    },
  },
  medium: {
    interval: 30000, // 30 seconds
    autonomyLevel: 'medium' as const,
    autoRender: true,
    maxLayouts: 5,
    learning: {
      enabled: true,
      memorySize: 1000,
      patternDetection: true,
      autoAdjust: true,
    },
    alerts: {
      enabled: true,
      channels: ['push', 'portal'] as ('push' | 'email' | 'portal')[],
      thresholds: {},
    },
    autoActions: {
      enabled: true,
      maxPerCycle: 3,
      requireConfirmation: false,
    },
  },
  high: {
    interval: 15000, // 15 seconds
    autonomyLevel: 'high' as const,
    autoRender: true,
    maxLayouts: 7,
    learning: {
      enabled: true,
      memorySize: 2000,
      patternDetection: true,
      autoAdjust: true,
    },
    alerts: {
      enabled: true,
      channels: ['push', 'email', 'portal'] as ('push' | 'email' | 'portal')[],
      thresholds: {},
    },
    autoActions: {
      enabled: true,
      maxPerCycle: 5,
      requireConfirmation: false,
    },
  },
  full: {
    interval: 10000, // 10 seconds
    autonomyLevel: 'full' as const,
    autoRender: true,
    maxLayouts: 10,
    learning: {
      enabled: true,
      memorySize: 5000,
      patternDetection: true,
      autoAdjust: true,
    },
    alerts: {
      enabled: true,
      channels: ['push', 'email', 'portal'] as ('push' | 'email' | 'portal')[],
      thresholds: {},
    },
    autoActions: {
      enabled: true,
      maxPerCycle: 10,
      requireConfirmation: false,
    },
  },
};

// Agent status types
export type AgentStatus = 'idle' | 'running' | 'paused' | 'error';

// Cycle data for metrics
export interface CycleData {
  cycleId: string;
  startTime: number;
  endTime: number;
  actions: Array<{
    type: string;
    success: boolean;
    duration: number;
    details: any;
  }>;
  layoutsGenerated: number;
  kpisAnalyzed: number;
  errors: string[];
}

// Decision log entry
export interface DecisionLog {
  timestamp: string;
  cycleId: string;
  decision: string;
  reasoning: string;
  confidence: number;
  outcome?: string;
}

// Memory store interface
export interface MemoryStore {
  interactions: Array<{
    timestamp: string;
    type: string;
    data: any;
    context: any;
    outcome?: string;
  }>;
  patterns: Array<{
    pattern: string;
    frequency: number;
    lastSeen: string;
    confidence: number;
  }>;
  preferences: Record<string, any>;
}
