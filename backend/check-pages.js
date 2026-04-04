const fs = require('fs');
const buffer = fs.readFileSync('/Users/balichaksuman/Desktop/primecode/primecode/backend/test_offer_letter.pdf');
const str = buffer.toString('utf8');
const count = (str.match(/\/Type\s*\/Page\b/g) || []).length;
console.log("Number of pages in generated PDF: " + count);
