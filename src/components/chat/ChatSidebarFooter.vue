<template>
  <section class="chat-sidebar-footer">
    <section class="chat-sidebar-footer__top-block">
      <section class="chat-sidebar-footer__stats">
        <div class="chat-sidebar-footer__stat">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4C2 2.89543 2.89543 2 4 2H10C11.1046 2 12 2.89543 12 4V10C12 11.1046 11.1046 12 10 12H4C2.89543 12 2 11.1046 2 10V4Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M5 7H9M5 9H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>{{ totalMessages }} сообщений</span>
        </div>
        <div class="chat-sidebar-footer__stat">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7 4V7.5L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>{{ totalDialogs }} диалогов</span>
        </div>
      </section>
      
      <div class="chat-sidebar-footer__actions">
        <button class="chat-sidebar-footer__settings-btn" @click="$emit('open-settings')">
          <img src="/static/icons/settings.svg" alt="settings"/>
        </button>
      </div>
    </section>    
  </section>

  <div class="chat-sidebar-footer__disclaimer">
      Powered by <a href="https://openrouter.ai">OpenRouter</a>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useChatStore } from '~/stores/chatStore';

export default defineComponent({
  emits: ['open-settings'],

  setup() {
    const store = useChatStore();
    
    const totalMessages = computed(() => {
      return store.dialogs.reduce((sum, dialog) => 
        sum + dialog.branches.reduce((sum, branch) =>
          sum + branch.messages.length,
          0,
        ),
        0,
      );
    });
    
    const totalDialogs = computed(() => store.dialogs.length);
    
    return { totalMessages, totalDialogs };
  },
});
</script>

<style lang="stylus" scoped>
@import '../../styles/constants.styl'
@import '../../styles/fonts.styl'
@import '../../styles/utils.styl'
@import '../../styles/animations.styl'
@import '../../styles/scrollbars.styl'
@import '../../styles/components.styl'

.chat-sidebar-footer
  border-not-full(180deg)
  padding 16px 20px
  padding-bottom 0
  
  &__top-block
    display flex
    justify-content space-between
    align-items flex-start
    gap 8px
  
  &__stats
    display flex
    flex-direction column
    gap 8px
    margin-bottom 12px
    
  &__stat
    display flex
    align-items center
    gap 8px
    font-small-extra()
    color colorText4
    
    svg
      color colorText5
      flex-shrink 0
      
  &__actions
    display flex
    justify-content flex-end
    margin-bottom 12px
    
  &__settings-btn
    button-no-styles()
    color colorText4
    padding 6px
    border-radius radiusMax
    opacity 0.5
    svg-inside(20px, 0, 0)
    trans()
    
    &:hover
      color colorText2
      background rgba(white, 0.05)
      opacity 0.8
      
  &__disclaimer
    text-align center
    font-small-extra()
    color colorText5
    padding-top 8px
    border-top 1px solid rgba(white, 0.05)
    margin-bottom 8px
    a
      color colorEmp2
      hover-effect-underline(colorEmp2)
        
</style>