import * as React from 'react';

type ToastVariant = 'default' | 'destructive';

interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastState {
  toasts: ToastData[];
}

type ToastAction =
  | { type: 'ADD_TOAST'; toast: ToastData }
  | { type: 'REMOVE_TOAST'; id: string };

const toastReducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case 'ADD_TOAST':
      return { toasts: [...state.toasts, action.toast] };
    case 'REMOVE_TOAST':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
};

// Simple toast implementation using alert for now
// Can be upgraded to use Radix Toast later
export function useToast() {
  const toast = React.useCallback(
    ({ title, description, variant }: { title?: string; description?: string; variant?: ToastVariant }) => {
      // Simple implementation using alert
      // In production, you'd use a proper toast notification system
      const message = [title, description].filter(Boolean).join('\n');

      if (variant === 'destructive') {
        console.error(message);
      } else {
        console.log(message);
      }

      // Also show as a temporary alert for visibility
      // Using setTimeout to not block the UI
      setTimeout(() => {
        alert(message);
      }, 100);
    },
    []
  );

  return { toast };
}
