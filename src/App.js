// src/App.js
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UserInput from './components/UserInput'; // Універсальний ввід
import InitialScreen from './components/Screens/InitialScreen';
import ResultScreen from './components/Screens/ResultScreen';
import LoadingScreen from './components/Screens/LoadingScreen';
import styles from './styles/App.module.css';

const mockPolyData = {
  building: 'Building 1',
  floor: 'first floor',
  details: 'next to the stairs',
};

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('initial'); 
  const [chatHistory, setChatHistory] = useState([]);
  const [polyStatus, setPolyStatus] = useState(mockPolyData);

  const handleQuerySubmit = (query) => {
    // 1. Додаємо запит користувача до історії
    setChatHistory(prev => [...prev, { sender: 'user', text: query }]);
    
    // 2. Перехід до екрану завантаження
    setCurrentScreen('loading');
  };

  useEffect(() => {
    if (currentScreen === 'loading') {
      const timer = setTimeout(() => {
        // 3. Імітація відповіді Poly
        const polyResponse = `Got it! Room 114 is in ${polyStatus.building}, on the ${polyStatus.floor}, ${polyStatus.details}. Check the map below and follow the arrows to get there.`;
        
        setChatHistory(prevHistory => [
          ...prevHistory,
          { sender: 'poly', text: polyResponse, data: polyStatus }
        ]);

        // 4. Перехід до екрану результату
        setCurrentScreen('result');
      }, 1500); // 1.5 секунди затримки

      return () => clearTimeout(timer);
    }
  }, [currentScreen, polyStatus]);

  const handleAcknowledge = (message) => {
    // Обробка спеціальної кнопки "Thanks!"
    setChatHistory(prevHistory => [...prevHistory, { sender: 'user', text: message }]);
    
    // Можна повернути на початковий екран або залишитися на цьому
    setCurrentScreen('initial');
    setChatHistory([]); // Очищення історії
  };

  const renderScreen = () => {
    // На InitialScreen ми не відображаємо історію чату, а лише пропозиції
    if (currentScreen === 'initial') {
      return <InitialScreen onQuerySubmit={handleQuerySubmit} />;
    }
    
    // На Loading та Result екранах відображаємо історію
    const lastQuery = chatHistory.findLast(msg => msg.sender === 'user')?.text || "Where is room 114?";
    const lastPolyMessage = chatHistory.findLast(msg => msg.sender === 'poly');

    if (currentScreen === 'loading') {
      return <LoadingScreen userQuery={lastQuery} />;
    }
    if (currentScreen === 'result') {
      return (
        <ResultScreen 
          userQuery={lastQuery}
          polyResponseData={lastPolyMessage?.data || polyStatus} 
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
      
      {/* УНІВЕРСАЛЬНЕ ПОЛЕ ВВОДУ: 
        Завжди внизу, завжди викликає handleQuerySubmit, 
        але вимикається під час currentScreen === 'loading'
      */}
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