import { PanelNav } from './PanelNav';
import { PanelContainer } from './PanelContainer';
import { UploadForSegmentationButton } from './UploadForSegmentationButton';

export const GenerationControlsTab: React.FC = () => {
  return (
    <div className="space-y-4">
      <PanelNav />
      <PanelContainer />
      <div className="pt-6 border-t border-border">
        <UploadForSegmentationButton />
      </div>
    </div>
  );
};
