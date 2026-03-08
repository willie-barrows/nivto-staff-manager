# Add project specific ProGuard rules here.
-keep class com.nivto.timeclock.data.entity.** { *; }
-keep class com.opencsv.** { *; }
-dontwarn com.opencsv.**
-keepattributes Signature
-keepattributes *Annotation*
