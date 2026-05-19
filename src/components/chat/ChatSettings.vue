<template>
  <div class="chat-settings">
    <div class="chat-settings__header">
      <img src="/static/icons/settings.svg" alt="settings"/>
      <h2 class="chat-settings__title">Настройки</h2>
      <button class="chat-settings__close" @click="$emit('close')">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="chat-settings__content">
      <!-- Выбор модели -->
      <div class="chat-settings__section">
        <label class="chat-settings__label" style="--animation-index: 1">Модель нейросети</label>
        <div class="chat-settings__select-wrapper" style="--animation-index: 2">
          <select 
            v-model="selectedModel" 
            class="chat-settings__select"
          >
            <option 
              v-for="model in models" 
              :key="model" 
              :value="model"
            >
              {{ model }}
            </option>
          </select>
          <svg class="chat-settings__select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>

      <!-- Temperature -->
      <div class="chat-settings__section">
        <label class="chat-settings__label" style="--animation-index: 3">
          Temperature: {{ temperature.toFixed(1) }}
        </label>
        
        <div class="chat-settings__range-wrapper" style="--animation-index: 4">
          <input
            v-model.number="temperature"
            type="range"
            min="0"
            max="1"
            step="0.1"
            class="chat-settings__range"
          />
          
          <div class="chat-settings__range-labels">
            <span class="chat-settings__range-label">0</span>
            <span class="chat-settings__range-label">0.2</span>
            <span class="chat-settings__range-label">0.5</span>
            <span class="chat-settings__range-label">0.8</span>
            <span class="chat-settings__range-label">1</span>
          </div>
          
          <div class="chat-settings__range-descriptions">
            <div class="chat-settings__range-desc chat-settings__range-desc--left">
              <span class="chat-settings__range-desc-title">Точность</span>
              <span class="chat-settings__range-desc-text">Факты, никакой выдумки</span>
            </div>
            <div class="chat-settings__range-desc">
              <span class="chat-settings__range-desc-title">Баланс</span>
              <span class="chat-settings__range-desc-text">Умеренная креативность</span>
            </div>
            <div class="chat-settings__range-desc chat-settings__range-desc--right">
              <span class="chat-settings__range-desc-title">Креативность</span>
              <span class="chat-settings__range-desc-text">Опасно: галлюцинации</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-settings__footer">
      <button class="chat-settings__save-btn" @click="saveSettings">
        OK
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useChatStore } from '~/stores/chatStore';

const MODELS = [
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-sonnet-4.6',
  'deepseek/deepseek-r1',
  'google/gemini-2.5-flash-lite',
  'google/gemini-3-flash-preview',
  'google/gemini-3.1-flash-lite-preview',
  'google/gemini-3.1-pro-preview',
  'inception/mercury-2',
  'meta-llama/llama-3.3-70b-instruct',
  'minimax/minimax-m2.5',
  'mistralai/codestral-2508',
  'mistralai/mistral-7b-instruct-v0.1',
  'mistralai/mistral-large',
  'mistralai/mistral-medium-3.1',
  'mistralai/mistral-small-3.2-24b-instruct-2506',
  'moonshotai/kimi-k2-thinking',
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'openai/gpt-5.1',
  'openai/gpt-5.2',
  'openai/gpt-5.2-pro',
  'openai/gpt-5.3-chat',
  'openai/gpt-5.4-mini',
  'openai/gpt-5.4-nano',
  'openai/gpt-5.4-pro',
  'openai/gpt-oss-120b',
  'perplexity/sonar',
  'perplexity/sonar-pro',
  'qwen/qwen3-235b-a22b',
  'x-ai/grok-3',
  'x-ai/grok-3-mini',
  'x-ai/grok-4',
  'x-ai/grok-4-fast',
  'x-ai/grok-4.1-fast',
  'z-ai/glm-5',
];

