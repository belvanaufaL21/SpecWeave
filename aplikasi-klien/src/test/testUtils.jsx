import React from 'react';
import { render } from '@testing-library/react';
import { LoadingProvider } from '../contexts/LoadingContext';
import { ErrorProvider } from '../contexts/ErrorContext';

// Create a custom render function that includes all necessary providers
export function renderWithProviders(ui, options = {}) {
  const {
    loadingValue = { loading: false, setLoading: vi.fn() },
    errorValue = { error: null, setError: vi.fn(), clearError: vi.fn() },
    ...renderOptions
  } = options;

  function Wrapper({ children }) {
    return (
      <ErrorProvider value={errorValue}>
        <LoadingProvider value={loadingValue}>
          {children}
        </LoadingProvider>
      </ErrorProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };
