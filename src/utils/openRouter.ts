import { OPENROUTER_API_KEY, OPENROUTER_API_URL, OPENROUTER_API_MAX_TOKENS_PER_MESSAGE } from '~/constants';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature: number;
  max_tokens: number;
  stream: boolean;
}

export async function streamChatCompletion(
  messages: OpenRouterMessage[],
  model: string,
  temperature: number,
  onChunk: (content: string) => void,
  onError: (error: string) => void,
  onComplete: () => void,
  abortSignal?: AbortSignal,
): Promise<void> {
  const data: OpenRouterRequest = {
    model,
    messages,
    temperature,
    max_tokens: OPENROUTER_API_MAX_TOKENS_PER_MESSAGE,
    stream: true,
  };

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      onError(`Ошибка ${response.status}: ${errorText}`);
      onComplete();
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError('No response body');
      onComplete();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
        
        const dataStr = trimmedLine.slice(6);
        if (dataStr === '[DONE]') {
          onComplete();
          return;
        }

        try {
          const chunk = JSON.parse(dataStr);
          if (chunk.choices && chunk.choices.length > 0) {
            const content = chunk.choices[0].delta?.content;
            if (content) {
              onChunk(content);
            }
          }
        } catch (e) {
          console.error('Failed to parse chunk:', e);
        }
      }
    }

    onComplete();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      onComplete();
      return;
    }
    onError(`Ошибка соединения: ${error}`);
    onComplete();
  }
}