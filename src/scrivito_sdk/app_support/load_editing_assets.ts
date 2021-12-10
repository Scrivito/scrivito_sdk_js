import { getAssetUrlBase } from 'scrivito_sdk/app_support/asset_url_base';
import { isProbablyCloudUi } from 'scrivito_sdk/app_support/is_probably_cloud_ui';
import { getDocument } from 'scrivito_sdk/common';
import { loadCss } from 'scrivito_sdk/common';

export function loadEditingAssets() {
  loadEditingCss();
  importEditors().then(
    ({ initializeEditorsForCloudUi, initializeEditorsForPackagedUi }) => {
      if (isProbablyCloudUi()) initializeEditorsForCloudUi();
      else initializeEditorsForPackagedUi();
    }
  );
}

function loadEditingCss() {
  loadCss(`${getAssetUrlBase()}/scrivito_editing.css`, getDocument());
}

/** exported for test purposes only */
export function importEditors() {
  return import('editors');
}
