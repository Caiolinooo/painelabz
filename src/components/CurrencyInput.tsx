'use client';

import React, { useState, useEffect } from 'react';
import { 
  Currency, 
  getExchangeRates, 
  convertCurrency, 
  formatCurrencyValue, 
  extractNumericValue,
  currencySymbols
} from '@/lib/currencyConverter';

interface CurrencyInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCurrencyChange?: (currency: Currency) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

export default function CurrencyInput({
  id,
  label,
  value,
  onChange,
  onCurrencyChange,
  error,
  required = false,
  className = ''
}: CurrencyInputProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('BRL');
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [convertedValues, setConvertedValues] = useState<Record<Currency, string>>({
    BRL: '',
    USD: '',
    EUR: '',
    GBP: ''
  });
  const [isConverting, setIsConverting] = useState(false);

  // Atualizar valores convertidos quando o valor ou a moeda mudar
  useEffect(() => {
    const updateConversions = async () => {
      if (!value) {
        setConvertedValues({
          BRL: '',
          USD: '',
          EUR: '',
          GBP: ''
        });
        return;
      }

      setIsConverting(true);
      try {
        // Extrair valor numérico da string formatada
        const numericValue = extractNumericValue(value);
        
        // Obter taxas de câmbio
        const rates = await getExchangeRates(selectedCurrency);
        
        // Calcular valores convertidos para todas as moedas
        const converted: Record<Currency, string> = {
          BRL: formatCurrencyValue(convertCurrency(numericValue, selectedCurrency, 'BRL', rates), 'BRL'),
          USD: formatCurrencyValue(convertCurrency(numericValue, selectedCurrency, 'USD', rates), 'USD'),
          EUR: formatCurrencyValue(convertCurrency(numericValue, selectedCurrency, 'EUR', rates), 'EUR'),
          GBP: formatCurrencyValue(convertCurrency(numericValue, selectedCurrency, 'GBP', rates), 'GBP')
        };
        
        setConvertedValues(converted);
      } catch (error) {
        console.error('Erro ao converter moedas:', error);
      } finally {
        setIsConverting(false);
      }
    };
    
    updateConversions();
  }, [value, selectedCurrency]);

  // Formatar valor ao digitar
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Remover caracteres não numéricos, exceto vírgula e ponto
    const cleanValue = inputValue.replace(/[^\d,.]/g, '');
    
    // Se estiver vazio, retornar string vazia
    if (!cleanValue) {
      onChange('');
      return;
    }
    
    // Formatar o valor de acordo com a moeda selecionada
    const numericValue = extractNumericValue(cleanValue);
    const formattedValue = formatCurrencyValue(numericValue, selectedCurrency);
    
    // Remover o símbolo da moeda para manter consistência com o formato esperado pelo formulário
    const valueWithoutSymbol = formattedValue.replace(currencySymbols[selectedCurrency], '').trim();
    
    onChange(valueWithoutSymbol);
  };

  // Mudar a moeda selecionada
  const handleCurrencyChange = (currency: Currency) => {
    setSelectedCurrency(currency);
    setShowCurrencySelector(false);
    
    if (onCurrencyChange) {
      onCurrencyChange(currency);
    }
    
    // Atualizar o valor formatado para a nova moeda
    if (value) {
      const numericValue = extractNumericValue(value);
      const formattedValue = formatCurrencyValue(numericValue, currency);
      const valueWithoutSymbol = formattedValue.replace(currencySymbols[currency], '').trim();
      onChange(valueWithoutSymbol);
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <div className="flex">
          <button
            type="button"
            onClick={() => setShowCurrencySelector(!showCurrencySelector)}
            className="px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-700 hover:bg-gray-100"
          >
            {currencySymbols[selectedCurrency]}
          </button>
          
          <input
            id={id}
            type="text"
            value={value}
            onChange={handleInputChange}
            className={`flex-1 px-3 py-2 border-y border-r rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={`0,00`}
          />
        </div>
        
        {showCurrencySelector && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="p-2">
              <div className="text-sm font-medium text-gray-700 mb-2">Selecione a moeda:</div>
              <div className="space-y-1">
                {(['BRL', 'USD', 'EUR', 'GBP'] as Currency[]).map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => handleCurrencyChange(currency)}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      selectedCurrency === currency ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-medium">{currencySymbols[currency]}</span> {currency}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      
      {/* Mostrar valores convertidos */}
      {value && !error && (
        <div className="mt-2 text-xs text-gray-500">
          {isConverting ? (
            <p>Convertendo valores...</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(convertedValues)
                .filter(([curr]) => curr !== selectedCurrency)
                .map(([curr, convertedValue]) => (
                  <div key={curr} className="flex items-center">
                    <span className="font-medium mr-1">{curr}:</span> {convertedValue}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
