
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nfmuksducfprlmkssksc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mbXVrc2R1Y2Zwcmxta3Nza3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODYwOTIsImV4cCI6MjA4MDc2MjA5Mn0.wEbQOrkUxlGOmgdwwnYBpg98Gc635o77MFQQP8LRtTU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking customers table...');
  const { data, error } = await supabase.from('customers').select('count').limit(1);
  if (error) {
    console.log('Error accessing customers table:', error.message);
  } else {
    console.log('Customers table exists.');
  }
}

check();
