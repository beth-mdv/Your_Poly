import React, { useState, useEffect, useRef } from 'react';

// ==============================================================================
// 🎯 КРОК 1: АКТУАЛЬНЕ ПОСИЛАННЯ (ВСТАВЛЕНО ВІД КОРИСТУВАЧА)
// ==============================================================================
// УВАГА: Я додав /predict до URL, оскільки це ендпоінт FastAPI.
const API_URL_FULL = "https://hexahydrated-lorenzo-noncapitalistic.ngrok-free.dev/predict"; 
// ==============================================================================

const mockPolyData = {
  building: 'Будівля 1',
  floor: 'перший поверх',
  details: 'поруч зі сходами',
};

// ------------------------------------------------
// 1. КОМПОНЕНТИ ТА СТИЛІ (ОБ'ЄДНАНО)
// ------------------------------------------------

/** Компонент відображення одного повідомлення в чаті */
const MessageBubble = ({ message }) => {
    const isUser = message.sender === 'user';
    const bubbleClass = isUser
        ? 'bg-blue-600 text-white rounded-tr-xl rounded-b-xl ml-auto'
        : 'bg-gray-200 text-gray-800 rounded-tl-xl rounded-b-xl mr-auto';

    const renderText = (text) => {
        // Замінюємо markdown **жирний текст** на HTML <strong>
        const html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }

    return (
        <div className={`flex max-w-xs md:max-w-md ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 my-1 shadow-md ${bubbleClass}`}>
                {renderText(message.text)}
                
                {/* Відображення карти, якщо є дані */}
                {message.isMap && message.data && (
                    <div className="mt-3 p-3 bg-white border border-gray-300 rounded-lg shadow-inner">
                        <h4 className="font-semibold text-gray-800 mb-1">Маршрут знайдено!</h4>
                        <ul className="text-sm list-disc pl-5 text-gray-600">
                            <li><span className="font-medium">Будівля:</span> {message.data.building}</li>
                            <li><span className="font-medium">Поверх:</span> {message.data.floor}</li>
                            <li><span className="font-medium">Деталі:</span> {message.data.details}</li>
                        </ul>
                        <div className="mt-2 text-center text-xs text-blue-500">
                            [Placeholder: Тут має бути інтерактивна карта]
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/** Індикатор завантаження */
const LoadingIndicator = ({ text }) => (
    <div className="flex items-center space-x-2 p-3 my-1 bg-gray-200 text-gray-800 rounded-tl-xl rounded-b-xl mr-auto max-w-xs md:max-w-md shadow-md">
        <div className="animate-pulse flex space-x-1">
            <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
            <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
            <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
        </div>
        <span className="text-sm text-gray-500">{text}</span>
    </div>
);

/** Компонент Header */
const Header = ({ isQueryActive, onClearChat }) => (
    <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <h1 className="text-xl font-bold text-gray-800">Poly Guide</h1>
        </div>
        {isQueryActive && (
            <button 
                onClick={onClearChat} 
                className="text-sm text-gray-500 hover:text-gray-700 transition duration-150"
                title="Очистити чат"
            >
                Очистити
            </button>
        )}
    </header>
);

/** Компонент UserInput */
const UserInput = ({ onSubmit, placeholder, isDisabled }) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() && !isDisabled) {
            onSubmit(input.trim());
            setInput('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex w-full p-4 border-t border-gray-200 bg-white shadow-lg">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={isDisabled}
                className="flex-grow p-3 border border-gray-300 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <button
                type="submit"
                disabled={isDisabled || !input.trim()}
                className="p-3 bg-blue-600 text-white rounded-r-xl hover:bg-blue-700 transition duration-150 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
            >
                <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
        </form>
    );
};

/** Компонент InitialScreen */
const InitialScreen = ({ onQuerySubmit }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
        <svg className="w-16 h-16 text-blue-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.24c1.292.83 2.158 2.016 2.158 3.39c0 3.33-2.67 6-6 6-1.374 0-2.56-.867-3.39-2.158L12 12m-9 3a6 6 0 1111.433-2.973l-1.9 1.9"></path></svg>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Привіт, я Poly Guide!</h2>
        <p className="text-gray-600 mb-8 max-w-md">Я тут, щоб допомогти вам знайти будь-яку аудиторію чи об'єкт у будівлях вашого кампусу.</p>
        
        <div className="w-full max-w-md grid grid-cols-1 gap-3">
            <button
                onClick={() => onQuerySubmit("Де знаходиться аудиторія 114, корпус 1?")}
                className="py-3 px-4 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-200 transition duration-150 shadow-sm text-left"
            >
                Де знаходиться аудиторія 114, корпус 1?
            </button>
            <button
                onClick={() => onQuerySubmit("Покажи мені бібліотеку.")}
                className="py-3 px-4 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-200 transition duration-150 shadow-sm text-left"
            >
                Покажи мені бібліотеку.
            </button>
            <button
                onClick={() => onQuerySubmit("Чи відкритий офіс реєстратора?")}
                className="py-3 px-4 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-200 transition duration-150 shadow-sm text-left"
            >
                Чи відкритий офіс реєстратора?
            </button>
        </div>
    </div>
);

/** Компонент ChatScreen */
const ChatScreen = ({ history, isLoading, onAcknowledge, polyStatus }) => {
    const messagesEndRef = useRef(null);

    // Автопрокрутка до останнього повідомлення
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history, isLoading]);

    // Перевірка, чи є останнє повідомлення відповіддю Poly з картою
    const lastMessage = history.findLast(msg => msg.sender === 'poly');
    const showAcknowledgeButton = lastMessage?.isMap && !isLoading;
    
    // Перевірка, чи була вже відправлена подяка
    const thanksSent = history.some(msg => msg.sender === 'user' && msg.text.toLowerCase().includes('дякую'));

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-gray-50">
            <div className="flex-grow overflow-y-auto p-4 pt-4 pb-4">
                {/* Історія чату */}
                <div className="flex flex-col space-y-2">
                    {history.map((msg, index) => (
                        <MessageBubble key={index} message={msg} />
                    ))}
                    {isLoading && <LoadingIndicator text="Poly думає..." />}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            
            {/* Панель підтвердження */}
            {showAcknowledgeButton && !thanksSent && (
                // Фіксуємо кнопку над полем вводу
                <div className="absolute bottom-16 left-0 right-0 p-4 flex justify-center z-10">
                    <button
                        onClick={onAcknowledge}
                        className="py-2 px-6 bg-green-500 text-white font-semibold rounded-full shadow-lg hover:bg-green-600 transition duration-150"
                    >
                        Дякую за маршрут!
                    </button>
                </div>
            )}
        </div>
    );
};

