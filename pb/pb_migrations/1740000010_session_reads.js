/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Отметка «до какого момента пользователь прочитал переписку по тренировке».
  // Нужна для счётчиков непрочитанных сообщений.
  const users = app.findCollectionByNameOrId('users')
  const sessions = app.findCollectionByNameOrId('sessions')

  const ownOnly = 'user = @request.auth.id'

  let reads = null
  try {
    reads = app.findCollectionByNameOrId('session_reads')
  } catch (e) {
    reads = null
  }

  if (!reads) {
    reads = new Collection({
      type: 'base',
      name: 'session_reads',
      listRule: ownOnly,
      viewRule: ownOnly,
      createRule: ownOnly,
      updateRule: ownOnly,
      deleteRule: ownOnly,
      fields: [
        {
          type: 'relation',
          name: 'user',
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true
        },
        {
          type: 'relation',
          name: 'session',
          required: true,
          maxSelect: 1,
          collectionId: sessions.id,
          cascadeDelete: true
        },
        { type: 'date', name: 'last_read_at', required: true },
        { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
        { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
      ],
      indexes: [
        'CREATE UNIQUE INDEX `idx_session_reads_unique` ON `session_reads` (`user`, `session`)'
      ]
    })
    app.save(reads)
  }

  reads.listRule = ownOnly
  reads.viewRule = ownOnly
  reads.createRule = ownOnly
  reads.updateRule = ownOnly
  reads.deleteRule = ownOnly
  app.save(reads)
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId('session_reads'))
  } catch (e) {
    // Коллекции уже нет — откат ничего не должен ломать.
  }
})
