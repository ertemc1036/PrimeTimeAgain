/**
 * Local test gateway for MINUS 30 (never deployed). Mirrors the Supabase URL layout on one port:
 *   /auth/v1/*        → Supabase Auth (GoTrue) at GOTRUE_URL
 *   /functions/v1/:fn → the real Edge Function handlers in ../functions
 *   /storage/v1/*     → small in-memory Storage emulator (path must start with the caller's user id)
 *   /templates/*      → auth email templates
 *   /mock/anthropic/* → Anthropic Messages API stand-in with switchable scenarios
 *   /mock/revenuecat/*→ RevenueCat REST stand-in
 * Run: deno run -A supabase/tests/local-gateway.ts   (env: see supabase/tests/README.md)
 */
import { handler as coach } from '../functions/coach/handler.ts';
import { handler as deleteAccount } from '../functions/delete-account/handler.ts';
import { handler as entitlement } from '../functions/entitlement/handler.ts';
import { handler as exportData } from '../functions/export/handler.ts';
import { handler as foodScan } from '../functions/food-scan/handler.ts';
import { handler as webhook } from '../functions/revenuecat-webhook/handler.ts';
import { handler as sync } from '../functions/sync/handler.ts';
import { handler as workoutPhoto } from '../functions/workout-photo/handler.ts';

const FUNCTIONS: Record<string, (req: Request) => Promise<Response>> = {
  sync, export: exportData, entitlement, 'food-scan': foodScan, 'workout-photo': workoutPhoto, coach, 'revenuecat-webhook': webhook, 'delete-account': deleteAccount,
};
const GOTRUE = Deno.env.get('GOTRUE_URL') ?? 'http://127.0.0.1:9999';
const JWT_SECRET = Deno.env.get('JWT_SECRET') ?? '';
const PORT = Number(Deno.env.get('GATEWAY_PORT') ?? '54321');
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-upsert, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};
const withCors = (res: Response) => {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
};
const j = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

// --- JWT (HS256) verification for the storage emulator ---------------------------------------
async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((s.length + 2) % 4 || 2)), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return null;
  const claims = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
  return claims.exp && claims.exp * 1000 < Date.now() ? null : claims;
}

