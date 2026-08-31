/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const sessions = app.findCollectionByNameOrId('sessions')
  sessions.fields.add(new Field({
    type: 'number',
    name: 'difficulty',
    required: false,
    min: 0,
    max: 10
  }))
  app.save(sessions)
}, (app) => {
  const sessions = app.findCollectionByNameOrId('sessions')
  const field = sessions.fields.getByName('difficulty')
  if (field) {
    sessions.fields.removeById(field.id)
    app.save(sessions)
  }
})
