export default defineNuxtRouteMiddleware((to, from) => {
  
  // // skip middleware on server
  // if (process.server) return
  // // or only skip middleware on initial client load
  // const nuxtApp = useNuxtApp()
  // if (process.client && nuxtApp.isHydrating && nuxtApp.payload.serverRendered) return
  
  
  // // skip middleware on client side entirely
  if (process.client) {
    const authStore = useStore().useAuthStore()

    const { token, user} = authStore

    console.log(token,'44411')

    if(token == null) {
      return navigateTo('/login')
    }
  }
  // In a real app you would probably not redirect every route to `/`
  // however it is important to check `to.path` before redirecting or you
  // might get an infinite redirect loop
  
})