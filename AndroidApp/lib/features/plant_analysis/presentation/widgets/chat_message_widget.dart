import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../pages/ai_chat_page.dart';

class ChatMessageWidget extends StatelessWidget {
  final ChatMessage message;

  const ChatMessageWidget({
    super.key,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: message.isUser
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        children: [
          if (!message.isUser) ...[
            // AI Avatar
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.smart_toy,
                color: Colors.white,
                size: 16,
              ),
            ),
            const SizedBox(width: 12),
          ],

          // Message content
          Flexible(
            child: Column(
              crossAxisAlignment: message.isUser
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                Container(
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.75,
                  ),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: message.isUser
                        ? Theme.of(context).primaryColor
                        : Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Attached images
                      if (message.attachedImages != null &&
                          message.attachedImages!.isNotEmpty) ...[
                        _buildAttachedImages(context, message.attachedImages!),
                        const SizedBox(height: 8),
                      ],

                      // Message text with markdown-like formatting
                      _buildMessageContent(context, message.content),

                      // Analysis context indicator
                      if (message.analysisContext != null) ...[
                        const SizedBox(height: 8),
                        _buildAnalysisContext(context, message.analysisContext!),
                      ],

                      // Sensor data indicator
                      if (message.sensorData != null) ...[
                        const SizedBox(height: 8),
                        _buildSensorData(context, message.sensorData!),
                      ],

                      // Timestamp
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            DateFormat('HH:mm').format(message.timestamp),
                            style: TextStyle(
                              fontSize: 10,
                              color: message.isUser
                                  ? Colors.white.withOpacity(0.7)
                                  : Colors.grey[500],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          if (message.isUser) ...[
            const SizedBox(width: 12),
            // User Avatar
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.person,
                color: Colors.white,
                size: 16,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAttachedImages(BuildContext context, List<File> images) {
    return SizedBox(
      height: 100,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: images.length,
        itemBuilder: (context, index) {
          final image = images[index];
          return Container(
            width: 80,
            height: 80,
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              color: Colors.grey[200],
            ),
            child: ClipRRect(
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
          );
        },
      ),
    );
  }

  Widget _buildMessageContent(BuildContext context, String content) {
    // Parse content for special formatting
    final formattedContent = _formatContent(content);

    return GestureDetector(
      onLongPress: () => _copyMessage(context, content),
      child: SelectableText.rich(
        TextSpan(
          style: TextStyle(
            color: message.isUser
                ? Colors.white
                : Theme.of(context).textTheme.bodyMedium?.color,
            ),
            children: formattedContent,
        ),
      ),
    );
  }

  Widget _buildAnalysisContext(BuildContext context, dynamic analysis) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.analytics,
            color: Colors.blue,
            size: 16,
          ),
          const SizedBox(width: 4),
          Text(
            'Analysis: ${analysis.result.overallHealth}',
            style: TextStyle(
              fontSize: 11,
              color: Colors.blue,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSensorData(BuildContext context, dynamic sensorData) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.green.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.sensors,
            color: Colors.green,
            size: 16,
          ),
          const SizedBox(width: 4),
          Text(
            'Temp: ${sensorData.temperature.toStringAsFixed(1)}°F, pH: ${sensorData.ph.toStringAsFixed(1)}',
            style: TextStyle(
              fontSize: 11,
              color: Colors.green,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  List<TextSpan> _formatContent(String content) {
    final children = <TextSpan>[];
    final lines = content.split('\n');

    for (int i = 0; i < lines.length; i++) {
      final line = lines[i];

      if (i > 0) {
        children.add(const TextSpan(text: '\n'));
      }

      // Handle special formatting
      if (line.startsWith('•') || line.startsWith('-')) {
        // Bullet points
        children.add(TextSpan(
          children: _formatBulletPoint(line),
        ));
      } else if (line.startsWith('**') && line.endsWith('**')) {
        // Bold text
        children.add(TextSpan(
          text: line.substring(2, line.length - 2),
          style: const TextStyle(fontWeight: FontWeight.bold),
        ));
      } else if (line.startsWith('*') && line.endsWith('*')) {
        // Italic text
        children.add(TextSpan(
          text: line.substring(1, line.length - 1),
          style: const TextStyle(fontStyle: FontStyle.italic),
        ));
      } else {
        // Regular text with emoji handling
        children.add(TextSpan(
          children: _formatInlineText(line),
        ));
      }
    }

    return children;
  }

  List<InlineSpan> _formatBulletPoint(String line) {
    final parts = line.substring(1).trim().split(' ');
    final children = <InlineSpan>[];

    // Add bullet
    children.add(const WidgetSpan(
      child: Padding(
        padding: EdgeInsets.only(right: 4),
        child: Text('•', style: TextStyle(fontSize: 14)),
      ),
    ));

    // Add formatted parts
    String currentText = '';
    for (final part in parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        if (currentText.isNotEmpty) {
          children.add(TextSpan(text: currentText));
          currentText = '';
        }
        children.add(TextSpan(
          text: part.substring(2, part.length - 2),
          style: const TextStyle(fontWeight: FontWeight.bold),
        ));
      } else {
        currentText += (currentText.isEmpty ? '' : ' ') + part;
      }
    }

    if (currentText.isNotEmpty) {
      children.add(TextSpan(text: currentText));
    }

    return children;
  }

  List<InlineSpan> _formatInlineText(String text) {
    final children = <InlineSpan>[];
    final parts = text.split(' ');

    for (final part in parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        children.add(TextSpan(
          text: part.substring(2, part.length - 2),
          style: const TextStyle(fontWeight: FontWeight.bold),
        ));
      } else if (part.startsWith('*') && part.endsWith('*')) {
        children.add(TextSpan(
          text: part.substring(1, part.length - 1),
          style: const TextStyle(fontStyle: FontStyle.italic),
        ));
      } else {
        children.add(TextSpan(text: part));
      }
    }

    return children;
  }

  void _copyMessage(BuildContext context, String content) {
    Clipboard.setData(ClipboardData(text: content));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Message copied to clipboard'),
        duration: Duration(seconds: 1),
      ),
    );
  }
}