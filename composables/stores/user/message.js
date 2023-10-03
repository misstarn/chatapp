export const useMsgStore = defineStore('message', {
    state: () => ({
        friends: []
    }),
    getters: {},
    actions: {
        clearMessage(){
            this.friends = []
        }
    },
    persist: {
        storage: persistedState.localStorage
    },
})