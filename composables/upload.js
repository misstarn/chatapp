// 上传文件
export const upload = (file) => {
    const formData = new FormData()
    formData.append('files', file)

    console.log(formData)
    return new Promise(async (resolve, reject) => {
        const {data, error} = await useFetch('http://localhost:1337/api/upload', {
            body: formData,
            method: 'POST'
        })
        console.log(error)
        if(error.value) {
            reject(error.value)
        }
        console.log(data)
        resolve(data)
    })
}