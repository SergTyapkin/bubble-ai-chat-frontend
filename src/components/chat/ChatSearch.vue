<template>
  <div class="chat-search">
    <svg class="chat-search__icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/>
      <path d="M11 11L14.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <input
      :value="modelValue"
      class="chat-search__input"
      type="text"
      placeholder="Поиск по диалогам..."
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button 
      v-if="modelValue" 
      class="chat-search__clear"
      @click="$emit('update:modelValue', '')"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
});
</script>

<style lang="stylus" scoped>
@import '../../styles/constants.styl'
@import '../../styles/fonts.styl'
@import '../../styles/utils.styl'

.chat-search
  display flex
  align-items center
  gap 10px
  margin 12px 16px
  padding 12px 12px
  background rgba(white, 0.05)
  border-radius radiusM
  svg-inside()
  trans()
  
  &:focus-within
    background rgba(white, 0.08)
    border-color rgba(colorEmp2, 0.3)
    
  &__icon
    color colorText4
    flex-shrink 0
    
  &__input
    flex 1
    input-no-styles()
    font-small-extra()
    color colorText1
    
    &::placeholder
      color colorText5
      
  &__clear
    button-no-styles()
    color colorText4
    border-radius radiusS
    flex-shrink 0
    svg-inside()
    
    &:hover
      color colorText2
      background rgba(white, 0.1)
</style>