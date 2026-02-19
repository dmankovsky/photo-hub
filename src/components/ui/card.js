import React from "react";

export const Card = ({ children }) => {
  return <div className="bg-white shadow-lg rounded-lg p-4">{children}</div>;
};

export const CardHeader = ({ children }) => {
  return <div className="border-b pb-2 text-xl font-bold">{children}</div>;
};

export const CardContent = ({ children }) => {
  return <div className="p-2">{children}</div>;
};
