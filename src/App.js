// src/App.js
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UserInput from './components/UserInput'; // Універсальний ввід
import InitialScreen from './components/Screens/InitialScreen';
import ResultScreen from './components/Screens/ResultScreen';
import LoadingScreen from './components/Screens/LoadingScreen';
import styles from './styles/App.module.css';

// ==============================================================================
//  ВСТАВКА АДРЕСИ 
// ==============================================================================

const API_URL_FULL = "https://hexahydrated-lorenzo-noncapitalistic.ngrok-free.dev/predict"; 
// ==============================================================================


const mockPolyData = {
  building: 'Building 1',
  floor: 'first floor',
  details: 'next to the stairs',
};

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('initial'); 
  const [chatHistory, setChatHistory] = useState([]);
  const [polyStatus, setPolyStatus] = useState(mockPolyData);

  // Нова змінна для керування станом очікування запиту
  const [pendingQuery, setPendingQuery] = useState(null); 

  const handleQuerySubmit = (query) => {
    // 1. Додаємо запит користувача до історії
    setChatHistory(prev => [...prev, { sender: 'user', text: query }]);
    
    // 2. Зберігаємо запит для використання в useEffect
    setPendingQuery(query);
    
    // 3. Перехід до екрану завантаження
    setCurrentScreen('loading');
  };

  useEffect(() => {
    // Виконуємо запит лише якщо є запит на обробку
    if (currentScreen === 'loading' && pendingQuery) {
        
        // ==============================================================================
        //  API-ЗАПИТ 
        // ==============================================================================
        const sendQueryToPoly = async () => {
            const lastQuery = pendingQuery;

            try {
                // Використовуємо повний URL з /predict
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
                
                // 3. Додаємо реальну відповідь Poly до історії
                setChatHistory(prevHistory => [
                    ...prevHistory,
                    { 
                        sender: 'poly', 
                        text: data.response, 
                        // data.data містить об'єкт кімнати, якщо він був знайдений
                        data: data.data || null 
                    }
                ]);

                // 4. Оновлюємо статус (якщо є дані про кімнату)
                if (data.data) {
                    setPolyStatus(data.data);
                }

                // 5. Перехід до екрану результату
                setCurrentScreen('result');

            } catch (error) {
                console.error("Error fetching from Poly API:", error);
                
                // Обробка помилки
                setChatHistory(prevHistory => [
                    ...prevHistory,
                    { 
                        sender: 'poly', 
                        text: "Вибачте, сталася помилка з'єднання. Перевірте Colab-сервер.", 
                        data: null 
                    }
                ]);
                setCurrentScreen('result'); 
            } finally {
                // 6. Очищаємо запит в очікуванні
                setPendingQuery(null);
            }
        };

        sendQueryToPoly();
        // ==============================================================================
    }
    
  }, [currentScreen, pendingQuery]); // useEffect запускається лише при зміні стану або наявності запиту

  const handleAcknowledge = (message) => {
    // Обробка спеціальної кнопки "Thanks!"
    setChatHistory(prevHistory => [...prevHistory, { sender: 'user', text: message }]);
    
    setCurrentScreen('initial');
    setChatHistory([]); // Очищення історії
  };

  const renderScreen = () => {
    // На InitialScreen ми не відображаємо історію чату, а лише пропозиції
    if (currentScreen === 'initial') {
      return <InitialScreen onQuerySubmit={handleQuerySubmit} />;
    }
    
    // На Loading та Result екранах відображаємо історію
    const lastQuery = chatHistory.findLast(msg => msg.sender === 'user')?.text || "Where is the destination?";
    const lastPolyMessage = chatHistory.findLast(msg => msg.sender === 'poly');

    if (currentScreen === 'loading') {
      return <LoadingScreen userQuery={lastQuery} />;
    }
    if (currentScreen === 'result') {
      return (
        <ResultScreen 
          userQuery={lastQuery}
          // Передаємо дані та текст відповіді
          polyResponseData={lastPolyMessage?.data || polyStatus} 
          polyResponseMessage={lastPolyMessage?.text || "No response received."}
          onAcknowledge={handleAcknowledge}
        />
      );
    }
    return null;
  };

  const isInputDisabled = currentScreen === 'loading';

  return (
    <div className={styles.appContainer}>
      <Header isQueryActive={currentScreen !== 'initial'} />
      <main className={styles.mainContent}>
        {renderScreen()}
      </main>
      
      {/* УНІВЕРСАЛЬНЕ ПОЛЕ ВВОДУ */}
      <div className={styles.universalInputWrapper}>
          <UserInput 
              onSubmit={handleQuerySubmit} 
              placeholder="Ask anything..." 
              isDisabled={isInputDisabled}
          />
      </div>

    </div>
  );
};

export default App;
