import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; // Adjust to your backend URL

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const login = (credentials) => axiosInstance.post('/users/login', credentials);
export const register = (data) => axiosInstance.post('/users/register', data);

export const createBooking = (data) => axiosInstance.post('/bookings', data);
