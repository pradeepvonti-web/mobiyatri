import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://acvjjepiyoxzwleggqvs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdmpqZXBpeW94endsZWdncXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2MjE3NDIsImV4cCI6MjEwMTE5Nzc0Mn0.wBsCo6aX1arPpKR8Z9Qqj4Ful_VAsKex1903qmz1xcg';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const { data: { session } } = await sb.auth.getSession();
  if (session) headers.Authorization = 'Bearer ' + session.access_token;
  return headers;
}
