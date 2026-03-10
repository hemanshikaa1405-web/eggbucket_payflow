// Test CSV Download in Browser Environment
// This test simulates the browser environment to verify download functionality

console.log('🧪 Testing CSV Download in Browser Environment...');

// Mock localStorage
const mockLocalStorage = {
    getItem: (key) => {
        if (key === 'employees') {
            return JSON.stringify([
                { id: 1, name: 'John Doe' },
                { id: 2, name: 'Jane Smith' }
            ]);
        }
        if (key === 'salaryRecords') {
            return JSON.stringify([
                { employeeId: 1, month: '2024-03', trays: 100, baseSalary: 15000, incentive: 5000 },
                { employeeId: 2, month: '2024-03', trays: null, baseSalary: 18000, incentive: 0 }
            ]);
        }
        return null;
    }
};

// Mock navigator.userAgent for mobile detection
const mockNavigator = {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
};

// Mock document methods
const mockDocument = {
    createElement: (tag) => {
        if (tag === 'a') {
            return {
                href: '',
                download: '',
                click: () => console.log('🔗 Mock link clicked'),
                style: {}
            };
        }
        return {};
    },
    body: {
        appendChild: (el) => console.log('📎 Element appended to body'),
        removeChild: (el) => console.log('🗑️ Element removed from body')
    }
};

// Mock window methods
const mockWindow = {
    URL: {
        createObjectURL: (blob) => `blob:mock-url-${Date.now()}`,
        revokeObjectURL: (url) => console.log('🔗 URL revoked:', url)
    },
    open: (url) => console.log('🪟 Window opened with URL:', url),
    alert: (msg) => console.log('⚠️ Alert shown:', msg)
};

// Mock Blob
class MockBlob {
    constructor(content, options) {
        this.content = content;
        this.options = options;
        this.size = content.join('').length;
        console.log('📦 Mock Blob created, size:', this.size);
    }
}

// Mock Date for consistent timestamps
const mockDate = new Date('2024-03-15T10:30:00Z');

// Simulate the downloadCSVFile function
function downloadCSVFile(csvContent, filename) {
    console.log('🚀 Starting downloadCSVFile with filename:', filename);
    console.log('📊 CSV Content length:', csvContent.length);

    const blob = new MockBlob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = mockWindow.URL.createObjectURL(blob);

    console.log('🔗 Blob URL created:', url);

    // Method 1: Try Blob URL download (primary method)
    try {
        console.log('📥 Attempting Blob URL download...');
        const link = mockDocument.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        mockDocument.body.appendChild(link);
        link.click();
        mockDocument.body.removeChild(link);

        mockWindow.URL.revokeObjectURL(url);
        console.log('✅ Blob URL download successful');
        return { success: true, method: 'blob-url' };
    } catch (error) {
        console.warn('⚠️ Blob URL download failed:', error.message);
    }

    // Method 2: Try Data URL fallback
    try {
        console.log('📥 Attempting Data URL download...');
        const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        const link = mockDocument.createElement('a');
        link.href = dataUrl;
        link.download = filename;

        mockDocument.body.appendChild(link);
        link.click();
        mockDocument.body.removeChild(link);

        console.log('✅ Data URL download successful');
        return { success: true, method: 'data-url' };
    } catch (error) {
        console.warn('⚠️ Data URL download failed:', error.message);
    }

    // Method 3: Try window.open for mobile browsers
    try {
        console.log('📥 Attempting window.open download...');
        const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        mockWindow.open(dataUrl, '_blank');

        console.log('✅ Window.open download successful');
        return { success: true, method: 'window-open' };
    } catch (error) {
        console.warn('⚠️ Window.open download failed:', error.message);
    }

    // Method 4: Copy to clipboard as last resort
    try {
        console.log('📥 Attempting clipboard fallback...');
        // In a real browser, this would use navigator.clipboard.writeText
        console.log('📋 CSV content copied to clipboard (simulated)');
        mockWindow.alert('📋 CSV content copied to clipboard since download failed. Please paste into a text editor and save as .csv file.');

        console.log('✅ Clipboard fallback successful');
        return { success: true, method: 'clipboard' };
    } catch (error) {
        console.warn('⚠️ Clipboard fallback failed:', error.message);
    }

    // All methods failed
    console.error('❌ All download methods failed');
    mockWindow.alert('❌ Download failed completely. CSV content: ' + csvContent.substring(0, 200) + '...');
    return { success: false, method: 'failed' };
}

// Simulate the downloadReport function
function downloadReport(filterValue, selectedMonth) {
    console.log('📊 Generating report for filter:', filterValue, 'month:', selectedMonth);

    // Get data from localStorage
    const employees = JSON.parse(mockLocalStorage.getItem('employees') || '[]');
    const records = JSON.parse(mockLocalStorage.getItem('salaryRecords') || '[]');

    console.log('👥 Employees found:', employees.length);
    console.log('📋 Records found:', records.length);

    // Generate CSV
    let csv = 'Employee ID,Employee Name,Month,Trays,Base Salary,Incentive,Total Salary\n';

    records.forEach(record => {
        const employee = employees.find(emp => emp.id === record.employeeId);
        const employeeName = employee ? employee.name : 'Unknown';

        csv += `${record.employeeId},"${employeeName}",${record.month},${record.trays || ''},${record.baseSalary},${record.incentive},${record.baseSalary + record.incentive}\n`;
    });

    console.log('📄 CSV generated, length:', csv.length);

    // Generate filename
    const timestamp = mockDate.toISOString().split('T')[0];
    let filename = `salary-records-${timestamp}.csv`;

    if (filterValue && filterValue !== 'all') {
        const employee = employees.find(emp => emp.id.toString() === filterValue);
        if (employee) {
            filename = `salary-records-${employee.name.replace(/\s+/g, '-')}-${timestamp}.csv`;
        }
    }

    if (selectedMonth && selectedMonth !== 'all') {
        const monthName = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'short' });
        filename = filename.replace('.csv', `-${monthName}.csv`);
    }

    console.log('📁 Generated filename:', filename);

    // Download the file
    return downloadCSVFile(csv, filename);
}

// Run the test
console.log('🚀 Running downloadReport test...');
const result = downloadReport('all', '2024-03');
console.log('📊 Test result:', result);

console.log('🎉 Browser environment test completed!');