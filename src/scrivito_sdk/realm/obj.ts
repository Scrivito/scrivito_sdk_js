import { checkArgumentsFor, tcomb as t } from 'scrivito_sdk/common';
import { Modification } from 'scrivito_sdk/data';
import {
  AttributeType,
  BasicObj,
  FieldBoost,
  FullTextSearchOperator,
  MetadataCollection,
  ScopeTransformation,
  SearchField,
  SearchOperator,
  allSitesAndGlobal,
  currentObjSpaceId,
  emptyScope,
  objSpaceScope,
  restrictToSiteAndGlobal,
  updateReferences,
  versionOnSite,
  versionsOnAllSites,
} from 'scrivito_sdk/models';
import { ObjSearch, Widget } from 'scrivito_sdk/realm';
import {
  readAppAttribute,
  updateAppAttributes,
} from 'scrivito_sdk/realm/app_model_accessor';
import { assertValidAttributeName } from 'scrivito_sdk/realm/assert_valid_attribute_name';
import { AttrDict } from 'scrivito_sdk/realm/attribute_types';
import {
  BasicSiteContext,
  SiteContext,
} from 'scrivito_sdk/realm/basic_site_context';
import { currentSiteId } from 'scrivito_sdk/realm/current_site_id';
import {
  SearchValue,
  checkFullTextSearchOperator,
  checkNonFullTextSearchOperator,
} from 'scrivito_sdk/realm/obj_search';
import { Schema } from 'scrivito_sdk/realm/schema';
import { areStrictSearchOperatorsEnabled } from 'scrivito_sdk/realm/strict_search_operators';
import {
  AttributeValue,
  wrapInAppClass,
} from 'scrivito_sdk/realm/wrap_in_app_class';

export type ObjAttributes = AttrDict;

type ReferenceMapping = (refId: string) => string | undefined;

export interface ObjClass {
  /** @internal */
  readonly _scrivitoPrivateSchema?: Schema;

  /** bogus constructor, to let TypeScript understand that this is a class. */
  new (dontUseThis: never): Obj;

  get(id: string): Obj | null;

  /** @internal */
  getIncludingDeleted(id: string): Obj | null;

  getByPath(path: string): Obj | null;

  getByPermalink(permalink: string): Obj | null;

  all(): ObjSearch;

  root(): Obj | null;

  where(
    attribute: SearchField,
    operator: SearchOperator,
    value: SearchValue,
    boost?: FieldBoost
  ): ObjSearch;

  whereFullTextOf(
    attribute: SearchField,
    operator: FullTextSearchOperator,
    value: SearchValue,
    boost?: FieldBoost
  ): ObjSearch;

  create(attributes?: ObjAttributes): Obj;

  createFromFile(file: File, attributes?: ObjAttributes): Promise<Obj>;

  onAllSites(): SiteContext;

  onSite(siteId: string): SiteContext;
}

function currentSiteContext(objClass: ObjClass) {
  const siteId = currentSiteId();
  if (!siteId) return new BasicSiteContext(objClass, emptyScope());

  return getBasicSiteContext(objClass, restrictToSiteAndGlobal(siteId));
}

function getSiteContext(
  objClass: ObjClass,
  transformation: ScopeTransformation
) {
  return getBasicSiteContext(objClass, transformation).toSiteContext();
}

function getBasicSiteContext(
  objClass: ObjClass,
  transformation: ScopeTransformation
) {
  const scope = objSpaceScope(currentObjSpaceId()).and(transformation);

  return new BasicSiteContext(objClass, scope);
}

/** @public */
export class Obj {
  /** @internal */
  readonly _scrivitoPrivateContent!: BasicObj;

  /** @internal */
  static readonly _scrivitoPrivateSchema?: Schema;

  static get(id: string): Obj | null {
    return currentSiteContext(this).get(id);
  }

  /** @internal */
  static getIncludingDeleted(id: string): Obj | null {
    return currentSiteContext(this).getIncludingDeleted(id);
  }

  static getByPath(path: string): Obj | null {
    return currentSiteContext(this).getByPath(path);
  }

  static getByPermalink(permalink: string): Obj | null {
    return currentSiteContext(this).getByPermalink(permalink);
  }

  static all(): ObjSearch {
    return currentSiteContext(this).all();
  }

  static root(): Obj | null {
    return currentSiteContext(this).root();
  }

  static where(
    attribute: SearchField,
    operator: SearchOperator,
    value: SearchValue,
    boost?: FieldBoost
  ): ObjSearch {
    if (areStrictSearchOperatorsEnabled()) {
      checkNonFullTextSearchOperator('Obj.where', operator, 'js-sdk/Obj-where');
    }

    return currentSiteContext(this).where(attribute, operator, value, boost);
  }

  static whereFullTextOf(
    attribute: SearchField,
    operator: FullTextSearchOperator,
    value: SearchValue,
    boost?: FieldBoost
  ): ObjSearch {
    checkFullTextSearchOperator(
      'Obj.whereFullTextOf',
      operator,
      'js-sdk/Obj-whereFullTextOf'
    );

    return currentSiteContext(this).whereFullTextOf(
      attribute,
      operator,
      value,
      boost
    );
  }

  static create(attributes?: ObjAttributes): Obj {
    return currentSiteContext(this).create(attributes);
  }

