const encryptedCredentials = CryptoJS.AES.encrypt(JSON.stringify({
    admin: {
        password: "adminVape123!",
        isAdmin: true
    },
    robin: {
        password: "vp89#mK2",
        isAdmin: false
    },
    robink: {
        password: "kL45$pN9",
        isAdmin: false
    },
    adrian: {
        password: "jH67@vB4",
        isAdmin: false
    },
    andreas: {
        password: "qW23#nM8",
        isAdmin: false
    },
    martin: {
        password: "xP91$mV5",
        isAdmin: false
    }
}), "vapeSecretKey").toString();
