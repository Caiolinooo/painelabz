export interface PurchaseRequest {
    id: string;
    rqf_number: string;
    provider_name: string;
    provider_cnpj: string;
    provider_email: string;
    buyer_name: string;
    payment_terms: string;
    delivery_date: string;
    delivery_address: string;
    observation: string;
    sector_id: string;
    total_value: number;
    status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface PurchaseRequestItem {
    id: string;
    purchase_request_id: string;
    description: string;
    quantity: number;
    unit_value: number;
    total_value: number;
}

export interface ApprovalFlow {
    id: string;
    purchase_request_id: string;
    current_step: 'pending' | 'approved' | 'rejected';
    approved_by?: string;
    approved_at?: string;
    rejected_by?: string;
    rejected_at?: string;
    created_at: string;
    updated_at: string;
}