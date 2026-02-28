const fs = require('fs');
const files = ['login.html', 'live_classes.html', 'student_dashboard.html', 'index.html'];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Replace logo
    content = content.replace(/najah\.png/g, 'logo1.png');

    // Replace CSS specific custom gradients from orange back to slate colors
    // Previous replaced: #f2921b and #f5a942
    content = content.replace(/#f2921b/g, '#94a3b8'); // slate-400 equivalent
    content = content.replace(/#f5a942/g, '#64748b'); // slate-500 equivalent

    // Custom dark blue (#0a2342, #1d4273) remains since it matches the navy blue in the logo.

    // Replace Tailwind specific color classes
    const classReplacements = {
        'orange-50 ': 'slate-50 ',
        'orange-100': 'slate-100',
        'orange-200': 'slate-200',
        'orange-300': 'slate-300',
        'orange-400': 'slate-400',
        'orange-500': 'slate-500',
        'orange-600': 'slate-600',
        'orange-700': 'slate-700',
        'orange-800': 'slate-800',
        'orange-900': 'slate-900',
        // Double check specific hover classes
        'hover:to-orange-700': 'hover:to-slate-700',
        'from-orange-600': 'from-slate-600',
        'to-orange-600': 'to-slate-600',
    };

    for (const [key, val] of Object.entries(classReplacements)) {
        content = content.split(key).join(val);
    }

    // Double check pink to slate just in case any pink was left in original or skipped:
    const oldReplacements = {
        'pink-50 ': 'slate-50 ',
        'pink-100': 'slate-100',
        'pink-500': 'slate-500',
        'pink-600': 'slate-600',
        'indigo-900': 'blue-950',
        'indigo-500': 'slate-500',
        'indigo-600': 'slate-600',
        'indigo-700': 'slate-700',
    }
    for (const [key, val] of Object.entries(oldReplacements)) {
        content = content.split(key).join(val);
    }

    fs.writeFileSync(file, content, 'utf8');
});

console.log('Update logo1 and theme complete.');
