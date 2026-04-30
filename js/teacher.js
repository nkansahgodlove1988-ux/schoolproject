document.addEventListener('DOMContentLoaded', async () => {
    await DB.init();
    const user = DB.requireAuth('teacher');
    if (!user) return;
    
    document.getElementById('currentTeacherName').innerText = user.name || 'Teacher';
    document.getElementById('dashName').innerText = user.name || 'Teacher';

    loadTeacherDashboard();
    loadAnnouncements();

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
            
            if (target === 'dashboard') loadTeacherDashboard();
            if (target === 'profile') loadProfile();
            if (target === 'materials') loadMaterials();
            if (target === 'timetable') loadTimetables();
            if (target === 'communication') loadTeacherMessages();
            if (target === 'fees') {
                document.getElementById('feeResultArea').style.display = 'none';
                document.getElementById('feeNotFound').style.display = 'none';
                document.getElementById('searchFeeStudId').value = '';
            }
            if(target === 'attendance') {
                document.getElementById('attDate').valueAsDate = new Date();
                loadAttendanceGrid();
            }
            if(target === 'assignments') loadMaterials();
            if(target === 'profile') loadProfile();
        });
    });

    if(toggleBtn) toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        if(overlay) overlay.classList.toggle('active');
    });

    if(overlay) overlay.addEventListener('click', closeSidebar);

    document.getElementById('searchTeacherStudent')?.addEventListener('input', () => {
        const classSelect = document.getElementById('classSelect').value;
        window.loadStudentsForClass(classSelect);
    });

    const msgForm = document.getElementById('msgForm');
    if(msgForm) {
        msgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const to = document.getElementById('msgTo').value;
            const subject = document.getElementById('msgSubject').value;
            const body = document.getElementById('msgBody').value;
            
            await DB.insert('messages', {
                senderId: user.id,
                senderName: user.name,
                senderRole: 'teacher',
                receiverRole: to,
                subject,
                body,
                date: new Date().toISOString()
            });

            await DB.logAction('Teacher: Message Sent', `To: ${to}, Subject: ${subject}`);
            DB.showToast("Message sent successfully and logged in system!");
            msgForm.reset();
        });
    }

    const matForm = document.getElementById('materialUploadForm');
    if(matForm) {
        matForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const title = document.getElementById('mTitle').value;
            const targetClass = document.getElementById('mClass').value;
            const fileInp = document.getElementById('mFile');
            const file = fileInp.files[0];

            if(!file) return;

            const reader = new FileReader();
            reader.onload = async function() {
                const base64Content = reader.result;
                await DB.insert('learning_materials', {
                    teacherId: user.id,
                    teacherName: user.name,
                    title,
                    className: targetClass,
                    fileName: file.name,
                    content: base64Content,
                    date: new Date().toISOString()
                });

                await DB.logAction('Teacher: Material Uploaded', `Title: ${title}, Class: ${targetClass}`);
                DB.showToast("Material uploaded successfully!");
                window.hideModal('uploadMaterialModal');
                matForm.reset();
                loadMaterials();
            };
            reader.readAsDataURL(file);
        });
    }

    const profForm = document.getElementById('profileUpdateForm');
    if(profForm) {
        profForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const phone = document.getElementById('profPhone').value;
            const newPass = document.getElementById('profNewPass').value;
            const user = DB.getCurrentUser();
            const teacherRec = DB.findOne('teachers', { userId: user.id });

            if(teacherRec) {
                await DB.update('teachers', teacherRec.id, { phone });
                if(newPass) {
                    await DB.update('users', user.id, { password: newPass });
                    DB.showToast("Profile and password updated successfully!");
                } else {
                    DB.showToast("Profile updated successfully!");
                }
                await DB.logAction('Teacher: Profile Updated', `User: ${user.name}`);
                loadProfile();
                profForm.reset();
            }
        });
    }
});

