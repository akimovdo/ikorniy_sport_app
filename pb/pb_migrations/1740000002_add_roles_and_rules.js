/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1) Добавляем поле role в коллекцию users (auth)
  const users = app.findCollectionByNameOrId('users')
  if (!users.fields.getByName('role')) {
    users.fields.add(
      new SelectField({
        name: 'role',
        values: ['coach', 'client'],
        maxSelect: 1,
        required: false
      })
    )
    app.save(users)
  }

  // Закрываем свободную регистрацию: аккаунты создаёт только суперпользователь.
  users.createRule = '@request.auth.role = "superadmin"'
  app.save(users)

  // 2) Права доступа по ролям
  const authRead = "@request.auth.id != ''"
  const coachWrite = "@request.auth.role = 'coach'"
  const clientWrite = "@request.auth.role = 'client'"

  // Тренер управляет комплексами и упражнениями; клиент и тренер читают.
  for (const name of ['training_days', 'exercises']) {
    const c = app.findCollectionByNameOrId(name)
    c.listRule = authRead
    c.viewRule = authRead
    c.createRule = coachWrite
    c.updateRule = coachWrite
    c.deleteRule = coachWrite
    app.save(c)
  }

  // Клиент создаёт/правит сессии и записи упражнений; тренер читает.
  for (const name of ['sessions', 'exercise_entries']) {
    const c = app.findCollectionByNameOrId(name)
    c.listRule = authRead
    c.viewRule = authRead
    c.createRule = clientWrite
    c.updateRule = clientWrite
    c.deleteRule = clientWrite
    app.save(c)
  }
}, (app) => {
  // Откат: снимаем поле role и возвращаем публичные правила (как было).
  const users = app.findCollectionByNameOrId('users')
  const roleField = users.fields.getByName('role')
  if (roleField) {
    users.fields.removeById(roleField.id)
    app.save(users)
  }
  users.createRule = ''
  app.save(users)

  for (const name of ['training_days', 'exercises', 'sessions', 'exercise_entries']) {
    const c = app.findCollectionByNameOrId(name)
    c.listRule = ''
    c.viewRule = ''
    c.createRule = ''
    c.updateRule = ''
    c.deleteRule = ''
    app.save(c)
  }
})
