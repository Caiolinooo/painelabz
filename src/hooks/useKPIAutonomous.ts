// =====================================================
// Hook: useKPIAutonomous - Manage autonomous KPI agent
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { AutonomousKPIAgent } from '@/lib/ia/autonomous-loop';
import type { AutonomousConfig, AgentStatus } from '@/lib/ia/autonomous-config';
import type { IADashboardLayout } from '@/types/ia';

export interface UseKPIAutonomousOptions {
  userId: string;
  sectorId: string;
  config?: Partial<AutonomousConfig>;
  autoStart?: boolean;
  onLayoutUpdate?: (layout: IADashboardLayout) => void;
  onDecision?: (decision: any) => void;
  onStatusChange?: (status: AgentStatus) => void;
  onError?: (error: Error) => void;
  onCycleComplete?: (cycleData: any) => void;
}

export interface UseKPIAutonomousReturn {
  // Agent state
  isRunning: boolean;
  status: AgentStatus;
  agentInfo: any;
  
  // Data
  layouts: IADashboardLayout[];
  decisionLog: any[];
  cycleHistory: any[];
  
  // Controls
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  updateConfig: (config: Partial<AutonomousConfig>) => void;
  manualOverride: (action: string, parameters: any) => Promise<{ success: boolean; details: any }>;
  
  // Status
  isLoading: boolean;
  error: Error | null;
}

export function useKPIAutonomous(
  options: UseKPIAutonomousOptions
): UseKPIAutonomousReturn {
  const {
    userId,
    sectorId,
    config = {},
    autoStart = false,
    onLayoutUpdate,
    onDecision,
    onStatusChange,
    onError,
    onCycleComplete,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [layouts, setLayouts] = useState<IADashboardLayout[]>([]);
  const [decisionLog, setDecisionLog] = useState<any[]>([]);
  const [cycleHistory, setCycleHistory] = useState<any[]>([]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [agentInfo, setAgentInfo] = useState<any>(null);

  const agentRef = useRef<AutonomousKPIAgent | null>(null);

  // Initialize agent
  useEffect(() => {
    if (!userId || !sectorId) return;

    const agent = new AutonomousKPIAgent(userId, sectorId, config);
    agentRef.current = agent;

    // Register event handlers
    agent.on('layoutUpdate', (layout) => {
      setLayouts((prev) => [layout, ...prev.slice(0, 4)]); // Keep last 5
      onLayoutUpdate?.(layout);
    });

    agent.on('decision', (decision) => {
      setDecisionLog((prev) => [decision, ...prev.slice(0, 9)]); // Keep last 10
      onDecision?.(decision);
    });

    agent.on('statusChange', (newStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    });

    agent.on('error', (err) => {
      setError(err);
      onError?.(err);
    });

    agent.on('cycleComplete', (cycleData) => {
      setCycleHistory((prev) => [cycleData, ...prev.slice(0, 49)]); // Keep last 50
      onCycleComplete?.(cycleData);
    });

    // Auto-start if requested
    if (autoStart) {
      setIsLoading(true);
      agent.start()
        .catch((err) => {
          setError(err);
          onError?.(err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }

    // Cleanup
    return () => {
      agent.stop();
    };
  }, [userId, sectorId]);

  // Update layouts from agent
  useEffect(() => {
    if (agentRef.current) {
      setLayouts(agentRef.current.getLayouts());
      setDecisionLog(agentRef.current.getDecisionLog());
      setCycleHistory(agentRef.current.getCycleHistory());
      setStatus(agentRef.current.getStatus());
      setAgentInfo(agentRef.current.getInfo());
    }
  }, []);

  // Start agent
  const start = useCallback(async () => {
    if (!agentRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await agentRef.current.start();
      setLayouts(agentRef.current.getLayouts());
      setAgentInfo(agentRef.current.getInfo());
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stop agent
  const stop = useCallback(() => {
    agentRef.current?.stop();
    setAgentInfo(agentRef.current?.getInfo() || null);
  }, []);

  // Pause agent
  const pause = useCallback(() => {
    agentRef.current?.pause();
    setAgentInfo(agentRef.current?.getInfo() || null);
  }, []);

  // Resume agent
  const resume = useCallback(() => {
    agentRef.current?.resume();
    setAgentInfo(agentRef.current?.getInfo() || null);
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<AutonomousConfig>) => {
    agentRef.current?.updateConfig(newConfig);
    setAgentInfo(agentRef.current?.getInfo() || null);
  }, []);

  // Manual override
  const manualOverride = useCallback(async (action: string, parameters: any) => {
    if (!agentRef.current) {
      return { success: false, details: { error: 'Agent not initialized' } };
    }
    
    return agentRef.current.manualOverride(action, parameters);
  }, []);

  return {
    // Agent state
    isRunning: status === 'running',
    status,
    agentInfo,
    
    // Data
    layouts,
    decisionLog,
    cycleHistory,
    
    // Controls
    start,
    stop,
    pause,
    resume,
    updateConfig,
    manualOverride,
    
    // Status
    isLoading,
    error,
  };
}
