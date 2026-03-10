// Initialize Supabase client
const SUPABASE_URL = 'https://uvhwmgyokkjcuujjesid.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9UD1YQewAZJxAYylExNfNg_uAXfY7Wv';

if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Global Supabase client initialized');
} else {
    console.error('❌ Supabase library not loaded. Make sure to include the script tag.');
}
