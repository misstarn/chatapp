<script setup>
import {
  differenceInYears,
  format,
  getDate,
  getMonth,
  intlFormatDistance,
} from "date-fns";
import * as fancyapps from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import 'vue3-emoji-picker/css'
import EmojiPicker from "vue3-emoji-picker";

const { Fancybox } = fancyapps;

Fancybox.bind("[data-fancybox]", {
  // Your custom options
});

const baseUrl = useRuntimeConfig().public.baseUrl;

// 在store读取token和user
const authStore = useStore().useAuthStore();
const msgStore = useStore().useMsgStore();
const keysStore = useStore().useKeysStore();

const { token, user, logout: logoutUser } = authStore;
const { friends: fri, clearMessage } = msgStore;
const { keyList, privateKey, publicKey, clearKey } = keysStore;

import { io } from "socket.io-client";

definePageMeta({
  middleware: [
    function (to, from) {
      // Custom inline middleware
    },
    "home-middleware",
  ],
});

const applyForm = ref({
  message: "请求添加好友",
  userGroup: null,
});
// 同意申请，并选择分组
const applyReceiveUserGroup = ref(null);

// 好友分组选择列表
const selectgroups = ref([]);

const SERVER_URL = useRuntimeConfig().public.socketUrl;
// socket
const socket = io(SERVER_URL, {
  auth: {
    token: token,
  },
});

// 连接和重连时触发
if (token) {
  socket.on("connect", () => {
    // 设置当前用户发送服务端
    socket.emit("setUsername", user);

    // console.log(socket.id)

    const engine = socket.io.engine;
    // console.log(engine.transport.name)

    engine.once("upgrade", () => {
      // 当传输升级时调用
      // console.log(engine.transport.name)
    });
  });
}

// 当前用户
const currentUser = ref({});

// 发送信息给谁
const targetUser = ref({});

// 个人信息
socket.on("userInfo", (data) => {
  // console.log(data)

  currentUser.value = data;
});

// 消息列表
const friends = ref(fri);

const groups = ref([]);

// 获取群聊列表
socket.on("groups", (data) => {
  const gs = data.map((g) => {
    return {
      ...g.group,
      group_member: g.id,
    };
  });
  groups.value = gs;
  // console.log(groups.value)
});

const db = ref(null);

const openDatabase = async () => {
  // 打开或创建数据库
  const request = indexedDB.open(`${user.username}-db`, 3);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;

    const objectSotre = db.createObjectStore("messages", {
      autoIncrement: true,
    });
    const objectSotreG = db.createObjectStore("group-messages", {
      autoIncrement: true,
    });

    objectSotre.createIndex("uid", "uid", { unique: false });
    objectSotre.createIndex("createdAt", "createdAt", { unique: false });

    objectSotreG.createIndex("uid", "uid", { unique: false });
    objectSotreG.createIndex("createdAt", "createdAt", { unique: false });
    objectSotreG.createIndex("mid", "mid", { unique: true });
  };

  request.onsuccess = (event) => {
    db.value = event.target.result;
  };
};

const insertMessage = async (message) => {
  if (!db.value) {
    // 如果数据库未打开，先打开它
    await openDatabase();
  }
  let status = false;
  // 创建事务
  const transaction = db.value.transaction(["messages"], "readwrite");
  const transactionG = db.value.transaction(["group-messages"], "readwrite");

  transaction.oncomplete = () => {
    // 事务成功完成
    console.log("完成.");
  };

  transaction.onerror = (event) => {
    // 事务出错
    console.error("出错:", event.target.error);
  };

  transactionG.oncomplete = () => {
    // 事务成功完成
    console.log("完成.");
  };

  transactionG.onerror = (event) => {
    // 事务出错
    // console.error('出错:', event.target.error);
    if (event.target.error.name === "ConstraintError") {
      console.log("数据已存在，无法添加重复数据。");
      // 在这里可以执行其他处理逻辑
    }
  };

  console.log(message);
  if (!status) {
    if (message.isGroupMessage) {
      const messageStore = transactionG.objectStore("group-messages");
      const msg = messageStore.add({
        ...message,
        mid: message.msg.mid,
      });

      msg.onsuccess = () => {
        console.log("值已插入");
        // 提交事务
        transaction.oncomplete = () => {
          console.log("事务已提交");
        };
      };
      status = true;
    } else {
      const messageStore = transaction.objectStore("messages");
      const msg = messageStore.add({
        ...message,
      });

      msg.onsuccess = () => {
        console.log("值已插入");
        // 提交事务
        transaction.oncomplete = () => {
          console.log("事务已提交");
        };
      };
      status = true;
    }
  }
};

onMounted(() => {
  // 执行数据库初始化
  openDatabase();
});

// 好友组列表和好友
const userGroupMembers = ref([]);

const friends11 = ref([]);
// 获取好友分组列表，好友列表
socket.on("userGroup", (data) => {
  friends11.value = [];
  const da = data.map((d) => {
    const ugm = d.user_group_members.filter((item) => item.user.online == true);

    return {
      ...d,
      onlineCount: ugm.length,
    };
  });
  userGroupMembers.value = da;

  // 好友组选择项初始化
  selectgroups.value = da.map((ugm) => {
    friends11.value = [...friends11.value, ...ugm.user_group_members];
    const group = {
      name: ugm.name,
      id: ugm.id,
    };
    return group;
  });

  // console.log(da, friends11.value)
  // 默认值初始化
  // 申请好友选择好友组
  applyForm.value.userGroup = selectgroups.value[0];
  // 操作申请消息选择好友组
  applyReceiveUserGroup.value = selectgroups.value[0];
});

// 遇见错误
socket.on("connect_error", () => {
  setTimeout(() => {
    socket.connect();
  }, 1000);
});

// 断开
socket.on("disconnect", (reason) => {
  if (reason === "io server disconnect") {
    socket.connect();
  }
  // console.log(socket.id)
});

// 接收离线消息
socket.on("offlineMessages", async (data) => {
  // console.log(data)
  const messages = data.map((message) => {
    if (message.isGroupMessage) {
      return {
        user: {
          avatar: message.sender.avatar,
          id: message.sender.id,
          name: message.sender.name,
          uid: message.group.uid,
          username: message.group.groupname,
        },
        me: false,
        msg: {
          content: message.content,
          createdAt: message.createdAt,
          fileName: message.fileName,
          isGroupMessage: message.isGroupMessage,
          iv: message.iv,
          jwk_key: message.jwk_key,
          type: message.type,
          success: true,
          status: message.status,
          mid: message.id,
        },
        uid: message.group.uid,
        createdAt: message.createdAt,
        isGroupMessage: message.isGroupMessage,
        isRead: false,
      };
    } else {
      return {
        user: {
          avatar: message.sender.avatar,
          id: message.sender.id,
          name: message.sender.name,
          uid: message.sender.uid,
          username: message.sender.username,
        },
        me: false,
        msg: {
          content: message.content,
          createdAt: message.createdAt,
          fileName: message.fileName,
          isGroupMessage: message.isGroupMessage,
          iv: message.iv,
          jwk_key: message.jwk_key,
          type: message.type,
          success: true,
          status: message.status,
        },
        uid: message.sender.uid,
        createdAt: message.createdAt,
        isGroupMessage: message.isGroupMessage,
        isRead: false,
      };
    }
  });
  // console.log(messages)

  // 保存消息记录

  const userGroups = userGroupMembers.value.flatMap(
    (userGroup) => userGroup.user_group_members
  );

  // console.log(userGroups)
  // 所有用户组的用户
  const friends22 = userGroups.map((usergroup) => ({
    ...usergroup.user,
    friendship: usergroup.friendship,
    count: 0,
    tab: "friends",
  }));

  // 所有群
  const groups22 = groups.value.map((group) => ({
    ...group,
    count: 0,
    tab: "groups",
  }));

  // console.log(groups22, friends22)

  for (let i = 0; i < messages.length; i++) {
    await insertMessage(JSON.parse(JSON.stringify(messages[i])));

    const lastM = await decryptMessage(messages[i].msg);
    // 接收消息的
    let current = getFriend(messages[i].user);

    if (current) {
      // 最近消息
      current.lastMsg = {
        // content: message.msg.content,
        username: messages[i].user.name,
        content: lastM,
        type: messages[i].msg.type,
        createdAt: messages[i].msg.createdAt,
      };
      current.count = current.count + 1;
    } else {
      if (messages[i].isGroupMessage) {
        current = groups22.find((group) => group.uid == messages[i].user.uid);
      } else {
        current = friends22.find((user) => user.uid == messages[i].user.uid);
      }
      // 最近消息
      current.lastMsg = {
        // content: message.msg.content,
        username: messages[i].user.name,
        content: lastM,
        type: messages[i].msg.type,
        createdAt: messages[i].msg.createdAt,
      };
      current.count = current.count + 1;

      console.log(current);

      friends.value.push(current);
    }

    // 添加到消息列表并更新
    msgStore.$patch({
      friends: friends.value,
    });
  }
});

// 更新消息列表, 历史记录消息
const updateMsg = async (message) => {
  // console.log(message)
  // 解密消息
  message.msg.content = await decryptMessage(message.msg);

  // console.log(message)
  messages.value.unshift(message);
  nextTick(() => {
    // 发信息才下拉到底部
    // if (message.me || (scrollContainer.value.scrollTop + 845) >= scrollContainer.value.scrollHeight) {
    //     scrollToBottom()
    // }
    ScrollToPre();
  });

  // console.log(messages)
};
const updateMsg2 = async (message) => {
  // console.log(message)
  // 解密消息
  message.msg.content = await decryptMessage(message.msg);

  // console.log(message)
  messages.value.push(message);
  nextTick(() => {
    // 发信息才下拉到底部
    if (
      message.me ||
      scrollContainer.value.scrollTop + 845 >=
        scrollContainer.value.scrollHeight
    ) {
      scrollToBottom();
    }
  });

  // console.log(messages)
};

let crypto = ref(null);
const userFilter = [
  "username",
  "online",
  "name",
  "email",
  "uid",
  "birthday",
  "gender",
  "region",
  "description",
];

onMounted(() => {
  if (process.client) {
    crypto.value = window.crypto;
  }
});

let lists = ref([]);
const start = ref(0);
const limit = ref(15);
const messagesCount = ref(0); //计数器用于跟踪已获取的消息

// 获取历史消息
const getHistory = async (start1) => {
  // console.log(start1, messages.value)

  start.value = start1; // 起始
  messagesCount.value = 0; //计数器

  lists.value = [];
  console.log(start, targetUser.value, "000000000");

  const uid = targetUser.value.uid;

  if (!db.value) {
    await openDatabase();
  }

  const transaction = db.value.transaction(["messages"]);
  const transactionG = db.value.transaction(["group-messages"]);

  // 私聊消息
  if (targetUser.value.tab == "friends") {
    const request = transaction
      .objectStore("messages")
      .index("createdAt")
      .openCursor(null, "prev");

    request.onsuccess = async (event) => {
      const cursor = event.target.result;

      if (cursor && messagesCount.value < limit.value) {
        if (cursor.value.uid === uid) {
          // 还没达到起始地址
          if (start.value > 0) {
            start.value--;
          } else {
            // 当前消息在限制范围
            lists.value.push(cursor.value);
            messagesCount.value++;
          }
        }
        cursor.continue();
      } else {
        // 获取了指定的所有消息
        // console.log(lists.value, limit.value, start.value)
        for (let k = 0; k < lists.value.length; k++) {
          await updateMsg(lists.value[k]);
        }
      }
    };
  } else {
    //群聊消息
    const request = transactionG
      .objectStore("group-messages")
      .index("createdAt")
      .openCursor(null, "prev");

    request.onsuccess = async (event) => {
      const cursor = event.target.result;

      if (cursor && messagesCount.value < limit.value) {
        if (cursor.value.uid === uid) {
          // 还没达到起始地址
          if (start.value > 0) {
            start.value--;
          } else {
            // 当前消息在限制范围
            lists.value.push(cursor.value);
            messagesCount.value++;
          }
        }
        cursor.continue();
      } else {
        // 获取了指定的所有消息
        // console.log(lists.value, limit.value, start.value)
        for (let k = 0; k < lists.value.length; k++) {
          await updateMsg(lists.value[k]);
        }
      }
    };
  }

  //
};

// 生成随机的 IV（初始化向量）
async function generateRandomIV() {
  return await crypto.value.getRandomValues(new Uint8Array(12)); // 12字节的 IV（96位）
}

// 生成对称密钥
async function generateSymmetricKey() {
  // 生成对称密钥
  return await crypto.value.subtle.generateKey(
    {
      name: "AES-GCM", // 对称加密算法（可以根据需求选择其他算法）
      length: 256, // 密钥长度（可以根据需求选择不同的长度）
    },
    true, // 是否可导出密钥
    ["encrypt", "decrypt"] // 使用密钥的操作
  );

  // console.log('生成的对称密钥:', key);

  // crypto.value.subtle.exportKey('jwk', key).then(jwk => {
  //     console.log(jwk)
  //     msgStore.$patch({
  //         symmetricKey: jwk
  //     })
  // })

  // 可以将密钥存储在 Vuex 等状态管理中，以供后续使用
}

// 加密消息
async function encryptMessage(message, symmetricKey) {
  try {
    // 生成随机IV
    const iv = await generateRandomIV();

    // 将消息转换为ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // 使用对称密钥和IV加密消息
    const encryptedData = await crypto.value.subtle.encrypt(
      {
        name: "AES-GCM", //加密算法
        iv, //初始化向量
      },
      symmetricKey, //对称密钥
      data //要加密的数据
    );

    // 返回加密后的数据和IV
    return { encryptedData, iv };
  } catch (error) {
    console.error("加密消息时出错：", error);
    throw error;
  }
}

// 解密消息
async function decryptMessage(message) {
  // console.log(message)

  const messageData = base64ToArrayBuffer(message.content);

  const symmKey = await jwkToCryptoKey(JSON.parse(message.jwk_key));

  const iv = hexToUint8Array(message.iv);

  // 解密
  try {
    // 使用对称密钥和IV解密消息
    const decryptedData = await crypto.value.subtle.decrypt(
      {
        name: "AES-GCM", // 加密算法
        iv: iv, //初始化向量
      },
      symmKey, //对称密钥
      messageData //加密后的数据
    );
    // 将解密后的数据转换为字符串
    const decoder = new TextDecoder();
    const decryptedMessage = decoder.decode(decryptedData);

    // 返回解密后的消息
    // console.log(decryptedMessage)

    return decryptedMessage;
  } catch (error) {
    console.error("解密消息时出错：", error);
    throw error;
  }
}

