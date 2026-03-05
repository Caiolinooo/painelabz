import { supabase, supabaseAdmin } from '@/lib/db';
import { EPIRegistration, EPIType, EPICreateRequest, EPIUpdateRequest, EPIWithUser, EPISectorResponsible } from '@/types/epi';
import { distributeNotification } from '@/lib/notificationService';

/**
 * EPI Service - Operations for EPI registrations and types
 * Using supabaseAdmin for all queries to bypass RLS since we validate auth in the API routes
 */

// ==================== EPI REGISTRATIONS ====================

/**
 * Get all EPI registrations for a user
 */
export async function getUserEPIRegistrations(userId: string): Promise<EPIWithUser[]> {
    const { data, error } = await supabaseAdmin
        .from('epi_registrations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching EPI registrations:', error);
        throw new Error(`Erro ao buscar registros de EPI: ${error.message}`);
    }

    // Fetch all EPI types to map CA numbers
    const { data: epiTypes } = await supabaseAdmin
        .from('epi_types')
        .select('name, ca_number');

    const typesMap = (epiTypes || []).reduce((acc: any, type: any) => {
        acc[type.name] = type.ca_number;
        return acc;
    }, {});

    return (data || []).map((item: any) => ({
        ...item,
        equipment_ca: typesMap[item.equipment_type] || ''
    }));
}

/**
 * Get all EPI registrations (for admins)
 */
