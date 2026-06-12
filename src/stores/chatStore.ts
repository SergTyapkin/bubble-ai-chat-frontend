// src/stores/chatStore.ts
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { NEURO_SYSTEM_SETTING_PROMPT } from '~/constants';
import { streamChatCompletion } from '~/utils/openRouter';

export interface Message {
  id: string;
  dialogId: string;
  branchId: string;
  parentBranchId?: string; // ID родительской ветки (если это ответвление)
  content: string;
  isUser: boolean;
  timestamp: Date;
  edited?: boolean;
}

export interface Branch {
  id: string;
  parentMessageId: string; // ID сообщения нейронки, от которого ответвились
  messages: Message[];
  createdAt: Date;
}

export interface Dialog {
  id: string;
  title: string;
  branches: Branch[];
  activeBranchId: string;
  createdAt: Date;
}

const STORAGE_KEY = 'bubble-ai-chat';


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
    localStorage.setItem(STORAGE_KEY, serializeDialogs(dialogs));
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

  const savedSettings = localStorage.getItem(`${STORAGE_KEY}-settings`);
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      selectedModel.value = settings.selectedModel || selectedModel.value;
      temperature.value = settings.temperature ?? temperature.value;
    } catch (e) {}
  }

  watch(dialogs, (newDialogs) => saveToStorage(newDialogs), { deep: true });
  watch(activeDialogId, (newId) => {
    try { localStorage.setItem(`${STORAGE_KEY}-active`, newId || ''); } catch (e) {}
  });

  const savedActiveId = localStorage.getItem(`${STORAGE_KEY}-active`);
  if (savedActiveId && dialogs.value.some(d => d.id === savedActiveId)) {
    activeDialogId.value = savedActiveId;
  } else if (dialogs.value.length > 0) {
    activeDialogId.value = dialogs.value[0].id;
  }

  const activeDialog = computed(() =>
    dialogs.value.find(d => d.id === activeDialogId.value) || null
  );

  // Активная ветка диалога
  const activeBranch = computed(() => {
    if (!activeDialog.value) return null;
    return activeDialog.value.branches.find(b => b.id === activeDialog.value!.activeBranchId) || null;
  });

  // Все сообщения активной ветки
  const activeMessages = computed(() => {
    return activeBranch.value?.messages || [];
  });

  // Все ветки диалога для графа
  const allBranchesForGraph = computed(() => {
    if (!activeDialog.value) return [];
    return activeDialog.value.branches;
  });

  // Сообщения всех веток для графа
  const allMessagesForGraph = computed(() => {
    if (!activeDialog.value) return [];
    const messages: (Message & { branchId: string; isActiveBranch: boolean })[] = [];
    
    for (const branch of activeDialog.value.branches) {
      for (const msg of branch.messages) {
        messages.push({
          ...msg,
          branchId: branch.id,
          isActiveBranch: branch.id === activeDialog.value!.activeBranchId,
        });
      }
    }
    
    return messages;
  });

  const groupedDialogs = computed(() => {
    const groups: Record<string, Dialog[]> = {};
    const sortedDialogs = [...dialogs.value].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    sortedDialogs.forEach(dialog => {
      const date = new Date(dialog.createdAt);
      const dateKey = date.toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(dialog);
    });
    return groups;
  });

  function createDialog(): Dialog {
    const branchId = 'branch-' + Date.now().toString();
    const dialog: Dialog = {
      id: Date.now().toString(),
      title: 'Новый диалог',
      branches: [{
        id: branchId,
        parentMessageId: '',
        messages: [],
        createdAt: new Date(),
      }],
      activeBranchId: branchId,
      createdAt: new Date(),
    };
    dialogs.value.unshift(dialog);
    activeDialogId.value = dialog.id;
    return dialog;
  }

  // Создать новую ветку от сообщения нейронки
  function createBranch(fromMessageId: string) {
    const dialog = activeDialog.value;
    if (!dialog) return;

    // Находим сообщение, от которого ответвляемся
    let sourceMessage: Message | null = null;
    let sourceBranch: Branch | null = null;
    let messageIndex = -1;

    for (const branch of dialog.branches) {
      const idx = branch.messages.findIndex(m => m.id === fromMessageId);
      if (idx !== -1 && !branch.messages[idx].isUser) {
        sourceMessage = branch.messages[idx];
        sourceBranch = branch;
        messageIndex = idx;
        break;
      }
    }

    if (!sourceMessage || !sourceBranch) return;

    // Создаем новую ветку с историей до точки ответвления
    const newBranchId = 'branch-' + Date.now().toString();
    const historyMessages = sourceBranch.messages.slice(0, messageIndex + 1).map(m => ({
      ...m,
      branchId: newBranchId,
    }));

    const newBranch: Branch = {
      id: newBranchId,
      parentMessageId: fromMessageId,
      messages: historyMessages,
      createdAt: new Date(),
    };

    dialog.branches.push(newBranch);
    dialog.activeBranchId = newBranchId;
    triggerReactivity();
  }

  // Переключиться на другую ветку
  function switchBranch(branchId: string) {
    const dialog = activeDialog.value;
    if (!dialog) return;
    if (dialog.branches.some(b => b.id === branchId)) {
      dialog.activeBranchId = branchId;
      triggerReactivity();
    }
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

    const branch = dialog.branches.find(b => b.id === dialog.activeBranchId);
    if (!branch) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      dialogId,
      branchId: branch.id,
      content,
      isUser: true,
      timestamp: new Date(),
    };

    branch.messages.push(userMessage);

    if (branch.messages.filter(m => m.isUser).length === 1) {
      dialog.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
    }

    triggerReactivity();
    generateAIResponse(dialogId);
  }

  function regenerateMessage(messageId: string) {
    const dialog = activeDialog.value;
    if (!dialog) return;
    const branch = dialog.branches.find(b => b.id === dialog.activeBranchId);
    if (!branch) return;

    const botMessageIndex = branch.messages.findIndex(m => m.id === messageId);
    if (botMessageIndex === -1 || branch.messages[botMessageIndex].isUser) return;

    branch.messages.splice(botMessageIndex, 1);
    triggerReactivity();
    generateAIResponse(dialog.id);
  }

  function buildMessagesArray(dialog: Dialog): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const branch = dialog.branches.find(b => b.id === dialog.activeBranchId);
    if (!branch) return [];

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    messages.push({
      role: 'system',
      content: NEURO_SYSTEM_SETTING_PROMPT,
    });

    for (const msg of branch.messages) {
      if (msg.isUser) {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.content) {
        messages.push({ role: 'assistant', content: msg.content });
      }
    }

    return messages;
  }

  async function generateAIResponse(dialogId: string) {
    const dialog = dialogs.value.find(d => d.id === dialogId);
    if (!dialog) return;

    const branch = dialog.branches.find(b => b.id === dialog.activeBranchId);
    if (!branch) return;

    isWaitingForResponse.value = true;
    isGenerating.value = true;
    abortController = new AbortController();

    const messages = buildMessagesArray(dialog);
    let botMessage: Message | null = null;
    let hasReceivedContent = false;

    await streamChatCompletion(
      messages,
      selectedModel.value,
      temperature.value,
      (content: string) => {
        if (!hasReceivedContent) {
          hasReceivedContent = true;
          isWaitingForResponse.value = false;

          botMessage = {
            id: (Date.now() + 1).toString(),
            dialogId,
            branchId: branch.id,
            content: content,
            isUser: false,
            timestamp: new Date(),
          };

          branch.messages.push(botMessage);
          triggerReactivity();
          return;
        }

        if (botMessage) {
          const messageIndex = branch.messages.findIndex(m => m.id === botMessage!.id);
          if (messageIndex !== -1) {
            branch.messages[messageIndex] = {
              ...branch.messages[messageIndex],
              content: branch.messages[messageIndex].content + content,
              timestamp: new Date(branch.messages[messageIndex].timestamp),
            };
            triggerReactivity();
          }
        }
      },
      (error: string) => {
        console.error('AI response error:', error);
        if (!hasReceivedContent) {
          isWaitingForResponse.value = false;
          isGenerating.value = false;
          botMessage = {
            id: (Date.now() + 1).toString(),
            dialogId,
            branchId: branch.id,
            content: `❌ ${error}`,
            isUser: false,
            timestamp: new Date(),
          };
          branch.messages.push(botMessage);
          triggerReactivity();
          return;
        }
        if (botMessage) {
          const messageIndex = branch.messages.findIndex(m => m.id === botMessage!.id);
          if (messageIndex !== -1) {
            branch.messages[messageIndex] = {
              ...branch.messages[messageIndex],
              content: branch.messages[messageIndex].content + `\n\n❌ ${error}`,
              timestamp: new Date(branch.messages[messageIndex].timestamp),
            };
            triggerReactivity();
          }
        }
      },
      () => {
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
      for (const branch of dialog.branches) {
        const messageIndex = branch.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1 && branch.messages[messageIndex].isUser) {
          branch.messages[messageIndex] = {
            ...branch.messages[messageIndex],
            content: newContent,
            edited: true,
            timestamp: new Date(branch.messages[messageIndex].timestamp),
          };
          if (messageIndex < branch.messages.length - 1) {
            branch.messages.splice(messageIndex + 1);
          }
          triggerReactivity();
          generateAIResponse(dialog.id);
          break;
        }
      }
    }
  }

  function deleteMessage(messageId: string) {
    for (const dialog of dialogs.value) {
      for (const branch of dialog.branches) {
        const messageIndex = branch.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          branch.messages.splice(messageIndex, 1);
          triggerReactivity();
          break;
        }
      }
    }
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
    } catch (e) {}
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
    activeBranch,
    activeMessages,
    allBranchesForGraph,
    allMessagesForGraph,
    groupedDialogs,
    isGenerating,
    isWaitingForResponse,
    showFullscreenGraph,
    createDialog,
    sendMessage,
    regenerateMessage,
    editMessage,
    deleteMessage,
    deleteDialog,
    clearAllDialogs,
    stopGeneration,
    renameDialog,
    updateSettings,
    createBranch,
    switchBranch,
    temperature,
    selectedModel,
  };
});