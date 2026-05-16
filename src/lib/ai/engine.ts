// ============================================
// AssistMint AI Engine — NIM Primary + Groq Fallback
// ============================================

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

// ─── Providers ──────────────────────────────

const nim = createOpenAICompatible({
  name: 'nvidia-nim',
  baseURL: 'https://integrate.api.nvidia.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.NIM_API_KEY}`,
  },
});

const groq = createOpenAICompatible({
  name: 'groq',
  baseURL: 'https://api.groq.com/openai/v1',
  headers: {
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
  },
});

// ─── Engine Config ──────────────────────────

interface MessageInput {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIEngineOptions {
  messages: MessageInput[];
  maxOutputTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface AIResponse {
  text: string;
  provider: 'nim' | 'groq' | 'fallback';
  usage?: { input: number; output: number };
}

const NIM_MODEL = process.env.NIM_MODEL || 'meta/llama-3.3-70b-instruct';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// ─── Main Engine ────────────────────────────

export async function generateAIResponse(
  options: AIEngineOptions
): Promise<AIResponse> {
  const { messages, maxOutputTokens = 1024, temperature = 0.7, systemPrompt } = options;

  const allMessages: MessageInput[] = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
    : messages;

  // Attempt 1: NVIDIA NIM (Primary)
  if (process.env.NIM_API_KEY) {
    try {
      const result = await generateText({
        model: nim.chatModel(NIM_MODEL),
        messages: allMessages,
        maxOutputTokens,
        temperature,
      });

      const usage = result.usage as unknown as Record<string, number> | undefined;
      return {
        text: result.text,
        provider: 'nim',
        usage: {
          input: usage?.promptTokens ?? usage?.inputTokens ?? 0,
          output: usage?.completionTokens ?? usage?.outputTokens ?? 0,
        },
      };
    } catch (error) {
      console.error('[AI Engine] NIM failed, falling back to Groq:', (error as Error).message);
    }
  }

  // Attempt 2: Groq (Fallback)
  if (process.env.GROQ_API_KEY) {
    try {
      const result = await generateText({
        model: groq.chatModel(GROQ_MODEL),
        messages: allMessages,
        maxOutputTokens,
        temperature,
      });

      const usage = result.usage as unknown as Record<string, number> | undefined;
      return {
        text: result.text,
        provider: 'groq',
        usage: {
          input: usage?.promptTokens ?? usage?.inputTokens ?? 0,
          output: usage?.completionTokens ?? usage?.outputTokens ?? 0,
        },
      };
    } catch (error) {
      console.error('[AI Engine] Groq failed:', (error as Error).message);
    }
  }

  // Attempt 3: Static fallback
  return {
    text: "I'm sorry, I'm experiencing some technical difficulties right now. Please try again in a moment, or type 'agent' to speak with a human. 🙏",
    provider: 'fallback',
  };
}

// ─── Quick Text Generation ──────────────────

export async function quickGenerate(
  prompt: string,
  options?: Partial<AIEngineOptions>
): Promise<string> {
  const response = await generateAIResponse({
    messages: [{ role: 'user', content: prompt }],
    ...options,
  });
  return response.text;
}

// ─── Health Check ───────────────────────────

export async function checkAIHealth(): Promise<{
  nim: boolean;
  groq: boolean;
}> {
  const results = { nim: false, groq: false };

  if (process.env.NIM_API_KEY) {
    try {
      await generateText({
        model: nim.chatModel(NIM_MODEL),
        messages: [{ role: 'user' as const, content: 'Hi' }],
        maxOutputTokens: 5,
      });
      results.nim = true;
    } catch {
      results.nim = false;
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      await generateText({
        model: groq.chatModel(GROQ_MODEL),
        messages: [{ role: 'user' as const, content: 'Hi' }],
        maxOutputTokens: 5,
      });
      results.groq = true;
    } catch {
      results.groq = false;
    }
  }

  return results;
}
