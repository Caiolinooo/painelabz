import { useState } from 'react';
import { Loader2, FileText, X } from "lucide-react";
import { toast } from 'react-hot-toast';
import { generateEPIStockReport } from '@/lib/pdf/generateEPIStockReport';

interface EPIStockReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EPIStockReportModal({ isOpen, onClose }: EPIStockReportModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [reportType, setReportType] = useState<'all' | 'low_stock' | 'movements'>('all');
    const [includeMovements, setIncludeMovements] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    if (!isOpen) return null;

    const handleGenerate = async () => {
        try {
            setIsLoading(true);

            // 1. Fetch Stock Levels
            const levelsResponse = await fetch('/api/epi/stock?view=levels');
            if (!levelsResponse.ok) {
                throw new Error('Erro ao buscar dados de estoque');
            }
            const levelsJson = await levelsResponse.json();
            const stocks = levelsJson.data || [];

            // 2. Fetch Movements if requested
            let movements = [];
            const shouldFetchMovements = includeMovements || reportType === 'movements';

            if (shouldFetchMovements) {
                let url = '/api/epi/stock?view=movements&limit=500';
                if (startDate) url += `&startDate=${new Date(startDate).toISOString()}`;
                if (endDate) {
                    // Set end date to end of day to include all movements on that day
                    const endOfDay = new Date(endDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    url += `&endDate=${endOfDay.toISOString()}`;
                }

                const movementsResponse = await fetch(url);
                if (!movementsResponse.ok) {
                    throw new Error('Erro ao buscar movimentações de estoque');
                }
                const movementsJson = await movementsResponse.json();
                movements = movementsJson.data || [];
            }

            // Verify if there are results
            if (reportType === 'low_stock' && stocks.filter((s: any) => s.is_low_stock).length === 0) {
                toast.error('Nenhum item com estoque baixo encontrado.');
                setIsLoading(false);
                return;
            }

            // 3. Generate the PDF
            generateEPIStockReport(stocks, movements, {
                reportType,
                includeMovements: shouldFetchMovements,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                title: 'Relatório de Estoque de EPIs'
            });

            toast.success('Relatório de estoque gerado!');
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Erro ao gerar relatório.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden text-gray-800">
                <div className="flex justify-between items-center p-6 border-b">
                    <div>
                        <h2 className="text-xl font-semibold">Gerar Relatório de Estoque</h2>
                        <p className="text-sm text-gray-500 mt-1">Selecione as opções do relatório.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Visualização Principal */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Tipo de Relatório</label>
                        <select
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-white transition-all"
                            value={reportType}
                            onChange={(e) => {
                                const val = e.target.value as 'all' | 'low_stock' | 'movements';
                                setReportType(val);
                                if (val === 'movements') {
                                    setIncludeMovements(true);
                                }
                            }}
                        >
                            <option value="all">Estoque Atual Completo</option>
                            <option value="low_stock">Apenas Estoque Baixo (Alerta)</option>
                            <option value="movements">Apenas Histórico de Movimentações</option>
                        </select>
                    </div>

                    {/* Checkbox para incluir movimentações se não for o relatório exclusivo de movimentações */}
                    {reportType !== 'movements' && (
                        <div className="pt-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                                    checked={includeMovements}
                                    onChange={(e) => setIncludeMovements(e.target.checked)}
                                />
                                <span className="text-sm text-gray-700">Incluir histórico de movimentações</span>
                            </label>
                        </div>
                    )}

                    {/* Filtros de data (Visíveis se incluir movimentações) */}
                    {(includeMovements || reportType === 'movements') && (
                        <div className="space-y-3 pt-2 p-3 bg-gray-50 rounded-lg border border-gray-150 animate-fadeIn">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Período de Movimentações</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-600">Data Início</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-white"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-600">Data Fim</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-white"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-500 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4 mr-2" />
                                Gerar PDF
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
