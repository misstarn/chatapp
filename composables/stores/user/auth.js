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
            return new Promise(async (resolve, reject) => {
                const { data, error } = await useFetch(`http://localhost:1337/api/auth/local`, {
                    body: formData,
                    method: 'POST'
                })
                if (error.value) {
                    console.error(error.value.data.error)
                    reject(error.value)
                }
                // console.log(data.value)
                this.user = data.value.user
                this.token = data.value.jwt
                resolve(data.value)
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