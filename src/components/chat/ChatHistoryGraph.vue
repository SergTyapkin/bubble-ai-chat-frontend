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
    
    <!-- Тултип + кнопка ответвления -->
    <div 
      v-if="tooltipMessage" 
      class="chat-graph__tooltip-wrapper"
      :style="tooltipWrapperStyle"
      @mouseenter="handleTooltipEnter"
      @mouseleave="handleTooltipLeave"
    >
      <div class="chat-graph__tooltip">
        <div class="chat-graph__tooltip-content">
          {{ tooltipMessage.content.slice(0, 100) }}{{ tooltipMessage.content.length > 100 ? '...' : '' }}
        </div>
        <div class="chat-graph__tooltip-time">
          {{ formatTime(tooltipMessage.timestamp) }}
        </div>
      </div>
      
      <!-- Кнопка ответвления под тултипом -->
      <button 
        v-if="tooltipMessage && !tooltipMessage.isUser && tooltipMessage.isActiveBranch && tooltipMessage.content"
        class="chat-graph__branch-btn"
        @click.stop="handleCreateBranch(tooltipMessage.id)"
        title="Создать ответвление"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 3V10C3 10.5523 3.44772 11 4 11H10.5M10.5 11L8 8.5M10.5 11L8 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M13 5V3H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, nextTick, type PropType } from 'vue';
import * as d3 from 'd3';
import type { Message, Branch } from '~/stores/chatStore';

interface GraphNode extends Message {
  branchId: string;
  isActiveBranch: boolean;
  parentBranchId?: string;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
}

interface BranchTreeNode {
  branchId: string;
  parentBranchId?: string;
  messages: GraphNode[];
  children: BranchTreeNode[];
  x: number;
  width: number;
}

