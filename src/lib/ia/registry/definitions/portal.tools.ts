/**
 * Ferramentas de navegação do AI Companion / Portal Action Bus
 */
import { registerTool } from '../tools-registry';
import type { IATool, IAToolResult } from '@/types/ia-global';
import { aliasToPath, buildNavCommand, resolvePortalNavigation } from '../../portal-navigation';

const navegarPortalTool: IATool = {
  id: 'portal_navegar',
  name: 'navegar_portal',
  description: 'Gera comando NAVIGATE para o AI Companion (typos/sinônimos ok)',
  module: 'portal',
  adminOnly: false,
  definition: {
    name: 'navegar_portal',
    description: 'Navega o usuário para um módulo do portal (ex: ferias, reembolso, kpi, /kpi, tripulantes)',
    parameters: {
      type: 'object',
      properties: {
        destino: { type: 'string', description: 'Alias, frase ou path: ferias, reembolso, kpi, /kpi, tripulantes, academy, …', required: true },
        highlight: { type: 'string', description: 'CSS selector opcional', required: false },
      },
      required: ['destino'],
    },
  },
  handler: async (args): Promise<IAToolResult> => {
    const destino = String(args.destino || '').trim();
    if (!destino) return { success: false, error: 'destino obrigatório' };

    const match = resolvePortalNavigation(destino);
    const path = match && match.score >= 0.78 ? match.route.path : aliasToPath(destino);
    const commands = [
      match && match.score >= 0.78
        ? buildNavCommand(match)
        : { action: 'NAVIGATE' as const, target: path, label: `Navegando para ${path}...` },
    ];
    if (args.highlight) {
      commands.push({
        action: 'HIGHLIGHT_ELEMENT' as const,
        target: String(args.highlight),
        label: 'Destacando elemento',
      });
    }

    return {
      success: true,
      data: { path, commands, match },
    };
  },
};

export async function registerTools() {
  registerTool(navegarPortalTool);
  console.log('[IA Tools] Portal/Companion loaded (1 tool)');
}
