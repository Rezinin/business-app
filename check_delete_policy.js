const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vrqrqcrpmupubhvobtuz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycXJxY3JwbXVwdWJodm9idHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDAzMzEsImV4cCI6MjA5NTExNjMzMX0.qZ6dOoKsElNapRBPuyEmlFs6GnciJ4lORrM-rTwoGPI';

// Note: This will only work if we can use rpc() to execute raw SQL
// Since the anon key can't execute arbitrary SQL, let's just 
// verify the issue and document the fix needed

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndFixDeletePolicy() {
  console.log('Checking sales table RLS policies...\n');
  
  try {
    // Try to manually delete a test sale to see if DELETE policy exists
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', 'test-nonexistent-id');
    
    if (error) {
      console.log('DELETE Error:', error.message);
      if (error.message.includes('permission') || error.message.includes('policy')) {
        console.log('\n❌ DELETE policy is missing or insufficient!');
        console.log('\nTo fix this, run the following SQL in the Supabase SQL Editor:');
        console.log(`
DROP POLICY IF EXISTS "Enable delete access for all users" ON sales;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON sales;

CREATE POLICY "Enable delete access for authenticated users" ON sales
  FOR DELETE
  TO authenticated
  USING (true);
        `);
      }
    } else {
      console.log('✅ DELETE policy appears to be working (policy allowed the check)');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkAndFixDeletePolicy();
