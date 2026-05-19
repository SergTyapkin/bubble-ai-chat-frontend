<template>
  <div class="chat-layout">
    <!-- Оверлей для мобильной версии -->
    <div 
      v-if="isMobile && isSidebarOpen" 
      class="chat-layout__overlay"
      @click="closeSidebar"
    />

    <section class="chat-layout__sidebar-wrapper" :class="{'chat-layout__sidebar-wrapper--closed': !isSidebarOpen}">
      <ChatSidebar class="chat-layout__sidebar" @close="closeSidebar"/>
    </section>
    
    <section class="chat-layout__main">
      <!-- Бургер-кнопка для мобильной версии -->
      <button 
        v-if="isMobile && !isSidebarOpen"
        class="chat-layout__burger"
        @click="openSidebar"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <ChatGraphFullscreen v-if="store.showFullscreenGraph" />
      
      <template v-else>
        <ChatDialog v-if="store.activeDialog" />
        <ChatWelcome v-else />
      </template>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
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
    const isMobile = ref(false);
    const isSidebarOpen = ref(false);
    
    function checkMobile() {
      isMobile.value = window.innerWidth <= 768;
      // На десктопе сайдбар всегда открыт
      if (!isMobile.value) {
        isSidebarOpen.value = true;
      }
    }

    function openSidebar() {
      isSidebarOpen.value = true;
    }

    function closeSidebar() {
      isSidebarOpen.value = false;
    }

    onMounted(() => {
      checkMobile();
      window.addEventListener('resize', checkMobile);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', checkMobile);
    });
    
    return {
      isMobile,
      isSidebarOpen, 
      store,
      openSidebar,
      closeSidebar,
    };
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
  
  &__overlay
    display none
    position fixed
    inset 0
    background rgba(0, 0, 0, 0.5)
    z-index 90
    
  &__sidebar-wrapper
    flex 1
    height 100%
    max-width sidebarWidth
    border-right 1px solid colorBorder
    z-index 100
    transform translateX(0)
    opacity 1
    trans()

    &--closed
      transform translateX(-100%)
      opacity 0
  
  &__sidebar
    height 100%
    width 100%
    
  &__main
    flex 1
    position relative
    display flex
    flex-direction column
    overflow hidden
    min-width 200px
    
  &__burger
    button-no-styles()
  &__burger
    position absolute
    top 12px
    left 12px
    z-index 50
    color colorText3
    padding 8px
    border-radius radiusMax
    background rgba(colorBg, 0.8)
    backdrop-filter blur(10px)
    trans()
    svg-inside()
    
    &:hover
      color colorText1
      background rgba(colorBg, 0.9)
    
  @media ({mobile})
    &__overlay
      display block
      
    &__sidebar-wrapper
      position fixed
      top 0
      left 0
      bottom 0
      width sidebarWidth
      max-width 85vw
      transition transform 0.3s ease
</style>