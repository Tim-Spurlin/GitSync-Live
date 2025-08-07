import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Activity, GitBranch, Server, Clock, Database,
  BarChart3, Timer, Settings, Play, Pause,
  RefreshCw, CheckCircle, XCircle, AlertCircle,
  GitPullRequest, GitCommit, FileText, Zap,
  ChevronRight, Calendar, Filter, Download,
  ArrowUpRight, ArrowDownRight, Globe, Box
} from 'lucide-react';
import * as THREE from 'three';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Type Definitions
interface Repository {
  name: string;
  autoSync: boolean;
  lastSync: Date;
  status: 'synced' | 'syncing' | 'error' | 'pending';
  uncommittedChanges: number;
  stats: {
    pushes: number;
    pulls: number;
    conflicts: number;
    merges: number;
  };
}

interface ActivityItem {
  id: string;
  timestamp: Date;
  repository: string;
  operation: 'push' | 'pull' | 'merge' | 'conflict';
  status: 'success' | 'failed' | 'pending';
  details: string;
}

interface ServiceStatus {
  isActive: boolean;
  uptime: string;
  lastCheck: Date;
}

const GitSyncLive: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('1d');
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    isActive: true,
    uptime: '23h 45m',
    lastCheck: new Date()
  });
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number>();

  // Sample data generation
  useEffect(() => {
    const sampleRepos: Repository[] = [
      {
        name: 'GitSync-Live',
        autoSync: true,
        lastSync: new Date(),
            status: 'synced',
            uncommittedChanges: 0,
            stats: { pushes: 45, pulls: 32, conflicts: 2, merges: 15 }
      },
      {
        name: 'Hot-Key-Scripts',
        autoSync: true,
        lastSync: new Date(Date.now() - 3600000),
            status: 'syncing',
            uncommittedChanges: 3,
            stats: { pushes: 28, pulls: 19, conflicts: 1, merges: 8 }
      },
      {
        name: 'DevSpace-Projects',
        autoSync: false,
        lastSync: new Date(Date.now() - 7200000),
            status: 'pending',
            uncommittedChanges: 7,
            stats: { pushes: 67, pulls: 54, conflicts: 4, merges: 23 }
      },
      {
        name: 'System-Configs',
        autoSync: true,
        lastSync: new Date(Date.now() - 1800000),
            status: 'synced',
            uncommittedChanges: 0,
            stats: { pushes: 12, pulls: 8, conflicts: 0, merges: 3 }
      }
    ];
    setRepositories(sampleRepos);

    const sampleActivities: ActivityItem[] = Array.from({ length: 20 }, (_, i) => ({
      id: `act-${i}`,
      timestamp: new Date(Date.now() - i * 900000),
                                                                                   repository: sampleRepos[i % 4].name,
                                                                                   operation: ['push', 'pull', 'merge', 'conflict'][i % 4] as any,
                                                                                   status: i % 7 === 0 ? 'failed' : 'success',
                                                                                   details: `Operation ${i + 1} completed`
    }));
    setActivities(sampleActivities);
  }, []);

  // 3D Visualization Setup
  useEffect(() => {
    if (activeTab !== 'flow' || !threeContainerRef.current) return;

    const container = threeContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.Fog(0x0a0a0f, 5, 20);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00ff88, 2, 100);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    // Central GitHub sphere
    const centerGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const centerMaterial = new THREE.MeshPhongMaterial({
      color: 0x6366f1,
      emissive: 0x6366f1,
      emissiveIntensity: 0.3,
      wireframe: false
    });
    const centerSphere = new THREE.Mesh(centerGeometry, centerMaterial);
    scene.add(centerSphere);

    // Orbiting repository nodes
    const repoNodes: THREE.Mesh[] = [];
    repositories.forEach((repo, i) => {
      const angle = (i / repositories.length) * Math.PI * 2;
      const radius = 4;
      const nodeGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const nodeMaterial = new THREE.MeshPhongMaterial({
        color: repo.status === 'synced' ? 0x10b981 :
        repo.status === 'error' ? 0xef4444 : 0xfbbf24,
        emissive: repo.status === 'synced' ? 0x10b981 :
        repo.status === 'error' ? 0xef4444 : 0xfbbf24,
        emissiveIntensity: 0.5
      });
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.x = Math.cos(angle) * radius;
      node.position.z = Math.sin(angle) * radius;
      node.position.y = Math.sin(i) * 0.5;
      scene.add(node);
      repoNodes.push(node);
    });

    // Particle system for data flow
    const particleCount = 100;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 10;
      positions[i3 + 1] = (Math.random() - 0.5) * 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 10;

      // Green for push, Blue for pull
      if (Math.random() > 0.5) {
        colors[i3] = 0.1;
        colors[i3 + 1] = 0.8;
        colors[i3 + 2] = 0.1;
      } else {
        colors[i3] = 0.1;
        colors[i3 + 1] = 0.4;
        colors[i3 + 2] = 0.9;
      }

      sizes[i] = Math.random() * 0.1 + 0.05;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Rotate center sphere
      centerSphere.rotation.y += 0.005;

      // Orbit repository nodes
      repoNodes.forEach((node, i) => {
        const angle = (i / repositories.length) * Math.PI * 2 + Date.now() * 0.0001;
        const radius = 4;
        node.position.x = Math.cos(angle) * radius;
        node.position.z = Math.sin(angle) * radius;
        node.position.y = Math.sin(Date.now() * 0.001 + i) * 0.5;
      });

      // Animate particles
      const positions = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3 + 1] += 0.01;
        if (positions[i3 + 1] > 5) positions[i3 + 1] = -5;

        // Move particles toward/away from center
        const distance = Math.sqrt(
          positions[i3] * positions[i3] +
          positions[i3 + 2] * positions[i3 + 2]
        );
        if (distance > 0.1) {
          positions[i3] *= 0.99;
          positions[i3 + 2] *= 0.99;
        } else {
          positions[i3] = (Math.random() - 0.5) * 10;
          positions[i3 + 2] = (Math.random() - 0.5) * 10;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [activeTab, repositories]);

  // Chart data
  const activityChartData = useMemo(() => {
    const hours = 24;
    return Array.from({ length: hours }, (_, i) => ({
      time: `${i}:00`,
      pushes: Math.floor(Math.random() * 20) + 5,
                                                    pulls: Math.floor(Math.random() * 15) + 3,
                                                    conflicts: Math.floor(Math.random() * 3),
                                                    merges: Math.floor(Math.random() * 8) + 2
    }));
  }, []);

  const pieChartData = useMemo(() => [
    { name: 'Pushes', value: 145, color: '#10b981' },
    { name: 'Pulls', value: 113, color: '#3b82f6' },
    { name: 'Merges', value: 49, color: '#8b5cf6' },
    { name: 'Conflicts', value: 7, color: '#ef4444' }
  ], []);

  const radarChartData = useMemo(() =>
  repositories.map(repo => ({
    repository: repo.name,
    pushes: repo.stats.pushes,
    pulls: repo.stats.pulls,
    merges: repo.stats.merges,
    conflicts: repo.stats.conflicts * 10
  }))
  , [repositories]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'flow', label: 'Flow View', icon: GitBranch },
    { id: 'repositories', label: 'Repositories', icon: Database },
    { id: 'timeline', label: 'Timeline', icon: Timer }
  ];

  const timeRanges = ['1h', '6h', '12h', '1d', '3d', '7d', '2w', '3w', '1mo', '3mo', '6mo', '1yr', '5yr', '10yr'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white p-4">
    {/* Header */}
    <header className="mb-6">
    <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 shadow-2xl">
    <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-4">
    <div className="relative">
    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${
      serviceStatus.isActive ? 'from-green-400 to-emerald-600' : 'from-red-400 to-rose-600'
    } flex items-center justify-center shadow-lg`}>
    <Server className="w-8 h-8 text-white" />
    </div>
    {serviceStatus.isActive && (
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
    )}
    </div>
    <div>
    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
    GitSync-Live
    </h1>
    <p className="text-gray-400 text-sm flex items-center gap-2 mt-1">
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      connectionStatus === 'connected' ? 'bg-green-400/20 text-green-400' :
      connectionStatus === 'reconnecting' ? 'bg-yellow-400/20 text-yellow-400' :
      'bg-red-400/20 text-red-400'
    }`}>
    {connectionStatus === 'connected' ? <CheckCircle className="w-3 h-3" /> :
      connectionStatus === 'reconnecting' ? <RefreshCw className="w-3 h-3 animate-spin" /> :
      <XCircle className="w-3 h-3" />}
      {connectionStatus}
      </span>
      <span className="text-gray-500">•</span>
      <Clock className="w-3 h-3" />
      Uptime: {serviceStatus.uptime}
      </p>
      </div>
      </div>
      <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
      <Filter className="w-4 h-4 text-gray-400" />
      <select
      className="bg-transparent text-sm outline-none cursor-pointer"
      value={selectedRepos.join(',')}
      onChange={(e) => setSelectedRepos(e.target.value ? e.target.value.split(',') : [])}
      >
      <option value="">All Repositories</option>
      {repositories.map(repo => (
        <option key={repo.name} value={repo.name}>{repo.name}</option>
      ))}
      </select>
      </div>
      <button className="p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
      <Settings className="w-5 h-5" />
      </button>
      </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
      <span className="text-sm text-gray-400 mr-2">Time Range:</span>
      {timeRanges.map(range => (
        <button
        key={range}
        onClick={() => setTimeRange(range)}
        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
          timeRange === range
          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
        }`}
        >
        {range}
        </button>
      ))}
      <button className="px-3 py-1 rounded-lg text-sm font-medium bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10 flex items-center gap-1">
      <Calendar className="w-3 h-3" />
      Custom
      </button>
      </div>
      </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="mb-6">
      <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-2 flex gap-2 overflow-x-auto">
      {tabs.map(tab => (
        <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
          activeTab === tab.id
          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
          : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`}
        >
        <tab.icon className="w-4 h-4" />
        {tab.label}
        </button>
      ))}
      </div>
      </nav>

      {/* Content Area */}
      <div className="space-y-6">
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stats Cards */}
        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-green-400/20 rounded-lg">
        <ArrowUpRight className="w-5 h-5 text-green-400" />
        </div>
        <span className="text-xs text-green-400">+12.5%</span>
        </div>
        <p className="text-3xl font-bold">145</p>
        <p className="text-sm text-gray-400 mt-1">Total Pushes</p>
        </div>

        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-blue-400/20 rounded-lg">
        <ArrowDownRight className="w-5 h-5 text-blue-400" />
        </div>
        <span className="text-xs text-blue-400">+8.3%</span>
        </div>
        <p className="text-3xl font-bold">113</p>
        <p className="text-sm text-gray-400 mt-1">Total Pulls</p>
        </div>

        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-purple-400/20 rounded-lg">
        <GitPullRequest className="w-5 h-5 text-purple-400" />
        </div>
        <span className="text-xs text-purple-400">+23.1%</span>
        </div>
        <p className="text-3xl font-bold">49</p>
        <p className="text-sm text-gray-400 mt-1">Merged PRs</p>
        </div>

        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-red-400/20 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-400" />
        </div>
        <span className="text-xs text-red-400">-15.2%</span>
        </div>
        <p className="text-3xl font-bold">7</p>
        <p className="text-sm text-gray-400 mt-1">Conflicts</p>
        </div>

        {/* Recent Activity Feed */}
        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6 col-span-full">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" />
        Recent Activity
        </h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
        {activities.slice(0, 8).map(activity => (
          <div key={activity.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <div className={`p-2 rounded-lg ${
            activity.operation === 'push' ? 'bg-green-400/20' :
            activity.operation === 'pull' ? 'bg-blue-400/20' :
            activity.operation === 'merge' ? 'bg-purple-400/20' :
            'bg-red-400/20'
          }`}>
          {activity.operation === 'push' ? <ArrowUpRight className="w-4 h-4 text-green-400" /> :
            activity.operation === 'pull' ? <ArrowDownRight className="w-4 h-4 text-blue-400" /> :
            activity.operation === 'merge' ? <GitPullRequest className="w-4 h-4 text-purple-400" /> :
            <AlertCircle className="w-4 h-4 text-red-400" />}
            </div>
            <div className="flex-1">
            <p className="text-sm font-medium">{activity.repository}</p>
            <p className="text-xs text-gray-400">
            {activity.operation.charAt(0).toUpperCase() + activity.operation.slice(1)} •
            {new Date(activity.timestamp).toLocaleTimeString()}
            </p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              activity.status === 'success' ? 'bg-green-400/20 text-green-400' :
              activity.status === 'failed' ? 'bg-red-400/20 text-red-400' :
              'bg-yellow-400/20 text-yellow-400'
            }`}>
            {activity.status}
            </span>
            </div>
        ))}
        </div>
        </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && (
        <div className="space-y-6">
        {/* Line Chart */}
        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4">Activity Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={activityChartData}>
        <defs>
        <linearGradient id="pushGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
        </linearGradient>
        <linearGradient id="pullGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
        </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="time" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip
        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
        labelStyle={{ color: '#f3f4f6' }}
        />
        <Legend />
        <Area type="monotone" dataKey="pushes" stroke="#10b981" fillOpacity={1} fill="url(#pushGradient)" />
        <Area type="monotone" dataKey="pulls" stroke="#3b82f6" fillOpacity={1} fill="url(#pullGradient)" />
        </AreaChart>
        </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4">Operation Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
        <PieChart>
        <Pie
        data={pieChartData}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
        >
        {pieChartData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
        </Pie>
        <Tooltip
        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
        />
        </PieChart>
        </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4">Repository Activity Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarChartData}>
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="repository" stroke="#9ca3af" />
        <PolarRadiusAxis stroke="#9ca3af" />
        <Radar name="Pushes" dataKey="pushes" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
        <Radar name="Pulls" dataKey="pulls" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
        <Tooltip
        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
        />
        </RadarChart>
        </ResponsiveContainer>
        </div>
        </div>

        {/* Bar Chart */}
        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4">Repository Statistics</h3>
        <ResponsiveContainer width="100%" height={300}>
        <BarChart data={repositories}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip
        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
        />
        <Legend />
        <Bar dataKey="stats.pushes" fill="#10b981" name="Pushes" />
        <Bar dataKey="stats.pulls" fill="#3b82f6" name="Pulls" />
        <Bar dataKey="stats.merges" fill="#8b5cf6" name="Merges" />
        <Bar dataKey="stats.conflicts" fill="#ef4444" name="Conflicts" />
        </BarChart>
        </ResponsiveContainer>
        </div>
        </div>
      )}

      {/* Flow View Tab */}
      {activeTab === 'flow' && (
        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
        <Globe className="w-5 h-5 text-blue-400" />
        3D Repository Flow Visualization
        </h3>
        <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-2">
        <div className="w-3 h-3 bg-green-400 rounded-full" />
        Push Operations
        </span>
        <span className="flex items-center gap-2">
        <div className="w-3 h-3 bg-blue-400 rounded-full" />
        Pull Operations
        </span>
        </div>
        </div>
        <div
        ref={threeContainerRef}
        className="w-full h-[600px] rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950"
        />
        </div>
      )}

      {/* Repositories Tab */}
      {activeTab === 'repositories' && (
        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Repository Management</h3>
        <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-medium text-sm hover:shadow-lg transition-shadow">
        Add Repository
        </button>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full">
        <thead>
        <tr className="border-b border-white/10">
        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Repository</th>
        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Auto Sync</th>
        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Last Sync</th>
        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Changes</th>
        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
        </tr>
        </thead>
        <tbody>
        {repositories.map(repo => (
          <tr key={repo.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
          <td className="py-3 px-4">
          <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{repo.name}</span>
          </div>
          </td>
          <td className="py-3 px-4">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            repo.status === 'synced' ? 'bg-green-400/20 text-green-400' :
            repo.status === 'syncing' ? 'bg-blue-400/20 text-blue-400' :
            repo.status === 'error' ? 'bg-red-400/20 text-red-400' :
            'bg-yellow-400/20 text-yellow-400'
          }`}>
          {repo.status === 'synced' ? <CheckCircle className="w-3 h-3" /> :
            repo.status === 'syncing' ? <RefreshCw className="w-3 h-3 animate-spin" /> :
            repo.status === 'error' ? <XCircle className="w-3 h-3" /> :
            <Clock className="w-3 h-3" />}
            {repo.status}
            </span>
            </td>
            <td className="py-3 px-4">
            <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              repo.autoSync ? 'bg-blue-500' : 'bg-gray-600'
            }`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              repo.autoSync ? 'translate-x-6' : 'translate-x-1'
            }`} />
            </button>
            </td>
            <td className="py-3 px-4 text-sm text-gray-400">
            {new Date(repo.lastSync).toLocaleString()}
            </td>
            <td className="py-3 px-4">
            {repo.uncommittedChanges > 0 ? (
              <span className="text-yellow-400 font-medium">{repo.uncommittedChanges} pending</span>
            ) : (
              <span className="text-gray-400">None</span>
            )}
            </td>
            <td className="py-3 px-4">
            <div className="flex items-center gap-2">
            <button className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <Play className="w-4 h-4" />
            </button>
            <button className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <RefreshCw className="w-4 h-4" />
            </button>
            <button className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <Settings className="w-4 h-4" />
            </button>
            </div>
            </td>
            </tr>
        ))}
        </tbody>
        </table>
        </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4">Operation Timeline</h3>
        <div className="space-y-4 relative before:absolute before:left-8 before:top-0 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:to-purple-500">
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex gap-4 items-start">
          <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-500/50">
          {activity.operation === 'push' ? <ArrowUpRight className="w-6 h-6 text-green-400" /> :
            activity.operation === 'pull' ? <ArrowDownRight className="w-6 h-6 text-blue-400" /> :
            activity.operation === 'merge' ? <GitPullRequest className="w-6 h-6 text-purple-400" /> :
            <AlertCircle className="w-6 h-6 text-red-400" />}
            </div>
            <div className="flex-1 bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
            <div className="flex items-start justify-between">
            <div>
            <p className="font-medium">{activity.repository}</p>
            <p className="text-sm text-gray-400 mt-1">
            {activity.operation.charAt(0).toUpperCase() + activity.operation.slice(1)} operation {activity.details}
            </p>
            </div>
            <div className="text-right">
            <p className="text-sm text-gray-400">
            {new Date(activity.timestamp).toLocaleTimeString()}
            </p>
            <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
              activity.status === 'success' ? 'bg-green-400/20 text-green-400' :
              activity.status === 'failed' ? 'bg-red-400/20 text-red-400' :
              'bg-yellow-400/20 text-yellow-400'
            }`}>
            {activity.status}
            </span>
            </div>
            </div>
            </div>
            </div>
        ))}
        </div>
        </div>
      )}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-sm text-gray-500">
      <p>GitSync-Live v1.0.0 • Connected to github-sync-tim.service</p>
      <p className="mt-1">© 2025 Tim Spurlin • Real-time synchronization dashboard</p>
      </footer>
      </div>
  );
};

export default GitSyncLive;
