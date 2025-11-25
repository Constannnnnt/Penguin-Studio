import { useState } from 'react';
import { Button } from './ui/button';
import { Upload } from 'lucide-react';
import { useSegmentationStore } from '@/store/segmentationStore';
import { LoadingSpinner } from './LoadingSpinner';

export const UploadForSegmentationButton: React.FC = () => {
  const { uploadForSegmentation, isProcessing, progress, progressMessage } = useSegmentationStore();
  const [selectedExample, setSelectedExample] = useState('01');

  const handleUpload = async (): Promise<void> => {
    await uploadForSegmentation(selectedExample);
  };

  return (
    <div className="space-y-3">
      <div>
        {/* <label htmlFor="example-select" className="text-sm font-medium mb-2 block">
          Example Image
        </label> */}
        <select
          id="example-select"
          value={selectedExample}
          onChange={(e) => setSelectedExample(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isProcessing}
        >
          <option value="01">Example 01 - Ring</option>
        </select>
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
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {progress}% - {progressMessage}
          </p>
        </div>
      )}
    </div>
  );
};
