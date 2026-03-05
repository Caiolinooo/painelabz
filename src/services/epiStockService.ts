/**
 * EPI Stock Control Service
 * Manages inventory levels for EPI types with full movement tracking.
 */

import { supabaseAdmin } from '@/lib/db';
import type { EPIStock, EPIStockMovement, EPIStockWithType, StockMovementType } from '@/types/epi';
import { checkAndNotifyLowStock } from '@/services/epiStockNotifications';

// ==================== STOCK LEVELS ====================

/**
 * Get all stock levels with EPI type info.
 */
export async function getStockLevels(): Promise<EPIStockWithType[]> {
    const { data, error } = await supabaseAdmin
        .from('epi_stock')
        .select(`
            *,
            epi_types!epi_stock_epi_type_id_fkey (
                id, name, category, description, ca_number,
                ca_validity_date, ca_status, ca_manufacturer, ca_equipment_name
            )
        `)
        .order('updated_at', { ascending: false });

    if (error) throw new Error(`Erro ao buscar estoque: ${error.message}`);

    return (data || []).map((item: any) => ({
        ...item,
        epi_type: item.epi_types,
        is_low_stock: item.current_quantity <= item.minimum_quantity,
    }));
}

/**
 * Get stock for a specific EPI type.
 */
export async function getStockByType(epiTypeId: string): Promise<EPIStock | null> {
    const { data, error } = await supabaseAdmin
        .from('epi_stock')
        .select('*')
        .eq('epi_type_id', epiTypeId)
        .single();

    if (error && error.code !== 'PGRST116') throw new Error(`Erro ao buscar estoque: ${error.message}`);
    return data || null;
}

/**
 * Get low stock alerts (items at or below minimum).
 */
export async function getLowStockAlerts(): Promise<EPIStockWithType[]> {
    const { data, error } = await supabaseAdmin
        .rpc('get_low_stock_items');

    // If RPC doesn't exist, fallback to manual filter
    if (error) {
        const allStock = await getStockLevels();
        return allStock.filter(s => s.is_low_stock);
    }

    return data || [];
}

// ==================== STOCK OPERATIONS ====================

/**
 * Ensure a stock record exists for the given EPI type, creating one if needed.
 */
async function ensureStockRecord(epiTypeId: string): Promise<EPIStock> {
    const existing = await getStockByType(epiTypeId);
    if (existing) return existing;

    const { data, error } = await supabaseAdmin
        .from('epi_stock')
        .insert({
            epi_type_id: epiTypeId,
            current_quantity: 0,
            minimum_quantity: 5,
            location: '',
        })
        .select()
        .single();

    if (error) throw new Error(`Erro ao criar registro de estoque: ${error.message}`);
    return data;
}

/**
 * Record a stock movement and update the current quantity.
 */
