/**
 * Werewolf Network Manager - Quản lý phòng chơi Đa thiết bị (Multi-Device)
 * Hỗ trợ WebRTC P2P (PeerJS) và fallback BroadcastChannel cho mạng nội bộ/offline.
 */

class WerewolfNetworkManager {
  constructor() {
    this.peer = null;
    this.role = null; // 'host' | 'client'
    this.roomCode = null;
    this.roomPassword = '';
    this.localPlayerId = null;
    this.localPlayerName = '';
    
    // Host state: Danh sách kết nối của các client { [peerId]: { conn, name, id } }
    this.clients = {};
    
    // Client state: Kết nối tới Host
    this.hostConn = null;

    // Fallback BroadcastChannel cho tab cùng trình duyệt / offline testing
    this.broadcastChannel = null;

    // Event listeners callback
    this.listeners = {
      onPlayerJoined: null,
      onPlayerLeft: null,
      onJoinAccepted: null,
      onJoinRejected: null,
      onGameStarted: null,
      onNightStepReceived: null,
      onNightActionReceived: null,
      onMorningSyncReceived: null,
      onTimerSyncReceived: null,
      onError: null
    };
  }

  on(event, callback) {
    if (this.listeners[event] !== undefined) {
      this.listeners[event] = callback;
    }
  }

  emit(event, data) {
    if (typeof this.listeners[event] === 'function') {
      this.listeners[event](data);
    }
  }

  /**
   * Tạo phòng làm Máy Chủ / Quản Trò (Host)
   */
  createRoom(roomCode, password = '') {
    return new Promise((resolve, reject) => {
      this.role = 'host';
      this.roomCode = roomCode.toUpperCase().trim();
      this.roomPassword = password;
      this.clients = {};

      // Fallback BroadcastChannel
      try {
        if (window.BroadcastChannel) {
          this.broadcastChannel = new BroadcastChannel(`werewolf_room_${this.roomCode}`);
          this.broadcastChannel.onmessage = (e) => this.handleHostMessage(e.data, 'broadcast');
        }
      } catch (e) {}

      // Khởi tạo PeerJS
      const peerId = `werewolf-room-${this.roomCode.toLowerCase()}`;
      
      if (typeof Peer === 'undefined') {
        console.warn("PeerJS chưa tải xong, sử dụng BroadcastChannel fallback.");
        resolve({ roomCode: this.roomCode, peerId: 'local' });
        return;
      }

      this.peer = new Peer(peerId, {
        debug: 1
      });

      this.peer.on('open', (id) => {
        console.log("Host Peer đã mở thành công:", id);
        this.setupHostListeners();
        resolve({ roomCode: this.roomCode, peerId: id });
      });

      this.peer.on('error', (err) => {
        console.warn("PeerJS host error:", err);
        // Nếu ID đã tồn tại hoặc lỗi mạng, vẫn giải quyết bằng BroadcastChannel
        resolve({ roomCode: this.roomCode, peerId: 'local' });
      });
    });
  }

