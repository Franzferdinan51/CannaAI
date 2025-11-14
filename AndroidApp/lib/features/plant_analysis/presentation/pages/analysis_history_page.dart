import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/models/enhanced_plant_analysis.dart';
import '../../../../core/providers/enhanced_plant_analysis_provider.dart';
import '../widgets/analysis_comparison_widget.dart';
import '../widgets/analysis_export_widget.dart';
import '../widgets/enhanced_analysis_card.dart';

class AnalysisHistoryPage extends ConsumerStatefulWidget {
  const AnalysisHistoryPage({super.key});

  @override
  ConsumerState<AnalysisHistoryPage> createState() => _AnalysisHistoryPageState();
}

class _AnalysisHistoryPageState extends ConsumerState<AnalysisHistoryPage>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late AnimationController _fabAnimationController;
  late AnimationController _filterAnimationController;

  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  String _searchQuery = '';
  List<HealthStatus> _selectedHealthStatuses = [];
  List<AnalysisType> _selectedAnalysisTypes = [];
  List<String> _selectedTags = [];
  SortOption _sortOption = SortOption.dateDescending;

  bool _showFilters = false;
  bool _isSelectionMode = false;
  final Set<String> _selectedAnalyses = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fabAnimationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _filterAnimationController = AnimationController(
      duration: const Duration(milliseconds: 250),
      vsync: this,
    );

    _fabAnimationController.forward();

    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _fabAnimationController.dispose();
    _filterAnimationController.dispose();
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {
      _searchQuery = _searchController.text;
    });
    _applyFilters();
  }

  void _applyFilters() {
    ref.read(enhancedPlantAnalysisProvider.notifier).searchAnalyses(_searchQuery);

    if (_selectedHealthStatuses.isNotEmpty) {
      ref.read(enhancedPlantAnalysisProvider.notifier).filterByHealthStatus(_selectedHealthStatuses);
    }

    if (_selectedAnalysisTypes.isNotEmpty) {
      ref.read(enhancedPlantAnalysisProvider.notifier).filterByAnalysisType(_selectedAnalysisTypes);
    }

    if (_selectedTags.isNotEmpty) {
      ref.read(enhancedPlantAnalysisProvider.notifier).filterByTags(_selectedTags);
    }

    _applySorting();
  }

  void _applySorting() {
    switch (_sortOption) {
      case SortOption.dateAscending:
        ref.read(enhancedPlantAnalysisProvider.notifier).sortByDate(ascending: true);
        break;
      case SortOption.dateDescending:
        ref.read(enhancedPlantAnalysisProvider.notifier).sortByDate(ascending: false);
        break;
      case SortOption.healthAscending:
        ref.read(enhancedPlantAnalysisProvider.notifier).sortByHealthScore(ascending: true);
        break;
      case SortOption.healthDescending:
        ref.read(enhancedPlantAnalysisProvider.notifier).sortByHealthScore(ascending: false);
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final analysisState = ref.watch(enhancedPlantAnalysisProvider);
    final analyses = analysisState.filteredAnalyses;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: NestedScrollView(
        controller: _scrollController,
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            _buildHeader(),
            _buildSearchAndFilterBar(),
            _buildTabs(),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildAnalysesList(analyses),
            _buildBookmarkedAnalyses(),
            _buildStatisticsView(),
          ],
        ),
      ),
      floatingActionButton: _buildFloatingActionButton(),
      floatingActionButtonLocation: FloatingActionButtonLocation.endDocked,
      bottomNavigationBar: _isSelectionMode ? _buildSelectionAppBar() : null,
    );
  }

  Widget _buildHeader() {
    return SliverAppBar(
      expandedHeight: 120,
      floating: false,
      pinned: true,
      backgroundColor: Theme.of(context).primaryColor,
      flexibleSpace: FlexibleSpaceBar(
        title: const Text(
          'Analysis History',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        titlePadding: const EdgeInsets.only(left: 16, bottom: 16),
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Theme.of(context).primaryColor,
                Theme.of(context).primaryColor.withOpacity(0.8),
              ],
            ),
          ),
        ),
      ),
      actions: [
        IconButton(
          onPressed: _showExportDialog,
          icon: const Icon(Icons.download, color: Colors.white),
          tooltip: 'Export Data',
        ),
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert, color: Colors.white),
          onSelected: _handleMenuAction,
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'compare',
              child: Row(
                children: [
                  Icon(Icons.compare, color: Colors.black),
                  SizedBox(width: 12),
                  Text('Compare Analyses'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'bulk_export',
              child: Row(
                children: [
                  Icon(Icons.file_download, color: Colors.black),
                  SizedBox(width: 12),
                  Text('Bulk Export'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'clear_filters',
              child: Row(
                children: [
                  Icon(Icons.clear_all, color: Colors.black),
                  SizedBox(width: 12),
                  Text('Clear Filters'),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSearchAndFilterBar() {
    return SliverToBoxAdapter(
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            // Search bar
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search analyses...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        onPressed: () {
                          _searchController.clear();
                          _onSearchChanged();
                        },
                        icon: const Icon(Icons.clear),
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.grey[100],
              ),
            ),
            const SizedBox(height: 12),

            // Filter toggles
            Row(
              children: [
                TextButton.icon(
                  onPressed: _toggleFilterPanel,
                  icon: AnimatedIcon(
                    icon: AnimatedIcons.menu_close,
                    progress: _filterAnimationController,
                    color: Theme.of(context).primaryColor,
                  ),
                  label: Text(
                    'Filters',
                    style: TextStyle(
                      color: Theme.of(context).primaryColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                _buildFilterChip('All', _selectedHealthStatuses.isEmpty && _selectedAnalysisTypes.isEmpty),
                if (_selectedHealthStatuses.isNotEmpty || _selectedAnalysisTypes.isNotEmpty || _selectedTags.isNotEmpty)
                  _buildFilterChip(
                    '${_selectedHealthStatuses.length + _selectedAnalysisTypes.length + _selectedTags.length}',
                    true,
                  ),
                const Spacer(),
                DropdownButton<SortOption>(
                  value: _sortOption,
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _sortOption = value;
                      });
                      _applySorting();
                    }
                  },
                  items: SortOption.values.map((option) {
                    return DropdownMenuItem(
                      value: option,
                      child: Text(option.label),
                    );
                  }).toList(),
                ),
              ],
            ),

            // Expandable filter panel
            AnimatedSize(
              duration: const Duration(milliseconds: 300),
              child: _showFilters ? _buildFilterPanel() : const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isActive ? Theme.of(context).primaryColor : Colors.grey[200],
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: isActive ? Colors.white : Colors.grey[700],
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildFilterPanel() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        Text(
          'Health Status',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: HealthStatus.values.map((status) {
            final isSelected = _selectedHealthStatuses.contains(status);
            return FilterChip(
              label: Text(status.name),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _selectedHealthStatuses.add(status);
                  } else {
                    _selectedHealthStatuses.remove(status);
                  }
                });
                _applyFilters();
              },
              backgroundColor: Colors.grey[200],
              selectedColor: Theme.of(context).primaryColor.withOpacity(0.2),
              checkmarkColor: Theme.of(context).primaryColor,
            );
          }).toList(),
        ),

        const SizedBox(height: 16),
        Text(
          'Analysis Type',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: AnalysisType.values.map((type) {
            final isSelected = _selectedAnalysisTypes.contains(type);
            return FilterChip(
              label: Text(type.toString().split('.').last),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _selectedAnalysisTypes.add(type);
                  } else {
                    _selectedAnalysisTypes.remove(type);
                  }
                });
                _applyFilters();
              },
              backgroundColor: Colors.grey[200],
              selectedColor: Theme.of(context).primaryColor.withOpacity(0.2),
              checkmarkColor: Theme.of(context).primaryColor,
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildTabs() {
    return SliverToBoxAdapter(
      child: TabBar(
        controller: _tabController,
        labelColor: Theme.of(context).primaryColor,
        unselectedLabelColor: Colors.grey,
        indicatorColor: Theme.of(context).primaryColor,
        tabs: const [
          Tab(text: 'All Analyses'),
          Tab(text: 'Bookmarked'),
          Tab(text: 'Statistics'),
        ],
      ),
    );
  }

  Widget _buildAnalysesList(List<EnhancedPlantAnalysis> analyses) {
    if (analyses.isEmpty) {
      return _buildEmptyState();
    }

    return Column(
      children: [
        // Selection mode header
        if (_isSelectionMode)
          Container(
            padding: const EdgeInsets.all(16),
            color: Theme.of(context).primaryColor.withOpacity(0.1),
            child: Row(
              children: [
                Text(
                  '${_selectedAnalyses.length} selected',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: _selectAllAnalyses,
                  child: const Text('Select All'),
                ),
                TextButton(
                  onPressed: _clearSelection,
                  child: const Text('Clear'),
                ),
              ],
            ),
          ),

        // Analyses list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: analyses.length,
            itemBuilder: (context, index) {
              final analysis = analyses[index];
              final isSelected = _selectedAnalyses.contains(analysis.id);

              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: EnhancedAnalysisCard(
                  analysis: analysis,
                  isSelected: isSelected,
                  isSelectionMode: _isSelectionMode,
                  onTap: () => _handleAnalysisTap(analysis),
                  onLongPress: () => _handleAnalysisLongPress(analysis),
                  onSelectionChanged: (selected) {
                    _toggleAnalysisSelection(analysis.id, selected);
                  },
                  onBookmarkToggle: () => _toggleBookmark(analysis.id),
                  onEdit: () => _editAnalysis(analysis),
                  onDelete: () => _deleteAnalysis(analysis),
                  onCompare: () => _compareAnalyses([analysis]),
                  onExport: () => _exportSingleAnalysis(analysis),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildBookmarkedAnalyses() {
    final bookmarkedAnalyses = ref.read(enhancedPlantAnalysisProvider).analyses
        .where((analysis) => analysis.isBookmarked)
        .toList();

    if (bookmarkedAnalyses.isEmpty) {
      return _buildEmptyState(
        title: 'No Bookmarked Analyses',
        subtitle: 'Bookmark your important analyses for quick access',
        icon: Icons.bookmark_border,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: bookmarkedAnalyses.length,
      itemBuilder: (context, index) {
        final analysis = bookmarkedAnalyses[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: EnhancedAnalysisCard(
            analysis: analysis,
            onTap: () => _showAnalysisDetails(analysis),
            onBookmarkToggle: () => _toggleBookmark(analysis.id),
            onEdit: () => _editAnalysis(analysis),
            onDelete: () => _deleteAnalysis(analysis),
            onCompare: () => _compareAnalyses([analysis]),
            onExport: () => _exportSingleAnalysis(analysis),
          ),
        );
      },
    );
  }

  Widget _buildStatisticsView() {
    final analysisState = ref.read(enhancedPlantAnalysisProvider);
    final analyses = analysisState.analyses;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary cards
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Total Analyses',
                  analyses.length.toString(),
                  Icons.analytics,
                  Colors.blue,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildStatCard(
                  'Bookmarked',
                  analysisState.bookmarkedCount.toString(),
                  Icons.bookmark,
                  Colors.amber,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Health status breakdown
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Health Status Breakdown',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...analysisState.healthStatusCounts.entries.map((entry) {
                    final status = entry.key;
                    final count = entry.value;
                    final percentage = analyses.isNotEmpty ? (count / analyses.length * 100) : 0.0;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: _getHealthColor(status),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              status.name,
                              style: Theme.of(context).textTheme.bodyLarge,
                            ),
                          ),
                          Text(
                            '$count (${percentage.toInt()}%)',
                            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Recent trends
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Recent Activity',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...analysisState.recentAnalyses.take(5).map((analysis) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: _getHealthColor(analysis.result.healthStatus),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  analysis.result.overallHealth,
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Text(
                                  DateFormat('MMM dd, HH:mm').format(analysis.timestamp),
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '${(analysis.result.confidence * 100).toInt()}%',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState({String? title, String? subtitle, IconData? icon}) {
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
                color: Colors.grey[100],
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon ?? Icons.analytics_outlined,
                size: 64,
                color: Colors.grey[400],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              title ?? 'No Analyses Found',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.grey[800],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle ?? 'Start analyzing your plants to see them here',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFloatingActionButton() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (_isSelectionMode) ...[
          FloatingActionButton.extended(
            onPressed: _compareSelectedAnalyses,
            icon: const Icon(Icons.compare),
            label: const Text('Compare'),
            backgroundColor: Colors.green,
          ),
          const SizedBox(height: 16),
        ],
        FloatingActionButton(
          onPressed: _clearFilters,
          child: AnimatedIcon(
            icon: AnimatedIcons.search_ellipsis,
            progress: _fabAnimationController,
          ),
        ),
      ],
    );
  }

  Widget _buildSelectionAppBar() {
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: _exitSelectionMode,
            icon: const Icon(Icons.close, color: Colors.white),
          ),
          const SizedBox(width: 8),
          Text(
            '${_selectedAnalyses.length} selected',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          if (_selectedAnalyses.length >= 2)
            IconButton(
              onPressed: _compareSelectedAnalyses,
              icon: const Icon(Icons.compare_arrows, color: Colors.white),
            ),
          IconButton(
            onPressed: _exportSelectedAnalyses,
            icon: const Icon(Icons.share, color: Colors.white),
          ),
          IconButton(
            onPressed: _deleteSelectedAnalyses,
            icon: const Icon(Icons.delete, color: Colors.white),
          ),
        ],
      ),
    );
  }

  void _toggleFilterPanel() {
    setState(() {
      _showFilters = !_showFilters;
    });

    if (_showFilters) {
      _filterAnimationController.forward();
    } else {
      _filterAnimationController.reverse();
    }
  }

  void _handleAnalysisTap(EnhancedPlantAnalysis analysis) {
    if (_isSelectionMode) {
      _toggleAnalysisSelection(analysis.id, !_selectedAnalyses.contains(analysis.id));
    } else {
      _showAnalysisDetails(analysis);
    }
  }

  void _handleAnalysisLongPress(EnhancedPlantAnalysis analysis) {
    setState(() {
      _isSelectionMode = true;
      _selectedAnalyses.add(analysis.id);
    });
  }

  void _toggleAnalysisSelection(String analysisId, bool selected) {
    setState(() {
      if (selected) {
        _selectedAnalyses.add(analysisId);
      } else {
        _selectedAnalyses.remove(analysisId);
      }

      if (_selectedAnalyses.isEmpty) {
        _isSelectionMode = false;
      }
    });
  }

  void _selectAllAnalyses() {
    final analysisState = ref.read(enhancedPlantAnalysisProvider);
    setState(() {
      _selectedAnalyses = Set.from(analysisState.filteredAnalyses.map((a) => a.id));
    });
  }

  void _clearSelection() {
    setState(() {
      _selectedAnalyses.clear();
      _isSelectionMode = false;
    });
  }

  void _exitSelectionMode() {
    setState(() {
      _selectedAnalyses.clear();
      _isSelectionMode = false;
    });
  }

  void _toggleBookmark(String analysisId) {
    ref.read(enhancedPlantAnalysisProvider.notifier).toggleBookmark(analysisId);
  }

  void _editAnalysis(EnhancedPlantAnalysis analysis) {
    // Show edit dialog for notes
    final controller = TextEditingController(text: analysis.notes);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Notes'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Add notes about this analysis...',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              ref.read(enhancedPlantAnalysisProvider.notifier)
                  .updateAnalysisNotes(analysis.id, controller.text);
              Navigator.of(context).pop();
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _deleteAnalysis(EnhancedPlantAnalysis analysis) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Analysis'),
        content: const Text('Are you sure you want to delete this analysis?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              ref.read(enhancedPlantAnalysisProvider.notifier).deleteAnalysis(analysis.id);
              Navigator.of(context).pop();
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _compareAnalyses(List<EnhancedPlantAnalysis> analyses) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AnalysisComparisonPage(
          analyses: analyses,
        ),
      ),
    );
  }

  void _compareSelectedAnalyses() {
    final analysisState = ref.read(enhancedPlantAnalysisProvider);
    final selectedAnalyses = analysisState.analyses
        .where((analysis) => _selectedAnalyses.contains(analysis.id))
        .toList();

    if (selectedAnalyses.length >= 2) {
      _compareAnalyses(selectedAnalyses);
    }
  }

  void _exportSingleAnalysis(EnhancedPlantAnalysis analysis) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AnalysisExportPage(
          analyses: [analysis],
        ),
      ),
    );
  }

  void _exportSelectedAnalyses() {
    final analysisState = ref.read(enhancedPlantAnalysisProvider);
    final selectedAnalyses = analysisState.analyses
        .where((analysis) => _selectedAnalyses.contains(analysis.id))
        .toList();

    if (selectedAnalyses.isNotEmpty) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => AnalysisExportPage(
            analyses: selectedAnalyses,
          ),
        ),
      );
    }
  }

  void _deleteSelectedAnalyses() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Selected Analyses'),
        content: Text('Are you sure you want to delete ${_selectedAnalyses.length} analyses?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              for (final analysisId in _selectedAnalyses) {
                ref.read(enhancedPlantAnalysisProvider.notifier).deleteAnalysis(analysisId);
              }
              _clearSelection();
              Navigator.of(context).pop();
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _showAnalysisDetails(EnhancedPlantAnalysis analysis) {
    // Navigate to detailed analysis view
    Navigator.of(context).pushNamed(
      '/analysis_details',
      arguments: analysis,
    );
  }

  void _showExportDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Export Options'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.picture_as_pdf),
              title: const Text('PDF Report'),
              subtitle: const Text('Generate detailed PDF report'),
              onTap: () {
                Navigator.of(context).pop();
                _exportToPDF();
              },
            ),
            ListTile(
              leading: const Icon(Icons.table_chart),
              title: const Text('CSV Data'),
              subtitle: const Text('Export analysis data as CSV'),
              onTap: () {
                Navigator.of(context).pop();
                _exportToCSV();
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Image Gallery'),
              subtitle: const Text('Export analyzed images'),
              onTap: () {
                Navigator.of(context).pop();
                _exportImages();
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'compare':
        _compareSelectedAnalyses;
        break;
      case 'bulk_export':
        _exportSelectedAnalyses;
        break;
      case 'clear_filters':
        _clearFilters;
        break;
    }
  }

  void _clearFilters() {
    setState(() {
      _searchController.clear();
      _searchQuery = '';
      _selectedHealthStatuses.clear();
      _selectedAnalysisTypes.clear();
      _selectedTags.clear();
      _showFilters = false;
    });

    ref.read(enhancedPlantAnalysisProvider.notifier).searchAnalyses('');
    _filterAnimationController.reverse();
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

  void _exportToPDF() {
    // Implementation for PDF export
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('PDF export would be implemented here')),
    );
  }

  void _exportToCSV() {
    // Implementation for CSV export
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('CSV export would be implemented here')),
    );
  }

  void _exportImages() {
    // Implementation for image export
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Image export would be implemented here')),
    );
  }
}

enum SortOption {
  dateAscending('Date (Oldest First)'),
  dateDescending('Date (Newest First)'),
  healthAscending('Health (Low to High)'),
  healthDescending('Health (High to Low)');

  const SortOption(this.label);
  final String label;
}