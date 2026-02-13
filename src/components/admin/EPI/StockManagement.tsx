'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiPackage, FiAlertTriangle, FiArrowUp, FiArrowDown, FiRefreshCw, FiPlus, FiSettings, FiTrendingDown, FiTrendingUp } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import type { EPIStockWithType, EPIStockMovement, EPIType, StockMovementType } from '@/types/epi';

// ==================== MOVEMENT TYPE LABELS ====================

const MOVEMENT_LABELS: Record<StockMovementType, { label: string; color: string; icon: string }> = {
    entry: { label: 'Entrada', color: 'bg-green-100 text-green-800', icon: '↑' },
    exit: { label: 'Saída', color: 'bg-red-100 text-red-800', icon: '↓' },
    adjustment: { label: 'Ajuste', color: 'bg-blue-100 text-blue-800', icon: '⟳' },
    return: { label: 'Devolução', color: 'bg-yellow-100 text-yellow-800', icon: '↩' },
};

export default function StockManagement() {
    const [stocks, setStocks] = useState<EPIStockWithType[]>([]);
    const [movements, setMovements] = useState<EPIStockMovement[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [selectedStock, setSelectedStock] = useState<EPIStockWithType | null>(null);
    const [epiTypes, setEpiTypes] = useState<EPIType[]>([]);

    // Movement form
    const [movementForm, setMovementForm] = useState({
        epi_type_id: '',
        movement_type: 'entry' as StockMovementType,
        quantity: 1,
        reason: '',
    });

    // Config form
    const [configForm, setConfigForm] = useState({
        minimum_quantity: 5,
        location: '',
    });

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [levelsRes, statsRes, movementsRes, typesRes] = await Promise.all([
                fetch('/api/epi/stock?view=levels'),
                fetch('/api/epi/stock?view=stats'),
                fetch('/api/epi/stock?view=movements&limit=20'),
                fetch('/api/epi/types'),
            ]);

            if (levelsRes.ok) {
                const d = await levelsRes.json();
                setStocks(d.data || []);
            }
            if (statsRes.ok) {
                const d = await statsRes.json();
                setStats(d.data || null);
            }
            if (movementsRes.ok) {
                const d = await movementsRes.json();
                setMovements(d.data || []);
            }
            if (typesRes.ok) {
                const d = await typesRes.json();
                setEpiTypes(d.data || []);
            }
        } catch (err: any) {
            toast.error('Erro ao carregar dados de estoque');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleInitialize = async () => {
        try {
            const res = await fetch('/api/epi/stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED*** action: 'initialize' }),
            });
            if (res.ok) {
                const d = await res.json();
                toast.success(d.message);
                loadData();
            } else {
                const d = await res.json();
                toast.error(d.error || 'Erro ao inicializar');
            }
        } catch { toast.error('Erro ao inicializar estoque'); }
    };

    const handleMovement = async () => {
        if (!movementForm.epi_type_id) { toast.error('Selecione um tipo de EPI'); return; }
        if (movementForm.quantity <= 0) { toast.error('Quantidade deve ser maior que zero'); return; }

        try {
            const res = await fetch('/api/epi/stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(movementForm),
            });
            if (res.ok) {
                toast.success('Movimentação registrada');
                setShowMovementModal(false);
                setMovementForm({ epi_type_id: '', movement_type: 'entry', quantity: 1, reason: '' });
                loadData();
            } else {
                const d = await res.json();
                toast.error(d.error || 'Erro na movimentação');
            }
        } catch { toast.error('Erro ao registrar movimentação'); }
    };

    const handleUpdateConfig = async () => {
        if (!selectedStock) return;
        try {
            const res = await fetch('/api/epi/stock', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED***
                    id: selectedStock.id,
                    minimum_quantity: configForm.minimum_quantity,
                    location: configForm.location,
                }),
            });
            if (res.ok) {
                toast.success('Configuração atualizada');
                setShowConfigModal(false);
                loadData();
            } else {
                const d = await res.json();
                toast.error(d.error || 'Erro ao atualizar');
            }
        } catch { toast.error('Erro ao atualizar configuração'); }
    };

    const openConfig = (stock: EPIStockWithType) => {
        setSelectedStock(stock);
        setConfigForm({
            minimum_quantity: stock.minimum_quantity,
            location: stock.location || '',
        });
        setShowConfigModal(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
        );
    }

    const lowStockItems = stocks.filter(s => s.is_low_stock);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg"><FiPackage className="w-5 h-5 text-white" /></div>
                        <div>
                            <p className="text-xs text-blue-600 font-medium">Tipos Rastreados</p>
                            <p className="text-2xl font-bold text-blue-800">{stats?.total_types_tracked || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-lg"><FiTrendingUp className="w-5 h-5 text-white" /></div>
                        <div>
                            <p className="text-xs text-green-600 font-medium">Total em Estoque</p>
                            <p className="text-2xl font-bold text-green-800">{stats?.total_items_in_stock || 0}</p>
                        </div>
                    </div>
                </div>
                <div className={`bg-gradient-to-br rounded-xl p-4 border ${lowStockItems.length > 0 ? 'from-red-50 to-red-100 border-red-200' : 'from-gray-50 to-gray-100 border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${lowStockItems.length > 0 ? 'bg-red-500' : 'bg-gray-400'}`}>
                            <FiAlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className={`text-xs font-medium ${lowStockItems.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>Estoque Baixo</p>
                            <p className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-red-800' : 'text-gray-600'}`}>{lowStockItems.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-lg"><FiRefreshCw className="w-5 h-5 text-white" /></div>
                        <div>
                            <p className="text-xs text-purple-600 font-medium">Última Reposição</p>
                            <p className="text-sm font-bold text-purple-800">
                                {stats?.last_restock_date ? new Date(stats.last_restock_date).toLocaleDateString('pt-BR') : '-'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FiAlertTriangle className="w-5 h-5 text-red-500" />
                        <h3 className="font-semibold text-red-800">Alerta de Estoque Baixo</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {lowStockItems.map(s => (
                            <span key={s.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {s.epi_type?.name || 'EPI'}: {s.current_quantity}/{s.minimum_quantity}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
                <button
                    onClick={() => setShowMovementModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium transition"
                >
                    <FiPlus className="w-4 h-4" /> Nova Movimentação
                </button>
                <button
                    onClick={handleInitialize}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition"
                >
                    <FiRefreshCw className="w-4 h-4" /> Inicializar Estoque
                </button>
            </div>

            {/* Stock Table */}
            <div className="bg-white border rounded-lg overflow-hidden">
                <h3 className="px-4 py-3 font-semibold text-gray-700 bg-gray-50 border-b">Estoque por Tipo de EPI</h3>
                {stocks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <FiPackage className="mx-auto w-10 h-10 mb-2" />
                        <p>Nenhum registro de estoque. Clique em &quot;Inicializar Estoque&quot; para criar.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo EPI</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Mínimo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nível</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Local</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {stocks.map(stock => {
                                    const pct = stock.minimum_quantity > 0
                                        ? Math.min(100, (stock.current_quantity / (stock.minimum_quantity * 2)) * 100)
                                        : 100;
                                    const barColor = stock.is_low_stock ? 'bg-red-500' : pct > 60 ? 'bg-green-500' : 'bg-yellow-500';
                                    return (
                                        <tr key={stock.id} className={`hover:bg-gray-50 ${stock.is_low_stock ? 'bg-red-50' : ''}`}>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {stock.epi_type?.name || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {stock.epi_type?.category || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-lg font-bold ${stock.is_low_stock ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {stock.current_quantity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-500">
                                                {stock.minimum_quantity}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                                    <div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {stock.location || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => openConfig(stock)}
                                                    className="text-gray-400 hover:text-gray-600 p-1"
                                                    title="Configurar"
                                                >
                                                    <FiSettings className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent Movements */}
            <div className="bg-white border rounded-lg overflow-hidden">
                <h3 className="px-4 py-3 font-semibold text-gray-700 bg-gray-50 border-b">Movimentações Recentes</h3>
                {movements.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">Nenhuma movimentação registrada</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">EPI</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qtd</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anterior → Novo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Realizado por</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {movements.map(m => {
                                    const info = MOVEMENT_LABELS[m.movement_type];
                                    return (
                                        <tr key={m.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {new Date(m.created_at).toLocaleDateString('pt-BR')}{' '}
                                                <span className="text-xs">{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${info?.color || 'bg-gray-100 text-gray-700'}`}>
                                                    {info?.icon} {info?.label || m.movement_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{m.epi_type_name || '-'}</td>
                                            <td className="px-4 py-3 text-center text-sm font-semibold">
                                                {m.movement_type === 'exit' ? (
                                                    <span className="text-red-600">-{m.quantity}</span>
                                                ) : m.movement_type === 'entry' || m.movement_type === 'return' ? (
                                                    <span className="text-green-600">+{m.quantity}</span>
                                                ) : (
                                                    <span className="text-blue-600">{m.quantity}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {m.previous_quantity} → {m.new_quantity}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{m.reason || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{m.performer_name || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Movement Modal */}
            {showMovementModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h2 className="text-xl font-semibold mb-4">Nova Movimentação de Estoque</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de EPI</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={movementForm.epi_type_id}
                                    onChange={(e) => setMovementForm({ ...movementForm, epi_type_id: e.target.value })}
                                >
                                    <option value="">Selecione...</option>
                                    {epiTypes.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Movimentação</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={movementForm.movement_type}
                                    onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value as StockMovementType })}
                                >
                                    <option value="entry">↑ Entrada</option>
                                    <option value="exit">↓ Saída</option>
                                    <option value="adjustment">⟳ Ajuste (valor absoluto)</option>
                                    <option value="return">↩ Devolução</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {movementForm.movement_type === 'adjustment' ? 'Nova Quantidade' : 'Quantidade'}
                                </label>
                                <input
                                    type="number"
                                    min={movementForm.movement_type === 'adjustment' ? 0 : 1}
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={movementForm.quantity}
                                    onChange={(e) => setMovementForm({ ...movementForm, quantity: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                                <textarea
                                    className="w-full border rounded-lg px-3 py-2"
                                    rows={2}
                                    value={movementForm.reason}
                                    onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                                    placeholder="ex: Compra de lote, ajuste de inventário..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowMovementModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                                Cancelar
                            </button>
                            <button onClick={handleMovement} className="px-4 py-2 text-white bg-yellow-500 rounded-lg hover:bg-yellow-600">
                                Registrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Config Modal */}
            {showConfigModal && selectedStock && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h2 className="text-xl font-semibold mb-4">Configurar Estoque: {selectedStock.epi_type?.name}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade Mínima (Alerta)</label>
                                <input
                                    type="number"
                                    min={0}
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={configForm.minimum_quantity}
                                    onChange={(e) => setConfigForm({ ...configForm, minimum_quantity: parseInt(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-gray-400 mt-1">Alerta quando o estoque atingir esta quantidade.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Local de Armazenamento</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={configForm.location}
                                    onChange={(e) => setConfigForm({ ...configForm, location: e.target.value })}
                                    placeholder="ex: Almoxarifado A, Sala 102..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                                Cancelar
                            </button>
                            <button onClick={handleUpdateConfig} className="px-4 py-2 text-white bg-yellow-500 rounded-lg hover:bg-yellow-600">
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
