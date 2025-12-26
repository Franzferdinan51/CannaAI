# CannaAI Pro - Plant Management System

A comprehensive plant management system migrated from the legacy Next.js dashboard to the modern NewUI architecture. This system provides complete functionality for managing cannabis plants, including health tracking, strain management, growth monitoring, and AI-powered analysis.

## Features

### 🌱 Core Plant Management
- **Complete Plant Database**: Track individual plants with comprehensive metadata
- **Growth Stage Management**: Monitor plants through all lifecycle stages (germination to harvest)
- **Health Tracking**: Real-time health scoring and status monitoring
- **Environmental Data**: Integration with sensor data for optimal growing conditions
- **Image Management**: Upload and organize plant photos with analysis capabilities

### 🧬 Strain Database
- **Comprehensive Strain Profiles**: Detailed information for each strain
- **Optimal Growing Conditions**: pH, temperature, humidity, and light requirements
- **Yield Predictions**: Estimated harvest yields based on strain characteristics
- **Purple Strain Detection**: Special handling for purple cannabis varieties

### 📊 Analytics & Monitoring
- **Plant Inventory Dashboard**: Overview of all plants with key metrics
- **Health Trends**: Track plant health over time
- **Growth Analytics**: Monitor growth patterns and stage progression
- **Environmental Monitoring**: Real-time environmental data tracking

### 🤖 AI-Powered Analysis
- **Plant Health Analysis**: AI-driven diagnosis and recommendations
- **Issue Detection**: Early identification of nutrient deficiencies, pests, and diseases
- **Strain-Specific Advice**: Tailored recommendations based on strain characteristics
- **Visual Analysis**: Image-based plant health assessment

### 🔍 Search & Filtering
- **Advanced Search**: Find plants by name, strain, tags, or notes
- **Multi-Criteria Filtering**: Filter by growth stage, health status, location, age
- **Tag System**: Organize plants with custom tags
- **Quick Filters**: Instant access to common filter combinations

### 📋 Task Management
- **Automated Reminders**: Task scheduling for watering, feeding, and maintenance
- **Action Tracking**: Record all plant care activities
- **Workflow Management**: Streamlined plant care workflows

## Architecture

### Component Structure
```
src/components/plants/
├── Plants.tsx                 # Main plant management component
├── components/               # Subcomponents
│   ├── PlantGrid.tsx        # Grid view of plants
│   ├── PlantList.tsx        # List view of plants
│   ├── PlantForm.tsx        # Add/Edit plant form
│   ├── PlantDetails.tsx     # Detailed plant view
│   ├── PlantSearch.tsx      # Search and filtering
│   ├── PlantInventory.tsx   # Inventory dashboard
│   ├── StrainManager.tsx    # Strain database management
│   ├── PlantAnalysis.tsx    # AI analysis interface
│   └── PlantTasks.tsx       # Task management
├── types.ts                 # TypeScript definitions
├── api-client.ts            # API integration layer
├── mock-data.ts            # Sample data and utilities
└── index.ts                # Component exports
```

### Data Flow
1. **API Client**: Handles all server communication with error handling
2. **State Management**: Centralized state using React hooks
3. **Component Architecture**: Modular design with clear separation of concerns
4. **Type Safety**: Comprehensive TypeScript definitions throughout

## Key Components

### Plants (Main Component)
- **Sidebar Navigation**: Quick access to all plant management sections
- **Tab System**: Organized interface with Overview, Plants, Strains, Analysis, etc.
- **Real-time Updates**: Live data refresh and synchronization
- **Error Handling**: Comprehensive error reporting and recovery

### PlantGrid
- **Responsive Grid Layout**: Adapts to different screen sizes
- **Plant Cards**: Rich visual representation with health indicators
- **Quick Actions**: Edit, analyze, and delete functionality
- **Status Indicators**: Health scores, growth stages, and warnings

### PlantForm
- **Comprehensive Form**: All plant data collection fields
- **Image Upload**: Multi-image support with preview
- **Tag Management**: Dynamic tag addition and removal
- **Strain Selection**: Integration with strain database
- **Validation**: Form validation and error handling

