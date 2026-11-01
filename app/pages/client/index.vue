<template>
  <div>
    <div class="mb-4">
      <h1 class="text-h6 font-weight-bold">Мои тренировки</h1>
      <div class="text-caption text-medium-emphasis">Режим клиента — отмечайте выполнение</div>
    </div>

    <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4">
      {{ store.error }}
    </v-alert>

    <v-progress-linear v-if="store.loading" indeterminate class="mb-4" />

    <v-row v-if="!store.loading && store.days.length">
      <v-col v-for="day in store.days" :key="day.id" cols="12">
        <v-card :to="`/client/day/${day.id}`" class="pa-4" elevation="2">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-subtitle-1 font-weight-medium">{{ day.name }}</div>
              <div class="text-caption text-medium-emphasis">
                Открыть и отметить тренировку
              </div>
            </div>
            <v-icon icon="mdi-chevron-right" color="medium-emphasis" />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-else-if="!store.loading" class="pa-6 text-center" variant="tonal">
      <v-icon icon="mdi-dumbbell" size="40" class="mb-2" color="primary" />
      <div class="text-body-2 text-medium-emphasis">
        Пока нет назначенных тренировок. Обратитесь к тренеру.
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useTrainingStore } from '~/stores/training'

definePageMeta({ title: 'Мои тренировки' })

const store = useTrainingStore()

onMounted(() => {
  store.fetchDays()
})
</script>
