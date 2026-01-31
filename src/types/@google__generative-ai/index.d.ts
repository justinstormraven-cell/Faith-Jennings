declare module '@google/generative-ai' {
  /** Options to control generation behavior */
  export interface GenerationConfig {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  }

  export interface GenerativeModelOptions {
    model?: string;
    systemInstruction?: string;
    generationConfig?: GenerationConfig;
  }

  export interface InlineData {
    mimeType: string;
    data: string; // base64 encoded payload
    filename?: string;
  }

  export interface GenerateContentResponse {
    response: {
      /** Convenience accessor for simple text responses */
      text(): string;
      /** Optional structured parts when multi-part responses exist */
      parts?: Array<{ text?: string; mimeType?: string }>;
    };
  }

  export interface ChatHistoryEntry {
    role: 'system' | 'user' | 'model' | 'assistant';
    parts: Array<{ text?: string }>;
  }

  export interface ChatStreamChunk {
    /** Current text delta for this chunk */
    text(): string;
    /** Optional role/metadata */
    role?: 'system' | 'user' | 'assistant' | 'tool' | 'model';
    [key: string]: any;
  }

  export interface ChatSession {
    /**
     * Send message parts and return an object containing an async stream of chunks.
     * Each chunk exposes a text() method returning the text delta for that chunk.
     */
    sendMessageStream(parts: any[]): Promise<{ stream: AsyncIterable<ChatStreamChunk> }>;

    /** startChat may exist on instances returned from getGenerativeModel */
    startChat?(opts?: { history?: ChatHistoryEntry[] }): ChatSession;
  }

  export interface GenerativeModel {
    startChat(opts?: { history?: ChatHistoryEntry[] }): ChatSession;

    /**
     * Generate arbitrary content from the model. Inputs can be strings, text objects
     * or inline binary payloads represented with InlineData.
     */
    generateContent(inputs: Array<string | { inlineData: InlineData } | { text: string }>, opts?: any): Promise<GenerateContentResponse>;
  }

  export class GoogleGenerativeAI {
    constructor(apiKey: string);

    /** Return a model instance configured with optional system instruction and generation settings */
    getGenerativeModel(opts?: GenerativeModelOptions): GenerativeModel;
  }

  /* Common re-exports for convenience and parity with the upstream package */
  export { GoogleGenerativeAI as GoogleGenAI, ChatSession };
  export type { GenerateContentResponse };
}
