export const useMsgStore = defineStore('msg', {
   
    state: () => ({
        friends: []
    }),

    getters: {},

    actions: {
        
    },
    persist: {
        storage: persistedState.localStorage
    },
})