export async function getAllEPIRegistrations(status?: string): Promise<EPIWithUser[]> {
    let query = supabaseAdmin
        .from('epi_registrations')
        .select(`
            *,
            user:user_id (
                id,
                name,
                email,
                sector_id,
                position,
                department
            )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching all EPI registrations:', error);
        throw new Error(`Erro ao buscar registros de EPI: ${error.message}`);
    }

    // Fetch all EPI types to map CA numbers
    const { data: epiTypes } = await supabaseAdmin
        .from('epi_types')
        .select('name, ca_number');

    const typesMap = (epiTypes || []).reduce((acc: any, type: any) => {
        acc[type.name] = type.ca_number;
        return acc;
    }, {});

    // Fetch all sectors to resolve sector_id → name
    const { data: sectors } = await supabaseAdmin
        .from('sectors')
        .select('id, name');

    const sectorsMap = (sectors || []).reduce((acc: any, s: any) => {
        acc[s.id] = s.name;
        return acc;
    }, {});

    // Transform data to flatten user info
    return (data || []).map((item: any) => {
        const sectorId = item.user?.sector_id;
        const sectorName = sectorId ? sectorsMap[sectorId] : null;
        return {
            ...item,
            user_name: item.user?.name,
            user_email: item.user?.email,
            user_sector: sectorName || item.user?.department || '',
            user_position: item.user?.position || '',
            equipment_ca: typesMap[item.equipment_type] || ''
        };
    });
}

/**
 * Get a single EPI registration by ID
 */
export async function getEPIRegistrationById(id: string): Promise<EPIRegistration | null> {
    const { data, error } = await supabaseAdmin
        .from('epi_registrations')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null; // Not found
        }
        console.error('Error fetching EPI registration:', error);
        throw new Error(`Erro ao buscar registro de EPI: ${error.message}`);
    }

    return data;
}

/**
 * Create a new EPI registration
 */
export async function createEPIRegistration(userId: string, request: EPICreateRequest): Promise<EPIRegistration> {
    const { data, error } = await supabaseAdmin
        .from('epi_registrations')
        .insert({
            user_id: userId,
            equipment_type: request.equipment_type,
            quantity: request.quantity,
            reason: request.reason,
            status: 'pending'
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating EPI registration:', error);
        throw new Error(`Erro ao criar registro de EPI: ${error.message}`);
    }

    return data;
}

/**
 * Update an EPI registration (status, observation, etc.)
 */
export async function updateEPIRegistration(id: string, data: EPIUpdateRequest): Promise<void> {
    const updateData: any = {
        updated_at: new Date().toISOString()
    };

    if (data.status) updateData.status = data.status;
    if (data.observation) updateData.observation = data.observation;
    if (data.status === 'approved') {
        const user = await supabase.auth.getUser();
        updateData.approved_by = user.data.user?.id;
        updateData.approved_at = new Date().toISOString();
    }
    if (data.validity_date) updateData.validity_date = data.validity_date;
    if (data.equipment_ca) updateData.equipment_ca = data.equipment_ca; // Handle CA Override

    if (data.status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
        .from('epi_registrations')
        .update(updateData)
        .eq('id', id);

    if (error) {
        throw new Error(`Erro ao atualizar registro de EPI: ${error.message}`);
    }

    // Fetch registration details for notifications + stock
    const { data: registration } = await supabaseAdmin
        .from('epi_registrations')
        .select('user_id, equipment_type, quantity, epi_type_id')
        .eq('id', id)
        .single();

    // Stock control: auto-deduct on delivery, auto-return on return
    if (registration && data.status) {
        try {
            const { deductStock: deductStockFn, returnStock: returnStockFn } = await import('@/services/epiStockService');

            if (data.status === 'delivered' && registration.epi_type_id) {
                await deductStockFn(
                    registration.epi_type_id,
                    registration.quantity || 1,
                    `Entrega de EPI: ${registration.equipment_type}`,
                    'system',
                    id
                );
                console.log(`[EPI Stock] Deducted ${registration.quantity || 1} from stock for type ${registration.epi_type_id}`);
            }

            if (data.status === 'returned' && registration.epi_type_id) {
                await returnStockFn(
                    registration.epi_type_id,
                    registration.quantity || 1,
                    `Devolução de EPI: ${registration.equipment_type}`,
                    'system',
                    id
                );
                console.log(`[EPI Stock] Returned ${registration.quantity || 1} to stock for type ${registration.epi_type_id}`);
            }
        } catch (stockError) {
            console.warn('[EPI Stock] Stock operation failed (non-blocking):', stockError);
        }
    }

    // Notifications
    try {
        if (registration && data.status) {
            await distributeNotification({
                recipients: [registration.user_id],
                type: 'system',
                title: 'Atualização de EPI',
                message: `Seu pedido de ${registration.equipment_type} foi atualizado para: ${data.status === 'approved' ? 'Aprovado' : data.status === 'rejected' ? 'Reprovado' : data.status === 'delivered' ? 'Entregue' : data.status}.`,
                link: '/epi',
                resource_id: id
            });
        }
    } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
    }
}


// Sector Responsibles Management

export async function getSectorResponsibles(sectorId?: string): Promise<EPISectorResponsible[]> {
    let query = supabaseAdmin.from('epi_sector_responsibles').select('*');

    if (sectorId) {
        query = query.eq('sector_id', sectorId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching sector responsibles:', error);
        throw new Error('Erro ao buscar responsáveis pelo setor');
    }

    return data || [];
}

export async function addSectorResponsible(sectorId: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('epi_sector_responsibles')
        .insert({ sector_id: sectorId, user_id: userId });

    if (error) {
        console.error('Error adding sector responsible:', error);
        throw new Error('Erro ao adicionar responsável');
    }
}

export async function removeSectorResponsible(id: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('epi_sector_responsibles')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error removing sector responsible:', error);
        throw new Error('Erro ao remover responsável');
    }
}

export async function getSectors(): Promise<string[]> {
    // Fetch distinct departments from users_unified to use as sectors
    const { data, error } = await supabaseAdmin
        .from('users_unified')
        .select('department')
        .not('department', 'is', null);

    if (error) {
        console.error('Error fetching sectors:', error);
        return [];
    }

    // Extract unique departments and filter out empty strings
    const sectors = Array.from(new Set(data.map((u: any) => u.department).filter(Boolean)));
    return sectors.sort();
}

/**
 * Cancel (delete) an EPI registration
 * Only pending requests can be cancelled
 */
export async function cancelEPIRegistration(id: string, userId: string): Promise<void> {
    // First check if the registration exists and belongs to the user
    const registration = await getEPIRegistrationById(id);

    if (!registration) {
        throw new Error('Registro de EPI não encontrado');
    }

    if (registration.user_id !== userId) {
        throw new Error('Você não tem permissão para cancelar este registro');
    }

    if (registration.status !== 'pending') {
        throw new Error('Apenas solicitações pendentes podem ser canceladas');
    }

    const { error } = await supabaseAdmin
        .from('epi_registrations')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error cancelling EPI registration:', error);
        throw new Error(`Erro ao cancelar registro de EPI: ${error.message}`);
    }
}

// ==================== EPI TYPES ====================

/**
 * Get all EPI types
 */
export async function getEPITypes(): Promise<EPIType[]> {
    const { data, error } = await supabaseAdmin
        .from('epi_types')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching EPI types:', error);
        throw new Error(`Erro ao buscar tipos de EPI: ${error.message}`);
    }

    return data || [];
}

/**
 * Get a single EPI type by ID
 */
export async function getEPITypeById(id: string): Promise<EPIType | null> {
    const { data, error } = await supabaseAdmin
        .from('epi_types')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        console.error('Error fetching EPI type:', error);
        throw new Error(`Erro ao buscar tipo de EPI: ${error.message}`);
    }

    return data;
}

/**
 * Create a new EPI type (admin only)
 */
export async function createEPIType(type: Omit<EPIType, 'id' | 'created_at'>): Promise<EPIType> {
    const { data, error } = await supabaseAdmin
        .from('epi_types')
        .insert(type)
        .select()
        .single();

    if (error) {
        console.error('Error creating EPI type:', error);
        throw new Error(`Erro ao criar tipo de EPI: ${error.message}`);
    }

    return data;
}

/**
 * Update an EPI type (admin only)
 */
export async function updateEPIType(id: string, type: Partial<EPIType>): Promise<EPIType> {
    const { data, error } = await supabaseAdmin
        .from('epi_types')
        .update(type)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating EPI type:', error);
        throw new Error(`Erro ao atualizar tipo de EPI: ${error.message}`);
    }

    return data;
}

/**
 * Delete an EPI type (admin only)
 */
export async function deleteEPIType(id: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('epi_types')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting EPI type:', error);
        throw new Error(`Erro ao deletar tipo de EPI: ${error.message}`);
    }
}

/**
 * Upload signature image to storage
 */
export async function uploadSignature(userId: string, signatureBase64: string): Promise<string> {
    const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `${userId}-${Date.now()}.png`;

    const { data, error } = await supabaseAdmin.storage
        .from('epi_signatures')
        .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: false
        });

    if (error) {
        console.error('Error uploading signature:', error);
        throw new Error(`Erro ao fazer upload da assinatura: ${error.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
        .from('epi_signatures')
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
}

/**
 * Confirm EPI delivery with signature
 */
export async function confirmEPIDelivery(
    registrationIds: string[],
    userId: string,
    signatureUrl: string
): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
        .from('epi_registrations')
        .update({
            status: 'delivered',
            signature_url: signatureUrl,
            signed_at: now,
            delivered_at: now,
            updated_at: now
        })
        .in('id', registrationIds)
        .eq('user_id', userId); // Security check: ensure user owns the records

    if (error) {
        console.error('Error confirming delivery:', error);
        throw new Error(`Erro ao confirmar entrega: ${error.message}`);
    }
}

// ==================== EPI KITS ====================

/**
 * Get all EPI kits
 */
export async function getEPIKits(sectorId?: string): Promise<import('@/types/epi').EPIKitWithItems[]> {
    let query = supabaseAdmin
        .from('epi_kits')
        .select(`
            *,
            items:epi_kit_items(*, epi_type:epi_types(*))
        `)
        .order('name', { ascending: true });

    if (sectorId) {
        query = query.eq('sector_id', sectorId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching EPI kits:', error);
        throw new Error(`Erro ao buscar kits de EPI: ${error.message}`);
    }

    return data || [];
}

/**
 * Get a single EPI kit by ID
 */
export async function getEPIKitById(id: string): Promise<import('@/types/epi').EPIKitWithItems | null> {
    const { data, error } = await supabaseAdmin
        .from('epi_kits')
        .select(`
            *,
            items:epi_kit_items(*, epi_type:epi_types(*))
        `)
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching EPI kit:', error);
        throw new Error(`Erro ao buscar kit de EPI: ${error.message}`);
    }

    return data;
}

/**
 * Create a new EPI kit
 */
export async function createEPIKit(request: import('@/types/epi').CreateKitRequest): Promise<import('@/types/epi').EPIKitWithItems> {
    // 1. Create Kit
    const { data: kit, error: kitError } = await supabaseAdmin
        .from('epi_kits')
        .insert({
            name: request.name,
            description: request.description,
            sector_id: request.sector_id
        })
        .select()
        .single();

    if (kitError) {
        console.error('Error creating EPI kit:', kitError);
        throw new Error(`Erro ao criar kit de EPI: ${kitError.message}`);
    }

    // 2. Create Items
    if (request.items && request.items.length > 0) {
        const itemsToInsert = request.items.map(item => ({
            kit_id: kit.id,
            epi_type_id: item.epi_type_id,
            quantity: item.quantity,
            is_mandatory: item.is_mandatory
        }));

        const { error: itemsError } = await supabaseAdmin
            .from('epi_kit_items')
            .insert(itemsToInsert);

        if (itemsError) {
            console.error('Error creating kit items:', itemsError);
            // Optional: Rollback kit creation here if strict transaction needed
            throw new Error(`Erro ao adicionar itens ao kit: ${itemsError.message}`);
        }
    }

    return await getEPIKitById(kit.id) as import('@/types/epi').EPIKitWithItems;
}

/**
 * Update an EPI kit
 */
export async function updateEPIKit(id: string, request: import('@/types/epi').UpdateKitRequest): Promise<void> {
    // 1. Update Kit Details
    const updateData: any = { updated_at: new Date().toISOString() };
    if (request.name) updateData.name = request.name;
    if (request.description !== undefined) updateData.description = request.description;
    if (request.sector_id !== undefined) updateData.sector_id = request.sector_id;

    const { error: kitError } = await supabaseAdmin
        .from('epi_kits')
        .update(updateData)
        .eq('id', id);

    if (kitError) {
        throw new Error(`Erro ao atualizar kit: ${kitError.message}`);
    }

    // 2. Update Items (Full replacement strategy for simplicity or smart update)
    // For simplicity: Delete all and recreate if items are provided. 
    // Ideally we would diff, but for small lists this is acceptable.
    if (request.items) {
        // Delete existing items
        await supabaseAdmin.from('epi_kit_items').delete().eq('kit_id', id);

        // Insert new items
        if (request.items.length > 0) {
            const itemsToInsert = request.items.map(item => ({
                kit_id: id,
                epi_type_id: item.epi_type_id,
                quantity: item.quantity,
                is_mandatory: item.is_mandatory
            }));

            const { error: itemsError } = await supabaseAdmin
                .from('epi_kit_items')
                .insert(itemsToInsert);

            if (itemsError) {
                throw new Error(`Erro ao atualizar itens do kit: ${itemsError.message}`);
            }
        }
    }
}

/**
 * Delete an EPI kit
 */
export async function deleteEPIKit(id: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('epi_kits')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting EPI kit:', error);
        throw new Error(`Erro ao deletar kit: ${error.message}`);
    }
}

