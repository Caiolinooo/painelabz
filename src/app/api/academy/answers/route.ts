import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAndStoreCertificate } from '@/lib/certificates';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getUserIdFromToken(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    if (!token) return null;

    const payload = verifyToken(token);
    if (payload && (payload.userId || (payload as any).sub)) {
        return (payload.userId as string) || ((payload as any).sub as string);
    }
    return null;
}

// POST - Submit answers for a course quiz
export async function POST(request: NextRequest) {
    try {
        const userId = getUserIdFromToken(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { course_id, enrollment_id, answers } = body; // answers: { question_id: string, selected_option_id?: string, text_answer?: string }[]

        if (!course_id || !enrollment_id || !answers || !Array.isArray(answers)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify enrollment
        const { data: enrollment, error: enrError } = await supabaseAdmin
            .from('academy_enrollments')
            .select('id, user_id')
            .eq('id', enrollment_id)
            .eq('course_id', course_id)
            .single();

        if (enrError || !enrollment || enrollment.user_id !== userId) {
            return NextResponse.json({ error: 'Valid enrollment not found or permission denied' }, { status: 403 });
        }

        // Fetch questions and options for grading
        const { data: questions, error: qError } = await supabaseAdmin
            .from('academy_questions')
            .select('id, question_type, options:academy_question_options(id, is_correct)')
            .eq('course_id', course_id)
            .eq('is_active', true);

        if (qError || !questions) {
            return NextResponse.json({ error: 'Failed to fetch course questions' }, { status: 500 });
        }

        if (questions.length === 0) {
            return NextResponse.json({ error: 'This course has no quiz' }, { status: 400 });
        }

        let correctCount = 0;
        let needsGrading = false;
        const totalQuestions = questions.length;

        const answersToInsert: any[] = [];

        // Evaluate answers
        for (const ans of answers) {
            const q = questions.find((sq) => sq.id === ans.question_id);
            if (!q) continue;

            const isText = q.question_type === 'TEXT';
            let isCorrect = false;

            if (isText) {
                needsGrading = true;
            } else {
                const correctOpt = q.options.find(o => o.is_correct);
                if (correctOpt && correctOpt.id === ans.selected_option_id) {
                    isCorrect = true;
                    correctCount++;
                }
            }

            answersToInsert.push({
                question_id: q.id,
                selected_option_id: ans.selected_option_id || null,
                text_answer: ans.text_answer || null,
                is_correct: isText ? null : isCorrect,
                score_awarded: isCorrect ? 10 : 0 // base weight 10 per question
            });
        }

        // Calculate score (only counting auto-graded ones for now if needsGrading is false)
        const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
        const PASSING_SCORE = 70; // Set passing score
        const isPassed = !needsGrading && scorePercentage >= PASSING_SCORE;

        // Create Attempt
        const { data: attempt, error: attemptError } = await supabaseAdmin
            .from('academy_quiz_attempts')
            .insert({
                enrollment_id,
                user_id: userId,
                course_id,
                score_percentage: scorePercentage,
                is_passed: isPassed,
                needs_grading: needsGrading,
                completed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (attemptError) {
            console.error('Failed to create attempt:', attemptError);
            return NextResponse.json({ error: 'Failed to record attempt' }, { status: 500 });
        }

        // Store Answers
        const finalAnswers = answersToInsert.map(a => ({ ...a, attempt_id: attempt.id }));
        await supabaseAdmin.from('academy_user_answers').insert(finalAnswers);

        // If passed and no manual grading needed, issue certificate and complete course
        let certificateIssued = false;
        let certificateUrl = null;

        if (isPassed) {
            const nowIso = new Date().toISOString();
            // Mark enrollment logic
            await supabaseAdmin.from('academy_enrollments').update({ completed_at: nowIso }).eq('id', enrollment_id);

            // Generate PDF Certificate
            try {
                const gen = await generateAndStoreCertificate(enrollment_id);
                if (gen) {
                    certificateIssued = true;
                    certificateUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/academy/certificates/download?issue_id=${gen.issueId}`;
                    // Note: Actual email/notification handling can be ported from the progress logic later if needed
                }
            } catch (certError) {
                console.error('Error generating certificate inside quiz submission:', certError);
            }
        }

        return NextResponse.json({
            success: true,
            attempt,
            isPassed,
            scorePercentage,
            needsGrading,
            certificateIssued,
            certificateUrl
        });

    } catch (error) {
        console.error('Error in answers POST:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET - Get user attempts for a course
export async function GET(request: NextRequest) {
    try {
        const userId = getUserIdFromToken(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get('course_id');

        if (!courseId) {
            return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
        }

        const { data: attempts, error } = await supabaseAdmin
            .from('academy_quiz_attempts')
            .select('*, answers:academy_user_answers(*)')
            .eq('course_id', courseId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 });
        }

        return NextResponse.json({ success: true, attempts: attempts || [] });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
