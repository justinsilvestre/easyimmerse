import type {
  HealthReport,
  NewProject,
  Project,
} from "@easyimmerse/api/contract";
import {
  type BaseQueryFn,
  createApi,
  type FetchArgs,
  type FetchBaseQueryError,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import type { AppState } from "./AppState.ts";

type ServerQuery = BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
>;

/** Sends requests to the server whose address is held in the app state at the time of the request. */
const queryCurrentServer: ServerQuery = (fetchArguments, api, extraOptions) => {
  const { serverUrl } = (api.getState() as { app: AppState }).app;
  if (!serverUrl) return { error: noServerError };
  const queryServer = fetchBaseQuery({ baseUrl: serverUrl });
  return queryServer(fetchArguments, api, extraOptions);
};

const noServerError: FetchBaseQueryError = {
  status: "CUSTOM_ERROR",
  error: "No server is available.",
};

export const serverApi = createApi({
  reducerPath: "serverApi",
  baseQuery: queryCurrentServer,
  tagTypes: ["Project"],
  endpoints: (build) => ({
    getHealthReport: build.query<HealthReport, void>({
      query: () => "/health",
    }),
    getProjects: build.query<Project[], void>({
      query: () => "/projects",
      providesTags: ["Project"],
    }),
    createProject: build.mutation<Project, NewProject>({
      query: (body) => ({ url: "/projects", method: "POST", body }),
      invalidatesTags: ["Project"],
    }),
  }),
});

export const {
  useGetHealthReportQuery,
  useGetProjectsQuery,
  useCreateProjectMutation,
} = serverApi;
