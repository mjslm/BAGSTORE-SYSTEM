import { setTimeout as delay } from 'node:timers/promises';

const transientStatuses = new Set([500, 502, 503, 504]);

export function createGemini({ key, model = 'gemini-3.1-flash-lite', request = fetch } = {}) {
  const configured = Boolean(key && /^[a-z0-9.-]+$/i.test(model));

  async function generate({ feature, instructions, input, image, schema, responseJsonSchema, maxOutputTokens = 1024 }) {
    if (!configured) return null;
    const parts = [{ text: JSON.stringify(input) }];
    if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: instructions }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens, responseMimeType: 'application/json', responseJsonSchema },
    });

    // Photo analysis can take longer. Allow one bounded retry for transient provider failures.
    const timeouts = image ? [26_000, 18_000] : [15_000];
    for (const [attempt, timeout] of timeouts.entries()) {
      let retryable = false;
      try {
        const response = await request('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
          method: 'POST', signal: AbortSignal.timeout(timeout), redirect: 'error',
          headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
          body,
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.find((part) => !part.thought && part.text)?.text;
          return schema.parse(JSON.parse(text));
        }
        console.warn(feature + ': Gemini HTTP status', response.status);
        retryable = transientStatuses.has(response.status);
        await response.body?.cancel();
      } catch (error) {
        const timedOut = error?.name === 'TimeoutError';
        console.warn(feature + (timedOut
          ? ': Gemini request timed out after ' + timeout / 1000 + 's'
          : ': Gemini request or response failed'));
        retryable = timedOut || error?.name === 'TypeError';
      }

      if (!retryable || attempt + 1 >= timeouts.length) return null;
      console.info(feature + ': retrying Gemini once');
      await delay(1000);
    }
    return null;
  }

  return { configured, generate };
}
