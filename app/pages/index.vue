<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h6 font-weight-bold">Комплексы упражнений</h1>
      <v-btn icon="mdi-plus" size="small" variant="tonal" color="primary" @click="dialog = true" />
    </div>

    <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4">
      {{ store.error }}
    </v-alert>

    <v-progress-linear v-if="store.loading" indeterminate class="mb-4" />

    <v-row v-if="!store.loading && store.days.length">
      <v-col v-for="day in store.days" :key="day.id" cols="12">
        <v-card :to="`/day/${day.id}`" class="pa-4" elevation="2">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-subtitle-1 font-weight-medium">{{ day.name }}</div>
              <div class="text-caption text-medium-emphasis">
                Открыть тренировки и добавить новую запись
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
        Пока нет комплексов упражнений. Добавьте первый, чтобы начать вести записи.
      </div>
    </v-card>

    <v-dialog v-model="dialog" max-width="420">
      <v-card class="pa-4">
        <v-card-title class="px-0">Новый комплекс упражнений</v-card-title>
        <v-text-field
          v-model="newDayName"
          label="Название (например, Ноги, Верх тела, Кор)"
          autofocus
          @keyup.enter="submit"
        />
        <v-card-actions class="px-0">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Отмена</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!newDayName.trim()" @click="submit">
            Создать
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useTrainingStore } from '~/stores/training'

const store = useTrainingStore()
const dialog = ref(false)
const newDayName = ref('')

async function submit() {
  if (!newDayName.value.trim()) return
  await store.createDay(newDayName.value.trim())
  newDayName.value = ''
  dialog.value = false
}

onMounted(() => {
  store.fetchDays()
})
</script>
