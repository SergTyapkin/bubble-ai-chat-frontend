<template>
  <div class="chat-graph" ref="graphContainer">
    <!-- Заглушка для пустого состояния -->
    <div v-if="!messages.length" class="chat-graph__empty">
      <div class="chat-graph__empty-icon">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="10" r="4" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
          <circle cx="10" cy="25" r="3" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
          <circle cx="30" cy="28" r="3.5" stroke="currentColor" stroke-width="1.5" opacity="0.25"/>
          <path d="M20 14L13 23M20 14L27 25" stroke="currentColor" stroke-width="1" opacity="0.15"/>
        </svg>
      </div>
      <p class="chat-graph__empty-text">Граф сообщений</p>
      <p class="chat-graph__empty-hint">Начните диалог, чтобы увидеть историю</p>
    </div>
    
    <!-- Граф -->
    <svg v-else ref="svg"></svg>
    
    <!-- Тултип -->
    <div 
      v-if="tooltipMessage" 
      class="chat-graph__tooltip"
      :style="tooltipStyle"
    >
      <div class="chat-graph__tooltip-content">
        {{ tooltipMessage.content.slice(0, 100) }}{{ tooltipMessage.content.length > 100 ? '...' : '' }}
      </div>
      <div class="chat-graph__tooltip-time">
        {{ formatTime(tooltipMessage.timestamp) }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, nextTick, type PropType } from 'vue';
import * as d3 from 'd3';
import type { Message } from '~/stores/chatStore';

