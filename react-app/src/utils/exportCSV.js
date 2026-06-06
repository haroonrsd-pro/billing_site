export function exportToCSV(rows, filename) {
    if (!rows || !rows.length) return;
    
    const header = Object.keys(rows[0]).join(',');
    const body = rows.map(r => 
        Object.values(r).map(val => {
            // Escape commas and quotes for CSV
            const strValue = String(val);
            if (strValue.includes(',') || strValue.includes('"')) {
                return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
        }).join(',')
    ).join('\n');
    
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
