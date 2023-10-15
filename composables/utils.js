// 将十六进制字符串还原 IV
export const hexToUint8Array = (hex) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
}

// 将随机IV Unit8Array 转为十六进制字符串
export const unit8ArrayToHex = (iv) => {
    // 转换 IV 为十六进制字符串
    return Array.from(iv).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

// 将jwk密钥转换为CryptoKey格式密钥 //对称密钥
export const jwkToCryptoKey = (jwk) => {
    if (process.client) {
        return window.crypto.subtle.importKey(
            "jwk", // 密钥格式
            jwk, // 对称密钥的 JWK 对象
            {
                name: "AES-GCM" // 对称加密算法
            },
            true, // 密钥用途（true 表示用于加密）
            ["encrypt", "decrypt"] // 允许的操作
        )
    }
}
// 将jwk密钥转换为CryptoKey格式密钥 //非对称密钥 公钥
export const jwkToCryptoKey2 = (jwk) => {
    if (process.client) {
        return window.crypto.subtle.importKey(
            "jwk", // 密钥格式
            jwk,   // JWK 密钥对象
            {
                name: "RSA-OAEP", // 密钥算法
                // modulusLength: 4096,
                // publicExponent: new Uint8Array([1, 0, 1]),
                hash: { name: "SHA-256" }, // 哈希算法
            },
            true,  // 密钥用途（true 表示用于加密）
            ["encrypt"] // 允许的操作
        )
    }
}
// 将jwk密钥转换为CryptoKey格式密钥 //非对称密钥 私钥
export const jwkToCryptoKey3 = (jwk) => {
    if (process.client) {
        return window.crypto.subtle.importKey(
            "jwk", // 密钥格式
            jwk,   // JWK 密钥对象
            {
                name: "RSA-OAEP", // 密钥算法
                // modulusLength: 4096,
                // publicExponent: new Uint8Array([1, 0, 1]),
                hash: { name: "SHA-256" }, // 哈希算法
            },
            true,  // 密钥用途（true 表示用于加密）
            ["decrypt"] // 允许的操作
        )
    }
}

// 将ArrayBuffer转换为Base64的函数
export const arrayBufferToBase64 = (arrayBuffer) => {
    if (process.client) {
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = uint8Array.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
        return btoa(binaryString);
    }
}

// 将Base64转换为ArrayBuffer的函数
export const base64ToArrayBuffer = (base64) => {
    if (process.client) {
        const binaryString = atob(base64);
        const length = binaryString.length;
        const uint8Array = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
        }
        return uint8Array.buffer;
    }
}