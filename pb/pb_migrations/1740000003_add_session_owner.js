/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId('users')

  // 1) sessions: добавляем владельца (relation на users) и правила владения
  const sessions = app.findCollectionByNameOrId('sessions')
  if (!sessions.fields.getByName('user')) {
    sessions.fields.add(
      new RelationField({
        name: 'user',
        collectionId: users.id,
        maxSelect: 1,
        required: false
      })
    )
  }
  const ownerRead = "@request.auth.role = 'coach' || user = @request.auth.id"
  const ownerWrite = "@request.auth.role = 'client' && user = @request.auth.id"
  sessions.listRule = ownerRead
  sessions.viewRule = ownerRead
  sessions.createRule = ownerWrite
  sessions.updateRule = ownerWrite
  sessions.deleteRule = ownerWrite
  app.save(sessions)

  // 2) exercise_entries: то же самое (владелец денормализован для простых правил)
  const entries = app.findCollectionByNameOrId('exercise_entries')
  if (!entries.fields.getByName('user')) {
    entries.fields.add(
      new RelationField({
        name: 'user',
        collectionId: users.id,
        maxSelect: 1,
        required: false
      })
    )
  }
  entries.listRule = ownerRead
  entries.viewRule = ownerRead
  entries.createRule = ownerWrite
  entries.updateRule = ownerWrite
  entries.deleteRule = ownerWrite
  app.save(entries)
}, (app) => {
  // Откат: снимаем поле user и возвращаем роль-based правила.
  const sessions = app.findCollectionByNameOrId('sessions')
  const su = sessions.fields.getByName('user')
  if (su) sessions.fields.removeById(su.id)
  sessions.listRule = "@request.auth.id != ''"
  sessions.viewRule = "@request.auth.id != ''"
  sessions.createRule = "@request.auth.role = 'client'"
  sessions.updateRule = "@request.auth.role = 'client'"
  sessions.deleteRule = "@request.auth.role = 'client'"
  app.save(sessions)

  const entries = app.findCollectionByNameOrId('exercise_entries')
  const eu = entries.fields.getByName('user')
  if (eu) entries.fields.removeById(eu.id)
  entries.listRule = "@request.auth.id != ''"
  entries.viewRule = "@request.auth.id != ''"
  entries.createRule = "@request.auth.role = 'client'"
  entries.updateRule = "@request.auth.role = 'client'"
  entries.deleteRule = "@request.auth.role = 'client'"
  app.save(entries)
})