function loadProfile() {
    const user = DB.getCurrentUser();
    const teacherRec = DB.findOne('teachers', { userId: user.id });
    if(!teacherRec) return;

    document.getElementById('profName').innerText = teacherRec.name;
    document.getElementById('profId').innerText = teacherRec.teacherId || 'N/A';
    document.getElementById('profClasses').innerText = teacherRec.classes.length > 0 ? teacherRec.classes.join(', ') : 'None';
    document.getElementById('profSubjects').innerText = teacherRec.subjects.length > 0 ? teacherRec.subjects.join(', ') : 'None';
    document.getElementById('profPhone').value = teacherRec.phone || '';
}

function loadTeacherDashboard() {
    const user = DB.getCurrentUser();
    const teacherRec = DB.findOne('teachers', { userId: user.id });
    if (!teacherRec) return;

    document.getElementById('statClasses').innerText = teacherRec.classes.length;
    document.getElementById('statSubjects').innerText = teacherRec.subjects.length;

    const allStudents = DB.getTable('students');
    let totalStudents = 0;
    teacherRec.classes.forEach(c => {
        totalStudents += allStudents.filter(s => (s.className === c || s.classId === c) && s.status === 'active').length;
    });
    document.getElementById('statStudents').innerText = totalStudents;

    const today = new Date().toISOString().split('T')[0];
    const allAttendance = DB.getTable('attendance');
    const todayAttendance = allAttendance.filter(a => a.teacherId === user.id && a.date === today);
    document.getElementById('statAttToday').innerText = `${todayAttendance.length} / ${totalStudents}`;

    const classSelect = document.getElementById('classSelect');
    if (classSelect && classSelect.options.length <= 1) {
        const gradeClassSelect = document.getElementById('gradeClassSelect');
        const attClassSelect = document.getElementById('attClassSelect');
        const gradeSubjectSelect = document.getElementById('gradeSubjectSelect');
        const classListUi = document.getElementById('classList');

        teacherRec.classes.forEach(c => {
            if (classSelect) classSelect.add(new Option(c, c));
            if (gradeClassSelect) gradeClassSelect.add(new Option(c, c));
            if (attClassSelect) attClassSelect.add(new Option(c, c));
            if (classListUi) {
                const li = document.createElement('li');
                li.style.padding = '8px 0';
                li.style.borderBottom = '1px solid #eee';
                li.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success)"></i> ${c}`;
                classListUi.appendChild(li);
            }
        });

        if (gradeSubjectSelect && gradeSubjectSelect.options.length <= 1) {
            const dbSubjects = DB.getTable('subjects');
            const teacherClasses = teacherRec.classes;
            const relevantSubjects = dbSubjects.filter(s =>
                !s.classId || teacherClasses.includes(s.className) || s.className === 'General' || !s.className
            );

            if (relevantSubjects.length > 0) {
                relevantSubjects.forEach(s => gradeSubjectSelect.add(new Option(s.name, s.name)));
            } else if (teacherRec.subjects.length > 0) {
                teacherRec.subjects.forEach(s => gradeSubjectSelect.add(new Option(s, s)));
            } else {
                ['Mathematics', 'English Language', 'Science', 'R.M.E', 'Social Studies', 'ICT', 'French'].forEach(s => {
                    gradeSubjectSelect.add(new Option(s, s));
                });
            }
        }

        const gradeTermSelect = document.getElementById('gradeTermSelect');
        if (gradeTermSelect && gradeTermSelect.options.length <= 1) {
            const dbTerms = DB.getTable('terms');
            if (dbTerms.length > 0) {
                dbTerms.forEach(t => {
                    const opt = new Option(`${t.name} - ${t.year}`, `${t.name} - ${t.year}`);
                    gradeTermSelect.add(opt);
                    if (t.isActive) gradeTermSelect.value = opt.value;
                });
            } else {
                ['1st Term 2024/25', '2nd Term 2024/25', '3rd Term 2024/25'].forEach(t => {
                    gradeTermSelect.add(new Option(t, t));
                });
            }
        }
    }
}

