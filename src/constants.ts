export const DISABLED_CACHING_URLS = [
  '/user',
]


// OpenRouter API
export const OPENROUTER_API_KEY = import.meta.env.VITE_OPEN_ROUTER_KEY;
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_API_MAX_TOKENS_PER_MESSAGE = 1000;

export const OPENROUTER_SELECTED_MODEL = 'openrouter/fusion';
export const OPENROUTER_MODELS = [
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-sonnet-4.6',
  'deepseek/deepseek-r1',
  'google/gemini-2.5-flash-lite',
  'google/gemini-3.1-pro-preview',
  'inception/mercury-2',
  'meta-llama/llama-3.3-70b-instruct',
  'minimax/minimax-m2.5',
  'mistralai/codestral-2508',
  'mistralai/mistral-7b-instruct-v0.1',
  'mistralai/mistral-large',
  'mistralai/mistral-medium-3.1',
  'mistralai/mistral-small-3.2-24b-instruct-2506',
  'moonshotai/kimi-k2-thinking',
  'openai/gpt-5',
  'openai/gpt-5.4-nano',
  'openai/gpt-5.4-pro',
  'openai/gpt-oss-120b',
  'openrouter/fusion',
  'perplexity/sonar',
  'perplexity/sonar-pro',
  'qwen/qwen3-235b-a22b',
  'x-ai/grok-3',
  'x-ai/grok-3-mini',
  'x-ai/grok-4',
  'x-ai/grok-4.1-fast',
  'z-ai/glm-5',
];

export const NEURO_SYSTEM_SETTING_PROMPT = `
Ты полезный AI-ассистент Bubble AI, умеешь отправлять запросы в самые разные нейросети из списка в твоих настройках.
Твоя фишка в том, что ты умеешь хранить диалоги в виде древовидной структуры, в которой можно переключаться между ветвями.
Отвечай на русском языке, если пользователь не просит иначе.
Отвечай умеренно короче, если пользователь не просит иначе.
У тебя есть ограничение на длину одного ответа в 1000 символов. Если ты понимаешь, что оно превышается, скажи об этом и предложи пользователю продолжить твой ответ в следующем сообщении.
`;