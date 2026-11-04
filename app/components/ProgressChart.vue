<template>
  <div>
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="progress-chart"
      role="img"
      :aria-label="ariaLabel"
    >
      <!-- сетка и подписи оси Y -->
      <g v-for="tick in ticks" :key="tick">
        <line
          :x1="PAD.left"
          :x2="W - PAD.right"
          :y1="y(tick)"
          :y2="y(tick)"
          stroke="currentColor"
          stroke-opacity="0.12"
          stroke-width="1"
        />
        <text
          :x="PAD.left - 6"
          :y="y(tick) + 3"
          text-anchor="end"
          font-size="9"
          fill="currentColor"
          fill-opacity="0.6"
        >{{ shortValue(tick) }}</text>
      </g>

      <!-- бары -->
      <g v-if="type === 'bar'">
        <rect
          v-for="(point, index) in points"
          :key="`bar-${index}`"
          :x="barX(index)"
          :y="y(point.value)"
          :width="barW()"
          :height="Math.max(1, PAD.top + innerH - y(point.value))"
          rx="3"
          :fill="color"
          :fill-opacity="point.isPr ? 1 : 0.75"
        />
        <rect
          v-for="(point, index) in prPoints"
          :key="`cap-${index}`"
          :x="barX(points.indexOf(point))"
          :y="y(point.value)"
          :width="barW()"
          height="4"
          rx="2"
          :fill="prColor"
        />
      </g>

      <!-- линия -->
      <g v-else>
        <path :d="areaPath" :fill="color" fill-opacity="0.12" />
        <path :d="linePath" :stroke="color" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round" />
        <circle
          v-for="(point, index) in points"
          :key="`dot-${index}`"
          :cx="x(index)"
          :cy="y(point.value)"
          :r="point.isPr ? 4 : 2.5"
          :fill="point.isPr ? prColor : color"
          :stroke="point.isPr ? '#fff' : 'none'"
          :stroke-width="point.isPr ? 1.5 : 0"
        />
      </g>

      <!-- рекорды -->
      <g v-for="(point, index) in prPoints" :key="`pr-${index}`">
        <text
          :x="type === 'bar' ? barX(index) + barW() / 2 : x(index)"
          :y="y(point.value) - (type === 'bar' ? 4 : 8)"
          text-anchor="middle"
          font-size="10"
          :fill="prColor"
        >★</text>
      </g>

      <!-- подписи оси X -->
      <text
        v-for="(point, index) in points"
        v-show="index % labelStep === 0 || index === points.length - 1"
        :key="`label-${index}`"
        :x="type === 'bar' ? barX(index) + barW() / 2 : x(index)"
        :y="H - 8"
        text-anchor="middle"
        font-size="9"
        fill="currentColor"
        fill-opacity="0.6"
      >{{ point.label }}</text>
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    points: { label: string; value: number; isPr?: boolean }[]
    type?: 'bar' | 'line'
    color?: string
    prColor?: string
    unit?: string
    label?: string
    formatValue?: (value: number) => string
  }>(),
  {
    type: 'bar',
    color: '#3158c8',
    prColor: '#d9364a',
    unit: 'кг',
    label: '',
    formatValue: undefined
  }
)

const W = 360
const H = 190
const PAD = { top: 16, right: 10, bottom: 26, left: 46 }
const innerW = W - PAD.left - PAD.right
const innerH = H - PAD.top - PAD.bottom

const maxValue = computed(() => Math.max(1, ...props.points.map((p) => p.value)))
const niceMax = computed(() => {
  const raw = maxValue.value
  const step = Math.pow(10, Math.floor(Math.log10(raw)))
  const scaled = raw / step
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10
  return nice * step
})

function valueText(value: number) {
  if (props.formatValue) return props.formatValue(value)
  return Math.round(value).toLocaleString('ru-RU')
}

function shortValue(value: number) {
  if (value >= 1000) return `${Math.round(value / 100) / 10}т`
  return String(Math.round(value))
}

function x(index: number) {
  if (props.points.length === 1) return PAD.left + innerW / 2
  return PAD.left + (innerW * index) / (props.points.length - 1)
}

function barX(index: number) {
  const slot = innerW / props.points.length
  return PAD.left + slot * index + slot * 0.15
}

function barW() {
  return (innerW / props.points.length) * 0.7
}

function y(value: number) {
  return PAD.top + innerH - (value / niceMax.value) * innerH
}

const linePath = computed(() => {
  return props.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ')
})

const areaPath = computed(() => {
  if (!props.points.length) return ''
  return `${linePath.value} L${x(props.points.length - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z`
})

const ticks = computed(() => [0, 0.5, 1].map((part) => Math.round(niceMax.value * part)))

const labelStep = computed(() => Math.max(1, Math.ceil(props.points.length / 6)))

const prPoints = computed(() => props.points.filter((p) => p.isPr))

const ariaLabel = computed(() => {
  const values = props.points.map((p) => `${p.label}: ${valueText(p.value)} ${props.unit}`).join(', ')
  return `${props.label || 'График'}. ${values}`
})
</script>

<style scoped>
.progress-chart {
  width: 100%;
  height: auto;
  display: block;
  color: rgb(var(--v-theme-on-surface));
}
</style>
