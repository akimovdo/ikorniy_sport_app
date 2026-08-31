import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    components,
    directives,
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: { mdi }
    },
    theme: {
      defaultTheme: 'dark',
      themes: {
        dark: {
          dark: true,
          colors: {
            background: '#121218',
            surface: '#1B1B24',
            primary: '#4F8CFF',
            secondary: '#22C1A6',
            error: '#E5484D',
            warning: '#F2A93B',
            success: '#2FBF71'
          }
        }
      }
    },
    defaults: {
      VBtn: { rounded: 'lg' },
      VCard: { rounded: 'xl' },
      VTextField: { variant: 'outlined', density: 'comfortable' },
      VSelect: { variant: 'outlined', density: 'comfortable' }
    }
  })

  nuxtApp.vueApp.use(vuetify)
})
