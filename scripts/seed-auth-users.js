/**
 * One-time script to create Admin and Supervisor users in Supabase Auth.
 * Run: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node scripts/seed-auth-users.js
 *
 * Get the service role key from: Supabase Dashboard > Project Settings > API > service_role
 * NEVER expose the service role key in frontend code.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uvhwmgyokkjcuujjesid.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required. Get it from Supabase Dashboard > Project Settings > API');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function seed() {
    const users = [
        { email: 'admin@eggbucket.app', password: 'Admin123@', role: 'admin', display: 'Admin' },
        { email: 'supervisor@eggbucket.app', password: '6366929651', role: 'supervisor', display: 'Supervisor' }
    ];

    for (const u of users) {
        try {
            const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
            const existing = list?.users?.find(x => x.email === u.email);
            if (existing) {
                await supabase.auth.admin.updateUserById(existing.id, { app_metadata: { role: u.role } });
                console.log(`✅ ${u.display} already exists, app_metadata updated`);
                continue;
            }
            const { error } = await supabase.auth.admin.createUser({
                email: u.email,
                password: u.password,
                email_confirm: true,
                app_metadata: { role: u.role }
            });
            if (error) {
                console.error(`❌ ${u.display}:`, error.message);
            } else {
                console.log(`✅ ${u.display} created`);
            }
        } catch (e) {
            console.error(`❌ ${u.display}:`, e.message);
        }
    }
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
