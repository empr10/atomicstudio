# Руководство по кастомизации

## 🎨 Изменение цветовой схемы

### Темная тема

Откройте `styles.css` и найдите секцию `:root`:

```css
:root {
    --bg-primary: #0a0a0f;      /* Основной фон */
    --bg-secondary: #12121a;    /* Вторичный фон (навигация, футер) */
    --bg-tertiary: #1a1a25;     /* Третичный фон (письма, цитаты) */
    --text-primary: #e8e8f0;    /* Основной текст */
    --text-secondary: #b8b8c8;  /* Вторичный текст */
    --text-muted: #808090;      /* Приглушенный текст */
    --accent-primary: #8b5cf6;  /* Основной акцент */
    --accent-secondary: #6366f1; /* Вторичный акцент */
}
```

### Светлая тема

Найдите секцию `[data-theme="light"]`:

```css
[data-theme="light"] {
    --bg-primary: #f5f5f7;
    --text-primary: #1a1a1f;
    /* ... и т.д. */
}
```

## 📝 Изменение шрифтов

### Основной текст

В `styles.css`, секция `body`:

```css
body {
    font-family: 'Georgia', 'Times New Roman', serif;
    /* Замените на свой шрифт */
}
```

### Популярные варианты:

**Для классического вида:**
```css
font-family: 'Merriweather', 'Georgia', serif;
font-family: 'Crimson Text', 'Georgia', serif;
font-family: 'Lora', 'Georgia', serif;
```

**Для современного вида:**
```css
font-family: 'Inter', 'Arial', sans-serif;
font-family: 'Roboto', 'Arial', sans-serif;
font-family: 'Open Sans', 'Arial', sans-serif;
```

### Подключение Google Fonts

Добавьте в `<head>` файла `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
```

## 📏 Изменение размеров текста

### Базовый размер

В `styles.css`, секция `html`:

```css
html {
    font-size: 16px; /* Измените на желаемый размер */
}
```

### Размеры для мобильных

В медиа-запросе `@media (max-width: 768px)`:

```css
html {
    font-size: 14px; /* Для планшетов */
}
```

## 🎭 Изменение эффектов

### Отключить частицы

В `script.js`, измените:

```javascript
const particleCount = 0; // Было: window.innerWidth < 768 ? 30 : 50
```

### Изменить количество частиц

```javascript
const particleCount = window.innerWidth < 768 ? 15 : 100; // Ваши значения
```

### Отключить анимации появления

В `script.js`, закомментируйте секцию:

```javascript
// const observer = new IntersectionObserver(...);
// sections.forEach(section => { ... });
```

## 📐 Изменение ширины контента

В `styles.css`, секция `.container`:

```css
.container {
    max-width: 800px; /* Измените на желаемую ширину */
    /* Например: 1000px для более широкого текста */
}
```

## 🎨 Добавление новой темы

### 1. Создайте новую тему в CSS

```css
[data-theme="sepia"] {
    --bg-primary: #f4ecd8;
    --bg-secondary: #e8dcc0;
    --text-primary: #5c4a2f;
    --accent-primary: #8b6f47;
    /* ... остальные переменные */
}
```

### 2. Добавьте кнопку переключения

В `index.html`, добавьте новую кнопку или измените логику в `script.js`:

```javascript
const themes = ['dark', 'light', 'sepia'];
let currentThemeIndex = 0;

themeToggle.addEventListener('click', () => {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    const newTheme = themes[currentThemeIndex];
    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});
```

## 🔤 Изменение типографики

### Убрать буквицы

В `styles.css`, закомментируйте:

```css
/* .chapter-content p:first-child::first-letter {
    font-size: 3.5rem;
    ...
} */
```

### Убрать красную строку

```css
.chapter-content p {
    text-indent: 0; /* Было: 2rem */
}
```

### Изменить выравнивание текста

```css
.chapter-content p {
    text-align: left; /* Было: justify */
}
```

## 🌟 Изменение эффектов свечения

### Усилить свечение

В `:root`:

```css
--glow-effect: 0 0 40px var(--accent-glow); /* Было: 20px */
```

### Отключить свечение

```css
--glow-effect: none;
```

## 📱 Настройка адаптивности

### Изменить точки перелома

В `styles.css`, измените медиа-запросы:

```css
@media (max-width: 1024px) { /* Было: 768px */
    /* Ваши стили */
}
```

## 🎯 Изменение навигации

### Скрыть навигацию

В `styles.css`:

```css
.nav {
    display: none;
}
```

### Сделать навигацию не липкой

```css
.nav {
    position: static; /* Было: sticky */
}
```

## 🔧 Продвинутая кастомизация

### Добавить фоновое изображение

```css
body {
    background-image: url('path/to/image.jpg');
    background-size: cover;
    background-attachment: fixed;
}

/* Добавьте overlay для читаемости */
body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(10, 10, 15, 0.85);
    z-index: 0;
}
```

### Изменить форму кнопки темы

```css
.theme-toggle {
    border-radius: 10px; /* Было: 50% (круг) */
    width: 60px;
    height: 40px;
}
```

### Добавить тень к тексту

```css
.chapter-content p {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
```

## 💾 Сохранение изменений

После внесения изменений:

1. Сохраните файл
2. Обновите страницу в браузере (F5 или Ctrl+R)
3. Если изменения не видны, попробуйте жесткое обновление (Ctrl+Shift+R)

## ⚠️ Важные замечания

- Всегда делайте резервную копию перед изменениями
- Проверяйте изменения на разных устройствах
- Используйте инструменты разработчика браузера для отладки (F12)
- Проверяйте контрастность цветов для читаемости

## 🎨 Готовые цветовые схемы

### Сепия (винтаж)
```css
--bg-primary: #f4ecd8;
--text-primary: #5c4a2f;
--accent-primary: #8b6f47;
```

### Синяя ночь
```css
--bg-primary: #0f1419;
--text-primary: #e1e8ed;
--accent-primary: #1da1f2;
```

### Зеленый лес
```css
--bg-primary: #0d1b0e;
--text-primary: #d4e4d5;
--accent-primary: #4ade80;
```

### Красный закат
```css
--bg-primary: #1a0a0a;
--text-primary: #f0e8e8;
--accent-primary: #ef4444;
```
