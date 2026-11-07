<template>
  <v-app>
    <v-app-bar flat density="comfortable" color="surface">
      <v-app-bar-nav-icon
        v-if="showBack"
        icon="mdi-arrow-left"
        aria-label="Назад"
        @click="goBack"
      />
      <v-toolbar-title class="text-subtitle-1 font-weight-bold">
        {{ title }}
      </v-toolbar-title>

      <v-menu v-if="auth.isAuthenticated" location="bottom end">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-account-circle"
            variant="text"
            :aria-label="userLabel"
          />
        </template>
        <v-list density="compact" min-width="220">
          <v-list-item
            :title="auth.user?.name || 'Пользователь'"
            :subtitle="roleLabel"
          />
          <v-divider class="my-1" />
          <v-list-item
            prepend-icon="mdi-logout"
            title="Выйти"
            @click="confirmLogout = true"
          />
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main>
      <v-container class="pb-8" style="max-width: 560px">
        <slot />
      </v-container>
    </v-main>

    <v-dialog v-model="confirmLogout" max-width="360">
      <v-card class="pa-4">
        <v-card-title class="px-0 text-subtitle-1">Выйти из аккаунта?</v-card-title>
        <v-card-text class="px-0 text-body-2">
          Вы выйдете из аккаунта «{{ auth.user?.name || '' }}» и вернётесь на экран входа.
        </v-card-text>
        <v-card-actions class="px-0">
          <v-spacer />
          <v-btn variant="text" @click="confirmLogout = false">Отмена</v-btn>
          <v-btn color="primary" variant="flat" @click="doLogout">Выйти</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const confirmLogout = ref(false)

const homePath = computed(() => (auth.isCoach ? '/coach' : '/client'))
const isRoleRoot = computed(() => route.path === '/coach' || route.path === '/client')
const showBack = computed(
  () => route.path !== '/' && route.path !== '/login' && !isRoleRoot.value
)
const title = computed(() => (route.meta.title as string) || 'Тренировки')
const roleLabel = computed(() => (auth.isCoach ? 'Тренер' : auth.isClient ? 'Клиент' : ''))
const userLabel = computed(
  () => `${auth.user?.name || 'Аккаунт'}${roleLabel.value ? ', ' + roleLabel.value : ''}`
)

function goBack() {
  // history.state.back пуст, если страницу открыли напрямую (ссылка, после логина):
  // в этом случае router.back() уводит в пустоту, поэтому ведём на домашний экран роли.
  const back = (router.options.history.state as { back?: string | null } | null)?.back
  if (back) router.back()
  else navigateTo(homePath.value)
}

function doLogout() {
  confirmLogout.value = false
  auth.logout()
}
</script>
