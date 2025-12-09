// API Configuration
const API_BASE_URL = (() => {
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${window.location.protocol}//${window.location.hostname}${port}/api`;
})();

// State Management
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let studentsData = [];
let filteredStudents = [];
let subjectsList = [];
let boardsList = [];
let classesList = [];
let editingSubjectId = null;
let editingStudentId = null;
let editingTeacherId = null;
let teachersCache = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    if (authToken) {
        loadDashboard();
        loadInitialData();
    }
});

// Authentication
async function checkAuth() {
    if (!authToken) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Unauthorized');
        }

        const data = await response.json();
        currentUser = data.data;
        
        if (currentUser.role !== 'admin') {
            alert('Access denied. Admin only.');
            logout();
            return;
        }

        updateAdminInfo();
    } catch (error) {
        console.error('Auth error:', error);
        logout();
    }
}

function updateAdminInfo() {
    if (currentUser) {
        document.getElementById('admin-name').textContent = currentUser.name;
        const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('admin-initials').textContent = initials || 'A';
    }
}

function logout() {
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
}

// Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });

    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.remove('hidden');

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active-nav', 'bg-white', 'bg-opacity-20');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active-nav', 'bg-white', 'bg-opacity-20');

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'students': 'Students',
        'teachers': 'Teachers',
        'boards': 'Board Management',
        'classes': 'Class Management',
        'courses': 'Subjects',
        'enrollments': 'Enrollments',
        'live-classes': 'Live Classes',
        'notifications': 'Notifications'
    };
    document.getElementById('page-title').textContent = titles[sectionName] || 'Dashboard';

    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'students':
            loadStudents();
            break;
        case 'teachers':
            loadTeachers();
            break;
        case 'boards':
            loadBoards();
            break;
        case 'classes':
            loadClasses();
            break;
        case 'courses':
            loadSubjects();
            break;
        case 'enrollments':
            loadEnrollments();
            break;
        case 'live-classes':
            loadLiveClasses();
            break;
        case 'notifications':
            loadNotifications();
            break;
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('-translate-x-full');
}

// Dashboard
async function loadDashboard() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) throw new Error('Failed to load dashboard');

        const result = await response.json();
        const stats = result.data;

        // Update stats
        document.getElementById('stat-students-total').textContent = stats.students.total;
        document.getElementById('stat-courses-total').textContent = stats.courses.total;
        document.getElementById('stat-enrollments-active').textContent = stats.enrollments.active;
        document.getElementById('stat-revenue').textContent = `₹${stats.revenue.total.toLocaleString()}`;

        // Recent enrollments
        const enrollmentsDiv = document.getElementById('recent-enrollments');
        enrollmentsDiv.innerHTML = stats.recentEnrollments.length > 0
            ? stats.recentEnrollments.map(e => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p class="font-semibold">${e.student.name}</p>
                        <p class="text-sm text-gray-600">${e.course.name} - ${e.course.class}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs ${getStatusColor(e.status)}">${e.status}</span>
                </div>
            `).join('')
            : '<p class="text-gray-500">No recent enrollments</p>';

        // Recent students
        const studentsDiv = document.getElementById('recent-students');
        studentsDiv.innerHTML = stats.recentStudents.length > 0
            ? stats.recentStudents.map(s => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p class="font-semibold">${s.name}</p>
                        <p class="text-sm text-gray-600">${s.email}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">${s.class || 'N/A'}</span>
                </div>
            `).join('')
            : '<p class="text-gray-500">No recent students</p>';

        hideLoading();
    } catch (error) {
        console.error('Dashboard error:', error);
        hideLoading();
        alert('Failed to load dashboard data');
    }
}

// Students
async function loadStudents() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/students`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) throw new Error('Failed to load students');

        const result = await response.json();
        studentsData = result.data || [];
        filteredStudents = studentsData;
        renderStudentsTable();

        hideLoading();
    } catch (error) {
        console.error('Students error:', error);
        hideLoading();
        alert('Failed to load students');
    }
}

function renderStudentsTable() {
        const tbody = document.getElementById('students-table-body');
    if (!tbody) return;

    if (filteredStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="px-4 py-6 text-center text-gray-500">
                    <div class="flex flex-col items-center space-y-2">
                        <i class="fas fa-user-graduate text-3xl text-gray-300"></i>
                        <p>No students found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredStudents.map(student => {
            const subjects = Array.isArray(student.subjects) ? student.subjects : [];
            const selectedSubjects = subjects.length
                ? subjects.map(s => s.subject).filter(Boolean).join(', ')
                : 'N/A';
            const totalAmount = subjects.reduce((sum, subj) => sum + (subj.price || 0), 0);

            return `
            <tr>
                    <td class="px-4 py-3">${selectedSubjects}</td>
                    <td class="px-4 py-3 whitespace-nowrap">₹${totalAmount.toLocaleString()}</td>
                <td class="px-4 py-3 whitespace-nowrap">${student.name}</td>
                <td class="px-4 py-3 whitespace-nowrap">${student.phone || 'N/A'}</td>
                    <td class="px-4 py-3 whitespace-nowrap">${student.email}</td>
                <td class="px-4 py-3 whitespace-nowrap">${student.class || 'N/A'}</td>
                <td class="px-4 py-3 whitespace-nowrap">${student.board || 'N/A'}</td>
                    <td class="px-4 py-3 whitespace-nowrap">${student.schoolName || 'N/A'}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                        <button onclick="editStudent('${student._id}')" class="text-yellow-600 hover:text-yellow-800 mr-3">
                            <i class="fas fa-edit"></i>
                    </button>
                        <button onclick="deleteStudent('${student._id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
            `;
    }).join('');
}

function refreshStudents() {
    loadStudents();
}

function filterStudents() {
    const searchInput = document.getElementById('studentsSearch');
    if (!searchInput) return;

    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
        filteredStudents = studentsData;
    } else {
        filteredStudents = studentsData.filter(student => {
            const name = (student.name || '').toLowerCase();
            const email = (student.email || '').toLowerCase();
            const phone = (student.phone || '').toLowerCase();
            return name.includes(query) || email.includes(query) || phone.includes(query);
        });
    }

    renderStudentsTable();
}

async function toggleStudentStatus(id, currentStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/students/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isActive: !currentStatus })
        });

        if (response.ok) {
            loadStudents();
        }
    } catch (error) {
        console.error('Error updating student:', error);
    }
}

function viewStudent(id) {
    alert(`View student details for ID: ${id}`);
}

function editStudent(id) {
    const student = studentsData.find(s => s._id === id);
    if (!student) {
        alert('Student not found');
        return;
    }

    const modal = document.getElementById('editStudentModal');
    const form = document.getElementById('editStudentForm');
    const status = document.getElementById('editStudentStatus');
    const nameInput = document.getElementById('editStudentName');
    const emailInput = document.getElementById('editStudentEmail');
    const phoneInput = document.getElementById('editStudentPhone');
    const classInput = document.getElementById('editStudentClass');
    const boardSelect = document.getElementById('editStudentBoard');
    const schoolInput = document.getElementById('editStudentSchool');

    if (!modal || !form) {
        alert('Edit form not available');
        return;
    }

    editingStudentId = id;
    if (status) status.classList.add('hidden');
    if (nameInput) nameInput.value = student.name || '';
    if (emailInput) emailInput.value = student.email || '';
    if (phoneInput) phoneInput.value = student.phone || '';
    if (classInput) classInput.value = student.class || '';
    if (boardSelect) boardSelect.value = (student.board || '').toUpperCase();
    if (schoolInput) schoolInput.value = student.schoolName || '';

    modal.classList.remove('hidden');
}

function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) {
        return;
    }

    showLoading();
    fetch(`${API_BASE_URL}/students/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        hideLoading();
        if (response.ok) {
            loadStudents();
        } else {
            return response.json().then(data => {
                throw new Error(data.message || 'Failed to delete student');
            });
        }
    })
    .catch(error => {
        hideLoading();
        alert(error.message);
    });
}

