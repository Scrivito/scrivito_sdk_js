import { ArgumentError } from 'scrivito_sdk/common';
import { ObjClass, Schema, WidgetClass } from 'scrivito_sdk/realm';

export function getClassName(
  classNameOrClass: string | ObjClass | WidgetClass
): string {
  if (typeof classNameOrClass === 'string') return classNameOrClass;

  const className = Schema.forClass(classNameOrClass)?.name();
  if (typeof className !== 'string') {
    throw new ArgumentError('Invalid classNameOrClass');
  }

  return className;
}
