document.addEventListener('DOMContentLoaded', () => {
    const diaryInput = document.getElementById('diaryInput');
    const voiceBtn = document.getElementById('voiceBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const aiBox = document.getElementById('aiBox');
    const historyContainer = document.getElementById('historyContainer');
    const INITIAL_AI_TEXT = '여기에 AI의 답변이 표시됩니다.';

    // Load saved data from localStorage
    const savedDiaryText = localStorage.getItem('savedDiaryText');
    const savedAiResponse = localStorage.getItem('savedAiResponse');

    if (savedDiaryText && savedAiResponse) {
        diaryInput.value = savedDiaryText;
        aiBox.innerHTML = savedAiResponse;
        aiBox.style.borderStyle = 'solid';
        aiBox.style.borderColor = '#6c5ce7';
        aiBox.style.color = '#2d3436';
    }

    // Initial Load
    fetchHistory();

    // Clear AI box when user starts typing
    diaryInput.addEventListener('input', () => {
        if (aiBox.innerText !== INITIAL_AI_TEXT && !analyzeBtn.disabled) {
            resetAIBox();
        }
    });

    function resetAIBox() {
        aiBox.innerText = INITIAL_AI_TEXT;
        aiBox.style.borderStyle = 'dashed';
        aiBox.style.borderColor = '#ced4da';
        aiBox.style.color = 'var(--text-soft)';
        localStorage.removeItem('savedDiaryText');
        localStorage.removeItem('savedAiResponse');
    }

    // Fetch and render history from Redis
    async function fetchHistory() {
        historyContainer.innerHTML = '<div class="history-loading">불러오는 중...</div>';
        try {
            const response = await fetch('/api/history');
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
            
            // Format AI response text for display (replace newlines with <br>)
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

    // Analyze button functionality CALLING BACKEND API
    analyzeBtn.addEventListener('click', async () => {
        const diaryText = diaryInput.value.trim();

        if (diaryText === '') {
            alert('오늘의 하루를 먼저 기록해주세요!');
            diaryInput.focus();
            return;
        }

        // Show analyzing state
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span>⏳</span> AI 분석 중...';
        aiBox.classList.add('analyzing');
        aiBox.innerText = '당신의 마음을 읽고 있어요... 잠시만 기다려 주세요.';

        try {
            // Call Vercel Serverless API
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ diaryText }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '분석 중 오류가 발생했습니다.');
            }

            const text = data.result.trim();

            // Display results with formatting
            const formattedText = text.replace(/\n/g, '<br>');
            aiBox.innerHTML = `✨ <strong>심리 상담 분석</strong><br><br>${formattedText}`;

            // Save to localStorage
            localStorage.setItem('savedDiaryText', diaryText);
            localStorage.setItem('savedAiResponse', aiBox.innerHTML);

            // Fetch history again to show the latest entry
            fetchHistory();
        } catch (error) {
            console.error('API Error:', error);
            aiBox.innerHTML = `❌ <strong>AI 분석 오류:</strong><br><br>${error.message || '서버와의 통신 중 오류가 발생했습니다.'}`;
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

    // Voice Recognition implementation
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (Recognition) {
        const recognition = new Recognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => {
            voiceBtn.disabled = true;
            voiceBtn.innerHTML = '<span>🎙️</span> 음성 인식 중...';
            voiceBtn.classList.add('voice-active');
            voiceBtn.style.background = '#ffeaa7';
            voiceBtn.style.color = '#d35400';
            resetAIBox();
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            diaryInput.value += (diaryInput.value ? ' ' : '') + transcript;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            alert('음성 인식 중 오류가 발생했습니다.');
        };

        recognition.onend = () => {
            voiceBtn.disabled = false;
            voiceBtn.innerHTML = '<span>🎙️</span> 음성으로 입력하기';
            voiceBtn.classList.remove('voice-active');
            voiceBtn.style.background = 'white';
            voiceBtn.style.color = '#2d3436';
        };

        voiceBtn.addEventListener('click', () => recognition.start());
    } else {
        voiceBtn.addEventListener('click', () => alert('이 브라우저는 음성 인식을 지원하지 않습니다.'));
    }
});
