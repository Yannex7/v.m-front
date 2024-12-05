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
    totalQuantity: 0,
    logs: []
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
            totalQuantity: serverData.totalQuantity || 0,
            logs: serverData.logs || []
        };
        updateDisplay();
        updateLogDisplay();
    } catch (error) {
        console.error('Fehler beim Laden:', error);
        updateDisplay();
        updateLogDisplay();
    }
}

loadData();
checkLoginStatus();

function checkLoginStatus() {
    const loginData = JSON.parse(localStorage.getItem('vapeLoginData'));
    if (loginData && loginData.expiry > new Date().getTime()) {
        currentUser = loginData.user;
        handleLoginSuccess();
    }
}

function addLog(action, details) {
    const timestamp = new Date().toLocaleString();
    const logEntry = `${timestamp} - ${currentUser.username}: ${action} - ${details}`;
    data.logs.unshift(logEntry);
    if (data.logs.length > 50) data.logs.pop();
    updateLogDisplay();
}

function updateLogDisplay() {
    const logElement = document.getElementById('logOverview');
    if (currentUser && currentUser.logAccess && logElement) {
        logElement.value = data.logs.join('\n');
        document.querySelector('.log-section').style.display = 'block';
    }
}

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
            isAdmin: users[username].isAdmin,
            stockAdmin: users[username].stockAdmin,
            logAccess: users[username].logAccess
        };
        
        const loginData = {
            user: currentUser,
            expiry: new Date().getTime() + (24 * 60 * 60 * 1000)
        };
        localStorage.setItem('vapeLoginData', JSON.stringify(loginData));
        
        addLog('Login', 'Erfolgreich eingeloggt');
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
    
    document.querySelectorAll('.stock-admin-only').forEach(el => {
        el.style.display = currentUser.stockAdmin ? 'block' : 'none';
    });
    
    document.querySelector('.log-section').style.display = 
        currentUser.logAccess ? 'block' : 'none';
    
    updateDisplay();
    updateLogDisplay();
}

function logout() {
    localStorage.removeItem('vapeLoginData');
    addLog('Logout', 'Ausgeloggt');
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
        updateLogDisplay();
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
    }
}

function showStatistics() {
    if (!currentUser.isAdmin) return;
    
    const statsSection = document.getElementById('statisticsSection');
    
    if (statsSection.style.display === 'none') {
        statsSection.style.display = 'block';
        
        const salesChart = new Chart('salesChart', {
            type: 'bar',
            data: {
                labels: ['ROBIN', 'ROBIN.K', 'ADRIAN', 'ANDREAS', 'MARTIN'],
                datasets: [{
                    label: 'Verkäufe',
                    data: Object.values(data.sales),
                    backgroundColor: '#4CAF50'
                }, {
                    label: 'Eigenkonsum',
                    data: Object.values(data.consumed),
                    backgroundColor: '#2196F3'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        const totals = calculateTotals();
        const financeChart = new Chart('financeChart', {
            type: 'doughnut',
            data: {
                labels: ['Verkäufe', 'Eigenkonsum', 'Einkauf', 'Provision'],
                datasets: [{
                    data: [
                        totals.totalSales,
                        totals.totalEigenkonsum,
                        totals.totalEinkauf,
                        totals.totalProvisions
                    ],
                    backgroundColor: ['#4CAF50', '#2196F3', '#f44336', '#FFC107']
                }]
            },
            options: {
                responsive: true
            }
        });
    } else {
        statsSection.style.display = 'none';
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
        if (currentUser.isAdmin || currentUser.stockAdmin || currentUser.username === person) {
            const owed = calculateOwed(person);
            const displayName = person === 'robink' ? 'ROBIN.K' : person.toUpperCase();
            document.getElementById(`${person}Overview`).value = 
                `${displayName}:\n` +
                `Lager: ${data.stock[person]}\n` +
                `Verkäufe: ${data.sales[person]}\n` +
                `Eigenkonsum: ${data.consumed[person]}\n` +
                `Gezahlt: ${data.payments[person]}€\n` +
                `Noch zu zahlen: ${owed.toFixed(2)}€`;
            document.getElementById(`${person}Overview`).style.display = 'block';
        } else {
            document.getElementById(`${person}Overview`).style.display = 'none';
        }
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

function adminAddStock() {
    if (!currentUser.isAdmin) return;
    const person = document.getElementById('adminPerson').value;
    const amount = parseInt(document.getElementById('adminAmount').value);
    if (person && amount) {
        data.stock[person] += amount;
        addLog('Admin Lager+', `${amount} zu ${person}`);
        saveData();
    }
}

function adminRemoveStock() {
    if (!currentUser.isAdmin) return;
    const person = document.getElementById('adminPerson').value;
    const amount = parseInt(document.getElementById('adminAmount').value);
    if (person && amount && data.stock[person] >= amount) {
        data.stock[person] -= amount;
        addLog('Admin Lager-', `${amount} von ${person}`);
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
            addLog('Admin Verkauf+', `${amount} für ${person}`);
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
        addLog('Admin Verkauf-', `${amount} von ${person}`);
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
            addLog('Admin Eigenkonsum+', `${amount} für ${person}`);
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
        addLog('Admin Eigenkonsum-', `${amount} von ${person}`);
        saveData();
    }
}

function adminAddPayment() {
    if (!currentUser.isAdmin) return;
    const person = document.getElementById('adminPerson').value;
    const amount = parseFloat(document.getElementById('adminPayment').value);
    if (person && amount) {
        data.payments[person] += amount;
        addLog('Admin Zahlung+', `${amount}€ von ${person}`);
        saveData();
    }
}

function adminRemovePayment() {
    if (!currentUser.isAdmin) return;
    const person = document.getElementById('adminPerson').value;
    const amount = parseFloat(document.getElementById('adminPayment').value);
    if (person && amount && data.payments[person] >= amount) {
        data.payments[person] -= amount;
        addLog('Admin Zahlung-', `${amount}€ von ${person}`);
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
            totalQuantity: 0,
            logs: []
        };
        addLog('Reset', 'Alle Daten zurückgesetzt');
        saveData();
    }
}

updateDisplay();
