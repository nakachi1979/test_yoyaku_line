// LIFF ID を設定してください
const LIFF_ID = '2008319642-xvazbD72'; // ← あなたのLIFF ID

// アプリケーションの状態
let currentUser = null;

// LIFF初期化
async function initializeLIFF() {
    try {
        await liff.init({ liffId: LIFF_ID });
        
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
        
        // ユーザー情報を取得
        const profile = await liff.getProfile();
        currentUser = {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
        };
        
        // プロフィール情報をフォームに自動入力
        document.getElementById('name').value = profile.displayName;
        
        // アプリを表示
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        
        // 初期化
        initializeApp();
        
    } catch (error) {
        console.error('LIFF初期化エラー:', error);
        alert('アプリの初期化に失敗しました。もう一度お試しください。');
    }
}

// アプリ初期化
function initializeApp() {
    setupDateInput();
    setupTimeOptions();
    setupNavigation();
    setupBookingForm();
    loadBookings();
}

// 日付入力の設定（今日以降のみ選択可能）
function setupDateInput() {
    const dateInput = document.getElementById('date');
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 90); // 90日先まで予約可能
    
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
}

// 時間オプションの設定（11:00-22:00、30分刻み）
function setupTimeOptions() {
    const timeSelect = document.getElementById('time');
    const startHour = 11;
    const endHour = 22;
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute of [0, 30]) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const option = document.createElement('option');
            option.value = timeString;
            option.textContent = timeString;
            timeSelect.appendChild(option);
        }
    }
}

// ナビゲーション設定
function setupNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const pages = document.querySelectorAll('.page');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPage = tab.dataset.page;
            
            // タブの切り替え
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // ページの切り替え
            pages.forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(`${targetPage}-page`).classList.add('active');
            
            // 予約確認ページを開いたら予約をリロード
            if (targetPage === 'myBookings') {
                loadBookings();
            }
        });
    });
}

// 予約フォームの送信処理
function setupBookingForm() {
    const form = document.getElementById('booking-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = {
            id: Date.now().toString(),
            userId: currentUser.userId,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            guests: document.getElementById('guests').value,
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            notes: document.getElementById('notes').value,
            createdAt: new Date().toISOString()
        };
        
        // LocalStorageに保存
        saveBooking(formData);
        
        // フォームをリセット
        form.reset();
        document.getElementById('name').value = currentUser.displayName;
        
        // 成功メッセージを表示
        showModal(
            '予約完了',
            `予約が完了しました！\n\n日時: ${formatDate(formData.date)} ${formData.time}\n人数: ${formData.guests}名\n\n当日お待ちしております。`
        );
        
        // LINEにシェアメッセージを送信（オプション）
        if (liff.isApiAvailable('shareTargetPicker')) {
            shareBookingConfirmation(formData);
        }
    });
}

// 予約を保存
function saveBooking(booking) {
    let bookings = getBookings();
    bookings.push(booking);
    localStorage.setItem('bookings', JSON.stringify(bookings));
}

// 予約一覧を取得
function getBookings() {
    const bookings = localStorage.getItem('bookings');
    return bookings ? JSON.parse(bookings) : [];
}

// ユーザーの予約を取得
function getUserBookings() {
    const allBookings = getBookings();
    return allBookings.filter(booking => booking.userId === currentUser.userId);
}

// 予約を削除
function deleteBooking(bookingId) {
    let bookings = getBookings();
    bookings = bookings.filter(booking => booking.id !== bookingId);
    localStorage.setItem('bookings', JSON.stringify(bookings));
    loadBookings();
}

// 予約一覧を表示
function loadBookings() {
    const bookingsList = document.getElementById('bookings-list');
    const userBookings = getUserBookings();
    
    if (userBookings.length === 0) {
        bookingsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <p>予約がありません</p>
            </div>
        `;
        return;
    }
    
    // 日付でソート（新しい順）
    userBookings.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    bookingsList.innerHTML = userBookings.map(booking => {
        const isPast = new Date(booking.date + ' ' + booking.time) < new Date();
        const statusBadge = isPast ? '<span style="color: #999;">（終了）</span>' : '<span style="color: #06c755;">（予約中）</span>';
        
        return `
            <div class="booking-item">
                <h3>予約ID: ${booking.id} ${statusBadge}</h3>
                <div class="booking-detail">
                    <strong>📅 日時:</strong>
                    <span>${formatDate(booking.date)} ${booking.time}</span>
                </div>
                <div class="booking-detail">
                    <strong>👥 人数:</strong>
                    <span>${booking.guests}名</span>
                </div>
                <div class="booking-detail">
                    <strong>👤 名前:</strong>
                    <span>${booking.name}</span>
                </div>
                <div class="booking-detail">
                    <strong>📞 電話:</strong>
                    <span>${booking.phone}</span>
                </div>
                ${booking.notes ? `
                    <div class="booking-detail">
                        <strong>📝 備考:</strong>
                        <span>${booking.notes}</span>
                    </div>
                ` : ''}
                ${!isPast ? `
                    <div class="booking-actions">
                        <button class="btn btn-danger" onclick="confirmDelete('${booking.id}')">
                            キャンセル
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// 削除確認
function confirmDelete(bookingId) {
    const booking = getBookings().find(b => b.id === bookingId);
    if (confirm(`予約をキャンセルしますか？\n\n日時: ${formatDate(booking.date)} ${booking.time}\n人数: ${booking.guests}名`)) {
        deleteBooking(bookingId);
        showModal('キャンセル完了', '予約をキャンセルしました。');
    }
}

// 日付のフォーマット
function formatDate(dateString) {
    const date = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = days[date.getDay()];
    
    return `${year}年${month}月${day}日(${dayOfWeek})`;
}

// モーダル表示
function showModal(title, message) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    modal.classList.add('show');
}

// モーダルを閉じる
document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('modal').classList.remove('show');
});

// 予約確認メッセージをシェア（オプション機能）
async function shareBookingConfirmation(booking) {
    try {
        const result = await liff.shareTargetPicker([
            {
                type: 'text',
                text: `レストラン雅の予約が完了しました！\n\n📅 日時: ${formatDate(booking.date)} ${booking.time}\n👥 人数: ${booking.guests}名\n\nお店でお会いしましょう！`
            }
        ]);
        
        if (result) {
            console.log('シェアに成功しました');
        }
    } catch (error) {
        console.log('シェアがキャンセルされました', error);
    }
}

// アプリ起動時にLIFFを初期化
window.addEventListener('load', () => {
    initializeLIFF();
});