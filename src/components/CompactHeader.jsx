import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaBars, FaSignOutAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { clearUser } from '../redux/features/userSlice';
import axios from 'axios';
import toast from 'react-hot-toast';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

const CompactHeader = ({ onToggleSidebar, summaryStats, showSummary = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector((s) => s.user);

  const handleLogout = async () => {
    try {
      await axios.post('/api/v1/auth/logout');
    } catch (err) {
      console.warn('Server logout failed', err?.message || err);
    }
    dispatch(clearUser());
    toast.success('Logged out');
    navigate(userData?.user?.role === 'admin' ? '/admin-login' : '/login');
  };

  const roleRaw = userData?.user?.role || '';
  const roleLabel = typeof roleRaw === 'string' && roleRaw ? roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1) : 'User';
  const stats = summaryStats || {};
  const asNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  const formatNumber = (value) => asNumber(value).toLocaleString();
  const balanceValue = Number.isFinite(Number(stats.balance)) ? Number(stats.balance) : Number(userData?.user?.balance || 0);

  return (
    <AppBar
      position="fixed"
      sx={{
        left: 0,
        width: '100%',
        zIndex: (muiTheme) => muiTheme.zIndex.drawer + 2,
        backgroundColor: 'var(--rlc-header-bg)',
        boxShadow: 'none',
        borderBottom: '1px solid var(--rlc-header-border)',
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          bgcolor: 'var(--rlc-header-bg)',
          color: 'var(--rlc-header-text)',
          px: { xs: 1.25, sm: 2 },
          py: 0.35,
          minHeight: '48px',
        }}
      >
        <IconButton
          onClick={() => { if (typeof onToggleSidebar === 'function') onToggleSidebar(); }}
          color="inherit"
          size="small"
          aria-label="toggle sidebar"
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            border: '1px solid var(--rlc-header-border)',
            flexShrink: 0,
            color: 'var(--rlc-header-text)',
            '&:hover': { bgcolor: '#f3f4f6' },
          }}
        >
          <FaBars style={{ fontSize: 14 }} />
        </IconButton>

        <Box sx={{ ml: 1.2, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 1.1, flexShrink: 1, overflow: 'hidden' }}>
          <Typography noWrap sx={{ color: 'var(--rlc-header-text)', fontWeight: 700, fontSize: '1.08rem', lineHeight: 1.1 }}>
            Dealer Dashboard
          </Typography>
          <Typography noWrap sx={{ color: '#4b5563', fontWeight: 600, fontSize: '0.92rem', lineHeight: 1.1 }}>
            {`${roleLabel} - ${userData?.user?.username || ''}`}
          </Typography>
        </Box>

        {showSummary && (
          <Box sx={{ ml: 1.2, mr: 1, flex: 1, display: 'flex', gap: 0.5, flexWrap: 'nowrap', justifyContent: 'center', overflowX: 'auto', overflowY: 'hidden' }}>
            <Box sx={{ bgcolor: 'var(--rlc-card-black)', color: '#fff', px: 0.75, py: 0.32, borderRadius: 0.7, minWidth: 96, border: '1px solid rgba(17,24,39,0.15)' }}>
              <Typography sx={{ fontSize: 10, color: '#cbd5e1', lineHeight: 1 }}>Balance</Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.15 }}>{`Rs. ${formatNumber(balanceValue)}`}</Typography>
            </Box>
            <Box sx={{ bgcolor: 'var(--rlc-card-black)', color: '#fff', px: 0.75, py: 0.32, borderRadius: 0.7, minWidth: 64, textAlign: 'center', border: '1px solid rgba(17,24,39,0.15)' }}>
              <Typography sx={{ fontSize: 10, color: '#cbd5e1', lineHeight: 1 }}>Count</Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.15 }}>{formatNumber(stats.count)}</Typography>
            </Box>
            <Box sx={{ bgcolor: 'var(--rlc-card-black)', color: '#fff', px: 0.75, py: 0.32, borderRadius: 0.7, minWidth: 72, textAlign: 'center', border: '1px solid rgba(17,24,39,0.15)' }}>
              <Typography sx={{ fontSize: 10, color: '#cbd5e1', lineHeight: 1 }}>Total</Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.15 }}>{formatNumber(stats.total)}</Typography>
            </Box>
            <Box sx={{ bgcolor: 'var(--rlc-card-black)', color: '#fff', px: 0.75, py: 0.32, borderRadius: 0.7, minWidth: 68, textAlign: 'center', border: '1px solid rgba(17,24,39,0.15)' }}>
              <Typography sx={{ fontSize: 10, color: '#cbd5e1', lineHeight: 1 }}>First</Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.15 }}>{formatNumber(stats.first)}</Typography>
            </Box>
            <Box sx={{ bgcolor: 'var(--rlc-card-black)', color: '#fff', px: 0.75, py: 0.32, borderRadius: 0.7, minWidth: 72, textAlign: 'center', border: '1px solid rgba(17,24,39,0.15)' }}>
              <Typography sx={{ fontSize: 10, color: '#cbd5e1', lineHeight: 1 }}>Second</Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.15 }}>{formatNumber(stats.second)}</Typography>
            </Box>
          </Box>
        )}

        <IconButton
          onClick={handleLogout}
          color="inherit"
          size="small"
          title="Logout"
          aria-label="logout"
          sx={{ ml: 'auto', flexShrink: 0, color: 'var(--rlc-danger)' }}
        >
          <FaSignOutAlt />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default CompactHeader;
