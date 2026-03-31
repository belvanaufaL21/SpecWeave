import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../test/testUtils';
import TestingModal from '../TestingModal';
import { LoadingProvider } from '../../../contexts/LoadingContext';
import { ErrorProvider } from '../../../contexts/ErrorContext';

// Mock the hooks and services
vi.mock('../../../hooks/useTesting', () => ({
  default: () => ({
    loading: false,
    error: null,
    submitTest: vi.fn(),
    clearError: vi.fn()
  })
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => children
}));

// Helper to render with all required providers
const renderWithProviders = (ui, options = {}) => {
  return render(
    <ErrorProvider>
      <LoadingProvider>
        {ui}
      </LoadingProvider>
    </ErrorProvider>,
    options
  );
};

describe('TestingModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    scenarioText: 'Given a user story\nWhen user performs action\nThen expected result occurs',
    scenarioId: 'test-scenario-1',
    initialTab: 'meteor',
    initialReferenceScenario: '',
    onSubmitTest: vi.fn(),
    loading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders modal when open', () => {
    renderWithProviders(<TestingModal {...defaultProps} />);
    
    expect(screen.getByText('Pengujian Kualitas Skenario')).toBeInTheDocument();
    expect(screen.getByText('METEOR')).toBeInTheDocument();
    expect(screen.getByText('Sentence-BERT')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(<TestingModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Pengujian Kualitas Skenario')).not.toBeInTheDocument();
  });

  it('shows METEOR tab as active by default', () => {
    renderWithProviders(<TestingModal {...defaultProps} />);
    
    const meteorTab = screen.getByRole('button', { name: /METEOR/i });
    expect(meteorTab).toHaveClass('bg-gradient-to-r');
  });

  it('switches tabs when clicked', () => {
    renderWithProviders(<TestingModal {...defaultProps} />);
    
    const sentenceBertTab = screen.getByRole('button', { name: /Sentence-BERT/i });
    fireEvent.click(sentenceBertTab);
    
    expect(sentenceBertTab).toHaveClass('bg-gradient-to-r');
  });

  it('displays comparison table with scenario text', () => {
    renderWithProviders(<TestingModal {...defaultProps} />);
    
    expect(screen.getByText('Perbandingan Skenario')).toBeInTheDocument();
    expect(screen.getByText('Skenario yang Dihasilkan')).toBeInTheDocument();
    expect(screen.getByText('Skenario Referensi')).toBeInTheDocument();
  });

  it('shows reference scenario input textarea', () => {
    renderWithProviders(<TestingModal {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText(/Masukkan skenario referensi/i);
    expect(textarea).toBeInTheDocument();
  });

  it('disables submit button when reference scenario is empty', () => {
    renderWithProviders(<TestingModal {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when reference scenario is filled', async () => {
    renderWithProviders(<TestingModal {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText(/Masukkan skenario referensi/i);
    const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
    
    fireEvent.change(textarea, { 
      target: { value: 'Given test scenario\nWhen action\nThen result' } 
    });
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('shows validation error for invalid Gherkin format', async () => {
    renderWithProviders(<TestingModal {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText(/Masukkan skenario referensi/i);
    const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
    
    // Fill with invalid format (no Gherkin keywords)
    fireEvent.change(textarea, { 
      target: { value: 'This is not a valid Gherkin scenario' } 
    });
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getAllByText(/harus menggunakan format Gherkin/i)).toHaveLength(2);
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    renderWithProviders(<TestingModal {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByRole('button', { name: /Batal/i });
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state when submitting', () => {
    renderWithProviders(<TestingModal {...defaultProps} loading={true} />);
    
    const submitButton = screen.getByRole('button', { name: /Memproses/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Memproses...')).toBeInTheDocument();
  });

  it('displays method description for active tab', () => {
    renderWithProviders(<TestingModal {...defaultProps} />);
    
    expect(screen.getAllByText(/unigram matching, stemming, dan synonymy/i)).toHaveLength(2);
    
    // Switch to Sentence-BERT tab
    const sentenceBertTab = screen.getByRole('button', { name: /Sentence-BERT/i });
    fireEvent.click(sentenceBertTab);
    
    expect(screen.getAllByText(/semantic similarity menggunakan transformer/i)).toHaveLength(2);
  });

  it('preserves reference scenario when switching tabs', async () => {
    renderWithProviders(<TestingModal {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText(/Masukkan skenario referensi/i);
    const testScenario = 'Given test\nWhen action\nThen result';
    
    // Fill reference scenario
    fireEvent.change(textarea, { target: { value: testScenario } });
    
    // Switch tabs
    const sentenceBertTab = screen.getByRole('button', { name: /Sentence-BERT/i });
    fireEvent.click(sentenceBertTab);
    
    const meteorTab = screen.getByRole('button', { name: /METEOR/i });
    fireEvent.click(meteorTab);
    
    // Check that reference scenario is preserved
    expect(textarea.value).toBe(testScenario);
  });
});