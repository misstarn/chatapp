<script setup>
import { differenceInYears, format, getDate, getMonth, intlFormatDistance } from 'date-fns'


const SERVER_URL = 'http://localhost:1338'
const baseUrl = useRuntimeConfig().public.baseUrl

// 在store读取token和user
const authStore = useStore().useAuthStore()
const msgStore = useStore().useMsgStore()

const { token, user, logout: logoutUser } = authStore
const { friends: fri } = msgStore

import { io } from 'socket.io-client'

definePageMeta({
    middleware: [
        function (to, from) {
            // Custom inline middleware
        },
        'home-middleware'
    ],
});



onMounted(() => {

})

// socket
const socket = io(SERVER_URL, {
    auth: {
        token: token
    }
})

// 连接和重连时触发
if (token) {
    socket.on('connect', () => {

        // 设置当前用户发送服务端
        socket.emit('setUsername', user)

        console.log(socket.id)

        const engine = socket.io.engine
        console.log(engine.transport.name)

        engine.once('upgrade', () => {
            // 当传输升级时调用
            console.log(engine.transport.name)
        })

    })
}


// 当前用户
const currentUser = ref({})

// 发送信息给谁
const targetUser = ref({})

// 个人信息
socket.on('userInfo', (data) => {
    console.log(data)

    currentUser.value = data
})


// 消息列表
const friends = ref(fri)

const groups = ref([])

// 获取群组
socket.on('groups', (data) => {
    console.log(data)
    groups.value = data
})

// 监听朋友列表变化
// socket.on('friendsList', (friendships) => {
//     // 用户ID
//     const userId = user.id
//     friends.value = []
//     console.log(friendships, user.id)

//     // 遍历朋友关系列表
//     for (const relation of friendships) {
//         // 检查user1的id是否等于当前用户，如果是，将user2加入朋友数组
//         if (relation.user1.id === userId) {
//             friends.value.push({
//                 ...relation.user2,
//                 friendshipId: relation.id,
//                 lastMsg: relation.lastMsg
//             })
//         }
//         // 检查user2的id是否等于当前用户，如果是，将user1加入朋友数组
//         if (relation.user2.id === userId) {
//             friends.value.push({
//                 ...relation.user1,
//                 friendshipId: relation.id,
//                 lastMsg: relation.lastMsg
//             })
//         }
//     }

//     console.log(friends.value)
// })

// 遇见错误
socket.on('connect_error', () => {
    setTimeout(() => {
        socket.connect()
    }, 1000)
})

// 断开
socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
        socket.connect()
    }
    console.log(socket.id)
})

// 更新消息列表
const updateMsg = (message) => {
    messages.value.push(message)
    nextTick(() => {
        // 发信息才下拉到底部
        if (message.me) {
            scrollToBottom()
        }
    })

    console.log(messages)
}

// 发送信息
const message = ref('')

// 发送私人消息
const send = () => {
    console.log(message.value, targetUser)
    if (message.value) {
        socket.emit('privateMessage', {
            targetUser: targetUser.value,
            message: message.value
        })
    }
    message.value = ''
}

// 登出
const logout = () => {
    socket.disconnect()

    localStorage.removeItem('auth')
    localStorage.removeItem('msg')
    
    // logoutUser()

    navigateTo('/login')
}

// 监听返回私人消息
socket.on('receivePrivateMessage', (message) => {
    // 展示私人消息
    console.log(message, friends.value)

    // 接收方,查找消息发送方,更新最后消息
    let friend = getFriend(message.user)

    console.log(friend)
    if (friend) {
        friend.lastMsg = {
            content: message.msg.content,
            createdAt: message.msg.createdAt
        }
    } else {
        // 发送方,查看接收方,更新最后消息
        friend = getFriend(targetUser.value)
        if (friend) {
            friend.lastMsg = {
                content: message.msg.content,
                createdAt: message.msg.createdAt
            }
        }
    }

    if (message.me || !message.me && message.user.id == targetUser.value.id) {
        // 更新消息列表查看
        updateMsg(message)
    } else {
        // 存储未读消息
        storeMessageForLaterUser(message)
    }
})

const unreadMessages = {}
// 存储未读消息并更新未读消息数量
function storeMessageForLaterUser(message) {
    console.log(message)
    const fromUser = message.user

    if (!unreadMessages[fromUser.uid]) {
        unreadMessages[fromUser.uid] = []
    }
    // 存储到对应username的列表中
    unreadMessages[fromUser.uid].push(message)

    // 更新未读消息数
    updateUserUnreadCountInList(fromUser)
}

