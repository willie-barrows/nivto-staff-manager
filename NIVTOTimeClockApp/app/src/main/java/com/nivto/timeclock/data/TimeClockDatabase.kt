package com.nivto.timeclock.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.nivto.timeclock.data.dao.ClockEventDao
import com.nivto.timeclock.data.dao.EmployeeDao
import com.nivto.timeclock.data.entity.ClockEvent
import com.nivto.timeclock.data.entity.Employee
import com.nivto.timeclock.sync.data.SyncQueueDao
import com.nivto.timeclock.sync.data.SyncQueueItem

@Database(
    entities = [Employee::class, ClockEvent::class, SyncQueueItem::class],
    version = 2,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class TimeClockDatabase : RoomDatabase() {
    abstract fun employeeDao(): EmployeeDao
    abstract fun clockEventDao(): ClockEventDao
    abstract fun syncQueueDao(): SyncQueueDao

    companion object {
        @Volatile
        private var INSTANCE: TimeClockDatabase? = null

        fun getDatabase(context: Context): TimeClockDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    TimeClockDatabase::class.java,
                    "nivto_timeclock_database"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
