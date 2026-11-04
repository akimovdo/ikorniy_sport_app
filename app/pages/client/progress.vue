<template>
  <div>
    <div class="mb-4">
      <h1 class="text-h6 font-weight-bold">Прогресс</h1>
      <div class="text-caption text-medium-emphasis">
        Объём и расчётный 1ПМ по неделям
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <template v-if="!loading">
      <v-card class="pa-3 mb-4" variant="tonal">
        <v-select
          v-model="selectedExercise"
          :items="exerciseOptions"
          item-title="title"
          item-value="value"
          label="Упражнение"
          density="comfortable"
          hide-details
          class="mb-2"
        />
        <v-btn-toggle v-model="period" mandatory density="comfortable" variant="outlined" divided class="w-100">
          <v-btn value="4w" size="small" class="flex-grow-1">4 недели</v-btn>
          <v-btn value="12w" size="small" class="flex-grow-1">12 недель</v-btn>
          <v-btn value="all" size="small" class="flex-grow-1">Всё время</v-btn>
        </v-btn-toggle>
      </v-card>

      <!-- пустое состояние -->
      <v-card v-if="!hasData" class="pa-6 text-center" variant="tonal">
        <v-icon icon="mdi-chart-line" size="40" class="mb-2" color="primary" />
        <div class="text-body-2 text-medium-emphasis">
          Пока нечего показывать: нет тренировок с указанным весом и повторами.
          Отметьте тренировку — графики появятся здесь.
        </div>
        <v-btn class="mt-4" color="primary" variant="flat" to="/client">К тренировкам</v-btn>
      </v-card>

      <template v-else>
        <!-- мало данных -->
        <v-card v-if="weeks.length < 2" class="pa-4 mb-4" variant="tonal" color="surface">
          <div class="d-flex align-center ga-2 mb-2">
            <v-icon icon="mdi-information-outline" color="primary" size="small" />
            <span class="text-subtitle-2 font-weight-medium">Данных пока мало</span>
          </div>
          <div class="text-body-2 text-medium-emphasis">
            Пока одна неделя с тренировками — график динамики появится, когда наберётся
            хотя бы две. Текущий результат: {{ formatValue(currentValue) }}.
          </div>
        </v-card>

        <v-card v-if="weeks.length >= 2" class="pa-4 mb-4" elevation="2">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-subtitle-2 font-weight-medium">Объём по неделям</span>
            <v-chip size="x-small" variant="tonal">
              всего {{ formatTonnage(totalTonnage) }}
            </v-chip>
          </div>
          <div class="text-caption text-medium-emphasis mb-2">Вес × повторы × подходы, кг</div>
          <ProgressChart :points="tonnagePoints" type="bar" color="#3158c8" />
        </v-card>

        <v-card v-if="weeks.length >= 2 && isSingleExercise" class="pa-4 mb-4" elevation="2">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-subtitle-2 font-weight-medium">Расчётный 1ПМ</span>
            <v-chip v-if="latestRecord" size="x-small" color="error" variant="flat" prepend-icon="mdi-trophy">
              рекорд {{ formatValue(latestRecord.value) }}
            </v-chip>
          </div>
          <div class="text-caption text-medium-emphasis mb-2">
            Формула Эпли по лучшему подходу недели, кг
          </div>
          <ProgressChart :points="oneRmPoints" type="line" color="#2e7d32" />
        </v-card>

        <v-card v-if="isSingleExercise && records.length" class="pa-4 mb-4" elevation="2">
          <div class="text-subtitle-2 font-weight-medium mb-2">Личные рекорды</div>
          <v-list density="compact" bg-color="transparent" class="py-0">
            <v-list-item v-for="record in records.slice(0, 5)" :key="record.key" class="px-0">
              <template #prepend>
                <v-icon icon="mdi-trophy-outline" size="small" color="error" class="mr-2" />
              </template>
              <v-list-item-title class="text-body-2">
                {{ formatValue(record.value) }}
                <v-chip v-if="record.isLatest" size="x-small" color="error" variant="flat" class="ml-2">
                  новый рекорд
                </v-chip>
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ formatDate(record.date) }} · было {{ record.previous ? formatValue(record.previous) : '—' }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>

        <v-card v-if="!isSingleExercise" class="pa-4 text-caption text-medium-emphasis" variant="tonal">
          Выберите упражнение, чтобы увидеть динамику расчётного 1ПМ и личные рекорды.
        </v-card>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type PocketBase from 'pocketbase'
import { useAuthStore } from '~/stores/auth'
import { entryOneRM, entryTonnage, localDateString, weekStart, weekLabel } from '~/utils/strength'

definePageMeta({ title: 'Прогресс' })

interface ExerciseRow {
  id: string
  name: string
  training_day: string
}

interface SessionRow {
  id: string
  date: string
}

interface EntryRow {
  id: string
  session: string
  exercise: string
  working_weight: number | null
  reps: number[]
}

const ALL = '__all__'
const PERIOD_DAYS: Record<string, number> = { '4w': 28, '12w': 84 }

const auth = useAuthStore()
const loading = ref(true)
const error = ref('')
const sessions = ref<SessionRow[]>([])
const entries = ref<EntryRow[]>([])
const exercises = ref<ExerciseRow[]>([])
const selectedExercise = ref<string>(ALL)
const period = ref<'4w' | '12w' | 'all'>('12w')

function pb(): PocketBase {
  return useNuxtApp().$pb as PocketBase
}

const exerciseOptions = computed(() => {
  const used = new Set(entries.value.map((e) => e.exercise))
  const list = exercises.value
    .filter((ex) => used.has(ex.id))
    .map((ex) => ({ title: ex.name, value: ex.id }))
    .sort((a, b) => a.title.localeCompare(b.title, 'ru'))
  return [{ title: 'Все упражнения (итого)', value: ALL }, ...list]
})

const isSingleExercise = computed(() => selectedExercise.value !== ALL)

const exerciseName = computed(() => {
  const found = exercises.value.find((ex) => ex.id === selectedExercise.value)
  return found?.name || 'Упражнение'
})

function formatValue(value: number) {
  return `${Math.round(value).toLocaleString('ru-RU')} кг`
}

function formatTonnage(value: number) {
  return `${Math.round(value).toLocaleString('ru-RU')} кг`
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00`).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const sessionDate = computed(() => {
  const map: Record<string, string> = {}
  for (const s of sessions.value) map[s.id] = s.date.slice(0, 10)
  return map
})

// Записи с датой сессии, в хронологическом порядке
const timeline = computed(() =>
  entries.value
    .map((entry) => ({
      ...entry,
      date: sessionDate.value[entry.session] || '',
      tonnage: entryTonnage(entry),
      oneRM: entryOneRM(entry)
    }))
    .filter((entry) => entry.date)
    .sort((a, b) => a.date.localeCompare(b.date))
)

const periodStart = computed(() => {
  if (period.value === 'all') return ''
  const days = PERIOD_DAYS[period.value]
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
})

const filtered = computed(() =>
  timeline.value.filter((entry) => !periodStart.value || entry.date >= periodStart.value)
)

const hasData = computed(() => timeline.value.some((entry) => entry.tonnage > 0))

const relevant = computed(() =>
  filtered.value.filter((entry) => (isSingleExercise.value ? entry.exercise === selectedExercise.value : true))
)

// Недели: от первой до последней недели выбранного периода (непрерывно)
const weekKeys = computed(() => {
  const keys: string[] = []
  if (!relevant.value.length) return keys
  const first = weekStart(relevant.value[0].date)
  const last = weekStart(relevant.value[relevant.value.length - 1].date)
  const cursor = new Date(`${first}T00:00:00`)
  const end = new Date(`${last}T00:00:00`)
  while (cursor <= end) {
    keys.push(localDateString(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }
  return keys
})

// Рекорды 1ПМ по упражнению (по всей истории, до фильтра периода)
const prByEntry = computed(() => {
  const best: Record<string, number> = {}
  const flags: Record<string, boolean> = {}
  const records: { key: string; date: string; value: number; previous: number }[] = []
  for (const entry of timeline.value) {
    if (!entry.oneRM) continue
    const prev = best[entry.exercise] || 0
    if (entry.oneRM > prev) {
      flags[entry.id] = true
      if (prev > 0) {
        records.push({ key: entry.id, date: entry.date, value: entry.oneRM, previous: prev })
      }
      best[entry.exercise] = entry.oneRM
    }
  }
  return { flags, records }
})

// Рекорды выбранного упражнения
const exerciseRecords = computed(() =>
  prByEntry.value.records
    .filter((record) => {
      const entry = timeline.value.find((item) => item.id === record.key)
      return entry?.exercise === selectedExercise.value
    })
    .sort((a, b) => b.date.localeCompare(a.date))
)

const records = computed(() =>
  exerciseRecords.value.map((record, index) => ({ ...record, isLatest: index === 0 }))
)

const latestRecord = computed(() => records.value[0] || null)

const weeks = computed(() =>
  weekKeys.value.map((key) => {
    const items = relevant.value.filter((entry) => weekStart(entry.date) === key)
    const tonnage = items.reduce((sum, entry) => sum + entry.tonnage, 0)
    const bestOneRM = items.reduce((max, entry) => Math.max(max, entry.oneRM || 0), 0)
    const isPr = items.some((entry) => prByEntry.value.flags[entry.id])
    return { key, label: weekLabel(key), tonnage, oneRM: bestOneRM, isPr }
  })
)

const tonnagePoints = computed(() =>
  weeks.value.map((week) => ({ label: week.label, value: Math.round(week.tonnage), isPr: week.isPr }))
)

const oneRmPoints = computed(() =>
  weeks.value
    .filter((week) => week.oneRM > 0)
    .map((week) => ({ label: week.label, value: Math.round(week.oneRM), isPr: week.isPr }))
)

const totalTonnage = computed(() => weeks.value.reduce((sum, week) => sum + week.tonnage, 0))

const currentValue = computed(() => {
  const last = weeks.value.filter((w) => (isSingleExercise.value ? w.oneRM > 0 : w.tonnage > 0)).pop()
  if (!last) return 0
  return isSingleExercise.value ? last.oneRM : last.tonnage
})

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
    const [sessionList, entryList, exerciseList] = await Promise.all([
      pb().collection('sessions').getFullList<SessionRow>({ filter: `user = "${userId}"`, sort: 'date' }),
      pb().collection('exercise_entries').getFullList<EntryRow>({ filter: `user = "${userId}"` }),
      pb().collection('exercises').getFullList<ExerciseRow>({ sort: 'name' })
    ])
    sessions.value = sessionList
    entries.value = entryList
    exercises.value = exerciseList
  } catch (e: any) {
    error.value = e?.message || 'Не удалось загрузить данные прогресса'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
