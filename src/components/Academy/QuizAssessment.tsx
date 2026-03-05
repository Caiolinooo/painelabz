'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface QuizAssessmentProps {
    courseId: string;
    enrollmentId: string;
    onComplete: (certificateUrl?: string) => void;
}

export default function QuizAssessment({ courseId, enrollmentId, onComplete }: QuizAssessmentProps) {
    const { t } = useI18n();
    const { getToken } = useSupabaseAuth();

    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        loadQuestions();
    }, [courseId]);

    const loadQuestions = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const res = await fetch(`/api/academy/questions?course_id=${courseId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setQuestions(data.questions || []);
            } else {
                setError(data.error || 'Erro ao carregar avaliação');
            }
        } catch (e) {
            setError('Erro de conexão ao carregar avaliação');
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = (questionId: string, optionId: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: { question_id: questionId, selected_option_id: optionId }
        }));
    };

    const handleTextAnswer = (questionId: string, text: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: { question_id: questionId, text_answer: text }
        }));
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length < questions.length) {
            setError('Por favor, responda todas as questões antes de enviar.');
            return;
        }

        setError('');
        setSubmitting(true);

        try {
            const token = await getToken();
            const res = await fetch('/api/academy/answers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    course_id: courseId,
                    enrollment_id: enrollmentId,
                    answers: Object.values(answers)
                })
            });

            const data = await res.json();

            if (data.success) {
                setResult(data);
                if (data.isPassed || data.certificateIssued) {
                    onComplete(data.certificateUrl);
                }
            } else {
                setError(data.error || 'Erro ao enviar respostas');
            }
        } catch (e) {
            setError('Erro de conexão ao enviar respostas');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>;

    if (questions.length === 0) {
        return (
            <div className="bg-gray-50 p-6 rounded-lg text-center border">
                <p className="text-gray-500">Nenhuma avaliação cadastrada para este curso.</p>
                <button onClick={() => onComplete()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">
                    Finalizar Curso e Emitir Certificado
                </button>
            </div>
        );
    }

    if (result) {
        const isPassed = result.isPassed;
        const isManual = result.needsGrading;

        return (
            <div className={`p-8 rounded-lg border text-center ${isPassed ? 'bg-green-50 border-green-200' : isManual ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                {isPassed && <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />}
                {!isPassed && !isManual && <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />}
                {isManual && <ClockIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />}

                <h3 className="text-2xl font-bold mb-2 text-gray-900">
                    {isPassed ? 'Parabéns! Você foi aprovado.' : isManual ? 'Avaliação enviada para revisão' : 'Você não atingiu a nota mínima.'}
                </h3>

                {!isManual && (
                    <p className="text-lg text-gray-700 mb-6">Sua pontuação final foi de <strong>{result.scorePercentage}%</strong>.</p>
                )}

                {isManual && (
                    <p className="text-md text-gray-700 mb-6">Sua avaliação contém questões dissertativas e está aguardando correção do instrutor. Você será notificado sobre o resultado.</p>
                )}

                {result.certificateUrl && (
                    <a href={result.certificateUrl} target="_blank" rel="noreferrer" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        Visualizar Certificado
                    </a>
                )}

                {!isPassed && !isManual && (
                    <button onClick={() => { setResult(null); setAnswers({}); }} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium">
                        Tentar Novamente
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border p-6 md:p-8">
            <div className="mb-6 border-b pb-4">
                <h2 className="text-xl font-bold text-gray-900">Avaliação do Curso</h2>
                <p className="text-sm text-gray-500 mt-1">Responda todas as perguntas abaixo para concluir o curso.</p>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <div className="space-y-8">
                {questions.map((q, index) => (
                    <div key={q.id} className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                        <h4 className="font-semibold text-gray-900 mb-4">{index + 1}. {q.question_text}</h4>

                        {q.question_type === 'MULTIPLE_CHOICE' ? (
                            <div className="space-y-3">
                                {q.options?.map((opt: any) => (
                                    <label key={opt.id} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${answers[q.id]?.selected_option_id === opt.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                        <div className="flex-shrink-0 mt-0.5">
                                            <input
                                                type="radio"
                                                name={`question-${q.id}`}
                                                value={opt.id}
                                                checked={answers[q.id]?.selected_option_id === opt.id}
                                                onChange={() => handleOptionSelect(q.id, opt.id)}
                                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="ml-3">
                                            <span className="block text-sm font-medium text-gray-900">{opt.option_text}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div>
                                <textarea
                                    rows={4}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                                    placeholder="Digite sua resposta aqui..."
                                    value={answers[q.id]?.text_answer || ''}
                                    onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8 pt-6 border-t flex justify-end">
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`px-6 py-3 font-medium rounded-md text-white shadow-sm ${submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {submitting ? 'Enviando...' : 'Finalizar Avaliação'}
                </button>
            </div>
        </div>
    );
}
