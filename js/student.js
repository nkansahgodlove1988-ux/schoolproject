// js/student.js

document.addEventListener('DOMContentLoaded', async () => {
    await DB.init();
    const user = DB.requireAuth('student');
    if (!user) return;

    document.getElementById('currentStudentName').innerText = user.name || 'Student';

    // Fetch student profile
    const studentRec = DB.findOne('students', { userId: user.id });
    if (studentRec) {
        document.getElementById('dashName').innerText = user.name;
        document.getElementById('dashStudId').innerText = studentRec.studentId;
        document.getElementById('dashClass').innerText = studentRec.className;

        // Populate profile page
        document.getElementById('profName').value = studentRec.name;
        document.getElementById('profId').value = studentRec.studentId;
        document.getElementById('profClass').value = studentRec.className;
        document.getElementById('profGuardian').value = studentRec.guardianName || 'N/A';
        document.getElementById('profPhone').value = studentRec.guardianPhone || '';
    }

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
                if (sec.id === target) sec.classList.add('active');
                else sec.classList.remove('active');
            });
            if (window.innerWidth <= 768) closeSidebar();
            if (target === 'dashboard') {
                loadDashboardData();
                loadAttendanceStats();
            }
            if (target === 'results') {
                const termSelect = document.getElementById('resultTermSelect');
                window.loadResults(termSelect.value);
            }
            if (target === 'fees') {
                loadFeesData();
            }
            if (target === 'timetable') loadTimetables();
            if (target === 'materials') loadMaterials();
            if (target === 'communication') loadMessages();
            if (target === 'attendance') loadAttendanceHistory();
            if (target === 'library') {
                loadMyBorrowedBooks();
                loadLibraryCatalogue();
            }
        });
    });

    if (toggleBtn) toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        if(overlay) overlay.classList.toggle('active');
    });

    if(overlay) overlay.addEventListener('click', closeSidebar);

    loadDashboardData();
    loadFeesData(); // Initial load for dashboard stats
    loadAttendanceStats();

    function loadMaterials() {
        const tbody = document.querySelector('#studentMaterialsTable tbody');
        if(!tbody) return;
        tbody.innerHTML = '';

        const studentRec = DB.findOne('students', { userId: user.id });
        if(!studentRec) return;

        const mats = DB.getTable('learning_materials').filter(m => m.className === studentRec.className).sort((a,b) => new Date(b.date) - new Date(a.date));

        if(mats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No materials available for your class yet.</td></tr>';
            return;
        }

        mats.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${m.fileName}</strong><br><small>By ${m.teacherName} on ${new Date(m.date).toLocaleDateString()}</small></td>
                <td>${m.title}</td>
                <td><a href="${m.content}" target="_blank" class="btn btn-primary" style="padding:5px 10px; font-size:0.8rem;">Download</a></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Support Form
    const supportForm = document.getElementById('studentSupportForm');
    if(supportForm) {
        supportForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const subject = document.getElementById('supSubject').value;
            const body = document.getElementById('supBody').value;
            const studentRec = DB.findOne('students', { userId: user.id });

            await DB.insert('messages', {
                senderId: user.id,
                senderName: user.name,
                senderRole: 'student',
                className: studentRec ? studentRec.className : 'N/A',
                receiverRole: 'admin',
                subject,
                body,
                date: new Date().toISOString()
            });

            await DB.logAction('Student: Support Request sent', `Subject: ${subject}`);
            alert("Your request has been sent to administration. We will get back to you soon!");
            supportForm.reset();
        });
    }

    // Profile Password Update
    const profForm = document.getElementById('profileForm');
    if(profForm) {
        profForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const newPass = document.getElementById('studNewPass').value;
            if(!newPass) {
                alert("Please enter a new password if you wish to change it.");
                return;
            }

            await DB.update('users', user.id, { password: newPass });
            await DB.logAction('Student: Password Changed', `User: ${user.name}`);
            alert("Password updated successfully!");
            document.getElementById('studNewPass').value = '';
        });
    }

    // Payment Notice Form
    const payForm = document.getElementById('paymentNoticeForm');
    if (payForm) {
        payForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const amount = document.getElementById('payAmount').value;
            const ref = document.getElementById('payRef').value;
            const date = document.getElementById('payDate').value;
            const studentRec = DB.findOne('students', { userId: user.id });

            if (studentRec) {
                await DB.insert('payments', {
                    studentId: studentRec.studentId,
                    amountPaid: parseFloat(amount),
                    date: new Date(date).toISOString(),
                    receiptNo: ref,
                    status: 'Pending Verification',
                    recordedBy: 'Student'
                });

                await DB.logAction('Submitted Payment Notice', `Amount: ${amount}, Ref: ${ref}`);
                alert("Payment notice submitted successfully! Admin will verify and update your balance.");
                payForm.reset();
                hideModal('paymentModal');
                loadFeesData();
            }
        });
    }
});

