<template>
  <div class="chat-layout">
    <ChatSidebar class="chat-layout__sidebar" />
    
    <div class="chat-layout__main">
      <ChatGraphFullscreen v-if="store.showFullscreenGraph" />
      
      <template v-else>
        <ChatDialog v-if="store.activeDialog" />
        <ChatWelcome v-else />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useChatStore } from '~/stores/chatStore';
import ChatSidebar from '~/components/chat/ChatSidebar.vue';
import ChatDialog from '~/components/chat/ChatDialog.vue';
import ChatWelcome from '~/components/chat/ChatWelcome.vue';
import ChatGraphFullscreen from '~/components/chat/ChatGraphFullscreen.vue';

export default defineComponent({
  components: {
    ChatSidebar,
    ChatDialog,
    ChatWelcome,
    ChatGraphFullscreen,
  },
  setup() {
    const store = useChatStore();
    return { store };
  },
});
</script>

<style lang="stylus" scoped>
@import '../styles/constants.styl'
@import '../styles/components.styl'
@import '../styles/buttons.styl'
@import '../styles/fonts.styl'
@import '../styles/utils.styl'
@import '../styles/animations.styl'
@import '../styles/scrollbars.styl'

.chat-layout
  display flex
  height 100vh
  overflow hidden
  
  &__sidebar
    flex 1
    max-width sidebarWidth
    border-right 1px solid colorBorder
    
  &__main
    flex 1
    position relative
    display flex
    flex-direction column
    overflow hidden
    min-width 200px
</style>