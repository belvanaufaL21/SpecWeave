/**
 * Property-based tests for navigation behavior consistency
 * Feature: specweave-ux-revision, Property 2: Navigation Behavior Consistency
 * Validates: Requirements 1.3, 1.4, 3.5, 3.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import Landing from '../../../pages/Landing.jsx';

// Mock the AuthContext
const mockAuthContext = {
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signUp: vi.fn(),
  loading: false,
  user: null
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext
}));

// Mock the userValidation module
vi.mock('../../../utils/userValidation', () => ({
  isUserRegistered: vi.fn(),
  registerUser: vi.fn()
}));

// Mock Logo component
vi.mock('../../../components/common/Logo', () => ({
  default: ({ size, showText, textClassName }) => (
    <div data-testid="logo" data-size={size} data-show-text={showText} className={textClassName}>
      SpecWeave Logo
    </div>
  )
}));

const renderLandingPage = () => {
  return render(
    <BrowserRouter>
      <Landing />
    </BrowserRouter>
  );
};

describe('Navigation Behavior Consistency - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location for URL parameter handling
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        pathname: '/'
      },
      writable: true
    });
  });

  /**
   * Property 2: Navigation Behavior Consistency
   * For any navigation element (links, buttons, CTAs), when clicked,
   * the system should navigate to the correct target with appropriate loading states and transitions
   */
  it('should consistently navigate to correct sections when navigation links are clicked', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('what-is', 'cara-kerja', 'keuntungan'),
        (sectionId) => {
          renderLandingPage();
          
          // Find the navigation link for the section
          const navLink = screen.getByText(
            sectionId === 'what-is' ? 'What is?' :
            sectionId === 'cara-kerja' ? 'Cara Kerja' :
            'Keuntungan'
          );
          
          expect(navLink).toBeTruthy();
          expect(navLink.getAttribute('href')).toBe(`#${sectionId}`);
          
          // Verify the link has proper styling for navigation
          expect(navLink).toHaveClass('text-sm', 'font-medium', 'text-gray-400', 'hover:text-white', 'transition-colors');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should consistently show Get Started button with proper navigation behavior', () => {
    fc.assert(
      fc.property(
        fc.constant('get-started'),
        (targetSection) => {
          renderLandingPage();
          
          // Find Get Started buttons (there might be multiple)
          const getStartedButtons = screen.getAllByText('Get Started');
          
          // At least one Get Started button should exist
          expect(getStartedButtons.length).toBeGreaterThan(0);
          
          // Check the main navbar Get Started button
          const navbarButton = getStartedButtons.find(button => 
            button.getAttribute('href') === '#get-started'
          );
          
          expect(navbarButton).toBeTruthy();
          expect(navbarButton.getAttribute('href')).toBe('#get-started');
          
          // Verify proper styling for CTA button
          expect(navbarButton).toHaveClass('px-6', 'py-2.5', 'bg-white/5', 'hover:bg-white/10');
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should consistently handle smooth scroll navigation for all anchor links', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('#what-is', '#cara-kerja', '#keuntungan', '#get-started'),
        (anchorHref) => {
          renderLandingPage();
          
          // Find all links with the anchor href
          const anchorLinks = screen.getAllByRole('link').filter(link => 
            link.getAttribute('href') === anchorHref
          );
          
          // Should have at least one link for each section
          expect(anchorLinks.length).toBeGreaterThan(0);
          
          // Each anchor link should have proper href
          anchorLinks.forEach(link => {
            expect(link.getAttribute('href')).toBe(anchorHref);
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should consistently show proper loading states during authentication', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('signin', 'signup'),
        (authMode) => {
          // Mock loading state
          mockAuthContext.loading = true;
          
          renderLandingPage();
          
          if (authMode === 'signup') {
            // Switch to signup mode
            const signupToggle = screen.getByText('Buat akun baru');
            fireEvent.click(signupToggle);
          }
          
          // Check that form elements are disabled during loading
          const emailInput = screen.getByPlaceholderText('nama@perusahaan.com');
          expect(emailInput).toBeDisabled();
          
          // Reset loading state
          mockAuthContext.loading = false;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should consistently toggle between signin and signup modes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(true, false),
        (startWithSignup) => {
          renderLandingPage();
          
          if (startWithSignup) {
            // Start with signup mode
            const signupToggle = screen.getByText('Buat akun baru');
            fireEvent.click(signupToggle);
            
            // Should show signup form
            expect(screen.getByText('Buat Akun Baru')).toBeTruthy();
            expect(screen.getByPlaceholderText('Nama lengkap Anda')).toBeTruthy();
            
            // Toggle back to signin
            const signinToggle = screen.getByText('Masuk ke akun yang ada');
            fireEvent.click(signinToggle);
            
            // Should show signin form
            expect(screen.getByText('Masuk ke Akun')).toBeTruthy();
          } else {
            // Start with signin mode (default)
            expect(screen.getByText('Masuk ke Akun')).toBeTruthy();
            
            // Toggle to signup
            const signupToggle = screen.getByText('Buat akun baru');
            fireEvent.click(signupToggle);
            
            // Should show signup form
            expect(screen.getByText('Buat Akun Baru')).toBeTruthy();
            expect(screen.getByPlaceholderText('Nama lengkap Anda')).toBeTruthy();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should consistently show proper button states and transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('email-signin', 'email-signup', 'google-signin', 'google-signup'),
        (buttonType) => {
          renderLandingPage();
          
          if (buttonType.includes('signup')) {
            // Switch to signup mode
            const signupToggle = screen.getByText('Buat akun baru');
            fireEvent.click(signupToggle);
          }
          
          let targetButton;
          if (buttonType.includes('email')) {
            targetButton = screen.getByRole('button', { 
              name: buttonType.includes('signup') ? /buat akun baru/i : /masuk ke akun/i 
            });
          } else {
            targetButton = screen.getByRole('button', { 
              name: buttonType.includes('signup') ? /sign up with google/i : /sign in with google/i 
            });
          }
          
          expect(targetButton).toBeTruthy();
          expect(targetButton).not.toBeDisabled();
          
          // Verify button has proper styling
          expect(targetButton).toHaveClass('transition-all', 'duration-300');
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should consistently handle URL parameters for authentication mode', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('signin', 'signup'),
        (mode) => {
          // Mock URL search params
          Object.defineProperty(window, 'location', {
            value: {
              search: `?mode=${mode}`,
              pathname: '/'
            },
            writable: true
          });
          
          renderLandingPage();
          
          // Should show the correct mode based on URL parameter
          if (mode === 'signup') {
            expect(screen.getByText('Buat Akun Baru')).toBeTruthy();
            expect(screen.getByPlaceholderText('Nama lengkap Anda')).toBeTruthy();
          } else {
            expect(screen.getByText('Masuk ke Akun')).toBeTruthy();
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should consistently show proper visual feedback for interactive elements', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('nav-link', 'cta-button', 'form-button', 'toggle-button'),
        (elementType) => {
          renderLandingPage();
          
          let targetElement;
          switch (elementType) {
            case 'nav-link':
              targetElement = screen.getByText('What is?');
              expect(targetElement).toHaveClass('hover:text-white', 'transition-colors');
              break;
            case 'cta-button':
              targetElement = screen.getByRole('link', { name: /get started/i });
              expect(targetElement).toHaveClass('hover:bg-white/10', 'transition-all');
              break;
            case 'form-button':
              targetElement = screen.getByRole('button', { name: /masuk ke akun/i });
              expect(targetElement).toHaveClass('transition-all', 'duration-300');
              break;
            case 'toggle-button':
              targetElement = screen.getByText('Buat akun baru');
              expect(targetElement).toHaveClass('transition-colors');
              break;
          }
          
          expect(targetElement).toBeTruthy();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should consistently maintain navigation structure across different states', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('initial', 'signup-mode', 'with-error'),
        (pageState) => {
          renderLandingPage();
          
          // Modify page state
          if (pageState === 'signup-mode') {
            const signupToggle = screen.getByText('Buat akun baru');
            fireEvent.click(signupToggle);
          } else if (pageState === 'with-error') {
            // Trigger an error by submitting empty form
            const submitButton = screen.getByRole('button', { name: /masuk ke akun/i });
            fireEvent.click(submitButton);
          }
          
          // Navigation should always be present regardless of state
          expect(screen.getByText('What is?')).toBeTruthy();
          expect(screen.getByText('Cara Kerja')).toBeTruthy();
          expect(screen.getByText('Keuntungan')).toBeTruthy();
          expect(screen.getByRole('link', { name: /get started/i })).toBeTruthy();
          
          // Logo should always be present
          expect(screen.getByTestId('logo')).toBeTruthy();
        }
      ),
      { numRuns: 15 }
    );
  });
});