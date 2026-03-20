// Initialize Supabase client (will be set in DOMContentLoaded)
let supabase = null;

document.addEventListener('DOMContentLoaded', () => {
    // Use the global window.supabaseClient from supabaseClient.js
    if (!window.supabaseClient) {
        console.error('❌ Global Supabase client not initialized. Make sure supabaseClient.js is included.');
    } else {
        supabase = window.supabaseClient;
    }
    // DOM Elements
    const form = document.getElementById('calc-form');
    const employeeSelect = document.getElementById('calc-employee');
    const monthInput = document.getElementById('calc-month');
    const incentiveInput = document.getElementById('calc-incentive');
    const incentivesInput = document.getElementById('calc-incentives');
    const aqCountInput = document.getElementById('calc-aq-count');
    const aqCostInput = document.getElementById('calc-aq-cost');
    const monthlySalaryInput = document.getElementById('calc-monthly-salary');
    const bonusInput = document.getElementById('calc-bonus');

    // Form groups for conditional display
    const incentiveGroup = document.getElementById('incentive-group');
    const incentivesGroup = document.getElementById('incentives-group');
    const aqCountGroup = document.getElementById('aq-count-group');
    const aqCostGroup = document.getElementById('aq-cost-group');
    const monthlySalaryGroup = document.getElementById('monthly-salary-group');

    // Display Elements
    const breakdownSubtitle = document.getElementById('breakdown-subtitle');
    const breakdownTotal = document.getElementById('breakdown-total');
    const breakdownBadge = document.getElementById('breakdown-badge');

    // Progress Sections
    const progressSectionAQ = document.getElementById('progress-section-aq');
    const progressSectionFixed = document.getElementById('progress-section-fixed');

    // Section Info Elements
    const infoAqCount = document.getElementById('info-aq-count');
    const infoAqCost = document.getElementById('info-aq-cost');
    const infoMonthlySalary = document.getElementById('info-monthly-salary');

    // Detailed Values
    const valBase = document.getElementById('val-base');
    const valIncentive = document.getElementById('val-incentive');
    const valBonus = document.getElementById('val-bonus');
    const valTotal = document.getElementById('val-total');

    // History List
    const historyList = document.getElementById('history-list');

    const API_URL = '/api';

    // State Variables
    let employees = [];
    let historyRecords = [];

    // Try loading logic file if missing
    if (typeof calculateSalary !== 'function') {
        console.error("salaryEngine.js is not loaded.");
        return;
    }

    // Initialize formatting utility
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });

    async function init() {
        await loadData();

        setInitialMonth();

        // Listeners for live updates
        employeeSelect.addEventListener('change', handleEmployeeChange);
        monthInput.addEventListener('change', () => {
            updateLivePreview();
            updateCalcMonthHint();
        });
        incentiveInput.addEventListener('input', updateLivePreview);
        if (incentivesInput) incentivesInput.addEventListener('input', updateLivePreview);
        aqCountInput.addEventListener('input', updateLivePreview);
        aqCostInput.addEventListener('input', updateLivePreview);
        monthlySalaryInput.addEventListener('input', updateLivePreview);
        bonusInput.addEventListener('input', updateLivePreview);
    }

    function isInternOrSupervisor(emp) {
        if (!emp) return false;
        const d = String(emp.department || emp.Department || '').trim().toLowerCase();
        return d.includes('intern') || d.includes('executive supervisor');
    }

    async function loadData() {
        try {
            // Load employees - try Supabase first
            try {
                if (supabase) {
                    const { data, error } = await supabase
                        .from('Employee')
                        .select('*')
                        .order('name', { ascending: true });

                    if (error) throw error;
                    employees = data || [];
                }
            } catch (err) {
                console.error("Error fetching employees from Supabase, falling back", err);
            }

            if (employees.length === 0) {
                console.warn("No employees loaded from Supabase.");
            }

            // Load records
            historyRecords = [];
            if (supabase) {
                try {
                    console.log('🔄 Loading records from Supabase...');
                    const { data, error } = await supabase
                        .from('SalaryRecord')
                        .select('*, Employee(*)')
                        .order('createdAt', { ascending: false });

                    if (error) {
                        console.error('❌ Supabase load error:', error);
                        throw error;
                    }
                    console.log('✅ Loaded', data.length, 'records from Supabase');
                    historyRecords = data || [];
                } catch (dbError) {
                    console.error('❌ Supabase load failed - Full error:', dbError);
                    console.warn('⚠️ Error message:', dbError.message);
                }
            } else {
                console.warn('ℹ️ Supabase not available, cannot load records');
            }

            populateEmployees();
            renderHistory();
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load data.');
        }
    }

    function isActiveEmployee(emp) {
        return emp && (emp.is_active === undefined ? true : !!emp.is_active);
    }

    function populateEmployees() {
        const deptDisplay = document.getElementById('employee-dept');
        if (employees.length === 0) {
            employeeSelect.innerHTML = '<option value="" disabled selected>No employees found. Add one in Employees tab.</option>';
            if (deptDisplay) deptDisplay.textContent = '';
            return;
        }

        employeeSelect.innerHTML = '<option value="" disabled selected>Select an employee</option>';
        employees.filter(isActiveEmployee).forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.name;
            // store department on option for easy access later
            option.dataset.dept = emp.department || '';
            employeeSelect.appendChild(option);
        });
        if (deptDisplay) deptDisplay.textContent = '';
    }

    function setInitialMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        monthInput.value = `${year}-${month}`;
    }

    function updateCalcMonthHint() {
        const hint = document.getElementById('calc-month-hint');
        if (!hint) return;
        const empId = employeeSelect.value;
        const monthVal = monthInput.value;
        if (!empId || !monthVal) {
            hint.style.display = 'none';
            hint.textContent = '';
            return;
        }
        const exists = historyRecords.some(r => r.employeeId === empId && r.month === monthVal);
        const isSupervisor = (JSON.parse(sessionStorage.getItem('sc_user') || '{}')).role === 'supervisor';
        if (exists) {
            hint.style.display = 'block';
            hint.textContent = isSupervisor
                ? 'Salary already processed for this month. Submitting will update the existing record.'
                : 'Salary already processed for this month. Go to Records to view or edit.';
        } else {
            hint.style.display = 'none';
            hint.textContent = '';
        }
    }

    function handleEmployeeChange() {
        const empId = employeeSelect.value;
        const emp = employees.find(e => e.id === empId);
        const deptDisplay = document.getElementById('employee-dept');
        if (deptDisplay) {
            deptDisplay.textContent = emp ? (emp.department || '') : '';
        }
        updateCalcMonthHint();

        // Reset all groups
        if (incentiveGroup) incentiveGroup.style.display = 'none';
        if (incentivesGroup) incentivesGroup.style.display = 'none';
        aqCountGroup.style.display = 'none';
        aqCostGroup.style.display = 'none';
        monthlySalaryGroup.style.display = 'none';

        incentiveInput.required = false;
        if (incentivesInput) incentivesInput.required = false;
        aqCountInput.required = false;
        aqCostInput.required = false;
        monthlySalaryInput.required = false;

        if (emp) {
            if (emp.department === 'Customer AQ Fleet') {
                // Show Monthly Salary + AQ fields
                monthlySalaryGroup.style.display = 'block';
                aqCountGroup.style.display = 'block';
                aqCostGroup.style.display = 'block';
                monthlySalaryInput.required = true;
                aqCountInput.required = true;
                aqCostInput.required = true;
            } else if (isInternOrSupervisor(emp)) {
                // Show monthly salary and incentives for Interns and Executive Supervisors
                monthlySalaryGroup.style.display = 'block';
                if (incentivesGroup) incentivesGroup.style.display = 'block';
                monthlySalaryInput.required = true;
            } else {
                // Sales-cum-Delivery Fleet: monthly salary + manual incentive
                monthlySalaryGroup.style.display = 'block';
                if (incentiveGroup) incentiveGroup.style.display = 'block';
                monthlySalaryInput.required = true;
                incentiveInput.required = true;
            }
        }

        updateLivePreview();
    }

    function updateLivePreview() {
        const empId = employeeSelect.value;
        const monthVal = monthInput.value;
        const emp = employees.find(e => e.id === empId);

        let empName = "Select Employee";
        if (empId) {
            if (emp) empName = emp.name;
        }

        let displayMonth = "Select Month";
        if (monthVal) {
            const dateObj = new Date(monthVal + "-01");
            displayMonth = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }

        breakdownSubtitle.textContent = `${empName} • ${displayMonth}`;

        if (!emp) {
            resetDisplay();
            return;
        }

        let totalSalary = 0;
        let baseSalary = 0;
        let incentive = 0;
        let bonus = parseInt(bonusInput.value, 10) || 0;

        if (emp.department === 'Customer AQ Fleet') {
            // AQ Fleet calculation
            const monthlySalary = parseInt(monthlySalaryInput.value, 10);
            const aqCount = parseInt(aqCountInput.value, 10);
            const aqCost = parseFloat(aqCostInput.value, 10) || 0;

            if (isNaN(monthlySalary) || monthlySalary < 0 || isNaN(aqCount) || aqCount < 0 || isNaN(aqCost) || aqCost < 0) {
                resetDisplay();
                return;
            }

            // For AQ Fleet, base salary is manually entered monthly salary
            baseSalary = monthlySalary;
            incentive = aqCount * aqCost;
            totalSalary = baseSalary + incentive + bonus;

            breakdownBadge.textContent = 'AQ Fleet';
            breakdownBadge.style.color = '#2563EB';
            breakdownBadge.style.backgroundColor = 'rgba(37, 99, 235, 0.07)';
            breakdownBadge.style.borderColor = 'rgba(37, 99, 235, 0.15)';

            // Show AQ section, hide others
            progressSectionAQ.style.display = 'block';
            progressSectionFixed.style.display = 'none';

            // Populate AQ info
            infoAqCount.textContent = aqCount.toLocaleString('en-IN');
            infoAqCost.textContent = formatter.format(aqCost);

        } else if (isInternOrSupervisor(emp)) {
            // Monthly salary + manual incentives for Interns and Executive Supervisors
            const monthlySalary = parseInt(monthlySalaryInput.value, 10);
            const incentives = parseInt(incentivesInput && incentivesInput.value, 10) || 0;

            if (isNaN(monthlySalary) || monthlySalary < 0) {
                resetDisplay();
                return;
            }

            baseSalary = monthlySalary;
            incentive = incentives;
            totalSalary = baseSalary + incentive + bonus;

            if (emp.department === 'Interns') {
                breakdownBadge.textContent = 'Intern';
                breakdownBadge.style.color = '#7C3AED';
                breakdownBadge.style.backgroundColor = 'rgba(124, 58, 237, 0.07)';
                breakdownBadge.style.borderColor = 'rgba(124, 58, 237, 0.15)';
            } else {
                breakdownBadge.textContent = 'Supervisor';
                breakdownBadge.style.color = '#DC2626';
                breakdownBadge.style.backgroundColor = 'rgba(220, 38, 38, 0.07)';
                breakdownBadge.style.borderColor = 'rgba(220, 38, 38, 0.15)';
            }

            // Show fixed salary section, hide others
            progressSectionAQ.style.display = 'none';
            progressSectionFixed.style.display = 'block';

            // Populate fixed salary info
            infoMonthlySalary.textContent = formatter.format(monthlySalary);
            const infoIncentivesWrap = document.getElementById('info-incentives-wrap');
            const infoIncentives = document.getElementById('info-incentives');
            if (infoIncentivesWrap && infoIncentives) {
                if (incentive > 0) {
                    infoIncentivesWrap.style.display = 'block';
                    infoIncentives.textContent = formatter.format(incentive);
                } else {
                    infoIncentivesWrap.style.display = 'none';
                }
            }

        } else {
            // Sales-cum-Delivery Fleet — monthly salary + manual incentive
            const monthlySalary = parseInt(monthlySalaryInput.value, 10);
            const manualIncentive = parseInt(incentiveInput.value, 10);

            if (isNaN(monthlySalary) || monthlySalary < 0 || isNaN(manualIncentive) || manualIncentive < 0) {
                resetDisplay();
                return;
            }

            baseSalary = monthlySalary;
            incentive = manualIncentive;
            totalSalary = baseSalary + incentive + bonus;

            breakdownBadge.textContent = 'Sales Fleet';
            breakdownBadge.style.color = '#C2500A';
            breakdownBadge.style.backgroundColor = 'rgba(249, 115, 22, 0.10)';
            breakdownBadge.style.borderColor = 'rgba(249, 115, 22, 0.22)';

            // Hide all progress sections
            progressSectionAQ.style.display = 'none';
            progressSectionFixed.style.display = 'none';
        }

        breakdownTotal.textContent = formatter.format(totalSalary);
        valBase.textContent = formatter.format(baseSalary);
        valIncentive.textContent = formatter.format(incentive);
        valBonus.textContent = formatter.format(bonus);
        valTotal.textContent = formatter.format(totalSalary);
    }

    function resetDisplay() {
        breakdownTotal.textContent = '₹0';
        valBase.textContent = '₹0';
        valIncentive.textContent = '₹0';
        valBonus.textContent = '₹0';
        valTotal.textContent = '₹0';
        breakdownBadge.textContent = 'Waiting...';
        breakdownBadge.style.color = '#9B6A4F';
        breakdownBadge.style.backgroundColor = 'transparent';
        breakdownBadge.style.borderColor = 'transparent';

        // Hide all progress sections
        progressSectionAQ.style.display = 'none';
        progressSectionFixed.style.display = 'none';

        const infoIncentivesWrap = document.getElementById('info-incentives-wrap');
        if (infoIncentivesWrap) infoIncentivesWrap.style.display = 'none';
    }

    async function saveSalary(record, isUpdate = false) {
        try {
            console.log('💾 Saving salary...', JSON.stringify(record, null, 2));
            let saved = false;

            if (supabase) {
                try {
                    console.log('🔄 Attempting Supabase save...');
                    console.log('📊 Record structure:', Object.keys(record));
                    const { data, error } = await supabase
                        .from('SalaryRecord')
                        .upsert([record], { onConflict: 'id' });

                    if (error) {
                        console.error('❌ Supabase insert error details:', error);
                        throw error;
                    }
                    console.log('✅ Saved to Supabase with ID:', data);
                    saved = true;
                } catch (dbError) {
                    console.error('❌ Supabase save failed - Full error:', dbError);
                    if (dbError && dbError.code === '23505') {
                        alert('Salary already exists for this employee for the selected month. Go to Records to view or edit.');
                        return false;
                    }
                    throw dbError;
                }
            }

            if (saved) {
                console.log('✅ Salary saved successfully');
                alert(isUpdate ? 'Salary record updated successfully.' : 'Salary saved successfully');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Unexpected error:', error);
            alert('Failed to save salary: ' + error.message);
            return false;
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const empId = employeeSelect.value;
        const monthVal = monthInput.value;
        const emp = employees.find(e => e.id === empId);

        if (!empId || !monthVal || !emp) {
            alert("Please fill in all details correctly.");
            return;
        }

        const existingRecord = historyRecords.find(r => r.employeeId === empId && r.month === monthVal);
        const isSupervisor = (JSON.parse(sessionStorage.getItem('sc_user') || '{}')).role === 'supervisor';
        if (existingRecord && !isSupervisor) {
            alert("Salary already exists for this employee for the selected month. Go to Records to view or edit.");
            return;
        }
        // Supervisor: upsert (update if exists, create if not). Admin: only create (blocked above if exists).

        const bonus = parseInt(bonusInput.value, 10) || 0;
        let recordData;

        if (emp.department === 'Customer AQ Fleet') {
            const monthlySalary = parseInt(monthlySalaryInput.value, 10);
            const aqCount = parseInt(aqCountInput.value, 10);
            const aqCost = parseFloat(aqCostInput.value, 10) || 0;

            if (isNaN(monthlySalary) || monthlySalary < 0 || isNaN(aqCount) || aqCount < 0 || isNaN(aqCost) || aqCost < 0) {
                alert("Please fill in all AQ details correctly.");
                return;
            }

            const baseSalary = monthlySalary;
            const incentive = aqCount * aqCost;
            const totalSalary = baseSalary + incentive + bonus;

            recordData = {
                employeeId: emp.id,
                employeeName: emp.name,
                month: monthVal,
                monthlySalary: monthlySalary,
                aqCount: aqCount,
                aqCost: aqCost,
                bonus: bonus,
                baseSalary: baseSalary,
                incentive: incentive,
                totalSalary: totalSalary,
                inputs: { monthlySalary: monthlySalary, aqCount: aqCount, aqCost: aqCost, bonus: bonus },
                type: 'aq_fleet'
            };
        } else if (isInternOrSupervisor(emp)) {
            const monthlySalary = parseInt(monthlySalaryInput.value, 10);
            const incentives = parseInt(incentivesInput && incentivesInput.value, 10) || 0;

            if (isNaN(monthlySalary) || monthlySalary < 0) {
                alert("Please fill in the monthly salary correctly.");
                return;
            }

            const totalSalary = monthlySalary + incentives + bonus;
            const isIntern = String(emp.department || '').toLowerCase().includes('intern');

            recordData = {
                employeeId: emp.id,
                employeeName: emp.name,
                month: monthVal,
                monthlySalary: monthlySalary,
                bonus: bonus,
                baseSalary: monthlySalary,
                incentive: incentives,
                totalSalary: totalSalary,
                inputs: { monthlySalary: monthlySalary, incentives: incentives, bonus: bonus },
                type: isIntern ? 'intern' : 'supervisor'
            };
        } else {
            const monthlySalary = parseInt(monthlySalaryInput.value, 10);
            const manualIncentive = parseInt(incentiveInput.value, 10);

            if (isNaN(monthlySalary) || monthlySalary < 0) {
                alert("Please fill in the monthly salary correctly.");
                return;
            }
            if (isNaN(manualIncentive) || manualIncentive < 0) {
                alert("Please fill in the incentive amount correctly.");
                return;
            }

            const baseSalary = monthlySalary;
            const totalSalary = baseSalary + manualIncentive + bonus;

            recordData = {
                employeeId: emp.id,
                employeeName: emp.name,
                month: monthVal,
                monthlySalary: monthlySalary,
                bonus: bonus,
                baseSalary: baseSalary,
                incentive: manualIncentive,
                totalSalary: totalSalary,
                inputs: { monthlySalary: monthlySalary, incentive: manualIncentive, bonus: bonus },
                type: 'sales_fleet'
            };
        }

        // Store employee department at time of record creation (preserve history)
        recordData.department = emp.department || '';

        try {
            if (existingRecord) {
                recordData.id = existingRecord.id;
                recordData.createdAt = existingRecord.createdAt || new Date().toISOString();
            } else {
                recordData.id = crypto.randomUUID();
                recordData.createdAt = new Date().toISOString();
            }

            // Save to Supabase (upsert: create new or update existing)
            const saved = await saveSalary(recordData, !!existingRecord);
            if (saved) {
                await loadData();
                // Reset all inputs
                incentiveInput.value = 0;
                if (incentivesInput) incentivesInput.value = 0;
                aqCountInput.value = 0;
                aqCostInput.value = 0;
                monthlySalaryInput.value = 0;
                bonusInput.value = 0;
                updateLivePreview();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to save record.');
        }
    });

    historyList.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.history-delete-btn');

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (!confirm('Delete this salary record? This cannot be undone.')) return;
            try {
                console.log('🗑️ Deleting salary record:', id);
                let deleted = false;

                if (supabase) {
                    try {
                        console.log('🔄 Attempting Supabase delete...');
                        const { error } = await supabase
                            .from('SalaryRecord')
                            .delete()
                            .eq('id', id);

                        if (error) throw error;
                        console.log('✅ Deleted from Supabase');
                        deleted = true;
                    } catch (dbError) {
                        console.warn('⚠️ Supabase delete failed:', dbError);
                    }
                }

                if (deleted) {
                    console.log('✅ Record deleted successfully');
                    alert('Record deleted successfully');
                    await loadData();
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to delete record.');
            }
        }
    });

    function renderHistory() {
        const isSupervisor = (JSON.parse(sessionStorage.getItem('sc_user') || '{}')).role === 'supervisor';

        if (historyRecords.length === 0) {
            historyList.innerHTML = '<p style="color: #9B6A4F; font-size: 14px; padding: 24px; text-align: center; background-color: #FFF8F3; border: 1.5px dashed #F0D8C8; border-radius: 12px;">No salary records saved yet.</p>';
            return;
        }

        historyList.innerHTML = historyRecords.map(rec => {
            let displayMonth = rec.month;
            try {
                const dateObj = new Date(rec.month + '-01');
                displayMonth = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            } catch (e) { }

            const emp = employees.find(e => e.id === rec.employeeId);
            const empName = emp ? emp.name : 'Unknown';
            const recDept = (rec.department != null && rec.department !== '') ? rec.department : (emp ? emp.department : 'Unknown');

            const deleteBtnHtml = isSupervisor ? '' : `
                    <button class="history-action-btn history-delete-btn" data-id="${rec.id}" title="Delete record" aria-label="Delete record">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>`;
            return `
            <div class="history-card" data-id="${rec.id}">
                <div class="history-card-top">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    ${escapeHTML(empName)} (${escapeHTML(recDept)})
                    ${deleteBtnHtml}
                </div>
                <div class="history-card-bottom">
                    <div class="history-meta-group">
                        <div class="history-meta-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            ${displayMonth}
                        </div>
                        <div class="history-meta-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                            ${rec.type === 'aq_fleet' ? `${rec.aqCount.toLocaleString('en-IN')} AQ customers` :
                    rec.type === 'intern' ? `${rec.monthlySalary.toLocaleString('en-IN')} salary${rec.incentive > 0 ? ` + ₹${rec.incentive.toLocaleString('en-IN')} incentives` : ''}` :
                        rec.type === 'supervisor' ? `${rec.monthlySalary.toLocaleString('en-IN')} salary${rec.incentive > 0 ? ` + ₹${rec.incentive.toLocaleString('en-IN')} incentives` : ''}` :
                            `Incentive: ${formatter.format(rec.incentive || 0)}`
                }
                        </div>
                    </div>
                    <div class="history-card-total">
                        Total: <strong>${formatter.format(rec.totalSalary)}</strong>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    init();
});
