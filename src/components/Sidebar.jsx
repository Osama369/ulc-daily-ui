import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ReportIcon from '@mui/icons-material/Report';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

const drawerWidth = 240;

// Sidebar shows different menu items depending on the user's role.
// onSelect(tab) will be called for layout-local tabs (Sell Department, reports, total-sale-report, etc.).
const Sidebar = ({ onSelect, variant = 'permanent', open = true, onClose = null }) => {
  const user = useSelector((s) => s.user?.user);
  const role = user?.role || 'user';

  const handleSelect = (tab) => {
    if (typeof onSelect === 'function') onSelect(tab);
    if (variant !== 'permanent' && typeof onClose === 'function') onClose();
  };

  const closeIfOverlay = () => {
    if (variant !== 'permanent' && typeof onClose === 'function') onClose();
  };

  return (
    <Drawer
      variant={variant}
      open={variant === 'permanent' ? true : open}
      onClose={onClose || undefined}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: 'var(--rlc-sidebar-bg)',
          color: 'var(--rlc-sidebar-text)',
          p: 1,
          borderRadius: 0,
          border: 'none',
          '& .MuiListItemButton-root': {
            borderRadius: 1,
            color: 'var(--rlc-sidebar-text)',
            py: 0.8,
          },
          '& .MuiListItemButton-root:hover': {
            bgcolor: 'rgba(255,255,255,0.08)',
          },
          '& .MuiListItemText-primary': {
            fontSize: '1.02rem',
            fontWeight: 500,
          },
        },
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', minHeight: '56px !important' }}>
        <Typography variant="h6" noWrap component="div" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '1.05rem' }}>Dealer Portal</Typography>
        {variant !== 'permanent' && typeof onClose === 'function' && (
          <IconButton size="small" onClick={onClose} sx={{ color: '#cbd5e1' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Toolbar>
      <Box sx={{ overflow: 'auto', p: 1 }}>
        <List>
          {/* Sell Department - hide for admin (admin has its own panel) */}
          {role !== 'admin' && (
            <>
              {role === 'distributor' ? (
                <>
                  <ListItem disablePadding>
                    <ListItemButton component={Link} to="/distributor/book" onClick={closeIfOverlay}>
                      <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><MonetizationOnIcon /></ListItemIcon>
                      <ListItemText primary="Sell Department" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component={Link} to="/distributor/voucher" onClick={closeIfOverlay}>
                      <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><DashboardIcon /></ListItemIcon>
                      <ListItemText primary="Sale Vouchers" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component={Link} to="/distributor/sale-report" onClick={closeIfOverlay}>
                      <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><ReportIcon /></ListItemIcon>
                      <ListItemText primary="Total Sale Report" />
                    </ListItemButton>
                  </ListItem>
                </>
              ) : (
                <>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => handleSelect('Sell Department')}>
                      <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><MonetizationOnIcon /></ListItemIcon>
                      <ListItemText primary="Sell Department" />
                    </ListItemButton>
                  </ListItem>

                  {/* Common reports for users+distributors */}
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => handleSelect('reports')}>
                      <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><DashboardIcon /></ListItemIcon>
                      <ListItemText primary="Sale Vouchers" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton onClick={() => handleSelect('total-sale-report')}>
                      <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><ReportIcon /></ListItemIcon>
                      <ListItemText primary="Total Sale Report" />
                    </ListItemButton>
                  </ListItem>
                </>
              )}
            </>
          )}

          {/* Distributor & Admin specific items */}
          {(role === 'distributor' || role === 'admin') && (
            <>
              {role === 'admin' ? (
                <>
                  <ListItem disablePadding>
                  <ListItemButton component={Link} to="/admin/manage-users" onClick={closeIfOverlay}>
                      <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><GroupIcon /></ListItemIcon>
                      <ListItemText primary="Manage Users" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                  <ListItemButton component={Link} to="/admin/create-user" onClick={closeIfOverlay}>
                      <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><PersonAddIcon /></ListItemIcon>
                      <ListItemText primary="Create User" />
                    </ListItemButton>
                  </ListItem>

                </>
              ) : (
                <>
                  <ListItem disablePadding>
                    <ListItemButton component={Link} to="/distributor/manage-users" onClick={closeIfOverlay}>
                      <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><GroupIcon /></ListItemIcon>
                      <ListItemText primary="Manage Users" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component={Link} to="/distributor/create-user" onClick={closeIfOverlay}>
                      <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><PersonAddIcon /></ListItemIcon>
                      <ListItemText primary="Create User" />
                    </ListItemButton>
                  </ListItem>
                </>
              )}
            </>
          )}

          {/* (common reports are rendered above for non-admin roles) */}

          {/* Admin pages */}
          {role === 'admin' && (
            <>
              <ListItem disablePadding>
                <ListItemButton component={Link} to="/admin/winning-numbers" onClick={closeIfOverlay}>
                  <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><EmojiEventsIcon /></ListItemIcon>
                  <ListItemText primary="Winning Numbers" />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton component={Link} to="/admin/timeslots" onClick={closeIfOverlay}>
                  <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><ScheduleIcon /></ListItemIcon>
                  <ListItemText primary="TimeSlots" />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton component={Link} to="/admin/distributor-no-search" onClick={closeIfOverlay}>
                  <ListItemIcon sx={{ color: 'var(--rlc-sidebar-icon)', minWidth: 34 }}><ReportIcon /></ListItemIcon>
                  <ListItemText primary="NO Search Report" />
                </ListItemButton>
              </ListItem>
            </>
          )}

        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
