export const useAuthStore = defineStore('auth', {
   
    state: () => ({
        user: null,
        token: null
    }),

    getters: {},

    actions: {
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
    
                console.log(data.value)
    
                this.user = data.value.user
                this.token = data.value.jwt
    
                // localStorage.setItem('user', JSON.stringify(user.value))
                // localStorage.setItem('token', JSON.stringify(token.value))
    
                resolve(data.value)
            })
        },
        logout() {
            this.user = null
            this.token = null
            // localStorage.removeItem('user')
            // localStorage.removeItem('token')
        }
    },
    persist: {
        storage: persistedState.localStorage
    },
})