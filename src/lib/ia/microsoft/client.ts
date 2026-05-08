/**
 * Cliente Microsoft Graph API
 * Portal ABZ - Integração completa com Microsoft 365
 */
import type { 
  MSGraphUser, 
  MSGraphEmail, 
  MSGraphCalendarEvent,
  MSGraphChat,
  MSGraphTeamsMessage 
} from '@/types/ia-global';

const MS_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID || '';
const MS_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET || '';
const MS_TENANT_ID = process.env.MS_GRAPH_TENANT_ID || 'common';

interface TokenCache {
  accessToken: string;
  expiresAt: Date;
}

let appTokenCache: TokenCache | null = null;

/**
 * Obtém token de acesso via Client Credentials (Application)
 */
async function getAppAccessToken(): Promise<string> {
  // Verificar cache
  if (appTokenCache && appTokenCache.expiresAt > new Date()) {
    return appTokenCache.accessToken;
  }

  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    client_secret: MS_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(`https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error(`Failed to get app token: ${JSON.stringify(data)}`);
  }

  appTokenCache = {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in - 60) * 1000),
  };

  return appTokenCache.accessToken;
}

/**
 * Faz chamada genérica para Microsoft Graph
 */
async function graphCall<T>(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
): Promise<T> {
  const token = await getAppAccessToken();
  
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Graph API error (${response.status}): ${error}`);
  }

  return response.json();
}

// =====================================================
// Users / Directory
// =====================================================

/**
 * Busca usuário por email ou ID
 */
export async function getUser(userIdOrEmail: string): Promise<MSGraphUser | null> {
  try {
    const data = await graphCall<any>(`/users/${userIdOrEmail}`);
    return {
      id: data.id,
      displayName: data.displayName,
      mail: data.mail || data.userPrincipalName,
      userPrincipalName: data.userPrincipalName,
      jobTitle: data.jobTitle,
      department: data.department,
    };
  } catch (error) {
    console.error('[MS Graph] Error getting user:', error);
    return null;
  }
}

/**
 * Busca usuários por nome
 */
export async function searchUsers(searchTerm: string, limit: number = 10): Promise<MSGraphUser[]> {
  try {
    const data = await graphCall<any>(
      `/users?$filter=startswith(displayName,'${searchTerm}')&$top=${limit}&$select=id,displayName,mail,userPrincipalName,jobTitle,department`
    );
    return (data.value || []).map((u: any) => ({
      id: u.id,
      displayName: u.displayName,
      mail: u.mail || u.userPrincipalName,
      userPrincipalName: u.userPrincipalName,
      jobTitle: u.jobTitle,
      department: u.department,
    }));
  } catch (error) {
    console.error('[MS Graph] Error searching users:', error);
    return [];
  }
}

/**
 * Busca gerente de um usuário
 */
