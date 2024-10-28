import {
  checkArgumentsFor,
  tcomb as t,
  throwInvalidArgumentsError,
  underscore,
} from 'scrivito_sdk/common';
import { AttributeDefinitions } from 'scrivito_sdk/realm/schema';
import {
  ObjClassType,
  WidgetClassType,
} from 'scrivito_sdk/realm/tcomb_api_types';

const noop = () => {};

export const {
  checkProvideComponent,
  checkProvideLayoutComponent,
  checkProvideDataErrorComponent,
  checkProvideDataItem,
} = (() => {
  if (process.env.NODE_ENV !== 'development') {
    return {
      checkProvideComponent: noop,
      checkProvideLayoutComponent: noop,
      checkProvideDataErrorComponent: noop,
      checkProvideDataItem: noop,
    };
  }

  return {
    checkProvideComponent: checkArgumentsFor(
      'provideComponent',
      [
        [
          'classNameOrClass',
          t.union([t.String, ObjClassType, WidgetClassType]),
        ],
        ['component', t.irreducible('React component', isFunction)],
      ],
      {
        docPermalink: 'js-sdk/provideComponent',
      }
    ),

    checkProvideLayoutComponent: checkArgumentsFor(
      'provideLayoutComponent',
      [
        ['objClass', ObjClassType],
        ['component', t.irreducible('React component', isFunction)],
      ],
      {
        docPermalink: 'js-sdk/provideLayoutComponent',
      }
    ),

    checkProvideDataErrorComponent: checkArgumentsFor(
      'provideDataErrorComponent',
      [['component', t.irreducible('React component', isFunction)]],
      {
        docPermalink: 'js-sdk/provideDataErrorComponent',
      }
    ),

    checkProvideDataItem: checkArgumentsFor(
      'provideDataItem',
      [
        ['name', t.String],
        [
          'connection',
          t.interface({
            get: t.Function,
            update: t.maybe(t.Function),
          }),
        ],
      ],
      {
        docPermalink: 'js-sdk/provideDataItem',
      }
    ),
  };
})();

function isFunction(fn: unknown) {
  return typeof fn === 'function';
}

function isCustomAttributeName(name: string): boolean {
  return (
    /^[a-z](_+[A-Z0-9]|[A-Za-z0-9])*$/.test(name) &&
    underscore(name).length <= 50
  );
}

function assertCustomAttributeName(name: string, target: string) {
  if (isCustomAttributeName(name)) return;

  throwInvalidArgumentsError(
    target,
    `attribute name "${name}" is invalid. Must be a string (alphanumeric, starting with a lower-case character).`,
    { docPermalink: `'js-sdk/${target}'` }
  );
}

type WidgetlistOptions =
  | {
      only: string | readonly string[];
      maximum?: number;
    }
  | {
      only?: string | readonly string[];
      maximum: number;
    };

function assertWidgetlistDefinition(
  name: string,
  options: WidgetlistOptions,
  target: string
) {
  if (options.maximum !== undefined) {
    const { maximum } = options;

    if (Number.isInteger(maximum) && maximum > 0) return;

    throwInvalidArgumentsError(
      target,
      `invalid value "${maximum}" supplied to ${name}: The "maximum" must be a positive integer.`,
      { docPermalink: `'js-sdk/${target}'` }
    );
  }
}

export function validateAttributeDefinitions(
  attributeDefinitions: AttributeDefinitions,
  target: string
) {
  Object.entries(attributeDefinitions).forEach(([name, definition]) => {
    assertCustomAttributeName(name, target);

    const [attributeType, attributeTypeOptions] = definition;

    if (
      attributeType === 'widgetlist' &&
      typeof attributeTypeOptions !== 'string'
    ) {
      assertWidgetlistDefinition(name, attributeTypeOptions, target);
    }
  });
}
