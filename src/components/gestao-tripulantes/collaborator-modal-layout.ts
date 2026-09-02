/**
 * CollaboratorModal chrome: viewport-filling panel, sticky header/tablist,
 * one body scrollport, inner table scrollports (same overflow-auto + min-h-0
 * model as Man Schedule — no border-collapse tricks).
 */

export const COLLABORATOR_MODAL_OVERLAY_CLASS =
  'fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4';

export const COLLABORATOR_MODAL_PANEL_CLASS =
  'relative flex h-[min(96dvh,calc(100dvh-1.5rem))] max-h-[min(96dvh,calc(100dvh-1.5rem))] w-full max-w-6xl min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[min(96dvh,calc(100dvh-2rem))] sm:max-h-[min(96dvh,calc(100dvh-2rem))]';

export const COLLABORATOR_MODAL_HEADER_CLASS = 'relative z-20 shrink-0';

export const COLLABORATOR_MODAL_TABLIST_SHELL_CLASS =
  'collaborator-modal-tablist-shell relative z-20 shrink-0 border-b border-gray-200 bg-gray-50/80';

export const COLLABORATOR_MODAL_TABLIST_CLASS =
  'collaborator-modal-tablist flex flex-wrap overflow-x-auto overscroll-contain lg:flex-nowrap';

export const COLLABORATOR_MODAL_TAB_BUTTON_CLASS =
  'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4';

export const COLLABORATOR_MODAL_BODY_CLASS =
  'collaborator-modal-body custom-scrollbar flex flex-1 min-h-0 flex-col overflow-auto overscroll-contain';

/** Tab root: fill the body so inner lists/tables can consume leftover height. */
export const COLLABORATOR_MODAL_TAB_FILL_CLASS = 'flex min-h-0 flex-1 flex-col';

/** Table / card-list scrollport inside a TAB_FILL column. */
export const COLLABORATOR_MODAL_TABLE_SCROLL_CLASS =
  'collaborator-modal-table-scroll custom-scrollbar min-h-[8rem] max-h-full flex-1 overflow-auto overscroll-contain';