export async function getUserManager(userId: string): Promise<MSGraphUser | null> {
  try {
    const data = await graphCall<any>(`/users/${userId}/manager`);
    return {
      id: data.id,
      displayName: data.displayName,
      mail: data.mail || data.userPrincipalName,
      userPrincipalName: data.userPrincipalName,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Busca equipe direta de um usuário
 */
export async function getDirectReports(userId: string): Promise<MSGraphUser[]> {
  try {
    const data = await graphCall<any>(`/users/${userId}/directReports`);
    return (data.value || []).map((u: any) => ({
      id: u.id,
      displayName: u.displayName,
      mail: u.mail || u.userPrincipalName,
      userPrincipalName: u.userPrincipalName,
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Lista todos os usuários do tenant
 */
export async function listUsers(limit: number = 100): Promise<MSGraphUser[]> {
  try {
    const data = await graphCall<any>(`/users?$top=${limit}&$select=id,displayName,mail,userPrincipalName,jobTitle,department`);
    return (data.value || []).map((u: any) => ({
      id: u.id,
      displayName: u.displayName,
      mail: u.mail || u.userPrincipalName,
      userPrincipalName: u.userPrincipalName,
      jobTitle: u.jobTitle,
      department: u.department,
    }));
  } catch (error) {
    return [];
  }
}

// =====================================================
// Mail / Email
// =====================================================

/**
 * Lista e-mails de um usuário
 */
export async function listEmails(userId: string, top: number = 10): Promise<MSGraphEmail[]> {
  try {
    const data = await graphCall<any>(
      `/users/${userId}/messages?$top=${top}&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments`
    );
    return (data.value || []).map((m: any) => ({
      id: m.id,
      subject: m.subject,
      from: m.from,
      receivedDateTime: m.receivedDateTime,
      bodyPreview: m.bodyPreview,
      isRead: m.isRead,
      hasAttachments: m.hasAttachments,
    }));
  } catch (error) {
    console.error('[MS Graph] Error listing emails:', error);
    return [];
  }
}

/**
 * Lê um e-mail específico
 */
export async function getEmail(userId: string, messageId: string): Promise<MSGraphEmail | null> {
  try {
    const data = await graphCall<any>(`/users/${userId}/messages/${messageId}`);
    return {
      id: data.id,
      subject: data.subject,
      from: data.from,
      receivedDateTime: data.receivedDateTime,
      bodyPreview: data.bodyPreview,
      isRead: data.isRead,
      hasAttachments: data.hasAttachments,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Envia e-mail
 */
export async function sendEmail(
  userId: string,
  to: string[],
  subject: string,
  body: string,
  cc?: string[]
): Promise<boolean> {
  try {
    const message = {
      subject,
      body: {
        contentType: 'HTML',
        content: body,
      },
      toRecipients: to.map(email => ({
        emailAddress: { address: email },
      })),
      ...(cc && {
        ccRecipients: cc.map(email => ({
          emailAddress: { address: email },
        })),
      }),
    };

    await graphCall(`/users/${userId}/sendMail`, 'POST', { message });
    return true;
  } catch (error) {
    console.error('[MS Graph] Error sending email:', error);
    return false;
  }
}

// =====================================================
// Calendar
// =====================================================

/**
 * Lista eventos do calendário
 */
export async function listCalendarEvents(
  userId: string,
  startDate?: string,
  endDate?: string,
  top: number = 50
): Promise<MSGraphCalendarEvent[]> {
  let query = `/users/${userId}/calendar/events?$top=${top}&$select=id,subject,start,end,location,organizer,isAllDay`;
  
  if (startDate && endDate) {
    query += `&$filter=start/dateTime ge '${startDate}' and end/dateTime le '${endDate}'`;
  }

  try {
    const data = await graphCall<any>(query);
    return (data.value || []).map((e: any) => ({
      id: e.id,
      subject: e.subject,
      start: e.start,
      end: e.end,
      location: e.location,
      organizer: e.organizer,
      isAllDay: e.isAllDay,
    }));
  } catch (error) {
    console.error('[MS Graph] Error listing calendar events:', error);
    return [];
  }
}

/**
 * Cria evento no calendário
 */
export async function createCalendarEvent(
  userId: string,
  event: {
    subject: string;
    start: string;
    end: string;
    location?: string;
    body?: string;
    attendees?: string[];
  }
): Promise<MSGraphCalendarEvent | null> {
  try {
    const graphEvent = {
      subject: event.subject,
      start: { dateTime: event.start, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: event.end, timeZone: 'America/Sao_Paulo' },
      ...(event.location && { location: { displayName: event.location } }),
      ...(event.body && {
        body: { contentType: 'HTML', content: event.body },
      }),
      ...(event.attendees && {
        attendees: event.attendees.map(a => ({
          emailAddress: { address: a },
          type: 'required',
        })),
      }),
    };

    const data = await graphCall<any>(`/users/${userId}/calendar/events`, 'POST', graphEvent);
    return {
      id: data.id,
      subject: data.subject,
      start: data.start,
      end: data.end,
      location: data.location,
      organizer: data.organizer,
      isAllDay: data.isAllDay,
    };
  } catch (error) {
    console.error('[MS Graph] Error creating calendar event:', error);
    return null;
  }
}

/**
 * Atualiza evento
 */
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  updates: Partial<{
    subject: string;
    start: string;
    end: string;
    location: string;
    body: string;
  }>
): Promise<boolean> {
  try {
    const graphUpdates: any = {};
    if (updates.subject) graphUpdates.subject = updates.subject;
    if (updates.start) graphUpdates.start = { dateTime: updates.start, timeZone: 'America/Sao_Paulo' };
    if (updates.end) graphUpdates.end = { dateTime: updates.end, timeZone: 'America/Sao_Paulo' };
    if (updates.location) graphUpdates.location = { displayName: updates.location };
    if (updates.body) graphUpdates.body = { contentType: 'HTML', content: updates.body };

    await graphCall(`/users/${userId}/calendar/events/${eventId}`, 'PATCH', graphUpdates);
    return true;
  } catch (error) {
    console.error('[MS Graph] Error updating calendar event:', error);
    return false;
  }
}

/**
 * Cancela evento
 */
export async function deleteCalendarEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    await graphCall(`/users/${userId}/calendar/events/${eventId}`, 'DELETE');
    return true;
  } catch (error) {
    return false;
  }
}

// =====================================================
// Teams
// =====================================================

/**
 * Lista chats do Teams
 */
export async function listTeamsChats(userId: string): Promise<MSGraphChat[]> {
  try {
    const data = await graphCall<any>(`/chats?$expand=members&$top=50`);
    return (data.value || []).map((c: any) => ({
      id: c.id,
      topic: c.topic,
      lastMessagePreview: c.lastMessagePreview,
      members: c.members || [],
    }));
  } catch (error) {
    console.error('[MS Graph] Error listing Teams chats:', error);
    return [];
  }
}

/**
 * Lista mensagens de um chat
 */
export async function listChatMessages(chatId: string, top: number = 20): Promise<MSGraphTeamsMessage[]> {
  try {
    const data = await graphCall<any>(`/chats/${chatId}/messages?$top=${top}`);
    return (data.value || []).map((m: any) => ({
      id: m.id,
      body: m.body,
      from: m.from,
      createdDateTime: m.createdDateTime,
    }));
  } catch (error) {
    console.error('[MS Graph] Error listing chat messages:', error);
    return [];
  }
}

/**
 * Envia mensagem no Teams
 */
export async function sendTeamsMessage(chatId: string, message: string): Promise<boolean> {
  try {
    await graphCall(`/chats/${chatId}/messages`, 'POST', {
      body: { contentType: 'html', content: message },
    });
    return true;
  } catch (error) {
    console.error('[MS Graph] Error sending Teams message:', error);
    return false;
  }
}

// =====================================================
// OneDrive / Files
// =====================================================

/**
 * Lista arquivos do OneDrive
 */
export async function listOneDriveFiles(userId: string, path: string = ''): Promise<any[]> {
  try {
    const endpoint = path 
      ? `/users/${userId}/drive/root:/${path}:/children`
      : `/users/${userId}/drive/root/children`;
    const data = await graphCall<any>(endpoint);
    return data.value || [];
  } catch (error) {
    console.error('[MS Graph] Error listing OneDrive files:', error);
    return [];
  }
}

/**
 * Pesquisa arquivos no OneDrive
 */
export async function searchOneDriveFiles(userId: string, query: string): Promise<any[]> {
  try {
    const data = await graphCall<any>(
      `/users/${userId}/drive/root/search(q='${query}')`
    );
    return data.value || [];
  } catch (error) {
    console.error('[MS Graph] Error searching OneDrive files:', error);
    return [];
  }
}

/**
 * Baixa arquivo
 */
export async function downloadOneDriveFile(userId: string, itemId: string): Promise<string | null> {
  try {
    const data = await graphCall<any>(`/users/${userId}/drive/items/${itemId}`);
    return data['@microsoft.graph.downloadUrl'] || null;
  } catch (error) {
    return null;
  }
}

// =====================================================
// Presence
// =====================================================

/**
 * Atualiza presença do usuário
 */
export async function setPresence(userId: string, availability: string): Promise<boolean> {
  try {
    await graphCall(`/users/${userId}/presence/setPresence`, 'POST', {
      availability,
      activity: 'available',
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Obtém presença de usuários
 */
export async function getPresences(userIds: string[]): Promise<Record<string, any>> {
  try {
    const data = await graphCall<any>('/communications/getPresencesByUserId', 'POST', {
      ids: userIds,
    });
    const result: Record<string, any> = {};
    for (const p of data.value || []) {
      result[p.id] = p;
    }
    return result;
  } catch (error) {
    return {};
  }
}

// =====================================================
// Contacts
// =====================================================
export async function listContacts(userId: string, top = 20): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/users/${userId}/contacts?$top=${top}&$select=id,displayName,emailAddresses,businessPhones,companyName,jobTitle`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Groups
// =====================================================
export async function listGroups(top = 50): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/groups?$top=${top}&$select=id,displayName,description,groupTypes,mail,membershipRule`);
    return data.value || [];
  } catch { return []; }
}
export async function getGroupMembers(groupId: string): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/groups/${groupId}/members?$select=id,displayName,mail,userPrincipalName`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Directory / Organization
// =====================================================
export async function getOrganization(): Promise<any> {
  try {
    const data = await graphCall<any>('/organization?$select=id,displayName,verifiedDomains,country,city');
    return data.value?.[0] || null;
  } catch { return null; }
}
export async function listDomains(): Promise<any[]> {
  try {
    const data = await graphCall<any>('/domains');
    return data.value || [];
  } catch { return []; }
}
export async function listAdminUnits(top = 50): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/directory/administrativeUnits?$top=${top}`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Security
// =====================================================
export async function listSecurityAlerts(top = 20): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/security/alerts_v2?$top=${top}&$orderby=createdDateTime desc`);
    return data.value || [];
  } catch { return []; }
}
export async function getSecurityIncidents(top = 10): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/security/incidents?$top=${top}&$orderby=createdDateTime desc`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Audit Logs
// =====================================================
export async function getAuditLogs(top = 20): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/auditLogs/directoryAudits?$top=${top}&$orderby=activityDateTime desc`);
    return data.value || [];
  } catch { return []; }
}
export async function getSignInLogs(top = 20): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/auditLogs/signIns?$top=${top}&$orderby=createdDateTime desc`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Applications
// =====================================================
export async function listApplications(top = 50): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/applications?$top=${top}&$select=id,displayName,appId,signInAudience,createdDateTime`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Devices
// =====================================================
export async function listDevices(top = 50): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/devices?$top=${top}&$select=id,displayName,operatingSystem,operatingSystemVersion,isCompliant,isManaged`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Access Reviews (Compliance)
// =====================================================
export async function listAccessReviews(): Promise<any[]> {
  try {
    const data = await graphCall<any>('/identityGovernance/accessReviews/definitions?$top=20');
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Notes (OneNote)
// =====================================================
export async function listNotebooks(userId: string): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/users/${userId}/onenote/notebooks?$select=id,displayName,createdDateTime,lastModifiedDateTime`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Tasks (To Do)
// =====================================================
export async function listTaskLists(userId: string): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/users/${userId}/todo/lists`);
    return data.value || [];
  } catch { return []; }
}
export async function listTasks(userId: string, listId: string): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/users/${userId}/todo/lists/${listId}/tasks?$top=50`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// SharePoint Sites
// =====================================================
export async function listSites(search?: string): Promise<any[]> {
  try {
    const q = search ? `/sites?search=${encodeURIComponent(search)}&$top=20` : '/sites?$top=20';
    const data = await graphCall<any>(q);
    return data.value || [];
  } catch { return []; }
}
export async function getSiteLists(siteId: string): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/sites/${siteId}/lists?$select=id,displayName,description,createdDateTime`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Bookings
// =====================================================
export async function listBookingBusinesses(): Promise<any[]> {
  try {
    const data = await graphCall<any>('/solutions/bookingBusinesses');
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Teams Channels
// =====================================================
export async function listTeamChannels(teamId: string): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/teams/${teamId}/channels?$select=id,displayName,description,membershipType`);
    return data.value || [];
  } catch { return []; }
}
export async function listChannelMessages(teamId: string, channelId: string, top = 20): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/teams/${teamId}/channels/${channelId}/messages?$top=${top}`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Online Meetings
// =====================================================
export async function listOnlineMeetings(userId: string): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/users/${userId}/onlineMeetings?$top=20&$orderby=startDateTime desc`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Service Health (Management APIs)
// =====================================================
export async function getServiceHealth(): Promise<any[]> {
  try {
    const data = await graphCall<any>('/admin/serviceAnnouncement/healthOverviews');
    return data.value || [];
  } catch { return []; }
}
export async function getServiceIssues(): Promise<any[]> {
  try {
    const data = await graphCall<any>('/admin/serviceAnnouncement/issues?$top=20&$orderby=startDateTime desc');
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// Advanced Mail Search
// =====================================================

/**
 * Busca avançada de e-mails com filtros OData
 */
export async function searchEmails(
  userId: string,
  query?: string,
  options?: {
    from?: string;
    subject?: string;
    dateFrom?: string;
    dateTo?: string;
    folder?: string;
    hasAttachments?: boolean;
    isRead?: boolean;
    top?: number;
  }
): Promise<MSGraphEmail[]> {
  try {
    const top = options?.top || 50;
    const filters: string[] = [];

    if (options?.from) {
      filters.push(`from/emailAddress/address eq '${options.from}'`);
    }
    if (options?.subject) {
      filters.push(`contains(subject, '${options.subject}')`);
    }
    if (options?.dateFrom) {
      filters.push(`receivedDateTime ge ${options.dateFrom}T00:00:00Z`);
    }
    if (options?.dateTo) {
      filters.push(`receivedDateTime le ${options.dateTo}T23:59:59Z`);
    }
    if (options?.hasAttachments !== undefined) {
      filters.push(`hasAttachments eq ${options.hasAttachments}`);
    }
    if (options?.isRead !== undefined) {
      filters.push(`isRead eq ${options.isRead}`);
    }

    let endpoint = `/users/${userId}/messages?$top=${top}&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments&$orderby=receivedDateTime desc`;

    if (filters.length > 0) {
      endpoint += `&$filter=${filters.join(' and ')}`;
    }

    // Se tiver query textual, usar $search ao invés de $filter para subject/body
    if (query && !options?.subject) {
      endpoint = `/users/${userId}/messages?$top=${top}&$search="${encodeURIComponent(query)}"&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments`;
    }

    const folder = options?.folder;
    if (folder) {
      endpoint = endpoint.replace(`/users/${userId}/messages`, `/users/${userId}/mailFolders/${folder}/messages`);
    }

    const data = await graphCall<any>(endpoint);
    return (data.value || []).map((m: any) => ({
      id: m.id,
      subject: m.subject,
      from: m.from,
      receivedDateTime: m.receivedDateTime,
      bodyPreview: m.bodyPreview,
      isRead: m.isRead,
      hasAttachments: m.hasAttachments,
    }));
  } catch (error) {
    console.error('[MS Graph] Error searching emails:', error);
    return [];
  }
}

// =====================================================
// OneNote - Create Page
// =====================================================

/**
 * Cria uma página no OneNote
 */
export async function createOneNotePage(
  userId: string,
  sectionId: string,
  title: string,
  htmlContent: string
): Promise<any> {
  try {
    const pageHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>${title}</title></head>
        <body>
          <h1>${title}</h1>
          ${htmlContent}
          <p style="color: gray; font-size: 10px;">Criado pelo Assistente IA — ABZ Group Portal — ${new Date().toLocaleString('pt-BR')}</p>
        </body>
      </html>
    `;

    const token = await getAppAccessToken();
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${userId}/onenote/sections/${sectionId}/pages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/xhtml+xml',
        },
        body: pageHtml,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OneNote API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return { id: data.id, title: data.title, link: data.links?.oneNoteWebUrl?.href };
  } catch (error) {
    console.error('[MS Graph] Error creating OneNote page:', error);
    return null;
  }
}

/**
 * Lista seções de um notebook do OneNote
 */
export async function listNotebookSections(userId: string, notebookId: string): Promise<any[]> {
  try {
    const data = await graphCall<any>(`/users/${userId}/onenote/notebooks/${notebookId}/sections?$select=id,displayName`);
    return data.value || [];
  } catch { return []; }
}

// =====================================================
// To Do - Create Task
// =====================================================

/**
 * Cria uma tarefa no Microsoft To Do
 */
export async function createToDoTask(
  userId: string,
  listId: string,
  task: {
    title: string;
    body?: string;
    dueDate?: string;
    importance?: 'low' | 'normal' | 'high';
    reminderDateTime?: string;
  }
): Promise<any> {
  try {
    const taskBody: any = {
      title: task.title,
      importance: task.importance || 'normal',
    };

    if (task.body) {
      taskBody.body = { content: task.body, contentType: 'text' };
    }

    if (task.dueDate) {
      taskBody.dueDateTime = {
        dateTime: `${task.dueDate}T23:59:00`,
        timeZone: 'America/Sao_Paulo',
      };
    }

    if (task.reminderDateTime) {
      taskBody.isReminderOn = true;
      taskBody.reminderDateTime = {
        dateTime: task.reminderDateTime,
        timeZone: 'America/Sao_Paulo',
      };
    }

    const data = await graphCall<any>(`/users/${userId}/todo/lists/${listId}/tasks`, 'POST', taskBody);
    return { id: data.id, title: data.title, status: data.status };
  } catch (error) {
    console.error('[MS Graph] Error creating To Do task:', error);
    return null;
  }
}

// Exporta o cliente
export const msGraphClient = {
  // Users
  getUser, searchUsers, getUserManager, getDirectReports, listUsers,
  // Mail
  listEmails, getEmail, sendEmail, searchEmails,
  // Calendar
  listCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
  // Contacts
  listContacts,
  // Groups
  listGroups, getGroupMembers,
  // Directory
  getOrganization, listDomains, listAdminUnits,
  // Teams
  listTeamsChats, listChatMessages, sendTeamsMessage, listTeamChannels, listChannelMessages,
  // Calls/Meetings
  listOnlineMeetings,
  // Files
  listOneDriveFiles, searchOneDriveFiles, downloadOneDriveFile,
  // SharePoint
  listSites, getSiteLists,
  // Notes
  listNotebooks, listNotebookSections, createOneNotePage,
  // Tasks
  listTaskLists, listTasks, createToDoTask,
  // Security
  listSecurityAlerts, getSecurityIncidents,
  // Audit
  getAuditLogs, getSignInLogs,
  // Applications
  listApplications,
  // Devices
  listDevices,
  // Compliance
  listAccessReviews,
  // Bookings
  listBookingBusinesses,
  // Presence
  setPresence, getPresences,
  // Service Health
  getServiceHealth, getServiceIssues,
};

export default msGraphClient;