// js/admin.js

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for server data to load
    await DB.init();

    const user = DB.requireAuth('admin');
    if (!user) return;

    document.getElementById('currentAdminName').innerText = user.name || 'Administrator';

    // 2. Sidebar Navigation
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

            // Update active menu
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');

            // Update active section
            const target = item.getAttribute('data-target');
            sections.forEach(sec => {
                if (sec.id === target) sec.classList.add('active');
                else sec.classList.remove('active');
            });

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                closeSidebar();
            }

            // Load data for the section
            loadSectionData(target);
        });
    });

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('show');
            if (overlay) overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Forms Setup
    setupForms();

    // Initial Load
    document.getElementById('searchStudent')?.addEventListener('input', () => loadStudents());
    document.getElementById('filterStudentClass')?.addEventListener('change', () => loadStudents());
    document.getElementById('searchAdmissions')?.addEventListener('input', () => loadAdmissions());
    document.getElementById('searchTeachers')?.addEventListener('input', () => loadTeachers());

    loadSectionData('dashboard');
});

// Exposed Globally for HTML Buttons
window.showModal = function (id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    // Dynamic population for specific modals
    if (id === 'studentModal') {
        const classSelect = document.getElementById('sClass');
        if (classSelect) {
            classSelect.innerHTML = '<option value="">Select Class</option>';
            DB.getTable('classes').forEach(c => {
                classSelect.add(new Option(c.name, c.id));
            });
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
            DB.getTable('students').forEach(s => {
                studentSelect.add(new Option(`${s.name} (${s.studentId})`, s.studentId));
            });
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
window.hideModal = function (id) {
    document.getElementById(id).classList.remove('active');
}

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

// ---------------- Helper Functions ---------------- //

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
    // Add Teacher Form
    const teacherForm = document.getElementById('formAddTeacher');
    if (teacherForm) {
        teacherForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('tName').value;
            const phone = document.getElementById('tPhone').value;
            const password = document.getElementById('tPassword').value;

            const teacherId = DB.generateUniqueId('TCH', 'teachers');
            const username = teacherId;

            const newUser = await DB.insert('users', {
                username, password, role: 'teacher', name, status: 'active'
            });

            if (newUser) {
                await DB.insert('teachers', {
                    user_id: newUser.id,
                    teacher_id: teacherId,
                    name, phone, status: 'active'
                });
            }

            await DB.logAction('Created Teacher', `Name: ${name}, ID: ${teacherId}`);
            hideModal('teacherModal');
            document.getElementById('formAddTeacher').reset();
            loadTeachers();
        });
    }

    // Add Class Form
    const classForm = document.getElementById('formAddClass');
    if (classForm) {
        classForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('cName').value;
            await DB.insert('classes', { name });
            await DB.logAction('Created Class', `Name: ${name}`);
            hideModal('classModal');
            document.getElementById('formAddClass').reset();
            loadClasses();
        });
    }

    // Add Announcement
    const annForm = document.getElementById('announcementForm');
    if (annForm) {
        annForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('annTitle').value;
            const target = document.getElementById('annTarget').value;
            const body = document.getElementById('annBody').value;
            const user = DB.getCurrentUser();

            await DB.insert('announcements', {
                title, target, body, author: user.name, date: new Date().toISOString()
            });

            document.getElementById('announcementForm').reset();
            loadAnnouncements();
        });
    }

    // Admin Outbound Message
    const adminMsgForm = document.getElementById('adminMsgForm');
    if (adminMsgForm) {
        adminMsgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const to = document.getElementById('admMsgTo').value;
            const subject = document.getElementById('admMsgSubject').value;
            const body = document.getElementById('admMsgBody').value;
            const user = DB.getCurrentUser();

            await DB.insert('messages', {
                senderId: user.id,
                senderName: user.name,
                senderRole: 'admin',
                receiverRole: to,
                subject,
                body,
                date: new Date().toISOString()
            });

            await DB.logAction('Sent System Message', `To: ${to}, Subject: ${subject}`);
            alert('Your message has been sent to the system!');
            adminMsgForm.reset();
        });
    }

    // Add Student Manually Form
    const studentForm = document.getElementById('formAddStudent');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('sName').value;
            const classId = document.getElementById('sClass').value;
            const className = document.getElementById('sClass').options[document.getElementById('sClass').selectedIndex].text;
            const gender = document.getElementById('sGender').value;
            const gName = document.getElementById('sGName').value;
            const gPhone = document.getElementById('sGPhone').value;
            const arrears = document.getElementById('sArrears').value;

            const studentId = DB.generateUniqueId('STU', 'students');
            const newUser = await DB.insert('users', {
                username: studentId, password: 'password123', role: 'student', name, status: 'active'
            });

            if (newUser) {
                await DB.insert('students', {
                    user_id: newUser.id, student_id: studentId, name, class_id: classId, class_name: className,
                    gender, guardian_name: gName, guardian_phone: gPhone, arrears: parseFloat(arrears) || 0, status: 'active'
                });
            }

            await DB.logAction('Registered Student', `Name: ${name}, ID: ${studentId}`);
            hideModal('studentModal');
            document.getElementById('formAddStudent').reset();
            loadStudents();
        });
    }

    // Record Payment Form
    const paymentForm = document.getElementById('formRecordPayment');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('pStudent').value;
            const amount = document.getElementById('pAmount').value;
            const receipt = document.getElementById('pReceipt').value;
            const status = document.getElementById('pStatus').value;

            await DB.insert('payments', {
                studentId,
                amountPaid: amount,
                receiptNo: receipt,
                status,
                date: new Date().toISOString()
            });

            await DB.logAction('Recorded Payment', `Student ID: ${studentId}, Amount: ${amount}`);

            hideModal('paymentModal');
            document.getElementById('formRecordPayment').reset();
            loadFees();
        });
    }

    // Set Class Fees Form
    const setFeesForm = document.getElementById('formSetFees');
    if (setFeesForm) {
        setFeesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const classId = document.getElementById('feeClassId').value;
            const amount = document.getElementById('feeAmount').value;

            await DB.update('classes', classId, { tuitionFee: parseFloat(amount) });
            await DB.logAction('Updated Class Fees', `Class ID: ${classId}, New Fee: ${amount}`);

            alert('Tuition fee updated successfully for this class!');
            hideModal('setFeesModal');
            document.getElementById('formSetFees').reset();
        });
    }

    // Update Arrears Form
    const arrearsForm = document.getElementById('formUpdateArrears');
    if (arrearsForm) {
        arrearsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('adjStudId').value;
            const amount = document.getElementById('adjAmount').value;

            await DB.update('students', id, { arrears: parseFloat(amount) || 0 });
            await DB.logAction('Updated Arrears', `Student ID: ${id}, New Arrears: ${amount}`);

            alert('Student arrears updated successfully!');
            hideModal('updateArrearsModal');
            loadStudents();
        });
    }

    // Timetable Upload Form
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
                const base64Content = event.target.result;
                
                await DB.insert('timetables', {
                    title,
                    target,
                    fileName: file.name,
                    content: base64Content,
                    date: new Date().toISOString()
                });

                await DB.logAction('Uploaded Timetable', `Title: ${title}, Target: ${target}`);
                alert('Timetable uploaded and published successfully!');
                ttForm.reset();
                loadTimetables();
            };
            reader.readAsDataURL(file);
        });
    }

    // Reset Password Form
    const resetPassForm = document.getElementById('formResetPassword');
    if (resetPassForm) {
        resetPassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('resetUserId').value;
            const newPass = document.getElementById('newPassword').value;

            if (newPass.length < 5) return alert('Password too short.');

            const user = DB.findById('users', id);
            if (user) {
                await DB.update('users', id, { password: newPass });
                await DB.logAction('Reset Password', `User: ${user.username} (${user.role})`);
                alert('Password reset successfully!');
                hideModal('resetPasswordModal');
                loadUsers();
            }
        });
    }

    // User Filters
    const searchUser = document.getElementById('searchUserInput');
    const roleFilter = document.getElementById('filterUserRole');
    const statusFilter = document.getElementById('filterUserStatus');

    if (searchUser) searchUser.addEventListener('input', loadUsers);
    if (roleFilter) roleFilter.addEventListener('change', loadUsers);
    if (statusFilter) statusFilter.addEventListener('change', loadUsers);

    // Add Department Form
    const deptForm = document.getElementById('formAddDept');
    if (deptForm) {
        deptForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('deptName').value.trim();
            const head = document.getElementById('deptHead').value.trim();

            const exists = DB.find('departments', { name }).length > 0;
            if (exists) {
                alert(`Department "${name}" already exists.`);
                return;
            }

            DB.insert('departments', { name, head });
            DB.logAction('Created Dept', `Name: ${name}, Head: ${head}`);
            alert('Department created successfully!');
            hideModal('deptModal');
            document.getElementById('formAddDept').reset();
            loadDepartments();
        });
    }

    // Subject Management Form
    const subjectForm = document.getElementById('formAddSubject');
    if (subjectForm) {
        subjectForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('subjName').value.trim();
            const classId = document.getElementById('subjClassId').value;
            const className = classId
                ? document.getElementById('subjClassId').options[document.getElementById('subjClassId').selectedIndex].text
                : 'General';
            const code = document.getElementById('subjCode').value.trim();

            const exists = DB.find('subjects', { name }).some(s => s.classId === classId);
            if (exists) {
                alert(`Subject "${name}" already exists for this class.`);
                return;
            }

            DB.insert('subjects', { name, code, classId, className, status: 'active' });
            DB.logAction('Added Subject', `Name: ${name}, Class: ${className}`);
            alert('Subject added successfully!');
            hideModal('subjectModal');
            document.getElementById('formAddSubject').reset();
            loadSubjects();
        });
    }

    // Academic Term Form
    const termForm = document.getElementById('formAddTerm');
    if (termForm) {
        termForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('termName').value.trim();
            const year = document.getElementById('termYear').value.trim();
            const isActive = document.getElementById('termActive').value === 'true';

            if (isActive) {
                // Deactivate any currently active term
                const currentActive = DB.find('terms', { isActive: true });
                currentActive.forEach(t => DB.update('terms', t.id, { isActive: false }));
            }

            DB.insert('terms', { name, year, isActive });
            DB.logAction('Created Term', `Name: ${name}, Year: ${year}, Active: ${isActive}`);
            alert(`Term "${name}" created successfully!`);
            hideModal('termModal');
            document.getElementById('formAddTerm').reset();
            loadTerms();
        });
    }

    // Library Book Form
    const bookForm = document.getElementById('formAddBook');
    if (bookForm) {
        bookForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title     = document.getElementById('bookTitle').value.trim();
            const author    = document.getElementById('bookAuthor').value.trim();
            const isbn      = document.getElementById('bookISBN').value.trim();
            const category  = document.getElementById('bookCategory').value;
            const copies    = parseInt(document.getElementById('bookCopies').value) || 1;

            DB.insert('library_books', { title, author, isbn, category, totalCopies: copies, availableCopies: copies, status: 'available' });
            DB.logAction('Added Library Book', `Title: ${title}, Author: ${author}, Copies: ${copies}`);
            alert('Book added to library!');
            hideModal('bookModal');
            document.getElementById('formAddBook').reset();
            loadLibrary();
        });
    }

    // Book Issue Form
    const issueForm = document.getElementById('formIssueBook');
    if (issueForm) {
        issueForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const bookId    = document.getElementById('issueBookId').value;
            const borrower  = document.getElementById('issueBorrower').value.trim();
            const borrowerType = document.getElementById('issueBorrowerType').value;
            const dueDate   = document.getElementById('issueDueDate').value;

            const book = DB.findById('library_books', bookId);
            if (!book || book.availableCopies < 1) {
                alert('No copies available for this book.');
                return;
            }

            DB.insert('library_issues', { bookId, bookTitle: book.title, borrower, borrowerType, issueDate: new Date().toISOString().split('T')[0], dueDate, status: 'issued' });
            DB.update('library_books', bookId, { availableCopies: book.availableCopies - 1, status: book.availableCopies - 1 === 0 ? 'out' : 'available' });
            DB.logAction('Issued Book', `Book: ${book.title}, To: ${borrower}`);
            alert(`Book issued to ${borrower}!`);
            hideModal('issueBookModal');
            document.getElementById('formIssueBook').reset();
            loadLibrary();
        });
    }
}

