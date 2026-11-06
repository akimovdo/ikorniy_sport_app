<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h6 font-weight-bold">Измерения тела</h1>
        <div class="text-caption text-medium-emphasis">Вес и обхваты — для похудения и набора</div>
      </div>
      <v-btn
        icon="mdi-plus"
        size="small"
        variant="tonal"
        color="primary"
        aria-label="Добавить измерение"
        @click="openDialog"
      />
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <template v-if="!loading">
      <v-card v-if="!rows.length" class="pa-6 text-center" variant="tonal">
        <v-icon icon="mdi-human-male-height" size="40" class="mb-2" color="primary" />
        <div class="text-body-2 text-medium-emphasis">
          Пока нет измерений. Добавьте первое — вес, талию, грудь и бёдра можно заполнять
          по отдельности, обязательна только дата.
        </div>
        <v-btn class="mt-4" color="primary" variant="flat" @click="openDialog">Добавить измерение</v-btn>
      </v-card>

      <template v-else>
        <v-card class="pa-3 mb-4" variant="tonal">
          <v-btn-toggle v-model="metric" mandatory density="comfortable" variant="outlined" divided class="w-100">
            <v-btn v-for="option in METRICS" :key="option.key" :value="option.key" size="small" class="flex-grow-1">
              {{ option.short }}
            </v-btn>
          </v-btn-toggle>
        </v-card>

        <v-card class="pa-4 mb-4" elevation="2">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-subtitle-2 font-weight-medium">{{ activeMetric.title }} по датам</span>
            <v-chip v-if="lastValue !== null" size="x-small" variant="tonal">
              {{ formatMetric(lastValue) }}
            </v-chip>
          </div>
          <div v-if="delta !== null" class="text-caption text-medium-emphasis mb-2">
            {{ deltaText }}
          </div>
          <div v-else class="text-caption text-medium-emphasis mb-2">
            {{ activeMetric.hint }}
          </div>

          <ProgressChart
            v-if="chartPoints.length >= 2"
            :points="chartPoints"
            type="line"
            :color="activeMetric.color"
            :unit="activeMetric.unit"
            :label="activeMetric.title"
            :format-value="formatMetric"
            scaled
          />
          <div v-else class="text-body-2 text-medium-emphasis pa-2">
            Для графика нужно минимум два измерения с заполненным полем
            «{{ activeMetric.title.toLowerCase() }}». Сейчас {{ chartPoints.length }}.
          </div>
        </v-card>

        <v-card class="pa-4" elevation="2">
          <div class="text-subtitle-2 font-weight-medium mb-2">История</div>
          <v-list density="comfortable" bg-color="transparent" class="py-0">
            <v-list-item v-for="row in rowsNewestFirst" :key="row.id" class="px-0">
              <v-list-item-title class="text-body-2">
                {{ formatDate(row.date) }}
              </v-list-item-title>
              <div class="text-caption text-medium-emphasis history-line">
                {{ summary(row) }}
                <span v-if="row.note"> · {{ row.note }}</span>
              </div>
              <template #append>
                <v-btn
                  icon="mdi-delete-outline"
                  size="small"
                  variant="text"
                  color="error"
                  :aria-label="`Удалить измерение от ${formatDate(row.date)}`"
                  @click="remove(row)"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </template>
    </template>

    <v-dialog v-model="dialog" max-width="420">
      <v-card class="pa-4">
        <v-card-title class="px-0">Новое измерение</v-card-title>
        <v-text-field
          v-model="form.date"
          type="date"
          label="Дата"
          density="comfortable"
        />
        <v-text-field
          v-model.number="form.weight"
          type="number"
          label="Вес"
          suffix="кг"
          min="20"
          max="300"
          step="0.1"
          density="comfortable"
          inputmode="decimal"
        />
        <v-text-field
          v-model.number="form.waist"
          type="number"
          label="Талия"
          suffix="см"
          min="30"
          max="250"
          step="0.5"
          density="comfortable"
          inputmode="decimal"
        />
        <v-text-field
          v-model.number="form.chest"
          type="number"
          label="Грудь"
          suffix="см"
          min="30"
          max="250"
          step="0.5"
          density="comfortable"
          inputmode="decimal"
        />
        <v-text-field
          v-model.number="form.hips"
          type="number"
          label="Бёдра"
          suffix="см"
          min="30"
          max="250"
          step="0.5"
          density="comfortable"
          inputmode="decimal"
        />
        <v-text-field
          v-model="form.note"
          label="Заметка (необязательно)"
          density="comfortable"
          maxlength="200"
        />
        <v-alert v-if="formError" type="error" variant="tonal" density="compact" class="mb-2">
          {{ formError }}
        </v-alert>
        <v-card-actions class="px-0">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Отмена</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="save">Сохранить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type PocketBase from 'pocketbase'
import { useAuthStore } from '~/stores/auth'
import { localDateString } from '~/utils/strength'

definePageMeta({ title: 'Измерения тела' })

interface MeasurementRow {
  id: string
  date: string
  weight: number | null
  waist: number | null
  chest: number | null
  hips: number | null
  note: string
}

type MetricKey = 'weight' | 'waist' | 'chest' | 'hips'

