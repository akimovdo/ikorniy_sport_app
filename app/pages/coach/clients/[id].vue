<template>
  <div>
    <div class="mb-4">
      <h1 class="text-h6 font-weight-bold">{{ clientName }}</h1>
      <div class="text-caption text-medium-emphasis">Комплексы клиента и переписка по тренировкам</div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-row v-if="!loading && store.days.length">
      <v-col v-for="day in store.days" :key="day.id" cols="12">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center justify-space-between ga-3">
            <div class="flex-grow-1" style="min-width: 0">
              <div class="text-subtitle-2 font-weight-medium">{{ day.name }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ assigned(day.id) ? 'Назначен' : 'Не назначен' }}
              </div>
            </div>
            <v-switch
              :model-value="assigned(day.id)"
              color="primary"
              hide-details
              inset
              :aria-label="`Назначить комплекс «${day.name}»`"
              :disabled="saving === day.id"
              @update:model-value="(value) => toggle(day.id, Boolean(value))"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-else-if="!loading" class="pa-6 text-center" variant="tonal">
      <v-icon icon="mdi-dumbbell" size="40" class="mb-2" color="primary" />
      <div class="text-body-2 text-medium-emphasis">
        Сначала создайте комплексы упражнений на главном экране тренера.
      </div>
    </v-card>

    <h2 class="text-subtitle-1 font-weight-bold mt-6 mb-2">Тренировки и переписка</h2>

    <v-progress-linear v-if="sessionsLoading" indeterminate class="mb-3" />

    <div v-for="session in clientSessions" :key="session.id" class="mb-3">
      <v-card class="pa-4" elevation="2">
        <div class="d-flex align-center justify-space-between ga-2 mb-1">
          <div class="text-subtitle-2 font-weight-medium">{{ dayName(session.training_day) }}</div>
          <div class="text-caption text-medium-emphasis">{{ formatDate(session.date) }}</div>
        </div>
        <div v-if="session.comment" class="text-caption text-medium-emphasis mb-2">
          Комментарий клиента: {{ session.comment }}
        </div>

        <v-divider class="my-2" />

        <div v-for="comment in commentsFor(session.id)" :key="comment.id" class="mb-2">
          <div class="text-body-2">{{ comment.text }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ comment.author === clientId ? 'Клиент' : 'Вы' }} · {{ formatDateTime(comment.created) }}
          </div>
        </div>
        <div v-if="!commentsFor(session.id).length" class="text-caption text-medium-emphasis mb-2">
          Пока нет сообщений по этой тренировке.
        </div>

        <div class="d-flex ga-2 align-center">
          <v-text-field
            v-model="drafts[session.id]"
            density="compact"
            placeholder="Ответить клиенту"
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
            aria-label="Отправить ответ"
            @click="send(session.id)"
          />
        </div>
      </v-card>
    </div>

    <v-card v-if="!sessionsLoading && !clientSessions.length" class="pa-6 text-center" variant="tonal">
      <div class="text-body-2 text-medium-emphasis">
        Клиент ещё не отметил ни одной тренировки — переписки пока нет.
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useTrainingStore } from '~/stores/training'

definePageMeta({ title: 'Клиент' })

const route = useRoute()
const store = useTrainingStore()

const clientId = computed(() => String(route.params.id || ''))
const loading = ref(true)
const sessionsLoading = ref(true)
const saving = ref('')
const sending = ref('')
const error = ref('')
const drafts = reactive<Record<string, string>>({})

const clientName = computed(() => {
  const found = store.clients.find((c) => c.id === clientId.value)
  return found?.name || found?.email || 'Клиент'
})

const clientSessions = computed(() => store.sessionsByClient[clientId.value] || [])

function assigned(dayId: string) {
  return (store.programsByClient[clientId.value] || []).some((p) => p.training_day === dayId)
}

function dayName(dayId: string) {
  return store.days.find((d) => d.id === dayId)?.name || 'Тренировка'
}

function commentsFor(sessionId: string) {
  return store.commentsBySession[sessionId] || []
}

function formatDate(value: string) {
  const d = new Date(value)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

async function toggle(dayId: string, value: boolean) {
  saving.value = dayId
  error.value = ''
  try {
    await store.setClientProgram(clientId.value, dayId, value)
  } catch (e: any) {
    error.value = e?.message || 'Не удалось сохранить назначение'
  } finally {
    saving.value = ''
  }
}

async function send(sessionId: string) {
  const text = (drafts[sessionId] || '').trim()
  if (!text || sending.value) return
  sending.value = sessionId
  error.value = ''
  try {
    await store.addComment(sessionId, text)
    drafts[sessionId] = ''
  } catch (e: any) {
    error.value = e?.message || 'Не удалось отправить сообщение'
  } finally {
    sending.value = ''
  }
}

onMounted(async () => {
  loading.value = true
  try {
    if (!store.clients.length) await store.fetchClients()
    await store.fetchDays()
    await store.fetchClientPrograms(clientId.value)
  } finally {
    loading.value = false
  }

  sessionsLoading.value = true
  try {
    const sessions = await store.fetchClientSessions(clientId.value)
    await store.fetchComments(sessions.map((s) => s.id))
    // Тренер открыл карточку — переписка по этим тренировкам считается прочитанной.
    for (const session of sessions) {
      await store.markSessionRead(session.id).catch(() => {})
    }
  } finally {
    sessionsLoading.value = false
  }
})
</script>
