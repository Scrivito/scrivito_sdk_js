import { Binary } from 'scrivito_sdk/models';
import { Link, Obj, Widget } from 'scrivito_sdk/realm';

export interface AttrDict {
  [key: string]: AttributeValue | SystemAttributeValue;
}

export type AttributeValue =
  | Link
  | Link[]
  | Obj
  | Obj[]
  // A single `Widget` is a currently used and internally supported value for a
  // widgetlist. But nothing we support publicly.
  | Widget
  | Widget[]
  | Binary
  | boolean
  | Date
  | number
  | string
  | string[]
  | null;

type SystemAttributeValue = string | null;
