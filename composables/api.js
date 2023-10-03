import qs from 'qs'
// 获取消息历史
export const history11 = (data) => {
    const config = useRuntimeConfig()
    const params = qs.stringify(data)
    return new Promise(async (resolve, reject) => {
        const {data, error} = await useFetch('/messages?'+ params, {
            baseURL: config.public.apiBase,
            method: 'GET'
        })
        console.log(error)
        if(error.value) {
            reject(error.value)
        }
        console.log(data)
        resolve(data)
    })
}

// 注册账号
export const register = (formData) => {
    const config = useRuntimeConfig()
    return new Promise(async (resolve, reject) => {
        const { data, error } = await useFetch('/auth/local/register', {
            baseURL: config.public.apiBase,
            method: 'POST',
            body: formData
        })

        console.log(error)
        if(error.value) {
            reject(error.value)
        }
        console.log(data)
        resolve(data)
    })
}

// 查询最后一个用户uid
export const lastUser = () => {
    const config = useRuntimeConfig()
    const params = qs.stringify({
        limit: 1,
        sort: ['createdAt:desc'],
        fields: ['uid']
    })
    return new Promise(async (resolve, reject) => {
        const { data, error } = await useFetch('/users?' + params, {
            baseURL: config.public.apiBase,
            method: 'GET',
        })

        console.log(error)
        if(error.value) {
            reject(error.value)
        }
        console.log(data)
        resolve(data)
    })
}

// 创建一个好友分组
export const createUserGroup = (formData) => {
    const config = useRuntimeConfig()
    return new Promise(async (resolve, reject) => {
        const { data, error } = await useFetch('/user-groups', {
            baseURL: config.public.apiBase,
            method: 'POST',
            body: {
                data: formData
            }
        })

        console.log(error)
        if(error.value) {
            reject(error.value)
        }
        console.log(data)
        resolve(data)
    })
}