import { createPortal } from 'react-dom';
import ToastNotification from './ToastNotification';

const ToastContainer = ({ toasts, onHideToast }) => {
  if (!toasts || toasts.length === 0) return null;

  // Group toasts by position
  const groupedToasts = toasts.reduce((groups, toast) => {
    const position = toast.position || 'top-right';
    if (!groups[position]) {
      groups[position] = [];
    }
    groups[position].push(toast);
    return groups;
  }, {});

  const getPositionClasses = (position) => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4 flex flex-col gap-2';
      case 'top-right':
        return 'top-4 right-4 flex flex-col gap-2';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2 flex flex-col gap-2 items-center';
      case 'bottom-left':
        return 'bottom-4 left-4 flex flex-col-reverse gap-2';
      case 'bottom-right':
        return 'bottom-4 right-4 flex flex-col-reverse gap-2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col-reverse gap-2 items-center';
      default:
        return 'top-4 right-4 flex flex-col gap-2';
    }
  };

  const containerContent = (
    <>
      {Object.entries(groupedToasts).map(([position, positionToasts]) => (
        <div
          key={position}
          className={`fixed z-[300] max-w-sm ${getPositionClasses(position)}`}
        >
          {positionToasts.map((toast) => (
            <div
              key={toast.id}
              className="w-full transition-all duration-300 animate-slideInRight"
            >
              <ToastNotification
                isOpen={true}
                onClose={() => onHideToast(toast.id)}
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                position="static" // Override position since we handle it in container
              />
            </div>
          ))}
        </div>
      ))}
    </>
  );

  return createPortal(containerContent, document.body);
};

export default ToastContainer;