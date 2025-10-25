# Editing the A2Agents Website with Claude Code

This guide helps non-technical team members edit the A2Agents website using Claude Code's natural language capabilities.

## 🚀 Quick Start

### Option 1: Claude Code CLI (Recommended)
```bash
cd a2agents.com
claude-code

# Then give natural language instructions like:
# "Change the hero tagline to 'Building Better Teams Through AI'"
# "Make the contact form button warm orange instead of the current color"
# "Add more padding to the About section"
```

### Option 2: Manual Editing with Claude
1. Open `src/index.html` in your text editor
2. Open Claude in your browser
3. Ask Claude for the specific changes you want
4. Copy/paste the code Claude provides

## 📝 Common Editing Tasks

### Changing Text Content

All content is marked with `[CONTENT: ...]` placeholders in `src/index.html`.

**Example Instructions for Claude Code:**
- "Change the hero tagline to 'Building Better Teams Through AI'"
- "Update the about section with Kevin's new bio"
- "Replace the industries we serve with Technology, Healthcare, and Finance"

**What Claude will do:**
```html
<!-- Before -->
<h1>[CONTENT: "a Human Layer for the AI Era"]</h1>

<!-- After -->
<h1>Building Better Teams Through AI</h1>
```

### Changing Colors

The site uses a warm color palette. You can reference colors by their semantic names.

**Example Instructions:**
- "Make all buttons use the warmer orange color"
- "Change the hero background to a lighter shade"
- "Make the text darker for better contrast"

**Color names you can use:**
- `primary` - Terra cotta/warm orange tones
- `secondary` - Warm gray tones
- `warm` - Additional warm accent colors
- `gray` - Standard grays

### Changing Spacing

Tailwind uses a numeric scale for spacing (padding/margin).

**Example Instructions:**
- "Add more space between all sections"
- "Reduce the padding in the contact form"
- "Make the hero section taller"

**Spacing scale:** 
- Small: 2, 4, 6, 8
- Medium: 12, 16, 20, 24
- Large: 32, 40, 48, 56, 64

### Changing Layout

**Example Instructions:**
- "Make the industries section show 4 columns on desktop"
- "Stack the service cards vertically on mobile"
- "Center the about section content"

## 🎨 Understanding the Structure

### Section Identification

Each section has a clear comment and semantic HTML:

```html
<!-- HERO SECTION -->
<section class="...">

<!-- THE PROBLEM -->
<section class="...">

<!-- WHAT WE DO -->
<section class="...">

<!-- SERVICE DETAILS -->
<section class="...">

<!-- WHY BOTH? -->
<section class="...">

<!-- INDUSTRIES -->
<section class="...">

<!-- ABOUT -->
<section class="...">

<!-- FEATURED CONTENT -->
<section class="...">

<!-- HOW WE WORK -->
<section class="...">

<!-- CONTACT -->
<section id="contact" class="...">
```

**How to reference sections:**
- "In the hero section..."
- "Update the contact section..."
- "Change the about section..."

## 🛠️ Tailwind Classes Quick Reference

### Text Styling
```
text-sm/base/lg/xl/2xl/3xl/4xl/5xl - Font sizes
font-normal/medium/bold - Font weight
text-gray-900/700/500 - Text colors
text-center/left/right - Text alignment
```

### Spacing
```
p-4 - Padding all sides
px-4 - Padding horizontal
py-4 - Padding vertical
m-4 - Margin all sides
space-y-4 - Vertical gap between children
```

### Layout
```
flex - Flexbox container
grid - Grid container
grid-cols-2/3/4 - Number of columns
items-center - Vertical centering
justify-center - Horizontal centering
```

### Responsive Prefixes
```
md:text-4xl - Applies on medium+ screens (768px+)
lg:grid-cols-3 - Applies on large+ screens (1024px+)
```

### Colors
```
bg-primary-600 - Background color
text-primary-600 - Text color
border-primary-600 - Border color
```

## 💡 Tips for Clear Instructions

### Be Specific
✅ "Change the hero headline to 'Empowering Teams with AI'"
❌ "Update the title"

### Reference Sections
✅ "In the About section, change Kevin's bio to..."
❌ "Change the bio"

