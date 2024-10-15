import React from "react";

export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-800 dark:to-gray-900">
      <div className="p-8 bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 rounded-lg shadow-lg text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-blue-600 dark:text-blue-400">
          On-demand Logistic Service ~ Atlan
        </h1>
        <p className="mt-6 text-xl md:text-2xl text-gray-700 dark:text-gray-300">
        Seamlessly connecting customers with fast, reliable logistics—anytime, anywhere.        </p>
        <div className="mt-8">
          <button 
            onClick={() => window.location.href = '/register'} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-500 transition duration-300 dark:bg-blue-500 dark:hover:bg-blue-400">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
