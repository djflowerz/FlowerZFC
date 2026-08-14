import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAuthUser, setAuthSession, type AuthProfile } from '../services/authService'
import { logAdminAction } from '../services/adminDataService'
import { supabase } from '../services/supabaseClient'
import { INIT_ORDERS, INIT_USERS, INIT_TICKETS, type Order, type AppUser, type Ticket } from './Admin'

export default function SupportDashboard() {
  const navigate = useNavigate()
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(getAuthUser)
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'tickets'>('orders')
  const [orders, setOrders] = useState<Order[]>(INIT_ORDERS)
  const [users, setUsers] = useState<AppUser[]>(INIT_USERS)
  const [tickets] = useState<Ticket[]>(INIT_TICKETS)
  const [orderSearch, setOrderSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')

  const userRole = authProfile?.role || 'user'
  const isAuthorized = authProfile && (userRole === 'support' || userRole === 'super_admin')

  // Security Gate check
  if (!isAuthorized) {
    return (
      <div style={{ background: '#0a0a14', minHeight: '100vh' }} className="flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center p-8 rounded-2xl border border-red-500/30" style={{ background: '#131320' }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-4xl bg-red-500/10 text-red-400 border border-red-500/30">
            🎧
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block mb-1">403 Access Denied</span>
          <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Big Shoulders Display' }}>Support Desk Locked</h1>
          <p className="text-xs text-gray-400 mb-6">
            This route is strictly restricted to assigned Support Staff accounts. Your current profile does not hold Support permissions.
          </p>
          <div className="flex gap-3">
            <Link to="/" className="flex-1 py-3 text-xs font-bold text-gray-300 rounded-xl border border-[#1e1e32] hover:border-white">
              ← Return Home
            </Link>
            <Link to="/admin" className="flex-1 py-3 text-xs font-black text-black rounded-xl hover:opacity-90" style={{ background: '#00b341' }}>
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const filteredOrders = orders.filter(o => !orderSearch || o.id.toLowerCase().includes(orderSearch.toLowerCase()) || o.customer.toLowerCase().includes(orderSearch.toLowerCase()))
  const filteredUsers = users.filter(u => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))

  return (
    <div style={{ background: '#080810', minHeight: '100vh' }}>
      {/* Header Bar */}
      <div style={{ background: 'linear-gradient(135deg,#0d0d22 0%,#091410 100%)', borderBottom: '1px solid #1e1e32' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded text-white bg-[#3b82f6]">
                  🎧 SUPPORT DASHBOARD
                </span>
                <span className="text-[10px] font-semibold text-blue-400">
                  Customer Scope: Orders · User Profiles &amp; Bans · Event Tickets
                </span>
              </div>
              <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'Big Shoulders Display' }}>
                FlowerZFC Support &amp; Order Desk <span className="text-xs text-gray-500 font-normal">({authProfile.email})</span>
              </h1>
            </div>
            <div className="flex gap-2">
              <Link to="/" className="px-3 py-2 text-[11px] font-bold text-gray-400 hover:text-white rounded-xl border border-[#1e1e32]">
                ← Site
              </Link>
              <button
                onClick={async () => { await supabase.auth.signOut(); setAuthProfile(null); navigate('/') }}
                className="px-3 py-2 text-[11px] font-bold text-gray-400 hover:text-red-400 rounded-xl border border-[#1e1e32]"
              >
                🔒 Sign Out
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-5">
            {[
              { id: 'orders', label: '🛒 Customer Orders', badge: orders.filter(o => o.status === 'Pending').length },
              { id: 'users', label: '👥 User Accounts & Moderation', badge: users.filter(u => u.status === 'Banned').length },
              { id: 'tickets', label: '🎟️ Event Passes & Attendees' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === t.id ? 'bg-[#3b82f6] text-white' : 'bg-[#131320] text-gray-400 border border-[#1e1e32]'
                }`}
              >
                <span>{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[#1e1e32] flex items-center justify-between" style={{ background: '#131320' }}>
              <input
                type="text"
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                placeholder="Search order ID, customer name, email..."
                className="w-80 px-3 py-2 text-xs text-white bg-[#0c0c14] border border-[#1e1e32] rounded-xl outline-none focus:border-[#3b82f6]"
              />
              <span className="text-xs text-gray-400 font-bold">{filteredOrders.length} orders listed</span>
            </div>

            <div className="rounded-2xl border border-[#1e1e32] overflow-hidden" style={{ background: '#131320' }}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1e1e32] bg-[#0d0d1e] text-gray-400">
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Courier / Shipping</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Tracking #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e32] text-gray-300">
                  {filteredOrders.map(o => (
                    <tr key={o.id} className="hover:bg-white/[.02]">
                      <td className="p-4 font-mono font-bold text-blue-400">{o.id}</td>
                      <td className="p-4">
                        <p className="font-bold text-white">{o.customer}</p>
                        <p className="text-[10px] text-gray-500">{o.email}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-white text-[11px]">{o.shippingCourier || 'Fargo Courier'}</p>
                        <p className="text-[10px] text-emerald-400 font-mono">KES {o.shippingCostKes || 400}</p>
                      </td>
                      <td className="p-4 font-black text-white" style={{ fontFamily: 'Big Shoulders Display', fontSize: '15px' }}>${o.total.toFixed(2)}</td>
                      <td className="p-4">
                        <select
                          value={o.status}
                          onChange={e => {
                            const newStatus = e.target.value
                            setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: newStatus } : x))
                            logAdminAction(authProfile.email, 'UPDATE_ORDER_STATUS', 'Order', o.id, `Changed order status to ${newStatus}`)
                          }}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg bg-[#0c0c14] border border-[#1e1e32] text-white"
                        >
                          {['Pending', 'Processing', 'Shipped', 'Fulfilled', 'Refunded'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="p-4">
                        <input
                          value={o.tracking}
                          onChange={e => {
                            const trackVal = e.target.value
                            setOrders(prev => prev.map(x => x.id === o.id ? { ...x, tracking: trackVal } : x))
                            logAdminAction(authProfile.email, 'UPDATE_TRACKING', 'Order', o.id, `Updated tracking number to ${trackVal}`)
                          }}
                          placeholder="Tracking #"
                          className="px-2 py-1 text-xs text-white bg-[#0c0c14] border border-[#1e1e32] rounded-lg w-28"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[#1e1e32]" style={{ background: '#131320' }}>
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search user name or email..."
                className="w-80 px-3 py-2 text-xs text-white bg-[#0c0c14] border border-[#1e1e32] rounded-xl outline-none focus:border-[#3b82f6]"
              />
            </div>

            <div className="rounded-2xl border border-[#1e1e32] overflow-hidden" style={{ background: '#131320' }}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1e1e32] bg-[#0d0d1e] text-gray-400">
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e32] text-gray-300">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-white/[.02]">
                      <td className="p-4 font-bold text-white">{u.name} <span className="text-[10px] text-gray-500 font-normal block">{u.email}</span></td>
                      <td className="p-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1e1e32] text-gray-300">{u.role}</span></td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.status === 'Banned' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.role !== 'super_admin' && (
                          <button
                            onClick={() => {
                              const nextStatus = u.status === 'Banned' ? 'Active' : 'Banned'
                              setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: nextStatus } : x))
                              logAdminAction(authProfile.email, u.status === 'Banned' ? 'UNBAN_USER' : 'BAN_USER', 'User', u.id, `${nextStatus === 'Banned' ? 'Banned' : 'Unbanned'} user ${u.name}`)
                            }}
                            className={`text-[10px] font-bold ${u.status === 'Banned' ? 'text-emerald-400' : 'text-red-400'} hover:underline`}
                          >
                            {u.status === 'Banned' ? 'Unban User' : 'Ban User'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TICKETS TAB */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {tickets.map(t => (
                <div key={t.id} className="p-5 rounded-2xl border border-[#1e1e32] space-y-2" style={{ background: '#131320' }}>
                  <h3 className="font-bold text-white text-base">{t.event}</h3>
                  <p className="text-xs text-gray-400">📅 {t.date} · 📍 {t.venue}</p>
                  <div className="flex justify-between text-xs border-t border-[#1e1e32] pt-2">
                    <span className="text-gray-400">Regular Sold: <strong className="text-white">{t.regularSold}/{t.capacity}</strong></span>
                    <span className="text-gray-400">VIP Sold: <strong className="text-emerald-400">{t.vipSold}</strong></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Revenue: <strong className="text-emerald-400">${t.revenue.toLocaleString()}</strong></span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.status === 'Selling' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
