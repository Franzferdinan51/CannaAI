package com.cannaai.pro.storage

import android.Manifest
import android.content.ContentResolver
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.cannaai.pro.utils.Logger
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import java.io.*
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FileManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: Logger
) {

    companion object {
        private const val TAG = "FileManager"

        // Storage permissions
        val STORAGE_PERMISSIONS = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(
                Manifest.permission.READ_MEDIA_IMAGES,
                Manifest.permission.READ_MEDIA_VIDEO,
                Manifest.permission.READ_MEDIA_AUDIO
            )
        } else {
            arrayOf(
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            )
        }

        // Directory constants
        const val APP_NAME = "CannaAI"
        const val IMAGES_DIR = "Pictures"
        const val VIDEOS_DIR = "Movies"
        const val DOCUMENTS_DIR = "Documents"
        const val CACHE_DIR = "Cache"
        const val TEMP_DIR = "Temp"
        const val EXPORT_DIR = "Exports"
        const val BACKUP_DIR = "Backups"
        const val LOGS_DIR = "Logs"

        // File size limits (in bytes)
        const val MAX_IMAGE_SIZE = 10 * 1024 * 1024L // 10MB
        const val MAX_VIDEO_SIZE = 100 * 1024 * 1024L // 100MB
        const val MAX_DOCUMENT_SIZE = 5 * 1024 * 1024L // 5MB

        // Cache limits
        const val MAX_CACHE_SIZE = 100 * 1024 * 1024L // 100MB
        const val MAX_IMAGE_CACHE_SIZE = 50 * 1024 * 1024L // 50MB
        const val MAX_THUMBNAIL_CACHE_SIZE = 20 * 1024 * 1024L // 20MB
    }

    // Directory references
    private val appInternalDir: File = context.filesDir
    private val appExternalDir: File? = context.getExternalFilesDir(null)
    private val appCacheDir: File = context.cacheDir
    private val appExternalCacheDir: File? = context.externalCacheDir

    // Coroutine scope for async operations
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    /**
     * Initialize storage directories
     */
    fun initializeStorage() {
        try {
            // Create necessary directories
            createDirectories()

            // Clean up old temporary files
            cleanupTempFiles()

            // Initialize cache
            initializeCache()

            logger.d("Storage initialized successfully")

        } catch (e: Exception) {
            logger.e("Error initializing storage", e)
        }
    }

    /**
     * Check if storage permissions are granted
     */
    fun hasStoragePermissions(): Boolean {
        return STORAGE_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Get available storage space
     */
    fun getAvailableStorageSpace(): StorageSpaceInfo {
        val internalSpace = getDirectorySpace(appInternalDir)
        val externalSpace = appExternalDir?.let { getDirectorySpace(it) }
        val cacheSpace = getDirectorySpace(appCacheDir)
        val externalCacheSpace = appExternalCacheDir?.let { getDirectorySpace(it) }

        return StorageSpaceInfo(
            internalSpace = internalSpace,
            externalSpace = externalSpace,
            cacheSpace = cacheSpace,
            externalCacheSpace = externalCacheSpace,
            totalAvailable = internalSpace.available + (externalSpace?.available ?: 0L)
        )
    }

    /**
     * Create a new image file
     */
    suspend fun createImageFile(subDirectory: String = IMAGES_DIR): File {
        return withContext(Dispatchers.IO) {
            val directory = getStorageDir(subDirectory)
            if (!directory.exists()) {
                directory.mkdirs()
            }

            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val fileName = "IMG_$timestamp.jpg"
            File(directory, fileName)
        }
    }

    /**
     * Create a new video file
     */
    suspend fun createVideoFile(subDirectory: String = VIDEOS_DIR): File {
        return withContext(Dispatchers.IO) {
            val directory = getStorageDir(subDirectory)
            if (!directory.exists()) {
                directory.mkdirs()
            }

            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val fileName = "VID_$timestamp.mp4"
            File(directory, fileName)
        }
    }

    /**
     * Create a new document file
     */
    suspend fun createDocumentFile(
        fileName: String,
        subDirectory: String = DOCUMENTS_DIR,
        extension: String = "txt"
    ): File {
        return withContext(Dispatchers.IO) {
            val directory = getStorageDir(subDirectory)
            if (!directory.exists()) {
                directory.mkdirs()
            }

            val finalFileName = if (!fileName.endsWith(".$extension")) {
                "$fileName.$extension"
            } else {
                fileName
            }

            File(directory, finalFileName)
        }
    }

    /**
     * Save bitmap to file
     */
    suspend fun saveBitmap(
        bitmap: Bitmap,
        file: File,
        format: Bitmap.CompressFormat = Bitmap.CompressFormat.JPEG,
        quality: Int = 90
    ): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                file.parentFile?.mkdirs()
                FileOutputStream(file).use { out ->
                    bitmap.compress(format, quality, out)
                }
                logger.d("Bitmap saved to: ${file.absolutePath}")
                true
            } catch (e: Exception) {
                logger.e("Error saving bitmap", e)
                false
            }
        }
    }

    /**
     * Load bitmap from file
     */
    suspend fun loadBitmap(file: File, maxWidth: Int = 2048, maxHeight: Int = 2048): Bitmap? {
        return withContext(Dispatchers.IO) {
            try {
                if (!file.exists()) {
                    logger.w("File does not exist: ${file.absolutePath}")
                    return@withContext null
                }

                // First decode with inJustDecodeBounds=true to check dimensions
                val options = BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
                BitmapFactory.decodeFile(file.absolutePath, options)

                // Calculate inSampleSize
                options.inSampleSize = calculateInSampleSize(options, maxWidth, maxHeight)
                options.inJustDecodeBounds = false

                val bitmap = BitmapFactory.decodeFile(file.absolutePath, options)
                logger.d("Bitmap loaded from: ${file.absolutePath}")
                bitmap

            } catch (e: Exception) {
                logger.e("Error loading bitmap", e)
                null
            }
        }
    }

    /**
     * Copy file from source to destination
     */
    suspend fun copyFile(source: File, destination: File): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                destination.parentFile?.mkdirs()
                source.inputStream().use { input ->
                    destination.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
                logger.d("File copied from ${source.absolutePath} to ${destination.absolutePath}")
                true
            } catch (e: Exception) {
                logger.e("Error copying file", e)
                false
            }
        }
    }

    /**
     * Move file from source to destination
     */
    suspend fun moveFile(source: File, destination: File): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                if (copyFile(source, destination)) {
                    source.delete()
                    logger.d("File moved from ${source.absolutePath} to ${destination.absolutePath}")
                    true
                } else {
                    false
                }
            } catch (e: Exception) {
                logger.e("Error moving file", e)
                false
            }
        }
    }

    /**
     * Delete file or directory
     */
    suspend fun deleteFile(file: File): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                if (file.isDirectory) {
                    file.deleteRecursively()
                } else {
                    file.delete()
                }
                logger.d("File deleted: ${file.absolutePath}")
                true
            } catch (e: Exception) {
                logger.e("Error deleting file", e)
                false
            }
        }
    }

    /**
     * Get file size
     */
    fun getFileSize(file: File): Long {
        return if (file.isDirectory) {
            file.walkTopDown().sumOf { it.length() }
        } else {
            file.length()
        }
    }

    /**
     * Get file information
     */
    fun getFileInfo(file: File): FileInfo {
        return FileInfo(
            name = file.name,
            path = file.absolutePath,
            size = getFileSize(file),
            lastModified = file.lastModified(),
            isDirectory = file.isDirectory,
            extension = file.extension,
            mimeType = getMimeType(file)
        )
    }

    /**
     * Add image to Android gallery
     */
    suspend fun addImageToGallery(imageFile: File): Uri? {
        return withContext(Dispatchers.IO) {
            try {
                val contentValues = ContentValues().apply {
                    put(MediaStore.Images.Media.DISPLAY_NAME, imageFile.name)
                    put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                    put(MediaStore.Images.Media.RELATIVE_PATH, "$APP_NAME/$IMAGES_DIR")
                    put(MediaStore.Images.Media.DATE_ADDED, System.currentTimeMillis())
                    put(MediaStore.Images.Media.DATE_TAKEN, imageFile.lastModified())
                }

                val uri = context.contentResolver.insert(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    contentValues
                )

                uri?.let {
                    context.contentResolver.openOutputStream(it)?.use { output ->
                        FileInputStream(imageFile).use { input ->
                            input.copyTo(output)
                        }
                    }
                }

                logger.d("Image added to gallery: ${imageFile.name}")
                uri

            } catch (e: Exception) {
                logger.e("Error adding image to gallery", e)
                null
            }
        }
    }

    /**
     * Add video to Android gallery
     */
    suspend fun addVideoToGallery(videoFile: File): Uri? {
        return withContext(Dispatchers.IO) {
            try {
                val contentValues = ContentValues().apply {
                    put(MediaStore.Video.Media.DISPLAY_NAME, videoFile.name)
                    put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
                    put(MediaStore.Video.Media.RELATIVE_PATH, "$APP_NAME/$VIDEOS_DIR")
                    put(MediaStore.Video.Media.DATE_ADDED, System.currentTimeMillis())
                    put(MediaStore.Video.Media.DATE_TAKEN, videoFile.lastModified())
                    put(MediaStore.Video.Media.DURATION, getVideoDuration(videoFile))
                }

                val uri = context.contentResolver.insert(
                    MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                    contentValues
                )

                uri?.let {
                    context.contentResolver.openOutputStream(it)?.use { output ->
                        FileInputStream(videoFile).use { input ->
                            input.copyTo(output)
                        }
                    }
                }

                logger.d("Video added to gallery: ${videoFile.name}")
                uri

            } catch (e: Exception) {
                logger.e("Error adding video to gallery", e)
                null
            }
        }
    }

    /**
     * Get URI for file sharing
     */
    fun getFileUri(file: File): Uri {
        return FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
    }

    /**
     * Get files in directory
     */
    suspend fun getFilesInDirectory(
        directory: String,
        extension: String? = null,
        limit: Int = Int.MAX_VALUE
    ): List<FileInfo> {
        return withContext(Dispatchers.IO) {
            try {
                val dir = getStorageDir(directory)
                if (!dir.exists()) {
                    return@withContext emptyList()
                }

                val files = dir.listFiles { file ->
                    file.isFile && (extension == null || file.extension.equals(extension, true))
                }?.orEmpty()
                    .sortedByDescending { it.lastModified() }
                    .take(limit)
                    .map { getFileInfo(it) }

                files

            } catch (e: Exception) {
                logger.e("Error getting files in directory: $directory", e)
                emptyList()
            }
        }
    }

    /**
     * Clean up cache files
     */
    suspend fun cleanupCache(maxAgeDays: Int = 7): Int {
        return withContext(Dispatchers.IO) {
            var deletedCount = 0

            try {
                val cutoffTime = System.currentTimeMillis() - (maxAgeDays * 24 * 60 * 60 * 1000L)

                // Clean internal cache
                appCacheDir.listFiles()?.forEach { file ->
                    if (file.lastModified() < cutoffTime) {
                        if (deleteFile(file)) {
                            deletedCount++
                        }
                    }
                }

                // Clean external cache
                appExternalCacheDir?.listFiles()?.forEach { file ->
                    if (file.lastModified() < cutoffTime) {
                        if (deleteFile(file)) {
                            deletedCount++
                        }
                    }
                }

                logger.d("Cleaned up $deletedCount cache files")
                deletedCount

            } catch (e: Exception) {
                logger.e("Error cleaning up cache", e)
                0
            }
        }
    }

    /**
     * Clean up image cache
     */
    suspend fun cleanImageCache(maxAgeDays: Int = 7, maxSizeMB: Int = 100): Int {
        return withContext(Dispatchers.IO) {
            var deletedCount = 0
            var totalSize = 0L

            try {
                val imageCacheDir = File(appCacheDir, "images")
                if (!imageCacheDir.exists()) {
                    return@withContext 0
                }

                val files = imageCacheDir.listFiles() ?: return@withContext 0
                val cutoffTime = System.currentTimeMillis() - (maxAgeDays * 24 * 60 * 60 * 1000L)

                // Calculate total size
                files.forEach { file ->
                    totalSize += file.length()
                }

                val maxSizeBytes = maxSizeMB * 1024L * 1024L
                val needsCleanup = totalSize > maxSizeBytes || files.any { it.lastModified() < cutoffTime }

                if (needsCleanup) {
                    // Sort files by last modified time (oldest first)
                    val sortedFiles = files.sortedBy { it.lastModified() }

                    sortedFiles.forEach { file ->
                        if (file.lastModified() < cutoffTime || totalSize > maxSizeBytes) {
                            if (deleteFile(file)) {
                                totalSize -= file.length()
                                deletedCount++
                            }
                        }
                    }
                }

                logger.d("Cleaned up $deletedCount image cache files")
                deletedCount

            } catch (e: Exception) {
                logger.e("Error cleaning up image cache", e)
                0
            }
        }
    }

    /**
     * Clean up thumbnail cache
     */
    suspend fun cleanThumbnailCache(maxAgeDays: Int = 3, maxSizeMB: Int = 50): Int {
        return withContext(Dispatchers.IO) {
            var deletedCount = 0

            try {
                val thumbnailCacheDir = File(appCacheDir, "thumbnails")
                if (!thumbnailCacheDir.exists()) {
                    return@withContext 0
                }

                val files = thumbnailCacheDir.listFiles() ?: return@withContext 0
                val cutoffTime = System.currentTimeMillis() - (maxAgeDays * 24 * 60 * 60 * 1000L)

                files.forEach { file ->
                    if (file.lastModified() < cutoffTime) {
                        if (deleteFile(file)) {
                            deletedCount++
                        }
                    }
                }

                logger.d("Cleaned up $deletedCount thumbnail cache files")
                deletedCount

            } catch (e: Exception) {
                logger.e("Error cleaning up thumbnail cache", e)
                0
            }
        }
    }

    /**
     * Clean up network cache
     */
    suspend fun cleanNetworkCache(maxAgeDays: Int = 1): Int {
        return withContext(Dispatchers.IO) {
            var deletedCount = 0

            try {
                val networkCacheDir = File(appCacheDir, "network")
                if (!networkCacheDir.exists()) {
                    return@withContext 0
                }

                val files = networkCacheDir.listFiles() ?: return@withContext 0
                val cutoffTime = System.currentTimeMillis() - (maxAgeDays * 24 * 60 * 60 * 1000L)

                files.forEach { file ->
                    if (file.lastModified() < cutoffTime) {
                        if (deleteFile(file)) {
                            deletedCount++
                        }
                    }
                }

                logger.d("Cleaned up $deletedCount network cache files")
                deletedCount

            } catch (e: Exception) {
                logger.e("Error cleaning up network cache", e)
                0
            }
        }
    }

    /**
     * Generate backup of app data
     */
    suspend fun generateBackup(): File? {
        return withContext(Dispatchers.IO) {
            try {
                val backupDir = getStorageDir(BACKUP_DIR)
                if (!backupDir.exists()) {
                    backupDir.mkdirs()
                }

                val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
                val backupFile = File(backupDir, "cannaai_backup_$timestamp.zip")

                // This would implement actual backup logic
                // For now, just create an empty file
                backupFile.createNewFile()

                logger.d("Backup created: ${backupFile.absolutePath}")
                backupFile

            } catch (e: Exception) {
                logger.e("Error generating backup", e)
                null
            }
        }
    }

    /**
     * Export data to shareable format
     */
    suspend fun exportData(dataType: String, format: String = "json"): File? {
        return withContext(Dispatchers.IO) {
            try {
                val exportDir = getStorageDir(EXPORT_DIR)
                if (!exportDir.exists()) {
                    exportDir.mkdirs()
                }

                val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
                val fileName = "${dataType}_export_$timestamp.$format"
                val exportFile = File(exportDir, fileName)

                // This would implement actual export logic
                // For now, just create an empty file
                exportFile.createNewFile()

                logger.d("Data exported: ${exportFile.absolutePath}")
                exportFile

            } catch (e: Exception) {
                logger.e("Error exporting data", e)
                null
            }
        }
    }

    // Private helper methods

    private fun createDirectories() {
        val directories = listOf(
            IMAGES_DIR,
            VIDEOS_DIR,
            DOCUMENTS_DIR,
            CACHE_DIR,
            TEMP_DIR,
            EXPORT_DIR,
            BACKUP_DIR,
            LOGS_DIR
        )

        directories.forEach { dirName ->
            try {
                val dir = getStorageDir(dirName)
                if (!dir.exists()) {
                    dir.mkdirs()
                }
            } catch (e: Exception) {
                logger.e("Error creating directory: $dirName", e)
            }
        }
    }

    private fun getStorageDir(subDirectory: String): File {
        return File(appExternalDir ?: appInternalDir, subDirectory)
    }

    private fun cleanupTempFiles() {
        try {
            val tempDir = getStorageDir(TEMP_DIR)
            if (tempDir.exists()) {
                tempDir.deleteRecursively()
            }
            tempDir.mkdirs()
        } catch (e: Exception) {
            logger.e("Error cleaning up temp files", e)
        }
    }

    private fun initializeCache() {
        try {
            val cacheDirs = listOf(
                File(appCacheDir, "images"),
                File(appCacheDir, "thumbnails"),
                File(appCacheDir, "network")
            )

            cacheDirs.forEach { dir ->
                if (!dir.exists()) {
                    dir.mkdirs()
                }
            }
        } catch (e: Exception) {
            logger.e("Error initializing cache", e)
        }
    }

    private fun getDirectorySpace(directory: File): DirectorySpace {
        val totalSpace = directory.totalSpace
        val freeSpace = directory.freeSpace
        val usableSpace = directory.usableSpace

        return DirectorySpace(
            total = totalSpace,
            free = freeSpace,
            usable = usableSpace,
            available = usableSpace
        )
    }

    private fun calculateInSampleSize(
        options: BitmapFactory.Options,
        reqWidth: Int,
        reqHeight: Int
    ): Int {
        val height = options.outHeight
        val width = options.outWidth
        var inSampleSize = 1

        if (height > reqHeight || width > reqWidth) {
            val halfHeight = height / 2
            val halfWidth = width / 2

            while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                inSampleSize *= 2
            }
        }

        return inSampleSize
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
            else -> "application/octet-stream"
        }
    }

    private fun getVideoDuration(videoFile: File): Long {
        // This would use MediaMetadataRetriever to get actual video duration
        // For now, return 0
        return 0L
    }

    /**
     * Cleanup resources
     */
    fun cleanup() {
        scope.cancel()
        logger.d("File manager cleaned up")
    }
}

