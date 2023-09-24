export const useTestStore = defineStore('test', {
    state: () => {
      return {
        someState: '你好 pinia',
      }
    },
    persist: {
        storage: persistedState.localStorage
    },
})