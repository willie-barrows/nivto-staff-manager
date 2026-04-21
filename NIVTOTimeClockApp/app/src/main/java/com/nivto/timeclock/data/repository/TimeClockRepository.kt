package com.nivto.timeclock.data.repository

import com.nivto.timeclock.data.dao.ClockEventDao
import com.nivto.timeclock.data.dao.EmployeeDao
import com.nivto.timeclock.data.entity.ClockEvent
import com.nivto.timeclock.data.entity.Employee
import com.nivto.timeclock.data.entity.EventType
import com.nivto.timeclock.sync.data.SyncQueueDao
import com.nivto.timeclock.sync.data.SyncQueueItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.util.Calendar

class TimeClockRepository(
    private val employeeDao: EmployeeDao,
    private val clockEventDao: ClockEventDao,
    private val syncQueueDao: SyncQueueDao? = null
) {
    // Employee operations
    fun getAllActiveEmployees(): Flow<List<Employee>> = employeeDao.getAllActiveEmployees()
    
    suspend fun findEmployeesByBirthDate(birthDate: String): List<Employee> {
        return withContext(Dispatchers.IO) {
            try {
                android.util.Log.d("TimeClockRepo", "Finding employees by birth date: $birthDate")
                val result = employeeDao.findEmployeesByIdPrefix(birthDate)
                android.util.Log.d("TimeClockRepo", "Found ${result.size} employees")
                result
            } catch (e: Exception) {
                android.util.Log.e("TimeClockRepo", "Error finding employees: ${e.message}", e)
                emptyList()
            }
        }
    }
    
    suspend fun findEmployeesByIdInput(input: String): List<Employee> {
        return withContext(Dispatchers.IO) {
            try {
                android.util.Log.d("TimeClockRepo", "Finding employees by input: $input")
                val result = employeeDao.findEmployeesByIdInput(input)
                android.util.Log.d("TimeClockRepo", "Found ${result.size} employees for input '$input'")
                result
            } catch (e: Exception) {
                android.util.Log.e("TimeClockRepo", "Error finding employees by input: ${e.message}", e)
                emptyList()
            }
        }
    }
    
    suspend fun getEmployee(employeeId: String): Employee? {
        return employeeDao.getEmployee(employeeId)
    }
    
    suspend fun insertEmployees(employees: List<Employee>) {
        withContext(Dispatchers.IO) {
            try {
                android.util.Log.d("TimeClockRepo", "Inserting ${employees.size} employees")
                employeeDao.insertEmployees(employees)
                android.util.Log.d("TimeClockRepo", "Successfully inserted ${employees.size} employees")
            } catch (e: Exception) {
                android.util.Log.e("TimeClockRepo", "Error inserting employees: ${e.message}", e)
                throw Exception("Failed to insert employees: ${e.message}")
            }
        }
    }
    
    suspend fun clearEmployees() {
        withContext(Dispatchers.IO) {
            try {
                android.util.Log.d("TimeClockRepo", "Clearing all employees")
                employeeDao.deleteAll()
                android.util.Log.d("TimeClockRepo", "Successfully cleared employees")
            } catch (e: Exception) {
                android.util.Log.e("TimeClockRepo", "Error clearing employees: ${e.message}", e)
                throw Exception("Failed to clear employees: ${e.message}")
            }
        }
    }
    
    suspend fun getActiveEmployeeCount(): Int {
        return employeeDao.getActiveEmployeeCount()
    }
    
    // Clock event operations
    fun getAllEvents(): Flow<List<ClockEvent>> = clockEventDao.getAllEvents()
    
    suspend fun clockIn(employee: Employee): Result<ClockEvent> {
        return withContext(Dispatchers.IO) {
            try {
                // Validate employee data
                if (employee.employeeId.isBlank()) {
                    android.util.Log.e("TimeClockRepo", "Employee ID is blank")
                    return@withContext Result.failure(Exception("Invalid employee ID"))
                }
                if (employee.employeeName.isBlank()) {
                    android.util.Log.e("TimeClockRepo", "Employee name is blank")
                    return@withContext Result.failure(Exception("Invalid employee name"))
                }
                
                android.util.Log.d("TimeClockRepo", "Starting clock in for ${employee.employeeName}")
                val lastEvent = clockEventDao.getLastEvent(employee.employeeId)
                
                // Check if already clocked in
                if (lastEvent != null && lastEvent.eventType == EventType.CLOCK_IN) {
                    // Check if it's been more than 24 hours - allow new clock in
                    val hoursSinceLastClock = (System.currentTimeMillis() - lastEvent.timestamp) / (1000 * 60 * 60)
                    if (hoursSinceLastClock < 24) {
                        return@withContext Result.failure(Exception("Already clocked in. Please clock out first."))
                    }
                }
                
                val event = ClockEvent(
                    employeeId = employee.employeeId,
                    employeeName = employee.employeeName,
                    timestamp = System.currentTimeMillis(),
                    eventType = EventType.CLOCK_IN
                )
                
                clockEventDao.insertEvent(event)
                syncQueueDao?.insert(SyncQueueItem(eventType = "clock-in", employeeId = employee.employeeId, timestamp = event.timestamp))
                android.util.Log.d("TimeClockRepo", "Clock IN successful - Employee: ${employee.employeeName}")
                return@withContext Result.success(event)
            } catch (e: Exception) {
                android.util.Log.e("TimeClockRepo", "Clock IN failed: ${e.message}", e)
                return@withContext Result.failure(Exception("Failed to clock in: ${e.message}"))
            }
        }
    }
    
    suspend fun clockOut(employee: Employee): Result<ClockEvent> {
        return withContext(Dispatchers.IO) {
            try {
                // Validate employee data
                if (employee.employeeId.isBlank()) {
                    android.util.Log.e("TimeClockRepo", "Employee ID is blank")
                    return@withContext Result.failure(Exception("Invalid employee ID"))
                }
                if (employee.employeeName.isBlank()) {
                    android.util.Log.e("TimeClockRepo", "Employee name is blank")
                    return@withContext Result.failure(Exception("Invalid employee name"))
                }
                
                android.util.Log.d("TimeClockRepo", "Starting clock out for ${employee.employeeName}")
                val lastEvent = clockEventDao.getLastEvent(employee.employeeId)
                
                // Check if not clocked in
                if (lastEvent == null || lastEvent.eventType == EventType.CLOCK_OUT) {
                    return@withContext Result.failure(Exception("Must clock in before clocking out."))
                }
                
                val event = ClockEvent(
                    employeeId = employee.employeeId,
                    employeeName = employee.employeeName,
                    timestamp = System.currentTimeMillis(),
                    eventType = EventType.CLOCK_OUT
                )
                
                clockEventDao.insertEvent(event)
                syncQueueDao?.insert(SyncQueueItem(eventType = "clock-out", employeeId = employee.employeeId, timestamp = event.timestamp))
                android.util.Log.d("TimeClockRepo", "Clock OUT successful - Employee: ${employee.employeeName}")
                return@withContext Result.success(event)
            } catch (e: Exception) {
                android.util.Log.e("TimeClockRepo", "Clock OUT failed: ${e.message}", e)
                return@withContext Result.failure(Exception("Failed to clock out: ${e.message}"))
            }
        }
    }
    
    suspend fun getEventsBetween(startTime: Long, endTime: Long): List<ClockEvent> {
        return clockEventDao.getEventsBetween(startTime, endTime)
    }
    
    suspend fun deleteEvent(event: ClockEvent) {
        clockEventDao.deleteEvent(event)
    }
    
    suspend fun clearAllEvents() {
        clockEventDao.deleteAll()
    }
    
    // Get start and end of day in milliseconds
    fun getStartOfDay(timeInMillis: Long): Long {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = timeInMillis
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        return calendar.timeInMillis
    }
    
    fun getEndOfDay(timeInMillis: Long): Long {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = timeInMillis
        calendar.set(Calendar.HOUR_OF_DAY, 23)
        calendar.set(Calendar.MINUTE, 59)
        calendar.set(Calendar.SECOND, 59)
        calendar.set(Calendar.MILLISECOND, 999)
        return calendar.timeInMillis
    }
}
