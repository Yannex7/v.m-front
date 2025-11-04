let orders = [];
let currentOrder = null;
let currentUser = null;
let confirmCallback = null;

const SERVER_URL = 'https://v-m-259c.onrender.com';

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });
});

function decryptCredentials() {
    const decrypted = CryptoJS.AES.decrypt(encryptedCredentials, "inventarSecretKey").toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
}

function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showToast('Bitte Benutzername und Passwort eingeben!', 'error');
        return;
    }

    const users = decryptCredentials();

    if (users[username] && users[username].password === password) {
        currentUser = {
            username: username,
            isAdmin: username === 'admin',
            role: users[username].role
        };
        handleLoginSuccess();
    } else {
        showToast('Falscher Benutzername oder Passwort!', 'error');
        document.getElementById('password').value = '';
    }
}

function handleLoginSuccess() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    showToast(`Willkommen, ${currentUser.username}!`, 'success');
    loadOrders();
}

function logout() {
    currentUser = null;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
    
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    orders = [];
    currentOrder = null;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

async function loadOrders() {
    if (!currentUser) return;
    
    showLoading();
    try {
        const response = await fetch(`${SERVER_URL}/api/orders`);
        if (response.ok) {
            orders = await response.json();
            displayOrders();
            displayDebts();
            showToast('Bestellungen erfolgreich geladen', 'success');
        } else {
            throw new Error('Server-Fehler');
        }
    } catch (error) {
        console.error('Fehler beim Laden der Bestellungen:', error);
        orders = [];
        displayOrders();
        displayDebts();
        showToast('Fehler beim Laden der Bestellungen', 'error');
    } finally {
        hideLoading();
    }
}

function displayOrders() {
    const grid = document.getElementById('ordersGrid');
    grid.innerHTML = '';

    let filteredOrders = orders;
    if (currentUser.role === 'user') {
        filteredOrders = orders.filter(order => 
            order.created_by === currentUser.username || 
            order.created_by === 'Robin' || 
            (order.created_by === 'Tommy' || order.created_by === 'Letezia')
        );
    } else if (currentUser.role === 'creator') {
        filteredOrders = orders.filter(order => 
            order.created_by === currentUser.username || 
            order.created_by === 'Tommy' || 
            order.created_by === 'Letezia'
        );
    }

    if (filteredOrders.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>Noch keine Bestellungen vorhanden</h3>
                <p>Erstellen Sie Ihre erste Bestellung, um zu beginnen!</p>
                <button class="btn" onclick="showNewOrderModal()">Erste Bestellung erstellen</button>
            </div>
        `;
        return;
    }

    filteredOrders.forEach(order => {
        const stats = calculateOrderStats(order);
        const card = document.createElement('div');
        card.className = 'order-card';
        card.onclick = () => openOrderDetail(order);
        
        const profitClass = stats.totalProfit >= 0 ? 'profit-positive' : 'profit-negative';
        const stockClass = stats.currentStock <= 5 ? 'stock-low' : 'stock-normal';
        
        const canEdit = currentUser.isAdmin || order.created_by === currentUser.username || 
                        (currentUser.role === 'user' && (order.created_by === 'Tommy' || order.created_by === 'Letezia'));
        
        card.innerHTML = `
            <div class="order-header">
                <div class="order-title">${order.name}</div>
                <div class="order-date">${new Date(order.created_at).toLocaleDateString()}</div>
            </div>
            <div class="order-info">
                <p><strong>Einkaufspreis:</strong> ${order.cost_price.toFixed(2)}€/Stück</p>
                <p><strong>Kunden:</strong> ${order.customers ? order.customers.length : 0}</p>
            </div>
            <div class="order-stats">
                <div class="stat-item ${stockClass}">
                    <div class="stat-value">${stats.currentStock}</div>
                    <div class="stat-label">Lagerbestand</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.totalSold}</div>
                    <div class="stat-label">Verkauft</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.totalRevenue.toFixed(2)}€</div>
                    <div class="stat-label">Umsatz</div>
                </div>
                <div class="stat-item ${profitClass}">
                    <div class="stat-value">${stats.totalProfit.toFixed(2)}€</div>
                    <div class="stat-label">Gewinn</div>
                </div>
            </div>
            <div class="order-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(stats.totalSold / order.initial_quantity * 100)}%"></div>
                </div>
                <span class="progress-text">${Math.round(stats.totalSold / order.initial_quantity * 100)}% verkauft</span>
            </div>
            ${canEdit ? '<button class="btn btn-danger" onclick="deleteOrderFromList(' + order.id + ')">🗑️ Löschen</button>' : ''}
        `;
        
        grid.appendChild(card);
    });
}

function deleteOrderFromList(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order || (!currentUser.isAdmin && order.created_by !== currentUser.username && 
        !(currentUser.role === 'user' && (order.created_by === 'Tommy' || order.created_by === 'Letezia')))) return;
    
    showConfirmModal(
        'Bestellung löschen',
        `Möchten Sie die Bestellung "${order.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!`,
        async () => {
            showLoading();
            try {
                const response = await fetch(`${SERVER_URL}/api/orders/${orderId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    orders = orders.filter(o => o.id !== orderId);
                    displayOrders();
                    showToast('Bestellung erfolgreich gelöscht!', 'success');
                } else {
                    throw new Error('Server-Fehler');
                }
            } catch (error) {
                console.error('Fehler beim Löschen:', error);
                showToast('Fehler beim Löschen der Bestellung', 'error');
            } finally {
                hideLoading();
            }
        }
    );
}

function calculateOrderStats(order) {
    const totalSold = order.sales ? order.sales.reduce((sum, sale) => sum + sale.quantity, 0) : 0;
    const currentStock = order.initial_quantity - totalSold;
    const totalRevenue = order.sales ? order.sales.reduce((sum, sale) => sum + (sale.quantity * sale.pricePerUnit), 0) : 0;
    const totalCost = totalSold * order.cost_price;
    const totalProfit = totalRevenue - totalCost;
    const totalDebt = calculateTotalDebt(order);
    const totalPaid = order.payments ? order.payments.reduce((sum, payment) => sum + payment.amount, 0) : 0;

    return {
        currentStock,
        totalSold,
        totalRevenue,
        totalProfit,
        totalDebt,
        totalPaid,
        outstandingDebt: totalDebt - totalPaid
    };
}

function calculateTotalDebt(order) {
    if (!order.sales) return 0;
    return order.sales.reduce((sum, sale) => sum + (sale.quantity * sale.pricePerUnit), 0);
}

function showNewOrderModal() {
    if (!currentUser) return;
    document.getElementById('newOrderModal').style.display = 'block';
    document.getElementById('orderName').focus();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    
    if (modalId === 'newOrderModal') {
        document.getElementById('orderName').value = '';
        document.getElementById('orderQuantity').value = '';
        document.getElementById('orderCostPrice').value = '';
    }
}

async function createOrder() {
    if (!currentUser) return;
    
    const name = document.getElementById('orderName').value.trim();
    const quantity = parseInt(document.getElementById('orderQuantity').value);
    const costPrice = parseFloat(document.getElementById('orderCostPrice').value);

    if (!name || !quantity || !costPrice) {
        showToast('Bitte alle Felder ausfüllen!', 'error');
        return;
    }

    if (quantity <= 0 || costPrice <= 0) {
        showToast('Anzahl und Preis müssen größer als 0 sein!', 'error');
        return;
    }

    const newOrder = {
        name: name,
        initial_quantity: quantity,
        cost_price: costPrice,
        customers: [],
        sales: [],
        payments: [],
        created_by: currentUser.username
    };

    showLoading();
    try {
        const response = await fetch(`${SERVER_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newOrder)
        });

        if (response.ok) {
            const createdOrder = await response.json();
            orders.push(createdOrder);
            displayOrders();
            closeModal('newOrderModal');
            showToast('Bestellung erfolgreich erstellt!', 'success');
        } else {
            throw new Error('Server-Fehler');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showToast('Fehler beim Erstellen der Bestellung', 'error');
    } finally {
        hideLoading();
    }
}

function openOrderDetail(order) {
    currentOrder = order;
    document.getElementById('orderDetailTitle').textContent = order.name;
    updateOrderDetailDisplay();
    document.getElementById('orderDetailModal').style.display = 'block';
    switchTab('overview');
    
    if (currentUser.isAdmin || order.created_by === currentUser.username || 
        (currentUser.role === 'user' && (order.created_by === 'Tommy' || order.created_by === 'Letezia'))) {
        document.getElementById('adminDangerZone').style.display = 'block';
        document.getElementById('deleteOrderBtn').style.display = 'block';
    } else {
        document.getElementById('adminDangerZone').style.display = 'none';
        document.getElementById('deleteOrderBtn').style.display = 'none';
    }
}

function updateOrderDetailDisplay() {
    if (!currentOrder) return;
    
    const stats = calculateOrderStats(currentOrder);
    
    document.getElementById('detailStock').textContent = stats.currentStock;
    document.getElementById('detailSold').textContent = stats.totalSold;
    document.getElementById('detailRevenue').textContent = stats.totalRevenue.toFixed(2) + '€';
    document.getElementById('detailProfit').textContent = stats.totalProfit.toFixed(2) + '€';
    
    document.getElementById('overviewStock').textContent = stats.currentStock + ' Stück';
    document.getElementById('overviewSold').textContent = stats.totalSold + ' Stück';
    document.getElementById('overviewRevenue').textContent = stats.totalRevenue.toFixed(2) + '€';
    document.getElementById('overviewProfit').textContent = stats.totalProfit.toFixed(2) + '€';
    
    displayCustomers();
    displaySales();
    displayPayments();
    updateCustomerSelects();
    displayStatistics();
    displayRecentActivity();
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

async function addCustomer() {
    const name = document.getElementById('customerName').value.trim();
    const price = parseFloat(document.getElementById('customerPrice').value);

    if (!name || !price) {
        showToast('Bitte Name und Preis eingeben!', 'error');
        return;
    }

    if (!currentOrder.customers) {
        currentOrder.customers = [];
    }

    const existingCustomer = currentOrder.customers.find(c => c.name === name);
    if (existingCustomer) {
        showToast('Kunde existiert bereits!', 'error');
        return;
    }

    currentOrder.customers.push({
        id: Date.now(),
        name: name,
        pricePerUnit: price
    });

    await saveCurrentOrder();
    displayCustomers();
    updateCustomerSelects();
    
    document.getElementById('customerName').value = '';
    document.getElementById('customerPrice').value = '';
    showToast('Kunde erfolgreich hinzugefügt!', 'success');
}

function displayCustomers() {
    const list = document.getElementById('customersList');
    list.innerHTML = '';

    if (!currentOrder.customers || currentOrder.customers.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>Noch keine Kunden hinzugefügt.</p></div>';
        return;
    }

    currentOrder.customers.forEach(customer => {
        const debt = calculateCustomerDebt(customer);
        const paid = calculateCustomerPaid(customer);
        const outstanding = debt - paid;

        const item = document.createElement('div');
        item.className = 'customer-item';
        item.innerHTML = `
            <div class="customer-info">
                <div class="customer-name">${customer.name}</div>
                <div class="customer-details">
                    <span>Preis: ${customer.pricePerUnit.toFixed(2)}€/Stück</span>
                    <span>Schulden: ${outstanding.toFixed(2)}€</span>
                </div>
            </div>
            <button class="btn btn-danger" onclick="removeCustomer(${customer.id})">Löschen</button>
        `;
        list.appendChild(item);
    });
}

async function removeCustomer(customerId) {
    const customer = currentOrder.customers.find(c => c.id === customerId);
    if (!customer) return;

    showConfirmModal(
        'Kunde löschen',
        `Möchten Sie den Kunden "${customer.name}" wirklich löschen? Alle zugehörigen Verkäufe und Zahlungen werden ebenfalls gelöscht!`,
        async () => {
            currentOrder.customers = currentOrder.customers.filter(c => c.id !== customerId);
            
            if (currentOrder.sales) {
                currentOrder.sales = currentOrder.sales.filter(s => s.customerId !== customerId);
            }
            
            if (currentOrder.payments) {
                currentOrder.payments = currentOrder.payments.filter(p => p.customerId !== customerId);
            }

            await saveCurrentOrder();
            displayCustomers();
            updateCustomerSelects();
            updateOrderDetailDisplay();
            showToast('Kunde erfolgreich gelöscht!', 'success');
        }
    );
}

async function addSale() {
    const customerId = parseInt(document.getElementById('saleCustomer').value);
    const quantity = parseInt(document.getElementById('saleQuantity').value);

    if (!customerId || !quantity) {
        showToast('Bitte Kunde und Anzahl auswählen!', 'error');
        return;
    }

    const customer = currentOrder.customers.find(c => c.id === customerId);
    if (!customer) {
        showToast('Kunde nicht gefunden!', 'error');
        return;
    }

    const stats = calculateOrderStats(currentOrder);
    if (quantity > stats.currentStock) {
        showToast(`Nicht genügend Lagerbestand! Verfügbar: ${stats.currentStock} Stück`, 'error');
        return;
    }

    if (!currentOrder.sales) {
        currentOrder.sales = [];
    }

    currentOrder.sales.push({
        id: Date.now(),
        customerId: customerId,
        customerName: customer.name,
        quantity: quantity,
        pricePerUnit: customer.pricePerUnit,
        totalAmount: quantity * customer.pricePerUnit,
        date: new Date().toISOString()
    });

    await saveCurrentOrder();
    displaySales();
    displayCustomers();
    updateOrderDetailDisplay();
    
    document.getElementById('saleCustomer').value = '';
    document.getElementById('saleQuantity').value = '';
    showToast('Verkauf erfolgreich hinzugefügt!', 'success');
}

function displaySales() {
    const list = document.getElementById('salesList');
    list.innerHTML = '';

    if (!currentOrder.sales || currentOrder.sales.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>Noch keine Verkäufe getätigt.</p></div>';
        return;
    }

    currentOrder.sales.forEach(sale => {
        const item = document.createElement('div');
        item.className = 'sale-item';
        item.innerHTML = `
            <div class="sale-info">
                <div class="sale-customer">${sale.customerName}</div>
                <div class="sale-details">
                    <span>${sale.quantity} Stück × ${sale.pricePerUnit.toFixed(2)}€ = ${sale.totalAmount.toFixed(2)}€</span>
                    <span>${new Date(sale.date).toLocaleDateString()}</span>
                </div>
            </div>
            <button class="btn btn-danger" onclick="removeSale(${sale.id})">Löschen</button>
        `;
        list.appendChild(item);
    });
}

async function removeSale(saleId) {
    const sale = currentOrder.sales.find(s => s.id === saleId);
    if (!sale) return;

    showConfirmModal(
        'Verkauf löschen',
        `Möchten Sie den Verkauf an "${sale.customerName}" wirklich löschen?`,
        async () => {
            currentOrder.sales = currentOrder.sales.filter(s => s.id !== saleId);
            await saveCurrentOrder();
            displaySales();
            displayCustomers();
            updateOrderDetailDisplay();
            showToast('Verkauf erfolgreich gelöscht!', 'success');
        }
    );
}

async function addPayment() {
    const customerId = parseInt(document.getElementById('paymentCustomer').value);
    const amount = parseFloat(document.getElementById('paymentAmount').value);

    if (!customerId || !amount) {
        showToast('Bitte Kunde und Betrag auswählen!', 'error');
        return;
    }

    const customer = currentOrder.customers.find(c => c.id === customerId);
    if (!customer) {
        showToast('Kunde nicht gefunden!', 'error');
        return;
    }

    if (!currentOrder.payments) {
        currentOrder.payments = [];
    }

    currentOrder.payments.push({
        id: Date.now(),
        customerId: customerId,
        customerName: customer.name,
        amount: amount,
        date: new Date().toISOString()
    });

    await saveCurrentOrder();
    displayPayments();
    displayCustomers();
    
    document.getElementById('paymentCustomer').value = '';
    document.getElementById('paymentAmount').value = '';
    showToast('Zahlung erfolgreich hinzugefügt!', 'success');
}

function displayPayments() {
    const list = document.getElementById('paymentsList');
    list.innerHTML = '';

    if (!currentOrder.payments || currentOrder.payments.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>Noch keine Zahlungen erhalten.</p></div>';
        return;
    }

    currentOrder.payments.forEach(payment => {
        const item = document.createElement('div');
        item.className = 'customer-item';
        item.innerHTML = `
            <div class="customer-info">
                <div class="customer-name">${payment.customerName}</div>
                <div class="customer-details">
                    <span>${payment.amount.toFixed(2)}€</span>
                    <span>${new Date(payment.date).toLocaleDateString()}</span>
                </div>
            </div>
            <button class="btn btn-danger" onclick="removePayment(${payment.id})">Löschen</button>
        `;
        list.appendChild(item);
    });
}

async function removePayment(paymentId) {
    const payment = currentOrder.payments.find(p => p.id === paymentId);
    if (!payment) return;

    showConfirmModal(
        'Zahlung löschen',
        `Möchten Sie die Zahlung von "${payment.customerName}" wirklich löschen?`,
        async () => {
            currentOrder.payments = currentOrder.payments.filter(p => p.id !== paymentId);
            await saveCurrentOrder();
            displayPayments();
            displayCustomers();
            showToast('Zahlung erfolgreich gelöscht!', 'success');
        }
    );
}

function updateCustomerSelects() {
    const saleSelect = document.getElementById('saleCustomer');
    const paymentSelect = document.getElementById('paymentCustomer');
    
    saleSelect.innerHTML = '<option value="">Kunde wählen...</option>';
    paymentSelect.innerHTML = '<option value="">Kunde wählen...</option>';
    
    if (!currentOrder.customers) return;
    
    currentOrder.customers.forEach(customer => {
        const option1 = document.createElement('option');
        option1.value = customer.id;
        option1.textContent = customer.name;
        saleSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = customer.id;
        option2.textContent = customer.name;
        paymentSelect.appendChild(option2);
    });
}

function calculateCustomerDebt(customer) {
    if (!currentOrder.sales) return 0;
    return currentOrder.sales
        .filter(sale => sale.customerId === customer.id)
        .reduce((sum, sale) => sum + sale.totalAmount, 0);
}

function calculateCustomerPaid(customer) {
    if (!currentOrder.payments) return 0;
    return currentOrder.payments
        .filter(payment => payment.customerId === customer.id)
        .reduce((sum, payment) => sum + payment.amount, 0);
}

async function saveCurrentOrder() {
    if (!currentOrder || !currentUser) return;
    
    showLoading();
    try {
        const response = await fetch(`${SERVER_URL}/api/orders/${currentOrder.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentOrder)
        });

        if (response.ok) {
            const updatedOrder = await response.json();
            const index = orders.findIndex(o => o.id === currentOrder.id);
            if (index !== -1) {
                orders[index] = updatedOrder;
                currentOrder = updatedOrder;
            }
            displayOrders();
        } else {
            throw new Error('Server-Fehler');
        }
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        showToast('Fehler beim Speichern der Daten', 'error');
    } finally {
        hideLoading();
    }
}

function showConfirmModal(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    document.getElementById('confirmModal').style.display = 'block';
}

function confirmAction() {
    if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
    }
    closeModal('confirmModal');
}

function cancelAction() {
    confirmCallback = null;
    closeModal('confirmModal');
}

async function deleteOrder() {
    if (!currentOrder || (!currentUser.isAdmin && order.created_by !== currentUser.username && 
        !(currentUser.role === 'user' && (order.created_by === 'Tommy' || order.created_by === 'Letezia')))) return;
    
    showConfirmModal(
        'Bestellung löschen',
        `Möchten Sie die Bestellung "${currentOrder.name}" wirklich komplett löschen? Diese Aktion kann nicht rückgängig gemacht werden!`,
        async () => {
            showLoading();
            try {
                const response = await fetch(`${SERVER_URL}/api/orders/${currentOrder.id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    orders = orders.filter(o => o.id !== currentOrder.id);
                    displayOrders();
                    closeModal('orderDetailModal');
                    showToast('Bestellung erfolgreich gelöscht!', 'success');
                } else {
                    throw new Error('Server-Fehler');
                }
            } catch (error) {
                console.error('Fehler beim Löschen:', error);
                showToast('Fehler beim Löschen der Bestellung', 'error');
            } finally {
                hideLoading();
            }
        }
    );
}

async function resetAllData() {
    if (!currentUser.isAdmin) return;
    
    showConfirmModal(
        'ALLE DATEN LÖSCHEN',
        'ACHTUNG: Möchten Sie wirklich ALLE Bestellungen und Daten unwiderruflich löschen? Diese Aktion kann NICHT rückgängig gemacht werden!',
        async () => {
            showLoading();
            try {
                const response = await fetch(`${SERVER_URL}/api/orders/reset-all`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    orders = [];
                    currentOrder = null;
                    displayOrders();
                    closeModal('orderDetailModal');
                    showToast('Alle Daten erfolgreich gelöscht!', 'success');
                } else {
                    throw new Error('Server-Fehler');
                }
            } catch (error) {
                console.error('Fehler beim Zurücksetzen:', error);
                showToast('Fehler beim Löschen aller Daten', 'error');
            } finally {
                hideLoading();
            }
        }
    );
}

function displayStatistics() {
    if (!currentOrder) return;
    
    const stats = calculateOrderStats(currentOrder);
    const statsContainer = document.getElementById('statisticsContent');
    
    statsContainer.innerHTML = `
        <div class="overview-stats">
            <div class="overview-card">
                <div class="overview-icon">📦</div>
                <div class="overview-info">
                    <h4>Lagerbestand</h4>
                    <p>${stats.currentStock} Stück</p>
                </div>
            </div>
            <div class="overview-card">
                <div class="overview-icon">💰</div>
                <div class="overview-info">
                    <h4>Gesamtumsatz</h4>
                    <p>${stats.totalRevenue.toFixed(2)}€</p>
                </div>
            </div>
            <div class="overview-card">
                <div class="overview-icon">📈</div>
                <div class="overview-info">
                    <h4>Gewinn</h4>
                    <p class="${stats.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}">${stats.totalProfit.toFixed(2)}€</p>
                </div>
            </div>
            <div class="overview-card">
                <div class="overview-icon">💳</div>
                <div class="overview-info">
                    <h4>Offene Schulden</h4>
                    <p>${stats.outstandingDebt.toFixed(2)}€</p>
                </div>
            </div>
        </div>
        
        <h4>Kundenübersicht</h4>
        <div class="customers-overview">
            ${currentOrder.customers ? currentOrder.customers.map(customer => {
                const debt = calculateCustomerDebt(customer);
                const paid = calculateCustomerPaid(customer);
                const outstanding = debt - paid;
                
                return `
                    <div class="customer-overview-item">
                        <div class="customer-overview-info">
                            <strong>${customer.name}</strong>
                            <div class="customer-overview-stats">
                                <span>Schulden: ${debt.toFixed(2)}€</span>
                                <span>Bezahlt: ${paid.toFixed(2)}€</span>
                                <span class="${outstanding > 0 ? 'debt-outstanding' : 'debt-paid'}">
                                    Offen: ${outstanding.toFixed(2)}€
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') : '<p>Keine Kunden vorhanden.</p>'}
        </div>
    `;
}

function displayRecentActivity() {
    if (!currentOrder) return;
    
    const activities = [];
    
    if (currentOrder.sales) {
        currentOrder.sales.forEach(sale => {
            activities.push({
                type: 'sale',
                date: new Date(sale.date),
                text: `Verkauf: ${sale.quantity} Stück an ${sale.customerName} für ${sale.totalAmount.toFixed(2)}€`
            });
        });
    }
    
    if (currentOrder.payments) {
        currentOrder.payments.forEach(payment => {
            activities.push({
                type: 'payment',
                date: new Date(payment.date),
                text: `Zahlung: ${payment.amount.toFixed(2)}€ von ${payment.customerName}`
            });
        });
    }
    
    activities.sort((a, b) => b.date - a.date);
    
    const activityContainer = document.getElementById('activityContent');
    
    if (activities.length === 0) {
        activityContainer.innerHTML = '<div class="empty-state"><p>Noch keine Aktivitäten vorhanden.</p></div>';
        return;
    }
    
    activityContainer.innerHTML = `
        <div class="activity-list">
            ${activities.slice(0, 10).map(activity => `
                <div class="activity-item activity-${activity.type}">
                    <div class="activity-icon">${activity.type === 'sale' ? '💰' : '💳'}</div>
                    <div class="activity-content">
                        <div class="activity-text">${activity.text}</div>
                        <div class="activity-date">${activity.date.toLocaleDateString()} ${activity.date.toLocaleTimeString()}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function displayDebts() {
    if (currentUser.role !== 'creator') return;
    
    const debtsList = document.getElementById('debtsList');
    debtsList.innerHTML = '';
    
    const adminOrders = orders.filter(order => order.created_by === 'admin');
    const userDebts = [];
    
    adminOrders.forEach(order => {
        if (order.customers) {
            order.customers.forEach(customer => {
                if (customer.name === currentUser.username) {
                    const debt = calculateCustomerDebt(customer);
                    const paid = calculateCustomerPaid(customer);
                    const outstanding = debt - paid;
                    if (outstanding > 0) {
                        userDebts.push({
                            orderName: order.name,
                            outstanding: outstanding
                        });
                    }
                }
            });
        }
    });
    
    if (userDebts.length === 0) {
        debtsList.innerHTML = '<div class="empty-state"><p>Keine offenen Schulden vorhanden.</p></div>';
        return;
    }
    
    userDebts.forEach(debt => {
        const item = document.createElement('div');
        item.className = 'debt-item';
        item.innerHTML = `
            <div class="debt-info">
                <strong>Bestellung: ${debt.orderName}</strong>
                <div class="debt-amount">Offene Schulden: ${debt.outstanding.toFixed(2)}€</div>
            </div>
        `;
        debtsList.appendChild(item);
    });
}

function showDebts() {
    document.getElementById('ordersContainer').style.display = 'none';
    document.getElementById('debtsSection').style.display = 'block';
}

function showOrders() {
    document.getElementById('ordersContainer').style.display = 'block';
    document.getElementById('debtsSection').style.display = 'none';
}
