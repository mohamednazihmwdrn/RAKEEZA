import React, { useState } from 'react';
import { AppData, PurchaseInvoice, InvoiceItem } from '../types';
import { Modal } from './Modal';
import { printInvoiceWindow } from '../utils/printInvoice';
import { InvoiceCardTemplate } from './InvoiceCardTemplate';
import { exportToExcel } from '../utils/excelExport';
import { openUnifiedPrintWindow } from '../utils/printUnified';

interface PurchasesViewProps {
  appData: AppData;
  onUpdateData: (newData: AppData) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ appData, onUpdateData, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeModal, setActiveModal] = useState<'create' | 'view' | 'pay' | null>(null);
  const [modalType, setModalType] = useState<'nagdi' | 'ajel' | 'return_nagdi' | 'return_ajel'>('nagdi');
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);

  // Form State
  const [supplierName, setSupplierName] = useState('');
  const [phone, setPhone] = useState('');
  const [supplierRepId, setSupplierRepId] = useState('');
  const [supplierRepName, setSupplierRepName] = useState('');
  const [supplierRepPhone, setSupplierRepPhone] = useState('');
  const [salesRep, setSalesRep] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'drawer' | 'vodafone' | 'instapay' | 'bank'>('drawer');
  const [tempItems, setTempItems] = useState<InvoiceItem[]>([]);

  // Item Draft Input
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  // Discount/Tax/Fees
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(14);
  const [fees, setFees] = useState<number>(0);

  // Payment Modal for Credit Invoices
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'drawer' | 'vodafone' | 'instapay' | 'bank'>('drawer');

  // Autocomplete Dropdowns State
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  const filteredSuppliersForName = appData.suppliers.filter((s) => {
    const q = supplierName.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || (s.phone && s.phone.toLowerCase().includes(q));
  });

  const filteredSuppliersForPhone = appData.suppliers.filter((s) => {
    const q = phone.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || (s.phone && s.phone.toLowerCase().includes(q));
  });

  const filteredItemsForSearch = appData.items.filter((i) => {
    const q = itemName.trim().toLowerCase();
    if (!q) return true;
    return i.name.toLowerCase().includes(q) || (i.id && i.id.toString().includes(q));
  });

  const filteredInvoices = appData.purchaseInvoices.filter((inv) => {
    const s = searchTerm.toLowerCase();
    return (
      inv.id.toString().includes(s) ||
      inv.supplierName?.toLowerCase().includes(s) ||
      inv.phone?.toLowerCase().includes(s) ||
      inv.salesRep?.toLowerCase().includes(s) ||
      inv.notes?.toLowerCase().includes(s)
    );
  });

  const getMethodLabel = (m: string) => {
    switch (m) {
      case 'drawer':
        return 'الدرج (الخزينة الرئيسية)';
      case 'vodafone':
        return 'فودافون كاش';
      case 'instapay':
        return 'إنستاباي (InstaPay)';
      case 'bank':
        return 'حساب بنكي';
      default:
        return m;
    }
  };

  const openCreateModal = (type: 'nagdi' | 'ajel' | 'return_nagdi' | 'return_ajel') => {
    setEditingInvoiceId(null);
    setModalType(type);
    setSupplierName('');
    setPhone('');
    setSupplierRepId('');
    setSupplierRepName('');
    setSupplierRepPhone('');
    setSalesRep('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('drawer');
    setPaidAmountInput(type === 'ajel' || type === 'return_ajel' ? '0' : '');
    setTempItems([]);
    setItemName('');
    setItemQty('');
    setItemPrice('');
    setDiscount(0);
    setTax(14);
    setFees(0);
    setShowSupplierDropdown(false);
    setShowPhoneDropdown(false);
    setShowItemDropdown(false);
    setActiveModal('create');
  };

  const openEditModal = (inv: PurchaseInvoice) => {
    setEditingInvoiceId(inv.id);
    setModalType(inv.type);
    setSupplierName(inv.supplierName || '');
    setPhone(inv.phone || '');
    setSupplierRepId((inv as any).supplierRepId || '');
    setSupplierRepName((inv as any).supplierRepName || '');
    setSupplierRepPhone((inv as any).supplierRepPhone || '');
    setSalesRep(inv.salesRep || '');
    setNotes(inv.notes || '');
    setDate(inv.date || new Date().toISOString().split('T')[0]);
    setPaymentMethod((inv.paymentMethod as any) || 'drawer');
    setPaidAmountInput(inv.paidAmount !== undefined ? inv.paidAmount.toString() : '');
    setTempItems(inv.items ? [...inv.items] : []);
    setItemName('');
    setItemQty('');
    setItemPrice('');
    setDiscount(inv.discount || 0);
    setTax(inv.tax !== undefined ? inv.tax : 14);
    setFees(inv.fees || 0);
    setShowSupplierDropdown(false);
    setShowPhoneDropdown(false);
    setShowItemDropdown(false);
    setActiveModal('create');
  };

  const handleAddItem = () => {
    const name = itemName.trim();
    const qty = parseFloat(itemQty) || 0;
    const price = parseFloat(itemPrice) || 0;

    if (!name || qty <= 0 || price <= 0) {
      showToast('يرجى إدخال اسم الصنف والكمية وسعر الشراء بشكل صحيح', 'warning');
      return;
    }

    setTempItems((prev) => [...prev, { name, qty, price, total: qty * price }]);
    setItemName('');
    setItemQty('');
    setItemPrice('');
  };

  const handleRemoveItem = (index: number) => {
    setTempItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = tempItems.reduce((s, i) => s + i.total, 0);
    const discountAmount = (subtotal * (discount || 0)) / 100;
    const taxAmount = ((subtotal - discountAmount) * (tax || 0)) / 100;
    const total = subtotal - discountAmount + taxAmount + (fees || 0);

    let effectivePaid = 0;
    let effectiveRemaining = 0;

    if (modalType === 'nagdi' || modalType === 'return_nagdi') {
      effectivePaid = total;
      effectiveRemaining = 0;
    } else {
      const rawPaid = parseFloat(paidAmountInput) || 0;
      effectivePaid = Math.max(0, Math.min(total, rawPaid));
      effectiveRemaining = Math.max(0, total - effectivePaid);
    }

    return { subtotal, total, effectivePaid, effectiveRemaining };
  };

  const handleSaveInvoice = () => {
    if (tempItems.length === 0) {
      showToast('يرجى إضافة صنف واحد على الأقل', 'warning');
      return;
    }
    if (!supplierName.trim()) {
      showToast('يرجى إدخال اسم المورد', 'warning');
      return;
    }

    const { subtotal, total, effectivePaid, effectiveRemaining } = calculateTotals();
    const isReturn = modalType.startsWith('return_');

    // 1. Mandatory Payment Method Validation for Cash operations
    if ((modalType === 'nagdi' || modalType === 'return_nagdi') && !paymentMethod) {
      showToast('يرجى اختيار وسيلة دفع إجبارية (الخزينة أو الحساب البنكي) للعملية النقدية', 'error');
      return;
    }
    if ((modalType === 'ajel' || modalType === 'return_ajel') && effectivePaid > 0 && !paymentMethod) {
      showToast('يرجى اختيار وسيلة سداد/استلام الدفعة النقدية', 'error');
      return;
    }

    const isEditing = editingInvoiceId !== null;
    const invId = isEditing ? editingInvoiceId : appData.nextPurchaseNumber;

    const newInvoice: PurchaseInvoice = {
      id: invId,
      supplierName: supplierName.trim(),
      phone: phone.trim(),
      supplierRepId: supplierRepId || undefined,
      supplierRepName: supplierRepName.trim() || undefined,
      supplierRepPhone: supplierRepPhone.trim() || undefined,
      salesRep: salesRep.trim() || undefined,
      notes: notes.trim() || undefined,
      date: date,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      items: tempItems,
      subtotal,
      discount: discount || 0,
      tax: tax || 0,
      fees: fees || 0,
      total,
      paymentMethod,
      type: modalType,
      paidAmount: effectivePaid,
      remainingAmount: effectiveRemaining,
      createdAt: new Date().toISOString(),
      createdBy: appData.users.find((u) => u.id === appData.currentUser)?.name || 'مدير النظام',
    };

    const updatedData = { ...appData };

    // If editing, revert old invoice items stock first
    if (isEditing) {
      const oldInv = updatedData.purchaseInvoices.find((i) => i.id === editingInvoiceId);
      if (oldInv) {
        oldInv.items?.forEach((itm) => {
          const sItm = updatedData.items.find((i) => i.name === itm.name);
          if (sItm) {
            const wasReturn = oldInv.type.startsWith('return_');
            sItm.quantity = wasReturn ? (sItm.quantity || 0) + itm.qty : (sItm.quantity || 0) - itm.qty;
          }
        });
      }
      updatedData.purchaseInvoices = updatedData.purchaseInvoices.map((i) => (i.id === editingInvoiceId ? newInvoice : i));
    } else {
      updatedData.nextPurchaseNumber += 1;
      updatedData.purchaseInvoices = [newInvoice, ...updatedData.purchaseInvoices];
    }

    // Update Stock & Purchase Prices
    tempItems.forEach((item) => {
      const stockItem = updatedData.items.find((i) => i.name === item.name);
      if (stockItem) {
        stockItem.quantity = isReturn ? (stockItem.quantity || 0) - item.qty : (stockItem.quantity || 0) + item.qty;
        if (!isReturn) stockItem.purchasePrice = item.price;
        if (!stockItem.movements) stockItem.movements = [];
        stockItem.movements.push({
          date: date,
          type: isReturn ? 'return_purchase' : 'purchase',
          qty: isReturn ? -item.qty : item.qty,
          price: item.price,
          total: isReturn ? -item.total : item.total,
          note: isReturn
            ? `مرتجع شراء (${modalType === 'return_nagdi' ? 'نقدي' : 'آجل'}) للمورد ${supplierName}`
            : `شراء (${modalType === 'nagdi' ? 'نقدي' : 'آجل'}) من المورد ${supplierName}`,
        });
      } else {
        updatedData.items.push({
          id: 'i' + Date.now(),
          name: item.name,
          quantity: isReturn ? -item.qty : item.qty,
          purchasePrice: item.price,
          salePrice: item.price * 1.2 || 0,
          movements: [
            {
              date: date,
              type: isReturn ? 'return_purchase' : 'purchase',
              qty: isReturn ? -item.qty : item.qty,
              price: item.price,
              total: isReturn ? -item.total : item.total,
              note: isReturn
                ? `مرتجع شراء (${modalType === 'return_nagdi' ? 'نقدي' : 'آجل'}) للمورد ${supplierName}`
                : `شراء (${modalType === 'nagdi' ? 'نقدي' : 'آجل'}) من المورد ${supplierName}`,
            },
          ],
        });
      }
    });

    // Cashbox & Supplier Balance Handling
    if (modalType === 'nagdi') {
      // 1. Cash Purchase: Deduct full amount from selected method/cashbox, 0 supplier debt
      updatedData.cashBox[paymentMethod] = (updatedData.cashBox[paymentMethod] || 0) - total;
      updatedData.cashTransactions.push({
        id: updatedData.nextCashId++,
        date: date,
        type: 'pay',
        method: paymentMethod,
        amount: total,
        note: `فاتورة شراء نقدي #${newInvoice.id} - المورد: ${supplierName}`,
        supplierName: supplierName,
        invoiceId: newInvoice.id,
      });
    } else if (modalType === 'ajel') {
      // 2. Credit Purchase: If downpayment made, deduct from cashbox; remaining goes to supplier debt
      if (effectivePaid > 0) {
        updatedData.cashBox[paymentMethod] = (updatedData.cashBox[paymentMethod] || 0) - effectivePaid;
        updatedData.cashTransactions.push({
          id: updatedData.nextCashId++,
          date: date,
          type: 'pay',
          method: paymentMethod,
          amount: effectivePaid,
          note: `دفعة مسددة مع فاتورة شراء آجل #${newInvoice.id} (${getMethodLabel(paymentMethod)}) - المورد: ${supplierName}`,
          supplierName: supplierName,
          invoiceId: newInvoice.id,
        });
      }
      const supp = updatedData.suppliers.find((s) => s.name === supplierName);
      if (supp) {
        supp.balance = (supp.balance || 0) + effectiveRemaining;
      } else {
        updatedData.suppliers.push({
          id: 's' + Date.now(),
          name: supplierName,
          phone: phone,
          balance: effectiveRemaining,
          transactions: [],
        });
      }
    } else if (modalType === 'return_nagdi') {
      // 3. Cash Purchase Return: Receive full refund into cashbox / selected method, 0 supplier debt impact
      updatedData.cashBox[paymentMethod] = (updatedData.cashBox[paymentMethod] || 0) + total;
      updatedData.cashTransactions.push({
        id: updatedData.nextCashId++,
        date: date,
        type: 'receive',
        method: paymentMethod,
        amount: total,
        note: `مرتجع شراء نقدي (استرداد فوري من المورد) #${newInvoice.id} - المورد: ${supplierName}`,
        supplierName: supplierName,
        invoiceId: newInvoice.id,
      });
    } else if (modalType === 'return_ajel') {
      // 4. Credit Purchase Return: If cash received from supplier, add to cashbox; remaining deducted from supplier debt
      if (effectivePaid > 0) {
        updatedData.cashBox[paymentMethod] = (updatedData.cashBox[paymentMethod] || 0) + effectivePaid;
        updatedData.cashTransactions.push({
          id: updatedData.nextCashId++,
          date: date,
          type: 'receive',
          method: paymentMethod,
          amount: effectivePaid,
          note: `استرداد نقدي من مرتجع مشتريات آجل #${newInvoice.id} - المورد: ${supplierName}`,
          supplierName: supplierName,
          invoiceId: newInvoice.id,
        });
      }
      const supp = updatedData.suppliers.find((s) => s.name === supplierName);
      if (supp) {
        supp.balance = (supp.balance || 0) - effectiveRemaining;
      }
    }

    onUpdateData(updatedData);
    setActiveModal(null);
    showToast(`تم حفظ ${isReturn ? 'مرتجع' : 'فاتورة'} مشتريات رقم #${newInvoice.id} بنجاح`, 'success');
  };

  const handleDeleteInvoice = (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;
    const updatedData = { ...appData };
    updatedData.purchaseInvoices = updatedData.purchaseInvoices.filter((i) => i.id !== id);
    onUpdateData(updatedData);
    showToast('تم حذف الفاتورة بنجاح', 'success');
  };

  const handleOpenPayModal = (inv: PurchaseInvoice) => {
    setSelectedInvoice(inv);
    const rem = inv.total - (inv.paidAmount || 0);
    setPayAmount(rem > 0 ? rem : 0);
    setPayMethod('drawer');
    setActiveModal('pay');
  };

  const handleConfirmPayment = () => {
    if (!selectedInvoice) return;
    if (payAmount <= 0) {
      showToast('يرجى إدخال مبلغ سداد صحيح', 'warning');
      return;
    }
    const rem = selectedInvoice.total - (selectedInvoice.paidAmount || 0);
    if (payAmount > rem) {
      showToast('المبلغ المدخل يتجاوز القيمة المتبقية للفاتورة', 'error');
      return;
    }

    const updatedData = { ...appData };
    const inv = updatedData.purchaseInvoices.find((i) => i.id === selectedInvoice.id);
    if (inv) {
      inv.paidAmount = (inv.paidAmount || 0) + payAmount;
      inv.remainingAmount = inv.total - inv.paidAmount;

      // Deduct from Treasury
      updatedData.cashBox[payMethod] = (updatedData.cashBox[payMethod] || 0) - payAmount;

      // Deduct from Supplier Balance
      const supp = updatedData.suppliers.find((s) => s.name === inv.supplierName);
      if (supp) supp.balance = (supp.balance || 0) - payAmount;

      updatedData.cashTransactions.push({
        id: updatedData.nextCashId++,
        date: new Date().toISOString().split('T')[0],
        type: 'pay',
        method: payMethod,
        amount: payAmount,
        note: `سداد دفعة فاتورة مشتريات #${inv.id} (${getMethodLabel(payMethod)}) - المورد: ${inv.supplierName}`,
        supplierName: inv.supplierName,
        invoiceId: inv.id,
      });

      onUpdateData(updatedData);
      setActiveModal(null);
      showToast(`تم سداد ${payAmount} ج.م للمورد ${inv.supplierName} بنجاح`, 'success');
    }
  };

  const handlePrintInvoice = (inv: PurchaseInvoice) => {
    printInvoiceWindow(inv, false, appData.settings || {}, showToast);
  };

  // Print Purchases List
  const handlePrintPurchasesList = () => {
    const list = appData.purchaseInvoices || [];
    const totalAmount = list.reduce((sum, i) => sum + (i.total || 0), 0);
    const totalPaid = list.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const totalRemaining = totalAmount - totalPaid;

    openUnifiedPrintWindow(
      {
        reportTitle: 'سجل فواتير المشتريات والتوريدات',
        subTitle: 'كشف المشتريات المعتمد',
        serial: 'PURCH-REP',
        branch: 'إدارة المشتريات والمخازن',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        kpis: [
          { title: 'عدد الفواتير', value: `${list.length} فاتورة` },
          { title: 'إجمالي المشتريات', value: `${totalAmount.toFixed(2)} ج.م` },
          { title: 'إجمالي المسدد', value: `${totalPaid.toFixed(2)} ج.م` },
          { title: 'المتبقي ذمم موردين', value: `${totalRemaining.toFixed(2)} ج.م` },
        ],
        columns: ['#', 'التاريخ', 'المورد', 'النوع', 'الإجمالي', 'المسدد', 'المتبقي'],
        rows: list.map((inv) => [
          `#${inv.id}`,
          inv.date,
          inv.supplierName,
          inv.type === 'return_nagdi' || inv.type === 'return_ajel'
            ? 'مرتجع'
            : inv.type === 'nagdi'
            ? 'نقدي'
            : 'آجل',
          `${inv.total.toFixed(2)} ج.م`,
          `${(inv.paidAmount || 0).toFixed(2)} ج.م`,
          `${(inv.total - (inv.paidAmount || 0)).toFixed(2)} ج.م`,
        ]),
        summary: [
          { label: 'إجمالي قيمة المشتريات', value: `${totalAmount.toFixed(2)} ج.م`, isTotal: true },
          { label: 'إجمالي المبالغ المسددة', value: `${totalPaid.toFixed(2)} ج.م` },
          { label: 'إجمالي المتبقي للموردين', value: `${totalRemaining.toFixed(2)} ج.م` },
        ],
        footerNote: 'تم استخراج سجل المشتريات من النظام المحاسبي المعتمد',
      },
      appData.settings,
      showToast
    );
  };

  // Export Purchases to Excel
  const handleExportPurchasesExcel = () => {
    const list = appData.purchaseInvoices || [];
    exportToExcel({
      filename: `سجل_فواتير_المشتريات_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'المشتريات',
      data: list,
      columns: [
        { header: 'رقم الفاتورة', key: 'id', width: 14 },
        { header: 'التاريخ', key: 'date', width: 14 },
        { header: 'اسم المورد', key: 'supplierName', width: 26 },
        {
          header: 'نوع الفاتورة',
          getValue: (item: PurchaseInvoice) =>
            item.type === 'return_nagdi' || item.type === 'return_ajel'
              ? 'مرتجع مشتريات'
              : item.type === 'nagdi'
              ? 'نقدي'
              : 'آجل',
          width: 16,
        },
        {
          header: 'الإجمالي (ج.م)',
          getValue: (item: PurchaseInvoice) => item.total.toFixed(2),
          width: 16,
        },
        {
          header: 'المسدد (ج.م)',
          getValue: (item: PurchaseInvoice) => (item.paidAmount || 0).toFixed(2),
          width: 16,
        },
        {
          header: 'المتبقي (ج.م)',
          getValue: (item: PurchaseInvoice) => (item.total - (item.paidAmount || 0)).toFixed(2),
          width: 16,
        },
        { header: 'ملاحظات', key: 'notes', width: 24 },
      ],
      companyName: appData.settings?.companyName || 'المنظومة المحاسبية المعتمدة',
      reportTitle: 'سجل فواتير المشتريات والتوريدات',
    });
    showToast('تم تصدير فواتير المشتريات إلى Excel بنجاح', 'success');
  };

  const getTitleForModal = () => {
    switch (modalType) {
      case 'nagdi':
        return '🔹 فاتورة شراء نقدي جديدة (سداد فوري للمورد بالكامل)';
      case 'ajel':
        return '🔹 فاتورة شراء آجل جديدة (ذمم موردين / دفعة مقدمة)';
      case 'return_nagdi':
        return '↩ مرتجع شراء نقدي (استرداد فوري من المورد)';
      case 'return_ajel':
        return '↩ مرتجع شراء آجل (خصم من مستحقات المورد)';
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button
            onClick={() => openCreateModal('nagdi')}
            className="min-h-[42px] bg-[#2e7d32] hover:bg-[#1b5e20] active:bg-[#124116] text-white px-3 sm:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
          >
            ➕ شراء نقدي
          </button>
          <button
            onClick={() => openCreateModal('ajel')}
            className="min-h-[42px] bg-[#f57f17] hover:bg-[#e65100] active:bg-[#b74100] text-white px-3 sm:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
          >
            ➕ شراء أجل
          </button>
          <button
            onClick={() => openCreateModal('return_nagdi')}
            className="min-h-[42px] bg-[#c62828] hover:bg-[#b71c1c] active:bg-[#8e1414] text-white px-3 sm:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
          >
            ↩ مرتجع نقدي
          </button>
          <button
            onClick={() => openCreateModal('return_ajel')}
            className="min-h-[42px] bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white px-3 sm:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
          >
            ↩ مرتجع أجل
          </button>
          <button
            onClick={handlePrintPurchasesList}
            className="min-h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
            title="طباعة سجل فواتير المشتريات"
          >
            🖨️ طباعة السجل
          </button>
          <button
            onClick={handleExportPurchasesExcel}
            className="min-h-[42px] bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
            title="تصدير المشتريات إلى Excel"
          >
            📊 Excel
          </button>
        </div>
        <div className="w-full sm:w-auto min-w-[220px]">
          <input
            type="text"
            placeholder="🔍 بحث برقم الفاتورة أو اسم المورد..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[42px] px-3.5 py-2 border-2 border-gray-200 rounded-xl text-xs focus:border-[#1a237e] focus:outline-none"
          />
        </div>
      </div>

      {/* Mobile Card List View (< md) */}
      <div className="block md:hidden space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">
            لا توجد فواتير مشتريات مسجلة
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3 hover:border-indigo-300 transition"
            >
              {/* Top Row: Invoice ID, Date & Type Badge */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div
                  onClick={() => {
                    setSelectedInvoice(inv);
                    setActiveModal('view');
                  }}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-[#1a237e] font-black text-sm">#{inv.id}</span>
                  <span className="text-slate-400 text-xs">| {inv.date}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    inv.type === 'nagdi'
                      ? 'bg-emerald-100 text-emerald-800'
                      : inv.type === 'ajel'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {inv.type === 'nagdi'
                    ? 'نقدي'
                    : inv.type === 'ajel'
                    ? 'آجل'
                    : inv.type === 'return_nagdi'
                    ? 'مرتجع نقدي'
                    : 'مرتجع أجل'}
                </span>
              </div>

              {/* Middle Info: Supplier & Financials */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{inv.supplierName}</div>
                  {inv.salesRep && (
                    <div className="text-[11px] text-indigo-700 font-medium mt-0.5">👔 مسؤول: {inv.salesRep}</div>
                  )}
                  {inv.notes && (
                    <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">📝 {inv.notes}</div>
                  )}
                  {inv.type === 'ajel' && inv.remainingAmount !== undefined && (
                    <div className="text-[11px] mt-1">
                      {inv.remainingAmount > 0 ? (
                        <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          متبقي للمورد: {inv.remainingAmount.toFixed(2)} ج.م
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                          ✓ مسددة بالكامل
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-left shrink-0">
                  <div className="text-xs text-slate-500">القيمة الإجمالية</div>
                  <div className="font-black text-[#1a237e] text-base font-mono">
                    {(inv.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                  </div>
                </div>
              </div>

              {/* Action Buttons with 44px min-height */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                {inv.type === 'ajel' && (inv.remainingAmount ?? (inv.total - (inv.paidAmount || 0))) > 0 && (
                  <button
                    onClick={() => handleOpenPayModal(inv)}
                    className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 shadow-xs"
                    title="تسديد دفعة للمورد"
                  >
                    💰 سداد
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedInvoice(inv);
                    setActiveModal('view');
                  }}
                  className="min-h-[44px] bg-slate-100 hover:bg-slate-200 text-[#1a237e] font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
                >
                  📋 عرض
                </button>
                <button
                  onClick={() => openEditModal(inv)}
                  className="min-h-[44px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
                >
                  ✏️ تعديل
                </button>
                <button
                  onClick={() => handlePrintInvoice(inv)}
                  className="min-h-[44px] bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
                >
                  🖨️ طباعة
                </button>
                <button
                  onClick={() => handleDeleteInvoice(inv.id)}
                  className="min-h-[44px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
                >
                  🗑️ حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invoices Desktop Table (>= md) */}
      <div className="hidden md:block bg-white rounded-2xl p-4 shadow-xs overflow-x-auto">
        <table className="w-full text-right text-xs md:text-sm border-collapse">
          <thead>
            <tr className="bg-[#1a237e] text-white">
              <th className="p-3 rounded-r-lg">رقم الفاتورة</th>
              <th className="p-3">المورد</th>
              <th className="p-3">التاريخ</th>
              <th className="p-3">القيمة (ج.م)</th>
              <th className="p-3">المسدد / المتبقي</th>
              <th className="p-3">النوع</th>
              <th className="p-3 rounded-l-lg">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  لا توجد فواتير مشتريات مسجلة
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const rem = inv.remainingAmount ?? (inv.type === 'ajel' ? inv.total - (inv.paidAmount || 0) : 0);
                const paid = inv.paidAmount ?? (inv.type === 'nagdi' ? inv.total : 0);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setActiveModal('view');
                      }}
                      className="p-3 text-[#1a237e] font-bold cursor-pointer hover:underline"
                    >
                      #{inv.id}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{inv.supplierName}</div>
                      {inv.salesRep && (
                        <div className="text-[11px] text-indigo-700 font-medium">👔 {inv.salesRep}</div>
                      )}
                      {inv.notes && (
                        <div className="text-[10px] text-gray-500 italic truncate max-w-[160px]" title={inv.notes}>
                          📝 {inv.notes}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{inv.date}</td>
                    <td className="p-3 font-semibold">{inv.total.toFixed(2)}</td>
                    <td className="p-3">
                      {inv.type === 'ajel' ? (
                        <div className="text-xs space-y-0.5">
                          <div className="text-emerald-700 font-semibold">مسدد: {paid.toFixed(2)}</div>
                          {rem > 0 ? (
                            <div className="text-rose-600 font-bold">متبقي: {rem.toFixed(2)}</div>
                          ) : (
                            <div className="text-emerald-600 font-bold text-[11px]">✓ مسددة بالكامل</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">سداد فوري</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-[11px] font-bold ${
                          inv.type === 'nagdi'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.type === 'ajel'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.type === 'nagdi'
                          ? 'نقدي'
                          : inv.type === 'ajel'
                          ? 'آجل'
                          : inv.type === 'return_nagdi'
                          ? 'مرتجع نقدي'
                          : 'مرتجع أجل'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {inv.type === 'ajel' && rem > 0 && (
                          <button
                            onClick={() => handleOpenPayModal(inv)}
                            className="bg-emerald-600 text-white p-2 rounded-lg text-xs hover:bg-emerald-700 transition cursor-pointer"
                            title="تسديد دفعة للمورد"
                          >
                            💰
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setActiveModal('view');
                          }}
                          className="bg-[#1a237e] text-white p-2 rounded-lg text-xs hover:bg-[#0d47a1] transition cursor-pointer"
                          title="عرض الفاتورة"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => openEditModal(inv)}
                          className="bg-indigo-600 text-white p-2 rounded-lg text-xs hover:bg-indigo-700 transition cursor-pointer"
                          title="تعديل الفاتورة"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handlePrintInvoice(inv)}
                          className="bg-teal-700 text-white p-2 rounded-lg text-xs hover:bg-teal-800 transition cursor-pointer"
                          title="طباعة"
                        >
                          🖨️
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="bg-[#c62828] text-white p-2 rounded-lg text-xs hover:bg-[#b71c1c] transition cursor-pointer"
                          title="حذف"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Purchase Invoice Creation */}
      <Modal
        isOpen={activeModal === 'create'}
        title={getTitleForModal()}
        onClose={() => setActiveModal(null)}
        footer={
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <button
              type="button"
              onClick={handleSaveInvoice}
              className="min-h-[46px] bg-[#2e7d32] hover:bg-[#1b5e20] active:bg-[#124116] text-white px-8 py-3 rounded-xl font-black text-sm cursor-pointer transition shadow-md flex items-center justify-center gap-2 flex-1 sm:flex-initial"
            >
              <span>💾</span> حفظ فاتورة المشتريات وتحديث المخزون
            </button>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="min-h-[46px] bg-gray-400 hover:bg-gray-500 active:bg-gray-600 text-white px-6 py-3 rounded-xl font-bold text-sm cursor-pointer transition flex-1 sm:flex-initial text-center"
            >
              إلغاء
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs md:text-sm">
          {/* Quick Top Bar with Save Button */}
          <div className="flex justify-between items-center bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-xl">
            <span className="text-emerald-900 font-bold text-xs flex items-center gap-1.5">
              <span>📌</span> {getTitleForModal()}
            </span>
            <button
              type="button"
              onClick={handleSaveInvoice}
              className="bg-[#2e7d32] hover:bg-[#1b5e20] active:bg-[#124116] text-white px-4 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition shadow-xs flex items-center gap-1"
            >
              <span>💾</span> حفظ الفاتورة الآن
            </button>
          </div>

          {/* Header Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <label className="block font-bold mb-1 text-gray-700">المورد / الشركة</label>
              <input
                type="text"
                placeholder="ابحث باسم المورد أو هاتفه..."
                value={supplierName}
                onFocus={() => setShowSupplierDropdown(true)}
                onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSupplierName(val);
                  setShowSupplierDropdown(true);
                  const matched = appData.suppliers.find(
                    (s) => s.name === val || (s.phone && s.phone === val)
                  );
                  if (matched) {
                    setSupplierName(matched.name);
                    setPhone(matched.phone || '');
                  }
                }}
                className="w-full p-2 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none text-xs md:text-sm"
              />
              {showSupplierDropdown && (
                <div className="absolute top-full right-0 left-0 z-50 bg-white border border-indigo-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto mt-1 divide-y divide-gray-100">
                  {filteredSuppliersForName.length === 0 ? (
                    <div className="p-2.5 text-xs text-gray-500 text-center">
                      مورد جديد: <strong>"{supplierName}"</strong> (سيتم تسجيله بالاسم والرقم عند الحفظ)
                    </div>
                  ) : (
                    filteredSuppliersForName.map((s) => (
                      <div
                        key={s.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSupplierName(s.name);
                          setPhone(s.phone || '');
                          setShowSupplierDropdown(false);
                          if (s.representatives && s.representatives.length > 0) {
                            const primary = s.representatives.find((r) => r.isPrimary) || s.representatives[0];
                            setSupplierRepId(primary.id);
                            setSupplierRepName(primary.name);
                            setSupplierRepPhone(primary.phone);
                          }
                        }}
                        className="p-2.5 hover:bg-indigo-50 cursor-pointer flex justify-between items-center text-xs transition"
                      >
                        <div>
                          <span className="font-bold text-[#1a237e] block">🏢 {s.name}</span>
                          <span className="text-gray-500 text-[11px]">📞 {s.phone || 'بدون رقم مسجل'}</span>
                        </div>
                        {s.balance !== undefined && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.balance > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            الرصيد: {s.balance.toFixed(2)} ج.م
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block font-bold mb-1 text-gray-700">الهاتف</label>
              <input
                type="text"
                placeholder="رقم الهاتف..."
                value={phone}
                onFocus={() => setShowPhoneDropdown(true)}
                onBlur={() => setTimeout(() => setShowPhoneDropdown(false), 200)}
                onChange={(e) => {
                  const val = e.target.value;
                  setPhone(val);
                  setShowPhoneDropdown(true);
                  const matched = appData.suppliers.find(
                    (s) => (s.phone && s.phone === val) || s.name === val
                  );
                  if (matched) {
                    setSupplierName(matched.name);
                    setPhone(matched.phone || val);
                  }
                }}
                className="w-full p-2 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none text-xs md:text-sm"
              />
              {showPhoneDropdown && (
                <div className="absolute top-full right-0 left-0 z-50 bg-white border border-indigo-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto mt-1 divide-y divide-gray-100">
                  {filteredSuppliersForPhone.length === 0 ? (
                    <div className="p-2.5 text-xs text-gray-500 text-center">
                      رقم جديد: <strong>"{phone}"</strong>
                    </div>
                  ) : (
                    filteredSuppliersForPhone.map((s) => (
                      <div
                        key={s.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSupplierName(s.name);
                          setPhone(s.phone || '');
                          setShowPhoneDropdown(false);
                          if (s.representatives && s.representatives.length > 0) {
                            const primary = s.representatives.find((r) => r.isPrimary) || s.representatives[0];
                            setSupplierRepId(primary.id);
                            setSupplierRepName(primary.name);
                            setSupplierRepPhone(primary.phone);
                          }
                        }}
                        className="p-2.5 hover:bg-indigo-50 cursor-pointer flex justify-between items-center text-xs transition"
                      >
                        <div>
                          <span className="font-bold text-[#1a237e] block">📞 {s.phone || 'بدون رقم'}</span>
                          <span className="text-gray-600 text-[11px]">🏢 {s.name}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold mb-1 text-gray-700">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none text-xs md:text-sm"
              />
            </div>
          </div>

          {/* Supplier Representative / Delegate Section */}
          <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                <span>👥</span> مندوب التوريد / جهة الاتصال بالمورد <span className="text-gray-500 font-normal">(يظهر بالفاتورة المطبوعة)</span>
              </label>
              {(() => {
                const currentSupp = appData.suppliers.find(
                  (s) => s.name.trim().toLowerCase() === supplierName.trim().toLowerCase()
                );
                if (currentSupp?.representatives && currentSupp.representatives.length > 0) {
                  return (
                    <select
                      value={supplierRepId}
                      onChange={(e) => {
                        const repId = e.target.value;
                        setSupplierRepId(repId);
                        const rep = currentSupp.representatives?.find((r) => r.id === repId);
                        if (rep) {
                          setSupplierRepName(rep.name);
                          setSupplierRepPhone(rep.phone);
                        } else if (!repId) {
                          setSupplierRepName('');
                          setSupplierRepPhone('');
                        }
                      }}
                      className="bg-white border border-indigo-300 rounded-lg text-xs font-bold text-indigo-900 px-2 py-1 focus:outline-none"
                    >
                      <option value="">-- اختيار من مناديب المورد ({currentSupp.representatives.length}) --</option>
                      {currentSupp.representatives.map((r) => (
                        <option key={r.id} value={r.id}>
                          👤 {r.name} ({r.phone}) {r.jobTitle ? `- ${r.jobTitle}` : ''}
                        </option>
                      ))}
                    </select>
                  );
                }
                return null;
              })()}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <input
                  type="text"
                  placeholder="اسم مندوب المورد (مثال: محمد علي)..."
                  value={supplierRepName}
                  onChange={(e) => setSupplierRepName(e.target.value)}
                  className="w-full p-2 bg-white border border-indigo-200 rounded-lg focus:border-indigo-600 focus:outline-none text-xs font-medium"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="رقم هاتف مندوب المورد (مثال: 01012345678)..."
                  value={supplierRepPhone}
                  onChange={(e) => setSupplierRepPhone(e.target.value)}
                  className="w-full p-2 bg-white border border-indigo-200 rounded-lg focus:border-indigo-600 focus:outline-none text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Sales / Supply Rep and Notes Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
            <div>
              <label className="block font-bold mb-1 text-gray-700 flex items-center gap-1">
                <span>👔</span> مندوب المبيعات / التوريد <span className="text-gray-400 font-normal">(اختياري)</span>
              </label>
              <input
                type="text"
                placeholder="اسم المندوب أو مسؤول التوريد..."
                list="salesRepsListPurchases"
                value={salesRep}
                onChange={(e) => setSalesRep(e.target.value)}
                className="w-full p-2 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none bg-white text-xs md:text-sm"
              />
              <datalist id="salesRepsListPurchases">
                {(appData.salesReps || []).map((r) => (
                  <option key={r.id} value={r.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block font-bold mb-1 text-gray-700 flex items-center gap-1">
                <span>📝</span> ملاحظات إضافية <span className="text-gray-400 font-normal">(اختياري)</span>
              </label>
              <input
                type="text"
                placeholder="أي ملاحظات أو بيانات إضافية للمورد أو العملية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none bg-white text-xs md:text-sm"
              />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Add Item Row */}
          <div>
            <h4 className="font-bold text-[#1a237e] text-xs sm:text-sm mb-2">إضافة أصناف للفاتورة</h4>
            <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-3 items-end mb-2">
              <div className="relative col-span-2 sm:col-span-6">
                <label className="block text-xs font-semibold mb-1 text-gray-700">الصنف</label>
                <input
                  type="text"
                  placeholder="ابحث باسم الصنف أو الكود..."
                  value={itemName}
                  onFocus={() => setShowItemDropdown(true)}
                  onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemName(val);
                    setShowItemDropdown(true);
                    const matched = appData.items.find((i) => i.name === val);
                    if (matched) {
                      setItemPrice(matched.purchasePrice.toString());
                      if (!itemQty) setItemQty('1');
                    }
                  }}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none text-xs md:text-sm"
                />
                {showItemDropdown && (
                  <div className="absolute top-full right-0 left-0 z-50 bg-white border border-indigo-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto mt-1 divide-y divide-gray-100">
                    {filteredItemsForSearch.length === 0 ? (
                      <div className="p-2.5 text-xs text-gray-500 text-center">
                        صنف جديد: <strong>"{itemName}"</strong>
                      </div>
                    ) : (
                      filteredItemsForSearch.map((i) => (
                        <div
                          key={i.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setItemName(i.name);
                            setItemPrice(i.purchasePrice.toString());
                            if (!itemQty) setItemQty('1');
                            setShowItemDropdown(false);
                          }}
                          className="p-2.5 hover:bg-indigo-50 cursor-pointer flex justify-between items-center text-xs transition"
                        >
                          <div>
                            <span className="font-bold text-[#1a237e] block">📦 {i.name}</span>
                            <span className="text-gray-500 text-[11px]">المخزون الحالي: {i.quantity || 0}</span>
                          </div>
                          <span className="font-bold text-[#2e7d32]">{i.purchasePrice.toFixed(2)} ج.م</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">الكمية</label>
                <input
                  type="number"
                  placeholder="0"
                  step="any"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none text-xs md:text-sm font-mono font-bold"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">سعر الشراء (ج.م)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="any"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none text-xs md:text-sm font-mono font-bold"
                />
              </div>
              <div className="col-span-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full min-h-[44px] bg-[#1a237e] hover:bg-[#0d47a1] active:bg-[#002171] text-white px-3 py-2.5 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <span>➕</span> إضافة الصنف
                </button>
              </div>
            </div>
          </div>

          {/* Items Container - Dual Mobile Cards / Desktop Table */}
          {tempItems.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-gray-400 text-xs">
              لم يتم إضافة أي أصناف إلى الفاتورة بعد
            </div>
          ) : (
            <div>
              {/* Mobile Card List for Added Items */}
              <div className="block sm:hidden space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {tempItems.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>الكمية: <strong className="font-mono text-slate-800">{item.qty}</strong></span>
                        <span>×</span>
                        <span>{item.price.toFixed(2)} ج.م</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold font-mono text-[#1a237e]">{item.total.toFixed(2)} ج.م</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm transition"
                        title="حذف الصنف"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table for Added Items */}
              <div className="hidden sm:block border border-gray-200 rounded-xl overflow-x-auto max-h-48">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">الصنف</th>
                      <th className="p-2">الكمية</th>
                      <th className="p-2">سعر الشراء</th>
                      <th className="p-2">الإجمالي</th>
                      <th className="p-2 text-center">إزالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tempItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900">{item.name}</td>
                        <td className="p-2 font-mono font-semibold">{item.qty}</td>
                        <td className="p-2 font-mono">{item.price.toFixed(2)} ج.م</td>
                        <td className="p-2 font-bold font-mono text-[#1a237e]">{item.total.toFixed(2)} ج.م</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs transition cursor-pointer font-bold"
                            title="حذف الصنف"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Discounts & Tax */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">خصم (%)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border-2 border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">ضريبة (%)</label>
              <input
                type="number"
                value={tax}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border-2 border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">رسوم إضافية (ج.م)</label>
              <input
                type="number"
                value={fees}
                onChange={(e) => setFees(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border-2 border-gray-200 rounded-xl"
              />
            </div>
          </div>

          {/* Financial Settlement Section according to Operation Type */}
          <div className="border border-slate-200 bg-slate-50/80 p-3.5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>💳</span>
                {modalType === 'nagdi' && 'تسوية الشراء النقدي (سداد فوري للمورد بالكامل)'}
                {modalType === 'ajel' && 'تسوية الشراء الآجل والذمم (دفعة مقدمة / متبقي للمورد)'}
                {modalType === 'return_nagdi' && 'تسوية استرداد مرتجع المشتريات نقداً فوراً'}
                {modalType === 'return_ajel' && 'تسوية مرتجع المشتريات الآجل (خصم من مستحقات المورد)'}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  modalType === 'nagdi'
                    ? 'bg-emerald-100 text-emerald-800'
                    : modalType === 'ajel'
                    ? 'bg-amber-100 text-amber-900'
                    : modalType === 'return_nagdi'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-purple-100 text-purple-900'
                }`}
              >
                {modalType === 'nagdi'
                  ? '🟢 شراء نقدي'
                  : modalType === 'ajel'
                  ? '🟠 شراء آجل (ذمم موردين)'
                  : modalType === 'return_nagdi'
                  ? '🔴 مرتجع نقدي'
                  : '⚫ مرتجع آجل'}
              </span>
            </div>

            {/* Inputs based on type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* If Ajel or Return Ajel: Show Paid / Downpayment amount input */}
              {(modalType === 'ajel' || modalType === 'return_ajel') && (
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">
                    {modalType === 'ajel'
                      ? 'المسدد للمورد مقدماً / نقداً الآن (ج.م)'
                      : 'المسترد نقداً من المورد الآن إن وجد (ج.م)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={calculateTotals().total}
                    step="any"
                    placeholder="0.00"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    className="w-full p-2 border-2 border-amber-300 rounded-xl focus:border-[#1a237e] focus:outline-none bg-white text-xs md:text-sm font-mono font-bold"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">
                    {modalType === 'ajel'
                      ? 'أدخل المبلغ المسدد للمورد الآن (أو اتركه 0 لتسجيل الفاتورة آجلة بالكامل كذمة للمورد)'
                      : 'أدخل أي نقدية استرددتها من المورد فعلياً (أو اتركه 0 ليتم خصم كامل المرتجع من حسابه)'}
                  </div>
                </div>
              )}

              {/* Payment Method Selector */}
              <div className={modalType === 'nagdi' || modalType === 'return_nagdi' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-bold mb-1 text-slate-700">
                  {modalType === 'nagdi'
                    ? 'وسيلة دفع الفاتورة للمورد (الخزينة / الحساب البنكي)'
                    : modalType === 'return_nagdi'
                    ? 'وسيلة استلام قيمة المرتجع من المورد'
                    : 'وسيلة سداد / استلام النقدية'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none bg-white text-xs md:text-sm font-semibold"
                >
                  <option value="drawer">💵 نقدي (الدرج / الخزينة الرئيسية)</option>
                  <option value="vodafone">📱 فودافون كاش (محفظة إلكترونية)</option>
                  <option value="instapay">⚡ إنستاباي (InstaPay)</option>
                  <option value="bank">💳 حساب بنكي</option>
                </select>
              </div>
            </div>

            {/* Live Financial Impact Summary Box */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[10px]">إجمالي الفاتورة / المرتجع</span>
                <span className="font-bold font-mono text-slate-900 text-sm">
                  {calculateTotals().total.toFixed(2)} ج.م
                </span>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="text-emerald-700 block text-[10px]">
                  {modalType.startsWith('return') ? 'المسترد نقداً من المورد' : 'المسدد نقداً للمورد الآن'}
                </span>
                <span className="font-bold font-mono text-emerald-800 text-sm">
                  {calculateTotals().effectivePaid.toFixed(2)} ج.م
                </span>
                <span className="text-[10px] text-emerald-600 block truncate">
                  ({getMethodLabel(paymentMethod)})
                </span>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 col-span-2 sm:col-span-1">
                <span className="text-amber-800 block text-[10px]">
                  {modalType === 'ajel'
                    ? 'المتبقي كمديونية للمورد (ذمم موردين)'
                    : modalType === 'return_ajel'
                    ? 'المخصوم من مستحقات المورد'
                    : 'المتبقي كذمم'}
                </span>
                <span
                  className={`font-bold font-mono text-sm ${
                    calculateTotals().effectiveRemaining > 0 ? 'text-rose-700' : 'text-slate-700'
                  }`}
                >
                  {calculateTotals().effectiveRemaining.toFixed(2)} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* Sticky Save & Action Bar */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t-2 border-slate-200 mt-4 flex flex-col sm:flex-row gap-2 shadow-lg -mx-2 px-2 z-20">
            <button
              type="button"
              onClick={handleSaveInvoice}
              className="min-h-[46px] bg-[#2e7d32] hover:bg-[#1b5e20] active:bg-[#124116] text-white px-8 py-3 rounded-xl font-black text-sm cursor-pointer transition shadow-md flex items-center justify-center gap-2 flex-1 sm:flex-initial"
            >
              <span>💾</span> حفظ فاتورة المشتريات وتحديث المخزون
            </button>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="min-h-[46px] bg-gray-400 hover:bg-gray-500 active:bg-gray-600 text-white px-6 py-3 rounded-xl font-bold text-sm cursor-pointer transition flex-1 sm:flex-initial text-center"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal for Supplier Payment (Pay Modal) */}
      <Modal
        isOpen={activeModal === 'pay'}
        title={`💰 تسديد دفعة لمورد - فاتورة مشتريات #${selectedInvoice?.id}`}
        onClose={() => setActiveModal(null)}
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs md:text-sm">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-1 text-slate-800">
              <div className="flex justify-between">
                <span>المورد:</span>
                <span className="font-bold">{selectedInvoice.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span>إجمالي الفاتورة:</span>
                <span className="font-mono font-bold">{selectedInvoice.total.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span>المسدد سابقاً:</span>
                <span className="font-mono text-emerald-700 font-bold">
                  {(selectedInvoice.paidAmount || 0).toFixed(2)} ج.م
                </span>
              </div>
              <div className="flex justify-between border-t border-amber-200 pt-1 text-rose-700 font-bold">
                <span>المبلغ المتبقي للمورد:</span>
                <span className="font-mono">
                  {(selectedInvoice.total - (selectedInvoice.paidAmount || 0)).toFixed(2)} ج.م
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-gray-700">المبلغ المراد سداده للمورد (ج.م)</label>
              <input
                type="number"
                min="0.01"
                max={selectedInvoice.total - (selectedInvoice.paidAmount || 0)}
                step="any"
                value={payAmount}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 border-2 border-emerald-400 rounded-xl focus:border-[#1a237e] focus:outline-none font-mono font-bold text-base"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-gray-700">وسيلة السداد والصرف</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as any)}
                className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none font-semibold"
              >
                <option value="drawer">💵 نقدي (الدرج / الخزينة الرئيسية)</option>
                <option value="vodafone">📱 فودافون كاش (محفظة إلكترونية)</option>
                <option value="instapay">⚡ إنستاباي (InstaPay)</option>
                <option value="bank">💳 حساب بنكي</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={handleConfirmPayment}
                className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-xs flex-1 sm:flex-initial text-center cursor-pointer"
              >
                ✓ تأكيد سداد {payAmount.toFixed(2)} ج.م
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="min-h-[44px] bg-gray-400 hover:bg-gray-500 text-white px-6 py-2.5 rounded-xl font-bold transition flex-1 sm:flex-initial text-center cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal for Purchase Invoice View - Using the standard template */}
      <Modal
        isOpen={activeModal === 'view'}
        title={`📋 تفاصيل فاتورة الشراء #${selectedInvoice?.id}`}
        onClose={() => setActiveModal(null)}
      >
        {selectedInvoice && (
          <InvoiceCardTemplate
            invoice={selectedInvoice}
            isSales={false}
            settings={appData.settings}
            onPrint={() => handlePrintInvoice(selectedInvoice)}
            onClose={() => setActiveModal(null)}
            onEdit={() => {
              setActiveModal(null);
              openEditModal(selectedInvoice);
            }}
            onDelete={() => {
              setActiveModal(null);
              handleDeleteInvoice(selectedInvoice.id);
            }}
          />
        )}
      </Modal>
    </div>
  );
};
