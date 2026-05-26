const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vrqrqcrpmupubhvobtuz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycXJxY3JwbXVwdWJodm9idHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDAzMzEsImV4cCI6MjA5NTExNjMzMX0.qZ6dOoKsElNapRBPuyEmlFs6GnciJ4lORrM-rTwoGPI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteSalesForMay24() {
  console.log('Fetching all sales for May 24, 2026...\n');
  
  try {
    // Query for all sales on May 24, 2026
    const startDate = new Date(Date.UTC(2026, 4, 24, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(2026, 4, 24, 23, 59, 59, 999));
    
    console.log(`Start: ${startDate.toISOString()}`);
    console.log(`End: ${endDate.toISOString()}\n`);
    
    const { data: sales, error: fetchError } = await supabase
      .from('sales')
      .select('id, created_at, total_price, product_name')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (fetchError) {
      console.error('❌ Error fetching sales:', fetchError);
      return;
    }
    
    console.log(`Found ${sales.length} sales to delete\n`);
    
    if (sales.length === 0) {
      console.log('No sales found for May 24.');
      return;
    }
    
    // Display first few sales
    console.log('First 3 sales:');
    sales.slice(0, 3).forEach((sale, i) => {
      console.log(`  ${i+1}. ID: ${sale.id}, Date: ${sale.created_at}, Amount: ₵${sale.total_price}`);
    });
    console.log('...\n');
    
    // Try to delete all sales
    console.log('Attempting to delete all 20 sales...\n');
    
    const salesIds = sales.map(s => s.id);
    
    const { error: deleteError, count } = await supabase
      .from('sales')
      .delete()
      .in('id', salesIds);
    
    if (deleteError) {
      console.error('❌ Error deleting sales:', deleteError);
      console.log('\nIf you see a "permission denied" or "policy" error,');
      console.log('the DELETE RLS policy is missing from the sales table.');
      console.log('\nTo fix, run this SQL in Supabase SQL Editor:');
      console.log(`
DROP POLICY IF EXISTS "Enable delete access for all users" ON sales;
CREATE POLICY "Enable delete access for authenticated users" ON sales
  FOR DELETE TO authenticated USING (true);
      `);
    } else {
      console.log(`✅ Successfully deleted ${count} sales from May 24, 2026!`);
      
      // Verify deletion
      const { data: remaining } = await supabase
        .from('sales')
        .select('id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      console.log(`\nVerification: ${remaining.length} sales remaining for May 24`);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

deleteSalesForMay24();
