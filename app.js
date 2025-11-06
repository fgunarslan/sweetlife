const { useState, useEffect, createElement: h } = React;
const { Plus, Trash2, Send, Users, Building, CheckCircle, XCircle, Settings, Edit } = lucide;

function DoorAccessSystem() {
  // Tüm state'ler
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [residents, setResidents] = useState([]);
  const [deletedResidents, setDeletedResidents] = useState([]);
  
  // Tüm fonksiyonlar - Firebase için düzenlenmiş
  const loadData = () => {
    try {
      const res = localStorage.getItem('residents');
      if (res) setResidents(JSON.parse(res));
    } catch (e) {}
  };

  const handleLogin = async () => {
    setLoginError('');
    const encoder = new TextEncoder();
    const data = encoder.encode(loginForm.password + 'salt_key_2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPass = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const masterData = encoder.encode('Bf848213&' + 'salt_key_2025');
    const masterBuffer = await crypto.subtle.digest('SHA-256', masterData);
    const masterArray = Array.from(new Uint8Array(masterBuffer));
    const masterHash = masterArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (loginForm.username === 'fgunarslan73@gmail.com' && hashedPass === masterHash) {
      const user = { username: loginForm.username, role: 'admin', exp: Date.now() + 86400000 };
      localStorage.setItem('session', JSON.stringify(user));
      setCurrentUser(user);
      setIsLoggedIn(true);
      loadData();
      return;
    }
    
    setLoginError('Kullanıcı adı veya parola hatalı');
  };

  // Giriş ekranı
  if (!isLoggedIn) {
    return h('div', { className: 'min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4' },
      h('div', { className: 'bg-white rounded-xl shadow-2xl p-8 w-full max-w-md' },
        h('div', { className: 'flex justify-center mb-6' },
          h('div', { className: 'bg-blue-600 p-4 rounded-lg' },
            h(Building, { className: 'text-white', size: 48 })
          )
        ),
        h('h1', { className: 'text-3xl font-bold text-center mb-2' }, 'Kapı Giriş Kontrol'),
        h('p', { className: 'text-center text-gray-600 mb-6' }, 'Sakin Yönetim Sistemi'),
        loginError && h('div', { className: 'mb-4 p-3 bg-red-100 rounded-lg flex items-center gap-2' },
          h(XCircle, { className: 'text-red-600', size: 20 }),
          h('span', { className: 'text-red-800 text-sm' }, loginError)
        ),
        h('div', { className: 'space-y-4' },
          h('div', null,
            h('label', { className: 'block text-sm font-medium mb-2' }, 'Kullanıcı Adı'),
            h('input', {
              type: 'text',
              value: loginForm.username,
              onChange: (e) => setLoginForm({...loginForm, username: e.target.value}),
              onKeyPress: (e) => e.key === 'Enter' && handleLogin(),
              className: 'w-full px-4 py-3 border rounded-lg',
              placeholder: 'E-posta'
            })
          ),
          h('div', null,
            h('label', { className: 'block text-sm font-medium mb-2' }, 'Parola'),
            h('input', {
              type: 'password',
              value: loginForm.password,
              onChange: (e) => setLoginForm({...loginForm, password: e.target.value}),
              onKeyPress: (e) => e.key === 'Enter' && handleLogin(),
              className: 'w-full px-4 py-3 border rounded-lg',
              placeholder: 'Parola'
            })
          ),
          h('button', {
            onClick: handleLogin,
            className: 'w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700'
          }, 'Giriş Yap')
        )
      )
    );
  }

  return h('div', { className: 'min-h-screen bg-gradient-to-br from-blue-50 to-purple-50' },
    h('div', { className: 'p-8 text-center' },
      h('h1', { className: 'text-4xl font-bold text-gray-800' }, '🎉 Sistem Çalışıyor!'),
      h('p', { className: 'text-xl text-gray-600 mt-4' }, 'Giriş başarılı!')
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(DoorAccessSystem));
