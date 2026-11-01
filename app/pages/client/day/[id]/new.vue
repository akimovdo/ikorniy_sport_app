<template>
  <div v-if="day">
    <h1 class="text-h6 font-weight-bold mb-1">{{ day.name }}</h1>
    <div class="text-caption text-medium-emphasis mb-4">Отметить выполнение тренировки</div>

    <v-card class="pa-4 mb-4" variant="tonal">
      <v-text-field v-model="date" type="date" label="Дата" density="comfortable" />
      <div class="text-caption text-medium-emphasis mb-1">
        RPE — воспринимаемая нагрузка (0 — очень легко, 10 — максимально тяжело)
      </div>
      <v-slider
        v-model="rpe"
        :min="0"
        :max="10"
        :step="1"
        show-ticks="always"
        thumb-label
        color="primary"
      />
    </v-card>

    <v-card
      v-for="(entry, idx) in entries"
      :key="entry.exerciseId"
      class="pa-4 mb-4"
      elevation="2"
    >
      <div class="text-subtitle-2 font-weight-medium mb-1">
        {{ idx + 1 }}. {{ entry.name }}
      </div>
      <div v-if="entry.last" class="text-caption text-medium-emphasis mb-2">
        Прошлый раз: {{ entry.last.working_weight ?? '—' }} кг × {{ (entry.last.reps || []).join(' · ') }}
      </div>

      <v-row>
        <v-col cols="6">
          <v-text-field
            v-model.number="entry.weight"
            type="number"
            label="Рабочий вес"
            density="comfortable"
          />
        </v-col>
        <v-col cols="6">
          <v-text-field
            v-model.number="entry.targetReps"
            type="number"
            label="Цель повторений"
            density="comfortable"
          />
        </v-col>
      </v-row>

      <div class="text-caption text-medium-emphasis mb-1">Подходы (повторения)</div>
      <v-row>
        <v-col v-for="(_, setIdx) in entry.reps" :key="setIdx" cols="3">
          <v-text-field
            v-model.number="entry.reps[setIdx]"
            type="number"
            :label="`П${setIdx + 1}`"
            density="comfortable"
          />
        </v-col>
      </v-row>

      <div v-if="entryOneRM(entry) !== null" class="text-caption mt-1">
        <v-icon icon="mdi-trending-up" size="x-small" color="primary" />
        Расчётный 1ПМ ≈ {{ entryOneRM(entry) }} кг
      </div>

      <div class="text-caption text-medium-emphasis mb-1 mt-2">
        Уровень боли (0 — нет, 5 — нужна таблетка)
      </div>
      <v-slider
        v-model="entry.pain"
        :min="0"
        :max="5"
        :step="1"
        show-ticks="always"
        thumb-label
        :color="entry.pain >= 3 ? 'error' : 'primary'"
      />

      <v-text-field
        v-model="entry.note"
        label="Заметка по упражнению (необязательно)"
        density="comfortable"
      />
    </v-card>

    <v-card v-if="totalTonnage > 0" class="pa-4 mb-4" variant="tonal" color="surface">
      <div class="d-flex align-center justify-space-between">
        <span class="text-body-2 text-medium-emphasis">Суммарный тоннаж</span>
        <span class="text-subtitle-1 font-weight-bold">{{ totalTonnage.toLocaleString('ru-RU') }} кг</span>
      </div>
    </v-card>

    <v-card class="pa-4 mb-6" variant="tonal">
      <v-textarea
        v-model="comment"
        label="Общий комментарий по тренировке (необязательно)"
        rows="2"
        auto-grow
      />
    </v-card>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <v-btn
      block
      size="large"
      color="primary"
      variant="flat"
      :loading="saving"
      prepend-icon="mdi-content-save"
      @click="save"
    >
      Сохранить тренировку
    </v-btn>

    <RestTimer />
  </div>
</template>

<script setup lang="ts">
import { useTrainingStore } from '~/stores/training'

definePageMeta({ title: 'Отметить тренировку' })

const route = useRoute()
const router = useRouter()
const dayId = computed(() => route.params.id as string)
const store = useTrainingStore()

const day = computed(() => store.dayById(dayId.value))
const date = ref(new Date().toISOString().slice(0, 10))
const comment = ref('')
const rpe = ref(0)
const saving = ref(false)
const error = ref('')

interface EntryForm {
  exerciseId: string
  name: string
  weight: number | null
  targetReps: number | null
  reps: (number | null)[]
  pain: number
  note: string
  last: { working_weight: number | null; reps: number[] } | null
}

const entries = ref<EntryForm[]>([])

function estimateOneRM(weight: number, reps: number): number | null {
  if (!weight || !reps || reps <= 0) return null
  // Формула Эпли: 1ПМ = вес × (1 + повторы / 30)
  return Math.round(weight * (1 + reps / 30))
}

function entryOneRM(entry: EntryForm): number | null {
  const validReps = entry.reps.filter((r): r is number => r !== null && r > 0)
  if (!entry.weight || !validReps.length) return null
  return estimateOneRM(entry.weight, Math.max(...validReps))
}

const totalTonnage = computed(() => {
  let sum = 0
  for (const e of entries.value) {
    const w = e.weight || 0
    const reps = e.reps.filter((r): r is number => r !== null && r > 0)
    sum += w * reps.reduce((a, b) => a + b, 0)
  }
  return sum
})

async function buildEntries() {
  const exercises = store.exercisesByDay[dayId.value] || []
  const lastEntries = await store.fetchLastEntries(dayId.value)
  entries.value = exercises.map((ex) => {
    const last = lastEntries[ex.id] || null
    const setsCount = ex.sets_count || 4
    return {
      exerciseId: ex.id,
      name: ex.name,
      weight: last?.working_weight ?? null,
      targetReps: last?.target_reps ?? null,
      reps: Array.from({ length: setsCount }, (_, i) => last?.reps?.[i] ?? null),
      pain: 0,
      note: '',
      last: last ? { working_weight: last.working_weight, reps: last.reps } : null
    }
  })
}

async function save() {
  error.value = ''
  saving.value = true
  try {
    const session = await store.createSession(dayId.value, date.value, comment.value.trim(), rpe.value)
    for (const entry of entries.value) {
      await store.createEntry({
        session: session.id,
        exercise: entry.exerciseId,
        working_weight: entry.weight,
        target_reps: entry.targetReps,
        reps: entry.reps.filter((r) => r !== null) as number[],
        pain_level: entry.pain,
        note: entry.note.trim()
      })
    }
    await router.push(`/client/day/${dayId.value}`)
  } catch (e: any) {
    error.value = e?.message || 'Не удалось сохранить тренировку'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!store.days.length) await store.fetchDays()
  if (!store.exercisesByDay[dayId.value]) await store.fetchExercises(dayId.value)
  await buildEntries()
})
</script>
