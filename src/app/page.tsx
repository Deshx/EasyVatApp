import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
          Create VAT Invoices Within Seconds
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-10">
          Simplify your VAT management with our easy-to-use, efficient, and secure platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/login" 
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-lg"
          >
            Get Started
          </Link>
          <Link 
            href="#features" 
            className="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-lg"
          >
            Learn More
          </Link>
        </div>
      </div>
      
      <div className="mt-20 w-full max-w-5xl">
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-3">Quick Invoicing</h3>
            <p className="text-gray-600">Generate professional VAT invoices in seconds with our intuitive interface.</p>
          </div>
          <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-3">Tax Compliance</h3>
            <p className="text-gray-600">Stay compliant with the latest VAT regulations automatically.</p>
          </div>
          <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-3">Secure Storage</h3>
            <p className="text-gray-600">All your invoices are securely stored and accessible anytime.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
