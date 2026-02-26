# OpenAPI 3.0 Specification - CultivAI Pro Photo Analysis API

## Overview

This document provides the complete OpenAPI 3.0 specification for the CultivAI Pro Photo Analysis API. Use this to generate client SDKs, test with Postman, or understand API capabilities.

## API Information

```yaml
openapi: 3.0.3
info:
  title: CultivAI Pro Photo Analysis API
  description: |
    Comprehensive AI-powered cannabis cultivation analysis API with photo analysis,
    trichome detection, pest/disease identification, and nutrient deficiency diagnosis.

    ## Features
    - Multi-modal plant health analysis
    - High-resolution image processing
    - Trichome maturity assessment
    - Pest and disease detection
    - Nutrient deficiency analysis
    - Environmental factor assessment
    - Harvest readiness prediction

    ## Authentication
    Configure AI providers (OpenRouter or LM Studio) in Settings.
    No API key required for this API itself.

    ## Rate Limiting
    - 20 requests per 15-minute window
    - Rate limit headers included in responses
    - Contact support for higher limits

  version: 4.0.0
  contact:
    name: CultivAI Pro Support
    email: support@cultivaipro.com
    url: https://cultivaipro.com/support
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: https://api.cultivaipro.com/v1
    description: Production server
  - url: http://localhost:3000/api
    description: Local development server
tags:
  - name: photo-analysis
    description: Plant health photo analysis endpoints
  - name: trichome-analysis
    description: Trichome maturity analysis endpoints
  - name: plant-management
    description: Plant management operations
  - name: analytics
    description: Analytics and reporting endpoints
  - name: history
    description: Analysis history and tracking
security:
  - ApiKeyAuth: []
paths:
```

## Photo Analysis Endpoints

### Analyze Plant Photo

```yaml
  /analyze:
    post:
      tags:
        - photo-analysis
      summary: Analyze plant health from photo
      description: |
        Comprehensive AI-powered plant health analysis using computer vision and
        expert knowledge. Analyzes photos for diseases, pests, nutrient deficiencies,
        environmental stress, and provides treatment recommendations.

        ## Features
        - Multi-modal AI analysis (text + image)
        - Nutrient deficiency detection
        - Pest and disease identification
        - Purple strain vs deficiency differentiation
        - Environmental stress assessment
        - Treatment recommendations with exact dosages
        - Confidence scoring
        - Analysis history tracking

        ## Process Flow
        1. Validate input and check rate limits
        2. Process and optimize uploaded image
        3. Generate comprehensive diagnostic prompt
        4. Execute AI analysis via configured provider
        5. Parse and validate AI response
        6. Enhance with metadata and validation
        7. Store in database for history
        8. Return structured analysis results
      operationId: analyzePlantPhoto
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AnalysisRequest'
            example:
              plantId: "plant_123"
              strain: "Granddaddy Purple"
              leafSymptoms: "Yellowing on lower leaves starting from tips, moving inward"
              phLevel: 6.2
              temperature: 72
              humidity: 55
              medium: "Coco Coir"
              growthStage: "Flowering Week 5"
              temperatureUnit: "F"
              plantImage: "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
              pestDiseaseFocus: "Nutrient deficiency"
              urgency: "medium"
              additionalNotes: "Started noticing symptoms 3 days ago"
      responses:
        '200':
          description: Analysis completed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AnalysisSuccessResponse'
              example:
                success: true
                analysis:
                  diagnosis: "Nitrogen Deficiency (Early Stage)"
                  confidence: 92
                  severity: "mild"
                  healthScore: 72
                  symptomsMatched:
                    - "Yellowing pattern on lower leaves"
                    - "Chlorosis between veins"
                    - "Progressive upward movement"
                  causes:
                    - "Insufficient nitrogen in current feeding schedule"
                    - "pH at upper range reducing N uptake"
                  treatment:
                    - "Apply nitrogen supplement: 1-2ml/L of 20-5-5 fertilizer"
                    - "Water with pH 6.0-6.5 solution"
                    "priorityActions":
                    - "Increase nitrogen immediately"
                    - "Check pH and adjust if needed"
                  urgency: "medium"
                  imageInfo:
                    originalSize: 5242880
                    compressedSize: 1048576
                    dimensions: "1200x1200"
                    format: "jpeg"
                metadata:
                  analysisId: "analysis_456"
                  processingTime: 3240
                  timestamp: "2025-11-26T10:30:00Z"
                  provider: "openrouter"
                rateLimit:
                  limit: 20
                  remaining: 19
                  window: 15
        '400':
          $ref: '#/components/responses/ValidationError'
        '429':
          $ref: '#/components/responses/RateLimitError'
        '503':
          $ref: '#/components/responses/AIProviderUnavailable'
        '500':
          $ref: '#/components/responses/InternalError'
    get:
      tags:
        - photo-analysis
      summary: Check analyze service status
      description: |
        Returns current status of the plant analysis service and available features.
        Use to verify service is operational before submitting analysis requests.
      operationId: getAnalyzeStatus
      responses:
        '200':
          description: Service status information
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ServiceStatus'
              example:
                success: true
                message: "Plant analysis service is running"
                buildMode: "server"
                supportedFeatures:
                  aiAnalysis: true
                  purpleDetection: true
                  imageProcessing: true
                  multiProviderSupport: true
                  realTimeProcessing: true
                  requiresAIProvider: true
```

