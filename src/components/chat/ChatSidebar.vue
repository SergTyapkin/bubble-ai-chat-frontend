<template>
  <div class="chat-sidebar">
    <div class="chat-sidebar__header">
      <div class="chat-sidebar__logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="12" cy="14" r="4" fill="white" opacity="0.3"/>
          <circle cx="20" cy="14" r="3" fill="white" opacity="0.2"/>
          <circle cx="10" cy="20" r="2" fill="white" opacity="0.25"/>
        </svg>
        <span class="chat-sidebar__title">Bubble AI</span>
      </div>
      <button class="chat-sidebar__new-chat" @click="store.createDialog()">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- Пустое состояние -->
    <div v-if="!store.dialogs.length" class="chat-sidebar__empty">
      <div class="chat-sidebar__empty-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
          <path d="M24 16V32M16 24H32" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
        </svg>
      </div>
      <p class="chat-sidebar__empty-text">Нет активных диалогов</p>
      <p class="chat-sidebar__empty-hint">Создайте новый диалог, чтобы начать общение</p>
    </div>

    <!-- Список диалогов -->
    <div v-else class="chat-sidebar__dialogs">
      <div 
        v-for="group in groupedDialogsList" 
        :key="group.dateKey"
        class="chat-sidebar__group"
      >
        <div class="chat-sidebar__group-title">{{ group.label }}</div>
        
        <div
          v-for="(dialog, i) in group.dialogs"
          :key="dialog.id"
          class="chat-sidebar__dialog"
          :class="{ 'chat-sidebar__dialog--active': dialog.id === store.activeDialogId }"
          @click="store.activeDialogId = dialog.id"
          :style="{'--animation-index': i}"
        >
          <div class="chat-sidebar__dialog-content">
            <div class="chat-sidebar__dialog-title">
              {{ dialog.title || 'Новый диалог' }}
            </div>
            <div class="chat-sidebar__dialog-preview">
              {{ dialog.lastMessage?.content || 'Пустой диалог' }}
            </div>
          </div>
          <button 
            class="chat-sidebar__dialog-delete"
            @click.stop="store.deleteDialog(dialog.id)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useChatStore } from '~/stores/chatStore';
import { dateFormatter } from '~/utils/utils';

export default defineComponent({
  setup() {
    const store = useChatStore();
    
    // Преобразуем объект групп в массив для корректного v-for
    const groupedDialogsList = computed(() => {
      const groups = store.groupedDialogs;
      const result: Array<{ dateKey: string; label: string; dialogs: typeof groups[string] }> = [];
      
      // Сортируем ключи по дате (сначала новые)
      const sortedKeys = Object.keys(groups).sort((a, b) => {
        const dateA = parseDateString(a);
        const dateB = parseDateString(b);
        return dateB.getTime() - dateA.getTime();
      });
      
      for (const key of sortedKeys) {
        result.push({
          dateKey: key,
          label: formatDateLabel(key),
          dialogs: groups[key],
        });
      }
      
      return result;
    });
    
    // Парсим дату из строки локализованного формата
    function parseDateString(dateStr: string): Date {
      // Пробуем стандартный парсинг
      const date = new Date(dateStr);
      
      // Если невалидная дата, пробуем распарсить русский формат
      if (isNaN(date.getTime())) {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }
      
      return date;
    }
    
    // Форматируем заголовок группы с учётом сегодня/вчера
    function formatDateLabel(dateStr: string): string {
      const date = parseDateString(dateStr);
      
      if (isNaN(date.getTime())) return dateStr;
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Сравниваем только даты без времени
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      
      if (dateOnly.getTime() === todayOnly.getTime()) return 'Сегодня';
      if (dateOnly.getTime() === yesterdayOnly.getTime()) return 'Вчера';
      
      // Используем существующую утилиту из проекта
      return dateFormatter(date, 'long');
    }
    
    return { 
      store, 
      groupedDialogsList,
    };
  },
});
</script>

<style lang="stylus" scoped>
@import '../../styles/constants.styl'
@import '../../styles/fonts.styl'
@import '../../styles/utils.styl'
@import '../../styles/animations.styl'

.chat-sidebar
  display flex
  flex-direction column
  height 100%
  background darken(colorBg, 3%)
  animation-float(0.5s, -30px, 0, left)
  
  &__header
    display flex
    align-items center
    justify-content space-between
    padding 20px
    // Граница снизу, но не до краев
    background linear-gradient(0deg, colorBorder 1px, transparent 1px) 50% 50% / 90% 100% no-repeat
    
  &__logo
    display flex
    align-items center
    gap 12px
    
  &__title
    font-large()
    font-bold()
    color colorText1
    
  &__new-chat
    button-no-styles()
    color colorEmp2
    padding 8px
    border-radius radiusS
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
    
  &__dialog
    display flex
    align-items center
    padding 12px 20px
    cursor pointer
    animation-float(0.5s, -20px, 0, left)
    trans()
    
    &:hover
      background rgba(255, 255, 255, 0.03)
      
    &--active
      background rgba(colorEmp2, 0.1)
      border-left 3px solid colorEmp2
      
  &__dialog-content
    flex 1
    min-width 0
    
  &__dialog-title
    font-small()
    font-semibold()
    color colorText1
    margin-bottom 4px
    max-lines(1)
    
  &__dialog-preview
    font-small-extra()
    color colorText3
    max-lines(1)
    
  &__dialog-delete
    button-no-styles()
    color colorText4
    padding 4px
    border-radius radiusS
    opacity 0
    trans()
    
  &__dialog:hover &__dialog-delete
    opacity 1
    
  &__dialog-delete:hover
    color colorError
    background rgba(colorError, 0.1)
</style>