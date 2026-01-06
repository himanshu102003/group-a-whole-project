import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Package, User, MapPin, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getAssets, createMovement, CreateMovementRequest } from '../services/assetService.ts';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Asset Manager' | 'Technician' | 'Employee';
};

type Movement = {
  id: string;
  assetId?: string;
  assetTag: string;
  assetName: string;
  movementType: 'Check-Out' | 'Check-In' | 'Transfer' | 'Receive';
  from: string;
  to: string;
  custodian: string;
  date: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  notes: string;
  requestedBy: string;
};

type InventoryMovementProps = {
  user: User;
};

export function InventoryMovement({ user }: InventoryMovementProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [movementType, setMovementType] = useState<'Check-Out' | 'Check-In' | 'Transfer' | 'Receive'>('Check-Out');
  const [showForm, setShowForm] = useState(false);

  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [saving, setSaving] = useState(false);

  const [optimisticMovements, setOptimisticMovements] = useState<Movement[]>([]);

  const getCurrentTimeHHMM = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const [movementForm, setMovementForm] = useState({
    assetId: '',
    movementType: 'Checked Out',
    fromLocation: '',
    toLocation: '',
    movedBy: '',
    movementDate: new Date().toISOString().split('T')[0],
    movementTime: getCurrentTimeHHMM(),
  });

  const fetchAssets = async () => {
    try {
      setLoadingAssets(true);
      const data = await getAssets();
      setAssets(data);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    fetchAssets().catch(console.error);
  }, []);

  const movements = useMemo(() => {
    const rows = (assets ?? []).flatMap((a: any) => {
      const assetTag = a?.laptopAssetsTag ?? '';
      const assetName = `${a?.make ?? ''} ${a?.model ?? ''}`.trim();
      return (a?.movements ?? []).map((m: any, idx: number) => ({
        id: `${a?.assetId ?? 'a'}-${m?.movementDate ?? idx}-${idx}`,
        assetId: String(a?.assetId ?? ''),
        assetTag,
        assetName,
        movementType: (m?.movementType ?? 'Transfer') as any,
        from: m?.fromLocation ?? '-',
        to: m?.toLocation ?? '-',
        custodian: '-',
        date: m?.movementDate ?? new Date().toISOString(),
        status: 'Completed' as const,
        notes: '',
        requestedBy: m?.movedBy ?? '-',
      }));
    });

    rows.sort((x: any, y: any) => new Date(y.date).getTime() - new Date(x.date).getTime());
    return rows;
  }, [assets]);

  const movementsMerged = useMemo(() => {
    if (optimisticMovements.length === 0) return movements;

    const dateOnly = (v: string) => String(v || '').slice(0, 10);

    // Keep optimistic movements (with time) and filter out backend entries that match
    // the same movement (backend may store DATE-only, losing time).
    const filteredBackend = movements.filter((m) => {
      return !optimisticMovements.some((o) => {
        return (
          (o.assetId || '') === (m.assetId || '') &&
          o.movementType === m.movementType &&
          o.from === m.from &&
          o.to === m.to &&
          o.requestedBy === m.requestedBy &&
          dateOnly(o.date) === dateOnly(m.date)
        );
      });
    });

    const merged = [...optimisticMovements, ...filteredBackend];
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return merged;
  }, [movements, optimisticMovements]);

  const movementsToShow = activeTab === 'new' ? movementsMerged.slice(0, 10) : movementsMerged;

  const setMovementTypeAndRequest = (
    type: 'Check-Out' | 'Check-In' | 'Transfer' | 'Receive'
  ) => {
    setMovementType(type);
    const mapping: Record<typeof type, CreateMovementRequest['movementType']> = {
      'Check-Out': 'Checked Out',
      'Check-In': 'Checked In',
      'Transfer': 'Transfer',
      'Receive': 'Receive',
    };
    setMovementForm((p) => ({ ...p, movementType: mapping[type] }));
  };

  const handleCreateMovement = async () => {
    if (!movementForm.assetId || !movementForm.movedBy || !movementForm.movementDate) {
      alert('Please fill all required fields.');
      return;
    }

    try {
      setSaving(true);

      // Send full datetime so time is preserved (requires DB column to be datetime/datetime2).
      const movementDateTime = movementForm.movementTime
        ? `${movementForm.movementDate}T${movementForm.movementTime}:00`
        : movementForm.movementDate;

      await createMovement(movementForm.assetId, {
        movementType: movementForm.movementType,
        fromLocation: movementForm.fromLocation || undefined,
        toLocation: movementForm.toLocation || undefined,
        movedBy: movementForm.movedBy,
        movementDate: movementDateTime,
      });

      // Show the newly created movement immediately (with time) at the top.
      const selectedAsset = assets.find((a: any) => String(a.assetId) === String(movementForm.assetId));
      const optimistic: Movement = {
        id: `optimistic-${movementForm.assetId}-${movementDateTime}`,
        assetId: String(movementForm.assetId),
        assetTag: selectedAsset?.laptopAssetsTag ?? '',
        assetName: `${selectedAsset?.make ?? ''} ${selectedAsset?.model ?? ''}`.trim(),
        movementType: (movementType as any),
        from: movementForm.fromLocation || '-',
        to: movementForm.toLocation || '-',
        custodian: '-',
        date: movementDateTime,
        status: 'Completed',
        notes: '',
        requestedBy: movementForm.movedBy,
      };
      setOptimisticMovements((prev) => [optimistic, ...prev].slice(0, 10));

      setShowForm(false);
      setMovementForm({
        assetId: '',
        movementType: 'Checked Out',
        fromLocation: '',
        toLocation: '',
        movedBy: '',
        movementDate: new Date().toISOString().split('T')[0],
        movementTime: getCurrentTimeHHMM(),
      });
      await fetchAssets();
    } catch (e: any) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.title ||
        e?.response?.data ||
        e?.message ||
        'Failed to create movement.';
      alert(String(message));
    } finally {
      setSaving(false);
    }
  };

  // Mock movement data
  const _unusedMockMovements: Movement[] = [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'Pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'Cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Completed': 'bg-green-100 text-green-700',
      'Pending': 'bg-yellow-100 text-yellow-700',
      'Cancelled': 'bg-red-100 text-red-700',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getMovementTypeColor = (type: string) => {
    const colors = {
      'Check-Out': 'bg-blue-100 text-blue-700',
      'Check-In': 'bg-purple-100 text-purple-700',
      'Transfer': 'bg-orange-100 text-orange-700',
      'Receive': 'bg-green-100 text-green-700',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const formatMovementDateTime = (value: string) => {
    if (!value) return '-';

    // If backend returns DATE only (YYYY-MM-DD), avoid showing 12:00:00 AM.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const d = new Date(`${value}T00:00:00`);
      return d.toLocaleDateString();
    }

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);

    const isMidnight = d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
    return isMidnight ? d.toLocaleDateString() : d.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900">Inventory Movement</h2>
          <p className="text-gray-600">Track asset check-in, check-out, and transfers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          New Movement
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'new'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Recent Movements
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          History
        </button>
      </div>

      {/* Movement Cards */}
      <div className="space-y-4">
        {movementsToShow.map((movement) => (
          <div key={movement.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Package className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-gray-900">{movement.assetTag}</h3>
                    <span className={`px-3 py-1 rounded-full ${getMovementTypeColor(movement.movementType)}`}>
                      {movement.movementType}
                    </span>
                    <span className={`px-3 py-1 rounded-full flex items-center gap-2 ${getStatusColor(movement.status)}`}>
                      {getStatusIcon(movement.status)}
                      {movement.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{movement.assetName}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <div>
                        <div>From: {movement.from}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <ArrowRight className="w-4 h-4 text-blue-600" />
                          <span>To: {movement.to}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-gray-600">
                      <User className="w-4 h-4 mt-1" />
                      <div>
                        <div>Custodian: {movement.custodian}</div>
                        <div className="mt-1">By: {movement.requestedBy}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-gray-600">
                      <Calendar className="w-4 h-4 mt-1" />
                      <div>{formatMovementDateTime(movement.date)}</div>
                    </div>
                  </div>

                  {movement.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg text-gray-700">
                      <span className="text-gray-600">Notes:</span> {movement.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {!loadingAssets && movementsToShow.length === 0 && (
          <div className="text-center py-12 text-gray-500">No movements found</div>
        )}
        {loadingAssets && (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        )}
      </div>

      {/* New Movement Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-gray-900 mb-6">New Asset Movement</h3>

            <div className="space-y-4">
              {/* Movement Type */}
              <div>
                <label className="block text-gray-700 mb-2">Movement Type *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Check-Out', 'Check-In', 'Transfer', 'Receive'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setMovementTypeAndRequest(type)}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        movementType === type
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset Selection */}
              <div>
                <label className="block text-gray-700 mb-2">Asset *</label>
                <select
                  value={movementForm.assetId}
                  onChange={(e) => setMovementForm((p) => ({ ...p, assetId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an asset...</option>
                  {assets.map((a: any) => (
                    <option key={a.assetId} value={String(a.assetId)}>
                      {a.laptopAssetsTag} - {a.make} {a.model}
                    </option>
                  ))}
                </select>
              </div>

              {/* From Location */}
              <div>
                <label className="block text-gray-700 mb-2">
                  {movementType === 'Receive' ? 'Vendor/Supplier' : 'From Location'} *
                </label>
                <input
                  type="text"
                  placeholder={movementType === 'Receive' ? 'Enter vendor name' : 'Enter current location'}
                  value={movementForm.fromLocation}
                  onChange={(e) => setMovementForm((p) => ({ ...p, fromLocation: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* To Location */}
              <div>
                <label className="block text-gray-700 mb-2">
                  {movementType === 'Check-Out' ? 'Assign To' : 'To Location'} *
                </label>
                <input
                  type="text"
                  placeholder={movementType === 'Check-Out' ? 'Employee name or department' : 'Enter destination location'}
                  value={movementForm.toLocation}
                  onChange={(e) => setMovementForm((p) => ({ ...p, toLocation: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Custodian */}
              {(movementType === 'Check-Out' || movementType === 'Transfer') && (
                <div>
                  <label className="block text-gray-700 mb-2">Custodian *</label>
                  <input
                    type="text"
                    placeholder="Enter custodian name"
                    value={movementForm.movedBy}
                    onChange={(e) => setMovementForm((p) => ({ ...p, movedBy: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={movementForm.movementDate}
                    onChange={(e) => setMovementForm((p) => ({ ...p, movementDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Time *</label>
                  <input
                    type="time"
                    value={movementForm.movementTime}
                    onChange={(e) => setMovementForm((p) => ({ ...p, movementTime: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-gray-700 mb-2">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Additional information about this movement..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={handleCreateMovement}
                disabled={saving}
              >
                Create Movement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
