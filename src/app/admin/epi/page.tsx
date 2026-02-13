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
import { generateEPIReport } from '@/lib/pdf/generateEPIReport';
import { toast } from 'react-hot-toast';
import KitManagement from '@/components/admin/EPI/KitManagement';
import StockManagement from '@/components/admin/EPI/StockManagement';
import CALookupField from '@/components/epi/CALookupField';

type TabType = 'requests' | 'types' | 'kits' | 'stock';

export default function AdminEPIPage() {
    const { profile, hasAccess } = useSupabaseAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('requests');
    const [registrations, setRegistrations] = useState<EPIWithUser[]>([]);
    const [epiTypes, setEpiTypes] = useState<EPIType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<EPIWithUser | null>(null);
    const [showTypeModal, setShowTypeModal] = useState(false);

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

            const [registrationsRes, typesRes] = await Promise.all([
                fetch('/api/epi'),
                fetch('/api/epi/types')
            ]);

            if (!registrationsRes.ok) throw new Error('Erro ao carregar solicitações');
            const registrationsData = await registrationsRes.json();
            setRegistrations(registrationsData.data || []);

            if (typesRes.ok) {
                const typesData = await typesRes.json();
                setEpiTypes(typesData.data || []);
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
            const res = await fetch('/api/epi/types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Erro ao criar tipo');
            await loadData();
            setShowTypeModal(false);
            toast.success('Tipo criado com sucesso');
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

    const handleGenerateReport = () => {
        try {
            generateEPIReport(registrations, 'Relatório Geral de EPIs');
            toast.success('Relatório gerado com sucesso!');
        } catch (err) {
            console.error(err);
            toast.error('Erro ao gerar relatório.');
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
                        <button onClick={handleGenerateReport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
                            <TypesGrid types={epiTypes} onCreate={handleCreateType} onDelete={handleDeleteType} showModal={showTypeModal} setShowModal={setShowTypeModal} />
                        ) : activeTab === 'kits' ? (
                            <KitManagement />
                        ) : (
                            <StockManagement />
                        )}
                    </div>
                </div>

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

function TypesGrid({ types, onCreate, onDelete, showModal, setShowModal }: { types: EPIType[]; onCreate: (d: any) => Promise<void>; onDelete: (id: string) => void; showModal: boolean; setShowModal: (s: boolean) => void }) {
    const [formData, setFormData] = useState({ name: '', description: '', category: '', ca_number: '', is_required: false });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onCreate(formData);
            setFormData({ name: '', description: '', category: '', ca_number: '', is_required: false });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"><FiPlus /> Novo Tipo</button>
            </div>
            {types.length === 0 ? <div className="text-center py-12 text-gray-500">Nenhum tipo cadastrado.</div> : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {types.map(t => (
                        <div key={t.id} className="border rounded-lg p-4 relative">
                            <h3 className="font-bold">{t.name}</h3>
                            <p className="text-sm text-gray-500">{t.category}</p>
                            {t.ca_number && (
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500">CA: {t.ca_number}</span>
                                    {t.ca_validity_date && (
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${CA_VALIDITY_COLORS[getCAValidityLevel(t.ca_validity_date, t.ca_status)]}`}>
                                            {CA_VALIDITY_LABELS[getCAValidityLevel(t.ca_validity_date, t.ca_status)]}
                                        </span>
                                    )}
                                </div>
                            )}
                            {t.ca_manufacturer && <p className="text-xs text-gray-400 mt-0.5">{t.ca_manufacturer}</p>}
                            <button onClick={() => onDelete(t.id)} className="absolute top-4 right-4 text-red-500"><FiClose /></button>
                        </div>
                    ))}
                </div>
            )}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h2 className="text-xl font-semibold mb-4">Novo Tipo de EPI</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
                            </div>
                            <div>
                                <CALookupField
                                    value={formData.ca_number}
                                    onChange={(val) => setFormData({ ...formData, ca_number: val })}
                                    label="CA (Certificado de Aprovação)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                                <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={formData.is_required} onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })} id="is_required" />
                                <label htmlFor="is_required" className="text-sm text-gray-700">EPI Obrigatório</label>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
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

function RequestModal({
    request,
    onClose,
    onUpdateStatus
}: {
    request: EPIWithUser;
    onClose: () => void;
    onUpdateStatus: (id: string, status: string, validityDate?: string) => void;
}) {
    const [validityDate, setValidityDate] = useState('');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6">
                <h2 className="text-xl font-semibold mb-4">Detalhes da Solicitação</h2>
                <div className="space-y-3">
                    <div><label className="text-sm text-gray-500">Colaborador</label><p className="font-medium">{request.user_name || 'N/A'}</p></div>
                    <div><label className="text-sm text-gray-500">Equipamento</label><p className="font-medium">{request.equipment_type} (Qtd: {request.quantity})</p></div>
                    <div><label className="text-sm text-gray-500">Motivo</label><p className="text-gray-700">{request.reason}</p></div>
                    {request.status === 'pending' && (
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Data de Validade (Opcional)</label>
                            <input
                                type="date"
                                className="w-full border rounded-lg px-3 py-2"
                                value={validityDate}
                                onChange={(e) => setValidityDate(e.target.value)}
                            />
                            <p className="text-xs text-gray-400 mt-1">Defina a validade se aplicável para este CA.</p>
                        </div>
                    )}
                    {(request.validity_date) && (
                        <div><label className="text-sm text-gray-500">Validade</label><p className="font-medium">{new Date(request.validity_date).toLocaleDateString('pt-BR')}</p></div>
                    )}
                    <div><label className="text-sm text-gray-500">Status</label><div className="mt-1"><EPIStatusBadge status={request.status} /></div></div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Fechar</button>
                    {request.status === 'pending' && (
                        <>
                            <button onClick={() => onUpdateStatus(request.id, 'rejected')} className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600">Reprovar</button>
                            <button onClick={() => onUpdateStatus(request.id, 'approved', validityDate)} className="px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600">Aprovar</button>
                        </>
                    )}
                    {request.status === 'approved' && (
                        <button onClick={() => onUpdateStatus(request.id, 'delivered')} className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600">Marcar Entregue</button>
                    )}
                </div>
            </div>
        </div>
    );
}
