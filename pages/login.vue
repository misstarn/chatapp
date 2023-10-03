<script setup>
console.log('login')


const msgStore = useStore().useMsgStore()
const { setSymmetricKey, symmetricKey: kkk, keyList } = msgStore

const crypto = ref(null)

onMounted(async () => {
    if (process.client) {
        // 在客户端渲染时才访问 window 对象
        console.log(window.innerWidth);
        crypto.value = window.crypto
    }
})

async function generateKeyPair() {
    // 生成非对称密钥对
    return await crypto.value.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"],
    )
    // 可以将 keyPair 存储在 Vuex 等状态管理中，以供后续使用
}

// 加密消息
//     const messageToEncrypt = '这是要加密的消息11';
//     console.log(key1.value)
//     const symmetricKey = key1.value// 从存储中获取对称密钥

//     const { encryptedData, iv } = await encryptMessage(messageToEncrypt, symmetricKey);

//     console.log(encryptedData)

// // 解密消息
// const decryptedMessage = await decryptMessage(encryptedData, symmetricKey, iv)
// console.log(decryptedMessage, kkk)




const rules = {
    usernamerequired: value => !!value || 'E-mail is required',
    passwordrequired: value => !!value || 'password is required',
}

const user = ref({
    identifier: '',
    password: ''
})

const authStore = useStore().useAuthStore()
const keysStore = useStore().useKeysStore()

const { login } = authStore

const form = ref('')
const apiBase = useRuntimeConfig().public.apiBase
const submit = async () => {
    // 验证
    const { valid } = await form.value.validate()
    if (valid) {
        console.log(user.value, apiBase)
        // 登录
        login(user.value).then(async res => {
            console.log(res)
            // 登录成功生成密钥
            await generateKeyPair().then(keyPair => {
                // 导出公钥和私钥
                crypto.value.subtle.exportKey("jwk", keyPair.publicKey).then((jwk) => {
                    console.log(jwk)
                    keysStore.$patch({
                        publicKey: jwk
                    })
                }).catch(err => {
                    console.error(err)
                })
                crypto.value.subtle.exportKey("jwk", keyPair.privateKey).then((jwk) => {
                    console.log(jwk)
                    keysStore.$patch({
                        privateKey: jwk
                    })
                }).catch(err => {
                    console.error(err)
                })
            })
            // 登录成功跳转
            if (res.jwt) {
                navigateTo('/')
            }
        }).catch(err => {
            if (err) {
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
                        <div class="mb-6 text-subtitle-1">Sign In </div>
                        <!-- form -->
                        <v-form class="mt-8 w-full" ref="form">
                            <label class="v-label pb-2">Username</label>
                            <v-text-field density="compact" v-model="user.identifier" :rules="[rules.usernamerequired]"
                                variant="outlined" class="mb-6"></v-text-field>
                            <label class="v-label pb-2">Password</label>
                            <v-text-field density="compact" type="password" @keydown.enter="submit" v-model="user.password"
                                :rules="[rules.passwordrequired]" variant="outlined"></v-text-field>
                            <div class="flex flex-wrap items-center my-3 -ml-2">
                                <v-checkbox color="info" hide-details label="Remeber this Devide"></v-checkbox>
                                <div class="ml-auto">
                                    <a class="text-info font-medium" href="/">Forgot Password?</a>
                                </div>
                            </div>
                            <v-btn @click="submit" block class="text-none text-subtitle-1" size="large" variant="flat"
                                color="info">
                                Sign In
                            </v-btn>
                            <div class="mt-6 text-base font-medium">
                                New to Modernize?
                                <nuxt-link href="/register" class="text-info">Create an account</nuxt-link>
                            </div>
                        </v-form>
                    </div>
                </v-col>
            </v-row>
        </v-card>
    </div>
</template>