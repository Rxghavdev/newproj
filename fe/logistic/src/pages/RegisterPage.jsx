import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    vehicle: "",
    vehicleNumber: "",
  });
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await register(formData);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center">Register</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Name"
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md"
            required
          />
          <select
            name="role"
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md"
          >
            <option value="user">User</option>
            <option value="driver">Driver</option>
            <option value="admin">Admin</option>
          </select>
          {formData.role === "driver" && (
            <>
              <input
                type="text"
                name="vehicle"
                placeholder="Vehicle"
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md"
              />
              <input
                type="text"
                name="vehicleNumber"
                placeholder="Vehicle Number"
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md"
              />
            </>
          )}
          <button
            type="submit"
            className="w-full py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
}
