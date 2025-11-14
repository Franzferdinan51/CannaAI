package com.cannaai.pro.camera

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.*
import android.hardware.camera2.*
import android.hardware.camera2.params.*
import android.media.ImageReader
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.util.*
import android.view.Surface
import android.view.TextureView
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.cannaai.pro.utils.Logger
import kotlinx.coroutines.*
import java.io.*
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class Camera2Manager @Inject constructor(
    private val context: Context,
    private val logger: Logger
) {
    companion object {
        private const val TAG = "Camera2Manager"

        // Camera states
        enum class CameraState {
            CLOSED,
            OPENED,
            PREVIEWING,
            CAPTURING_PHOTO,
            RECORDING_VIDEO
        }

        // Flash modes
        enum class FlashMode {
            OFF,
            ON,
            AUTO,
            TORCH
        }

        // Focus modes
        enum class FocusMode {
            AUTO,
            MANUAL,
            CONTINUOUS_PICTURE,
            CONTINUOUS_VIDEO,
            MACRO,
            INFINITY
        }

        // Camera capture modes
        enum class CaptureMode {
            PHOTO,
            VIDEO,
            TIME_LAPSE
        }

        // Configuration constants
        private const val MAX_PREVIEW_WIDTH = 1920
        private const val MAX_PREVIEW_HEIGHT = 1080
        private const val CAPTURE_IMAGE_WIDTH = 4032
        private const val CAPTURE_IMAGE_HEIGHT = 3024
        private const val VIDEO_FRAME_RATE = 30
        private const val VIDEO_BIT_RATE = 10_000_000
        private const val VIDEO_SAMPLE_RATE = 44100
    }

    // Camera components
    private var cameraDevice: CameraDevice? = null
    private var captureSession: CameraCaptureSession? = null
    private var cameraManager: CameraManager
    private var cameraCharacteristics: CameraCharacteristics? = null
    private var cameraId: String? = null

    // Preview and capture
    private var previewTextureView: TextureView? = null
    private var previewSize: Size? = null
    private var photoSize: Size? = null
    private var videoSize: Size? = null
    private var imageReader: ImageReader? = null

    // Background thread
    private var backgroundThread: HandlerThread? = null
    private var backgroundHandler: Handler? = null

    // Media recording
    private var mediaRecorder: MediaRecorder? = null
    private var isRecordingVideo = false
    private var videoFile: File? = null

    // Camera state and settings
    var cameraState = CameraState.CLOSED
        private set
    var currentFlashMode = FlashMode.AUTO
        private set
    var currentFocusMode = FocusMode.AUTO
        private set
    var currentCaptureMode = CaptureMode.PHOTO
        private set

    // Callbacks
    private var onCameraOpenedListener: (() -> Unit)? = null
    private var onCameraClosedListener: (() -> Unit)? = null
    private var onPhotoCapturedListener: ((File) -> Unit)? = null
    private var onVideoRecordedListener: ((File) -> Unit)? = null
    private var onErrorListener: ((String) -> Unit)? = null

    init {
        cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    }

    // Camera lifecycle methods

    /**
     * Check if camera permission is granted
     */
    fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Check if audio recording permission is granted
     */
    fun hasAudioPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Open camera with preview
     */
    @SuppressLint("MissingPermission")
    fun openCamera(textureView: TextureView) {
        if (!hasCameraPermission()) {
            onErrorListener?.invoke("Camera permission not granted")
            return
        }

        previewTextureView = textureView

        try {
            // Find the best camera
            cameraId = findBestCameraId()
            cameraCharacteristics = cameraManager.getCameraCharacteristics(cameraId!!)

            // Configure camera sizes
            configureCameraSizes()

            // Start background thread
            startBackgroundThread()

            // Open camera
            cameraManager.openCamera(cameraId!!, cameraStateCallback, backgroundHandler)

        } catch (e: CameraAccessException) {
            logger.e("Error opening camera", e)
            onErrorListener?.invoke("Failed to open camera: ${e.message}")
        } catch (e: Exception) {
            logger.e("Unexpected error opening camera", e)
            onErrorListener?.invoke("Unexpected error: ${e.message}")
        }
    }

    /**
     * Close camera
     */
    fun closeCamera() {
        try {
            captureSession?.close()
            captureSession = null
            cameraDevice?.close()
            cameraDevice = null
            imageReader?.close()
            imageReader = null
            mediaRecorder?.release()
            mediaRecorder = null

            cameraState = CameraState.CLOSED
            onCameraClosedListener?.invoke()

            stopBackgroundThread()

        } catch (e: Exception) {
            logger.e("Error closing camera", e)
        }
    }

    /**
     * Start camera preview
     */
    private fun startPreview() {
        try {
            if (cameraDevice == null || previewTextureView == null) return

            val texture = previewTextureView!!.surfaceTexture
            texture?.setDefaultBufferSize(previewSize!!.width, previewSize!!.height)

            val previewSurface = Surface(texture)
            val captureSurfaces = mutableListOf<Surface>(previewSurface)

            // Add image reader for photo capture
            if (currentCaptureMode == CaptureMode.PHOTO) {
                imageReader = ImageReader.newInstance(
                    photoSize!!.width,
                    photoSize!!.height,
                    ImageFormat.JPEG,
                    1
                ).apply {
                    setOnImageAvailableListener(onImageAvailableListener, backgroundHandler)
                }
                captureSurfaces.add(imageReader!!.surface)
            }

            // Create capture session
            cameraDevice!!.createCaptureSession(
                captureSurfaces,
                cameraSessionStateCallback,
                backgroundHandler
            )

        } catch (e: CameraAccessException) {
            logger.e("Error starting preview", e)
            onErrorListener?.invoke("Failed to start preview: ${e.message}")
        }
    }

    /**
     * Capture photo
     */
    fun capturePhoto() {
        if (cameraState != CameraState.PREVIEWING) {
            onErrorListener?.invoke("Camera not ready for photo capture")
            return
        }

        try {
            val captureBuilder = cameraDevice!!.createCaptureRequest(
                CameraDevice.TEMPLATE_STILL_CAPTURE
            ).apply {
                addTarget(imageReader!!.surface)

                // Set JPEG quality
                set(CaptureRequest.JPEG_QUALITY, 95)
                set(CaptureRequest.JPEG_ORIENTATION, getCameraOrientation())

                // Set flash mode
                when (currentFlashMode) {
                    FlashMode.ON -> set(CaptureRequest.FLASH_MODE, CaptureRequest.FLASH_MODE_SINGLE)
                    FlashMode.AUTO -> set(CaptureRequest.FLASH_MODE, CaptureRequest.FLASH_MODE_AUTO)
                    FlashMode.OFF -> set(CaptureRequest.FLASH_MODE, CaptureRequest.FLASH_MODE_OFF)
                    FlashMode.TORCH -> set(CaptureRequest.FLASH_MODE, CaptureRequest.FLASH_MODE_TORCH)
                }

                // Set focus mode
                set(CaptureRequest.CONTROL_AF_MODE, getFocusModeValue())

                // Auto white balance
                set(CaptureRequest.CONTROL_AWB_MODE, CaptureRequest.CONTROL_AWB_MODE_AUTO)

                // Auto exposure
                set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON)
            }

            captureSession!!.capture(
                captureBuilder.build(),
                cameraCaptureCallback,
                backgroundHandler
            )

            cameraState = CameraState.CAPTURING_PHOTO

        } catch (e: CameraAccessException) {
            logger.e("Error capturing photo", e)
            onErrorListener?.invoke("Failed to capture photo: ${e.message}")
        }
    }

    /**
     * Start video recording
     */
    fun startVideoRecording() {
        if (!hasAudioPermission()) {
            onErrorListener?.invoke("Audio recording permission not granted")
            return
        }

        if (isRecordingVideo) {
            onErrorListener?.invoke("Already recording video")
            return
        }

        try {
            // Create video file
            videoFile = createVideoFile()

            // Setup media recorder
            setupMediaRecorder()

            val texture = previewTextureView!!.surfaceTexture
            texture?.setDefaultBufferSize(videoSize!!.width, videoSize!!.height)

            val previewSurface = Surface(texture)
            val recorderSurface = mediaRecorder!!.surface

            // Create capture session for video
            cameraDevice!!.createCaptureSession(
                listOf(previewSurface, recorderSurface),
                videoSessionStateCallback,
                backgroundHandler
            )

        } catch (e: IOException) {
            logger.e("Error starting video recording", e)
            onErrorListener?.invoke("Failed to start video recording: ${e.message}")
        } catch (e: CameraAccessException) {
            logger.e("Error creating video capture session", e)
            onErrorListener?.invoke("Failed to create video session: ${e.message}")
        }
    }

    /**
     * Stop video recording
     */
    fun stopVideoRecording() {
        if (!isRecordingVideo) return

        try {
            mediaRecorder?.stop()
            mediaRecorder?.release()
            mediaRecorder = null

            isRecordingVideo = false
            cameraState = CameraState.PREVIEWING

            // Return to photo preview session
            startPreview()

            videoFile?.let { file ->
                onVideoRecordedListener?.invoke(file)
            }

        } catch (e: Exception) {
            logger.e("Error stopping video recording", e)
            onErrorListener?.invoke("Failed to stop video recording: ${e.message}")
        }
    }

    // Camera controls

    /**
     * Set flash mode
     */
    fun setFlashMode(flashMode: FlashMode) {
        currentFlashMode = flashMode

        if (cameraState == CameraState.PREVIEWING) {
            updatePreviewRequest()
        }
    }

    /**
     * Set focus mode
     */
    fun setFocusMode(focusMode: FocusMode) {
        currentFocusMode = focusMode

        if (cameraState == CameraState.PREVIEWING) {
            updatePreviewRequest()
        }
    }

    /**
     * Set focus manually
     */
    fun setManualFocus(x: Float, y: Float) {
        if (cameraState != CameraState.PREVIEWING) return

        try {
            val sensorSize = cameraCharacteristics!!.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE)
            if (sensorSize != null) {
                val focusX = (x * sensorSize.width()).toInt()
                val focusY = (y * sensorSize.height()).toInt()

                val focusArea = MeteringRectangle(
                    maxOf(0, focusX - 100),
                    maxOf(0, focusY - 100),
                    200,
                    200,
                    MeteringRectangle.METERING_WEIGHT_MAX - 1
                )

                val captureBuilder = cameraDevice!!.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW).apply {
                    addTarget(previewTextureView!!.surface)
                    set(CaptureRequest.CONTROL_AF_TRIGGER, CameraMetadata.CONTROL_AF_TRIGGER_START)
                    set(CaptureRequest.CONTROL_AF_MODE, CameraMetadata.CONTROL_AF_MODE_AUTO)
                    set(CaptureRequest.CONTROL_AF_REGIONS, arrayOf(focusArea))
                }

                captureSession!!.capture(captureBuilder.build(), null, backgroundHandler)

                // Reset AF trigger
                captureBuilder.set(CaptureRequest.CONTROL_AF_TRIGGER, CameraMetadata.CONTROL_AF_TRIGGER_IDLE)
                captureSession!!.setRepeatingRequest(captureBuilder.build(), null, backgroundHandler)
            }

        } catch (e: Exception) {
            logger.e("Error setting manual focus", e)
        }
    }

    /**
     * Zoom in/out
     */
    fun setZoom(zoomRatio: Float) {
        if (cameraState != CameraState.PREVIEWING) return

        try {
            val maxZoom = cameraCharacteristics!!.get(CameraCharacteristics.SCALER_AVAILABLE_MAX_DIGITAL_ZOOM) ?: 1.0f
            val clampedZoom = zoomRatio.coerceIn(1.0f, maxZoom)

            updatePreviewRequest {
                set(CaptureRequest.SCALER_CROP_REGION, getZoomRect(clampedZoom))
            }

        } catch (e: Exception) {
            logger.e("Error setting zoom", e)
        }
    }

    // Private helper methods

    private fun findBestCameraId(): String? {
        val cameraIds = cameraManager.cameraIdList
        var selectedCameraId: String? = null

        for (id in cameraIds) {
            val characteristics = cameraManager.getCameraCharacteristics(id)
            val facing = characteristics.get(CameraCharacteristics.LENS_FACING)

            // Prefer back camera
            if (facing == CameraCharacteristics.LENS_FACING_BACK) {
                selectedCameraId = id
                break
            }
        }

        // Fallback to first camera if no back camera found
        return selectedCameraId ?: cameraIds.firstOrNull()
    }

    private fun configureCameraSizes() {
        val map = cameraCharacteristics!!.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
        if (map != null) {
            // Preview size - choose optimal size for display
            previewSize = chooseOptimalSize(
                map.getOutputSizes(SurfaceTexture::class.java),
                MAX_PREVIEW_WIDTH,
                MAX_PREVIEW_HEIGHT
            )

            // Photo size - choose largest available
            photoSize = chooseOptimalSize(
                map.getOutputSizes(ImageFormat.JPEG),
                CAPTURE_IMAGE_WIDTH,
                CAPTURE_IMAGE_HEIGHT
            )

            // Video size - choose suitable video size
            videoSize = chooseOptimalSize(
                map.getOutputSizes(MediaRecorder::class.java),
                1920,
                1080
            )
        }
    }

    private fun chooseOptimalSize(choices: Array<Size>?, width: Int, height: Int): Size {
        if (choices == null || choices.isEmpty()) {
            return Size(width, height)
        }

        // Find size that best matches the target dimensions
        val targetAspect = width.toFloat() / height
        var bestSize = choices[0]
        var bestRatio = Float.MAX_VALUE

        for (size in choices) {
            val ratio = size.width.toFloat() / size.height.toFloat()
            val ratioDiff = Math.abs(ratio - targetAspect)

            if (ratioDiff < bestRatio) {
                bestRatio = ratioDiff
                bestSize = size
            }
        }

        return bestSize
    }

    private fun getCameraOrientation(): Int {
        val rotation = if (context is Activity) {
            context.windowManager.defaultDisplay.rotation
        } else {
            Surface.ROTATION_0
        }

        val sensorOrientation = cameraCharacteristics?.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0

        return when (rotation) {
            Surface.ROTATION_0 -> sensorOrientation
            Surface.ROTATION_90 -> (sensorOrientation + 90) % 360
            Surface.ROTATION_180 -> (sensorOrientation + 180) % 360
            Surface.ROTATION_270 -> (sensorOrientation + 270) % 360
            else -> sensorOrientation
        }
    }

    private fun getFocusModeValue(): Int {
        return when (currentFocusMode) {
            FocusMode.AUTO -> CameraMetadata.CONTROL_AF_MODE_AUTO
            FocusMode.CONTINUOUS_PICTURE -> CameraMetadata.CONTROL_AF_MODE_CONTINUOUS_PICTURE
            FocusMode.CONTINUOUS_VIDEO -> CameraMetadata.CONTROL_AF_MODE_CONTINUOUS_VIDEO
            FocusMode.MANUAL -> CameraMetadata.CONTROL_AF_MODE_OFF
            FocusMode.MACRO -> CameraMetadata.CONTROL_AF_MODE_MACRO
            FocusMode.INFINITY -> CameraMetadata.CONTROL_AF_MODE_INFINITY
        }
    }

    private fun getZoomRect(zoomRatio: Float): Rect {
        val sensorSize = cameraCharacteristics!!.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE)
        if (sensorSize == null) {
            return Rect()
        }

        val cropW = sensorSize.width() / zoomRatio
        val cropH = sensorSize.height() / zoomRatio
        val cropX = (sensorSize.width() - cropW) / 2
        val cropY = (sensorSize.height() - cropH) / 2

        return Rect(cropX, cropY, cropX + cropW, cropY + cropH)
    }

    private fun setupMediaRecorder() {
        mediaRecorder = MediaRecorder().apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setVideoSource(MediaRecorder.VideoSource.SURFACE)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setOutputFile(videoFile!!.absolutePath)
            setVideoEncodingBitRate(VIDEO_BIT_RATE)
            setVideoFrameRate(VIDEO_FRAME_RATE)
            setVideoSize(videoSize!!.width, videoSize!!.height)
            setVideoEncoder(MediaRecorder.VideoEncoder.H264)
            setAudioEncodingBitRate(128000)
            setAudioChannels(2)
            setAudioSamplingRate(VIDEO_SAMPLE_RATE)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)

            try {
                prepare()
            } catch (e: IOException) {
                logger.e("Error preparing media recorder", e)
                throw e
            }
        }
    }

    private fun createPhotoFile(): File {
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir = File(context.getExternalFilesDir(null), "Pictures/CannaAI")
        if (!storageDir.exists()) {
            storageDir.mkdirs()
        }
        return File(storageDir, "IMG_$timestamp.jpg")
    }

    private fun createVideoFile(): File {
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir = File(context.getExternalFilesDir(null), "Movies/CannaAI")
        if (!storageDir.exists()) {
            storageDir.mkdirs()
        }
        return File(storageDir, "VID_$timestamp.mp4")
    }

    private fun updatePreviewRequest(requestModifier: (CaptureRequest.Builder.() -> Unit = {}) {
        try {
            val previewRequest = cameraDevice!!.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW).apply {
                addTarget(previewTextureView!!.surface)
                set(CaptureRequest.CONTROL_AF_MODE, getFocusModeValue())

                // Apply flash mode for preview (torch mode only affects preview)
                if (currentFlashMode == FlashMode.TORCH) {
                    set(CaptureRequest.FLASH_MODE, CaptureRequest.FLASH_MODE_TORCH)
                } else {
                    set(CaptureRequest.FLASH_MODE, CaptureRequest.FLASH_MODE_OFF)
                }

                // Apply custom modifications
                requestModifier()
            }

            captureSession?.setRepeatingRequest(previewRequest.build(), null, backgroundHandler)

        } catch (e: Exception) {
            logger.e("Error updating preview request", e)
        }
    }

    private fun startBackgroundThread() {
        backgroundThread = HandlerThread("CameraBackground").also { it.start() }
        backgroundHandler = Handler(backgroundThread!!.looper)
    }

    private fun stopBackgroundThread() {
        backgroundThread?.quitSafely()
        try {
            backgroundThread?.join()
            backgroundThread = null
            backgroundHandler = null
        } catch (e: InterruptedException) {
            logger.e("Error stopping background thread", e)
        }
    }

    // Camera callbacks

    private val cameraStateCallback = object : CameraDevice.StateCallback() {
        override fun onOpened(camera: CameraDevice) {
            cameraDevice = camera
            cameraState = CameraState.OPENED
            onCameraOpenedListener?.invoke()
            startPreview()
        }

        override fun onDisconnected(camera: CameraDevice) {
            camera.close()
            cameraDevice = null
            cameraState = CameraState.CLOSED
        }

        override fun onError(camera: CameraDevice, error: Int) {
            camera.close()
            cameraDevice = null
            cameraState = CameraState.CLOSED
            onErrorListener?.invoke("Camera error: $error")
        }
    }

    private val cameraSessionStateCallback = object : CameraCaptureSession.StateCallback() {
        override fun onConfigured(session: CameraCaptureSession) {
            captureSession = session
            cameraState = CameraState.PREVIEWING

            // Start preview
            updatePreviewRequest()
        }

        override fun onConfigureFailed(session: CameraCaptureSession) {
            onErrorListener?.invoke("Failed to configure camera session")
        }
    }

    private val videoSessionStateCallback = object : CameraCaptureSession.StateCallback() {
        override fun onConfigured(session: CameraCaptureSession) {
            captureSession = session

            try {
                // Start recording
                mediaRecorder?.start()
                isRecordingVideo = true
                cameraState = CameraState.RECORDING_VIDEO

            } catch (e: Exception) {
                logger.e("Error starting video recording", e)
                onErrorListener?.invoke("Failed to start recording: ${e.message}")
            }
        }

        override fun onConfigureFailed(session: CameraCaptureSession) {
            onErrorListener?.invoke("Failed to configure video session")
        }
    }

    private val cameraCaptureCallback = object : CameraCaptureSession.CaptureCallback() {
        override fun onCaptureCompleted(session: CameraCaptureSession, request: CaptureRequest, result: TotalCaptureResult) {
            cameraState = CameraState.PREVIEWING
        }

        override fun onCaptureFailed(session: CameraCaptureSession, request: CaptureRequest, failure: CaptureFailure) {
            cameraState = CameraState.PREVIEWING
            onErrorListener?.invoke("Photo capture failed: ${failure.reason}")
        }
    }

    private val onImageAvailableListener = ImageReader.OnImageAvailableListener { reader ->
        val image = reader.acquireLatestImage()
        if (image != null) {
            try {
                val buffer = image.planes[0].buffer
                val bytes = ByteArray(buffer.remaining())
                buffer.get(bytes)

                // Save image to file
                val photoFile = createPhotoFile()
                FileOutputStream(photoFile).use { output ->
                    output.write(bytes)
                }

                onPhotoCapturedListener?.invoke(photoFile)

            } catch (e: IOException) {
                logger.e("Error saving photo", e)
                onErrorListener?.invoke("Failed to save photo: ${e.message}")
            } finally {
                image.close()
            }
        }
    }

    // Setters for listeners

    fun setOnCameraOpenedListener(listener: () -> Unit) {
        onCameraOpenedListener = listener
    }

    fun setOnCameraClosedListener(listener: () -> Unit) {
        onCameraClosedListener = listener
    }

    fun setOnPhotoCapturedListener(listener: (File) -> Unit) {
        onPhotoCapturedListener = listener
    }

    fun setOnVideoRecordedListener(listener: (File) -> Unit) {
        onVideoRecordedListener = listener
    }

    fun setOnErrorListener(listener: (String) -> Unit) {
        onErrorListener = listener
    }
}