// ---------------- Loaders ---------------- //

function loadDashboard() {
    document.getElementById('statStudents').innerText = DB.getTable('students').length;
    document.getElementById('statTeachers').innerText = DB.getTable('teachers').length;
    document.getElementById('statApplicants').innerText = DB.find('admissions', { status: 'pending' }).length;
    document.getElementById('statClasses').innerText = DB.getTable('classes').length;

    // Load Fees Chart
    const ctx = document.getElementById('feesChart');
    if (ctx) {
        // Destroy existing chart if any
        if (window.myFeesChart) window.myFeesChart.destroy();

        const payments = DB.getTable('payments');
        // Group by month (very simple)
        const data = {
            'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0, 'May': 0, 'Jun': 0,
            'Jul': 0, 'Aug': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
        };
        payments.forEach(p => {
            const month = new Date(p.date).toLocaleString('default', { month: 'short' });
            if (data[month] !== undefined) data[month] += parseFloat(p.amountPaid);
        });

        window.myFeesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: 'Fees Collected (GHS)',
                    data: Object.values(data),
                    backgroundColor: '#003366',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // Load Audit Logs
    const tbody = document.getElementById('auditLogsTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        const logs = DB.getTable('audit_logs').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No system actions recorded yet.</td></tr>';
        } else {
            logs.forEach(log => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-size:0.85rem; color:#666;">${new Date(log.timestamp).toLocaleString()}</td>
                    <td><strong>${log.actor}</strong></td>
                    <td><span class="badge badge-active">${log.action}</span></td>
                    <td style="color:#444;">${log.details}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
}

function loadTeachers() {
    const tbody = document.querySelector('#teachersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let teachers = DB.getTable('teachers');

    const searchTerm = document.getElementById('searchTeachers')?.value.toLowerCase();
    if (searchTerm) {
        teachers = teachers.filter(t => t.name.toLowerCase().includes(searchTerm));
    }

    if (teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No teachers found.</td></tr>';
        return;
    }

    teachers.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${t.teacherId || 'N/A'}</strong></td>
            <td>${t.name}</td>
            <td>${t.phone || '-'}</td>
            <td>${t.classes.length > 0 ? t.classes.join(', ') : '<span class="badge badge-inactive">None</span>'}</td>
            <td><span class="badge badge-${t.status === 'active' ? 'active' : 'inactive'}">${t.status}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-primary" onclick="window.editTeacher('${t.id}')">Edit Profile</button>
                    <button class="btn btn-danger" onclick="window.deleteTeacher('${t.id}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.deleteTeacher = function (id) {
    if (confirm('Are you sure you want to remove this teacher?')) {
        const teacher = DB.findById('teachers', id);
        if (teacher) {
            if (teacher.userId) {
                DB.delete('users', teacher.userId);
            }
            DB.delete('teachers', id);
            DB.logAction('Deleted Teacher', `Name: ${teacher.name}`);
            loadTeachers();
            loadUsers(); // Refresh Users Master List
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

    DB.update('teachers', id, { 
        name: newName, 
        phone: newPhone,
        subjects: subjectsArr 
    });

    // Also update the user's name if they have a userId
    if (teacher.userId) {
        DB.update('users', teacher.userId, { name: newName });
    }

    DB.logAction('Updated Teacher Profile', `Teacher: ${newName}`);
    loadTeachers();
    alert('Teacher updated successfully!');
}

function loadClasses() {
    const tbody = document.querySelector('#classesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const classesList = DB.getTable('classes');
    const teachers = DB.getTable('teachers');
    const students = DB.getTable('students');

    if (classesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No classes found.</td></tr>';
        return;
    }

    classesList.forEach(cls => {
        const tr = document.createElement('tr');
        const count = students.filter(s => s.classId === cls.id || s.className === cls.name).length;
        const teacher = teachers.find(t => t.id === cls.teacherId);

        tr.innerHTML = `
            <td><strong>${cls.name}</strong></td>
            <td>${teacher ? teacher.name : '<span class="badge badge-inactive">Unassigned</span>'}</td>
            <td>${count}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-primary" onclick="assignClassTeacher('${cls.id}')">Assign Teacher</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.assignClassTeacher = function (classId) {
    const teachers = DB.getTable('teachers');
    if (teachers.length === 0) {
        alert('No teachers found. Please add a teacher first.');
        return;
    }

    let teacherList = teachers.map((t, idx) => `${idx + 1}. ${t.name}`).join('\n');
    const choice = prompt(`Select teacher to assign to this class by number:\n\n${teacherList}`);
    
    if (choice === null) return;
    
    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= teachers.length) {
        alert('Invalid selection.');
        return;
    }

    const selectedTeacher = teachers[index];
    const cls = DB.findById('classes', classId);
    
    // Update class
    DB.update('classes', classId, { teacherId: selectedTeacher.id });

    // Update teacher's classes list if not already there
    if (!selectedTeacher.classes.includes(cls.name)) {
        const updatedClasses = [...selectedTeacher.classes, cls.name];
        DB.update('teachers', selectedTeacher.id, { classes: updatedClasses });
    }

    DB.logAction('Assigned Class Teacher', `Class: ${cls.name}, Teacher: ${selectedTeacher.name}`);
    loadClasses();
    alert(`Assigned ${selectedTeacher.name} to ${cls.name} successfully!`);
}

function loadAdmissions() {
    const tbody = document.querySelector('#admissionsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let admissions = DB.getTable('admissions').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const students = DB.getTable('students');

    // Auto-sync: If an admission is 'approved' but no student exists, mark as removed
    admissions.forEach(adm => {
        if (adm.status === 'approved') {
            const studentExists = students.some(s => s.admissionId === adm.id || s.name === adm.childName);
            if (!studentExists) {
                DB.update('admissions', adm.id, { status: 'removed' });
                adm.status = 'removed'; // update local reference for immediate display
            }
        }
    });

    const searchTerm = document.getElementById('searchAdmissions')?.value.toLowerCase();
    if (searchTerm) {
        admissions = admissions.filter(adm => adm.childName.toLowerCase().includes(searchTerm));
    }

    if (admissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No applications found.</td></tr>';
        return;
    }

    admissions.forEach(adm => {
        const tr = document.createElement('tr');
        const dateStr = new Date(adm.createdAt).toLocaleDateString();

        let statusBadge = '';
        if (adm.status === 'pending') statusBadge = '<span class="badge badge-pending">Pending</span>';
        else if (adm.status === 'approved') statusBadge = '<span class="badge badge-approved">Approved</span>';
        else if (adm.status === 'removed') statusBadge = '<span class="badge badge-rejected">Student Removed</span>';
        else statusBadge = '<span class="badge badge-rejected">Rejected</span>';

        let actionBtns = '';
        if (adm.status === 'pending') {
            actionBtns = `
                <div class="action-btns">
                    <button class="btn btn-success" onclick="approveAdmission('${adm.id}')" title="Approve"><i class="fas fa-check"></i></button>
                    <button class="btn btn-danger" onclick="rejectAdmission('${adm.id}')" title="Reject"><i class="fas fa-times"></i></button>
                    <button class="btn btn-danger" onclick="deleteAdmission('${adm.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;
        } else {
            actionBtns = `
                <div class="action-btns">
                    <button class="btn btn-danger" onclick="deleteAdmission('${adm.id}')" title="Delete Record"><i class="fas fa-trash"></i></button>
                </div>
            `;
        }

        tr.innerHTML = `
            <td>${dateStr}</td>
            <td><strong>${adm.childName}</strong></td>
            <td>${adm.classApplying}</td>
            <td>${adm.pname || adm.guardianName || 'N/A'}</td>
            <td>${statusBadge}</td>
            <td>${actionBtns}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.approveAdmission = async function (id) {
    if (!confirm('Approve this applicant and create student record?')) return;

    const adm = DB.findById('admissions', id);
    if (adm) {
        await DB.update('admissions', id, { status: 'approved' });

        // Create user
        const studentId = DB.generateUniqueId('STU', 'students');
        const newUser = await DB.insert('users', {
            username: studentId,
            password: 'password123', // default
            role: 'student',
            name: adm.childName,
            status: 'active'
        });

        // Create student
        if (newUser) {
            await DB.insert('students', {
                userId: newUser.id,
                admissionId: adm.id,
                studentId,
                name: adm.childName,
                classId: adm.classApplying, // Just saving string mapping for now
                className: adm.classApplying,
                gender: adm.gender || '-',
                guardianName: adm.pname || adm.guardianName,
                guardianPhone: adm.pnumber || adm.guardianPhone,
                status: 'active'
            });
        }

        await DB.logAction('Approved Admission', `Applicant: ${adm.childName}, Assigned ID: ${studentId}`);

        loadAdmissions();
        if (document.getElementById('dashboard').classList.contains('active')) loadDashboard();
        alert(`Successfully approved! Generated Student ID: ${studentId}\nDefault password: password123`);
    }
}

window.rejectAdmission = async function (id) {
    if (!confirm('Are you sure you want to reject this applicant?')) return;
    const adm = DB.findById('admissions', id);
    if (adm) {
        await DB.update('admissions', id, { status: 'rejected' });
        await DB.logAction('Rejected Admission', `Applicant: ${adm.childName}`);
        loadAdmissions();
        if (document.getElementById('dashboard').classList.contains('active')) loadDashboard();
    }
}

window.deleteAdmission = async function (id) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this admission record from the system?')) return;
    
    const adm = DB.findById('admissions', id);
    if (adm) {
        await DB.delete('admissions', id);
        await DB.logAction('Deleted Admission Record', `Applicant: ${adm.childName}`);
        loadAdmissions();
        if (document.getElementById('dashboard').classList.contains('active')) loadDashboard();
        alert('Admission record removed permanently.');
    }
}

function loadStudents() {
    const tbody = document.querySelector('#studentsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let students = DB.getTable('students');
    const searchTerm = document.getElementById('searchStudent')?.value.toLowerCase();
    const classFilter = document.getElementById('filterStudentClass')?.value;

    if (searchTerm) {
        students = students.filter(s => s.name.toLowerCase().includes(searchTerm) || s.studentId.toLowerCase().includes(searchTerm));
    }
    if (classFilter && classFilter !== 'all') {
        students = students.filter(s => (s.className || 'Unassigned') === classFilter);
    }

    const filterSelect = document.getElementById('filterStudentClass');
    if (filterSelect && filterSelect.options.length <= 1) { // Populate dynamically from all school classes
        DB.getTable('classes').forEach(c => filterSelect.add(new Option(c.name, c.name)));
    }

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No students found.</td></tr>';
        return;
    }

    students.forEach(s => {
        // Calculate Debt
        const totalDebt = DB.calculateStudentDebt(s);

        let debtTableDisplay = '';
        if (totalDebt > 0) {
            debtTableDisplay = `<span style="color:var(--danger); font-weight:600;">GHS ${totalDebt.toFixed(2)}</span>`;
        } else {
            debtTableDisplay = `<span class="badge badge-active">Paid Full</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.studentId}</strong></td>
            <td>${s.name}</td>
            <td>${s.className || 'Unassigned'}</td>
            <td>${s.gender || '-'}</td>
            <td>${debtTableDisplay}</td>
            <td><span class="badge badge-${s.status === 'active' ? 'active' : 'inactive'}">${s.status}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-primary" onclick="editStudent('${s.id}')">View</button>
                    <button class="btn btn-success" onclick="openArrearsModal('${s.id}')"><i class="fas fa-edit"></i> Arrears</button>
                    <button class="btn btn-danger" onclick="deleteStudent('${s.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.deleteStudent = async function (id) {
    if (confirm('Are you sure you want to permanently REMOVE this student? This will also delete their login account and history.')) {
        const student = DB.findById('students', id);
        if (student) {
            // Update admission status if linked
            if (student.admissionId) {
                await DB.update('admissions', student.admissionId, { status: 'removed' });
            } else {
                // Try to find admission by name if ID link is missing (for older records)
                const adm = DB.findOne('admissions', { childName: student.name, status: 'approved' });
                if (adm) await DB.update('admissions', adm.id, { status: 'removed' });
            }

            await DB.delete('users', student.userId);
            await DB.delete('students', id);
            await DB.logAction('Deleted Student', `Name: ${student.name}, ID: ${student.studentId}`);
            loadStudents();
            loadUsers(); // Refresh Users Master List
            if (document.getElementById('dashboard').classList.contains('active')) loadDashboard();
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

    // Calculate Real Debt
    const totalDebt = DB.calculateStudentDebt(s);

    let debtDisplay = '';
    if (totalDebt > 0) {
        debtDisplay = `<span style="color:var(--danger); font-weight:bold;">Current Debt: GHS ${totalDebt.toFixed(2)}</span>`;
    } else {
        debtDisplay = `<span style="color:var(--success); font-weight:bold;">Status: Paid Full</span>`;
    }

    const view = document.getElementById('studentDetailsView');
    view.innerHTML = `
        <div><strong>Full Name:</strong><br>${s.name}</div>
        <div><strong>Student ID:</strong><br>${s.studentId}</div>
        <div><strong>Gender:</strong><br>${s.gender || '-'}</div>
        <div><strong>Class:</strong><br>${s.className || 'Unassigned'}</div>
        <div><strong>Status:</strong><br><span class="badge badge-${s.status === 'active' ? 'active' : 'inactive'}">${s.status}</span></div>
        <div><strong>Guardian Name:</strong><br>${s.guardianName || 'N/A'}</div>
        <div><strong>Guardian Phone:</strong><br>${s.guardianPhone || 'N/A'}</div>
        <div><strong>Financial Status:</strong><br>${debtDisplay}</div>
        <div><strong>Enrollment Date:</strong><br>${new Date(s.createdAt).toLocaleDateString()}</div>
    `;

    showModal('viewStudentModal');
}

function loadAnnouncements() {
    const list = document.getElementById('adminAnnouncementsList');
    if (!list) return;
    list.innerHTML = '';
    const anns = DB.getTable('announcements').sort((a, b) => new Date(b.date) - new Date(a.date));

    if (anns.length === 0) {
        list.innerHTML = '<p style="color:#666; padding: 15px;">No announcements posted yet.</p>';
        return;
    }

    anns.forEach(a => {
        const div = document.createElement('div');
        div.style.padding = '15px';
        div.style.borderBottom = '1px solid #eee';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${a.title}</strong>
                <div style="display:flex; gap:10px; align-items:center;">
                    <span class="badge badge-active">${a.target}</span>
                    <button class="btn btn-danger" style="padding:2px 6px; font-size:0.7rem;" onclick="window.deleteAnnouncement('${a.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <p style="margin:10px 0; font-size:0.95rem; color:#444">${a.body}</p>
            <small style="color:#888">${new Date(a.date).toLocaleString()} By ${a.author}</small>
        `;
        list.appendChild(div);
    });
}

window.deleteAnnouncement = async function(id) {
    if(confirm('Are you sure you want to delete this announcement?')) {
        await DB.delete('announcements', id);
        await DB.logAction('Deleted Announcement', `Announcement ID: ${id}`);
        loadAnnouncements();
    }
}

function loadFees() {
    const tbody = document.querySelector('#feesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const payments = DB.getTable('payments').sort((a, b) => new Date(b.date) - new Date(a.date));
    const students = DB.getTable('students');

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No payment records found.</td></tr>';
        return;
    }

    payments.forEach(p => {
        const student = students.find(s => s.studentId === p.studentId);
        const tr = document.createElement('tr');
        
        let statusBadge = '';
        if (p.status === 'Paid') statusBadge = '<span class="badge badge-active">Paid</span>';
        else if (p.status === 'Pending Verification') statusBadge = '<span class="badge badge-pending">Pending Verification</span>';
        else statusBadge = `<span class="badge badge-inactive">${p.status || 'Pending'}</span>`;

        let actionBtns = '';
        if (p.status === 'Pending Verification') {
            actionBtns = `
                <div class="action-btns">
                    <button class="btn btn-success" style="padding:4px 8px; font-size:0.8rem;" onclick="window.verifyPayment('${p.id}')" title="Approve Payment"><i class="fas fa-check"></i> Verify</button>
                    <button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="window.deletePayment('${p.id}')" title="Delete/Reject Notice"><i class="fas fa-trash"></i></button>
                </div>
            `;
        } else {
            actionBtns = `
                <button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="window.deletePayment('${p.id}')" title="Delete Record"><i class="fas fa-trash"></i></button>
            `;
        }

        tr.innerHTML = `
            <td>${new Date(p.date).toLocaleDateString()}</td>
            <td><strong>${student ? student.name : p.studentId}</strong><br><small>${p.studentId}</small></td>
            <td>GHS ${parseFloat(p.amountPaid).toFixed(2)}</td>
            <td>${p.receiptNo}</td>
            <td>${statusBadge}</td>
            <td>${actionBtns}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.verifyPayment = async function(id) {
    if (!confirm('Mark this payment as Verified and Paid?')) return;
    const payment = DB.findById('payments', id);
    if (payment) {
        await DB.update('payments', id, { status: 'Paid' });
        await DB.logAction('Verified Payment', `Ref: ${payment.receiptNo}, Student: ${payment.studentId}, Amount: ${payment.amountPaid}`);
        loadFees();
        alert('Payment verified successfully!');
    }
}

window.deletePayment = async function(id) {
    if (!confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) return;
    await DB.delete('payments', id);
    await DB.logAction('Deleted Payment Record', `ID: ${id}`);
    loadFees();
}

function loadResults() {
    const tbody = document.querySelector('#resultsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Populate filter classes if empty (only once or on each load)
    const filterClass = document.getElementById('filterResultClass');
    if (filterClass && filterClass.options.length <= 1) {
        DB.getTable('classes').forEach(c => {
            filterClass.add(new Option(c.name, c.name));
        });
    }

    const classF = document.getElementById('filterResultClass')?.value || 'all';
    const statusF = document.getElementById('filterResultStatus')?.value || 'all';

    let results = DB.getTable('results');
    
    if (classF !== 'all') results = results.filter(r => r.classId === classF);
    if (statusF !== 'all') results = results.filter(r => r.status === statusF);

    results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No results found for this selection.</td></tr>';
        return;
    }

    results.forEach(res => {
        const tr = document.createElement('tr');
        
        let statusBadge = '';
        if (res.status === 'submitted') statusBadge = '<span class="badge badge-pending">Submitted</span>';
        else if (res.status === 'published') statusBadge = '<span class="badge badge-active">Published</span>';
        else if (res.status === 'rejected') statusBadge = '<span class="badge badge-rejected">Rejected</span>';
        else statusBadge = `<span class="badge badge-inactive">${res.status}</span>`;

        let actionBtns = '';
        if (res.status === 'submitted') {
            actionBtns = `
                <div class="action-btns">
                    <button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem;" onclick="viewResult('${res.id}')">View</button>
                    <button class="btn btn-success" style="padding:4px 8px; font-size:0.8rem;" onclick="approveResult('${res.id}')"><i class="fas fa-check"></i></button>
                </div>
            `;
        } else {
            actionBtns = `<button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem;" onclick="viewResult('${res.id}')">View</button>`;
        }

        tr.innerHTML = `
            <td><strong>${res.studentName}</strong><br><small>${res.studentId}</small></td>
            <td>${res.classId}</td>
            <td>${res.subject}</td>
            <td>${res.term}</td>
            <td><strong>${res.total}</strong></td>
            <td>${statusBadge}</td>
            <td>${actionBtns}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.viewResult = function(id) {
    const res = DB.findById('results', id);
    if (!res) return;

    const view = document.getElementById('resultDetailsView');
    const actions = document.getElementById('resultModalActions');
    
    view.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
            <div><strong>Student:</strong><br>${res.studentName} (${res.studentId})</div>
            <div><strong>Teacher:</strong><br>${res.teacherName || 'Unknown'}</div>
            <div><strong>Class/Subject:</strong><br>${res.classId} - ${res.subject}</div>
            <div><strong>Term:</strong><br>${res.term}</div>
            <div style="background:#f9f9f9; padding:10px; border-radius:5px;">
                <strong>Class Score:</strong><br><span style="font-size:1.2rem;">${res.classScore}</span> / 40
            </div>
            <div style="background:#f9f9f9; padding:10px; border-radius:5px;">
                <strong>Exam Score:</strong><br><span style="font-size:1.2rem;">${res.examScore}</span> / 60
            </div>
        </div>
        <div style="margin-top:15px; background:var(--blue); color:white; padding:15px; border-radius:5px; text-align:center;">
            <strong>Total Score:</strong><br><span style="font-size:2rem; font-weight:bold;">${res.total}</span>
        </div>
        <div style="margin-top:15px;">
            <strong>Teacher Remark:</strong><br>
            <p style="font-style:italic; color:#444;">"${res.remark || 'No remark provided.'}"</p>
        </div>
        ${res.status === 'rejected' ? `<div style="margin-top:10px; color:var(--danger);"><strong>Rejection Reason:</strong><br>${res.rejectionReason}</div>` : ''}
    `;

    actions.innerHTML = '';
    if (res.status === 'submitted') {
        actions.innerHTML = `
            <button class="btn btn-danger" onclick="rejectResult('${res.id}'); hideModal('viewResultModal');">Reject</button>
            <button class="btn btn-success" onclick="approveResult('${res.id}'); hideModal('viewResultModal');">Approve & Publish</button>
        `;
    } else {
        actions.innerHTML = `<button class="btn btn-primary" onclick="hideModal('viewResultModal')">Close</button>`;
    }

    showModal('viewResultModal');
}

window.approveResult = async function(id) {
    if (!confirm('Approve and publish this result? It will be visible to parents/students.')) return;
    
    const res = DB.findById('results', id);
    if (res) {
        await DB.update('results', id, { status: 'published' });
        await DB.logAction('Approved Result', `Student: ${res.studentName}, Subject: ${res.subject}, Term: ${res.term}`);
        loadResults();
        alert('Result approved and published successfully!');
    }
}

window.rejectResult = async function(id) {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return; // Cancelled

    const res = DB.findById('results', id);
    if (res) {
        await DB.update('results', id, { status: 'rejected', rejectionReason: reason });
        await DB.logAction('Rejected Result', `Student: ${res.studentName}, Subject: ${res.subject}, Reason: ${reason}`);
        loadResults();
        alert('Result rejected.');
    }
}

function loadTimetables() {
    const tbody = document.querySelector('#timetablesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const tts = DB.getTable('timetables').sort((a, b) => new Date(b.date) - new Date(a.date));

    if (tts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No timetables uploaded yet.</td></tr>';
        return;
    }

    tts.forEach(tt => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${tt.title}</strong><br><small>${tt.fileName}</small></td>
            <td><span class="badge badge-active">${tt.target}</span></td>
            <td>${new Date(tt.date).toLocaleDateString()}</td>
            <td>
                <div class="action-btns">
                    <a href="${tt.content}" target="_blank" class="btn btn-primary" style="text-decoration:none; padding:5px 10px;">View</a>
                    <button class="btn btn-danger" onclick="deleteTimetable('${tt.id}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.deleteTimetable = async function(id) {
    if (confirm('Are you sure you want to delete this timetable?')) {
        const tt = DB.findById('timetables', id);
        if (tt) {
            await DB.delete('timetables', id);
            await DB.logAction('Deleted Timetable', `Title: ${tt.title}`);
            loadTimetables();
        }
    }
}

function loadUsers() {
    const tbody = document.querySelector('#usersMasterTable tbody');
    if (!tbody) return;

    const query = document.getElementById('searchUserInput')?.value.toLowerCase() || '';
    const roleF = document.getElementById('filterUserRole')?.value || 'all';
    const statusF = document.getElementById('filterUserStatus')?.value || 'all';

    let users = DB.getTable('users');

    // Filtering
    if (query) {
        users = users.filter(u => 
            u.name.toLowerCase().includes(query) || 
            u.username.toLowerCase().includes(query)
        );
    }
    if (roleF !== 'all') users = users.filter(u => u.role === roleF);
    if (statusF !== 'all') {
        users = users.filter(u => {
            if (statusF === 'active') return u.status !== 'inactive';
            return u.status === 'inactive';
        });
    }

    tbody.innerHTML = '';
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No users found.</td></tr>';
        return;
    }

    users.forEach(u => {
        const tr = document.createElement('tr');
        const isActive = u.status !== 'inactive';
        tr.innerHTML = `
            <td><strong>${u.name}</strong></td>
            <td>${u.username}</td>
            <td><span class="badge ${u.role === 'admin' ? 'badge-active' : 'badge-pending'}">${u.role.toUpperCase()}</span></td>
            <td><span class="badge ${isActive ? 'badge-active' : 'badge-rejected'}">${isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-primary" onclick="window.openResetPasswordModal('${u.id}')" title="Reset Password"><i class="fas fa-key"></i></button>
                    <button class="btn ${isActive ? 'btn-danger' : 'btn-success'}" onclick="window.toggleUserStatus('${u.id}')" title="${isActive ? 'Deactivate' : 'Activate'}">
                        <i class="fas ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                    <button class="btn btn-danger" onclick="window.deleteUser('${u.id}')" title="Delete Account"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.deleteUser = async function(id) {
    const user = DB.findById('users', id);
    if (!user) return;

    if (user.role === 'admin') {
        alert('Cannot delete an administrator account for security reasons. Please contact system support.');
        return;
    }

    if (confirm(`Are you sure you want to PERMANENTLY delete the account for ${user.name}? This will also remove their student/teacher profile data.`)) {
        // If teacher, remove teacher profile
        if (user.role === 'teacher') {
            const teacher = DB.findOne('teachers', { user_id: id });
            if (teacher) await DB.delete('teachers', teacher.id);
        }
        // If student, remove student profile and update admissions
        if (user.role === 'student') {
            const student = DB.findOne('students', { user_id: id });
            if (student) {
                // if (student.admissionId) await DB.update('admissions', student.admissionId, { status: 'removed' });
                await DB.delete('students', student.id);
            }
        }

        await DB.delete('users', id);
        await DB.logAction('Deleted User Account', `User: ${user.username}, Name: ${user.name}`);
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
        const msg = `Are you sure you want to ${newStatus === 'inactive' ? 'DEACTIVATE' : 'ACTIVATE'} this user account?`;
        if (confirm(msg)) {
            await DB.update('users', id, { status: newStatus });
            await DB.logAction(newStatus === 'inactive' ? 'Deactivated User' : 'Activated User', `User: ${user.username}`);
            loadUsers();
        }
    }
}

function loadAttendance() {
    const panel = document.getElementById('attendancePanel');
    if (!panel) return;
    
    // Check if we already have the filter UI
    let filterRow = panel.querySelector('.form-row-3');
    if(!filterRow) {
        const panel = document.querySelector('#attendance .panel');
        panel.innerHTML = `
            <div class="form-row-3" style="margin-bottom:20px;">
                <div class="form-group">
                    <label>View By Class</label>
                    <select id="admAttClass" class="form-control">
                        <option value="all">All Classes</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>View By Date</label>
                    <input type="date" id="admAttDate" class="form-control">
                </div>
                <div style="display:flex; align-items:flex-end;">
                    <button class="btn btn-primary" onclick="loadAttendance()" style="width:100%"><i class="fas fa-filter"></i> Filter</button>
                </div>
            </div>
            <div class="table-container">
                <table class="table" id="attendanceOverviewTable">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Student</th>
                            <th>Class</th>
                            <th>Status</th>
                            <th>Remark</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `;
        
        // Populate classes
        const classSelect = document.getElementById('admAttClass');
        DB.getTable('classes').forEach(c => classSelect.add(new Option(c.name, c.name)));
        document.getElementById('admAttDate').valueAsDate = new Date();
    }

    const classF = document.getElementById('admAttClass')?.value || 'all';
    const dateF = document.getElementById('admAttDate')?.value;
    const listBody = document.querySelector('#attendanceOverviewTable tbody');
    
    let records = DB.getTable('attendance');
    if(dateF) records = records.filter(r => r.date === dateF);
    if(classF !== 'all') records = records.filter(r => r.className === classF);

    records.sort((a,b) => new Date(b.date) - new Date(a.date));

    listBody.innerHTML = '';
    if(records.length === 0) {
        listBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No attendance records found for this selection.</td></tr>';
        return;
    }

    records.forEach(r => {
        const tr = document.createElement('tr');
        let badgeClass = 'badge-active';
        if(r.status === 'Absent') badgeClass = 'badge-rejected';
        if(r.status === 'Late') badgeClass = 'badge-pending';

        tr.innerHTML = `
            <td>${new Date(r.date).toLocaleDateString()}</td>
            <td><strong>${r.studentName}</strong><br><small>${r.studentId}</small></td>
            <td>${r.className}</td>
            <td><span class="badge ${badgeClass}">${r.status}</span></td>
            <td>${r.remark || '-'}</td>
        `;
        listBody.appendChild(tr);
    });
}

function loadMessages() {
    const tbody = document.querySelector('#messagesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const msgs = DB.getTable('messages').sort((a,b) => {
        const dateA = a.date || a.createdAt || 0;
        const dateB = b.date || b.createdAt || 0;
        return new Date(dateB) - new Date(dateA);
    });

    if (msgs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No messages found.</td></tr>';
        return;
    }

    msgs.forEach(m => {
        const tr = document.createElement('tr');
        const sender = m.senderName || m.fromName || 'System';
        const senderRole = m.senderRole || m.fromRole || 'system';
        const msgDate = m.date || m.createdAt || '';
        tr.innerHTML = `
            <td>${msgDate ? new Date(msgDate).toLocaleString() : '--'}</td>
            <td><strong>${sender}</strong><br><small>${senderRole.toUpperCase()}</small></td>
            <td>${m.subject}</td>
            <td style="max-width:300px; font-size:0.9rem;">${m.body.substring(0, 100)}${m.body.length > 100 ? '...' : ''}</td>
            <td>
                <button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="window.deleteMessage('${m.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.deleteMessage = async function(id) {
    if(confirm('Delete this message?')) {
        await DB.delete('messages', id);
        loadMessages();
    }
}

// ---------------- Report Generation ---------------- //

function getPDFHeader(doc, title) {
    const { jsPDF } = window.jspdf;
    doc.setFontSize(22);
    doc.setTextColor(0, 51, 102);
    doc.text("Elyon Montessori School", 105, 20, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(100);
    doc.text(title, 105, 30, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 38, { align: "center" });
    doc.setDrawColor(0, 51, 102);
    doc.line(15, 42, 195, 42);
}

window.generateStudentReport = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    getPDFHeader(doc, "Master Student Registry");

    const students = DB.getTable('students').sort((a, b) => {
        // Sort by class first, then by name
        if (a.className !== b.className) {
            return a.className.localeCompare(b.className);
        }
        return a.name.localeCompare(b.name);
    });

    const rows = students.map(s => [s.studentId, s.name, s.className, s.gender || '-', s.guardianPhone || '-']);

    doc.autoTable({
        head: [['ID', 'Name', 'Class', 'Gender', 'Contact']],
        body: rows,
        startY: 50,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102] }
    });

    doc.save("Student_Report.pdf");
    DB.logAction('Generated Report', 'Master Student Registry PDF');
}

window.generateTeacherReport = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    getPDFHeader(doc, "Staff & Faculty Directory");

    const teachers = DB.getTable('teachers');
    const rows = teachers.map(t => [t.teacherId || '-', t.name, t.phone || '-', t.classes.join(', ') || 'None']);

    doc.autoTable({
        head: [['ID', 'Name', 'Phone', 'Assigned Classes']],
        body: rows,
        startY: 50,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102] }
    });

    doc.save("Teacher_Directory.pdf");
    DB.logAction('Generated Report', 'Teacher Directory PDF');
}

window.generateDefaultersReport = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    getPDFHeader(doc, "Fee Defaulters List (Debt Summary)");

    const students = DB.getTable('students');
    const classes = DB.getTable('classes');
    const payments = DB.getTable('payments');

    const rows = [];
    students.forEach(s => {
        const totalDebt = DB.calculateStudentDebt(s);
        
        // Fetch total billed for report
        const cls = DB.getTable('classes').find(c => c.id === s.classId || c.name === s.className);
        const tuition = cls ? (cls.tuitionFee || 0) : 0;
        const totalBilled = tuition + (s.arrears || 0);
        const totalPaid = totalBilled - totalDebt;

        if (totalDebt > 0) {
            rows.push([s.name, s.className, totalBilled.toFixed(2), totalPaid.toFixed(2), totalDebt.toFixed(2)]);
        }
    });

    doc.autoTable({
        head: [['Student Name', 'Class', 'Billed (GHS)', 'Paid (GHS)', 'Balance (GHS)']],
        body: rows,
        startY: 50,
        headStyles: { fillColor: [231, 76, 60] } // Red for defaulters
    });

    doc.save("Fee_Defaulters.pdf");
    DB.logAction('Generated Report', 'Fee Defaulters PDF');
}

window.generateFinancialReport = function() {
    const start = document.getElementById('repStartDate').value;
    const end = document.getElementById('repEndDate').value;

    if (!start || !end) return alert("Please select date range.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    getPDFHeader(doc, `Revenue & Financial Summary`);
    doc.setFontSize(11);
    doc.text(`Period: ${start} to ${end}`, 15, 48);

    const payments = DB.getTable('payments').filter(p => {
        const d = p.date.split('T')[0];
        return d >= start && d <= end;
    });

    let totalRevenue = 0;
    const students = DB.getTable('students');
    const rows = payments.map(p => {
        totalRevenue += parseFloat(p.amountPaid);
        const student = students.find(s => s.studentId === p.studentId);
        return [new Date(p.date).toLocaleDateString(), student ? student.name : p.studentId, p.receiptNo, p.amountPaid];
    });

    doc.autoTable({
        head: [['Date', 'Student', 'Receipt #', 'Amount (GHS)']],
        body: rows,
        startY: 55,
        theme: 'striped',
        headStyles: { fillColor: [40, 167, 69] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`TOTAL REVENUE COLLECTED: GHS ${totalRevenue.toFixed(2)}`, 195, finalY, { align: "right" });

    doc.save(`Financial_Report_${start}_${end}.pdf`);
    DB.logAction('Generated Report', `Financial Summary (${start} to ${end})`);
}

// ============================================================
//   SUBJECT MANAGEMENT
// ============================================================
function loadSubjects() {
    const tbody = document.querySelector('#subjectsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = document.getElementById('searchSubject')?.value.toLowerCase() || '';
    const classFilter = document.getElementById('filterSubjectClass')?.value || 'all';

    // Populate class filter if empty
    const filterSel = document.getElementById('filterSubjectClass');
    if (filterSel && filterSel.options.length <= 1) {
        DB.getTable('classes').forEach(c => filterSel.add(new Option(c.name, c.id)));
    }

    let subjects = DB.getTable('subjects');
    if (searchTerm) subjects = subjects.filter(s => s.name.toLowerCase().includes(searchTerm) || (s.code || '').toLowerCase().includes(searchTerm));
    if (classFilter !== 'all') subjects = subjects.filter(s => s.classId === classFilter);

    if (subjects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">No subjects found. Add your first subject!</td></tr>';
        return;
    }

    subjects.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.name}</strong></td>
            <td><span style="font-family:monospace; font-size:0.85rem; background:#f0f0f0; padding:2px 8px; border-radius:4px;">${s.code || '--'}</span></td>
            <td>${s.className || 'All Classes'}</td>
            <td><span class="badge badge-${s.status === 'active' ? 'active' : 'inactive'}">${s.status || 'active'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-primary" onclick="window.editSubject('${s.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger" onclick="window.deleteSubject('${s.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editSubject = async function(id) {
    const s = DB.findById('subjects', id);
    if (!s) return;
    const newName = prompt('Subject Name:', s.name);
    if (newName === null) return;
    const newCode = prompt('Subject Code (e.g. MATH):', s.code || '');
    if (newCode === null) return;
    await DB.update('subjects', id, { name: newName.trim(), code: newCode.trim() });
    await DB.logAction('Updated Subject', `Name: ${newName}`);
    loadSubjects();
}

window.deleteSubject = async function(id) {
    if (!confirm('Delete this subject? This cannot be undone.')) return;
    const s = DB.findById('subjects', id);
    if (s) {
        await DB.delete('subjects', id);
        await DB.logAction('Deleted Subject', `Name: ${s.name}`);
        loadSubjects();
    }
}

// ============================================================
//   ACADEMIC TERMS MANAGEMENT
// ============================================================
function loadTerms() {
    const tbody = document.querySelector('#termsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const terms = DB.getTable('terms').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Show active term badge at top
    const activeTerm = terms.find(t => t.isActive);
    const activeDisplay = document.getElementById('activeTermDisplay');
    if (activeDisplay) {
        activeDisplay.innerHTML = activeTerm
            ? `<span style="background:#e8f5e9; color:#2e7d32; padding:8px 16px; border-radius:8px; font-weight:700; display:inline-block;"><i class="fas fa-check-circle"></i> Active Term: ${activeTerm.name} &mdash; ${activeTerm.year}</span>`
            : `<span style="color:#888;">No active term set.</span>`;
    }

    if (terms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">No academic terms created yet.</td></tr>';
        return;
    }

    terms.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${t.name}</strong></td>
            <td>${t.year || '--'}</td>
            <td>${t.startDate || '--'}</td>
            <td>${t.endDate || '--'}</td>
            <td>${t.isActive ? '<span class="badge badge-active">ACTIVE</span>' : '<span class="badge badge-inactive">Inactive</span>'}</td>
            <td>
                <div class="action-btns">
                    ${!t.isActive ? `<button class="btn btn-success" onclick="window.setActiveTerm('${t.id}')"><i class="fas fa-check"></i> Set Active</button>` : ''}
                    <button class="btn btn-danger" onclick="window.deleteTerm('${t.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.setActiveTerm = async function(id) {
    if (!confirm('Set this as the current active term? The previous active term will be deactivated.')) return;
    const allTerms = DB.getTable('terms');
    for (const t of allTerms) {
        await DB.update('terms', t.id, { isActive: false });
    }
    await DB.update('terms', id, { isActive: true });
    const term = DB.findById('terms', id);
    await DB.logAction('Set Active Term', `Term: ${term.name}, Year: ${term.year}`);
    loadTerms();
    alert(`"${term.name}" is now the active academic term.`);
}

window.deleteTerm = async function(id) {
    if (!confirm('Delete this term? This action cannot be undone.')) return;
    const t = DB.findById('terms', id);
    if (t) {
        await DB.delete('terms', id);
        await DB.logAction('Deleted Term', `Term: ${t.name}`);
        loadTerms();
    }
}

// ============================================================
//   LIBRARY MODULE
// ============================================================
function loadLibrary() {
    loadBookCatalogue();
    loadActiveIssues();
}

function loadBookCatalogue() {
    const tbody = document.querySelector('#booksTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = document.getElementById('searchBook')?.value.toLowerCase() || '';
    let books = DB.getTable('library_books');
    if (searchTerm) books = books.filter(b => b.title.toLowerCase().includes(searchTerm) || (b.author || '').toLowerCase().includes(searchTerm));

    // Stats
    const totalBooks = books.reduce((a, b) => a + (b.totalCopies || 1), 0);
    const available  = books.reduce((a, b) => a + (b.availableCopies || 0), 0);
    const issued     = totalBooks - available;
    document.getElementById('libStatTotal') && (document.getElementById('libStatTotal').textContent = totalBooks);
    document.getElementById('libStatAvail') && (document.getElementById('libStatAvail').textContent = available);
    document.getElementById('libStatIssued') && (document.getElementById('libStatIssued').textContent = issued);

    if (books.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#888;">No books in library. Add your first book!</td></tr>';
        return;
    }

    books.forEach(b => {
        const avail = b.availableCopies || 0;
        const statusBadge = avail > 0
            ? `<span class="badge badge-active">${avail} Available</span>`
            : `<span class="badge badge-rejected">Out of Stock</span>`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${b.title}</strong></td>
            <td>${b.author || '--'}</td>
            <td><span style="font-family:monospace; font-size:0.8rem;">${b.isbn || '--'}</span></td>
            <td>${b.category || '--'}</td>
            <td>${b.totalCopies || 1}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-success" onclick="window.openIssueModal('${b.id}')" ${avail < 1 ? 'disabled' : ''}><i class="fas fa-hand-holding"></i> Issue</button>
                    <button class="btn btn-danger" onclick="window.deleteBook('${b.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function loadDepartments() {
    const tbody = document.querySelector('#deptsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const depts = DB.getTable('departments');

    if (depts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No departments recorded.</td></tr>';
        return;
    }

    depts.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${d.name}</strong></td>
            <td>${d.head || 'N/A'}</td>
            <td><button class="btn btn-danger" onclick="DB.delete('departments', '${d.id}'); loadDepartments();"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

// ---------------- SYSTEM BACKUP & RESTORE ---------------- //
window.exportSystemBackup = function() {
    const backupData = {};
    const tables = [
        'users', 'students', 'teachers', 'classes', 'departments', 'subjects', 'terms', 'attendance', 
        'results', 'announcements', 'payments', 'learning_materials', 'timetables', 'messages',
        'audit_logs', 'library_books', 'library_issues', 'expenses'
    ];

    tables.forEach(table => {
        backupData[table] = DB.getTable(table);
    });

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'EMS_Backup_' + new Date().toISOString().split('T')[0] + '.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    DB.logAction('System Backup', `Exported all data to ${exportFileDefaultName}`);
}

window.triggerImport = function() {
    document.getElementById('importFile').click();
}

window.importSystemBackup = function(input) {
    const file = input.files[0];
    if (!file) return;

    if (!confirm('WARNING: Restoring data will overwrite all current school records. Are you absolutely sure?')) {
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            const tables = Object.keys(importedData);
            
            tables.forEach(table => {
                DB.saveTable(table, importedData[table]);
            });

            alert('System Data Restored Successfully! The page will now reload.');
            DB.logAction('System Restore', `Imported data from ${file.name}`);
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Error: Failed to parse backup file. Please ensure it is a valid JSON export.');
        }
    };
    reader.readAsText(file);
}

// Update loadSectionData to support 'system' and 'classes' dept loading
const originalLoadSectionData = loadSectionData;
loadSectionData = function(section) {
    originalLoadSectionData(section);
    if (section === 'classes') loadDepartments();
}


function loadActiveIssues() {
    const tbody = document.querySelector('#issuesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const issues = DB.getTable('library_issues')
        .filter(i => i.status === 'issued')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    if (issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">No active book issues.</td></tr>';
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    issues.forEach(i => {
        const overdue = i.dueDate && i.dueDate < today;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${i.bookTitle}</strong></td>
            <td>${i.borrower}</td>
            <td><span class="badge badge-pending">${i.borrowerType}</span></td>
            <td>${i.issueDate}</td>
            <td style="${overdue ? 'color:var(--danger); font-weight:700;' : ''}">${i.dueDate} ${overdue ? '<span class="badge badge-rejected">Overdue</span>' : ''}</td>
            <td>
                <button class="btn btn-success" onclick="window.returnBook('${i.id}')"><i class="fas fa-undo"></i> Return</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openIssueModal = function(bookId) {
    const book = DB.findById('library_books', bookId);
    if (!book) return;
    document.getElementById('issueBookId').value = bookId;
    document.getElementById('issueBookName').textContent = book.title;
    document.getElementById('issueDueDate').valueAsDate = new Date(Date.now() + 14 * 86400000); // 2 weeks default
    document.getElementById('formIssueBook').reset();
    document.getElementById('issueBookId').value = bookId; // re-set after reset
    showModal('issueBookModal');
}

window.returnBook = async function(issueId) {
    if (!confirm('Confirm book return?')) return;
    const issue = DB.findById('library_issues', issueId);
    if (issue) {
        await DB.update('library_issues', issueId, { status: 'returned', returnDate: new Date().toISOString().split('T')[0] });
        const book = DB.findById('library_books', issue.bookId);
        if (book) {
            const newAvail = (book.availableCopies || 0) + 1;
            await DB.update('library_books', issue.bookId, { availableCopies: newAvail, status: newAvail > 0 ? 'available' : 'out' });
        }
        await DB.logAction('Book Returned', `Book: ${issue.bookTitle}, Borrower: ${issue.borrower}`);
        loadLibrary();
        alert('Book returned successfully!');
    }
}

window.deleteBook = async function(id) {
    if (!confirm('Remove this book from the library catalogue?')) return;
    const book = DB.findById('library_books', id);
    if (book) {
        await DB.delete('library_books', id);
        await DB.logAction('Deleted Book', `Title: ${book.title}`);
        loadBookCatalogue();
    }
}
