/**
 * DeepSeek connectivity smoke test.
 * Run with: npm run smoke
 * Reads the API key from `deepseek_KEY` (preferred) or `DEEPSEEK_API_KEY`.
 */
const key = process.env.deepseek_KEY ?? process.env.DEEPSEEK_API_KEY;
const baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

if (!key) {
  console.error('✗ No API key found. Set deepseek_KEY in your environment.');
  process.exit(1);
}

const res = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model,
    stream: true,
    max_tokens: 64,
    messages: [{ role: 'user', content: 'Reply with one short sentence confirming you are online.' }],
  }),
});

if (!res.ok || !res.body) {
  console.error(`✗ HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}

process.stdout.write('✓ Streaming: ');
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = '';
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  const lines = buf.split('\n');
  buf = lines.pop() ?? '';
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('data:')) continue;
    const data = t.slice(5).trim();
    if (data === '[DONE]') continue;
    try {
      const json = JSON.parse(data);
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) process.stdout.write(delta);
      if (json.model) process.env.__SMOKE_MODEL = json.model;
    } catch {
      /* ignore partial */
    }
  }
}
console.log(`\n✓ DeepSeek reachable (served model: ${process.env.__SMOKE_MODEL ?? model}).`);
