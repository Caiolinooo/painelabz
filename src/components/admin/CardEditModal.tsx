'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiBookOpen, FiUpload, FiLink, FiLayers, FiEye, FiEyeOff } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import CardAccessControl from './CardAccessControl';

interface CardData {
  id?: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  hoverColor: string;
  external: boolean;
  enabled: boolean;
  order: number;
  adminOnly: boolean;
  managerOnly: boolean;
  allowedRoles: string[];
  allowedUserIds: string[];
}

interface CardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: CardData) => void;
  card?: CardData;
  isNew?: boolean;
}

const defaultCard: CardData = {
  title: '',
  description: '',
  href: '',
  icon: 'FiBookOpen',
  color: 'bg-abz-blue',
  hoverColor: 'hover:bg-abz-blue-dark',
  external: false,
  enabled: true,
  order: 0,
  adminOnly: false,
  managerOnly: false,
  allowedRoles: [],
  allowedUserIds: [],
};

export default function CardEditModal({
  isOpen,
  onClose,
  onSave,
  card,
  isNew = false,
}: CardEditModalProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<CardData>(card || defaultCard);
  const [showAllIcons, setShowAllIcons] = useState(false);
  
  // Lista de ícones disponíveis
  const availableIcons = [
    'FiBookOpen', 'FiCalendar', 'FiClock', 'FiDollarSign', 'FiFile', 
    'FiFileText', 'FiGrid', 'FiHome', 'FiInfo', 'FiLink', 'FiList', 
    'FiMail', 'FiMap', 'FiMessageSquare', 'FiPhone', 'FiSettings', 
    'FiShield', 'FiStar', 'FiTool', 'FiTruck', 'FiUser', 'FiUsers'
  ];

  // Resetar o formulário quando o card mudar
  useEffect(() => {
    setFormData(card || defaultCard);
  }, [card]);

  // Fechar o modal se isOpen for false
  useEffect(() => {
    if (!isOpen) {
      setShowAllIcons(false);
    }
  }, [isOpen]);

  // Manipular mudanças nos campos do formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Manipular mudanças no checkbox
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Selecionar um ícone
  const selectIcon = (icon: string) => {
    setFormData(prev => ({
      ...prev,
      icon,
    }));
    setShowAllIcons(false);
  };

  // Manipular mudanças nas permissões de acesso
  const handleAccessChange = (access: {
    adminOnly: boolean;
    managerOnly: boolean;
    allowedRoles: string[];
    allowedUserIds: string[];
  }) => {
    setFormData(prev => ({
      ...prev,
      ...access,
    }));
  };

  // Salvar o card
  const handleSave = () => {
    onSave(formData);
  };

  // Renderizar o ícone selecionado
  const renderSelectedIcon = () => {
    switch (formData.icon) {
      case 'FiBookOpen': return <FiBookOpen />;
      case 'FiUpload': return <FiUpload />;
      case 'FiLink': return <FiLink />;
      case 'FiLayers': return <FiLayers />;
      default: return <FiBookOpen />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {isNew ? t('admin.addCard') : t('admin.editCard')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.title')}
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
                placeholder={t('admin.cardTitle')}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.link')} (URL)
              </label>
              <input
                type="text"
                name="href"
                value={formData.href}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
                placeholder={t('admin.linkPlaceholder')}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.icon')}
                <button
                  type="button"
                  onClick={() => setShowAllIcons(!showAllIcons)}
                  className="ml-2 text-xs text-abz-blue hover:text-abz-blue-dark"
                >
                  {showAllIcons ? t('admin.hideIcons') : t('admin.showAllIcons')}
                </button>
              </label>
              <div className="flex items-center">
                <div className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-md mr-2">
                  {renderSelectedIcon()}
                </div>
                <input
                  type="text"
                  name="icon"
                  value={formData.icon}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
                  placeholder="FiBookOpen"
                />
              </div>
              
              {showAllIcons && (
                <div className="mt-2 p-2 border border-gray-200 rounded-md grid grid-cols-6 gap-2">
                  {availableIcons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => selectIcon(icon)}
                      className={`w-10 h-10 flex items-center justify-center rounded-md ${
                        formData.icon === icon
                          ? 'bg-abz-blue text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {icon === 'FiBookOpen' && <FiBookOpen />}
                      {icon === 'FiUpload' && <FiUpload />}
                      {icon === 'FiLink' && <FiLink />}
                      {icon === 'FiLayers' && <FiLayers />}
                      {/* Adicione mais ícones conforme necessário */}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.order')}
              </label>
              <input
                type="number"
                name="order"
                value={formData.order}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.backgroundColor')}
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
                placeholder="bg-abz-blue"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.hoverColor')}
              </label>
              <input
                type="text"
                name="hoverColor"
                value={formData.hoverColor}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
                placeholder="hover:bg-abz-blue-dark"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
              placeholder={t('admin.descriptionPlaceholder')}
            />
          </div>
          
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="external"
              name="external"
              checked={formData.external}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-abz-blue focus:ring-abz-blue border-gray-300 rounded"
            />
            <label htmlFor="external" className="ml-2 block text-sm text-gray-700">
              {t('admin.externalLink')}
            </label>
          </div>
          
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="enabled"
              name="enabled"
              checked={formData.enabled}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-abz-blue focus:ring-abz-blue border-gray-300 rounded"
            />
            <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700 flex items-center">
              {formData.enabled ? (
                <>
                  <FiEye className="mr-1 text-green-600" />
                  {t('admin.cardEnabled')}
                </>
              ) : (
                <>
                  <FiEyeOff className="mr-1 text-red-600" />
                  {t('admin.cardDisabled')}
                </>
              )}
            </label>
          </div>
          
          {/* Componente de controle de acesso */}
          <CardAccessControl
            adminOnly={formData.adminOnly}
            managerOnly={formData.managerOnly}
            allowedRoles={formData.allowedRoles}
            allowedUserIds={formData.allowedUserIds}
            onAccessChange={handleAccessChange}
          />
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
