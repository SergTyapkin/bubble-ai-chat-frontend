// src/stores/chatStore.ts
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { streamChatCompletion } from '~/utils/openRouter';

export interface Message {
  id: string;
  dialogId: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  edited?: boolean;
}

export interface Dialog {
  id: string;
  title: string;
  messages: Message[];
  lastMessage?: Message;
  createdAt: Date;
}

const STORAGE_KEY = 'bubble-ai-chat';

// Утилиты для сериализации/десериализации
function serializeDialogs(dialogs: Dialog[]): string {
  function prepareForSerialization(obj: any): any {
    if (obj instanceof Date) {
      return { __type: 'Date', value: obj.toISOString() };
    }

    if (Array.isArray(obj)) {
      return obj.map(prepareForSerialization);
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = prepareForSerialization(obj[key]);
        }
      }
      return result;
    }

    return obj;
  }

  return JSON.stringify(prepareForSerialization(dialogs));
}

function deserializeDialogs(json: string): Dialog[] {
  if (!json) return [];

  try {
    return JSON.parse(json, (_key, value) => {
      if (value && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
  } catch (e) {
    console.error('Failed to parse dialogs from localStorage:', e);
    return [];
  }
}

function loadFromStorage(): Dialog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return deserializeDialogs(stored || '');
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
    return [];
  }
}

function saveToStorage(dialogs: Dialog[]): void {
  try {
    const serialized = serializeDialogs(dialogs);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export const useChatStore = defineStore('chat', () => {
  const dialogs = ref<Dialog[]>(loadFromStorage());
  const activeDialogId = ref<string | null>(null);
  const isGenerating = ref(false);
  const isWaitingForResponse = ref(false);
  const showFullscreenGraph = ref(false);
  const selectedModel = ref<string>('deepseek/deepseek-r1');
  const temperature = ref<number>(0.7);
  let abortController: AbortController | null = null;

  // Загрузить настройки из localStorage
  const savedSettings = localStorage.getItem(`${STORAGE_KEY}-settings`);
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      selectedModel.value = settings.selectedModel || selectedModel.value;
      temperature.value = settings.temperature ?? temperature.value;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }

  // Следим за изменениями и сохраняем
  watch(
    dialogs,
    (newDialogs) => {
      saveToStorage(newDialogs);
    },
    { deep: true }
  );

  // Также сохраняем активный диалог
  watch(activeDialogId, (newId) => {
    try {
      localStorage.setItem(`${STORAGE_KEY}-active`, newId || '');
    } catch (e) {
      console.error('Failed to save active dialog id:', e);
    }
  });

  // Восстанавливаем активный диалог
  const savedActiveId = localStorage.getItem(`${STORAGE_KEY}-active`);
  if (savedActiveId && dialogs.value.some(d => d.id === savedActiveId)) {
    activeDialogId.value = savedActiveId;
  } else if (dialogs.value.length > 0) {
    activeDialogId.value = dialogs.value[0].id;
  }

  const activeDialog = computed(() =>
    dialogs.value.find(d => d.id === activeDialogId.value) || null
  );

  const groupedDialogs = computed(() => {
    const groups: Record<string, Dialog[]> = {};

    const sortedDialogs = [...dialogs.value].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    sortedDialogs.forEach(dialog => {
      const date = new Date(dialog.createdAt);
      const dateKey = date.toDateString();

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(dialog);
    });

    return groups;
  });

  function createDialog(): Dialog {
    const dialog: Dialog = {
      id: Date.now().toString(),
      title: 'Новый диалог',
      messages: [],
      createdAt: new Date(),
    };
    dialogs.value.unshift(dialog);
    activeDialogId.value = dialog.id;
    return dialog;
  }

  function renameDialog(dialogId: string, newTitle: string) {
    const dialog = dialogs.value.find(d => d.id === dialogId);
    if (dialog) {
      dialog.title = newTitle;
      triggerReactivity();
    }
  }

  function sendMessage(content: string, dialogId: string) {
    const dialog = dialogs.value.find(d => d.id === dialogId);
    if (!dialog) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      dialogId,
      content,
      isUser: true,
      timestamp: new Date(),
    };

    dialog.messages.push(userMessage);
    dialog.lastMessage = userMessage;

    // Обновляем заголовок диалога по первому сообщению
    if (dialog.messages.filter(m => m.isUser).length === 1) {
      dialog.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
    }

    triggerReactivity();

    // Запрашиваем ответ от нейросети
    generateAIResponse(dialogId);
  }

  function regenerateMessage(messageId: string) {
    const dialog = dialogs.value.find(d => d.id === activeDialogId.value);
    if (!dialog) return;

    const botMessageIndex = dialog.messages.findIndex(m => m.id === messageId);
    if (botMessageIndex === -1 || dialog.messages[botMessageIndex].isUser) return;

    let lastUserMessageIndex = botMessageIndex - 1;
    while (lastUserMessageIndex >= 0 && !dialog.messages[lastUserMessageIndex].isUser) {
      lastUserMessageIndex--;
    }

    if (lastUserMessageIndex < 0) return;

    // Удаляем текущий ответ бота
    dialog.messages.splice(botMessageIndex, 1);
    triggerReactivity();

    // Генерируем новый ответ
    generateAIResponse(dialog.id);
  }

  function buildMessagesArray(dialog: Dialog): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Добавляем системный промпт
    messages.push({
      role: 'system',
      content: 'Ты полезный AI-ассистент Bubble AI. Отвечай на русском языке, если пользователь не просит иначе.',
    });

    // Добавляем историю сообщений
    for (const msg of dialog.messages) {
      if (msg.isUser) {
        messages.push({ role: 'user', content: msg.content });
      } else {
        messages.push({ role: 'assistant', content: msg.content });
      }
    }

    return messages;
  }

  async function generateAIResponse(dialogId: string) {
    const dialog = dialogs.value.find(d => d.id === dialogId);
    if (!dialog) return;

    isWaitingForResponse.value = true;
    isGenerating.value = true; // Сразу ставим true, чтобы чанки не игнорировались

    // Создаем AbortController для возможности остановки
    abortController = new AbortController();

    // Строим массив сообщений для API
    const messages = buildMessagesArray(dialog);

    let botMessage: Message | null = null;
    let hasReceivedContent = false;

    // Отправляем запрос
    await streamChatCompletion(
      messages,
      selectedModel.value,
      temperature.value,
      // onChunk
      (content: string) => {
        // Создаем сообщение только при первом чанке
        if (!hasReceivedContent) {
          hasReceivedContent = true;
          isWaitingForResponse.value = false;

          botMessage = {
            id: (Date.now() + 1).toString(),
            dialogId,
            content: content,
            isUser: false,
            timestamp: new Date(),
          };

          dialog.messages.push(botMessage);
          triggerReactivity();
          return;
        }

        // Добавляем контент к существующему сообщению
        if (botMessage) {
          const messageIndex = dialog.messages.findIndex(m => m.id === botMessage!.id);
          if (messageIndex !== -1) {
            dialog.messages[messageIndex] = {
              ...dialog.messages[messageIndex],
              content: dialog.messages[messageIndex].content + content,
              timestamp: new Date(dialog.messages[messageIndex].timestamp),
            };
            triggerReactivity();
          }
        }
      },
      // onError
      (error: string) => {
        console.error('AI response error:', error);

        // Если сообщение еще не создано, создаем с ошибкой
        if (!hasReceivedContent) {
          isWaitingForResponse.value = false;
          isGenerating.value = false;

          botMessage = {
            id: (Date.now() + 1).toString(),
            dialogId,
            content: `❌ ${error}`,
            isUser: false,
            timestamp: new Date(),
          };

          dialog.messages.push(botMessage);
          triggerReactivity();
          return;
        }

        // Добавляем ошибку к существующему сообщению
        if (botMessage) {
          const messageIndex = dialog.messages.findIndex(m => m.id === botMessage!.id);
          if (messageIndex !== -1) {
            dialog.messages[messageIndex] = {
              ...dialog.messages[messageIndex],
              content: dialog.messages[messageIndex].content + `\n\n❌ ${error}`,
              timestamp: new Date(dialog.messages[messageIndex].timestamp),
            };
            triggerReactivity();
          }
        }
      },
      // onComplete
      () => {
        if (botMessage) {
          dialog.lastMessage = dialog.messages[dialog.messages.length - 1];
        }
        isGenerating.value = false;
        isWaitingForResponse.value = false;
        abortController = null;
        triggerReactivity();
      },
      abortController.signal,
    );
  }

  function stopGeneration() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    isGenerating.value = false;
    isWaitingForResponse.value = false;
  }

  function editMessage(messageId: string, newContent: string) {
    for (const dialog of dialogs.value) {
      const messageIndex = dialog.messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1 && dialog.messages[messageIndex].isUser) {
        dialog.messages[messageIndex] = {
          ...dialog.messages[messageIndex],
          content: newContent,
          edited: true,
          timestamp: new Date(dialog.messages[messageIndex].timestamp),
        };

        // Удаляем все последующие сообщения и генерируем новый ответ
        if (messageIndex < dialog.messages.length - 1) {
          dialog.messages.splice(messageIndex + 1);
          triggerReactivity();
          generateAIResponse(dialog.id);
        }
        break;
      }
    }
    triggerReactivity();
  }

  function deleteDialog(dialogId: string) {
    const index = dialogs.value.findIndex(d => d.id === dialogId);
    if (index !== -1) {
      dialogs.value.splice(index, 1);
      if (activeDialogId.value === dialogId) {
        activeDialogId.value = dialogs.value[0]?.id || null;
      }
    }
  }

  function clearAllDialogs() {
    dialogs.value = [];
    activeDialogId.value = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(`${STORAGE_KEY}-active`);
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  }

  function updateSettings(settings: { selectedModel: string; temperature: number }) {
    selectedModel.value = settings.selectedModel;
    temperature.value = settings.temperature;
    localStorage.setItem(`${STORAGE_KEY}-settings`, JSON.stringify(settings));
  }

  function triggerReactivity() {
    dialogs.value = [...dialogs.value];
  }

  return {
    dialogs,
    activeDialogId,
    activeDialog,
    groupedDialogs,
    isGenerating,
    isWaitingForResponse,
    showFullscreenGraph,
    createDialog,
    sendMessage,
    regenerateMessage,
    editMessage,
    deleteDialog,
    clearAllDialogs,
    stopGeneration,
    renameDialog,
    updateSettings,
    temperature,
    selectedModel,
  };
});