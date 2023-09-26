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

const applyForm = ref({
    message: '请求添加好友',
    userGroup: null
})
// 同意申请，并选择分组
const applyReceiveUserGroup = ref(null)

// 好友分组选择列表
const selectgroups = ref([])

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
    const gs = data.map((g) => {
        return {
            ...g.group,
            group_member: g.id
        }
    })
    groups.value = gs

    console.log(groups.value)
})


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
    console.log(targetUser, currentUser.value)

    // 打开消息框
    showMsg.value = true

    // 消息列表清空/以后做历史消息
    messages.value = []

    clearUnreadMessage(targetUser)

    // 加入群聊
    if (targetUser.tab == 'groups') {
        socket.emit('joinRoom', targetUser.uid)
    }

    // 请求消息历史
    socket.emit('history', {
        targetUser: targetUser,
        currentUser: currentUser.value
    })

}

const detail = ref({})
const showDetail = ref(false)


// 选择好友/群聊,点击查看详情
const selectDetail = (val) => {

    console.log(val.id, tab.value)

    // 设置详细信息
    if (tab.value == 'groups') { //群详情
        detail.value = {
            ...val.id,
            tab: tab.value
        }
    } else { //好友
        const data = {
            ...val.id.user,
            friendship: val.id.friendship,
            age: differenceInYears(
                new Date(),
                new Date(val.id.user.birthday)
            ),
            tab: tab.value
        }

        detail.value = data
    }


    // 打开详情框
    showDetail.value = true
    showNoticelist.value = false
    showNoticelistGroup.value = false

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
    if (user.username) {
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

// 获取好友分组列表，好友列表
socket.on('userGroup', (data) => {
    console.log(data)

    const da = data.map(d => {
        const ugm = d.user_group_members.filter(item => item.user.online == true)
        return {
            ...d,
            onlineCount: ugm.length
        }
    })
    console.log(da)
    userGroupMembers.value = da

    // 好友组列表初始化
    selectgroups.value = da.map(ugm => {
        const group = {
            name: ugm.name,
            id: ugm.id
        }
        return group
    })

    // 默认值初始化
    // 申请好友选择好友组
    applyForm.value.userGroup = selectgroups.value[0]
    // 操作申请消息选择好友组
    applyReceiveUserGroup.value = selectgroups.value[0]

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


const overlay = ref(false)
const searchKey = ref('')
const userOrGroup = ref({
    user: [],
    groups: []
})

// 通知消息列表
const showNoticelist = ref(false)
// 群通知列表
const showNoticelistGroup = ref(false)

// 点击通知
const changeApply = (val) => {

    if(val.id == 'friend') {
        // 打开好友通知栏
        showNoticelist.value = true
        showNoticelistGroup.value = false
        // 获取好友通知
        socket.emit('friendNotification')

    } else {
        // 打开群通知栏
        showNoticelistGroup.value = true
        showNoticelist.value = false
        // 获取群通知
       
        socket.emit('groupNotification')
    }
    showDetail.value = false
    console.log(val.id)
}

// 接收 好友通知
socket.on('friendnotif', (data) => {
    console.log(data)
    notes.value = data
})

const gnotes = ref([])

// 接收 群通知
socket.on('groupnotif', ({data}) => {
    console.log(data)
    gnotes.value = data
})

// 搜索好友/群
const searchUserOrGroup = () => {
    console.log(searchKey.value)
    // 清空
    if (searchKey.value == '') {
        userOrGroup.value = {
            user: [],
            groups: []
        }
    } else {
        socket.emit('searchUserOrGroup', {
            searchKey: searchKey.value
        })
    }
}

// 返回搜索的用户和群
socket.on('userAndGroup', (data) => {
    console.log(data)
    userOrGroup.value = data
})

// 申请好友
const sendoverlay = ref(false)

const sendItem = ref(null)

// 申请好友弹窗，发送的弹窗
const applyFriend = (item) => {
    console.log(item, userGroupMembers.value)

    sendoverlay.value = true
    sendItem.value = item

}



// 发送好友申请
const sendApplyFriend = () => {
    console.log(sendItem.value, applyForm.value)

    socket.emit('applyUser', {
        data:{
            message: applyForm.value.message,
            userGroup: applyForm.value.userGroup.id
        },
        targetUser: sendItem.value
    })
}

const notes = ref([])
const showappFriend = ref(false)

// 发送好友申请成功后返回
socket.on('userApply', (data) => {
    console.log(data)
    notes.value.unshift(data)
    sendoverlay.value = false
})

// 申请加入群聊
const group_sendoverlay = ref(false)
// 选中群信息
const applyGroupData = ref(null)
// 弹出申请加入群聊
const applyGroup = (group) => {

    applyGroupData.value = group

    console.log(group)

    group_sendoverlay.value= true
}

// 加入群聊留言
const applyGroupFrom = ref({
    message: '申请入群'
})
// 发送加入群申请
const sendApplyGroup = (group) => {
    console.log(applyGroupFrom.value, applyGroupData)

    socket.emit('applyGroup', {
        group: applyGroupData.value,
        data: applyGroupFrom.value
    })

    group_sendoverlay.value = false
}

// 入群申请返回
socket.on('groupApply', (data) => {
    console.log(data)
    gnotes.value.unshift(data)
})



// 操作好友请求
const editApplyFriend = (type, friendship, user) => {
    console.log(type, friendship, user)

    user.menu = false

    socket.emit('editApplyFriend', {
        type,
        friendship,
        targetUser: user.user,
        userGroup: applyReceiveUserGroup.value.id
    })
}

// 操作好友申请通过后返回
socket.on('applyFriendEdit', (data) => {
    console.log(data)
    // notes.value.push(data)
    showappFriend.value = false
})

// 操作入群管理
const editApplyGroup = (type, groupMember) => {
    console.log(type, groupMember)

    socket.emit('editApplyGroup', {
        type: type,
        groupMemberId: groupMember.id
    })

}

// 操作入群申请后返回
socket.on('applyGroupEdit', (data) => {
    console.log(data)
})


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
                    <!-- 左侧消息列表 -->
                    <div
                        class="border-l border-r border-r-[rgb(229,234,239)] flex-shrink-0 min-h-[500px] w-[350px] transition-all duration-100">
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
                                                    style="font-family: inherit!important">{{ intlFormatDistance(new
                                                        Date(user.lastMsg.createdAt), new Date()) }}</small>
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
                    <!-- 右侧发送消息框，历史消息记录 -->
                    <div class="flex-1" v-if="showMsg">
                        <div>
                            <!-- 右侧顶部，名字和操作按钮 -->
                            <div class="flex items-center gap-3 p-4 justify-between">
                                <div class="flex gap-4 items-center">
                                    <!-- 私聊 -->
                                    <v-badge v-if="targetUser.tab == 'friends'" dot
                                        :color="targetUser.online ? 'success' : ''" offset-y="36">
                                        <v-avatar size="50px">
                                            <v-img v-if="targetUser.avatar" alt="Avatar" cover
                                                :src="baseUrl + targetUser.avatar.url"></v-img>
                                            <v-icon v-else></v-icon>
                                        </v-avatar>
                                    </v-badge>
                                    <!-- 群聊 -->
                                    <v-avatar v-else size="50px">
                                        <v-img v-if="targetUser.groupAvatar" alt="Avatar" cover
                                            :src="baseUrl + targetUser.groupAvatar.url"></v-img>
                                        <v-icon v-else></v-icon>
                                    </v-avatar>
                                    <!-- 私聊 -->
                                    <div v-if="targetUser.tab == 'friends'" class="flex flex-col justify-center">
                                        <h5 class="text-lg font-semibold leading-6">{{ targetUser.name }}</h5>
                                        <small>{{ targetUser.online ? '[在线]' : '[离线]' }}</small>
                                    </div>
                                    <!-- 群聊 -->
                                    <div v-else class="flex flex-col justify-center">
                                        <h5 class="text-lg font-semibold leading-6">{{ targetUser.name }} ({{
                                            targetUser.group_members.length }})</h5>
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
                            <!-- 右侧消息记录 -->
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
                                                        <span class="text-xs">{{ intlFormatDistance(new
                                                            Date(msg.msg.createdAt), new Date()) }}</span> </small>
                                                    <v-sheet color="rgb(242,246,250)" rounded
                                                        class="rounded-md px-3 py-2 mb-1 max-w-[90%]">
                                                        <p class="text-body-1 w-auto">{{ msg.msg.content }}</p>
                                                    </v-sheet>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                    <!-- 右侧文件 -->
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
                                    <!-- 群聊 右侧群公告/群成员 -->
                                    <div v-if="targetUser.tab == 'groups'"
                                        class="w-[200px] border-l border-[rgb( 229,234,239)] sticky top-0 flex-shrink-0 overflow-y-auto h-[530px]"
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
                                                    style="font-family: inherit!important">群成员 ({{
                                                        targetUser.group_members.length
                                                    }})
                                                </h6>
                                                <v-sheet>
                                                    <v-list nav class="px-0" density="compact">

                                                        <v-list-item class="px-2"
                                                            v-for="(item, i) in targetUser.group_members" :key="item.id"
                                                            :value="item">
                                                            <template v-slot:prepend>
                                                                <v-avatar size="30px">
                                                                    <v-img v-if="item.user.avatar" alt="Avatar" cover
                                                                        :src="baseUrl + item.user.avatar.url"></v-img>
                                                                    <v-icon v-else></v-icon>
                                                                </v-avatar>
                                                            </template>
                                                            <template v-slot:append>
                                                                <v-chip size="small"
                                                                    v-if="targetUser.create_by.id == item.user.id">
                                                                    群主
                                                                </v-chip>
                                                            </template>

                                                            <v-list-item-title v-text="item.user.name"></v-list-item-title>
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
                        <!-- 聊天底部，输入框，发送 -->
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
                <div v-else class="flex flex-1 w-full relative">
                    <!-- 添加好友弹窗 -->
                    <v-overlay v-model="overlay" contained class="align-center justify-center">
                        <v-card class="min-w-[350px] relative">
                            <!-- 申请添加好友 -->
                            <v-overlay v-model="sendoverlay" contained class="align-center justify-center">
                                <v-card class="min-w-[300px] pb-4">
                                    <v-card-title>
                                        <span class="text-sm">申请加好友</span>
                                    </v-card-title>
                                    <v-card-text>
                                        <v-list>
                                            <v-list-item class="px-2">
                                                <template v-slot:prepend>
                                                    <v-avatar size="50px">
                                                        <v-img v-if="sendItem.avatar" alt="Avatar" cover
                                                            :src="baseUrl + sendItem.avatar.url"></v-img>
                                                        <v-icon v-else></v-icon>
                                                    </v-avatar>
                                                </template>
                                                <v-list-item-title style="font-size: 13px;"
                                                    v-text="sendItem.name"></v-list-item-title>
                                                <v-list-item-subtitle v-text="sendItem.email"
                                                    style="font-size: 12px;"></v-list-item-subtitle>
                                            </v-list-item>
                                        </v-list>
                                        <v-sheet class="px-1">
                                            <div class="text-xs mb-2 pl-2">填写验证信息</div>
                                            <v-textarea variant="outlined" hide-details density="compact" color="info"
                                                single-line autocomplete v-model="applyForm.message"></v-textarea>
                                            <div class="text-xs my-2 mt-4 pl-2">分组</div>
                                            <div class="flex gap-2">
                                                <v-select single-line label="Select" density="compact" hide-details
                                                    color="info" v-model="applyForm.userGroup" :items="selectgroups"
                                                    item-title="name" item-value="id" variant="outlined" return-object></v-select>
                                                <v-btn icon="mdi-plus" variant="tonal" rounded="lg"></v-btn>
                                            </div>
                                        </v-sheet>
                                    </v-card-text>
                                    <v-card-actions class="pr-5">
                                        <v-spacer></v-spacer>
                                        <v-btn class="mr-2" variant="tonal" @click="sendoverlay = false">
                                            取消
                                        </v-btn>
                                        <v-btn color="info" variant="tonal" @click="sendApplyFriend">
                                            发送
                                        </v-btn>
                                    </v-card-actions>
                                </v-card>
                            </v-overlay>
                            <!-- 申请加入群 -->
                            <v-overlay v-model="group_sendoverlay" contained class="align-center justify-center">
                                <v-card class="min-w-[300px] pb-4">
                                    <v-card-title>
                                        <span class="text-sm">申请加入群</span>
                                    </v-card-title>
                                    <v-card-text>
                                        <v-list>
                                            <v-list-item class="px-2">
                                                <template v-slot:prepend>
                                                    <v-avatar size="50px">
                                                        <v-img v-if="applyGroupData.groupAvatar" alt="Avatar" cover
                                                            :src="baseUrl + applyGroupData.groupAvatar.url"></v-img>
                                                        <v-icon v-else></v-icon>
                                                    </v-avatar>
                                                </template>
                                                <v-list-item-title style="font-size: 13px;"
                                                    v-text="applyGroupData.name"></v-list-item-title>
                                                <v-list-item-subtitle v-text="applyGroupData.uid"
                                                    style="font-size: 12px;"></v-list-item-subtitle>
                                            </v-list-item>
                                        </v-list>
                                        <v-sheet class="px-1">
                                            <div class="text-xs mb-2 pl-2">填写验证信息</div>
                                            <v-textarea variant="outlined" hide-details density="compact" color="info"
                                                single-line autocomplete v-model="applyGroupFrom.message"></v-textarea>
                                        </v-sheet>
                                    </v-card-text>
                                    <v-card-actions class="pr-5">
                                        <v-spacer></v-spacer>
                                        <v-btn class="mr-2" variant="tonal" @click="group_sendoverlay = false">
                                            取消
                                        </v-btn>
                                        <v-btn color="info" variant="tonal" @click="sendApplyGroup">
                                            发送
                                        </v-btn>
                                    </v-card-actions>
                                </v-card>
                            </v-overlay>
                            <v-card-title>
                                <span class="text-lg">加好友/群</span>
                            </v-card-title>
                            <v-card-text>
                                <v-text-field :loading="loading" density="compact" variant="outlined"
                                    label="Search templates" append-inner-icon="mdi-magnify" single-line hide-details
                                    @click:append-inner="searchUserOrGroup" color="info" @keydown.enter="searchUserOrGroup"
                                    v-model="searchKey"></v-text-field>

                                <v-sheet class="h-[399px] overflow-auto mt-2">
                                    <v-list v-if="userOrGroup.users">
                                        <v-list-subheader v-if="userOrGroup.users.length > 0">查找人</v-list-subheader>

                                        <v-list-item class="px-2 py-2" v-for="(item, i) in userOrGroup.users" :key="item.id"
                                            :value="item">
                                            <template v-slot:prepend>
                                                <v-avatar size="40px">
                                                    <v-img v-if="item.avatar" alt="Avatar" cover
                                                        :src="baseUrl + item.avatar.url"></v-img>
                                                    <v-icon v-else></v-icon>
                                                </v-avatar>
                                            </template>
                                            <template v-slot:append>
                                                <v-btn size="small" variant="tonal" @click="applyFriend(item)">
                                                    添加
                                                </v-btn>
                                            </template>

                                            <v-list-item-title style="font-size: 14px"
                                                v-text="item.name"></v-list-item-title>
                                            <v-list-item-subtitle v-text="item.email"
                                                style="font-size: 12px;"></v-list-item-subtitle>
                                        </v-list-item>
                                    </v-list>
                                    <hr>
                                    <v-list v-if="userOrGroup.groups">
                                        <v-list-subheader v-if="userOrGroup.groups.length > 0">查找群</v-list-subheader>

                                        <v-list-item class="px-2 py-2" v-for="(item, i) in userOrGroup.groups"
                                            :key="item.id" :value="item">
                                            <template v-slot:prepend>
                                                <v-avatar size="40px">
                                                    <v-img v-if="item.groupAvatar" alt="Avatar" cover
                                                        :src="baseUrl + item.groupAvatar.url"></v-img>
                                                    <v-icon v-else></v-icon>
                                                </v-avatar>
                                            </template>
                                            <template v-slot:append>
                                                <v-btn size="small" @click="applyGroup(item)" variant="tonal">
                                                    加入
                                                </v-btn>
                                            </template>
                                            <template v-slot:title>
                                                <div class="text-sm">{{ item.name }}</div>
                                            </template>
                                            <template v-slot:subtitle>
                                                <div class="text-xs">{{ item.uid }}</div>
                                            </template>
                                        </v-list-item>
                                    </v-list>
                                </v-sheet>
                            </v-card-text>
                        </v-card>
                    </v-overlay>
                    <!-- left 联系人/群列表 -->
                    <div
                        class="border-l border-r border-r-[rgb(229,234,239)] flex-shrink-0 min-h-[500px] w-[350px] transition-all duration-100">
                        <div>
                            <!-- 搜索 / 列表切换 -->
                            <v-sheet>
                                <div class="px-6 pt-2">
                                    <!-- 输入 -->
                                    <div class="flex space-x-2">
                                        <v-text-field :loading="loading" density="compact" variant="outlined" label="搜索"
                                            prepend-inner-icon="mdi-magnify" single-line hide-details v-model="input"
                                            @click:append-inner="onClick" color="info"></v-text-field>

                                        <!-- 添加好友 -->
                                        <v-menu location="end" transition="slide-x-transition">
                                            <template v-slot:activator="{ props }">
                                                <v-btn v-bind="props" icon="mdi-plus" variant="tonal" rounded="lg"></v-btn>
                                            </template>
                                            <v-list v-list nav density="compact">
                                                <v-list-item>
                                                    发起群聊
                                                </v-list-item>
                                                <v-list-item @click="overlay = true">
                                                    加好友/群
                                                </v-list-item>
                                            </v-list>
                                        </v-menu>
                                    </div>
                                    <!-- 好友通知,群通知 -->
                                    <v-list @click:select="changeApply" v-list nav class="px-0"
                                        density="compact">
                                        <v-list-item value="friend">
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
                                                <v-expansion-panel-title>{{ userGroup.name }}({{
                                                    userGroup.onlineCount }}/{{ userGroup.user_group_members.length
    }}）</v-expansion-panel-title>
                                                <v-expansion-panel-text>
                                                    <v-list @click:select="selectDetail" class="pt-2 pb-0">
                                                        <v-list-item v-for="user in userGroup.user_group_members"
                                                            :key="user.id" :value="user" active-class="active"
                                                            class="px-6 py-4 cursor-pointer">
                                                            <!-- 头像 -->
                                                            <template v-slot:prepend>
                                                                <v-badge dot :color="user.user.online ? 'success' : ''"
                                                                    offset-y="32">
                                                                    <v-avatar size="45">
                                                                        <v-img v-if="user.user.avatar.url" cover
                                                                            alt="Avatar"
                                                                            :src="baseUrl + user.user.avatar.url"></v-img>
                                                                        <v-icon v-else></v-icon>
                                                                    </v-avatar>
                                                                </v-badge>
                                                            </template>
                                                            <div>
                                                                <div class="flex items-center">
                                                                    <h5 class="text-sm font-semibold"
                                                                        style="font-family: inherit!important">{{
                                                                            user.user.name }}</h5>
                                                                </div>
                                                                <div class="flex items-center mt-1">
                                                                    <h6 class="text-xs font-normal"
                                                                        style="font-family: inherit!important">
                                                                        {{ user.user.online ? '[在线]' : '[离线]' }}{{
                                                                            user.user.description }}</h6>
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
                    <!-- right 好友/群详情 -->
                    <div class="flex-1 py-10" v-if="showDetail">
                        <v-sheet>
                            <!-- 右侧顶部，名字，操作 -->
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
                            <!-- 好友详情 -->
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
                            <!-- 群详情 -->
                            <v-sheet v-else class="px-8 py-4">
                                <v-list class="px-0 mt-8" density="compact" nav>
                                    <v-list-item class="px-0 py-2">
                                        <template v-slot:prepend>
                                            <v-icon size="large" icon="mdi-account-group"></v-icon>
                                        </template>
                                        <template v-slot:title>
                                            <h5 class="text-sm" v-if="detail.group_members">群成员({{
                                                detail.group_members.length }}人)</h5>
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
                                                <v-menu min-width="200" rounded v-for="user in detail.group_members"
                                                    location="bottom" :offset="[5, 60]">
                                                    <template v-slot:activator="{ props }">
                                                        <v-btn icon v-bind="props">
                                                            <v-avatar size="50px" :key="user.user.username">
                                                                <v-img v-if="user.user.avatar" alt="Avatar" cover
                                                                    :src="baseUrl + user.user.avatar.url"></v-img>
                                                                <v-icon v-else></v-icon>
                                                            </v-avatar>
                                                        </v-btn>
                                                    </template>
                                                    <v-card rounded="xl">
                                                        <v-card-text>
                                                            <div class="mx-auto text-center">
                                                                <v-avatar size="60px">
                                                                    <v-img v-if="user.user.avatar" alt="Avatar" cover
                                                                        :src="baseUrl + user.user.avatar.url"></v-img>
                                                                    <v-icon v-else></v-icon>
                                                                </v-avatar>
                                                                <h3 class="text-lg my-2">{{ user.user.name }}</h3>
                                                                <p class="text-caption mt-1">
                                                                    {{ user.user.email }}
                                                                </p>
                                                                <v-divider class="my-3"></v-divider>
                                                                <v-btn rounded variant="tonal"
                                                                    @click="applyFriend(user.user.id)">
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
                        </v-sheet>
                    </div>
                    <!-- 好友通知列表 -->
                    <div v-if="showNoticelist" class="flex-1">
                        <v-sheet>
                            <v-toolbar>

                                <v-toolbar-title>好友通知</v-toolbar-title>

                                <v-spacer></v-spacer>

                                <v-btn icon>
                                    <v-icon>mdi-delete-outline</v-icon>
                                </v-btn>
                            </v-toolbar>
                            <div class="overflow-auto max-h-[700px] mt-2">
                                <v-list lines="two" variant="tonal" v-if="notes" class="pt-0 px-4" nav>
                                    <v-list-item v-for="user in notes" class="my-4">
                                        <template v-slot:prepend>
                                            <v-avatar size="60px">
                                                <v-img v-if="user.user.avatar" alt="Avatar" cover
                                                    :src="baseUrl + user.user.avatar.url"></v-img>
                                                <v-icon v-else></v-icon>
                                            </v-avatar>
                                        </template>
                                        <template v-slot:title>
                                            <div>
                                                <span class="text-info mr-2">{{ user.user.name }}</span>
                                                <template v-if="user.me">
                                                    <span v-if="user.message.status == 'pending'">正在验证你的邀请</span>
                                                    <span v-else-if="user.message.status =='accepted'">同意了你的邀请</span>
                                                    <span v-else>拒绝了你的邀请</span>
                                                </template>
                                                <span v-else>请求加为好友</span>
                                                <span class="ml-2" v-if="user.message">{{ format(new Date(user.message.createdAt),
                                                    'yyyy/MM/dd HH:mm') }}</span>
                                            </div>
                                        </template>
                                        <template v-slot:subtitle>
                                            <div class="mt-1">留言：{{ user.message.content }}</div>
                                        </template>
                                        <template v-slot:append>
                                            <!-- 接收者 同意还是拒绝 -->
                                            <v-menu v-if="!user.me && user.message.status == 'pending'"
                                                v-model="user.menu" :close-on-content-click="false" location="end">
                                                <template v-slot:activator="{ props }">
                                                    <v-btn icon="mdi-dots-horizontal" v-bind="props"></v-btn>
                                                </template>

                                                <v-card min-width="300" class="pb-4" rounded="large">
                                                    <v-card-text>
                                                        <v-list>
                                                            <v-list-item>
                                                                <template v-slot:prepend>
                                                                    <v-avatar size="60px">
                                                                        <v-img v-if="user.user.avatar" alt="Avatar"
                                                                            cover
                                                                            :src="baseUrl + user.user.avatar.url"></v-img>
                                                                        <v-icon v-else></v-icon>
                                                                    </v-avatar>
                                                                </template>
                                                                <template v-slot:title>
                                                                    <div>
                                                                        <span class="text-info mr-2">{{ user.user.name
                                                                        }}</span>
                                                                    </div>
                                                                </template>
                                                                <template v-slot:subtitle>
                                                                    <div class="mt-1">留言：{{ user.message.content }}</div>
                                                                </template>
                                                            </v-list-item>
                                                        </v-list>
                                                        <div class="text-xs my-2 mt-4 pl-2">分组</div>
                                                        <div class="flex gap-2">
                                                            <v-select single-line label="Select" density="compact"
                                                                hide-details color="info" v-model="applyReceiveUserGroup"
                                                                :items="selectgroups" item-title="name"
                                                                item-value="id" variant="outlined" return-object></v-select>
                                                            <v-btn icon="mdi-plus" variant="tonal" rounded="lg"></v-btn>
                                                        </div>
                                                    </v-card-text>
                                                    <v-card-actions class="pr-4">
                                                        <v-spacer></v-spacer>
                                                        <v-btn variant="tonal"
                                                            @click="editApplyFriend('rejected', user.friendship, user)">
                                                            拒绝
                                                        </v-btn>
                                                        <v-btn color="info" variant="tonal"
                                                            @click="editApplyFriend('accepted', user.friendship, user)">
                                                            同意
                                                        </v-btn>
                                                    </v-card-actions>
                                                </v-card>
                                            </v-menu>
                                            <div v-else class="text-sm mr-4">{{ user.message.status == 'pending' ? '等待验证'
                                                : user.message.status == 'accepted' ? '已同意' : '已拒绝'
                                            }}</div>
                                        </template>
                                    </v-list-item>
                                </v-list>
                            </div>
                        </v-sheet>
                    </div>
                    <!-- 群通知列表 -->
                    <div v-if="showNoticelistGroup" class="flex-1">
                        <v-sheet>
                            <v-toolbar>

                                <v-toolbar-title>群通知</v-toolbar-title>

                                <v-spacer></v-spacer>

                                <v-btn icon>
                                    <v-icon>mdi-delete-outline</v-icon>
                                </v-btn>
                            </v-toolbar>
                            <div class="overflow-auto max-h-[700px] mt-2">
                                <v-list lines="two" variant="tonal" v-if="notes" class="pt-0 px-4" nav>
                                    <v-list-item v-for="note in gnotes" class="my-4">
                                        <template v-slot:prepend>
                                            <v-avatar v-if="note.me" size="60px">
                                                <v-img v-if="note.message.group.groupAvatar" alt="Avatar" cover
                                                    :src="baseUrl + note.message.group.groupAvatar.url"></v-img>
                                                <v-icon v-else></v-icon>
                                            </v-avatar>
                                            <v-avatar v-else size="60px">
                                                <v-img v-if="note.message.sender.avatar" alt="Avatar" cover
                                                    :src="baseUrl + note.message.sender.avatar.url"></v-img>
                                                <v-icon v-else></v-icon>
                                            </v-avatar>
                                        </template>
                                        <template v-slot:title>
                                            <div>
                                                <template v-if="note.me">
                                                    <span class="text-info mr-2">{{ note.message.group.name}}</span>
                                                    <span v-if="note.message.status == 'pending'">正在验证你的入群申请</span>
                                                    <span v-else-if="note.message.status == 'accepted'">同意了你的入群申请</span>
                                                    <span v-else>拒绝了你的入群申请</span>
                                                </template>
                                                <template v-else>
                                                    <span class="text-info mr-2">{{ note.message.sender.name }}</span>
                                                    <span >请求加入群 <span class="text-info">{{ note.message.group.name }}</span></span>
                                                </template>
                                                <span class="ml-2">{{ format(new Date(note.message.createdAt),
                                                    'yyyy/MM/dd HH:mm') }}</span>
                                            </div>
                                        </template>
                                        <template v-slot:subtitle>
                                            <div class="mt-1">留言：{{ note.message.content }}</div>
                                            <div class="text-info" v-if="note.groupMember.operator">操作人：{{ note.groupMember.operator.name}}</div>
                                        </template>
                                        <template v-slot:append>
                                            <!-- 接收者 同意还是拒绝 -->
                                            <v-menu v-if="!note.me && note.message.status == 'pending'"
                                                v-model="note.menu" :close-on-content-click="false" location="end">
                                                <template v-slot:activator="{ props }">
                                                    <v-btn icon="mdi-dots-horizontal" v-bind="props"></v-btn>
                                                </template>
                                                <v-card min-width="300" class="pb-4" rounded="large">
                                                    <v-card-text>
                                                        <v-list>
                                                            <v-list-item>
                                                                <template v-slot:prepend>
                                                                    <v-avatar size="60px">
                                                                        <v-img v-if="note.message.sender.avatar" alt="Avatar"
                                                                            cover
                                                                            :src="baseUrl + note.message.sender.avatar.url"></v-img>
                                                                        <v-icon v-else></v-icon>
                                                                    </v-avatar>
                                                                </template>
                                                                <template v-slot:title>
                                                                    <div>
                                                                        <span class="text-info mr-2">{{ note.message.sender.name
                                                                        }}</span>
                                                                    </div>
                                                                </template>
                                                                <template v-slot:subtitle>
                                                                    <div class="mt-1">留言：{{ note.message.content }}</div>
                                                                </template>
                                                            </v-list-item>
                                                        </v-list>
                                                    </v-card-text>
                                                    <v-card-actions class="pr-4">
                                                        <v-spacer></v-spacer>
                                                        <v-btn variant="tonal"
                                                            @click="editApplyGroup('rejected', note.groupMember)">
                                                            拒绝
                                                        </v-btn>
                                                        <v-btn color="info" variant="tonal"
                                                            @click="editApplyGroup('accepted', note.groupMember)">
                                                            同意
                                                        </v-btn>
                                                    </v-card-actions>
                                                </v-card>
                                            </v-menu>
                                            <div v-else class="text-sm mr-4">{{ note.message.status == 'pending' ? '等待验证'
                                                : note.message.status == 'accepted' ? '已同意' : '已拒绝'
                                            }}</div>
                                        </template>
                                    </v-list-item>
                                </v-list>
                            </div>
                        </v-sheet>
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
}</style>