### Get Plant Analyses

```yaml
  /plants/{plantId}/analyses:
    get:
      tags:
        - plant-management
      summary: Get analysis history for a plant
      description: |
        Retrieves all previous analyses for a specific plant, ordered by creation date (newest first).
        Limited to 20 most recent analyses by default.
      operationId: getPlantAnalyses
      parameters:
        - name: plantId
          in: path
          required: true
          description: Unique plant identifier
          schema:
            type: string
            example: "plant_123"
      responses:
        '200':
          description: List of plant analyses
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/PlantAnalysis'
        '404':
          $ref: '#/components/responses/NotFound'
```

## Trichome Analysis Endpoints

### Analyze Trichome Maturity

```yaml
  /trichome-analysis:
    post:
      tags:
        - trichome-analysis
      summary: Analyze trichome maturity for harvest timing
      description: |
        Specialized AI-powered trichome maturity analysis for determining optimal harvest timing.
        Requires high-magnification images (100x minimum) from microscope or macro lens.

        ## Trichome Science
        - Clear trichomes: 0-10% amber, too early
        - Cloudy trichomes: Peak THC production
        - Amber trichomes: 70-100%, CBN production, sedative effects

        ## Requirements
        - Minimum 100x magnification (microscope recommended)
        - Sharp focus on trichome heads
        - Even lighting without glare
        - High resolution (2MP minimum)
      operationId: analyzeTrichomes
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TrichomeAnalysisRequest'
            example:
              imageData: "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
              deviceInfo:
                deviceId: "microscope_001"
                label: "Dino-Lite AM3113"
                mode: "microscope"
                resolution:
                  width: 1920
                  height: 1080
                magnification: 200
                deviceType: "USB Microscope"
              analysisOptions:
                focusArea: "trichomes"
                maturityStage: "peak"
                strainType: "hybrid"
                enableCounting: true
                enableMaturityAssessment: true
                enableHarvestReadiness: true
      responses:
        '200':
          description: Trichome analysis completed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrichomeAnalysisResponse'
              example:
                success: true
                analysis:
                  trichomeAnalysis:
                    overallMaturity:
                      stage: "mixed"
                      percentage: 45
                      confidence: 0.88
                      recommendation: "Peak harvest window - harvest within 3-5 days"
                    trichomeDistribution:
                      clear: 15
                      cloudy: 65
                      amber: 20
                      density: "heavy"
                    harvestReadiness:
                      ready: true
                      recommendation: "Ideal trichome development achieved"
                      estimatedHarvestTime: "3-5 days"
                      peakDays: 4
                    detailedFindings:
                      - type: "trichome"
                        description: "Healthy capitate-stalked trichomes with full development"
                        severity: "low"
                        confidence: 0.92
                        location: "flower surface"
                  technicalAnalysis:
                    imageQuality: "excellent"
                    magnificationLevel: "High (200x)"
                    focusQuality: "sharp"
                    lightingCondition: "optimal"
                  recommendations:
                    - "Trichomes at peak maturity - harvest within 3-5 days"
                    - "Monitor daily for over-maturity"
                    - "Prepare drying/curing space"
                timestamp: "2025-11-26T10:30:00Z"
        '400':
          $ref: '#/components/responses/ValidationError'
        '429':
          $ref: '#/components/responses/RateLimitError'
    get:
      tags:
        - trichome-analysis
      summary: Get trichome analysis capabilities
      description: |
        Returns information about supported devices, analysis options, and performance metrics
        for trichome analysis.
      operationId: getTrichomeCapabilities
      responses:
        '200':
          description: Trichome analysis capabilities
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrichomeCapabilities'
```

