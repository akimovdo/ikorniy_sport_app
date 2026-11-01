import type PocketBase from 'pocketbase'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'coach' | 'client' | ''
}

function pb(): PocketBase {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$pb as PocketBase
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    loading: false,
    error: ''
  }),

  getters: {
    isAuthenticated: (s) => !!s.user,
    role: (s) => s.user?.role || null,
    isCoach: (s) => s.user?.role === 'coach',
    isClient: (s) => s.user?.role === 'client'
  },

  actions: {
    init() {
      const p = pb()
      if (p.authStore.isValid && p.authStore.model) {
        this.user = p.authStore.model as unknown as AuthUser
      }
    },

    async login(email: string, password: string) {
      this.loading = true
      this.error = ''
      try {
        const res = await pb().collection('users').authWithPassword(email, password)
        this.user = res.record as unknown as AuthUser
        return res.record
      } catch (e: any) {
        this.error = e?.message || 'Не удалось войти'
        throw e
      } finally {
        this.loading = false
      }
    },

    logout() {
      pb().authStore.clear()
      this.user = null
      navigateTo('/login')
    }
  }
})
