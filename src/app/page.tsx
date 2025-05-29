import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { Receipt, Shield, Zap, FileText, ArrowRight, Star, Users, Clock } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="py-12 sm:py-20 lg:py-24">
        <PageContainer className="text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-500 bg-clip-text text-transparent leading-tight tracking-tight">
              Create VAT Invoices 
              <span className="block">Within Seconds</span>
            </h1>
            <p className="text-xl sm:text-2xl lg:text-3xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              Simplify your VAT management with our easy-to-use, efficient, and secure platform.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-lg mx-auto mb-16">
              <Button 
                asChild 
                size="lg" 
                className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0"
              >
                <Link href="/login">
                  <span className="relative z-10 flex items-center justify-center text-lg">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="group font-semibold py-6 px-8 rounded-2xl border-2 border-slate-300 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Link href="#features">
                  <span className="text-lg">Learn More</span>
                </Link>
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center text-slate-500 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>Average setup: 2 minutes</span>
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
      
      {/* Features Section */}
      <PageContainer size="xl" className="pb-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-slate-800">
            Why Choose EasyVat?
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Everything you need to manage VAT invoices efficiently and professionally
          </p>
        </div>
        
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden transform hover:scale-105">
            <CardContent className="p-8 text-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-800">Quick Invoicing</h3>
                <p className="text-slate-600 leading-relaxed text-lg">Generate professional VAT invoices in seconds with our intuitive interface.</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden transform hover:scale-105">
            <CardContent className="p-8 text-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-6 shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-800">Tax Compliance</h3>
                <p className="text-slate-600 leading-relaxed text-lg">Stay compliant with the latest VAT regulations automatically.</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden transform hover:scale-105">
            <CardContent className="p-8 text-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-6 shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-800">Secure Storage</h3>
                <p className="text-slate-600 leading-relaxed text-lg">All your invoices are securely stored and accessible anytime.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>

      {/* How it Works Section */}
      <PageContainer className="pb-20">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-xl">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-16 text-slate-800">
            How It Works
          </h2>
          <div className="space-y-12">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                1
              </div>
              <div className="text-center lg:text-left">
                <h3 className="text-2xl font-bold mb-4 text-slate-800">Scan Your Receipts</h3>
                <p className="text-slate-600 text-lg leading-relaxed">Simply take photos of your fuel receipts using your mobile device camera.</p>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                2
              </div>
              <div className="text-center lg:text-left">
                <h3 className="text-2xl font-bold mb-4 text-slate-800">Auto-Extract Data</h3>
                <p className="text-slate-600 text-lg leading-relaxed">Our AI automatically extracts all relevant information from your receipts.</p>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                3
              </div>
              <div className="text-center lg:text-left">
                <h3 className="text-2xl font-bold mb-4 text-slate-800">Generate Invoice</h3>
                <p className="text-slate-600 text-lg leading-relaxed">Create professional VAT-compliant invoices instantly with all details filled.</p>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-16">
            <Button 
              asChild 
              size="lg" 
              className="group relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-500 hover:from-blue-700 hover:via-purple-700 hover:to-teal-600 text-white font-semibold py-6 px-10 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0"
            >
              <Link href="/login">
                <span className="relative z-10 flex items-center justify-center text-lg">
                  Start Creating Invoices
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-purple-700 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </Button>
          </div>
        </div>
      </PageContainer>

      {/* Footer */}
      <footer className="bg-white/90 backdrop-blur-sm border-t border-slate-200">
        <PageContainer className="py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold text-slate-800 mb-3">EasyVat</h3>
              <p className="text-slate-600 text-lg">Your VAT management made easy</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 text-center">
              <Link 
                href="/privacy-policy" 
                className="text-slate-600 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                Privacy Policy
              </Link>
              <Link 
                href="/terms-and-conditions" 
                className="text-slate-600 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                Terms and Conditions
              </Link>
              <Link 
                href="/refund-policy" 
                className="text-slate-600 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                Refund Policy
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-200 text-center">
            <p className="text-slate-500">
              © {new Date().getFullYear()} EasyVat. All rights reserved.
            </p>
          </div>
        </PageContainer>
      </footer>
    </main>
  );
}