## Analytics Endpoints

### Plant Health Analytics

```yaml
  /analytics/plant-health:
    get:
      tags:
        - analytics
      summary: Get plant health analytics
      description: |
        Retrieve aggregated plant health analytics including trends, status distribution,
        and top issues over a specified timeframe.
      operationId: getPlantHealthAnalytics
      parameters:
        - name: timeframe
          in: query
          description: Time period for analytics
          schema:
            type: string
            enum: [7d, 30d, 90d]
            default: 7d
        - name: plantId
          in: query
          description: Optional specific plant filter
          schema:
            type: string
      responses:
        '200':
          description: Plant health analytics
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlantHealthAnalytics'
    post:
      tags:
        - analytics
      summary: Create plant health analytics record
      description: |
        Store a new plant health analytics record after analysis completion.
        Usually called internally after analysis.
      operationId: createPlantHealthAnalytics
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateAnalyticsRequest'
      responses:
        '201':
          description: Analytics record created
        '400':
          $ref: '#/components/responses/ValidationError'
```

## History Endpoints

### Analysis History

```yaml
  /history:
    get:
      tags:
        - history
      summary: Get analysis history
      description: |
        Retrieve all analysis history entries across all plants.
        Returns chronological list with most recent first.
      operationId: getAnalysisHistory
      responses:
        '200':
          description: Analysis history
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HistoryResponse'
    post:
      tags:
        - history
      summary: Save analysis to history
      description: |
        Manually save an analysis result to history.
        Typically done automatically after analysis completion.
      operationId: saveAnalysisHistory
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SaveHistoryRequest'
      responses:
        '201':
          description: Analysis saved to history
        '400':
          $ref: '#/components/responses/ValidationError'
    delete:
      tags:
        - history
      summary: Delete analysis from history
      description: |
        Remove a specific analysis entry from history by ID.
      operationId: deleteAnalysisHistory
      parameters:
        - name: id
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Analysis deleted successfully
        '404':
          $ref: '#/components/responses/NotFound'
```

## Components

### Schemas

