<template>
  <div 
    class="chat-message"
    :class="{ 
      'chat-message--user': message.isUser,
      'chat-message--bot': !message.isUser 
    }"
    :data-message-id="message.id"
  >
    <div class="chat-message__bubble">
      <div class="chat-message__content">
        <span v-if="editing && message.isUser">
          <textarea
            v-model="editText"
            class="chat-message__edit-input"
            @keydown.enter.prevent="saveEdit"
            @keydown.escape="cancelEdit"
            rows="2"
          ></textarea>
          <div class="chat-message__edit-actions">
            <button @click="saveEdit">Сохранить</button>
            <button @click="cancelEdit">Отмена</button>
          </div>
        </span>
        <span v-else>{{ message.content }}</span>
      </div>
      
      <div class="chat-message__meta">
        <span class="chat-message__time">{{ formatTime(message.timestamp) }}</span>
        <span v-if="message.edited" class="chat-message__edited">изменено</span>
      </div>
    </div>
    
    <button 
      v-if="message.isUser && !editing"
      class="chat-message__edit-btn"
      @click="startEdit"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M10 1L13 4L5 12H2V9L10 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, type PropType } from 'vue';
import type { Message } from '~/stores/chatStore';

export default defineComponent({
  props: {
    message: {
      type: Object as PropType<Message>,
      required: true,
    },
  },
  emits: ['edit'],
  setup(props, { emit }) {
    const editing = ref(false);
    const editText = ref('');

    function startEdit() {
      editing.value = true;
      editText.value = props.message.content;
    }

    function saveEdit() {
      if (editText.value.trim()) {
        emit('edit', props.message.id, editText.value.trim());
      }
      editing.value = false;
    }

    function cancelEdit() {
      editing.value = false;
      editText.value = '';
    }

    function formatTime(date: Date): string {
      return new Date(date).toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    return { editing, editText, startEdit, saveEdit, cancelEdit, formatTime };
  },
});
</script>

<style lang="stylus" scoped>
@import '../../styles/constants.styl'
@import '../../styles/components.styl'
@import '../../styles/buttons.styl'
@import '../../styles/fonts.styl'
@import '../../styles/utils.styl'
@import '../../styles/scrollbars.styl'

.chat-message
  display flex
  align-items flex-start
  gap 8px
  padding-block 8px
  border-radius radiusM
  
  &--user
    justify-content flex-end
    
    .chat-message__bubble
      background mix(colorBg, colorEmp2, 85%)
      border 1px solid mix(colorBg, colorEmp2, 70%)
      
  &--bot
    justify-content flex-start
    
    .chat-message__bubble
      background mix(colorBg, white, 95%)
      border 1px solid mix(colorBg, white, 92%)
      
  &__bubble
    max-width 70%
    padding 12px 16px
    border-radius radiusM
    position relative
    
  &__content
    font-small()
    line-height 1.5
    color colorText1
    white-space pre-wrap
    word-break break-word
    
  &__meta
    display flex
    align-items center
    gap 8px
    margin-top 6px
    
  &__time
    font-small-extra()
    color colorText4
    
  &__edited
    font-small-extra()
    color colorText5
    font-style italic
    
  &__edit-btn
    button-no-styles()
    color colorText4
    padding 4px
    border-radius radiusS
    opacity 0
    trans()
    
    &:hover
      color colorEmp2
      background rgba(colorEmp2, 0.1)
      
  &:hover &__edit-btn
    opacity 1
    
  &__edit-input
    input-no-styles()
    width 100%
    font-small()
    color colorText1
    padding 8px
    border-radius radiusS
    background rgba(white, 0.05)
    resize vertical
    
  &__edit-actions
    display flex
    gap 8px
    margin-top 8px
    
    button
      button()
      font-small-extra()
      padding 4px 12px

    
  &--highlighted
    animation highlight-message-block 3s cubic-bezier(0.33, 0.03, 0.14, 0.99)
    @keyframes highlight-message-block
      0%
        background colorBlockBgEmp2
      100%
        background rgba(colorBlockBgEmp2, 0)

    .chat-message__bubble
      animation highlight-message 3s cubic-bezier(0.33, 0.03, 0.14, 0.99)
  
      @keyframes highlight-message
        0%
          box-shadow 0 0 20px rgba(colorEmp2, 0.5)
          transform scale(1.02)
        100%
          box-shadow 0 0 0 rgba(colorEmp2, 0)
          transform scale(1)
</style>