import * as URI from 'urijs';

import { configureAssetUrlBase } from 'scrivito_sdk/app_support/asset_url_base';
import { cdnAssetUrlBase } from 'scrivito_sdk/app_support/cdn_asset_url_base';
import { currentAppSpace } from 'scrivito_sdk/app_support/current_app_space';
import { currentSiteId } from 'scrivito_sdk/app_support/current_page';
import { setForcedEditorLanguage } from 'scrivito_sdk/app_support/forced_editor_language';
import {
  loadEditingAssetsForCloudUi,
  loadEditingAssetsForPackagedUi,
} from 'scrivito_sdk/app_support/load_editing_assets';

import { initRouting } from 'scrivito_sdk/app_support/routing';
import { SiteMappingConfiguration } from 'scrivito_sdk/app_support/site_mapping';
import {
  UiAdapterClient,
  uiAdapter,
} from 'scrivito_sdk/app_support/ui_adapter';
import {
  SiteIdForObjCallback,
  getUnstableSelectedSiteId,
  setUnstableMultiSiteMode,
  useUnstableMultiSiteMode,
} from 'scrivito_sdk/app_support/unstable_multi_site_mode';
import { getVisitorAuthenticationProvider } from 'scrivito_sdk/app_support/visitor_authentication';
import { linkViaPort } from 'scrivito_sdk/bridge';
import { Priority, cmsRestApi } from 'scrivito_sdk/client';
import {
  DEFAULT_ENDPOINT,
  Deferred,
  ScrivitoError,
  checkArgumentsFor,
  logError,
  tcomb as t,
  throwInvalidArgumentsError,
} from 'scrivito_sdk/common';
import {
  IN_MEMORY_TENANT,
  configureForLazyWidgets,
  disableObjReplication,
  useInMemoryTenant,
} from 'scrivito_sdk/data';
import { load } from 'scrivito_sdk/loadable';
import { getRootObjFrom, restrictToSite } from 'scrivito_sdk/models';
import {
  Obj,
  enableStrictSearchOperators,
  setCurrentSiteIdHandler,
  unwrapAppClass,
} from 'scrivito_sdk/realm';
import type { ForcedEditorLanguage } from 'scrivito_sdk/ui_interface/app_adapter';
import {
  ConstraintsValidationCallback,
  setConstraintsValidationCallback,
} from './constraints_validation_callback';

export interface Configuration {
  tenant: string;
  adoptUi?: boolean | string;
  baseUrlForSite?: SiteMappingConfiguration['baseUrlForSite'];
  endpoint?: string;
  constraintsValidation?: ConstraintsValidationCallback;
  homepage?: () => Obj | null;
  origin?: string;
  routingBasePath?: string;
  siteForUrl?: SiteMappingConfiguration['siteForUrl'];
  visitorAuthentication?: boolean;
  priority?: Priority;
  editorLanguage?: ForcedEditorLanguage;
  strictSearchOperators?: boolean;
  optimizedWidgetLoading?: boolean;

  /** @internal */
  unstable?: {
    assetUrlBase?: string;
    getSiteIdForObj?: SiteIdForObjCallback;
    useRailsAuth?: boolean;
    trustedUiOrigins?: string[];
  };
}

const OriginValue = t.refinement(
  t.String,
  (v: string) => URI(v).origin() === v,
  'Origin String'
);

const AllowedConfiguration = t.interface({
  tenant: t.String,
  adoptUi: t.maybe(t.union([t.Boolean, OriginValue])),
  baseUrlForSite: t.maybe(t.Function),
  constraintsValidation: t.maybe(t.Function),
  endpoint: t.maybe(t.String),
  homepage: t.maybe(t.Function),
  origin: t.maybe(OriginValue),
  routingBasePath: t.maybe(t.String),
  siteForUrl: t.maybe(t.Function),
  visitorAuthentication: t.maybe(t.Boolean),
  unstable: t.maybe(t.Object),
  priority: t.maybe(t.enums.of(['foreground', 'background'])),
  editorLanguage: t.maybe(t.enums.of(['en', 'de'])),
  strictSearchOperators: t.maybe(t.Boolean),
  optimizedWidgetLoading: t.maybe(t.Boolean),
});

const PUBLIC_FUNCTION_NAME = 'configure';
const CHECK_ARGUMENTS_OPTIONS = { docPermalink: 'js-sdk/configure' };
const checkConfigure = checkArgumentsFor(
  PUBLIC_FUNCTION_NAME,
  [['configuration', AllowedConfiguration]],
  CHECK_ARGUMENTS_OPTIONS
);

let configDeferred = new Deferred<Configuration>();

/** @public */
export function configure(configuration: Configuration): void;

