// js/finance.js

document.addEventListener('DOMContentLoaded', async () => {
    await DB.init();
    const user = DB.requireAuth('finance');
    if (!user) return;
    
    document.getElementById('currentFinanceName').innerText = user.name || 'Accountant';
    
    // Initial Load
    loadFinanceDashboard();
    
    // Sidebar Navigation
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.section');
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function closeSidebar() {
        sidebar.classList.remove('show');
        if(overlay) overlay.classList.remove('active');
    }

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            const target = item.getAttribute('data-target');
            sections.forEach(sec => {
                if(sec.id === target) sec.classList.add('active');
                else sec.classList.remove('active');
            });
            if(window.innerWidth <= 768) closeSidebar();
            
            // Section specific loaders
            if (target === 'dashboard') loadFinanceDashboard();
            else if (target === 'fees') loadFees();
            else if (target === 'arrears') loadArrears();
            else if (target === 'expenses') loadExpenses();
            else if (target === 'salaries') loadSalaries();
            else if (target === 'reports') loadReports();
            else if (target === 'messages') loadMessages();
        });
    });

    if(toggleBtn) toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        if(overlay) overlay.classList.toggle('active');
    });

    if(overlay) overlay.addEventListener('click', closeSidebar);

    // Setup Form Listeners
    setupFinanceForms();
});

// ---------------- DASHBOARD ---------------- //
let financeChart = null;

