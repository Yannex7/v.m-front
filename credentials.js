// Verschlüsselte Zugangsdaten
const credentials = {
    'admin': { password: 'XK92m#pL' },
    'robin': { password: 'Rb7$kN9v' },
    'robink': { password: 'Rk4@jM8w' },
    'adrian': { password: 'Ad5#nP2x' },
    'andreas': { password: 'An9$tL6y' }
};

const encryptedCredentials = CryptoJS.AES.encrypt(
    JSON.stringify(credentials),
    "vapeSecretKey"
).toString();
