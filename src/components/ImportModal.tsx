import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { Transaction, PaymentMethod } from '../types';
import { toISODate } from '../utils/currency';
import { formatCurrency } from '../utils/currencyFormatter';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newTransactions: Transaction[]) => void;
  existingTransactions: Transaction[];
  defaultAccountId: string;
  defaultCurrency?: string;
}

export function ImportModal({
  isOpen,
  onClose,
  onImport,
  existingTransactions,
  defaultAccountId,
  defaultCurrency = 'INR',
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{
    date: number;
    description: number;
    amount: number;
    type: number;
    category: number;
  }>({
    date: 0,
    description: 1,
    amount: 2,
    type: 3,
    category: 4,
  });

  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [previewTransactions, setPreviewTransactions] = useState<
    { tx: Transaction; isDuplicate: boolean; error?: string }[]
  >([]);
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text
        .split(/\r\n|\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length < 2) {
        setParseErrors(['CSV file must have at least a header row and one data row.']);
        return;
      }

      // Simple CSV line parser supporting quoted values
      const parsedRows = lines.map((line) => {
        const row: string[] = [];
        let insideQuote = false;
        let entry = '';
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            row.push(entry.trim());
            entry = '';
          } else {
            entry += char;
          }
        }
        row.push(entry.trim());
        return row;
      });

      const headerRow = parsedRows[0];
      setHeaders(headerRow);
      setCsvRows(parsedRows.slice(1));

      // Attempt smart auto-mapping
      const newMapping = { ...mapping };
      headerRow.forEach((h, idx) => {
        const lh = h.toLowerCase();
        if (lh.includes('date')) newMapping.date = idx;
        else if (lh.includes('desc') || lh.includes('particular') || lh.includes('detail'))
          newMapping.description = idx;
        else if (lh.includes('amount') || lh.includes('value') || lh.includes('inr'))
          newMapping.amount = idx;
        else if (lh.includes('type') || lh.includes('cr') || lh.includes('dr'))
          newMapping.type = idx;
        else if (lh.includes('cat')) newMapping.category = idx;
      });
      setMapping(newMapping);
      setStep('map');
    };
    reader.readAsText(uploadedFile);
  };

  const handleProcessPreview = () => {
    const errors: string[] = [];
    const previewList: { tx: Transaction; isDuplicate: boolean; error?: string }[] = [];

    csvRows.forEach((row, idx) => {
      const rawDate = row[mapping.date] || '';
      const rawDesc = row[mapping.description] || '';
      const rawAmt = row[mapping.amount] || '';
      const rawType = row[mapping.type] || '';
      const rawCat = row[mapping.category] || '';

      // Normalize date (YYYY-MM-DD) or DD/MM/YYYY or DD-MM-YYYY
      let cleanDate = toISODate(new Date());
      if (rawDate) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          cleanDate = rawDate;
        } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(rawDate)) {
          const parts = rawDate.split(/[/-]/);
          cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      // Parse amount
      const cleanAmtStr = rawAmt.replace(/[₹,$\s]/g, '');
      const parsedAmount = Math.abs(parseFloat(cleanAmtStr));

      let rowError: string | undefined = undefined;
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        rowError = `Row ${idx + 2}: Invalid amount "${rawAmt}"`;
        errors.push(rowError);
      }

      // Infer type
      let txType: 'Income' | 'Expense' = 'Expense';
      const typeLower = rawType.toLowerCase();
      if (
        typeLower.includes('income') ||
        typeLower.includes('cr') ||
        typeLower.includes('credit') ||
        typeLower.includes('deposit')
      ) {
        txType = 'Income';
      }

      // Check duplicates
      const isDup = existingTransactions.some(
        (et) =>
          et.date === cleanDate &&
          Math.abs(et.amount - parsedAmount) < 0.01 &&
          et.description.toLowerCase().trim() === rawDesc.toLowerCase().trim()
      );

      const tx: Transaction = {
        id: `tx_imp_${Date.now()}_${idx}`,
        type: txType,
        amount: isNaN(parsedAmount) ? 0 : parsedAmount,
        currency: defaultCurrency,
        reportingAmount: isNaN(parsedAmount) ? 0 : parsedAmount,
        exchangeRate: 1.0,
        exchangeRateDate: cleanDate,
        exchangeRateSource: 'CSV Import',
        isHistoricalRateLocked: true,
        description: rawDesc || `Imported record #${idx + 1}`,
        category: rawCat || (txType === 'Income' ? 'Salary' : 'Miscellaneous'),
        date: cleanDate,
        paymentMethod: 'UPI' as PaymentMethod,
        accountId: defaultAccountId,
      };

      previewList.push({ tx, isDuplicate: isDup, error: rowError });
    });

    setParseErrors(errors);
    setPreviewTransactions(previewList);
    setStep('preview');
  };

  const handleConfirmImport = () => {
    // Import all valid rows (user can choose whether to skip duplicates)
    const validRows = previewTransactions
      .filter((p) => !p.error && !p.isDuplicate)
      .map((p) => p.tx);

    onImport(validRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Import Transactions via CSV
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 space-y-5">
          {step === 'upload' && (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-emerald-500 transition cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileText className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Upload CSV Bank Statement or File
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                Drag and drop your transaction CSV here, or click to browse files from your computer.
              </p>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Found {csvRows.length} rows. Please confirm the column mappings:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(['date', 'description', 'amount', 'type', 'category'] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      {field} Column
                    </label>
                    <select
                      value={mapping[field]}
                      onChange={(e) =>
                        setMapping({ ...mapping, [field]: Number(e.target.value) })
                      }
                      className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs text-slate-900 dark:text-white"
                    >
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          Column {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {previewTransactions.filter((p) => !p.error && !p.isDuplicate).length} ready to import
                </span>
                <span className="text-xs text-slate-400">
                  {previewTransactions.filter((p) => p.isDuplicate).length} duplicates skipped
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {previewTransactions.map((item, i) => (
                  <div
                    key={i}
                    className={`p-2.5 flex items-center justify-between ${
                      item.isDuplicate
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 text-slate-400'
                        : item.error
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-500'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.tx.description}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.tx.date} · {item.tx.category} · {item.tx.type}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono">
                        {formatCurrency(item.tx.amount, defaultCurrency)}
                      </div>
                      {item.isDuplicate && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          Duplicate
                        </span>
                      )}
                      {item.error && (
                        <span className="text-[10px] text-rose-600 font-semibold">Error</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
          >
            Cancel
          </button>

          {step === 'map' && (
            <button
              onClick={handleProcessPreview}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Preview & Validate
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={handleConfirmImport}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Import {previewTransactions.filter((p) => !p.error && !p.isDuplicate).length} Records
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
