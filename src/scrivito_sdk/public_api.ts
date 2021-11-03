// If imported, this file provides a namespace object for the public API, e.g.:
//
//   import * as Scrivito from 'scrivito_sdk/public_api';
//
//   Scrivito.configure({ ... });
//   Scrivito.provideComponent({ ... });

// Client
export { ArgumentError, ScrivitoError } from 'scrivito_sdk/common';
export { load } from 'scrivito_sdk/loadable';
export { Binary, FutureBinary } from 'scrivito_sdk/models';

export {
  createObjClass,
  createWidgetClass,
  getClass,
  Link,
  Obj,
  ObjFacetValue,
  ObjSearch,
  provideObjClass,
  provideWidgetClass,
  Widget,
} from 'scrivito_sdk/realm';

export {
  BackgroundImageTag,
  ChildListTag,
  connect,
  ContentTag,
  CurrentPage,
  ImageTag,
  InPlaceEditingOff,
  LinkTag,
  NotFoundErrorPage,
  provideComponent,
  registerComponent,
  RestoreInPlaceEditing,
  WidgetTag,
} from 'scrivito_sdk/react';

export type {
  CustomPageComponentProps,
  CustomWidgetComponentProps,
  PageComponentProps,
  WidgetComponentProps,
} from 'scrivito_sdk/react';

// App support
export { canEdit } from 'scrivito_sdk/app_support/can_edit';
export { canWrite } from 'scrivito_sdk/app_support/can_write';
export { configure } from 'scrivito_sdk/app_support/configure';
export { configureContentBrowser } from 'scrivito_sdk/app_support/configure_content_browser';
export { configureObjClassForContentType } from 'scrivito_sdk/app_support/configure_obj_class_for_content_type';
export { configurePreviewSizes } from 'scrivito_sdk/app_support/preview_sizes';
export { currentEditor } from 'scrivito_sdk/app_support/current_editor';
export {
  currentPage,
  currentPageParams,
  currentSiteId,
} from 'scrivito_sdk/app_support/current_page';
export { currentWorkspace } from 'scrivito_sdk/app_support/current_workspace';
export { currentWorkspaceId } from 'scrivito_sdk/models/current_workspace_id';
export { extendMenu } from 'scrivito_sdk/app_support/extend_menu';
export { extractText } from 'scrivito_sdk/app_support/extract_text';
export { finishLoading } from 'scrivito_sdk/app_support/loading_monitor';
export { isComparisonActive } from 'scrivito_sdk/app_support/editing_context';
export { isEditorLoggedIn } from 'scrivito_sdk/app_support/is_editor_logged_in';
export { isInPlaceEditingActive } from 'scrivito_sdk/app_support/editing_context';
export { navigateTo } from 'scrivito_sdk/app_support/navigate_to';
export { openDialog } from 'scrivito_sdk/app_support/open_dialog';
export { preload } from 'scrivito_sdk/app_support/preload';
export { provideAuthGroups } from 'scrivito_sdk/app_support/auth_groups';
export { renderPage } from 'scrivito_sdk/app_support/render_page';
export { setVisitorIdToken } from 'scrivito_sdk/app_support/visitor_authentication';
export { updateContent } from 'scrivito_sdk/app_support/update_content';
export { updateMenuExtensions } from 'scrivito_sdk/app_support/menu';
export { urlFor } from 'scrivito_sdk/app_support/url_for';
export { useHistory } from 'scrivito_sdk/app_support/browser_location';
export { validationResultsFor } from 'scrivito_sdk/app_support/validation_results_stub';
export { uiContext } from 'scrivito_sdk/app_support/ui_context';
export { resolveHtmlUrls } from 'scrivito_sdk/app_support/replace_internal_links';

export { provideEditingConfig } from 'scrivito_sdk/app_support/editing_config';
export type {
  ObjEditingConfig,
  WidgetEditingConfig,
} from 'scrivito_sdk/app_support/editing_config';

/** @internal */
export { unstable_selectSiteId } from 'scrivito_sdk/app_support/unstable_multi_site_mode';

import * as _internal from 'scrivito_sdk/infopark_integration_test_support';
/**
 * public for tests
 * @internal
 */
export { _internal };
