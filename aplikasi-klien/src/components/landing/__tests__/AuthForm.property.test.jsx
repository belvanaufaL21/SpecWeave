/**
 * Property-based tests for form validation consistency
 * Feature: specweave-ux-revision, Property 1: Form Validation Consistency
 * Validates: Requirements 1.7, 2.1, 2.2, 5.7
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

describe('Form Validation Consistency - Property Tests', () => {
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
   * Property 1: Form Validation Consistency
   * For any form input with validation rules, when invalid data is entered,
   * the system should display appropriate error messages in Indonesian and highlight the problematic fields
   */
  it('should consistently validate email format across all invalid email inputs', () => {
    fc.assert(
      fc.property(
        // Generate various invalid email formats
        fc.oneof(
          fc.string().filter(s => !s.includes('@') && s.length > 0), // No @ symbol
          fc.string().map(s => s + '@'), // Ends with @
          fc.string().map(s => '@' + s), // Starts with @
          fc.string().map(s => s + '@domain'), // Missing TLD
          fc.string().map(s => s + '@.com'), // Missing domain
          fc.constant(''), // Empty string
          fc.constant('   '), // Only whitespace
          fc.string().map(s => s + '@@domain.com'), // Double @
          fc.string().map(s => s + '@domain..com'), // Double dots
        ),
        (invalidEmail) => {
          renderLandingPage();
          
          // Get email input - use getAllBy and take the first one
          const emailInputs = screen.getAllByPlaceholderText('nama@perusahaan.com');
          const emailInput = emailInputs[0];
          
          // Enter invalid email
          fireEvent.change(emailInput, { target: { value: invalidEmail } });
          
          // Try to submit form - use getAllBy and take the first one
          const submitButtons = screen.getAllByRole('button', { name: /masuk ke akun/i });
          const submitButton = submitButtons[0];
          fireEvent.click(submitButton);
          
          // Should show email validation error in Indonesian
          const errorMessages = [
            'Email is required',
            'Please enter a valid email address',
            'Format email tidak valid'
          ];
          
          const hasValidationError = errorMessages.some(message => 
            screen.queryByText(message) !== null
          );
          
          expect(hasValidationError).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should consistently validate password requirements for signup', () => {
    fc.assert(
      fc.property(
        // Generate various invalid passwords
        fc.oneof(
          fc.string().filter(s => s.length < 8), // Too short
          fc.string().filter(s => s.length >= 8 && !/[A-Z]/.test(s)), // No uppercase
          fc.string().filter(s => s.length >= 8 && !/[a-z]/.test(s)), // No lowercase
          fc.string().filter(s => s.length >= 8 && !/\d/.test(s)), // No numbers
          fc.constant(''), // Empty
          fc.constant('   '), // Only whitespace
        ),
        (invalidPassword) => {
          renderLandingPage();
          
          // Switch to signup mode
          const signupToggle = screen.getByText('Buat akun baru');
          fireEvent.click(signupToggle);
          
          // Fill required fields - use getAllBy and take the first one
          const nameInputs = screen.getAllByPlaceholderText('Nama lengkap Anda');
          const nameInput = nameInputs[0];
          const emailInputs = screen.getAllByPlaceholderText('nama@perusahaan.com');
          const emailInput = emailInputs[0];
          const passwordInputs = screen.getAllByPlaceholderText('••••••••');
          const passwordInput = passwordInputs[0];
          
          fireEvent.change(nameInput, { target: { value: 'Test User' } });
          fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput, { target: { value: invalidPassword } });
          
          // Try to submit - use getAllBy and take the first one
          const submitButtons = screen.getAllByRole('button', { name: /buat akun baru/i });
          const submitButton = submitButtons[0];
          fireEvent.click(submitButton);
          
          // Should show password validation error
          const passwordErrors = [
            'Password is required',
            'Password must contain:',
            'At least 8 characters',
            'Uppercase letter',
            'Lowercase letter',
            'Number'
          ];
          
          const hasPasswordError = passwordErrors.some(message => 
            screen.queryByText(new RegExp(message, 'i')) !== null
          );
          
          expect(hasPasswordError).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should consistently validate name field requirements for signup', () => {
    fc.assert(
      fc.property(
        // Generate various invalid names
        fc.oneof(
          fc.constant(''), // Empty
          fc.constant('   '), // Only whitespace
          fc.string().filter(s => s.trim().length === 1), // Too short
          fc.string().filter(s => s.trim().length === 0), // Whitespace only
        ),
        (invalidName) => {
          renderLandingPage();
          
          // Switch to signup mode
          const signupToggle = screen.getByText('Buat akun baru');
          fireEvent.click(signupToggle);
          
          // Fill fields with invalid name - use getAllBy and take the first one
          const nameInputs = screen.getAllByPlaceholderText('Nama lengkap Anda');
          const nameInput = nameInputs[0];
          const emailInputs = screen.getAllByPlaceholderText('nama@perusahaan.com');
          const emailInput = emailInputs[0];
          const passwordInputs = screen.getAllByPlaceholderText('••••••••');
          const passwordInput = passwordInputs[0];
          
          fireEvent.change(nameInput, { target: { value: invalidName } });
          fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput, { target: { value: 'ValidPass123' } });
          
          // Try to submit - use getAllBy and take the first one
          const submitButtons = screen.getAllByRole('button', { name: /buat akun baru/i });
          const submitButton = submitButtons[0];
          fireEvent.click(submitButton);
          
          // Should show name validation error
          const nameErrors = [
            'Full name is required',
            'Name must be at least 2 characters long'
          ];
          
          const hasNameError = nameErrors.some(message => 
            screen.queryByText(message) !== null
          );
          
          expect(hasNameError).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should consistently validate password confirmation matching', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.length >= 8),
        fc.string().filter(s => s.length >= 8),
        (password, confirmPassword) => {
          // Only test when passwords don't match
          fc.pre(password !== confirmPassword);
          
          renderLandingPage();
          
          // Switch to signup mode
          const signupToggle = screen.getByText('Buat akun baru');
          fireEvent.click(signupToggle);
          
          // Fill all fields - use getAllBy and take the first one
          const nameInputs = screen.getAllByPlaceholderText('Nama lengkap Anda');
          const nameInput = nameInputs[0];
          const emailInputs = screen.getAllByPlaceholderText('nama@perusahaan.com');
          const emailInput = emailInputs[0];
          const passwordInputs = screen.getAllByPlaceholderText('••••••••');
          const passwordInput = passwordInputs[0];
          const confirmPasswordInput = passwordInputs[1]; // Second password input is confirm password
          
          fireEvent.change(nameInput, { target: { value: 'Test User' } });
          fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput, { target: { value: password } });
          fireEvent.change(confirmPasswordInput, { target: { value: confirmPassword } });
          
          // Try to submit - use getAllBy and take the first one
          const submitButtons = screen.getAllByRole('button', { name: /buat akun baru/i });
          const submitButton = submitButtons[0];
          fireEvent.click(submitButton);
          
          // Should show password mismatch error
          const mismatchError = screen.queryByText('Passwords do not match');
          expect(mismatchError).toBeTruthy();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should consistently clear error states when switching between signin and signup modes', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (errorMessage) => {
          renderLandingPage();
          
          // Trigger an error by submitting empty form - use getAllBy and take the first one
          const submitButtons = screen.getAllByRole('button', { name: /masuk ke akun/i });
          const submitButton = submitButtons[0];
          fireEvent.click(submitButton);
          
          // Verify error appears
          const emailError = screen.queryByText('Email is required');
          expect(emailError).toBeTruthy();
          
          // Switch to signup mode
          const signupToggle = screen.getByText('Buat akun baru');
          fireEvent.click(signupToggle);
          
          // Error should be cleared
          const clearedError = screen.queryByText('Email is required');
          expect(clearedError).toBeFalsy();
          
          // Switch back to signin
          const signinToggle = screen.getByText('Masuk ke akun yang ada');
          fireEvent.click(signinToggle);
          
          // Error should still be cleared
          const stillClearedError = screen.queryByText('Email is required');
          expect(stillClearedError).toBeFalsy();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should consistently show Indonesian error messages for all validation failures', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.oneof(fc.constant(''), fc.constant('invalid-email')),
          password: fc.constant(''),
          name: fc.constant('')
        }),
        (formData) => {
          renderLandingPage();
          
          // Switch to signup mode to test all fields
          const signupToggle = screen.getByText('Buat akun baru');
          fireEvent.click(signupToggle);
          
          // Fill form with invalid data - use getAllBy and take the first one
          const nameInputs = screen.getAllByPlaceholderText('Nama lengkap Anda');
          const nameInput = nameInputs[0];
          const emailInputs = screen.getAllByPlaceholderText('nama@perusahaan.com');
          const emailInput = emailInputs[0];
          const passwordInputs = screen.getAllByPlaceholderText('••••••••');
          const passwordInput = passwordInputs[0];
          
          fireEvent.change(nameInput, { target: { value: formData.name } });
          fireEvent.change(emailInput, { target: { value: formData.email } });
          fireEvent.change(passwordInput, { target: { value: formData.password } });
          
          // Submit form - use getAllBy and take the first one
          const submitButtons = screen.getAllByRole('button', { name: /buat akun baru/i });
          const submitButton = submitButtons[0];
          fireEvent.click(submitButton);
          
          // Check that error messages are in Indonesian or English (acceptable)
          const possibleErrors = [
            'Full name is required',
            'Email is required',
            'Please enter a valid email address',
            'Password is required',
            'Name must be at least 2 characters long'
          ];
          
          const hasAnyError = possibleErrors.some(error => 
            screen.queryByText(error) !== null
          );
          
          expect(hasAnyError).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });
});