```yaml
components:
  schemas:
    AnalysisRequest:
      type: object
      required:
        - strain
        - leafSymptoms
      properties:
        plantId:
          type: string
          description: Optional plant identifier
          example: "plant_123"
        strain:
          type: string
          description: Cannabis strain name
          example: "Granddaddy Purple"
          minLength: 1
          maxLength: 100
        leafSymptoms:
          type: string
          description: Description of observed symptoms
          example: "Yellowing on lower leaves starting from tips"
          minLength: 1
          maxLength: 1000
        phLevel:
          type: number
          description: Current pH level (runoff or nutrient solution)
          minimum: 0
          maximum: 14
          example: 6.2
        temperature:
          type: number
          description: Grow environment temperature
          example: 72
        humidity:
          type: number
          description: Relative humidity percentage
          minimum: 0
          maximum: 100
          example: 55
        medium:
          type: string
          description: Growing medium
          enum: [soil, coco, hydro, aero]
          example: "Coco Coir"
        growthStage:
          type: string
          description: Current growth stage
          enum: [seedling, vegetative, pre-flower, flower, flush]
          example: "Flowering Week 5"
        temperatureUnit:
          type: string
          enum: [C, F]
          default: F
          description: Temperature unit for temperature field
        plantImage:
          type: string
          format: base64
          description: Base64-encoded image data (JPEG, PNG, WEBP, HEIC)
          maxLength: 52428800
          example: "data:image/jpeg;base64,/9j/4AAQ..."
        pestDiseaseFocus:
          type: string
          description: Specific pest or disease concern
          maxLength: 500
        urgency:
          type: string
          enum: [low, medium, high, critical]
          default: medium
          description: How urgently help is needed
        additionalNotes:
          type: string
          description: Any additional relevant information
          maxLength: 2000

    AnalysisSuccessResponse:
      type: object
      properties:
        success:
          type: boolean
          example: true
        analysis:
          $ref: '#/components/schemas/AnalysisResult'
        imageInfo:
          $ref: '#/components/schemas/ImageInfo'
        metadata:
          $ref: '#/components/schemas/AnalysisMetadata'
        diagnosticCapabilities:
          type: object
        provider:
          type: object
        rateLimit:
          $ref: '#/components/schemas/RateLimitInfo'
        security:
          type: object

    AnalysisResult:
      type: object
      properties:
        diagnosis:
          type: string
          description: Primary diagnosis
          example: "Nitrogen Deficiency (Early Stage)"
        scientificName:
          type: string
          description: Scientific name if applicable
        confidence:
          type: number
          minimum: 0
          maximum: 100
          description: AI confidence score
          example: 92
        severity:
          type: string
          enum: [mild, moderate, severe, critical]
          example: "mild"
        symptomsMatched:
          type: array
          items:
            type: string
          description: List of observed symptoms
        causes:
          type: array
          items:
            type: string
          description: Root causes identified
        treatment:
          type: array
          items:
            type: string
          description: Treatment recommendations
        healthScore:
          type: number
          minimum: 0
          maximum: 100
          description: Overall health score
          example: 72
        strainSpecificAdvice:
          type: string
          description: Strain-tailored recommendations
        reasoning:
          type: array
          items:
            type: object
            properties:
              step:
                type: string
              explanation:
                type: string
              weight:
                type: number
              evidence:
                type: string
        isPurpleStrain:
          type: boolean
          description: Whether plant is genetic purple strain
        purpleAnalysis:
          type: object
          properties:
            isGenetic:
              type: boolean
            isDeficiency:
              type: boolean
            analysis:
              type: string
            anthocyaninLevel:
              type: string
              enum: [low, medium, high]
            recommendedActions:
              type: array
              items:
                type: string
        pestsDetected:
          type: array
          items:
            $ref: '#/components/schemas/PestDetection'
        diseasesDetected:
          type: array
          items:
            $ref: '#/components/schemas/DiseaseDetection'
        nutrientDeficiencies:
          type: array
          items:
            $ref: '#/components/schemas/NutrientDeficiency'
        environmentalFactors:
          type: array
          items:
            $ref: '#/components/schemas/EnvironmentalFactor'
        trichomeAnalysis:
          $ref: '#/components/schemas/TrichomeInfo'
        morphologicalAnalysis:
          type: object
        visualChanges:
          type: object
        urgency:
          type: string
          enum: [low, medium, high, critical]
        priorityActions:
          type: array
          items:
            type: string
        preventativeMeasures:
          type: array
          items:
            type: string
        recommendations:
          type: object
          properties:
            immediate:
              type: array
              items:
                type: string
            shortTerm:
              type: array
              items:
                type: string
            longTerm:
              type: array
              items:
                type: string
        followUpSchedule:
          type: object
        researchReferences:
          type: array
          items:
            type: string
        prognosis:
          type: object
        costEstimates:
          type: object

    PestDetection:
      type: object
      properties:
        name:
          type: string
          description: Common name
          example: "Spider Mites"
        scientificName:
          type: string
          description: Scientific name
          example: "Tetranychus urticae"
        lifeStage:
          type: string
          enum: [egg, larva, adult]
        severity:
          type: string
          enum: [mild, moderate, severe]
        confidence:
          type: number
          minimum: 0
          maximum: 100
        estimatedPopulation:
          type: string
          enum: [low, medium, high, infestation]
        damageType:
          type: string
        treatment:
          type: object
        lifecycleInfo:
          type: object

    DiseaseDetection:
      type: object
      properties:
        name:
          type: string
          description: Disease name
        pathogen:
          type: string
          description: Causal organism
        classification:
          type: string
          enum: [bacterial, fungal, viral, nutritional, environmental]
        severity:
          type: string
          enum: [mild, moderate, severe, critical]
        confidence:
          type: number
          minimum: 0
          maximum: 100
        spreadRisk:
          type: string
          enum: [low, medium, high]
        symptoms:
          type: array
          items:
            type: string
        treatment:
          type: object
        prevention:
          type: object
        prognosis:
          type: string
        timeframe:
          type: string

    NutrientDeficiency:
      type: object
      properties:
        nutrient:
          type: string
          description: Element name
          example: "Nitrogen (N)"
        classification:
          type: string
          enum: [macro, secondary, micro]
        severity:
          type: string
          enum: [mild, moderate, severe, critical]
        confidence:
          type: number
          minimum: 0
          maximum: 100
        currentLevel:
          type: string
          description: Estimated current ppm
        optimalLevel:
          type: string
          description: Optimal range in ppm
        deficiencyPattern:
          type: string
          description: Visual pattern description
        affectedPlantParts:
          type: array
          items:
            type: string
        treatment:
          type: object
          properties:
            supplement:
              type: string
            dosage:
              type: string
              example: "1-2ml/L"
            applicationMethod:
              type: string
              enum: [foliar, soil, hydro]
            frequency:
              type: string
            duration:
              type: string
            precautions:
              type: string

    EnvironmentalFactor:
      type: object
      properties:
        factor:
          type: string
          description: Environmental stressor
        currentValue:
          type: string
        optimalRange:
          type: string
        severity:
          type: string
          enum: [mild, moderate, severe, critical]
        correction:
          type: string
        timeframe:
          type: string
        monitoringFrequency:
          type: string

    TrichomeInfo:
      type: object
      properties:
        isVisible:
          type: boolean
        density:
          type: string
          enum: [light, medium, heavy]
        maturity:
          type: object
          properties:
            clear:
              type: number
              minimum: 0
              maximum: 100
            cloudy:
              type: number
              minimum: 0
              maximum: 100
            amber:
              type: number
              minimum: 0
              maximum: 100
        overallStage:
          type: string
          enum: [early, mid, late, mixed]
        health:
          type: object
        harvestReadiness:
          type: object
          properties:
            ready:
              type: boolean
            daysUntilOptimal:
              type: number
            recommendation:
              type: string
            effects:
              type: string
        confidence:
          type: number
          minimum: 0
          maximum: 100

    TrichomeAnalysisRequest:
      type: object
      required:
        - imageData
        - deviceInfo
      properties:
        imageData:
          type: string
          format: base64
          description: Base64-encoded trichome image
        deviceInfo:
          type: object
          properties:
            deviceId:
              type: string
            label:
              type: string
            mode:
              type: string
              enum: [microscope, mobile, webcam]
            resolution:
              type: object
              properties:
                width:
                  type: integer
                height:
                  type: integer
            magnification:
              type: number
              minimum: 1
            deviceType:
              type: string
        analysisOptions:
          type: object
          properties:
            focusArea:
              type: string
              enum: [general, trichomes, pistils, stigmas]
            maturityStage:
              type: string
              enum: [early, mid, peak, late]
            strainType:
              type: string
              enum: [indica, sativa, hybrid]
            enableCounting:
              type: boolean
            enableMaturityAssessment:
              type: boolean
            enableHarvestReadiness:
              type: boolean

    TrichomeAnalysisResponse:
      type: object
      properties:
        success:
          type: boolean
        analysis:
          type: object
          properties:
            trichomeAnalysis:
              $ref: '#/components/schemas/TrichomeAnalysisResult'
            strainCharacteristics:
              type: object
            technicalAnalysis:
              type: object
              properties:
                imageQuality:
                  type: string
                  enum: [excellent, good, fair, poor]
                magnificationLevel:
                  type: string
                focusQuality:
                  type: string
                  enum: [sharp, adequate, blurry]
                lightingCondition:
                  type: string
                  enum: [optimal, adequate, poor]
            recommendations:
              type: array
              items:
                type: string
        captureInfo:
          type: object
        timestamp:
          type: string
          format: date-time
        requestId:
          type: string

    TrichomeAnalysisResult:
      type: object
      properties:
        overallMaturity:
          type: object
          properties:
            stage:
              type: string
              enum: [clear, cloudy, amber, mixed]
            percentage:
              type: number
              minimum: 0
              maximum: 100
            confidence:
              type: number
              minimum: 0
              maximum: 1
            recommendation:
              type: string
        trichomeDistribution:
          type: object
          properties:
            clear:
              type: number
              minimum: 0
              maximum: 100
            cloudy:
              type: number
              minimum: 0
              maximum: 100
            amber:
              type: number
              minimum: 0
              maximum: 100
            density:
              type: string
              enum: [light, medium, heavy]
        harvestReadiness:
          type: object
          properties:
            ready:
              type: boolean
            recommendation:
              type: string
            estimatedHarvestTime:
              type: string
            peakDays:
              type: number
        detailedFindings:
          type: array
          items:
            type: object
            properties:
              type:
                type: string
                enum: [trichome, pistil, stigma, pest, disease]
              description:
                type: string
              severity:
                type: string
                enum: [low, medium, high, critical]
              confidence:
                type: number
                minimum: 0
                maximum: 1
              location:
                type: string
        metrics:
          type: object
          properties:
            trichomeDensity:
              type: number
              description: Per square mm
            averageTrichomeLength:
              type: number
              description: In micrometers
            pistilHealth:
              type: number
              minimum: 0
              maximum: 100

    ImageInfo:
      type: object
      properties:
        originalSize:
          type: integer
          description: Original file size in bytes
        compressedSize:
          type: integer
          description: Compressed file size in bytes
        dimensions:
          type: string
          description: Width x Height
          example: "1200x1200"
        format:
          type: string
          example: "jpeg"
        originalDimensions:
          type: string
        megapixels:
          type: string
        qualityLevel:
          type: integer
        compressionEfficiency:
          type: string
        isHighResolution:
          type: boolean
        isUltraHighResolution:
          type: boolean

    AnalysisMetadata:
      type: object
      properties:
        analysisId:
          type: string
        processingTime:
          type: integer
          description: Processing time in milliseconds
        timestamp:
          type: string
          format: date-time
        version:
          type: string
        features:
          type: object

    PlantAnalysis:
      type: object
      properties:
        id:
          type: string
        plantId:
          type: string
        request:
          type: object
        result:
          type: object
        provider:
          type: string
        imageInfo:
          type: object
        createdAt:
          type: string
          format: date-time

    ServiceStatus:
      type: object
      properties:
        success:
          type: boolean
        message:
          type: string
        buildMode:
          type: string
          enum: [server, static]
        supportedFeatures:
          type: object

    RateLimitInfo:
      type: object
      properties:
        limit:
          type: integer
        remaining:
          type: integer
        window:
          type: integer
          description: Window in minutes

    PlantHealthAnalytics:
      type: object
      properties:
        healthData:
          type: array
        summary:
          type: object
        plantStats:
          type: object
        topIssues:
          type: array
        timeframe:
          type: string
        dateRange:
          type: object

    CreateAnalyticsRequest:
      type: object
      required:
        - plantId
        - healthScore
        - healthStatus
      properties:
        plantId:
          type: string
        analysisId:
          type: string
        healthScore:
          type: number
        healthStatus:
          type: string
          enum: [excellent, good, fair, poor, critical]
        issues:
          type: object
        recommendations:
          type: object
        confidence:
          type: number

    HistoryResponse:
      type: object
      properties:
        success:
          type: boolean
        history:
          type: array
        count:
          type: integer

    SaveHistoryRequest:
      type: object
      required:
        - strain
        - diagnosis
      properties:
        strain:
          type: string
        diagnosis:
          type: string
        confidence:
          type: number
        healthScore:
          type: number
        notes:
          type: string
        isPurpleStrain:
          type: boolean
        analysisData:
          type: object

    TrichomeCapabilities:
      type: object
      properties:
        supportedDevices:
          type: array
          items:
            type: object
        analysisOptions:
          type: object
        performance:
          type: object

  responses:
    ValidationError:
      description: Invalid request data
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                type: string
                example: "Invalid request format"
              details:
                type: string
              timestamp:
                type: string
                format: date-time
          example:
            success: false
            error: "Invalid request format"
            details: "Validation error"
            timestamp: "2025-11-26T10:30:00Z"

    RateLimitError:
      description: Rate limit exceeded
      headers:
        X-RateLimit-Limit:
          description: Request limit per window
          schema:
            type: integer
        X-RateLimit-Remaining:
          description: Requests remaining
          schema:
            type: integer
        X-RateLimit-Reset:
          description: Time when limit resets
          schema:
            type: integer
        Retry-After:
          description: Seconds to wait before retrying
          schema:
            type: integer
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    AIProviderUnavailable:
      description: AI provider not configured
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                type: object
                properties:
                  type:
                    type: string
                  message:
                    type: string
                  userMessage:
                    type: string
                  recommendations:
                    type: array
                    items:
                      type: string
              setupGuide:
                type: object
              alternatives:
                type: object

    InternalError:
      description: Internal server error
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                type: string
                example: "Internal server error"
              message:
                type: string

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                type: string
                example: "Not found"

  securitySchemes:
    ApiKeyAuth:
      type: http
      scheme: bearer
      description: |
        Authentication is handled through AI provider configuration (OpenRouter API key).
        No additional API key required for this API itself.
```

