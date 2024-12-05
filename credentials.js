const encryptedCredentials = CryptoJS.AES.encrypt(JSON.stringify({
    admin: {
        password: "XK92m#pL",
        isAdmin: true,
        stockAdmin: false
    },
    robin: {
        password: "Rb7$kN9v",
        isAdmin: false,
        stockAdmin: true
    },
    andreas: {
        password: "An9$tL6y",
        isAdmin: false,
        stockAdmin: true
    },
    robink: {
        password: "Rk4@jM8w",
        isAdmin: false,
        stockAdmin: false
    },
    adrian: {
        password: "Ad5#nP2x",
        isAdmin: false,
        stockAdmin: false
    },
    martin: {
        password: "xP91$mV5",
        isAdmin: false,
        stockAdmin: false
    }
}), "vapeSecretKey").toString();
