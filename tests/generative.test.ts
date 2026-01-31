import assert from 'assert';
import { GenerativeModel, ChatSession } from '@google/generative-ai';

// Minimal mock implementing ChatSession for runtime test
class MockChat implements ChatSession {
  async sendMessageStream(_parts: any[]) {
    return {
      stream: (async function* () {
        yield { text: () => 'test-chunk' } as any;
      })()
    };
  }
}

(async () => {
  const mockModel: GenerativeModel = {
    startChat: () => new MockChat(),
    async generateContent(_inputs: any[]) {
      return { response: { text: () => 'ok' } } as any;
    }
  };

  const chat = mockModel.startChat();
  const res = await chat.sendMessageStream(['hi']);
  const chunks: string[] = [];
  for await (const c of res.stream) {
    chunks.push(c.text());
  }

  assert.deepStrictEqual(chunks, ['test-chunk']);
  const gen = await mockModel.generateContent(['x']);
  assert.strictEqual(gen.response.text(), 'ok');

  console.info('Test passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});