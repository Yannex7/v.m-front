const encryptedCredentials = CryptoJS.AES.encrypt(JSON.stringify({
    admin: {
        password: "XK92m#pL",
        isAdmin: true
    },
    robin: {
        password: "Rb7$kN9v",
        isAdmin: false
    },
    robink: {
        password: "Rk4@jM8w",
        isAdmin: false
    },
    adrian: {
        password: "Ad5#nP2x",
        isAdmin: false
    },
    andreas: {
        password: "An9$tL6y",
        isAdmin: false
    },
    martin: {
        password: "xP91$mV5",
        isAdmin: false
    }
}), "vapeSecretKey").toString();
