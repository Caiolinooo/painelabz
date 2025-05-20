'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Currency,
  getExchangeRates,
  convertCurrency,
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
        // Verificar se value é uma string válida
        if (typeof value !== 'string') {
          console.warn('CurrencyInput: value is not a string', value);
          setConvertedValues({
            BRL: '',
            USD: '',
            EUR: '',
            GBP: ''
          });
          return;
        }

        // Extrair valor numérico da string formatada
        const numericValue = parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;

        // Verificar se selectedCurrency é válido
        if (!selectedCurrency || !['BRL', 'USD', 'EUR', 'GBP'].includes(selectedCurrency)) {
          console.warn('CurrencyInput: invalid currency', selectedCurrency);
          setSelectedCurrency('BRL');
          return;
        }

        // Obter taxas de câmbio
        const rates = await getExchangeRates(selectedCurrency);

        // Calcular valores convertidos para todas as moedas
        const converted: Record<Currency, string> = {
          BRL: formatCurrency(convertCurrency(numericValue, selectedCurrency, 'BRL', rates), 'BRL'),
          USD: formatCurrency(convertCurrency(numericValue, selectedCurrency, 'USD', rates), 'USD'),
          EUR: formatCurrency(convertCurrency(numericValue, selectedCurrency, 'EUR', rates), 'EUR'),
          GBP: formatCurrency(convertCurrency(numericValue, selectedCurrency, 'GBP', rates), 'GBP')
        };

        setConvertedValues(converted);
      } catch (error) {
        console.error('Erro ao converter moedas:', error);
        // Set default values in case of error
        setConvertedValues({
          BRL: '',
          USD: '',
          EUR: '',
          GBP: ''
        });
      } finally {
        setIsConverting(false);
      }
    };

    updateConversions();
  }, [value, selectedCurrency]);

  // Referência para o input
  const inputRef = useRef<HTMLInputElement>(null);

  // Função para manipular a entrada de valores no estilo de aplicativos bancários
  const handleBankingStyleInput = (input: string): string => {
    // Verificar se input é undefined ou null
    if (input === undefined || input === null) return '';

    // Remover todos os caracteres não numéricos e vírgulas
    const cleanInput = input.replace(/[^\d,]/g, '');

    // Se estiver vazio, retornar string vazia
    if (!cleanInput) return '';

    // Verificar se há vírgula
    if (cleanInput.includes(',')) {
      // Dividir em parte inteira e decimal
      const parts = cleanInput.split(',');

      // Garantir que há apenas uma vírgula
      if (parts.length > 2) {
        // Manter apenas a primeira vírgula
        return `${parts[0]},${parts.slice(1).join('')}`;
      }

      // Formatar a parte inteira e manter a parte decimal como está
      const integerPart = parts[0] === '' ? '0' : parts[0];
      const decimalPart = parts[1];

      // Formatar a parte inteira com separadores de milhar
      const formattedIntegerPart = integerPart === '0' ? '0' :
        (parseInt(integerPart) || 0).toLocaleString('pt-BR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });

      return `${formattedIntegerPart},${decimalPart}`;
    } else {
      // Sem vírgula, tratar como valor inteiro
      const integerValue = cleanInput === '' ? '0' : cleanInput;

      // Formatar com separadores de milhar
      return integerValue === '0' ? '0' :
        (parseInt(integerValue) || 0).toLocaleString('pt-BR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
    }
  };

  // Manipular a entrada do usuário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e || !e.target) {
      console.warn('Event or event.target is undefined in handleInputChange');
      return;
    }

    const inputValue = e.target.value || '';
    const cursorPosition = e.target.selectionStart || 0;

    // Remover o símbolo da moeda se presente
    const valueWithoutCurrencySymbol = inputValue.replace(
      currencySymbols[selectedCurrency] || 'R$',
      ''
    ).trim();

    // Processar o valor no estilo de aplicativos bancários
    const processedValue = handleBankingStyleInput(valueWithoutCurrencySymbol);

    // Atualizar o valor
    onChange(processedValue);

    // Ajustar a posição do cursor após a formatação
    setTimeout(() => {
      if (inputRef.current) {
        // Obter o valor atual formatado
        const currentValue = inputRef.current.value;

        // Calcular a nova posição do cursor
        let newPosition = cursorPosition;

        // Se o usuário acabou de digitar uma vírgula, posicionar o cursor após ela
        if (inputValue.charAt(cursorPosition - 1) === ',') {
          const commaPosition = currentValue.indexOf(',');
          if (commaPosition !== -1) {
            newPosition = commaPosition + 1;
          }
        }
        // Se o usuário está digitando após a vírgula, manter a posição relativa à vírgula
        else if (currentValue.includes(',') && valueWithoutCurrencySymbol.includes(',') &&
                cursorPosition > valueWithoutCurrencySymbol.indexOf(',')) {
          const commaPosition = currentValue.indexOf(',');
          const oldCommaPosition = valueWithoutCurrencySymbol.indexOf(',');
          const charsAfterComma = cursorPosition - oldCommaPosition - 1;
          newPosition = commaPosition + 1 + charsAfterComma;
        }
        // Caso contrário, tentar manter a posição relativa aos dígitos
        else {
          // Contar dígitos antes do cursor no valor original
          const digitsBeforeCursor = valueWithoutCurrencySymbol.substring(0, cursorPosition).replace(/[^\d]/g, '').length;

          // Encontrar a posição correspondente no valor formatado
          let digitCount = 0;
          for (let i = 0; i < currentValue.length; i++) {
            if (/\d/.test(currentValue[i])) {
              digitCount++;
              if (digitCount === digitsBeforeCursor) {
                newPosition = i + 1;
                break;
              }
            }
          }
        }

        // Garantir que a posição está dentro dos limites
        newPosition = Math.min(newPosition, currentValue.length);
        newPosition = Math.max(newPosition, 0);

        // Definir a posição do cursor
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Função para formatar valor monetário
  const formatCurrency = (amount: number, currency: Currency): string => {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return formatter.format(amount);
  };

  // Mudar a moeda selecionada
  const handleCurrencyChange = (currency: Currency) => {
    // Verificar se a moeda é válida
    if (!currency || !['BRL', 'USD', 'EUR', 'GBP'].includes(currency)) {
      console.warn('CurrencyInput: invalid currency in handleCurrencyChange', currency);
      currency = 'BRL';
    }

    setSelectedCurrency(currency);
    setShowCurrencySelector(false);

    if (onCurrencyChange) {
      try {
        onCurrencyChange(currency);
      } catch (error) {
        console.error('Error in onCurrencyChange callback:', error);
      }
    }

    // Atualizar o valor formatado para a nova moeda
    if (value) {
      try {
        // Verificar se value é uma string válida
        if (typeof value !== 'string') {
          console.warn('CurrencyInput: value is not a string in handleCurrencyChange', value);
          return;
        }

        // Converter o valor para número
        const numericValue = parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;

        // Formatar o valor para a nova moeda
        const formattedValue = formatCurrency(numericValue, currency);

        // Remover o símbolo da moeda
        const valueWithoutSymbol = formattedValue.replace(
          currencySymbols[currency] || '',
          ''
        ).trim();

        // Processar o valor no estilo de aplicativos bancários
        const processedValue = handleBankingStyleInput(valueWithoutSymbol);

        onChange(processedValue);
      } catch (error) {
        console.error('Error formatting currency value:', error);
      }
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
