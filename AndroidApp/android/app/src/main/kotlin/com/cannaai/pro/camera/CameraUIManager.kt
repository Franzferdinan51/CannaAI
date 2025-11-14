package com.cannaai.pro.camera

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.media.Image
import android.view.*
import android.widget.*
import androidx.camera.core.*
import androidx.camera.core.impl.utils.Exif
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.lifecycle.LifecycleOwner
import com.cannaai.pro.R
import com.cannaai.pro.utils.Logger
import java.io.*
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CameraUIManager @Inject constructor(
    private val context: Context,
    private val logger: Logger
) : SensorEventListener {

    companion object {
        private const val TAG = "CameraUIManager"

        // Animation durations
        private const val ANIMATION_DURATION = 300L
        private const val ZOOM_STEP = 0.1f
        private const val MAX_ZOOM = 2.0f
        private const val MIN_ZOOM = 1.0f
    }

    // Camera components
    private var cameraProvider: ProcessCameraProvider? = null
    private var camera: Camera? = null
    private var preview: Preview? = null
    private var imageCapture: ImageCapture? = null
    private var videoCapture: VideoCapture<Recorder>? = null
    private var imageAnalyzer: ImageAnalysis? = null

    // UI components
    private var previewView: PreviewView? = null
    private var overlayView: View? = null
    private var focusIndicator: View? = null
    private var captureButton: ImageButton? = null
    private var switchCameraButton: ImageButton? = null
    private var flashButton: ImageButton? = null
    private var zoomSeekBar: SeekBar? = null
    private var modeButton: ImageButton? = null
    private var galleryButton: ImageButton? = null

    // Camera state
    private var cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
    private var currentFlashMode = ImageCapture.FLASH_MODE_AUTO
    private var currentMode = CameraMode.PHOTO
    private var isRecording = false
    private var currentZoom = 1.0f

    // Camera features
    private var hasFlash = false
    private var cameraFacing = CameraSelector.LENS_FACING_BACK

    // Sensor for auto-rotation
    private var sensorManager: SensorManager
    private var accelerometer: Sensor
    private var magnetometer: Sensor
    private var gravity: FloatArray? = null
    private var geomagnetic: FloatArray? = null
    private var rotation = 0f

    // Callbacks
    private var onPhotoCapturedListener: ((File) -> Unit)? = null
    private var onVideoRecordedListener: ((File) -> Unit)? = null
    private var onErrorListener: ((String) -> Unit)? = null
    private var onModeChangedListener: ((CameraMode) -> Unit)? = null

    enum class CameraMode {
        PHOTO,
        VIDEO,
        SCAN,
        PORTRAIT,
        NIGHT
    }

    init {
        sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        magnetometer = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
    }

    /**
     * Initialize camera with UI components
     */
    fun initializeCamera(
        lifecycleOwner: LifecycleOwner,
        previewView: PreviewView,
        overlayView: View
    ) {
        this.previewView = previewView
        this.overlayView = overlayView

        try {
            // Find UI components
            findUIComponents(overlayView)

            // Initialize camera provider
            val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
            cameraProviderFuture.addListener({
                cameraProvider = cameraProviderFuture.get()
                bindCameraUseCases(lifecycleOwner)
            }, ContextCompat.getMainExecutor(context))

            // Setup UI interactions
            setupUIInteractions()

            // Start sensors for rotation detection
            startSensors()

            logger.d("Camera initialized successfully")

        } catch (e: Exception) {
            logger.e("Error initializing camera", e)
            onErrorListener?.invoke("Failed to initialize camera: ${e.message}")
        }
    }

    /**
     * Release camera resources
     */
    fun releaseCamera() {
        try {
            cameraProvider?.unbindAll()
            stopSensors()
            logger.d("Camera released")

        } catch (e: Exception) {
            logger.e("Error releasing camera", e)
        }
    }

    /**
     * Switch between front and back camera
     */
    fun switchCamera() {
        cameraFacing = if (cameraFacing == CameraSelector.LENS_FACING_BACK) {
            CameraSelector.LENS_FACING_FRONT
        } else {
            CameraSelector.LENS_FACING_BACK
        }

        cameraSelector = if (cameraFacing == CameraSelector.LENS_FACING_BACK) {
            CameraSelector.DEFAULT_BACK_CAMERA
        } else {
            CameraSelector.DEFAULT_FRONT_CAMERA
        }

        // Rebind camera with new selector
        previewView?.let { view ->
            val lifecycleOwner = view.context as? LifecycleOwner
            if (lifecycleOwner != null) {
                bindCameraUseCases(lifecycleOwner)
            }
        }

        // Update camera switch button icon
        updateCameraSwitchIcon()

        logger.d("Switched to ${if (cameraFacing == CameraSelector.LENS_FACING_BACK) "back" else "front"} camera")
    }

    /**
     * Capture photo
     */
    fun capturePhoto() {
        if (currentMode != CameraMode.PHOTO) {
            onErrorListener?.invoke("Camera is not in photo mode")
            return
        }

        imageCapture?.let { capture ->
            val photoFile = createPhotoFile()
            val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

            capture.takePicture(
                outputOptions,
                ContextCompat.getMainExecutor(context),
                object : ImageCapture.OnImageSavedCallback {
                    override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                        // Add image to gallery
                        addImageToGallery(photoFile)

                        onPhotoCapturedListener?.invoke(photoFile)
                        showCaptureAnimation()
                        logger.d("Photo saved: ${photoFile.absolutePath}")
                    }

                    override fun onError(exception: ImageCaptureException) {
                        logger.e("Photo capture failed", exception)
                        onErrorListener?.invoke("Failed to capture photo: ${exception.message}")
                    }
                }
            )
        }
    }

    /**
     * Start video recording
     */
    fun startVideoRecording() {
        if (currentMode != CameraMode.VIDEO) {
            onErrorListener?.invoke("Camera is not in video mode")
            return
        }

        if (isRecording) {
            onErrorListener?.invoke("Already recording video")
            return
        }

        videoCapture?.let { capture ->
            val videoFile = createVideoFile()
            val outputOptions = VideoCapture.OutputFileOptions.Builder(videoFile).build()

            capture.startRecording(
                outputOptions,
                ContextCompat.getMainExecutor(context),
                object : VideoCapture.OnVideoSavedCallback {
                    override fun onVideoSaved(outputFile: VideoCapture.OutputFileResults) {
                        addVideoToGallery(videoFile)
                        onVideoRecordedListener?.invoke(videoFile)
                        logger.d("Video saved: ${videoFile.absolutePath}")
                    }

                    override fun onError(
                        videoCaptureError: Int,
                        message: String,
                        cause: Throwable?
                    ) {
                        logger.e("Video recording failed", cause)
                        onErrorListener?.invoke("Failed to record video: $message")
                    }
                }
            )

            isRecording = true
            updateRecordingUI(true)
            logger.d("Started video recording")
        }
    }

    /**
     * Stop video recording
     */
    fun stopVideoRecording() {
        if (!isRecording) return

        videoCapture?.stopRecording()
        isRecording = false
        updateRecordingUI(false)
        logger.d("Stopped video recording")
    }

    /**
     * Toggle flash mode
     */
    fun toggleFlashMode() {
        currentFlashMode = when (currentFlashMode) {
            ImageCapture.FLASH_MODE_AUTO -> ImageCapture.FLASH_MODE_ON
            ImageCapture.FLASH_MODE_ON -> ImageCapture.FLASH_MODE_OFF
            else -> ImageCapture.FLASH_MODE_AUTO
        }

        imageCapture?.flashMode = currentFlashMode
        updateFlashButtonIcon()
        logger.d("Flash mode changed to: $currentFlashMode")
    }

    /**
     * Set zoom level
     */
    fun setZoom(zoom: Float) {
        currentZoom = zoom.coerceIn(MIN_ZOOM, MAX_ZOOM)

        camera?.cameraControl?.setZoomRatio(currentZoom)
        zoomSeekBar?.progress = ((currentZoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM) * 100).toInt()
        logger.d("Zoom set to: $currentZoom")
    }

    /**
     * Switch camera mode
     */
    fun switchMode(mode: CameraMode) {
        currentMode = mode
        onModeChangedListener?.invoke(mode)
        updateModeUI()

        // Rebind camera use cases for new mode
        previewView?.let { view ->
            val lifecycleOwner = view.context as? LifecycleOwner
            if (lifecycleOwner != null) {
                bindCameraUseCases(lifecycleOwner)
            }
        }

        logger.d("Camera mode switched to: $mode")
    }

    // Private helper methods

    private fun findUIComponents(view: View) {
        // Find common UI components
        captureButton = view.findViewById(R.id.capture_button)
        switchCameraButton = view.findViewById(R.id.switch_camera_button)
        flashButton = view.findViewById(R.id.flash_button)
        zoomSeekBar = view.findViewById(R.id.zoom_seekbar)
        modeButton = view.findViewById(R.id.mode_button)
        galleryButton = view.findViewById(R.id.gallery_button)
        focusIndicator = view.findViewById(R.id.focus_indicator)
    }

    private fun setupUIInteractions() {
        // Capture button
        captureButton?.setOnClickListener {
            when (currentMode) {
                CameraMode.PHOTO -> capturePhoto()
                CameraMode.VIDEO -> {
                    if (isRecording) {
                        stopVideoRecording()
                    } else {
                        startVideoRecording()
                    }
                }
                else -> capturePhoto() // Default behavior for other modes
            }
        }

        // Switch camera button
        switchCameraButton?.setOnClickListener {
            switchCamera()
        }

        // Flash button
        flashButton?.setOnClickListener {
            toggleFlashMode()
        }

        // Zoom seek bar
        zoomSeekBar?.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser) {
                    val zoom = MIN_ZOOM + (progress / 100f) * (MAX_ZOOM - MIN_ZOOM)
                    setZoom(zoom)
                }
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        // Mode button
        modeButton?.setOnClickListener {
            val modes = CameraMode.values()
            val currentIndex = modes.indexOf(currentMode)
            val nextIndex = (currentIndex + 1) % modes.size
            switchMode(modes[nextIndex])
        }

        // Gallery button
        galleryButton?.setOnClickListener {
            // Open gallery
            logger.d("Gallery button clicked")
        }

        // Touch to focus
        previewView?.setOnTouchListener { _, event ->
            if (event.action == MotionEvent.ACTION_DOWN) {
                focusAtPoint(event.x, event.y)
                true
            } else {
                false
            }
        }

        // Pinch to zoom
        setupZoomGesture()
    }

    private fun setupZoomGesture() {
        val scaleGestureDetector = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScale(detector: ScaleGestureDetector): Boolean {
                val scaleFactor = detector.scaleFactor
                val newZoom = (currentZoom * scaleFactor).coerceIn(MIN_ZOOM, MAX_ZOOM)
                setZoom(newZoom)
                return true
            }
        })

        previewView?.setOnTouchListener { _, event ->
            scaleGestureDetector.onTouchEvent(event)
            false
        }
    }

    private fun bindCameraUseCases(lifecycleOwner: LifecycleOwner) {
        val cameraProvider = cameraProvider ?: return

        try {
            // Unbind all use cases
            cameraProvider.unbindAll()

            // Preview
            preview = Preview.Builder()
                .setTargetAspectRatio(aspectRatioForCurrentMode())
                .build()
                .also {
                    it.setSurfaceProvider(previewView?.surfaceProvider)
                }

            // Image capture (for photo mode)
            if (currentMode == CameraMode.PHOTO || currentMode == CameraMode.PORTRAIT || currentMode == CameraMode.NIGHT) {
                imageCapture = ImageCapture.Builder()
                    .setTargetAspectRatio(aspectRatioForCurrentMode())
                    .setFlashMode(currentFlashMode)
                    .build()
            }

            // Video capture (for video mode)
            if (currentMode == CameraMode.VIDEO) {
                val recorder = Recorder.Builder()
                    .setQualitySelector(
                        QualitySelector.from(
                            Quality.HIGHEST,
                            FallbackStrategy.higherQualityOrLowerThan(Quality.HIGHEST)
                        )
                    )
                    .build()

                videoCapture = VideoCapture.withOutput(recorder)
            }

            // Image analysis (for scan mode)
            if (currentMode == CameraMode.SCAN) {
                imageAnalyzer = ImageAnalysis.Builder()
                    .setTargetAspectRatio(aspectRatioForCurrentMode())
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                    .also {
                        it.setAnalyzer(ContextCompat.getMainExecutor(context)) { imageProxy ->
                            // Process image for scanning
                            processImageForScanning(imageProxy)
                            imageProxy.close()
                        }
                    }
            }

            // Get camera info
            val cameraInfo = cameraProvider.getCameraInfo(cameraSelector)
            hasFlash = cameraInfo.hasFlashUnit()

            // Bind use cases to camera
            val useCases = mutableListOf<UseCase>().apply {
                add(preview!!)
                imageCapture?.let { add(it) }
                videoCapture?.let { add(it) }
                imageAnalyzer?.let { add(it) }
            }

            camera = cameraProvider.bindToLifecycle(
                lifecycleOwner,
                cameraSelector,
                *useCases.toTypedArray()
            )

            // Setup initial zoom
            camera?.cameraControl?.setZoomRatio(currentZoom)

            // Update UI based on capabilities
            updateUIBasedOnCapabilities()

            logger.d("Camera use cases bound successfully")

        } catch (e: Exception) {
            logger.e("Error binding camera use cases", e)
            onErrorListener?.invoke("Failed to setup camera: ${e.message}")
        }
    }

    private fun aspectRatioForCurrentMode(): Int {
        return when (currentMode) {
            CameraMode.VIDEO -> AspectRatio.RATIO_16_9
            CameraMode.PORTRAIT -> AspectRatio.RATIO_4_3
            CameraMode.SCAN -> AspectRatio.RATIO_16_9
            else -> AspectRatio.RATIO_4_3
        }
    }

    private fun focusAtPoint(x: Float, y: Float) {
        val factory = previewView?.meteringPointFactory ?: return
        val point = factory.createPoint(x, y)
        val action = FocusMeteringAction.Builder(point, FocusMeteringAction.FLAG_AF)
            .addPoint(point, FocusMeteringAction.FLAG_AE)
            .build()

        camera?.cameraControl?.startFocusAndMetering(action)
        showFocusAnimation(x, y)
    }

    private fun showFocusAnimation(x: Float, y: Float) {
        focusIndicator?.let { indicator ->
            indicator.x = x - (indicator.width / 2)
            indicator.y = y - (indicator.height / 2)
            indicator.visibility = View.VISIBLE

            // Animate focus indicator
            val animator = ValueAnimator.ofFloat(1.0f, 0.0f).apply {
                duration = 1000
                addUpdateListener { animation ->
                    val alpha = (animation.animatedValue as Float) * 255
                    indicator.alpha = alpha.toInt()
                }
            }
            animator.start()
        }
    }

    private fun showCaptureAnimation() {
        captureButton?.let { button ->
            // Flash effect
            val animator = ValueAnimator.ofFloat(1.0f, 0.0f).apply {
                duration = 200
                addUpdateListener { animation ->
                    val alpha = (animation.animatedValue as Float) * 255
                    overlayView?.setBackgroundColor(Color.argb(alpha.toInt(), 255, 255, 255))
                }
            }
            animator.start()

            // Button animation
            button.animate()
                .scaleX(0.8f)
                .scaleY(0.8f)
                .setDuration(100)
                .withEndAction {
                    button.animate()
                        .scaleX(1.0f)
                        .scaleY(1.0f)
                        .setDuration(100)
                        .start()
                }
                .start()
        }
    }

    private fun processImageForScanning(imageProxy: ImageProxy) {
        // Implement QR code scanning or plant disease detection
        // This would integrate with ML Kit or other scanning libraries
        logger.d("Processing image for scanning")
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

    private fun addImageToGallery(imageFile: File) {
        // Add image to Android gallery
        try {
            val contentValues = android.content.ContentValues().apply {
                put(android.provider.MediaStore.Images.Media.DISPLAY_NAME, imageFile.name)
                put(android.provider.MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                put(android.provider.MediaStore.Images.Media.RELATIVE_PATH, "Pictures/CannaAI")
                put(android.provider.MediaStore.Images.Media.IS_PENDING, 0)
            }

            val uri = context.contentResolver.insert(
                android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                contentValues
            )

            uri?.let {
                context.contentResolver.openOutputStream(it)?.use { output ->
                    FileInputStream(imageFile).use { input ->
                        input.copyTo(output)
                    }
                }
            }

        } catch (e: Exception) {
            logger.e("Error adding image to gallery", e)
        }
    }

    private fun addVideoToGallery(videoFile: File) {
        // Add video to Android gallery
        try {
            val contentValues = android.content.ContentValues().apply {
                put(android.provider.MediaStore.Video.Media.DISPLAY_NAME, videoFile.name)
                put(android.provider.MediaStore.Video.Media.MIME_TYPE, "video/mp4")
                put(android.provider.MediaStore.Video.Media.RELATIVE_PATH, "Movies/CannaAI")
                put(android.provider.MediaStore.Video.Media.IS_PENDING, 0)
            }

            val uri = context.contentResolver.insert(
                android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                contentValues
            )

            uri?.let {
                context.contentResolver.openOutputStream(it)?.use { output ->
                    FileInputStream(videoFile).use { input ->
                        input.copyTo(output)
                    }
                }
            }

        } catch (e: Exception) {
            logger.e("Error adding video to gallery", e)
        }
    }

    private fun updateUIBasedOnCapabilities() {
        // Update flash button visibility
        flashButton?.isVisible = hasFlash

        // Update zoom controls
        val hasZoom = camera?.cameraInfo?.zoomState?.value?.maxZoomRatio ?: 1.0f > 1.0f
        zoomSeekBar?.isVisible = hasZoom

        // Update icons based on current state
        updateFlashButtonIcon()
        updateCameraSwitchIcon()
        updateModeUI()
        updateRecordingUI(isRecording)
    }

    private fun updateFlashButtonIcon() {
        flashButton?.setImageResource(
            when (currentFlashMode) {
                ImageCapture.FLASH_MODE_AUTO -> R.drawable.ic_flash_auto
                ImageCapture.FLASH_MODE_ON -> R.drawable.ic_flash_on
                ImageCapture.FLASH_MODE_OFF -> R.drawable.ic_flash_off
                else -> R.drawable.ic_flash_auto
            }
        )
    }

    private fun updateCameraSwitchIcon() {
        switchCameraButton?.setImageResource(
            if (cameraFacing == CameraSelector.LENS_FACING_BACK) {
                R.drawable.ic_camera_front
            } else {
                R.drawable.ic_camera_back
            }
        )
    }

    private fun updateModeUI() {
        modeButton?.setImageResource(
            when (currentMode) {
                CameraMode.PHOTO -> R.drawable.ic_camera_photo
                CameraMode.VIDEO -> R.drawable.ic_camera_video
                CameraMode.SCAN -> R.drawable.ic_camera_scan
                CameraMode.PORTRAIT -> R.drawable.ic_camera_portrait
                CameraMode.NIGHT -> R.drawable.ic_camera_night
            }
        )

        // Update capture button based on mode
        captureButton?.setImageResource(
            when (currentMode) {
                CameraMode.VIDEO -> if (isRecording) R.drawable.ic_stop else R.drawable.ic_record
                else -> R.drawable.ic_camera
            }
        )
    }

    private fun updateRecordingUI(recording: Boolean) {
        captureButton?.setImageResource(
            if (recording) R.drawable.ic_stop else R.drawable.ic_record
        )

        // Show/hide recording indicator
        val recordingIndicator = overlayView?.findViewById<View>(R.id.recording_indicator)
        recordingIndicator?.isVisible = recording
    }

    // Sensor listeners

    private fun startSensors() {
        sensorManager.registerListener(
            this,
            accelerometer,
            SensorManager.SENSOR_DELAY_UI
        )
        sensorManager.registerListener(
            this,
            magnetometer,
            SensorManager.SENSOR_DELAY_UI
        )
    }

    private fun stopSensors() {
        sensorManager.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            gravity = event.values.clone()
        } else if (event.sensor.type == Sensor.TYPE_MAGNETIC_FIELD) {
            geomagnetic = event.values.clone()
        }

        if (gravity != null && geomagnetic != null) {
            val rotationMatrix = FloatArray(9)
            if (SensorManager.getRotationMatrix(rotationMatrix, null, gravity, geomagnetic)) {
                val orientation = FloatArray(3)
                SensorManager.getOrientation(rotationMatrix, orientation)
                rotation = Math.toDegrees(orientation[0].toDouble()).toFloat()

                // Update UI based on rotation if needed
                updateUIForRotation()
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {
        // Not implemented
    }

    private fun updateUIForRotation() {
        // Update UI elements based on device rotation
        // This can be used for auto-rotating controls or optimizing layout
    }

    // Setters for listeners

    fun setOnPhotoCapturedListener(listener: (File) -> Unit) {
        onPhotoCapturedListener = listener
    }

    fun setOnVideoRecordedListener(listener: (File) -> Unit) {
        onVideoRecordedListener = listener
    }

    fun setOnErrorListener(listener: (String) -> Unit) {
        onErrorListener = listener
    }

    fun setOnModeChangedListener(listener: (CameraMode) -> Unit) {
        onModeChangedListener = listener
    }
}