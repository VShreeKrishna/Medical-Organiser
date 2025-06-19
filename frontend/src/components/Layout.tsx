import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Container,
  Fade,
} from '@mui/material';
import { AccountCircle } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
        fontFamily: 'Poppins, Roboto, Arial, sans-serif',
      }}
    >
      <AppBar
        position="static"
        sx={{
          background: 'linear-gradient(90deg, #373B44 0%, #4286f4 100%)',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
          borderRadius: '0 0 20px 20px',
          px: 2,
          py: 1,
        }}
      >
        <Toolbar>
          <Typography
            variant="h5"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: 1,
              color: '#ffffff',
              textShadow: '0px 1px 3px rgba(0,0,0,0.3)',
              fontFamily: '"Orbitron", sans-serif'

            }}
          >
            SmartRx
          </Typography>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            sx={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              color: '#fff',
              transition: 'background 0.3s ease',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            <AccountCircle sx={{ fontSize: 32 }} />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            TransitionComponent={Fade}
            PaperProps={{
              sx: {
                borderRadius: 3,
                minWidth: 180,
                backdropFilter: 'blur(10px)',
                background: 'rgba(255, 255, 255, 0.85)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              },
            }}
          >
            <MenuItem disabled sx={{ fontWeight: 600, color: '#333' }}>
              {user?.name}
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ color: '#d32f2f', fontWeight: 600 }}>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
