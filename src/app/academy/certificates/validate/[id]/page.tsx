import { supabaseAdmin } from '@/lib/supabase';
import { FiCheckCircle, FiXCircle, FiAward, FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Validação de Certificado - Academy',
  description: 'Página de validação pública de certificados da Academy',
};

async function getCertificateInfo(enrollmentId: string) {
  try {
    const { data: enr, error: enrErr } = await supabaseAdmin
      .from('academy_enrollments')
      .select('id, user_id, completed_at, enrolled_at, course:academy_courses(id,title,duration,difficulty_level,instructor:users_unified(first_name,last_name)) , user:users_unified(first_name,last_name,email)')
      .eq('id', enrollmentId)
      .single();

    if (enrErr || !enr || !enr.completed_at) {
      return { valid: false };
    }

    const course = Array.isArray(enr.course) ? enr.course[0] : enr.course;
    const user = Array.isArray(enr.user) ? enr.user[0] : enr.user;
    const instructor = Array.isArray(course?.instructor) ? course.instructor[0] : course?.instructor;

    return {
      valid: true,
      studentName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
      courseTitle: course?.title || 'Curso Desconhecido',
      duration: Math.max(1, Math.round((course?.duration || 0) / 3600)),
      completionDate: new Date(enr.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      certificateId: `ABZ-${enrollmentId.toUpperCase().slice(0, 8)}`,
      instructorName: `${instructor?.first_name || ''} ${instructor?.last_name || ''}`.trim()
    };
  } catch (err) {
    console.error('Error validating certificate', err);
    return { valid: false };
  }
}

export default async function ValidateCertificatePage({ params }: { params: { id: string } }) {
  const info = await getCertificateInfo(params.id);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-abz-blue rounded-full flex items-center justify-center">
             <FiAward className="text-white text-3xl" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Validação de Certificado
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {info.valid ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <FiCheckCircle className="text-green-500 text-6xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Certificado Válido</h3>
              <p className="text-gray-500 mb-6">
                Este certificado é autêntico e foi emitido pelo nosso sistema.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-6 text-left border border-gray-200 shadow-sm space-y-4">
                <div className="border-b border-gray-200 pb-3">
                  <p className="text-sm text-gray-500 flex items-center mb-1"><FiUser className="mr-2"/> Aluno</p>
                  <p className="font-semibold text-gray-900 text-lg">{info.studentName}</p>
                </div>
                
                <div className="border-b border-gray-200 pb-3">
                  <p className="text-sm text-gray-500 flex items-center mb-1"><FiAward className="mr-2"/> Curso</p>
                  <p className="font-semibold text-gray-900">{info.courseTitle}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-3">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center mb-1"><FiCalendar className="mr-2"/> Conclusão</p>
                    <p className="font-medium text-gray-900">{info.completionDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center mb-1"><FiClock className="mr-2"/> Carga Horária</p>
                    <p className="font-medium text-gray-900">{info.duration} horas</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400">ID do Certificado: {info.certificateId}</p>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/" className="inline-flex items-center text-abz-blue hover:text-abz-blue-dark font-medium transition-colors">
                  Acessar o Portal
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                <FiXCircle className="text-red-500 text-6xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Certificado Inválido</h3>
              <p className="text-gray-500 mb-6">
                Não conseguimos encontrar um certificado válido com este código em nosso sistema, ou o curso ainda não foi concluído.
              </p>
              <div className="mt-8">
                <Link href="/" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-abz-blue hover:bg-abz-blue-dark transition-colors">
                  Ir para o início
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
