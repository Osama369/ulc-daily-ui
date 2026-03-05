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

const CompactHeader = ({ onToggleSidebar }) => {
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
          bgcolor: 'var(--rlc-header-bg)',
          color: 'var(--rlc-header-text)',
          px: { xs: 1.25, sm: 2 },
          py: 0.75,
          minHeight: '56px',
        }}
      >
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
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

          <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', color: 'var(--rlc-header-text)' }}>
            <Typography variant="h6" noWrap sx={{ color: 'var(--rlc-header-text)', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.1 }}>
              Dealer Dashboard
            </Typography>
            <Typography variant="caption" sx={{ color: '#4b5563', fontWeight: 600 }}>
              {`${roleLabel} - ${userData?.user?.dealerId || '-'} - ${userData?.user?.username || ''}`}
            </Typography>
          </Box>

          <IconButton onClick={handleLogout} color="inherit" size="small" title="Logout" aria-label="logout" sx={{ flexShrink: 0, color: 'var(--rlc-danger)' }}>
            <FaSignOutAlt />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default CompactHeader;