### PlantSearch
- **Advanced Filtering**: Multi-criteria search capabilities
- **Real-time Search**: Instant results as you type
- **Filter Persistence**: Maintain filters across sessions
- **Quick Filters**: Predefined filter combinations

## API Integration

### Endpoints
- `GET /api/plants` - Retrieve plant list with filtering
- `POST /api/plants` - Create new plant
- `PUT /api/plants/:id` - Update plant information
- `DELETE /api/plants/:id` - Delete plant
- `GET /api/strains` - Retrieve strain database
- `POST /api/plants/:id/analyze` - Perform AI analysis
- `GET /api/plants/inventory` - Get inventory statistics

### Error Handling
- Comprehensive error catching and reporting
- User-friendly error messages
- Automatic retry for network issues
- Graceful degradation when services are unavailable

## Data Models

### Plant
```typescript
interface Plant {
  id: string;
  name: string;
  strainId: string;
  stage: GrowthStage;
  health: PlantHealth;
  age: number;
  plantedDate: string;
  location: PlantLocation;
  images: PlantImage[];
  notes: string;
  tags: string[];
  isActive: boolean;
  metadata: PlantMetadata;
  createdAt: string;
  updatedAt: string;
}
```

### PlantStrain
```typescript
interface PlantStrain {
  id: string;
  name: string;
  type: StrainType;
  lineage: string;
  description: string;
  isPurpleStrain: boolean;
  optimalConditions: OptimalConditions;
  commonDeficiencies: string[];
  characteristics: StrainCharacteristics;
  growingDifficulty: DifficultyLevel;
  floweringTime: number;
  // ... additional properties
}
```

## Usage

### Basic Setup
```typescript
import { Plants } from '@/components/plants';

function App() {
  return <Plants />;
}
```

### Custom Configuration
```typescript
import { Plants, plantsAPI } from '@/components/plants';

function CustomPlantApp() {
  // Custom API configuration
  plantsAPI.configure({
    baseURL: 'https://your-api.com',
    timeout: 10000
  });

  return <Plants />;
}
```

### Integration with Existing Systems
```typescript
// Custom plant data provider
import { plantsAPI } from '@/components/plants';

plantsAPI.getPlants = async () => {
  // Custom implementation
  return customPlantsService.getPlants();
};
```

## Development

### Mock Data
The system includes comprehensive mock data for development and testing:
- **Default Strains**: 5 detailed strain profiles
- **Sample Plants**: Various plants in different growth stages
- **Environmental Data**: Mock sensor readings
- **Utility Functions**: Helper functions for data manipulation

### Testing
- Unit tests for all components (planned)
- Integration tests for API client (planned)
- E2E tests for user workflows (planned)

### Performance Optimizations
- Lazy loading for large plant collections
- Image optimization and compression
- Debounced search functionality
- Virtual scrolling for large lists (planned)

## Contributing

### Adding New Features
1. Update TypeScript types in `types.ts`
2. Add API methods to `api-client.ts`
3. Create or update components
4. Update mock data if needed
5. Test thoroughly

### Code Style
- TypeScript for type safety
- React hooks for state management
- Tailwind CSS for styling
- Comprehensive error handling
- Documentation for all functions

## Future Enhancements

### Planned Features
- **Mobile App**: React Native companion application
- **Offline Mode**: Local storage for offline functionality
- **Advanced Analytics**: Machine learning insights
- **Integration APIs**: Third-party service integrations
- **Collaboration**: Multi-user plant management
- **Automation**: Smart watering and feeding systems
- **AR Support**: Augmented reality plant visualization

### Technical Improvements
- **Performance**: Further optimization for large datasets
- **Accessibility**: Enhanced accessibility features
- **Internationalization**: Multi-language support
- **PWA**: Progressive Web App capabilities
- **Real-time Sync**: WebSocket real-time updates
- **Cloud Storage**: Cloud backup and sync

## Support

For support, feature requests, or bug reports, please refer to the project documentation or create an issue in the repository.

## License

This project is part of CannaAI Pro and follows the same licensing terms.