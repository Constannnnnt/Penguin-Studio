import React, { createContext, useContext } from 'react';

export interface ControlRegistry {
    [widgetName: string]: React.ComponentType<any>;
}

const RegistryContext = createContext<ControlRegistry>({});

export const RegistryProvider: React.FC<{
    registry: ControlRegistry;
    children: React.ReactNode;
}> = ({ registry, children }) => {
    return (
        <RegistryContext.Provider value={registry}>
            {children}
        </RegistryContext.Provider>
    );
};

export const useRegistry = () => {
    return useContext(RegistryContext);
};
