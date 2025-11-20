import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectListItem } from './ObjectListItem';
import { useConfigStore } from '@/store/configStore';
import { showSuccess } from '@/lib/errorHandling';

/**
 * List of scene objects with scroll support
 */
export const ObjectList = React.memo(() => {
  const objects = useConfigStore((state) => state.config.objects);
  const selectedObject = useConfigStore((state) => state.selectedObject);
  const setSelectedObject = useConfigStore((state) => state.setSelectedObject);
  const removeObject = useConfigStore((state) => state.removeObject);

  const handleRemove = (index: number): void => {
    removeObject(index);
    showSuccess('Object Removed', `Object ${index + 1} has been removed from the scene`);
  };

  if (objects.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No objects in scene</p>
        <p className="text-xs mt-1">Click "Add Object" to get started</p>
      </div>
    );
  }

  return (
    <div role="region" aria-labelledby="object-list-title">
      <h3 id="object-list-title" className="sr-only">Scene Objects</h3>
      <ScrollArea className="h-48 pr-4">
        <div className="space-y-2">
          {objects.map((obj, index) => (
            <ObjectListItem
              key={index}
              object={obj}
              index={index}
              isSelected={selectedObject === index}
              onSelect={setSelectedObject}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});

ObjectList.displayName = 'ObjectList';
