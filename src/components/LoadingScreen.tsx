import React from 'react'

const LoadingScreen: React.FC<{ message?: string }> = ({ message = '載入中...' }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  </div>
)

export default LoadingScreen
