import { describe, it, expect, beforeEach } from 'vitest';
import { useConfigStore } from '../configStore';

describe('ConfigStore', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    useConfigStore.getState().resetConfig();
  });

  describe('addObject', () => {
    it('should add object to config with default values', () => {
      const { addObject } = useConfigStore.getState();
      const initialLength = useConfigStore.getState().config.objects.length;

      addObject();

      const { config } = useConfigStore.getState();
      expect(config.objects).toHaveLength(initialLength + 1);
      expect(config.objects[0]).toMatchObject({
        description: '',
        location: 'center',
        relative_size: 'medium',
        shape_and_color: '',
        orientation: 'front-facing',
      });
    });

    it('should automatically select the newly added object', () => {
      const { addObject } = useConfigStore.getState();

      addObject();

      const { selectedObject, config } = useConfigStore.getState();
      expect(selectedObject).toBe(config.objects.length - 1);
    });

    it('should add multiple objects correctly', () => {
      const { addObject } = useConfigStore.getState();

      addObject();
      addObject();
      addObject();

      const { config } = useConfigStore.getState();
      expect(config.objects).toHaveLength(3);
    });
  });

  describe('removeObject', () => {
    it('should remove object from config by index', () => {
      const { addObject, removeObject } = useConfigStore.getState();

      addObject();
      addObject();
      const initialLength = useConfigStore.getState().config.objects.length;

      removeObject(0);

      const { config } = useConfigStore.getState();
      expect(config.objects).toHaveLength(initialLength - 1);
    });

    it('should clear selection when removing the selected object', () => {
      const { addObject, removeObject, setSelectedObject } = useConfigStore.getState();

      addObject();
      setSelectedObject(0);

      removeObject(0);

      const { selectedObject } = useConfigStore.getState();
      expect(selectedObject).toBeNull();
    });

    it('should adjust selection index when removing object before selected object', () => {
      const { addObject, removeObject, setSelectedObject } = useConfigStore.getState();

      addObject();
      addObject();
      addObject();
      setSelectedObject(2);

      removeObject(0);

      const { selectedObject } = useConfigStore.getState();
      expect(selectedObject).toBe(1);
    });

    it('should keep selection unchanged when removing object after selected object', () => {
      const { addObject, removeObject, setSelectedObject } = useConfigStore.getState();

      addObject();
      addObject();
      addObject();
      setSelectedObject(0);

      removeObject(2);

      const { selectedObject } = useConfigStore.getState();
      expect(selectedObject).toBe(0);
    });
  });

  describe('updateObject', () => {
    it('should update specific field of an object by index', () => {
      const { addObject, updateObject } = useConfigStore.getState();

      addObject();
      updateObject(0, 'description', 'A red ball');

      const { config } = useConfigStore.getState();
      expect(config.objects[0].description).toBe('A red ball');
    });

    it('should update location field correctly', () => {
      const { addObject, updateObject } = useConfigStore.getState();

      addObject();
      updateObject(0, 'location', 'top-left');

      const { config } = useConfigStore.getState();
      expect(config.objects[0].location).toBe('top-left');
    });

    it('should update relative_size field correctly', () => {
      const { addObject, updateObject } = useConfigStore.getState();

      addObject();
      updateObject(0, 'relative_size', 'large');

      const { config } = useConfigStore.getState();
      expect(config.objects[0].relative_size).toBe('large');
    });

    it('should not affect other objects when updating one object', () => {
      const { addObject, updateObject } = useConfigStore.getState();

      addObject();
      addObject();
      updateObject(0, 'description', 'First object');
      updateObject(1, 'description', 'Second object');

      const { config } = useConfigStore.getState();
      expect(config.objects[0].description).toBe('First object');
      expect(config.objects[1].description).toBe('Second object');
    });
  });

  describe('updateConfig', () => {
    it('should update top-level config value', () => {
      const { updateConfig } = useConfigStore.getState();

      updateConfig('short_description', 'A beautiful scene');

      const { config } = useConfigStore.getState();
      expect(config.short_description).toBe('A beautiful scene');
    });

    it('should update nested config value with dot notation', () => {
      const { updateConfig } = useConfigStore.getState();

      updateConfig('lighting.conditions', 'golden hour');

      const { config } = useConfigStore.getState();
      expect(config.lighting.conditions).toBe('golden hour');
    });

    it('should update deeply nested config value', () => {
      const { updateConfig } = useConfigStore.getState();

      updateConfig('photographic_characteristics.camera_angle', 'low-angle');

      const { config } = useConfigStore.getState();
      expect(config.photographic_characteristics.camera_angle).toBe('low-angle');
    });

    it('should update multiple nested paths independently', () => {
      const { updateConfig } = useConfigStore.getState();

      updateConfig('lighting.conditions', 'night');
      updateConfig('lighting.direction', 'back-lit');
      updateConfig('lighting.shadows', 'dramatic');

      const { config } = useConfigStore.getState();
      expect(config.lighting.conditions).toBe('night');
      expect(config.lighting.direction).toBe('back-lit');
      expect(config.lighting.shadows).toBe('dramatic');
    });

    it('should update aesthetics config values', () => {
      const { updateConfig } = useConfigStore.getState();

      updateConfig('aesthetics.composition', 'rule of thirds');
      updateConfig('aesthetics.color_scheme', 'cinematic');

      const { config } = useConfigStore.getState();
      expect(config.aesthetics.composition).toBe('rule of thirds');
      expect(config.aesthetics.color_scheme).toBe('cinematic');
    });
  });

  describe('setSelectedObject', () => {
    it('should set selected object index', () => {
      const { addObject, setSelectedObject } = useConfigStore.getState();

      addObject();
      addObject();
      setSelectedObject(1);

      const { selectedObject } = useConfigStore.getState();
      expect(selectedObject).toBe(1);
    });

    it('should allow setting selected object to null', () => {
      const { addObject, setSelectedObject } = useConfigStore.getState();

      addObject();
      setSelectedObject(0);
      setSelectedObject(null);

      const { selectedObject } = useConfigStore.getState();
      expect(selectedObject).toBeNull();
    });

    it('should change selection from one object to another', () => {
      const { addObject, setSelectedObject } = useConfigStore.getState();

      addObject();
      addObject();
      addObject();
      setSelectedObject(0);
      setSelectedObject(2);

      const { selectedObject } = useConfigStore.getState();
      expect(selectedObject).toBe(2);
    });
  });
});