## Error Codes Reference

| HTTP Code | Error Type | Description | Solution |
|-----------|------------|-------------|----------|
| 200 | Success | Analysis completed successfully | N/A |
| 201 | Created | Resource created successfully | N/A |
| 400 | ValidationError | Invalid request format | Check request schema and validate inputs |
| 404 | NotFound | Requested resource not found | Verify ID or resource exists |
| 413 | ImageError | Image processing failed | Check image format, size, and quality |
| 429 | RateLimitError | Rate limit exceeded (20 req/15min) | Wait for reset or contact support |
| 500 | InternalError | Internal server error | Contact support with request ID |
| 503 | AIProviderUnavailable | No AI providers configured | Configure OpenRouter or LM Studio |

## Rate Limiting

- **Limit**: 20 requests per 15-minute window
- **Window**: Resets every 15 minutes
- **Headers**: Rate limit info included in all responses
- **Behavior**: Requests exceeding limit return 429 status

### Rate Limit Headers

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 19
X-RateLimit-Reset: 1700995200
Retry-After: 900
```

## SDK Generation

### Generate JavaScript SDK

```bash
npx @openapitools/openapi-generator-cli generate \
  -i https://api.cultivaipro.com/openapi.json \
  -g javascript \
  -o ./sdk/javascript \
  --additional-properties=projectName=cultivaipro-sdk
