package com.nivto.timeclock.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "clock_events")
data class ClockEvent(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val employeeId: String,
    val employeeName: String,
    val timestamp: Long, // Unix timestamp in milliseconds
    val eventType: EventType // CLOCK_IN or CLOCK_OUT
)

enum class EventType {
    CLOCK_IN,
    CLOCK_OUT
}
