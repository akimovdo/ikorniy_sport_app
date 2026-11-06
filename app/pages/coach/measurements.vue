<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h6 font-weight-bold">Измерения клиентов</h1>
        <div class="text-caption text-medium-emphasis">Последние замеры и динамика</div>
      </div>
      <v-btn icon="mdi-refresh" size="small" variant="tonal" color="primary" aria-label="Обновить" @click="load" />
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <template v-if="!loading">
      <v-card v-if="!cards.length" class="pa-6 text-center" variant="tonal">
        <v-icon icon="mdi-human-male-height" size="40" class="mb-2" color="primary" />
        <div class="text-body-2 text-medium-emphasis">
          Пока нет клиентов с измерениями. Клиент добавляет замеры в разделе «Измерения тела».
        </div>
      </v-card>

      <v-row v-else>
        <v-col v-for="card in cards" :key="card.userId" cols="12">
          <v-card class="pa-4" elevation="2">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2 font-weight-medium">{{ card.name }}</div>
              <v-chip size="x-small" variant="tonal">{{ card.measurementCount }} замер(ов)</v-chip>
            </div>

            <div v-if="card.latestDate" class="text-caption text-medium-emphasis mb-3">
              Последний замер: {{ formatDate(card.latestDate) }}
            </div>

            <div v-if="card.metrics.length" class="d-flex flex-wrap ga-2">
              <div v-for="metric in card.metrics" :key="metric.key" class="metric-tile">
                <div class="text-caption text-medium-emphasis">{{ metric.title }}</div>
                <div class="text-body-2 font-weight-medium">{{ metric.valueText }}</div>
                <div
                  class="text-caption"
                  :class="metric.delta === null ? 'text-medium-emphasis' : metric.delta > 0 ? 'text-warning' : metric.delta < 0 ? 'text-success' : 'text-medium-emphasis'"
                >
                  {{ metric.deltaText }}
                </div>
              </div>
            </div>
            <div v-else class="text-caption text-medium-emphasis">
              В последнем замере не заполнено ни одного показателя.
            </div>

            <v-expansion-panels v-if="card.history.length > 1" variant="accordion" class="mt-3">
              <v-expansion-panel>
                <v-expansion-panel-title class="text-caption">
                  История замеров ({{ card.history.length }})
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <div v-for="row in card.history" :key="row.id" class="py-1">
                    <div class="text-body-2">{{ formatDate(row.date) }}</div>
                    <div class="text-caption text-medium-emphasis">{{ summary(row) }}</div>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import type PocketBase from 'pocketbase'

definePageMeta({ title: 'Измерения клиентов' })

interface ClientRow {
  id: string
  name: string
  email: string
}

interface MeasurementRow {
  id: string
  user: string
  date: string
  weight: number | null
  waist: number | null
  chest: number | null
  hips: number | null
  note: string
}

interface MetricConfig {
  key: 'weight' | 'waist' | 'chest' | 'hips'
  title: string
  unit: string
}

const METRICS: MetricConfig[] = [
  { key: 'weight', title: 'Вес', unit: 'кг' },
  { key: 'waist', title: 'Талия', unit: 'см' },
  { key: 'chest', title: 'Грудь', unit: 'см' },
  { key: 'hips', title: 'Бёдра', unit: 'см' }
]

const loading = ref(true)
const error = ref('')
const clients = ref<ClientRow[]>([])
const measurements = ref<MeasurementRow[]>([])

function pb(): PocketBase {
  return useNuxtApp().$pb as PocketBase
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00`).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatNumber(value: number, unit: string) {
  const rounded = Math.round(value * 10) / 10
  return `${rounded.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ${unit}`
}

function summary(row: MeasurementRow) {
  const parts = [
    row.weight ? formatNumber(row.weight, 'кг') : '',
    row.waist ? `талия ${formatNumber(row.waist, 'см')}` : '',
    row.chest ? `грудь ${formatNumber(row.chest, 'см')}` : '',
    row.hips ? `бёдра ${formatNumber(row.hips, 'см')}` : ''
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'только дата'
}

const cards = computed(() => {
  const byUser = new Map<string, MeasurementRow[]>()
  for (const row of measurements.value) {
    const list = byUser.get(row.user) || []
    list.push(row)
    byUser.set(row.user, list)
  }

  const result = []
  for (const client of clients.value) {
    const rows = (byUser.get(client.id) || []).sort((a, b) => b.date.localeCompare(a.date))
    if (!rows.length) continue

    const latest = rows[0]
    const metrics = METRICS.map((metric) => {
      const withValue = rows.filter((row) => {
        const value = row[metric.key]
        return typeof value === 'number' && value > 0
      })
      if (!withValue.length) return null
      const lastValue = withValue[0][metric.key] as number
      const previous = withValue.length > 1 ? (withValue[1][metric.key] as number) : null
      const delta = previous === null ? null : Math.round((lastValue - previous) * 10) / 10
      const deltaText =
        delta === null
          ? 'первый замер'
          : delta === 0
            ? 'без изменений'
            : `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ${metric.unit}`
      return {
        key: metric.key,
        title: metric.title,
        valueText: formatNumber(lastValue, metric.unit),
        delta,
        deltaText
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null)

    result.push({
      userId: client.id,
      name: client.name || client.email || 'Без имени',
      measurementCount: rows.length,
      latestDate: latest.date,
      history: rows,
      metrics
    })
  }

  return result.sort((a, b) => b.latestDate.localeCompare(a.latestDate))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [clientList, measurementList] = await Promise.all([
      pb().collection('users').getFullList<ClientRow>({ filter: "role = 'client'", sort: 'name' }),
      pb().collection('measurements').getFullList<MeasurementRow>({ sort: '-date' })
    ])
    clients.value = clientList
    measurements.value = measurementList
  } catch (e: any) {
    error.value = e?.message || 'Не удалось загрузить измерения клиентов'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.metric-tile {
  flex: 1 1 120px;
  min-width: 120px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 8px 10px;
}
</style>
