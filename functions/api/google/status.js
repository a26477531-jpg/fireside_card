import { json } from '../../_lib/http.js';
import { configured, currentUser } from '../../_lib/google-auth.js';

export async function onRequestGet({ request, env }) {
  if (!configured(env)) return json({ ok: true, enabled: false, linkedEmail: null });
  const user = await currentUser(request, env);
  const linked = user ? await env.DB.prepare('SELECT email FROM google_accounts WHERE user_id = ?1').bind(user.id).first() : null;
  return json({ ok: true, enabled: true, linkedEmail: linked?.email || null });
}
