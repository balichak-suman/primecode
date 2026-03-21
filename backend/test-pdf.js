import fs from 'fs';
import path from 'path';

// Fix __dirname for ES Modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPdf() {
  try {
    const W = 595.28;
    const H = 841.89;
    const M = 40; 
    const CW = W - M * 2; 

    // Match exact logic of careers.js
    const logoPath = path.resolve('templates/logo.png');
    const signaturePath = path.resolve('templates/signature.png');
    const logoBuffer = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;
    const signatureBuffer = fs.existsSync(signaturePath) ? fs.readFileSync(signaturePath) : null;

    const PDFDocument = (await import('pdfkit')).default;

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    
    // Pipe to file
    const writeStream = fs.createWriteStream(path.join(__dirname, 'test_offer_letter.pdf'));
    doc.pipe(writeStream);

    doc.rect(0, 0, W, H).fill('white');

    // ═══ GEOMETRIC BORDER DECORATIONS ═══
    doc.rect(0, 0, 50, 50).fill('#0891b2');
    doc.rect(55, 0, 35, 35).fill('#f97316');
    doc.save().opacity(0.3);
    doc.polygon([0, 55], [50, 55], [0, 105]).fill('#0891b2');
    doc.restore();
    doc.save().opacity(0.15);
    doc.rect(55, 40, 25, 25).fill('#0891b2');
    doc.circle(110, 45, 18).fill('#f97316');
    doc.restore();
    doc.save().opacity(0.12);
    doc.polygon([95, 0], [160, 0], [160, 65]).fill('#94a3b8');
    doc.rect(0, 110, 40, 30).fill('#0891b2');
    doc.restore();

    doc.save().opacity(0.15);
    doc.polygon([W - 80, 0], [W, 0], [W, 80]).fill('#94a3b8');
    doc.circle(W - 30, 30, 25).fill('#0891b2');
    doc.restore();
    doc.save().opacity(0.2);
    doc.rect(W - 50, 60, 50, 30).fill('#f97316');
    doc.restore();

    doc.rect(0, H - 40, 60, 40).fill('#0891b2');
    doc.save().opacity(0.6);
    doc.polygon([65, H], [65, H - 50], [115, H]).fill('#f97316');
    doc.restore();
    doc.save().opacity(0.2);
    doc.polygon([0, H - 60], [40, H - 60], [0, H - 20]).fill('#94a3b8');
    doc.restore();

    doc.save().opacity(0.15);
    doc.polygon([W - 100, H], [W, H], [W, H - 100]).fill('#0891b2');
    doc.restore();
    doc.save().opacity(0.5);
    doc.polygon([W - 70, H], [W - 20, H], [W - 20, H - 50]).fill('#f97316');
    doc.restore();
    doc.rect(W - 140, H - 40, 40, 40).fill('#0891b2');

    let y = 70;

    // ═══ HEADER ═══
    if (logoBuffer) {
        doc.image(logoBuffer, M, y, { height: 28 });
    }
    doc.fontSize(10).fillColor('#666').text('www.primecode.in', M, y + 2, { width: CW, align: 'right' });
    doc.fontSize(8).fillColor('#aaa').text('Welcome to the future of tech.', M, y + 14, { width: CW, align: 'right' });
    y += 40;

    // ═══ TITLE ═══
    doc.fontSize(22).fillColor('#1a1a2e').font('Helvetica-Bold').text('OFFER OF EMPLOYMENT', M, y, { width: CW, align: 'center' });
    y += 24;
    const underlineW = 220;
    doc.moveTo(M + (CW - underlineW)/2, y).lineTo(M + (CW + underlineW)/2, y).lineWidth(3).strokeColor('#0891b2').stroke();
    y += 14;

    doc.fontSize(11).fillColor('#444').font('Helvetica').text(`[Balichak Suman]`, M, y);
    y += 14;
    doc.fontSize(10).fillColor('#888').text(`[Date: 21 March 2026]`, M, y);
    y += 20;

    doc.fontSize(11).fillColor('#333').font('Helvetica');
    doc.text('Dear ', M, y, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#0891b2').text('Balichak Suman', { continued: true });
    doc.font('Helvetica').fillColor('#333').text(',');
    y += 16;
    doc.fontSize(10).fillColor('#444').text(
        'Congratulations! We are thrilled to formally offer you the position of Student Intern(Marketing) at PrimeCode Solutions. We are impressed by your skills and potential, and we are confident you will be a vital asset to our team.',
        M, y, { width: CW, lineGap: 2 }
    );
    y = doc.y + 14;

    // ═══ ROLE OVERVIEW ═══
    doc.fontSize(11).fillColor('#0891b2').font('Helvetica-Bold').text('ROLE OVERVIEW:', M, y);
    y += 14;
    doc.roundedRect(M, y, CW, 50, 8).fillAndStroke('#f0f9ff', '#bae6fd');
    const roleY = y + 10;
    doc.fontSize(9).fillColor('#666').font('Helvetica-Bold');
    doc.text('Department:', M + 16, roleY);
    doc.fillColor('#1a1a2e').text('Marketing', M + 100, roleY);
    doc.fillColor('#666').text('Report To:', M + 16, roleY + 16);
    doc.fillColor('#1a1a2e').text('Suman', M + 100, roleY + 16);
    doc.fillColor('#666').text('Start Date:', CW / 2 + 20, roleY);
    doc.fillColor('#1a1a2e').text('Monday, 23 March 2026', CW / 2 + 80, roleY);
    y += 62;

    // ═══ COMPENSATION ═══
    doc.fontSize(11).fillColor('#7c3aed').font('Helvetica-Bold').text('COMPENSATION & BENEFITS:', M, y);
    y += 14;
    doc.roundedRect(M, y, CW, 38, 8).fillAndStroke('#faf5ff', '#e9d5ff');
    doc.fontSize(9).fillColor('#333').font('Helvetica');
    doc.text('Base Salary: ', M + 16, y + 10, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#0891b2').text('400008', { continued: true });
    doc.font('Helvetica').fillColor('#333').text(' per year, paid monthly.');
    doc.fontSize(8).fillColor('#666').text('Eligible for annual performance bonus of up to 15% of CTC.', M + 16, y + 24);
    y += 48;

    // ═══ KEY PERKS ═══
    doc.fontSize(11).fillColor('#b45309').font('Helvetica-Bold').text('KEY PERKS:', M, y);
    y += 14;
    const perks = [
        { icon: '·', label: 'Flexible / Hybrid\nWork' },
        { icon: '·', label: 'Health &\nWellness' },
        { icon: '·', label: 'Continuous\nLearning Fund' },
        { icon: '·', label: 'Career Growth\nOpportunities' }
    ];
    const perkW = (CW - 24) / 4;
    perks.forEach((p, i) => {
        const px = M + i * (perkW + 8);
        doc.roundedRect(px, y, perkW, 35, 6).fillAndStroke('#f0fdfa', '#ccfbf1');
        doc.fontSize(14).fillColor('#0891b2').text(p.icon, px, y + 4, { width: perkW, align: 'center' });
        doc.fontSize(7).fillColor('#444').font('Helvetica-Bold').text(
        p.label.replace('\n', ' '), px + 2, y + 16, { width: perkW - 4, align: 'center', lineGap: 1 }
        );
    });
    y += 45;

    // ═══ TERMS ═══
    doc.fontSize(11).fillColor('#1a1a2e').font('Helvetica-Bold').text('TERMS:', M, y);
    y += 14;
    doc.roundedRect(M, y, CW, 35, 6).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fontSize(8).fillColor('#555').font('Helvetica').text('Offer acceptance deadline: 7 days from the date of this letter. The company reserves the right to conduct background checks and professional verification. Please review all terms and conditions before accepting. We look forward to welcoming you to the PrimeCode family.', M + 14, y + 8, { width: CW - 28, lineGap: 1 });
    y = Math.max(doc.y + 12, y + 42);

    // ═══ ACCEPTANCE ═══
    doc.fontSize(9).fillColor('#1a1a2e').font('Helvetica-Bold');
    doc.text('ACCEPTANCE:', M, y);
    y += 18;

    const rightAlign = W - M - 140;

    doc.moveTo(M, y + 30).lineTo(M + 140, y + 30).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
    doc.moveTo(rightAlign, y + 30).lineTo(W - M, y + 30).lineWidth(0.5).stroke();
    
    if (signatureBuffer) {
        doc.image(signatureBuffer, rightAlign + 10, y - 10, { height: 34 });
    }
    y += 34;
    doc.fontSize(8).fillColor('#888').font('Helvetica');
    doc.text('Candidate Signature', M, y);
    doc.font('Helvetica-Bold').fillColor('#1a1a2e').text('Balichak Suman', rightAlign, y, { width: 140, align: 'center' });
    y += 12;
    doc.font('Helvetica').fillColor('#888');
    doc.text('Date, Print Name', M, y);
    doc.text('Founder & CEO', rightAlign, y, { width: 140, align: 'center' });
    y += 24;

    // ═══ FOOTER ═══
    doc.moveTo(M, y).lineTo(W - M, y).lineWidth(1).strokeColor('#e2e8f0').stroke();
    y += 12;
    if (logoBuffer) {
        doc.image(logoBuffer, M, y, { height: 20 });
    }
    doc.fontSize(9).fillColor('#888').text('www.primecode.in', M, y + 26);
    doc.fontSize(9).fillColor('#888').font('Helvetica-Oblique').text('Welcome to the future of tech.', M, y, { width: CW, align: 'right' });

    doc.end();

    writeStream.on('finish', () => {
      console.log('PDF saved to test_offer_letter.pdf');
    });

  } catch (err) {
    console.error('PDF Generation Error:', err);
  }
}

testPdf();
