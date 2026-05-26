const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vrqrqcrpmupubhvobtuz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycXJxY3JwbXVwdWJodm9idHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDAzMzEsImV4cCI6MjA5NTExNjMzMX0.qZ6dOoKsElNapRBPuyEmlFs6GnciJ4lORrM-rTwoGPI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyDatabaseState() {
  console.log('=== DATABASE VERIFICATION ===\n');
  console.log('Checking sales count for each date:\n');
  
  const dates = ['2026-05-22', '2026-05-23', '2026-05-24', '2026-05-25', '2026-05-26'];
  
  for (const dateStr of dates) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    
    const { count, error } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    const result = error ? 'ERROR' : (count || 0);
    console.log(`${dateStr}: ${result} sales`);
  }
  
  console.log('\n=== TOTAL SALES IN DATABASE ===\n');
  const { count: totalCount } = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total sales in database: ${totalCount || 0}\n`);
}

verifyDatabaseState();
