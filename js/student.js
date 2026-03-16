// js/student.js

document.addEventListener('DOMContentLoaded', () => {
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
            if (target === 'dashboard') loadDashboardData();
            if (target === 'results') {
                const termSelect = document.getElementById('resultTermSelect');
                window.loadResults(termSelect.value);
            }
            if (target === 'fees') {
                loadFeesData();
            }
            if (target === 'timetable') loadTimetables();
        });
    });

    if (toggleBtn) toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        if(overlay) overlay.classList.toggle('active');
    });

    if(overlay) overlay.addEventListener('click', closeSidebar);

    loadDashboardData();
    loadFeesData(); // Initial load for dashboard stats
});

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

window.loadResults = function (term) {
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
