// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Authenticate
    const user = DB.requireAuth('admin');
    if (!user) return; // redirect happens in requireAuth

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
    else if (section === 'announcements') loadAnnouncements();
    else if (section === 'results') loadResults();
    else if (section === 'timetable') loadTimetables();
    else if (section === 'attendance') loadAttendance();
    else if (section === 'users') loadUsers();
    // others can be added as needed
}

function setupForms() {
    // Add Teacher Form
    const teacherForm = document.getElementById('formAddTeacher');
    if (teacherForm) {
        teacherForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('tName').value;
            const phone = document.getElementById('tPhone').value;
            const password = document.getElementById('tPassword').value;

            // Auto-generate Teacher ID
            const teacherId = 'TCH' + Math.floor(1000 + Math.random() * 9000);
            const username = teacherId;

            // Add to users
            const newUser = DB.insert('users', {
                username,
                password,
                role: 'teacher',
                name,
                status: 'active'
            });

            // Add to teachers
            DB.insert('teachers', {
                userId: newUser.id,
                teacherId,
                name,
                phone,
                classes: [],
                subjects: [],
                status: 'active'
            });

            DB.logAction('Created Teacher', `Name: ${name}, ID: ${teacherId}, Phone: ${phone}`);

            hideModal('teacherModal');
            document.getElementById('formAddTeacher').reset();
            loadTeachers();
            if (document.getElementById('dashboard').classList.contains('active')) loadDashboard();
        });
    }

    // Add Class Form
    const classForm = document.getElementById('formAddClass');
    if (classForm) {
        classForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('cName').value;

            DB.insert('classes', {
                name,
                teacherId: null
            });

            DB.logAction('Created Class', `Name: ${name}`);

            hideModal('classModal');
            document.getElementById('formAddClass').reset();
            loadClasses();
            if (document.getElementById('dashboard').classList.contains('active')) loadDashboard();
        });
    }

    // Add Announcement
    const annForm = document.getElementById('announcementForm');
    if (annForm) {
        annForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('annTitle').value;
            const target = document.getElementById('annTarget').value;
            const body = document.getElementById('annBody').value;
            const user = DB.getCurrentUser();

            DB.insert('announcements', {
                title, target, body, author: user.name, date: new Date().toISOString()
            });

            document.getElementById('announcementForm').reset();
            loadAnnouncements();
        });
    }

    // Add Student Manually Form
    const studentForm = document.getElementById('formAddStudent');
    if (studentForm) {
        studentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('sName').value;
            const classId = document.getElementById('sClass').value;
            const className = document.getElementById('sClass').options[document.getElementById('sClass').selectedIndex].text;
            const gender = document.getElementById('sGender').value;
            const gName = document.getElementById('sGName').value;
            const gPhone = document.getElementById('sGPhone').value;
            const arrears = document.getElementById('sArrears').value;

            // Create user
            const studentId = 'STU' + Math.floor(1000 + Math.random() * 9000);
            const newUser = DB.insert('users', {
                username: studentId,
                password: 'password123',
                role: 'student',
                name,
                status: 'active'
            });

            // Create student
            DB.insert('students', {
                userId: newUser.id,
                studentId,
                name,
                classId,
                className,
                gender,
                guardianName: gName,
                guardianPhone: gPhone,
                arrears: parseFloat(arrears) || 0,
                status: 'active'
            });

            DB.logAction('Registered Student', `Name: ${name}, Generated ID: ${studentId}, Arrears: ${arrears}`);

            hideModal('studentModal');
            document.getElementById('formAddStudent').reset();
            loadStudents();
            if (document.getElementById('dashboard').classList.contains('active')) loadDashboard();
        });
    }

    // Record Payment Form
    const paymentForm = document.getElementById('formRecordPayment');
    if (paymentForm) {
        paymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const studentId = document.getElementById('pStudent').value;
            const amount = document.getElementById('pAmount').value;
            const receipt = document.getElementById('pReceipt').value;
            const status = document.getElementById('pStatus').value;

            DB.insert('payments', {
                studentId,
                amountPaid: amount,
                receiptNo: receipt,
                status,
                date: new Date().toISOString()
            });

            DB.logAction('Recorded Payment', `Student ID: ${studentId}, Amount: ${amount}`);

            hideModal('paymentModal');
            document.getElementById('formRecordPayment').reset();
            loadFees();
        });
    }

    // Set Class Fees Form
    const setFeesForm = document.getElementById('formSetFees');
    if (setFeesForm) {
        setFeesForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const classId = document.getElementById('feeClassId').value;
            const amount = document.getElementById('feeAmount').value;

            DB.update('classes', classId, { tuitionFee: parseFloat(amount) });
            DB.logAction('Updated Class Fees', `Class ID: ${classId}, New Fee: ${amount}`);

            alert('Tuition fee updated successfully for this class!');
            hideModal('setFeesModal');
            document.getElementById('formSetFees').reset();
        });
    }

    // Update Arrears Form
    const arrearsForm = document.getElementById('formUpdateArrears');
    if (arrearsForm) {
        arrearsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('adjStudId').value;
            const amount = document.getElementById('adjAmount').value;

            DB.update('students', id, { arrears: parseFloat(amount) || 0 });
            DB.logAction('Updated Arrears', `Student ID: ${id}, New Arrears: ${amount}`);

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
            reader.onload = function(event) {
                const base64Content = event.target.result;
                
                DB.insert('timetables', {
                    title,
                    target,
                    fileName: file.name,
                    content: base64Content,
                    date: new Date().toISOString()
                });

                DB.logAction('Uploaded Timetable', `Title: ${title}, Target: ${target}`);
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
        resetPassForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('resetUserId').value;
            const newPass = document.getElementById('newPassword').value;

            if (newPass.length < 5) return alert('Password too short.');

            const user = DB.findById('users', id);
            if (user) {
                DB.update('users', id, { password: newPass });
                DB.logAction('Reset Password', `User: ${user.username} (${user.role})`);
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

window.approveAdmission = function (id) {
    if (!confirm('Approve this applicant and create student record?')) return;

    const adm = DB.findById('admissions', id);
    if (adm) {
        DB.update('admissions', id, { status: 'approved' });

        // Create user
        const studentId = 'STU' + Math.floor(1000 + Math.random() * 9000);
        const newUser = DB.insert('users', {
            username: studentId,
            password: 'password123', // default
            role: 'student',
            name: adm.childName,
            status: 'active'
        });

        // Create student
        DB.insert('students', {
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

        DB.logAction('Approved Admission', `Applicant: ${adm.childName}, Assigned ID: ${studentId}`);

        loadAdmissions();
        if (document.getElementById('dashboard').classList.contains('active')) loadDashboard();
        alert(`Successfully approved! Generated Student ID: ${studentId}\nDefault password: password123`);
    }
}

window.rejectAdmission = function (id) {
    if (!confirm('Are you sure you want to reject this applicant?')) return;
    const adm = DB.findById('admissions', id);
    if (adm) {
        DB.update('admissions', id, { status: 'rejected' });
        DB.logAction('Rejected Admission', `Applicant: ${adm.childName}`);
        loadAdmissions();
        if (document.getElementById('dashboard').classList.contains('active')) loadDashboard();
    }
}

window.deleteAdmission = function (id) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this admission record from the system?')) return;
    
    const adm = DB.findById('admissions', id);
    if (adm) {
        DB.delete('admissions', id);
        DB.logAction('Deleted Admission Record', `Applicant: ${adm.childName}`);
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
    if (filterSelect && filterSelect.options.length <= 1) { // Populate dynamically
        const classes = [...new Set(DB.getTable('students').map(s => s.className || 'Unassigned'))];
        classes.forEach(c => filterSelect.add(new Option(c, c)));
    }

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No students found.</td></tr>';
        return;
    }

    students.forEach(s => {
        // Calculate Debt
        const cls = DB.getTable('classes').find(c => c.id === s.classId || c.name === s.className);
        const tuition = cls ? (cls.tuitionFee || 0) : 0;
        const payments = DB.find('payments', { studentId: s.studentId });
        const paid = payments.reduce((acc, p) => acc + (parseFloat(p.amountPaid) || 0), 0);
        const totalDebt = (tuition + (s.arrears || 0)) - paid;

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

window.deleteStudent = function (id) {
    if (confirm('Are you sure you want to permanently REMOVE this student? This will also delete their login account and history.')) {
        const student = DB.findById('students', id);
        if (student) {
            // Update admission status if linked
            if (student.admissionId) {
                DB.update('admissions', student.admissionId, { status: 'removed' });
            } else {
                // Try to find admission by name if ID link is missing (for older records)
                const adm = DB.findOne('admissions', { childName: student.name, status: 'approved' });
                if (adm) DB.update('admissions', adm.id, { status: 'removed' });
            }

            DB.delete('users', student.userId);
            DB.delete('students', id);
            DB.logAction('Deleted Student', `Name: ${student.name}, ID: ${student.studentId}`);
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
    const cls = DB.getTable('classes').find(c => c.id === s.classId || c.name === s.className);
    const tuition = cls ? (cls.tuitionFee || 0) : 0;
    const payments = DB.find('payments', { studentId: s.studentId });
    const paid = payments.reduce((acc, p) => acc + (parseFloat(p.amountPaid) || 0), 0);
    const totalDebt = (tuition + (s.arrears || 0)) - paid;

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
                <span class="badge badge-active">${a.target}</span>
            </div>
            <p style="margin:10px 0; font-size:0.95rem; color:#444">${a.body}</p>
            <small style="color:#888">${new Date(a.date).toLocaleString()} By ${a.author}</small>
        `;
        list.appendChild(div);
    });
}

function loadFees() {
    const tbody = document.querySelector('#feesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const payments = DB.getTable('payments').sort((a, b) => new Date(b.date) - new Date(a.date));

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No payment records found.</td></tr>';
        return;
    }

    payments.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(p.date).toLocaleDateString()}</td>
            <td><strong>${p.studentId}</strong></td>
            <td>GHS ${parseFloat(p.amountPaid).toFixed(2)}</td>
            <td>${p.receiptNo}</td>
            <td><span class="badge ${p.status === 'Paid' ? 'badge-active' : 'badge-pending'}">${p.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function loadResults() {
    const tbody = document.querySelector('#resultsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const results = DB.getTable('results').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No results submitted for approval.</td></tr>';
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

window.approveResult = function(id) {
    if (!confirm('Approve and publish this result? It will be visible to parents/students.')) return;
    
    const res = DB.findById('results', id);
    if (res) {
        DB.update('results', id, { status: 'published' });
        DB.logAction('Approved Result', `Student: ${res.studentName}, Subject: ${res.subject}, Term: ${res.term}`);
        loadResults();
        alert('Result approved and published successfully!');
    }
}

window.rejectResult = function(id) {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return; // Cancelled

    const res = DB.findById('results', id);
    if (res) {
        DB.update('results', id, { status: 'rejected', rejectionReason: reason });
        DB.logAction('Rejected Result', `Student: ${res.studentName}, Subject: ${res.subject}, Reason: ${reason}`);
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

window.deleteTimetable = function(id) {
    if (confirm('Are you sure you want to delete this timetable?')) {
        const tt = DB.findById('timetables', id);
        if (tt) {
            DB.delete('timetables', id);
            DB.logAction('Deleted Timetable', `Title: ${tt.title}`);
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

window.deleteUser = function(id) {
    const user = DB.findById('users', id);
    if (!user) return;

    if (user.role === 'admin') {
        alert('Cannot delete an administrator account for security reasons. Please contact system support.');
        return;
    }

    if (confirm(`Are you sure you want to PERMANENTLY delete the account for ${user.name}? This will also remove their student/teacher profile data.`)) {
        // If teacher, remove teacher profile
        if (user.role === 'teacher') {
            const teacher = DB.findOne('teachers', { userId: id });
            if (teacher) DB.delete('teachers', teacher.id);
        }
        // If student, remove student profile and update admissions
        if (user.role === 'student') {
            const student = DB.findOne('students', { userId: id });
            if (student) {
                if (student.admissionId) DB.update('admissions', student.admissionId, { status: 'removed' });
                DB.delete('students', student.id);
            }
        }

        DB.delete('users', id);
        DB.logAction('Deleted User Account', `User: ${user.username}, Name: ${user.name}`);
        loadUsers();
        // Refresh other tables if they are visible
        if (document.getElementById('teachers').classList.contains('active')) loadTeachers();
        if (document.getElementById('students').classList.contains('active')) loadStudents();
        if (document.getElementById('admissions').classList.contains('active')) loadAdmissions();
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

window.toggleUserStatus = function(id) {
    const user = DB.findById('users', id);
    if (user) {
        const newStatus = (user.status === 'inactive') ? 'active' : 'inactive';
        const msg = `Are you sure you want to ${newStatus === 'inactive' ? 'DEACTIVATE' : 'ACTIVATE'} this user account?`;
        if (confirm(msg)) {
            DB.update('users', id, { status: newStatus });
            DB.logAction(newStatus === 'inactive' ? 'Deactivated User' : 'Activated User', `User: ${user.username}`);
            loadUsers();
        }
    }
}

function loadAttendance() {
    const tbody = document.querySelector('#attendanceTable tbody');
    if (!tbody) return;
    
    // Check if we already have the filter UI
    let filterRow = document.querySelector('#attendance .panel .form-row');
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
        const cls = classes.find(c => c.name === s.className);
        const tuition = cls ? (cls.tuitionFee || 0) : 0;
        const totalBilled = tuition + (s.arrears || 0);
        
        const studPayments = payments.filter(p => p.studentId === s.studentId);
        let totalPaid = 0;
        studPayments.forEach(p => totalPaid += parseFloat(p.amountPaid || 0));
        
        const balance = totalBilled - totalPaid;

        if (balance > 0) {
            rows.push([s.name, s.className, totalBilled.toFixed(2), totalPaid.toFixed(2), balance.toFixed(2)]);
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
    const rows = payments.map(p => {
        totalRevenue += parseFloat(p.amountPaid);
        return [new Date(p.date).toLocaleDateString(), p.studentName, p.receiptNo, p.amountPaid];
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
