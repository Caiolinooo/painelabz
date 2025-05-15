'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowCurrencySelector(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Referência para o input
  const inputRef = useRef<HTMLInputElement>(null);

  // Formatar valor ao digitar
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    // Remover caracteres não numéricos, exceto vírgula e ponto
    const cleanValue = inputValue.replace(/[^\d,.]/g, '');

    // Se estiver vazio, retornar string vazia
    if (!cleanValue) {
      onChange('');
      return;
    }

    // Contar quantos caracteres foram removidos antes da posição do cursor
    const beforeCursor = inputValue.substring(0, cursorPosition);
    const cleanBeforeCursor = beforeCursor.replace(/[^\d,.]/g, '');
    const removedCount = beforeCursor.length - cleanBeforeCursor.length;

    // Formatar o valor de acordo com a moeda selecionada
    const numericValue = extractNumericValue(cleanValue);
    const formattedValue = formatCurrencyValue(numericValue, selectedCurrency);

    // Remover o símbolo da moeda para manter consistência com o formato esperado pelo formulário
    const valueWithoutSymbol = formattedValue.replace(currencySymbols[selectedCurrency], '').trim();

    // Garantir que o valor esteja em um formato válido para o banco de dados
    // Substituir vírgula por ponto para garantir que seja um número válido
    const normalizedValue = valueWithoutSymbol.replace(/\./g, '').replace(',', '.');

    // Armazenar o valor formatado para exibição e o valor normalizado para o banco de dados
    onChange(valueWithoutSymbol);

    // Calcular a nova posição do cursor
    // Ajustar a posição do cursor considerando a formatação
    setTimeout(() => {
      if (inputRef.current) {
        // Obter o valor atual formatado
        const currentValue = inputRef.current.value;

        // Calcular quantos caracteres de formatação foram adicionados antes da posição do cursor
        // (espaços, pontos, vírgulas, etc.)
        const formattedBeforeCursor = currentValue.substring(0, cursorPosition);
        const digitsBeforeCursor = cleanBeforeCursor.replace(/[,.]/g, '').length;

        // Contar dígitos no valor formatado atual
        let digitCount = 0;
        let newPosition = 0;

        // Percorrer o valor formatado e contar dígitos até atingir o número de dígitos antes do cursor
        for (let i = 0; i < currentValue.length; i++) {
          if (/\d/.test(currentValue[i])) {
            digitCount++;
          }
          if (digitCount > digitsBeforeCursor) {
            newPosition = i;
            break;
          }
          newPosition = i + 1;
        }

        // Definir a posição do cursor
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
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

      <div className="relative" style={{ zIndex: 30 }}>
        <div className="flex">
          <button
            type="button"
            ref={buttonRef}
            onClick={() => setShowCurrencySelector(!showCurrencySelector)}
            className="px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 relative"
            aria-label="Selecionar moeda"
            aria-expanded={showCurrencySelector}
          >
            <span className="flex items-center">
              {currencySymbols[selectedCurrency]}
            </span>
          </button>

          <input
            id={id}
            type="text"
            value={value}
            onChange={handleInputChange}
            ref={inputRef}
            className={`flex-1 px-3 py-2 border-y border-r rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={`0,00`}
          />
        </div>

        {showCurrencySelector && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-xl animate-fadeIn"
            style={{
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            <div className="p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Selecione a moeda:</div>
              <div className="space-y-1">
                {(['BRL', 'USD', 'EUR', 'GBP'] as Currency[]).map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => handleCurrencyChange(currency)}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      selectedCurrency === currency ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'
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
