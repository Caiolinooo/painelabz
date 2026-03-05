'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiX, FiAlertCircle } from 'react-icons/fi';
import { EPIType } from '@/types/epi';

const epiSchema = z.object({
    equipment_type: z.string().min(1, 'Tipo de EPI é obrigatório'),
    quantity: z.number().min(1, 'Quantidade deve ser maior que 0'),
    reason: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres').max(500, 'Motivo deve ter no máximo 500 caracteres'),
});

type EPIFormData = z.infer<typeof epiSchema>;

interface EPIFormProps {
    epiTypes: EPIType[];
    onSubmit: (data: EPIFormData) => Promise<void>;
    onCancel: () => void;
}

export default function EPIForm({ epiTypes, onSubmit, onCancel }: EPIFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<EPIFormData>({
        resolver: zodResolver(epiSchema),
        defaultValues: {
            quantity: 1
        }
    });

    const onSubmitForm = async (data: EPIFormData) => {
        try {
            setIsSubmitting(true);
            setError(null);
            await onSubmit(data);
            reset();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Nova Solicitação de EPI</h2>
                <button
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-500"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                        <FiAlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
                {/* Equipment Type */}
                <div>
                    <label htmlFor="equipment_type" className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de EPI *
                    </label>
                    <select
                        id="equipment_type"
                        {...register('equipment_type')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                    >
                        <option value="">Selecione um equipamento...</option>
                        {epiTypes.length > 0 ? (
                            epiTypes.map((type) => (
                                <option key={type.id} value={type.name}>
                                    {type.name}
                                </option>
                            ))
                        ) : (
                            <>
                                <option value="Capacete">Capacete de Segurança</option>
                                <option value="Óculos de Proteção">Óculos de Proteção</option>
                                <option value="Luvas">Luvas de Proteção</option>
                                <option value="Botas">Botas de Segurança</option>
                                <option value="Colete">Colete Refletivo</option>
                                <option value="Protetor Auricular">Protetor Auricular</option>
                                <option value="Máscara">Máscara de Proteção</option>
                                <option value="Capuz">Capuz de Proteção</option>
                                <option value="Cinto de Segurança">Cinto de Segurança</option>
                                <option value="Outro">Outro</option>
                            </>
                        )}
                    </select>
                    {errors.equipment_type && (
                        <p className="mt-1 text-sm text-red-600">{errors.equipment_type.message}</p>
                    )}
                </div>

                {/* Quantity */}
                <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                        Quantidade *
                    </label>
                    <input
                        type="number"
                        id="quantity"
                        min="1"
                        {...register('quantity', { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    {errors.quantity && (
                        <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
                    )}
                </div>

                {/* Reason */}
                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                        Motivo da Solicitação *
                    </label>
                    <textarea
                        id="reason"
                        rows={4}
                        placeholder="Descreva o motivo da solicitação. Ex: Novo colaborador, troca por desgaste, atividade específica..."
                        {...register('reason')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    {errors.reason && (
                        <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
                    )}
                </div>

                {/* Info Box */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Informações Importantes</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• A solicitação será analisada pelo setor de segurança do trabalho</li>
                        <li>• Prazo de análise: até 5 dias úteis</li>
                        <li>• Você pode cancelar solicitações pendentes a qualquer momento</li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Enviando...
                            </>
                        ) : (
                            'Enviar Solicitação'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
