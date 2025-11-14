import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../../../core/models/enhanced_plant_analysis.dart';
import '../../../../core/models/sensor_data.dart';
import '../widgets/chat_message_widget.dart';
import '../widgets/suggested_questions_widget.dart';
import '../widgets/analysis_context_widget.dart';

class AIChatPage extends ConsumerStatefulWidget {
  const AIChatPage({super.key});

  @override
  ConsumerState<AIChatPage> createState() => _AIChatPageState();
}

class _AIChatPageState extends ConsumerState<AIChatPage>
    with TickerProviderStateMixin {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _imagePicker = ImagePicker();

  List<ChatMessage> _messages = [];
  bool _isTyping = false;
  List<File> _attachedImages = [];
  EnhancedPlantAnalysis? _selectedAnalysis;
  SensorData? _currentSensorData;

  late AnimationController _fabAnimationController;
  late AnimationController _typingAnimationController;
  late Animation<double> _fabAnimation;
  late Animation<double> _typingIndicatorAnimation;

  @override
  void initState() {
    super.initState();
    _fabAnimationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _typingAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    _fabAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _fabAnimationController, curve: Curves.easeInOut),
    );

    _typingIndicatorAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _typingAnimationController, curve: Curves.easeInOut),
    );

    _loadInitialMessages();
    _fabAnimationController.forward();

    // Auto-scroll to bottom
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToBottom();
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _fabAnimationController.dispose();
    _typingAnimationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('AI Cultivation Assistant'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            onPressed: _showContextSelector,
            icon: const Icon(Icons.info_outline),
            tooltip: 'Analysis Context',
          ),
          IconButton(
            onPressed: _clearChat,
            icon: const Icon(Icons.clear_all),
            tooltip: 'Clear Chat',
          ),
        ],
      ),
      body: Column(
        children: [
          // Context bar
          if (_selectedAnalysis != null || _attachedImages.isNotEmpty || _currentSensorData != null)
            _buildContextBar(),

          // Messages list
          Expanded(
            child: _messages.isEmpty
                ? _buildEmptyState()
                : _buildMessagesList(),
          ),

          // Typing indicator
          if (_isTyping) _buildTypingIndicator(),

          // Input area
          _buildInputArea(),
        ],
      ),
      floatingActionButton: _buildFloatingActionButton(),
    );
  }

  Widget _buildContextBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).primaryColor.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Context Available',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Theme.of(context).primaryColor,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              if (_selectedAnalysis != null)
                _buildContextChip(
                  'Analysis',
                  Icons.analytics,
                  () => _showAnalysisDetails(),
                ),
              if (_attachedImages.isNotEmpty)
                _buildContextChip(
                  '${_attachedImages.length} Images',
                  Icons.photo,
                  () => _showAttachedImages(),
                ),
              if (_currentSensorData != null)
                _buildContextChip(
                  'Live Sensors',
                  Icons.sensors,
                  () => _showSensorData(),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildContextChip(String label, IconData icon, VoidCallback onTap) {
    return ActionChip(
      avatar: Icon(icon, size: 16),
      label: Text(label),
      onPressed: onTap,
      backgroundColor: Colors.white,
      side: BorderSide(color: Theme.of(context).primaryColor.withOpacity(0.3)),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.chat_bubble_outline,
                size: 64,
                color: Theme.of(context).primaryColor,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Ask me anything about cultivation!',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'I can help with plant health, nutrients, pests, and more',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),

            // Suggested questions
            SuggestedQuestionsWidget(
              onQuestionSelected: (question) {
                _messageController.text = question;
                _sendMessage();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessagesList() {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _messages.length + 1, // +1 for typing indicator space
      itemBuilder: (context, index) {
        if (index == _messages.length) {
          return const SizedBox(height: 60); // Space for typing indicator
        }
        return ChatMessageWidget(
          message: _messages[index],
        );
      },
    );
  }

  Widget _buildTypingIndicator() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Animated typing dots
          Row(
            children: [
              _buildTypingDot(0),
              const SizedBox(width: 4),
              _buildTypingDot(1),
              const SizedBox(width: 4),
              _buildTypingDot(2),
            ],
          ),
          const SizedBox(width: 12),
          Text(
            'AI Assistant is thinking...',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingDot(int index) {
    return AnimatedBuilder(
      animation: _typingIndicatorAnimation,
      builder: (context, child) {
        final delay = index * 0.2;
        final animationValue = (_typingIndicatorAnimation.value + delay) % 1.0;
        final scale = 0.5 + (math.sin(animationValue * math.pi * 2) * 0.5);

        return Transform.scale(
          scale: scale,
          child: Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor,
              shape: BoxShape.circle,
            ),
          ),
        );
      },
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Attached images preview
          if (_attachedImages.isNotEmpty) ...[
            Container(
              height: 80,
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _attachedImages.length,
                itemBuilder: (context, index) {
                  final image = _attachedImages[index];
                  return Container(
                    width: 60,
                    height: 60,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      color: Colors.grey[200],
                    ),
                    child: Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.file(
                            image,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return const Center(
                                child: Icon(Icons.broken_image),
                              );
                            },
                          ),
                        ),
                        Positioned(
                          top: 0,
                          right: 0,
                          child: GestureDetector(
                            onTap: () => _removeAttachedImage(index),
                            child: Container(
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.close,
                                color: Colors.white,
                                size: 14,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            const Divider(height: 1),
          ],

          // Main input area
          Row(
            children: [
              // Attach image button
              IconButton(
                onPressed: _attachImage,
                icon: Icon(
                  Icons.photo_camera,
                  color: Theme.of(context).primaryColor,
                ),
              ),

              // Attach analysis button
              IconButton(
                onPressed: _attachAnalysis,
                icon: Icon(
                  Icons.analytics,
                  color: Theme.of(context).primaryColor,
                ),
              ),

              // Text field
              Expanded(
                child: TextField(
                  controller: _messageController,
                  decoration: const InputDecoration(
                    hintText: 'Ask about your plants...',
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 8),
                  ),
                  maxLines: null,
                  textCapitalization: TextCapitalization.sentences,
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),

              // Send button
              AnimatedBuilder(
                animation: _fabAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _fabAnimation.value,
                    child: IconButton(
                      onPressed: _messageController.text.trim().isEmpty ? null : _sendMessage,
                      icon: Icon(
                        Icons.send,
                        color: _messageController.text.trim().isEmpty
                            ? Colors.grey
                            : Theme.of(context).primaryColor,
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingActionButton() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Quick actions FAB
        FloatingActionButton.extended(
          onPressed: _showQuickActions,
          icon: const Icon(Icons.speed),
          label: const Text('Quick Actions'),
          backgroundColor: Colors.orange,
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  // Action methods
  void _loadInitialMessages() {
    setState(() {
      _messages = [
        ChatMessage(
          id: '1',
          content: 'Hello! I\'m your AI cultivation assistant. I can help you with:\n\n🌱 Plant health analysis and advice\n🌡 Nutrient deficiency diagnosis\n🐛 Pest and disease identification\n📊 Growth stage guidance\n💡 Environmental recommendations\n\nHow can I help you with your plants today?',
          isUser: false,
          timestamp: DateTime.now().subtract(const Duration(minutes: 1)),
        ),
      ];
    });
  }

  Future<void> _sendMessage() async {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    setState(() {
      _messages.add(ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        content: message,
        isUser: true,
        timestamp: DateTime.now(),
        attachedImages: List.from(_attachedImages),
        analysisContext: _selectedAnalysis,
        sensorData: _currentSensorData,
      ));
      _isTyping = true;
      _messageController.clear();
      _attachedImages.clear();
    });

    _scrollToBottom();
    _typingAnimationController.repeat();

    // Simulate AI response
    await Future.delayed(const Duration(seconds: 2));

    final aiResponse = await _generateAIResponse(message);

    setState(() {
      _messages.add(ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        content: aiResponse,
        isUser: false,
        timestamp: DateTime.now(),
      ));
      _isTyping = false;
    });

    _typingAnimationController.stop();
    _typingAnimationController.reset();
    _scrollToBottom();
  }

  Future<String> _generateAIResponse(String userMessage) async {
    // Simulate AI processing with context awareness
    final contextInfo = <String>[];

    if (_selectedAnalysis != null) {
      contextInfo.add('Analysis: ${_selectedAnalysis!.result.overallHealth} (${(_selectedAnalysis!.result.confidence * 100).toInt()}% confidence)');
      if (_selectedAnalysis!.result.detectedSymptoms.isNotEmpty) {
        contextInfo.add('Symptoms: ${_selectedAnalysis!.result.detectedSymptoms.map((s) => s.symptom).join(", ")}');
      }
    }

    if (_currentSensorData != null) {
      contextInfo.add('Current sensor data - Temp: ${_currentSensorData!.temperature.toStringAsFixed(1)}°F, Humidity: ${_currentSensorData!.humidity.toStringAsFixed(1)}%, pH: ${_currentSensorData!.ph.toStringAsFixed(1)}');
    }

    // Generate contextual response based on user input
    final lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.contains('yellow') || lowerMessage.contains('deficiency')) {
      return '''Based on the context provided, here's what might be causing yellowing:

🔍 **Common Causes of Yellow Leaves:**
• Nitrogen deficiency (most common in veg stage)
• Overwatering or root problems
• pH imbalance
• Natural aging (lower leaves)

💡 **Immediate Actions:**
• Check pH levels (target: 6.0-6.5)
• Verify moisture content in soil
• If using nutrients, check nitrogen levels

🌱 **If this matches your current analysis, I recommend focusing on the nutrient regimen and pH stability.''';
    }

    if (lowerMessage.contains('harvest') || lowerMessage.contains('ready')) {
      return '''🌟 **Harvest Timing Guide:**

For optimal harvest, look for these indicators:

📊 **Trichome Analysis:**
• Clear: Too early
• Cloudy: Peak potency
• Amber: More sedative effect
• Mix: Balanced effects

📅 **Timeline Indicators:**
• 60-70% brown pistils (sativas)
• 90%+ brown pistils (indicas)

🔬 **I recommend checking your trichomes under magnification. The perfect timing depends on your desired effect profile!''';
    }

    if (lowerMessage.contains('pest') || lowerMessage.contains('bug')) {
      return '''🐛 **Pest Management Strategy:**

**Early Detection:**
• Regular inspection (every 2-3 days)
• Check undersides of leaves
• Look for webbing or eggs
• Monitor for sticky residue

**Common Cannabis Pests:**
• Spider mites (most common)
• Aphids
• Thrips
• Fungus gnats

**Treatment Options:**
• Neem oil (organic, preventive)
• Insecticidal soap (safe during veg)
• Beneficial predators (ladybugs)
• Isolate affected plants

**Prevention:**
• Good air circulation
• Proper humidity control
• Quarantine new plants
• Regular cleaning

Would you like more specific advice for a particular pest?''';
    }

    if (lowerMessage.contains('nutrient') || lowerMessage.contains('feed')) {
      return '''🌱 **Nutrient Management Guide:**

**Growth Stage Requirements:**
🌱 **Seedling Stage:**
• Very light nutrients (200-300 ppm)
• Focus on root development
• pH: 6.3-6.5

🌿 **Vegetative Stage:**
• High nitrogen (NPK: 3-1-2)
• 600-1000 ppm
• pH: 6.0-6.5

🌸 **Flowering Stage:**
• Higher phosphorus (NPK: 1-2-3)
• 1000-1500 ppm
• pH: 6.0-6.2

**Signs of Issues:**
• Yellowing = Nitrogen deficiency
• Purple stems = Genetic or phosphorus issue
• Burnt tips = Nutrient burn

Would you like help diagnosing a specific nutrient problem?''';
    }

    // Default response with context awareness
    String contextPrefix = '';
    if (contextInfo.isNotEmpty) {
      contextPrefix = 'Based on the current context: ${contextInfo.join(', ')}\n\n';
    }

    return '''$contextPrefix🌱 **Cultivation Advice:**

I'm here to help with your cannabis cultivation! Based on your plant data and sensor readings, I can provide personalized guidance on:

**Health & Growth:**
• Plant disease diagnosis
• Nutrient deficiency identification
• Growth stage optimization
• Harvest timing

**Environment Control:**
• Temperature & humidity management
• Light schedules and intensity
• Air circulation
• pH and nutrient management

**Troubleshooting:**
• Pest identification and treatment
• Disease prevention
• Recovery strategies
• Problem diagnosis

Feel free to ask specific questions about your plants, upload photos for analysis, or share your sensor data for precise recommendations!

What specific aspect of cultivation would you like help with?''';
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _attachImage() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
        maxWidth: 1024,
        maxHeight: 1024,
      );

      if (image != null) {
        setState(() {
          _attachedImages.add(File(image.path));
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to attach image: $e')),
      );
    }
  }

  Future<void> _attachAnalysis() async {
    // Show analysis selection dialog
    final analyses = ref.read(enhancedPlantAnalysisProvider).analyses;

    if (analyses.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No analyses available. Perform an analysis first.')),
      );
      return;
    }

    final selectedAnalysis = await showDialog<EnhancedPlantAnalysis>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Analysis'),
        content: SizedBox(
          width: double.maxFinite,
          height: 300,
          child: ListView.builder(
            itemCount: analyses.length,
            itemBuilder: (context, index) {
              final analysis = analyses[index];
              return ListTile(
                title: Text('Analysis from ${DateFormat('MMM dd, yyyy').format(analysis.timestamp)}'),
                subtitle: Text('${analysis.result.overallHealth} • ${(analysis.result.confidence * 100).toInt()}% confidence'),
                onTap: () => Navigator.of(context).pop(analysis),
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );

    if (selectedAnalysis != null) {
      setState(() {
        _selectedAnalysis = selectedAnalysis;
      });
    }
  }

  void _removeAttachedImage(int index) {
    setState(() {
      _attachedImages.removeAt(index);
    });
  }

  void _showContextSelector() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Context'),
        content: AnalysisContextWidget(
          analysis: _selectedAnalysis,
          sensorData: _currentSensorData,
          onAnalysisChanged: (analysis) {
            setState(() {
              _selectedAnalysis = analysis;
            });
          },
          onSensorDataChanged: (sensorData) {
            setState(() {
              _currentSensorData = sensorData;
            });
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showAnalysisDetails() {
    if (_selectedAnalysis == null) return;

    // Show detailed analysis information
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Analysis Details'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Date: ${DateFormat('MMM dd, yyyy HH:mm').format(_selectedAnalysis!.timestamp)}'),
              Text('Health Status: ${_selectedAnalysis!.result.overallHealth}'),
              Text('Confidence: ${(_selectedAnalysis!.result.confidence * 100).toInt()}%'),
              if (_selectedAnalysis!.result.detectedSymptoms.isNotEmpty) ...[
                const SizedBox(height: 8),
                const Text('Symptoms:', style: TextStyle(fontWeight: FontWeight.bold)),
                ..._selectedAnalysis!.result.detectedSymptoms.map((symptom) =>
                  Padding(
                    padding: const EdgeInsets.only(left: 16, top: 4),
                    child: Text('• ${symptom.symptom}'),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showAttachedImages() {
    if (_attachedImages.isEmpty) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Attached Images (${_attachedImages.length})'),
        content: SizedBox(
          width: 300,
          height: 200,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: _attachedImages.length,
            itemBuilder: (context, index) {
              final image = _attachedImages[index];
              return Container(
                width: 150,
                margin: const EdgeInsets.only(right: 8),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.file(
                    image,
                    fit: BoxFit.cover,
                  ),
                ),
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showSensorData() {
    if (_currentSensorData == null) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Current Sensor Data'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Temperature: ${_currentSensorData!.temperature.toStringAsFixed(1)}°F'),
            Text('Humidity: ${_currentSensorData!.humidity.toStringAsFixed(1)}%'),
            Text('pH: ${_currentSensorData!.ph.toStringAsFixed(1)}'),
            Text('EC: ${_currentSensorData!.ec.toStringAsFixed(1)} mS/cm'),
            Text('CO2: ${_currentSensorData!.co2.toStringAsFixed(0)} ppm'),
            Text('VPD: ${_currentSensorData!.vpd.toStringAsFixed(1)} kPa'),
            Text('Light Intensity: ${_currentSensorData!.lightIntensity.toStringAsFixed(0)} lux'),
            Text('Updated: ${DateFormat('HH:mm:ss').format(_currentSensorData!.timestamp)}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showQuickActions() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Quick Actions'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo),
              title: const Text('Plant Analysis'),
              subtitle: const Text('Upload photo for health analysis'),
              onTap: () {
                Navigator.of(context).pop();
                _navigateToAnalysis();
              },
            ),
            ListTile(
              leading: const Icon(Icons.speed),
              title: const Text('Live Monitoring'),
              subtitle: const Text('Real-time plant monitoring'),
              onTap: () {
                Navigator.of(context).pop();
                _navigateToLiveVision();
              },
            ),
            ListTile(
              leading: const Icon(Icons.bubble_chart),
              title: const Text('Trichome Analysis'),
              subtitle: const Text('Harvest readiness assessment'),
              onTap: () {
                Navigator.of(context).pop();
                _navigateToTrichomeAnalysis();
              },
            ),
            ListTile(
              leading: const Icon(Icons.sensors),
              title: const Text('Sensor Dashboard'),
              subtitle: const Text('Environmental monitoring'),
              onTap: () {
                Navigator.of(context).pop();
                _navigateToSensorDashboard();
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _clearChat() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Chat History'),
        content: const Text('Are you sure you want to clear all messages?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _messages.clear();
                _attachedImages.clear();
                _selectedAnalysis = null;
                _currentSensorData = null;
                _loadInitialMessages();
              });
              Navigator.of(context).pop();
            },
            child: const Text('Clear'),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
          ),
        ],
      ),
    );
  }

  void _navigateToAnalysis() {
    Navigator.of(context).pushNamed('/plant_analysis');
  }

  void _navigateToLiveVision() {
    Navigator.of(context).pushNamed('/live_vision');
  }

  void _navigateToTrichomeAnalysis() {
    Navigator.of(context).pushNamed('/trichome_analysis');
  }

  void _navigateToSensorDashboard() {
    Navigator.of(context).pushNamed('/dashboard');
  }
}

class ChatMessage {
  final String id;
  final String content;
  final bool isUser;
  final DateTime timestamp;
  final List<File>? attachedImages;
  final EnhancedPlantAnalysis? analysisContext;
  final SensorData? sensorData;

  ChatMessage({
    required this.id,
    required this.content,
    required this.isUser,
    required this.timestamp,
    this.attachedImages,
    this.analysisContext,
    this.sensorData,
  });
}