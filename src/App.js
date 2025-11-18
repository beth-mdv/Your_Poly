// src/App.js
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UserInput from './components/UserInput';
import InitialScreen from './components/Screens/InitialScreen';
import ChatScreen from './components/Screens/ChatScreen'; // Новий універсальний екран для діалогу
import styles from './styles/App.module.css';

const mockPolyData = {
  building: 'Building 1',
  floor: 'first floor',
  details: 'next to the stairs',
};

// Згенеруємо унікальний ID для кожної відповіді Poly, щоб імітувати різні відповіді
const generatePolyResponse = (query) => {
    // Дуже проста логіка імітації контексту
    if (query.toLowerCase().includes('114')) {
        return {
            text: `Got it! Room 114 is in **${mockPolyData.building}**, on the **${mockPolyData.floor}**, next to the stairs. Check the map below and follow the arrows to get there.`,
            isMap: true, // Це повідомлення містить карту
            data: mockPolyData
        };
    }
    if (query.toLowerCase().includes('thanks')) {
        return {
            text: "You're welcome! Let me know if you need any other directions or information.",
            isMap: false
        };
    }
    return {
        text: `Based on your request about "${query}", I'm looking up the latest information now. This is a generic AI response for demonstration.`,
        isMap: false
    };
};


const App = () => {
  const [currentScreen, setCurrentScreen] = useState('initial'); 
  // chatHistory тепер зберігає всі запити та відповіді
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false); 

  const handleQuerySubmit = (query) => {
    if (isLoading) return; // Запобігаємо подвійному відправленню

    // 1. Додаємо запит користувача
    const newHistory = [...chatHistory, { sender: 'user', text: query }];
    setChatHistory(newHistory);
    
    // 2. Включаємо loading, переходимо на ChatScreen
    setIsLoading(true);
    setCurrentScreen('chat'); 
  };

  useEffect(() => {
    if (isLoading) {
      const lastQuery = chatHistory.findLast(msg => msg.sender === 'user')?.text || "";
      
      const timer = setTimeout(() => {
        // 3. Імітація відповіді Poly
        const response = generatePolyResponse(lastQuery);
        
        setChatHistory(prevHistory => [
          ...prevHistory,
          { sender: 'poly', ...response }
        ]);

        // 4. Вимикаємо loading
        setIsLoading(false);
        // Екран залишається 'chat'
      }, 1500); 

      return () => clearTimeout(timer);
    }
  }, [isLoading, chatHistory]);

  const handleAcknowledge = () => {
    // Обробка "Thanks!" - просто відправляємо його як повідомлення
    handleQuerySubmit("Thanks!");
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
        />
    );
  };

  const isInputDisabled = isLoading;

  return (
    <div className={styles.appContainer}>
      {/* Передаємо функцію очищення чату в Header */}
      <Header 
          isQueryActive={chatHistory.length > 0} 
          onClearChat={handleClearChat}
      />
      <main className={styles.mainContent}>
        {renderScreen()}
      </main>
      
      {/* УНІВЕРСАЛЬНЕ ПОЛЕ ВВОДУ: завжди внизу та активне, якщо не loading */}
      <div className={styles.universalInputWrapper}>
          <UserInput 
              onSubmit={handleQuerySubmit} 
              placeholder={isLoading ? "Poly is thinking..." : "Ask anything..."} 
              isDisabled={isInputDisabled}
          />
      </div>

    </div>
  );
};

export default App;