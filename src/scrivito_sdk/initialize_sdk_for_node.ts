import { XMLHttpRequest } from 'w3c-xmlhttprequest';
import { setOriginProvider } from 'scrivito_sdk/app_support/current_origin';
import { currentSiteId } from 'scrivito_sdk/app_support/current_page';
import { setHtmlToTextConverter } from 'scrivito_sdk/app_support/extract_text/remove_html_tags';
import { initialContentFor } from 'scrivito_sdk/app_support/initialize_content';
import { useDefaultPriority, useXmlHttpRequest } from 'scrivito_sdk/client';
import {
  ObjBackendReplication,
  useReplicationStrategy,
} from 'scrivito_sdk/data';
import { htmlToTextForNode } from 'scrivito_sdk/node_support/html_to_text_for_node';
import { setCurrentSiteIdHandler } from 'scrivito_sdk/realm';
import { setInitialContentFor } from 'scrivito_sdk/realm/initial_content_registry';

export function initializeSdk() {
  setOriginProvider(() => undefined);
  setCurrentSiteIdHandler(currentSiteId);
  useReplicationStrategy(ObjBackendReplication);
  setHtmlToTextConverter(htmlToTextForNode);
  useXmlHttpRequest(XMLHttpRequest);
  useDefaultPriority('background');
  setInitialContentFor(initialContentFor);
}
