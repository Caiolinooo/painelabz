// ==================== CA LOOKUP ====================

export type CAStatus = 'VÁLIDO' | 'VENCIDO' | 'SUSPENSO' | 'CANCELADO' | 'DESCONHECIDO';

export interface CALookupResult {
    ca_number: string;
    validity_date: string | null;
    status: CAStatus;
    manufacturer: string;
    equipment_name: string;
    equipment_description: string;
    brand: string;
    process_number: string;
    norm: string;
    source: 'cache' | 'ftp' | 'scraping' | 'manual' | 'mte' | 'api';
    last_synced: string;
}

/**
 * Determines CA validity category for UI display
 * 'valid' = green, 'expiring' = yellow (≤90 days), 'expired' = red
 */
export type CAValidityLevel = 'valid' | 'expiring' | 'expired' | 'unknown';

export function getCAValidityLevel(validityDate?: string | null, caStatus?: string | null): CAValidityLevel {
    if (!validityDate) return 'unknown';
    if (caStatus && ['VENCIDO', 'SUSPENSO', 'CANCELADO'].includes(caStatus)) return 'expired';
    const now = new Date();
    const expiry = new Date(validityDate);
    if (isNaN(expiry.getTime())) return 'unknown';
    if (expiry <= now) return 'expired';
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= 90) return 'expiring';
    return 'valid';
}

export const CA_VALIDITY_COLORS: Record<CAValidityLevel, string> = {
    valid: 'bg-green-100 text-green-800',
    expiring: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-600',
};

export const CA_VALIDITY_LABELS: Record<CAValidityLevel, string> = {
    valid: 'CA Válido',
    expiring: 'CA Próximo de Vencer',
    expired: 'CA Vencido',
    unknown: 'CA -',
};

// ==================== EPI CORE TYPES ====================

export interface EPIRegistration {
    id: string;
    user_id: string;
    equipment_type: string;
    quantity: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'delivered' | 'returned';
    observation?: string;
    approved_by?: string;
    approved_at?: string;
    validity_date?: string; // Date when the EPI expires
    equipment_ca?: string; // Override default CA
    ca_validity_date?: string; // Cached CA validity from lookup
    ca_status?: string; // Cached CA status from lookup
    signature_url?: string;
    signed_at?: string;
    delivered_at?: string;
    created_at: string;
    updated_at: string;
}

export interface EPIType {
    id: string;
    name: string;
    description?: string;
    category: string;
    ca_number?: string;
    ca_validity_date?: string;
    ca_status?: string;
    ca_manufacturer?: string;
    ca_equipment_name?: string;
    is_required: boolean;
    created_at: string;
}

export interface EPICreateRequest {
    equipment_type: string;
    quantity: number;
    reason: string;
}

export interface EPIUpdateRequest {
    status?: 'pending' | 'approved' | 'rejected' | 'delivered' | 'returned';
    observation?: string;
    validity_date?: string;
    equipment_ca?: string;
}

export interface EPISectorResponsible {
    id: string;
    sector_id: string;
    user_id: string;
    created_at: string;
}

export interface EPIWithUser extends EPIRegistration {
    user_name?: string;
    user_email?: string;
    user_sector?: string;
    user_position?: string;
    equipment_ca?: string;
}

export type EPIStatus = EPIRegistration['status'];

export const EPI_STATUS_LABELS: Record<EPIStatus, string> = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Reprovado',
    delivered: 'Entregue',
    returned: 'Devolvido'
};

export const EPI_STATUS_COLORS: Record<EPIStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    delivered: 'bg-blue-100 text-blue-800',
    returned: 'bg-gray-100 text-gray-800'
};

export interface EPIKit {
    id: string;
    name: string;
    description?: string;
    sector_id?: string;
    created_at: string;
    updated_at: string;
}

export interface EPIKitItem {
    id: string;
    kit_id: string;
    epi_type_id: string;
    quantity: number;
    is_mandatory: boolean;
    created_at: string;
    epi_type?: EPIType; // Joined
}

export interface EPIKitWithItems extends EPIKit {
    items: EPIKitItem[];
}

export interface CreateKitRequest {
    name: string;
    description?: string;
    sector_id?: string;
    items: {
        epi_type_id: string;
        quantity: number;
        is_mandatory: boolean;
    }[];
}

export interface UpdateKitRequest {
    name?: string;
    description?: string;
    sector_id?: string;
    items?: {
        id?: string; // If present, update. If not, create.
        epi_type_id: string;
        quantity: number;
        is_mandatory: boolean;
    }[];
}

// ==================== STOCK CONTROL ====================

export type StockMovementType = 'entry' | 'exit' | 'adjustment' | 'return';

export interface EPIStock {
    id: string;
    epi_type_id: string;
    current_quantity: number;
    minimum_quantity: number;
    unit: string; // unid., Pacote, Pacote/100
    location: string;
    last_restocked_at?: string;
    created_at: string;
    updated_at: string;
}

export interface EPIStockMovement {
    id: string;
    stock_id?: string;
    epi_type_id: string;
    movement_type: StockMovementType;
    quantity: number;
    previous_quantity: number;
    new_quantity: number;
    reason?: string;
    reference_id?: string;
    performed_by?: string;
    created_at: string;
    // Joined
    performer_name?: string;
    epi_type_name?: string;
}

export interface EPIStockWithType extends EPIStock {
    epi_type?: EPIType;
    is_low_stock?: boolean;
}

export interface CreateStockMovementRequest {
    epi_type_id: string;
    movement_type: StockMovementType;
    quantity: number;
    reason?: string;
    reference_id?: string;
}
