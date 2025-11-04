// Verschlüsselte Zugangsdaten für Inventar Management
const credentials = {
    'admin': { password: 'XK92m#pL', role: 'admin' },
    'Robin': { password: 'robinSecure2024', role: 'creator' },
    'Tommy': { password: 'tommyPass789', role: 'user' },
    'Letezia': { password: 'leteziaKey456', role: 'user' }
};

const encryptedCredentials = CryptoJS.AES.encrypt(
    JSON.stringify(credentials),
    "inventarSecretKey"
).toString();
