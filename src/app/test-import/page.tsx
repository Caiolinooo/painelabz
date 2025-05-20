'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';

// Define a type for the dynamic import result
type DynamicImportResult = { default: React.ComponentType<any> };

// Dynamically import the test component
const TestComponent = React.lazy(() => {
  return new Promise<DynamicImportResult>((resolve) => {
    // Use a setTimeout to break potential circular dependencies
    setTimeout(() => {
      import('@/components/TestComponent')
        .then(mod => {
          // Safely handle the module import
          const Component = mod.default || mod;
          resolve({ default: Component });
        })
        .catch(err => {
          console.error('Error loading TestComponent:', err);
          // Log more detailed error information
          console.error('Error details:', {
            name: err.name,
            message: err.message,
            stack: err.stack,
            cause: err.cause
          });
          
          // Create a more informative error component
          const FallbackComponent: React.FC = () => (
            <div className="p-6 text-center">
              <div className="text-red-500 mb-4">
                <h3 className="text-lg font-semibold">Error loading test component</h3>
              </div>
              <p className="text-gray-600 mb-4">
                There was an error loading the test component.
              </p>
              <p className="text-gray-500 text-sm mb-4">
                Technical details: {err.message || 'Unknown error'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Try again
              </button>
            </div>
          );
          resolve({ default: FallbackComponent });
        });
    }, 100);
  });
});

export default function TestImportPage() {
  const [showComponent, setShowComponent] = useState(false);
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Test Dynamic Import</h1>
        
        <button
          onClick={() => setShowComponent(!showComponent)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showComponent ? 'Hide Component' : 'Show Component'}
        </button>
        
        {showComponent && (
          <React.Suspense fallback={
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading component...</p>
            </div>
          }>
            <TestComponent />
          </React.Suspense>
        )}
        
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Instructions</h2>
          <p className="mb-2">
            Click the "Show Component" button above to test dynamic loading of a component.
          </p>
          <p>
            If the component loads successfully, you'll see a simple test component.
            If there's an error, you'll see an error message with details.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
