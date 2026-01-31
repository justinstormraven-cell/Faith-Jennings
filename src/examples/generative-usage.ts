import { GoogleGenerativeAI as GoogleGenAI, GenerativeModel, ChatSession } from '@google/generative-ai';

async function demo() {
  if (!process.env.GEMINI_API_KEY) {
    console.info('GEMINI_API_KEY not set; running mock demo (no network calls)');

    // Mock model demonstrating typed usage without calling real API
    const mockModel: GenerativeModel = {
      startChat: () => ({
        async sendMessageStream(_parts: any[]) {
          return {
            stream: (async function* () {
              yield { text: () => 'Mock chunk 1' } as any;
              yield { text: () => 'Mock chunk 2' } as any;
            })()
          };
        }
      }),
      async generateContent(_inputs: any[]) {
        return { response: { text: () => 'Mock generated text' } } as any;
      }
    };

    const chat: ChatSession = mockModel.startChat();
    const res = await chat.sendMessageStream(['hello']);

    for await (const chunk of res.stream) {
      console.info('chunk:', chunk.text());
    }

    const gen = await mockModel.generateContent(['hi']);
    console.info('generateContent:', gen.response.text());

    return;
  }

  // Example (safe): construct client and show how you'd create a model and chat
  const client = new GoogleGenAI(process.env.GEMINI_API_KEY!);
  const _model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

  console.info('Model ready. To avoid accidental network calls, this script prints instructions instead of executing requests.');
  console.info('Call model.startChat() and model.generateContent() to interact with API.');
}

demo().catch((e) => {
  console.error(e);
  process.exit(1);
});