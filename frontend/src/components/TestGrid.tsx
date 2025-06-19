import React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

const TestGrid = () => {
  const typeRecords = [
    { id: '1', name: 'Record A' },
    { id: '2', name: 'Record B' },
    { id: '3', name: 'Record C' }
  ];

  return (
    <Grid container spacing={2}>
      {typeRecords.map((record) => (
        <Grid item xs={12} sm={6} md={4} key={record.id}>
          <Card>
            <CardContent>
              <Typography>{record.name}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default TestGrid;
