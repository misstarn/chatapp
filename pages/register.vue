<script setup>
console.log('register')


const crypto = ref(null)

onMounted(async () => {
    if (process.client) {
        // 在客户端渲染时才访问 window 对象
        console.log(window.innerWidth);
    }
})


const rules = {
    usernamerequired: value => !!value || 'E-mail is required',
    passwordrequired: value => !!value || 'password is required',
    email: value => !!value || 'email is required',
}

const user = ref({
    "username": "",
    "email": "",
    "password": ""
})


const form = ref('')

const apiBase = useRuntimeConfig().public.apiBase

const submit = async () => {
    // 验证
    const { valid } = await form.value.validate()
    if (valid) {
        console.log(user.value, apiBase)
        // 获取上一个创建用户的uid
        lastUser().then(res => {
            console.log(res)
            if (res) {
                // 注册
                register({
                    ...user.value,
                    name: user.value.username,
                    avatar: 290,
                    uid: (Number(res.value[0].uid) + 1) + ''
                }).then(res1 => {
                    console.log(res1.value)
                    if (res1) {
                        // 创建一个好友分组
                        createUserGroup({
                            name: "好友",
                            create_by: res1.value.user.id
                        }).then(res2 => {
                            if (res2) {
                                console.log('创建成功')
                                text.value = '创建成功, 请前往邮箱确认'
                                snackbar.value = true

                            }
                        })
                    }
                }).catch(err => {
                    console.log(err)
                    console.error(err, '233')
                    if(err.details.errors) {
                        message({
                        message: err.details.errors[0].message,
                        timeout1: 2000
                    })
                    } else {
                        message({
                        message: err.message,
                        timeout1: 2000
                    })
                    }
                   
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

const visible = ref(false)
</script>

<template>
    <div class="mx-auto max-w-[1200px] lg:p-8">
        <v-snackbar v-model="snackbar" :timeout="timeout">
            {{ text }}
            <template v-slot:actions>
                <v-btn color="blue" variant="text" @click="snackbar = false">
                    Close
                </v-btn>
            </template>
        </v-snackbar>
        <v-card  class="w-full h-full">
            <v-row class="lg:h-[89vh] h-[100vh] mh-100 auth">
                <v-col class="hidden lg:flex items-center lg:v-col-lg-7 justify-center bg-[#eff3fd]">
                    <div>
                        <img class="relative flex" src="../public/imgs/login-bg.svg" alt="login">
                    </div>
                </v-col>
                <v-col class="flex v-col-lg-5 items-center justify-center  px-8">
                    <div class="mt-5 w-[388px]">
                        <h2 class=" text-2xl font-bold mb-2">Welcome to Dashboard</h2>
                        <div class="mb-6 text-subtitle-1">Regiser Your Account</div>
                        <!-- form -->
                        <v-form class="mt-8 w-full" ref="form">
                            <label class="v-label pb-2">Username</label>
                            <v-text-field density="compact" v-model="user.username" :rules="[rules.usernamerequired]"
                                variant="outlined" class="mb-2"></v-text-field>
                            <label class="v-label pb-2">Email Address</label>
                            <v-text-field density="compact" v-model="user.email" :rules="[rules.email]" variant="outlined"
                                class="mb-2"></v-text-field>
                            <label class="v-label pb-2">Password</label>
                            <v-text-field
                            :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
                            :type="visible ? 'text' : 'password'"
                            @click:append-inner="visible = !visible"
                            density="compact" type="password" @keydown.enter="submit" v-model="user.password"
                                :rules="[rules.passwordrequired]" variant="outlined"></v-text-field>
                            <v-btn @click="submit" block class="text-none text-subtitle-1 mt-2" size="large" variant="flat"
                                color="info">
                                Sign Up
                            </v-btn>
                            <div class="mt-6 text-base font-medium">
                                Already have an Account?
                                <nuxt-link href="/login" class="text-info">Sign In</nuxt-link>
                            </div>
                        </v-form>
                    </div>
                </v-col>
            </v-row>
        </v-card>
    </div>
</template>