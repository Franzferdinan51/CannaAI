# Harvest Tracker Tool

## Overview
The Harvest Tracker is a comprehensive harvest management tool that provides detailed tracking, analytics, and management capabilities for cannabis cultivation operations.

## Features

### 📊 Harvest Management
- **Complete Harvest Logging**: Track strain, date, wet/dry weights, quality grades, and cannabinoid profiles
- **Batch Management**: Organize harvests by batch numbers and room locations
- **Plant-Level Tracking**: Monitor yield per plant and plant count metrics
- **Quality Assessment**: Grade harvests from A+ to C with visual indicators

### 📈 Analytics & Insights
- **Yield Trend Analysis**: Visual charts showing yield patterns over time
- **Quality Distribution**: Pie chart breakdown of harvest quality grades
- **Strain Performance**: Compare yields and potency across different strains
- **THC Potency Trends**: Track cannabinoid development across harvests
- **Yield Optimization Insights**: AI-powered recommendations for improving yields

### 🔄 Curing Management
- **Curing Batch Tracking**: Monitor multiple curing batches simultaneously
- **Environmental Monitoring**: Track humidity and temperature during curing
- **Burping Schedule Management**: Automated reminders and schedule tracking
- **Progress Tracking**: Visual progress bars for drying and curing phases
- **Best Practices Guide**: Built-in curing recommendations and guidelines

### 🎯 Key Metrics Tracked
- **Wet to Dry Ratio**: Monitor drying efficiency
- **Yield Per Plant**: Optimize per-plant performance
- **THC/CBD Content**: Track potency across harvests
- **Flowering Time**: Monitor growth cycle duration
- **Terpene Profiles**: Detailed terpene tracking for quality assessment

## User Interface

### Main Dashboard
- **Analytics Overview Cards**: Real-time metrics for total harvested, average yield, THC content, and drying ratio
- **Harvest Grid**: Visual cards showing all harvests with key information and status
- **Filter System**: Filter harvests by status (drying, curing, completed, archived) and strain

### Tabbed Interface
1. **Harvests Tab**: Main harvest listing with detailed cards and status management
2. **Analytics Tab**: Comprehensive charts and insights
3. **Curing Batches Tab**: Dedicated curing management interface

### Interactive Features
- **Status Progression**: Click to advance harvests through drying → curing → completed stages
- **Detailed Views**: Click on any harvest to see comprehensive information
- **Export Functionality**: Download harvest data for external analysis
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Technical Implementation

### Data Structure
```typescript
interface Harvest {
  id: string;
  strain: string;
  harvestDate: string;
  wetWeight: number;
  dryWeight: number;
  quality: 'A+' | 'A' | 'B+' | 'B' | 'C';
  thc: number;
  cbd: number;
  terpenes: string;
  growMethod: 'Indoor' | 'Outdoor' | 'Greenhouse';
  floweringTime: number;
  notes: string;
  status: 'drying' | 'curing' | 'completed' | 'archived';
  // Additional tracking fields...
}
```

### Charts & Visualizations
- **Recharts Integration**: Professional data visualization library
- **Interactive Charts**: Line charts for trends, pie charts for distribution, bar charts for comparisons
- **Responsive Design**: Charts adapt to different screen sizes
- **Custom Styling**: Themed to match the application's emerald/lime color scheme

### State Management
- **React State**: Local state management for harvest data
- **Real-time Updates**: Instant UI updates when adding or modifying harvests
- **Data Persistence**: Ready for backend integration with database storage

## Usage Instructions

### Adding a New Harvest
1. Click the "Log Harvest" button
2. Fill in harvest details including strain, weights, quality, and cannabinoid content
3. Add optional notes and terpene information
4. Click "Log Harvest" to save

### Managing Harvest Status
- **Drying**: Initial phase after harvest (7 days typical)
- **Curing**: Extended curing phase (28 days typical)
- **Completed**: Ready for distribution/sale
- **Archived**: Historical records

### Viewing Analytics
1. Navigate to the "Analytics" tab
2. View yield trends, quality distribution, and strain performance
3. Review optimization insights for improvement recommendations

### Managing Curing Batches
1. Navigate to the "Curing Batches" tab
2. Monitor environmental conditions (humidity, temperature)
3. Track burping schedules and progress
4. Log curing activities and notes

## Integration Points

### Tools Navigation
- **Tools Index**: Listed as primary active tool in the tools suite
- **Breadcrumbs**: Clear navigation path from dashboard → tools → harvest tracker
- **Cross-Tool Integration**: Ready for integration with strain library and nutrient calculator

### Future Enhancements
- **Database Integration**: Connect to backend for persistent storage
- **Photo Upload**: Visual documentation of harvests
- **Inventory Integration**: Link harvests to inventory management
- **Report Generation**: PDF/Excel export functionality
- **Mobile App**: Dedicated mobile interface for field use

## Performance Features

### Optimization
- **Lazy Loading**: Charts and data load efficiently
- **Responsive Design**: Optimized for all device sizes
- **Smooth Animations**: Framer Motion for fluid transitions
- **Error Handling**: Graceful error states and user feedback

### Accessibility
- **Semantic HTML**: Proper structure for screen readers
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG compliant color scheme
- **ARIA Labels**: Comprehensive accessibility labeling

## File Structure
```
src/app/tools/harvest-tracker/
├── page.tsx              # Main component implementation
├── README.md             # This documentation file
```

## Dependencies
- React 19+ with TypeScript
- Framer Motion for animations
- Recharts for data visualization
- shadcn/ui component library
- Lucide React for icons

---

The Harvest Tracker tool provides professional-grade harvest management capabilities that go beyond simple tracking, offering comprehensive analytics, curing management, and optimization insights to help cultivators improve their yields and quality over time.