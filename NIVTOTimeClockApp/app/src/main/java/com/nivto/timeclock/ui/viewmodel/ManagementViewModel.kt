package com.nivto.timeclock.ui.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.nivto.timeclock.data.entity.ClockEvent
import com.nivto.timeclock.data.repository.TimeClockRepository
import com.nivto.timeclock.util.CsvHandler
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import java.util.*

class ManagementViewModel(
    private val repository: TimeClockRepository,
    private val csvHandler: CsvHandler
) : ViewModel() {
    
    private val _staffCount = MutableStateFlow(0)
    val staffCount: StateFlow<Int> = _staffCount.asStateFlow()
    
    private val _importStatus = MutableStateFlow<ImportStatus>(ImportStatus.Idle)
    val importStatus: StateFlow<ImportStatus> = _importStatus.asStateFlow()
    
    private val _exportStatus = MutableStateFlow<ExportStatus>(ExportStatus.Idle)
    val exportStatus: StateFlow<ExportStatus> = _exportStatus.asStateFlow()
    
    private val _events = MutableStateFlow<List<ClockEvent>>(emptyList())
    val events: StateFlow<List<ClockEvent>> = _events.asStateFlow()
    
    init {
        loadStaffCount()
        loadEvents()
    }
    
    private fun loadStaffCount() {
        viewModelScope.launch {
            _staffCount.value = repository.getActiveEmployeeCount()
        }
    }
    
    private fun loadEvents() {
        viewModelScope.launch {
            repository.getAllEvents().collect { eventList ->
                _events.value = eventList
            }
        }
    }
    
    fun importStaff(uri: Uri) {
        viewModelScope.launch {
            try {
                android.util.Log.i("ManagementViewModel", "Starting import process")
                _importStatus.value = ImportStatus.Loading
                
                val result = csvHandler.importStaff(uri)
                result.fold(
                    onSuccess = { employees ->
                        try {
                            android.util.Log.i("ManagementViewModel", "CSV parsed successfully, ${employees.size} employees found")
                            
                            // Clear existing employees
                            android.util.Log.d("ManagementViewModel", "Clearing existing employees")
                            repository.clearEmployees()
                            
                            // Insert new employees
                            android.util.Log.d("ManagementViewModel", "Inserting ${employees.size} new employees")
                            repository.insertEmployees(employees)
                            
                            android.util.Log.i("ManagementViewModel", "Database operations successful")
                            
                            // Reload staff count
                            loadStaffCount()
                            
                            _importStatus.value = ImportStatus.Success("Successfully imported ${employees.size} employees")
                            android.util.Log.i("ManagementViewModel", "Import complete")
                        } catch (e: Exception) {
                            android.util.Log.e("ManagementViewModel", "Database error during import: ${e.message}", e)
                            _importStatus.value = ImportStatus.Error("Database error: ${e.message ?: "Failed to save employees"}")
                        }
                    },
                    onFailure = { e ->
                        android.util.Log.e("ManagementViewModel", "CSV parsing error: ${e.message}", e)
                        _importStatus.value = ImportStatus.Error(e.message ?: "Import failed")
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("ManagementViewModel", "Unexpected error during import: ${e.message}", e)
                _importStatus.value = ImportStatus.Error("Unexpected error: ${e.message ?: "Unknown error"}")
            }
        }
    }
    
    fun exportAttendance(
        startDate: Long,
        endDate: Long,
        context: Context
    ) {
        viewModelScope.launch {
            _exportStatus.value = ExportStatus.Loading
            
            try {
                val events = repository.getEventsBetween(startDate, endDate)
                
                if (events.isEmpty()) {
                    _exportStatus.value = ExportStatus.Error("No attendance records found for selected date range")
                    return@launch
                }
                
                val fileName = csvHandler.getExportFileName(startDate, endDate)
                val outputFile = File(context.cacheDir, fileName)
                
                val result = csvHandler.exportAttendance(events, startDate, endDate, outputFile)
                result.fold(
                    onSuccess = { file ->
                        _exportStatus.value = ExportStatus.Success(file)
                    },
                    onFailure = { e ->
                        _exportStatus.value = ExportStatus.Error(e.message ?: "Export failed")
                    }
                )
            } catch (e: Exception) {
                _exportStatus.value = ExportStatus.Error(e.message ?: "Export failed")
            }
        }
    }
    
    fun resetImportStatus() {
        _importStatus.value = ImportStatus.Idle
    }
    
    fun resetExportStatus() {
        _exportStatus.value = ExportStatus.Idle
    }
    
    fun deleteEvent(event: ClockEvent) {
        viewModelScope.launch {
            repository.deleteEvent(event)
        }
    }
    
    fun clearAllData() {
        viewModelScope.launch {
            repository.clearAllEvents()
            repository.clearEmployees()
            loadStaffCount()
        }
    }
}

sealed class ImportStatus {
    object Idle : ImportStatus()
    object Loading : ImportStatus()
    data class Success(val message: String) : ImportStatus()
    data class Error(val message: String) : ImportStatus()
}

sealed class ExportStatus {
    object Idle : ExportStatus()
    object Loading : ExportStatus()
    data class Success(val file: File) : ExportStatus()
    data class Error(val message: String) : ExportStatus()
}

class ManagementViewModelFactory(
    private val repository: TimeClockRepository,
    private val csvHandler: CsvHandler
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ManagementViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return ManagementViewModel(repository, csvHandler) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
