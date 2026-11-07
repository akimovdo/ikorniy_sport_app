/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Снимок программы, выданной клиенту: шаблон остаётся шаблоном,
  // а назначенная программа живёт отдельно и не меняется при правке шаблона.
  const users = app.findCollectionByNameOrId('users')
  const days = app.findCollectionByNameOrId('training_days')

  const coachWrite = "@request.auth.role = 'coach'"
  const daysRead = "@request.auth.role = 'coach' || client = @request.auth.id"
  const itemsRead = "@request.auth.role = 'coach' || program_day.client = @request.auth.id"

  function ensureCollection(name, config) {
    try {
      app.findCollectionByNameOrId(name)
    } catch (e) {
      app.save(new Collection(Object.assign({ type: 'base', name: name }, config)))
    }
    const collection = app.findCollectionByNameOrId(name)
    collection.listRule = config.listRule
    collection.viewRule = config.viewRule
    collection.createRule = config.createRule
    collection.updateRule = config.updateRule
    collection.deleteRule = config.deleteRule
    app.save(collection)
    return collection
  }

  const programDays = ensureCollection('client_program_days', {
    listRule: daysRead,
    viewRule: daysRead,
    createRule: coachWrite,
    updateRule: coachWrite,
    deleteRule: coachWrite,
    fields: [
      {
        type: 'relation',
        name: 'client',
        required: true,
        maxSelect: 1,
        collectionId: users.id,
        cascadeDelete: true
      },
      { type: 'text', name: 'title', required: true, max: 200 },
      {
        type: 'relation',
        name: 'source_day',
        required: false,
        maxSelect: 1,
        collectionId: days.id,
        cascadeDelete: false
      },
      { type: 'bool', name: 'active' },
      { type: 'date', name: 'assigned_at', required: false },
      { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
    ]
  })

  const programItems = ensureCollection('client_program_items', {
    listRule: itemsRead,
    viewRule: itemsRead,
    createRule: coachWrite,
    updateRule: coachWrite,
    deleteRule: coachWrite,
    fields: [
      {
        type: 'relation',
        name: 'program_day',
        required: true,
        maxSelect: 1,
        collectionId: programDays.id,
        cascadeDelete: true
      },
      { type: 'text', name: 'name', required: true, max: 200 },
      { type: 'number', name: 'sets_count', required: false },
      { type: 'number', name: 'target_reps', required: false },
      { type: 'number', name: 'weight', required: false },
      { type: 'number', name: 'rest_seconds', required: false },
      { type: 'number', name: 'sort_order', required: false },
      { type: 'text', name: 'note', required: false, max: 500 },
      { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
    ]
  })

  // Переносим текущие назначения (указатели на шаблон) в снимки.
  let oldAssignments = []
  try {
    oldAssignments = app.findRecordsByFilter('client_programs', '', '', 2000, 0)
  } catch (e) {
    oldAssignments = []
  }

  const daysCollection = app.findCollectionByNameOrId('client_program_days')
  const itemsCollection = app.findCollectionByNameOrId('client_program_items')

  for (const assignment of oldAssignments) {
    const clientId = assignment.getString('client')
    const dayId = assignment.getString('training_day')
    if (!clientId || !dayId) continue

    const already = app.findRecordsByFilter(
      'client_program_days',
      "client = '" + clientId + "' && source_day = '" + dayId + "'",
      '',
      1,
      0
    )
    if (already.length) continue

    let dayRecord = null
    try {
      dayRecord = app.findRecordById('training_days', dayId)
    } catch (e) {
      continue
    }

    const programDay = new Record(daysCollection)
    programDay.set('client', clientId)
    programDay.set('title', dayRecord.getString('name') || 'Программа')
    programDay.set('source_day', dayId)
    programDay.set('active', true)
    app.save(programDay)

    const templateExercises = app.findRecordsByFilter(
      'exercises',
      "training_day = '" + dayId + "'",
      'sort_order,name',
      200,
      0
    )
    for (const exercise of templateExercises) {
      const item = new Record(itemsCollection)
      item.set('program_day', programDay.id)
      item.set('name', exercise.getString('name') || 'Упражнение')
      item.set('sets_count', exercise.getInt('sets_count') || 4)
      item.set('rest_seconds', exercise.getInt('default_rest') || 90)
      item.set('sort_order', exercise.getInt('sort_order') || 0)
      app.save(item)
    }
  }
}, (app) => {
  for (const name of ['client_program_items', 'client_program_days']) {
    try {
      app.delete(app.findCollectionByNameOrId(name))
    } catch (e) {
      // Коллекции уже нет — откат ничего не должен ломать.
    }
  }
})