// 更新用户列表中的未读消息数量
function updateUserUnreadCountInList(user) {
    console.log(user)
    if (unreadMessages[user.uid]) {
        // 查找对应的好友
        const friend = getFriend(user)
        console.log(friend)
        // 找到之后设置未读消息数    
        if (friend) {
            friend.count += 1
            // friend.count = unreadMessages[user.username].length
        }
    }

    console.log(friends.value)
}

// 清空特定用户的未读消息数量
function clearUnreadMessage(user) {
    if (user) {
        // 删除未读记录
        // 未读消息数
        const friend = getFriend(user)
        console.log(friend)
        // 找到之后设置未读消息数为0    
        if (friend) {
            // friend.unreadCount = 0
            friend.count = 0
        }
    }
}

const messages = ref([])

// 选择好友,点击
const select = (val) => {
    console.log(val.id)
    // 设置发送信息的好友
    targetUser.value = val.id

    getMsgH(targetUser.value)
}

// 打开消息框并请求消息
const getMsgH = (targetUser) => {
    console.log(targetUser)

    // 打开消息框
    showMsg.value = true

    // 消息列表清空/以后做历史消息
    messages.value = []

    clearUnreadMessage(targetUser)

    // 加入群聊
    if(targetUser.tab == 'groups') {
        socket.emit('joinRoom', targetUser.uid)
    }

    // 请求消息历史
    socket.emit('history', {
        sender: targetUser,
        receiver: currentUser.value
    })

}

const detail = ref({})
const showDetail = ref(false)


// 选择好友/群聊,点击查看详情
const selectDetail = (val) => {

    console.log(val.id, tab.value)

    // 设置详细信息
    detail.value = {
        ...val.id,
        age: differenceInYears(
            new Date(),
            new Date(val.id.birthday)
        ),
        tab: tab.value
    }

    // 打开详情框
    showDetail.value = true
    console.log(detail.value)

}

// 发起聊天
const chat = () => {
    console.log(detail.value)
    const friend = getFriend(detail.value)
    if (friend) {

    } else {
        friends.value.push(detail.value)
        msgStore.$patch({
            friends: friends.value
        })
    }
    // 打开消息界面
    msg.value = true
    targetUser.value = detail.value
    // 打开聊天框
    getMsgH(detail.value)
}

// 切换用户和群聊列表
const tabChange = (val) => {
    console.log(val)
    // 切换隐藏
    showDetail.value = false
}

// 获取对应的朋友
const getFriend = (user) => {
    console.log(user)
    if(user.username) {
        return friends.value.find(friend => friend.username === user.username)
    } else {
        return friends.value.find(friend => friend.groupname === user.groupname)
    }
}

// 获取消息记录
socket.on('historyMsgs', (data) => {
    console.log(data)
    if (data) {
        data.forEach(message => {
            const d = {
                msg: message,
                user: message.sender,
                me: currentUser.value.id === message.sender.id ? true : false,
            }
            updateMsg(d)
        });
    }
})


// 登录上线
socket.on('online', ({ username }) => {
    console.log(username)

    const friend = getFriend({
        username: username
    })
    if (friend) {
        nextTick(() => {
            friend.online = true
        })
    }
})

// 账号下线
socket.on('offline', (username) => {
    console.log(username)
    const friend = getFriend({
        username
    })
    if (friend) {
        nextTick(() => {
            friend.online = false
        })
    }
})


const userGroupMembers = ref([])

// 获取好友列表
socket.on('userGroup', (data) => {
    console.log(data)

    const da = data.map(d => {
        const ugm = d.userGroupMembers.filter(item => item.online = true)
        return {
            ...d,
            onlineCount: ugm.length
        }
    })
    console.log(da)
    userGroupMembers.value = da
})




const loading = ref(false)
const input = ref('')

const onClick = () => {
    console.log(input.value)
}

const items = ref([
    {
        title: 'Sort by time'
    },
    {
        title: 'Sort by Unread'
    },
    {
        title: 'Mark all as read'
    },
])


const onScroll = (e) => {
    // console.log(e)
}

const scrollContainer = ref(null);

// 发送新消息，滚动到底部
const scrollToBottom = () => {
    if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
};


const media = ref(false)
const showMsg = ref(false)
// 弹出个人信息
const menu = ref(false)
// 个人信息操作菜单
const profile = ref([
    {
        title: 'My Profile',
        subtitle: 'Account settings',
        icon: '/imgs/icon-account.svg'
    },
    {
        title: 'My Inbox',
        subtitle: 'Messages $ Emails',
        icon: '/imgs/icon-inbox.svg'
    },
    {
        title: 'My Tasks',
        subtitle: 'To-do and Daily tasks',
        icon: '/imgs/icon-tasks.svg'
    },
])

// 个人信息弹窗偏移
const menuoffset = ref([5, -20])
const tabs = ref([
    {
        title: '好友',
        name: 'friends'
    },
    {
        title: '群聊',
        name: 'groups'
    }
])

