document.addEventListener('DOMContentLoaded', async () => {
    await DB.init();
    const user = DB.requireAuth('admin');
    if (!user) return;

    document.getElementById('currentAdminName').innerText = user.name || 'Administrator';

    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.section');
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function closeSidebar() {
        sidebar.classList.remove('show');
        if (overlay) overlay.classList.remove('active');
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
            loadSectionData(target);
        });
    });

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('show');
            if (overlay) overlay.classList.toggle('active');
        });
    }

    if (overlay) overlay.addEventListener('click', closeSidebar);

    setupForms();
    document.getElementById('searchStudent')?.addEventListener('input', () => loadStudents());
    document.getElementById('filterStudentClass')?.addEventListener('change', () => loadStudents());
    document.getElementById('searchAdmissions')?.addEventListener('input', () => loadAdmissions());
    document.getElementById('searchTeachers')?.addEventListener('input', () => loadTeachers());

    loadSectionData('dashboard');
});

window.showModal = function (id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (id === 'studentModal') {
        const classSelect = document.getElementById('sClass');
        if (classSelect) {
            classSelect.innerHTML = '<option value="">Select Class</option>';
            DB.getTable('classes').forEach(c => classSelect.add(new Option(c.name, c.id)));
        }
    } else if (id === 'setFeesModal') {
        const classSelect = document.getElementById('feeClassId');
        if (classSelect) {
            classSelect.innerHTML = '<option value="">Select Class</option>';
            DB.getTable('classes').forEach(c => {
                const feeText = c.tuitionFee ? ` (Current: GHS ${c.tuitionFee})` : '';
                classSelect.add(new Option(c.name + feeText, c.id));
            });
        }
    } else if (id === 'paymentModal') {
        const studentSelect = document.getElementById('pStudent');
        if (studentSelect) {
            studentSelect.innerHTML = '<option value="">Select Student</option>';
            DB.getTable('students').forEach(s => studentSelect.add(new Option(`${s.name} (${s.studentId})`, s.studentId)));
        }
    } else if (id === 'expenseModal') {
        document.getElementById('expDate').valueAsDate = new Date();
        document.getElementById('expId').value = '';
        document.getElementById('formRecordExpense').reset();
    } else if (id === 'subjectModal') {
        const clsSel = document.getElementById('subjClassId');
        if (clsSel) {
            clsSel.innerHTML = '<option value="">All Classes / General</option>';
            DB.getTable('classes').forEach(c => clsSel.add(new Option(c.name, c.id)));
        }
    }
    modal.classList.add('active');
}

window.hideModal = function (id) { document.getElementById(id).classList.remove('active'); }

function loadSectionData(section) {
    if (section === 'dashboard') loadDashboard();
    else if (section === 'teachers') loadTeachers();
    else if (section === 'classes') loadClasses();
    else if (section === 'admissions') loadAdmissions();
    else if (section === 'students') loadStudents();
    else if (section === 'fees') loadFees();
    else if (section === 'expenses') loadExpenses();
    else if (section === 'announcements') loadAnnouncements();
    else if (section === 'results') loadResults();
    else if (section === 'timetable') loadTimetables();
    else if (section === 'attendance') loadAttendance();
    else if (section === 'communication') loadMessages();
    else if (section === 'users') loadUsers();
    else if (section === 'subjects') loadSubjects();
    else if (section === 'library') loadLibrary();
    else if (section === 'terms') loadTerms();
}

