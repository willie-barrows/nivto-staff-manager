package com.nivto.timeclock.util

import android.content.Context
import android.net.Uri
import com.nivto.timeclock.data.entity.ClockEvent
import com.nivto.timeclock.data.entity.Employee
import com.nivto.timeclock.data.entity.EventType
import com.opencsv.CSVReader
import com.opencsv.CSVWriter
import java.io.*
import java.text.SimpleDateFormat
import java.util.*

class CsvHandler(private val context: Context) {
    
    private val dateFormat = SimpleDateFormat("yyyyMMdd", Locale.getDefault())
    private val displayDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
    
    /**
     * Import staff from CSV file matching Windows app format
     * Required columns: Employee ID, Employee Name
     * Optional columns: Position, Rate, Rate Type, Active, UIF, Tax, PAYE, ID Number, ...
     */
    fun importStaff(uri: Uri): Result<List<Employee>> {
        var inputStream: InputStream? = null
        var reader: CSVReader? = null
        
        try {
            // Try to open the file
            inputStream = try {
                context.contentResolver.openInputStream(uri)
            } catch (e: FileNotFoundException) {
                android.util.Log.e("CsvHandler", "File not found: ${e.message}", e)
                return Result.failure(Exception("File not found. Please select a valid CSV file."))
            } catch (e: SecurityException) {
                android.util.Log.e("CsvHandler", "Permission denied: ${e.message}", e)
                return Result.failure(Exception("Permission denied. Please grant file access permission."))
            } catch (e: Exception) {
                android.util.Log.e("CsvHandler", "Cannot open file: ${e.message}", e)
                return Result.failure(Exception("Cannot open file: ${e.message}"))
            }
            
            if (inputStream == null) {
                return Result.failure(Exception("Cannot open file - file may be locked or unavailable"))
            }
            
            // Try to read CSV content with BOM handling
            val allLines = try {
                // Read all bytes first to handle BOM manually
                val bytes = inputStream.readBytes()
                
                // Check for and remove UTF-8 BOM (EF BB BF)
                val cleanedBytes = if (bytes.size >= 3 && 
                    bytes[0] == 0xEF.toByte() && 
                    bytes[1] == 0xBB.toByte() && 
                    bytes[2] == 0xBF.toByte()) {
                    android.util.Log.i("CsvHandler", "Detected and removing UTF-8 BOM")
                    bytes.copyOfRange(3, bytes.size)
                } else {
                    bytes
                }
                
                // Parse CSV from cleaned content
                val cleanedContent = String(cleanedBytes, Charsets.UTF_8)
                reader = CSVReader(java.io.StringReader(cleanedContent))
                reader.readAll()
            } catch (e: IOException) {
                android.util.Log.e("CsvHandler", "Error reading CSV: ${e.message}", e)
                return Result.failure(Exception("Error reading CSV file. File may be corrupted."))
            } catch (e: Exception) {
                android.util.Log.e("CsvHandler", "Error parsing CSV: ${e.message}", e)
                return Result.failure(Exception("Error parsing CSV: ${e.message}"))
            } finally {
                try {
                    reader?.close()
                } catch (e: Exception) {
                    android.util.Log.w("CsvHandler", "Error closing reader: ${e.message}")
                }
            }
            
            if (allLines == null || allLines.isEmpty()) {
                return Result.failure(Exception("CSV file is empty"))
            }
            
            if (allLines.size < 2) {
                return Result.failure(Exception("CSV file must contain header row and at least one data row"))
            }
            
            // Skip "sep=," line if present
            // CSV readers may parse it differently: ["sep=,"] or ["sep=", ","] or ["sep=", ""]
            var startIndex = 0
            if (allLines.isNotEmpty() && allLines[0].isNotEmpty()) {
                val firstCell = allLines[0][0].trim()
                android.util.Log.d("CsvHandler", "First row, first cell: '$firstCell'")
                
                // Check if first cell is or contains "sep="
                if (firstCell.startsWith("sep=", ignoreCase = true) || 
                    firstCell.equals("sep=,", ignoreCase = true) ||
                    firstCell == "sep=") {
                    android.util.Log.i("CsvHandler", "Detected sep= line, skipping to row 1")
                    startIndex = 1
                }
            }
            
            // Make sure we have enough lines after skipping sep line
            if (allLines.size <= startIndex) {
                return Result.failure(Exception("CSV file has no data rows after sep= line"))
            }
            
            if (allLines.size <= startIndex + 1) {
                return Result.failure(Exception("CSV file needs at least one employee record after header"))
            }
            
            var headers = allLines[startIndex].map { it.trim() }
            
            // Log all detected columns for debugging
            android.util.Log.i("CsvHandler", "CSV Headers found (row $startIndex): ${headers.joinToString(" | ")}")
            android.util.Log.i("CsvHandler", "Total columns: ${headers.size}")
            
            // Additional check: if headers look like "sep=," was not skipped, skip it now
            if (headers.isNotEmpty() && headers[0].contains("sep=", ignoreCase = true)) {
                android.util.Log.w("CsvHandler", "Headers contain 'sep=' - skipping to next row")
                startIndex++
                if (allLines.size <= startIndex) {
                    return Result.failure(Exception("CSV file has no header row after sep= line"))
                }
                if (allLines.size <= startIndex + 1) {
                    return Result.failure(Exception("CSV file needs at least one employee record after header"))
                }
                headers = allLines[startIndex].map { it.trim() }
                android.util.Log.i("CsvHandler", "New headers (row $startIndex): ${headers.joinToString(" | ")}")
            }
            
            // Find column indices with flexible matching for common variations
            // Windows app uses "Employee" (not "Employee ID")
            var employeeIdIndex = headers.indexOfFirst { 
                it.equals("Employee", ignoreCase = true) ||
                it.equals("Employee ID", ignoreCase = true) ||
                it.equals("EmployeeID", ignoreCase = true) ||
                it.equals("Employee_ID", ignoreCase = true) ||
                it.equals("Staff ID", ignoreCase = true) ||
                it.equals("StaffID", ignoreCase = true) ||
                it.equals("EmpID", ignoreCase = true) ||
                it.equals("Emp ID", ignoreCase = true) ||
                it.equals("Emp", ignoreCase = true)
            }
            
            // Windows app uses "Employee Position" for the position title, not name
            // Name might be in an unlabeled column or between Employee and Position
            var nameIndex = headers.indexOfFirst { 
                it.equals("Employee Name", ignoreCase = true) ||
                it.equals("EmployeeName", ignoreCase = true) ||
                it.equals("Employee_Name", ignoreCase = true) ||
                it.equals("Name", ignoreCase = true) ||
                it.equals("Full Name", ignoreCase = true) ||
                it.equals("FullName", ignoreCase = true) ||
                it.equals("Staff Name", ignoreCase = true) ||
                it.equals("StaffName", ignoreCase = true)
            }
            
            var positionIndex = headers.indexOfFirst { 
                it.equals("Employee Position", ignoreCase = true) ||
                it.equals("Position", ignoreCase = true) ||
                it.equals("Title", ignoreCase = true) ||
                it.equals("Job Title", ignoreCase = true) ||
                it.equals("Role", ignoreCase = true)
            }
            
            // Smart fallback logic for Windows app format
            // If "Employee" is found at index 0, assume:
            // - Index 1 is likely the name (often unlabeled)
            // - "Employee Position" or "Position" is the job title
            if (employeeIdIndex == 0 && nameIndex == -1 && headers.size > 1) {
                // Check if index 1 looks like it could be a name column (unlabeled or empty header)
                if (headers[1].isEmpty() || headers[1].length < 5) {
                    android.util.Log.i("CsvHandler", "Assuming column 1 is employee name (unlabeled)")
                    nameIndex = 1
                }
            }
            
            // If still no name found, look for any unlabeled/empty columns near the start
            if (nameIndex == -1) {
                nameIndex = headers.indexOfFirst { it.isEmpty() || it.isBlank() }
                if (nameIndex >= 0) {
                    android.util.Log.i("CsvHandler", "Using unlabeled column $nameIndex as employee name")
                }
            }
            
            // Last resort: if we have Employee ID but no name, use column after Employee ID
            if (employeeIdIndex >= 0 && nameIndex == -1 && headers.size > employeeIdIndex + 1) {
                nameIndex = employeeIdIndex + 1
                android.util.Log.w("CsvHandler", "Using column ${nameIndex} (${headers.getOrNull(nameIndex)}) as employee name")
            }
            
            val activeIndex = headers.indexOfFirst { 
                it.equals("Active", ignoreCase = true) ||
                it.equals("Status", ignoreCase = true) ||
                it.equals("Is Active", ignoreCase = true)
            }
            
            val idNumberIndex = headers.indexOfFirst { 
                it.equals("ID Number", ignoreCase = true) ||
                it.equals("IDNumber", ignoreCase = true) ||
                it.equals("ID_Number", ignoreCase = true) ||
                it.equals("National ID", ignoreCase = true) ||
                it.equals("SA ID", ignoreCase = true)
            }
            
            // Log detected column indices
            android.util.Log.i("CsvHandler", "Column mapping - Employee ID: $employeeIdIndex, Name: $nameIndex, Position: $positionIndex, Active: $activeIndex, ID Number: $idNumberIndex")
            
            // Only Employee ID and Employee Name are truly required
            if (employeeIdIndex == -1 || nameIndex == -1) {
                // Provide helpful error message with available columns
                val availableColumns = headers.mapIndexed { index, header -> 
                    "[$index] $header" 
                }.joinToString(", ")
                android.util.Log.e("CsvHandler", "Cannot find required columns. Headers with indices: $availableColumns")
                return Result.failure(Exception("Missing required columns.\n\nFound columns:\n$availableColumns\n\nNeed 'Employee ID' (or 'Employee') and 'Employee Name' (or 'Name') columns."))
            }
            
            val employees = mutableListOf<Employee>()
            var successCount = 0
            var skipCount = 0
            
            for (i in (startIndex + 1) until allLines.size) {
                try {
                    val line = allLines[i]
                    
                    // Skip empty rows
                    if (line.isEmpty() || line.all { it.isBlank() }) {
                        skipCount++
                        continue
                    }
                    
                    // Get required fields
                    val employeeId = try {
                        line.getOrNull(employeeIdIndex)?.trim() ?: ""
                    } catch (e: Exception) {
                        android.util.Log.w("CsvHandler", "Row $i: Error reading Employee ID: ${e.message}")
                        skipCount++
                        continue
                    }
                    
                    val name = try {
                        line.getOrNull(nameIndex)?.trim() ?: ""
                    } catch (e: Exception) {
                        android.util.Log.w("CsvHandler", "Row $i: Error reading Employee Name: ${e.message}")
                        skipCount++
                        continue
                    }
                    
                    // Skip if required fields are empty
                    if (employeeId.isEmpty() || name.isEmpty()) {
                        android.util.Log.w("CsvHandler", "Row $i: Skipping - empty Employee ID or Name")
                        skipCount++
                        continue
                    }
                    
                    // Get optional fields with error handling
                    val position = try {
                        if (positionIndex >= 0) line.getOrNull(positionIndex)?.trim() ?: "" else ""
                    } catch (e: Exception) {
                        android.util.Log.w("CsvHandler", "Row $i: Error reading Position: ${e.message}")
                        ""
                    }
                    
                    val active = try {
                        if (activeIndex >= 0) {
                            val activeValue = line.getOrNull(activeIndex)?.trim() ?: "Yes"
                            activeValue.equals("Yes", ignoreCase = true) || 
                            activeValue.equals("True", ignoreCase = true) ||
                            activeValue.equals("1", ignoreCase = true)
                        } else {
                            true
                        }
                    } catch (e: Exception) {
                        android.util.Log.w("CsvHandler", "Row $i: Error reading Active status: ${e.message}")
                        true
                    }
                    
                    val idNumberRaw = try {
                        if (idNumberIndex >= 0) line.getOrNull(idNumberIndex)?.trim() ?: "" else ""
                    } catch (e: Exception) {
                        android.util.Log.w("CsvHandler", "Row $i: Error reading ID Number: ${e.message}")
                        ""
                    }
                    
                    // Convert ID Number - handle scientific notation from Windows app
                    // e.g. "8,41E+12" or "8.41E+12" or "8.41E12" -> "8410000000000"
                    val idNumber = convertIdNumber(idNumberRaw)
                    android.util.Log.d("CsvHandler", "Row $i: ID Number raw='$idNumberRaw' converted='$idNumber'")
                    
                    // Generate a valid ID number from employee ID if not provided
                    val finalIdNumber = try {
                        if (idNumber.isNotEmpty() && idNumber.length >= 6) {
                            idNumber
                        } else {
                            // Create pseudo-ID: use employee ID padded to at least 6 digits
                            employeeId.padStart(6, '0') + "0000" + employeeId
                        }
                    } catch (e: Exception) {
                        android.util.Log.w("CsvHandler", "Row $i: Error generating ID Number: ${e.message}")
                        employeeId.padStart(13, '0')
                    }
                    
                    // Create employee object
                    try {
                        employees.add(
                            Employee(
                                employeeId = employeeId,
                                employeeName = name,
                                position = position,
                                idNumber = finalIdNumber,
                                active = active
                            )
                        )
                        successCount++
                        android.util.Log.d("CsvHandler", "Row $i: Successfully imported employee: $name (ID: $employeeId)")
                    } catch (e: Exception) {
                        android.util.Log.e("CsvHandler", "Row $i: Error creating Employee object: ${e.message}", e)
                        skipCount++
                    }
                    
                } catch (e: Exception) {
                    // Catch any unexpected errors for this row
                    android.util.Log.e("CsvHandler", "Row $i: Unexpected error: ${e.message}", e)
                    skipCount++
                    continue
                }
            }
            
            android.util.Log.i("CsvHandler", "Import complete: $successCount employees imported, $skipCount rows skipped")
            
            if (employees.isEmpty()) {
                return Result.failure(Exception("No valid employees found in CSV. Successfully processed: $successCount rows. Skipped: $skipCount rows. Please check that rows have valid Employee ID and Name values."))
            } else {
                val message = if (skipCount > 0) {
                    "Successfully imported $successCount employees ($skipCount rows skipped)"
                } else {
                    "Successfully imported $successCount employees"
                }
                android.util.Log.i("CsvHandler", message)
                return Result.success(employees)
            }
            
        } catch (e: OutOfMemoryError) {
            android.util.Log.e("CsvHandler", "Out of memory error: ${e.message}", e)
            return Result.failure(Exception("File is too large to import. Try a smaller file."))
        } catch (e: Exception) {
            android.util.Log.e("CsvHandler", "Unexpected import error: ${e.message}", e)
            return Result.failure(Exception("Import failed: ${e.message ?: "Unknown error"}"))
        } finally {
            // Ensure streams are closed
            try {
                inputStream?.close()
            } catch (e: Exception) {
                android.util.Log.w("CsvHandler", "Error closing input stream: ${e.message}")
            }
        }
    }
    
