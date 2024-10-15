import axios from "axios";

const API_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:5000/api";

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export const setAuthToken = (token) => {
  if (token) {
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common["Authorization"];
  }
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.error("Session expired. Please log in again.");
      localStorage.removeItem("token");
      window.location.href = "/login"; // Redirect to login page
    }
    return Promise.reject(error);
  }
);

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

// Admin Routes
export const getAllBookings = () => axiosInstance.get("/admin/bookings");

export const getAnalytics = () => axiosInstance.get("/admin/analytics");

export const getAllDrivers = () => axiosInstance.get("/admin/drivers");

export const getDriverPerformance = (id) =>
  axiosInstance.get(`/admin/drivers/${id}`);

//driver routes

export const getPendingBookings = () => axiosInstance.get("/bookings/pending");

export const rateDriver = (data) => axiosInstance.post("/bookings/rate", data);
export const updateDriverLocation = (data) =>
  axiosInstance.post("/bookings/update-driver-location", data);

export const getDriverLocation = (driverId) =>
  axiosInstance.get(`/bookings/driver-location/${driverId}`);

export default axiosInstance;