export default defineComponent({
  props: {
    messages: {
      type: Array as PropType<Message[]>,
      required: true,
    },
    isGenerating: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['messageClick'],
  setup(props, { emit }) {
    const graphContainer = ref<HTMLElement>();
    const svg = ref<SVGSVGElement>();
    const tooltipMessage = ref<Message | null>(null);
    const tooltipStyle = ref({ top: '0px', right: '0px' });
    
    // Флаг для отслеживания необходимости перерисовки после генерации
    let needsRedraw = false;
    let redrawTimeout: ReturnType<typeof setTimeout> | null = null;

    function formatTime(date: Date): string {
      return new Date(date).toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    function drawGraph() {
      if (!svg.value || !graphContainer.value || !props.messages.length) return;
      
      const container = graphContainer.value;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      // Настройка SVG
      const svgElement = d3.select(svg.value)
        .attr('width', width)
        .attr('height', height);
      
      // Очищаем предыдущий граф
      svgElement.selectAll('*').remove();
      
      // Создаем основную группу с отступами
      const margin = { top: 100, right: 20, bottom: 150, left: 20 };
      const mainGroup = svgElement.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
      
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      
      // Подготавливаем данные для вертикального графа
      const totalMessages = props.messages.length;
      const nodes = props.messages.map((msg, index) => {
        let yPosition: number;
        
        if (totalMessages <= 3) {
          // Если сообщений мало, начинаем с нижней части
          const availableSpace = innerHeight * 0.6;
          const startY = innerHeight - availableSpace;
          yPosition = startY + (index / (totalMessages - 1 || 1)) * availableSpace;
        } else {
          yPosition = 20 + (index / (totalMessages - 1)) * (innerHeight - 40);
        }
        
        return {
          ...msg,
          x: msg.isUser ? innerWidth * 0.75 : innerWidth * 0.25,
          y: yPosition,
        };
      });
      
      // Создаем линии связей
      const lineGenerator = d3.line<typeof nodes[0]>()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveCatmullRom.alpha(0.5));
      
      // Добавляем путь связей с анимацией
      const path = mainGroup.append('path')
        .datum(nodes)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(252, 155, 42, 0.3)')
        .attr('stroke-width', 2)
        .attr('d', lineGenerator);
      
      // Анимация появления линии (только если не во время генерации)
      if (!props.isGenerating) {
        const pathLength = (path.node() as SVGPathElement).getTotalLength();
        path
          .attr('stroke-dasharray', pathLength + ' ' + pathLength)
          .attr('stroke-dashoffset', pathLength)
          .transition()
          .duration(1000)
          .ease(d3.easeQuadInOut)
          .attr('stroke-dashoffset', 0);
      }
      
      // Добавляем узлы
      const nodeGroups = mainGroup.selectAll('g.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .style('cursor', 'pointer')
        .on('click', (event: MouseEvent, d: typeof nodes[0]) => {
          event.stopPropagation();
          emit('messageClick', d.id);
        })
        .on('mouseenter', (event: MouseEvent, d: typeof nodes[0]) => {
          tooltipMessage.value = d;
          updateTooltipPosition(event);
        })
        .on('mouseleave', () => {
          tooltipMessage.value = null;
        })
        .on('mousemove', (event: MouseEvent) => {
          if (tooltipMessage.value) {
            updateTooltipPosition(event);
          }
        });
      
      // Добавляем круги
      const circles = nodeGroups.append('circle')
        .attr('r', props.isGenerating ? 10 : 0)
        .attr('fill', d => d.isUser ? '#fc9b2aBB' : 'rgba(255, 255, 255, 0.2)')
        .attr('stroke', d => d.isUser ? '#fc9b2a' : 'rgba(255, 255, 255, 0.3)')
        .attr('stroke-width', 2);
      
      // Анимация появления кругов (только если не во время генерации)
      if (!props.isGenerating) {
        circles.transition()
          .delay((_, i) => i * 50)
          .duration(500)
          .ease(d3.easeBackOut.overshoot(1.5))
          .attr('r', 10);
      }
      
      // Добавляем свечение для узлов
      const glows = nodeGroups.append('circle')
        .attr('r', 0)
        .attr('fill', 'none')
        .attr('stroke', d => d.isUser ? 'rgba(252, 155, 42, 0.2)' : 'rgba(255, 255, 255, 0.1)')
        .attr('stroke-width', 8);
      
      if (!props.isGenerating) {
        glows.transition()
          .delay((_, i) => i * 50 + 200)
          .duration(800)
          .attr('r', 10)
          .transition()
          .duration(1000)
          .attr('r', 16)
          .attr('opacity', 0);
      }
      
      // Добавляем текст на узлах
      const texts = nodeGroups.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '12px')
        .attr('fill', d => d.isUser ? '#000' : '#fff')
        .attr('font-weight', 'bold')
        .attr('opacity', props.isGenerating ? 1 : 0)
        .text(d => d.isUser ? 'U' : 'AI');
      
      if (!props.isGenerating) {
        texts.transition()
          .delay((_, i) => i * 50 + 300)
          .duration(300)
          .attr('opacity', 1);
      }
      
      // Пульсирующая анимация для последнего узла
      const lastNode = nodeGroups.filter((_, i) => i === nodes.length - 1);
      if (lastNode.size() && !props.isGenerating) {
        lastNode.select('circle:first-child')
          .transition()
          .delay(1500)
          .duration(2000)
          .ease(d3.easeSinInOut)
          .attr('r', 12)
          .transition()
          .duration(2000)
          .ease(d3.easeSinInOut)
          .attr('r', 10)
          .on('end', function repeat() {
            d3.select(this)
              .transition()
              .duration(2000)
              .ease(d3.easeSinInOut)
              .attr('r', 12)
              .transition()
              .duration(2000)
              .ease(d3.easeSinInOut)
              .attr('r', 10)
              .on('end', repeat);
          });
      }
    }

    function updateTooltipPosition(event: MouseEvent) {
      const container = graphContainer.value;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const x = -event.clientX + rect.left + 80;
      const y = event.clientY - 10;
      
      tooltipStyle.value = {
        top: `${y}px`,
        right: `${x}px`,
      };
    }

    // Отложенная перерисовка после окончания генерации
    function scheduleRedraw() {
      if (redrawTimeout) {
        clearTimeout(redrawTimeout);
      }
      
      redrawTimeout = setTimeout(() => {
        if (needsRedraw) {
          needsRedraw = false;
          nextTick(() => {
            drawGraph();
          });
        }
      }, 100); // Небольшая задержка для группировки множественных обновлений
    }

    onMounted(() => {
      nextTick(() => {
        drawGraph();
      });
    });

    // Следим за изменениями сообщений
    watch(() => props.messages, () => {
      if (props.isGenerating) {
        // Если идет генерация, откладываем перерисовку
        needsRedraw = true;
      } else {
        // Если не генерируется, рисуем сразу
        nextTick(() => {
          drawGraph();
        });
      }
    }, { deep: true });

    // Следим за флагом генерации
    watch(() => props.isGenerating, (newValue, oldValue) => {
      if (!newValue && oldValue && needsRedraw) {
        // Генерация только что закончилась и была отложенная перерисовка
        scheduleRedraw();
      } else if (!newValue) {
        // Просто обычное изменение флага
        needsRedraw = false;
        nextTick(() => {
          drawGraph();
        });
      }
    });

    onUnmounted(() => {
      if (redrawTimeout) {
        clearTimeout(redrawTimeout);
      }
    });

    return { 
      graphContainer, 
      svg, 
      tooltipMessage, 
      tooltipStyle,
      formatTime,
    };
  },
});
</script>

<style lang="stylus" scoped>
@import '../../styles/constants.styl'
@import '../../styles/fonts.styl'
@import '../../styles/utils.styl'

.chat-graph
  position absolute
  right 0
  top 0
  width chatHistoryWidth
  height 100%
  pointer-events all
  
  svg
    width 100%
    height 100%
    
  &__empty
    display flex
    flex-direction column
    align-items center
    justify-content center
    height 100%
    padding 20px
    text-align center
    
  &__empty-icon
    color colorText4
    margin-bottom 12px
    opacity 0.4
    
  &__empty-text
    font-small()
    font-semibold()
    color colorText3
    margin-bottom 4px
    
  &__empty-hint
    font-small-extra()
    color colorText5
    max-width 150px
    line-height 1.3
    
  &__tooltip
    position fixed
    background rgba(colorBg, 0.95)
    border 1px solid colorEmp2
    border-radius radiusS
    padding 8px 12px
    max-width 200px
    z-index 1000
    pointer-events none
    backdrop-filter blur(10px)
    box-shadow 0 4px 12px rgba(0, 0, 0, 0.3)
    
  &__tooltip-content
    font-small-extra()
    color colorText1
    margin-bottom 4px
    line-height 1.4
    max-lines(3)
    
  &__tooltip-time
    font-small-extra()
    color colorText4
    text-align right
</style>