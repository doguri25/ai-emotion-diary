import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Frontend Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements - Auth
    const loginContainer = document.getElementById('loginContainer');
    const appContainer = document.getElementById('appContainer');
    const authForm = document.getElementById('authForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const signUpBtn = document.getElementById('signUpBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const userEmailDisplay = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');

    // DOM Elements - App
    const diaryInput = document.getElementById('diaryInput');
    const voiceBtn = document.getElementById('voiceBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const aiBox = document.getElementById('aiBox');
    const historyContainer = document.getElementById('historyContainer');
    const INITIAL_AI_TEXT = '여기에 AI의 답변이 표시됩니다.';

    // DOM Elements - Chat Modal
    const chatModal = document.getElementById('chatModal');
    const openChatBtn = document.getElementById('openChatBtn');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');

    let currentUser = null;
    let chatChannel = null;

    // Helper to get access token
    async function getAuthHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return {};
        return {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
        };
    }

    // --- Authentication Logic ---

    // Check Current Session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp(session.user);
    }

    // Auth Form Submit (Login)
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert(`로그인 실패: ${error.message}`);
        } else {
            currentUser = data.user;
            showApp(data.user);
        }
    });

    // Sign Up
    signUpBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            alert('이메일과 비밀번호를 입력해주세요!');
            return;
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            alert(`회원가입 실패: ${error.message}`);
        } else {
            alert('회원가입 성공! 가입 확인 이메일을 확인해주세요!');
            if (data.user && data.session) {
                currentUser = data.user;
                showApp(data.user);
            }
        }
    });

    // Google Login
    googleLoginBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) alert(`Google 로그인 실패: ${error.message}`);
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        location.reload(); 
    });

    function showApp(user) {
        loginContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        userEmailDisplay.innerText = user.email;
        fetchHistory(); 
        initializeChat(); // Pre-load chat data
    }

    // --- Chat Modal & Logic ---

    openChatBtn.addEventListener('click', () => {
        chatModal.style.display = 'flex';
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom when opening
    });

    closeChatBtn.addEventListener('click', () => {
        chatModal.style.display = 'none';
    });

    // Close on overlay click
    chatModal.addEventListener('click', (e) => {
        if (e.target === chatModal) chatModal.style.display = 'none';
    });

    async function initializeChat() {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50);

        if (!error && data) {
            chatMessages.innerHTML = '';
            data.forEach(msg => appendMessage(msg));
        }

        if (!chatChannel) {
            chatChannel = supabase
                .channel('public:messages')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                    appendMessage(payload.new);
                })
                .subscribe();
        }
    }

    function appendMessage(msg) {
        if (chatMessages.querySelector('.chat-empty')) {
            chatMessages.innerHTML = '';
        }

        const isOwner = currentUser && msg.user_id === currentUser.id;
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('chat-message');
        msgDiv.classList.add(isOwner ? 'chat-bubble-owner' : 'chat-bubble-other');

        const sender = document.createElement('span');
        sender.classList.add('chat-sender');
        sender.innerText = msg.user_email || '익명';

        const text = document.createElement('div');
        text.innerText = msg.content; 

        msgDiv.appendChild(sender);
        msgDiv.appendChild(text);
        chatMessages.appendChild(msgDiv);

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const contentText = chatInput.value.trim();
        if (!contentText || !currentUser) return;

        chatInput.value = '';

        const { error } = await supabase
            .from('messages')
            .insert([{
                user_id: currentUser.id,
                user_email: currentUser.email,
                content: contentText 
            }]);

        if (error) {
            console.error('Chat error:', error);
            alert('메시지 전송 실패: ' + error.message);
        }
    });

    // --- App Logic (Diary) ---

    async function fetchHistory() {
        historyContainer.innerHTML = '<div class="history-loading">불러오는 중...</div>';
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/history', { headers });
            const data = await response.json();

            if (data.history && data.history.length > 0) {
                renderHistory(data.history);
            } else {
                historyContainer.innerHTML = '<div class="history-empty">아직 기록된 일기가 없어요. 오늘의 일기를 작성해 보세요!</div>';
            }
        } catch (error) {
            console.error('Failed to load history:', error);
            historyContainer.innerHTML = '<div class="history-empty">히스토리를 불러오는 중 오류가 발생했습니다.</div>';
        }
    }

    function renderHistory(history) {
        historyContainer.innerHTML = '';
        history.forEach(item => {
            const date = new Date(item.createdAt).toLocaleString('ko-KR', {
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit'
            });

            const card = document.createElement('div');
            card.classList.add('history-card');
            
            const formattedAiResponse = item.aiResponse.replace(/\n/g, '<br>');

            card.innerHTML = `
                <span class="history-date">${date}</span>
                <div class="history-diary-text">${item.diaryText}</div>
                <div class="history-ai-response">
                    ✨ <strong>심리 상담 분석</strong><br><br>
                    ${formattedAiResponse}
                </div>
            `;
            historyContainer.appendChild(card);
        });
    }

    analyzeBtn.addEventListener('click', async () => {
        const diaryText = diaryInput.value.trim();

        if (diaryText === '') {
            alert('오늘의 하루를 먼저 기록해주세요!');
            diaryInput.focus();
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span>⏳</span> AI 분석 중...';
        aiBox.classList.add('analyzing');
        aiBox.innerText = '당신의 마음을 읽고 있어요... 잠시만 기다려 주세요.';

        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers,
                body: JSON.stringify({ diaryText }),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || '분석 중 오류가 발생했습니다.');

            const text = data.result.trim();
            const formattedText = text.replace(/\n/g, '<br>');
            aiBox.innerHTML = `✨ <strong>심리 상담 분석</strong><br><br>${formattedText}`;

            fetchHistory();
        } catch (error) {
            console.error('API Error:', error);
            aiBox.innerHTML = `❌ <strong>AI 분석 오류:</strong><br><br>${error.message}`;
            aiBox.style.borderColor = '#ff7675';
            aiBox.style.color = '#d63031';
        } finally {
            aiBox.classList.remove('analyzing');
            aiBox.style.borderStyle = 'solid';
            aiBox.style.borderColor = '#6c5ce7';
            aiBox.style.color = '#2d3436';
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<span>💡</span> 다시 분석하기';
        }
    });

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (Recognition) {
        const recognition = new Recognition();
        recognition.lang = 'ko-KR';
        recognition.onstart = () => {
            voiceBtn.disabled = true;
            voiceBtn.innerHTML = '<span>🎙️</span> 음성 인식 중...';
            voiceBtn.classList.add('voice-active');
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            diaryInput.value += (diaryInput.value ? ' ' : '') + transcript;
        };
        recognition.onend = () => {
            voiceBtn.disabled = false;
            voiceBtn.innerHTML = '<span>🎙️</span> 음성으로 입력하기';
            voiceBtn.classList.remove('voice-active');
        };
        voiceBtn.addEventListener('click', () => recognition.start());
    }
});
