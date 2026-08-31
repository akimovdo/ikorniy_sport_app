import PocketBase from 'pocketbase'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const pb = new PocketBase(config.public.pocketbaseUrl as string)
  // Отключаем автоотмену запросов PocketBase, чтобы избежать AbortError
  // при параллельных обращениях из разных компонентов/сторов.
  pb.autoCancellation(false)

  return {
    provide: { pb }
  }
})
