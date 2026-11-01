/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const exercises = app.findCollectionByNameOrId('exercises')
  if (!exercises.fields.getByName('muscle_group')) {
    exercises.fields.add(new SelectField({
      name: 'muscle_group',
      values: ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Бицепс', 'Трицепс', 'Пресс', 'Кардио'],
      maxSelect: 1,
      required: false
    }))
  }
  if (!exercises.fields.getByName('default_rest')) {
    exercises.fields.add(new Field({
      type: 'number',
      name: 'default_rest',
      required: false
    }))
  }
  app.save(exercises)
}, (app) => {
  const exercises = app.findCollectionByNameOrId('exercises')
  const mg = exercises.fields.getByName('muscle_group')
  if (mg) exercises.fields.removeById(mg.id)
  const dr = exercises.fields.getByName('default_rest')
  if (dr) exercises.fields.removeById(dr.id)
  app.save(exercises)
})
