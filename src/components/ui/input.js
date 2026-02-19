import React from "react";

export const Input = ({ type = "text", placeholder, value, onChange, className }) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`border rounded p-2 ${className}`}
    />
  );
};
