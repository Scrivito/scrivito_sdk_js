import { uiAdapter } from 'scrivito_sdk/app_support/ui_adapter';
import { Editor } from 'scrivito_sdk/models';

/** @public */
export function currentEditor(): Editor | null {
  if (!uiAdapter) return null;

  const editorData = uiAdapter.currentEditor();
  const teamsData = uiAdapter.currentEditorTeams();

  return editorData && teamsData ? new Editor(editorData, teamsData) : null;
}
