import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Sidebar from "../../components/Sidebar";
import CompactHeader from '../../components/CompactHeader';

const AdminLayout = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const drawerWidth = 240;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'var(--rlc-page-bg)' }}>
      <Sidebar
        onSelect={() => {}}
        variant="temporary"
        open={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <CompactHeader drawerWidth={drawerWidth} sidebarVisible={sidebarVisible} onToggleSidebar={() => setSidebarVisible(v => !v)} />
        <Toolbar />
        <Box sx={{ p: 3, bgcolor: 'var(--rlc-page-bg)', minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
