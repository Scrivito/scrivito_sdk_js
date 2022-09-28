import { ExternalDataClass } from 'scrivito_sdk/app_support/external_data_class';
import { ArgumentError } from 'scrivito_sdk/common';
import { ObjClass, Schema, WidgetClass } from 'scrivito_sdk/realm';

export function getClassName(
  classNameOrClass: string | ObjClass | WidgetClass | ExternalDataClass
): string {
  if (typeof classNameOrClass === 'string') return classNameOrClass;

  if (classNameOrClass instanceof ExternalDataClass) {
    return classNameOrClass.name();
  }

  const className = Schema.forClass(classNameOrClass)?.name();
  if (typeof className !== 'string') {
    throw new ArgumentError('Invalid classNameOrClass');
  }

  return className;
}
