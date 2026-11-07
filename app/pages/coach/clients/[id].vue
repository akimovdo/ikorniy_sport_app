<template>
  <div>
    <div class="mb-4">
      <h1 class="text-h6 font-weight-bold">{{ clientName }}</h1>
      <div class="text-caption text-medium-emphasis">Программа клиента и его тренировки</div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <h2 class="text-subtitle-1 font-weight-bold mb-2">Назначить комплекс</h2>
    <v-row v-if="!loading && store.days.length">
      <v-col v-for="day in store.days" :key="day.id" cols="12">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center justify-space-between ga-3">
            <div class="flex-grow-1" style="min-width: 0">
              <div class="text-subtitle-2 font-weight-medium">{{ day.name }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ assigned(day.id) ? 'Назначен — правится ниже' : 'Не назначен' }}
              </div>
            </div>
            <v-btn
              size="small"
              :variant="assigned(day.id) ? 'text' : 'tonal'"
              :color="assigned(day.id) ? 'error' : 'primary'"
              :loading="busy === day.id"
              @click="assigned(day.id) ? unassign(day.id) : assign(day.id)"
            >
              {{ assigned(day.id) ? 'Снять' : 'Назначить' }}
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <h2 class="text-subtitle-1 font-weight-bold mt-6 mb-2">Программа клиента</h2>

    <div v-for="program in programDays" :key="program.id" class="mb-4">
      <v-card class="pa-4" elevation="2">
        <div class="d-flex align-center justify-space-between ga-2 mb-2">
          <div class="text-subtitle-1 font-weight-bold">{{ program.title }}</div>
          <v-btn
            size="small"
            variant="text"
            color="error"
            prepend-icon="mdi-delete-outline"
            @click="removeProgram(program)"
          >
            Удалить
          </v-btn>
        </div>

        <div v-for="item in itemsFor(program.id)" :key="item.id" class="mb-3">
          <div class="text-body-2 font-weight-medium mb-1">{{ item.name }}</div>
          <div class="d-flex flex-wrap ga-2 align-center">
            <v-text-field
              :model-value="item.sets_count"
              type="number"
              density="compact"
              label="Подходы"
              hide-details
              style="max-width: 110px"
              @update:model-value="(value) => patch(item, program.id, { sets_count: asNumber(value) })"
            />
            <v-text-field
              :model-value="item.target_reps"
              type="number"
              density="compact"
              label="Повторы"
              hide-details
              style="max-width: 110px"
              @update:model-value="(value) => patch(item, program.id, { target_reps: asNumber(value) })"
            />
            <v-text-field
              :model-value="item.weight"
              type="number"
              density="compact"
              label="Вес, кг"
              hide-details
              style="max-width: 110px"
              @update:model-value="(value) => patch(item, program.id, { weight: asNumber(value) })"
            />
            <v-btn
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              color="error"
              :aria-label="`Удалить упражнение «${item.name}»`"
              @click="deleteItem(item, program.id)"
            />
          </div>
        </div>

        <div class="d-flex ga-2 align-center mt-2">
          <v-text-field
            v-model="newItemName[program.id]"
            density="compact"
            placeholder="Добавить упражнение"
            hide-details
            @keyup.enter="addItem(program.id)"
          />
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            :disabled="!(newItemName[program.id] || '').trim()"
            @click="addItem(program.id)"
          >
            Добавить
          </v-btn>
        </div>
      </v-card>
    </div>

    <v-card v-if="!loading && !programDays.length" class="pa-6 text-center" variant="tonal">
      <div class="text-body-2 text-medium-emphasis">
        Программа пока не назначена — выберите комплекс выше.
      </div>
    </v-card>

    <h2 class="text-subtitle-1 font-weight-bold mt-6 mb-2">Тренировки клиента</h2>

    <v-progress-linear v-if="sessionsLoading" indeterminate class="mb-3" />

    <v-row v-if="clientSessions.length">
      <v-col v-for="session in clientSessions" :key="session.id" cols="12">
        <v-card :to="`/coach/session/${session.id}`" class="pa-4" elevation="2">
          <div class="d-flex align-center justify-space-between ga-3">
            <div class="flex-grow-1" style="min-width: 0">
              <div class="text-subtitle-2 font-weight-medium">{{ dayName(session.training_day) }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ formatDate(session.date) }}
                <template v-if="session.rpe"> · RPE {{ session.rpe }}</template>
              </div>
            </div>
            <v-badge
              v-if="unreadFor(session.id)"
              :content="unreadFor(session.id)"
              color="error"
            />
            <v-icon icon="mdi-chevron-right" color="medium-emphasis" />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-else-if="!sessionsLoading" class="pa-6 text-center" variant="tonal">
      <div class="text-body-2 text-medium-emphasis">
        Клиент ещё не отметил ни одной тренировки.
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
const busy = ref('')
const error = ref('')
const newItemName = reactive<Record<string, string>>({})

