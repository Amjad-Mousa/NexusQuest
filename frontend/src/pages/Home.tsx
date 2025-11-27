import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Code2, Play, Terminal, Zap, Shield, Globe, Trophy, Target, BookOpen, Users, Star, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
              NexusQuest
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/login')}
              className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
            >
              Log In
            </Button>
            <Button
              onClick={() => navigate('/signup')}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8">
          <Zap className="w-4 h-4 text-blue-400" />
          <span className="text-blue-400 text-sm font-medium">Now with Interactive Challenges!</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Learn to Code Through
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
            Real Challenges
          </span>
        </h1>
        
        <p className="text-xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
          Master programming with hands-on challenges, compete with developers worldwide, 
          and build your portfolio with real projects. Just like HackerRank, but better.
        </p>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            onClick={() => navigate('/signup')}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-10 py-7 shadow-2xl shadow-blue-500/40 font-semibold"
          >
            <Trophy className="w-5 h-5 mr-2" />
            Start Learning Free
          </Button>
          <Button
            onClick={() => navigate('/login')}
            size="lg"
            className="bg-gray-800 hover:bg-gray-700 text-white text-lg px-10 py-7 border border-gray-700"
          >
            <Play className="w-5 h-5 mr-2" />
            Try Live Demo
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div>
            <div className="text-3xl font-bold text-blue-400 mb-1">500+</div>
            <div className="text-gray-400 text-sm">Challenges</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-500 mb-1">10K+</div>
            <div className="text-gray-400 text-sm">Developers</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600 mb-1">4</div>
            <div className="text-gray-400 text-sm">Languages</div>
          </div>
        </div>
      </section>

      {/* Main Features - Challenges, Tasks, Stories */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-white text-center mb-4">
          Everything You Need to Master Coding
        </h2>
        <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
          From beginner-friendly tutorials to advanced algorithmic challenges
        </p>
        
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Challenges */}
          <div className="group bg-gradient-to-br from-blue-950/50 to-gray-900/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-8 hover:border-blue-500/40 transition-all hover:shadow-2xl hover:shadow-blue-500/20">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
              <Trophy className="w-7 h-7 text-white" />
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
          </div>

          {/* Tasks & Projects */}
          <div className="group bg-gradient-to-br from-indigo-950/50 to-gray-900/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-8 hover:border-indigo-500/40 transition-all hover:shadow-2xl hover:shadow-indigo-500/20">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/30">
              <Target className="w-7 h-7 text-white" />
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
          </div>

          {/* Learning Stories */}
          <div className="group bg-gradient-to-br from-purple-950/50 to-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8 hover:border-purple-500/40 transition-all hover:shadow-2xl hover:shadow-purple-500/20">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/30">
              <BookOpen className="w-7 h-7 text-white" />
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
          </div>
        </div>
      </section>

      {/* IDE Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Powerful Online IDE
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
            <Code2 className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Multi-Language</h3>
            <p className="text-slate-400 text-sm">Python, C++, Java, JavaScript with IntelliSense</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
            <Terminal className="w-10 h-10 text-cyan-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Interactive Terminal</h3>
            <p className="text-slate-400 text-sm">Real-time input/output streaming execution</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
            <Play className="w-10 h-10 text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Instant Run</h3>
            <p className="text-slate-400 text-sm">Execute in secure Docker containers</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
            <Shield className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Secure & Safe</h3>
            <p className="text-slate-400 text-sm">Isolated execution environments</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
            <Globe className="w-10 h-10 text-pink-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Cloud-Based</h3>
            <p className="text-slate-400 text-sm">Access from anywhere, no setup needed</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
            <Users className="w-10 h-10 text-orange-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Community</h3>
            <p className="text-slate-400 text-sm">Learn together with thousands of devs</p>
          </div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-amber-950/30 to-slate-900/50 backdrop-blur-sm border border-amber-500/20 rounded-3xl p-12 text-center">
          <Star className="w-16 h-16 text-amber-400 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-4">
            Compete & Climb the Ranks
          </h2>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Track your progress, earn points, and see how you rank against developers worldwide
          </p>
          <div className="flex gap-6 justify-center items-center flex-wrap">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-6 py-4">
              <div className="text-3xl font-bold text-amber-400 mb-1">🥇</div>
              <div className="text-slate-400 text-sm">Gold Badges</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-6 py-4">
              <div className="text-3xl font-bold text-slate-300 mb-1">🥈</div>
              <div className="text-slate-400 text-sm">Silver Badges</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-6 py-4">
              <div className="text-3xl font-bold text-amber-600 mb-1">🥉</div>
              <div className="text-slate-400 text-sm">Bronze Badges</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-16 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative">
            <h2 className="text-5xl font-bold text-white mb-6">
              Ready to Level Up Your Skills?
            </h2>
            <p className="text-2xl text-blue-50 mb-10 max-w-2xl mx-auto">
              Join 10,000+ developers learning through challenges
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => navigate('/signup')}
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 text-xl px-12 py-8 font-bold shadow-xl"
              >
                Start Free Today
              </Button>
              <Button
                onClick={() => navigate('/login')}
                size="lg"
                className="bg-gray-900/80 hover:bg-gray-900 text-white text-xl px-12 py-8 border-2 border-white/20"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-6 h-6 text-blue-400" />
              <span className="font-semibold text-gray-400">NexusQuest</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2025 NexusQuest. Built for developers who love challenges.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
