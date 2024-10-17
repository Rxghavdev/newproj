# Task

## Table of Contents
- [Introduction](#introduction)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation) :  https://documenter.getpostman.com/view/22822128/2sAXxWYTj6
- [Folder Structure](#folder-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Introduction
Task is for 4tl4n, booking creation, and dynamic user interaction. The project consists of both a **frontend** built using React and a **backend** powered by Node.js and Express, connected to MongoDB for data management and Redis for caching driver locations.
Backend URL: https://logistic-73tw.onrender.com
Frontend URL: https://newproj-jjuo.onrender.com/

---

## Features
- **User Authentication**: Secure login and registration.
- **Real-Time Tracking**: Track drivers' locations on Google Maps.
- **Booking Management**: Create and manage active and past bookings.
- **Driver Ratings**: Rate drivers for completed trips.
- **Admin Dashboard**: Manage users, bookings, and drivers.

---

## Tech Stack
- **Frontend**: React, Google Maps API, TailwindCSS (or CSS)
- **Backend**: Node.js, Express.js, MongoDB, Redis
- **Database**: MongoDB with Mongoose ORM
- **Cache**: Redis for storing real-time locations
- **API Documentation**: Postman 

---

## Prerequisites
Ensure you have the following installed:
- **Node.js**: v14.x or above
- **npm**: v6.x or above
- **MongoDB**: Locally or via MongoDB Atlas
- **Redis**: Installed and running
- **Google Maps API Key**: With Places and Maps JavaScript API enabled

---

## Setup Instructions

### Backend Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Rxghavdev/newproj
   cd newproj/BE
   npm i
   create .env
2. **add env parameters**

  ```bash
   PORT=5000
   MONGO_URI=<your-mongodb-uri>
   REDIS_HOST=localhost
   REDIS_PORT=6379
   JWT_SECRET=<your-jwt-secret>
   FRONTEND_URL=http://localhost:3000
```

3. **run the server**

  ```bash
    redis server
    npm run dev

```

### Frontend Setup

1. Navigate to the frontend folder:

```bash
cd newproj/fe/logistic
```
2. Install dependencies and start

```bash
npm i
npm start
```

#Frontend .env

```bash
REACT_APP_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
REACT_APP_BACKEND_URL=http://localhost:5000
```

Access the application:

    Frontend: http://localhost:3000
    Backend: http://localhost:5000

  

