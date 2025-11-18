import React from 'react';
import SuggestedQueries from '../SuggestedQueries';
import styles from '../../styles/App.module.css';

const InitialScreen = ({ onQuerySubmit }) => {
  const suggested = [
    "When does the third class end?", 
    "Where is room 114?", 
    "Where can I eat something tasty?"
  ];

  return (
    <div className={styles.initialScreen}>
      <div className={styles.bodyContent}>
        <div className={styles.heartIcon}>🤍</div> 
        <h2 className={styles.greeting}>What can I help you with?</h2>
        <SuggestedQueries queries={suggested} onSelect={onQuerySubmit} />
      </div>
    </div>
  );
};

export default InitialScreen;

