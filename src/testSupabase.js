import { supabase } from "./lib/supabaseClient";

export async function testSupabase() {
  const { data, error } = await supabase.from("profiles").select().limit(1);

  if (error) {
    return "❌ Error: " + error.message;
  }
  return "✅ Conexión OK: " + JSON.stringify(data);
}
