import React, { useState, useEffect } from 'react';
import { Edit, Check, X } from 'lucide-react';
import { type MaskMetadata, useSegmentationStore } from '@/features/segmentation/store/segmentationStore';

interface MetadataSectionProps {
  mask: MaskMetadata;
}

type ObjectMetadata = NonNullable<MaskMetadata['objectMetadata']>;

export const MetadataSection: React.FC<MetadataSectionProps> = ({ mask }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ObjectMetadata>(mask.objectMetadata || {
    description: '',
    location: '',
    relationship: '',
    relative_size: '',
    shape_and_color: '',
    texture: '',
    appearance_details: '',
    orientation: '',
  });
  const { updateMaskMetadata } = useSegmentationStore();

  // Reset form data when the selected object changes
  useEffect(() => {
    setFormData(mask.objectMetadata || {
      description: '',
      location: '',
      relationship: '',
      relative_size: '',
      shape_and_color: '',
      texture: '',
      appearance_details: '',
      orientation: '',
    });
    setIsEditing(false);
  }, [mask]);

  const handleSave = (): void => {
    updateMaskMetadata(mask.mask_id, formData);
    setIsEditing(false);
  };

  const handleCancel = (): void => {
    setFormData(mask.objectMetadata || {
      description: '',
      location: '',
      relationship: '',
      relative_size: '',
      shape_and_color: '',
      texture: '',
      appearance_details: '',
      orientation: '',
    });
    setIsEditing(false);
  };

  const handleChange = (key: string, value: string): void => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const fields = [
    { key: 'description', label: 'Description', value: formData.description },
    { key: 'location', label: 'Location', value: formData.location },
    { key: 'relationship', label: 'Relationship', value: formData.relationship },
    { key: 'relative_size', label: 'Size', value: formData.relative_size },
    { key: 'shape_and_color', label: 'Shape & Color', value: formData.shape_and_color },
    { key: 'texture', label: 'Texture', value: formData.texture },
    { key: 'appearance_details', label: 'Appearance', value: formData.appearance_details },
    { key: 'orientation', label: 'Orientation', value: formData.orientation },
  ].filter(field => field.value && field.value.trim() !== '');

  if (fields.length === 0 && !isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-medium text-foreground">Metadata</h5>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Add metadata"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">No metadata available</p>
      </div>
    );
  }

  // Group fields by category
  const visualFields = [
    { key: 'shape_and_color', label: 'Shape & Color', value: formData.shape_and_color },
    { key: 'texture', label: 'Texture', value: formData.texture },
    { key: 'relative_size', label: 'Size', value: formData.relative_size },
    { key: 'appearance_details', label: 'Appearance', value: formData.appearance_details },
  ];

  const spatialFields = [
    { key: 'location', label: 'Location', value: formData.location },
    { key: 'orientation', label: 'Orientation', value: formData.orientation },
    { key: 'relationship', label: 'Relationship', value: formData.relationship },
  ];

  const hasVisualData = visualFields.some(field => field.value && field.value.trim() !== '');
  const hasSpatialData = spatialFields.some(field => field.value && field.value.trim() !== '');
  const hasDescription = formData.description && formData.description.trim() !== '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-foreground">Description</h5>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSave}
                className="p-1 text-primary hover:text-primary/80 transition-colors"
                title="Save"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Description - Direct input without label since header is "Description" */}
        {(isEditing || hasDescription) && (
          <div>
            {isEditing ? (
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter description..."
                rows={3}
                className="w-full text-sm bg-background border border-border rounded px-3 py-2 focus:border-primary focus:outline-none resize-none"
              />
            ) : (
              <p className="text-sm text-foreground leading-relaxed">{formData.description}</p>
            )}
          </div>
        )}

        {/* Visual Properties */}
        {(isEditing || hasVisualData) && (
          <div>
            <span className="text-[14px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Visual Properties
            </span>
            <div className="grid grid-cols-2 gap-3">
              {visualFields.map(field => (
                (isEditing || (field.value && field.value.trim() !== '')) && (
                  <MetadataField
                    key={field.key}
                    label={field.label}
                    value={field.value}
                    onChange={(val) => handleChange(field.key, val)}
                    isEditing={isEditing}
                  />
                )
              ))}
            </div>
          </div>
        )}

        {/* Spatial Context */}
        {(isEditing || hasSpatialData) && (
          <div>
            <span className="text-[14px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Spatial Context
            </span>
            <div className="grid grid-cols-2 gap-3">
              {spatialFields.map(field => (
                (isEditing || (field.value && field.value.trim() !== '')) && (
                  <MetadataField
                    key={field.key}
                    label={field.label}
                    value={field.value}
                    onChange={(val) => handleChange(field.key, val)}
                    isEditing={isEditing}
                    multiline={field.key === 'relationship'}
                    className={field.key === 'relationship' ? 'col-span-2' : ''}
                  />
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface MetadataFieldProps {
  label: string;
  value?: string;
  onChange: (val: string) => void;
  isEditing: boolean;
  multiline?: boolean;
  className?: string;
}

const MetadataField: React.FC<MetadataFieldProps> = ({
  label,
  value,
  onChange,
  isEditing,
  multiline = false,
  className = ''
}) => {
  if (isEditing) {
    return (
      <div className={className}>
        <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground block mb-1">
          {label}
        </label>
        {multiline ? (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}...`}
            rows={3}
            className="w-full text-xs font-mono bg-background/50 border border-primary/20 rounded-none px-3 py-2 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none transition-colors"
          />
        ) : (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}...`}
            className="w-full text-xs font-mono bg-background/50 border border-primary/20 rounded-none px-3 py-2 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
          />
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground opacity-70">{label}:</span>
      <p className="text-xs text-foreground mt-0.5 leading-relaxed font-mono">{value}</p>
    </div>
  );
};
