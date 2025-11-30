import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plant,
  PlantFormData,
  PlantStrain,
  GrowthStage,
  PlantSource,
  GrowthMedium
} from '../types';

// Import UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Import icons
import {
  Upload,
  Camera,
  Calendar,
  MapPin,
  Sprout,
  Hash,
  FileText,
  X,
  Plus
} from 'lucide-react';

interface PlantFormProps {
  plant?: Plant;
  strains: PlantStrain[];
  onSubmit: (data: PlantFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const PlantForm: React.FC<PlantFormProps> = ({
  plant,
  strains,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<PlantFormData>({
    name: '',
    strainId: '',
    stage: 'seedling',
    plantedDate: new Date().toISOString().split('T')[0],
    locationId: '',
    notes: '',
    tags: [],
    images: [],
    metadata: {
      source: 'seed',
      isMotherPlant: false
    }
  });

  const [newTag, setNewTag] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (plant) {
      setFormData({
        name: plant.name,
        strainId: plant.strainId,
        stage: plant.stage,
        plantedDate: plant.plantedDate,
        locationId: plant.location.id,
        notes: plant.notes,
        tags: plant.tags,
        images: [],
        metadata: {
          ...plant.metadata
        }
      });

      if (plant.images && plant.images.length > 0) {
        setImagePreviews(plant.images.map(img => img.url));
      }
    }
  }, [plant]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof PlantFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMetadataChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value
      }
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));

    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card className="bg-[#0f1419] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Sprout className="w-5 h-5 mr-2 text-emerald-400" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-gray-300">Plant Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Blue Dream #1"
                className="bg-[#181b21] border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="strain" className="text-gray-300">Strain *</Label>
              <Select
                value={formData.strainId}
                onValueChange={(value) => handleInputChange('strainId', value)}
              >
                <SelectTrigger className="bg-[#181b21] border-gray-700 text-white">
                  <SelectValue placeholder="Select a strain" />
                </SelectTrigger>
                <SelectContent className="bg-[#181b21] border-gray-700">
                  {strains.map(strain => (
                    <SelectItem key={strain.id} value={strain.id} className="text-white">
                      {strain.name} ({strain.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stage" className="text-gray-300">Growth Stage *</Label>
              <Select
                value={formData.stage}
                onValueChange={(value: GrowthStage) => handleInputChange('stage', value)}
              >
                <SelectTrigger className="bg-[#181b21] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181b21] border-gray-700">
                  <SelectItem value="germination">Germination</SelectItem>
                  <SelectItem value="seedling">Seedling</SelectItem>
                  <SelectItem value="vegetative">Vegetative</SelectItem>
                  <SelectItem value="pre-flowering">Pre-Flowering</SelectItem>
                  <SelectItem value="flowering">Flowering</SelectItem>
                  <SelectItem value="ripening">Ripening</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="plantedDate" className="text-gray-300">Planted Date *</Label>
              <Input
                id="plantedDate"
                type="date"
                value={formData.plantedDate}
                onChange={(e) => handleInputChange('plantedDate', e.target.value)}
                className="bg-[#181b21] border-gray-700 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location" className="text-gray-300">Location</Label>
            <Input
              id="location"
              value={formData.locationId}
              onChange={(e) => handleInputChange('locationId', e.target.value)}
              placeholder="e.g., Room 1, Tent A, Position 1"
              className="bg-[#181b21] border-gray-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-gray-300">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Add any additional notes about this plant..."
              className="bg-[#181b21] border-gray-700 text-white min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Plant Metadata */}
      <Card className="bg-[#0f1419] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Hash className="w-5 h-5 mr-2 text-emerald-400" />
            Plant Metadata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="source" className="text-gray-300">Source</Label>
              <Select
                value={formData.metadata?.source || 'seed'}
                onValueChange={(value: PlantSource) => handleMetadataChange('source', value)}
              >
                <SelectTrigger className="bg-[#181b21] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181b21] border-gray-700">
                  <SelectItem value="seed">Seed</SelectItem>
                  <SelectItem value="clone">Clone</SelectItem>
                  <SelectItem value="tissue">Tissue Culture</SelectItem>
                  <SelectItem value="mother">Mother Plant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="medium" className="text-gray-300">Growing Medium</Label>
              <Select
                value={formData.metadata?.medium || 'soil'}
                onValueChange={(value: GrowthMedium) => handleMetadataChange('medium', value)}
              >
                <SelectTrigger className="bg-[#181b21] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181b21] border-gray-700">
                  <SelectItem value="soil">Soil</SelectItem>
                  <SelectItem value="hydroponic">Hydroponic</SelectItem>
                  <SelectItem value="aeroponic">Aeroponic</SelectItem>
                  <SelectItem value="coco">Coco Coir</SelectItem>
                  <SelectItem value="rockwool">Rockwool</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="expectedYield" className="text-gray-300">Expected Yield (g)</Label>
              <Input
                id="expectedYield"
                type="number"
                value={formData.metadata?.expectedYield || ''}
                onChange={(e) => handleMetadataChange('expectedYield', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 500"
                className="bg-[#181b21] border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isMotherPlant"
              checked={formData.metadata?.isMotherPlant || false}
              onChange={(e) => handleMetadataChange('isMotherPlant', e.target.checked)}
              className="rounded border-gray-700 bg-[#181b21] text-emerald-500"
            />
            <Label htmlFor="isMotherPlant" className="text-gray-300">This is a mother plant</Label>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card className="bg-[#0f1419] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Hash className="w-5 h-5 mr-2 text-emerald-400" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.tags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex space-x-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag..."
              className="bg-[#181b21] border-gray-700 text-white"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button
              type="button"
              onClick={addTag}
              variant="outline"
              className="border-gray-700 text-gray-300"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card className="bg-[#0f1419] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Camera className="w-5 h-5 mr-2 text-emerald-400" />
            Plant Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Plant image ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-700 rounded-lg">
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="text-center">
                  <Upload className="w-6 h-6 mx-auto text-gray-500 mb-1" />
                  <span className="text-xs text-gray-500">Add Images</span>
                </div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-800">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="border-gray-700 text-gray-300"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {plant ? 'Updating...' : 'Creating...'}
            </div>
          ) : (
            <>
              {plant ? 'Update Plant' : 'Create Plant'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default PlantForm;