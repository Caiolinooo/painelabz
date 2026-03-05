'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import VideoPlayer from '@/components/Academy/VideoPlayer';
import Comments from '@/components/Academy/Comments';
import Ratings from '@/components/Academy/Ratings';
import QuizAssessment from '@/components/Academy/QuizAssessment';
import {
  PlayIcon,
  ClockIcon,
  UserIcon,
  BookOpenIcon,
  StarIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  LockClosedIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';

interface Course {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration: number;
  difficulty_level: string;
  is_published: boolean;
  is_featured: boolean;
  tags: string[];
  prerequisites: string[];
  learning_objectives: string[];
  view_count: number;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  instructor?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  stats?: {
    enrollments: number;
    ratings_count: number;
    average_rating: number;
  };
}

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at?: string;
  is_active: boolean;
  progress?: {
    progress_percentage: number;
    last_watched_position: number;
    total_watch_time: number;
    last_accessed_at: string;
  }[];
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration: number;
  sort_order: number;
  is_published: boolean;
  progress?: {
    progress_percentage: number;
    last_watched_position: number;
    total_watch_time: number;
    completed_at?: string;
  } | null;
}

const CoursePage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user, getToken } = useSupabaseAuth();
  const { t } = useI18n();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'quiz'>('content');
  const [courseCompleted, setCourseCompleted] = useState(false);

  const courseId = (params as any)?.id as string | undefined;
  const hasModules = modules.length > 0;
  const activeModule = hasModules ? modules.find(m => m.id === activeModuleId) || null : null;

  // Check if all modules are completed
  const allModulesCompleted = hasModules
    ? modules.every(m => m.progress?.completed_at)
    : false;

  // Check if a module is unlocked (sequential locking)
  const isModuleUnlocked = useCallback((mod: Module, index: number): boolean => {
    if (index === 0) return true; // First module always unlocked
    const prevModule = modules[index - 1];
    return !!prevModule?.progress?.completed_at;
  }, [modules]);

  useEffect(() => {
    if (courseId) {
      loadCourseData();
    }
  }, [courseId, user]);

  const loadCourseData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadCourse(),
        user?.id ? loadEnrollment() : Promise.resolve(),
        loadModules()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do curso:', error);
      setError('Erro ao carregar dados do curso');
    } finally {
      setLoading(false);
    }
  };

  const loadCourse = async () => {
    try {
      const response = await fetch(`/api/academy/courses?course_id=${courseId}`);
      const data = await response.json();

      if (data.success && data.courses.length > 0) {
        setCourse(data.courses[0]);
      } else {
        setError(t('academy.cursoNaoEncontrado'));
      }
    } catch (error) {
      console.error('Erro ao carregar curso:', error);
      throw error;
    }
  };

  const loadEnrollment = async () => {
    if (!user?.id) return;

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`/api/academy/enrollments?course_id=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success && data.enrollments.length > 0) {
        setEnrollment(data.enrollments[0]);
      }
    } catch (error) {
      console.error(t('academy.erroAoCarregarMatricula'), error);
    }
  };

  const loadModules = async () => {
    try {
      const token = await getToken?.();
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/academy/modules?course_id=${courseId}`, { headers });
      const data = await response.json();

      if (data.success && data.modules.length > 0) {
        setModules(data.modules);
        // Set latest unlocked module as active
        let latestUnlockedIndex = 0;
        for (let i = 0; i < data.modules.length; i++) {
          if (i === 0) {
            latestUnlockedIndex = 0;
          } else if (data.modules[i - 1]?.progress?.completed_at) {
            latestUnlockedIndex = i;
          } else {
            break;
          }
        }

        const lastInProgress = data.modules.findIndex((m: Module) =>
          m.progress && m.progress.progress_percentage > 0 && !m.progress.completed_at
        );
        setActiveModuleId(data.modules[lastInProgress >= 0 ? lastInProgress : latestUnlockedIndex]?.id || data.modules[0].id);
      }
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  };

  // Tracking visualização inicial do curso para aparecer no Dashboard "Cursos Recentes"
  // IMPORTANT: Only fire when loading is DONE, so we know hasModules is accurate.
  useEffect(() => {
    if (enrollment && user && !hasModules && !loading) {
      handleProgressUpdate({});
    }
  }, [enrollment?.id, loading]);

  const handleEnroll = async () => {
    if (!user?.id || !course) return;

    setEnrolling(true);
    try {
      const token = await getToken();
      if (!token) {
        setError(t('academy.tokenDeAutenticacaoNaoEncontrado'));
        return;
      }

      const response = await fetch('/api/academy/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: ***REMOVED***
          course_id: courseId
        })
      });

      const data = await response.json();

      if (data.success) {
        await loadEnrollment();
        if (hasModules) await loadModules();
      } else {
        setError(data.error || t('academy.erroAoRealizarMatricula'));
      }
    } catch (error) {
      console.error(t('academy.erroAoRealizarMatricula'), error);
      setError(t('academy.erroAoRealizarMatricula'));
    } finally {
      setEnrolling(false);
    }
  };

  const handleProgressUpdate = useCallback(async (progressData: {
    progress_percentage?: number;
    last_watched_position?: number;
    watch_time_increment?: number;
    module_id?: string;
  }) => {
    if (!enrollment || !user) return;

    const pct = progressData.progress_percentage ?? 0;
    const isCompletion = pct >= 100;

    // Optimistic local state update — sidebar updates in real-time
    if (progressData.module_id && hasModules) {
      setModules(prev => prev.map(m => {
        if (m.id !== progressData.module_id) return m;
        const currentCompletedAt = m.progress?.completed_at;
        const newCompletedAt = isCompletion ? new Date().toISOString() : currentCompletedAt;

        return {
          ...m,
          progress: {
            progress_percentage: currentCompletedAt ? 100 : Math.max(m.progress?.progress_percentage || 0, Math.min(100, pct)),
            last_watched_position: progressData.last_watched_position ?? m.progress?.last_watched_position ?? 0,
            total_watch_time: (m.progress?.total_watch_time ?? 0) + (progressData.watch_time_increment ?? 0),
            ...(newCompletedAt ? { completed_at: newCompletedAt } : {})
          }
        };
      }));
    }

    try {
      const token = await getToken();
      if (!token) return;

      const progressPromise = fetch('/api/academy/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: ***REMOVED***
          enrollment_id: enrollment.id,
          ...progressData
        })
      });

      // On completion: await + full reload to get accurate server state & unlock next module
      if (isCompletion) {
        await progressPromise;
        await loadEnrollment();
        if (hasModules) await loadModules();
      }
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
    }
  }, [enrollment?.id, user?.id, hasModules]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`;
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return t('academy.iniciante');
      case 'intermediate': return t('academy.intermediario');
      case 'advanced': return t('academy.avancado');
      default: return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
      />
    ));
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !course) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erro</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error || t('academy.cursoNaoEncontrado')}</p>
                </div>
                <div className="mt-4 space-x-3">
                  <button
                    onClick={() => router.back()}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => loadCourseData()}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const progress = enrollment?.progress?.[0];
  const isEnrolled = enrollment?.is_active;
  const isCompleted = enrollment?.completed_at;

  // Determine video source and progress based on module or course
  const currentVideoUrl = hasModules && activeModule ? activeModule.video_url : course.video_url;
  const currentVideoPosition = hasModules && activeModule
    ? activeModule.progress?.last_watched_position || 0
    : progress?.last_watched_position || 0;
  const currentVideoDuration = hasModules && activeModule ? activeModule.duration : course.duration;

  // For quiz: if course has modules, quiz unlocks when all modules completed
  // For no-modules: quiz unlocks at 95% progress (legacy behavior)
  const quizUnlocked = hasModules ? allModulesCompleted : (progress && progress.progress_percentage >= 95);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header com navegação */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            {t('academy.voltarAoAcademy')}
          </button>
        </div>

        {/* Tabs de navegação (Conteúdo vs Avaliação) */}
        {isEnrolled && (
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('content')}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'content'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                Conteúdo do Curso
              </button>
              <button
                onClick={() => quizUnlocked && setActiveTab('quiz')}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center
                  ${!quizUnlocked ? 'opacity-50 cursor-not-allowed' : ''}
                  ${activeTab === 'quiz'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {!quizUnlocked && <LockClosedIcon className="w-4 h-4 mr-1" />}
                <ClipboardDocumentCheckIcon className="w-5 h-5 mr-2" />
                Prova Final
              </button>
            </nav>
          </div>
        )}

        {activeTab === 'quiz' && courseId && enrollment ? (
          <QuizAssessment
            courseId={courseId}
            enrollmentId={enrollment.id}
            onComplete={(url) => { if (url) setCourseCompleted(true); }}
          />
        ) : (
          <div className={`grid grid-cols-1 ${hasModules && isEnrolled ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-8`}>

            {/* ── Module Sidebar (EAD) ── */}
            {hasModules && isEnrolled && (
              <div className="lg:col-span-1 order-2 lg:order-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-8">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <BookOpenIcon className="w-5 h-5 mr-2 text-blue-600" />
                      Módulos
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {modules.filter(m => m.progress?.completed_at).length} de {modules.length} completos
                    </p>
                    {/* Overall progress bar */}
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress?.progress_percentage || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {modules.map((mod, index) => {
                      const unlocked = isModuleUnlocked(mod, index);
                      const isActive = mod.id === activeModuleId;
                      const isComplete = !!mod.progress?.completed_at;
                      const modProgress = mod.progress?.progress_percentage || 0;

                      return (
                        <button
                          key={mod.id}
                          onClick={() => unlocked && setActiveModuleId(mod.id)}
                          disabled={!unlocked}
                          className={`w-full text-left p-3 transition-colors ${isActive
                            ? 'bg-blue-50 border-l-4 border-blue-500'
                            : unlocked
                              ? 'hover:bg-gray-50 border-l-4 border-transparent'
                              : 'opacity-50 cursor-not-allowed border-l-4 border-transparent'
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Status icon */}
                            <div className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isComplete
                              ? 'bg-green-100 text-green-700'
                              : !unlocked
                                ? 'bg-gray-100 text-gray-400'
                                : modProgress > 0
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                              {isComplete ? (
                                <CheckIcon className="w-4 h-4" />
                              ) : !unlocked ? (
                                <LockClosedIcon className="w-3 h-3" />
                              ) : (
                                index + 1
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                                {mod.title}
                              </p>
                              {mod.duration > 0 && (
                                <p className="text-xs text-gray-500 flex items-center mt-0.5">
                                  <ClockIcon className="w-3 h-3 mr-1" />
                                  {formatDuration(mod.duration)}
                                </p>
                              )}
                              {/* Module progress bar */}
                              {unlocked && modProgress > 0 && !isComplete && (
                                <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                                  <div
                                    className="bg-blue-500 h-1 rounded-full transition-all"
                                    style={{ width: `${modProgress}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {/* Final Exam entry */}
                    <button
                      onClick={() => quizUnlocked && setActiveTab('quiz')}
                      disabled={!quizUnlocked}
                      className={`w-full text-left p-3 transition-colors border-l-4 ${!quizUnlocked
                        ? 'opacity-50 cursor-not-allowed border-transparent'
                        : 'hover:bg-yellow-50 border-transparent'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${courseCompleted
                          ? 'bg-green-100 text-green-700'
                          : quizUnlocked
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-400'
                          }`}>
                          {courseCompleted ? (
                            <CheckIcon className="w-4 h-4" />
                          ) : !quizUnlocked ? (
                            <LockClosedIcon className="w-3 h-3" />
                          ) : (
                            <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Prova Final</p>
                          <p className="text-xs text-gray-500">
                            {!quizUnlocked ? 'Complete todos os módulos' : 'Disponível'}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Main content area ── */}
            <div className={`${hasModules && isEnrolled ? 'lg:col-span-2 order-1 lg:order-2' : 'lg:col-span-2'}`}>
              {/* Player de vídeo */}
              {isEnrolled && currentVideoUrl ? (
                <div className="mb-6">
                  {/* Module title */}
                  {hasModules && activeModule && (
                    <div className="mb-3">
                      <h2 className="text-lg font-semibold text-gray-900">{activeModule.title}</h2>
                      {activeModule.description && (
                        <p className="text-sm text-gray-600 mt-1">{activeModule.description}</p>
                      )}
                    </div>
                  )}
                  <VideoPlayer
                    key={hasModules ? activeModuleId : courseId}
                    src={currentVideoUrl}
                    poster={hasModules && activeModule ? activeModule.thumbnail_url : course.thumbnail_url}
                    title={hasModules && activeModule ? activeModule.title : course.title}
                    initialPosition={currentVideoPosition}
                    onProgress={(position, percentage) => {
                      // Always use configured module/course duration for % calculation
                      // YouTube reports % against its actual video length, but we want
                      // progress based on the configured duration set by the admin
                      let finalPercentage = percentage;
                      if (currentVideoDuration > 0) {
                        finalPercentage = Math.min(100, (position / currentVideoDuration) * 100);
                      }

                      handleProgressUpdate({
                        last_watched_position: position,
                        progress_percentage: Math.round(finalPercentage),
                        watch_time_increment: 5,
                        ...(hasModules && activeModuleId ? { module_id: activeModuleId } : {})
                      });
                    }}
                    onComplete={() => {
                      if (hasModules && activeModuleId) {
                        handleProgressUpdate({
                          progress_percentage: 100,
                          module_id: activeModuleId
                        });
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="relative mb-6">
                  <img
                    src={course.thumbnail_url || '/images/course-default.svg'}
                    alt={course.title}
                    className="w-full h-64 md:h-96 object-cover rounded-lg"
                  />
                  {!isEnrolled && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                      <div className="text-center text-white">
                        <PlayIcon className="h-16 w-16 mx-auto mb-4" />
                        <p className="text-lg font-medium">{t('academy.matriculeSeParaAssistir')}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Informações do curso */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
                    <p className="text-gray-600">{course.short_description || course.description}</p>
                  </div>
                  {course.category && (
                    <span
                      className="ml-4 px-3 py-1 text-sm font-medium rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: `${course.category.color}20`,
                        color: course.category.color
                      }}
                    >
                      {course.category.name}
                    </span>
                  )}
                </div>

                {/* Progresso (se matriculado) */}
                {isEnrolled && progress && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">{t('academy.seuProgresso')}</span>
                      <span className="text-sm text-blue-700">{progress.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progress_percentage}%` }}
                      ></div>
                    </div>
                    {isCompleted && (
                      <div className="flex items-center mt-2 text-green-600">
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">{t('academy.cursoConcluido')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Descrição completa */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('academy.sobreEsteCurso')}</h3>
                  <p className="text-gray-700 whitespace-pre-line">{course.description}</p>
                </div>

                {/* Objetivos de aprendizagem */}
                {course.learning_objectives && course.learning_objectives.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('academy.oQueVoceVaiAprender')}</h3>
                    <ul className="space-y-2">
                      {course.learning_objectives.map((objective, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pré-requisitos */}
                {course.prerequisites && course.prerequisites.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('academy.preRequisitos')}</h3>
                    <ul className="space-y-2">
                      {course.prerequisites.map((prerequisite, index) => (
                        <li key={index} className="flex items-start">
                          <BookOpenIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{prerequisite}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags */}
                {course.tags && course.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('academy.tags')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {course.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Sidebar — Informações e ações ── */}
            <div className={`${hasModules && isEnrolled ? 'lg:col-span-1 order-3' : 'lg:col-span-1'}`}>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
                {/* Botão de matrícula/acesso */}
                {!user ? (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      {t('academy.facaLoginParaSeMatricular')}
                    </p>
                  </div>
                ) : !isEnrolled ? (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center mb-6 disabled:opacity-50"
                  >
                    {enrolling ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    ) : (
                      <AcademicCapIcon className="h-5 w-5 mr-2" />
                    )}
                    {enrolling ? t('academy.matriculando') : t('academy.matricularSeGratuitamente')}
                  </button>
                ) : (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center text-green-800">
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      <span className="font-medium">{t('academy.voceEstaMatriculado')}</span>
                    </div>
                  </div>
                )}

                {/* Informações do curso */}
                <div className="space-y-4">
                  {hasModules && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Módulos</span>
                      <span className="text-gray-900 font-medium">{modules.length}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('academy.duracao')}</span>
                    <div className="flex items-center text-gray-900">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {formatDuration(hasModules ? modules.reduce((s, m) => s + m.duration, 0) : course.duration)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('academy.nivel')}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(course.difficulty_level)}`}>
                      {getDifficultyLabel(course.difficulty_level)}
                    </span>
                  </div>

                  {course.instructor && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t('academy.instrutor')}</span>
                      <div className="flex items-center text-gray-900">
                        <UserIcon className="h-4 w-4 mr-1" />
                        {course.instructor.first_name} {course.instructor.last_name}
                      </div>
                    </div>
                  )}

                  {course.stats && course.stats.ratings_count > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t('academy.avaliacao')}</span>
                      <div className="flex items-center">
                        <div className="flex items-center mr-2">
                          {renderStars(course.stats.average_rating)}
                        </div>
                        <span className="text-sm text-gray-600">
                          {course.stats.average_rating.toFixed(1)} ({course.stats.ratings_count})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Seção de avaliações */}
        {courseId && (
          <div className="mt-12">
            <Ratings courseId={courseId} isEnrolled={isEnrolled} />
          </div>
        )}

        {/* Seção de comentários */}
        {courseId && (
          <div className="mt-12">
            <Comments courseId={courseId} />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CoursePage;
