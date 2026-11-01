<template>
  <div class="d-flex align-center justify-center" style="min-height: 70vh">
    <v-card max-width="420" class="pa-6" elevation="2" style="width: 100%">
      <div class="d-flex align-center justify-center mb-4">
        <v-icon icon="mdi-dumbbell" size="40" color="primary" />
      </div>
      <h1 class="text-h6 font-weight-bold text-center mb-1">Тренировки</h1>
      <div class="text-caption text-medium-emphasis text-center mb-6">
        Войдите как тренер или клиент
      </div>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
        {{ error }}
      </v-alert>

      <v-text-field
        v-model="email"
        label="Email"
        type="email"
        autocomplete="username"
        autofocus
        @keyup.enter="submit"
      />
      <v-text-field
        v-model="password"
        label="Пароль"
        type="password"
        autocomplete="current-password"
        @keyup.enter="submit"
      />

      <v-btn
        block
        size="large"
        color="primary"
        variant="flat"
        :loading="loading"
        class="mt-2"
        @click="submit"
      >
        Войти
      </v-btn>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ title: 'Вход' })

const auth = useAuthStore()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  if (!email.value.trim() || !password.value) return
  loading.value = true
  error.value = ''
  try {
    await auth.login(email.value.trim(), password.value)
    await navigateTo(auth.isCoach ? '/coach' : '/client')
  } catch (e: any) {
    error.value = e?.message || 'Неверный email или пароль'
  } finally {
    loading.value = false
  }
}
</script>
