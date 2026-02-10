
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyEPIFlow() {
    console.log('Starting EPI Flow Verification...');

    try {
        // 1. Get a test user (using the admin user from schema.sql for simplicity)
        const { data: user, error: userError } = await supabase
            .from('users_unified')
            .select('id')
            .eq('email', 'caio.correia@groupabz.com') // Ensure this user exists or use another one
            .single();

        if (userError || !user) {
            console.log('Test user not found, trying to find any user...');
            const { data: anyUser } = await supabase.from('users_unified').select('id').limit(1).single();
            if (!anyUser) throw new Error('No users found to test with.');
            user = anyUser;
        }

        const userId = user.id;
        console.log(`Using user ID: ${userId}`);

        // 2. Create a dummy EPI request
        const { data: request, error: createError } = await supabase
            .from('epi_registrations')
            .insert({
                user_id: userId,
                equipment_type: 'TEST_EPI_' + Date.now(),
                quantity: 1,
                reason: 'Automated Test',
                status: 'pending'
            })
            .select()
            .single();

        if (createError) throw new Error(`Create failed: ${createError.message}`);
        console.log(`Created request ID: ${request.id}`);

        // 3. Approve the request
        const { error: approveError } = await supabase
            .from('epi_registrations')
            .update({ status: 'approved', approved_at: new Date().toISOString() })
            .eq('id', request.id);

        if (approveError) throw new Error(`Approve failed: ${approveError.message}`);
        console.log('Request approved.');

        // 4. Simulate Delivery Confirmation (Signature)
        // We will bypass the API route upload part and just update DB to verify the logic "confirmEPIDelivery" would do
        // Actually, let's call the logic similar to the API route but directly via Supabase client to verify DB constraints/logic

        // Create a dummy signature URL
        const signatureUrl = 'https://placehold.co/600x400';

        const now = new Date().toISOString();
        const { data: updatedRequest, error: deliveryError } = await supabase
            .from('epi_registrations')
            .update({
                status: 'delivered',
                signature_url: signatureUrl,
                signed_at: now,
                delivered_at: now,
                updated_at: now
            })
            .eq('id', request.id)
            .select()
            .single();

        if (deliveryError) throw new Error(`Delivery confirmation failed: ${deliveryError.message}`);

        // 5. Verify Final State
        if (updatedRequest.status !== 'delivered') throw new Error('Status not updated to delivered');
        if (updatedRequest.signature_url !== signatureUrl) throw new Error('Signature URL not saved');
        if (!updatedRequest.signed_at) throw new Error('Signed at not saved');

        console.log('Verification Successful! EPI Request flow completed.');

        // Clean up
        await supabase.from('epi_registrations').delete().eq('id', request.id);
        console.log('Cleanup completed.');

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
}

verifyEPIFlow();