const METRICS: { key: MetricKey; title: string; short: string; unit: string; hint: string; color: string }[] = [
  { key: 'weight', title: 'Вес', short: 'Вес', unit: 'кг', hint: 'Вес в килограммах', color: '#3158c8' },
  { key: 'waist', title: 'Талия', short: 'Талия', unit: 'см', hint: 'Обхват талии в сантиметрах', color: '#2e7d32' },
  { key: 'chest', title: 'Грудь', short: 'Грудь', unit: 'см', hint: 'Обхват груди в сантиметрах', color: '#6a1b9a' },
  { key: 'hips', title: 'Бёдра', short: 'Бёдра', unit: 'см', hint: 'Обхват бёдер в сантиметрах', color: '#ef6c00' }
]

const auth = useAuthStore()
const loading = ref(true)
const error = ref('')
const rows = ref<MeasurementRow[]>([])
const metric = ref<MetricKey>('weight')

const dialog = ref(false)
const saving = ref(false)
const formError = ref('')
const form = reactive({
  date: localDateString(new Date()),
  weight: '' as number | string,
  waist: '' as number | string,
  chest: '' as number | string,
  hips: '' as number | string,
  note: ''
})

function pb(): PocketBase {
  return useNuxtApp().$pb as PocketBase
}

const activeMetric = computed(() => METRICS.find((m) => m.key === metric.value) || METRICS[0])

const rowsNewestFirst = computed(() => [...rows.value].sort((a, b) => b.date.localeCompare(a.date)))

/** Значения выбранной метрики по возрастанию даты — только заполненные. */
const series = computed(() =>
  [...rows.value]
    .filter((row) => typeof row[metric.value] === 'number' && (row[metric.value] as number) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({ date: row.date, value: row[metric.value] as number }))
)

const lastValue = computed(() => (series.value.length ? series.value[series.value.length - 1].value : null))

const delta = computed(() => {
  if (series.value.length < 2) return null
  const last = series.value[series.value.length - 1].value
  const prev = series.value[series.value.length - 2].value
  return Math.round((last - prev) * 10) / 10
})

const deltaText = computed(() => {
  if (delta.value === null) return ''
  const word = delta.value === 0 ? 'без изменений' : delta.value > 0 ? 'прибавка' : 'снижение'
  const sign = delta.value > 0 ? '+' : delta.value < 0 ? '−' : ''
  const absolute = Math.abs(delta.value).toLocaleString('ru-RU', { maximumFractionDigits: 1 })
  return `${word} с прошлого раза: ${sign}${absolute} ${activeMetric.value.unit}`
})

const chartPoints = computed(() =>
  series.value.map((point) => ({
    label: formatDate(point.date).slice(0, 5),
    value: point.value
  }))
)

function formatMetric(value: number) {
  const rounded = Math.round(value * 10) / 10
  return `${rounded.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ${activeMetric.value.unit}`
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00`).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function valueOrDash(value: number | null, unit: string) {
  if (typeof value !== 'number' || value <= 0) return ''
  const rounded = Math.round(value * 10) / 10
  return `${rounded.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ${unit}`
}

function summary(row: MeasurementRow) {
  const parts = [
    valueOrDash(row.weight, 'кг'),
    valueOrDash(row.waist, 'см талия'),
    valueOrDash(row.chest, 'см грудь'),
    valueOrDash(row.hips, 'см бёдра')
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'только дата'
}

function openDialog() {
  form.date = localDateString(new Date())
  form.weight = ''
  form.waist = ''
  form.chest = ''
  form.hips = ''
  form.note = ''
  formError.value = ''
  dialog.value = true
}

function toNumber(value: number | string): number | null {
  if (value === '' || value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    auth.init()
    const userId = auth.user?.id
    if (!userId) {
      error.value = 'Нужно войти заново'
      return
    }
    rows.value = await pb()
      .collection('measurements')
      .getFullList<MeasurementRow>({ filter: `user = "${userId}"`, sort: '-date' })
  } catch (e: any) {
    error.value = e?.message || 'Не удалось загрузить измерения'
  } finally {
    loading.value = false
  }
}

async function save() {
  formError.value = ''
  const weight = toNumber(form.weight)
  const waist = toNumber(form.waist)
  const chest = toNumber(form.chest)
  const hips = toNumber(form.hips)

  if (!form.date) {
    formError.value = 'Укажите дату измерения'
    return
  }
  if (!weight && !waist && !chest && !hips) {
    formError.value = 'Заполните хотя бы одно поле: вес, талию, грудь или бёдра'
    return
  }

  saving.value = true
  try {
    const userId = auth.user?.id
    const record = await pb().collection('measurements').create<MeasurementRow>({
      user: userId,
      date: `${form.date} 00:00:00.000Z`,
      weight,
      waist,
      chest,
      hips,
      note: (form.note || '').trim()
    })
    rows.value = [...rows.value, record]
    dialog.value = false
  } catch (e: any) {
    formError.value = e?.message || 'Не удалось сохранить измерение'
  } finally {
    saving.value = false
  }
}

async function remove(row: MeasurementRow) {
  if (!confirm(`Удалить измерение от ${formatDate(row.date)}?`)) return
  try {
    await pb().collection('measurements').delete(row.id)
    rows.value = rows.value.filter((item) => item.id !== row.id)
  } catch (e: any) {
    error.value = e?.message || 'Не удалось удалить измерение'
  }
}

onMounted(load)
</script>

<style scoped>
/* На 375px подпись замера не должна обрезаться многоточием. */
.history-line {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  line-height: 1.35;
}
</style>
