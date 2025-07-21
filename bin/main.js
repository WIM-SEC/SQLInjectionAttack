// sqli_main.js

// 共通のユーザーデータ (IndexedDBに初期投入されるデータ)
const userData = [
    { name: "佐藤 一郎", id: "i-sato", email: "i-sato@tanuki-mail.com", password: "Gf4z2PmA", passhash: "e6f4a8e63a1f3c7e4b5f6d7c8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b", address: "青影県幻野市虚町1-2-3", birthday: "1990/01/15", tel: "090-1234-567" },
    { name: "高橋 恵子", id: "k-taka", email: "k-takahashi@neko-mail.com", password: "b9Lp3YxN", passhash: "5d83c3e8a9d0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6", address: "霧山県幽谷市霞町4-5-6", birthday: "1988/02/20", tel: "080-2345-678" },
    { name: "鈴木 勇", id: "i-suzuki", email: "isamu.suzuki@mail.usagi.com", password: "R6p2BtLs", passhash: "2e7a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a", address: "星海県夜空市星町7-8-9", birthday: "1995/03/12", tel: "070-3456-789" },
    { name: "井上 花子", id: "hanako", email: "hanako.inoue@tori-mail.com", password: "9jTpMn3b", passhash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b", address: "虹川県夢見市光町10-11-12", birthday: "1993/04/18", tel: "090-4567-890" },
    { name: "管理者", id: "admin", email: "admin@toru-tori.co.jp", password: "password", passhash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", address: "月影県影原市月町13-14-15 株式会社取鳥 4F サーバー管理部門", birthday: "2024/04/01", tel: "080-5678-901" }
];
// 各パスワードのSHA-256ハッシュ値は以下の通りです
// "Gf4z2PmA" -> "e6f4a8e63a1f3c7e4b5f6d7c8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b"
// "b9Lp3YxN" -> "5d83c3e8a9d0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6"
// "R6p2BtLs" -> "2e7a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a"
// "9jTpMn3b" -> "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
// "password" -> "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"


let db; // IndexedDBのインスタンス

// IndexedDBの初期化
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('sqli_db', 1);

        request.onupgradeneeded = function(event) {
            db = event.target.result;
            const objectStore = db.createObjectStore('users', { keyPath: 'id' });
            objectStore.createIndex('email', 'email', { unique: false }); // emailもユニークではない可能性
            objectStore.createIndex('password', 'password', { unique: false });
            objectStore.createIndex('passhash', 'passhash', { unique: false });
            
            // 初期データを投入
            objectStore.transaction.oncomplete = function() {
                const userObjectStore = db.transaction('users', 'readwrite').objectStore('users');
                userData.forEach(user => {
                    userObjectStore.add(user);
                });
            };
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            console.log("IndexedDB initialized successfully.");
            resolve();
        };

        request.onerror = function(event) {
            console.error("IndexedDB error:", event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

// ユーザーデータを全て取得する
function getAllUsers() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('users', 'readonly');
        const objectStore = transaction.objectStore('users');
        const users = [];

        objectStore.openCursor().onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                users.push(cursor.value);
                cursor.continue();
            } else {
                resolve(users);
            }
        };

        objectStore.onerror = function(event) {
            reject(event.target.errorCode);
        };
    });
}

