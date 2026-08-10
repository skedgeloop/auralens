/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
import React, { useEffect, useState } from 'react';
import { FiCheck, FiX, FiInfo } from 'react-icons/fi';

const ICONS = {
  success: <FiCheck className="w-4 h-4 text-[var(--pink)]" />,
  error: <FiX className="w-4 h-4 text-[var(--danger)]" />,
  info: <FiInfo className="w-4 h-4 text-white" />,
};

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className="toast"
      style={{
        animation: visible ? 'toast-in 0.2s ease' : 'toast-out 0.2s ease forwards',
      }}
    >
      {ICONS[type] || ICONS.info}
      <span>{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 200); }}
        className="ml-2 text-[var(--text-dim)] hover:text-white"
      >
        <FiX className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
