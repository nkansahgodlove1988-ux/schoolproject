document.addEventListener('DOMContentLoaded', async () => {
    await DB.init();
    const user = DB.requireAuth('student');
    if (!user) return;
    document.getElementById('currentStudentName').innerText = user.name || 'Student';
    const sRec = DB.findOne('students', { userId: user.id });
    if (sRec) {
        document.getElementById('dashName').innerText = user.name;
        document.getElementById('dashStudId').innerText = sRec.studentId;
        document.getElementById('dashClass').innerText = sRec.className;
        document.getElementById('profName').value = sRec.name;
        document.getElementById('profId').value = sRec.studentId;
        document.getElementById('profClass').value = sRec.className;
        document.getElementById('profGuardian').value = sRec.guardianName || 'N/A';
        document.getElementById('profPhone').value = sRec.guardianPhone || '';
    }
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.section');
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    function closeSidebar() { sidebar.classList.remove('show'); if(overlay) overlay.classList.remove('active'); }
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            const target = item.getAttribute('data-target');
            sections.forEach(sec => { if (sec.id === target) sec.classList.add('active'); else sec.classList.remove('active'); });
            if (window.innerWidth <= 768) closeSidebar();
            if (target === 'dashboard') { loadDashboardData(); loadAttendanceStats(); }
            if (target === 'results') window.loadResults(document.getElementById('resultTermSelect').value);
            if (target === 'fees') loadFeesData();
            if (target === 'timetable') loadTimetables();
            if (target === 'notifications') loadNotifications();
            if (target === 'materials') loadMaterials();
            if (target === 'communication') loadMessages();
            if (target === 'attendance') loadAttendanceHistory();
            if (target === 'library') { loadMyBorrowedBooks(); loadLibraryCatalogue(); }
        });
    });
    if (toggleBtn) toggleBtn.addEventListener('click', () => { sidebar.classList.toggle('show'); if(overlay) overlay.classList.toggle('active'); });
    if(overlay) overlay.addEventListener('click', closeSidebar);
    loadDashboardData(); loadFeesData(); loadAttendanceStats();
    function loadMaterials() {
        const tbody = document.querySelector('#studentMaterialsTable tbody'); if(!tbody) return; tbody.innerHTML = '';
        const sRec = DB.findOne('students', { userId: user.id }); if(!sRec) return;
        const mats = DB.getTable('learning_materials').filter(m => m.className === sRec.className).sort((a,b) => new Date(b.date) - new Date(a.date));
        if(mats.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No materials.</td></tr>'; return; }
        mats.forEach(m => { const tr = document.createElement('tr'); tr.innerHTML = `<td><strong>${m.fileName}</strong><br><small>By ${m.teacherName}</small></td><td>${m.title}</td><td><a href="${m.content}" target="_blank" class="btn btn-primary">Download</a></td>`; tbody.appendChild(tr); });
    }
    const supportForm = document.getElementById('studentSupportForm');
    if(supportForm) {
        supportForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const sRec = DB.findOne('students', { userId: user.id });
            await DB.insert('messages', { senderId: user.id, senderName: user.name, senderRole: 'student', className: sRec ? sRec.className : 'N/A', receiverRole: 'admin', subject: document.getElementById('supSubject').value, body: document.getElementById('supBody').value, date: new Date().toISOString() });
            alert("Request sent!"); supportForm.reset();
        });
    }
    const profForm = document.getElementById('profileForm');
    if(profForm) {
        profForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('profName').value;
            const guardianName = document.getElementById('profGuardian').value;
            const guardianPhone = document.getElementById('profPhone').value;
            const sRec = DB.findOne('students', { userId: user.id });
            if (sRec) {
                await DB.update('students', sRec.id, { name: name, guardianName: guardianName, guardianPhone: guardianPhone });
                await DB.update('users', user.id, { name: name });
                
                // Update local storage so UI updates on refresh
                user.name = name;
                DB.setCurrentUser(user);
                document.getElementById('currentStudentName').innerText = name;
                document.getElementById('dashName').innerText = name;
                alert("Personal details updated successfully!");
            }
        });
    }

    const passForm = document.getElementById('passwordForm');
    if(passForm) {
        passForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const newPass = document.getElementById('studNewPass').value;
            if(!newPass || newPass.length < 6) return alert("Password must be at least 6 characters.");
            await DB.update('users', user.id, { password: newPass });
            alert("Password updated securely!"); 
            document.getElementById('studNewPass').value = '';
        });
    }
    const payForm = document.getElementById('paymentNoticeForm');
    if (payForm) {
        payForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const sRec = DB.findOne('students', { userId: user.id });
            if (sRec) {
                await DB.insert('payments', { studentId: sRec.studentId, amountPaid: parseFloat(document.getElementById('payAmount').value), date: new Date(document.getElementById('payDate').value).toISOString(), receiptNo: document.getElementById('payRef').value, status: 'Pending Verification', recordedBy: 'Student' });
                alert("Notice submitted!"); payForm.reset(); hideModal('paymentModal'); loadFeesData();
            }
        });
    }
});

