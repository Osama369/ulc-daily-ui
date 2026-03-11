import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

const DistributorNoSearch = () => {
  const [drawDate, setDrawDate] = useState(new Date().toISOString().split('T')[0]);
  const [draws, setDraws] = useState([]);
  const [selectedDraw, setSelectedDraw] = useState(null);
  const [searchNo, setSearchNo] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const formatTimeSlotLabel = (slot) => {
    if (!slot) return '';
    if (slot.title && typeof slot.title === 'string') return slot.title;
    const label = slot.label || (typeof slot.hour === 'number' ? `${String(slot.hour).padStart(2, '0')}:00` : null);
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

  const isSlotClosed = useCallback((slot) => {
    if (!slot) return false;
    if (slot.isActive === false) return true;
    if (slot.isActive === true) return false;
    if (slot.isExpired === true) return true;

    const hm = getSlotHourMinute(slot);
    if (!hm || !drawDate) return false;
    const [y, m, d] = String(drawDate).split('-').map(Number);
    if (!y || !m || !d) return false;
    const closeAt = new Date(y, m - 1, d, hm.hour24, hm.minute, 0, 0);
    closeAt.setMinutes(closeAt.getMinutes() - 10);
    return Date.now() >= closeAt.getTime();
  }, [drawDate]);

  const fetchTimeSlots = useCallback(async () => {
    try {
      const res = await axios.get('/api/v1/timeslots', { params: { date: drawDate } });
      const list = res.data?.timeSlots || res.data || [];
      setDraws(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch timeslots', err);
      setDraws([]);
    }
  }, [drawDate]);

  useEffect(() => {
    fetchTimeSlots();
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

  const closedDraws = useMemo(() => sortedDraws.filter((d) => isSlotClosed(d)), [sortedDraws, isSlotClosed]);

  useEffect(() => {
    if (!selectedDraw && closedDraws.length) {
      setSelectedDraw(closedDraws[0]);
    }
    if (selectedDraw) {
      const exists = closedDraws.some((d) => String(d._id) === String(selectedDraw._id));
      if (!exists) setSelectedDraw(closedDraws[0] || null);
    }
  }, [selectedDraw, closedDraws]);

  const formatCurrency = (value) => {
    const n = Number(value) || 0;
    return (Math.round(n * 100) / 100).toFixed(2);
  };

  const onSearch = async () => {
    const q = String(searchNo || '').trim();
    if (!q) {
      toast.error('Please enter NO to search');
      return;
    }
    if (!selectedDraw?._id) {
      toast.error('Please select a closed draw');
      return;
    }

    setLoading(true);
    try {
      const params = {
        date: drawDate,
        timeSlotId: selectedDraw._id,
        requireClosed: true,
        q,
      };
      const res = await axios.get('/api/v1/data/admin-search-distributor-number', { params });
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
      if (!res.data?.data?.length) {
        toast('No matching entries found');
      }
    } catch (error) {
      console.error('Admin distributor NO search failed', error);
      toast.error(error?.response?.data?.error || 'Failed to search number');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#111827', mb: 1.4 }}>
        Distributor-wise NO Search
      </Typography>

      <Paper sx={{ p: 1.4, borderRadius: 1.5, border: '1px solid var(--rlc-table-border)', bgcolor: 'var(--rlc-page-bg)' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.2 }}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827', mb: 0.4 }}>Date</Typography>
            <input
              type="date"
              value={drawDate}
              onChange={(e) => setDrawDate(e.target.value)}
              style={{ width: '100%', background: 'var(--rlc-strip-black)', color: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #1f2937', minHeight: 38, fontWeight: 700 }}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827', mb: 0.4 }}>Closed Draw</Typography>
            <select
              value={selectedDraw?._id || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDraw(closedDraws.find((d) => String(d._id) === String(value)) || null);
              }}
              style={{ width: '100%', background: 'var(--rlc-strip-black)', color: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #1f2937', minHeight: 38, fontWeight: 700 }}
            >
              <option value="" style={{ color: '#fff', background: '#0b1220' }}>-- Select closed draw --</option>
              {closedDraws.map((d) => (
                <option key={d._id} value={d._id} style={{ color: '#fff', background: '#0b1220' }}>
                  {formatTimeSlotLabel(d)} (Closed)
                </option>
              ))}
            </select>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827', mb: 0.4 }}>Search NO</Typography>
            <input
              type="text"
              value={searchNo}
              onChange={(e) => setSearchNo(e.target.value)}
              placeholder="Enter NO (e.g. 01)"
              style={{ width: '100%', background: 'var(--rlc-strip-black)', color: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #1f2937', minHeight: 38, fontWeight: 700 }}
            />
          </Box>
        </Box>

        <Box sx={{ mt: 1.2 }}>
          <Button
            variant="contained"
            disabled={loading}
            onClick={onSearch}
            sx={{ bgcolor: 'var(--rlc-primary)', '&:hover': { bgcolor: 'var(--rlc-primary-hover)' }, textTransform: 'none', fontWeight: 700 }}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </Box>

        <Box sx={{ mt: 1.4, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #d1d5db', padding: 8, textAlign: 'left', background: '#f3f4f6' }}>Distributor</th>
                <th style={{ border: '1px solid #d1d5db', padding: 8, textAlign: 'left', background: '#f3f4f6' }}>Dealer ID</th>
                <th style={{ border: '1px solid #d1d5db', padding: 8, textAlign: 'left', background: '#f3f4f6' }}>NO</th>
                <th style={{ border: '1px solid #d1d5db', padding: 8, textAlign: 'right', background: '#f3f4f6' }}>F</th>
                <th style={{ border: '1px solid #d1d5db', padding: 8, textAlign: 'right', background: '#f3f4f6' }}>S</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={`${r.distributorId}-${r.number}-${idx}`}>
                  <td style={{ border: '1px solid #e5e7eb', padding: 8 }}>{r.distributorName || '-'}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: 8 }}>{r.distributorDealerId || '-'}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: 8 }}>{r.number}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: 8, textAlign: 'right' }}>{formatCurrency(r.first)}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: 8, textAlign: 'right' }}>{formatCurrency(r.second)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} style={{ border: '1px solid #e5e7eb', padding: 10, textAlign: 'center', color: '#6b7280' }}>
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      </Paper>
    </Box>
  );
};

export default DistributorNoSearch;
