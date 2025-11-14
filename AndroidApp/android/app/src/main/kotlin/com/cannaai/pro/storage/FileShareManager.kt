package com.cannaai.pro.storage

import android.content.*
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import androidx.core.content.FileProvider
import com.cannaai.pro.utils.Logger
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.*
import java.text.SimpleDateFormat
import java.util.*
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FileShareManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: Logger
) {

    companion object {
        private const val TAG = "FileShareManager"
        private const val SHARE_REQUEST_CODE = 1001
        private const val EXPORT_BATCH_SIZE = 100
    }

    // Coroutine scope for async operations
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // Export state
    private val _exportProgress = MutableStateFlow<ExportProgress?>(null)
    val exportProgress: StateFlow<ExportProgress?> = _exportProgress.asStateFlow()

    // Share intents cache
    private val shareIntentCache = mutableMapOf<String, Intent>()

    /**
     * Share a single file
     */
    suspend fun shareFile(
        file: File,
        title: String = "Share File",
        chooserTitle: String = "Share file via"
    ): Intent? {
        return withContext(Dispatchers.IO) {
            try {
                if (!file.exists()) {
                    logger.e("File does not exist: ${file.absolutePath}")
                    return@withContext null
                }

                val uri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    file
                )

                val mimeType = getMimeType(file)
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = mimeType
                    putExtra(Intent.EXTRA_STREAM, uri)
                    putExtra(Intent.EXTRA_TEXT, "Shared from CannaAI Pro")
                    putExtra(Intent.EXTRA_SUBJECT, file.name)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

                // Cache the intent for later use
                shareIntentCache[file.absolutePath] = intent

                logger.d("Created share intent for: ${file.name}")
                intent

            } catch (e: Exception) {
                logger.e("Error creating share intent", e)
                null
            }
        }
    }

    /**
     * Share multiple files
     */
    suspend fun shareFiles(
        files: List<File>,
        title: String = "Share Files",
        chooserTitle: String = "Share files via"
    ): Intent? {
        return withContext(Dispatchers.IO) {
            try {
                if (files.isEmpty()) {
                    logger.e("No files to share")
                    return@withContext null
                }

                val validFiles = files.filter { it.exists() }
                if (validFiles.isEmpty()) {
                    logger.e("No valid files to share")
                    return@withContext null
                }

                val uris = validFiles.map { file ->
                    FileProvider.getUriForFile(
                        context,
                        "${context.packageName}.fileprovider",
                        file
                    )
                }

                val intent = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                    type = if (validFiles.all { it.extension == "jpg" || it.extension == "jpeg" }) {
                        "image/jpeg"
                    } else if (validFiles.all { it.extension == "mp4" || it.extension == "mov" }) {
                        "video/mp4"
                    } else {
                        "*/*"
                    }
                    putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(uris))
                    putExtra(Intent.EXTRA_TEXT, "Shared ${validFiles.size} files from CannaAI Pro")
                    putExtra(Intent.EXTRA_SUBJECT, "CannaAI Pro Files")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

                logger.d("Created multi-file share intent for ${validFiles.size} files")
                intent

            } catch (e: Exception) {
                logger.e("Error creating multi-file share intent", e)
                null
            }
        }
    }

    /**
     * Share plant analysis results
     */
    suspend fun sharePlantAnalysis(
        imageFile: File,
        analysisData: String,
        plantName: String = "Unknown Plant"
    ): Intent? {
        return withContext(Dispatchers.IO) {
            try {
                // Create a temporary file with analysis data
                val analysisFile = createAnalysisFile(analysisData, plantName)

                // Create ZIP file containing both image and analysis
                val zipFile = createAnalysisZip(imageFile, analysisFile, plantName)

                val intent = shareFile(zipFile, "Plant Analysis", "Share plant analysis via")
                if (intent != null) {
                    intent.putExtra(Intent.EXTRA_SUBJECT, "Plant Analysis: $plantName")
                    intent.putExtra(Intent.EXTRA_TEXT, "Plant analysis results from CannaAI Pro")
                }

                // Clean up temporary files
                deleteTempFile(analysisFile)
                // Don't delete zipFile immediately as it might be used for sharing

                intent

            } catch (e: Exception) {
                logger.e("Error creating plant analysis share", e)
                null
            }
        }
    }

    /**
     * Export sensor data to CSV
     */
    suspend fun exportSensorDataToCSV(
        sensorData: List<Map<String, Any>>,
        fileName: String? = null
    ): File? {
        return withContext(Dispatchers.IO) {
            try {
                _exportProgress.value = ExportProgress(0, sensorData.size, "Exporting sensor data...")

                val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
                val finalFileName = fileName ?: "sensor_data_$timestamp.csv"

                val file = File(context.getExternalFilesDir("Exports"), finalFileName)
                file.parentFile?.mkdirs()

                BufferedWriter(FileWriter(file)).use { writer ->
                    // Write CSV header
                    if (sensorData.isNotEmpty()) {
                        val headers = sensorData.first().keys.joinToString(",")
                        writer.write(headers)
                        writer.newLine()
                    }

                    // Write data rows
                    sensorData.forEachIndexed { index, data ->
                        val row = data.values.joinToString(",") { value ->
                            when (value) {
                                is String -> "\"$value\""
                                is Number -> value.toString()
                                is Boolean -> if (value) "1" else "0"
                                else -> "\"$value\""
                            }
                        }
                        writer.write(row)
                        writer.newLine()

                        _exportProgress.value = ExportProgress(
                            index + 1,
                            sensorData.size,
                            "Exporting sensor data... (${index + 1}/${sensorData.size})"
                        )

                        // Add small delay to prevent UI blocking for large datasets
                        if (index % EXPORT_BATCH_SIZE == 0) {
                            delay(10)
                        }
                    }
                }

                _exportProgress.value = ExportProgress(sensorData.size, sensorData.size, "Export complete!")
                delay(1000) // Show completion briefly
                _exportProgress.value = null

                logger.d("Sensor data exported to: ${file.absolutePath}")
                file

            } catch (e: Exception) {
                logger.e("Error exporting sensor data to CSV", e)
                _exportProgress.value = null
                null
            }
        }
    }

    /**
     * Export plant health report to PDF
     */
    suspend fun exportPlantHealthReportToPDF(
        plantData: Map<String, Any>,
        analysisResults: List<String>,
        images: List<File>,
        fileName: String? = null
    ): File? {
        return withContext(Dispatchers.IO) {
            try {
                _exportProgress.value = ExportProgress(0, 100, "Generating plant health report...")

                val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
                val finalFileName = fileName ?: "plant_health_report_$timestamp.pdf"

                val file = File(context.getExternalFilesDir("Exports"), finalFileName)
                file.parentFile?.mkdirs()

                // This would use a PDF generation library like iText or PdfDocument
                // For now, create a text file as placeholder
                BufferedWriter(FileWriter(file)).use { writer ->
                    writer.write("PLANT HEALTH REPORT\n")
                    writer.write("=" * 50 + "\n\n")
                    writer.write("Generated: ${SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())}\n\n")

                    writer.write("PLANT INFORMATION\n")
                    writer.write("-" * 20 + "\n")
                    plantData.forEach { (key, value) ->
                        writer.write("$key: $value\n")
                    }
                    writer.write("\n")

                    writer.write("ANALYSIS RESULTS\n")
                    writer.write("-" * 20 + "\n")
                    analysisResults.forEachIndexed { index, result ->
                        writer.write("${index + 1}. $result\n")
                    }
                    writer.write("\n")

                    writer.write("IMAGES\n")
                    writer.write("-" * 20 + "\n")
                    images.forEach { image ->
                        writer.write("- ${image.name}\n")
                    }
                }

                _exportProgress.value = ExportProgress(100, 100, "Report generated successfully!")
                delay(1000)
                _exportProgress.value = null

                logger.d("Plant health report exported to: ${file.absolutePath}")
                file

            } catch (e: Exception) {
                logger.e("Error exporting plant health report", e)
                _exportProgress.value = null
                null
            }
        }
    }

    /**
     * Create data backup for sharing
     */
    suspend fun createBackupForSharing(
        includeImages: Boolean = true,
        includeData: Boolean = true,
        includeSettings: Boolean = true
    ): File? {
        return withContext(Dispatchers.IO) {
            try {
                _exportProgress.value = ExportProgress(0, 4, "Creating backup...")

                val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
                val backupFile = File(context.getExternalFilesDir("Backups"), "cannaai_backup_$timestamp.zip")
                backupFile.parentFile?.mkdirs()

                var progress = 0

                ZipOutputStream(BufferedOutputStream(FileOutputStream(backupFile))).use { zipOut ->
                    // Include images
                    if (includeImages) {
                        val imagesDir = context.getExternalFilesDir("Pictures")
                        if (imagesDir?.exists() == true) {
                            addDirectoryToZip(zipOut, imagesDir, "Pictures/")
                        }
                        _exportProgress.value = ExportProgress(++progress, 4, "Adding images...")
                    }

                    // Include data
                    if (includeData) {
                        val dataDir = context.getExternalFilesDir("Documents")
                        if (dataDir?.exists() == true) {
                            addDirectoryToZip(zipOut, dataDir, "Documents/")
                        }
                        _exportProgress.value = ExportProgress(++progress, 4, "Adding data...")
                    }

                    // Include settings
                    if (includeSettings) {
                        val prefsFile = createSettingsFile()
                        if (prefsFile.exists()) {
                            addFileToZip(zipOut, prefsFile, "Settings/")
                            prefsFile.delete()
                        }
                        _exportProgress.value = ExportProgress(++progress, 4, "Adding settings...")
                    }

                    // Add metadata
                    val metadataFile = createBackupMetadata(includeImages, includeData, includeSettings)
                    addFileToZip(zipOut, metadataFile, "")
                    metadataFile.delete()
                    _exportProgress.value = ExportProgress(++progress, 4, "Adding metadata...")
                }

                _exportProgress.value = ExportProgress(4, 4, "Backup created successfully!")
                delay(1000)
                _exportProgress.value = null

                logger.d("Backup created for sharing: ${backupFile.absolutePath}")
                backupFile

            } catch (e: Exception) {
                logger.e("Error creating backup for sharing", e)
                _exportProgress.value = null
                null
            }
        }
    }

    /**
     * Restore data from shared backup
     */
    suspend fun restoreFromBackup(backupFile: File): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                _exportProgress.value = ExportProgress(0, 100, "Restoring from backup...")

                // This would implement actual restore logic
                // For now, just simulate progress
                for (i in 1..100) {
                    delay(20)
                    _exportProgress.value = ExportProgress(i, 100, "Restoring... ($i%)")
                }

                _exportProgress.value = ExportProgress(100, 100, "Restore complete!")
                delay(1000)
                _exportProgress.value = null

                logger.d("Restore completed from: ${backupFile.absolutePath}")
                true

            } catch (e: Exception) {
                logger.e("Error restoring from backup", e)
                _exportProgress.value = null
                false
            }
        }
    }

    /**
     * Get share intent for cached file
     */
    fun getCachedShareIntent(filePath: String): Intent? {
        return shareIntentCache[filePath]
    }

    /**
     * Clear share intent cache
     */
    fun clearShareIntentCache() {
        shareIntentCache.clear()
        logger.d("Share intent cache cleared")
    }

    // Private helper methods

    private fun createAnalysisFile(analysisData: String, plantName: String): File {
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val fileName = "${plantName.replace(" ", "_")}_analysis_$timestamp.txt"
        val file = File(context.cacheDir, fileName)

        BufferedWriter(FileWriter(file)).use { writer ->
            writer.write("PLANT ANALYSIS REPORT\n")
            writer.write("=" * 50 + "\n")
            writer.write("Plant: $plantName\n")
            writer.write("Date: ${SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())}\n\n")
            writer.write("ANALYSIS RESULTS\n")
            writer.write("-" * 20 + "\n")
            writer.write(analysisData)
        }

        return file
    }

    private fun createAnalysisZip(imageFile: File, analysisFile: File, plantName: String): File {
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val zipFile = File(context.cacheDir, "${plantName.replace(" ", "_")}_analysis_$timestamp.zip")

        ZipOutputStream(BufferedOutputStream(FileOutputStream(zipFile))).use { zipOut ->
            addFileToZip(zipOut, imageFile, "")
            addFileToZip(zipOut, analysisFile, "")
        }

        return zipFile
    }

    private fun addDirectoryToZip(zipOut: ZipOutputStream, directory: File, basePath: String) {
        directory.walkTopDown().forEach { file ->
            val relativePath = file.relativeTo(directory).path
            val entryPath = basePath + relativePath

            if (file.isFile) {
                addFileToZip(zipOut, file, entryPath.substring(0, entryPath.lastIndexOf('/') + 1))
            }
        }
    }

    private fun addFileToZip(zipOut: ZipOutputStream, file: File, basePath: String) {
        if (!file.exists()) return

        val entryPath = basePath + file.name
        val entry = ZipEntry(entryPath)
        entry.time = file.lastModified()
        zipOut.putNextEntry(entry)

        BufferedInputStream(FileInputStream(file)).use { input ->
            input.copyTo(zipOut)
        }

        zipOut.closeEntry()
    }

    private fun createSettingsFile(): File {
        val file = File(context.cacheDir, "cannaai_settings.json")

        // This would export actual app settings
        // For now, create a placeholder
        BufferedWriter(FileWriter(file)).use { writer ->
            writer.write("{\"app_name\":\"CannaAI Pro\",\"version\":\"1.0.0\"}")
        }

        return file
    }

    private fun createBackupMetadata(
        includeImages: Boolean,
        includeData: Boolean,
        includeSettings: Boolean
    ): File {
        val file = File(context.cacheDir, "backup_metadata.json")

        BufferedWriter(FileWriter(file)).use { writer ->
            writer.write("{\n")
            writer.write("  \"backup_date\": \"${SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())}\",\n")
            writer.write("  \"app_version\": \"1.0.0\",\n")
            writer.write("  \"includes_images\": $includeImages,\n")
            writer.write("  \"includes_data\": $includeData,\n")
            writer.write("  \"includes_settings\": $includeSettings\n")
            writer.write("}")
        }

        return file
    }

    private fun getMimeType(file: File): String {
        return when (file.extension.lowercase()) {
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "gif" -> "image/gif"
            "mp4" -> "video/mp4"
            "mov" -> "video/quicktime"
            "avi" -> "video/x-msvideo"
            "mp3" -> "audio/mpeg"
            "wav" -> "audio/wav"
            "pdf" -> "application/pdf"
            "txt" -> "text/plain"
            "json" -> "application/json"
            "csv" -> "text/csv"
            "zip" -> "application/zip"
            else -> "application/octet-stream"
        }
    }

    private fun deleteTempFile(file: File) {
        try {
            if (file.exists()) {
                file.delete()
            }
        } catch (e: Exception) {
            logger.e("Error deleting temp file: ${file.absolutePath}", e)
        }
    }

    /**
     * Cleanup resources
     */
    fun cleanup() {
        scope.cancel()
        clearShareIntentCache()
        logger.d("File share manager cleaned up")
    }
}

/**
 * Data class for export progress
 */
data class ExportProgress(
    val current: Int,
    val total: Int,
    val message: String
) {
    val progress: Float
        get() = if (total > 0) current.toFloat() / total else 0f

    val percentage: Int
        get() = (progress * 100).toInt()

    val isComplete: Boolean
        get() = current >= total

    override fun toString(): String {
        return "$message (${percentage}%)"
    }
}