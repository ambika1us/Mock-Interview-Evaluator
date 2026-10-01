import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../api/client';
import type { AdminStats } from '../../api/types';

const REC_COLORS: Record<string, string> = { Hire: '#22c55e', Improve: '#f59e0b', Reject: '#ef4444' };

export default function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!stats) return <div className="page-loading">Loading analytics...</div>;

  const avgData = [
    { name: 'Correctness', value: stats.averages.correctness, fill: '#3b82f6' },
    { name: 'Confidence', value: stats.averages.confidence, fill: '#8b5cf6' },
    { name: 'Behavior', value: stats.averages.behavior, fill: '#22c55e' },
    { name: 'Overall', value: stats.averages.overall, fill: '#f59e0b' },
  ];
  const recData = Object.entries(stats.recommendationDist).map(([name, value]) => ({ name, value }));
  const bucketData = Object.entries(stats.scoreBuckets).map(([name, value]) => ({ name, value }));
  const catData = Object.entries(stats.categoryDist).map(([name, value]) => ({ name, value }));

  return (
    <div className="stack-lg">
      <h1>Admin dashboard</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.counts.completedSessions}</span>
          <span className="stat-label">Completed interviews</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.counts.activeSessions}</span>
          <span className="stat-label">In progress</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.counts.candidates}</span>
          <span className="stat-label">Candidates</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.counts.questions}</span>
          <span className="stat-label">Active questions</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.averages.overall}</span>
          <span className="stat-label">Avg overall score</span>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h2>Average scores</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={avgData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3550" />
              <XAxis dataKey="name" stroke="#93a0c0" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="#93a0c0" fontSize={12} />
              <Tooltip contentStyle={{ background: '#151b2e', border: '1px solid #2c3550' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {avgData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h2>Recommendation split</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={recData} dataKey="value" nameKey="name" outerRadius={90} label>
                {recData.map((d) => (
                  <Cell key={d.name} fill={REC_COLORS[d.name] || '#64748b'} />
                ))}
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: '#151b2e', border: '1px solid #2c3550' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h2>Overall score distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bucketData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3550" />
              <XAxis dataKey="name" stroke="#93a0c0" fontSize={12} />
              <YAxis allowDecimals={false} stroke="#93a0c0" fontSize={12} />
              <Tooltip contentStyle={{ background: '#151b2e', border: '1px solid #2c3550' }} />
              <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h2>Interviews by category</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3550" />
              <XAxis dataKey="name" stroke="#93a0c0" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} stroke="#93a0c0" fontSize={12} />
              <Tooltip contentStyle={{ background: '#151b2e', border: '1px solid #2c3550' }} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