function loadTeacherMessages() {
    const tbody = document.querySelector('#teacherMessagesTable tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    const user = DB.getCurrentUser();
    const msgs = DB.getTable('messages').filter(m => 
        m.receiverRole === 'teachers' || 
        m.receiverRole === 'all'
    ).sort((a,b) => new Date(b.date) - new Date(a.date));

    if(msgs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No incoming messages found.</td></tr>';
        return;
    }

    msgs.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.senderName}</strong><br><small>${m.senderRole.toUpperCase()}</small></td>
            <td>${m.subject}</td>
            <td>${new Date(m.date).toLocaleDateString()}</td>
            <td><button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem;" onclick="viewTeacherMessage('${m.id}')">View</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.viewTeacherMessage = function(id) {
    const m = DB.findById('messages', id);
    if(m) {
        DB.showToast(`FROM: ${m.senderName} (${m.senderRole})\nDATE: ${new Date(m.date).toLocaleString()}\n\nSUBJECT: ${m.subject}\n\n${m.body}`);
    }
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

window.showUploadModal = function() {
    const user = DB.getCurrentUser();
    const teacherRec = DB.findOne('teachers', { userId: user.id });
    const select = document.getElementById('mClass');
    if(select && teacherRec) {
        select.innerHTML = '';
        teacherRec.classes.forEach(c => select.add(new Option(c, c)));
    }
    document.getElementById('uploadMaterialModal').classList.add('active');
}

window.hideModal = function(id) {
    document.getElementById(id).classList.remove('active');
}

function loadMaterials() {
    const user = DB.getCurrentUser();
    const tbody = document.querySelector('#teacherMaterialsTable tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    const mats = DB.getTable('learning_materials').filter(m => m.teacherId === user.id).sort((a,b) => new Date(b.date) - new Date(a.date));

    if(mats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">You haven\'t uploaded any materials yet.</td></tr>';
        return;
    }

    mats.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.title}</strong><br><small>${m.fileName}</small></td>
            <td>${m.className}</td>
            <td>${new Date(m.date).toLocaleDateString()}</td>
            <td>
                <div class="action-btns">
                    <a href="${m.content}" target="_blank" class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem;">View</a>
                    <button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="deleteMaterial('${m.id}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.deleteMaterial = async function(id) {
    if(confirm('Delete this material?')) {
        await DB.delete('learning_materials', id);
        await DB.logAction('Teacher: Material Deleted', `ID: ${id}`);
        loadMaterials();
    }
}

window.loadStudentsForClass = function(className) {
    const tbody = document.querySelector('#teacherStudentsTable tbody');
    tbody.innerHTML = '';
    if(!className) return;

    let students = DB.find('students', { className: className });
    
    const searchTerm = document.getElementById('searchTeacherStudent')?.value.toLowerCase();
    if (searchTerm) {
        students = students.filter(s => s.name.toLowerCase().includes(searchTerm) || s.studentId.toLowerCase().includes(searchTerm));
    }

    if(students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No students found.</td></tr>';
        return;
    }

    students.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.studentId}</strong></td>
            <td>${s.name}</td>
            <td><span class="badge badge-active">${s.status}</span></td>
            <td><button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem;" onclick="DB.showToast('Viewing student...')">View</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.loadGradeEntryGrid = function() {
    const cls = document.getElementById('gradeClassSelect').value;
    const sub = document.getElementById('gradeSubjectSelect').value;
    const term = document.getElementById('gradeTermSelect').value;

    if(!cls || !sub || !term) {
        DB.showToast("Please select Class, Subject, and Term.");
        return;
    }

    const students = DB.find('students', { className: cls });
    const tbody = document.querySelector('#gradeTable tbody');
    tbody.innerHTML = '';

    if(students.length === 0) {
        DB.showToast("No students in this class. Perhaps you need to assign some from Admin.");
        return;
    }

    document.getElementById('gradeEntryArea').style.display = 'block';

    students.forEach(s => {
        let existing = DB.findOne('results', { studentId: s.studentId, subject: sub, term });
        const isPublished = existing && existing.status === 'published';
        const isSubmitted = existing && existing.status === 'submitted';
        const isRejected = existing && existing.status === 'rejected';

        let statusText = '-';
        let statusColor = '#666';
        if(isPublished) { statusText = 'Published (Approved)'; statusColor = 'var(--success)'; }
        else if(isSubmitted) { statusText = 'Pending Approval'; statusColor = 'var(--blue)'; }
        else if(isRejected) { statusText = 'Rejected (Check Remark)'; statusColor = 'var(--danger)'; }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${s.name}</strong><br><small>${s.studentId}</small>
                <input type="hidden" class="g-studId" value="${s.studentId}">
                <input type="hidden" class="g-studName" value="${s.name}">
                <div style="font-size:0.75rem; color:${statusColor}; margin-top:4px;">Status: ${statusText}</div>
            </td>
            <td><input type="number" class="form-control g-class" max="40" value="${existing ? existing.classScore : ''}" placeholder="0-40" ${isPublished ? 'disabled' : ''}></td>
            <td><input type="number" class="form-control g-exam" max="60" value="${existing ? existing.examScore : ''}" placeholder="0-60" ${isPublished ? 'disabled' : ''}></td>
            <td><span class="g-total" style="font-weight:bold; font-size:1.1rem; color:var(--blue);">${existing ? existing.total : 0}</span></td>
            <td><span class="g-grade" style="font-weight:bold; font-size:1.1rem;">${existing ? getGrade(existing.total) : '-'}</span></td>
            <td>
                <input type="text" class="form-control g-remark" value="${existing ? existing.remark : ''}" placeholder="e.g. Excellent" ${isPublished ? 'disabled' : ''}>
                ${isRejected ? `<small style="color:var(--danger); display:block; margin-top:4px;">Reason: ${existing.rejectionReason}</small>` : ''}
            </td>
        `;
        tbody.appendChild(tr);

        const cInp = tr.querySelector('.g-class');
        const eInp = tr.querySelector('.g-exam');
        const totalSp = tr.querySelector('.g-total');
        const gradeSp = tr.querySelector('.g-grade');
        const remarkInp = tr.querySelector('.g-remark');

        if(!isPublished) {
            const calc = () => {
                const classV = parseFloat(cInp.value) || 0;
                const examV = parseFloat(eInp.value) || 0;
                if(classV > 40) cInp.value = 40;
                if(examV > 60) eInp.value = 60;
                const t = (parseFloat(cInp.value)||0) + (parseFloat(eInp.value)||0);
                totalSp.innerText = t;
                const grade = getGrade(t);
                gradeSp.innerText = grade;
                gradeSp.style.color = grade === 'F' ? 'red' : 'green';
                if(!remarkInp.dataset.modified) {
                    remarkInp.value = getStandardRemark(grade);
                }
            };
            remarkInp.addEventListener('input', () => remarkInp.dataset.modified = true);
            cInp.addEventListener('input', calc);
            eInp.addEventListener('input', calc);
        }
    });
}

window.submitGrades = async function() {
    const cls = document.getElementById('gradeClassSelect').value;
    const sub = document.getElementById('gradeSubjectSelect').value;
    const term = document.getElementById('gradeTermSelect').value;
    const user = DB.getCurrentUser();

    if(!cls || !sub || !term) {
        DB.showToast("Selection incomplete.");
        return;
    }

    if(!confirm(`Submit grades for ${cls} - ${sub}? Records will be sent to Admin for approval.`)) return;

    const rows = document.querySelectorAll('#gradeTable tbody tr');
    let savedCount = 0;

    for (const tr of rows) {
        const classInp = tr.querySelector('.g-class');
        if(classInp.disabled) continue; 
        const studentId = tr.querySelector('.g-studId').value;
        const studentName = tr.querySelector('.g-studName').value;
        const classScoreStr = classInp.value;
        const examScoreStr = tr.querySelector('.g-exam').value;
        if(!classScoreStr && !examScoreStr) continue; 
        const classScore = parseFloat(classScoreStr) || 0;
        const examScore = parseFloat(examScoreStr) || 0;
        const total = classScore + examScore;
        const remark = tr.querySelector('.g-remark').value;
        const existing = DB.findOne('results', { studentId, subject: sub, term });
        const data = {
            studentId, studentName, classId: cls, subject: sub, term,
            classScore, examScore, total, remark,
            teacherId: user.id, teacherName: user.name,
            status: 'submitted' 
        };
        if(existing) { await DB.update('results', existing.id, data); }
        else { await DB.insert('results', data); }
        savedCount++;
    }
    await DB.logAction('Submitted Grades', `Class: ${cls}, Subject: ${sub}, Students: ${savedCount}`);
    DB.showToast(`Successfully submitted ${savedCount} student grades to Administration for approval.`);
    window.loadGradeEntryGrid(); 
}

function loadAnnouncements() {
    const list = document.getElementById('announcementList');
    if(!list) return;
    list.innerHTML = '';
    const anns = DB.getTable('announcements').filter(a => a.target === 'all' || a.target === 'teachers').sort((a,b) => new Date(b.date) - new Date(a.date));
    if(anns.length === 0) {
        list.innerHTML = '<p style="color:#666; padding: 10px 0;">No new announcements.</p>';
        return;
    }
    anns.slice(0, 5).forEach(a => {
        const div = document.createElement('div');
        div.style.padding = '12px 0';
        div.style.borderBottom = '1px solid #eee';
        div.innerHTML = `
            <strong>${a.title}</strong>
            <p style="margin:5px 0; font-size:0.9rem; color:#444">${a.body}</p>
            <small style="color:#888">${new Date(a.date).toLocaleDateString()} from Admin</small>
        `;
        list.appendChild(div);
    });
}

function getGrade(score) {
    if(score >= 80) return 'A';
    if(score >= 70) return 'B';
    if(score >= 60) return 'C';
    if(score >= 50) return 'D';
    if(score >= 40) return 'E';
    return 'F';
}

function getStandardRemark(grade) {
    switch(grade) {
        case 'A': return 'Excellent performance.';
        case 'B': return 'Very good work.';
        case 'C': return 'Good, but room for improvement.';
        case 'D': return 'Fair performance.';
        case 'E': return 'Pass, needs more focus.';
        case 'F': return 'Fail, requires immediate attention.';
        default: return '';
    }
}

window.checkStudentFees = function() {
    const studId = document.getElementById('searchFeeStudId').value.trim();
    const resArea = document.getElementById('feeResultArea');
    const notFound = document.getElementById('feeNotFound');
    const tbody = document.querySelector('#teacherFeeTable tbody');
    if(!studId) { DB.showToast("Please enter a Student ID."); return; }
    const student = DB.findOne('students', { studentId: studId });
    if(!student) { resArea.style.display = 'none'; notFound.style.display = 'block'; return; }
    notFound.style.display = 'none';
    resArea.style.display = 'block';
    document.getElementById('feeResName').innerText = student.name;
    let tuitionFee = 0;
    const cls = DB.getTable('classes').find(c => c.id === student.classId || c.name === student.className);
    if (cls && cls.tuitionFee) { tuitionFee = cls.tuitionFee; }
    const payments = DB.find('payments', { studentId: studId });
    let totalPaid = 0;
    tbody.innerHTML = '';
    if(payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No payments recorded for this student.</td></tr>';
    } else {
        payments.forEach(p => {
            totalPaid += parseFloat(p.amountPaid);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(p.date).toLocaleDateString()}</td>
                <td>${p.receiptNo}</td>
                <td>GHS ${parseFloat(p.amountPaid).toFixed(2)}</td>
                <td><span class="badge ${p.status === 'Paid' ? 'badge-active' : 'badge-pending'}">${p.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
    const balance = (tuitionFee + (student.arrears || 0)) - totalPaid;
    document.getElementById('feeResPaid').innerHTML = `
        <span style="color:var(--success)">Paid: GHS ${totalPaid.toFixed(2)}</span><br>
        <span style="color:var(--gray); font-size: 0.9rem;">Debt/Arrears: GHS ${student.arrears || 0}</span><br>
        <span style="color:var(--danger); font-size: 0.9rem; font-weight:bold;">Total Bal: GHS ${balance.toFixed(2)}</span>
    `;
}

function loadTimetables() {
    const tbody = document.querySelector('#teacherTimetableTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const tts = DB.getTable('timetables').filter(tt => tt.target === 'all' || tt.target === 'teachers').sort((a,b) => new Date(b.date) - new Date(a.date));
    if(tts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No timetables published for teachers yet.</td></tr>';
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

window.loadAttendanceGrid = function() {
    const cls = document.getElementById('attClassSelect').value;
    const date = document.getElementById('attDate').value;
    const tbody = document.querySelector('#attendanceTable tbody');
    if(!cls || !date) return;
    tbody.innerHTML = '';
    document.getElementById('attendanceGridArea').style.display = 'block';
    const students = DB.find('students', { className: cls });
    if(students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No students found in this class.</td></tr>';
        return;
    }
    students.forEach(s => {
        const existing = DB.findOne('attendance', { studentId: s.studentId, date: date });
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${s.name}</strong><br><small>${s.studentId}</small>
                <input type="hidden" class="att-studId" value="${s.studentId}">
                <input type="hidden" class="att-studName" value="${s.name}">
            </td>
            <td>
                <select class="form-control att-status" style="width:120px;">
                    <option value="Present" ${existing && existing.status === 'Present' ? 'selected' : ''}>Present</option>
                    <option value="Absent" ${existing && existing.status === 'Absent' ? 'selected' : ''}>Absent</option>
                    <option value="Late" ${existing && existing.status === 'Late' ? 'selected' : ''}>Late</option>
                </select>
            </td>
            <td><input type="text" class="form-control att-remark" value="${existing ? existing.remark : ''}" placeholder="Optional remark"></td>
        `;
        tbody.appendChild(tr);
    });
}

window.saveAttendance = async function() {
    const cls = document.getElementById('attClassSelect').value;
    const date = document.getElementById('attDate').value;
    const user = DB.getCurrentUser();
    if(!cls || !date) return;
    const rows = document.querySelectorAll('#attendanceTable tbody tr');
    let count = 0;
    for (const tr of rows) {
        const studentId = tr.querySelector('.att-studId').value;
        const studentName = tr.querySelector('.att-studName').value;
        const status = tr.querySelector('.att-status').value;
        const remark = tr.querySelector('.att-remark').value;
        const activeTerm = DB.getTable('terms').find(t => t.isActive);
        const termName = activeTerm ? `${activeTerm.name} - ${activeTerm.year}` : new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const data = {
            studentId, studentName, className: cls,
            date, status, remark,
            teacherId: user.id,
            term: termName
        };
        const existing = DB.findOne('attendance', { studentId, date });
        if(existing) { await DB.update('attendance', existing.id, data); }
        else { await DB.insert('attendance', data); }
        count++;
    }
    await DB.logAction('Marked Attendance', `Class: ${cls}, Date: ${date}, Students: ${count}`);
    DB.showToast(`Attendance for ${count} students saved successfully!`);
}
