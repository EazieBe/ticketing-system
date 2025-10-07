import React from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { Build, Assignment } from '@mui/icons-material';

const Logo = ({ size = 'medium', showText = true, variant = 'default' }) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return { avatar: 24, fontSize: '0.75rem', gap: 1 };
      case 'large':
        return { avatar: 48, fontSize: '1.25rem', gap: 2 };
      default:
        return { avatar: 40, fontSize: '1rem', gap: 2 };
    }
  };

  const { avatar, fontSize, gap } = getSize();

  const getIcon = () => {
    switch (variant) {
      case 'ticket':
        return <Assignment />;
      case 'build':
        return <Build />;
      default:
        return <Build />;
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: gap,
      cursor: 'pointer'
    }}>
      <Avatar sx={{ 
        bgcolor: 'primary.main',
        width: avatar,
        height: avatar
      }}>
        {getIcon()}
      </Avatar>
      {showText && (
        <Box>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700, 
              color: 'primary.main',
              fontSize: fontSize,
              lineHeight: 1.2
            }}
          >
            ICS Ticketing System
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontSize: fontSize * 0.7 }}
          >
            Professional Support
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Logo;