/** @internal */
export function configure(
  configuration: Readonly<Configuration>,
  ...excessArgs: never[]
): void {
  checkConfigure(configuration, ...excessArgs);
  const routingConfiguration = getCheckedRoutingConfiguration(configuration);

  setConfiguration(configuration);

  const inofficialConfiguration = configuration.unstable;

  const getUnstableSiteIdForObj = inofficialConfiguration?.getSiteIdForObj;
  if (getUnstableSiteIdForObj) {
    setUnstableMultiSiteMode(getUnstableSiteIdForObj);
  }

  if (configuration.tenant === IN_MEMORY_TENANT) {
    useInMemoryTenant();
    setCurrentSiteIdHandler(() => IN_MEMORY_TENANT);
    disableObjReplication();
  } else {
    const tenant = configuration.tenant;
    const endpoint = configuration.endpoint || DEFAULT_ENDPOINT;

    configureAssetUrlBase(
      inofficialConfiguration?.assetUrlBase ?? cdnAssetUrlBase()
    );

    if (uiAdapter) {
      configureForUi(endpoint, tenant, uiAdapter, inofficialConfiguration);
      if (configuration.adoptUi) loadEditingAssetsForCloudUi();
      else loadEditingAssetsForPackagedUi();
    } else {
      if (configuration.optimizedWidgetLoading) configureForLazyWidgets(true);

      configureCmsRestApi(
        endpoint,
        tenant,
        configuration.visitorAuthentication,
        configuration.priority
      );
    }
  }

  initRouting(routingConfiguration);
  configureConstraintsValidationCallback(configuration);

  if (configuration.strictSearchOperators) enableStrictSearchOperators();
  setForcedEditorLanguage(configuration.editorLanguage || null);
}

export function getConfiguration(): Promise<Configuration> {
  return configDeferred.promise;
}

// exported for test purpose only
export function setConfiguration(configuration: Configuration): void {
  if (!configDeferred.isPending()) {
    throw new ScrivitoError('Scrivito.configure has already been called.');
  }

  configDeferred.resolve(configuration);
}

// For test purpose only
export function resetConfiguration(): void {
  configDeferred = new Deferred();
}

function configureForUi(
  endpoint: string,
  tenant: string,
  uiAdapterClient: UiAdapterClient,
  inofficialConfiguration: Configuration['unstable']
) {
  uiAdapterClient.configureTenant({
    tenant,
    endpoint,
    useRailsAuth: inofficialConfiguration?.useRailsAuth,
  });

  if (useUnstableMultiSiteMode()) warnIfNoSiteIdSelection();

  setAppAdapter(uiAdapterClient);
}

function configureCmsRestApi(
  endpoint: string,
  tenant: string,
  visitorAuthentication?: boolean,
  priority?: Priority
) {
  const provider = getVisitorAuthenticationProvider(visitorAuthentication);
  if (provider) cmsRestApi.setAuthProvider(provider);
  if (priority) cmsRestApi.setPriority(priority);

  cmsRestApi.init(endpoint, tenant);
}

function getCheckedRoutingConfiguration({
  homepage,
  origin,
  routingBasePath,
  baseUrlForSite,
  siteForUrl,
}: Configuration) {
  const homepageCallback = homepage
    ? () => unwrapAppClass(homepage())
    : () => getRootObjFrom(currentAppSpace().and(restrictToSite('default')));

  if (baseUrlForSite && siteForUrl) {
    if (routingBasePath || origin) {
      const presentKey = routingBasePath ? 'routingBasePath' : 'origin';

      throwInvalidArgumentsError(
        PUBLIC_FUNCTION_NAME,
        `The '${presentKey}' cannot be combined with the "baseUrlForSite" option`,
        CHECK_ARGUMENTS_OPTIONS
      );
    }

    return {
      homepageCallback,
      baseUrlForSite,
      siteForUrl,
    };
  }

  if (baseUrlForSite || siteForUrl) {
    const presentKey = siteForUrl ? 'siteForUrl' : 'baseUrlForSite';
    const missingKey = siteForUrl ? 'baseUrlForSite' : 'siteForUrl';
    throwInvalidArgumentsError(
      PUBLIC_FUNCTION_NAME,
      `Unexpected value for argument 'configuration': a value for '${missingKey}' is required if '${presentKey}' is present.`,
      CHECK_ARGUMENTS_OPTIONS
    );
  }

  return { homepageCallback, origin, routingBasePath };
}

function configureConstraintsValidationCallback(configuration: Configuration) {
  const constraintsValidationCallback = configuration.constraintsValidation;

  if (constraintsValidationCallback) {
    setConstraintsValidationCallback(constraintsValidationCallback);
  }
}

function setAppAdapter(uiAdapterClient: UiAdapterClient) {
  importUiInterface().then(({ startAppAdapter }) => {
    const channel = new MessageChannel();
    startAppAdapter(linkViaPort(channel.port1));
    uiAdapterClient.setAppAdapter(channel.port2);
  });
}

/** exported for test purposes only */
export function importUiInterface() {
  return import('scrivito_sdk/ui_interface');
}

function warnIfNoSiteIdSelection() {
  const timeout = setTimeout(
    () =>
      load(currentSiteId).then((siteId) => {
        if (siteId === 'default') {
          logError(
            'Warning: No site ID was selected within 30 seconds.' +
              ' In the multi-site mode a site ID must be selected before Scrivito can render content.' +
              ' Forgot to use Scrivito.unstable_selectSiteId?'
          );
        }
      }),
    30000
  );

  load(getUnstableSelectedSiteId).then(() => clearTimeout(timeout));
}
