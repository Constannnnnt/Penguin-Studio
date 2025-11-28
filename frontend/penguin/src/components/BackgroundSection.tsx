import React, {useEffect} from 'react';
import { useConfigStore } from '@/store/configStore';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDebouncedCallback } from '@/lib/performance';

export const BackgroundSection: React.FC = () => {
  const backgroundSetting = useConfigStore(
    (state) => state.sceneConfig.background_setting
  );
  const updateSceneConfig = useConfigStore(
    (state) => state.updateSceneConfig
  );

  const [localValue, setLocalValue] = React.useState(backgroundSetting);

  const debouncedUpdate = useDebouncedCallback(
    (value: string) => {
      updateSceneConfig('background_setting', value);
    },
    500,
    [updateSceneConfig]
  );

  useEffect(() => {
    setLocalValue(backgroundSetting);
  }, [backgroundSetting]);

  useEffect(() => {
    if (localValue !== backgroundSetting) {
      debouncedUpdate(localValue);
    }
  }, [localValue, backgroundSetting, debouncedUpdate]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label htmlFor="background-setting" className="text-base font-medium">
          Background Setting
        </Label>
        <Textarea
          id="background-setting"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="Describe the background environment..."
          rows={4}
          className="resize-none"
        />
        <p className="text-sm text-muted-foreground">
          Describe the environment, setting, or backdrop for your scene
        </p>
      </div>
    </div>
  );
};
