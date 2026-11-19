const $ = id => document.getElementById(id);
const log = (id, message) => { const li = document.createElement('li'); li.textContent = `${new Date().toLocaleTimeString('uk-UA')} · ${message}`; $(id).prepend(li); while ($(id).children.length > 30) $(id).lastChild.remove(); };
const socket = io(); let joinedRoom;
socket.on('connect', () => { $('connection').textContent = '● Підключено'; if (joinedRoom) socket.emit('joinRoom', joinedRoom); });
socket.on('disconnect', () => $('connection').textContent = '○ Немає зв’язку');
socket.on('connect_error', () => $('connection').textContent = 'Помилка підключення');
socket.on('pong', d => log('globalLog', `pong · ${d.timestamp}`));
socket.on('globalAlert', d => log('globalLog', d.message));
socket.on('joined', d => { joinedRoom = d.roomId; log('roomLog', `Підписка: ${d.roomId}`); });
socket.on('left', d => { if(joinedRoom === d.roomId) joinedRoom = undefined; log('roomLog', `Вихід: ${d.roomId}`); });
socket.on('dropStarted', d => log('roomLog', `dropStarted · ${d.title} · ${d.status}`));
socket.on('exception', d => log('globalLog', `Помилка: ${d.message}`));
$('ping').onclick = () => socket.emit('ping');
$('broadcast').onclick = () => socket.emit('broadcastNotification', $('message').value);
$('join').onclick = () => socket.emit('joinRoom', $('room').value);
$('leave').onclick = () => socket.emit('leaveRoom', $('room').value);
$('start').onclick = async () => {
 $('start').disabled = true;
 try { const res = await fetch(`/collections/${$('collection').value}/start`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerEmail:$('email').value})}); const data = await res.json(); $('result').textContent = res.ok ? `Продажі відкрито. Подія ${data.event} → ${data.room}. Лист прийнятий SMTP.` : `Помилка: ${[].concat(data.message).join(', ')}`; }
 catch { $('result').textContent = 'Помилка з’єднання із сервером'; }
 finally { $('start').disabled = false; }
};
const stream = new EventSource('/notifications/events/stream');
stream.onmessage = ({data}) => { const d=JSON.parse(data); log('streamLog', `${d.status} · клієнтів: ${d.connections} · ${d.timestamp}`); };
stream.onerror = () => log('streamLog', 'Потік перепідключається…');
const collection = new URLSearchParams(location.search).get('collection');
if (['101','202'].includes(collection)) { $('collection').value = collection; $('room').value = `drop_${collection}`; }