window.showPaymentModal = function() { window.location.href = 'payment.html'; }

function loadNotifications() {
    const tbody = document.querySelector('#studentNotificationsTable tbody'); if (!tbody) return; tbody.innerHTML = '';
    const sRec = DB.findOne('students', { userId: DB.getCurrentUser().id }); if (!sRec) return;
    const list = DB.getTable('notifications').filter(n => n.student_id === sRec.studentId || !n.student_id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No notifications.</td></tr>'; return; }
    list.forEach(n => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${new Date(n.created_at).toLocaleString()}</td><td><span class="badge badge-active">${n.type.toUpperCase()}</span></td><td>${n.message}</td><td><span class="badge badge-${n.status === 'sent' ? 'active' : 'inactive'}">${n.status}</span></td>`; tbody.appendChild(tr); });
}

window.hideModal = function(id) { document.getElementById(id).classList.remove('active'); }

window.togglePassword = function(inputId, iconId) {
    const input = document.getElementById(inputId), icon = document.getElementById(iconId); if (!input || !icon) return;
    if (input.type === 'password') { input.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash'); }
    else { input.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
}

function loadDashboardData() {
    const list = document.getElementById('announcementList'); if (!list) return; list.innerHTML = '';
    const anns = DB.getTable('announcements').filter(a => a.target === 'all' || a.target === 'students').sort((a, b) => new Date(b.date) - new Date(a.date));
    document.getElementById('statNotices').innerText = anns.length;
    if (anns.length === 0) { list.innerHTML = '<p style="color:#666">No announcements.</p>'; return; }
    anns.slice(0, 3).forEach(a => {
        const div = document.createElement('div'); div.style.padding = '12px 0'; div.style.borderBottom = '1px solid #eee';
        div.innerHTML = `<strong style="color:var(--blue)">${a.title}</strong><p style="margin:5px 0; font-size:0.9rem; color:#444">${a.body}</p><small style="color:#888">${new Date(a.date).toLocaleDateString()}</small>`;
        list.appendChild(div);
    });
}

function loadAttendanceStats() {
    const sRec = DB.findOne('students', { userId: DB.getCurrentUser().id }); if (!sRec) return;
    const recs = DB.getTable('attendance').filter(r => r.studentId === sRec.studentId);
    if (recs.length === 0) { document.getElementById('statAttendance').innerText = '100.0%'; return; }
    const p = recs.filter(r => r.status === 'Present').length, l = recs.filter(r => r.status === 'Late').length;
    document.getElementById('statAttendance').innerText = ((p + (l * 0.5)) / recs.length * 100).toFixed(1) + '%';
}

function loadMessages() {
    const tbody = document.querySelector('#studentMessagesTable tbody'); if(!tbody) return; tbody.innerHTML = '';
    const sRec = DB.findOne('students', { userId: DB.getCurrentUser().id }); if(!sRec) return;
    const list = DB.getTable('messages').filter(m => m.receiverRole === 'all' || m.receiverRole === 'students' || (m.receiverRole === 'parents' && m.className === sRec.className)).sort((a,b) => new Date(b.date) - new Date(a.date));
    if(list.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No messages.</td></tr>'; return; }
    list.forEach(m => { const tr = document.createElement('tr'); tr.innerHTML = `<td><strong>${m.senderName}</strong></td><td>${m.subject}</td><td>${new Date(m.date).toLocaleDateString()}</td><td><button class="btn btn-primary" onclick="viewStudentMessage('${m.id}')">View</button></td>`; tbody.appendChild(tr); });
}

window.viewStudentMessage = function(id) { const m = DB.findById('messages', id); if(m) alert(`FROM: ${m.senderName}\n\nSUBJECT: ${m.subject}\n\n${m.body}`); }

window.loadResults = function(term) {
    const sRec = DB.findOne('students', { userId: DB.getCurrentUser().id }); if (!sRec) return;
    const tbody = document.querySelector('#studentResultsTable tbody'); if (!tbody) return; tbody.innerHTML = '';
    let results = DB.find('results', { studentId: sRec.studentId, term: term, status: 'published' });
    if (results.length === 0) { document.getElementById('resultsContent').style.display = 'none'; document.getElementById('noResultsMsg').style.display = 'block'; return; }
    document.getElementById('resultsContent').style.display = 'block'; document.getElementById('noResultsMsg').style.display = 'none';
    document.getElementById('resName').innerText = sRec.name; document.getElementById('resClass').innerText = sRec.className; document.getElementById('resTerm').innerText = term;
    results.forEach(r => { const g = getGrade(r.total); const tr = document.createElement('tr'); tr.innerHTML = `<td><strong>${r.subject}</strong></td><td>${r.classScore}</td><td>${r.examScore}</td><td><strong>${r.total}</strong></td><td><strong style="color: ${g === 'F' ? 'red' : 'green'}">${g}</strong></td><td>${r.remark || ''}</td>`; tbody.appendChild(tr); });
}

function getGrade(s) { if (s >= 80) return 'A'; if (s >= 70) return 'B'; if (s >= 60) return 'C'; if (s >= 50) return 'D'; if (s >= 40) return 'E'; return 'F'; }

window.downloadPDF = function () {
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Elyon Montessori School", 105, 20, { align: "center" });
    doc.setFontSize(11); doc.text(`Name: ${document.getElementById('resName').innerText}`, 15, 45);
    doc.autoTable({ html: '#studentResultsTable', startY: 55, theme: 'grid' });
    doc.save(`Result.pdf`);
}

function loadFeesData() {
    const sRec = DB.findOne('students', { userId: DB.getCurrentUser().id }); if (!sRec) return;
    const cls = DB.getTable('classes').find(c => c.id === sRec.classId || c.name === sRec.className);
    const billing = (cls ? (cls.tuitionFee || 0) : 0) + (sRec.arrears || 0);
    const payments = DB.find('payments', { studentId: sRec.studentId });
    const paid = payments.reduce((s, p) => s + parseFloat(p.amountPaid), 0);
    if(document.getElementById('studTotalBilled')) document.getElementById('studTotalBilled').innerText = `GHS ${billing.toFixed(2)}`;
    if(document.getElementById('studTotalPaid')) document.getElementById('studTotalPaid').innerText = `GHS ${paid.toFixed(2)}`;
    if(document.getElementById('studBalance')) document.getElementById('studBalance').innerText = `GHS ${(billing - paid).toFixed(2)}`;
    const tbody = document.querySelector('#studentPaymentsTable tbody'); if(!tbody) return; tbody.innerHTML = '';
    if (payments.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No history.</td></tr>'; return; }
    payments.forEach(p => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${new Date(p.date).toLocaleDateString()}</td><td>Tuition</td><td>${parseFloat(p.amountPaid).toFixed(2)}</td><td>${p.receiptNo}</td><td><span class="badge ${p.status === 'Paid' ? 'badge-active' : 'badge-pending'}">${p.status}</span></td>`; tbody.appendChild(tr); });
}

