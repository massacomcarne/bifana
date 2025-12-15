import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);
const entityId = '35a9faf5-0c05-4fbb-aaa7-5bc1116f8127';

async function main() {
  await supabase.from('timers').delete().eq('entity_id', entityId);
  await supabase.from('entities').delete().eq('id', entityId);

  const { error: entityError } = await supabase
    .from('entities')
    .insert({ id: entityId, kind: 'group', name: 'Test Entity 123' });

  if (entityError) {
    console.error('Failed inserting entity', entityError);
    process.exit(1);
  }

  const { data: timer, error: timerError } = await supabase
    .from('timers')
    .insert({
      entity_id: entityId,
      duration_seconds: 300,
    })
    .select()
    .single();

  if (timerError) {
    console.error('Failed inserting timer', timerError);
    process.exit(1);
  }

  const { data, error } = await supabase.rpc('resume_timer', {
    target_timer: timer.id,
  });

  if (error) {
    console.error('Failed resuming timer', error);
    process.exit(1);
  }

  console.log('Timer is running:', data);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
