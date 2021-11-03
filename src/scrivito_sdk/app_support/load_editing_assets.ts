import { getAssetUrlBase } from 'scrivito_sdk/app_support/asset_url_base';
import { getDocument } from 'scrivito_sdk/common';
import { loadCss } from 'scrivito_sdk/common';

export function loadEditingAssetsForCloudUi() {
  loadEditingCss();
  importEditors().then(({ initializeEditorsForCloudUi }) =>
    initializeEditorsForCloudUi()
  );
}

export function loadEditingAssetsForPackagedUi() {
  loadEditingCss();
  importEditors().then(({ initializeEditorsForPackagedUi }) =>
    initializeEditorsForPackagedUi()
  );
}

function loadEditingCss() {
  loadCss(`${getAssetUrlBase()}/scrivito_editing.css`, getDocument());
}

/** exported for test purposes only */
export function importEditors() {
  return import('editors');
}
