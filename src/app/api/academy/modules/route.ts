import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAcademyAuth } from '@/lib/middleware/academy-auth';

export const dynamic = 'force-dynamic';

// GET - List modules for a course (optionally with progress)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get('course_id');

        if (!courseId) {
            return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
        }

        const { data: modules, error } = await supabaseAdmin
            .from('academy_modules')
            .select('*')
            .eq('course_id', courseId)
            .eq('is_published', true)
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Error fetching modules:', error);
            return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
        }

        // If authenticated, include module progress
        let moduleProgress: any[] = [];

        // Use standard auth middleware instead of manual supabaseAdmin.auth
        const { user } = await withAcademyAuth(request, { requireAuth: false });

        if (user) {
            // Get enrollment
            const { data: enrollments } = await supabaseAdmin
                .from('academy_enrollments')
                .select('id')
                .eq('user_id', user.id)
                .eq('course_id', courseId)
                .order('enrolled_at', { ascending: false })
                .limit(1);

            if (enrollments && enrollments.length > 0) {
                const enrollment = enrollments[0];
                const { data: progress } = await supabaseAdmin
                    .from('academy_module_progress')
                    .select('*')
                    .eq('enrollment_id', enrollment.id);

                moduleProgress = progress || [];
            }
        }

        // Merge progress into modules
        const modulesWithProgress = (modules || []).map(mod => {
            const progress = moduleProgress.find(p => p.module_id === mod.id);
            return {
                ...mod,
                progress: progress || null
            };
        });

        return NextResponse.json({
            success: true,
            modules: modulesWithProgress
        });
    } catch (error) {
        console.error('Error in modules API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create module (requires editor permission)
export async function POST(request: NextRequest) {
    try {
        const { user, error: authError } = await withAcademyAuth(request, { requireAuth: true });
        if (authError) return authError;
        if (!user?.canEditAcademy) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        const body = await request.json();
        const { course_id, title, description, video_url, thumbnail_url, duration, sort_order } = body;

        if (!course_id || !title) {
            return NextResponse.json({ error: 'course_id and title are required' }, { status: 400 });
        }

        // Get next sort_order if not provided
        let finalSortOrder = sort_order;
        if (finalSortOrder === undefined || finalSortOrder === null) {
            const { data: existing } = await supabaseAdmin
                .from('academy_modules')
                .select('sort_order')
                .eq('course_id', course_id)
                .order('sort_order', { ascending: false })
                .limit(1);

            finalSortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;
        }

        const { data: module, error } = await supabaseAdmin
            .from('academy_modules')
            .insert({
                course_id,
                title,
                description: description || null,
                video_url: video_url || null,
                thumbnail_url: thumbnail_url || null,
                duration: duration || 0,
                sort_order: finalSortOrder
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating module:', error);
            return NextResponse.json({ error: 'Failed to create module' }, { status: 500 });
        }

        return NextResponse.json({ success: true, module }, { status: 201 });
    } catch (error) {
        console.error('Error in modules POST:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Update module
export async function PUT(request: NextRequest) {
    try {
        const { user, error: authError } = await withAcademyAuth(request, { requireAuth: true });
        if (authError) return authError;
        if (!user?.canEditAcademy) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
        }

        const { data: module, error } = await supabaseAdmin
            .from('academy_modules')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating module:', error);
            return NextResponse.json({ error: 'Failed to update module' }, { status: 500 });
        }

        return NextResponse.json({ success: true, module });
    } catch (error) {
        console.error('Error in modules PUT:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete module
export async function DELETE(request: NextRequest) {
    try {
        const { user, error: authError } = await withAcademyAuth(request, { requireAuth: true });
        if (authError) return authError;
        if (!user?.canEditAcademy) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('academy_modules')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting module:', error);
            return NextResponse.json({ error: 'Failed to delete module' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Module deleted' });
    } catch (error) {
        console.error('Error in modules DELETE:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
