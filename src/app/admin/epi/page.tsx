'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiShield, FiCheck, FiX, FiEye, FiPlus, FiX as FiClose, FiFileText, FiSettings, FiEdit2, FiRefreshCw } from 'react-icons/fi';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import EPIStatusBadge from '@/components/epi/EPIStatusBadge';
import { EPIRegistration, EPIType, EPIWithUser, getCAValidityLevel, CA_VALIDITY_COLORS, CA_VALIDITY_LABELS } from '@/types/epi';
import type { CALookupResult } from '@/types/epi';
import { generateEPIChecklist } from '@/lib/pdf/generateEPIChecklist';
import { toast } from 'react-hot-toast';
import KitManagement from '@/components/admin/EPI/KitManagement';
import StockManagement from '@/components/admin/EPI/StockManagement';
import CALookupField from '@/components/epi/CALookupField';
import { EPIReportModal } from '@/components/admin/EPI/EPIReportModal';

type TabType = 'requests' | 'types' | 'kits' | 'stock';

export default function AdminEPIPage() {
    const { profile, hasAccess } = useSupabaseAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('requests');
    const [registrations, setRegistrations] = useState<EPIWithUser[]>([]);
    const [epiTypes, setEpiTypes] = useState<EPIType[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<EPIWithUser | null>(null);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // New states for modal inputs
    const [validDate, setValidDate] = useState('');
    const [observation, setObservation] = useState('');
    const [equipmentCA, setEquipmentCA] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'MANAGER' || hasAccess('epi');

    useEffect(() => {
        if (!isAdmin) {
            router.push('/epi');
            return;
        }
        loadData();
    }, [isAdmin]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const [registrationsRes, typesRes, stockRes] = await Promise.all([
                fetch('/api/epi'),
                fetch('/api/epi/types'),
                fetch('/api/epi/stock?view=levels')
            ]);

            if (!registrationsRes.ok) throw new Error('Erro ao carregar solicitações');
            const registrationsData = await registrationsRes.json();
            setRegistrations(registrationsData.data || []);

            if (typesRes.ok) {
                const typesData = await typesRes.json();
                setEpiTypes(typesData.data || []);
            }

            if (stockRes.ok) {
                const stockData = await stockRes.json();
                setStocks(stockData.data || []);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenRequestModal = (request: EPIWithUser) => {
        setSelectedRequest(request);
        setValidDate(request.validity_date ? new Date(request.validity_date).toISOString().split('T')[0] : '');
        setObservation(request.observation || '');
        // Set CA: use override if exists, otherwise default from type, otherwise empty
        const defaultCA = epiTypes.find(t => t.name === request.equipment_type)?.ca_number || '';
        setEquipmentCA(request.equipment_ca || defaultCA);
    };

    const handleUpdate = async (status: 'approved' | 'rejected' | 'delivered') => {
        if (!selectedRequest) return;
        setIsSubmitting(true);
        try {
            const body: any = {
                id: selectedRequest.id,
                status,
                observation: observation || null,
                validity_date: validDate ? new Date(validDate).toISOString() : null,
                equipment_ca: equipmentCA || null
            };

            const res = await fetch('/api/epi', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Erro ao atualizar');
            }

            toast.success(`Solicitação atualizada com sucesso!`);
            setSelectedRequest(null);
            loadData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Erro ao atualizar solicitação.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedRequest) return;
        setIsSubmitting(true);
        try {
            const body: any = {
                id: selectedRequest.id,
                observation: observation || null,
                validity_date: validDate ? new Date(validDate).toISOString() : null,
                equipment_ca: equipmentCA || null
            };

            const res = await fetch('/api/epi', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Erro ao atualizar');
            }

            toast.success('Registro atualizado com sucesso!');
            setSelectedRequest(null);
            loadData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Erro ao atualizar registro.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateType = async (data: any) => {
        try {
            const { id, sizes, parent_id, size, ...rootData } = data;
            
            if (id) {
                // Editing an existing type
                const res = await fetch('/api/epi/types', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: ***REMOVED***
                        id,
                        parent_id: parent_id || null,
                        size: size || null,
                        ...rootData
                    })
                });
                if (!res.ok) throw new Error('Erro ao atualizar tipo de EPI');
                toast.success('Tipo de EPI atualizado com sucesso');
            } else if (parent_id) {
                // Creating a single child under an existing parent
                const parentType = epiTypes.find(t => t.id === parent_id);
                const childName = rootData.name || `${parentType?.name} - Tam ${size}`;
                const res = await fetch('/api/epi/types', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: ***REMOVED***
                        ...rootData,
                        name: childName,
                        parent_id,
                        size
                    })
                });
                if (!res.ok) throw new Error('Erro ao criar variação de EPI');
                toast.success('Variação de EPI criada com sucesso');
            } else {
                // Creating a new parent (and optionally multiple sizes)
                const res = await fetch('/api/epi/types', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: ***REMOVED***
                        ...rootData,
                        parent_id: null,
                        size: null
                    })
                });
                if (!res.ok) throw new Error('Erro ao criar tipo base');
                const rootJson = await res.json();
                const rootType = rootJson.data;

                // Create children if sizes were provided
                if (sizes && rootType?.id) {
                    const sizeList = sizes.split(',')
                        .map((s: string) => s.trim())
                        .filter((s: string) => s.length > 0);

                    for (const sizeVal of sizeList) {
                        const childRes = await fetch('/api/epi/types', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: ***REMOVED***
                                ...rootData,
                                name: `${rootData.name} - Tam ${sizeVal}`,
                                parent_id: rootType.id,
                                size: sizeVal
                            })
                        });
                        if (!childRes.ok) {
                            console.error(`Failed to create size variation: ${sizeVal}`);
                        }
                    }
                }
                toast.success(sizes ? 'Tipo base e variações de tamanho criados com sucesso' : 'Tipo criado com sucesso');
            }

            await loadData();
            setShowTypeModal(false);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDeleteType = async (id: string) => {
        if (!confirm('Tem certeza?')) return;
        try {
            const res = await fetch(`/api/epi/types?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Erro ao deletar');
            await loadData();
            toast.success('Tipo removido');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (!isAdmin) return null;

    return (
        <ErrorBoundary>
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <FiShield className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Gerenciar EPI</h1>
                            <p className="text-sm text-gray-500">Administração de EPIs</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                try {
                                    toast.loading('Sincronizando base de CA...', { id: 'ca-sync' });
                                    const res = await fetch('/api/epi/ca-lookup', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: ***REMOVED*** action: 'sync' })
                                    });
                                    const json = await res.json();
                                    if (res.ok) {
                                        toast.success(json.message || 'Base de CA sincronizada!', { id: 'ca-sync' });
                                    } else {
                                        toast.error(json.error || 'Erro ao sincronizar', { id: 'ca-sync' });
                                    }
                                } catch {
                                    toast.error('Erro ao sincronizar base de CA', { id: 'ca-sync' });
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            title="Sincronizar base de CA do MTE"
                        >
                            <FiRefreshCw className="w-4 h-4" />
                            Sync CA
                        </button>
                        <button
                            onClick={() => router.push('/admin/epi/settings')}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <FiSettings className="w-4 h-4" />
                            Configurações
                        </button>
                        <button onClick={() => setShowReportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <FiFileText className="w-4 h-4" /> Relatório Geral
                        </button>
                        <button onClick={() => router.push('/epi')} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">
                            Voltar
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="text-2xl font-bold">{registrations.length}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">Pendentes</p>
                        <p className="text-2xl font-bold text-yellow-600">{registrations.filter(r => r.status === 'pending').length}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">Aprovados</p>
                        <p className="text-2xl font-bold text-green-600">
                            {registrations.filter(r => r.status === 'approved').length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">Tipos</p>
                        <p className="text-2xl font-bold text-blue-600">{epiTypes.length}</p>
                    </div>
                </div>

                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

                <div className="bg-white rounded-lg shadow">
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px">
                            <button onClick={() => setActiveTab('requests')} className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'requests' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500'}`}>Solicitações</button>
                            <button onClick={() => setActiveTab('types')} className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'types' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500'}`}>Tipos de EPI</button>
                            <button onClick={() => setActiveTab('kits')} className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'kits' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500'}`}>Kits de EPI</button>
                            <button onClick={() => setActiveTab('stock')} className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'stock' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500'}`}>Estoque</button>
                        </nav>
                    </div>

                    <div className="p-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                            </div>
                        ) : activeTab === 'requests' ? (
                            <RequestsTable registrations={registrations} onSelect={handleOpenRequestModal} />
                        ) : activeTab === 'types' ? (
                            <TypesGrid types={epiTypes} stocks={stocks} onCreate={handleCreateType} onDelete={handleDeleteType} showModal={showTypeModal} setShowModal={setShowTypeModal} />
                        ) : activeTab === 'kits' ? (
                            <KitManagement />
                        ) : (
                            <StockManagement />
                        )}
                    </div>
                </div>

                <EPIReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />

                {selectedRequest && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-lg w-full p-6">
                            <h2 className="text-xl font-semibold mb-4">
                                {selectedRequest.status === 'pending' ? 'Avaliar Solicitação' : 'Editar Registro'}
                            </h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-sm text-gray-500">Colaborador</label><p className="font-medium">{selectedRequest.user_name || 'N/A'}</p></div>
                                    <div><label className="text-sm text-gray-500">Setor</label><p className="font-medium">{selectedRequest.user_sector || 'N/A'}</p></div>
                                </div>
                                <div><label className="text-sm text-gray-500">Equipamento</label><p className="font-medium">{selectedRequest.equipment_type} (Qtd: {selectedRequest.quantity})</p></div>
                                <div><label className="text-sm text-gray-500">Motivo</label><p className="text-gray-700">{selectedRequest.reason}</p></div>

                                <div className="border-t pt-4 mt-2">
                                    <h3 className="text-sm font-medium text-gray-900 mb-3">Dados da Aprovação</h3>

                                    <div className="mb-3">
                                        <CALookupField
                                            value={equipmentCA}
                                            onChange={setEquipmentCA}
                                            onValidityChange={(validity) => {
                                                if (validity) {
                                                    const dateStr = new Date(validity).toISOString().split('T')[0];
                                                    setValidDate(dateStr);
                                                }
                                            }}
                                            label="CA (Certificado de Aprovação)"
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Data de Validade</label>
                                        <input
                                            type="date"
                                            value={validDate}
                                            onChange={(e) => setValidDate(e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                                        <textarea
                                            value={observation}
                                            onChange={(e) => setObservation(e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2"
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 mt-6">
                                    <button onClick={() => setSelectedRequest(null)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>

                                    {selectedRequest.status === 'pending' ? (
                                        <>
                                            <button onClick={() => handleUpdate('rejected')} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Reprovar</button>
                                            <button onClick={() => handleUpdate('approved')} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Aprovar</button>
                                        </>
                                    ) : (
                                        <button onClick={handleSaveEdit} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar Alterações</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}

function RequestsTable({ registrations, onSelect }: { registrations: EPIWithUser[]; onSelect: (r: EPIWithUser) => void }) {
    if (registrations.length === 0) return <div className="text-center py-12 text-gray-500">Nenhuma solicitação encontrada.</div>;

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colaborador</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipamento</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CA</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validade</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {registrations.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900">{r.user_name || 'N/A'}</div>
                                <div className="text-xs text-gray-500">{r.user_sector}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{r.equipment_type} ({r.quantity})</td>
                            <td className="px-4 py-3"><EPIStatusBadge status={r.status} /></td>
                            <td className="px-4 py-3 text-sm text-gray-500">{r.equipment_ca || '-'}</td>
                            <td className="px-4 py-3">
                                {r.validity_date ? (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CA_VALIDITY_COLORS[getCAValidityLevel(r.validity_date, r.ca_status)]}`}>
                                        {new Date(r.validity_date).toLocaleDateString('pt-BR')}
                                    </span>
                                ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-3 text-right">
                                <button onClick={() => onSelect(r)} className="text-blue-600 hover:text-blue-900 mr-2" title={r.status === 'pending' ? 'Avaliar' : 'Editar'}><FiEdit2 className="w-4 h-4" /></button>
                                {r.status === 'delivered' && (
                                    <button
                                        onClick={() => generateEPIChecklist([r], r.user_name || '', r.user_position || '', r.user_sector || '', r.signature_url)}
                                        className="text-gray-600 hover:text-gray-900"
                                        title="Ver Ficha"
                                    >
                                        <FiFileText className="w-4 h-4" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TypesGrid({ types, stocks = [], onCreate, onDelete, showModal, setShowModal }: { types: EPIType[]; stocks?: any[]; onCreate: (d: any) => Promise<void>; onDelete: (id: string) => void; showModal: boolean; setShowModal: (s: boolean) => void }) {
    const [formData, setFormData] = useState({ id: '', name: '', description: '', category: '', ca_number: '', is_required: false, sizes: '', parent_id: '', size: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter states
    const [filterName, setFilterName] = useState('');
    const [filterCA, setFilterCA] = useState('');
    const [filterValidity, setFilterValidity] = useState('');
    const [filterQuantity, setFilterQuantity] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onCreate(formData);
            setFormData({ id: '', name: '', description: '', category: '', ca_number: '', is_required: false, sizes: '', parent_id: '', size: '' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (type: EPIType) => {
        setFormData({
            id: type.id,
            name: type.name,
            description: type.description || '',
            category: type.category,
            ca_number: type.ca_number || '',
            is_required: type.is_required || false,
            sizes: '',
            parent_id: type.parent_id || '',
            size: type.size || ''
        });
        setShowModal(true);
    };

    const stockMap = (stocks || []).reduce((acc: any, s: any) => {
        acc[s.epi_type_id] = s;
        return acc;
    }, {} as Record<string, any>);

    // Apply filters to flat list
    let filteredTypes = types;

    if (filterName) {
        filteredTypes = filteredTypes.filter(t => 
            t.name.toLowerCase().includes(filterName.toLowerCase())
        );
    }

    if (filterCA) {
        filteredTypes = filteredTypes.filter(t => 
            t.ca_number?.toString().includes(filterCA)
        );
    }

    if (filterValidity) {
        const targetDate = new Date(filterValidity);
        filteredTypes = filteredTypes.filter(t => {
            if (!t.ca_validity_date) return false;
            const valDate = new Date(t.ca_validity_date);
            return valDate <= targetDate;
        });
    }

    if (filterQuantity !== '') {
        const qtyLimit = parseInt(filterQuantity);
        if (!isNaN(qtyLimit)) {
            filteredTypes = filteredTypes.filter(t => {
                const qty = stockMap[t.id]?.current_quantity ?? 0;
                return qty <= qtyLimit;
            });
        }
    }

    // Build hierarchical view
    // A root type matches if either it matches directly or any of its child types match
    const matchingRootIds = new Set<string>();
    filteredTypes.forEach(t => {
        if (!t.parent_id) {
            matchingRootIds.add(t.id);
        } else {
            matchingRootIds.add(t.parent_id);
        }
    });

    const rootTypesToShow = types.filter(t => !t.parent_id && matchingRootIds.has(t.id));

    return (
        <div>
            <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                <h3 className="font-semibold text-gray-700">Tipos de EPI ({rootTypesToShow.length} principais)</h3>
                <button 
                    onClick={() => {
                        setFormData({ id: '', name: '', description: '', category: '', ca_number: '', is_required: false, sizes: '', parent_id: '', size: '' });
                        setShowModal(true);
                    }} 
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                    <FiPlus /> Novo Tipo
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-gray-50 border rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-gray-800">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nome do EPI</label>
                    <input
                        type="text"
                        placeholder="Filtrar por nome..."
                        className="w-full p-2 text-sm border rounded-md outline-none bg-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Número do CA</label>
                    <input
                        type="text"
                        placeholder="Filtrar por CA..."
                        className="w-full p-2 text-sm border rounded-md outline-none bg-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
                        value={filterCA}
                        onChange={(e) => setFilterCA(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Validade CA (Até)</label>
                    <input
                        type="date"
                        className="w-full p-2 text-sm border rounded-md outline-none bg-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
                        value={filterValidity}
                        onChange={(e) => setFilterValidity(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Estoque Máximo (Qtd &le;)</label>
                    <input
                        type="number"
                        placeholder="Qtd em estoque..."
                        min="0"
                        className="w-full p-2 text-sm border rounded-md outline-none bg-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
                        value={filterQuantity}
                        onChange={(e) => setFilterQuantity(e.target.value)}
                    />
                </div>
            </div>

            {rootTypesToShow.length === 0 ? <div className="text-center py-12 text-gray-500">Nenhum tipo de EPI encontrado.</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rootTypesToShow.map(root => {
                        const children = types.filter(c => c.parent_id === root.id);
                        const matchingChildren = children.filter(c => filteredTypes.some(ft => ft.id === c.id));
                        
                        // Calculate stock aggregated values
                        const totalStock = children.length > 0
                            ? children.reduce((sum, c) => sum + (stockMap[c.id]?.current_quantity ?? 0), 0)
                            : (stockMap[root.id]?.current_quantity ?? 0);
                        
                        const hasLowStock = children.length > 0
                            ? children.some(c => stockMap[c.id]?.is_low_stock)
                            : !!stockMap[root.id]?.is_low_stock;

                        const stockLocation = children.length === 0
                            ? stockMap[root.id]?.location
                            : null;

                        return (
                            <div key={root.id} className="border rounded-lg p-5 relative bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start pr-8">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">{root.name}</h3>
                                            <p className="text-sm text-gray-500">{root.category}</p>
                                        </div>
                                    </div>
                                    
                                    {root.ca_number && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500 font-medium">CA: {root.ca_number}</span>
                                            {root.ca_validity_date && (
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${CA_VALIDITY_COLORS[getCAValidityLevel(root.ca_validity_date, root.ca_status)]}`}>
                                                    {CA_VALIDITY_LABELS[getCAValidityLevel(root.ca_validity_date, root.ca_status)]}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {root.ca_manufacturer && <p className="text-xs text-gray-400 mt-0.5 truncate" title={root.ca_manufacturer}>{root.ca_manufacturer}</p>}

                                    {/* Size sub-divisions / Hierarchical stock */}
                                    {children.length > 0 ? (
                                        <div className="mt-4 pt-3 border-t">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sub-divisões / Tamanhos</p>
                                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                                {children.map(c => {
                                                    const stock = stockMap[c.id];
                                                    const isMatching = matchingChildren.some(mc => mc.id === c.id);
                                                    return (
                                                        <div 
                                                            key={c.id} 
                                                            className={`p-2 rounded-md border text-xs flex justify-between items-center transition-all ${
                                                                isMatching 
                                                                    ? 'bg-yellow-50/30 border-yellow-200' 
                                                                    : 'bg-gray-50 border-gray-100 text-gray-400 opacity-60'
                                                            }`}
                                                        >
                                                            <span>Tamanho: <strong className="text-gray-700">{c.size}</strong></span>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={stock?.is_low_stock ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                                                                    {stock?.current_quantity ?? 0}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleEdit(c)}
                                                                    className="text-blue-400 hover:text-blue-600 p-0.5"
                                                                    title="Editar variação"
                                                                >
                                                                    <FiEdit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        if (confirm(`Deseja excluir a variação de tamanho ${c.size}?`)) {
                                                                            onDelete(c.id);
                                                                        }
                                                                    }}
                                                                    className="text-red-400 hover:text-red-600 font-bold text-sm px-1"
                                                                    title="Excluir variação"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        root.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{root.description}</p>
                                    )}
                                </div>

                                <div className="flex justify-between items-center mt-4 pt-3 border-t text-xs text-gray-600">
                                    <span>Estoque Total: <strong className={hasLowStock ? "text-red-600 font-bold text-sm" : "text-emerald-600 font-bold text-sm"}>{totalStock}</strong></span>
                                    {stockLocation && <span className="truncate max-w-[150px]" title={stockLocation}>Local: {stockLocation}</span>}
                                </div>

                                <button 
                                    onClick={() => handleEdit(root)}
                                    className="absolute top-5 right-12 text-blue-400 hover:text-blue-600 transition-colors"
                                    title="Editar equipamento"
                                >
                                    <FiEdit2 className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => {
                                        if (confirm(`Deseja excluir o EPI "${root.name}" e todas as suas variações?`)) {
                                            onDelete(root.id);
                                        }
                                    }} 
                                    className="absolute top-5 right-5 text-red-400 hover:text-red-600 transition-colors"
                                    title="Excluir equipamento"
                                >
                                    <FiClose className="w-5 h-5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Creation Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 text-gray-800">
                        <h2 className="text-xl font-semibold mb-4">{formData.id ? 'Editar Tipo de EPI' : 'Novo Tipo de EPI'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">EPI Pai (Opcional - para criar tamanho/variação)</label>
                                <select
                                    value={formData.parent_id}
                                    onChange={(e) => {
                                        const pid = e.target.value;
                                        if (pid) {
                                            const parent = types.find(t => t.id === pid);
                                            setFormData({
                                                ...formData,
                                                parent_id: pid,
                                                category: parent?.category || '',
                                                description: parent?.description || '',
                                                ca_number: parent?.ca_number || '',
                                                is_required: parent?.is_required || false,
                                                sizes: ''
                                            });
                                        } else {
                                            setFormData({
                                                ...formData,
                                                parent_id: '',
                                                size: ''
                                            });
                                        }
                                    }}
                                    className="w-full border rounded-lg px-3 py-2 bg-white"
                                >
                                    <option value="">Nenhum (EPI Principal)</option>
                                    {types.filter(t => !t.parent_id).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome {formData.parent_id ? '(Opcional - Gerado automaticamente se vazio)' : '*'}
                                </label>
                                <input 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                                    className="w-full border rounded-lg px-3 py-2" 
                                    required={!formData.parent_id} 
                                    placeholder={formData.parent_id ? "Ex: Bota de Segurança - Tam 40" : "Ex: Bota de PVC"}
                                />
                            </div>
                            <div>
                                <CALookupField
                                    value={formData.ca_number}
                                    onChange={(val) => setFormData({ ...formData, ca_number: val })}
                                    label="CA (Certificado de Aprovação)"
                                />
                            </div>
                            {formData.parent_id ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho / Variação (Ex: 38, G, etc.) *</label>
                                    <input 
                                        type="text" 
                                        placeholder="ex: 38 ou G" 
                                        value={formData.size} 
                                        onChange={(e) => setFormData({ ...formData, size: e.target.value })} 
                                        className="w-full border rounded-lg px-3 py-2" 
                                        required
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tamanhos / Sub-divisões (Opcional - separados por vírgula)</label>
                                    <input 
                                        type="text" 
                                        placeholder="ex: 38, 39, 40 ou P, M, G" 
                                        value={formData.sizes} 
                                        onChange={(e) => setFormData({ ...formData, sizes: e.target.value })} 
                                        className="w-full border rounded-lg px-3 py-2" 
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Cria automaticamente variações de estoque para cada tamanho inserido.</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                >
                                    <option value="">Selecione a categoria...</option>
                                    <option value="Proteção da Cabeça">Proteção da Cabeça</option>
                                    <option value="Proteção dos Olhos e Face">Proteção dos Olhos e Face</option>
                                    <option value="Proteção Auditiva">Proteção Auditiva</option>
                                    <option value="Proteção Respiratória">Proteção Respiratória</option>
                                    <option value="Proteção do Tronco">Proteção do Tronco</option>
                                    <option value="Proteção dos Membros Superiores">Proteção dos Membros Superiores</option>
                                    <option value="Proteção dos Membros Inferiores">Proteção dos Membros Inferiores</option>
                                    <option value="Proteção contra Quedas">Proteção contra Quedas</option>
                                    <option value="Vestimentas de Trabalho">Vestimentas de Trabalho / Uniformes</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={formData.is_required} onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })} id="is_required" />
                                <label htmlFor="is_required" className="text-sm text-gray-700 font-medium">EPI Obrigatório</label>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                                    {isSubmitting ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Keeping any other auxiliary components if they existed at the bottom of the file