    /**
     * Export attendance to CSV matching Windows app format
     * Format: sep=,\nEmployee ID,Employee Name,Hours Worked,Break Time,Break Payable
     */
    fun exportAttendance(
        events: List<ClockEvent>,
        startDate: Long,
        endDate: Long,
        outputFile: File
    ): Result<File> {
        return try {
            // Group events by employee and date
            val attendanceRecords = calculateAttendance(events, startDate, endDate)
            
            // Write to CSV with UTF-8 BOM
            val writer = OutputStreamWriter(FileOutputStream(outputFile), Charsets.UTF_8)
            writer.write("\uFEFF") // UTF-8 BOM for Excel compatibility
            
            val csvWriter = CSVWriter(
                writer,
                ',',
                CSVWriter.NO_QUOTE_CHARACTER,
                CSVWriter.DEFAULT_ESCAPE_CHARACTER,
                CSVWriter.DEFAULT_LINE_END
            )
            
            // Write sep=, for Excel
            csvWriter.writeNext(arrayOf("sep=,"))
            
            // Write header
            csvWriter.writeNext(arrayOf(
                "Date",
                "Employee ID",
                "Employee Name",
                "Clock In Time",
                "Clock Out Time",
                "Hours Worked",
                "Break Time",
                "Break Payable"
            ))
            
            // Write attendance records
            attendanceRecords.forEach { record ->
                csvWriter.writeNext(arrayOf(
                    record.date,
                    record.employeeId,
                    record.employeeName,
                    record.clockInTime,
                    record.clockOutTime,
                    String.format(Locale.US, "%.2f", record.hoursWorked),
                    String.format(Locale.US, "%.2f", record.breakTime),
                    record.breakPayable
                ))
            }
            
            csvWriter.close()
            Result.success(outputFile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private data class AttendanceRecord(
        val date: String,
        val employeeId: String,
        val employeeName: String,
        val clockInTime: String,
        val clockOutTime: String,
        val hoursWorked: Double,
        val breakTime: Double,
        val breakPayable: String
    )
    
    /**
     * Convert ID number from various formats to a clean numeric string.
     * Handles scientific notation from Windows/Excel exports (e.g. "8,41E+12" -> "8410000000000")
     */
    private fun convertIdNumber(raw: String): String {
        if (raw.isBlank()) return ""
        
        val cleaned = raw.trim()
        
        // Check if it's in scientific notation (contains E or e)
        if (cleaned.contains('E', ignoreCase = true)) {
            try {
                // Replace comma with dot for decimal separator (European format)
                val normalized = cleaned.replace(',', '.')
                val number = java.math.BigDecimal(normalized)
                val longValue = number.toLong()
                val result = longValue.toString()
                android.util.Log.d("CsvHandler", "Converted scientific notation: '$raw' -> '$result'")
                return result
            } catch (e: Exception) {
                android.util.Log.w("CsvHandler", "Failed to parse scientific notation '$raw': ${e.message}")
            }
        }
        
        // Check if it's a plain number with commas (e.g. "8,410,000,000,000" or "8410000000000")
        val digitsOnly = cleaned.replace(",", "").replace(".", "").replace(" ", "")
        if (digitsOnly.all { it.isDigit() } && digitsOnly.isNotEmpty()) {
            return digitsOnly
        }
        
        // Return as-is if no conversion needed
        return cleaned
    }
    
    private fun calculateAttendance(
        events: List<ClockEvent>,
        startDate: Long,
        endDate: Long
    ): List<AttendanceRecord> {
        // Group events by employee and date
        val eventsByEmployeeAndDate = events
            .filter { it.timestamp >= startDate && it.timestamp <= endDate }
            .groupBy { event ->
                val cal = Calendar.getInstance()
                cal.timeInMillis = event.timestamp
                Pair(event.employeeId, getDateString(cal))
            }
        
        val records = mutableListOf<AttendanceRecord>()
        val dateFormatDisplay = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        
        eventsByEmployeeAndDate.forEach { (key, dayEvents) ->
            val (employeeId, dateString) = key
            val sortedEvents = dayEvents.sortedBy { it.timestamp }
            
            var totalHours = 0.0
            var breakTime = 0.0
            var lastClockIn: ClockEvent? = null
            var employeeName = sortedEvents.firstOrNull()?.employeeName ?: ""
            var clockInTime = ""
            var clockOutTime = ""
            
            // Get first clock in and last clock out for the day
            val firstClockIn = sortedEvents.firstOrNull { it.eventType == EventType.CLOCK_IN }
            val lastClockOut = sortedEvents.lastOrNull { it.eventType == EventType.CLOCK_OUT }
            
            clockInTime = firstClockIn?.let { timeFormat.format(Date(it.timestamp)) } ?: ""
            clockOutTime = lastClockOut?.let { timeFormat.format(Date(it.timestamp)) } ?: ""
            
            sortedEvents.forEach { event ->
                when (event.eventType) {
                    EventType.CLOCK_IN -> {
                        lastClockIn = event
                    }
                    EventType.CLOCK_OUT -> {
                        lastClockIn?.let { clockIn ->
                            val hours = (event.timestamp - clockIn.timestamp) / (1000.0 * 60 * 60)
                            totalHours += hours
                        }
                        lastClockIn = null
                    }
                }
            }
            
            // Only add record if there are complete sessions (hours > 0)
            if (totalHours > 0) {
                records.add(
                    AttendanceRecord(
                        date = dateString,
                        employeeId = employeeId,
                        employeeName = employeeName,
                        clockInTime = clockInTime,
                        clockOutTime = clockOutTime,
                        hoursWorked = totalHours,
                        breakTime = breakTime,
                        breakPayable = "No"
                    )
                )
            }
        }
        
        // Return all individual day records (don't aggregate)
        return records
    }
    
    private fun getDateString(calendar: Calendar): String {
        return displayDateFormat.format(calendar.time)
    }
    
    fun getExportFileName(startDate: Long, endDate: Long): String {
        return "nivto_attendance_${dateFormat.format(Date(startDate))}_${dateFormat.format(Date(endDate))}.csv"
    }
}