window.showPaymentModal = function() {
    document.getElementById('payDate').valueAsDate = new Date();
    document.getElementById('paymentModal').classList.add('active');
}

window.hideModal = function(id) {
    document.getElementById(id).classList.remove('active');
}

window.togglePassword = function(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function loadDashboardData() {
    // Announcements
    const list = document.getElementById('announcementList');
    if (!list) return;
    list.innerHTML = '';
    const anns = DB.getTable('announcements').filter(a => a.target === 'all' || a.target === 'students').sort((a, b) => new Date(b.date) - new Date(a.date));

    document.getElementById('statNotices').innerText = anns.length;

    if (anns.length === 0) {
        list.innerHTML = '<p style="color:#666; padding: 10px 0;">No new announcements.</p>';
        return;
    }

    anns.slice(0, 3).forEach(a => {
        const div = document.createElement('div');
        div.style.padding = '12px 0';
        div.style.borderBottom = '1px solid #eee';
        div.innerHTML = `
            <strong style="color:var(--blue)">${a.title}</strong>
            <p style="margin:5px 0; font-size:0.9rem; color:#444">${a.body}</p>
            <small style="color:#888">${new Date(a.date).toLocaleDateString()} from Admin</small>
        `;
        list.appendChild(div);
    });
}

function loadAttendanceStats() {
    const user = DB.getCurrentUser();
    const studentRec = DB.findOne('students', { userId: user.id });
    if (!studentRec) return;

    const records = DB.getTable('attendance').filter(r => r.studentId === studentRec.studentId);
    if (records.length === 0) {
        document.getElementById('statAttendance').innerText = '100.0%'; // Default for new students
        return;
    }

    const presentDocs = records.filter(r => r.status === 'Present').length;
    const lateDocs = records.filter(r => r.status === 'Late').length;
    const percentage = ((presentDocs + (lateDocs * 0.5)) / records.length * 100).toFixed(1);
    
    document.getElementById('statAttendance').innerText = percentage + '%';
}

function loadMessages() {
    const tbody = document.querySelector('#studentMessagesTable tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    const user = DB.getCurrentUser();
    const studentRec = DB.findOne('students', { userId: user.id });
    if(!studentRec) return;

    const msgs = DB.getTable('messages').filter(m => 
        m.receiverRole === 'all' || 
        m.receiverRole === 'students' || 
        (m.receiverRole === 'parents' && m.className === studentRec.className)
    ).sort((a,b) => new Date(b.date) - new Date(a.date));

    if(msgs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No messages in your inbox.</td></tr>';
        return;
    }

    msgs.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.senderName}</strong><br><small>${m.senderRole.toUpperCase()}</small></td>
            <td>${m.subject}</td>
            <td>${new Date(m.date).toLocaleDateString()}</td>
            <td><button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem;" onclick="viewStudentMessage('${m.id}')">View</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.viewStudentMessage = function(id) {
    const m = DB.findById('messages', id);
    if(m) {
        alert(`FROM: ${m.senderName} (${m.senderRole})\nDATE: ${new Date(m.date).toLocaleString()}\n\nSUBJECT: ${m.subject}\n\n${m.body}`);
    }
}

window.loadResults = function(term) {
    const user = DB.getCurrentUser();
    const studentRec = DB.findOne('students', { userId: user.id });
    if (!studentRec) return;

    const tbody = document.querySelector('#studentResultsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Only show results that have been approved and published by Admin
    let results = DB.find('results', { 
        studentId: studentRec.studentId, 
        term: term, 
        status: 'published' 
    });

    if (results.length === 0) {
        document.getElementById('resultsContent').style.display = 'none';
        document.getElementById('noResultsMsg').style.display = 'block';
        return;
    }

    document.getElementById('resultsContent').style.display = 'block';
    document.getElementById('noResultsMsg').style.display = 'none';

    document.getElementById('resName').innerText = studentRec.name;
    document.getElementById('resClass').innerText = studentRec.className;
    document.getElementById('resTerm').innerText = term;

    results.forEach(r => {
        const grade = getGrade(r.total);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${r.subject}</strong></td>
            <td>${r.classScore}</td>
            <td>${r.examScore}</td>
            <td><strong>${r.total}</strong></td>
            <td><strong style="color: ${grade === 'F' ? 'red' : 'green'}">${grade}</strong></td>
            <td>${r.remark || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

function getGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'E';
    return 'F';
}

window.downloadPDF = function () {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF library is not loaded. Please try again.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 34, 68); // Brand blue
    doc.text("Elyon Montessori School", 105, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text("Terminal Academic Report", 105, 28, { align: "center" });

    // Details
    doc.setFontSize(11);
    const name = document.getElementById('resName').innerText;
    const cls = document.getElementById('resClass').innerText;
    const term = document.getElementById('resTerm').innerText;

    doc.text(`Name: ${name}`, 15, 45);
    doc.text(`Class: ${cls}`, 105, 45);
    doc.text(`Term: ${term}`, 160, 45);

    // Table
    doc.autoTable({
        html: '#studentResultsTable',
        startY: 55,
        theme: 'grid',
        headStyles: { fillColor: [0, 34, 68] },
        styles: { fontSize: 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 20;
    doc.text("Headmaster's Signature: _______________________", 15, finalY);

    // Save
    doc.save(`${name.replace(/\s+/g, '_')}_${term.replace(/\s+/g, '')}_Result.pdf`);
}

function loadFeesData() {
    const user = DB.getCurrentUser();
    const studentRec = DB.findOne('students', { userId: user.id });
    if (!studentRec) return;

    // Get tuition fee from class
    let tuitionFee = 0;
    const cls = DB.getTable('classes').find(c => c.id === studentRec.classId || c.name === studentRec.className);
    if (cls && cls.tuitionFee) {
        tuitionFee = cls.tuitionFee;
    }

    const payments = DB.find('payments', { studentId: studentRec.studentId });
    const tbody = document.querySelector('#studentPaymentsTable tbody');
    
    // Summary
    const totalBilled = tuitionFee + (studentRec.arrears || 0);
    let totalPaid = 0;
    payments.forEach(p => totalPaid += parseFloat(p.amountPaid));
    const balance = totalBilled - totalPaid;

    if(document.getElementById('studTotalBilled')) document.getElementById('studTotalBilled').innerText = `GHS ${totalBilled.toFixed(2)}`;
    if(document.getElementById('studTotalPaid')) document.getElementById('studTotalPaid').innerText = `GHS ${totalPaid.toFixed(2)}`;
    if(document.getElementById('studBalance')) document.getElementById('studBalance').innerText = `GHS ${balance.toFixed(2)}`;
    
    // Dashboard Stat
    if(document.getElementById('statBalance')) document.getElementById('statBalance').innerText = `GHS ${balance.toFixed(2)}`;

    if(!tbody) return;
    tbody.innerHTML = '';

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No payment history found.</td></tr>';
        return;
    }

    payments.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(p.date).toLocaleDateString()}</td>
            <td>Tuition/School Fees Payment</td>
            <td>${parseFloat(p.amountPaid).toFixed(2)}</td>
            <td>${p.receiptNo}</td>
            <td><span class="badge ${p.status === 'Paid' ? 'badge-active' : 'badge-pending'}">${p.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function loadTimetables() {
    const tbody = document.querySelector('#studentTimetableTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Filter for all users or students only
    const tts = DB.getTable('timetables').filter(tt => tt.target === 'all' || tt.target === 'students').sort((a,b) => new Date(b.date) - new Date(a.date));

    if(tts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No timetables published for students yet.</td></tr>';
        return;
    }

    tts.forEach(tt => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${tt.title}</strong><br><small>${tt.fileName}</small></td>
            <td>${new Date(tt.date).toLocaleDateString()}</td>
            <td>
                <a href="${tt.content}" target="_blank" class="btn btn-primary" style="text-decoration:none; padding:5px 10px;">View PDF</a>
                <a href="${tt.content}" download="${tt.fileName}" class="btn btn-success" style="text-decoration:none; padding:5px 10px; margin-left:5px;"><i class="fas fa-download"></i></a>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
function loadAttendanceHistory() {
    const tbody = document.querySelector('#attendanceHistoryTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const user = DB.getCurrentUser();
    const studentRec = DB.findOne('students', { userId: user.id });
    if (!studentRec) return;

    const records = DB.getTable('attendance')
        .filter(r => r.studentId === studentRec.studentId)
        .sort((a,b) => new Date(b.date) - new Date(a.date));

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No attendance records found yet.</td></tr>';
        return;
    }

    records.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(r.date).toLocaleDateString()}</td>
            <td><span class="badge ${r.status === 'Present' ? 'badge-active' : (r.status === 'Late' ? 'badge-pending' : 'badge-rejected')}">${r.status}</span></td>
            <td>${r.remark || '--'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function loadMyBorrowedBooks() {
    const tbody = document.querySelector('#myLibraryTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const user = DB.getCurrentUser();
    
    // In our library system, borrower name is used (could be improved by ID)
    const issues = DB.getTable('library_issues').filter(i => 
        (i.borrower === user.name || i.borrowerId === user.id) && i.status === 'issued'
    );

    if (issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">You currently have no borrowed books.</td></tr>';
        return;
    }

    issues.forEach(i => {
        const today = new Date().toISOString().split('T')[0];
        const overdue = i.dueDate < today;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${i.bookTitle}</strong></td>
            <td>${i.issueDate}</td>
            <td style="${overdue ? 'color:red; font-weight:bold;' : ''}">${i.dueDate}</td>
            <td><span class="badge ${overdue ? 'badge-rejected' : 'badge-pending'}">${overdue ? 'Overdue' : 'Issued'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

window.loadLibraryCatalogue = function() {
    const tbody = document.querySelector('#libraryCatalogueTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = document.getElementById('searchLibrary')?.value.toLowerCase();
    let books = DB.getTable('library_books');

    if (searchTerm) {
        books = books.filter(b => 
            b.title.toLowerCase().includes(searchTerm) || 
            b.author.toLowerCase().includes(searchTerm) || 
            b.category.toLowerCase().includes(searchTerm)
        );
    }

    if (books.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No books found matching your search.</td></tr>';
        return;
    }

    books.forEach(b => {
        const tr = document.createElement('tr');
        const avail = b.availableCopies || 0;
        tr.innerHTML = `
            <td><strong>${b.title}</strong></td>
            <td>${b.author}</td>
            <td>${b.category}</td>
            <td><span class="badge ${avail > 0 ? 'badge-active' : 'badge-rejected'}">${avail > 0 ? 'Available' : 'Out of Stock'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}
