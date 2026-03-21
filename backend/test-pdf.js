import fs from 'fs';
import path from 'path';

async function testPdf() {
  try {
    const W = 595.28;
    const H = 841.89;
    const M = 50; 
    const CW = W - M * 2; 

    const logoPath = path.resolve('templates/logo.png');
    const signaturePath = path.resolve('templates/signature.png');
    const logoBuffer = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;
    const signatureBuffer = fs.existsSync(signaturePath) ? fs.readFileSync(signaturePath) : null;
    console.log('Logo loaded:', !!logoBuffer);
    console.log('Signature loaded:', !!signatureBuffer);

    // This is exactly how careers.js does it
    const PDFDocument = (await import('pdfkit')).default;

    const pdfBase64 = await new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
        doc.on('error', reject);

        doc.rect(0, 0, 50, 50).fill('#0891b2');
        doc.rect(55, 0, 35, 35).fill('#f97316');
        
        let y = M;
        if (logoBuffer) {
            doc.image(logoBuffer, M, y, { height: 30 });
        }
        
        doc.fontSize(9).fillColor('#888').text('www.primecode.in', M, y, { width: CW, align: 'right' });
        doc.fontSize(26).fillColor('#1a1a2e').font('Helvetica-Bold').text('OFFER OF EMPLOYMENT', M, y + 50);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    console.log('PDF generated successfully, base64 length:', pdfBase64.length);
  } catch (err) {
    console.error('PDF Generation Error:', err);
  }
}

testPdf();
