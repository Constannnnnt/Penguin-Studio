import * as React from 'react';
import { useConfigStore } from '@/store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { PanelType } from '@/types';

// Lazy load panel components for better performance 
// const ScenePanel = React.lazy(() => import('@/components/ScenePanel').then(m => ({ default: m.ScenePanel })));
const SceneTab = React.lazy(() => import('@/components/SceneTab').then(m => ({ default: m.SceneTab })));
const CameraPanel = React.lazy(() => import('@/components/CameraPanel').then(m => ({ default: m.CameraPanel })));
const LightingPanel = React.lazy(() => import('@/components/LightingPanel').then(m => ({ default: m.LightingPanel })));
const AestheticsPanel = React.lazy(() => import('@/components/AestheticsPanel').then(m => ({ default: m.AestheticsPanel })));
const MediumPanel = React.lazy(() => import('@/components/MediumPanel').then(m => ({ default: m.MediumPanel })));


interface PanelConfig {
  id: PanelType;
  component: React.ComponentType;
  label: string;
}

const PANEL_COMPONENTS: readonly PanelConfig[] = [
  { id: 'scene', component: SceneTab, label: 'Scene Configuration' },
  // { id: 'enhanced-scene', component: SceneTab, label: 'Scene Configuration' },
  { id: 'camera', component: CameraPanel, label: 'Camera Settings' },
  { id: 'lighting', component: LightingPanel, label: 'Lighting Configuration' },
  { id: 'aesthetics', component: AestheticsPanel, label: 'Aesthetic Configuration' },
  { id: 'medium', component: MediumPanel, label: 'Style & Medium' },
] as const;

export const PanelContainer: React.FC = () => {
  const activePanel = useConfigStore((state) => state.activePanel);
  
  // Use enhanced store panel for enhanced-scene, otherwise use regular store
  const currentActivePanel = activePanel;
  
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [displayPanel, setDisplayPanel] = React.useState(currentActivePanel);

  /**
   * Handle panel transitions with fade effect
   * This ensures smooth visual transitions when switching between panels
   */
  React.useEffect(() => {
    if (currentActivePanel !== displayPanel) {
      setIsTransitioning(true);
      
      // Short delay for fade-out effect
      const timer = setTimeout(() => {
        setDisplayPanel(currentActivePanel);
        setIsTransitioning(false);
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [currentActivePanel, displayPanel]);

  // Find the current panel configuration
  const currentPanelConfig = PANEL_COMPONENTS.find(
    (panel) => panel.id === displayPanel
  );

  if (!currentPanelConfig) {
    return null;
  }

  const PanelComponent = currentPanelConfig.component;

  return (
    <div
      role="tabpanel"
      id={`panel-${displayPanel}`}
      aria-labelledby={`tab-${displayPanel}`}
      aria-label={currentPanelConfig.label}
      tabIndex={0}
      className={`
        transition-opacity duration-150 ease-in-out
        ${isTransitioning ? 'opacity-0' : 'opacity-100'}
        focus:outline-none
      `}
    >
      <React.Suspense fallback={
        <div className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner />
        </div>
      }>
        <PanelComponent />
      </React.Suspense>
    </div>
  );
};
