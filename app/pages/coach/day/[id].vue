<template>
  <div v-if="day">
    <div class="mb-4">
      <h1 class="text-h6 font-weight-bold">{{ day.name }}</h1>
      <div class="text-caption text-medium-emphasis">
        {{ exercises.length }} упражнени{{ pluralSuffix(exercises.length) }} — редактирование тренером
      </div>
    </div>

    <v-card class="pa-4 mb-6" variant="tonal">
      <div class="d-flex align-center justify-space-between mb-3">
        <span class="text-subtitle-2 font-weight-medium">Упражнения в комплексе</span>
        <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="dialog = true">
          Добавить
        </v-btn>
      </div>

      <v-list v-if="exercises.length" density="comfortable" bg-color="transparent">
        <v-list-item v-for="ex in exercises" :key="ex.id" class="px-0">
          <template #prepend>
            <v-icon icon="mdi-dumbbell" color="secondary" size="small" class="mt-1" />
          </template>
          <v-list-item-title>{{ ex.name }}</v-list-item-title>
          <v-list-item-subtitle>{{ ex.sets_count || 4 }} подход(ов)</v-list-item-subtitle>
          <template #append>
            <v-btn
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              color="error"
              @click="removeExercise(ex)"
            />
          </template>
        </v-list-item>
      </v-list>
      <div v-else class="text-caption text-medium-emphasis">
        Упражнения ещё не добавлены
      </div>
    </v-card>

    <v-dialog v-model="dialog" max-width="420">
      <v-card class="pa-4">
        <v-card-title class="px-0">Новое упражнение</v-card-title>
        <v-text-field v-model="newExerciseName" label="Название упражнения" autofocus />
        <v-text-field
          v-model.number="newExerciseSets"
          type="number"
          label="Количество подходов"
          min="1"
          max="10"
        />
        <v-card-actions class="px-0">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Отмена</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!newExerciseName.trim()"
            @click="submitExercise"
          >
            Добавить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useTrainingStore } from '~/stores/training'

definePageMeta({ title: 'Упражнения — тренер' })

const route = useRoute()
const dayId = computed(() => route.params.id as string)
const store = useTrainingStore()

const dialog = ref(false)
const newExerciseName = ref('')
const newExerciseSets = ref(4)

const day = computed(() => store.dayById(dayId.value))
const exercises = computed(() => store.exercisesByDay[dayId.value] || [])

function pluralSuffix(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'е'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'я'
  return 'й'
}

async function submitExercise() {
  if (!newExerciseName.value.trim()) return
  await store.createExercise(dayId.value, newExerciseName.value.trim(), newExerciseSets.value || 4)
  newExerciseName.value = ''
  newExerciseSets.value = 4
  dialog.value = false
}

async function removeExercise(ex: { id: string; name: string }) {
  if (!confirm(`Удалить упражнение «${ex.name}»?`)) return
  await store.deleteExercise(dayId.value, ex.id)
}

onMounted(async () => {
  if (!store.days.length) await store.fetchDays()
  if (!store.exercisesByDay[dayId.value]) await store.fetchExercises(dayId.value)
})
</script>
