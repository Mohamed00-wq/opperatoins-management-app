(function (global) {
  "use strict";

  const OMS = (global.OMS = global.OMS || {});

  const API_BASE_URL = "http://localhost:8000/api/v1";
  const REQUEST_TIMEOUT = 12000;
  const USE_MOCK_DATA = true;

  OMS.apiConfig = {
    baseUrl: API_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    useMockData: USE_MOCK_DATA
  };

  class ApiError extends Error {
    constructor(message, status, details) {
      super(message);
      this.name = "ApiError";
      this.status = status || 0;
      this.details = details || null;
    }
  }

  function getStoredSession() {
    try {
      return JSON.parse(localStorage.getItem(OMS.storage.auth) || "null");
    } catch (error) {
      return null;
    }
  }

  function buildUrl(path, query) {
    const url = new URL(API_BASE_URL.replace(/\/$/, "") + path);
    if (query) {
      Object.keys(query).forEach(function (key) {
        const value = query[key];
        if (value === undefined || value === null || value === "" || value === "all") return;
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  }

  async function request(path, options) {
    const settings = options || {};
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT);
    const headers = { Accept: "application/json" };
    const session = getStoredSession();
    if (session && session.token) {
      headers.Authorization = "Bearer " + session.token;
    }
    if (settings.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(buildUrl(path, settings.query), {
        method: settings.method || "GET",
        headers: headers,
        body: settings.body !== undefined ? JSON.stringify(settings.body) : undefined,
        signal: controller.signal
      });
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message =
          (payload && (payload.detail || payload.message)) ||
          "Request failed with status " + response.status + ".";
        throw new ApiError(typeof message === "string" ? message : "Request failed.", response.status, payload);
      }
      return payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error.name === "AbortError") {
        throw new ApiError("The request timed out. Please try again.", 408);
      }
      throw new ApiError("Unable to reach the API. Check that the backend is running.", 0, error);
    } finally {
      clearTimeout(timer);
    }
  }

  function useMock(mockCall, realCall) {
    if (USE_MOCK_DATA) {
      return mockCall();
    }
    return realCall();
  }

  const ApiClient = {
    get: function (path, query) {
      return request(path, { method: "GET", query: query });
    },
    post: function (path, body) {
      return request(path, { method: "POST", body: body });
    },
    patch: function (path, body) {
      return request(path, { method: "PATCH", body: body });
    },
    delete: function (path) {
      return request(path, { method: "DELETE" });
    }
  };

  const Api = {
    mode: USE_MOCK_DATA ? "mock" : "live",

    auth: {
      login: function (payload) {
        return useMock(
          function () { return MockService.login(payload); },
          function () { return ApiClient.post("/auth/login", payload); }
        );
      },
      register: function (payload) {
        return useMock(
          function () { return MockService.register(payload); },
          function () { return ApiClient.post("/auth/register", payload); }
        );
      },
      me: function () {
        return useMock(
          function () {
            const session = getStoredSession();
            if (!session) return Promise.reject(new ApiError("Not authenticated.", 401));
            return Promise.resolve(session.user);
          },
          function () { return ApiClient.get("/auth/me"); }
        );
      }
    },

    tasks: {
      list: function (params) {
        return useMock(
          function () { return MockService.getTasks(params); },
          function () { return ApiClient.get("/tasks", params); }
        );
      },
      create: function (payload) {
        return useMock(
          function () { return MockService.createTask(payload); },
          function () { return ApiClient.post("/tasks", payload); }
        );
      },
      update: function (id, payload) {
        return useMock(
          function () { return MockService.updateTask(id, payload); },
          function () { return ApiClient.patch("/tasks/" + encodeURIComponent(id), payload); }
        );
      },
      remove: function (id) {
        return useMock(
          function () { return MockService.deleteTask(id); },
          function () { return ApiClient.delete("/tasks/" + encodeURIComponent(id)); }
        );
      }
    },

    users: {
      list: function (params) {
        return useMock(
          function () { return MockService.getUsers(params); },
          function () { return ApiClient.get("/users", params); }
        );
      },
      create: function (payload) {
        return useMock(
          function () { return MockService.createUser(payload); },
          function () { return ApiClient.post("/users", payload); }
        );
      },
      update: function (id, payload) {
        return useMock(
          function () { return MockService.updateUser(id, payload); },
          function () { return ApiClient.patch("/users/" + encodeURIComponent(id), payload); }
        );
      }
    },

    logs: {
      list: function (params) {
        return useMock(
          function () { return MockService.getLogs(params); },
          function () { return ApiClient.get("/logs", params); }
        );
      }
    },

    dashboard: {
      get: function () {
        return useMock(
          function () { return MockService.getDashboard(); },
          function () { return ApiClient.get("/dashboard/overview"); }
        );
      }
    },

    health: {
      get: function () {
        return useMock(
          function () { return MockService.getHealth(); },
          function () { return ApiClient.get("/health"); }
        );
      }
    },

    demo: {
      reset: function () {
        return useMock(
          function () { return MockService.reset(); },
          function () { return Promise.reject(new ApiError("Demo reset is only available in mock mode.", 400)); }
        );
      }
    }
  };

  OMS.ApiClient = ApiClient;
  OMS.ApiError = ApiError;
  global.Api = Api;
})(window);
