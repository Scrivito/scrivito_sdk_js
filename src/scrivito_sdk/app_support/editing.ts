import {
  AttributeType,
  BasicAttributeValue,
  BasicAttributeValueForUpdate,
} from 'scrivito_sdk/models';
import { AttributeEditingOptions } from './editing_config';

export { AttributeType } from 'scrivito_sdk/models';
export { ContentBrowserResult } from 'scrivito_sdk/editing_support';
export { UiAdapterOpenContentBrowserOptions } from 'scrivito_sdk/app_support/ui_adapter_interface';

export type DomMode = 'None' | 'Replace';

export interface AbstractEditorClass<Type extends AttributeType> {
  new ({
    controller,
  }: {
    controller: EditController<Type>;
  }): AbstractEditorInterface<Type>;

  canEdit({ type, tag }: { type: AttributeType; tag: string }): boolean;
}

export declare class AbstractEditorInterface<Type extends AttributeType> {
  onClick: (e: EditorEvent) => void;
  constructor(args: { controller: EditController<Type> });
  contentDidChange(): void;
  editorWillBeActivated(): void;
  editorWillBeDeactivated(): void;
  editorDomWasMounted(element: Element): void;
  editorDomWasUnmounted(): void;
}

export interface EditController<Type extends AttributeType> {
  getContent(): BasicAttributeValue<Type>;
  setContent(val: BasicAttributeValueForUpdate<Type>): void;
  setDomMode(domMode: DomMode): void;
  validObjClasses(): readonly string[] | undefined;
  options(): Readonly<AttributeEditingOptions> | undefined;
}

export interface EditorEvent {
  preventDefault(): void;
  stopPropagation(): void;
}