export default defineComponent({
  emits: ['close'],
  setup(_, { emit }) {
    const store = useChatStore();
    
    const selectedModel = ref(store.selectedModel || MODELS[0]);
    const temperature = ref(store.temperature ?? 0.7);

    onMounted(() => {
      selectedModel.value = store.selectedModel || MODELS[0];
      temperature.value = store.temperature ?? 0.7;
    });

    function saveSettings() {
      store.updateSettings({
        selectedModel: selectedModel.value,
        temperature: temperature.value,
      });
      emit('close');
    }

    return {
      models: MODELS,
      selectedModel,
      temperature,
      saveSettings,
    };
  },
});
</script>

<style lang="stylus" scoped>
@import '../../styles/constants.styl'
@import '../../styles/fonts.styl'
@import '../../styles/utils.styl'
@import '../../styles/buttons.styl'
@import '../../styles/components.styl'
@import '../../styles/animations.styl'

.chat-settings
  display flex
  flex-direction column
  height 100%
  background darken(colorBg, 3%)
  
  &__header
    display flex
    align-items center
    justify-content space-between
    padding 20px
    border-not-full()
    svg-inside()
    animation-float(0.5s, -20px, 0, left)
    
  &__title
    font-large()
    font-bold()
    color colorText1
    
  &__close
    button-no-styles()
    color colorText3
    padding 5px
    border-radius radiusMax
    svg-inside(20px, 0, 0)
    trans()
    
    &:hover
      color colorText1
      background rgba(white, 0.05)
      
  &__content
    flex 1
    overflow-y auto
    padding 20px
    scrollable()
    
  &__section
    margin-bottom 32px
    
  &__label
    display block
    font-small()
    font-semibold()
    color colorText2
    margin-bottom 12px
    animation-float(0.5s, -20px, 0, left)
    
  &__select-wrapper
    position relative
    animation-float(0.5s, -20px, 0, left)
    
  &__select
    width 100%
    input-no-styles()
    font-small()
    color colorText1
    padding 10px 16px
    padding-right 40px
    border-radius radiusM
    background rgba(white, 0.05)
    border 1px solid rgba(white, 0.08)
    cursor pointer
    appearance none
    
    &:focus
      border-color colorEmp2
      background rgba(white, 0.08)
      
    option
      background colorBg
      color colorText1
      
  &__select-arrow
    position absolute
    right 16px
    top 50%
    transform translateY(-50%)
    color colorText4
    pointer-events none
    
  &__range-wrapper
    margin-top 8px
    animation-float(0.5s, -20px, 0, left)
    
  &__range
    width 100%
    appearance none
    height 4px
    border-radius radiusMax
    background rgba(white, 0.1)
    outline none
    margin-bottom 8px
    
    &::-webkit-slider-thumb
      appearance none
      width 20px
      height 20px
      border-radius 50%
      background colorEmp2
      cursor pointer
      border 2px solid rgba(white, 0.2)
      box-shadow 0 2px 8px rgba(0, 0, 0, 0.3)
      
    &::-moz-range-thumb
      width 20px
      height 20px
      border-radius 50%
      background colorEmp2
      cursor pointer
      border 2px solid rgba(white, 0.2)
      box-shadow 0 2px 8px rgba(0, 0, 0, 0.3)
      
  &__range-labels
    display flex
    justify-content space-between
    margin-bottom 12px
    
  &__range-label
    font-small-extra()
    color colorText4
    
  &__range-descriptions
    display grid
    grid-template-columns 1fr 1fr 1fr
    gap 8px
    
  &__range-desc
    text-align center
  &__range-desc--left
    text-align left
  &__range-desc--right
    text-align right
    
  &__range-desc-title
    display block
    font-small-extra()
    font-semibold()
    color colorText3
    margin-bottom 2px
    
  &__range-desc-text
    display block
    font-small-extra()
    color colorText5
    line-height 1.3
    
  &__footer
    padding 16px 20px
    
  &__save-btn
    width 100%
    button()
    background colorEmp2
    border-color colorEmp2
    color #000
    font-medium()
    font-bold()
    
    &:hover
      background lighten(colorEmp2, 10%)
</style>