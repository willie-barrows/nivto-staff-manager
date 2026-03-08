package com.nivto.timeclock.data.dao

import androidx.room.*
import com.nivto.timeclock.data.entity.Employee
import kotlinx.coroutines.flow.Flow

@Dao
interface EmployeeDao {
    @Query("SELECT * FROM employees WHERE active = 1")
    fun getAllActiveEmployees(): Flow<List<Employee>>
    
    @Query("SELECT * FROM employees WHERE (idNumber LIKE :idPrefix || '%' OR employeeId LIKE :idPrefix || '%') AND active = 1")
    suspend fun findEmployeesByIdPrefix(idPrefix: String): List<Employee>
    
    @Query("SELECT * FROM employees WHERE (employeeId = :input OR idNumber LIKE :input || '%' OR employeeId LIKE :input || '%') AND active = 1")
    suspend fun findEmployeesByIdInput(input: String): List<Employee>
    
    @Query("SELECT * FROM employees WHERE employeeId = :employeeId")
    suspend fun getEmployee(employeeId: String): Employee?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEmployee(employee: Employee)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEmployees(employees: List<Employee>)
    
    @Query("DELETE FROM employees")
    suspend fun deleteAll()
    
    @Query("SELECT COUNT(*) FROM employees WHERE active = 1")
    suspend fun getActiveEmployeeCount(): Int
}
