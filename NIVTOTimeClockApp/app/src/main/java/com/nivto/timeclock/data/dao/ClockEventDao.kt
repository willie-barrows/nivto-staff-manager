package com.nivto.timeclock.data.dao

import androidx.room.*
import com.nivto.timeclock.data.entity.ClockEvent
import com.nivto.timeclock.data.entity.EventType
import kotlinx.coroutines.flow.Flow

@Dao
interface ClockEventDao {
    @Query("SELECT * FROM clock_events ORDER BY timestamp DESC")
    fun getAllEvents(): Flow<List<ClockEvent>>
    
    @Query("SELECT * FROM clock_events WHERE timestamp >= :startTime AND timestamp <= :endTime ORDER BY timestamp ASC")
    suspend fun getEventsBetween(startTime: Long, endTime: Long): List<ClockEvent>
    
    @Query("SELECT * FROM clock_events WHERE employeeId = :employeeId ORDER BY timestamp DESC LIMIT 1")
    suspend fun getLastEvent(employeeId: String): ClockEvent?
    
    @Query("SELECT * FROM clock_events WHERE employeeId = :employeeId AND timestamp >= :startOfDay AND timestamp <= :endOfDay ORDER BY timestamp ASC")
    suspend fun getEventsForDay(employeeId: String, startOfDay: Long, endOfDay: Long): List<ClockEvent>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvent(event: ClockEvent): Long
    
    @Delete
    suspend fun deleteEvent(event: ClockEvent)
    
    @Query("DELETE FROM clock_events")
    suspend fun deleteAll()
    
    @Query("SELECT * FROM clock_events WHERE eventType = :eventType AND timestamp >= :startTime")
    suspend fun getUnpairedEvents(eventType: EventType, startTime: Long): List<ClockEvent>
}