// Student edit modal handlers
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('editStudentModal');
    const form = document.getElementById('editStudentForm');
    const closeBtn = document.getElementById('closeEditStudentModal');
    const closeBtnFooter = document.getElementById('closeEditStudentModalFooter');

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeEditStudentModal();
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeEditStudentModal);
    }
    if (closeBtnFooter) {
        closeBtnFooter.addEventListener('click', closeEditStudentModal);
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const status = document.getElementById('editStudentStatus');
            if (status) status.classList.add('hidden');

            const nameInput = document.getElementById('editStudentName');
            const emailInput = document.getElementById('editStudentEmail');
            const phoneInput = document.getElementById('editStudentPhone');
            const classInput = document.getElementById('editStudentClass');
            const boardSelect = document.getElementById('editStudentBoard');
            const schoolInput = document.getElementById('editStudentSchool');

            const payload = {
                name: nameInput ? nameInput.value.trim() : '',
                email: emailInput ? emailInput.value.trim() : '',
                phone: phoneInput ? phoneInput.value.trim() : '',
                class: classInput ? classInput.value.trim() : '',
                board: boardSelect ? boardSelect.value.trim() : '',
                schoolName: schoolInput ? schoolInput.value.trim() : ''
            };

            if (!payload.name || !payload.email) {
                showEditStudentStatus('Name and Email are required.', 'error');
                return;
            }

            try {
                showLoading();
                const response = await fetch(`${API_BASE_URL}/students/${editingStudentId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                hideLoading();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to update student');
                }

                showEditStudentStatus('Student updated successfully!', 'success');
                setTimeout(() => {
                    closeEditStudentModal();
                    loadStudents();
                }, 800);
            } catch (err) {
                hideLoading();
                showEditStudentStatus(err.message || 'Failed to update student', 'error');
            }
        });
    }
});

function closeEditStudentModal() {
    const modal = document.getElementById('editStudentModal');
    const form = document.getElementById('editStudentForm');
    const status = document.getElementById('editStudentStatus');
    if (modal) modal.classList.add('hidden');
    if (form) form.reset();
    if (status) status.classList.add('hidden');
    editingStudentId = null;
}

function showEditStudentStatus(message, type) {
    const statusDiv = document.getElementById('editStudentStatus');
    if (!statusDiv) return;
    statusDiv.className = `p-3 rounded-lg text-sm ${
        type === 'error'
            ? 'bg-red-100 text-red-700 border border-red-200'
            : 'bg-green-100 text-green-700 border border-green-200'
    }`;
    statusDiv.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} mr-2"></i>${message}`;
    statusDiv.classList.remove('hidden');
}

// Teachers
async function loadTeachers() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/admin/teachers`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) throw new Error('Failed to load teachers');

        const result = await response.json();
        teachersCache = result.data || [];
        const tbody = document.getElementById('teachers-table-body');
        
        tbody.innerHTML = teachersCache.map(teacher => `
            <tr>
                <td class="px-4 py-3 whitespace-nowrap">${teacher.name}</td>
                <td class="px-4 py-3 whitespace-nowrap">${teacher.email}</td>
                <td class="px-4 py-3 whitespace-nowrap">${teacher.phone || 'N/A'}</td>
                <td class="px-4 py-3 whitespace-nowrap">${teacher.role || 'Teacher'}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs ${teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${teacher.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <button onclick="editTeacher('${teacher._id}')" class="text-blue-600 hover:text-blue-800 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteTeacher('${teacher._id}')" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        hideLoading();
    } catch (error) {
        console.error('Teachers error:', error);
        hideLoading();
        alert('Failed to load teachers');
    }
}

function showAddTeacherModal() {
    const modal = document.getElementById('addTeacherModal');
    const form = document.getElementById('addTeacherForm');
    const status = document.getElementById('teacherFormStatus');
    const title = document.querySelector('#addTeacherModal h3');
    const submitBtn = document.querySelector('#addTeacherForm button[type="submit"]');

    if (!modal || !form) {
        console.error('Teacher modal or form not found');
        return;
    }

    const openModal = () => {
        populateTeacherRoleOptions();
        modal.classList.remove('hidden');
        form.reset();
        if (status) status.classList.add('hidden');
        editingTeacherId = null;
        if (title) title.textContent = 'Add New Teacher';
        if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-plus mr-2"></i>Add Teacher`;
    };

    if (!subjectsList.length) {
        fetchSubjectsForRoles().then(openModal);
    } else {
        openModal();
    }
}

function closeAddTeacherModal() {
    const modal = document.getElementById('addTeacherModal');
    const form = document.getElementById('addTeacherForm');
    const status = document.getElementById('teacherFormStatus');
    const title = document.querySelector('#addTeacherModal h3');
    const submitBtn = document.querySelector('#addTeacherForm button[type="submit"]');

    if (modal) modal.classList.add('hidden');
    if (form) form.reset();
    if (status) status.classList.add('hidden');
    editingTeacherId = null;
    if (title) title.textContent = 'Add New Teacher';
    if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-plus mr-2"></i>Add Teacher`;
}

document.addEventListener('DOMContentLoaded', () => {
    const addTeacherForm = document.getElementById('addTeacherForm');
    const teacherModal = document.getElementById('addTeacherModal');

    if (teacherModal) {
        teacherModal.addEventListener('click', function(e) {
            if (e.target === teacherModal) {
                closeAddTeacherModal();
            }
        });
    }

    if (addTeacherForm) {
        addTeacherForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const statusDiv = document.getElementById('teacherFormStatus');
            statusDiv.classList.add('hidden');

            const teacherData = {
                name: document.getElementById('teacherName').value.trim(),
                email: document.getElementById('teacherEmail').value.trim(),
                phone: document.getElementById('teacherPhone').value.trim(),
                role: document.getElementById('teacherRole').value || 'teacher'
            };

            if (!teacherData.name || !teacherData.email || !teacherData.phone || !teacherData.role) {
                showTeacherFormStatus('Please fill all required fields (Name, Email, Phone, Role)', 'error');
                return;
            }

            try {
                showLoading();
                const isEdit = !!editingTeacherId;
                const url = isEdit ? `${API_BASE_URL}/admin/teachers/${editingTeacherId}` : `${API_BASE_URL}/admin/teachers`;
                const method = isEdit ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(teacherData)
                });

                const result = await response.json();
                hideLoading();

                if (!response.ok) {
                    throw new Error(result.message || (isEdit ? 'Failed to update teacher' : 'Failed to create teacher'));
                }

                showTeacherFormStatus(isEdit ? 'Teacher updated successfully!' : 'Teacher created successfully!', 'success');
                setTimeout(() => {
                    closeAddTeacherModal();
                    loadTeachers();
                }, 800);
            } catch (error) {
                hideLoading();
                showTeacherFormStatus(error.message || 'Failed to save teacher', 'error');
            }
        });
    }
});

function showTeacherFormStatus(message, type) {
    const statusDiv = document.getElementById('teacherFormStatus');
    if (!statusDiv) return;
    statusDiv.className = `p-4 rounded-lg ${type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`;
    statusDiv.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} mr-2"></i>${message}`;
    statusDiv.classList.remove('hidden');
}

async function createTeacher(data) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/admin/teachers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        hideLoading();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to create teacher');
        }

        closeAddTeacherModal();
            loadTeachers();
            alert('Teacher created successfully');
    } catch (error) {
        hideLoading();
        console.error('Error creating teacher:', error);
        alert('Failed to create teacher');
    }
}