function loadFinanceDashboard() {
    const payments = DB.getTable('payments');
    const expenses = DB.getTable('expenses');
    const students = DB.getTable('students');
    const classes = DB.getTable('classes');

    // Stats
    let totalRevenue = payments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
    let totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    let totalArrears = 0;
    students.forEach(s => {
        const cls = classes.find(c => c.id === s.classId || c.name === s.className);
        const tuition = cls ? (cls.tuitionFee || 0) : 0;
        const billed = tuition + (s.arrears || 0);
        const paid = payments.filter(p => p.studentId === s.studentId).reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
        const bal = billed - paid;
        if (bal > 0) totalArrears += bal;
    });

    document.getElementById('statRevenue').innerText = `GHS ${totalRevenue.toFixed(2)}`;
    document.getElementById('statExpenses').innerText = `GHS ${totalExpenses.toFixed(2)}`;
    document.getElementById('statNet').innerText = `GHS ${(totalRevenue - totalExpenses).toFixed(2)}`;
    document.getElementById('statArrears').innerText = `GHS ${totalArrears.toFixed(2)}`;

    // Build Chart (Simplified Mockup Data for visualization)
    buildFinanceChart(payments, expenses);

    // Recent Transactions
    const combined = [
        ...payments.map(p => ({ date: p.date, ref: p.receiptNo, type: 'Income', amount: p.amountPaid, color: 'var(--success)' })),
        ...expenses.map(e => ({ date: e.createdAt, ref: e.reference || 'EXP', type: 'Expense', amount: e.amount, color: 'var(--danger)' }))
    ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    const tbody = document.getElementById('recentTransactions');
    tbody.innerHTML = '';
    combined.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(t.date).toLocaleDateString()}</td>
            <td>${t.ref}</td>
            <td style="color:${t.color}; font-weight:bold;">${t.type}</td>
            <td>GHS ${parseFloat(t.amount).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function buildFinanceChart(payments, expenses) {
    const ctx = document.getElementById('financeChart');
    if (!ctx) return;

    if (financeChart) financeChart.destroy();

    // Grouping by Month (Past 6 months)
    const months = [];
    const revData = [];
    const expData = [];
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthYear = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        months.push(monthYear);
        
        const m = d.getMonth();
        const y = d.getFullYear();

        const monthRev = payments.filter(p => {
            const date = new Date(p.date);
            return date.getMonth() === m && date.getFullYear() === y;
        }).reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);

        const monthExp = expenses.filter(e => {
            const date = new Date(e.createdAt);
            return date.getMonth() === m && date.getFullYear() === y;
        }).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        revData.push(monthRev);
        expData.push(monthExp);
    }

    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Revenue',
                    data: revData,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Expenses',
                    data: expData,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ---------------- STUDENT FEES ---------------- //
function loadFees() {
    const tbody = document.querySelector('#feesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = document.getElementById('searchFeeStudent').value.toLowerCase();
    const classFilter = document.getElementById('filterFeeClass').value;

    const students = DB.getTable('students');
    const payments = DB.getTable('payments');
    const classes = DB.getTable('classes');

    // Init Class Filter
    const filterSel = document.getElementById('filterFeeClass');
    if (filterSel.options.length === 1) {
        classes.forEach(c => filterSel.add(new Option(c.name, c.id)));
    }

    let filtered = students;
    if (searchTerm) filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm) || s.studentId.toLowerCase().includes(searchTerm));
    if (classFilter !== 'all') filtered = filtered.filter(s => s.classId === classFilter || s.className === classFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No students found.</td></tr>';
        return;
    }

    filtered.forEach(s => {
        const cls = classes.find(c => c.id === s.classId || c.name === s.className);
        const tuition = cls ? (cls.tuitionFee || 0) : 0;
        const totalArrears = s.arrears || 0;
        const bill = tuition + totalArrears;

        const paid = payments.filter(p => p.studentId === s.studentId).reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
        const balance = bill - paid;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.name}</strong><br><small>${s.studentId}</small></td>
            <td>${s.className}</td>
            <td>GHS ${bill.toFixed(2)}</td>
            <td>GHS ${paid.toFixed(2)}</td>
            <td style="color:${balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight:bold;">GHS ${balance.toFixed(2)}</td>
            <td><span class="badge badge-${balance <= 0 ? 'active' : 'pending'}">${balance <= 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Owed')}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-primary" onclick="window.viewFeeHistory('${s.studentId}')">History</button>
                    <button class="btn btn-success" onclick="window.recordDirectPayment('${s.studentId}')"><i class="fas fa-plus"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.viewFeeHistory = function(studId) {
    const p = DB.find('payments', { studentId: studId });
    if (p.length === 0) { alert('No payments found for this student.'); return; }
    let msg = `Payment History for ${studId}:\n\n`;
    p.forEach(x => msg += `${new Date(x.date).toLocaleDateString()} - Receipt ${x.receiptNo}: GHS ${parseFloat(x.amountPaid).toFixed(2)}\n`);
    alert(msg);
}

window.recordDirectPayment = function(studId) {
    document.getElementById('pStudent').value = studId;
    showModal('paymentModal');
}

// ---------------- ARREARS ---------------- //
function loadArrears() {
    const tbody = document.querySelector('#debtorsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const students = DB.getTable('students');
    const payments = DB.getTable('payments');
    const classes = DB.getTable('classes');

    let debtorList = [];
    students.forEach(s => {
        const cls = classes.find(c => c.id === s.classId || c.name === s.className);
        const tuition = cls ? (cls.tuitionFee || 0) : 0;
        const bill = tuition + (s.arrears || 0);
        const paid = payments.filter(p => p.studentId === s.studentId).reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
        const bal = bill - paid;

        if (bal > 0) {
            debtorList.push({ ...s, debt: bal });
        }
    });

    if (debtorList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Zero debtors! All fees are cleared.</td></tr>';
        return;
    }

    debtorList.sort((a,b) => b.debt - a.debt).forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.name}</strong></td>
            <td>${s.studentId}</td>
            <td>${s.className}</td>
            <td style="color:var(--danger); font-weight:bold;">GHS ${s.debt.toFixed(2)}</td>
            <td>${s.guardianPhone || 'N/A'}</td>
            <td><button class="btn btn-primary" onclick="alert('Sending Reminder... SMS API placeholder')">Remind</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// ---------------- OPERATIONAL EXPENSES ---------------- //
function loadExpenses() {
    const tbody = document.querySelector('#expensesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const expenses = DB.getTable('expenses').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No expenses recorded yet.</td></tr>';
        return;
    }

    expenses.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(e.createdAt).toLocaleDateString()}</td>
            <td><span class="badge badge-inactive">${e.category}</span></td>
            <td>${e.description}</td>
            <td>${e.reference || '--'}</td>
            <td style="font-weight:bold;">${parseFloat(e.amount).toFixed(2)}</td>
            <td><button class="btn btn-danger" onclick="DB.delete('expenses', '${e.id}'); loadExpenses();"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

// ---------------- SALARIES ---------------- //
function loadSalaries() {
    const tbody = document.querySelector('#salaryTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const staff = [
        ...DB.getTable('teachers').map(t => ({ id: t.id, name: t.name, role: 'Teacher', salary: 1500 })),
        ...DB.getTable('users').filter(u => u.role === 'admin' || u.role === 'finance').map(u => ({ id: u.id, name: u.name, role: u.role.toUpperCase(), salary: 2500 }))
    ];

    staff.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.name}</strong></td>
            <td>${s.role}</td>
            <td>GHS ${s.salary.toFixed(2)}</td>
            <td>--</td>
            <td><span class="badge badge-inactive">Unpaid (Month)</span></td>
            <td><button class="btn btn-success" onclick="alert('Salary Payment API placeholder for ${s.name}')">Pay Salary</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// ---------------- MESSAGES ---------------- //
function loadMessages() {
    const tbody = document.querySelector('#inboxTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const user = DB.getCurrentUser();
    
    const msgs = DB.getTable('messages').filter(m => m.receiverRole === 'finance' || m.receiverRole === 'all')
                .sort((a,b) => new Date(b.date) - new Date(a.date));

    if (msgs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No messages received.</td></tr>';
        return;
    }

    msgs.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.senderName}</strong></td>
            <td>${m.subject}</td>
            <td>${new Date(m.date).toLocaleDateString()}</td>
            <td><button class="btn btn-primary" onclick="alert('${m.body}')">View</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// ---------------- FORMS SETUP ---------------- //
function setupFinanceForms() {
    // Payment Form
    const payForm = document.getElementById('formRecordPayment');
    if (payForm) {
        // Build Student Dropdown
        const sSel = document.getElementById('pStudent');
        DB.getTable('students').forEach(s => sSel.add(new Option(`${s.name} (${s.studentId})`, s.studentId)));

        payForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const studId = document.getElementById('pStudent').value;
            const amount = document.getElementById('pAmount').value;
            const receipt = document.getElementById('pReceipt').value;
            const status = document.getElementById('pStatus').value;

            DB.insert('payments', {
                studentId: studId,
                amountPaid: amount,
                receiptNo: receipt,
                status: status,
                date: new Date().toISOString()
            });

            DB.logAction('Finance: Payment Recorded', `Student: ${studId}, Amount: ${amount}`);
            alert('Student payment recorded successfully!');
            hideModal('paymentModal');
            payForm.reset();
            if (document.getElementById('fees').classList.contains('active')) loadFees();
            else loadFinanceDashboard();
        });
    }

    // Expense Form
    const expForm = document.getElementById('formRecordExpense');
    if (expForm) {
        expForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const cat = document.getElementById('expCategory').value;
            const desc = document.getElementById('expDesc').value;
            const amt = document.getElementById('expAmount').value;
            const ref = document.getElementById('expRef').value;

            DB.insert('expenses', {
                category: cat,
                description: desc,
                amount: amt,
                reference: ref
            });

            DB.logAction('Finance: Expense Recorded', `Category: ${cat}, Amount: ${amt}`);
            alert('School expense logged successfully!');
            hideModal('expenseModal');
            expForm.reset();
            if (document.getElementById('expenses').classList.contains('active')) loadExpenses();
            else loadFinanceDashboard();
        });
    }
}

// ---------------- MODAL HELPERS ---------------- //
window.showModal = (id) => document.getElementById(id).classList.add('active');
window.hideModal = (id) => document.getElementById(id).classList.remove('active');

// ---------------- REPORT GENERATION ---------------- //
window.exportDebtorsPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const students = DB.getTable('students');
    const classes = DB.getTable('classes');
    const payments = DB.getTable('payments');

    doc.setFontSize(18);
    doc.text("Elyon Montessori School - Debtors List", 14, 20);
    doc.setFontSize(10);
    doc.text("Generated on: " + new Date().toLocaleString(), 14, 30);

    const rows = [];
    students.forEach(s => {
        const cls = classes.find(c => c.id === s.classId || c.name === s.className);
        const bill = (cls ? cls.tuitionFee : 0) + (s.arrears || 0);
        const paid = payments.filter(p => p.studentId === s.studentId).reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
        const bal = bill - paid;
        if (bal > 0) {
            rows.push([s.name, s.studentId, s.className, bal.toFixed(2), s.guardianPhone]);
        }
    });

    doc.autoTable({
        startY: 35,
        head: [['Student Name', 'ID', 'Class', 'Debt (GHS)', 'Guardian Ph.']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [231, 76, 60] }
    });

    doc.save('School_Debtors_List.pdf');
}

