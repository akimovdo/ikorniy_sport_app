export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  auth.init()

  const isLogin = to.path === '/login'

  if (!auth.isAuthenticated) {
    return isLogin ? undefined : navigateTo('/login')
  }

  if (isLogin) {
    return navigateTo(auth.isCoach ? '/coach' : '/client')
  }

  if (to.path === '/') {
    return navigateTo(auth.isCoach ? '/coach' : '/client')
  }

  if (auth.isCoach && to.path.startsWith('/client')) {
    return navigateTo('/coach')
  }
  if (auth.isClient && to.path.startsWith('/coach')) {
    return navigateTo('/client')
  }
})
