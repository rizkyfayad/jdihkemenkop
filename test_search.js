require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testSearch() {
  const query = "lahan kdkmp";
  const allWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const effectiveKeywords = allWords;
  
  const contentOrFilter = effectiveKeywords.map(w => `content.ilike.%${w}%`).join(',');
  console.log("Filter string:", contentOrFilter);

  const contentSearchQuery = await supabase
      .from('documents')
      .select('id, filename, file_url')
      .or(contentOrFilter)
      .limit(100);

  if (contentSearchQuery.error) {
    console.error("ERROR:", contentSearchQuery.error);
  } else {
    console.log(`Found ${contentSearchQuery.data.length} docs.`);
    contentSearchQuery.data.forEach(d => console.log(" -", d.filename));
  }
}

testSearch();
