/**
 * Export Central do Sistema IA
 * Portal ABZ
 */

// Core
export { 
  getIAConfig, 
  invalidateConfigCache as invalidateIAConfigCache,
  chatCompletion, 
  chatCompletionStream, 
  listModels, 
  testConnection 
} from './client';

export { buildUserContext, buildSystemPrompt, buildChatMessages, getSessionHistory } from './context-builder';
export { generateDashboard } from './dashboard-service';
export { getEffectiveRole, canAccessModule, getTeamMemberIds, getAccessibleUserIds, canAccessUserData, resolveUserIdByIdentifier } from './permissions';

// Registry
export { 
  registerTool, 
  getAllTools, 
  getTool, 
  getToolsByModule, 
  getAvailableToolsForUser, 
  getToolsForLLM, 
  executeTool,
  initializeTools 
} from './registry/tools-registry';

export { 
  registerAction, 
  getAllActions, 
  getAction, 
  getActionsByModule, 
  getAvailableActionsForUser, 
  executeAction,
  initializeActions 
} from './registry/actions-registry';

// Config
export { 
  getModuleConfig, 
  getAllModuleConfigs, 
  updateModuleConfig, 
  canWriteToModule, 
  canReadModule,
  getMicrosoftWritePermissions,
  updateMicrosoftWritePermissions,
  initializeConfigs 
} from './config/manager';

// Microsoft Graph
export { msGraphClient } from './microsoft/client';
export { MS_GRAPH_CATEGORIES, getCategoriesWithStatus, getCategory, getDefaultMicrosoftPermissions } from './microsoft/permissions-registry';
export type { MSGraphCategory } from './microsoft/permissions-registry';

// Types
export * from '@/types/ia-global';
export * from '@/types/ia';