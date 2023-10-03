export const useKeysStore = defineStore('keys', {
    state: () => ({
        publicKey: null,
        privateKey: null,
        keyList: []
    }),
    getters: {},
    actions: {
        clearKeys(){
            this.publicKey = null
            this.privateKey = null
            this.keyList = []
        }
    },
    persist: {
        storage: persistedState.localStorage
    },
})