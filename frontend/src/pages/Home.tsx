import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Code2, Play, Terminal, Shield, Globe, Trophy, Target, BookOpen, Users, Star, CheckCircle2, ArrowRight, Sparkles, Rocket, Award } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Home() {
  const navigate = useNavigate();
  usePageTitle('Home');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-bounce" style={{ animationDuration: '4s' }} />
      </div>
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-105">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              NexusQuest
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#ide" className="hover:text-white transition-colors">IDE</a>
            <a href="#leaderboard" className="hover:text-white transition-colors">Leaderboard</a>
          </nav>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/login')}
              variant="ghost"
              className="text-gray-300 hover:text-white hover:bg-gray-800/50 border border-transparent hover:border-gray-700 transition-all"
            >
              Log In
            </Button>
            <Button
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-20 md:py-28 text-center">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-full px-5 py-2.5 mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="text-blue-400 text-sm font-medium">Now with Interactive Challenges & Live Collaboration!</span>
          <span className="px-2 py-0.5 bg-blue-500/20 rounded-full text-xs text-blue-300">New</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
          Learn to Code Through
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-500 bg-clip-text text-transparent animate-gradient">
            Real Challenges
          </span>
        </h1>
        
        <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
          Master programming with hands-on challenges, compete with developers worldwide, 
          and build your portfolio with real projects. <span className="text-gray-300">Your coding journey starts here.</span>
        </p>
        
        <div className="flex gap-4 justify-center flex-wrap mb-16">
          <Button
            onClick={() => navigate('/signup')}
            size="lg"
            className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:via-blue-500 hover:to-indigo-500 text-white text-lg px-10 py-7 shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 font-semibold transition-all duration-300 hover:scale-105 group"
          >
            <Rocket className="w-5 h-5 mr-2 group-hover:animate-bounce" />
            Start Learning Free
          </Button>
          <Button
            onClick={() => navigate('/login')}
            size="lg"
            className="bg-gray-800/80 hover:bg-gray-700/80 text-white text-lg px-10 py-7 border border-gray-700 hover:border-gray-600 backdrop-blur-sm transition-all duration-300 hover:scale-105"
          >
            <Play className="w-5 h-5 mr-2" />
            Try Live Demo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105 group">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-1 group-hover:scale-110 transition-transform">500+</div>
            <div className="text-gray-400 text-sm">Challenges</div>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105 group">
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1 group-hover:scale-110 transition-transform">10K+</div>
            <div className="text-gray-400 text-sm">Developers</div>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-105 group">
            <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-1 group-hover:scale-110 transition-transform">4</div>
            <div className="text-gray-400 text-sm">Languages</div>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:scale-105 group">
            <div className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-1 group-hover:scale-110 transition-transform">24/7</div>
            <div className="text-gray-400 text-sm">Support</div>
          </div>
        </div>
      </section>

      {/* Main Features - Challenges, Tasks, Stories */}
      <section id="features" className="relative container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
            <Award className="w-4 h-4" />
            Core Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Everything You Need to <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Master Coding</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            From beginner-friendly tutorials to advanced algorithmic challenges
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Challenges */}
          <div className="group bg-gradient-to-br from-blue-950/50 to-gray-900/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-8 hover:border-blue-500/40 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-blue-500/30">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Coding Challenges
            </h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              500+ algorithmic challenges across all difficulty levels. Compete on leaderboards and earn badges.
            </p>
            <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Easy to Advanced</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <button onClick={() => navigate('/signup')} className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 group/btn">
                Start Challenges <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Tasks & Projects */}
          <div className="group bg-gradient-to-br from-indigo-950/50 to-gray-900/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-8 hover:border-indigo-500/40 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-2">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-indigo-500/30">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Real-World Tasks
            </h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Build actual projects and solve practical programming tasks. Perfect for your portfolio.
            </p>
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Portfolio Ready</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <button onClick={() => navigate('/signup')} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1 group/btn">
                Browse Tasks <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Learning Stories */}
          <div className="group bg-gradient-to-br from-purple-950/50 to-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8 hover:border-purple-500/40 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-purple-500/30">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Learning Stories
            </h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Interactive tutorials and guided learning paths. Master concepts step by step.
            </p>
            <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Beginner Friendly</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <button onClick={() => navigate('/signup')} className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1 group/btn">
                Start Learning <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* IDE Features */}
      <section id="ide" className="relative container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-4">
            <Terminal className="w-4 h-4" />
            Development Environment
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Powerful <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Online IDE</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Code, compile, and run directly in your browser
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Code2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Multi-Language</h3>
            <p className="text-slate-400 text-sm">Python, C++, Java, JavaScript with IntelliSense</p>
          </div>

          <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/10">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Terminal className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Interactive Terminal</h3>
            <p className="text-slate-400 text-sm">Real-time input/output streaming execution</p>
          </div>

          <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Instant Run</h3>
            <p className="text-slate-400 text-sm">Execute in secure Docker containers</p>
          </div>

          <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/10">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Secure & Safe</h3>
            <p className="text-slate-400 text-sm">Isolated execution environments</p>
          </div>

          <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-pink-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-500/10">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6 text-pink-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Cloud-Based</h3>
            <p className="text-slate-400 text-sm">Access from anywhere, no setup needed</p>
          </div>

          <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/10">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Live Collaboration</h3>
            <p className="text-slate-400 text-sm">Code together in real-time with your team</p>
          </div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section id="leaderboard" className="relative container mx-auto px-4 py-20">
        <div className="relative bg-gradient-to-br from-amber-950/30 via-slate-900/50 to-orange-950/30 backdrop-blur-sm border border-amber-500/20 rounded-3xl p-12 text-center overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 mb-6 shadow-lg shadow-amber-500/30 animate-bounce" style={{ animationDuration: '2s' }}>
              <Star className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Compete & <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Climb the Ranks</span>
            </h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Track your progress, earn points, and see how you rank against developers worldwide
            </p>
            <div className="flex gap-6 justify-center items-center flex-wrap mb-8">
              <div className="group bg-slate-900/50 border border-amber-500/30 rounded-2xl px-8 py-6 hover:border-amber-500/60 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20">
                <div className="text-4xl mb-2 group-hover:scale-125 transition-transform">🥇</div>
                <div className="text-2xl font-bold text-amber-400 mb-1">Gold</div>
                <div className="text-slate-400 text-sm">Top 1%</div>
              </div>
              <div className="group bg-slate-900/50 border border-slate-500/30 rounded-2xl px-8 py-6 hover:border-slate-400/60 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-slate-400/20">
                <div className="text-4xl mb-2 group-hover:scale-125 transition-transform">🥈</div>
                <div className="text-2xl font-bold text-slate-300 mb-1">Silver</div>
                <div className="text-slate-400 text-sm">Top 5%</div>
              </div>
              <div className="group bg-slate-900/50 border border-orange-500/30 rounded-2xl px-8 py-6 hover:border-orange-500/60 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20">
                <div className="text-4xl mb-2 group-hover:scale-125 transition-transform">🥉</div>
                <div className="text-2xl font-bold text-orange-400 mb-1">Bronze</div>
                <div className="text-slate-400 text-sm">Top 10%</div>
              </div>
            </div>
            <Button
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white px-8 py-6 text-lg font-semibold shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-300"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Join the Competition
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative container mx-auto px-4 py-20 text-center">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-16 shadow-2xl">
          {/* Animated background */}
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Start your journey today
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Level Up Your Skills?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Join 10,000+ developers learning through challenges
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                onClick={() => navigate('/signup')}
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 text-xl px-12 py-8 font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
              >
                <Rocket className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                Start Free Today
              </Button>
              <Button
                onClick={() => navigate('/login')}
                size="lg"
                className="bg-transparent hover:bg-white/10 text-white text-xl px-12 py-8 border-2 border-white/30 hover:border-white/50 transition-all duration-300"
              >
                Sign In
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-gray-800 bg-gray-950/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">NexusQuest</span>
              </div>
              <p className="text-gray-400 text-sm max-w-md">
                The ultimate platform for learning to code through real challenges. Master programming, compete globally, and build your portfolio.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#ide" className="hover:text-white transition-colors">Online IDE</a></li>
                <li><a href="#leaderboard" className="hover:text-white transition-colors">Leaderboard</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Get Started</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => navigate('/signup')} className="hover:text-white transition-colors">Sign Up</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Log In</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 NexusQuest. Built with ❤️ for developers who love challenges.
            </p>
            <div className="flex items-center gap-4 text-gray-500 text-sm">
              <span>Made for learners worldwide</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
