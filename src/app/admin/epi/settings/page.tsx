'use client';

import { useState, useEffect } from 'react';
import { EPISectorResponsible } from '@/types/epi';
import { toast } from 'react-hot-toast';
import { FiTrash2, FiPlus, FiSearch } from 'react-icons/fi';

export default function AdminEPISettingsPage() {
    const [sectors, setSectors] = useState<string[]>([]);
    const [responsibles, setResponsibles] = useState<EPISectorResponsible[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSector, setSelectedSector] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/epi/sector-responsibles');
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || 'Erro ao carregar dados');
            }

            setSectors(json.data.sectors || []);
            setResponsibles(json.data.responsibles || []);
            setUsers(json.data.users || []);
        } catch (error) {
            console.error('Error loading settings:', error);
            toast.error('Erro ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    const handleAddResponsible = async () => {
        if (!selectedSector || !selectedUser) return;
        try {
            const res = await fetch('/api/epi/sector-responsibles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sectorId: selectedSector, userId: selectedUser })
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || 'Erro ao adicionar responsável');
            }

            toast.success('Responsável adicionado com sucesso');
            setIsModalOpen(false);
            setSelectedUser('');
            loadData();
        } catch (error: any) {
            console.error('Error adding responsible:', error);
            toast.error(error.message || 'Erro ao adicionar responsável');
        }
    };

    const handleRemoveResponsible = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este responsável?')) return;
        try {
            const res = await fetch(`/api/epi/sector-responsibles?id=${id}`, {
                method: 'DELETE'
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || 'Erro ao remover responsável');
            }

            toast.success('Responsável removido com sucesso');
            loadData();
        } catch (error: any) {
            console.error('Error removing responsible:', error);
            toast.error(error.message || 'Erro ao remover responsável');
        }
    };

    const openAddModal = (sector: string) => {
        setSelectedSector(sector);
        setSearchTerm('');
        setSelectedUser('');
        setIsModalOpen(true);
    };

    // Helper to get user details
    const getUserDetails = (userId: string) => {
        return users.find(u => u.id === userId) || { name: 'Carregando...', email: '' };
    };

    const filteredUsers = users.filter(user =>
        (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Configurações de EPI</h1>
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Responsáveis por Setor</h2>
                <p className="text-gray-600 mb-6">Defina quem são os responsáveis pela aprovação de EPIs em cada setor.</p>

                <div className="space-y-6">
                    {sectors.map(sector => {
                        const sectorResponsibles = responsibles.filter(r => r.sector_id === sector);
                        return (
                            <div key={sector} className="border-b pb-4 last:border-0">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-medium text-lg text-gray-800">{sector}</h3>
                                    <button
                                        onClick={() => openAddModal(sector)}
                                        className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100"
                                    >
                                        <FiPlus /> Adicionar
                                    </button>
                                </div>

                                {sectorResponsibles.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {sectorResponsibles.map(resp => {
                                            const user = getUserDetails(resp.user_id);
                                            return (
                                                <div key={resp.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                                                    <div>
                                                        <p className="font-medium text-sm">{user.name}</p>
                                                        <p className="text-xs text-gray-500">{user.email}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveResponsible(resp.id)}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                        title="Remover"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Nenhum responsável definido.</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Adicionar Responsável - {selectedSector}</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Usuário</label>
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                                    placeholder="Nome ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mb-4 max-h-60 overflow-y-auto border rounded-lg">
                            {filteredUsers.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">Nenhum usuário encontrado.</div>
                            ) : (
                                filteredUsers.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => setSelectedUser(user.id)}
                                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-0 ${selectedUser === user.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                                    >
                                        <p className="font-medium text-sm">{user.name}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddResponsible}
                                disabled={!selectedUser}
                                className={`px-4 py-2 text-white rounded-lg ${!selectedUser ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
