let staffData = [];
let shiftData = [];
let currentWeekStart = null;
let editingShift = null;

async function init() {
    // Check license before allowing access
    const licenseStatus = await window.api.getLicenseStatus();
    
    if (!licenseStatus.valid || licenseStatus.expired) {
        alert('❌ Access Denied\n\nYour license has expired. Please purchase a subscription (R349/month) to access Shift Scheduler.\n\nClick the green "Purchase Now" button on the dashboard.');
        location.href = 'index.html';
        return;
    }
    
    staffData = await window.api.readCSV('staff.csv');
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    currentWeekStart = monday;
    await loadWeekShifts();
}

function getWeekDates() {
    const dates = [];
    for(let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        dates.push(date);
    }
    return dates;
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatDateDisplay(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
}

async function loadWeekShifts() {
    const weekDates = getWeekDates();
    const weekStart = formatDate(weekDates[0]).replace(/-/g, '');
    const shiftCSV = `data/shifts_${weekStart}.csv`;
    
    try {
        shiftData = await window.api.readCSV(shiftCSV);
    } catch(e) {
        shiftData = [];
    }
    
    updateWeekInfo();
    renderCalendar();
}

function updateWeekInfo() {
    const weekDates = getWeekDates();
    const start = formatDateDisplay(weekDates[0]);
    const end = formatDateDisplay(weekDates[6]);
    document.getElementById('weekInfo').textContent = `${start} - ${end}`;
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const weekDates = getWeekDates();
    
    grid.innerHTML = '';
    
    // Header
    grid.innerHTML += '<div class="calendar-cell header">Employee</div>';
    weekDates.forEach(date => {
        grid.innerHTML += `<div class="calendar-cell header">${formatDateDisplay(date)}</div>`;
    });
    
    // Employee rows
    staffData.forEach(emp => {
        if(emp.Active === 'Yes') {
            const empId = emp['Employee ID'] || emp.EmployeeID;
            const empName = emp['Employee Name'] || emp.Name;
            grid.innerHTML += `<div class="calendar-cell employee-name">${empName}</div>`;
            
            weekDates.forEach(date => {
                const dateStr = formatDate(date);
                const empShifts = shiftData.filter(s => 
                    (s['Employee ID'] || s.EmployeeID) === empId && 
                    (s['Shift Date'] || s.Date) === dateStr
                );
                
                let cellContent = `<div class="add-shift-btn" onclick="openShiftModal('${empId}', '${dateStr}')">+</div>`;
                
                empShifts.forEach((shift, idx) => {
                    const startTime = shift['Start Time'] || shift.StartTime;
                    const endTime = shift['End Time'] || shift.EndTime;
                    const shiftId = `${empId}_${dateStr}_${idx}`;
                    cellContent += `
                        <div class="shift-entry" onclick="editShiftEntry('${empId}', '${dateStr}', ${idx})">
                            <span class="shift-time">${startTime} - ${endTime}</span>
                            <span class="delete-shift" onclick="event.stopPropagation(); deleteShift('${empId}', '${dateStr}', ${idx})">×</span>
                        </div>`;
                });
                
                grid.innerHTML += `<div class="calendar-cell">${cellContent}</div>`;
            });
        }
    });
}

function populateEmployeeSelect() {
    const select = document.getElementById('shiftEmployee');
    select.innerHTML = '<option value="">Select Employee</option>';
    staffData.forEach(emp => {
        if(emp.Active === 'Yes') {
            const empId = emp['Employee ID'] || emp.EmployeeID;
            const empName = emp['Employee Name'] || emp.Name;
            select.innerHTML += `<option value="${empId}">${empName}</option>`;
        }
    });
}

function openShiftModal(empId = '', date = '') {
    editingShift = null;
    document.getElementById('modalTitle').textContent = 'Add Shift';
    populateEmployeeSelect();
    document.getElementById('shiftEmployee').value = empId;
    document.getElementById('shiftDate').value = date;
    document.getElementById('shiftStart').value = '09:00';
    document.getElementById('shiftEnd').value = '17:00';
    document.getElementById('shiftModal').style.display = 'block';
}

function editShiftEntry(empId, date, idx) {
    const shifts = shiftData.filter(s => 
        (s['Employee ID'] || s.EmployeeID) === empId && 
        (s['Shift Date'] || s.Date) === date
    );
    const shift = shifts[idx];
    editingShift = { empId, date, idx, originalShift: shift };
    
    document.getElementById('modalTitle').textContent = 'Edit Shift';
    populateEmployeeSelect();
    document.getElementById('shiftEmployee').value = shift['Employee ID'] || shift.EmployeeID;
    document.getElementById('shiftEmployee').disabled = true;
    document.getElementById('shiftDate').value = shift['Shift Date'] || shift.Date;
    document.getElementById('shiftDate').disabled = true;
    document.getElementById('shiftStart').value = shift['Start Time'] || shift.StartTime;
    document.getElementById('shiftEnd').value = shift['End Time'] || shift.EndTime;
    document.getElementById('shiftModal').style.display = 'block';
}

async function saveShiftEntry() {
    const empId = document.getElementById('shiftEmployee').value;
    const date = document.getElementById('shiftDate').value;
    const startTime = document.getElementById('shiftStart').value;
    const endTime = document.getElementById('shiftEnd').value;
    
    if(!empId || !date || !startTime || !endTime) {
        alert('Please fill all fields');
        return;
    }
    
    const emp = staffData.find(e => {
        const eId = e['Employee ID'] || e.EmployeeID;
        return eId === empId;
    });
    const empName = emp ? (emp['Employee Name'] || emp.Name) : '';
    
    if(editingShift) {
        // Update existing shift
        const shiftIndex = shiftData.findIndex(s => 
            (s['Employee ID'] || s.EmployeeID) === editingShift.empId && 
            (s['Shift Date'] || s.Date) === editingShift.date && 
            (s['Start Time'] || s.StartTime) === (editingShift.originalShift['Start Time'] || editingShift.originalShift.StartTime) &&
            (s['End Time'] || s.EndTime) === (editingShift.originalShift['End Time'] || editingShift.originalShift.EndTime)
        );
        if(shiftIndex >= 0) {
            shiftData[shiftIndex]['Start Time'] = startTime;
            shiftData[shiftIndex]['End Time'] = endTime;
        }
    } else {
        // Add new shift
        shiftData.push({
            'Employee ID': empId,
            'Employee Name': empName,
            'Shift Date': date,
            'Start Time': startTime,
            'End Time': endTime
        });
    }
    
    await saveShiftsToFile();
    document.getElementById('shiftModal').style.display = 'none';
    document.getElementById('shiftEmployee').disabled = false;
    document.getElementById('shiftDate').disabled = false;
    renderCalendar();
}

function cancelShift() {
    document.getElementById('shiftModal').style.display = 'none';
    document.getElementById('shiftEmployee').disabled = false;
    document.getElementById('shiftDate').disabled = false;
}

async function deleteShift(empId, date, idx) {
    if(confirm('Delete this shift?')) {
        const shifts = shiftData.filter(s => 
            (s['Employee ID'] || s.EmployeeID) === empId && 
            (s['Shift Date'] || s.Date) === date
        );
        const shiftToDelete = shifts[idx];
        const deleteIndex = shiftData.findIndex(s => 
            (s['Employee ID'] || s.EmployeeID) === empId && 
            (s['Shift Date'] || s.Date) === date && 
            (s['Start Time'] || s.StartTime) === (shiftToDelete['Start Time'] || shiftToDelete.StartTime) &&
            (s['End Time'] || s.EndTime) === (shiftToDelete['End Time'] || shiftToDelete.EndTime)
        );
        
        if(deleteIndex >= 0) {
            shiftData.splice(deleteIndex, 1);
            await saveShiftsToFile();
            renderCalendar();
        }
    }
}

async function saveShiftsToFile() {
    const weekDates = getWeekDates();
    const weekStart = formatDate(weekDates[0]).replace(/-/g, '');
    const shiftCSV = `data/shifts_${weekStart}.csv`;
    await window.api.writeCSV(shiftCSV, shiftData);
}

async function previousWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    await loadWeekShifts();
}

async function nextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    await loadWeekShifts();
}

window.openShiftModal = openShiftModal;
window.editShiftEntry = editShiftEntry;
window.saveShiftEntry = saveShiftEntry;
window.cancelShift = cancelShift;
window.deleteShift = deleteShift;
window.previousWeek = previousWeek;
window.nextWeek = nextWeek;

init();