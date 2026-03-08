package com.nivto.timeclock.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "employees")
data class Employee(
    @PrimaryKey
    val employeeId: String,
    val employeeName: String,
    val position: String,
    val idNumber: String, // 13-digit South African ID number
    val active: Boolean = true
)