/**
 * Assign a kit to a user
 */
export async function assignKitToUser(userId: string, kitId: string, adminId: string): Promise<void> {
    const kit = await getEPIKitById(kitId);
    if (!kit) throw new Error('Kit não encontrado');

    if (!kit.items || kit.items.length === 0) {
        throw new Error('O kit não possui itens para atribuir');
    }

    const now = new Date().toISOString();

    // Create EPI registrations for each item
    // Note: We need to fallback for equipment_type name from kit item -> epi_type
    const registrationsToCreate = kit.items.map(item => ({
        user_id: userId,
        equipment_type: item.epi_type?.name || 'Unknown',
        quantity: item.quantity,
        reason: `Kit: ${kit.name}`,
        status: 'approved', // Auto-approve since admin assigned it
        approved_by: adminId,
        approved_at: now
    }));

    const { error } = await supabaseAdmin
        .from('epi_registrations')
        .insert(registrationsToCreate);

    if (error) {
        console.error('Error assigning kit:', error);
        throw new Error(`Erro ao atribuir kit ao usuário: ${error.message}`);
    }
}

// ==================== RESET LOGIC ====================

/**
 * Resets all EPI module data (Dangerous operation, Admin only)
 */
export async function resetEPIModuleData(): Promise<void> {
    // 1. Delete all EPI Registrations
    const { error: regError } = await supabaseAdmin.from('epi_registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (regError) {
        console.error('Error deleting registrations:', regError);
        throw new Error(`Erro ao deletar registros: ${regError.message}`);
    }

    // 2. Clear signatures bucket (Optional depending on business rule)
    try {
        const { data: files } = await supabaseAdmin.storage.from('epi_signatures').list();
        if (files && files.length > 0) {
            const fileNames = files.map(f => f.name);
            await supabaseAdmin.storage.from('epi_signatures').remove(fileNames);
        }
    } catch (err) {
        console.warn('Could not clear signatures bucket:', err);
    }
}

