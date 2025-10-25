# A2Agents Website

Official website for A2Agents consulting practice - Human Excellence meets AI Transformation.

## 🚀 Tech Stack

- **HTML5** - Semantic markup for accessibility and SEO
- **Tailwind CSS** - Utility-first styling with warm color palette
- **Vanilla JavaScript** - Minimal, fast interactions (no framework overhead)
- **GitHub Pages** - Static site hosting with custom domain
- **GitHub Actions** - Automated build and deployment pipeline

## 📦 Local Development

### Prerequisites
- Node.js 20+ installed
- Git configured

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/a2agents-website.git
cd a2agents-website

# Install dependencies
npm install
```

### Development Mode
```bash
# Start Tailwind CSS in watch mode
npm run dev

# In another terminal, serve the dist folder (optional)
npm run serve

# Or simply open dist/index.html in your browser
```

The site will rebuild automatically when you make changes to:
- `src/index.html` - Main page structure and content
- `src/css/input.css` - Custom CSS additions
- `tailwind.config.js` - Theme configuration

### Production Build
```bash
# Build for production (minified CSS)
npm run build

# Output goes to dist/ folder
```

## 🚀 Deployment

Deployment is **automatic** via GitHub Actions:

1. Make your changes in the `src/` folder
2. Commit and push to `main` branch
3. GitHub Actions automatically:
   - Installs dependencies
   - Builds Tailwind CSS (minified)
   - Copies all assets to `dist/`
   - Deploys to GitHub Pages
4. Site updates live at https://a2agents.com in ~2-3 minutes

### Manual Deployment
If you need to trigger deployment manually:
1. Go to Actions tab in GitHub
2. Select "Build and Deploy to GitHub Pages"
3. Click "Run workflow"

## 📁 Project Structure

```
a2agents-website/
├── src/                       # Source files (edit these)
│   ├── index.html            # Main page with Tailwind classes
│   ├── css/
│   │   └── input.css         # Tailwind imports + custom CSS
│   └── js/                   # JavaScript files
│       ├── main.js           # Core functionality
│       └── network-viz.js    # Phase 3 visualization
├── dist/                     # Built files (auto-generated, don't edit)
│   ├── index.html
│   ├── styles.css           # Compiled Tailwind CSS
│   └── js/
├── assets/                   # Static assets
│   └── images/              # Image files
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions deployment
├── tailwind.config.js       # Tailwind configuration
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## 🎨 Design System

### Color Palette
The site uses a warm, earthy color palette defined in `tailwind.config.js`:

- **Primary** - Warm terra cotta tones (`primary-50` to `primary-950`)
- **Secondary** - Soft warm grays (`secondary-50` to `secondary-950`)
- **Warm** - Additional warm accent colors

### Typography
- **Headings** - Serif font for warmth and sophistication
- **Body** - System font stack for optimal readability
- **Sizes** - Responsive scaling with mobile-first approach

### Components
Custom component classes defined in `src/css/input.css`:
- `.btn-primary` - Primary action buttons
- `.btn-secondary` - Secondary buttons
- `.card` - Content cards with subtle borders
- `.section-container` - Consistent section spacing

## 📝 Content Editing

See [EDITING.md](./EDITING.md) for detailed instructions on:
- Making content changes with Claude Code
- Understanding the placeholder system
- Common editing tasks
- Tailwind class reference

## 🚦 Phase Roadmap

### Phase 1 (Days 1-2) ✅
- Infrastructure setup
- Tailwind configuration
- Basic HTML structure
- GitHub Actions deployment

### Phase 2 (Days 3-4) - Content & Polish
- Replace all `[CONTENT: ...]` placeholders
- Add actual copy and messaging
- Fine-tune responsive design
- Add micro-interactions

### Phase 3 (Days 5-7) - Interactive Features
- Obsidian-style network visualization
- Enhanced animations
- Performance optimizations
- Form backend integration

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Tailwind in watch mode for development |
| `npm run build` | Build production CSS and copy assets |
| `npm run copy-assets` | Copy HTML and JS files to dist |
| `npm run serve` | Serve the dist folder locally |

## 🌐 Browser Support

The site is optimized for modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## ⚡ Performance

Target metrics:
- **First Contentful Paint**: < 1s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: 95+

## 🔧 Troubleshooting

### Build Issues
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Ensure Node.js 20+ is installed: `node --version`

### Deployment Issues
- Check GitHub Actions tab for build logs
- Verify GitHub Pages is enabled in repository settings
- Ensure custom domain is configured correctly

### Local Development
- If changes aren't showing, hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
- Check that `npm run dev` is running in terminal
- Verify you're editing files in `src/` not `dist/`

## 📄 License

© 2024 A2Agents. All rights reserved.

## 🤝 Contributing

This is a private repository for A2Agents. For questions or issues:
- Use Claude Code for content updates
- Contact Kevin for strategic changes
- Check [EDITING.md](./EDITING.md) for editing guidelines

---

Built with intention, designed for humans, powered by modern web standards.
