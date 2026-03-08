const leaveTable = document.querySelector('#leaveTable tbody');
const leaveSummaryTable = document.querySelector('#leaveSummaryTable tbody');
const leaveCSV = 'leave.csv';
let staffData = [];
let leaveData = [];
let editingIndex = -1;

async function init() {
    // Check license before allowing access
    const licenseStatus = await window.api.getLicenseStatus();
    
    if (!licenseStatus.valid || licenseStatus.expired) {
        alert('❌ Access Denied\n\nYour license has expired. Please purchase a subscription (R349/month) to access Leave Management.\n\nClick the green "Purchase Now" button on the dashboard.');
        location.href = 'index.html';
        return;
    }
    
    staffData = await window.api.readCSV('staff.csv');
    try {
        leaveData = await window.api.readCSV(leaveCSV);
    } catch(e) {
        leaveData = [];
    }
    renderTables();
}

async function autoSave() {
    await window.api.writeCSV(leaveCSV, leaveData);
}

function populateEmployeeSelect(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select Employee</option>';
    staffData.forEach(emp => {
        const empId = emp['Employee ID'] || emp.EmployeeID;
        const empName = emp['Employee Name'] || emp.Name;
        if(emp.Active === 'Yes') {
            select.innerHTML += `<option value="${empId}">${empId} - ${empName}</option>`;
        }
    });
}

function calculateDaysBetween(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
    return diffDays;
}

function renderTables() {
    renderLeaveTable();
    renderSummaryTable();
}

function renderLeaveTable() {
    leaveTable.innerHTML = '';
    leaveData.forEach((leave, idx) => {
        const empId = leave['Employee ID'] || leave.EmployeeID;
        const empName = leave['Employee Name'] || leave.Name;
        const startDate = leave['Start Date'] || leave.StartDate;
        const endDate = leave['End Date'] || leave.EndDate;
        const days = leave['Days Taken'] || leave.DaysTaken;
        const reason = leave['Reason'] || '';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${empId}</td>
            <td>${empName}</td>
            <td>${startDate}</td>
            <td>${endDate}</td>
            <td><strong>${days}</strong> days</td>
            <td>${reason}</td>
            <td>
                <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="editLeave(${idx})">Edit</button>
                <button class="btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="removeLeave(${idx})">Remove</button>
            </td>`;
        leaveTable.appendChild(row);
    });
}

function renderSummaryTable() {
    leaveSummaryTable.innerHTML = '';
    
    const activeStaff = staffData.filter(emp => emp.Active === 'Yes');
    
    activeStaff.forEach(emp => {
        const empId = emp['Employee ID'] || emp.EmployeeID;
        const empName = emp['Employee Name'] || emp.Name;
        const annualLeave = parseFloat(emp['Leave Days']) || 15;
        
        // Calculate total days used
        const usedDays = leaveData
            .filter(leave => (leave['Employee ID'] || leave.EmployeeID) === empId)
            .reduce((sum, leave) => sum + parseFloat(leave['Days Taken'] || leave.DaysTaken || 0), 0);
        
        const remaining = annualLeave - usedDays;
        const percentage = (remaining / annualLeave) * 100;
        
        let status = 'Good';
        let statusColor = '#27ae60';
        if (percentage < 25) {
            status = 'Low';
            statusColor = '#e74c3c';
        } else if (percentage < 50) {
            status = 'Medium';
            statusColor = '#f39c12';
        }
        
        if (remaining < 0) {
            status = 'Exceeded';
            statusColor = '#c0392b';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${empId}</td>
            <td>${empName}</td>
            <td>${annualLeave}</td>
            <td>${usedDays.toFixed(1)}</td>
            <td><strong>${remaining.toFixed(1)}</strong></td>
            <td><span style="color: ${statusColor}; font-weight: 600;">${status}</span></td>`;
        leaveSummaryTable.appendChild(row);
    });
}