function loadTimetables() {
    const tbody = document.querySelector('#studentTimetableTable tbody'); if (!tbody) return; tbody.innerHTML = '';
    const list = DB.getTable('timetables').filter(tt => tt.target === 'all' || tt.target === 'students').sort((a,b) => new Date(b.date) - new Date(a.date));
    if(list.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No timetables.</td></tr>'; return; }
    list.forEach(tt => { const tr = document.createElement('tr'); tr.innerHTML = `<td><strong>${tt.title}</strong><br><small>${tt.fileName}</small></td><td>${new Date(tt.date).toLocaleDateString()}</td><td><a href="${tt.content}" target="_blank" class="btn btn-primary">View</a></td>`; tbody.appendChild(tr); });
}

function loadAttendanceHistory() {
    const tbody = document.querySelector('#attendanceHistoryTable tbody'); if (!tbody) return; tbody.innerHTML = '';
    const sRec = DB.findOne('students', { userId: DB.getCurrentUser().id }); if (!sRec) return;
    const list = DB.getTable('attendance').filter(r => r.studentId === sRec.studentId).sort((a,b) => new Date(b.date) - new Date(a.date));
    if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No records.</td></tr>'; return; }
    list.forEach(r => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${new Date(r.date).toLocaleDateString()}</td><td><span class="badge ${r.status === 'Present' ? 'badge-active' : (r.status === 'Late' ? 'badge-pending' : 'badge-rejected')}">${r.status}</span></td><td>${r.remark || '--'}</td>`; tbody.appendChild(tr); });
}

function loadMyBorrowedBooks() {
    const tbody = document.querySelector('#myLibraryTable tbody'); if (!tbody) return; tbody.innerHTML = '';
    const user = DB.getCurrentUser();
    const list = DB.getTable('library_issues').filter(i => (i.borrower === user.name || i.borrowerId === user.id) && i.status === 'issued');
    if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No books.</td></tr>'; return; }
    list.forEach(i => { const tr = document.createElement('tr'); tr.innerHTML = `<td><strong>${i.bookTitle}</strong></td><td>${i.issueDate}</td><td>${i.dueDate}</td><td><span class="badge badge-pending">Issued</span></td>`; tbody.appendChild(tr); });
}

window.loadLibraryCatalogue = function() {
    const tbody = document.querySelector('#libraryCatalogueTable tbody'); if (!tbody) return; tbody.innerHTML = '';
    const term = document.getElementById('searchLibrary')?.value.toLowerCase();
    let list = DB.getTable('library_books');
    if (term) list = list.filter(b => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term) || b.category.toLowerCase().includes(term));
    if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No books found.</td></tr>'; return; }
    list.forEach(b => { const tr = document.createElement('tr'); const a = b.availableCopies || 0; tr.innerHTML = `<td><strong>${b.title}</strong></td><td>${b.author}</td><td>${b.category}</td><td><span class="badge ${a > 0 ? 'badge-active' : 'badge-rejected'}">${a > 0 ? 'Available' : 'Out'}</span></td>`; tbody.appendChild(tr); });
}
