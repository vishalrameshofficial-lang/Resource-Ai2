import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Play,
  Check,
  Activity,
  Bed,
  UserCheck,
  GraduationCap,
  Package,
  HeartHandshake,
  Ambulance,
  AlertCircle,
  Clock,
  TrendingUp,
  MapPin,
  Shield,
  Layers,
  Cpu,
  Menu,
  X,
  ChevronRight,
  Globe,
  Zap,
  CheckCircle2,
  Sliders,
  FileText,
  PhoneCall,
  LayoutDashboard,
  Megaphone
} from 'lucide-react';

interface LandingPageProps {
  onEnterDashboard: (targetTab?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterDashboard }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<string | null>('beds');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const handleEnter = (tab?: string) => onEnterDashboard(typeof tab === 'string' ? tab : undefined);

  // Floating connected resources for AI Visualization
  const resourceNodes = [
    {
      id: 'beds',
      title: 'Hospital Beds',
      value: '84/100 Allocated',
      status: 'Optimal',
      icon: Bed,
      color: 'from-blue-500 to-cyan-400',
      pos: 'top-2 left-4 md:top-4 md:left-6',
      svgX1: 15,
      svgY1: 20
    },
    {
      id: 'staff',
      title: 'Medical Staff',
      value: '42 On Duty',
      status: 'High Demand',
      icon: UserCheck,
      color: 'from-cyan-500 to-blue-600',
      pos: 'top-2 right-4 md:top-4 md:right-6',
      svgX1: 85,
      svgY1: 20
    },
    {
      id: 'school',
      title: 'School Capacity',
      value: '1,240 Spots',
      status: 'Stable',
      icon: GraduationCap,
      color: 'from-blue-600 to-indigo-500',
      pos: 'top-1/2 -left-3 md:top-1/2 md:left-2 -translate-y-1/2',
      svgX1: 10,
      svgY1: 50
    },
    {
      id: 'supplies',
      title: 'Emergency Supplies',
      value: '94% Stocked',
      status: 'Ready',
      icon: Package,
      color: 'from-teal-400 to-cyan-500',
      pos: 'top-1/2 -right-3 md:top-1/2 md:right-2 -translate-y-1/2',
      svgX1: 90,
      svgY1: 50
    },
    {
      id: 'volunteers',
      title: 'Volunteers',
      value: '150 Deployed',
      status: 'Active',
      icon: HeartHandshake,
      color: 'from-blue-400 to-cyan-500',
      pos: 'bottom-2 left-6 md:bottom-6 md:left-12',
      svgX1: 20,
      svgY1: 80
    },
    {
      id: 'ambulance',
      title: 'Ambulance Units',
      value: '18 Dispatched',
      status: 'En Route',
      icon: Ambulance,
      color: 'from-cyan-400 to-blue-500',
      pos: 'bottom-2 right-6 md:bottom-6 md:right-12',
      svgX1: 80,
      svgY1: 80
    }
  ];

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      setActiveModal(sectionId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/40 to-slate-50 text-slate-900 font-sans selection:bg-cyan-500 selection:text-white">
      {/* 1. HEADER NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-blue-100/60 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Left: Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img
              src="/logo.jpg"
              alt="ResourceAI Logo"
              className="w-11 h-11 rounded-xl object-cover shadow-lg shadow-blue-500/20 border border-blue-200 hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1">
                Resource<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">AI</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-blue-600 uppercase">Intelligence System</span>
            </div>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button
              onClick={() => handleNavClick('platform')}
              className="hover:text-blue-600 transition-colors py-2 relative group"
            >
              Platform
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 group-hover:w-full transition-all duration-300" />
            </button>
            <button
              onClick={() => handleNavClick('solutions')}
              className="hover:text-blue-600 transition-colors py-2 relative group"
            >
              Solutions
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 group-hover:w-full transition-all duration-300" />
            </button>
            <button
              onClick={() => handleNavClick('how-it-works')}
              className="hover:text-blue-600 transition-colors py-2 relative group"
            >
              How It Works
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 group-hover:w-full transition-all duration-300" />
            </button>
            <button
              onClick={() => handleNavClick('challenge')}
              className="hover:text-blue-600 transition-colors py-2 relative group"
            >
              Impact
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 group-hover:w-full transition-all duration-300" />
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => handleEnter()}
              className="px-5 py-2.5 rounded-xl border border-blue-200 text-blue-700 font-semibold text-sm hover:bg-blue-50/80 hover:border-blue-300 transition-all flex items-center gap-2 shadow-xs"
            >
              <LayoutDashboard className="w-4 h-4 text-blue-600" />
              View Dashboard
            </button>
            <button
              onClick={() => handleEnter()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 text-white font-semibold text-sm hover:opacity-95 transition-all shadow-md shadow-blue-500/25 flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 border-b border-blue-100 px-4 pt-3 pb-6 space-y-3 shadow-xl">
            <button
              onClick={() => handleNavClick('platform')}
              className="block w-full text-left py-2 font-medium text-slate-700 hover:text-blue-600"
            >
              Platform
            </button>
            <button
              onClick={() => handleNavClick('solutions')}
              className="block w-full text-left py-2 font-medium text-slate-700 hover:text-blue-600"
            >
              Solutions
            </button>
            <button
              onClick={() => handleNavClick('how-it-works')}
              className="block w-full text-left py-2 font-medium text-slate-700 hover:text-blue-600"
            >
              How It Works
            </button>
            <button
              onClick={() => handleNavClick('challenge')}
              className="block w-full text-left py-2 font-medium text-slate-700 hover:text-blue-600"
            >
              Impact
            </button>
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                onClick={() => handleEnter()}
                className="w-full py-2.5 rounded-xl border border-blue-200 text-blue-700 font-semibold text-sm hover:bg-blue-50 flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                View Dashboard
              </button>
              <button
                onClick={() => handleEnter()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-20 lg:pt-14 lg:pb-28">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-blue-300/30 via-cyan-200/40 to-indigo-200/20 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* HERO LEFT COLUMN */}
            <div className="lg:col-span-6 space-y-8">
              
              {/* Small pill badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200/80 text-blue-700 text-xs font-bold tracking-wider uppercase shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin-slow" />
                <span>AI-POWERED RESOURCE INTELLIGENCE</span>
              </div>

              {/* Large Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Intelligent Resource <br />
                Allocation, <br />
                <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-800 bg-clip-text text-transparent">
                  Powered by AI.
                </span>
              </h1>

              {/* Description */}
              <p className="text-lg sm:text-xl text-slate-600 max-w-xl font-normal leading-relaxed">
                Predict demand, prioritize urgency, and allocate limited resources intelligently — all from one unified platform.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  onClick={() => handleEnter()}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 text-white font-bold text-base hover:shadow-xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-0.5 group"
                >
                  Explore Platform
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="px-7 py-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-slate-700 font-semibold text-base hover:bg-blue-50/50 transition-all flex items-center justify-center gap-3 shadow-xs"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                  Watch How It Works
                </button>
              </div>

              {/* Features Checklist */}
              <div className="pt-4 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <span>Real-Time Intelligence</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <span>Explainable AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <span>Multi-Sector Platform</span>
                </div>
              </div>
            </div>

            {/* HERO RIGHT COLUMN: FUTURISTIC AI RESOURCE VISUALIZATION */}
            <div className="lg:col-span-6 relative">
              <div className="relative w-full h-[500px] sm:h-[540px] rounded-3xl bg-gradient-to-b from-white/90 via-blue-50/50 to-slate-100/90 border border-blue-200/60 shadow-2xl shadow-blue-900/10 p-4 sm:p-6 overflow-hidden flex items-center justify-center backdrop-blur-md">
                
                {/* Background grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f610_1px,transparent_1px),linear-gradient(to_bottom,#3b82f610_1px,transparent_1px)] bg-[size:24px_24px]" />

                {/* SVG Connecting Lines between Central Core and Cards */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <defs>
                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                  
                  {/* Central Node is at 50%, 50% */}
                  <line x1="50%" y1="50%" x2="22%" y2="22%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="4,4" className="animate-pulse" />
                  <line x1="50%" y1="50%" x2="78%" y2="22%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="4,4" className="animate-pulse" />
                  <line x1="50%" y1="50%" x2="15%" y2="50%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="4,4" className="animate-pulse" />
                  <line x1="50%" y1="50%" x2="85%" y2="50%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="4,4" className="animate-pulse" />
                  <line x1="50%" y1="50%" x2="25%" y2="78%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="4,4" className="animate-pulse" />
                  <line x1="50%" y1="50%" x2="75%" y2="78%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="4,4" className="animate-pulse" />
                </svg>

                {/* Central AI Cube Element */}
                <div className="relative z-20 flex flex-col items-center justify-center">
                  <div className="relative group cursor-pointer" onClick={() => handleEnter()}>
                    {/* Concentric Glowing Rings */}
                    <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-blue-500/30 to-cyan-400/30 blur-md animate-ping" />
                    <div className="absolute -inset-10 rounded-full border border-cyan-400/30 animate-spin-slow" />
                    <div className="absolute -inset-14 rounded-full border border-dashed border-blue-400/20 animate-reverse-spin" />

                    {/* Central Futuristic 3D Glass Box with Official Logo */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-900/95 border-2 border-cyan-400/80 shadow-[0_0_40px_rgba(6,182,212,0.4)] flex flex-col items-center justify-center p-2 text-white transition-all transform hover:scale-105">
                      <img
                        src="/logo.jpg"
                        alt="ResourceAI Shield Logo"
                        className="w-14 h-14 object-cover rounded-xl shadow-md border border-cyan-400/40 mb-1"
                      />
                      <span className="text-[9px] uppercase font-bold tracking-widest text-cyan-300">CORE ALLOCATOR</span>
                    </div>
                  </div>
                </div>

                {/* Connected Floating Resource Cards Around AI Core */}
                {resourceNodes.map((node) => {
                  const IconComp = node.icon;
                  const isSelected = selectedResource === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedResource(node.id)}
                      className={`absolute z-20 cursor-pointer transition-all duration-300 ${node.pos}`}
                    >
                      <div className={`px-3.5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border ${isSelected ? 'border-cyan-500 shadow-lg shadow-cyan-500/20 scale-105 ring-2 ring-cyan-400/40' : 'border-blue-100/90 shadow-md shadow-slate-200/50 hover:border-blue-300 hover:shadow-lg'} flex items-center gap-3`}>
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${node.color} text-white flex items-center justify-center shadow-xs shrink-0`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div className="hidden sm:block text-left">
                          <p className="text-xs font-bold text-slate-800 leading-tight">{node.title}</p>
                          <p className="text-[11px] font-medium text-slate-500">{node.value}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Floating Statistic Cards */}
                
                {/* Stat 1: Beds Allocated 84 */}
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 text-white px-3.5 py-1.5 rounded-full border border-cyan-500/40 shadow-xl text-xs font-bold flex items-center gap-2 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Beds Allocated: <span className="text-cyan-300 font-mono text-sm">84</span></span>
                </div>

                {/* Stat 2: Demand +24% */}
                <div className="absolute bottom-16 left-8 z-30 bg-white/95 text-slate-800 px-3 py-2 rounded-xl border border-blue-200 shadow-md text-xs font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Demand</p>
                    <p className="text-xs font-extrabold text-emerald-600">+24% Peak</p>
                  </div>
                </div>

                {/* Stat 3: Response Time 1.8s */}
                <div className="absolute bottom-16 right-8 z-30 bg-white/95 text-slate-800 px-3 py-2 rounded-xl border border-blue-200 shadow-md text-xs font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Response Time</p>
                    <p className="text-xs font-extrabold text-blue-600">1.8s AI Dispatch</p>
                  </div>
                </div>

                {/* Stat 4: Urgency HIGH */}
                <div className="absolute top-36 right-4 z-30 bg-rose-500/90 text-white px-3 py-1.5 rounded-xl shadow-lg text-xs font-extrabold flex items-center gap-1.5 backdrop-blur-sm animate-bounce">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Urgency: HIGH</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. THE CHALLENGE SECTION */}
      <section id="challenge" className="py-20 bg-gradient-to-b from-white via-blue-50/30 to-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-extrabold tracking-widest uppercase">
              + THE CHALLENGE
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              When Resources Are Limited, <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Every Decision Matters.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 font-normal">
              Organizations often have limited resources while demand changes rapidly.
            </p>
          </div>

          {/* Three Horizontal Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 01 */}
            <div className="bg-white rounded-3xl p-8 border border-blue-100 shadow-xl shadow-blue-900/5 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <span className="text-3xl font-black text-slate-200 group-hover:text-blue-500/30 transition-colors">
                  01
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                Unpredictable Demand
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Demand can change because of emergencies, population growth, seasonal patterns, and unexpected events.
              </p>
            </div>

            {/* Card 02 */}
            <div className="bg-white rounded-3xl p-8 border border-blue-100 shadow-xl shadow-blue-900/5 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                  <MapPin className="w-7 h-7" />
                </div>
                <span className="text-3xl font-black text-slate-200 group-hover:text-cyan-500/30 transition-colors">
                  02
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-cyan-600 transition-colors">
                Uneven Resource Distribution
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Resources may be available in one location while another area experiences critical shortages.
              </p>
            </div>

            {/* Card 03 */}
            <div className="bg-white rounded-3xl p-8 border border-blue-100 shadow-xl shadow-blue-900/5 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Clock className="w-7 h-7" />
                </div>
                <span className="text-3xl font-black text-slate-200 group-hover:text-indigo-500/30 transition-colors">
                  03
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">
                Slow Manual Decisions
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Manual analysis can delay critical decisions when time and accuracy matter most.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 4. PLATFORM ARCHITECTURE & SECTORS SHOWCASE */}
      <section id="platform" className="py-20 bg-slate-900 text-white relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <span className="text-cyan-400 font-extrabold text-xs tracking-widest uppercase bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800">
                MULTI-SECTOR PLATFORM
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                One Platform for <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                  Every Essential Department.
                </span>
              </h2>
              <p className="text-slate-400 text-base leading-relaxed">
                ResourceAI orchestrates real-time intake, voice transcription, geographic dispatch, and allocation across critical public and private sectors.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <Shield className="w-6 h-6 text-cyan-400 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-white text-base">Emergency Response & Fire Dispatch</h4>
                    <p className="text-xs text-slate-400 mt-1">Automatic emergency call forwarding to nearest fire stations & rescue units.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <Activity className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-white text-base">Healthcare & Hospital Logistics</h4>
                    <p className="text-xs text-slate-400 mt-1">ICU bed balancing, staff allocation, and medical supply dispatch.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <GraduationCap className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-white text-base">Education & Infrastructure</h4>
                    <p className="text-xs text-slate-400 mt-1">School capacity management, teacher allocation, and facility upgrades.</p>
                  </div>
                </div>

                <div 
                  onClick={() => onEnterDashboard('our-voice-our-issue')}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-slate-900 border border-indigo-500/50 hover:border-cyan-400 cursor-pointer transition shadow-lg group"
                >
                  <Megaphone className="w-6 h-6 text-cyan-400 shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-base">Our Voice Our Issue (Civic Telephony)</h4>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">Helpline +91 44 4761 5477</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">24x7 AI Voice Grievance intake, 8 municipal departments, SLA tracking, and 3-tier portal.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleEnter()}
                className="mt-4 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                Launch Operations Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="lg:col-span-7 bg-slate-800/40 rounded-3xl p-6 sm:p-8 border border-slate-700/80 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-6 border-b border-slate-700/80">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono text-slate-400 ml-2">ResourceAI Allocation Matrix</span>
                </div>
                <span className="text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-800">
                  LIVE STATUS
                </span>
              </div>

              {/* Sample Live Matrix Preview */}
              <div className="mt-6 space-y-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Ambulance className="w-5 h-5 text-rose-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Central Fire & Rescue Unit</p>
                      <p className="text-[11px] text-slate-400">Sector: Fire Safety | Priority: High</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800">
                    DISPATCHED (1.2s)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bed className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-xs font-bold text-white">District General Hospital</p>
                      <p className="text-[11px] text-slate-400">ICU Bed Re-balancing | Capacity: 88%</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-800">
                    OPTIMIZED
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Taluk Food & Essential Supplies</p>
                      <p className="text-[11px] text-slate-400">Ration Distribution Hub | Status: Active</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-md border border-amber-800">
                    BALANCED
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION FOOTER BANNER */}
      <section className="py-16 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Transform Resource Intelligence?
          </h2>
          <p className="text-blue-100 max-w-2xl mx-auto text-base sm:text-lg">
            Experience real-time AI allocation, automatic complaint forwarding, and instant operational command.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => handleEnter()}
              className="px-8 py-4 rounded-xl bg-white text-blue-700 font-extrabold text-base hover:bg-slate-50 transition-all shadow-xl flex items-center gap-2 transform hover:scale-105"
            >
              Open Dashboard Platform
              <ArrowRight className="w-5 h-5 text-blue-700" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200">ResourceAI Intelligence System</span>
            <span className="text-slate-600">| © 2026 ResourceAI. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <button onClick={() => handleEnter()} className="hover:text-cyan-400">Dashboard</button>
            <button onClick={() => handleNavClick('platform')} className="hover:text-cyan-400">Platform</button>
            <button onClick={() => handleNavClick('solutions')} className="hover:text-cyan-400">Solutions</button>
            <button onClick={() => handleNavClick('challenge')} className="hover:text-cyan-400">Challenge</button>
          </div>
        </div>
      </footer>

      {/* VIDEO PREVIEW MODAL */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">ResourceAI Platform Overview</h3>
                <p className="text-xs text-slate-500">Autonomous Demand Prediction & Department Dispatch</p>
              </div>
            </div>
            
            <div className="aspect-video w-full rounded-2xl bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white space-y-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 to-cyan-900/60" />
              <Cpu className="w-12 h-12 text-cyan-400 animate-pulse relative z-10" />
              <p className="text-sm font-semibold relative z-10 max-w-md">
                ResourceAI continuously analyzes call transcripts, hospital bed capacity, emergency alerts, and spatial distribution to automatically allocate limited resources.
              </p>
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  onEnterDashboard();
                }}
                className="relative z-10 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-xs hover:opacity-95"
              >
                Experience Live Interactive System
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
