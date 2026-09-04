import * as XLSX from 'xlsx';

export interface ExcelColumn<T = any> {
  header: string;
  key?: string | number | symbol;
  getValue?: (item: any, index: number) => any;
  width?: number;
}

/**
 * Export structured JSON data or rows to an Excel (.xlsx) file with RTL support
 */
export function exportToExcel<T = any>({
  filename,
  sheetName = 'البيانات',
  data,
  columns,
  companyName = 'المنظومة المحاسبية المعتمدة',
  reportTitle,
}: {
  filename: string;
  sheetName?: string;
  data: T[] | any[];
  columns: ExcelColumn<any>[];
  companyName?: string;
  reportTitle?: string;
}) {
  try {
    const rows: any[][] = [];

    // 1. Report Header in Excel
    if (companyName) {
      rows.push([companyName]);
    }
    if (reportTitle) {
      rows.push([reportTitle]);
      rows.push([`تاريخ الاستخراج: ${new Date().toLocaleString('ar-EG')} - تم الإنشاء عبر النظام المحاسبي المعتمد`]);
      rows.push([]); // Empty row
    }

    // 2. Table Headers
    const headers = columns.map((c) => c.header);
    rows.push(headers);

    // 3. Data Rows
    data.forEach((item, idx) => {
      const row = columns.map((col) => {
        if (col.getValue) {
          return col.getValue(item, idx);
        }
        if (col.key && item && typeof item === 'object') {
          const val = (item as any)[col.key];
          return val !== undefined && val !== null ? val : '';
        }
        return '';
      });
      rows.push(row);
    });

    // 4. Create Workbook & Worksheet
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set RTL direction
    if (!ws['!views']) ws['!views'] = [];
    ws['!views'].push({ rightToLeft: true });

    // Set Column Widths
    ws['!cols'] = columns.map((c) => ({
      wch: c.width || Math.max(c.header.length + 6, 15),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

    // Ensure valid filename extension
    const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

    // Trigger download
    XLSX.writeFile(wb, cleanFilename);
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('حدث خطأ أثناء تصدير ملف الإكسيل. يرجى المحاولة مرة أخرى.');
    return false;
  }
}
