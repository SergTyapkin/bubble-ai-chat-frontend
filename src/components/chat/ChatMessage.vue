<template>
  <div 
    class="chat-message"
    :class="{ 
      'chat-message--user': message.isUser,
      'chat-message--bot': !message.isUser 
    }"
    :data-message-id="message.id"
  >
    <div class="chat-message__bubble">
      <div class="chat-message__content">
        <!-- Режим редактирования для пользовательских сообщений -->
        <template v-if="editing && message.isUser">
          <textarea
            v-model="editText"
            class="chat-message__edit-input"
            @keydown.enter.prevent="saveEdit"
            @keydown.escape="cancelEdit"
            rows="3"
          ></textarea>
          <div class="chat-message__edit-actions">
            <button class="chat-message__edit-save" @click="saveEdit">Сохранить</button>
            <button class="chat-message__edit-cancel" @click="cancelEdit">Отмена</button>
          </div>
        </template>
        
        <!-- Markdown рендеринг для ответов бота -->
        <div 
          v-else-if="!message.isUser" 
          ref="markdownContainer"
          class="chat-message__markdown" 
          v-html="renderedContent" 
        />
        
        <!-- Обычный текст для пользовательских сообщений -->
        <span v-else>{{ message.content }}</span>
      </div>
      
      <div class="chat-message__meta">
        <span class="chat-message__time">{{ formatTime(message.timestamp) }}</span>
        <span v-if="message.edited" class="chat-message__edited">изменено</span>
      </div>

      <!-- Всплывающие кнопки действий -->
      <div class="chat-message__actions">
        <!-- Кнопки для ответов бота -->
        <template v-if="!message.isUser && !editing">
          <button 
            class="chat-message__action-btn"
            @click="$emit('regenerate', message.id)"
            title="Перегенерировать"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7C1 3.68629 3.68629 1 7 1C9.58302 1 11.7905 2.58804 12.5747 4.83333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M13 7C13 10.3137 10.3137 13 7 13C4.41698 13 2.2095 11.412 1.42532 9.16667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M11.5 5.5H13V3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2.5 8.5H1V10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <button 
            class="chat-message__action-btn"
            @click="copyContent"
            title="Копировать"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
              <path d="M2 10V3C2 2.44772 2.44772 2 3 2H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>

          <button 
            class="chat-message__action-btn"
            @click="$emit('createBranch', message.id);"
            title="Создать ответвление"
          >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3V10C3 10.5523 3.44772 11 4 11H10.5M10.5 11L8 8.5M10.5 11L8 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M13 5V3H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          </button>
        </template>
        
        <!-- Кнопки для сообщений пользователя -->
        <template v-if="message.isUser && !editing">
          <button 
            class="chat-message__action-btn"
            @click="startEdit"
            title="Изменить"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M10 1L13 4L5 12H2V9L10 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
          </button>

          <button 
            class="chat-message__action-btn"
            @click="copyContent"
            title="Копировать"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
              <path d="M2 10V3C2 2.44772 2.44772 2 3 2H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import type { Message } from '~/stores/chatStore';

// Кастомный рендерер для блоков кода с хедером
const renderer = new marked.Renderer();