const tab = ref(null)

// 切换聊天和联系人列表 开关
const msg = ref(true)

// 好友分组 打开/关闭 手风琴
const panel = ref([0])


// 获取星座
function getZodiacSign(date) {

    const month = getMonth(new Date(date))

    const day = getDate(new Date(date))

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
        return "白羊座";
    } else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
        return "金牛座";
    } else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
        return "双子座";
    } else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
        return "巨蟹座";
    } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
        return "狮子座";
    } else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
        return "处女座";
    } else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
        return "天秤座";
    } else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
        return "天蝎座";
    } else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
        return "射手座";
    } else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
        return "摩羯座";
    } else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
        return "水瓶座";
    } else {
        return "双鱼座";
    }
}




</script>

<template>
    <div class="p-8 max-w-[1200px] mx-auto">
        <!-- part 1 -->
        <div class="w-full mb-8 rounded-md">
            <div class="px-8 bg-[#ecf2ff] flex justify-between items-center">
                <div>
                    <h3 class="text-xl font-bold mb-2">Chat app</h3>
                    <a href="/">Message</a>
                </div>
                <div class="py-0 overflow-hidden">
                    <div class="-mb-16 mt-3">
                        <img src="../public/imgs/ChatBc.png" alt="breadcrumb">
                    </div>
                </div>
            </div>
        </div>
        <!-- part 2 main -->
        <v-card>
            <div class="flex overflow-hidden">
                <!-- 选项  letf-->
                <v-sheet class="flex-shrink-0">
                    <!-- 个人头像 -->
                    <v-list-item>
                        <v-menu :offset="menuoffset" transition="slide-y-transition" v-model="menu"
                            :close-on-content-click="false" location="end">
                            <template v-slot:activator="{ props }">
                                <v-badge dot color="success" offset-y="36" v-bind="props">
                                    <v-avatar size="50px">
                                        <v-img v-if="currentUser.avatar" cover alt="Avatar"
                                            :src="baseUrl + currentUser.avatar.url"></v-img>
                                        <v-icon v-else></v-icon>
                                    </v-avatar>
                                </v-badge>
                            </template>
                            <!-- 个人信息弹窗 -->
                            <v-card>
                                <v-sheet>
                                    <div class="px-4 pt-3">
                                        <!-- <h6 class="text-lg">User Profile</h6> -->
                                        <v-list>
                                            <v-list-item class="pl-0" :title="currentUser.name"
                                                :subtitle="currentUser.email">
                                                <template v-slot:prepend>
                                                    <v-avatar size="55px">
                                                        <v-img v-if="currentUser.avatar" cover alt="Avatar"
                                                            :src="baseUrl + currentUser.avatar.url"></v-img>
                                                        <v-icon v-else></v-icon>
                                                    </v-avatar>
                                                </template>
                                                <template v-slot:title>
                                                    <h5 class="text-base font-semibold">{{ currentUser.name }}</h5>
                                                </template>
                                                <template v-slot:subtitle>
                                                    <h6 class="text-sm">{{ currentUser.email }}</h6>
                                                </template>
                                            </v-list-item>
                                        </v-list>
                                        <hr>
                                    </div>


                                    <v-list :lines="false">
                                        <v-list-item class="py-4" v-for="(item, i) in profile" :key="i" :value="item">
                                            <template v-slot:prepend>
                                                <v-avatar class="bg-lightprimary" style="background-color: #ecf2ff;"
                                                    rounded="sm">
                                                    <v-icon icon>
                                                        <img :src="item.icon">
                                                    </v-icon>
                                                </v-avatar>
                                            </template>
                                            <v-list-item-title v-text="item.title"></v-list-item-title>
                                            <v-list-item-subtitle class="mt-0.5"
                                                v-text="item.subtitle"></v-list-item-subtitle>
                                        </v-list-item>
                                    </v-list>
                                    <div class="px-4 py-3">
                                        <v-btn @click="logout" block class="text-none text-subtitle-1" variant="outlined"
                                            color="info">
                                            logout
                                        </v-btn>
                                    </div>
                                </v-sheet>
                            </v-card>
                        </v-menu>
                    </v-list-item>

                    <v-list density="compact">
                        <!-- 消息 -->
                        <v-list-item>
                            <v-btn @click="msg = true" icon="mdi-message-processing-outline"
                                :variant="msg ? 'tonal' : 'plain'"></v-btn>
                        </v-list-item>
                        <!-- 联系人 -->
                        <v-list-item>
                            <v-btn @click="msg = false" icon="mdi-account-outline"
                                :variant="!msg ? 'tonal' : 'plain'"></v-btn>
                        </v-list-item>
                    </v-list>
                </v-sheet>

                <!-- 消息, 聊天 -->
                <div v-if="msg" class="flex flex-1 w-full">
                    <div
                        class="border-l border-r border-r-[rgb(229,234,239)] flex-shrink-0 min-h-[500px] w-[300px] transition-all duration-100">
                        <div>
                            <!-- 搜索 -->
                            <v-sheet>
                                <div class="px-6 pt-2">
                                    <!-- 输入 -->
                                    <v-text-field :loading="loading" density="compact" variant="outlined" label="搜索"
                                        append-inner-icon="mdi-magnify" single-line hide-details v-model="input"
                                        @click:append-inner="onClick" color="info"></v-text-field>
                                    <!-- 选项 -->
                                    <v-menu transition="slide-y-transition">
                                        <template v-slot:activator="{ props }">
                                            <v-btn v-bind="props" variant="plian" class="text-none text-subtitle-1 mt-4"
                                                append-icon="mdi-chevron-down">
                                                Recent Chats
                                            </v-btn>
                                        </template>
                                        <v-list>
                                            <v-list-item v-for="(item, i) in items" :key="i" :value="item.title">
                                                <v-list-item-title>{{ item.title }}</v-list-item-title>
                                            </v-list-item>
                                        </v-list>
                                    </v-menu>
                                </div>
                            </v-sheet>
                            <!-- 消息列表 -->
                            <div class="relative overflow-y-auto h-[500px] mt-4" v-scroll.self="onScroll" max-height="500">
                                <v-list @click:select="select">
                                    <v-list-item v-for="user in friends" :key="user.usernam" :value="user"
                                        active-class="active" class="px-6 py-4 cursor-pointer">
                                        <!-- 头像 -->
                                        <template v-slot:prepend>
                                            <v-badge v-if="user.tab == 'friends'" dot :color="user.online ? 'success' : ''"
                                                offset-y="32">
                                                <v-avatar size="45">
                                                    <v-img v-if="user.avatar.url" cover alt="Avatar"
                                                        :src="baseUrl + user.avatar.url"></v-img>
                                                    <v-icon v-else></v-icon>
                                                </v-avatar>
                                            </v-badge>
                                            <v-avatar v-else size="45">
                                                <v-img v-if="user.groupAvatar.url" cover alt="Avatar"
                                                    :src="baseUrl + user.groupAvatar.url"></v-img>
                                                <v-icon v-else></v-icon>
                                            </v-avatar>
                                        </template>
                                        <div>
                                            <div class="flex items-center">
                                                <h5 class="text-sm font-semibold" style="font-family: inherit!important">{{
                                                    user.name }}</h5>
                                                <small v-if="user.lastMsg" class="ml-auto text-xs"
                                                    style="font-family: inherit!important">{{ intlFormatDistance(new Date(user.lastMsg.createdAt), new Date() ) }}</small>
                                            </div>
                                            <div class="flex items-center mt-1">
                                                <h6 class="text-xs font-normal" style="font-family: inherit!important"
                                                    v-if="user.lastMsg">{{ user.lastMsg.content }}</h6>
                                                <v-badge v-if="user.count > 0" color="info" class="ml-auto"
                                                    :content="user.count" inline></v-badge>
                                            </div>
                                        </div>
                                    </v-list-item>
                                </v-list>
                            </div>
                        </div>
                    </div>
                    <!-- right -->
                    <div class="flex-1" v-if="showMsg">
                        <div>
                            <div class="flex items-center gap-3 p-4 justify-between">
                                <div class="flex gap-4 items-center">
                                    <v-badge v-if="targetUser.tab == 'friends'" dot
                                        :color="targetUser.online ? 'success' : ''" offset-y="36">
                                        <v-avatar size="50px">
                                            <v-img v-if="targetUser.avatar" alt="Avatar" cover
                                                :src="baseUrl + targetUser.avatar.url"></v-img>
                                            <v-icon v-else></v-icon>
                                        </v-avatar>
                                    </v-badge>
                                    <v-avatar v-else size="50px">
                                        <v-img v-if="targetUser.groupAvatar" alt="Avatar" cover
                                            :src="baseUrl + targetUser.groupAvatar.url"></v-img>
                                        <v-icon v-else></v-icon>
                                    </v-avatar>
                                    <div v-if="targetUser.tab == 'friends'" class="flex flex-col justify-center">
                                        <h5 class="text-lg font-semibold leading-6">{{ targetUser.name }}</h5>
                                        <small>{{ targetUser.online ? '[在线]' : '[离线]' }}</small>
                                    </div>
                                    <div v-else class="flex flex-col justify-center">
                                        <h5 class="text-lg font-semibold leading-6">{{ targetUser.name }} ({{
                                             targetUser.users.length }})</h5>
                                    </div>
                                </div>
                                <div class="flex items-center">
                                    <v-btn variant="text" icon>
                                        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-phone"
                                            width="24px" height="24px" viewBox="0 0 24 24" stroke-width="2"
                                            stroke="currentColor" fill="none" stroke-linecap="round"
                                            stroke-linejoin="round">
                                            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                            <path
                                                d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2">
                                            </path>
                                        </svg>
                                    </v-btn>
                                    <v-btn variant="text" icon>
                                        <svg xmlns="http://www.w3.org/2000/svg"
                                            class="icon icon-tabler icon-tabler-video-plus" width="24px" height="24px"
                                            viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
                                            stroke-linecap="round" stroke-linejoin="round">
                                            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                            <path
                                                d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z">
                                            </path>
                                            <rect x="3" y="6" width="12" height="12" rx="2"></rect>
                                            <line x1="7" y1="12" x2="11" y2="12"></line>
                                            <line x1="9" y1="10" x2="9" y2="14"></line>
                                        </svg>
                                    </v-btn>
                                    <v-btn @click="media = !media" icon="mdi-dots-vertical" variant="plain"></v-btn>
                                </div>
                            </div>
                            <hr>
                            <div class="h-[530px] overflow-y-auto relative" ref="scrollContainer" v-scroll.self="onScroll"
                                max-height="530">
                                <div class="flex min-h-full relative">
                                    <!-- 消息列表 -->
                                    <div class="w-full">
                                        <div class="p-5" v-for="msg in messages">
                                            <div class="flex items-start gap-3 mb-1"
                                                :class="[msg.me ? 'justify-end' : 'justify-start']">
                                                <!-- 头像 -->
                                                <v-avatar size="40px" v-if="!msg.me">
                                                    <v-img v-if="msg.user.avatar" cover="" alt="Avatar"
                                                        :src="baseUrl + msg.user.avatar.url"></v-img>
                                                    <v-icon v-else></v-icon>
                                                </v-avatar>
                                                <!-- 内容 -->
                                                <div class="flex flex-col w-full"
                                                    :class="[!msg.me ? 'items-start' : 'items-end']">
                                                    <small class="text-subtitle-2 text-gray-600">{{ msg.me ? '' :
                                                        msg.user.name
                                                    }}
                                                        <span class="text-xs">{{ intlFormatDistance(new Date(msg.msg.createdAt), new Date() ) }}</span> </small>
                                                    <v-sheet color="rgb(242,246,250)" rounded
                                                        class="rounded-md px-3 py-2 mb-1 max-w-[90%]">
                                                        <p class="text-body-1 w-auto">{{ msg.msg.content }}</p>
                                                    </v-sheet>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                    <!-- 文件 -->
                                    <div v-if="media"
                                        class="w-[320px] border-l border-[rgb( 229,234,239)] sticky top-0 flex-shrink-0 overflow-y-auto h-[530px]"
                                        v-scroll.self="onScroll" max-height="530">
                                        <v-sheet>
                                            <div class="p-6">
                                                <h6 class="mb-3 text-base font-semibold"
                                                    style="font-family: inherit!important">
                                                    Media (1)</h6>
                                                <div class="grid grid-cols-3 gap-2">
                                                    <div v-for="i in 8">
                                                        <img src="../public/imgs/blog-img5.jpg" class="w-full" cover
                                                            alt="img">
                                                    </div>
                                                </div>
                                                <h6 class="text-base mb-3 mt-7 font-semibold"
                                                    style="font-family: inherit!important">Attachments (5)</h6>
                                                <v-sheet>
                                                    <div>
                                                        <div class="flex items-center mt-7" v-for="i in 6">
                                                            <v-avatar size="48px">
                                                                <img :width="24" alt="Avatar"
                                                                    src="https://modernize-nuxt.adminmart.com/images/chat/icon-adobe.svg">
                                                            </v-avatar>
                                                            <div class="pl-4">
                                                                <h6 class="text-base text-inherit">service-task.pdf</h6>
                                                                <h5 class="text-xs text-inherit">2MB</h5>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </v-sheet>
                                            </div>
                                        </v-sheet>
                                    </div>
                                    <div v-if="targetUser.tab == 'groups'" class="w-[200px] border-l border-[rgb( 229,234,239)] sticky top-0 flex-shrink-0 overflow-y-auto h-[530px]"
                                        v-scroll.self="onScroll" max-height="530">
                                        <v-sheet>
                                            <div class="p-4 px-4">
                                                <h6 class="mb-3 text-base  font-medium px-2"
                                                    style="font-family: inherit!important">
                                                    群公告</h6>
                                                <v-sheet>
                                                    <div class="px-2">
                                                        <img src="../public/imgs/blog-img5.jpg" class="w-full" cover
                                                            alt="img">
                                                    </div>
                                                </v-sheet>
                                                <h6 class="text-base mb-1 mt-4 px-2 font-medium"
                                                    style="font-family: inherit!important">群成员 ({{ targetUser.users.length }})
                                                </h6>
                                                <v-sheet>
                                                    <v-list nav class="px-0" density="compact">

                                                        <v-list-item class="px-2" v-for="(item, i) in targetUser.users"
                                                            :key="item.id" :value="item">
                                                            <template v-slot:prepend>
                                                                <v-avatar size="30px">
                                                                    <v-img v-if="item.avatar" alt="Avatar" cover
                                                                        :src="baseUrl + item.avatar.url"></v-img>
                                                                    <v-icon v-else></v-icon>
                                                                </v-avatar>
                                                            </template>
                                                            <template v-slot:append>
                                                                <v-chip size="small" v-if="targetUser.create_by.id == item.id">
                                                                群主
                                                                </v-chip>
                                                            </template>

                                                            <v-list-item-title v-text="item.name"></v-list-item-title>
                                                        </v-list-item>
                                                    </v-list>
                                                </v-sheet>
                                            </div>
                                        </v-sheet>
                                    </div>

                                </div>
                            </div>
                        </div>
                        <hr>
                        <div class="flex items-center p-4 inputform">
                            <v-btn variant="plain" icon>
                                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-mood-smile"
                                    width="24px" height="24px" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
                                    fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                    <circle cx="12" cy="12" r="9"></circle>
                                    <line x1="9" y1="10" x2="9.01" y2="10"></line>
                                    <line x1="15" y1="10" x2="15.01" y2="10"></line>
                                    <path d="M9.5 15a3.5 3.5 0 0 0 5 0"></path>
                                </svg>
                            </v-btn>
                            <v-text-field v-model="message" type="text" variant="plain" @keydown.enter="send"
                                density="compact" single-line hide-details class="shadow-none mx-2"></v-text-field>
                            <v-btn variant="plain" @click="send" icon>
                                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-send"
                                    width="20px" height="20px" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
                                    fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                    <path d="M21 3l-6.5 18a0.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a0.55 .55 0 0 1 0 -1l18 -6.5">
                                    </path>
                                </svg>
                            </v-btn>
                            <v-btn variant="plain" icon>
                                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-photo"
                                    width="20px" height="20px" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
                                    fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                    <line x1="15" y1="8" x2="15.01" y2="8"></line>
                                    <rect x="4" y="4" width="16" height="16" rx="3"></rect>
                                    <path d="M4 15l4 -4a3 5 0 0 1 3 0l5 5"></path>
                                    <path d="M14 14l1 -1a3 5 0 0 1 3 0l2 2"></path>
                                </svg>
                            </v-btn>
                            <v-btn variant="plain" icon>
                                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-paperclip"
                                    width="20px" height="20px" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
                                    fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                    <path
                                        d="M15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3l6.5 -6.5a3 3 0 0 0 -6 -6l-6.5 6.5a4.5 4.5 0 0 0 9 9l6.5 -6.5">
                                    </path>
                                </svg>
                            </v-btn>
                        </div>
                    </div>
                </div>
                <!-- 联系人 列表-->
                <div v-else class="flex flex-1 w-full">
                    <!-- left 列表 -->
                    <div
                        class="border-l border-r border-r-[rgb(229,234,239)] flex-shrink-0 min-h-[500px] w-[300px] transition-all duration-100">
                        <div>
                            <!-- 搜索 / 列表切换 -->
                            <v-sheet>
                                <div class="px-6 pt-2">
                                    <!-- 输入 -->
                                    <div class="flex space-x-2">
                                        <v-text-field :loading="loading" density="compact" variant="outlined" label="搜索"
                                            prepend-inner-icon="mdi-magnify" single-line hide-details v-model="input"
                                            @click:append-inner="onClick" color="info"></v-text-field>
                                        <v-btn icon="mdi-plus" variant="tonal" rounded="lg"></v-btn>
                                    </div>
                                    <!-- 好友通知,群通知 -->
                                    <v-list v-list nav class="px-0" density="compact">
                                        <v-list-item value="firend">
                                            好友通知
                                            <template v-slot:append>
                                                <v-icon icon="mdi-chevron-right"></v-icon>
                                            </template>
                                        </v-list-item>
                                        <v-list-item value="group">
                                            群通知
                                            <template v-slot:append>
                                                <v-icon icon="mdi-chevron-right"></v-icon>
                                            </template>
                                        </v-list-item>
                                    </v-list>
                                    <!-- 切换 好友/群聊 -->
                                    <v-tabs v-model="tab" bg-color="transparent" color="basil" grow
                                        @update:modelValue="tabChange">
                                        <v-tab v-for="item in tabs" :key="item.name" :value="item.name">
                                            {{ item.title }}
                                        </v-tab>
                                    </v-tabs>
                                    <hr>
                                </div>
                            </v-sheet>
                            <!-- 好友/群聊列表 -->
                            <v-window v-model="tab">
                                <v-window-item value="friends">
                                    <div class="relative overflow-y-auto h-[500px] mt-4" max-height="500">
                                        <v-expansion-panels multiple variant="accordion" class="expan" v-model="panel">
                                            <v-expansion-panel v-for="userGroup in userGroupMembers" :key="userGroup.id">
                                                <v-expansion-panel-title>{{ userGroup.userGroup.name }}({{
                                                    userGroup.onlineCount }}/{{ userGroup.userGroupMembers.length
    }}）</v-expansion-panel-title>
                                                <v-expansion-panel-text>
                                                    <v-list @click:select="selectDetail" class="pt-2 pb-0">
                                                        <v-list-item v-for="user in userGroup.userGroupMembers"
                                                            :key="user.usernam" :value="user" active-class="active"
                                                            class="px-6 py-4 cursor-pointer">
                                                            <!-- 头像 -->
                                                            <template v-slot:prepend>
                                                                <v-badge dot :color="user.online ? 'success' : ''"
                                                                    offset-y="32">
                                                                    <v-avatar size="45">
                                                                        <v-img v-if="user.avatar.url" cover alt="Avatar"
                                                                            :src="baseUrl + user.avatar.url"></v-img>
                                                                        <v-icon v-else></v-icon>
                                                                    </v-avatar>
                                                                </v-badge>
                                                            </template>
                                                            <div>
                                                                <div class="flex items-center">
                                                                    <h5 class="text-sm font-semibold"
                                                                        style="font-family: inherit!important">{{
                                                                            user.name }}</h5>
                                                                </div>
                                                                <div class="flex items-center mt-1">
                                                                    <h6 class="text-xs font-normal"
                                                                        style="font-family: inherit!important">
                                                                        {{ user.online ? '[在线]' : '[离线]' }}{{
                                                                            user.description }}</h6>
                                                                </div>
                                                            </div>
                                                        </v-list-item>
                                                    </v-list>
                                                </v-expansion-panel-text>
                                            </v-expansion-panel>
                                        </v-expansion-panels>
                                    </div>
                                </v-window-item>
                                <v-window-item value="groups">
                                    <div class="relative overflow-y-auto h-[500px] mt-4" max-height="500">
                                        <v-list @click:select="selectDetail">
                                            <v-list-item v-for="group in groups" :key="group.groupname" :value="group"
                                                active-class="active" class="px-6 py-4 cursor-pointer">
                                                <!-- 头像 -->
                                                <template v-slot:prepend>
                                                    <v-avatar size="45">
                                                        <v-img v-if="group.groupAvatar.url" cover alt="Avatar"
                                                            :src="baseUrl + group.groupAvatar.url"></v-img>
                                                        <v-icon v-else></v-icon>
                                                    </v-avatar>
                                                </template>
                                                <div>
                                                    <div class="flex items-center">
                                                        <h5 class="text-sm font-semibold"
                                                            style="font-family: inherit!important">{{ group.name }}</h5>
                                                    </div>
                                                </div>
                                            </v-list-item>
                                        </v-list>
                                    </div>
                                </v-window-item>
                            </v-window>

                        </div>
                    </div>
                    <!-- right 详情 -->
                    <div class="flex-1 py-10" v-if="showDetail">
                        <div>
                            <v-sheet class="px-8">
                                <div class="flex items-center gap-3 py-4 justify-between">
                                    <div class="flex gap-4 items-center">
                                        <v-avatar size="72px">
                                            <v-img v-if="detail.tab" alt="Avatar" cover
                                                :src="baseUrl + `${detail.tab == 'groups' ? detail.groupAvatar.url : detail.avatar.url}`"></v-img>
                                            <v-icon v-else></v-icon>
                                        </v-avatar>
                                        <div class="flex flex-col justify-center">
                                            <h5 class="text-lg font-semibold leading-6">{{ detail.name }}</h5>
                                            <small class="mt-1 text-sm">UID: {{ detail.tab == 'groups' ? detail.groupname :
                                                detail.username }}-{{ detail.uid }}</small>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <!-- 修改信息 -->
                                        <v-btn v-if="detail.tab === 'groups'" variant="text" border
                                            icon="mdi-pencil"></v-btn>
                                        <!-- 发起聊天 -->
                                        <v-btn @click="chat" variant="tonal" icon="mdi-message-reply-outline"></v-btn>
                                    </div>
                                </div>
                                <hr>
                            </v-sheet>
                            <v-sheet v-if="detail.tab === 'friends'" class="px-8 py-4">
                                <div class="divide-x flex space-x-2">
                                    <span v-if="detail.gender">{{ detail.gender == 'male' ? '男' : '女' }}</span>
                                    <span v-if="detail.birthday" class="pl-2">{{ detail.age }}岁</span>
                                    <span v-if="detail.birthday" class="pl-2">{{ format(new Date(detail.birthday), 'M月d日')
                                    }} {{ getZodiacSign(detail.birthday) }}</span>
                                    <span v-if="detail.region" class="pl-2">{{ detail.region }}</span>
                                </div>
                                <v-list class="px-0 mt-8" density="compact" nav>
                                    <v-list-item class="px-0 py-2">
                                        <template v-slot:prepend>
                                            <v-icon size="large" icon="mdi-account-multiple-outline"></v-icon>
                                        </template>
                                        <template v-slot:title>
                                            <h5 class="text-sm">好友分组</h5>
                                        </template>
                                        <template v-slot:append>
                                            <v-select density="compact" single-line hide-details :items="['安然', '清秋']"
                                                variant="outlined"></v-select>
                                        </template>
                                    </v-list-item>
                                    <v-list-item class="px-0 py-2">
                                        <template v-slot:prepend>
                                            <v-icon size="large" icon="mdi-pencil"></v-icon>
                                        </template>
                                        <template v-slot:title>
                                            <h5 class="text-sm">签名</h5>
                                        </template>
                                        <template v-slot:append>
                                            <div>{{ detail.description }}</div>
                                            <!-- <v-text-field class="w-[300px] text-right" variant="outlined" density="compact" single-line  hide-details v-model="detail.description"></v-text-field> -->
                                        </template>
                                    </v-list-item>
                                </v-list>
                                <hr class="mt-4">
                            </v-sheet>
                            <v-sheet v-else class="px-8 py-4">
                                <v-list class="px-0 mt-8" density="compact" nav>
                                    <v-list-item class="px-0 py-2">
                                        <template v-slot:prepend>
                                            <v-icon size="large" icon="mdi-account-group"></v-icon>
                                        </template>
                                        <template v-slot:title>
                                            <h5 class="text-sm" v-if="detail.users">群成员({{ detail.users.length }}人)</h5>
                                        </template>
                                    </v-list-item>
                                    <v-list-item class="px-0 py-2">
                                        <div class="divide-x flex space-x-4">
                                            <v-avatar size="52px">
                                                <v-img v-if="detail.create_by" alt="Avatar" cover
                                                    :src="baseUrl + detail?.create_by.avatar.url"></v-img>
                                                <v-icon v-else></v-icon>
                                            </v-avatar>
                                            <div class="pl-4 flex gap-2 flex-wrap">
                                                <v-menu min-width="200" rounded v-for="user in detail.users"
                                                    location="bottom" :offset="[5, 60]">
                                                    <template v-slot:activator="{ props }">
                                                        <v-btn icon v-bind="props">
                                                            <v-avatar size="50px" :key="user.username">
                                                                <v-img v-if="user.avatar" alt="Avatar" cover
                                                                    :src="baseUrl + user.avatar.url"></v-img>
                                                                <v-icon v-else></v-icon>
                                                            </v-avatar>
                                                        </v-btn>
                                                    </template>
                                                    <v-card rounded="xl">
                                                        <v-card-text>
                                                            <div class="mx-auto text-center">
                                                                <v-avatar size="60px">
                                                                    <v-img v-if="user.avatar" alt="Avatar" cover
                                                                        :src="baseUrl + user.avatar.url"></v-img>
                                                                    <v-icon v-else></v-icon>
                                                                </v-avatar>
                                                                <h3 class="text-lg my-2">{{ user.name }}</h3>
                                                                <p class="text-caption mt-1">
                                                                    {{ user.email }}
                                                                </p>
                                                                <v-divider class="my-3"></v-divider>
                                                                <v-btn rounded variant="tonal">
                                                                    添加好友
                                                                </v-btn>
                                                            </div>
                                                        </v-card-text>
                                                    </v-card>
                                                </v-menu>
                                            </div>
                                        </div>
                                    </v-list-item>
                                </v-list>
                            </v-sheet>
                        </div>
                    </div>
                </div>
            </div>
        </v-card>
    </div>
</template>

<style>
.inputform .v-text-field input.v-field__input {
    padding: 7px 16px !important;
}

.shadow-none .v-field--variant-solo {
    box-shadow: none !important;
}

.active {
    background: #ebf0ff;
}

.expan .v-expansion-panel-text__wrapper {
    padding: 0px 0 8px;
}
</style>