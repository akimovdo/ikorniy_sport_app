<template>
  <v-app>
    <v-app-bar flat density="comfortable" color="surface">
      <v-app-bar-nav-icon
        v-if="showBack"
        icon="mdi-arrow-left"
        @click="$router.back()"
      />
      <v-toolbar-title class="text-subtitle-1 font-weight-bold">
        {{ title }}
      </v-toolbar-title>
    </v-app-bar>

    <v-main>
      <v-container class="pb-8" style="max-width: 560px">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
const route = useRoute()
const showBack = computed(() => route.path !== '/')
const title = computed(() => (route.meta.title as string) || 'Тренировки')
</script>