/**
 * Get data for the general EPI report
 */
export async function getGeneralEPIReportData(filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
    onlyRequests?: boolean;
}): Promise<any[]> {
    let query = supabaseAdmin
        .from('epi_registrations')
        .select(`
            *,
            user:user_id (
                id,
                name,
                email,
                sector_id,
                department,
                position
            )
        `)
        .order('created_at', { ascending: false });

    if (filters.status) {
        query = query.eq('status', filters.status);
    }

    if (filters.onlyRequests) {
        query = query.in('status', ['pending', 'approved']);
    }

    if (filters.startDate) {
        query = query.gte('created_at', `${filters.startDate}T00:00:00.000Z`);
    }

    if (filters.endDate) {
        query = query.lte('created_at', `${filters.endDate}T23:59:59.999Z`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching general EPI report data:', error);
        throw new Error(`Erro ao buscar dados para o relatório: ${error.message}`);
    }

    // Fetch all EPI types to map CA numbers
    const { data: epiTypes } = await supabaseAdmin
        .from('epi_types')
        .select('name, ca_number');

    const typesMap = (epiTypes || []).reduce((acc: any, type: any) => {
        acc[type.name] = type.ca_number;
        return acc;
    }, {});

    // Fetch all sectors to resolve sector_id → name
    const { data: sectors } = await supabaseAdmin
        .from('sectors')
        .select('id, name');

    const sectorsMap = (sectors || []).reduce((acc: any, s: any) => {
        acc[s.id] = s.name;
        return acc;
    }, {});

    return (data || []).map((item: any) => {
        const sectorId = item.user?.sector_id;
        const sectorName = sectorId ? sectorsMap[sectorId] : null;
        return {
            ...item,
            user_name: item.user?.name,
            user_email: item.user?.email,
            user_sector: sectorName || item.user?.department || '',
            user_position: item.user?.position || '',
            equipment_ca: typesMap[item.equipment_type] || ''
        };
    });
}