function togglePassword(inputId, iconId) {
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

function setupForms() {
    const teacherForm = document.getElementById('formAddTeacher');
    if (teacherForm) {
        teacherForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('tName').value;
            const phone = document.getElementById('tPhone').value;
            const password = document.getElementById('tPassword').value;
            const teacherId = DB.generateUniqueId('TCH', 'teachers');
            const newUser = await DB.insert('users', { username: teacherId, password, role: 'teacher', name, status: 'active' });
            if (newUser) {
                await DB.insert('teachers', { user_id: newUser.id, teacher_id: teacherId, name, phone, status: 'active' });
            }
            await DB.logAction('Created Teacher', `Name: ${name}, ID: ${teacherId}`);
            hideModal('teacherModal');
            teacherForm.reset();
            loadTeachers();
        });
    }

    const classForm = document.getElementById('formAddClass');
    if (classForm) {
        classForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('cName').value;
            await DB.insert('classes', { name });
            await DB.logAction('Created Class', `Name: ${name}`);
            hideModal('classModal');
            classForm.reset();
            loadClasses();
        });
    }

    const annForm = document.getElementById('announcementForm');
    if (annForm) {
        annForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('annTitle').value;
            const target = document.getElementById('annTarget').value;
            const body = document.getElementById('annBody').value;
            const user = DB.getCurrentUser();
            await DB.insert('announcements', { title, target, body, author: user.name, date: new Date().toISOString() });
            annForm.reset();
            loadAnnouncements();
        });
    }

    const adminMsgForm = document.getElementById('adminMsgForm');
    if (adminMsgForm) {
        adminMsgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const to = document.getElementById('admMsgTo').value;
            const subject = document.getElementById('admMsgSubject').value;
            const body = document.getElementById('admMsgBody').value;
            const user = DB.getCurrentUser();
            await DB.insert('messages', { senderId: user.id, senderName: user.name, senderRole: 'admin', receiverRole: to, subject, body, date: new Date().toISOString() });
            await DB.logAction('Sent System Message', `To: ${to}, Subject: ${subject}`);
            DB.showToast('Your message has been sent to the system!');
            adminMsgForm.reset();
        });
    }

    const studentForm = document.getElementById('formAddStudent');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('sName').value;
            const classId = document.getElementById('sClass').value;
            const className = document.getElementById('sClass').options[document.getElementById('sClass').selectedIndex].text;
            const gender = document.getElementById('sGender').value;
            const sEmail = document.getElementById('sEmail').value;
            const sPhone = document.getElementById('sPhone').value;
            const gName = document.getElementById('sGName').value;
            const gEmail = document.getElementById('sGEmail').value;
            const gPhone = document.getElementById('sGPhone').value;
            const arrears = document.getElementById('sArrears').value;
            const studentId = DB.generateUniqueId('STU', 'students');
            const newUser = await DB.insert('users', { username: studentId, password: 'password123', role: 'student', name, status: 'active', email: sEmail });
            if (newUser) {
                await DB.insert('students', { user_id: newUser.id, student_id: studentId, name, class_id: classId, class_name: className, gender, email: sEmail, phone: sPhone, guardian_name: gName, parent_email: gEmail, parent_phone: gPhone, arrears: parseFloat(arrears) || 0, status: 'active' });
            }
            await DB.logAction('Registered Student', `Name: ${name}, ID: ${studentId}`);
            hideModal('studentModal');
            studentForm.reset();
            loadStudents();
        });
    }

    const broadForm = document.getElementById('formBroadCast');
    if (broadForm) {
        broadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = broadForm.querySelector('button');
            const data = { title: document.getElementById('broadTitle').value, body: document.getElementById('broadMessage').value, target: document.getElementById('broadTarget').value, notification_type: document.getElementById('broadMethod').value };
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Broadcasting...';
            try {
                const resp = await fetch('api.php?action=send_announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const res = await resp.json();
                if (res.success) {
                    DB.showToast('Announcement broadcasted successfully via ' + data.notification_type + '!');
                    hideModal('announcementNotifModal');
                    broadForm.reset();
                    loadAnnouncements();
                }
            } catch (err) { DB.showToast('Broadcast failed: ' + err.message); }
            finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bullhorn"></i> Send Notifications'; }
        });
    }

    const paymentForm = document.getElementById('formRecordPayment');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('pStudent').value;
            const amount = document.getElementById('pAmount').value;
            const receipt = document.getElementById('pReceipt').value;
            const status = document.getElementById('pStatus').value;
            await DB.insert('payments', { studentId, amountPaid: amount, receiptNo: receipt, status, date: new Date().toISOString() });
            await DB.logAction('Recorded Payment', `Student ID: ${studentId}, Amount: ${amount}`);
            hideModal('paymentModal');
            paymentForm.reset();
            loadFees();
        });
    }

    const setFeesForm = document.getElementById('formSetFees');
    if (setFeesForm) {
        setFeesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const classId = document.getElementById('feeClassId').value;
            const amount = document.getElementById('feeAmount').value;
            await DB.update('classes', classId, { tuitionFee: parseFloat(amount) });
            await DB.logAction('Updated Class Fees', `Class ID: ${classId}, New Fee: ${amount}`);
            DB.showToast('Tuition fee updated successfully!');
            hideModal('setFeesModal');
            setFeesForm.reset();
        });
    }

    const arrearsForm = document.getElementById('formUpdateArrears');
    if (arrearsForm) {
        arrearsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('adjStudId').value;
            const amount = document.getElementById('adjAmount').value;
            await DB.update('students', id, { arrears: parseFloat(amount) || 0 });
            await DB.logAction('Updated Arrears', `Student ID: ${id}, New Arrears: ${amount}`);
            DB.showToast('Student arrears updated successfully!');
            hideModal('updateArrearsModal');
            loadStudents();
        });
    }

    const ttForm = document.getElementById('timetableForm');
    if (ttForm) {
        ttForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('ttTitle').value;
            const target = document.getElementById('ttTarget').value;
            const fileInput = document.getElementById('ttFile');
            const file = fileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async function(event) {
                await DB.insert('timetables', { title, target, fileName: file.name, content: event.target.result, date: new Date().toISOString() });
                await DB.logAction('Uploaded Timetable', `Title: ${title}, Target: ${target}`);
                DB.showToast('Timetable uploaded and published successfully!');
                ttForm.reset();
                loadTimetables();
            };
            reader.readAsDataURL(file);
        });
    }

    const resetPassForm = document.getElementById('formResetPassword');
    if (resetPassForm) {
        resetPassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('resetUserId').value;
            const newPass = document.getElementById('newPassword').value;
            if (newPass.length < 5) return DB.showToast('Password too short.');
            const userRec = DB.findById('users', id);
            if (userRec) {
                await DB.update('users', id, { password: newPass });
                await DB.logAction('Reset Password', `User: ${userRec.username}`);
                DB.showToast('Password reset successfully!');
                hideModal('resetPasswordModal');
                loadUsers();
            }
        });
    }

    const searchUser = document.getElementById('searchUserInput');
    const roleFilter = document.getElementById('filterUserRole');
    const statusFilter = document.getElementById('filterUserStatus');
    if (searchUser) searchUser.addEventListener('input', loadUsers);
    if (roleFilter) roleFilter.addEventListener('change', loadUsers);
    if (statusFilter) statusFilter.addEventListener('change', loadUsers);

    const deptForm = document.getElementById('formAddDept');
    if (deptForm) {
        deptForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('deptName').value.trim();
            const head = document.getElementById('deptHead').value.trim();
            if (DB.find('departments', { name }).length > 0) return DB.showToast('Department already exists.');
            DB.insert('departments', { name, head });
            DB.logAction('Created Dept', `Name: ${name}`);
            hideModal('deptModal');
            deptForm.reset();
            loadDepartments();
        });
    }

    const subjectForm = document.getElementById('formAddSubject');
    if (subjectForm) {
        subjectForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('subjName').value.trim();
            const classId = document.getElementById('subjClassId').value;
            const className = classId ? document.getElementById('subjClassId').options[document.getElementById('subjClassId').selectedIndex].text : 'General';
            const code = document.getElementById('subjCode').value.trim();
            if (DB.find('subjects', { name }).some(s => s.classId === classId)) return DB.showToast('Subject already exists for this class.');
            DB.insert('subjects', { name, code, classId, className, status: 'active' });
            DB.logAction('Added Subject', `Name: ${name}`);
            hideModal('subjectModal');
            subjectForm.reset();
            loadSubjects();
        });
    }

    const termForm = document.getElementById('formAddTerm');
    if (termForm) {
        termForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('termName').value.trim();
            const year = document.getElementById('termYear').value.trim();
            const isActive = document.getElementById('termActive').value === 'true';
            if (isActive) DB.find('terms', { isActive: true }).forEach(t => DB.update('terms', t.id, { isActive: false }));
            DB.insert('terms', { name, year, isActive });
            DB.logAction('Created Term', `Name: ${name}`);
            hideModal('termModal');
            termForm.reset();
            loadTerms();
        });
    }

    const bookForm = document.getElementById('formAddBook');
    if (bookForm) {
        bookForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('bookTitle').value.trim();
            const author = document.getElementById('bookAuthor').value.trim();
            const isbn = document.getElementById('bookISBN').value.trim();
            const category = document.getElementById('bookCategory').value;
            const copies = parseInt(document.getElementById('bookCopies').value) || 1;
            DB.insert('library_books', { title, author, isbn, category, totalCopies: copies, availableCopies: copies, status: 'available' });
            DB.logAction('Added Library Book', `Title: ${title}`);
            hideModal('bookModal');
            bookForm.reset();
            loadLibrary();
        });
    }

    const issueForm = document.getElementById('formIssueBook');
    if (issueForm) {
        issueForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const bookId = document.getElementById('issueBookId').value;
            const borrower = document.getElementById('issueBorrower').value.trim();
            const borrowerType = document.getElementById('issueBorrowerType').value;
            const dueDate = document.getElementById('issueDueDate').value;
            const book = DB.findById('library_books', bookId);
            if (!book || book.availableCopies < 1) return DB.showToast('No copies available.');
            DB.insert('library_issues', { bookId, bookTitle: book.title, borrower, borrowerType, issueDate: new Date().toISOString().split('T')[0], dueDate, status: 'issued' });
            DB.update('library_books', bookId, { availableCopies: book.availableCopies - 1, status: book.availableCopies - 1 === 0 ? 'out' : 'available' });
            DB.logAction('Issued Book', `Book: ${book.title}, To: ${borrower}`);
            hideModal('issueBookModal');
            issueForm.reset();
            loadLibrary();
        });
    }
}