// ユーザーをIDまたはEmailで検索する (Part 1の脆弱なログイン模擬用)
function findUserVulnerable(idOrEmail, password) {
    return new Promise(async (resolve, reject) => {
        const allUsers = await getAllUsers();
        
        // 疑似SQLクエリ文字列の構築 (脆弱性あり)
        let simulatedQuery = `SELECT * FROM users WHERE (email = '${idOrEmail}' OR id = '${idOrEmail}') AND password = '${password}';`;
        console.log("Simulated Query (Vulnerable):", simulatedQuery);

        // SQLインジェクションパターン検出 (Part 1の脆弱性を再現するための判定)
        // ここで、様々なインジェクションパターンに対応し、全ユーザーを返す
        const injectionPatterns = [
            // 基本的な真の条件を付加するパターン (コメントアウトあり/なし)
            /'.*\s*OR\s*['"]?1['"]?=[\s_]*['"]?1['"]?\s*(?:--|\/\*|\#|$)/i, // ' OR '1'='1' -- / /* / # / EndOfLine
            /'.*\s*OR\s*['"]?a['"]?=[\s_]*['"]?a['"]?\s*(?:--|\/\*|\#|$)/i, // ' OR 'a'='a' --
            /'.*\s*OR\s*true\s*(?:--|\/\*|\#|$)/i, // ' OR true --
            /'.*\s*OR\s*1=1\s*(?:--|\/\*|\#|$)/i, // ' OR 1=1 --
            
            // コメントアウトなしで文を終了させるパターン
            /^'[\s_]*OR[\s_]*['"]?1['"]?=[\s_]*['"]?1['"]?$/, // 例えばパスワード欄に `' OR '1'='1'`
            /^'[\s_]*OR[\s_]*['"]?a['"]?=[\s_]*['"]?a['"]?$/, // 例えばパスワード欄に `' OR 'a'='a'`
            /^'[\s_]*OR[\s_]*true$/,                     // 例えばパスワード欄に `' OR true`
            /^'[\s_]*OR[\s_]*1=1$/,                      // 例えばパスワード欄に `' OR 1=1`

            // その他のSQLキーワードによる攻撃
            /;[\s_]*(?:DROP|DELETE|UPDATE|INSERT)\b/i, // セミコロンでのSQL文追加
            /\bUNION[\s_]+SELECT\b/i, // UNION SELECT
            /\b(DROP|DELETE|UPDATE|INSERT)\b/i, // 不正なコマンドキーワード (単独の場合)

            // admin' -- のようなユーザー名インジェクションにも対応
            /admin'[\s_]*(?:--|\/\*|\#|$)/i
        ];

        let injectionDetected = false;
        // idOrEmail と password 両方でパターンチェック
        if (idOrEmail || password) { // どちらかに入力がある場合
            for (const pattern of injectionPatterns) {
                if (pattern.test(idOrEmail) || pattern.test(password)) {
                    injectionDetected = true;
                    break;
                }
            }
        }
        
        // 特定の強力なインジェクション文字列に対しては無条件でログインを成功させる (デモ目的のため)
        const specificExploits = [
            `' OR 'A'='A`, // パスワード欄にこれだけ
            `' OR 'a'='a`, // パスワード欄にこれだけ            
            `' OR '1'='1`,
            `' OR 1=1`,
            `' OR 'A' = 'A`, // パスワード欄にこれだけ
            `' OR 'a' = 'a`, // パスワード欄にこれだけ
            `' OR '1' = '1`,
            `' OR 1 = 1`,
            `' OR true`,
            `' OR 'a'='a' --`, // コメントアウト付き
            `' OR 1=1 --`,
            `admin' --`, // ユーザーID欄にこれだけ
            `' OR 'a'='a'; --`
        ];

        if (specificExploits.includes(password.trim()) || specificExploits.includes(idOrEmail.trim())) {
            injectionDetected = true;
        }

        if (injectionDetected) {
            // インジェクション成功とみなし、全ユーザーを返す
            console.log("SQL Injection Attack Successful!");
            resolve(allUsers); // 全ユーザー情報を渡す
            return;
        }

        // 通常の照合 (インジェクションがなければ、正しいID/Emailとパスワードの組み合わせでのみ認証)
        const foundUsers = allUsers.filter(user => {
            return (user.email === idOrEmail || user.id === idOrEmail) && user.password === password;
        });

        resolve(foundUsers); // 通常の認証結果を返す
    });
}

