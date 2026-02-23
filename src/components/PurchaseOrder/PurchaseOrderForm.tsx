'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiTrash2, FiUpload, FiSave, FiAlertCircle, FiSearch, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/tokenStorage';

// Types
type POItem = {
    description: string;
    quantity: number;
    unit_value: number;
    cost_center: string;
};

type POFormData = {
    supplier_id?: string;
    provider_name: string;
    provider_trade_name: string;
    provider_cnpj: string;
    provider_email: string;
    payment_terms: string;
    buyer_name: string;
    delivery_date: string;
    delivery_address: string;
    observation: string;
    items: POItem[];
    freight_cost: number;
    sector_id: string;
};

export default function PurchaseOrderForm() {
    const { user, profile } = useSupabaseAuth();
    const { t, locale } = useI18n();
    const router = useRouter();
    const [config, setConfig] = useState<any>(null);
    const [allConfigs, setAllConfigs] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
    const [sectors, setSectors] = useState<any[]>([]);

    // Supplier search state
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [supplierResults, setSupplierResults] = useState<any[]>([]);
    const [isSearchingTranslators, setIsSearchingSuppliers] = useState(false);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<POFormData>({
        defaultValues: {
            items: [{ description: '', quantity: 1, unit_value: 0, cost_center: '' }],
            freight_cost: 0,
            buyer_name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : '',
            sector_id: ''
        }
    });

    const sectorId = watch('sector_id');

    useEffect(() => {
        const fetchSectors = async () => {
            try {
                const res = await fetch('/api/sectors');
                if (res.ok) {
                    const data = await res.json();
                    setSectors(data);
                    if (data.length > 0) {
                        let matchedSector = null;
                        if (profile?.sector_id) {
                            matchedSector = data.find((s: any) => s.id === profile.sector_id);
                        }
                        if (!matchedSector && profile?.department) {
                            const dept = profile.department.toLowerCase();
                            matchedSector = data.find((s: any) =>
                                dept.includes(s.name.toLowerCase()) ||
                                s.name.toLowerCase().includes(dept)
                            );
                        }
                        if (matchedSector) {
                            setValue('sector_id', matchedSector.id);
                        } else {
                            const defaultSector = data.find((s: any) => s.name.toUpperCase() === 'ABZ') || data[0];
                            setValue('sector_id', defaultSector.id);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch sectors', err);
            }
        };
        fetchSectors();
    }, [profile, setValue]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const items = useWatch({ control, name: "items" });
    const freightCost = useWatch({ control, name: "freight_cost" });

    const totalValue = items.reduce((acc, item) => {
        return acc + (Number(item.quantity || 0) * Number(item.unit_value || 0));
    }, 0) + Number(freightCost || 0);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const token = getToken();
                const res = await fetch('/api/purchase-orders/config', {
                    credentials: 'include',
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                });
                if (res.ok) {
                    const json = await res.json();
                    setAllConfigs(json);
                }
            } catch (err) {
                console.error('Failed to fetch config:', err);
                toast.error('Erro de conexão ao carregar configurações.');
            }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        if (allConfigs && sectorId) {
            let foundConfig = allConfigs.sectors?.find((s: any) => s.sector_id === sectorId);
            if (!foundConfig && allConfigs.data) {
                foundConfig = allConfigs.data;
            }
            if (foundConfig) {
                setConfig(foundConfig);
            } else {
                setConfig(null);
            }
        }
    }, [allConfigs, sectorId]);

    // Close autocomplete when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSupplierDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Perform supplier search
    useEffect(() => {
        const fetchSuppliers = async () => {
            if (supplierSearchQuery.length < 2) {
                setSupplierResults([]);
                return;
            }
            setIsSearchingSuppliers(true);
            try {
                const res = await fetch(`/api/suppliers?search=${encodeURIComponent(supplierSearchQuery)}&limit=5`);
                const json = await res.json();
                if (json.success) {
                    setSupplierResults(json.data);
                }
            } catch (error) {
                console.error('Supplier search error:', error);
            } finally {
                setIsSearchingSuppliers(false);
            }
        };

        const timeoutId = setTimeout(fetchSuppliers, 300);
        return () => clearTimeout(timeoutId);
    }, [supplierSearchQuery]);

    const selectSupplier = (supplier: any) => {
        setValue('supplier_id', supplier.id);
        setValue('provider_name', supplier.legal_name || supplier.trade_name);
        setValue('provider_trade_name', supplier.trade_name);
        setValue('provider_cnpj', supplier.document_number || '');
        setValue('provider_email', supplier.contact_email || '');

        if (supplier.payment_terms) {
            setValue('payment_terms', supplier.payment_terms);
        }
        if (supplier.address) {
            setValue('delivery_address', supplier.address);
        }

        setSupplierSearchQuery(supplier.trade_name);
        setShowSupplierDropdown(false);
        toast.success(`Fornecedor ${supplier.trade_name} selecionado`);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];

        try {
            const token = getToken();
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch('/api/upload/purchase-order', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            });

            if (!uploadRes.ok) {
                const errData = await uploadRes.json();
                throw new Error(errData.error || 'Erro no upload');
            }

            const { url } = await uploadRes.json();
            setInvoiceUrl(url);
            toast.success(t('purchaseOrders.form.success.attached'));
        } catch (error: any) {
            console.error(error);
            toast.error(t('purchaseOrders.form.errors.uploadError') + ': ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const onSubmit = async (data: POFormData) => {
        if (!profile) {
            toast.error(t('purchaseOrders.form.errors.incompleteProfile'));
            return;
        }

        if (config?.max_value && totalValue > config.max_value) {
            toast.error(`${t('purchaseOrders.form.errors.exceedsLimit')} (${new Intl.NumberFormat(locale === 'en-US' ? 'en-US' : 'pt-BR', { style: 'currency', currency: 'BRL' }).format(config.max_value)})`);
            return;
        }

        try {
            const loadingToast = toast.loading('Enviando solicitação...');

            const token = getToken();
            const res = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    'X-Client-Locale': locale
                },
                body: JSON.stringify({
                    ...data,
                    items: data.items.map(item => ({
                        ...item,
                        quantity: Number(item.quantity) || 0,
                        unit_value: Number(item.unit_value) || 0
                    })),
                    freight_cost: Number(data.freight_cost) || 0,
                    delivery_date: data.delivery_date || null,
                    sector_id: data.sector_id,
                    invoice_url: invoiceUrl,
                    total_value: totalValue,
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Falha ao criar ordem');
            }

            toast.dismiss(loadingToast);
            toast.success(t('purchaseOrders.form.success.created'));
            router.push('/department/purchase-orders');

        } catch (error: any) {
            console.error(error);
            toast.error('Erro: ' + error.message);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-20">

            {/* 1. Supplier Search & Provider Details */}
            <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative" ref={searchRef}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-2 border-b gap-4">
                    <h2 className="text-lg font-semibold text-gray-800">{t('purchaseOrders.form.provider.title')}</h2>
                    <div className="w-full sm:w-72 relative">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar fornecedor cadastrado..."
                                value={supplierSearchQuery}
                                onChange={(e) => {
                                    setSupplierSearchQuery(e.target.value);
                                    setShowSupplierDropdown(true);
                                }}
                                onFocus={() => setShowSupplierDropdown(true)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {supplierSearchQuery && (
                                <button type="button" onClick={() => { setSupplierSearchQuery(''); setShowSupplierDropdown(false); setValue('supplier_id', ''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <FiX />
                                </button>
                            )}
                        </div>

                        {showSupplierDropdown && supplierSearchQuery.length >= 2 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 shadow-lg rounded-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                                {isSearchingTranslators ? (
                                    <div className="p-4 text-center text-sm text-gray-500">Buscando...</div>
                                ) : supplierResults.length > 0 ? (
                                    <ul className="divide-y divide-gray-100">
                                        {supplierResults.map((supplier) => (
                                            <li
                                                key={supplier.id}
                                                onClick={() => selectSupplier(supplier)}
                                                className="p-3 hover:bg-blue-50 cursor-pointer transition flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-900 text-sm">{supplier.trade_name}</div>
                                                    <div className="text-xs text-gray-500">{supplier.document_number}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="p-4 text-center">
                                        <p className="text-sm text-gray-500 mb-2">Fornecedor não encontrado</p>
                                        <button type="button" onClick={() => window.open('/admin/compras', '_blank')} className="text-sm font-medium text-blue-600 hover:underline">
                                            Cadastrar novo fornecedor
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="form-control">
                        <label className="label-text">{t('purchaseOrders.form.provider.name')} *</label>
                        <input {...register('provider_name', { required: true })} className="input-field w-full border rounded-lg p-2" placeholder={t('purchaseOrders.form.provider.placeholder.name')} />
                        {errors.provider_name && <span className="text-red-500 text-xs">{t('purchaseOrders.form.errors.required')}</span>}
                    </div>
                    <div className="form-control">
                        <label className="label-text">{t('purchaseOrders.form.provider.tradeName')}</label>
                        <input {...register('provider_trade_name')} className="input-field w-full border rounded-lg p-2" placeholder={t('purchaseOrders.form.provider.placeholder.tradeName')} />
                    </div>
                    <div className="form-control">
                        <label className="label-text">{t('purchaseOrders.form.provider.cnpj')} *</label>
                        <input {...register('provider_cnpj', { required: true })} className="input-field w-full border rounded-lg p-2" placeholder={t('purchaseOrders.form.provider.placeholder.cnpj')} />
                        {errors.provider_cnpj && <span className="text-red-500 text-xs">{t('purchaseOrders.form.errors.required')}</span>}
                    </div>
                    <div className="form-control">
                        <label className="label-text">{t('purchaseOrders.form.provider.email')} *</label>
                        <input {...register('provider_email', { required: true })} type="email" className="input-field w-full border rounded-lg p-2" placeholder={t('purchaseOrders.form.provider.placeholder.email')} />
                        {errors.provider_email && <span className="text-red-500 text-xs">{t('purchaseOrders.form.errors.required')}</span>}
                    </div>
                </div>
            </section>

            {/* 2. Delivery & Payment */}
            <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">{t('purchaseOrders.form.delivery.title')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                        <label className="label-text">{t('purchaseOrders.form.delivery.paymentTerms')} *</label>
                        <input {...register('payment_terms', { required: true })} className="input-field w-full border rounded-lg p-2" placeholder={t('purchaseOrders.form.delivery.placeholder.paymentTerms')} />
                    </div>
                    <div className="form-control">
                        <label className="label-text">{t('purchaseOrders.form.delivery.buyer')}</label>
                        <input {...register('buyer_name')} className="input-field w-full border rounded-lg p-2 bg-gray-50" readOnly />
                    </div>
                    <div className="form-control">
                        <label className="label-text">{t('purchaseOrders.form.delivery.date')}</label>
                        <input {...register('delivery_date')} type="date" className="input-field w-full border rounded-lg p-2" />
                    </div>
                    <div className="form-control">
                        <label className="label-text">{t('purchaseOrders.form.delivery.address')}</label>
                        <input {...register('delivery_address')} className="input-field w-full border rounded-lg p-2" placeholder={t('purchaseOrders.form.delivery.placeholder.address')} />
                    </div>
                </div>
            </section>

            {/* 3. Items */}
            <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-4 pb-2 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">{t('purchaseOrders.form.items.title')}</h2>
                    <button type="button" onClick={() => append({ description: '', quantity: 1, unit_value: 0, cost_center: '' })} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium">
                        <FiPlus /> {t('purchaseOrders.form.items.add')}
                    </button>
                </div>

                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded-lg">
                            <div className="md:col-span-5">
                                <label className="text-xs text-gray-500 block mb-1">{t('purchaseOrders.form.items.description')}</label>
                                <input {...register(`items.${index}.description` as const, { required: true })} className="w-full p-2 border rounded text-sm" placeholder={t('purchaseOrders.form.items.placeholder.description')} />
                            </div>

                            <div className="md:col-span-1">
                                <label className="text-xs text-gray-500 block mb-1">{t('purchaseOrders.form.items.quantity')}</label>
                                <input {...register(`items.${index}.quantity` as const, { valueAsNumber: true })} type="number" step="0.01" className="w-full p-2 border rounded text-sm" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-xs text-gray-500 block mb-1">{t('purchaseOrders.form.items.unitValue')}</label>
                                <input {...register(`items.${index}.unit_value` as const, { valueAsNumber: true })} type="number" step="0.01" className="w-full p-2 border rounded text-sm" />
                            </div>

                            <div className="md:col-span-3">
                                <label className="text-xs text-gray-500 block mb-1">{t('purchaseOrders.form.items.costCenter')}</label>
                                <select {...register(`items.${index}.cost_center` as const, { required: true })} className="w-full p-2 border rounded text-sm bg-white">
                                    <option value="">{t('purchaseOrders.form.items.placeholder.select')}</option>
                                    {config?.cost_centers?.map((cc: string) => (
                                        <option key={cc} value={cc}>{cc}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-1 flex justify-center pb-2">
                                <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700">
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex justify-end gap-6 items-center pt-4 border-t">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium">{t('purchaseOrders.form.items.freight')}:</label>
                        <input {...register('freight_cost', { valueAsNumber: true })} type="number" className="w-24 p-2 border rounded text-right" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                        {t('purchaseOrders.form.items.total')}: {new Intl.NumberFormat(locale === 'en-US' ? 'en-US' : 'pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                    </div>
                </div>

                {!!config?.max_value && totalValue > config.max_value && (
                    <div className="mt-2 text-red-600 text-sm flex items-center justify-end gap-2">
                        <FiAlertCircle />
                        {t('purchaseOrders.form.errors.exceedsLimit')} ({new Intl.NumberFormat(locale === 'en-US' ? 'en-US' : 'pt-BR', { style: 'currency', currency: 'BRL' }).format(config.max_value)})
                    </div>
                )}
            </section>

            {/* 4. Attachments */}
            <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">{t('purchaseOrders.form.attachments.title')}</h2>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input type="file" id="invoice-upload" onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg" disabled={uploading} />
                        <label htmlFor="invoice-upload" className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50' : ''}`}>
                            <FiUpload /> {uploading ? t('purchaseOrders.form.attachments.uploading') : t('purchaseOrders.form.attachments.upload')}
                        </label>
                    </div>
                    {invoiceUrl && (
                        <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate max-w-xs">
                            {t('purchaseOrders.form.attachments.view')}
                        </a>
                    )}
                </div>
                <div className="mt-4">
                    <label className="label-text block mb-1">{t('purchaseOrders.form.attachments.observation')}</label>
                    <textarea {...register('observation')} className="w-full border rounded-lg p-2 h-24" placeholder={t('purchaseOrders.form.attachments.placeholder.observation')}></textarea>
                </div>
            </section>

            <div className="flex justify-end gap-4 py-4">
                <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded-lg hover:bg-gray-50">{t('purchaseOrders.form.actions.cancel')}</button>
                <button
                    type="submit"
                    disabled={uploading || (config?.max_value && totalValue > config.max_value)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    <FiSave /> {t('purchaseOrders.form.actions.submit')}
                </button>
            </div>
        </form>
    );
}
