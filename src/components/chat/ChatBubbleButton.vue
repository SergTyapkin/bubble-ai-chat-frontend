<template>
  <button 
    class="bubble-btn"
    :class="{
      'bubble-btn--stop': state === 'stop',
      'bubble-btn--loading': state === 'loading',
      'bubble-btn--disabled': state === 'disabled'
    }"
    :disabled="state === 'disabled'"
    @click="$emit('click')"
  >
    <!-- Иконка отправки -->
    <svg v-if="state === 'send'" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="6" r="3" fill="currentColor" opacity="0.6">
        <animate attributeName="cy" values="6;4;6" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="6" cy="12" r="2.5" fill="currentColor" opacity="0.4">
        <animate attributeName="cy" values="12;10;12" dur="2.3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="18" cy="14" r="2" fill="currentColor" opacity="0.3">
        <animate attributeName="cy" values="14;12;14" dur="2.7s" repeatCount="indefinite"/>
      </circle>
      <path d="M8 18L16 12L8 6V18Z" fill="currentColor"/>
    </svg>

    <!-- Иконка остановки -->
    <svg v-else-if="state === 'stop'" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" opacity="0.8"/>
      <circle cx="12" cy="6" r="2" fill="currentColor" opacity="0.4">
        <animate attributeName="cy" values="5;2;5" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="6" cy="20" r="1.5" fill="currentColor" opacity="0.3">
        <animate attributeName="cy" values="22;18;22" dur="3.5s" repeatCount="indefinite"/>
      </circle>
    </svg>

    <!-- Иконка загрузки -->
    <svg v-else-if="state === 'loading'" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" opacity="0.2"/>
      <path d="M12 4a8 8 0 0 1 8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <animateTransform 
          attributeName="transform" 
          type="rotate" 
          from="0 12 12" 
          to="360 12 12" 
          dur="1s" 
          repeatCount="indefinite"
        />
      </path>
      <circle cx="12" cy="6" r="1.5" fill="currentColor" opacity="0.3">
        <animate attributeName="cy" values="6;4;6" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>

    <!-- Заблокированная иконка -->
    <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 18L16 12L8 6V18Z" fill="currentColor" opacity="0.3"/>
      <circle cx="12" cy="6" r="2" fill="currentColor" opacity="0.2"/>
      <circle cx="6" cy="12" r="1.5" fill="currentColor" opacity="0.15"/>
    </svg>
  </button>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

export type BubbleButtonState = 'send' | 'stop' | 'loading' | 'disabled';

export default defineComponent({
  props: {
    state: {
      type: String as PropType<BubbleButtonState>,
      default: 'send',
      validator: (value: string) => ['send', 'stop', 'loading', 'disabled'].includes(value),
    },
  },
  emits: ['click'],
});
</script>

<style lang="stylus" scoped>
@import '../../styles/constants.styl'
@import '../../styles/utils.styl'

.bubble-btn
  button-no-styles()
  color colorEmp2
  padding 8px
  border-radius radiusMax
  trans()
  position relative
  width 40px
  height 40px
  border 1px solid rgba(colorEmp2, 0.15)
  
  &:hover:not(:disabled)
    background rgba(colorEmp2, 0.15)
    transform scale(1.1)
    
  &:active:not(:disabled)
    transform scale(0.95)
    
  &:disabled
    cursor default
    opacity 0.5
    
  &--stop
    color colorError
    
    &:hover:not(:disabled)
      background rgba(colorError, 0.15)
      
  &--loading
    color colorAlert
      
  &--disabled
    color colorText4
</style>