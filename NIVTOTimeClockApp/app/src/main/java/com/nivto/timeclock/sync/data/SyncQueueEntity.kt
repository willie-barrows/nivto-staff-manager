package com.nivto.timeclock.sync.data

import androidx.room.*

/**
 * Entity representing a clock event pending sync to Windows desktop
 */
@Entity(tableName = "sync_queue")
data class SyncQueueItem(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    
    @ColumnInfo(name = "event_type")
    val eventType: String, // "clock-in" or "clock-out"
    
    @ColumnInfo(name = "employee_id")
    val employeeId: String,
    
    @ColumnInfo(name = "timestamp")
    val timestamp: Long,
    
    @ColumnInfo(name = "location")
    val location: String? = null,
    
    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),
    
    @ColumnInfo(name = "sync_attempts")
    val syncAttempts: Int = 0,
    
    @ColumnInfo(name = "last_attempt")
    val lastAttempt: Long? = null,
    
    @ColumnInfo(name = "is_synced")
    val isSynced: Boolean = false,
    
    @ColumnInfo(name = "sync_error")
    val syncError: String? = null
)

/**
 * DAO for sync queue operations
 */
@Dao
interface SyncQueueDao {
    
    @Query("SELECT * FROM sync_queue WHERE is_synced = 0 ORDER BY timestamp ASC")
    suspend fun getPendingItems(): List<SyncQueueItem>
    
    @Query("SELECT * FROM sync_queue WHERE is_synced = 0 ORDER BY timestamp ASC LIMIT :limit")
    suspend fun getPendingItemsLimited(limit: Int): List<SyncQueueItem>
    
    @Query("SELECT COUNT(*) FROM sync_queue WHERE is_synced = 0")
    suspend fun getPendingCount(): Int
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: SyncQueueItem): Long
    
    @Update
    suspend fun update(item: SyncQueueItem)
    
    @Delete
    suspend fun delete(item: SyncQueueItem)
    
    @Query("DELETE FROM sync_queue WHERE is_synced = 1 AND created_at < :beforeTimestamp")
    suspend fun deleteSyncedOlderThan(beforeTimestamp: Long)
    
    @Query("DELETE FROM sync_queue WHERE id = :id")
    suspend fun deleteById(id: Long)
    
    @Query("UPDATE sync_queue SET is_synced = 1 WHERE id = :id")
    suspend fun markAsSynced(id: Long)
    
    @Query("UPDATE sync_queue SET sync_attempts = sync_attempts + 1, last_attempt = :timestamp, sync_error = :error WHERE id = :id")
    suspend fun recordSyncAttempt(id: Long, timestamp: Long, error: String?)
    
    @Query("SELECT * FROM sync_queue ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecentItems(limit: Int): List<SyncQueueItem>
}
