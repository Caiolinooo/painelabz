import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateUser, logAction } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET - Listar certificados do usuário ou gerar certificado específico
export async function GET(request: NextRequest) {
  try {
    const { user: authUser, error: authError } = await authenticateUser(request);

    if (authError) {
      return authError;
    }

    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = authUser as any;

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const enrollmentId = searchParams.get('enrollment_id');
    const generate = searchParams.get('generate') === 'true';

    // Se for para gerar um certificado específico
    if (generate && (courseId || enrollmentId)) {
      const host = request.headers.get('host') || '';
      return await generateCertificate(user, courseId, enrollmentId, host);
    }

    // Listar certificados do usuário
    const { data: enrollments, error } = await supabaseAdmin
      .from('academy_enrollments')
      .select(`
        id,
        user_id,
        course_id,
        enrolled_at,
        completed_at,
        course:academy_courses(
          id,
          title,
          description,
          duration,
          difficulty_level,
          category:academy_categories(
            id,
            name,
            color
          ),
          instructor:users_unified(
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq('user_id', user.id)
      .not('completed_at', 'is', null);

    if (error) {
      console.error('Erro ao buscar certificados:', error);
      return NextResponse.json({ error: 'Erro ao buscar certificados' }, { status: 500 });
    }

    const certificates = (enrollments || [])
      .filter((enrollment: any) => {
        const courseData = enrollment.course?.[0] || enrollment.course;
        return courseData != null; // Ensure the related course still exists
      })
      .map((enrollment: any) => {
        const courseData = enrollment.course?.[0] || enrollment.course;
        const category = Array.isArray(courseData?.category) ? courseData.category[0] : courseData?.category;
        const instructor = Array.isArray(courseData?.instructor) ? courseData.instructor[0] : courseData?.instructor;

        return {
          id: enrollment.id,
          course_id: enrollment.course_id,
          course_title: courseData?.title,
          course_duration: courseData?.duration,
          course_difficulty: courseData?.difficulty_level,
          category,
          instructor,
          completed_at: enrollment.completed_at,
          enrolled_at: enrollment.enrolled_at,
          certificate_url: `/api/academy/certificates?enrollment_id=${enrollment.id}&generate=true`
        };
      });

    return NextResponse.json({
      success: true,
      certificates
    });

  } catch (error) {
    console.error('Erro na API de certificados:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

async function generateCertificate(user: any, courseId?: string | null, enrollmentId?: string | null, requestHost?: string) {
  try {
    let enrollment;
    const enrollmentSelect = `
      *,
      course:academy_courses(
        id,
        title,
        description,
        duration,
        difficulty_level,
        instructor_signature_url,
        category:academy_categories(id, name, color),
        instructor:users_unified(id, first_name, last_name)
      )
    `;

    if (enrollmentId) {
      const { data, error } = await supabaseAdmin
        .from('academy_enrollments')
        .select(enrollmentSelect)
        .eq('id', enrollmentId)
        .eq('user_id', user.id)
        .single();
      if (error || !data) return NextResponse.json({ error: 'Matrícula não encontrada' }, { status: 404 });
      enrollment = data;
    } else if (courseId) {
      const { data, error } = await supabaseAdmin
        .from('academy_enrollments')
        .select(enrollmentSelect)
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .single();
      if (error || !data) return NextResponse.json({ error: 'Matrícula não encontrada' }, { status: 404 });
      enrollment = data;
    } else {
      return NextResponse.json({ error: 'course_id ou enrollment_id é obrigatório' }, { status: 400 });
    }

    if (!enrollment.completed_at) {
      return NextResponse.json({ error: 'Curso não foi concluído' }, { status: 400 });
    }

    const courseData = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
    const instructor = Array.isArray(courseData?.instructor) ? courseData.instructor[0] : courseData?.instructor;
    const resolvedCourseId = courseData?.id || enrollment.course_id;

    // Fetch modules for "Conteúdo Programático"
    const { data: modules } = await supabaseAdmin
      .from('academy_modules')
      .select('title, sort_order')
      .eq('course_id', resolvedCourseId)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    const moduleTitles = (modules || []).map(m => m.title);
    const durationHours = Math.max(1, Math.round((courseData?.duration || 0) / 3600));

    // Build base URL for assets
    const protocol = requestHost?.includes('localhost') ? 'http' : 'https';
    const baseUrl = requestHost ? `${protocol}://${requestHost}` : '';

    const certificateData = {
      student_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      course_title: courseData?.title || '',
      course_duration_hours: String(durationHours).padStart(2, '0'),
      instructor_name: `${instructor?.first_name || ''} ${instructor?.last_name || ''}`.trim(),
      instructor_signature_url: courseData?.instructor_signature_url || null,
      completion_date: new Date(enrollment.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      certificate_id: `ABZ-${enrollment.id.toUpperCase().slice(0, 8)}`,
      module_titles: moduleTitles,
      baseUrl,
    };

    const certificateHTML = generateCertificateHTML(certificateData);

    logAction(user, 'GENERATE_CERTIFICATE', 'certificate', enrollment.id, {
      course_id: enrollment.course_id,
      course_title: courseData?.title
    });

    return new NextResponse(certificateHTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="certificado-${certificateData.certificate_id}.html"`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar certificado:', error);
    return NextResponse.json({ error: 'Erro ao gerar certificado' }, { status: 500 });
  }
}

function generateCertificateHTML(data: {
  student_name: string;
  course_title: string;
  course_duration_hours: string;
  instructor_name: string;
  instructor_signature_url: string | null;
  completion_date: string;
  certificate_id: string;
  module_titles: string[];
  baseUrl: string;
}): string {
  const conteudoProgramatico = data.module_titles.length > 0
    ? data.module_titles.join('; ') + '.'
    : '';

  const hasBiometric = data.instructor_signature_url === 'PASSKEY_SIGNED';
  const hasDrawnSignature = data.instructor_signature_url && !hasBiometric;

  // Signature HTML block
  let signatureHtml = '';
  if (hasDrawnSignature) {
    signatureHtml = `
      <div class="sig-img">
        <img src="${data.instructor_signature_url}" alt="Assinatura" style="max-height:50px; display:block;" />
      </div>
      <div class="sig-line">
        <span class="sig-name">${data.instructor_name}</span> <span class="sig-role">| Facilitador</span>
      </div>
      <p class="bio-note">Assinatura reforçada com confirmação biométrica</p>
    `;
  } else if (hasBiometric) {
    signatureHtml = `
      <div class="sig-line">
        <span class="sig-name">${data.instructor_name}</span> <span class="sig-role">| Facilitador</span>
      </div>
      <p class="bio-note">✓ Assinatura digital confirmada via biometria</p>
    `;
  } else {
    signatureHtml = `
      <div class="sig-line">
        <span class="sig-name">${data.instructor_name}</span> <span class="sig-role">| Facilitador</span>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificado de Participação - ${data.course_title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: landscape A4; margin: 0; }

    body {
      font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }

    .cert {
      width: 1056px;
      height: 748px;
      background: #fff;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.12);
    }

    /* Waves decoration — right side */
    .wave-deco {
      position: absolute;
      right: 0;
      top: 0;
      width: 200px;
      height: 100%;
      z-index: 1;
    }
    .wave-deco img {
      position: absolute;
      right: 0;
      top: 0;
      height: 100%;
      width: auto;
      object-fit: cover;
    }

    /* Content */
    .cert-content {
      position: relative;
      z-index: 2;
      padding: 48px 240px 36px 56px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    /* Icons */
    .top-icons { margin-bottom: 24px; }
    .top-icons img { height: 32px; }

    /* Title */
    .cert-title {
      font-family: 'Merriweather', serif;
      font-size: 24px;
      font-weight: 400;
      color: #111;
      letter-spacing: -0.5px;
      margin-bottom: 56px;
      text-align: left;
    }

    /* Body */
    .cert-body { flex: 1; }
    .certifica-que {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      font-weight: 400;
      color: #333;
      margin-bottom: 12px;
    }
    .student-name {
      font-family: 'Merriweather', serif;
      font-size: 30px;
      font-weight: 700;
      font-style: italic;
      color: #111;
      margin-bottom: 24px;
      letter-spacing: -0.3px;
      text-align: left;
    }
    .participation-text {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 14px;
      font-weight: 400;
      color: #222;
      line-height: 1.6;
      text-align: left;
      max-width: 680px;
    }
    .participation-text .highlight {
      color: #0b6bff;
      font-weight: 400;
    }

    /* Signature */
    .facilitador-section { 
      margin-top: 50px; 
      width: 250px;
    }
    .sig-img {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      min-height: 50px;
      margin-bottom: 4px;
    }
    .sig-line {
      border-top: 1px solid #333;
      padding-top: 5px;
      text-align: center;
      width: 100%;
    }
    .sig-name { 
      font-family: 'Merriweather', serif;
      font-size: 7px; 
      font-weight: 400; 
      color: #111; 
    }
    .sig-role { 
      font-family: 'Merriweather', serif;
      font-size: 7px; 
      font-weight: 400;
      color: #444; 
    }
    .bio-note {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 7px;
      color: #777;
      margin-top: 3px;
      letter-spacing: 0.2px;
      text-align: center;
      width: 100%;
    }

    /* Bottom */
    .cert-bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: auto;
      padding-top: 12px;
    }
    .conteudo-programatico { 
      max-width: 480px; 
      margin-bottom: -10px;
    }
    .conteudo-programatico h4 {
      font-family: 'Merriweather', serif;
      font-size: 10.5px;
      font-weight: 700;
      color: #111;
      margin-bottom: 4px;
      text-align: left;
    }
    .conteudo-programatico p {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 10.5px;
      font-weight: 400;
      color: #333;
      line-height: 1.5;
      text-align: left;
    }

    .abz-logo { 
      text-align: right; 
      margin-right: -20px;
    }
    .abz-logo img { height: 50px; }

    .cert-id-small {
      position: absolute;
      bottom: 10px;
      right: 240px;
      font-size: 8px;
      color: #bbb;
      z-index: 3;
    }

    @media print {
      body { background: white; padding: 0; }
      .cert { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="cert">
    <!-- Wave decoration -->
    <div class="wave-deco">
      <img src="${data.baseUrl}/images/cert-waves.png" alt="" />
    </div>

    <div class="cert-content">
      <!-- Icons -->
      <div class="top-icons">
        <img src="${data.baseUrl}/images/cert-icons.png" alt="" />
      </div>

      <h1 class="cert-title">Certificado de Participação</h1>

      <div class="cert-body">
        <p class="certifica-que">ABZ Group SAS certifica que</p>
        <p class="student-name">${data.student_name}</p>
        <p class="participation-text">
          Participou do treinamento de <span class="highlight">${data.course_title}</span>,
          realizado no dia ${data.completion_date},
          com carga horária de ${data.course_duration_hours} horas,
          através da modalidade presencial.
        </p>

        <div class="facilitador-section">
          ${signatureHtml}
        </div>
      </div>

      <div class="cert-bottom">
        <div class="conteudo-programatico">
          ${conteudoProgramatico ? `
            <h4>Conteúdo Programático</h4>
            <p>${conteudoProgramatico}</p>
          ` : ''}
        </div>
        <div class="abz-logo">
          <img src="${data.baseUrl}/images/cert-logo.png" alt="ABZ Group" />
        </div>
      </div>
    </div>

    <span class="cert-id-small">${data.certificate_id}</span>
  </div>
</body>
</html>`;
}
