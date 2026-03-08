const attTable = document.querySelector('#attTable tbody');
let staffData = [];
let attData = [];
let currentDate = '';
let currentCSV = '';
let editingIndex = -1;

async function init() {
    // Check license before allowing access
    const licenseStatus = await window.api.getLicenseStatus();
    
    if (!licenseStatus.valid || licenseStatus.expired) {
        alert('❌ Access Denied\n\nYour license has expired. Please purchase a subscription (R349/month) to access Attendance Tracking.\n\nClick the green "Purchase Now" button on the dashboard.');
        location.href = 'index.html';
        return;
    }
    
    staffData = await window.api.readCSV('staff.csv');
    const today = new Date();
    const dateInput = document.getElementById('attendanceDate');
    dateInput.valueAsDate = today;
    
    // Auto-load attendance when date changes
    dateInput.addEventListener('change', loadAttendance);
    
    loadAttendance();
}

function populateEmployeeSelect() {
    const select = document.getElementById('employeeSelect');
    select.innerHTML = '<option value="">Select Employee</option>';
    staffData.forEach(emp => {
        const empId = emp['Employee ID'] || emp.EmployeeID;
        const empName = emp['Employee Name'] || emp.Name;
        if(emp.Active === 'Yes') {
            select.innerHTML += `<option value="${empId}">${empId} - ${empName}</option>`;
        }
    });
}

async function loadAttendance() {
    const dateInput = document.getElementById('attendanceDate').value;
    if(!dateInput) {
        alert('Please select a date');
        return;
    }
    currentDate = dateInput.replace(/-/g, '');
    currentCSV = `data/attendance_${currentDate}.csv`;
    
    try {
        attData = await window.api.readCSV(currentCSV);
    } catch(e) {
        attData = [];
    }
    renderTable();
}

