const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const http = require('http');
const socketIo = require('socket.io');

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3001';
const REPO_LIST_FILE = process.env.REPO_LIST_FILE || path.join(os.homedir(), '.github-repos-list');
const PORT = Number(process.env.PORT) || 3002;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// Read repository list
app.get('/api/repositories', async (req, res) => {
  try {
    const content = await fs.readFile(REPO_LIST_FILE, 'utf-8');
    const repos = content.split('\n').filter(line => line.trim());
    
    const repoData = repos.map(repo => ({
      name: repo.trim(),
      autoSync: true,
      lastSync: new Date(),
      status: 'synced',
      uncommittedChanges: 0,
      stats: {
        pushes: 0,
        pulls: 0,
        conflicts: 0,
        merges: 0
      }
    }));
    
    res.json(repoData);
  } catch (error) {
    console.error('Error reading repositories:', error);
    res.status(500).json({ error: 'Failed to read repositories' });
  }
});

// Get service status
app.get('/api/service-status', (req, res) => {
  exec('systemctl is-active github-sync-tim.service', (error, stdout) => {
    const isActive = stdout.trim() === 'active';
    
    exec('systemctl show github-sync-tim.service --property=ActiveEnterTimestamp', (err, uptimeOut) => {
      const uptime = uptimeOut ? uptimeOut.split('=')[1]?.trim() : 'Unknown';
      
      res.json({
        isActive,
        uptime,
        lastCheck: new Date()
      });
    });
  });
});

// Helpers for query validation
function parseLogQuery(query) {
  const lines = Math.min(
    Math.max(parseInt(query.lines ?? '100', 10) || 100, 1),
    1000
  );
  const since = typeof query.since === 'string' ? query.since : '1d';
  return { lines, since };
}

function parseStatsQuery(query) {
  const timeRange = typeof query.timeRange === 'string' ? query.timeRange : '1d';
  return { timeRange };
}

// Get logs with time range
app.get('/api/logs', (req, res) => {
  const { lines, since } = parseLogQuery(req.query);
  const command = `sudo journalctl -u github-sync-tim.service -n ${lines} --since="${since} ago" --no-pager -o json`;
  
  exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
    if (error) {
      console.error('Error reading logs:', error);
      return res.status(500).json({ error: 'Failed to read logs' });
    }
    
    try {
      const lines = stdout.trim().split('\n').filter(line => line);
      const logs = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
      
      // Parse logs for activities
      const activities = logs.map((log, index) => {
        const message = log.MESSAGE || '';
        let operation = 'pull';
        let repository = 'Unknown';
        let status = 'success';
        
        // Parse repository name from message
        const repoMatch = message.match(/\[([^\]]+)\]/);
        if (repoMatch) repository = repoMatch[1];
        
        // Determine operation type
        if (message.includes('Pushing') || message.includes('push')) operation = 'push';
        else if (message.includes('Pulling') || message.includes('pull')) operation = 'pull';
        else if (message.includes('Merged') || message.includes('merge')) operation = 'merge';
        else if (message.includes('Conflict') || message.includes('conflict')) operation = 'conflict';
        
        // Determine status
        if (message.includes('error') || message.includes('failed')) status = 'failed';
        else if (message.includes('pending')) status = 'pending';
        
        return {
          id: `log-${index}`,
          timestamp: new Date(log.__REALTIME_TIMESTAMP / 1000),
          repository,
          operation,
          status,
          details: message
        };
      });
      
      res.json(activities);
    } catch (parseError) {
      console.error('Error parsing logs:', parseError);
      res.status(500).json({ error: 'Failed to parse logs' });
    }
  });
});

// Get statistics
app.get('/api/statistics', async (req, res) => {
  const { timeRange } = parseStatsQuery(req.query);
  const command = `sudo journalctl -u github-sync-tim.service --since="${timeRange} ago" --no-pager`;
  
  exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
    if (error) {
      return res.status(500).json({ error: 'Failed to read statistics' });
    }
    
    const lines = stdout.split('\n');
    let pushes = 0, pulls = 0, merges = 0, conflicts = 0;
    
    lines.forEach(line => {
      if (line.includes('Pushing') || line.includes('push')) pushes++;
      if (line.includes('Pulling') || line.includes('pull')) pulls++;
      if (line.includes('Merged') || line.includes('merge')) merges++;
      if (line.includes('Conflict') || line.includes('conflict')) conflicts++;
    });
    
    res.json({
      pushes,
      pulls,
      merges,
      conflicts,
      total: lines.length
    });
  });
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send updates every 5 seconds
  const interval = setInterval(() => {
    exec('systemctl is-active github-sync-tim.service', (error, stdout) => {
      socket.emit('status-update', {
        isActive: stdout.trim() === 'active',
        timestamp: new Date()
      });
    });
  }, 5000);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

module.exports = { app, server, parseLogQuery, parseStatsQuery };
