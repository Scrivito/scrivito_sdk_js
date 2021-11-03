import { checkArgumentsFor, classify, tcomb as t } from 'scrivito_sdk/common';
import { isAppClass } from 'scrivito_sdk/realm/schema';

const noop = () => {};

export const {
  checkCreateWidgetClass,
  checkCreateObjClass,
  checkProvideObjClass,
  checkProvideWidgetClass,
} = (() => {
  if (process.env.NODE_ENV !== 'development') {
    return {
      checkCreateWidgetClass: noop,
      checkCreateObjClass: noop,
      checkProvideObjClass: noop,
      checkProvideWidgetClass: noop,
    };
  }

  const ObjClassType = t.refinement(t.Function, isAppClass, 'ObjClass');
  const ObjClassDefinitionType = t.interface({
    attributes: t.maybe(
      t.dict(
        t.refinement(
          t.String,
          isCustomAttributeName,
          'String (alphanumeric, starting with a lower-case character)'
        ),
        t.union([
          t.enums.of([
            'binary',
            'boolean',
            'date',
            'datetime',
            'float',
            'html',
            'integer',
            'link',
            'linklist',
            'reference',
            'referencelist',
            'string',
            'stringlist',
            'widgetlist',
          ]),
          t.tuple([
            t.enums.of(['enum', 'multienum']),
            t.interface({
              values: t.list(t.String),
            }),
          ]),
          t.tuple([
            t.enums.of(['reference', 'referencelist']),
            t.interface({
              only: t.union([t.String, t.list(t.String)]),
            }),
          ]),
          t.tuple([
            t.enums.of(['widgetlist']),
            t.interface({
              only: t.union([t.String, t.list(t.String)]),
            }),
          ]),
        ]),
        'Attributes Specification'
      )
    ),
    extractTextAttributes: t.maybe(t.list(t.String)),
    extend: t.maybe(ObjClassType),
    onlyAsRoot: t.maybe(t.Boolean),
    onlyChildren: t.maybe(t.union([t.String, t.list(t.String)])),
    onlyInside: t.maybe(t.union([t.String, t.list(t.String)])),
    validAsRoot: t.maybe(t.Boolean),
  });

  const WidgetClassType = t.refinement(t.Function, isAppClass, 'WidgetClass');
  const WidgetClassDefinitionType = t.interface({
    attributes: ObjClassDefinitionType.meta.props.attributes,
    extractTextAttributes: t.maybe(t.list(t.String)),
    extend: t.maybe(WidgetClassType),
    onlyInside: t.maybe(t.union([t.String, t.Array])),
  });

  return {
    checkCreateObjClass: checkArgumentsFor(
      'createObjClass',
      [['definition', ObjClassDefinitionType]],
      {
        docPermalink: 'js-sdk/createObjClass',
      }
    ),

    checkCreateWidgetClass: checkArgumentsFor(
      'createWidgetClass',
      [['definition', WidgetClassDefinitionType]],
      {
        docPermalink: 'js-sdk/createWidgetClass',
      }
    ),

    checkProvideObjClass: (...args: unknown[]) => {
      checkProvideClass('objClass', ObjClassType, ObjClassDefinitionType, args);
    },

    checkProvideWidgetClass: (...args: unknown[]) => {
      checkProvideClass(
        'widgetClass',
        WidgetClassType,
        WidgetClassDefinitionType,
        args
      );
    },
  };
})();

function checkProvideClass(
  name: string,
  classType: t.Refinement<object>,
  definitionType: t.Interface<unknown>,
  args: unknown[]
) {
  const className = classify(name);
  const classOrDefinition = args[1];
  const check = checkArgumentsFor(
    `provide${className}`,
    [
      ['name', t.String],
      typeof classOrDefinition === 'function' && isAppClass(classOrDefinition)
        ? ['class', classType]
        : typeof classOrDefinition === 'object' && classOrDefinition !== null
        ? ['definition', definitionType]
        : [
            `${name}OrDefinition`,
            t.union([classType, definitionType], className),
          ],
    ],
    {
      docPermalink: `js-sdk/provide${className}`,
    }
  );

  check(...args);
}

function isCustomAttributeName(name: string): boolean {
  return /^[a-z](_+[A-Z0-9]|[A-Za-z0-9])*$/.test(name);
}