function renderTable() {
    attTable.innerHTML = '';
    attData.forEach((att, idx) => {
        const empId = att['Employee ID'] || att.EmployeeID;
        const empName = att['Employee Name'] || att.Name;
        const clockInTime = att['Clock In Time'] || att.ClockInTime || '-';
        const clockOutTime = att['Clock Out Time'] || att.ClockOutTime || '-';
        const hours = att['Hours Worked'] || att.HoursWorked;
        const breakTime = att['Break Time'] || att.BreakTime || 0;
        const breakPayable = att['Break Payable'] || att.BreakPayable || 'No';
        const emp = staffData.find(e => {
            const eId = e['Employee ID'] || e.EmployeeID;
            return eId === empId;
        });
        const displayName = emp ? (emp['Employee Name'] || emp.Name) : empName;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${empId}</td>
            <td>${displayName}</td>
            <td><strong style="color: #27ae60;">${clockInTime}</strong></td>
            <td><strong style="color: #e74c3c;">${clockOutTime}</strong></td>
            <td><strong>${hours}</strong> hours</td>
            <td><strong>${breakTime}</strong> hours</td>
            <td><span style="color: ${breakPayable === 'Yes' ? '#27ae60' : '#e74c3c'};">${breakPayable}</span></td>
            <td>
                <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="editAttendance(${idx})">Edit</button>
                <button class="btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="removeAttendance(${idx})">Remove</button>
            </td>`;
        attTable.appendChild(row);
    });
}

function openAttendanceModal() {
    if(!currentDate) {
        alert('Please load a date first');
        return;
    }
    editingIndex = -1;
    populateEmployeeSelect();
    document.getElementById('employeeSelect').value = '';
    document.getElementById('hoursWorked').value = '';
    document.getElementById('breakTime').value = '0';
    document.getElementById('breakPayable').value = 'No';
    document.getElementById('attendanceModal').style.display = 'block';
}

function editAttendance(idx) {
    editingIndex = idx;
    const att = attData[idx];
    const empId = att['Employee ID'] || att.EmployeeID;
    const hours = att['Hours Worked'] || att.HoursWorked;
    const breakTime = att['Break Time'] || att.BreakTime || 0;
    const breakPayable = att['Break Payable'] || att.BreakPayable || 'No';
    populateEmployeeSelect();
    document.getElementById('employeeSelect').value = empId;
    document.getElementById('employeeSelect').disabled = true;
    document.getElementById('hoursWorked').value = hours;
    document.getElementById('breakTime').value = breakTime;
    document.getElementById('breakPayable').value = breakPayable;
    document.getElementById('attendanceModal').style.display = 'block';
}

async function saveAttendanceEntry() {
    const empId = document.getElementById('employeeSelect').value;
    const hours = parseFloat(document.getElementById('hoursWorked').value);
    const breakTime = parseFloat(document.getElementById('breakTime').value) || 0;
    const breakPayable = document.getElementById('breakPayable').value;
    
    if(!empId || isNaN(hours) || hours < 0) {
        alert('Please fill all fields correctly');
        return;
    }
    
    if(breakTime < 0 || breakTime > hours) {
        alert('Break time must be between 0 and hours worked');
        return;
    }
    
    const emp = staffData.find(e => {
        const eId = e['Employee ID'] || e.EmployeeID;
        return eId === empId;
    });
    const empName = emp ? (emp['Employee Name'] || emp.Name) : '';
    
    if(editingIndex >= 0) {
        // Preserve existing clock times when editing
        const existingClockIn = attData[editingIndex]['Clock In Time'] || attData[editingIndex].ClockInTime;
        const existingClockOut = attData[editingIndex]['Clock Out Time'] || attData[editingIndex].ClockOutTime;
        
        attData[editingIndex]['Hours Worked'] = hours;
        attData[editingIndex]['Break Time'] = breakTime;
        attData[editingIndex]['Break Payable'] = breakPayable;
        
        if (existingClockIn) attData[editingIndex]['Clock In Time'] = existingClockIn;
        if (existingClockOut) attData[editingIndex]['Clock Out Time'] = existingClockOut;
    } else {
        const existing = attData.find(a => a['Employee ID'] === empId);
        if(existing) {
            alert('Attendance already recorded for this employee on this date. Use Edit instead.');
            return;
        }
        attData.push({
            'Employee ID': empId,
            'Employee Name': empName,
            'Clock In Time': '-',
            'Clock Out Time': '-',
            'Hours Worked': hours,
            'Break Time': breakTime,
            'Break Payable': breakPayable
        });
    }
    
    await window.api.writeCSV(currentCSV, attData);
    document.getElementById('attendanceModal').style.display = 'none';
    document.getElementById('employeeSelect').disabled = false;
    renderTable();
}

function cancelAttendance() {
    document.getElementById('attendanceModal').style.display = 'none';
    document.getElementById('employeeSelect').disabled = false;
}

async function removeAttendance(idx) {
    if(confirm('Remove this attendance entry?')) {
        attData.splice(idx, 1);
        await window.api.writeCSV(currentCSV, attData);
        renderTable();
    }
}

// Import functionality
let importedData = [];

function openImportModal() {
    if(!currentDate) {
        alert('Please select a date first');
        return;
    }
    
    const dateObj = new Date(document.getElementById('attendanceDate').value);
    const displayDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('importDateDisplay').textContent = displayDate;
    document.getElementById('importFileInput').value = '';
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importConfirmBtn').disabled = true;
    importedData = [];
    document.getElementById('importModal').style.display = 'block';
}

function cancelImport() {
    document.getElementById('importModal').style.display = 'none';
    importedData = [];
}

// Handle file selection
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('importFileInput');
    if(fileInput) {
        fileInput.addEventListener('change', handleImportFile);
    }
});

async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        parseImportedCSV(text);
    } catch (error) {
        alert('Error reading file: ' + error.message);
    }
}

function parseImportedCSV(csvText) {
    try {
        // Remove UTF-8 BOM if present
        if (csvText.charCodeAt(0) === 0xFEFF) {
            csvText = csvText.substring(1);
        }
        
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            alert('CSV file is empty or invalid');
            return;
        }
        
        // Skip "sep=," line if present
        let startIndex = 0;
        if (lines[0].trim().toLowerCase().startsWith('sep=')) {
            startIndex = 1;
        }
        
        // Parse header
        const headerLine = lines[startIndex].replace(/^"/, '').replace(/"$/, '');
        const headers = headerLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim());
        
        console.log('CSV Headers:', headers);
        
        // Find column indices
        const dateIdx = headers.findIndex(h => h.toLowerCase().includes('date') && !h.toLowerCase().includes('end'));
        const empIdIdx = headers.findIndex(h => h.toLowerCase().includes('employee id'));
        const empNameIdx = headers.findIndex(h => h.toLowerCase().includes('employee name'));
        const clockInIdx = headers.findIndex(h => h.toLowerCase().includes('clock in'));
        const clockOutIdx = headers.findIndex(h => h.toLowerCase().includes('clock out'));
        const hoursIdx = headers.findIndex(h => h.toLowerCase().includes('hours worked'));
        const breakIdx = headers.findIndex(h => h.toLowerCase().includes('break time'));
        const breakPayableIdx = headers.findIndex(h => h.toLowerCase().includes('break payable'));
        
        console.log('Column indices:', { dateIdx, empIdIdx, empNameIdx, clockInIdx, clockOutIdx, hoursIdx, breakIdx, breakPayableIdx });
        
        if (empIdIdx === -1 || hoursIdx === -1) {
            alert('Invalid CSV format. Required columns: Employee ID, Hours Worked');
            return;
        }
        
        importedData = [];
        
        // Parse data rows
        for (let i = startIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
            
            const dateStr = dateIdx >= 0 ? values[dateIdx] : '';
            const empId = values[empIdIdx] || '';
            const empName = empNameIdx >= 0 ? values[empNameIdx] : empId;
            const clockIn = clockInIdx >= 0 ? values[clockInIdx] : '-';
            const clockOut = clockOutIdx >= 0 ? values[clockOutIdx] : '-';
            const hours = parseFloat(values[hoursIdx]) || 0;
            const breakTime = breakIdx >= 0 ? (parseFloat(values[breakIdx]) || 0) : 0;
            const breakPayable = breakPayableIdx >= 0 ? values[breakPayableIdx] : 'No';
            
            console.log(`Row ${i}: empId="${empId}", hours=${hours}, values[hoursIdx]="${values[hoursIdx]}"`);
            
            if (empId && hours > 0) {
                importedData.push({
                    'Date': dateStr,
                    'Employee ID': empId,
                    'Employee Name': empName,
                    'Clock In Time': clockIn,
                    'Clock Out Time': clockOut,
                    'Hours Worked': hours,
                    'Break Time': breakTime,
                    'Break Payable': breakPayable
                });
            } else {
                console.log(`Row ${i} rejected: empId="${empId}" (${!!empId}), hours=${hours} (${hours > 0})`);
            }
        }
        
        console.log(`Total imported records: ${importedData.length}`);
        
        if (importedData.length === 0) {
            alert('No valid records found in CSV');
            return;
        }
        
        displayImportPreview();
        
    } catch (error) {
        alert('Error parsing CSV: ' + error.message);
    }
}

function displayImportPreview() {
    const previewDiv = document.getElementById('importPreviewContent');
    let html = '<table style="width: 100%; font-size: 0.9rem;"><thead><tr><th>Emp ID</th><th>Name</th><th>In</th><th>Out</th><th>Hours</th><th>Break</th></tr></thead><tbody>';
    
    importedData.forEach(record => {
        html += `<tr>
            <td>${record['Employee ID']}</td>
            <td>${record['Employee Name']}</td>
            <td style="color: #27ae60;">${record['Clock In Time'] || '-'}</td>
            <td style="color: #e74c3c;">${record['Clock Out Time'] || '-'}</td>
            <td><strong>${record['Hours Worked']}</strong></td>
            <td>${record['Break Time']}</td>
            <td>${record['Break Payable']}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    html += `<p style="margin-top: 1rem; color: var(--primary-color); font-weight: 500;">Found ${importedData.length} record(s) to import</p>`;
    
    previewDiv.innerHTML = html;
    document.getElementById('importPreview').style.display = 'block';
    document.getElementById('importConfirmBtn').disabled = false;
}

async function confirmImport() {
    if (importedData.length === 0) {
        alert('No data to import');
        return;
    }
    
    try {
        // Group records by date
        const recordsByDate = {};
        
        importedData.forEach(record => {
            const dateStr = record['Date'];
            let dateKey;
            
            if (dateStr && dateStr.includes('-')) {
                // Convert yyyy-MM-dd to YYYYMMDD
                dateKey = dateStr.replace(/-/g, '');
            } else {
                // No date in record, use current selected date
                dateKey = currentDate;
            }
            
            if (!recordsByDate[dateKey]) {
                recordsByDate[dateKey] = [];
            }
            recordsByDate[dateKey].push(record);
        });
        
        let totalAdded = 0;
        let totalUpdated = 0;
        let datesProcessed = 0;
        
        // Process each date
        for (const [dateKey, records] of Object.entries(recordsByDate)) {
            const csvPath = `data/attendance_${dateKey}.csv`;
            
            // Load existing data for this date
            let existingData = [];
            try {
                existingData = await window.api.readCSV(csvPath);
            } catch(e) {
                // File doesn't exist yet, that's fine
            }
            
            // Process records for this date
            records.forEach(importRecord => {
                const empId = importRecord['Employee ID'];
                const existingIdx = existingData.findIndex(a => (a['Employee ID'] || a.EmployeeID) === empId);
                
                // Remove Date field before saving (not needed in daily files)
                const recordToSave = {
                    'Employee ID': importRecord['Employee ID'],
                    'Employee Name': importRecord['Employee Name'],
                    'Clock In Time': importRecord['Clock In Time'],
                    'Clock Out Time': importRecord['Clock Out Time'],
                    'Hours Worked': importRecord['Hours Worked'],
                    'Break Time': importRecord['Break Time'],
                    'Break Payable': importRecord['Break Payable']
                };
                
                if (existingIdx >= 0) {
                    // Update existing record
                    existingData[existingIdx] = recordToSave;
                    totalUpdated++;
                } else {
                    // Add new record
                    existingData.push(recordToSave);
                    totalAdded++;
                }
            });
            
            // Save updated data for this date
            await window.api.writeCSV(csvPath, existingData);
            datesProcessed++;
        }
        
        // Reload current date view
        await loadAttendance();
        
        document.getElementById('importModal').style.display = 'none';
        
        if (datesProcessed > 1) {
            alert(`Import successful!\n\n${totalAdded} records added, ${totalUpdated} updated\nAcross ${datesProcessed} different dates`);
        } else {
            alert(`Import successful!\n\n${totalAdded} records added, ${totalUpdated} updated`);
        }
        
        importedData = [];
    } catch (error) {
        alert('Error importing data: ' + error.message);
    }
}

window.openAttendanceModal = openAttendanceModal;
window.editAttendance = editAttendance;
window.saveAttendanceEntry = saveAttendanceEntry;
window.cancelAttendance = cancelAttendance;
window.removeAttendance = removeAttendance;
window.loadAttendance = loadAttendance;
window.openImportModal = openImportModal;
window.cancelImport = cancelImport;
window.confirmImport = confirmImport;

init();