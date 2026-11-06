/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Коллекция измерений тела: вес, талия, грудь, бёдра.
  // Идемпотентна: если коллекция уже есть — только досоздаём недостающие поля.
  let measurements = null
  try {
    measurements = app.findCollectionByNameOrId('measurements')
  } catch (e) {
    measurements = null
  }

  const users = app.findCollectionByNameOrId('users')
  const ownerRead = "@request.auth.role = 'coach' || user = @request.auth.id"
  const ownerWrite = "@request.auth.role = 'client' && user = @request.auth.id"

  if (!measurements) {
    measurements = new Collection({
      type: 'base',
      name: 'measurements',
      listRule: ownerRead,
      viewRule: ownerRead,
      createRule: ownerWrite,
      updateRule: ownerWrite,
      deleteRule: ownerWrite,
      fields: [
        {
          type: 'relation',
          name: 'user',
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true
        },
        { type: 'date', name: 'date', required: true },
        { type: 'number', name: 'weight', required: false },
        { type: 'number', name: 'waist', required: false },
        { type: 'number', name: 'chest', required: false },
        { type: 'number', name: 'hips', required: false },
        { type: 'text', name: 'note', required: false, max: 1000 },
        { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
        { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
      ],
      indexes: [
        'CREATE INDEX `idx_measurements_user_date` ON `measurements` (`user`, `date`)'
      ]
    })
    app.save(measurements)
  } else {
    let changed = false
    const wanted = [
      { type: 'number', name: 'weight' },
      { type: 'number', name: 'waist' },
      { type: 'number', name: 'chest' },
      { type: 'number', name: 'hips' }
    ]
    for (const field of wanted) {
      if (!measurements.fields.getByName(field.name)) {
        measurements.fields.add(new Field(field))
        changed = true
      }
    }
    if (!measurements.fields.getByName('note')) {
      measurements.fields.add(new TextField({ name: 'note', required: false, max: 1000 }))
      changed = true
    }
    if (changed) app.save(measurements)
  }

  // Правила владения выставляем всегда — на случай, если коллекцию создавали руками.
  measurements.listRule = ownerRead
  measurements.viewRule = ownerRead
  measurements.createRule = ownerWrite
  measurements.updateRule = ownerWrite
  measurements.deleteRule = ownerWrite
  app.save(measurements)
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId('measurements')
    app.delete(collection)
  } catch (e) {
    // Коллекции уже нет — откат ничего не должен ломать.
  }
})
