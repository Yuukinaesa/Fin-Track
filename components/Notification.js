// components/Notification.js
import Modal from './Modal';

export default function Notification({ notification, onClose }) {
  if (!notification || !notification.isOpen) return null;
  
  return (
    <Modal
      isOpen={notification.isOpen}
      onClose={onClose}
      title={notification.title}
      type={notification.type}
    >
      <p>{notification.message}</p>
      <div className="mt-4 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-800 dark:text-white font-medium"
        >
          Tutup
        </button>
      </div>
    </Modal>
  );
}