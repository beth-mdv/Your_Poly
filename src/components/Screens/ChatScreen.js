import React, { useRef, useEffect } from 'react';
import ChatBubble from '../ChatBubble';
import styles from '../../styles/App.module.css';

const ChatScreen = ({ history, isLoading, onAcknowledge }) => {
  const messagesEndRef = useRef(null);

  // Автопрокрутка до останнього повідомлення
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // Відображення карти та спеціальної кнопки "Thanks!"
  const renderPolyContent = (message) => {
    if (message.isMap && message.data) {
      return (
        <div className={styles.polyResponseBox}>
          <p className={styles.polyText}>
            {message.text}
          </p>
          <div className={styles.mapPlaceholder}>
                      </div>
          {/* Кнопка "Thanks!", що імітує поле вводу */}
          <button 
              className={styles.resultActionButton} 
              onClick={onAcknowledge}
          >
              Thanks!
          </button>
        </div>
      );
    }
    // Стандартна текстова відповідь
    return <ChatBubble sender="poly">{message.text}</ChatBubble>;
  };

  return (
    <div className={styles.chatScreen}>
      {history.map((message, index) => (
        <div key={index} className={styles.chatMessage}>
          {message.sender === 'user' && (
            <ChatBubble sender="user">{message.text}</ChatBubble>
          )}
          {message.sender === 'poly' && renderPolyContent(message)}
        </div>
      ))}

      {/* Індикатор завантаження */}
      {isLoading && (
        <div className={styles.loadingMessage}>
          <ChatBubble sender="poly">
             <span role="img" aria-label="thinking">...</span>
          </ChatBubble>
        </div>
      )}

      {/* Елемент для прокрутки */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatScreen;