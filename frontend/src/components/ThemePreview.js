import React from 'react';
import { Box, Card, CardContent, Typography, Chip, Avatar } from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  Assignment, 
  Business, 
  Person,
  LocalShipping 
} from '@mui/icons-material';

const ThemePreview = ({ themeName, colors, isSelected, onClick }) => {
  const previewItems = [
    { icon: <DashboardIcon sx={{ color: colors.primary.main }} />, label: 'Dashboard' },
    { icon: <Assignment sx={{ color: colors.secondary.main }} />, label: 'Tickets' },
    { icon: <Business sx={{ color: colors.primary.light }} />, label: 'Sites' },
    { icon: <Person sx={{ color: colors.secondary.light }} />, label: 'Users' },
    { icon: <LocalShipping sx={{ color: colors.primary.dark }} />, label: 'Shipments' }
  ];

  return (
    <Card 
      className="theme-card"
      sx={{ 
        cursor: 'pointer',
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        '&:hover': { borderColor: 'primary.main' },
        transition: 'all 0.3s ease'
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            width: 24, 
            height: 24, 
            borderRadius: 1, 
            backgroundColor: colors.primary.main,
            mr: 1
          }} />
          <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
            {themeName}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {previewItems.map((item, index) => (
            <Chip
              key={index}
              icon={item.icon}
              label={item.label}
              size="small"
              variant="outlined"
              sx={{ 
                fontSize: '0.7rem',
                '& .MuiChip-icon': { fontSize: '1rem' }
              }}
            />
          ))}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ 
            width: 16, 
            height: 16, 
            borderRadius: 0.5, 
            backgroundColor: colors.primary.main 
          }} />
          <Box sx={{ 
            width: 16, 
            height: 16, 
            borderRadius: 0.5, 
            backgroundColor: colors.secondary.main 
          }} />
          <Box sx={{ 
            width: 16, 
            height: 16, 
            borderRadius: 0.5, 
            backgroundColor: colors.primary.light 
          }} />
          <Box sx={{ 
            width: 16, 
            height: 16, 
            borderRadius: 0.5, 
            backgroundColor: colors.secondary.light 
          }} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ThemePreview; 