import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const DebugInfo = () => {
  const { user, session, profile, loading, isNewUser } = useAuth();

  // Only show in development
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs max-w-xs z-50">
      <div className="font-bold mb-2">Debug Info</div>
      <div className="space-y-1">
        <div>Loading: {loading ? 'true' : 'false'}</div>
        <div>User: {user ? user.email : 'null'}</div>
        <div>Session: {session ? 'exists' : 'null'}</div>
        <div>Profile: {profile ? profile.name || 'no name' : 'null'}</div>
        <div>New User: {isNewUser ? 'true' : 'false'}</div>
        <div>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? 'set' : 'missing'}</div>
        <div>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'set' : 'missing'}</div>
      </div>
    </div>
  );
};

export default DebugInfo;