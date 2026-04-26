import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModelSelector from '../ModelSelector';
import api from '../../../services/api';

// Mock the API
vi.mock('../../../services/api');

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('ModelSelector Component', () => {
  const mockModels = [
    {
      id: '1',
      name: 'llama-3.1-8b-instant',
      displayName: 'Llama 3.1 8B',
      provider: 'groq',
      tier: 'economy',
      limit: 50,
      used: 12,
      remaining: 38,
    },
    {
      id: '2',
      name: 'gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash',
      provider: 'gemini',
      tier: 'standard',
      limit: 10,
      used: 3,
      remaining: 7,
    },
    {
      id: '3',
      name: 'gemini-2.5-pro',
      displayName: 'Gemini 2.5 Pro',
      provider: 'gemini',
      tier: 'premium',
      limit: 1,
      used: 1,
      remaining: 0,
    },
  ];

  const mockOnModelChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          models: mockModels,
        },
      },
    });
  });

  it('should fetch and display models on mount', async () => {
    render(
      <ModelSelector
        selectedModel="llama-3.1-8b-instant"
        onModelChange={mockOnModelChange}
      />
    );

    // Should show loading state initially
    expect(screen.getByText('Loading models...')).toBeInTheDocument();

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getByText('Llama 3.1 8B')).toBeInTheDocument();
    });

    // Should call API
    expect(api.get).toHaveBeenCalledWith('/usage/limits');
  });

  it('should display selected model information', async () => {
    render(
      <ModelSelector
        selectedModel="llama-3.1-8b-instant"
        onModelChange={mockOnModelChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Llama 3.1 8B')).toBeInTheDocument();
    });

    // Should show tier badge
    expect(screen.getByText('economy')).toBeInTheDocument();
    
    // Should show remaining count
    expect(screen.getByText('38/50')).toBeInTheDocument();
  });

  it('should open dropdown when clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ModelSelector
        selectedModel="llama-3.1-8b-instant"
        onModelChange={mockOnModelChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Llama 3.1 8B')).toBeInTheDocument();
    });

    // Click to open dropdown
    const button = screen.getByRole('button');
    await user.click(button);

    // Should show all models in dropdown
    await waitFor(() => {
      expect(screen.getAllByText('Llama 3.1 8B')).toHaveLength(2); // One in button, one in dropdown
      expect(screen.getByText('Gemini 2.5 Flash')).toBeInTheDocument();
      expect(screen.getByText('Gemini 2.5 Pro')).toBeInTheDocument();
    });
  });

  it('should call onModelChange when selecting a different model', async () => {
    const user = userEvent.setup();
    
    render(
      <ModelSelector
        selectedModel="llama-3.1-8b-instant"
        onModelChange={mockOnModelChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Llama 3.1 8B')).toBeInTheDocument();
    });

    // Open dropdown
    const button = screen.getByRole('button');
    await user.click(button);

    // Click on Gemini Flash
    await waitFor(() => {
      expect(screen.getByText('Gemini 2.5 Flash')).toBeInTheDocument();
    });
    
    const geminiButton = screen.getAllByRole('button').find(btn => 
      btn.textContent.includes('Gemini 2.5 Flash')
    );
    
    await user.click(geminiButton);

    // Should call onModelChange with new model name
    expect(mockOnModelChange).toHaveBeenCalledWith('gemini-2.5-flash');
  });

  it('should disable models with 0 remaining', async () => {
    const user = userEvent.setup();
    
    render(
      <ModelSelector
        selectedModel="llama-3.1-8b-instant"
        onModelChange={mockOnModelChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Llama 3.1 8B')).toBeInTheDocument();
    });

    // Open dropdown
    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Gemini 2.5 Pro')).toBeInTheDocument();
    });

    // Find the Gemini Pro button (should be disabled)
    const geminiProButton = screen.getAllByRole('button').find(btn => 
      btn.textContent.includes('Gemini 2.5 Pro')
    );
    
    expect(geminiProButton).toBeDisabled();
    
    // Try to click it
    await user.click(geminiProButton);
    
    // Should NOT call onModelChange
    expect(mockOnModelChange).not.toHaveBeenCalled();
  });

  it('should show error state when API fails', async () => {
    api.get.mockRejectedValue(new Error('API Error'));
    
    render(
      <ModelSelector
        selectedModel="llama-3.1-8b-instant"
        onModelChange={mockOnModelChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load models')).toBeInTheDocument();
    });
  });

  it('should set default model if none selected', async () => {
    render(
      <ModelSelector
        selectedModel={null}
        onModelChange={mockOnModelChange}
      />
    );

    await waitFor(() => {
      expect(mockOnModelChange).toHaveBeenCalledWith('llama-3.1-8b-instant');
    });
  });
});
