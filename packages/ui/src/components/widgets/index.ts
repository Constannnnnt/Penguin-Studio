import React from 'react';
import { StringField, StringWidgetProps } from './StringField';
import { NumberField, NumberWidgetProps } from './NumberField';
import { BooleanField, BooleanWidgetProps } from './BooleanField';
import { ObjectField, ObjectWidgetProps } from './ObjectField';
import { ArrayField, ArrayWidgetProps } from './ArrayField';
import { FieldSchema } from '@fibo-ui/core';

export type WidgetComponent = React.FC<any>;

export interface WidgetRegistry {
  [key: string]: WidgetComponent;
}

export const defaultWidgets: WidgetRegistry = {
  string: StringField,
  number: NumberField,
  boolean: BooleanField,
  object: ObjectField,
  array: ArrayField,
};

export type WidgetType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export function createWidgetRegistry(overrides?: Partial<WidgetRegistry>): WidgetRegistry {
  return {
    ...defaultWidgets,
    ...overrides,
  } as WidgetRegistry;
}

export type { StringWidgetProps, NumberWidgetProps, BooleanWidgetProps, ObjectWidgetProps, ArrayWidgetProps };
export * from './types';
