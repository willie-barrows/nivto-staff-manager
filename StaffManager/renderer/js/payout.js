const payoutTable = document.querySelector('#payoutTable tbody');
let staffData = [];
let payoutData = [];

async function init() {
    // Check license before allowing access
    const licenseStatus = await window.api.getLicenseStatus();
    
    if (!licenseStatus.valid || licenseStatus.expired) {
        alert('❌ Access Denied\n\nYour license has expired. Please purchase a subscription (R349/month) to access the Payout Calculator.\n\nClick the green "Purchase Now" button on the dashboard.');
        location.href = 'index.html';
        return;
    }
    
    staffData = await window.api.readCSV('staff.csv');
    
    // Set default date range to current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    document.getElementById('startDate').valueAsDate = monday;
    document.getElementById('endDate').valueAsDate = sunday;
    
    await calculatePayouts();
}

function formatDate(date) {
    return date.toISOString().split('T')[0].replace(/-/g, '');
}

async function calculatePayouts() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if(!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if(start > end) {
        alert('Start date must be before end date');
        return;
    }
    
    // Collect attendance data for the date range
    const attendanceMap = new Map(); // Total hours
    const daysWorkedMap = new Map(); // Days worked count
    
    for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDate(d);
        const attCSV = `data/attendance_${dateStr}.csv`;
        
        try {
            const dayAtt = await window.api.readCSV(attCSV);
            dayAtt.forEach(att => {
                const empId = att['Employee ID'] || att.EmployeeID;
                const hours = parseFloat(att['Hours Worked'] || att.HoursWorked) || 0;
                const breakTime = parseFloat(att['Break Time'] || att.BreakTime) || 0;
                const breakPayable = att['Break Payable'] || att.BreakPayable || 'No';
                
                // Calculate payable hours (subtract non-payable break time)
                let payableHours = hours;
                if(breakPayable === 'No') {
                    payableHours = Math.max(0, hours - breakTime);
                }
                
                // Track total payable hours
                if(attendanceMap.has(empId)) {
                    attendanceMap.set(empId, attendanceMap.get(empId) + payableHours);
                } else {
                    attendanceMap.set(empId, payableHours);
                }
                
                // Track days worked (count unique days with attendance)
                if(hours > 0) {
                    if(daysWorkedMap.has(empId)) {
                        daysWorkedMap.set(empId, daysWorkedMap.get(empId) + 1);
                    } else {
                        daysWorkedMap.set(empId, 1);
                    }
                }
            });
        } catch(e) {
            // No attendance file for this date, skip
        }
    }
    
    // Calculate payouts
    payoutData = [];
    payoutTable.innerHTML = '';
    
    let totalHours = 0;
    let totalGross = 0;
    let totalUIF = 0;
    let totalPAYE = 0;
    let totalTax = 0;
    let totalNet = 0;
    
    staffData.forEach(emp => {
        if(emp.Active === 'Yes') {
            const empId = emp['Employee ID'] || emp.EmployeeID;
            const empName = emp['Employee Name'] || emp.Name;
            const position = emp.Position || '';
            const hours = attendanceMap.get(empId) || 0;
            const daysWorked = daysWorkedMap.get(empId) || 0;
            const rate = parseFloat(emp.Rate) || 0;
            const rateType = emp['Rate Type'] || emp.RateType || 'Hourly';
            let gross = 0;
            
            if(rateType === 'Daily') {
                // For daily rate, use the count of days worked
                gross = daysWorked * rate;
            } else {
                // Hourly rate, use total hours
                gross = hours * rate;
            }
            
            const uifPercent = parseFloat(emp.UIF) || 0;
            const payePercent = parseFloat(emp.PAYE) || 0;
            const taxPercent = parseFloat(emp.Tax) || 0;
            const uif = gross * uifPercent / 100;
            const paye = gross * payePercent / 100;
            const tax = gross * taxPercent / 100;
            const net = gross - uif - paye - tax;
            
            totalHours += hours;
            totalGross += gross;
            totalUIF += uif;
            totalPAYE += paye;
            totalTax += tax;
            totalNet += net;
            
            // Display hours or days based on rate type
            const workedAmount = rateType === 'Daily' ? daysWorked : hours;
            const workedLabel = rateType === 'Daily' ? 'Days Worked' : 'Hours Worked';
            
            const payoutRecord = {
                'Employee ID': empId,
                'Employee Name': empName,
                'Position': position,
                [workedLabel]: workedAmount.toFixed(2),
                'Rate': rate.toFixed(2),
                'Rate Type': rateType,
                'Gross Pay': gross.toFixed(2),
                'UIF Deduction': uif.toFixed(2),
                'PAYE Deduction': paye.toFixed(2),
                'Tax Deduction': tax.toFixed(2),
                'Net Pay': net.toFixed(2)
            };
            
            payoutData.push(payoutRecord);
            
            if(hours > 0 || daysWorked > 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${empId}</td>
                    <td>${empName}</td>
                    <td>${workedAmount.toFixed(2)}</td>
                    <td>R ${rate.toFixed(2)}</td>
                    <td>${rateType}</td>
                    <td>R ${gross.toFixed(2)}</td>
                    <td>R ${uif.toFixed(2)}</td>
                    <td>R ${paye.toFixed(2)}</td>
                    <td>R ${tax.toFixed(2)}</td>
                    <td>R ${net.toFixed(2)}</td>
                    <td>
                        <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="exportIndividualPayoutPDF(${payoutData.length - 1})">📄 PDF</button>
                    </td>
                `;
                payoutTable.appendChild(row);
            }
        }
    });
    
    // Update summary
    document.getElementById('totalHours').textContent = totalHours.toFixed(2);
    document.getElementById('totalGross').textContent = `R ${totalGross.toFixed(2)}`;
    document.getElementById('totalDeductions').textContent = `R ${(totalUIF + totalPAYE + totalTax).toFixed(2)}`;
    document.getElementById('totalNet').textContent = `R ${totalNet.toFixed(2)}`;
    
    // Auto-save payout data
    const dateRange = `${formatDate(start)}_${formatDate(end)}`;
    const payoutCSV = `data/payout_${dateRange}.csv`;
    await window.api.writeCSV(payoutCSV, payoutData);
}

async function exportPayoutPDF() {
    if(payoutData.length === 0) {
        alert('Please calculate payouts first');
        return;
    }
    
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const dateRange = `${formatDate(new Date(startDate))}_${formatDate(new Date(endDate))}`;
    
    const config = await window.api.readConfig();
    const filePath = `data/reports/Payout_${config.companyName || 'Company'}_${dateRange}.pdf`;
    
    await window.api.exportPDF(filePath, config, payoutData, `Payout Report (${startDate} to ${endDate})`);
    
    // Open the PDF file
    const opened = await window.api.openPDF(filePath);
    if (opened) {
        alert(`PDF exported and opened successfully!`);
    } else {
        alert(`PDF exported but could not be opened.\nSaved to: ${filePath}`);
    }
}

async function exportIndividualPayoutPDF(index) {
    if(!payoutData[index]) {
        alert('Employee data not found');
        return;
    }
    
    const employee = payoutData[index];
    const empId = employee['Employee ID'];
    
    // Get full employee details from staffData
    const fullEmployeeData = staffData.find(emp => {
        const eId = emp['Employee ID'] || emp.EmployeeID;
        return eId === empId;
    });
    
    // Load leave data to calculate used/remaining days
    let leaveData = [];
    let usedLeaveDays = 0;
    try {
        leaveData = await window.api.readCSV('leave.csv');
        usedLeaveDays = leaveData
            .filter(leave => (leave['Employee ID'] || leave.EmployeeID) === empId)
            .reduce((sum, leave) => sum + parseFloat(leave['Days Taken'] || leave.DaysTaken || 0), 0);
    } catch(e) {
        // No leave data available
    }
    
    const annualLeave = parseFloat(fullEmployeeData?.['Leave Days']) || 15;
    const remainingLeave = annualLeave - usedLeaveDays;
    
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const dateRange = `${formatDate(new Date(startDate))}_${formatDate(new Date(endDate))}`;
    
    const config = await window.api.readConfig();
    const empName = employee['Employee Name'];
    const filePath = `data/reports/Payslip_${empId}_${empName.replace(/\s+/g, '_')}_${dateRange}.pdf`;
    
    // Merge payout data with full employee details and leave info
    const payslipData = {
        ...employee,
        'ID Number': fullEmployeeData?.['ID Number'] || '',
        'Address': fullEmployeeData?.['Address'] || '',
        'Tax Ref': fullEmployeeData?.['Tax Ref'] || '',
        'UIF Ref': fullEmployeeData?.['UIF Ref'] || '',
        'Bank Name': fullEmployeeData?.['Bank Name'] || '',
        'Account Number': fullEmployeeData?.['Account Number'] || '',
        'Branch Code': fullEmployeeData?.['Branch Code'] || '',
        'Leave Days': annualLeave,
        'Leave Used': usedLeaveDays.toFixed(1),
        'Leave Remaining': remainingLeave.toFixed(1),
        'Period': `${startDate} to ${endDate}`
    };
    
    // Pass single employee data array with isPayslip flag
    await window.api.exportPDF(filePath, config, [payslipData], `Payslip - ${empName}`, true);
    
    // Open the PDF file
    const opened = await window.api.openPDF(filePath);
    if (opened) {
        console.log(`Payslip opened for ${empName}`);
    } else {
        alert(`Payslip exported but could not be opened.\nSaved to: ${filePath}`);
    }
}

window.calculatePayouts = calculatePayouts;
window.exportPayoutPDF = exportPayoutPDF;
window.exportIndividualPayoutPDF = exportIndividualPayoutPDF;

init();