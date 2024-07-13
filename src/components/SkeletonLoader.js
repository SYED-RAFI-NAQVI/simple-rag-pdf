import React from "react";

const SkeletonLoader = ({ count, height }) => {
  return (
    <div className="p-4 w-full mx-auto">
      <div className="animate-pulse flex space-y-4">
        <div className="flex-1 space-y-6 py-1">
          {Array.from({ length: count }).map((_, index) => (
            <div
              key={index}
              className="bg-slate-300 rounded"
              style={{ height: `${height}rem` }} // Use inline style for height
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
