import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { Receipt, Shield, Zap, FileText, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="py-8 sm:py-16">
        <PageContainer className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent leading-tight">
            Create VAT Invoices Within Seconds
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Simplify your VAT management with our easy-to-use, efficient, and secure platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <Button 
              asChild 
              size="lg" 
              className="flex-1 h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700"
            >
              <Link href="/login">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="flex-1 h-12 text-lg font-medium border-gray-300 hover:bg-white/80"
            >
              <Link href="#features">
                Learn More
              </Link>
            </Button>
          </div>
        </PageContainer>
      </div>
      
      {/* Features Section */}
      <PageContainer size="xl" className="pb-16">
          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Quick Invoicing</h3>
                <p className="text-gray-600 leading-relaxed">Generate professional VAT invoices in seconds with our intuitive interface.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Tax Compliance</h3>
                <p className="text-gray-600 leading-relaxed">Stay compliant with the latest VAT regulations automatically.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Secure Storage</h3>
                <p className="text-gray-600 leading-relaxed">All your invoices are securely stored and accessible anytime.</p>
              </CardContent>
            </Card>
          </div>
        </PageContainer>

      {/* How it Works Section */}
      <PageContainer className="pb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-gray-900">
            How It Works
          </h2>
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                1
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Scan Your Receipts</h3>
                <p className="text-gray-600">Simply take photos of your fuel receipts using your mobile device camera.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                2
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Auto-Extract Data</h3>
                <p className="text-gray-600">Our AI automatically extracts all relevant information from your receipts.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                3
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Generate Invoice</h3>
                <p className="text-gray-600">Create professional VAT-compliant invoices instantly with all details filled.</p>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Button asChild size="lg" className="h-12 px-8 text-lg font-medium bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
              <Link href="/login">
                Start Creating Invoices
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </PageContainer>
    </main>
  );
}
