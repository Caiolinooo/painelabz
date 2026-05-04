/**
 * Microsoft Graph Permissions Registry
 * Portal ABZ - Catálogo completo de 25 categorias
 */

export interface MSGraphCategory {
  key: string;
  name: string;
  icon: string;
  description: string;
  grantedScopes: string[];
  pendingScopes: string[];
}

export const MS_GRAPH_CATEGORIES: MSGraphCategory[] = [
  {
    key: 'mail',
    name: 'Email & Caixa de Entrada',
    icon: '📧',
    description: 'Ler, enviar e gerenciar emails, pastas e configurações de caixa de correio',
    grantedScopes: [
      'Mail.Read','Mail.ReadWrite','Mail.Send','Mail.ReadBasic','Mail.ReadBasic.All',
      'Mail-Advanced.ReadWrite.All','MailboxFolder.Read.All','MailboxFolder.ReadWrite.All',
      'MailboxItem.Read.All','MailboxItem.Export.All','MailboxItem.ImportExport.All',
      'MailboxSettings.Read','MailboxSettings.ReadWrite','MailboxConfigItem.Read',
      'MailboxConfigItem.ReadWrite','MailTips.ReadBasic.All'
    ],
    pendingScopes: []
  },
  {
    key: 'calendar',
    name: 'Calendário',
    icon: '📅',
    description: 'Gerenciar eventos de calendário e agendamentos',
    grantedScopes: [],
    pendingScopes: [
      'Calendars.Read','Calendars.ReadWrite','Calendars.ReadBasic',
      'Calendars.ReadBasic.All','Calendars.Read.Shared','Calendars.ReadWrite.Shared'
    ]
  },
  {
    key: 'contacts',
    name: 'Contatos',
    icon: '📇',
    description: 'Gerenciar contatos do Outlook',
    grantedScopes: [],
    pendingScopes: [
      'Contacts.Read','Contacts.ReadWrite','Contacts.Read.Shared',
      'Contacts.ReadWrite.Shared','Contacts-OnPremisesSyncBehavior.ReadWrite.All'
    ]
  },
  {
    key: 'users',
    name: 'Usuários & Perfis',
    icon: '👥',
    description: 'Gerenciar perfis de usuários, fotos e senhas',
    grantedScopes: [
      'User.Read','User-Mail.ReadWrite.All','UserAuthMethod-Email.Read.All',
      'UserAuthMethod-Email.ReadWrite.All'
    ],
    pendingScopes: [
      'User.Read.All','User.ReadWrite','User.ReadWrite.All','User.ReadBasic.All',
      'User-PasswordProfile.ReadWrite.All','User-Mail.ReadWrite.All',
      'ProfilePhoto.Read.All','ProfilePhoto.ReadWrite.All'
    ]
  },
  {
    key: 'groups',
    name: 'Grupos',
    icon: '👨‍👩‍👧‍👦',
    description: 'Gerenciar grupos do Microsoft 365 e membros',
    grantedScopes: [],
    pendingScopes: [
      'Group.Create','Group.ReadWrite.All','GroupMember.ReadWrite.All',
      'Group-Conversation.ReadWrite.All'
    ]
  },
  {
    key: 'directory',
    name: 'Diretório & Organização',
    icon: '🏢',
    description: 'Informações de organização, domínios e unidades administrativas',
    grantedScopes: [
      'AdministrativeUnit.Read.All','AdministrativeUnit.ReadWrite.All','Acronym.Read.All'
    ],
    pendingScopes: [
      'Directory.Read.All','Directory.ReadWrite.All','Domain.Read.All',
      'Domain.ReadWrite.All','Organization.Read.All','Organization.ReadWrite.All',
      'CrossTenantInformation.ReadBasic.All'
    ]
  },
  {
    key: 'teams',
    name: 'Microsoft Teams',
    icon: '💬',
    description: 'Gerenciar equipes, membros e configurações do Teams',
    grantedScopes: [],
    pendingScopes: [
      'Team.ReadBasic.All','TeamMember.Read.All','TeamMember.ReadWrite.All',
      'TeamSettings.Read.All','TeamSettings.ReadWrite.All',
      'TeamsActivity.Read.All','TeamsActivity.Send',
      'TeamsAppInstallation.ReadForChat.All','TeamsAppInstallation.ReadForTeam.All',
      'TeamsTab.Read.All','TeamsTab.ReadWrite.All',
      'TeamsResourceAccount.Read.All','TeamsTelephoneNumber.Read.All'
    ]
  },
  {
    key: 'chat',
    name: 'Chat & Canais',
    icon: '💭',
    description: 'Ler e enviar mensagens em chats e canais do Teams',
    grantedScopes: [],
    pendingScopes: [
      'Chat.Create','Chat.Read.All','Chat.ReadWrite.All','Chat.ReadBasic.All',
      'ChatMember.Read.All','ChatMember.ReadWrite.All','ChatMessage.Read.All',
      'Channel.Create','Channel.Delete.All','Channel.ReadBasic.All',
      'ChannelMember.Read.All','ChannelMember.ReadWrite.All',
      'ChannelMessage.Read.All','ChannelSettings.Read.All','ChannelSettings.ReadWrite.All'
    ]
  },
  {
    key: 'calls',
    name: 'Chamadas & Reuniões',
    icon: '📞',
    description: 'Gerenciar chamadas, reuniões online, gravações e transcrições',
    grantedScopes: [],
    pendingScopes: [
      'Calls.Initiate.All','Calls.JoinGroupCall.All','Calls.AccessMedia.All',
      'CallRecords.Read.All','CallRecordings.Read.All','CallTranscripts.Read.All',
      'OnlineMeetings.Read.All','OnlineMeetings.ReadWrite.All',
      'OnlineMeetingRecording.Read.All','OnlineMeetingTranscript.Read.All',
      'CallRecord-PstnCalls.Read.All','CallAiInsights.Read.All'
    ]
  },
  {
    key: 'files',
    name: 'OneDrive & SharePoint',
    icon: '📁',
    description: 'Gerenciar arquivos no OneDrive e sites do SharePoint',
    grantedScopes: [],
    pendingScopes: [
      'Files.Read','Files.Read.All','Files.ReadWrite','Files.ReadWrite.All',
      'Files.ReadWrite.AppFolder','Sites.Read.All','Sites.ReadWrite.All'
    ]
  },
  {
    key: 'notes',
    name: 'OneNote',
    icon: '📓',
    description: 'Ler e gerenciar cadernos do OneNote',
    grantedScopes: [],
    pendingScopes: ['Notes.Read.All','Notes.ReadWrite.All']
  },
  {
    key: 'tasks',
    name: 'Tarefas (To Do / Planner)',
    icon: '✅',
    description: 'Gerenciar tarefas e listas de tarefas',
    grantedScopes: [],
    pendingScopes: ['Tasks.Read','Tasks.ReadWrite','Tasks.Read.Shared','Tasks.ReadWrite.Shared']
  },
  {
    key: 'security',
    name: 'Segurança',
    icon: '🔒',
    description: 'Monitorar alertas, incidentes e simulações de ataque',
    grantedScopes: [],
    pendingScopes: [
      'SecurityEvents.Read.All','SecurityEvents.ReadWrite.All',
      'SecurityIncident.Read.All','SecurityIncident.ReadWrite.All',
      'AttackSimulation.Read.All','AttackSimulation.ReadWrite.All',
      'CloudApp-Discovery.Read.All'
    ]
  },
  {
    key: 'audit',
    name: 'Auditoria & Logs',
    icon: '📋',
    description: 'Ler logs de auditoria e atividades',
    grantedScopes: [],
    pendingScopes: [
      'AuditLog.Read.All','AuditActivity.Read','AuditActivity.Write',
      'AuditLogsQuery.Read.All','AuditLogsQuery-Exchange.Read.All',
      'AuditLogsQuery-Entra.Read.All','AuditLogsQuery-SharePoint.Read.All',
      'AuditLogsQuery-OneDrive.Read.All','AuditLogsQuery-Endpoint.Read.All',
      'AuditLogsQuery-CRM.Read.All','ContentActivity.Read','ContentActivity.Write'
    ]
  },
  {
    key: 'identity',
    name: 'Identidade & Autenticação',
    icon: '🔐',
    description: 'Gerenciar provedores de identidade e métodos de autenticação',
    grantedScopes: [],
    pendingScopes: [
      'IdentityProvider.Read.All','IdentityProvider.ReadWrite.All',
      'AuthenticationContext.Read.All','AuthenticationContext.ReadWrite.All',
      'CustomAuthenticationExtension.Read.All','CustomAuthenticationExtension.ReadWrite.All',
      'APIConnectors.Read.All','APIConnectors.ReadWrite.All',
      'CustomSecAttributeDefinition.ReadWrite.All'
    ]
  },
  {
    key: 'applications',
    name: 'Aplicações',
    icon: '📱',
    description: 'Gerenciar registros de aplicações e permissões',
    grantedScopes: [],
    pendingScopes: [
      'Application.Read.All','Application.ReadWrite.All','Application.ReadWrite.OwnedBy',
      'Application.ReadUpdate.All','AppRoleAssignment.ReadWrite.All',
      'AppCatalog.Read.All','AppCatalog.ReadWrite.All',
      'DelegatedPermissionGrant.ReadWrite.All','Application-RemoteDesktopConfig.ReadWrite.All'
    ]
  },
  {
    key: 'devices',
    name: 'Dispositivos',
    icon: '💻',
    description: 'Gerenciar dispositivos, Cloud PCs e credenciais',
    grantedScopes: [],
    pendingScopes: [
      'Device.Read.All','Device.ReadWrite.All','CloudPC.Read.All','CloudPC.ReadWrite.All',
      'DeviceLocalCredential.Read.All','DeviceLocalCredential.ReadBasic.All',
      'BitlockerKey.Read.All','BitlockerKey.ReadBasic.All'
    ]
  },
  {
    key: 'compliance',
    name: 'Conformidade',
    icon: '⚖️',
    description: 'Access reviews, termos de uso e consentimentos',
    grantedScopes: [
      'AccessReview.Read.All','AccessReview.ReadWrite.All','AccessReview.ReadWrite.Membership'
    ],
    pendingScopes: [
      'Agreement.Read.All','Agreement.ReadWrite.All','AgreementAcceptance.Read.All',
      'ConsentRequest.Read.All','ConsentRequest.ReadWrite.All',
      'ApprovalSolution.Read.All','ApprovalSolution.ReadWrite.All',
      'Content.Process.All','Content.Process.User'
    ]
  },
  {
    key: 'bookings',
    name: 'Bookings',
    icon: '📆',
    description: 'Gerenciar agendamentos do Microsoft Bookings',
    grantedScopes: [],
    pendingScopes: [
      'Bookings.Read.All','Bookings.ReadWrite.All','Bookings.Manage.All',
      'BookingsAppointment.ReadWrite.All'
    ]
  },
  {
    key: 'notifications',
    name: 'Notificações',
    icon: '🔔',
    description: 'Enviar e gerenciar notificações de atividade',
    grantedScopes: [],
    pendingScopes: [
      'UserNotification.ReadWrite.CreatedByApp','Notifications.ReadWrite.CreatedByApp'
    ]
  },
  {
    key: 'synchronization',
    name: 'Sincronização',
    icon: '🔄',
    description: 'Sincronização de diretório on-premises e Azure AD',
    grantedScopes: [],
    pendingScopes: [
      'Synchronization.Read.All','Synchronization.ReadWrite.All',
      'OnPremDirectorySynchronization.Read.All','OnPremDirectorySynchronization.ReadWrite.All'
    ]
  },
  {
    key: 'copilot',
    name: 'Copilot & Agentes IA',
    icon: '🤖',
    description: 'Gerenciar Copilot, identidades de agentes e registros',
    grantedScopes: [
      'AgentCard.ReadWrite.ManagedBy','AgentCardManifest.Read.All',
      'AgentCardManifest.ReadWrite.All','AgentCardManifest.ReadWrite.ManagedBy',
      'AgentCollection.Read.All','AgentCollection.ReadWrite.All',
      'AgentCollection.ReadWrite.ManagedBy','AgentIdentity.Create.All',
      'AgentIdentity.CreateAsManager','AgentIdentity.DeleteRestore.All',
      'AgentIdentity.EnableDisable.All','AgentIdentity.Read.All',
      'AgentIdentity.ReadWrite.All','AgentIdentityBlueprint.Create',
      'AgentIdentityBlueprint.DeleteRestore.All','AgentIdentityBlueprint.Read.All',
      'AgentIdentityBlueprint.ReadWrite.All',
      'AgentIdentityBlueprint.AddRemoveCreds.All',
      'AgentIdentityBlueprint.UpdateAuthProperties.All',
      'AgentIdentityBlueprint.UpdateBranding.All'
    ],
    pendingScopes: [
      'CopilotPackages.Read.All','CopilotPackages.ReadWrite.All',
      'CopilotPolicySettings.Read','CopilotPolicySettings.ReadWrite',
      'CopilotSettings-LimitedMode.Read','CopilotSettings-LimitedMode.ReadWrite',
      'AgentInstance.Read.All','AgentInstance.ReadWrite.All',
      'AgentRegistration.Read.All','AgentRegistration.ReadWrite.All',
      'AiEnterpriseInteraction.Read.All'
    ]
  },
  {
    key: 'backup',
    name: 'Backup & Restauração',
    icon: '💾',
    description: 'Gerenciar backups e restaurações do M365',
    grantedScopes: [],
    pendingScopes: [
      'BackupRestore-Configuration.Read.All','BackupRestore-Configuration.ReadWrite.All',
      'BackupRestore-Control.Read.All','BackupRestore-Control.ReadWrite.All',
      'BackupRestore-Monitor.Read.All','BackupRestore-Restore.Read.All',
      'BackupRestore-Restore.ReadWrite.All','BackupRestore-Search.Read.All',
      'EntraBackup.Read.All','EntraBackup.ReadWrite.Preview','EntraBackup.ReadWrite.Recovery'
    ]
  },
  {
    key: 'network',
    name: 'Acesso de Rede',
    icon: '🌐',
    description: 'Gerenciar políticas de acesso de rede',
    grantedScopes: [],
    pendingScopes: [
      'NetworkAccess.Read.All','NetworkAccess.ReadWrite.All',
      'NetworkAccess-Reports.Read.All'
    ]
  },
  {
    key: 'management_apis',
    name: 'Office 365 Management',
    icon: '⚙️',
    description: 'APIs de gerenciamento, saúde de serviços e feeds de atividade',
    grantedScopes: [
      'ActivityFeed.Read','ActivityFeed.ReadDlp','ServiceHealth.Read'
    ],
    pendingScopes: [
      'BillingConfiguration.ReadWrite.All','BrowserSiteLists.Read.All',
      'BrowserSiteLists.ReadWrite.All','Bookmark.Read.All',
      'BusinessScenarioConfig.Read.OwnedBy','BusinessScenarioConfig.ReadWrite.OwnedBy',
      'BusinessScenarioData.Read.OwnedBy','BusinessScenarioData.ReadWrite.OwnedBy',
      'ChangeManagement.Read.All','Community.Read.All','Community.ReadWrite.All',
      'ConfigurationMonitoring.Read.All','ConfigurationMonitoring.ReadWrite.All',
      'Contracts.Read.All','ManagedTenants.Read.All','ManagedTenants.ReadWrite.All',
      'ServiceActivity-Exchange.Read.All','ServiceActivity-Teams.Read.All',
      'ServiceActivity-OneDrive.Read.All','ServiceActivity-Microsoft365Web.Read.All',
      'WindowsUpdates.Read.All','WindowsUpdates.ReadWrite.All'
    ]
  }
];

/** Retorna categoria por key */
export function getCategory(key: string): MSGraphCategory | undefined {
  return MS_GRAPH_CATEGORIES.find(c => c.key === key);
}

/** Retorna todas as categorias com status de consent */
export function getCategoriesWithStatus() {
  return MS_GRAPH_CATEGORIES.map(cat => ({
    ...cat,
    totalScopes: cat.grantedScopes.length + cat.pendingScopes.length,
    grantedCount: cat.grantedScopes.length,
    hasAnyGranted: cat.grantedScopes.length > 0,
    fullyGranted: cat.pendingScopes.length === 0 && cat.grantedScopes.length > 0,
  }));
}

/** Default permissions (all false) */
export function getDefaultMicrosoftPermissions(): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  for (const cat of MS_GRAPH_CATEGORIES) {
    perms[cat.key] = false;
  }
  return perms;
}
