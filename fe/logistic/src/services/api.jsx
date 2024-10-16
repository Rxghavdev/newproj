import axios from "axios";

const API_URL =
  process.env.REACT_APP_BACKEND_URL || "https://logistic-73tw.onrender.com/api";

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const setAuthToken = (token) => {
  if (token) {
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common["Authorization"];
  }
};

// axiosInstance.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     if (error.response && error.response.status === 401) {
//       console.error("Session expired. Please log in again.");
//       localStorage.removeItem("token");
//       window.location.href = "/login";
//     }
//     return Promise.reject(error);
//   }
// );

export const login = (credentials) =>
  axiosInstance.post("/users/login", credentials);

export const register = (data) => axiosInstance.post("/users/register", data);

// User Booking Routes
export const createBooking = (data) =>
  axiosInstance.post("/bookings/create", data);

export const getUserBookings = () => axiosInstance.get("/bookings/my-bookings");

// Driver and Booking Routes
export const getAvailableBookings = () =>
  axiosInstance.get("/bookings/available");

export const acceptBooking = (data) =>
  axiosInstance.post("/bookings/accept", data);

export const updateJobStatus = (data) =>
  axiosInstance.put("/bookings/status", data);

export const getAllBookings = () => axiosInstance.get("/admin/bookings");

export const getAnalytics = () => axiosInstance.get("/admin/analytics");

export const getAllDrivers = () => axiosInstance.get("/admin/drivers");

export const getDriverPerformance = (id) =>
  axiosInstance.get(`/admin/drivers/${id}`);

export const getAllVehicles = () => axiosInstance.get("/admin/vehicles");

export const getVehicle = (id) => axiosInstance.get(`/admin/vehicles/${id}`);

//driver routes

export const getPendingBookings = () => axiosInstance.get("/bookings/pending");

export const rateDriver = (data) => axiosInstance.post("/bookings/rate", data);

export default axiosInstance;
