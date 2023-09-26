<script setup>
console.log('login')

const rules = {
    usernamerequired: value => !!value || 'E-mail is required',
    passwordrequired: value => !!value || 'password is required',
}

const user = ref({
    identifier: '',
    password: ''
})

const authStore = useStore().useAuthStore()

const { login, token, user: userinfo } = authStore

console.log(token, userinfo)

const form = ref('')
const apiBase = useRuntimeConfig().public.apiBase
const submit = async () => {
    // 验证
    const { valid } = await form.value.validate()
    if (valid) {
        console.log(user.value, apiBase)
        login(user.value).then(res => {
            console.log(res)
            // 登录成功跳转
            if(res.jwt) {
                navigateTo('/')
            }
        }).catch(err => {
            if(err) {
                console.error('登录失败')
            }
        })

    }
}

 
</script>

<template>
    <div class="mx-auto max-w-[1200px] p-8">
        <v-card>
            <v-row class="h-[89vh] mh-100 auth">
                <v-col cols="7" class="flex items-center justify-center bg-[#eff3fd]">
                    <div>
                        <img class="relative flex" src="../public/imgs/login-bg.svg" alt="login">
                    </div>
                </v-col>
                <v-col cols="5" class="flex items-center justify-center">
                    <div class="mt-5 w-[388px]">
                        <h2 class=" text-2xl font-bold mb-2">Welcome to Dashboard</h2>
                        <div class="mb-6 text-subtitle-1">Your Admin Dashboard</div>
                        <!-- form -->
                        <v-form class="mt-8 w-full" ref="form">
                            <label class="v-label pb-2">Username</label>
                            <v-text-field density="compact" v-model="user.identifier" :rules="[rules.usernamerequired]" variant="outlined"
                                class="mb-6"></v-text-field>
                            <label class="v-label pb-2">Password</label>
                            <v-text-field density="compact" type="password" @keydown.enter="submit" v-model="user.password" :rules="[rules.passwordrequired]"
                                variant="outlined"></v-text-field>
                            <div class="flex flex-wrap items-center my-3 -ml-2">
                                <v-checkbox color="info" hide-details label="Remeber this Devide"></v-checkbox>
                                <div class="ml-auto">
                                    <a class="text-info font-medium" href="/">Forgot Password?</a>
                                </div>
                            </div>
                            <v-btn @click="submit" block class="text-none text-subtitle-1" size="large" variant="flat" color="info">
                                Sign In
                            </v-btn>
                            <div class="mt-6 text-base font-medium">
                                New to Modernize?
                                <a href="/" class="text-info">Create an account</a>
                            </div>
                        </v-form>
                    </div>
                </v-col>
            </v-row>
        </v-card>
    </div>
</template>