/**
 * Data class for storage space information
 */
data class StorageSpaceInfo(
    val internalSpace: DirectorySpace,
    val externalSpace: DirectorySpace?,
    val cacheSpace: DirectorySpace,
    val externalCacheSpace: DirectorySpace?,
    val totalAvailable: Long
) {
    val totalSpace: Long
        get() = internalSpace.total + (externalSpace?.total ?: 0L)

    val totalFree: Long
        get() = internalSpace.free + (externalSpace?.free ?: 0L)
}

/**
 * Data class for directory space information
 */
data class DirectorySpace(
    val total: Long,
    val free: Long,
    val usable: Long,
    val available: Long
) {
    val used: Long
        get() = total - free

    val usagePercentage: Float
        get() = if (total > 0) (used.toFloat() / total) * 100 else 0f
}

/**
 * Data class for file information
 */
data class FileInfo(
    val name: String,
    val path: String,
    val size: Long,
    val lastModified: Long,
    val isDirectory: Boolean,
    val extension: String,
    val mimeType: String
) {
    val sizeInMB: Double
        get() = size / (1024.0 * 1024.0)

    val lastModifiedDate: Date
        get() = Date(lastModified)

    val isImage: Boolean
        get() = mimeType.startsWith("image/")

    val isVideo: Boolean
        get() = mimeType.startsWith("video/")

    val isAudio: Boolean
        get() = mimeType.startsWith("audio/")
}