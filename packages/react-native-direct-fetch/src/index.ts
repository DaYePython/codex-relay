import { NitroModules } from "react-native-nitro-modules";
import type {
  DirectFetch as DirectFetchSpec,
  DirectFetchDownloadRequest as NativeDirectFetchDownloadRequest,
  DirectFetchDownloadResponse as NativeDirectFetchDownloadResponse,
  DirectFetchRequest as NativeDirectFetchRequest,
  DirectFetchResponse as NativeDirectFetchResponse,
  DirectFetchStreamChunk,
} from "./specs/direct-fetch.nitro";

export const DirectFetch = NitroModules.createHybridObject<DirectFetchSpec>("DirectFetch");

export interface DirectFetchHeader {
  key: string;
  value: string;
}

export type DirectFetchRequest = Omit<NativeDirectFetchRequest, "headersJson"> & {
  headers?: DirectFetchHeader[];
};

export type DirectFetchDownloadRequest = Omit<NativeDirectFetchDownloadRequest, "headersJson"> & {
  headers?: DirectFetchHeader[];
};

export type DirectFetchResponse = Omit<NativeDirectFetchResponse, "headersJson"> & {
  headers: DirectFetchHeader[];
};

export type DirectFetchDownloadResponse = Omit<NativeDirectFetchDownloadResponse, "headersJson"> & {
  headers: DirectFetchHeader[];
};

type DirectFetchInit = RequestInit & {
  timeoutMs?: number;
};

export async function dfetch(input: RequestInfo | URL, init?: DirectFetchInit): Promise<Response> {
  const request = await normalizeRequest(input, init);
  const response = await fetchDirect(request);
  return new Response(response.bodyString, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers.reduce<Record<string, string>>((headers, header) => {
      headers[header.key] = header.value;
      return headers;
    }, {}),
  });
}

export async function dfetchStream(
  input: RequestInfo | URL,
  init: DirectFetchInit | undefined,
  onChunk: (chunk: string) => void,
): Promise<Response> {
  const request = await normalizeRequest(input, init);
  const stream = (DirectFetch as Partial<DirectFetchSpec>).stream;
  if (typeof stream !== "function") {
    const response = await fetchDirect(request);
    if (response.bodyString) {
      onChunk(response.bodyString);
    }
    return directFetchResponseToFetchResponse(response);
  }

  const response = await stream.call(
    DirectFetch,
    {
      url: request.url,
      method: request.method,
      headersJson: JSON.stringify(request.headers ?? []),
      bodyString: request.bodyString,
      timeoutMs: request.timeoutMs,
    },
    (chunk: DirectFetchStreamChunk) => {
      if (chunk.bodyString) {
        onChunk(chunk.bodyString);
      }
    },
  );
  return directFetchResponseToFetchResponse({
    ...response,
    headers: parseHeaders(response.headersJson),
  });
}

export async function dfetchDownload(
  input: RequestInfo | URL,
  fileUri: string,
  init?: DirectFetchInit,
): Promise<DirectFetchDownloadResponse> {
  const request = await normalizeRequest(input, init);
  const response = await DirectFetch.download({
    url: request.url,
    fileUri,
    method: request.method,
    headersJson: JSON.stringify(request.headers ?? []),
    bodyString: request.bodyString,
    timeoutMs: request.timeoutMs,
  });
  return {
    ...response,
    headers: parseHeaders(response.headersJson),
  };
}

export const fetch = dfetch;

async function fetchDirect(request: DirectFetchRequest): Promise<DirectFetchResponse> {
  const response = await DirectFetch.fetch({
    url: request.url,
    method: request.method,
    headersJson: JSON.stringify(request.headers ?? []),
    bodyString: request.bodyString,
    timeoutMs: request.timeoutMs,
  });
  return {
    ...response,
    headers: parseHeaders(response.headersJson),
  };
}

function directFetchResponseToFetchResponse(response: DirectFetchResponse) {
  return new Response(response.bodyString, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers.reduce<Record<string, string>>((headers, header) => {
      headers[header.key] = header.value;
      return headers;
    }, {}),
  });
}

async function normalizeRequest(
  input: RequestInfo | URL,
  init?: DirectFetchInit,
): Promise<DirectFetchRequest> {
  const request = isRequest(input) ? input : undefined;
  const url = request?.url ?? input.toString();
  const method = init?.method ?? request?.method ?? "GET";
  const headers = directFetchHeaders(request?.headers, init?.headers);
  const bodyString = await normalizeBody(
    init?.body ?? (request ? await request.text() : undefined),
  );
  return {
    url,
    method,
    headers,
    bodyString,
    timeoutMs: init?.timeoutMs ?? 30000,
  };
}

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

async function normalizeBody(body: BodyInit | null | undefined): Promise<string | undefined> {
  if (body == null) {
    return undefined;
  }
  if (typeof body === "string") {
    return body;
  }
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return body.toString();
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return await body.text();
  }
  if (body instanceof ArrayBuffer) {
    return new TextDecoder().decode(body);
  }
  if (ArrayBuffer.isView(body)) {
    return new TextDecoder().decode(body);
  }
  throw new TypeError(
    "dfetch currently supports string, URLSearchParams, Blob, and BufferSource bodies.",
  );
}

function directFetchHeaders(...inputs: Array<HeadersInit | undefined>): DirectFetchHeader[] {
  const headers = new Headers();
  for (const input of inputs) {
    if (!input) {
      continue;
    }
    new Headers(input).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return Array.from(headers.entries()).map(([key, value]) => ({ key, value }));
}

function parseHeaders(headersJson: string): DirectFetchHeader[] {
  try {
    const headers = JSON.parse(headersJson);
    if (!Array.isArray(headers)) {
      return [];
    }
    return headers.flatMap((header) => {
      if (
        typeof header === "object" &&
        header !== null &&
        typeof header.key === "string" &&
        typeof header.value === "string"
      ) {
        return [{ key: header.key, value: header.value }];
      }
      return [];
    });
  } catch {
    return [];
  }
}
