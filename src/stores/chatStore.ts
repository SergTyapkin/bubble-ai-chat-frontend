// src/stores/chatStore.ts
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

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

    // Триггерим реактивность для глубоких изменений
    triggerReactivity();

    // Симулируем ответ нейросети
    generateAIResponse(dialogId);
  }

  async function generateAIResponse(dialogId: string) {
    isGenerating.value = false;
    isWaitingForResponse.value = true;

    const dialog = dialogs.value.find(d => d.id === dialogId);
    if (!dialog) {
      isWaitingForResponse.value = false;
      return;
    }

    // Имитация задержки перед ответом (как будто сервер думает)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const responseText = getMockAIResponse();
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      dialogId,
      content: '',
      isUser: false,
      timestamp: new Date(),
    };

    dialog.messages.push(botMessage);
    isWaitingForResponse.value = false;
    isGenerating.value = true;
    triggerReactivity();

    // Имитация печати с правильной реактивностью
    for (let i = 0; i < responseText.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));

      // Проверяем, не остановлена ли генерация
      if (!isGenerating.value) {
        // Если остановлена, показываем то, что успели сгенерировать
        break;
      }

      const messageIndex = dialog.messages.findIndex(m => m.id === botMessage.id);
      if (messageIndex !== -1) {
        dialog.messages[messageIndex] = {
          ...dialog.messages[messageIndex],
          content: responseText.slice(0, i + 1),
          timestamp: new Date(dialog.messages[messageIndex].timestamp), // Восстанавливаем Date
        };
      }

      triggerReactivity();
    }

    dialog.lastMessage = dialog.messages[dialog.messages.length - 1];
    isGenerating.value = false;
    triggerReactivity();
  }

  // Добавить новую функцию:
  function stopGeneration() {
    isGenerating.value = false;
    isWaitingForResponse.value = false;
  }

  function editMessage(messageId: string, newContent: string) {
    for (const dialog of dialogs.value) {
      const messageIndex = dialog.messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1 && dialog.messages[messageIndex].isUser) {
        // Создаем новый объект сообщения с обновленным контентом
        dialog.messages[messageIndex] = {
          ...dialog.messages[messageIndex],
          content: newContent,
          edited: true,
          timestamp: new Date(dialog.messages[messageIndex].timestamp), // Восстанавливаем Date
        };
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

  // Вспомогательная функция для триггера реактивности
  function triggerReactivity() {
    // Создаем новую ссылку на массив, чтобы Vue заметил изменения
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

function getMockAIResponse(): string {
  const responses = [
    'Конечно! Я проанализировал ваш запрос и готов предоставить развернутый ответ. Искусственный интеллект работает на основе сложных алгоритмов машинного обучения, которые позволяют обрабатывать и анализировать большие объемы данных.',
    'Отличный вопрос! Давайте рассмотрим эту тему подробнее. Нейронные сети действительно показывают впечатляющие результаты в решении различных задач, от распознавания изображений до обработки естественного языка.',
    'Спасибо за ваш запрос! Я обработал информацию и могу сказать следующее: современные технологии искусственного интеллекта продолжают развиваться быстрыми темпами, открывая новые возможности.',
    'Понимаю ваш интерес к этой теме. Искусственный интеллект действительно становится неотъемлемой частью нашей повседневной жизни, трансформируя то, как мы работаем и общаемся.',
    'Интересный вопрос! Если посмотреть на развитие технологий, то можно заметить, что мы находимся на пороге новой эры, где AI становится все более доступным и полезным инструментом.',
    'Давайте разберемся в этом вопросе. Нейронные сети имитируют работу человеческого мозга, но делают это совершенно иначе, чем мы можем себе представить. Они обрабатывают информацию через слои искусственных нейронов.'
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}