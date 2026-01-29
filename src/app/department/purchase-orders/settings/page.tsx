'use client';

import React, { useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { FiSave, FiPlus, FiTrash2, FiSettings, FiArrowLeft, FiX, FiChevronDown } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';

interface ApprovalRule {
    email: string;
    limit: number;
}

interface SectorConfig {
    type: string;
    config_id: string | null;
    sector_id: string;
    sector_name: string;
    max_value: number;
    approver_emails: string[];
    cost_centers: string[];
    approval_rules: ApprovalRule[];
}

export default function PurchaseOrderSettingsPage() {
    const { profile } = useSupabaseAuth();
    const { t } = useI18n();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Config State
    const [sectorId, setSectorId] = useState<string | null>(null);
    const [mySectorName, setMySectorName] = useState<string>('');
    const [costCenters, setCostCenters] = useState<string[]>([]);
    const [maxValue, setMaxValue] = useState<number>(0);
    const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);

    // Admin specific: Store all sectors to allow switching
    const [allSectors, setAllSectors] = useState<SectorConfig[]>([]);

    // Inputs
    const [newCenter, setNewCenter] = useState('');

    const isAdmin = profile?.role === 'ADMIN';

    useEffect(() => {
        if (profile) {
            fetchConfig();
        }
    }, [profile]);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/purchase-orders/config');
            if (res.ok) {
                const json = await res.json();

                // Store all sectors if available (for Admins)
                if (json.sectors && Array.isArray(json.sectors)) {
                    setAllSectors(json.sectors);
                }

                // Logic to find the initial config to display
                // 1. Try to match profile.sector_id
                // 2. If no match (or no sector_id), fallback to the first available sector

                let initialConfig = null;

                if (profile?.sector_id && json.sectors?.length > 0) {
                    initialConfig = json.sectors.find((s: any) => s.sector_id === profile.sector_id);
                }

                if (!initialConfig && json.sectors?.length > 0) {
                    initialConfig = json.sectors[0];
                }

                if (initialConfig) {
                    loadSectorConfig(initialConfig);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadSectorConfig = (config: SectorConfig) => {
        setSectorId(config.sector_id);
        setMySectorName(config.sector_name || '');
        setCostCenters(config.cost_centers || []);
        setMaxValue(config.max_value || 0);
        setApprovalRules(config.approval_rules || []);
        // Reset inputs
        setNewCenter('');
    };

    const handleSectorChange = (newSectorId: string) => {
        const config = allSectors.find(s => s.sector_id === newSectorId);
        if (config) {
            loadSectorConfig(config);
            toast.dismiss();
            toast.success(`${t('purchaseOrderSettings.loaded')}: ${config.sector_name}`);
        }
    };

    const handleSave = async () => {
        if (!sectorId) {
            toast.error(t('purchaseOrderSettings.errorSave'));
            return;
        }
        try {
            setSaving(true);
            const res = await fetch('/api/purchase-orders/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: ***REMOVED***
                    sector_id: sectorId,
                    cost_centers: costCenters,
                    max_value: maxValue,
                    approval_rules: approvalRules
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || t('purchaseOrderSettings.errorSave'));
            }

            // Update local state "allSectors" to reflect changes without re-fetching
            setAllSectors(prev => prev.map(s =>
                s.sector_id === sectorId
                    ? { ...s, cost_centers: costCenters, max_value: maxValue, approval_rules: approvalRules }
                    : s
            ));

            toast.success(t('purchaseOrderSettings.successSaved'));
        } catch (error: any) {
            toast.error(error.message || t('purchaseOrderSettings.errorSave'));
        } finally {
            setSaving(false);
        }
    };

    const addCostCenter = () => {
        if (!newCenter.trim()) return;
        if (costCenters.includes(newCenter.trim())) {
            toast.error(t('purchaseOrderSettings.successExisted'));
            return;
        }
        setCostCenters([...costCenters, newCenter.trim()]);
        setNewCenter('');
    };

    const removeCostCenter = (center: string) => {
        setCostCenters(costCenters.filter(c => c !== center));
    };

    if (!isAdmin) {
        return (
            <div className="p-8 text-center text-gray-500">
                <FiSettings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h1 className="text-xl font-bold">{t('purchaseOrderSettings.restrictedAccess')}</h1>
                <p>{t('purchaseOrderSettings.restrictedAccessMessage')}</p>
                <Link href="/department/purchase-orders" className="text-blue-500 hover:underline mt-4 block">
                    {t('common.back')}
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/department/purchase-orders"
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                >
                    <FiArrowLeft size={24} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-800">
                            {t('purchaseOrderSettings.title')} {mySectorName ? `- ${mySectorName}` : ''}
                        </h1>

                        {/* Admin Selector */}
                        {isAdmin && allSectors.length > 0 && (
                            <div className="relative group">
                                <select
                                    className="appearance-none bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg pl-3 pr-8 py-1 focus:ring-blue-500 focus:border-blue-500 font-medium cursor-pointer hover:bg-blue-100 transition-colors"
                                    value={sectorId || ''}
                                    onChange={(e) => handleSectorChange(e.target.value)}
                                >
                                    {allSectors.map(sector => (
                                        <option key={sector.sector_id} value={sector.sector_id}>
                                            {sector.sector_name}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-600">
                                    <FiChevronDown size={14} />
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-gray-500">{t('purchaseOrderSettings.manageSectorsDesc')}</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">{t('purchaseOrderSettings.loading')}</div>
            ) : (
                <div className="space-y-6">
                    {/* Approval Rules */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                            {t('purchaseOrderSettings.approvalRules')}
                        </h2>
                        <div className="space-y-4">
                            {approvalRules.map((rule, idx) => (
                                <div key={idx} className="flex gap-4 items-center bg-gray-50 p-3 rounded-lg border">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-400 block mb-1">
                                            {t('purchaseOrderSettings.approverEmail')}
                                        </label>
                                        <input
                                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            value={rule.email}
                                            onChange={(e) => {
                                                const newRules = [...approvalRules];
                                                newRules[idx].email = e.target.value;
                                                setApprovalRules(newRules);
                                            }}
                                            placeholder="email@exemplo.com"
                                        />
                                    </div>
                                    <div className="w-32">
                                        <label className="text-xs text-gray-400 block mb-1">
                                            {t('purchaseOrderSettings.limitValue')}
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            value={rule.limit}
                                            onChange={(e) => {
                                                const newRules = [...approvalRules];
                                                newRules[idx].limit = Number(e.target.value);
                                                setApprovalRules(newRules);
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setApprovalRules(approvalRules.filter((_, i) => i !== idx))}
                                        className="text-red-500 hover:bg-red-50 p-2 rounded-full mt-5"
                                    >
                                        <FiX size={16} />
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={() => setApprovalRules([...approvalRules, { email: '', limit: 0 }])}
                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                <FiPlus /> {t('purchaseOrderSettings.addRule')}
                            </button>
                        </div>
                    </div>

                    {/* Cost Centers */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                            {t('purchaseOrderSettings.costCenters')}
                        </h2>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newCenter}
                                onChange={e => setNewCenter(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addCostCenter()}
                                placeholder={t('purchaseOrderSettings.costCenterPlaceholder')}
                                className="flex-1 border rounded-lg p-2"
                            />
                            <button onClick={addCostCenter} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                <FiPlus /> {t('purchaseOrderSettings.addCostCenter')}
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {costCenters.length === 0 && (
                                <p className="text-gray-400 italic">{t('purchaseOrderSettings.noCostCenters')}</p>
                            )}
                            {costCenters.map(center => (
                                <div key={center} className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2 text-sm text-gray-700">
                                    <span>{center}</span>
                                    <button onClick={() => removeCostCenter(center)} className="text-gray-400 hover:text-red-500">
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Limits */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                            {t('purchaseOrderSettings.globalLimits')}
                        </h2>
                        <div className="form-control max-w-xs">
                            <label className="label-text block mb-2 font-medium">
                                {t('purchaseOrderSettings.autoApprovalLimit')}
                            </label>
                            <input
                                type="number"
                                value={maxValue}
                                onChange={e => setMaxValue(Number(e.target.value))}
                                className="border rounded-lg p-2 w-full"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                {t('purchaseOrderSettings.autoApprovalLimitDesc')}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            <FiSave /> {saving ? t('purchaseOrderSettings.saving') : t('purchaseOrderSettings.save')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