renderer.code = function(code: { text: string; lang?: string }): string {
  const codeText = code.text;
  const language = code.lang || '';
  
  // Подсвечиваем синтаксис с помощью highlight.js
  let highlightedCode: string;
  if (language && hljs.getLanguage(language)) {
    try {
      highlightedCode = hljs.highlight(codeText, { language }).value;
    } catch (e) {
      highlightedCode = hljs.highlightAuto(codeText).value;
    }
  } else {
    highlightedCode = hljs.highlightAuto(codeText).value;
  }
  
  // Создаем хедер с названием языка и кнопкой копирования
  const headerHtml = `
    <div class="code-block-header">
      <span class="code-block-language">${language || ''}</span>
      <button class="code-block-copy-btn" data-code="${encodeURIComponent(codeText)}" onclick="
        const btn = this;
        const code = decodeURIComponent(this.dataset.code);
        navigator.clipboard.writeText(code).then(() => {
          btn.classList.add('copied');
          btn.innerHTML = '<svg width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 14 14\\' fill=\\'none\\'><path d=\\'M3 7L6 10L11 4\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/></svg>';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '<svg width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 14 14\\' fill=\\'none\\'><rect x=\\'4\\' y=\\'4\\' width=\\'8\\' height=\\'8\\' rx=\\'1\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\'/><path d=\\'M2 10V3C2 2.44772 2.44772 2 3 2H10\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\' stroke-linecap=\\'round\\'/></svg>';
          }, 2000);
        }).catch(err => console.error('Failed to copy:', err));
      ">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
          <path d="M2 10V3C2 2.44772 2.44772 2 3 2H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  `;
  
  return `
    <div class="code-block-wrapper">
      ${headerHtml}
      <pre><code class="hljs language-${language}">${highlightedCode}</code></pre>
    </div>
  `;
};

renderer.codespan = function(code: { text: string }): string {
  const codeText = code.text;
  const highlighted = hljs.highlightAuto(codeText).value;
  return `<code class="hljs">${highlighted}</code>`;
};

marked.setOptions({
  breaks: true,
  gfm: true,
  renderer: renderer,
});