### Use Relative Terms
✅ "Make the contact button larger"
✅ "Add more space between industry cards"
✅ "Use a warmer shade of orange"

### Multiple Changes
You can give Claude multiple instructions at once:
```
1. Change the hero tagline to 'X'
2. Make all buttons orange
3. Add more padding to sections
4. Update the contact form message
```

## 🔄 Workflow

### Making Changes Live

1. **Edit locally:**
   ```bash
   cd a2agents.com
   claude-code
   # Give your instructions
   ```

2. **Test locally:**
   ```bash
   npm run dev
   # Open dist/index.html in browser
   ```

3. **Deploy to production:**
   ```bash
   # Claude Code can commit and push for you:
   "Commit these changes with message 'Updated hero section' and push to GitHub"
   
   # Or manually:
   git add .
   git commit -m "Updated hero section"
   git push origin main
   ```

4. **Wait for deployment:**
   - GitHub Actions will automatically build and deploy
   - Check https://a2agents.com in 2-3 minutes

## 📋 Content Placeholder Reference

Here are all the content placeholders that need replacing in Phase 2:

### Hero Section
- `[CONTENT: "a Human Layer for the AI Era"]` - Main headline
- `[CONTENT: "Human First // AI-Native"]` - Tagline
- `[CONTENT: "Let's Talk"]` - CTA button text

### Problem Section
- `[CONTENT: "The Problem We Solve"]` - Section heading
- `[CONTENT: Kevin's personal voice problem statement - paragraph 1]`
- `[CONTENT: Kevin's personal voice problem statement - paragraph 2]`
- `[CONTENT: Kevin's personal voice problem statement - paragraph 3]`

### Services
- `[CONTENT: "What We Do"]` - Section heading
- `[CONTENT: "Human Excellence"]` - Service category
- `[CONTENT: "AI Transformation"]` - Service category
- Various service bullet points

### Industries
- `[CONTENT: "Industries We Serve"]` - Section heading
- Six industry cards with names and descriptions

### About
- `[CONTENT: "About"]` - Section heading
- Four paragraphs of Kevin's story in first person

### Contact
- `[CONTENT: "Let's Talk"]` - Section heading
- `[CONTENT: "Every transformation starts with a conversation"]`
- Form labels and placeholder text

## 🆘 Troubleshooting

### Changes not showing locally?
1. Make sure `npm run dev` is running
2. Hard refresh browser: Cmd+Shift+R (Mac) / Ctrl+F5 (PC)
3. Check you're viewing `dist/index.html` not `src/index.html`

### Claude Code not understanding?
Try being more specific:
- Instead of "change the color", say "make the hero section background lighter"
- Instead of "update the text", say "in the about section, change the first paragraph to..."
- Show Claude examples of what you want

### Build errors?
```bash
# Clear everything and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### Deployment not working?
1. Check GitHub Actions tab for errors
2. Verify you pushed to the `main` branch
3. Wait 2-3 minutes for deployment

## 📚 Advanced Editing

### Adding New Sections

Tell Claude: "Add a new section after industries for testimonials with three customer quotes"

Claude will:
1. Add the HTML structure
2. Apply consistent styling
3. Make it responsive
4. Follow the existing design patterns

### Modifying Animations

Tell Claude: "Add a subtle fade-in animation to all sections as users scroll"

### Performance Optimization

Tell Claude: "Optimize the images in the assets folder for web performance"

## 🎯 Best Practices

1. **Always test locally** before pushing to production
2. **Make one type of change at a time** for easier debugging
3. **Use semantic descriptions** ("warmer", "more professional", "friendlier")
4. **Reference existing sections** as examples
5. **Keep accessibility in mind** (contrast, readable fonts, alt text)

## 📞 Getting Help

If Claude Code isn't working as expected:

1. **Check this guide** for the right terminology
2. **Look at existing code** for patterns to follow
3. **Try rephrasing** your request
4. **Break complex changes** into smaller steps

Remember: Claude Code understands context, so you can have a conversation:
- You: "Make the hero section background gradient"
- Claude: *makes change*
- You: "Actually, make it more subtle"
- Claude: *adjusts the gradient*

---

Happy editing! The site is designed to be easily modified through natural language. Don't be afraid to experiment - you can always revert changes through Git.