// Boards (frontend-only management using localStorage)
function loadBoards() {
    const tbody = document.getElementById('boards-table-body');
    if (!tbody) return;

    // Load from localStorage; always ensure CBSE and ICSE exist
    const stored = JSON.parse(localStorage.getItem('adminBoards') || '[]');
    const base = ['CBSE', 'ICSE'];
    const merged = Array.from(new Set([...base, ...stored]));
    boardsList = merged.map(name => ({
        name,
        status: 'Active',
        isDefault: base.includes(name)
    }));

    if (!boardsList.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="px-4 py-6 text-center text-gray-500">
                    <div class="flex flex-col items-center space-y-2">
                        <i class="fas fa-layer-group text-3xl text-gray-300"></i>
                        <p>No boards found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = boardsList.map(board => `
        <tr>
            <td class="px-4 py-3 whitespace-nowrap">${board.name}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    ${board.status}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
                <button onclick="editBoard('${board.name}')" class="text-yellow-600 hover:text-yellow-800 mr-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteBoard('${board.name}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Update preset dropdown to disable already-present defaults
    setBoardPresetAvailability();
}

function showAddBoardModal() {
    const modal = document.getElementById('addBoardModal');
    const form = document.getElementById('addBoardForm');
    const status = document.getElementById('boardFormStatus');
    const preset = document.getElementById('boardPreset');
    const nameInput = document.getElementById('boardName');
    const nameWrapper = document.getElementById('boardNameWrapper');

    if (!modal || !form) {
        console.error('Board modal or form not found');
        return;
    }

    modal.classList.remove('hidden');
    form.reset();
    if (status) status.classList.add('hidden');
    if (nameWrapper) nameWrapper.classList.add('hidden');

    // Disable CBSE/ICSE choices if already present
    setBoardPresetAvailability();

    if (preset) {
        preset.addEventListener('change', () => {
            if (preset.value === 'other') {
                nameWrapper.classList.remove('hidden');
            } else {
                nameWrapper.classList.add('hidden');
                if (nameInput) nameInput.value = '';
            }
        }, { once: true });
    }
}

function closeAddBoardModal() {
    const modal = document.getElementById('addBoardModal');
    const form = document.getElementById('addBoardForm');
    const status = document.getElementById('boardFormStatus');
    const nameWrapper = document.getElementById('boardNameWrapper');

    if (modal) modal.classList.add('hidden');
    if (form) form.reset();
    if (status) status.classList.add('hidden');
    if (nameWrapper) nameWrapper.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const addBoardForm = document.getElementById('addBoardForm');
    const boardModal = document.getElementById('addBoardModal');

    if (boardModal) {
        boardModal.addEventListener('click', function(e) {
            if (e.target === boardModal) {
                closeAddBoardModal();
            }
        });
    }

    if (addBoardForm) {
        addBoardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const preset = document.getElementById('boardPreset');
            const nameInput = document.getElementById('boardName');
            const statusDiv = document.getElementById('boardFormStatus');

            if (statusDiv) statusDiv.classList.add('hidden');

            let boardName = '';
            if (preset && preset.value && preset.value !== 'other') {
                boardName = preset.value;
            } else if (preset && preset.value === 'other' && nameInput) {
                boardName = nameInput.value.trim();
            }

            if (!boardName) {
                showBoardFormStatus('Please select CBSE, ICSE or enter another board name.', 'error');
                return;
            }

            // Persist custom boards in localStorage (CBSE/ICSE are always present)
            const stored = JSON.parse(localStorage.getItem('adminBoards') || '[]');
            if (!stored.includes(boardName) && boardName !== 'CBSE' && boardName !== 'ICSE') {
                stored.push(boardName);
                localStorage.setItem('adminBoards', JSON.stringify(stored));
            }

            showBoardFormStatus('Board added successfully!', 'success');
            setTimeout(() => {
                closeAddBoardModal();
                loadBoards();
            }, 800);
        });
    }
});

function showBoardFormStatus(message, type) {
    const statusDiv = document.getElementById('boardFormStatus');
    if (!statusDiv) return;
    statusDiv.className = `p-4 rounded-lg ${type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`;
    statusDiv.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} mr-2"></i>${message}`;
    statusDiv.classList.remove('hidden');
}

function deleteBoard(name) {
    if (!confirm(`Remove custom board "${name}"?`)) return;
    const stored = JSON.parse(localStorage.getItem('adminBoards') || '[]');
    const filtered = stored.filter(b => b !== name);
    localStorage.setItem('adminBoards', JSON.stringify(filtered));
    loadBoards();
}

// Disable default board options in the preset dropdown when they already exist
function setBoardPresetAvailability() {
    const preset = document.getElementById('boardPreset');
    if (!preset) return;

    const hasCBSE = boardsList.some(b => b.name === 'CBSE');
    const hasICSE = boardsList.some(b => b.name === 'ICSE');

    const cbseOption = preset.querySelector('option[value="CBSE"]');
    const icseOption = preset.querySelector('option[value="ICSE"]');

    if (cbseOption) {
        cbseOption.disabled = hasCBSE;
        cbseOption.textContent = hasCBSE ? 'CBSE (already added)' : 'CBSE';
    }

    if (icseOption) {
        icseOption.disabled = hasICSE;
        icseOption.textContent = hasICSE ? 'ICSE (already added)' : 'ICSE';
    }

    // Default the select back to placeholder so disabled options aren't auto-selected
    if (preset.value === 'CBSE' && hasCBSE) preset.value = '';
    if (preset.value === 'ICSE' && hasICSE) preset.value = '';
}

// Classes (frontend-only management using localStorage)
function loadClasses() {
    const tbody = document.getElementById('classes-table-body');
    if (!tbody) return;

    // Load from localStorage; always ensure 9th and 10th exist
    const stored = JSON.parse(localStorage.getItem('adminClasses') || '[]');
    const base = ['9th', '10th'];
    const merged = Array.from(new Set([...base, ...stored]));
    classesList = merged.map(name => ({
        name,
        status: 'Active',
        isDefault: base.includes(name)
    }));

    if (!classesList.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="px-4 py-6 text-center text-gray-500">
                    <div class="flex flex-col items-center space-y-2">
                        <i class="fas fa-list-ol text-3xl text-gray-300"></i>
                        <p>No classes found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = classesList.map(cls => `
        <tr>
            <td class="px-4 py-3 whitespace-nowrap">${cls.name}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    ${cls.status}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
                <button onclick="editClass('${cls.name}')" class="text-yellow-600 hover:text-yellow-800 mr-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteClass('${cls.name}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Disable base class presets that already exist
    setClassPresetAvailability();
}

function showAddClassModal() {
    const modal = document.getElementById('addClassModal');
    const form = document.getElementById('addClassForm');
    const status = document.getElementById('classFormStatus');
    const preset = document.getElementById('classPreset');
    const nameInput = document.getElementById('className');
    const nameWrapper = document.getElementById('classNameWrapper');

    if (!modal || !form) {
        console.error('Class modal or form not found');
        return;
    }

    modal.classList.remove('hidden');
    form.reset();
    if (status) status.classList.add('hidden');
    if (nameWrapper) nameWrapper.classList.add('hidden');

    // Disable base class presets that already exist
    setClassPresetAvailability();

    if (preset) {
        preset.addEventListener('change', () => {
            if (preset.value === 'other') {
                nameWrapper.classList.remove('hidden');
            } else {
                nameWrapper.classList.add('hidden');
                if (nameInput) nameInput.value = '';
            }
        }, { once: true });
    }
}

function closeAddClassModal() {
    const modal = document.getElementById('addClassModal');
    const form = document.getElementById('addClassForm');
    const status = document.getElementById('classFormStatus');
    const nameWrapper = document.getElementById('classNameWrapper');

    if (modal) modal.classList.add('hidden');
    if (form) form.reset();
    if (status) status.classList.add('hidden');
    if (nameWrapper) nameWrapper.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const addClassForm = document.getElementById('addClassForm');
    const classModal = document.getElementById('addClassModal');

    if (classModal) {
        classModal.addEventListener('click', function(e) {
            if (e.target === classModal) {
                closeAddClassModal();
            }
        });
    }

    if (addClassForm) {
        addClassForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const preset = document.getElementById('classPreset');
            const nameInput = document.getElementById('className');
            const statusDiv = document.getElementById('classFormStatus');

            if (statusDiv) statusDiv.classList.add('hidden');

            let className = '';
            if (preset && preset.value && preset.value !== 'other') {
                className = preset.value;
            } else if (preset && preset.value === 'other' && nameInput) {
                className = nameInput.value.trim();
            }

            if (!className) {
                showClassFormStatus('Please select 9th, 10th or enter another class name.', 'error');
                return;
            }

            const stored = JSON.parse(localStorage.getItem('adminClasses') || '[]');
            if (!stored.includes(className) && className !== '9th' && className !== '10th') {
                stored.push(className);
                localStorage.setItem('adminClasses', JSON.stringify(stored));
            }

            showClassFormStatus('Class added successfully!', 'success');
            setTimeout(() => {
                closeAddClassModal();
                loadClasses();
            }, 800);
        });
    }
});

function showClassFormStatus(message, type) {
    const statusDiv = document.getElementById('classFormStatus');
    if (!statusDiv) return;
    statusDiv.className = `p-4 rounded-lg ${type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`;
    statusDiv.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} mr-2"></i>${message}`;
    statusDiv.classList.remove('hidden');
}

function deleteClass(name) {
    if (!confirm(`Remove custom class "${name}"?`)) return;
    const stored = JSON.parse(localStorage.getItem('adminClasses') || '[]');
    const filtered = stored.filter(c => c !== name);
    localStorage.setItem('adminClasses', JSON.stringify(filtered));
    loadClasses();
}

// Disable default class options in the preset dropdown when they already exist
function setClassPresetAvailability() {
    const preset = document.getElementById('classPreset');
    if (!preset) return;

    const has9 = classesList.some(c => c.name === '9th');
    const has10 = classesList.some(c => c.name === '10th');

    const n9 = preset.querySelector('option[value="9th"]');
    const n10 = preset.querySelector('option[value="10th"]');

    if (n9) {
        n9.disabled = has9;
        n9.textContent = has9 ? '9th (already added)' : '9th';
    }

    if (n10) {
        n10.disabled = has10;
        n10.textContent = has10 ? '10th (already added)' : '10th';
    }

    if (preset.value === '9th' && has9) preset.value = '';
    if (preset.value === '10th' && has10) preset.value = '';
}

function editClass(name) {
    const cls = classesList.find(c => c.name === name && !c.isDefault);
    if (!cls) {
        alert('Only custom classes can be edited.');
        return;
    }

    const newName = prompt('Edit class name', cls.name);
    if (newName === null) return;

    const trimmed = newName.trim();
    if (!trimmed) {
        alert('Class name cannot be empty.');
        return;
    }

    const stored = JSON.parse(localStorage.getItem('adminClasses') || '[]');
    const idx = stored.indexOf(name);
    if (idx !== -1) {
        stored[idx] = trimmed;
        localStorage.setItem('adminClasses', JSON.stringify(stored));
    }

    loadClasses();
}
function editBoard(name) {
    const board = boardsList.find(b => b.name === name && !b.isDefault);
    if (!board) {
        alert('Only custom boards can be edited.');
        return;
    }

    const newName = prompt('Edit board name', board.name);
    if (newName === null) return;

    const trimmed = newName.trim();
    if (!trimmed) {
        alert('Board name cannot be empty.');
        return;
    }

    const stored = JSON.parse(localStorage.getItem('adminBoards') || '[]');
    const idx = stored.indexOf(name);
    if (idx !== -1) {
        stored[idx] = trimmed;
        localStorage.setItem('adminBoards', JSON.stringify(stored));
    }

    loadBoards();
}
function editTeacher(id) {
    const teacher = (teachersCache || []).find(t => t._id === id) || null;
    // fallback: try to locate from DOM data?
    if (!teacher) {
        alert('Teacher not found');
        return;
    }

    const modal = document.getElementById('addTeacherModal');
    const form = document.getElementById('addTeacherForm');
    const status = document.getElementById('teacherFormStatus');
    const title = document.querySelector('#addTeacherModal h3');
    const submitBtn = document.querySelector('#addTeacherForm button[type="submit"]');

    if (!modal || !form) {
        alert('Edit form not available');
        return;
    }

    // ensure roles loaded
    if (!subjectsList.length) {
        fetchSubjectsForRoles().then(() => fillTeacherForm(teacher));
    } else {
        fillTeacherForm(teacher);
    }

    function fillTeacherForm(t) {
        populateTeacherRoleOptions();
        document.getElementById('teacherName').value = t.name || '';
        document.getElementById('teacherEmail').value = t.email || '';
        document.getElementById('teacherPhone').value = t.phone || '';
        document.getElementById('teacherRole').value = t.role || '';
        if (status) status.classList.add('hidden');
        editingTeacherId = t._id;
        if (title) title.textContent = 'Edit Teacher';
        if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-save mr-2"></i>Update Teacher`;
        modal.classList.remove('hidden');
    }
}

async function deleteTeacher(id) {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/admin/teachers/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const result = await response.json().catch(() => ({}));
        hideLoading();
        if (!response.ok) {
            throw new Error(result.message || 'Failed to delete teacher');
        }
        loadTeachers();
    } catch (err) {
        hideLoading();
        alert(err.message || 'Failed to delete teacher');
    }
}

// Subjects
async function loadSubjects() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/subjects`);

        if (!response.ok) throw new Error('Failed to load subjects');

        const result = await response.json();
        subjectsList = result.data || [];
        const tbody = document.getElementById('subjects-table-body');
        
        if (!tbody) {
            hideLoading();
            return;
        }

        if (subjectsList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-6 text-center text-gray-500">
                        <div class="flex flex-col items-center space-y-2">
                            <i class="fas fa-book-open text-3xl text-gray-300"></i>
                            <p>No subjects found</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = subjectsList.map(subject => `
                <tr>
                    <td class="px-4 py-3 whitespace-nowrap">${subject.subject}</td>
                    <td class="px-4 py-3 whitespace-nowrap">${subject.board || 'N/A'}</td>
                    <td class="px-4 py-3 whitespace-nowrap">${subject.class || subject.className || 'N/A'}</td>
                    <td class="px-4 py-3 whitespace-nowrap">₹${(subject.price || 0).toLocaleString()}</td>
                    <td class="px-4 py-3 whitespace-nowrap">
                        <span class="px-3 py-1 rounded-full text-xs ${subject.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${subject.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                        <button onclick="editSubject('${subject._id}')" class="text-yellow-600 hover:text-yellow-800 mr-3">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteSubject('${subject._id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        populateTeacherRoleOptions();
        hideLoading();
    } catch (error) {
        console.error('Subjects error:', error);
        hideLoading();
        alert('Failed to load subjects');
    }
}

async function fetchSubjectsForRoles() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/subjects`);
        if (!response.ok) throw new Error('Failed to load subjects');
        const result = await response.json();
        subjectsList = result.data || [];
        populateTeacherRoleOptions();
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Subjects fetch error:', error);
        alert('Please create a subject before assigning teacher roles.');
    }
}

function populateTeacherRoleOptions() {
    const roleSelects = [
        document.getElementById('teacherRole'),
        document.getElementById('editTeacherRole')
    ].filter(Boolean);
    if (!roleSelects.length) return;

    const emptyHtml = '<option value="">No subjects available</option>';

    const options = subjectsList.length
        ? subjectsList.map(subject => {
            const label = subject.subject || 'Unnamed Subject';
            return `<option value="${subject.subject}">${label}</option>`;
        }).join('')
        : '';

    roleSelects.forEach(select => {
        select.innerHTML = subjectsList.length
            ? `<option value="">Select role</option>${options}`
            : emptyHtml;
    });
}

// Predefined subjects from marketing website (Class 9 & 10, CBSE & ICSE)
const PREDEFINED_SUBJECTS = [
    { id: 'cbse-9-physics', subject: 'Physics', board: 'CBSE', class: '9', price: 4999 },
    { id: 'cbse-9-chemistry', subject: 'Chemistry', board: 'CBSE', class: '9', price: 4999 },
    { id: 'cbse-9-biology', subject: 'Biology', board: 'CBSE', class: '9', price: 4999 },
    { id: 'cbse-9-mathematics', subject: 'Mathematics', board: 'CBSE', class: '9', price: 4999 },
    { id: 'cbse-10-physics', subject: 'Physics', board: 'CBSE', class: '10', price: 5999 },
    { id: 'cbse-10-chemistry', subject: 'Chemistry', board: 'CBSE', class: '10', price: 5999 },
    { id: 'cbse-10-biology', subject: 'Biology', board: 'CBSE', class: '10', price: 5999 },
    { id: 'cbse-10-mathematics', subject: 'Mathematics', board: 'CBSE', class: '10', price: 5999 },
    { id: 'icse-9-physics', subject: 'Physics', board: 'ICSE', class: '9', price: 5499 },
    { id: 'icse-9-chemistry', subject: 'Chemistry', board: 'ICSE', class: '9', price: 5499 },
    { id: 'icse-9-biology', subject: 'Biology', board: 'ICSE', class: '9', price: 5499 },
    { id: 'icse-9-mathematics', subject: 'Mathematics', board: 'ICSE', class: '9', price: 5499 },
    { id: 'icse-10-physics', subject: 'Physics', board: 'ICSE', class: '10', price: 6499 },
    { id: 'icse-10-chemistry', subject: 'Chemistry', board: 'ICSE', class: '10', price: 6499 },
    { id: 'icse-10-biology', subject: 'Biology', board: 'ICSE', class: '10', price: 6499 },
    { id: 'icse-10-mathematics', subject: 'Mathematics', board: 'ICSE', class: '10', price: 6499 }
];

// Disable predefined subject options when that subject+board+class already exists
// Note: subject presets remain selectable even if already added (per request)

function showAddSubjectModal() {
    const modal = document.getElementById('addSubjectModal');
    const form = document.getElementById('addSubjectForm');
    const status = document.getElementById('subjectFormStatus');
    const title = document.querySelector('#addSubjectModal h3');
    const submitBtn = document.querySelector('#addSubjectForm button[type="submit"]');
    
    if (!modal || !form) {
        console.error('Modal or form not found');
        return;
    }
    
    modal.classList.remove('hidden');
    form.reset();
    if (status) {
        status.classList.add('hidden');
    }

    // Reset editing state & labels
    editingSubjectId = null;
    if (title) title.textContent = 'Add New Subject';
    if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-save mr-2"></i>Create Subject`;
}

function closeAddSubjectModal() {
    const modal = document.getElementById('addSubjectModal');
    const form = document.getElementById('addSubjectForm');
    const status = document.getElementById('subjectFormStatus');
    const title = document.querySelector('#addSubjectModal h3');
    const submitBtn = document.querySelector('#addSubjectForm button[type="submit"]');
    
    if (modal) modal.classList.add('hidden');
    if (form) form.reset();
    if (status) status.classList.add('hidden');

    // Reset editing state & labels
    editingSubjectId = null;
    if (title) title.textContent = 'Add New Subject';
    if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-save mr-2"></i>Create Subject`;
}

// Handle subject form submission and modal click-outside
document.addEventListener('DOMContentLoaded', () => {
    // Close modal when clicking outside
    const addSubjectModal = document.getElementById('addSubjectModal');
    if (addSubjectModal) {
        addSubjectModal.addEventListener('click', function(e) {
            if (e.target === addSubjectModal) {
                closeAddSubjectModal();
            }
        });
    }
    
    const addSubjectForm = document.getElementById('addSubjectForm');
    if (addSubjectForm) {
        const predefinedSelect = document.getElementById('predefinedSubject');
        const predefinedWrapper = document.getElementById('predefinedSubjectWrapper');
        const manualFields = document.getElementById('manualSubjectFields');
        const modeRadios = document.querySelectorAll('input[name="subjectMode"]');
        const subjectNameInput = document.getElementById('subjectName');
        const subjectBoardSelect = document.getElementById('subjectBoard');
        const subjectClassInput = document.getElementById('subjectClass');
        const title = document.querySelector('#addSubjectModal h3');
        const submitBtn = document.querySelector('#addSubjectForm button[type="submit"]');

        // Handle mode toggle between existing subjects and creating new
        if (modeRadios && predefinedWrapper && manualFields) {
            const applyMode = () => {
                const mode = document.querySelector('input[name="subjectMode"]:checked')?.value || 'existing';
                if (mode === 'existing') {
                    predefinedWrapper.classList.remove('hidden');
                    if (manualFields) manualFields.classList.add('hidden');
                } else {
                    predefinedWrapper.classList.add('hidden');
                    if (manualFields) manualFields.classList.remove('hidden');
                    if (predefinedSelect) {
                        predefinedSelect.value = '';
                    }
                    // Clear any existing values when switching to new
                    if (subjectNameInput) subjectNameInput.value = '';
                    if (subjectBoardSelect) subjectBoardSelect.value = '';
                    if (subjectClassInput) subjectClassInput.value = '';
                }
            };

            modeRadios.forEach(radio => {
                radio.addEventListener('change', applyMode);
            });

            // Apply initial mode on load
            applyMode();
        }

        if (predefinedSelect) {
            predefinedSelect.addEventListener('change', () => {
                const selectedId = predefinedSelect.value;
                const preset = PREDEFINED_SUBJECTS.find(p => p.id === selectedId);
                if (preset) {
                    if (subjectNameInput) subjectNameInput.value = preset.subject;
                    if (subjectBoardSelect) subjectBoardSelect.value = preset.board;
                    if (subjectClassInput) subjectClassInput.value = preset.class;
                }
            });
        }

        addSubjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const statusDiv = document.getElementById('subjectFormStatus');
            statusDiv.classList.add('hidden');
            
            // Collect form data
            const subjectData = {
                subject: subjectNameInput ? subjectNameInput.value.trim() : '',
                board: subjectBoardSelect ? subjectBoardSelect.value : '',
                class: subjectClassInput ? subjectClassInput.value.trim() : '',
                price: 0,
                duration: '',
                description: ''
            };
            
            // Validate
            if (!subjectData.subject || !subjectData.board || !subjectData.class) {
                showSubjectFormStatus('Please fill all required fields (Subject Name, Board, Class)', 'error');
                return;
            }
            
            // Price, duration, description are optional in this simplified form
            
            // Submit
            try {
                showLoading();
                const isEdit = !!editingSubjectId;
                const url = isEdit ? `${API_BASE_URL}/subjects/${editingSubjectId}` : `${API_BASE_URL}/subjects`;
                const method = isEdit ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(subjectData)
                });
                
                const result = await response.json();
                hideLoading();
                
                if (!response.ok) {
                    throw new Error(result.message || (isEdit ? 'Failed to update subject' : 'Failed to create subject'));
                }
                
                showSubjectFormStatus(isEdit ? 'Subject updated successfully!' : 'Subject created successfully!', 'success');
                setTimeout(() => {
                    closeAddSubjectModal();
                    loadSubjects();
                }, 1500);
            } catch (error) {
                hideLoading();
                showSubjectFormStatus(error.message || 'Failed to create subject', 'error');
            }
        });
    }
});

