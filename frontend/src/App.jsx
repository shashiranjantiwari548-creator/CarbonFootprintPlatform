import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Target, 
  Lightbulb, 
  Trophy, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Trash2, 
  Download, 
  Leaf, 
  Car, 
  Zap, 
  Utensils, 
  ShoppingBag, 
  X, 
  Check,
  TrendingDown,
  Calendar,
  Sparkles,
  Award
} from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:8000';

function App() {
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('carbon_token') || null);
  const [user, setUser] = useState(null);
  
  // Navigation State
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // App Data State
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ total_co2: 0, by_category: {}, recent_records: [] });
  const [goals, setGoals] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tips, setTips] = useState([]);
  
  // Form & UI States
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  // Log Modal Form State
  const [showLogModal, setShowLogModal] = useState(false);
  const [logCategory, setLogCategory] = useState('transport');
  const [logActivity, setLogActivity] = useState('petrol_car');
  const [logValue, setLogValue] = useState('');
  const [logNotes, setLogNotes] = useState('');
  
  // Goal Form State
  const [goalCategory, setGoalCategory] = useState('total');
  const [goalLimit, setGoalLimit] = useState('');
  const [goalEndDate, setGoalEndDate] = useState('');
  
  // Profile Form State
  const [profileDiet, setProfileDiet] = useState('average');
  const [profileTravel, setProfileTravel] = useState('car');
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info'); // info, success, error

  // Central fetch wrapper with auth header
  const apiFetch = async (endpoint, method = 'GET', body = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (response.status === 401) {
      handleLogout();
      throw new Error('Session expired');
    }
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || 'Request failed');
    }
    
    if (response.headers.get('content-type') === 'application/pdf') {
      return response.blob();
    }
    
    return response.json();
  };

  // Helper to show toasts
  const showToast = (message, type = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Check and fetch user profile when token is present
  useEffect(() => {
    if (token) {
      localStorage.setItem('carbon_token', token);
      apiFetch('/api/auth/me')
        .then(data => {
          setUser(data);
          setProfileDiet(data.dietary_preference);
          setProfileTravel(data.travel_preference);
        })
        .catch(err => {
          showToast(err.message, 'error');
          handleLogout();
        });
    } else {
      setUser(null);
    }
  }, [token]);

  // Fetch Dashboard / Global Data when tab changes or user changes
  useEffect(() => {
    if (!user) return;

    if (currentTab === 'dashboard') {
      fetchSummary();
    } else if (currentTab === 'logs') {
      fetchLogs();
    } else if (currentTab === 'goals') {
      fetchGoals();
    } else if (currentTab === 'tips') {
      fetchTips();
    } else if (currentTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [user, currentTab]);

  const fetchSummary = async () => {
    try {
      const data = await apiFetch('/api/carbon/summary');
      setSummary(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await apiFetch('/api/carbon/logs');
      setLogs(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fetchGoals = async () => {
    try {
      const data = await apiFetch('/api/goals');
      setGoals(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fetchTips = async () => {
    try {
      const data = await apiFetch('/api/carbon/recommendations');
      setTips(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const data = await apiFetch('/api/leaderboard');
      setLeaderboard(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Auth Functions
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await apiFetch('/api/auth/register', 'POST', {
          username: usernameInput,
          email: emailInput,
          password: passwordInput
        });
        showToast('Account created! Logging in...', 'success');
      }
      
      const loginData = await apiFetch('/api/auth/login', 'POST', {
        username: usernameInput,
        password: passwordInput
      });
      setToken(loginData.access_token);
      showToast('Logged in successfully', 'success');
      
      // Clear forms
      setUsernameInput('');
      setEmailInput('');
      setPasswordInput('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('carbon_token');
    setCurrentTab('dashboard');
  };

  // Carbon Log Submit
  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!logValue || parseFloat(logValue) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    const categoryUnits = {
      transport: 'miles',
      energy: 'kWh',
      food: 'servings',
      shopping: 'items'
    };

    try {
      await apiFetch('/api/carbon/log', 'POST', {
        category: logCategory,
        activity: logActivity,
        value: parseFloat(logValue),
        unit: categoryUnits[logCategory],
        notes: logNotes
      });
      
      showToast('Activity logged successfully!', 'success');
      setShowLogModal(false);
      
      // Reset form
      setLogValue('');
      setLogNotes('');
      
      // Refresh current view data
      if (currentTab === 'dashboard') fetchSummary();
      else if (currentTab === 'logs') fetchLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete Carbon Log
  const handleDeleteLog = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this emission log?')) return;
    try {
      await apiFetch(`/api/carbon/logs/${recordId}`, 'DELETE');
      showToast('Record deleted', 'success');
      fetchLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Update default activity when category changes
  const handleCategoryChange = (cat) => {
    setLogCategory(cat);
    const defaults = {
      transport: 'petrol_car',
      energy: 'electricity',
      food: 'beef',
      shopping: 'clothing'
    };
    setLogActivity(defaults[cat]);
  };

  // Create Goal
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalLimit || parseFloat(goalLimit) <= 0) {
      showToast('Please enter a valid limit', 'error');
      return;
    }
    if (!goalEndDate) {
      showToast('Please select a target date', 'error');
      return;
    }

    try {
      await apiFetch('/api/goals', 'POST', {
        category: goalCategory,
        target_reduction: parseFloat(goalLimit),
        end_date: new Date(goalEndDate).toISOString()
      });
      showToast('Goal created successfully!', 'success');
      setGoalLimit('');
      setGoalEndDate('');
      fetchGoals();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await apiFetch(`/api/goals/${goalId}`, 'DELETE');
      showToast('Goal deleted', 'success');
      fetchGoals();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Update Profile Preferences
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const updated = await apiFetch('/api/auth/profile', 'PUT', {
        dietary_preference: profileDiet,
        travel_preference: profileTravel
      });
      setUser(updated);
      showToast('Preferences updated!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Download PDF Report
  const handleDownloadReport = async () => {
    try {
      const blob = await apiFetch('/api/carbon/report');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${user.username}_carbon_report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Report downloaded successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // If user is not logged in, render Auth Screen
  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <Leaf size={32} />
            <span>CarbonIQ</span>
          </div>
          <h2 className="auth-title">{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="auth-subtitle">
            {isRegistering 
              ? 'Join CarbonIQ to calculate and reduce your carbon footprint' 
              : 'Log in to track your carbon emissions and reduction goals'}
          </p>

          {authError && <div style={{ color: 'var(--danger)', marginBottom: '20px', fontSize: '14px' }}>{authError}</div>}

          <form onSubmit={handleAuthSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                className="form-input" 
                value={usernameInput} 
                onChange={(e) => setUsernameInput(e.target.value)} 
                required 
              />
            </div>

            {isRegistering && (
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={emailInput} 
                  onChange={(e) => setEmailInput(e.target.value)} 
                  required 
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="btn-primary">
              {isRegistering ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="auth-toggle">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}
            <button 
              className="auth-toggle-btn" 
              onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-message ${toastType}`} style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          padding: '12px 24px',
          borderRadius: '8px',
          background: toastType === 'success' ? 'var(--success)' : toastType === 'error' ? 'var(--danger)' : 'var(--secondary)',
          color: '#040705',
          fontWeight: '700',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastType === 'success' && <Check size={18} />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Leaf size={24} />
          <span>CarbonIQ</span>
        </div>

        <nav className="sidebar-menu">
          <button 
            className={`menu-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button 
            className={`menu-item ${currentTab === 'logs' ? 'active' : ''}`}
            onClick={() => setCurrentTab('logs')}
          >
            <History size={20} />
            <span>Log History</span>
          </button>
          <button 
            className={`menu-item ${currentTab === 'goals' ? 'active' : ''}`}
            onClick={() => setCurrentTab('goals')}
          >
            <Target size={20} />
            <span>Reduction Goals</span>
          </button>
          <button 
            className={`menu-item ${currentTab === 'tips' ? 'active' : ''}`}
            onClick={() => setCurrentTab('tips')}
          >
            <Lightbulb size={20} />
            <span>AI Tips & Advice</span>
          </button>
          <button 
            className={`menu-item ${currentTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('leaderboard')}
          >
            <Trophy size={20} />
            <span>Leaderboard</span>
          </button>
          <button 
            className={`menu-item ${currentTab === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentTab('profile')}
          >
            <UserIcon size={20} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-user">
          <div className="user-info">
            <div className="user-avatar">
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <div className="user-name">{user.username}</div>
              <div className="user-role">{user.email}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* DASHBOARD TAB */}
        {currentTab === 'dashboard' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Welcome, {user.username}!</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Track your real-time ecological footprint metrics.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-action" style={{ background: '#1c2a23', color: 'var(--primary)', border: '1px solid var(--border-color)', boxShadow: 'none' }} onClick={handleDownloadReport}>
                  <Download size={18} />
                  <span>Export Report</span>
                </button>
                <button className="btn-action" onClick={() => setShowLogModal(true)}>
                  <Plus size={18} />
                  <span>Log Activity</span>
                </button>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="dashboard-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span>Total Emissions</span>
                  <Leaf className="stat-icon" style={{ color: 'var(--primary)' }} />
                </div>
                <div className="stat-value">
                  {summary.total_co2} <span className="stat-unit">kg CO2e</span>
                </div>
                <div className="stat-footer">Recorded footprint to date</div>
              </div>

              <div className="stat-card energy">
                <div className="stat-header">
                  <span>Energy Sector</span>
                  <Zap className="stat-icon" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="stat-value">
                  {summary.by_category?.energy || 0} <span className="stat-unit">kg</span>
                </div>
                <div className="stat-footer">Home & heating power</div>
              </div>

              <div className="stat-card food">
                <div className="stat-header">
                  <span>Food Footprint</span>
                  <Utensils className="stat-icon" style={{ color: '#ec4899' }} />
                </div>
                <div className="stat-value">
                  {summary.by_category?.food || 0} <span className="stat-unit">kg</span>
                </div>
                <div className="stat-footer">Dietary related emission</div>
              </div>

              <div className="stat-card shopping">
                <div className="stat-header">
                  <span>Travel & Shopping</span>
                  <Car className="stat-icon" style={{ color: 'var(--secondary)' }} />
                </div>
                <div className="stat-value">
                  {((summary.by_category?.transport || 0) + (summary.by_category?.shopping || 0)).toFixed(2)} <span className="stat-unit">kg</span>
                </div>
                <div className="stat-footer">Transit & consumer purchases</div>
              </div>
            </div>

            {/* Charts Panel */}
            <div className="charts-grid">
              <div className="panel">
                <h3 className="panel-title">
                  <TrendingDown size={20} style={{ color: 'var(--primary)' }} />
                  Sector Breakdown
                </h3>
                
                {summary.total_co2 > 0 ? (
                  <div className="custom-chart">
                    <div className="chart-bar-wrapper">
                      <div 
                        className="chart-bar transport" 
                        style={{ height: `${((summary.by_category?.transport || 0) / summary.total_co2) * 100}%` }}
                      >
                        <span className="chart-bar-value">{summary.by_category?.transport} kg</span>
                      </div>
                      <span className="chart-label">Transport</span>
                    </div>

                    <div className="chart-bar-wrapper">
                      <div 
                        className="chart-bar energy" 
                        style={{ height: `${((summary.by_category?.energy || 0) / summary.total_co2) * 100}%` }}
                      >
                        <span className="chart-bar-value">{summary.by_category?.energy} kg</span>
                      </div>
                      <span className="chart-label">Energy</span>
                    </div>

                    <div className="chart-bar-wrapper">
                      <div 
                        className="chart-bar food" 
                        style={{ height: `${((summary.by_category?.food || 0) / summary.total_co2) * 100}%` }}
                      >
                        <span className="chart-bar-value">{summary.by_category?.food} kg</span>
                      </div>
                      <span className="chart-label">Food</span>
                    </div>

                    <div className="chart-bar-wrapper">
                      <div 
                        className="chart-bar shopping" 
                        style={{ height: `${((summary.by_category?.shopping || 0) / summary.total_co2) * 100}%` }}
                      >
                        <span className="chart-bar-value">{summary.by_category?.shopping} kg</span>
                      </div>
                      <span className="chart-label">Shopping</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    No data logged yet. Click 'Log Activity' to start tracking.
                  </div>
                )}
              </div>

              {/* Recent Logs panel */}
              <div className="panel">
                <h3 className="panel-title">Recent Activity</h3>
                <div className="activity-list">
                  {summary.recent_records?.slice(0, 4).map((r) => (
                    <div className="activity-item" key={r.id}>
                      <div className="activity-meta">
                        <div className={`activity-cat-icon ${r.category}`}>
                          {r.category === 'transport' && <Car size={16} />}
                          {r.category === 'energy' && <Zap size={16} />}
                          {r.category === 'food' && <Utensils size={16} />}
                          {r.category === 'shopping' && <ShoppingBag size={16} />}
                        </div>
                        <div className="activity-details">
                          <h4>{r.activity.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</h4>
                          <p>{new Date(r.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="activity-emissions">
                        <div className="emissions-value">{r.co2_output}</div>
                        <div className="emissions-lbl">kg CO2e</div>
                      </div>
                    </div>
                  ))}

                  {(!summary.recent_records || summary.recent_records.length === 0) && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0' }}>
                      No entries found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOG HISTORY TAB */}
        {currentTab === 'logs' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Activity Logs</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Review or delete previous carbon contributions.</p>
              </div>
              <button className="btn-action" onClick={() => setShowLogModal(true)}>
                <Plus size={18} />
                <span>Log Activity</span>
              </button>
            </div>

            <div className="panel" style={{ padding: '0px' }}>
              <div className="table-container">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Activity Details</th>
                      <th>Quantity Logged</th>
                      <th>Impact (kg CO2e)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td>{new Date(l.date).toLocaleDateString()}</td>
                        <td>
                          <span style={{ 
                            textTransform: 'uppercase', 
                            fontSize: '11px', 
                            fontWeight: '700', 
                            color: l.category === 'transport' ? 'var(--primary)' : l.category === 'energy' ? 'var(--accent)' : l.category === 'food' ? '#ec4899' : 'var(--secondary)' 
                          }}>
                            {l.category}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{l.activity.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                          {l.notes && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l.notes}</div>}
                        </td>
                        <td>{l.value} {l.unit}</td>
                        <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{l.co2_output}</td>
                        <td>
                          <button className="btn-delete" onClick={() => handleDeleteLog(l.id)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {logs.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                          No logged carbon contributions found. Click 'Log Activity' to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REDUCTION GOALS TAB */}
        {currentTab === 'goals' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Carbon Budgets & Goals</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Set caps on your emission levels and stick to them.</p>
              </div>
            </div>

            <div className="charts-grid">
              {/* Left Side: Active Goals list */}
              <div className="panel">
                <h3 className="panel-title">Active Goals</h3>
                <div className="goals-grid">
                  {goals.map((g) => {
                    const percentage = Math.min((g.current_emissions / g.target_reduction) * 100, 100);
                    const isExceeded = g.current_emissions > g.target_reduction;
                    
                    return (
                      <div className="goal-card" key={g.id}>
                        <div className="goal-header">
                          <div className="goal-category">
                            {g.category === 'transport' && <Car size={18} style={{ color: 'var(--primary)' }} />}
                            {g.category === 'energy' && <Zap size={18} style={{ color: 'var(--accent)' }} />}
                            {g.category === 'food' && <Utensils size={18} style={{ color: '#ec4899' }} />}
                            {g.category === 'shopping' && <ShoppingBag size={18} style={{ color: 'var(--secondary)' }} />}
                            {g.category === 'total' && <Leaf size={18} style={{ color: 'var(--primary)' }} />}
                            <span>{g.category} Budget</span>
                          </div>
                          <span className={`goal-status-badge ${g.status}`}>
                            {g.status === 'active' ? (isExceeded ? 'Exceeded limit' : 'On track') : g.status}
                          </span>
                        </div>

                        <div className="goal-dates">
                          <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          Ends {new Date(g.end_date).toLocaleDateString()}
                        </div>

                        <div className="goal-progress-container">
                          <div className="goal-progress-labels">
                            <span>Logged: {g.current_emissions} kg</span>
                            <span>Limit: {g.target_reduction} kg</span>
                          </div>
                          <div className="goal-progress-bar">
                            <div 
                              className="goal-progress-fill" 
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: isExceeded ? 'var(--danger)' : 'var(--primary)'
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                          <button className="btn-logout" style={{ padding: '0px' }} onClick={() => handleDeleteGoal(g.id)}>
                            <Trash2 size={16} />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {goals.length === 0 && (
                    <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                      No active reduction goals. Set one using the panel on the right!
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Create Goal Form */}
              <div className="panel">
                <h3 className="panel-title">Set Carbon Budget</h3>
                <form onSubmit={handleCreateGoal}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-input" 
                      value={goalCategory} 
                      onChange={(e) => setGoalCategory(e.target.value)}
                      style={{ background: 'rgba(10, 15, 13, 0.8)' }}
                    >
                      <option value="total">All Combined</option>
                      <option value="transport">Transport Only</option>
                      <option value="energy">Energy Only</option>
                      <option value="food">Food Only</option>
                      <option value="shopping">Shopping Only</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Emission Cap (kg CO2e)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 100"
                      value={goalLimit}
                      onChange={(e) => setGoalLimit(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target End Date</label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={goalEndDate}
                      onChange={(e) => setGoalEndDate(e.target.value)}
                      required 
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    Create Budget Goal
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* AI RECOMMENDATIONS TAB */}
        {currentTab === 'tips' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Personalized Reduction Tips</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Based on your log patterns and settings.</p>
              </div>
            </div>

            <div className="tips-grid">
              {tips.map((t, idx) => (
                <div className="tip-card" key={idx}>
                  <div className="tip-header">
                    <h3 className="tip-title">{t.title}</h3>
                    <span className={`badge ${t.difficulty.toLowerCase()}`}>{t.difficulty}</span>
                  </div>
                  <p className="tip-desc">{t.description}</p>
                  
                  <div className="tip-footer">
                    <div className="tip-savings">
                      Est. Savings: <strong>{t.estimated_savings} kg</strong> / mo
                    </div>
                    <button className="btn-action" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => {
                      showToast(`Challenge accepted: ${t.title}!`, 'success');
                    }}>
                      <Sparkles size={14} />
                      <span>Accept Challenge</span>
                    </button>
                  </div>
                </div>
              ))}

              {tips.length === 0 && (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--text-secondary)', padding: '60px' }}>
                  No customized recommendations. Log more activities so CarbonIQ can study your footprint patterns!
                </div>
              )}
            </div>
          </div>
        )}

        {/* LEADERBOARD & BADGES TAB */}
        {currentTab === 'leaderboard' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Community Leaderboard</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Compete with others to secure the lowest carbon rank.</p>
              </div>
            </div>

            <div className="leaderboard-stats">
              {/* Leaderboard Rankings */}
              <div className="panel">
                <h3 className="panel-title">Standings</h3>
                
                {/* Podium for top 3 */}
                {leaderboard.length > 0 && (
                  <div className="leaderboard-podium">
                    {leaderboard[1] && (
                      <div className="podium-step second">
                        <div className="podium-user">{leaderboard[1].username}<br/><small>{leaderboard[1].total_co2} kg</small></div>
                        <div className="podium-block">2</div>
                      </div>
                    )}
                    {leaderboard[0] && (
                      <div className="podium-step first">
                        <div className="podium-user" style={{ fontSize: '15px', fontWeight: '700' }}><Award size={16} style={{ color: '#f59e0b', verticalAlign: 'middle', marginRight: '4px' }} />{leaderboard[0].username}<br/><small>{leaderboard[0].total_co2} kg</small></div>
                        <div className="podium-block">1</div>
                      </div>
                    )}
                    {leaderboard[2] && (
                      <div className="podium-step third">
                        <div className="podium-user">{leaderboard[2].username}<br/><small>{leaderboard[2].total_co2} kg</small></div>
                        <div className="podium-block">3</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="table-container">
                  <table className="app-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>User</th>
                        <th>Emissions logged (kg)</th>
                        <th>Record count</th>
                        <th>Badges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((userRow) => (
                        <tr key={userRow.username} style={userRow.username === user.username ? { background: 'rgba(16, 185, 129, 0.05)' } : {}}>
                          <td style={{ fontWeight: '700' }}>#{userRow.rank}</td>
                          <td>
                            <div style={{ fontWeight: '600' }}>{userRow.username} {userRow.username === user.username && <span style={{ color: 'var(--primary)', fontSize: '12px' }}>(You)</span>}</div>
                          </td>
                          <td style={{ fontWeight: '700' }}>{userRow.total_co2}</td>
                          <td>{userRow.record_count}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {userRow.badges.map((b) => (
                                <span key={b} style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '100px', color: 'var(--text-secondary)' }}>
                                  {b}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Achievements & Badges Panel */}
              <div className="panel">
                <h3 className="panel-title">Your Badges</h3>
                <div className="badges-panel">
                  <div className="badges-grid">
                    {/* Badge 1 */}
                    <div className="badge-item">
                      <div className="badge-icon-wrap">
                        <Award size={20} />
                      </div>
                      <div className="badge-title">Eco Pioneer</div>
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>Registered account</p>
                    </div>

                    {/* Badge 2 */}
                    <div className={`badge-item ${!user.badges.includes('Carbon Saver') ? 'inactive' : ''}`}>
                      <div className="badge-icon-wrap">
                        <Award size={20} />
                      </div>
                      <div className="badge-title">Carbon Saver</div>
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>Logged 5+ entries</p>
                    </div>

                    {/* Badge 3 */}
                    <div className={`badge-item ${!user.badges.includes('Eco Warrior') ? 'inactive' : ''}`}>
                      <div className="badge-icon-wrap">
                        <Award size={20} />
                      </div>
                      <div className="badge-title">Eco Warrior</div>
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>Under 100kg total</p>
                    </div>

                    {/* Badge 4 */}
                    <div className={`badge-item ${!user.badges.includes('Commute Hero') ? 'inactive' : ''}`}>
                      <div className="badge-icon-wrap">
                        <Award size={20} />
                      </div>
                      <div className="badge-title">Commute Hero</div>
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>Under 20kg transit</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS / PROFILE TAB */}
        {currentTab === 'profile' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Default Preferences</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Set preferences to default logs calculations.</p>
              </div>
            </div>

            <div className="panel" style={{ maxWidth: '600px' }}>
              <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                  <label className="form-label">Dietary Type</label>
                  <select 
                    className="form-input" 
                    value={profileDiet} 
                    onChange={(e) => setProfileDiet(e.target.value)}
                    style={{ background: 'rgba(10, 15, 13, 0.8)' }}
                  >
                    <option value="vegan">Vegan (lowest carbon footprint)</option>
                    <option value="vegetarian">Vegetarian (low footprint)</option>
                    <option value="pescatarian">Pescatarian (medium footprint)</option>
                    <option value="average">Omnivorous Average (standard footprint)</option>
                    <option value="heavy_meat">Heavy Meat Consumer (high footprint)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Mode of Commute</label>
                  <select 
                    className="form-input" 
                    value={profileTravel} 
                    onChange={(e) => setProfileTravel(e.target.value)}
                    style={{ background: 'rgba(10, 15, 13, 0.8)' }}
                  >
                    <option value="active">Bicycle / Walking (zero footprint)</option>
                    <option value="electric_car">Electric Vehicle (very low footprint)</option>
                    <option value="hybrid_car">Hybrid Vehicle (low footprint)</option>
                    <option value="public_transit">Public Transit Bus/Train (low footprint)</option>
                    <option value="car">Petrol/Diesel Automobile (high footprint)</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary">
                  Save Preferences
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Log Modal Dialog */}
      {showLogModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Log New Activity</h3>
              <button className="btn-close" onClick={() => setShowLogModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Category Icons Grid */}
            <div className="category-picker">
              <div 
                className={`cat-picker-item ${logCategory === 'transport' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('transport')}
              >
                <Car size={20} />
                <span>Transport</span>
              </div>
              <div 
                className={`cat-picker-item ${logCategory === 'energy' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('energy')}
              >
                <Zap size={20} />
                <span>Energy</span>
              </div>
              <div 
                className={`cat-picker-item ${logCategory === 'food' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('food')}
              >
                <Utensils size={20} />
                <span>Food</span>
              </div>
              <div 
                className={`cat-picker-item ${logCategory === 'shopping' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('shopping')}
              >
                <ShoppingBag size={20} />
                <span>Shopping</span>
              </div>
            </div>

            {/* Dynamic Activity Form */}
            <form onSubmit={handleLogSubmit}>
              
              {/* Transport Fields */}
              {logCategory === 'transport' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Transit Mode</label>
                    <select 
                      className="form-input" 
                      value={logActivity}
                      onChange={(e) => setLogActivity(e.target.value)}
                      style={{ background: 'rgba(10, 15, 13, 0.8)' }}
                    >
                      <option value="petrol_car">Petrol Car</option>
                      <option value="diesel_car">Diesel Car</option>
                      <option value="hybrid_car">Hybrid Car</option>
                      <option value="electric_car">Electric Vehicle</option>
                      <option value="public_transit">Bus or Train</option>
                      <option value="flight_short">Short-haul flight (&lt;1000 mi)</option>
                      <option value="flight_long">Long-haul flight (&gt;=1000 mi)</option>
                      <option value="active">Walking or Biking</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Distance (miles)</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={logValue}
                      onChange={(e) => setLogValue(e.target.value)}
                      placeholder="e.g. 15"
                      required
                    />
                  </div>
                </>
              )}

              {/* Energy Fields */}
              {logCategory === 'energy' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Source Type</label>
                    <select 
                      className="form-input"
                      value={logActivity}
                      onChange={(e) => setLogActivity(e.target.value)}
                      style={{ background: 'rgba(10, 15, 13, 0.8)' }}
                    >
                      <option value="electricity">Grid Electric</option>
                      <option value="natural_gas">Natural Gas</option>
                      <option value="coal">Coal</option>
                      <option value="solar_wind">Renewable Solar/Wind</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (kWh)</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={logValue}
                      onChange={(e) => setLogValue(e.target.value)}
                      placeholder="e.g. 120"
                      required
                    />
                  </div>
                </>
              )}

              {/* Food Fields */}
              {logCategory === 'food' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Meal/Product Type</label>
                    <select 
                      className="form-input"
                      value={logActivity}
                      onChange={(e) => setLogActivity(e.target.value)}
                      style={{ background: 'rgba(10, 15, 13, 0.8)' }}
                    >
                      <option value="beef">Beef (High Impact)</option>
                      <option value="pork_poultry">Pork/Poultry</option>
                      <option value="fish">Seafood/Fish</option>
                      <option value="dairy">Dairy Products</option>
                      <option value="vegetarian">Vegetarian Meal</option>
                      <option value="vegan">Vegan Meal (Lowest Impact)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Servings</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={logValue}
                      onChange={(e) => setLogValue(e.target.value)}
                      placeholder="e.g. 2"
                      required
                    />
                  </div>
                </>
              )}

              {/* Shopping Fields */}
              {logCategory === 'shopping' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Item Category</label>
                    <select 
                      className="form-input"
                      value={logActivity}
                      onChange={(e) => setLogActivity(e.target.value)}
                      style={{ background: 'rgba(10, 15, 13, 0.8)' }}
                    >
                      <option value="clothing">Clothing / Textiles</option>
                      <option value="electronics">Electronics / Devices</option>
                      <option value="furniture">Furniture / Decor</option>
                      <option value="misc">Miscellaneous Products</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity (Items)</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={logValue}
                      onChange={(e) => setLogValue(e.target.value)}
                      placeholder="e.g. 1"
                      required
                    />
                  </div>
                </>
              )}

              {/* Common Notes field */}
              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="e.g. Weekly commute to office"
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '12px' }}>
                Log to Footprint
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
