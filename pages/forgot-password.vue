<script setup>
console.log('forgot')

const crypto = ref(null)

onMounted(async () => {
    if (process.client) {
        // 在客户端渲染时才访问 window 对象
        console.log(window.innerWidth);
        crypto.value = window.crypto
    }
})


const rules = {
    email: value => !!value || 'E-mail is required',
}

const email = ref('')

const form = ref('')
const apiBase = useRuntimeConfig().public.apiBase
const submit = async () => {
    // 验证
    const { valid } = await form.value.validate()
    if (valid) {
        console.log(email.value, apiBase)
        // 登录
        forgotPassword(email.value).then(async res => {
            console.log(res)
            if(res.ok) {
                message({
                    message: '发送成功，请查看邮箱重置密码',
                    timeout1: 2000
                })
            }
            
        }).catch(err => {
            if (err) {
                console.log(err)
                console.error('发送失败', err.message)
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
                        <div class="mb-6 text-subtitle-1">Forgot Password </div>
                        <!-- form -->
                        <v-form class="mt-8 w-full" ref="form">
                            <label class="v-label pb-2">Email</label>
                            <v-text-field density="compact" v-model="email" :rules="[rules.email]"
                                variant="outlined" class="mb-6"></v-text-field>
                            <v-btn @click="submit" block class="text-none text-subtitle-1" size="large" variant="flat"
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