// 发送信息
const message = ref("");

// 发送私聊消息
const send = async () => {
  // console.log(message.value, targetUser.value)

  // 查找对方的密钥
  let jwk = {};
  jwk = keyList.find((key) => key.name == targetUser.value.uid);

  //
  // console.log(jwk)

  let symmetricKey1 = null;
  let publicKey1 = null;

  if (jwk && jwk.keys.symmetricKey) {
    // 如果已存在，就是交换了密钥的
    // jwk转换出对称密钥
    symmetricKey1 = await jwkToCryptoKey(jwk.keys.symmetricKey);
  } else {
    // 不存在- 生成对称密钥
    await generateSymmetricKey().then(async (symmetricKey) => {
      // console.log(symmetricKey, publicKey1)
      symmetricKey1 = symmetricKey;
      // 将对称密钥提取jwk，保存到密钥队中
      crypto.value.subtle.exportKey("jwk", symmetricKey).then(async (jwk1) => {
        jwk = {
          keys: {
            symmetricKey: jwk1,
          },
        };
        // console.log(jwk1)
        keyList.push({
          name: targetUser.value.uid,
          keys: {
            symmetricKey: jwk1,
            publicKey: {},
          },
        });
        keysStore.$patch({
          keyList: keyList,
        });
      });
    });
  }

  // console.log(symmetricKey1, jwk)

  // 加密消息 使用对称密钥
  const { encryptedData, iv } = await encryptMessage(
    message.value,
    symmetricKey1
  );

  // 将加密消息转换为字符串
  const dataString = arrayBufferToBase64(encryptedData);
  // 将iv转换为字符串
  const ivString = unit8ArrayToHex(iv);

  // console.log(encryptedData, iv, dataString, ivString)
  // console.log(base64ToArrayBuffer(dataString), hexToUint8Array(ivString))

  if (message.value) {
    socket.emit("privateMessage", {
      targetUser: targetUser.value,
      message: dataString,
      type: "message",
      fileName: "",
      iv: ivString,
      key: JSON.stringify(jwk.keys.symmetricKey),
      fileId: 0,
    });
  }
  message.value = "";

  // 发送文件
  if (files.value) {
    console.log(files.value);
    for (let i = 0; i < files.value.length; i++) {
      // 单独发送
      const message = {
        me: true,
        user: currentUser.value,
        msg: {
          createdAt: new Date(),
          type: "image",
          fileName: files.value[i].name,
          content: images.value[i],
          status: "pending",
          success: true,
        },
        filename: files.value[i].name,
      };
      messages.value.push(message);
      // console.log(messages.value.length)

      // 上传文件
      await upload(files.value[i]).then(async (res) => {
        // console.log(res)
        // 加密消息
        const { encryptedData: encryptedData11, iv: iv11 } =
          await encryptMessage(res.value[0].url, symmetricKey1);
        // 将加密消息转换为字符串
        const dataString22 = arrayBufferToBase64(encryptedData11);
        // 将iv转换为字符串
        const ivString22 = unit8ArrayToHex(iv11);

        // 上传成功后发送消息
        console.log("发送");
        socket.emit("privateMessage", {
          targetUser: targetUser.value,
          message: dataString22,
          type: "image",
          iv: ivString22,
          key: JSON.stringify(jwk.keys.symmetricKey),
          fileName: res.value[0].name,
          fileId: res.value[0].id,
        });
      });
    }

    // 清空文件
    files.value = [];
    images.value = [];
    sendImage.value = false;
  }
};

// 登出
const logout = () => {
  logoutUser();

  localStorage.removeItem("auth");
  localStorage.removeItem("message");
  localStorage.removeItem("keys");

  navigateTo("/login");

  socket.disconnect();
};

// 监听返回私聊消息
socket.on("receivePrivateMessage", async (message) => {
  // 展示私人消息
  console.log("返回私聊");
  console.log(message, message.user);
  const msg = message.msg;

  // 将加密消息字符串转换为arryBuffer加密消息

  // 将加密消息使用对称密钥解密
  let jwk = null;

  let symmetricKey = null;

  // 是否是群消息，群消息就没有jwk,私聊才需要去找
  if (message.msg.isGroupMessage) {
    message.me = message.user.id == targetUser.value.id ? true : false;
    // 是群消息
  } else {
    // 不是群消息
    jwk = keyList.find((key) => key.name == message.user.uid);
    // console.log(jwk)
    if (jwk) {
      msg.jwk_key = JSON.stringify(jwk.keys.symmetricKey);
    }
  }

  // 将图片消息状态修改为完成
  if (message.msg.type == "image") {
    msg.status = "accepted";
  }

  let mg2 = {
    uid: message.user.uid,
    createdAt: message.msg.createdAt,
    isGroupMessage: message.msg.isGroupMessage,
    isRead: false,
  };

  await insertMessage(
    JSON.parse(
      JSON.stringify({
        ...message,
        ...mg2,
      })
    )
  );

  // 将消息解密出来放入最后一条记录
  const lastM = await decryptMessage(message.msg);

  // console.log(lastM)

  // console.log(message)

  // 接收方,查找消息发送方,更新最后消息
  let friend = getFriend(message.user);

  // console.log(friend)

  const userGroups = userGroupMembers.value.flatMap(
    (userGroup) => userGroup.user_group_members
  );

  // console.log(userGroups)
  // 所有用户组的用户
  const friends22 = userGroups.map((usergroup) => ({
    ...usergroup.user,
    friendship: usergroup.friendship,
    count: 0,
    tab: "friends",
  }));

  // 所有群
  const groups22 = groups.value.map((group) => ({
    ...group,
    count: 0,
    tab: "groups",
  }));

  // console.log(groups22, friends22)

  if (friend) {
    friend.lastMsg = {
      // content: message.msg.content,
      username: message.user.name,
      content: lastM,
      type: message.msg.type,
      createdAt: message.msg.createdAt,
    };
  } else {
    // 接收消息的
    let current;
    if (message.msg.isGroupMessage) {
      current = groups22.find((group) => group.uid == message.user.uid);
    } else {
      current = friends22.find((user) => user.uid == message.user.uid);
    }
    // 最近消息
    current.lastMsg = {
      // content: message.msg.content,
      username: message.user.name,
      content: lastM,
      type: message.msg.type,
      createdAt: message.msg.createdAt,
    };

    console.log(current);

    friends.value.push(current);
    // 添加到消息列表并更新
    msgStore.$patch({
      friends: friends.value,
    });

    // 发送方,查看接收方,更新最后消息
    friend = getFriend(targetUser.value);
    if (friend) {
      friend.lastMsg = {
        // content: message.msg.content,
        content: lastM,
        type: message.msg.type,
        createdAt: message.msg.createdAt,
      };
    }
  }

  if (message.me || (!message.me && message.user.id == targetUser.value.id)) {
    // 更新消息列表查看
    if (message.msg.type == "image" && message.me) {
      const msg = messages.value.find(
        (message11) => message11.filename == message.msg.fileName
      );
      msg.msg.content = lastM;
      msg.msg.status = "accepted";
      console.log(msg, messages.value);
      scrollToBottom();
    } else {
      updateMsg2(message);
    }
  } else {
    // 存储未读消息
    storeMessageForLaterUser(message);
  }
});

const unreadMessages = {};
// 存储未读消息并更新未读消息数量
function storeMessageForLaterUser(message) {
  // console.log(message)
  const fromUser = message.user;

  if (!unreadMessages[fromUser.uid]) {
    unreadMessages[fromUser.uid] = [];
  }
  // 存储到对应username的列表中
  unreadMessages[fromUser.uid].push(message);

  // 更新未读消息数
  updateUserUnreadCountInList(fromUser);
}

// 更新用户列表中的未读消息数量
function updateUserUnreadCountInList(user) {
  // console.log(user)
  if (unreadMessages[user.uid]) {
    // 查找对应的好友
    const friend = getFriend(user);
    // console.log(friend)
    // 找到之后设置未读消息数
    if (friend) {
      friend.count += 1;
      // friend.count = unreadMessages[user.username].length
    }
  }

  // console.log(friends.value)
}

// 清空特定用户的未读消息数量
function clearUnreadMessage(user) {
  if (user) {
    // 删除未读记录
    // 未读消息数
    const friend = getFriend(user);
    // console.log(friend)
    // 找到之后设置未读消息数为0
    if (friend) {
      // friend.unreadCount = 0
      friend.count = 0;
    }
  }
}

const messages = ref([]);

// 选择好友,点击
const select = async (val) => {
  // console.log(val.id)
  // 设置发送信息的好友
  targetUser.value = val.id;
  messages.value = [];
  // 获取历史记录

  getMsgH(targetUser.value);
};