// ------------------------------------------------
// 2. ГОЛОВНИЙ КОМПОНЕНТ APP (Логіка збережена)
// ------------------------------------------------

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('initial'); 
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false); 
  const [polyStatus, setPolyStatus] = useState(mockPolyData);

  const handleQuerySubmit = (query) => {
    if (isLoading) return;

    // 1. Додаємо запит користувача
    const newHistory = [...chatHistory, { sender: 'user', text: query }];
    setChatHistory(newHistory);
    
    // 2. Включаємо loading, переходимо на ChatScreen
    setIsLoading(true);
    setCurrentScreen('chat'); 
  };

  useEffect(() => {
    // 3. Запуск API-запиту, коли isLoading стає true і є новий запит
    if (isLoading) {
      // Знаходимо останній запит користувача
      const lastQuery = chatHistory.findLast(msg => msg.sender === 'user')?.text;

      if (!lastQuery) {
          setIsLoading(false);
          return;
      }
      
      const sendQueryToPoly = async () => {
        try {
          // fetch робить запит на Colab-сервер
          const response = await fetch(API_URL_FULL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: lastQuery }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          // 4. Оновлюємо історію з реальною відповіддю Poly
          const polyResponse = {
            sender: 'poly',
            text: data.response || "Отримано порожню відповідь.",
            // Перевіряємо, чи є дані про карту/кімнату
            isMap: !!data.data, 
            data: data.data || null, 
          };

          setChatHistory(prevHistory => [
            ...prevHistory,
            polyResponse
          ]);
          
          // 5. Оновлюємо статус, якщо дані про кімнату були отримані
          if (data.data) {
              setPolyStatus(data.data);
          }

        } catch (error) {
          console.error("Помилка при отриманні даних від Poly API:", error);
          
          // Обробка помилки з'єднання
          setChatHistory(prevHistory => [
            ...prevHistory,
            { 
              sender: 'poly', 
              text: "Вибачте, сталася помилка з'єднання. Перевірте Colab-сервер або чи є у вас актуальне посилання.", 
              isMap: false
            }
          ]);

        } finally {
          // 6. Вимикаємо loading
          setIsLoading(false);
        }
      };
      
      sendQueryToPoly();
    }
    // Залежність від chatHistory викликає useEffect тільки після додавання нового запиту користувача
  }, [isLoading, chatHistory]); 


  const handleAcknowledge = () => {
    // Обробка "Дякую!" - відправляємо його як повідомлення
    handleQuerySubmit("Дякую за маршрут!"); 
  };
  
  const handleClearChat = () => {
    // Функція очищення чату
    setChatHistory([]);
    setIsLoading(false);
    setCurrentScreen('initial');
  }

  const renderScreen = () => {
    // InitialScreen відображається лише при порожній історії
    if (currentScreen === 'initial' && chatHistory.length === 0) {
      return <InitialScreen onQuerySubmit={handleQuerySubmit} />;
    }
    
    // ChatScreen відображає всю історію чату, незалежно від стану loading
    return (
        <ChatScreen 
            history={chatHistory} 
            isLoading={isLoading} 
            onAcknowledge={handleAcknowledge}
            polyStatus={polyStatus} 
        />
    );
  };

  const isInputDisabled = isLoading;

  return (
    <div className="flex flex-col h-screen w-full font-sans antialiased bg-gray-50">
      {/* Шапка */}
      <Header 
          isQueryActive={chatHistory.length > 0} 
          onClearChat={handleClearChat}
      />
      {/* Основний вміст (з фіксованими відступами для шапки та інпуту) */}
      <main className="flex-grow overflow-hidden pt-16 pb-20"> {/* pt-16 від шапки, pb-20 від інпуту */}
        {renderScreen()}
      </main>
      
      {/* УНІВЕРСАЛЬНЕ ПОЛЕ ВВОДУ */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
          <UserInput 
              onSubmit={handleQuerySubmit} 
              placeholder={isLoading ? "Poly думає..." : "Запитайте що завгодно..."} 
              isDisabled={isInputDisabled}
          />
      </div> 
    </div>
  );
};

export default App;
