#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script to generate full HTML from content.md
"""

def read_content(filename):
    """Read the markdown content file"""
    with open(filename, 'r', encoding='utf-8') as f:
        return f.readlines()

def parse_chapters(lines):
    """Parse content into chapters"""
    chapters = []
    current_chapter = None
    current_content = []
    
    for line in lines:
        line = line.strip()
        
        # Check if line is a chapter title
        if line.startswith('Глава'):
            # Save previous chapter if exists
            if current_chapter:
                chapters.append({
                    'title': current_chapter,
                    'content': current_content
                })
            
            current_chapter = line
            current_content = []
        elif line and current_chapter:
            # Add content to current chapter
            current_content.append(line)
    
    # Add last chapter
    if current_chapter:
        chapters.append({
            'title': current_chapter,
            'content': current_content
        })
    
    return chapters

def format_paragraph(text):
    """Format a paragraph with special styling"""
    # Check for letter/quote style
    if text.startswith('«') and text.endswith('»'):
        return f'<p class="letter">{text}</p>'
    
    # Check for emphasis
    if text.startswith('Добро пожаловать') or 'КОНЕЦ' in text:
        return f'<p class="emphasis">{text}</p>'
    
    return f'<p>{text}</p>'

def generate_html(chapters):
    """Generate full HTML content"""
    html_template_start = '''<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Инквизитор — Темное Фэнтези</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Particle background effect -->
    <div class="particles" id="particles"></div>
    
    <!-- Theme toggle -->
    <button class="theme-toggle" id="themeToggle" aria-label="Переключить тему">
        <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
    </button>

    <!-- Navigation -->
    <nav class="nav">
        <div class="nav-container">
            <h1 class="nav-title">Инквизитор</h1>
            <div class="nav-chapters">
'''
    
    # Add navigation links
    for i in range(len(chapters)):
        html_template_start += f'                <a href="#chapter{i+1}" class="nav-link">Глава {["I", "II", "III", "IV", "V", "VI"][i]}</a>\n'
    
    html_template_start += '''            </div>
        </div>
    </nav>

    <!-- Main content -->
    <main class="container">
        <header class="story-header">
            <h1 class="story-title">Инквизитор</h1>
            <p class="story-subtitle">Темное Фэнтези</p>
            <div class="divider"></div>
        </header>

        <article class="story-content">
'''
    
    # Add chapters
    chapter_html = ''
    for i, chapter in enumerate(chapters):
        chapter_html += f'''            <section id="chapter{i+1}" class="chapter">
                <h2 class="chapter-title">{chapter['title']}</h2>
                <div class="chapter-content">
'''
        
        # Add paragraphs
        for paragraph in chapter['content']:
            if paragraph:
                chapter_html += '                    ' + format_paragraph(paragraph) + '\n'
        
        chapter_html += '''                </div>
            </section>

'''
    
    html_template_end = '''            <div class="story-end">
                <p class="end-text">КОНЕЦ ПЕРВОЙ КНИГИ</p>
            </div>
        </article>
    </main>

    <footer class="footer">
        <p>&copy; 2024 Темное Фэнтези. Все права защищены.</p>
    </footer>

    <script src="script.js"></script>
</body>
</html>'''
    
    return html_template_start + chapter_html + html_template_end

def main():
    # Read content
    lines = read_content('content.md')
    
    # Parse chapters
    chapters = parse_chapters(lines)
    
    # Generate HTML
    html_content = generate_html(chapters)
    
    # Write to file
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"✅ Generated index.html with {len(chapters)} chapters")

if __name__ == '__main__':
    main()
