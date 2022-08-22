import { registerDataErrorComponent } from 'scrivito_sdk/react/component_registry';
import { connectAndMemoize } from 'scrivito_sdk/react/connect_and_memoize';
import { checkProvideDataErrorComponent } from 'scrivito_sdk/realm';

/** @alpha */
export function provideDataErrorComponent(component: React.ComponentType): void;

/** @alpha */
export function provideDataErrorComponent(
  component: React.ComponentType,
  ...excessArgs: never[]
): void {
  checkProvideDataErrorComponent(component, ...excessArgs);
  registerDataErrorComponent(connectAndMemoize(component));
}