window.generatePnLReport = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const payments = DB.getTable('payments');
    const expenses = DB.getTable('expenses');

    doc.setFontSize(22);
    doc.setTextColor(0, 51, 102);
    doc.text("INCOME STATEMENT", 105, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Elyon Montessori School", 105, 32, { align: 'center' });
    doc.text(`Period: ${new Date().toLocaleDateString()}`, 105, 38, { align: 'center' });

    let totalInc = payments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
    let totalExp = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    doc.autoTable({
        startY: 50,
        head: [['REVENUE/INCOME', 'AMOUNT (GHS)']],
        body: [['Fee Collections / Tuition', totalInc.toFixed(2)], ['Other Income', '0.00']],
        foot: [['TOTAL REVENUE', totalInc.toFixed(2)]],
        theme: 'grid',
        footStyles: { fillColor: [40, 167, 69] }
    });

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['EXPENDITURE', 'AMOUNT (GHS)']],
        body: expenses.map(e => [e.description, parseFloat(e.amount).toFixed(2)]),
        foot: [['TOTAL EXPENDITURE', totalExp.toFixed(2)]],
        theme: 'grid',
        footStyles: { fillColor: [231, 76, 60] }
    });

    const net = totalInc - totalExp;
    doc.setFontSize(14);
    doc.setTextColor(net >= 0 ? 40 : 200, net >= 0 ? 167 : 0, net >= 0 ? 69 : 0);
    doc.text(`NET PROFIT / LOSS: GHS ${net.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 15);

    doc.save('Income_Statement.pdf');
}

window.generateRevenueReport = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const payments = DB.getTable('payments');
    
    doc.text("Revenue Breakdown", 14, 20);
    doc.autoTable({
        startY: 25,
        head: [['Date', 'Receipt #', 'Student ID', 'Amount (GHS)']],
        body: payments.map(p => [new Date(p.date).toLocaleDateString(), p.receiptNo, p.studentId, p.amountPaid]),
        foot: [['', '', 'TOTAL', payments.reduce((s,p)=>s+parseFloat(p.amountPaid),0).toFixed(2)]]
    });
    doc.save('Revenue_Report.pdf');
}
