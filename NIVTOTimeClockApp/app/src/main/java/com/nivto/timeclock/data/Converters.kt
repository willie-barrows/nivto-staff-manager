package com.nivto.timeclock.data

import androidx.room.TypeConverter
import com.nivto.timeclock.data.entity.EventType

class Converters {
    @TypeConverter
    fun fromEventType(value: EventType): String {
        return value.name
    }

    @TypeConverter
    fun toEventType(value: String): EventType {
        return EventType.valueOf(value)
    }
}
