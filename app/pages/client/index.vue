<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h6 font-weight-bold">Мои тренировки</h1>
        <div class="text-caption text-medium-emphasis">Режим клиента — отмечайте выполнение</div>
      </div>
      <v-btn
        icon="mdi-chart-line"
        size="small"
        variant="tonal"
        color="primary"
        to="/client/progress"
        aria-label="Прогресс"
      />
    </div>

    <v-card :to="'/client/progress'" class="pa-4 mb-4" elevation="2" variant="tonal">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center ga-3">
          <v-icon icon="mdi-chart-line" color="primary" />
          <div>
            <div class="text-subtitle-2 font-weight-medium">Прогресс</div>
            <div class="text-caption text-medium-emphasis">Объём, 1ПМ и личные рекорды</div>
          </div>
        </div>
        <v-icon icon="mdi-chevron-right" color="medium-emphasis" />
      </div>
    </v-card>

    <v-card :to="'/client/measurements'" class="pa-4 mb-4" elevation="2" variant="tonal">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center ga-3">
          <v-icon icon="mdi-human-male-height" color="primary" />
          <div>
            <div class="text-subtitle-2 font-weight-medium">Измерения тела</div>
            <div class="text-caption text-medium-emphasis">Вес, талия, грудь, бёдра и график</div>
          </div>
        </div>
        <v-icon icon="mdi-chevron-right" color="medium-emphasis" />
      </div>
    </v-card>

    <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4">
      {{ store.error }}
    </v-alert>

    <v-progress-linear v-if="store.loading" indeterminate class="mb-4" />

    <v-row v-if="!store.loading && visibleDays.length">
      <v-col v-for="day in visibleDays" :key="day.id" cols="12">
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
        Тренер пока не назначил вам ни одного комплекса. Как только назначит — он появится здесь.
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useTrainingStore } from '~/stores/training'

definePageMeta({ title: 'Мои тренировки' })

const store = useTrainingStore()

// Клиент видит только комплексы, назначенные ему тренером.
const visibleDays = computed(() =>
  store.days.filter((day) => store.myProgramDayIds.includes(day.id))
)

onMounted(async () => {
  await store.fetchDays()
  await store.fetchMyProgram()
})
</script>
