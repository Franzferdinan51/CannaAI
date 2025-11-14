import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../core/models/enhanced_plant_analysis.dart';

class AnalysisExportPage extends StatefulWidget {
  final List<EnhancedPlantAnalysis> analyses;

  const AnalysisExportPage({
    super.key,
    required this.analyses,
  });

  @override
  State<AnalysisExportPage> createState() => _AnalysisExportPageState();
}

class _AnalysisExportPageState extends State<AnalysisExportPage>
    with TickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _reportTitleController = TextEditingController();
  final TextEditingController _reportNotesController = TextEditingController();

  ExportFormat _selectedFormat = ExportFormat.pdf;
  bool _includeImages = true;
  bool _includeCharts = true;
  bool _includeRecommendations = true;
  bool _includeComparison = widget.analyses.length > 1;
  ReportStyle _selectedStyle = ReportStyle.detailed;

  bool _isExporting = false;
  String? _exportProgress;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    // Set default report title
    final now = DateTime.now();
    _reportTitleController.text = 'Plant Analysis Report - ${DateFormat('MMM dd, yyyy').format(now)}';
  }

  @override
  void dispose() {
    _tabController.dispose();
    _reportTitleController.dispose();
    _reportNotesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Export ${widget.analyses.length} Analyses'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Options'),
            Tab(text: 'Preview'),
            Tab(text: 'Export'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOptionsTab(),
          _buildPreviewTab(),
          _buildExportTab(),
        ],
      ),
    );
  }

  Widget _buildOptionsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Report information
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Report Information',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),

                  TextField(
                    controller: _reportTitleController,
                    decoration: const InputDecoration(
                      labelText: 'Report Title',
                      border: OutlineInputBorder(),
                      helperText: 'Title for your exported report',
                    ),
                  ),

                  const SizedBox(height: 16),

                  TextField(
                    controller: _reportNotesController,
                    decoration: const InputDecoration(
                      labelText: 'Report Notes',
                      border: OutlineInputBorder(),
                      helperText: 'Add any additional notes or observations',
                    ),
                    maxLines: 3,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Export format
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Export Format',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),

                  ...ExportFormat.values.map((format) {
                    return RadioListTile<ExportFormat>(
                      title: Text(format.title),
                      subtitle: Text(format.description),
                      value: format,
                      groupValue: _selectedFormat,
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _selectedFormat = value;
                          });
                        }
                      },
                    );
                  }),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Report style
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Report Style',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),

                  ...ReportStyle.values.map((style) {
                    return RadioListTile<ReportStyle>(
                      title: Text(style.title),
                      subtitle: Text(style.description),
                      value: style,
                      groupValue: _selectedStyle,
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _selectedStyle = value;
                          });
                        }
                      },
                    );
                  }),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Include options
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Include in Report',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),

                  CheckboxListTile(
                    title: const Text('Plant Images'),
                    subtitle: const Text('Include full-resolution plant photos'),
                    value: _includeImages,
                    onChanged: (value) {
                      setState(() {
                        _includeImages = value ?? false;
                      });
                    },
                  ),

                  CheckboxListTile(
                    title: const Text('Charts & Graphs'),
                    subtitle: const Text('Include health trend charts and metrics'),
                    value: _includeCharts,
                    onChanged: (value) {
                      setState(() {
                        _includeCharts = value ?? false;
                      });
                    },
                  ),

                  CheckboxListTile(
                    title: const Text('Recommendations'),
                    subtitle: const Text('Include detailed recommendations'),
                    value: _includeRecommendations,
                    onChanged: (value) {
                      setState(() {
                        _includeRecommendations = value ?? false;
                      });
                    },
                  ),

                  if (widget.analyses.length > 1)
                    CheckboxListTile(
                      title: const Text('Comparison Analysis'),
                      subtitle: const Text('Include side-by-side comparison'),
                      value: _includeComparison,
                      onChanged: (value) {
                        setState(() {
                          _includeComparison = value ?? false;
                        });
                      },
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Preview header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _reportTitleController.text,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Generated on ${DateFormat('MMMM dd, yyyy').format(DateTime.now())}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                  if (_reportNotesController.text.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      _reportNotesController.text,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Preview content based on selected style
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Report Preview (${_selectedStyle.title})',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Generate preview content
                  ..._generatePreviewContent(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExportTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Export summary
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Export Summary',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),

                  _buildSummaryRow('Format', _selectedFormat.title),
                  _buildSummaryRow('Style', _selectedStyle.title),
                  _buildSummaryRow('Analyses', '${widget.analyses.length}'),
                  _buildSummaryRow('Include Images', _includeImages ? 'Yes' : 'No'),
                  _buildSummaryRow('Include Charts', _includeCharts ? 'Yes' : 'No'),
                  _buildSummaryRow('Include Recommendations', _includeRecommendations ? 'Yes' : 'No'),
                  if (widget.analyses.length > 1)
                    _buildSummaryRow('Include Comparison', _includeComparison ? 'Yes' : 'No'),

                  const SizedBox(height: 16),

                  // Estimated file size
                  Text(
                    'Estimated File Size: ${_estimateFileSize()}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Export progress
          if (_isExporting) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    const CircularProgressIndicator(),
                    const SizedBox(height: 16),
                    Text(
                      _exportProgress ?? 'Exporting...',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Export actions
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isExporting ? null : _exportToDevice,
                  icon: const Icon(Icons.download),
                  label: const Text('Save to Device'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isExporting ? null : _exportAndShare,
                  icon: const Icon(Icons.share),
                  label: const Text('Share'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isExporting ? null : _scheduleExport,
              icon: const Icon(Icons.schedule),
              label: const Text('Schedule Regular Exports'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.grey[700],
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _generatePreviewContent() {
    switch (_selectedStyle) {
      case ReportStyle.summary:
        return _generateSummaryPreview();
      case ReportStyle.detailed:
        return _generateDetailedPreview();
      case ReportStyle.technical:
        return _generateTechnicalPreview();
    }
  }

  List<Widget> _generateSummaryPreview() {
    return [
      Text(
        'Health Overview',
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.bold,
        ),
      ),
      const SizedBox(height: 8),
      Text(
        'Average Health Score: ${_calculateAverageHealthScore().toStringAsFixed(1)}%',
        style: Theme.of(context).textTheme.bodyMedium,
      ),
      Text(
        'Total Issues: ${_calculateTotalIssues()}',
        style: Theme.of(context).textTheme.bodyMedium,
      ),
      const SizedBox(height: 16),

      // Show first few analyses
      ...widget.analyses.take(3).map((analysis) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            children: [
              Text(
                DateFormat('MM/dd').format(analysis.timestamp),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  analysis.result.overallHealth,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: _getHealthColor(analysis.result.healthStatus),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Text(
                '${(analysis.result.confidence * 100).toInt()}%',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        );
      }),
    ];
  }

  List<Widget> _generateDetailedPreview() {
    return [
      Text(
        'Detailed Analysis Preview',
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.bold,
        ),
      ),
      const SizedBox(height: 8),
      ...widget.analyses.take(2).map((analysis) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Analysis from ${DateFormat('MMM dd, yyyy').format(analysis.timestamp)}',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Health Status: ${analysis.result.healthStatus.name}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              Text(
                'Confidence: ${(analysis.result.confidence * 100).toInt()}%',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              if (_includeRecommendations && analysis.result.immediateActions.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  'Recommendations:',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                ...analysis.result.immediateActions.take(2).map((action) {
                  return Padding(
                    padding: const EdgeInsets.only(left: 16, top: 2),
                    child: Text(
                      '• $action',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  );
                }),
              ],
            ],
          ),
        );
      }),
    ];
  }

  List<Widget> _generateTechnicalPreview() {
    return [
      Text(
        'Technical Data Preview',
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.bold,
        ),
      ),
      const SizedBox(height: 8),
      ...widget.analyses.take(2).map((analysis) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Technical Analysis: ${DateFormat('MMM dd').format(analysis.timestamp)}',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              _buildTechnicalMetric('Leaf Color Score', analysis.result.metrics.leafColorScore),
              _buildTechnicalMetric('Leaf Health Score', analysis.result.metrics.leafHealthScore),
              _buildTechnicalMetric('Growth Rate Score', analysis.result.metrics.growthRateScore),
              _buildTechnicalMetric('Overall Vigor Score', analysis.result.metrics.overallVigorScore),
              if (analysis.result.technicalDetails != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Technical Details:',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                ...analysis.result.technicalDetails!.entries.map((entry) {
                  return Padding(
                    padding: const EdgeInsets.only(left: 16, top: 2),
                    child: Text(
                      '${entry.key}: ${entry.value}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  );
                }),
              ],
            ],
          ),
        );
      }),
    ];
  }

  Widget _buildTechnicalMetric(String label, double? value) {
    final score = (value ?? 0.0) * 100;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          Text(
            '${score.toStringAsFixed(1)}%',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  // Helper methods
  double _calculateAverageHealthScore() {
    if (widget.analyses.isEmpty) return 0.0;

    final totalScore = widget.analyses
        .map((a) => a.result.metrics.getOverallHealthScore() ?? 0.0)
        .reduce((a, b) => a + b);

    return (totalScore / widget.analyses.length) * 100;
  }

  int _calculateTotalIssues() {
    return widget.analyses.fold(0, (total, analysis) => total + analysis.result.totalIssuesDetected);
  }

  String _estimateFileSize() {
    int baseSize = 500; // KB
    int imageCount = _includeImages ? widget.analyses.length : 0;
    int imageSizeKB = imageCount * 200; // Estimated 200KB per image

    if (_includeCharts) baseSize += 100;
    if (_includeRecommendations) baseSize += 50;
    if (_includeComparison && widget.analyses.length > 1) baseSize += 150;

    int totalKB = baseSize + imageSizeKB;

    if (_selectedFormat == ExportFormat.pdf) {
      totalKB = (totalKB * 1.5).round();
    }

    if (totalKB < 1024) {
      return '~${totalKB}KB';
    } else {
      return '~${(totalKB / 1024).toStringAsFixed(1)}MB';
    }
  }

  Color _getHealthColor(HealthStatus status) {
    switch (status) {
      case HealthStatus.healthy:
        return Colors.green;
      case HealthStatus.stressed:
        return Colors.orange;
      case HealthStatus.critical:
        return Colors.red;
      case HealthStatus.unknown:
        return Colors.grey;
    }
  }

  // Export methods
  Future<void> _exportToDevice() async {
    await _performExport(share: false);
  }

  Future<void> _exportAndShare() async {
    await _performExport(share: true);
  }

  Future<void> _scheduleExport() async {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Schedule Export'),
        content: const Text('Scheduled export functionality would be implemented here'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _performExport({required bool share}) async {
    setState(() {
      _isExporting = true;
      _exportProgress = 'Preparing report...';
    });

    try {
      // Simulate export process
      await Future.delayed(const Duration(milliseconds: 500));
      setState(() {
        _exportProgress = 'Processing analyses...';
      });

      await Future.delayed(const Duration(milliseconds: 1000));
      setState(() {
        _exportProgress = 'Generating charts...';
      });

      await Future.delayed(const Duration(milliseconds: 800));
      setState(() {
        _exportProgress = 'Creating report...';
      });

      // Generate the report based on selected format
      Uint8List reportData;
      String fileName;
      String mimeType;

      switch (_selectedFormat) {
        case ExportFormat.pdf:
          reportData = await _generatePDFReport();
          fileName = '${_reportTitleController.text.replaceAll(' ', '_')}.pdf';
          mimeType = 'application/pdf';
          break;
        case ExportFormat.csv:
          reportData = await _generateCSVReport();
          fileName = '${_reportTitleController.text.replaceAll(' ', '_')}.csv';
          mimeType = 'text/csv';
          break;
        case ExportFormat.json:
          reportData = await _generateJSONReport();
          fileName = '${_reportTitleController.text.replaceAll(' ', '_')}.json';
          mimeType = 'application/json';
          break;
      }

      setState(() {
        _exportProgress = 'Saving file...';
      });

      // Save to device
      final directory = await getApplicationDocumentsDirectory();
      final file = File('${directory.path}/$fileName');
      await file.writeAsBytes(reportData);

      setState(() {
        _isExporting = false;
        _exportProgress = null;
      });

      if (share) {
        // Share the file
        await Share.shareXFiles(
          [XFile(file.path, mimeType: mimeType)],
          subject: _reportTitleController.text,
        );
      } else {
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Report saved to ${file.path}'),
            action: SnackBarAction(
              label: 'Open',
              onPressed: () => _openFile(file),
            ),
          ),
        );
      }

    } catch (e) {
      setState(() {
        _isExporting = false;
        _exportProgress = null;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Export failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<Uint8List> _generatePDFReport() async {
    // Mock PDF generation - in a real implementation, you'd use a PDF library
    final content = '''
PDF Report: ${_reportTitleController.text}

Generated on: ${DateFormat('yyyy-MM-dd HH:mm:ss').format(DateTime.now())}

${_reportNotesController.text}

Analyses: ${widget.analyses.length}

${widget.analyses.map((analysis) => '''
Analysis from ${DateFormat('yyyy-MM-dd').format(analysis.timestamp)}
Health: ${analysis.result.healthStatus.name}
Confidence: ${(analysis.result.confidence * 100).toInt()}%
Issues: ${analysis.result.totalIssuesDetected}
${_includeRecommendations ? 'Recommendations: ${analysis.result.immediateActions.join(", ")}' : ''}

''').join('\n')}
    ''';

    return Uint8List.fromList(content.codeUnits);
  }

  Future<Uint8List> _generateCSVReport() async {
    final csvContent = StringBuffer();

    // Header
    csvContent.writeln('Date,Health Status,Confidence,Issues,Recommendations');

    // Data rows
    for (final analysis in widget.analyses) {
      final date = DateFormat('yyyy-MM-dd HH:mm:ss').format(analysis.timestamp);
      final health = analysis.result.healthStatus.name;
      final confidence = (analysis.result.confidence * 100).toInt();
      final issues = analysis.result.totalIssuesDetected;
      final recommendations = _includeRecommendations
          ? analysis.result.immediateActions.join('; ')
          : '';

      csvContent.writeln('"$date","$health",$confidence,$issues,"$recommendations"');
    }

    return Uint8List.fromList(csvContent.toString().codeUnits);
  }

  Future<Uint8List> _generateJSONReport() async {
    final reportData = {
      'title': _reportTitleController.text,
      'generatedAt': DateTime.now().toIso8601String(),
      'notes': _reportNotesController.text,
      'options': {
        'includeImages': _includeImages,
        'includeCharts': _includeCharts,
        'includeRecommendations': _includeRecommendations,
        'includeComparison': _includeComparison,
        'style': _selectedStyle.name,
      },
      'analyses': widget.analyses.map((a) => a.toJson()).toList(),
      'summary': {
        'totalAnalyses': widget.analyses.length,
        'averageHealthScore': _calculateAverageHealthScore(),
        'totalIssues': _calculateTotalIssues(),
        'dateRange': {
          'start': widget.analyses.map((a) => a.timestamp).reduce((a, b) => a.isBefore(b) ? a : b).toIso8601String(),
          'end': widget.analyses.map((a) => a.timestamp).reduce((a, b) => a.isAfter(b) ? a : b).toIso8601String(),
        },
      },
    };

    final jsonString = reportData.toString();
    return Uint8List.fromList(jsonString.codeUnits);
  }

  void _openFile(File file) {
    // In a real implementation, you'd use the open_file package
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('File saved at: ${file.path}')),
    );
  }
}

enum ExportFormat {
  pdf('PDF Report', 'Professional document format with images and charts'),
  csv('CSV Data', 'Spreadsheet format for data analysis'),
  json('JSON Data', 'Structured data format for developers');

  const ExportFormat(this.title, this.description);
  final String title;
  final String description;
}

enum ReportStyle {
  summary('Summary', 'Brief overview of key findings and recommendations'),
  detailed('Detailed', 'Comprehensive analysis with full metrics and explanations'),
  technical('Technical', 'Raw data and technical metrics for advanced users');

  const ReportStyle(this.title, this.description);
  final String title;
  final String description;
}