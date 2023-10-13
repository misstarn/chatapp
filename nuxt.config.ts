// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,
  modules: [
    '@nuxtjs/tailwindcss',
    '@invictus.codes/nuxt-vuetify',
    '@pinia/nuxt',
    '@nuxtjs/device',
    '@pinia-plugin-persistedstate/nuxt'
  ],
  pinia: {
    autoImports: [
      // automatically imports `defineStore`
      'defineStore', // import { defineStore } from 'pinia'
      ['defineStore', 'definePiniaStore'], // import { defineStore as definePiniaStore } from 'pinia'
    ],
  },
  piniaPersistedstate: {
    cookieOptions: {
      sameSite: 'strict',
    },
    storage: 'localStorage',
  },
  app:{
    // baseURL: '/chat',
    baseURL: '/',
  },
  // vuetify: {
  //   /* vuetify options */
  //   vuetifyOptions: {
  //     // @TODO: list all vuetify options
  //   },

  //   moduleOptions: {
  //     /* nuxt-vuetify module options */
  //     treeshaking: true,
  //     useIconCDN: true,

  //     /* vite-plugin-vuetify options */
  //     styles: true,
  //     autoImport: true,
  //     useVuetifyLabs: true, 
  //   }
  // },
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config',
    exposeConfig: false,
    exposeLevel: 2,
    config: {},
    injectPosition: 'first',
    viewer: true,
  },
  runtimeConfig: {
    apiSecret: '123',
    public: {
      apiBase: 'https://socketio.anran.life/api',
      baseUrl: 'https://socketio.anran.life',
      socketUrl: 'https://socketio.anran.life'
      // apiBase: 'http://localhost:1996/api',
      // baseUrl: 'http://localhost:1996',
      // socketUrl: 'http://localhost:1338'
    }
  }
})
