import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class StrainsPage extends ConsumerWidget {
  const StrainsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: const Text('Strain Management'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Search Bar
            Padding(
              padding: const EdgeInsets.all(20),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Search strains...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),

            // Strains List
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  _StrainCard(
                    name: 'Blue Dream',
                    type: 'Hybrid',
                    thc: '17-24%',
                    flowering: '9-10 weeks',
                    description: 'Balanced hybrid known for its calming effects',
                  ),
                  const SizedBox(height: 16),
                  _StrainCard(
                    name: 'Girl Scout Cookies',
                    type: 'Hybrid',
                    thc: '19-28%',
                    flowering: '8-9 weeks',
                    description: 'Popular strain with euphoric and relaxing effects',
                  ),
                  const SizedBox(height: 16),
                  _StrainCard(
                    name: 'OG Kush',
                    type: 'Indica',
                    thc: '20-25%',
                    flowering: '8-9 weeks',
                    description: 'Classic indica with stress-relieving properties',
                  ),
                  const SizedBox(height: 16),
                  _StrainCard(
                    name: 'Sour Diesel',
                    type: 'Sativa',
                    thc: '20-25%',
                    flowering: '10-11 weeks',
                    description: 'Energizing sativa with distinctive diesel aroma',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // Show add strain dialog
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Add New Strain'),
              content: const Text('Strain management coming soon!'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('OK'),
                ),
              ],
            ),
          );
        },
        icon: const Icon(Icons.add),
        label: const Text('Add Strain'),
      ),
    );
  }
}

class _StrainCard extends StatelessWidget {
  final String name;
  final String type;
  final String thc;
  final String flowering;
  final String description;

  const _StrainCard({
    required this.name,
    required this.type,
    required this.thc,
    required this.flowering,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          // Show strain details
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: Text(name),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Type: $type'),
                  Text('THC: $thc'),
                  Text('Flowering: $flowering'),
                  const SizedBox(height: 8),
                  Text(description),
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
        },
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      type,
                      style: const TextStyle(
                        color: Colors.green,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    thc,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                name,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Text(
                'Flowering: $flowering',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colorScheme.primary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}