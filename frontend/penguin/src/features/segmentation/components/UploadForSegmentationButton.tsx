import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Upload } from 'lucide-react';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Label } from '@/shared/components/ui/label';
import { Progress } from '@/shared/components/ui/progress';

export const UploadForSegmentationButton: React.FC = () => {
  const { uploadForSegmentation, isProcessing, progress, progressMessage } = useSegmentationStore();
  const [selectedExample, setSelectedExample] = useState('01');

  const handleUpload = async (): Promise<void> => {
    await uploadForSegmentation(selectedExample);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="example-select">Example Image</Label>
        <Select
          value={selectedExample}
          onValueChange={setSelectedExample}
          disabled={isProcessing}
        >
          <SelectTrigger id="example-select" className="w-full">
            <SelectValue placeholder="Select an example" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="01">Example 01 - Ring</SelectItem>
            <SelectItem value="02">Example 02 - Text</SelectItem>
            <SelectItem value="03">Example 03 - Owl</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleUpload}
        disabled={isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <LoadingSpinner />
            <span>{progressMessage || 'Processing...'}</span>
          </div>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload for Segmentation
          </>
        )}
      </Button>

      {isProcessing && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center" aria-live="polite">
            {progress}% - {progressMessage}
          </p>
        </div>
      )}
    </div>
  );
};
