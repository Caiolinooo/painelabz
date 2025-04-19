'use client';

import React, { useState, useRef } from 'react';
import { FiUpload, FiX, FiSearch } from 'react-icons/fi';
import * as Icons from 'react-icons/fi';
import { IconType } from 'react-icons';

interface IconSelectorProps {
  selectedIcon: string;
  onIconChange: (iconName: string, iconComponent: IconType) => void;
  onCustomIconUpload?: (file: File) => void;
  allowCustomUpload?: boolean;
}

export default function IconSelector({
  selectedIcon,
  onIconChange,
  onCustomIconUpload,
  allowCustomUpload = true
}: IconSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showIconGrid, setShowIconGrid] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Lista de ícones disponíveis
  const iconOptions = Object.keys(Icons)
    .filter(key => key.startsWith('Fi'))
    .filter(key => key.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort();
  
  // Função para renderizar o ícone
  const renderIcon = (iconName: string) => {
    // @ts-ignore - Estamos assumindo que o ícone existe no objeto Icons
    const IconComponent = Icons[iconName];
    return <IconComponent className="h-5 w-5" />;
  };
  
  // Função para selecionar um ícone
  const handleSelectIcon = (iconName: string) => {
    // @ts-ignore - Estamos assumindo que o ícone existe no objeto Icons
    onIconChange(iconName, Icons[iconName]);
    setShowIconGrid(false);
  };
  
  // Função para fazer upload de ícone personalizado
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onCustomIconUpload) {
      onCustomIconUpload(file);
      setShowIconGrid(false);
    }
  };
  
  return (
    <div className="relative">
      <div className="flex items-center mb-2">
        <label className="block text-sm font-medium text-gray-700 mr-2">
          Ícone
        </label>
        <button
          type="button"
          onClick={() => setShowIconGrid(!showIconGrid)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showIconGrid ? 'Fechar seletor' : 'Mostrar todos os ícones'}
        </button>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="p-3 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-center w-12 h-12">
          {selectedIcon && renderIcon(selectedIcon)}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setShowIconGrid(!showIconGrid)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex-1"
            >
              {selectedIcon || 'Selecionar ícone'}
            </button>
            
            {allowCustomUpload && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ml-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                title="Fazer upload de ícone personalizado"
              >
                <FiUpload className="h-5 w-5" />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {showIconGrid && (
        <div className="absolute z-10 mt-2 w-full bg-white border border-gray-300 rounded-md shadow-lg p-4">
          <div className="flex items-center mb-3 border border-gray-300 rounded-md overflow-hidden">
            <div className="px-3 py-2 bg-gray-50">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ícones..."
              className="flex-1 px-3 py-2 border-none focus:outline-none focus:ring-0"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-3 py-2 text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-5 w-5" />
              </button>
            )}
          </div>
          
          <div className="max-h-60 overflow-y-auto grid grid-cols-6 gap-2">
            {iconOptions.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => handleSelectIcon(iconName)}
                className={`p-2 rounded-md flex flex-col items-center justify-center hover:bg-gray-100 ${
                  selectedIcon === iconName ? 'bg-blue-100 border border-blue-300' : ''
                }`}
                title={iconName}
              >
                <div className="p-2">
                  {renderIcon(iconName)}
                </div>
                <span className="text-xs text-gray-600 truncate w-full text-center">
                  {iconName.replace('Fi', '')}
                </span>
              </button>
            ))}
            
            {iconOptions.length === 0 && (
              <div className="col-span-6 py-4 text-center text-gray-500">
                Nenhum ícone encontrado para "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