function showSubjectFormStatus(message, type) {
    const statusDiv = document.getElementById('subjectFormStatus');
    statusDiv.className = `p-4 rounded-lg ${type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`;
    statusDiv.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} mr-2"></i>${message}`;
    statusDiv.classList.remove('hidden');
}

function editSubject(id) {
    const subject = subjectsList.find(s => s._id === id);
    if (!subject) {
        alert('Subject not found');
        return;
    }

    const modal = document.getElementById('addSubjectModal');
    const subjectNameInput = document.getElementById('subjectName');
    const subjectBoardSelect = document.getElementById('subjectBoard');
    const subjectClassInput = document.getElementById('subjectClass');
    const predefinedWrapper = document.getElementById('predefinedSubjectWrapper');
    const manualFields = document.getElementById('manualSubjectFields');
    const modeNewRadio = document.querySelector('input[name="subjectMode"][value="new"]');
    const title = document.querySelector('#addSubjectModal h3');
    const submitBtn = document.querySelector('#addSubjectForm button[type="submit"]');

    editingSubjectId = id;

    // Prefill fields
    if (subjectNameInput) subjectNameInput.value = subject.subject || '';
    if (subjectBoardSelect) subjectBoardSelect.value = subject.board || '';
    if (subjectClassInput) subjectClassInput.value = subject.class || '';

    // Force "new" mode to show manual fields
    if (modeNewRadio) modeNewRadio.checked = true;
    if (predefinedWrapper) predefinedWrapper.classList.add('hidden');
    if (manualFields) manualFields.classList.remove('hidden');

    if (title) title.textContent = 'Edit Subject';
    if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-save mr-2"></i>Update Subject`;

    if (modal) modal.classList.remove('hidden');
}

