export const useAuthStore = defineStore('auth', () => {
    let u = ''
    let t = ''
    // if(localStorage) {
    //     u = localStorage.getItem('user')
    //     t = localStorage.getItem('token')
    // }

    const user = ref('')
    const token = ref('')

    // 登录
    async function login(loginForm) {
        return new Promise(async (resolve, reject) => {

            const { data, error } = await useFetch(`http://localhost:1337/api/auth/local`, {
                body: loginForm,
                method: 'POST'
            })

            if (error.value) {
                console.error(error.value.data.error)
            }

            console.log(data)

            user.value = data.value.user
            token.value = data.value.jwt

            // localStorage.setItem('user', JSON.stringify(user.value))
            // localStorage.setItem('token', JSON.stringify(token.value))

            resolve(data)
        })
    }

    function logout() {
        user.value = null
        token.value = null
        // localStorage.removeItem('user')
        // localStorage.removeItem('token')
    }

    return { token, user, login, logout }


})