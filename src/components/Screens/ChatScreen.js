// src/components/Screens/ChatScreen.js
import React, { useRef, useEffect, useState } from 'react';
import ChatBubble from '../ChatBubble';
// 👇 ШЛЯХИ ВИПРАВЛЕНО ДЛЯ ПАПКИ SCREENS
import styles from '../../styles/App.module.css';

import MapCanvas from '../../utils/MapCanvas';
import { aStar, splitPathByFloor, resolveTargetId } from '../../utils/pathfinder';

// Імпорти картинок
import mapFloor1 from '../../assets/1 поверх.png';
import mapFloor2 from '../../assets/2 поверх.png';

// --- КОМПОНЕНТ MAP BLOCK ---
const MapBlock = ({ targetQuery, graphData }) => {
  const [pathSegments, setPathSegments] = useState([]);
  const [statusMsg, setStatusMsg] = useState('Шукаю маршрут...');

  useEffect(() => {
    if (!graphData || !targetQuery) {
        setStatusMsg("Немає даних для пошуку.");
        return;
    }

    const START_POINT = 'start'; // Поки що стартуємо від входу

    // 1. Шукаємо ID (наприклад "114" або "man_toilet")
    const targetId = resolveTargetId(targetQuery, START_POINT, graphData);

    // 2. Перевірка наявності ID в графі
    if (!targetId || !graphData.byId.has(targetId)) {
        console.warn(`MapBlock: ID "${targetId}" not found in graph.`);
        setStatusMsg(`Не вдалося знайти на карті: "${targetQuery}"`);
        setPathSegments([]); 
        return;
    }

    // 3. Будуємо шлях (A*)
    const rawPath = aStar(START_POINT, targetId, graphData);

    if (!rawPath || rawPath.length === 0) {
      setStatusMsg("Не вдалося побудувати маршрут до цього місця.");
      setPathSegments([]);
      return;
    }

    // 4. Розбиваємо по поверхах для візуалізації
    const segments = splitPathByFloor(rawPath, graphData.byId);
    
    const richSegments = segments.map(seg => ({
      floor: seg.floor,
      // Вибираємо правильну картинку для поверху
      mapImage: seg.floor === 1 ? mapFloor1 : mapFloor2,
      nodes: seg.path.map(id => graphData.byId.get(id))
    }));

    setPathSegments(richSegments);
    setStatusMsg(''); 

  }, [graphData, targetQuery]);

  return (
    <div className={styles.mapPlaceholder} style={{ width: '100%', marginTop: '10px' }}>
      {pathSegments.length > 0 ? (
        pathSegments.map((segment, index) => (
          <div key={index} style={{ marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white' }}>
            {/* Заголовок поверху */}
            <div style={{ padding: '8px 12px', backgroundColor: '#eff6ff', borderBottom: '1px solid #dbeafe', color: '#1d4ed8', fontWeight: 'bold', fontSize: '14px' }}>
               {segment.floor} ПОВЕРХ
            </div>
            
            {/* 👇 ВАЖЛИВО: Фіксована висота, щоб карту було видно! */}
            <div style={{ position: 'relative', width: '100%', height: '350px', backgroundColor: '#f8fafc' }}>
                  <MapCanvas 
                    floor={segment.floor}
                    mapImageSrc={segment.mapImage}
                    pathNodes={segment.nodes}
                    isActiveAnimation={true}
                  />
            </div>
          </div>
        ))
      ) : (
        // Повідомлення про помилку або пошук
        <div style={{ padding: '15px', textAlign: 'center', color: '#dc2626', background: '#fef2f2', borderRadius: '8px', fontSize: '14px', border: '1px solid #fecaca' }}>
           ⚠️ {statusMsg}
        </div>
      )}
    </div>
  );
};

// --- ОСНОВНИЙ КОМПОНЕНТ CHAT SCREEN ---
const ChatScreen = ({ history, isLoading, onAcknowledge, graphData }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isLoading]);

  const renderPolyContent = (message) => {
    // Перевіряємо, чи це повідомлення має відображати карту
    if (message.isMap) {
      let targetToSearch = null;

      // 1. Пріоритет: ID, який повернув сервер (наприклад "114")
      if (message.data?.targetId || message.data?.nav_code) {
          targetToSearch = message.data.targetId || message.data.nav_code;
      }
      // 2. Фолбек: Шукаємо 3 цифри в тексті, якщо сервер не дав ID
      else if (message.text) {
          const match = message.text.match(/(\d{3})/);
          if (match) targetToSearch = match[0];
          else if (/(туал|вбир|wc|toilet)/i.test(message.text)) targetToSearch = "toilet";
      }

      return (
        <div className={styles.polyResponseBox}>
          {/* Текст відповіді */}
          <div className={styles.polyText} dangerouslySetInnerHTML={{ __html: message.text }} />
          
          {/* Якщо знайшли, що шукати - малюємо карту */}
          {targetToSearch ? (
              <MapBlock targetQuery={targetToSearch} graphData={graphData} />
          ) : (
              <div style={{fontSize: '13px', color: '#b91c1c', marginTop: '10px', fontStyle: 'italic'}}>
                 (Не вдалося визначити номер аудиторії для карти)
              </div>
          )}

          {/* Кнопка подяки */}
          <div style={{marginTop: '15px', display: 'flex', justifyContent: 'center'}}>
             <button 
               className={styles.resultActionButton} 
               onClick={onAcknowledge}
               style={{ padding: '8px 24px', background: '#22c55e', color: 'white', borderRadius: '20px', border:'none', cursor:'pointer', fontWeight: 'bold'}}
             >
               Дякую!
             </button>
          </div>
        </div>
      );
    }

    // Звичайний текст
    return <ChatBubble sender="poly">{message.text}</ChatBubble>;
  };

  return (
    <div className={styles.chatScreen} style={{ paddingBottom: '20px' }}>
      {history.map((message, index) => (
        <div key={index} className={styles.chatMessage} style={{ marginBottom: '15px' }}>
          
          {message.sender === 'user' && (
            <ChatBubble sender="user">{message.text}</ChatBubble>
          )}

          {message.sender === 'poly' && renderPolyContent(message)}
        </div>
      ))}

      {isLoading && (
        <div className={styles.loadingMessage} style={{ marginLeft: '10px' }}>
            <div style={{padding: '10px 15px', background: '#f1f5f9', borderRadius: '20px', width: 'fit-content', color: '#64748b', fontSize: '14px'}}>
                Poly думає...
            </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatScreen;