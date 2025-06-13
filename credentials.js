// Verschlüsselte Zugangsdaten für Inventar Management
const credentials = {
    'admin': { password: 'XK92m#pL' }
};

const encryptedCredentials = CryptoJS.AES.encrypt(
    JSON.stringify(credentials),
    "inventarSecretKey"
).toString();
