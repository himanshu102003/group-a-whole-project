import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Filter, Download, Upload, Plus, Eye, Edit2, QrCode, MoreVertical, Trash2, Activity, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { createAsset, CreateAssetRequest, deleteAsset, getAssets, updateAssetStatusLocation, UpdateAssetStatusLocationRequest, Asset as BackendAsset, createMovement, CreateMovementRequest } from "../services/assetService.ts";

type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Asset Manager' | 'Technician' | 'Employee';
};

type UiAsset = {
  id: string;
  assetTag: string;
  type: string;
  model: string;
  serialNumber: string;
  category: string;
  lifecycleStatus: string;
  location: string;
  custodian: string;
  vendor: string;
};

type AssetListProps = {
  user: User;
  onNavigate: (view: 'asset-detail', assetId: string) => void;
};

export function AssetList({ user, onNavigate }: AssetListProps) {
  const [backendAssets, setBackendAssets] = useState<BackendAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateAssetStatusLocationRequest>({
    assetsStatus: "",
    assetsLocation: "",
  });
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementForm, setMovementForm] = useState({
    assetId: "",
    movementType: "Checked Out",
    fromLocation: "",
    toLocation: "",
    movedBy: "",
    movementDate: new Date().toISOString().split("T")[0],
  });

  const [newAsset, setNewAsset] = useState<CreateAssetRequest>({
    dasId: "",
    userName: "",
    assetsLocation: "",
    make: "",
    model: "",
    laptopCategory: "Hardware",
    laptopAssetsTag: "",
    powerAdapterDetails: "",
    assignmentDate: "",
    installStatus: "",
    assetsStatus: "Active",
    additional16GbRamStatus: "",
    assetsProcureStatus: "",
    warrantyStartDate: "",
    warrantyExpiredDate: "",
    ageingOfAssets: undefined,
    processor: "",
    ram: "",
    storage: "",
    display: "",
    gpu: "",
    department: "",
    owner: "",
  });

  // Import/Export refs and handlers
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uiAssets: UiAsset[] = useMemo(() => {
    return backendAssets.map((a) => ({
      id: a.assetId.toString(),
      assetTag: a.laptopAssetsTag,
      type: 'Laptop',
      model: a.model,
      serialNumber: a.dasId,
      category: a.laptopCategory,
      lifecycleStatus: a.assetsStatus,
      location: a.assetsLocation,
      custodian: a.userName,
      vendor: a.make,
    }));
  }, [backendAssets]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(uiAssets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assets.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (Array.isArray(data)) {
          const valid = data.every((item) => typeof item === 'object' && item !== null && 'id' in item && 'assetTag' in item);
          if (!valid) {
            alert('Imported data is not in the expected Asset array format.');
            return;
          }
          // Import affects UI only (does not persist to backend)
          setBackendAssets(
            (data as UiAsset[]).map((x, idx) => ({
              assetId: Number(x.id) || idx + 1,
              dasId: x.serialNumber ?? '',
              userName: x.custodian ?? '',
              assetsLocation: x.location ?? '',
              make: x.vendor ?? '',
              model: x.model ?? '',
              laptopCategory: x.category ?? '',
              laptopAssetsTag: x.assetTag ?? '',
              powerAdapterDetails: '',
              assignmentDate: '',
              installStatus: '',
              assetsStatus: x.lifecycleStatus ?? '',
              additional16GbRamStatus: '',
              assetsProcureStatus: '',
              warrantyStartDate: '',
              warrantyExpiredDate: '',
              ageingOfAssets: 0,
              technicalSpecification: null,
              assignment: null,
              movements: null,
              maintenanceHistory: null,
            }))
          );
          alert('Assets imported successfully!');
        } else {
          alert('Invalid file format: expected an array of assets.');
        }
      } catch {
        alert('Failed to parse the file. Ensure it is valid JSON.');
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  };

  useEffect(() => {
    setLoading(true);
    setError('');

    getAssets()
      .then(setBackendAssets)
      .catch(() => setError('Failed to load assets'))
      .finally(() => setLoading(false));
  }, []);

  const refreshAssets = async () => {
    const list = await getAssets();
    setBackendAssets(list);
  };

  const openEdit = (assetId: string) => {
    const backend = backendAssets.find((a) => a.assetId.toString() === assetId);
    if (!backend) return;

    setEditAssetId(assetId);
    setEditForm({
      assetsStatus: backend.assetsStatus,
      assetsLocation: backend.assetsLocation,
    });
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const handleUpdateAsset = async () => {
    if (!editAssetId) return;
    if (!editForm.assetsStatus || !editForm.assetsLocation) {
      alert("Please fill Status and Location.");
      return;
    }

    try {
      setSaving(true);
      await updateAssetStatusLocation(editAssetId, editForm);
      await refreshAssets();
      setShowEditModal(false);
      setEditAssetId(null);
    } catch (e: any) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.title ||
        e?.response?.data ||
        e?.message ||
        "Failed to update asset.";
      alert(String(message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!canEdit) return;
    if (!window.confirm('Are you sure you want to delete this asset?')) return;

    try {
      setSaving(true);
      await deleteAsset(assetId);
      await refreshAssets();
      setOpenMenuId(null);
    } catch (e: any) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.title ||
        e?.response?.data ||
        e?.message ||
        "Failed to delete asset.";
      alert(String(message));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMovement = async () => {
    if (!movementForm.assetId || !movementForm.movedBy || !movementForm.movementDate) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      setSaving(true);
      await createMovement(movementForm.assetId, {
        movementType: movementForm.movementType,
        fromLocation: movementForm.fromLocation || undefined,
        toLocation: movementForm.toLocation || undefined,
        movedBy: movementForm.movedBy,
        movementDate: movementForm.movementDate,
      });
      await refreshAssets();
      setShowMovementModal(false);
      setMovementForm({
        assetId: "",
        movementType: "Checked Out",
        fromLocation: "",
        toLocation: "",
        movedBy: "",
        movementDate: new Date().toISOString().split("T")[0],
      });
    } catch (e: any) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.title ||
        e?.response?.data ||
        e?.message ||
        "Failed to create movement.";
      alert(String(message));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAsset = async () => {
    if (!newAsset.laptopAssetsTag || !newAsset.dasId || !newAsset.assetsLocation || !newAsset.make || !newAsset.model || !newAsset.laptopCategory || !newAsset.assetsStatus) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      setSaving(true);
      await createAsset({
        ...newAsset,
        powerAdapterDetails: newAsset.powerAdapterDetails || undefined,
        assignmentDate: newAsset.assignmentDate || undefined,
        installStatus: newAsset.installStatus || undefined,
        additional16GbRamStatus: newAsset.additional16GbRamStatus || undefined,
        assetsProcureStatus: newAsset.assetsProcureStatus || undefined,
        warrantyStartDate: newAsset.warrantyStartDate || undefined,
        warrantyExpiredDate: newAsset.warrantyExpiredDate || undefined,
        processor: newAsset.processor || undefined,
        ram: newAsset.ram || undefined,
        storage: newAsset.storage || undefined,
        display: newAsset.display || undefined,
        gpu: newAsset.gpu || undefined,
        department: newAsset.department || undefined,
        owner: newAsset.owner || undefined,
      });
      await refreshAssets();
      setShowAddModal(false);
      setNewAsset({
        dasId: "",
        userName: "",
        assetsLocation: "",
        make: "",
        model: "",
        laptopCategory: "Hardware",
        laptopAssetsTag: "",
        powerAdapterDetails: "",
        assignmentDate: "",
        installStatus: "",
        assetsStatus: "Active",
        additional16GbRamStatus: "",
        assetsProcureStatus: "",
        warrantyStartDate: "",
        warrantyExpiredDate: "",
        ageingOfAssets: undefined,
        processor: "",
        ram: "",
        storage: "",
        display: "",
        gpu: "",
        department: "",
        owner: "",
      });
    } catch (e: any) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.title ||
        e?.response?.data ||
        e?.message ||
        "Failed to save asset.";
      alert(String(message));
    } finally {
      setSaving(false);
    }
  };

  const filteredAssets = uiAssets.filter((asset) => {
    const matchesSearch =
      asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.vendor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || asset.lifecycleStatus === filterStatus;
    const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      'Procured': 'bg-blue-100 text-blue-700',
      'In Use': 'bg-green-100 text-green-700',
      'Under Maintenance': 'bg-yellow-100 text-yellow-700',
      'Repaired': 'bg-purple-100 text-purple-700',
      'Decommissioned': 'bg-gray-100 text-gray-700',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const canEdit = true;

  const recentMovements = useMemo(() => {
    const all = backendAssets.flatMap(a => a.movements || []);
    return all
      .sort((a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime())
      .slice(0, 10);
  }, [backendAssets]);

  if (loading) return <p className="p-4">Loading assets...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportChange}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900">AssetFlow</h2>
          <p className="text-gray-600">Manage and track all company assets</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={handleImportClick}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => setShowMovementModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Create Movement
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#00A3A1] text-white rounded-lg hover:bg-[#008C8A] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-gray-700 mb-2">Search Assets</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by tag, model, serial number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Lifecycle Status</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="Procured">Procured</option>
                <option value="In Use">In Use</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Repaired">Repaired</option>
                <option value="Decommissioned">Decommissioned</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Category</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Categories</option>
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Peripherals">Peripherals</option>
                <option value="Fleet">Fleet</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">Asset Tag</th>
                <th className="px-6 py-3 text-left text-gray-700">Type/Model</th>
                <th className="px-6 py-3 text-left text-gray-700">Serial Number</th>
                <th className="px-6 py-3 text-left text-gray-700">Category</th>
                <th className="px-6 py-3 text-left text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-gray-700">Location</th>
                <th className="px-6 py-3 text-left text-gray-700">Custodian</th>
                <th className="px-6 py-3 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{asset.assetTag}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{asset.type}</div>
                    <div className="text-gray-600">{asset.model}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{asset.serialNumber}</td>
                  <td className="px-6 py-4 text-gray-700">{asset.category}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full ${getStatusColor(asset.lifecycleStatus)}`}>
                      {asset.lifecycleStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{asset.location}</td>
                  <td className="px-6 py-4 text-gray-700">{asset.custodian}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 relative">
                      <button
                        onClick={() => onNavigate('asset-detail', asset.id)}
                        className="p-2 text-[#00A3A1] hover:bg-teal-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="More Options"
                        onClick={() => setOpenMenuId((prev) => (prev === asset.id ? null : asset.id))}
                        disabled={saving}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === asset.id && (
                        <div className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                          <button
                            className={
                              canEdit
                                ? "w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                : "w-full px-4 py-2 text-left text-gray-400 flex items-center gap-2 cursor-not-allowed"
                            }
                            onClick={() => (canEdit ? openEdit(asset.id) : undefined)}
                            disabled={saving || !canEdit}
                            title={canEdit ? "Edit Status/Location" : "You don't have permission"}
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit Status/Location
                          </button>
                          <button
                            className={
                              canEdit
                                ? "w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                                : "w-full px-4 py-2 text-left text-gray-400 flex items-center gap-2 cursor-not-allowed"
                            }
                            onClick={() => (canEdit ? handleDelete(asset.id) : undefined)}
                            disabled={saving || !canEdit}
                            title={canEdit ? "Delete" : "You don't have permission"}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAssets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No assets found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Recent Movements */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-600" />
          <h3 className="text-gray-900 font-medium">Recent Movements</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentMovements.length === 0 ? (
            <div className="px-6 py-4 text-center text-gray-500">No recent movements</div>
          ) : (
            recentMovements.map((m, idx) => (
              <div key={idx} className="px-6 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-900">{m.movementType}</span>
                  {m.fromLocation && m.toLocation && (
                    <span className="text-gray-600 ml-2">
                      from {m.fromLocation} to {m.toLocation}
                    </span>
                  )}
                </div>
                <div className="text-gray-500">
                  {m.movedBy} • {new Date(m.movementDate).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-gray-900 mb-6">Add New Asset</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Asset Tag *</label>
                <input
                  type="text"
                  value={newAsset.laptopAssetsTag}
                  onChange={(e) => setNewAsset((p) => ({ ...p, laptopAssetsTag: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Serial Number *</label>
                <input
                  type="text"
                  value={newAsset.dasId}
                  onChange={(e) => setNewAsset((p) => ({ ...p, dasId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">User Name</label>
                <input
                  type="text"
                  value={newAsset.userName}
                  onChange={(e) => setNewAsset((p) => ({ ...p, userName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Type *</label>
                <input
                  type="text"
                  value={"Laptop"}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Category *</label>
                <select
                  value={newAsset.laptopCategory}
                  onChange={(e) => setNewAsset((p) => ({ ...p, laptopCategory: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Hardware</option>
                  <option>Software</option>
                  <option>Peripherals</option>
                  <option>Fleet</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Model *</label>
                <input
                  type="text"
                  value={newAsset.model}
                  onChange={(e) => setNewAsset((p) => ({ ...p, model: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Vendor *</label>
                <input
                  type="text"
                  value={newAsset.make}
                  onChange={(e) => setNewAsset((p) => ({ ...p, make: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Power Adapter Details</label>
                <input
                  type="text"
                  value={newAsset.powerAdapterDetails || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, powerAdapterDetails: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Purchase Cost *</label>
                <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly value={0} />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Purchase Date *</label>
                <input
                  type="date"
                  value={newAsset.assignmentDate || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, assignmentDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Warranty Start Date</label>
                <input
                  type="date"
                  value={newAsset.warrantyStartDate || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, warrantyStartDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Location *</label>
                <input
                  type="text"
                  value={newAsset.assetsLocation}
                  onChange={(e) => setNewAsset((p) => ({ ...p, assetsLocation: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Warranty Expired Date</label>
                <input
                  type="date"
                  value={newAsset.warrantyExpiredDate || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, warrantyExpiredDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Install Status</label>
                <input
                  type="text"
                  value={newAsset.installStatus || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, installStatus: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Asset Status *</label>
                <select
                  value={newAsset.assetsStatus}
                  onChange={(e) => setNewAsset((p) => ({ ...p, assetsStatus: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="In Use">In Use</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Repaired">Repaired</option>
                  <option value="Decommissioned">Decommissioned</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Additional 16GB RAM Status</label>
                <input
                  type="text"
                  value={newAsset.additional16GbRamStatus || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, additional16GbRamStatus: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Assets Procure Status</label>
                <input
                  type="text"
                  value={newAsset.assetsProcureStatus || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, assetsProcureStatus: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Ageing of Assets</label>
                <input
                  type="number"
                  value={newAsset.ageingOfAssets ?? ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, ageingOfAssets: e.target.value === "" ? undefined : Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  value={newAsset.department || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, department: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Owner</label>
                <input
                  type="text"
                  value={newAsset.owner || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, owner: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <div className="text-gray-900 mt-2">Technical Specification</div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Processor</label>
                <input
                  type="text"
                  value={newAsset.processor || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, processor: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">RAM</label>
                <input
                  type="text"
                  value={newAsset.ram || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, ram: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Storage</label>
                <input
                  type="text"
                  value={newAsset.storage || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, storage: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Display</label>
                <input
                  type="text"
                  value={newAsset.display || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, display: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">GPU</label>
                <input
                  type="text"
                  value={newAsset.gpu || ""}
                  onChange={(e) => setNewAsset((p) => ({ ...p, gpu: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-[#00A3A1] text-white rounded-lg hover:bg-[#008C8A] transition-colors"
                onClick={handleCreateAsset}
                disabled={saving}
              >
                Add Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-gray-900 mb-6">Edit Asset</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Status *</label>
                <select
                  value={editForm.assetsStatus}
                  onChange={(e) => setEditForm((p) => ({ ...p, assetsStatus: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="In Use">In Use</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Repaired">Repaired</option>
                  <option value="Decommissioned">Decommissioned</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Location *</label>
                <input
                  type="text"
                  value={editForm.assetsLocation}
                  onChange={(e) => setEditForm((p) => ({ ...p, assetsLocation: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditAssetId(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAsset}
                className="flex-1 px-4 py-2 bg-[#00A3A1] text-white rounded-lg hover:bg-[#008C8A] transition-colors"
                disabled={saving}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showMovementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-gray-900 mb-6">Create Movement</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Asset *</label>
                <select
                  value={movementForm.assetId}
                  onChange={(e) => setMovementForm((p) => ({ ...p, assetId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Asset</option>
                  {backendAssets.map((a) => (
                    <option key={a.assetId} value={a.assetId.toString()}>
                      {a.laptopAssetsTag} – {a.make} {a.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Movement Type *</label>
                <select
                  value={movementForm.movementType}
                  onChange={(e) => setMovementForm((p) => ({ ...p, movementType: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Checked Out">Checked Out</option>
                  <option value="Checked In">Checked In</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Status Change">Status Change</option>
                  <option value="Location Change">Location Change</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">From Location</label>
                <input
                  type="text"
                  value={movementForm.fromLocation}
                  onChange={(e) => setMovementForm((p) => ({ ...p, fromLocation: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">To Location</label>
                <input
                  type="text"
                  value={movementForm.toLocation}
                  onChange={(e) => setMovementForm((p) => ({ ...p, toLocation: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Moved By *</label>
                <input
                  type="text"
                  value={movementForm.movedBy}
                  onChange={(e) => setMovementForm((p) => ({ ...p, movedBy: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Movement Date *</label>
                <input
                  type="date"
                  value={movementForm.movementDate}
                  onChange={(e) => setMovementForm((p) => ({ ...p, movementDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMovementModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-[#00A3A1] text-white rounded-lg hover:bg-[#008C8A] transition-colors"
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