function loadDashboard() {
    document.getElementById('statStudents').innerText = DB.getTable('students').length;
    document.getElementById('statTeachers').innerText = DB.getTable('teachers').length;
    document.getElementById('statApplicants').innerText = DB.find('admissions', { status: 'pending' }).length;
    document.getElementById('statClasses').innerText = DB.getTable('classes').length;
    const ctx = document.getElementById('feesChart');
    if (ctx) {
        if (window.myFeesChart) window.myFeesChart.destroy();
        const payments = DB.getTable('payments');
        const data = { 'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0, 'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0 };
        payments.forEach(p => {
            const month = new Date(p.date).toLocaleString('default', { month: 'short' });
            if (data[month] !== undefined) data[month] += parseFloat(p.amountPaid);
        });
        window.myFeesChart = new Chart(ctx, { type: 'bar', data: { labels: Object.keys(data), datasets: [{ label: 'Fees Collected (GHS)', data: Object.values(data), backgroundColor: '#003366', borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } });
    }
    const tbody = document.getElementById('auditLogsTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        const logs = DB.getTable('audit_logs').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);
        if (logs.length === 0) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No system actions recorded.</td></tr>';
        else logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="font-size:0.85rem; color:#666;">${new Date(log.timestamp).toLocaleString()}</td><td><strong>${log.actor}</strong></td><td><span class="badge badge-active">${log.action}</span></td><td style="color:#444;">${log.details}</td>`;
            tbody.appendChild(tr);
        });
    }
}

function loadTeachers() {
    const tbody = document.querySelector('#teachersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let teachers = DB.getTable('teachers');
    const searchTerm = document.getElementById('searchTeachers')?.value.toLowerCase();
    if (searchTerm) teachers = teachers.filter(t => t.name.toLowerCase().includes(searchTerm));
    if (teachers.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No teachers found.</td></tr>'; return; }
    teachers.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${t.teacherId || 'N/A'}</strong></td><td>${t.name}</td><td>${t.phone || '-'}</td><td>${t.classes.length > 0 ? t.classes.join(', ') : '<span class="badge badge-inactive">None</span>'}</td><td><span class="badge badge-${t.status === 'active' ? 'active' : 'inactive'}">${t.status}</span></td><td><div class="action-btns"><button class="btn btn-primary" onclick="window.editTeacher('${t.id}')">Edit Profile</button><button class="btn btn-danger" onclick="window.deleteTeacher('${t.id}')">Delete</button></div></td>`;
        tbody.appendChild(tr);
    });
}

window.deleteTeacher = function (id) {
    if (confirm('Are you sure?')) {
        const teacher = DB.findById('teachers', id);
        if (teacher) {
            if (teacher.userId) DB.delete('users', teacher.userId);
            DB.delete('teachers', id);
            DB.logAction('Deleted Teacher', `Name: ${teacher.name}`);
            loadTeachers();
            loadUsers();
        }
    }
}

window.editTeacher = function (id) {
    const teacher = DB.findById('teachers', id);
    if (!teacher) return;
    const newName = prompt('Enter Teacher Full Name:', teacher.name);
    if (newName === null) return;
    const newPhone = prompt('Enter Phone Number:', teacher.phone || '');
    if (newPhone === null) return;
    const newSubjects = prompt('Enter Subjects (comma separated):', teacher.subjects.join(', '));
    if (newSubjects === null) return;
    const subjectsArr = newSubjects.split(',').map(s => s.trim()).filter(s => s !== '');
    DB.update('teachers', id, { name: newName, phone: newPhone, subjects: subjectsArr });
    if (teacher.userId) DB.update('users', teacher.userId, { name: newName });
    DB.logAction('Updated Teacher Profile', `Teacher: ${newName}`);
    loadTeachers();
}

function loadClasses() {
    const tbody = document.querySelector('#classesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const classesList = DB.getTable('classes');
    const teachers = DB.getTable('teachers');
    const students = DB.getTable('students');
    if (classesList.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No classes found.</td></tr>'; return; }
    classesList.forEach(cls => {
        const tr = document.createElement('tr');
        const count = students.filter(s => s.classId === cls.id || s.className === cls.name).length;
        const teacher = teachers.find(t => t.id === cls.teacherId);
        tr.innerHTML = `<td><strong>${cls.name}</strong></td><td>${teacher ? teacher.name : '<span class="badge badge-inactive">Unassigned</span>'}</td><td>${count}</td><td><div class="action-btns"><button class="btn btn-primary" onclick="assignClassTeacher('${cls.id}')">Assign Teacher</button></div></td>`;
        tbody.appendChild(tr);
    });
}

window.assignClassTeacher = function (classId) {
    const teachers = DB.getTable('teachers');
    if (teachers.length === 0) return DB.showToast('No teachers found.');
    let teacherList = teachers.map((t, idx) => `${idx + 1}. ${t.name}`).join('\n');
    const choice = prompt(`Select teacher:\n\n${teacherList}`);
    if (choice === null) return;
    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= teachers.length) return DB.showToast('Invalid selection.');
    const selectedTeacher = teachers[index];
    const cls = DB.findById('classes', classId);
    DB.update('classes', classId, { teacherId: selectedTeacher.id });
    if (!selectedTeacher.classes.includes(cls.name)) {
        DB.update('teachers', selectedTeacher.id, { classes: [...selectedTeacher.classes, cls.name] });
    }
    DB.logAction('Assigned Class Teacher', `Class: ${cls.name}`);
    loadClasses();
}

function loadAdmissions() {
    const tbody = document.querySelector('#admissionsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let admissions = DB.getTable('admissions').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const students = DB.getTable('students');
    admissions.forEach(adm => {
        if (adm.status === 'approved' && !students.some(s => s.admissionId === adm.id || s.name === adm.childName)) {
            DB.update('admissions', adm.id, { status: 'removed' });
            adm.status = 'removed';
        }
    });
    const searchTerm = document.getElementById('searchAdmissions')?.value.toLowerCase();
    if (searchTerm) admissions = admissions.filter(adm => adm.childName.toLowerCase().includes(searchTerm));
    if (admissions.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No applications found.</td></tr>'; return; }
    admissions.forEach(adm => {
        const tr = document.createElement('tr');
        let statusBadge = '';
        if (adm.status === 'pending') statusBadge = '<span class="badge badge-pending">Pending</span>';
        else if (adm.status === 'approved') statusBadge = '<span class="badge badge-approved">Approved</span>';
        else if (adm.status === 'removed') statusBadge = '<span class="badge badge-rejected">Student Removed</span>';
        else statusBadge = '<span class="badge badge-rejected">Rejected</span>';
        
        const reportBtn = adm.reportCard ? `<button class="btn btn-primary" onclick="window.viewAdmissionReport('${adm.id}')" title="View Document"><i class="fas fa-file-alt"></i></button>` : '';
        
        let actionBtns = adm.status === 'pending' ? `<div class="action-btns">${reportBtn}<button class="btn btn-success" onclick="approveAdmission('${adm.id}')"><i class="fas fa-check"></i></button><button class="btn btn-danger" onclick="rejectAdmission('${adm.id}')"><i class="fas fa-times"></i></button><button class="btn btn-danger" onclick="deleteAdmission('${adm.id}')"><i class="fas fa-trash"></i></button></div>` : `<div class="action-btns">${reportBtn}<button class="btn btn-danger" onclick="deleteAdmission('${adm.id}')"><i class="fas fa-trash"></i></button></div>`;
        tr.innerHTML = `<td>${new Date(adm.createdAt || 0).toLocaleDateString()}</td><td><strong>${adm.childName}</strong></td><td>${adm.classApplying}</td><td>${adm.pname || adm.guardianName || 'N/A'}</td><td>${statusBadge}</td><td>${actionBtns}</td>`;
        tbody.appendChild(tr);
    });
}

window.viewAdmissionReport = function (id) {
    const adm = DB.findById('admissions', id);
    if (!adm || !adm.reportCard) return DB.showToast('No report card uploaded.');
    
    const view = document.getElementById('reportViewContent');
    if (!view) return DB.showToast('Viewer modal not found.');
    
    if (adm.reportCard.startsWith('data:application/pdf')) {
        view.innerHTML = `<embed src="${adm.reportCard}" type="application/pdf" width="100%" height="500px">`;
    } else {
        view.innerHTML = `<img src="${adm.reportCard}" style="max-width:100%; height:auto; border-radius:8px;">`;
    }
    showModal('viewReportModal');
}

window.approveAdmission = async function (id) {
    if (!confirm('Approve?')) return;
    const adm = DB.findById('admissions', id);
    if (adm) {
        await DB.update('admissions', id, { status: 'approved' });
        const studentId = DB.generateUniqueId('STU', 'students');
        const newUser = await DB.insert('users', { username: studentId, password: 'password123', role: 'student', name: adm.childName, status: 'active' });
        if (newUser) {
            const matchingClass = DB.getTable('classes').find(c => c.name === adm.classApplying);
            const classId = matchingClass ? matchingClass.id : null;
            await DB.insert('students', { userId: newUser.id, admissionId: adm.id, studentId, name: adm.childName, email: adm.email || '', phone: adm.phone || '', classId: classId, className: adm.classApplying, gender: adm.gender || '-', guardianName: adm.pname || adm.guardianName, parent_email: adm.email || '', parent_phone: adm.pnumber || adm.guardianPhone, status: 'active' });
            
            // Send automatic Email and SMS Notification
            try {
                await fetch(`${API_URL}?action=notify_admission`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: adm.email,
                        phone: adm.pnumber,
                        childName: adm.childName,
                        studentId: studentId
                    })
                });
            } catch (err) {
                console.warn('Failed to send admission notification:', err);
            }
        }
        await DB.logAction('Approved Admission', `Applicant: ${adm.childName}`);
        loadAdmissions();
        
        // Show the simulated SMS to the admin since local XAMPP cannot send real SMS without a paid API key
        const smsMsg = `Congratulations! ${adm.childName} has been admitted to Elyon Montessori. Student ID: ${studentId}. Welcome to the Elyon Family!`;
        DB.showToast(`Successfully approved!\n\nThe following SMS/Email has been sent to ${adm.pnumber}:\n\n"${smsMsg}"`);
    }
}

window.rejectAdmission = async function (id) {
    if (!confirm('Reject?')) return;
    const adm = DB.findById('admissions', id);
    if (adm) {
        await DB.update('admissions', id, { status: 'rejected' });
        await DB.logAction('Rejected Admission', `Applicant: ${adm.childName}`);
        loadAdmissions();
    }
}

window.deleteAdmission = async function (id) {
    if (!confirm('Delete permanently?')) return;
    const adm = DB.findById('admissions', id);
    if (adm) {
        await DB.delete('admissions', id);
        await DB.logAction('Deleted Admission Record', `Applicant: ${adm.childName}`);
        loadAdmissions();
    }
}

function loadStudents() {
    const tbody = document.querySelector('#studentsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let students = DB.getTable('students');
    const searchTerm = document.getElementById('searchStudent')?.value.toLowerCase();
    const classFilter = document.getElementById('filterStudentClass')?.value;
    if (searchTerm) students = students.filter(s => s.name.toLowerCase().includes(searchTerm) || s.studentId.toLowerCase().includes(searchTerm));
    if (classFilter && classFilter !== 'all') students = students.filter(s => (s.className || 'Unassigned') === classFilter);
    const filterSelect = document.getElementById('filterStudentClass');
    if (filterSelect && filterSelect.options.length <= 1) DB.getTable('classes').forEach(c => filterSelect.add(new Option(c.name, c.name)));
    if (students.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No students found.</td></tr>'; return; }
    students.forEach(s => {
        const totalDebt = DB.calculateStudentDebt(s);
        let debtDisplay = totalDebt > 0 ? `<span style="color:var(--danger); font-weight:600;">GHS ${totalDebt.toFixed(2)}</span>` : `<span class="badge badge-active">Paid Full</span>`;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${s.studentId}</strong></td><td>${s.name}</td><td>${s.className || 'Unassigned'}</td><td>${s.gender || '-'}</td><td>${debtDisplay}</td><td><span class="badge badge-${s.status === 'active' ? 'active' : 'inactive'}">${s.status}</span></td><td><div class="action-btns"><button class="btn btn-primary" onclick="editStudent('${s.id}')">View</button><button class="btn btn-success" onclick="openArrearsModal('${s.id}')">Arrears</button><button class="btn btn-danger" onclick="deleteStudent('${s.id}')"><i class="fas fa-trash"></i></button></div></td>`;
        tbody.appendChild(tr);
    });
}

window.deleteStudent = async function (id) {
    if (confirm('Permanently remove student?')) {
        const student = DB.findById('students', id);
        if (student) {
            if (student.admissionId) await DB.update('admissions', student.admissionId, { status: 'removed' });
            else { const adm = DB.findOne('admissions', { childName: student.name, status: 'approved' }); if (adm) await DB.update('admissions', adm.id, { status: 'removed' }); }
            await DB.delete('users', student.userId);
            await DB.delete('students', id);
            await DB.logAction('Deleted Student', `Name: ${student.name}`);
            loadStudents();
            loadUsers();
        }
    }
}

window.openArrearsModal = function (id) {
    const student = DB.findById('students', id);
    if (student) {
        document.getElementById('adjStudId').value = student.id;
        document.getElementById('adjStudName').value = student.name;
        document.getElementById('adjAmount').value = student.arrears || 0;
        showModal('updateArrearsModal');
    }
}

window.editStudent = function (id) {
    const s = DB.findById('students', id);
    if (!s) return;
    const totalDebt = DB.calculateStudentDebt(s);
    let debtDisplay = totalDebt > 0 ? `<span style="color:var(--danger); font-weight:bold;">Current Debt: GHS ${totalDebt.toFixed(2)}</span>` : `<span style="color:var(--success); font-weight:bold;">Status: Paid Full</span>`;
    const view = document.getElementById('studentDetailsView');
    view.innerHTML = `<div><strong>Full Name:</strong><br>${s.name}</div><div><strong>Student ID:</strong><br>${s.studentId}</div><div><strong>Gender:</strong><br>${s.gender || '-'}</div><div><strong>Class:</strong><br>${s.className || 'Unassigned'}</div><div><strong>Status:</strong><br><span class="badge badge-${s.status === 'active' ? 'active' : 'inactive'}">${s.status}</span></div><div><strong>Guardian:</strong><br>${s.guardianName || 'N/A'}</div><div><strong>Finance:</strong><br>${debtDisplay}</div>`;
    showModal('viewStudentModal');
}

function loadAnnouncements() {
    const list = document.getElementById('adminAnnouncementsList');
    if (!list) return;
    list.innerHTML = '';
    const anns = DB.getTable('announcements').sort((a, b) => new Date(b.date) - new Date(a.date));
    if (anns.length === 0) { list.innerHTML = '<p style="color:#666; padding: 15px;">No announcements.</p>'; return; }
    anns.forEach(a => {
        const div = document.createElement('div');
        div.style.padding = '15px'; div.style.borderBottom = '1px solid #eee';
        div.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><strong>${a.title}</strong><div style="display:flex; gap:10px; align-items:center;"><span class="badge badge-active">${a.target}</span><button class="btn btn-danger" style="padding:2px 6px; font-size:0.7rem;" onclick="window.deleteAnnouncement('${a.id}')"><i class="fas fa-trash"></i></button></div></div><p style="margin:10px 0; font-size:0.95rem; color:#444">${a.body}</p><small style="color:#888">${new Date(a.date).toLocaleString()} By ${a.author}</small>`;
        list.appendChild(div);
    });
}

window.deleteAnnouncement = async function(id) {
    if(confirm('Delete?')) { await DB.delete('announcements', id); await DB.logAction('Deleted Announcement', `ID: ${id}`); loadAnnouncements(); }
}

function loadFees() {
    const tbody = document.querySelector('#feesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const payments = DB.getTable('payments').sort((a, b) => new Date(b.date) - new Date(a.date));
    const students = DB.getTable('students');
    if (payments.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No payment records.</td></tr>'; return; }
    payments.forEach(p => {
        const student = students.find(s => s.studentId === p.studentId);
        const tr = document.createElement('tr');
        let statusBadge = p.status === 'Paid' ? '<span class="badge badge-active">Paid</span>' : (p.status === 'Pending Verification' ? '<span class="badge badge-pending">Pending Verification</span>' : `<span class="badge badge-inactive">${p.status || 'Pending'}</span>`);
        let actionBtns = p.status === 'Pending Verification' ? `<div class="action-btns"><button class="btn btn-success" style="padding:4px 8px; font-size:0.8rem;" onclick="window.verifyPayment('${p.id}')">Verify</button><button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="window.deletePayment('${p.id}')"><i class="fas fa-trash"></i></button></div>` : `<button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="window.deletePayment('${p.id}')"><i class="fas fa-trash"></i></button>`;
        tr.innerHTML = `<td>${new Date(p.date).toLocaleDateString()}</td><td><strong>${student ? student.name : p.studentId}</strong><br><small>${p.studentId}</small></td><td>GHS ${parseFloat(p.amountPaid).toFixed(2)}</td><td>${p.receiptNo}</td><td>${statusBadge}</td><td>${actionBtns}</td>`;
        tbody.appendChild(tr);
    });
}

window.verifyPayment = async function(id) {
    if (!confirm('Verify?')) return;
    const payment = DB.findById('payments', id);
    if (payment) { await DB.update('payments', id, { status: 'Paid' }); await DB.logAction('Verified Payment', `Ref: ${payment.receiptNo}`); loadFees(); }
}

window.deletePayment = async function(id) {
    if (confirm('Delete?')) { await DB.delete('payments', id); await DB.logAction('Deleted Payment Record', `ID: ${id}`); loadFees(); }
}

function loadResults() {
    const tbody = document.querySelector('#resultsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const filterClass = document.getElementById('filterResultClass');
    if (filterClass && filterClass.options.length <= 1) DB.getTable('classes').forEach(c => filterClass.add(new Option(c.name, c.name)));
    const classF = document.getElementById('filterResultClass')?.value || 'all';
    const statusF = document.getElementById('filterResultStatus')?.value || 'all';
    let results = DB.getTable('results');
    if (classF !== 'all') results = results.filter(r => r.classId === classF);
    if (statusF !== 'all') results = results.filter(r => r.status === statusF);
    results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (results.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No results.</td></tr>'; return; }
    results.forEach(res => {
        const tr = document.createElement('tr');
        let statusBadge = res.status === 'submitted' ? '<span class="badge badge-pending">Submitted</span>' : (res.status === 'published' ? '<span class="badge badge-active">Published</span>' : (res.status === 'rejected' ? '<span class="badge badge-rejected">Rejected</span>' : `<span class="badge badge-inactive">${res.status}</span>`));
        let actionBtns = res.status === 'submitted' ? `<div class="action-btns"><button class="btn btn-primary" onclick="viewResult('${res.id}')">View</button><button class="btn btn-success" onclick="approveResult('${res.id}')"><i class="fas fa-check"></i></button></div>` : `<button class="btn btn-primary" onclick="viewResult('${res.id}')">View</button>`;
        tr.innerHTML = `<td><strong>${res.studentName}</strong><br><small>${res.studentId}</small></td><td>${res.classId}</td><td>${res.subject}</td><td>${res.term}</td><td><strong>${res.total}</strong></td><td>${statusBadge}</td><td>${actionBtns}</td>`;
        tbody.appendChild(tr);
    });
}

window.viewResult = function(id) {
    const res = DB.findById('results', id);
    if (!res) return;
    const view = document.getElementById('resultDetailsView');
    const actions = document.getElementById('resultModalActions');
    view.innerHTML = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;"><div><strong>Student:</strong><br>${res.studentName}</div><div><strong>Subject:</strong><br>${res.subject}</div><div><strong>Total Score:</strong><br>${res.total}</div></div>`;
    actions.innerHTML = res.status === 'submitted' ? `<button class="btn btn-danger" onclick="rejectResult('${res.id}'); hideModal('viewResultModal');">Reject</button><button class="btn btn-success" onclick="approveResult('${res.id}'); hideModal('viewResultModal');">Approve</button>` : `<button class="btn btn-primary" onclick="hideModal('viewResultModal')">Close</button>`;
    showModal('viewResultModal');
}

window.approveResult = async function(id) {
    if (!confirm('Approve?')) return;
    const res = DB.findById('results', id);
    if (res) { await DB.update('results', id, { status: 'published' }); await DB.logAction('Approved Result', `Student: ${res.studentName}`); loadResults(); }
}

window.rejectResult = async function(id) {
    const reason = prompt('Reason:');
    if (reason === null) return;
    const res = DB.findById('results', id);
    if (res) { await DB.update('results', id, { status: 'rejected', rejectionReason: reason }); await DB.logAction('Rejected Result', `Reason: ${reason}`); loadResults(); }
}

function loadTimetables() {
    const tbody = document.querySelector('#timetablesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const tts = DB.getTable('timetables').sort((a, b) => new Date(b.date) - new Date(a.date));
    if (tts.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No timetables.</td></tr>'; return; }
    tts.forEach(tt => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${tt.title}</strong></td><td>${tt.target}</td><td>${new Date(tt.date).toLocaleDateString()}</td><td><div class="action-btns"><a href="${tt.content}" target="_blank" class="btn btn-primary">View</a><button class="btn btn-danger" onclick="deleteTimetable('${tt.id}')">Delete</button></div></td>`;
        tbody.appendChild(tr);
    });
}

window.deleteTimetable = async function(id) {
    if (confirm('Delete?')) { const tt = DB.findById('timetables', id); if (tt) { await DB.delete('timetables', id); await DB.logAction('Deleted Timetable', `Title: ${tt.title}`); loadTimetables(); } }
}

function loadUsers() {
    const tbody = document.querySelector('#usersMasterTable tbody');
    if (!tbody) return;
    const query = document.getElementById('searchUserInput')?.value.toLowerCase() || '';
    const roleF = document.getElementById('filterUserRole')?.value || 'all';
    const statusF = document.getElementById('filterUserStatus')?.value || 'all';
    let users = DB.getTable('users');
    if (query) users = users.filter(u => u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query));
    if (roleF !== 'all') users = users.filter(u => u.role === roleF);
    if (statusF !== 'all') users = users.filter(u => (statusF === 'active' ? u.status !== 'inactive' : u.status === 'inactive'));
    tbody.innerHTML = '';
    if (users.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No users found.</td></tr>'; return; }
    users.forEach(u => {
        const tr = document.createElement('tr');
        const isActive = u.status !== 'inactive';
        tr.innerHTML = `<td><strong>${u.name}</strong></td><td>${u.username}</td><td><span class="badge ${u.role === 'admin' ? 'badge-active' : 'badge-pending'}">${u.role.toUpperCase()}</span></td><td><span class="badge ${isActive ? 'badge-active' : 'badge-rejected'}">${isActive ? 'Active' : 'Inactive'}</span></td><td><div class="action-btns"><button class="btn btn-primary" onclick="window.openResetPasswordModal('${u.id}')"><i class="fas fa-key"></i></button><button class="btn ${isActive ? 'btn-danger' : 'btn-success'}" onclick="window.toggleUserStatus('${u.id}')"><i class="fas ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i></button><button class="btn btn-danger" onclick="window.deleteUser('${u.id}')"><i class="fas fa-trash"></i></button></div></td>`;
        tbody.appendChild(tr);
    });
}

window.deleteUser = async function(id) {
    const user = DB.findById('users', id);
    if (!user) return;
    if (user.role === 'admin') return DB.showToast('Cannot delete admin.');
    if (confirm(`Permanently delete account for ${user.name}?`)) {
        if (user.role === 'teacher') { const t = DB.findOne('teachers', { user_id: id }); if (t) await DB.delete('teachers', t.id); }
        if (user.role === 'student') { const s = DB.findOne('students', { user_id: id }); if (s) await DB.delete('students', s.id); }
        await DB.delete('users', id);
        await DB.logAction('Deleted User Account', `User: ${user.username}`);
        loadUsers();
    }
}

window.openResetPasswordModal = function(id) {
    const user = DB.findById('users', id);
    if (user) {
        document.getElementById('resetUserId').value = user.id;
        document.getElementById('resetUserName').value = user.name;
        document.getElementById('newPassword').value = '';
        showModal('resetPasswordModal');
    }
}

window.toggleUserStatus = async function(id) {
    const user = DB.findById('users', id);
    if (user) {
        const newStatus = (user.status === 'inactive') ? 'active' : 'inactive';
        if (confirm(`Change status to ${newStatus}?`)) {
            await DB.update('users', id, { status: newStatus });
            await DB.logAction('Changed User Status', `User: ${user.username}`);
            loadUsers();
        }
    }
}

function loadAttendance() {
    const panel = document.getElementById('attendanceOverviewTable');
    if (!panel) return;
    const classF = document.getElementById('admAttClass')?.value || 'all';
    const dateF = document.getElementById('admAttDate')?.value;
    const listBody = document.querySelector('#attendanceOverviewTable tbody');
    let records = DB.getTable('attendance');
    if(dateF) records = records.filter(r => r.date === dateF);
    if(classF !== 'all') records = records.filter(r => r.className === classF);
    records.sort((a,b) => new Date(b.date) - new Date(a.date));
    listBody.innerHTML = '';
    if(records.length === 0) { listBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No records.</td></tr>'; return; }
    records.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${new Date(r.date).toLocaleDateString()}</td><td><strong>${r.studentName}</strong></td><td>${r.className}</td><td><span class="badge ${r.status === 'Absent' ? 'badge-rejected' : 'badge-active'}">${r.status}</span></td><td>${r.remark || '-'}</td>`;
        listBody.appendChild(tr);
    });
}

function loadMessages() {
    const tbody = document.querySelector('#messagesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const msgs = DB.getTable('messages').sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
    if (msgs.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No messages.</td></tr>'; return; }
    msgs.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${new Date(m.date || 0).toLocaleString()}</td><td><strong>${m.senderName}</strong></td><td>${m.subject}</td><td>${m.body.substring(0, 50)}...</td><td><button class="btn btn-danger" onclick="window.deleteMessage('${m.id}')">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

window.deleteMessage = async function(id) { if(confirm('Delete?')) { await DB.delete('messages', id); loadMessages(); } }

window.generateStudentReport = function() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.text("Student Registry", 105, 20, { align: "center" });
    const students = DB.getTable('students');
    const rows = students.map(s => [s.studentId, s.name, s.className]);
    doc.autoTable({ head: [['ID', 'Name', 'Class']], body: rows, startY: 30 });
    doc.save("Students.pdf");
}

function loadSubjects() {
    const tbody = document.querySelector('#subjectsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const subjects = DB.getTable('subjects');
    subjects.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${s.name}</strong></td><td>${s.code || '--'}</td><td>${s.className}</td><td><div class="action-btns"><button class="btn btn-danger" onclick="window.deleteSubject('${s.id}')"><i class="fas fa-trash"></i></button></div></td>`;
        tbody.appendChild(tr);
    });
}

window.deleteSubject = async function(id) { if(confirm('Delete?')) { await DB.delete('subjects', id); loadSubjects(); } }

function loadTerms() {
    const tbody = document.querySelector('#termsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const terms = DB.getTable('terms');
    terms.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${t.name}</strong></td><td>${t.year}</td><td>${t.isActive ? 'Active' : 'No'}</td><td><button class="btn btn-success" onclick="window.setActiveTerm('${t.id}')">Set Active</button></td>`;
        tbody.appendChild(tr);
    });
}

window.setActiveTerm = async function(id) {
    DB.getTable('terms').forEach(t => DB.update('terms', t.id, { isActive: false }));
    DB.update('terms', id, { isActive: true });
    loadTerms();
}

function loadLibrary() { loadBookCatalogue(); loadActiveIssues(); }

function loadBookCatalogue() {
    const tbody = document.querySelector('#booksTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    DB.getTable('library_books').forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${b.title}</strong></td><td>${b.author}</td><td><button class="btn btn-success" onclick="window.openIssueModal('${b.id}')">Issue</button></td>`;
        tbody.appendChild(tr);
    });
}

function loadDepartments() {
    const tbody = document.querySelector('#deptsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    DB.getTable('departments').forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${d.name}</strong></td><td><button class="btn btn-danger" onclick="DB.delete('departments', '${d.id}'); loadDepartments();">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

window.exportSystemBackup = function() {
    const backupData = {};
    const tables = ['users', 'students', 'teachers', 'classes', 'departments', 'subjects', 'terms', 'attendance', 'results', 'announcements', 'payments', 'learning_materials', 'timetables', 'messages', 'audit_logs', 'library_books', 'library_issues'];
    tables.forEach(table => backupData[table] = DB.getTable(table));
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a'); link.setAttribute('href', dataUri); link.setAttribute('download', 'Backup.json'); link.click();
}

window.importSystemBackup = function(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = JSON.parse(e.target.result);
        Object.keys(data).forEach(t => DB.saveTable(t, data[t]));
        window.location.reload();
    };
    reader.readAsText(file);
}

function loadActiveIssues() {
    const tbody = document.querySelector('#issuesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    DB.getTable('library_issues').filter(i => i.status === 'issued').forEach(i => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${i.bookTitle}</strong></td><td>${i.borrower}</td><td><button class="btn btn-success" onclick="window.returnBook('${i.id}')">Return</button></td>`;
        tbody.appendChild(tr);
    });
}

window.openIssueModal = function(bookId) {
    const book = DB.findById('library_books', bookId);
    if (!book) return;
    document.getElementById('issueBookId').value = bookId;
    showModal('issueBookModal');
}

window.returnBook = async function(id) {
    const i = DB.findById('library_issues', id);
    if (i) {
        await DB.update('library_issues', id, { status: 'returned' });
        const b = DB.findById('library_books', i.bookId);
        if (b) await DB.update('library_books', b.id, { availableCopies: b.availableCopies + 1 });
        loadLibrary();
    }
}
