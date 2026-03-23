import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { API_URL } from '../config/api';
import logoPng from '../assets/logo.png';
import '../index.css';

export default function AcceptOffer() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No offer token found in the URL. Please use the exact link provided in your email.');
    }
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await axios.post(`${API_URL}/careers/confirm-offer`, { token });
      if (response.data.success) {
        setStatus('success');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.response?.data?.error || 'Failed to confirm offer. Please try again or contact HR.');
    }
  };

  return (
    <div className="accept-offer-page" style={{ 
      minHeight: '100vh', 
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <Helmet>
        <title>Accept Offer | PrimeCode</title>
      </Helmet>

      <div style={{
        background: '#fff',
        padding: '3rem',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        borderTop: '6px solid #0891b2'
      }}>
        <img 
          src={logoPng} 
          alt="PrimeCode" 
          style={{ height: '40px', marginBottom: '2rem', cursor: 'pointer' }} 
          onClick={() => navigate('/')}
        />

        {status === 'idle' && (
          <>
            <h1 style={{ fontSize: '1.75rem', color: '#1a1a2e', marginBottom: '1rem' }}>
              Offer of Employment
            </h1>
            <p style={{ color: '#64748b', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              By clicking the button below, you officially accept the offer of employment from PrimeCode Solutions. A countersigned PDF with your exact typed signature will be securely generated and emailed to your inbox.
            </p>
            <button 
              onClick={handleAccept}
              style={{
                background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
                color: '#fff',
                border: 'none',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                borderRadius: '8px',
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Electronically Sign & Accept
            </button>
          </>
        )}

        {status === 'loading' && (
          <div style={{ padding: '2rem 0' }}>
            <div className="spinner" style={{ 
              width: '40px', height: '40px', border: '4px solid #e2e8f0', 
              borderTopColor: '#0891b2', borderRadius: '50%', margin: '0 auto',
              animation: 'spin 1s linear infinite' 
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: '#64748b', marginTop: '1.5rem', fontWeight: '500' }}>
              Finalizing your secure digital signature...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ 
              width: '60px', height: '60px', background: '#dcfce7', color: '#16a34a',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 1.5rem auto'
            }}>✓</div>
            <h2 style={{ color: '#1a1a2e', marginBottom: '1rem' }}>Offer Accepted!</h2>
            <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '2rem' }}>
              Congratulations! Your acceptance has been officially recorded. Please check your email inbox for your finalized countersigned Offer Letter PDF.
            </p>
            <button 
              onClick={() => navigate('/')}
              style={{
                background: '#f1f5f9', color: '#475569', border: 'none', padding: '0.75rem 1.5rem',
                borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Return to Homepage
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ 
              width: '60px', height: '60px', background: '#fee2e2', color: '#dc2626',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 1.5rem auto'
            }}>!</div>
            <h2 style={{ color: '#1a1a2e', marginBottom: '1rem' }}>Verification Failed</h2>
            <p style={{ color: '#dc2626', lineHeight: '1.6', marginBottom: '2rem', padding: '1rem', background: '#fef2f2', borderRadius: '8px' }}>
              {errorMessage}
            </p>
            <button 
              onClick={() => navigate('/careers')}
              style={{
                background: '#f1f5f9', color: '#475569', border: 'none', padding: '0.75rem 1.5rem',
                borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Back to Careers
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
        &copy; {new Date().getFullYear()} PrimeCode Solutions. All rights reserved.
      </div>
    </div>
  );
}
