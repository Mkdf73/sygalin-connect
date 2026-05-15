import axios from "axios";

const defaultBaseUrl = `http://${window.location.hostname}:8000/api/v1`;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    // Break circular dependency by getting token from localStorage directly
    try {
      const authData = localStorage.getItem("sygalin-auth");
      if (authData) {
        const { state } = JSON.parse(authData);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      }
    } catch (e) {
      console.error("Error reading auth token from localStorage", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si la requête de rafraîchissement échoue avec 401, on déconnecte directement
    if (error.response?.status === 401 && originalRequest.url?.includes("/auth/refresh")) {
       localStorage.removeItem("sygalin-auth");
       window.location.href = "/login";
       return Promise.reject(error);
    }

    // Gérer l'expiration du token (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const authData = localStorage.getItem("sygalin-auth");
        let refreshToken = null;
        if (authData) {
            const { state } = JSON.parse(authData);
            refreshToken = state?.refreshToken;
        }

        if (!refreshToken) {
           throw new Error("No refresh token available");
        }

        // Appel avec axios natif pour éviter une boucle infinie
        const defaultBaseUrl = `http://${window.location.hostname}:8000/api/v1`;
        const response = await axios.post(
            (import.meta.env.VITE_API_URL || defaultBaseUrl) + "/auth/refresh",
            { refresh_token: refreshToken }
        );

        const { access_token, refresh_token: new_refresh_token } = response.data;
        
        // Mettre à jour localStorage directement
        if (authData) {
           const parsedData = JSON.parse(authData);
           parsedData.state.token = access_token;
           parsedData.state.refreshToken = new_refresh_token;
           localStorage.setItem("sygalin-auth", JSON.stringify(parsedData));
        }

        originalRequest.headers['Authorization'] = 'Bearer ' + access_token;
        
        processQueue(null, access_token);
        
        return api(originalRequest);
      } catch (e) {
        processQueue(e, null);
        localStorage.removeItem("sygalin-auth");
        window.location.href = "/login";
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
