import { uniq } from 'underscore';

import {
  ValidationsConfig,
  ValidationsConfigType,
} from 'scrivito_sdk/app_support/validations_config';
import { checkArgumentsFor, nextTick, tcomb as t } from 'scrivito_sdk/common';
import {
  AttributeType,
  Binary,
  LinkType,
  WidgetType,
} from 'scrivito_sdk/models';
import { AttributeValue, Obj, Widget } from 'scrivito_sdk/realm';

export interface LocalizedValue {
  value: string;
  title: string;
}

export interface AttributesEditingConfig {
  [attributeName: string]: AttributeEditingConfig;
}

export interface AttributeEditingConfig {
  title?: string;
  description?: string;
  values?: LocalizedValue[];
  options?: AttributeEditingOptions;
}

export interface AttributeEditingOptions {
  showHtmlSource?: boolean;
  toolbar?: ToolbarButton[];
}

type ToolbarButton =
  | 'blockquote'
  | 'bold'
  | 'bulletList'
  | 'clean'
  | 'code'
  | 'codeBlock'
  | 'header1'
  | 'header2'
  | 'header3'
  | 'header4'
  | 'header5'
  | 'header6'
  | 'indent'
  | 'italic'
  | 'link'
  | 'mark'
  | 'orderedList'
  | 'outdent'
  | 'strikethrough'
  | 'subscript'
  | 'superscript'
  | 'underline';

export interface ComponentGroupDescription {
  title: string;
  component: string;
  properties?: string[];
  key?: string;
}

export interface PropertiesGroupDescription {
  title: string;
  properties: string[];
  key?: string;
}

export interface DynamicComponentGroupDescription
  extends ComponentGroupDescription {
  key: string;
}

export interface DynamicPropertiesGroupDescription
  extends PropertiesGroupDescription {
  key: string;
}

export type PropertyGroup =
  | ComponentGroupDescription
  | PropertiesGroupDescription;

type PropertiesGroupsCallback<T extends Obj | Widget> = (content: T) => unknown;

type PropertiesCallback<T extends Obj | Widget> = (content: T) => unknown;

type ForContentCallback<T extends Obj | Widget> = (content: T) => string;

interface SharedEditingConfig<T extends Obj | Widget> {
  attributes?: AttributesEditingConfig;
  description?: string;
  hideInSelectionDialogs?: boolean;
  initialContent?: InitialContent;
  properties?: string[] | PropertiesCallback<T>;
  propertiesGroups?: PropertyGroup[] | PropertiesGroupsCallback<T>;
  thumbnail?: string;
  title?: string;
  initialize?: InitializeCallback<T>;
  titleForContent?: ForContentCallback<T>;
  validations?: ValidationsConfig<T>;
}

/** @public */
export interface ObjEditingConfig extends SharedEditingConfig<Obj> {
  descriptionForContent?: ForContentCallback<Obj>;
  initializeCopy?: InitializeCallback<Obj>;
  thumbnailForContent?: (content: Obj) => Obj | Binary | undefined | null;
}

/** @public */
export interface WidgetEditingConfig extends SharedEditingConfig<Widget> {}

export type EditingConfig = SharedEditingConfig<Obj | Widget> &
  ObjEditingConfig &
  WidgetEditingConfig;

interface EditingConfigMap {
  [className: string]: EditingConfig;
}

type AttributeValueFunction = () => AttributeValue;

interface InitialContent {
  [attributeName: string]: AttributeValue | AttributeValueFunction;
}

type InitializeCallback<T extends Obj | Widget> = (instance: T) => void;

let editingConfigForClass: EditingConfigMap = {};

/** @public */
export function provideEditingConfig(
  className: string,
  editingConfig: ObjEditingConfig
): void;

/** @public */
export function provideEditingConfig(
  className: string,
  editingConfig: WidgetEditingConfig
): void;

/** @internal */
export function provideEditingConfig(
  className: string,
  editingConfig: EditingConfig,
  ...excessArgs: never[]
): void {
  checkProvideEditingConfig(className, editingConfig, ...excessArgs);
  editingConfigForClass[className] = editingConfig;
}

export function getEditingConfigFor<K extends keyof EditingConfig>(
  className: string,
  propertyName: K
): EditingConfig[K] {
  const config = editingConfigForClass[className];

  if (config) {
    return config[propertyName];
  }
}

export function getValidationsConfigFor(
  className: string
): ValidationsConfig<Obj | Widget> | undefined {
  return getEditingConfigFor(className, 'validations');
}

