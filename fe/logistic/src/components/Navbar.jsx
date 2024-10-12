import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-blue-600 p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-white text-lg font-bold">Atlan Logistics</h1>
        <div className="space-x-4">
          <Link to="/" className="text-white hover:underline">
            Home
          </Link>
          <Link to="/login" className="text-white hover:underline">
            Login
          </Link>
          <Link to="/register" className="text-white hover:underline">
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}