// --- Storage emulator -------------------------------------------------------------------------
const files = new Map<string, Uint8Array>(); // `${bucket}/${path}`
const signed = new Map<string, string>(); // token → key
async function storage(req: Request, path: string): Promise<Response> {
  const claims = await verifyJwt(req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '');
  if (!claims) return j({ statusCode: '403', error: 'Unauthorized', message: 'invalid jwt' }, 403);
  const service = claims.role === 'service_role';
  const sub = String(claims.sub ?? '');
  const allowed = (key: string) => service || key.split('/')[1] === sub;
  let m: RegExpMatchArray | null;
  if ((m = path.match(/^object\/list\/([^/]+)$/)) && req.method === 'POST') {
    const body = await req.json();
    const prefix = `${m[1]}/${body.prefix ? `${body.prefix}/` : ''}`;
    if (!allowed(prefix + 'x')) return j([]);
    return j([...files.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ name: k.slice(prefix.length), id: k })));
  }
  if ((m = path.match(/^object\/sign\/([^/]+)\/(.+)$/)) && req.method === 'POST') {
    const key = `${m[1]}/${m[2]}`;
    if (!allowed(key) || !files.has(key)) return j({ statusCode: '404', error: 'not_found', message: 'Object not found' }, 400);
    const token = crypto.randomUUID();
    signed.set(token, key);
    return j({ signedURL: `/object/sign/${key}?token=${token}` });
  }
  if ((m = path.match(/^object\/sign\/(.+)$/)) && req.method === 'GET') {
    const key = signed.get(new URL(req.url).searchParams.get('token') ?? '');
    return key && files.has(key) ? new Response(files.get(key)!, { headers: { 'Content-Type': 'image/jpeg' } }) : j({ error: 'not_found' }, 404);
  }
  if ((m = path.match(/^object\/([^/]+)$/)) && req.method === 'DELETE') {
    const body = await req.json();
    const removed = (body.prefixes as string[]).map((p) => `${m![1]}/${p}`).filter((k) => allowed(k) && files.delete(k));
    return j(removed.map((k) => ({ name: k })));
  }
  if ((m = path.match(/^object\/([^/]+)\/(.+)$/)) && (req.method === 'POST' || req.method === 'PUT')) {
    const key = `${m[1]}/${m[2]}`;
    if (!['progress-photos', 'workout-photos'].includes(m[1]) || !allowed(key)) return j({ statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' }, 403);
    if (files.has(key) && req.headers.get('x-upsert') !== 'true') return j({ statusCode: '409', error: 'Duplicate', message: 'The resource already exists' }, 400);
    files.set(key, new Uint8Array(await req.arrayBuffer()));
    return j({ Key: key, Id: key });
  }
  return j({ error: 'not_found', path }, 404);
}

// --- Anthropic stand-in -------------------------------------------------------------------------
let scenario: 'ok' | 'invalid' | 'error' | 'refusal' = 'ok';
let lastRequest: unknown = null;
let anthropicCalls = 0;
const message = (content: unknown[], stop = 'end_turn') => ({
  id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content, stop_reason: stop, stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 10 },
});
function anthropic(body: Record<string, unknown>): Response {
  anthropicCalls++;
  lastRequest = body;
  if (scenario === 'error') return j({ type: 'error', error: { type: 'api_error', message: 'mock failure' } }, 500);
  const system = String(body.system ?? '');
  const isScan = system.includes('nutrition of a meal');
  const isPhoto = system.includes('setting of a photo');
  let text: string;
  if (scenario === 'invalid') text = isScan || isPhoto ? '{"status":"ok","items":"not a list"}' : '';
  else if (isScan) text = JSON.stringify({ status: 'ok', mealTitle: 'Chicken with rice', items: [{ name: 'Chicken breast', estimatedGrams: 150, kcal: 248, protein: 46, carbs: 0, fat: 5 }, { name: 'White rice', estimatedGrams: 180, kcal: 234, protein: 5, carbs: 51, fat: 0.5 }], uncertaintyNotes: ['Cooking oil may not be visible.'] });
  else if (isPhoto) text = JSON.stringify({ environment: 'gym', confidence: 'high', summary: 'Indoor gym with weight machines.' });
  else text = 'Try a simple plan: oats for breakfast, a chicken salad for lunch and a 30-minute walk.';
  const stop = scenario === 'refusal' ? 'refusal' : 'end_turn';
  if (!body.stream) return j(message(scenario === 'refusal' ? [] : [{ type: 'text', text }], stop));
  const events: [string, unknown][] = [['message_start', { type: 'message_start', message: message([], null as unknown as string) }]];
  if (scenario !== 'refusal') {
    events.push(['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }]);
    for (const part of text.match(/.{1,24}/g) ?? []) events.push(['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: part } }]);
    events.push(['content_block_stop', { type: 'content_block_stop', index: 0 }]);
  }
  events.push(['message_delta', { type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 10 } }]);
  events.push(['message_stop', { type: 'message_stop' }]);
  return new Response(events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } });
}

// --- RevenueCat stand-in ------------------------------------------------------------------------
const subscribers = new Map<string, unknown>();

Deno.serve({ port: PORT, hostname: '127.0.0.1' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const p = url.pathname;
  try {
    if (p.startsWith('/auth/v1/')) {
      const target = `${GOTRUE}${p.slice('/auth/v1'.length)}${url.search}`;
      const headers = new Headers(req.headers);
      headers.delete('host');
      const res = await fetch(target, { method: req.method, headers, body: req.body, redirect: 'manual' });
      return withCors(new Response(res.body, { status: res.status, headers: res.headers }));
    }
    let m: RegExpMatchArray | null;
    if ((m = p.match(/^\/functions\/v1\/([a-z-]+)$/))) {
      const fn = FUNCTIONS[m[1]];
      return fn ? withCors(await fn(req)) : withCors(j({ error: 'not_found' }, 404));
    }
    if (p.startsWith('/storage/v1/')) return withCors(await storage(req, p.slice('/storage/v1/'.length)));
    if ((m = p.match(/^\/templates\/([a-z]+\.html)$/))) return new Response(await Deno.readTextFile(new URL(`../templates/${m[1]}`, import.meta.url)), { headers: { 'Content-Type': 'text/html' } });
    if (p === '/mock/anthropic/v1/messages') {
      const key = req.headers.get('x-api-key') ?? req.headers.get('authorization')?.replace(/^Bearer /, '');
      if (key !== Deno.env.get('ANTHROPIC_API_KEY')) console.error('mock anthropic: unexpected credentials', [...req.headers.keys()].join(','));
      if (key !== Deno.env.get('ANTHROPIC_API_KEY')) return j({ type: 'error', error: { type: 'authentication_error', message: 'bad key' } }, 401);
      return anthropic(await req.json());
    }
    if (p === '/mock/control' && req.method === 'POST') {
      const b = await req.json();
      if (b.scenario) scenario = b.scenario;
      if (b.subscriber) subscribers.set(b.subscriber.id, b.subscriber.data);
      if (b.reset) { anthropicCalls = 0; lastRequest = null; }
      return j({ scenario, anthropicCalls });
    }
    if (p === '/mock/control' && req.method === 'GET') return j({ scenario, anthropicCalls, lastRequest, files: [...files.keys()] });
    if ((m = p.match(/^\/mock\/revenuecat\/v1\/subscribers\/(.+)$/))) {
      if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('REVENUECAT_SECRET_KEY')}`) return j({ code: 7225, message: 'Invalid API key' }, 401);
      const id = decodeURIComponent(m[1]);
      return j({ subscriber: subscribers.get(id) ?? { entitlements: {}, subscriptions: {} } });
    }
    return j({ error: 'not_found', path: p }, 404);
  } catch (e) {
    console.error(e);
    return withCors(j({ error: 'gateway_error', message: (e as Error).message }, 500));
  }
});