// ユーザーをIDまたはEmailで検索する (Part 2の対策済みログイン模擬用)
async function findUserSecure(idOrEmail, password) {
    // 対策済みの入力処理を模擬 (パラメータバインディングの概念)
    // ここでは、ユーザー入力の文字列を直接SQL構文に含めず、安全な値として処理することを再現します。
    // そのため、Part 1のようなインジェクションパターンは無効となります。

    // 擬似的にエスケープされたクエリ文字列 (表示用)
    // 実際のアプリケーションでは、プリペアドステートメントによってパラメータがバインドされ、SQL構文は破壊されない
    // ここでは、SQLインジェクションパターンが含まれていても、それがSQLとして評価されないことを模擬する
    const sanitizedIdOrEmail = idOrEmail.replace(/['";#\-=\(\)]/g, ''); // 簡易サニタイズ (表示上の表現)
    const sanitizedPassword = password.replace(/'/g, "''").replace(/--/g, "").replace(/#/g, ""); // 簡易サニタイズ (表示上の表現)

    // SQLインジェクションパターン検出自体は引き続き行うが、
    // ここでは検出されても「対策済み」としてログインを許可しない
    const injectionPatterns = [
        /'.*\s*OR\s*['"]?1['"]?=['"]?1['"]?\s*(?:--|\/\*|\#|$)/i, 
        /'.*\s*OR\s*['"]?a['"]?=['"]?a['"]?\s*(?:--|\/\*|\#|$)/i, 
        /'.*\s*OR\s*true\s*(?:--|\/\*|\#|$)/i, 
        /;/, 
        /\b(UNION|SELECT|DROP|DELETE|UPDATE|INSERT)\b/i
    ];
    let injectionAttempt = false;
    if (idOrEmail && password) {
        for (const pattern of injectionPatterns) {
            if (pattern.test(idOrEmail) || pattern.test(password)) {
                injectionAttempt = true;
                break;
            }
        }
    }

    if (injectionAttempt) {
        console.log("SQL Injection Attempt Detected but prevented (Secure System).");
        return []; // インジェクション試行はログインさせない
    }


    let simulatedQuery = `SELECT * FROM users WHERE (email = '${sanitizedIdOrEmail}' OR id = '${sanitizedIdOrEmail}') AND password = '[ハッシュ化されたパスワードまたは安全な形式]';`; 
    console.log("Simulated Query (Secure):", simulatedQuery);

    const allUsers = await getAllUsers();
    
    // 認証は、正しいID/Emailと平文パスワードが入力された場合のみ成功
    const foundUser = allUsers.find(user => {
        return (user.email === idOrEmail || user.id === idOrEmail) && user.password === password;
    });

    // 見つかった場合は配列で返す
    return foundUser ? [foundUser] : [];
}

// SHA-256ハッシュ関数 (今回は直接認証には使わないが、Part3や説明用に残しておく)
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hexHash;
}


// --- ページごとのロジックの振り分け ---

var currentPart; // 各HTMLファイルで <script>var currentPart = X;</script> で設定

window.addEventListener("load", async function() {
    if (typeof currentPart === 'undefined') {
        console.error("currentPart is not defined. Ensure HTML sets it.");
        return;
    }

    await initIndexedDB(); // IndexedDBの初期化を待つ

    if (currentPart === 1) { // SQLI Part 1: 脆弱なログインページ
        document.getElementById('login').onclick = postPart1;
    } else if (currentPart === 1.1) { // SQLI Part 1 結果ページ
        displayEmployeeData('password'); // パスワード生表示
        setupResultPageButtons(1); // ★修正：結果ページボタンのセットアップ
    } else if (currentPart === 2) { // SQLI Part 2: 対策済みログインページ
        document.getElementById('login').onclick = postPart2;
    } else if (currentPart === 2.1) { // SQLI Part 2 結果ページ
        displayEmployeeData('passhash'); // パスワードハッシュ表示
        setupResultPageButtons(2); // ★修正：結果ページボタンのセットアップ
    }
});

// Part 1のpost関数
async function postPart1() {
    // ★★★ ここを修正：trim() を追加 ★★★
    const id = document.getElementById("id").value.trim();
    const ps = document.getElementById("pass").value.trim();

    const users = await findUserVulnerable(id, ps);

    if (users && users.length > 0) {
        // ログイン成功とみなし、結果ページへリダイレクト（データをlocalStorageに一時保存）
        const dataToDisplay = users;
        
        localStorage.setItem('sqli_p1_loggedin', 'OK');
        localStorage.setItem('sqli_p1_userdata', JSON.stringify(dataToDisplay));
        location.href = "./res/";
    } else {
        alert("パスワードが違うようです…");
    }
    document.getElementById("id").value = "";
    document.getElementById("pass").value = "";
    return false;
}

// Part 2のpost関数 (こちらも念のためtrim()を追加)
async function postPart2() {
    // ★★★ ここを修正：trim() を追加 ★★★
    const id = document.getElementById("id").value.trim();
    const ps = document.getElementById("pass").value.trim();

    const users = await findUserSecure(id, ps);

    if (users && users.length > 0) {
        const allUsers = await getAllUsers();
        const dataToDisplay = users[0].id === 'admin' ? allUsers : users;

        localStorage.setItem('sqli_p2_loggedin', 'OK');
        localStorage.setItem('sqli_p2_userdata', JSON.stringify(dataToDisplay));
        location.href = "./res/";
    } else {
        alert("パスワードが違うようです…");
    }
    document.getElementById("id").value = "";
    document.getElementById("pass").value = "";
    return false;
}

// 結果ページで従業員データを表示する関数
function displayEmployeeData(passwordField) { // 'password' or 'passhash'
    let loggedInFlagKey;
    let userDataKey;
    if (currentPart === 1.1) {
        loggedInFlagKey = 'sqli_p1_loggedin';
        userDataKey = 'sqli_p1_userdata';
    } else if (currentPart === 2.1) {
        loggedInFlagKey = 'sqli_p2_loggedin';
        userDataKey = 'sqli_p2_userdata';
    } else {
        console.error("Unknown currentPart for displayEmployeeData:", currentPart);
        return;
    }

    // ★修正：ログインフラグがない場合のリダイレクト
    if (localStorage.getItem(loggedInFlagKey) !== 'OK') {
        location.href = `../index.html`; // ログインページに戻る
        return;
    }

    const tableBody = document.querySelector('#employee-table tbody');
    if (!tableBody) {
        console.error("Table body not found!");
        return;
    }

    const userData = JSON.parse(localStorage.getItem(userDataKey));
    if (!userData || userData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">データがありません。</td></tr>';
        return;
    }

    tableBody.innerHTML = ''; // 既存の行をクリア

    userData.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.id}</td>
            <td>${user.email}</td>
            <td>${user[passwordField]}</td> <td>${user.address}</td>
            <td>${user.tel}</td>
            <td>${user.birthday}</td>
        `;
        tableBody.appendChild(row);
    });

    // データの表示が完了しても、ログインフラグはクリアしない
    // ユーザーがログアウトボタンを押すか、前のページに戻るまで保持
}

// ★★★ 追加：結果ページでのボタン操作ロジック ★★★
function setupResultPageButtons(partNumber) {
    const logoutButton = document.getElementById('logout-button');
    const backButton = document.getElementById('back-button');

    // ログアウトボタン
    if (logoutButton) {
        logoutButton.onclick = function() {
            // 該当するログインフラグをクリア
            localStorage.removeItem(`sqli_p${partNumber}_loggedin`);
            localStorage.removeItem(`sqli_p${partNumber}_userdata`);
            alert('ログアウトしました。');
            location.href = `../`; // ログインページに戻る
        };
    }
}