async function deleteSubject(id) {
    if (!confirm('Are you sure you want to delete this subject?')) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        hideLoading();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to delete subject');
        }
        
        alert('Subject deleted successfully!');
        loadSubjects();
    } catch (error) {
        hideLoading();
        alert(error.message || 'Failed to delete subject');
    }
}

// Notifications
let notificationsCache = [];

async function loadNotifications() {
    try {
        showLoading();

        // Use enrollment data as the notification feed source
        const enrollmentsResponse = await fetch(`${API_BASE_URL}/enrollments?limit=30`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const enrollmentsResult = await enrollmentsResponse.json();
        if (!enrollmentsResponse.ok) throw new Error(enrollmentsResult.message || 'Failed to load enrollments');

        const enrollments = enrollmentsResult.data || [];

        notificationsCache = enrollments
            .map(e => ({
                type: 'enrollment',
                title: `Enrollment - ${e.student?.name || 'Student'}`,
                detail: `${e.course?.name || 'Course'} ${e.course?.class ? `• Class ${e.course.class}` : ''}`,
                time: e.createdAt || e.updatedAt || Date.now()
            }))
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 30);

        renderNotificationsFeed();
        hideLoading();
    } catch (error) {
        console.error('Notifications error:', error);
        hideLoading();
        const feed = document.getElementById('notifications-feed');
        if (feed) {
            feed.innerHTML = `<p class="text-red-600">Failed to load notifications: ${error.message}</p>`;
        }
    }
}

function renderNotificationsFeed() {
    const feed = document.getElementById('notifications-feed');
    if (!feed) return;

    if (!notificationsCache.length) {
        feed.innerHTML = '<p class="text-gray-500">No notifications yet.</p>';
        return;
    }

    feed.innerHTML = notificationsCache.map(event => {
        const badgeColors = 'bg-green-100 text-green-800';

        const date = new Date(event.time);
        const formatted = isNaN(date.getTime()) ? '' : date.toLocaleString();

        return `
            <div class="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="px-2 py-1 rounded-full text-xs font-semibold ${badgeColors}">
                            Enrollment
                        </span>
                        ${formatted ? `<span class="text-xs text-gray-500">${formatted}</span>` : ''}
                    </div>
                    <p class="font-semibold text-gray-800">${event.title}</p>
                    <p class="text-sm text-gray-600">${event.detail || ''}</p>
                </div>
            </div>
        `;
    }).join('');
}

