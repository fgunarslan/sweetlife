import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, Users, Building, CheckCircle, XCircle, Settings, Edit } from 'lucide-react';

export default function DoorAccessSystem() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [residents, setResidents] = useState([]);
  const [deletedResidents, setDeletedResidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [permanentDeleteConfirm, setPermanentDeleteConfirm] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [apiSettings, setApiSettings] = useState({ username: '', password: '', originator: 'MUTLUCELL' });
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', block: '', apartment: '', phone: '',
    residentType: 'Kiracı', description: '', hasAccess: false,
    accessUsername: '', accessPassword: '', accessRole: 'user'
  });

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const session = localStorage.getItem('session');
      if (session) {
        const user = JSON.parse(session);
        if (user.exp > Date.now()) {
          setCurrentUser(user);
          setIsLoggedIn(true);
          loadData();
        }
      }
    } catch (e) {}
  };

  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt_key_2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleLogin = async () => {
    setLoginError('');
    const hashedPass = await hashPassword(loginForm.password);
    const masterHash = await hashPassword('Bf848213&');
    
    if (loginForm.username === 'fgunarslan73@gmail.com' && hashedPass === masterHash) {
      const user = { username: loginForm.username, role: 'admin', exp: Date.now() + 86400000 };
      localStorage.setItem('session', JSON.stringify(user));
      setCurrentUser(user);
      setIsLoggedIn(true);
      loadData();
      return;
    }
    
    try {
      const res = localStorage.getItem('residents');
      if (res) {
        const allResidents = JSON.parse(res);
        const resident = allResidents.find(r => r.hasAccess && r.accessUsername === loginForm.username);
        if (resident) {
          const residentHash = await hashPassword(resident.accessPassword);
          if (hashedPass === residentHash) {
            const user = { username: loginForm.username, role: resident.accessRole, exp: Date.now() + 86400000 };
            localStorage.setItem('session', JSON.stringify(user));
            setCurrentUser(user);
            setIsLoggedIn(true);
            loadData();
            return;
          }
        }
      }
    } catch (e) {}
    
    setLoginError('Kullanıcı adı veya parola hatalı');
  };

  const handleLogout = async () => {
    try { localStorage.removeItem('session'); } catch (e) {}
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const loadData = async () => {
    try {
      const res = localStorage.getItem('residents');
      if (res) setResidents(JSON.parse(res));
    } catch (e) {}
    try {
      const del = localStorage.getItem('deleted-residents');
      if (del) setDeletedResidents(JSON.parse(del));
    } catch (e) {}
    try {
      const api = localStorage.getItem('api-settings');
      if (api) setApiSettings(JSON.parse(api));
    } catch (e) {}
  };

  const saveResidents = async (data) => {
    localStorage.setItem('residents', JSON.stringify(data));
    setResidents(data);
  };

  const saveDeletedResidents = async (data) => {
    localStorage.setItem('deleted-residents', JSON.stringify(data));
    setDeletedResidents(data);
  };

  const showNotif = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const sendSMS = async (cmd, phone) => {
    const target = '+905307059048';
    const msg = `${cmd} ${phone}`;
    if (!apiSettings.username) {
      console.log('TEST:', msg);
      showNotif(`TEST: ${msg}`, 'success');
      return true;
    }
    try {
      const xml = `<?xml version="1.0"?><smspack ka="${apiSettings.username}" pwd="${apiSettings.password}" org="${apiSettings.originator}"><mesaj><metin>${msg}</metin><nums>${target}</nums></mesaj></smspack>`;
      await fetch('https://smsgw.mutlucell.com.tr/smsgw-ws/sndblkex', {
        method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: xml
      });
      showNotif(`SMS: ${msg}`, 'success');
      return true;
    } catch (e) {
      showNotif('SMS hatası', 'error');
      return false;
    }
  };

  const handleAdd = async () => {
    if (!formData.firstName || !formData.phone) {
      showNotif('Ad ve telefon gerekli', 'error');
      return;
    }
    if (formData.hasAccess && (!formData.accessUsername || !formData.accessPassword)) {
      showNotif('Kullanıcı adı ve parola gerekli', 'error');
      return;
    }
    const phone = formData.phone.replace(/\D/g, '');
    if (editingResident) {
      const updated = { ...editingResident, ...formData, phone };
      await saveResidents(residents.map(r => r.id === editingResident.id ? updated : r));
      showNotif('Güncellendi');
      setEditingResident(null);
    } else {
      await sendSMS('ekle', phone);
      await saveResidents([...residents, { id: Date.now(), ...formData, phone }]);
      showNotif('Eklendi');
    }
    setFormData({ firstName: '', lastName: '', block: '', apartment: '', phone: '', residentType: 'Kiracı', description: '', hasAccess: false, accessUsername: '', accessPassword: '', accessRole: 'user' });
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await sendSMS('sil', deleteConfirm.phone);
    await saveResidents(residents.filter(r => r.id !== deleteConfirm.id));
    await saveDeletedResidents([...deletedResidents, { ...deleteConfirm, deletedDate: new Date().toISOString() }]);
    showNotif('Silindi');
    setDeleteConfirm(null);
  };

  const handleRestore = async (resident) => {
    await sendSMS('ekle', resident.phone);
    await saveDeletedResidents(deletedResidents.filter(r => r.id !== resident.id));
    const restored = { ...resident };
    delete restored.deletedDate;
    await saveResidents([...residents, restored]);
    showNotif('Geri yüklendi');
  };

  const confirmPermanentDelete = async () => {
    await saveDeletedResidents(deletedResidents.filter(r => r.id !== permanentDeleteConfirm.id));
    showNotif('Kalıcı silindi');
    setPermanentDeleteConfirm(null);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortResidents = (list) => {
    return [...list].sort((a, b) => {
      let cA, cB;
      if (sortBy === 'name') {
        cA = `${a.firstName} ${a.lastName}`.toLowerCase();
        cB = `${b.firstName} ${b.lastName}`.toLowerCase();
      } else if (sortBy === 'block') {
        cA = a.block.toLowerCase();
        cB = b.block.toLowerCase();
      } else {
        cA = parseInt(a.apartment) || a.apartment;
        cB = parseInt(b.apartment) || b.apartment;
      }
      if (cA < cB) return sortOrder === 'asc' ? -1 : 1;
      if (cA > cB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const isAdmin = currentUser && currentUser.role === 'admin';

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-lg">
              <Building className="text-white" size={48} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">Kapı Giriş Kontrol</h1>
          <p className="text-center text-gray-600 mb-6">Sakin Yönetim Sistemi</p>
          {loginError && (
            <div className="mb-4 p-3 bg-red-100 rounded-lg flex items-center gap-2">
              <XCircle className="text-red-600" size={20} />
              <span className="text-red-800 text-sm">{loginError}</span>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Kullanıcı Adı</label>
              <input type="text" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} className="w-full px-4 py-3 border rounded-lg" placeholder="E-posta" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Parola</label>
              <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} className="w-full px-4 py-3 border rounded-lg" placeholder="Parola" />
            </div>
            <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">Giriş Yap</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-lg"><Building className="text-white" size={24} /></div>
              <div>
                <h1 className="text-2xl font-bold">Kapı Giriş Kontrol</h1>
                <p className="text-sm text-gray-600">Sakin Yönetimi</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="bg-blue-100 px-4 py-2 rounded-lg"><span className="font-semibold text-blue-800">{residents.length} Sakin</span></div>
              {isAdmin && <button onClick={() => setShowDeleted(!showDeleted)} className="bg-orange-500 text-white px-4 py-2 rounded-lg">Silinenler ({deletedResidents.length})</button>}
              {isAdmin && <button onClick={() => setShowSettings(!showSettings)} className="bg-gray-700 text-white px-4 py-2 rounded-lg">API</button>}
              <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded-lg">Çıkış</button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {notification && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
            {notification.type === 'success' ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
            <span>{notification.message}</span>
          </div>
        )}

        {deleteConfirm && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Silme Onayı</h3>
              <p className="mb-6">{deleteConfirm.firstName} {deleteConfirm.lastName} silinecek?</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-6 py-2 border rounded-lg">İptal</button>
                <button onClick={handleDelete} className="px-6 py-2 bg-red-500 text-white rounded-lg">Sil</button>
              </div>
            </div>
          </div>
        )}

        {permanentDeleteConfirm && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Kalıcı Silme</h3>
              <p className="mb-6"><strong>{permanentDeleteConfirm.firstName} {permanentDeleteConfirm.lastName}</strong> kalıcı silinecek!</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setPermanentDeleteConfirm(null)} className="px-6 py-2 border rounded-lg">İptal</button>
                <button onClick={confirmPermanentDelete} className="px-6 py-2 bg-red-600 text-white rounded-lg">Sil</button>
              </div>
            </div>
          </div>
        )}

        {showSettings && isAdmin && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex justify-between mb-4">
              <h3 className="text-xl font-bold">Mutlucell API Ayarları</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 text-2xl">✕</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Kullanıcı Adı</label>
                <input type="text" placeholder="Mutlucell kullanıcı adınız" value={apiSettings.username} onChange={(e) => setApiSettings({...apiSettings, username: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Parola / API Key</label>
                <input type="password" placeholder="Parolanız" value={apiSettings.password} onChange={(e) => setApiSettings({...apiSettings, password: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Originator</label>
                <input type="text" placeholder="MUTLUCELL" value={apiSettings.originator} onChange={(e) => setApiSettings({...apiSettings, originator: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
              </div>
            </div>
            <button onClick={() => { localStorage.setItem('api-settings', JSON.stringify(apiSettings)); showNotif('Kaydedildi'); }} className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg">Kaydet</button>
          </div>
        )}

        {showDeleted && isAdmin && (
          <div className="bg-white rounded-xl shadow-lg mb-8">
            <div className="bg-orange-500 text-white px-6 py-4 flex justify-between">
              <h2 className="text-xl font-bold">Silinen Sakinler</h2>
              <button onClick={() => setShowDeleted(false)}>✕</button>
            </div>
            <div className="p-6">
              {deletedResidents.map(r => (
                <div key={r.id} className="flex justify-between items-center p-4 border-b">
                  <div>
                    <div className="font-bold">{r.firstName} {r.lastName}</div>
                    <div className="text-sm text-gray-600">{r.block}-{r.apartment} | 0{r.phone}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRestore(r)} className="bg-green-500 text-white px-4 py-2 rounded text-sm">Geri Yükle</button>
                    <button onClick={() => setPermanentDeleteConfirm(r)} className="bg-red-600 text-white px-4 py-2 rounded text-sm">Kalıcı Sil</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <input type="text" placeholder="Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 max-w-md px-4 py-3 border rounded-lg" />
            {isAdmin && <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-6 py-3 rounded-lg ml-4">+ Yeni Sakin</button>}
          </div>

          {showForm && isAdmin && (
            <div className="mb-6 p-6 bg-blue-50 rounded-lg">
              <h3 className="text-xl font-bold mb-4">{editingResident ? 'Düzenle' : 'Yeni Sakin'}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input placeholder="Ad" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="px-4 py-2 border rounded-lg" />
                <input placeholder="Soyad" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="px-4 py-2 border rounded-lg" />
                <input placeholder="Blok" value={formData.block} onChange={(e) => setFormData({...formData, block: e.target.value})} className="px-4 py-2 border rounded-lg" />
                <input placeholder="Daire" value={formData.apartment} onChange={(e) => setFormData({...formData, apartment: e.target.value})} className="px-4 py-2 border rounded-lg" />
                <input placeholder="Telefon" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="px-4 py-2 border rounded-lg md:col-span-2" />
                <textarea placeholder="Açıklama" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="px-4 py-2 border rounded-lg md:col-span-2" rows="2" />
                <div className="md:col-span-2 flex gap-4">
                  {['Kiracı', 'Daire Sahibi', 'Hizmetli'].map(t => (
                    <label key={t} className="flex items-center gap-2">
                      <input type="radio" checked={formData.residentType === t} onChange={() => setFormData({...formData, residentType: t})} />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
                <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg border">
                  <label className="flex items-center gap-2 mb-3">
                    <input type="checkbox" checked={formData.hasAccess} onChange={(e) => setFormData({...formData, hasAccess: e.target.checked})} />
                    <span className="font-medium">Sisteme giriş yetkisi ver</span>
                  </label>
                  {formData.hasAccess && (
                    <div className="space-y-3">
                      <input placeholder="Kullanıcı adı (e-posta)" value={formData.accessUsername} onChange={(e) => setFormData({...formData, accessUsername: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                      <input type="password" placeholder="Parola" value={formData.accessPassword} onChange={(e) => setFormData({...formData, accessPassword: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2"><input type="radio" checked={formData.accessRole === 'user'} onChange={() => setFormData({...formData, accessRole: 'user'})} /><span>Kullanıcı</span></label>
                        <label className="flex items-center gap-2"><input type="radio" checked={formData.accessRole === 'admin'} onChange={() => setFormData({...formData, accessRole: 'admin'})} /><span>Admin</span></label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setShowForm(false); setEditingResident(null); }} className="px-6 py-2 border rounded-lg">İptal</button>
                <button onClick={handleAdd} className="px-6 py-2 bg-green-600 text-white rounded-lg">Kaydet</button>
              </div>
            </div>
          )}

          <div className="mb-4 flex gap-2">
            <button onClick={() => handleSort('name')} className={`px-4 py-2 rounded-lg ${sortBy === 'name' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Ad Soyad {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</button>
            <button onClick={() => handleSort('block')} className={`px-4 py-2 rounded-lg ${sortBy === 'block' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Blok {sortBy === 'block' && (sortOrder === 'asc' ? '↑' : '↓')}</button>
            <button onClick={() => handleSort('apartment')} className={`px-4 py-2 rounded-lg ${sortBy === 'apartment' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Daire {sortBy === 'apartment' && (sortOrder === 'asc' ? '↑' : '↓')}</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold">AD SOYAD</th>
                  <th className="px-6 py-3 text-left text-xs font-bold">BLOK</th>
                  <th className="px-6 py-3 text-left text-xs font-bold">DAİRE</th>
                  <th className="px-6 py-3 text-left text-xs font-bold">TELEFON</th>
                  <th className="px-6 py-3 text-left text-xs font-bold">TİP</th>
                  <th className="px-6 py-3 text-left text-xs font-bold">AÇIKLAMA</th>
                  {isAdmin && <th className="px-6 py-3 text-left text-xs font-bold">İŞLEM</th>}
                </tr>
              </thead>
              <tbody>
                {sortResidents(residents.filter(r => {
                  const s = searchTerm.toLowerCase();
                  return r.firstName.toLowerCase().includes(s) || r.lastName.toLowerCase().includes(s) || r.phone.includes(s);
                })).map(r => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{r.firstName} {r.lastName}</td>
                    <td className="px-6 py-4">{r.block}</td>
                    <td className="px-6 py-4">{r.apartment}</td>
                    <td className="px-6 py-4">0{r.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        r.residentType === 'Daire Sahibi' ? 'bg-green-100 text-green-800' :
                        r.residentType === 'Kiracı' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>{r.residentType}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.description || '-'}</td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingResident(r); setFormData(r); setShowForm(true); }} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">✏️</button>
                          <button onClick={() => setDeleteConfirm(r)} className="bg-red-500 text-white px-3 py-1 rounded text-sm">🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}