<template>
  <div class="chat-dialog">
    <!-- Заглушка для пустого диалога -->
    <div v-if="!store.activeDialog?.messages.length" class="chat-dialog__empty">
      <div class="chat-dialog__empty-content">
        <div class="chat-dialog__empty-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
            <circle cx="18" cy="18" r="4" fill="currentColor" opacity="0.15">
              <animate attributeName="cy" values="18;14;18" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="30" cy="26" r="3" fill="currentColor" opacity="0.2">
              <animate attributeName="cy" values="26;22;26" dur="2.3s" repeatCount="indefinite"/>
            </circle>
            <path d="M20 34L28 28L20 22V34Z" fill="currentColor" opacity="0.3"/>
          </svg>
        </div>
        <h3 class="chat-dialog__empty-title">Начните общение</h3>
        <p class="chat-dialog__empty-text">
          Отправьте первое сообщение, чтобы начать диалог с Bubble AI
        </p>
      </div>
    </div>

    <!-- Сообщения -->
    <div v-else class="chat-dialog__messages" ref="messagesContainer">
      <TransitionGroup name="message-list" tag="div" class="chat-dialog__messages-inner">
        <ChatMessage
          v-for="message in store.activeDialog?.messages"
          :key="message.id"
          :message="message"
          @edit="handleEditMessage"
        />
      </TransitionGroup>
      
      <div v-if="store.isWaitingForResponse" class="chat-dialog__typing">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>

    <div class="chat-dialog__input">
      <textarea
        v-model="messageText"
        class="chat-dialog__textarea"
        :class="{ 'chat-dialog__textarea--disabled': store.isGenerating || store.isWaitingForResponse }"
        :placeholder="getPlaceholder()"
        rows="1"
        :disabled="store.isGenerating || store.isWaitingForResponse"
        @keydown.enter.prevent="handleSendOrStop"
        @input="autoResize"
      ></textarea>
      
      <ChatBubbleButton 
        :state="buttonState"
        @click="handleSendOrStop" 
        class="chat-dialog__send-button" 
      />

      <div class="chat-dialog__disclaimer">
        Not a really AI. Just test project
      </div>
    </div>

    <ChatHistoryGraph 
      v-if="store.activeDialog?.messages.length"
      :messages="store.activeDialog.messages"
      :is-generating="store.isGenerating"
      @message-click="handleGraphMessageClick"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, nextTick, onMounted } from 'vue';
import { useChatStore } from '~/stores/chatStore';
import ChatMessage from './ChatMessage.vue';
import ChatBubbleButton from './ChatBubbleButton.vue';
import type { BubbleButtonState } from './ChatBubbleButton.vue';
import ChatHistoryGraph from './ChatHistoryGraph.vue';

export default defineComponent({
  components: {
    ChatMessage,
    ChatBubbleButton,
    ChatHistoryGraph,
  },

  setup() {
    const store = useChatStore();
    const messageText = ref('');
    const messagesContainer = ref<HTMLElement>();

    // Определяем состояние кнопки
    const buttonState = computed<BubbleButtonState>(() => {
      if (!messageText.value.trim() && !store.isGenerating && !store.isWaitingForResponse) {
        return 'disabled';
      }
      if (store.isWaitingForResponse) {
        return 'loading';
      }
      if (store.isGenerating) {
        return 'stop';
      }
      return 'send';
    });

    function getPlaceholder(): string {
      if (store.isGenerating) return 'Bubble AI генерирует ответ...';
      if (store.isWaitingForResponse) return 'Ожидание ответа...';
      return 'Введите сообщение...';
    }

    function handleSendOrStop() {
      if (store.isGenerating) {
        // Останавливаем генерацию
        store.stopGeneration();
        return;
      }
      
      if (store.isWaitingForResponse) {
        // Не даем отправить во время ожидания
        return;
      }
      
      if (!messageText.value.trim() || !store.activeDialogId) return;
      
      store.sendMessage(messageText.value.trim(), store.activeDialogId);
      messageText.value = '';
      
      nextTick(() => {
        scrollToBottom();
      });
    }

    function handleEditMessage(messageId: string, newContent: string) {
      store.editMessage(messageId, newContent);
    }

    function autoResize(event: Event) {
      const textarea = event.target as HTMLTextAreaElement;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }

    function scrollToBottom() {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    }

    function handleGraphMessageClick(messageId: string) {
      // Находим сообщение в DOM и скроллим к нему
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Подсветка
        messageElement.classList.add('chat-message--highlighted');
        setTimeout(() => {
          messageElement.classList.remove('chat-message--highlighted');
        }, 2000);
      }
    }

    // Прокрутка при монтировании компонента
    onMounted(() => {
      nextTick(() => {
        scrollToBottom();
      });
    });

    // Прокрутка при смене активного диалога
    watch(() => store.activeDialogId, () => {
      nextTick(() => {
        scrollToBottom();
      });
    });

    // Прокрутка при изменении сообщений (включая постепенную печать)
    watch(
      () => store.activeDialog?.messages.length,
      () => {
        nextTick(() => {
          scrollToBottom();
        });
      }
    );

    // Прокрутка при обновлении контента сообщений (для анимации печати)
    watch(
      () => {
        const messages = store.activeDialog?.messages;
        if (!messages || messages.length === 0) return '';
        const lastMessage = messages[messages.length - 1];
        return lastMessage.content;
      },
      () => {
        nextTick(() => {
          scrollToBottom();
        });
      }
    );

    return {
      store,
      messageText,
      messagesContainer,
      buttonState,
      getPlaceholder,
      handleSendOrStop,
      handleEditMessage,
      autoResize,
      handleGraphMessageClick,
    };
  },
});
</script>

