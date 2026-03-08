import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import 'jspdf-autotable';
import { Box, Paper, Typography, Button } from '@mui/material';

const TotalSaleReport = () => {
  const userData = useSelector((s) => s.user);
  const role = userData?.user?.role;
  const currentUserId = userData?.user?._id;
  const [draws, setDraws] = useState([]);
  const [selectedDraw, setSelectedDraw] = useState(null);
  const [drawDate, setDrawDate] = useState(new Date().toISOString().split('T')[0]);
  const [drawTime, setDrawTime] = useState('11 AM');
  const [prizeType, setPrizeType] = useState('All');
  // Single control: ledger will store category values 'general'|'demand'|'overlimit'
  const [ledger, setLedger] = useState('general');
  const [winningNumbers, setWinningNumbers] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const toLocalISODate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getSlotHourMinute = (slot) => {
    if (!slot) return null;
    if (typeof slot.hour === 'number' && !Number.isNaN(slot.hour)) {
      return { hour24: slot.hour, minute: 0 };
    }
    const raw = String(slot.title || slot.label || '').trim();
    if (!raw) return null;

    const ampm = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (ampm) {
      const h = parseInt(ampm[1], 10);
      const m = parseInt(ampm[2] || '0', 10);
      const period = String(ampm[3]).toUpperCase();
      let hour24 = h % 12;
      if (period === 'PM') hour24 += 12;
      return { hour24, minute: m };
    }

    const hhmm = raw.match(/\b(\d{1,2}):(\d{2})\b/);
    if (hhmm) {
      return { hour24: parseInt(hhmm[1], 10), minute: parseInt(hhmm[2], 10) };
    }

    const hOnly = raw.match(/\b(\d{1,2})\b/);
    if (hOnly) return { hour24: parseInt(hOnly[1], 10), minute: 0 };
    return null;
  };

  const getSlotCloseAt = useCallback((slot, baseDate = drawDate) => {
    const hm = getSlotHourMinute(slot);
    if (!hm || !baseDate) return null;
    const [y, m, d] = String(baseDate).split('-').map(Number);
    if (!y || !m || !d) return null;
    const closeAt = new Date(y, m - 1, d, hm.hour24, hm.minute, 0, 0);
    closeAt.setMinutes(closeAt.getMinutes() - 10);
    return closeAt;
  }, [drawDate]);

  const isSlotClosedByTime = useCallback((slot) => {
    const closeAt = getSlotCloseAt(slot, drawDate);
    if (!closeAt) return false;
    return currentTime.getTime() >= closeAt.getTime();
  }, [currentTime, drawDate, getSlotCloseAt]);

  const isSlotClosed = useCallback((slot) => {
    if (!slot) return false;
    if (slot.isActive === true) return false;
    if (slot.isActive === false) return true;
    if (slot.isExpired === true) return true;
    return isSlotClosedByTime(slot);
  }, [isSlotClosedByTime]);

  const fetchTimeSlots = useCallback(async () => {
    try {
      const res = await axios.get('/api/v1/timeslots', { params: { date: drawDate } });
      const slots = res.data?.timeSlots || res.data || [];
      const list = Array.isArray(slots) ? slots : [];
      setDraws(list);
      setSelectedDraw((prev) => {
        if (prev && prev._id) {
          const refreshed = list.find((s) => String(s._id) === String(prev._id));
          return refreshed || null;
        }
        if (list.length > 0) {
          const ordered = [...list].sort((a, b) => {
            const aa = getSlotHourMinute(a);
            const bb = getSlotHourMinute(b);
            const av = (aa?.hour24 ?? 0) * 60 + (aa?.minute ?? 0);
            const bv = (bb?.hour24 ?? 0) * 60 + (bb?.minute ?? 0);
            return av - bv;
          });
          return ordered.find((s) => isSlotClosed(s)) || ordered[0] || null;
        }
        return null;
      });
    } catch (err) {
      console.error('Failed to fetch timeslots', err);
      setDraws([]);
    }
  }, [drawDate, isSlotClosed]);

  useEffect(() => {
    fetchTimeSlots();
  }, [fetchTimeSlots]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Live refresh timeslots when admin updates them.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onTimeSlotsUpdated = () => { fetchTimeSlots(); };
    const onStorage = (e) => {
      if (e.key === 'timeslots:lastUpdated') fetchTimeSlots();
    };
    const onFocus = () => { fetchTimeSlots(); };
    const intervalId = window.setInterval(() => {
      // Polling fallback for cross-machine updates.
      fetchTimeSlots();
    }, 20000);
    window.addEventListener('timeslots:updated', onTimeSlotsUpdated);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('timeslots:updated', onTimeSlotsUpdated);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchTimeSlots]);

  const sortedDraws = useMemo(() => {
    const list = Array.isArray(draws) ? [...draws] : [];
    return list.sort((a, b) => {
      const aa = getSlotHourMinute(a);
      const bb = getSlotHourMinute(b);
      const av = (aa?.hour24 ?? 0) * 60 + (aa?.minute ?? 0);
      const bv = (bb?.hour24 ?? 0) * 60 + (bb?.minute ?? 0);
      return av - bv;
    });
  }, [draws]);

  const closedDraws = useMemo(
    () => sortedDraws.filter((slot) => isSlotClosed(slot)),
    [sortedDraws, isSlotClosed]
  );

  useEffect(() => {
    if (!selectedDraw) {
      if (closedDraws.length) setSelectedDraw(closedDraws[0]);
      return;
    }
    const exists = closedDraws.some((d) => String(d._id) === String(selectedDraw._id));
    if (!exists) setSelectedDraw(closedDraws[0] || null);
  }, [selectedDraw, closedDraws]);

  useEffect(() => {
    if (selectedDraw?.draw_date) {
      const iso = toLocalISODate(selectedDraw.draw_date);
      if (iso) setDrawDate(iso);
    }
  }, [selectedDraw]);

  // Helper: format a timeslot object to 12-hour label (e.g. 13 -> "1PM" or label "13:00" -> "1PM")
  const formatTimeSlotLabel = (slot) => {
    if (!slot) return "";
    if (slot.title && typeof slot.title === 'string') return slot.title;
    const label = slot.label || (typeof slot.hour !== 'undefined' ? `${String(slot.hour).padStart(2,'0')}:00` : null);
    let hourNum = null;
    if (label && typeof label === 'string') {
      const m = label.match(/^(\d{1,2})/);
      if (m) hourNum = parseInt(m[1], 10);
    }
    if (hourNum === null && typeof slot.hour === 'number') hourNum = slot.hour;
    if (hourNum === null) return label || '';
    const suffix = hourNum < 12 ? 'AM' : 'PM';
    const hour12 = hourNum % 12 === 0 ? 12 : hourNum % 12;
    return `${hour12}${suffix}`;
  };

  const fetchCombinedVoucherData = async (drawArg = null) => {
    try {
      const params = {};
      if (role === 'user' && currentUserId) params.userId = currentUserId;
      // Always include a date parameter so backend filters by date + timeslot/timeSlotId
      if (drawArg && drawArg.draw_date) params.date = (typeof drawArg.draw_date === 'string') ? drawArg.draw_date.split('T')[0] : new Date(drawArg.draw_date).toISOString().split('T')[0];
      else if (selectedDraw && selectedDraw.draw_date) params.date = (typeof selectedDraw.draw_date === 'string') ? selectedDraw.draw_date.split('T')[0] : new Date(selectedDraw.draw_date).toISOString().split('T')[0];
      else params.date = drawDate;
      if (drawArg && drawArg._id) params.timeSlotId = drawArg._id;
      else if (selectedDraw && selectedDraw._id) params.timeSlotId = selectedDraw._id;
      else params.timeSlot = drawTime;
      // enforce server-side closed check for combined voucher generation
      params.requireClosed = true;

      // Call the backend combined endpoint which returns Data docs populated with user info
      const res = await axios.get('/api/v1/data/get-combined-voucher-data', {
        params,
      });
      return res.data.data || [];
    } catch (err) {
      console.error('Failed to fetch combined voucher data', err);
      toast.error('Failed to fetch combined voucher data');
      return [];
    }
  };

  const getWinningNumbers = async (date) => {
    try {
      const params = {};
      const safeISODate = (d) => { try { if (!d) return ''; const dt = typeof d === 'string' ? new Date(d) : new Date(d); if (isNaN(dt.getTime())) return ''; return dt.toISOString().split('T')[0]; } catch (e) { return ''; } };
      if (selectedDraw && selectedDraw.draw_date) params.date = safeISODate(selectedDraw.draw_date);
      else params.date = safeISODate(date) || date;
      const response = await axios.get('/api/v1/data/get-winning-numbers', { params });
      if (response.data && response.data.winningNumbers) {
        const formattedNumbers = response.data.winningNumbers.map((item) => ({
          number: item.number,
          type: item.type,
          color: item.type === 'first' ? [255, 0, 0] : item.type === 'second' ? [0, 0, 255] : [128, 0, 128],
        }));

        // Deduplicate by 6-digit number + type so the same
        // winning number entered twice does not change coloring
        // or any downstream prize calculations.
        const uniqueMap = new Map();
        formattedNumbers.forEach((w) => {
          const key = `${w.number}-${w.type}`;
          if (!uniqueMap.has(key)) uniqueMap.set(key, w);
        });
        const uniqueWinningNumbers = Array.from(uniqueMap.values());

        setWinningNumbers(uniqueWinningNumbers);
        return uniqueWinningNumbers;
      }
      setWinningNumbers([]);
      return [];
    } catch (err) {
      console.error('Error fetching winning numbers', err);
      setWinningNumbers([]);
      return [];
    }
  };

  const checkPositionalMatch = (entry, winningNumber) => {
    const cleanEntry = entry.toString().trim();
    const win = String(winningNumber ?? '').trim().padStart(4, '0').slice(-4);

    // Strict single-digit positional rules:
    // 7 -> pos1, +7 -> pos2, ++7 -> pos3, +++7 -> pos4
    const strictSingleDigit = cleanEntry.match(/^(\+{0,3})(\d)$/);
    if (strictSingleDigit) {
      const plusCount = strictSingleDigit[1].length;
      const digit = strictSingleDigit[2];
      return win[plusCount] === digit;
    }

    if (cleanEntry.includes('+')) {
      // +NN means match positions 2 and 3 in a 4-digit winning number.
      // Example: +13 matches 0137 because win.slice(1, 3) === "13".
      if (cleanEntry.length === 3 && cleanEntry.match(/^\+\d\d$/)) {
        const digits = cleanEntry.slice(1);
        if (win.slice(1, 3) === digits) {
          return true;
        }
      }

      // For 2-digit patterns like +4+6
      if (cleanEntry.length === 4 && cleanEntry.match(/^\+\d\+\d$/)) {
        const digit1 = cleanEntry[1];
        const digit3 = cleanEntry[3];
        if (winningNumber[1] === digit1 && winningNumber[3] === digit3) {
          return true;
        }
      }

      // For 3-digit patterns like +45+ (positions 2,3)
      if (cleanEntry.length === 4 && cleanEntry.match(/^\+\d\d\+$/)) {
        const digits = cleanEntry.slice(1, 3);
        if (winningNumber.slice(1, 3) === digits) {
          return true;
        }
      }

      // For patterns like 3+5+ (positions 1,3)
      if (cleanEntry.length === 4 && cleanEntry.match(/^\d\+\d\+$/)) {
        const digit1 = cleanEntry[0];
        const digit3 = cleanEntry[2];
        if (winningNumber[0] === digit1 && winningNumber[2] === digit3) {
          return true;
        }
      }

      // For patterns like 6++8 (positions 1 and 4)
      if (cleanEntry.length === 4 && cleanEntry.match(/^\d\+\+\d$/)) {
        const firstDigit = cleanEntry[0];
        const lastDigit = cleanEntry[3];
        if (winningNumber[0] === firstDigit && winningNumber[3] === lastDigit) {
          return true;
        }
      }

      // For patterns like ++56 (last two positions)
      if (cleanEntry.length === 4 && cleanEntry.match(/^\+\+\d\d$/)) {
        const digits = cleanEntry.slice(2);
        if (winningNumber.slice(2) === digits) {
          return true;
        }
      }

      // For patterns like +76+ (checking positions 2,3)
      if (cleanEntry.length === 4 && cleanEntry.match(/^\+\d\d\+$/)) {
        const digits = cleanEntry.slice(1, 3);
        if (winningNumber.slice(1, 3) === digits) {
          return true;
        }
      }

      // For patterns like 67+8 (positions 1,2,4)
      if (cleanEntry.length === 4 && cleanEntry.match(/^\d\d\+\d$/)) {
        const firstTwo = cleanEntry.slice(0, 2);
        const lastDigit = cleanEntry[3];
        if (winningNumber.slice(0, 2) === firstTwo && winningNumber[3] === lastDigit) {
          return true;
        }
      }

      // For patterns like 6+68 (positions 1,3,4)
      if (cleanEntry.length === 4 && cleanEntry.match(/^\d\+\d\d$/)) {
        const firstDigit = cleanEntry[0];
        const lastTwo = cleanEntry.slice(2);
        if (winningNumber[0] === firstDigit && winningNumber.slice(2) === lastTwo) {
          return true;
        }
      }

      // For patterns like +990 (last 3 digits)
      if (cleanEntry.length === 4 && cleanEntry.match(/^\+\d\d\d$/)) {
        const lastThreeDigits = cleanEntry.slice(1);
        if (winningNumber.slice(1) === lastThreeDigits) {
          return true;
        }
      }

      // For patterns like +99 (last 2 digits)
      if (cleanEntry.length === 3 && cleanEntry.match(/^\+\d\d$/)) {
        const lastTwoDigits = cleanEntry.slice(1);
        if (winningNumber.slice(-2) === lastTwoDigits) {
          return true;
        }
      }

      // For patterns like +9 (last digit)
      if (cleanEntry.length === 2 && cleanEntry.match(/^\+\d$/)) {
        const lastDigit = cleanEntry.slice(1);
        if (winningNumber.slice(-1) === lastDigit) {
          return true;
        }
      }

      // Pattern: +8 (match if digit appears in pos2/3/4)
      if (cleanEntry.length === 2 && cleanEntry.match(/^\+\d$/)) {
        const digit = cleanEntry[1];
        for (let i = 1; i < winningNumber.length; i++) {
          if (winningNumber[i] === digit) {
            return true;
          }
        }
      }

      // Pattern: ++8 (match if digit appears in pos3/4)
      if (cleanEntry.length === 3 && cleanEntry.match(/^\+\+\d$/)) {
        const digit = cleanEntry[2];
        for (let i = 2; i < winningNumber.length; i++) {
          if (winningNumber[i] === digit) {
            return true;
          }
        }
      }

      // Pattern: +++8 (match if digit in pos4)
      if (cleanEntry.length === 4 && cleanEntry.match(/^\+\+\+\d$/)) {
        const digit = cleanEntry[3];
        if (winningNumber[3] === digit) {
          return true;
        }
      }
    }

    // Special handling for 4-digit plain numbers (PANGORA section):
    // treat them as matching if they equal either the first 4 or the
    // last 4 digits of the 6-digit winning number.
    if (cleanEntry.length === 4 && /^\d{4}$/.test(cleanEntry)) {
      const winStr = String(winningNumber).trim();
      if (winStr.length >= 4 && winStr.slice(0, 4) === cleanEntry) {
        return true;
      }
    }

    if (cleanEntry.length >= 2 && cleanEntry.length <= 3 && /^\d+$/.test(cleanEntry)) { if (winningNumber.startsWith(cleanEntry)) return true; }
    if (cleanEntry.length === 1 && /^\d$/.test(cleanEntry)) { if (winningNumber[0] === cleanEntry) return true; }
    return false;
  };

  const getEntryColor = (entryNumber) => {
    for (const winning of winningNumbers) if (entryNumber === winning.number) return winning.color;
    for (const winning of winningNumbers) if (checkPositionalMatch(entryNumber, winning.number)) return winning.color;
    return [0,0,0];
  };

  // Format numbers consistently to 2 decimal places and avoid
  // floating point artifacts like 5.1499999999999995.
  const formatCurrency = (value) => {
    const n = Number(value) || 0;
    return (Math.round(n * 100) / 100).toFixed(2);
  };

  const generateCombinedVoucherPDF = async (printMode = false) => {
    const fetchedEntries = await fetchCombinedVoucherData(selectedDraw);

    if (!fetchedEntries || fetchedEntries.length === 0) {
      toast('No combined records found..');
      return;
    }

    // Ensure returned records actually match the selected TimeSlot and date.
    const toISO = (d) => { try { if (!d) return ''; const dt = typeof d === 'string' ? new Date(d) : new Date(d); if (isNaN(dt.getTime())) return ''; return dt.toISOString().split('T')[0]; } catch (e) { return ''; } };
    const selDateISO = selectedDraw && selectedDraw.draw_date ? toISO(selectedDraw.draw_date) : toISO(drawDate);
    const selTimeLabel = selectedDraw ? (formatTimeSlotLabel(selectedDraw) || selectedDraw.label || (typeof selectedDraw.hour === 'number' ? `${String(selectedDraw.hour).padStart(2,'0')}:00` : drawTime)) : drawTime;
    let entries = Array.isArray(fetchedEntries) ? fetchedEntries.slice() : [];
    entries = entries.filter((entry) => {
      // If backend populated timeSlotId as object, compare IDs
      if (entry.timeSlotId) {
        const entryTsId = (entry.timeSlotId && (entry.timeSlotId._id || entry.timeSlotId.toString())) || entry.timeSlotId;
        if (selectedDraw && selectedDraw._id && String(entryTsId) === String(selectedDraw._id)) return true;
      }
      // Compare explicit timeSlot string and date
      const entryTime = entry.timeSlot || '';
      const entryDate = entry.date ? toISO(entry.date) : '';
      if (selDateISO && entryDate && selDateISO === entryDate && selTimeLabel && entryTime && (entryTime === selTimeLabel || entryTime === (selectedDraw?.label || selTimeLabel))) return true;
      return false;
    });

    // Fetch winning numbers specifically for this PDF so coloring
    // is always based on fresh data in this function (no race with
    // async state updates).
    const winnersForColor = await getWinningNumbers(drawDate);

    const doc = new jsPDF('p','mm','a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const saveOrPrint = (docObj, filename) => {
      if (printMode) {
        try {
          const blobUrl = docObj.output('bloburl');
          const w = window.open(blobUrl);
          if (!w) toast.error('Popup blocked. Allow popups to use Print.');
        } catch (err) {
          console.error('Print error', err);
          toast.error('Unable to print.');
        }
      } else {
        docObj.save(filename);
      }
    };

    const allVoucherRows = entries.flatMap((entry) => (entry.data || []).map((item) => ({ number: item.uniqueId, first: item.firstPrice, second: item.secondPrice, dealer: entry.userId?.username, dealerId: entry.userId?.dealerId })));

    const combinedEntries = {};
    allVoucherRows.forEach(({ number, first, second, dealer, dealerId }) => {
      const key = number;
      if (combinedEntries[key]) {
        combinedEntries[key].first += Number(first || 0);
        combinedEntries[key].second += Number(second || 0);
        combinedEntries[key].dealers.add(`${dealer}(${dealerId})`);
        combinedEntries[key].count += 1;
      } else {
        combinedEntries[key] = { number, first: Number(first || 0), second: Number(second || 0), dealers: new Set([`${dealer}(${dealerId})`]), count: 1 };
      }
    });

    const processedEntries = Object.values(combinedEntries).map((entry) => ({ ...entry, dealers: Array.from(entry.dealers).join(', ') }));

    const hinsa = [], akra = [], tandola = [], pangora = [];
    processedEntries.forEach(({ number, first, second, dealers, count }) => {
      if (/^\d{1}$/.test(number) || (number.includes('+') && number.length === 2) || (number.split('+').length - 1 === 2 && number.length === 3) || (number.split('+').length - 1 === 3 && number.length === 4)) {
        if (prizeType === 'All' || prizeType === 'Hinsa') hinsa.push([number, first, second, dealers, count]);
      } else if (/^\d{2}$/.test(number) || (number.includes('+') && number.length <= 3) || (number.split('+').length - 1 === 2 && number.length === 4)) {
        if (prizeType === 'All' || prizeType === 'Akra') akra.push([number, first, second, dealers, count]);
      } else if (/^\d{3}$/.test(number) || (number.length === 4 && number.includes('+'))) {
        if (prizeType === 'All' || prizeType === 'Tandola') tandola.push([number, first, second, dealers, count]);
      } else if (/^\d{4}$/.test(number)) {
        if (prizeType === 'All' || prizeType === 'Pangora') pangora.push([number, first, second, dealers, count]);
      }
    });

    const sortEntries = (entries) => entries.sort((a,b) => { const numA = a[0].replace(/\+/g,''); const numB = b[0].replace(/\+/g,''); return numA.localeCompare(numB, undefined, { numeric: true }); });
    sortEntries(hinsa); sortEntries(akra); sortEntries(tandola); sortEntries(pangora);

    const calculateSectionTotals = (rows) => rows.reduce((acc, row) => { acc.firstTotal += row[1]; acc.secondTotal += row[2]; acc.recordCount += row[4]; return acc; }, { firstTotal:0, secondTotal:0, recordCount:0 });
    const hinsaTotals = calculateSectionTotals(hinsa); const akraTotals = calculateSectionTotals(akra); const tandolaTotals = calculateSectionTotals(tandola); const pangoraTotals = calculateSectionTotals(pangora);
    const grandTotals = { firstTotal: hinsaTotals.firstTotal + akraTotals.firstTotal + tandolaTotals.firstTotal + pangoraTotals.firstTotal, secondTotal: hinsaTotals.secondTotal + akraTotals.secondTotal + tandolaTotals.secondTotal + pangoraTotals.secondTotal, recordCount: hinsaTotals.recordCount + akraTotals.recordCount + tandolaTotals.recordCount + pangoraTotals.recordCount };
    const grandTotal = grandTotals.firstTotal + grandTotals.secondTotal;

    const getEntryColorForPdf = (entryNumber) => {
      // Prefer winners fetched for this PDF call; fall back to
      // component state if for some reason that array is empty.
      const source = (winnersForColor && winnersForColor.length) ? winnersForColor : winningNumbers;
      for (const winning of source) if (entryNumber === winning.number) return winning.color;
      for (const winning of source) if (checkPositionalMatch(entryNumber, winning.number)) return winning.color;
      return [0, 0, 0];
    };

    const addHeader = () => {
      doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.text('Total Sale Report', pageWidth/2, 15, { align: 'center' });
      doc.setFontSize(12); doc.setFont('helvetica','normal');
      // Show Dealer for regular users, Main Distributor for distributors
      if (role === 'user') {
        doc.text(`Dealer: ${userData?.user?.username} (${userData?.user?.dealerId})`, 14, 30);
      } else {
        doc.text(`Main Distributor: ${userData?.user?.username} (${userData?.user?.dealerId})`, 14, 30);
      }
      if (userData?.user?.city) doc.text(`City: ${userData?.user?.city}`, 14, 40);
      const formatDisplayDate = (d) => { try { if (!d) return ''; const dt = typeof d === 'string' ? new Date(d) : new Date(d); if (isNaN(dt.getTime())) return d || ''; return dt.toLocaleDateString(); } catch (e) { return d || ''; } };
      const slotLabel = selectedDraw ? (formatTimeSlotLabel(selectedDraw) || selectedDraw.title || selectedDraw.label || `Slot_${selectedDraw._id}`) : '';
      const drawHeaderLabel = selectedDraw
        ? `${slotLabel}${selectedDraw.draw_date ? ` (${formatDisplayDate(selectedDraw.draw_date)})` : ''}`
        : (formatDisplayDate(drawDate) || drawDate);
      doc.text(`Draw: ${drawHeaderLabel}`, 14, 50);
      doc.text(`First Total: ${formatCurrency(grandTotals.firstTotal)}`, 110, 50);
      doc.text(`Second Total: ${formatCurrency(grandTotals.secondTotal)}`, 110, 60);
      doc.text(`Grand Total: ${formatCurrency(grandTotal)}`, 110, 70);
    };

    const renderSection = (title, rows, startY=90) => {
      if (rows.length === 0) return startY;
      const rowHeight = 8; const colWidths = [20,17,17]; const tableWidth = colWidths.reduce((a,b)=>a+b,0); let y = startY;
      const totals = calculateSectionTotals(rows); doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.text(`${title} (${rows.length} entries)`, 14, y); y+=8;
      doc.setFontSize(10); doc.setFont('helvetica','normal');
      doc.text(`First Total: ${formatCurrency(totals.firstTotal)}`, 14, y);
      doc.text(`Second Total: ${formatCurrency(totals.secondTotal)}`, 60, y);
      doc.text(`Total: ${formatCurrency(totals.firstTotal + totals.secondTotal)}`, 106, y); y+=5;
      const leftRows=[], middleRows=[], rightRows=[]; rows.forEach((r, idx)=>{ if(idx%3===0) leftRows.push(r); else if(idx%3===1) middleRows.push(r); else rightRows.push(r); });
      const leftX = 14; const middleX = leftX + tableWidth; const rightX = middleX + tableWidth;
      const drawTableHeader = (x, yy)=>{ doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setFillColor(230,230,230); doc.setDrawColor(0,0,0); doc.rect(x, yy, colWidths[0], rowHeight, 'FD'); doc.rect(x+colWidths[0], yy, colWidths[1], rowHeight, 'FD'); doc.rect(x+colWidths[0]+colWidths[1], yy, colWidths[2], rowHeight, 'FD'); doc.setTextColor(0,0,0); doc.text('Number', x+1, yy+5); doc.text('First', x+colWidths[0]+1, yy+5); doc.text('Second', x+colWidths[0]+colWidths[1]+1, yy+5); doc.setFillColor(255,255,255); return yy+rowHeight; };
      let headerY = drawTableHeader(leftX, y); if(middleRows.length>0) drawTableHeader(middleX, y); if(rightRows.length>0) drawTableHeader(rightX, y);
      let currentY = headerY; doc.setFont('helvetica','normal'); doc.setFontSize(8);
      const maxRows = Math.max(leftRows.length, middleRows.length, rightRows.length);
      for(let i=0;i<maxRows;i++){
        if(currentY > pageHeight - 30){ doc.addPage(); currentY = 35; drawTableHeader(leftX, currentY); if(middleRows.length>0) drawTableHeader(middleX, currentY); if(rightRows.length>0) drawTableHeader(rightX, currentY); currentY += rowHeight; doc.setFont('helvetica','normal'); doc.setFontSize(8); }
        if(i<leftRows.length){ const [num,f,s] = leftRows[i]; const entryColor = getEntryColorForPdf(num); doc.setFillColor(245,245,245); doc.setDrawColor(0,0,0); doc.rect(leftX, currentY, colWidths[0], rowHeight, 'FD'); doc.setTextColor(entryColor[0], entryColor[1], entryColor[2]); doc.text(num.toString(), leftX+1, currentY+5); doc.setFillColor(255,255,255); doc.rect(leftX+colWidths[0], currentY, colWidths[1], rowHeight); doc.text(formatCurrency(f), leftX+colWidths[0]+1, currentY+5); doc.rect(leftX+colWidths[0]+colWidths[1], currentY, colWidths[2], rowHeight); doc.text(formatCurrency(s), leftX+colWidths[0]+colWidths[1]+1, currentY+5); doc.setTextColor(0,0,0); }
        if(i<middleRows.length){ const [num,f,s] = middleRows[i]; const entryColor = getEntryColorForPdf(num); doc.setFillColor(245,245,245); doc.setDrawColor(0,0,0); doc.rect(middleX, currentY, colWidths[0], rowHeight, 'FD'); doc.setTextColor(entryColor[0], entryColor[1], entryColor[2]); doc.text(num.toString(), middleX+1, currentY+5); doc.setFillColor(255,255,255); doc.rect(middleX+colWidths[0], currentY, colWidths[1], rowHeight); doc.text(formatCurrency(f), middleX+colWidths[0]+1, currentY+5); doc.rect(middleX+colWidths[0]+colWidths[1], currentY, colWidths[2], rowHeight); doc.text(formatCurrency(s), middleX+colWidths[0]+colWidths[1]+1, currentY+5); doc.setTextColor(0,0,0); }
        if(i<rightRows.length){ const [num,f,s] = rightRows[i]; const entryColor = getEntryColorForPdf(num); doc.setFillColor(245,245,245); doc.setDrawColor(0,0,0); doc.rect(rightX, currentY, colWidths[0], rowHeight, 'FD'); doc.setTextColor(entryColor[0], entryColor[1], entryColor[2]); doc.text(num.toString(), rightX+1, currentY+5); doc.setFillColor(255,255,255); doc.rect(rightX+colWidths[0], currentY, colWidths[1], rowHeight); doc.text(formatCurrency(f), rightX+colWidths[0]+1, currentY+5); doc.rect(rightX+colWidths[0]+colWidths[1], currentY, colWidths[2], rowHeight); doc.text(formatCurrency(s), rightX+colWidths[0]+colWidths[1]+1, currentY+5); doc.setTextColor(0,0,0); }
        currentY += rowHeight;
      }
      return currentY + 10;
    };

    addHeader(); let nextY = 100; if(hinsa.length>0) nextY = renderSection('HINSA', hinsa, nextY); if(akra.length>0) nextY = renderSection('AKRA', akra, nextY); if(tandola.length>0) nextY = renderSection('TANDOLA', tandola, nextY); if(pangora.length>0) nextY = renderSection('PANGORA', pangora, nextY);

    const safeISODate = (d) => { try { if (!d) return 'unknown_date'; const dt = typeof d === 'string' ? new Date(d) : new Date(d); if (isNaN(dt.getTime())) return 'unknown_date'; return dt.toISOString().split('T')[0]; } catch (e) { return 'unknown_date'; } };
    const slotFileLabel = selectedDraw ? (formatTimeSlotLabel(selectedDraw) || selectedDraw.title || selectedDraw.label || 'draw') : 'draw';
    const drawFileLabel = `${slotFileLabel.replace(/\s+/g,'_')}_${safeISODate(selectedDraw && selectedDraw.draw_date ? selectedDraw.draw_date : drawDate)}`;
    const filename = `Combined_Voucher_${drawFileLabel}.pdf`;
    saveOrPrint(doc, filename);
    toast.success('Combined Voucher PDF processed');
  };

  const isSelectedDrawClosed = () => {
    if (selectedDraw) {
      if (typeof selectedDraw.isActive === 'boolean') return selectedDraw.isActive === false;
      if (typeof selectedDraw.isExpired === 'boolean') return selectedDraw.isExpired;
      if (selectedDraw.draw_date) {
        const d = new Date(selectedDraw.draw_date);
        d.setHours(23,59,59,999);
        return Date.now() > d.getTime();
      }
      return false;
    }
    if (drawDate) { const d = new Date(drawDate); d.setHours(23,59,59,999); return Date.now() > d.getTime(); }
    return false;
  };

  return (
    <Box sx={{ width: '100%', px: { xs: 1.25, sm: 2 }, pt: 1 }}>
      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#111827', mb: 1.4 }}>
        Total Sale Report
      </Typography>

      <Paper sx={{ p: 1.2, borderRadius: 1.5, border: '1px solid var(--rlc-table-border)', bgcolor: 'var(--rlc-page-bg)' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.2 }}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827', mb: 0.4 }}>Select Time Slot</Typography>
            <select
              value={selectedDraw?._id || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDraw(closedDraws.find(d => String(d._id) === String(value)) || null);
              }}
              style={{ width: '100%', background: 'var(--rlc-strip-black)', color: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #1f2937', minHeight: 38, fontWeight: 700 }}
            >
              <option value="" style={{ color: '#fff', background: '#0b1220' }}>-- Select time slot --</option>
              {closedDraws.map((d) => (
                <option key={d._id} value={d._id} style={{ color: '#fff', background: '#0b1220' }}>
                  {formatTimeSlotLabel(d)} (Closed)
                </option>
              ))}
            </select>

            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827', mt: 0.9, mb: 0.4 }}>Date</Typography>
            <input
              type="date"
              value={drawDate}
              onChange={(e) => setDrawDate(e.target.value)}
              style={{ width: '100%', background: 'var(--rlc-strip-black)', color: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #1f2937', minHeight: 38, fontWeight: 700 }}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827', mb: 0.4 }}>Prize Type</Typography>
            <select
              value={prizeType}
              onChange={(e) => setPrizeType(e.target.value)}
              style={{ width: '100%', background: 'var(--rlc-strip-black)', color: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #1f2937', minHeight: 38, fontWeight: 700 }}
            >
              <option>All</option>
              <option>Hinsa</option>
              <option>Akra</option>
              <option>Tandola</option>
              <option>Pangora</option>
            </select>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827', mb: 0.4 }}>(Choose combined report type)</Typography>
            <select
              value={ledger}
              onChange={(e) => setLedger(e.target.value)}
              style={{ width: '100%', background: 'var(--rlc-strip-black)', color: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #1f2937', minHeight: 38, fontWeight: 700 }}
            >
              <option value="general">Combined General</option>
            </select>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.1, mt: 1.2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            sx={{ bgcolor: 'var(--rlc-primary)', '&:hover': { bgcolor: 'var(--rlc-primary-hover)' }, textTransform: 'none', fontWeight: 700 }}
            onClick={async () => {
              if (!isSelectedDrawClosed()) { toast.error('Draw is not close yet'); return; }
              await generateCombinedVoucherPDF(false);
            }}
          >
            Download PDF
          </Button>

          <Button
            variant="contained"
            sx={{ bgcolor: 'var(--rlc-success)', '&:hover': { bgcolor: 'var(--rlc-success-hover)' }, textTransform: 'none', fontWeight: 700 }}
            onClick={async () => {
              if (!isSelectedDrawClosed()) { toast.error('Draw is not close yet'); return; }
              await generateCombinedVoucherPDF(true);
            }}
          >
            Print
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};



export default TotalSaleReport;
