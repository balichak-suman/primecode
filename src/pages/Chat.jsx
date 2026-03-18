import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

import { API_URL } from '../config/api';

const Chat = () => {
  const { user, socket } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (message) => {
        setMessages((prev) => [...prev, message]);
      });
    }

    return () => {
      if (socket) {
        socket.off('receive_message');
      }
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch history');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    socket.emit('send_message', {
      text: inputText,
      senderId: user.id
    });

    setInputText('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="chat-page">
      <h2 className="gradient-text" style={{ marginBottom: '2rem' }}>Team Collaboration</h2>
      
      <div className="glass-card chat-container" style={{ height: '70vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
        <div className="chat-messages" style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message-bubble ${msg.senderId === user.id ? 'own-message' : 'other-message'}`}
              style={{
                alignSelf: msg.senderId === user.id ? 'flex-end' : 'flex-start',
                maxWidth: '70%',
                padding: '0.8rem 1.2rem',
                borderRadius: '16px',
                background: msg.senderId === user.id ? 'var(--cyber-blue)' : 'rgba(255,255,255,0.05)',
                color: msg.senderId === user.id ? '#000' : '#fff',
                border: msg.senderId === user.id ? 'none' : '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <div style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: '0.3rem' }}>
                {msg.sender?.name || 'Unknown'}
              </div>
              <div>{msg.text}</div>
              <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '0.3rem', textAlign: 'right' }}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Type your message..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-glow" style={{ padding: '0.8rem 1.5rem' }}>Send</button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
