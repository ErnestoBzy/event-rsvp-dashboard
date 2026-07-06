import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error('FAIL: Env-Variablen fehlen');
  console.error('  URL:', !!url, 'SERVICE_KEY:', !!serviceKey, 'ANON_KEY:', !!anonKey);
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

let passed = 0;
let failed = 0;

function ok(name, msg = '') {
  passed++;
  console.log(`✓ ${name}${msg ? ' — ' + msg : ''}`);
}
function fail(name, err) {
  failed++;
  console.log(`✗ ${name} — ${err}`);
}

console.log(`Supabase: ${url}\n`);

// 1. rsvp_responses table
try {
  const { data, error, count } = await supabase
    .from('rsvp_responses')
    .select('*', { count: 'exact', head: true });
  if (error) fail('rsvp_responses Tabelle', error.message);
  else ok('rsvp_responses Tabelle', `${count} Einträge`);
} catch (e) {
  fail('rsvp_responses Tabelle', e.message);
}

// 2. photos table
try {
  const { error, count } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true });
  if (error) fail('photos Tabelle', error.message);
  else ok('photos Tabelle', `${count} Einträge`);
} catch (e) {
  fail('photos Tabelle', e.message);
}

// 3. storage bucket photos exists
try {
  const { data, error } = await supabase.storage.getBucket('photos');
  if (error) fail('Storage-Bucket "photos"', error.message);
  else ok('Storage-Bucket "photos"', `public=${data.public}, max=${data.file_size_limit} bytes`);
} catch (e) {
  fail('Storage-Bucket "photos"', e.message);
}

// 4. rsvp_admin_summary view (used by dashboard)
try {
  const { data, error } = await supabase
    .from('rsvp_admin_summary')
    .select('*')
    .single();
  if (error) fail('rsvp_admin_summary View', error.message);
  else ok('rsvp_admin_summary View', `total_responses=${data?.total_responses ?? 0}`);
} catch (e) {
  fail('rsvp_admin_summary View', e.message);
}

// 5. write + read + delete a test photo metadata row
try {
  const testPath = `smoketest-${Date.now()}.jpg`;
  const { data: ins, error: insErr } = await supabase
    .from('photos')
    .insert({ storage_path: testPath, file_size: 1, mime_type: 'image/jpeg' })
    .select()
    .single();
  if (insErr) throw insErr;

  const { error: delErr } = await supabase.from('photos').delete().eq('id', ins.id);
  if (delErr) throw delErr;

  ok('photos insert/delete (Service Role)');
} catch (e) {
  fail('photos insert/delete (Service Role)', e.message);
}

// 6. anon role can READ photos (public gallery)
try {
  const anonClient = createClient(url, anonKey);
  const { error } = await anonClient.from('photos').select('id').limit(1);
  if (error) fail('photos SELECT mit Anon-Key (public read)', error.message);
  else ok('photos SELECT mit Anon-Key (public read)');
} catch (e) {
  fail('photos SELECT mit Anon-Key (public read)', e.message);
}

// 7. anon role CANNOT write photos
try {
  const anonClient = createClient(url, anonKey);
  const { error } = await anonClient
    .from('photos')
    .insert({ storage_path: 'should-fail.jpg', file_size: 1, mime_type: 'image/jpeg' });
  if (error) ok('photos INSERT mit Anon-Key blockiert', 'RLS aktiv');
  else fail('photos INSERT mit Anon-Key blockiert', 'sollte fehlschlagen — RLS möglicherweise nicht aktiv');
} catch (e) {
  ok('photos INSERT mit Anon-Key blockiert', 'RLS aktiv (Exception)');
}

console.log(`\n${passed} ok, ${failed} fail`);
process.exit(failed > 0 ? 1 : 0);
