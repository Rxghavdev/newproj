import React from "react";
import { AiOutlineClose } from "react-icons/ai";

export default function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-gray-800 text-white rounded-lg shadow-lg w-11/12 md:w-1/2 lg:w-1/3">
        <div className="flex justify-between items-center border-b border-gray-700 p-4">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button onClick={onClose}>
            <AiOutlineClose size={24} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
