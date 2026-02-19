import React from 'react';

const PhotoCard = ({ photo, onSelect, isSelected }) => {
  return (
    <div
      className={`relative group border rounded-lg p-2 cursor-pointer ${
        isSelected ? "border-green-500" : "border-gray-300"
      }`}
      onClick={() => onSelect(photo._id)}
    >
      <img src={photo.url} alt={photo.name} className="w-full h-48 object-cover rounded-lg" />
      {photo.watermarked && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          Watermarked
        </div>
      )}
    </div>
  );
};

export default PhotoCard;
