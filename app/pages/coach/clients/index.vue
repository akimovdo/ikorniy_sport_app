<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h6 font-weight-bold">Клиенты</h1>
        <div class="text-caption text-medium-emphasis">Кому назначены комплексы</div>
      </div>
      <v-btn
        icon="mdi-refresh"
        size="small"
        variant="tonal"
        color="primary"
        aria-label="Обновить"
        @click="load"
      />
    </div>

    <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4">
      {{ store.error }}
    </v-alert>

    <v-progress-linear v-if="store.loading" indeterminate class="mb-4" />

    <v-row v-if="!store.loading && store.clients.length">
      <v-col v-for="client in store.clients" :key="client.id" cols="12">
        <v-card :to="`/coach/clients/${client.id}`" class="pa-4" elevation="2">
          <div class="d-flex align-center justify-space-between ga-3">
            <div class="flex-grow-1" style="min-width: 0">
              <div class="text-subtitle-2 font-weight-medium text-truncate">
                {{ client.name || 'Без имени' }}
              </div>
              <div class="text-caption text-medium-emphasis text-truncate">
                {{ client.email }}
              </div>
            </div>
            <v-chip size="small" variant="tonal" color="primary">
              {{ countFor(client.id) }}
            </v-chip>
            <v-icon icon="mdi-chevron-right" color="medium-emphasis" />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-else-if="!store.loading" class="pa-6 text-center" variant="tonal">
      <v-icon icon="mdi-account-group" size="40" class="mb-2" color="primary" />
      <div class="text-body-2 text-medium-emphasis">
        Пока нет клиентов. Клиент появится здесь после регистрации.
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useTrainingStore } from '~/stores/training'

definePageMeta({ title: 'Клиенты' })

const store = useTrainingStore()

function countFor(clientId: string) {
  return (store.programsByClient[clientId] || []).length
}

async function load() {
  await store.fetchClients()
  await Promise.all(store.clients.map((c) => store.fetchClientPrograms(c.id)))
}

onMounted(load)
</script>