```

### Generate Python SDK

```bash
npx @openapitools/openapi-generator-cli generate \
  -i https://api.cultivaipro.com/openapi.json \
  -g python \
  -o ./sdk/python \
  --additional-properties=packageName=cultivaipro_sdk
```

### Generate TypeScript SDK

```bash
npx @openapitools/openapi-generator-cli generate \
  -i https://api.cultivaipro.com/openapi.json \
  -g typescript-axios \
  -o ./sdk/typescript
```

## Postman Collection

Import the OpenAPI specification into Postman:

1. Open Postman
2. Click Import
3. Select "Link" tab
4. Enter: `https://api.cultivaipro.com/openapi.json`
5. Click Continue
6. Import the collection

### Environment Variables

Set up environment variables in Postman:

```javascript
{
  "base_url": "https://api.cultivaipro.com/v1",
  "plant_id": "your_plant_id",
  "strain": "Granddaddy Purple",
  "temperature": "72",
  "humidity": "55"
}
```

### Example Requests

#### Basic Photo Analysis

```javascript
POST {{base_url}}/analyze
Content-Type: application/json

{
  "plantId": "{{plant_id}}",
  "strain": "{{strain}}",
  "leafSymptoms": "Yellowing on lower leaves",
  "temperature": {{temperature}},
  "humidity": {{humidity}},
  "plantImage": "data:image/jpeg;base64,..."
}
```