export default defineComponent({
  props: {
    messages: {
      type: Array as PropType<(Message & { branchId: string; isActiveBranch: boolean })[]>,
      required: true,
    },
    branches: {
      type: Array as PropType<Branch[]>,
      default: () => [],
    },
    activeBranchId: {
      type: String,
      default: '',
    },
    isGenerating: {
      type: Boolean,
      default: false,
    },
  },
  
  emits: ['messageClick', 'createBranch', 'switchBranch'],
  setup(props, { emit }) {
    const graphContainer = ref<HTMLElement>();
    const svg = ref<SVGSVGElement>();
    const tooltipMessage = ref<(Message & { branchId: string; isActiveBranch: boolean }) | null>(null);
    const tooltipStyle = ref({ top: '0px', right: '0px' });
    const tooltipWrapperStyle = ref({ top: '0px', right: '0px' });
    let hideTooltipTimeout: ReturnType<typeof setTimeout> | null = null;
    
    let needsRedraw = false;
    let redrawTimeout: ReturnType<typeof setTimeout> | null = null;
    let floatingAnimationInterval: ReturnType<typeof setInterval> | null = null;

    function formatTime(date: Date): string {
      return new Date(date).toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    function handleCreateBranch(messageId: string) {
      emit('createBranch', messageId);
      tooltipMessage.value = null;
    }

    function handleTooltipEnter() {
      if (hideTooltipTimeout) {
        clearTimeout(hideTooltipTimeout);
        hideTooltipTimeout = null;
      }
    }

    function handleTooltipLeave() {
      hideTooltipTimeout = setTimeout(() => {
        tooltipMessage.value = null;
      }, 200);
    }

    function buildTreeStructure(): BranchTreeNode[] {
      // Находим корневую ветку (без parentMessageId)
      const rootBranches = props.branches.filter(b => !b.parentMessageId);
      
      function buildNode(branch: Branch, visitedBranches: Set<string> = new Set()): BranchTreeNode | null {
        // Защита от бесконечной рекурсии
        if (visitedBranches.has(branch.id)) {
          return null;
        }
        visitedBranches.add(branch.id);
        
        const branchMessages = props.messages
          .filter(m => m.branchId === branch.id)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const childBranches = props.branches.filter(b => {
          // Не та же самая ветка
          if (branch.id === b.id) return false;
          
          // Должен быть parentMessageId
          if (!b.parentMessageId) return false;
          
          // Защита от циклов
          if (visitedBranches.has(b.id)) return false;
          
          // Находим сообщение-родитель в текущей ветке
          const parentMessage = branchMessages.find(m => m.id === b.parentMessageId);
          if (!parentMessage) return false;
          
          // Проверяем, что это сообщение НЕ является первым в какой-либо другой ветке
          for (const otherBranch of props.branches) {
            if (otherBranch.id === branch.id) continue;
            if (otherBranch.id === b.id) continue;
            
            // Ищем сообщения этой ветки в props.messages, а не в otherBranch.messages
            const otherMessages = props.messages
              .filter(m => m.branchId === otherBranch.id)
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            if (otherMessages.length > 0 && otherMessages[0].id === b.parentMessageId) {
              return false; // Это сообщение является первым в другой ветке
            }
          }
          
          return true;
        });
        
        // Рекурсивно строим дочерние узлы, отфильтровывая null
        const children = childBranches
          .map(child => buildNode(child, new Set(visitedBranches)))
          .filter((node): node is BranchTreeNode => node !== null);

        return {
          branchId: branch.id,
          parentBranchId: undefined,
          messages: branchMessages as GraphNode[],
          children,
          x: 0,
          width: 0,
        };
      }
      
      return rootBranches
        .map(branch => buildNode(branch))
        .filter((node): node is BranchTreeNode => node !== null);
    }

    function calculateTreeLayout(tree: BranchTreeNode[], innerWidth: number): void {
      // Рекурсивно вычисляем ширину поддеревьев
      function calcWidth(node: BranchTreeNode): number {
        if (node.children.length === 0) {
          node.width = 1;
          return 1;
        }
        node.width = node.children.reduce((sum, child) => sum + calcWidth(child), 0);
        return node.width;
      }
      
      tree.forEach(calcWidth);
      
      // Распределяем x-координаты
      let currentX = 0;
      function assignX(node: BranchTreeNode) {
        const halfWidth = node.width / 2;
        node.x = currentX + halfWidth;
        
        let childX = currentX;
        for (const child of node.children) {
          child.x = 0; // Временно
          assignX(child);
          childX += child.width;
        }
        
        currentX += node.width;
      }
      
      tree.forEach(assignX);
    }

    function drawGraph() {
      if (!svg.value || !graphContainer.value || !props.messages.length) return;
      
      const container = graphContainer.value;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      const svgElement = d3.select(svg.value)
        .attr('width', width)
        .attr('height', height);
      
      svgElement.selectAll('*').remove();
      
      const margin = { top: 15, right: 25, bottom: 15, left: 25 };
      const mainGroup = svgElement.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
      
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      
      // Собираем ВСЕ уникальные сообщения по ID
      const uniqueMessages = new Map<string, Message & { branchId: string; isActiveBranch: boolean; branchIds: Set<string> }>();
      
      for (const msg of props.messages) {
        if (!uniqueMessages.has(msg.id)) {
          uniqueMessages.set(msg.id, {
            ...msg,
            branchIds: new Set([msg.branchId]),
          });
        } else {
          uniqueMessages.get(msg.id)!.branchIds.add(msg.branchId);
        }
      }
      
      // Строим связи: для каждого сообщения (кроме первого пользовательского) находим предыдущее
      // Группируем сообщения по веткам для определения порядка
      const branchMessageOrder = new Map<string, string[]>(); // branchId -> ordered message IDs
      
      for (const branch of props.branches) {
        const messages = props.messages
          .filter(m => m.branchId === branch.id)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        branchMessageOrder.set(branch.id, messages.map(m => m.id));
      }
      
      // Определяем parent-child связи между сообщениями
      const messageChildren = new Map<string, Set<string>>(); // messageId -> Set of child message IDs
      
      for (const branch of props.branches) {
        const orderedIds = branchMessageOrder.get(branch.id) || [];
        
        // Связи внутри ветки
        for (let i = 0; i < orderedIds.length - 1; i++) {
          const parentId = orderedIds[i];
          const childId = orderedIds[i + 1];
          
          if (!messageChildren.has(parentId)) {
            messageChildren.set(parentId, new Set());
          }
          messageChildren.get(parentId)!.add(childId);
        }
      }
      
      // Находим корневые сообщения (те, которые не являются детьми никакого другого сообщения)
      const allChildIds = new Set<string>();
      for (const children of messageChildren.values()) {
        for (const childId of children) {
          allChildIds.add(childId);
        }
      }
      
      const allMessageIds = new Set(uniqueMessages.keys());
      const rootMessageIds = new Set([...allMessageIds].filter(id => !allChildIds.has(id)));
      
      // Если корневых нет (например, все в цикле), берем хронологически первое
      if (rootMessageIds.size === 0 && uniqueMessages.size > 0) {
        const firstMsg = [...uniqueMessages.values()].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )[0];
        rootMessageIds.add(firstMsg.id);
      }
      
      // Рекурсивно назначаем позиции (y - глубина, x - слева направо для листьев)
      const nodePositions = new Map<string, { x: number; y: number }>();
      let leafX = 0;
      
      function assignPositions(nodeId: string, depth: number): number {
        const children = messageChildren.get(nodeId);
        
        if (!children || children.size === 0) {
          // Листовой узел
          const x = leafX++;
          nodePositions.set(nodeId, { x, y: depth });
          return x;
        }
        
        // Внутренний узел - позиция по центру детей
        const childArray = [...children];
        const childXs = childArray.map(childId => assignPositions(childId, depth + 1));
        const centerX = childXs.reduce((sum, x) => sum + x, 0) / childXs.length;
        nodePositions.set(nodeId, { x: centerX, y: depth });
        return centerX;
      }
      
      // Назначаем позиции начиная с корневых узлов
      for (const rootId of rootMessageIds) {
        assignPositions(rootId, 0);
      }
      
      // Нормализуем координаты под размер контейнера
      const totalLeaves = leafX || 1;
      const maxDepth = Math.max(...[...nodePositions.values()].map(p => p.y), 1);
      
      const spacingX = innerWidth / totalLeaves;
      const spacingY = innerHeight / (maxDepth + 1);
      
      // Конвертируем позиции в координаты на экране
      const allNodes: GraphNode[] = [];
      
      for (const [msgId, pos] of nodePositions) {
        const msg = uniqueMessages.get(msgId);
        if (!msg) continue;
        
        const screenY = spacingY * pos.y + spacingY / 2;
        const screenX = msg.isUser 
          ? (pos.x + 0.5) * spacingX + 15
          : (pos.x + 0.5) * spacingX - 15;
        
        const graphNode: GraphNode = {
          ...msg,
          branchIds: undefined as any, // убираем лишнее поле
          x: screenX,
          y: screenY,
          originalX: screenX,
          originalY: screenY,
        };
        
        allNodes.push(graphNode);
      }
      
      // Рисуем линии между связанными узлами
      for (const [parentId, children] of messageChildren) {
        const parentPos = nodePositions.get(parentId);
        if (!parentPos) continue;
        
        const parentNode = allNodes.find(n => n.id === parentId);
        if (!parentNode) continue;
        
        for (const childId of children) {
          const childNode = allNodes.find(n => n.id === childId);
          if (!childNode) continue;
          
          const isActiveBranch = childNode.branchIds?.has(props.activeBranchId) || 
                                (uniqueMessages.get(childId)?.branchIds.has(props.activeBranchId) ?? false);
          const isActiveConnection = isActiveBranch && 
            (uniqueMessages.get(parentId)?.branchIds.has(props.activeBranchId) ?? false);
          
          const midY = (parentNode.y + childNode.y) / 2;
          const midX = (parentNode.x + childNode.x) / 2;
          
          const SMOOTHNESS_OFFSET = Math.abs(parentNode.y - childNode.y) / 3;
          mainGroup.append('path')
            .attr('d', `M${parentNode.x},${parentNode.y} Q${parentNode.x},${parentNode.y + SMOOTHNESS_OFFSET} ${midX},${midY} Q${childNode.x},${childNode.y - SMOOTHNESS_OFFSET} ${childNode.x},${childNode.y}`)
            .attr('fill', 'none')
            .attr('stroke', isActiveConnection ? 'rgba(252, 155, 42, 0.6)' : 'rgba(255, 255, 255, 0.15)')
            .attr('stroke-width', isActiveConnection ? 2.5 : 1.5)
            .attr('stroke-dasharray', isActiveConnection ? 'none' : '4 4');
        }
      }
      
      // Рисуем узлы
      const nodeGroups = mainGroup.selectAll('g.node')
        .data(allNodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .style('cursor', 'pointer')
        .on('click', (event: MouseEvent, d: GraphNode) => {
          event.stopPropagation();
          if (!d.isActiveBranch) {
            emit('switchBranch', d.branchId);
          }
          emit('messageClick', d.id);
        })
        .on('mouseenter', function(_event: MouseEvent, d: GraphNode) {
          if (hideTooltipTimeout) {
            clearTimeout(hideTooltipTimeout);
            hideTooltipTimeout = null;
          }
          
          d3.select(this).select('.node-circle')
            .transition()
            .duration(10)
            .attr('r', 14);
          
          d3.select(this).select('.node-glow')
            .transition()
            .duration(10)
            .attr('r', 20)
            .attr('opacity', 0.3);
          
          tooltipMessage.value = d;
          updateTooltipPosition(d.x, d.y);
        })
        .on('mouseleave', function() {
          d3.select(this).select('.node-circle')
            .transition()
            .duration(200)
            .attr('r', d => (d as GraphNode).isActiveBranch ? 10 : 7);
          
          d3.select(this).select('.node-glow')
            .transition()
            .duration(200)
            .attr('r', 10)
            .attr('opacity', 0);
          
          hideTooltipTimeout = setTimeout(() => {
            tooltipMessage.value = null;
          }, 200);
        });
      
      // Круги
      nodeGroups.append('circle')
        .attr('class', 'node-circle')
        .attr('r', props.isGenerating ? 10 : 0)
        .attr('fill', d => {
          if (!d.isActiveBranch) return 'rgba(255, 255, 255, 0.1)';
          return d.isUser ? '#fc9b2aBB' : 'rgba(255, 255, 255, 0.3)';
        })
        .attr('stroke', d => {
          if (!d.isActiveBranch) return 'rgba(255, 255, 255, 0.15)';
          return d.isUser ? '#fc9b2a' : 'rgba(255, 255, 255, 0.4)';
        })
        .attr('stroke-width', d => d.isActiveBranch ? 2 : 1);
      
      if (!props.isGenerating) {
        nodeGroups.select('.node-circle')
          .transition()
          .delay((_, i) => i * 50)
          .duration(500)
          .ease(d3.easeBackOut.overshoot(1.5))
          .attr('r', d => d.isActiveBranch ? 10 : 7);
      }
      
      // Свечение
      nodeGroups.append('circle')
        .attr('class', 'node-glow')
        .attr('r', 0)
        .attr('fill', 'none')
        .attr('stroke', d => {
          if (!d.isActiveBranch) return 'rgba(255, 255, 255, 0.03)';
          return d.isUser ? 'rgba(252, 155, 42, 0.2)' : 'rgba(255, 255, 255, 0.1)';
        })
        .attr('stroke-width', 8)
        .attr('opacity', 0);
      
      if (!props.isGenerating) {
        nodeGroups.select('.node-glow')
          .transition()
          .delay((_, i) => i * 50 + 200)
          .duration(800)
          .attr('r', 10)
          .attr('opacity', 0.5)
          .transition()
          .duration(1000)
          .attr('r', 16)
          .attr('opacity', 0);
      }
      
      // Текст на узлах
      nodeGroups.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', d => d.isActiveBranch ? '11px' : '8px')
        .attr('fill', d => {
          if (!d.isActiveBranch) return 'rgba(255, 255, 255, 0.4)';
          return d.isUser ? '#000' : '#fff';
        })
        .attr('font-weight', 'bold')
        .attr('opacity', props.isGenerating ? 1 : 0)
        .text(d => d.isUser ? 'U' : 'AI');
      
      if (!props.isGenerating) {
        nodeGroups.select('text')
          .transition()
          .delay((_, i) => i * 50 + 300)
          .duration(300)
          .attr('opacity', d => d.isActiveBranch ? 1 : 0.5);
      }
      
      startFloatingAnimation(nodeGroups, allNodes);
    }

    function startFloatingAnimation(
      nodeGroups: d3.Selection<SVGGElement, any, null, undefined>, 
      nodes: GraphNode[]
    ) {
      if (floatingAnimationInterval) {
        clearInterval(floatingAnimationInterval);
      }
      
      const phases = nodes.map((_, i) => i * 1.5);
      let time = 0;
      
      floatingAnimationInterval = setInterval(() => {
        time += 0.05;
        
        nodeGroups.each(function(d: GraphNode, i: number) {
          const phase = phases[i];
          const amplitude = d.isActiveBranch ? 2 : 1;
          const offsetX = Math.sin(time + phase) * amplitude;
          const offsetY = Math.cos(time * 0.7 + phase) * amplitude;
          
          d3.select(this)
            .transition()
            .duration(50)
            .attr('transform', `translate(${d.originalX + offsetX}, ${d.originalY + offsetY})`);
        });
      }, 50);
    }

    function updateTooltipPosition(xPos: number, yPos: number, event?: MouseEvent) {
      const container = graphContainer.value;
      if (!container) return;
      
      // const containerRect = container.getBoundingClientRect();
      const x = -xPos + 150;
      const y = yPos + 50;
      
      tooltipStyle.value = {
        top: '0px',
        right: '0px',
      };
      
      tooltipWrapperStyle.value = {
        top: `${y}px`,
        right: `${x}px`,
      };
    }

    function scheduleRedraw() {
      if (redrawTimeout) clearTimeout(redrawTimeout);
      
      redrawTimeout = setTimeout(() => {
        if (needsRedraw) {
          needsRedraw = false;
          nextTick(() => drawGraph());
        }
      }, 100);
    }

    onMounted(() => {
      nextTick(() => drawGraph());
    });

    watch(() => props.messages, () => {
      if (props.isGenerating) {
        needsRedraw = true;
      } else {
        nextTick(() => drawGraph());
      }
    }, { deep: true });

    watch(() => props.isGenerating, (newValue, oldValue) => {
      if (!newValue && oldValue && needsRedraw) {
        scheduleRedraw();
      } else if (!newValue) {
        needsRedraw = false;
        nextTick(() => drawGraph());
      }
    });

    onUnmounted(() => {
      if (redrawTimeout) clearTimeout(redrawTimeout);
      if (floatingAnimationInterval) clearInterval(floatingAnimationInterval);
    });

    return { 
      graphContainer, 
      svg, 
      tooltipMessage, 
      tooltipStyle,
      tooltipWrapperStyle,
      formatTime,
      handleCreateBranch,
      handleTooltipEnter,
      handleTooltipLeave,
    };
  },
});
</script>

<style lang="stylus" scoped>
@import '../../styles/constants.styl'
@import '../../styles/fonts.styl'
@import '../../styles/utils.styl'
@import '../../styles/animations.styl'

.chat-graph
  position absolute
  right 5px
  top 100px
  bottom 150px
  width chatHistoryWidth
  pointer-events all
  
  svg
    width 100%
    height 100%
    
  :global(.node)
    transition transform 0.2s ease
    
  :global(.node-circle)
    transition all 0.2s ease
    
  :global(.node-glow)
    transition all 0.2s ease
    
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
    
  &__tooltip-wrapper
    position fixed
    z-index 1000
    pointer-events all
    display flex
    flex-direction column
    align-items flex-end
    animation-float(0.2s, 5px, 0, right)
    background rgba(colorBg, 0.3)
    backdrop-filter blur(10px)
    border-radius radiusS
    
  &__tooltip
    border 1px solid colorBorder
    border-radius radiusS
    padding 8px 12px
    max-width 200px
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
    
  &__branch-btn
    button-no-styles()
  &__branch-btn
    margin-top 0px
    margin-right 5px
    padding 6px
    color colorEmp2
    background rgba(colorBg, 0.6)
    backdrop-filter blur(10px)
    border 1px solid rgba(colorEmp2, 0.3)
    border-radius radiusMax
    svg-inside()
    trans()
    
    &:hover
      background rgba(colorEmp2, 0.2)
      border-color colorEmp2
      transform scale(1.1)
</style>