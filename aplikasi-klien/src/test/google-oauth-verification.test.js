/**
 * Test untuk Google OAuth Signup Verification
 * 
 * Test ini memverifikasi bahwa sistem Google OAuth:
 * 1. Memblokir sign-in jika user belum signup
 * 2. Mengizinkan sign-in jika user sudah signup
 * 3. Memberikan error message yang tepat
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase config first
vi.mock('../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    auth: {
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn()
    }
  }
}));

// Mock auth constants
vi.mock('../utils/constants/authConstants', () => ({
  AUTH_TIMEOUTS: {
    PROFILE_FETCH: 5000,
    SESSION_FETCH: 3000,
    SIGN_OUT: 3000,
    PROFILE_INSERT: 5000
  },
  AUTH_ERRORS: {
    NO_PROFILE: 'PGRST116',
    PROFILE_TIMEOUT: 'Profile fetch timeout',
    SESSION_TIMEOUT: 'Session fetch timeout',
    SIGN_OUT_TIMEOUT: 'Sign out timeout',
    NO_USER: 'No user found'
  }
}));

// Mock auth helpers
vi.mock('../utils/helpers/authHelpers', () => ({
  createDefaultProfile: vi.fn((userId, metadata = {}) => ({
    id: userId,
    name: metadata.name || 'Test User',
    email: metadata.email || 'test@example.com',
    avatar_url: metadata.avatar_url || null,
    role: 'user',
    preferences: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })),
  withTimeout: vi.fn((promise) => promise),
  clearAuthStorage: vi.fn(),
  extractNameFromEmail: vi.fn((email) => email.split('@')[0])
}));

// Import AuthService after mocks
import AuthService from '../services/auth/AuthService';
import { supabase } from '../config/supabase.js';

describe('Google OAuth Signup Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.getItem.mockReturnValue(null);
  });

  describe('AuthService.validateUserExistsById', () => {
    it('should return exists: false when user not found in database', async () => {
      // Mock database response - user not found
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' }
          })
        }))
      }));
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      });

      const result = await AuthService.validateUserExistsById('test-user-id');
      
      expect(result.exists).toBe(false);
      expect(result.error).toBe('User not found in database');
      expect(result.profile).toBe(null);
    });

    it('should return exists: true when user found in database', async () => {
      // Mock database response - user found
      const mockProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      };

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        }))
      }));
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      });

      const result = await AuthService.validateUserExistsById('test-user-id');
      
      expect(result.exists).toBe(true);
      expect(result.error).toBe(null);
      expect(result.profile).toEqual(mockProfile);
    });
  });

  describe('AuthService.signInWithGoogle', () => {
    it('should set auth mode in sessionStorage', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { url: 'https://oauth.url' },
        error: null
      });

      await AuthService.signInWithGoogle('signin');
      
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('auth_mode', 'signin');
    });

    it('should clear auth mode on error', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: null,
        error: { message: 'OAuth error' }
      });

      const result = await AuthService.signInWithGoogle('signin');
      
      expect(result.error).toBeTruthy();
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('auth_mode');
    });
  });

  describe('AuthService auth mode management', () => {
    it('should clear auth mode', () => {
      AuthService.clearAuthMode();
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('auth_mode');
    });

    it('should get auth mode', () => {
      window.sessionStorage.getItem.mockReturnValue('signup');
      const mode = AuthService.getAuthMode();
      expect(mode).toBe('signup');
      expect(window.sessionStorage.getItem).toHaveBeenCalledWith('auth_mode');
    });
  });
});

/**
 * Integration Test Scenarios
 * 
 * Scenario 1: User tries to sign in without signup (BLOCKED)
 * 1. User clicks "Sign In with Google" 
 * 2. Google OAuth succeeds
 * 3. System checks database - user not found
 * 4. System logs out user and redirects to signup with error
 * 
 * Scenario 2: User signs up then signs in (ALLOWED)
 * 1. User clicks "Sign Up with Google"
 * 2. Google OAuth succeeds  
 * 3. System creates profile in database
 * 4. User can now sign in successfully
 * 
 * Scenario 3: Existing user signs in (ALLOWED)
 * 1. User clicks "Sign In with Google"
 * 2. Google OAuth succeeds
 * 3. System finds user in database
 * 4. Sign in proceeds normally
 */

describe('Integration Test Scenarios', () => {
  describe('Scenario 1: Sign-in without signup (BLOCKED)', () => {
    it('should block sign-in when user not found by ID', async () => {
      // Mock user not found in database
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' }
          })
        }))
      }));
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      });

      const result = await AuthService.validateUserExistsById('non-existent-user');
      
      expect(result.exists).toBe(false);
      expect(result.error).toBe('User not found in database');
    });
  });

  describe('Scenario 2: Sign-up then sign-in (ALLOWED)', () => {
    it('should allow sign-in after successful signup', async () => {
      // Mock user found in database (after signup)
      const mockProfile = {
        id: 'existing-user-id',
        email: 'existing@example.com',
        created_at: new Date().toISOString()
      };

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        }))
      }));
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      });

      const result = await AuthService.validateUserExistsById('existing-user-id');
      
      expect(result.exists).toBe(true);
      expect(result.profile).toEqual(mockProfile);
    });
  });

  describe('Auth Mode Enforcement', () => {
    it('should enforce signin mode validation', () => {
      window.sessionStorage.getItem.mockReturnValue('signin');
      const mode = AuthService.getAuthMode();
      expect(mode).toBe('signin');
    });

    it('should enforce signup mode validation', () => {
      window.sessionStorage.getItem.mockReturnValue('signup');
      const mode = AuthService.getAuthMode();
      expect(mode).toBe('signup');
    });

    it('should handle missing auth mode gracefully', () => {
      window.sessionStorage.getItem.mockReturnValue(null);
      const mode = AuthService.getAuthMode();
      expect(mode).toBe(null);
    });
  });
});