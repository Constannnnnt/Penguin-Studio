import React from 'react';
import get from 'lodash/get';
import { FieldSchema } from '@fibo-ui/core';
import { useAmbiStore, useAmbiUpdate } from './AmbiProvider';
import { useRegistry } from '../Registry';

interface AmbiFieldProps {
    path: string;
    schema?: FieldSchema;
    /**
     * Optional manual override of widget
     */
    widget?: string;
    /**
     * Additional props passed to the widget
     */
    [key: string]: any;
}

/**
 * SRP: AmbiField is responsible for connecting a specific path in the state 
 * to a Widget in the registry. It doesn't know how to render the UI itself.
 */
export const AmbiField: React.FC<AmbiFieldProps> = ({
    path,
    schema,
    widget,
    ...rest
}) => {
    const value = useAmbiStore((state) => get(state.data, path));
    const update = useAmbiUpdate();
    const registry = useRegistry();

    const widgetKey = widget || schema?.widget || schema?.type;
    const Widget = widgetKey ? registry[widgetKey] : null;

    if (!Widget) {
        return (
            <div className="text-destructive text-xs p-2 border border-destructive rounded">
                Missing widget strategy for: {widgetKey} (at {path})
            </div>
        );
    }

    return (
        <Widget
            {...rest}
            path={path}
            value={value}
            onChange={(val: any) => update(path, val)}
            schema={schema}
        />
    );
};
