/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Тренеру нужен список клиентов, чтобы показывать их измерения.
  // Правило только расширяется: клиент по-прежнему видит лишь себя.
  const users = app.findCollectionByNameOrId('users')
  users.listRule = "@request.auth.role = 'coach' || id = @request.auth.id"
  users.viewRule = "@request.auth.role = 'coach' || id = @request.auth.id"
  app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId('users')
  users.listRule = "id = @request.auth.id"
  users.viewRule = "id = @request.auth.id"
  app.save(users)
})
