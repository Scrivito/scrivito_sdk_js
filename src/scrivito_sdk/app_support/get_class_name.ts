import { ArgumentError } from 'scrivito_sdk/common';
import { DataItem, ExternalDataClass } from 'scrivito_sdk/data_integration';
import { ObjClass, Schema, WidgetClass } from 'scrivito_sdk/realm';

export function getClassName(
  subject: string | ObjClass | WidgetClass | ExternalDataClass | DataItem
): string {
  if (typeof subject === 'string') return subject;

  if (subject instanceof ExternalDataClass) {
    return subject.name();
  }

  if (subject instanceof DataItem) {
    return subject.dataClass().name();
  }

  const className = Schema.forClass(subject)?.name();

  if (typeof className !== 'string') {
    throw new ArgumentError('Invalid class name, class or instance');
  }

  return className;
}
