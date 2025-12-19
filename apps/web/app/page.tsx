'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Marquee from '@/components/Marquee';

function AnimatedCounter({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count}{suffix}</span>;
}

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [descriptionIndex, setDescriptionIndex] = useState(0);

  const descriptions = [
    "Streamline your vacation rental reviews across multiple platforms. Intelligent approval workflows, real-time analytics, and guest sentiment tracking.",
    "Centralize review management from Airbnb, VRBO, and Booking.com. Automated workflows save hours every week with smart insights.",
    "Transform guest feedback into actionable insights. AI-powered sentiment analysis helps you identify trends and improve satisfaction.",
    "Manage all property reviews in one place. Instant approval notifications, performance metrics, and comprehensive reporting tools."
  ];

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDescriptionIndex((prev) => (prev + 1) % descriptions.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [descriptions.length]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Navigation Menu */}
      <div className="fixed top-6 right-6 z-50">
        {/* Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-12 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center justify-center"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Menu Dropdown */}
        {menuOpen && (
          <div className="absolute top-16 right-0 w-48 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-5 py-3 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors border-b border-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-medium">Home</span>
            </Link>
            <Link
              href="/listings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-5 py-3 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors border-b border-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="font-medium">Listings</span>
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-5 py-3 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">Dashboard</span>
            </Link>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[600px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop&q=80"
            alt="Luxury property interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-white/70"></div>
        </div>
        
        <div className="container mx-auto px-4 pt-20 pb-32 relative z-10">
          <div className={`max-w-6xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-full mb-8">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium text-amber-900">Trusted by Premium Property Managers</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-7xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent leading-tight">
              Flex Living
            </h1>
            <p className="text-3xl md:text-4xl font-light text-slate-600 mb-8">
              Elegant Review Management
            </p>
            <div className="text-xl text-slate-500 max-w-3xl mx-auto mb-12 leading-relaxed min-h-[96px] flex items-center justify-center relative overflow-hidden">
              <p 
                className="absolute inset-0 flex items-center justify-center px-4 transition-all duration-700 ease-in-out"
                style={{
                  opacity: 1,
                  transform: 'translateY(0) scale(1)',
                  animation: `fadeSlideIn 7s ease-in-out infinite`
                }}
                key={descriptionIndex}
              >
                {descriptions[descriptionIndex]}
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
              <Link
                href="/dashboard"
                className="group relative px-8 py-4 bg-slate-900 text-white rounded-lg font-medium overflow-hidden transition-all hover:shadow-2xl hover:shadow-slate-900/30 hover:scale-105"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Manager Dashboard
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </Link>

              <Link
                href="/listings"
                className="px-8 py-4 bg-white text-slate-900 rounded-lg font-medium border-2 border-slate-200 hover:border-slate-900 transition-all hover:shadow-xl"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Browse Reviews
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Animated Stats */}
        <div className="container mx-auto px-4 -mt-12 mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
                <div className="text-4xl font-bold text-slate-900 mb-2">
                  <AnimatedCounter end={1000} suffix="+" />
                </div>
                <div className="text-sm text-slate-600 font-medium">Happy Guests</div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
                <div className="text-4xl font-bold text-slate-900 mb-2">
                  <AnimatedCounter end={50} suffix="+" />
                </div>
                <div className="text-sm text-slate-600 font-medium">Properties</div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
                <div className="text-4xl font-bold text-slate-900 mb-2">
                  <AnimatedCounter end={98} suffix="%" />
                </div>
                <div className="text-sm text-slate-600 font-medium">Satisfaction</div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
                <div className="text-4xl font-bold text-slate-900 mb-2">
                  4.<AnimatedCounter end={8} />
                </div>
                <div className="text-sm text-slate-600 font-medium">Avg Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guest Reviews Marquee */}
      <section className="py-16 bg-slate-50 overflow-hidden">
        <div className="container mx-auto px-4 mb-12">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              What Our Guests Say
            </h2>
            <p className="text-lg text-slate-600">
              Real experiences from travelers who stayed with us
            </p>
          </div>
        </div>

        <Marquee pauseOnHover className="[--duration:40s]">
          {[
            {
              name: "Sarah Johnson",
              rating: 5,
              review: "Absolutely stunning property! The attention to detail was incredible. The location was perfect for exploring the city.",
              property: "Cozy Downtown Apartment",
              image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop&q=80"
            },
            {
              name: "Michael Chen",
              rating: 5,
              review: "Best vacation rental I've ever stayed at. Everything was spotless and the host was incredibly responsive.",
              property: "Seaside Beach House",
              image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=400&h=300&fit=crop&q=80"
            },
            {
              name: "Emily Rodriguez",
              rating: 5,
              review: "The views were breathtaking! Waking up to the ocean every morning was a dream come true.",
              property: "Seaside Beach House",
              image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=400&h=300&fit=crop&q=80"
            },
            {
              name: "David Williams",
              rating: 4,
              review: "Great place to stay! Very comfortable and clean. The neighborhood was safe and had lots of great restaurants nearby.",
              property: "Cozy Downtown Apartment",
              image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop&q=80"
            },
            {
              name: "Jennifer Lee",
              rating: 5,
              review: "Perfect for a romantic getaway. The sunset from the balcony was absolutely magical!",
              property: "Seaside Beach House",
              image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=400&h=300&fit=crop&q=80"
            },
            {
              name: "Robert Taylor",
              rating: 4,
              review: "Highly recommend! The apartment was exactly as described. Great value for money and very convenient location.",
              property: "Cozy Downtown Apartment",
              image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop&q=80"
            }
          ].map((review, index) => (
            <div
              key={index}
              className="relative mx-4 w-[380px] overflow-hidden rounded-2xl bg-white shadow-xl hover:shadow-2xl transition-shadow"
            >
              {/* Property Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={review.image}
                  alt={review.property}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                
                {/* Property Name */}
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-white font-semibold text-sm">{review.property}</p>
                </div>
              </div>

              {/* Review Content */}
              <div className="p-6">
                {/* Stars */}
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${i < review.rating ? 'text-amber-500' : 'text-slate-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-slate-700 mb-4 leading-relaxed line-clamp-3">
                  "{review.review}"
                </p>

                {/* Guest Name */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                    <span className="text-slate-700 font-semibold text-sm">
                      {review.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{review.name}</p>
                    <p className="text-sm text-slate-500">Verified Guest</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Marquee>
      </section>

      {/* Featured Properties */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Featured Properties
              </h2>
              <p className="text-lg text-slate-600">
                Discover our most loved vacation rentals
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Property Card 1 */}
              <Link href="/listings/listing-101" className="group">
                <div className="relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all">
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop&q=80"
                      alt="Luxury Downtown Apartment"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/10 transition-colors" />
                    {/* Rating Badge */}
                    <div className="absolute top-4 right-4 px-3 py-1 bg-white backdrop-blur-sm rounded-full flex items-center gap-1 shadow-lg">
                      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm font-semibold">4.8</span>
                    </div>
                  </div>
                  <div className="p-6 bg-white">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors">
                      Luxury Downtown Apartment
                    </h3>
                    <p className="text-slate-600 mb-4">Perfect for city explorers seeking comfort</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">3 reviews</span>
                      <span className="text-slate-900 font-medium group-hover:translate-x-1 transition-transform inline-block">
                        View reviews →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Property Card 2 */}
              <Link href="/listings/listing-202" className="group">
                <div className="relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all">
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&h=600&fit=crop&q=80"
                      alt="Cozy Beachfront Villa"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/10 transition-colors" />
                    {/* Rating Badge */}
                    <div className="absolute top-4 right-4 px-3 py-1 bg-white backdrop-blur-sm rounded-full flex items-center gap-1 shadow-lg">
                      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm font-semibold">4.5</span>
                    </div>
                  </div>
                  <div className="p-6 bg-white">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors">
                      Cozy Beachfront Villa
                    </h3>
                    <p className="text-slate-600 mb-4">Oceanfront paradise with stunning views</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">2 reviews</span>
                      <span className="text-slate-900 font-medium group-hover:translate-x-1 transition-transform inline-block">
                        View reviews →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="text-center mt-12">
              <Link
                href="/listings"
                className="inline-flex items-center gap-2 px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-medium transition-colors"
              >
                View All Properties
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Why Property Managers Trust Us
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Secure & Reliable</h3>
                <p className="text-slate-600">Enterprise-grade security with automated backups and audit trails</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Lightning Fast</h3>
                <p className="text-slate-600">Real-time syncing across platforms with instant approval workflows</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Smart Analytics</h3>
                <p className="text-slate-600">AI-powered insights to identify trends and improve guest satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