const clientName = computed(() => {
  const found = store.clients.find((c) => c.id === clientId.value)
  return found?.name || found?.email || 'Клиент'
})

const programDays = computed(() => store.programDaysByClient[clientId.value] || [])
const clientSessions = computed(() => store.sessionsByClient[clientId.value] || [])

function assigned(dayId: string) {
  return programDays.value.some((p) => p.source_day === dayId)
}

function itemsFor(programDayId: string) {
  return store.itemsByDay[programDayId] || []
}

function dayName(dayId: string) {
  return store.days.find((d) => d.id === dayId)?.name || 'Тренировка'
}

function unreadFor(sessionId: string) {
  return store.unreadBySession[sessionId] || 0
}

function asNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function assign(dayId: string) {
  busy.value = dayId
  error.value = ''
  try {
    await store.assignTemplate(clientId.value, dayId)
  } catch (e: any) {
    error.value = e?.message || 'Не удалось назначить комплекс'
  } finally {
    busy.value = ''
  }
}

async function unassign(dayId: string) {
  const program = programDays.value.find((p) => p.source_day === dayId)
  if (!program) return
  busy.value = dayId
  error.value = ''
  try {
    await store.removeProgramDay(clientId.value, program.id)
  } catch (e: any) {
    error.value = e?.message || 'Не удалось снять комплекс'
  } finally {
    busy.value = ''
  }
}

async function removeProgram(program: { id: string }) {
  error.value = ''
  try {
    await store.removeProgramDay(clientId.value, program.id)
  } catch (e: any) {
    error.value = e?.message || 'Не удалось удалить программу'
  }
}

async function patch(item: { id: string; name: string }, programDayId: string, values: Record<string, number | null>) {
  error.value = ''
  try {
    await store.updateProgramItem(item.id, programDayId, values)
  } catch (e: any) {
    error.value = e?.message || 'Не удалось сохранить упражнение'
  }
}

async function addItem(programDayId: string) {
  const name = (newItemName[programDayId] || '').trim()
  if (!name) return
  error.value = ''
  try {
    await store.addProgramItem(programDayId, { name })
    newItemName[programDayId] = ''
  } catch (e: any) {
    error.value = e?.message || 'Не удалось добавить упражнение'
  }
}

async function deleteItem(item: { id: string; name: string }, programDayId: string) {
  error.value = ''
  try {
    await store.deleteProgramItem(item.id, programDayId)
  } catch (e: any) {
    error.value = e?.message || 'Не удалось удалить упражнение'
  }
}

onMounted(async () => {
  loading.value = true
  try {
    if (!store.clients.length) await store.fetchClients()
    await store.fetchDays()
    await store.fetchClientProgramDays(clientId.value)
    await store.fetchUnread().catch(() => {})
  } finally {
    loading.value = false
  }

  sessionsLoading.value = true
  try {
    const sessions = await store.fetchClientSessions(clientId.value)
    await store.fetchComments(sessions.map((s) => s.id))
  } finally {
    sessionsLoading.value = false
  }
})
</script>
