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

    // DOM Elements - Chat Modal & Profile
    const chatModal = document.getElementById('chatModal');
    const openChatBtn = document.getElementById('openChatBtn');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const userAvatar = document.getElementById('userAvatar');
    const avatarInput = document.getElementById('avatarInput');
    const avatarTrigger = document.getElementById('avatarTrigger');
    const changePhotoTextBtn = document.getElementById('changePhotoTextBtn');

    // DOM Elements - Chat Attachments
    const attachBtn = document.getElementById('attachBtn');
    const chatImageInput = document.getElementById('chatImageInput');

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

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp(session.user);
    }

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

    googleLoginBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) alert(`Google 로그인 실패: ${error.message}`);
    });

    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        location.reload(); 
    });

    function showApp(user) {
        loginContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        userEmailDisplay.innerText = user.email;
        fetchHistory(); 
        initializeChat(); 
        loadAvatar(user); 
    }

    // --- Profile & Avatar Logic ---

    function loadAvatar(user) {
        const avatarUrl = user.user_metadata?.avatar_url || 
                         `https://ui-avatars.com/api/?name=${user.email[0]}&background=6c5ce7&color=fff`;
        userAvatar.src = avatarUrl;
    }

    avatarTrigger.addEventListener('click', () => avatarInput.click());
    changePhotoTextBtn.addEventListener('click', () => avatarInput.click());

    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) throw updateError;

            const { data: { user } } = await supabase.auth.getUser();
            currentUser = user;
            loadAvatar(user);
            
            alert('프로필 사진이 업데이트되었습니다!');

        } catch (error) {
            console.error('Avatar update error:', error);
            alert('사진 업데이트 중 오류가 발생했습니다: ' + error.message);
        }
    });

    // --- Chat Modal & Logic ---

    openChatBtn.addEventListener('click', () => {
        chatModal.style.display = 'flex';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    closeChatBtn.addEventListener('click', () => {
        chatModal.style.display = 'none';
    });

    chatModal.addEventListener('click', (e) => {
        if (e.target === chatModal) chatModal.style.display = 'none';
    });

    attachBtn.addEventListener('click', () => chatImageInput.click());

    chatImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser) return;

        try {
            attachBtn.disabled = true;
            attachBtn.innerText = '⏳';

            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-images')
                .getPublicUrl(filePath);

            const imageMarkdown = `![image](${publicUrl})`;
            await sendMessage(imageMarkdown);

        } catch (error) {
            console.error('Chat image upload error:', error);
            alert('이미지 업로드 실패: ' + error.message);
        } finally {
            attachBtn.disabled = false;
            attachBtn.innerText = '📎';
            chatImageInput.value = ''; 
        }
    });

    async function initializeChat() {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30);

        if (!error && data) {
            chatMessages.innerHTML = '';
            data.reverse().forEach(msg => appendMessage(msg));
        }

        if (!chatChannel) {
            chatChannel = supabase
                .channel('public:messages')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                    const newMsg = payload.new;
                    const existingMsg = document.querySelector(`[data-id="${newMsg.id}"]`);
                    if (!existingMsg) appendMessage(newMsg);
                })
                .subscribe();
        }
    }

    function appendMessage(msg) {
        if (chatMessages.querySelector('.chat-empty')) {
            chatMessages.innerHTML = '';
        }

        if (msg.id && document.querySelector(`[data-id="${msg.id}"]`)) return;

        const isOwner = currentUser && String(msg.user_id) === String(currentUser.id);
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('chat-message');
        msgDiv.classList.add(isOwner ? 'chat-bubble-owner' : 'chat-bubble-other');
        
        if (msg.id) msgDiv.setAttribute('data-id', msg.id);

        const msgHeader = document.createElement('div');
        msgHeader.classList.add('chat-msg-header');

        const avatarImg = document.createElement('img');
        avatarImg.classList.add('chat-avatar');
        avatarImg.src = msg.user_avatar || `https://ui-avatars.com/api/?name=${msg.user_email[0]}&background=6c5ce7&color=fff`;
        
        const sender = document.createElement('span');
        sender.classList.add('chat-sender');
        sender.innerText = msg.user_email || '익명';

        msgHeader.appendChild(avatarImg);
        msgHeader.appendChild(sender);

        const contentArea = document.createElement('div');
        contentArea.classList.add('chat-msg-content');

        const imgMatch = msg.content && msg.content.match(/^!\[image\]\((.*)\)$/);
        if (imgMatch) {
            const imgUrl = imgMatch[1];
            const chatImg = document.createElement('img');
            chatImg.src = imgUrl;
            chatImg.classList.add('chat-sent-image');
            chatImg.onerror = () => {
                chatImg.src = 'https://via.placeholder.com/200x150?text=이미지를 불러올 수 없습니다';
                chatImg.classList.add('image-error');
            };
            contentArea.appendChild(chatImg);
        } else {
            contentArea.innerText = msg.content; 
        }

        msgDiv.appendChild(msgHeader);
        msgDiv.appendChild(contentArea);
        chatMessages.appendChild(msgDiv);

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage(content) {
        if (!content || !currentUser) return;

        const currentAvatar = currentUser.user_metadata?.avatar_url || "";
        const tempId = 'temp-' + Date.now();
        const optimisticMsg = {
            id: tempId,
            user_id: currentUser.id,
            user_email: currentUser.email,
            user_avatar: currentAvatar,
            content: content,
            created_at: new Date().toISOString()
        };
        appendMessage(optimisticMsg);

        // Try inserting with 'user_avatar'. If it fails because column doesn't exist, try without it.
        try {
            const { data, error } = await supabase
                .from('messages')
                .insert([{
                    user_id: currentUser.id,
                    user_email: currentUser.email,
                    user_avatar: currentAvatar,
                    content: content 
                }])
                .select();

            if (error) {
                // Check if error is 'column not found'
                if (error.message.includes('user_avatar') || error.code === 'PGRST204') {
                    console.warn("'user_avatar' column missing in Supabase. Retrying without it...");
                    const { data: retryData, error: retryError } = await supabase
                        .from('messages')
                        .insert([{
                            user_id: currentUser.id,
                            user_email: currentUser.email,
                            content: content 
                        }])
                        .select();
                    
                    if (retryError) throw retryError;
                    if (retryData && retryData[0]) {
                        const tempMsg = document.querySelector(`[data-id="${tempId}"]`);
                        if (tempMsg) tempMsg.setAttribute('data-id', retryData[0].id);
                    }
                } else {
                    throw error;
                }
            } else if (data && data[0]) {
                const tempMsg = document.querySelector(`[data-id="${tempId}"]`);
                if (tempMsg) tempMsg.setAttribute('data-id', data[0].id);
            }
        } catch (err) {
            const tempMsg = document.querySelector(`[data-id="${tempId}"]`);
            if (tempMsg) tempMsg.remove();
            throw err;
        }
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const contentText = chatInput.value.trim();
        if (!contentText) return;
        chatInput.value = '';
        try {
            await sendMessage(contentText);
        } catch (error) {
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