// 接收公钥
socket.on("publicKey", async ({ publicKey2, user }) => {
  // console.log(publicKey2, user)

  // jwkToCryptoKey2(publicKey2).then(key => {
  //     console.log(key)
  //     publicKey1 = key
  // })
  let publicKey1 = null;
  // 将公钥jwk转为CryptoKey格式密钥
  jwkToCryptoKey2(publicKey2).then((cryptoKey) => {
    // console.log(cryptoKey)
    publicKey1 = cryptoKey;
  });
  // console.log(publicKey1)

  // 生成对称密钥
  await generateSymmetricKey()
    .then(async (symmetricKey) => {
      // console.log(symmetricKey, publicKey1)

      // 将对称密钥提取jwk，保存到密钥队中
      crypto.value.subtle
        .exportKey("jwk", symmetricKey)
        .then(async (jwk) => {
          // console.log(jwk)
          // 使用对方公钥加密对称密钥
          const encryptedSymmetricKey = await crypto.value.subtle.encrypt(
            {
              name: "RSA-OAEP",
            },
            publicKey1,
            new TextEncoder().encode(JSON.stringify(jwk))
          );

          // console.log(encryptedSymmetricKey, '122')
          if (keyList.length > 0) {
            const list = keyList.find((key) => key.name == user.uid);
            // console.log(list)
            if (list) {
              // console.log('已存在', list)
              // 已存在，覆盖
              list.keys = {
                symmetricKey: jwk,
                publicKey: publicKey2,
              };

              keysStore.$patch({
                keyList: keyList,
              });
            } else {
              keyList.push({
                name: user.uid,
                keys: {
                  symmetricKey: jwk,
                  publicKey: publicKey2,
                },
              });
              keysStore.$patch({
                keyList: keyList,
              });
            }
          } else {
            keyList.push({
              name: user.uid,
              keys: {
                symmetricKey: jwk,
                publicKey: publicKey2,
              },
            });
            keysStore.$patch({
              keyList: keyList,
            });
          }

          // 发送公钥和对称密钥，对称密钥为加密后得密钥
          socket.emit("publicKeyAndSYmmetricKey", {
            publicKey2: publicKey,
            symmetricKey: arrayBufferToBase64(encryptedSymmetricKey),
            targetUser: user,
          });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((error) => {
      console.error(error);
    });
});

// 接收公钥和对称密钥
socket.on(
  "publicAndSYmmetricKey",
  async ({ publicKey2, symmetricKey, user }) => {
    // console.log(publicKey2, symmetricKey, user)

    // 解密 对称密钥
    const symBuffer = base64ToArrayBuffer(symmetricKey);
    // console.log(symBuffer)

    // 私聊转为 CryptoKey类型
    let privateKey1 = null;
    await jwkToCryptoKey3(privateKey).then((key) => {
      // console.log(key)
      privateKey1 = key;
    });

    // console.log(privateKey1)

    // 使用私钥解密,对称密钥
    const decryptedSymmetricKey = await crypto.value.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey1, //私钥
      symBuffer
    );

    // console.log(decryptedSymmetricKey)

    // 获取对称密钥jwt
    const dsmk = new TextDecoder().decode(decryptedSymmetricKey);
    // console.log(JSON.parse(dsmk))

    // 将对称密钥存入密钥队

    if (keyList.length > 0) {
      const list = keyList.find((key) => key.name == user.uid);
      // console.log(list)
      if (list) {
        // console.log('已存在', list)
        // 已存在，覆盖
        list.keys = {
          symmetricKey: JSON.parse(dsmk),
          publicKey: publicKey2,
        };

        keysStore.$patch({
          keyList: keyList,
        });
      } else {
        keyList.push({
          name: user.uid,
          keys: {
            symmetricKey: JSON.parse(dsmk),
            publicKey: publicKey2,
          },
        });
        keysStore.$patch({
          keyList: keyList,
        });
      }
    } else {
      keyList.push({
        name: user.uid,
        keys: {
          symmetricKey: JSON.parse(dsmk),
          publicKey: publicKey2,
        },
      });
      keysStore.$patch({
        keyList: keyList,
      });
    }
  }
);

// 打开消息框并请求消息
const getMsgH = async (targetUser) => {
  // console.log(targetUser, currentUser.value)

  // console.log(publicKey)
  // const jwk = keyList.find((keys) => keys.name == targetUser.uid)

  // if (jwk && jwk.keys.publicKey) {
  //     // 已经有公钥交换了
  // } else {
  // 发送公钥
  socket.emit("sendPublicKey", {
    publicKey2: publicKey,
    targetUser: targetUser,
  });
  // }

  // 消息列表清空/以后做历史消息
  messages.value = [];

  // 打开消息框
  showMsg.value = true;

  clearUnreadMessage(targetUser);

  // 加入群聊
  if (targetUser.tab == "groups") {
    socket.emit("joinRoom", targetUser.uid);
  }

  await getHistory(0);

  // console.log(lists.value)
  scrollToBottom();
};

const detail = ref({});
const showDetail = ref(false);

// 选择好友/群聊,点击查看详情
const selectDetail = (val) => {
  console.log(val);

  // 设置详细信息
  if (tab.value == "groups") {
    //群详情
    detail.value = {
      ...val.id,
      tab: tab.value,
    };
  } else {
    //好友

    const data = {
      ...val.id.user,
      friendship: val.id.friendship,
      age: differenceInYears(new Date(), new Date(val.id.user.birthday)),
      usergroupmemberId: val.id.id,
      tab: tab.value,
    };

    detail.value = data;
  }

  // 打开详情框
  showDetail.value = true;
  showNoticelist.value = false;
  showNoticelistGroup.value = false;

  // console.log(detail.value)
};

// 发起聊天，进入消息列表页
const chat = () => {
  console.log(detail.value);
  const friend = getFriend(detail.value);
  if (friend) {
  } else {
    friends.value.push(detail.value);
    msgStore.$patch({
      friends: friends.value,
    });
  }
  // 打开消息界面
  msg.value = true;
  targetUser.value = detail.value;
  // 打开聊天框
  getMsgH(detail.value);
};

// 切换用户和群聊列表
const tabChange = (val) => {
  // console.log(val)
  // 切换隐藏
  showDetail.value = false;
};

// 获取对应的朋友
const getFriend = (user) => {
  // console.log(user)
  if (user.uid) {
    return friends.value.find((friend) => friend.uid === user.uid);
  } else {
    return friends.value.find((friend) => friend.uid === user.uid);
  }
};

// 获取消息记录
socket.on("historyMsgs", (data) => {
  // console.log(data)
  if (data) {
    data.forEach((message) => {
      const d = {
        msg: message,
        user: message.sender,
        me: currentUser.value.id === message.sender.id ? true : false,
      };
      updateMsg(d);
    });
  }
});

// 登录上线
socket.on("online", ({ uid }) => {
  // console.log(username)

  const friend = getFriend({
    uid: uid,
  });
  if (friend) {
    nextTick(() => {
      friend.online = true;
    });
  }
});

// 账号下线
socket.on("offline", (uid) => {
  // console.log(username)
  const friend = getFriend({
    uid,
  });
  if (friend) {
    nextTick(() => {
      friend.online = false;
    });
  }
});

// 搜索
const loading = ref(false);
const input = ref("");
const input2 = ref("");

// 搜索消息列表
const changeInput = () => {
  // console.log(friends.value)
  // console.log(input.value)

  // 查找消息人
  friends.value = fri.filter(
    (friend) => friend.name.indexOf(input.value) !== -1
  );
};

const clear = () => {
  input.value = "";
  friends.value = fri;
};

const users2 = ref([]);
const groups2 = ref([]);

// 搜索联系人和群
const changeInput2 = () => {
  // console.log(userGroupMembers.value, groups.value)
  // 搜索好友
  const userGroups = userGroupMembers.value.flatMap(
    (userGroup) => userGroup.user_group_members
  );

  // console.log(userGroups)
  users2.value = userGroups.filter(
    (userGroup) => userGroup.user.name.indexOf(input2.value) !== -1
  );

  // 搜索群
  groups2.value = groups.value.filter(
    (group) => group.name.indexOf(input2.value) !== -1
  );
};

const items = ref([
  {
    title: "Sort by time",
  },
  {
    title: "Sort by Unread",
  },
  {
    title: "Mark all as read",
  },
]);

const previousScrollPosition = ref(0);

const onScroll = async (e) => {
  //console.log(e.target.scrollTop, scrollContainer.value.scrollHeight, scrollContainer.value.scrollTop)
  // return
  if (e.target.scrollTop == 0 && messages.value.length > 0) {
    // 请求消息历史
    previousScrollPosition.value =
      scrollContainer.value.scrollHeight - scrollContainer.value.scrollTop;

    // console.log(messages.value.length, previousScrollPosition.value)

    // socket.emit('history', {
    //     targetUser: targetUser.value,
    //     currentUser: currentUser.value,
    //     start: messages.value.length
    // })
    await getHistory(messages.value.length);
  }
};

const scrollContainer = ref(null);

// 发送新消息，滚动到底部
const scrollToBottom = () => {
  if (scrollContainer.value) {
    previousScrollPosition.value = 0;
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
};

// 保持滚动距离
const ScrollToPre = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop =
      scrollContainer.value.scrollHeight - previousScrollPosition.value;
  }
};

const media = ref(false);
const showMsg = ref(false);
// 弹出个人信息
const menu = ref(false);
// 个人信息操作菜单
const profile = ref([
  {
    title: "My Profile",
    subtitle: "Account settings",
    icon: "/imgs/icon-account.svg",
  },
  {
    title: "My Inbox",
    subtitle: "Messages $ Emails",
    icon: "/imgs/icon-inbox.svg",
  },
  {
    title: "My Tasks",
    subtitle: "To-do and Daily tasks",
    icon: "/imgs/icon-tasks.svg",
  },
]);

// 个人信息弹窗偏移
const menuoffset = ref([5, -20]);
const tabs = ref([
  {
    title: "好友",
    name: "friends",
  },
  {
    title: "群聊",
    name: "groups",
  },
]);

const tab = ref(null);

// 切换聊天和联系人列表 开关
const msg = ref(true);

// 好友分组 打开/关闭 手风琴
const panel = ref([0]);

// 获取星座
function getZodiacSign(date) {
  const month = getMonth(new Date(date));

  const day = getDate(new Date(date));

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

const overlay = ref(false);
const searchKey = ref("");
const userOrGroup = ref({
  user: [],
  groups: [],
});

// 通知消息列表
const showNoticelist = ref(false);
// 群通知列表
const showNoticelistGroup = ref(false);

// 点击通知
const changeApply = (val) => {
  if (val.id == "friend") {
    // 打开好友通知栏
    showNoticelist.value = true;
    showNoticelistGroup.value = false;
    // 获取好友通知
    socket.emit("friendNotification");
  } else {
    // 打开群通知栏
    showNoticelistGroup.value = true;
    showNoticelist.value = false;
    // 获取群通知

    socket.emit("groupNotification");
  }
  showDetail.value = false;
  // console.log(val.id)
};

// 接收 好友通知
socket.on("friendnotif", (data) => {
  // console.log(data)
  notes.value = data;
});

const gnotes = ref([]);

// 接收 群通知
socket.on("groupnotif", ({ data }) => {
  // console.log(data)
  gnotes.value = data;
});

// 搜索好友/群
const searchUserOrGroup = () => {
  // console.log(searchKey.value)
  // 清空
  if (searchKey.value == "") {
    userOrGroup.value = {
      user: [],
      groups: [],
    };
  } else {
    socket.emit("searchUserOrGroup", {
      searchKey: searchKey.value,
    });
  }
};

// 返回搜索的用户和群
socket.on("userAndGroup", (data) => {
  // console.log(data)
  userOrGroup.value = data;
});

// 申请好友
const sendoverlay = ref(false);

const sendItem = ref(null);

// 申请好友弹窗，发送的弹窗
const applyFriend = (item) => {
  // console.log(item, userGroupMembers.value)

  sendoverlay.value = true;
  sendItem.value = item;
};

// 发送好友申请
const sendApplyFriend = () => {
  // console.log(sendItem.value, applyForm.value)

  socket.emit("applyUser", {
    data: {
      message: applyForm.value.message,
      userGroup: applyForm.value.userGroup.id,
    },
    targetUser: sendItem.value,
  });
};

const notes = ref([]);
const showappFriend = ref(false);

// 发送好友申请成功后返回
socket.on("userApply", (data) => {
  // console.log(data)
  notes.value.unshift(data);
  sendoverlay.value = false;
});

// 申请加入群聊
const group_sendoverlay = ref(false);
// 选中群信息
const applyGroupData = ref(null);
// 弹出申请加入群聊
const applyGroup = (group) => {
  applyGroupData.value = group;

  // console.log(group)

  group_sendoverlay.value = true;
};

// 加入群聊留言
const applyGroupFrom = ref({
  message: "申请入群",
});
// 发送加入群申请
const sendApplyGroup = (group) => {
  // console.log(applyGroupFrom.value, applyGroupData)

  socket.emit("applyGroup", {
    group: applyGroupData.value,
    data: applyGroupFrom.value,
  });

  group_sendoverlay.value = false;
};

// 入群申请返回
socket.on("groupApply", (data) => {
  // console.log(data)
  gnotes.value.unshift(data);
});

// 操作好友请求
const editApplyFriend = (type, friendship, user) => {
  // console.log(type, friendship, user)

  user.menu = false;

  socket.emit("editApplyFriend", {
    type,
    friendship,
    targetUser: user.user,
    userGroup: applyReceiveUserGroup.value.id,
  });
};

// 操作好友申请通过后返回
socket.on("applyFriendEdit", (data) => {
  // console.log(data)
  // notes.value.push(data)
  showappFriend.value = false;
});

// 操作入群管理
const editApplyGroup = (type, groupMember) => {
  // console.log(type, groupMember)

  socket.emit("editApplyGroup", {
    type: type,
    groupMemberId: groupMember.id,
  });
};

// 操作入群申请后返回
socket.on("applyGroupEdit", (data) => {
  // console.log(data)
});

// 切换聊天和联系人
const change = (val) => {
  // console.log(val)
  if (val == "relation") {
    msg.value = false;
    // 获取群聊和好友列表
    socket.emit("getUsers");
    socket.emit("getGroups");
  } else {
    msg.value = true;
  }
};

const files = ref([]);

const images = ref([]);

// 获取选择图片的base64位码
const imageUpdate = async (files) => {
  // console.log(files)

  logImagesData(files).then((res) => {
    images.value = res;
  });
  // console.log(images.value)
};

// 将图像转为base64操作
async function logImagesData(fileList) {
  let fileResults = [];
  const frPromises = fileList.map(reader);

  try {
    fileResults = await Promise.all(frPromises);
  } catch (err) {
    // In this specific case, Promise.all() might be preferred
    // over Promise.allSettled(), since it isn't trivial to modify
    // a FileList to a subset of files of what the user initially
    // selected. Therefore, let's just stash the entire operation.
    console.error(err);
    return;
  }

  const images = [];
  fileResults.forEach((fr) => {
    // console.log(fr.result); // Base64 `data:image/...` String result.
    images.push(fr.result);
  });

  return images;
}

// 将图像转为base64
const reader = (file) => {
  if (/\.(jpe?g|png|gif)$/i.test(file.name)) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr);
      fr.onerror = (err) => reject(err);
      fr.readAsDataURL(file);
    });
  } else {
    Message({
      text: "请选择图像",
      timeout: 2000,
      type: "warning",
    });

    files.value = [];
  }
};

const snackbar = ref(false);
const snackbarText = ref("");
const timeout = ref(2000);

// 消息
const Message = ({ text, timeout }) => {
  snackbar.value = true;
  snackbarText.value = text;
  timeout = timeout;
};

// 监听粘贴事件
const handlePaste = (event) => {
  // 阻止默认粘贴行为，以便自行处理粘贴的内容
  //   event.preventDefault();

  // 获取粘贴的数据类型
  const clipboardData = event.clipboardData;
  const types = clipboardData.types;

  // 判断是否包含"Files"类型，表示粘贴的是文件
  if (types.includes("Files")) {
    let pastedfiles = clipboardData.files;
    // console.log('粘贴的是文件：', pastedfiles[0]);

    const fs = [];
    for (let i = 0; i < pastedfiles.length; i++) {
      fs.push(pastedfiles[i]);
    }

    // console.log(fs)

    // 添加到file列表
    for (let i = 0; i < fs.length; i++) {
      files.value.push(fs[i]);
    }

    logImagesData(fs).then((res) => {
      images.value = [...images.value, ...res];
    });

    // 处理文件，例如上传或显示文件名
  } else if (types.includes("text/plain")) {
    // 粘贴的是文本
    const pastedText = clipboardData.getData("text/plain");
    // console.log('粘贴的是文本：', pastedText);
    // message.value = pastedText

    // 处理文本内容
    // this.$refs.inputElement.value += pastedText;
  } else {
    // console.log('不支持的粘贴类型');
  }
};

const sendImage = ref(false);

// 发起群聊
const overlayGroup = ref(false);

// 创建群聊参数
const createGroupData = ref({
  name: "",
  description: "",
  friends: [],
});

const createGroup = () => {
  // console.log(createGroupData.value)

  // 创建群聊
  socket.emit("createGroup", createGroupData.value);

  overlayGroup.value = false;
};

const selectFriend = ref(false);

const ddrawer = ref(false);

//
const drawer = ref(false);

// 是否删除操作成功
socket.on("removeReturn", (data) => {
  console.log(data);
  Message({
    text: data.msg,
    timeout: 2000,
  });
  if (data.status == "success") {
    ddrawer.value = false;
    showMsg.value = false;

    const newFriends = friends.value.filter(
      (friend) => friend.uid !== targetUser.value.uid
    );

    console.log(newFriends, targetUser.value.uid, "222");

    friends.value = newFriends;

    msgStore.$patch({
      friends: newFriends,
    });

    dialog.value = false;
    dialog2.value = false;
  }
});

// 删除好友，删除消息历史
const deleteList = async (val) => {
  console.log(val);
  switch (val.id) {
    // 删除好友
    case "removeFriend":
      console.log(targetUser.value);
      dialog.value = true;
      break;
    // 离开群聊
    case "leaveGroup":
      console.log(targetUser.value);
      dialog2.value = true;
      break;

    default:
      console.log(targetUser.value.uid);
      // 删除
      dialog3.value = true;
      break;
  }
};

// 删除历史记录
const deleteHistory = async (uid) => {
  if (!db.value) {
    // 如果数据库未打开，先打开它
    await openDatabase();
  }
  let status = false;
  // 创建事务
  const transaction = db.value.transaction(["messages"], "readwrite");
  const messageStore = transaction.objectStore("messages");

  const index = messageStore.index("uid");

  const deleteRequests = [];
  index.openCursor(IDBKeyRange.only(uid)).onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      deleteRequests.push(messageStore.delete(cursor.primaryKey));
      cursor.continue();
    }
  };

  // 等待删除是所有请求完成
  Promise.all(deleteRequests)
    .then(() => {
      console.log("删除完成");
      messages.value = [];
      ddrawer.value = false;
      dialog3.value = false;
    })
    .catch((err) => {
      console.error("删除时发生错误", err);
      getHistory(0);
    });
};

// 删除好友
const deleteFriend = ({ friendshipId, usergroupmemberId }) => {
  socket.emit("removeFriend", {
    friendshipId,
    usergroupmemberId,
  });
};

// 退出群聊
const leaveGroup22 = ({ group_member }) => {
  socket.emit("leaveGroup", {
    group_member,
  });
};

const dialog = ref(false);
const dialog2 = ref(false);
const dialog3 = ref(false);

const fileInput = ref(null);

// 选择图片
const shooseImg = () => {
  fileInput.value.click();
  // sendImage.value = !sendImage.value
};

const selectedEmoji = ref(null);

const handleEmojiSelect = (emoji) => {
  // 获取光标位置
  const text = textarea.value.$el.querySelector('textarea')
  const selectionStart = text.selectionStart
  const selectionEnd = text.selectionEnd
  console.log('光标位置：', selectionStart, selectionEnd)

  console.log("Selected emoji:", emoji);
  selectedEmoji.value = emoji;
  // 在光标处插入表情符号
  const newText = message.value.slice(0, selectionStart) + emoji.i + message.value.slice(selectionEnd)

  // 更新数据和文本框
  message.value = newText
  textarea.value.focus()
  // 重新设置光标位置，一个表情包占两个字符
  setTimeout(() => {
    text.setSelectionRange(selectionStart + 2, selectionEnd + 2)
  }, 0)
};