export function getAttributesConfigFor(
  className: string
): AttributesEditingConfig {
  return getEditingConfigFor(className, 'attributes') || {};
}

export function getAttributeEditingOptionsFor(
  className: string,
  attributeName: string,
  attributeType: AttributeType
): AttributeEditingOptions | undefined {
  const attributes = getAttributesConfigFor(className);
  const attribute = attributes[attributeName];
  const options = attribute ? attribute.options : undefined;

  if (!options) return;
  if (attributeType === 'html') return options;
  nextTick(() => throwInvalidOptions(options));
}

const PropertiesGroupDescriptionType = t.interface({
  title: t.String,
  properties: t.list(t.String),
  key: t.maybe(t.String),
});

const ComponentGroupDescriptionType = t.interface({
  title: t.String,
  component: t.String,
  properties: t.maybe(t.list(t.String)),
  key: t.maybe(t.String),
});

export const PropertiesGroupType = t.union([
  PropertiesGroupDescriptionType,
  ComponentGroupDescriptionType,
]);

const { checkProvideEditingConfig, throwInvalidOptions } = (() => {
  if (process.env.NODE_ENV !== 'development') {
    return {
      checkProvideEditingConfig: () => {},
      throwInvalidOptions: () => {},
    };
  }

  const EnumValueLocalizationType = t.interface({
    value: t.String,
    title: t.String,
  });

  const HtmlToolbarButtonType = t.enums.of([
    'blockquote',
    'bold',
    'bulletList',
    'clean',
    'code',
    'codeBlock',
    'header1',
    'header2',
    'header3',
    'header4',
    'header5',
    'header6',
    'indent',
    'italic',
    'link',
    'mark',
    'orderedList',
    'outdent',
    'strikethrough',
    'subscript',
    'superscript',
    'underline',
  ]);

  const HtmlToolbarButtonsType = t.refinement(
    t.list(HtmlToolbarButtonType),
    (list) => list.length > 0,
    'NonemptyArray'
  );

  const AttributesEditingConfigType = t.dict(
    t.String,
    t.interface({
      title: t.maybe(t.String),
      description: t.maybe(t.String),
      values: t.maybe(t.list(EnumValueLocalizationType)),
      options: t.maybe(
        t.interface({
          toolbar: t.maybe(HtmlToolbarButtonsType),
          showHtmlSource: t.maybe(t.Boolean),
        })
      ),
    })
  );

  const PropertiesGroupsType = t.refinement(
    t.list(PropertiesGroupType),
    haveGroupsUniqueKey,
    'Unique key as a group identifier for faster rendering (like keys in React do)'
  );

  const InitialContentType = t.dict(
    t.String,
    t.union([
      LinkType,
      t.Boolean,
      t.Date,
      t.Function,
      t.Nil,
      t.Number,
      t.String,
      t.list(LinkType),
      t.list(WidgetType),
      t.list(t.String),
    ])
  );

  const EditingConfigType = t.interface({
    attributes: t.maybe(AttributesEditingConfigType),
    description: t.maybe(t.String),
    descriptionForContent: t.maybe(t.Function),
    hideInSelectionDialogs: t.maybe(t.Boolean),
    initialContent: t.maybe(InitialContentType),
    initialize: t.maybe(t.Function),
    initializeCopy: t.maybe(t.Function),
    properties: t.maybe(t.union([t.list(t.String), t.Function])),
    propertiesGroups: t.maybe(t.union([PropertiesGroupsType, t.Function])),
    thumbnail: t.maybe(t.String),
    thumbnailForContent: t.maybe(t.Function),
    title: t.maybe(t.String),
    titleForContent: t.maybe(t.Function),
    validations: t.maybe(ValidationsConfigType),
  });

  const docPermalink = 'js-sdk/provideEditingConfig';

  return {
    checkProvideEditingConfig: checkArgumentsFor(
      'provideEditingConfig',
      [
        ['className', t.String],
        ['editingConfig', EditingConfigType],
      ],
      { docPermalink }
    ),

    throwInvalidOptions: checkArgumentsFor(
      'provideEditingConfig',
      [['options', t.struct({})]],
      { docPermalink }
    ),
  };
})();

// For test purposes only
export function resetEditingConfig() {
  editingConfigForClass = {};
}

function haveGroupsUniqueKey(groups: PropertyGroup[]) {
  const groupsWithKey = groups.filter((group) => !!group.key);
  return uniq(groupsWithKey, 'key').length === groupsWithKey.length;
}
