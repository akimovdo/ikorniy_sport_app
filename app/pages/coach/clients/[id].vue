<template>
  <div>
    <div class="mb-4">
      <h1 class="text-h6 font-weight-bold">{{ clientName }}</h1>
      <div class="text-caption text-medium-emphasis">Назначьте комплексы, которые ведёт клиент</div>
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
  </div>
</template>

<script setup lang="ts">
import { useTrainingStore } from '~/stores/training'

definePageMeta({ title: 'Клиент' })

const route = useRoute()
const store = useTrainingStore()

const clientId = computed(() => String(route.params.id || ''))
const loading = ref(true)
const saving = ref('')
const error = ref('')

const clientName = computed(() => {
  const found = store.clients.find((c) => c.id === clientId.value)
  return found?.name || found?.email || 'Клиент'
})

function assigned(dayId: string) {
  return (store.programsByClient[clientId.value] || []).some((p) => p.training_day === dayId)
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

onMounted(async () => {
  loading.value = true
  try {
    if (!store.clients.length) await store.fetchClients()
    await store.fetchDays()
    await store.fetchClientPrograms(clientId.value)
  } finally {
    loading.value = false
  }
})
</script>
