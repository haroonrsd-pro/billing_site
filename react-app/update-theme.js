import fs from 'fs';
const file = 'b:\\\\New folder (4)\\\\billing app\\\\react-app\\\\src\\\\pages\\\\OwnerDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const isMobileStart = content.indexOf('if (isMobile) {');
const desktopStart = content.indexOf('// Web Application / Desktop Dashboard');

if (isMobileStart !== -1 && desktopStart !== -1) {
    let mobileBlock = content.substring(isMobileStart, desktopStart);

    mobileBlock = mobileBlock.replace(/bg-\[#f8fafc\]/g, 'bg-[var(--bg)]');
    mobileBlock = mobileBlock.replace(/bg-white/g, 'bg-[var(--panel)]');
    mobileBlock = mobileBlock.replace(/text-gray-900/g, 'text-[var(--ink)]');
    mobileBlock = mobileBlock.replace(/text-gray-500/g, 'text-[var(--muted)]');
    mobileBlock = mobileBlock.replace(/text-gray-400/g, 'text-[var(--muted2)]');
    mobileBlock = mobileBlock.replace(/text-\[#6d28d9\]/g, 'text-[var(--accent)]');
    mobileBlock = mobileBlock.replace(/bg-\[#ede9fe\]/g, 'bg-[var(--accent-light)]');
    mobileBlock = mobileBlock.replace(/border-gray-100/g, 'border-[var(--border)]');
    mobileBlock = mobileBlock.replace(/bg-\[#6366f1\]/g, 'bg-[var(--accent2)]');
    mobileBlock = mobileBlock.replace(/text-\[#6366f1\]/g, 'text-[var(--accent2)]');
    mobileBlock = mobileBlock.replace(/bg-\[#eef2ff\]/g, 'bg-[var(--blue-bg)]');
    mobileBlock = mobileBlock.replace(/bg-gray-50/g, 'bg-[var(--warm)]');
    mobileBlock = mobileBlock.replace(/bg-gray-100/g, 'bg-[var(--border)]');
    mobileBlock = mobileBlock.replace(/bg-gray-200/g, 'bg-[var(--border2)]');
    mobileBlock = mobileBlock.replace(/shadow-\[.*?\]/g, 'shadow-md');

    content = content.substring(0, isMobileStart) + mobileBlock + content.substring(desktopStart);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Theme replaced in mobile block.');
} else {
    console.log('Could not find block bounds.');
}
