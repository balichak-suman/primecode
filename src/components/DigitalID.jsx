import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, X, ShieldCheck, Zap } from 'lucide-react';

const DigitalID = ({ employee, onClose }) => {
  if (!employee) return null;
  const cardRef = useRef(null);

  const qrValue = `PRIME-VERIFY-${employee.employeeId || employee.id}-${employee.email}`;

  const downloadID = () => {
    // In a real app, we'd use html2canvas here. 
    // For now, we simulate the 'Save as Image' trigger.
    alert('Identity Node Exporting to PNG...');
    // Implementation would be: 
    // html2canvas(cardRef.current).then(canvas => ...)
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="id-card-wrapper reveal" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        
        <div className="cyber-id-card" ref={cardRef}>
          {/* GLOW OVERLAYS */}
          <div className="card-glow top-left"></div>
          <div className="card-glow bottom-right"></div>
          <div className="scan-line"></div>

          <div className="card-inner">
            <div className="card-header">
              <div className="brand-suite">
                <h2 className="logo-text">PRIMECODE</h2>
                <div className="security-tag"><ShieldCheck size={12} /> SECURED NODE</div>
              </div>
              <div className="chip-set">
                 <Zap size={24} fill="currentColor" />
                 <div className="chip-lines"></div>
              </div>
            </div>

            <div className="card-body">
              <div className="photo-sector">
                <div className="biometric-frame">
                   <div className="initials">{employee.name.charAt(0)}</div>
                   <div className="scanner-overlay"></div>
                </div>
              </div>

              <div className="data-sector">
                <div className="identity-block">
                   <h3 className="name-display">{employee.name}</h3>
                   <p className="designation-display">{employee.designation}</p>
                </div>

                <div className="meta-grid">
                   <div className="meta-item">
                      <label>ACCESS ID</label>
                      <span>{employee.employeeId || `PC${employee.id.toString().padStart(3, '0')}`}</span>
                   </div>
                   <div className="meta-item">
                      <label>ROLE LEVEL</label>
                      <span>{employee.role}</span>
                   </div>
                   <div className="meta-item">
                      <label>JOINED</label>
                      <span>{new Date(employee.createdAt).getFullYear()}</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="card-footer">
               <div className="qr-wrapper">
                 <QRCodeSVG 
                    value={qrValue} 
                    size={70} 
                    bgColor={"transparent"}
                    fgColor={"#00D2FF"}
                    level={"H"}
                 />
                 <div className="qr-corners"></div>
               </div>
               <div className="rights-block">
                  <p>AUTHORIZED ENTITY</p>
                  <div className="barcode"></div>
                  <span className="version">v2.0.Cyber</span>
               </div>
            </div>
          </div>
        </div>

        <div className="action-bar" style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
          <button className="btn-glow" onClick={downloadID} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Download size={18} /> Export PNG
          </button>
          <button className="btn-outline" onClick={onClose}>Terminate Access</button>
        </div>
      </div>

      <style>{`
        .id-card-wrapper { padding: 40px; }
        .cyber-id-card { 
          width: 420px; 
          height: 260px; 
          background: #080808; 
          border: 1px solid rgba(0,210,255,0.3);
          border-radius: 20px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 0 50px rgba(0,210,255,0.1);
          color: #fff;
          font-family: 'Inter', sans-serif;
        }

        .card-inner { padding: 25px; position: relative; z-index: 2; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }
        
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .logo-text { margin: 0; font-size: 1.2rem; letter-spacing: 4px; color: #00D2FF; font-weight: 800; }
        .security-tag { font-size: 0.6rem; opacity: 0.5; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
        .chip-set { color: #7928CA; position: relative; }
        
        .card-body { display: flex; gap: 20px; flex: 1; }
        .biometric-frame { 
          width: 90px; 
          height: 90px; 
          background: rgba(255,255,255,0.03); 
          border: 1px solid rgba(0,210,255,0.2); 
          border-radius: 12px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .initials { font-size: 2.5rem; font-weight: bold; color: rgba(255,255,255,0.1); }
        
        .name-display { margin: 0; font-size: 1.4rem; color: #fff; }
        .designation-display { margin: 0 0 15px 0; font-size: 0.75rem; color: #00D2FF; opacity: 0.8; }
        
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .meta-item label { display: block; font-size: 0.55rem; opacity: 0.4; margin-bottom: 2px; }
        .meta-item span { font-size: 0.7rem; font-weight: 600; }

        .card-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; }
        .qr-wrapper { background: rgba(0,210,255,0.05); padding: 8px; border-radius: 8px; border: 1px solid rgba(0,210,255,0.1); position: relative; }
        .rights-block { text-align: right; }
        .rights-block p { margin: 0; font-size: 0.5rem; opacity: 0.4; letter-spacing: 1px; }
        .barcode { height: 15px; width: 80px; background: repeating-linear-gradient(90deg, #fff, #fff 1px, transparent 1px, transparent 3px); margin: 5px 0; opacity: 0.3; }
        .version { font-size: 0.5rem; opacity: 0.2; }

        .card-glow { position: absolute; width: 200px; height: 200px; border-radius: 50%; filter: blur(60px); z-index: 1; }
        .top-left { top: -100px; left: -100px; background: rgba(121, 40, 202, 0.2); }
        .bottom-right { bottom: -100px; right: -100px; background: rgba(0, 210, 255, 0.2); }

        .scan-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: rgba(0, 210, 255, 0.5);
          top: 0;
          z-index: 3;
          animation: scan 3s linear infinite;
          box-shadow: 0 0 12px rgba(0, 210, 255, 0.5);
        }

        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default DigitalID;
