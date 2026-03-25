document.addEventListener('DOMContentLoaded', async () => {
    await DB.init();
    const user = DB.requireAuth('parent');
    if (!user) return;

    document.getElementById('currentParentName').innerText = user.name || 'Parent';

    const ward = DB.getWardByParent(user);
    if (!ward) {
        alert("System linking in progress. Please contact the school to link your ward to your portal.");
    } else {
        document.getElementById('dashParentName').innerText = user.name;
        document.getElementById('wardName').innerText = ward.name;
        loadDashboardData(ward);
        loadWardProfile(ward);
    }

    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.section');
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            
            sections.forEach(sec => {
                if (sec.id === target) sec.classList.add('active');
                else sec.classList.remove('active');
            });

            if (ward) loadSectionData(target, ward);
            if (window.innerWidth <= 768) sidebar.classList.remove('show');
        });
    });

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => sidebar.classList.toggle('show'));
    }

    // Messaging Logic
    const msgForm = document.getElementById('parentMsgForm');
    if (msgForm) {
        msgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const to = document.getElementById('pMsgTo').value;
            const subject = document.getElementById('pMsgSubject').value;
            const body = document.getElementById('pMsgBody').value;

            await DB.insert('messages', {
                senderId: user.id,
                senderName: user.name,
                senderRole: 'parent',
                receiverRole: to,
                subject,
                body,
                date: new Date().toISOString()
            });

            alert('Your message has been sent successfully!');
            msgForm.reset();
            loadMessages();
        });
    }
});

function loadSectionData(section, ward) {
    if (section === 'dashboard') loadDashboardData(ward);
    else if (section === 'ward-profile') loadWardProfile(ward);
    else if (section === 'performance') loadPerformance(ward);
    else if (section === 'fees') loadFees(ward);
    else if (section === 'attendance') loadAttendance(ward);
    else if (section === 'communication') loadMessages();
}

function loadDashboardData(ward) {
    const debt = DB.calculateStudentDebt(ward);
    document.getElementById('wardBalance').innerText = `GHS ${debt.toFixed(2)}`;
    
    const records = DB.getTable('attendance').filter(r => r.studentId == ward.studentId || r.student_id == ward.student_id).sort((a,b) => new Date(b.date) - new Date(a.date));
    document.getElementById('lastAttendance').innerText = records.length > 0 ? records[0].status : 'N/A';
    
    // Notifications/Notices Summary
    const list = document.getElementById('schoolNotices');
    if (list) {
        list.innerHTML = '';
        const anns = DB.getTable('announcements').filter(a => a.target === 'all' || a.target === 'parents').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
        anns.forEach(a => {
            const div = document.createElement('div');
            div.style.padding = '10px 0';
            div.style.borderBottom = '1px solid #eee';
            div.innerHTML = `<strong>${a.title}</strong><br><small style="color:#666">${a.body.substring(0, 80)}...</small>`;
            list.appendChild(div);
        });
    }
}

function loadWardProfile(ward) {
    const view = document.getElementById('wardDetails');
    if (!view) return;
    view.innerHTML = `
        <div><strong>Name:</strong> ${ward.name}</div>
        <div><strong>Student ID:</strong> ${ward.studentId || ward.student_id}</div>
        <div><strong>Current Class:</strong> ${ward.className || 'Unassigned'}</div>
        <div><strong>Status:</strong> <span class="badge badge-${ward.status === 'active' ? 'active' : 'inactive'}">${ward.status}</span></div>
    `;
}

function loadFees(ward) {
    const debt = DB.calculateStudentDebt(ward);
    document.getElementById('pTotalBalance').innerText = `GHS ${debt.toFixed(2)}`;
    
    const payments = DB.getTable('payments').filter(p => p.studentId == ward.studentId || p.student_id == ward.student_id).sort((a,b) => new Date(b.date) - new Date(a.date));
    const totalPaid = payments.filter(p => p.status === 'success' || p.status === 'Paid').reduce((sum, p) => sum + parseFloat(p.amount_paid || p.amountPaid), 0);
    document.getElementById('pTotalPaid').innerText = `GHS ${totalPaid.toFixed(2)}`;

    const tbody = document.querySelector('#parentPaymentsTable tbody');
    tbody.innerHTML = '';
    payments.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(p.date || p.date_paid).toLocaleDateString()}</td>
            <td>Tuition/Ward Fees</td>
            <td>GHS ${parseFloat(p.amount_paid || p.amountPaid).toFixed(2)}</td>
            <td><span class="badge badge-${p.status === 'success' || p.status === 'Paid' ? 'active' : 'pending'}">${p.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function loadPerformance(ward) {
    const content = document.getElementById('performanceContent');
    const results = DB.getTable('results').filter(r => r.studentId == ward.studentId || r.student_id == ward.studentId);
    
    if (results.length === 0) {
        content.innerHTML = '<p style="padding:40px; text-align:center; color:#888;">No academic reports published yet.</p>';
        return;
    }

    content.innerHTML = `<table class="table"><thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Remarks</th></tr></thead><tbody>`;
    results.forEach(r => {
        content.querySelector('tbody').innerHTML += `
            <tr>
                <td>${r.subject}</td>
                <td>${r.total}</td>
                <td><strong style="color:var(--blue)">${getGrade(r.total)}</strong></td>
                <td><small>${r.remark || '--'}</small></td>
            </tr>`;
    });
}

function loadAttendance(ward) {
    const tbody = document.querySelector('#parentAttendanceTable tbody');
    tbody.innerHTML = '';
    const records = DB.getTable('attendance').filter(r => r.studentId == ward.studentId || r.student_id == ward.student_id).sort((a,b) => new Date(b.date) - new Date(a.date));
    records.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(r.date).toLocaleDateString()}</td>
            <td><span class="badge badge-${r.status === 'Present' ? 'active' : 'inactive'}">${r.status}</span></td>
            <td><small>${r.remark || '--'}</small></td>
        `;
        tbody.appendChild(tr);
    });
}

function loadMessages() {
    const user = DB.getCurrentUser();
    const list = document.getElementById('parentMessageList');
    list.innerHTML = '';
    const msgs = DB.getTable('messages').filter(m => m.senderId == user.id || m.receiverRole === 'parents').sort((a,b) => new Date(b.date) - new Date(a.date));
    msgs.forEach(m => {
        const div = document.createElement('div');
        div.style.padding = '10px';
        div.style.borderBottom = '1px solid #eee';
        div.innerHTML = `<strong>${m.subject}</strong><br><small style="color:#666">${m.body}</small><br><small style="color:#888">${new Date(m.date).toLocaleDateString()}</small>`;
        list.appendChild(div);
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