function refreshNotifications() {
    loadNotifications();
}

// Enrollments
let allEnrollments = [];
let allMarketingEnrollments = [];
let enrollmentFilters = {
    board: '',
    class: '',
    subject: ''
};
let enrollmentSearchQuery = '';

async function loadEnrollments() {
    try {
        showLoading();
        
        // Fetch both regular enrollments and marketing enrollments
        const [enrollmentsResponse, marketingResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/enrollments`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            }),
            fetch(`${API_BASE_URL}/admin/marketing-enrollments`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
            })
        ]);

        if (!enrollmentsResponse.ok) throw new Error('Failed to load enrollments');
        if (!marketingResponse.ok) throw new Error('Failed to load marketing enrollments');

        const enrollmentsResult = await enrollmentsResponse.json();
        const marketingResult = await marketingResponse.json();
        
        // Cache data for filtering
        allEnrollments = enrollmentsResult.data || [];
        allMarketingEnrollments = marketingResult.data || [];

        populateEnrollmentFilterOptions();
        renderEnrollmentsTable();

        hideLoading();
    } catch (error) {
        console.error('Enrollments error:', error);
        hideLoading();
        alert('Failed to load enrollments');
    }
}

function refreshEnrollments() {
    loadEnrollments();
}

function onEnrollmentFilterChange() {
    const boardSelect = document.getElementById('filterBoard');
    const classSelect = document.getElementById('filterClass');
    const subjectSelect = document.getElementById('filterSubject');

    enrollmentFilters = {
        board: boardSelect ? boardSelect.value : '',
        class: classSelect ? classSelect.value : '',
        subject: subjectSelect ? subjectSelect.value : ''
    };

    renderEnrollmentsTable();
}

function filterEnrollmentsSearch() {
    const searchInput = document.getElementById('enrollmentsSearch');
    enrollmentSearchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    renderEnrollmentsTable();
}

function populateEnrollmentFilterOptions() {
    const boards = new Set();
    const classes = new Set();
    const subjects = new Set();

    allEnrollments.forEach(enrollment => {
        if (enrollment.student?.board) boards.add(enrollment.student.board);
        if (enrollment.course?.class) classes.add(enrollment.course.class);
        if (Array.isArray(enrollment.subjects)) {
            enrollment.subjects.forEach(s => subjects.add(s));
        }
    });

    allMarketingEnrollments.forEach(enrollment => {
        if (enrollment.board) boards.add(enrollment.board);
        if (enrollment.class) classes.add(enrollment.class);
        if (Array.isArray(enrollment.subjects)) {
            enrollment.subjects.forEach(s => {
                if (s.subject) subjects.add(s.subject);
            });
        }
    });

    const boardSelect = document.getElementById('filterBoard');
    const classSelect = document.getElementById('filterClass');
    const subjectSelect = document.getElementById('filterSubject');

    if (boardSelect) {
        const current = boardSelect.value;
        boardSelect.innerHTML = '<option value="">All Boards</option>' +
            Array.from(boards).sort().map(b => `<option value="${b}">${b}</option>`).join('');
        boardSelect.value = current;
    }

    if (classSelect) {
        const current = classSelect.value;
        classSelect.innerHTML = '<option value="">All Classes</option>' +
            Array.from(classes).sort().map(c => `<option value="${c}">${c}</option>`).join('');
        classSelect.value = current;
    }

    if (subjectSelect) {
        const current = subjectSelect.value;
        subjectSelect.innerHTML = '<option value="">All Subjects</option>' +
            Array.from(subjects).sort().map(s => `<option value="${s}">${s}</option>`).join('');
        subjectSelect.value = current;
    }
}

function renderEnrollmentsTable() {
    const tbody = document.getElementById('enrollments-table-body');
    if (!tbody) return;

    const { board, class: classFilter, subject } = enrollmentFilters;
    const q = enrollmentSearchQuery;

    // Filter regular enrollments
    const filteredRegular = allEnrollments.filter(enrollment => {
        if (board && (enrollment.student?.board || '') !== board) return false;
        if (classFilter && (enrollment.course?.class || '') !== classFilter) return false;
        if (subject) {
            const subjectsArr = Array.isArray(enrollment.subjects) ? enrollment.subjects : [];
            if (!subjectsArr.includes(subject)) return false;
        }
        if (q) {
            const name = (enrollment.student?.name || '').toLowerCase();
            const email = (enrollment.student?.email || '').toLowerCase();
            const phone = (enrollment.student?.phone || '').toLowerCase();
            if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
        }
        return true;
    });

    // Filter marketing enrollments
    const filteredMarketing = allMarketingEnrollments.filter(enrollment => {
        if (board && (enrollment.board || '') !== board) return false;
        if (classFilter && (enrollment.class || '') !== classFilter) return false;
        if (subject) {
            const subjectsArr = Array.isArray(enrollment.subjects) ? enrollment.subjects : [];
            if (!subjectsArr.some(s => s.subject === subject)) return false;
        }
        if (q) {
            const name = (enrollment.studentName || '').toLowerCase();
            const email = (enrollment.email || '').toLowerCase();
            const phone = (enrollment.phone || '').toLowerCase();
            if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
        }
        return true;
    });

    let html = filteredRegular.map(enrollment => `
            <tr>
            <td class="px-4 py-3 whitespace-nowrap">${enrollment.student?.name || 'N/A'}</td>
            <td class="px-4 py-3 whitespace-nowrap">${enrollment.student?.email || 'N/A'}</td>
            <td class="px-4 py-3 whitespace-nowrap">${enrollment.student?.phone || 'N/A'}</td>
            <td class="px-4 py-3 whitespace-nowrap">${enrollment.student?.board || 'N/A'}</td>
            <td class="px-4 py-3 whitespace-nowrap">${enrollment.course?.class || 'N/A'}</td>
            <td class="px-4 py-3">${Array.isArray(enrollment.subjects) ? enrollment.subjects.join(', ') : 'N/A'}</td>
            <td class="px-4 py-3 whitespace-nowrap">₹${enrollment.amount || 0}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs ${getStatusColor(enrollment.status || 'pending')}">${enrollment.status || 'pending'}</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs ${getPaymentStatusColor(enrollment.paymentStatus || 'pending')}">${enrollment.paymentStatus || 'pending'}</span>
                </td>
            </tr>
        `).join('');

    html += filteredMarketing.map(enrollment => `
            <tr>
            <td class="px-4 py-3 whitespace-nowrap">
                        <span class="font-semibold">${enrollment.studentName}</span>
                </td>
            <td class="px-4 py-3 whitespace-nowrap">${enrollment.email || 'N/A'}</td>
            <td class="px-4 py-3 whitespace-nowrap">${enrollment.phone || 'N/A'}</td>
            <td class="px-4 py-3 whitespace-nowrap">${enrollment.board || 'N/A'}</td>
            <td class="px-4 py-3 whitespace-nowrap">${enrollment.class || 'N/A'}</td>
            <td class="px-4 py-3">${enrollment.subjects.map(s => s.subject).join(', ')}</td>
            <td class="px-4 py-3 whitespace-nowrap">₹${enrollment.totalAmount || 0}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Pending</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Pending</span>
                </td>
            </tr>
        `).join('');

    tbody.innerHTML = html || '<tr><td colspan="9" class="px-4 py-3 text-center text-gray-500">No enrollments found</td></tr>';
}

function viewEnrollment(id) {
    alert(`View enrollment: ${id}`);
}

function viewMarketingEnrollment(id) {
    // Fetch and display marketing enrollment details
    fetch(`${API_BASE_URL}/admin/marketing-enrollments`, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(res => res.json())
    .then(result => {
        const enrollment = result.data.find(e => e._id === id);
        if (enrollment) {
            const details = `
Student Name: ${enrollment.studentName}
Email: ${enrollment.email}
Phone: ${enrollment.phone}
Class: ${enrollment.class}
Board: ${enrollment.board}
School: ${enrollment.schoolName || 'N/A'}
Subjects: ${enrollment.subjects.map(s => `${s.subject} (₹${s.price})`).join(', ')}
Total Amount: ₹${enrollment.totalAmount}
Submitted: ${new Date(enrollment.createdAt).toLocaleString()}
            `;
            alert(details);
        }
    })
    .catch(error => {
        console.error('Error fetching enrollment details:', error);
        alert('Failed to load enrollment details');
    });
}

// Live Classes
async function loadLiveClasses() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/live-classes`);

        if (!response.ok) throw new Error('Failed to load live classes');

        const result = await response.json();
        const tbody = document.getElementById('live-classes-table-body');
        
        if (!tbody) {
            hideLoading();
            return;
        }

        if (result.data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-6 text-center text-gray-500">
                        <div class="flex flex-col items-center space-y-2">
                            <i class="fas fa-video text-3xl text-gray-300"></i>
                            <p>No live classes found</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = result.data.map(liveClass => {
                const daysText = Array.isArray(liveClass.days) && liveClass.days.length > 0 ? liveClass.days.join(', ') : 'N/A';
                const timeSlot = liveClass.timeSlot || 'N/A';
                const startDate = liveClass.scheduledDate 
                    ? new Date(liveClass.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'N/A';
                const priceDisplay = liveClass.discountPrice && liveClass.discountPrice > 0 && liveClass.discountPrice < liveClass.price
                    ? `<span class="text-purple-600 font-semibold">₹${liveClass.discountPrice.toLocaleString()}</span><span class="text-gray-500 line-through ml-1 text-xs">₹${liveClass.price.toLocaleString()}</span>`
                    : `<span class="text-purple-600 font-semibold">₹${(liveClass.price || 0).toLocaleString()}</span>`;

                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${liveClass.subject || 'N/A'}</div>
                            ${liveClass.totalDurationText ? `<div class="text-xs text-gray-500">${liveClass.totalDurationText}</div>` : ''}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-900">${liveClass.board || 'N/A'}</div>
                            <div class="text-xs text-gray-500">Class ${liveClass.className || 'N/A'}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-900">${timeSlot}</div>
                            <div class="text-xs text-gray-500">${daysText}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${startDate}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${priceDisplay}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs ${getStatusColor(liveClass.status)}">${liveClass.status}</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button onclick="editLiveClass('${liveClass._id}')" class="text-yellow-600 hover:text-yellow-800 mr-3" title="Edit">
                                <i class="fas fa-edit"></i>
                    </button>
                            <button onclick="deleteLiveClass('${liveClass._id}')" class="text-red-600 hover:text-red-800" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        hideLoading();
    } catch (error) {
        console.error('Live classes error:', error);
        hideLoading();
        alert('Failed to load live classes');
    }
}

async function showAddLiveClassModal() {
    const modal = document.getElementById('addLiveClassModal');
    const form = document.getElementById('addLiveClassForm');
    const status = document.getElementById('liveClassFormStatus');
    const imagePreview = document.getElementById('liveClassImagePreview');
    const imageFileInput = document.getElementById('liveClassImageFile');
    const hiddenImageUrl = document.getElementById('liveClassImageUrl');

    if (!modal || !form) {
        console.error('Live class modal or form not found');
        return;
    }

    // Ensure subjects are loaded so the subject dropdown is populated
    if (!subjectsList.length) {
        await fetchSubjectsForRoles();
    }

    populateLiveClassDropdowns();

    // Reset image preview
    if (imagePreview) imagePreview.classList.add('hidden');
    if (imageFileInput) imageFileInput.value = '';
    if (hiddenImageUrl) hiddenImageUrl.value = '';

    modal.classList.remove('hidden');
    form.reset();
    if (status) status.classList.add('hidden');
    
    // Add image preview handler
    if (imageFileInput) {
        imageFileInput.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewImg = document.getElementById('liveClassImagePreviewImg');
                    if (previewImg) {
                        previewImg.src = e.target.result;
                        document.getElementById('liveClassImagePreview').classList.remove('hidden');
                    }
                };
                reader.readAsDataURL(file);
            }
        };
    }
}

function closeAddLiveClassModal() {
    const modal = document.getElementById('addLiveClassModal');
    const form = document.getElementById('addLiveClassForm');
    const status = document.getElementById('liveClassFormStatus');
    const imagePreview = document.getElementById('liveClassImagePreview');
    const imageFileInput = document.getElementById('liveClassImageFile');
    const hiddenImageUrl = document.getElementById('liveClassImageUrl');

    if (modal) {
        // Reset edit mode
        delete modal.dataset.editId;
        const modalTitle = modal.querySelector('h3');
        const submitButton = form ? form.querySelector('button[type="submit"]') : null;
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-video mr-2 text-red-600"></i>Add Live Class';
        }
        if (submitButton) {
            submitButton.innerHTML = '<i class="fas fa-save mr-2"></i>Create Live Class';
        }
        
        // Reset image preview
        if (imagePreview) imagePreview.classList.add('hidden');
        if (imageFileInput) imageFileInput.value = '';
        if (hiddenImageUrl) hiddenImageUrl.value = '';
        
        modal.classList.add('hidden');
    }
    if (form) form.reset();
    if (status) status.classList.add('hidden');
}

