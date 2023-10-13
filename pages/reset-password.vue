<script setup>
console.log('reset')

const crypto = ref(null)

onMounted(async () => {
    if (process.client) {
        // 在客户端渲染时才访问 window 对象
        console.log(window.innerWidth);
        crypto.value = window.crypto
    }
})

const route = useRoute()

const rules = {
    password: value => !!value || 'password is required',
    passwordConfirmation: value => {
        if(value.trim() == '') {
            return 'passwordConfirmation is required'
        }
        if(value.trim() !== user.value.password) {
            return 'Please confirm the password'
        }

        return true
    },
}

const user = ref({
    "password": "",
    "passwordConfirmation": "",
    "code": route.query.code
})

const form = ref('')
const apiBase = useRuntimeConfig().public.apiBase
const submit = async () => {
    // 验证
    const { valid } = await form.value.validate()
    if (valid) {
        console.log(user.value, apiBase)
        // 登录
        resetPassword(user.value).then(async res => {
            console.log(res)
            if(res.jwt) {
                message({
                    message: '重置成功，请重新登录',
                    timeout1: 2000
                })

                setTimeout(() => {
                    navigateTo('/login')
                }, 2000)
            }
           
        }).catch(err => {
            if (err) {
                console.log(err)
                console.error('请求失败', err.message)
                message({
                        message: err.message,
                        timeout1: 2000
                    })
            }
        })

    }
}


const snackbar = ref(false)
const text = ref('')
const timeout = ref(2000)

const message = ({message, timeout1}) => {
    snackbar.value = true,
    text.value = message,
    timeout.value = timeout1
}

const visible2 = ref(false)
const visible = ref(false)
</script>

<template>
     <v-snackbar v-model="snackbar" :timeout="timeout">
            {{ text }}
            <template v-slot:actions>
                <v-btn color="blue" variant="text" @click="snackbar = false">
                    Close
                </v-btn>
            </template>
        </v-snackbar>
    <div class="mx-auto max-w-[1200px] lg:p-8">
        <v-card class="w-full h-full">
            <v-row class="lg:h-[89vh] h-[100vh] mh-100 auth">
                <v-col class="hidden lg:flex items-center lg:v-col-lg-7 justify-center bg-[#eff3fd]">
                    <div>
                        <img class="relative flex" src="../public/imgs/login-bg.svg" alt="login">
                    </div>
                </v-col>
                <v-col class="flex v-col-lg-5 items-center justify-center px-8">
                    <div class="mt-5 lg:w-[388px] w-full">
                        <h2 class=" text-2xl font-bold mb-2">Welcome to Dashboard</h2>
                        <div class="mb-6 text-subtitle-1">Reset Password </div>
                        <!-- form -->
                        <v-form class="mt-8 w-full" ref="form">
                            <label class="v-label pb-2">password</label>
                            <v-text-field
                            :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
                            :type="visible ? 'text' : 'password'"
                            @click:append-inner="visible = !visible"
                            density="compact" type="password" v-model="user.password" :rules="[rules.password]"
                                variant="outlined" class="mb-6"></v-text-field>
                            <label class="v-label pb-2">passwordConfirmation</label>
                            <v-text-field
                            :append-inner-icon="visible2 ? 'mdi-eye-off' : 'mdi-eye'"
                            :type="visible2 ? 'text' : 'password'"
                            @click:append-inner="visible2 = !visible2"
                            density="compact" type="password" @keydown.enter="submit" v-model="user.passwordConfirmation"
                                :rules="[rules.passwordConfirmation]" variant="outlined"></v-text-field>
                            <v-btn @click="submit" block class="text-none text-subtitle-1 mt-6" size="large" variant="flat"
                                color="info">
                                Confirm
                            </v-btn>
                        </v-form>
                    </div>
                </v-col>
            </v-row>
        </v-card>
    </div>
</template>