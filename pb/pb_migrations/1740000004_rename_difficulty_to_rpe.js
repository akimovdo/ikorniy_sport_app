/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const sessions = app.findCollectionByNameOrId('sessions')
  const field = sessions.fields.getByName('difficulty')
  if (field) {
    field.setName('rpe')
    app.save(sessions)
  }
}, (app) => {
  const sessions = app.findCollectionByNameOrId('sessions')
  const field = sessions.fields.getByName('rpe')
  if (field) {
    field.setName('difficulty')
    app.save(sessions)
  }
})
