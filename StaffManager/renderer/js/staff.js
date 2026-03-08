const staffTable = document.querySelector('#staffTable tbody');
const staffCSV = 'staff.csv';
let staffData = [];

async function init() {
    // Check license before allowing access
    const licenseStatus = await window.api.getLicenseStatus();
    
    if (!licenseStatus.valid || licenseStatus.expired) {
        alert('❌ Access Denied\n\nYour license has expired. Please purchase a subscription (R349/month) to access Staff Management.\n\nClick the green "Purchase Now" button on the dashboard.');
        location.href = 'index.html';
        return;
    }
    
    staffData = await window.api.readCSV(staffCSV);
    renderTable();
}

async function autoSave(){
    await window.api.writeCSV(staffCSV, staffData);
}

function renderTable(){
    staffTable.innerHTML = '';
    staffData.forEach((emp, idx)=>{
        // Support both old and new column names
        const empId = emp['Employee ID'] || emp.EmployeeID;
        const name = emp['Employee Name'] || emp.Name;
        const position = emp.Position;
        const rate = emp.Rate;
        const rateType = emp['Rate Type'] || emp.RateType || 'Hourly';
        const active = emp.Active;
        const uif = emp.UIF;
        const paye = emp.PAYE || 0;
        const tax = emp.Tax;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${empId}</td>
            <td>${name}</td>
            <td>${position}</td>
            <td>${rateType}</td>
            <td>R ${parseFloat(rate).toFixed(2)}</td>
            <td><span style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600; background: ${active === 'Yes' ? '#d1fae5' : '#fee2e2'}; color: ${active === 'Yes' ? '#065f46' : '#991b1b'};">${active}</span></td>
            <td>${uif}%</td>
            <td>${paye}%</td>
            <td>${tax}%</td>
            <td>
                <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="editStaff(${idx})">Edit</button>
                <button class="btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="removeStaff(${idx})">Remove</button>
            </td>`;
        staffTable.appendChild(row);
    });
}

function addStaff(){
    document.getElementById('addStaffModal').style.display = 'block';
}

window.saveNewStaff = function(){
    const id = document.getElementById('newEmployeeID').value.trim();
    const name = document.getElementById('newName').value.trim();
    const pos = document.getElementById('newPosition').value.trim();
    const rate = document.getElementById('newRate').value.trim();
    const rateType = document.getElementById('newRateType').value;
    const active = document.getElementById('newActive').value;
    const uif = document.getElementById('newUIF').value || 1;
    const paye = document.getElementById('newPAYE').value || 0;
    const tax = document.getElementById('newTax').value || 10;
    const idNumber = document.getElementById('newIDNumber').value.trim();
    const address = document.getElementById('newAddress').value.trim();
    const taxRef = document.getElementById('newTaxRef').value.trim();
    const uifRef = document.getElementById('newUIFRef').value.trim();
    const bankName = document.getElementById('newBankName').value.trim();
    const accountNumber = document.getElementById('newAccountNumber').value.trim();
    const branchCode = document.getElementById('newBranchCode').value.trim();
    const leaveDays = document.getElementById('newLeaveDays').value || 15;
    
    if(!id || !name || !pos || !rate){
        alert('Please fill all required fields (ID, Name, Position, Rate)');
        return;
    }
    
    // Check for duplicate Employee ID
    const existingEmp = staffData.find(e => 
        (e['Employee ID'] || e.EmployeeID) === id
    );
    if(existingEmp) {
        alert('Employee ID already exists. Please use a different ID.');
        return;
    }
    
    // Use consistent column names for new entries
    staffData.push({
        'Employee ID': id,
        'Employee Name': name,
        'Position': pos,
        'Rate': rate,
        'Rate Type': rateType,
        'Active': active,
        'UIF': uif,
        'PAYE': paye,
        'Tax': tax,
        'ID Number': idNumber,
        'Address': address,
        'Tax Ref': taxRef,
        'UIF Ref': uifRef,
        'Bank Name': bankName,
        'Account Number': accountNumber,
        'Branch Code': branchCode,
        'Leave Days': leaveDays
    });
    
    document.getElementById('addStaffModal').style.display = 'none';
    document.getElementById('newEmployeeID').value = '';
    document.getElementById('newName').value = '';
    document.getElementById('newPosition').value = '';
    document.getElementById('newRate').value = '';
    document.getElementById('newRateType').value = 'Hourly';
    document.getElementById('newActive').value = 'Yes';
    document.getElementById('newUIF').value = '1';
    document.getElementById('newPAYE').value = '0';
    document.getElementById('newTax').value = '10';
    document.getElementById('newIDNumber').value = '';
    document.getElementById('newAddress').value = '';
    document.getElementById('newTaxRef').value = '';
    document.getElementById('newUIFRef').value = '';
    document.getElementById('newBankName').value = '';
    document.getElementById('newAccountNumber').value = '';
    document.getElementById('newBranchCode').value = '';
    document.getElementById('newLeaveDays').value = '15';
    renderTable();
    autoSave();
}

window.cancelAdd = function(){
    document.getElementById('addStaffModal').style.display = 'none';
}

window.editStaff = function(idx){
    const emp = staffData[idx];
    document.getElementById('editIndex').value = idx;
    document.getElementById('editEmployeeID').value = emp['Employee ID'] || emp.EmployeeID;
    document.getElementById('editName').value = emp['Employee Name'] || emp.Name;
    document.getElementById('editPosition').value = emp.Position;
    document.getElementById('editRateType').value = emp['Rate Type'] || emp.RateType || 'Hourly';
    document.getElementById('editRate').value = emp.Rate;
    document.getElementById('editActive').value = emp.Active;
    document.getElementById('editUIF').value = emp.UIF;
    document.getElementById('editPAYE').value = emp.PAYE || 0;
    document.getElementById('editTax').value = emp.Tax;
    document.getElementById('editIDNumber').value = emp['ID Number'] || '';
    document.getElementById('editAddress').value = emp['Address'] || '';
    document.getElementById('editTaxRef').value = emp['Tax Ref'] || '';
    document.getElementById('editUIFRef').value = emp['UIF Ref'] || '';
    document.getElementById('editBankName').value = emp['Bank Name'] || '';
    document.getElementById('editAccountNumber').value = emp['Account Number'] || '';
    document.getElementById('editBranchCode').value = emp['Branch Code'] || '';
    document.getElementById('editLeaveDays').value = emp['Leave Days'] || 15;
    document.getElementById('editStaffModal').style.display = 'block';
}

window.saveEditStaff = function(){
    const idx = parseInt(document.getElementById('editIndex').value);
    const emp = staffData[idx];
    const newEmployeeID = document.getElementById('editEmployeeID').value.trim();
    const currentEmployeeID = emp['Employee ID'] || emp.EmployeeID;
    
    // Validate Employee ID
    if(!newEmployeeID) {
        alert('Employee ID is required');
        return;
    }
    
    // Check for duplicate ID only if it changed
    if(newEmployeeID !== currentEmployeeID) {
        const duplicate = staffData.some((e, i) => {
            if(i === idx) return false; // Skip current employee
            const eId = e['Employee ID'] || e.EmployeeID;
            return eId === newEmployeeID;
        });
        if(duplicate) {
            alert('Employee ID already exists. Please use a unique ID.');
            return;
        }
    }
    
    // Update Employee ID using the existing column name format
    if(emp['Employee ID'] !== undefined) {
        staffData[idx]['Employee ID'] = newEmployeeID;
    } else {
        staffData[idx].EmployeeID = newEmployeeID;
    }
    
    // Update using the existing column name format (preserve what's already there)
    if(emp['Employee Name'] !== undefined) {
        staffData[idx]['Employee Name'] = document.getElementById('editName').value.trim();
    } else {
        staffData[idx].Name = document.getElementById('editName').value.trim();
    }
    
    staffData[idx].Position = document.getElementById('editPosition').value.trim();
    
    if(emp['Rate Type'] !== undefined) {
        staffData[idx]['Rate Type'] = document.getElementById('editRateType').value;
    } else {
        staffData[idx].RateType = document.getElementById('editRateType').value;
    }
    
    staffData[idx].Rate = document.getElementById('editRate').value.trim();
    staffData[idx].Active = document.getElementById('editActive').value;
    staffData[idx].UIF = document.getElementById('editUIF').value;
    staffData[idx].PAYE = document.getElementById('editPAYE').value;
    staffData[idx].Tax = document.getElementById('editTax').value;
    staffData[idx]['ID Number'] = document.getElementById('editIDNumber').value.trim();
    staffData[idx]['Address'] = document.getElementById('editAddress').value.trim();
    staffData[idx]['Tax Ref'] = document.getElementById('editTaxRef').value.trim();
    staffData[idx]['UIF Ref'] = document.getElementById('editUIFRef').value.trim();
    staffData[idx]['Bank Name'] = document.getElementById('editBankName').value.trim();
    staffData[idx]['Account Number'] = document.getElementById('editAccountNumber').value.trim();
    staffData[idx]['Branch Code'] = document.getElementById('editBranchCode').value.trim();
    staffData[idx]['Leave Days'] = document.getElementById('editLeaveDays').value || 15;
    
    document.getElementById('editStaffModal').style.display = 'none';
    renderTable();
    autoSave();
}

window.cancelEdit = function(){
    document.getElementById('editStaffModal').style.display = 'none';
}

window.removeStaff = function(idx){
    if(confirm("Remove this employee?")){
        staffData.splice(idx,1);
        renderTable();
        autoSave();
    }
}

// Export staff data for Mobile App
window.exportStaffForMobile = async function() {
    if(staffData.length === 0) {
        alert('No staff data to export');
        return;
    }
    
    try {
        // Prompt user to save the file
        const result = await window.api.exportStaffFile();
        
        if(result.success) {
            // Show instructions modal
            await showExportInstructions(result.filePath);
        } else if(result.cancelled) {
            // User cancelled - do nothing
        } else {
            alert('Export failed: ' + (result.error || 'Unknown error'));
        }
    } catch(error) {
        alert('Export failed: ' + error.message);
    }
}

async function showExportInstructions(filePath) {
    // Read config to get mobile PIN
    const config = await window.api.readConfig();
    const mobilePIN = config.mobilePIN || null;
    
    const pinSection = mobilePIN ? `
        <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <h4 style="margin: 0 0 0.5rem 0; color: #1976D2;">🔐 Mobile App PIN</h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
                Use this PIN when setting up the mobile app:
            </p>
            <div style="background: white; padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem; font-size: 1.5rem; font-weight: bold; text-align: center; color: #1976D2; letter-spacing: 0.5rem;">
                ${mobilePIN}
            </div>
        </div>
    ` : '';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <h3 style="color: #27ae60;">✅ Staff Data Exported!</h3>
            <p style="margin: 1rem 0; color: var(--text-secondary);">File saved to:</p>
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; font-family: monospace; word-break: break-all; margin-bottom: 1rem;">
                ${filePath}
            </div>
            
            ${pinSection}
            
            <h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem;">📱 Transfer to Mobile App:</h4>
            <ol style="color: var(--text-secondary); line-height: 1.8; padding-left: 1.5rem;">
                <li><strong>Email:</strong> Attach the file and send to yourself</li>
                <li><strong>USB Cable:</strong> Connect phone and copy file to Downloads folder</li>
                <li><strong>WhatsApp:</strong> Send file to yourself (WhatsApp Web)</li>
                <li><strong>Cloud:</strong> Upload to Google Drive/OneDrive, download on phone</li>
            </ol>
            
            <h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem;">📥 Import on Android:</h4>
            <ol style="color: var(--text-secondary); line-height: 1.8; padding-left: 1.5rem;">
                <li>Open NIVTO Time Clock app</li>
                <li>Tap <strong>Management Access</strong> (enter PIN)</li>
                <li>Go to <strong>Staff</strong> tab</li>
                <li>Tap <strong>Import Staff from CSV</strong></li>
                <li>Select the downloaded file</li>
            </ol>
            
            <button class="btn-primary" onclick="this.closest('.modal').remove()" style="margin-top: 1.5rem; width: 100%;">Got it!</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if(e.target === modal) {
            modal.remove();
        }
    });
}

init();