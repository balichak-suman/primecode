import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const AIAssistant = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  const token = () => localStorage.getItem('token');
  const config = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  useEffect(() => {
    const seen = localStorage.getItem('primeai_onboarded');
    if (seen) setShowOnboarding(false);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  // Context-aware suggestion chips
  const getSuggestions = () => {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    const path = location.pathname;
    const isHR = ['HR', 'ADMIN'].includes(user?.role);
    const chips = [];

    if (hour < 11) chips.push('Mark attendance', "Today's schedule");
    if (day === 1) chips.push('Plan this week');
    if (new Date().getDate() >= 25) chips.push('View payslip', 'Check leave balance');

    if (path.includes('attendance')) chips.push('My attendance stats');
    else if (path.includes('leaves')) chips.push("How many leaves left?");
    else if (path.includes('payroll')) chips.push('Show latest payslip');

    if (isHR) chips.push("Who's on leave today?", 'Pending approvals');
    if (chips.length < 3) chips.push('What can you help with?', 'Check leave balance');

    return [...new Set(chips)].slice(0, 4);
  };

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => [...prev, { text: msg, isBot: false, time: new Date() }]);
    setIsTyping(true);

    try {
      const res = await axios.post(`${API_URL}/ai/query`, { query: msg }, config());
      const data = res.data;

      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { text: data.message, isBot: true, time: new Date(), type: data.type, data: data.data }]);

        // Auto-navigate
        if (data.type === 'navigate' && data.path) {
          setTimeout(() => navigate(data.path), 1200);
        }
      }, 600 + Math.random() * 800);
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, { text: 'Sorry, I encountered an error. Please try again.', isBot: true, time: new Date() }]);
    }
  };

  const handleOnboard = () => {
    setShowOnboarding(false);
    localStorage.setItem('primeai_onboarded', '1');
    setMessages([{ text: `Welcome, **${user?.name}**! 👋\n\nI'm **PrimeAI**, your HRMS assistant. I can help you with attendance, leaves, payroll, and more.\n\nTry asking me something!`, isBot: true, time: new Date() }]);
  };

  const formatMsg = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#00D2FF;text-decoration:underline">$1</a>');
  };

  const timeStr = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`ai-assistant-wrapper ${isOpen ? 'active' : ''}`}>
      {/* TRIGGER */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          width: '56px', height: '56px', borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, #7928CA, #00D2FF)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,210,255,0.4)', transition: 'all 0.3s',
          animation: 'float 3s ease-in-out infinite'
        }}>
          {/* Neural icon */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="1.5"/><circle cx="19" cy="5" r="1.5"/>
            <circle cx="5" cy="19" r="1.5"/><circle cx="19" cy="19" r="1.5"/>
            <line x1="12" y1="9" x2="12" y2="3"/><line x1="9.5" y1="10.5" x2="6" y2="6"/>
            <line x1="14.5" y1="10.5" x2="18" y2="6"/><line x1="9.5" y1="13.5" x2="6" y2="18"/>
            <line x1="14.5" y1="13.5" x2="18" y2="18"/>
          </svg>
        </button>
      )}

      {/* CHAT WINDOW */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          width: '380px', height: '520px', borderRadius: '20px',
          background: 'rgba(8,8,8,0.98)', border: '1px solid rgba(0,210,255,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {/* HEADER */}
          <div style={{
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(135deg, rgba(121,40,202,0.08), rgba(0,210,255,0.05))'
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #7928CA, #00D2FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              animation: 'pulse2 2s ease-in-out infinite'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="1.5"/><circle cx="19" cy="5" r="1.5"/>
                <circle cx="5" cy="19" r="1.5"/><circle cx="19" cy="19" r="1.5"/>
                <line x1="12" y1="9" x2="12" y2="3"/><line x1="9.5" y1="10.5" x2="6" y2="6"/>
                <line x1="14.5" y1="10.5" x2="18" y2="6"/><line x1="9.5" y1="13.5" x2="6" y2="18"/>
                <line x1="14.5" y1="13.5" x2="18" y2="18"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>PrimeAI</div>
              <div style={{ fontSize: '0.65rem', color: '#00D2FF', opacity: 0.7 }}>HRMS Assistant • Online</div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: '8px',
              width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem'
            }}>−</button>
          </div>

          {/* MESSAGES */}
          <div ref={chatRef} style={{
            flex: 1, overflowY: 'auto', padding: '16px', display: 'flex',
            flexDirection: 'column', gap: '12px'
          }}>
            {/* Onboarding */}
            {showOnboarding && messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', padding: '1rem' }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '16px',
                  background: 'linear-gradient(135deg, #7928CA, #00D2FF)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'pulse2 2s ease-in-out infinite'
                }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="1.5"/><circle cx="19" cy="5" r="1.5"/>
                    <circle cx="5" cy="19" r="1.5"/><circle cx="19" cy="19" r="1.5"/>
                    <line x1="12" y1="9" x2="12" y2="3"/><line x1="9.5" y1="10.5" x2="6" y2="6"/>
                    <line x1="14.5" y1="10.5" x2="18" y2="6"/><line x1="9.5" y1="13.5" x2="6" y2="18"/>
                    <line x1="14.5" y1="13.5" x2="18" y2="18"/>
                  </svg>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}>Hi, {user?.name?.split(' ')[0]}! 👋</h3>
                <p style={{ opacity: 0.5, fontSize: '0.8rem', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                  I'm <span style={{ color: '#00D2FF', fontWeight: 600 }}>PrimeAI</span>, your personal HRMS assistant. Try any of these:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  {["What's my attendance this month?", 'How many leaves do I have?', 'Show my latest payslip', "Who's on leave today?", 'What can you help with?'].map((cmd, i) => (
                    <button key={i} onClick={() => { handleOnboard(); setTimeout(() => handleSend(cmd), 400); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.7)', padding: '10px 14px', borderRadius: '10px',
                        cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,210,255,0.2)'; e.currentTarget.style.background = 'rgba(0,210,255,0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    >
                      <span style={{ opacity: 0.4 }}>→</span> {cmd}
                    </button>
                  ))}
                </div>
                <button onClick={handleOnboard} style={{
                  background: 'none', border: 'none', color: '#00D2FF', cursor: 'pointer',
                  fontSize: '0.7rem', opacity: 0.6, marginTop: '4px'
                }}>Skip intro →</button>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: m.isBot ? 'flex-start' : 'flex-end',
                animation: 'fadeIn 0.3s ease-out'
              }}>
                <div style={{ position: 'relative', maxWidth: '85%' }}>
                  {m.isBot && (
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '6px',
                      background: 'linear-gradient(135deg, #7928CA, #00D2FF)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '4px'
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </div>
                  )}
                  <div className="ai-msg-hover" style={{
                    padding: '10px 14px', borderRadius: m.isBot ? '4px 14px 14px 14px' : '14px 14px 4px 14px',
                    background: m.isBot ? 'rgba(121,40,202,0.12)' : 'rgba(0,210,255,0.12)',
                    border: `1px solid ${m.isBot ? 'rgba(121,40,202,0.15)' : 'rgba(0,210,255,0.15)'}`,
                    fontSize: '0.82rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.9)'
                  }} dangerouslySetInnerHTML={{ __html: formatMsg(m.text) }} />
                  <div className="msg-time" style={{
                    fontSize: '0.55rem', opacity: 0, marginTop: '2px',
                    textAlign: m.isBot ? 'left' : 'right', color: 'rgba(255,255,255,0.3)',
                    transition: 'opacity 0.2s', paddingLeft: m.isBot ? '4px' : 0
                  }}>{timeStr(m.time)}</div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '12px 18px', borderRadius: '4px 14px 14px 14px',
                  background: 'rgba(121,40,202,0.12)', border: '1px solid rgba(121,40,202,0.15)',
                  display: 'flex', gap: '5px', alignItems: 'center'
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '6px', height: '6px', borderRadius: '50%', background: '#00D2FF',
                      animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`
                    }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SUGGESTIONS */}
          {!showOnboarding && (
            <div style={{
              padding: '8px 16px', display: 'flex', gap: '6px', flexWrap: 'wrap',
              borderTop: '1px solid rgba(255,255,255,0.04)'
            }}>
              {getSuggestions().map((s, i) => (
                <button key={i} onClick={() => handleSend(s)} style={{
                  padding: '4px 10px', borderRadius: '12px', fontSize: '0.65rem',
                  background: 'rgba(0,210,255,0.06)', border: '1px solid rgba(0,210,255,0.12)',
                  color: 'rgba(0,210,255,0.7)', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,210,255,0.12)'; e.currentTarget.style.color = '#00D2FF'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,210,255,0.06)'; e.currentTarget.style.color = 'rgba(0,210,255,0.7)'; }}
                >{s}</button>
              ))}
            </div>
          )}

          {/* INPUT */}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{
            padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: '8px', alignItems: 'center'
          }}>
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ask PrimeAI anything..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '0.82rem',
                outline: 'none', transition: 'border 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,210,255,0.3)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <button type="submit" disabled={!input.trim()} style={{
              width: '36px', height: '36px', borderRadius: '10px', border: 'none',
              background: input.trim() ? 'linear-gradient(135deg, #7928CA, #00D2FF)' : 'rgba(255,255,255,0.05)',
              cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px); } }
        @keyframes pulse2 { 0%, 100% { box-shadow: 0 0 0 0 rgba(0,210,255,0.3); } 50% { box-shadow: 0 0 0 8px rgba(0,210,255,0); } }
        .ai-msg-hover:hover + .msg-time { opacity: 1 !important; }
      `}</style>
    </div>
  );
};

export default AIAssistant;
