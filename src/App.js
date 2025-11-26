// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import UserInput from './components/UserInput';
import SuggestedQueries from './components/SuggestedQueries' // Додано SuggestedQueries
import styles from './styles/App.module.css';

// === КОНФІГУРАЦІЯ ===
// Сюди вставляєте посилання з Google Colab (оновлювати при кожному запуску Colab)
const API_BASE_URL = "https://hexahydrated-lorenzo-noncapitalistic.ngrok-free.dev"; 

const suggested = [
    "When does the third class end?", 
    "Where is room 114?", 
    "Where can I eat something tasty?"
];

// Імітація компонента повідомлення для чату
const ChatMessage = ({ msg }) => {
    return (
        <div 
            className={`${styles.message} ${msg.sender === 'user' ? styles.userMsg : styles.botMsg}`}
        >
            {msg.text}
        </div>
    );
};

const App = () => {
    // 1. СТАНИ (STATES)
    const [chatHistory, setChatHistory] = useState([]); // Історія повідомлень
    const [isLoading, setIsLoading] = useState(false);  // Чи думає ШІ
    const [isInputDisabled, setIsInputDisabled] = useState(false); // Блокування вводу
    const [navCode, setNavCode] = useState(null);       // Код кімнати для навігації

    // Реф для автоскролу чату вниз
    const chatEndRef = useRef(null);

    // Автоскрол при оновленні чату
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, navCode]);

    // 2. ОЧИЩЕННЯ ЧАТУ
    const handleClearChat = () => {
        setChatHistory([]);
        setNavCode(null); // Скидаємо навігацію, повертаємось до чату
    };

    // 3. ЛОГІКА СПІЛКУВАННЯ З ШІ (CORE LOGIC)
    const handleQuerySubmit = async (queryText) => {
        if (!queryText.trim()) return;

        // Додаємо питання користувача в інтерфейс
        const userMessage = { sender: 'user', text: queryText };
        setChatHistory((prev) => [...prev, userMessage]);
        
        // Блокуємо інтерфейс
        setIsLoading(true);
        setIsInputDisabled(true);

        try {
            // Відправляємо запит на сервер
            const response = await fetch(`${API_BASE_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: queryText }),
            });

            if (!response.ok) {
                throw new Error('Server unavailable');
            }

            const data = await response.json();
            
            // Додаємо відповідь бота
            const botMessage = { sender: 'bot', text: data.response };
            setChatHistory((prev) => [...prev, botMessage]);

            // === ПЕРЕВІРКА НА НАВІГАЦІЮ ===
            // Якщо сервер надіслав nav_code, перемикаємо екран на карту
            if (data.data && data.data.nav_code) {
                console.log("Starting navigation to:", data.data.nav_code);
                // Невелика затримка для природності, щоб юзер встиг прочитати "Starting navigation..."
                setTimeout(() => {
                    setNavCode(data.data.nav_code);
                }, 1000);
            }

        } catch (error) {
            console.error("AI Error:", error);
            setChatHistory((prev) => [...prev, { 
                sender: 'bot', 
                text: "⚠️ Вибач, не можу з'єднатися з сервером. Перевір, чи запущено Google Colab." 
            }]);
        } finally {
            setIsLoading(false);
            setIsInputDisabled(false);
        }
    };

    // 4. РЕНДЕРИНГ ЕКРАНУ (Чат або Карта)
    const renderScreen = () => {
        // Сценарій А: Активна навігація -> показуємо карту
        if (navCode) {
            return (
                <div className={styles.mapContainer}>
                    {/* Тимчасова заглушка для карти */}
                    <div style={{textAlign: 'center', marginTop: '50px', padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)'}}>
                        <h2>Навігація активована 🗺️</h2>
                        <p>Цільова кімната: <strong>{navCode}</strong></p>
                        <button 
                            onClick={() => setNavCode(null)}
                            style={{padding: '10px 20px', marginTop: '15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer'}}
                        >
                            Повернутися до чату
                        </button>
                    </div>
                </div>
            );
        }

        // Сценарій Б: Звичайний чат -> показуємо історію
        if (chatHistory.length > 0) {
            return (
                <div className={styles.chatList}>
                    {chatHistory.map((msg, index) => (
                        <ChatMessage key={index} msg={msg} />
                    ))}
                    {/* Імітація повідомлення про завантаження */}
                    {isLoading && (
                        <div className={`${styles.message} ${styles.botMsg} ${styles.loadingMessage}`}>
                            Poly думає...
                        </div>
                    )}
                    {/* Невидимий елемент для скролу */}
                    <div ref={chatEndRef} />
                </div>
            );
        }

        // Сценарій В: Порожній стан (привітання)
        return (
            <div className={styles.welcomeScreen}>
                <div className={styles.heartIcon}>🤍</div> 
                <h2 className={styles.greeting}>Чим я можу вам допомогти?</h2>
            </div>
        );
    };
    
    // 5. ВАША ОРИГІНАЛЬНА ВЕРСТКА
    return (
        <div className={styles.appContainer}>
            {/* Передаємо функцію очищення чату в Header */}
            <Header 
                isQueryActive={chatHistory.length > 0} 
                onClearChat={handleClearChat}
            />
            {/* mainContent є контейнером, який росте і прокручується */}
            <main className={styles.mainContent}>
                {renderScreen()}
            </main>
            
            {/* РЕКОМЕНДОВАНІ ЗАПИТИ (тільки на початковому екрані) */}
            {chatHistory.length === 0 && (
                <div className={styles.suggestedQueriesWrapper}>
                    <SuggestedQueries queries={suggested} onSelect={handleQuerySubmit} />
                </div>
            )}
            
            {/* УНІВЕРСАЛЬНЕ ПОЛЕ ВВОДУ: завжди внизу */}
            <div className={styles.universalInputWrapper}>
                <UserInput 
                    onSubmit={handleQuerySubmit} 
                    placeholder={isLoading ? "Poly думає..." : "Запитайте що-небудь..."} 
                    isDisabled={isInputDisabled}
                />
            </div>

        </div>
    );
};

export default App;