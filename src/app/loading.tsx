export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/95 backdrop-blur-sm font-sans transition-all duration-300">
      <div className="relative flex flex-col items-center">
        {/* Animated Brand Logo Container */}
        <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-[#177AE5]/20 animate-ping opacity-75" />
          <div className="relative w-16 h-16 rounded-2xl bg-[#177AE5] text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-[#177AE5]/30">
            R
          </div>
        </div>

        {/* Loading Text & Spinner */}
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            Renaissance Innovation Labs
          </h2>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
            <svg
              className="w-4 h-4 animate-spin text-[#177AE5]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Opening RIL Hub...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
