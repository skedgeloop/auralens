import React, { useEffect, useState } from 'react';
import { FiCheck, FiX, FiInfo } from 'react-icons/fi';

const ICONS = {
  success: <FiCheck className="w-4 h-4 text-emerald-400" />,
  error: <FiX className="w-4 h-4 text-red-400" />,
  info: <FiInfo className="w-4 h-4 text-blue-400" />,
};

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 250); // wait for fade-out
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`}
      style={{
        animation: visible ? 'toast-in 0.25s ease' : 'toast-out 0.25s ease forwards',
        opacity: visible ? 1 : 0,
      }}
    >
      {ICONS[type] || ICONS.info}
      <span className="text-[var(--text)]">{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 250); }}
        className="ml-2 text-[var(--text-dim)] hover:text-white"
      >
        <FiX className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
