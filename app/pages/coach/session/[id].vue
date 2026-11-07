<template>
  <div>
    <div class="mb-3">
      <h1 class="text-h6 font-weight-bold">{{ dayTitle }}</h1>
      <div class="text-caption text-medium-emphasis">
        {{ clientName }} · {{ formatDate(session?.date || '') }}
        <span v-if="session?.rpe"> · RPE {{ session.rpe }}</span>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-card v-if="session?.comment" class="pa-4 mb-4" variant="tonal">
      <div class="text-caption text-medium-emphasis mb-1">Комментарий клиента</div>
      <div class="text-body-2">{{ session.comment }}</div>
    </v-card>

    <v-card v-for="entry in entries" :key="entry.id" class="pa-4 mb-3" elevation="2">
      <div class="text-subtitle-2 font-weight-medium mb-1">{{ exerciseName(entry.exercise) }}</div>
      <div class="text-caption text-medium-emphasis">
        Вес: {{ entry.working_weight ?? '—' }} кг · цель: {{ entry.target_reps ?? '—' }} повторов
      </div>
      <div class="d-flex flex-wrap ga-1 mt-2">
        <v-chip v-for="(rep, idx) in entry.reps" :key="idx" size="x-small" variant="tonal">
          П{{ idx + 1 }}: {{ rep }}
        </v-chip>
        <v-chip v-if="entry.pain_level" size="x-small" :color="entry.pain_level >= 3 ? 'error' : 'warning'" variant="flat">
          боль {{ entry.pain_level }}
        </v-chip>
      </div>
      <div v-if="entry.note" class="text-caption mt-2">{{ entry.note }}</div>
    </v-card>

    <v-card v-if="!loading && !entries.length" class="pa-6 text-center mb-3" variant="tonal">
      <div class="text-body-2 text-medium-emphasis">В этой тренировке нет записей по упражнениям.</div>
    </v-card>

    <h2 class="text-subtitle-1 font-weight-bold mt-6 mb-2">Переписка</h2>

    <v-card class="pa-4" elevation="2">
      <div v-for="comment in comments" :key="comment.id" class="mb-2">
        <div class="text-body-2">{{ comment.text }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ comment.author === clientId ? 'Клиент' : 'Вы' }} · {{ formatDateTime(comment.created) }}
        </div>
      </div>
      <div v-if="!comments.length" class="text-caption text-medium-emphasis mb-2">
        Пока нет сообщений по этой тренировке.
      </div>
      <div class="d-flex ga-2 align-center mt-2">
        <v-text-field
          v-model="draft"
          density="compact"
          placeholder="Ответить клиенту"
          hide-details
          :disabled="sending"
          @keyup.enter="send"
        />
        <v-btn
          icon="mdi-send"
          size="small"
          variant="tonal"
          color="primary"
          :loading="sending"
          :disabled="!draft.trim()"
          aria-label="Отправить ответ"
          @click="send"
        />
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useTrainingStore } from '~/stores/training'

definePageMeta({ title: 'Тренировка клиента' })

const route = useRoute()
const store = useTrainingStore()

const sessionId = computed(() => String(route.params.id || ''))
const session = ref<{ id: string; date: string; comment?: string; rpe?: number; training_day: string; user: string } | null>(null)
const entries = ref<Array<{ id: string; exercise: string; working_weight: number | null; target_reps: number | null; reps: number[]; pain_level: number | null; note?: string }>>([])
const loading = ref(true)
const error = ref('')
const sending = ref(false)
const draft = ref('')

const clientId = computed(() => session.value?.user || '')
const clientName = computed(() => store.clients.find((c) => c.id === clientId.value)?.name || 'Клиент')
const dayTitle = computed(() => store.days.find((d) => d.id === session.value?.training_day)?.name || 'Тренировка')
const comments = computed(() => store.commentsBySession[sessionId.value] || [])

function exerciseName(id: string) {
  const list = store.exercisesByDay[session.value?.training_day || ''] || []
  return list.find((e) => e.id === id)?.name || 'Упражнение'
}

function formatDate(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function send() {
  const text = draft.value.trim()
  if (!text || sending.value) return
  sending.value = true
  error.value = ''
  try {
    await store.addComment(sessionId.value, text)
    draft.value = ''
  } catch (e: any) {
    error.value = e?.message || 'Не удалось отправить сообщение'
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const pb = useNuxtApp().$pb as any
    session.value = await pb.collection('sessions').getOne(sessionId.value)
    const list = await pb.collection('exercise_entries').getFullList({
      filter: `session = "${sessionId.value}"`,
      sort: 'created'
    })
    entries.value = list
    if (!store.days.length) await store.fetchDays()
    if (!store.clients.length) await store.fetchClients()
    await store.fetchExercises(session.value?.training_day || '')
    await store.fetchComments([sessionId.value])
    await store.markSessionRead(sessionId.value).catch(() => {})
  } catch (e: any) {
    error.value = e?.message || 'Не удалось загрузить тренировку'
  } finally {
    loading.value = false
  }
})
</script>
