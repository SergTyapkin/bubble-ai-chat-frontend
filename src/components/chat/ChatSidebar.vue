<template>
  <div class="chat-sidebar">
    <!-- Переключение между диалогами и настройками -->
    <template v-if="!showSettings">
      <!-- Header -->
      <div class="chat-sidebar__header">
        <div class="chat-sidebar__logo-container">
          <img src="/static/icons/logo.svg" alt="logo" class="chat-sidebar__logo" />

          <span class="chat-sidebar__title">Bubble AI</span>
        </div>
        <button class="chat-sidebar__new-chat" @click="store.createDialog()">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>

        <!-- Кнопка закрытия для мобильной версии -->
        <button class="chat-sidebar__close-btn" @click="$emit('close')">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- Поиск -->
      <ChatSearch v-if="store.dialogs.length" v-model="searchQuery" />

      <!-- Пустое состояние -->
      <div v-if="!store.dialogs.length" class="chat-sidebar__empty">
        <p class="chat-sidebar__empty-text">Нет активных диалогов</p>
        <p class="chat-sidebar__empty-hint">Создайте новый диалог, чтобы начать общение</p>
      </div>

      <!-- Список диалогов -->
      <div v-else class="chat-sidebar__dialogs">
        <div v-for="group in filteredGroupedDialogs" :key="group.dateKey" class="chat-sidebar__group">
          <div class="chat-sidebar__group-title">{{ group.label }}</div>

          <ChatDialogCard v-for="dialog in group.dialogs" :key="dialog.id" :dialog="dialog"
            :is-active="dialog.id === store.activeDialogId" @click="store.activeDialogId = dialog.id"
            @delete="store.deleteDialog(dialog.id)" @rename="handleRenameDialog" />
        </div>
      </div>
    </template>

    <ChatSettings v-else @close="showSettings = false" />

    <!-- Нижняя панель -->
    <ChatSidebarFooter @open-settings="showSettings = true" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useChatStore } from '~/stores/chatStore';
import { dateFormatter } from '~/utils/utils';
import ChatSearch from './ChatSearch.vue';
import ChatDialogCard from './ChatDialogCard.vue';
import ChatSidebarFooter from './ChatSidebarFooter.vue';
import ChatSettings from './ChatSettings.vue';

export default defineComponent({
  emits: ['close'],
  components: {
    ChatSearch,
    ChatDialogCard,
    ChatSidebarFooter,
    ChatSettings,
  },
  setup() {
    const store = useChatStore();
    const searchQuery = ref('');
    const showSettings = ref(false);

    // Преобразуем объект групп в массив для корректного v-for
    const groupedDialogsList = computed(() => {
      const groups = store.groupedDialogs;
      const result: Array<{ dateKey: string; label: string; dialogs: typeof groups[string] }> = [];

      const sortedKeys = Object.keys(groups).sort((a, b) => {
        const dateA = parseDateString(a);
        const dateB = parseDateString(b);
        return dateB.getTime() - dateA.getTime();
      });

      for (const key of sortedKeys) {
        result.push({
          dateKey: key,
          label: dateFormatter(new Date(key)),
          dialogs: groups[key],
        });
      }

      return result;
    });

    // Фильтруем диалоги по поисковому запросу
    const filteredGroupedDialogs = computed(() => {
      if (!searchQuery.value.trim()) {
        return groupedDialogsList.value;
      }

      const query = searchQuery.value.toLowerCase().trim();

      return groupedDialogsList.value
        .map(group => ({
          ...group,
          dialogs: group.dialogs.filter(dialog =>
            dialog.title.toLowerCase().includes(query) ||
            dialog.messages.some(msg => msg.content.toLowerCase().includes(query))
          )
        }))
        .filter(group => group.dialogs.length > 0);
    });

    function parseDateString(dateStr: string): Date {
      const date = new Date(dateStr);

      if (isNaN(date.getTime())) {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }

      return date;
    }

    function handleRenameDialog(dialogId: string, newTitle: string) {
      store.renameDialog(dialogId, newTitle);
    }

    return {
      store,
      searchQuery,
      filteredGroupedDialogs,
      handleRenameDialog,
      showSettings,
    };
  },
});
</script>

<style lang="stylus" scoped>
@import '../../styles/constants.styl'
@import '../../styles/fonts.styl'
@import '../../styles/utils.styl'
@import '../../styles/components.styl'
@import '../../styles/animations.styl'

.chat-sidebar
  display flex
  flex-direction column
  height 100%
  background darken(colorBg, 3%)
  animation-float(0.5s, -20px, 0, left)
  
  &__header
    display flex
    align-items center
    justify-content space-between
    padding 20px
    border-not-full()

  &__close-btn
    button-no-styles()
    svg-inside()
  &__close-btn
    color colorText3
    padding 8px
    border-radius radiusMax
    display none
    trans()
    
    &:hover
      color colorText1
      background rgba(white, 0.05)
      
  @media ({mobile})
    &__close-btn
      display flex
    
  &__logo-container
    display flex
    align-items center
    gap 12px
  
  &__logo
    width 30px
    height 30px
    
  &__title
    font-large()
    font-bold()
    color colorText1
    
  &__new-chat
    button-no-styles()
    color colorEmp2
    padding 8px
    border-radius radiusS
    border-radius radiusMax
    svg-inside()
    trans()
    
    &:hover
      background rgba(colorEmp2, 0.1)
      
  &__empty
    flex 1
    display flex
    flex-direction column
    align-items center
    justify-content center
    padding 40px 20px
    text-align center
    
  &__empty-icon
    color colorText4
    margin-bottom 16px
    opacity 0.5
    
  &__empty-text
    font-medium()
    font-semibold()
    color colorText3
    margin-bottom 8px
    
  &__empty-hint
    font-small()
    color colorText5
    max-width 200px
      
  &__dialogs
    flex 1
    overflow-y auto
    padding 10px 0
    scrollable()
    
  &__group
    margin-bottom 20px
    
  &__group-title
    padding 8px 20px
    font-small-extra()
    font-bold()
    color colorText4
    text-transform uppercase
    letter-spacing 0.5px
</style>