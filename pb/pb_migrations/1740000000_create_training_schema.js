/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // ---- training_days ----------------------------------------------------
  const trainingDays = new Collection({
    type: 'base',
    name: 'training_days',
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
    fields: [
      { type: 'text', name: 'name', required: true, max: 200 },
      { type: 'number', name: 'sort_order', required: false },
      { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
    ],
    indexes: []
  })
  app.save(trainingDays)

  // ---- exercises ----------------------------------------------------------
  const exercises = new Collection({
    type: 'base',
    name: 'exercises',
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
    fields: [
      {
        type: 'relation',
        name: 'training_day',
        required: true,
        maxSelect: 1,
        collectionId: trainingDays.id,
        cascadeDelete: true
      },
      { type: 'text', name: 'name', required: true, max: 200 },
      { type: 'number', name: 'sort_order', required: false },
      { type: 'number', name: 'sets_count', required: false },
      { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
    ],
    indexes: []
  })
  app.save(exercises)

  // ---- sessions (одна тренировка/визит по дате) --------------------------
  const sessions = new Collection({
    type: 'base',
    name: 'sessions',
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
    fields: [
      {
        type: 'relation',
        name: 'training_day',
        required: true,
        maxSelect: 1,
        collectionId: trainingDays.id,
        cascadeDelete: true
      },
      { type: 'date', name: 'date', required: true },
      { type: 'text', name: 'comment', required: false, max: 2000 },
      { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
    ],
    indexes: []
  })
  app.save(sessions)

  // ---- exercise_entries (результаты по каждому упражнению за сессию) -----
  const exerciseEntries = new Collection({
    type: 'base',
    name: 'exercise_entries',
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
    fields: [
      {
        type: 'relation',
        name: 'session',
        required: true,
        maxSelect: 1,
        collectionId: sessions.id,
        cascadeDelete: true
      },
      {
        type: 'relation',
        name: 'exercise',
        required: true,
        maxSelect: 1,
        collectionId: exercises.id,
        cascadeDelete: true
      },
      { type: 'number', name: 'working_weight', required: false },
      { type: 'number', name: 'target_reps', required: false },
      { type: 'json', name: 'reps', required: false, maxSize: 2000 },
      { type: 'number', name: 'pain_level', required: false },
      { type: 'text', name: 'note', required: false, max: 2000 },
      { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
    ],
    indexes: []
  })
  app.save(exerciseEntries)
}, (app) => {
  const names = ['exercise_entries', 'sessions', 'exercises', 'training_days']
  for (const name of names) {
    try {
      const collection = app.findCollectionByNameOrId(name)
      app.delete(collection)
    } catch (e) {
      // collection may not exist, ignore
    }
  }
})
