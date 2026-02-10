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


