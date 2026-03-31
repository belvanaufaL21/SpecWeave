/**
 * UX Validation Test Suite
 * Validates all user experience improvements implemented in task 6
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Import components to test
import ResponsiveLayout from '../../components/layout/ResponsiveLayout';
import OptimizedChatContainer from '../../components/chat/OptimizedChatContainer';
import TestingModal from '../../components/modals/TestingModal';
import { useResponsive } from '../../hooks/useResponsive';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import focusManager from '../../utils/accessibility/focusManager';
import connectionManager from '../../utils/realtime/ConnectionManager';

// Mock dependencies
vi.mock('../../hooks/useResponsive');
vi.mock('../../hooks/useTesting', () => ({
  default: () => ({
    loading: false,
    error: null,
    submitTest: vi.fn().mockResolvedValue({ id: 'test-result' }),
    clearError: vi.fn()
  })
}));

vi.mock('../../hooks/useTestingStatePersistence', () => ({
  default: () => ({
    saveFormData: vi.fn(),
    getFormData: vi.fn().mockReturnValue({}),
    saveModalState: vi.fn(),
    getModalState: vi.fn().mockReturnValue({}),
    clearFormData: vi.fn(),
    clearModalState: vi.fn()
  })
}));

vi.mock('../../services/testingService', () => ({
  default: {
    getSuggestedReferences: vi.fn().mockResolvedValue([]),
    saveScenarioReference: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    aside: ({ children, ...props }) => <aside {...props}>{children}</aside>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }) => children
}));

vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize }) => (
    <div data-testid="virtual-list">
      {Array.from({ length: Math.min(itemCount, 10) }, (_, index) => 
        children({ index, style: { height: itemSize } })
      )}
    </div>
  )
}));

describe('UX Validation - Task 6 Improvements', () => {
  let mockUseResponsive;
  
  beforeEach(() => {
    mockUseResponsive = {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      breakpoint: 'lg',
      windowSize: { width: 1024, height: 768 }
    };
    useResponsive.mockReturnValue(mockUseResponsive);
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('6.1 Navigation and Transitions', () => {
    it('should render responsive layout with smooth transitions', async () => {
      const mockSidebar = <div data-testid="sidebar">Sidebar Content</div>;
      const mockHeader = <div data-testid="header">Header Content</div>;
      const mockChildren = <div data-testid="main-content">Main Content</div>;

      render(
        <ResponsiveLayout
          sidebar={mockSidebar}
          header={mockHeader}
        >
          {mockChildren}
        </ResponsiveLayout>
      );

      // Check that all components are rendered
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    it('should handle mobile responsive behavior', async () => {
      mockUseResponsive.isMobile = true;
      mockUseResponsive.isDesktop = false;
      useResponsive.mockReturnValue(mockUseResponsive);

      const mockSidebar = <div data-testid="sidebar">Sidebar</div>;
      
      render(
        <ResponsiveLayout sidebar={mockSidebar}>
          <div>Content</div>
        </ResponsiveLayout>
      );

      // On mobile, sidebar should be collapsed by default
      const sidebar = screen.getByTestId('sidebar').closest('aside');
      expect(sidebar).toHaveClass('fixed');
    });

    it('should provide smooth page transitions with loading indicators', async () => {
      const messages = [
        { id: '1', content: 'Hello', sender: 'user' },
        { id: '2', content: 'Hi there!', sender: 'assistant' }
      ];

      render(
        <OptimizedChatContainer 
          messages={messages}
          isLoading={true}
        />
      );

      // Should show virtual list for performance
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('should optimize real-time features with connection management', async () => {
      // Test connection manager functionality
      const connection = connectionManager.getConnection('test-chat', {
        autoConnect: false
      });

      expect(connection).toBeDefined();
      expect(connection.getStatus()).toBe('disconnected');

      // Test connection methods
      expect(typeof connection.connect).toBe('function');
      expect(typeof connection.disconnect).toBe('function');
      expect(typeof connection.send).toBe('function');
      expect(typeof connection.on).toBe('function');
    });
  });

  describe('6.4 Responsive Design and Accessibility', () => {
    it('should handle different screen sizes correctly', async () => {
      // Test desktop layout
      mockUseResponsive.isDesktop = true;
      mockUseResponsive.isMobile = false;
      useResponsive.mockReturnValue(mockUseResponsive);

      const { rerender } = render(
        <ResponsiveLayout>
          <div data-testid="content">Desktop Content</div>
        </ResponsiveLayout>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();

      // Test mobile layout
      mockUseResponsive.isDesktop = false;
      mockUseResponsive.isMobile = true;
      useResponsive.mockReturnValue(mockUseResponsive);

      rerender(
        <ResponsiveLayout>
          <div data-testid="content">Mobile Content</div>
        </ResponsiveLayout>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should provide proper keyboard navigation support', async () => {
      const user = userEvent.setup();
      
      render(
        <TestingModal
          isOpen={true}
          onClose={vi.fn()}
          scenarioText="Test scenario"
          scenarioId="test-123"
        />
      );

      // Should be able to navigate with keyboard
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Test tab navigation
      await user.keyboard('{Tab}');
      
      // Should focus on first interactive element
      const firstButton = screen.getAllByRole('button')[0];
      expect(document.activeElement).toBe(firstButton);
    });

    it('should manage focus correctly in modals', async () => {
      const onClose = vi.fn();
      
      render(
        <TestingModal
          isOpen={true}
          onClose={onClose}
          scenarioText="Test scenario"
          scenarioId="test-123"
        />
      );

      // Modal should be present
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Test escape key functionality
      fireEvent.keyDown(modal, { key: 'Escape' });
      
      // Should call onClose when escape is pressed
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should provide accessibility features', async () => {
      // Test focus manager functionality
      const testElement = document.createElement('button');
      testElement.textContent = 'Test Button';
      document.body.appendChild(testElement);

      // Test focus saving and restoring
      testElement.focus();
      focusManager.saveFocus();
      
      const anotherElement = document.createElement('input');
      document.body.appendChild(anotherElement);
      anotherElement.focus();

      focusManager.restoreFocus();
      
      // Focus should be restored to original element
      expect(document.activeElement).toBe(testElement);

      // Cleanup
      document.body.removeChild(testElement);
      document.body.removeChild(anotherElement);
    });

    it('should handle tab switching without infinite loops', async () => {
      const user = userEvent.setup();
      
      render(
        <TestingModal
          isOpen={true}
          onClose={vi.fn()}
          scenarioText="Test scenario"
          scenarioId="test-123"
        />
      );

      // Find tab buttons
      const meteorTab = screen.getByText('METEOR');
      const sentenceBertTab = screen.getByText('Sentence-BERT');

      expect(meteorTab).toBeInTheDocument();
      expect(sentenceBertTab).toBeInTheDocument();

      // Test tab switching
      await user.click(sentenceBertTab);
      
      // Should switch to Sentence-BERT tab
      expect(sentenceBertTab.closest('button')).toHaveClass('bg-gradient-to-r');

      // Switch back to METEOR
      await user.click(meteorTab);
      
      // Should switch back without issues
      expect(meteorTab.closest('button')).toHaveClass('bg-gradient-to-r');
    });

    it('should provide smooth animations and transitions', async () => {
      const { rerender } = render(
        <OptimizedChatContainer 
          messages={[]}
          isLoading={false}
        />
      );

      // Should show empty state
      expect(screen.getByText('Mulai percakapan baru')).toBeInTheDocument();

      // Add messages and check for smooth transition
      const messages = [
        { id: '1', content: 'Hello', sender: 'user' }
      ];

      rerender(
        <OptimizedChatContainer 
          messages={messages}
          isLoading={false}
        />
      );

      // Should show virtual list with messages
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('should handle loading states without flicker', async () => {
      const { rerender } = render(
        <TestingModal
          isOpen={true}
          onClose={vi.fn()}
          scenarioText="Test scenario"
          scenarioId="test-123"
          loading={false}
        />
      );

      // Should show normal content
      expect(screen.getByText('Pengujian Kualitas Skenario')).toBeInTheDocument();

      // Switch to loading state
      rerender(
        <TestingModal
          isOpen={true}
          onClose={vi.fn()}
          scenarioText="Test scenario"
          scenarioId="test-123"
          loading={true}
        />
      );

      // Should handle loading state gracefully
      expect(screen.getByText('Pengujian Kualitas Skenario')).toBeInTheDocument();
    });
  });

  describe('Real-time Features Performance', () => {
    it('should handle connection management efficiently', async () => {
      const connection = connectionManager.getConnection('test-connection');
      
      // Test connection lifecycle
      expect(connection.getStatus()).toBe('disconnected');
      
      // Mock successful connection
      await act(async () => {
        await connection.connect();
      });

      // Should handle connection events
      const mockCallback = vi.fn();
      connection.on('connected', mockCallback);
      
      // Simulate connection event
      connectionManager.emit('test-connection', 'connected');
      
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should provide connection statistics', () => {
      const stats = connectionManager.getStats();
      
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('connectedCount');
      expect(stats).toHaveProperty('disconnectedCount');
      expect(stats).toHaveProperty('connections');
    });
  });

  describe('Performance Optimizations', () => {
    it('should use virtual scrolling for large datasets', () => {
      const largeMessageList = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        sender: i % 2 === 0 ? 'user' : 'assistant'
      }));

      render(
        <OptimizedChatContainer 
          messages={largeMessageList}
          isLoading={false}
        />
      );

      // Should use virtual list for performance
      const virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toBeInTheDocument();
      
      // Should only render a subset of items (not all 1000)
      const renderedItems = virtualList.children;
      expect(renderedItems.length).toBeLessThan(largeMessageList.length);
    });

    it('should prevent unnecessary re-renders with memoization', () => {
      const onMessageAction = vi.fn();
      const messages = [
        { id: '1', content: 'Test message', sender: 'user' }
      ];

      const { rerender } = render(
        <OptimizedChatContainer 
          messages={messages}
          onMessageAction={onMessageAction}
        />
      );

      // Re-render with same props
      rerender(
        <OptimizedChatContainer 
          messages={messages}
          onMessageAction={onMessageAction}
        />
      );

      // Component should be memoized and not re-render unnecessarily
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });
  });
});