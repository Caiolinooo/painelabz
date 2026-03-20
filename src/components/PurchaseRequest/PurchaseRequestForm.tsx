import React, { useState } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { FiPlus, FiTrash2, FiEdit, FiSave, FiX, FiPlusCircle, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useI18n } from '@/contexts/I18nContext';

interface Item {
    id: string;
    description: string;
    quantity: number;
    unit_value: number;
}

interface PurchaseRequestFormProps {
    initialData?: any;
    requestId?: string;
}

export default function PurchaseRequestForm({ initialData, requestId }: PurchaseRequestFormProps = {}) {
    const { user, profile } = useSupabaseAuth();
    const { t } = useI18n();
    const [items, setItems] = useState<Item[]>(initialData?.items?.map((item: any, idx: number) => ({
        id: item.id || `item-${idx}`,
        description: item.description,
        quantity: item.quantity,
        unit_value: item.unit_value
    })) || [{ id: 'item-1', description: '', quantity: 1, unit_value: 0 }]);
    const [formData, setFormData] = useState({
        provider_name: initialData?.provider_name || '',
        provider_cnpj: initialData?.provider_cnpj || '',
        provider_email: initialData?.provider_email || '',
        buyer_name: initialData?.buyer_name || '',
        payment_terms: initialData?.payment_terms || '',
        delivery_date: initialData?.delivery_date || '',
        delivery_address: initialData?.delivery_address || '',
        observation: initialData?.observation || '',
        sector_id: initialData?.sector_id || profile?.sector_id || '',
        total_value: initialData?.total_value || 0
    });
    const [loading, setLoading] = useState(false);

    const calculateTotal = () => {
        const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_value), 0);
        setFormData(prev => ({ ...prev, total_value: total }));
    };

    const handleAddItem = () => {
        const newId = `item-${items.length + 1}`;
        setItems([...items, { id: newId, description: '', quantity: 1, unit_value: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index);
            setItems(newItems);
            calculateTotal();
        }
    };

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
        calculateTotal();
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('abzToken') || localStorage.getItem('token');
            if (!token) {
                toast.error('Erro de autentica̧'); 
                return;
            }

            const url = requestId ? `/api/purchase-requests/${requestId}` : '/api/purchase-requests';
            const res = await fetch(url, {
                method: requestId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    items: items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        unit_value: item.unit_value
                    }))
                })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || (requestId ? 'Erro ao atualizar requisição' : 'Erro ao criar requisição')); 
            }

            const result = await res.json();
            toast.success(requestId ? 'Requisição atualizada com sucesso!' : 'Requisição criada com sucesso!');
            window.location.href = `/department/purchase-requests/${requestId || result.data?.id}`;

        } catch (error: any) {
            console.error('Error submitting request:', error);
            toast.error(error.message || 'Erro ao processar requisição');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fornecedor
                    </label>
                    <input
                        type="text"
                        value={formData.provider_name}
                        onChange={(e) => handleInputChange('provider_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome do fornecedor"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        CNPJ
                    </label>
                    <input
                        type="text"
                        value={formData.provider_cnpj}
                        onChange={(e) => handleInputChange('provider_cnpj', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="CNPJ do fornecedor"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                    </label>
                    <input
                        type="email"
                        value={formData.provider_email}
                        onChange={(e) => handleInputChange('provider_email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Email do fornecedor"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Solicitante
                    </label>
                    <input
                        type="text"
                        value={formData.buyer_name || (profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '') || ''}
                        onChange={(e) => handleInputChange('buyer_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome do solicitante"
                        defaultValue={profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ''}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Condições de Pagamento
                    </label>
                    <input
                        type="text"
                        value={formData.payment_terms}
                        onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: PIX, Boleto 30 Dias"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Entrega
                    </label>
                    <input
                        type="date"
                        value={formData.delivery_date}
                        onChange={(e) => handleInputChange('delivery_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Endereço de Entrega
                    </label>
                    <textarea
                        value={formData.delivery_address}
                        onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Endereço completo para entrega"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiFileText /> Itens da Requisição
                </h3>
                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Descrição
                                </label>
                                <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Descrição do item"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Quantidade
                                </label>
                                <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min="1"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Valor Unitário
                                </label>
                                <input
                                    type="number"
                                    value={item.unit_value}
                                    onChange={(e) => handleItemChange(index, 'unit_value', Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={() => handleRemoveItem(index)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                    <FiTrash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button
                        onClick={handleAddItem}
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <FiPlusCircle className="mr-2" /> Adicionar Item
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiFileText /> Observações
                </h3>
                <textarea
                    value={formData.observation}
                    onChange={(e) => handleInputChange('observation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Observações adicionais sobre a requisição..."
                />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-gray-600">Total da Requisição</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.total_value)}
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Enviando...' : 'Enviar Requisição'}
                    </button>
                </div>
            </div>
        </form>
    );
}