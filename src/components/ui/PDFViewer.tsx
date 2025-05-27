'use client';

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Polyfill for Promise.withResolvers if not available
if (typeof Promise.withResolvers === 'undefined') {
  // @ts-ignore
  Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Set up the worker with local fallback to avoid CORS issues
if (typeof window !== 'undefined') {
  try {
    // Try local import approach first
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  } catch (error) {
    console.warn('Local worker setup failed, using CDN fallback:', error);
    // Fallback to legacy CDN approach
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  }
}

interface PDFViewerProps {
  pdfUrl?: string;
  pdfBlob?: Blob;
  title?: string;
  loading?: boolean;
}

export default function PDFViewer({ pdfUrl, pdfBlob, title = "Invoice Preview", loading = false }: PDFViewerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber] = useState<number>(1); // Always show page 1 for invoices
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBlob) {
      // Create object URL from blob
      const url = URL.createObjectURL(pdfBlob);
      setPreviewUrl(url);
      
      // Cleanup function
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (pdfUrl) {
      setPreviewUrl(pdfUrl);
    }
  }, [pdfBlob, pdfUrl]);

  useEffect(() => {
    // Calculate optimal width based on viewport
    const calculateWidth = () => {
      const viewportWidth = window.innerWidth;
      const containerPadding = 64; // 4rem padding total
      const maxWidth = viewportWidth - containerPadding;
      
      // For mobile, use full available width but cap at reasonable size
      // For desktop, limit to reasonable reading size
      const optimalWidth = Math.min(maxWidth, 800);
      setPageWidth(Math.max(optimalWidth, 300)); // Minimum 300px
    };

    calculateWidth();
    window.addEventListener('resize', calculateWidth);
    
    return () => window.removeEventListener('resize', calculateWidth);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setPdfError('Failed to load PDF. Please try refreshing the page.');
  };

  if (loading) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-600">Generating PDF...</p>
          </div>
        </div>
      </div>
    );
  }

  if (pdfError) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">{pdfError}</p>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open PDF in New Tab
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600">No PDF available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open
          </a>
        </div>
      </div>
      
      {/* PDF Viewer Container */}
      <div className="relative w-full p-4">
        <div className="flex justify-center">
          <Document
            file={previewUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="text-gray-600 text-sm">Loading PDF...</p>
                </div>
              </div>
            }
            error={
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="text-red-500 mb-2">
                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 text-sm">Unable to load PDF</p>
                </div>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-lg mx-auto"
            />
          </Document>
        </div>
        
        {numPages > 1 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Page {pageNumber} of {numPages}
            </p>
          </div>
        )}
      </div>
      
      {/* Footer with additional options */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            📄 Professional A4 Invoice • Scaled to fit your screen
          </p>
          <a 
            href={previewUrl} 
            download
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Download PDF
          </a>
        </div>
      </div>
    </div>
  );
} 