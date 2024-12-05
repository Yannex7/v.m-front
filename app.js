const PRICES = {
    EINKAUF: 7.50,
    VERKAUF: 25.00,
    EIGENKONSUM: 10.00,
    PROVISION: 10.00
};

let currentUser = null;
let data = {
    stock: { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
    sales: { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
    consumed: { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
    payments: { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
    totalQuantity: 0
};

async function loadData() {
    try {
        const response = await fetch('https://v-m-259c.onrender.com/api/data');
        const serverData = await response.json();
        data = {
            stock: serverData.stock || { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
            sales: serverData.sales || { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
            consumed: serverData.consumed || { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
            payments: serverData.payments || { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
            totalQuantity: serverData.totalQuantity || 0
        };
        updateDisplay();
    } catch (error) {
        console.error('Fehler beim Laden:', error);
        data = {
            stock: { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
            sales: { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
            consumed: { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
            payments: { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
            totalQuantity: 0
        };
        updateDisplay();
    }
}

loadData();

function decryptCredentials() {
    const decrypted = CryptoJS.AES.decrypt(encryptedCredentials, "vapeSecretKey").toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const users = decryptCredentials();

    if (users[username] && users[username].password === password) {
        currentUser = {
            username: username,
            isAdmin: username === 'admin'
        };
        handleLoginSuccess();
    } else {
        alert('Falscher Benutzername oder Passwort!');
    }
}

function handleLoginSuccess() {
    document.getElementById('loginSection').style.display = 'none';
    document.querySelector('.content-wrapper').style.display = 'block';
    document.querySelector('.logout-btn').style.display = 'block';
    
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = currentUser.isAdmin ? 'block' : 'none';
    });
    document.querySelector('.runner-section').style.display = 
        currentUser.isAdmin ? 'none' : 'block';
    
    updateDisplay();
}

function logout() {
    currentUser = null;
    location.reload();
}

async function saveData() {
    try {
        await fetch('https://v-m-259c.onrender.com/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        updateDisplay();
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
    }
}

function updateDisplay() {
    const totals = calculateTotals();
    
    document.getElementById('totalOverview').value = 
        `GESAMTÜBERSICHT:\n` +
        `Gesamtanzahl: ${data.totalQuantity}\n` +
        `Gesamtverkäufe: ${totals.totalSales.toFixed(2)}€\n` +
        `Eigenkonsum Einnahmen: ${totals.totalEigenkonsum.toFixed(2)}€\n` +
        `Einkaufskosten: ${totals.totalEinkauf.toFixed(2)}€\n` +
        `Provisionen: ${totals.totalProvisions.toFixed(2)}€\n` +
        `Gesamtgewinn: ${totals.totalGewinn.toFixed(2)}€`;
    
    ['robin', 'robink', 'adrian', 'andreas', 'martin'].forEach(person => {
        const owed = calculateOwed(person);
        const displayName = person === 'robink' ? 'ROBIN.K' : person.toUpperCase();
        document.getElementById(`${person}Overview`).value = 
            `${displayName}:\n` +
            `Lager: ${data.stock[person]}\n` +
            `Verkäufe: ${data.sales[person]}\n` +
            `Eigenkonsum: ${data.consumed[person]}\n` +
            `Gezahlt: ${data.payments[person]}€\n` +
            `Noch zu zahlen: ${owed.toFixed(2)}€`;
    });
}

function calculateTotals() {
    let totals = {
        totalSales: 0,
        totalEigenkonsum: 0,
        totalEinkauf: 0,
        totalGewinn: 0,
        totalProvisions: 0
    };

    for (let person in data.sales) {
        totals.totalSales += data.sales[person] * PRICES.VERKAUF;
        totals.totalEigenkonsum += data.consumed[person] * PRICES.EIGENKONSUM;
        totals.totalEinkauf += (data.sales[person] + data.consumed[person]) * PRICES.EINKAUF;
        totals.totalProvisions += data.sales[person] * PRICES.PROVISION;
    }

    totals.totalGewinn = (totals.totalSales + totals.totalEigenkonsum) - (totals.totalEinkauf + totals.totalProvisions);
    return totals;
}

function calculateOwed(person) {
    const salesDebt = data.sales[person] * 15;
    const eigenkonsum = data.consumed[person] * PRICES.EIGENKONSUM;
    return salesDebt + eigenkonsum - data.payments[person];
}

function runnerAddSale() {
    if (currentUser.isAdmin) return;
    const amount = parseInt(document.getElementById('runnerAmount').value);
    if (amount && amount > 0) {
        if (data.stock[currentUser.username] >= amount) {
            data.sales[currentUser.username] += amount;
            data.stock[currentUser.username] -= amount;
            saveData();
        } else {
            alert('Nicht genügend Lagerbestand!');
        }
    }
}

function runnerAddConsumption() {
    if (currentUser.isAdmin) return;
    const amount = parseInt(document.getElementById('runnerAmount').value);
    if (amount && amount > 0) {
        if (data.stock[currentUser.username] >= amount) {
            data.consumed[currentUser.username] += amount;
            data.stock[currentUser.username] -= amount;
            saveData();
        } else {
            alert('Nicht genügend Lagerbestand!');
        }
    }
}

function setTotalQuantity() {
    if (!currentUser.isAdmin) return;
    const amount = parseInt(document.getElementById('totalQuantity').value);
    if (amount >= 0) {
        data.totalQuantity = amount;
        saveData();
    }
}

function adminAddStock() {
    if (!currentUser.isAdmin) return;
    const person = document.getElementById('adminPerson').value;
    const amount = parseInt(document.getElementById('adminAmount').value);
    if (person && amount) {
        data.stock[person] += amount;
        saveData();
    }
}

function adminRemoveStock() {
    if (!currentUser.isAdmin) return;
    const person = document.getElementById('adminPerson').value;
    const amount = parseInt(document.getElementById('adminAmount').value);
    if (person && amount && data.stock[person] >= amount) {
        data.stock[person] -= amount;
        saveData();
    }
}

function adminAddSale() {
    if (!currentUser.isAdmin) return;
    const person = document.getElementById('adminPerson').value;
    const amount = parseInt(document.getElementById('adminAmount').value);
    if (person && amount) {
        if (data.stock[person] >= amount) {
            data.sales[person] += amount;
            data.stock[person] -= amount;
            saveData();
        } else {
            alert('Nicht genügend Lagerbestand!');
        }
    }
}

function adminRemoveSale() {
    if (!currentUser.isAdmin) return;
    const person = document.getElementById('adminPerson').value;
    const amount = parseInt(document.getElementById('adminAmount').value);
    if (person && amount && data.sales[person] >= amount) {
        data.sales[person] -= amount;
        data.stock[person] += amount;
        saveData();
    }
}

function adminAddConsumption() {
    if (!currentUser.isAdmin) return;
    const person = document.getElementById('adminPerson').value;
    const amount = parseInt(document.getElementById('adminAmount').value);
    if (person && amount) {
        if (data.stock[person] >= amount) {
            data.consumed[person] += amount;
            data.stock[person] -= amount;
            saveData();
        } else {
            alert('Nicht genügend Lagerbestand!');
        }
    }
}

function adminRemoveConsumption() {
    if (!currentUser.isAdmin) return;
    const person = document.getElementById('adminPerson').value;
    const amount = parseInt(document.getElementById('adminAmount').value);
    if (person && amount && data.consumed[person] >= amount) {
        data.consumed[person] -= amount;
        data.stock[person] += amount;
        saveData();
    }
}

function adminAddPayment() {
    if (!currentUser.isAdmin) return;
    const person = document.getElementById('adminPerson').value;
    const amount = parseFloat(document.getElementById('adminPayment').value);
    if (person && amount) {
        data.payments[person] += amount;
        saveData();
    }
}

function adminRemovePayment() {
    if (!currentUser.isAdmin) return;
    const person = document.getElementById('adminPerson').value;
    const amount = parseFloat(document.getElementById('adminPayment').value);
    if (person && amount && data.payments[person] >= amount) {
        data.payments[person] -= amount;
        saveData();
    }
}

function adminResetAll() {
    if (!currentUser.isAdmin) return;
    if (confirm('Wirklich alle Daten zurücksetzen?')) {
        data = {
            stock: { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
            sales: { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
            consumed: { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
            payments: { robin: 0, robink: 0, adrian: 0, andreas: 0, martin: 0 },
            totalQuantity: 0
        };
        saveData();
    }
}

updateDisplay();
