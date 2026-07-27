/**
 * Ferramentas de navegação do AI Companion / Portal Action Bus
 */
import { registerTool } from '../tools-registry';
import type { IATool, IAToolResult } from '@/types/ia-global';

const PORTAL_ALIASES: Record<string, string> = {
  ferias: '/ferias',
  reembolso: '/reembolso',
  reembolsos: '/reembolso',
  dashboard: '/dashboard',
  inicio: '/dashboard',
  home: '/dashboard',
  admin: '/admin',
  tripulantes: '/department/gestao-tripulantes',
  'gestao-tripulantes': '/department/gestao-tripulantes',
  academy: '/academy',
  epi: '/epi',
  ponto: '/ponto',
  compras: '/compras',
  calendario: '/calendario',
  'e-social': '/department/e-social',
  esocial: '/department/e-social',
  ia: '/ia',
};

const navegarPortalTool: IATool = {
  id: 'portal_navegar',
  name: 'navegar_portal',
  description: 'Gera comando NAVIGATE para o AI Companion',
  module: 'portal',
  adminOnly: false,
  definition: {
    name: 'navegar_portal',
    description: 'Navega o usuário para um módulo do portal',
    parameters: {
      type: 'object',
      properties: {
        destino: { type: 'string', description: 'Alias ou path /...', required: true },
        highlight: { type: 'string', description: 'CSS selector opcional', required: false },
      },
      required: ['destino'],
    },
  },
  handler: async (args): Promise<IAToolResult> => {
    const destino = String(args.destino || '').trim();
    if (!destino) return { success: false, error: 'destino obrigatório' };

    const path = destino.startsWith('/')
      ? destino
      : (PORTAL_ALIASES[destino.toLowerCase()] || `/${destino}`);

    const commands: Array<{ action: string; target: string; label: string }> = [
      { action: 'NAVIGATE', target: path, label: `Navegando para ${path}` },
    ];
    if (args.highlight) {
      commands.push({
        action: 'HIGHLIGHT_ELEMENT',
        target: String(args.highlight),
        label: 'Destacando elemento',
      });
    }

    return {
      success: true,
      data: { path, commands },
    };
  },
};

export async function registerTools() {
  registerTool(navegarPortalTool);
  console.log('[IA Tools] Portal/Companion loaded (1 tool)');
}
