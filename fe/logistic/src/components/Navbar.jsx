// src/components/Navbar.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Corrected import

export default function Navbar() {
  const { user, logout } = useAuth(); // Destructure user and logout from context
  console.log("Navbar User:", user); // Debugging line

  return (
    <nav className="bg-blue-600 p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-white text-lg font-bold">Atlan Logistics</h1>
        <div className="space-x-4">
          <Link to="/" className="text-white hover:underline">
            Home
          </Link>
          
          {user ? (
            // If user is logged in, show Logout button
            <button
              onClick={logout}
              className="text-white hover:underline focus:outline-none"
            >
              Logout
            </button>
          ) : (
            // If user is not logged in, show Login and Register links
            <>
              <Link to="/login" className="text-white hover:underline">
                Login
              </Link>
              <Link to="/register" className="text-white hover:underline">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