export default defineComponent({
  props: {
    message: {
      type: Object as PropType<Message>,
      required: true,
    },
  },
  emits: ['edit', 'regenerate', 'createBranch'],
  setup(props, { emit }) {
    const editing = ref(false);
    const editText = ref('');
    const markdownContainer = ref<HTMLElement>();

    const renderedContent = computed(() => {
      if (!props.message.content) return '';
      try {
        return marked.parse(props.message.content);
      } catch (e) {
        console.error('Markdown parsing error:', e);
        return props.message.content;
      }
    });

    function startEdit() {
      editing.value = true;
      editText.value = props.message.content;
    }

    function saveEdit() {
      if (editText.value.trim() && editText.value.trim() !== props.message.content) {
        emit('edit', props.message.id, editText.value.trim());
      }
      editing.value = false;
    }

    function cancelEdit() {
      editing.value = false;
      editText.value = '';
    }

    function copyContent() {
      navigator.clipboard.writeText(props.message.content).catch(err => {
        console.error('Failed to copy text:', err);
      });
    }

    function formatTime(date: Date): string {
      return new Date(date).toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    return { 
      editing, 
      editText,
      markdownContainer,
      renderedContent,
      startEdit, 
      saveEdit, 
      cancelEdit, 
      copyContent,
      formatTime 
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
@import '../../styles/scrollbars.styl'

.chat-message
  display flex
  align-items flex-start
  gap 8px
  padding-block 8px
  border-radius radiusM
  
  &--user
    justify-content flex-end
    
    .chat-message__bubble
      max-width 70%
      background mix(colorBg, colorEmp2, 85%)
      border 1px solid mix(colorBg, colorEmp2, 70%)
      
  &--bot
    justify-content flex-start
    
    .chat-message__bubble
      max-width 95%
      background mix(colorBg, white, 95%)
      border 1px solid mix(colorBg, white, 92%)
      
      
  &__bubble
    padding 12px 16px
    border-radius radiusM
    position relative
    
    &:hover .chat-message__actions
      opacity 1
      visibility visible
      
  &__content
    font-small()
    line-height 1.5
    color colorText1
    word-break break-word
    
  &__markdown
    :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6)
      font-family ALS-Sector, Roboto, monospace
      font-weight 700
      margin-bottom 8px
      line-height 1.3
      
    :deep(h1) 
      font-size 1.4em
    :deep(h2) 
      font-size 1.2em
    :deep(h3) 
      font-size 1.1em
      
    :deep(p)
      margin-bottom 8px
      
    :deep(ul), :deep(ol)
      margin 8px 0
      padding-left 20px
      
    :deep(li)
      margin-bottom 4px
      
    :deep(code)
      background rgba(white, 0.1)
      padding 2px 6px
      border-radius radiusS
      font-size 0.9em
      font-family 'Fira Code', monospace
      
    // Стили для блока кода с хедером
    :deep(.code-block-wrapper)
      margin 12px 0
      border-radius radiusM
      overflow hidden
      border 1px solid rgba(white, 0.08)
      
    :deep(.code-block-header)
      display flex
      align-items center
      justify-content space-between
      padding 2px 12px
      background rgba(white, 0.03)
      border-bottom 1px solid rgba(white, 0.08)
      
    :deep(.code-block-language)
      font-small-extra()
      color colorText4
      text-transform uppercase
      letter-spacing 0.5px
      
    :deep(.code-block-copy-btn)
      button-no-styles()
      color colorText4
      padding 4px
      border-radius radiusS
      trans()
      
      &:hover
        color colorText1
        background rgba(white, 0.1)
        
      &.copied
        color colorSuccess
        
    :deep(pre)
      margin 0
      padding 12px
      background rgba(white, 0.02)
      overflow-x auto
      
      code
        background transparent
        padding 0
        font-size 0.85em
        line-height 1.6
        
    // Стили для highlight.js
    :deep(.hljs)
      background transparent
      
    :deep(blockquote)
      border-left 3px solid colorEmp2
      padding-left 12px
      margin 8px 0
      color colorText3
      
    :deep(a)
      color colorEmp2
      text-decoration underline
      
    :deep(table)
      width 100%
      border-collapse collapse
      margin 8px 0
      
    :deep(th), :deep(td)
      border 1px solid rgba(white, 0.1)
      padding 6px 10px
      text-align left
      
    :deep(th)
      background rgba(white, 0.05)
      font-weight 600
        
  &__meta
    display flex
    align-items center
    gap 8px
    margin-top 6px
    
  &__time
    font-small-extra()
    color colorText4
    
  &__edited
    font-small-extra()
    color colorText5
    font-style italic
    
  &__actions
    position absolute
    top -10px
    display flex
    flex-direction column
    gap 4px
    opacity 0
    visibility hidden
    trans(0.15s)
    left auto
    right -10px
    
  &__action-btn
    button-no-styles()
    color colorText4
    padding 6px
    border-radius radiusMax
    backdrop-filter blur(10px)
    background rgba(colorBg, 0.2)
    border 1px solid rgba(white, 0.1)
    svg-inside()
    trans()
    
    &:hover
      color colorEmp2
      background lighten(colorBg, 10%)
      border-color colorEmp2
      
  &__edit-input
    input-no-styles()
    width 100%
    font-small()
    color colorText1
    padding 8px
    border-radius radiusS
    background rgba(white, 0.05)
    resize vertical
    min-height 60px
    
  &__edit-actions
    display flex
    gap 8px
    margin-top 8px
    
    button
      button()
      font-small-extra()
      padding 4px 12px
      
  &__edit-save
    background colorEmp2
    border-color colorEmp2
    color #000
    
    &:hover
      background lighten(colorEmp2, 10%)
      
  &__edit-cancel
    background transparent
    color colorText3
    
    &:hover
      background rgba(white, 0.05)
      
  &--highlighted
    animation highlight-message-block 3s cubic-bezier(0.33, 0.03, 0.14, 0.99)
    
    @keyframes highlight-message-block
      0%
        background colorBlockBgEmp2
      100%
        background rgba(colorBlockBgEmp2, 0)

    .chat-message__bubble
      animation highlight-message 3s cubic-bezier(0.33, 0.03, 0.14, 0.99)
  
      @keyframes highlight-message
        0%
          box-shadow 0 0 20px rgba(colorEmp2, 0.5)
          transform scale(1.02)
        100%
          box-shadow 0 0 0 rgba(colorEmp2, 0)
          transform scale(1)
</style>