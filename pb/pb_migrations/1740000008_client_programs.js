/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Связка «тренер — клиент»: какой комплекс назначен какому клиенту.
  // До этого комплексы были общими для всех, и тренер не мог вести конкретного человека.
  const users = app.findCollectionByNameOrId('users')
  const days = app.findCollectionByNameOrId('training_days')

  const coachWrite = "@request.auth.role = 'coach'"
  const ownerRead = "@request.auth.role = 'coach' || client = @request.auth.id"

  let programs = null
  try {
    programs = app.findCollectionByNameOrId('client_programs')
  } catch (e) {
    programs = null
  }

  if (!programs) {
    programs = new Collection({
      type: 'base',
      name: 'client_programs',
      listRule: ownerRead,
      viewRule: ownerRead,
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
        {
          type: 'relation',
          name: 'training_day',
          required: true,
          maxSelect: 1,
          collectionId: days.id,
          cascadeDelete: true
        },
        {
          type: 'relation',
          name: 'coach',
          required: false,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: false
        },
        { type: 'bool', name: 'active' },
        { type: 'text', name: 'note', required: false, max: 500 },
        { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
        { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
      ],
      indexes: [
        'CREATE UNIQUE INDEX `idx_client_programs_unique` ON `client_programs` (`client`, `training_day`)'
      ]
    })
    app.save(programs)
  }

  // Правила выставляем всегда: коллекцию могли создать руками.
  programs.listRule = ownerRead
  programs.viewRule = ownerRead
  programs.createRule = coachWrite
  programs.updateRule = coachWrite
  programs.deleteRule = coachWrite
  app.save(programs)

  // Мягкий перенос: всем существующим клиентам назначаем все текущие комплексы,
  // чтобы после обновления никто не потерял доступ к своим тренировкам.
  const collection = app.findCollectionByNameOrId('client_programs')
  const clients = app.findRecordsByFilter('users', "role = 'client'", '', 1000, 0)
  const allDays = app.findRecordsByFilter('training_days', '', '', 1000, 0)
  for (const client of clients) {
    for (const day of allDays) {
      const existing = app.findRecordsByFilter(
        'client_programs',
        "client = '" + client.id + "' && training_day = '" + day.id + "'",
        '',
        1,
        0
      )
      if (existing.length) continue
      const record = new Record(collection)
      record.set('client', client.id)
      record.set('training_day', day.id)
      record.set('active', true)
      app.save(record)
    }
  }
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId('client_programs'))
  } catch (e) {
    // Коллекции уже нет — откат ничего не должен ломать.
  }
})