async function recordMovement(
    epiTypeId: string,
    movementType: StockMovementType,
    quantity: number,
    reason: string,
    performedBy: string,
    referenceId?: string
): Promise<EPIStockMovement> {
    const stock = await ensureStockRecord(epiTypeId);
    const previousQty = stock.current_quantity;

    let newQty: number;
    switch (movementType) {
        case 'entry':
        case 'return':
            newQty = previousQty + quantity;
            break;
        case 'exit':
            newQty = Math.max(0, previousQty - quantity);
            break;
        case 'adjustment':
            newQty = quantity; // Adjustment sets absolute value
            break;
        default:
            throw new Error(`Tipo de movimentação inválido: ${movementType}`);
    }

    // 1. Record movement FIRST
    const { data: movement, error: movementError } = await supabaseAdmin
        .from('epi_stock_movements')
        .insert({
            stock_id: stock.id,
            epi_type_id: epiTypeId,
            movement_type: movementType,
            quantity,
            previous_quantity: previousQty,
            new_quantity: newQty,
            reason,
            reference_id: referenceId || null,
            performed_by: performedBy,
        })
        .select()
        .single();

    if (movementError) throw new Error(`Erro ao registrar movimentação: ${movementError.message}`);

    // 2. Update stock level SECOND
    const updateData: any = {
        current_quantity: newQty,
        updated_at: new Date().toISOString(),
    };
    if (movementType === 'entry') {
        updateData.last_restocked_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
        .from('epi_stock')
        .update(updateData)
        .eq('id', stock.id);

    if (updateError) {
        // Warning: At this point the movement is recorded but stock update failed.
        // In a perfect world we would use a true SQL transaction or RPC to prevent this,
        // but since we are relying on separate REST calls, it's safer to log before updating.
        throw new Error(`Erro ao atualizar estoque: ${updateError.message}`);
    }

    // Check for low stock and notify if needed
    try {
        await checkAndNotifyLowStock(epiTypeId, newQty, stock.minimum_quantity);
    } catch (notifyErr) {
        console.error('⚠️ Failed to send low stock notification:', notifyErr);
    }

    return movement;
}

/**
 * Add stock entry (restock).
 */
export async function addStockEntry(
    epiTypeId: string,
    quantity: number,
    reason: string,
    performedBy: string
): Promise<EPIStockMovement> {
    if (quantity <= 0) throw new Error('Quantidade deve ser maior que zero');
    return recordMovement(epiTypeId, 'entry', quantity, reason, performedBy);
}

/**
 * Deduct stock (delivery/exit).
 */
export async function deductStock(
    epiTypeId: string,
    quantity: number,
    reason: string,
    performedBy: string,
    referenceId?: string
): Promise<EPIStockMovement> {
    if (quantity <= 0) throw new Error('Quantidade deve ser maior que zero');
    return recordMovement(epiTypeId, 'exit', quantity, reason, performedBy, referenceId);
}

/**
 * Adjust stock to absolute value.
 */
export async function adjustStock(
    epiTypeId: string,
    newQuantity: number,
    reason: string,
    performedBy: string
): Promise<EPIStockMovement> {
    if (newQuantity < 0) throw new Error('Quantidade não pode ser negativa');
    return recordMovement(epiTypeId, 'adjustment', newQuantity, reason, performedBy);
}

/**
 * Return stock (EPI returned by user).
 */
export async function returnStock(
    epiTypeId: string,
    quantity: number,
    reason: string,
    performedBy: string,
    referenceId?: string
): Promise<EPIStockMovement> {
    if (quantity <= 0) throw new Error('Quantidade deve ser maior que zero');
    return recordMovement(epiTypeId, 'return', quantity, reason, performedBy, referenceId);
}

/**
 * Update stock configuration (minimum quantity, location).
 */
export async function updateStockConfig(
    stockId: string,
    data: { minimum_quantity?: number; location?: string }
): Promise<void> {
    const { error } = await supabaseAdmin
        .from('epi_stock')
        .update({
            ...data,
            updated_at: new Date().toISOString(),
        })
        .eq('id', stockId);

    if (error) throw new Error(`Erro ao atualizar configuração: ${error.message}`);
}

// ==================== MOVEMENT HISTORY ====================

/**
 * Get stock movements with optional filters.
 */
export async function getStockMovements(
    epiTypeId?: string,
    limit: number = 50
): Promise<EPIStockMovement[]> {
    let query = supabaseAdmin
        .from('epi_stock_movements')
        .select(`
            *,
            epi_types!epi_stock_movements_epi_type_id_fkey ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (epiTypeId) {
        query = query.eq('epi_type_id', epiTypeId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Erro ao buscar movimentações: ${error.message}`);

    // Fetch performer names
    const performerIds = [...new Set((data || []).filter(m => m.performed_by).map(m => m.performed_by))];
    let performerMap: Record<string, string> = {};

    if (performerIds.length > 0) {
        const { data: users } = await supabaseAdmin
            .from('users_unified')
            .select('id, first_name, last_name')
            .in('id', performerIds);

        if (users) {
            performerMap = Object.fromEntries(
                users.map(u => [u.id, `${u.first_name || ''} ${u.last_name || ''}`.trim()])
            );
        }
    }

    return (data || []).map((m: any) => ({
        ...m,
        epi_type_name: m.epi_types?.name || '',
        performer_name: m.performed_by ? (performerMap[m.performed_by] || 'Desconhecido') : 'Sistema',
    }));
}

// ==================== STOCK STATS ====================

/**
 * Get stock statistics for dashboard.
 */
export async function getStockStats(): Promise<{
    total_types_tracked: number;
    total_items_in_stock: number;
    low_stock_count: number;
    last_restock_date: string | null;
}> {
    const stocks = await getStockLevels();

    const totalItems = stocks.reduce((sum, s) => sum + s.current_quantity, 0);
    const lowStockCount = stocks.filter(s => s.is_low_stock).length;

    const restockDates = stocks
        .filter(s => s.last_restocked_at)
        .map(s => new Date(s.last_restocked_at!).getTime());

    const lastRestock = restockDates.length > 0
        ? new Date(Math.max(...restockDates)).toISOString()
        : null;

    return {
        total_types_tracked: stocks.length,
        total_items_in_stock: totalItems,
        low_stock_count: lowStockCount,
        last_restock_date: lastRestock,
    };
}

/**
 * Initialize stock records for all EPI types that don't have one yet.
 */
export async function initializeStockForAllTypes(): Promise<number> {
    const { data: types, error: typesError } = await supabaseAdmin
        .from('epi_types')
        .select('id');

    if (typesError || !types) return 0;

    let created = 0;
    for (const type of types) {
        const existing = await getStockByType(type.id);
        if (!existing) {
            await ensureStockRecord(type.id);
            created++;
        }
    }
    return created;
}
