import type PocketBase from 'pocketbase'
import { defineStore } from 'pinia'

export interface TrainingDay {
  id: string
  name: string
  sort_order: number
}

export interface Exercise {
  id: string
  training_day: string
  name: string
  sort_order: number
  sets_count: number
  muscle_group: string
  default_rest: number | null
}

export interface SessionRecord {
  id: string
  training_day: string
  date: string
  comment: string
  rpe: number | null
  user: string
  created: string
}

export interface ExerciseEntry {
  id: string
  session: string
  exercise: string
  user: string
  working_weight: number | null
  target_reps: number | null
  reps: number[]
  pain_level: number | null
  note: string
}

export interface ClientProgram {
  id: string
  client: string
  training_day: string
  active?: boolean
}

export interface SessionComment {
  id: string
  session: string
  author: string
  text: string
  created: string
}

export interface CoachClient {
  id: string
  name: string
  email: string
}

function pb(): PocketBase {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$pb as PocketBase
}

export const useTrainingStore = defineStore('training', {
  state: () => ({
    days: [] as TrainingDay[],
    myProgramDayIds: [] as string[],
    commentsBySession: {} as Record<string, SessionComment[]>,
    sessionsByClient: {} as Record<string, SessionRecord[]>,
    unreadBySession: {} as Record<string, number>,
    unreadByClient: {} as Record<string, number>,
    unreadTotal: 0,
    clients: [] as CoachClient[],
    programsByClient: {} as Record<string, ClientProgram[]>,
    exercisesByDay: {} as Record<string, Exercise[]>,
    sessionsByDay: {} as Record<string, SessionRecord[]>,
    entriesBySession: {} as Record<string, ExerciseEntry[]>,
    loading: false,
    error: '' as string
  }),

  getters: {
    dayById: (state) => (id: string) => state.days.find((d) => d.id === id)
  },

  actions: {
    async fetchDays() {
      this.loading = true
      this.error = ''
      try {
        const list = await pb().collection('training_days').getFullList<TrainingDay>({
          sort: 'sort_order,name'
        })
        this.days = list
      } catch (e: any) {
        this.error = e?.message || 'Не удалось загрузить тренировочные дни'
      } finally {
        this.loading = false
      }
    },

    async createDay(name: string) {
      const sortOrder = this.days.length
        ? Math.max(...this.days.map((d) => d.sort_order || 0)) + 1
        : 1
      const record = await pb().collection('training_days').create<TrainingDay>({
        name,
        sort_order: sortOrder
      })
      this.days.push(record)
      return record
    },

    async fetchExercises(dayId: string) {
      const list = await pb().collection('exercises').getFullList<Exercise>({
        filter: `training_day = "${dayId}"`,
        sort: 'sort_order,name'
      })
      this.exercisesByDay[dayId] = list
      return list
    },

    async createExercise(dayId: string, name: string, setsCount = 4, muscleGroup = '', defaultRest = 90) {
      const existing = this.exercisesByDay[dayId] || []
      const sortOrder = existing.length
        ? Math.max(...existing.map((e) => e.sort_order || 0)) + 1
        : 1
      const record = await pb().collection('exercises').create<Exercise>({
        training_day: dayId,
        name,
        sort_order: sortOrder,
        sets_count: setsCount,
      muscle_group: muscleGroup,
      default_rest: defaultRest
      })
      this.exercisesByDay[dayId] = [...existing, record]
      return record
    },

    async deleteExercise(dayId: string, exerciseId: string) {
      await pb().collection('exercises').delete(exerciseId)
      this.exercisesByDay[dayId] = (this.exercisesByDay[dayId] || []).filter((e) => e.id !== exerciseId)
    },

    async fetchSessions(dayId: string) {
      const list = await pb().collection('sessions').getFullList<SessionRecord>({
        filter: `training_day = "${dayId}"`,
        sort: '-date'
      })
      this.sessionsByDay[dayId] = list
      return list
    },

    async fetchEntriesForSessions(sessionIds: string[]) {
      if (!sessionIds.length) return
      const filter = sessionIds.map((id) => `session = "${id}"`).join(' || ')
      const list = await pb().collection('exercise_entries').getFullList<ExerciseEntry>({
        filter,
        sort: 'created'
      })
      const grouped: Record<string, ExerciseEntry[]> = {}
      for (const entry of list) {
        if (!grouped[entry.session]) grouped[entry.session] = []
        grouped[entry.session].push(entry)
      }
      Object.assign(this.entriesBySession, grouped)
    },

    // Возвращает карту exercise_id -> последняя запись (из самой свежей сессии дня).
    async fetchLastEntries(dayId: string): Promise<Record<string, ExerciseEntry>> {
      const sessions = await this.fetchSessions(dayId)
      if (!sessions.length) return {}
      const lastSession = sessions[0]
      await this.fetchEntriesForSessions([lastSession.id])
      const entries = this.entriesBySession[lastSession.id] || []
      const map: Record<string, ExerciseEntry> = {}
      for (const e of entries) {
        map[e.exercise] = e
      }
      return map
    },

    async createSession(dayId: string, date: string, comment: string, rpe: number | null = null) {
      const userId = pb().authStore.model?.id
      const record = await pb().collection('sessions').create<SessionRecord>({
        training_day: dayId,
        date,
        comment,
        rpe,
        user: userId
      })
      this.sessionsByDay[dayId] = [record, ...(this.sessionsByDay[dayId] || [])]
      return record
    },

    async createEntry(payload: {
      session: string
      exercise: string
      working_weight: number | null
      target_reps: number | null
      reps: number[]
      pain_level: number | null
      note: string
    }) {
      const userId = pb().authStore.model?.id
      const record = await pb().collection('exercise_entries').create<ExerciseEntry>({
        ...payload,
        user: userId
      })
      if (!this.entriesBySession[payload.session]) this.entriesBySession[payload.session] = []
      this.entriesBySession[payload.session].push(record)
      return record
    },

    async deleteSession(dayId: string, sessionId: string) {
      await pb().collection('sessions').delete(sessionId)
      this.sessionsByDay[dayId] = (this.sessionsByDay[dayId] || []).filter((s) => s.id !== sessionId)
      delete this.entriesBySession[sessionId]
    },

    async deleteDay(dayId: string) {
      await pb().collection('training_days').delete(dayId)
      this.days = this.days.filter((d) => d.id !== dayId)
      delete this.exercisesByDay[dayId]
      delete this.sessionsByDay[dayId]
    },

    // Клиент видит только те комплексы, которые ему назначил тренер.
    async fetchMyProgram() {
      const userId = pb().authStore.model?.id
      if (!userId) {
        this.myProgramDayIds = []
        return []
      }
      const list = await pb().collection('client_programs').getFullList<ClientProgram>({
        filter: `client = "${userId}" && active = true`
      })
      this.myProgramDayIds = list.map((p) => p.training_day)
      return list
    },

    async fetchClients() {
      this.loading = true
      this.error = ''
      try {
        const users = await pb().collection('users').getFullList<CoachClient>({
          filter: `role = "client"`,
          sort: 'name,email'
        })
        this.clients = users.map((u) => ({ id: u.id, name: u.name, email: u.email }))
        return this.clients
      } catch (e: any) {
        this.error = e?.message || 'Не удалось загрузить клиентов'
        return []
      } finally {
        this.loading = false
      }
    },

    async fetchClientPrograms(clientId: string) {
      const list = await pb().collection('client_programs').getFullList<ClientProgram>({
        filter: `client = "${clientId}"`
      })
      this.programsByClient[clientId] = list
      return list
    },

    // Тренировки конкретного клиента — для карточки у тренера.
    async fetchClientSessions(clientId: string) {
      const list = await pb().collection('sessions').getFullList<SessionRecord>({
        filter: `user = "${clientId}"`,
        sort: '-date'
      })
      this.sessionsByClient[clientId] = list
      return list
    },

    async fetchComments(sessionIds: string[]) {
      if (!sessionIds.length) return this.commentsBySession
      const filter = sessionIds.map((id) => `session = "${id}"`).join(' || ')
      const list = await pb().collection('session_comments').getFullList<SessionComment>({
        filter,
        sort: 'created'
      })
      const grouped: Record<string, SessionComment[]> = {}
      for (const comment of list) {
        if (!grouped[comment.session]) grouped[comment.session] = []
        grouped[comment.session].push(comment)
      }
      Object.assign(this.commentsBySession, grouped)
      return this.commentsBySession
    },

    async addComment(sessionId: string, text: string) {
      const author = pb().authStore.model?.id
      const record = await pb().collection('session_comments').create<SessionComment>({
        session: sessionId,
        author,
        text: text.trim()
      })
      this.commentsBySession[sessionId] = [...(this.commentsBySession[sessionId] || []), record]
      return record
    },

    // Счётчики непрочитанного: считаем чужие сообщения после отметки о прочтении.
    async fetchUnread() {
      const model = pb().authStore.model as { id?: string; role?: string } | null
      const me = model?.id || ''
      if (!me) {
        this.unreadBySession = {}
        this.unreadByClient = {}
        this.unreadTotal = 0
        return
      }
      const isCoach = model?.role === 'coach'
      const sessions = await pb().collection('sessions').getFullList<SessionRecord>({
        filter: isCoach ? '' : `user = "${me}"`,
        sort: '-date'
      })
      const ids = sessions.map((s) => s.id)
      const counts: Record<string, number> = {}
      if (ids.length) {
        const filter = ids.map((id) => `session = "${id}"`).join(' || ')
        const comments = await pb()
          .collection('session_comments')
          .getFullList<SessionComment>({ filter, sort: 'created' })
        const reads = await pb().collection('session_reads').getFullList<{
          id: string
          session: string
          last_read_at: string
        }>({ filter: `user = "${me}"` })
        const lastRead: Record<string, string> = {}
        for (const read of reads) lastRead[read.session] = read.last_read_at
        for (const comment of comments) {
          if (comment.author === me) continue
          const seen = lastRead[comment.session]
          if (!seen || comment.created > seen) {
            counts[comment.session] = (counts[comment.session] || 0) + 1
          }
        }
      }
      this.unreadBySession = counts
      const byClient: Record<string, number> = {}
      if (isCoach) {
        for (const session of sessions) {
          const n = counts[session.id] || 0
          if (n) byClient[session.user] = (byClient[session.user] || 0) + n
        }
      }
      this.unreadByClient = byClient
      this.unreadTotal = Object.values(counts).reduce((sum, n) => sum + n, 0)
    },

    async markSessionRead(sessionId: string) {
      const me = pb().authStore.model?.id
      if (!me || !sessionId) return
      const stamp = new Date().toISOString().replace('T', ' ')
      const existing = await pb()
        .collection('session_reads')
        .getFullList<{ id: string }>({
          filter: `user = "${me}" && session = "${sessionId}"`
        })
      if (existing.length) {
        await pb().collection('session_reads').update(existing[0].id, { last_read_at: stamp })
      } else {
        await pb()
          .collection('session_reads')
          .create({ user: me, session: sessionId, last_read_at: stamp })
      }
      if (this.unreadBySession[sessionId]) {
        const rest = { ...this.unreadBySession }
        delete rest[sessionId]
        this.unreadBySession = rest
        this.unreadTotal = Object.values(rest).reduce((sum, n) => sum + n, 0)
      }
    },

    async setClientProgram(clientId: string, dayId: string, assigned: boolean) {
      const current = this.programsByClient[clientId] || []
      const existing = current.find((p) => p.training_day === dayId)
      if (assigned && !existing) {
        const record = await pb().collection('client_programs').create<ClientProgram>({
          client: clientId,
          training_day: dayId,
          active: true
        })
        this.programsByClient[clientId] = [...current, record]
        return record
      }
      if (!assigned && existing) {
        await pb().collection('client_programs').delete(existing.id)
        this.programsByClient[clientId] = current.filter((p) => p.id !== existing.id)
        return null
      }
      return existing || null
    }
  }
})
