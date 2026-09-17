// Debug script to check scheduler issues
// Run this with: node debug-scheduler.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugScheduler() {
  console.log('🔍 Debugging Scheduler Issues...\n');

  try {
    // 1. Check if users exist
    const { data: users, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('❌ Database Error:', error);
      return;
    }

    console.log(`✅ Found ${users.length} users in database\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found - create a user account first');
      return;
    }

    // 2. Check each user's configuration
    users.forEach((user, index) => {
      console.log(`👤 User ${index + 1}: ${user.email}`);
      console.log(`   Keywords: ${user.keywords?.length || 0} (${user.keywords?.join(', ') || 'none'})`);
      console.log(`   Credits: ${user.credits}`);
      console.log(`   Custom Schedule: ${user.use_custom_schedule || false}`);
      console.log(`   Base Time: ${user.base_time || 'not set'}`);
      console.log(`   Scan Interval: ${user.scan_interval} hours`);
      console.log(`   Last Scan: ${user.last_scan_at || 'never'}`);
      
      // Check if user is eligible for scanning
      const hasKeywords = user.keywords && user.keywords.length > 0;
      const hasCredits = user.credits >= 5;
      const eligible = hasKeywords && hasCredits;
      
      console.log(`   ✅ Scan Eligible: ${eligible ? 'YES' : 'NO'}`);
      if (!hasKeywords) console.log('      ❌ Missing keywords');
      if (!hasCredits) console.log('      ❌ Insufficient credits (need 5+)');
      console.log('');
    });

    // 3. Check environment variables
    console.log('🔧 Environment Configuration:');
    console.log(`   SCAN_TIMES: ${process.env.SCAN_TIMES || '08:00,12:00,16:00,20:00'}`);
    console.log(`   CREDITS_PER_SEARCH: ${process.env.CREDITS_PER_SEARCH || '5'}`);
    console.log(`   DEFAULT_LINKEDIN_COUNT: ${process.env.DEFAULT_LINKEDIN_COUNT || '15'}`);
    console.log(`   DEFAULT_NAUKRI_COUNT: ${process.env.DEFAULT_NAUKRI_COUNT || '15'}`);

  } catch (error) {
    console.error('💥 Exception:', error);
  }
}

debugScheduler().then(() => {
  console.log('\n🔍 Debug complete. Check the output above for issues.');
  process.exit(0);
});