function populateLiveClassDropdowns() {
    const boardSelect = document.getElementById('liveClassBoard');
    const classSelect = document.getElementById('liveClassClass');
    const subjectSelect = document.getElementById('liveClassSubject');

    // Boards from boardsList / base
    if (boardSelect) {
        const storedBoards = JSON.parse(localStorage.getItem('adminBoards') || '[]');
        const baseBoards = ['CBSE', 'ICSE'];
        const boards = Array.from(new Set([...baseBoards, ...storedBoards]));

        boardSelect.innerHTML = '<option value="">Select Board</option>' +
            boards.map(b => `<option value="${b}">${b}</option>`).join('');
    }

    // Classes from classesList / base
    if (classSelect) {
        const storedClasses = JSON.parse(localStorage.getItem('adminClasses') || '[]');
        const baseClasses = ['9th', '10th'];
        const classes = Array.from(new Set([...baseClasses, ...storedClasses]));

        classSelect.innerHTML = '<option value="">Select Class</option>' +
            classes.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    // Subjects from subjectsList
    if (subjectSelect) {
        const options = subjectsList.length
            ? subjectsList.map(s => `<option value="${s.subject}">${s.subject}</option>`).join('')
            : '';
        subjectSelect.innerHTML = '<option value="">Select Subject</option>' + options;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const addLiveClassForm = document.getElementById('addLiveClassForm');
    const liveClassModal = document.getElementById('addLiveClassModal');

    if (liveClassModal) {
        liveClassModal.addEventListener('click', function(e) {
            if (e.target === liveClassModal) {
                closeAddLiveClassModal();
            }
        });
    }

    if (addLiveClassForm) {
        addLiveClassForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const statusDiv = document.getElementById('liveClassFormStatus');
            if (statusDiv) statusDiv.classList.add('hidden');

            const modal = document.getElementById('addLiveClassModal');
            const isEditMode = modal && modal.dataset.editId;
            const editId = isEditMode || null;

            const boardEl = document.getElementById('liveClassBoard');
            const classEl = document.getElementById('liveClassClass');
            const subjectEl = document.getElementById('liveClassSubject');
            const priceEl = document.getElementById('liveClassPrice');
            const discountEl = document.getElementById('liveClassDiscountPrice');
            const startTimeEl = document.getElementById('liveClassStartTime');
            const endTimeEl = document.getElementById('liveClassEndTime');
            const startDateEl = document.getElementById('liveClassStartDate');
            const imageFileEl = document.getElementById('liveClassImageFile');
            const imageUrlEl = document.getElementById('liveClassImageUrl');
            
            const board = boardEl ? boardEl.value : '';
            const className = classEl ? classEl.value : '';
            const subject = subjectEl ? subjectEl.value : '';
            const priceValue = parseFloat(priceEl ? priceEl.value : '0');
            const discountValue = parseFloat(discountEl ? discountEl.value : '0');
            const startTime = startTimeEl ? startTimeEl.value : '';
            const endTime = endTimeEl ? endTimeEl.value : '';
            const startDateStr = startDateEl ? startDateEl.value : '';
            const totalDaysInput = document.getElementById('liveClassTotalDays');
            const totalDaysText = totalDaysInput ? totalDaysInput.value.trim() : '';
            const imageFile = imageFileEl && imageFileEl.files ? imageFileEl.files[0] : null;
            const existingImageUrl = imageUrlEl ? imageUrlEl.value.trim() : '';

            const dayCheckboxes = Array.from(document.querySelectorAll('#liveClassDays input[type="checkbox"]'));
            const days = dayCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

            // Validation
            if (!board || !className || !subject || !startTime || !endTime || !startDateStr || isNaN(priceValue) || priceValue < 0) {
                showLiveClassFormStatus('Please fill all required fields and enter valid start/end times and price.', 'error');
                return;
            }
            if (!days.length) {
                showLiveClassFormStatus('Please select at least one day.', 'error');
                return;
            }
            // Ensure end time is after start time
            // startTime / endTime are in HH:MM (24-hour) from <input type="time">
            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);
            const startTotal = startH * 60 + startM;
            const endTotal = endH * 60 + endM;
            if (endTotal <= startTotal) {
                showLiveClassFormStatus('End time must be after start time.', 'error');
                return;
            }

            const timeSlot = `${startTime}-${endTime}`;

            // Build scheduledDate and duration (minutes) from start/end time
            const scheduledDate = new Date(startDateStr + 'T' + startTime + ':00');
            const durationMinutes = endTotal - startTotal;

            try {
                showLoading();
                
                // Upload image first if a new file is selected
                let imageUrl = existingImageUrl;
                if (imageFile) {
                    const formData = new FormData();
                    formData.append('image', imageFile);
                    
                    const uploadResponse = await fetch(`${API_BASE_URL}/upload/image`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: formData
                    });
                    
                    const ct = uploadResponse.headers.get('content-type') || '';
                    const uploadResult = ct.includes('application/json')
                        ? await uploadResponse.json()
                        : { message: await uploadResponse.text() };
                    
                    if (!uploadResponse.ok) {
                        throw new Error(uploadResult.message || `Failed to upload image (status ${uploadResponse.status})`);
                    }
                    imageUrl = uploadResult.data.url;
                }

                const liveClassData = {
                    title: `${subject} - Class ${className} (${board})`,
                    course: null, // optional, can be wired later to a Course
                    board,
                    className,
                    subject,
                    teacher: currentUser?._id, // current admin/teacher; adjust if needed
                    scheduledDate,
                    duration: durationMinutes,
                    description: totalDaysText ? `Total duration: ${totalDaysText}` : '',
                    timeSlot,
                    status: 'scheduled',
                    price: priceValue,
                    discountPrice: isNaN(discountValue) || discountValue <= 0 ? undefined : discountValue,
                    totalDurationText: totalDaysText || undefined,
                    imageUrl: imageUrl || undefined,
                    days
                };

                const url = editId 
                    ? `${API_BASE_URL}/live-classes/${editId}`
                    : `${API_BASE_URL}/live-classes`;
                const method = editId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(liveClassData)
                });

                const result = await response.json();
                hideLoading();

                if (!response.ok) {
                    throw new Error(result.message || `Failed to ${editId ? 'update' : 'create'} live class`);
                }

                showLiveClassFormStatus(`Live class ${editId ? 'updated' : 'created'} successfully!`, 'success');
                setTimeout(() => {
                    closeAddLiveClassModal();
                    loadLiveClasses();
                }, 1000);
            } catch (error) {
                hideLoading();
                showLiveClassFormStatus(error.message || `Failed to ${editId ? 'update' : 'create'} live class`, 'error');
            }
        });
    }
});

