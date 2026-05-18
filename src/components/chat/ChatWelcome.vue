<template>
  <div class="chat-welcome">
    <div class="chat-welcome__content">
      <div class="chat-welcome__bubbles">
        <div class="bubble bubble--1"><div></div></div>
        <div class="bubble bubble--2"><div></div></div>
        <div class="bubble bubble--3"><div></div></div>
        <div class="bubble bubble--4"><div></div></div>
        <div class="bubble bubble--5"><div></div></div>
      </div>
      
      <h1 class="chat-welcome__title">
        Добро пожаловать в Bubble AI
      </h1>
      
      <p class="chat-welcome__subtitle">
        Ваш персональный AI-ассистент с пузырьковым характером
      </p>
      
      <div class="chat-welcome__input">
        <textarea
          v-model="messageText"
          class="chat-welcome__textarea"
          placeholder="Задайте любой вопрос..."
          rows="3"
          @keydown.enter.prevent="handleSend"
        ></textarea>
        
        <ChatBubbleButton @click="handleSend" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useChatStore } from '~/stores/chatStore';
import ChatBubbleButton from './ChatBubbleButton.vue';

export default defineComponent({
  components: { ChatBubbleButton },
  setup() {
    const store = useChatStore();
    const messageText = ref('');

    function handleSend() {
      if (!messageText.value.trim()) return;
      
      const dialog = store.createDialog();
      store.sendMessage(messageText.value.trim(), dialog.id);
      messageText.value = '';
    }

    return { messageText, handleSend };
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

.chat-welcome
  display flex
  align-items center
  justify-content center
  height 100%
  position relative
  overflow hidden
  
  &__content
    text-align center
    position relative
    z-index 1
    
  &__bubbles
    position absolute
    top 50%
    left 50%
    transform translate(-50%, -50%)
    width 300px
    height 300px
    z-index -1
    
  .bubble
    position absolute
    animation float-y 3s ease-in-out infinite
    > *
      width 100%
      height 100%
      border-radius 50%
      background rgba(colorEmp2, 0.1)
      border 2px solid rgba(colorEmp2, 0.2)
      animation float-x 7s ease-in-out infinite
    @keyframes float-y
      0%, 100%
        transform translateY(0)
      50%
        transform translateY(-10px)
    @keyframes float-x
      0%, 100%
        transform translateX(0)
      50%
        transform translateX(20px)
    
    &--1
      width 80px
      height 80px
      top 20%
      left 10%
      animation-delay 0s
      > *
        animation-delay 1s
      
    &--2
      width 60px
      height 60px
      top 10%
      right 20%
      animation-delay 0.5s
      > *
        animation-delay 2s
      
    &--3
      width 100px
      height 100px
      bottom 10%
      right 10%
      animation-delay 1s
      > *
        animation-delay 4s
      
    &--4
      width 50px
      height 50px
      bottom 30%
      left 15%
      animation-delay 1.5s
      > *
        animation-delay 6s
      
    &--5
      width 70px
      height 70px
      top 40%
      right 15%
      animation-delay 2s
      > *
        animation-delay 0s
      
  &__title
    font-large-extra()
    font-bold()
    color colorText1
    margin-bottom 16px
    
  &__subtitle
    font-medium()
    color colorText3
    margin-bottom 40px
    max-width 500px
    
  &__input
    display flex
    align-items flex-end
    gap 12px
    max-width 600px
    margin 0 auto
    padding 16px
    border-radius radiusL
    background rgba(white, 0.03)
    border 1px solid rgba(white, 0.08)
    backdrop-filter blur(10px)  
    
  &__textarea
    flex 1
    input-no-styles()
    font-small()
    color colorText1
    resize none
    min-height 60px
    
    &::placeholder
      color colorText4
</style>