#### Trichome Analysis

```javascript
POST {{base_url}}/trichome-analysis
Content-Type: application/json

{
  "imageData": "data:image/jpeg;base64,...",
  "deviceInfo": {
    "deviceId": "microscope_001",
    "label": "Dino-Lite AM3113",
    "mode": "microscope",
    "resolution": { "width": 1920, "height": 1080 },
    "magnification": 200,
    "deviceType": "USB Microscope"
  },
  "analysisOptions": {
    "enableHarvestReadiness": true,
    "enableMaturityAssessment": true
  }
}
```

## Testing

### Automated Testing

```bash
# Run API tests
npm test -- --testPathPattern=api

# Test specific endpoint
npm test -- analyze.test.ts
```

### Manual Testing Checklist

- [ ] Test all endpoints with valid data
- [ ] Verify error handling for invalid inputs
- [ ] Check rate limiting behavior
- [ ] Test image upload with various formats
- [ ] Verify response schemas match specification
- [ ] Test with and without AI provider configured
- [ ] Check analysis confidence scoring
- [ ] Verify history persistence

## Best Practices

1. **Always validate inputs** before sending requests
2. **Handle errors gracefully** with appropriate retry logic
3. **Check rate limit headers** to avoid 429 errors
4. **Use proper image formats** (JPEG, PNG, WEBP, HEIC)
5. **Optimize image size** for faster processing
6. **Provide comprehensive information** for better analysis
7. **Monitor confidence scores** - low confidence indicates uncertainty
8. **Save analysis results** for tracking progress
9. **Follow up regularly** with additional analyses
10. **Keep detailed records** for pattern recognition

## Support

For API support:
- Documentation: https://docs.cultivaipro.com
- Support Email: support@cultivaipro.com
- Community Forum: https://community.cultivaipro.com
- GitHub Issues: https://github.com/cultivaipro/api/issues
