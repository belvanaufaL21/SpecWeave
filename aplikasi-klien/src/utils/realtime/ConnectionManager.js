/**
 * Real-time connection manager for optimized chat and live features
 */
class ConnectionManager {
  constructor() {
    this.connections = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = 30000; // 30 seconds
    this.heartbeatTimers = new Map();
  }

  /**
   * Create or get existing connection
   */
  getConnection(key, config = {}) {
    if (this.connections.has(key)) {
      return this.connections.get(key);
    }

    const connection = this.createConnection(key, config);
    this.connections.set(key, connection);
    return connection;
  }

  /**
   * Create new connection with auto-reconnect
   */
  createConnection(key, config) {
    const connection = {
      key,
      config,
      status: 'disconnected',
      lastActivity: Date.now(),
      listeners: new Map(),
      
      // Connection methods
      connect: () => this.connect(key),
      disconnect: () => this.disconnect(key),
      send: (data) => this.send(key, data),
      on: (event, callback) => this.addEventListener(key, event, callback),
      off: (event, callback) => this.removeEventListener(key, event, callback),
      
      // Status methods
      isConnected: () => this.isConnected(key),
      getStatus: () => this.getStatus(key)
    };

    // Auto-connect if specified
    if (config.autoConnect !== false) {
      setTimeout(() => connection.connect(), 100);
    }

    return connection;
  }

  /**
   * Connect to service
   */
  async connect(key) {
    const connection = this.connections.get(key);
    if (!connection) return false;

    try {
      connection.status = 'connecting';
      this.emit(key, 'connecting');

      // Simulate connection (replace with actual WebSocket/SSE logic)
      await this.simulateConnection(key);
      
      connection.status = 'connected';
      connection.lastActivity = Date.now();
      this.reconnectAttempts.set(key, 0);
      
      this.emit(key, 'connected');
      this.startHeartbeat(key);
      
      return true;
    } catch (error) {
      connection.status = 'error';
      this.emit(key, 'error', error);
      this.scheduleReconnect(key);
      return false;
    }
  }

  /**
   * Disconnect from service
   */
  disconnect(key) {
    const connection = this.connections.get(key);
    if (!connection) return;

    connection.status = 'disconnected';
    this.stopHeartbeat(key);
    this.emit(key, 'disconnected');
  }

  /**
   * Send data through connection
   */
  send(key, data) {
    const connection = this.connections.get(key);
    if (!connection || !this.isConnected(key)) {
      throw new Error(`Connection ${key} is not available`);
    }

    connection.lastActivity = Date.now();
    
    // Simulate sending data (replace with actual implementation)
    setTimeout(() => {
      this.emit(key, 'message', { type: 'echo', data });
    }, 50);
  }

  /**
   * Add event listener
   */
  addEventListener(key, event, callback) {
    const connection = this.connections.get(key);
    if (!connection) return;

    if (!connection.listeners.has(event)) {
      connection.listeners.set(event, new Set());
    }
    
    connection.listeners.get(event).add(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(key, event, callback) {
    const connection = this.connections.get(key);
    if (!connection || !connection.listeners.has(event)) return;

    connection.listeners.get(event).delete(callback);
  }

  /**
   * Emit event to listeners
   */
  emit(key, event, data = null) {
    const connection = this.connections.get(key);
    if (!connection || !connection.listeners.has(event)) return;

    connection.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${key}:${event}`, error);
      }
    });
  }

  /**
   * Check if connection is active
   */
  isConnected(key) {
    const connection = this.connections.get(key);
    return connection && connection.status === 'connected';
  }

  /**
   * Get connection status
   */
  getStatus(key) {
    const connection = this.connections.get(key);
    return connection ? connection.status : 'not_found';
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat(key) {
    this.stopHeartbeat(key);
    
    const timer = setInterval(() => {
      if (this.isConnected(key)) {
        this.send(key, { type: 'heartbeat', timestamp: Date.now() });
      } else {
        this.stopHeartbeat(key);
      }
    }, this.heartbeatInterval);
    
    this.heartbeatTimers.set(key, timer);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat(key) {
    const timer = this.heartbeatTimers.get(key);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(key);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect(key) {
    const attempts = this.reconnectAttempts.get(key) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      this.emit(key, 'max_reconnect_attempts');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
    this.reconnectAttempts.set(key, attempts + 1);

    setTimeout(() => {
      if (this.connections.has(key)) {
        this.connect(key);
      }
    }, delay);
  }

  /**
   * Simulate connection (replace with actual WebSocket/SSE implementation)
   */
  async simulateConnection(key) {
    return new Promise((resolve, reject) => {
      // Simulate network delay
      setTimeout(() => {
        // Simulate occasional connection failures
        if (Math.random() < 0.1) {
          reject(new Error('Connection failed'));
        } else {
          resolve();
        }
      }, 200 + Math.random() * 300);
    });
  }

  /**
   * Clean up all connections
   */
  cleanup() {
    this.connections.forEach((_, key) => {
      this.disconnect(key);
    });
    
    this.connections.clear();
    this.reconnectAttempts.clear();
    this.heartbeatTimers.clear();
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const stats = {
      totalConnections: this.connections.size,
      connectedCount: 0,
      disconnectedCount: 0,
      errorCount: 0,
      connections: {}
    };

    this.connections.forEach((connection, key) => {
      stats.connections[key] = {
        status: connection.status,
        lastActivity: connection.lastActivity,
        reconnectAttempts: this.reconnectAttempts.get(key) || 0
      };

      switch (connection.status) {
        case 'connected':
          stats.connectedCount++;
          break;
        case 'disconnected':
          stats.disconnectedCount++;
          break;
        case 'error':
          stats.errorCount++;
          break;
      }
    });

    return stats;
  }
}

// Singleton instance
const connectionManager = new ConnectionManager();

export default connectionManager;