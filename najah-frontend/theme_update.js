const fs = require('fs');
const files = ['login.html', 'live_classes.html', 'student_dashboard.html', 'index.html'];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Replace logos
  content = content.replace(/https:\/\/najahtutors\.net\/logo\.png/g, 'najah.png');

  // Replace CSS specific gradients
  content = content.replace(/#667eea/g, '#0a2342'); 
  content = content.replace(/#764ba2/g, '#1d4273'); 
  content = content.replace(/#f093fb/g, '#f2921b'); 
  content = content.replace(/#4facfe/g, '#f5a942'); 

  // Replace Tailwind specific color classes
  const classReplacements = {
    'purple-50 ': 'blue-50 ',
    'purple-100': 'blue-100',
    'purple-200': 'blue-200',
    'purple-300': 'blue-300',
    'purple-400': 'blue-400',
    'purple-500': 'blue-800',
    'purple-600': 'blue-900',
    'purple-700': 'blue-950',
    'purple-800': 'blue-950',
    'purple-900': 'blue-950',
    'indigo-500': 'orange-500',
    'indigo-600': 'orange-600',
    'indigo-700': 'orange-700',
    'pink-500': 'orange-500',
    'pink-600': 'orange-600',
  };

  for (const [key, val] of Object.entries(classReplacements)) {
    content = content.split(key).join(val);
  }

  // Find explicit gradients and change them to our colors if we missed any
  // e.g., from-purple-600 to-indigo-600 -> from-blue-900 to-orange-600 (handled above)
  
  // Custom orange replacements for accent objects specifically?
  // We used blue-900 as the primary. Let's make sure it doesn't look all-blue and loses its branding.
  // We can review the files if needed.

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Update complete.');
