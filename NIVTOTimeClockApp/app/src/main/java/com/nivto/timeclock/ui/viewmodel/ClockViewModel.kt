package com.nivto.timeclock.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.nivto.timeclock.data.entity.ClockEvent
import com.nivto.timeclock.data.entity.Employee
import com.nivto.timeclock.data.repository.TimeClockRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class ClockViewModel(private val repository: TimeClockRepository) : ViewModel() {
    
    private val _uiState = MutableStateFlow<ClockUiState>(ClockUiState.Idle)
    val uiState: StateFlow<ClockUiState> = _uiState.asStateFlow()
    
    private val _enteredDigits = MutableStateFlow("")
    val enteredDigits: StateFlow<String> = _enteredDigits.asStateFlow()
    
    private fun updateUiState(newState: ClockUiState) {
        try {
            android.util.Log.d("ClockViewModel", "Updating UI state to: $newState")
            _uiState.value = newState
        } catch (e: Exception) {
            android.util.Log.e("ClockViewModel", "Error updating UI state: ${e.message}", e)
        }
    }
    
    fun onDigitPressed(digit: String) {
        try {
            if (_enteredDigits.value.length < 13) {
                _enteredDigits.value += digit
            }
        } catch (e: Exception) {
            android.util.Log.e("ClockViewModel", "Error in onDigitPressed: ${e.message}", e)
        }
    }
    
    fun onBackspace() {
        try {
            if (_enteredDigits.value.isNotEmpty()) {
                _enteredDigits.value = _enteredDigits.value.dropLast(1)
            }
        } catch (e: Exception) {
            android.util.Log.e("ClockViewModel", "Error in onBackspace: ${e.message}", e)
        }
    }
    
    fun onClear() {
        try {
            _enteredDigits.value = ""
            _uiState.value = ClockUiState.Idle
        } catch (e: Exception) {
            android.util.Log.e("ClockViewModel", "Error in onClear: ${e.message}", e)
        }
    }
    
    fun clockIn() {
        android.util.Log.d("ClockViewModel", "clockIn() called, entered digits: '${_enteredDigits.value}'")
        
        if (_enteredDigits.value.isEmpty()) {
            android.util.Log.w("ClockViewModel", "No digits entered")
            _uiState.value = ClockUiState.Error("Please enter your Employee ID or ID Number")
            return
        }
        
        viewModelScope.launch {
            try {
                _uiState.value = ClockUiState.Loading
                android.util.Log.d("ClockViewModel", "Starting clock in for digits: ${_enteredDigits.value}")
                
                val employees = try {
                    val result = repository.findEmployeesByIdInput(_enteredDigits.value)
                    android.util.Log.d("ClockViewModel", "Repository returned ${result.size} employees")
                    result
                } catch (e: Exception) {
                    android.util.Log.e("ClockViewModel", "Error finding employees: ${e.message}", e)
                    val errorMsg = e.message ?: "Unable to find employees"
                    _uiState.value = ClockUiState.Error("Database error: $errorMsg")
                    return@launch
                }
                
                android.util.Log.d("ClockViewModel", "Found ${employees.size} employees")
                
                // Validate employee data
                val validEmployees = employees.filter { emp ->
                    val isValid = emp.employeeId.isNotBlank() && emp.employeeName.isNotBlank()
                    if (!isValid) {
                        android.util.Log.w("ClockViewModel", "Invalid employee: ID='${emp.employeeId}' Name='${emp.employeeName}'")
                    }
                    isValid
                }
                
                if (validEmployees.size < employees.size) {
                    android.util.Log.w("ClockViewModel", "Filtered out ${employees.size - validEmployees.size} invalid employees")
                }
                
                when {
                    validEmployees.isEmpty() -> {
                        android.util.Log.w("ClockViewModel", "No valid employees found")
                        _uiState.value = ClockUiState.Error("No employee found with those digits. Please check with management.")
                    }
                    validEmployees.size == 1 -> {
                        // Single match - proceed with clock in
                        val employee = validEmployees[0]
                        android.util.Log.d("ClockViewModel", "Processing clock in for: ${employee.employeeName} (ID: ${employee.employeeId})")
                        
                        val result = try {
                            val res = repository.clockIn(employee)
                            android.util.Log.d("ClockViewModel", "clockIn returned: success=${res.isSuccess}")
                            res
                        } catch (e: Exception) {
                            android.util.Log.e("ClockViewModel", "Exception calling clockIn: ${e.message}", e)
                            Result.failure(e)
                        }
                        
                        result.fold(
                            onSuccess = { event ->
                                android.util.Log.d("ClockViewModel", "Clock in success for ${employee.employeeName}, timestamp=${event.timestamp}")
                                _uiState.value = ClockUiState.Success(
                                    message = "Clocked In",
                                    employeeName = employee.employeeName,
                                    timestamp = event.timestamp
                                )
                            },
                            onFailure = { e ->
                                android.util.Log.e("ClockViewModel", "Clock in failed: ${e.message}", e)
                                _uiState.value = ClockUiState.Error(e.message ?: "Failed to clock in")
                            }
                        )
                    }
                    else -> {
                        // Multiple matches - show selection
                        android.util.Log.d("ClockViewModel", "Multiple matches (${validEmployees.size}), showing selection")
                        _uiState.value = ClockUiState.MultipleMatches(validEmployees, isClockIn = true)
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("ClockViewModel", "Clock in error: ${e.message}", e)
                e.printStackTrace()
                val errorMsg = e.message ?: "Unknown error"
                _uiState.value = ClockUiState.Error("An error occurred: $errorMsg")
            }
        }
    }
    
    fun clockOut() {
        android.util.Log.d("ClockViewModel", "clockOut() called, entered digits: '${_enteredDigits.value}'")
        
        if (_enteredDigits.value.isEmpty()) {
android.util.Log.w("ClockViewModel", "No digits entered")
            _uiState.value = ClockUiState.Error("Please enter your Employee ID or ID Number")
            return
        }
        
        viewModelScope.launch {
            try {
                _uiState.value = ClockUiState.Loading
                android.util.Log.d("ClockViewModel", "Starting clock out for digits: ${_enteredDigits.value}")
                
                val employees = try {
                    val result = repository.findEmployeesByIdInput(_enteredDigits.value)
                    android.util.Log.d("ClockViewModel", "Repository returned ${result.size} employees")
                    result
                } catch (e: Exception) {
                    android.util.Log.e("ClockViewModel", "Error finding employees: ${e.message}", e)
                    val errorMsg2 = e.message ?: "Unable to find employees"
                    _uiState.value = ClockUiState.Error("Database error: $errorMsg2")
                    return@launch
                }
                
                android.util.Log.d("ClockViewModel", "Found ${employees.size} employees")
                
                // Validate employee data
                val validEmployees = employees.filter { emp ->
                    val isValid = emp.employeeId.isNotBlank() && emp.employeeName.isNotBlank()
                    if (!isValid) {
                        android.util.Log.w("ClockViewModel", "Invalid employee: ID='${emp.employeeId}' Name='${emp.employeeName}'")
                    }
                    isValid
                }
                
                if (validEmployees.size < employees.size) {
                    android.util.Log.w("ClockViewModel", "Filtered out ${employees.size - validEmployees.size} invalid employees")
                }
                
                when {
                    validEmployees.isEmpty() -> {
                        android.util.Log.w("ClockViewModel", "No valid employees found")
                        _uiState.value = ClockUiState.Error("No employee found with those digits. Please check with management.")
                    }
                    validEmployees.size == 1 -> {
                        // Single match - proceed with clock out
                        val employee = validEmployees[0]
                        android.util.Log.d("ClockViewModel", "Processing clock out for: ${employee.employeeName} (ID: ${employee.employeeId})")
                        
                        val result = try {
                            val res = repository.clockOut(employee)
                            android.util.Log.d("ClockViewModel", "clockOut returned: success=${res.isSuccess}")
                            res
                        } catch (e: Exception) {
                            android.util.Log.e("ClockViewModel", "Exception calling clockOut: ${e.message}", e)
                            Result.failure(e)
                        }
                        
                        result.fold(
                            onSuccess = { event ->
                                android.util.Log.d("ClockViewModel", "Clock out success for ${employee.employeeName}, timestamp=${event.timestamp}")
                                _uiState.value = ClockUiState.Success(
                                    message = "Clocked Out",
                                    employeeName = employee.employeeName,
                                    timestamp = event.timestamp
                                )
                            },
                            onFailure = { e ->
                                android.util.Log.e("ClockViewModel", "Clock out failed: ${e.message}", e)
                                _uiState.value = ClockUiState.Error(e.message ?: "Failed to clock out")
                            }
                        )
                    }
                    else -> {
                        // Multiple matches - show selection
                        android.util.Log.d("ClockViewModel", "Multiple matches (${validEmployees.size}), showing selection")
                        _uiState.value = ClockUiState.MultipleMatches(validEmployees, isClockIn = false)
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("ClockViewModel", "Clock out error: ${e.message}", e)
                e.printStackTrace()
                val errorMsg2 = e.message ?: "Unknown error"
                _uiState.value = ClockUiState.Error("An error occurred: $errorMsg2")
            }
        }
    }
    
    fun selectEmployee(employee: Employee, isClockIn: Boolean) {
        viewModelScope.launch {
            try {
                if (employee.employeeId.isBlank() || employee.employeeName.isBlank()) {
                    android.util.Log.e("ClockViewModel", "Invalid employee data: ID='${employee.employeeId}' Name='${employee.employeeName}'")
                    _uiState.value = ClockUiState.Error("Invalid employee data. Please contact management.")
                    return@launch
                }
                
                _uiState.value = ClockUiState.Loading
                android.util.Log.d("ClockViewModel", "Selecting employee: ${employee.employeeName} (ID: ${employee.employeeId}), Clock in: $isClockIn")
                
                val result = try {
                    if (isClockIn) {
                        repository.clockIn(employee)
                    } else {
                        repository.clockOut(employee)
                    }
                } catch (e: Exception) {
                    android.util.Log.e("ClockViewModel", "Exception during clock operation: ${e.message}", e)
                    Result.failure(Exception("Operation failed: ${e.message}"))
                }
                
                result.fold(
                    onSuccess = { event ->
                        android.util.Log.d("ClockViewModel", "Operation successful for ${employee.employeeName}")
                        _uiState.value = ClockUiState.Success(
                            message = if (isClockIn) "Clocked In" else "Clocked Out",
                            employeeName = employee.employeeName,
                            timestamp = event.timestamp
                        )
                    },
                    onFailure = { e ->
                        android.util.Log.e("ClockViewModel", "Operation failed: ${e.message}", e)
                        _uiState.value = ClockUiState.Error(e.message ?: "Operation failed")
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("ClockViewModel", "Select employee error: ${e.message}", e)
                val errorMsg = e.message ?: "Unknown error"
                _uiState.value = ClockUiState.Error("An error occurred: $errorMsg")
            }
        }
    }
}

sealed class ClockUiState {
    object Idle : ClockUiState()
    object Loading : ClockUiState()
    data class Success(
        val message: String,
        val employeeName: String,
        val timestamp: Long
    ) : ClockUiState()
    data class Error(val message: String) : ClockUiState()
    data class MultipleMatches(
        val employees: List<Employee>,
        val isClockIn: Boolean
    ) : ClockUiState()
}

class ClockViewModelFactory(
    private val repository: TimeClockRepository
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ClockViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return ClockViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
