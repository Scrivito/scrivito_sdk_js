import {
  ObjSpaceId,
  cmsRestApi,
  isWorkspaceObjSpaceId,
} from 'scrivito_sdk/client';
import { InternalError } from 'scrivito_sdk/common';

export async function copyObj({
  fromObjSpaceId,
  fromObjId,
  toObjSpaceId,
  toObjId,
}: {
  fromObjSpaceId: ObjSpaceId;
  fromObjId: string;
  toObjSpaceId: ObjSpaceId;
  toObjId: string;
}): Promise<void> {
  if (
    !isWorkspaceObjSpaceId(fromObjSpaceId) ||
    !isWorkspaceObjSpaceId(toObjSpaceId)
  ) {
    throw new InternalError();
  }

  await cmsRestApi.put(`workspaces/${toObjSpaceId[1]}/objs/${toObjId}`, {
    copy_from: {
      workspace_id: fromObjSpaceId[1],
      obj_id: fromObjId,
    },
  });
}
