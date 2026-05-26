const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vrqrqcrpmupubhvobtuz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycXJxY3JwbXVwdWJodm9idHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDAzMzEsImV4cCI6MjA5NTExNjMzMX0.qZ6dOoKsElNapRBPuyEmlFs6GnciJ4lORrM-rTwoGPI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSalesByDate() {
  console.log('Checking sales by date...\n');
  
  const dates = ['2026-05-22', '2026-05-23', '2026-05-24', '2026-05-25'];
  
  for (const dateStr of dates) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    
    const { data, error, count } = await supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    const result = error ? 'ERROR' : (count || 0);
    console.log(`${dateStr}: ${result} sales`);
  }
}

checkSalesByDate();
