import 'package:flutter/material.dart';
import 'dart:math' as math';

class SuggestedQuestionsWidget extends StatefulWidget {
  final Function(String) onQuestionSelected;

  const SuggestedQuestionsWidget({
    super.key,
    required this.onQuestionSelected,
  });

  @override
  State<SuggestedQuestionsWidget> createState() => _SuggestedQuestionsWidgetState();
}

class _SuggestedQuestionsWidgetState extends State<SuggestedQuestionsWidget>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late List<Animation<double>> _animations;

  final List<String> _questions = [
    'My plant has yellow leaves, what should I do?',
    'When is the best time to harvest?',
    'What are the signs of nutrient burn?',
    'How do I identify spider mites?',
    'What pH level should I maintain?',
    'My plant isn\'t growing, what\'s wrong?',
    'How much light do cannabis plants need?',
  ];

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _animations = List.generate(
      _questions.length,
      (index) => Tween<double>(
        begin: 0.0,
        end: 1.0,
      ).animate(
        CurvedAnimation(
          parent: _animationController,
          curve: Interval(
            index * 0.1,
            math.min(1.0, index * 0.1 + 0.6),
            curve: Curves.easeOut,
          ),
        ),
      ),
    );

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Suggested Questions',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Theme.of(context).primaryColor,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _questions.asMap().entries.map((entry) {
              final index = entry.key;
              final question = entry.value;
              return AnimatedBuilder(
                animation: _animations[index],
                builder: (context, child) {
                  return SlideTransition(
                    position: _createSlideAnimation(_animations[index]),
                    child: _buildQuestionChip(question),
                  );
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionChip(String question) {
    return ActionChip(
      avatar: Icon(
        _getQuestionIcon(question),
        size: 16,
        color: Colors.white,
      ),
      label: Text(
        question.length > 50 ? '${question.substring(0, 47)}...' : question,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
      backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
      side: BorderSide(
        color: Theme.of(context).primaryColor.withOpacity(0.3),
      ),
      onPressed: () => onQuestionSelected(question),
      elevation: 2,
    );
  }

  SlideTransition _createSlideAnimation(Animation<double> animation) {
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0, 1),
        end: Offset.zero,
      ).animate(CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutBack,
      )),
      child: const SizedBox(),
    );
  }

  IconData _getQuestionIcon(String question) {
    final lowerQuestion = question.toLowerCase();

    if (lowerQuestion.contains('yellow')) {
      return Icons.warning;
    } else if (lowerQuestion.contains('harvest')) {
      return Icons.agriculture;
    } else if (lowerQuestion.contains('nutrient')) {
      return Icons.eco;
    } else if (lowerQuestion.contains('pest') || lowerQuestion.contains('mites')) {
      return Icons.bug_report;
    } else if (lowerQuestion.contains('ph')) {
      return Icons.science;
    } else if (lowerQuestion.contains('grow')) {
      return Icons.trending_up;
    } else if (lowerQuestion.contains('light')) {
      return Icons.lightbulb;
    } else {
      return Icons.help_outline;
    }
  }
}