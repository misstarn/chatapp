import { useMsgStore } from './message'
import { useKeysStore } from './keys'
export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        token: null
    }),
    getters: {},
    actions: {
        // 登录
        login(formData) {
            const apiBase = useRuntimeConfig().public.apiBase
            return new Promise(async (resolve, reject) => {
                const { data, error } = await useFetch(`${apiBase}/auth/local`, {
                    body: formData,
                    method: 'POST'
                })
                if (error.value) {
                    console.log(error.value.data.error, '2323')
                    reject(error.value.data.error)
                }
                if(data.value) {
                    // console.log(data.value)
                    this.user = data.value.user
                    this.token = data.value.jwt
                    resolve(data.value)
                }
            })
        },
        // 登出
        logout() {
            this.user = null
            this.token = null
            useKeysStore().clearKeys()
            useMsgStore().clearMessage()
        }
    },
    persist: {
        storage: persistedState.localStorage
    },
})