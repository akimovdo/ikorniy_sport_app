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

function pb(): PocketBase {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$pb as PocketBase
}

export const useTrainingStore = defineStore('training', {
  state: () => ({
    days: [] as TrainingDay[],
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
    }
  }
})
