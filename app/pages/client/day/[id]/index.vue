<template>
  <div v-if="day">
    <div class="mb-4">
      <h1 class="text-h6 font-weight-bold">{{ day.name }}</h1>
      <div class="text-caption text-medium-emphasis">
        {{ exercises.length }} упражнени{{ pluralSuffix(exercises.length) }}
      </div>
    </div>

    <v-card class="pa-4 mb-4" variant="tonal">
      <div class="text-subtitle-2 font-weight-medium mb-2">Упражнения комплекса</div>
      <v-chip
        v-for="ex in exercises"
        :key="ex.id"
        class="mr-2 mb-2"
        variant="flat"
        color="secondary"
        size="small"
      >
        {{ ex.name }}
      </v-chip>
      <div v-if="!exercises.length" class="text-caption text-medium-emphasis">
        Упражнения ещё не добавлены
      </div>
    </v-card>

    <v-btn
      block
      color="primary"
      size="large"
      variant="flat"
      prepend-icon="mdi-plus-circle"
      class="mb-6"
      :disabled="!exercises.length"
      :to="`/client/day/${day.id}/new`"
    >
      Отметить тренировку
    </v-btn>

    <h2 class="text-subtitle-1 font-weight-bold mb-2">История тренировок</h2>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-expansion-panels v-if="sessions.length" v-model="openPanels" variant="accordion" multiple class="mb-4">
      <v-expansion-panel v-for="session in sessions" :key="session.id" :value="session.id">
        <v-expansion-panel-title>
          <div class="d-flex align-center justify-space-between" style="width: 100%">
            <span class="font-weight-medium">{{ formatDate(session.date) }}</span>
            <div>
              <v-chip
                v-if="session.rpe"
                size="x-small"
                color="secondary"
                variant="flat"
                class="mr-2"
              >
                RPE {{ session.rpe }}
              </v-chip>
              <v-chip
                v-if="maxPain(session.id) >= 3"
                size="x-small"
                color="error"
                variant="flat"
                class="mr-2"
              >
                боль {{ maxPain(session.id) }}
              </v-chip>
            </div>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div v-for="entry in entriesFor(session.id)" :key="entry.id" class="mb-3">
            <div class="text-body-2 font-weight-medium">{{ exerciseName(entry.exercise) }}</div>
            <div class="text-caption text-medium-emphasis">
              Вес: {{ entry.working_weight ?? '—' }} · Цель повторений: {{ entry.target_reps ?? '—' }}
            </div>
            <div class="d-flex flex-wrap ga-1 mt-1">
              <v-chip
                v-for="(rep, idx) in entry.reps"
                :key="idx"
                size="x-small"
                variant="tonal"
              >
                П{{ idx + 1 }}: {{ rep }}
              </v-chip>
              <v-chip
                v-if="entry.pain_level"
                size="x-small"
                :color="entry.pain_level >= 3 ? 'error' : 'warning'"
                variant="flat"
              >
                боль {{ entry.pain_level }}
              </v-chip>
            </div>
            <div v-if="entry.note" class="text-caption mt-1">{{ entry.note }}</div>
          </div>
          <div v-if="session.comment" class="text-caption text-medium-emphasis mt-2">
            Комментарий: {{ session.comment }}
          </div>

          <v-divider class="my-3" />
          <div class="text-caption text-medium-emphasis mb-2">Обсуждение с тренером</div>
          <div v-for="comment in commentsFor(session.id)" :key="comment.id" class="mb-2">
            <div class="text-body-2">{{ comment.text }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ commentAuthor(comment) }} · {{ formatDateTime(comment.created) }}
            </div>
          </div>
          <div v-if="!commentsFor(session.id).length" class="text-caption text-medium-emphasis mb-2">
            Пока нет сообщений. Напишите тренеру — он ответит здесь же.
          </div>
          <div class="d-flex ga-2 align-center">
            <v-text-field
              v-model="drafts[session.id]"
              density="compact"
              placeholder="Написать тренеру"
              hide-details
              :disabled="sending === session.id"
              @keyup.enter="send(session.id)"
            />
            <v-btn
              icon="mdi-send"
              size="small"
              variant="tonal"
              color="primary"
              :loading="sending === session.id"
              :disabled="!(drafts[session.id] || '').trim()"
              aria-label="Отправить сообщение"
              @click="send(session.id)"
            />
          </div>

          <v-btn
            size="small"
            variant="text"
            color="error"
            class="mt-2"
            prepend-icon="mdi-delete-outline"
            @click="removeSession(session.id)"
          >
            Удалить
          </v-btn>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-card v-else-if="!loading" class="pa-6 text-center" variant="tonal">
      <div class="text-body-2 text-medium-emphasis">Ещё нет ни одной тренировки</div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useTrainingStore } from '~/stores/training'

definePageMeta({ title: 'Тренировка' })

const route = useRoute()
const dayId = computed(() => route.params.id as string)
const store = useTrainingStore()

const loading = ref(true)

const day = computed(() => store.dayById(dayId.value))
const exercises = computed(() => store.exercisesByDay[dayId.value] || [])
const sessions = computed(() => store.sessionsByDay[dayId.value] || [])

const drafts = reactive<Record<string, string>>({})
const sending = ref('')
const openPanels = ref<string[]>([])

watch(openPanels, (value, previous) => {
  const fresh = (value || []).filter((id) => !(previous || []).includes(id))
  for (const id of fresh) store.markSessionRead(id).catch(() => {})
})

const myId = computed(() => {
  const client = useNuxtApp().$pb as { authStore?: { model?: { id?: string } } }
  return client?.authStore?.model?.id || ''
})

function commentsFor(sessionId: string) {
  return store.commentsBySession[sessionId] || []
}

function commentAuthor(comment: { author: string }) {
  return comment.author === myId.value ? 'Вы' : 'Тренер'
}

function formatDateTime(value: string) {
  const d = new Date(value)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function send(sessionId: string) {
  const text = (drafts[sessionId] || '').trim()
  if (!text || sending.value) return
  sending.value = sessionId
  try {
    await store.addComment(sessionId, text)
    drafts[sessionId] = ''
  } finally {
    sending.value = ''
  }
}

function exerciseName(exerciseId: string) {
  return exercises.value.find((e) => e.id === exerciseId)?.name || 'Упражнение'
}

function entriesFor(sessionId: string) {
  return store.entriesBySession[sessionId] || []
}

function maxPain(sessionId: string) {
  const entries = entriesFor(sessionId)
  return entries.reduce((max, e) => Math.max(max, e.pain_level || 0), 0)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function pluralSuffix(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'е'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'я'
  return 'й'
}

async function removeSession(sessionId: string) {
  if (!confirm('Удалить эту тренировку?')) return
  await store.deleteSession(dayId.value, sessionId)
}

async function load() {
  loading.value = true
  if (!store.days.length) await store.fetchDays()
  await store.fetchExercises(dayId.value)
  const list = await store.fetchSessions(dayId.value)
  await store.fetchEntriesForSessions(list.map((s) => s.id))
  await store.fetchComments(list.map((s) => s.id))
  loading.value = false
}

onMounted(load)
</script>
