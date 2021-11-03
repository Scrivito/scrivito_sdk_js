let registry: {
  [key: string]: React.ComponentType | undefined;
} = {};

export function registerComponentForId(
  componentId: string,
  componentClass: React.ComponentType
): void {
  registry[componentId] = componentClass;
}

export function getComponentForId(
  componentId: string
): React.ComponentType | null {
  return registry[componentId] || null;
}

export function registerComponentForAppClass(
  className: string,
  componentClass: React.ComponentType
): void {
  registerComponentForId(appClassId(className), componentClass);
}

export function getComponentForAppClass(
  className: string
): React.ComponentType | null {
  return getComponentForId(appClassId(className));
}

// For test purpose only.
export function clearComponentRegistry(): void {
  registry = {};
}

function appClassId(className: string) {
  return `appClass-${className}`;
}
