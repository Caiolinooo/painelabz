import { toast, ToastOptions } from 'react-toastify';

/**
 * Hook personalizado para usar o toast de forma consistente em toda a aplicação.
 * Este hook encapsula a biblioteca react-toastify para evitar problemas de importação.
 */
export function useToast() {
  return {
    toast: {
      success: (message: string, options?: ToastOptions) => toast.success(message, options),
      error: (message: string, options?: ToastOptions) => toast.error(message, options),
      info: (message: string, options?: ToastOptions) => toast.info(message, options),
      warning: (message: string, options?: ToastOptions) => toast.warning(message, options),
      // Método compatível com a API anterior
      custom: (options: { title: string; description?: string; variant?: string }) => {
        const message = options.description 
          ? `${options.title}: ${options.description}` 
          : options.title;
        
        switch (options.variant) {
          case 'destructive':
            return toast.error(message);
          case 'success':
            return toast.success(message);
          case 'warning':
            return toast.warning(message);
          default:
            return toast.info(message);
        }
      }
    }
  };
}

export default useToast;
