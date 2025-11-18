// src/components/SuggestedQueries.js
import React from 'react';
import styles from '../styles/Chat.module.css';

const SuggestedQueries = ({ queries, onSelect }) => {
  return (
    <div className={styles.suggestedQueries}>
      {queries.map((query, index) => (
        <button 
          key={index} 
          className={styles.queryButton} 
          onClick={() => onSelect(query)}
        >
          {query}
        </button>
      ))}
    </div>
  );
};

export default SuggestedQueries;