function openLeaveModal() {
    editingIndex = -1;
    populateEmployeeSelect('employeeSelect');
    document.getElementById('employeeSelect').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('daysTaken').value = '';
    document.getElementById('leaveReason').value = '';
    document.getElementById('leaveModal').style.display = 'block';
    
    // Auto-calculate days when dates change
    document.getElementById('startDate').addEventListener('change', updateDaysCalculation);
    document.getElementById('endDate').addEventListener('change', updateDaysCalculation);
}

function updateDaysCalculation() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    
    if (start && end) {
        const days = calculateDaysBetween(start, end);
        document.getElementById('daysTaken').value = days;
    }
}

function updateEditDaysCalculation() {
    const start = document.getElementById('editStartDate').value;
    const end = document.getElementById('editEndDate').value;
    
    if (start && end) {
        const days = calculateDaysBetween(start, end);
        document.getElementById('editDaysTaken').value = days;
    }
}

async function saveLeave() {
    const empId = document.getElementById('employeeSelect').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const daysTaken = parseFloat(document.getElementById('daysTaken').value);
    const reason = document.getElementById('leaveReason').value.trim();
    
    if (!empId || !startDate || !endDate || !daysTaken || daysTaken <= 0) {
        alert('Please fill all required fields');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert('End date must be after start date');
        return;
    }
    
    const emp = staffData.find(e => {
        const eId = e['Employee ID'] || e.EmployeeID;
        return eId === empId;
    });
    const empName = emp ? (emp['Employee Name'] || emp.Name) : '';
    
    leaveData.push({
        'Employee ID': empId,
        'Employee Name': empName,
        'Start Date': startDate,
        'End Date': endDate,
        'Days Taken': daysTaken,
        'Reason': reason
    });
    
    await autoSave();
    document.getElementById('leaveModal').style.display = 'none';
    renderTables();
}

function cancelLeave() {
    document.getElementById('leaveModal').style.display = 'none';
}

function editLeave(idx) {
    editingIndex = idx;
    const leave = leaveData[idx];
    
    populateEmployeeSelect('editEmployeeSelect');
    document.getElementById('editEmployeeSelect').value = leave['Employee ID'] || leave.EmployeeID;
    document.getElementById('editStartDate').value = leave['Start Date'] || leave.StartDate;
    document.getElementById('editEndDate').value = leave['End Date'] || leave.EndDate;
    document.getElementById('editDaysTaken').value = leave['Days Taken'] || leave.DaysTaken;
    document.getElementById('editLeaveReason').value = leave['Reason'] || '';
    document.getElementById('editLeaveModal').style.display = 'block';
    
    // Auto-calculate days when dates change
    document.getElementById('editStartDate').addEventListener('change', updateEditDaysCalculation);
    document.getElementById('editEndDate').addEventListener('change', updateEditDaysCalculation);
}

async function saveEditLeave() {
    const idx = editingIndex;
    const startDate = document.getElementById('editStartDate').value;
    const endDate = document.getElementById('editEndDate').value;
    const daysTaken = parseFloat(document.getElementById('editDaysTaken').value);
    const reason = document.getElementById('editLeaveReason').value.trim();
    
    if (!startDate || !endDate || !daysTaken || daysTaken <= 0) {
        alert('Please fill all required fields');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert('End date must be after start date');
        return;
    }
    
    leaveData[idx]['Start Date'] = startDate;
    leaveData[idx]['End Date'] = endDate;
    leaveData[idx]['Days Taken'] = daysTaken;
    leaveData[idx]['Reason'] = reason;
    
    await autoSave();
    document.getElementById('editLeaveModal').style.display = 'none';
    renderTables();
}

function cancelEditLeave() {
    document.getElementById('editLeaveModal').style.display = 'none';
}

async function removeLeave(idx) {
    if (confirm('Remove this leave record?')) {
        leaveData.splice(idx, 1);
        await autoSave();
        renderTables();
    }
}

window.openLeaveModal = openLeaveModal;
window.saveLeave = saveLeave;
window.cancelLeave = cancelLeave;
window.editLeave = editLeave;
window.saveEditLeave = saveEditLeave;
window.cancelEditLeave = cancelEditLeave;
window.removeLeave = removeLeave;

init();