function showLiveClassFormStatus(message, type) {
    const statusDiv = document.getElementById('liveClassFormStatus');
    if (!statusDiv) return;
    statusDiv.className = `p-4 rounded-lg ${type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`;
    statusDiv.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} mr-2"></i>${message}`;
    statusDiv.classList.remove('hidden');
}

async function editLiveClass(id) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/live-classes/${id}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) throw new Error('Failed to load live class');

        const result = await response.json();
        const liveClass = result.data;
        hideLoading();

        // Populate the form with existing data
        document.getElementById('liveClassBoard').value = liveClass.board || '';
        document.getElementById('liveClassClass').value = liveClass.className || '';
        document.getElementById('liveClassSubject').value = liveClass.subject || '';
        document.getElementById('liveClassPrice').value = liveClass.price || '';
        document.getElementById('liveClassDiscountPrice').value = liveClass.discountPrice || '';
        // Populate time inputs from stored slot (HH:MM-HH:MM)
        if (liveClass.timeSlot && liveClass.timeSlot.includes('-')) {
            const [start24, end24] = liveClass.timeSlot.split('-');
            const startInput = document.getElementById('liveClassStartTime');
            const endInput = document.getElementById('liveClassEndTime');
            if (startInput) startInput.value = start24;
            if (endInput) endInput.value = end24;
        } else {
            const startInput = document.getElementById('liveClassStartTime');
            const endInput = document.getElementById('liveClassEndTime');
            if (startInput) startInput.value = '';
            if (endInput) endInput.value = '';
        }
        
        // Format date for input (YYYY-MM-DD)
        if (liveClass.scheduledDate) {
            const date = new Date(liveClass.scheduledDate);
            const formattedDate = date.toISOString().split('T')[0];
            document.getElementById('liveClassStartDate').value = formattedDate;
        }
        
        // Set total days if exists - extract from totalDurationText or description
        const totalDaysInput = document.getElementById('liveClassTotalDays');
        if (totalDaysInput) {
            let totalDaysValue = liveClass.totalDurationText || '';
            if (!totalDaysValue && liveClass.description && liveClass.description.includes('Total duration:')) {
                totalDaysValue = liveClass.description.replace('Total duration:', '').trim();
            }
            totalDaysInput.value = totalDaysValue;
        }

        // Set image preview if exists
        const imageFileInput = document.getElementById('liveClassImageFile');
        const imagePreview = document.getElementById('liveClassImagePreview');
        const imagePreviewImg = document.getElementById('liveClassImagePreviewImg');
        const hiddenImageUrl = document.getElementById('liveClassImageUrl');
        
        if (liveClass.imageUrl) {
            // Store existing image URL in hidden field
            if (hiddenImageUrl) {
                hiddenImageUrl.value = liveClass.imageUrl;
            }
            
            // Show preview
            if (imagePreview && imagePreviewImg) {
                imagePreviewImg.src = liveClass.imageUrl;
                imagePreview.classList.remove('hidden');
            }
        } else {
            if (hiddenImageUrl) hiddenImageUrl.value = '';
            if (imagePreview) imagePreview.classList.add('hidden');
        }
        
        // Add image preview handler for file input
        if (imageFileInput) {
            imageFileInput.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        if (imagePreviewImg) {
                            imagePreviewImg.src = e.target.result;
                            if (imagePreview) imagePreview.classList.remove('hidden');
                        }
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        // Set days checkboxes
        const dayCheckboxes = document.querySelectorAll('#liveClassDays input[type="checkbox"]');
        dayCheckboxes.forEach(cb => {
            cb.checked = liveClass.days && liveClass.days.includes(cb.value);
        });

        // Change modal title and form action
        const modal = document.getElementById('addLiveClassModal');
        const modalTitle = modal.querySelector('h3');
        const submitButton = document.getElementById('addLiveClassForm').querySelector('button[type="submit"]');
        
        modalTitle.innerHTML = '<i class="fas fa-edit mr-2 text-red-600"></i>Edit Live Class';
        submitButton.innerHTML = '<i class="fas fa-save mr-2"></i>Update Live Class';
        
        // Store the ID for update
        modal.dataset.editId = id;

        // Populate dropdowns
        await populateLiveClassDropdowns();
        
        // Show modal
        modal.classList.remove('hidden');
    } catch (error) {
        hideLoading();
        console.error('Error loading live class:', error);
        alert('Failed to load live class for editing');
    }
}

async function deleteLiveClass(id) {
    if (!confirm('Are you sure you want to delete this live class? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/live-classes/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const result = await response.json();
        hideLoading();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to delete live class');
        }

        alert('Live class deleted successfully!');
        loadLiveClasses();
    } catch (error) {
        hideLoading();
        console.error('Error deleting live class:', error);
        alert('Failed to delete live class: ' + error.message);
    }
}

function viewLiveClass(id) {
    alert(`View live class: ${id}`);
}

// Utility Functions
function getStatusColor(status) {
    const colors = {
        'active': 'bg-green-100 text-green-800',
        'pending': 'bg-yellow-100 text-yellow-800',
        'completed': 'bg-blue-100 text-blue-800',
        'cancelled': 'bg-red-100 text-red-800',
        'scheduled': 'bg-purple-100 text-purple-800',
        'live': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

function getPaymentStatusColor(status) {
    const colors = {
        'paid': 'bg-green-100 text-green-800',
        'pending': 'bg-yellow-100 text-yellow-800',
        'failed': 'bg-red-100 text-red-800',
        'refunded': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function loadInitialData() {
    // Pre-load dashboard data
    if (document.getElementById('dashboard-section').classList.contains('hidden') === false) {
        loadDashboard();
    }
}

