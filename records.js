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
    const recordsContainer = document.getElementById('records-container');
    const filterDropdown = document.getElementById('employee-filter');
    // Preselect employee filter from URL (records.html?employeeId=...)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const initialEmployeeFilter = urlParams.get('employeeId');
        if (initialEmployeeFilter) filterDropdown.value = initialEmployeeFilter;
    } catch (e) { }
    const addRecordBtn = document.getElementById('add-record-btn');
    const modal = document.getElementById('add-record-modal');
    const closeModalBtn = document.getElementById('close-record-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-record-modal-btn');
    const addRecordForm = document.getElementById('add-record-form');
    const recEmployee = document.getElementById('rec-employee');
    const recMonth = document.getElementById('rec-month');
    const recIncentive = document.getElementById('rec-incentive');
    const recAqCount = document.getElementById('rec-aq-count');
    const recAqCost = document.getElementById('rec-aq-cost');
    const recMonthlySalary = document.getElementById('rec-monthly-salary');
    const recIncentives = document.getElementById('rec-incentives');
    const recBonus = document.getElementById('rec-bonus');

    const recIncentiveGroup = document.getElementById('rec-incentive-group');
    const recAqCountGroup = document.getElementById('rec-aq-count-group');
    const recAqCostGroup = document.getElementById('rec-aq-cost-group');
    const recMonthlySalaryGroup = document.getElementById('rec-monthly-salary-group');
    const recIncentivesGroup = document.getElementById('rec-incentives-group');
    const recBonusGroup = document.getElementById('rec-bonus-group');

    const recPreview = document.getElementById('rec-preview');
    const prevBase = document.getElementById('prev-base');
    const prevIncentive = document.getElementById('prev-incentive');
    const prevTotal = document.getElementById('prev-total');
    const modalTitle = modal.querySelector('.modal-header h2');
    const submitBtn = addRecordForm.querySelector('button[type="submit"]');

    const API_URL = '/api';

    // State Variables
    let salaryHistory = [];
    let employees = [];
    let groupedRecords = {};
    let editingRecordId = null;

    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    // Selected month filter (default = all)
    let selectedMonth = 'all';

    // ── Download Helpers ──────────────────────────────────────────────────────

    function updateDownloadButtonState() {
        const downloadBtn = document.getElementById('download-report-btn');
        if (downloadBtn) {
            const hasRecords = salaryHistory && salaryHistory.length > 0;
            downloadBtn.disabled = !hasRecords;
            downloadBtn.style.opacity = hasRecords ? '1' : '0.5';
            downloadBtn.title = hasRecords ? 'Download salary records as CSV' : 'No records available to download';
            console.log('🔘 Download button state updated:', hasRecords ? 'enabled' : 'disabled');
        }
    }

    async function downloadCSVFile(csvContent, filename) {
        try {
            console.log('🔄 Starting cross-platform download for:', filename);
            console.log('📄 CSV Content length:', csvContent.length);

            if (!csvContent || csvContent.trim().length === 0) {
                console.error('❌ No CSV content to download');
                alert('❌ No data to download. Please add some records first.');
                return false;
            }

            if (!filename || filename.trim().length === 0) {
                filename = 'salary-records.csv';
                console.warn('⚠️ No filename provided, using default:', filename);
            }

            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            console.log('📱 Device detection:', { isIOS, isMobile });

            try {
                console.log('🎯 Trying direct blob download method...');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                link.style.position = 'absolute';
                link.style.left = '-9999px';
                link.style.top = '-9999px';
                link.setAttribute('aria-hidden', 'true');

                document.body.appendChild(link);

                try {
                    link.click();
                    console.log('✅ Link.click() succeeded');
                } catch (clickError) {
                    console.warn('⚠️ link.click() failed, trying alternative...');
                    try {
                        const event = new MouseEvent('click', {
                            view: window,
                            bubbles: true,
                            cancelable: true,
                            clientX: 0,
                            clientY: 0
                        });
                        link.dispatchEvent(event);
                        console.log('✅ MouseEvent dispatch succeeded');
                    } catch (eventError) {
                        console.warn('⚠️ MouseEvent also failed:', eventError);
                        window.open(url, '_blank');
                        console.log('✅ Opened in new tab as fallback');
                    }
                }

                document.body.removeChild(link);

                setTimeout(() => {
                    try {
                        URL.revokeObjectURL(url);
                        console.log('🧹 Blob URL cleaned up');
                    } catch (cleanupError) {
                        console.warn('⚠️ URL cleanup failed:', cleanupError);
                    }
                }, 1000);

                await new Promise(resolve => setTimeout(resolve, 300));

                console.log('✅ Direct blob download triggered successfully');
                alert(`✅ Report downloaded successfully!\n\n📁 File: ${filename}\n\n💡 Check your Downloads folder\n   (or device storage on mobile)`);
                return true;

            } catch (blobError) {
                console.error('⚠️ Direct blob method failed:', blobError);
            }

            try {
                console.log('🔄 Trying Data URL fallback...');
                const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
                const link = document.createElement('a');
                link.href = dataStr;
                link.download = filename;
                link.style.display = 'none';
                link.style.position = 'absolute';
                link.style.left = '-9999px';
                link.style.top = '-9999px';

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                await new Promise(resolve => setTimeout(resolve, 300));

                console.log('✅ Data URL download triggered');
                alert(`✅ Report downloaded successfully!\n\n📁 File: ${filename}`);
                return true;

            } catch (dataError) {
                console.error('⚠️ Data URL method failed:', dataError);
            }

            try {
                console.log('📱 Trying window.open fallback for mobile...');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const newWindow = window.open(url, '_blank');

                if (newWindow) {
                    console.log('✅ Opened CSV in new tab successfully');
                    setTimeout(() => {
                        try {
                            URL.revokeObjectURL(url);
                            console.log('🧹 Fallback URL cleaned up');
                        } catch (cleanupError) {
                            console.warn('⚠️ Fallback URL cleanup failed:', cleanupError);
                        }
                    }, 3000);

                    alert(`📱 CSV file ready!\n\nFile: ${filename}\n\n💡 Instructions on your device:\n• Look for download notification\n• Or check Files/Downloads app`);
                    return true;
                } else {
                    console.warn('⚠️ window.open returned null (popup blocked?)');
                }

            } catch (fallbackError) {
                console.error('⚠️ Window.open fallback failed:', fallbackError);
            }

            try {
                console.log('📋 Trying clipboard fallback...');
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(csvContent);
                    console.log('✅ CSV copied to clipboard');
                    alert(`📋 CSV copied to clipboard!\n\nFile: ${filename}\n\n💡 Paste into a text editor and save as .csv file`);
                    return true;
                } else {
                    const textArea = document.createElement('textarea');
                    textArea.value = csvContent;
                    textArea.style.position = 'absolute';
                    textArea.style.left = '-9999px';
                    textArea.style.top = '-9999px';
                    document.body.appendChild(textArea);
                    textArea.select();
                    textArea.setSelectionRange(0, csvContent.length);

                    try {
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        console.log('✅ CSV copied to clipboard (legacy method)');
                        alert(`📋 CSV copied to clipboard!\n\nFile: ${filename}\n\n💡 Paste into a text editor and save as .csv file`);
                        return true;
                    } catch (legacyError) {
                        document.body.removeChild(textArea);
                        console.warn('⚠️ Legacy clipboard copy failed:', legacyError);
                    }
                }

            } catch (clipboardError) {
                console.error('⚠️ Clipboard fallback failed:', clipboardError);
            }

            console.error('🚨 All download methods failed');
            alert(`❌ Download unavailable on this device.\n\n📋 Please try:\n1. Refreshing the page\n2. Using a different browser\n3. Checking browser permissions`);
            console.log('📄 Full CSV content for manual saving:');
            console.log(csvContent);

            return false;

        } catch (unexpectedError) {
            console.error('🚨 Unexpected error in downloadCSVFile:', unexpectedError);
            alert('❌ Download failed. Please try again.');
            return false;
        }
    }

    async function downloadReport(employeeFilter, monthFilter) {
        console.log('🔄 Download function called with filters:', { employeeFilter, monthFilter });

        let records = salaryHistory ? [...salaryHistory] : [];
        console.log('📊 Records available for download:', records.length);

        if (records.length === 0) {
            console.log('⚠️ No records in memory.');
        }

        if (records.length === 0) {
            console.log('🔄 No records found, trying API fallback...');
            try {
                const response = await fetch(`${API_URL}/records`);
                if (response.ok) {
                    records = await response.json();
                    console.log('📡 Loaded from API:', records.length);
                }
            } catch (apiError) {
                console.error('❌ API fallback failed:', apiError);
            }
        }

        if (!records || records.length === 0) {
            console.error('🚨 No records available for download');
            alert('❌ No records found. Please add salary records first.');
            return false;
        }

        console.log('📋 Final records count:', records.length);

        if (employeeFilter && employeeFilter !== 'all') {
            const beforeCount = records.length;
            records = records.filter(r => r.employeeId === employeeFilter);
            console.log(`👤 Employee filter ${employeeFilter}: ${beforeCount} → ${records.length}`);
        }

        if (monthFilter && monthFilter !== 'all') {
            const beforeCount = records.length;
            const mIdx = parseInt(monthFilter, 10);
            records = records.filter(r => {
                try {
                    const d = new Date(r.month + '-01');
                    return d.getMonth() === mIdx;
                } catch (e) {
                    console.warn('⚠️ Invalid date:', r.month);
                    return false;
                }
            });
            console.log(`📅 Month filter ${monthFilter}: ${beforeCount} → ${records.length}`);
        }

        if (!records || records.length === 0) {
            console.log('🔄 No filtered records, using all records...');
            records = salaryHistory ? [...salaryHistory] : [];
            console.log('📊 Using all records:', records.length);
        }

        console.log('📋 Final records count:', records.length);

        try {
            const escape = (v) => {
                if (v == null || v === '') return '';
                const s = String(v).replace(/"/g, '""');
                return (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) ? `"${s}"` : s;
            };

            const formatMonth = (m) => {
                if (!m) return '';
                try {
                    const d = new Date(m + '-01');
                    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                } catch (e) { return m; }
            };

            const formatType = (r) => {
                if (r.type === 'aq_fleet') return 'AQ Fleet';
                if (r.type === 'intern') return 'Intern';
                if (r.type === 'supervisor') return 'Executive Supervisor';
                return 'Sales Fleet';
            };

            const rows = [];
            const headers = ['Employee Name', 'Department', 'Month', 'Type', 'Base Salary (₹)', 'Incentive (₹)', 'Bonus (₹)', 'Total Salary (₹)'];
            rows.push(headers.join(','));

            records.forEach(r => {
                try {
                    const employee = employees ? employees.find(emp => emp.id === r.employeeId) : null;
                    const empName = employee ? employee.name : 'Unknown Employee';
                    const dept = employee ? (employee.department || '-') : '-';
                    const month = formatMonth(r.month);
                    const type = formatType(r);
                    const base = r.baseSalary != null ? r.baseSalary : '';
                    const incentive = r.incentive != null ? r.incentive : '';
                    const bonus = r.bonus != null ? r.bonus : '';
                    const total = r.totalSalary != null ? r.totalSalary : '';

                    rows.push([
                        escape(empName),
                        escape(dept),
                        escape(month),
                        escape(type),
                        escape(base),
                        escape(incentive),
                        escape(bonus),
                        escape(total)
                    ].join(','));
                } catch (recordError) {
                    console.warn('⚠️ Error processing record:', r, recordError);
                }
            });

            // Add BOM for Excel UTF-8 compatibility; blank line after header for readability
            const csv = '\uFEFF' + rows.join('\n');

            let fname = 'salary-records';
            if (employeeFilter && employeeFilter !== 'all') {
                const employee = employees ? employees.find(emp => emp.id === employeeFilter) : null;
                const empName = employee ? employee.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-') : employeeFilter;
                fname += `-${empName}`;
            }
            if (monthFilter && monthFilter !== 'all') {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthIdx = parseInt(monthFilter, 10);
                if (monthIdx >= 0 && monthIdx < 12) {
                    fname += `-${monthNames[monthIdx]}`;
                }
            }
            fname += '.csv';

            console.log('📄 Generated CSV with', rows.length, 'rows, filename:', fname);

            try {
                const downloadResult = await downloadCSVFile(csv, fname);
                console.log('📊 Download result:', downloadResult);
                return downloadResult;
            } catch (downloadError) {
                console.error('❌ Error in downloadCSVFile:', downloadError);
                alert('❌ Download failed. Please try again.');
                return false;
            }

        } catch (csvError) {
            console.error('❌ Error generating CSV:', csvError);
            alert('❌ Failed to create CSV. Please try again.');
            return false;
        }
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    async function init() {
        await loadRecords();
        populateEmployeeDropdown();

        // Filter dropdown
        filterDropdown.addEventListener('change', () => {
            renderGroupedRecords(filterDropdown.value, selectedMonth);
            filterDropdown.classList.toggle('has-value', filterDropdown.value !== 'all');
        });

        // Month filter dropdown
        const monthSelect = document.getElementById('month-filter-select');
        if (monthSelect) {
            monthSelect.addEventListener('change', (ev) => {
                selectedMonth = ev.target.value || 'all';
                monthSelect.classList.toggle('has-value', selectedMonth !== 'all');
                renderGroupedRecords(filterDropdown.value, selectedMonth);
            });
        }

        // Download report button
        const downloadBtn = document.getElementById('download-report-btn');
        console.log('🔍 Looking for download button...');

        if (downloadBtn) {
            console.log('✅ Download button found');

            downloadBtn.addEventListener('click', async (e) => {
                console.log('🖱️ Download button clicked');
                e.preventDefault();

                const originalText = downloadBtn.innerHTML;
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                const loadingText = isMobile ? '📱 Processing...' : '⏳ Downloading...';

                downloadBtn.innerHTML = loadingText;
                downloadBtn.disabled = true;
                downloadBtn.style.opacity = '0.7';

                try {
                    console.log('🚀 Calling downloadReport...');
                    const result = await downloadReport(filterDropdown.value, selectedMonth);
                    console.log('📊 Download result:', result);
                } catch (error) {
                    console.error('❌ Unexpected error:', error);
                    alert('❌ An error occurred. Please try again.');
                } finally {
                    setTimeout(() => {
                        downloadBtn.innerHTML = originalText;
                        downloadBtn.disabled = false;
                        downloadBtn.style.opacity = '1';
                        console.log('✅ Button reset');
                    }, 2000);
                }
            });

            console.log('✅ Download button ready');
        } else {
            console.error('❌ Download button not found!');
        }

        // Add Record button
        addRecordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(null);
        });

        closeModalBtn.addEventListener('click', closeModal);
        cancelModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        recIncentive.addEventListener('input', updatePreview);
        recAqCount && recAqCount.addEventListener('input', updatePreview);
        recAqCost && recAqCost.addEventListener('input', updatePreview);
        recMonthlySalary && recMonthlySalary.addEventListener('input', updatePreview);
        recIncentives && recIncentives.addEventListener('input', updatePreview);
        recBonus && recBonus.addEventListener('input', updatePreview);

        recEmployee.addEventListener('change', () => {
            recEmployee.classList.toggle('has-value', !!recEmployee.value);
            handleRecEmployeeChange();
        });

        addRecordForm.addEventListener('submit', handleFormSubmit);

        recordsContainer.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.rec-action-edit');
            const deleteBtn = e.target.closest('.rec-action-delete');

            if (editBtn) {
                const id = editBtn.dataset.id;
                openModal(id);
            }

            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                deleteRecord(id);
            }
        });
    }

    async function loadRecords() {
        try {
            console.log('📥 Loading records...');

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

            // Load records with fallback pattern
            salaryHistory = [];
            if (supabase) {
                try {
                    console.log('🔄 Attempting to load from Supabase...');
                    const { data, error } = await supabase
                        .from('SalaryRecord')
                        .select('*, Employee(*)')
                        .order('createdAt', { ascending: false });

                    if (error) {
                        console.error('❌ Supabase load error:', error);
                        throw error;
                    }
                    console.log('✅ Loaded', data.length, 'records from Supabase');
                    salaryHistory = data || [];
                    loaded = true;
                } catch (dbError) {
                    console.error('❌ Supabase load failed - Full error:', dbError);
                    console.warn('⚠️ Error message:', dbError.message);
                }
            } else {
                console.warn('ℹ️ Supabase not available, cannot load records');
            }

            processAndRenderRecords();
            updateDownloadButtonState();
        } catch (error) {
            console.error('Error loading data:', error);
            salaryHistory = [];
            processAndRenderRecords();
        }
    }

    async function saveRecord(recordData) {
        try {
            console.log('💾 Saving record...', JSON.stringify(recordData, null, 2));

            let saved = false;

            if (supabase) {
                try {
                    console.log('🔄 Attempting Supabase save...');
                    console.log('📊 Record structure:', Object.keys(recordData));
                    const { data, error } = await supabase
                        .from('SalaryRecord')
                        .upsert([recordData], { onConflict: 'id' });

                    if (error) {
                        console.error('❌ Supabase insert error details:', error);
                        throw error;
                    }
                    console.log('✅ Saved to Supabase with ID:', data);
                    saved = true;
                } catch (dbError) {
                    console.error('❌ Supabase save failed - Full error:', dbError);
                    console.warn('⚠️ Error message:', dbError.message);
                }
            }

            if (saved) {
                console.log('✅ Record saved successfully');
                alert('Record saved successfully');
                await loadRecords();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Unexpected error:', error);
            alert('Failed to save record: ' + error.message);
            return false;
        }
    }

    function populateEmployeeDropdown() {
        recEmployee.innerHTML = '<option value="" disabled selected>Select an employee</option>';
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.name;
            recEmployee.appendChild(option);
        });
    }

    function openModal(recordId) {
        editingRecordId = recordId;
        addRecordForm.reset();
        recPreview.style.display = 'none';
        recEmployee.classList.remove('has-value');
        populateEmployeeDropdown();

        if (recordId) {
            const rec = salaryHistory.find(r => r.id === recordId);
            if (!rec) return;

            modalTitle.textContent = 'Edit Salary Record';
            submitBtn.textContent = 'Save Changes';

            recEmployee.value = rec.employeeId;
            recEmployee.classList.add('has-value');
            recMonth.value = rec.month;
            recIncentive.value = rec.incentive || '';
            recAqCount.value = rec.aqCount || '';
            recAqCost.value = rec.aqCost || '';
            recMonthlySalary.value = rec.monthlySalary || '';
            recIncentives.value = rec.incentive != null && rec.incentive > 0 ? rec.incentive : '';
            recBonus.value = rec.bonus || '';
            handleRecEmployeeChange();
            updatePreview();
        } else {
            modalTitle.textContent = 'Add Salary Record';
            submitBtn.textContent = 'Save Record';
            recMonth.value = `${yyyy}-${mm}`;
        }

        modal.classList.add('show');
    }

    function closeModal() {
        modal.classList.remove('show');
        addRecordForm.reset();
        recPreview.style.display = 'none';
        recEmployee.classList.remove('has-value');
        editingRecordId = null;
    }

    function updatePreview() {
        recEmployee.classList.toggle('has-value', !!recEmployee.value);

        const empId = recEmployee.value;
        const emp = employees.find(e => e.id === empId);
        const bonus = parseInt(recBonus.value, 10) || 0;

        let base = 0, incentive = 0, total = 0;

        if (emp) {
            if (emp.department === 'Customer AQ Fleet') {
                const aqCount = parseInt(recAqCount.value, 10);
                const aqCost = parseFloat(recAqCost.value, 10) || 0;
                if (!isNaN(aqCount) && aqCount >= 0 && !isNaN(aqCost) && aqCost >= 0) {
                    base = 15000;
                    incentive = aqCount * aqCost;
                    total = base + incentive + bonus;
                }
            } else if (isInternOrSupervisor(emp)) {
                const msal = parseInt(recMonthlySalary.value, 10);
                const incentives = parseInt(recIncentives && recIncentives.value, 10) || 0;
                if (!isNaN(msal) && msal >= 0) {
                    base = msal;
                    incentive = incentives;
                    total = base + incentive + bonus;
                }
            } else {
                const msal = parseInt(recMonthlySalary.value, 10);
                const manualIncentive = parseInt(recIncentive.value, 10);
                if (!isNaN(msal) && msal >= 0 && !isNaN(manualIncentive) && manualIncentive >= 0) {
                    base = msal;
                    incentive = manualIncentive;
                    total = base + incentive + bonus;
                }
            }
        }

        if (total > 0) {
            prevBase.textContent = formatter.format(base);
            prevIncentive.textContent = formatter.format(incentive);
            prevTotal.textContent = formatter.format(total);
            recPreview.style.display = 'block';
        } else {
            recPreview.style.display = 'none';
        }
    }

    function isInternOrSupervisor(emp) {
        if (!emp) return false;
        const d = String(emp.department || emp.Department || '').trim().toLowerCase();
        return d.includes('intern') || d.includes('executive supervisor');
    }

    function handleRecEmployeeChange() {
        const empId = recEmployee.value;
        const emp = employees.find(e => e.id === empId);

        recIncentiveGroup.style.display = 'none';
        recAqCountGroup.style.display = 'none';
        recAqCostGroup.style.display = 'none';
        recMonthlySalaryGroup.style.display = 'none';
        recBonusGroup.style.display = 'none';
        const incentivesGroup = document.getElementById('rec-incentives-group');
        if (incentivesGroup) incentivesGroup.style.display = 'none';

        recIncentive.required = false;
        recAqCount.required = false;
        recAqCost.required = false;
        recMonthlySalary.required = false;
        recBonus.required = false;
        const incentivesInput = document.getElementById('rec-incentives');
        if (incentivesInput) incentivesInput.required = false;

        if (emp) {
            recBonusGroup.style.display = 'block';
            const dept = String(emp.department || emp.Department || '').trim();
            if (dept === 'Customer AQ Fleet') {
                recAqCountGroup.style.display = 'block';
                recAqCostGroup.style.display = 'block';
                recAqCount.required = true;
                recAqCost.required = true;
            } else if (isInternOrSupervisor(emp)) {
                recMonthlySalaryGroup.style.display = 'block';
                if (incentivesGroup) incentivesGroup.style.display = 'block';
                recMonthlySalary.required = true;
            } else {
                // Sales-cum-Delivery Fleet: monthly salary + manual incentive
                recMonthlySalaryGroup.style.display = 'block';
                recIncentiveGroup.style.display = 'block';
                recMonthlySalary.required = true;
                recIncentive.required = true;
            }
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const employeeId = recEmployee.value;
        const month = recMonth.value;
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employeeId || !month || !employee) return;

        const bonus = parseInt(recBonus.value, 10) || 0;
        let recordData;

        if (employee.department === 'Customer AQ Fleet') {
            const aqCount = parseInt(recAqCount.value, 10);
            const aqCost = parseFloat(recAqCost.value, 10) || 0;
            if (isNaN(aqCount) || aqCount < 0 || isNaN(aqCost) || aqCost < 0) return;
            const baseSalary = 15000;
            const incentive = aqCount * aqCost;
            const totalSalary = baseSalary + incentive + bonus;
            recordData = {
                employeeId: employee.id,
                month,
                type: 'aq_fleet',
                aqCount,
                aqCost,
                bonus,
                baseSalary,
                incentive,
                totalSalary,
                inputs: { aqCount, aqCost, bonus }
            };
        } else if (isInternOrSupervisor(employee)) {
            const monthlySalary = parseInt(recMonthlySalary.value, 10);
            const incentives = parseInt(recIncentives && recIncentives.value, 10) || 0;
            if (isNaN(monthlySalary) || monthlySalary < 0) return;
            const totalSalary = monthlySalary + incentives + bonus;
            const isIntern = String(employee.department || '').toLowerCase().includes('intern');
            recordData = {
                employeeId: employee.id,
                month,
                type: isIntern ? 'intern' : 'supervisor',
                monthlySalary,
                bonus,
                baseSalary: monthlySalary,
                incentive: incentives,
                totalSalary,
                inputs: { monthlySalary, incentives, bonus }
            };
        } else {
            const monthlySalary = parseInt(recMonthlySalary.value, 10);
            const manualIncentive = parseInt(recIncentive.value, 10);
            if (isNaN(monthlySalary) || monthlySalary < 0 || isNaN(manualIncentive) || manualIncentive < 0) return;
            const baseSalary = monthlySalary;
            const totalSalary = baseSalary + manualIncentive + bonus;
            recordData = {
                employeeId: employee.id,
                month,
                type: 'sales_fleet',
                monthlySalary,
                bonus,
                baseSalary,
                incentive: manualIncentive,
                totalSalary,
                inputs: { monthlySalary, incentive: manualIncentive, bonus }
            };
        }

        try {
            if (editingRecordId) {
                const existing = salaryHistory.find(r => r.id === editingRecordId);
                recordData.id = editingRecordId;
                recordData.createdAt = existing?.createdAt || new Date().toISOString();
            } else {
                recordData.id = crypto.randomUUID();
                recordData.createdAt = new Date().toISOString();
            }

            // Save to Supabase instead of localStorage
            const saved = await saveRecord(recordData);
            if (saved) {
                updateDownloadButtonState();
                closeModal();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to save record.');
        }
    }

    async function deleteRecord(id) {
        if (!confirm('Delete this salary record? This cannot be undone.')) return;
        try {
            console.log('🗑️ Deleting record:', id);
            let deleted = false;

            if (supabase) {
                try {
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
                alert('Record deleted successfully');
                await loadRecords();
                updateDownloadButtonState();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to delete record.');
        }
    }

    function processAndRenderRecords() {
        groupedRecords = {};
        const employeeNames = new Map();

        salaryHistory.forEach(record => {
            const emp = employees.find(e => e.id === record.employeeId);
            const empName = emp ? emp.name : 'Unknown';
            const empDept = emp ? emp.department : '';
            if (!groupedRecords[record.employeeId]) {
                groupedRecords[record.employeeId] = {
                    employeeName: empName,
                    department: empDept,
                    totalEarned: 0,
                    records: []
                };
                employeeNames.set(record.employeeId, empName);
            }
            groupedRecords[record.employeeId].totalEarned += record.totalSalary;
            groupedRecords[record.employeeId].records.push(record);
        });

        Object.values(groupedRecords).forEach(group => {
            group.records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        });

        const currentFilter = filterDropdown.value;
        filterDropdown.innerHTML = '<option value="all">All Employees</option>';

        const sortedEmployees = Array.from(employeeNames.entries())
            .sort((a, b) => a[1].localeCompare(b[1]));

        const seenNames = new Set();
        sortedEmployees.forEach(([id, name]) => {
            if (seenNames.has(name)) return;
            seenNames.add(name);
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            filterDropdown.appendChild(option);
        });

        const filterStillValid = currentFilter === 'all' || employeeNames.has(currentFilter);
        filterDropdown.value = filterStillValid ? currentFilter : 'all';
        filterDropdown.classList.toggle('has-value', filterDropdown.value !== 'all');

        renderGroupedRecords(filterDropdown.value, selectedMonth);
    }

    function renderGroupedRecords(filterId) {
        const monthFilter = arguments.length > 1 ? arguments[1] : 'all';
        recordsContainer.innerHTML = '';

        let groupsToRender = Object.values(groupedRecords).sort((a, b) =>
            a.employeeName.localeCompare(b.employeeName)
        );

        if (filterId !== 'all') {
            groupsToRender = [groupedRecords[filterId]].filter(Boolean);
        }

        if (groupsToRender.length === 0) {
            recordsContainer.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                        style="margin-bottom: 16px; opacity: 0.5;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <h3 style="font-size: 18px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">No records found</h3>
                    <p style="font-size: 14px;">Click "Add Record" to enter a salary record directly.</p>
                </div>
            `;
            return;
        }

        const htmlParts = groupsToRender.map(group => {
            const visibleRecords = (monthFilter === 'all') ? group.records : group.records.filter(r => {
                try {
                    const d = new Date(r.month + '-01');
                    return d.getMonth() === parseInt(monthFilter, 10);
                } catch (e) { return false; }
            });

            if (!visibleRecords || visibleRecords.length === 0) return '';

            const recordsHtml = visibleRecords.map(rec => {
                let displayMonth = rec.month;
                try {
                    const dateObj = new Date(rec.month + '-01');
                    displayMonth = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                } catch (e) { }

                return `
                    <div class="record-month-item" data-id="${rec.id}">
                        <div class="record-month-top">
                            <div class="record-month-date">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #F97316;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                ${displayMonth}
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="record-month-total">${formatter.format(rec.totalSalary)}</div>
                                <button class="rec-action-edit rec-action-btn" data-id="${rec.id}" title="Edit record" aria-label="Edit">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="rec-action-delete rec-action-btn" data-id="${rec.id}" title="Delete record" aria-label="Delete">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                        <div class="record-month-bottom">
                            <div class="record-stats">
                                <div class="record-stat-pill">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                    ${rec.type === 'aq_fleet' ? `${rec.aqCount.toLocaleString('en-IN')} AQ @ ${formatter.format(rec.aqCost)}` :
                        rec.type === 'intern' ? `${formatter.format(rec.monthlySalary)} salary` :
                            rec.type === 'supervisor' ? `${formatter.format(rec.monthlySalary)} salary` :
                                `Incentive: ${formatter.format(rec.incentive || 0)}`
                    }
                                </div>
                                <div class="record-stat-pill">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M7 15h0M2 9.5h20"></path></svg>
                                    Base: ${formatter.format(rec.baseSalary)}
                                </div>
                                ${(rec.type === 'intern' || rec.type === 'supervisor') ? (rec.incentive > 0 ? `
                                <div class="record-stat-pill">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                                    Incentives: ${formatter.format(rec.incentive)}
                                </div>
                                ` : '') : `
                                <div class="record-stat-pill">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                                    Incentive: ${formatter.format(rec.incentive)}
                                </div>
                                `}
                                ${rec.bonus ? `
                                <div class="record-stat-pill">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22M1 12h22"/></svg>
                                    Bonus: ${formatter.format(rec.bonus)}
                                </div>
                                ` : ''}
                            </div>
                            <div class="record-month-total" style="color: #9B6A4F; font-size: 13px;  font-weight: 500;">
                                <span style="font-size: 11px; margin-right: 2px;">₹</span> ${formatter.format(rec.totalSalary).replace('₹', '')}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            const groupTotal = visibleRecords.reduce((s, r) => s + (r.totalSalary || 0), 0);

            return `
                <div class="record-group-card">
                    <div class="record-group-header">
                        <div class="record-group-employee">
                            <div class="avatar-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            </div>
                            <div>
                                <div>${escapeHTML(group.employeeName)}</div>
                                ${group.department ? `<div style="font-size:12px;color:var(--text-muted);">${escapeHTML(group.department)}</div>` : ''}
                            </div>
                        </div>
                        <div class="record-group-total">
                            <span>Total Earned</span>
                            <strong>${formatter.format(groupTotal)}</strong>
                        </div>
                    </div>
                    <div class="record-month-list">
                        ${recordsHtml}
                    </div>
                </div>
            `;
        });

        recordsContainer.innerHTML = htmlParts.join('');
        updateDownloadButtonState();
    }

    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    init();
});