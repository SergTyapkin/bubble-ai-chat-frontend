<template>
  <div class="chat-dialog">
    <!-- Заглушка для пустого диалога -->
    <div v-if="!store.activeMessages.length" class="chat-dialog__empty">
      <div class="chat-dialog__empty-content">
        <div class="chat-dialog__empty-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
            <circle cx="20" cy="24" r="15" fill="currentColor" opacity="0.05">
              <animate attributeName="cy" values="26;22;26" dur="4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="18" cy="18" r="5" fill="currentColor" opacity="0.7">
              <animate attributeName="cy" values="18;14;18" dur="2.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="30" cy="26" r="3" fill="currentColor" opacity="1">
              <animate attributeName="cy" values="26;22;26" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="22" cy="32" r="3" fill="currentColor" opacity="0.5">
              <animate attributeName="cy" values="32;36;32" dur="3.5s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
        <h3 class="chat-dialog__empty-title">Начните общение</h3>
        <p class="chat-dialog__empty-text">
          Отправьте первое сообщение, чтобы начать диалог с Bubble AI
        </p>
      </div>
    </div>

    <!-- Сообщения -->
    <div 
      v-else 
      ref="messagesContainer"
      class="chat-dialog__messages"
      :class="{ 'chat-dialog__messages--scrollable': isScrollable }"
    >
      <div class="chat-dialog__messages-inner">
        <TransitionGroup name="message-list" tag="div">
          <ChatMessage
            v-for="message in store.activeMessages"
            :key="message.id"
            :message="message"
            @edit="handleEditMessage"
            @regenerate="handleRegenerateMessage"
            @create-branch="handleCreateBranch"
            @delete="handleDeleteMessage"
          />
        </TransitionGroup>
        
        <div v-if="store.isWaitingForResponse" class="chat-dialog__typing">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
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
        AI generated. Only for reference
      </div>
    </div>

    <ChatHistoryGraph 
      v-if="store.allMessagesForGraph.length"
      :messages="store.allMessagesForGraph"
      :branches="store.allBranchesForGraph"
      :active-branch-id="store.activeDialog?.activeBranchId"
      :is-generating="store.isGenerating"
      @message-click="handleGraphMessageClick"
      @create-branch="handleCreateBranch"
      @switch-branch="handleSwitchBranch"
      :is-mobile="$isMobile"
    />
  </div>

  <!-- <button class="chat-dialog__button-open-graph" @click="">
    <img src="/static/icons/plus-empty.svg" alt="full graph"/>
  </button> -->
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
    const isScrollable = ref(false);

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
      return 'Что интересует вас сегодня?';
    }

    function handleSendOrStop(evt?: KeyboardEvent) {
      if (evt?.shiftKey || evt?.ctrlKey) {
        messageText.value += '\n';
        return;
      }

      if (store.isGenerating) {
        store.stopGeneration();
        return;
      }
      
      if (store.isWaitingForResponse) {
        return;
      }
      
      if (!messageText.value.trim() || !store.activeDialogId) return;
      
      store.sendMessage(messageText.value.trim(), store.activeDialogId);
      messageText.value = '';
      
      nextTick(() => {
        scrollToBottom();
        checkIfScrollable();
      });
    }

    function handleRegenerateMessage(messageId: string) {
      store.regenerateMessage(messageId);
    }

    function handleEditMessage(messageId: string, newContent: string) {
      store.editMessage(messageId, newContent);
    }

    function handleDeleteMessage(messageId: string) {
      store.deleteMessage(messageId);
    }

    function handleCreateBranch(messageId: string) {
      store.createBranch(messageId);
    }

    function handleSwitchBranch(branchId: string) {
      store.switchBranch(branchId);
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

    function checkIfScrolledToBottom() {
      if (!messagesContainer.value) return true;
      return messagesContainer.value.scrollTop >= messagesContainer.value.scrollHeight - messagesContainer.value.clientHeight - 30; // 30px - offset
    }

    function handleGraphMessageClick(messageId: string) {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('chat-message--highlighted');
        setTimeout(() => {
          messageElement.classList.remove('chat-message--highlighted');
        }, 2000);
      }
    }

    function checkIfScrollable() {
      nextTick(() => {
        if (messagesContainer.value) {
          const container = messagesContainer.value;
          isScrollable.value = container.scrollHeight > container.clientHeight;
        }
      });
    }

    onMounted(() => {
      nextTick(() => {
        scrollToBottom();
        checkIfScrollable();
      });
    });

    watch(() => store.activeDialogId, () => {
      isScrollable.value = false; // Сбрасываем при смене диалога
      nextTick(() => {
        scrollToBottom();
        checkIfScrollable();
      });
    });

    watch(
      () => store.activeMessages.length,
      () => {
        nextTick(() => {
          scrollToBottom();
          checkIfScrollable();
        });
      }
    );

    // При обновлении последнего сообщения, крутим вниз диалог, если он уже внизу
    watch(
      () => {
        const messages = store.activeMessages;
        if (!messages || messages.length === 0) return '';
        const lastMessage = messages[messages.length - 1];
        return checkIfScrolledToBottom() ? lastMessage.content : null;
      },
      () => {
        nextTick(() => {
          scrollToBottom();
          checkIfScrollable();
        });
      }
    );

    return {
      store,
      messageText,
      messagesContainer,
      buttonState,
      isScrollable,
      getPlaceholder,
      handleSendOrStop,
      handleEditMessage,
      handleDeleteMessage,
      handleRegenerateMessage,
      handleCreateBranch,
      handleSwitchBranch,
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
  position relative
  display flex
  flex-direction column
  align-items center
  height 100%

  &__empty
    display flex
    flex 1
    align-items center
    justify-content center
    width 100%
    padding 40px 20px

  &__empty-content
    text-align center
    animation-float(0.6s, 0, -20px)

  &__empty-icon
    margin-bottom 0px
    color colorEmp2
    opacity 0.5

  &__empty-title
    font-large()
    font-bold()

    margin-bottom 8px
    color colorText1

  &__empty-text
    font-small()

    max-width 300px
    line-height 1.5
    color colorText3

  marginH = 12.5px
  &__messages
    overflow-y auto
    display flex
    flex 1
    flex-direction column
    width 100%
    max-width 800px
    margin 0
    padding 20px marginH
    padding-right chatHistoryWidth
    @media ({mobile})
      padding-right chatHistoryWidthMobile
    scrollable()

  &__messages-inner
    width 100%

  marginH = 25px
  &__input
    position relative
    width 'calc(100% - %s)' % (marginH)
    max-width 800px
    margin 25px marginH
    border-radius radiusM
    background colorBlockBg
    animation-float(0.5s, 0, 30px, bottom)

  &__textarea
    input-no-styles()
  &__textarea
    resize none
    display block
    width 100%
    min-height 100px
    max-height 350px
    padding 10px 16px
    padding 16px 20px
    padding-right 50px
    border-radius inherit
    color colorText1
    font-small()
    trans()

    &::placeholder
      color colorText4

    &:focus
      background rgba(white, 0.08)

    &--disabled
      cursor not-allowed
      opacity 0.6

  &__typing
    display flex
    gap 4px
    margin 8px 0
    padding 12px 16px

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
      0%
      60%
      100%
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
    left 50%
    transform translateX(-50%)
    color colorText5
    white-space nowrap
    font-small-extra()

  buttonOpenGraphSize = 50px
  &__button-open-graph
    button-no-styles()
  &__button-open-graph
    position absolute
    top 0
    right 0
    width buttonOpenGraphSize
    height buttonOpenGraphSize
    border-bottom-left-radius radiusMax
    padding 5px 5px 12px 12px
    border 1px solid colorBorder
    background colorBlockBg
    border-top none
    border-right none

// Анимации для TransitionGroup
.message-list-enter-active
  transition all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)

.message-list-leave-active
  display none

.message-list-enter-from
  transform translateY(20px) scale(0.95)
  opacity 0

.message-list-leave-to
  display none

.message-list-move
  transition transform 0.3s ease
</style>