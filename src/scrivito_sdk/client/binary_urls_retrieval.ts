import { BinaryRetrievalOptions } from 'scrivito_sdk/client/binary_retrieval_options';
import { JSONObject, cmsRestApi } from 'scrivito_sdk/client/cms_rest_api';
import { asBackendObjSpaceId } from 'scrivito_sdk/client/obj_space_id';
import { BatchRetrieval, InternalError } from 'scrivito_sdk/common';
import { TransformationDefinition } from 'scrivito_sdk/models';

export type BackendBinaryData =
  | PublicBackendBinaryData
  | PrivateBackendBinaryData;

interface PublicBackendBinaryData {
  public_access: {
    get: {
      url: string;
    };
  };

  private_access?: {
    get: {
      url: string;
    };
  };
}

interface PrivateBackendBinaryData {
  public_access?: undefined;
  private_access: {
    get: {
      url: string;
    };
  };
}

interface BinaryRequest {
  id: string;
  transformation?: TransformationDefinition;
  access_via?: string;
}

const batchRetrieval = new BatchRetrieval<BinaryRequest, BackendBinaryData>(
  (blobs) =>
    cmsRestApi
      .get('blobs/mget', { blobs })
      .then(({ results }: { results: JSONObject[] }) =>
        results.map((result) => parseBackendResponse(result))
      )
);

export function retrieveBinaryUrls(
  binaryId: string,
  transformation?: TransformationDefinition,
  options?: BinaryRetrievalOptions
): Promise<BackendBinaryData> {
  const blob: BinaryRequest = { id: binaryId };

  if (transformation) {
    blob.transformation = transformation;
  }

  if (options?.accessVia) {
    blob.access_via = asBackendObjSpaceId(options.accessVia);
  }

  return batchRetrieval.retrieve(blob);
}

function parseBackendResponse(response: JSONObject): BackendBinaryData {
  const publicAccessData = response.public_access as JSONObject;
  const getPublicAccessData = publicAccessData.get as JSONObject;

  if (!getPublicAccessData.url) throw new InternalError();

  const binaryData: BackendBinaryData = {
    public_access: {
      get: {
        url: getPublicAccessData.url as string,
      },
    },
  };

  const privateAccessData = response.private_access as JSONObject;

  if (privateAccessData) {
    const getPrivateAccessData = privateAccessData.get as JSONObject;

    if (getPrivateAccessData.url) {
      binaryData.private_access = {
        get: {
          url: getPrivateAccessData.url as string,
        },
      };
    }
  }

  return binaryData;
}
