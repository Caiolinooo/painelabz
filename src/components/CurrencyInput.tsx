'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/contexts/I18nContext';
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
  currency?: Currency;
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
  currency,
  error,
  required = false,
  className = ''
}: CurrencyInputProps) {
  const { t } = useI18n();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency || 'BRL');
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
  const inputRef = useRef<HTMLInputElement>(null);
  // Rastreia se o usuário está digitando ativamente, para evitar que a
  // formatação automática atrapalhe a digitação (ex: digitar vírgula/dot).
  const isTypingRef = useRef(false);

  // Update selected currency when currency prop changes (only on initial load)
  useEffect(() => {
    if (currency && currency !== selectedCurrency) {
      console.log('Sincronizando moeda inicial:', currency);
      setSelectedCurrency(currency);
    }
  }, [currency]); // Removido selectedCurrency da dependência para evitar loops

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Adicionar um pequeno delay para permitir que o onClick seja processado primeiro
      setTimeout(() => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target as Node)
        ) {
          setShowCurrencySelector(false);
        }
      }, 0);
    }

    // Usar 'click' ao invés de 'mousedown' para evitar conflito com onClick
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Atualizar valores convertidos quando o valor ou a moeda mudar
  useEffect(() => {
    const updateConversions = async () => {
      if (!value || value === '0,00' || value === '0.00' || value === '0') {
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
        // Extrair valor numérico da string formatada (ex: "1.234,56" -> 1234.56)
        const numericValue = parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;

        if (numericValue === 0) {
          setConvertedValues({
            BRL: '',
            USD: '',
            EUR: '',
            GBP: ''
          });
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

  /**
   * Formata o valor digitado pelo usuário para o padrão brasileiro "1.234,56".
   *
   * Esta função implementa um modo de entrada DECIMAL INTUITIVO, onde o
   * usuário digita o valor normalmente (ex: "50,83" para R$ 50,83) ao
   * invés do antigo "formato bancário" onde "50" era interpretado como
   * R$ 0,50 — fonte frequente de erros como digitar "5000,83" e o
   * sistema armazenar R$ 5.000.083,00.
   *
   * Regras:
   * - Permite apenas um separador decimal (vírgula ou ponto)
   * - Permite até 2 casas decimais
   * - Adiciona separador de milhar automaticamente
   * - Aceita tanto vírgula quanto ponto como separador decimal
   */
  const formatDecimalInput = (inputValue: string): string => {
    if (!inputValue) return '';

    // Remover tudo que não for dígito, vírgula ou ponto
    let cleaned = inputValue.replace(/[^\d.,]/g, '');

    // Se vazio, retornar vazio
    if (!cleaned) return '';

    // Padronizar: converter qualquer ponto em vírgula temporariamente
    // para identificar o separador decimal corretamente
    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    // Determinar qual é o separador decimal
    let decimalSeparator: ',' | '.' | null = null;

    if (hasComma && hasDot) {
      // Se tem ambos, o último é o decimal
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      decimalSeparator = lastComma > lastDot ? ',' : '.';
    } else if (hasComma) {
      decimalSeparator = ',';
    } else if (hasDot) {
      decimalSeparator = '.';
    }

    // Normalizar para vírgula como separador decimal
    if (decimalSeparator === '.') {
      // Substituir o último ponto por vírgula
      const lastDot = cleaned.lastIndexOf('.');
      cleaned = cleaned.substring(0, lastDot) + ',' + cleaned.substring(lastDot + 1);
      // Remover quaisquer outras vírgulas que existissem
      cleaned = cleaned.replace(/,/g, (match, offset) => {
        return offset === lastDot ? ',' : '';
      });
    }

    // Agora sabemos que o separador decimal (se houver) é a vírgula
    const [intPart, decPart] = cleaned.split(',');

    // Limitar parte inteira a um valor razoável (12 dígitos = até 999 bilhões)
    const trimmedInt = (intPart || '').replace(/\D/g, '').slice(0, 12);

    // Remover zeros à esquerda, mas manter pelo menos um zero
    const normalizedInt = trimmedInt === '' ? '0' : String(parseInt(trimmedInt, 10) || 0);

    // Formatar parte inteira com separadores de milhar
    const formattedInt = normalizedInt === '0'
      ? '0'
      : parseInt(normalizedInt, 10).toLocaleString('pt-BR');

    // Limitar parte decimal a 2 dígitos
    const trimmedDec = (decPart || '').replace(/\D/g, '').slice(0, 2);

    // Se o usuário está no meio da digitação dos centavos, manter como está
    if (decPart !== undefined) {
      return `${formattedInt},${trimmedDec}`;
    }

    // Se não há parte decimal, retornar apenas a parte inteira formatada
    // (não forçamos ",00" para o usuário poder digitar a vírgula depois)
    return formattedInt;
  };

  /**
   * Normaliza o valor para o formato final "1.234,56" usado pelo resto do sistema.
   * Garante que sempre tenha 2 casas decimais quando o valor estiver completo.
   */
  const normalizeValue = (formattedValue: string): string => {
    if (!formattedValue) return '0,00';

    if (!formattedValue.includes(',')) {
      return `${formattedValue},00`;
    }

    const [intPart, decPart] = formattedValue.split(',');
    const paddedDec = (decPart || '').padEnd(2, '0').slice(0, 2);
    return `${intPart},${paddedDec}`;
  };

  // Manipular a entrada do usuário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e || !e.target) {
      console.warn('Event or event.target is undefined in handleInputChange');
      return;
    }

    const inputValue = e.target.value || '';
    isTypingRef.current = true;

    // Processar o valor no modo decimal intuitivo
    const processedValue = formatDecimalInput(inputValue);

    // Atualizar o valor
    onChange(processedValue);

    // Posicionar cursor no final após formatação
    setTimeout(() => {
      isTypingRef.current = false;
      if (inputRef.current) {
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }, 0);
  };

  // Normalizar o valor quando o input perde o foco (adicionar ",00" se necessário)
  const handleBlur = () => {
    if (value && value !== '0,00') {
      const normalized = normalizeValue(value);
      if (normalized !== value) {
        onChange(normalized);
      }
    }
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
    console.log('Mudando moeda para:', currency, 'Moeda atual:', selectedCurrency);

    // Verificar se a moeda é válida
    if (!currency || !['BRL', 'USD', 'EUR', 'GBP'].includes(currency)) {
      console.warn('CurrencyInput: invalid currency in handleCurrencyChange', currency);
      currency = 'BRL';
    }

    // Forçar atualização do estado
    setSelectedCurrency(currency);
    setShowCurrencySelector(false);

    // Forçar re-render usando um timeout
    setTimeout(() => {
      console.log(t('components.estadoAposMudanca'), currency);
      if (onCurrencyChange) {
        try {
          onCurrencyChange(currency);
        } catch (error) {
          console.error('Error in onCurrencyChange callback:', error);
        }
      }
    }, 0);

    console.log('Moeda alterada para:', currency);
  };

  // Valor exibido no input (preserva o que o usuário está digitando)
  const displayValue = value === '0,00' ? '' : value;

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
            inputMode="decimal"
            value={displayValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            ref={inputRef}
            className={`flex-1 px-3 py-2 border-y border-r rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0,00"
          />
        </div>

        {showCurrencySelector && (
          <div
            ref={dropdownRef}
            className="absolute z-[60] mt-1 w-full bg-white border border-gray-300 rounded-md shadow-xl"
            style={{
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            onMouseDown={(e) => {
              // Prevenir que o mousedown feche o dropdown
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Selecione a moeda:</div>
              <div className="space-y-1">
                {(['BRL', 'USD', 'EUR', 'GBP'] as Currency[]).map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => {
                      console.log('Clicou na moeda:', currency);
                      handleCurrencyChange(currency);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors cursor-pointer ${
                      selectedCurrency === currency
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
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
      {value && value !== '0,00' && !error && (
        <div className="mt-2 text-xs text-gray-500">
          {isConverting ? (
            <p>Convertendo valores...</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* Mostrar valor atual */}
              <div className="flex items-center">
                <span className="font-medium mr-1 text-blue-600">{selectedCurrency}:</span>
                <span className="text-blue-600 font-medium">{currencySymbols[selectedCurrency]} {value}</span>
              </div>

              {/* Mostrar conversões para outras moedas */}
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
