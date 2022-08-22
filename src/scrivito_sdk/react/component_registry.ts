import { Obj } from 'scrivito_sdk/realm';

const registry = new Map<string, React.ComponentType>();

export function registerComponentForId(
  componentId: string,
  componentClass: React.ComponentType
): void {
  registry.set(componentId, componentClass);
}

export function getComponentForId(
  componentId: string
): React.ComponentType | null {
  return registry.get(componentId) || null;
}

export function registerComponentForAppClass(
  className: string,
  componentClass: React.ComponentType
): void {
  registerComponentForId(componentAppClassId(className), componentClass);
}

export function registerDataErrorComponent(
  componentClass: React.ComponentType
): void {
  registry.set('dataErrorComponent', componentClass);
}

export function getComponentForAppClass(
  className: string
): React.ComponentType | null {
  return getComponentForId(componentAppClassId(className));
}

export function getDataErrorComponent(): React.ComponentType | null {
  return registry.get('dataErrorComponent') || null;
}

function componentAppClassId(className: string) {
  return `componentForAppClass-${className}`;
}

const layoutRegistry = new Map<string, React.ComponentType>();

export function getLayoutComponentForAppClass(
  className: string
): React.ComponentType | React.ComponentType<{ page: Obj }> | null {
  return layoutRegistry.get(className) || null;
}

export function registerLayoutComponentForAppClass(
  className: string,
  componentClass: React.ComponentType
): void {
  layoutRegistry.set(className, componentClass);
}

export function areLayoutComponentsStored() {
  return layoutRegistry.size > 0;
}

// For test purpose only.
export function clearComponentRegistry(): void {
  registry.clear();
  layoutRegistry.clear();
}
