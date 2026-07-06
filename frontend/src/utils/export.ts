/**
 * Exports data grid content to a CSV file.
 * Automatically wraps values in double-quotes and escapes nested quotes to support Excel.
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const csvRows = [
    headers.join(','),
    ...rows.map(row => 
      row.map(val => {
        const str = val === null || val === undefined ? '' : String(val);
        // Escape nested quotes by doubling them
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ];
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
