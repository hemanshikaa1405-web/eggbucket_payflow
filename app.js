document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const addEmployeeBtn = document.getElementById('add-employee-btn');
    const modal = document.getElementById('add-employee-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-modal-btn');
    const form = document.getElementById('add-employee-form');
    const employeeGrid = document.querySelector('.employee-grid');
    const pageSubtitle = document.querySelector('.page-subtitle');

    const API_URL = '/api';

    // State
    let employees = [];
    let editingId = null;

    // Initialize
    fetchEmployees();

    // Modal Events
    const openModal = (isEdit = false) => {
        if (!isEdit) {
            editingId = null;
            form.reset();
            const modalTitle = modal.querySelector('.modal-header h2');
            const submitBtn = form.querySelector('button[type="submit"]');
            if (modalTitle) modalTitle.textContent = 'Add Employee';
            if (submitBtn) submitBtn.textContent = 'Add Employee';
        }
        modal.classList.add('show');
    };

    const closeModal = () => {
        modal.classList.remove('show');
        form.reset();
        editingId = null;
    };

    addEmployeeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(false);
    });

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // API Calls
    async function fetchEmployees() {
        try {
            console.log('🔄 Loading employees from Supabase...');
            const { data, error } = await window.supabaseClient
                .from('Employee')
                .select('*')
                .order('name', { ascending: true });

            if (error) {
                console.error('❌ Supabase load error:', error);
                throw error;
            }

            employees = data || [];
            console.log('✅ Loaded', employees.length, 'employees from Supabase');
            renderEmployees();
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to load employees from Supabase.');
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('emp-name').value;
        const department = document.getElementById('emp-dept').value;
        const phone = document.getElementById('emp-phone').value;

        const employeeData = { name, department, phone };

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            let employeeData = { name, department, phone };

            if (editingId) {
                console.log('🔄 Updating employee in Supabase...');
                const { error } = await window.supabaseClient
                    .from('Employee')
                    .update({ name, department, phone })
                    .eq('id', editingId);

                if (error) throw error;
                console.log('✅ Employee updated');
            } else {
                console.log('🔄 Inserting new employee to Supabase...');
                const { error } = await window.supabaseClient
                    .from('Employee')
                    .insert([{ name, department, phone }]);

                if (error) throw error;
                console.log('✅ Employee added');
            }

            await fetchEmployees();
            closeModal();

            // Optional: Success flash on header
            const title = document.querySelector('.page-title');
            title.style.color = 'var(--green)';
            setTimeout(() => title.style.color = '', 2000);

        } catch (error) {
            console.error('Save Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });

    employeeGrid.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.action-edit');
        const deleteBtn = e.target.closest('.action-delete');

        if (editBtn) {
            const id = editBtn.dataset.id;
            const employee = employees.find(emp => emp.id === id);
            if (employee) {
                editingId = id;
                document.getElementById('emp-name').value = employee.name;
                document.getElementById('emp-dept').value = employee.department || '';
                document.getElementById('emp-phone').value = employee.phone || '';

                const modalTitle = modal.querySelector('.modal-header h2');
                const submitBtn = form.querySelector('button[type="submit"]');
                if (modalTitle) modalTitle.textContent = 'Edit Employee';
                if (submitBtn) submitBtn.textContent = 'Save Changes';
                openModal(true);
            }
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('Are you sure you want to delete this employee?')) {
                try {
                    console.log('🔄 Deleting employee from Supabase...');
                    const { error } = await window.supabaseClient
                        .from('Employee')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;
                    console.log('✅ Employee deleted');
                    await fetchEmployees();
                } catch (error) {
                    console.error('Error:', error);
                    alert('Failed to delete employee.');
                }
            }
        }
    });

    // Render Function
    function renderEmployees() {
        pageSubtitle.textContent = `${employees.length} employee${employees.length !== 1 ? 's' : ''} registered`;

        if (employees.length === 0) {
            employeeGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                        style="margin-bottom: 16px; opacity: 0.5;">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <h3 style="font-size: 18px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">No employees yet</h3>
                    <p style="font-size: 14px;">Click "Add Employee" to get started.</p>
                </div>
            `;
            return;
        }

        employeeGrid.innerHTML = employees.map(emp => `
            <div class="employee-card" style="position: relative;">
                <div class="card-actions" style="position: absolute; top: 16px; right: 16px; display: flex; gap: 8px;">
                    <button class="action-btn action-edit" data-id="${emp.id}" title="Edit" aria-label="Edit" style="background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 4px; transition: all 0.2s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.backgroundColor='rgba(0,0,0,0.05)'; this.style.color='var(--text-main)'" onmouseout="this.style.backgroundColor='transparent'; this.style.color='var(--text-muted)'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <a class="action-btn action-months" href="records.html?employeeId=${emp.id}" title="Months" aria-label="Months" style="background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; text-decoration: none;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </a>
                    <button class="action-btn action-delete" data-id="${emp.id}" title="Delete" aria-label="Delete" style="background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 4px; transition: all 0.2s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.backgroundColor='rgba(245,101,101,0.1)'; this.style.color='#E53E3E'" onmouseout="this.style.backgroundColor='transparent'; this.style.color='var(--text-muted)'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
                <h3 style="padding-right: 64px; font-weight: 600;">${escapeHTML(emp.name)}</h3>
                ${emp.department ? `<p style="margin-top: 12px; font-style: normal; font-size: 14px; color: var(--text-main);"><strong>Dept:</strong> ${escapeHTML(emp.department)}</p>` : ''}
                ${emp.phone ? `<p style="margin-top: 4px; font-style: normal; font-size: 14px; color: var(--text-main);"><strong>Phone:</strong> ${escapeHTML(emp.phone)}</p>` : ''}
                ${!emp.department && !emp.phone ? `<p style="margin-top: 12px;">No details added</p>` : `<p></p>`}
            </div>
        `).join('');
    }

    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
