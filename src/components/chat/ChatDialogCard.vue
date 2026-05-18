<template>
  <div 
    class="chat-dialog-card"
    :class="{ 'chat-dialog-card--active': isActive }"
    @click="$emit('click')"
  >
    <div class="chat-dialog-card__icon">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path 
          d="M2 4C2 2.89543 2.89543 2 4 2H16C17.1046 2 18 2.89543 18 4V13C18 14.1046 17.1046 15 16 15H6L2 18V4Z" 
          fill="currentColor" 
          opacity="0.15"
        />
        <path 
          d="M2 4C2 2.89543 2.89543 2 4 2H16C17.1046 2 18 2.89543 18 4V13C18 14.1046 17.1046 15 16 15H6L2 18V4Z" 
          stroke="currentColor" 
          stroke-width="1.5" 
          fill="none"
        />
      </svg>
    </div>
    
    <div class="chat-dialog-card__content">
      <!-- Режим редактирования -->
      <input
        v-if="isEditing"
        ref="titleInput"
        v-model="editTitle"
        class="chat-dialog-card__title-input"
        @click.stop
        @keydown.enter.prevent="saveTitle"
        @keydown.escape.prevent="cancelEdit"
        @blur="saveTitle"
      />
      <!-- Обычный режим -->
      <div 
        v-else 
        class="chat-dialog-card__title"
        @dblclick.stop="startEdit"
      >
        {{ dialog.title || 'Новый диалог' }}
      </div>
      
      <div class="chat-dialog-card__meta">
        <span class="chat-dialog-card__date">
          {{ formatDate(dialog.lastMessage?.timestamp || dialog.createdAt) }}
        </span>
        <span class="chat-dialog-card__count">
          {{ dialog.messages.length }} сообщ.
        </span>
      </div>
    </div>
    
    <div class="chat-dialog-card__actions">
      <button 
        v-if="!isEditing"
        class="chat-dialog-card__edit"
        @click.stop="startEdit"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M10 1L13 4L5 12H2V9L10 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      </button>
      
      <button 
        class="chat-dialog-card__delete"
        @click.stop="$emit('delete')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, nextTick, type PropType } from 'vue';
import type { Dialog } from '~/stores/chatStore';
import { dateTimeFormatter } from '~/utils/utils';

export default defineComponent({
  props: {
    dialog: {
      type: Object as PropType<Dialog>,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click', 'delete', 'rename'],
  setup(props, { emit }) {
    const isEditing = ref(false);
    const editTitle = ref('');
    const titleInput = ref<HTMLInputElement>();

    function formatDate(date: Date): string {
      return dateTimeFormatter(date, 'short', 'short');
    }

    function startEdit() {
      editTitle.value = props.dialog.title || '';
      isEditing.value = true;
      
      nextTick(() => {
        titleInput.value?.focus();
        titleInput.value?.select();
      });
    }

    function saveTitle() {
      if (isEditing.value && editTitle.value.trim()) {
        emit('rename', props.dialog.id, editTitle.value.trim());
      }
      isEditing.value = false;
    }

    function cancelEdit() {
      isEditing.value = false;
    }

    return { 
      isEditing,
      editTitle,
      titleInput,
      formatDate,
      startEdit,
      saveTitle,
      cancelEdit,
    };
  },
});
</script>

<style lang="stylus" scoped>
@import '../../styles/constants.styl'
@import '../../styles/fonts.styl'
@import '../../styles/utils.styl'

.chat-dialog-card
  display flex
  align-items center
  gap 12px
  padding-block 10px
  padding-right 10px
  padding-left 20px
  cursor pointer
  trans()
  position relative
  
  &:hover
    background rgba(white, 0.03)
    
  &--active
    background rgba(colorEmp2, 0.1)
    border-left 3px solid colorEmp2
    
  &__icon
    color colorText3
    flex-shrink 0
    opacity 0.6
    
  &--active &__icon
    color colorEmp2
    opacity 0.8
    
  &__content
    flex 1
    min-width 0
    
  &__title
    font-small()
    font-semibold()
    color colorText1
    margin-bottom 4px
    padding-block 1px
    max-lines(1)
    
  &__title-input
    input-no-styles()
    font-small()
    font-semibold()
    color colorText1
    margin-bottom 4px
    margin-left -4px
    width 100%
    padding 0px 4px
    border-radius radiusS
    background rgba(white, 0.05)
    border 1px solid colorEmp2
    
  &__meta
    display flex
    align-items center
    gap 8px
    
  &__date
    font-small-extra()
    color colorText4
    
  &__count
    font-small-extra()
    color colorText5
    
    &::before
      content '•'
      margin-right 8px
      color colorText5
      
  &__actions
    display flex
    align-items center
    gap 4px
    
  &__edit
    button-no-styles()
    color colorText4
    padding 4px
    opacity 0
    border-radius radiusMax
    svg-inside()
    trans()
    
  &__delete
    button-no-styles()
    color colorText4
    padding 4px
    opacity 0
    border-radius radiusMax
    svg-inside()
    trans()
    
  &:hover &__edit,
  &:hover &__delete
    opacity 1
    
  &__edit:hover
    color colorEmp2
    background rgba(colorEmp2, 0.1)
    
  &__delete:hover
    color colorError
    background rgba(colorError, 0.1)
</style>