const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error("No index.html found. Please run this after 'npm run build'.");
  process.exit(1);
}

const originalHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Define specific routes to pre-render with custom Open Graph tags
const customRoutes = {
  'openings': {
    title: 'PrimeCode Careers | Join the Future of Tech',
    description: 'Explore exciting career opportunities at PrimeCode. Join our elite engineering team and build next-generation digital platforms.',
    image: '',
    url: 'https://primecode.in/openings'
  },
  'about': {
     title: 'About PrimeCode | Engineering Excellence',
     description: 'Learn about PrimeCode, our mission, and our elite team of engineers.',
     image: '',
     url: 'https://primecode.in/about'
  }
};

Object.entries(customRoutes).forEach(([route, meta]) => {
  const routeDir = path.join(distDir, route);
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }

  // Replace meta tags
  let newHtml = originalHtml;
  newHtml = newHtml.replace(/<title>.*?<\/title>/, `<title>${meta.title}</title>`);
  newHtml = newHtml.replace(/<meta property="og:title" content=".*?"\s*\/>/, `<meta property="og:title" content="${meta.title}" />`);
  newHtml = newHtml.replace(/<meta property="og:description" content=".*?"\s*\/>/, `<meta property="og:description" content="${meta.description}" />`);
  newHtml = newHtml.replace(/<meta name="description" content=".*?"\s*\/>/, `<meta name="description" content="${meta.description}" />`);
  newHtml = newHtml.replace(/<meta property="og:url" content=".*?"\s*\/>/, `<meta property="og:url" content="${meta.url}" />`);
  
  if (meta.image) {
    newHtml = newHtml.replace(/<meta property="og:image" content=".*?"\s*\/>/, `<meta property="og:image" content="${meta.image}" />`);
  } else {
    // Remove it entirely so fallback is used
    newHtml = newHtml.replace(/<meta property="og:image" content=".*?"\s*\/>/, '');
  }

  // Also replace any static path resolution issues (Vite handles this mostly if base is "/")
  const destPath = path.join(routeDir, 'index.html');
  fs.writeFileSync(destPath, newHtml, 'utf8');
  console.log(`Generated static SEO HTML for /${route} -> ${destPath}`);
});
