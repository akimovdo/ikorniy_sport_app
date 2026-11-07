/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Лента обсуждения под тренировкой: клиент пишет, тренер отвечает.
  const users = app.findCollectionByNameOrId('users')
  const sessions = app.findCollectionByNameOrId('sessions')

  const coachWrite = "@request.auth.role = 'coach'"

  let comments = null
  try {
    comments = app.findCollectionByNameOrId('session_comments')
  } catch (e) {
    comments = null
  }

  if (!comments) {
    comments = new Collection({
      type: 'base',
      name: 'session_comments',
      // Читают: тренер — всё, клиент — только своё (через владельца тренировки).
      listRule: "@request.auth.role = 'coach' || session.user = @request.auth.id",
      viewRule: "@request.auth.role = 'coach' || session.user = @request.auth.id",
      // Пишут от своего имени: тренер — в любую сессию, клиент — только в свою.
      createRule:
        "author = @request.auth.id && (@request.auth.role = 'coach' || session.user = @request.auth.id)",
      updateRule: "author = @request.auth.id",
      deleteRule: "author = @request.auth.id || @request.auth.role = 'coach'",
      fields: [
        {
          type: 'relation',
          name: 'session',
          required: true,
          maxSelect: 1,
          collectionId: sessions.id,
          cascadeDelete: true
        },
        {
          type: 'relation',
          name: 'author',
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true
        },
        { type: 'text', name: 'text', required: true, max: 2000 },
        { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
        { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
      ],
      indexes: ['CREATE INDEX `idx_session_comments_session` ON `session_comments` (`session`)']
    })
    app.save(comments)
  }

  comments.listRule = "@request.auth.role = 'coach' || session.user = @request.auth.id"
  comments.viewRule = "@request.auth.role = 'coach' || session.user = @request.auth.id"
  comments.createRule =
    "author = @request.auth.id && (@request.auth.role = 'coach' || session.user = @request.auth.id)"
  comments.updateRule = "author = @request.auth.id"
  comments.deleteRule = "author = @request.auth.id || @request.auth.role = 'coach'"
  app.save(comments)
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId('session_comments'))
  } catch (e) {
    // Коллекции уже нет — откат ничего не должен ломать.
  }
})