  setupHostListeners() {
    if (!this.peer) return;

    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        console.log("Client mới kết nối:", conn.peer);
      });

      conn.on('data', (data) => {
        this.handleHostMessage(data, conn);
      });

      conn.on('close', () => {
        this.handleClientDisconnect(conn.peer);
      });
    });
  }

  handleHostMessage(msg, senderConn) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'CLIENT_JOIN_REQUEST':
        this.handleClientJoinRequest(msg.data, senderConn);
        break;
      case 'CLIENT_NIGHT_ACTION':
        this.emit('onNightActionReceived', msg.data);
        break;
      default:
        break;
    }
  }

  handleClientJoinRequest(data, senderConn) {
    const { name, password, clientId } = data;

    // Kiểm tra mật khẩu phòng nếu có
    if (this.roomPassword && this.roomPassword !== password) {
      this.sendToConn(senderConn, {
        type: 'JOIN_REJECTED',
        data: { reason: 'Mật khẩu phòng không chính xác!' }
      });
      return;
    }

    // Đăng ký client mới
    const assignedId = Object.keys(this.clients).length + 1;
    const clientKey = senderConn === 'broadcast' ? clientId : senderConn.peer;

    this.clients[clientKey] = {
      id: assignedId,
      name: name || `Người chơi ${assignedId}`,
      conn: senderConn,
      key: clientKey
    };

    // Phản hồi chấp thuận cho Client
    this.sendToConn(senderConn, {
      type: 'JOIN_ACCEPTED',
      data: {
        playerId: assignedId,
        playerName: name,
        roomCode: this.roomCode
      }
    });

    // Thông báo cho giao diện Host
    this.emit('onPlayerJoined', {
      playerId: assignedId,
      playerName: name,
      totalConnected: Object.keys(this.clients).length,
      clientsList: Object.values(this.clients).map(c => ({ id: c.id, name: c.name }))
    });

    // Phát danh sách mới cho tất cả các máy con
    this.broadcastToClients({
      type: 'ROOM_PLAYERS_UPDATE',
      data: {
        players: Object.values(this.clients).map(c => ({ id: c.id, name: c.name }))
      }
    });
  }

  handleClientDisconnect(clientKey) {
    if (this.clients[clientKey]) {
      const p = this.clients[clientKey];
      delete this.clients[clientKey];
      this.emit('onPlayerLeft', {
        playerId: p.id,
        playerName: p.name,
        totalConnected: Object.keys(this.clients).length
      });
    }
  }

  /**
   * Tham gia phòng làm Người Chơi (Client)
   */
  joinRoom(roomCode, playerName, password = '') {
    return new Promise((resolve, reject) => {
      this.role = 'client';
      this.roomCode = roomCode.toUpperCase().trim();
      this.localPlayerName = playerName;
      this.roomPassword = password;
      const localId = 'client_' + Math.random().toString(36).substring(2, 9);

      // Fallback BroadcastChannel
      try {
        if (window.BroadcastChannel) {
          this.broadcastChannel = new BroadcastChannel(`werewolf_room_${this.roomCode}`);
          this.broadcastChannel.onmessage = (e) => this.handleClientMessage(e.data);
          
          // Gửi yêu cầu qua BroadcastChannel dự phòng
          setTimeout(() => {
            this.broadcastChannel.postMessage({
              type: 'CLIENT_JOIN_REQUEST',
              data: { name: playerName, password: password, clientId: localId }
            });
          }, 300);
        }
      } catch (e) {}

      if (typeof Peer === 'undefined') {
        resolve({ role: 'client', roomCode: this.roomCode });
        return;
      }

      this.peer = new Peer({ debug: 1 });

      this.peer.on('open', (id) => {
        const hostPeerId = `werewolf-room-${this.roomCode.toLowerCase()}`;
        this.hostConn = this.peer.connect(hostPeerId);

        this.hostConn.on('open', () => {
          this.hostConn.send({
            type: 'CLIENT_JOIN_REQUEST',
            data: { name: playerName, password: password, clientId: id }
          });
        });

        this.hostConn.on('data', (data) => {
          this.handleClientMessage(data);
        });

        resolve({ role: 'client', roomCode: this.roomCode });
      });

      this.peer.on('error', (err) => {
        console.warn("PeerJS client connect warning:", err);
        resolve({ role: 'client', roomCode: this.roomCode });
      });
    });
  }

  handleClientMessage(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'JOIN_ACCEPTED':
        this.localPlayerId = msg.data.playerId;
        this.emit('onJoinAccepted', msg.data);
        break;
      case 'JOIN_REJECTED':
        this.emit('onJoinRejected', msg.data);
        break;
      case 'ROOM_PLAYERS_UPDATE':
        this.emit('onPlayerJoined', msg.data);
        break;
      case 'GAME_STARTED_CLIENT':
        this.emit('onGameStarted', msg.data);
        break;
      case 'NIGHT_STEP_CLIENT':
        this.emit('onNightStepReceived', msg.data);
        break;
      case 'MORNING_SYNC_CLIENT':
        this.emit('onMorningSyncReceived', msg.data);
        break;
      case 'TIMER_SYNC_CLIENT':
        this.emit('onTimerSyncReceived', msg.data);
        break;
      default:
        break;
    }
  }

  /**
   * Host gửi lệnh / dữ liệu cho 1 Client cụ thể
   */
  sendToConn(conn, payload) {
    if (conn === 'broadcast') {
      if (this.broadcastChannel) this.broadcastChannel.postMessage(payload);
    } else if (conn && conn.open) {
      conn.send(payload);
    }
  }

  /**
   * Host phát sóng dữ liệu cho TẤT CẢ các máy con
   */
  broadcastToClients(payload) {
    // 1. BroadcastChannel
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(payload);
    }
    // 2. WebRTC DataChannels
    for (const clientKey of Object.keys(this.clients)) {
      const client = this.clients[clientKey];
      if (client.conn && client.conn !== 'broadcast' && client.conn.open) {
        client.conn.send(payload);
      }
    }
  }

  /**
   * Client gửi hành động ban đêm về máy Host
   */
  sendNightActionToHost(actionData) {
    const payload = {
      type: 'CLIENT_NIGHT_ACTION',
      data: {
        playerId: this.localPlayerId,
        playerName: this.localPlayerName,
        ...actionData
      }
    };

    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send(payload);
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(payload);
    }
  }
}

// Khởi tạo global instance
window.networkManager = new WerewolfNetworkManager();
