import axios from 'axios';
import 'dotenv/config';

async function testEmail() {
  try {
    const pdfBase64 = "JVBERi0xLjMKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeAEr5QAAAyQCMQplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKMTUKZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAzIDAgUiAvUmVzb3VyY2VzIDYgMCBSIC9Db250ZW50cyA0IDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUuMjggODQxLjg5XSA+PgplbmRvYmoKNiAwIG9iago8PCAvUHJvY1NldCBbL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSV0gL0ZvbnQgPDwgL0YxIDcgMCBSID4+ID4+CmVuZG9iago3IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKMyAwIG9iago8PCAvVHlwZSAvUGFnZXMgL0tjb3VudCAxIC9LaWRzIFsyIDAgUl0gPj4KZW5kb2JqCjEgMCBvYmoKPDwgL1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDMgMCBSID4+CmVuZG9iagowIDAgb2JqCjw8IC9DcmVhdG9yICgqKikgL1Byb2R1Y2VyICgqKikgL0NyZWF0aW9uRGF0ZSAoKikgPj4KZW5kb2JqCnhyZWYKMCA4CjAwMDAwMDAyNjAgMDAwMDAgbiAKMDAwMDAwMDIxMSAwMDAwMCBuIAowMDAwMDAwMDc0IDAwMDAwIG4gCjAwMDAwMDAxNTIgMDAwMDAgbiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDU0IDAwMDAwIG4gCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMTAwMCAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDggL1Jvb3QgMSAwIFIgL0luZm8gMCAwIFIgPj4Kc3RhcnR4cmVmCjMyNQolJUVPRgo=";

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'PrimeCode Careers', email: process.env.SENDER_EMAIL || 'balichaksumann@gmail.com' },
        to: [{ email: 'balichaksumann@gmail.com', name: 'Test' }],
        subject: 'Test PDF Attachment',
        htmlContent: '<p>Attached</p>',
        attachment: [{
          content: pdfBase64,
          name: `Test_Offer.pdf`
        }]
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Email sent successfully');
  } catch (err) {
    console.error('Email error:', err.response?.data || err.message);
  }
}
testEmail();
