<template>
  <div class="graph-fullscreen">
    <button class="graph-fullscreen__close" @click="store.showFullscreenGraph = false">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
    
    <canvas ref="canvas" class="graph-fullscreen__canvas"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useChatStore } from '~/stores/chatStore';

export default defineComponent({
  setup() {
    const store = useChatStore();
    const canvas = ref<HTMLCanvasElement>();

    onMounted(() => {
      if (!canvas.value) return;
      
      const cvs = canvas.value;
      cvs.width = cvs.parentElement!.clientWidth;
      cvs.height = cvs.parentElement!.clientHeight;
      
      const ctx = cvs.getContext('2d');
      if (!ctx || !store.activeDialog) return;

      // Детальная отрисовка графа с анимацией
      // const messages = store.activeDialog.messages;
      
      // Сложная визуализация с интерактивностью
      // ... (код отрисовки)
    });

    return { store, canvas };
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

.graph-fullscreen
  position absolute
  inset 0
  background darken(colorBg, 2%)
  z-index 10
  
  &__close
    button-no-styles()
    position absolute
    top 20px
    right 20px
    color colorText1
    padding 8px
    border-radius radiusS
    z-index 11
    
    &:hover
      background rgba(white, 0.1)
      
  &__canvas
    width 100%
    height 100%
</style>