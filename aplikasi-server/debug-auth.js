// Debug script to test Supabase token validation
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Debug Auth Configuration');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Key exists:', !!supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.log('Required environment variables:');
  console.log('- SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test function to verify a token
async function testTokenVerification(token) {
  try {
    console.log('\n🧪 Testing token verification...');
    console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('❌ Token verification failed:', error.message);
      return null;
    }
    
    if (!user) {
      console.error('❌ No user found for token');
      return null;
    }
    
    console.log('✅ Token verification successful');
    console.log('User ID:', user.id);
    console.log('User Email:', user.email);
    console.log('User Created:', user.created_at);
    
    return user;
  } catch (error) {
    console.error('❌ Exception during token verification:', error.message);
    return null;
  }
}

// Test with a sample token (you'll need to provide this)
const sampleToken = process.argv[2];

if (!sampleToken) {
  console.log('\n📋 Usage:');
  console.log('node debug-auth.js <your-access-token>');
  console.log('\nTo get your access token:');
  console.log('1. Open browser dev tools');
  console.log('2. Go to Application/Storage > Local Storage');
  console.log('3. Find supabase.auth.token');
  console.log('4. Copy the access_token value');
  process.exit(0);
}

testTokenVerification(sampleToken);