const show = ref(false);

const groupNames = {
  "recent": "常用",
  "smileys_people": "表情符号与人物",
  "animals_nature": "动物与自然",
  "food_drink": "食物与饮料",
  "activities": "活动",
  "travel_places": "旅行与地点",
  "objects": "物体",
  "symbols": "符号",
  "flags": "旗帜"
}
// 获取光标位置
const textarea = ref('')

const getCursorPosition = () => {
  const text = textarea.value.$el.querySelector('textarea')
  const selectionStart = text.selectionStart
  const selectionEnd = text.selectionEnd
  console.log('光标位置：', selectionStart, selectionEnd,)
  return { selectionStart, selectionEnd, text }
}

</script>

<template>
  <v-app>
    <div class="p-4 lg:p-8 max-w-[1200px] w-full mx-auto">
      <v-snackbar v-model="snackbar" :timeout="timeout">
        {{ snackbarText }}

        <template v-slot:actions>
          <v-btn color="blue" variant="text" @click="snackbar = false">
            Close
          </v-btn>
        </template>
      </v-snackbar>

      <v-navigation-drawer v-model="drawer" class="px-2" width="350">
        <div class="flex items-center mt-6">
          <!-- 个人头像，点击打开个人信息 -->
          <v-list-item>
            <v-menu
              :offset="menuoffset"
              transition="slide-y-transition"
              :close-on-content-click="false"
              location="end"
            >
              <template v-slot:activator="{ props }">
                <v-badge dot color="success" offset-y="36" v-bind="props">
                  <v-avatar size="50px">
                    <v-img
                      v-if="currentUser.avatar"
                      cover
                      alt="Avatar"
                      :src="baseUrl + currentUser.avatar.url"
                    ></v-img>
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
                      <v-list-item
                        class="pl-0"
                        :title="currentUser.name"
                        :subtitle="currentUser.email"
                      >
                        <template v-slot:prepend>
                          <v-avatar size="55px">
                            <v-img
                              v-if="currentUser.avatar"
                              cover
                              alt="Avatar"
                              :src="baseUrl + currentUser.avatar.url"
                            ></v-img>
                            <v-icon v-else></v-icon>
                          </v-avatar>
                        </template>
                        <template v-slot:title>
                          <h5 class="text-base font-semibold">
                            {{ currentUser.name }}
                          </h5>
                        </template>
                        <template v-slot:subtitle>
                          <h6 class="text-sm">{{ currentUser.email }}</h6>
                        </template>
                      </v-list-item>
                    </v-list>
                    <hr />
                  </div>
                  <v-list :lines="false">
                    <v-list-item
                      class="py-4"
                      v-for="(item, i) in profile"
                      :key="i"
                      :value="item"
                    >
                      <template v-slot:prepend>
                        <v-avatar
                          class="bg-lightprimary"
                          style="background-color: #ecf2ff"
                          rounded="sm"
                        >
                          <v-icon icon>
                            <img :src="item.icon" />
                          </v-icon>
                        </v-avatar>
                      </template>
                      <v-list-item-title
                        v-text="item.title"
                      ></v-list-item-title>
                      <v-list-item-subtitle
                        class="mt-0.5"
                        v-text="item.subtitle"
                      ></v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                  <div class="px-4 py-3">
                    <v-btn
                      @click="logout"
                      block
                      class="text-none text-subtitle-1"
                      variant="outlined"
                      color="info"
                    >
                      logout
                    </v-btn>
                  </div>
                </v-sheet>
              </v-card>
            </v-menu>
          </v-list-item>

          <v-list density="compact" class="flex items-center">
            <!-- 消息 -->
            <v-list-item>
              <v-btn
                @click="change('chat')"
                icon="mdi-message-processing-outline"
                :variant="msg ? 'tonal' : 'plain'"
              ></v-btn>
            </v-list-item>
            <!-- 联系人 -->
            <v-list-item>
              <v-btn
                @click="change('relation')"
                icon="mdi-account-outline"
                :variant="!msg ? 'tonal' : 'plain'"
              ></v-btn>
            </v-list-item>
          </v-list>
        </div>
        <!-- 左侧消息列表 -->
        <div v-if="msg" class="flex-shrink-0 transition-all duration-100">
          <div>
            <!-- 搜索 -->
            <v-sheet>
              <div class="px-2 pt-8">
                <!-- 搜索 -->
                <v-text-field
                  :loading="loading"
                  density="compact"
                  variant="outlined"
                  label="搜索"
                  prepend-inner-icon="mdi-magnify"
                  single-line
                  hide-details
                  v-model="input"
                  color="info"
                  @update:modelValue="changeInput"
                  clearable
                  @click:clear="clear"
                ></v-text-field>
                <!-- 选项 Recent Chats-->
                <v-menu transition="slide-y-transition">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      variant="plian"
                      class="text-none text-subtitle-1 mt-4"
                      append-icon="mdi-chevron-down"
                    >
                      Recent Chats
                    </v-btn>
                  </template>
                  <!-- 选项卡 -->
                  <v-list>
                    <v-list-item
                      v-for="(item, i) in items"
                      :key="i"
                      :value="item.title"
                    >
                      <v-list-item-title>{{ item.title }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </v-sheet>
            <!-- 聊天列表 -->
            <div
              class="relative overflow-y-auto h-[500px] mt-4"
              max-height="500"
            >
              <v-list @click:select="select" nav>
                <v-list-item
                  v-for="user in friends"
                  :key="user.usernam"
                  :value="user"
                  active-class="active"
                  class="px-6 py-4 cursor-pointer"
                >
                  <!-- 头像 -->
                  <template v-slot:prepend>
                    <!-- 好友 -->
                    <v-badge
                      v-if="user.tab == 'friends'"
                      dot
                      :color="user.online ? 'success' : ''"
                      offset-y="32"
                    >
                      <v-avatar size="45">
                        <v-img
                          v-if="user.avatar.url"
                          cover
                          alt="Avatar"
                          :src="baseUrl + user.avatar.url"
                        ></v-img>
                        <v-icon v-else></v-icon>
                      </v-avatar>
                    </v-badge>
                    <!-- 群 -->
                    <v-avatar v-else size="45">
                      <v-img
                        v-if="user.groupAvatar.url"
                        cover
                        alt="Avatar"
                        :src="baseUrl + user.groupAvatar.url"
                      ></v-img>
                      <v-icon v-else></v-icon>
                    </v-avatar>
                  </template>
                  <div>
                    <div class="flex items-center">
                      <!-- 名字 -->
                      <h5
                        class="text-sm font-semibold"
                        style="font-family: inherit !important"
                      >
                        {{ user.name }}
                      </h5>
                      <!-- 相隔时间 -->
                      <small
                        v-if="user.lastMsg"
                        class="ml-auto text-xs"
                        style="font-family: inherit !important"
                        >{{
                          intlFormatDistance(
                            new Date(user.lastMsg.createdAt),
                            new Date()
                          )
                        }}</small
                      >
                    </div>
                    <div class="flex items-center mt-1">
                      <!-- 最新消息 -->
                      <template v-if="user.tab == 'friends'">
                        <h6
                          class="text-xs font-normal"
                          style="font-family: inherit !important"
                          v-if="user.lastMsg"
                        >
                          {{
                            user.lastMsg.type == "image"
                              ? `[图片]`
                              : user.lastMsg.content
                          }}
                        </h6>
                      </template>
                      <template v-if="user.tab == 'groups'">
                        <h6
                          class="text-xs font-normal"
                          style="font-family: inherit !important"
                          v-if="user.lastMsg"
                        >
                          {{ user.lastMsg.username }}：{{
                            user.lastMsg.type == "image"
                              ? `[图片]`
                              : user.lastMsg.content
                          }}
                        </h6>
                      </template>
                      <!-- 未读消息数 -->
                      <v-badge
                        v-if="user.count > 0"
                        color="info"
                        class="ml-auto"
                        :content="user.count"
                        inline
                      ></v-badge>
                    </div>
                  </div>
                </v-list-item>
              </v-list>
            </div>
          </div>
        </div>
        <div v-else>
          <!-- left 联系人/群列表 -->
          <div class="flex-shrink-0 transition-all duration-100">
            <div>
              <!-- 搜索 / 列表切换 -->
              <v-sheet>
                <div class="px-2 pt-8">
                  <!-- 输入 -->
                  <div class="flex space-x-2">
                    <v-text-field
                      :loading="loading"
                      density="compact"
                      variant="outlined"
                      label="搜索"
                      prepend-inner-icon="mdi-magnify"
                      single-line
                      hide-details
                      v-model="input2"
                      @update:modelValue="changeInput2"
                      color="info"
                      clearable
                    ></v-text-field>

                    <!-- 添加好友 -->
                    <v-menu location="end" transition="slide-x-transition">
                      <template v-slot:activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-plus"
                          variant="tonal"
                          rounded="lg"
                        ></v-btn>
                      </template>
                      <v-list v-list nav density="compact">
                        <v-list-item
                          @click="
                            () => {
                              overlayGroup = true;
                              createGroupData.friends = [];
                            }
                          "
                        >
                          发起群聊
                        </v-list-item>
                        <v-list-item @click="overlay = true">
                          加好友/群
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </div>

                  <v-sheet v-if="input2" class="min-h-[600px]">
                    <!-- 好友 -->
                    <div class="px-2 mt-4">好友</div>
                    <v-list @click:select="selectDetail" nav class="pt-2 pb-0">
                      <v-list-item
                        v-for="user in users2"
                        :key="user.id"
                        :value="user"
                        active-class="active"
                        class="px-6 py-4 cursor-pointer"
                      >
                        <!-- 头像 -->
                        <template v-slot:prepend>
                          <v-badge
                            dot
                            :color="user.user.online ? 'success' : ''"
                            offset-y="32"
                          >
                            <v-avatar size="45">
                              <v-img
                                v-if="user.user.avatar.url"
                                cover
                                alt="Avatar"
                                :src="baseUrl + user.user.avatar.url"
                              ></v-img>
                              <v-icon v-else></v-icon>
                            </v-avatar>
                          </v-badge>
                        </template>
                        <div>
                          <div class="flex items-center">
                            <h5
                              class="text-sm font-semibold"
                              style="font-family: inherit !important"
                            >
                              {{ user.user.name }}
                            </h5>
                          </div>
                          <div class="flex items-center mt-1">
                            <h6
                              class="text-xs font-normal"
                              style="font-family: inherit !important"
                            >
                              {{ user.user.online ? "[在线]" : "[离线]"
                              }}{{ user.user.description }}
                            </h6>
                          </div>
                        </div>
                      </v-list-item>
                    </v-list>
                    <hr />
                    <!-- 群聊 -->
                    <div class="px-2 mt-4">群聊</div>
                    <v-list @click:select="selectDetail" nav>
                      <v-list-item
                        v-for="group in groups2"
                        :key="group.groupname"
                        :value="group"
                        active-class="active"
                        class="px-4 py-4 cursor-pointer"
                      >
                        <!-- 头像 -->
                        <template v-slot:prepend>
                          <v-avatar size="45">
                            <v-img
                              v-if="group.groupAvatar.url"
                              cover
                              alt="Avatar"
                              :src="baseUrl + group.groupAvatar.url"
                            ></v-img>
                            <v-icon v-else></v-icon>
                          </v-avatar>
                        </template>
                        <div>
                          <div class="flex items-center">
                            <h5
                              class="text-sm font-semibold"
                              style="font-family: inherit !important"
                            >
                              {{ group.name }}
                            </h5>
                          </div>
                        </div>
                      </v-list-item>
                    </v-list>
                  </v-sheet>
                  <v-sheet v-else>
                    <!-- 好友通知,群通知 -->
                    <v-list
                      @click:select="changeApply"
                      v-list
                      nav
                      class="px-0"
                      density="compact"
                    >
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
                    <v-tabs
                      v-model="tab"
                      bg-color="transparent"
                      color="basil"
                      grow
                      @update:modelValue="tabChange"
                    >
                      <v-tab
                        v-for="item in tabs"
                        :key="item.name"
                        :value="item.name"
                      >
                        {{ item.title }}
                      </v-tab>
                    </v-tabs>
                  </v-sheet>
                  <hr />
                </div>
              </v-sheet>
              <!-- 好友/群聊列表 -->
              <v-window v-model="tab" class="px-2">
                <v-window-item value="friends">
                  <div
                    class="relative overflow-y-auto h-auto mt-4"
                    max-height="500"
                  >
                    <v-expansion-panels
                      multiple
                      variant="accordion"
                      class="expan"
                      v-model="panel"
                    >
                      <v-expansion-panel
                        v-for="userGroup in userGroupMembers"
                        :key="userGroup.id"
                      >
                        <v-expansion-panel-title
                          >{{ userGroup.name }}({{ userGroup.onlineCount }}/{{
                            userGroup.user_group_members.length
                          }}）</v-expansion-panel-title
                        >
                        <v-expansion-panel-text>
                          <v-list
                            @click:select="selectDetail"
                            nav
                            class="pt-2 pb-0"
                          >
                            <v-list-item
                              v-for="user in userGroup.user_group_members"
                              :key="user.id"
                              :value="user"
                              active-class="active"
                              class="px-6 py-4 cursor-pointer"
                            >
                              <!-- 头像 -->
                              <template v-slot:prepend>
                                <v-badge
                                  dot
                                  :color="user.user.online ? 'success' : ''"
                                  offset-y="32"
                                >
                                  <v-avatar size="45">
                                    <v-img
                                      v-if="user.user.avatar.url"
                                      cover
                                      alt="Avatar"
                                      :src="baseUrl + user.user.avatar.url"
                                    ></v-img>
                                    <v-icon v-else></v-icon>
                                  </v-avatar>
                                </v-badge>
                              </template>
                              <div>
                                <div class="flex items-center">
                                  <h5
                                    class="text-sm font-semibold"
                                    style="font-family: inherit !important"
                                  >
                                    {{ user.user.name }}
                                  </h5>
                                </div>
                                <div class="flex items-center mt-1">
                                  <h6
                                    class="text-xs font-normal"
                                    style="font-family: inherit !important"
                                  >
                                    {{ user.user.online ? "[在线]" : "[离线]"
                                    }}{{ user.user.description }}
                                  </h6>
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
                  <div
                    class="relative overflow-y-auto h-[500px] mt-4"
                    max-height="500"
                  >
                    <v-list @click:select="selectDetail" nav>
                      <v-list-item
                        v-for="group in groups"
                        :key="group.groupname"
                        :value="group"
                        active-class="active"
                        class="px-6 py-4 cursor-pointer"
                      >
                        <!-- 头像 -->
                        <template v-slot:prepend>
                          <v-avatar size="45">
                            <v-img
                              v-if="group.groupAvatar.url"
                              cover
                              alt="Avatar"
                              :src="baseUrl + group.groupAvatar.url"
                            ></v-img>
                            <v-icon v-else></v-icon>
                          </v-avatar>
                        </template>
                        <div>
                          <div class="flex items-center">
                            <h5
                              class="text-sm font-semibold"
                              style="font-family: inherit !important"
                            >
                              {{ group.name }}
                            </h5>
                          </div>
                        </div>
                      </v-list-item>
                    </v-list>
                  </div>
                </v-window-item>
              </v-window>
            </div>
          </div>
        </div>
      </v-navigation-drawer>

      <!-- 添加好友弹窗 -->
      <v-overlay
        v-model="overlay"
        contained
        class="align-center justify-center"
      >
        <v-card class="min-w-[350px] relative">
          <v-card-title>
            <span class="text-lg">加好友/群</span>
          </v-card-title>
          <v-card-text>
            <v-text-field
              :loading="loading"
              density="compact"
              variant="outlined"
              label="Search templates"
              append-inner-icon="mdi-magnify"
              single-line
              hide-details
              @click:append-inner="searchUserOrGroup"
              color="info"
              @keydown.enter="searchUserOrGroup"
              v-model="searchKey"
            ></v-text-field>

            <v-sheet class="h-[399px] overflow-auto mt-2">
              <!-- 查到的人列表 -->
              <v-list v-if="userOrGroup.users">
                <v-list-subheader v-if="userOrGroup.users.length > 0"
                  >查找人</v-list-subheader
                >

                <v-list-item
                  class="px-2 py-2"
                  v-for="(item, i) in userOrGroup.users"
                  :key="item.id"
                  :value="item"
                >
                  <template v-slot:prepend>
                    <v-avatar size="40px">
                      <v-img
                        v-if="item.avatar"
                        alt="Avatar"
                        cover
                        :src="baseUrl + item.avatar.url"
                      ></v-img>
                      <v-icon v-else></v-icon>
                    </v-avatar>
                  </template>
                  <template v-slot:append>
                    <v-btn
                      size="small"
                      variant="tonal"
                      @click="applyFriend(item)"
                    >
                      添加
                    </v-btn>
                  </template>

                  <v-list-item-title
                    style="font-size: 14px"
                    v-text="item.name"
                  ></v-list-item-title>
                  <v-list-item-subtitle
                    v-text="item.email"
                    style="font-size: 12px"
                  ></v-list-item-subtitle>
                </v-list-item>
              </v-list>
              <hr />
              <!-- 查到的群列表 -->
              <v-list v-if="userOrGroup.groups">
                <v-list-subheader v-if="userOrGroup.groups.length > 0"
                  >查找群</v-list-subheader
                >

                <v-list-item
                  class="px-2 py-2"
                  v-for="(item, i) in userOrGroup.groups"
                  :key="item.id"
                  :value="item"
                >
                  <template v-slot:prepend>
                    <v-avatar size="40px">
                      <v-img
                        v-if="item.groupAvatar"
                        alt="Avatar"
                        cover
                        :src="baseUrl + item.groupAvatar.url"
                      ></v-img>
                      <v-icon v-else></v-icon>
                    </v-avatar>
                  </template>
                  <template v-slot:append>
                    <v-btn
                      size="small"
                      @click="applyGroup(item)"
                      variant="tonal"
                    >
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
      <!-- 申请添加好友 -->
      <v-overlay
        v-model="sendoverlay"
        contained
        class="align-center justify-center"
      >
        <v-card class="min-w-[300px] pb-4">
          <v-card-title>
            <span class="text-sm">申请加好友</span>
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item class="px-2">
                <template v-slot:prepend>
                  <v-avatar size="50px">
                    <v-img
                      v-if="sendItem.avatar"
                      alt="Avatar"
                      cover
                      :src="baseUrl + sendItem.avatar.url"
                    ></v-img>
                    <v-icon v-else></v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title
                  style="font-size: 13px"
                  v-text="sendItem.name"
                ></v-list-item-title>
                <v-list-item-subtitle
                  v-text="sendItem.email"
                  style="font-size: 12px"
                ></v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <v-sheet class="px-1">
              <div class="text-xs mb-2 pl-2">填写验证信息</div>
              <v-textarea
                variant="outlined"
                hide-details
                density="compact"
                color="info"
                single-line
                autocomplete
                v-model="applyForm.message"
              ></v-textarea>
              <div class="text-xs my-2 mt-4 pl-2">分组</div>
              <div class="flex gap-2">
                <v-select
                  single-line
                  label="Select"
                  density="compact"
                  hide-details
                  color="info"
                  v-model="applyForm.userGroup"
                  :items="selectgroups"
                  item-title="name"
                  item-value="id"
                  variant="outlined"
                  return-object
                ></v-select>
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
      <v-overlay
        v-model="group_sendoverlay"
        contained
        class="align-center justify-center"
      >
        <v-card class="min-w-[300px] pb-4">
          <v-card-title>
            <span class="text-sm">申请加入群</span>
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item class="px-2">
                <template v-slot:prepend>
                  <v-avatar size="50px">
                    <v-img
                      v-if="applyGroupData.groupAvatar"
                      alt="Avatar"
                      cover
                      :src="baseUrl + applyGroupData.groupAvatar.url"
                    ></v-img>
                    <v-icon v-else></v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title
                  style="font-size: 13px"
                  v-text="applyGroupData.name"
                ></v-list-item-title>
                <v-list-item-subtitle
                  v-text="applyGroupData.uid"
                  style="font-size: 12px"
                ></v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <v-sheet class="px-1">
              <div class="text-xs mb-2 pl-2">填写验证信息</div>
              <v-textarea
                variant="outlined"
                hide-details
                density="compact"
                color="info"
                single-line
                autocomplete
                v-model="applyGroupFrom.message"
              ></v-textarea>
            </v-sheet>
          </v-card-text>
          <v-card-actions class="pr-5">
            <v-spacer></v-spacer>
            <v-btn
              class="mr-2"
              variant="tonal"
              @click="group_sendoverlay = false"
            >
              取消
            </v-btn>
            <v-btn color="info" variant="tonal" @click="sendApplyGroup">
              发送
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-overlay>
      <!-- 发起群聊 -->
      <v-overlay
        v-model="overlayGroup"
        contained
        class="align-center justify-center"
      >
        <v-card class="min-w-[350px] relative">
          <v-card-title>
            <span class="text-lg">发起群聊</span>
          </v-card-title>
          <hr />
          <v-card-text>
            <v-sheet class="px-1">
              <div class="text-sm mb-2 pl-2">名称</div>
              <v-text-field
                :loading="loading"
                density="compact"
                variant="outlined"
                label="群聊名称"
                single-line
                hide-details
                @click:append-inner="searchUserOrGroup"
                color="info"
                @keydown.enter="searchUserOrGroup"
                v-model="createGroupData.name"
              ></v-text-field>
            </v-sheet>
            <v-sheet class="px-1 mt-4">
              <div class="text-sm mb-2 pl-2">描述</div>
              <v-textarea
                variant="outlined"
                hide-details
                density="compact"
                color="info"
                single-line
                autocomplete
                v-model="createGroupData.description"
              ></v-textarea>
            </v-sheet>
            <v-sheet class="px-1 mt-4">
              <v-btn @click="selectFriend = true">选择好友</v-btn>
              {{ createGroupData.friends.map((friend) => friend.name) }}
            </v-sheet>
          </v-card-text>
          <v-card-actions class="pr-5">
            <v-spacer></v-spacer>
            <v-btn class="mr-2" variant="tonal" @click="overlayGroup = false">
              取消
            </v-btn>
            <v-btn color="info" variant="tonal" @click="createGroup">
              确定
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-overlay>
      <!-- 创建群聊添加好友 -->
      <v-overlay
        v-model="selectFriend"
        contained
        class="align-center justify-center"
      >
        <v-card class="min-w-[300px] pb-4">
          <v-card-title>
            <span class="text-sm">选择好友</span>
          </v-card-title>
          <v-card-text>
            <template v-for="friend in friends11">
              <v-checkbox
                v-model="createGroupData.friends"
                :value="friend.user"
              >
                <template v-slot:label>
                  <v-avatar size="40px" class="mx-4">
                    <v-img
                      v-if="friend.user.avatar"
                      alt="Avatar"
                      cover
                      :src="baseUrl + friend.user.avatar.url"
                    ></v-img>
                    <v-icon v-else></v-icon>
                  </v-avatar>
                  {{ friend.user.name }}
                </template>
              </v-checkbox>
            </template>
          </v-card-text>
          <v-card-actions class="pr-5">
            <v-spacer></v-spacer>
            <!-- <v-btn class="mr-2" variant="tonal" @click="selectFriend = false">
                                        取消
                                    </v-btn> -->
            <v-btn color="info" variant="tonal" @click="selectFriend = false">
              确认
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-overlay>
      <!-- part 1 -->
      <div class="w-full mb-8 rounded-md">
        <div class="px-8 bg-[#ecf2ff] flex justify-between items-center">
          <div>
            <h3 class="text-xl font-bold mb-2">Chat app</h3>
            <a href="/">Message</a>
          </div>
          <div class="py-0 overflow-hidden">
            <div class="-mb-16 mt-3">
              <img src="../public/imgs/ChatBc.png" alt="breadcrumb" />
            </div>
          </div>
        </div>
      </div>
      <!-- part 2 main -->
      <v-card>
        <div class="flex">
          <!-- 选项  letf-->
          <div class="hidden lg:flex">
            <v-sheet class="flex-shrink-0">
              <!-- 个人头像，点击打开个人信息 -->
              <v-list-item class="mt-6">
                <v-menu
                  :offset="menuoffset"
                  transition="slide-y-transition"
                  :close-on-content-click="false"
                  location="end"
                >
                  <template v-slot:activator="{ props }">
                    <v-badge dot color="success" offset-y="36" v-bind="props">
                      <v-avatar size="50px">
                        <v-img
                          v-if="currentUser.avatar"
                          cover
                          alt="Avatar"
                          :src="baseUrl + currentUser.avatar.url"
                        ></v-img>
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
                          <v-list-item
                            class="pl-0"
                            :title="currentUser.name"
                            :subtitle="currentUser.email"
                          >
                            <template v-slot:prepend>
                              <v-avatar size="55px">
                                <v-img
                                  v-if="currentUser.avatar"
                                  cover
                                  alt="Avatar"
                                  :src="baseUrl + currentUser.avatar.url"
                                ></v-img>
                                <v-icon v-else></v-icon>
                              </v-avatar>
                            </template>
                            <template v-slot:title>
                              <h5 class="text-base font-semibold">
                                {{ currentUser.name }}
                              </h5>
                            </template>
                            <template v-slot:subtitle>
                              <h6 class="text-sm">{{ currentUser.email }}</h6>
                            </template>
                          </v-list-item>
                        </v-list>
                        <hr />
                      </div>
                      <v-list :lines="false">
                        <v-list-item
                          class="py-4"
                          v-for="(item, i) in profile"
                          :key="i"
                          :value="item"
                        >
                          <template v-slot:prepend>
                            <v-avatar
                              class="bg-lightprimary"
                              style="background-color: #ecf2ff"
                              rounded="sm"
                            >
                              <v-icon icon>
                                <img :src="item.icon" />
                              </v-icon>
                            </v-avatar>
                          </template>
                          <v-list-item-title
                            v-text="item.title"
                          ></v-list-item-title>
                          <v-list-item-subtitle
                            class="mt-0.5"
                            v-text="item.subtitle"
                          ></v-list-item-subtitle>
                        </v-list-item>
                      </v-list>
                      <div class="px-4 py-3">
                        <v-btn
                          @click="logout"
                          block
                          class="text-none text-subtitle-1"
                          variant="outlined"
                          color="info"
                        >
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
                  <v-btn
                    @click="change('chat')"
                    icon="mdi-message-processing-outline"
                    :variant="msg ? 'tonal' : 'plain'"
                  ></v-btn>
                </v-list-item>
                <!-- 联系人 -->
                <v-list-item>
                  <v-btn
                    @click="change('relation')"
                    icon="mdi-account-outline"
                    :variant="!msg ? 'tonal' : 'plain'"
                  ></v-btn>
                </v-list-item>
              </v-list>
            </v-sheet>
            <!-- 消息列表和好友列表 -->
            <div
              class="overflow-auto border-l border-r border-r-[rgb(229,234,239)] flex-shrink-0"
            >
              <div v-if="msg" class="flex flex-1 w-full">
                <!-- 左侧消息列表 -->
                <div
                  class="min-h-[500px] w-[280px] lg:w-[350px] transition-all duration-100"
                >
                  <div>
                    <!-- 搜索 -->
                    <v-sheet>
                      <div class="px-4 pt-8">
                        <!-- 搜索 -->
                        <v-text-field
                          :loading="loading"
                          density="compact"
                          variant="outlined"
                          label="搜索"
                          prepend-inner-icon="mdi-magnify"
                          single-line
                          hide-details
                          v-model="input"
                          @update:modelValue="changeInput"
                          clearable
                          @click:clear="clear"
                          color="info"
                        ></v-text-field>
                        <!-- 选项 Recent Chats-->
                        <v-menu transition="slide-y-transition">
                          <template v-slot:activator="{ props }">
                            <v-btn
                              v-bind="props"
                              variant="plian"
                              class="text-none text-subtitle-1 mt-4"
                              append-icon="mdi-chevron-down"
                            >
                              Recent Chats
                            </v-btn>
                          </template>
                          <!-- 选项卡 -->
                          <v-list>
                            <v-list-item
                              v-for="(item, i) in items"
                              :key="i"
                              :value="item.title"
                            >
                              <v-list-item-title>{{
                                item.title
                              }}</v-list-item-title>
                            </v-list-item>
                          </v-list>
                        </v-menu>
                      </div>
                    </v-sheet>
                    <!-- 聊天列表 -->
                    <div
                      class="relative overflow-y-auto h-[500px] mt-4"
                      max-height="500"
                    >
                      <v-list @click:select="select" class="px-4" nav>
                        <v-list-item
                          v-for="user in friends"
                          :key="user.usernam"
                          :value="user"
                          active-class="active"
                          class="px-4 py-4 cursor-pointer"
                        >
                          <!-- 头像 -->
                          <template v-slot:prepend>
                            <!-- 好友 -->
                            <v-badge
                              v-if="user.tab == 'friends'"
                              dot
                              :color="user.online ? 'success' : ''"
                              offset-y="32"
                            >
                              <v-avatar size="45">
                                <v-img
                                  v-if="user.avatar.url"
                                  cover
                                  alt="Avatar"
                                  :src="baseUrl + user.avatar.url"
                                ></v-img>
                                <v-icon v-else></v-icon>
                              </v-avatar>
                            </v-badge>
                            <!-- 群 -->
                            <v-avatar v-else size="45">
                              <v-img
                                v-if="user.groupAvatar.url"
                                cover
                                alt="Avatar"
                                :src="baseUrl + user.groupAvatar.url"
                              ></v-img>
                              <v-icon v-else></v-icon>
                            </v-avatar>
                          </template>
                          <div>
                            <div class="flex items-center">
                              <!-- 名字 -->
                              <h5
                                class="text-sm font-semibold"
                                style="font-family: inherit !important"
                              >
                                {{ user.name }}
                              </h5>
                              <!-- 相隔时间 -->
                              <small
                                v-if="user.lastMsg"
                                class="ml-auto text-xs"
                                style="font-family: inherit !important"
                                >{{
                                  intlFormatDistance(
                                    new Date(user.lastMsg.createdAt),
                                    new Date()
                                  )
                                }}</small
                              >
                            </div>
                            <div class="flex items-center mt-1">
                              <!-- 最新消息 -->
                              <template v-if="user.tab == 'friends'">
                                <h6
                                  class="text-xs font-normal"
                                  style="font-family: inherit !important"
                                  v-if="user.lastMsg"
                                >
                                  {{
                                    user.lastMsg.type == "image"
                                      ? `[图片]`
                                      : user.lastMsg.content
                                  }}
                                </h6>
                              </template>
                              <template v-if="user.tab == 'groups'">
                                <h6
                                  class="text-xs font-normal"
                                  style="font-family: inherit !important"
                                  v-if="user.lastMsg"
                                >
                                  {{ user.lastMsg.username }}：{{
                                    user.lastMsg.type == "image"
                                      ? `[图片]`
                                      : user.lastMsg.content
                                  }}
                                </h6>
                              </template>
                              <!-- 未读消息数 -->
                              <v-badge
                                v-if="user.count > 0"
                                color="info"
                                class="ml-auto"
                                :content="user.count"
                                inline
                              ></v-badge>
                            </div>
                          </div>
                        </v-list-item>
                      </v-list>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="flex flex-1 w-full relative">
                <!-- left 联系人/群列表 -->
                <div
                  class="min-h-[500px] w-[350px] transition-all duration-100"
                >
                  <div>
                    <!-- 搜索 / 列表切换 -->
                    <v-sheet>
                      <div class="px-4 pt-8">
                        <!-- 输入 -->
                        <div class="flex space-x-2">
                          <v-text-field
                            :loading="loading"
                            density="compact"
                            variant="outlined"
                            label="搜索"
                            prepend-inner-icon="mdi-magnify"
                            single-line
                            hide-details
                            v-model="input2"
                            @update:modelValue="changeInput2"
                            clearable
                            color="info"
                          ></v-text-field>

                          <!-- 添加好友 -->
                          <v-menu
                            location="end"
                            transition="slide-x-transition"
                          >
                            <template v-slot:activator="{ props }">
                              <v-btn
                                v-bind="props"
                                icon="mdi-plus"
                                variant="tonal"
                                rounded="lg"
                              ></v-btn>
                            </template>
                            <v-list v-list nav density="compact">
                              <v-list-item
                                @click="
                                  () => {
                                    overlayGroup = true;
                                    createGroupData.friends = [];
                                  }
                                "
                              >
                                发起群聊
                              </v-list-item>
                              <v-list-item @click="overlay = true">
                                加好友/群
                              </v-list-item>
                            </v-list>
                          </v-menu>
                        </div>

                        <v-sheet v-if="input2" class="min-h-[600px]">
                          <!-- 好友 -->
                          <div class="px-2 mt-4">好友</div>
                          <v-list
                            @click:select="selectDetail"
                            nav
                            class="pt-2 pb-0"
                          >
                            <v-list-item
                              v-for="user in users2"
                              :key="user.id"
                              :value="user"
                              active-class="active"
                              class="px-6 py-4 cursor-pointer"
                            >
                              <!-- 头像 -->
                              <template v-slot:prepend>
                                <v-badge
                                  dot
                                  :color="user.user.online ? 'success' : ''"
                                  offset-y="32"
                                >
                                  <v-avatar size="45">
                                    <v-img
                                      v-if="user.user.avatar.url"
                                      cover
                                      alt="Avatar"
                                      :src="baseUrl + user.user.avatar.url"
                                    ></v-img>
                                    <v-icon v-else></v-icon>
                                  </v-avatar>
                                </v-badge>
                              </template>
                              <div>
                                <div class="flex items-center">
                                  <h5
                                    class="text-sm font-semibold"
                                    style="font-family: inherit !important"
                                  >
                                    {{ user.user.name }}
                                  </h5>
                                </div>
                                <div class="flex items-center mt-1">
                                  <h6
                                    class="text-xs font-normal"
                                    style="font-family: inherit !important"
                                  >
                                    {{ user.user.online ? "[在线]" : "[离线]"
                                    }}{{ user.user.description }}
                                  </h6>
                                </div>
                              </div>
                            </v-list-item>
                          </v-list>
                          <hr />
                          <!-- 群聊 -->
                          <div class="px-2 mt-4">群聊</div>
                          <v-list @click:select="selectDetail" nav>
                            <v-list-item
                              v-for="group in groups2"
                              :key="group.groupname"
                              :value="group"
                              active-class="active"
                              class="px-4 py-4 cursor-pointer"
                            >
                              <!-- 头像 -->
                              <template v-slot:prepend>
                                <v-avatar size="45">
                                  <v-img
                                    v-if="group.groupAvatar.url"
                                    cover
                                    alt="Avatar"
                                    :src="baseUrl + group.groupAvatar.url"
                                  ></v-img>
                                  <v-icon v-else></v-icon>
                                </v-avatar>
                              </template>
                              <div>
                                <div class="flex items-center">
                                  <h5
                                    class="text-sm font-semibold"
                                    style="font-family: inherit !important"
                                  >
                                    {{ group.name }}
                                  </h5>
                                </div>
                              </div>
                            </v-list-item>
                          </v-list>
                        </v-sheet>
                        <v-sheet v-else>
                          <!-- 好友通知,群通知 -->
                          <v-list
                            @click:select="changeApply"
                            v-list
                            nav
                            class="px-0"
                            density="compact"
                          >
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
                          <v-tabs
                            v-model="tab"
                            bg-color="transparent"
                            color="basil"
                            grow
                            @update:modelValue="tabChange"
                          >
                            <v-tab
                              v-for="item in tabs"
                              :key="item.name"
                              :value="item.name"
                            >
                              {{ item.title }}
                            </v-tab>
                          </v-tabs>
                        </v-sheet>
                        <hr />
                      </div>
                    </v-sheet>
                    <!-- 好友/群聊列表 -->
                    <v-window v-model="tab" class="px-4" v-if="!input2">
                      <v-window-item value="friends">
                        <div
                          class="relative overflow-y-auto h-[500px] mt-4"
                          max-height="500"
                        >
                          <v-expansion-panels
                            multiple
                            variant="accordion"
                            class="expan"
                            v-model="panel"
                          >
                            <v-expansion-panel
                              v-for="userGroup in userGroupMembers"
                              :key="userGroup.id"
                            >
                              <v-expansion-panel-title
                                >{{ userGroup.name }}({{
                                  userGroup.onlineCount
                                }}/{{
                                  userGroup.user_group_members.length
                                }}）</v-expansion-panel-title
                              >
                              <v-expansion-panel-text>
                                <v-list
                                  @click:select="selectDetail"
                                  class="pt-2 pb-0"
                                  nav
                                >
                                  <v-list-item
                                    v-for="user in userGroup.user_group_members"
                                    :key="user.id"
                                    :value="user"
                                    active-class="active"
                                    class="px-4 py-4 cursor-pointer"
                                  >
                                    <!-- 头像 -->
                                    <template v-slot:prepend>
                                      <v-badge
                                        dot
                                        :color="
                                          user.user.online ? 'success' : ''
                                        "
                                        offset-y="32"
                                      >
                                        <v-avatar size="45">
                                          <v-img
                                            v-if="user.user.avatar.url"
                                            cover
                                            alt="Avatar"
                                            :src="
                                              baseUrl + user.user.avatar.url
                                            "
                                          ></v-img>
                                          <v-icon v-else></v-icon>
                                        </v-avatar>
                                      </v-badge>
                                    </template>
                                    <div>
                                      <div class="flex items-center">
                                        <h5
                                          class="text-sm font-semibold"
                                          style="
                                            font-family: inherit !important;
                                          "
                                        >
                                          {{ user.user.name }}
                                        </h5>
                                      </div>
                                      <div class="flex items-center mt-1">
                                        <h6
                                          class="text-xs font-normal"
                                          style="
                                            font-family: inherit !important;
                                          "
                                        >
                                          {{
                                            user.user.online
                                              ? "[在线]"
                                              : "[离线]"
                                          }}{{ user.user.description }}
                                        </h6>
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
                        <div
                          class="relative overflow-y-auto h-[500px] mt-4"
                          max-height="500"
                        >
                          <v-list @click:select="selectDetail" nav>
                            <v-list-item
                              v-for="group in groups"
                              :key="group.groupname"
                              :value="group"
                              active-class="active"
                              class="px-4 py-4 cursor-pointer"
                            >
                              <!-- 头像 -->
                              <template v-slot:prepend>
                                <v-avatar size="45">
                                  <v-img
                                    v-if="group.groupAvatar.url"
                                    cover
                                    alt="Avatar"
                                    :src="baseUrl + group.groupAvatar.url"
                                  ></v-img>
                                  <v-icon v-else></v-icon>
                                </v-avatar>
                              </template>
                              <div>
                                <div class="flex items-center">
                                  <h5
                                    class="text-sm font-semibold"
                                    style="font-family: inherit !important"
                                  >
                                    {{ group.name }}
                                  </h5>
                                </div>
                              </div>
                            </v-list-item>
                          </v-list>
                        </div>
                      </v-window-item>
                    </v-window>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- right 聊天框 -->
          <div class="flex-1 w-full relative">
            <div class="lg:hidden">
              <v-btn
                @click="drawer = !drawer"
                class="w-full lg:hidden"
                variant="text"
                rounded="0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon icon-tabler icon-tabler-menu-2 mr-2"
                  width="20px"
                  height="20px"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                  <line x1="4" y1="6" x2="20" y2="6"></line>
                  <line x1="4" y1="12" x2="20" y2="12"></line>
                  <line x1="4" y1="18" x2="20" y2="18"></line>
                </svg>
                Menu
              </v-btn>
              <hr />
            </div>
            <!-- 消息, 聊天 -->
            <div v-if="msg">
              <!-- 右侧发送消息框，历史消息记录 -->
              <div class="flex-1" v-if="showMsg">
                <v-dialog v-model="dialog" persistent width="auto">
                  <v-card>
                    <v-card-title class="text-h5"> 删除好友 </v-card-title>
                    <v-card-text>删除后不可撤回，是否删除？</v-card-text>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="red" variant="text" @click="dialog = false">
                        取消
                      </v-btn>
                      <v-btn
                        color="green-darken-1"
                        variant="text"
                        @click="
                          deleteFriend({
                            friendshipId: targetUser.friendship.id,
                            usergroupmemberId: targetUser.usergroupmemberId,
                          })
                        "
                      >
                        确认
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
                <v-dialog v-model="dialog2" persistent width="auto">
                  <v-card>
                    <v-card-title class="text-h5"> 退出群聊 </v-card-title>
                    <v-card-text>操作后不可撤回，是否退出？</v-card-text>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn
                        color="red"
                        variant="text"
                        @click="dialog2 = false"
                      >
                        取消
                      </v-btn>
                      <v-btn
                        color="green-darken-1"
                        variant="text"
                        @click="
                          leaveGroup22({
                            group_member: targetUser.group_member,
                          })
                        "
                      >
                        确认
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
                <!-- 删除聊天记录 -->
                <v-dialog v-model="dialog3" persistent width="auto">
                  <v-card>
                    <v-card-title class="text-h5"> 删除聊天记录 </v-card-title>
                    <v-card-text>操作后不可撤回，是否删除？</v-card-text>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn
                        color="red"
                        variant="text"
                        @click="dialog3 = false"
                      >
                        取消
                      </v-btn>
                      <v-btn
                        color="green-darken-1"
                        variant="text"
                        @click="deleteHistory(targetUser.uid)"
                      >
                        确认
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
                <v-layout>
                  <v-navigation-drawer
                    v-model="ddrawer"
                    location="right"
                    temporary
                  >
                    <v-list
                      density="compact"
                      @click:select="deleteList"
                      v-if="targetUser.tab == 'friends'"
                      class="pt-6"
                      nav
                    >
                      <v-list-item
                        variant="tonal"
                        class="text-center mb-2"
                        color="info"
                        title="删除聊天记录"
                        value="deleteFriendHistory"
                      ></v-list-item>
                      <v-list-item
                        variant="tonal"
                        class="text-center"
                        color="info"
                        title="删除好友"
                        value="removeFriend"
                      ></v-list-item>
                    </v-list>
                    <v-list
                      density="compact"
                      @click:select="deleteList"
                      v-else
                      class="pt-6"
                      nav
                    >
                      <v-list-item
                        variant="tonal"
                        class="text-center mb-2"
                        color="info"
                        title="删除聊天记录"
                        value="deleteGroupHistory"
                      ></v-list-item>
                      <v-list-item
                        variant="tonal"
                        class="text-center"
                        color="info"
                        title="退出群聊"
                        value="leaveGroup"
                      ></v-list-item>
                    </v-list>
                  </v-navigation-drawer>
                  <v-main>
                    <div>
                      <!-- 右侧顶部，名字和操作按钮 -->
                      <div class="flex items-center gap-3 p-4 justify-between">
                        <div class="flex gap-4 items-center">
                          <!-- 私聊 -->
                          <v-badge
                            v-if="targetUser.tab == 'friends'"
                            dot
                            :color="targetUser.online ? 'success' : ''"
                            offset-y="36"
                          >
                            <v-avatar size="50px">
                              <v-img
                                v-if="targetUser.avatar"
                                alt="Avatar"
                                cover
                                :src="baseUrl + targetUser.avatar.url"
                              ></v-img>
                              <v-icon v-else></v-icon>
                            </v-avatar>
                          </v-badge>
                          <!-- 群聊 -->
                          <v-avatar v-else size="50px">
                            <v-img
                              v-if="targetUser.groupAvatar"
                              alt="Avatar"
                              cover
                              :src="baseUrl + targetUser.groupAvatar.url"
                            ></v-img>
                            <v-icon v-else></v-icon>
                          </v-avatar>
                          <!-- 私聊 -->
                          <div
                            v-if="targetUser.tab == 'friends'"
                            class="flex flex-col justify-center"
                          >
                            <h5 class="text-lg font-semibold leading-6">
                              {{ targetUser.name }}
                            </h5>
                            <small>{{
                              targetUser.online ? "[在线]" : "[离线]"
                            }}</small>
                          </div>
                          <!-- 群聊 -->
                          <div v-else class="flex flex-col justify-center">
                            <h5 class="text-lg font-semibold leading-6">
                              {{ targetUser.name }} ({{
                                targetUser.group_members.length
                              }})
                            </h5>
                          </div>
                        </div>
                        <div class="flex items-center">
                          <v-btn variant="text" icon>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="icon icon-tabler icon-tabler-phone"
                              width="24px"
                              height="24px"
                              viewBox="0 0 24 24"
                              stroke-width="2"
                              stroke="currentColor"
                              fill="none"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <path
                                stroke="none"
                                d="M0 0h24v24H0z"
                                fill="none"
                              ></path>
                              <path
                                d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2"
                              ></path>
                            </svg>
                          </v-btn>
                          <v-btn variant="text" icon>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="icon icon-tabler icon-tabler-video-plus"
                              width="24px"
                              height="24px"
                              viewBox="0 0 24 24"
                              stroke-width="2"
                              stroke="currentColor"
                              fill="none"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <path
                                stroke="none"
                                d="M0 0h24v24H0z"
                                fill="none"
                              ></path>
                              <path
                                d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z"
                              ></path>
                              <rect
                                x="3"
                                y="6"
                                width="12"
                                height="12"
                                rx="2"
                              ></rect>
                              <line x1="7" y1="12" x2="11" y2="12"></line>
                              <line x1="9" y1="10" x2="9" y2="14"></line>
                            </svg>
                          </v-btn>
                          <v-btn
                            @click="ddrawer = !ddrawer"
                            icon="mdi-dots-vertical"
                            variant="plain"
                          ></v-btn>
                        </div>
                      </div>
                      <hr />
                      <!-- 右侧消息记录 -->
                      <div
                        v-scroll.self="onScroll"
                        class="h-[530px] overflow-y-auto relative"
                        ref="scrollContainer"
                        max-height="530"
                      >
                        <div class="flex min-h-full relative">
                          <!-- 消息列表 -->
                          <div class="w-full">
                            <div class="p-5" v-for="msg in messages">
                              <div
                                class="items-start flex gap-3 mb-1"
                                :class="[
                                  msg.me
                                    ? 'justify-end flex-row-reverse'
                                    : 'justify-start flex-row',
                                ]"
                              >
                                <!-- 头像 -->
                                <v-avatar size="40px">
                                  <v-img
                                    v-if="msg.user.avatar"
                                    cover=""
                                    alt="Avatar"
                                    :src="baseUrl + msg.user.avatar.url"
                                  ></v-img>
                                  <v-icon v-else></v-icon>
                                </v-avatar>
                                <!-- 内容 -->
                                <div
                                  class="flex flex-col w-full"
                                  :class="[
                                    !msg.me ? 'items-start' : 'items-end',
                                  ]"
                                >
                                  <small class="text-subtitle-2 text-gray-600"
                                    >{{ msg.me ? "" : msg.user.name }}
                                    <span class="text-xs">{{
                                      intlFormatDistance(
                                        new Date(msg.msg.createdAt),
                                        new Date()
                                      )
                                    }}</span>
                                  </small>
                                  <template v-if="msg.msg.type == 'message'">
                                    <v-sheet
                                      color="rgb(242,246,250)"
                                      rounded
                                      class="rounded-md px-3 py-2 mb-1 max-w-[90%]"
                                    >
                                      <p class="text-body-1 w-auto">
                                        {{ msg.msg.content }}
                                      </p>
                                    </v-sheet>
                                    <!-- 发送失败 -->
                                    <v-chip
                                      size="x-small"
                                      color="red"
                                      v-if="!msg.msg.success"
                                    >
                                      {{
                                        msg.msg.isGroupMessage
                                          ? "发送失败，你还未加入，请先加入该群聊"
                                          : "发送失败，该用户还不是您的好友,请添加好友后重试"
                                      }}
                                    </v-chip>
                                  </template>
                                  <template v-if="msg.msg.type == 'image'">
                                    <v-sheet
                                      rounded
                                      class="rounded-md mb-1 max-w-[90%]"
                                    >
                                      <a
                                        :href="
                                          (msg.msg.status == 'pending'
                                            ? ''
                                            : baseUrl) + msg.msg.content
                                        "
                                        data-fancybox="gallery"
                                        :data-caption="msg.msg.fileName"
                                      >
                                        <img
                                          class="rounded-lg mb-2"
                                          :src="
                                            (msg.msg.status == 'pending'
                                              ? ''
                                              : baseUrl) + msg.msg.content
                                          "
                                          width="152"
                                        />
                                      </a>
                                    </v-sheet>
                                    <template v-if="msg.me">
                                      <!-- 发送失败 -->
                                      <v-chip
                                        size="x-small"
                                        color="red"
                                        v-if="!msg.msg.success"
                                      >
                                        {{
                                          msg.msg.isGroupMessage
                                            ? "发送失败，你还未加入，请先加入该群聊"
                                            : "发送失败，该用户还不是您的好友,请添加好友后重试"
                                        }}
                                      </v-chip>
                                      <v-chip
                                        size="x-small"
                                        v-else-if="msg.msg.status == 'accepted'"
                                      >
                                        发送成功
                                      </v-chip>
                                      <v-chip v-else size="x-small">
                                        发送中...
                                      </v-chip>
                                    </template>
                                  </template>
                                </div>
                              </div>
                            </div>
                          </div>
                          <!-- 右侧文件 -->
                          <div
                            v-if="media"
                            class="w-[320px] border-l border-[rgb( 229,234,239)] sticky top-0 flex-shrink-0 overflow-y-auto h-[530px]"
                            max-height="530"
                          >
                            <v-sheet>
                              <div class="p-6">
                                <h6
                                  class="mb-3 text-base font-semibold"
                                  style="font-family: inherit !important"
                                >
                                  Media (1)
                                </h6>
                                <div class="grid grid-cols-3 gap-2">
                                  <div v-for="i in 8">
                                    <img
                                      src="../public/imgs/blog-img5.jpg"
                                      class="w-full"
                                      cover
                                      alt="img"
                                    />
                                  </div>
                                </div>
                                <h6
                                  class="text-base mb-3 mt-7 font-semibold"
                                  style="font-family: inherit !important"
                                >
                                  Attachments (5)
                                </h6>
                                <v-sheet>
                                  <div>
                                    <div
                                      class="flex items-center mt-7"
                                      v-for="i in 6"
                                    >
                                      <v-avatar size="48px">
                                        <img
                                          :width="24"
                                          alt="Avatar"
                                          src="https://modernize-nuxt.adminmart.com/images/chat/icon-adobe.svg"
                                        />
                                      </v-avatar>
                                      <div class="pl-4">
                                        <h6 class="text-base text-inherit">
                                          service-task.pdf
                                        </h6>
                                        <h5 class="text-xs text-inherit">
                                          2MB
                                        </h5>
                                      </div>
                                    </div>
                                  </div>
                                </v-sheet>
                              </div>
                            </v-sheet>
                          </div>
                          <!-- 群聊 右侧群公告/群成员 -->
                          <div
                            v-if="targetUser.tab == 'groups'"
                            class="hidden lg:block w-[200px] border-l border-[rgb( 229,234,239)] sticky top-0 flex-shrink-0 overflow-y-auto h-[530px]"
                            max-height="530"
                          >
                            <v-sheet>
                              <div class="p-4 px-4">
                                <h6
                                  class="mb-3 text-base font-medium px-2"
                                  style="font-family: inherit !important"
                                >
                                  群公告
                                </h6>
                                <v-sheet>
                                  <div class="px-2">
                                    <img
                                      src="../public/imgs/blog-img5.jpg"
                                      class="w-full"
                                      cover
                                      alt="img"
                                    />
                                  </div>
                                </v-sheet>
                                <h6
                                  class="text-base mb-1 mt-4 px-2 font-medium"
                                  style="font-family: inherit !important"
                                >
                                  群成员 ({{ targetUser.group_members.length }})
                                </h6>
                                <v-sheet>
                                  <v-list nav class="px-0" density="compact">
                                    <v-list-item
                                      class="px-2"
                                      v-for="(
                                        item, i
                                      ) in targetUser.group_members"
                                      :key="item.id"
                                      :value="item"
                                    >
                                      <template v-slot:prepend>
                                        <v-avatar size="30px">
                                          <v-img
                                            v-if="item.user.avatar"
                                            alt="Avatar"
                                            cover
                                            :src="
                                              baseUrl + item.user.avatar.url
                                            "
                                          ></v-img>
                                          <v-icon v-else></v-icon>
                                        </v-avatar>
                                      </template>
                                      <template v-slot:append>
                                        <v-chip
                                          size="small"
                                          v-if="
                                            targetUser.create_by.id ==
                                            item.user.id
                                          "
                                        >
                                          群主
                                        </v-chip>
                                      </template>

                                      <v-list-item-title
                                        v-text="item.user.name"
                                      ></v-list-item-title>
                                    </v-list-item>
                                  </v-list>
                                </v-sheet>
                              </div>
                            </v-sheet>
                          </div>
                        </div>
                      </div>
                    </div>
                    <hr />
                    <!-- 聊天底部，输入框，发送 -->
                    <div class="flex items-end p-4 inputform">
                      <v-menu :close-on-content-click="false">
                        <template v-slot:activator="{ props }">
                          <v-btn variant="plain" v-bind="props" @click="emojioClick" icon>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="icon icon-tabler icon-tabler-mood-smile"
                              width="24px"
                              height="24px"
                              viewBox="0 0 24 24"
                              stroke-width="2"
                              stroke="currentColor"
                              fill="none"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <path
                                stroke="none"
                                d="M0 0h24v24H0z"
                                fill="none"
                              ></path>
                              <circle cx="12" cy="12" r="9"></circle>
                              <line x1="9" y1="10" x2="9.01" y2="10"></line>
                              <line x1="15" y1="10" x2="15.01" y2="10"></line>
                              <path d="M9.5 15a3.5 3.5 0 0 0 5 0"></path>
                            </svg>
                          </v-btn>
                        </template>
                        <EmojiPicker
                        v-model="selectedEmoji"
                        :native="true"
                        :static-texts="{ placeholder: '搜索表情符号'}"
                        :group-names="groupNames" 
                        :display-recent="true"
                        @select="handleEmojiSelect"
                        />
                      </v-menu>
                      <v-textarea
                        ref="textarea"
                        row-height="20"
                        rows="1"
                        auto-grow
                        v-model="message"
                        @paste="handlePaste"
                        @input="handleInput"
                        color="info"
                        type="text"
                        variant="outlined"
                        @keydown.enter="send"
                        density="compact"
                        single-line
                        hide-details
                        class="shadow-none mx-2 my-[2px]"
                        ></v-textarea>
                      <v-btn variant="plain" @click="send" icon>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="icon icon-tabler icon-tabler-send"
                          width="20px"
                          height="20px"
                          viewBox="0 0 24 24"
                          stroke-width="2"
                          stroke="currentColor"
                          fill="none"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path
                            stroke="none"
                            d="M0 0h24v24H0z"
                            fill="none"
                          ></path>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                          <path
                            d="M21 3l-6.5 18a0.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a0.55 .55 0 0 1 0 -1l18 -6.5"
                          ></path>
                        </svg>
                      </v-btn>
                      <!-- 图片 -->
                      <v-btn
                        :variant="sendImage ? 'tonal' : 'plain'"
                        icon
                        @click="shooseImg"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="icon icon-tabler icon-tabler-photo"
                          width="20px"
                          height="20px"
                          viewBox="0 0 24 24"
                          stroke-width="2"
                          stroke="currentColor"
                          fill="none"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path
                            stroke="none"
                            d="M0 0h24v24H0z"
                            fill="none"
                          ></path>
                          <line x1="15" y1="8" x2="15.01" y2="8"></line>
                          <rect
                            x="4"
                            y="4"
                            width="16"
                            height="16"
                            rx="3"
                          ></rect>
                          <path d="M4 15l4 -4a3 5 0 0 1 3 0l5 5"></path>
                          <path d="M14 14l1 -1a3 5 0 0 1 3 0l2 2"></path>
                        </svg>
                      </v-btn>
                      <!-- 文件 -->
                      <v-btn variant="plain" icon>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="icon icon-tabler icon-tabler-paperclip"
                          width="20px"
                          height="20px"
                          viewBox="0 0 24 24"
                          stroke-width="2"
                          stroke="currentColor"
                          fill="none"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path
                            stroke="none"
                            d="M0 0h24v24H0z"
                            fill="none"
                          ></path>
                          <path
                            d="M15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3l6.5 -6.5a3 3 0 0 0 -6 -6l-6.5 6.5a4.5 4.5 0 0 0 9 9l6.5 -6.5"
                          ></path>
                        </svg>
                      </v-btn>
                    </div>

                    <hr />
                    <v-sheet class="w-full p-2" v-show="images.length > 0">
                      <v-file-input
                        ref="fileInput"
                        v-model="files"
                        @update:modelValue="imageUpdate"
                        color="info"
                        counter
                        label="图像"
                        min-heigth="100"
                        multiple
                        placeholder="Select your files"
                        prepend-icon=""
                        variant="outlined"
                        :show-size="2000"
                      >
                        <template
                          v-slot:selection="{
                            fileNames,
                            totalBytes,
                            totalBytesReadable,
                          }"
                        >
                          <div class="grid grid-cols-6 gap-2">
                            <template
                              v-for="(fileName, index) in fileNames"
                              :key="fileName"
                            >
                              <div class="flex flex-col w-full">
                                <v-img
                                  height="99"
                                  rounded="small"
                                  min-width="99"
                                  :src="images[index]"
                                ></v-img>

                                <v-chip
                                  color="deep-purple-accent-4"
                                  label
                                  size="small"
                                  class="me-2"
                                >
                                  {{ fileName }}
                                </v-chip>
                              </div>
                            </template>
                          </div>
                        </template>
                      </v-file-input>
                    </v-sheet>
                  </v-main>
                </v-layout>
              </div>
            </div>
            <!-- 联系人 列表-->
            <div v-else>
              <!-- right 好友/群详情 -->
              <div class="flex-1 py-10" v-if="showDetail">
                <v-sheet>
                  <!-- 右侧顶部，名字，操作 -->
                  <v-sheet class="px-8">
                    <div class="flex items-center gap-3 py-4 justify-between">
                      <div class="flex gap-4 items-center">
                        <v-avatar size="72px">
                          <v-img
                            v-if="detail.tab"
                            alt="Avatar"
                            cover
                            :src="
                              baseUrl +
                              `${
                                detail.tab == 'groups'
                                  ? detail.groupAvatar.url
                                  : detail.avatar.url
                              }`
                            "
                          ></v-img>
                          <v-icon v-else></v-icon>
                        </v-avatar>
                        <div class="flex flex-col justify-center">
                          <h5 class="text-lg font-semibold leading-6">
                            {{ detail.name }}
                          </h5>
                          <small class="mt-1 text-sm"
                            >UID:
                            {{
                              detail.tab == "groups"
                                ? detail.groupname
                                : detail.username
                            }}-{{ detail.uid }}</small
                          >
                        </div>
                      </div>
                      <div class="flex items-center space-x-2">
                        <!-- 修改信息 -->
                        <v-btn
                          v-if="detail.tab === 'groups'"
                          variant="text"
                          border
                          icon="mdi-pencil"
                        ></v-btn>
                        <!-- 发起聊天 -->
                        <v-btn
                          @click="chat"
                          variant="tonal"
                          icon="mdi-message-reply-outline"
                        ></v-btn>
                      </div>
                    </div>
                    <hr />
                  </v-sheet>
                  <!-- 好友详情 -->
                  <v-sheet v-if="detail.tab === 'friends'" class="px-8 py-4">
                    <div class="divide-x flex space-x-2">
                      <span v-if="detail.gender">{{
                        detail.gender == "male" ? "男" : "女"
                      }}</span>
                      <span v-if="detail.birthday" class="pl-2"
                        >{{ detail.age }}岁</span
                      >
                      <span v-if="detail.birthday" class="pl-2"
                        >{{ format(new Date(detail.birthday), "M月d日") }}
                        {{ getZodiacSign(detail.birthday) }}</span
                      >
                      <span v-if="detail.region" class="pl-2">{{
                        detail.region
                      }}</span>
                    </div>
                    <v-list class="px-0 mt-8" density="compact" nav>
                      <v-list-item class="px-0 py-2">
                        <template v-slot:prepend>
                          <v-icon
                            size="large"
                            icon="mdi-account-multiple-outline"
                          ></v-icon>
                        </template>
                        <template v-slot:title>
                          <h5 class="text-sm">好友分组</h5>
                        </template>
                        <template v-slot:append>
                          <v-select
                            density="compact"
                            single-line
                            hide-details
                            :items="['好友']"
                            variant="outlined"
                          ></v-select>
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
                    <hr class="mt-4" />
                  </v-sheet>
                  <!-- 群详情 -->
                  <v-sheet v-else class="px-8 py-4">
                    <v-list class="px-0 mt-8" density="compact" nav>
                      <v-list-item class="px-0 py-2">
                        <template v-slot:prepend>
                          <v-icon
                            size="large"
                            icon="mdi-account-group"
                          ></v-icon>
                        </template>
                        <template v-slot:title>
                          <h5 class="text-sm" v-if="detail.group_members">
                            群成员({{ detail.group_members.length }}人)
                          </h5>
                        </template>
                      </v-list-item>
                      <v-list-item class="px-0 py-2">
                        <div class="divide-x flex space-x-4">
                          <v-avatar size="52px">
                            <v-img
                              v-if="detail.create_by"
                              alt="Avatar"
                              cover
                              :src="baseUrl + detail?.create_by.avatar.url"
                            ></v-img>
                            <v-icon v-else></v-icon>
                          </v-avatar>
                          <div class="pl-4 flex gap-2 flex-wrap">
                            <v-menu
                              min-width="200"
                              rounded
                              v-for="user in detail.group_members"
                              location="bottom"
                              :offset="[5, 60]"
                            >
                              <template v-slot:activator="{ props }">
                                <v-btn icon v-bind="props">
                                  <v-avatar
                                    size="50px"
                                    :key="user.user.username"
                                  >
                                    <v-img
                                      v-if="user.user.avatar"
                                      alt="Avatar"
                                      cover
                                      :src="baseUrl + user.user.avatar.url"
                                    ></v-img>
                                    <v-icon v-else></v-icon>
                                  </v-avatar>
                                </v-btn>
                              </template>
                              <v-card rounded="xl">
                                <v-card-text>
                                  <div class="mx-auto text-center">
                                    <v-avatar size="60px">
                                      <v-img
                                        v-if="user.user.avatar"
                                        alt="Avatar"
                                        cover
                                        :src="baseUrl + user.user.avatar.url"
                                      ></v-img>
                                      <v-icon v-else></v-icon>
                                    </v-avatar>
                                    <h3 class="text-lg my-2">
                                      {{ user.user.name }}
                                    </h3>
                                    <p class="text-caption mt-1">
                                      {{ user.user.email }}
                                    </p>
                                    <v-divider class="my-3"></v-divider>
                                    <v-btn
                                      rounded
                                      variant="tonal"
                                      @click="applyFriend(user.user.id)"
                                    >
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
                    <v-list
                      lines="two"
                      variant="tonal"
                      v-if="notes"
                      class="pt-0 px-4"
                      nav
                    >
                      <v-list-item v-for="user in notes" class="my-4">
                        <template v-slot:prepend>
                          <v-avatar size="60px">
                            <v-img
                              v-if="user.user.avatar"
                              alt="Avatar"
                              cover
                              :src="baseUrl + user.user.avatar.url"
                            ></v-img>
                            <v-icon v-else></v-icon>
                          </v-avatar>
                        </template>
                        <template v-slot:title>
                          <div>
                            <span class="text-info mr-2">{{
                              user.user.name
                            }}</span>
                            <template v-if="user.me">
                              <span v-if="user.message.status == 'pending'"
                                >正在验证你的邀请</span
                              >
                              <span
                                v-else-if="user.message.status == 'accepted'"
                                >同意了你的邀请</span
                              >
                              <span v-else>拒绝了你的邀请</span>
                            </template>
                            <span v-else>请求加为好友</span>
                            <span class="ml-2" v-if="user.message">{{
                              format(
                                new Date(user.message.createdAt),
                                "yyyy/MM/dd HH:mm"
                              )
                            }}</span>
                          </div>
                        </template>
                        <template v-slot:subtitle>
                          <div class="mt-1">
                            留言：{{ user.message.content }}
                          </div>
                        </template>
                        <template v-slot:append>
                          <!-- 接收者 同意还是拒绝 -->
                          <v-menu
                            v-if="!user.me && user.message.status == 'pending'"
                            v-model="user.menu"
                            :close-on-content-click="false"
                            location="end"
                          >
                            <template v-slot:activator="{ props }">
                              <v-btn
                                icon="mdi-dots-horizontal"
                                v-bind="props"
                              ></v-btn>
                            </template>

                            <v-card
                              min-width="300"
                              class="pb-4"
                              rounded="large"
                            >
                              <v-card-text>
                                <v-list>
                                  <v-list-item>
                                    <template v-slot:prepend>
                                      <v-avatar size="60px">
                                        <v-img
                                          v-if="user.user.avatar"
                                          alt="Avatar"
                                          cover
                                          :src="baseUrl + user.user.avatar.url"
                                        ></v-img>
                                        <v-icon v-else></v-icon>
                                      </v-avatar>
                                    </template>
                                    <template v-slot:title>
                                      <div>
                                        <span class="text-info mr-2">{{
                                          user.user.name
                                        }}</span>
                                      </div>
                                    </template>
                                    <template v-slot:subtitle>
                                      <div class="mt-1">
                                        留言：{{ user.message.content }}
                                      </div>
                                    </template>
                                  </v-list-item>
                                </v-list>
                                <div class="text-xs my-2 mt-4 pl-2">分组</div>
                                <div class="flex gap-2">
                                  <v-select
                                    single-line
                                    label="Select"
                                    density="compact"
                                    hide-details
                                    color="info"
                                    v-model="applyReceiveUserGroup"
                                    :items="selectgroups"
                                    item-title="name"
                                    item-value="id"
                                    variant="outlined"
                                    return-object
                                  ></v-select>
                                  <v-btn
                                    icon="mdi-plus"
                                    variant="tonal"
                                    rounded="lg"
                                  ></v-btn>
                                </div>
                              </v-card-text>
                              <v-card-actions class="pr-4">
                                <v-spacer></v-spacer>
                                <v-btn
                                  variant="tonal"
                                  @click="
                                    editApplyFriend(
                                      'rejected',
                                      user.friendship,
                                      user
                                    )
                                  "
                                >
                                  拒绝
                                </v-btn>
                                <v-btn
                                  color="info"
                                  variant="tonal"
                                  @click="
                                    editApplyFriend(
                                      'accepted',
                                      user.friendship,
                                      user
                                    )
                                  "
                                >
                                  同意
                                </v-btn>
                              </v-card-actions>
                            </v-card>
                          </v-menu>
                          <div v-else class="text-sm mr-4">
                            {{
                              user.message.status == "pending"
                                ? "等待验证"
                                : user.message.status == "accepted"
                                ? "已同意"
                                : "已拒绝"
                            }}
                          </div>
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
                    <v-list
                      lines="two"
                      variant="tonal"
                      v-if="notes"
                      class="pt-0 px-4"
                      nav
                    >
                      <v-list-item v-for="note in gnotes" class="my-4">
                        <template v-slot:prepend>
                          <v-avatar v-if="note.me" size="60px">
                            <v-img
                              v-if="note.message.group.groupAvatar"
                              alt="Avatar"
                              cover
                              :src="
                                baseUrl + note.message.group.groupAvatar.url
                              "
                            ></v-img>
                            <v-icon v-else></v-icon>
                          </v-avatar>
                          <v-avatar v-else size="60px">
                            <v-img
                              v-if="note.message.sender.avatar"
                              alt="Avatar"
                              cover
                              :src="baseUrl + note.message.sender.avatar.url"
                            ></v-img>
                            <v-icon v-else></v-icon>
                          </v-avatar>
                        </template>
                        <template v-slot:title>
                          <div>
                            <template v-if="note.me">
                              <span class="text-info mr-2">{{
                                note.message.group.name
                              }}</span>
                              <span v-if="note.message.status == 'pending'"
                                >正在验证你的入群申请</span
                              >
                              <span
                                v-else-if="note.message.status == 'accepted'"
                                >同意了你的入群申请</span
                              >
                              <span v-else>拒绝了你的入群申请</span>
                            </template>
                            <template v-else>
                              <span class="text-info mr-2">{{
                                note.message.sender.name
                              }}</span>
                              <span
                                >请求加入群
                                <span class="text-info">{{
                                  note.message.group.name
                                }}</span></span
                              >
                            </template>
                            <span class="ml-2">{{
                              format(
                                new Date(note.message.createdAt),
                                "yyyy/MM/dd HH:mm"
                              )
                            }}</span>
                          </div>
                        </template>
                        <template v-slot:subtitle>
                          <div class="mt-1">
                            留言：{{ note.message.content }}
                          </div>
                          <div
                            class="text-info"
                            v-if="note.groupMember.operator"
                          >
                            操作人：{{ note.groupMember.operator.name }}
                          </div>
                        </template>
                        <template v-slot:append>
                          <!-- 接收者 同意还是拒绝 -->
                          <v-menu
                            v-if="!note.me && note.message.status == 'pending'"
                            v-model="note.menu"
                            :close-on-content-click="false"
                            location="end"
                          >
                            <template v-slot:activator="{ props }">
                              <v-btn
                                icon="mdi-dots-horizontal"
                                v-bind="props"
                              ></v-btn>
                            </template>
                            <v-card
                              min-width="300"
                              class="pb-4"
                              rounded="large"
                            >
                              <v-card-text>
                                <v-list>
                                  <v-list-item>
                                    <template v-slot:prepend>
                                      <v-avatar size="60px">
                                        <v-img
                                          v-if="note.message.sender.avatar"
                                          alt="Avatar"
                                          cover
                                          :src="
                                            baseUrl +
                                            note.message.sender.avatar.url
                                          "
                                        ></v-img>
                                        <v-icon v-else></v-icon>
                                      </v-avatar>
                                    </template>
                                    <template v-slot:title>
                                      <div>
                                        <span class="text-info mr-2">{{
                                          note.message.sender.name
                                        }}</span>
                                      </div>
                                    </template>
                                    <template v-slot:subtitle>
                                      <div class="mt-1">
                                        留言：{{ note.message.content }}
                                      </div>
                                    </template>
                                  </v-list-item>
                                </v-list>
                              </v-card-text>
                              <v-card-actions class="pr-4">
                                <v-spacer></v-spacer>
                                <v-btn
                                  variant="tonal"
                                  @click="
                                    editApplyGroup('rejected', note.groupMember)
                                  "
                                >
                                  拒绝
                                </v-btn>
                                <v-btn
                                  color="info"
                                  variant="tonal"
                                  @click="
                                    editApplyGroup('accepted', note.groupMember)
                                  "
                                >
                                  同意
                                </v-btn>
                              </v-card-actions>
                            </v-card>
                          </v-menu>
                          <div v-else class="text-sm mr-4">
                            {{
                              note.message.status == "pending"
                                ? "等待验证"
                                : note.message.status == "accepted"
                                ? "已同意"
                                : "已拒绝"
                            }}
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </div>
                </v-sheet>
              </div>
            </div>
          </div>
        </div>
      </v-card>
    </div>
  </v-app>
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
