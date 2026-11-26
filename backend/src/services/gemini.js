export function createGemini({ key, model = 'gemini-3.1-flash-lite', request = fetch } = {}) {
  const configured = Boolean(key && /^[a-z0-9.-]+$/i.test(model));

  async function generate({ feature, instructions, input, image, schema, responseJsonSchema, maxOutputTokens = 1024 }) {
    if (!configured) return null;
    const parts = [{ text: JSON.stringify(input) }];
    if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    try {
      const response = await request('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST', signal: AbortSignal.timeout(15_000), redirect: 'error',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens, responseMimeType: 'application/json', responseJsonSchema },
        }),
      });
      if (!response.ok) {
        console.warn(feature + ': Gemini HTTP status', response.status);
        return null;
      }
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.find((part) => !part.thought && part.text)?.text;
      return schema.parse(JSON.parse(text));
    } catch (error) {
      console.warn(feature + (error?.name === 'TimeoutError'
        ? ': Gemini request timed out'
        : ': Gemini request or response failed'));
      return null;
    }
  }

  return { configured, generate };
}