  static createFromFile(file: File, attributes?: ObjAttributes): Promise<Obj> {
    return currentSiteContext(this).createFromFile(file, attributes);
  }

  static onAllSites(): SiteContext {
    return getSiteContext(this, allSitesAndGlobal);
  }

  static onSite(siteId: string): SiteContext {
    checkObjOnSite(siteId);
    return getSiteContext(this, restrictToSiteAndGlobal(siteId));
  }

  id(): string {
    return this._scrivitoPrivateContent.id();
  }

  objClass(): string {
    return this._scrivitoPrivateContent.objClass();
  }

  get<T extends AttributeType>(attributeName: string): AttributeValue<T> {
    assertValidAttributeName(attributeName);

    return readAppAttribute(this, attributeName)!;
  }

  update(attributes: Partial<AttrDict>): void {
    updateAppAttributes(this, attributes);
  }

  versionsOnAllSites(): Obj[] {
    return wrapInAppClass(versionsOnAllSites(this._scrivitoPrivateContent));
  }

  versionOnSite(siteId: string): Obj | null {
    checkVersionOnSite(siteId);

    return wrapInAppClass(versionOnSite(this._scrivitoPrivateContent, siteId));
  }

  createdAt(): Date | null {
    return this._scrivitoPrivateContent.createdAt();
  }

  firstPublishedAt(): Date | null {
    return this._scrivitoPrivateContent.firstPublishedAt();
  }

  publishedAt(): Date | null {
    return this._scrivitoPrivateContent.publishedAt();
  }

  lastChanged(): Date | null {
    return this._scrivitoPrivateContent.lastChanged();
  }

  path(): string | null {
    return this._scrivitoPrivateContent.path();
  }

  parent(): Obj | null {
    return wrapInAppClass(this._scrivitoPrivateContent.parent());
  }

  ancestors(): Array<Obj | null> {
    return this._scrivitoPrivateContent
      .ancestors()
      .map((maybeObj) => wrapInAppClass(maybeObj));
  }

  /**
   * Resolves when all previous updates have been persisted.
   * If an update fails the promise is rejected.
   */
  finishSaving(): Promise<void> {
    return this._scrivitoPrivateContent.finishSaving();
  }

  modification(): Modification {
    return this._scrivitoPrivateContent.modification();
  }

  backlinks(): Obj[] {
    return wrapInAppClass(this._scrivitoPrivateContent.backlinks());
  }

  children(): Obj[] {
    return wrapInAppClass(this._scrivitoPrivateContent.children());
  }

  permalink(): string | null {
    return this._scrivitoPrivateContent.permalink();
  }

  siteId(): string | null {
    return this._scrivitoPrivateContent.siteId();
  }

  language(): string | null {
    return this._scrivitoPrivateContent.language();
  }

  slug(): string {
    return this._scrivitoPrivateContent.slug();
  }

  isBinary(): boolean {
    const schema = Schema.forInstance(this);

    if (!schema) return false;

    return schema.isBinary();
  }

  isRestricted(): boolean {
    return this._scrivitoPrivateContent.isRestricted();
  }

  contentLength(): number {
    if (this.isBinary()) return this._scrivitoPrivateContent.contentLength();

    return 0;
  }

  contentType(): string {
    if (this.isBinary()) return this._scrivitoPrivateContent.contentType();

    return '';
  }

  contentUrl(): string {
    if (this.isBinary()) return this._scrivitoPrivateContent.contentUrl();

    return '';
  }

  contentId(): string {
    return this._scrivitoPrivateContent.contentId();
  }

  metadata(): MetadataCollection {
    if (this.isBinary()) return this._scrivitoPrivateContent.metadata();

    return new MetadataCollection();
  }

  restrict(): void {
    this._scrivitoPrivateContent.restrict();
  }

  unrestrict(): void {
    this._scrivitoPrivateContent.unrestrict();
  }

  updateReferences(mapping: ReferenceMapping): Promise<void>;

  /** @internal */
  updateReferences(
    mapping: ReferenceMapping,
    ...excessArgs: never[]
  ): Promise<void> {
    checkUpdateReferences(mapping, ...excessArgs);

    return updateReferences(this._scrivitoPrivateContent, mapping);
  }

  widget(id: string): Widget | null {
    const maybeWidget = this._scrivitoPrivateContent.widget(id);
    return maybeWidget && wrapInAppClass(maybeWidget);
  }

  widgets(): Widget[] {
    return wrapInAppClass(this._scrivitoPrivateContent.widgets());
  }

  copy(): Promise<Obj> {
    return this._scrivitoPrivateContent
      .copyAsync({ _path: null })
      .then((obj) => wrapInAppClass(obj));
  }

  destroy(): void {
    this._scrivitoPrivateContent.destroy();
  }
}

const checkObjOnSite = checkArgumentsFor('Obj.onSite', [['siteId', t.String]], {
  docPermalink: 'js-sdk/Obj-static-onSite',
});

const checkUpdateReferences = checkArgumentsFor(
  'obj.updateReferences',
  [['mapping', t.Function]],
  {
    docPermalink: 'js-sdk/Obj-updateReferences',
  }
);

const checkVersionOnSite = checkArgumentsFor(
  'obj.versionOnSite',
  [['siteId', t.String]],
  {
    docPermalink: 'js-sdk/Obj-versionOnSite',
  }
);
