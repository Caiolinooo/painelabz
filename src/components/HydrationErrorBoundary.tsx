'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Componente de limite de erro que captura erros de hidratação
 * e renderiza um fallback ou tenta novamente a renderização.
 */
class HydrationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Verificar se é um erro de hidratação
    const isHydrationError = 
      error.message.includes('hydration') || 
      error.message.includes('Hydration') ||
      error.message.includes('Text content does not match server-rendered HTML');
    
    console.error('Erro capturado pelo HydrationErrorBoundary:', error, errorInfo);
    
    // Se for um erro de hidratação, podemos tentar renderizar novamente
    if (isHydrationError) {
      // Forçar uma nova renderização após um pequeno atraso
      setTimeout(() => {
        this.setState({ hasError: false });
      }, 100);
    }
  }

  render() {
    if (this.state.hasError) {
      // Você pode renderizar qualquer UI alternativa
      return this.props.fallback || (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800">
            Ocorreu um erro de renderização. Tentando recuperar...
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default HydrationErrorBoundary;