<style lang="stylus" scoped>
@import '../../styles/constants.styl'
@import '../../styles/components.styl'
@import '../../styles/buttons.styl'
@import '../../styles/fonts.styl'
@import '../../styles/utils.styl'
@import '../../styles/animations.styl'
@import '../../styles/scrollbars.styl'

.chat-dialog
  display flex
  flex-direction column
  align-items center
  height 100%
  position relative
  
  &__empty
    flex 1
    display flex
    align-items center
    justify-content center
    width 100%
    padding 40px 20px
    
  &__empty-content
    text-align center
    animation-float(0.6s, 0, -20px)
    
  &__empty-icon
    color colorEmp2
    opacity 0.3
    margin-bottom 20px
    
  &__empty-title
    font-large()
    font-bold()
    color colorText1
    margin-bottom 8px
    
  &__empty-text
    font-small()
    color colorText3
    max-width 300px
    line-height 1.5
    
  marginH = 12.5px
  &__messages
    flex 1
    width 100%
    max-width 800px
    overflow-y auto
    margin 0
    padding 20px marginH
    padding-right chatHistoryWidth
    scrollable()
    display flex
    flex-direction column
    
    // Для малого количества сообщений - выравниваем снизу
    &:not(.chat-dialog__messages--scrollable)
      justify-content flex-end
      
  &__messages-inner
    // Контейнер для TransitionGroup
    display flex
    flex-direction column
    width 100%
    // Для сообщений снизу вверх
    margin-top auto
    
  marginH = 25px
  &__input
    width 'calc(100% - %s)' % (marginH)
    margin 25px marginH
    max-width 800px
    background darken(colorBg, 2%)
    border-radius radiusM
    background rgba(white, 0.05)
    position relative
    animation-float(0.5s, 0, 30px, bottom)
    
  &__textarea
    width 100%
    input-no-styles()
    font-small()
    color colorText1
    padding 10px 16px
    resize none
    max-height 350px
    min-height 100px
    padding 16px 20px
    padding-right 50px
    border-radius inherit
    display block
    trans()
    
    &::placeholder
      color colorText4
      
    &:focus
      background rgba(white, 0.08)
      
    &--disabled
      opacity 0.6
      cursor not-allowed
      
  &__typing
    display flex
    gap 4px
    padding 12px 16px
    margin 8px 0
    
  .typing-dot
    width 8px
    height 8px
    border-radius 50%
    background colorEmp2
    animation typing 1.4s infinite
    
    &:nth-child(2)
      animation-delay 0.2s
      
    &:nth-child(3)
      animation-delay 0.4s

    @keyframes typing
      0%, 60%, 100%
        transform translateY(0)
        opacity 0.4
      30%
        transform translateY(-10px)
        opacity 1

  &__send-button
    position absolute
    right 10px
    bottom 10px
    
  &__disclaimer
    position absolute
    bottom -20px
    color colorText5
    font-small-extra()
    left 50%
    transform translateX(-50%)

// Анимации для TransitionGroup
.message-list-enter-active
  transition all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)
  
.message-list-leave-active
  transition all 0.3s ease-in
  
.message-list-enter-from
  opacity 0
  transform translateY(20px) scale(0.95)
  
.message-list-leave-to
  opacity 0
  transform translateX(-30px)
  
.message-list-move
  transition transform 0.3s ease
  
@keyframes highlight-message
  0%
    box-shadow 0 0 20px rgba(colorEmp2, 0.5)
    transform scale(1.02)
  100%
    box-shadow 0 0 0 rgba(colorEmp2, 0)
    transform scale(1)
</style>