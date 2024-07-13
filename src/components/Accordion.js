import { useState } from "react";

const Accordion = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
      >
        {title}
      </button>
      {isOpen && (
        <div className="px-4 py-2 bg-gray-100 rounded">{children}</div>
      )}
    </div>
  );
};

export default Accordion;
